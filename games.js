export const AVAILABLE_GAMES = {
  coinflip: {
    winF: double,
    play: {
      action: coinFlipPlay
    }
  }
};

function coinFlipPlay(data) {
  var hasPlayed = data.hasPlayed.includes("coinflip");
  let result = Math.floor(Math.random() * 100) + (hasPlayed ? 40 : 75);
  const remainder = result % 100;
  result = result - remainder;
  return result === 100 ? true : false;
}

function double(num) {
  return num * 2;
}
