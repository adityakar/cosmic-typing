// ============================================
// COSMIC TYPER - Level 2: Cosmic Runner
// Constants and Game Configuration
// ============================================

const RocketRunnerConfig = {
    // === GAME MECHANICS ===
    GAME: {
        GROUND_Y_PERCENT: 0.75,          // Ground level as % of canvas height
        START_SPEED: 100,                 // Very slow start for kids
        MAX_SPEED: 400,                   // Maximum scroll speed
        SPEED_INCREASE_RATE: 2,           // Slower speed increase per second

        // Wave system
        WAVE_DURATION: 25,                // Seconds per wave
        WAVES_FOR_1_STAR: 3,              // Waves 1-3: Easy (1 star) - easier to achieve!
        WAVES_FOR_2_STARS: 6,             // Waves 4-6: Medium (2 stars)
        WAVES_FOR_3_STARS: 10,            // Waves 7-10: Challenging (3 stars)

        // Elite spawn timing
        ELITE_FIRST_WAVE: 2,              // First wave with elite enemies
        ELITE_SPAWN_CHANCE: 0.12,          // Base chance per spawn (lowered)

        // Wave-based difficulty scaling
        WAVE_SCALING: {
            // Waves 1-6: Gentle curve (kid-friendly, achieve 2 stars)
            EASY_WAVES: 6,
            SPEED_SCALE_EASY: 0.08,       // 8% faster each wave (1-6)
            SPAWN_SCALE_EASY: 0.10,       // 10% faster spawns each wave (1-6)
            ELITE_SCALE_EASY: 0.02,       // +2% elite chance each wave
            // Waves 7+: Much steeper curve (3 stars is HARD!)
            SPEED_SCALE_HARD: 0.25,       // 25% faster each wave (7+)
            SPAWN_SCALE_HARD: 0.30,       // 30% faster spawns each wave (7+)
            ELITE_SCALE_HARD: 0.05        // +5% elite chance each wave
        }
    },

    // === PLAYER (ROBOT RUNNER) ===
    PLAYER: {
        WIDTH: 60,
        HEIGHT: 80,
        X_POSITION: 0.15,                 // X position as % of canvas width

        // Physics - tuned for easier jumping at slow speeds
        GRAVITY: 1400,                    // Reduced from 1800 for longer hang time
        JUMP_VELOCITY: -700,              // Increased for higher jumps
        DOUBLE_JUMP_VELOCITY: -550,       // Increased second jump
        MAX_JUMPS: 2,                     // Allow double jump

        // Health
        MAX_HEALTH: 5,
        INVINCIBILITY_DURATION: 1.5,      // Seconds of invincibility after hit

        // Animation
        RUN_FRAME_DURATION: 0.1,          // Seconds per animation frame
        COLORS: {
            body: '#4488ff',
            accent: '#00ffff',
            visor: '#44ff88',
            jetpack: '#ff6600'
        },

        // Weapon position (relative to player)
        GUN_OFFSET_X: 45,
        GUN_OFFSET_Y: 25
    },

    // === WEAPON SYSTEM ===
    WEAPONS: {
        DEFAULT: {
            name: 'Laser Blaster',
            projectileSpeed: 800,         // Pixels per second
            projectileSize: 8,
            projectileColor: '#00ffff',
            projectileGlow: '#4488ff',
            muzzleFlashSize: 20,
            muzzleFlashDuration: 0.08,
            recoilAmount: 3,
            recoilRecovery: 0.2
        },
        RAPID_FIRE: {
            name: 'Rapid Fire',
            projectileSpeed: 1000,        // Super fast!
            projectileSize: 5,
            projectileColor: '#44ff88',   // Green lasers
            projectileGlow: '#00ff44',
            muzzleFlashSize: 15,
            muzzleFlashDuration: 0.05,
            recoilAmount: 2,
            duration: 6
        },
        SPREAD_SHOT: {
            name: 'Spread Shot',
            projectileSpeed: 700,
            projectileSize: 6,
            projectileColor: '#ffcc00',   // Orange/yellow
            projectileGlow: '#ff8800',
            spreadCount: 3,               // Hits 3 targets
            muzzleFlashSize: 25,
            muzzleFlashDuration: 0.1,
            recoilAmount: 4,
            duration: 8
        },
        EXPLOSIVE: {
            name: 'Explosive Rounds',
            projectileSpeed: 600,
            projectileSize: 14,           // Big rounds
            projectileColor: '#ff4444',   // Red/orange
            projectileGlow: '#ff8800',
            explosionRadius: 120,         // AoE damage radius
            muzzleFlashSize: 30,
            muzzleFlashDuration: 0.12,
            recoilAmount: 6,
            duration: 6
        }
    },

    // === PROJECTILES ===
    PROJECTILES: {
        TRAIL_LENGTH: 8,
        TRAIL_FADE: 0.7,
        HIT_PARTICLES: 15,
        HIT_PARTICLE_SPEED: 200,
        HIT_PARTICLE_SIZE: 6,
        HIT_PARTICLE_LIFE: 0.4
    },

    // === OBSTACLES ===
    OBSTACLES: {
        // Spawn rates (seconds between spawns) - increased for kids
        MIN_SPAWN_INTERVAL: 1.8,          // More time between obstacles
        MAX_SPAWN_INTERVAL: 3.0,

        // Types and their properties
        TYPES: {
            // Ground obstacles - must be jumped OR typed
            ROCK: {
                name: 'Space Rock',
                width: 50,
                height: 45,
                color: '#8B4513',
                accentColor: '#A0522D',
                points: 100,
                isGround: true,
                canJump: true,
                canType: true
            },
            CRATER: {
                name: 'Crater',
                width: 80,
                height: 30,
                color: '#2d1f4e',
                accentColor: '#4a2c7a',
                points: 150,
                isGround: true,
                canJump: true,
                canType: true       // Now typeable - players can choose to type or jump
            },
            // Flying obstacles - must be ducked OR typed
            DRONE: {
                name: 'Enemy Drone',
                width: 55,
                height: 40,
                color: '#ff4444',
                accentColor: '#ff8800',
                points: 150,
                isGround: false,
                flyHeight: 120,     // Pixels above ground
                canJump: false,     // Can't jump over (too high)
                canType: true
            },
            // Collectibles - type to collect bonus
            FUEL_CELL: {
                name: 'Fuel Cell',
                width: 40,
                height: 40,
                color: '#44ff88',
                accentColor: '#00ff44',
                points: 200,
                isGround: false,
                flyHeight: 80,
                canJump: false,
                canType: true,
                isCollectible: true,
                bonusHealth: 1
            }
        },

        // Difficulty scaling per wave
        WAVE_SCALING: {
            spawnRateMultiplier: 0.9,     // Spawn faster each wave
            speedMultiplier: 1.15,        // Obstacles move faster each wave
            multiObstacleChance: 0.1      // Chance of spawning 2 at once (increases)
        }
    },

    // === ELITE ENEMIES (Word Typing) ===
    ELITE_ENEMIES: {
        MECH: {
            name: 'Battle Mech',
            width: 80,
            height: 90,
            color: '#8844aa',
            accentColor: '#aa66cc',
            glowColor: '#cc88ff',
            points: 500,
            isGround: true,
            speedMultiplier: 0.6,         // Moves slower than normal

            // Word lists by difficulty
            words: {
                beginner: ['CAT', 'DOG', 'SUN', 'RUN', 'FUN', 'HAT', 'BAT', 'RED', 'BIG', 'TOP'],
                easy: ['STAR', 'MOON', 'BEAM', 'FIRE', 'JUMP', 'ROCK', 'SHIP', 'FAST', 'ZOOM', 'BOOM'],
                medium: ['LASER', 'ROBOT', 'SPACE', 'POWER', 'BLAST', 'COSMIC', 'TURBO', 'HYPER'],
                hard: ['PLASMA', 'PHOTON', 'THRUST', 'QUANTUM', 'FUSION', 'ORBITAL', 'STELLAR']
            }
        },
        ELITE_DRONE: {
            name: 'Elite Drone',
            width: 70,
            height: 55,
            color: '#ff6644',
            accentColor: '#ff9966',
            glowColor: '#ffaa88',
            points: 400,
            isGround: false,
            flyHeight: 110,
            speedMultiplier: 0.7,

            words: {
                beginner: ['GO', 'UP', 'ZAP', 'BOP', 'POP', 'WOW', 'YAY'],
                easy: ['ZOOM', 'BEEP', 'BUZZ', 'ZEST', 'GLOW', 'WHIZ'],
                medium: ['SPARK', 'FLASH', 'BLITZ', 'DRONE', 'HOVER'],
                hard: ['VOLTAGE', 'CIRCUIT', 'BEACON', 'PHOTONIC']
            }
        }
    },

    // === VISUAL EFFECTS ===
    VISUALS: {
        // Background layers (parallax)
        BACKGROUND_LAYERS: [
            { speed: 0.1, stars: 50, starSize: 1 },      // Distant stars
            { speed: 0.2, stars: 30, starSize: 2 },      // Mid stars
            { speed: 0.4, stars: 15, starSize: 3 }       // Near stars
        ],

        // Planet colors
        PLANET_COLORS: [
            '#ff6b6b', '#ffd93d', '#4ecdc4', '#a06cd5', '#ff8c42',
            '#45b7d1', '#96ceb4', '#ff7f50', '#87ceeb'
        ],

        // Ground
        GROUND_COLOR: '#1a1a3e',
        GROUND_ACCENT: '#2d2d5a',
        GROUND_LINE_COLOR: '#4a4a8a',

        // Letter display
        LETTER_GLOW_COLOR: '#ffd700',
        LETTER_SIZE: 28,
        LETTER_FONT: '"Arial Black", "Orbitron", sans-serif',

        // Word display (for elite enemies)
        WORD_FONT_SIZE: 18,
        WORD_TYPED_COLOR: '#44ff88',
        WORD_REMAINING_COLOR: '#ffffff',
        WORD_BG_COLOR: 'rgba(0, 0, 0, 0.7)'
    },

    // === PARTICLES ===
    PARTICLES: {
        MUZZLE_FLASH: {
            count: 8,
            speed: 150,
            size: 8,
            life: 0.15,
            colors: ['#ffffff', '#00ffff', '#4488ff']
        },
        PROJECTILE_TRAIL: {
            count: 2,
            size: 4,
            life: 0.2,
            fade: true
        },
        ENEMY_HIT: {
            count: 20,
            speed: 250,
            size: 8,
            life: 0.5,
            colors: ['#ff8844', '#ffcc00', '#ffffff']
        },
        ELITE_EXPLODE: {
            count: 40,
            speed: 350,
            size: 12,
            life: 0.8,
            colors: ['#ff4444', '#ff8844', '#ffcc00', '#ffffff'],
            screenShake: 12
        },
        WORD_LETTER_HIT: {
            count: 6,
            speed: 100,
            size: 5,
            life: 0.3,
            colors: ['#44ff88', '#00ffcc']
        }
    },

    // === AUDIO CUES ===
    AUDIO: {
        JUMP_SOUND: 'rocket_boost',
        SHOOT_SOUND: 'laser_1',           // Placeholder
        HIT_SOUND: 'hit_1',               // Placeholder
        LOCK_SOUND: 'lock_1',             // Placeholder (word targeting)
        DESTROY_SOUND: 'explosion_1',
        ELITE_DESTROY_SOUND: 'explosion_2',
        COLLECT_SOUND: 'correct',
        WAVE_COMPLETE_SOUND: 'level_complete',
        POWERUP_SOUND: 'power_up'
    },

    // === COMBO SYSTEM ===
    COMBO: {
        MULTIPLIER_THRESHOLDS: [5, 10, 15, 25],  // Combo counts for multiplier boosts
        MAX_MULTIPLIER: 4,
        DECAY_TIME: 3,                            // Seconds before combo resets without input

        // Power-ups unlocked by combo
        // Spread Shot is the best weapon, unlocked at highest combo
        POWER_UPS: {
            RAPID_FIRE: { comboRequired: 5, icon: '⚡' },
            EXPLOSIVE: { comboRequired: 8, icon: '💥' },
            SPREAD_SHOT: { comboRequired: 12, icon: '🔥' }
        }
    },

    // === DIFFICULTY PRESETS ===
    DIFFICULTY: {
        beginner: {
            startSpeed: 120,
            maxSpeed: 280,
            spawnIntervalMultiplier: 1.4,
            letterTimeout: 4000,
            healthBonus: 2,
            eliteSpawnChance: 0.08
        },
        easy: {
            startSpeed: 140,
            maxSpeed: 320,
            spawnIntervalMultiplier: 1.2,
            letterTimeout: 3500,
            healthBonus: 1,
            eliteSpawnChance: 0.12
        },
        medium: {
            startSpeed: 160,
            maxSpeed: 380,
            spawnIntervalMultiplier: 1.0,
            letterTimeout: 3000,
            healthBonus: 0,
            eliteSpawnChance: 0.15
        },
        hard: {
            startSpeed: 180,
            maxSpeed: 440,
            spawnIntervalMultiplier: 0.8,
            letterTimeout: 2500,
            healthBonus: 0,
            eliteSpawnChance: 0.20
        }
    }
};

// Make available globally
if (typeof window !== 'undefined') {
    window.RocketRunnerConfig = RocketRunnerConfig;
}
