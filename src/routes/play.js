import { Router } from "express";
import VSSI from "../lib/VSSI/index.js";
import { Users, GAMES_RUNNING, USER_DATA } from "../data.js";
import { AVAILABLE_GAMES } from "../games.js";

const router = Router();

router.get("/", (req, res) => {
  var sessionId = req.query.session;
  var token = req.query.token;
  var data = JSON.parse(Buffer.from(req.query.data, "base64"));

  var tkd = VSSI.parseToken(token, {
    userIpAddress: req.headers["x-forwarded-for"] || req.socket.remoteAddress
  });

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

  var sessions = Object.keys(GAMES_RUNNING);

  if (sessions.includes(sessionId)) {
    var session = GAMES_RUNNING[sessionId];
    var gameResponse = AVAILABLE_GAMES[session.gameId].play.action(
      USER_DATA[userid],
      data
    );
    if (gameResponse !== null) {
      if (!USER_DATA[userid].hasPlayed.includes(session.gameId)) {
        USER_DATA[userid].hasPlayed.push(session.gameId);
      }
      res.status(200).json({
        error: false,
        result: gameResponse
      });
    } else {
      res.status(500).json({
        error: true,
        message: "Game failed to execute"
      });
    }
  } else {
    res.status(404).json({
      error: true,
      message: "Session not found"
    });
  }
});

export default router;
