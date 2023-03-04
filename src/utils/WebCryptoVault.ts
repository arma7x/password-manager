// https://gist.github.com/junderw/1d41158403978ba0363e5868d4f434d9

import * as localForage from "localforage";
localForage.setDriver(localForage.INDEXEDDB);

declare var dcodeIO:any;

const dbName = 'DATABASE';

const dbAppConfig = localForage.createInstance({
  name        : dbName,
  storeName   : 'dbAppConfig',
  description : 'store app config'
});

export async function getPasswordHash(): Promise<any> {
  return await dbAppConfig.getItem('password_hash');
}

export async function setPasswordHash(value: string): Promise<any> {
  return await dbAppConfig.setItem('password_hash', value);
}

export async function getPublicKey(): Promise<any> {
  return await dbAppConfig.getItem('public_key');
}

export async function setPublicKey(value: any): Promise<any> {
  return await dbAppConfig.setItem('public_key', value);
}

export async function getEncryptedPrivateKey(): Promise<any> {
  return await dbAppConfig.getItem('encrypted_private_key');
}

export async function setEncryptedPrivateKey(value: any): Promise<any> {
  return await dbAppConfig.setItem('encrypted_private_key', value);
}

const dbPasswordVault = localForage.createInstance({
  name        : dbName,
  storeName   : 'passwordVault',
  description : 'store password'
});

function chunkString(str, length) {
  return str.match(new RegExp('.{1,' + length + '}', 'g'));
}

export async function getAllPasswordVault(): Promise<Object> {
  let collections = {};
  await dbPasswordVault.iterate((value, key, iterationNumber) => {
    collections[key] = value;
  });
  return Promise.resolve(collections);
}

export async function storeIntoPasswordVault(id: string|null, alias: string, name: string, data: string, publicKey: any): Promise<Object> {
  let segments: Array<string> = chunkString(data, 50);
  if (id == null)
    id = new Date().getTime().toString();

  for (let i=0;i<segments.length;i++) {
    segments[i] = await rsaEncrypt(publicKey, segments[i]);
  }
  const result = await dbPasswordVault.setItem(id, {
    alias: alias,
    name: name,
    encrypted: segments
  });
  return Promise.resolve({
    key: id,
    data: result
  });
}

// getFromPasswordVault(id: number): number
export async function removeFromPasswordVault(key: string) {
  return await dbPasswordVault.removeItem(key);
}
// migratePasswordVault(oldPrivateKey: Key, newPublicKey: key)

export {
  dbAppConfig,
  dbPasswordVault
}

const rsaConfig = {
  name: "RSA-OAEP",
  modulusLength: 2048,
  publicExponent: new Uint8Array([1, 0, 1]),
  hash: "SHA-256"
};

export async function generateRSAKey() {
  return await window.crypto.subtle.generateKey(rsaConfig, true, ["encrypt", "decrypt"]);
}

export async function convertRSAKeyToJWK(key: CryptoKey): Promise<Object> {
  return await window.crypto.subtle.exportKey("jwk", key);
}

export async function convertJWKToRSAKey(jwt): Promise<CryptoKey> {
  return await window.crypto.subtle.importKey("jwk", jwt, rsaConfig, true, [...jwt.key_ops]);
}

export async function rsaEncrypt(publicOrPrivateKey: CryptoKey, message): Promise<string> {
  let encrypted = await window.crypto.subtle.encrypt({ name: rsaConfig.name, }, publicOrPrivateKey, new TextEncoder().encode(message));
  return base64Encode(new Uint8Array(encrypted));
}

export async function rsaDecrypt(privateKey: CryptoKey, encryptedMessage): Promise<string> {
  let decrypted = await window.crypto.subtle.decrypt({ name: rsaConfig.name }, privateKey, base64Decode(encryptedMessage));
  return new TextDecoder().decode(new Uint8Array(decrypted));
}

// at least 1 number, 1 uppercase & 1 lowercase
export function checkPasscodeRequirement(str, min = 3) {
  if (str.length < min)
    throw(`Minimum length is ${min}`);
  if (/(?=.*\d)(?=.*[a-z])(?=.*[A-Z])/.test(str) === false)
    throw("At least 1 number and 1 uppercase and 1 lowercase");
  return str
}

export function hashPassword(str) {
  var salt = dcodeIO.bcrypt.genSaltSync(10);
  return dcodeIO.bcrypt.hashSync(str.toString(), salt);
}

export function comparePassword(str, hash) {
  return dcodeIO.bcrypt.compareSync(str, hash);
}

export async function aesEncrypt(data, password, difficulty = 10) {
  const hashKey = await grindKey(password, difficulty)
  const iv = await getIv(password, data)

  const key = await window.crypto.subtle.importKey(
    'raw',
    hashKey, {
      name: 'AES-GCM',
    },
    false,
    ['encrypt']
  )

  const encrypted = await window.crypto.subtle.encrypt({
      name: 'AES-GCM',
      iv,
      tagLength: 128,
    },
    key,
    new TextEncoder().encode(data)
  )

  const result = Array.from(iv).concat(Array.from(new Uint8Array(encrypted)))

  return base64Encode(new Uint8Array(result))
}

export async function aesDecrypt(ciphertext, password, difficulty = 10) {
  const ciphertextBuffer = Array.from(base64Decode(ciphertext))
  const hashKey = await grindKey(password, difficulty)

  const key = await window.crypto.subtle.importKey(
    'raw',
    hashKey, {
      name: 'AES-GCM',
    },
    false,
    ['decrypt']
  )

  const decrypted = await window.crypto.subtle.decrypt({
      name: 'AES-GCM',
      iv: new Uint8Array(ciphertextBuffer.slice(0, 12)),
      tagLength: 128,
    },
    key,
    new Uint8Array(ciphertextBuffer.slice(12))
  )

  return new TextDecoder().decode(new Uint8Array(decrypted))
}

export function base64Encode(u8) {
  return btoa(String.fromCharCode.apply(null, u8))
}

export function base64Decode(str) {
  return new Uint8Array(atob(str).split('').map(c => c.charCodeAt(0)))
}

export function grindKey(password, difficulty) {
  return pbkdf2(password, password + password, Math.pow(2, difficulty), 32, 'SHA-256')
}

export function getIv(password, data) {
  const randomData = base64Encode(window.crypto.getRandomValues(new Uint8Array(12)))
  return pbkdf2(password + randomData, data + (new Date().getTime().toString()), 1, 12, 'SHA-256')
}

export async function pbkdf2(message, salt, iterations, keyLen, algorithm) {
  const msgBuffer = new TextEncoder().encode(message)
  const msgUint8Array = new Uint8Array(msgBuffer)
  const saltBuffer = new TextEncoder().encode(salt)
  const saltUint8Array = new Uint8Array(saltBuffer)

  const key = await crypto.subtle.importKey('raw', msgUint8Array, {
    name: 'PBKDF2'
  }, false, ['deriveBits'])

  const buffer = await crypto.subtle.deriveBits({
    name: 'PBKDF2',
    salt: saltUint8Array,
    iterations: iterations,
    hash: algorithm
  }, key, keyLen * 8)

  return new Uint8Array(buffer)
}

export async function test(passcode, message) {
  checkPasscodeRequirement(passcode);
  const hash = hashPassword(passcode);
  if (comparePassword(passcode, hash)) {
    const key = await generateRSAKey();
    let publicKey = await convertRSAKeyToJWK(key.publicKey);
    let privateKey = await convertRSAKeyToJWK(key.privateKey);
    const encryptPrivateKey = await aesEncrypt(JSON.stringify(privateKey), passcode);
    const decryptPrivateKey = JSON.parse(await aesDecrypt(encryptPrivateKey, passcode));
    if (JSON.stringify(decryptPrivateKey) !== JSON.stringify(privateKey)) {
      throw(`FAIL: aesEncrypt/aesDecrypt private key`);
    }
    let _publicKey = await convertJWKToRSAKey(publicKey);
    let _privateKey = await convertJWKToRSAKey(decryptPrivateKey);
    const messageEncrypted = await rsaEncrypt(_publicKey, message); // limit 188 chars on 512mb device
    const messageDecrypted = await rsaDecrypt(_privateKey, messageEncrypted);
    if (messageDecrypted !== message) {
      throw(`FAIL: rsaEncrypt/rsaDecrypt, expected: ${message}, actual result: ${messageDecrypted}`);
    }
  } else {
    throw(`FAIL: Password not match: ${passcode}`);
  }
}
