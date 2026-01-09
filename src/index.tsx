import { Hono } from 'hono'
import { serveStatic } from 'hono/cloudflare-pages'

const app = new Hono()

// Serve static files
app.use('/static/*', serveStatic())

// Main game page
app.get('/', (c) => {
    return c.html(`<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0, user-scalable=no">
    <title>Cosmic Typing - Space Typing Adventure</title>
    
    <!-- SEO Meta Tags -->
    <meta name="description" content="A fun, kid-friendly typing game with a space theme. Protect Earth from asteroids by typing letters!">
    <meta name="keywords" content="typing game, kids, educational, space, asteroids, learn to type">
    
    <!-- Open Graph / Facebook -->
    <meta property="og:type" content="website">
    <meta property="og:url" content="https://typing.krishvik.com/">
    <meta property="og:title" content="Cosmic Typing - Space Typing Adventure">
    <meta property="og:description" content="A fun, kid-friendly typing game with a space theme. Protect Earth from asteroids by typing letters!">
    <meta property="og:image" content="https://typing.krishvik.com/static/images/og.jpeg">
    <meta property="og:image:width" content="1200">
    <meta property="og:image:height" content="630">
    
    <!-- Twitter -->
    <meta name="twitter:card" content="summary_large_image">
    <meta name="twitter:url" content="https://typing.krishvik.com/">
    <meta name="twitter:title" content="Cosmic Typing - Space Typing Adventure">
    <meta name="twitter:description" content="A fun, kid-friendly typing game with a space theme. Protect Earth from asteroids by typing letters!">
    <meta name="twitter:image" content="https://typing.krishvik.com/static/images/og.jpeg">
    
    <!-- Favicons -->
    <link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png">
    <link rel="icon" type="image/png" sizes="32x32" href="/favicon-32x32.png">
    <link rel="icon" type="image/png" sizes="16x16" href="/favicon-16x16.png">
    <link rel="manifest" href="/site.webmanifest">
    <meta name="theme-color" content="#0a0a2e">
    
    <link href="https://fonts.googleapis.com/css2?family=Orbitron:wght@400;500;600;700;800;900&family=Exo+2:wght@300;400;500;600;700&display=swap" rel="stylesheet">
    <link rel="stylesheet" href="/static/style.css">
</head>
<body>
    <div id="game-container">
        <canvas id="background-canvas"></canvas>
        <canvas id="game-canvas"></canvas>
        <div id="ui-overlay"></div>
        <!-- Krishvik Logo - hidden during gameplay -->
        <a href="https://krishvik.com" target="_blank" rel="noopener noreferrer" id="krishvik-logo" title="Visit Krishvik.com">
            <img src="/static/images/krishvik-logo.png" alt="Krishvik.com">
        </a>
    </div>
    
    <script src="/static/game/utils.js"></script>
    <script src="/static/game/audio.js"></script>
    <script src="/static/game/particles.js"></script>
    <script src="/static/game/player.js"></script>
    <script src="/static/game/words.js"></script>
    <script src="/static/game/levels/asteroid-defense.js"></script>
    <script src="/static/game/levels/cosmic-runner/constants.js"></script>
    <script src="/static/game/levels/cosmic-runner/background.js"></script>
    <script src="/static/game/levels/cosmic-runner/entities.js"></script>
    <script src="/static/game/levels/cosmic-runner.js"></script>
    <script src="/static/game/ui.js"></script>
    <script src="/static/game/main.js"></script>
</body>
</html>`)
})

export default app
