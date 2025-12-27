# Cosmic Typer - Space Typing Adventure 🚀

A fun, engaging typing game designed for 7-year-old beginner typists with a beautiful space theme featuring ships, rockets, and asteroids!

## Production URL
🌐 **Live Game**: https://cosmic-typer.pages.dev

## GitHub Repository
📦 https://github.com/adityakar/cosmic-typing

## Features

### 🎮 Two Exciting Levels

#### Level 1: Asteroid Defense 🌍
- Letters fall as asteroids toward Earth
- Type the matching letter to aim and fire the laser cannon
- Beautiful particle explosions with screen shake effects
- Protect Earth's shield health bar
- **NEW**: Word-based typing mode - type real words, not just random letters!
- **NEW**: Power-up system unlocked by combos:
  - 🚀 **Mega Missile** (10 combo): AoE blast that destroys multiple asteroids
  - ⚡ **Hyper Laser** (15 combo): 3 instant-hit shots with no travel time
  - 🛡️ **Force Shield** (20 combo): Temporary invulnerability for Earth

#### Level 2: Rocket Launch 🚀
- Type letters to add fuel and launch your rocket to the moon
- Engine flames and particle effects for each correct keystroke
- Race against time through atmosphere to space
- **NEW**: Realistic gravity physics:
  - When fuel runs out, velocity decreases
  - When velocity hits zero, gravity pulls the rocket down
  - Must keep typing to avoid crashing back to Earth!
- Boost meter fills with combos for speed bursts

### 🧒 Child-Friendly Features

- **Word Dictionary System**: Uses age-appropriate 3-5 letter words familiar to 7-year-olds
  - Categories: Space, Animals, Food, Colors, Family, Nature, School
  - Themed words for the space adventure
  - Words shown at bottom of screen with progress highlighting
  
- **Clear, Readable Fonts**: 
  - Arial Black/Impact for asteroid letters - no confusion between C/U, O/D
  - Letters stay upright even as asteroids rotate

- **Extended Instructions**:
  - 3 seconds to read instructions before countdown
  - Tips displayed during 3-2-1-GO countdown
  - Level-specific guidance for each game

### 📊 Adaptive Learning

- Tracks letters the player struggles with
- Shows weak letters more frequently
- Difficulty adjusts based on accuracy:
  - High accuracy → faster asteroids, shorter spawn intervals
  - Low accuracy → slower pace, more time to react

### 🏆 Progression System

- Player profile saved to localStorage
- Star ratings (1-3) based on performance
- Achievements for combos (10, 25, 50 streak)
- Level unlocking as skills improve

### ✨ Visual Effects

- Beautiful starfield background with shooting stars
- Nebula clouds and twinkling stars
- Particle explosions (40+ particles per asteroid)
- Ring shockwave effects
- Screen shake on impacts
- Glowing projectiles with trails
- Combo counter with visual feedback

### 🔊 Sound Effects

- Laser pew-pew sounds
- Explosion effects (small, medium, large)
- Combo ding with increasing pitch
- Wrong key buzzer
- Power-up activation sounds
- Level complete fanfare

## Technical Stack

- **Frontend**: Vanilla JavaScript with HTML5 Canvas
- **Styling**: Custom CSS with space theme variables
- **Backend**: Hono framework (lightweight)
- **Deployment**: Cloudflare Pages
- **Storage**: localStorage for player data

## File Structure

```
webapp/
├── src/
│   └── index.tsx          # Main Hono app entry point
├── public/static/
│   ├── style.css          # Main stylesheet
│   └── game/
│       ├── utils.js       # Utility functions
│       ├── audio.js       # Sound effects (Web Audio API)
│       ├── particles.js   # Particle system
│       ├── player.js      # Player profile & persistence
│       ├── words.js       # Word dictionary for kids
│       ├── ui.js          # UI screens and menus
│       ├── main.js        # Game controller
│       └── levels/
│           ├── asteroid-defense.js
│           └── rocket-launch.js
├── ecosystem.config.cjs   # PM2 configuration
├── wrangler.jsonc         # Cloudflare config
└── package.json
```

## Recent Updates (v2.0)

1. **Improved Font Readability**: Changed asteroid letters from Orbitron to Arial Black/Impact
2. **Letters Stay Upright**: Asteroids rotate but letters remain readable
3. **Extended Instructions**: 3 seconds of tips before countdown starts
4. **Word Dictionary System**: Real words instead of random letters
5. **Power-Up System**: Missile AoE, Hyper Laser, Force Shield
6. **Gravity Physics**: Rocket falls when fuel runs out in Level 2
7. **Visual Enhancements**: Shield effects, falling warnings, velocity indicators

## Local Development

```bash
# Install dependencies
npm install

# Build the project
npm run build

# Run with wrangler
npm run preview

# Or use PM2 for development
pm2 start ecosystem.config.cjs
```

## Deployment

```bash
# Deploy to Cloudflare Pages
npm run deploy
```

## For Parents

This game helps children:
- Learn proper typing technique (home row keys first)
- Build muscle memory for common words
- Stay engaged with fun space theme and rewards
- Progress at their own pace with adaptive difficulty
- Feel accomplished with star ratings and achievements

The game tracks which letters your child struggles with and shows them more often to help them improve!

---

**Made with ❤️ for young space cadets learning to type!**
