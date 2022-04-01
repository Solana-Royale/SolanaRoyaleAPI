import { Router } from "express";
import { AVAILABLE_GAMES } from "../games.js";

const router = Router();

const gameBoxes = {
  mines: `
  
  `,
  coinflip: `
    <style>
      #authedGame {
        display: none;
      }
    </style>
    <div id="authBox">
      <input id="un" placeholder="Username" type="text">
      <input id="pw" placeholder="Password" type="password">
      <button onclick="login()">Login</button><br>
      <span id="aEMsg"></span>
    </div>
    <div id="authedGame">
      <span>Side:</span>
      <div>
        <input type="radio" id="c1"
              name="side" value="heads" checked>
        <label for="c1">Heads</label>
        <input type="radio" id="c2"
              name="side" value="tails">
        <label for="c2">Tails</label>
      </div><br>
      <button onclick="flipCoin()">Flip Coin</button><br><br>
      <code id="flipState"></code>
    </div>

    <script>
      function login() {
        document.getElementById("aEMsg").innerText = "";

        var un = document.getElementById("un").value;
        var pw = document.getElementById("pw").value;

        fetch("/api/authorize?username=" + encodeURIComponent(un) + "&password=" + encodeURIComponent(pw))
        .then(r => r.json())
        .then(r => {
          if (r.error === true) {
            console.error("Failed to authorize user with error", r.message)
            document.getElementById("aEMsg").innerText = r.message;
            return;
          }
          document.cookie = "s.a=" + btoa(r.token);
          document.getElementById("authBox").style.display = "none";
          console.log("Authorized user", un);
          console.log("Generating coinflip game");
          fetch("/api/games/create?gid=coinflip&token=" + encodeURIComponent(r.token))
          .then(r => r.json())
          .then(game => {
            if (game.error === true) {
              console.error("Game session failed to generate with error", game.message);
              return;
            }
            console.log("Generated game session");
            localStorage.sessionId = game.sessionId;
            localStorage.sessionData = JSON.stringify(game.sessionData);
            document.getElementById("authedGame").style.display = "block";
          });
        });
      }

      function flipCoin() {
        var side = document.querySelector('input[name="side"]:checked').value;

        var data = {
          selected: side
        }

        data = encodeURIComponent(btoa(JSON.stringify(data)));

        fetch('/api/games/play?session=' + localStorage.sessionId + '&data=' + data + '&token=' + encodeURIComponent(atob(document.cookie.split('s.a=')[1].split(';')[0])))
        .then(r => r.json())
        .then(r => {
          document.getElementById("flipState").innerText = JSON.stringify(r);
        });
      }
    </script>
  `
};

router.get("/", (req, res) => {
  let gbox = "";
  let titleExtra = "Site";

  let gid = req.query.gid;

  if (gid === undefined || gid === "" || gid === null) {
    gbox = "<h1>Game not found</h1>";
  } else {
    let gameIds = Object.keys(AVAILABLE_GAMES);

    if (gameIds.includes(gid)) {
      gbox = gameBoxes[gid];
      titleExtra = gid;
    } else {
      gbox = "<h1>Game not found</h1>";
    }
  }

  res.status(200).send(`
    <!DOCTYPE html>
    <html>
      <head>
        <title>Solana Royale ${titleExtra} Test</title>
      </head>
      <body>
        ${gbox}
      </body>
    </html>
  `);
});

export default router;
