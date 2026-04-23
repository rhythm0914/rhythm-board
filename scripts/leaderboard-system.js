// ============================================
// COMPLETE LEADERBOARD SYSTEM FOR GITHUB PAGES
// Uses localStorage for user accounts and scores
// Works without backend - 100% client-side
// ============================================

const STORAGE_KEYS = {
    USERS: 'rhythm_users',
    SCORES: 'rhythm_scores',
    CURRENT_USER: 'rhythm_current_user'
};

// ============================================
// USER MANAGEMENT
// ============================================

class LeaderboardSystem {
    constructor() {
        this.users = this.loadUsers();
        this.scores = this.loadScores();
        this.currentUser = this.getCurrentUser();
    }

    loadUsers() {
        const users = localStorage.getItem(STORAGE_KEYS.USERS);
        return users ? JSON.parse(users) : {};
    }

    saveUsers() {
        localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(this.users));
    }

    loadScores() {
        const scores = localStorage.getItem(STORAGE_KEYS.SCORES);
        return scores ? JSON.parse(scores) : [];
    }

    saveScores() {
        localStorage.setItem(STORAGE_KEYS.SCORES, JSON.stringify(this.scores));
    }

    getCurrentUser() {
        const user = localStorage.getItem(STORAGE_KEYS.CURRENT_USER);
        return user ? JSON.parse(user) : null;
    }

    setCurrentUser(user) {
        this.currentUser = user;
        if (user) {
            localStorage.setItem(STORAGE_KEYS.CURRENT_USER, JSON.stringify(user));
        } else {
            localStorage.removeItem(STORAGE_KEYS.CURRENT_USER);
        }
    }

    // Sign up new user
    signUp(email, password) {
        return new Promise((resolve, reject) => {
            const userId = 'user_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
            
            if (this.users[email]) {
                reject(new Error('Email already registered'));
                return;
            }

            const user = {
                id: userId,
                email: email,
                password: this.hashPassword(password),
                username: email.split('@')[0],
                createdAt: new Date().toISOString(),
                highScore: 0
            };

            this.users[email] = user;
            this.saveUsers();
            
            const { password: _, ...userWithoutPassword } = user;
            this.setCurrentUser(userWithoutPassword);
            resolve(userWithoutPassword);
        });
    }

    // Login user
    login(email, password) {
        return new Promise((resolve, reject) => {
            const user = this.users[email];
            
            if (!user) {
                reject(new Error('User not found'));
                return;
            }

            if (user.password !== this.hashPassword(password)) {
                reject(new Error('Invalid password'));
                return;
            }

            const { password: _, ...userWithoutPassword } = user;
            this.setCurrentUser(userWithoutPassword);
            resolve(userWithoutPassword);
        });
    }

    // Logout
    logout() {
        this.setCurrentUser(null);
        this.currentUser = null;
    }

    // Simple hash function for passwords (not for production, but works for demo)
    hashPassword(password) {
        let hash = 0;
        for (let i = 0; i < password.length; i++) {
            const char = password.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash;
        }
        return hash.toString();
    }

    // Save score for logged-in user
    saveScore(score, hits) {
        if (!this.currentUser) {
            console.log('Guest play - score not saved');
            return false;
        }

        const scoreEntry = {
            id: Date.now() + '_' + Math.random().toString(36).substr(2, 5),
            userId: this.currentUser.id,
            username: this.currentUser.username,
            email: this.currentUser.email,
            score: Math.floor(score),
            perfect: hits.perfect,
            good: hits.good,
            bad: hits.bad,
            miss: hits.miss,
            maxCombo: hits.maxCombo || 0,
            date: new Date().toISOString(),
            timestamp: Date.now()
        };

        this.scores.push(scoreEntry);
        
        // Sort scores descending and keep only top 100
        this.scores.sort((a, b) => b.score - a.score);
        if (this.scores.length > 100) {
            this.scores = this.scores.slice(0, 100);
        }
        
        this.saveScores();
        
        // Update user's high score
        if (this.currentUser && score > (this.users[this.currentUser.email]?.highScore || 0)) {
            this.users[this.currentUser.email].highScore = score;
            this.saveUsers();
        }
        
        console.log('Score saved:', scoreEntry);
        return true;
    }

    // Get leaderboard data
    getLeaderboard(limit = 20) {
        const sortedScores = [...this.scores].sort((a, b) => b.score - a.score);
        return sortedScores.slice(0, limit).map((entry, index) => ({
            rank: index + 1,
            username: entry.username,
            score: entry.score,
            date: this.formatDate(entry.date),
            timestamp: entry.timestamp
        }));
    }

    // Get user's personal best
    getUserBestScore(userId) {
        const userScores = this.scores.filter(s => s.userId === userId);
        if (userScores.length === 0) return null;
        return Math.max(...userScores.map(s => s.score));
    }

    // Get total players count
    getTotalPlayers() {
        const uniqueUsers = new Set(this.scores.map(s => s.userId));
        return uniqueUsers.size;
    }

    // Format date for display
    formatDate(dateString) {
        const date = new Date(dateString);
        const now = new Date();
        const diffDays = Math.floor((now - date) / (1000 * 60 * 60 * 24));
        
        if (diffDays === 0) return 'Today';
        if (diffDays === 1) return 'Yesterday';
        if (diffDays < 7) return `${diffDays} days ago`;
        if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
        return date.toLocaleDateString();
    }

    // Get current user
    getCurrentUserInfo() {
        return this.currentUser;
    }

    // Check if user is logged in
    isLoggedIn() {
        return this.currentUser !== null;
    }

    // Reset all data (admin only - for debugging)
    resetAllData() {
        if (confirm('This will delete all user accounts and scores. Are you sure?')) {
            localStorage.removeItem(STORAGE_KEYS.USERS);
            localStorage.removeItem(STORAGE_KEYS.SCORES);
            localStorage.removeItem(STORAGE_KEYS.CURRENT_USER);
            this.users = {};
            this.scores = [];
            this.currentUser = null;
            location.reload();
        }
    }
}

// Create global instance
window.leaderboardSystem = new LeaderboardSystem();

// Export for use in other files
if (typeof module !== 'undefined' && module.exports) {
    module.exports = LeaderboardSystem;
}