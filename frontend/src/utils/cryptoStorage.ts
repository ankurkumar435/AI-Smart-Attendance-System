/**
 * Encrypted Local Storage Utility
 * Transparently encrypts sensitive values (tokens, user sessions) stored in browser localStorage.
 */

const STORAGE_PREFIX = 'ENC_v1:';
const STATIC_KEY_SEED = 'attendance_local_secure_vault_key_2026_salt';

function getLocalKey(): number[] {
  const key: number[] = [];
  for (let i = 0; i < STATIC_KEY_SEED.length; i++) {
    key.push((STATIC_KEY_SEED.charCodeAt(i) * 31 + 17) & 0xff);
  }
  return key;
}

function encryptPayload(plainText: string): string {
  try {
    const key = getLocalKey();
    const encoder = new TextEncoder();
    const bytes = encoder.encode(plainText);
    const encrypted = new Uint8Array(bytes.length);

    for (let i = 0; i < bytes.length; i++) {
      encrypted[i] = bytes[i] ^ key[i % key.length];
    }

    let binary = '';
    for (let i = 0; i < encrypted.length; i++) {
      binary += String.fromCharCode(encrypted[i]);
    }
    const b64 = btoa(binary);
    return `${STORAGE_PREFIX}${b64}`;
  } catch (e) {
    console.error('Encryption failed, falling back:', e);
    return plainText;
  }
}

function decryptPayload(encryptedStr: string): string {
  try {
    if (!encryptedStr || !encryptedStr.startsWith(STORAGE_PREFIX)) {
      // Legacy unencrypted string fallback
      return encryptedStr;
    }
    const b64 = encryptedStr.slice(STORAGE_PREFIX.length);
    const binary = atob(b64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }

    const key = getLocalKey();
    const decrypted = new Uint8Array(bytes.length);
    for (let i = 0; i < bytes.length; i++) {
      decrypted[i] = bytes[i] ^ key[i % key.length];
    }

    const decoder = new TextDecoder();
    return decoder.decode(decrypted);
  } catch (e) {
    console.error('Decryption failed, returning null:', e);
    return '';
  }
}

export const cryptoStorage = {
  setItem: (key: string, value: string): void => {
    try {
      const encrypted = encryptPayload(value);
      localStorage.setItem(key, encrypted);
    } catch (err) {
      console.error(`Error saving ${key} to encrypted localStorage:`, err);
      try {
        localStorage.setItem(key, value);
      } catch {}
    }
  },

  getItem: (key: string): string | null => {
    try {
      const stored = localStorage.getItem(key);
      if (!stored) return null;
      const decrypted = decryptPayload(stored);
      return decrypted || stored;
    } catch (err) {
      console.error(`Error reading ${key} from encrypted localStorage:`, err);
      return localStorage.getItem(key);
    }
  },

  removeItem: (key: string): void => {
    try {
      localStorage.removeItem(key);
    } catch {}
  },

  clear: (): void => {
    try {
      localStorage.clear();
    } catch {}
  },
};
