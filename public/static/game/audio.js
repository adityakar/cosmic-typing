// ============================================
// COSMIC TYPER - Audio System
// Web Audio API based sound effects
// ============================================

class AudioManagerClass {
    constructor() {
        this.ctx = null;
        this.masterVolume = 0.5;
        this.sfxVolume = 0.7;
        this.musicVolume = 0.3;
        this.enabled = true;
        this.initialized = false;
    }
    
    // Initialize audio context (must be called after user interaction)
    init() {
        if (this.initialized) return;
        
        try {
            this.ctx = new (window.AudioContext || window.webkitAudioContext)();
            this.masterGain = this.ctx.createGain();
            this.masterGain.connect(this.ctx.destination);
            this.masterGain.gain.value = this.masterVolume;
            
            this.sfxGain = this.ctx.createGain();
            this.sfxGain.connect(this.masterGain);
            this.sfxGain.gain.value = this.sfxVolume;
            
            this.musicGain = this.ctx.createGain();
            this.musicGain.connect(this.masterGain);
            this.musicGain.gain.value = this.musicVolume;
            
            this.initialized = true;
        } catch (e) {
            console.warn('Web Audio API not supported');
            this.enabled = false;
        }
    }
    
    // Resume audio context (needed for some browsers)
    resume() {
        if (this.ctx && this.ctx.state === 'suspended') {
            this.ctx.resume();
        }
    }
    
    // Set volumes
    setMasterVolume(value) {
        this.masterVolume = value;
        if (this.masterGain) {
            this.masterGain.gain.value = value;
        }
    }
    
    setSfxVolume(value) {
        this.sfxVolume = value;
        if (this.sfxGain) {
            this.sfxGain.gain.value = value;
        }
    }
    
    setMusicVolume(value) {
        this.musicVolume = value;
        if (this.musicGain) {
            this.musicGain.gain.value = value;
        }
    }
    
    toggle() {
        this.enabled = !this.enabled;
        if (this.masterGain) {
            this.masterGain.gain.value = this.enabled ? this.masterVolume : 0;
        }
        return this.enabled;
    }
    
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
    
    // Play noise (for explosions, etc.)
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
        
        // Pleasant ding sound
        this.playTone(880, 0.15, 'sine', 0.3);
        setTimeout(() => this.playTone(1320, 0.1, 'sine', 0.2), 50);
    }
    
    // Wrong key press sound
    playWrong() {
        if (!this.enabled || !this.ctx) return;
        
        // Buzzer sound
        this.playTone(150, 0.2, 'square', 0.2);
        this.playTone(120, 0.15, 'square', 0.15);
    }
    
    // Laser shot sound
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
    
    // Explosion sound
    playExplosion(size = 'medium') {
        if (!this.enabled || !this.ctx) return;
        
        const durations = { small: 0.3, medium: 0.5, large: 0.8 };
        const duration = durations[size] || 0.5;
        
        // Low rumble
        this.playTone(60, duration, 'sine', 0.4);
        this.playTone(80, duration * 0.8, 'sine', 0.3);
        
        // Noise burst
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
        
        const notes = [523.25, 659.25, 783.99, 1046.50]; // C5, E5, G5, C6
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
            { freq: 392, delay: 0 },     // G4
            { freq: 523.25, delay: 150 }, // C5
            { freq: 659.25, delay: 300 }, // E5
            { freq: 783.99, delay: 450 }, // G5
            { freq: 1046.50, delay: 700 } // C6
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
    
    // Rocket boost sound
    playRocketBoost() {
        if (!this.enabled || !this.ctx) return;
        
        this.playNoise(0.2, 0.15);
        this.playTone(150, 0.2, 'sawtooth', 0.1);
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
    
    // Alarm sound (for low health, etc.)
    playAlarm() {
        if (!this.enabled || !this.ctx) return;
        
        this.playTone(440, 0.1, 'square', 0.15);
        setTimeout(() => this.playTone(349, 0.1, 'square', 0.15), 120);
    }
    
    // Hyper Laser sound - distinct high-energy beam
    playHyperLaser() {
        if (!this.enabled || !this.ctx) return;
        
        // Create multiple oscillators for a rich laser beam sound
        const osc1 = this.ctx.createOscillator();
        const osc2 = this.ctx.createOscillator();
        const osc3 = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        
        // High-pitched sweeping tone
        osc1.type = 'sawtooth';
        osc1.frequency.setValueAtTime(2000, this.ctx.currentTime);
        osc1.frequency.exponentialRampToValueAtTime(800, this.ctx.currentTime + 0.25);
        
        // Mid buzzing harmonic
        osc2.type = 'square';
        osc2.frequency.setValueAtTime(1500, this.ctx.currentTime);
        osc2.frequency.exponentialRampToValueAtTime(600, this.ctx.currentTime + 0.2);
        
        // Low power hum
        osc3.type = 'sine';
        osc3.frequency.setValueAtTime(300, this.ctx.currentTime);
        osc3.frequency.exponentialRampToValueAtTime(150, this.ctx.currentTime + 0.3);
        
        // Envelope with sustain then decay
        gain.gain.setValueAtTime(0, this.ctx.currentTime);
        gain.gain.linearRampToValueAtTime(0.4, this.ctx.currentTime + 0.02);
        gain.gain.setValueAtTime(0.35, this.ctx.currentTime + 0.1);
        gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.35);
        
        osc1.connect(gain);
        osc2.connect(gain);
        osc3.connect(gain);
        gain.connect(this.sfxGain);
        
        osc1.start();
        osc2.start();
        osc3.start();
        osc1.stop(this.ctx.currentTime + 0.35);
        osc2.stop(this.ctx.currentTime + 0.35);
        osc3.stop(this.ctx.currentTime + 0.35);
        
        // Add crackling noise for extra intensity
        this.playNoise(0.15, 0.2);
    }
    
    // Shield deflect sound
    playShieldDeflect() {
        if (!this.enabled || !this.ctx) return;
        
        // Resonant shield impact
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
        
        // Add harmonic shimmer
        setTimeout(() => {
            this.playTone(800, 0.15, 'sine', 0.2);
            this.playTone(1200, 0.1, 'sine', 0.15);
        }, 50);
    }
    
    // Shield activation sound
    playShieldActivate() {
        if (!this.enabled || !this.ctx) return;
        
        // Rising power-up with resonance
        const notes = [300, 400, 500, 700, 900];
        notes.forEach((freq, i) => {
            setTimeout(() => {
                this.playTone(freq, 0.2, 'sine', 0.25 - i * 0.03);
            }, i * 50);
        });
        
        // Add a sustained hum
        setTimeout(() => {
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            
            osc.type = 'sine';
            osc.frequency.value = 200;
            
            gain.gain.setValueAtTime(0.2, this.ctx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.5);
            
            osc.connect(gain);
            gain.connect(this.sfxGain);
            
            osc.start();
            osc.stop(this.ctx.currentTime + 0.5);
        }, 250);
    }
}

// Create global audio manager instance
const AudioManager = new AudioManagerClass();
window.AudioManager = AudioManager;
