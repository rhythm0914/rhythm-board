// ============================================
// GAME AUTHENTICATION WITH LOCALSTORAGE
// Integrated with leaderboard-system.js
// ============================================

// Import the leaderboard system (loaded from global)
// The leaderboard-system.js should be loaded before this

let currentUser = null;
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

// Wait for leaderboard system to be ready
function waitForLeaderboard() {
    return new Promise((resolve) => {
        if (window.leaderboardSystem) {
            resolve(window.leaderboardSystem);
        } else {
            const checkInterval = setInterval(() => {
                if (window.leaderboardSystem) {
                    clearInterval(checkInterval);
                    resolve(window.leaderboardSystem);
                }
            }, 100);
        }
    });
}

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
function updateAuthUI() {
    if (currentUser) {
        if (userBar) {
            userBar.style.display = 'flex';
            userEmailSpan.textContent = currentUser.username || currentUser.email.split('@')[0];
        }
        if (showAuthBtn) showAuthBtn.style.display = 'none';
        
        const startBtn = document.querySelector('.btn--start');
        if (startBtn) startBtn.style.pointerEvents = 'auto';
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
        
        try {
            const user = await window.leaderboardSystem.login(email, password);
            currentUser = user;
            errorDiv.textContent = '';
            hideAuthModal();
            updateAuthUI();
        } catch (error) {
            errorDiv.textContent = 'Login failed: ' + error.message;
        }
    });
}

// Signup
if (signupForm) {
    signupForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const email = document.getElementById('signupEmail').value;
        const password = document.getElementById('signupPassword').value;
        const errorDiv = document.getElementById('signupError');
        
        if (password.length < 6) {
            errorDiv.textContent = 'Password must be at least 6 characters';
            return;
        }
        
        try {
            const user = await window.leaderboardSystem.signUp(email, password);
            currentUser = user;
            errorDiv.textContent = '';
            hideAuthModal();
            updateAuthUI();
        } catch (error) {
            errorDiv.textContent = 'Signup failed: ' + error.message;
        }
    });
}

// Logout
if (logoutBtn) {
    logoutBtn.addEventListener('click', async () => {
        window.leaderboardSystem.logout();
        currentUser = null;
        gameScoreSaved = false;
        updateAuthUI();
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

// Close modal on outside click
if (authModal) {
    authModal.addEventListener('click', (e) => {
        if (e.target === authModal) hideAuthModal();
    });
}

// Initialize auth state
async function initAuth() {
    await waitForLeaderboard();
    currentUser = window.leaderboardSystem.getCurrentUserInfo();
    updateAuthUI();
}

// Save score to leaderboard (called from script.js)
window.saveScoreToLeaderboard = async function(score, hits) {
    if (!currentUser) {
        console.log('Guest play - score not saved to leaderboard');
        return false;
    }
    
    if (gameScoreSaved) return false;
    
    try {
        const saved = window.leaderboardSystem.saveScore(score, hits);
        if (saved) {
            gameScoreSaved = true;
            console.log('Score saved to leaderboard:', Math.floor(score));
            
            // Show success message
            const summaryResult = document.querySelector('.summary__result');
            if (summaryResult) {
                const scoreSavedMsg = document.createElement('div');
                scoreSavedMsg.className = 'score-saved-message';
                scoreSavedMsg.innerHTML = '✅ Score saved to leaderboard!';
                scoreSavedMsg.style.cssText = `
                    position: absolute;
                    bottom: -40px;
                    left: 0;
                    right: 0;
                    text-align: center;
                    font-size: 0.8rem;
                    color: #00e5b5;
                    animation: fadeUp 0.5s ease;
                `;
                summaryResult.appendChild(scoreSavedMsg);
                setTimeout(() => scoreSavedMsg.remove(), 3000);
            }
        }
        return true;
    } catch (error) {
        console.error('Error saving score:', error);
        return false;
    }
};

window.resetScoreSavedFlag = function() {
    gameScoreSaved = false;
};

window.getCurrentUser = function() {
    return currentUser;
};

// Start initialization
initAuth();

console.log('Game Auth initialized with localStorage leaderboard!');