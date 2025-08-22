// Conexão cliente
const socket = io();
let mySymbol = null;
let scores = { X: 0, O: 0, draw: 0 };

const boardDiv = document.getElementById("board");
const status = document.getElementById("status");
const playersTxt = document.getElementById("players");
const resetBtn = document.getElementById("resetBtn");
const playerList = document.getElementById("playerList");
const nameInput = document.getElementById("nameInput");
const joinBtn = document.getElementById("joinBtn");

// criar 9 células
function createBoardCells(){
  boardDiv.innerHTML = "";
  for(let i=0;i<9;i++){
    const cell = document.createElement("div");
    cell.className = "cell";
    cell.dataset.index = i;
    cell.addEventListener("click", () => {
      socket.emit("move", i);
    });
    boardDiv.appendChild(cell);
  }
}
createBoardCells();

// join com nome
joinBtn.addEventListener("click", () => {
  const name = nameInput.value.trim();
  if (!name) return alert("Digite seu nome");
  socket.emit("setName", name);
  // ocultar campo de login após entrar
  document.getElementById("login").style.display = "none";
});

// reset
resetBtn.addEventListener("click", () => socket.emit("reset"));

// receber confirmação de jogador (ativo)
socket.on("player", (payload) => {
  // payload pode ser { symbol, name } ou apenas symbol — nosso servidor envia {symbol, name}
  mySymbol = payload.symbol ?? payload;
  playersTxt.innerText = `Você é ${payload.name ? payload.name + " ("+mySymbol+")" : mySymbol}`;
});

// se for espectador
socket.on("spectator", ({ name }) => {
  playersTxt.innerText = `Você entrou como espectador (${name})`;
});

// lista de jogadores atualizada
socket.on("updatePlayers", (players) => {
  playerList.innerHTML = "";
  Object.values(players).forEach(p => {
    const li = document.createElement("li");
    li.textContent = p.symbol ? `${p.name} (${p.symbol})` : `${p.name} (👀 espectador)`;
    playerList.appendChild(li);
  });
});

// atualização do jogo
socket.on("update", (payload) => {
  // payload: { board, currentTurn, winner?, scores? }
  const board = payload.board || Array(9).fill(null);
  document.querySelectorAll(".cell").forEach((c, i) => c.innerText = board[i] || "");

  if (payload.scores) scores = payload.scores;
  document.getElementById("scoreX").innerText = `X: ${scores.X} vitórias`;
  document.getElementById("scoreO").innerText = `O: ${scores.O} vitórias`;
  document.getElementById("scoreDraw").innerText = `Empates: ${scores.draw}`;

  if (payload.winner) {
    if (payload.winner === "draw") {
      status.innerText = "Empate!";
    } else {
      status.innerText = `Jogador ${payload.winner.player} venceu!`;
    }
  } else {
    status.innerText = `Vez do jogador ${payload.currentTurn || "?"}`;
  }
});

// mensagens simples do servidor
socket.on("message", (m) => alert(m));

// debug: mostrar erro de conexão
socket.on("connect_error", (err) => {
  console.error("Erro de conexão socket:", err);
  status.innerText = "Erro na conexão (ver console).";
});
