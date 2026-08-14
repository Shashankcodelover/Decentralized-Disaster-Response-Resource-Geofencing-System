/**
 * Client-Side End-to-End Encryption (E2EE) Utility
 * 
 * Uses the Web Crypto API to securely negotiate and manage ECDH keys,
 * and perform AES-GCM encryption for tactical communications.
 */

// Generate a new ECDH Key Pair for the current device
export async function generateKeyPair(): Promise<CryptoKeyPair> {
  return await window.crypto.subtle.generateKey(
    { name: 'ECDH', namedCurve: 'P-256' },
    true,
    ['deriveKey', 'deriveBits']
  );
}

// Safe Base64 encoding for ArrayBuffer (avoids Maximum call stack size & utf-8 issues in Safari)
function arrayBufferToBase64(buffer: ArrayBuffer): string {
  let binary = '';
  const bytes = new Uint8Array(buffer);
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

function base64ToArrayBuffer(base64: string): ArrayBuffer {
  const binaryString = atob(base64);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes.buffer;
}

// Export public key to Base64 so it can be uploaded to the PKI server
export async function exportPublicKey(key: CryptoKey): Promise<string> {
  const exported = await window.crypto.subtle.exportKey('raw', key);
  return arrayBufferToBase64(exported);
}

// Import a remote responder's Base64 public key
export async function importPublicKey(base64Key: string): Promise<CryptoKey> {
  const buffer = base64ToArrayBuffer(base64Key);
  return await window.crypto.subtle.importKey(
    'raw',
    buffer,
    { name: 'ECDH', namedCurve: 'P-256' },
    true,
    []
  );
}

// Derive a shared AES-GCM key using local private key and remote public key
export async function deriveSharedKey(privateKey: CryptoKey, publicKey: CryptoKey): Promise<CryptoKey> {
  return await window.crypto.subtle.deriveKey(
    { name: 'ECDH', public: publicKey },
    privateKey,
    { name: 'AES-GCM', length: 256 },
    true,
    ['encrypt', 'decrypt']
  );
}

// Encrypt a plaintext message
export async function encryptMessage(
  sharedKey: CryptoKey,
  plaintext: string
): Promise<{ ciphertext: string; iv: string; authTag: string }> {
  const iv = window.crypto.getRandomValues(new Uint8Array(12));
  const encodedText = new TextEncoder().encode(plaintext);
  
  const encryptedBuffer = await window.crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    sharedKey,
    encodedText
  );

  // AES-GCM appends the 16-byte auth tag at the end of the ciphertext
  const encryptedBytes = new Uint8Array(encryptedBuffer);
  const ciphertextBytes = encryptedBytes.slice(0, encryptedBytes.length - 16);
  const authTagBytes = encryptedBytes.slice(encryptedBytes.length - 16);

  return {
    ciphertext: arrayBufferToBase64(ciphertextBytes.buffer),
    iv: arrayBufferToBase64(iv.buffer),
    authTag: arrayBufferToBase64(authTagBytes.buffer),
  };
}

// Decrypt a ciphertext message
export async function decryptMessage(
  sharedKey: CryptoKey,
  ciphertextBase64: string,
  ivBase64: string,
  authTagBase64: string
): Promise<string> {
  const ciphertextBuffer = base64ToArrayBuffer(ciphertextBase64);
  const iv = new Uint8Array(base64ToArrayBuffer(ivBase64));
  const authTagBuffer = base64ToArrayBuffer(authTagBase64);

  const encryptedBytes = new Uint8Array(ciphertextBuffer.byteLength + authTagBuffer.byteLength);
  encryptedBytes.set(new Uint8Array(ciphertextBuffer), 0);
  encryptedBytes.set(new Uint8Array(authTagBuffer), ciphertextBuffer.byteLength);

  const decryptedBuffer = await window.crypto.subtle.decrypt(
    { name: 'AES-GCM', iv },
    sharedKey,
    encryptedBytes
  );

  return new TextDecoder().decode(decryptedBuffer);
}
