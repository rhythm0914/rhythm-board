// mobile-detector.js - Cross-platform device detection and optimization

// Detect device type
const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
const isTablet = /iPad|Android(?!.*Mobile)/i.test(navigator.userAgent);
const isIOS = /iPhone|iPad|iPod/i.test(navigator.userAgent);
const isAndroid = /Android/i.test(navigator.userAgent);
const isTouchDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0;

// Detect screen orientation
let isLandscape = window.innerWidth > window.innerHeight;

// Detect performance capability
const isLowEndDevice = (() => {
    // Check for older devices or low memory
    const memory = navigator.deviceMemory || 4;
    const cores = navigator.hardwareConcurrency || 2;
    return memory <= 2 || cores <= 2;
})();

// Export detection results
const DeviceInfo = {
    isMobile,
    isTablet,
    isDesktop: !isMobile && !isTablet,
    isIOS,
    isAndroid,
    isTouchDevice,
    isLandscape,
    isLowEndDevice,
    screenWidth: window.innerWidth,
    screenHeight: window.innerHeight,
    pixelRatio: window.devicePixelRatio || 1,
    
    // Get optimized settings based on device
    getOptimizedSettings() {
        if (isLowEndDevice) {
            return {
                noteSpeed: 2,
                particlesEnabled: false,
                hitEffectScale: 0.7,
                comboTextScale: 0.8,
                animationQuality: 'low'
            };
        } else if (isMobile) {
            return {
                noteSpeed: 1.5,
                particlesEnabled: true,
                hitEffectScale: 0.85,
                comboTextScale: 0.9,
                animationQuality: 'medium'
            };
        } else {
            return {
                noteSpeed: 1,
                particlesEnabled: true,
                hitEffectScale: 1,
                comboTextScale: 1,
                animationQuality: 'high'
            };
        }
    },
    
    // Get UI adjustments
    getUIAdjustments() {
        if (isMobile && isLandscape) {
            return {
                keyHeight: '45px',
                trackHeight: '280px',
                fontSize: '0.9rem'
            };
        } else if (isMobile) {
            return {
                keyHeight: '55px',
                trackHeight: '350px',
                fontSize: '1rem'
            };
        } else {
            return {
                keyHeight: '70px',
                trackHeight: '420px',
                fontSize: '1.2rem'
            };
        }
    },
    
    // Check if device supports vibration
    supportsVibration() {
        return 'vibrate' in navigator && !isLowEndDevice;
    },
    
    // Get optimal note count for performance
    getMaxNotes() {
        if (isLowEndDevice) return 5;
        if (isMobile) return 7;
        return 7;
    }
};

// Listen for orientation changes
window.addEventListener('resize', () => {
    DeviceInfo.isLandscape = window.innerWidth > window.innerHeight;
    DeviceInfo.screenWidth = window.innerWidth;
    DeviceInfo.screenHeight = window.innerHeight;
    
    // Dispatch custom event for orientation change
    window.dispatchEvent(new CustomEvent('orientationchange', { 
        detail: { isLandscape: DeviceInfo.isLandscape }
    }));
});

// Export for use in other scripts
window.DeviceInfo = DeviceInfo;
window.isMobile = isMobile;
window.isTouchDevice = isTouchDevice;

console.log('Device Detection:', {
    isMobile,
    isTablet,
    isTouchDevice,
    isLowEndDevice,
    orientation: isLandscape ? 'landscape' : 'portrait'
});