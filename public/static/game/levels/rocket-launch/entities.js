// ============================================
// COSMIC TYPER - Level 2: Cosmic Runner
// Entities: Player, Obstacles, Projectiles, Managers
// ============================================

// === PROJECTILE CLASS ===
class Projectile {
    constructor(startX, startY, targetX, targetY, config, weaponConfig) {
        this.config = config;
        this.weapon = weaponConfig;

        // Position
        this.x = startX;
        this.y = startY;
        this.startX = startX;
        this.startY = startY;

        // Target and direction
        this.targetX = targetX;
        this.targetY = targetY;

        // Calculate direction to target
        const dx = targetX - startX;
        const dy = targetY - startY;
        const dist = Math.sqrt(dx * dx + dy * dy);

        this.vx = (dx / dist) * this.weapon.projectileSpeed;
        this.vy = (dy / dist) * this.weapon.projectileSpeed;
        this.angle = Math.atan2(dy, dx);

        // State
        this.isActive = true;
        this.hasHit = false;
        this.distanceTraveled = 0;
        // Max distance scales inversely with speed - slower projectiles need more buffer
        // because targets drift more during longer flight time
        const speedBuffer = Math.max(200, 400 - (this.weapon.projectileSpeed / 5));
        this.maxDistance = dist + speedBuffer;

        // Visual
        this.size = this.weapon.projectileSize;
        this.color = this.weapon.projectileColor;
        this.glowColor = this.weapon.projectileGlow;

        // Trail
        this.trail = [];
        this.trailLength = config.PROJECTILES?.TRAIL_LENGTH || 8;
    }

    update(dt) {
        if (!this.isActive) return;

        // Store trail position
        this.trail.unshift({ x: this.x, y: this.y });
        if (this.trail.length > this.trailLength) {
            this.trail.pop();
        }

        // Move projectile
        this.x += this.vx * dt;
        this.y += this.vy * dt;

        // Track distance
        const dx = this.x - this.startX;
        const dy = this.y - this.startY;
        this.distanceTraveled = Math.sqrt(dx * dx + dy * dy);

        // Deactivate if traveled too far
        if (this.distanceTraveled > this.maxDistance) {
            this.isActive = false;
        }
    }

    draw(ctx) {
        if (!this.isActive) return;

        ctx.save();

        // Draw trail
        for (let i = 0; i < this.trail.length; i++) {
            const t = this.trail[i];
            const alpha = 1 - (i / this.trail.length);
            const size = this.size * (1 - i / this.trail.length * 0.5);

            ctx.globalAlpha = alpha * 0.6;
            ctx.fillStyle = this.glowColor;
            ctx.beginPath();
            ctx.arc(t.x, t.y, size, 0, Math.PI * 2);
            ctx.fill();
        }

        ctx.globalAlpha = 1;

        // Draw projectile glow
        ctx.shadowColor = this.glowColor;
        ctx.shadowBlur = 15;

        // Draw projectile body
        ctx.fillStyle = this.color;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
        ctx.fill();

        // Inner bright core
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size * 0.4, 0, Math.PI * 2);
        ctx.fill();

        ctx.restore();
    }

    // Check if projectile collides with its assigned target's current hitbox
    checkTargetCollision() {
        if (!this.target || this.target.isDestroyed) return false;

        const hitbox = this.target.getHitbox();
        // Check if projectile center is inside target hitbox (with some padding)
        const padding = 10;
        return this.x >= hitbox.x - padding &&
            this.x <= hitbox.x + hitbox.width + padding &&
            this.y >= hitbox.y - padding &&
            this.y <= hitbox.y + hitbox.height + padding;
    }
}

// === PROJECTILE MANAGER ===
class ProjectileManager {
    constructor(canvas, config, particles) {
        this.canvas = canvas;
        this.config = config;
        this.particles = particles;
        this.projectiles = [];
        this.obstacleManager = null; // Set by main game for spread projectile collision
    }

    // Fire with predictive aiming
    fireAt(fromX, fromY, target, gameSpeed, weaponConfig) {
        if (!target) return null;

        // Predict where target will be when projectile arrives
        const targetCenterX = target.x + target.width / 2;
        const targetCenterY = target.y + target.height / 2;

        // Calculate time to reach target
        const dx = targetCenterX - fromX;
        const dy = targetCenterY - fromY;
        const dist = Math.sqrt(dx * dx + dy * dy);
        const timeToHit = dist / weaponConfig.projectileSpeed;

        // Predict target position (accounting for movement AND target's speed multiplier)
        // Elite enemies move slower (speedMultiplier = 0.6), so adjust prediction
        const targetSpeedMultiplier = target.speedMultiplier || 1;
        const predictedX = targetCenterX - (gameSpeed * targetSpeedMultiplier * timeToHit);
        const predictedY = targetCenterY; // Y doesn't change for most obstacles

        const projectile = new Projectile(
            fromX, fromY,
            predictedX, predictedY,
            this.config,
            weaponConfig
        );

        projectile.target = target; // Store reference for hit detection
        projectile.timeToHit = timeToHit; // Store travel time for destruction delay
        projectile.isSpread = false; // Primary projectile
        this.projectiles.push(projectile);

        return projectile;
    }

    // Fire at a specific angle offset from the primary direction (for spread shot)
    fireAtAngle(fromX, fromY, baseAngle, angleOffset, weaponConfig) {
        const angle = baseAngle + angleOffset;
        const distance = 800; // Max travel distance

        // Calculate target position based on angle
        const targetX = fromX + Math.cos(angle) * distance;
        const targetY = fromY + Math.sin(angle) * distance;

        const projectile = new Projectile(
            fromX, fromY,
            targetX, targetY,
            this.config,
            weaponConfig
        );

        projectile.target = null; // No specific target - hits whatever is in path
        projectile.isSpread = true; // Spread projectile - checks all obstacles
        projectile.spreadAngle = angle;
        this.projectiles.push(projectile);

        return projectile;
    }

    update(dt) {
        this.projectiles.forEach(p => p.update(dt));

        // Remove inactive projectiles
        this.projectiles = this.projectiles.filter(p => p.isActive);
    }

    draw(ctx) {
        this.projectiles.forEach(p => p.draw(ctx));
    }

    // Check if any projectile hit its target (or any obstacle for spread projectiles)
    checkHits() {
        const hits = [];

        for (const projectile of this.projectiles) {
            if (!projectile.isActive || projectile.hasHit) continue;

            // Spread projectiles check collision with REGULAR obstacles only
            // Bosses can only be destroyed by typing their word!
            if (projectile.isSpread && this.obstacleManager) {
                const regularObstacles = this.obstacleManager.obstacles;

                for (const obstacle of regularObstacles) {
                    if (obstacle.isDestroyed || obstacle.pendingDestroy) continue;

                    // Check hitbox collision
                    const hitboxPadding = 10;
                    if (projectile.x >= obstacle.x - hitboxPadding &&
                        projectile.x <= obstacle.x + obstacle.width + hitboxPadding &&
                        projectile.y >= obstacle.y - hitboxPadding &&
                        projectile.y <= obstacle.y + obstacle.height + hitboxPadding) {

                        projectile.hasHit = true;
                        projectile.isActive = false;
                        hits.push({
                            projectile: projectile,
                            target: obstacle,
                            isSpreadHit: true
                        });
                        break; // Only hit one target per spread projectile
                    }
                }
            }
            // Regular projectiles check their specific target
            else if (projectile.target && projectile.checkTargetCollision()) {
                projectile.hasHit = true;
                projectile.isActive = false;
                hits.push({
                    projectile: projectile,
                    target: projectile.target
                });
            }
        }

        return hits;
    }

    clear() {
        this.projectiles = [];
    }
}

// === PLAYER: The Robot Runner ===
class RocketRunner {
    constructor(canvas, config, particles) {
        this.canvas = canvas;
        this.fullConfig = config;
        this.config = config.PLAYER;
        this.particles = particles;

        // Position
        this.x = canvas.width * config.PLAYER.X_POSITION;
        this.y = 0; // Set in init
        this.groundY = 0; // Set in init

        // Dimensions
        this.width = this.config.WIDTH;
        this.height = this.config.HEIGHT;

        // Physics
        this.velocityY = 0;
        this.isOnGround = true;
        this.jumpsRemaining = this.config.MAX_JUMPS;

        // State
        this.health = this.config.MAX_HEALTH;
        this.isInvincible = false;
        this.invincibilityTimer = 0;
        this.isDead = false;

        // Animation
        this.runFrame = 0;
        this.runFrameTimer = 0;
        this.totalRunFrames = 4;
        this.jetpackFlame = 0;

        // Visual effects
        this.flashTimer = 0;
        this.trailParticles = [];

        // Weapon system
        this.weaponConfig = config.WEAPONS?.DEFAULT || {};
        this.currentWeapon = 'DEFAULT';
        this.isShooting = false;
        this.shootAnimTimer = 0;
        this.recoil = 0;
        this.muzzleFlashTimer = 0;
        this.gunOffsetX = this.config.GUN_OFFSET_X || 45;
        this.gunOffsetY = this.config.GUN_OFFSET_Y || 25;
    }

    init(groundY) {
        this.groundY = groundY;
        this.y = groundY - this.height;
        this.health = this.config.MAX_HEALTH;
        this.isDead = false;
        this.isInvincible = false;
        this.invincibilityTimer = 0;
        this.velocityY = 0;
        this.isOnGround = true;
        this.jumpsRemaining = this.config.MAX_JUMPS;
        this.recoil = 0;
        this.isShooting = false;
    }

    // Get gun barrel position for spawning projectiles
    getGunPosition() {
        return {
            x: this.x + this.gunOffsetX - this.recoil,
            y: this.y + this.gunOffsetY
        };
    }

    // Trigger shooting animation
    shoot() {
        this.isShooting = true;
        this.shootAnimTimer = 0.15;
        this.recoil = this.weaponConfig.recoilAmount || 3;
        this.muzzleFlashTimer = this.weaponConfig.muzzleFlashDuration || 0.08;

        // Muzzle flash particles
        if (this.particles) {
            const gunPos = this.getGunPosition();
            const muzzleConfig = this.fullConfig.PARTICLES?.MUZZLE_FLASH || {};

            for (let i = 0; i < (muzzleConfig.count || 8); i++) {
                const angle = Utils.random(-0.3, 0.3);
                const speed = Utils.random(100, muzzleConfig.speed || 150);

                this.particles.addParticle(new Particle(
                    gunPos.x + 10,
                    gunPos.y,
                    {
                        vx: Math.cos(angle) * speed,
                        vy: Math.sin(angle) * speed,
                        life: muzzleConfig.life || 0.15,
                        size: Utils.random(4, muzzleConfig.size || 8),
                        endSize: 0,
                        color: Utils.randomChoice(muzzleConfig.colors || ['#ffffff', '#00ffff']),
                        glow: true,
                        glowSize: 8
                    }
                ));
            }
        }
    }

    // Set active weapon type
    setWeapon(weaponType) {
        this.currentWeapon = weaponType;
        this.weaponConfig = this.fullConfig.WEAPONS?.[weaponType] || this.fullConfig.WEAPONS?.DEFAULT || {};
    }

    jump() {
        if (this.jumpsRemaining > 0) {
            const velocity = this.isOnGround ?
                this.config.JUMP_VELOCITY :
                this.config.DOUBLE_JUMP_VELOCITY;

            this.velocityY = velocity;
            this.isOnGround = false;
            this.jumpsRemaining--;

            // Jump particles
            if (this.particles) {
                this.particles.fire(
                    this.x + this.width / 2,
                    this.y + this.height,
                    Math.PI / 2,
                    {
                        count: 8,
                        colors: ['#ff6600', '#ffcc00', '#ffffff'],
                        speed: 150,
                        spread: 0.5
                    }
                );
            }

            return true;
        }
        return false;
    }

    takeDamage() {
        if (this.isInvincible || this.isDead) return false;

        this.health--;
        this.isInvincible = true;
        this.invincibilityTimer = this.config.INVINCIBILITY_DURATION;
        this.flashTimer = 0;

        // Damage particles
        if (this.particles) {
            this.particles.explosion(
                this.x + this.width / 2,
                this.y + this.height / 2,
                {
                    count: 15,
                    colors: ['#ff4444', '#ff8844', '#ffcc00'],
                    speed: 150,
                    size: 8,
                    life: 0.5
                }
            );
        }

        if (this.health <= 0) {
            this.isDead = true;
        }

        return true;
    }

    heal(amount = 1) {
        this.health = Math.min(this.config.MAX_HEALTH, this.health + amount);

        // Heal particles
        if (this.particles) {
            this.particles.ring(
                this.x + this.width / 2,
                this.y + this.height / 2,
                {
                    count: 15,
                    color: '#44ff88',
                    speed: 100
                }
            );
        }
    }

    update(dt) {
        // Gravity
        if (!this.isOnGround) {
            this.velocityY += this.config.GRAVITY * dt;
            this.y += this.velocityY * dt;

            // Ground collision
            if (this.y >= this.groundY - this.height) {
                this.y = this.groundY - this.height;
                this.velocityY = 0;
                this.isOnGround = true;
                this.jumpsRemaining = this.config.MAX_JUMPS;

                // Landing dust
                if (this.particles) {
                    for (let i = 0; i < 5; i++) {
                        this.particles.addParticle(new Particle(
                            this.x + this.width / 2 + Utils.random(-20, 20),
                            this.groundY,
                            {
                                vx: Utils.random(-50, 50),
                                vy: Utils.random(-30, -10),
                                life: 0.3,
                                size: Utils.random(3, 6),
                                endSize: 0,
                                color: '#888888',
                                glow: false
                            }
                        ));
                    }
                }
            }
        }

        // Run animation
        this.runFrameTimer += dt;
        if (this.runFrameTimer >= this.config.RUN_FRAME_DURATION) {
            this.runFrameTimer = 0;
            this.runFrame = (this.runFrame + 1) % this.totalRunFrames;
        }

        // Jetpack flame animation
        this.jetpackFlame = (this.jetpackFlame + dt * 15) % (Math.PI * 2);

        // Invincibility timer
        if (this.isInvincible) {
            this.invincibilityTimer -= dt;
            this.flashTimer += dt * 10;
            if (this.invincibilityTimer <= 0) {
                this.isInvincible = false;
            }
        }

        // Shooting animation
        if (this.isShooting) {
            this.shootAnimTimer -= dt;
            if (this.shootAnimTimer <= 0) {
                this.isShooting = false;
            }
        }

        // Recoil recovery
        if (this.recoil > 0) {
            this.recoil = Math.max(0, this.recoil - (this.weaponConfig.recoilRecovery || 0.2) * dt * 60);
        }

        // Muzzle flash timer
        if (this.muzzleFlashTimer > 0) {
            this.muzzleFlashTimer -= dt;
        }

        // Running particles (when on ground)
        if (this.isOnGround && this.particles && Math.random() < 0.3) {
            this.particles.addParticle(new Particle(
                this.x + this.width / 2 + Utils.random(-10, 10),
                this.groundY - 2,
                {
                    vx: Utils.random(-80, -40),
                    vy: Utils.random(-20, -5),
                    life: 0.2,
                    size: Utils.random(2, 4),
                    endSize: 0,
                    color: '#666666',
                    glow: false
                }
            ));
        }
    }

    draw(ctx) {
        ctx.save();

        // Invincibility flash
        if (this.isInvincible && Math.sin(this.flashTimer) > 0) {
            ctx.globalAlpha = 0.5;
        }

        const colors = this.config.COLORS;
        const x = this.x - this.recoil; // Apply recoil offset
        const y = this.y;
        const w = this.width;
        const h = this.height;

        // Muzzle flash
        if (this.muzzleFlashTimer > 0) {
            const gunPos = this.getGunPosition();
            ctx.save();
            ctx.globalAlpha = this.muzzleFlashTimer / (this.weaponConfig.muzzleFlashDuration || 0.08);
            ctx.fillStyle = '#ffffff';
            ctx.shadowColor = this.weaponConfig.projectileColor || '#00ffff';
            ctx.shadowBlur = 20;
            ctx.beginPath();
            ctx.arc(gunPos.x + 15, gunPos.y, 12, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
        }

        // Jetpack flame
        const flameHeight = 15 + 10 * Math.sin(this.jetpackFlame);
        const flameGradient = ctx.createLinearGradient(
            x + w * 0.3, y + h,
            x + w * 0.3, y + h + flameHeight
        );
        flameGradient.addColorStop(0, '#ffffff');
        flameGradient.addColorStop(0.3, colors.jetpack);
        flameGradient.addColorStop(1, 'transparent');

        ctx.fillStyle = flameGradient;
        ctx.beginPath();
        ctx.moveTo(x + w * 0.2, y + h);
        ctx.lineTo(x + w * 0.5, y + h + flameHeight);
        ctx.lineTo(x + w * 0.4, y + h);
        ctx.fill();

        // Second flame
        const flame2Height = 12 + 8 * Math.sin(this.jetpackFlame + 1);
        ctx.beginPath();
        ctx.moveTo(x + w * 0.6, y + h);
        ctx.lineTo(x + w * 0.7, y + h + flame2Height);
        ctx.lineTo(x + w * 0.8, y + h);
        ctx.fill();

        // Robot legs (animated)
        const legOffset = this.isOnGround ? Math.sin(this.runFrame * Math.PI / 2) * 8 : 5;
        ctx.fillStyle = colors.body;
        ctx.fillRect(x + w * 0.2, y + h * 0.7, 10, h * 0.3 + legOffset);
        ctx.fillRect(x + w * 0.6, y + h * 0.7, 10, h * 0.3 - legOffset);

        // Robot body
        ctx.fillStyle = colors.body;
        ctx.beginPath();
        ctx.roundRect(x + w * 0.1, y + h * 0.3, w * 0.8, h * 0.5, 8);
        ctx.fill();

        // Body accent (chest plate)
        ctx.fillStyle = colors.accent;
        ctx.beginPath();
        ctx.roundRect(x + w * 0.2, y + h * 0.35, w * 0.6, h * 0.2, 4);
        ctx.fill();

        // Gun arm (extends when shooting)
        const gunExtend = this.isShooting ? 5 : 0;
        ctx.fillStyle = '#666666';
        ctx.fillRect(x + w * 0.7, y + h * 0.35, w * 0.25 + gunExtend, 12);

        // Gun barrel
        ctx.fillStyle = this.weaponConfig.projectileColor || '#00ffff';
        ctx.shadowColor = this.weaponConfig.projectileGlow || '#4488ff';
        ctx.shadowBlur = 5;
        ctx.fillRect(x + w * 0.9 + gunExtend, y + h * 0.37, 8, 8);
        ctx.shadowBlur = 0;

        // Jetpack
        ctx.fillStyle = '#555555';
        ctx.beginPath();
        ctx.roundRect(x + w * 0.15, y + h * 0.5, w * 0.2, h * 0.35, 4);
        ctx.fill();
        ctx.beginPath();
        ctx.roundRect(x + w * 0.65, y + h * 0.5, w * 0.2, h * 0.35, 4);
        ctx.fill();

        // Robot head
        ctx.fillStyle = colors.body;
        ctx.beginPath();
        ctx.roundRect(x + w * 0.2, y, w * 0.6, h * 0.35, 10);
        ctx.fill();

        // Visor
        ctx.fillStyle = colors.visor;
        ctx.shadowColor = colors.visor;
        ctx.shadowBlur = 10;
        ctx.beginPath();
        ctx.roundRect(x + w * 0.25, y + h * 0.08, w * 0.5, h * 0.15, 5);
        ctx.fill();
        ctx.shadowBlur = 0;

        // Antenna
        ctx.strokeStyle = colors.accent;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(x + w * 0.5, y);
        ctx.lineTo(x + w * 0.5, y - 15);
        ctx.stroke();

        // Antenna tip (pulsing)
        ctx.fillStyle = colors.visor;
        ctx.shadowColor = colors.visor;
        ctx.shadowBlur = 5 + 3 * Math.sin(this.jetpackFlame);
        ctx.beginPath();
        ctx.arc(x + w * 0.5, y - 15, 4, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;

        ctx.restore();
    }

    // Get hitbox for collision
    getHitbox() {
        return {
            x: this.x + 10,
            y: this.y + 10,
            width: this.width - 20,
            height: this.height - 15
        };
    }
}

// === ELITE OBSTACLE (Word Typing) ===
class EliteObstacle {
    constructor(x, y, eliteType, word, config, difficulty) {
        this.x = x;
        this.y = y;
        this.eliteConfig = config.ELITE_ENEMIES[eliteType];
        this.word = word;
        this.typedIndex = 0; // How many letters typed correctly

        this.width = this.eliteConfig.width;
        this.height = this.eliteConfig.height;
        this.color = this.eliteConfig.color;
        this.accentColor = this.eliteConfig.accentColor;
        this.glowColor = this.eliteConfig.glowColor;
        this.points = this.eliteConfig.points;
        this.speedMultiplier = this.eliteConfig.speedMultiplier;
        this.isGround = this.eliteConfig.isGround;
        this.isElite = true;
        this.eliteType = eliteType;

        this.isDestroyed = false;
        this.destroyAnimation = 0;

        // Animation
        this.bobPhase = Math.random() * Math.PI * 2;
        this.glowPhase = Math.random() * Math.PI * 2;
        this.pulsePhase = 0;

        // For display
        this.isTargeted = false;
    }

    // Get current letter to type
    getCurrentLetter() {
        if (this.typedIndex >= this.word.length) return null;
        return this.word[this.typedIndex];
    }

    // Type a letter - returns true if correct
    typeLetter(letter) {
        if (this.typedIndex >= this.word.length) return false;

        if (letter === this.word[this.typedIndex]) {
            this.typedIndex++;
            this.pulsePhase = 1; // Trigger hit pulse
            return true;
        }
        return false;
    }

    // Check if word is complete
    isWordComplete() {
        return this.typedIndex >= this.word.length;
    }

    // Reset word typing progress (for retry after mistake)
    resetTyping() {
        this.typedIndex = 0;
        this.pulsePhase = 0;
    }

    update(dt, gameSpeed) {
        // Move slower than regular obstacles
        this.x -= gameSpeed * dt * this.speedMultiplier;

        this.bobPhase += dt * 2;
        this.glowPhase += dt * 4;

        // Decay hit pulse
        if (this.pulsePhase > 0) {
            this.pulsePhase = Math.max(0, this.pulsePhase - dt * 5);
        }

        if (this.isDestroyed) {
            this.destroyAnimation += dt * 2;
        }
    }

    draw(ctx, groundY) {
        if (this.isDestroyed && this.destroyAnimation > 1) return;

        ctx.save();

        const baseY = this.isGround ? this.y : this.y + Math.sin(this.bobPhase) * 8;

        if (this.isDestroyed) {
            ctx.globalAlpha = 1 - this.destroyAnimation;
            ctx.translate(this.x + this.width / 2, baseY + this.height / 2);
            ctx.scale(1 + this.destroyAnimation * 2, 1 + this.destroyAnimation * 2);
            ctx.translate(-(this.x + this.width / 2), -(baseY + this.height / 2));
        }

        // Draw based on elite type
        if (this.eliteType === 'MECH') {
            this.drawMech(ctx, baseY);
        } else {
            this.drawEliteDrone(ctx, baseY);
        }

        // Draw word above
        if (!this.isDestroyed) {
            this.drawWord(ctx, baseY);
        }

        ctx.restore();
    }

    drawMech(ctx, y) {
        const x = this.x;
        const w = this.width;
        const h = this.height;

        // Glow effect
        const glowIntensity = 10 + 5 * Math.sin(this.glowPhase) + this.pulsePhase * 15;
        ctx.shadowColor = this.glowColor;
        ctx.shadowBlur = glowIntensity;

        // Body
        ctx.fillStyle = this.color;
        ctx.beginPath();
        ctx.roundRect(x + w * 0.2, y + h * 0.2, w * 0.6, h * 0.6, 8);
        ctx.fill();

        // Legs
        ctx.fillStyle = this.accentColor;
        ctx.fillRect(x + w * 0.15, y + h * 0.7, 15, h * 0.35);
        ctx.fillRect(x + w * 0.65, y + h * 0.7, 15, h * 0.35);

        // Arms/Guns
        ctx.fillRect(x, y + h * 0.35, w * 0.25, 12);
        ctx.fillRect(x + w * 0.75, y + h * 0.35, w * 0.25, 12);

        // Head
        ctx.fillStyle = this.color;
        ctx.beginPath();
        ctx.roundRect(x + w * 0.3, y, w * 0.4, h * 0.25, 6);
        ctx.fill();

        // Eye (targeting when locked)
        const eyeColor = this.isTargeted ? '#ff0000' : '#ffffff';
        ctx.fillStyle = eyeColor;
        ctx.shadowColor = eyeColor;
        ctx.shadowBlur = this.isTargeted ? 15 : 5;
        ctx.beginPath();
        ctx.arc(x + w / 2, y + h * 0.1, 6, 0, Math.PI * 2);
        ctx.fill();

        ctx.shadowBlur = 0;
    }

    drawEliteDrone(ctx, y) {
        const x = this.x;
        const w = this.width;
        const h = this.height;

        // Glow
        const glowIntensity = 12 + 6 * Math.sin(this.glowPhase) + this.pulsePhase * 20;
        ctx.shadowColor = this.glowColor;
        ctx.shadowBlur = glowIntensity;

        // Main body (hexagonal)
        ctx.fillStyle = this.color;
        ctx.beginPath();
        ctx.moveTo(x + w * 0.5, y);
        ctx.lineTo(x + w, y + h * 0.25);
        ctx.lineTo(x + w, y + h * 0.75);
        ctx.lineTo(x + w * 0.5, y + h);
        ctx.lineTo(x, y + h * 0.75);
        ctx.lineTo(x, y + h * 0.25);
        ctx.closePath();
        ctx.fill();

        // Inner accent
        ctx.fillStyle = this.accentColor;
        ctx.beginPath();
        ctx.arc(x + w / 2, y + h / 2, h * 0.25, 0, Math.PI * 2);
        ctx.fill();

        // Eye
        const eyeColor = this.isTargeted ? '#ff0000' : '#ffffff';
        ctx.fillStyle = eyeColor;
        ctx.shadowColor = eyeColor;
        ctx.shadowBlur = 10;
        ctx.beginPath();
        ctx.arc(x + w / 2, y + h / 2, 8, 0, Math.PI * 2);
        ctx.fill();

        ctx.shadowBlur = 0;
    }

    drawWord(ctx, y) {
        const centerX = this.x + this.width / 2;
        const wordY = y - 40;

        // Background - sized to fit larger 32px letters
        const letterWidth = 26; // More space per letter
        const wordWidth = this.word.length * letterWidth + 24;
        ctx.fillStyle = 'rgba(0, 0, 0, 0.85)';
        ctx.beginPath();
        ctx.roundRect(centerX - wordWidth / 2, wordY - 22, wordWidth, 42, 8);
        ctx.fill();

        // Border (glows when targeted)
        if (this.isTargeted) {
            ctx.strokeStyle = '#ffcc00';
            ctx.shadowColor = '#ffcc00';
            ctx.shadowBlur = 10;
            ctx.lineWidth = 2;
            ctx.stroke();
            ctx.shadowBlur = 0;
        }

        // Draw each letter - BIGGER for kids!
        let letterX = centerX - (this.word.length * letterWidth / 2) + letterWidth / 2;
        for (let i = 0; i < this.word.length; i++) {
            const letter = this.word[i];

            if (i < this.typedIndex) {
                // Typed - green
                ctx.fillStyle = '#44ff88';
            } else if (i === this.typedIndex) {
                // Current - gold/pulsing
                ctx.fillStyle = '#ffd700';
                ctx.shadowColor = '#ffd700';
                ctx.shadowBlur = 8 + this.pulsePhase * 10;
            } else {
                // Untyped - white
                ctx.fillStyle = '#ffffff';
                ctx.shadowBlur = 0;
            }

            ctx.font = 'bold 32px "Arial Black", sans-serif';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(letter, letterX, wordY);

            letterX += letterWidth;
            ctx.shadowBlur = 0;
        }
    }

    getHitbox() {
        return {
            x: this.x,
            y: this.y,
            width: this.width,
            height: this.height
        };
    }

    isOffScreen() {
        return this.x + this.width < -50;
    }
}

// === OBSTACLE BASE CLASS ===
class RunnerObstacle {
    constructor(x, y, type, letter, config) {
        this.x = x;
        this.y = y;
        this.type = type;
        this.typeConfig = config.OBSTACLES.TYPES[type];
        this.letter = letter;

        this.width = this.typeConfig.width;
        this.height = this.typeConfig.height;
        this.color = this.typeConfig.color;
        this.accentColor = this.typeConfig.accentColor;
        this.points = this.typeConfig.points;
        this.isCollectible = this.typeConfig.isCollectible || false;
        this.bonusHealth = this.typeConfig.bonusHealth || 0;
        this.isElite = false;

        this.isDestroyed = false;
        this.destroyAnimation = 0;

        // Animation properties
        this.bobPhase = Math.random() * Math.PI * 2;
        this.glowPhase = Math.random() * Math.PI * 2;
        this.rotation = 0;
    }

    update(dt, gameSpeed) {
        this.x -= gameSpeed * dt;
        this.bobPhase += dt * 3;
        this.glowPhase += dt * 5;
        this.rotation += dt * (this.isCollectible ? 2 : 0.5);

        if (this.isDestroyed) {
            this.destroyAnimation += dt * 3;
        }
    }

    draw(ctx, groundY) {
        if (this.isDestroyed && this.destroyAnimation > 1) return;

        ctx.save();

        if (this.isDestroyed) {
            ctx.globalAlpha = 1 - this.destroyAnimation;
            ctx.translate(this.x + this.width / 2, this.y + this.height / 2);
            ctx.scale(1 + this.destroyAnimation, 1 + this.destroyAnimation);
            ctx.translate(-(this.x + this.width / 2), -(this.y + this.height / 2));
        }

        // Draw based on type
        switch (this.type) {
            case 'ROCK':
                this.drawRock(ctx);
                break;
            case 'CRATER':
                this.drawCrater(ctx, groundY);
                break;
            case 'DRONE':
                this.drawDrone(ctx);
                break;
            case 'FUEL_CELL':
                this.drawFuelCell(ctx);
                break;
            default:
                this.drawGeneric(ctx);
        }

        // Draw letter
        if (!this.isDestroyed) {
            this.drawLetter(ctx);
        }

        ctx.restore();
    }

    drawRock(ctx) {
        const x = this.x;
        const y = this.y;
        const w = this.width;
        const h = this.height;

        // Rock shadow
        ctx.fillStyle = 'rgba(0,0,0,0.3)';
        ctx.beginPath();
        ctx.ellipse(x + w / 2 + 5, y + h + 2, w / 2, 5, 0, 0, Math.PI * 2);
        ctx.fill();

        // Rock body (irregular polygon)
        ctx.fillStyle = this.color;
        ctx.beginPath();
        ctx.moveTo(x + w * 0.1, y + h);
        ctx.lineTo(x, y + h * 0.6);
        ctx.lineTo(x + w * 0.2, y + h * 0.2);
        ctx.lineTo(x + w * 0.5, y);
        ctx.lineTo(x + w * 0.8, y + h * 0.15);
        ctx.lineTo(x + w, y + h * 0.5);
        ctx.lineTo(x + w * 0.9, y + h);
        ctx.closePath();
        ctx.fill();

        // Highlight
        ctx.fillStyle = this.accentColor;
        ctx.beginPath();
        ctx.moveTo(x + w * 0.3, y + h * 0.3);
        ctx.lineTo(x + w * 0.5, y + h * 0.15);
        ctx.lineTo(x + w * 0.6, y + h * 0.35);
        ctx.closePath();
        ctx.fill();
    }

    drawCrater(ctx, groundY) {
        const x = this.x;
        const y = groundY - 5;
        const w = this.width;

        // Crater pit
        ctx.fillStyle = '#0a0a1e';
        ctx.beginPath();
        ctx.ellipse(x + w / 2, y, w / 2, 15, 0, 0, Math.PI);
        ctx.fill();

        // Crater rim
        ctx.strokeStyle = this.accentColor;
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.ellipse(x + w / 2, y, w / 2, 8, 0, Math.PI, 0);
        ctx.stroke();

        // Warning stripes
        ctx.fillStyle = '#ff4444';
        for (let i = 0; i < 3; i++) {
            ctx.fillRect(x + 10 + i * 25, y - 3, 15, 3);
        }
    }

    drawDrone(ctx) {
        const x = this.x;
        const y = this.y + Math.sin(this.bobPhase) * 5;
        const w = this.width;
        const h = this.height;

        // Drone glow
        ctx.shadowColor = this.color;
        ctx.shadowBlur = 10 + 5 * Math.sin(this.glowPhase);

        // Drone body
        ctx.fillStyle = this.color;
        ctx.beginPath();
        ctx.moveTo(x + w / 2, y);
        ctx.lineTo(x + w, y + h / 2);
        ctx.lineTo(x + w / 2, y + h);
        ctx.lineTo(x, y + h / 2);
        ctx.closePath();
        ctx.fill();

        // Eye
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(x + w / 2, y + h / 2, 8, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#000000';
        ctx.beginPath();
        ctx.arc(x + w / 2, y + h / 2, 4, 0, Math.PI * 2);
        ctx.fill();

        ctx.shadowBlur = 0;
    }

    drawFuelCell(ctx) {
        const x = this.x;
        const y = this.y + Math.sin(this.bobPhase) * 8;
        const w = this.width;
        const h = this.height;

        ctx.save();
        ctx.translate(x + w / 2, y + h / 2);
        ctx.rotate(this.rotation);

        // Glow
        ctx.shadowColor = this.color;
        ctx.shadowBlur = 15 + 5 * Math.sin(this.glowPhase);

        // Crystal shape
        ctx.fillStyle = this.color;
        ctx.beginPath();
        ctx.moveTo(0, -h / 2);
        ctx.lineTo(w / 2, 0);
        ctx.lineTo(0, h / 2);
        ctx.lineTo(-w / 2, 0);
        ctx.closePath();
        ctx.fill();

        // Inner glow
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.moveTo(0, -h / 4);
        ctx.lineTo(w / 4, 0);
        ctx.lineTo(0, h / 4);
        ctx.lineTo(-w / 4, 0);
        ctx.closePath();
        ctx.fill();

        ctx.restore();
    }

    drawGeneric(ctx) {
        ctx.fillStyle = this.color;
        ctx.fillRect(this.x, this.y, this.width, this.height);
    }

    drawLetter(ctx) {
        const centerX = this.x + this.width / 2;
        const centerY = this.y - 30;

        // Letter background circle - bigger for larger letters!
        ctx.fillStyle = 'rgba(0, 0, 0, 0.75)';
        ctx.beginPath();
        ctx.arc(centerX, centerY, 26, 0, Math.PI * 2);
        ctx.fill();

        // Letter border (no pulsing glow for better readability)
        ctx.strokeStyle = '#ffd700';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(centerX, centerY, 24, 0, Math.PI * 2);
        ctx.stroke();

        // Letter text - BIGGER for kids!
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 36px "Arial Black", sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(this.letter, centerX, centerY);
    }

    getHitbox() {
        return {
            x: this.x,
            y: this.y,
            width: this.width,
            height: this.height
        };
    }

    isOffScreen() {
        return this.x + this.width < -50;
    }
}

// === OBSTACLE MANAGER ===
class ObstacleManager {
    constructor(canvas, config, particles) {
        this.canvas = canvas;
        this.config = config;
        this.particles = particles;

        this.obstacles = [];
        this.eliteObstacles = [];
        this.spawnTimer = 0;
        this.nextSpawnTime = this.getRandomSpawnTime();

        this.wave = 1;
        this.letters = [];
        this.difficulty = 'easy';
        this.difficultyMultiplier = 1;

        // Target lock for word typing
        this.lockedTarget = null;
    }

    init(letters, difficulty) {
        this.obstacles = [];
        this.eliteObstacles = [];
        this.spawnTimer = 0;
        this.wave = 1;
        this.letters = letters;
        this.difficulty = difficulty;
        this.lockedTarget = null;

        const diffConfig = this.config.DIFFICULTY[difficulty] || this.config.DIFFICULTY.easy;
        this.difficultyMultiplier = diffConfig.spawnIntervalMultiplier;
        this.eliteSpawnChance = diffConfig.eliteSpawnChance || 0.15;
        this.nextSpawnTime = this.getRandomSpawnTime();
    }

    getRandomSpawnTime() {
        const min = this.config.OBSTACLES.MIN_SPAWN_INTERVAL;
        const max = this.config.OBSTACLES.MAX_SPAWN_INTERVAL;
        return (min + Math.random() * (max - min)) * this.difficultyMultiplier;
    }

    getRandomObstacleType() {
        const types = Object.keys(this.config.OBSTACLES.TYPES);
        const weights = {
            'ROCK': 40,
            'CRATER': 20,
            'DRONE': 25,
            'FUEL_CELL': 15
        };

        const totalWeight = Object.values(weights).reduce((a, b) => a + b, 0);
        let random = Math.random() * totalWeight;

        for (const type of types) {
            random -= weights[type] || 0;
            if (random <= 0) return type;
        }

        return types[0];
    }

    getRandomLetter() {
        return this.letters[Math.floor(Math.random() * this.letters.length)];
    }

    getRandomEliteType() {
        const types = Object.keys(this.config.ELITE_ENEMIES);
        return types[Math.floor(Math.random() * types.length)];
    }

    getRandomWord(eliteType) {
        // Use wave-based boss words from WordDictionary for progressively harder words
        if (typeof WordDictionary !== 'undefined' && WordDictionary.getBossWord) {
            return WordDictionary.getBossWord(this.wave);
        }
        // Fallback to config words based on difficulty
        const elite = this.config.ELITE_ENEMIES[eliteType];
        const words = elite.words[this.difficulty] || elite.words.easy;
        return words[Math.floor(Math.random() * words.length)];
    }

    spawnObstacle(groundY) {
        // Check if we should spawn an elite
        const eliteFirstWave = this.config.GAME?.ELITE_FIRST_WAVE || 2;
        if (this.wave >= eliteFirstWave && Math.random() < this.eliteSpawnChance) {
            this.spawnElite(groundY);
            return;
        }

        const type = this.getRandomObstacleType();
        const typeConfig = this.config.OBSTACLES.TYPES[type];
        const letter = typeConfig.canType ? this.getRandomLetter() : '';

        let y;
        if (typeConfig.isGround) {
            y = groundY - typeConfig.height;
        } else {
            y = groundY - typeConfig.height - (typeConfig.flyHeight || 80);
        }

        const obstacle = new RunnerObstacle(
            this.canvas.width + 50,
            y,
            type,
            letter,
            this.config
        );

        this.obstacles.push(obstacle);
    }

    spawnElite(groundY) {
        const eliteType = this.getRandomEliteType();
        const eliteConfig = this.config.ELITE_ENEMIES[eliteType];
        const word = this.getRandomWord(eliteType);

        let y;
        if (eliteConfig.isGround) {
            y = groundY - eliteConfig.height;
        } else {
            y = groundY - eliteConfig.height - (eliteConfig.flyHeight || 100);
        }

        const elite = new EliteObstacle(
            this.canvas.width + 50,
            y,
            eliteType,
            word,
            this.config,
            this.difficulty
        );

        this.eliteObstacles.push(elite);
    }

    update(dt, gameSpeed, groundY) {
        // Check if an elite is currently on screen
        const eliteOnScreen = this.eliteObstacles.some(e => !e.isDestroyed && e.x < this.canvas.width);

        // Spawn timer - PAUSE when elite is on screen OR spawning is paused (flag sequence)
        if (!eliteOnScreen && !this.spawningPaused) {
            this.spawnTimer += dt;
            if (this.spawnTimer >= this.nextSpawnTime) {
                this.spawnObstacle(groundY);
                this.spawnTimer = 0;
                this.nextSpawnTime = this.getRandomSpawnTime();
            }
        }

        // Update regular obstacles
        this.obstacles.forEach(obstacle => {
            obstacle.update(dt, gameSpeed);
        });

        // Update elite obstacles and check for escapes
        const escapedElites = [];
        this.eliteObstacles.forEach(elite => {
            elite.update(dt, gameSpeed);

            // Check if elite escaped (passed player without being destroyed)
            // Elite escapes when it goes off the left side of the screen
            if (!elite.isDestroyed && !elite.hasEscaped && elite.x + elite.width < 0) {
                elite.hasEscaped = true;
                escapedElites.push(elite);
            }
        });

        // Remove off-screen obstacles
        this.obstacles = this.obstacles.filter(o => !o.isOffScreen() &&
            !(o.isDestroyed && o.destroyAnimation > 1));

        this.eliteObstacles = this.eliteObstacles.filter(e => !e.isOffScreen() &&
            !(e.isDestroyed && e.destroyAnimation > 1));

        // Clear locked target if destroyed or off screen
        if (this.lockedTarget && (this.lockedTarget.isDestroyed || this.lockedTarget.isOffScreen())) {
            this.lockedTarget = null;
        }

        // Return escaped elites for the main game to handle damage
        return { escapedElites };
    }

    draw(ctx, groundY) {
        this.obstacles.forEach(obstacle => {
            obstacle.draw(ctx, groundY);
        });

        this.eliteObstacles.forEach(elite => {
            elite.draw(ctx, groundY);
        });
    }

    // Find the closest obstacle with a typeable letter
    getClosestTypeable() {
        const regular = this.obstacles
            .filter(o => !o.isDestroyed && !o.pendingDestroy && o.letter && o.typeConfig.canType)
            .sort((a, b) => a.x - b.x)[0];

        const elite = this.eliteObstacles
            .filter(e => !e.isDestroyed)
            .sort((a, b) => a.x - b.x)[0];

        if (!regular && !elite) return null;
        if (!regular) return elite;
        if (!elite) return regular;

        return regular.x < elite.x ? regular : elite;
    }

    // Find obstacle by letter (for regular obstacles)
    findByLetter(letter) {
        return this.obstacles
            .filter(o => !o.isDestroyed && !o.pendingDestroy && o.letter === letter && o.typeConfig.canType)
            .sort((a, b) => a.x - b.x)[0] || null;
    }

    // Find elite by first letter of word (for targeting)
    findEliteByFirstLetter(letter) {
        return this.eliteObstacles
            .filter(e => !e.isDestroyed && e.word[0] === letter)
            .sort((a, b) => a.x - b.x)[0] || null;
    }

    // Handle letter input with target locking
    handleLetterInput(letter) {
        // If we have a locked target, only accept that word's next letter
        if (this.lockedTarget) {
            const success = this.lockedTarget.typeLetter(letter);

            if (success) {
                // Check if word is complete
                if (this.lockedTarget.isWordComplete()) {
                    const target = this.lockedTarget;
                    this.lockedTarget = null;
                    return { type: 'elite_complete', target: target };
                }
                return { type: 'elite_progress', target: this.lockedTarget };
            } else {
                // Wrong letter breaks lock and combo
                const target = this.lockedTarget;
                target.isTargeted = false;
                this.lockedTarget = null;
                return { type: 'wrong', target: null };
            }
        }

        // No locked target - check for regular obstacles first
        const regular = this.findByLetter(letter);
        if (regular) {
            return { type: 'regular', target: regular };
        }

        // Check for elite first letter (start lock)
        const elite = this.findEliteByFirstLetter(letter);
        if (elite) {
            elite.typeLetter(letter); // Type first letter
            elite.isTargeted = true;
            this.lockedTarget = elite;

            if (elite.isWordComplete()) {
                this.lockedTarget = null;
                return { type: 'elite_complete', target: elite };
            }
            return { type: 'elite_start', target: elite };
        }

        // No match
        return { type: 'wrong', target: null };
    }

    // Destroy obstacle with effects
    destroyObstacle(obstacle, particles) {
        obstacle.isDestroyed = true;

        if (particles) {
            const isElite = obstacle.isElite;
            const particleConfig = isElite ?
                this.config.PARTICLES?.ELITE_EXPLODE :
                this.config.PARTICLES?.ENEMY_HIT;

            const colors = obstacle.isCollectible ?
                ['#44ff88', '#00ff44', '#ffffff'] :
                particleConfig?.colors || [obstacle.color, obstacle.accentColor, '#ffffff', '#ffd700'];

            particles.explosion(
                obstacle.x + obstacle.width / 2,
                obstacle.y + obstacle.height / 2,
                {
                    count: particleConfig?.count || 20,
                    colors: colors,
                    speed: particleConfig?.speed || 200,
                    size: particleConfig?.size || 8,
                    life: particleConfig?.life || 0.6
                }
            );

            particles.starBurst(
                obstacle.x + obstacle.width / 2,
                obstacle.y + obstacle.height / 2,
                obstacle.isCollectible ? '#44ff88' : '#ffd700'
            );
        }

        return obstacle.points;
    }

    // Set wave (for difficulty scaling)
    setWave(wave) {
        this.wave = wave;

        // Use wave-based scaling from config
        const waveScaling = this.config.GAME?.WAVE_SCALING || {};
        const easyWaves = waveScaling.EASY_WAVES || 6;

        // Calculate spawn rate multiplier based on wave
        if (wave <= easyWaves) {
            // Gentle scaling for waves 1-6
            const spawnScale = waveScaling.SPAWN_SCALE_EASY || 0.10;
            this.difficultyMultiplier = 1 / (1 + (wave - 1) * spawnScale); // Lower = faster spawns

            const eliteScale = waveScaling.ELITE_SCALE_EASY || 0.02;
            this.eliteSpawnChance = Math.min(0.25,
                (this.config.GAME?.ELITE_SPAWN_CHANCE || 0.12) + (wave - 1) * eliteScale);
        } else {
            // Steep scaling for waves 7+ (3 stars is HARD!)
            const easySpawnScale = waveScaling.SPAWN_SCALE_EASY || 0.10;
            const hardSpawnScale = waveScaling.SPAWN_SCALE_HARD || 0.30;
            const easyMultiplier = 1 / (1 + (easyWaves - 1) * easySpawnScale);
            const hardWaves = wave - easyWaves;
            this.difficultyMultiplier = easyMultiplier / (1 + hardWaves * hardSpawnScale);

            const eliteEasyScale = waveScaling.ELITE_SCALE_EASY || 0.02;
            const eliteHardScale = waveScaling.ELITE_SCALE_HARD || 0.05;
            const eliteEasyChance = (this.config.GAME?.ELITE_SPAWN_CHANCE || 0.12) + (easyWaves - 1) * eliteEasyScale;
            this.eliteSpawnChance = Math.min(0.5, eliteEasyChance + hardWaves * eliteHardScale);
        }
    }

    // Check collision with player
    checkCollision(playerHitbox) {
        // Check regular obstacles
        for (const obstacle of this.obstacles) {
            if (obstacle.isDestroyed) continue;

            const obsHitbox = obstacle.getHitbox();

            if (this.boxesOverlap(playerHitbox, obsHitbox)) {
                return obstacle;
            }
        }

        // Check elite obstacles
        for (const elite of this.eliteObstacles) {
            if (elite.isDestroyed) continue;

            const eliteHitbox = elite.getHitbox();

            if (this.boxesOverlap(playerHitbox, eliteHitbox)) {
                return elite;
            }
        }

        return null;
    }

    boxesOverlap(a, b) {
        return a.x < b.x + b.width &&
            a.x + a.width > b.x &&
            a.y < b.y + b.height &&
            a.y + a.height > b.y;
    }

    clear() {
        this.obstacles = [];
        this.eliteObstacles = [];
        this.lockedTarget = null;
    }

    // Break target lock (on damage)
    breakLock() {
        if (this.lockedTarget) {
            this.lockedTarget.isTargeted = false;
            this.lockedTarget = null;
        }
    }
}

// Make available globally
if (typeof window !== 'undefined') {
    window.Projectile = Projectile;
    window.ProjectileManager = ProjectileManager;
    window.RocketRunner = RocketRunner;
    window.EliteObstacle = EliteObstacle;
    window.RunnerObstacle = RunnerObstacle;
    window.ObstacleManager = ObstacleManager;
}
