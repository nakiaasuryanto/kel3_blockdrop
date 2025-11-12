const canvas = document.getElementById('tetris');
const ctx = canvas.getContext('2d');
const COLS = 10;
const ROWS = 15;
const BLOCK_SIZE = 30;
const WARNING_LINE = 4;
const SUPABASE_URL = 'https://pybbjqylvivunfadjegh.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB5YmJqcXlsdml2dW5mYWRqZWdoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjE2MjkwMTQsImV4cCI6MjA3NzIwNTAxNH0.5-Nbrt8eFTS7pt0XJvXudwoQdHp-LPyBP3-dooBjaiY';
let supabase = null;
let supabaseEnabled = false;
if (SUPABASE_URL !== 'YOUR_SUPABASE_URL_HERE' && SUPABASE_ANON_KEY !== 'YOUR_SUPABASE_ANON_KEY_HERE') {
    try {
        if (typeof window.supabase !== 'undefined') {
            const { createClient } = window.supabase;
            supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
            supabaseEnabled = true;
            console.log('✅ Supabase connected successfully!');
        } else {
            console.error('❌ Supabase library not loaded. Make sure you have internet connection.');
        }
    } catch (error) {
        console.error('❌ Error connecting to Supabase:', error);
    }
}
let playerName = '';
let bgMusic = null;
let clearSound = null;
let audioInitialized = false;
let isSoundMuted = false;
const grid = Array.from({ length: ROWS }, () => Array(COLS).fill(0));
const SHAPES = {
    I: [
        [0, 0, 0, 0],
        [1, 1, 1, 1],
        [0, 0, 0, 0],
        [0, 0, 0, 0]
    ],
    O: [
        [1, 1],
        [1, 1]
    ],
    T: [
        [0, 1, 0],
        [1, 1, 1],
        [0, 0, 0]
    ],
    S: [
        [0, 1, 1],
        [1, 1, 0],
        [0, 0, 0]
    ],
    Z: [
        [1, 1, 0],
        [0, 1, 1],
        [0, 0, 0]
    ],
    J: [
        [1, 0, 0],
        [1, 1, 1],
        [0, 0, 0]
    ],
    L: [
        [0, 0, 1],
        [1, 1, 1],
        [0, 0, 0]
    ]
};
const COLORS = {
    I: '#87CEEB',
    O: '#FFE4B5',
    T: '#DDA0DD',
    S: '#90EE90',
    Z: '#FFB6C1',
    J: '#ADD8E6',
    L: '#FFDAB9'
};
let currentPiece = {
    shape: null,
    color: null,
    x: 0,
    y: 0,
    matrix: null
};
let nextPiece = {
    shape: null,
    color: null,
    matrix: null
};
let score = 0;
let lines = 0;
let combo = 0;
let incredibleEffect = {
    active: false,
    alpha: 1.0,
    scale: 1.0
};
let gameStarted = false;
let gameLoop = null;
let gamePaused = false;
let gameOverTriggered = false;
let particles = [];
function getRandomPieceType() {
    const shapes = Object.keys(SHAPES);
    return shapes[Math.floor(Math.random() * shapes.length)];
}
class Particle {
    constructor(x, y, color) {
        this.x = x;
        this.y = y;
        this.color = color;
        this.vx = (Math.random() - 0.5) * 8;
        this.vy = (Math.random() - 0.5) * 8 - 2;
        this.size = Math.random() * 6 + 4;
        this.life = 1.0;
        this.decay = Math.random() * 0.02 + 0.01;
        this.gravity = 0.3;
    }
    update() {
        this.x += this.vx;
        this.y += this.vy;
        this.vy += this.gravity;
        this.life -= this.decay;
        this.vx *= 0.98;
    }
    draw() {
        ctx.save();
        ctx.globalAlpha = this.life;
        ctx.fillStyle = this.color;
        ctx.fillRect(this.x, this.y, this.size, this.size);
        ctx.restore();
    }
    isDead() {
        return this.life <= 0;
    }
}
function createBlockParticles(x, y, color) {
    const numParticles = 8;
    const centerX = x * BLOCK_SIZE + BLOCK_SIZE / 2;
    const centerY = y * BLOCK_SIZE + BLOCK_SIZE / 2;
    for (let i = 0; i < numParticles; i++) {
        particles.push(new Particle(centerX, centerY, color));
    }
}
function updateParticles() {
    particles.forEach(particle => particle.update());
    particles = particles.filter(particle => !particle.isDead());
}
function drawParticles() {
    particles.forEach(particle => particle.draw());
}
function generateNextPiece() {
    const type = getRandomPieceType();
    nextPiece = {
        shape: type,
        color: COLORS[type],
        matrix: JSON.parse(JSON.stringify(SHAPES[type]))
    };
}
function newPiece() {
    currentPiece = {
        shape: nextPiece.shape,
        color: nextPiece.color,
        x: Math.floor(COLS / 2) - 2,
        y: 0,
        matrix: JSON.parse(JSON.stringify(nextPiece.matrix))
    };
    generateNextPiece();
    drawNextPiece();
}
function drawBlock(x, y, color) {
    ctx.fillStyle = color;
    ctx.fillRect(x * BLOCK_SIZE, y * BLOCK_SIZE, BLOCK_SIZE, BLOCK_SIZE);
    ctx.strokeStyle = '#333';
    ctx.strokeRect(x * BLOCK_SIZE, y * BLOCK_SIZE, BLOCK_SIZE, BLOCK_SIZE);
}
function isWarningLineTriggered() {
    for (let row = 0; row <= WARNING_LINE; row++) {
        for (let col = 0; col < COLS; col++) {
            if (grid[row][col]) {
                return true;
            }
        }
    }
    return false;
}
function drawGrid() {
    ctx.strokeStyle = '#222';
    ctx.lineWidth = 1;
    for (let row = 0; row <= ROWS; row++) {
        ctx.beginPath();
        ctx.moveTo(0, row * BLOCK_SIZE);
        ctx.lineTo(COLS * BLOCK_SIZE, row * BLOCK_SIZE);
        ctx.stroke();
    }
    for (let col = 0; col <= COLS; col++) {
        ctx.beginPath();
        ctx.moveTo(col * BLOCK_SIZE, 0);
        ctx.lineTo(col * BLOCK_SIZE, ROWS * BLOCK_SIZE);
        ctx.stroke();
    }
    const warningTriggered = isWarningLineTriggered();
    if (warningTriggered) {
        ctx.strokeStyle = '#ff0000';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(0, (WARNING_LINE + 1) * BLOCK_SIZE);
        ctx.lineTo(COLS * BLOCK_SIZE, (WARNING_LINE + 1) * BLOCK_SIZE);
        ctx.stroke();
        ctx.shadowColor = '#ff0000';
        ctx.shadowBlur = 10;
        ctx.stroke();
        ctx.shadowBlur = 0;
    }
    for (let row = 0; row < ROWS; row++) {
        for (let col = 0; col < COLS; col++) {
            if (grid[row][col]) {
                drawBlock(col, row, grid[row][col]);
            }
        }
    }
}
function getGhostY() {
    let ghostY = currentPiece.y;
    while (!collision(0, ghostY - currentPiece.y + 1)) {
        ghostY++;
    }
    return ghostY;
}
function drawGhost() {
    const ghostY = getGhostY();
    currentPiece.matrix.forEach((row, y) => {
        row.forEach((value, x) => {
            if (value) {
                const posX = currentPiece.x + x;
                const posY = ghostY + y;
                ctx.strokeStyle = currentPiece.color;
                ctx.lineWidth = 2;
                ctx.strokeRect(
                    posX * BLOCK_SIZE + 2,
                    posY * BLOCK_SIZE + 2,
                    BLOCK_SIZE - 4,
                    BLOCK_SIZE - 4
                );
                ctx.fillStyle = currentPiece.color + '20';
                ctx.fillRect(
                    posX * BLOCK_SIZE + 2,
                    posY * BLOCK_SIZE + 2,
                    BLOCK_SIZE - 4,
                    BLOCK_SIZE - 4
                );
            }
        });
    });
}
function drawPiece() {
    currentPiece.matrix.forEach((row, y) => {
        row.forEach((value, x) => {
            if (value) {
                drawBlock(currentPiece.x + x, currentPiece.y + y, currentPiece.color);
            }
        });
    });
}
function collision(offsetX = 0, offsetY = 0, matrix = currentPiece.matrix) {
    for (let y = 0; y < matrix.length; y++) {
        for (let x = 0; x < matrix[y].length; x++) {
            if (matrix[y][x]) {
                const newX = currentPiece.x + x + offsetX;
                const newY = currentPiece.y + y + offsetY;
                if (newX < 0 || newX >= COLS || newY >= ROWS) {
                    return true;
                }
                if (newY >= 0 && grid[newY][newX]) {
                    return true;
                }
            }
        }
    }
    return false;
}
function merge() {
    currentPiece.matrix.forEach((row, y) => {
        row.forEach((value, x) => {
            if (value) {
                const gridY = currentPiece.y + y;
                const gridX = currentPiece.x + x;
                if (gridY >= 0) {
                    grid[gridY][gridX] = currentPiece.color;
                }
            }
        });
    });
}
function rotate(matrix) {
    const N = matrix.length;
    const result = Array.from({ length: N }, () => Array(N).fill(0));
    for (let y = 0; y < N; y++) {
        for (let x = 0; x < N; x++) {
            result[x][N - 1 - y] = matrix[y][x];
        }
    }
    return result;
}
function rotatePiece() {
    if (currentPiece.shape === 'O') return;
    const rotated = rotate(currentPiece.matrix);
    const originalX = currentPiece.x;
    const kicks = [0, 1, -1, 2, -2];
    for (let kick of kicks) {
        currentPiece.x = originalX + kick;
        if (!collision(0, 0, rotated)) {
            currentPiece.matrix = rotated;
            return;
        }
    }
    currentPiece.x = originalX;
}
function clearLines() {
    let linesCleared = 0;
    for (let row = ROWS - 1; row >= 0; row--) {
        if (grid[row].every(cell => cell !== 0)) {
            for (let col = 0; col < COLS; col++) {
                const color = grid[row][col];
                if (color) {
                    createBlockParticles(col, row, color);
                }
            }
            grid.splice(row, 1);
            grid.unshift(Array(COLS).fill(0));
            linesCleared++;
            row++;
        }
    }
    if (linesCleared > 0) {
        lines += linesCleared;
        const points = [0, 75, 225, 475, 800];
        let earnedPoints = points[linesCleared];
        combo++;
        if (combo > 1) {
            earnedPoints += (combo - 1) * 25;
        }
        if (combo >= 4) {
            triggerIncredibleEffect();
            earnedPoints += 150;
        }
        score += earnedPoints;
        updateScoreDisplay();
        playClearSound();
    } else {
        combo = 0;
    }
}
function triggerIncredibleEffect() {
    incredibleEffect.active = true;
    incredibleEffect.alpha = 1.0;
    incredibleEffect.scale = 0.5;
}
function updateIncredibleEffect() {
    if (incredibleEffect.active) {
        incredibleEffect.alpha -= 0.015;
        incredibleEffect.scale += 0.03;
        if (incredibleEffect.alpha <= 0) {
            incredibleEffect.active = false;
            incredibleEffect.alpha = 1.0;
            incredibleEffect.scale = 1.0;
        }
    }
}
function drawIncredibleEffect() {
    if (!incredibleEffect.active) return;
    ctx.save();
    ctx.globalAlpha = incredibleEffect.alpha;
    ctx.font = `bold ${40 * incredibleEffect.scale}px Arial`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    const gradient = ctx.createLinearGradient(0, canvas.height / 2 - 50, 0, canvas.height / 2 + 50);
    gradient.addColorStop(0, '#FFD700');
    gradient.addColorStop(0.5, '#FF6B6B');
    gradient.addColorStop(1, '#FFD700');
    ctx.fillStyle = gradient;
    ctx.shadowColor = '#FFD700';
    ctx.shadowBlur = 20;
    ctx.fillText('INCREDIBLE!', canvas.width / 2, canvas.height / 2);
    ctx.restore();
}
function updateScoreDisplay() {
    document.getElementById('score').textContent = score;
    document.getElementById('lines').textContent = lines;
}
function drawNextPiece() {
    const nextCanvas = document.getElementById('nextPiece');
    if (!nextCanvas) return;
    const nextCtx = nextCanvas.getContext('2d');
    const blockSize = 20;
    nextCtx.fillStyle = '#000';
    nextCtx.fillRect(0, 0, nextCanvas.width, nextCanvas.height);
    nextCtx.strokeStyle = '#222';
    nextCtx.lineWidth = 1;
    for (let i = 0; i <= 4; i++) {
        nextCtx.beginPath();
        nextCtx.moveTo(0, i * blockSize);
        nextCtx.lineTo(80, i * blockSize);
        nextCtx.stroke();
        nextCtx.beginPath();
        nextCtx.moveTo(i * blockSize, 0);
        nextCtx.lineTo(i * blockSize, 80);
        nextCtx.stroke();
    }
    const matrix = nextPiece.matrix;
    const matrixSize = matrix.length;
    const offsetX = (4 - matrixSize) / 2;
    const offsetY = (4 - matrixSize) / 2;
    matrix.forEach((row, y) => {
        row.forEach((value, x) => {
            if (value) {
                const drawX = (offsetX + x) * blockSize;
                const drawY = (offsetY + y) * blockSize;
                nextCtx.fillStyle = nextPiece.color;
                nextCtx.fillRect(drawX, drawY, blockSize, blockSize);
                nextCtx.strokeStyle = '#333';
                nextCtx.strokeRect(drawX, drawY, blockSize, blockSize);
            }
        });
    });
}
function move(dir) {
    currentPiece.x += dir;
    if (collision()) {
        currentPiece.x -= dir;
    }
}
function drop() {
    currentPiece.y++;
    if (collision()) {
        currentPiece.y--;
        score += 10;
        updateScoreDisplay();
        merge();
        clearLines();
        newPiece();
        if (collision()) {
            gameOver();
        }
    }
}
async function gameOver() {
    if (gameOverTriggered) {
        return;
    }
    gameOverTriggered = true;
    gameStarted = false;
    gamePaused = false;
    stopBgMusic();
    document.getElementById('finalScore').textContent = score;
    document.getElementById('finalLines').textContent = lines;
    document.getElementById('gameOverPopup').style.display = 'flex';
    const savingMessage = document.getElementById('savingMessage');
    if (supabaseEnabled && playerName) {
        savingMessage.textContent = 'Saving score...';
        savingMessage.style.display = 'block';
        const saved = await saveScoreToSupabase(playerName, score, lines);
        if (saved) {
            savingMessage.textContent = '✓ Score saved!';
            savingMessage.style.color = '#5cb85c';
        } else {
            savingMessage.textContent = '✗ Failed to save score';
            savingMessage.style.color = '#d9534f';
        }
        setTimeout(() => {
            savingMessage.style.display = 'none';
        }, 2000);
        await loadGameOverLeaderboard();
    } else {
        savingMessage.style.display = 'none';
        await loadGameOverLeaderboard();
    }
}
async function loadGameOverLeaderboard() {
    const list = document.getElementById('gameOverLeaderboardList');
    list.innerHTML = '<p class="loading-text">Loading leaderboard...</p>';
    const scores = await loadLeaderboard();
    if (scores.length === 0) {
        list.innerHTML = '<p class="loading-text">No scores yet. You are the first!</p>';
    } else {
        list.innerHTML = scores.map((item, index) => {
            const rank = index + 1;
            const topClass = rank === 1 ? 'top-1' : rank === 2 ? 'top-2' : rank === 3 ? 'top-3' : '';
            return `
                <div class="leaderboard-item ${topClass}">
                    <span class="leaderboard-rank">#${rank}</span>
                    <span class="leaderboard-name">${item.player_name}</span>
                    <div>
                        <span class="leaderboard-score">${item.score}</span>
                        <span class="leaderboard-lines">(${item.lines} lines)</span>
                    </div>
                </div>
            `;
        }).join('');
    }
}
function render() {
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    drawGrid();
    drawGhost();
    drawPiece();
    drawParticles();
    drawIncredibleEffect();
}
document.addEventListener('keydown', (e) => {
    if (!gameStarted) return;
    if (e.key === 'p' || e.key === 'P') {
        togglePause();
        return;
    }
    if (gamePaused) return;
    if (e.key === 'ArrowLeft') {
        move(-1);
    } else if (e.key === 'ArrowRight') {
        move(1);
    } else if (e.key === 'ArrowDown') {
        drop();
    } else if (e.key === 'ArrowUp' || e.key === ' ') {
        rotatePiece();
    }
    render();
});
let dropCounter = 0;
let dropInterval = 1000;
let lastTime = 0;
function update(time = 0) {
    const deltaTime = time - lastTime;
    lastTime = time;
    if (!gamePaused) {
        dropCounter += deltaTime;
        if (dropCounter > dropInterval) {
            drop();
            dropCounter = 0;
        }
        updateParticles();
        updateIncredibleEffect();
        render();
    }
    requestAnimationFrame(update);
}
function initAudio() {
    if (!audioInitialized) {
        bgMusic = document.getElementById('bgMusic');
        clearSound = document.getElementById('clearSound');
        if (bgMusic) {
            bgMusic.volume = 0.3;
        }
        if (clearSound) {
            clearSound.volume = 0.5;
        }
        audioInitialized = true;
    }
}
function playBgMusic() {
    initAudio();
    if (bgMusic) {
        bgMusic.play().catch(e => {
            console.log('Audio play prevented:', e);
        });
    }
}
function stopBgMusic() {
    if (bgMusic) {
        bgMusic.pause();
        bgMusic.currentTime = 0;
    }
}
function playClearSound() {
    if (clearSound) {
        clearSound.currentTime = 0;
        clearSound.play().catch(e => {
            console.log('Sound effect play prevented:', e);
        });
    }
}
function startGame() {
    const nameInput = document.getElementById('playerName');
    playerName = nameInput.value.trim();
    if (!playerName) {
        alert('Please enter your name first!');
        nameInput.focus();
        return;
    }
    document.getElementById('menuScreen').style.display = 'none';
    document.getElementById('gameScreen').style.display = 'block';
    grid.forEach(row => row.fill(0));
    score = 0;
    lines = 0;
    combo = 0;
    dropCounter = 0;
    particles = [];
    gameOverTriggered = false;
    incredibleEffect.active = false;
    gameStarted = true;
    playBgMusic();
    generateNextPiece();
    newPiece();
    updateScoreDisplay();
    update();
}
document.getElementById('startButton').addEventListener('click', startGame);
function showRules() {
    document.getElementById('rulesPopup').style.display = 'flex';
}
function closeRules() {
    document.getElementById('rulesPopup').style.display = 'none';
}
document.getElementById('rulesButton').addEventListener('click', showRules);
document.getElementById('closeRulesButton').addEventListener('click', closeRules);
document.getElementById('rulesPopup').addEventListener('click', function(e) {
    if (e.target.id === 'rulesPopup') {
        closeRules();
    }
});
function togglePause() {
    if (!gameStarted) return;
    gamePaused = !gamePaused;
    if (gamePaused) {
        document.getElementById('pausePopup').style.display = 'flex';
        if (bgMusic) bgMusic.pause();
    } else {
        document.getElementById('pausePopup').style.display = 'none';
        if (bgMusic) bgMusic.play();
    }
}
function resumeGame() {
    gamePaused = false;
    document.getElementById('pausePopup').style.display = 'none';
    if (bgMusic) bgMusic.play();
}
function goHome() {
    gameStarted = false;
    gamePaused = false;
    stopBgMusic();
    document.getElementById('gameScreen').style.display = 'none';
    document.getElementById('pausePopup').style.display = 'none';
    document.getElementById('menuScreen').style.display = 'flex';
    grid.forEach(row => row.fill(0));
    score = 0;
    lines = 0;
    combo = 0;
    dropCounter = 0;
    particles = [];
    gameOverTriggered = false;
    incredibleEffect.active = false;
    updateScoreDisplay();
}
function toggleSound() {
    const soundToggle = document.getElementById('soundToggle');
    isSoundMuted = !soundToggle.checked;
    if (isSoundMuted) {
        if (bgMusic) {
            bgMusic.muted = true;
        }
        if (clearSound) {
            clearSound.muted = true;
        }
    } else {
        if (bgMusic) {
            bgMusic.muted = false;
        }
        if (clearSound) {
            clearSound.muted = false;
        }
    }
}
document.getElementById('pauseButton').addEventListener('click', togglePause);
document.getElementById('resumeButton').addEventListener('click', resumeGame);
document.getElementById('homeButton').addEventListener('click', goHome);
document.getElementById('soundToggle').addEventListener('change', toggleSound);
document.getElementById('pausePopup').addEventListener('click', function(e) {
    if (e.target.id === 'pausePopup') {
        resumeGame();
    }
});
function playAgain() {
    document.getElementById('gameOverPopup').style.display = 'none';
    grid.forEach(row => row.fill(0));
    score = 0;
    lines = 0;
    combo = 0;
    dropCounter = 0;
    particles = [];
    gameOverTriggered = false;
    incredibleEffect.active = false;
    gameStarted = true;
    gamePaused = false;
    playBgMusic();
    generateNextPiece();
    newPiece();
    updateScoreDisplay();
}
function backToMenu() {
    document.getElementById('gameOverPopup').style.display = 'none';
    document.getElementById('gameScreen').style.display = 'none';
    document.getElementById('menuScreen').style.display = 'flex';
    grid.forEach(row => row.fill(0));
    score = 0;
    lines = 0;
    combo = 0;
    dropCounter = 0;
    particles = [];
    gameOverTriggered = false;
    incredibleEffect.active = false;
    updateScoreDisplay();
}
document.getElementById('playAgainButton').addEventListener('click', playAgain);
document.getElementById('backToMenuButton').addEventListener('click', backToMenu);
async function saveScoreToSupabase(playerName, score, lines) {
    if (!supabaseEnabled) {
        console.log('Supabase not configured');
        return;
    }
    try {
        const { error } = await supabase
            .from('scores')
            .insert([
                {
                    player_name: playerName,
                    score: score,
                    lines: lines
                }
            ]);
        if (error) throw error;
        console.log('Score saved successfully!');
        return true;
    } catch (error) {
        console.error('Error saving score:', error);
        return false;
    }
}
async function loadLeaderboard() {
    if (!supabaseEnabled) {
        return [];
    }
    try {
        const { data, error } = await supabase
            .from('scores')
            .select('*')
            .order('score', { ascending: false })
            .limit(10);
        if (error) throw error;
        return data || [];
    } catch (error) {
        console.error('Error loading leaderboard:', error);
        return [];
    }
}
async function showLeaderboard() {
    const popup = document.getElementById('leaderboardPopup');
    const list = document.getElementById('leaderboardList');
    popup.style.display = 'flex';
    list.innerHTML = '<p class="loading-text">Loading scores...</p>';
    const scores = await loadLeaderboard();
    if (scores.length === 0) {
        list.innerHTML = '<p class="loading-text">No scores yet. Be the first!</p>';
    } else {
        list.innerHTML = scores.map((item, index) => {
            const rank = index + 1;
            const topClass = rank === 1 ? 'top-1' : rank === 2 ? 'top-2' : rank === 3 ? 'top-3' : '';
            return `
                <div class="leaderboard-item ${topClass}">
                    <span class="leaderboard-rank">#${rank}</span>
                    <span class="leaderboard-name">${item.player_name}</span>
                    <div>
                        <span class="leaderboard-score">${item.score}</span>
                        <span class="leaderboard-lines">(${item.lines} lines)</span>
                    </div>
                </div>
            `;
        }).join('');
    }
}
function closeLeaderboard() {
    document.getElementById('leaderboardPopup').style.display = 'none';
}
document.getElementById('leaderboardButton').addEventListener('click', showLeaderboard);
document.getElementById('closeLeaderboardButton').addEventListener('click', closeLeaderboard);
document.getElementById('leaderboardPopup').addEventListener('click', function(e) {
    if (e.target.id === 'leaderboardPopup') {
        closeLeaderboard();
    }
});
