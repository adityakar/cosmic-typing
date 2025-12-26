// ============================================
// COSMIC TYPER - Utility Functions
// ============================================

const Utils = {
    // Random number between min and max (inclusive)
    random: (min, max) => Math.random() * (max - min) + min,
    
    // Random integer between min and max (inclusive)
    randomInt: (min, max) => Math.floor(Math.random() * (max - min + 1)) + min,
    
    // Random item from array
    randomChoice: (arr) => arr[Math.floor(Math.random() * arr.length)],
    
    // Shuffle array
    shuffle: (arr) => {
        const newArr = [...arr];
        for (let i = newArr.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [newArr[i], newArr[j]] = [newArr[j], newArr[i]];
        }
        return newArr;
    },
    
    // Clamp value between min and max
    clamp: (value, min, max) => Math.max(min, Math.min(max, value)),
    
    // Linear interpolation
    lerp: (start, end, t) => start + (end - start) * t,
    
    // Ease out quad
    easeOutQuad: (t) => t * (2 - t),
    
    // Ease in out quad
    easeInOutQuad: (t) => t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t,
    
    // Ease out elastic
    easeOutElastic: (t) => {
        const p = 0.3;
        return Math.pow(2, -10 * t) * Math.sin((t - p / 4) * (2 * Math.PI) / p) + 1;
    },
    
    // Ease out bounce
    easeOutBounce: (t) => {
        if (t < 1 / 2.75) {
            return 7.5625 * t * t;
        } else if (t < 2 / 2.75) {
            return 7.5625 * (t -= 1.5 / 2.75) * t + 0.75;
        } else if (t < 2.5 / 2.75) {
            return 7.5625 * (t -= 2.25 / 2.75) * t + 0.9375;
        } else {
            return 7.5625 * (t -= 2.625 / 2.75) * t + 0.984375;
        }
    },
    
    // Distance between two points
    distance: (x1, y1, x2, y2) => Math.sqrt((x2 - x1) ** 2 + (y2 - y1) ** 2),
    
    // Angle between two points
    angle: (x1, y1, x2, y2) => Math.atan2(y2 - y1, x2 - x1),
    
    // Convert degrees to radians
    degToRad: (deg) => deg * Math.PI / 180,
    
    // Convert radians to degrees
    radToDeg: (rad) => rad * 180 / Math.PI,
    
    // HSL to RGB
    hslToRgb: (h, s, l) => {
        let r, g, b;
        if (s === 0) {
            r = g = b = l;
        } else {
            const hue2rgb = (p, q, t) => {
                if (t < 0) t += 1;
                if (t > 1) t -= 1;
                if (t < 1/6) return p + (q - p) * 6 * t;
                if (t < 1/2) return q;
                if (t < 2/3) return p + (q - p) * (2/3 - t) * 6;
                return p;
            };
            const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
            const p = 2 * l - q;
            r = hue2rgb(p, q, h + 1/3);
            g = hue2rgb(p, q, h);
            b = hue2rgb(p, q, h - 1/3);
        }
        return [Math.round(r * 255), Math.round(g * 255), Math.round(b * 255)];
    },
    
    // Format number with commas
    formatNumber: (num) => num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ","),
    
    // Format time (seconds to MM:SS)
    formatTime: (seconds) => {
        const mins = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    },
    
    // Debounce function
    debounce: (func, wait) => {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    },
    
    // Check if device is mobile
    isMobile: () => {
        return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    },
    
    // Get letter groups by difficulty
    getLettersByDifficulty: (difficulty) => {
        // Home row keys (easiest)
        const homeRow = ['A', 'S', 'D', 'F', 'J', 'K', 'L'];
        // Top row keys (medium)
        const topRow = ['Q', 'W', 'E', 'R', 'T', 'Y', 'U', 'I', 'O', 'P'];
        // Bottom row keys (harder)
        const bottomRow = ['Z', 'X', 'C', 'V', 'B', 'N', 'M'];
        // Index finger keys (easier reach)
        const indexKeys = ['F', 'G', 'H', 'J', 'R', 'T', 'Y', 'U', 'V', 'B', 'N', 'M'];
        
        switch (difficulty) {
            case 'beginner':
                return homeRow;
            case 'easy':
                return [...homeRow, ...indexKeys.filter(k => !homeRow.includes(k))];
            case 'medium':
                return [...homeRow, ...topRow];
            case 'hard':
                return [...homeRow, ...topRow, ...bottomRow];
            default:
                return homeRow;
        }
    },
    
    // Words by difficulty (for word-based levels)
    getWordsByDifficulty: (difficulty, count = 10) => {
        const easyWords = [
            'CAT', 'DOG', 'SUN', 'FUN', 'RUN', 'HAT', 'BAT', 'RAT',
            'MAP', 'TAP', 'JAM', 'HAM', 'BIG', 'DIG', 'PIG', 'JIG',
            'HOT', 'POT', 'DOT', 'GOT', 'BUS', 'CUP', 'MUG', 'HUG',
            'BED', 'RED', 'PEN', 'HEN', 'TEN', 'MEN', 'SIT', 'HIT'
        ];
        
        const mediumWords = [
            'STAR', 'MOON', 'SHIP', 'FIRE', 'JUMP', 'SPIN', 'FAST',
            'ZOOM', 'BOOM', 'ROCK', 'DUST', 'GLOW', 'BEAM', 'WAVE',
            'HERO', 'FUEL', 'TANK', 'WING', 'LAND', 'LIFT', 'DASH',
            'SPACE', 'EARTH', 'ALIEN', 'ROBOT', 'LASER', 'BLAST'
        ];
        
        const hardWords = [
            'ROCKET', 'PLANET', 'GALAXY', 'COMET', 'NEBULA', 'COSMOS',
            'METEOR', 'SATURN', 'JUPITER', 'MISSION', 'LAUNCH', 'ORBIT',
            'SHUTTLE', 'ASTEROID', 'CAPTAIN', 'EXPLORER', 'ADVENTURE'
        ];
        
        let wordList;
        switch (difficulty) {
            case 'beginner':
            case 'easy':
                wordList = easyWords;
                break;
            case 'medium':
                wordList = [...easyWords, ...mediumWords];
                break;
            case 'hard':
                wordList = [...mediumWords, ...hardWords];
                break;
            default:
                wordList = easyWords;
        }
        
        return Utils.shuffle(wordList).slice(0, count);
    }
};

// Animation frame manager for consistent timing
class AnimationManager {
    constructor() {
        this.animations = new Map();
        this.idCounter = 0;
    }
    
    // Add a new animation
    add(duration, updateFn, completeFn = null, easeFn = Utils.easeOutQuad) {
        const id = ++this.idCounter;
        this.animations.set(id, {
            startTime: performance.now(),
            duration,
            updateFn,
            completeFn,
            easeFn
        });
        return id;
    }
    
    // Remove an animation
    remove(id) {
        this.animations.delete(id);
    }
    
    // Update all animations
    update(currentTime) {
        for (const [id, anim] of this.animations) {
            const elapsed = currentTime - anim.startTime;
            const progress = Math.min(elapsed / anim.duration, 1);
            const easedProgress = anim.easeFn(progress);
            
            anim.updateFn(easedProgress);
            
            if (progress >= 1) {
                if (anim.completeFn) anim.completeFn();
                this.animations.delete(id);
            }
        }
    }
    
    // Clear all animations
    clear() {
        this.animations.clear();
    }
}

// Screen shake effect
class ScreenShake {
    constructor() {
        this.intensity = 0;
        this.duration = 0;
        this.startTime = 0;
        this.offsetX = 0;
        this.offsetY = 0;
    }
    
    start(intensity, duration) {
        this.intensity = intensity;
        this.duration = duration;
        this.startTime = performance.now();
    }
    
    update(currentTime) {
        if (this.intensity === 0) return;
        
        const elapsed = currentTime - this.startTime;
        if (elapsed >= this.duration) {
            this.intensity = 0;
            this.offsetX = 0;
            this.offsetY = 0;
            return;
        }
        
        const progress = elapsed / this.duration;
        const currentIntensity = this.intensity * (1 - progress);
        
        this.offsetX = (Math.random() - 0.5) * 2 * currentIntensity;
        this.offsetY = (Math.random() - 0.5) * 2 * currentIntensity;
    }
    
    apply(ctx) {
        ctx.translate(this.offsetX, this.offsetY);
    }
}

// Export utilities
window.Utils = Utils;
window.AnimationManager = AnimationManager;
window.ScreenShake = ScreenShake;
