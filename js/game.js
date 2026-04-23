import { 
    auth, db, 
    createUserWithEmailAndPassword, 
    signInWithEmailAndPassword, 
    signOut, 
    onAuthStateChanged,
    doc, getDoc, setDoc, updateDoc,
    collection, addDoc
} from './firebase-config.js';

// ============================================
// DOM Elements
// ============================================

const authSection = document.getElementById('auth-section');
const songSelection = document.getElementById('song-selection');
const gameSection = document.getElementById('game-section');
const songsGrid = document.getElementById('songs-grid');
const userEmailSpan = document.getElementById('user-email');
const songSelectionEmail = document.getElementById('song-selection-email');
const scoreSpan = document.getElementById('score');
const comboSpan = document.getElementById('combo');
const maxComboSpan = document.getElementById('max-combo');
const highScoreSpan = document.getElementById('high-score');
const accuracySpan = document.getElementById('accuracy');
const judgmentDiv = document.getElementById('judgment');
const comboIndicator = document.getElementById('combo-indicator');
const canvas = document.getElementById('game-canvas');
const restartBtn = document.getElementById('restart-btn');
const exitSongBtn = document.getElementById('exit-song-btn');

let ctx = null;
if (canvas) {
    ctx = canvas.getContext('2d');
    canvas.width = 1200;
    canvas.height = 500;
}

// ============================================
// Game Constants
// ============================================

const LANE_COUNT = 7;
const LANE_WIDTH = canvas ? canvas.width / LANE_COUNT : 171;
const SCROLL_SPEED = 280;
const HIT_Y = canvas ? canvas.height - 100 : 400;

const JUDGMENT_WINDOWS = {
    perfect: 0.045,
    great: 0.095,
    good: 0.185
};

const JUDGMENT_SCORES = {
    perfect: 100,
    great: 50,
    good: 25
};

const LANE_KEYS = {
    'KeyS': 0, 'KeyD': 1, 'KeyF': 2, 'Space': 3, 'KeyJ': 4, 'KeyK': 5, 'KeyL': 6,
    's': 0, 'd': 1, 'f': 2, ' ': 3, 'j': 4, 'k': 5, 'l': 6
};

const LANE_COLORS = [
    '#ff6b6b', '#fccd12', '#5f3dc4', '#20c997', '#3b1f8a', '#fccd12', '#ff6b6b'
];

// ============================================
// Game Variables
// ============================================

let score = 0;
let combo = 0;
let maxCombo = 0;
let highScore = 0;
let currentUserId = null;
let gameActive = false;
let gameStarted = false;
let audioContext = null;
let audioSource = null;
let startTime = 0;
let notes = [];
let currentSong = null;
let currentBeatmap = null;
let animationId = null;
let lastTimestamp = 0;

let judgmentStats = {
    perfect: 0,
    great: 0,
    good: 0,
    miss: 0,
    total: 0
};

// ============================================
// Song Library with Real Beatmaps
// ============================================

const SONGS = [
    {
        id: 'fly-mag-pie',
        title: 'Fly Mag Pie',
        artist: 'O2Jam Original',
        difficulty: 'Hard',
        bpm: 140,
        audioUrl: 'songs/fly-mag-pie/song.mp3',
        audioUrlFallback: 'songs/fly-mag-pie/song.ogg',
        coverEmoji: '🦋'
    },
    {
        id: 'canon-rock',
        title: 'Canon Rock',
        artist: 'JerryC',
        difficulty: 'Expert',
        bpm: 160,
        audioUrl: 'songs/canon-rock/song.mp3',
        audioUrlFallback: 'songs/canon-rock/song.ogg',
        coverEmoji: '🎸'
    },
    {
        id: 'electro-classic',
        title: 'Electro Classic',
        artist: 'O2Jam',
        difficulty: 'Normal',
        bpm: 128,
        audioUrl: 'songs/electro-classic/song.mp3',
        audioUrlFallback: 'songs/electro-classic/song.ogg',
        coverEmoji: '⚡'
    }
];

// ============================================
// Full Beatmap for Fly Mag Pie (140 BPM)
// ============================================

const FLY_MAG_PIE_BEATMAP = {
    songId: 'fly-mag-pie',
    bpm: 140,
    offset: 0.5,
    duration: 118,
    notes: [
        // Intro
        { time: 1.0, lane: 3, type: 'tap' },
        { time: 1.5, lane: 2, type: 'tap' },
        { time: 1.5, lane: 4, type: 'tap' },
        { time: 2.0, lane: 1, type: 'tap' },
        { time: 2.0, lane: 5, type: 'tap' },
        { time: 2.5, lane: 0, type: 'tap' },
        { time: 2.5, lane: 6, type: 'tap' },
        
        // Verse 1 - 16th notes
        { time: 3.0, lane: 3, type: 'tap' },
        { time: 3.25, lane: 2, type: 'tap' },
        { time: 3.5, lane: 4, type: 'tap' },
        { time: 3.75, lane: 3, type: 'tap' },
        { time: 4.0, lane: 1, type: 'tap' },
        { time: 4.25, lane: 5, type: 'tap' },
        { time: 4.5, lane: 0, type: 'tap' },
        { time: 4.75, lane: 6, type: 'tap' },
        
        // Chorus - Double notes
        { time: 5.5, lane: 0, type: 'tap' },
        { time: 5.5, lane: 6, type: 'tap' },
        { time: 6.0, lane: 1, type: 'tap' },
        { time: 6.0, lane: 5, type: 'tap' },
        { time: 6.5, lane: 2, type: 'tap' },
        { time: 6.5, lane: 4, type: 'tap' },
        { time: 7.0, lane: 3, type: 'tap' },
        
        // Fast run
        { time: 8.0, lane: 0, type: 'tap' },
        { time: 8.125, lane: 1, type: 'tap' },
        { time: 8.25, lane: 2, type: 'tap' },
        { time: 8.375, lane: 3, type: 'tap' },
        { time: 8.5, lane: 4, type: 'tap' },
        { time: 8.625, lane: 5, type: 'tap' },
        { time: 8.75, lane: 6, type: 'tap' },
        { time: 9.0, lane: 6, type: 'tap' },
        { time: 9.125, lane: 5, type: 'tap' },
        { time: 9.25, lane: 4, type: 'tap' },
        { time: 9.375, lane: 3, type: 'tap' },
        { time: 9.5, lane: 2, type: 'tap' },
        { time: 9.625, lane: 1, type: 'tap' },
        { time: 9.75, lane: 0, type: 'tap' },
        
        // More chorus
        { time: 10.5, lane: 0, type: 'tap' },
        { time: 10.5, lane: 6, type: 'tap' },
        { time: 11.0, lane: 1, type: 'tap' },
        { time: 11.0, lane: 5, type: 'tap' },
        { time: 11.5, lane: 2, type: 'tap' },
        { time: 11.5, lane: 4, type: 'tap' },
        { time: 12.0, lane: 3, type: 'tap' },
        { time: 12.0, lane: 3, type: 'tap' },
        
        // Trill pattern
        { time: 13.0, lane: 0, type: 'tap' },
        { time: 13.25, lane: 1, type: 'tap' },
        { time: 13.5, lane: 2, type: 'tap' },
        { time: 13.75, lane: 3, type: 'tap' },
        { time: 14.0, lane: 4, type: 'tap' },
        { time: 14.25, lane: 5, type: 'tap' },
        { time: 14.5, lane: 6, type: 'tap' },
        { time: 14.75, lane: 5, type: 'tap' },
        { time: 15.0, lane: 4, type: 'tap' },
        { time: 15.25, lane: 3, type: 'tap' },
        { time: 15.5, lane: 2, type: 'tap' },
        { time: 15.75, lane: 1, type: 'tap' },
        { time: 16.0, lane: 0, type: 'tap' },
        
        // Finale
        { time: 17.0, lane: 0, type: 'tap' },
        { time: 17.0, lane: 6, type: 'tap' },
        { time: 17.5, lane: 1, type: 'tap' },
        { time: 17.5, lane: 5, type: 'tap' },
        { time: 18.0, lane: 2, type: 'tap' },
        { time: 18.0, lane: 4, type: 'tap' },
        { time: 18.5, lane: 3, type: 'tap' },
        { time: 19.0, lane: 0, type: 'tap' },
        { time: 19.0, lane: 6, type: 'tap' },
        { time: 19.5, lane: 1, type: 'tap' },
        { time: 19.5, lane: 5, type: 'tap' },
        { time: 20.0, lane: 2, type: 'tap' },
        { time: 20.0, lane: 4, type: 'tap' },
        { time: 20.5, lane: 3, type: 'tap' }
    ]
};

// Canon Rock Beatmap (160 BPM)
const CANON_ROCK_BEATMAP = {
    songId: 'canon-rock',
    bpm: 160,
    offset: 0.5,
    duration: 180,
    notes: []
};

// Generate Canon Rock notes
for (let i = 0; i < 120; i++) {
    const time = i * 0.375;
    const lane = i % LANE_COUNT;
    CANON_ROCK_BEATMAP.notes.push({ time, lane, type: 'tap' });
    
    // Add double notes occasionally
    if (i % 8 === 4) {
        CANON_ROCK_BEATMAP.notes.push({ time, lane: LANE_COUNT - 1 - lane, type: 'tap' });
    }
}

// Electro Classic Beatmap
const ELECTRO_BEATMAP = {
    songId: 'electro-classic',
    bpm: 128,
    offset: 0.5,
    duration: 150,
    notes: []
};

for (let i = 0; i < 80; i++) {
    ELECTRO_BEATMAP.notes.push({ time: i * 0.5, lane: i % LANE_COUNT, type: 'tap' });
}

// ============================================
// Beatmap Loader
// ============================================

async function loadBeatmap(songId) {
    try {
        if (songId === 'fly-mag-pie') return FLY_MAG_PIE_BEATMAP;
        if (songId === 'canon-rock') return CANON_ROCK_BEATMAP;
        if (songId === 'electro-classic') return ELECTRO_BEATMAP;
        
        const response = await fetch(`songs/${songId}/beatmap.json`);
        if (!response.ok) throw new Error('Beatmap not found');
        return await response.json();
    } catch (error) {
        console.error('Error loading beatmap, using default:', error);
        return { notes: [], bpm: 120, offset: 0.5, duration: 60 };
    }
}

// ============================================
// Song Selection UI
// ============================================

function displaySongs() {
    if (!songsGrid) return;
    
    songsGrid.innerHTML = '';
    
    SONGS.forEach(song => {
        const songCard = document.createElement('div');
        songCard.className = 'song-card';
        songCard.innerHTML = `
            <div class="song-cover">${song.coverEmoji}</div>
            <div class="song-info">
                <div class="song-title">${song.title}</div>
                <div class="song-artist">${song.artist}</div>
                <span class="song-difficulty">${song.difficulty}</span>
                <span class="song-difficulty" style="background: #3820ab; margin-left: 5px;">${song.bpm} BPM</span>
            </div>
        `;
        songCard.addEventListener('click', () => selectSong(song));
        songsGrid.appendChild(songCard);
    });
}

async function selectSong(song) {
    console.log('Selecting song:', song.title);
    
    const beatmap = await loadBeatmap(song.id);
    currentBeatmap = beatmap;
    currentSong = song;
    
    notes = currentBeatmap.notes.map(note => ({
        ...note,
        y: 0,
        hit: false,
        judged: false
    }));
    
    songSelection.style.display = 'none';
    gameSection.style.display = 'block';
    
    const songInfoDisplay = document.getElementById('song-info-display');
    if (songInfoDisplay) {
        songInfoDisplay.innerHTML = `🎵 ${song.title} - ${song.artist} | ${song.bpm} BPM | ${notes.length} Notes 🎵`;
    }
    
    startSong();
}

// ============================================
// Audio Setup
// ============================================

async function initAudio() {
    if (!audioContext) {
        audioContext = new (window.AudioContext || window.webkitAudioContext)();
    }
    if (audioContext.state === 'suspended') {
        await audioContext.resume();
    }
    return audioContext;
}

async function loadAndPlaySong() {
    if (!currentSong) return;
    
    try {
        if (audioSource) {
            try { audioSource.stop(); } catch(e) {}
        }
        
        const audioCtx = await initAudio();
        
        let audioUrl = currentSong.audioUrl;
        let response = await fetch(audioUrl);
        
        if (!response.ok && currentSong.audioUrlFallback) {
            audioUrl = currentSong.audioUrlFallback;
            response = await fetch(audioUrl);
        }
        
        if (!response.ok) {
            console.warn('Audio file not found, playing without sound');
            startTime = performance.now() / 1000 + 0.1;
            return startTime;
        }
        
        const arrayBuffer = await response.arrayBuffer();
        const audioBuffer = await audioCtx.decodeAudioData(arrayBuffer);
        
        audioSource = audioCtx.createBufferSource();
        audioSource.buffer = audioBuffer;
        audioSource.connect(audioCtx.destination);
        
        startTime = audioCtx.currentTime + 0.1;
        audioSource.start(startTime);
        
        return startTime;
    } catch (error) {
        console.error('Error loading audio:', error);
        startTime = performance.now() / 1000 + 0.1;
        return startTime;
    }
}

// ============================================
// Game Functions
// ============================================

async function startSong() {
    score = 0;
    combo = 0;
    maxCombo = 0;
    judgmentStats = { perfect: 0, great: 0, good: 0, miss: 0, total: 0 };
    
    gameActive = true;
    gameStarted = false;
    
    if (scoreSpan) scoreSpan.textContent = '0';
    if (comboSpan) comboSpan.textContent = '0';
    if (maxComboSpan) maxComboSpan.textContent = '0';
    if (accuracySpan) accuracySpan.textContent = '0';
    if (comboIndicator) comboIndicator.textContent = '';
    if (judgmentDiv) judgmentDiv.textContent = '';
    
    notes.forEach(note => {
        note.hit = false;
        note.judged = false;
        note.y = 0;
    });
    
    await loadAndPlaySong();
    
    if (animationId) cancelAnimationFrame(animationId);
    lastTimestamp = performance.now() / 1000;
    animationId = requestAnimationFrame(updateGame);
    
    setTimeout(() => {
        gameStarted = true;
        console.log('Game started!');
    }, 200);
}

function updateGame(timestamp) {
    if (!gameActive) return;
    
    const currentTime = performance.now() / 1000;
    const deltaTime = Math.min(0.033, currentTime - lastTimestamp);
    lastTimestamp = currentTime;
    
    let songTime = currentTime - startTime;
    if (!gameStarted && songTime > 0) gameStarted = true;
    
    updateNotePositions(deltaTime);
    checkMissedNotes(songTime);
    drawGame(songTime);
    
    if (gameStarted && songTime > (currentBeatmap?.duration || 90) + 3) {
        endSong();
        return;
    }
    
    animationId = requestAnimationFrame(updateGame);
}

function updateNotePositions(deltaTime) {
    const scrollDelta = SCROLL_SPEED * deltaTime;
    notes.forEach(note => {
        if (!note.hit && !note.judged) {
            note.y += scrollDelta;
        }
    });
}

function checkMissedNotes(songTime) {
    notes.forEach(note => {
        if (!note.hit && !note.judged && note.y > HIT_Y + 60) {
            note.judged = true;
            judgmentStats.miss++;
            judgmentStats.total++;
            combo = 0;
            updateUI();
            showJudgment('miss', 0);
        }
    });
}

function handleTap(lane) {
    if (!gameActive || !gameStarted) return;
    
    const currentTime = performance.now() / 1000;
    const songTime = currentTime - startTime;
    
    let closestNote = null;
    let closestDistance = Infinity;
    
    notes.forEach(note => {
        if (!note.judged && !note.hit && note.lane === lane) {
            const distance = Math.abs(songTime - note.time);
            if (distance < closestDistance) {
                closestDistance = distance;
                closestNote = note;
            }
        }
    });
    
    if (closestNote && closestDistance <= JUDGMENT_WINDOWS.good) {
        let judgment = 'miss';
        let points = 0;
        
        if (closestDistance <= JUDGMENT_WINDOWS.perfect) {
            judgment = 'perfect';
            points = JUDGMENT_SCORES.perfect;
            judgmentStats.perfect++;
        } else if (closestDistance <= JUDGMENT_WINDOWS.great) {
            judgment = 'great';
            points = JUDGMENT_SCORES.great;
            judgmentStats.great++;
        } else if (closestDistance <= JUDGMENT_WINDOWS.good) {
            judgment = 'good';
            points = JUDGMENT_SCORES.good;
            judgmentStats.good++;
        }
        
        if (judgment !== 'miss') {
            const multiplier = Math.floor(combo / 10) + 1;
            const finalPoints = points * multiplier;
            
            score += finalPoints;
            combo++;
            
            if (combo > maxCombo) maxCombo = combo;
            
            judgmentStats.total++;
            
            updateUI();
            showJudgment(judgment, multiplier);
            
            closestNote.hit = true;
            closestNote.judged = true;
            
            if (score > highScore) saveHighScore();
        }
    } else if (closestDistance > JUDGMENT_WINDOWS.good) {
        combo = 0;
        updateUI();
        showJudgment('miss', 0);
    }
}

function updateUI() {
    if (scoreSpan) scoreSpan.textContent = Math.floor(score);
    if (comboSpan) comboSpan.textContent = combo;
    if (maxComboSpan) maxComboSpan.textContent = maxCombo;
    
    if (comboIndicator) {
        comboIndicator.textContent = combo >= 10 ? `${combo} COMBO! 🔥` : '';
    }
    
    const total = judgmentStats.perfect + judgmentStats.great + judgmentStats.good;
    const totalPoints = (judgmentStats.perfect * 100) + (judgmentStats.great * 50) + (judgmentStats.good * 25);
    const accuracy = total > 0 ? (totalPoints / (total * 100)) * 100 : 0;
    if (accuracySpan) accuracySpan.textContent = Math.floor(accuracy);
}

function showJudgment(judgment, multiplier) {
    if (!judgmentDiv) return;
    
    judgmentDiv.textContent = judgment.toUpperCase();
    judgmentDiv.className = `judgment ${judgment}`;
    
    if (multiplier > 1 && judgment !== 'miss') {
        judgmentDiv.textContent += ` x${multiplier}!`;
    }
    
    setTimeout(() => {
        if (judgmentDiv && judgmentDiv.textContent === judgment.toUpperCase()) {
            judgmentDiv.textContent = '';
            judgmentDiv.className = 'judgment';
        }
    }, 400);
}

function drawGame(songTime) {
    if (!ctx || !canvas) return;
    
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Draw lane backgrounds
    for (let i = 0; i < LANE_COUNT; i++) {
        ctx.fillStyle = `rgba(0, 0, 0, 0.3)`;
        ctx.fillRect(i * LANE_WIDTH, 0, LANE_WIDTH, canvas.height);
        
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
        ctx.lineWidth = 1;
        ctx.strokeRect(i * LANE_WIDTH, 0, LANE_WIDTH, canvas.height);
    }
    
    // Draw lane labels
    const labels = ['S', 'D', 'F', '␣', 'J', 'K', 'L'];
    for (let i = 0; i < LANE_COUNT; i++) {
        ctx.fillStyle = LANE_COLORS[i];
        ctx.font = 'bold 20px Poppins';
        ctx.textAlign = 'center';
        ctx.fillText(labels[i], i * LANE_WIDTH + LANE_WIDTH / 2, canvas.height - 20);
    }
    
    // Draw hit zone
    ctx.fillStyle = 'rgba(210, 145, 223, 0.1)';
    ctx.fillRect(0, HIT_Y - 35, canvas.width, 70);
    ctx.strokeStyle = '#d600d6';
    ctx.lineWidth = 3;
    ctx.strokeRect(0, HIT_Y - 35, canvas.width, 70);
    
    // Draw notes
    notes.forEach(note => {
        if (!note.hit && note.y < canvas.height + 80 && note.y > -80) {
            const x = note.lane * LANE_WIDTH + LANE_WIDTH / 2;
            const y = note.y;
            
            ctx.shadowBlur = 12;
            ctx.shadowColor = LANE_COLORS[note.lane];
            
            const gradient = ctx.createLinearGradient(x - 18, y - 12, x + 18, y + 12);
            gradient.addColorStop(0, LANE_COLORS[note.lane]);
            gradient.addColorStop(1, '#ffffff');
            
            ctx.fillStyle = gradient;
            ctx.beginPath();
            ctx.roundRect(x - 18, y - 12, 36, 24, 6);
            ctx.fill();
            
            ctx.strokeStyle = 'white';
            ctx.lineWidth = 1.5;
            ctx.beginPath();
            ctx.roundRect(x - 18, y - 12, 36, 24, 6);
            ctx.stroke();
            
            ctx.fillStyle = 'white';
            ctx.font = 'bold 16px Poppins';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(labels[note.lane], x, y);
            
            ctx.shadowBlur = 0;
        }
    });
    
    // Draw beat line
    const beatPhase = (songTime * (currentSong?.bpm || 120) / 60) % 1;
    const lineY = HIT_Y - 35 - beatPhase * 80;
    ctx.beginPath();
    ctx.moveTo(0, lineY);
    ctx.lineTo(canvas.width, lineY);
    ctx.strokeStyle = '#ffd700';
    ctx.lineWidth = 2;
    ctx.stroke();
}

// Helper for rounded rectangles
if (!CanvasRenderingContext2D.prototype.roundRect) {
    CanvasRenderingContext2D.prototype.roundRect = function(x, y, w, h, r) {
        if (w < 2 * r) r = w / 2;
        if (h < 2 * r) r = h / 2;
        this.moveTo(x + r, y);
        this.lineTo(x + w - r, y);
        this.quadraticCurveTo(x + w, y, x + w, y + r);
        this.lineTo(x + w, y + h - r);
        this.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
        this.lineTo(x + r, y + h);
        this.quadraticCurveTo(x, y + h, x, y + h - r);
        this.lineTo(x, y + r);
        this.quadraticCurveTo(x, y, x + r, y);
        return this;
    };
}

function endSong() {
    gameActive = false;
    if (animationId) cancelAnimationFrame(animationId);
    
    const total = judgmentStats.perfect + judgmentStats.great + judgmentStats.good;
    const totalPoints = (judgmentStats.perfect * 100) + (judgmentStats.great * 50) + (judgmentStats.good * 25);
    const accuracy = total > 0 ? (totalPoints / (total * 100)) * 100 : 0;
    
    alert(`🎵 Song Complete!\n\nScore: ${Math.floor(score)}\nMax Combo: ${maxCombo}x\nAccuracy: ${Math.floor(accuracy)}%\n\nPerfect: ${judgmentStats.perfect}\nGreat: ${judgmentStats.great}\nGood: ${judgmentStats.good}\nMiss: ${judgmentStats.miss}`);
    
    exitToSongSelection();
}

function exitToSongSelection() {
    gameActive = false;
    if (animationId) cancelAnimationFrame(animationId);
    if (audioSource) {
        try { audioSource.stop(); } catch(e) {}
    }
    if (audioContext) {
        audioContext.close();
        audioContext = null;
    }
    
    gameSection.style.display = 'none';
    songSelection.style.display = 'block';
}

function resetCurrentSong() {
    if (audioSource) {
        try { audioSource.stop(); } catch(e) {}
    }
    
    if (currentBeatmap) {
        notes = currentBeatmap.notes.map(note => ({
            ...note,
            y: 0,
            hit: false,
            judged: false
        }));
    }
    
    startSong();
}

// ============================================
// Authentication (simplified from previous)
// ============================================

document.addEventListener('DOMContentLoaded', () => {
    const tabBtns = document.querySelectorAll('.tab-btn');
    tabBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            const tab = btn.dataset.tab;
            tabBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            document.querySelectorAll('.auth-form').forEach(form => form.classList.remove('active'));
            document.getElementById(`${tab}-form`).classList.add('active');
        });
    });

    document.getElementById('login-form')?.addEventListener('submit', async (e) => {
        e.preventDefault();
        const email = document.getElementById('login-email').value;
        const password = document.getElementById('login-password').value;
        const errorDiv = document.getElementById('auth-error');
        try {
            await signInWithEmailAndPassword(auth, email, password);
            errorDiv.style.color = '#00ff00';
            errorDiv.textContent = 'Login successful!';
        } catch (error) {
            errorDiv.style.color = '#ff4444';
            errorDiv.textContent = 'Login failed: ' + error.message;
        }
    });

    document.getElementById('signup-form')?.addEventListener('submit', async (e) => {
        e.preventDefault();
        const email = document.getElementById('signup-email').value;
        const password = document.getElementById('signup-password').value;
        const errorDiv = document.getElementById('auth-error');
        
        if (password.length < 6) {
            errorDiv.textContent = 'Password must be at least 6 characters.';
            return;
        }
        
        try {
            const userCredential = await createUserWithEmailAndPassword(auth, email, password);
            await setDoc(doc(db, 'users', userCredential.user.uid), {
                email: email,
                highScore: 0,
                createdAt: new Date().toISOString()
            });
            errorDiv.style.color = '#00ff00';
            errorDiv.textContent = 'Account created!';
        } catch (error) {
            errorDiv.style.color = '#ff4444';
            errorDiv.textContent = 'Signup failed: ' + error.message;
        }
    });

    if (restartBtn) restartBtn.addEventListener('click', resetCurrentSong);
    if (exitSongBtn) exitSongBtn.addEventListener('click', exitToSongSelection);
    
    document.getElementById('logout-from-songs')?.addEventListener('click', async () => {
        await signOut(auth);
    });
    
    document.getElementById('logout-btn')?.addEventListener('click', async () => {
        await signOut(auth);
        exitToSongSelection();
    });

    const tapBtns = document.querySelectorAll('.tap-btn');
    tapBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            const lane = parseInt(btn.dataset.lane);
            handleTap(lane);
            btn.classList.add('active');
            setTimeout(() => btn.classList.remove('active'), 80);
        });
    });
});

onAuthStateChanged(auth, async (user) => {
    if (user) {
        currentUserId = user.uid;
        if (userEmailSpan) userEmailSpan.textContent = user.email;
        if (songSelectionEmail) songSelectionEmail.textContent = user.email;
        if (authSection) authSection.style.display = 'none';
        if (songSelection) {
            songSelection.style.display = 'block';
            displaySongs();
        }
        
        const userDoc = await getDoc(doc(db, 'users', currentUserId));
        if (userDoc.exists()) {
            highScore = userDoc.data().highScore || 0;
        }
    } else {
        currentUserId = null;
        if (authSection) authSection.style.display = 'block';
        if (songSelection) songSelection.style.display = 'none';
        if (gameSection) gameSection.style.display = 'none';
    }
});

async function saveHighScore() {
    if (!currentUserId) return;
    if (score > highScore) {
        highScore = score;
        await updateDoc(doc(db, 'users', currentUserId), { highScore: Math.floor(highScore) });
        await addDoc(collection(db, 'leaderboard'), {
            userId: currentUserId,
            email: auth.currentUser?.email,
            score: Math.floor(score),
            date: new Date().toISOString()
        });
    }
}

// Keyboard support
document.addEventListener('keydown', (e) => {
    if (LANE_KEYS[e.code] !== undefined && gameSection?.style.display === 'block' && gameActive) {
        e.preventDefault();
        const lane = LANE_KEYS[e.code];
        handleTap(lane);
        
        const btn = document.querySelector(`.tap-btn[data-lane="${lane}"]`);
        if (btn) {
            btn.classList.add('active');
            setTimeout(() => btn.classList.remove('active'), 80);
        }
    }
});

console.log('O2Jam 7-Key Game loaded! Controls: S D F SPACE J K L');