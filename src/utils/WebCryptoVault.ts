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

const dbPasswordVault = localForage.createInstance({
  name        : dbName,
  storeName   : 'passwordVault',
  description : 'store password'
});

// getPasswordHash(): string
// setPasswordHash(hash: string): string

// getPublicKey(): Object
// setPublicKey(key: Object): Object

// getPrivateKey(): string
// setPrivateKey(str: string): string

// getAllPasswordVault(): Object
// storeIntoPasswordVault(id: number|null, alias: string, name: string, secret: string, publicKey: Key): number
// getFromPasswordVault(id: number): number
// removeFromPasswordVault(id: number): number
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

async function generateRSAKey() {
  return await window.crypto.subtle.generateKey(rsaConfig, true, ["encrypt", "decrypt"]);
}

async function convertRSAKeyToJWK(key) {
  return await window.crypto.subtle.exportKey("jwk", key);
}

async function convertJWKToRSAKey(jwt) {
  return await window.crypto.subtle.importKey("jwk", jwt, rsaConfig, true, [...jwt.key_ops]);
}

async function rsaEncrypt(publicOrPrivateKey, message) {
  let encrypted = await window.crypto.subtle.encrypt({ name: rsaConfig.name, }, publicOrPrivateKey, new TextEncoder().encode(message));
  return base64Encode(new Uint8Array(encrypted));
}

async function rsaDecrypt(privateKey, encryptedMessage) {
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
    const messageEncrypted = await rsaEncrypt(_publicKey, message);
    const messageDecrypted = await rsaDecrypt(_privateKey, messageEncrypted);
    if (messageDecrypted !== message) {
      throw(`FAIL: rsaEncrypt/rsaDecrypt, expected: ${message}, actual result: ${messageDecrypted}`);
    }
  } else {
    throw(`FAIL: Password not match: ${passcode}`);
  }
}
