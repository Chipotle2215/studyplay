const canvas = document.getElementById('board');
const context = canvas.getContext('2d');
const frame = document.getElementById('boardFrame');
const pieceTray = document.getElementById('pieceTray');
const scoreValue = document.getElementById('scoreValue');
const statusLine = document.getElementById('statusLine');
const loadingMessage = document.getElementById('loadingMessage');
const fullscreenButton = document.getElementById('fullscreenButton');
const resetButton = document.getElementById('resetButton');

const boardSize = 9;
const cellSize = 60;
const boardOffset = 18;
const palette = ['#e8785e', '#d2a943', '#6fae91', '#7c9ac7'];
const shapeOptions = [
  [[0, 0], [1, 0], [0, 1]],
  [[0, 0], [1, 0], [2, 0]],
  [[0, 0], [1, 0], [1, 1], [2, 1]],
  [[0, 0], [1, 0], [2, 0], [1, 1]],
  [[0, 0], [0, 1], [1, 1], [2, 1]],
  [[0, 0], [1, 0], [0, 1], [1, 1]],
  [[0, 0], [1, 0], [2, 0], [3, 0]],
  [[0, 0], [1, 0], [2, 0], [1, 1], [1, 2]],
];

const state = {
  board: [],
  pieces: [],
  selected: 0,
  score: 0,
  cursor: { x: 0, y: 0 },
  pointer: null,
};

function newPiece() {
  const shape = shapeOptions[Math.floor(Math.random() * shapeOptions.length)];
  return {
    cells: shape.map(([x, y]) => [x, y]),
    color: Math.floor(Math.random() * palette.length),
    used: false,
  };
}

function newShapes() {
  state.pieces = Array.from({ length: 3 }, newPiece);
  state.selected = 0;
  renderPieces();
}

function resetRun() {
  state.board = Array.from({ length: boardSize }, () => Array(boardSize).fill(-1));
  state.score = 0;
  state.cursor = { x: 0, y: 0 };
  newShapes();
  updateScore();
  statusLine.textContent = 'Choose a shape, then tap a board square to place it.';
  drawBoard();
}

function updateScore() {
  scoreValue.textContent = state.score.toLocaleString();
}

function renderPieces() {
  pieceTray.replaceChildren();
  state.pieces.forEach((piece, index) => {
    const button = document.createElement('button');
    button.className = 'piece-button';
    button.type = 'button';
    button.disabled = piece.used;
    button.setAttribute('aria-pressed', String(index === state.selected));
    button.setAttribute('aria-label', `Choose shape ${index + 1}${piece.used ? ', placed' : ''}`);

    const preview = document.createElement('span');
    preview.className = 'shape-preview';
    preview.style.setProperty('--shape-color', palette[piece.color]);
    piece.cells.forEach(([x, y]) => {
      const square = document.createElement('i');
      square.style.gridColumn = String(x + 1);
      square.style.gridRow = String(y + 1);
      preview.append(square);
    });
    button.append(preview);
    button.addEventListener('click', () => {
      state.selected = index;
      renderPieces();
      drawBoard();
    });
    pieceTray.append(button);
  });
}

function fitsAt(piece, originX, originY) {
  return piece.cells.every(([offsetX, offsetY]) => {
    const x = originX + offsetX;
    const y = originY + offsetY;
    return x >= 0 && y >= 0 && x < boardSize && y < boardSize && state.board[y][x] === -1;
  });
}

function canPlaceAnyPiece() {
  return state.pieces.some((piece) => {
    if (piece.used) return false;
    for (let y = 0; y < boardSize; y += 1) {
      for (let x = 0; x < boardSize; x += 1) {
        if (fitsAt(piece, x, y)) return true;
      }
    }
    return false;
  });
}

function connectedTiles(startX, startY, color, visited) {
  const pending = [[startX, startY]];
  const group = [];
  while (pending.length) {
    const [x, y] = pending.pop();
    const key = `${x},${y}`;
    if (x < 0 || y < 0 || x >= boardSize || y >= boardSize || visited.has(key)) continue;
    if (state.board[y][x] !== color) continue;
    visited.add(key);
    group.push([x, y]);
    pending.push([x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1]);
  }
  return group;
}

function placeSelectedShape(column, row) {
  const piece = state.pieces[state.selected];
  if (!piece || piece.used) return;
  if (!fitsAt(piece, column, row)) {
    statusLine.textContent = 'That shape does not fit there. Try another open spot.';
    return;
  }

  piece.cells.forEach(([offsetX, offsetY]) => {
    state.board[row + offsetY][column + offsetX] = piece.color;
  });
  piece.used = true;
  state.score += piece.cells.length;

  const visited = new Set();
  const cleared = new Map();
  piece.cells.forEach(([offsetX, offsetY]) => {
    const group = connectedTiles(column + offsetX, row + offsetY, piece.color, visited);
    if (group.length >= 4) group.forEach(([x, y]) => cleared.set(`${x},${y}`, [x, y]));
  });
  cleared.forEach(([x, y]) => { state.board[y][x] = -1; });
  state.score += cleared.size * 2;
  updateScore();

  if (state.pieces.every((item) => item.used)) newShapes();
  if (!canPlaceAnyPiece()) {
    state.board = Array.from({ length: boardSize }, () => Array(boardSize).fill(-1));
    newShapes();
    statusLine.textContent = `Fresh garden! Your score of ${state.score.toLocaleString()} carries on.`;
  } else if (cleared.size) {
    statusLine.textContent = `Lovely match. ${cleared.size} connected tiles cleared.`;
  } else {
    statusLine.textContent = 'Shape placed. Look for four or more connected tiles of one color.';
  }
  drawBoard();
}

function drawBoard() {
  context.fillStyle = '#263b4a';
  context.fillRect(0, 0, canvas.width, canvas.height);
  context.fillStyle = 'rgba(255,255,255,0.045)';
  for (let x = 12; x < canvas.width; x += 30) {
    for (let y = 12; y < canvas.height; y += 30) context.fillRect(x, y, 1, 1);
  }

  for (let row = 0; row < boardSize; row += 1) {
    for (let column = 0; column < boardSize; column += 1) {
      const x = boardOffset + column * cellSize;
      const y = boardOffset + row * cellSize;
      const colorIndex = state.board[row][column];
      context.fillStyle = colorIndex < 0 ? '#344f5a' : palette[colorIndex];
      context.beginPath();
      context.roundRect(x + 2, y + 2, cellSize - 4, cellSize - 4, 6);
      context.fill();
      if (colorIndex >= 0) {
        context.fillStyle = 'rgba(255,255,255,0.22)';
        context.fillRect(x + 8, y + 7, cellSize - 22, 4);
      }
    }
  }

  const piece = state.pieces[state.selected];
  if (piece && !piece.used && state.pointer) {
    const fits = fitsAt(piece, state.pointer.x, state.pointer.y);
    context.globalAlpha = 0.45;
    context.fillStyle = fits ? palette[piece.color] : '#f08c76';
    piece.cells.forEach(([offsetX, offsetY]) => {
      const x = state.pointer.x + offsetX;
      const y = state.pointer.y + offsetY;
      if (x < 0 || y < 0 || x >= boardSize || y >= boardSize) return;
      context.beginPath();
      context.roundRect(boardOffset + x * cellSize + 4, boardOffset + y * cellSize + 4, cellSize - 8, cellSize - 8, 5);
      context.fill();
    });
    context.globalAlpha = 1;
  }

  context.strokeStyle = '#f4c864';
  context.lineWidth = 2;
  context.strokeRect(boardOffset + state.cursor.x * cellSize + 1, boardOffset + state.cursor.y * cellSize + 1, cellSize - 2, cellSize - 2);
}

function boardPositionFromPointer(event) {
  const bounds = canvas.getBoundingClientRect();
  const x = (event.clientX - bounds.left) * (canvas.width / bounds.width);
  const y = (event.clientY - bounds.top) * (canvas.height / bounds.height);
  return {
    x: Math.floor((x - boardOffset) / cellSize),
    y: Math.floor((y - boardOffset) / cellSize),
  };
}

canvas.addEventListener('pointermove', (event) => {
  state.pointer = boardPositionFromPointer(event);
  state.cursor = { ...state.pointer };
  drawBoard();
});
canvas.addEventListener('pointerleave', () => {
  state.pointer = null;
  drawBoard();
});
canvas.addEventListener('click', (event) => {
  const position = boardPositionFromPointer(event);
  state.cursor = position;
  placeSelectedShape(position.x, position.y);
});
canvas.addEventListener('keydown', (event) => {
  const directions = { ArrowUp: [0, -1], ArrowDown: [0, 1], ArrowLeft: [-1, 0], ArrowRight: [1, 0] };
  if (directions[event.key]) {
    event.preventDefault();
    state.cursor.x = Math.max(0, Math.min(boardSize - 1, state.cursor.x + directions[event.key][0]));
    state.cursor.y = Math.max(0, Math.min(boardSize - 1, state.cursor.y + directions[event.key][1]));
    drawBoard();
  } else if (event.key === 'Enter' || event.key === ' ') {
    event.preventDefault();
    placeSelectedShape(state.cursor.x, state.cursor.y);
  }
});

resetButton.addEventListener('click', resetRun);
fullscreenButton.addEventListener('click', async () => {
  try {
    if (document.fullscreenElement) await document.exitFullscreen();
    else await frame.requestFullscreen();
  } catch {
    statusLine.textContent = 'Fullscreen is unavailable in this browser.';
  }
});
document.addEventListener('fullscreenchange', () => {
  fullscreenButton.textContent = document.fullscreenElement ? '⤢ Exit fullscreen' : '⛶ Fullscreen';
  fullscreenButton.setAttribute('aria-label', document.fullscreenElement ? 'Exit fullscreen' : 'Enter fullscreen');
});

drawBoard();
resetRun();
window.setTimeout(() => {
  loadingMessage.hidden = true;
  statusLine.textContent = 'Choose a shape, then tap a board square to place it.';
}, 350);