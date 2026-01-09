// ============================================
// COSMIC TYPER - Level 2: Cosmic Runner
// Run through space, type letters to destroy obstacles!
// Features: Weapon system with projectiles, Elite enemies with word typing
// ============================================

class RocketLaunchLevel {
    constructor(game) {
        this.game = game;
        this.canvas = game.gameCanvas;
        this.ctx = game.gameCtx;
        this.particles = game.particles;

        // Level info
        this.id = 'cosmic-runner';
        this.name = 'Cosmic Runner';
        this.description = 'Run through space! Type letters to destroy obstacles or press SPACE to jump!';
        this.icon = '🤖';

        // Get config
        this.config = window.RocketRunnerConfig || {};

        // Difficulty
        this.difficulty = game.player.getDifficulty();
        this.difficultyConfig = this.config.DIFFICULTY?.[this.difficulty] || this.config.DIFFICULTY?.easy || {};
        this.letters = Utils.getLettersByDifficulty(this.difficulty);

        // Game state
        this.state = 'ready';
        this.score = 0;
        this.combo = 0;
        this.maxCombo = 0;
        this.correctCount = 0;
        this.wrongCount = 0;
        this.timeElapsed = 0;

        // Wave system
        this.currentWave = 1;
        this.waveTimeElapsed = 0;
        this.waveDuration = this.config.GAME?.WAVE_DURATION || 25;
        this.isWaveTransitioning = false;
        this.waveTransitionTimer = 0;
        this.obstaclesDestroyedThisWave = 0;

        // Game speed (increases over time)
        this.gameSpeed = this.difficultyConfig.startSpeed || this.config.GAME?.START_SPEED || 150;
        this.maxSpeed = this.difficultyConfig.maxSpeed || this.config.GAME?.MAX_SPEED || 400;

        // Ground level
        this.groundY = 0;

        // Components (initialized in init())
        this.player = null;
        this.background = null;
        this.obstacleManager = null;
        this.projectileManager = null;

        // Notification queue (prevents overlaps)
        this.notifications = [];
        this.notificationSlots = []; // Track active slots
        this.maxNotificationSlots = 3;

        this.comboTimer = 0;
        this.comboDecayTime = this.config.COMBO?.DECAY_TIME || 5; // Increased decay time

        // Letter/word display
        this.currentTargetObstacle = null;
        this.lockedElite = null; // Currently targeted elite

        // Power-ups (weapons with distinct projectile visuals)
        this.powerUps = {
            rapidFire: { active: false, timer: 0, notified: false },
            spreadShot: { active: false, timer: 0, notified: false },
            explosive: { active: false, timer: 0, notified: false }
        };

        // Visual effects
        this.screenFlashColor = null;
        this.screenFlashAlpha = 0;

        // Wave end flag
        this.waveFlag = null; // { x, y, reached }
    }

    init() {
        // Calculate ground Y
        this.groundY = this.canvas.height * (this.config.GAME?.GROUND_Y_PERCENT || 0.75);

        // Initialize background
        this.background = new RocketRunnerBackground(this.canvas, this.config);

        // Initialize player
        this.player = new RocketRunner(this.canvas, this.config, this.particles);
        this.player.init(this.groundY);

        // Add bonus health for easier difficulties
        const healthBonus = this.difficultyConfig.healthBonus || 0;
        this.player.health += healthBonus;

        // Initialize obstacle manager
        this.obstacleManager = new ObstacleManager(this.canvas, this.config, this.particles);
        this.obstacleManager.init(this.letters, this.difficulty);

        // Initialize projectile manager
        this.projectileManager = new ProjectileManager(this.canvas, this.config, this.particles);
        this.projectileManager.obstacleManager = this.obstacleManager; // For spread projectile collision

        // Reset state
        this.score = 0;
        this.combo = 0;
        this.maxCombo = 0;
        this.correctCount = 0;
        this.wrongCount = 0;
        this.timeElapsed = 0;
        this.currentWave = 1;
        this.waveTimeElapsed = 0;
        this.isWaveTransitioning = false;
        this.waveTransitionTimer = 0;
        this.obstaclesDestroyedThisWave = 0;
        this.gameSpeed = this.difficultyConfig.startSpeed || this.config.GAME?.START_SPEED || 150;
        this.notifications = [];
        this.notificationSlots = [];
        this.comboTimer = 0;
        this.currentTargetObstacle = null;
        this.lockedElite = null;
        this.lastEarnedStars = 0; // Track stars earned to avoid duplicate messages

        // Reset power-ups
        Object.keys(this.powerUps).forEach(key => {
            this.powerUps[key].active = false;
            this.powerUps[key].timer = 0;
            this.powerUps[key].notified = false;
        });
    }

    start() {
        this.state = 'playing';
        this.init();
        this.showWaveStart();
    }

    pause() {
        this.state = 'paused';
    }

    resume() {
        this.state = 'playing';
    }

    showWaveStart() {
        const waveText = this.currentWave <= 2 ? `WAVE ${this.currentWave}` :
            this.currentWave <= 4 ? `WAVE ${this.currentWave} - FASTER!` :
                `WAVE ${this.currentWave} - INTENSE!`;

        // Clear any existing notifications first
        this.notifications = [];
        this.notificationSlots = [];

        this.addNotification(`🌊 ${waveText} 🌊`, 2.5, 2, 0);

        setTimeout(() => {
            this.addNotification('Type to SHOOT! SPACE to JUMP!', 1.8, 1.2, 1);
        }, 700);
    }

    // Improved notification system with slots to prevent overlap
    addNotification(text, duration = 2, scale = 1.5, slot = -1) {
        // Find available slot if not specified
        if (slot < 0) {
            for (let i = 0; i < this.maxNotificationSlots; i++) {
                if (!this.notificationSlots[i]) {
                    slot = i;
                    break;
                }
            }
            if (slot < 0) slot = 0; // Fallback to first slot
        }

        // Mark slot as used
        this.notificationSlots[slot] = true;

        // Calculate Y position based on slot - INCREASED spacing
        const baseY = this.canvas.height / 2 - 120;
        const slotHeight = 80;

        const notification = {
            text: text,
            x: this.canvas.width / 2,
            y: baseY + slot * slotHeight,
            alpha: 1,
            scale: scale,
            life: duration,
            maxLife: duration,
            slot: slot
        };

        this.notifications.push(notification);
    }

    handleKeyPress(key) {
        if (this.state !== 'playing') return;

        // Space = Jump
        if (key === ' ' || key === 'Space') {
            this.handleJump();
            return;
        }

        // Letter keys
        if (key.length === 1 && key.match(/[a-zA-Z]/)) {
            this.handleLetterPress(key.toUpperCase());
        }
    }

    handleJump() {
        if (this.player.jump()) {
            AudioManager.playRocketBoost();
        }
    }

    handleLetterPress(letter) {
        // Use the obstacle manager's new input handling (supports word typing)
        const result = this.obstacleManager.handleLetterInput(letter);

        switch (result.type) {
            case 'regular':
                // Regular obstacle hit - fire projectile, destroy with exact travel time
                const projectile = this.fireAtTarget(result.target);
                this.recordCorrect(letter);
                const regularTarget = result.target;
                regularTarget.pendingDestroy = true; // Prevent re-targeting
                // Use projectile's calculated travel time + speed-scaled buffer
                // Higher gameSpeed = more drift during flight = larger buffer needed
                const speedBuffer = Math.max(30, (this.gameSpeed / 800) * 80);
                const delay = projectile ? (projectile.timeToHit * 1000) + speedBuffer : 200;
                setTimeout(() => {
                    if (!regularTarget.isDestroyed) {
                        this.destroyObstacle(regularTarget);
                    }
                }, delay);
                break;

            case 'elite_start':
                // Started typing a word (locked on)
                this.lockedElite = result.target;
                this.fireAtTarget(result.target, true); // Partial hit
                this.recordCorrect(letter, true);
                AudioManager.playTypeLock(); // New lock-on sound
                break;

            case 'elite_progress':
                // Continuing to type a word
                this.fireAtTarget(result.target, true);
                this.recordCorrect(letter, true);
                break;

            case 'elite_complete':
                // Completed typing a word - fire final projectile, delay based on travel time
                this.lockedElite = null;
                const eliteProjectile = this.fireAtTarget(result.target);
                this.recordCorrect(letter);
                const eliteTarget = result.target;
                eliteTarget.pendingDestroy = true;
                // Use projectile's calculated travel time + speed-scaled buffer for drama
                const eliteSpeedBuffer = Math.max(80, (this.gameSpeed / 800) * 150);
                const eliteDelay = eliteProjectile ? (eliteProjectile.timeToHit * 1000) + eliteSpeedBuffer : 300;
                setTimeout(() => {
                    if (!eliteTarget.isDestroyed) {
                        this.destroyObstacle(eliteTarget);
                        this.game.screenShake.start(15, 400);
                        AudioManager.playBossDestruction(); // Epic boss defeat sound!
                    }
                }, eliteDelay);
                // Bonus notification
                this.addNotification(`💀 ${result.target.word} DESTROYED!`, 1.5, 1.3);
                break;

            case 'wrong':
                this.recordWrong(letter);
                // On wrong letter during boss word: reset progress but keep lock
                // Player can retry from the beginning
                if (this.lockedElite) {
                    this.lockedElite.resetTyping(); // Reset to first letter
                    this.addNotification('❌ WORD RESET - Try Again!', 1, 1.2);
                }
                break;
        }
    }

    // Mark target for destruction when projectile hits
    queueDestruction(target, isElite = false) {
        // Mark as pending destruction (prevent re-targeting)
        target.pendingDestroy = true;
        target.isEliteTarget = isElite; // Store for later screen shake
    }

    // Fire projectile at target with predictive aiming
    fireAtTarget(target, isPartialHit = false) {
        // Trigger player shoot animation
        this.player.shoot();
        AudioManager.playShortLaser(); // New short laser sound

        // Get gun position
        const gunPos = this.player.getGunPosition();

        // Get current weapon config - prioritize by power level
        const weaponType = this.powerUps.explosive.active ? 'EXPLOSIVE' :
            this.powerUps.spreadShot.active ? 'SPREAD_SHOT' :
                this.powerUps.rapidFire.active ? 'RAPID_FIRE' : 'DEFAULT';
        const weaponConfig = this.config.WEAPONS?.[weaponType] || this.config.WEAPONS?.DEFAULT;

        // Fire main projectile and capture it for timing info
        const mainProjectile = this.projectileManager.fireAt(
            gunPos.x, gunPos.y,
            target,
            this.gameSpeed,
            weaponConfig
        );

        // Spread shot: fire additional projectiles at spread angles
        if (weaponType === 'SPREAD_SHOT' && weaponConfig.spreadCount > 1) {
            // Calculate base angle towards target
            const targetX = target.x + target.width / 2;
            const targetY = target.y + target.height / 2;
            const baseAngle = Math.atan2(targetY - gunPos.y, targetX - gunPos.x);

            // Fire spread projectiles at ±15° angles (hits whatever is in their path)
            const spreadAngle = Math.PI / 12; // 15 degrees
            this.projectileManager.fireAtAngle(gunPos.x, gunPos.y, baseAngle, -spreadAngle, weaponConfig);
            this.projectileManager.fireAtAngle(gunPos.x, gunPos.y, baseAngle, spreadAngle, weaponConfig);
            AudioManager.playScatterLaser(); // New scatter laser sound for spread
        }

        // Screen shake (small for partial, larger for full)
        this.game.screenShake.start(isPartialHit ? 2 : 4, isPartialHit ? 50 : 100);

        // Return main projectile for timing info
        return mainProjectile;
    }

    destroyObstacle(obstacle) {
        const points = this.obstacleManager.destroyObstacle(obstacle, this.particles);

        // Calculate score with combo
        const comboMultiplier = this.getComboMultiplier();
        const scoreGained = Math.round(points * comboMultiplier);
        this.score += scoreGained;

        // Show score popup
        this.game.showScorePopup(
            obstacle.x + obstacle.width / 2,
            obstacle.y,
            scoreGained
        );

        // Handle collectibles
        if (obstacle.isCollectible && obstacle.bonusHealth > 0) {
            this.player.heal(obstacle.bonusHealth);
            this.addNotification('💚 +1 HEALTH!', 1.5, 1.2);
            AudioManager.playHealthUp(); // New health pickup sound
        }

        // Explosive rounds: AoE damage
        if (this.powerUps.explosive.active && !obstacle.isCollectible) {
            const explosionRadius = this.config.WEAPONS?.EXPLOSIVE?.explosionRadius || 120;
            const nearbyObstacles = this.obstacleManager.obstacles.filter(o => {
                if (o.isDestroyed || o === obstacle) return false;
                const dx = o.x - obstacle.x;
                const dy = o.y - obstacle.y;
                return Math.sqrt(dx * dx + dy * dy) < explosionRadius;
            });

            nearbyObstacles.forEach(o => {
                setTimeout(() => this.destroyObstacle(o), 50);
            });

            // Big explosion particles
            this.particles.explosion(
                obstacle.x + obstacle.width / 2,
                obstacle.y + obstacle.height / 2,
                {
                    count: 35,
                    colors: ['#ff4444', '#ff8844', '#ffcc00', '#ffffff'],
                    speed: 300,
                    size: 12,
                    life: 0.8
                }
            );
            this.game.screenShake.start(10, 200);
        }

        // Play sound (bossDestruction is played separately in elite_complete handler)
        if (obstacle.isCollectible) {
            AudioManager.playCorrect();
        } else if (!obstacle.isElite) {
            // Regular obstacles get explosion sound (bosses use bossDestruction)
            AudioManager.playExplosion('small');
        }

        this.obstaclesDestroyedThisWave++;
    }

    recordCorrect(letter, isPartialWord = false) {
        this.combo++;
        this.maxCombo = Math.max(this.maxCombo, this.combo);
        this.correctCount++;
        this.comboTimer = 0;

        // Play combo sound (not for partial word hits)
        if (!isPartialWord) {
            if (this.combo > 1) {
                AudioManager.playCombo(this.combo);
            } else {
                AudioManager.playCorrect();
            }
        }

        // Record for player stats
        this.game.player.recordLetterPerformance(letter, true);

        // Check power-up unlocks
        this.checkPowerUps();

        // Combo achievements
        if (this.combo === 10) this.game.checkAchievement('combo_10');
        if (this.combo === 25) this.game.checkAchievement('combo_25');
        if (this.combo === 50) this.game.checkAchievement('combo_50');
    }

    recordWrong(letter) {
        this.combo = 0;
        this.wrongCount++;
        this.comboTimer = 0;

        AudioManager.playWrong();
        this.game.flashScreen('#ff4444');

        // Screen shake
        this.game.screenShake.start(4, 100);

        // Record for player stats
        this.game.player.recordLetterPerformance(letter, false);

        // Reset power-up notification flags
        Object.keys(this.powerUps).forEach(key => {
            this.powerUps[key].notified = false;
        });
    }

    getComboMultiplier() {
        const thresholds = this.config.COMBO?.MULTIPLIER_THRESHOLDS || [5, 10, 15, 25];
        let multiplier = 1;

        for (const threshold of thresholds) {
            if (this.combo >= threshold) {
                multiplier += 0.5;
            }
        }

        return Math.min(multiplier, this.config.COMBO?.MAX_MULTIPLIER || 4);
    }

    checkPowerUps() {
        const powerUpConfig = this.config.COMBO?.POWER_UPS || {};

        // Show notification when first reaching each threshold
        // (actual weapon activation is handled in updatePowerUps based on current combo)
        // Hierarchy: Rapid Fire (5) < Explosive (8) < Spread Shot (12)

        // Rapid Fire at 5 combo
        if (this.combo >= (powerUpConfig.RAPID_FIRE?.comboRequired || 5) && !this.powerUps.rapidFire.notified) {
            this.powerUps.rapidFire.notified = true;
            this.addNotification(`${powerUpConfig.RAPID_FIRE?.icon || '⚡'} RAPID FIRE UNLOCKED!`, 2, 1.5);
            AudioManager.playPowerUpNew(); // New power-up sound
        }

        // Explosive at 8 combo
        if (this.combo >= (powerUpConfig.EXPLOSIVE?.comboRequired || 8) && !this.powerUps.explosive.notified) {
            this.powerUps.explosive.notified = true;
            this.addNotification(`${powerUpConfig.EXPLOSIVE?.icon || '💥'} EXPLOSIVE UNLOCKED!`, 2, 1.5);
            AudioManager.playPowerUpNew(); // New power-up sound
        }

        // Spread Shot at 12 combo (BEST weapon!)
        if (this.combo >= (powerUpConfig.SPREAD_SHOT?.comboRequired || 12) && !this.powerUps.spreadShot.notified) {
            this.powerUps.spreadShot.notified = true;
            this.addNotification(`${powerUpConfig.SPREAD_SHOT?.icon || '🔥'} SPREAD SHOT UNLOCKED!`, 2, 1.5);
            AudioManager.playPowerUpNew(); // New power-up sound
        }

        // Reset notified flags when combo drops below thresholds
        if (this.combo < (powerUpConfig.RAPID_FIRE?.comboRequired || 5)) {
            this.powerUps.rapidFire.notified = false;
        }
        if (this.combo < (powerUpConfig.EXPLOSIVE?.comboRequired || 8)) {
            this.powerUps.explosive.notified = false;
        }
        if (this.combo < (powerUpConfig.SPREAD_SHOT?.comboRequired || 12)) {
            this.powerUps.spreadShot.notified = false;
        }
    }

    update(dt, currentTime) {
        if (this.state !== 'playing') return;

        this.timeElapsed += dt;

        // Check for game over
        if (this.player.isDead) {
            this.gameOver(false);
            return;
        }

        // Wave transition
        if (this.isWaveTransitioning) {
            this.waveTransitionTimer -= dt;
            if (this.waveTransitionTimer <= 0) {
                this.isWaveTransitioning = false;
                this.currentWave++;
                this.obstaclesDestroyedThisWave = 0;
                this.waveTimeElapsed = 0;
                this.waveFlag = null; // Reset flag for new wave
                this.obstacleManager.spawningPaused = false; // Resume spawning
                this.obstacleManager.setWave(this.currentWave);

                // Increase wave duration for later waves - makes achieving 3 stars harder!
                // Wave 1: 25s, Wave 5: 30s, Wave 10: 37.5s
                const baseDuration = this.config.GAME?.WAVE_DURATION || 25;
                const durationIncrease = (this.currentWave - 1) * 1.5; // +1.5s per wave
                this.waveDuration = baseDuration + durationIncrease;

                this.showWaveStart();
            }
            return;
        }

        // Wave timer
        this.waveTimeElapsed += dt;

        // Spawn finish flag when wave is about to end (5 seconds before)
        const flagSpawnTime = this.waveDuration - 5;
        if (this.waveTimeElapsed >= flagSpawnTime && !this.waveFlag) {
            this.waveFlag = {
                x: this.canvas.width + 100,
                y: this.groundY - 120,
                reached: false,
                wavePhase: 0
            };
            // Stop spawning obstacles beyond the flag
            this.obstacleManager.spawningPaused = true;
            this.addNotification('🏁 FINISH LINE AHEAD!', 2, 1.3);
        }

        // Update flag position
        if (this.waveFlag && !this.waveFlag.reached) {
            this.waveFlag.x -= this.gameSpeed * dt;
            this.waveFlag.wavePhase += dt * 8;

            // Check if player reached the flag
            if (this.waveFlag.x <= this.player.x + this.player.width + 30) {
                this.waveFlag.reached = true;
                this.completeWave();
                return;
            }
        }

        // Fallback: complete wave by time only if flag somehow glitched (very long fallback)
        if (this.waveTimeElapsed >= this.waveDuration + 10) {
            if (!this.waveFlag || !this.waveFlag.reached) {
                // Force flag reached if we hit fallback
                if (this.waveFlag) this.waveFlag.reached = true;
            }
            this.completeWave();
            return;
        }

        // Combo only resets on collision (removed time-based decay)
        // this.comboTimer is no longer used for decay

        // Update game speed
        const speedIncrease = (this.config.GAME?.SPEED_INCREASE_RATE || 5) * dt;
        this.gameSpeed = Math.min(this.maxSpeed, this.gameSpeed + speedIncrease);

        // Update power-up timers
        this.updatePowerUps(dt);

        // Update background
        this.background.update(dt, this.gameSpeed);

        // Update player
        this.player.update(dt);

        // No longer syncing invincibility (removed shield power-up)

        // Update obstacles and check for escaped elites
        const updateResult = this.obstacleManager.update(dt, this.gameSpeed, this.groundY);

        // Handle escaped elites - they deal 2 damage for getting away!
        if (updateResult?.escapedElites) {
            updateResult.escapedElites.forEach(elite => {
                if (!this.player.isInvincible) {
                    // Deal 2 damage for letting a boss escape
                    this.player.takeDamage();
                    this.player.takeDamage();
                    this.combo = 0; // Reset combo
                    AudioManager.playExplosion('large');
                    this.game.flashScreen('#ff4444');
                    this.game.screenShake.start(12, 300);
                    this.addNotification(`⚠️ BOSS ESCAPED! -2 HEALTH!`, 1.5, 1.4);
                }
            });
        }

        // Update projectiles
        this.projectileManager.update(dt);

        // Check projectile hits - actually destroy targets when projectiles collide
        const hits = this.projectileManager.checkHits();
        hits.forEach(hit => {
            const target = hit.target;

            // Spread projectile hits destroy regular obstacles on impact
            // (Bosses are not affected by spread - must type to destroy)
            if (hit.isSpreadHit && !target.isDestroyed) {
                target.pendingDestroy = true;
                this.destroyObstacle(target);
            }
            // Regular projectile hits (primary target)
            else if (target.pendingDestroy && !target.isDestroyed) {
                this.destroyObstacle(target);

                // Extra screen shake and sound for elite boss
                if (target.isEliteTarget || target.isElite) {
                    this.game.screenShake.start(15, 400);
                    AudioManager.playBossDestruction(); // Boss defeat sound!
                }
            }

            // Spawn hit particles at impact point
            const hitConfig = this.config.PARTICLES?.ENEMY_HIT || {};
            this.particles.explosion(
                hit.projectile.x, hit.projectile.y,
                {
                    count: hitConfig.count || 20,
                    colors: hitConfig.colors || ['#ff8844', '#ffcc00', '#ffffff'],
                    speed: hitConfig.speed || 250,
                    size: hitConfig.size || 8,
                    life: hitConfig.life || 0.5
                }
            );
            // Play metallic impact only for regular obstacles (not health bonuses or bosses)
            if (!target.isCollectible && !target.isElite) {
                AudioManager.playMetallicImpact();
            }
        });

        // Check collisions
        const collision = this.obstacleManager.checkCollision(this.player.getHitbox());
        if (collision && !collision.isDestroyed) {
            this.handleCollision(collision);
        }

        // Update current target (closest typeable obstacle)
        this.currentTargetObstacle = this.obstacleManager.getClosestTypeable();

        // Sync locked elite
        this.lockedElite = this.obstacleManager.lockedTarget;

        // Update notifications
        this.updateNotifications(dt);

        // Check victory
        this.checkVictory();
    }

    updatePowerUps(dt) {
        const powerUpConfig = this.config.COMBO?.POWER_UPS || {};

        // Power-ups stay active as long as combo is maintained at threshold
        // This rewards players with high accuracy - keep your combo, keep your weapon!
        // Hierarchy: Spread Shot (best) > Explosive > Rapid Fire

        // Spread Shot: active at 12+ combo (BEST weapon)
        const spreadReq = powerUpConfig.SPREAD_SHOT?.comboRequired || 12;
        this.powerUps.spreadShot.active = this.combo >= spreadReq;

        // Explosive: active at 8+ combo (but not if spread shot is better)
        const explosiveReq = powerUpConfig.EXPLOSIVE?.comboRequired || 8;
        this.powerUps.explosive.active = this.combo >= explosiveReq && this.combo < spreadReq;

        // Rapid Fire: active at 5+ combo (but not if better weapons are active)
        const rapidReq = powerUpConfig.RAPID_FIRE?.comboRequired || 5;
        this.powerUps.rapidFire.active = this.combo >= rapidReq && this.combo < explosiveReq;

        // Update weapon based on highest active power-up
        if (this.powerUps.spreadShot.active) {
            this.player.setWeapon('SPREAD_SHOT');
        } else if (this.powerUps.explosive.active) {
            this.player.setWeapon('EXPLOSIVE');
        } else if (this.powerUps.rapidFire.active) {
            this.player.setWeapon('RAPID_FIRE');
        } else {
            this.player.setWeapon('DEFAULT');
        }
    }

    handleCollision(obstacle) {
        if (obstacle.isCollectible) {
            // Auto-collect collectibles on touch
            this.destroyObstacle(obstacle);
        } else if (!this.player.isInvincible) {
            // Elite enemies deal extra damage!
            const isElite = obstacle.isElite;
            const damageAmount = isElite ? 2 : 1;

            // Deal damage
            for (let i = 0; i < damageAmount; i++) {
                this.player.takeDamage();
            }
            obstacle.isDestroyed = true;

            // Break elite lock on damage
            this.obstacleManager.breakLock();
            this.lockedElite = null;

            AudioManager.playExplosion(isElite ? 'large' : 'small');
            this.game.flashScreen('#ff4444');
            this.game.screenShake.start(isElite ? 15 : 8, isElite ? 400 : 200);

            // Show damage notification for elites
            if (isElite) {
                this.addNotification('💥 BOSS HIT! -2 HEALTH!', 1.5, 1.4);
            }

            // Reset combo
            this.combo = 0;
        }
    }

    completeWave() {
        this.isWaveTransitioning = true;
        this.waveTransitionTimer = 4; // Increased to allow notifications to fade

        // Wave bonus
        const waveBonus = this.currentWave * 300;
        this.score += waveBonus;

        // Clear remaining obstacles
        this.obstacleManager.clear();
        this.projectileManager.clear();

        // Calculate current stars and only show message if NEW star earned
        let currentStars = 0;
        if (this.currentWave >= 10) {
            currentStars = 3;
        } else if (this.currentWave >= 6) {
            currentStars = 2;
        } else if (this.currentWave >= 3) {
            currentStars = 1;
        }

        // Clear existing notifications before showing new ones
        this.notifications = [];
        this.notificationSlots = [];

        this.addNotification(`✨ WAVE ${this.currentWave} COMPLETE! +${waveBonus} ✨`, 2.5, 1.8, 0);

        // Only show star message if we earned a NEW star this wave
        if (currentStars > (this.lastEarnedStars || 0)) {
            const starTexts = ['', '⭐ 1 STAR EARNED!', '⭐⭐ 2 STARS EARNED!', '⭐⭐⭐ 3 STARS EARNED!'];
            this.lastEarnedStars = currentStars;
            setTimeout(() => {
                this.addNotification(starTexts[currentStars], 2.5, 1.6, 1);
            }, 400);
        }

        AudioManager.playLevelComplete();
        this.particles.confetti(0, 0, this.canvas.width, { count: 50 });
    }

    checkVictory() {
        // Game is endless - no automatic victory condition
        // Player chooses when to stop by pausing and quitting
        // Stars are awarded based on waves completed (3/6/10)
    }

    updateNotifications(dt) {
        this.notifications.forEach(n => {
            n.life -= dt;
            n.alpha = Math.min(1, n.life / 0.5);
            n.y -= dt * 15;

            // Free up slot when expired
            if (n.life <= 0 && n.slot !== undefined) {
                this.notificationSlots[n.slot] = false;
            }
        });

        this.notifications = this.notifications.filter(n => n.life > 0);
    }

    gameOver(victory) {
        this.state = victory ? 'victory' : 'gameover';

        // Calculate stars based on CUMULATIVE WAVES (matching asteroid defense)
        // This is checked on game over, whether victory or defeat
        let stars = 0;

        // Wave-based star system (matching asteroid defense)
        if (this.currentWave >= 10) {
            stars = 3;
        } else if (this.currentWave >= 6) {
            stars = 2;
        } else if (this.currentWave >= 3) {
            stars = 1;
        }

        // Player can get stars even if they died, as long as they reached enough waves
        if (stars > 0 && !victory) {
            // Override to partial victory if they earned stars
            victory = true;
            this.state = 'victory';
        }

        // Effects
        if (victory) {
            AudioManager.playLevelComplete();
            this.particles.confetti(0, 0, this.canvas.width, { count: 150 });

            this.particles.explosion(this.player.x + this.player.width / 2, this.player.y, {
                count: 50,
                colors: ['#ffd700', '#ffffff', '#00ffff'],
                speed: 200,
                size: 10,
                life: 1.5
            });
        } else {
            AudioManager.playGameOver();
            AudioManager.playRocketExploding();

            this.particles.explosion(this.player.x + this.player.width / 2, this.player.y + this.player.height / 2, {
                count: 60,
                colors: ['#ff4444', '#ff8844', '#ffcc00'],
                speed: 300,
                size: 12,
                life: 1
            });
            this.game.screenShake.start(20, 500);
        }

        // Update player stats
        const accuracy = this.correctCount / Math.max(this.correctCount + this.wrongCount, 1);
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
                wavesCompleted: this.currentWave - (this.isWaveTransitioning ? 0 : 1),
                timeElapsed: this.timeElapsed
            });
        }, victory ? 2000 : 1000);
    }

    draw(ctx) {
        // Draw background
        this.background.draw(ctx, this.groundY);

        // Draw obstacles
        this.obstacleManager.draw(ctx, this.groundY);

        // Draw wave finish flag
        if (this.waveFlag) {
            this.drawWaveFlag(ctx);
        }

        // Draw projectiles
        this.projectileManager.draw(ctx);

        // Draw player
        this.player.draw(ctx);

        // Draw UI
        this.drawUI(ctx);

        // Draw notifications
        this.drawNotifications(ctx);

        // Draw current letter/word hint
        this.drawLetterHint(ctx);
    }

    drawWaveFlag(ctx) {
        const flag = this.waveFlag;
        const x = flag.x;
        const y = flag.y;

        ctx.save();

        // Flag pole
        ctx.fillStyle = '#8B4513';
        ctx.fillRect(x, y, 8, 120);

        // Pole top ornament
        ctx.fillStyle = '#FFD700';
        ctx.beginPath();
        ctx.arc(x + 4, y - 5, 10, 0, Math.PI * 2);
        ctx.fill();

        // Checkered flag (waving)
        const flagWidth = 80;
        const flagHeight = 50;
        const waveAmount = Math.sin(flag.wavePhase) * 5;

        ctx.fillStyle = '#ffffff';
        ctx.fillRect(x + 10, y + 5 + waveAmount, flagWidth, flagHeight);

        // Draw checkered pattern
        const squareSize = 10;
        for (let row = 0; row < 5; row++) {
            for (let col = 0; col < 8; col++) {
                if ((row + col) % 2 === 0) {
                    ctx.fillStyle = '#000000';
                    const offsetY = Math.sin(flag.wavePhase + col * 0.3) * 3;
                    ctx.fillRect(
                        x + 10 + col * squareSize,
                        y + 5 + row * squareSize + waveAmount + offsetY,
                        squareSize,
                        squareSize
                    );
                }
            }
        }

        // "FINISH" text
        ctx.font = 'bold 16px "Orbitron", sans-serif';
        ctx.fillStyle = '#FFD700';
        ctx.textAlign = 'center';
        ctx.shadowColor = '#000000';
        ctx.shadowBlur = 5;
        ctx.fillText('FINISH', x + 50, y + flagHeight + 25 + waveAmount);

        ctx.restore();
    }

    drawUI(ctx) {
        // Health bar (top-left)
        this.drawHealthBar(ctx);

        // Score (top-right, moved to prevent overlap)
        this.drawScore(ctx);

        // Wave progress
        this.drawWaveProgress(ctx);

        // Combo display
        if (this.combo > 0) {
            this.drawCombo(ctx);
        }

        // Power-up indicators
        this.drawPowerUpIndicators(ctx);

        // Speed indicator
        this.drawSpeedIndicator(ctx);
    }

    drawHealthBar(ctx) {
        const x = 20;
        const y = 30;
        const heartSize = 40; // Much bigger hearts!
        const spacing = 45;

        ctx.save();

        // Track health changes for pulse animation
        if (this.lastHealth !== undefined && this.lastHealth !== this.player.health) {
            this.healthPulseTime = 0.5; // Start pulse animation for 0.5 seconds
            this.healthPulseDirection = this.player.health > this.lastHealth ? 'up' : 'down';
        }
        this.lastHealth = this.player.health;

        // Update pulse timer
        if (this.healthPulseTime > 0) {
            this.healthPulseTime -= 0.016; // Approximate frame time
        }

        for (let i = 0; i < this.player.config.MAX_HEALTH; i++) {
            const heartX = x + i * spacing;

            // Calculate pulse scale
            let scale = 1;
            if (this.healthPulseTime > 0) {
                const pulse = Math.sin(this.healthPulseTime * 20) * 0.15;
                scale = 1 + pulse;
            }

            const scaledSize = heartSize * scale;
            const offsetX = (scaledSize - heartSize) / 2;
            const offsetY = (scaledSize - heartSize) / 2;

            ctx.font = `${scaledSize}px Arial`;

            if (i < this.player.health) {
                ctx.fillStyle = '#ff4444';
                ctx.shadowColor = this.healthPulseDirection === 'up' ? '#44ff88' : '#ff4444';
                ctx.shadowBlur = 15 + (this.healthPulseTime > 0 ? 15 : 0);
                ctx.fillText('❤️', heartX - offsetX, y + heartSize + offsetY);
            } else {
                ctx.fillStyle = '#444444';
                ctx.shadowBlur = 0;
                ctx.font = `${heartSize}px Arial`; // No pulse for empty hearts
                ctx.fillText('🖤', heartX, y + heartSize);
            }
        }

        ctx.restore();
    }

    drawScore(ctx) {
        // Score in bottom-right corner to avoid overlap with health
        const x = this.canvas.width - 20;
        const y = this.canvas.height - 60;

        ctx.save();
        ctx.font = 'bold 20px "Orbitron", sans-serif';
        ctx.fillStyle = '#ffd700';
        ctx.textAlign = 'right';
        ctx.shadowColor = '#ffd700';
        ctx.shadowBlur = 8;
        ctx.fillText(`SCORE: ${this.score.toLocaleString()}`, x, y);
        ctx.restore();
    }

    drawWaveProgress(ctx) {
        const x = this.canvas.width - 150;
        const y = 25;
        const width = 130;
        const height = 12;

        ctx.save();

        // Label
        ctx.font = 'bold 12px "Orbitron", sans-serif';
        ctx.fillStyle = '#ffffff';
        ctx.textAlign = 'right';
        ctx.fillText(`WAVE ${this.currentWave}`, x + width, y - 5);

        // Background bar
        ctx.fillStyle = 'rgba(255, 255, 255, 0.2)';
        ctx.beginPath();
        ctx.roundRect(x, y, width, height, 4);
        ctx.fill();

        // Progress
        const progress = this.waveTimeElapsed / this.waveDuration;
        const gradient = ctx.createLinearGradient(x, y, x + width * progress, y);
        gradient.addColorStop(0, '#4488ff');
        gradient.addColorStop(1, '#00ffff');

        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.roundRect(x, y, width * progress, height, 4);
        ctx.fill();

        ctx.restore();
    }

    drawCombo(ctx) {
        // Combo in bottom-left (score is bottom-right)
        const x = 150;
        const y = this.canvas.height - 80;

        ctx.save();

        const scale = 1 + Math.min(0.3, this.combo * 0.015);
        ctx.translate(x, y);
        ctx.scale(scale, scale);

        // Glow effect for high combos
        if (this.combo >= 5) {
            ctx.shadowColor = '#ffd700';
            ctx.shadowBlur = 15;
        }

        ctx.font = 'bold 22px "Orbitron", sans-serif';
        ctx.textAlign = 'center';
        ctx.fillStyle = this.combo >= 5 ? '#ffd700' : '#ffffff';
        ctx.fillText(`${this.combo}x COMBO`, 0, 0);

        // Multiplier
        const multiplier = this.getComboMultiplier();
        if (multiplier > 1) {
            ctx.font = 'bold 12px "Orbitron", sans-serif';
            ctx.fillStyle = '#44ff88';
            ctx.fillText(`${multiplier.toFixed(1)}x SCORE`, 0, 16);
        }

        ctx.restore();
    }

    drawPowerUpIndicators(ctx) {
        const x = 20;
        let y = 85; // Below the enlarged health bar

        ctx.save();
        ctx.font = 'bold 14px "Orbitron", sans-serif';
        ctx.textAlign = 'left';

        // Show current active weapon (no timer since weapons are combo-based)
        if (this.powerUps.spreadShot.active) {
            ctx.fillStyle = '#ffcc00';
            ctx.shadowColor = '#ffcc00';
            ctx.shadowBlur = 10;
            ctx.fillText('🔥 SPREAD SHOT ACTIVE', x, y);
        } else if (this.powerUps.explosive.active) {
            ctx.fillStyle = '#ff6644';
            ctx.shadowColor = '#ff6644';
            ctx.shadowBlur = 10;
            ctx.fillText('💥 EXPLOSIVE ACTIVE', x, y);
        } else if (this.powerUps.rapidFire.active) {
            ctx.fillStyle = '#44ff88';
            ctx.shadowColor = '#44ff88';
            ctx.shadowBlur = 10;
            ctx.fillText('⚡ RAPID FIRE ACTIVE', x, y);
        }

        ctx.restore();
    }

    drawSpeedIndicator(ctx) {
        const x = 20;
        const y = this.canvas.height - 30;

        ctx.save();
        ctx.font = '12px "Orbitron", sans-serif';
        ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
        ctx.textAlign = 'left';
        ctx.fillText(`SPEED: ${Math.round(this.gameSpeed)}`, x, y);
        ctx.restore();
    }

    drawNotifications(ctx) {
        ctx.save();

        this.notifications.forEach(n => {
            ctx.globalAlpha = n.alpha;
            ctx.font = `bold ${Math.round(24 * n.scale)}px "Orbitron", sans-serif`;
            ctx.textAlign = 'center';

            // Text shadow
            ctx.fillStyle = '#000000';
            ctx.fillText(n.text, n.x + 2, n.y + 2);

            // Main text
            ctx.fillStyle = '#ffffff';
            ctx.shadowColor = '#ffd700';
            ctx.shadowBlur = 15;
            ctx.fillText(n.text, n.x, n.y);
        });

        ctx.restore();
    }

    drawLetterHint(ctx) {
        // If we have a locked elite, show the word progress
        if (this.lockedElite && !this.lockedElite.isDestroyed) {
            this.drawWordHint(ctx, this.lockedElite);
            return;
        }

        if (!this.currentTargetObstacle) return;

        const obstacle = this.currentTargetObstacle;
        const distance = obstacle.x - this.player.x;

        // Only show hint when obstacle is approaching
        if (distance > 400 || distance < 0) return;

        // If it's an elite, show word hint
        if (obstacle.isElite) {
            this.drawWordHint(ctx, obstacle);
            return;
        }

        // Regular letter hint
        const urgency = 1 - (distance / 400);

        ctx.save();

        const x = this.canvas.width / 2;
        const y = 150;

        // Background
        const alpha = 0.6 + urgency * 0.3;
        ctx.fillStyle = `rgba(0, 0, 0, ${alpha})`;
        ctx.beginPath();
        ctx.roundRect(x - 60, y - 25, 120, 50, 10);
        ctx.fill();

        // Border (color based on urgency)
        const borderColor = urgency > 0.7 ? '#ff4444' : urgency > 0.4 ? '#ffcc00' : '#44ff88';
        ctx.strokeStyle = borderColor;
        ctx.lineWidth = 2;
        ctx.stroke();

        // "Type:" label
        ctx.font = 'bold 12px "Orbitron", sans-serif';
        ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
        ctx.textAlign = 'center';
        ctx.fillText('SHOOT:', x, y - 5);

        // Letter
        ctx.font = 'bold 28px "Arial Black", sans-serif';
        ctx.fillStyle = '#ffd700';
        ctx.shadowColor = '#ffd700';
        ctx.shadowBlur = 10 + urgency * 10;
        ctx.fillText(obstacle.letter, x, y + 22);

        ctx.restore();
    }

    drawWordHint(ctx, elite) {
        const x = this.canvas.width / 2;
        const y = 150;

        ctx.save();

        const wordWidth = elite.word.length * 20 + 40;

        // Background
        ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
        ctx.beginPath();
        ctx.roundRect(x - wordWidth / 2, y - 30, wordWidth, 60, 10);
        ctx.fill();

        // Border (glowing when locked)
        ctx.strokeStyle = '#ffcc00';
        ctx.shadowColor = '#ffcc00';
        ctx.shadowBlur = 10;
        ctx.lineWidth = 2;
        ctx.stroke();
        ctx.shadowBlur = 0;

        // "TYPE WORD:" label
        ctx.font = 'bold 12px "Orbitron", sans-serif';
        ctx.fillStyle = '#ffcc00';
        ctx.textAlign = 'center';
        ctx.fillText('🎯 TYPE WORD:', x, y - 10);

        // Draw word with progress
        let letterX = x - (elite.word.length * 10) + 10;
        for (let i = 0; i < elite.word.length; i++) {
            const letter = elite.word[i];

            if (i < elite.typedIndex) {
                ctx.fillStyle = '#44ff88';
            } else if (i === elite.typedIndex) {
                ctx.fillStyle = '#ffd700';
                ctx.shadowColor = '#ffd700';
                ctx.shadowBlur = 10;
            } else {
                ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
                ctx.shadowBlur = 0;
            }

            ctx.font = i === elite.typedIndex ? 'bold 26px "Arial Black"' : 'bold 22px "Arial Black"';
            ctx.textAlign = 'center';
            ctx.fillText(letter, letterX, y + 18);

            letterX += 20;
            ctx.shadowBlur = 0;
        }

        ctx.restore();
    }

    // Required by main.js
    getHUD() {
        return {
            skipGlobalHUD: true, // Level draws its own HUD, skip global one
            score: this.score,
            combo: this.combo,
            timeRemaining: Math.max(0, this.waveDuration - this.waveTimeElapsed),
            wave: this.currentWave,
            health: this.player ? this.player.health : 0,
            maxHealth: this.player ? this.player.config.MAX_HEALTH : 5
        };
    }
}

// Make available globally
if (typeof window !== 'undefined') {
    window.RocketLaunchLevel = RocketLaunchLevel;
}
