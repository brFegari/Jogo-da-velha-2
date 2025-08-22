// server.js — servidor Node + Socket.IO (BACKEND)
// Cole este conteúdo inteiro no seu arquivo server.js (substitua o que houver lá).

const express = require("express");
const http = require("http");
const { Server } = require("socket.io");

const app = express();
const server = http.createServer(app);

// Serve arquivos estáticos da pasta "public"
app.use(express.static("public"));

// Inicializa Socket.IO ligado ao servidor HTTP
const io = new Server(server);

let board = Array(9).fill(null);
let players = {}; // { socketId: { name, symbol } }
let currentTurn = "X";
let scores = { X: 0, O: 0, draw: 0 };

io.on("connection", (socket) => {
  console.log("Novo usuário conectado:", socket.id);

  // Cliente envia nome para entrar (player ou espectador)
  socket.on("setName", (name) => {
    // número de players com símbolo não-nulo
    const activeCount = Object.values(players).filter(p => p.symbol).length;

    if (activeCount < 2) {
      const used = Object.values(players).map(p => p.symbol);
      const symbol = !used.includes("X") ? "X" : "O";
      players[socket.id] = { name, symbol };
      socket.emit("player", { symbol, name });
      console.log(`Atribuído ${symbol} a ${name}`);
    } else {
      players[socket.id] = { name, symbol: null };
      socket.emit("spectator", { name });
      console.log(`${name} entrou como espectador`);
    }

    io.emit("updatePlayers", players);
    socket.emit("update", { board, currentTurn, scores });
  });

  // Jogada
  socket.on("move", (index) => {
    if (!players[socket.id]) return; // quem não tem nome não joga
    const playerObj = players[socket.id];

    if (playerObj.symbol === currentTurn && !board[index]) {
      board[index] = currentTurn;

      const combos = [
        [0,1,2],[3,4,5],[6,7,8],
        [0,3,6],[1,4,7],[2,5,8],
        [0,4,8],[2,4,6]
      ];

      let winner = null;
      for (const combo of combos) {
        const [a,b,c] = combo;
        if (board[a] && board[a] === board[b] && board[a] === board[c]) {
          winner = { player: board[a], combo };
          scores[winner.player] = (scores[winner.player] || 0) + 1;
          break;
        }
      }

      if (!winner && board.every(cell => cell)) {
        winner = "draw";
        scores.draw = (scores.draw || 0) + 1;
      }

      if (winner) {
        io.emit("update", { board, currentTurn, winner, scores });
        // reinicia board após 1.8s (visual)
        setTimeout(() => {
          board = Array(9).fill(null);
          currentTurn = "X";
          io.emit("update", { board, currentTurn, scores });
        }, 1800);
      } else {
        currentTurn = currentTurn === "X" ? "O" : "X";
        io.emit("update", { board, currentTurn, scores });
      }
    }
  });

  // Reiniciar placar/tabuleiro (pode ser chamado por frontend)
  socket.on("reset", () => {
    board = Array(9).fill(null);
    currentTurn = "X";
    scores = { X: 0, O: 0, draw: 0 };
    io.emit("update", { board, currentTurn, scores });
  });

  socket.on("disconnect", () => {
    console.log("Usuário saiu:", socket.id);
    delete players[socket.id];
    // opcional: resetar board ao desconectar (mantive para evitar estados estranhos)
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
