import express from "express";
import { AVAILABLE_GAMES } from "./games.js";
import { info, error } from "./logger.js";

const app = express();

const SERVER_PORT = 8080;

var GAMES_RUNNING = {};

var USER_DATA = {};

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

app.get("/games/play", (req, res) => {
  var sessionId = req.query.session;
  //var token = req.query.token;

  var userid = "1234";

  var sessions = Object.keys(GAMES_RUNNING);

  if (sessions.includes(sessionId)) {
    var session = GAMES_RUNNING[sessionId];
    var gameResponse = AVAILABLE_GAMES[session.gameId].play.action(
      USER_DATA[userid]
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

app.get("/games/create", (req, res) => {
  const gid = req.query.gid;

  console.log(gid);
  //const token = req.query.token;

  var username = "test";
  var userid = "1234";

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

app.get("/", (req, res) => {
  res.send("Solana Royale API server running version 1.0.0");
});

app.get("/ping", (req, res) => {
  res.send("pong");
});

app.listen(SERVER_PORT, () => {
  info("Server started on port", SERVER_PORT);
  //console.log("Server started on port", SERVER_PORT);
});
