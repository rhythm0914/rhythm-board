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
const SCROLL_SPEED = 300;
const HIT_Y = canvas ? canvas.height - 100 : 400;

const JUDGMENT_WINDOWS = {
    perfect: 0.05,
    great: 0.10,
    good: 0.20
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

const LANE_LABELS = ['S', 'D', 'F', '␣', 'J', 'K', 'L'];

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
let audioBuffer = null;
let startTime = 0;
let notes = [];
let currentSong = null;
let animationId = null;
let lastTimestamp = 0;
let songDuration = 0;

let judgmentStats = {
    perfect: 0,
    great: 0,
    good: 0,
    miss: 0,
    total: 0
};

// ============================================
// Song Library
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
// AUTO-GENERATE BEATMAP FROM BPM
// ============================================

function generateBeatmapFromBPM(bpm, durationSeconds = 90) {
    const notes = [];
    const beatInterval = 60 / bpm; // Time between beats in seconds
    
    // Calculate total beats
    const totalBeats = Math.floor(durationSeconds / beatInterval);
    
    // Patterns for more interesting gameplay
    const patterns = [
        [3], // Center only
        [0, 6], // Left and right edges
        [1, 5], // Inner edges
        [2, 4], // Inner middle
        [0, 3, 6], // Triple
        [0, 2, 4, 6], // Spread
        [1, 3, 5], // Pattern
        [0, 1, 5, 6], // Outer pattern
        [2, 3, 4], // Center cluster
        [0, 2, 5, 6] // Mixed
    ];
    
    for (let beat = 0; beat < totalBeats; beat++) {
        const time = beat * beatInterval + 0.5; // Start after 0.5 sec
        
        // Determine pattern based on beat position
        let lanesToAdd = [];
        
        if (beat % 16 < 4) {
            // Basic quarter notes
            lanesToAdd = [beat % LANE_COUNT];
        } else if (beat % 16 < 8) {
            // Eighth notes pattern
            const patternIndex = beat % patterns.length;
            lanesToAdd = patterns[patternIndex];
        } else if (beat % 16 < 12) {
            // Double notes
            const lane1 = beat % LANE_COUNT;
            const lane2 = LANE_COUNT - 1 - lane1;
            lanesToAdd = [lane1, lane2];
        } else {
            // Complex patterns for chorus
            const patternIndex = Math.floor(beat / 4) % patterns.length;
            lanesToAdd = patterns[patternIndex];
        }
        
        // Add the notes
        lanesToAdd.forEach(lane => {
            if (lane >= 0 && lane < LANE_COUNT) {
                notes.push({
                    time: time,
                    lane: lane,
                    type: 'tap'
                });
            }
        });
        
        // Add some 16th notes occasionally
        if (beat % 8 === 4 && beat < totalBeats - 1) {
            const nextTime = time + beatInterval / 2;
            const extraLane = (beat + 1) % LANE_COUNT;
            notes.push({
                time: nextTime,
                lane: extraLane,
                type: 'tap'
            });
        }
    }
    
    console.log(`Generated ${notes.length} notes for ${bpm} BPM song`);
    return {
        notes: notes,
        bpm: bpm,
        offset: 0.5,
        duration: durationSeconds
    };
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
    
    currentSong = song;
    
    // Auto-generate beatmap based on BPM
    const beatmap = generateBeatmapFromBPM(song.bpm, 90);
    
    notes = beatmap.notes.map(note => ({
        ...note,
        y: 0,
        hit: false,
        judged: false
    }));
    
    console.log(`Loaded ${notes.length} notes for ${song.title}`);
    
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
    if (!currentSong) return null;
    
    try {
        if (audioSource) {
            try { audioSource.stop(); } catch(e) {}
        }
        
        const audioCtx = await initAudio();
        
        // Try loading MP3
        let audioUrl = currentSong.audioUrl;
        let response = await fetch(audioUrl);
        
        if (!response.ok && currentSong.audioUrlFallback) {
            audioUrl = currentSong.audioUrlFallback;
            response = await fetch(audioUrl);
        }
        
        if (!response.ok) {
            console.warn('Audio file not found, playing with visual only');
            startTime = performance.now() / 1000 + 0.5;
            songDuration = 90;
            return startTime;
        }
        
        const arrayBuffer = await response.arrayBuffer();
        audioBuffer = await audioCtx.decodeAudioData(arrayBuffer);
        songDuration = audioBuffer.duration;
        
        audioSource = audioCtx.createBufferSource();
        audioSource.buffer = audioBuffer;
        audioSource.connect(audioCtx.destination);
        
        startTime = audioCtx.currentTime + 0.1;
        audioSource.start(startTime);
        
        console.log(`Audio loaded: ${audioBuffer.duration} seconds`);
        return startTime;
        
    } catch (error) {
        console.error('Error loading audio:', error);
        startTime = performance.now() / 1000 + 0.5;
        songDuration = 90;
        return startTime;
    }
}

// ============================================
// Game Functions
// ============================================

async function startSong() {
    // Reset game state
    score = 0;
    combo = 0;
    maxCombo = 0;
    judgmentStats = { perfect: 0, great: 0, good: 0, miss: 0, total: 0 };
    
    gameActive = true;
    gameStarted = false;
    
    // Reset UI
    if (scoreSpan) scoreSpan.textContent = '0';
    if (comboSpan) comboSpan.textContent = '0';
    if (maxComboSpan) maxComboSpan.textContent = '0';
    if (accuracySpan) accuracySpan.textContent = '0';
    if (comboIndicator) comboIndicator.textContent = '';
    if (judgmentDiv) judgmentDiv.textContent = '';
    
    // Reset notes positions
    notes.forEach(note => {
        note.hit = false;
        note.judged = false;
        note.y = 0;
    });
    
    // Load and play audio
    await loadAndPlaySong();
    
    // Start animation loop
    if (animationId) cancelAnimationFrame(animationId);
    lastTimestamp = performance.now() / 1000;
    animationId = requestAnimationFrame(updateGame);
    
    // Game starts after a short delay
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
    if (!gameStarted && songTime > 0.2) {
        gameStarted = true;
    }
    
    if (gameStarted) {
        // Update note positions based on song time
        updateNotePositions(songTime, deltaTime);
        
        // Check for missed notes
        checkMissedNotes(songTime);
    }
    
    // Draw everything
    drawGame(songTime);
    
    // Check if song ended
    if (gameStarted && songTime > songDuration + 3) {
        endSong();
        return;
    }
    
    animationId = requestAnimationFrame(updateGame);
}

function updateNotePositions(songTime, deltaTime) {
    // Calculate note positions based on their target time
    notes.forEach(note => {
        if (!note.hit && !note.judged) {
            const timeUntilHit = note.time - songTime;
            // Position: starts from top (y=0) when timeUntilHit = ~1.5 seconds
            // Reaches hit zone when timeUntilHit = 0
            const yPosition = (1.5 - timeUntilHit) * SCROLL_SPEED;
            note.y = yPosition;
        }
    });
}

function checkMissedNotes(songTime) {
    notes.forEach(note => {
        if (!note.hit && !note.judged && note.time + 0.2 < songTime) {
            // Note passed the hit time without being hit
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
    
    // Find the closest unjudged note in this lane
    notes.forEach(note => {
        if (!note.judged && !note.hit && note.lane === lane) {
            const distance = Math.abs(songTime - note.time);
            if (distance < closestDistance && distance <= JUDGMENT_WINDOWS.good) {
                closestDistance = distance;
                closestNote = note;
            }
        }
    });
    
    if (closestNote) {
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
    }
}

function updateUI() {
    if (scoreSpan) scoreSpan.textContent = Math.floor(score);
    if (comboSpan) comboSpan.textContent = combo;
    if (maxComboSpan) maxComboSpan.textContent = maxCombo;
    
    if (comboIndicator) {
        comboIndicator.textContent = combo >= 10 ? `${combo} COMBO! 🔥` : '';
        if (combo >= 50) comboIndicator.style.color = '#ffd700';
        else if (combo >= 25) comboIndicator.style.color = '#ff6b6b';
        else comboIndicator.style.color = '#00dfff';
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
    
    // Draw background gradient
    const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
    gradient.addColorStop(0, '#0a0a1a');
    gradient.addColorStop(1, '#1a1a2e');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Draw lanes
    for (let i = 0; i < LANE_COUNT; i++) {
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
        ctx.lineWidth = 1;
        ctx.strokeRect(i * LANE_WIDTH, 0, LANE_WIDTH, canvas.height);
        
        // Lane number indicator
        ctx.fillStyle = LANE_COLORS[i];
        ctx.font = 'bold 18px Poppins';
        ctx.textAlign = 'center';
        ctx.fillText(LANE_LABELS[i], i * LANE_WIDTH + LANE_WIDTH / 2, canvas.height - 15);
    }
    
    // Draw hit zone with glow
    ctx.fillStyle = 'rgba(210, 145, 223, 0.15)';
    ctx.fillRect(0, HIT_Y - 40, canvas.width, 80);
    
    ctx.shadowBlur = 10;
    ctx.shadowColor = '#d600d6';
    ctx.strokeStyle = '#d600d6';
    ctx.lineWidth = 3;
    ctx.strokeRect(0, HIT_Y - 40, canvas.width, 80);
    
    ctx.shadowBlur = 0;
    
    // Draw notes
    let visibleNotes = 0;
    notes.forEach(note => {
        if (!note.hit && note.y < canvas.height + 100 && note.y > -100) {
            visibleNotes++;
            const x = note.lane * LANE_WIDTH + LANE_WIDTH / 2;
            const y = note.y;
            
            // Note glow effect
            ctx.shadowBlur = 8;
            ctx.shadowColor = LANE_COLORS[note.lane];
            
            // Draw note body
            const gradient = ctx.createLinearGradient(x - 20, y - 15, x + 20, y + 15);
            gradient.addColorStop(0, LANE_COLORS[note.lane]);
            gradient.addColorStop(1, '#ffffff');
            
            ctx.fillStyle = gradient;
            ctx.beginPath();
            ctx.roundRect(x - 20, y - 15, 40, 30, 8);
            ctx.fill();
            
            // Note border
            ctx.strokeStyle = 'white';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.roundRect(x - 20, y - 15, 40, 30, 8);
            ctx.stroke();
            
            // Note label
            ctx.fillStyle = 'white';
            ctx.font = 'bold 16px Poppins';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(LANE_LABELS[note.lane], x, y);
            
            ctx.shadowBlur = 0;
        }
    });
    
    // Draw beat line that moves with the music
    const beatPhase = (songTime * (currentSong?.bpm || 120) / 60) % 1;
    const lineY = HIT_Y - 40 - beatPhase * 150;
    
    ctx.beginPath();
    ctx.moveTo(0, lineY);
    ctx.lineTo(canvas.width, lineY);
    ctx.strokeStyle = '#ffd700';
    ctx.lineWidth = 2;
    ctx.stroke();
    
    // Draw score on canvas
    ctx.fillStyle = 'white';
    ctx.font = 'bold 24px Poppins';
    ctx.textAlign = 'right';
    ctx.fillText(`Score: ${Math.floor(score)}`, canvas.width - 20, 50);
    
    ctx.font = '18px Poppins';
    ctx.fillStyle = '#00dfff';
    ctx.fillText(`Combo: ${combo}x`, canvas.width - 20, 90);
    
    if (maxCombo > 0) {
        ctx.fillStyle = '#ffd700';
        ctx.fillText(`Max: ${maxCombo}`, canvas.width - 20, 120);
    }
    
    // Show note count
    ctx.fillStyle = 'rgba(255,255,255,0.5)';
    ctx.font = '12px Poppins';
    ctx.fillText(`Notes: ${notes.length}`, canvas.width - 20, 150);
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
    const grade = accuracy >= 95 ? 'SS' : accuracy >= 90 ? 'S' : accuracy >= 80 ? 'A' : accuracy >= 70 ? 'B' : 'C';
    
    alert(`🎵 Song Complete!\n\nGrade: ${grade}\nScore: ${Math.floor(score)}\nMax Combo: ${maxCombo}x\nAccuracy: ${Math.floor(accuracy)}%\n\nPerfect: ${judgmentStats.perfect}\nGreat: ${judgmentStats.great}\nGood: ${judgmentStats.good}\nMiss: ${judgmentStats.miss}`);
    
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
    startSong();
}

// ============================================
// Authentication
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
            setTimeout(() => btn.classList.remove('active'), 100);
        });
        
        // Touch support for mobile
        btn.addEventListener('touchstart', (e) => {
            e.preventDefault();
            const lane = parseInt(btn.dataset.lane);
            handleTap(lane);
            btn.classList.add('active');
            setTimeout(() => btn.classList.remove('active'), 100);
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
        console.log('New high score saved!');
    }
}

// Keyboard support
document.addEventListener('keydown', (e) => {
    if (LANE_KEYS[e.code] !== undefined && gameSection?.style.display === 'block' && gameActive && gameStarted) {
        e.preventDefault();
        const lane = LANE_KEYS[e.code];
        handleTap(lane);
        
        const btn = document.querySelector(`.tap-btn[data-lane="${lane}"]`);
        if (btn) {
            btn.classList.add('active');
            setTimeout(() => btn.classList.remove('active'), 100);
        }
    }
});

console.log('O2Jam 7-Key Game loaded! Controls: S D F SPACE J K L');
console.log('Notes are auto-generated based on BPM!');