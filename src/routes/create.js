import { Router } from "express";
import VSSI from "../lib/VSSI/index.js";
import { Users, GAMES_RUNNING, USER_DATA, init, processedTxns } from "../data.js";
import { AVAILABLE_GAMES } from "../games.js";
import { info, error } from "../utils/logger.js";
import fetch from 'node-fetch';

const router = Router();

init();

router.get("/", (req, res) => {
  const gid = req.query.gid;
  var token = Buffer.from(req.query.token, "base64").toString();
  var address = req.query.address;
  var txid = req.query.txid;

  if (!Object.keys(processedTxns).includes(txid)) {
    return res.status(400).json({
      error: true,
      message: "Invalid transaction id"
    });
  }

  var tkd = VSSI.parseToken(token, {
    userIpAddress: req.headers["x-forwarded-for"] || req.socket.remoteAddress
  });

  var usedSyncToken = false;
  var syncTokenData = {}

  if (tkd === undefined) {
    var error = true;
    try {
      let syncTokens = fs.readFileSync("syncTokens").toString().split("\n");
      if (syncTokens.includes(token)) {
        error = false;
        usedSyncToken = true;
        syncTokenData.userId = syncTokens[syncTokens.indexOf(token)].split("|")[1];
        syncTokenData.username = syncTokens[syncTokens.indexOf(token)].split("|")[2];
        var newTokenCache = [];
        for (var i = 0; i < syncTokens.length; i++) {
          if (syncTokens[i] !== token) {
            newTokenCache.push(syncTokens[i]);
          }
        }
        fs.writeFileSync("syncTokens", newTokenCache.join("\n"));
      }
    } catch { }
    if (error) {
      return res.status(400).json({
        error: true,
        message: "Invalid authorization token"
      });
    }
  }

  if (!usedSyncToken) {
    if (
      tkd.address === address &&
      tkd.time > new Date().getTime() - 1000 * 60 * 60
    ) { } else {
      return res.status(400).json({
        error: true,
        message: "Invalid authorization token"
      });
    }
  }

  var userid = tkd.userId;
  var username = tkd.username;

  if (usedSyncToken) {
    userid = syncTokenData.userId;
    username = syncTokenData.username;
  }

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
        },
        betAmount: processedTxns[txid].amount,
        txid: txid,
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
      fetch('http://78.141.228.44/8CjF4IygzwEyG82QPsrK/sync', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          type: "session",
          data: JSON.stringify(GAMES_RUNNING[sessionId])
        })
      });
      delete processedTxns[txid];
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
