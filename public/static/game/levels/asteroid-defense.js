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
        
        // Difficulty settings based on player
        this.difficulty = game.player.getDifficulty();
        this.letters = Utils.getLettersByDifficulty(this.difficulty);
        this.spawnRate = this.getSpawnRate();
        this.fallSpeed = this.getFallSpeed();
        
        // Timers
        this.lastSpawn = 0;
        this.spawnInterval = 2000; // ms between spawns
        
        // Visual elements
        this.earth = null;
        this.shield = null;
        
        // Adaptive difficulty
        this.recentAccuracy = [];
        this.adaptiveMultiplier = 1;
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
    
    spawnAsteroid() {
        // Get a random letter, with bias towards letters player struggles with
        let letter;
        const weakLetters = this.game.player.getWeakestLetters(3);
        
        if (weakLetters.length > 0 && Math.random() < 0.3) {
            letter = Utils.randomChoice(weakLetters);
        } else {
            letter = Utils.randomChoice(this.letters);
        }
        
        // Random position at top
        const x = Utils.random(100, this.canvas.width - 100);
        const y = -50;
        
        // Size based on difficulty (larger = easier to see)
        const size = this.difficulty === 'beginner' ? 50 : 
                     this.difficulty === 'easy' ? 45 : 
                     this.difficulty === 'medium' ? 40 : 35;
        
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
        
        const pressedLetter = key.toUpperCase();
        
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
        } else {
            this.recordMiss(pressedLetter);
        }
    }
    
    destroyAsteroid(asteroid) {
        // Aim cannon at asteroid
        this.aimCannon(asteroid);
        
        // Fire projectile
        this.fireProjectile(asteroid);
        
        // Play sounds
        AudioManager.playLaser();
        
        // Schedule explosion (when projectile hits)
        const travelTime = this.calculateTravelTime(asteroid);
        
        setTimeout(() => {
            this.explodeAsteroid(asteroid);
        }, travelTime);
    }
    
    aimCannon(target) {
        const dx = target.x - this.cannon.x;
        const dy = target.y - this.cannon.y;
        this.cannon.targetAngle = Math.atan2(dy, dx);
    }
    
    fireProjectile(target) {
        const speed = 800;
        const dx = target.x - this.cannon.x;
        const dy = target.y - this.cannon.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        const angle = Math.atan2(dy, dx);
        
        this.projectiles.push({
            x: this.cannon.x + Math.cos(this.cannon.targetAngle) * this.cannon.length,
            y: this.cannon.y + Math.sin(this.cannon.targetAngle) * this.cannon.length,
            vx: Math.cos(angle) * speed,
            vy: Math.sin(angle) * speed,
            targetId: target.id,
            targetX: target.x,
            targetY: target.y,
            color: '#00ffff',
            size: 8,
            trail: []
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
            
            // Record accuracy
            this.recentAccuracy.push(1);
            if (this.recentAccuracy.length > 20) this.recentAccuracy.shift();
            
            // Record letter performance
            this.game.player.recordLetterPerformance(letter, true);
        }
        
        this.adaptDifficulty();
    }
    
    recordMiss(letter) {
        this.combo = 0;
        this.wrongCount++;
        
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
        // Damage Earth
        const damage = 20;
        this.earthHealth = Math.max(0, this.earthHealth - damage);
        
        // Reset combo
        this.combo = 0;
        
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
    
    update(dt, currentTime) {
        if (this.state !== 'playing') return;
        
        this.timeElapsed += dt;
        
        // Check victory condition
        if (this.timeElapsed >= this.levelDuration) {
            this.gameOver(true);
            return;
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
            
            // Check if projectile reached target or is off screen
            const targetDist = Utils.distance(proj.x, proj.y, proj.targetX, proj.targetY);
            if (targetDist < 30 || proj.y < -50 || proj.y > this.canvas.height + 50) {
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
                ctx.lineWidth = 4;
                ctx.lineCap = 'round';
                ctx.stroke();
                ctx.restore();
            }
            
            // Projectile head with glow
            ctx.save();
            const projGlow = ctx.createRadialGradient(proj.x, proj.y, 0, proj.x, proj.y, proj.size * 3);
            projGlow.addColorStop(0, proj.color);
            projGlow.addColorStop(0.5, 'rgba(0, 255, 255, 0.5)');
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
            
            // Letter
            ctx.fillStyle = '#ffffff';
            ctx.font = `bold ${asteroid.size}px 'Orbitron', sans-serif`;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.shadowColor = '#000000';
            ctx.shadowBlur = 5;
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
        
        // Barrel glow when firing
        const barrelGlow = ctx.createLinearGradient(0, 0, this.cannon.length, 0);
        barrelGlow.addColorStop(0, this.cannon.color);
        barrelGlow.addColorStop(1, this.cannon.glowColor);
        
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
