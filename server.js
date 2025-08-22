const express = require("express");
const http = require("http");
const { Server } = require("socket.io");

const app = express();
const server = http.createServer(app);
const io = new Server(server);
app.use(express.static("public"));


let player = null;
let scores = { X: 0, O: 0, draw: 0 };

//AQUI
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

// Criar células
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

//ATÉ AQUI
app.use(express.static("public"));

let board = Array(9).fill(null);
let players = {}; // { socketId: "X" | "O" }
let currentTurn = "X";

io.on("connection", (socket) => {
  console.log("Novo jogador conectado:", socket.id);

  if (Object.keys(players).length < 2) {
    // Verifica quais símbolos já foram usados
    const usedSymbols = Object.values(players);
    let assignedSymbol = "X";

    if (usedSymbols.includes("X") && !usedSymbols.includes("O")) {
      assignedSymbol = "O";
    } else if (usedSymbols.includes("O") && !usedSymbols.includes("X")) {
      assignedSymbol = "X";
    } else if (usedSymbols.includes("X") && usedSymbols.includes("O")) {
      socket.emit("message", "Sala cheia! Apenas 2 jogadores por vez.");
      socket.disconnect();
      return;
    }

    players[socket.id] = assignedSymbol;
    socket.emit("player", players[socket.id]);
  } else {
    socket.emit("message", "Sala cheia! Apenas 2 jogadores por vez.");
    socket.disconnect();
  }

  socket.on("move", (index) => {
    if (players[socket.id] === currentTurn && !board[index]) {
      board[index] = currentTurn;

      // Combinações vencedoras
      const combos = [
        [0,1,2],[3,4,5],[6,7,8], // linhas
        [0,3,6],[1,4,7],[2,5,8], // colunas
        [0,4,8],[2,4,6]          // diagonais
      ];

      let winner = null;
      for (let combo of combos) {
        const [a,b,c] = combo;
        if (board[a] && board[a] === board[b] && board[a] === board[c]) {
          winner = { player: board[a], combo };
          break;
        }
      }

      if (!winner && board.every(cell => cell)) {
        winner = "draw";
      }

      if (winner) {
        io.emit("update", { board, currentTurn, winner });
        // Reinicia depois de 2s
        setTimeout(() => {
          board = Array(9).fill(null);
          currentTurn = "X";
          io.emit("update", { board, currentTurn });
        }, 2000);
      } else {
        currentTurn = currentTurn === "X" ? "O" : "X";
        io.emit("update", { board, currentTurn });
      }
    }
  });

  socket.on("disconnect", () => {
    console.log("Jogador saiu:", socket.id);
    delete players[socket.id];
    board = Array(9).fill(null);
    currentTurn = "X";
    io.emit("update", { board, currentTurn });
  });

  socket.on("reset", () => {
    board = Array(9).fill(null);
    currentTurn = "X";
    io.emit("update", { board, currentTurn });
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log("Servidor rodando na porta " + PORT);

});
