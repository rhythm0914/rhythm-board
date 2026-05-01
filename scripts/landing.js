// Import Firebase modules
import { initializeApp } from 'https://www.gstatic.com/firebasejs/12.12.0/firebase-app.js';
import { getAuth, signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut, onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/12.12.0/firebase-auth.js';
import { getFirestore, collection, query, orderBy, limit, getDocs, doc, setDoc } from 'https://www.gstatic.com/firebasejs/12.12.0/firebase-firestore.js';

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
const auth = getAuth(app);
const db = getFirestore(app);

// DOM Elements
const particlesContainer = document.getElementById('particles');
const previewCanvas = document.getElementById('previewCanvas');
const mobileMenuBtn = document.getElementById('mobileMenuBtn');
const navLinks = document.querySelector('.nav-links');
const tapDemoBtns = document.querySelectorAll('.tap-demo-btn');
const leaderboardBody = document.getElementById('leaderboardBody');
const userBarTop = document.getElementById('userBarTop');
const userEmailTop = document.getElementById('userEmailTop');
const logoutBtnTop = document.getElementById('logoutBtnTop');

let currentUser = null;
let leaderboardLoadTimeout = null;
let isLoadingLeaderboard = false;
let leaderboardRetryCount = 0;
let leaderboardInterval = null;

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

function initPreviewCanvas() {
    if (!previewCanvas) return;
    
    const ctx = previewCanvas.getContext('2d');
    previewCanvas.width = 400;
    previewCanvas.height = 300;
    
    let beat = 0;
    let lanes = [false, false, false, false, false, false, false];
    const laneWidth = previewCanvas.width / 7;
    const laneLabels = ['S', 'D', 'F', '␣', 'J', 'K', 'L'];
    const laneColors = ['#ff6b6b', '#fccd12', '#5f3dc4', '#20c997', '#3b1f8a', '#fccd12', '#ff6b6b'];
    
    function drawPreview() {
        if (!ctx) return;
        
        ctx.clearRect(0, 0, previewCanvas.width, previewCanvas.height);
        
        for (let i = 0; i < 7; i++) {
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
            ctx.strokeRect(i * laneWidth, 0, laneWidth, previewCanvas.height);
            
            if (lanes[i]) {
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
    return { lanes };
}

// ============================================
// DEMO TAP EFFECTS
// ============================================

function setupDemoTaps(previewState) {
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
// DISPLAY DEMO/PLACEHOLDER LEADERBOARD
// ============================================

function displayDemoLeaderboard() {
    if (!leaderboardBody) return;
    
    // Sample demo data for when Firebase fails
    const demoScores = [
        { name: "RhythmMaster", score: 84520 },
        { name: "BeatWizard", score: 67230 },
        { name: "TapLegend", score: 54100 },
        { name: "MusicLover", score: 42350 },
        { name: "RhythmKing", score: 38900 }
    ];
    
    let leaderboardHTML = '';
    let rank = 1;
    
    demoScores.forEach(score => {
        let rankDisplay = `#${rank}`;
        if (rank === 1) rankDisplay = '🏆 #1';
        if (rank === 2) rankDisplay = '🥈 #2';
        if (rank === 3) rankDisplay = '🥉 #3';
        
        leaderboardHTML += `
            <div class="leaderboard-entry">
                <span class="rank">${rankDisplay}</span>
                <span>${rank === 1 ? '👑 ' : ''}${score.name}</span>
                <span>${score.score.toLocaleString()}</span>
            </div>
        `;
        rank++;
    });
    
    leaderboardBody.innerHTML = leaderboardHTML;
    console.log('Displayed demo leaderboard data');
}

// ============================================
// LEADERBOARD FROM FIREBASE (SINGLE ATTEMPT)
// ============================================

async function loadRealLeaderboard() {
    // Prevent multiple simultaneous loads
    if (isLoadingLeaderboard) {
        console.log('Leaderboard already loading, skipping...');
        return;
    }
    
    if (!leaderboardBody) {
        console.error('Leaderboard body element not found');
        return;
    }
    
    isLoadingLeaderboard = true;
    console.log('Loading leaderboard at:', new Date().toLocaleTimeString());
    
    try {
        // First, check if Firebase is accessible
        const leaderboardRef = collection(db, 'leaderboard');
        
        // Simple query without orderBy first to test connection
        const testSnapshot = await getDocs(leaderboardRef);
        console.log('Leaderboard connection successful, total entries:', testSnapshot.size);
        
        // Now try with ordering
        const q = query(leaderboardRef, orderBy('score', 'desc'), limit(10));
        const querySnapshot = await getDocs(q);
        
        console.log('Ordered query successful, entries:', querySnapshot.size);
        
        if (querySnapshot.empty) {
            // No real data, show demo with message
            leaderboardBody.innerHTML = `
                <div class="leaderboard-entry">
                    <span colspan="3" style="text-align: center; color: #ffaa44;">🎵 No scores yet! Be the first to play! 🎵</span>
                </div>
            `;
            isLoadingLeaderboard = false;
            return;
        }
        
        let leaderboardHTML = '';
        let rank = 1;
        
        querySnapshot.forEach((doc) => {
            const data = doc.data();
            const playerName = data.email ? data.email.split('@')[0] : 'Anonymous Player';
            const score = data.score ? data.score.toLocaleString() : '0';
            
            let rankDisplay = `#${rank}`;
            if (rank === 1) rankDisplay = '🏆 #1';
            if (rank === 2) rankDisplay = '🥈 #2';
            if (rank === 3) rankDisplay = '🥉 #3';
            
            leaderboardHTML += `
                <div class="leaderboard-entry">
                    <span class="rank">${rankDisplay}</span>
                    <span>${rank === 1 ? '👑 ' : ''}${escapeHtml(playerName)}</span>
                    <span>${score}</span>
                </div>
            `;
            rank++;
        });
        
        leaderboardBody.innerHTML = leaderboardHTML;
        console.log('Leaderboard displayed successfully with real data');
        leaderboardRetryCount = 0; // Reset retry count on success
        
    } catch (error) {
        console.error('Leaderboard error:', error.code, error.message);
        
        // Display demo data instead of error message
        displayDemoLeaderboard();
        
        // Add a small note that this is demo data
        const note = document.createElement('div');
        note.className = 'leaderboard-entry';
        note.style.textAlign = 'center';
        note.style.color = '#ffaa44';
        note.style.fontSize = '0.8rem';
        note.style.justifyContent = 'center';
        note.innerHTML = '<span colspan="3">⚠️ Live leaderboard unavailable - showing demo scores. Sign in and play to post real scores!</span>';
        leaderboardBody.appendChild(note);
        
        leaderboardRetryCount++;
        
        // If failed multiple times, stop trying so frequently
        if (leaderboardRetryCount >= 3) {
            console.log('Leaderboard failed multiple times, reducing retry frequency');
            if (leaderboardInterval) {
                clearInterval(leaderboardInterval);
                leaderboardInterval = setInterval(() => {
                    if (!isLoadingLeaderboard && leaderboardRetryCount < 10) {
                        loadRealLeaderboard();
                    }
                }, 120000); // Try every 2 minutes instead
            }
        }
    } finally {
        isLoadingLeaderboard = false;
    }
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
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
// UPDATE UI BASED ON AUTH STATE
// ============================================

function updateUIForUser(user) {
    const showAuthBtn = document.getElementById('showAuthBtnLanding');
    
    if (user) {
        if (userBarTop) {
            userBarTop.style.display = 'flex';
            if (userEmailTop) userEmailTop.textContent = user.email.split('@')[0];
        }
        const leaderboardCTA = document.getElementById('leaderboardCTA');
        if (leaderboardCTA) {
            leaderboardCTA.innerHTML = '<p>✅ <strong>You are signed in!</strong> Your scores will be saved to the leaderboard. <a href="game.html">Play now</a> to set a high score!</p>';
        }
        if (showAuthBtn) showAuthBtn.style.display = 'none';
    } else {
        if (userBarTop) userBarTop.style.display = 'none';
        const leaderboardCTA = document.getElementById('leaderboardCTA');
        if (leaderboardCTA) {
            leaderboardCTA.innerHTML = '<p>⭐ <strong>Sign in to save your scores</strong> and compete on the leaderboard! Guest players can still enjoy the full game, but scores won\'t be saved.</p>';
        }
        if (showAuthBtn) showAuthBtn.style.display = 'inline-block';
    }
}

// ============================================
// AUTH MODAL SETUP
// ============================================

function setupAuthModal() {
    const authModal = document.getElementById('authModal');
    const showAuthBtn = document.getElementById('showAuthBtnLanding');
    const authModalClose = document.getElementById('authModalClose');
    const guestBtn = document.getElementById('guestBtn');
    const authTabs = document.querySelectorAll('.auth-tab');
    const authForms = document.querySelectorAll('.auth-form');
    const loginForm = document.getElementById('loginForm');
    const signupForm = document.getElementById('signupForm');

    function hideAuthModal() {
        if (authModal) authModal.classList.remove('active');
        const loginError = document.getElementById('loginError');
        const signupError = document.getElementById('signupError');
        if (loginError) loginError.textContent = '';
        if (signupError) signupError.textContent = '';
        if (loginForm) loginForm.reset();
        if (signupForm) signupForm.reset();
    }

    function showAuthModalFunc() {
        if (authModal) authModal.classList.add('active');
    }

    if (showAuthBtn) {
        showAuthBtn.addEventListener('click', showAuthModalFunc);
    }

    if (authModalClose) {
        authModalClose.addEventListener('click', hideAuthModal);
    }

    if (authModal) {
        authModal.addEventListener('click', (e) => {
            if (e.target === authModal) hideAuthModal();
        });
    }

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

    if (loginForm) {
        loginForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const email = document.getElementById('loginEmail').value;
            const password = document.getElementById('loginPassword').value;
            const errorDiv = document.getElementById('loginError');
            
            try {
                await signInWithEmailAndPassword(auth, email, password);
                if (errorDiv) errorDiv.textContent = '';
                hideAuthModal();
                setTimeout(() => loadRealLeaderboard(), 1000);
            } catch (error) {
                if (errorDiv) errorDiv.textContent = 'Login failed: ' + error.message;
            }
        });
    }

    if (signupForm) {
        signupForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const email = document.getElementById('signupEmail').value;
            const password = document.getElementById('signupPassword').value;
            const errorDiv = document.getElementById('signupError');
            
            if (password.length < 6) {
                if (errorDiv) errorDiv.textContent = 'Password must be at least 6 characters';
                return;
            }
            
            try {
                const userCredential = await createUserWithEmailAndPassword(auth, email, password);
                await setDoc(doc(db, 'users', userCredential.user.uid), {
                    email: email,
                    highScore: 0,
                    createdAt: new Date().toISOString()
                });
                if (errorDiv) errorDiv.textContent = '';
                hideAuthModal();
                setTimeout(() => loadRealLeaderboard(), 1000);
            } catch (error) {
                if (errorDiv) errorDiv.textContent = 'Signup failed: ' + error.message;
            }
        });
    }

    if (guestBtn) {
        guestBtn.addEventListener('click', () => {
            hideAuthModal();
            window.location.href = 'game.html';
        });
    }
}

// ============================================
// LOGOUT HANDLER
// ============================================

if (logoutBtnTop) {
    logoutBtnTop.addEventListener('click', async () => {
        await signOut(auth);
        setTimeout(() => loadRealLeaderboard(), 500);
        updateUIForUser(null);
    });
}

// ============================================
// AUTH STATE LISTENER
// ============================================

onAuthStateChanged(auth, async (user) => {
    currentUser = user;
    updateUIForUser(user);
    // Small delay to ensure DOM is ready
    setTimeout(() => loadRealLeaderboard(), 500);
});

// ============================================
// INITIALIZE
// ============================================

async function init() {
    console.log('Initializing Rhythm-Board Landing Page...');
    
    createParticles();
    const previewState = initPreviewCanvas();
    setupDemoTaps(previewState);
    setupMobileMenu();
    setupSmoothScroll();
    setupScrollReveal();
    setupAuthModal();
    
    // Show demo leaderboard immediately while loading
    displayDemoLeaderboard();
    
    // Try to load real leaderboard after a delay
    setTimeout(() => loadRealLeaderboard(), 1000);
    
    // Refresh leaderboard less frequently
    leaderboardInterval = setInterval(() => {
        if (!isLoadingLeaderboard) {
            loadRealLeaderboard();
        }
    }, 90000); // Every 90 seconds
    
    console.log('Landing Page initialized! 🎵');
}

// Start initialization when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}

// Keyboard support for demo
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