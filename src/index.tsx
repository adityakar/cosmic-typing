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
    <title>Cosmic Typer - Space Typing Adventure</title>
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
    <script src="/static/game/levels/rocket-launch.js"></script>
    <script src="/static/game/ui.js"></script>
    <script src="/static/game/main.js"></script>
</body>
</html>`)
})

export default app
