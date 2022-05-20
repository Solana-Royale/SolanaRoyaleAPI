import { Router } from "express";
import VSSI from "../lib/VSSI/index.js";

const router = Router();

router.get("/", (req, res) => {
  var token = Buffer.from(req.query.token, "base64").toString();
  var address = req.query.address;

  var tkd = VSSI.parseToken(token, {
    userIpAddress: req.headers["x-forwarded-for"] || req.socket.remoteAddress
  });

  if (tkd === undefined) {
    console.log("1")
    res.status(400).json({
      error: true,
      message: "Invalid authorization token"
    });
    return;
  }

  if (!Object.keys(tkd).includes("tags")) {
    console.log("2")
    return res.status(400).json({
      error: true,
      message: "Invalid authorization token"
    });
  }

  if (
    tkd.tags.includes("wallet") &&
    tkd.address === address &&
    tkd.time > new Date().getTime() - 1000 * 60 * 60
  ) {
    res.status(200).json({
      error: false,
      message: "Valid authorization token"
    });
  } else if (
    tkd.tags.includes("account") &&
    tkd.time > new Date().getTime() - 1000 * 60 * 60 * 24 * 7
  ) {
    res.status(200).json({
      error: false,
      message: "Valid authorization token",
      data: {
        username: tkd.username,
        email: tkd.email,
        uid: tkd.uid,
      }
    });
  } else {
    console.log("3")
    res.status(400).json({
      error: true,
      message: "Invalid authorization token"
    });
  }
});

export default router;
