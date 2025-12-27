// ============================================
// COSMIC TYPER - Player Profile System
// Manages player data, progress, and achievements
// ============================================

class PlayerProfile {
    constructor() {
        this.data = this.loadData() || this.createDefaultProfile();
    }
    
    createDefaultProfile() {
        return {
            name: '',
            createdAt: Date.now(),
            lastPlayed: Date.now(),
            
            // Skill tracking
            skill: {
                level: 1,
                experience: 0,
                difficulty: 'beginner', // beginner, easy, medium, hard
                assessmentComplete: false,
                
                // Typing metrics
                avgAccuracy: 0,
                avgWPM: 0,
                totalCorrect: 0,
                totalWrong: 0,
                
                // Per-letter accuracy tracking
                letterStats: {}
            },
            
            // Progress tracking
            progress: {
                totalStars: 0,
                totalScore: 0,
                gamesPlayed: 0,
                totalPlayTime: 0, // in seconds
                
                // Level progress
                levels: {
                    'asteroid-defense': {
                        unlocked: true,
                        highScore: 0,
                        bestStars: 0,
                        timesPlayed: 0,
                        timesCompleted: 0
                    },
                    'rocket-launch': {
                        unlocked: false,
                        highScore: 0,
                        bestStars: 0,
                        timesPlayed: 0,
                        timesCompleted: 0
                    },
                    'space-race': {
                        unlocked: false,
                        highScore: 0,
                        bestStars: 0,
                        timesPlayed: 0,
                        timesCompleted: 0
                    },
                    'robot-builder': {
                        unlocked: false,
                        highScore: 0,
                        bestStars: 0,
                        timesPlayed: 0,
                        timesCompleted: 0
                    }
                }
            },
            
            // Achievements
            achievements: {},
            
            // Settings
            settings: {
                soundEnabled: true,
                musicEnabled: true,
                soundVolume: 0.7,
                musicVolume: 0.3,
                showKeyboardHints: true,
                particleEffects: true
            }
        };
    }
    
    // Save data to localStorage
    saveData() {
        try {
            localStorage.setItem('cosmicTyper_profile', JSON.stringify(this.data));
        } catch (e) {
            console.warn('Could not save profile data');
        }
    }
    
    // Load data from localStorage
    loadData() {
        try {
            const data = localStorage.getItem('cosmicTyper_profile');
            return data ? JSON.parse(data) : null;
        } catch (e) {
            console.warn('Could not load profile data');
            return null;
        }
    }
    
    // Reset profile
    reset() {
        this.data = this.createDefaultProfile();
        this.saveData();
    }
    
    // Check if player exists
    hasProfile() {
        return this.data.name !== '';
    }
    
    // Set player name
    setName(name) {
        this.data.name = name.trim();
        this.saveData();
    }
    
    // Get player name
    getName() {
        return this.data.name;
    }
    
    // Update skill level based on performance
    // ONLY called on VICTORY - not on failure!
    updateSkill(accuracy, wpm, lettersTyped, victory = true) {
        // Only update skill progression on victory
        if (!victory) return 0;
        
        const skill = this.data.skill;
        
        // Update totals
        skill.totalCorrect += Math.round(lettersTyped * accuracy);
        skill.totalWrong += Math.round(lettersTyped * (1 - accuracy));
        
        // Calculate running averages
        const totalLetters = skill.totalCorrect + skill.totalWrong;
        skill.avgAccuracy = skill.totalCorrect / Math.max(totalLetters, 1);
        
        // Update WPM average (weighted recent performance more)
        skill.avgWPM = skill.avgWPM * 0.7 + wpm * 0.3;
        
        // Add experience - MORE GENEROUS for victories
        const expGained = Math.round(lettersTyped * accuracy * 15); // Increased from 10
        skill.experience += expGained;
        
        // Level up check - MORE FORGIVING thresholds
        const expNeeded = this.getExpForLevel(skill.level + 1);
        if (skill.experience >= expNeeded) {
            skill.level++;
            this.checkAchievement('level_' + skill.level);
        }
        
        // DON'T auto-adjust difficulty on skill update
        // Let the player stay at their current difficulty unless they specifically excel
        
        this.saveData();
        return expGained;
    }
    
    // Get experience needed for a level
    getExpForLevel(level) {
        return Math.floor(100 * Math.pow(1.5, level - 1));
    }
    
    // Get current experience progress (0-1)
    getExpProgress() {
        const currentLevelExp = this.getExpForLevel(this.data.skill.level);
        const nextLevelExp = this.getExpForLevel(this.data.skill.level + 1);
        const currentExp = this.data.skill.experience;
        
        return (currentExp - currentLevelExp) / (nextLevelExp - currentLevelExp);
    }
    
    // Adjust difficulty based on recent performance
    // VERY CONSERVATIVE - only increases difficulty with sustained excellent performance
    // Kids should stay at comfortable levels to build confidence
    adjustDifficulty() {
        const skill = this.data.skill;
        const accuracy = skill.avgAccuracy;
        const level = skill.level;
        const gamesPlayed = this.data.progress.gamesPlayed;
        const wpm = skill.avgWPM;
        
        // Require BOTH high accuracy AND decent WPM for difficulty increases
        // This prevents "slow but accurate" players from facing harder difficulty
        if (accuracy > 0.95 && wpm >= 30 && level >= 12 && gamesPlayed >= 30) {
            skill.difficulty = 'hard';
        } else if (accuracy > 0.90 && wpm >= 20 && level >= 8 && gamesPlayed >= 15) {
            skill.difficulty = 'medium';
        } else if (accuracy > 0.80 && wpm >= 12 && level >= 4 && gamesPlayed >= 8) {
            skill.difficulty = 'easy';
        } else {
            skill.difficulty = 'beginner';
        }
    }
    
    // Get current difficulty
    getDifficulty() {
        return this.data.skill.difficulty;
    }
    
    // Record letter performance (for adaptive difficulty)
    recordLetterPerformance(letter, correct) {
        const stats = this.data.skill.letterStats;
        
        if (!stats[letter]) {
            stats[letter] = { correct: 0, wrong: 0 };
        }
        
        if (correct) {
            stats[letter].correct++;
        } else {
            stats[letter].wrong++;
        }
        
        this.saveData();
    }
    
    // Get weakest letters (letters with lowest accuracy)
    getWeakestLetters(count = 5) {
        const stats = this.data.skill.letterStats;
        const letters = Object.keys(stats);
        
        if (letters.length === 0) return [];
        
        return letters
            .map(letter => ({
                letter,
                accuracy: stats[letter].correct / (stats[letter].correct + stats[letter].wrong)
            }))
            .filter(l => (stats[l.letter].correct + stats[l.letter].wrong) >= 5) // At least 5 attempts
            .sort((a, b) => a.accuracy - b.accuracy)
            .slice(0, count)
            .map(l => l.letter);
    }
    
    // Complete skill assessment
    completeAssessment(accuracy, wpm) {
        const skill = this.data.skill;
        
        skill.assessmentComplete = true;
        skill.avgAccuracy = accuracy;
        skill.avgWPM = wpm;
        
        // Set initial difficulty based on assessment
        if (accuracy > 0.9 && wpm > 30) {
            skill.difficulty = 'medium';
            skill.level = 3;
        } else if (accuracy > 0.8 && wpm > 20) {
            skill.difficulty = 'easy';
            skill.level = 2;
        } else {
            skill.difficulty = 'beginner';
            skill.level = 1;
        }
        
        skill.experience = this.getExpForLevel(skill.level);
        
        this.saveData();
    }
    
    // Record game completion
    recordGameCompletion(levelId, score, stars, timeSpent, completed) {
        const progress = this.data.progress;
        const levelProgress = progress.levels[levelId];
        
        if (!levelProgress) return;
        
        // Update stats
        progress.gamesPlayed++;
        progress.totalScore += score;
        progress.totalPlayTime += timeSpent;
        
        if (stars > 0) {
            progress.totalStars += stars;
        }
        
        // Update level progress
        levelProgress.timesPlayed++;
        if (completed) {
            levelProgress.timesCompleted++;
        }
        
        if (score > levelProgress.highScore) {
            levelProgress.highScore = score;
            this.checkAchievement('high_score_' + levelId);
        }
        
        if (stars > levelProgress.bestStars) {
            levelProgress.bestStars = stars;
        }
        
        // Unlock next level if completed with at least 1 star
        if (completed && stars >= 1) {
            this.unlockNextLevel(levelId);
        }
        
        // Check achievements
        this.checkGameAchievements(levelId, score, stars, completed);
        
        this.data.lastPlayed = Date.now();
        this.saveData();
    }
    
    // Unlock next level
    unlockNextLevel(currentLevelId) {
        const levelOrder = ['asteroid-defense', 'rocket-launch', 'space-race', 'robot-builder'];
        const currentIndex = levelOrder.indexOf(currentLevelId);
        
        if (currentIndex >= 0 && currentIndex < levelOrder.length - 1) {
            const nextLevel = levelOrder[currentIndex + 1];
            this.data.progress.levels[nextLevel].unlocked = true;
        }
    }
    
    // Check if level is unlocked
    isLevelUnlocked(levelId) {
        return this.data.progress.levels[levelId]?.unlocked || false;
    }
    
    // Get level progress
    getLevelProgress(levelId) {
        return this.data.progress.levels[levelId] || null;
    }
    
    // Achievement system
    checkAchievement(achievementId) {
        if (this.data.achievements[achievementId]) return false;
        
        const achievement = ACHIEVEMENTS[achievementId];
        if (!achievement) return false;
        
        this.data.achievements[achievementId] = {
            unlockedAt: Date.now()
        };
        
        this.saveData();
        return achievement;
    }
    
    checkGameAchievements(levelId, score, stars, completed) {
        // First completion achievements
        if (completed && this.data.progress.levels[levelId].timesCompleted === 1) {
            this.checkAchievement('first_complete_' + levelId);
        }
        
        // Star achievements
        if (stars === 3) {
            this.checkAchievement('perfect_' + levelId);
        }
        
        // Score achievements
        if (score >= 1000) this.checkAchievement('score_1000');
        if (score >= 5000) this.checkAchievement('score_5000');
        if (score >= 10000) this.checkAchievement('score_10000');
        
        // Games played achievements
        const gamesPlayed = this.data.progress.gamesPlayed;
        if (gamesPlayed >= 10) this.checkAchievement('games_10');
        if (gamesPlayed >= 50) this.checkAchievement('games_50');
        if (gamesPlayed >= 100) this.checkAchievement('games_100');
        
        // Total stars achievements
        const totalStars = this.data.progress.totalStars;
        if (totalStars >= 10) this.checkAchievement('stars_10');
        if (totalStars >= 50) this.checkAchievement('stars_50');
        if (totalStars >= 100) this.checkAchievement('stars_100');
    }
    
    // Get unlocked achievements
    getUnlockedAchievements() {
        return Object.keys(this.data.achievements).map(id => ({
            id,
            ...ACHIEVEMENTS[id],
            unlockedAt: this.data.achievements[id].unlockedAt
        }));
    }
    
    // Settings
    getSetting(key) {
        return this.data.settings[key];
    }
    
    setSetting(key, value) {
        this.data.settings[key] = value;
        this.saveData();
    }
    
    // Get summary stats
    getStats() {
        return {
            name: this.data.name,
            level: this.data.skill.level,
            experience: this.data.skill.experience,
            expProgress: this.getExpProgress(),
            difficulty: this.data.skill.difficulty,
            avgAccuracy: Math.round(this.data.skill.avgAccuracy * 100),
            avgWPM: Math.round(this.data.skill.avgWPM),
            totalStars: this.data.progress.totalStars,
            totalScore: this.data.progress.totalScore,
            gamesPlayed: this.data.progress.gamesPlayed,
            totalPlayTime: this.data.progress.totalPlayTime,
            achievementCount: Object.keys(this.data.achievements).length
        };
    }
}

// Achievement definitions
const ACHIEVEMENTS = {
    // Level milestones
    'level_2': { name: 'Rising Star', description: 'Reach level 2', icon: '⭐' },
    'level_5': { name: 'Space Cadet', description: 'Reach level 5', icon: '🚀' },
    'level_10': { name: 'Star Captain', description: 'Reach level 10', icon: '👨‍🚀' },
    
    // First completions
    'first_complete_asteroid-defense': { name: 'Defender', description: 'Complete Asteroid Defense', icon: '🛡️' },
    'first_complete_rocket-launch': { name: 'Pilot', description: 'Complete Rocket Launch', icon: '🚀' },
    
    // Perfect scores
    'perfect_asteroid-defense': { name: 'Perfect Defense', description: 'Get 3 stars on Asteroid Defense', icon: '💫' },
    'perfect_rocket-launch': { name: 'Perfect Launch', description: 'Get 3 stars on Rocket Launch', icon: '🌟' },
    
    // Score milestones
    'score_1000': { name: 'Point Hunter', description: 'Score 1000 points in a game', icon: '🎯' },
    'score_5000': { name: 'High Scorer', description: 'Score 5000 points in a game', icon: '🏆' },
    'score_10000': { name: 'Score Master', description: 'Score 10000 points in a game', icon: '👑' },
    
    // Games played
    'games_10': { name: 'Getting Started', description: 'Play 10 games', icon: '🎮' },
    'games_50': { name: 'Dedicated', description: 'Play 50 games', icon: '💪' },
    'games_100': { name: 'Typing Champion', description: 'Play 100 games', icon: '🏅' },
    
    // Stars collected
    'stars_10': { name: 'Star Collector', description: 'Collect 10 total stars', icon: '✨' },
    'stars_50': { name: 'Star Hunter', description: 'Collect 50 total stars', icon: '🌠' },
    'stars_100': { name: 'Galaxy Master', description: 'Collect 100 total stars', icon: '🌌' },
    
    // Combo achievements
    'combo_10': { name: 'Combo Starter', description: 'Get a 10x combo', icon: '🔥' },
    'combo_25': { name: 'Combo King', description: 'Get a 25x combo', icon: '⚡' },
    'combo_50': { name: 'Unstoppable', description: 'Get a 50x combo', icon: '💥' }
};

// Export
window.PlayerProfile = PlayerProfile;
window.ACHIEVEMENTS = ACHIEVEMENTS;
