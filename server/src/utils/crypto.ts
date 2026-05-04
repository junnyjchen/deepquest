import crypto from 'crypto';

/**
 * AES-256-CBC 加密/解密工具
 */

// 获取加密密钥（从环境变量）
function getEncryptionKey(): string {
  const key = process.env.ENCRYPTION_KEY;
  if (!key) {
    throw new Error('未设置 ENCRYPTION_KEY 环境变量');
  }
  return key;
}

// 确保密钥长度正确（32字节用于 AES-256）
function normalizeKey(key: string): Buffer {
  const hash = crypto.createHash('sha256').update(key).digest();
  return hash;
}

// 获取 IV 长度（16字节）
function getIV(): Buffer {
  return crypto.randomBytes(16);
}

/**
 * 使用 AES-256-CBC 加密字符串
 * @param plaintext 要加密的明文
 * @returns 加密后的字符串（IV:加密数据:密钥标识）
 */
export function encrypt(plaintext: string): string {
  const key = normalizeKey(getEncryptionKey());
  const iv = getIV();
  
  const cipher = crypto.createCipheriv('aes-256-cbc', key, iv);
  let encrypted = cipher.update(plaintext, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  
  // 返回格式：IV(hex):加密数据(hex)
  return `${iv.toString('hex')}:${encrypted}`;
}

/**
 * 解密 AES-256-CBC 加密的字符串
 * @param encryptedText 加密字符串（格式：IV:加密数据）
 * @returns 解密后的明文
 */
export function decrypt(encryptedText: string): string {
  const key = normalizeKey(getEncryptionKey());
  const parts = encryptedText.split(':');
  
  if (parts.length !== 2) {
    throw new Error('加密格式无效');
  }
  
  const iv = Buffer.from(parts[0], 'hex');
  const encryptedData = parts[1];
  
  const decipher = crypto.createDecipheriv('aes-256-cbc', key, iv);
  let decrypted = decipher.update(encryptedData, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  
  return decrypted;
}

/**
 * 便捷函数：获取解密后的工厂私钥
 */
export function getDecryptedFactoryKey(): string {
  const encryptedKey = process.env.ENCRYPTED_FACTORY_KEY;
  if (!encryptedKey) {
    throw new Error('未设置 ENCRYPTED_FACTORY_KEY 环境变量');
  }
  return decrypt(encryptedKey);
}
