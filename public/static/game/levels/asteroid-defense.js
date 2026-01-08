// ============================================
// COSMIC TYPER - Level 1: Asteroid Defense
// Protect Earth from falling letter asteroids!
// WAVE-BASED SYSTEM - Complete waves to earn stars!
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
        this.state = 'ready'; // ready, playing, paused, waveComplete, gameover, victory
        this.score = 0;
        this.combo = 0;
        this.maxCombo = 0;
        this.correctCount = 0;
        this.wrongCount = 0;
        this.earthHealth = 100;
        this.maxEarthHealth = 100;
        this.timeElapsed = 0;

        // === WAVE SYSTEM ===
        this.currentWave = 1;
        this.waveTimeElapsed = 0;
        this.waveDuration = 20; // 20 seconds per wave
        this.waveTransitionTime = 0;
        this.isInWaveTransition = false;
        this.asteroidsDestroyedThisWave = 0;
        this.waveTargets = {
            1: 5,   // Wave 1: Destroy 5 asteroids
            2: 8,   // Wave 2: Destroy 8 asteroids
            3: 10,  // Wave 3: Destroy 10 asteroids (1 star)
            4: 12,  // Wave 4: Destroy 12 asteroids
            5: 15,  // Wave 5: Destroy 15 asteroids
            6: 18,  // Wave 6: Destroy 18 asteroids (2 stars)
            7: 22,  // Wave 7+: Harder challenge begins!
            8: 26,  // Increased targets
            9: 30,  // Getting serious
            10: 35  // Wave 10: 3 stars! - The ultimate challenge
        };

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
        this.baseSpawnRate = this.getSpawnRate();
        this.baseFallSpeed = this.getFallSpeed();

        // Word mode - use dictionary words
        this.useWordMode = true;
        this.currentWord = null;
        this.currentWordIndex = 0;
        this.typedLetterCount = 0;
        this.wordQueue = [];

        // Timers
        this.lastSpawn = 0;
        this.spawnInterval = 2000;

        // Visual elements
        this.earth = null;
        this.shield = null;

        // Adaptive difficulty - SPEED WEIGHTED MORE THAN ACCURACY
        this.recentAccuracy = [];
        this.recentReactionTimes = [];
        this.adaptiveMultiplier = 1;
        this.lastDifficultyAdjust = 0;
        this.typingStartTime = null;
        this.totalCharactersTyped = 0;

        // === POWER-UP SYSTEM ===
        this.powerUps = {
            missile: {
                name: 'Mega Missile',
                icon: '🚀',
                active: false,
                ready: false,
                notificationShown: false, // Track if notification was shown
                comboRequired: 5,
                blastRadius: 250,
                damage: 100,
                duration: 0,
                color: '#ff6600'
            },
            laser: {
                name: 'Hyper Laser',
                icon: '⚡',
                active: false,
                ready: false,
                notificationShown: false, // Track if notification was shown
                comboRequired: 10,
                shotsRemaining: 0,
                maxShots: 3,
                duration: 5000,
                activatedAt: 0,
                color: '#00ffff'
            },
            orbitalStrike: {
                name: 'Orbital Strike',
                icon: '💥',
                available: false,
                active: false,
                used: false,
                comboRequired: 15,
                color: '#ff00ff',
                pulsePhase: 0
            }
        };
        this.activePowerUp = null;
        this.powerUpIndicators = [];

        // Weapon toggle: 'auto', 'missile', or 'laser'
        // 'auto' = current behavior (laser priority), can toggle when both available
        this.preferredWeapon = 'auto';

        // === GUN OVERHEAT ANTI-SPAM SYSTEM ===
        this.gunOverheat = {
            wrongKeyTimes: [],          // Timestamps of recent wrong key presses
            isOverheated: false,        // Gun currently overheated?
            cooldownTimer: 0,           // Remaining cooldown time
            cooldownDuration: 3,        // Seconds of cooldown penalty
            spamWindow: 2000,           // Time window to track wrong keys (ms)
            spamThreshold: 6,           // Wrong keys in window to trigger overheat
            lastKeyTime: 0,             // Last key press timestamp
            minKeyInterval: 50          // Min ms between key presses (rate limit)
        };
    }

    getSpawnRate() {
        const rates = {
            'beginner': 2800,  // Slower for beginners
            'easy': 2400,
            'medium': 2000,
            'hard': 1500
        };
        return rates[this.difficulty] || 2400;
    }

    getFallSpeed() {
        const speeds = {
            'beginner': 35,  // Slower for beginners
            'easy': 50,
            'medium': 70,
            'hard': 90
        };
        return speeds[this.difficulty] || 50;
    }

    // Get spawn rate and fall speed based on current wave
    getWaveSpawnRate() {
        // Each wave spawns faster
        // Waves 1-6: 8% faster each wave
        // Waves 7+: 12% faster each wave (steeper difficulty curve)
        let waveMultiplier;
        if (this.currentWave <= 6) {
            waveMultiplier = 1 - (this.currentWave - 1) * 0.08; // 8% faster each wave
        } else {
            // Base from wave 6, then 12% faster per wave after that
            const wave6Multiplier = 1 - 5 * 0.08; // 0.60
            const wavesAfter6 = this.currentWave - 6;
            waveMultiplier = wave6Multiplier - wavesAfter6 * 0.12; // 12% faster per wave
        }
        return Math.max(600, this.baseSpawnRate * Math.max(0.25, waveMultiplier) * (1 / this.adaptiveMultiplier));
    }

    getWaveFallSpeed() {
        // Each wave asteroids fall faster
        // Waves 1-6: 10% faster each wave
        // Waves 7+: 15% faster each wave (steeper difficulty curve)
        let waveMultiplier;
        if (this.currentWave <= 6) {
            waveMultiplier = 1 + (this.currentWave - 1) * 0.1; // 10% faster each wave
        } else {
            // Base from wave 6, then 15% faster per wave after that
            const wave6Multiplier = 1 + 5 * 0.1; // 1.50
            const wavesAfter6 = this.currentWave - 6;
            waveMultiplier = wave6Multiplier + wavesAfter6 * 0.15; // 15% faster per wave
        }
        return this.baseFallSpeed * waveMultiplier * this.adaptiveMultiplier;
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
        this.recentReactionTimes = [];
        this.adaptiveMultiplier = 1;
        this.lastDifficultyAdjust = 0;
        this.typingStartTime = null;
        this.totalCharactersTyped = 0;

        // Reset wave system
        this.currentWave = 1;
        this.waveTimeElapsed = 0;
        this.isInWaveTransition = false;
        this.waveTransitionTime = 0;
        this.asteroidsDestroyedThisWave = 0;
        this.spawnInterval = this.getWaveSpawnRate();

        // Initialize word queue if using word mode
        if (this.useWordMode && window.WordDictionary) {
            this.wordQueue = WordDictionary.getRandomWords(20, this.difficulty);
            this.currentWord = this.wordQueue.shift();
            this.currentWordIndex = 0;
            this.typedLetterCount = 0;
        }

        // Reset power-ups
        this.powerUps.missile.active = false;
        this.powerUps.missile.ready = false;
        this.powerUps.missile.notificationShown = false;
        this.powerUps.laser.active = false;
        this.powerUps.laser.ready = false;
        this.powerUps.laser.notificationShown = false;
        this.powerUps.laser.shotsRemaining = 0;
        this.powerUps.orbitalStrike.available = false;
        this.powerUps.orbitalStrike.active = false;
        this.powerUps.orbitalStrike.used = false;
        this.powerUps.orbitalStrike.pulsePhase = 0;

        this.activePowerUp = null;
        this.powerUpIndicators = [];
    }

    start() {
        this.state = 'playing';
        this.init();
        this.showWaveStart();
        this.spawnAsteroid();
    }

    pause() {
        this.state = 'paused';
    }

    resume() {
        this.state = 'playing';
    }

    // Show wave start notification - CLEAN single message
    showWaveStart() {
        // Clear any lingering messages first
        this.powerUpIndicators = [];

        const waveText = this.currentWave <= 3 ? `WAVE ${this.currentWave}` :
            this.currentWave <= 6 ? `WAVE ${this.currentWave} - HARDER!` :
                `WAVE ${this.currentWave} - INTENSE!`;

        const target = this.waveTargets[this.currentWave] || this.waveTargets[10];

        // Single combined message - wave number and target together
        this.powerUpIndicators.push({
            text: `🌊 ${waveText} 🌊`,
            x: this.canvas.width / 2,
            y: this.canvas.height / 2 - 50,
            alpha: 1,
            scale: 2,
            life: 2.5,
            fixed: true // Don't float up
        });

        // Target shown slightly after to avoid overlap
        setTimeout(() => {
            this.powerUpIndicators.push({
                text: `Destroy ${target} asteroids!`,
                x: this.canvas.width / 2,
                y: this.canvas.height / 2 + 10,
                alpha: 1,
                scale: 1.3,
                life: 2,
                fixed: true
            });
        }, 300);
    }

    getNextLetter() {
        if (this.useWordMode && this.currentWord && window.WordDictionary) {
            if (this.currentWordIndex < this.currentWord.length) {
                const letter = this.currentWord[this.currentWordIndex];
                this.currentWordIndex++;
                return letter;
            } else {
                this.currentWord = this.wordQueue.shift();
                if (!this.currentWord) {
                    this.wordQueue = WordDictionary.getRandomWords(20, this.difficulty);
                    this.currentWord = this.wordQueue.shift();
                }
                this.currentWordIndex = 1;
                this.typedLetterCount = 0;
                return this.currentWord ? this.currentWord[0] : Utils.randomChoice(this.letters);
            }
        }

        const weakLetters = this.game.player.getWeakestLetters(3);
        if (weakLetters.length > 0 && Math.random() < 0.3) {
            return Utils.randomChoice(weakLetters);
        }
        return Utils.randomChoice(this.letters);
    }

    spawnAsteroid() {
        const letter = this.getNextLetter();
        const x = Utils.random(100, this.canvas.width - 100);
        const y = -50;

        // Size based on difficulty (larger = easier to see)
        const size = this.difficulty === 'beginner' ? 55 :
            this.difficulty === 'easy' ? 50 :
                this.difficulty === 'medium' ? 45 : 40;

        // Speed based on wave
        const speed = (this.getWaveFallSpeed() + Utils.random(-10, 10));

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
        const now = Date.now();

        // === SPACEBAR: Activate Orbital Strike (always allowed) ===
        if (key === ' ' || key === 'Space') {
            this.tryActivateOrbitalStrike();
            return;
        }

        // === SHIFT: Toggle weapon preference (always allowed) ===
        if (key === 'Shift') {
            this.toggleWeaponPreference();
            return;
        }

        // === INPUT RATE LIMITING (prevent freezing from key smashing) ===
        if (now - this.gunOverheat.lastKeyTime < this.gunOverheat.minKeyInterval) {
            return; // Silently ignore too-fast inputs
        }
        this.gunOverheat.lastKeyTime = now;

        // === CHECK IF GUN IS OVERHEATED (blocked) ===
        if (this.gunOverheat.isOverheated) {
            // Gun is cooling down - flash warning
            AudioManager.playWrong();
            this.game.screenShake.start(2, 50);
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
            // === CORRECT KEY: Reset spam counter, destroy asteroid ===
            this.gunOverheat.wrongKeyTimes = []; // Clear spam history on success
            this.destroyAsteroid(matchingAsteroid);
            this.recordHit(true, pressedLetter);
            if (this.useWordMode && this.currentWord) {
                this.typedLetterCount++;
            }
        } else {
            // === WRONG KEY: Track for spam detection ===
            this.gunOverheat.wrongKeyTimes.push(now);

            // Remove old timestamps outside the spam window
            const windowStart = now - this.gunOverheat.spamWindow;
            this.gunOverheat.wrongKeyTimes = this.gunOverheat.wrongKeyTimes.filter(t => t > windowStart);

            // Check if spam threshold exceeded
            if (this.gunOverheat.wrongKeyTimes.length >= this.gunOverheat.spamThreshold) {
                this.triggerGunOverheat();
            } else {
                this.recordMiss(pressedLetter);
            }
        }
    }

    // === GUN OVERHEAT: Trigger cooldown penalty ===
    triggerGunOverheat() {
        this.gunOverheat.isOverheated = true;
        this.gunOverheat.cooldownTimer = this.gunOverheat.cooldownDuration;
        this.gunOverheat.wrongKeyTimes = []; // Reset spam counter

        // Break combo on overheat
        this.combo = 0;

        // BIG WARNING notification (using powerUpIndicators system)
        this.powerUpIndicators.push({
            text: '🔥 GUN OVERHEATING! 🔥',
            x: this.canvas.width / 2,
            y: this.canvas.height / 2 - 80,
            alpha: 1,
            scale: 2.0,  // BIGGER!
            life: 3,
            color: '#ff4400'  // Red color for overheat
        });

        this.powerUpIndicators.push({
            text: `⏳ ${this.gunOverheat.cooldownDuration}s COOLDOWN`,
            x: this.canvas.width / 2,
            y: this.canvas.height / 2 - 30,
            alpha: 1,
            scale: 1.5,
            life: 3,
            color: '#ffaa00'
        });

        // Audio and visual feedback
        AudioManager.playWarning();
        this.game.screenShake.start(10, 300);

        // Red flash on screen
        this.game.flashScreen('#ff0000');

        // Make cannon glow red during cooldown
        this.cannon.overheatedGlow = true;
    }

    // === WEAPON TOGGLE (SHIFT KEY) ===
    toggleWeaponPreference() {
        const missile = this.powerUps.missile;
        const laser = this.powerUps.laser;

        // Only allow toggle when both weapons are available
        const missileReady = missile.ready && this.combo >= missile.comboRequired;
        const laserReady = laser.active && laser.shotsRemaining > 0;

        if (missileReady && laserReady) {
            // Toggle between missile and laser
            if (this.preferredWeapon === 'missile') {
                this.preferredWeapon = 'laser';
                this.showWeaponIndicator('⚡ HYPER LASER');
                AudioManager.playClick();
            } else {
                this.preferredWeapon = 'missile';
                this.showWeaponIndicator('🚀 MEGA MISSILE');
                AudioManager.playClick();
            }
        } else if (missileReady || laserReady) {
            // Only one weapon available - show hint
            const weaponName = laserReady ? 'Hyper Laser' : 'Mega Missile';
            this.showWeaponIndicator(`Only ${weaponName} available`);
        }
    }

    showWeaponIndicator(text) {
        this.powerUpIndicators.push({
            text: text,
            x: this.canvas.width / 2,
            y: this.canvas.height / 2 + 80,
            alpha: 1,
            scale: 1.5,
            life: 1.5
        });
    }

    // === ORBITAL STRIKE ACTIVATION (SPACEBAR) ===
    tryActivateOrbitalStrike() {
        const strike = this.powerUps.orbitalStrike;

        if (strike.available && !strike.active && !strike.used) {
            strike.active = true;
            strike.used = true;
            strike.available = false;

            // Play the orbital blast sound effect
            AudioManager.playOrbitalBlast();

            this.game.flashScreen('#ffffff');
            setTimeout(() => this.game.flashScreen('#ff00ff'), 100);

            this.game.screenShake.start(20, 500);

            this.powerUpIndicators.push({
                text: '💥 ORBITAL STRIKE ACTIVATED!',
                x: this.canvas.width / 2,
                y: this.canvas.height / 2 - 50,
                alpha: 1,
                scale: 2.5,
                life: 2
            });

            const beamX = this.canvas.width / 2;
            this.hyperLaserBeams.push({
                startX: beamX,
                startY: -50,
                endX: beamX,
                endY: this.canvas.height / 2,
                width: 80,
                alpha: 1.0,
                life: 0.8,
                maxLife: 0.8,
                color: '#ff00ff',
                coreColor: '#ffffff',
                outerColor: '#ff88ff',
                type: 'orbital'
            });

            const asteroidsToDestroy = [...this.asteroids];
            asteroidsToDestroy.forEach((asteroid, index) => {
                setTimeout(() => {
                    const asteroidIndex = this.asteroids.findIndex(a => a.id === asteroid.id);
                    if (asteroidIndex !== -1) {
                        this.asteroids.splice(asteroidIndex, 1);
                        this.asteroidsDestroyed++;
                        this.asteroidsDestroyedThisWave++;

                        this.particles.explosion(asteroid.x, asteroid.y, {
                            count: 25,
                            colors: ['#ff00ff', '#ff88ff', '#ffffff', '#ffcc00'],
                            speed: 250,
                            size: 10,
                            life: 0.8
                        });

                        this.particles.ring(asteroid.x, asteroid.y, {
                            count: 15,
                            color: '#ff00ff',
                            speed: 200
                        });

                        this.score += 50;
                        this.game.showScorePopup(asteroid.x, asteroid.y, 50);

                        // Check wave completion after each asteroid destroyed by orbital strike
                        this.checkWaveCompletion();
                    }
                }, index * 50);
            });

            setTimeout(() => {
                this.particles.ring(this.canvas.width / 2, this.canvas.height / 2, {
                    count: 60,
                    color: '#ff00ff',
                    speed: 500
                });
                AudioManager.playExplosion('large');
                strike.active = false;
            }, asteroidsToDestroy.length * 50 + 200);
        }
    }

    destroyAsteroid(asteroid) {
        // Track reaction time
        if (asteroid.spawnTime) {
            const reactionTime = Date.now() - asteroid.spawnTime;
            this.recentReactionTimes.push(reactionTime);
            if (this.recentReactionTimes.length > 20) this.recentReactionTimes.shift();
        }

        if (!this.typingStartTime) {
            this.typingStartTime = Date.now();
        }
        this.totalCharactersTyped++;

        this.aimCannon(asteroid);

        // Check weapon availability
        const laserReady = this.powerUps.laser.active && this.powerUps.laser.shotsRemaining > 0;
        const missileReady = this.powerUps.missile.ready && this.combo >= this.powerUps.missile.comboRequired;

        // Weapon selection based on preference (toggle via Shift)
        if (laserReady && missileReady) {
            // Both available - use preferred weapon
            if (this.preferredWeapon === 'missile') {
                this.fireMissile(asteroid);
            } else {
                // Default to laser if 'auto' or 'laser'
                this.fireHyperLaser(asteroid);
            }
        } else if (laserReady) {
            this.fireHyperLaser(asteroid);
        } else if (missileReady) {
            this.fireMissile(asteroid);
        } else {
            this.fireProjectile(asteroid);
            AudioManager.playLaser();
        }
    }

    fireHyperLaser(asteroid) {
        this.powerUps.laser.shotsRemaining--;

        const startX = this.cannon.x + Math.cos(this.cannon.targetAngle) * this.cannon.length;
        const startY = this.cannon.y + Math.sin(this.cannon.targetAngle) * this.cannon.length;
        const endX = asteroid.x;
        const endY = asteroid.y;

        this.hyperLaserBeams.push({
            startX: startX,
            startY: startY,
            endX: endX,
            endY: endY,
            width: 25,
            alpha: 1.0,
            life: 0.5,
            maxLife: 0.5,
            color: '#00ffff',
            coreColor: '#ffffff',
            outerColor: '#0088ff',
            pulsePhase: 0,
            type: 'main'
        });

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

        const distance = Utils.distance(startX, startY, endX, endY);
        const beamAngle = Math.atan2(endY - startY, endX - startX);
        const particleCount = Math.floor(distance / 12);

        for (let i = 0; i < particleCount; i++) {
            const t = i / particleCount;
            const px = startX + (endX - startX) * t;
            const py = startY + (endY - startY) * t;
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

        this.particles.explosion(startX, startY, {
            count: 25,
            colors: ['#00ffff', '#ffffff', '#00ff88', '#0088ff'],
            speed: 400,
            size: 15,
            life: 0.4
        });

        this.particles.explosion(endX, endY, {
            count: 30,
            colors: ['#00ffff', '#ffffff', '#ffff00'],
            speed: 350,
            size: 12,
            life: 0.5
        });

        this.particles.ring(endX, endY, {
            count: 20,
            color: '#00ffff',
            speed: 250
        });

        AudioManager.playHyperLaser();
        this.explodeAsteroid(asteroid);
        this.game.screenShake.start(10, 250);
        this.game.flashScreen('#00ffff');

        if (this.powerUps.laser.shotsRemaining <= 0) {
            this.powerUps.laser.active = false;
            this.powerUps.laser.ready = false;
        }
    }

    fireMissile(asteroid) {
        this.powerUps.missile.ready = false;

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

        this.particles.explosion(
            this.cannon.x,
            this.cannon.y,
            { count: 15, colors: ['#ff6600', '#ffcc00', '#ffffff'], speed: 150, size: 8 }
        );

        // Play the mega missile sound effect
        AudioManager.playMegaMissile();
    }

    aimCannon(target) {
        const speed = 800;
        const dx = target.x - this.cannon.x;
        const dy = target.y - this.cannon.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        const travelTime = distance / speed;

        const predictedY = target.y + (target.speed * travelTime);
        const predictedX = target.x;

        this.cannon.targetAngle = Math.atan2(predictedY - this.cannon.y, predictedX - this.cannon.x);
    }

    fireProjectile(target) {
        const speed = 800;
        const dx = target.x - this.cannon.x;
        const dy = target.y - this.cannon.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        const travelTime = distance / speed;

        const predictedY = target.y + (target.speed * travelTime);
        const predictedX = target.x;
        const leadAngle = Math.atan2(predictedY - this.cannon.y, predictedX - this.cannon.x);

        this.projectiles.push({
            x: this.cannon.x + Math.cos(this.cannon.targetAngle) * this.cannon.length,
            y: this.cannon.y + Math.sin(this.cannon.targetAngle) * this.cannon.length,
            vx: Math.cos(leadAngle) * speed,
            vy: Math.sin(leadAngle) * speed,
            targetId: target.id,
            target: target,
            color: '#00ffff',
            size: 8,
            trail: [],
            isMissile: false
        });

        this.particles.fire(
            this.cannon.x + Math.cos(this.cannon.targetAngle) * this.cannon.length,
            this.cannon.y + Math.sin(this.cannon.targetAngle) * this.cannon.length,
            this.cannon.targetAngle,
            { count: 8, speed: 200, colors: ['#00ffff', '#4488ff', '#ffffff'] }
        );
    }

    explodeAsteroid(asteroid) {
        const index = this.asteroids.findIndex(a => a.id === asteroid.id);
        if (index === -1) return;

        this.asteroids.splice(index, 1);
        this.asteroidsDestroyed++;
        this.asteroidsDestroyedThisWave++;

        AudioManager.playExplosion('medium');

        this.particles.explosion(asteroid.x, asteroid.y, {
            count: 40,
            colors: [asteroid.color, '#ffffff', '#ffd700', '#ff8c42'],
            speed: 350,
            size: 12,
            life: 1.2
        });

        this.particles.ring(asteroid.x, asteroid.y, {
            count: 20,
            color: asteroid.color,
            speed: 250
        });

        this.particles.starBurst(asteroid.x, asteroid.y, '#ffd700');
        this.game.showScorePopup(asteroid.x, asteroid.y, this.getScoreForCombo());
        this.game.screenShake.start(5, 150);

        // Check wave completion
        this.checkWaveCompletion();
    }

    explodeMissile(missile, targetAsteroid) {
        this.explodeAsteroid(targetAsteroid);

        const nearbyAsteroids = this.asteroids.filter(a => {
            const dist = Utils.distance(missile.x, missile.y, a.x, a.y);
            return dist <= missile.blastRadius && a.id !== targetAsteroid.id;
        });

        nearbyAsteroids.forEach(a => {
            this.explodeAsteroid(a);
            this.score += 50;
        });

        AudioManager.playExplosion('large');
        this.game.screenShake.start(15, 300);

        this.particles.ring(missile.x, missile.y, {
            count: 40,
            color: '#ff6600',
            speed: 400
        });

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

    // Check if wave is complete - triggers immediately when target is reached
    checkWaveCompletion() {
        // Don't check during transition
        if (this.isInWaveTransition) return;

        const target = this.waveTargets[this.currentWave] || this.waveTargets[10];

        if (this.asteroidsDestroyedThisWave >= target) {
            // Wave complete! Trigger immediately
            this.startWaveTransition();
        }
    }

    // Start wave transition
    startWaveTransition() {
        this.isInWaveTransition = true;
        this.waveTransitionTime = 3; // 3 seconds between waves

        // Clear ALL visual effects to prevent frozen animations
        this.hyperLaserBeams = [];
        this.projectiles = [];

        // Clear remaining asteroids gracefully
        this.asteroids.forEach(asteroid => {
            this.particles.explosion(asteroid.x, asteroid.y, {
                count: 15,
                colors: ['#44ff88', '#ffffff'],
                speed: 200,
                size: 8,
                life: 0.5
            });
        });
        this.asteroids = [];

        // Clear any existing notifications to prevent overlap
        this.powerUpIndicators = [];

        // Add wave bonus silently
        const waveBonus = this.currentWave * 200;
        this.score += waveBonus;

        // Show SINGLE combined wave complete message with star info
        let messageText = `✨ WAVE ${this.currentWave} COMPLETE! +${waveBonus} ✨`;
        let starText = '';

        if (this.currentWave === 3) {
            starText = '⭐ 1 STAR EARNED!';
        } else if (this.currentWave === 6) {
            starText = '⭐⭐ 2 STARS EARNED!';
        } else if (this.currentWave === 10) {
            starText = '⭐⭐⭐ 3 STARS! AMAZING!';
        }

        // Main wave complete message
        this.powerUpIndicators.push({
            text: messageText,
            x: this.canvas.width / 2,
            y: this.canvas.height / 2 - 30,
            alpha: 1,
            scale: 1.8,
            life: 2.5,
            fixed: true // Don't float up
        });

        // Star message (if applicable) - shown below with delay
        if (starText) {
            setTimeout(() => {
                this.powerUpIndicators.push({
                    text: starText,
                    x: this.canvas.width / 2,
                    y: this.canvas.height / 2 + 30,
                    alpha: 1,
                    scale: 1.6,
                    life: 2,
                    fixed: true
                });
            }, 500);
        }

        AudioManager.playLevelComplete();
        this.particles.confetti(0, 0, this.canvas.width, { count: 50 });
    }

    recordHit(correct, letter) {
        if (correct) {
            this.combo++;
            this.maxCombo = Math.max(this.maxCombo, this.combo);
            this.correctCount++;

            const baseScore = 100;
            const comboMultiplier = 1 + Math.floor(this.combo / 5) * 0.5;
            const scoreGained = Math.round(baseScore * comboMultiplier);
            this.score += scoreGained;

            if (this.combo > 1) {
                AudioManager.playCombo(this.combo);
            } else {
                AudioManager.playCorrect();
            }

            if (this.combo === 10) this.game.checkAchievement('combo_10');
            if (this.combo === 25) this.game.checkAchievement('combo_25');
            if (this.combo === 50) this.game.checkAchievement('combo_50');

            this.checkPowerUps();

            this.recentAccuracy.push(1);
            if (this.recentAccuracy.length > 20) this.recentAccuracy.shift();

            this.game.player.recordLetterPerformance(letter, true);
        }

        this.adaptDifficulty();
    }

    checkPowerUps() {
        // Missile: Show notification only ONCE when first ready
        if (this.combo >= this.powerUps.missile.comboRequired && !this.powerUps.missile.ready) {
            this.powerUps.missile.ready = true;
            // Only show notification if not shown before in this activation cycle
            if (!this.powerUps.missile.notificationShown) {
                this.powerUps.missile.notificationShown = true;
                this.showPowerUpNotification(this.powerUps.missile);
            }
        }

        // Hyper Laser: Show notification only ONCE when first activated
        if (this.combo >= this.powerUps.laser.comboRequired && !this.powerUps.laser.active && !this.powerUps.laser.ready) {
            this.powerUps.laser.ready = true;
            this.powerUps.laser.active = true;
            this.powerUps.laser.shotsRemaining = this.powerUps.laser.maxShots;
            this.powerUps.laser.activatedAt = Date.now();
            // Only show notification if not shown before in this activation cycle
            if (!this.powerUps.laser.notificationShown) {
                this.powerUps.laser.notificationShown = true;
                this.showPowerUpNotification(this.powerUps.laser);
            }
        }

        if (this.combo >= this.powerUps.orbitalStrike.comboRequired &&
            !this.powerUps.orbitalStrike.available &&
            !this.powerUps.orbitalStrike.active &&
            !this.powerUps.orbitalStrike.used) {
            this.powerUps.orbitalStrike.available = true;
            this.showOrbitalStrikeAvailableNotification();
        }
    }

    showPowerUpNotification(powerUp) {
        this.powerUpIndicators.push({
            text: `${powerUp.icon} ${powerUp.name} READY!`,
            x: this.canvas.width / 2,
            y: this.canvas.height / 2 - 50,
            alpha: 1,
            scale: 1.5,
            life: 2
        });

        AudioManager.playPowerUp();

        this.particles.ring(this.cannon.x, this.cannon.y, {
            count: 30,
            color: powerUp.color,
            speed: 300
        });
    }

    showOrbitalStrikeAvailableNotification() {
        this.powerUpIndicators.push({
            text: '💥 ORBITAL STRIKE READY! Press SPACE!',
            x: this.canvas.width / 2,
            y: this.canvas.height / 2 - 50,
            alpha: 1,
            scale: 1.8,
            life: 3
        });

        AudioManager.playPowerUp();

        this.particles.ring(this.cannon.x, this.cannon.y, {
            count: 50,
            color: '#ff00ff',
            speed: 400
        });

        this.game.flashScreen('#ff00ff');
    }

    recordMiss(letter) {
        this.combo = 0;
        this.wrongCount++;

        // Reset missile ready state AND notification flag so it can show again next time
        this.powerUps.missile.ready = false;
        this.powerUps.missile.notificationShown = false;

        // Reset laser notification flag when combo breaks (so it shows on next activation)
        this.powerUps.laser.notificationShown = false;

        AudioManager.playWrong();
        this.game.flashScreen('#ff4444');

        this.recentAccuracy.push(0);
        if (this.recentAccuracy.length > 20) this.recentAccuracy.shift();

        this.game.player.recordLetterPerformance(letter, false);

        this.adaptDifficulty();
    }

    // IMPROVED ADAPTIVE DIFFICULTY - SPEED WEIGHTED MORE THAN ACCURACY
    // Key principle: High accuracy + slow speed should NOT increase difficulty
    adaptDifficulty() {
        if (this.recentAccuracy.length < 10) return; // Need more samples

        const now = Date.now();
        if (now - this.lastDifficultyAdjust < 4000) return; // 4 seconds between adjustments (slower)
        this.lastDifficultyAdjust = now;

        // === CALCULATE ACCURACY SCORE (0-100) ===
        const recentAcc = this.recentAccuracy.reduce((a, b) => a + b, 0) / this.recentAccuracy.length;
        const accuracyScore = recentAcc * 100;

        // === CALCULATE SPEED SCORE (0-100) - MOST IMPORTANT ===
        let speedScore = 50;

        if (this.recentReactionTimes.length >= 5) {
            const avgReactionTime = this.recentReactionTimes.reduce((a, b) => a + b, 0) / this.recentReactionTimes.length;

            // VERY generous target times - designed for kids
            const targetReactionTimes = {
                'beginner': 6000,  // 6 seconds (very relaxed)
                'easy': 5000,      // 5 seconds
                'medium': 4000,    // 4 seconds
                'hard': 3000       // 3 seconds
            };
            const targetTime = targetReactionTimes[this.difficulty] || 5000;

            // Linear scoring - reaching target = 70, twice as fast = 100
            const ratio = targetTime / Math.max(avgReactionTime, 500);
            speedScore = Math.max(0, Math.min(100, ratio * 70));
        }

        // === CALCULATE WPM SCORE (0-100) ===
        let wpmScore = 50;
        if (this.typingStartTime && this.totalCharactersTyped > 5) {
            const elapsedMinutes = (now - this.typingStartTime) / 60000;
            if (elapsedMinutes > 0.1) {
                const currentWpm = (this.totalCharactersTyped / 5) / elapsedMinutes;

                // Very low WPM targets for kids
                const targetWpms = {
                    'beginner': 8,   // Very low
                    'easy': 12,
                    'medium': 20,
                    'hard': 35
                };
                const targetWpm = targetWpms[this.difficulty] || 12;

                wpmScore = Math.max(0, Math.min(100, (currentWpm / targetWpm) * 70));
            }
        }

        // === COMBINED SCORE - SPEED WEIGHTED MOST (55%) ===
        // Speed: 55%, Accuracy: 25%, WPM: 20%
        // This ensures slow typists don't get punished even with high accuracy
        const combinedScore = (speedScore * 0.55) + (accuracyScore * 0.25) + (wpmScore * 0.20);

        // === ADAPTIVE ADJUSTMENT - VERY FORGIVING ===
        // Key: Only increase difficulty when BOTH speed AND accuracy are excellent
        if (combinedScore >= 85 && speedScore >= 75 && accuracyScore >= 85) {
            // Only increase if doing EXCEPTIONALLY well at BOTH speed and accuracy
            this.adaptiveMultiplier = Math.min(1.25, this.adaptiveMultiplier + 0.015);
        } else if (speedScore < 30) {
            // Speed is the limiting factor - decrease significantly
            this.adaptiveMultiplier = Math.max(0.5, this.adaptiveMultiplier - 0.06);
        } else if (combinedScore < 40) {
            // Really struggling overall - decrease significantly
            this.adaptiveMultiplier = Math.max(0.5, this.adaptiveMultiplier - 0.05);
        } else if (speedScore < 45 || combinedScore < 55) {
            // Below average speed or overall - decrease
            this.adaptiveMultiplier = Math.max(0.6, this.adaptiveMultiplier - 0.025);
        }
        // Otherwise maintain current difficulty (no change)
        // This prevents the "slow but accurate" player from getting harder difficulty
    }

    getScoreForCombo() {
        const baseScore = 100;
        const comboMultiplier = 1 + Math.floor(this.combo / 5) * 0.5;
        return Math.round(baseScore * comboMultiplier);
    }

    asteroidReachedEarth(asteroid) {
        const damage = 15; // Reduced from 20
        this.earthHealth = Math.max(0, this.earthHealth - damage);

        this.combo = 0;
        this.powerUps.missile.ready = false;

        AudioManager.playExplosion('large');
        this.game.screenShake.start(15, 400);

        this.particles.explosion(asteroid.x, asteroid.y, {
            count: 50,
            colors: ['#ff4444', '#ff8844', '#ffcc00'],
            speed: 400,
            size: 15,
            life: 1.5
        });

        this.game.flashScreen('#ff0000');

        const index = this.asteroids.findIndex(a => a.id === asteroid.id);
        if (index !== -1) {
            this.asteroids.splice(index, 1);
        }

        if (this.earthHealth <= 0) {
            this.gameOver(false);
        } else if (this.earthHealth <= 30) {
            AudioManager.playWarning();
        }
    }

    update(dt, currentTime) {
        if (this.state !== 'playing') return;

        this.timeElapsed += dt;
        this.waveTimeElapsed += dt;

        // === EARTH HEALTH REGENERATION (when combo > 0) ===
        if (this.combo > 0 && this.earthHealth < this.maxEarthHealth) {
            // Regenerate 2 HP per second while maintaining a combo
            this.earthHealth = Math.min(this.maxEarthHealth, this.earthHealth + 2 * dt);
        }

        // === UPDATE GUN OVERHEAT COOLDOWN ===
        if (this.gunOverheat.isOverheated) {
            this.gunOverheat.cooldownTimer -= dt;
            if (this.gunOverheat.cooldownTimer <= 0) {
                // Cooldown complete - gun ready again
                this.gunOverheat.isOverheated = false;
                this.gunOverheat.cooldownTimer = 0;
                this.cannon.overheatedGlow = false;

                // Recovery notification
                this.powerUpIndicators.push({
                    text: '✅ GUN COOLED DOWN!',
                    x: this.canvas.width / 2,
                    y: this.canvas.height / 2 - 50,
                    alpha: 1,
                    scale: 1.5,
                    life: 1.5,
                    color: '#44ff88'
                });
            }
        }

        // Handle wave transition
        if (this.isInWaveTransition) {
            this.waveTransitionTime -= dt;
            if (this.waveTransitionTime <= 0) {
                // Start next wave
                this.currentWave++;
                this.asteroidsDestroyedThisWave = 0;
                this.waveTimeElapsed = 0;
                this.isInWaveTransition = false;
                this.spawnInterval = this.getWaveSpawnRate();
                this.showWaveStart();
            }
            return; // Don't spawn or update asteroids during transition
        }

        // Update power-up timers
        if (this.powerUps.laser.active) {
            const elapsed = currentTime - this.powerUps.laser.activatedAt;
            if (elapsed >= this.powerUps.laser.duration || this.powerUps.laser.shotsRemaining <= 0) {
                this.powerUps.laser.active = false;
                this.powerUps.laser.ready = false;
            }
        }

        if (this.powerUps.orbitalStrike.available && !this.powerUps.orbitalStrike.active) {
            this.powerUps.orbitalStrike.pulsePhase += dt * 4;
        }

        // Update hyper laser beams
        for (let i = this.hyperLaserBeams.length - 1; i >= 0; i--) {
            const beam = this.hyperLaserBeams[i];
            beam.life -= dt;
            beam.alpha = beam.life / beam.maxLife;
            beam.width = 20 * (beam.life / beam.maxLife) + 5;

            if (beam.life <= 0) {
                this.hyperLaserBeams.splice(i, 1);
            }
        }

        // Update power-up indicators
        for (let i = this.powerUpIndicators.length - 1; i >= 0; i--) {
            const indicator = this.powerUpIndicators[i];
            // Only float up if not marked as fixed
            if (!indicator.fixed) {
                indicator.y -= 30 * dt;
                indicator.scale = 1 + (1 - indicator.life / 2) * 0.5;
            }
            indicator.life -= dt;
            indicator.alpha = Math.min(1, indicator.life / 1.5); // Fade out in last 1.5s

            if (indicator.life <= 0) {
                this.powerUpIndicators.splice(i, 1);
            }
        }

        // Spawn asteroids based on wave
        if (currentTime - this.lastSpawn > this.spawnInterval) {
            this.spawnAsteroid();
            this.lastSpawn = currentTime;
        }

        // Update cannon rotation
        const angleDiff = this.cannon.targetAngle - this.cannon.angle;
        this.cannon.angle += angleDiff * 10 * dt;

        // Update asteroids
        for (let i = this.asteroids.length - 1; i >= 0; i--) {
            const asteroid = this.asteroids[i];

            asteroid.trail.push({ x: asteroid.x, y: asteroid.y });
            if (asteroid.trail.length > 10) asteroid.trail.shift();

            asteroid.y += asteroid.speed * dt;
            asteroid.rotation += asteroid.rotationSpeed * dt;
            asteroid.glowIntensity = 0.7 + 0.3 * Math.sin(currentTime / 200 + asteroid.id);

            if (asteroid.y > this.cannon.y + 30) {
                this.asteroidReachedEarth(asteroid);
            }
        }

        // Update projectiles
        for (let i = this.projectiles.length - 1; i >= 0; i--) {
            const proj = this.projectiles[i];

            proj.trail.push({ x: proj.x, y: proj.y });
            if (proj.trail.length > 15) proj.trail.shift();

            proj.x += proj.vx * dt;
            proj.y += proj.vy * dt;

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

            let shouldRemove = false;
            if (proj.target) {
                const targetDist = Utils.distance(proj.x, proj.y, proj.target.x, proj.target.y);
                if (targetDist < proj.target.size + 10) {
                    if (proj.isMissile) {
                        this.explodeMissile(proj, proj.target);
                    } else {
                        this.explodeAsteroid(proj.target);
                    }
                    shouldRemove = true;
                }
            }

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

        // Calculate stars based on waves completed
        const accuracy = this.correctCount / Math.max(this.correctCount + this.wrongCount, 1);
        let stars = 0;

        // Wave-based star system (more forgiving)
        if (this.currentWave >= 10) {
            stars = 3;
        } else if (this.currentWave >= 6) {
            stars = 2;
        } else if (this.currentWave >= 3) {
            stars = 1;
        }

        // Player can always get at least 1 star if they complete 3 waves (even if Earth destroyed after)
        if (stars > 0) {
            victory = true; // Override to victory if they earned stars
            this.state = 'victory';
        }

        if (victory) {
            AudioManager.playLevelComplete();
            this.particles.confetti(0, 0, this.canvas.width, { count: 100 });
        } else {
            AudioManager.playGameOver();
        }

        // ONLY update player level if they won
        if (victory) {
            const wpm = (this.correctCount / Math.max(this.timeElapsed / 60, 1)) * 5;
            this.game.player.updateSkill(accuracy, wpm, this.correctCount + this.wrongCount);
        }

        this.game.player.recordGameCompletion(
            this.id,
            this.score,
            stars,
            this.timeElapsed,
            victory
        );

        // Show result screen with wave info
        setTimeout(() => {
            this.game.showResultScreen({
                victory: victory,
                score: this.score,
                stars: stars,
                accuracy: Math.round(accuracy * 100),
                maxCombo: this.maxCombo,
                asteroidsDestroyed: this.asteroidsDestroyed,
                earthHealth: Math.round(this.earthHealth),
                timeElapsed: this.timeElapsed,
                wavesCompleted: this.currentWave - (this.isInWaveTransition ? 0 : 1)
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

        // Draw Earth surface
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

        ctx.beginPath();
        ctx.arc(this.earth.x, this.earth.y + 170, this.earth.radius + 10, Math.PI, 0, true);
        ctx.strokeStyle = 'rgba(100, 200, 255, 0.5)';
        ctx.lineWidth = 5;
        ctx.stroke();
        ctx.restore();

        // Draw hyper laser beams
        this.hyperLaserBeams.forEach(beam => {
            ctx.save();

            const isMain = beam.type === 'main';
            const pulseIntensity = isMain ? (0.8 + 0.2 * Math.sin(Date.now() / 30)) : 1;

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

            ctx.globalAlpha = beam.alpha * 0.5 * pulseIntensity;
            ctx.strokeStyle = beam.color;
            ctx.lineWidth = beam.width * 1.8;
            ctx.shadowBlur = 30;
            ctx.beginPath();
            ctx.moveTo(beam.startX, beam.startY);
            ctx.lineTo(beam.endX, beam.endY);
            ctx.stroke();

            ctx.globalAlpha = beam.alpha * 0.9 * pulseIntensity;
            ctx.strokeStyle = beam.color;
            ctx.lineWidth = beam.width;
            ctx.shadowBlur = 20;
            ctx.beginPath();
            ctx.moveTo(beam.startX, beam.startY);
            ctx.lineTo(beam.endX, beam.endY);
            ctx.stroke();

            ctx.globalAlpha = beam.alpha * pulseIntensity;
            ctx.strokeStyle = beam.coreColor;
            ctx.lineWidth = beam.width * 0.35;
            ctx.shadowColor = '#ffffff';
            ctx.shadowBlur = 10;
            ctx.beginPath();
            ctx.moveTo(beam.startX, beam.startY);
            ctx.lineTo(beam.endX, beam.endY);
            ctx.stroke();

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

            ctx.save();
            ctx.rotate(asteroid.rotation);

            const glowGradient = ctx.createRadialGradient(0, 0, asteroid.size * 0.5, 0, 0, asteroid.size * 1.5);
            glowGradient.addColorStop(0, asteroid.color);
            glowGradient.addColorStop(0.5, `${asteroid.color}88`);
            glowGradient.addColorStop(1, 'transparent');
            ctx.fillStyle = glowGradient;
            ctx.globalAlpha = asteroid.glowIntensity;
            ctx.beginPath();
            ctx.arc(0, 0, asteroid.size * 1.5, 0, Math.PI * 2);
            ctx.fill();

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

            ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
            ctx.beginPath();
            ctx.arc(asteroid.size * 0.2, -asteroid.size * 0.2, asteroid.size * 0.2, 0, Math.PI * 2);
            ctx.fill();
            ctx.beginPath();
            ctx.arc(-asteroid.size * 0.3, asteroid.size * 0.15, asteroid.size * 0.15, 0, Math.PI * 2);
            ctx.fill();

            ctx.restore();

            // Draw letter WITHOUT rotation
            const fontSize = Math.round(asteroid.size * 1.1);
            ctx.font = `bold ${fontSize}px "Arial Black", Impact, "Helvetica Neue", Arial, sans-serif`;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';

            ctx.strokeStyle = '#000000';
            ctx.lineWidth = 5;
            ctx.strokeText(asteroid.letter, 0, 0);

            ctx.fillStyle = '#ffffff';
            ctx.fillText(asteroid.letter, 0, 0);

            ctx.restore();
        });

        // Draw cannon base
        ctx.save();
        ctx.translate(this.cannon.x, this.cannon.y);

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

        ctx.fillStyle = '#3a4a6a';
        ctx.beginPath();
        ctx.arc(0, 0, 25, 0, Math.PI * 2);
        ctx.fill();

        ctx.restore();

        // Draw cannon barrel
        ctx.save();
        ctx.translate(this.cannon.x, this.cannon.y);
        ctx.rotate(this.cannon.angle);

        let barrelColor = this.cannon.color;
        let barrelGlowColor = this.cannon.glowColor;

        // Overheat visual effect - red pulsing glow
        if (this.gunOverheat.isOverheated) {
            const pulseIntensity = 0.5 + 0.5 * Math.sin(Date.now() * 0.01);
            barrelColor = `rgb(255, ${Math.floor(50 * pulseIntensity)}, 0)`;
            barrelGlowColor = '#ff4400';
        } else if (this.powerUps.laser.active) {
            barrelColor = '#00ffff';
            barrelGlowColor = '#ffffff';
        } else if (this.powerUps.missile.ready) {
            barrelColor = '#ff6600';
            barrelGlowColor = '#ffcc00';
        }

        const barrelGlow = ctx.createLinearGradient(0, 0, this.cannon.length, 0);
        barrelGlow.addColorStop(0, barrelColor);
        barrelGlow.addColorStop(1, barrelGlowColor);

        ctx.fillStyle = barrelGlow;
        ctx.beginPath();
        ctx.moveTo(0, -this.cannon.width / 2);
        ctx.lineTo(this.cannon.length, -this.cannon.width / 3);
        ctx.lineTo(this.cannon.length + 10, 0);
        ctx.lineTo(this.cannon.length, this.cannon.width / 3);
        ctx.lineTo(0, this.cannon.width / 2);
        ctx.closePath();
        ctx.fill();

        ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(5, -this.cannon.width / 2 + 3);
        ctx.lineTo(this.cannon.length - 5, -this.cannon.width / 3 + 2);
        ctx.stroke();

        ctx.restore();

        // === DRAW OVERHEAT COOLDOWN BAR ===
        if (this.gunOverheat.isOverheated) {
            const barWidth = 150;
            const barHeight = 20;
            const barX = this.cannon.x - barWidth / 2;
            const barY = this.cannon.y - 80;
            const progress = this.gunOverheat.cooldownTimer / this.gunOverheat.cooldownDuration;

            // Background
            ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
            ctx.beginPath();
            ctx.roundRect(barX - 2, barY - 2, barWidth + 4, barHeight + 4, 6);
            ctx.fill();

            // Empty bar
            ctx.fillStyle = 'rgba(100, 100, 100, 0.5)';
            ctx.beginPath();
            ctx.roundRect(barX, barY, barWidth, barHeight, 4);
            ctx.fill();

            // Cooldown progress (draining)
            const gradient = ctx.createLinearGradient(barX, barY, barX + barWidth, barY);
            gradient.addColorStop(0, '#ff4400');
            gradient.addColorStop(1, '#ff8800');
            ctx.fillStyle = gradient;
            ctx.beginPath();
            ctx.roundRect(barX, barY, barWidth * progress, barHeight, 4);
            ctx.fill();

            // Timer text
            ctx.font = 'bold 14px "Orbitron", sans-serif';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillStyle = '#ffffff';
            ctx.shadowColor = '#ff4400';
            ctx.shadowBlur = 10;
            ctx.fillText(`🔥 ${this.gunOverheat.cooldownTimer.toFixed(1)}s`, this.cannon.x, barY + barHeight / 2);
            ctx.shadowBlur = 0;
        }

        // Draw UI elements
        this.drawHealthBar(ctx);
        this.drawWaveInfo(ctx);
        this.drawPowerUpStatus(ctx);

        if (this.powerUps.orbitalStrike.available && !this.powerUps.orbitalStrike.active) {
            this.drawOrbitalStrikeAvailableIndicator(ctx);
        }

        // Draw floating notifications
        this.powerUpIndicators.forEach(indicator => {
            ctx.save();
            ctx.globalAlpha = indicator.alpha;
            ctx.font = `bold ${24 * indicator.scale}px "Orbitron", sans-serif`;
            ctx.textAlign = 'center';
            // Support custom colors for overheat/recovery messages
            const color = indicator.color || '#ffd700';
            ctx.fillStyle = color;
            ctx.shadowColor = color;
            ctx.shadowBlur = 20;
            ctx.fillText(indicator.text, indicator.x, indicator.y);
            ctx.restore();
        });

        // Draw current word progress
        if (this.useWordMode && this.currentWord) {
            this.drawWordProgress(ctx);
        }
    }

    // Draw wave info instead of timer
    drawWaveInfo(ctx) {
        const target = this.waveTargets[this.currentWave] || this.waveTargets[10];
        const progress = this.asteroidsDestroyedThisWave;

        ctx.save();

        // Wave number
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 24px "Orbitron", sans-serif';
        ctx.textAlign = 'center';
        ctx.shadowColor = '#000000';
        ctx.shadowBlur = 10;
        ctx.fillText(`WAVE ${this.currentWave}`, this.canvas.width / 2, 45);

        // Progress
        ctx.font = '18px "Exo 2", sans-serif';
        const progressColor = progress >= target ? '#44ff88' : '#ffffff';
        ctx.fillStyle = progressColor;
        ctx.fillText(`${progress} / ${target}`, this.canvas.width / 2, 75);

        // Progress bar
        const barWidth = 150;
        const barHeight = 8;
        const barX = (this.canvas.width - barWidth) / 2;
        const barY = 85;

        ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
        ctx.fillRect(barX, barY, barWidth, barHeight);

        const progressPercent = Math.min(progress / target, 1);
        const progressGradient = ctx.createLinearGradient(barX, barY, barX + barWidth * progressPercent, barY);
        progressGradient.addColorStop(0, '#4488ff');
        progressGradient.addColorStop(1, '#44ff88');
        ctx.fillStyle = progressGradient;
        ctx.fillRect(barX, barY, barWidth * progressPercent, barHeight);

        ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
        ctx.lineWidth = 1;
        ctx.strokeRect(barX, barY, barWidth, barHeight);

        ctx.restore();
    }

    drawOrbitalStrikeAvailableIndicator(ctx) {
        const pulse = 0.5 + 0.5 * Math.sin(this.powerUps.orbitalStrike.pulsePhase);

        ctx.save();

        const x = this.canvas.width / 2;
        const y = this.canvas.height - 120;

        ctx.globalAlpha = 0.9;
        ctx.fillStyle = `rgba(255, 0, 255, ${0.2 + pulse * 0.3})`;
        ctx.strokeStyle = '#ff00ff';
        ctx.lineWidth = 3 + pulse * 3;
        ctx.shadowColor = '#ff00ff';
        ctx.shadowBlur = 20 + pulse * 20;

        // Wider box to fit the text properly
        const width = 380;
        const height = 50;
        ctx.beginPath();
        ctx.roundRect(x - width / 2, y - height / 2, width, height, 12);
        ctx.fill();
        ctx.stroke();

        ctx.globalAlpha = 1;
        ctx.fillStyle = '#ffffff';
        // Slightly smaller font to fit better
        ctx.font = 'bold 16px "Orbitron", sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.shadowColor = '#ff00ff';
        ctx.shadowBlur = 15 + pulse * 15;
        ctx.fillText('💥 PRESS SPACE FOR ORBITAL STRIKE! 💥', x, y);

        ctx.restore();
    }

    drawWordProgress(ctx) {
        const centerX = this.canvas.width / 2;
        const y = this.canvas.height - 175;

        ctx.save();
        ctx.font = 'bold 16px "Exo 2", sans-serif';
        ctx.textAlign = 'center';
        ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
        ctx.fillText('WORD:', centerX - 80, y);

        let x = centerX - 40;
        for (let i = 0; i < this.currentWord.length; i++) {
            const letter = this.currentWord[i];
            if (i < this.typedLetterCount) {
                ctx.fillStyle = '#44ff88';
                ctx.shadowBlur = 0;
            } else if (i === this.typedLetterCount) {
                ctx.fillStyle = '#ffd700';
                ctx.shadowColor = '#ffd700';
                ctx.shadowBlur = 10;
            } else {
                ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
                ctx.shadowBlur = 0;
            }
            ctx.font = i === this.typedLetterCount ? 'bold 22px "Arial Black", sans-serif' : 'bold 18px "Exo 2", sans-serif';
            ctx.fillText(letter, x, y);
            x += 25;
            ctx.shadowBlur = 0;
        }

        ctx.restore();
    }

    drawPowerUpStatus(ctx) {
        const startX = 20;
        const y = 110;
        const boxWidth = 175; // Wider boxes to fit text
        const boxHeight = 32;
        let offsetY = 0;

        ctx.save();

        const missile = this.powerUps.missile;
        if (missile.ready || this.combo >= missile.comboRequired * 0.5) {
            ctx.globalAlpha = missile.ready ? 1 : 0.4;
            ctx.fillStyle = missile.ready ? missile.color + '44' : 'rgba(0, 0, 0, 0.5)';
            ctx.fillRect(startX, y + offsetY, boxWidth, boxHeight);
            ctx.strokeStyle = missile.ready ? missile.color : '#666';
            ctx.lineWidth = 2;
            ctx.strokeRect(startX, y + offsetY, boxWidth, boxHeight);
            ctx.font = '13px "Exo 2", sans-serif';
            ctx.fillStyle = missile.ready ? '#ffffff' : '#888';
            ctx.textAlign = 'left';
            ctx.fillText(`${missile.icon} ${missile.name}`, startX + 8, y + offsetY + 21);
            ctx.textAlign = 'right';
            ctx.fillStyle = missile.ready ? '#44ff88' : '#888';
            ctx.fillText(missile.ready ? 'READY' : `${this.combo}/${missile.comboRequired}`, startX + boxWidth - 8, y + offsetY + 21);
            offsetY += boxHeight + 5;
        }

        const laser = this.powerUps.laser;
        if (laser.active || laser.ready || this.combo >= laser.comboRequired * 0.5) {
            ctx.globalAlpha = laser.active ? 1 : 0.4;
            ctx.fillStyle = laser.active ? laser.color + '44' : 'rgba(0, 0, 0, 0.5)';
            ctx.fillRect(startX, y + offsetY, boxWidth, boxHeight);
            ctx.strokeStyle = laser.active ? laser.color : '#666';
            ctx.lineWidth = 2;
            ctx.strokeRect(startX, y + offsetY, boxWidth, boxHeight);
            ctx.font = '13px "Exo 2", sans-serif';
            ctx.fillStyle = laser.active ? '#ffffff' : '#888';
            ctx.textAlign = 'left';
            ctx.fillText(`${laser.icon} ${laser.name}`, startX + 8, y + offsetY + 21);
            ctx.textAlign = 'right';
            if (laser.active) {
                ctx.fillStyle = '#00ffff';
                ctx.fillText(`${laser.shotsRemaining} shots`, startX + boxWidth - 8, y + offsetY + 21);
            } else {
                ctx.fillStyle = '#888';
                ctx.fillText(`${this.combo}/${laser.comboRequired}`, startX + boxWidth - 8, y + offsetY + 21);
            }
            offsetY += boxHeight + 5;
        }

        const strike = this.powerUps.orbitalStrike;
        if (!strike.used || strike.available) {
            const showProgress = this.combo >= strike.comboRequired * 0.3 || strike.available;
            if (showProgress) {
                ctx.globalAlpha = strike.available ? 1 : 0.4;
                ctx.fillStyle = strike.available ? strike.color + '44' : 'rgba(0, 0, 0, 0.5)';
                ctx.fillRect(startX, y + offsetY, boxWidth, boxHeight);
                ctx.strokeStyle = strike.available ? strike.color : '#666';
                ctx.lineWidth = 2;
                ctx.strokeRect(startX, y + offsetY, boxWidth, boxHeight);
                ctx.font = '13px "Exo 2", sans-serif';
                ctx.fillStyle = strike.available ? '#ffffff' : '#888';
                ctx.textAlign = 'left';
                ctx.fillText(`${strike.icon} ${strike.name}`, startX + 8, y + offsetY + 21);
                ctx.textAlign = 'right';
                if (strike.available) {
                    ctx.fillStyle = '#ff00ff';
                    ctx.fillText('SPACE', startX + boxWidth - 8, y + offsetY + 21);
                } else if (!strike.used) {
                    ctx.fillStyle = '#888';
                    ctx.fillText(`${this.combo}/${strike.comboRequired}`, startX + boxWidth - 8, y + offsetY + 21);
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

        ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
        ctx.fillRect(x - 2, y - 2, barWidth + 4, barHeight + 4);

        ctx.fillStyle = 'rgba(255, 255, 255, 0.1)';
        ctx.fillRect(x, y, barWidth, barHeight);

        const healthPercent = this.earthHealth / this.maxEarthHealth;
        const healthColor = healthPercent > 0.6 ? '#44ff88' :
            healthPercent > 0.3 ? '#ffcc00' : '#ff4444';

        const healthGradient = ctx.createLinearGradient(x, y, x + barWidth * healthPercent, y);
        healthGradient.addColorStop(0, healthColor);
        healthGradient.addColorStop(1, '#ffffff');

        ctx.fillStyle = healthGradient;
        ctx.fillRect(x, y, barWidth * healthPercent, barHeight);

        ctx.strokeStyle = 'rgba(100, 150, 255, 0.5)';
        ctx.lineWidth = 2;
        ctx.strokeRect(x, y, barWidth, barHeight);

        // Show regen indicator when combo > 0
        const label = this.combo > 0 ? 'EARTH SHIELD (HEALING)' : 'EARTH SHIELD';
        ctx.fillStyle = this.combo > 0 ? '#44ff88' : '#ffffff';
        ctx.font = '12px "Orbitron", sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(label, this.canvas.width / 2, y - 8);
    }

    getHUD() {
        return {
            score: this.score,
            combo: this.combo,
            accuracy: this.correctCount / Math.max(this.correctCount + this.wrongCount, 1),
            earthHealth: this.earthHealth,
            maxEarthHealth: this.maxEarthHealth,
            wave: this.currentWave
        };
    }
}

// Export
window.AsteroidDefenseLevel = AsteroidDefenseLevel;
