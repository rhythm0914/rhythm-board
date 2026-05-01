// mobile-optimized.js - Dynamic cross-platform behavior

// Apply device-specific optimizations
function applyMobileOptimizations() {
    const deviceInfo = window.DeviceInfo;
    if (!deviceInfo) return;
    
    console.log('Applying optimizations for:', deviceInfo.isMobile ? 'Mobile' : 'Desktop');
    
    // Add device class to body
    if (deviceInfo.isMobile) {
        document.body.classList.add('mobile-device');
        if (deviceInfo.isIOS) document.body.classList.add('ios-device');
        if (deviceInfo.isAndroid) document.body.classList.add('android-device');
        if (deviceInfo.isTablet) document.body.classList.add('tablet-device');
    } else {
        document.body.classList.add('desktop-device');
    }
    
    if (deviceInfo.isLowEndDevice) {
        document.body.classList.add('low-end-device');
    }
    
    if (deviceInfo.isTouchDevice && !deviceInfo.isDesktop) {
        document.body.classList.add('touch-device');
    }
    
    // Apply optimized settings
    const settings = deviceInfo.getOptimizedSettings();
    const uiAdjustments = deviceInfo.getUIAdjustments();
    
    // Apply CSS variables dynamically
    document.documentElement.style.setProperty('--key-height', uiAdjustments.keyHeight);
    document.documentElement.style.setProperty('--track-height', uiAdjustments.trackHeight);
    document.documentElement.style.setProperty('--font-size-base', uiAdjustments.fontSize);
    
    // Show mobile-specific instructions
    if (deviceInfo.isMobile) {
        showMobileInstructions();
    }
    
    // Handle orientation changes
    window.addEventListener('orientationchange', () => {
        setTimeout(() => {
            adjustForOrientation();
        }, 100);
    });
    
    // Adjust for keyboard appearance on mobile
    if (deviceInfo.isMobile) {
        window.addEventListener('resize', () => {
            if (window.visualViewport) {
                const viewportHeight = window.visualViewport.height;
                if (viewportHeight < window.innerHeight * 0.7) {
                    document.body.classList.add('keyboard-open');
                } else {
                    document.body.classList.remove('keyboard-open');
                }
            }
        });
    }
}

// Show mobile-specific instructions
function showMobileInstructions() {
    const menuDiv = document.querySelector('.menu');
    if (menuDiv && !document.querySelector('.mobile-instruction')) {
        const instruction = document.createElement('div');
        instruction.className = 'mobile-instruction';
        instruction.innerHTML = `
            <div style="background: rgba(0,0,0,0.7); border-radius: 12px; padding: 10px 15px; margin: 10px auto; max-width: 90%; text-align: center;">
                <span style="font-size: 1.2rem;">👆</span>
                <span style="margin-left: 8px;">Tap the colored buttons below to play!</span>
                <div style="font-size: 0.7rem; margin-top: 5px; opacity: 0.8;">
                    ⚡ ${DeviceInfo.isLowEndDevice ? 'Performance mode active' : 'Full experience ready'}
                </div>
            </div>
        `;
        
        const startDiv = menuDiv.querySelector('.menu_start');
        if (startDiv) {
            startDiv.parentNode.insertBefore(instruction, startDiv.nextSibling);
        }
        
        // Auto-hide after 5 seconds on first load
        setTimeout(() => {
            if (instruction) {
                instruction.style.transition = 'opacity 0.5s';
                instruction.style.opacity = '0';
                setTimeout(() => instruction.remove(), 500);
            }
        }, 5000);
    }
}

// Adjust UI for orientation
function adjustForOrientation() {
    const isLandscape = window.innerWidth > window.innerHeight;
    const gameContainer = document.querySelector('.game');
    const trackContainer = document.querySelector('.track-container');
    
    if (isLandscape && DeviceInfo.isMobile) {
        document.body.classList.add('landscape-mode');
        document.body.classList.remove('portrait-mode');
        
        if (trackContainer) {
            trackContainer.style.minHeight = '200px';
            trackContainer.style.height = '200px';
        }
    } else {
        document.body.classList.add('portrait-mode');
        document.body.classList.remove('landscape-mode');
        
        if (trackContainer) {
            trackContainer.style.minHeight = '';
            trackContainer.style.height = '';
        }
    }
}

// Optimize note animations for mobile
function optimizeNoteAnimations() {
    if (!DeviceInfo.isMobile) return;
    
    // Use transform instead of top for better performance
    const style = document.createElement('style');
    style.textContent = `
        .note {
            will-change: transform;
            transform: translateZ(0);
        }
        @keyframes moveDownMobile {
            0% { transform: translateY(0); opacity: 1; }
            100% { transform: translateY(var(--track-height)); opacity: 0; }
        }
    `;
    document.head.appendChild(style);
}

// Add haptic feedback on hits (mobile only)
function addHapticFeedback() {
    if (!DeviceInfo.isMobile) return;
    if (!DeviceInfo.supportsVibration()) return;
    
    const originalJudge = window.judge;
    if (originalJudge && typeof originalJudge === 'function') {
        window.judge = function(index) {
            navigator.vibrate(30);
            return originalJudge(index);
        };
    }
}

// Initialize mobile optimizations
document.addEventListener('DOMContentLoaded', () => {
    applyMobileOptimizations();
    optimizeNoteAnimations();
    addHapticFeedback();
});