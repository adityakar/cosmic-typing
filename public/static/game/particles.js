// ============================================
// COSMIC TYPER - Particle System
// Beautiful particle effects for the game
// ============================================

// Individual particle class
class Particle {
    constructor(x, y, options = {}) {
        this.x = x;
        this.y = y;
        this.vx = options.vx || 0;
        this.vy = options.vy || 0;
        this.ax = options.ax || 0;
        this.ay = options.ay || 0;
        this.life = options.life || 1;
        this.maxLife = this.life;
        this.size = options.size || 5;
        this.startSize = this.size;
        this.endSize = options.endSize || 0;
        this.color = options.color || '#ffffff';
        this.endColor = options.endColor || this.color;
        this.shape = options.shape || 'circle'; // circle, square, star, triangle
        this.rotation = options.rotation || 0;
        this.rotationSpeed = options.rotationSpeed || 0;
        this.alpha = options.alpha || 1;
        this.fadeOut = options.fadeOut !== false;
        this.gravity = options.gravity || 0;
        this.friction = options.friction || 1;
        this.glow = options.glow || false;
        this.glowSize = options.glowSize || 10;
        this.trail = options.trail || false;
        this.trailLength = options.trailLength || 5;
        this.trailHistory = [];
    }
    
    update(dt) {
        // Store trail position
        if (this.trail) {
            this.trailHistory.push({ x: this.x, y: this.y });
            if (this.trailHistory.length > this.trailLength) {
                this.trailHistory.shift();
            }
        }
        
        // Apply acceleration
        this.vx += this.ax * dt;
        this.vy += this.ay * dt;
        
        // Apply gravity
        this.vy += this.gravity * dt;
        
        // Apply friction
        this.vx *= this.friction;
        this.vy *= this.friction;
        
        // Update position
        this.x += this.vx * dt;
        this.y += this.vy * dt;
        
        // Update rotation
        this.rotation += this.rotationSpeed * dt;
        
        // Update life
        this.life -= dt;
        
        // Update size based on life
        const lifeProgress = 1 - (this.life / this.maxLife);
        this.size = Utils.lerp(this.startSize, this.endSize, lifeProgress);
        
        // Update alpha
        if (this.fadeOut) {
            this.alpha = this.life / this.maxLife;
        }
        
        return this.life > 0;
    }
    
    draw(ctx) {
        if (this.alpha <= 0) return;
        
        ctx.save();
        ctx.globalAlpha = this.alpha;
        
        // Draw trail
        if (this.trail && this.trailHistory.length > 1) {
            ctx.beginPath();
            ctx.moveTo(this.trailHistory[0].x, this.trailHistory[0].y);
            for (let i = 1; i < this.trailHistory.length; i++) {
                ctx.lineTo(this.trailHistory[i].x, this.trailHistory[i].y);
            }
            ctx.lineTo(this.x, this.y);
            ctx.strokeStyle = this.color;
            ctx.lineWidth = this.size * 0.5;
            ctx.lineCap = 'round';
            ctx.stroke();
        }
        
        // Draw glow
        if (this.glow && this.size > 0) {
            const gradient = ctx.createRadialGradient(this.x, this.y, 0, this.x, this.y, this.size + this.glowSize);
            gradient.addColorStop(0, this.color);
            gradient.addColorStop(0.4, this.color);
            gradient.addColorStop(1, 'transparent');
            ctx.fillStyle = gradient;
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.size + this.glowSize, 0, Math.PI * 2);
            ctx.fill();
        }
        
        ctx.translate(this.x, this.y);
        ctx.rotate(this.rotation);
        ctx.fillStyle = this.color;
        
        switch (this.shape) {
            case 'circle':
                ctx.beginPath();
                ctx.arc(0, 0, this.size, 0, Math.PI * 2);
                ctx.fill();
                break;
                
            case 'square':
                ctx.fillRect(-this.size, -this.size, this.size * 2, this.size * 2);
                break;
                
            case 'star':
                this.drawStar(ctx, 0, 0, 5, this.size, this.size * 0.5);
                break;
                
            case 'triangle':
                ctx.beginPath();
                ctx.moveTo(0, -this.size);
                ctx.lineTo(-this.size * 0.866, this.size * 0.5);
                ctx.lineTo(this.size * 0.866, this.size * 0.5);
                ctx.closePath();
                ctx.fill();
                break;
                
            case 'spark':
                ctx.beginPath();
                ctx.moveTo(-this.size, 0);
                ctx.lineTo(this.size, 0);
                ctx.moveTo(0, -this.size);
                ctx.lineTo(0, this.size);
                ctx.strokeStyle = this.color;
                ctx.lineWidth = 2;
                ctx.stroke();
                break;
        }
        
        ctx.restore();
    }
    
    drawStar(ctx, cx, cy, spikes, outerRadius, innerRadius) {
        let rot = Math.PI / 2 * 3;
        let x = cx;
        let y = cy;
        const step = Math.PI / spikes;
        
        ctx.beginPath();
        ctx.moveTo(cx, cy - outerRadius);
        
        for (let i = 0; i < spikes; i++) {
            x = cx + Math.cos(rot) * outerRadius;
            y = cy + Math.sin(rot) * outerRadius;
            ctx.lineTo(x, y);
            rot += step;
            
            x = cx + Math.cos(rot) * innerRadius;
            y = cy + Math.sin(rot) * innerRadius;
            ctx.lineTo(x, y);
            rot += step;
        }
        
        ctx.lineTo(cx, cy - outerRadius);
        ctx.closePath();
        ctx.fill();
    }
}

// Particle emitter - manages groups of particles
class ParticleEmitter {
    constructor() {
        this.particles = [];
    }
    
    // Add a single particle
    addParticle(particle) {
        this.particles.push(particle);
    }
    
    // Update all particles
    update(dt) {
        this.particles = this.particles.filter(p => p.update(dt));
    }
    
    // Draw all particles
    draw(ctx) {
        this.particles.forEach(p => p.draw(ctx));
    }
    
    // Clear all particles
    clear() {
        this.particles = [];
    }
    
    // Get particle count
    get count() {
        return this.particles.length;
    }
    
    // === EFFECT PRESETS ===
    
    // Explosion effect
    explosion(x, y, options = {}) {
        const count = options.count || 30;
        const colors = options.colors || ['#ff6b6b', '#ffd93d', '#ff8c42', '#ffffff'];
        const speed = options.speed || 300;
        const size = options.size || 8;
        const life = options.life || 1;
        
        for (let i = 0; i < count; i++) {
            const angle = (Math.PI * 2 / count) * i + Utils.random(-0.3, 0.3);
            const velocity = Utils.random(speed * 0.5, speed);
            
            this.addParticle(new Particle(x, y, {
                vx: Math.cos(angle) * velocity,
                vy: Math.sin(angle) * velocity,
                life: Utils.random(life * 0.5, life),
                size: Utils.random(size * 0.5, size),
                endSize: 0,
                color: Utils.randomChoice(colors),
                shape: Utils.randomChoice(['circle', 'square', 'triangle']),
                rotation: Utils.random(0, Math.PI * 2),
                rotationSpeed: Utils.random(-5, 5),
                friction: 0.98,
                glow: true,
                glowSize: 5
            }));
        }
    }
    
    // Sparkle explosion (for achievements, combos)
    sparkleExplosion(x, y, options = {}) {
        const count = options.count || 20;
        const colors = options.colors || ['#ffd700', '#ffffff', '#ffeb3b', '#ffc107'];
        const speed = options.speed || 200;
        
        for (let i = 0; i < count; i++) {
            const angle = Utils.random(0, Math.PI * 2);
            const velocity = Utils.random(speed * 0.3, speed);
            
            this.addParticle(new Particle(x, y, {
                vx: Math.cos(angle) * velocity,
                vy: Math.sin(angle) * velocity,
                life: Utils.random(0.5, 1),
                size: Utils.random(3, 6),
                endSize: 0,
                color: Utils.randomChoice(colors),
                shape: 'star',
                rotationSpeed: Utils.random(-10, 10),
                friction: 0.96,
                glow: true,
                glowSize: 8
            }));
        }
    }
    
    // Laser trail effect
    laserTrail(x1, y1, x2, y2, color = '#00ffff') {
        const distance = Utils.distance(x1, y1, x2, y2);
        const angle = Utils.angle(x1, y1, x2, y2);
        const count = Math.floor(distance / 10);
        
        for (let i = 0; i < count; i++) {
            const t = i / count;
            const px = Utils.lerp(x1, x2, t);
            const py = Utils.lerp(y1, y2, t);
            
            this.addParticle(new Particle(px + Utils.random(-5, 5), py + Utils.random(-5, 5), {
                vx: Utils.random(-20, 20),
                vy: Utils.random(-20, 20),
                life: Utils.random(0.2, 0.4),
                size: Utils.random(2, 4),
                endSize: 0,
                color: color,
                glow: true,
                glowSize: 6
            }));
        }
    }
    
    // Fire/thrust effect
    fire(x, y, direction, options = {}) {
        const count = options.count || 5;
        const colors = options.colors || ['#ff6b6b', '#ffd93d', '#ff8c42'];
        const speed = options.speed || 100;
        const spread = options.spread || 0.5;
        
        for (let i = 0; i < count; i++) {
            const angle = direction + Utils.random(-spread, spread);
            const velocity = Utils.random(speed * 0.5, speed);
            
            this.addParticle(new Particle(x + Utils.random(-5, 5), y + Utils.random(-5, 5), {
                vx: Math.cos(angle) * velocity,
                vy: Math.sin(angle) * velocity,
                life: Utils.random(0.3, 0.6),
                size: Utils.random(5, 10),
                endSize: 0,
                color: Utils.randomChoice(colors),
                glow: true,
                glowSize: 8,
                friction: 0.95
            }));
        }
    }
    
    // Smoke effect
    smoke(x, y, options = {}) {
        const count = options.count || 3;
        const color = options.color || 'rgba(150, 150, 150, 0.5)';
        
        for (let i = 0; i < count; i++) {
            this.addParticle(new Particle(x + Utils.random(-10, 10), y + Utils.random(-10, 10), {
                vx: Utils.random(-30, 30),
                vy: Utils.random(-80, -40),
                life: Utils.random(1, 2),
                size: Utils.random(10, 20),
                endSize: Utils.random(30, 50),
                color: color,
                friction: 0.98,
                gravity: -20
            }));
        }
    }
    
    // Star burst (for correct answers)
    starBurst(x, y, color = '#ffd700') {
        const count = 8;
        
        for (let i = 0; i < count; i++) {
            const angle = (Math.PI * 2 / count) * i;
            
            this.addParticle(new Particle(x, y, {
                vx: Math.cos(angle) * 150,
                vy: Math.sin(angle) * 150,
                life: 0.5,
                size: 6,
                endSize: 0,
                color: color,
                shape: 'star',
                rotationSpeed: 5,
                glow: true,
                glowSize: 10,
                friction: 0.92
            }));
        }
    }
    
    // Ring expansion effect
    ring(x, y, options = {}) {
        const count = options.count || 24;
        const color = options.color || '#00ffff';
        const speed = options.speed || 200;
        
        for (let i = 0; i < count; i++) {
            const angle = (Math.PI * 2 / count) * i;
            
            this.addParticle(new Particle(x, y, {
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed,
                life: 0.6,
                size: 4,
                endSize: 1,
                color: color,
                glow: true,
                glowSize: 6,
                friction: 0.95
            }));
        }
    }
    
    // Confetti effect (for celebrations)
    confetti(x, y, width, options = {}) {
        const count = options.count || 50;
        const colors = options.colors || ['#ff6b6b', '#ffd93d', '#4ecdc4', '#a06cd5', '#00d4ff'];
        
        for (let i = 0; i < count; i++) {
            this.addParticle(new Particle(
                x + Utils.random(0, width),
                y,
                {
                    vx: Utils.random(-100, 100),
                    vy: Utils.random(-300, -100),
                    life: Utils.random(2, 4),
                    size: Utils.random(4, 8),
                    endSize: Utils.random(2, 4),
                    color: Utils.randomChoice(colors),
                    shape: Utils.randomChoice(['square', 'circle', 'triangle']),
                    rotation: Utils.random(0, Math.PI * 2),
                    rotationSpeed: Utils.random(-10, 10),
                    gravity: 200,
                    friction: 0.99
                }
            ));
        }
    }
    
    // Floating particles (ambient effect)
    floatingParticle(x, y, options = {}) {
        const colors = options.colors || ['rgba(255, 255, 255, 0.5)', 'rgba(100, 150, 255, 0.5)'];
        
        this.addParticle(new Particle(x, y, {
            vx: Utils.random(-10, 10),
            vy: Utils.random(-30, -10),
            life: Utils.random(3, 6),
            size: Utils.random(1, 3),
            endSize: 0,
            color: Utils.randomChoice(colors),
            glow: true,
            glowSize: 4,
            friction: 0.999
        }));
    }
    
    // Impact ripple effect
    impactRipple(x, y, color = '#ffffff') {
        for (let i = 0; i < 3; i++) {
            setTimeout(() => {
                this.ring(x, y, {
                    count: 16 + i * 8,
                    color: color,
                    speed: 100 + i * 50
                });
            }, i * 100);
        }
    }
    
    // Text pop effect (when letters are typed)
    textPop(x, y, letter, color = '#ffd700') {
        // Main letter particle
        this.addParticle(new Particle(x, y, {
            vy: -100,
            life: 0.8,
            size: 30,
            endSize: 0,
            color: color,
            friction: 0.95,
            glow: true,
            glowSize: 15
        }));
        
        // Surrounding sparkles
        this.sparkleExplosion(x, y, {
            count: 8,
            colors: [color, '#ffffff'],
            speed: 100
        });
    }
}

// Background starfield
class Starfield {
    constructor(canvas) {
        this.canvas = canvas;
        this.stars = [];
        this.nebulas = [];
        this.shootingStars = [];
        this.lastShootingStar = 0;
        this.init();
    }
    
    init() {
        // Create stars
        const starCount = Math.floor((this.canvas.width * this.canvas.height) / 3000);
        for (let i = 0; i < starCount; i++) {
            this.stars.push({
                x: Math.random() * this.canvas.width,
                y: Math.random() * this.canvas.height,
                size: Math.random() * 2 + 0.5,
                brightness: Math.random(),
                twinkleSpeed: Math.random() * 2 + 1,
                twinkleOffset: Math.random() * Math.PI * 2
            });
        }
        
        // Create nebula clouds
        for (let i = 0; i < 3; i++) {
            this.nebulas.push({
                x: Math.random() * this.canvas.width,
                y: Math.random() * this.canvas.height,
                radius: Math.random() * 300 + 200,
                color: Utils.randomChoice([
                    'rgba(74, 26, 107, 0.1)',
                    'rgba(139, 26, 107, 0.08)',
                    'rgba(26, 26, 107, 0.1)',
                    'rgba(107, 26, 74, 0.08)'
                ])
            });
        }
    }
    
    resize(width, height) {
        // Reposition stars for new dimensions
        this.stars.forEach(star => {
            star.x = Math.random() * width;
            star.y = Math.random() * height;
        });
        
        this.nebulas.forEach(nebula => {
            nebula.x = Math.random() * width;
            nebula.y = Math.random() * height;
        });
    }
    
    update(dt, currentTime) {
        // Update star twinkle
        this.stars.forEach(star => {
            star.currentBrightness = 0.3 + 0.7 * (0.5 + 0.5 * Math.sin(currentTime * star.twinkleSpeed / 1000 + star.twinkleOffset));
        });
        
        // Spawn shooting stars occasionally
        if (currentTime - this.lastShootingStar > 5000 && Math.random() < 0.01) {
            this.spawnShootingStar();
            this.lastShootingStar = currentTime;
        }
        
        // Update shooting stars
        this.shootingStars = this.shootingStars.filter(star => {
            star.x += star.vx * dt;
            star.y += star.vy * dt;
            star.life -= dt;
            
            // Add to trail
            star.trail.push({ x: star.x, y: star.y });
            if (star.trail.length > 20) star.trail.shift();
            
            return star.life > 0;
        });
    }
    
    spawnShootingStar() {
        const startX = Math.random() * this.canvas.width;
        const startY = Math.random() * this.canvas.height * 0.3;
        const angle = Utils.random(Math.PI * 0.1, Math.PI * 0.4);
        const speed = Utils.random(500, 800);
        
        this.shootingStars.push({
            x: startX,
            y: startY,
            vx: Math.cos(angle) * speed,
            vy: Math.sin(angle) * speed,
            life: Utils.random(1, 2),
            trail: []
        });
    }
    
    draw(ctx) {
        // Draw nebulas
        this.nebulas.forEach(nebula => {
            const gradient = ctx.createRadialGradient(
                nebula.x, nebula.y, 0,
                nebula.x, nebula.y, nebula.radius
            );
            gradient.addColorStop(0, nebula.color);
            gradient.addColorStop(1, 'transparent');
            
            ctx.fillStyle = gradient;
            ctx.fillRect(nebula.x - nebula.radius, nebula.y - nebula.radius, nebula.radius * 2, nebula.radius * 2);
        });
        
        // Draw stars
        this.stars.forEach(star => {
            ctx.save();
            ctx.globalAlpha = star.currentBrightness || star.brightness;
            ctx.fillStyle = '#ffffff';
            ctx.beginPath();
            ctx.arc(star.x, star.y, star.size, 0, Math.PI * 2);
            ctx.fill();
            
            // Add glow to brighter stars
            if (star.size > 1.5) {
                const gradient = ctx.createRadialGradient(star.x, star.y, 0, star.x, star.y, star.size * 3);
                gradient.addColorStop(0, 'rgba(255, 255, 255, 0.3)');
                gradient.addColorStop(1, 'transparent');
                ctx.fillStyle = gradient;
                ctx.beginPath();
                ctx.arc(star.x, star.y, star.size * 3, 0, Math.PI * 2);
                ctx.fill();
            }
            ctx.restore();
        });
        
        // Draw shooting stars
        this.shootingStars.forEach(star => {
            if (star.trail.length < 2) return;
            
            ctx.save();
            ctx.globalAlpha = star.life;
            
            // Draw trail
            ctx.beginPath();
            ctx.moveTo(star.trail[0].x, star.trail[0].y);
            for (let i = 1; i < star.trail.length; i++) {
                ctx.lineTo(star.trail[i].x, star.trail[i].y);
            }
            ctx.lineTo(star.x, star.y);
            
            const gradient = ctx.createLinearGradient(
                star.trail[0].x, star.trail[0].y,
                star.x, star.y
            );
            gradient.addColorStop(0, 'transparent');
            gradient.addColorStop(1, 'rgba(255, 255, 255, 0.8)');
            
            ctx.strokeStyle = gradient;
            ctx.lineWidth = 2;
            ctx.lineCap = 'round';
            ctx.stroke();
            
            // Draw head
            ctx.fillStyle = '#ffffff';
            ctx.beginPath();
            ctx.arc(star.x, star.y, 3, 0, Math.PI * 2);
            ctx.fill();
            
            ctx.restore();
        });
    }
}

// Export
window.Particle = Particle;
window.ParticleEmitter = ParticleEmitter;
window.Starfield = Starfield;
