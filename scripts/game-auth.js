// Import Firebase modules
import { initializeApp } from 'https://www.gstatic.com/firebasejs/12.12.0/firebase-app.js';
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut, onAuthStateChanged, GoogleAuthProvider, signInWithPopup } from 'https://www.gstatic.com/firebasejs/12.12.0/firebase-auth.js';
import { getFirestore, doc, setDoc, getDoc, addDoc, collection } from 'https://www.gstatic.com/firebasejs/12.12.0/firebase-firestore.js';

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
const googleProvider = new GoogleAuthProvider();

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

// Google Sign-In
window.signInWithGoogle = async function() {
    try {
        const result = await signInWithPopup(auth, googleProvider);
        const user = result.user;
        
        // Check if user document exists, if not create one
        const userDoc = await getDoc(doc(db, 'users', user.uid));
        if (!userDoc.exists()) {
            await setDoc(doc(db, 'users', user.uid), {
                email: user.email,
                highScore: 0,
                createdAt: new Date().toISOString()
            });
        }
        
        hideAuthModal();
        console.log('Google sign-in successful:', user.email);
    } catch (error) {
        console.error('Google sign-in error:', error);
        const errorDiv = document.getElementById('loginError');
        if (errorDiv) errorDiv.textContent = 'Google sign-in failed: ' + error.message;
    }
};

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
            await signInWithEmailAndPassword(auth, email, password);
            if (errorDiv) errorDiv.textContent = '';
            hideAuthModal();
        } catch (error) {
            if (errorDiv) errorDiv.textContent = 'Login failed: ' + error.message;
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
        } catch (error) {
            if (errorDiv) errorDiv.textContent = 'Signup failed: ' + error.message;
        }
    });
}

// Logout
if (logoutBtn) {
    logoutBtn.addEventListener('click', async () => {
        await signOut(auth);
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

// Google Sign-In button listener (dynamic check since button might load later)
const checkForGoogleButton = setInterval(() => {
    const googleBtn = document.getElementById('googleSignInBtn');
    if (googleBtn && !googleBtn.hasListener) {
        googleBtn.hasListener = true;
        googleBtn.addEventListener('click', window.signInWithGoogle);
        console.log('Google Sign-In button attached');
    }
}, 500);

// Clear interval after auth is initialized
setTimeout(() => {
    clearInterval(checkForGoogleButton);
}, 10000);

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

// Auth state listener
onAuthStateChanged(auth, async (user) => {
    currentUser = user;
    
    if (user) {
        if (userBar) {
            userBar.style.display = 'flex';
            userEmailSpan.textContent = user.email.split('@')[0];
        }
        if (showAuthBtn) showAuthBtn.style.display = 'none';
        
        const startBtn = document.querySelector('.btn--start');
        if (startBtn) startBtn.style.pointerEvents = 'auto';
        
        const userDoc = await getDoc(doc(db, 'users', user.uid));
        if (userDoc.exists()) {
            const highScore = userDoc.data().highScore || 0;
            console.log('User high score:', highScore);
        }
    } else {
        if (userBar) userBar.style.display = 'none';
        if (showAuthBtn) showAuthBtn.style.display = 'block';
        
        const startBtn = document.querySelector('.btn--start');
        if (startBtn) startBtn.style.pointerEvents = 'auto';
    }
});

// Export functions to window for script.js to use
window.saveScoreToLeaderboard = async function(score) {
    if (!currentUser) {
        console.log('Guest play - score not saved to leaderboard');
        return false;
    }
    
    if (gameScoreSaved) return false;
    
    try {
        await addDoc(collection(db, 'leaderboard'), {
            userId: currentUser.uid,
            email: currentUser.email,
            score: Math.floor(score),
            date: new Date().toISOString()
        });
        
        const userDoc = await getDoc(doc(db, 'users', currentUser.uid));
        const currentHighScore = userDoc.exists() ? (userDoc.data().highScore || 0) : 0;
        
        if (score > currentHighScore) {
            await setDoc(doc(db, 'users', currentUser.uid), {
                email: currentUser.email,
                highScore: Math.floor(score),
                lastPlayed: new Date().toISOString()
            }, { merge: true });
        }
        
        gameScoreSaved = true;
        console.log('Score saved to leaderboard:', Math.floor(score));
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

console.log('Firebase Auth initialized for Rhythm Game!');