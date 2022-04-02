import { GAMES_RUNNING } from "./data.js";

export const AVAILABLE_GAMES = {
  coinflip: {
    winF: double,
    play: {
      action: coinFlipPlay
    }
  },
  mines: {
    play: {
      action: minesPlay
    }
  },
  horserace: {
    play: {
      action: horseRacePlay
    }
  }
};

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

function randomIntFromInterval(min, max) {
  return Math.floor(Math.random() * (max - min + 1) + min);
}

function minesPlay(data, bet, session) {
  var position = bet.pos;
  var hasPlayed = data.hasPlayed.includes("mines");
  var sid = session.id.toString();

  session = GAMES_RUNNING[session.id];

  let BOMB_LOCATION_OVERRIDE = undefined;

  if (!Object.keys(session).includes("board")) {
    session.board = {
      ySize: 4,
      xSize: 6
    };
  }

  if (!Object.keys(session).includes("progression")) {
    session.progression = 0;
    if (!hasPlayed) {
      const checkFlip = weightdFlip(75);
      if (checkFlip) {
        BOMB_LOCATION_OVERRIDE = position + 1;
        if (BOMB_LOCATION_OVERRIDE > session.board.ySize - 1) {
          BOMB_LOCATION_OVERRIDE -= 2;
        }
        if (BOMB_LOCATION_OVERRIDE < 0) {
          BOMB_LOCATION_OVERRIDE = 0;
        }
      }
    }
  }

  let BOMB_LOCATION = 0;

  if (BOMB_LOCATION_OVERRIDE === undefined) {
    BOMB_LOCATION = randomIntFromInterval(0, session.board.ySize - 1);
  } else {
    BOMB_LOCATION = BOMB_LOCATION_OVERRIDE;
  }

  var response = {
    won: false,
    bombLocation: BOMB_LOCATION,
    playId: makeId()
  };

  if (position !== BOMB_LOCATION) {
    response.won = true;
  }

  if (response.won === false) {
    delete GAMES_RUNNING[sid];
  }

  return response;
}

function weightdFlip(chance = 50) {
  let result = Math.floor(Math.random() * 100) + chance;
  const remainder = result % 100;
  result = result - remainder;
  let r = result === 100 ? true : false;
  return r;
}

function coinFlipPlay(data, bet, session) {
  let side = bet.selected;
  var hasPlayed = data.hasPlayed.includes("coinflip");
  let r = weightdFlip(hasPlayed ? 45 : 75);
  var response = {
    won: false,
    landed: "",
    playId: makeId()
  };
  if (r) {
    response.won = true;
    response.landed = side;
  } else {
    if (side === "tails") response.landed = "heads";
    else if (side === "heads") response.landed = "tails";
  }
  return response;
}

function horseRacePlay(data, bet, session) {
  let hasPlayed = data.hasPlayed.includes("horserace");
  let pickedRacer = Math.floor(Math.random() * 8) + 1;
  let sid = session.id.toString();
  if (!hasPlayed) {
    const checkFlip = weightdFlip(75);
    if (checkFlip) {
      pickedRacer = bet.selected;
    }
  }
  var response = {
    won: false,
    winningHorse: pickedRacer,
    playId: makeId()
  };
  if (bet.selected === pickedRacer) {
    response.won = true;
  } else {
    delete GAMES_RUNNING[sid];
  }
  return response;
}

function double(num) {
  return num * 2;
}
