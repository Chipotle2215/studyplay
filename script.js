const searchInput = document.getElementById('gameSearch');
const filterButtons = document.querySelectorAll('.filter-button');
const gameCards = document.querySelectorAll('.game-card');
const gameCount = document.getElementById('gameCount');
const emptyState = document.getElementById('emptyState');
const gameDialog = document.getElementById('gameDialog');
const gameViewport = document.getElementById('gameViewport');
const canvas = document.getElementById('gameCanvas');
const context = canvas.getContext('2d');
const loadingMessage = document.getElementById('loadingMessage');
const fullscreenButton = document.getElementById('fullscreenButton');
const restartButton = document.getElementById('restartButton');
const closeGameButton = document.getElementById('closeGameButton');

let selectedCategory = 'all';
let activeKeys = new Set();
let animationFrame = 0;
let lastFrameTime = 0;
let loadingTimer = 0;

const game = {
  running: false,
  ended: false,
  won: false,
  score: 0,
  lives: 3,
  elapsed: 0,
  invulnerable: 0,
  player: { x: 120, y: 270, radius: 16, speed: 245 },
  stars: [],
  comets: [],
  scenery: Array.from({ length: 70 }, (_, index) => ({
    x: (index * 137 + 41) % canvas.width,
    y: (index * 83 + 27) % canvas.height,
    size: index % 8 === 0 ? 2 : 1,
    phase: index * 0.7,
  })),
};

function filterGames() {
  const query = searchInput.value.trim().toLowerCase();
  let visibleCount = 0;
  gameCards.forEach((card) => {
    const matchesText = card.dataset.title.includes(query) || card.textContent.toLowerCase().includes(query);
    const matchesCategory = selectedCategory === 'all' || card.dataset.category === selectedCategory;
    card.hidden = !(matchesText && matchesCategory);
    if (!card.hidden) visibleCount += 1;
  });
  gameCount.textContent = `${visibleCount} ${visibleCount === 1 ? 'game' : 'games'}`;
  emptyState.hidden = visibleCount > 0;
}

searchInput.addEventListener('input', filterGames);
filterButtons.forEach((button) => {
  button.addEventListener('click', () => {
    selectedCategory = button.dataset.category;
    filterButtons.forEach((item) => {
      const selected = item === button;
      item.classList.toggle('selected', selected);
      item.setAttribute('aria-pressed', String(selected));
    });
    filterGames();
  });
});

function makeLevel() {
  game.stars = Array.from({ length: 10 }, (_, index) => ({
    x: 130 + Math.random() * (canvas.width - 190),
    y: 50 + Math.random() * (canvas.height - 100),
    radius: 10,
    phase: index * 0.9,
  }));
  game.comets = Array.from({ length: 5 }, (_, index) => ({
    x: 210 + Math.random() * (canvas.width - 260),
    y: 45 + Math.random() * (canvas.height - 90),
    radius: 12 + Math.random() * 5,
    vx: (index % 2 ? -1 : 1) * (65 + Math.random() * 45),
    vy: (Math.random() - 0.5) * 90,
  }));
}

function resetGame() {
  game.running = true;
  game.ended = false;
  game.won = false;
  game.score = 0;
  game.lives = 3;
  game.elapsed = 0;
  game.invulnerable = 0;
  game.player.x = 120;
  game.player.y = canvas.height / 2;
  activeKeys.clear();
  makeLevel();
  loadingMessage.textContent = 'Collect 10 stars and avoid comets.';
  canvas.focus({ preventScroll: true });
}

function openGame() {
  if (!gameDialog.open) gameDialog.showModal();
  loadingMessage.textContent = 'Loading Star Orchard…';
  window.clearTimeout(loadingTimer);
  game.running = false;
  loadingTimer = window.setTimeout(() => {
    resetGame();
    lastFrameTime = 0;
    window.cancelAnimationFrame(animationFrame);
    animationFrame = window.requestAnimationFrame(frame);
  }, 350);
}

document.querySelector('[data-play-game="star-orchard"]').addEventListener('click', openGame);
restartButton.addEventListener('click', () => {
  window.clearTimeout(loadingTimer);
  resetGame();
  lastFrameTime = 0;
  window.cancelAnimationFrame(animationFrame);
  animationFrame = window.requestAnimationFrame(frame);
});
closeGameButton.addEventListener('click', () => gameDialog.close());
gameDialog.addEventListener('close', () => {
  game.running = false;
  activeKeys.clear();
  window.clearTimeout(loadingTimer);
  window.cancelAnimationFrame(animationFrame);
  if (document.fullscreenElement) document.exitFullscreen();
});

fullscreenButton.addEventListener('click', async () => {
  try {
    if (document.fullscreenElement) await document.exitFullscreen();
    else await gameViewport.requestFullscreen();
  } catch {
    loadingMessage.textContent = 'Fullscreen is unavailable in this browser.';
  }
});
document.addEventListener('fullscreenchange', () => {
  const isFullscreen = Boolean(document.fullscreenElement);
  fullscreenButton.textContent = isFullscreen ? '⤢' : '⛶';
  fullscreenButton.setAttribute('aria-label', isFullscreen ? 'Exit fullscreen' : 'Enter fullscreen');
  fullscreenButton.title = isFullscreen ? 'Exit fullscreen' : 'Fullscreen';
});

const keyMap = { ArrowUp: 'up', w: 'up', ArrowDown: 'down', s: 'down', ArrowLeft: 'left', a: 'left', ArrowRight: 'right', d: 'right' };
document.addEventListener('keydown', (event) => {
  const direction = keyMap[event.key] || keyMap[event.key.toLowerCase()];
  if (direction && gameDialog.open) {
    activeKeys.add(direction);
    event.preventDefault();
  }
});
document.addEventListener('keyup', (event) => {
  const direction = keyMap[event.key] || keyMap[event.key.toLowerCase()];
  if (direction) activeKeys.delete(direction);
});
window.addEventListener('blur', () => activeKeys.clear());
document.querySelectorAll('[data-direction]').forEach((button) => {
  const direction = button.dataset.direction;
  button.addEventListener('pointerdown', (event) => {
    event.preventDefault();
    button.setPointerCapture(event.pointerId);
    activeKeys.add(direction);
  });
  const release = () => activeKeys.delete(direction);
  button.addEventListener('pointerup', release);
  button.addEventListener('pointercancel', release);
  button.addEventListener('lostpointercapture', release);
});

function update(delta) {
  if (!game.running) return;
  game.elapsed += delta;
  game.invulnerable = Math.max(0, game.invulnerable - delta);
  let moveX = Number(activeKeys.has('right')) - Number(activeKeys.has('left'));
  let moveY = Number(activeKeys.has('down')) - Number(activeKeys.has('up'));
  const magnitude = Math.hypot(moveX, moveY) || 1;
  game.player.x = Math.max(game.player.radius, Math.min(canvas.width - game.player.radius, game.player.x + (moveX / magnitude) * game.player.speed * delta));
  game.player.y = Math.max(game.player.radius, Math.min(canvas.height - game.player.radius, game.player.y + (moveY / magnitude) * game.player.speed * delta));

  game.comets.forEach((comet) => {
    comet.x += comet.vx * delta;
    comet.y += comet.vy * delta;
    if (comet.x < comet.radius || comet.x > canvas.width - comet.radius) comet.vx *= -1;
    if (comet.y < comet.radius || comet.y > canvas.height - comet.radius) comet.vy *= -1;
    if (Math.hypot(game.player.x - comet.x, game.player.y - comet.y) < game.player.radius + comet.radius && game.invulnerable === 0) {
      game.lives -= 1;
      game.invulnerable = 1.2;
      game.player.x = 65;
      game.player.y = canvas.height / 2;
      if (game.lives <= 0) endGame(false);
    }
  });

  game.stars = game.stars.filter((star) => {
    if (Math.hypot(game.player.x - star.x, game.player.y - star.y) < game.player.radius + star.radius) {
      game.score += 1;
      if (game.score >= 10) endGame(true);
      return false;
    }
    return true;
  });
}

function endGame(won) {
  game.running = false;
  game.ended = true;
  game.won = won;
  loadingMessage.textContent = won ? 'Orchard complete! You gathered every star.' : 'The comets got you. Restart for another run.';
}

function drawStar(x, y, radius, rotation = 0) {
  context.save();
  context.translate(x, y);
  context.rotate(rotation);
  context.beginPath();
  for (let point = 0; point < 10; point += 1) {
    const angle = (Math.PI * point) / 5 - Math.PI / 2;
    const pointRadius = point % 2 === 0 ? radius : radius * 0.45;
    const px = Math.cos(angle) * pointRadius;
    const py = Math.sin(angle) * pointRadius;
    if (point === 0) context.moveTo(px, py);
    else context.lineTo(px, py);
  }
  context.closePath();
  context.fill();
  context.restore();
}

function draw() {
  const sky = context.createLinearGradient(0, 0, 0, canvas.height);
  sky.addColorStop(0, '#172e3c');
  sky.addColorStop(1, '#274d50');
  context.fillStyle = sky;
  context.fillRect(0, 0, canvas.width, canvas.height);
  game.scenery.forEach((speck) => {
    context.globalAlpha = 0.42 + Math.sin(game.elapsed * 2 + speck.phase) * 0.28;
    context.fillStyle = '#e5f1c8';
    context.fillRect(speck.x, speck.y, speck.size, speck.size);
  });
  context.globalAlpha = 1;
  context.fillStyle = 'rgba(177, 219, 180, 0.12)';
  context.fillRect(0, canvas.height - 38, canvas.width, 38);
  context.fillStyle = '#b7d985';
  game.stars.forEach((star) => {
    context.globalAlpha = 0.75 + Math.sin(game.elapsed * 4 + star.phase) * 0.25;
    drawStar(star.x, star.y, star.radius, game.elapsed + star.phase);
  });
  context.globalAlpha = 1;

  game.comets.forEach((comet) => {
    const trail = context.createLinearGradient(comet.x - comet.vx * 0.15, comet.y - comet.vy * 0.15, comet.x, comet.y);
    trail.addColorStop(0, 'rgba(232, 120, 94, 0)');
    trail.addColorStop(1, 'rgba(232, 120, 94, 0.65)');
    context.strokeStyle = trail;
    context.lineWidth = comet.radius * 1.3;
    context.beginPath();
    context.moveTo(comet.x - comet.vx * 0.15, comet.y - comet.vy * 0.15);
    context.lineTo(comet.x, comet.y);
    context.stroke();
    context.fillStyle = '#f18b67';
    context.beginPath();
    context.arc(comet.x, comet.y, comet.radius, 0, Math.PI * 2);
    context.fill();
  });
  drawRover();
  drawHud();
}

function drawRover() {
  const { x, y, radius } = game.player;
  context.save();
  context.translate(x, y);
  if (game.invulnerable > 0 && Math.floor(game.elapsed * 12) % 2 === 0) context.globalAlpha = 0.35;
  context.fillStyle = '#e8785e';
  context.strokeStyle = '#fff4d9';
  context.lineWidth = 3;
  context.beginPath();
  context.roundRect(-radius, -radius * 0.55, radius * 2, radius * 1.2, 8);
  context.fill();
  context.stroke();
  context.beginPath();
  context.arc(-radius * 0.55, radius * 0.68, 5, 0, Math.PI * 2);
  context.arc(radius * 0.55, radius * 0.68, 5, 0, Math.PI * 2);
  context.fillStyle = '#172e3c';
  context.fill();
  context.stroke();
  context.fillStyle = '#fff4d9';
  context.beginPath();
  context.arc(0, -radius * 0.45, 4, 0, Math.PI * 2);
  context.fill();
  context.restore();
}

function drawHud() {
  context.fillStyle = 'rgba(9, 25, 29, 0.62)';
  context.beginPath();
  context.roundRect(16, 16, 205, 48, 9);
  context.fill();
  context.fillStyle = '#fffefa';
  context.font = '700 17px Trebuchet MS, sans-serif';
  context.textAlign = 'left';
  context.fillText(`STARS  ${game.score}/10`, 30, 46);
  context.textAlign = 'right';
  context.fillStyle = '#f4c864';
  context.fillText(`LIVES  ${'♥'.repeat(Math.max(0, game.lives))}`, canvas.width - 25, 46);
  context.textAlign = 'left';
}

function frame(timestamp) {
  const delta = lastFrameTime ? Math.min((timestamp - lastFrameTime) / 1000, 0.05) : 0;
  lastFrameTime = timestamp;
  update(delta);
  draw();
  if (gameDialog.open) animationFrame = window.requestAnimationFrame(frame);
}

draw();
filterGames();
