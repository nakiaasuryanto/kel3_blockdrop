// Ambil elemen canvas dan konteks 2D untuk menggambar
const canvas = document.getElementById('tetris');
const ctx = canvas.getContext('2d');

// Konstanta ukuran grid permainan
const COLS = 10;  // Jumlah kolom (lebar)
const ROWS = 20;  // Jumlah baris (tinggi)
const BLOCK_SIZE = 30;  // Ukuran setiap blok dalam pixel
const WARNING_LINE = 4;  // Baris peringatan (4 dari atas)

// ===== SUPABASE SETUP =====
// PENTING: Ganti dengan kredensial Supabase Anda!
// 1. Buat project di https://supabase.com
// 2. Buat tabel 'scores' dengan kolom:
//    - id (int8, primary key, auto-increment)
//    - player_name (text)
//    - score (int4)
//    - lines (int4)
//    - created_at (timestamp, default: now())
// 3. Aktifkan Row Level Security dan buat policy untuk INSERT dan SELECT public
// 4. Ganti SUPABASE_URL dan SUPABASE_ANON_KEY di bawah

const SUPABASE_URL = 'https://pybbjqylvivunfadjegh.supabase.co';  // Your Project URL
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB5YmJqcXlsdml2dW5mYWRqZWdoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjE2MjkwMTQsImV4cCI6MjA3NzIwNTAxNH0.5-Nbrt8eFTS7pt0XJvXudwoQdHp-LPyBP3-dooBjaiY';  // Your Anon Key

let supabase = null;
let supabaseEnabled = false;

// Inisialisasi Supabase jika kredensial sudah diisi
if (SUPABASE_URL !== 'YOUR_SUPABASE_URL_HERE' && SUPABASE_ANON_KEY !== 'YOUR_SUPABASE_ANON_KEY_HERE') {
    try {
        // Wait for Supabase library to load
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

// Variabel untuk menyimpan nama pemain
let playerName = '';

// Audio elements
let bgMusic = null;
let clearSound = null;
let audioInitialized = false;

// Inisialisasi grid permainan sebagai array 2D yang diisi dengan 0
// 0 = kosong, nilai lain = warna blok yang sudah ditempatkan
const grid = Array.from({ length: ROWS }, () => Array(COLS).fill(0));

// Bentuk-bentuk Tetromino (semua 7 jenis piece)
// 1 = ada blok, 0 = kosong
const SHAPES = {
    I: [  // Bentuk garis lurus
        [0, 0, 0, 0],
        [1, 1, 1, 1],
        [0, 0, 0, 0],
        [0, 0, 0, 0]
    ],
    O: [  // Bentuk kotak
        [1, 1],
        [1, 1]
    ],
    T: [  // Bentuk T
        [0, 1, 0],
        [1, 1, 1],
        [0, 0, 0]
    ],
    S: [  // Bentuk S
        [0, 1, 1],
        [1, 1, 0],
        [0, 0, 0]
    ],
    Z: [  // Bentuk Z
        [1, 1, 0],
        [0, 1, 1],
        [0, 0, 0]
    ],
    J: [  // Bentuk J
        [1, 0, 0],
        [1, 1, 1],
        [0, 0, 0]
    ],
    L: [  // Bentuk L
        [0, 0, 1],
        [1, 1, 1],
        [0, 0, 0]
    ]
};

// Warna untuk setiap jenis Tetromino (Warna Pastel)
const COLORS = {
    I: '#87CEEB',  // Sky Blue (pastel)
    O: '#FFE4B5',  // Moccasin (pastel kuning)
    T: '#DDA0DD',  // Plum (pastel ungu)
    S: '#90EE90',  // Light Green (pastel hijau)
    Z: '#FFB6C1',  // Light Pink (pastel merah)
    J: '#ADD8E6',  // Light Blue (pastel biru)
    L: '#FFDAB9'   // Peach Puff (pastel oranye)
};

// Piece yang sedang aktif/jatuh
let currentPiece = {
    shape: null,    // Jenis piece (I, O, T, dll)
    color: null,    // Warna piece
    x: 0,           // Posisi horizontal
    y: 0,           // Posisi vertikal
    matrix: null    // Matriks bentuk piece
};

// Piece yang akan muncul berikutnya
let nextPiece = {
    shape: null,
    color: null,
    matrix: null
};

// Variabel untuk melacak skor dan jumlah baris
let score = 0;
let lines = 0;

// Variabel untuk status game
let gameStarted = false;
let gameLoop = null;
let gamePaused = false;  // Status pause game
let gameOverTriggered = false;  // Flag untuk mencegah multiple game over

// Array untuk menyimpan partikel efek
let particles = [];

/**
 * Menghasilkan jenis piece secara acak
 * @returns {string} Kunci dari SHAPES (I, O, T, S, Z, J, atau L)
 */
function getRandomPieceType() {
    const shapes = Object.keys(SHAPES);
    return shapes[Math.floor(Math.random() * shapes.length)];
}

/**
 * Class untuk partikel efek pecahan
 */
class Particle {
    constructor(x, y, color) {
        this.x = x;
        this.y = y;
        this.color = color;
        // Kecepatan acak untuk arah horizontal dan vertikal
        this.vx = (Math.random() - 0.5) * 8;  // -4 sampai 4
        this.vy = (Math.random() - 0.5) * 8 - 2;  // Lebih banyak ke atas
        this.size = Math.random() * 6 + 4;  // Ukuran 4-10 pixel
        this.life = 1.0;  // Umur partikel (1.0 = baru, 0 = mati)
        this.decay = Math.random() * 0.02 + 0.01;  // Kecepatan fade out
        this.gravity = 0.3;  // Gravitasi untuk efek jatuh
    }

    /**
     * Update posisi dan status partikel
     */
    update() {
        this.x += this.vx;
        this.y += this.vy;
        this.vy += this.gravity;  // Tambahkan gravitasi
        this.life -= this.decay;  // Kurangi umur
        this.vx *= 0.98;  // Friction horizontal
    }

    /**
     * Gambar partikel
     */
    draw() {
        ctx.save();
        ctx.globalAlpha = this.life;  // Transparansi berdasarkan umur
        ctx.fillStyle = this.color;
        ctx.fillRect(this.x, this.y, this.size, this.size);
        ctx.restore();
    }

    /**
     * Cek apakah partikel masih hidup
     * @returns {boolean}
     */
    isDead() {
        return this.life <= 0;
    }
}

/**
 * Buat partikel untuk satu blok yang dihancurkan
 * @param {number} x - Posisi X blok (dalam grid)
 * @param {number} y - Posisi Y blok (dalam grid)
 * @param {string} color - Warna blok
 */
function createBlockParticles(x, y, color) {
    const numParticles = 8;  // Jumlah partikel per blok
    const centerX = x * BLOCK_SIZE + BLOCK_SIZE / 2;
    const centerY = y * BLOCK_SIZE + BLOCK_SIZE / 2;

    for (let i = 0; i < numParticles; i++) {
        particles.push(new Particle(centerX, centerY, color));
    }
}

/**
 * Update dan gambar semua partikel
 */
function updateParticles() {
    // Update semua partikel
    particles.forEach(particle => particle.update());

    // Hapus partikel yang sudah mati
    particles = particles.filter(particle => !particle.isDead());
}

/**
 * Gambar semua partikel
 */
function drawParticles() {
    particles.forEach(particle => particle.draw());
}

/**
 * Generate piece berikutnya secara acak
 * Piece ini akan ditampilkan di panel "Next"
 */
function generateNextPiece() {
    const type = getRandomPieceType();
    nextPiece = {
        shape: type,
        color: COLORS[type],
        matrix: JSON.parse(JSON.stringify(SHAPES[type]))  // Deep copy untuk menghindari referensi
    };
}

/**
 * Inisialisasi piece baru dari next piece
 * Memindahkan next piece ke current piece dan generate next piece yang baru
 */
function newPiece() {
    // Pindahkan next piece menjadi current piece
    currentPiece = {
        shape: nextPiece.shape,
        color: nextPiece.color,
        x: Math.floor(COLS / 2) - 2,  // Posisi awal di tengah atas
        y: 0,
        matrix: JSON.parse(JSON.stringify(nextPiece.matrix))
    };

    // Generate next piece yang baru
    generateNextPiece();
    drawNextPiece();
}

/**
 * Menggambar satu blok pada canvas
 * @param {number} x - Posisi X (kolom)
 * @param {number} y - Posisi Y (baris)
 * @param {string} color - Warna blok dalam format hex
 */
function drawBlock(x, y, color) {
    // Gambar isi blok dengan warna
    ctx.fillStyle = color;
    ctx.fillRect(x * BLOCK_SIZE, y * BLOCK_SIZE, BLOCK_SIZE, BLOCK_SIZE);

    // Gambar border blok
    ctx.strokeStyle = '#333';
    ctx.strokeRect(x * BLOCK_SIZE, y * BLOCK_SIZE, BLOCK_SIZE, BLOCK_SIZE);
}

/**
 * Cek apakah ada blok yang melewati warning line
 * @returns {boolean} true jika ada blok di atau di atas warning line
 */
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

/**
 * Menggambar grid latar belakang dan semua blok yang sudah ditempatkan
 */
function drawGrid() {
    // Gambar garis-garis grid
    ctx.strokeStyle = '#222';
    ctx.lineWidth = 1;

    // Gambar garis horizontal
    for (let row = 0; row <= ROWS; row++) {
        ctx.beginPath();
        ctx.moveTo(0, row * BLOCK_SIZE);
        ctx.lineTo(COLS * BLOCK_SIZE, row * BLOCK_SIZE);
        ctx.stroke();
    }

    // Gambar garis vertikal
    for (let col = 0; col <= COLS; col++) {
        ctx.beginPath();
        ctx.moveTo(col * BLOCK_SIZE, 0);
        ctx.lineTo(col * BLOCK_SIZE, ROWS * BLOCK_SIZE);
        ctx.stroke();
    }

    // Gambar warning line (merah jika ada blok yang melewati)
    const warningTriggered = isWarningLineTriggered();
    if (warningTriggered) {
        ctx.strokeStyle = '#ff0000';  // Merah
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(0, (WARNING_LINE + 1) * BLOCK_SIZE);
        ctx.lineTo(COLS * BLOCK_SIZE, (WARNING_LINE + 1) * BLOCK_SIZE);
        ctx.stroke();

        // Tambahkan efek glow
        ctx.shadowColor = '#ff0000';
        ctx.shadowBlur = 10;
        ctx.stroke();
        ctx.shadowBlur = 0;  // Reset shadow
    }

    // Gambar semua blok yang sudah ditempatkan di grid
    for (let row = 0; row < ROWS; row++) {
        for (let col = 0; col < COLS; col++) {
            if (grid[row][col]) {
                drawBlock(col, row, grid[row][col]);
            }
        }
    }
}

/**
 * Menghitung posisi Y dimana ghost piece akan mendarat
 * @returns {number} Posisi Y dari ghost piece
 */
function getGhostY() {
    let ghostY = currentPiece.y;
    // Turunkan terus sampai ketemu collision
    while (!collision(0, ghostY - currentPiece.y + 1)) {
        ghostY++;
    }
    return ghostY;
}

/**
 * Menggambar ghost piece (bayangan transparan yang menunjukkan dimana piece akan jatuh)
 */
function drawGhost() {
    const ghostY = getGhostY();

    currentPiece.matrix.forEach((row, y) => {
        row.forEach((value, x) => {
            if (value) {
                const posX = currentPiece.x + x;
                const posY = ghostY + y;

                // Gambar outline semi-transparan
                ctx.strokeStyle = currentPiece.color;
                ctx.lineWidth = 2;
                ctx.strokeRect(
                    posX * BLOCK_SIZE + 2,
                    posY * BLOCK_SIZE + 2,
                    BLOCK_SIZE - 4,
                    BLOCK_SIZE - 4
                );

                // Tambahkan isian tipis semi-transparan
                ctx.fillStyle = currentPiece.color + '20';  // 20 = transparansi dalam hex
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

/**
 * Menggambar piece yang sedang aktif/jatuh
 */
function drawPiece() {
    currentPiece.matrix.forEach((row, y) => {
        row.forEach((value, x) => {
            if (value) {
                drawBlock(currentPiece.x + x, currentPiece.y + y, currentPiece.color);
            }
        });
    });
}

/**
 * Deteksi tabrakan/collision piece dengan dinding, lantai, atau blok lain
 * @param {number} offsetX - Offset horizontal untuk pengujian
 * @param {number} offsetY - Offset vertikal untuk pengujian
 * @param {Array} matrix - Matriks piece yang akan diuji (default: current piece)
 * @returns {boolean} true jika ada collision, false jika aman
 */
function collision(offsetX = 0, offsetY = 0, matrix = currentPiece.matrix) {
    for (let y = 0; y < matrix.length; y++) {
        for (let x = 0; x < matrix[y].length; x++) {
            if (matrix[y][x]) {
                const newX = currentPiece.x + x + offsetX;
                const newY = currentPiece.y + y + offsetY;

                // Cek batas kiri, kanan, dan bawah
                if (newX < 0 || newX >= COLS || newY >= ROWS) {
                    return true;
                }

                // Cek tabrakan dengan blok yang sudah ada di grid
                if (newY >= 0 && grid[newY][newX]) {
                    return true;
                }
            }
        }
    }
    return false;
}

/**
 * Gabungkan piece ke grid (ketika piece sudah mendarat)
 * Mengubah nilai di grid dari 0 menjadi warna piece
 */
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

/**
 * Rotasi matriks 90 derajat searah jarum jam
 * @param {Array} matrix - Matriks yang akan dirotasi
 * @returns {Array} Matriks hasil rotasi
 */
function rotate(matrix) {
    const N = matrix.length;
    const result = Array.from({ length: N }, () => Array(N).fill(0));

    // Algoritma rotasi: baris menjadi kolom terbalik
    for (let y = 0; y < N; y++) {
        for (let x = 0; x < N; x++) {
            result[x][N - 1 - y] = matrix[y][x];
        }
    }

    return result;
}

/**
 * Rotasi piece dengan wall kick system
 * Wall kick: mencoba beberapa posisi jika rotasi normal tidak bisa
 */
function rotatePiece() {
    // Piece O tidak perlu dirotasi (bentuknya persegi)
    if (currentPiece.shape === 'O') return;

    const rotated = rotate(currentPiece.matrix);
    const originalX = currentPiece.x;

    // Coba beberapa kick (geser) untuk mendapatkan rotasi yang valid
    // Sistem SRS (Super Rotation System)
    const kicks = [0, 1, -1, 2, -2];

    for (let kick of kicks) {
        currentPiece.x = originalX + kick;
        if (!collision(0, 0, rotated)) {
            currentPiece.matrix = rotated;
            return;
        }
    }

    // Kembalikan posisi original jika semua kick gagal
    currentPiece.x = originalX;
}

/**
 * Hapus baris yang sudah penuh dan update skor
 * Baris penuh: semua sel terisi (tidak ada yang 0)
 */
function clearLines() {
    let linesCleared = 0;

    // Cek setiap baris dari bawah ke atas
    for (let row = ROWS - 1; row >= 0; row--) {
        // Jika baris penuh (semua sel tidak 0)
        if (grid[row].every(cell => cell !== 0)) {
            // Buat partikel untuk setiap blok di baris ini sebelum dihapus
            for (let col = 0; col < COLS; col++) {
                const color = grid[row][col];
                if (color) {
                    createBlockParticles(col, row, color);
                }
            }

            // Hapus baris ini
            grid.splice(row, 1);
            // Tambahkan baris kosong baru di atas
            grid.unshift(Array(COLS).fill(0));
            linesCleared++;
            row++; // Cek baris yang sama lagi karena ada yang turun
        }
    }

    // Update skor jika ada baris yang dihapus
    if (linesCleared > 0) {
        lines += linesCleared;
        // Sistem scoring: 1 baris=100, 2=300, 3=500, 4=800 poin
        const points = [0, 100, 300, 500, 800];
        score += points[linesCleared];
        updateScoreDisplay();

        // Play sound effect untuk line clear
        playClearSound();
    }
}

/**
 * Update tampilan skor dan jumlah baris di HTML
 */
function updateScoreDisplay() {
    document.getElementById('score').textContent = score;
    document.getElementById('lines').textContent = lines;
}

/**
 * Gambar preview piece berikutnya di panel "Next"
 */
function drawNextPiece() {
    const nextCanvas = document.getElementById('nextPiece');
    if (!nextCanvas) return;

    const nextCtx = nextCanvas.getContext('2d');
    const blockSize = 20;  // Ukuran blok lebih kecil untuk preview

    // Bersihkan canvas
    nextCtx.fillStyle = '#000';
    nextCtx.fillRect(0, 0, nextCanvas.width, nextCanvas.height);

    // Gambar garis grid
    nextCtx.strokeStyle = '#222';
    nextCtx.lineWidth = 1;
    for (let i = 0; i <= 4; i++) {
        // Garis horizontal
        nextCtx.beginPath();
        nextCtx.moveTo(0, i * blockSize);
        nextCtx.lineTo(80, i * blockSize);
        nextCtx.stroke();

        // Garis vertikal
        nextCtx.beginPath();
        nextCtx.moveTo(i * blockSize, 0);
        nextCtx.lineTo(i * blockSize, 80);
        nextCtx.stroke();
    }

    // Hitung offset untuk menempatkan piece di tengah
    const matrix = nextPiece.matrix;
    const matrixSize = matrix.length;
    const offsetX = (4 - matrixSize) / 2;
    const offsetY = (4 - matrixSize) / 2;

    // Gambar piece
    matrix.forEach((row, y) => {
        row.forEach((value, x) => {
            if (value) {
                const drawX = (offsetX + x) * blockSize;
                const drawY = (offsetY + y) * blockSize;

                // Gambar blok
                nextCtx.fillStyle = nextPiece.color;
                nextCtx.fillRect(drawX, drawY, blockSize, blockSize);
                nextCtx.strokeStyle = '#333';
                nextCtx.strokeRect(drawX, drawY, blockSize, blockSize);
            }
        });
    });
}

/**
 * Gerakkan piece ke kiri atau kanan
 * @param {number} dir - Arah gerakan (-1 untuk kiri, 1 untuk kanan)
 */
function move(dir) {
    currentPiece.x += dir;
    // Batalkan gerakan jika terjadi collision
    if (collision()) {
        currentPiece.x -= dir;
    }
}

/**
 * Jatuhkan piece satu baris ke bawah
 * Jika tidak bisa, maka merge ke grid dan spawn piece baru
 */
function drop() {
    currentPiece.y++;

    // Jika piece menabrak sesuatu
    if (collision()) {
        currentPiece.y--;  // Kembalikan ke posisi sebelumnya
        merge();           // Gabungkan ke grid
        clearLines();      // Cek dan hapus baris penuh
        newPiece();        // Spawn piece baru

        // Cek game over: jika piece baru langsung collision
        if (collision()) {
            gameOver();
        }
    }
}

/**
 * Fungsi untuk menangani game over
 */
async function gameOver() {
    // Cegah multiple game over
    if (gameOverTriggered) {
        return;
    }
    gameOverTriggered = true;

    // Stop game
    gameStarted = false;
    gamePaused = false;

    // Stop background music
    stopBgMusic();

    // Update stats di popup
    document.getElementById('finalScore').textContent = score;
    document.getElementById('finalLines').textContent = lines;

    // Tampilkan game over popup
    document.getElementById('gameOverPopup').style.display = 'flex';

    // Simpan score ke Supabase
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

        // Sembunyikan pesan setelah 2 detik
        setTimeout(() => {
            savingMessage.style.display = 'none';
        }, 2000);

        // Load leaderboard setelah save
        await loadGameOverLeaderboard();
    } else {
        savingMessage.style.display = 'none';
        // Load leaderboard meskipun tidak ada Supabase
        await loadGameOverLeaderboard();
    }
}

/**
 * Load dan tampilkan leaderboard di game over popup
 */
async function loadGameOverLeaderboard() {
    const list = document.getElementById('gameOverLeaderboardList');

    // Loading state
    list.innerHTML = '<p class="loading-text">Loading leaderboard...</p>';

    // Load data
    const scores = await loadLeaderboard();

    // Tampilkan data
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

/**
 * Render/gambar semua elemen game ke canvas
 */
function render() {
    // Bersihkan canvas
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Gambar semua elemen
    drawGrid();      // Grid dan blok yang sudah ditempatkan
    drawGhost();     // Ghost piece (bayangan)
    drawPiece();     // Piece yang sedang aktif
    drawParticles(); // Efek partikel
}

/**
 * Event listener untuk kontrol keyboard
 */
document.addEventListener('keydown', (e) => {
    if (!gameStarted) return;  // Jangan terima input jika game belum mulai

    // Toggle pause dengan tombol P
    if (e.key === 'p' || e.key === 'P') {
        togglePause();
        return;
    }

    if (gamePaused) return;  // Jangan terima input jika game sedang pause

    if (e.key === 'ArrowLeft') {
        move(-1);  // Gerak ke kiri
    } else if (e.key === 'ArrowRight') {
        move(1);   // Gerak ke kanan
    } else if (e.key === 'ArrowDown') {
        drop();    // Jatuhkan lebih cepat
    } else if (e.key === 'ArrowUp' || e.key === ' ') {
        rotatePiece();  // Rotasi piece
    }
    render();  // Update tampilan setelah input
});

// Variabel untuk game loop
let dropCounter = 0;           // Penghitung waktu untuk auto-drop
let dropInterval = 1000;       // Interval auto-drop dalam milidetik (1 detik)
let lastTime = 0;              // Waktu frame terakhir

/**
 * Game loop utama - dipanggil setiap frame
 * @param {number} time - Timestamp dari requestAnimationFrame
 */
function update(time = 0) {
    const deltaTime = time - lastTime;
    lastTime = time;

    // Skip update jika game sedang pause
    if (!gamePaused) {
        // Auto-drop: jatuhkan piece secara otomatis setiap interval
        dropCounter += deltaTime;
        if (dropCounter > dropInterval) {
            drop();
            dropCounter = 0;
        }

        // Update partikel efek
        updateParticles();

        render();
    }

    requestAnimationFrame(update);  // Loop terus
}

/**
 * Initialize audio
 */
function initAudio() {
    if (!audioInitialized) {
        bgMusic = document.getElementById('bgMusic');
        clearSound = document.getElementById('clearSound');

        if (bgMusic) {
            bgMusic.volume = 0.3;  // 30% volume untuk background music
        }
        if (clearSound) {
            clearSound.volume = 0.5;  // 50% volume untuk sound effect
        }

        audioInitialized = true;
    }
}

/**
 * Play background music
 */
function playBgMusic() {
    initAudio();
    if (bgMusic) {
        bgMusic.play().catch(e => {
            console.log('Audio play prevented:', e);
        });
    }
}

/**
 * Stop background music
 */
function stopBgMusic() {
    if (bgMusic) {
        bgMusic.pause();
        bgMusic.currentTime = 0;
    }
}

/**
 * Play clear sound effect
 */
function playClearSound() {
    if (clearSound) {
        clearSound.currentTime = 0;  // Reset to start
        clearSound.play().catch(e => {
            console.log('Sound effect play prevented:', e);
        });
    }
}

/**
 * Fungsi untuk memulai permainan
 */
function startGame() {
    // Ambil nama pemain dari input
    const nameInput = document.getElementById('playerName');
    playerName = nameInput.value.trim();

    // Validasi nama (minimal 1 karakter)
    if (!playerName) {
        alert('Please enter your name first!');
        nameInput.focus();
        return;
    }

    // Sembunyikan menu, tampilkan game
    document.getElementById('menuScreen').style.display = 'none';
    document.getElementById('gameScreen').style.display = 'block';

    // Reset game state
    grid.forEach(row => row.fill(0));
    score = 0;
    lines = 0;
    dropCounter = 0;
    particles = [];
    gameOverTriggered = false;  // Reset game over flag

    // Mulai permainan
    gameStarted = true;
    playBgMusic();  // Play background music
    generateNextPiece();  // Generate piece pertama untuk preview
    newPiece();           // Spawn piece pertama
    updateScoreDisplay(); // Inisialisasi tampilan skor
    update();             // Mulai game loop
}

/**
 * Event listener untuk tombol start
 */
document.getElementById('startButton').addEventListener('click', startGame);

/**
 * Fungsi untuk menampilkan popup rules
 */
function showRules() {
    document.getElementById('rulesPopup').style.display = 'flex';
}

/**
 * Fungsi untuk menutup popup rules
 */
function closeRules() {
    document.getElementById('rulesPopup').style.display = 'none';
}

/**
 * Event listener untuk tombol rules
 */
document.getElementById('rulesButton').addEventListener('click', showRules);
document.getElementById('closeRulesButton').addEventListener('click', closeRules);

// Tutup popup jika klik di luar konten
document.getElementById('rulesPopup').addEventListener('click', function(e) {
    if (e.target.id === 'rulesPopup') {
        closeRules();
    }
});

/**
 * Fungsi untuk pause/resume game
 */
function togglePause() {
    if (!gameStarted) return;

    gamePaused = !gamePaused;

    if (gamePaused) {
        document.getElementById('pausePopup').style.display = 'flex';
        // Pause music
        if (bgMusic) bgMusic.pause();
    } else {
        document.getElementById('pausePopup').style.display = 'none';
        // Resume music
        if (bgMusic) bgMusic.play();
    }
}

/**
 * Fungsi untuk resume game
 */
function resumeGame() {
    gamePaused = false;
    document.getElementById('pausePopup').style.display = 'none';
    // Resume music
    if (bgMusic) bgMusic.play();
}

/**
 * Fungsi untuk kembali ke home (menu)
 */
function goHome() {
    // Stop game
    gameStarted = false;
    gamePaused = false;

    // Stop background music
    stopBgMusic();

    // Sembunyikan game screen dan pause popup, tampilkan menu
    document.getElementById('gameScreen').style.display = 'none';
    document.getElementById('pausePopup').style.display = 'none';
    document.getElementById('menuScreen').style.display = 'flex';

    // Reset game state
    grid.forEach(row => row.fill(0));
    score = 0;
    lines = 0;
    dropCounter = 0;
    particles = [];
    gameOverTriggered = false;  // Reset game over flag
    updateScoreDisplay();
}

/**
 * Event listener untuk tombol pause, resume, dan home
 */
document.getElementById('pauseButton').addEventListener('click', togglePause);
document.getElementById('resumeButton').addEventListener('click', resumeGame);
document.getElementById('homeButton').addEventListener('click', goHome);

// Tutup pause popup jika klik di luar konten
document.getElementById('pausePopup').addEventListener('click', function(e) {
    if (e.target.id === 'pausePopup') {
        resumeGame();
    }
});

/**
 * Fungsi untuk play again (restart game)
 */
function playAgain() {
    // Sembunyikan game over popup
    document.getElementById('gameOverPopup').style.display = 'none';

    // Reset game state
    grid.forEach(row => row.fill(0));
    score = 0;
    lines = 0;
    dropCounter = 0;
    particles = [];
    gameOverTriggered = false;  // Reset game over flag

    // Mulai permainan
    gameStarted = true;
    gamePaused = false;
    playBgMusic();  // Play music again
    generateNextPiece();
    newPiece();
    updateScoreDisplay();
}

/**
 * Fungsi untuk kembali ke menu dari game over
 */
function backToMenu() {
    // Sembunyikan game over popup dan game screen
    document.getElementById('gameOverPopup').style.display = 'none';
    document.getElementById('gameScreen').style.display = 'none';
    document.getElementById('menuScreen').style.display = 'flex';

    // Reset game state
    grid.forEach(row => row.fill(0));
    score = 0;
    lines = 0;
    dropCounter = 0;
    particles = [];
    gameOverTriggered = false;  // Reset game over flag
    updateScoreDisplay();

    // Music sudah di-stop di gameOver()
}

/**
 * Event listener untuk tombol game over
 */
document.getElementById('playAgainButton').addEventListener('click', playAgain);
document.getElementById('backToMenuButton').addEventListener('click', backToMenu);

// ===== SUPABASE FUNCTIONS =====

/**
 * Simpan skor ke Supabase
 */
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

/**
 * Load leaderboard dari Supabase
 */
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

/**
 * Tampilkan leaderboard di popup
 */
async function showLeaderboard() {
    const popup = document.getElementById('leaderboardPopup');
    const list = document.getElementById('leaderboardList');

    // Tampilkan popup
    popup.style.display = 'flex';

    // Loading state
    list.innerHTML = '<p class="loading-text">Loading scores...</p>';

    // Load data
    const scores = await loadLeaderboard();

    // Tampilkan data
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

/**
 * Tutup leaderboard popup
 */
function closeLeaderboard() {
    document.getElementById('leaderboardPopup').style.display = 'none';
}

/**
 * Event listener untuk leaderboard
 */
document.getElementById('leaderboardButton').addEventListener('click', showLeaderboard);
document.getElementById('closeLeaderboardButton').addEventListener('click', closeLeaderboard);

// Tutup leaderboard jika klik di luar konten
document.getElementById('leaderboardPopup').addEventListener('click', function(e) {
    if (e.target.id === 'leaderboardPopup') {
        closeLeaderboard();
    }
});

// === INISIALISASI ===
// Game akan dimulai setelah tombol START diklik
