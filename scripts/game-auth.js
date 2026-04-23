// ============================================
// GAME AUTHENTICATION WITH FIREBASE
// Integrated with firebase-leaderboard.js
// ============================================

import './firebase-leaderboard.js';

let gameScoreSaved = false;

// DOM Elements
const authModal = document.getElementById('authModal');
const showAuthBtn = document.getElementById('showAuthBtn');
const authModalClose = document.getElementById('authModalClose');
const userBar = document.getElementById('userBar');
const userEmailSpan = document.getElementById('userEmail');
const logoutBtn = document.getElementById('logoutBtn');
const loginForm = document.getElementById('loginForm');
const signupForm = document.getElementById('signupForm');
const guestGameBtn = document.getElementById('guestGameBtn');
const authTabs = document.querySelectorAll('.auth-tab');
const authForms = document.querySelectorAll('.auth-form');

// Show auth modal
function showAuthModal() {
    if (authModal) authModal.classList.add('active');
}

function hideAuthModal() {
    if (authModal) authModal.classList.remove('active');
    const loginError = document.getElementById('loginError');
    const signupError = document.getElementById('signupError');
    if (loginError) loginError.textContent = '';
    if (signupError) signupError.textContent = '';
    if (loginForm) loginForm.reset();
    if (signupForm) signupForm.reset();
}

// Update UI based on auth state
async function updateAuthUI() {
    const user = await window.firebaseLeaderboard.getCurrentUser();
    
    if (user) {
        if (userBar) {
            userBar.style.display = 'flex';
            userEmailSpan.textContent = user.username;
        }
        if (showAuthBtn) showAuthBtn.style.display = 'none';
        
        const startBtn = document.querySelector('.btn--start');
        if (startBtn) startBtn.style.pointerEvents = 'auto';
        
        // Show welcome message
        const welcomeMsg = document.createElement('div');
        welcomeMsg.innerHTML = `🎵 Welcome ${user.username}! Your scores will be saved to leaderboard. 🎵`;
        welcomeMsg.style.cssText = `
            position: fixed;
            top: 70px;
            right: 20px;
            background: linear-gradient(135deg, #00e5b5, #00b894);
            color: #1a1a2e;
            padding: 8px 16px;
            border-radius: 50px;
            font-size: 0.8rem;
            font-weight: 500;
            animation: fadeUp 0.5s ease;
            z-index: 1000;
            box-shadow: 0 2px 10px rgba(0,0,0,0.2);
        `;
        document.body.appendChild(welcomeMsg);
        setTimeout(() => welcomeMsg.remove(), 4000);
    } else {
        if (userBar) userBar.style.display = 'none';
        if (showAuthBtn) showAuthBtn.style.display = 'block';
        
        const startBtn = document.querySelector('.btn--start');
        if (startBtn) startBtn.style.pointerEvents = 'auto';
    }
}

// Tab switching
if (authTabs.length) {
    authTabs.forEach(tab => {
        tab.addEventListener('click', () => {
            const tabName = tab.dataset.tab;
            authTabs.forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            authForms.forEach(form => form.classList.remove('active'));
            const targetForm = document.getElementById(`${tabName}Form`);
            if (targetForm) targetForm.classList.add('active');
        });
    });
}

// Login
if (loginForm) {
    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const email = document.getElementById('loginEmail').value;
        const password = document.getElementById('loginPassword').value;
        const errorDiv = document.getElementById('loginError');
        
        errorDiv.textContent = 'Logging in...';
        
        const result = await window.firebaseLeaderboard.login(email, password);
        
        if (result.success) {
            errorDiv.textContent = '';
            hideAuthModal();
            await updateAuthUI();
        } else {
            errorDiv.textContent = 'Login failed: ' + result.error;
        }
    });
}

// Signup
if (signupForm) {
    signupForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const email = document.getElementById('signupEmail').value;
        const password = document.getElementById('signupPassword').value;
        const username = email.split('@')[0];
        const errorDiv = document.getElementById('signupError');
        
        if (password.length < 6) {
            errorDiv.textContent = 'Password must be at least 6 characters';
            return;
        }
        
        errorDiv.textContent = 'Creating account...';
        
        const result = await window.firebaseLeaderboard.signUp(email, password, username);
        
        if (result.success) {
            errorDiv.textContent = '';
            hideAuthModal();
            await updateAuthUI();
        } else {
            errorDiv.textContent = 'Signup failed: ' + result.error;
        }
    });
}

// Logout
if (logoutBtn) {
    logoutBtn.addEventListener('click', async () => {
        await window.firebaseLeaderboard.logout();
        gameScoreSaved = false;
        await updateAuthUI();
    });
}

// Guest play
if (guestGameBtn) {
    guestGameBtn.addEventListener('click', () => {
        hideAuthModal();
        const startBtn = document.querySelector('.btn--start');
        if (startBtn) startBtn.style.pointerEvents = 'auto';
    });
}

if (showAuthBtn) {
    showAuthBtn.addEventListener('click', showAuthModal);
}

if (authModalClose) {
    authModalClose.addEventListener('click', hideAuthModal);
}

if (authModal) {
    authModal.addEventListener('click', (e) => {
        if (e.target === authModal) hideAuthModal();
    });
}

// Save score to Firebase leaderboard (called from script.js)
window.saveScoreToLeaderboard = async function(score, gameStats) {
    const user = await window.firebaseLeaderboard.getCurrentUser();
    
    if (!user) {
        console.log('Guest play - score not saved to leaderboard');
        return false;
    }
    
    if (gameScoreSaved) return false;
    
    try {
        const result = await window.firebaseLeaderboard.saveScore(score, gameStats);
        
        if (result.success) {
            gameScoreSaved = true;
            console.log('Score saved to Firebase leaderboard:', Math.floor(score));
            
            // Show success message
            const summaryResult = document.querySelector('.summary__result');
            if (summaryResult) {
                const message = result.isHighScore ? 
                    '🏆 NEW HIGH SCORE! Saved to leaderboard! 🏆' : 
                    '✅ Score saved to leaderboard!';
                
                const scoreSavedMsg = document.createElement('div');
                scoreSavedMsg.innerHTML = message;
                scoreSavedMsg.style.cssText = `
                    position: absolute;
                    bottom: -50px;
                    left: 0;
                    right: 0;
                    text-align: center;
                    font-size: 0.85rem;
                    color: #00e5b5;
                    font-weight: 500;
                    animation: fadeUp 0.5s ease;
                `;
                summaryResult.appendChild(scoreSavedMsg);
                setTimeout(() => scoreSavedMsg.remove(), 4000);
            }
        }
        return result.success;
    } catch (error) {
        console.error('Error saving score:', error);
        return false;
    }
};

window.resetScoreSavedFlag = function() {
    gameScoreSaved = false;
};

window.getCurrentUser = async function() {
    return await window.firebaseLeaderboard.getCurrentUser();
};

// Initialize
updateAuthUI();

console.log('Game Auth initialized with Firebase!');