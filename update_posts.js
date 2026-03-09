const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

const configPath = path.join(__dirname, 'site-config.js');
const content = fs.readFileSync(configPath, 'utf8');
const urlMatch = content.match(/supabaseUrl:\s*['"]([^'"]+)['"]/);
const keyMatch = content.match(/supabaseKey:\s*['"]([^'"]+)['"]/);

const supabase = createClient(urlMatch[1], keyMatch[1]);

async function updatePosts() {
    console.log("🚀 UPDATING POSTS TO BETTER VERSIONS...");

    // 1. Spooky: Luh Ooky
    const spookyContent = `
<p class="lead">Exploring the dark-modernist aesthetic of Luh Ooky's visual universe. A tactical breakdown of the "Spooky" visual identity.</p>

<div class="video-container" style="margin-bottom: 40px;">
    <iframe src="https://www.youtube.com/embed/7Zx5fRPmrCU" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe>
</div>

<h2>The Aesthetic: Dark Modernism</h2>
<p>Luh Ooky's "Spooky" isn't just a video; it's a stylistic manifesto for the Morbid Musik collective. The visual language relies on a stark monochromatic palette punctuated by high-fidelity atmospheric textures.</p>

<div class="insight-stat-grid" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 20px; margin: 40px 0;">
    <div style="padding: 20px; background: rgba(255,255,255,0.03); border-radius: 12px; border: 1px solid rgba(255,255,255,0.05);">
        <span style="font-family: 'Space Grotesk', sans-serif; display: block; color: var(--accent2); font-size: 0.7rem; text-transform: uppercase; margin-bottom: 5px;">Technical Direction</span>
        <strong style="display: block; font-size: 1.2rem; color: #fff;">Atmospheric Mist Tech</strong>
    </div>
    <div style="padding: 20px; background: rgba(255,255,255,0.03); border-radius: 12px; border: 1px solid rgba(255,255,255,0.05);">
        <span style="font-family: 'Space Grotesk', sans-serif; display: block; color: var(--accent2); font-size: 0.7rem; text-transform: uppercase; margin-bottom: 5px;">Color Methodology</span>
        <strong style="display: block; font-size: 1.2rem; color: #fff;">Low-Luma Saturated Blacks</strong>
    </div>
</div>

<h2>Strategic Impact</h2>
<p>By opting for a raw yet polished "studio" feel, the Morbid Musik team bypasses standard underground tropes. This deconstruction explores the intersection of high-fashion cinematography and underground grit, creating a visual hook that retains viewers far beyond the standard drop-off points.</p>
    `;

    const { error: spookyErr } = await supabase
        .from('posts')
        .update({ 
            title: "Breakdown: Spooky (Luh Ooky)",
            content: spookyContent,
            excerpt: "Tactical deconstruction of the 'Spooky' visual language and dark-modernist aesthetic.",
            category: "Tactical Breakdown",
            tags: ["Cinematography", "Art Direction", "Morbid Musik"]
        })
        .eq('slug', 'spooky-luh-ooky');

    if (spookyErr) console.error("❌ Spooky Update Error:", spookyErr);
    else console.log("✅ Spooky Updated.");

    // 2. whats-elegant-about-eli3gant
    const eliContent = `
<p class="lead">ELI3GANT isn't just making music; he's rewriting the rules of the underground through surgical precision and cyberpunk grit.</p>

<div class="video-container" style="margin-bottom: 40px;">
    <iframe src="https://www.youtube.com/embed/84q4r_sA88k" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe>
</div>

<h2>The eli3gant Aesthetic</h2>
<p>It's not just the music. It's a whole vibe. Think cyberpunk grit meets soulful introspection. eli3gant's world is one of stark contrasts and powerful synthesis. He's pushing boundaries with every drop.</p>

<h2>The 'No Aversion' Collective</h2>
<p>More than just a track, "No Aversion" is a movement. A collective of creators moving as one. We all got our lives and our own lanes, but we can bring flames wherever, anytime. This is the movement that refuses to be ignored.</p>

<div class="insight-stat-grid" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 20px; margin: 40px 0;">
    <div style="padding: 20px; background: rgba(0,236,255,0.03); border-radius: 12px; border: 1px solid rgba(0,236,255,0.08);">
        <span style="font-family: 'Space Grotesk', sans-serif; display: block; color: var(--accent2); font-size: 0.7rem; text-transform: uppercase; margin-bottom: 5px;">Artist Ethos</span>
        <strong style="display: block; font-size: 1.2rem; color: #fff;">Surgical Precision</strong>
    </div>
    <div style="padding: 20px; background: rgba(0,236,255,0.03); border-radius: 12px; border: 1px solid rgba(0,236,255,0.08);">
        <span style="font-family: 'Space Grotesk', sans-serif; display: block; color: var(--accent2); font-size: 0.7rem; text-transform: uppercase; margin-bottom: 5px;">Visual Core</span>
        <strong style="display: block; font-size: 1.2rem; color: #fff;">Cyberpunk Synthesis</strong>
    </div>
</div>

<h2>Why He's Elegant AF</h2>
<p>Elegance isn't about polish; it's about precision. eli3gant's elegance is found in the surgical way he dissects sound, the brutal honesty of his lyrics, and the sheer audacity of his vision. He’s not just rising above the cracks; he’s paving them over with gold.</p>
    `;

    const { error: eliErr } = await supabase
        .from('posts')
        .update({ 
            title: "Analysis: The ELI3GANT Aesthetic",
            content: eliContent,
            excerpt: "How ELI3GANT is redefining the underground through cyberpunk grit and surgical artistic precision.",
            category: "Artist Analysis",
            tags: ["Cyberpunk", "Synthesis", "Underground"]
        })
        .eq('slug', 'whats-elegant-about-eli3gant');

    if (eliErr) console.error("❌ ELI3GANT Update Error:", eliErr);
    else console.log("✅ ELI3GANT Updated.");

    console.log("🍳 BAKING CHANGES TO HTML grid...");
    // We need to run bake_insights.js after this
}

updatePosts();
