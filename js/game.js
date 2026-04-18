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
const restartBtn = document.getElementById('restart-btn');

// Get canvas context
let ctx = null;
if (canvas) {
    ctx = canvas.getContext('2d');
    canvas.width = 800;
    canvas.height = 400;
}

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

// Rhythm parameters
const BPM = 120;
const BEAT_INTERVAL = 60 / BPM;
const JUDGMENT_WINDOWS = {
    perfect: 0.05,
    great: 0.10,
    good: 0.20
};

let beatInterval = null;

// ============================================
// Authentication Functions
// ============================================

// Wait for DOM to be fully loaded before attaching event listeners
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
            
            console.log('Attempting login for:', email);
            
            try {
                const userCredential = await signInWithEmailAndPassword(auth, email, password);
                console.log('Login successful!', userCredential.user.email);
                errorDiv.textContent = '';
                errorDiv.style.color = '#00ff00';
                errorDiv.textContent = 'Login successful! Redirecting...';
                document.getElementById('login-email').value = '';
                document.getElementById('login-password').value = '';
                
                // Clear success message after 2 seconds
                setTimeout(() => {
                    if (errorDiv) errorDiv.textContent = '';
                }, 2000);
            } catch (error) {
                console.error('Login error:', error.code, error.message);
                errorDiv.style.color = '#ff4444';
                let errorMessage = 'Login failed: ';
                switch (error.code) {
                    case 'auth/invalid-email':
                        errorMessage += 'Invalid email format.';
                        break;
                    case 'auth/user-not-found':
                        errorMessage += 'No account found with this email.';
                        break;
                    case 'auth/wrong-password':
                        errorMessage += 'Incorrect password.';
                        break;
                    default:
                        errorMessage += error.message;
                }
                errorDiv.textContent = errorMessage;
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
            
            console.log('Attempting signup for:', email);
            
            // Validate password strength
            if (password.length < 6) {
                errorDiv.style.color = '#ff4444';
                errorDiv.textContent = 'Password must be at least 6 characters long.';
                return;
            }
            
            try {
                const userCredential = await createUserWithEmailAndPassword(auth, email, password);
                console.log('Signup successful!', userCredential.user.email);
                
                // Create user document in Firestore
                await setDoc(doc(db, 'users', userCredential.user.uid), {
                    email: email,
                    highScore: 0,
                    createdAt: new Date().toISOString()
                });
                
                errorDiv.style.color = '#00ff00';
                errorDiv.textContent = 'Account created successfully! Redirecting...';
                document.getElementById('signup-email').value = '';
                document.getElementById('signup-password').value = '';
                
                setTimeout(() => {
                    if (errorDiv) errorDiv.textContent = '';
                }, 2000);
            } catch (error) {
                console.error('Signup error:', error.code, error.message);
                errorDiv.style.color = '#ff4444';
                let errorMessage = 'Signup failed: ';
                switch (error.code) {
                    case 'auth/email-already-in-use':
                        errorMessage += 'Email already registered. Please login instead.';
                        break;
                    case 'auth/invalid-email':
                        errorMessage += 'Invalid email format.';
                        break;
                    case 'auth/weak-password':
                        errorMessage += 'Password is too weak. Use at least 6 characters.';
                        break;
                    default:
                        errorMessage += error.message;
                }
                errorDiv.textContent = errorMessage;
            }
        });
    }

    // Logout button
    const logoutBtn = document.getElementById('logout-btn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', async () => {
            try {
                await signOut(auth);
                console.log('Logout successful');
                resetGame();
            } catch (error) {
                console.error('Logout error:', error);
            }
        });
    }

    // Restart button
    if (restartBtn) {
        restartBtn.addEventListener('click', () => {
            resetGame();
        });
    }

    // Tap buttons
    const tapBtns = document.querySelectorAll('.tap-btn');
    tapBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            const lane = parseInt(btn.dataset.lane);
            handleTap(lane);
            btn.style.transform = 'scale(0.9)';
            setTimeout(() => { btn.style.transform = ''; }, 100);
        });
        
        btn.addEventListener('touchstart', (e) => {
            e.preventDefault();
            const lane = parseInt(btn.dataset.lane);
            handleTap(lane);
            btn.style.transform = 'scale(0.9)';
            setTimeout(() => { btn.style.transform = ''; }, 100);
        });
    });
});

// ============================================
// Auth State Listener
// ============================================

onAuthStateChanged(auth, (user) => {
    console.log('Auth state changed:', user ? 'Logged in' : 'Logged out');
    
    if (user) {
        currentUserId = user.uid;
        if (userEmailSpan) userEmailSpan.textContent = user.email;
        if (authSection) authSection.style.display = 'none';
        if (gameSection) gameSection.style.display = 'block';
        loadUserHighScore();
        startGame();
    } else {
        currentUserId = null;
        if (authSection) authSection.style.display = 'block';
        if (gameSection) gameSection.style.display = 'none';
        if (beatInterval) clearInterval(beatInterval);
        resetGame();
    }
});

// ============================================
// Database Functions
// ============================================

async function loadUserHighScore() {
    if (!currentUserId) return;
    
    try {
        const userDoc = await getDoc(doc(db, 'users', currentUserId));
        if (userDoc.exists()) {
            highScore = userDoc.data().highScore || 0;
            if (highScoreSpan) highScoreSpan.textContent = highScore;
            console.log('Loaded high score:', highScore);
        }
    } catch (error) {
        console.error('Error loading high score:', error);
    }
}

async function saveHighScore() {
    if (!currentUserId) return;
    
    if (score > highScore) {
        highScore = score;
        if (highScoreSpan) highScoreSpan.textContent = highScore;
        
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
            
            console.log('High score saved:', highScore);
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
    if (scoreSpan) scoreSpan.textContent = score;
    if (comboSpan) comboSpan.textContent = combo;
    if (judgmentDiv) judgmentDiv.textContent = '';
    
    if (beatInterval) clearInterval(beatInterval);
    
    beatInterval = setInterval(() => {
        if (gameActive) {
            currentBeat++;
            drawGame();
        }
    }, BEAT_INTERVAL * 1000);
    
    drawGame();
    console.log('Game started');
}

function resetGame() {
    gameActive = false;
    score = 0;
    combo = 0;
    currentBeat = 0;
    if (scoreSpan) scoreSpan.textContent = score;
    if (comboSpan) comboSpan.textContent = combo;
    if (judgmentDiv) judgmentDiv.textContent = '';
    drawGame();
    if (gameSection && gameSection.style.display === 'block') {
        startGame();
    }
}

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
        if (scoreSpan) scoreSpan.textContent = score;
        if (comboSpan) comboSpan.textContent = combo;
        
        showJudgment(judgment, multiplier);
        
        if (score > highScore) {
            saveHighScore();
        }
    } else {
        combo = 0;
        if (comboSpan) comboSpan.textContent = combo;
        showJudgment('miss', 0);
    }
    
    lastTapTime = tapTime;
    drawGame();
}

function showJudgment(judgment, multiplier) {
    if (!judgmentDiv) return;
    
    judgmentDiv.textContent = judgment.toUpperCase();
    judgmentDiv.className = `judgment ${judgment}`;
    
    if (multiplier > 1) {
        judgmentDiv.textContent += ` x${multiplier}!`;
    }
    
    setTimeout(() => {
        if (judgmentDiv && (judgmentDiv.textContent === judgment.toUpperCase() || 
            judgmentDiv.textContent.includes(judgment.toUpperCase()))) {
            judgmentDiv.textContent = '';
            judgmentDiv.className = 'judgment';
        }
    }, 500);
}

function drawGame() {
    if (!ctx || !canvas) return;
    
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

// Keyboard support
document.addEventListener('keydown', (e) => {
    const keyMap = {
        'ArrowLeft': 0, 'ArrowDown': 1, 'ArrowUp': 2, 'ArrowRight': 3,
        'a': 0, 's': 1, 'w': 2, 'd': 3
    };
    
    if (keyMap[e.key] !== undefined && gameSection && gameSection.style.display === 'block') {
        e.preventDefault();
        handleTap(keyMap[e.key]);
        
        const btn = document.querySelector(`.tap-btn[data-lane="${keyMap[e.key]}"]`);
        if (btn) {
            btn.style.transform = 'scale(0.9)';
            setTimeout(() => { if (btn) btn.style.transform = ''; }, 100);
        }
    }
});

// Initial draw
drawGame();
console.log('Game.js loaded successfully');