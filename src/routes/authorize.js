import { Router } from "express";
import VSSI from "../lib/VSSI/index.js";
import { Users, init } from "../data.js";
import nacl from "tweetnacl";
import base58 from "bs58";

const router = Router();

function generateUserToken(address, password, ip) {
  const signatureUint8 = base58.decode(password);
  const nonceUint8 = new TextEncoder().encode(
    "I am logging into Solana Royale using my Solana wallet (" + address + ")"
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
      address: address
    };

    var metaData = {
      userIpAddress: ip
    };

    return VSSI.generateToken(tokenData, metaData);
  }
}

router.get("/", (req, res) => {
  var address = req.query.address;
  var password = req.query.password;

  if (
    address !== undefined &&
    address !== null &&
    address !== "" &&
    password !== undefined &&
    password !== null &&
    password !== ""
  ) {
    var token = generateUserToken(
      address,
      password,
      req.headers["x-forwarded-for"] || req.socket.remoteAddress
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
});

export default router;
