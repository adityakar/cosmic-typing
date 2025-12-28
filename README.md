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
- **Wave-based system**: Clear waves of asteroids (3 waves = 1 star, 6 waves = 2 stars, 10 waves = 3 stars)
- **Word-based typing mode**: Type real words, not just random letters!
- **Power-up system** unlocked by combos:
  - 🚀 **Mega Missile** (10 combo): AoE blast that destroys multiple asteroids
  - ⚡ **Hyper Laser** (15 combo): 3 instant-hit shots with no travel time
  - 💥 **Orbital Strike** (spacebar): Screen-clearing ultimate ability
- **Earth Shield regeneration**: Regenerates 2 HP/sec when maintaining combo

#### Level 2: Rocket Launch 🚀
- Type letters to add fuel and launch your rocket to the moon
- Engine flames and particle effects for each correct keystroke
- Race against time through atmosphere to space
- **Realistic gravity physics**:
  - When fuel runs out, velocity decreases
  - When velocity hits zero, gravity pulls the rocket down
  - Must keep typing to avoid crashing back to Earth!
- **Warning alarm** loops when fuel is empty
- Boost meter fills with combos for speed bursts

### 🔊 Enhanced Audio System

**Background Music**:
- Space-themed uplifting instrumental (Opus format for efficiency)
- Plays during menus and settings
- Fades during gameplay for focus

**Sound Effects** (Web Audio API for low latency):
- `hyper_laser.wav` - Laser cannon shots
- `mega_missile.wav` - Missile launch
- `orbital_blast.wav` - Orbital strike activation
- `explosion_1.wav`, `explosion_2.wav` - Randomized explosions
- `rocket_boost.wav` - Rocket fuel boost
- `rocket_exploding.wav` - Crash effects
- `warning_alarm.wav` - Low fuel warning loop
- `welcome.m4a` - Welcome voice on first signup

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

### 📊 Adaptive Difficulty

- **Weighted scoring**: Speed 55%, Accuracy 25%, WPM 20%
- Generous target times: 6s beginner, 5s easy, 4s medium, 3s hard
- Lower WPM targets: 8/12/20/35 for age-appropriate expectations
- Tracks letters the player struggles with
- Shows weak letters more frequently
- **Slow-but-accurate protection**: Won't punish accurate players

### 🏆 Progression System

- Player profile saved to localStorage
- **Angry Birds-style result screen**: Stats count up one by one, stars reveal sequentially
- Star ratings (1-3) based on waves completed
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

## Technical Stack

- **Frontend**: Vanilla JavaScript with HTML5 Canvas
- **Styling**: Custom CSS with space theme variables
- **Backend**: Hono framework (lightweight)
- **Audio**: Web Audio API (SFX) + HTML5 Audio (music/voice)
- **Deployment**: Cloudflare Pages (primary) / AWS S3 + CloudFront (alternative)
- **Storage**: localStorage for player data

## File Structure

```
webapp/
├── src/
│   └── index.tsx              # Main Hono app entry point
├── public/static/
│   ├── style.css              # Main stylesheet
│   ├── audio/                 # Audio assets
│   │   ├── background_music.opus
│   │   ├── welcome.m4a
│   │   ├── hyper_laser.wav
│   │   ├── mega_missile.wav
│   │   ├── orbital_blast.wav
│   │   ├── explosion_1.wav
│   │   ├── explosion_2.wav
│   │   ├── rocket_boost.wav
│   │   ├── rocket_exploding.wav
│   │   └── warning_alarm.wav
│   └── game/
│       ├── utils.js           # Utility functions
│       ├── audio.js           # Sound effects (Web Audio API + HTML5 Audio)
│       ├── particles.js       # Particle system
│       ├── player.js          # Player profile & persistence
│       ├── words.js           # Word dictionary for kids
│       ├── ui.js              # UI screens and menus
│       ├── main.js            # Game controller
│       └── levels/
│           ├── asteroid-defense.js
│           └── rocket-launch.js
├── ecosystem.config.cjs       # PM2 configuration
├── wrangler.jsonc             # Cloudflare config
└── package.json
```

## Local Development

```bash
# Install dependencies
npm install

# Build the project
npm run build

# Run with wrangler (Cloudflare Pages dev)
npm run preview

# Or use PM2 for development
pm2 start ecosystem.config.cjs

# Test locally
curl http://localhost:3000
```

## Deployment

### Option 1: Cloudflare Pages (Primary)

```bash
# Build and deploy to Cloudflare Pages
npm run deploy

# Or step by step:
npm run build
npx wrangler pages deploy dist --project-name cosmic-typer
```

### Option 2: AWS S3 + CloudFront

For deploying to AWS S3 with CloudFront CDN:

#### Prerequisites
1. AWS CLI installed and configured (`aws configure`)
2. An S3 bucket created with static website hosting enabled
3. A CloudFront distribution pointing to the S3 bucket

#### Build for AWS
```bash
# Build static files for AWS deployment
npm run build:aws

# This creates a dist-aws/ folder with:
# - All static assets from public/static/
# - index.html as the entry point
```

#### Deploy to S3
```bash
# Sync to S3 bucket (replace YOUR_BUCKET_NAME)
aws s3 sync dist-aws/ s3://YOUR_BUCKET_NAME --delete

# Set cache headers for assets
aws s3 cp s3://YOUR_BUCKET_NAME s3://YOUR_BUCKET_NAME \
  --recursive \
  --exclude "*" \
  --include "*.js" --include "*.css" --include "*.wav" --include "*.opus" --include "*.m4a" \
  --metadata-directive REPLACE \
  --cache-control "max-age=31536000"

# Set shorter cache for HTML
aws s3 cp s3://YOUR_BUCKET_NAME/index.html s3://YOUR_BUCKET_NAME/index.html \
  --metadata-directive REPLACE \
  --cache-control "max-age=300" \
  --content-type "text/html"
```

#### Invalidate CloudFront Cache
```bash
# Invalidate CloudFront cache (replace YOUR_DISTRIBUTION_ID)
aws cloudfront create-invalidation \
  --distribution-id YOUR_DISTRIBUTION_ID \
  --paths "/*"
```

#### S3 Bucket Policy
```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "PublicReadGetObject",
      "Effect": "Allow",
      "Principal": "*",
      "Action": "s3:GetObject",
      "Resource": "arn:aws:s3:::YOUR_BUCKET_NAME/*"
    }
  ]
}
```

#### CloudFront Configuration Tips
- **Origin**: Point to S3 website endpoint (not REST endpoint)
- **Default Root Object**: `index.html`
- **Error Pages**: Configure 404 to return `/index.html` with 200 status (for SPA routing)
- **Compress Objects**: Enable automatic compression
- **HTTPS**: Use CloudFront's default certificate or custom domain

## NPM Scripts Reference

```json
{
  "dev": "vite",
  "dev:sandbox": "wrangler pages dev dist --ip 0.0.0.0 --port 3000",
  "build": "vite build",
  "build:aws": "npm run build && node scripts/build-aws.js",
  "preview": "wrangler pages dev dist",
  "deploy": "npm run build && wrangler pages deploy dist",
  "deploy:prod": "npm run build && wrangler pages deploy dist --project-name cosmic-typer",
  "deploy:aws": "npm run build:aws && aws s3 sync dist-aws/ s3://YOUR_BUCKET_NAME --delete"
}
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
