const express = require("express");
const http = require("http");
const { Server } = require("socket.io");

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static("public"));

let board = Array(9).fill(null);
let players = {}; // { socketId: { name, symbol } }
let currentTurn = "X";
let scores = { X: 0, O: 0, draw: 0 };

io.on("connection", (socket) => {
  console.log("Novo usuário conectado:", socket.id);

  socket.on("setName", (name) => {
    if (Object.values(players).filter(p => p.symbol).length < 2) {
      const used = Object.values(players).map(p => p.symbol);
      let symbol = !used.includes("X") ? "X" : "O";
      players[socket.id] = { name, symbol };
      socket.emit("player", { symbol, name });
    } else {
      players[socket.id] = { name, symbol: null };
      socket.emit("spectator", { name });
    }
    io.emit("updatePlayers", players);
    socket.emit("update", { board, currentTurn, scores });
  });

  socket.on("move", (index) => {
    if (players[socket.id] && players[socket.id].symbol === currentTurn && !board[index]) {
      board[index] = currentTurn;

      const combos = [
        [0,1,2],[3,4,5],[6,7,8],
        [0,3,6],[1,4,7],[2,5,8],
        [0,4,8],[2,4,6]
      ];

      let winner = null;
      for (let combo of combos) {
        const [a,b,c] = combo;
        if (board[a] && board[a] === board[b] && board[a] === board[c]) {
          winner = { player: board[a], combo };
          scores[winner.player]++;
          break;
        }
      }

      if (!winner && board.every(cell => cell)) {
        winner = "draw";
        scores.draw++;
      }

      if (winner) {
        io.emit("update", { board, currentTurn, winner, scores });
        setTimeout(() => {
          board = Array(9).fill(null);
          currentTurn = "X";
          io.emit("update", { board, currentTurn, scores });
        }, 2000);
      } else {
        currentTurn = currentTurn === "X" ? "O" : "X";
        io.emit("update", { board, currentTurn, scores });
      }
    }
  });

  socket.on("reset", () => {
    board = Array(9).fill(null);
    currentTurn = "X";
    scores = { X: 0, O: 0, draw: 0 };
    io.emit("update", { board, currentTurn, scores });
  });

  socket.on("disconnect", () => {
    delete players[socket.id];
    board = Array(9).fill(null);
    currentTurn = "X";
    io.emit("updatePlayers", players);
    io.emit("update", { board, currentTurn, scores });
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log("Servidor rodando na porta " + PORT);
});
