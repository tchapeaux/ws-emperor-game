const express = require("express");
app = express();
const http = require("http").Server(app);
const io = require("socket.io")(http);

const DEBUG = false;

const lobbies = [];

function shuffleArray(a) {
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function getRandomInt(max) {
  return Math.floor(Math.random() * Math.floor(max));
}

class Lobby {
  constructor(name, hostId) {
    this.name = name;
    this.host = hostId;
    this.lastAccessDate = new Date();

    this.nicknames = {};
    this.mysteryNames = {};
    this.ownedBy = {};

    this.locked = false;
    this.phase1Locked = false;
    this.displayOrder = null;
    this.turnOfPlayer = null;
    this.lastAction = null;

    this.andTheWinnerIs = null;
  }

  addPlayer(socketId, nickname) {
    if (!this.locked && !Object.keys(this.nicknames).includes(socketId)) {
      this.nicknames[socketId] = nickname;
    }

    if (DEBUG) {
      // DEBUG !!!!!
      // set last player as host
      this.host = socketId;
    }
  }

  setNickname(socketId, newNickname) {
    if (!this.locked && Object.keys(this.nicknames).includes(socketId)) {
      this.nicknames[socketId] = newNickname;
    }
  }

  lockAndGo(socketId) {
    if (socketId === this.host) {
      this.locked = true;
    }
  }

  setMysteryName(socketId, mysteryName) {
    if (
      this.locked === true &&
      !Object.keys(this.mysteryNames).includes(socketId)
    ) {
      this.mysteryNames[socketId] = mysteryName;

      if (
        Object.keys(this.mysteryNames).length ===
        Object.keys(this.nicknames).length
      ) {
        this.prepareGuessingGame();
      }
    }
  }

  prepareGuessingGame() {
    const playerIds = Object.keys(this.nicknames);

    this.phase1Locked = true;
    this.displayOrder = shuffleArray(playerIds);
    this.turnOfPlayer = playerIds[getRandomInt(playerIds.length)];

    if (DEBUG) {
      this.turnOfPlayer = this.host;
    }
  }

  blame(blamerId, mysteryName, blamedId) {
    const playerIds = Object.keys(this.nicknames);
    const mysteryNames = Object.values(this.mysteryNames);

    // Some checks

    // blamer and blamed exist
    if (!playerIds.includes(blamerId) || !playerIds.includes(blamedId)) {
      return;
    }

    // mysteryName exists
    if (!mysteryNames.includes(mysteryName)) {
      return;
    }

    // it is the turn of the blamer
    if (this.turnOfPlayer !== blamerId) {
      return;
    }

    // blamer and blamed are not owned
    if (
      Object.keys(this.ownedBy).includes(blamerId) ||
      Object.keys(this.ownedBy).includes(blamedId)
    ) {
      return;
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
  }

  restart(socketId) {
    if (socketId !== this.host) {
      return;
    }

    this.mysteryNames = {};
    this.ownedBy = {};
    this.phase1Locked = false;
    this.displayOrder = null;
    this.turnOfPlayer = null;

    this.andTheWinnerIs = null;
  }
}

if (DEBUG) {
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

  lobbies.push(DEBUG_LOBBY);
}

function getLobbyOf(socket) {
  if (socket.rooms.size <= 1) {
    return undefined;
  }

  let roomName;
  for (const room of socket.rooms) {
    if (room === socket.id) {
      continue;
    }
    roomName = room;
  }

  const room = lobbies.find((l) => l.name === roomName);
  if (room) {
    room.lastAccessDate = new Date();
  }
  return room;
}

app.use(express.static("front"));

app.get("/", (req, res) => {
  res.emitFile("./front/index.html");
});

io.on("connection", (socket) => {
  console.log(`${socket.id} connected`);

  socket.on("create lobby", (lobbyName) => {
    if (!!lobbies.find((l) => l.name === lobbyName)) {
      return socket.emit("error", "Lobby already exists");
    }

    if (socket.rooms.length > 1) {
      return socket.emit("error", "Already in a lobby");
    }

    const lobby = new Lobby(lobbyName, socket.id);
    lobbies.push(lobby);

    socket.join(lobbyName);
    lobby.addPlayer(
      socket.id,
      `Anonymous #${Object.values(lobby.nicknames).length + 1}`
    );

    console.log(`${socket.id} created and joined ${lobbyName}`);
    socket.emit("joined lobby", lobby);
    socket.in(lobbyName).broadcast.emit("updated lobby", lobby);
  });

  socket.on("join lobby", (lobbyName) => {
    if (socket.rooms.length > 1) {
      return socket.emit("error", "Already in a lobby");
    }

    const lobby = lobbies.find((l) => l.name === lobbyName);
    if (!lobby) {
      return socket.emit("error", `Lobby ${lobbyName} does not exist`);
    }

    socket.join(lobbyName);
    lobby.addPlayer(
      socket.id,
      `Anonymous #${Object.values(lobby.nicknames).length + 1}`
    );

    console.log(`${socket.id} joined ${lobbyName}`);
    socket.emit("joined lobby", lobby);
    io.in(lobbyName).emit("updated lobby", lobby);
  });

  socket.on("set nickname", (newNickname) => {
    const lobby = getLobbyOf(socket);
    if (!lobby) {
      return socket.emit("error", "Lobby does not exist");
    }
    lobby.setNickname(socket.id, newNickname);
    io.in(lobby.name).emit("updated lobby", lobby);
  });

  socket.on("launch game", () => {
    const lobby = getLobbyOf(socket);
    if (!lobby) {
      return socket.emit("error", "Lobby does not exist");
    }
    lobby.lockAndGo(socket.id);
    io.in(lobby.name).emit("updated lobby", lobby);
  });

  socket.on("choose mystery", (mysteryName) => {
    const lobby = getLobbyOf(socket);
    if (!lobby) {
      return socket.emit("error", "Lobby does not exist");
    }
    lobby.setMysteryName(socket.id, mysteryName);
    io.in(lobby.name).emit("updated lobby", lobby);
  });

  socket.on("blame", (mysteryName, blamedId) => {
    const lobby = getLobbyOf(socket);
    if (!lobby) {
      return socket.emit("error", "Lobby does not exist");
    }
    lobby.blame(socket.id, mysteryName, blamedId);
    io.in(lobby.name).emit("updated lobby", lobby);
  });

  socket.on("restart game", () => {
    const lobby = getLobbyOf(socket);
    if (!lobby) {
      return socket.emit("error", "Lobby does not exist");
    }
    lobby.restart(socket.id);
    io.in(lobby.name).emit("updated lobby", lobby);
  });

  socket.on("disconnect", () => {
    console.log(`${socket.id} disconnected`);
  });
});

http.listen(3000, () => {
  console.log("listening on *:3000");
});
