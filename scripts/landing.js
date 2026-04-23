// Import leaderboard system
import { initializeApp } from 'https://www.gstatic.com/firebasejs/12.12.0/firebase-app.js';
import { getFirestore, collection, query, orderBy, limit, getDocs } from 'https://www.gstatic.com/firebasejs/12.12.0/firebase-firestore.js';

// Firebase Configuration (keep for backward compatibility)
const firebaseConfig = {
    apiKey: "AIzaSyBh6zf8BxTnJx4AOKPCm-VvgZplVhn9LRI",
    authDomain: "rhythm-board.firebaseapp.com",
    projectId: "rhythm-board",
    storageBucket: "rhythm-board.firebasestorage.app",
    messagingSenderId: "987190217216",
    appId: "1:987190217216:web:ea39da422b290dbf3626e5"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// DOM Elements
const particlesContainer = document.getElementById('particles');
const previewCanvas = document.getElementById('previewCanvas');
const mobileMenuBtn = document.getElementById('mobileMenuBtn');
const navLinks = document.querySelector('.nav-links');
const tapDemoBtns = document.querySelectorAll('.tap-demo-btn');
const leaderboardBody = document.getElementById('leaderboardBody');

// ============================================
// LEADERBOARD - Load from localStorage first, then Firebase
// ============================================

async function loadLeaderboard() {
    if (!leaderboardBody) return;
    
    console.log('Loading leaderboard...');
    
    // First, load from localStorage (our main leaderboard system)
    const localScores = getLocalLeaderboard();
    
    if (localScores.length > 0) {
        displayLeaderboard(localScores);
        updatePlayerCount(localScores);
    } else {
        leaderboardBody.innerHTML = `
            <div class="leaderboard-entry">
                <span colspan="4" style="text-align: center; grid-column: span 3;">No scores yet! Be the first to play! 🎵</span>
            </div>
        `;
    }
    
    // Also try to load from Firebase (optional, for cross-device sync)
    try {
        const firebaseScores = await loadFirebaseLeaderboard();
        if (firebaseScores.length > 0) {
            // Merge scores
            const mergedScores = mergeScores(localScores, firebaseScores);
            displayLeaderboard(mergedScores);
        }
    } catch (error) {
        console.log('Firebase leaderboard not available, using local only');
    }
}

function getLocalLeaderboard() {
    if (typeof window.leaderboardSystem !== 'undefined') {
        return window.leaderboardSystem.getLeaderboard(20);
    }
    
    // Fallback to localStorage directly
    const scores = localStorage.getItem('rhythm_scores');
    if (!scores) return [];
    
    const parsedScores = JSON.parse(scores);
    return parsedScores
        .sort((a, b) => b.score - a.score)
        .slice(0, 20)
        .map((entry, index) => ({
            rank: index + 1,
            username: entry.username,
            score: entry.score,
            date: formatDate(entry.date)
        }));
}

async function loadFirebaseLeaderboard() {
    try {
        const leaderboardRef = collection(db, 'leaderboard');
        const q = query(leaderboardRef, orderBy('score', 'desc'), limit(20));
        const querySnapshot = await getDocs(q);
        
        const scores = [];
        querySnapshot.forEach((doc) => {
            const data = doc.data();
            scores.push({
                username: data.email ? data.email.split('@')[0] : 'Player',
                score: data.score,
                date: formatDate(data.date),
                timestamp: new Date(data.date).getTime()
            });
        });
        return scores;
    } catch (error) {
        console.error('Error loading Firebase leaderboard:', error);
        return [];
    }
}

function mergeScores(localScores, firebaseScores) {
    const allScores = [...localScores, ...firebaseScores];
    const uniqueScores = new Map();
    
    allScores.forEach(score => {
        const key = `${score.username}_${score.score}`;
        if (!uniqueScores.has(key) || uniqueScores.get(key).timestamp < score.timestamp) {
            uniqueScores.set(key, score);
        }
    });
    
    return Array.from(uniqueScores.values())
        .sort((a, b) => b.score - a.score)
        .slice(0, 20)
        .map((score, index) => ({
            ...score,
            rank: index + 1
        }));
}

function displayLeaderboard(scores) {
    if (!leaderboardBody) return;
    
    if (scores.length === 0) {
        leaderboardBody.innerHTML = `
            <div class="leaderboard-entry">
                <span colspan="4" style="text-align: center; grid-column: span 3;">No scores yet! Be the first to play! 🎵</span>
            </div>
        `;
        return;
    }
    
    let leaderboardHTML = '';
    
    scores.forEach((entry) => {
        let rankDisplay = `#${entry.rank}`;
        let rankEmoji = '';
        
        if (entry.rank === 1) {
            rankDisplay = '#1';
            rankEmoji = '🏆 ';
        } else if (entry.rank === 2) {
            rankDisplay = '#2';
            rankEmoji = '🥈 ';
        } else if (entry.rank === 3) {
            rankDisplay = '#3';
            rankEmoji = '🥉 ';
        }
        
        const scoreFormatted = entry.score.toLocaleString();
        
        leaderboardHTML += `
            <div class="leaderboard-entry">
                <span class="rank">${rankDisplay}</span>
                <span>${rankEmoji}${escapeHtml(entry.username)}</span>
                <span>${scoreFormatted}</span>
                <span style="font-size: 0.75rem; opacity: 0.7;">${entry.date || 'Today'}</span>
            </div>
        `;
    });
    
    leaderboardBody.innerHTML = leaderboardHTML;
}

function updatePlayerCount(scores) {
    const playerCountSpan = document.getElementById('playerCount');
    if (!playerCountSpan) return;
    
    const uniquePlayers = new Set(scores.map(s => s.username));
    const count = uniquePlayers.size;
    
    if (count >= 1000) {
        playerCountSpan.textContent = Math.floor(count / 1000) + 'K+';
    } else if (count === 0) {
        playerCountSpan.textContent = '10K+';
    } else {
        playerCountSpan.textContent = count;
    }
}

function formatDate(dateString) {
    if (!dateString) return 'Today';
    const date = new Date(dateString);
    const now = new Date();
    const diffDays = Math.floor((now - date) / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays}d ago`;
    if (diffDays < 30) return `${Math.floor(diffDays / 7)}w ago`;
    return date.toLocaleDateString();
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// ============================================
// CREATE FLOATING PARTICLES
// ============================================

function createParticles() {
    if (!particlesContainer) return;
    
    const particleCount = window.innerWidth < 768 ? 30 : 50;
    
    for (let i = 0; i < particleCount; i++) {
        const particle = document.createElement('div');
        particle.className = 'particle';
        
        const size = Math.random() * 5 + 2;
        particle.style.width = `${size}px`;
        particle.style.height = `${size}px`;
        particle.style.left = `${Math.random() * 100}%`;
        particle.style.animationDuration = `${Math.random() * 20 + 10}s`;
        particle.style.animationDelay = `${Math.random() * 10}s`;
        
        particlesContainer.appendChild(particle);
    }
}

// ============================================
// PREVIEW CANVAS ANIMATION
// ============================================

let previewState = { lanes: [false, false, false, false, false, false, false] };

function initPreviewCanvas() {
    if (!previewCanvas) return;
    
    const ctx = previewCanvas.getContext('2d');
    previewCanvas.width = 400;
    previewCanvas.height = 300;
    
    let beat = 0;
    const laneWidth = previewCanvas.width / 7;
    const laneLabels = ['S', 'D', 'F', '␣', 'J', 'K', 'L'];
    const laneColors = ['#4361ee', '#e63946', '#4361ee', '#f4a261', '#4361ee', '#e63946', '#4361ee'];
    
    function drawPreview() {
        if (!ctx) return;
        
        ctx.clearRect(0, 0, previewCanvas.width, previewCanvas.height);
        
        // Draw lanes
        for (let i = 0; i < 7; i++) {
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
            ctx.strokeRect(i * laneWidth, 0, laneWidth, previewCanvas.height);
            
            if (previewState.lanes[i]) {
                ctx.fillStyle = `rgba(0, 223, 255, 0.3)`;
                ctx.fillRect(i * laneWidth, 0, laneWidth, previewCanvas.height);
            }
            
            ctx.fillStyle = laneColors[i];
            ctx.font = 'bold 12px Poppins';
            ctx.textAlign = 'center';
            ctx.fillText(laneLabels[i], i * laneWidth + laneWidth / 2, previewCanvas.height - 15);
        }
        
        // Draw moving beat line
        beat = (beat + 0.05) % 4;
        const lineY = previewCanvas.height - 80 - beat * 20;
        ctx.beginPath();
        ctx.moveTo(0, lineY);
        ctx.lineTo(previewCanvas.width, lineY);
        ctx.strokeStyle = '#d291df';
        ctx.lineWidth = 3;
        ctx.stroke();
        
        // Draw hit zone
        ctx.fillStyle = 'rgba(210, 145, 223, 0.15)';
        ctx.fillRect(0, previewCanvas.height - 80, previewCanvas.width, 60);
        
        ctx.strokeStyle = '#d600d6';
        ctx.lineWidth = 2;
        ctx.strokeRect(0, previewCanvas.height - 80, previewCanvas.width, 60);
        
        requestAnimationFrame(drawPreview);
    }
    
    drawPreview();
}

// ============================================
// DEMO TAP EFFECTS
// ============================================

function setupDemoTaps() {
    tapDemoBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            const lane = parseInt(btn.dataset.demoLane);
            if (previewState && previewState.lanes) {
                previewState.lanes[lane] = true;
                setTimeout(() => { previewState.lanes[lane] = false; }, 150);
            }
            
            btn.style.transform = 'scale(0.9)';
            btn.style.background = '#00dfff';
            btn.style.color = '#3820ab';
            
            setTimeout(() => {
                btn.style.transform = '';
                btn.style.background = '';
                btn.style.color = '';
            }, 150);
        });
    });
}

// ============================================
// AUTH MODAL (Using localStorage)
// ============================================

const authModal = document.getElementById('authModal');
const showAuthBtn = document.getElementById('showAuthBtn');
const authModalClose = document.getElementById('authModalClose');
const loginForm = document.getElementById('loginForm');
const signupForm = document.getElementById('signupForm');
const guestBtn = document.getElementById('guestBtn');
const authTabs = document.querySelectorAll('.auth-tab');
const authForms = document.querySelectorAll('.auth-form');

function showAuthModalFunc() {
    if (authModal) authModal.classList.add('active');
}

function hideAuthModalFunc() {
    if (authModal) authModal.classList.remove('active');
    const loginError = document.getElementById('loginError');
    const signupError = document.getElementById('signupError');
    if (loginError) loginError.textContent = '';
    if (signupError) signupError.textContent = '';
    if (loginForm) loginForm.reset();
    if (signupForm) signupForm.reset();
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
            await window.leaderboardSystem.login(email, password);
            errorDiv.textContent = '';
            hideAuthModalFunc();
            window.location.href = 'game.html';
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
            await window.leaderboardSystem.signUp(email, password);
            errorDiv.textContent = '';
            hideAuthModalFunc();
            window.location.href = 'game.html';
        } catch (error) {
            errorDiv.textContent = 'Signup failed: ' + error.message;
        }
    });
}

// Guest play
if (guestBtn) {
    guestBtn.addEventListener('click', () => {
        hideAuthModalFunc();
        window.location.href = 'game.html';
    });
}

if (showAuthBtn) {
    showAuthBtn.addEventListener('click', showAuthModalFunc);
}

if (authModalClose) {
    authModalClose.addEventListener('click', hideAuthModalFunc);
}

if (authModal) {
    authModal.addEventListener('click', (e) => {
        if (e.target === authModal) hideAuthModalFunc();
    });
}

// ============================================
// MOBILE MENU
// ============================================

function setupMobileMenu() {
    if (!mobileMenuBtn || !navLinks) return;
    
    mobileMenuBtn.addEventListener('click', () => {
        navLinks.classList.toggle('active');
        
        const spans = mobileMenuBtn.querySelectorAll('span');
        if (navLinks.classList.contains('active')) {
            spans[0].style.transform = 'rotate(45deg) translate(5px, 5px)';
            spans[1].style.opacity = '0';
            spans[2].style.transform = 'rotate(-45deg) translate(7px, -6px)';
        } else {
            spans[0].style.transform = '';
            spans[1].style.opacity = '';
            spans[2].style.transform = '';
        }
    });
}

// ============================================
// SCROLL REVEAL
// ============================================

function setupScrollReveal() {
    const observerOptions = { threshold: 0.1, rootMargin: '0px 0px -50px 0px' };
    
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('revealed');
                observer.unobserve(entry.target);
            }
        });
    }, observerOptions);
    
    document.querySelectorAll('.feature-card, .step, .leaderboard-card').forEach(el => {
        observer.observe(el);
    });
}

// ============================================
// SMOOTH SCROLL
// ============================================

function setupSmoothScroll() {
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function(e) {
            e.preventDefault();
            const targetId = this.getAttribute('href');
            if (targetId === '#') return;
            
            const target = document.querySelector(targetId);
            if (target) {
                target.scrollIntoView({ behavior: 'smooth', block: 'start' });
                if (navLinks && navLinks.classList.contains('active')) {
                    navLinks.classList.remove('active');
                    const spans = mobileMenuBtn?.querySelectorAll('span');
                    if (spans) {
                        spans[0].style.transform = '';
                        spans[1].style.opacity = '';
                        spans[2].style.transform = '';
                    }
                }
            }
        });
    });
}

// ============================================
// KEYBOARD SUPPORT FOR DEMO
// ============================================

function setupKeyboardDemo() {
    document.addEventListener('keydown', (e) => {
        const keyMap = { 
            's': 0, 'd': 1, 'f': 2, ' ': 3, 'Space': 3,
            'j': 4, 'k': 5, 'l': 6,
            'S': 0, 'D': 1, 'F': 2, 'J': 4, 'K': 5, 'L': 6
        };
        
        if (keyMap[e.key] !== undefined) {
            e.preventDefault();
            const demoBtn = document.querySelector(`.tap-demo-btn[data-demo-lane="${keyMap[e.key]}"]`);
            if (demoBtn) demoBtn.click();
        }
    });
}

// ============================================
// INITIALIZE
// ============================================

async function init() {
    console.log('Initializing Rhythm-Board Landing Page...');
    
    createParticles();
    initPreviewCanvas();
    setupDemoTaps();
    setupMobileMenu();
    setupSmoothScroll();
    setupScrollReveal();
    setupKeyboardDemo();
    
    await loadLeaderboard();
    
    // Refresh leaderboard every 30 seconds
    setInterval(loadLeaderboard, 30000);
    
    console.log('Landing Page initialized! 🎵');
}

// Start when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}