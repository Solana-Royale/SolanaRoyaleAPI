import { Router } from "express";
import VSSI from "../lib/VSSI/index.js";
import { Users, GAMES_RUNNING, USER_DATA, init } from "../data.js";
import { AVAILABLE_GAMES } from "../games.js";
import fs from 'fs';

const router = Router();

init();

function deactivatePlayCode(code) {
  var codesRaw = fs.readFileSync('gamePlayCodes').toString().split('\n');
  var codes = [];

  for (var i = 0; i < codesRaw.length; i++) {
      if (codesRaw[i].length > 0 && codesRaw[i] != code) {
          codes.push(codesRaw[i]);
      }
  }

  fs.writeFileSync('gamePlayCodes', codes.join('\n'));
}

function playCodes() {
  var codesRaw = fs.readFileSync('gamePlayCodes').toString().split('\n');
  var codes = [];

  for (var i = 0; i < codesRaw.length; i++) {
      if (codesRaw[i].length > 0) {
          codes.push(codesRaw[i]);
      }
  }

  return codes;
}

router.get("/", (req, res) => {
  var sessionId = req.query.session;
  var playCode = req.query.playCode;
  var data = JSON.parse(Buffer.from(req.query.data, "base64"));
  var token = Buffer.from(req.query.token, "base64").toString();
  var address = req.query.address;

  var tkd = VSSI.parseToken(token, {
    userIpAddress: req.headers["x-forwarded-for"] || req.socket.remoteAddress
  });

  if (tkd === undefined) {
    return res.status(400).json({
      error: true,
      message: "Invalid authorization token"
    });
  }

  if (
    tkd.address === address &&
    tkd.time > new Date().getTime() - 1000 * 60 * 60
  ) { } else {
    return res.status(400).json({
      error: true,
      message: "Invalid authorization token"
    });
  }

  var playCodeIsValid = false;

  if (playCodes().includes(playCode)) {
    playCodeIsValid = true;
  }

  if (!playCodeIsValid) {
    return res.json({
      error: true,
      message: "Invalid play code"
    });
  }

  var userid = tkd.userId;

  var sessions = Object.keys(GAMES_RUNNING);

  if (sessions.includes(sessionId)) {
    var session = GAMES_RUNNING[sessionId];
    var gameResponse = AVAILABLE_GAMES[session.gameId].play.action(
      USER_DATA[userid],
      data,
      session
    );
    if (gameResponse !== null) {
      if (!USER_DATA[userid].hasPlayed.includes(session.gameId)) {
        USER_DATA[userid].hasPlayed.push(session.gameId);
      }
      if (gameResponse.playCodeAction === "burn") {
        deactivatePlayCode(playCode);
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
