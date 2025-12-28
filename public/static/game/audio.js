// ============================================
// COSMIC TYPER - Audio System
// Hybrid audio system:
// - HTML5 Audio for background music & voice
// - Web Audio API for low-latency sound effects
// ============================================

class AudioManagerClass {
    constructor() {
        // Web Audio API context
        this.ctx = null;
        this.masterGain = null;
        this.sfxGain = null;
        this.musicGain = null;
        
        // Volume settings
        this.masterVolume = 0.5;
        this.sfxVolume = 0.7;
        this.musicVolume = 0.35;  // Slightly louder background music
        
        // State
        this.enabled = true;
        this.initialized = false;
        this.audioUnlocked = false;
        this.musicPlaying = false;
        this.musicEnabled = true;  // User preference for music
        this.sfxEnabled = true;    // User preference for SFX
        
        // HTML5 Audio elements for music/voice
        this.backgroundMusic = null;
        this.welcomeVoice = null;
        this.welcomePlayed = false;
        this.welcomePlayedThisSession = false;  // Track per-session
        
        // Pre-decoded audio buffers for sound effects (Web Audio API)
        this.soundBuffers = {};
        this.soundsLoaded = false;
        
        // Warning alarm state (for looping)
        this.warningAlarm = null;
        this.warningAlarmPlaying = false;
        
        // Audio file paths
        this.audioFiles = {
            // Sound effects (will be decoded into buffers)
            hyperLaser: '/static/audio/hyper_laser.wav',
            megaMissile: '/static/audio/mega_missile.wav',
            orbitalBlast: '/static/audio/orbital_blast.wav',
            explosion1: '/static/audio/explosion_1.wav',
            explosion2: '/static/audio/explosion_2.wav',
            rocketBoost: '/static/audio/rocket_boost.wav',
            rocketExploding: '/static/audio/rocket_exploding.wav',
            warningAlarm: '/static/audio/warning_alarm.wav',
            // Music/voice (HTML5 Audio - streamed)
            // Using opus format for better compression and wide browser support
            backgroundMusic: '/static/audio/background_music.opus',
            welcome: '/static/audio/welcome.m4a'
        };
    }
    
    // Initialize audio context (must be called after user interaction)
    init() {
        if (this.initialized) return;
        
        try {
            // Create Web Audio API context
            this.ctx = new (window.AudioContext || window.webkitAudioContext)();
            
            // Create gain nodes
            this.masterGain = this.ctx.createGain();
            this.masterGain.connect(this.ctx.destination);
            this.masterGain.gain.value = this.masterVolume;
            
            this.sfxGain = this.ctx.createGain();
            this.sfxGain.connect(this.masterGain);
            this.sfxGain.gain.value = this.sfxVolume;
            
            this.musicGain = this.ctx.createGain();
            this.musicGain.connect(this.masterGain);
            this.musicGain.gain.value = this.musicVolume;
            
            // Setup HTML5 Audio for background music
            this.setupBackgroundMusic();
            
            // Setup HTML5 Audio for welcome voice
            this.setupWelcomeVoice();
            
            // Preload sound effect buffers
            this.preloadSoundEffects();
            
            this.initialized = true;
            console.log('Audio system initialized');
        } catch (e) {
            console.warn('Audio system initialization failed:', e);
            this.enabled = false;
        }
    }
    
    // Setup background music with HTML5 Audio
    setupBackgroundMusic() {
        this.backgroundMusic = new Audio(this.audioFiles.backgroundMusic);
        this.backgroundMusic.loop = true;
        this.backgroundMusic.volume = this.musicVolume * this.masterVolume;
        this.backgroundMusic.preload = 'auto';
        
        // Handle loading errors gracefully
        this.backgroundMusic.addEventListener('error', (e) => {
            console.warn('Background music failed to load:', e);
        });
        
        this.backgroundMusic.addEventListener('canplaythrough', () => {
            console.log('Background music ready');
        });
    }
    
    // Setup welcome voice with HTML5 Audio
    setupWelcomeVoice() {
        this.welcomeVoice = new Audio(this.audioFiles.welcome);
        this.welcomeVoice.volume = this.sfxVolume * this.masterVolume;
        this.welcomeVoice.preload = 'auto';
        
        this.welcomeVoice.addEventListener('error', (e) => {
            console.warn('Welcome voice failed to load:', e);
        });
    }
    
    // Preload and decode sound effects into audio buffers
    async preloadSoundEffects() {
        const effectFiles = {
            hyperLaser: this.audioFiles.hyperLaser,
            megaMissile: this.audioFiles.megaMissile,
            orbitalBlast: this.audioFiles.orbitalBlast,
            explosion1: this.audioFiles.explosion1,
            explosion2: this.audioFiles.explosion2,
            rocketBoost: this.audioFiles.rocketBoost,
            rocketExploding: this.audioFiles.rocketExploding,
            warningAlarm: this.audioFiles.warningAlarm
        };
        
        const loadPromises = Object.entries(effectFiles).map(async ([name, url]) => {
            try {
                const response = await fetch(url);
                if (!response.ok) throw new Error(`HTTP ${response.status}`);
                const arrayBuffer = await response.arrayBuffer();
                const audioBuffer = await this.ctx.decodeAudioData(arrayBuffer);
                this.soundBuffers[name] = audioBuffer;
                console.log(`Loaded sound: ${name}`);
            } catch (e) {
                console.warn(`Failed to load sound ${name}:`, e);
            }
        });
        
        await Promise.all(loadPromises);
        this.soundsLoaded = true;
        console.log('All sound effects loaded');
    }
    
    // Play a pre-decoded audio buffer (low latency)
    playBuffer(bufferName, volume = 1.0) {
        if (!this.enabled || !this.ctx || !this.soundBuffers[bufferName]) return;
        
        try {
            const source = this.ctx.createBufferSource();
            source.buffer = this.soundBuffers[bufferName];
            
            const gainNode = this.ctx.createGain();
            gainNode.gain.value = volume;
            
            source.connect(gainNode);
            gainNode.connect(this.sfxGain);
            
            source.start(0);
        } catch (e) {
            console.warn(`Error playing buffer ${bufferName}:`, e);
        }
    }
    
    // Resume audio context (needed after user interaction)
    resume() {
        if (this.ctx && this.ctx.state === 'suspended') {
            this.ctx.resume();
        }
    }
    
    // Unlock audio on first user interaction
    unlockAudio() {
        if (this.audioUnlocked) return;
        
        this.init();
        this.resume();
        this.audioUnlocked = true;
        
        // Start background music after unlocking (for menus)
        this.startBackgroundMusic();
        
        console.log('Audio unlocked by user interaction');
    }
    
    // Check if audio is unlocked
    isUnlocked() {
        return this.audioUnlocked;
    }
    
    // Start background music (call after audio is unlocked)
    startBackgroundMusic() {
        if (!this.enabled || !this.backgroundMusic || !this.musicEnabled) return;
        if (this.musicPlaying) return;  // Already playing
        
        // Only start if music is enabled
        if (this.musicVolume > 0) {
            this.backgroundMusic.play().then(() => {
                this.musicPlaying = true;
                console.log('Background music started');
            }).catch(e => {
                console.warn('Background music autoplay blocked:', e);
            });
        }
    }
    
    // Stop background music
    stopBackgroundMusic() {
        if (this.backgroundMusic) {
            this.backgroundMusic.pause();
            this.backgroundMusic.currentTime = 0;
            this.musicPlaying = false;
        }
    }
    
    // Pause background music (e.g., during gameplay)
    pauseBackgroundMusic() {
        if (this.backgroundMusic) {
            this.backgroundMusic.pause();
            // Note: Don't set musicPlaying to false so we know to resume
        }
    }
    
    // Resume background music
    resumeBackgroundMusic() {
        if (this.backgroundMusic && this.enabled && this.musicEnabled && this.musicVolume > 0) {
            this.backgroundMusic.play().then(() => {
                this.musicPlaying = true;
            }).catch(() => {});
        }
    }
    
    // Fade music volume for transitions
    fadeMusicVolume(targetVolume, duration = 500) {
        if (!this.backgroundMusic) return;
        
        const startVolume = this.backgroundMusic.volume;
        const volumeDiff = targetVolume - startVolume;
        const startTime = Date.now();
        
        const fade = () => {
            const elapsed = Date.now() - startTime;
            const progress = Math.min(elapsed / duration, 1);
            this.backgroundMusic.volume = startVolume + (volumeDiff * progress);
            
            if (progress < 1) {
                requestAnimationFrame(fade);
            }
        };
        
        fade();
    }
    
    // Enable/disable music
    setMusicEnabled(enabled) {
        this.musicEnabled = enabled;
        if (!enabled) {
            this.pauseBackgroundMusic();
        } else if (this.audioUnlocked) {
            this.startBackgroundMusic();
        }
    }
    
    // Enable/disable SFX
    setSfxEnabled(enabled) {
        this.sfxEnabled = enabled;
    }
    
    // Play welcome voice (only once per session, on first signup)
    playWelcome() {
        if (!this.enabled || !this.welcomeVoice || this.welcomePlayedThisSession) return;
        
        this.welcomePlayedThisSession = true;
        
        // Fade down background music during welcome
        const originalMusicVolume = this.backgroundMusic ? this.backgroundMusic.volume : 0;
        if (this.backgroundMusic && this.musicPlaying) {
            this.backgroundMusic.volume = originalMusicVolume * 0.3;
        }
        
        this.welcomeVoice.play().then(() => {
            console.log('Welcome voice playing');
        }).catch(e => {
            console.warn('Welcome voice playback failed:', e);
        });
        
        // Restore music volume after welcome finishes
        this.welcomeVoice.addEventListener('ended', () => {
            if (this.backgroundMusic && this.musicPlaying) {
                this.backgroundMusic.volume = originalMusicVolume;
            }
        }, { once: true });
    }
    
    // === VOLUME CONTROLS ===
    
    setMasterVolume(value) {
        this.masterVolume = value;
        if (this.masterGain) {
            this.masterGain.gain.value = value;
        }
        // Update HTML5 Audio volumes
        if (this.backgroundMusic) {
            this.backgroundMusic.volume = this.musicVolume * value;
        }
        if (this.welcomeVoice) {
            this.welcomeVoice.volume = this.sfxVolume * value;
        }
    }
    
    setSfxVolume(value) {
        this.sfxVolume = value;
        if (this.sfxGain) {
            this.sfxGain.gain.value = value;
        }
        if (this.welcomeVoice) {
            this.welcomeVoice.volume = value * this.masterVolume;
        }
    }
    
    setMusicVolume(value) {
        this.musicVolume = value;
        if (this.musicGain) {
            this.musicGain.gain.value = value;
        }
        if (this.backgroundMusic) {
            this.backgroundMusic.volume = value * this.masterVolume;
        }
    }
    
    toggle() {
        this.enabled = !this.enabled;
        if (this.masterGain) {
            this.masterGain.gain.value = this.enabled ? this.masterVolume : 0;
        }
        if (this.backgroundMusic) {
            if (this.enabled) {
                this.resumeBackgroundMusic();
            } else {
                this.pauseBackgroundMusic();
            }
        }
        return this.enabled;
    }
    
    // === SYNTHESIZED SOUNDS (fallbacks and basic effects) ===
    
    // Play a tone with envelope
    playTone(frequency, duration, type = 'sine', volume = 0.5) {
        if (!this.enabled || !this.ctx) return;
        
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        
        osc.type = type;
        osc.frequency.value = frequency;
        
        gain.gain.setValueAtTime(0, this.ctx.currentTime);
        gain.gain.linearRampToValueAtTime(volume, this.ctx.currentTime + 0.01);
        gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + duration);
        
        osc.connect(gain);
        gain.connect(this.sfxGain);
        
        osc.start(this.ctx.currentTime);
        osc.stop(this.ctx.currentTime + duration);
    }
    
    // Play noise (for fallback explosions, etc.)
    playNoise(duration, volume = 0.3) {
        if (!this.enabled || !this.ctx) return;
        
        const bufferSize = this.ctx.sampleRate * duration;
        const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
        const data = buffer.getChannelData(0);
        
        for (let i = 0; i < bufferSize; i++) {
            data[i] = Math.random() * 2 - 1;
        }
        
        const noise = this.ctx.createBufferSource();
        noise.buffer = buffer;
        
        const gain = this.ctx.createGain();
        gain.gain.setValueAtTime(volume, this.ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + duration);
        
        const filter = this.ctx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.value = 1000;
        
        noise.connect(filter);
        filter.connect(gain);
        gain.connect(this.sfxGain);
        
        noise.start();
    }
    
    // === SOUND EFFECTS ===
    
    // Correct key press sound
    playCorrect() {
        if (!this.enabled || !this.ctx) return;
        this.playTone(880, 0.15, 'sine', 0.3);
        setTimeout(() => this.playTone(1320, 0.1, 'sine', 0.2), 50);
    }
    
    // Wrong key press sound
    playWrong() {
        if (!this.enabled || !this.ctx) return;
        this.playTone(150, 0.2, 'square', 0.2);
        this.playTone(120, 0.15, 'square', 0.15);
    }
    
    // Laser shot sound (basic cannon)
    playLaser() {
        if (!this.enabled || !this.ctx) return;
        
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(1200, this.ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(100, this.ctx.currentTime + 0.15);
        
        gain.gain.setValueAtTime(0.3, this.ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.15);
        
        osc.connect(gain);
        gain.connect(this.sfxGain);
        
        osc.start();
        osc.stop(this.ctx.currentTime + 0.15);
    }
    
    // Explosion sound - NOW USES LOADED AUDIO FILES with randomization
    playExplosion(size = 'medium') {
        if (!this.enabled || !this.sfxEnabled) return;
        
        // Try to use loaded explosion sounds
        if (this.soundsLoaded && (this.soundBuffers.explosion1 || this.soundBuffers.explosion2)) {
            // Randomly choose between explosion1 and explosion2 for variety
            const explosionType = Math.random() < 0.5 ? 'explosion1' : 'explosion2';
            
            // Volume based on explosion size
            const volumes = { small: 0.5, medium: 0.7, large: 1.0 };
            const volume = volumes[size] || 0.7;
            
            this.playBuffer(explosionType, volume);
        } else {
            // Fallback to synthesized explosion
            this.playExplosionSynth(size);
        }
    }
    
    // Synthesized explosion fallback
    playExplosionSynth(size = 'medium') {
        if (!this.enabled || !this.ctx) return;
        
        const durations = { small: 0.3, medium: 0.5, large: 0.8 };
        const duration = durations[size] || 0.5;
        
        this.playTone(60, duration, 'sine', 0.4);
        this.playTone(80, duration * 0.8, 'sine', 0.3);
        this.playNoise(duration, 0.4);
    }
    
    // Combo sound (increasing pitch with combo count)
    playCombo(comboCount) {
        if (!this.enabled || !this.ctx) return;
        
        const baseFreq = 440;
        const freq = baseFreq * Math.pow(1.1, Math.min(comboCount, 10));
        
        this.playTone(freq, 0.1, 'sine', 0.3);
        setTimeout(() => this.playTone(freq * 1.5, 0.08, 'sine', 0.2), 30);
    }
    
    // Power up sound
    playPowerUp() {
        if (!this.enabled || !this.ctx) return;
        
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        
        osc.type = 'sine';
        osc.frequency.setValueAtTime(300, this.ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(1200, this.ctx.currentTime + 0.3);
        
        gain.gain.setValueAtTime(0.3, this.ctx.currentTime);
        gain.gain.linearRampToValueAtTime(0.4, this.ctx.currentTime + 0.15);
        gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.4);
        
        osc.connect(gain);
        gain.connect(this.sfxGain);
        
        osc.start();
        osc.stop(this.ctx.currentTime + 0.4);
    }
    
    // Achievement sound
    playAchievement() {
        if (!this.enabled || !this.ctx) return;
        
        const notes = [523.25, 659.25, 783.99, 1046.50];
        notes.forEach((freq, i) => {
            setTimeout(() => {
                this.playTone(freq, 0.3, 'sine', 0.3);
            }, i * 100);
        });
    }
    
    // Level complete fanfare
    playLevelComplete() {
        if (!this.enabled || !this.ctx) return;
        
        const notes = [
            { freq: 392, delay: 0 },
            { freq: 523.25, delay: 150 },
            { freq: 659.25, delay: 300 },
            { freq: 783.99, delay: 450 },
            { freq: 1046.50, delay: 700 }
        ];
        
        notes.forEach(({ freq, delay }) => {
            setTimeout(() => {
                this.playTone(freq, 0.4, 'sine', 0.3);
            }, delay);
        });
    }
    
    // Game over sound
    playGameOver() {
        if (!this.enabled || !this.ctx) return;
        
        const notes = [
            { freq: 392, delay: 0 },
            { freq: 349.23, delay: 200 },
            { freq: 329.63, delay: 400 },
            { freq: 261.63, delay: 600 }
        ];
        
        notes.forEach(({ freq, delay }) => {
            setTimeout(() => {
                this.playTone(freq, 0.5, 'sine', 0.25);
            }, delay);
        });
    }
    
    // Countdown beep
    playCountdown(final = false) {
        if (!this.enabled || !this.ctx) return;
        
        if (final) {
            this.playTone(880, 0.3, 'sine', 0.4);
            setTimeout(() => this.playTone(880, 0.3, 'sine', 0.3), 100);
        } else {
            this.playTone(440, 0.15, 'sine', 0.3);
        }
    }
    
    // Button click
    playClick() {
        if (!this.enabled || !this.ctx) return;
        this.playTone(600, 0.05, 'sine', 0.2);
    }
    
    // Hover sound
    playHover() {
        if (!this.enabled || !this.ctx) return;
        this.playTone(400, 0.03, 'sine', 0.1);
    }
    
    // Rocket boost sound - uses loaded audio file
    playRocketBoost() {
        if (!this.enabled || !this.sfxEnabled) return;
        
        if (this.soundsLoaded && this.soundBuffers.rocketBoost) {
            this.playBuffer('rocketBoost', 0.7);
        } else {
            // Fallback to synthesized version
            if (!this.ctx) return;
            this.playNoise(0.2, 0.15);
            this.playTone(150, 0.2, 'sawtooth', 0.1);
        }
    }
    
    // Rocket exploding sound - uses loaded audio file
    playRocketExploding() {
        if (!this.enabled || !this.sfxEnabled) return;
        
        if (this.soundsLoaded && this.soundBuffers.rocketExploding) {
            this.playBuffer('rocketExploding', 0.9);
        } else {
            // Fallback to large explosion
            this.playExplosion('large');
        }
    }
    
    // Start warning alarm loop (for low fuel, etc.)
    startWarningAlarm() {
        if (!this.enabled || !this.sfxEnabled || this.warningAlarmPlaying) return;
        
        this.warningAlarmPlaying = true;
        
        // Use HTML5 Audio for looping alarm
        if (!this.warningAlarm) {
            this.warningAlarm = new Audio(this.audioFiles.warningAlarm);
            this.warningAlarm.loop = true;
            this.warningAlarm.volume = this.sfxVolume * this.masterVolume * 0.6;
        }
        
        this.warningAlarm.play().catch(e => {
            console.warn('Warning alarm playback failed:', e);
        });
    }
    
    // Stop warning alarm loop
    stopWarningAlarm() {
        this.warningAlarmPlaying = false;
        
        if (this.warningAlarm) {
            this.warningAlarm.pause();
            this.warningAlarm.currentTime = 0;
        }
    }
    
    // Star collect sound
    playStarCollect() {
        if (!this.enabled || !this.ctx) return;
        
        this.playTone(1047, 0.08, 'sine', 0.25);
        setTimeout(() => this.playTone(1319, 0.08, 'sine', 0.2), 40);
        setTimeout(() => this.playTone(1568, 0.12, 'sine', 0.15), 80);
    }
    
    // Warning sound
    playWarning() {
        if (!this.enabled || !this.ctx) return;
        
        this.playTone(300, 0.1, 'square', 0.2);
        setTimeout(() => this.playTone(300, 0.1, 'square', 0.2), 150);
    }
    
    // Alarm sound
    playAlarm() {
        if (!this.enabled || !this.ctx) return;
        
        this.playTone(440, 0.1, 'square', 0.15);
        setTimeout(() => this.playTone(349, 0.1, 'square', 0.15), 120);
    }
    
    // === NEW WEAPON SOUNDS USING LOADED AUDIO FILES ===
    
    // Hyper Laser sound - uses loaded audio file
    playHyperLaser() {
        if (!this.enabled || !this.sfxEnabled) return;
        
        if (this.soundsLoaded && this.soundBuffers.hyperLaser) {
            this.playBuffer('hyperLaser', 0.85);
            console.log('Playing hyper laser sound from loaded buffer');
        } else {
            // Fallback to synthesized version
            this.playHyperLaserSynth();
            console.log('Playing hyper laser fallback');
        }
    }
    
    // Synthesized hyper laser fallback
    playHyperLaserSynth() {
        if (!this.enabled || !this.ctx) return;
        
        const osc1 = this.ctx.createOscillator();
        const osc2 = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        
        osc1.type = 'sawtooth';
        osc1.frequency.setValueAtTime(2000, this.ctx.currentTime);
        osc1.frequency.exponentialRampToValueAtTime(800, this.ctx.currentTime + 0.25);
        
        osc2.type = 'square';
        osc2.frequency.setValueAtTime(1500, this.ctx.currentTime);
        osc2.frequency.exponentialRampToValueAtTime(600, this.ctx.currentTime + 0.2);
        
        gain.gain.setValueAtTime(0, this.ctx.currentTime);
        gain.gain.linearRampToValueAtTime(0.4, this.ctx.currentTime + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.35);
        
        osc1.connect(gain);
        osc2.connect(gain);
        gain.connect(this.sfxGain);
        
        osc1.start();
        osc2.start();
        osc1.stop(this.ctx.currentTime + 0.35);
        osc2.stop(this.ctx.currentTime + 0.35);
        
        this.playNoise(0.15, 0.2);
    }
    
    // Mega Missile sound - uses loaded audio file
    playMegaMissile() {
        if (!this.enabled || !this.sfxEnabled) return;
        
        if (this.soundsLoaded && this.soundBuffers.megaMissile) {
            this.playBuffer('megaMissile', 0.85);
            console.log('Playing mega missile sound from loaded buffer');
        } else {
            // Fallback: use power up + explosion
            this.playPowerUp();
            console.log('Playing mega missile fallback');
        }
    }
    
    // Orbital Strike/Blast sound - uses loaded audio file
    playOrbitalBlast() {
        if (!this.enabled || !this.sfxEnabled) return;
        
        if (this.soundsLoaded && this.soundBuffers.orbitalBlast) {
            this.playBuffer('orbitalBlast', 1.0);
            console.log('Playing orbital blast sound from loaded buffer');
        } else {
            // Fallback: large explosion
            this.playExplosionSynth('large');
            console.log('Playing orbital blast fallback');
        }
    }
    
    // Shield deflect sound
    playShieldDeflect() {
        if (!this.enabled || !this.ctx) return;
        
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        
        osc.type = 'sine';
        osc.frequency.setValueAtTime(600, this.ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(200, this.ctx.currentTime + 0.3);
        
        gain.gain.setValueAtTime(0.35, this.ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.3);
        
        osc.connect(gain);
        gain.connect(this.sfxGain);
        
        osc.start();
        osc.stop(this.ctx.currentTime + 0.3);
        
        setTimeout(() => {
            this.playTone(800, 0.15, 'sine', 0.2);
            this.playTone(1200, 0.1, 'sine', 0.15);
        }, 50);
    }
    
    // Shield activation sound
    playShieldActivate() {
        if (!this.enabled || !this.ctx) return;
        
        const notes = [300, 400, 500, 700, 900];
        notes.forEach((freq, i) => {
            setTimeout(() => {
                this.playTone(freq, 0.2, 'sine', 0.25 - i * 0.03);
            }, i * 50);
        });
    }
}

// Create global audio manager instance
const AudioManager = new AudioManagerClass();
window.AudioManager = AudioManager;
