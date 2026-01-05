/**
 * stars-v2.js
 * A cinematic, multi-layered starfield with interactive connections.
 * "Deep Space" Aesthetic.
 * Optimized for performance: Responsive counts, efficient drawing.
 */

const canvas = document.getElementById('cursor-canvas');
const ctx = canvas.getContext('2d');

let width, height;
let stars = [];
let shootingStars = [];
// Responsive Star Count: Less on mobile for performance
const IS_MOBILE = window.innerWidth < 768;
const STAR_COUNT = IS_MOBILE ? 60 : 180; 
const CONNECTION_DIST = 120;
const SHOOTING_STAR_CHANCE = 0.005; // 0.5% chance per frame

// Mouse tracking
let mouse = { x: null, y: null };
window.addEventListener('mousemove', e => {
    mouse.x = e.clientX;
    mouse.y = e.clientY;
});
window.addEventListener('mouseleave', () => {
    mouse.x = null;
    mouse.y = null;
});

// Resize handling
function resize() {
    width = canvas.width = window.innerWidth;
    height = canvas.height = window.innerHeight;
}
window.addEventListener('resize', resize);
resize();

class Star {
    constructor() {
        this.reset();
        // Randomize initial position to avoid "pop-in" clump
        this.x = Math.random() * width;
        this.y = Math.random() * height;
    }

    reset() {
        this.x = Math.random() * width;
        this.y = Math.random() * height;
        this.z = Math.random() * 2 + 0.5; // Depth factor (0.5 to 2.5)
        this.size = Math.random() * 1.5;
        this.vx = (Math.random() - 0.5) * (this.z * 0.15); 
        this.vy = (Math.random() - 0.5) * (this.z * 0.15);
        this.alpha = Math.random() * 0.8 + 0.2;
        this.alphaChange = (Math.random() * 0.02) - 0.01;
        // Brand colors: White, Cyan (0, 195, 255), Violet (112, 0, 255)
        // Weighted random: Mostly white, some color
        const rand = Math.random();
        if (rand > 0.9) this.color = '112, 0, 255'; // Violet
        else if (rand > 0.8) this.color = '0, 195, 255'; // Cyan
        else this.color = '255, 255, 255'; // White
    }

    update() {
        this.x += this.vx;
        this.y += this.vy;

        // Wrap around screen
        if (this.x < 0) this.x = width;
        if (this.x > width) this.x = 0;
        if (this.y < 0) this.y = height;
        if (this.y > height) this.y = 0;

        // Twinkle
        this.alpha += this.alphaChange;
        if (this.alpha <= 0.2 || this.alpha >= 1) this.alphaChange *= -1;
    }

    draw() {
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size * this.z * 0.8, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${this.color}, ${this.alpha})`;
        ctx.fill();
    }
}

class ShootingStar {
    constructor() {
        this.x = Math.random() * width;
        this.y = Math.random() * height / 2; // Start in top half mostly
        this.length = Math.random() * 80 + 10;
        this.speed = Math.random() * 10 + 6;
        this.angle = Math.PI / 4; // 45 degrees usually looks good descending
        this.life = 1;
        this.color = Math.random() > 0.5 ? '0, 195, 255' : '255, 255, 255';
    }

    update() {
        this.x -= this.speed * Math.cos(this.angle); // Move left-ish
        this.y += this.speed * Math.sin(this.angle); // Move down-ish
        this.life -= 0.02;
    }

    draw() {
        ctx.beginPath();
        const endX = this.x + this.length * Math.cos(this.angle); // Trail tail (opposite dir)
        const endY = this.y - this.length * Math.sin(this.angle);
        
        const g = ctx.createLinearGradient(this.x, this.y, endX, endY);
        g.addColorStop(0, `rgba(${this.color}, ${this.life})`);
        g.addColorStop(1, `rgba(${this.color}, 0)`);
        
        ctx.strokeStyle = g;
        ctx.lineWidth = 2;
        ctx.moveTo(this.x, this.y);
        ctx.lineTo(endX, endY);
        ctx.stroke();
    }
}

// Init Stars
for (let i = 0; i < STAR_COUNT; i++) {
    stars.push(new Star());
}

function animate() {
    ctx.clearRect(0, 0, width, height);

    // Update & Draw Static Stars
    stars.forEach(star => {
        star.update();
        star.draw();

        // Connect to mouse if close (Optimization: Distance check squared avoids sqrt)
        if (mouse.x != null) {
            const dx = mouse.x - star.x;
            const dy = mouse.y - star.y;
            // distSq < radiusSq
            if (dx * dx + dy * dy < CONNECTION_DIST * CONNECTION_DIST) {
                const distance = Math.sqrt(dx * dx + dy * dy);
                ctx.beginPath();
                ctx.strokeStyle = `rgba(112, 0, 255, ${1 - distance / CONNECTION_DIST})`; 
                ctx.lineWidth = 0.5;
                ctx.moveTo(star.x, star.y);
                ctx.lineTo(mouse.x, mouse.y);
                ctx.stroke();
                
                // Gentle drift away from cursor (interactions)
                // NO: Actually drift TOWARDS slightly feels better, magnetic.
                 star.x += dx * 0.005; 
                 star.y += dy * 0.005;
            }
        }
    });

    // Handle Shooting Stars
    if (Math.random() < SHOOTING_STAR_CHANCE) {
        shootingStars.push(new ShootingStar());
    }
    
    for (let i = 0; i < shootingStars.length; i++) {
        shootingStars[i].update();
        shootingStars[i].draw();
        if (shootingStars[i].life <= 0 || shootingStars[i].x < 0 || shootingStars[i].y > height) {
            shootingStars.splice(i, 1);
            i--;
        }
    }

    requestAnimationFrame(animate);
}

animate();
