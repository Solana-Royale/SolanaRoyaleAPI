// Very Secure Sign In (VSSI)
// Language: javascript
//
// Copyright (c) 2022 Cosmos Softwares

const AES = require("crypto-js/aes");
const SHA256 = require("crypto-js/sha256");
const crypto = require("crypto");
const zlib = require('zlib');
const fs = require('fs');

module.exports = {
    SHA256: {
        hash: SHA256HASH
    },
    AES: {
        encrypt: AESEncrypt,
        decrypt: AESDecrypt
    },
    generateToken: GENERATE_TOKEN,
    parseToken: PARSE_TOKEN,
    getPublicKey: getPublicKey,
    verifyToken: VERIFY_TOKEN,
    debug: {
        generateTokenRaw: GENERATE_TOKEN_UNCOMPRESSES,
        compressionType: "zlib",
        encryptionType: "AES"
    }
}

const sessionPwd = fs.readFileSync('sessionPwd.pem', 'utf8');
const sessionEqServerSeed = parseInt(fs.readFileSync('sessionEq.pem', 'utf8'));

const privateKey = fs.readFileSync('privateKey.pem', 'utf8');
const publicKey = fs.readFileSync('publicKey.pem', 'utf8');

function generateKeyPair() {
    const { privateKey, publicKey } = crypto.generateKeyPairSync('rsa', {
        modulusLength: 4096,
        publicKeyEncoding: {
            type: 'spki',
            format: 'pem'
        },
        privateKeyEncoding: {
            type: 'pkcs8',
            format: 'pem'
        }
    });

    fs.writeFileSync('./publicKey.pem', publicKey);
    fs.writeFileSync('./privateKey.pem', privateKey);
    fs.writeFileSync('./sessionPwd.pem', crypto.randomBytes(1024).toString('hex'));
    fs.writeFileSync('./sessionEq.pem', (Math.ceil(Math.random() - 100 * 999) + 100).toString());
}

function getPublicKey() {
    return publicKey;
}

var validNonces = [];

function SHA256HASH(t) {
    return SHA256(t).toString()
}

function AESEncrypt(t, e) {
    var iv = crypto.randomBytes(16);
    var cipher = crypto.createCipheriv('aes-256-gcm', SHA256HASH(e).slice(32), iv);
    var crypted = cipher.update(t, 'utf8', 'hex')
    crypted += cipher.final('hex');
    return crypted + "." + iv.toString('hex');
}

function AESDecrypt(t, e, iv) {
    var decipher = crypto.createDecipheriv('aes-256-gcm', SHA256HASH(e).slice(32), iv)
    var dec = decipher.update(t,'hex','utf8')
    return dec;
}

function SHA256SIGN(t) {
    var sign = crypto.createSign('SHA384');
    sign.write(t);
    sign.end();
    var signature = sign.sign({ key: privateKey, format: 'pem', type: 'pkcs8' });
    return signature.toString('hex');
}

function SHA256VERIFY(sig, data) {
    var verify = crypto.createVerify('SHA384');    
    verify.write(data);
    verify.end();
    var verified = verify.verify({ key: publicKey, format: 'pem', type: 'spki' }, Buffer.from(sig, 'hex'));
    return verified;
}

function DEFLATE(t) {
    return zlib.deflateSync(t).toString('base64');
}

function INFLATE(t) {
    return zlib.inflateSync(Buffer.from(t, 'base64')).toString();
}

function VERIFY_TOKEN(token) {
    var tokenData = INFLATE(token);
    tokenData = tokenData.split('.');

    var encData = tokenData[0];
    var signature = tokenData[2];

    var validSig = SHA256VERIFY(signature, encData);

    return validSig;
}

var TreeNode = function(left, right, operator) {
    this.left = left;
    this.right = right;
    this.operator = operator;
    
    this.toString = function() {
        return '(' + left + ' ' + operator + ' ' + right + ')';
    }
}

function mulberry32(a) {
    var t = a += 0x6D2B79F5;
    t = Math.imul(t ^ t >>> 15, t | 1);
    t ^= t + Math.imul(t ^ t >>> 7, t | 61);
    return Math.floor((((t ^ t >>> 14) >>> 0) / 4294967296) * 999999);
}

function randomNumber(seed) {
	var rint = mulberry32(seed);
  if (rint === "") {
  	rint = "0";
  }
	return parseInt(rint);
}

function randomNumberRange(seed) {
    var rint = mulberry32(seed).toString();
    return Math.floor(parseFloat('0.' + rint.slice(rint.length - 1)) * (8 - 0 + 1) + 0)
}

function buildTree(numNodes, seed) {
    if (numNodes === 1)
        return randomNumber(seed);
    
    var numLeft = Math.floor(numNodes / 2);
    var leftSubTree = buildTree(numLeft, seed - 1);
    var numRight = Math.ceil(numNodes / 2);
    var rightSubTree = buildTree(numRight, seed + 1);
    
    var m = randomNumberRange(seed);
    var str = ['/','*','-','+', '+', '*', '+', '*', '*'][m];
    return new TreeNode(leftSubTree, rightSubTree, str);
}

function PARSE_TOKEN(token, metadata = {}) {
    var tokenData = INFLATE(token.split('.')[0]);
    tokenData = tokenData.split('.');

    var encData = tokenData[0];
    var iv = Buffer.from(tokenData[1], "hex");
    var signature = tokenData[2];
    var timestamp = tokenData[3];
    var tokenInfo = JSON.parse(tokenData[4]);
    var mathEqSeed = token.split('.')[1];
    var mathEqAnsHash = token.split('.')[2];

    var mathEqCalcHash = SHA256HASH(eval(buildTree(50, ((mathEqSeed - sessionEqServerSeed) / 4)).toString()).toString());

    if (mathEqAnsHash !== mathEqCalcHash) {
        return undefined;
    }

    var metaEncTag = '';

    if (tokenInfo.metaEncrypted && Object.keys(metadata).length === 0) {
        return undefined;
    } else {
        metaEncTag = SHA256HASH(JSON.stringify(metadata));
    }

    var validSig = SHA256VERIFY(signature, encData);

    if (!validSig) {
        return undefined;
    } else {
        try {
            var encryptionPwd = privateKey.toString() + SHA256HASH(timestamp.toString()) + sessionPwd + metaEncTag;
            console.log(AESDecrypt(encData, encryptionPwd, iv))
            var decrypted = JSON.parse(AESDecrypt(encData, encryptionPwd, iv));
            return decrypted;
        } catch (e) {
            console.log(e)
            return undefined;
        }
    }
}

function GENERATE_TOKEN_UNCOMPRESSES(data, metadata = {}) {
    return INFLATE(GENERATE_TOKEN(data, metadata));
}

function MULBERRY32(a) {
    var t = a += 0x6D2B79F5;
    t = Math.imul(t ^ t >>> 15, t | 1);
    t ^= t + Math.imul(t ^ t >>> 7, t | 61);
    return Math.floor((((t ^ t >>> 14) >>> 0) / 4294967296) * 10000000000);
}

function GENERATE_TOKEN(data, metadata = {}) {
    var insecureNonce = Math.floor(Math.random() * 100000000);
    var secureNonce = crypto.randomBytes(512).toString('hex');
    var timestamp = new Date().getTime();
    var nonce = SHA256HASH(insecureNonce + secureNonce + timestamp.toString());
    var mathEqSeed = MULBERRY32(timestamp);
    var mathAns = SHA256HASH(eval(buildTree(50, mathEqSeed / 4).toString()).toString());

    var tokenData = data;

    tokenData.nonce = nonce;
    tokenData.timestamp = timestamp;

    var tokenInfo = {
        metaEncrypted: false
    }

    var metaEncTag = '';

    if (Object.keys(metadata).length > 0) {
        tokenInfo.metaEncrypted = true;
        metaEncTag = SHA256HASH(JSON.stringify(metadata));
    }

    var encryptionPwd = privateKey.toString() + SHA256HASH(timestamp.toString()) + sessionPwd + metaEncTag;

    var tokenDataEncrypted = AESEncrypt(JSON.stringify(tokenData), encryptionPwd);

    validNonces.push(nonce);

    var sig = SHA256SIGN(tokenDataEncrypted.split('.')[0]);

    var parsedToken = `${tokenDataEncrypted}.${sig}.${timestamp.toString()}.${JSON.stringify(tokenInfo).toString('base64')}`;

    var deflated = DEFLATE(parsedToken) + "." + (mathEqSeed + sessionEqServerSeed) + "." + mathAns;

    delete insecureNonce;
    delete secureNonce;
    delete timestamp;

    return deflated;
}