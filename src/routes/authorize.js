import { Router } from "express";
import VSSI from "../lib/VSSI/index.js";
import { Users } from "../data.js";

const router = Router();

function generateUserToken(username, password, ip) {
  var user = null;

  for (var i = 0; i < Object.keys(Users).length; i++) {
    var un = Users[Object.keys(Users)[i]].username;

    if (un === username) {
      user = Users[Object.keys(Users)[i]];
      break;
    }
  }

  if (user === null) {
    return undefined;
  } else {
    password = VSSI.SHA256.hash("1273454$%[" + password + "[]h&**092");
    if (user.password === password) {
      var tokenData = {
        username: username,
        password: password,
        userId: user.id
      };

      var metaData = {
        userIpAddress: ip
      };

      return VSSI.generateToken(tokenData, metaData);
    } else {
      return undefined;
    }
  }
}

router.get("/", (req, res) => {
  var username = req.query.username;
  var password = req.query.password;

  if (
    username !== undefined &&
    username !== null &&
    username !== "" &&
    password !== undefined &&
    password !== null &&
    password !== ""
  ) {
    var token = generateUserToken(
      username,
      password,
      req.headers["x-forwarded-for"] || req.socket.remoteAddress
    );

    if (token === undefined) {
      res.status(400).json({
        error: true,
        message: "Invalid username or password"
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
      message: "Invalid username or password"
    });
  }
});

export default router;
