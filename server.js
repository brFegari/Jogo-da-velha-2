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

const socket = io();
let player = null;
let scores = { X: 0, O: 0, draw: 0 };

const boardDiv = document.getElementById("board");
const status = document.getElementById("status");
const playersDiv = document.getElementById("players");
const resetBtn = document.getElementById("resetBtn");
const playerList = document.getElementById("playerList");

const loginDiv = document.getElementById("login");
const nameInput = document.getElementById("nameInput");
const joinBtn = document.getElementById("joinBtn");

joinBtn.onclick = () => {
  const name = nameInput.value.trim();
  if (name) {
    socket.emit("setName", name);
    loginDiv.style.display = "none";
  }
};

// Criar células do tabuleiro
for (let i = 0; i < 9; i++) {
  const cell = document.createElement("div");
  cell.classList.add("cell");
  cell.dataset.index = i;
  cell.onclick = () => socket.emit("move", i);
  boardDiv.appendChild(cell);
}

resetBtn.onclick = () => socket.emit("reset");

socket.on("player", ({ symbol, name }) => {
  player = symbol;
  playersDiv.innerText = `Você é ${name} (${symbol})`;
});

socket.on("spectator", ({ name }) => {
  playersDiv.innerText = `Você entrou como espectador (${name})`;
});

socket.on("updatePlayers", (players) => {
  playerList.innerHTML = "";
  Object.values(players).forEach(p => {
    const li = document.createElement("li");
    li.textContent = p.symbol ? `${p.name} (${p.symbol})` : `${p.name} (👀 espectador)`;
    playerList.appendChild(li);
  });
});

socket.on("update", ({ board, currentTurn, winner, scores: newScores }) => {
  document.querySelectorAll(".cell").forEach((c, i) => {
    c.innerText = board[i] || "";
  });

  if (newScores) scores = newScores;

  if (winner) {
    if (winner === "draw") {
      status.innerText = "Empate!";
    } else {
      status.innerText = `${winner.player} venceu!`;
    }
  } else {
    status.innerText = "Vez do jogador " + currentTurn;
  }

  document.getElementById("scoreX").innerText = `X: ${scores.X} vitórias`;
  document.getElementById("scoreO").innerText = `O: ${scores.O} vitórias`;
  document.getElementById("scoreDraw").innerText = `Empates: ${scores.draw}`;
});

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

