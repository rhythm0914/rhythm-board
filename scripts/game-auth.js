// Import Firebase modules
import { initializeApp } from 'https://www.gstatic.com/firebasejs/12.12.0/firebase-app.js';
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut, onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/12.12.0/firebase-auth.js';

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

let currentUser = null;

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
            errorDiv.textContent = '';
            hideAuthModal();
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
            await createUserWithEmailAndPassword(auth, email, password);
            errorDiv.textContent = '';
            hideAuthModal();
        } catch (error) {
            errorDiv.textContent = 'Signup failed: ' + error.message;
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

if (showAuthBtn) {
    showAuthBtn.addEventListener('click', showAuthModal);
}

if (authModalClose) {
    authModalClose.addEventListener('click', hideAuthModal);
}

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
    } else {
        if (userBar) userBar.style.display = 'none';
        if (showAuthBtn) showAuthBtn.style.display = 'block';
        
        const startBtn = document.querySelector('.btn--start');
        if (startBtn) startBtn.style.pointerEvents = 'auto';
    }
});

window.getCurrentUser = function() {
    return currentUser;
};

console.log('Firebase Auth initialized!');