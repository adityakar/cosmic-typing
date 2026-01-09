// ============================================
// COSMIC TYPER - Level 2: Cosmic Runner
// Background and Parallax Effects
// ============================================

class RocketRunnerBackground {
    constructor(canvas, config) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.config = config || RocketRunnerConfig;

        // Parallax star layers
        this.starLayers = [];
        this.initStarLayers();

        // Planets/moons in background
        this.planets = [];
        this.initPlanets();

        // Floating nebula clouds
        this.nebulas = [];
        this.initNebulas();

        // Ground tiles
        this.groundTiles = [];
        this.initGround();

        // Scroll offset (for ground parallax)
        this.scrollOffset = 0;
    }

    initStarLayers() {
        const layers = this.config.VISUALS.BACKGROUND_LAYERS;

        layers.forEach((layerConfig, layerIndex) => {
            const layer = {
                speed: layerConfig.speed,
                stars: []
            };

            for (let i = 0; i < layerConfig.stars; i++) {
                layer.stars.push({
                    x: Math.random() * this.canvas.width,
                    y: Math.random() * this.canvas.height,
                    size: layerConfig.starSize + Math.random() * 0.5,
                    twinklePhase: Math.random() * Math.PI * 2,
                    twinkleSpeed: 1 + Math.random() * 2,
                    color: this.getStarColor()
                });
            }

            this.starLayers.push(layer);
        });
    }

    getStarColor() {
        const colors = ['#ffffff', '#ffffcc', '#ccffff', '#ffccff', '#ccccff'];
        return colors[Math.floor(Math.random() * colors.length)];
    }

    initPlanets() {
        const planetColors = this.config.VISUALS.PLANET_COLORS;
        const numPlanets = 2 + Math.floor(Math.random() * 2);

        for (let i = 0; i < numPlanets; i++) {
            this.planets.push({
                x: Math.random() * this.canvas.width,
                y: Math.random() * this.canvas.height * 0.5,
                radius: 30 + Math.random() * 60,
                color: planetColors[Math.floor(Math.random() * planetColors.length)],
                ringColor: Math.random() > 0.7 ? planetColors[Math.floor(Math.random() * planetColors.length)] : null,
                speed: 0.05 + Math.random() * 0.1,
                hasRing: Math.random() > 0.6,
                glowIntensity: 0.3 + Math.random() * 0.4
            });
        }
    }

    initNebulas() {
        const numNebulas = 3 + Math.floor(Math.random() * 3);
        const nebulaColors = ['#ff6b6b44', '#4ecdc444', '#a06cd544', '#45b7d144', '#ff8c4244'];

        for (let i = 0; i < numNebulas; i++) {
            this.nebulas.push({
                x: Math.random() * this.canvas.width,
                y: Math.random() * this.canvas.height * 0.6,
                width: 150 + Math.random() * 200,
                height: 80 + Math.random() * 120,
                color: nebulaColors[Math.floor(Math.random() * nebulaColors.length)],
                speed: 0.02 + Math.random() * 0.05,
                rotation: Math.random() * Math.PI * 2,
                pulsePhase: Math.random() * Math.PI * 2
            });
        }
    }

    initGround() {
        const tileWidth = 100;
        const numTiles = Math.ceil(this.canvas.width / tileWidth) + 2;

        for (let i = 0; i < numTiles; i++) {
            this.groundTiles.push({
                x: i * tileWidth,
                width: tileWidth,
                // Variation in ground details
                hasRock: Math.random() > 0.7,
                rockX: Math.random() * (tileWidth - 20),
                rockSize: 5 + Math.random() * 10,
                hasCrater: Math.random() > 0.8,
                craterX: Math.random() * (tileWidth - 30),
                craterWidth: 15 + Math.random() * 20
            });
        }
    }

    update(dt, gameSpeed) {
        // Update scroll offset
        this.scrollOffset += gameSpeed * dt;

        // Update stars (parallax scrolling)
        this.starLayers.forEach(layer => {
            layer.stars.forEach(star => {
                star.x -= gameSpeed * layer.speed * dt;
                star.twinklePhase += star.twinkleSpeed * dt;

                // Wrap around
                if (star.x < -5) {
                    star.x = this.canvas.width + 5;
                    star.y = Math.random() * this.canvas.height;
                }
            });
        });

        // Update planets (very slow parallax)
        this.planets.forEach(planet => {
            planet.x -= gameSpeed * planet.speed * dt;

            // Wrap around
            if (planet.x < -planet.radius * 2) {
                planet.x = this.canvas.width + planet.radius * 2;
                planet.y = Math.random() * this.canvas.height * 0.5;
            }
        });

        // Update nebulas
        this.nebulas.forEach(nebula => {
            nebula.x -= gameSpeed * nebula.speed * dt;
            nebula.pulsePhase += dt * 0.5;

            // Wrap around
            if (nebula.x < -nebula.width) {
                nebula.x = this.canvas.width + nebula.width;
                nebula.y = Math.random() * this.canvas.height * 0.6;
            }
        });

        // Update ground tiles
        const tileWidth = this.groundTiles[0]?.width || 100;
        this.groundTiles.forEach(tile => {
            tile.x -= gameSpeed * dt;

            // Wrap around
            if (tile.x < -tileWidth) {
                // Find rightmost tile
                const maxX = Math.max(...this.groundTiles.map(t => t.x));
                tile.x = maxX + tileWidth;

                // Randomize details
                tile.hasRock = Math.random() > 0.7;
                tile.rockX = Math.random() * (tileWidth - 20);
                tile.rockSize = 5 + Math.random() * 10;
                tile.hasCrater = Math.random() > 0.8;
                tile.craterX = Math.random() * (tileWidth - 30);
                tile.craterWidth = 15 + Math.random() * 20;
            }
        });
    }

    draw(ctx, groundY) {
        // Draw sky gradient
        this.drawSkyGradient(ctx);

        // Draw nebulas (back layer)
        this.drawNebulas(ctx);

        // Draw planets
        this.drawPlanets(ctx);

        // Draw stars
        this.drawStars(ctx);

        // Draw ground
        this.drawGround(ctx, groundY);
    }

    drawSkyGradient(ctx) {
        const gradient = ctx.createLinearGradient(0, 0, 0, this.canvas.height);
        gradient.addColorStop(0, '#0a0a2e');
        gradient.addColorStop(0.4, '#1a1a4e');
        gradient.addColorStop(0.7, '#2a2a5e');
        gradient.addColorStop(1, '#1a1a3e');

        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    }

    drawNebulas(ctx) {
        ctx.save();

        this.nebulas.forEach(nebula => {
            const pulse = 0.8 + 0.2 * Math.sin(nebula.pulsePhase);

            ctx.save();
            ctx.translate(nebula.x + nebula.width / 2, nebula.y + nebula.height / 2);
            ctx.rotate(nebula.rotation);

            // Create radial gradient for nebula
            const gradient = ctx.createRadialGradient(
                0, 0, 0,
                0, 0, Math.max(nebula.width, nebula.height) / 2
            );
            gradient.addColorStop(0, nebula.color.replace('44', Math.round(68 * pulse).toString(16).padStart(2, '0')));
            gradient.addColorStop(0.5, nebula.color.replace('44', '22'));
            gradient.addColorStop(1, 'transparent');

            ctx.fillStyle = gradient;
            ctx.beginPath();
            ctx.ellipse(0, 0, nebula.width / 2, nebula.height / 2, 0, 0, Math.PI * 2);
            ctx.fill();

            ctx.restore();
        });

        ctx.restore();
    }

    drawPlanets(ctx) {
        this.planets.forEach(planet => {
            ctx.save();

            // Glow effect
            const glowGradient = ctx.createRadialGradient(
                planet.x, planet.y, planet.radius * 0.8,
                planet.x, planet.y, planet.radius * 1.5
            );
            glowGradient.addColorStop(0, planet.color + '44');
            glowGradient.addColorStop(1, 'transparent');
            ctx.fillStyle = glowGradient;
            ctx.beginPath();
            ctx.arc(planet.x, planet.y, planet.radius * 1.5, 0, Math.PI * 2);
            ctx.fill();

            // Planet body
            const bodyGradient = ctx.createRadialGradient(
                planet.x - planet.radius * 0.3,
                planet.y - planet.radius * 0.3,
                planet.radius * 0.1,
                planet.x, planet.y, planet.radius
            );
            bodyGradient.addColorStop(0, this.lightenColor(planet.color, 40));
            bodyGradient.addColorStop(0.7, planet.color);
            bodyGradient.addColorStop(1, this.darkenColor(planet.color, 40));

            ctx.fillStyle = bodyGradient;
            ctx.beginPath();
            ctx.arc(planet.x, planet.y, planet.radius, 0, Math.PI * 2);
            ctx.fill();

            // Ring (if has ring)
            if (planet.hasRing && planet.ringColor) {
                ctx.strokeStyle = planet.ringColor + '88';
                ctx.lineWidth = 4;
                ctx.beginPath();
                ctx.ellipse(planet.x, planet.y, planet.radius * 1.4, planet.radius * 0.3, 0.2, 0, Math.PI * 2);
                ctx.stroke();
            }

            ctx.restore();
        });
    }

    drawStars(ctx) {
        this.starLayers.forEach(layer => {
            layer.stars.forEach(star => {
                const twinkle = 0.5 + 0.5 * Math.sin(star.twinklePhase);

                ctx.save();
                ctx.globalAlpha = twinkle;

                // Star glow
                ctx.shadowColor = star.color;
                ctx.shadowBlur = star.size * 2;

                ctx.fillStyle = star.color;
                ctx.beginPath();
                ctx.arc(star.x, star.y, star.size, 0, Math.PI * 2);
                ctx.fill();

                ctx.restore();
            });
        });
    }

    drawGround(ctx, groundY) {
        const groundConfig = this.config.VISUALS;

        // Main ground fill
        ctx.fillStyle = groundConfig.GROUND_COLOR;
        ctx.fillRect(0, groundY, this.canvas.width, this.canvas.height - groundY);

        // Ground line (surface)
        ctx.strokeStyle = groundConfig.GROUND_LINE_COLOR;
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(0, groundY);
        ctx.lineTo(this.canvas.width, groundY);
        ctx.stroke();

        // Grid lines for depth effect
        ctx.strokeStyle = groundConfig.GROUND_ACCENT + '44';
        ctx.lineWidth = 1;

        // Horizontal lines
        for (let y = groundY + 20; y < this.canvas.height; y += 25) {
            const alpha = 1 - (y - groundY) / (this.canvas.height - groundY);
            ctx.globalAlpha = alpha * 0.5;
            ctx.beginPath();
            ctx.moveTo(0, y);
            ctx.lineTo(this.canvas.width, y);
            ctx.stroke();
        }
        ctx.globalAlpha = 1;

        // Ground details (rocks, craters)
        this.groundTiles.forEach(tile => {
            if (tile.hasRock) {
                ctx.fillStyle = '#4a4a6a';
                ctx.beginPath();
                ctx.arc(tile.x + tile.rockX, groundY + 5, tile.rockSize, Math.PI, 0);
                ctx.fill();
            }

            if (tile.hasCrater) {
                ctx.fillStyle = '#0a0a2e';
                ctx.beginPath();
                ctx.ellipse(
                    tile.x + tile.craterX + tile.craterWidth / 2,
                    groundY + 3,
                    tile.craterWidth / 2,
                    4,
                    0, 0, Math.PI
                );
                ctx.fill();
            }
        });
    }

    // Helper: lighten a hex color
    lightenColor(hex, amount) {
        const num = parseInt(hex.replace('#', ''), 16);
        const r = Math.min(255, (num >> 16) + amount);
        const g = Math.min(255, ((num >> 8) & 0x00FF) + amount);
        const b = Math.min(255, (num & 0x0000FF) + amount);
        return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, '0')}`;
    }

    // Helper: darken a hex color
    darkenColor(hex, amount) {
        const num = parseInt(hex.replace('#', ''), 16);
        const r = Math.max(0, (num >> 16) - amount);
        const g = Math.max(0, ((num >> 8) & 0x00FF) - amount);
        const b = Math.max(0, (num & 0x0000FF) - amount);
        return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, '0')}`;
    }

    // Resize handler
    resize(width, height) {
        this.canvas.width = width;
        this.canvas.height = height;

        // Reinitialize elements for new size
        this.starLayers = [];
        this.initStarLayers();
        this.groundTiles = [];
        this.initGround();
    }
}

// Make available globally
if (typeof window !== 'undefined') {
    window.RocketRunnerBackground = RocketRunnerBackground;
}
