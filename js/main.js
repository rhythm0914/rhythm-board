/**
 * Rhythm-Board Landing Page
 * Main JavaScript File with Real Firebase Leaderboard
 */

// Import Firebase
import { initializeApp } from 'https://www.gstatic.com/firebasejs/12.12.0/firebase-app.js';
import { getFirestore, collection, query, orderBy, limit, getDocs } from 'https://www.gstatic.com/firebasejs/12.12.0/firebase-firestore.js';

// Your Firebase configuration
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
// REAL LEADERBOARD FROM FIREBASE
// ============================================

async function loadRealLeaderboard() {
    if (!leaderboardBody) return;
    
    console.log('Loading real leaderboard from Firebase...');
    
    // Show loading state
    leaderboardBody.innerHTML = `
        <div class="leaderboard-entry">
            <span colspan="3" style="text-align: center;">Loading leaderboard...</span>
        </div>
    `;
    
    try {
        // Query top 10 scores from leaderboard collection, ordered by score descending
        const leaderboardRef = collection(db, 'leaderboard');
        const q = query(leaderboardRef, orderBy('score', 'desc'), limit(10));
        const querySnapshot = await getDocs(q);
        
        if (querySnapshot.empty) {
            leaderboardBody.innerHTML = `
                <div class="leaderboard-entry">
                    <span colspan="3" style="text-align: center;">No scores yet! Be the first to play! 🎵</span>
                </div>
            `;
            return;
        }
        
        // Build leaderboard HTML
        let leaderboardHTML = '';
        let rank = 1;
        
        querySnapshot.forEach((doc) => {
            const data = doc.data();
            const playerName = data.email ? data.email.split('@')[0] : 'Anonymous Player';
            const score = data.score.toLocaleString();
            
            // Add different emojis for top 3
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
        console.log('Leaderboard loaded successfully with', querySnapshot.size, 'entries');
        
    } catch (error) {
        console.error('Error loading leaderboard:', error);
        leaderboardBody.innerHTML = `
            <div class="leaderboard-entry">
                <span colspan="3" style="text-align: center; color: #ff4444;">Unable to load leaderboard. Please try again later.</span>
            </div>
        `;
    }
}

// Helper function to escape HTML and prevent XSS
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Refresh leaderboard every 30 seconds
let refreshInterval = null;

function startLeaderboardRefresh() {
    // Load immediately
    loadRealLeaderboard();
    
    // Then refresh every 30 seconds
    if (refreshInterval) clearInterval(refreshInterval);
    refreshInterval = setInterval(loadRealLeaderboard, 30000);
}

// ============================================
// Create floating particles
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
// Initialize preview canvas animation
// ============================================

function initPreviewCanvas() {
    if (!previewCanvas) return;
    
    const ctx = previewCanvas.getContext('2d');
    previewCanvas.width = 400;
    previewCanvas.height = 300;
    
    let beat = 0;
    let lanes = [false, false, false, false];
    
    function drawPreview() {
        if (!ctx) return;
        
        ctx.clearRect(0, 0, previewCanvas.width, previewCanvas.height);
        
        const laneWidth = previewCanvas.width / 4;
        for (let i = 0; i < 4; i++) {
            ctx.strokeStyle = '#a2dcda';
            ctx.strokeRect(i * laneWidth, 0, laneWidth, previewCanvas.height);
            
            if (lanes[i]) {
                ctx.fillStyle = 'rgba(0, 223, 255, 0.3)';
                ctx.fillRect(i * laneWidth, 0, laneWidth, previewCanvas.height);
            }
            
            ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
            ctx.font = '14px Poppins';
            ctx.textAlign = 'center';
            const labels = ['←', '↓', '↑', '→'];
            ctx.fillText(labels[i], i * laneWidth + laneWidth / 2, previewCanvas.height - 20);
        }
        
        beat = (beat + 0.05) % 4;
        const lineY = previewCanvas.height - 60 - beat * 15;
        ctx.beginPath();
        ctx.moveTo(0, lineY);
        ctx.lineTo(previewCanvas.width, lineY);
        ctx.strokeStyle = '#d291df';
        ctx.lineWidth = 3;
        ctx.stroke();
        
        ctx.fillStyle = 'rgba(210, 145, 223, 0.2)';
        ctx.fillRect(0, previewCanvas.height - 60, previewCanvas.width, 60);
        
        ctx.strokeStyle = '#d600d6';
        ctx.lineWidth = 2;
        ctx.strokeRect(0, previewCanvas.height - 60, previewCanvas.width, 60);
        
        requestAnimationFrame(drawPreview);
    }
    
    drawPreview();
    return { lanes };
}

// ============================================
// Setup demo tap effects
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
// Setup mobile menu
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
    
    const links = navLinks.querySelectorAll('a');
    links.forEach(link => {
        link.addEventListener('click', () => {
            navLinks.classList.remove('active');
            const spans = mobileMenuBtn.querySelectorAll('span');
            spans[0].style.transform = '';
            spans[1].style.opacity = '';
            spans[2].style.transform = '';
        });
    });
}

// ============================================
// Setup smooth scroll
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
            }
        });
    });
}

// ============================================
// Setup scroll reveal
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
// Setup navbar scroll effect
// ============================================

function setupNavbarScroll() {
    const navbar = document.querySelector('.navbar');
    if (!navbar) return;
    
    window.addEventListener('scroll', () => {
        if (window.scrollY > 50) {
            navbar.style.background = 'rgba(56, 32, 171, 0.95)';
            navbar.style.backdropFilter = 'blur(10px)';
            navbar.style.borderRadius = '0 0 20px 20px';
            navbar.style.padding = '15px 5%';
            navbar.style.position = 'sticky';
            navbar.style.top = '0';
            navbar.style.zIndex = '1000';
        } else {
            navbar.style.background = '';
            navbar.style.backdropFilter = '';
            navbar.style.borderRadius = '';
            navbar.style.padding = '25px 0';
            navbar.style.position = '';
        }
    });
}

// ============================================
// Add refresh button to leaderboard
// ============================================

function addRefreshButton() {
    const leaderboardCard = document.querySelector('.leaderboard-card');
    if (!leaderboardCard) return;
    
    // Check if refresh button already exists
    if (document.querySelector('.refresh-leaderboard')) return;
    
    const refreshBtn = document.createElement('button');
    refreshBtn.className = 'refresh-leaderboard';
    refreshBtn.innerHTML = '🔄 Refresh';
    refreshBtn.style.cssText = `
        display: block;
        margin: 15px auto 0;
        padding: 8px 20px;
        background: rgba(214, 0, 214, 0.8);
        color: white;
        border: none;
        border-radius: 20px;
        cursor: pointer;
        font-family: inherit;
        font-weight: 600;
        transition: all 0.3s ease;
    `;
    
    refreshBtn.addEventListener('mouseenter', () => {
        refreshBtn.style.background = '#00dfff';
        refreshBtn.style.color = '#3820ab';
        refreshBtn.style.transform = 'scale(1.05)';
    });
    
    refreshBtn.addEventListener('mouseleave', () => {
        refreshBtn.style.background = 'rgba(214, 0, 214, 0.8)';
        refreshBtn.style.color = 'white';
        refreshBtn.style.transform = 'scale(1)';
    });
    
    refreshBtn.addEventListener('click', async () => {
        refreshBtn.innerHTML = '🔄 Loading...';
        refreshBtn.disabled = true;
        await loadRealLeaderboard();
        refreshBtn.innerHTML = '🔄 Refresh';
        refreshBtn.disabled = false;
    });
    
    leaderboardCard.appendChild(refreshBtn);
}

// ============================================
// Update stats with real data from Firebase
// ============================================

async function updateRealStats() {
    try {
        // Get total players count
        const usersRef = collection(db, 'users');
        const usersSnapshot = await getDocs(usersRef);
        const totalPlayers = usersSnapshot.size;
        
        // Update players stat if it exists
        const playersStat = document.querySelector('.stat:last-child .stat-number');
        if (playersStat && totalPlayers > 0) {
            const formattedCount = totalPlayers >= 1000 ? 
                Math.floor(totalPlayers / 1000) + 'K+' : 
                totalPlayers.toString();
            playersStat.textContent = formattedCount;
        }
        
        console.log('Total players:', totalPlayers);
    } catch (error) {
        console.error('Error updating stats:', error);
    }
}

// ============================================
// Initialize everything
// ============================================

async function init() {
    console.log('Initializing Rhythm-Board Landing Page...');
    
    // Create background particles
    createParticles();
    
    // Initialize preview canvas
    const previewState = initPreviewCanvas();
    
    // Setup demo taps
    setupDemoTaps(previewState);
    
    // Setup UI interactions
    setupMobileMenu();
    setupSmoothScroll();
    setupScrollReveal();
    setupNavbarScroll();
    
    // Load real leaderboard from Firebase
    await loadRealLeaderboard();
    addRefreshButton();
    startLeaderboardRefresh();
    
    // Update real stats
    await updateRealStats();
    
    console.log('Rhythm-Board Landing Page initialized! 🎵');
}

// Start when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}

// ============================================
// Keyboard support for demo
// ============================================

document.addEventListener('keydown', (e) => {
    const keyMap = { 
        'ArrowLeft': 0, 'ArrowDown': 1, 'ArrowUp': 2, 'ArrowRight': 3, 
        'a': 0, 's': 1, 'w': 2, 'd': 3 
    };
    
    if (keyMap[e.key] !== undefined) {
        e.preventDefault();
        const demoBtn = document.querySelector(`.tap-demo-btn[data-demo-lane="${keyMap[e.key]}"]`);
        if (demoBtn) demoBtn.click();
    }
});

// ============================================
// Visibility API - Refresh when tab becomes visible
// ============================================

document.addEventListener('visibilitychange', () => {
    if (!document.hidden) {
        console.log('Tab became visible, refreshing leaderboard...');
        loadRealLeaderboard();
        updateRealStats();
    }
});