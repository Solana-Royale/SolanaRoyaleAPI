import express from "express";
import { AVAILABLE_GAMES } from "./games.js";
import { info, error } from "./logger.js";
import VSSI from "./VSSI/index.js";
import { Users } from "./users.js";

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

app.get("/games/play", (req, res) => {
  var sessionId = req.query.session;
  var token = req.query.token;
  var data = JSON.parse(Buffer.from(req.query.data, "base64"));

  var tkd = VSSI.parseToken(token, {
    userIpAddress: req.headers["x-forwarded-for"] || req.socket.remoteAddress
  });

  if (Users[tkd.userId].password !== tkd.password) {
    res.status(400).json({
      error: true,
      message: "Invalid authorization token"
    });
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

app.get("/games/create", (req, res) => {
  const gid = req.query.gid;
  var token = req.query.token;

  var tkd = VSSI.parseToken(token, {
    userIpAddress: req.headers["x-forwarded-for"] || req.socket.remoteAddress
  });

  if (Users[tkd.userId].password !== tkd.password) {
    res.status(400).json({
      error: true,
      message: "Invalid authorization token"
    });
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

app.get("/authorize", (req, res) => {
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
