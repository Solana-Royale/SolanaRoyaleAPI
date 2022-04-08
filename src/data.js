import fs from "fs";

function updateUsersLocal() {
  if (!fs.existsSync("data/")) {
    fs.mkdirSync("data");
  }
  if (!fs.existsSync("data/u.json")) {
    fs.writeFileSync("data/u.json", JSON.stringify({}));
  }
  Users = JSON.parse(fs.readFileSync("data/u.json").toString());
}

export function init() {
  updateUsersLocal();
}

export function addUser(userObj) {
  updateUsersLocal();
  for (var i = 0; i < Object.keys(Users).length; i++) {
    var user = Users[Object.keys(Users)[i]];

    if (user.username === userObj.username) {
      return {
        success: false
      };
    }
  }
  if (!fs.existsSync("data/")) {
    fs.mkdirSync("data");
  }
  if (!fs.existsSync("data/u.json")) {
    fs.writeFileSync("data/u.json", JSON.stringify({}));
  }
  var users = JSON.parse(fs.readFileSync("data/u.json").toString());
  users[userObj.id] = userObj;
  fs.writeFileSync("data/u.json", JSON.stringify(users));
  updateUsersLocal();
  return {
    success: true
  };
}

export let Users = {};
export let GAMES_RUNNING = {};
export let USER_DATA = {};
export let adminNonce = '';

export function setAdminNonce(value) {
  adminNonce = value;
}

