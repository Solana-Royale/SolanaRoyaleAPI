import { Router } from "express";
import bodyParser from "body-parser";
import VSSI from "../lib/VSSI/index.js";
import { addUser, init } from "../data.js";
import { info } from "../utils/logger.js";

const router = Router();

init();

function makeId() {
  var s = [];
  var hexDigits = "0123456789abcdef";
  for (var i = 0; i < 36; i++) {
    s[i] = hexDigits.substr(Math.floor(Math.random() * 0x10), 1);
  }
  s[14] = "4";
  s[19] = hexDigits.substr((s[19] & 0x3) | 0x8, 1);
  s[8] = s[13] = s[18] = s[23] = "-";

  var uuid = s.join("");
  return uuid;
}

router.use(bodyParser.json());

router.post("/", (req, res) => {
  let data = req.body;
  let username = data.u;
  let salt = makeId();
  let userId = Math.floor(Math.random() * 100000000);
  let password = VSSI.SHA256.hash(`1273454$%[${data.p}[]h&**092${salt}`);

  if (username === undefined || password === undefined) {
    return res.status(400).json({
      error: true,
      message: "Username or password field not set"
    });
  } else {
    let userObj = {
      id: userId,
      username: username,
      password: password,
      salt: salt
    };
    var addUsrRes = addUser(userObj);
    if (addUsrRes.success) {
      info("Registered new user:", userId);
      res.status(200).json({
        error: false,
        message: "User registered"
      });
    } else {
      res.status(400).json({
        error: true,
        message: "A user already exists with that username"
      });
    }
  }
});

export default router;
