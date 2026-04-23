// ============================================
// FIREBASE LEADERBOARD SYSTEM
// Works with your existing Firebase configuration
// ============================================

import { initializeApp } from 'https://www.gstatic.com/firebasejs/12.12.0/firebase-app.js';
import { 
    getFirestore, 
    collection, 
    doc, 
    setDoc, 
    getDoc, 
    getDocs, 
    query, 
    orderBy, 
    limit, 
    where,
    deleteDoc,
    updateDoc,
    addDoc,
    serverTimestamp
} from 'https://www.gstatic.com/firebasejs/12.12.0/firebase-firestore.js';
import { 
    getAuth, 
    createUserWithEmailAndPassword, 
    signInWithEmailAndPassword, 
    signOut, 
    onAuthStateChanged 
} from 'https://www.gstatic.com/firebasejs/12.12.0/firebase-auth.js';

// Firebase Configuration (your existing config)
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

// Leaderboard System Class
class FirebaseLeaderboard {
    constructor() {
        this.currentUser = null;
        this.scoresCache = [];
        this.lastFetch = 0;
        this.cacheTTL = 30000; // 30 seconds cache
    }

    // ============================================
    // USER AUTHENTICATION
    // ============================================

    async signUp(email, password, username) {
        try {
            const userCredential = await createUserWithEmailAndPassword(auth, email, password);
            const user = userCredential.user;
            
            // Create user document in Firestore
            await setDoc(doc(db, 'users', user.uid), {
                email: email,
                username: username || email.split('@')[0],
                createdAt: serverTimestamp(),
                highScore: 0,
                totalPlays: 0,
                totalPerfect: 0,
                lastPlayed: null
            });
            
            this.currentUser = {
                uid: user.uid,
                email: email,
                username: username || email.split('@')[0]
            };
            
            return { success: true, user: this.currentUser };
        } catch (error) {
            console.error('Signup error:', error);
            return { success: false, error: error.message };
        }
    }

    async login(email, password) {
        try {
            const userCredential = await signInWithEmailAndPassword(auth, email, password);
            const user = userCredential.user;
            
            // Get user data from Firestore
            const userDoc = await getDoc(doc(db, 'users', user.uid));
            const userData = userDoc.exists() ? userDoc.data() : {};
            
            this.currentUser = {
                uid: user.uid,
                email: user.email,
                username: userData.username || user.email.split('@')[0],
                highScore: userData.highScore || 0
            };
            
            return { success: true, user: this.currentUser };
        } catch (error) {
            console.error('Login error:', error);
            return { success: false, error: error.message };
        }
    }

    async logout() {
        try {
            await signOut(auth);
            this.currentUser = null;
            return { success: true };
        } catch (error) {
            console.error('Logout error:', error);
            return { success: false, error: error.message };
        }
    }

    // Get current user (call this on page load)
    async getCurrentUser() {
        return new Promise((resolve) => {
            onAuthStateChanged(auth, async (user) => {
                if (user) {
                    const userDoc = await getDoc(doc(db, 'users', user.uid));
                    const userData = userDoc.exists() ? userDoc.data() : {};
                    this.currentUser = {
                        uid: user.uid,
                        email: user.email,
                        username: userData.username || user.email.split('@')[0],
                        highScore: userData.highScore || 0
                    };
                    resolve(this.currentUser);
                } else {
                    this.currentUser = null;
                    resolve(null);
                }
            });
        });
    }

    // ============================================
    // SCORE MANAGEMENT
    // ============================================

    async saveScore(score, gameStats) {
        if (!this.currentUser) {
            console.log('No user logged in - score not saved');
            return { success: false, error: 'Not logged in' };
        }

        try {
            // Save individual score entry
            const scoreEntry = {
                userId: this.currentUser.uid,
                username: this.currentUser.username,
                email: this.currentUser.email,
                score: Math.floor(score),
                perfect: gameStats.perfect || 0,
                good: gameStats.good || 0,
                bad: gameStats.bad || 0,
                miss: gameStats.miss || 0,
                maxCombo: gameStats.maxCombo || 0,
                accuracy: this.calculateAccuracy(gameStats),
                timestamp: serverTimestamp(),
                date: new Date().toISOString()
            };

            await addDoc(collection(db, 'leaderboard'), scoreEntry);

            // Update user's high score and stats
            const userRef = doc(db, 'users', this.currentUser.uid);
            const userDoc = await getDoc(userRef);
            const currentHighScore = userDoc.exists() ? (userDoc.data().highScore || 0) : 0;
            
            const updates = {
                totalPlays: (userDoc.exists() ? (userDoc.data().totalPlays || 0) : 0) + 1,
                totalPerfect: (userDoc.exists() ? (userDoc.data().totalPerfect || 0) : 0) + (gameStats.perfect || 0),
                lastPlayed: serverTimestamp()
            };
            
            if (score > currentHighScore) {
                updates.highScore = Math.floor(score);
            }
            
            await updateDoc(userRef, updates);
            
            // Update local user data
            if (score > (this.currentUser.highScore || 0)) {
                this.currentUser.highScore = Math.floor(score);
            }
            
            // Invalidate cache
            this.scoresCache = [];
            this.lastFetch = 0;
            
            console.log('Score saved successfully:', Math.floor(score));
            return { success: true, score: Math.floor(score), isHighScore: score > currentHighScore };
        } catch (error) {
            console.error('Error saving score:', error);
            return { success: false, error: error.message };
        }
    }

    calculateAccuracy(stats) {
        const total = (stats.perfect || 0) + (stats.good || 0) + (stats.bad || 0) + (stats.miss || 0);
        if (total === 0) return 0;
        const perfectWeight = 1;
        const goodWeight = 0.7;
        const badWeight = 0.3;
        const missWeight = 0;
        
        const weightedScore = (stats.perfect || 0) * perfectWeight +
                             (stats.good || 0) * goodWeight +
                             (stats.bad || 0) * badWeight +
                             (stats.miss || 0) * missWeight;
        
        return Math.round((weightedScore / total) * 100);
    }

    // ============================================
    // LEADERBOARD QUERIES
    // ============================================

    async getGlobalLeaderboard(limitCount = 20) {
        // Check cache
        const now = Date.now();
        if (this.scoresCache.length > 0 && (now - this.lastFetch) < this.cacheTTL) {
            return this.scoresCache;
        }

        try {
            const leaderboardRef = collection(db, 'leaderboard');
            const q = query(leaderboardRef, orderBy('score', 'desc'), limit(limitCount));
            const querySnapshot = await getDocs(q);
            
            const leaderboard = [];
            let rank = 1;
            
            querySnapshot.forEach((doc) => {
                const data = doc.data();
                leaderboard.push({
                    id: doc.id,
                    rank: rank++,
                    username: data.username || data.email?.split('@')[0] || 'Anonymous',
                    score: data.score,
                    perfect: data.perfect || 0,
                    good: data.good || 0,
                    bad: data.bad || 0,
                    miss: data.miss || 0,
                    maxCombo: data.maxCombo || 0,
                    accuracy: data.accuracy || 0,
                    date: this.formatDate(data.date || data.timestamp),
                    timestamp: data.timestamp?.toDate?.() || new Date(data.date)
                });
            });
            
            this.scoresCache = leaderboard;
            this.lastFetch = now;
            
            return leaderboard;
        } catch (error) {
            console.error('Error loading leaderboard:', error);
            return [];
        }
    }

    async getUserRanking(userId) {
        try {
            // Get all scores sorted
            const leaderboardRef = collection(db, 'leaderboard');
            const q = query(leaderboardRef, orderBy('score', 'desc'));
            const querySnapshot = await getDocs(q);
            
            let rank = 1;
            let userBestScore = 0;
            let userRank = null;
            
            querySnapshot.forEach((doc) => {
                const data = doc.data();
                if (data.userId === userId && data.score > userBestScore) {
                    userBestScore = data.score;
                    userRank = rank;
                }
                rank++;
            });
            
            return { rank: userRank, bestScore: userBestScore };
        } catch (error) {
            console.error('Error getting user ranking:', error);
            return { rank: null, bestScore: 0 };
        }
    }

    async getUserScores(userId, limitCount = 10) {
        try {
            const leaderboardRef = collection(db, 'leaderboard');
            const q = query(
                leaderboardRef, 
                where('userId', '==', userId),
                orderBy('score', 'desc'), 
                limit(limitCount)
            );
            const querySnapshot = await getDocs(q);
            
            const scores = [];
            querySnapshot.forEach((doc) => {
                const data = doc.data();
                scores.push({
                    id: doc.id,
                    score: data.score,
                    perfect: data.perfect,
                    good: data.good,
                    bad: data.bad,
                    miss: data.miss,
                    maxCombo: data.maxCombo,
                    accuracy: data.accuracy,
                    date: this.formatDate(data.date || data.timestamp)
                });
            });
            
            return scores;
        } catch (error) {
            console.error('Error getting user scores:', error);
            return [];
        }
    }

    async getTotalPlayers() {
        try {
            const usersRef = collection(db, 'users');
            const querySnapshot = await getDocs(usersRef);
            return querySnapshot.size;
        } catch (error) {
            console.error('Error getting total players:', error);
            return 0;
        }
    }

    async getWeeklyLeaderboard(limitCount = 20) {
        const oneWeekAgo = new Date();
        oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
        
        try {
            const leaderboardRef = collection(db, 'leaderboard');
            // Note: You would need to add a timestamp field for this query
            // For now, return global leaderboard
            return this.getGlobalLeaderboard(limitCount);
        } catch (error) {
            console.error('Error getting weekly leaderboard:', error);
            return [];
        }
    }

    // ============================================
    // HELPER FUNCTIONS
    // ============================================

    formatDate(dateValue) {
        if (!dateValue) return 'Just now';
        
        let date;
        if (dateValue.toDate) {
            date = dateValue.toDate();
        } else if (typeof dateValue === 'string') {
            date = new Date(dateValue);
        } else {
            date = new Date(dateValue);
        }
        
        const now = new Date();
        const diffMs = now - date;
        const diffMins = Math.floor(diffMs / 60000);
        const diffHours = Math.floor(diffMs / 3600000);
        const diffDays = Math.floor(diffMs / 86400000);
        
        if (diffMins < 1) return 'Just now';
        if (diffMins < 60) return `${diffMins}m ago`;
        if (diffHours < 24) return `${diffHours}h ago`;
        if (diffDays < 7) return `${diffDays}d ago`;
        if (diffDays < 30) return `${Math.floor(diffDays / 7)}w ago`;
        
        return date.toLocaleDateString();
    }

    isLoggedIn() {
        return this.currentUser !== null;
    }

    // Admin function to reset scores (use carefully!)
    async adminResetAllScores(adminKey) {
        if (adminKey !== 'YOUR_SECRET_ADMIN_KEY') {
            return { success: false, error: 'Unauthorized' };
        }
        
        try {
            const leaderboardRef = collection(db, 'leaderboard');
            const querySnapshot = await getDocs(leaderboardRef);
            
            const deletePromises = [];
            querySnapshot.forEach((doc) => {
                deletePromises.push(deleteDoc(doc.ref));
            });
            
            await Promise.all(deletePromises);
            
            // Reset user high scores
            const usersRef = collection(db, 'users');
            const usersSnapshot = await getDocs(usersRef);
            const userUpdatePromises = [];
            usersSnapshot.forEach((userDoc) => {
                userUpdatePromises.push(updateDoc(userDoc.ref, { highScore: 0 }));
            });
            await Promise.all(userUpdatePromises);
            
            return { success: true };
        } catch (error) {
            console.error('Error resetting scores:', error);
            return { success: false, error: error.message };
        }
    }
}

// Create global instance
window.firebaseLeaderboard = new FirebaseLeaderboard();

// Auto-initialize current user
window.firebaseLeaderboard.getCurrentUser();

console.log('Firebase Leaderboard System initialized!');