import { Router } from "express";
import VSSI from "../lib/VSSI/index.js";
import { Users, GAMES_RUNNING, USER_DATA } from "../data.js";
import { AVAILABLE_GAMES } from "../games.js";
import { info, error } from "../utils/logger.js";

const router = Router();

router.get("/", (req, res) => {
  const gid = req.query.gid;
  var token = req.query.token;

  try {
    var tkd = VSSI.parseToken(token, {
      userIpAddress: req.headers["x-forwarded-for"] || req.socket.remoteAddress
    });
  } catch (ex) {
    error(ex);
  }

  if (tkd === undefined) {
    res.status(400).json({
      error: true,
      message: "Invalid authorization token"
    });
    return;
  }

  if (Users[tkd.userId].password !== tkd.password) {
    res.status(400).json({
      error: true,
      message: "Invalid authorization token"
    });
    return;
  }

  var userid = tkd.userId;
  var username = tkd.username;

  if (gid === undefined || gid === "" || gid === null) {
    res.status(404).json({
      error: true,
      message: "Game not found"
    });
  } else {
    let gameIds = Object.keys(AVAILABLE_GAMES);

    if (gameIds.includes(gid)) {
      var sessionId = makeId();
      GAMES_RUNNING[sessionId] = {
        id: sessionId,
        gameId: gid,
        createdAt: new Date().getTime(),
        user: {
          username: username,
          id: userid
        }
      };
      if (Object.keys(USER_DATA).includes(userid)) {
        if (!USER_DATA[userid].hasPlayed.includes(gid)) {
          USER_DATA[userid].hasPlayed.push(gid);
        }
      } else {
        USER_DATA[userid] = {
          userid: userid,
          username: username,
          hasPlayed: [],
          wins: 0,
          losses: 0
        };
      }
      res.status(200).json({
        error: false,
        sessionId: sessionId,
        sessionData: GAMES_RUNNING[sessionId]
      });
    } else {
      res.status(404).json({
        error: true,
        message: "Game not found"
      });
    }
  }
});

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

export default router;
