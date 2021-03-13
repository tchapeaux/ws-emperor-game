const { shuffleArray, getRandomInt } = require("./helpers.js");

module.exports = class Lobby {
  constructor(name, hostId) {
    this.name = name;
    this.host = hostId;
    this.lastAccessDate = new Date();

    this.nicknames = {};
    this.mysteryNames = {};
    this.ownedBy = {};
    this.disconnected = [];

    this.locked = false;
    this.phase1Locked = false;
    this.displayOrder = null;
    this.turnOfPlayer = null;
    this.lastAction = null;

    this.andTheWinnerIs = null;
  }

  addPlayer(socketId, nickname) {
    if (this.locked || Object.keys(this.nicknames).includes(socketId)) {
      return false;
    }

    this.nicknames[socketId] = nickname;

    if (process.env.DEBUG) {
      // set last player as host
      this.host = socketId;
    }

    return true;
  }

  setNickname(socketId, newNickname) {
    if (this.locked || !Object.keys(this.nicknames).includes(socketId)) {
      return false;
    }
    this.nicknames[socketId] = newNickname;
    return true;
  }

  lockAndGo(socketId) {
    if (socketId !== this.host) {
      return false;
    }

    this.locked = true;
    return true;
  }

  setMysteryName(socketId, mysteryName) {
    if (
      this.locked === false ||
      Object.keys(this.mysteryNames).includes(socketId)
    ) {
      return false;
    }
    this.mysteryNames[socketId] = mysteryName;

    if (
      Object.keys(this.mysteryNames).length ===
      Object.keys(this.nicknames).length
    ) {
      this.prepareGuessingGame();
    }

    return true;
  }

  prepareGuessingGame() {
    const playerIds = Object.keys(this.nicknames);

    this.phase1Locked = true;
    this.displayOrder = shuffleArray(playerIds);
    this.turnOfPlayer = playerIds[getRandomInt(playerIds.length)];

    if (process.env.DEBUG) {
      this.turnOfPlayer = this.host;
    }
  }

  blame(blamerId, mysteryName, blamedId) {
    const playerIds = Object.keys(this.nicknames);
    const mysteryNames = Object.values(this.mysteryNames);

    // Some checks

    // blamer and blamed exist
    if (!playerIds.includes(blamerId) || !playerIds.includes(blamedId)) {
      return false;
    }

    // mysteryName exists
    if (!mysteryNames.includes(mysteryName)) {
      return false;
    }

    // it is the turn of the blamer
    if (this.turnOfPlayer !== blamerId) {
      return false;
    }

    // blamer and blamed are not owned
    if (
      Object.keys(this.ownedBy).includes(blamerId) ||
      Object.keys(this.ownedBy).includes(blamedId)
    ) {
      return false;
    }

    // Finally, let's do the blaming
    const isBlamingCorrect = this.mysteryNames[blamedId] === mysteryName;
    if (isBlamingCorrect) {
      this.lastAction = `✅ ${this.nicknames[blamerId]} guessed ${mysteryName} was written by ${this.nicknames[blamedId]}`;
      this.ownedBy[blamedId] = blamerId;
    } else {
      // No owning, but change turn of player
      this.lastAction = `❌ ${this.nicknames[blamerId]} guessed ${mysteryName} was written by ${this.nicknames[blamedId]}`;
      this.turnOfPlayer = blamedId;
    }

    // WIN condition
    if (
      Object.keys(this.ownedBy).length ===
      Object.keys(this.nicknames).length - 1
    ) {
      this.turnOfPlayer = null;
      this.andTheWinnerIs = blamerId;
    }

    return true;
  }

  restart(socketId) {
    if (socketId !== this.host) {
      return false;
    }

    this.mysteryNames = {};
    this.ownedBy = {};
    this.phase1Locked = false;
    this.displayOrder = null;
    this.turnOfPlayer = null;
    this.lastAction = null;

    this.andTheWinnerIs = null;
    return true;
  }

  // Host can kick player
  // return true if the player was kicked successfully
  kick(kickerId, kickedId) {
    // Sanity checks
    if (
      kickerId === kickedId ||
      kickerId !== this.host ||
      !Object.keys(this.nicknames).includes(kickedId)
    ) {
      return false;
    }

    // Internal state check
    if (this.locked) {
      return false;
    }

    delete this.nicknames[kickedId];
    return true;
  }

  disconnectPlayer(disconnectedId) {
    if (Object.keys(this.nicknames).includes(disconnectedId)) {
      this.disconnected.push(disconnectedId);
    }

    if (disconnectedId === this.host) {
      const stillConnectedIds = Object.keys(this.nicknames).filter(
        (id) => !this.disconnected.includes(id)
      );
      if (stillConnectedIds.length > 0) {
        this.host = stillConnectedIds[getRandomInt(stillConnectedIds.length)];
      }
    }
  }

  reconnectPlayer(reconnectedId) {
    if (this.disconnected.includes(reconnectedId)) {
      this.disconnected = this.disconnected.filter(
        (id) => id !== reconnectedId
      );
    }
  }
};
