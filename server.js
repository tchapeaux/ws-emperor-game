const express = require("express");
app = express();
const http = require("http").Server(app);
const io = require("socket.io")(http);
require("dotenv").config();

const Lobby = require("./src/lobby.js");
const { getRandomUsername } = require("./src/helpers.js");

const lobbies = [];
const sockets = [];

if (process.env.DEBUG) {
  const DEBUG_LOBBY = require("./src/debug-lobby.js");
  lobbies.push(DEBUG_LOBBY);
}

function getLobbyOf(socket, mustExist = true) {
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

  if (mustExist && !room) {
    socket.emit("error", "Lobby does not exist");
  }

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
  sockets.push(socket);

  socket.on("create lobby", (lobbyName) => {
    if (!!lobbies.find((l) => l.name === lobbyName)) {
      return socket.emit("error", "Lobby already exists");
    }

    if (socket.rooms.length > 1) {
      return socket.emit("error", "Already in a lobby");
    }

    const lobby = new Lobby(lobbyName, socket.id);
    lobbies.push(lobby);

    if (lobby.addPlayer(socket.id, getRandomUsername())) {
      console.log(`${socket.id} created and joined ${lobbyName}`);

      socket.join(lobbyName);
      socket.emit("joined lobby", lobby);
      socket
        .in(lobbyName)
        .broadcast.emit("updated lobby", lobby.getRepresentation());
    }
  });

  socket.on("join lobby", (lobbyName) => {
    if (socket.rooms.length > 1) {
      return socket.emit("error", "Already in a lobby");
    }

    const lobby = lobbies.find((l) => l.name === lobbyName);
    if (!lobby) {
      return socket.emit("error", `Lobby ${lobbyName} does not exist`);
    }

    if (lobby.addPlayer(socket.id, getRandomUsername())) {
      console.log(`${socket.id} joined ${lobbyName}`);

      socket.join(lobbyName);
      socket.emit("joined lobby", lobby);
      io.in(lobbyName).emit("updated lobby", lobby.getRepresentation());
    }
  });

  socket.on("set nickname", (newNickname) => {
    const lobby = getLobbyOf(socket);
    if (lobby && lobby.setNickname(socket.id, newNickname)) {
      io.in(lobby.name).emit("updated lobby", lobby.getRepresentation());
    }
  });

  socket.on("launch game", () => {
    const lobby = getLobbyOf(socket);
    if (lobby && lobby.lockAndGo(socket.id)) {
      io.in(lobby.name).emit("updated lobby", lobby.getRepresentation());
    }
  });

  socket.on("choose mystery", (mysteryName) => {
    const lobby = getLobbyOf(socket);
    if (lobby && lobby.setMysteryName(socket.id, mysteryName)) {
      io.in(lobby.name).emit("updated lobby", lobby.getRepresentation());
    }
  });

  socket.on("blame", (mysteryName, blamedId) => {
    const lobby = getLobbyOf(socket);
    if (lobby && lobby.blame(socket.id, mysteryName, blamedId)) {
      io.in(lobby.name).emit("updated lobby", lobby.getRepresentation());
    }
  });

  socket.on("restart game", () => {
    const lobby = getLobbyOf(socket);
    if (lobby && lobby.restart(socket.id)) {
      io.in(lobby.name).emit("updated lobby", lobby.getRepresentation());
    }
  });

  socket.on("kick player", (kickedId) => {
    const lobby = getLobbyOf(socket);
    if (lobby && lobby.kick(socket.id, kickedId)) {
      kickedSocket = sockets.find((s) => s.id === kickedId);
      kickedSocket.leave(lobby.name);
      kickedSocket.emit("you were kicked");
      io.in(lobby.name).emit("updated lobby", lobby.getRepresentation());
    }
  });

  socket.on("disconnecting", () => {
    console.log(`${socket.id} disconnected`);

    const lobby = getLobbyOf(socket, (mustExist = false));
    if (lobby) {
      lobby.disconnectPlayer(socket.id);
      io.in(lobby.name).emit("updated lobby", lobby.getRepresentation());
    }
  });

  socket.on("reconnect", () => {
    console.log(`${socket.id} reconnected`);

    const lobby = getLobbyOf(socket, (mustExist = false));
    if (lobby) {
      lobby.reconnectPlayer(socket.id);
      io.in(lobby.name).emit("updated lobby", lobby.getRepresentation());
    }
  });
});

http.listen(3000, () => {
  console.log("listening on *:3000");
});
