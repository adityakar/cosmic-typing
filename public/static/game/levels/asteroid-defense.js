// ============================================
// COSMIC TYPER - Level 1: Asteroid Defense
// Protect Earth from falling letter asteroids!
// ============================================

class AsteroidDefenseLevel {
    constructor(game) {
        this.game = game;
        this.canvas = game.gameCanvas;
        this.ctx = game.gameCtx;
        this.particles = game.particles;
        
        // Level info
        this.id = 'asteroid-defense';
        this.name = 'Asteroid Defense';
        this.description = 'Protect Earth from falling asteroids! Type the letters to destroy them!';
        this.icon = '🌍';
        
        // Game state
        this.state = 'ready'; // ready, playing, paused, gameover, victory
        this.score = 0;
        this.combo = 0;
        this.maxCombo = 0;
        this.correctCount = 0;
        this.wrongCount = 0;
        this.earthHealth = 100;
        this.maxEarthHealth = 100;
        this.timeElapsed = 0;
        this.levelDuration = 90; // 90 seconds
        
        // Asteroids
        this.asteroids = [];
        this.asteroidsDestroyed = 0;
        this.targetAsteroid = null;
        
        // Cannon
        this.cannon = {
            x: 0,
            y: 0,
            angle: -Math.PI / 2, // Pointing up
            targetAngle: -Math.PI / 2,
            length: 60,
            width: 20,
            color: '#4488ff',
            glowColor: '#00ffff'
        };
        
        // Projectiles
        this.projectiles = [];
        
        // === HYPER LASER BEAMS (visual effect storage) ===
        this.hyperLaserBeams = [];
        
        // Difficulty settings based on player
        this.difficulty = game.player.getDifficulty();
        this.letters = Utils.getLettersByDifficulty(this.difficulty);
        this.spawnRate = this.getSpawnRate();
        this.fallSpeed = this.getFallSpeed();
        
        // Word mode - use dictionary words
        this.useWordMode = true; // Use word-based sequences
        this.currentWord = null;
        this.currentWordIndex = 0;
        this.wordQueue = [];
        
        // Timers
        this.lastSpawn = 0;
        this.spawnInterval = 2000; // ms between spawns
        
        // Visual elements
        this.earth = null;
        this.shield = null;
        
        // Adaptive difficulty
        this.recentAccuracy = [];
        this.adaptiveMultiplier = 1;
        
        // === POWER-UP SYSTEM ===
        this.powerUps = {
            // Missile: AoE blast that destroys multiple asteroids
            missile: {
                name: 'Mega Missile',
                icon: '🚀',
                active: false,
                ready: false,
                comboRequired: 10,
                blastRadius: 150,
                damage: 100,
                duration: 0,
                color: '#ff6600'
            },
            // Instant Laser: Near-instant beam (no travel time)
            laser: {
                name: 'Hyper Laser',
                icon: '⚡',
                active: false,
                ready: false,
                comboRequired: 15,
                shotsRemaining: 0,
                maxShots: 3,
                duration: 5000,
                activatedAt: 0,
                color: '#00ffff'
            },
            // Shield Boost: Activated by SPACEBAR, one-time use per game
            shield: {
                name: 'Force Shield',
                icon: '🛡️',
                available: false, // Earned but not yet activated
                active: false,    // Currently providing protection
                used: false,      // Already used this game (one-time only)
                comboRequired: 20,
                duration: 5000,
                activatedAt: 0,
                color: '#44ff88',
                pulsePhase: 0     // For pulsing animation when available
            }
        };
        this.activePowerUp = null;
        this.powerUpIndicators = [];
    }
    
    getSpawnRate() {
        const rates = {
            'beginner': 2500,
            'easy': 2000,
            'medium': 1500,
            'hard': 1000
        };
        return rates[this.difficulty] || 2000;
    }
    
    getFallSpeed() {
        const speeds = {
            'beginner': 40,
            'easy': 60,
            'medium': 80,
            'hard': 100
        };
        return speeds[this.difficulty] || 60;
    }
    
    init() {
        // Position cannon at bottom center
        this.cannon.x = this.canvas.width / 2;
        this.cannon.y = this.canvas.height - 80;
        
        // Create Earth visual
        this.earth = {
            x: this.canvas.width / 2,
            y: this.canvas.height - 30,
            radius: 200,
            glowRadius: 250
        };
        
        // Reset state
        this.asteroids = [];
        this.projectiles = [];
        this.hyperLaserBeams = [];
        this.score = 0;
        this.combo = 0;
        this.maxCombo = 0;
        this.correctCount = 0;
        this.wrongCount = 0;
        this.earthHealth = this.maxEarthHealth;
        this.timeElapsed = 0;
        this.asteroidsDestroyed = 0;
        this.targetAsteroid = null;
        this.recentAccuracy = [];
        this.adaptiveMultiplier = 1;
        this.spawnInterval = this.spawnRate;
        
        // Initialize word queue if using word mode
        if (this.useWordMode && window.WordDictionary) {
            this.wordQueue = WordDictionary.getRandomWords(20, this.difficulty);
            this.currentWord = this.wordQueue.shift();
            this.currentWordIndex = 0;
        }
        
        // Reset power-ups
        this.powerUps.missile.active = false;
        this.powerUps.missile.ready = false;
        this.powerUps.laser.active = false;
        this.powerUps.laser.ready = false;
        this.powerUps.laser.shotsRemaining = 0;
        // Shield: reset for new game
        this.powerUps.shield.available = false;
        this.powerUps.shield.active = false;
        this.powerUps.shield.used = false;
        this.powerUps.shield.pulsePhase = 0;
        
        this.activePowerUp = null;
        this.powerUpIndicators = [];
    }
    
    start() {
        this.state = 'playing';
        this.init();
        this.spawnAsteroid(); // Spawn first asteroid immediately
    }
    
    pause() {
        this.state = 'paused';
    }
    
    resume() {
        this.state = 'playing';
    }
    
    getNextLetter() {
        // Word mode: get next letter from current word
        if (this.useWordMode && this.currentWord && window.WordDictionary) {
            if (this.currentWordIndex < this.currentWord.length) {
                return this.currentWord[this.currentWordIndex];
            } else {
                // Move to next word
                this.currentWord = this.wordQueue.shift();
                if (!this.currentWord) {
                    // Refill word queue
                    this.wordQueue = WordDictionary.getRandomWords(20, this.difficulty);
                    this.currentWord = this.wordQueue.shift();
                }
                this.currentWordIndex = 0;
                return this.currentWord ? this.currentWord[0] : Utils.randomChoice(this.letters);
            }
        }
        
        // Fallback to random letters with weak letter bias
        const weakLetters = this.game.player.getWeakestLetters(3);
        if (weakLetters.length > 0 && Math.random() < 0.3) {
            return Utils.randomChoice(weakLetters);
        }
        return Utils.randomChoice(this.letters);
    }
    
    spawnAsteroid() {
        // Get next letter (word mode or random)
        const letter = this.getNextLetter();
        
        // Random position at top
        const x = Utils.random(100, this.canvas.width - 100);
        const y = -50;
        
        // Size based on difficulty (larger = easier to see)
        const size = this.difficulty === 'beginner' ? 55 : 
                     this.difficulty === 'easy' ? 50 : 
                     this.difficulty === 'medium' ? 45 : 40;
        
        // Speed with adaptive multiplier
        const speed = (this.fallSpeed + Utils.random(-10, 10)) * this.adaptiveMultiplier;
        
        // Color based on letter difficulty
        const colors = ['#ff6b6b', '#ffd93d', '#4ecdc4', '#a06cd5', '#ff8c42'];
        
        this.asteroids.push({
            id: Date.now() + Math.random(),
            letter: letter,
            x: x,
            y: y,
            size: size,
            speed: speed,
            rotation: 0,
            rotationSpeed: Utils.random(-2, 2),
            color: Utils.randomChoice(colors),
            glowIntensity: 1,
            trail: [],
            spawnTime: Date.now()
        });
    }
    
    handleKeyPress(key) {
        if (this.state !== 'playing') return;
        
        const pressedKey = key.toUpperCase();
        
        // === SPACEBAR: Activate Force Shield ===
        if (key === ' ' || key === 'Space') {
            this.tryActivateShield();
            return;
        }
        
        const pressedLetter = pressedKey;
        
        // Find asteroid with matching letter (closest to bottom)
        let matchingAsteroid = null;
        let closestY = -Infinity;
        
        for (const asteroid of this.asteroids) {
            if (asteroid.letter === pressedLetter && asteroid.y > closestY) {
                matchingAsteroid = asteroid;
                closestY = asteroid.y;
            }
        }
        
        if (matchingAsteroid) {
            this.destroyAsteroid(matchingAsteroid);
            this.recordHit(true, pressedLetter);
            
            // Advance word index if using word mode
            if (this.useWordMode && this.currentWord) {
                this.currentWordIndex++;
            }
        } else {
            this.recordMiss(pressedLetter);
        }
    }
    
    // === SHIELD ACTIVATION (SPACEBAR) ===
    tryActivateShield() {
        const shield = this.powerUps.shield;
        
        // Check if shield is available and not used
        if (shield.available && !shield.active && !shield.used) {
            // Activate the shield!
            shield.active = true;
            shield.used = true;
            shield.available = false;
            shield.activatedAt = Date.now();
            
            // Play shield activation sound
            AudioManager.playShieldActivate();
            
            // Big visual effect - multiple rings expanding outward
            for (let i = 0; i < 3; i++) {
                setTimeout(() => {
                    this.particles.ring(this.earth.x, this.cannon.y - 50, {
                        count: 40 - i * 10,
                        color: '#44ff88',
                        speed: 350 - i * 50
                    });
                }, i * 100);
            }
            
            // Shield formation particles rising from ground
            for (let i = 0; i < 30; i++) {
                const angle = (Math.PI / 12) * i - Math.PI;
                const radius = this.earth.radius + 50;
                const x = this.earth.x + Math.cos(angle) * radius;
                const y = this.earth.y + 170 + Math.sin(angle) * radius;
                
                this.particles.addParticle(new Particle(x, y, {
                    vx: Math.cos(angle) * 50,
                    vy: Math.sin(angle) * 50 - 100,
                    life: 0.8,
                    size: Utils.random(5, 10),
                    endSize: 0,
                    color: Utils.randomChoice(['#44ff88', '#88ffaa', '#ffffff']),
                    glow: true,
                    glowSize: 15
                }));
            }
            
            // Screen effect - green tint
            this.game.flashScreen('#44ff88');
            
            // Screen shake for impact
            this.game.screenShake.start(8, 300);
            
            // Notification
            this.powerUpIndicators.push({
                text: '🛡️ FORCE SHIELD ACTIVATED!',
                x: this.canvas.width / 2,
                y: this.canvas.height / 2 - 50,
                alpha: 1,
                scale: 2,
                life: 2.5
            });
        }
    }
    
    destroyAsteroid(asteroid) {
        // Aim cannon at asteroid
        this.aimCannon(asteroid);
        
        // Check for active power-ups
        if (this.powerUps.laser.active && this.powerUps.laser.shotsRemaining > 0) {
            // Instant laser - immediate destruction with visual beam
            this.fireHyperLaser(asteroid);
        } else if (this.powerUps.missile.ready && this.combo >= this.powerUps.missile.comboRequired) {
            // Missile ready - AoE blast
            this.fireMissile(asteroid);
        } else {
            // Normal projectile
            this.fireProjectile(asteroid);
            // Play laser sound
            AudioManager.playLaser();
        }
    }
    
    // === HYPER LASER with enhanced visual beam effect ===
    fireHyperLaser(asteroid) {
        this.powerUps.laser.shotsRemaining--;
        
        // Calculate beam path from cannon tip to asteroid
        const startX = this.cannon.x + Math.cos(this.cannon.targetAngle) * this.cannon.length;
        const startY = this.cannon.y + Math.sin(this.cannon.targetAngle) * this.cannon.length;
        const endX = asteroid.x;
        const endY = asteroid.y;
        
        // Create main visual beam with multiple layers for depth
        this.hyperLaserBeams.push({
            startX: startX,
            startY: startY,
            endX: endX,
            endY: endY,
            width: 25,           // Thick main beam
            alpha: 1.0,
            life: 0.5,           // Lasts 500ms for more visibility
            maxLife: 0.5,
            color: '#00ffff',
            coreColor: '#ffffff',
            outerColor: '#0088ff',
            pulsePhase: 0,       // For animated pulsing
            type: 'main'
        });
        
        // Create secondary beam trails for extra visual punch
        for (let i = 0; i < 2; i++) {
            const offset = (i - 0.5) * 8;
            const perpAngle = Math.atan2(endY - startY, endX - startX) + Math.PI / 2;
            this.hyperLaserBeams.push({
                startX: startX + Math.cos(perpAngle) * offset,
                startY: startY + Math.sin(perpAngle) * offset,
                endX: endX + Math.cos(perpAngle) * offset * 0.5,
                endY: endY + Math.sin(perpAngle) * offset * 0.5,
                width: 8,
                alpha: 0.7,
                life: 0.4,
                maxLife: 0.4,
                color: '#00ff88',
                coreColor: '#ffffff',
                type: 'trail'
            });
        }
        
        // Dense particles along the beam path for energy effect
        const distance = Utils.distance(startX, startY, endX, endY);
        const beamAngle = Math.atan2(endY - startY, endX - startX);
        const particleCount = Math.floor(distance / 12);
        
        for (let i = 0; i < particleCount; i++) {
            const t = i / particleCount;
            const px = startX + (endX - startX) * t;
            const py = startY + (endY - startY) * t;
            
            // Particles perpendicular to beam
            const perpOffset = Utils.random(-15, 15);
            const perpAngle = beamAngle + Math.PI / 2;
            
            this.particles.addParticle(new Particle(
                px + Math.cos(perpAngle) * perpOffset,
                py + Math.sin(perpAngle) * perpOffset,
                {
                    vx: Utils.random(-80, 80),
                    vy: Utils.random(-80, 80),
                    life: Utils.random(0.2, 0.5),
                    size: Utils.random(4, 10),
                    endSize: 0,
                    color: Utils.randomChoice(['#00ffff', '#ffffff', '#00ff88', '#88ffff']),
                    glow: true,
                    glowSize: 15
                }
            ));
        }
        
        // Large cannon muzzle flash
        this.particles.explosion(startX, startY, {
            count: 25,
            colors: ['#00ffff', '#ffffff', '#00ff88', '#0088ff'],
            speed: 400,
            size: 15,
            life: 0.4
        });
        
        // Impact flash at asteroid location
        this.particles.explosion(endX, endY, {
            count: 30,
            colors: ['#00ffff', '#ffffff', '#ffff00'],
            speed: 350,
            size: 12,
            life: 0.5
        });
        
        // Electric arc effect at impact
        this.particles.ring(endX, endY, {
            count: 20,
            color: '#00ffff',
            speed: 250
        });
        
        // Play hyper laser sound (distinct high-energy beam)
        AudioManager.playHyperLaser();
        
        // Immediate explosion at asteroid with extra flair
        this.explodeAsteroid(asteroid);
        
        // Strong screen shake for impact
        this.game.screenShake.start(10, 250);
        
        // Flash screen with cyan tint
        this.game.flashScreen('#00ffff');
        
        // Check if laser shots depleted
        if (this.powerUps.laser.shotsRemaining <= 0) {
            this.powerUps.laser.active = false;
            this.powerUps.laser.ready = false;
        }
    }
    
    fireMissile(asteroid) {
        // Reset missile availability
        this.powerUps.missile.ready = false;
        
        // Create missile projectile (slower but bigger)
        const speed = 500;
        const dx = asteroid.x - this.cannon.x;
        const dy = asteroid.y - this.cannon.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        const travelTime = distance / speed;
        const predictedY = asteroid.y + (asteroid.speed * travelTime);
        const leadAngle = Math.atan2(predictedY - this.cannon.y, asteroid.x - this.cannon.x);
        
        this.projectiles.push({
            x: this.cannon.x + Math.cos(this.cannon.targetAngle) * this.cannon.length,
            y: this.cannon.y + Math.sin(this.cannon.targetAngle) * this.cannon.length,
            vx: Math.cos(leadAngle) * speed,
            vy: Math.sin(leadAngle) * speed,
            targetId: asteroid.id,
            target: asteroid,
            color: '#ff6600',
            size: 15,
            trail: [],
            isMissile: true,
            blastRadius: this.powerUps.missile.blastRadius
        });
        
        // Big launch effect
        this.particles.explosion(
            this.cannon.x,
            this.cannon.y,
            { count: 15, colors: ['#ff6600', '#ffcc00', '#ffffff'], speed: 150, size: 8 }
        );
        
        AudioManager.playPowerUp();
    }
    
    aimCannon(target) {
        // Calculate lead time for aiming
        const speed = 800;
        const dx = target.x - this.cannon.x;
        const dy = target.y - this.cannon.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        const travelTime = distance / speed;
        
        // Aim where asteroid WILL be
        const predictedY = target.y + (target.speed * travelTime);
        const predictedX = target.x;
        
        this.cannon.targetAngle = Math.atan2(predictedY - this.cannon.y, predictedX - this.cannon.x);
    }
    
    fireProjectile(target) {
        const speed = 800;
        
        // Calculate lead time - aim where the asteroid WILL be
        const dx = target.x - this.cannon.x;
        const dy = target.y - this.cannon.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        const travelTime = distance / speed;
        
        // Predict asteroid position when projectile arrives
        const predictedY = target.y + (target.speed * travelTime);
        const predictedX = target.x; // Asteroids only fall vertically
        
        // Aim at predicted position
        const leadAngle = Math.atan2(predictedY - this.cannon.y, predictedX - this.cannon.x);
        
        this.projectiles.push({
            x: this.cannon.x + Math.cos(this.cannon.targetAngle) * this.cannon.length,
            y: this.cannon.y + Math.sin(this.cannon.targetAngle) * this.cannon.length,
            vx: Math.cos(leadAngle) * speed,
            vy: Math.sin(leadAngle) * speed,
            targetId: target.id,
            target: target, // Store reference to actual asteroid for tracking
            color: '#00ffff',
            size: 8,
            trail: [],
            isMissile: false
        });
        
        // Cannon recoil effect
        this.particles.fire(
            this.cannon.x + Math.cos(this.cannon.targetAngle) * this.cannon.length,
            this.cannon.y + Math.sin(this.cannon.targetAngle) * this.cannon.length,
            this.cannon.targetAngle,
            { count: 8, speed: 200, colors: ['#00ffff', '#4488ff', '#ffffff'] }
        );
    }
    
    calculateTravelTime(asteroid) {
        const dx = asteroid.x - this.cannon.x;
        const dy = asteroid.y - this.cannon.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        return (distance / 800) * 1000; // 800 is projectile speed
    }
    
    explodeAsteroid(asteroid) {
        // Remove asteroid from array
        const index = this.asteroids.findIndex(a => a.id === asteroid.id);
        if (index === -1) return; // Already removed
        
        this.asteroids.splice(index, 1);
        this.asteroidsDestroyed++;
        
        // Explosion effects
        AudioManager.playExplosion('medium');
        
        // Big explosion particles
        this.particles.explosion(asteroid.x, asteroid.y, {
            count: 40,
            colors: [asteroid.color, '#ffffff', '#ffd700', '#ff8c42'],
            speed: 350,
            size: 12,
            life: 1.2
        });
        
        // Ring effect
        this.particles.ring(asteroid.x, asteroid.y, {
            count: 20,
            color: asteroid.color,
            speed: 250
        });
        
        // Letter pop effect
        this.particles.starBurst(asteroid.x, asteroid.y, '#ffd700');
        
        // Score popup effect
        this.game.showScorePopup(asteroid.x, asteroid.y, this.getScoreForCombo());
        
        // Screen shake for impact
        this.game.screenShake.start(5, 150);
    }
    
    // Missile AoE explosion
    explodeMissile(missile, targetAsteroid) {
        // Remove target asteroid
        this.explodeAsteroid(targetAsteroid);
        
        // Find all asteroids in blast radius
        const nearbyAsteroids = this.asteroids.filter(a => {
            const dist = Utils.distance(missile.x, missile.y, a.x, a.y);
            return dist <= missile.blastRadius && a.id !== targetAsteroid.id;
        });
        
        // Destroy nearby asteroids
        nearbyAsteroids.forEach(a => {
            this.explodeAsteroid(a);
            this.score += 50; // Bonus for AoE kills
        });
        
        // Massive explosion effect
        AudioManager.playExplosion('large');
        this.game.screenShake.start(15, 300);
        
        // Big ring explosion
        this.particles.ring(missile.x, missile.y, {
            count: 40,
            color: '#ff6600',
            speed: 400
        });
        
        // Multiple particle bursts
        for (let i = 0; i < 3; i++) {
            setTimeout(() => {
                this.particles.explosion(
                    missile.x + Utils.random(-50, 50),
                    missile.y + Utils.random(-50, 50),
                    { count: 30, colors: ['#ff6600', '#ffcc00', '#ffffff'], speed: 300, size: 10 }
                );
            }, i * 100);
        }
    }
    
    recordHit(correct, letter) {
        if (correct) {
            this.combo++;
            this.maxCombo = Math.max(this.maxCombo, this.combo);
            this.correctCount++;
            
            // Calculate score with combo multiplier
            const baseScore = 100;
            const comboMultiplier = 1 + Math.floor(this.combo / 5) * 0.5;
            const scoreGained = Math.round(baseScore * comboMultiplier);
            this.score += scoreGained;
            
            // Play combo sound
            if (this.combo > 1) {
                AudioManager.playCombo(this.combo);
            } else {
                AudioManager.playCorrect();
            }
            
            // Check combo achievements
            if (this.combo === 10) this.game.checkAchievement('combo_10');
            if (this.combo === 25) this.game.checkAchievement('combo_25');
            if (this.combo === 50) this.game.checkAchievement('combo_50');
            
            // === CHECK POWER-UP UNLOCKS ===
            this.checkPowerUps();
            
            // Record accuracy
            this.recentAccuracy.push(1);
            if (this.recentAccuracy.length > 20) this.recentAccuracy.shift();
            
            // Record letter performance
            this.game.player.recordLetterPerformance(letter, true);
        }
        
        this.adaptDifficulty();
    }
    
    checkPowerUps() {
        // Missile unlocks at 10 combo
        if (this.combo >= this.powerUps.missile.comboRequired && !this.powerUps.missile.ready) {
            this.powerUps.missile.ready = true;
            this.showPowerUpNotification(this.powerUps.missile);
        }
        
        // Laser unlocks at 15 combo
        if (this.combo >= this.powerUps.laser.comboRequired && !this.powerUps.laser.active && !this.powerUps.laser.ready) {
            this.powerUps.laser.ready = true;
            this.powerUps.laser.active = true;
            this.powerUps.laser.shotsRemaining = this.powerUps.laser.maxShots;
            this.powerUps.laser.activatedAt = Date.now();
            this.showPowerUpNotification(this.powerUps.laser);
        }
        
        // Shield becomes AVAILABLE at 20 combo (player must press SPACE to activate)
        // Only if not already used this game
        if (this.combo >= this.powerUps.shield.comboRequired && 
            !this.powerUps.shield.available && 
            !this.powerUps.shield.active && 
            !this.powerUps.shield.used) {
            this.powerUps.shield.available = true;
            this.showShieldAvailableNotification();
        }
    }
    
    showPowerUpNotification(powerUp) {
        // Add floating indicator
        this.powerUpIndicators.push({
            text: `${powerUp.icon} ${powerUp.name} READY!`,
            x: this.canvas.width / 2,
            y: this.canvas.height / 2 - 50,
            alpha: 1,
            scale: 1.5,
            life: 2
        });
        
        // Play power-up sound
        AudioManager.playPowerUp();
        
        // Visual effect
        this.particles.ring(this.cannon.x, this.cannon.y, {
            count: 30,
            color: powerUp.color,
            speed: 300
        });
    }
    
    showShieldAvailableNotification() {
        // Special notification for shield
        this.powerUpIndicators.push({
            text: '🛡️ SHIELD EARNED! Press SPACE to activate!',
            x: this.canvas.width / 2,
            y: this.canvas.height / 2 - 50,
            alpha: 1,
            scale: 1.5,
            life: 3
        });
        
        // Play power-up sound
        AudioManager.playPowerUp();
        
        // Visual effect
        this.particles.ring(this.earth.x, this.cannon.y, {
            count: 40,
            color: '#44ff88',
            speed: 350
        });
    }
    
    recordMiss(letter) {
        this.combo = 0;
        this.wrongCount++;
        
        // Reset power-up readiness (lose power-ups on miss)
        this.powerUps.missile.ready = false;
        // Laser stays active if already activated
        // Shield availability is NOT lost on miss (it's a strategic save)
        
        AudioManager.playWrong();
        
        // Flash screen red briefly
        this.game.flashScreen('#ff4444');
        
        // Record accuracy
        this.recentAccuracy.push(0);
        if (this.recentAccuracy.length > 20) this.recentAccuracy.shift();
        
        // Record letter performance
        this.game.player.recordLetterPerformance(letter, false);
        
        this.adaptDifficulty();
    }
    
    adaptDifficulty() {
        if (this.recentAccuracy.length < 10) return;
        
        const recentAcc = this.recentAccuracy.reduce((a, b) => a + b, 0) / this.recentAccuracy.length;
        
        // If doing well, speed up slightly
        if (recentAcc > 0.9) {
            this.adaptiveMultiplier = Math.min(1.5, this.adaptiveMultiplier + 0.05);
            this.spawnInterval = Math.max(800, this.spawnInterval - 50);
        }
        // If struggling, slow down
        else if (recentAcc < 0.6) {
            this.adaptiveMultiplier = Math.max(0.6, this.adaptiveMultiplier - 0.05);
            this.spawnInterval = Math.min(3000, this.spawnInterval + 100);
        }
    }
    
    getScoreForCombo() {
        const baseScore = 100;
        const comboMultiplier = 1 + Math.floor(this.combo / 5) * 0.5;
        return Math.round(baseScore * comboMultiplier);
    }
    
    asteroidReachedEarth(asteroid) {
        // Check if shield is active
        if (this.powerUps.shield.active) {
            // Shield absorbs the hit with visual effect
            this.shieldDestroyAsteroid(asteroid);
            return;
        }
        
        // Damage Earth
        const damage = 20;
        this.earthHealth = Math.max(0, this.earthHealth - damage);
        
        // Reset combo
        this.combo = 0;
        
        // Reset power-up readiness
        this.powerUps.missile.ready = false;
        
        // Effects
        AudioManager.playExplosion('large');
        this.game.screenShake.start(15, 400);
        
        // Red explosion
        this.particles.explosion(asteroid.x, asteroid.y, {
            count: 50,
            colors: ['#ff4444', '#ff8844', '#ffcc00'],
            speed: 400,
            size: 15,
            life: 1.5
        });
        
        // Flash screen
        this.game.flashScreen('#ff0000');
        
        // Remove asteroid
        const index = this.asteroids.findIndex(a => a.id === asteroid.id);
        if (index !== -1) {
            this.asteroids.splice(index, 1);
        }
        
        // Check game over
        if (this.earthHealth <= 0) {
            this.gameOver(false);
        } else if (this.earthHealth <= 30) {
            // Warning when health is low
            AudioManager.playWarning();
        }
    }
    
    // Shield destroys asteroid with special effect
    shieldDestroyAsteroid(asteroid) {
        // Remove asteroid
        const index = this.asteroids.findIndex(a => a.id === asteroid.id);
        if (index !== -1) {
            this.asteroids.splice(index, 1);
        }
        
        // Shield reflection effect - green explosion
        this.particles.explosion(asteroid.x, asteroid.y, {
            count: 30,
            colors: ['#44ff88', '#00ffff', '#ffffff', '#88ffaa'],
            speed: 300,
            size: 10,
            life: 0.8
        });
        
        // Shield ripple at impact point
        this.particles.ring(asteroid.x, asteroid.y, {
            count: 20,
            color: '#44ff88',
            speed: 200
        });
        
        // Play shield deflect sound
        AudioManager.playShieldDeflect();
        
        // Small score bonus for shield block
        this.score += 25;
        this.game.showScorePopup(asteroid.x, asteroid.y, 25);
    }
    
    update(dt, currentTime) {
        if (this.state !== 'playing') return;
        
        this.timeElapsed += dt;
        
        // Check victory condition
        if (this.timeElapsed >= this.levelDuration) {
            this.gameOver(true);
            return;
        }
        
        // Update power-up timers
        if (this.powerUps.laser.active) {
            const elapsed = currentTime - this.powerUps.laser.activatedAt;
            if (elapsed >= this.powerUps.laser.duration || this.powerUps.laser.shotsRemaining <= 0) {
                this.powerUps.laser.active = false;
                this.powerUps.laser.ready = false;
            }
        }
        
        // Shield timer - deactivate after duration
        if (this.powerUps.shield.active) {
            const elapsed = currentTime - this.powerUps.shield.activatedAt;
            if (elapsed >= this.powerUps.shield.duration) {
                this.powerUps.shield.active = false;
            }
        }
        
        // Update shield pulse animation (when available but not active)
        if (this.powerUps.shield.available && !this.powerUps.shield.active) {
            this.powerUps.shield.pulsePhase += dt * 4;
        }
        
        // Update hyper laser beams (fade out)
        for (let i = this.hyperLaserBeams.length - 1; i >= 0; i--) {
            const beam = this.hyperLaserBeams[i];
            beam.life -= dt;
            beam.alpha = beam.life / beam.maxLife;
            beam.width = 20 * (beam.life / beam.maxLife) + 5; // Shrink as it fades
            
            if (beam.life <= 0) {
                this.hyperLaserBeams.splice(i, 1);
            }
        }
        
        // Update power-up indicators
        for (let i = this.powerUpIndicators.length - 1; i >= 0; i--) {
            const indicator = this.powerUpIndicators[i];
            indicator.y -= 30 * dt;
            indicator.life -= dt;
            indicator.alpha = indicator.life / 2;
            indicator.scale = 1 + (1 - indicator.life / 2) * 0.5;
            
            if (indicator.life <= 0) {
                this.powerUpIndicators.splice(i, 1);
            }
        }
        
        // Spawn asteroids
        if (currentTime - this.lastSpawn > this.spawnInterval) {
            this.spawnAsteroid();
            this.lastSpawn = currentTime;
            
            // Decrease spawn interval over time (increase difficulty)
            this.spawnInterval = Math.max(
                500,
                this.spawnInterval - 10
            );
        }
        
        // Update cannon rotation (smooth follow)
        const angleDiff = this.cannon.targetAngle - this.cannon.angle;
        this.cannon.angle += angleDiff * 10 * dt;
        
        // Update asteroids
        for (let i = this.asteroids.length - 1; i >= 0; i--) {
            const asteroid = this.asteroids[i];
            
            // Store trail
            asteroid.trail.push({ x: asteroid.x, y: asteroid.y });
            if (asteroid.trail.length > 10) asteroid.trail.shift();
            
            // Update position
            asteroid.y += asteroid.speed * dt;
            asteroid.rotation += asteroid.rotationSpeed * dt;
            
            // Glow pulsing
            asteroid.glowIntensity = 0.7 + 0.3 * Math.sin(currentTime / 200 + asteroid.id);
            
            // Check if reached Earth
            if (asteroid.y > this.cannon.y + 30) {
                this.asteroidReachedEarth(asteroid);
            }
        }
        
        // Update projectiles
        for (let i = this.projectiles.length - 1; i >= 0; i--) {
            const proj = this.projectiles[i];
            
            // Store trail
            proj.trail.push({ x: proj.x, y: proj.y });
            if (proj.trail.length > 15) proj.trail.shift();
            
            // Update position
            proj.x += proj.vx * dt;
            proj.y += proj.vy * dt;
            
            // Add trail particles
            if (Math.random() < 0.3) {
                this.particles.addParticle(new Particle(proj.x, proj.y, {
                    vx: Utils.random(-30, 30),
                    vy: Utils.random(-30, 30),
                    life: 0.3,
                    size: 3,
                    endSize: 0,
                    color: proj.color,
                    glow: true,
                    glowSize: 5
                }));
            }
            
            // Check if projectile hit the target asteroid
            let shouldRemove = false;
            if (proj.target) {
                // Check distance to actual asteroid position
                const targetDist = Utils.distance(proj.x, proj.y, proj.target.x, proj.target.y);
                if (targetDist < proj.target.size + 10) {
                    // HIT! Check if missile for AoE
                    if (proj.isMissile) {
                        this.explodeMissile(proj, proj.target);
                    } else {
                        this.explodeAsteroid(proj.target);
                    }
                    shouldRemove = true;
                }
            }
            
            // Remove if off screen
            if (proj.y < -50 || proj.y > this.canvas.height + 50 || proj.x < -50 || proj.x > this.canvas.width + 50) {
                shouldRemove = true;
            }
            
            if (shouldRemove) {
                this.projectiles.splice(i, 1);
            }
        }
    }
    
    gameOver(victory) {
        this.state = victory ? 'victory' : 'gameover';
        
        // Calculate stars
        const accuracy = this.correctCount / Math.max(this.correctCount + this.wrongCount, 1);
        let stars = 0;
        
        if (victory) {
            if (accuracy >= 0.95 && this.earthHealth >= 80) stars = 3;
            else if (accuracy >= 0.80 && this.earthHealth >= 50) stars = 2;
            else if (accuracy >= 0.60) stars = 1;
        }
        
        // Play appropriate sound
        if (victory) {
            AudioManager.playLevelComplete();
            this.particles.confetti(0, 0, this.canvas.width, { count: 100 });
        } else {
            AudioManager.playGameOver();
        }
        
        // Update player stats
        const wpm = (this.correctCount / Math.max(this.timeElapsed / 60, 1)) * 5; // Estimate WPM
        this.game.player.updateSkill(accuracy, wpm, this.correctCount + this.wrongCount);
        this.game.player.recordGameCompletion(
            this.id,
            this.score,
            stars,
            this.timeElapsed,
            victory
        );
        
        // Show result screen
        setTimeout(() => {
            this.game.showResultScreen({
                victory: victory,
                score: this.score,
                stars: stars,
                accuracy: Math.round(accuracy * 100),
                maxCombo: this.maxCombo,
                asteroidsDestroyed: this.asteroidsDestroyed,
                earthHealth: this.earthHealth,
                timeElapsed: this.timeElapsed
            });
        }, victory ? 2000 : 1000);
    }
    
    draw(ctx) {
        // Draw Earth glow
        const earthGradient = ctx.createRadialGradient(
            this.earth.x, this.earth.y + 100,
            this.earth.radius * 0.5,
            this.earth.x, this.earth.y + 100,
            this.earth.glowRadius
        );
        earthGradient.addColorStop(0, 'rgba(100, 200, 255, 0.4)');
        earthGradient.addColorStop(0.5, 'rgba(50, 150, 255, 0.2)');
        earthGradient.addColorStop(1, 'transparent');
        ctx.fillStyle = earthGradient;
        ctx.fillRect(0, this.canvas.height - 200, this.canvas.width, 200);
        
        // === DRAW FORCE SHIELD DOME (when active) ===
        if (this.powerUps.shield.active) {
            this.drawShieldDome(ctx);
        }
        
        // Draw Earth surface (curved line at bottom)
        ctx.save();
        ctx.beginPath();
        ctx.arc(this.earth.x, this.earth.y + 170, this.earth.radius, Math.PI, 0, true);
        const earthSurfaceGradient = ctx.createLinearGradient(
            this.earth.x - this.earth.radius, this.earth.y,
            this.earth.x + this.earth.radius, this.earth.y
        );
        earthSurfaceGradient.addColorStop(0, '#1a5f7a');
        earthSurfaceGradient.addColorStop(0.3, '#2d8f4e');
        earthSurfaceGradient.addColorStop(0.5, '#3498db');
        earthSurfaceGradient.addColorStop(0.7, '#2d8f4e');
        earthSurfaceGradient.addColorStop(1, '#1a5f7a');
        ctx.fillStyle = earthSurfaceGradient;
        ctx.fill();
        
        // Atmosphere glow
        ctx.beginPath();
        ctx.arc(this.earth.x, this.earth.y + 170, this.earth.radius + 10, Math.PI, 0, true);
        ctx.strokeStyle = 'rgba(100, 200, 255, 0.5)';
        ctx.lineWidth = 5;
        ctx.stroke();
        ctx.restore();
        
        // === DRAW HYPER LASER BEAMS (enhanced multi-layer rendering) ===
        this.hyperLaserBeams.forEach(beam => {
            ctx.save();
            
            const isMain = beam.type === 'main';
            const pulseIntensity = isMain ? (0.8 + 0.2 * Math.sin(Date.now() / 30)) : 1;
            
            // Layer 1: Wide outer glow (very soft)
            ctx.globalAlpha = beam.alpha * 0.3 * pulseIntensity;
            ctx.strokeStyle = beam.outerColor || beam.color;
            ctx.lineWidth = beam.width * 3;
            ctx.lineCap = 'round';
            ctx.shadowColor = beam.color;
            ctx.shadowBlur = 50;
            ctx.beginPath();
            ctx.moveTo(beam.startX, beam.startY);
            ctx.lineTo(beam.endX, beam.endY);
            ctx.stroke();
            
            // Layer 2: Medium glow
            ctx.globalAlpha = beam.alpha * 0.5 * pulseIntensity;
            ctx.strokeStyle = beam.color;
            ctx.lineWidth = beam.width * 1.8;
            ctx.shadowBlur = 30;
            ctx.beginPath();
            ctx.moveTo(beam.startX, beam.startY);
            ctx.lineTo(beam.endX, beam.endY);
            ctx.stroke();
            
            // Layer 3: Main beam body
            ctx.globalAlpha = beam.alpha * 0.9 * pulseIntensity;
            ctx.strokeStyle = beam.color;
            ctx.lineWidth = beam.width;
            ctx.shadowBlur = 20;
            ctx.beginPath();
            ctx.moveTo(beam.startX, beam.startY);
            ctx.lineTo(beam.endX, beam.endY);
            ctx.stroke();
            
            // Layer 4: Hot white core
            ctx.globalAlpha = beam.alpha * pulseIntensity;
            ctx.strokeStyle = beam.coreColor;
            ctx.lineWidth = beam.width * 0.35;
            ctx.shadowColor = '#ffffff';
            ctx.shadowBlur = 10;
            ctx.beginPath();
            ctx.moveTo(beam.startX, beam.startY);
            ctx.lineTo(beam.endX, beam.endY);
            ctx.stroke();
            
            // Layer 5: Thin bright center line (for main beams only)
            if (isMain) {
                ctx.globalAlpha = beam.alpha * 0.8;
                ctx.strokeStyle = '#ffffff';
                ctx.lineWidth = 2;
                ctx.shadowBlur = 5;
                ctx.beginPath();
                ctx.moveTo(beam.startX, beam.startY);
                ctx.lineTo(beam.endX, beam.endY);
                ctx.stroke();
            }
            
            ctx.restore();
        });
        
        // Draw projectile trails
        this.projectiles.forEach(proj => {
            if (proj.trail.length > 1) {
                ctx.save();
                ctx.beginPath();
                ctx.moveTo(proj.trail[0].x, proj.trail[0].y);
                for (let i = 1; i < proj.trail.length; i++) {
                    ctx.lineTo(proj.trail[i].x, proj.trail[i].y);
                }
                ctx.lineTo(proj.x, proj.y);
                
                const trailGradient = ctx.createLinearGradient(
                    proj.trail[0].x, proj.trail[0].y,
                    proj.x, proj.y
                );
                trailGradient.addColorStop(0, 'transparent');
                trailGradient.addColorStop(1, proj.color);
                
                ctx.strokeStyle = trailGradient;
                ctx.lineWidth = proj.isMissile ? 8 : 4;
                ctx.lineCap = 'round';
                ctx.stroke();
                ctx.restore();
            }
            
            // Projectile head with glow
            ctx.save();
            const projGlow = ctx.createRadialGradient(proj.x, proj.y, 0, proj.x, proj.y, proj.size * 3);
            projGlow.addColorStop(0, proj.color);
            projGlow.addColorStop(0.5, proj.isMissile ? 'rgba(255, 102, 0, 0.5)' : 'rgba(0, 255, 255, 0.5)');
            projGlow.addColorStop(1, 'transparent');
            ctx.fillStyle = projGlow;
            ctx.beginPath();
            ctx.arc(proj.x, proj.y, proj.size * 3, 0, Math.PI * 2);
            ctx.fill();
            
            ctx.fillStyle = '#ffffff';
            ctx.beginPath();
            ctx.arc(proj.x, proj.y, proj.size * 0.5, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
        });
        
        // Draw asteroids
        this.asteroids.forEach(asteroid => {
            ctx.save();
            ctx.translate(asteroid.x, asteroid.y);
            
            // Draw rotating asteroid body
            ctx.save();
            ctx.rotate(asteroid.rotation);
            
            // Glow effect
            const glowGradient = ctx.createRadialGradient(0, 0, asteroid.size * 0.5, 0, 0, asteroid.size * 1.5);
            glowGradient.addColorStop(0, asteroid.color);
            glowGradient.addColorStop(0.5, `${asteroid.color}88`);
            glowGradient.addColorStop(1, 'transparent');
            ctx.fillStyle = glowGradient;
            ctx.globalAlpha = asteroid.glowIntensity;
            ctx.beginPath();
            ctx.arc(0, 0, asteroid.size * 1.5, 0, Math.PI * 2);
            ctx.fill();
            
            // Asteroid body (rocky shape)
            ctx.globalAlpha = 1;
            ctx.fillStyle = asteroid.color;
            ctx.beginPath();
            const points = 8;
            for (let i = 0; i < points; i++) {
                const angle = (Math.PI * 2 / points) * i;
                const radius = asteroid.size * (0.8 + 0.2 * Math.sin(i * 3 + asteroid.id));
                const x = Math.cos(angle) * radius;
                const y = Math.sin(angle) * radius;
                if (i === 0) ctx.moveTo(x, y);
                else ctx.lineTo(x, y);
            }
            ctx.closePath();
            ctx.fill();
            
            // Crater details
            ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
            ctx.beginPath();
            ctx.arc(asteroid.size * 0.2, -asteroid.size * 0.2, asteroid.size * 0.2, 0, Math.PI * 2);
            ctx.fill();
            ctx.beginPath();
            ctx.arc(-asteroid.size * 0.3, asteroid.size * 0.15, asteroid.size * 0.15, 0, Math.PI * 2);
            ctx.fill();
            
            ctx.restore(); // Restore from rotation - now we're just translated
            
            // Draw letter WITHOUT rotation (stays upright) - IMPROVED FONT
            const fontSize = Math.round(asteroid.size * 1.1);
            ctx.font = `bold ${fontSize}px "Arial Black", Impact, "Helvetica Neue", Arial, sans-serif`;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            
            // Strong black outline for contrast
            ctx.strokeStyle = '#000000';
            ctx.lineWidth = 5;
            ctx.strokeText(asteroid.letter, 0, 0);
            
            // White fill
            ctx.fillStyle = '#ffffff';
            ctx.fillText(asteroid.letter, 0, 0);
            
            ctx.restore();
        });
        
        // Draw cannon base
        ctx.save();
        ctx.translate(this.cannon.x, this.cannon.y);
        
        // Base platform
        const baseGradient = ctx.createLinearGradient(-40, -20, 40, 20);
        baseGradient.addColorStop(0, '#2a3a5a');
        baseGradient.addColorStop(0.5, '#4a5a7a');
        baseGradient.addColorStop(1, '#2a3a5a');
        ctx.fillStyle = baseGradient;
        ctx.beginPath();
        ctx.moveTo(-50, 20);
        ctx.lineTo(-40, -10);
        ctx.lineTo(40, -10);
        ctx.lineTo(50, 20);
        ctx.closePath();
        ctx.fill();
        
        // Cannon turret base
        ctx.fillStyle = '#3a4a6a';
        ctx.beginPath();
        ctx.arc(0, 0, 25, 0, Math.PI * 2);
        ctx.fill();
        
        ctx.restore();
        
        // Draw cannon barrel
        ctx.save();
        ctx.translate(this.cannon.x, this.cannon.y);
        ctx.rotate(this.cannon.angle);
        
        // Barrel glow when firing - change color based on active power-up
        let barrelColor = this.cannon.color;
        let barrelGlowColor = this.cannon.glowColor;
        
        if (this.powerUps.laser.active) {
            barrelColor = '#00ffff';
            barrelGlowColor = '#ffffff';
        } else if (this.powerUps.missile.ready) {
            barrelColor = '#ff6600';
            barrelGlowColor = '#ffcc00';
        }
        
        const barrelGlow = ctx.createLinearGradient(0, 0, this.cannon.length, 0);
        barrelGlow.addColorStop(0, barrelColor);
        barrelGlow.addColorStop(1, barrelGlowColor);
        
        // Barrel
        ctx.fillStyle = barrelGlow;
        ctx.beginPath();
        ctx.moveTo(0, -this.cannon.width / 2);
        ctx.lineTo(this.cannon.length, -this.cannon.width / 3);
        ctx.lineTo(this.cannon.length + 10, 0);
        ctx.lineTo(this.cannon.length, this.cannon.width / 3);
        ctx.lineTo(0, this.cannon.width / 2);
        ctx.closePath();
        ctx.fill();
        
        // Barrel highlight
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(5, -this.cannon.width / 2 + 3);
        ctx.lineTo(this.cannon.length - 5, -this.cannon.width / 3 + 2);
        ctx.stroke();
        
        ctx.restore();
        
        // Draw Earth health bar
        this.drawHealthBar(ctx);
        
        // Draw timer
        this.drawTimer(ctx);
        
        // Draw power-up indicators
        this.drawPowerUpStatus(ctx);
        
        // Draw shield available indicator (pulsing when ready)
        if (this.powerUps.shield.available && !this.powerUps.shield.active) {
            this.drawShieldAvailableIndicator(ctx);
        }
        
        // Draw floating power-up notifications
        this.powerUpIndicators.forEach(indicator => {
            ctx.save();
            ctx.globalAlpha = indicator.alpha;
            ctx.font = `bold ${24 * indicator.scale}px "Orbitron", sans-serif`;
            ctx.textAlign = 'center';
            ctx.fillStyle = '#ffd700';
            ctx.shadowColor = '#ffd700';
            ctx.shadowBlur = 20;
            ctx.fillText(indicator.text, indicator.x, indicator.y);
            ctx.restore();
        });
        
        // Draw current word progress (if using word mode)
        if (this.useWordMode && this.currentWord) {
            this.drawWordProgress(ctx);
        }
    }
    
    // Draw the force shield dome visual - ENHANCED
    drawShieldDome(ctx) {
        const shield = this.powerUps.shield;
        const elapsed = Date.now() - shield.activatedAt;
        const remaining = Math.max(0, (shield.duration - elapsed) / shield.duration);
        
        ctx.save();
        
        // Dynamic pulsing - faster when time is running out
        const pulseSpeed = remaining < 0.3 ? 50 : 100;
        const pulse = 0.6 + 0.4 * Math.sin(elapsed / pulseSpeed);
        
        // Shield dome parameters
        const domeRadius = this.earth.radius + 60;
        const domeY = this.earth.y + 170;
        const centerX = this.earth.x;
        
        // Layer 1: Very wide outer glow (atmosphere effect)
        const outerGlow = ctx.createRadialGradient(
            centerX, domeY, domeRadius * 0.3,
            centerX, domeY - domeRadius * 0.5, domeRadius * 1.5
        );
        outerGlow.addColorStop(0, 'rgba(68, 255, 136, 0)');
        outerGlow.addColorStop(0.5, `rgba(68, 255, 136, ${0.15 * pulse * remaining})`);
        outerGlow.addColorStop(1, 'rgba(68, 255, 136, 0)');
        ctx.fillStyle = outerGlow;
        ctx.beginPath();
        ctx.arc(centerX, domeY, domeRadius * 1.5, Math.PI, 0, true);
        ctx.fill();
        
        // Layer 2: Outer dome stroke with glow
        ctx.globalAlpha = pulse * 0.4 * remaining;
        ctx.strokeStyle = '#44ff88';
        ctx.lineWidth = 25;
        ctx.shadowColor = '#44ff88';
        ctx.shadowBlur = 50;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.arc(centerX, domeY, domeRadius + 20, Math.PI, 0, true);
        ctx.stroke();
        
        // Layer 3: Main dome arc
        ctx.globalAlpha = pulse * 0.7 * remaining;
        ctx.strokeStyle = '#44ff88';
        ctx.lineWidth = 10;
        ctx.shadowBlur = 30;
        ctx.beginPath();
        ctx.arc(centerX, domeY, domeRadius, Math.PI, 0, true);
        ctx.stroke();
        
        // Layer 4: Inner bright dome
        ctx.globalAlpha = pulse * 0.9 * remaining;
        ctx.strokeStyle = '#88ffaa';
        ctx.lineWidth = 4;
        ctx.shadowBlur = 15;
        ctx.beginPath();
        ctx.arc(centerX, domeY, domeRadius - 15, Math.PI, 0, true);
        ctx.stroke();
        
        // Layer 5: White hot inner core line
        ctx.globalAlpha = pulse * 0.6 * remaining;
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 2;
        ctx.shadowColor = '#ffffff';
        ctx.shadowBlur = 10;
        ctx.beginPath();
        ctx.arc(centerX, domeY, domeRadius - 25, Math.PI, 0, true);
        ctx.stroke();
        
        // Hexagonal grid pattern on dome surface
        ctx.globalAlpha = pulse * 0.35 * remaining;
        ctx.strokeStyle = '#44ff88';
        ctx.lineWidth = 1.5;
        ctx.shadowBlur = 5;
        
        // Vertical ribs
        const ribCount = 16;
        for (let i = 0; i <= ribCount; i++) {
            const angle = Math.PI + (Math.PI / ribCount) * i;
            const x1 = centerX + Math.cos(angle) * domeRadius;
            const y1 = domeY + Math.sin(angle) * domeRadius;
            const x2 = centerX + Math.cos(angle) * (domeRadius * 0.4);
            const y2 = domeY + Math.sin(angle) * (domeRadius * 0.4);
            ctx.beginPath();
            ctx.moveTo(x1, y1);
            ctx.lineTo(x2, y2);
            ctx.stroke();
        }
        
        // Horizontal rings
        for (let r = 0.5; r < 1; r += 0.25) {
            ctx.beginPath();
            ctx.arc(centerX, domeY, domeRadius * r, Math.PI, 0, true);
            ctx.stroke();
        }
        
        // Energy particles floating on dome surface
        const particleTime = elapsed / 500;
        for (let i = 0; i < 8; i++) {
            const pAngle = Math.PI + (particleTime + i * Math.PI / 4) % Math.PI;
            const px = centerX + Math.cos(pAngle) * (domeRadius - 5);
            const py = domeY + Math.sin(pAngle) * (domeRadius - 5);
            
            ctx.globalAlpha = pulse * 0.8 * remaining;
            ctx.fillStyle = '#ffffff';
            ctx.shadowColor = '#44ff88';
            ctx.shadowBlur = 15;
            ctx.beginPath();
            ctx.arc(px, py, 4, 0, Math.PI * 2);
            ctx.fill();
        }
        
        // Timer display - circular progress at bottom
        const timerY = this.canvas.height - 45;
        const timerRadius = 25;
        
        // Timer background
        ctx.globalAlpha = 0.5;
        ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
        ctx.beginPath();
        ctx.arc(centerX, timerY, timerRadius + 5, 0, Math.PI * 2);
        ctx.fill();
        
        // Timer progress arc
        ctx.globalAlpha = 0.9;
        ctx.strokeStyle = remaining < 0.3 ? '#ff4444' : '#44ff88';
        ctx.lineWidth = 6;
        ctx.shadowColor = ctx.strokeStyle;
        ctx.shadowBlur = 10;
        ctx.beginPath();
        ctx.arc(centerX, timerY, timerRadius, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * remaining);
        ctx.stroke();
        
        // Timer text
        ctx.globalAlpha = 1;
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 14px "Orbitron", sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.shadowBlur = 5;
        const secondsLeft = Math.ceil((shield.duration - elapsed) / 1000);
        ctx.fillText(`${secondsLeft}s`, centerX, timerY);
        
        ctx.restore();
    }
    
    // Draw pulsing indicator when shield is available
    drawShieldAvailableIndicator(ctx) {
        const pulse = 0.5 + 0.5 * Math.sin(this.powerUps.shield.pulsePhase);
        
        ctx.save();
        
        // Position at bottom center
        const x = this.canvas.width / 2;
        const y = this.canvas.height - 100;
        
        // Background
        ctx.globalAlpha = 0.8;
        ctx.fillStyle = `rgba(68, 255, 136, ${0.2 + pulse * 0.2})`;
        ctx.strokeStyle = '#44ff88';
        ctx.lineWidth = 2 + pulse * 2;
        
        // Rounded rect
        const width = 280;
        const height = 40;
        ctx.beginPath();
        ctx.roundRect(x - width/2, y - height/2, width, height, 10);
        ctx.fill();
        ctx.stroke();
        
        // Text
        ctx.globalAlpha = 1;
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 16px "Orbitron", sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.shadowColor = '#44ff88';
        ctx.shadowBlur = 10 + pulse * 10;
        ctx.fillText('🛡️ PRESS SPACE FOR SHIELD! 🛡️', x, y);
        
        ctx.restore();
    }
    
    drawWordProgress(ctx) {
        const centerX = this.canvas.width / 2;
        const y = this.canvas.height - 160;
        
        ctx.save();
        ctx.font = 'bold 16px "Exo 2", sans-serif';
        ctx.textAlign = 'center';
        ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
        ctx.fillText('WORD:', centerX - 80, y);
        
        // Draw the word with typed/untyped highlighting
        let x = centerX - 40;
        for (let i = 0; i < this.currentWord.length; i++) {
            const letter = this.currentWord[i];
            if (i < this.currentWordIndex) {
                ctx.fillStyle = '#44ff88'; // Typed - green
            } else if (i === this.currentWordIndex) {
                ctx.fillStyle = '#ffd700'; // Current - gold
                ctx.shadowColor = '#ffd700';
                ctx.shadowBlur = 10;
            } else {
                ctx.fillStyle = 'rgba(255, 255, 255, 0.4)'; // Upcoming - dim
                ctx.shadowBlur = 0;
            }
            ctx.font = i === this.currentWordIndex ? 'bold 22px "Arial Black", sans-serif' : 'bold 18px "Exo 2", sans-serif';
            ctx.fillText(letter, x, y);
            x += 25;
            ctx.shadowBlur = 0;
        }
        
        ctx.restore();
    }
    
    drawPowerUpStatus(ctx) {
        const startX = 20;
        const y = 100;
        let offsetY = 0;
        
        ctx.save();
        
        // Missile status
        const missile = this.powerUps.missile;
        if (missile.ready || this.combo >= missile.comboRequired * 0.5) {
            ctx.globalAlpha = missile.ready ? 1 : 0.4;
            ctx.fillStyle = missile.ready ? missile.color + '44' : 'rgba(0, 0, 0, 0.5)';
            ctx.fillRect(startX, y + offsetY, 140, 30);
            ctx.strokeStyle = missile.ready ? missile.color : '#666';
            ctx.lineWidth = 2;
            ctx.strokeRect(startX, y + offsetY, 140, 30);
            ctx.font = '14px "Exo 2", sans-serif';
            ctx.fillStyle = missile.ready ? '#ffffff' : '#888';
            ctx.textAlign = 'left';
            ctx.fillText(`${missile.icon} ${missile.name}`, startX + 5, y + offsetY + 20);
            ctx.textAlign = 'right';
            ctx.fillStyle = missile.ready ? '#44ff88' : '#888';
            ctx.fillText(missile.ready ? 'READY!' : `${this.combo}/${missile.comboRequired}`, startX + 135, y + offsetY + 20);
            offsetY += 35;
        }
        
        // Laser status
        const laser = this.powerUps.laser;
        if (laser.active || laser.ready || this.combo >= laser.comboRequired * 0.5) {
            ctx.globalAlpha = laser.active ? 1 : 0.4;
            ctx.fillStyle = laser.active ? laser.color + '44' : 'rgba(0, 0, 0, 0.5)';
            ctx.fillRect(startX, y + offsetY, 140, 30);
            ctx.strokeStyle = laser.active ? laser.color : '#666';
            ctx.lineWidth = 2;
            ctx.strokeRect(startX, y + offsetY, 140, 30);
            ctx.font = '14px "Exo 2", sans-serif';
            ctx.fillStyle = laser.active ? '#ffffff' : '#888';
            ctx.textAlign = 'left';
            ctx.fillText(`${laser.icon} ${laser.name}`, startX + 5, y + offsetY + 20);
            ctx.textAlign = 'right';
            if (laser.active) {
                ctx.fillStyle = '#00ffff';
                ctx.fillText(`${laser.shotsRemaining} shots`, startX + 135, y + offsetY + 20);
            } else {
                ctx.fillStyle = '#888';
                ctx.fillText(`${this.combo}/${laser.comboRequired}`, startX + 135, y + offsetY + 20);
            }
            offsetY += 35;
        }
        
        // Shield status (shows progress toward earning, or AVAILABLE)
        const shield = this.powerUps.shield;
        if (!shield.used || shield.available || shield.active) {
            const showProgress = this.combo >= shield.comboRequired * 0.3 || shield.available || shield.active;
            if (showProgress) {
                ctx.globalAlpha = (shield.available || shield.active) ? 1 : 0.4;
                ctx.fillStyle = (shield.available || shield.active) ? shield.color + '44' : 'rgba(0, 0, 0, 0.5)';
                ctx.fillRect(startX, y + offsetY, 140, 30);
                ctx.strokeStyle = (shield.available || shield.active) ? shield.color : '#666';
                ctx.lineWidth = 2;
                ctx.strokeRect(startX, y + offsetY, 140, 30);
                ctx.font = '14px "Exo 2", sans-serif';
                ctx.fillStyle = (shield.available || shield.active) ? '#ffffff' : '#888';
                ctx.textAlign = 'left';
                ctx.fillText(`${shield.icon} ${shield.name}`, startX + 5, y + offsetY + 20);
                ctx.textAlign = 'right';
                if (shield.active) {
                    const remaining = Math.ceil((shield.duration - (Date.now() - shield.activatedAt)) / 1000);
                    ctx.fillStyle = '#44ff88';
                    ctx.fillText(`${remaining}s`, startX + 135, y + offsetY + 20);
                } else if (shield.available) {
                    ctx.fillStyle = '#44ff88';
                    ctx.fillText('SPACE!', startX + 135, y + offsetY + 20);
                } else if (!shield.used) {
                    ctx.fillStyle = '#888';
                    ctx.fillText(`${this.combo}/${shield.comboRequired}`, startX + 135, y + offsetY + 20);
                }
            }
        }
        
        ctx.restore();
    }
    
    drawHealthBar(ctx) {
        const barWidth = 300;
        const barHeight = 15;
        const x = (this.canvas.width - barWidth) / 2;
        const y = this.canvas.height - 50;
        
        // Background
        ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
        ctx.fillRect(x - 2, y - 2, barWidth + 4, barHeight + 4);
        
        // Health bar background
        ctx.fillStyle = 'rgba(255, 255, 255, 0.1)';
        ctx.fillRect(x, y, barWidth, barHeight);
        
        // Health bar fill
        const healthPercent = this.earthHealth / this.maxEarthHealth;
        const healthColor = healthPercent > 0.6 ? '#44ff88' : 
                           healthPercent > 0.3 ? '#ffcc00' : '#ff4444';
        
        const healthGradient = ctx.createLinearGradient(x, y, x + barWidth * healthPercent, y);
        healthGradient.addColorStop(0, healthColor);
        healthGradient.addColorStop(1, '#ffffff');
        
        ctx.fillStyle = healthGradient;
        ctx.fillRect(x, y, barWidth * healthPercent, barHeight);
        
        // Border
        ctx.strokeStyle = 'rgba(100, 150, 255, 0.5)';
        ctx.lineWidth = 2;
        ctx.strokeRect(x, y, barWidth, barHeight);
        
        // Label
        ctx.fillStyle = '#ffffff';
        ctx.font = '12px "Orbitron", sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('EARTH SHIELD', this.canvas.width / 2, y - 8);
    }
    
    drawTimer(ctx) {
        const remainingTime = Math.max(0, this.levelDuration - this.timeElapsed);
        const minutes = Math.floor(remainingTime / 60);
        const seconds = Math.floor(remainingTime % 60);
        const timeStr = `${minutes}:${seconds.toString().padStart(2, '0')}`;
        
        ctx.save();
        ctx.fillStyle = remainingTime < 30 ? '#ff4444' : '#ffffff';
        ctx.font = 'bold 24px "Orbitron", sans-serif';
        ctx.textAlign = 'center';
        ctx.shadowColor = remainingTime < 30 ? '#ff0000' : '#000000';
        ctx.shadowBlur = 10;
        ctx.fillText(timeStr, this.canvas.width / 2, 80);
        ctx.restore();
    }
    
    getHUD() {
        return {
            score: this.score,
            combo: this.combo,
            accuracy: this.correctCount / Math.max(this.correctCount + this.wrongCount, 1),
            earthHealth: this.earthHealth,
            maxEarthHealth: this.maxEarthHealth,
            timeRemaining: Math.max(0, this.levelDuration - this.timeElapsed)
        };
    }
}

// Export
window.AsteroidDefenseLevel = AsteroidDefenseLevel;
