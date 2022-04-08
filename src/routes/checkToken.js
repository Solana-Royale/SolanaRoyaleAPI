import { Router } from "express";
import VSSI from "../lib/VSSI/index.js";

const router = Router();

router.get("/", (req, res) => {
  var token = Buffer.from(req.query.token, "base64").toString();
  var address = req.query.address;

  var tkd = VSSI.parseToken(token, {
    userIpAddress: req.headers["x-forwarded-for"] || req.socket.remoteAddress
  });

  console.log(tkd)

  if (tkd === undefined) {
    res.status(400).json({
      error: true,
      message: "Invalid authorization token"
    });
    return;
  }

  if (
    tkd.address === address &&
    tkd.time > new Date().getTime() - 1000 * 60 * 60
  ) {
    res.status(200).json({
      error: false,
      message: "Valid authorization token"
    });
  } else {
    res.status(400).json({
      error: true,
      message: "Invalid authorization token"
    });
  }
});

export default router;
