// Create floating musical notes with new color scheme
function createFloatingNotes() {
    const container = document.getElementById('particleBg');
    const notes = ['♪', '♫', '🎵', '🎶', '♪', '♫', '♩', '🎹'];
    
    // Clear existing
    container.innerHTML = '';
    
    for (let i = 0; i < 35; i++) {
        const note = document.createElement('div');
        note.className = 'float-note';
        note.textContent = notes[Math.floor(Math.random() * notes.length)];
        
        const size = Math.random() * 1.2 + 0.6;
        const duration = Math.random() * 12 + 8;
        const delay = Math.random() * 15;
        const left = Math.random() * 100;
        
        note.style.fontSize = `${size}rem`;
        note.style.animationDuration = `${duration}s`;
        note.style.animationDelay = `${delay}s`;
        note.style.left = `${left}%`;
        note.style.opacity = Math.random() * 0.2 + 0.1;
        
        container.appendChild(note);
    }
}

// Add hover animation for key preview
function addKeyPreviewAnimation() {
    const keys = document.querySelectorAll('.preview-key');
    
    keys.forEach(key => {
        key.addEventListener('mouseenter', () => {
            key.style.transform = 'translateY(-3px) scale(1.05)';
            key.style.filter = 'brightness(1.15)';
        });
        
        key.addEventListener('mouseleave', () => {
            key.style.transform = 'translateY(0) scale(1)';
            key.style.filter = 'brightness(1)';
        });
    });
}

// Setup launch button with smooth loading
function setupLaunchButton() {
    const launchBtn = document.getElementById('launchBtn');
    
    launchBtn.addEventListener('click', (e) => {
        e.preventDefault();
        
        // Create elegant loading overlay
        const loadingDiv = document.createElement('div');
        loadingDiv.className = 'loading-overlay';
        loadingDiv.innerHTML = `
            <div class="loading-content">
                <div class="loading-spinner"></div>
                <p class="loading-text">Entering Rhythm Zone...</p>
            </div>
        `;
        document.body.appendChild(loadingDiv);
        
        // Add styles dynamically
        const style = document.createElement('style');
        style.textContent = `
            .loading-overlay {
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background: linear-gradient(135deg, #0c0b1a, #05040e);
                z-index: 9999;
                display: flex;
                align-items: center;
                justify-content: center;
                animation: fadeIn 0.3s ease;
            }
            .loading-content {
                text-align: center;
            }
            .loading-spinner {
                width: 60px;
                height: 60px;
                border: 3px solid rgba(255, 255, 255, 0.1);
                border-top-color: var(--color-accent, #00dfff);
                border-right-color: var(--color-secondary, #d600d6);
                border-radius: 50%;
                animation: spin 0.8s linear infinite;
                margin: 0 auto 1rem;
            }
            .loading-text {
                color: white;
                font-family: 'Inter', sans-serif;
                font-size: 0.9rem;
                letter-spacing: 2px;
                background: linear-gradient(135deg, #d291df, #00dfff);
                background-clip: text;
                -webkit-background-clip: text;
                color: transparent;
            }
            @keyframes spin {
                to { transform: rotate(360deg); }
            }
            @keyframes fadeIn {
                from { opacity: 0; }
                to { opacity: 1; }
            }
        `;
        document.head.appendChild(style);
        
        setTimeout(() => {
            window.location.href = 'game.html';
        }, 500);
    });
}

// Animate card entrance
function animateCardEntrance() {
    const card = document.querySelector('.portal-card');
    card.style.opacity = '0';
    card.style.transform = 'translateY(25px)';
    
    setTimeout(() => {
        card.style.transition = 'all 0.5s cubic-bezier(0.2, 0.9, 0.4, 1.1)';
        card.style.opacity = '1';
        card.style.transform = 'translateY(0)';
    }, 80);
}

// Initialize everything
document.addEventListener('DOMContentLoaded', () => {
    createFloatingNotes();
    addKeyPreviewAnimation();
    setupLaunchButton();
    animateCardEntrance();
    
    // Regenerate particles on resize to maintain coverage
    let resizeTimer;
    window.addEventListener('resize', () => {
        clearTimeout(resizeTimer);
        resizeTimer = setTimeout(() => {
            createFloatingNotes();
        }, 250);
    });
});

// Preload game assets for smoother transition
function preloadGameAssets() {
    const assets = [
        'css/style.css',
        'scripts/song.js',
        'js/leaderboard-system.js',  // Add this
        'js/game-auth.js',            // Add this
        'scripts/script.js',
        'media/music.mp3'
    ];
    
    assets.forEach(asset => {
        if (asset.endsWith('.css')) {
            const link = document.createElement('link');
            link.rel = 'preload';
            link.as = 'style';
            link.href = asset;
            document.head.appendChild(link);
        } else if (asset.endsWith('.js')) {
            const link = document.createElement('link');
            link.rel = 'preload';
            link.as = 'script';
            link.href = asset;
            document.head.appendChild(link);
        } else if (asset.endsWith('.mp3')) {
            const link = document.createElement('link');
            link.rel = 'preload';
            link.as = 'audio';
            link.href = asset;
            document.head.appendChild(link);
        }
    });
}

preloadGameAssets();