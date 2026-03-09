const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

// Load Service Key from .env
const env = fs.readFileSync('.env', 'utf8');
const url = env.match(/SUPABASE_URL=(.*)/)[1].trim();
const key = env.match(/SUPABASE_SERVICE_KEY=(.*)/)[1].trim();

const supabase = createClient(url, key);

async function updatePosts() {
    console.log("🚀 INITIALIZING SECURE DATABASE UPLINK...");

    const spookyContent = `
<p class="lead">Spooky isn't just an editor; he's a visual architect. Fresh off the release of the <strong>Morbid Musik</strong> project, the "Luh Ooky" visual serves as a masterclass in dark-modernist aesthetic and high-velocity pacing.</p>

<div class="media-container" style="margin: 60px 0;">
    <iframe src="https://www.youtube.com/embed/7Zx5fRPmrCU" title="Spooky - Luh Ooky" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe>
</div>

<div style="display: flex; justify-content: center; gap: 15px; margin: 60px 0;">
    <span class="otp-broadcast-dot"></span>
    <span class="otp-broadcast-dot"></span>
    <span class="otp-broadcast-dot"></span>
</div>

<h2>The Visual Language: Dark Modernism</h2>
<p>In "Luh Ooky", Spooky utilizes a "Dark Modernist" palette—prioritizing high-contrast shadows, clinical cyan highlights, and a grain structure that feels both retro and futuristic. The editing mirrors the sonic aggression of the track, with frame-precise cuts that synchronize perfectly with the percussion.</p>

<blockquote style="margin: 60px 0; border-left: 4px solid var(--accent2); background: rgba(0, 236, 255, 0.03); padding: 40px; border-radius: 0 24px 24px 0;">
    "Building a visual vocabulary for the underground isn't about following trends—it's about creating signals that pierce through the static."
</blockquote>

<div style="display: flex; justify-content: center; gap: 15px; margin: 60px 0;">
    <span class="otp-broadcast-dot" style="opacity:0.5"></span>
    <span class="otp-broadcast-dot" style="opacity:0.5"></span>
    <span class="otp-broadcast-dot" style="opacity:0.5"></span>
</div>

<h2>Technical Breakdown</h2>
<div class="feature-grid" style="margin: 60px 0;">
    <div class="feature-card">
        <strong>Kinetic Typography</strong>
        <p>Subtitles aren't just for translation; they're rhythmic elements that pulse with the bass, creating a secondary layer of kinetic energy.</p>
    </div>
    <div class="feature-card">
        <strong>Signal Degradation</strong>
        <p>Strategic use of digital artifacts and intentional glitching to simulate a "glitch in the matrix" feel without losing legibility.</p>
    </div>
    <div class="feature-card">
        <strong>Spatial Framing</strong>
        <p>Utilizing wide-angle lenses and unconventional angles to create a sense of imposing urban isolation and technical dominance.</p>
    </div>
</div>

<div class="connect-section" style="margin: 80px 0; padding: 60px; border: 1px solid rgba(255,255,255,0.1); border-radius: 32px; background: rgba(0, 236, 255, 0.02); text-align: center;">
    <h3 style="margin-bottom: 25px; font-family: 'Syne', sans-serif; text-transform: uppercase; letter-spacing: 2px; font-size: 2rem;">Join the Pulse</h3>
    <p style="margin-bottom: 40px; opacity: 0.8; font-size: 1.1rem;">Experience the full Morbid Musik project and follow Spooky's visual evolution across the live network.</p>
    <div style="display: flex; gap: 20px; justify-content: center; flex-wrap: wrap;">
        <a href="https://www.instagram.com/akidnamedspooky" target="_blank" class="k-hover" style="padding: 16px 32px; border: 1px solid var(--accent2); color: var(--accent2); text-decoration: none; border-radius: 14px; font-size: 0.85rem; font-weight: 800; transition: 0.3s; background: rgba(0, 236, 255, 0.05); letter-spacing: 2px;">INSTAGRAM</a>
        <a href="https://www.youtube.com/@akidnamedspooky" target="_blank" class="k-hover" style="padding: 16px 32px; border: 1px solid #fff; color: #fff; text-decoration: none; border-radius: 14px; font-size: 0.85rem; font-weight: 800; transition: 0.3s; background: rgba(255,255,255,0.05); letter-spacing: 2px;">YOUTUBE</a>
    </div>
</div>
    `;

    const eliContent = `
<p class="lead">Decoding the rise of ELI3GANT: A Rhode Island native rewriting the underground manifesto through surgical precision and cyberpunk soul.</p>

<div class="blog-hero-wrap" style="margin: 60px 0;">
    <img src="https://ckumhowhucbbmpdeqkrl.supabase.co/storage/v1/object/public/uploads/blog/1767913885079_49A436CE-3CA4-45FD-9DF1-44C45E8A4363.png" class="blog-hero-img" alt="eli3gant Aesthetics">
</div>

<div style="display: flex; justify-content: center; gap: 15px; margin: 60px 0;">
    <span class="otp-broadcast-dot"></span>
    <span class="otp-broadcast-dot"></span>
    <span class="otp-broadcast-dot"></span>
</div>

<h2>Rhode Island Roots, Global Reach</h2>
<p>Originating from the Providence scene, eli3gant has cultivated a sound that transcends geographic boundaries. His approach is clinical yet deeply emotive—a rare synthesis in a landscape often dominated by imitation.</p>

<div class="feature-grid" style="margin: 60px 0;">
    <div class="feature-card">
        <strong>The 'No Aversion' Ethos</strong>
        <p>More than just a track title, "No Aversion" represents a structural philosophy. It’s about facing the raw reality of the creative process without blinking.</p>
    </div>
    <div class="feature-card">
        <strong>Surgical Precision</strong>
        <p>Every frequency, every transient, and every visual signal is calculated to maximize impact and aesthetic continuity.</p>
    </div>
</div>

<div style="display: flex; flex-wrap: wrap; gap: 20px; margin: 60px 0;">
    <div class="stat-box">
        <span class="stat-number">100%</span>
        <span class="stat-label">Independent Execution</span>
    </div>
    <div class="stat-box" style="border-left-color: var(--accent2); background: linear-gradient(90deg, rgba(0, 236, 255, 0.05), transparent);">
        <span class="stat-number" style="color: var(--accent2);">∞</span>
        <span class="stat-label">Aesthetic Continuity</span>
    </div>
</div>

<div style="display: flex; justify-content: center; gap: 15px; margin: 60px 0;">
    <span class="otp-broadcast-dot" style="opacity:0.5"></span>
    <span class="otp-broadcast-dot" style="opacity:0.5"></span>
    <span class="otp-broadcast-dot" style="opacity:0.5"></span>
</div>

<h2>Visual Deconstruction</h2>
<p>Look at the visual identity: minimal, tech-heavy, but grounded in street reality. This isn't just branding; it's a world-building exercise. Every cover art, every frame of a video, and every line of code on his site is a deliberate signal.</p>

<blockquote style="margin: 60px 0; border-left: 4px solid var(--accent2); background: rgba(0, 236, 255, 0.03); padding: 40px; border-radius: 0 24px 24px 0;">
    "Elegance is the absence of noise. eli3gant's elegance is found in the surgical way he dissects sound and visual signals."
</blockquote>

<h2>Conclusion</h2>
<p>eli3gant isn’t just rising; he’s redesigning the ascent. By prioritizing quality and vision over transient trends, he and his collective move with a "No Aversion" frequency that is impossible to ignore.</p>
    `;

    try {
        // Update Spooky
        const { error: spookyErr } = await supabase
            .from('posts')
            .update({ 
                title: "Deconstruction: Spooky (Luh Ooky)",
                content: spookyContent,
                excerpt: "A tactical breakdown of Spooky's dark-modernist visual mastery in the Morbid Musik project.",
                category: "Visuals",
                tags: ["Spooky", "Editing", "Visuals", "Morbid Musik"],
                image_url: null // Removed top image
            })
            .eq('id', 10);
        
        if (spookyErr) throw spookyErr;
        console.log("✅ Spooky Updated (Secure)");

        // Update Eli
        const { error: eliErr } = await supabase
            .from('posts')
            .update({ 
                title: "The Architecture of ELI3GANT",
                content: eliContent,
                excerpt: "Decoding the structural foundations and cyberpunk grit of the 'No Aversion' movement.",
                category: "Strategy",
                tags: ["ELI3GANT", "Strategy", "Aesthetics", "RI"],
                image_url: null // Removed top image to avoid duplicate
            })
            .eq('id', 4);

        if (eliErr) throw eliErr;
        console.log("✅ ELI3GANT Updated (Secure)");

    } catch (e) {
        console.error("❌ UPLOAD FAILED:", e.message);
    }
}

updatePosts();
