import { Router } from "express";
import VSSI from "../lib/VSSI/index.js";
import { Users, init } from "../data.js";
import nacl from "tweetnacl";
import base58 from "bs58";
import { MongoClient, ServerApiVersion } from 'mongodb';
import fs from 'fs';
import crypto from "crypto";
import web3 from '@solana/web3.js';
import Recaptcha from 'recaptcha-verify';

const recaptchaSecret = fs.readFileSync('recap.dat', 'utf8');
var recaptcha = new Recaptcha({
  secret: recaptchaSecret,
  verbose: false
});

const dbaccess = JSON.parse(fs.readFileSync('dbaccess.dat', 'utf8'));
const dbuser = dbaccess.user;
const dbpass = dbaccess.pass;

const router = Router();
const uri = "mongodb+srv://" + dbuser + ":" + dbpass + "@solanaroyaledb.omszp.mongodb.net/?retryWrites=true&w=majority";
const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true, serverApi: ServerApiVersion.v1 });

var collection = null;
var collectionJSON = null;

function refreshCollection() {
  collection = client.db("SolanaRoyaleDB").collection("users");
}

function multiHash(data, count) {
  for (let i = 0; i < count; i++) {
    let hash = crypto.createHash("sha256");
    hash.update(data);
    data = hash.digest("hex");
  }

  return data;
}

async function findUser(uid) {
  if (uid === undefined || collection === null) {
    return null;
  }
  let data = await collection.find({}).toArray()
  let result = undefined;
  for (var i = 0; i<data.length; i++) {
    let user = data[i];
    /*
      let encrypted = user.data.username.split("|")[0];
      let iv = Buffer.from(user.data.username.split("|")[1], "hex");
      let key = crypto.pbkdf2Sync(pass, Buffer.from(user.data.passwordHash.split(".")[1], "hex"), 100000, 32, 'sha512');
      const decipher = crypto.createDecipheriv("aes-256-cbc", key, iv);
      let decryptedData = decipher.update(encrypted, "hex", "utf-8") + decipher.final("utf-8");
      console.log(iv)
      console.log(decryptedData)
    */
    if (user.uid === uid) {
      result = user;
      break;
    }
  }
  return result;
}

client.connect(async (err) => {
  if (!err) {
    collection = client.db("SolanaRoyaleDB").collection("users");
    collectionJSON = await collection.find({}).toArray();
  } else {
    console.error("FAILED TO CONNECT TO DB, error:", err);
  }
});

function generateUserToken(address, password, ip, timestamp) {
  const signatureUint8 = base58.decode(password);
  const nonceUint8 = new TextEncoder().encode(
    "I am logging into Solana Royale using my Solana wallet (" + address + ").\n\nCreated at " + new Date(parseInt(timestamp)).toISOString() + "."
  );
  const pubKeyUint8 = base58.decode(address);

  let verified = false;

  try {
    verified = nacl.sign.detached.verify(
      nonceUint8,
      signatureUint8,
      pubKeyUint8
    );
  } catch {
    return undefined;
  }

  if (!verified) {
    return undefined;
  } else {
    var tokenData = {
      address: address,
      time: new Date().getTime()
    };

    var metaData = {
      userIpAddress: ip
    };

    return VSSI.generateToken(tokenData, metaData);
  }
}

function makeid(length) {
  var result = '';
  var characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  var charactersLength = characters.length;
  for ( var i = 0; i < length; i++ ) {
    result += characters.charAt(Math.floor(Math.random() * charactersLength));
  }
  return result;
}

router.get("/", async (req, res) => {
  var address = req.query.address;
  var password = req.query.password;
  var timestamp = req.query.timestamp;
  var type = req.query.type;

  if (type === undefined || type === null || type === "" || type === "wallet") {
    if (
      address !== undefined &&
      address !== null &&
      address !== "" &&
      password !== undefined &&
      password !== null &&
      password !== "" &&
      timestamp !== undefined &&
      timestamp !== null &&
      timestamp !== ""
    ) {
      if (parseInt(timestamp) < new Date().getTime() - 10e3) {
        return res.status(400).json({
          error: true,
          message: "Outdated signature"
        });
      }

      var token = generateUserToken(
        address,
        password,
        req.headers["x-forwarded-for"] || req.socket.remoteAddress,
        timestamp
      );

      if (token === undefined) {
        res.status(400).json({
          error: true,
          message: "Invalid address or password"
        });
      } else {
        res.status(200).json({
          error: false,
          token: token
        });
      }
    } else {
      res.status(400).json({
        error: true,
        message: "Invalid address or password"
      });
    }
  } else if (type === "emailpass") {
    var user = req.query.user;
    var pass = req.query.pass;
    var email = req.query.email;
    var cap = req.query.cap;

    if (
      user !== undefined &&
      user !== null &&
      user !== "" &&
      pass !== undefined &&
      pass !== null &&
      pass !== "" &&
      cap !== undefined &&
      cap !== null &&
      cap !== ""
    ) {
      var chkuid = multiHash(user, 15e3);
      let userdata = await findUser(chkuid);

      recaptcha.checkResponse(cap, function(error, response) {
        if (error) {
          res.status(400).json({
            error: true,
            message: "Failed to verify captcha",
          });
          return;
        }
        if (!response.success) {
          res.status(400).json({
            error: true,
            message: "Failed to verify captcha",
          });
          return;
        } else {
          proceed();
        }
      });

      function proceed() {
        if (userdata === undefined) {
          // Register user
          let salt1 = makeid(32);
          let esalt1 = makeid(32);
          let salt2 = makeid(8);
          let esalt2 = makeid(8);
          let iv1 = crypto.randomBytes(16);
          let iv2 = crypto.randomBytes(16);
          let iv3 = crypto.randomBytes(16);
          let key = crypto.pbkdf2Sync(pass, salt1, 100000, 32, 'sha512');
          const cipher1 = crypto.createCipheriv("aes-256-cbc", key, iv1);
          const cipher2 = crypto.createCipheriv("aes-256-cbc", key, iv2);
          const cipher3 = crypto.createCipheriv("aes-256-cbc", key, iv3);
          let solanaSecret = web3.Keypair.generate().secretKey.toString();
          solanaSecret = cipher3.update(solanaSecret, "utf-8", "hex") + cipher3.final("hex")
          let lastlogin = new Date().getTime().toString();
          let userdata = {
            uid: chkuid,
            lastLogin: lastlogin,
            data: {
              passwordHash: multiHash("sol" + salt1 + pass + "royale" + salt2, 12e3) + "." + Buffer.from(salt1).toString("hex") + "." + Buffer.from(salt2).toString("hex"),
              emailHash: email !== undefined ? multiHash("sol" + esalt1 + pass + "royale" + esalt2, 12e3) + "." + Buffer.from(esalt1).toString("hex") + "." + Buffer.from(esalt2).toString("hex") : "",
              username: cipher1.update(user, "utf-8", "hex") + cipher1.final("hex") + "|" + iv1.toString("hex"),
              email: email !== undefined ? cipher2.update(email, "utf-8", "hex") + cipher2.final("hex") + "|" + iv2.toString("hex") : "",
              wallet: solanaSecret + "|" + iv3.toString("hex"),
              tags: [
                "usernamePasswordCombo",
                "serverSideWallet",
                "mobileCompatible",
                "active"
              ],
              preferences: {
                stopLoss: "0"
              }
            }
          };
          collection.insertOne(userdata);
          console.log("Created new user for " + user);
          var tokenData = {
            username: user,
            email: email,
            uid: chkuid,
            time: new Date().getTime()
          };
      
          var metaData = {
            userIpAddress: req.headers["x-forwarded-for"] || req.socket.remoteAddress
          };
      
          let token = VSSI.generateToken(tokenData, metaData);
          let decryptedInfo = {
            error: false,
            uid: chkuid,
            lastLogin: parseInt(lastlogin),
            data: {
              username: user,
              email: email
            },
            token: token
          }
          return res.status(200).json(decryptedInfo);
        } else if (userdata !== null) {
          if (userdata.data.tags.includes("disabled")) {
            return res.status(400).json({
              error: true,
              message: "Account disabled"
            });
          }
          let salt1 = Buffer.from(userdata.data.passwordHash.split(".")[1], "hex").toString();
          let salt2 = Buffer.from(userdata.data.passwordHash.split(".")[2], "hex").toString();
          if (userdata.data.passwordHash.split(".")[0] === multiHash("sol" + salt1 + pass + "royale" + salt2, 12e3)) {
            let user = userdata;
            let key = crypto.pbkdf2Sync(pass, Buffer.from(user.data.passwordHash.split(".")[1], "hex"), 100000, 32, 'sha512');

            // Decrypt username
            let encrypted = user.data.username.split("|")[0];
            let iv = Buffer.from(user.data.username.split("|")[1], "hex");
            var decipher = crypto.createDecipheriv("aes-256-cbc", key, iv);
            let decryptedDataUser = decipher.update(encrypted, "hex", "utf-8") + decipher.final("utf-8");

            // Decrypt email
            if (user.data.email !== "") {
              encrypted = user.data.email.split("|")[0];
              iv = Buffer.from(user.data.email.split("|")[1], "hex");
              decipher = crypto.createDecipheriv("aes-256-cbc", key, iv);
            }
            let decryptedDataEmail = user.data.email !== "" ? decipher.update(encrypted, "hex", "utf-8") + decipher.final("utf-8") : "";

            // Decrypt wallet
            encrypted = user.data.wallet.split("|")[0];
            iv = Buffer.from(user.data.wallet.split("|")[1], "hex");
            decipher = crypto.createDecipheriv("aes-256-cbc", key, iv);
            let decryptedDataWallet = web3.Keypair.fromSecretKey(Uint8Array.from((decipher.update(encrypted, "hex", "utf-8") + decipher.final("utf-8")).split(","))).publicKey.toString();

            // Generate VSSI token
            var tokenData = {
              username: decryptedDataUser,
              email: decryptedDataEmail,
              uid: chkuid,
              time: new Date().getTime()
            };
        
            var metaData = {
              userIpAddress: req.headers["x-forwarded-for"] || req.socket.remoteAddress
            };
        
            let token = VSSI.generateToken(tokenData, metaData);

            let decryptedInfo = {
              error: false,
              uid: chkuid,
              lastLogin: parseInt(user.lastLogin),
              data: {
                username: decryptedDataUser,
                email: decryptedDataEmail,
                spendingActive: !userdata.data.tags.includes("spendingDisabled"),
                mobileCompatible: !userdata.data.tags.includes("mobileCompatible"),
                wallet: {
                  publicKey: decryptedDataWallet
                }
              },
              token: token
            }
            return res.status(200).json(decryptedInfo); // TODO: Update lastLogin
          } else {
            return res.status(500).json({
              error: true,
              message: "Invalid username or password"
            });
          }
        } else {
          return res.status(400).json({
            error: true,
            message: "Server not ready"
          });
        }
      }
    } else {
      res.status(400).json({
        error: true,
        message: "Invalid username or password"
      });
    }
  } else {
    res.status(400).json({
      error: true,
      message: "Invalid login type"
    });
  }
});

export default router;
