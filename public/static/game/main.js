// ============================================
// COSMIC TYPER - Main Game Controller
// Space Typing Adventure for Kids
// ============================================

class CosmicTyper {
    constructor() {
        // Canvas setup
        this.bgCanvas = document.getElementById('background-canvas');
        this.gameCanvas = document.getElementById('game-canvas');
        this.bgCtx = this.bgCanvas.getContext('2d');
        this.gameCtx = this.gameCanvas.getContext('2d');
        
        // Systems
        this.player = new PlayerProfile();
        this.particles = new ParticleEmitter();
        this.starfield = null;
        this.ui = new GameUI(this);
        this.screenShake = new ScreenShake();
        this.animations = new AnimationManager();
        
        // Game state
        this.state = 'init'; // init, menu, playing, paused
        this.currentLevel = null;
        this.currentLevelId = null;
        
        // Timing
        this.lastTime = 0;
        this.deltaTime = 0;
        
        // Keyboard
        this.keysPressed = new Set();
        
        // Initialize
        this.init();
    }
    
    init() {
        // Setup canvas sizes
        this.resize();
        window.addEventListener('resize', () => this.resize());
        
        // Initialize starfield
        this.starfield = new Starfield(this.bgCanvas);
        
        // Initialize audio (must be triggered by user interaction)
        document.addEventListener('click', () => AudioManager.init(), { once: true });
        document.addEventListener('keydown', () => AudioManager.init(), { once: true });
        
        // Keyboard events
        document.addEventListener('keydown', (e) => this.handleKeyDown(e));
        document.addEventListener('keyup', (e) => this.handleKeyUp(e));
        
        // Prevent default for game keys
        document.addEventListener('keydown', (e) => {
            if (e.key === ' ' || e.key === 'Escape') {
                e.preventDefault();
            }
        });
        
        // Start game loop
        requestAnimationFrame((time) => this.gameLoop(time));
        
        // Show appropriate screen
        this.start();
    }
    
    resize() {
        const container = document.getElementById('game-container');
        const width = container.clientWidth;
        const height = container.clientHeight;
        
        // Set canvas sizes
        this.bgCanvas.width = width;
        this.bgCanvas.height = height;
        this.gameCanvas.width = width;
        this.gameCanvas.height = height;
        
        // Update starfield if exists
        if (this.starfield) {
            this.starfield.resize(width, height);
        }
    }
    
    start() {
        // Check if player has a profile
        if (!this.player.hasProfile()) {
            this.ui.showWelcomeScreen();
        } else if (!this.player.data.skill.assessmentComplete) {
            this.ui.showSkillAssessment();
        } else {
            this.ui.showMainMenu();
        }
        
        this.state = 'menu';
    }
    
    handleKeyDown(e) {
        const key = e.key;
        
        // Prevent repeated keydown events
        if (this.keysPressed.has(key)) return;
        this.keysPressed.add(key);
        
        // Resume audio context if suspended
        AudioManager.resume();
        
        // Handle escape key
        if (key === 'Escape') {
            if (this.state === 'playing') {
                this.pauseGame();
            } else if (this.state === 'paused') {
                this.resumeGame();
            }
            return;
        }
        
        // Handle game input
        if (this.state === 'playing' && this.currentLevel) {
            // Only handle letter keys
            if (key.length === 1 && key.match(/[a-zA-Z]/)) {
                this.currentLevel.handleKeyPress(key);
            }
        }
    }
    
    handleKeyUp(e) {
        this.keysPressed.delete(e.key);
    }
    
    // Start a level
    startLevel(levelId) {
        this.currentLevelId = levelId;
        
        // Create level instance
        switch (levelId) {
            case 'asteroid-defense':
                this.currentLevel = new AsteroidDefenseLevel(this);
                break;
            case 'rocket-launch':
                this.currentLevel = new RocketLaunchLevel(this);
                break;
            default:
                console.error('Unknown level:', levelId);
                return;
        }
        
        // Record that player is playing this level
        const levelProgress = this.player.getLevelProgress(levelId);
        if (levelProgress) {
            levelProgress.timesPlayed++;
        }
        
        // Show level intro
        this.ui.showLevelIntro(
            this.currentLevel.name,
            this.currentLevel.icon,
            this.currentLevel.description,
            () => {
                this.state = 'playing';
                this.currentLevel.start();
            }
        );
    }
    
    pauseGame() {
        if (this.state !== 'playing') return;
        
        this.state = 'paused';
        if (this.currentLevel) {
            this.currentLevel.pause();
        }
        this.ui.showPauseMenu();
    }
    
    resumeGame() {
        if (this.state !== 'paused') return;
        
        this.state = 'playing';
        if (this.currentLevel) {
            this.currentLevel.resume();
        }
        this.ui.hidePauseMenu();
    }
    
    restartLevel() {
        if (this.currentLevelId) {
            this.ui.clear();
            this.particles.clear();
            this.startLevel(this.currentLevelId);
        }
    }
    
    quitToMenu() {
        this.state = 'menu';
        this.currentLevel = null;
        this.currentLevelId = null;
        this.particles.clear();
        this.ui.showMainMenu();
    }
    
    // Show result screen (called by levels)
    showResultScreen(results) {
        this.state = 'menu';
        this.ui.showResultScreen(results);
    }
    
    // Show score popup (called by levels)
    showScorePopup(x, y, score) {
        this.ui.addScorePopup(x, y, score);
    }
    
    // Flash screen effect (called by levels)
    flashScreen(color) {
        this.ui.flashScreen(color);
    }
    
    // Check achievement (called by levels)
    checkAchievement(achievementId) {
        const achievement = this.player.checkAchievement(achievementId);
        if (achievement) {
            this.ui.showAchievementPopup(achievement);
            AudioManager.playAchievement();
        }
    }
    
    // Main game loop
    gameLoop(currentTime) {
        // Calculate delta time
        this.deltaTime = Math.min((currentTime - this.lastTime) / 1000, 0.1); // Cap at 100ms
        this.lastTime = currentTime;
        
        // Update
        this.update(this.deltaTime, currentTime);
        
        // Render
        this.render(currentTime);
        
        // Continue loop
        requestAnimationFrame((time) => this.gameLoop(time));
    }
    
    update(dt, currentTime) {
        // Update starfield (always)
        this.starfield.update(dt, currentTime);
        
        // Update screen shake
        this.screenShake.update(currentTime);
        
        // Update animations
        this.animations.update(currentTime);
        
        // Update particles
        if (this.player.getSetting('particleEffects') !== false) {
            this.particles.update(dt);
        }
        
        // Update UI popups
        this.ui.updatePopups(dt);
        
        // Update current level
        if (this.state === 'playing' && this.currentLevel) {
            this.currentLevel.update(dt, currentTime);
        }
        
        // Ambient particles
        if (Math.random() < 0.02) {
            this.particles.floatingParticle(
                Math.random() * this.gameCanvas.width,
                this.gameCanvas.height
            );
        }
    }
    
    render(currentTime) {
        // Clear canvases
        this.bgCtx.fillStyle = '#0a0a1a';
        this.bgCtx.fillRect(0, 0, this.bgCanvas.width, this.bgCanvas.height);
        
        this.gameCtx.clearRect(0, 0, this.gameCanvas.width, this.gameCanvas.height);
        
        // Draw starfield on background canvas
        this.starfield.draw(this.bgCtx);
        
        // Apply screen shake to game canvas
        this.gameCtx.save();
        this.screenShake.apply(this.gameCtx);
        
        // Draw current level
        if (this.currentLevel && (this.state === 'playing' || this.state === 'paused')) {
            this.currentLevel.draw(this.gameCtx);
        }
        
        // Draw particles
        if (this.player.getSetting('particleEffects') !== false) {
            this.particles.draw(this.gameCtx);
        }
        
        // Draw HUD
        if (this.state === 'playing' && this.currentLevel) {
            const hudData = this.currentLevel.getHUD();
            this.ui.drawHUD(this.gameCtx, hudData);
        }
        
        // Draw UI effects (score popups, flashes)
        this.ui.drawCanvasUI(this.gameCtx);
        
        this.gameCtx.restore();
    }
}

// Initialize game when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    try {
        console.log('Initializing Cosmic Typer...');
        window.game = new CosmicTyper();
        console.log('Cosmic Typer initialized successfully!');
    } catch (error) {
        console.error('Failed to initialize game:', error);
        document.body.innerHTML = '<div style="color: white; padding: 20px;"><h1>Error Loading Game</h1><pre>' + error.stack + '</pre></div>';
    }
});
