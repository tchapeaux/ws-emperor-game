const Lobby = require("./lobby.js");

const DEBUG_LOBBY = new Lobby("debug", "debug-admin");

DEBUG_LOBBY.nicknames = {
  "debug-admin": "Bernard",
  "player-2": "Tiphanie",
  "player-3": "Benjamin",
  "player-4": "Mathilde",
};
DEBUG_LOBBY.mysteryNames = {
  "debug-admin": "Frodon",
  "player-2": "Sam",
  "player-3": "Boromir",
  "player-4": "Hermione Granger",
};
DEBUG_LOBBY.ownedBy = {};
DEBUG_LOBBY.locked = false;

module.exports = DEBUG_LOBBY;
