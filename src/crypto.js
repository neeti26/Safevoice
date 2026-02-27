const CryptoJS = require("crypto-js");
const crypto = require("crypto");
require('dotenv').config();

const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || 'default-secret-key-change-in-prod';

function encryptData(text) {
    return CryptoJS.AES.encrypt(text, ENCRYPTION_KEY).toString();
}

function decryptData(ciphertext) {
    const bytes = CryptoJS.AES.decrypt(ciphertext, ENCRYPTION_KEY);
    return bytes.toString(CryptoJS.enc.Utf8);
}

function hashData(data) {
    return crypto.createHash('sha256').update(data).digest('hex');
}

module.exports = { encryptData, decryptData, hashData };
