import os
import json
import base64
import logging
from pathlib import Path
from typing import List, Union
from cryptography.hazmat.primitives.ciphers.aead import AESGCM
from app.config import settings, BASE_DIR

logger = logging.getLogger("attendance.security")

KEY_FILE_PATH = Path(settings.DATA_DIR) / ".biometric.key"
ENCRYPTION_VERSION = "v1"

def get_or_create_encryption_key() -> bytes:
    """
    Retrieves the AES-256 encryption key from environment variable or secure local key file.
    If none exists, securely generates a new 256-bit key and stores it in data/.biometric.key.
    """
    # 1. Check environment variable
    if settings.FACE_ENCRYPTION_KEY:
        try:
            raw_key = base64.urlsafe_b64decode(settings.FACE_ENCRYPTION_KEY.strip().encode())
            if len(raw_key) == 32:
                return raw_key
            logger.warning("Provided FACE_ENCRYPTION_KEY is not 32 bytes. Generating or loading local key.")
        except Exception as e:
            logger.error(f"Error parsing FACE_ENCRYPTION_KEY from env: {e}")

    # 2. Check local key file
    if KEY_FILE_PATH.exists():
        try:
            with open(KEY_FILE_PATH, "rb") as f:
                key_data = f.read().strip()
                raw_key = base64.urlsafe_b64decode(key_data)
                if len(raw_key) == 32:
                    return raw_key
        except Exception as e:
            logger.error(f"Error reading {KEY_FILE_PATH}: {e}")

    # 3. Generate new 256-bit key
    new_key = AESGCM.generate_key(bit_length=256)
    b64_key = base64.urlsafe_b64encode(new_key).decode("utf-8")
    
    try:
        os.makedirs(settings.DATA_DIR, exist_ok=True)
        with open(KEY_FILE_PATH, "w", encoding="utf-8") as f:
            f.write(b64_key)
        
        # Log critical administrator notice
        print("\n" + "="*70)
        print(" [SECURITY NOTICE] Generated new AES-256 Biometric Encryption Key:")
        print(f" Key stored at: {KEY_FILE_PATH}")
        print(" WARNING: Keep the encryption key safe. If the key is lost,")
        print(" encrypted biometric data cannot be recovered.")
        print("="*70 + "\n")
        logger.info(f"Generated and saved new AES-256 biometric key to {KEY_FILE_PATH}")
    except Exception as e:
        logger.error(f"Could not persist biometric key to file: {e}")
        
    return new_key

_AES_KEY = None

def get_aes_cipher() -> AESGCM:
    global _AES_KEY
    if _AES_KEY is None:
        _AES_KEY = get_or_create_encryption_key()
    return AESGCM(_AES_KEY)

def encrypt_embedding(embedding: Union[List[float], any]) -> str:
    """
    Encrypts a face embedding (list of floats) using AES-256-GCM.
    Returns format: v1:<base64(nonce_12_bytes + ciphertext_and_tag)>
    """
    try:
        if hasattr(embedding, "tolist"):
            embedding = embedding.tolist()
            
        # Serialize to compact JSON
        serialized = json.dumps(embedding, separators=(",", ":")).encode("utf-8")
        
        # 12-byte random nonce for AES-GCM
        nonce = os.urandom(12)
        
        aesgcm = get_aes_cipher()
        # AESGCM encrypts and appends 16-byte authentication tag
        ciphertext = aesgcm.encrypt(nonce, serialized, None)
        
        payload = nonce + ciphertext
        b64_payload = base64.urlsafe_b64encode(payload).decode("utf-8")
        return f"{ENCRYPTION_VERSION}:{b64_payload}"
    except Exception as e:
        logger.error(f"Encryption failed: {e}")
        raise RuntimeError("Biometric encryption failed") from e

def decrypt_embedding(encrypted_str: str) -> List[float]:
    """
    Decrypts an AES-256-GCM encrypted embedding string.
    Expects format: v1:<base64(nonce_12_bytes + ciphertext_and_tag)>
    """
    try:
        parts = encrypted_str.split(":", 1)
        if len(parts) != 2:
            raise ValueError("Invalid encrypted embedding format")
        
        version, b64_payload = parts
        if version != "v1":
            raise ValueError(f"Unsupported encryption version: {version}")
        
        payload = base64.urlsafe_b64decode(b64_payload.encode("utf-8"))
        if len(payload) < 28: # 12 bytes nonce + at least 16 bytes tag
            raise ValueError("Encrypted payload is corrupted or truncated")
        
        nonce = payload[:12]
        ciphertext = payload[12:]
        
        aesgcm = get_aes_cipher()
        decrypted_bytes = aesgcm.decrypt(nonce, ciphertext, None)
        embedding = json.loads(decrypted_bytes.decode("utf-8"))
        return embedding
    except Exception as e:
        logger.error(f"Biometric decryption failed: {e}")
        raise RuntimeError("Biometric decryption failed") from e
