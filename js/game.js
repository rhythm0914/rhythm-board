import { 
    auth, db, 
    createUserWithEmailAndPassword, 
    signInWithEmailAndPassword, 
    signOut, 
    onAuthStateChanged,
    doc, getDoc, setDoc, updateDoc,
    collection, addDoc, query, orderBy, limit, getDocs
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
    canvas.width = 1000;
    canvas.height = 500;
}

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

// Note system
let notes = [];
let currentSong = null;
let currentBeatmap = null;
let judgmentStats = {
    perfect: 0,
    great: 0,
    good: 0,
    miss: 0,
    total: 0
};

const SCROLL_SPEED = 300; // pixels per second
const HIT_Y = canvas ? canvas.height - 100 : 400;
const LANE_WIDTH = canvas ? canvas.width / 4 : 250;

const JUDGMENT_WINDOWS = {
    perfect: 0.05,  // 50ms
    great: 0.10,    // 100ms
    good: 0.20      // 200ms
};

const JUDGMENT_SCORES = {
    perfect: 100,
    great: 50,
    good: 25,
    miss: 0
};

let animationId = null;
let lastTimestamp = 0;

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
        coverEmoji: '🦋',
        beatmap: null // Will be loaded dynamically
    },
    {
        id: 'canon-rock',
        title: 'Canon Rock',
        artist: 'JerryC',
        difficulty: 'Expert',
        bpm: 160,
        audioUrl: 'songs/canon-rock/song.mp3',
        audioUrlFallback: 'songs/canon-rock/song.ogg',
        coverEmoji: '🎸',
        beatmap: null
    },
    {
        id: 'electro-classic',
        title: 'Electro Classic',
        artist: 'O2Jam',
        difficulty: 'Normal',
        bpm: 128,
        audioUrl: 'songs/electro-classic/song.mp3',
        audioUrlFallback: 'songs/electro-classic/song.ogg',
        coverEmoji: '⚡',
        beatmap: null
    }
];

// ============================================
// Beatmap Loader
// ============================================

async function loadBeatmap(songId) {
    try {
        const response = await fetch(`songs/${songId}/beatmap.json`);
        const beatmap = await response.json();
        return beatmap;
    } catch (error) {
        console.error('Error loading beatmap:', error);
        // Generate default beatmap if file doesn't exist
        return generateDefaultBeatmap();
    }
}

function generateDefaultBeatmap() {
    const notes = [];
    // Generate a simple beatmap for demonstration
    for (let i = 0; i < 100; i++) {
        notes.push({
            time: i * 0.5, // Every half second
            lane: Math.floor(Math.random() * 4),
            type: 'tap'
        });
    }
    return { notes, bpm: 140, offset: 0.5 };
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
    
    // Load beatmap
    const beatmap = await loadBeatmap(song.id);
    currentBeatmap = beatmap;
    currentSong = song;
    
    // Convert beatmap notes to game notes
    notes = currentBeatmap.notes.map(note => ({
        ...note,
        y: 0,
        hit: false,
        judged: false
    }));
    
    // Show game section
    songSelection.style.display = 'none';
    gameSection.style.display = 'block';
    
    // Update song info display
    const songInfoDisplay = document.getElementById('song-info-display');
    if (songInfoDisplay) {
        songInfoDisplay.innerHTML = `🎵 ${song.title} - ${song.artist} | ${song.bpm} BPM 🎵`;
    }
    
    // Start the game
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
        
        const audioContext = await initAudio();
        
        // Try loading MP3 first, then OGG
        let audioUrl = currentSong.audioUrl;
        let response = await fetch(audioUrl);
        
        if (!response.ok && currentSong.audioUrlFallback) {
            audioUrl = currentSong.audioUrlFallback;
            response = await fetch(audioUrl);
        }
        
        if (!response.ok) {
            throw new Error('Audio file not found');
        }
        
        const arrayBuffer = await response.arrayBuffer();
        const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
        
        audioSource = audioContext.createBufferSource();
        audioSource.buffer = audioBuffer;
        audioSource.connect(audioContext.destination);
        
        startTime = audioContext.currentTime + 0.1;
        audioSource.start(startTime);
        
        return startTime;
    } catch (error) {
        console.error('Error loading audio:', error);
        // Play without audio if file not found
        startTime = performance.now() / 1000 + 0.1;
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
    judgmentStats = {
        perfect: 0,
        great: 0,
        good: 0,
        miss: 0,
        total: 0
    };
    
    gameActive = true;
    gameStarted = false;
    
    if (scoreSpan) scoreSpan.textContent = score;
    if (comboSpan) comboSpan.textContent = combo;
    if (comboIndicator) comboIndicator.textContent = '';
    if (judgmentDiv) judgmentDiv.textContent = '';
    
    // Reset notes hit status
    notes.forEach(note => {
        note.hit = false;
        note.judged = false;
    });
    
    // Load and play song
    const audioStartTime = await loadAndPlaySong();
    startTime = audioStartTime;
    
    // Start animation
    if (animationId) cancelAnimationFrame(animationId);
    lastTimestamp = performance.now() / 1000;
    animationId = requestAnimationFrame(updateGame);
    
    // Set game started after a short delay
    setTimeout(() => {
        gameStarted = true;
        console.log('Game started!');
    }, 100);
}

function updateGame(timestamp) {
    if (!gameActive) return;
    
    const currentTime = performance.now() / 1000;
    const deltaTime = Math.min(0.033, currentTime - lastTimestamp);
    lastTimestamp = currentTime;
    
    // Calculate song time
    let songTime = currentTime - startTime;
    if (!gameStarted && songTime > 0) {
        gameStarted = true;
    }
    
    // Update note positions
    updateNotePositions(deltaTime);
    
    // Check for missed notes
    checkMissedNotes(songTime);
    
    // Draw everything
    drawGame(songTime);
    
    // Check if song ended
    if (gameStarted && songTime > (currentBeatmap?.duration || 60) + 5) {
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
        if (!note.hit && !note.judged && note.y > HIT_Y + 50) {
            // Note passed the hit zone without being hit
            note.judged = true;
            judgmentStats.miss++;
            judgmentStats.total++;
            combo = 0;
            updateComboDisplay();
            showJudgment('miss', 0);
        }
    });
}

function handleTap(lane) {
    if (!gameActive || !gameStarted) return;
    
    const currentTime = performance.now() / 1000;
    let songTime = currentTime - startTime;
    
    let closestNote = null;
    let closestDistance = Infinity;
    
    // Find the closest unjudged note in this lane
    notes.forEach(note => {
        if (!note.judged && !note.hit && note.lane === lane) {
            const noteTime = note.time;
            const distance = Math.abs(songTime - noteTime);
            
            if (distance < closestDistance) {
                closestDistance = distance;
                closestNote = note;
            }
        }
    });
    
    if (closestNote && closestDistance <= JUDGMENT_WINDOWS.good) {
        // Hit the note!
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
            
            if (scoreSpan) scoreSpan.textContent = Math.floor(score);
            if (comboSpan) comboSpan.textContent = combo;
            
            updateComboDisplay();
            showJudgment(judgment, multiplier);
            
            // Mark note as hit
            closestNote.hit = true;
            closestNote.judged = true;
            
            // Save high score if needed
            if (score > highScore) {
                saveHighScore();
            }
            
            // Update accuracy
            updateAccuracy();
        }
    } else {
        // Miss - no close note
        combo = 0;
        updateComboDisplay();
        showJudgment('miss', 0);
    }
}

function updateAccuracy() {
    if (judgmentStats.total === 0) return;
    
    const totalPoints = (judgmentStats.perfect * 100) + 
                        (judgmentStats.great * 50) + 
                        (judgmentStats.good * 25);
    const maxPoints = judgmentStats.total * 100;
    const accuracy = (totalPoints / maxPoints) * 100;
    
    if (accuracySpan) accuracySpan.textContent = Math.floor(accuracy);
}

function updateComboDisplay() {
    if (comboIndicator) {
        if (combo >= 10) {
            comboIndicator.textContent = `${combo} COMBO! 🔥`;
            comboIndicator.style.fontSize = '1.2rem';
        } else {
            comboIndicator.textContent = '';
        }
    }
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
    
    // Draw background grid
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
    ctx.lineWidth = 1;
    for (let i = 0; i <= 4; i++) {
        const x = i * LANE_WIDTH;
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, canvas.height);
        ctx.stroke();
    }
    
    // Draw lane labels
    ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
    ctx.font = '24px Poppins';
    ctx.textAlign = 'center';
    const labels = ['←', '↓', '↑', '→'];
    for (let i = 0; i < 4; i++) {
        ctx.fillText(labels[i], i * LANE_WIDTH + LANE_WIDTH / 2, canvas.height - 60);
    }
    
    // Draw hit zone
    ctx.fillStyle = 'rgba(210, 145, 223, 0.15)';
    ctx.fillRect(0, HIT_Y - 30, canvas.width, 60);
    ctx.strokeStyle = '#d600d6';
    ctx.lineWidth = 3;
    ctx.strokeRect(0, HIT_Y - 30, canvas.width, 60);
    
    // Draw glow effect on hit zone
    ctx.shadowBlur = 15;
    ctx.shadowColor = '#00dfff';
    ctx.strokeStyle = '#00dfff';
    ctx.strokeRect(0, HIT_Y - 30, canvas.width, 60);
    ctx.shadowBlur = 0;
    
    // Draw notes
    notes.forEach(note => {
        if (!note.hit && note.y < canvas.height + 50) {
            const x = note.lane * LANE_WIDTH + LANE_WIDTH / 2;
            const y = note.y;
            
            // Note glow
            ctx.shadowBlur = 10;
            ctx.shadowColor = '#d600d6';
            
            // Draw note
            const gradient = ctx.createLinearGradient(x - 20, y - 15, x + 20, y + 15);
            gradient.addColorStop(0, '#d600d6');
            gradient.addColorStop(1, '#00dfff');
            
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
            
            // Note arrow
            ctx.fillStyle = 'white';
            ctx.font = '20px Poppins';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(labels[note.lane], x, y);
            
            ctx.shadowBlur = 0;
        }
    });
    
    // Draw beat line animation
    const beatPhase = (songTime * (currentSong?.bpm || 120) / 60) % 1;
    const lineY = HIT_Y - 30 - beatPhase * 100;
    ctx.beginPath();
    ctx.moveTo(0, lineY);
    ctx.lineTo(canvas.width, lineY);
    ctx.strokeStyle = '#ffd700';
    ctx.lineWidth = 2;
    ctx.stroke();
    
    // Draw score text
    ctx.fillStyle = 'white';
    ctx.font = 'bold 24px Poppins';
    ctx.textAlign = 'right';
    ctx.fillText(`Score: ${Math.floor(score)}`, canvas.width - 20, 50);
    
    ctx.font = '18px Poppins';
    ctx.fillStyle = '#00dfff';
    ctx.fillText(`Combo: ${combo}`, canvas.width - 20, 90);
    
    if (maxCombo > 0) {
        ctx.fillStyle = '#ffd700';
        ctx.fillText(`Max Combo: ${maxCombo}`, canvas.width - 20, 120);
    }
}

// Helper for rounded rectangles
if (!CanvasRenderingContext2D.prototype.roundRect) {
    CanvasRenderingContext2D.prototype.roundRect = function(x, y, w, h, r) {
        if (w < 2 * r) r = w / 2;
        if (h < 2 * r) r = h / 2;
        this.moveTo(x+r, y);
        this.lineTo(x+w-r, y);
        this.quadraticCurveTo(x+w, y, x+w, y+r);
        this.lineTo(x+w, y+h-r);
        this.quadraticCurveTo(x+w, y+h, x+w-r, y+h);
        this.lineTo(x+r, y+h);
        this.quadraticCurveTo(x, y+h, x, y+h-r);
        this.lineTo(x, y+r);
        this.quadraticCurveTo(x, y, x+r, y);
        return this;
    };
}

function endSong() {
    gameActive = false;
    if (animationId) cancelAnimationFrame(animationId);
    
    // Calculate final stats
    const totalNotes = judgmentStats.total;
    const maxScore = totalNotes * 100;
    const achievedScore = (judgmentStats.perfect * 100) + 
                         (judgmentStats.great * 50) + 
                         (judgmentStats.good * 25);
    const finalAccuracy = totalNotes > 0 ? (achievedScore / maxScore) * 100 : 0;
    
    alert(`Song Complete! 🎵\n\nScore: ${Math.floor(score)}\nMax Combo: ${maxCombo}x\nAccuracy: ${Math.floor(finalAccuracy)}%\n\nPerfect: ${judgmentStats.perfect}\nGreat: ${judgmentStats.great}\nGood: ${judgmentStats.good}\nMiss: ${judgmentStats.miss}`);
    
    // Return to song selection
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
    // Stop current audio
    if (audioSource) {
        try { audioSource.stop(); } catch(e) {}
    }
    
    // Reset notes
    if (currentBeatmap) {
        notes = currentBeatmap.notes.map(note => ({
            ...note,
            y: 0,
            hit: false,
            judged: false
        }));
    }
    
    // Restart the song
    startSong();
}

// ============================================
// Authentication Functions
// ============================================

// ... (keep your existing authentication code from previous game.js)
// I'll include the auth code here but shortened for brevity

document.addEventListener('DOMContentLoaded', () => {
    console.log('DOM fully loaded');
    
    // Tab switching
    const tabBtns = document.querySelectorAll('.tab-btn');
    tabBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            const tab = btn.dataset.tab;
            tabBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            document.querySelectorAll('.auth-form').forEach(form => form.classList.remove('active'));
            const formToShow = document.getElementById(`${tab}-form`);
            if (formToShow) formToShow.classList.add('active');
        });
    });

    // Login form
    const loginForm = document.getElementById('login-form');
    if (loginForm) {
        loginForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const email = document.getElementById('login-email').value;
            const password = document.getElementById('login-password').value;
            const errorDiv = document.getElementById('auth-error');
            
            try {
                await signInWithEmailAndPassword(auth, email, password);
                errorDiv.style.color = '#00ff00';
                errorDiv.textContent = 'Login successful!';
                document.getElementById('login-email').value = '';
                document.getElementById('login-password').value = '';
            } catch (error) {
                errorDiv.style.color = '#ff4444';
                errorDiv.textContent = 'Login failed: ' + error.message;
            }
        });
    }

    // Signup form
    const signupForm = document.getElementById('signup-form');
    if (signupForm) {
        signupForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const email = document.getElementById('signup-email').value;
            const password = document.getElementById('signup-password').value;
            const errorDiv = document.getElementById('auth-error');
            
            if (password.length < 6) {
                errorDiv.style.color = '#ff4444';
                errorDiv.textContent = 'Password must be at least 6 characters long.';
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
                errorDiv.textContent = 'Account created successfully!';
            } catch (error) {
                errorDiv.style.color = '#ff4444';
                errorDiv.textContent = 'Signup failed: ' + error.message;
            }
        });
    }

    // Restart button
    if (restartBtn) {
        restartBtn.addEventListener('click', () => {
            resetCurrentSong();
        });
    }
    
    // Exit button
    if (exitSongBtn) {
        exitSongBtn.addEventListener('click', () => {
            exitToSongSelection();
        });
    }
    
    // Logout from songs screen
    const logoutFromSongs = document.getElementById('logout-from-songs');
    if (logoutFromSongs) {
        logoutFromSongs.addEventListener('click', async () => {
            await signOut(auth);
        });
    }

    // Tap buttons
    const tapBtns = document.querySelectorAll('.tap-btn');
    tapBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            const lane = parseInt(btn.dataset.lane);
            handleTap(lane);
            btn.classList.add('active');
            setTimeout(() => btn.classList.remove('active'), 100);
        });
        
        btn.addEventListener('touchstart', (e) => {
            e.preventDefault();
            const lane = parseInt(btn.dataset.lane);
            handleTap(lane);
            btn.classList.add('active');
            setTimeout(() => btn.classList.remove('active'), 100);
        });
    });
});

// Auth state listener
onAuthStateChanged(auth, (user) => {
    console.log('Auth state changed:', user ? 'Logged in' : 'Logged out');
    
    if (user) {
        currentUserId = user.uid;
        if (userEmailSpan) userEmailSpan.textContent = user.email;
        if (songSelectionEmail) songSelectionEmail.textContent = user.email;
        if (authSection) authSection.style.display = 'none';
        if (songSelection) {
            songSelection.style.display = 'block';
            displaySongs();
        }
        loadUserHighScore();
    } else {
        currentUserId = null;
        if (authSection) authSection.style.display = 'block';
        if (songSelection) songSelection.style.display = 'none';
        if (gameSection) gameSection.style.display = 'none';
    }
});

async function loadUserHighScore() {
    if (!currentUserId) return;
    
    try {
        const userDoc = await getDoc(doc(db, 'users', currentUserId));
        if (userDoc.exists()) {
            highScore = userDoc.data().highScore || 0;
            if (highScoreSpan) highScoreSpan.textContent = highScore;
        }
    } catch (error) {
        console.error('Error loading high score:', error);
    }
}

async function saveHighScore() {
    if (!currentUserId) return;
    
    if (score > highScore) {
        highScore = score;
        if (highScoreSpan) highScoreSpan.textContent = Math.floor(highScore);
        
        try {
            await updateDoc(doc(db, 'users', currentUserId), {
                highScore: Math.floor(highScore),
                lastUpdated: new Date().toISOString()
            });
            
            await addDoc(collection(db, 'leaderboard'), {
                userId: currentUserId,
                email: auth.currentUser.email,
                score: Math.floor(score),
                date: new Date().toISOString()
            });
            
            console.log('High score saved:', highScore);
        } catch (error) {
            console.error('Error saving high score:', error);
        }
    }
}

// Keyboard support
document.addEventListener('keydown', (e) => {
    const keyMap = {
        'ArrowLeft': 0, 'ArrowDown': 1, 'ArrowUp': 2, 'ArrowRight': 3,
        'a': 0, 's': 1, 'w': 2, 'd': 3
    };
    
    if (keyMap[e.key] !== undefined && gameSection && gameSection.style.display === 'block' && gameActive) {
        e.preventDefault();
        handleTap(keyMap[e.key]);
        
        const btn = document.querySelector(`.tap-btn[data-lane="${keyMap[e.key]}"]`);
        if (btn) {
            btn.classList.add('active');
            setTimeout(() => btn.classList.remove('active'), 100);
        }
    }
});

console.log('O2Jam Style Game loaded successfully!');