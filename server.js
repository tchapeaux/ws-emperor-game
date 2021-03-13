const express = require("express");
app = express();
const http = require("http").Server(app);
const io = require("socket.io")(http);
require("dotenv").config();

const Lobby = require("./lobby.js");

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

if (process.env.DEBUG) {
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

  if (!room) {
    socket.emit("error", "Lobby does not exist");
  } else {
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
    if (lobby) {
      lobby.setNickname(socket.id, newNickname);
      io.in(lobby.name).emit("updated lobby", lobby);
    }
  });

  socket.on("launch game", () => {
    const lobby = getLobbyOf(socket);
    if (lobby) {
      lobby.lockAndGo(socket.id);
      io.in(lobby.name).emit("updated lobby", lobby);
    }
  });

  socket.on("choose mystery", (mysteryName) => {
    const lobby = getLobbyOf(socket);
    if (lobby) {
      lobby.setMysteryName(socket.id, mysteryName);
      io.in(lobby.name).emit("updated lobby", lobby);
    }
  });

  socket.on("blame", (mysteryName, blamedId) => {
    const lobby = getLobbyOf(socket);
    if (lobby) {
      lobby.blame(socket.id, mysteryName, blamedId);
      io.in(lobby.name).emit("updated lobby", lobby);
    }
  });

  socket.on("restart game", () => {
    const lobby = getLobbyOf(socket);
    if (lobby) {
      lobby.restart(socket.id);
      io.in(lobby.name).emit("updated lobby", lobby);
    }
  });

  socket.on("disconnect", () => {
    console.log(`${socket.id} disconnected`);
  });
});

http.listen(3000, () => {
  console.log("listening on *:3000");
});
