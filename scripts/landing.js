// Import Firebase modules
import { initializeApp } from 'https://www.gstatic.com/firebasejs/12.12.0/firebase-app.js';
import { getFirestore, collection, query, orderBy, limit, getDocs } from 'https://www.gstatic.com/firebasejs/12.12.0/firebase-firestore.js';

// Firebase Configuration
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
// CREATE FLOATING PARTICLES
// ============================================

function createParticles() {
    if (!particlesContainer) return;
    
    particlesContainer.innerHTML = '';
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

let previewLanes = [false, false, false, false, false, false, false];

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
        
        for (let i = 0; i < 7; i++) {
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
            ctx.strokeRect(i * laneWidth, 0, laneWidth, previewCanvas.height);
            
            if (previewLanes[i]) {
                ctx.fillStyle = `rgba(0, 223, 255, 0.3)`;
                ctx.fillRect(i * laneWidth, 0, laneWidth, previewCanvas.height);
            }
            
            ctx.fillStyle = laneColors[i];
            ctx.font = 'bold 12px Poppins';
            ctx.textAlign = 'center';
            ctx.fillText(laneLabels[i], i * laneWidth + laneWidth / 2, previewCanvas.height - 15);
        }
        
        beat = (beat + 0.05) % 4;
        const lineY = previewCanvas.height - 80 - beat * 20;
        ctx.beginPath();
        ctx.moveTo(0, lineY);
        ctx.lineTo(previewCanvas.width, lineY);
        ctx.strokeStyle = '#d291df';
        ctx.lineWidth = 3;
        ctx.stroke();
        
        ctx.fillStyle = 'rgba(210, 145, 223, 0.15)';
        ctx.fillRect(0, previewCanvas.height - 80, previewCanvas.width, 60);
        
        ctx.strokeStyle = '#d600d6';
        ctx.lineWidth = 2;
        ctx.strokeRect(0, previewCanvas.height - 80, previewCanvas.width, 60);
        
        requestAnimationFrame(drawPreview);
    }
    
    drawPreview();
}

function setupDemoTaps() {
    tapDemoBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            const lane = parseInt(btn.dataset.demoLane);
            previewLanes[lane] = true;
            setTimeout(() => { previewLanes[lane] = false; }, 150);
            
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
// LEADERBOARD FROM FIREBASE
// ============================================

async function loadLeaderboard() {
    if (!leaderboardBody) return;
    
    console.log('Loading leaderboard from Firebase...');
    
    leaderboardBody.innerHTML = `
        <div class="leaderboard-entry">
            <span colspan="4" style="text-align: center; grid-column: span 4;">Loading leaderboard...</span>
        </div>
    `;
    
    try {
        const leaderboardRef = collection(db, 'leaderboard');
        const q = query(leaderboardRef, orderBy('score', 'desc'), limit(20));
        const querySnapshot = await getDocs(q);
        
        if (querySnapshot.empty) {
            leaderboardBody.innerHTML = `
                <div class="leaderboard-entry">
                    <span colspan="4" style="text-align: center; grid-column: span 4;">No scores yet! Sign up and be the first! 🎵</span>
                </div>
            `;
            return;
        }
        
        let leaderboardHTML = '';
        let rank = 1;
        
        querySnapshot.forEach((doc) => {
            const data = doc.data();
            const playerName = data.username || (data.email ? data.email.split('@')[0] : 'Anonymous');
            const score = data.score.toLocaleString();
            const date = formatDate(data.date);
            
            let rankDisplay = `#${rank}`;
            let rankEmoji = '';
            if (rank === 1) { rankDisplay = '#1'; rankEmoji = '🏆 '; }
            else if (rank === 2) { rankDisplay = '#2'; rankEmoji = '🥈 '; }
            else if (rank === 3) { rankDisplay = '#3'; rankEmoji = '🥉 '; }
            
            leaderboardHTML += `
                <div class="leaderboard-entry">
                    <span class="rank">${rankDisplay}</span>
                    <span>${rankEmoji}${escapeHtml(playerName)}</span>
                    <span>${score}</span>
                    <span style="font-size: 0.7rem; opacity: 0.7;">${date}</span>
                </div>
            `;
            rank++;
        });
        
        leaderboardBody.innerHTML = leaderboardHTML;
        
        // Update player count
        const usersRef = collection(db, 'users');
        const usersSnapshot = await getDocs(usersRef);
        const playerCountSpan = document.getElementById('playerCount');
        if (playerCountSpan) {
            const totalPlayers = usersSnapshot.size;
            playerCountSpan.textContent = totalPlayers >= 1000 ? Math.floor(totalPlayers / 1000) + 'K+' : (totalPlayers || '100+');
        }
        
        console.log('Leaderboard loaded with', querySnapshot.size, 'entries');
    } catch (error) {
        console.error('Error loading leaderboard:', error);
        leaderboardBody.innerHTML = `
            <div class="leaderboard-entry">
                <span colspan="4" style="text-align: center; grid-column: span 4; color: #ff6b6b;">Unable to load leaderboard. Please refresh.</span>
            </div>
        `;
    }
}

function formatDate(dateString) {
    if (!dateString) return 'Just now';
    try {
        const date = new Date(dateString);
        const now = new Date();
        const diffDays = Math.floor((now - date) / (1000 * 60 * 60 * 24));
        
        if (diffDays === 0) return 'Today';
        if (diffDays === 1) return 'Yesterday';
        if (diffDays < 7) return `${diffDays}d ago`;
        if (diffDays < 30) return `${Math.floor(diffDays / 7)}w ago`;
        return date.toLocaleDateString();
    } catch {
        return 'Recently';
    }
}

function escapeHtml(text) {
    if (!text) return 'Anonymous';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// ============================================
// AUTH MODAL (Using Firebase Auth via redirect)
// ============================================

const authModal = document.getElementById('authModal');
const showAuthBtn = document.getElementById('showAuthBtn');
const authModalClose = document.getElementById('authModalClose');
const loginForm = document.getElementById('loginForm');
const signupForm = document.getElementById('signupForm');
const guestBtn = document.getElementById('guestGameBtn');
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

// Login - redirect to game.html after login
if (loginForm) {
    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const email = document.getElementById('loginEmail').value;
        const password = document.getElementById('loginPassword').value;
        const errorDiv = document.getElementById('loginError');
        
        // Store credentials temporarily for game.html to use
        sessionStorage.setItem('tempLoginEmail', email);
        sessionStorage.setItem('tempLoginPassword', password);
        
        errorDiv.textContent = 'Redirecting to login...';
        
        // Redirect to game.html which will handle the actual Firebase login
        window.location.href = 'game.html?action=login';
    });
}

// Signup - redirect to game.html after signup
if (signupForm) {
    signupForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const username = document.getElementById('signupUsername')?.value || '';
        const email = document.getElementById('signupEmail').value;
        const password = document.getElementById('signupPassword').value;
        const errorDiv = document.getElementById('signupError');
        
        if (password.length < 6) {
            errorDiv.textContent = 'Password must be at least 6 characters';
            return;
        }
        
        // Store credentials temporarily for game.html to use
        sessionStorage.setItem('tempSignupUsername', username);
        sessionStorage.setItem('tempSignupEmail', email);
        sessionStorage.setItem('tempSignupPassword', password);
        
        errorDiv.textContent = 'Redirecting to create account...';
        
        // Redirect to game.html which will handle the actual Firebase signup
        window.location.href = 'game.html?action=signup';
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