const express = require("express");
app = express();
const http = require("http").Server(app);
const io = require("socket.io")(http);

const lobbies = [];

class Lobby {
  constructor(name) {
    this.name = name;
    this.nicknames = {};
    this.mysteryName = {};
    this.ownedBy = {};

    this.locked = false;
  }

  addPlayer(socketId, nickname) {
    if (!this.locked) {
      this.nicknames[socketId] = nickname;
    }
  }
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

    const lobby = new Lobby(lobbyName);
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
      return socket.emit("error", "Lobby does not exist");
    }

    socket.join(lobbyName);
    lobby.addPlayer(
      socket.id,
      `Anonymous #${Object.values(lobby.nicknames).length + 1}`
    );

    console.log(`${socket.id} joined ${lobbyName}`);
    socket.emit("joined lobby", lobby);
    socket.in(lobbyName).broadcast.emit("updated lobby", lobby);
  });

  socket.on("set nickname", (newNickname) => {
    if (socket.rooms.length <= 1) {
      return socket.emit("error", "must be in a lobby to set nickname");
    }

    const lobbyName = socket.rooms[1];
    const lobby = lobbies.find((l) => l.name === lobbyName);

    lobby.nicknames[socket.id] = newNickname;

    socket.in(lobbyName).emit("updated lobby", lobby);
  });

  socket.on("disconnect", () => {
    console.log(`${socket.id} disconnected`);
  });
});

http.listen(3000, () => {
  console.log("listening on *:3000");
});
