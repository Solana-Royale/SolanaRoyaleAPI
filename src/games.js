export const AVAILABLE_GAMES = {
  coinflip: {
    winF: double,
    play: {
      action: coinFlipPlay
    }
  }
};

function coinFlipPlay(data, bet) {
  let side = bet.selected;
  var hasPlayed = data.hasPlayed.includes("coinflip");
  let result = Math.floor(Math.random() * 100) + (hasPlayed ? 40 : 75);
  const remainder = result % 100;
  result = result - remainder;
  let r = result === 100 ? true : false;
  var response = {
    won: false,
    landed: ""
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

function double(num) {
  return num * 2;
}
