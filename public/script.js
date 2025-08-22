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

let winLine = null;

// criar 9 células (mantém quadradas via CSS aspect-ratio)
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
  clearWinLine();
}
createBoardCells();

// join com nome
joinBtn.addEventListener("click", () => {
  const name = nameInput.value.trim();
  if (!name) return alert("Digite seu nome");
  socket.emit("setName", name);
  document.getElementById("login").style.display = "none";
});

// reset
resetBtn.addEventListener("click", () => socket.emit("reset"));

// desenha linha sobre a combinação vencedora (combo = [a,b,c])
function drawWinLine(combo){
  clearWinLine();
  if (!combo || combo.length < 3) return;

  const cells = [...document.querySelectorAll(".cell")];
  if (!cells || cells.length < 9) return;

  const rect = boardDiv.getBoundingClientRect();
  const first = cells[combo[0]].getBoundingClientRect();
  const last = cells[combo[2]].getBoundingClientRect();

  // posição relativa ao boardDiv
  const x1 = first.left + first.width/2 - rect.left;
  const y1 = first.top + first.height/2 - rect.top;
  const x2 = last.left + last.width/2 - rect.left;
  const y2 = last.top + last.height/2 - rect.top;

  const length = Math.hypot(x2 - x1, y2 - y1);
  const angle = Math.atan2(y2 - y1, x2 - x1) * 180 / Math.PI;

  const line = document.createElement("div");
  line.className = "win-line";
  line.style.width = length + "px";
  line.style.transform = `translate(${x1}px, ${y1}px) rotate(${angle}deg)`;
  boardDiv.appendChild(line);
  winLine = line;
}

function clearWinLine(){
  if (winLine) {
    winLine.remove();
    winLine = null;
  }
}

// receber confirmação de jogador (ativo)
socket.on("player", (payload) => {
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
  const board = payload.board || Array(9).fill(null);
  document.querySelectorAll(".cell").forEach((c, i) => c.innerText = board[i] || "");

  if (payload.scores) scores = payload.scores;
  document.getElementById("scoreX").innerText = `X: ${scores.X} vitórias`;
  document.getElementById("scoreO").innerText = `O: ${scores.O} vitórias`;
  document.getElementById("scoreDraw").innerText = `Empates: ${scores.draw}`;

  if (payload.winner) {
    if (payload.winner === "draw") {
      status.innerText = "Empate!";
      clearWinLine();
    } else {
      status.innerText = `Jogador ${payload.winner.player} venceu!`;
      if (payload.winner.combo) {
        // esperar um pouquinho para garantir layout (mobile)
        setTimeout(() => drawWinLine(payload.winner.combo), 50);
      }
    }
  } else {
    status.innerText = `Vez do jogador ${payload.currentTurn || "?"}`;
    clearWinLine();
  }
});

// mensagens simples do servidor
socket.on("message", (m) => alert(m));

// debug: mostrar erro de conexão
socket.on("connect_error", (err) => {
  console.error("Erro de conexão socket:", err);
  status.innerText = "Erro na conexão (ver console).";
});
