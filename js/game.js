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
const gameSection = document.getElementById('game-section');
const userEmailSpan = document.getElementById('user-email');
const scoreSpan = document.getElementById('score');
const comboSpan = document.getElementById('combo');
const highScoreSpan = document.getElementById('high-score');
const judgmentDiv = document.getElementById('judgment');
const canvas = document.getElementById('game-canvas');
const ctx = canvas.getContext('2d');
const restartBtn = document.getElementById('restart-btn');

// ============================================
// Game Variables
// ============================================

let score = 0;
let combo = 0;
let highScore = 0;
let currentUserId = null;
let gameActive = true;
let currentBeat = 0;
let lastTapTime = 0;
let animationId = null;

// Rhythm parameters
const BPM = 120;
const BEAT_INTERVAL = 60 / BPM;
const JUDGMENT_WINDOWS = {
    perfect: 0.05,
    great: 0.10,
    good: 0.20
};

let beatInterval = null;

// Canvas dimensions
canvas.width = 800;
canvas.height = 400;

// ============================================
// Authentication Functions
// ============================================

// Tab switching
document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        const tab = btn.dataset.tab;
        document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        document.querySelectorAll('.auth-form').forEach(form => form.classList.remove('active'));
        document.getElementById(`${tab}-form`).classList.add('active');
    });
});

// Login
document.getElementById('login-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = document.getElementById('login-email').value;
    const password = document.getElementById('login-password').value;
    const errorDiv = document.getElementById('auth-error');
    
    try {
        await signInWithEmailAndPassword(auth, email, password);
        errorDiv.textContent = '';
        document.getElementById('login-email').value = '';
        document.getElementById('login-password').value = '';
    } catch (error) {
        errorDiv.textContent = 'Login failed: ' + error.message;
    }
});

// Signup
document.getElementById('signup-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = document.getElementById('signup-email').value;
    const password = document.getElementById('signup-password').value;
    const errorDiv = document.getElementById('auth-error');
    
    try {
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        await setDoc(doc(db, 'users', userCredential.user.uid), {
            email: email,
            highScore: 0,
            createdAt: new Date().toISOString()
        });
        errorDiv.textContent = '';
        document.getElementById('signup-email').value = '';
        document.getElementById('signup-password').value = '';
    } catch (error) {
        errorDiv.textContent = 'Signup failed: ' + error.message;
    }
});

// Logout
document.getElementById('logout-btn').addEventListener('click', async () => {
    await signOut(auth);
    resetGame();
});

// Auth state listener
onAuthStateChanged(auth, (user) => {
    if (user) {
        currentUserId = user.uid;
        userEmailSpan.textContent = user.email;
        authSection.style.display = 'none';
        gameSection.style.display = 'block';
        loadUserHighScore();
        startGame();
    } else {
        currentUserId = null;
        authSection.style.display = 'block';
        gameSection.style.display = 'none';
        if (beatInterval) clearInterval(beatInterval);
        if (animationId) cancelAnimationFrame(animationId);
    }
});

// Load user's high score
async function loadUserHighScore() {
    if (!currentUserId) return;
    
    try {
        const userDoc = await getDoc(doc(db, 'users', currentUserId));
        if (userDoc.exists()) {
            highScore = userDoc.data().highScore || 0;
            highScoreSpan.textContent = highScore;
        }
    } catch (error) {
        console.error('Error loading high score:', error);
    }
}

// Save high score
async function saveHighScore() {
    if (!currentUserId) return;
    
    if (score > highScore) {
        highScore = score;
        highScoreSpan.textContent = highScore;
        
        try {
            await updateDoc(doc(db, 'users', currentUserId), {
                highScore: highScore,
                lastUpdated: new Date().toISOString()
            });
            
            // Add to leaderboard
            await addDoc(collection(db, 'leaderboard'), {
                userId: currentUserId,
                email: auth.currentUser.email,
                score: score,
                date: new Date().toISOString()
            });
        } catch (error) {
            console.error('Error saving high score:', error);
        }
    }
}

// ============================================
// Game Functions
// ============================================

function startGame() {
    gameActive = true;
    score = 0;
    combo = 0;
    currentBeat = 0;
    scoreSpan.textContent = score;
    comboSpan.textContent = combo;
    judgmentDiv.textContent = '';
    
    if (beatInterval) clearInterval(beatInterval);
    
    beatInterval = setInterval(() => {
        if (gameActive) {
            currentBeat++;
            drawGame();
        }
    }, BEAT_INTERVAL * 1000);
    
    drawGame();
}

function resetGame() {
    gameActive = false;
    score = 0;
    combo = 0;
    currentBeat = 0;
    scoreSpan.textContent = score;
    comboSpan.textContent = combo;
    judgmentDiv.textContent = '';
    drawGame();
    startGame();
}

restartBtn.addEventListener('click', () => {
    resetGame();
});

function handleTap(lane) {
    if (!gameActive) return;
    
    const tapTime = performance.now() / 1000;
    const beatTime = currentBeat * BEAT_INTERVAL;
    const difference = Math.abs(tapTime - beatTime);
    
    let judgment = 'miss';
    let points = 0;
    
    if (difference <= JUDGMENT_WINDOWS.perfect) {
        judgment = 'perfect';
        points = 100;
    } else if (difference <= JUDGMENT_WINDOWS.great) {
        judgment = 'great';
        points = 50;
    } else if (difference <= JUDGMENT_WINDOWS.good) {
        judgment = 'good';
        points = 25;
    }
    
    if (judgment !== 'miss') {
        const multiplier = Math.floor(combo / 10) + 1;
        const finalPoints = points * multiplier;
        
        score += finalPoints;
        combo++;
        scoreSpan.textContent = score;
        comboSpan.textContent = combo;
        
        showJudgment(judgment, multiplier);
        
        if (score > highScore) {
            saveHighScore();
        }
    } else {
        combo = 0;
        comboSpan.textContent = combo;
        showJudgment('miss', 0);
    }
    
    lastTapTime = tapTime;
    drawGame();
}

function showJudgment(judgment, multiplier) {
    judgmentDiv.textContent = judgment.toUpperCase();
    judgmentDiv.className = `judgment ${judgment}`;
    
    if (multiplier > 1) {
        judgmentDiv.textContent += ` x${multiplier}!`;
    }
    
    setTimeout(() => {
        if (judgmentDiv.textContent === judgment.toUpperCase() || 
            judgmentDiv.textContent.includes(judgment.toUpperCase())) {
            judgmentDiv.textContent = '';
            judgmentDiv.className = 'judgment';
        }
    }, 500);
}

function drawGame() {
    if (!ctx) return;
    
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Draw lanes
    const laneWidth = canvas.width / 4;
    for (let i = 0; i < 4; i++) {
        ctx.strokeStyle = '#a2dcda';
        ctx.lineWidth = 2;
        ctx.strokeRect(i * laneWidth, 0, laneWidth, canvas.height);
        
        // Draw lane labels
        ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
        ctx.font = '20px Poppins';
        ctx.textAlign = 'center';
        const labels = ['←', '↓', '↑', '→'];
        ctx.fillText(labels[i], i * laneWidth + laneWidth / 2, canvas.height - 30);
    }
    
    // Draw hit zone
    ctx.fillStyle = 'rgba(210, 145, 223, 0.2)';
    ctx.fillRect(0, canvas.height - 80, canvas.width, 80);
    ctx.strokeStyle = '#d600d6';
    ctx.lineWidth = 3;
    ctx.strokeRect(0, canvas.height - 80, canvas.width, 80);
    
    // Draw beat indicator
    const beatProgress = (currentBeat % 4) / 4;
    ctx.fillStyle = `rgba(0, 223, 255, ${0.2 + beatProgress * 0.3})`;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Draw beat line
    const lineY = canvas.height - 80 - (currentBeat % 4) * 20;
    ctx.beginPath();
    ctx.moveTo(0, lineY);
    ctx.lineTo(canvas.width, lineY);
    ctx.strokeStyle = '#ffd700';
    ctx.lineWidth = 3;
    ctx.stroke();
}

// ============================================
// Input Handlers
// ============================================

document.querySelectorAll('.tap-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        const lane = parseInt(btn.dataset.lane);
        handleTap(lane);
        
        // Visual feedback
        btn.style.transform = 'scale(0.9)';
        setTimeout(() => { btn.style.transform = ''; }, 100);
    });
    
    // Touch feedback for mobile
    btn.addEventListener('touchstart', (e) => {
        e.preventDefault();
        const lane = parseInt(btn.dataset.lane);
        handleTap(lane);
        btn.style.transform = 'scale(0.9)';
        setTimeout(() => { btn.style.transform = ''; }, 100);
    });
});

// Keyboard support
document.addEventListener('keydown', (e) => {
    const keyMap = {
        'ArrowLeft': 0, 'ArrowDown': 1, 'ArrowUp': 2, 'ArrowRight': 3,
        'a': 0, 's': 1, 'w': 2, 'd': 3
    };
    
    if (keyMap[e.key] !== undefined) {
        e.preventDefault();
        handleTap(keyMap[e.key]);
        
        // Visual feedback for keyboard
        const btn = document.querySelector(`.tap-btn[data-lane="${keyMap[e.key]}"]`);
        if (btn) {
            btn.style.transform = 'scale(0.9)';
            setTimeout(() => { btn.style.transform = ''; }, 100);
        }
    }
});

// Initial draw
drawGame();