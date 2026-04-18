/**
 * Rhythm-Board Landing Page
 * Main JavaScript File
 * Author: Rhythm-Board Team
 * Version: 1.0.0
 */

// ============================================
// DOM Elements
// ============================================

const particlesContainer = document.getElementById('particles');
const previewCanvas = document.getElementById('previewCanvas');
const mobileMenuBtn = document.getElementById('mobileMenuBtn');
const navLinks = document.querySelector('.nav-links');
const tapDemoBtns = document.querySelectorAll('.tap-demo-btn');

// ============================================
// Particle System
// ============================================

/**
 * Creates floating particles in the background
 */
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
// Preview Canvas Animation
// ============================================

/**
 * Initializes and animates the game preview canvas
 */
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
        
        // Draw lanes
        const laneWidth = previewCanvas.width / 4;
        for (let i = 0; i < 4; i++) {
            ctx.strokeStyle = '#a2dcda';
            ctx.strokeRect(i * laneWidth, 0, laneWidth, previewCanvas.height);
            
            // Highlight active lane
            if (lanes[i]) {
                ctx.fillStyle = 'rgba(0, 223, 255, 0.3)';
                ctx.fillRect(i * laneWidth, 0, laneWidth, previewCanvas.height);
            }
            
            // Draw lane labels
            ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
            ctx.font = '14px Poppins';
            ctx.textAlign = 'center';
            const labels = ['←', '↓', '↑', '→'];
            ctx.fillText(labels[i], i * laneWidth + laneWidth / 2, previewCanvas.height - 20);
        }
        
        // Draw beat line (animated)
        beat = (beat + 0.05) % 4;
        const lineY = previewCanvas.height - 60 - beat * 15;
        ctx.beginPath();
        ctx.moveTo(0, lineY);
        ctx.lineTo(previewCanvas.width, lineY);
        ctx.strokeStyle = '#d291df';
        ctx.lineWidth = 3;
        ctx.stroke();
        
        // Draw hit zone
        ctx.fillStyle = 'rgba(210, 145, 223, 0.2)';
        ctx.fillRect(0, previewCanvas.height - 60, previewCanvas.width, 60);
        
        // Draw hit zone border
        ctx.strokeStyle = '#d600d6';
        ctx.lineWidth = 2;
        ctx.strokeRect(0, previewCanvas.height - 60, previewCanvas.width, 60);
        
        requestAnimationFrame(drawPreview);
    }
    
    drawPreview();
    
    // Return lanes object for demo taps
    return { lanes };
}

// ============================================
// Demo Tap Effects
// ============================================

/**
 * Sets up demo tap button interactions
 */
function setupDemoTaps(previewState) {
    tapDemoBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            const lane = parseInt(btn.dataset.demoLane);
            if (previewState && previewState.lanes) {
                previewState.lanes[lane] = true;
                setTimeout(() => { previewState.lanes[lane] = false; }, 150);
            }
            
            // Visual feedback
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
// Mobile Menu Toggle
// ============================================

/**
 * Sets up mobile menu functionality
 */
function setupMobileMenu() {
    if (!mobileMenuBtn || !navLinks) return;
    
    mobileMenuBtn.addEventListener('click', () => {
        navLinks.classList.toggle('active');
        
        // Animate hamburger icon
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
    
    // Close mobile menu when clicking a link
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
// Smooth Scroll
// ============================================

/**
 * Enables smooth scrolling for anchor links
 */
function setupSmoothScroll() {
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function(e) {
            e.preventDefault();
            const targetId = this.getAttribute('href');
            if (targetId === '#') return;
            
            const target = document.querySelector(targetId);
            if (target) {
                target.scrollIntoView({ 
                    behavior: 'smooth', 
                    block: 'start' 
                });
            }
        });
    });
}

// ============================================
// Scroll Reveal Animation
// ============================================

/**
 * Sets up scroll-based reveal animations
 */
function setupScrollReveal() {
    const observerOptions = {
        threshold: 0.1,
        rootMargin: '0px 0px -50px 0px'
    };
    
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('revealed');
                observer.unobserve(entry.target);
            }
        });
    }, observerOptions);
    
    // Observe elements
    const elementsToReveal = document.querySelectorAll('.feature-card, .step, .leaderboard-card');
    elementsToReveal.forEach(el => {
        observer.observe(el);
    });
}

// ============================================
// Navbar Scroll Effect
// ============================================

/**
 * Adds background blur to navbar on scroll
 */
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
// Counter Animation
// ============================================

/**
 * Animates number counters when they come into view
 */
function setupCounterAnimation() {
    const statNumbers = document.querySelectorAll('.stat-number');
    
    const observerOptions = {
        threshold: 0.5
    };
    
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                const element = entry.target;
                const targetValue = element.textContent;
                
                // Only animate if it contains a number
                if (targetValue.includes('+')) {
                    const number = parseInt(targetValue);
                    animateNumber(element, 0, number, 1000);
                } else if (!isNaN(parseInt(targetValue))) {
                    const number = parseInt(targetValue);
                    animateNumber(element, 0, number, 1000);
                }
                
                observer.unobserve(element);
            }
        });
    }, observerOptions);
    
    statNumbers.forEach(stat => {
        observer.observe(stat);
    });
}

/**
 * Animates a number from start to end
 */
function animateNumber(element, start, end, duration) {
    let startTimestamp = null;
    const step = (timestamp) => {
        if (!startTimestamp) startTimestamp = timestamp;
        const progress = Math.min((timestamp - startTimestamp) / duration, 1);
        const currentValue = Math.floor(progress * (end - start) + start);
        element.textContent = currentValue + (element.textContent.includes('+') ? '+' : '');
        if (progress < 1) {
            window.requestAnimationFrame(step);
        }
    };
    window.requestAnimationFrame(step);
}

// ============================================
// Lazy Load Images (if any)
// ============================================

/**
 * Sets up lazy loading for images
 */
function setupLazyLoading() {
    if ('IntersectionObserver' in window) {
        const imageObserver = new IntersectionObserver((entries, observer) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    const img = entry.target;
                    const src = img.getAttribute('data-src');
                    if (src) {
                        img.src = src;
                        img.removeAttribute('data-src');
                    }
                    observer.unobserve(img);
                }
            });
        });
        
        document.querySelectorAll('img[data-src]').forEach(img => {
            imageObserver.observe(img);
        });
    }
}

// ============================================
// Preloader (optional)
// ============================================

/**
 * Shows a preloader while page loads
 */
function setupPreloader() {
    window.addEventListener('load', () => {
        const preloader = document.querySelector('.preloader');
        if (preloader) {
            preloader.style.opacity = '0';
            setTimeout(() => {
                preloader.style.display = 'none';
            }, 500);
        }
    });
}

// ============================================
// Initialize Everything
// ============================================

/**
 * Initializes all page functionality
 */
function init() {
    // Create background particles
    createParticles();
    
    // Initialize preview canvas and get state
    const previewState = initPreviewCanvas();
    
    // Setup demo tap interactions
    setupDemoTaps(previewState);
    
    // Setup mobile menu
    setupMobileMenu();
    
    // Setup smooth scrolling
    setupSmoothScroll();
    
    // Setup scroll reveal animations
    setupScrollReveal();
    
    // Setup navbar scroll effect
    setupNavbarScroll();
    
    // Setup counter animations
    setupCounterAnimation();
    
    // Setup lazy loading
    setupLazyLoading();
    
    // Setup preloader (optional)
    setupPreloader();
    
    console.log('Rhythm-Board Landing Page initialized! 🎵');
}

// Start everything when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}

// ============================================
// Window Resize Handler
// ============================================

let resizeTimeout;
window.addEventListener('resize', () => {
    clearTimeout(resizeTimeout);
    resizeTimeout = setTimeout(() => {
        // Recalculate any responsive elements here
        if (window.innerWidth > 768) {
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
    }, 250);
});

// ============================================
// Keyboard Shortcuts (for demo)
// ============================================

document.addEventListener('keydown', (e) => {
    // Demo keyboard interaction for preview
    const keyMap = {
        'ArrowLeft': 0,
        'ArrowDown': 1,
        'ArrowUp': 2,
        'ArrowRight': 3,
        'a': 0, 's': 1, 'w': 2, 'd': 3
    };
    
    if (keyMap[e.key] !== undefined) {
        e.preventDefault();
        // Simulate tap on demo button
        const lane = keyMap[e.key];
        const demoBtn = document.querySelector(`.tap-demo-btn[data-demo-lane="${lane}"]`);
        if (demoBtn) {
            demoBtn.click();
        }
    }
});

// Export for debugging (optional)
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { init };
}