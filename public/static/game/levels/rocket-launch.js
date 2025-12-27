// ============================================
// COSMIC TYPER - Level 2: Rocket Launch
// Type letters to fuel your rocket and reach the moon!
// ============================================

class RocketLaunchLevel {
    constructor(game) {
        this.game = game;
        this.canvas = game.gameCanvas;
        this.ctx = game.gameCtx;
        this.particles = game.particles;
        
        // Level info
        this.id = 'rocket-launch';
        this.name = 'Rocket Launch';
        this.description = 'Type letters to fuel your rocket! Reach the moon before time runs out!';
        this.icon = '🚀';
        
        // Game state
        this.state = 'ready';
        this.score = 0;
        this.combo = 0;
        this.maxCombo = 0;
        this.correctCount = 0;
        this.wrongCount = 0;
        this.timeElapsed = 0;
        this.levelDuration = 60;
        
        // Rocket state with improved physics
        this.rocket = {
            x: 0,
            y: 0,
            targetY: 0,
            width: 60,
            height: 120,
            fuel: 0,
            maxFuel: 100,
            altitude: 0,
            targetAltitude: 1500, // Distance to moon (increased from 1000)
            velocity: 0,
            maxVelocity: 500,
            shake: 0,
            tilt: 0,
            launched: false,
            enginePower: 0,
            // New physics properties
            gravity: 50, // Gravity pulls rocket down when no fuel
            minVelocity: -150, // Terminal falling velocity (negative = falling)
            isFalling: false
        };
        
        // Word-based typing (uses dictionary)
        this.useWordMode = true;
        this.currentWord = null;
        this.currentWordIndex = 0;
        this.wordQueue = [];
        
        // Current letter to type
        this.currentLetter = '';
        this.nextLetters = [];
        this.lettersQueue = 5;
        
        // Difficulty settings
        this.difficulty = game.player.getDifficulty();
        this.letters = Utils.getLettersByDifficulty(this.difficulty);
        
        // Visual elements
        this.stars = [];
        this.clouds = [];
        this.moon = null;
        this.launchPad = null;
        
        // Stages of the journey
        this.stage = 'launchpad'; // launchpad, atmosphere, space, moon
        this.stageProgress = 0;
        
        // Boost meter
        this.boostMeter = 0;
        this.boostActive = false;
        
        // Adaptive difficulty
        this.letterTimer = 0;
        this.letterTimeout = this.getLetterTimeout();
        
        // Danger indicators
        this.warningFlash = 0;
        this.criticalAltitude = false;
    }
    
    getLetterTimeout() {
        const timeouts = {
            'beginner': 4000,
            'easy': 3000,
            'medium': 2500,
            'hard': 2000
        };
        return timeouts[this.difficulty] || 3000;
    }
    
    init() {
        // Position rocket at bottom center
        this.rocket.x = this.canvas.width / 2;
        this.rocket.y = this.canvas.height - 200;
        this.rocket.targetY = this.rocket.y;
        
        // Reset state
        this.score = 0;
        this.combo = 0;
        this.maxCombo = 0;
        this.correctCount = 0;
        this.wrongCount = 0;
        this.timeElapsed = 0;
        this.rocket.fuel = 50; // Start with half fuel
        this.rocket.altitude = 0;
        this.rocket.velocity = 0;
        this.rocket.launched = false;
        this.rocket.enginePower = 0;
        this.rocket.shake = 0;
        this.rocket.tilt = 0;
        this.rocket.isFalling = false;
        this.boostMeter = 0;
        this.boostActive = false;
        this.stage = 'launchpad';
        this.stageProgress = 0;
        this.warningFlash = 0;
        this.criticalAltitude = false;
        
        // Initialize word mode if available
        if (this.useWordMode && window.WordDictionary) {
            this.wordQueue = WordDictionary.getThemedWords('space', this.difficulty);
            if (this.wordQueue.length === 0) {
                this.wordQueue = WordDictionary.getRandomWords(20, this.difficulty);
            }
            this.currentWord = this.wordQueue.shift();
            this.currentWordIndex = 0;
            this.currentLetter = this.currentWord ? this.currentWord[0] : this.getRandomLetter();
        } else {
            // Fallback to random letters
            this.nextLetters = [];
            for (let i = 0; i < this.lettersQueue; i++) {
                this.nextLetters.push(this.getRandomLetter());
            }
            this.currentLetter = this.nextLetters.shift();
            this.nextLetters.push(this.getRandomLetter());
        }
        
        // Initialize visual elements
        this.initStars();
        this.initClouds();
        
        // Moon position
        this.moon = {
            x: this.canvas.width / 2,
            y: -200,
            radius: 80,
            visible: false
        };
        
        // Launch pad
        this.launchPad = {
            x: this.canvas.width / 2,
            y: this.canvas.height - 100,
            width: 120,
            height: 40
        };
        
        this.letterTimer = Date.now();
    }
    
    initStars() {
        this.stars = [];
        for (let i = 0; i < 100; i++) {
            this.stars.push({
                x: Math.random() * this.canvas.width,
                y: Math.random() * this.canvas.height,
                size: Math.random() * 2 + 0.5,
                twinkle: Math.random() * Math.PI * 2,
                speed: Math.random() * 0.5 + 0.5
            });
        }
    }
    
    initClouds() {
        this.clouds = [];
        for (let i = 0; i < 8; i++) {
            this.clouds.push({
                x: Math.random() * this.canvas.width,
                y: this.canvas.height * 0.3 + Math.random() * this.canvas.height * 0.4,
                width: Math.random() * 200 + 100,
                height: Math.random() * 60 + 40,
                speed: Math.random() * 20 + 10,
                opacity: Math.random() * 0.3 + 0.1
            });
        }
    }
    
    getRandomLetter() {
        // Occasionally use weak letters
        const weakLetters = this.game.player.getWeakestLetters(3);
        if (weakLetters.length > 0 && Math.random() < 0.3) {
            return Utils.randomChoice(weakLetters);
        }
        return Utils.randomChoice(this.letters);
    }
    
    getNextLetter() {
        if (this.useWordMode && this.currentWord && window.WordDictionary) {
            this.currentWordIndex++;
            if (this.currentWordIndex >= this.currentWord.length) {
                // Move to next word
                this.currentWord = this.wordQueue.shift();
                if (!this.currentWord) {
                    // Refill word queue
                    this.wordQueue = WordDictionary.getThemedWords('space', this.difficulty);
                    if (this.wordQueue.length === 0) {
                        this.wordQueue = WordDictionary.getRandomWords(20, this.difficulty);
                    }
                    this.currentWord = this.wordQueue.shift();
                }
                this.currentWordIndex = 0;
            }
            return this.currentWord ? this.currentWord[this.currentWordIndex] : this.getRandomLetter();
        }
        return this.getRandomLetter();
    }
    
    start() {
        this.state = 'playing';
        this.init();
    }
    
    pause() {
        this.state = 'paused';
    }
    
    resume() {
        this.state = 'playing';
    }
    
    handleKeyPress(key) {
        if (this.state !== 'playing') return;
        
        const pressedLetter = key.toUpperCase();
        const expectedLetter = this.useWordMode && this.currentWord 
            ? this.currentWord[this.currentWordIndex]
            : this.currentLetter;
        
        if (pressedLetter === expectedLetter) {
            this.correctKeyPress();
        } else {
            this.wrongKeyPress(pressedLetter);
        }
    }
    
    correctKeyPress() {
        this.combo++;
        this.maxCombo = Math.max(this.maxCombo, this.combo);
        this.correctCount++;
        
        // Add fuel (more fuel at higher combos)
        const fuelGain = 10 + Math.floor(this.combo / 3) * 2;
        this.rocket.fuel = Math.min(this.rocket.maxFuel, this.rocket.fuel + fuelGain);
        
        // Clear falling state when fuel is added
        this.rocket.isFalling = false;
        
        // Calculate score
        const baseScore = 100;
        const comboMultiplier = 1 + Math.floor(this.combo / 5) * 0.5;
        const scoreGained = Math.round(baseScore * comboMultiplier);
        this.score += scoreGained;
        
        // Play sound
        if (this.combo > 1) {
            AudioManager.playCombo(this.combo);
        } else {
            AudioManager.playCorrect();
        }
        
        // Rocket boost effect
        this.rocket.enginePower = Math.min(1, this.rocket.enginePower + 0.2);
        
        // Build boost meter
        this.boostMeter = Math.min(100, this.boostMeter + 15);
        if (this.boostMeter >= 100 && !this.boostActive) {
            this.activateBoost();
        }
        
        // Particles from rocket
        this.spawnFuelParticles();
        
        // Score popup
        this.game.showScorePopup(this.rocket.x, this.rocket.y - 80, scoreGained);
        
        // Record performance
        const currentLetter = this.useWordMode && this.currentWord 
            ? this.currentWord[this.currentWordIndex]
            : this.currentLetter;
        this.game.player.recordLetterPerformance(currentLetter, true);
        
        // Next letter
        this.advanceToNextLetter();
        
        // Check combo achievements
        if (this.combo === 10) this.game.checkAchievement('combo_10');
        if (this.combo === 25) this.game.checkAchievement('combo_25');
        if (this.combo === 50) this.game.checkAchievement('combo_50');
    }
    
    wrongKeyPress(letter) {
        this.combo = 0;
        this.wrongCount++;
        
        // Lose fuel
        this.rocket.fuel = Math.max(0, this.rocket.fuel - 5);
        
        // Rocket shake effect
        this.rocket.shake = 10;
        this.rocket.tilt = Utils.random(-0.1, 0.1);
        
        // Reset boost meter
        this.boostMeter = Math.max(0, this.boostMeter - 30);
        
        // Play sound and flash
        AudioManager.playWrong();
        this.game.flashScreen('#ff4444');
        
        // Error particles
        this.particles.explosion(this.rocket.x, this.rocket.y, {
            count: 10,
            colors: ['#ff4444', '#ff8844'],
            speed: 100,
            size: 5,
            life: 0.5
        });
        
        // Record performance
        this.game.player.recordLetterPerformance(letter, false);
    }
    
    advanceToNextLetter() {
        if (this.useWordMode && this.currentWord) {
            this.currentLetter = this.getNextLetter();
        } else {
            this.currentLetter = this.nextLetters.shift();
            this.nextLetters.push(this.getRandomLetter());
        }
        this.letterTimer = Date.now();
    }
    
    activateBoost() {
        this.boostActive = true;
        this.boostMeter = 0;
        
        AudioManager.playPowerUp();
        
        // Boost effects
        this.particles.ring(this.rocket.x, this.rocket.y, {
            count: 30,
            color: '#00ffff',
            speed: 300
        });
        
        // Temporary speed boost
        setTimeout(() => {
            this.boostActive = false;
        }, 3000);
    }
    
    spawnFuelParticles() {
        const colors = this.boostActive 
            ? ['#00ffff', '#00ff88', '#ffffff']
            : ['#ff6b6b', '#ffd93d', '#ff8c42'];
        
        this.particles.fire(
            this.rocket.x,
            this.rocket.y + this.rocket.height / 2,
            Math.PI / 2,
            {
                count: 10,
                colors: colors,
                speed: 200,
                spread: 0.3
            }
        );
    }
    
    update(dt, currentTime) {
        if (this.state !== 'playing') return;
        
        this.timeElapsed += dt;
        
        // Check time limit
        if (this.timeElapsed >= this.levelDuration) {
            this.gameOver(false);
            return;
        }
        
        // Check letter timeout
        if (currentTime - this.letterTimer > this.letterTimeout) {
            // Letter timed out - counts as miss
            this.combo = 0;
            this.rocket.fuel = Math.max(0, this.rocket.fuel - 3);
            this.advanceToNextLetter();
        }
        
        // === IMPROVED ROCKET PHYSICS ===
        if (this.rocket.fuel > 0) {
            // Has fuel - accelerate upward
            const fuelConsumption = 5 * dt;
            this.rocket.fuel = Math.max(0, this.rocket.fuel - fuelConsumption);
            
            // Accelerate (positive velocity = going up)
            const baseAcceleration = 100;
            const boostMultiplier = this.boostActive ? 2.5 : 1;
            this.rocket.velocity = Math.min(
                this.rocket.maxVelocity * boostMultiplier,
                this.rocket.velocity + baseAcceleration * dt * this.rocket.enginePower
            );
            
            this.rocket.isFalling = false;
            
            // Engine particles
            if (this.rocket.enginePower > 0.1) {
                this.spawnEngineParticles();
            }
        } else {
            // NO FUEL - Apply gravity and decelerate
            // First, velocity decreases (rocket slows down)
            if (this.rocket.velocity > 0) {
                // Still going up but slowing down
                this.rocket.velocity = Math.max(0, this.rocket.velocity - this.rocket.gravity * dt);
                
                // Warning flash when slowing
                this.warningFlash = (this.warningFlash + dt * 5) % (Math.PI * 2);
            } else {
                // Velocity is zero or negative - START FALLING
                this.rocket.isFalling = true;
                
                // Apply gravity (accelerate downward)
                this.rocket.velocity = Math.max(
                    this.rocket.minVelocity, // Terminal falling velocity
                    this.rocket.velocity - this.rocket.gravity * dt
                );
            }
        }
        
        // Update altitude (can go negative if falling below start)
        const previousAltitude = this.rocket.altitude;
        this.rocket.altitude += this.rocket.velocity * dt;
        
        // CLAMP altitude to minimum 0 - rocket cannot go below ground level
        // This keeps the rocket visible and gives player a chance to recover
        if (this.rocket.altitude < 0) {
            this.rocket.altitude = 0;
            
            // If still falling when hitting ground, it's game over
            if (this.rocket.isFalling && this.rocket.velocity < -50) {
                this.gameOver(false);
                return;
            }
            
            // Stop falling velocity when at ground
            if (this.rocket.velocity < 0) {
                this.rocket.velocity = 0;
            }
        }
        
        // Check victory (reached moon)
        if (this.rocket.altitude >= this.rocket.targetAltitude) {
            this.gameOver(true);
            return;
        }
        
        // Set critical altitude warning when low and falling
        this.criticalAltitude = this.rocket.isFalling && this.rocket.altitude < 100;
        
        // Update stage based on altitude
        const altitudePercent = Math.max(0, this.rocket.altitude / this.rocket.targetAltitude);
        if (altitudePercent < 0.15) {
            this.stage = 'launchpad';
        } else if (altitudePercent < 0.4) {
            this.stage = 'atmosphere';
        } else if (altitudePercent < 0.85) {
            this.stage = 'space';
        } else {
            this.stage = 'moon';
        }
        this.stageProgress = altitudePercent;
        
        // Update rocket visual position - CLAMPED to stay on screen
        // The rocket stays at the bottom when altitude is 0, and rises with altitude
        const minY = this.canvas.height - 200; // Ground position
        const maxY = this.canvas.height * 0.3;  // Highest visual position
        
        // Map altitude to visual position, clamped to screen bounds
        this.rocket.targetY = Utils.lerp(
            minY,
            maxY,
            Math.min(1, Math.max(0, altitudePercent * 2))
        );
        
        // Ensure rocket never goes below the ground visually
        this.rocket.targetY = Math.min(this.rocket.targetY, minY);
        
        this.rocket.y += (this.rocket.targetY - this.rocket.y) * 5 * dt;
        
        // Clamp final Y position to stay on screen
        this.rocket.y = Math.min(this.rocket.y, this.canvas.height - 100);
        
        // Decay engine power
        this.rocket.enginePower *= 0.95;
        
        // Decay shake
        this.rocket.shake *= 0.9;
        this.rocket.tilt *= 0.95;
        
        // Update clouds (move down as rocket goes up)
        this.clouds.forEach(cloud => {
            cloud.y += this.rocket.velocity * dt * 0.3;
            if (cloud.y > this.canvas.height + 100) {
                cloud.y = -100;
                cloud.x = Math.random() * this.canvas.width;
            }
        });
        
        // Update stars (parallax)
        this.stars.forEach(star => {
            star.y += this.rocket.velocity * dt * 0.1 * star.speed;
            star.twinkle += dt * 2;
            if (star.y > this.canvas.height) {
                star.y = 0;
                star.x = Math.random() * this.canvas.width;
            }
        });
        
        // Update moon visibility
        this.moon.visible = this.stage === 'space' || this.stage === 'moon';
        if (this.moon.visible) {
            this.moon.y = Utils.lerp(
                -200,
                this.canvas.height * 0.2,
                (altitudePercent - 0.4) / 0.6
            );
        }
    }
    
    spawnEngineParticles() {
        const colors = this.boostActive 
            ? ['#00ffff', '#00ff88', '#ffffff']
            : ['#ff6b6b', '#ffd93d', '#ff8c42'];
        
        for (let i = 0; i < 3; i++) {
            this.particles.addParticle(new Particle(
                this.rocket.x + Utils.random(-15, 15),
                this.rocket.y + this.rocket.height / 2,
                {
                    vx: Utils.random(-30, 30),
                    vy: Utils.random(100, 200),
                    life: Utils.random(0.3, 0.6),
                    size: Utils.random(8, 15),
                    endSize: 0,
                    color: Utils.randomChoice(colors),
                    glow: true,
                    glowSize: 10
                }
            ));
        }
    }
    
    gameOver(victory) {
        this.state = victory ? 'victory' : 'gameover';
        
        // Calculate stars
        const accuracy = this.correctCount / Math.max(this.correctCount + this.wrongCount, 1);
        const progress = this.rocket.altitude / this.rocket.targetAltitude;
        let stars = 0;
        
        if (victory) {
            const timeBonus = 1 - (this.timeElapsed / this.levelDuration);
            if (accuracy >= 0.95 && timeBonus >= 0.3) stars = 3;
            else if (accuracy >= 0.80 && timeBonus >= 0.1) stars = 2;
            else stars = 1;
        } else {
            // Partial stars for progress
            if (progress >= 0.75) stars = 1;
        }
        
        // Effects
        if (victory) {
            AudioManager.playLevelComplete();
            this.particles.confetti(0, 0, this.canvas.width, { count: 150 });
            
            // Moon landing effects
            this.particles.explosion(this.rocket.x, this.rocket.y, {
                count: 50,
                colors: ['#ffd700', '#ffffff', '#00ffff'],
                speed: 200,
                size: 10,
                life: 1.5
            });
        } else {
            AudioManager.playGameOver();
            
            // Crash effects if fell
            if (this.rocket.isFalling) {
                this.particles.explosion(this.rocket.x, this.rocket.y, {
                    count: 60,
                    colors: ['#ff4444', '#ff8844', '#ffcc00'],
                    speed: 300,
                    size: 12,
                    life: 1
                });
                this.game.screenShake.start(20, 500);
            }
        }
        
        // Update player stats
        const wpm = (this.correctCount / Math.max(this.timeElapsed / 60, 1)) * 5;
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
                altitude: Math.round(this.rocket.altitude),
                targetAltitude: this.rocket.targetAltitude,
                timeElapsed: this.timeElapsed
            });
        }, victory ? 2000 : 1000);
    }
    
    draw(ctx) {
        // Draw sky gradient based on stage
        this.drawBackground(ctx);
        
        // Draw stars (only visible in atmosphere and space)
        if (this.stage !== 'launchpad') {
            const starOpacity = this.stage === 'atmosphere' ? 0.3 : 1;
            ctx.save();
            ctx.globalAlpha = starOpacity;
            this.stars.forEach(star => {
                const twinkle = 0.5 + 0.5 * Math.sin(star.twinkle);
                ctx.fillStyle = `rgba(255, 255, 255, ${twinkle})`;
                ctx.beginPath();
                ctx.arc(star.x, star.y, star.size, 0, Math.PI * 2);
                ctx.fill();
            });
            ctx.restore();
        }
        
        // Draw moon
        if (this.moon.visible) {
            this.drawMoon(ctx);
        }
        
        // Draw clouds (only in atmosphere)
        if (this.stage === 'launchpad' || this.stage === 'atmosphere') {
            this.drawClouds(ctx);
        }
        
        // Draw launch pad (only at start)
        if (this.stage === 'launchpad' && this.stageProgress < 0.1) {
            this.drawLaunchPad(ctx);
        }
        
        // Draw rocket
        this.drawRocket(ctx);
        
        // Draw UI elements
        this.drawLetterUI(ctx);
        this.drawFuelGauge(ctx);
        this.drawAltitudeMeter(ctx);
        this.drawBoostMeter(ctx);
        this.drawVelocityIndicator(ctx);
        
        // Draw word progress if using word mode
        if (this.useWordMode && this.currentWord) {
            this.drawWordProgress(ctx);
        }
        
        // Draw falling warning
        if (this.rocket.isFalling) {
            this.drawFallingWarning(ctx);
        }
    }
    
    drawWordProgress(ctx) {
        const centerX = this.canvas.width / 2;
        const y = 180;
        
        ctx.save();
        ctx.font = 'bold 14px "Exo 2", sans-serif';
        ctx.textAlign = 'center';
        ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
        ctx.fillText('WORD:', centerX - 70, y);
        
        // Draw the word with typed/untyped highlighting
        let x = centerX - 30;
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
            ctx.font = i === this.currentWordIndex ? 'bold 20px "Arial Black", sans-serif' : 'bold 16px "Exo 2", sans-serif';
            ctx.fillText(letter, x, y);
            x += 22;
            ctx.shadowBlur = 0;
        }
        
        ctx.restore();
    }
    
    drawVelocityIndicator(ctx) {
        const x = 70;
        const y = 30;
        
        ctx.save();
        ctx.font = 'bold 14px "Orbitron", sans-serif';
        ctx.textAlign = 'left';
        
        // Color based on velocity state
        let velocityColor = '#ffffff';
        let velocityText = `${Math.round(this.rocket.velocity)} m/s`;
        
        if (this.rocket.velocity < 0) {
            velocityColor = '#ff4444';
            velocityText = `${Math.round(this.rocket.velocity)} m/s ⬇️`;
        } else if (this.rocket.velocity > this.rocket.maxVelocity * 0.8) {
            velocityColor = '#44ff88';
            velocityText = `${Math.round(this.rocket.velocity)} m/s 🚀`;
        } else if (this.rocket.fuel <= 0 && this.rocket.velocity > 0) {
            velocityColor = '#ffcc00';
            velocityText = `${Math.round(this.rocket.velocity)} m/s ⚠️`;
        }
        
        ctx.fillStyle = velocityColor;
        ctx.fillText(`VELOCITY: ${velocityText}`, x, y);
        ctx.restore();
    }
    
    drawFallingWarning(ctx) {
        const time = Date.now();
        
        // Flashing warning overlay - more intense when closer to ground
        const dangerLevel = 1 - Math.min(1, this.rocket.altitude / 200);
        const alpha = (0.15 + 0.15 * Math.sin(time / 80)) * (0.5 + dangerLevel * 0.5);
        
        ctx.save();
        ctx.globalAlpha = alpha;
        ctx.fillStyle = '#ff0000';
        ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        ctx.restore();
        
        // Warning border flash
        ctx.save();
        ctx.globalAlpha = 0.5 + 0.5 * Math.sin(time / 100);
        ctx.strokeStyle = '#ff4444';
        ctx.lineWidth = 10;
        ctx.strokeRect(5, 5, this.canvas.width - 10, this.canvas.height - 10);
        ctx.restore();
        
        // Main warning text - pulsing
        ctx.save();
        const textPulse = 1 + 0.1 * Math.sin(time / 100);
        ctx.font = `bold ${Math.round(32 * textPulse)}px "Orbitron", sans-serif`;
        ctx.textAlign = 'center';
        ctx.fillStyle = '#ff4444';
        ctx.shadowColor = '#ff0000';
        ctx.shadowBlur = 30;
        ctx.fillText('⚠️ FALLING! TYPE TO ADD FUEL! ⚠️', this.canvas.width / 2, 60);
        
        // Additional altitude warning when critical
        if (this.rocket.altitude < 100) {
            ctx.font = 'bold 24px "Orbitron", sans-serif';
            ctx.fillStyle = '#ffcc00';
            ctx.shadowColor = '#ff8800';
            ctx.fillText(`ALTITUDE: ${Math.round(this.rocket.altitude)}m - CRASH IMMINENT!`, this.canvas.width / 2, 95);
        }
        
        // Down arrow indicators on sides
        ctx.globalAlpha = 0.5 + 0.5 * Math.sin(time / 150);
        ctx.fillStyle = '#ff4444';
        ctx.font = 'bold 40px sans-serif';
        ctx.fillText('⬇', 50, this.canvas.height / 2);
        ctx.fillText('⬇', this.canvas.width - 50, this.canvas.height / 2);
        
        ctx.restore();
    }
    
    drawBackground(ctx) {
        let gradient;
        
        switch (this.stage) {
            case 'launchpad':
                gradient = ctx.createLinearGradient(0, 0, 0, this.canvas.height);
                gradient.addColorStop(0, '#1a1a4e');
                gradient.addColorStop(0.5, '#2d2d6e');
                gradient.addColorStop(1, '#4a4a8e');
                break;
            case 'atmosphere':
                gradient = ctx.createLinearGradient(0, 0, 0, this.canvas.height);
                gradient.addColorStop(0, '#0a0a2e');
                gradient.addColorStop(0.5, '#1a1a4e');
                gradient.addColorStop(1, '#3a3a6e');
                break;
            case 'space':
            case 'moon':
                gradient = ctx.createLinearGradient(0, 0, 0, this.canvas.height);
                gradient.addColorStop(0, '#050510');
                gradient.addColorStop(1, '#0a0a1a');
                break;
        }
        
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    }
    
    drawMoon(ctx) {
        ctx.save();
        
        // Moon glow
        const glowGradient = ctx.createRadialGradient(
            this.moon.x, this.moon.y, this.moon.radius * 0.5,
            this.moon.x, this.moon.y, this.moon.radius * 2
        );
        glowGradient.addColorStop(0, 'rgba(255, 255, 200, 0.3)');
        glowGradient.addColorStop(1, 'transparent');
        ctx.fillStyle = glowGradient;
        ctx.beginPath();
        ctx.arc(this.moon.x, this.moon.y, this.moon.radius * 2, 0, Math.PI * 2);
        ctx.fill();
        
        // Moon surface
        const moonGradient = ctx.createRadialGradient(
            this.moon.x - this.moon.radius * 0.3,
            this.moon.y - this.moon.radius * 0.3,
            0,
            this.moon.x,
            this.moon.y,
            this.moon.radius
        );
        moonGradient.addColorStop(0, '#f5f5dc');
        moonGradient.addColorStop(1, '#c0c0a0');
        
        ctx.fillStyle = moonGradient;
        ctx.beginPath();
        ctx.arc(this.moon.x, this.moon.y, this.moon.radius, 0, Math.PI * 2);
        ctx.fill();
        
        // Craters
        ctx.fillStyle = 'rgba(100, 100, 80, 0.3)';
        const craters = [
            { x: -20, y: -10, r: 15 },
            { x: 25, y: 20, r: 20 },
            { x: -30, y: 25, r: 12 },
            { x: 10, y: -25, r: 10 },
            { x: -10, y: 35, r: 8 }
        ];
        craters.forEach(crater => {
            ctx.beginPath();
            ctx.arc(this.moon.x + crater.x, this.moon.y + crater.y, crater.r, 0, Math.PI * 2);
            ctx.fill();
        });
        
        ctx.restore();
    }
    
    drawClouds(ctx) {
        ctx.save();
        this.clouds.forEach(cloud => {
            ctx.globalAlpha = cloud.opacity;
            
            const gradient = ctx.createRadialGradient(
                cloud.x, cloud.y, 0,
                cloud.x, cloud.y, cloud.width / 2
            );
            gradient.addColorStop(0, 'rgba(255, 255, 255, 0.8)');
            gradient.addColorStop(1, 'rgba(255, 255, 255, 0)');
            
            ctx.fillStyle = gradient;
            ctx.beginPath();
            ctx.ellipse(cloud.x, cloud.y, cloud.width / 2, cloud.height / 2, 0, 0, Math.PI * 2);
            ctx.fill();
        });
        ctx.restore();
    }
    
    drawLaunchPad(ctx) {
        const pad = this.launchPad;
        
        // Platform
        ctx.fillStyle = '#444';
        ctx.fillRect(pad.x - pad.width / 2, pad.y, pad.width, pad.height);
        
        // Support structure
        ctx.strokeStyle = '#666';
        ctx.lineWidth = 8;
        ctx.beginPath();
        ctx.moveTo(pad.x - pad.width / 2, pad.y + pad.height);
        ctx.lineTo(pad.x - pad.width / 2 - 20, this.canvas.height);
        ctx.moveTo(pad.x + pad.width / 2, pad.y + pad.height);
        ctx.lineTo(pad.x + pad.width / 2 + 20, this.canvas.height);
        ctx.stroke();
        
        // Warning lights
        const blink = Math.sin(Date.now() / 200) > 0;
        ctx.fillStyle = blink ? '#ff0000' : '#880000';
        ctx.beginPath();
        ctx.arc(pad.x - pad.width / 2 - 10, pad.y + 10, 5, 0, Math.PI * 2);
        ctx.arc(pad.x + pad.width / 2 + 10, pad.y + 10, 5, 0, Math.PI * 2);
        ctx.fill();
    }
    
    drawRocket(ctx) {
        ctx.save();
        ctx.translate(
            this.rocket.x + Utils.random(-this.rocket.shake, this.rocket.shake),
            this.rocket.y + Utils.random(-this.rocket.shake, this.rocket.shake)
        );
        ctx.rotate(this.rocket.tilt);
        
        const w = this.rocket.width;
        const h = this.rocket.height;
        
        // Rocket body
        const bodyGradient = ctx.createLinearGradient(-w/2, 0, w/2, 0);
        bodyGradient.addColorStop(0, '#888');
        bodyGradient.addColorStop(0.3, '#fff');
        bodyGradient.addColorStop(0.7, '#fff');
        bodyGradient.addColorStop(1, '#888');
        
        ctx.fillStyle = bodyGradient;
        ctx.beginPath();
        ctx.moveTo(0, -h/2);
        ctx.quadraticCurveTo(w/2, -h/3, w/2, h/4);
        ctx.lineTo(w/2, h/2 - 10);
        ctx.lineTo(-w/2, h/2 - 10);
        ctx.lineTo(-w/2, h/4);
        ctx.quadraticCurveTo(-w/2, -h/3, 0, -h/2);
        ctx.closePath();
        ctx.fill();
        
        // Red stripes
        ctx.fillStyle = '#cc0000';
        ctx.fillRect(-w/2 + 5, -h/4, w - 10, 15);
        ctx.fillRect(-w/2 + 5, 0, w - 10, 15);
        
        // Window
        ctx.fillStyle = '#00aaff';
        ctx.beginPath();
        ctx.ellipse(0, -h/4 + 30, 12, 15, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#666';
        ctx.lineWidth = 2;
        ctx.stroke();
        
        // Window reflection
        ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
        ctx.beginPath();
        ctx.ellipse(-4, -h/4 + 26, 4, 6, -0.3, 0, Math.PI * 2);
        ctx.fill();
        
        // Fins
        ctx.fillStyle = '#cc0000';
        // Left fin
        ctx.beginPath();
        ctx.moveTo(-w/2, h/3);
        ctx.lineTo(-w/2 - 20, h/2 + 10);
        ctx.lineTo(-w/2, h/2 - 10);
        ctx.closePath();
        ctx.fill();
        // Right fin
        ctx.beginPath();
        ctx.moveTo(w/2, h/3);
        ctx.lineTo(w/2 + 20, h/2 + 10);
        ctx.lineTo(w/2, h/2 - 10);
        ctx.closePath();
        ctx.fill();
        
        // Engine nozzle
        ctx.fillStyle = '#444';
        ctx.beginPath();
        ctx.moveTo(-w/3, h/2 - 10);
        ctx.lineTo(-w/4, h/2 + 5);
        ctx.lineTo(w/4, h/2 + 5);
        ctx.lineTo(w/3, h/2 - 10);
        ctx.closePath();
        ctx.fill();
        
        // Engine flame (if fuel > 0)
        if (this.rocket.fuel > 0 && this.rocket.enginePower > 0.05) {
            const flameHeight = 30 + this.rocket.enginePower * 50;
            const flameWidth = 15 + this.rocket.enginePower * 10;
            
            // Outer flame (red/orange)
            const outerFlameGradient = ctx.createLinearGradient(0, h/2, 0, h/2 + flameHeight);
            outerFlameGradient.addColorStop(0, this.boostActive ? '#00ffff' : '#ff6600');
            outerFlameGradient.addColorStop(0.5, this.boostActive ? '#00ff88' : '#ffcc00');
            outerFlameGradient.addColorStop(1, 'transparent');
            
            ctx.fillStyle = outerFlameGradient;
            ctx.beginPath();
            ctx.moveTo(-flameWidth, h/2 + 5);
            ctx.quadraticCurveTo(0, h/2 + flameHeight, flameWidth, h/2 + 5);
            ctx.closePath();
            ctx.fill();
            
            // Inner flame (white/yellow)
            const innerFlameGradient = ctx.createLinearGradient(0, h/2, 0, h/2 + flameHeight * 0.6);
            innerFlameGradient.addColorStop(0, '#ffffff');
            innerFlameGradient.addColorStop(1, 'transparent');
            
            ctx.fillStyle = innerFlameGradient;
            ctx.beginPath();
            ctx.moveTo(-flameWidth * 0.5, h/2 + 5);
            ctx.quadraticCurveTo(0, h/2 + flameHeight * 0.6, flameWidth * 0.5, h/2 + 5);
            ctx.closePath();
            ctx.fill();
        }
        
        ctx.restore();
    }
    
    drawLetterUI(ctx) {
        const centerX = this.canvas.width / 2;
        const y = 120;
        
        // Current letter (large, centered)
        ctx.save();
        
        // Letter timer progress (ring around letter)
        const timerProgress = 1 - (Date.now() - this.letterTimer) / this.letterTimeout;
        if (timerProgress > 0) {
            ctx.beginPath();
            ctx.arc(centerX, y, 55, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * timerProgress);
            ctx.strokeStyle = timerProgress > 0.3 ? '#00ffff' : '#ff4444';
            ctx.lineWidth = 4;
            ctx.stroke();
        }
        
        // Letter background
        ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
        ctx.beginPath();
        ctx.arc(centerX, y, 50, 0, Math.PI * 2);
        ctx.fill();
        
        // Letter glow
        const glowGradient = ctx.createRadialGradient(centerX, y, 30, centerX, y, 60);
        glowGradient.addColorStop(0, 'rgba(0, 255, 255, 0.3)');
        glowGradient.addColorStop(1, 'transparent');
        ctx.fillStyle = glowGradient;
        ctx.beginPath();
        ctx.arc(centerX, y, 60, 0, Math.PI * 2);
        ctx.fill();
        
        // Current letter - improved font
        const displayLetter = this.useWordMode && this.currentWord 
            ? this.currentWord[this.currentWordIndex]
            : this.currentLetter;
        
        ctx.fillStyle = '#00ffff';
        ctx.font = 'bold 48px "Arial Black", Impact, sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.shadowColor = '#00ffff';
        ctx.shadowBlur = 15;
        ctx.fillText(displayLetter, centerX, y);
        
        // Next letters (smaller, in a row) - only for non-word mode
        if (!this.useWordMode || !this.currentWord) {
            ctx.shadowBlur = 0;
            ctx.font = 'bold 24px "Orbitron", sans-serif';
            ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
            
            for (let i = 0; i < Math.min(3, this.nextLetters.length); i++) {
                const alpha = 0.5 - i * 0.15;
                ctx.fillStyle = `rgba(255, 255, 255, ${alpha})`;
                ctx.fillText(this.nextLetters[i], centerX + 80 + i * 40, y);
            }
        }
        
        ctx.restore();
    }
    
    drawFuelGauge(ctx) {
        const x = 30;
        const y = this.canvas.height / 2 - 100;
        const width = 30;
        const height = 200;
        
        // Background
        ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
        ctx.fillRect(x - 2, y - 2, width + 4, height + 4);
        
        // Gauge background
        ctx.fillStyle = 'rgba(255, 255, 255, 0.1)';
        ctx.fillRect(x, y, width, height);
        
        // Fuel level
        const fuelPercent = this.rocket.fuel / this.rocket.maxFuel;
        const fuelHeight = height * fuelPercent;
        
        const fuelGradient = ctx.createLinearGradient(x, y + height - fuelHeight, x, y + height);
        if (fuelPercent > 0.5) {
            fuelGradient.addColorStop(0, '#44ff88');
            fuelGradient.addColorStop(1, '#00aa44');
        } else if (fuelPercent > 0.25) {
            fuelGradient.addColorStop(0, '#ffcc00');
            fuelGradient.addColorStop(1, '#ff8800');
        } else {
            fuelGradient.addColorStop(0, '#ff4444');
            fuelGradient.addColorStop(1, '#aa0000');
        }
        
        ctx.fillStyle = fuelGradient;
        ctx.fillRect(x, y + height - fuelHeight, width, fuelHeight);
        
        // Border
        ctx.strokeStyle = 'rgba(100, 150, 255, 0.5)';
        ctx.lineWidth = 2;
        ctx.strokeRect(x, y, width, height);
        
        // Label
        ctx.fillStyle = '#ffffff';
        ctx.font = '12px "Orbitron", sans-serif';
        ctx.textAlign = 'center';
        ctx.save();
        ctx.translate(x + width / 2, y - 15);
        ctx.fillText('FUEL', 0, 0);
        ctx.restore();
        
        // Percentage
        ctx.fillText(`${Math.round(fuelPercent * 100)}%`, x + width / 2, y + height + 20);
        
        // Warning indicator when low
        if (fuelPercent < 0.25 && fuelPercent > 0) {
            const warningAlpha = 0.5 + 0.5 * Math.sin(Date.now() / 100);
            ctx.save();
            ctx.globalAlpha = warningAlpha;
            ctx.strokeStyle = '#ff4444';
            ctx.lineWidth = 3;
            ctx.strokeRect(x - 3, y - 3, width + 6, height + 6);
            ctx.restore();
        }
    }
    
    drawAltitudeMeter(ctx) {
        const x = this.canvas.width - 60;
        const y = this.canvas.height / 2 - 100;
        const width = 30;
        const height = 200;
        
        // Background
        ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
        ctx.fillRect(x - 2, y - 2, width + 4, height + 4);
        
        // Meter background
        ctx.fillStyle = 'rgba(255, 255, 255, 0.1)';
        ctx.fillRect(x, y, width, height);
        
        // Altitude markers
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
        ctx.lineWidth = 1;
        for (let i = 0; i <= 4; i++) {
            const markerY = y + (height / 4) * i;
            ctx.beginPath();
            ctx.moveTo(x, markerY);
            ctx.lineTo(x + width, markerY);
            ctx.stroke();
        }
        
        // Progress fill
        const altitudePercent = Math.max(0, this.rocket.altitude / this.rocket.targetAltitude);
        const altitudeHeight = height * Math.min(1, altitudePercent);
        
        const altGradient = ctx.createLinearGradient(x, y + height - altitudeHeight, x, y + height);
        altGradient.addColorStop(0, '#00ffff');
        altGradient.addColorStop(1, '#0088ff');
        
        ctx.fillStyle = altGradient;
        ctx.fillRect(x, y + height - altitudeHeight, width, altitudeHeight);
        
        // Rocket marker
        const markerY = y + height - altitudeHeight;
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.moveTo(x - 10, markerY);
        ctx.lineTo(x, markerY - 5);
        ctx.lineTo(x, markerY + 5);
        ctx.closePath();
        ctx.fill();
        
        // Border
        ctx.strokeStyle = 'rgba(100, 150, 255, 0.5)';
        ctx.lineWidth = 2;
        ctx.strokeRect(x, y, width, height);
        
        // Moon icon at top
        ctx.fillStyle = '#ffd700';
        ctx.font = '20px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('🌙', x + width / 2, y - 15);
        
        // Altitude text
        ctx.fillStyle = '#ffffff';
        ctx.font = '12px "Orbitron", sans-serif';
        ctx.fillText(`${Math.round(altitudePercent * 100)}%`, x + width / 2, y + height + 20);
    }
    
    drawBoostMeter(ctx) {
        if (this.boostMeter <= 0 && !this.boostActive) return;
        
        const x = this.canvas.width / 2;
        const y = 220;
        const width = 150;
        const height = 10;
        
        // Background
        ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
        ctx.fillRect(x - width / 2 - 2, y - 2, width + 4, height + 4);
        
        // Meter
        ctx.fillStyle = 'rgba(255, 255, 255, 0.1)';
        ctx.fillRect(x - width / 2, y, width, height);
        
        // Fill
        const fillWidth = this.boostActive ? width : (width * this.boostMeter / 100);
        const boostGradient = ctx.createLinearGradient(x - width / 2, y, x - width / 2 + fillWidth, y);
        
        if (this.boostActive) {
            boostGradient.addColorStop(0, '#00ffff');
            boostGradient.addColorStop(0.5, '#00ff88');
            boostGradient.addColorStop(1, '#00ffff');
        } else {
            boostGradient.addColorStop(0, '#ff00ff');
            boostGradient.addColorStop(1, '#ff88ff');
        }
        
        ctx.fillStyle = boostGradient;
        ctx.fillRect(x - width / 2, y, fillWidth, height);
        
        // Label
        ctx.fillStyle = this.boostActive ? '#00ffff' : '#ff88ff';
        ctx.font = 'bold 12px "Orbitron", sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(this.boostActive ? '⚡ BOOST ACTIVE ⚡' : 'BOOST', x, y - 8);
    }
    
    getHUD() {
        return {
            score: this.score,
            combo: this.combo,
            accuracy: this.correctCount / Math.max(this.correctCount + this.wrongCount, 1),
            fuel: this.rocket.fuel,
            maxFuel: this.rocket.maxFuel,
            altitude: this.rocket.altitude,
            targetAltitude: this.rocket.targetAltitude,
            timeRemaining: Math.max(0, this.levelDuration - this.timeElapsed)
        };
    }
}

// Export
window.RocketLaunchLevel = RocketLaunchLevel;
