# 🚀 Cosmic Typer - Space Typing Adventure

An engaging, beautiful, and educational typing game designed for children (especially 7-year-olds) to improve their typing skills through fun, space-themed gameplay!

## 🌟 Features

### Currently Completed
- **Two Exciting Levels**:
  - **🌍 Asteroid Defense**: Protect Earth from falling letter asteroids! Type the correct letter to aim and fire your laser cannon at incoming asteroids. Beautiful explosion effects and particle systems!
  - **🚀 Rocket Launch**: Type letters to fuel your rocket and race to the moon! Watch your rocket blast off with realistic fire effects!

- **Player Profile System**:
  - Saves player name and progress in localStorage
  - Tracks typing accuracy, speed (WPM), and skill level
  - Per-letter performance tracking to focus practice on weak areas

- **Adaptive Difficulty**:
  - Initial skill assessment when starting
  - Four difficulty levels: Beginner, Easy, Medium, Hard
  - Real-time difficulty adjustment based on recent performance
  - Letter selection prioritizes letters the player struggles with

- **Gamification**:
  - Star rating system (1-3 stars per level)
  - Achievement system with unlockable badges
  - Combo system with multipliers
  - Level progression and unlocking
  - Score tracking and high scores

- **Beautiful Visuals**:
  - Animated starfield with twinkling stars
  - Shooting stars and nebula effects
  - Particle effects for explosions, laser trails, rocket flames
  - Screen shake effects for impact
  - Modern, space-themed UI with glow effects

- **Sound Effects**:
  - Web Audio API-based synthesized sounds
  - Laser shots, explosions, combos
  - Achievement fanfares
  - Wrong key buzzer

### Levels Overview

| Level | Name | Description | Status |
|-------|------|-------------|--------|
| 1 | Asteroid Defense | Type letters to shoot falling asteroids | ✅ Complete |
| 2 | Rocket Launch | Type to fuel rocket and reach the moon | ✅ Complete |
| 3 | Space Race | Race through an asteroid field | 🔜 Coming Soon |
| 4 | Robot Builder | Build robots with typing commands | 🔜 Coming Soon |

### Not Yet Implemented
- Space Race level (asteroid dodging with word typing)
- Robot Builder level (command typing)
- Background music
- Mobile touch keyboard support
- Leaderboards

## 🎮 How to Play

1. **Enter your name** when first starting the game
2. **Complete the skill assessment** - type the letters shown to calibrate difficulty
3. **Select a mission** from the level select screen
4. **Type the letters** shown on screen as quickly and accurately as you can!
5. **Build combos** by typing correctly in a row for bonus points
6. **Earn stars** by completing levels with high accuracy

### Controls
- **A-Z Keys**: Type the displayed letters
- **Escape**: Pause the game

## 🔗 URLs

- **Game URL**: https://3000-itdb2z2ffirb4kjmx5kiw-5c13a017.sandbox.novita.ai

## 🛠 Technical Stack

- **Frontend**: Vanilla JavaScript with HTML5 Canvas
- **Backend**: Hono.js (Cloudflare Pages compatible)
- **Styling**: Custom CSS with CSS variables and animations
- **Fonts**: Google Fonts (Orbitron for display, Exo 2 for body)
- **Audio**: Web Audio API for synthesized sound effects
- **Storage**: localStorage for player profiles and progress

## 📁 Project Structure

```
webapp/
├── src/
│   └── index.tsx          # Hono server entry point
├── public/
│   └── static/
│       ├── style.css      # Main stylesheet
│       └── game/
│           ├── main.js    # Game controller
│           ├── utils.js   # Utility functions
│           ├── audio.js   # Sound effects system
│           ├── particles.js # Particle effects
│           ├── player.js  # Player profile management
│           ├── ui.js      # UI screens and HUD
│           └── levels/
│               ├── asteroid-defense.js
│               └── rocket-launch.js
├── ecosystem.config.cjs   # PM2 configuration
├── package.json
├── vite.config.ts
└── wrangler.jsonc
```

## 🚀 Running Locally

```bash
# Install dependencies
npm install

# Development (with Vite)
npm run dev

# Build for production
npm run build

# Run with Wrangler (Cloudflare Pages dev)
npm run dev:sandbox
```

## 🎯 Recommended Next Steps

1. **Add Space Race level** - Word typing with spaceship dodging asteroids
2. **Add Robot Builder level** - Sequential command typing to build robots
3. **Add background music** - Ambient space music with volume controls
4. **Mobile support** - On-screen keyboard for tablets
5. **Parent dashboard** - View child's progress and statistics
6. **Daily challenges** - New challenges each day to encourage return
7. **Customizable rockets/ships** - Unlock cosmetics with stars

## 📊 Data Models

### Player Profile (localStorage)
- Name, skill level, difficulty setting
- Per-level progress (high scores, stars, times played)
- Letter accuracy statistics
- Achievement unlocks
- Settings (sound, particles, hints)

## 🎨 Design Philosophy

This game was designed with a 7-year-old in mind:
- **Not too easy**: Adapts as skill improves
- **Not too hard**: Adapts when struggling
- **Visually engaging**: Space theme with lots of animation and effects
- **Rewarding**: Stars, achievements, combos, and celebrations
- **Educational**: Focuses practice on weak letters

---

Made with ❤️ for young space cadets learning to type!
