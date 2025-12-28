#!/usr/bin/env node

/**
 * Build script for AWS S3 + CloudFront deployment
 * 
 * This script creates a static-only build without Cloudflare Workers,
 * suitable for deploying to AWS S3 with CloudFront CDN.
 * 
 * The Cloudflare build uses Hono + Vite to create a Worker bundle,
 * but for AWS we need pure static files served directly.
 */

const fs = require('fs');
const path = require('path');

const distDir = path.join(__dirname, '..', 'dist-aws');
const publicDir = path.join(__dirname, '..', 'public');

console.log('Building for AWS S3 + CloudFront...\n');

// Clean dist-aws directory
if (fs.existsSync(distDir)) {
    fs.rmSync(distDir, { recursive: true });
}
fs.mkdirSync(distDir, { recursive: true });

// Copy all static files from public/ to dist-aws/
function copyRecursive(src, dest) {
    const stat = fs.statSync(src);
    
    if (stat.isDirectory()) {
        if (!fs.existsSync(dest)) {
            fs.mkdirSync(dest, { recursive: true });
        }
        const files = fs.readdirSync(src);
        for (const file of files) {
            copyRecursive(path.join(src, file), path.join(dest, file));
        }
    } else {
        fs.copyFileSync(src, dest);
        console.log(`  Copied: ${path.relative(publicDir, src)}`);
    }
}

console.log('Copying static assets...');
copyRecursive(path.join(publicDir, 'static'), path.join(distDir, 'static'));

// Create index.html for AWS deployment
// This is a standalone version that doesn't rely on Hono serving the HTML
const indexHtml = `<!DOCTYPE html>
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
</html>`;

fs.writeFileSync(path.join(distDir, 'index.html'), indexHtml);
console.log('  Created: index.html');

// Create a simple 404.html that redirects to index (for SPA-like behavior)
const notFoundHtml = `<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta http-equiv="refresh" content="0;url=/">
    <title>Redirecting...</title>
</head>
<body>
    <p>Redirecting to <a href="/">Cosmic Typer</a>...</p>
</body>
</html>`;

fs.writeFileSync(path.join(distDir, '404.html'), notFoundHtml);
console.log('  Created: 404.html');

// Calculate total size
function getDirSize(dir) {
    let size = 0;
    const files = fs.readdirSync(dir);
    for (const file of files) {
        const filePath = path.join(dir, file);
        const stat = fs.statSync(filePath);
        if (stat.isDirectory()) {
            size += getDirSize(filePath);
        } else {
            size += stat.size;
        }
    }
    return size;
}

const totalSize = getDirSize(distDir);
const sizeKB = (totalSize / 1024).toFixed(2);
const sizeMB = (totalSize / 1024 / 1024).toFixed(2);

console.log('\n✅ AWS build complete!');
console.log(`   Output: dist-aws/`);
console.log(`   Size: ${sizeKB} KB (${sizeMB} MB)`);
console.log('\nTo deploy to S3:');
console.log('   aws s3 sync dist-aws/ s3://YOUR_BUCKET_NAME --delete');
