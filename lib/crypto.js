import CryptoJS from 'crypto-js';

// Derive encryption key from user password using PBKDF2
export function deriveKey(password, salt = 'passguard-salt-v1') {
  return CryptoJS.PBKDF2(password, salt, {
    keySize: 256 / 32,
    iterations: 10000
  }).toString();
}

// Encrypt data with AES-256
export function encryptData(data, password) {
  try {
    const key = deriveKey(password);
    const encrypted = CryptoJS.AES.encrypt(JSON.stringify(data), key).toString();
    return encrypted;
  } catch (error) {
    console.error('Encryption error:', error);
    throw new Error('Failed to encrypt data');
  }
}

// Decrypt data with AES-256
export function decryptData(encryptedData, password) {
  try {
    const key = deriveKey(password);
    const decrypted = CryptoJS.AES.decrypt(encryptedData, key);
    const decryptedStr = decrypted.toString(CryptoJS.enc.Utf8);
    return JSON.parse(decryptedStr);
  } catch (error) {
    console.error('Decryption error:', error);
    throw new Error('Failed to decrypt data - wrong password?');
  }
}