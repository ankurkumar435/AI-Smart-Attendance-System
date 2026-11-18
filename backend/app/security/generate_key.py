import base64
from cryptography.hazmat.primitives.ciphers.aead import AESGCM

def main():
    key = AESGCM.generate_key(bit_length=256)
    b64_key = base64.urlsafe_b64encode(key).decode("utf-8")
    print("\n" + "="*70)
    print(" AI Smart Attendance - AES-256 Key Generator")
    print("="*70)
    print("Generated 256-bit URL-safe Base64 Key:")
    print(f"\nFACE_ENCRYPTION_KEY={b64_key}\n")
    print("Instructions:")
    print("1. Copy this key into your .env file or production environment variable.")
    print("2. WARNING: Keep this encryption key safe. If the key is lost,")
    print("   encrypted biometric data cannot be recovered.")
    print("="*70 + "\n")

if __name__ == "__main__":
    main()
