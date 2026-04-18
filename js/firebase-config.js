// Import Firebase modules
import { initializeApp } from 'https://www.gstatic.com/firebasejs/12.12.0/firebase-app.js';
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut, onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/12.12.0/firebase-auth.js';
import { getFirestore, doc, setDoc, getDoc, addDoc, collection, query, orderBy, limit, getDocs, updateDoc } from 'https://www.gstatic.com/firebasejs/12.12.0/firebase-firestore.js';

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
let app;
let auth;
let db;

try {
    app = initializeApp(firebaseConfig);
    auth = getAuth(app);
    db = getFirestore(app);
    console.log('Firebase initialized successfully');
} catch (error) {
    console.error('Firebase initialization error:', error);
}

// Export all needed functions and objects
export { 
    auth, 
    db, 
    createUserWithEmailAndPassword, 
    signInWithEmailAndPassword, 
    signOut, 
    onAuthStateChanged,
    doc, 
    setDoc, 
    getDoc, 
    addDoc, 
    collection, 
    query, 
    orderBy, 
    limit, 
    getDocs,
    updateDoc
};