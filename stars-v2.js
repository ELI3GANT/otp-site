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
const updateMouse = (x, y) => {
    mouse.x = x;
    mouse.y = y;
};

window.addEventListener('mousemove', e => updateMouse(e.clientX, e.clientY));
window.addEventListener('mouseleave', () => updateMouse(null, null));

// Touch support for mobile interaction
window.addEventListener('touchstart', e => {
    if(e.touches.length > 0) {
        updateMouse(e.touches[0].clientX, e.touches[0].clientY);
    }
}, {passive: true});

window.addEventListener('touchmove', e => {
    if(e.touches.length > 0) {
        updateMouse(e.touches[0].clientX, e.touches[0].clientY);
    }
}, {passive: true});

window.addEventListener('touchend', () => updateMouse(null, null));

// Resize handling
function resize() {
    width = canvas.width = window.innerWidth;
    height = canvas.height = window.innerHeight;
}
window.addEventListener('resize', resize);
resize();

// Attractor Logic (The "Suck" Effect)
let attractor = { x: null, y: null, active: false, repel: false };

window.setAttractor = (x, y) => {
    attractor.x = x;
    attractor.y = y;
    attractor.active = true;
    attractor.repel = false;
};

window.clearAttractor = () => {
    attractor.active = false;
    attractor.repel = true;
    setTimeout(() => { attractor.repel = false; }, 800); // 0.8s dispersal phase
};

class Star {
    constructor() {
        this.reset();
        // Randomize initial position
        this.x = Math.random() * width;
        this.y = Math.random() * height;
    }

    reset() {
        this.x = Math.random() * width;
        this.y = Math.random() * height;
        this.z = Math.random() * 2 + 0.5; 
        this.size = Math.random() * 1.5;
        // Base velocity
        this.origVx = (Math.random() - 0.5) * (this.z * 0.15);
        this.origVy = (Math.random() - 0.5) * (this.z * 0.15);
        this.vx = this.origVx;
        this.vy = this.origVy;
        
        this.alpha = Math.random() * 0.8 + 0.2;
        this.alphaChange = (Math.random() * 0.02) - 0.01;
        
        const rand = Math.random();
        if (rand > 0.9) this.baseColor = '112, 0, 255'; 
        else if (rand > 0.8) this.baseColor = '0, 195, 255'; 
        else this.baseColor = '255, 255, 255'; 
        
        this.color = this.baseColor;
    }

    update() {
        // Global Attractor State Management (managed per star but synced via frame count effectively)
        // Ideally checking this once per frame in animate is better, but doing here for simplicity of access to 'this'
        
        if (attractor.active && attractor.x !== null) {
            // cycle management
            attractor.age = (attractor.age || 0) + 1;
            const cycleLength = 200; // ~3.3 seconds at 60fps
            const burstPhase = 160;  // Burst starts after this many frames
            const isBurst = (attractor.age % cycleLength) > burstPhase;

            const dx = attractor.x - this.x;
            const dy = attractor.y - this.y;
            const dist = Math.sqrt(dx*dx + dy*dy);

            if (isBurst) {
                // *** QUASAR BURST MODE *** (Explosion)
                // Violent outward force
                let angle = Math.atan2(dy, dx);
                let force = -2.5; // Negative for repulsion
                
                // Add some chaotic spin during explosion
                this.vx += Math.cos(angle) * force * this.z;
                this.vy += Math.sin(angle) * force * this.z;
                
                // Flash colors
                this.hue = (attractor.age * 10) % 360; // Rapid cycling rainbow
                
                // Friction (less damping for explosion)
                this.vx *= 0.95;
                this.vy *= 0.95;

            } else {
                // *** ACCRETION MODE *** (Suck)
                // Warp Speed Inward
                
                // No fading out! (User request: dont eat dots)
                // Instead, slingshot logic happens naturally if we don't clamp position
                
                // Gravity
                this.vx += dx * 0.025 * this.z; // Stronger gravity
                this.vy += dy * 0.025 * this.z;

                // Event Horizon Swirl: Scaled for 260px button (radius 130px)
                if (dist < 130) {
                     this.vx += -dy * 0.15; 
                     this.vy += dx * 0.15;
                }

                // Fade out particles that are deep inside the button to "eliminate" clutter
                if (dist < 80) {
                    this.alpha = Math.max(0, this.alpha - 0.05);
                }

                // Warp Colors
                if (!this.hue) this.hue = Math.random() * 360;
                
                // Friction
                this.vx *= 0.92; // More drag to control the chaos
                this.vy *= 0.92;
            }

        } else if (attractor.repel) {
            // Reset Age
             attractor.age = 0;
            // REPEL MODE (Mouse release / Explosion aftermath)
            this.hue = null; 

            let dx = this.x - attractor.x;
            let dy = this.y - attractor.y;
            let dist = Math.sqrt(dx*dx + dy*dy);
            
            if (dist < 1) dist = 1;

            if (dist < 400) {
                 const force = (400 - dist) / 400; 
                 const push = force * 0.8 * this.z; 
                 
                 this.vx += (dx / dist) * push;
                 this.vy += (dy / dist) * push;
            }
             this.vx = this.vx * 0.94 + this.origVx * 0.06;
             this.vy = this.vy * 0.94 + this.origVy * 0.06;
        } else {
             // NORMAL MODE
             attractor.age = 0;
             this.hue = null;
             this.alpha = Math.min(this.alpha + 0.01, 1); // Restore alpha if it was low
             this.vx = this.vx * 0.98 + this.origVx * 0.02;
             this.vy = this.vy * 0.98 + this.origVy * 0.02;
        }

        this.x += this.vx;
        this.y += this.vy;

        // Wrap around screen (Disable wrap during Active to prevent popping)
        if (!attractor.active) {
            if (this.x < 0) this.x = width;
            if (this.x > width) this.x = 0;
            if (this.y < 0) this.y = height;
            if (this.y > height) this.y = 0;
        }

        // Twinkle
        if (!attractor.active) {
             this.alpha += this.alphaChange;
             if (this.alpha <= 0.2 || this.alpha >= 1) this.alphaChange *= -1;
        } else {
             this.alpha = 1; // Max visibility during action
        }
    }

    draw() {
        const isLight = document.documentElement.getAttribute('data-theme') === 'light';
        ctx.beginPath();
        
        if (attractor.active && this.hue != null) {
            // WARP STREAKS (Vibrant HSL)
            // Use Hue for color, Alpha for fade
            const lightness = isLight ? '30%' : '70%'; // Darker in light mode
            ctx.strokeStyle = `hsla(${this.hue}, 100%, ${lightness}, ${this.alpha})`;
            ctx.lineWidth = Math.max(1, this.size * this.z); 
            ctx.moveTo(this.x, this.y);
            // Longer tails for faster speed
            ctx.lineTo(this.x - this.vx * 3, this.y - this.vy * 3);
            ctx.stroke();
        } else {
            // STANDARD STAR (RGB)
            let drawColor = this.baseColor;
            
            if (isLight) {
                // PREMIUM DAY MODE PALETTE: Using deep space variations instead of pure black
                if (this.baseColor === '255, 255, 255') drawColor = '20, 20, 45'; // Deep Midnight
                else if (this.baseColor === '0, 195, 255') drawColor = '0, 110, 220'; // Vivid Blue
                else if (this.baseColor === '112, 0, 255') drawColor = '112, 0, 255'; // Keep Purple
            }

            ctx.arc(this.x, this.y, this.size * this.z * 0.8, 0, Math.PI * 2);
            ctx.fillStyle = `rgba(${drawColor}, ${this.alpha})`;
            ctx.fill();
        }
    }
}

class ShootingStar {
    constructor() {
        this.x = Math.random() * width;
        this.y = Math.random() * height / 2; 
        this.length = Math.random() * 80 + 10;
        this.speed = Math.random() * 10 + 6;
        this.angle = Math.PI / 4; 
        this.life = 1;
        this.color = Math.random() > 0.5 ? '0, 195, 255' : '255, 255, 255';
    }

    update() {
        this.x -= this.speed * Math.cos(this.angle); 
        this.y += this.speed * Math.sin(this.angle); 
        this.life -= 0.02;
    }

    draw() {
        const isLight = document.documentElement.getAttribute('data-theme') === 'light';
        ctx.beginPath();
        const endX = this.x + this.length * Math.cos(this.angle); 
        const endY = this.y - this.length * Math.sin(this.angle);
        
        // Adjust color for light mode visibility
        let drawColor = this.color;
        if (isLight) {
            if (this.color === '255, 255, 255') drawColor = '20, 20, 45'; // Matching Deep Midnight
            else if (this.color === '0, 195, 255') drawColor = '0, 80, 200';
        }

        const g = ctx.createLinearGradient(this.x, this.y, endX, endY);
        g.addColorStop(0, `rgba(${drawColor}, ${this.life})`);
        g.addColorStop(1, `rgba(${drawColor}, 0)`);
        
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
    const isLight = document.documentElement.getAttribute('data-theme') === 'light';

    // Check for Archive Page (No Motion Request)
    const isArchive = document.body.classList.contains('archive-page');

    // Update & Draw Static Stars
    stars.forEach(star => {
        // Only update position (move) if NOT on archive page
        if (!isArchive) {
            star.update();
        }
        star.draw();

        // Connect to mouse if close (Only if NOT in Suck Mode)
        // Allowed on Archive for interactivity without autoplay motion
        if (!attractor.active && mouse.x != null) {
            const dx = mouse.x - star.x;
            const dy = mouse.y - star.y;
            // distSq < radiusSq
            if (dx * dx + dy * dy < CONNECTION_DIST * CONNECTION_DIST) {
                const distance = Math.sqrt(dx * dx + dy * dy);
                ctx.beginPath();
                
                // Theme-aware connections: Richer violet in Day Mode
                let connColor = isLight ? '112, 0, 255' : '112, 0, 255';
                let opacity = (1 - distance / CONNECTION_DIST) * (isLight ? 0.35 : 0.8);
                
                ctx.strokeStyle = `rgba(${connColor}, ${opacity})`; 
                ctx.lineWidth = 0.5;
                ctx.moveTo(star.x, star.y);
                ctx.lineTo(mouse.x, mouse.y);
                ctx.stroke();
                
                 // Gentle mouse attraction
                 // Disable attraction movement on archive to keep them strictly static?
                 // Summary said: "stars are static... though mouse interaction for connections remains"
                 // usually "interaction" implies some movement, but "static" implies position doesn't change.
                 // I will keep the movement for interaction unless strictly asked not to, 
                 // but typically "autoplay motion removal" refers to the constant drift.
                 // However, to be "truly static" usually means they don't move at all.
                 // Let's allow interaction movement if user touches them, but no ambient drift.
                 if (!isArchive) {
                     star.x += dx * 0.005; 
                     star.y += dy * 0.005;
                 }
            }
        }
    });

    // Handle Shooting Stars (DISABLE on Archive)
    if (!isArchive && Math.random() < SHOOTING_STAR_CHANCE) {
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
