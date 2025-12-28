// ============================================
// COSMIC TYPER - UI System
// Manages all user interface screens and elements
// ============================================

class GameUI {
    constructor(game) {
        this.game = game;
        this.overlay = document.getElementById('ui-overlay');
        this.currentScreen = null;
        this.scorePopups = [];
        this.flashColor = null;
        this.flashAlpha = 0;
    }
    
    // Clear current screen
    clear() {
        this.overlay.innerHTML = '';
        this.currentScreen = null;
    }
    
    // Check if device is mobile in portrait mode
    checkMobilePortrait() {
        const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) ||
                         (window.innerWidth <= 768);
        const isPortrait = window.innerHeight > window.innerWidth;
        
        // Return true if we should show the warning
        return isMobile && isPortrait;
    }
    
    // Show mobile warning modal
    showMobileWarning(onContinue) {
        this.overlay.innerHTML = `
            <div class="mobile-warning-overlay">
                <div class="mobile-warning-modal">
                    <div class="warning-icon">⌨️</div>
                    <h2>Physical Keyboard Recommended</h2>
                    <p>Cosmic Typer is a typing game designed to be played with a physical keyboard.</p>
                    <p>For the best experience:</p>
                    <ul>
                        <li>🖥️ Use a computer with a keyboard</li>
                        <li>📱 Or connect a Bluetooth keyboard to your device</li>
                    </ul>
                    <div class="warning-buttons">
                        <button class="cosmic-btn primary" id="continue-anyway-btn">
                            Continue Anyway
                        </button>
                    </div>
                </div>
            </div>
        `;
        
        document.getElementById('continue-anyway-btn').addEventListener('click', () => {
            AudioManager.playClick();
            if (onContinue) onContinue();
        });
    }
    
    // Show welcome screen (first time)
    showWelcomeScreen() {
        // Check for mobile portrait mode
        if (this.checkMobilePortrait()) {
            this.showMobileWarning(() => this.showWelcomeScreenContent());
            return;
        }
        this.showWelcomeScreenContent();
    }
    
    // Actual welcome screen content
    showWelcomeScreenContent() {
        this.clear();
        this.currentScreen = 'welcome';
        
        this.overlay.innerHTML = `
            <div class="welcome-screen">
                <div class="game-logo">
                    <div class="rocket-icon">🚀</div>
                    <h1>COSMIC TYPER</h1>
                    <p class="subtitle">SPACE TYPING ADVENTURE</p>
                </div>
                <div class="name-input-container">
                    <h2>Welcome, Space Cadet!</h2>
                    <p>Enter your name to begin your cosmic journey and save your progress!</p>
                    <input type="text" 
                           class="cosmic-input" 
                           id="player-name-input" 
                           placeholder="Your Name"
                           maxlength="20"
                           autocomplete="off">
                    <button class="cosmic-btn primary" id="start-journey-btn">
                        START JOURNEY
                    </button>
                </div>
            </div>
        `;
        
        const input = document.getElementById('player-name-input');
        const btn = document.getElementById('start-journey-btn');
        
        // Focus input
        setTimeout(() => input.focus(), 100);
        
        // Handle enter key
        input.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                this.handleNameSubmit();
            }
        });
        
        btn.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            console.log('Start Journey button clicked');
            AudioManager.playClick();
            this.handleNameSubmit();
        });
        
        // Also handle touch events for mobile
        btn.addEventListener('touchend', (e) => {
            e.preventDefault();
            console.log('Start Journey button touched');
            AudioManager.playClick();
            this.handleNameSubmit();
        });
    }
    
    handleNameSubmit() {
        console.log('handleNameSubmit called');
        const input = document.getElementById('player-name-input');
        if (!input) {
            console.error('Input element not found!');
            return;
        }
        const name = input.value.trim();
        console.log('Name entered:', name);
        
        if (name.length < 1) {
            input.classList.add('shake');
            setTimeout(() => input.classList.remove('shake'), 500);
            return;
        }
        
        try {
            this.game.player.setName(name);
            console.log('Name set, showing skill assessment...');
            
            // Play welcome voice on first signup!
            // "Welcome space cadet! Are you ready for your first adventure?"
            AudioManager.playWelcome();
            
            this.showSkillAssessment();
        } catch (error) {
            console.error('Error in handleNameSubmit:', error);
        }
    }
    
    // Show skill assessment screen
    showSkillAssessment() {
        this.clear();
        this.currentScreen = 'assessment';
        
        const letters = 'ASDFGHJKL'.split('');
        const lettersHtml = letters.map((l, i) => 
            `<div class="assessment-letter" data-index="${i}">${l}</div>`
        ).join('');
        
        this.overlay.innerHTML = `
            <div class="skill-assessment">
                <div class="assessment-container">
                    <h2>Quick Skill Check!</h2>
                    <p>Type the letters below as quickly and accurately as you can. This helps us adjust the game to your skill level!</p>
                    <div class="assessment-letters" id="assessment-letters">
                        ${lettersHtml}
                    </div>
                    <div class="assessment-progress">
                        <div class="progress-bar">
                            <div class="progress-fill" id="assessment-progress" style="width: 0%"></div>
                        </div>
                    </div>
                    <p style="margin-top: 20px; opacity: 0.7;">Press any key to begin!</p>
                </div>
            </div>
        `;
        
        // Assessment state
        this.assessmentState = {
            letters: letters,
            currentIndex: 0,
            startTime: null,
            correct: 0,
            wrong: 0,
            started: false
        };
        
        // Highlight first letter
        this.updateAssessmentUI();
        
        // Add keyboard listener
        this.assessmentHandler = (e) => this.handleAssessmentKey(e);
        document.addEventListener('keydown', this.assessmentHandler);
    }
    
    handleAssessmentKey(e) {
        if (!this.assessmentState) return;
        
        const key = e.key.toUpperCase();
        const state = this.assessmentState;
        
        // Start timer on first keypress
        if (!state.started) {
            state.started = true;
            state.startTime = Date.now();
        }
        
        const expectedLetter = state.letters[state.currentIndex];
        const letterEl = document.querySelector(`.assessment-letter[data-index="${state.currentIndex}"]`);
        
        if (key === expectedLetter) {
            state.correct++;
            letterEl.classList.add('typed');
            AudioManager.playCorrect();
        } else if (key.length === 1 && key.match(/[A-Z]/)) {
            state.wrong++;
            AudioManager.playWrong();
            letterEl.classList.add('shake');
            setTimeout(() => letterEl.classList.remove('shake'), 300);
            return; // Don't advance on wrong key
        } else {
            return; // Ignore non-letter keys
        }
        
        state.currentIndex++;
        
        // Update progress
        const progress = (state.currentIndex / state.letters.length) * 100;
        document.getElementById('assessment-progress').style.width = `${progress}%`;
        
        // Check if complete
        if (state.currentIndex >= state.letters.length) {
            this.completeAssessment();
        } else {
            this.updateAssessmentUI();
        }
    }
    
    updateAssessmentUI() {
        const state = this.assessmentState;
        const letters = document.querySelectorAll('.assessment-letter');
        
        letters.forEach((el, i) => {
            el.classList.remove('current');
            if (i === state.currentIndex) {
                el.classList.add('current');
            }
        });
    }
    
    completeAssessment() {
        document.removeEventListener('keydown', this.assessmentHandler);
        
        const state = this.assessmentState;
        const totalTime = (Date.now() - state.startTime) / 1000;
        const accuracy = state.correct / state.letters.length;
        const wpm = (state.letters.length / totalTime) * 60 / 5; // Approximate WPM
        
        // Save assessment results
        this.game.player.completeAssessment(accuracy, wpm);
        
        // Show brief result
        const container = document.querySelector('.assessment-container');
        container.innerHTML = `
            <h2>Great Job! 🎉</h2>
            <p>Your typing skill has been assessed!</p>
            <div style="margin: 30px 0;">
                <div style="font-size: 3rem;">⭐</div>
                <div style="font-family: 'Orbitron', sans-serif; font-size: 1.5rem; color: var(--text-accent);">
                    Level ${this.game.player.data.skill.level} Pilot
                </div>
            </div>
            <button class="cosmic-btn primary" id="continue-btn">CONTINUE</button>
        `;
        
        document.getElementById('continue-btn').addEventListener('click', () => {
            AudioManager.playClick();
            this.showMainMenu();
        });
        
        this.assessmentState = null;
    }
    
    // Show main menu
    showMainMenu() {
        // Check for mobile portrait mode (only first time in session)
        if (this.checkMobilePortrait() && !this.mobileWarningShown) {
            this.mobileWarningShown = true;
            this.showMobileWarning(() => this.showMainMenuContent());
            return;
        }
        this.showMainMenuContent();
    }
    
    // Actual main menu content
    showMainMenuContent() {
        this.clear();
        this.currentScreen = 'mainMenu';
        
        const stats = this.game.player.getStats();
        
        this.overlay.innerHTML = `
            <div class="main-menu">
                <div class="game-logo" style="margin-bottom: 20px;">
                    <h1 style="font-size: 2.5rem;">COSMIC TYPER</h1>
                </div>
                
                <div class="player-welcome">
                    <h2>Welcome back,</h2>
                    <div class="player-name">${stats.name}</div>
                    <div class="player-stats">
                        <div class="stat-item">
                            <span class="stat-icon">⭐</span>
                            <span class="stat-value">${stats.totalStars}</span>
                            <span class="stat-label">Stars</span>
                        </div>
                        <div class="stat-item">
                            <span class="stat-icon">🎯</span>
                            <span class="stat-value">${stats.avgAccuracy}%</span>
                            <span class="stat-label">Accuracy</span>
                        </div>
                        <div class="stat-item">
                            <span class="stat-icon">🚀</span>
                            <span class="stat-value">Lv.${stats.level}</span>
                            <span class="stat-label">Rank</span>
                        </div>
                    </div>
                </div>
                
                <div class="menu-options">
                    <button class="cosmic-btn primary" id="play-btn">
                        🎮 PLAY
                    </button>
                    <button class="cosmic-btn secondary" id="settings-btn">
                        ⚙️ SETTINGS
                    </button>
                    <button class="cosmic-btn secondary" id="achievements-btn">
                        🏆 ACHIEVEMENTS
                    </button>
                </div>
            </div>
        `;
        
        document.getElementById('play-btn').addEventListener('click', () => {
            AudioManager.playClick();
            this.showLevelSelect();
        });
        
        document.getElementById('settings-btn').addEventListener('click', () => {
            AudioManager.playClick();
            this.showSettings();
        });
        
        document.getElementById('achievements-btn').addEventListener('click', () => {
            AudioManager.playClick();
            this.showAchievements();
        });
    }
    
    // Show level selection
    showLevelSelect() {
        this.clear();
        this.currentScreen = 'levelSelect';
        
        const levels = [
            {
                id: 'asteroid-defense',
                name: 'Asteroid Defense',
                icon: '🌍',
                description: 'Protect Earth from falling asteroids! Type letters to shoot them down with your laser cannon!',
                difficulty: 1
            },
            {
                id: 'rocket-launch',
                name: 'Rocket Launch',
                icon: '🚀',
                description: 'Fuel your rocket by typing letters! Race to reach the moon before time runs out!',
                difficulty: 2
            },
            {
                id: 'space-race',
                name: 'Space Race',
                icon: '🏎️',
                description: 'Coming Soon! Race against alien pilots through an asteroid field!',
                difficulty: 3,
                comingSoon: true
            },
            {
                id: 'robot-builder',
                name: 'Robot Builder',
                icon: '🤖',
                description: 'Coming Soon! Build your own robot by typing commands!',
                difficulty: 4,
                comingSoon: true
            }
        ];
        
        const levelsHtml = levels.map(level => {
            const progress = this.game.player.getLevelProgress(level.id);
            const unlocked = progress?.unlocked && !level.comingSoon;
            const stars = progress?.bestStars || 0;
            
            const difficultyStars = Array(3).fill(0).map((_, i) => 
                `<span class="difficulty-star ${i < level.difficulty ? '' : 'empty'}">★</span>`
            ).join('');
            
            const progressPercent = progress ? Math.min(100, (progress.timesCompleted / 5) * 100) : 0;
            
            return `
                <div class="level-card ${unlocked ? '' : 'locked'}" data-level="${level.id}">
                    <span class="level-icon">${level.icon}</span>
                    <h3>${level.name}</h3>
                    <p>${level.description}</p>
                    <div class="level-difficulty">${difficultyStars}</div>
                    ${unlocked ? `
                        <div class="level-progress">
                            <div class="level-progress-fill" style="width: ${progressPercent}%"></div>
                        </div>
                        <div style="display: flex; justify-content: space-between; margin-top: 10px; font-size: 0.8rem; color: var(--text-secondary);">
                            <span>Best: ${Array(3).fill(0).map((_, i) => i < stars ? '⭐' : '☆').join('')}</span>
                            <span>High: ${Utils.formatNumber(progress?.highScore || 0)}</span>
                        </div>
                    ` : `
                        <div style="margin-top: 15px; color: var(--text-secondary);">
                            ${level.comingSoon ? '🔜 Coming Soon' : '🔒 Locked'}
                        </div>
                    `}
                </div>
            `;
        }).join('');
        
        this.overlay.innerHTML = `
            <div class="level-select">
                <h2>SELECT MISSION</h2>
                <div class="levels-grid">
                    ${levelsHtml}
                </div>
                <button class="cosmic-btn secondary back-btn" id="back-btn">
                    ← BACK
                </button>
            </div>
        `;
        
        // Add click handlers
        document.querySelectorAll('.level-card:not(.locked)').forEach(card => {
            card.addEventListener('click', () => {
                AudioManager.playClick();
                const levelId = card.dataset.level;
                this.game.startLevel(levelId);
            });
        });
        
        document.getElementById('back-btn').addEventListener('click', () => {
            AudioManager.playClick();
            this.showMainMenu();
        });
    }
    
    // Show settings screen
    showSettings() {
        this.clear();
        this.currentScreen = 'settings';
        
        const settings = this.game.player.data.settings;
        
        this.overlay.innerHTML = `
            <div class="settings-screen">
                <div class="settings-panel">
                    <h2>⚙️ SETTINGS</h2>
                    
                    <div class="setting-item">
                        <span class="setting-label">Sound Effects</span>
                        <div class="toggle-switch ${settings.soundEnabled ? 'active' : ''}" id="sound-toggle"></div>
                    </div>
                    
                    <div class="setting-item">
                        <span class="setting-label">Sound Volume</span>
                        <input type="range" class="setting-slider" id="sound-volume" 
                               min="0" max="100" value="${settings.soundVolume * 100}">
                    </div>
                    
                    <div class="setting-item">
                        <span class="setting-label">Show Keyboard Hints</span>
                        <div class="toggle-switch ${settings.showKeyboardHints ? 'active' : ''}" id="hints-toggle"></div>
                    </div>
                    
                    <div class="setting-item">
                        <span class="setting-label">Particle Effects</span>
                        <div class="toggle-switch ${settings.particleEffects ? 'active' : ''}" id="particles-toggle"></div>
                    </div>
                    
                    <div class="settings-buttons">
                        <button class="cosmic-btn secondary" id="back-btn">← BACK</button>
                        <button class="cosmic-btn danger small" id="reset-btn">Reset Progress</button>
                    </div>
                </div>
            </div>
        `;
        
        // Toggle handlers
        document.getElementById('sound-toggle').addEventListener('click', (e) => {
            e.target.classList.toggle('active');
            const enabled = e.target.classList.contains('active');
            this.game.player.setSetting('soundEnabled', enabled);
            AudioManager.toggle();
            if (enabled) AudioManager.playClick();
        });
        
        document.getElementById('hints-toggle').addEventListener('click', (e) => {
            e.target.classList.toggle('active');
            this.game.player.setSetting('showKeyboardHints', e.target.classList.contains('active'));
            AudioManager.playClick();
        });
        
        document.getElementById('particles-toggle').addEventListener('click', (e) => {
            e.target.classList.toggle('active');
            this.game.player.setSetting('particleEffects', e.target.classList.contains('active'));
            AudioManager.playClick();
        });
        
        // Volume slider
        document.getElementById('sound-volume').addEventListener('input', (e) => {
            const volume = e.target.value / 100;
            this.game.player.setSetting('soundVolume', volume);
            AudioManager.setSfxVolume(volume);
        });
        
        document.getElementById('back-btn').addEventListener('click', () => {
            AudioManager.playClick();
            this.showMainMenu();
        });
        
        document.getElementById('reset-btn').addEventListener('click', () => {
            if (confirm('Are you sure you want to reset all progress? This cannot be undone!')) {
                this.game.player.reset();
                this.showWelcomeScreen();
            }
        });
    }
    
    // Show achievements screen
    showAchievements() {
        this.clear();
        this.currentScreen = 'achievements';
        
        const unlocked = this.game.player.getUnlockedAchievements();
        const allAchievements = Object.entries(ACHIEVEMENTS);
        
        const achievementsHtml = allAchievements.map(([id, achievement]) => {
            const isUnlocked = unlocked.find(a => a.id === id);
            return `
                <div class="level-card ${isUnlocked ? '' : 'locked'}" style="padding: 15px;">
                    <span style="font-size: 2rem;">${isUnlocked ? achievement.icon : '🔒'}</span>
                    <h3 style="font-size: 1rem; margin: 10px 0 5px;">${achievement.name}</h3>
                    <p style="font-size: 0.8rem;">${achievement.description}</p>
                </div>
            `;
        }).join('');
        
        this.overlay.innerHTML = `
            <div class="level-select">
                <h2>🏆 ACHIEVEMENTS</h2>
                <p style="color: var(--text-secondary); margin-bottom: 20px;">
                    ${unlocked.length} / ${allAchievements.length} Unlocked
                </p>
                <div class="levels-grid" style="grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));">
                    ${achievementsHtml}
                </div>
                <button class="cosmic-btn secondary back-btn" id="back-btn">
                    ← BACK
                </button>
            </div>
        `;
        
        document.getElementById('back-btn').addEventListener('click', () => {
            AudioManager.playClick();
            this.showMainMenu();
        });
    }
    
    // Show level intro with extended instructions display
    showLevelIntro(levelName, levelIcon, missionText, callback) {
        this.clear();
        this.currentScreen = 'levelIntro';
        
        // Store for use in countdown
        this.currentLevelInfo = { levelName, levelIcon, missionText };
        
        // Get level-specific tips
        const tips = this.getLevelTips(levelName);
        const tipsHtml = tips.map(tip => `<li>${tip}</li>`).join('');
        
        this.overlay.innerHTML = `
            <div class="level-intro" id="level-intro">
                <div class="level-intro-header">
                    <h1>${levelIcon}</h1>
                    <h2>${levelName}</h2>
                </div>
                <p class="mission-text">${missionText}</p>
                <div class="level-tips" id="level-tips">
                    <h3>HOW TO PLAY:</h3>
                    <ul>${tipsHtml}</ul>
                </div>
                <div class="countdown-container" id="countdown-container">
                    <p class="ready-text">Get ready...</p>
                </div>
            </div>
        `;
        
        // Extended intro delay - show instructions for 3 seconds before countdown
        setTimeout(() => {
            this.showCountdown(callback);
        }, 3000);
    }
    
    // Get level-specific tips
    getLevelTips(levelName) {
        const tips = {
            'Asteroid Defense': [
                'Type the letter on each asteroid to destroy it!',
                'Complete waves to earn stars (3/6/10 waves)!',
                'Build combos for power-ups!',
                'Keep a combo to heal Earth!',
                'Press ESC to pause the game'
            ],
            'Rocket Launch': [
                'Type letters to add fuel to your rocket!',
                'Keep typing to maintain speed and altitude!',
                'If you run out of fuel, you\'ll start falling!',
                'Build combos to charge your BOOST meter!',
                'Press ESC to pause the game'
            ]
        };
        return tips[levelName] || ['Type the letters as fast as you can!', 'Press ESC to pause the game'];
    }
    
    // Show countdown - keeps instructions visible during countdown
    showCountdown(callback) {
        let count = 3;
        const countdownContainer = document.getElementById('countdown-container');
        const levelTips = document.getElementById('level-tips');
        
        const showCount = () => {
            if (!countdownContainer) return;
            
            if (count > 0) {
                // Show countdown number, keep tips visible
                countdownContainer.innerHTML = `<div class="countdown">${count}</div>`;
                AudioManager.playCountdown(false);
                count--;
                setTimeout(showCount, 1000);
            } else {
                // Hide tips on GO
                if (levelTips) {
                    levelTips.style.opacity = '0';
                }
                countdownContainer.innerHTML = `<div class="countdown countdown-go">GO!</div>`;
                AudioManager.playCountdown(true);
                setTimeout(() => {
                    this.clear();
                    callback();
                }, 500);
            }
        };
        
        showCount();
    }
    
    // Show game HUD
    showHUD(hudData) {
        // This is called every frame during gameplay
        // We'll render HUD directly to canvas instead for performance
    }
    
    // Show pause menu
    showPauseMenu() {
        this.currentScreen = 'paused';
        this.showingExitConfirm = false;
        
        this.overlay.innerHTML = `
            <div class="pause-overlay">
                <div class="pause-content">
                    <h2>⏸️ PAUSED</h2>
                    <p class="pause-hint">Press ESC to resume</p>
                    <div class="pause-menu">
                        <button class="cosmic-btn primary" id="resume-btn">▶️ RESUME</button>
                        <button class="cosmic-btn secondary" id="restart-btn">🔄 RESTART</button>
                        <button class="cosmic-btn danger" id="quit-btn">🚪 EXIT TO MENU</button>
                    </div>
                </div>
            </div>
        `;
        
        document.getElementById('resume-btn').addEventListener('click', () => {
            AudioManager.playClick();
            this.game.resumeGame();
        });
        
        document.getElementById('restart-btn').addEventListener('click', () => {
            AudioManager.playClick();
            this.showRestartConfirm();
        });
        
        document.getElementById('quit-btn').addEventListener('click', () => {
            AudioManager.playClick();
            this.showExitConfirm();
        });
    }
    
    // Show restart confirmation
    showRestartConfirm() {
        this.overlay.innerHTML = `
            <div class="pause-overlay">
                <div class="pause-content">
                    <h2>🔄 RESTART?</h2>
                    <p class="confirm-text">Your current progress will be lost.</p>
                    <div class="pause-menu">
                        <button class="cosmic-btn primary" id="confirm-restart-btn">YES, RESTART</button>
                        <button class="cosmic-btn secondary" id="cancel-restart-btn">NO, GO BACK</button>
                    </div>
                </div>
            </div>
        `;
        
        document.getElementById('confirm-restart-btn').addEventListener('click', () => {
            AudioManager.playClick();
            this.game.restartLevel();
        });
        
        document.getElementById('cancel-restart-btn').addEventListener('click', () => {
            AudioManager.playClick();
            this.showPauseMenu();
        });
    }
    
    // Show exit confirmation
    showExitConfirm() {
        this.showingExitConfirm = true;
        
        this.overlay.innerHTML = `
            <div class="pause-overlay">
                <div class="pause-content">
                    <h2>🚪 EXIT TO MENU?</h2>
                    <p class="confirm-text">Your current progress will be lost.</p>
                    <div class="pause-menu">
                        <button class="cosmic-btn danger" id="confirm-exit-btn">YES, EXIT</button>
                        <button class="cosmic-btn secondary" id="cancel-exit-btn">NO, GO BACK</button>
                    </div>
                </div>
            </div>
        `;
        
        document.getElementById('confirm-exit-btn').addEventListener('click', () => {
            AudioManager.playClick();
            this.showingExitConfirm = false;
            this.game.quitToMenu();
        });
        
        document.getElementById('cancel-exit-btn').addEventListener('click', () => {
            AudioManager.playClick();
            this.showingExitConfirm = false;
            this.showPauseMenu();
        });
    }
    
    hidePauseMenu() {
        if (this.currentScreen === 'paused') {
            this.clear();
        }
    }
    
    // Show result screen - ANGRY BIRDS STYLE with count-up animation
    showResultScreen(results) {
        this.currentScreen = 'result';
        
        // Stars start hidden
        const starsHtml = [1, 2, 3].map(i => 
            `<span class="star-large ${i <= results.stars ? 'earned pending' : 'empty'}" data-star="${i}">
                ${i <= results.stars ? '⭐' : '☆'}
            </span>`
        ).join('');
        
        // Encouraging message based on performance
        let subtitle = '';
        if (results.victory) {
            if (results.stars === 3) subtitle = '🏆 PERFECT! You\'re amazing!';
            else if (results.stars === 2) subtitle = '⭐ Great job! Can you get 3 stars?';
            else subtitle = '👍 Nice work! Keep practicing!';
        } else {
            subtitle = '💪 Don\'t give up! You can do it!';
        }
        
        // Show waves completed if available
        const waveInfo = results.wavesCompleted !== undefined ? 
            `<div class="result-stat" data-stat="wave">
                <div class="value" data-target="${results.wavesCompleted}" data-prefix="Wave ">Wave 0</div>
                <div class="label">Reached</div>
            </div>` : '';
        
        this.overlay.innerHTML = `
            <div class="result-screen">
                <h2 class="${results.victory ? 'victory' : 'defeat'}">
                    ${results.victory ? '🎉 MISSION COMPLETE!' : '💥 MISSION FAILED'}
                </h2>
                <p class="result-subtitle">${subtitle}</p>
                
                <div class="stars-earned" id="stars-container" style="opacity: 0;">
                    ${starsHtml}
                </div>
                
                <div class="result-stats">
                    <div class="result-stat" data-stat="score">
                        <div class="value" data-target="${results.score}" data-suffix="">0</div>
                        <div class="label">Score</div>
                    </div>
                    ${waveInfo}
                    <div class="result-stat" data-stat="accuracy">
                        <div class="value" data-target="${results.accuracy}" data-suffix="%">0%</div>
                        <div class="label">Accuracy</div>
                    </div>
                    <div class="result-stat" data-stat="combo">
                        <div class="value" data-target="${results.maxCombo}" data-suffix="x">0x</div>
                        <div class="label">Max Combo</div>
                    </div>
                </div>
                
                <div class="result-buttons" style="opacity: 0;">
                    <button class="cosmic-btn secondary" id="menu-btn">MENU</button>
                    <button class="cosmic-btn primary" id="retry-btn">
                        ${results.victory ? 'PLAY AGAIN' : 'TRY AGAIN'}
                    </button>
                </div>
            </div>
        `;
        
        // Angry Birds style count-up animation
        this.animateResultStats(results);
        
        document.getElementById('menu-btn').addEventListener('click', () => {
            AudioManager.playClick();
            this.game.quitToMenu();
        });
        
        document.getElementById('retry-btn').addEventListener('click', () => {
            AudioManager.playClick();
            this.game.restartLevel();
        });
    }
    
    // Animate stats counting up one by one (Angry Birds style)
    animateResultStats(results) {
        const stats = document.querySelectorAll('.result-stat');
        let delay = 300; // Initial delay
        
        stats.forEach((stat, index) => {
            setTimeout(() => {
                const valueEl = stat.querySelector('.value');
                const target = parseInt(valueEl.dataset.target) || 0;
                const suffix = valueEl.dataset.suffix || '';
                const prefix = valueEl.dataset.prefix || '';
                
                // Animate count-up
                this.animateCountUp(valueEl, target, prefix, suffix, 800);
                
                // Play tick sound during animation
                AudioManager.playClick();
            }, delay + index * 600); // 600ms between each stat
        });
        
        // Show stars after all stats
        const totalStatsTime = delay + stats.length * 600 + 800;
        setTimeout(() => {
            const starsContainer = document.getElementById('stars-container');
            if (starsContainer) {
                starsContainer.style.opacity = '1';
                starsContainer.style.transition = 'opacity 0.3s ease';
            }
            
            // Animate stars appearing ONE BY ONE
            const earnedStars = document.querySelectorAll('.star-large.earned');
            earnedStars.forEach((star, i) => {
                setTimeout(() => {
                    star.classList.remove('pending');
                    star.classList.add('revealed');
                    star.style.transform = 'scale(1.5)';
                    star.style.textShadow = '0 0 30px #ffd700, 0 0 60px #ffd700';
                    AudioManager.playStarCollect();
                    
                    setTimeout(() => {
                        star.style.transform = 'scale(1)';
                        star.style.textShadow = '0 0 10px #ffd700';
                    }, 200);
                }, i * 500);
            });
        }, totalStatsTime);
        
        // Show buttons after stars
        const buttonsDelay = totalStatsTime + results.stars * 500 + 500;
        setTimeout(() => {
            const buttons = document.querySelector('.result-buttons');
            if (buttons) {
                buttons.style.opacity = '1';
                buttons.style.transition = 'opacity 0.3s ease';
            }
        }, buttonsDelay);
    }
    
    // Animate a number counting up
    animateCountUp(element, target, prefix, suffix, duration) {
        const startTime = Date.now();
        const startValue = 0;
        
        const tick = () => {
            const elapsed = Date.now() - startTime;
            const progress = Math.min(elapsed / duration, 1);
            
            // Ease out curve for satisfying feel
            const easeOut = 1 - Math.pow(1 - progress, 3);
            const current = Math.round(startValue + (target - startValue) * easeOut);
            
            if (prefix) {
                element.textContent = `${prefix}${current}${suffix}`;
            } else {
                element.textContent = Utils.formatNumber(current) + suffix;
            }
            
            // Play tick sounds at intervals during count
            if (progress < 1 && Math.random() < 0.15) {
                // Subtle tick sound (using existing correct sound at lower volume conceptually)
            }
            
            if (progress < 1) {
                requestAnimationFrame(tick);
            } else {
                // Final value with emphasis
                element.style.transform = 'scale(1.1)';
                setTimeout(() => {
                    element.style.transform = 'scale(1)';
                }, 150);
            }
        };
        
        tick();
    }
    
    // Show achievement popup
    showAchievementPopup(achievement) {
        const popup = document.createElement('div');
        popup.className = 'achievement-popup';
        popup.innerHTML = `
            <span class="achievement-icon">${achievement.icon}</span>
            <div class="achievement-info">
                <h4>ACHIEVEMENT UNLOCKED!</h4>
                <h3>${achievement.name}</h3>
                <p>${achievement.description}</p>
            </div>
        `;
        
        document.body.appendChild(popup);
        
        // Show animation
        setTimeout(() => popup.classList.add('show'), 100);
        
        // Hide after delay
        setTimeout(() => {
            popup.classList.remove('show');
            setTimeout(() => popup.remove(), 500);
        }, 4000);
    }
    
    // Add score popup (floating score text)
    addScorePopup(x, y, score) {
        this.scorePopups.push({
            x,
            y,
            score,
            alpha: 1,
            vy: -100,
            life: 1
        });
    }
    
    // Flash screen effect
    flashScreen(color) {
        this.flashColor = color;
        this.flashAlpha = 0.3;
    }
    
    // Update popups
    updatePopups(dt) {
        // Update score popups
        for (let i = this.scorePopups.length - 1; i >= 0; i--) {
            const popup = this.scorePopups[i];
            popup.y += popup.vy * dt;
            popup.life -= dt;
            popup.alpha = popup.life;
            popup.vy *= 0.98;
            
            if (popup.life <= 0) {
                this.scorePopups.splice(i, 1);
            }
        }
        
        // Update flash
        if (this.flashAlpha > 0) {
            this.flashAlpha -= dt * 2;
        }
    }
    
    // Draw UI elements on canvas
    drawCanvasUI(ctx) {
        // Draw score popups
        this.scorePopups.forEach(popup => {
            ctx.save();
            ctx.globalAlpha = popup.alpha;
            ctx.fillStyle = '#ffd700';
            ctx.font = 'bold 24px "Orbitron", sans-serif';
            ctx.textAlign = 'center';
            ctx.shadowColor = '#ffd700';
            ctx.shadowBlur = 10;
            ctx.fillText(`+${popup.score}`, popup.x, popup.y);
            ctx.restore();
        });
        
        // Draw flash effect
        if (this.flashAlpha > 0) {
            ctx.save();
            ctx.globalAlpha = this.flashAlpha;
            ctx.fillStyle = this.flashColor;
            ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);
            ctx.restore();
        }
    }
    
    // Draw HUD during gameplay
    drawHUD(ctx, hudData) {
        const padding = 20;
        
        // Score (top left)
        ctx.save();
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 28px "Orbitron", sans-serif';
        ctx.textAlign = 'left';
        ctx.fillText(`${Utils.formatNumber(hudData.score)}`, padding, 45);
        ctx.font = '14px "Exo 2", sans-serif';
        ctx.fillStyle = '#88aaff';
        ctx.fillText('SCORE', padding, 25);
        ctx.restore();
        
        // Combo (top right)
        if (hudData.combo > 0) {
            ctx.save();
            ctx.textAlign = 'right';
            
            // Combo glow
            const comboScale = 1 + Math.min(hudData.combo / 50, 0.5);
            ctx.font = `bold ${32 * comboScale}px "Orbitron", sans-serif`;
            
            // Color based on combo
            if (hudData.combo >= 25) {
                ctx.fillStyle = '#ff00ff';
                ctx.shadowColor = '#ff00ff';
            } else if (hudData.combo >= 10) {
                ctx.fillStyle = '#00ffff';
                ctx.shadowColor = '#00ffff';
            } else {
                ctx.fillStyle = '#ffd700';
                ctx.shadowColor = '#ffd700';
            }
            ctx.shadowBlur = 15;
            
            ctx.fillText(`${hudData.combo}x`, ctx.canvas.width - padding, 45);
            ctx.shadowBlur = 0;
            ctx.font = '14px "Exo 2", sans-serif';
            ctx.fillStyle = '#88aaff';
            ctx.fillText('COMBO', ctx.canvas.width - padding, 25);
            ctx.restore();
        }
        
        // ESC hint (subtle, bottom right corner)
        ctx.save();
        ctx.globalAlpha = 0.4;
        ctx.fillStyle = '#ffffff';
        ctx.font = '12px "Exo 2", sans-serif';
        ctx.textAlign = 'right';
        ctx.fillText('ESC to pause', ctx.canvas.width - padding, ctx.canvas.height - 15);
        ctx.restore();
    }
}

// Export
window.GameUI = GameUI;
