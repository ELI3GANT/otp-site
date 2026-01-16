const fs = require('fs');
// CRASH DEBUGGING
process.on('uncaughtException', (err) => {
    fs.writeFileSync('crash.log', `CRASH (Uncaught): ${err.stack}\n`, { flag: 'a' });
    console.error('CRASH:', err);
    process.exit(1);
});
process.on('unhandledRejection', (reason, promise) => {
    fs.writeFileSync('crash.log', `CRASH (Unhandled Rejection): ${reason}\n`, { flag: 'a' });
    console.error('Unhandled Rejection:', reason);
});
process.on('exit', (code) => {
    fs.writeFileSync('crash.log', `EXIT CODE: ${code}\n`, { flag: 'a' });
});

// Load environment variables
if (fs.existsSync('my.env')) {
    require('dotenv').config({ path: 'my.env' });
} else {
    require('dotenv').config();
}
const express = require('express');
const path = require('path');
const helmet = require('helmet');
const compression = require('compression');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const bodyParser = require('body-parser');
const jwt = require('jsonwebtoken');
const { createClient } = require('@supabase/supabase-js');
const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));

const app = express();
app.disable('x-powered-by'); // Hide stack details
const port = process.env.PORT || 3000;

// Initialize Supabase Admin Client (Service Role)
// Only needed if performing admin actions like Delete/Update on restricted tables
const supabaseAdmin = process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_KEY 
    ? createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY) 
    : null;

if (supabaseAdmin) {
    console.log("✅ Supabase Admin Initialized");
} else {
    console.warn("⚠️ Supabase Admin NOT Initialized (Check SUPABASE_URL and SUPABASE_SERVICE_KEY)");
}

if (process.env.GEMINI_API_KEY) {
    console.log("✅ Gemini API Key found");
} else {
    console.warn("⚠️ Gemini API Key NOT found");
}

// --- SECURITY & OPTIMIZATION MIDDLEWARE ---

// 1. Helmet: Sets various HTTP headers for security
app.use(helmet({
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'", "https://unpkg.com", "https://cdn.jsdelivr.net", "https://cdnjs.cloudflare.com", "https://assets.calendly.com"],
            scriptSrcAttr: ["'unsafe-inline'"],
            styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com", "https://assets.calendly.com"],
            fontSrc: ["'self'", "https://fonts.gstatic.com"],
            imgSrc: ["'self'", "data:", "https:", "blob:"],
            connectSrc: ["'self'", "https://*.supabase.co", "wss://*.supabase.co", "https://api.openai.com", "https://generativelanguage.googleapis.com", "https://calendly.com"],
            mediaSrc: ["'self'", "https:"],
            frameSrc: ["'self'", "https://calendly.com", "https://open.spotify.com", "https://embed.music.apple.com", "https://music.apple.com", "https://www.youtube.com", "https://w.soundcloud.com"],
            objectSrc: ["'none'"],
            upgradeInsecureRequests: [],
        },
    },
}));

// 2. Compression: Gzip/Brotli for text assets
app.use(compression());

// 3. CORS: Allow same-origin (adjust if frontend is separate)
app.use(cors());

// 4. Rate Limiting: Prevent abuse
app.set('trust proxy', 1); // Trust Vercel Proxy
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 500, // Increased from 50 to 500 to support high-traffic drops
    message: { success: false, message: "Too many requests, please try again later." }
});
app.use('/api/', limiter); 

// 5. Body Parsing
app.use(bodyParser.json());

// --- VERBOSE REQUEST LOGGING ---
app.use((req, res, next) => {
    const log = `[${new Date().toISOString()}] ${req.method} ${req.url} - IP: ${req.ip}\n`;
    fs.appendFileSync('server_debug.log', log);
    console.log(log.trim());
    next();
});

// --- CACHE CONTROL HELPER ---
app.use((req, res, next) => {
    if (req.method === 'GET' && !req.path.startsWith('/api')) {
        res.set('Cache-Control', 'public, max-age=3600, s-maxage=86400'); // Cache static for 1hr browser, 24hr CDN
    }
    next();
});

// --- API ROUTES ---
// Defined BEFORE static files to ensure they take precedence

// 1. Auth Route
app.get('/api/health', (req, res) => {
    res.json({ success: true, status: 'ONLINE', timestamp: new Date().toISOString() });
});

app.post('/api/auth/login', (req, res) => {
    const { passcode } = req.body;
    
    if (passcode === process.env.ADMIN_PASSCODE) {
        // Issue JWT
        const token = jwt.sign({ role: 'admin' }, process.env.JWT_SECRET, { expiresIn: '12h' });
        return res.json({ success: true, token });
    }
    
    return res.status(401).json({ success: false, message: 'Access Denied' });
});

// Middleware to verify JWT
const verifyToken = (req, res, next) => {
    const bearerHeader = req.headers['authorization'];
    if (typeof bearerHeader !== 'undefined') {
        const bearer = bearerHeader.split(' ');
        const bearerToken = bearer[1];
        jwt.verify(bearerToken, process.env.JWT_SECRET, (err, authData) => {
            if (err) return res.status(403).json({ success: false, message: "Invalid or expired token" });
            req.auth = authData;
            next();
        });
    } else {
        res.status(401).json({ success: false, message: "Authentication required" });
    }
};

// 2. Secure AI Generation (Proxied)
app.post('/api/ai/generate', verifyToken, async (req, res) => {
    // ... existing AI logic ...
    const { provider, prompt, title, systemPrompt, model } = req.body;
    
    try {
        let result;
        let usage;
        if (provider === 'openai') {
            if (!process.env.OPENAI_API_KEY) throw new Error("OpenAI Key not configured on server.");
            
            const response = await fetch('https://api.openai.com/v1/chat/completions', {
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json', 
                    'Authorization': `Bearer ${process.env.OPENAI_API_KEY}` 
                },
                body: JSON.stringify({
                    model: "gpt-4o",
                    messages: [
                        { role: "system", content: systemPrompt }, 
                        { role: "user", content: `Generate post: "${title}". Focus: ${prompt}` }
                    ],
                    temperature: 0.8,
                    response_format: { type: "json_object" }
                })
            });
            
            const data = await response.json();
            if (data.error) throw new Error(data.error.message);
            result = JSON.parse(data.choices[0].message.content);
            usage = data.usage;

        } else if (provider === 'gemini') {
            if (!process.env.GEMINI_API_KEY) throw new Error("Gemini Key not configured on server.");
            
            const geminiModel = model || 'gemini-2.5-flash';
            const payload = {
                contents: [{ parts: [{ text: `${systemPrompt || 'You are a professional blog writer.'}\n\nGenerate post titled "${title}" based on prompt: "${prompt}". Return format: { "content": "markdown...", "excerpt": "...", "seo_title": "...", "seo_desc": "..." }` }] }],
                generationConfig: { response_mime_type: "application/json" }
            };

            // JSON Mode is best supported on v1beta
            const endpoints = ['v1beta', 'v1'];
            let lastErr = "";
            let success = false;

            for (const v of endpoints) {
                if(success) break;
                try {
                    const apiRes = await fetch(`https://generativelanguage.googleapis.com/${v}/models/${geminiModel}:generateContent?key=${process.env.GEMINI_API_KEY}`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(payload)
                    });
                    const data = await apiRes.json();
                    if (!data.error) {
                        const text = data.candidates[0].content.parts[0].text;
                        // With native JSON mode, we shouldn't need regex replacement, but keeping it for safety
                        result = JSON.parse(text.replace(/```json|```/g, '').trim());
                        usage = data.usageMetadata ? { total_tokens: data.usageMetadata.totalTokenCount } : null;
                        success = true;
                    } else { lastErr = data.error.message; }
                } catch (e) { lastErr = e.message; }
            }
            if(!success) throw new Error(`Gemini Probe Failed: ${lastErr}`);

        } else if (provider === 'anthropic') {
            if (!process.env.ANTHROPIC_API_KEY) throw new Error("Claude Key not configured on server.");
            const response = await fetch('https://api.anthropic.com/v1/messages', {
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json', 
                    'x-api-key': process.env.ANTHROPIC_API_KEY,
                    'anthropic-version': '2023-06-01'
                },
                body: JSON.stringify({
                    model: model || 'claude-3-5-sonnet-20240620',
                    max_tokens: 4000,
                    messages: [{ role: 'user', content: `${systemPrompt}\n\n${title}: ${prompt}` }]
                })
            });
            const data = await response.json();
            if (data.error) throw new Error(data.error.message);
            result = JSON.parse(data.content[0].text);
            usage = data.usage ? { total_tokens: data.usage.input_tokens + data.usage.output_tokens } : null;

        } else if (provider === 'groq') {
            if (!process.env.GROQ_API_KEY) throw new Error("Groq Key not configured on server.");
            const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${process.env.GROQ_API_KEY}` },
                body: JSON.stringify({
                    model: model || 'llama-3.1-70b-versatile',
                    messages: [
                        { role: 'system', content: systemPrompt },
                        { role: "user", content: `Generate post: "${title}". ${prompt}` }
                    ],
                    response_format: { type: "json_object" }
                })
            });
            const data = await response.json();
            if (data.error) throw new Error(data.error.message);
            result = JSON.parse(data.choices[0].message.content);
            usage = data.usage;

        } else {
            throw new Error("Invalid provider requested.");
        }

        res.json({ success: true, data: result, usage });

    } catch (error) {
        console.error("AI Error:", error.stack);
        const isDev = process.env.NODE_ENV === 'development';
        res.status(500).json({ 
            success: false, 
            message: isDev ? error.message : "Internal Server Error during AI generation" 
        });
    }
});

// 3. Admin Deletion Endpoint (Bypasses RLS)
app.post('/api/admin/delete-post', verifyToken, async (req, res) => {
    const { id, slug, table } = req.body;
    const targetTable = table || 'posts'; // Default to posts
    
    if (!supabaseAdmin) {
        return res.status(500).json({ success: false, message: "Server misconfiguration: Missing Supabase Service Key" });
    }

    try {
        let query = supabaseAdmin.from(targetTable).delete();
        
        if (id) query = query.eq('id', id);
        else if (slug) query = query.eq('slug', slug);
        else return res.status(400).json({ success: false, message: "Missing ID or Slug" });

        const { data, error } = await query.select();

        if (error) throw error;
        
        // Check if anything was actually deleted
        if (!data || data.length === 0) {
            return res.status(404).json({ success: false, message: "Post not found or already deleted" });
        }

        res.json({ success: true, message: "Deleted successfully", deleted: data });

    } catch (error) {
        console.error("Delete Error:", error.message);
        res.status(500).json({ success: false, message: error.message });
    }
});

// 4. Secure Image Generation (DALL-E 3 + Supabase Storage)
app.post('/api/ai/generate-image', verifyToken, async (req, res) => {
    const { prompt, title, aspect_ratio } = req.body;
    
    try {
        if (!process.env.OPENAI_API_KEY) throw new Error("OpenAI Key missing on server.");
        if (!supabaseAdmin) throw new Error("Supabase Admin key missing.");

        // 1. Generate via DALL-E 3
        const aiRes = await fetch('https://api.openai.com/v1/images/generations', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${process.env.OPENAI_API_KEY}` },
            body: JSON.stringify({
                model: "dall-e-3",
                prompt: `High-tech, cinematic, professional photography/render for a brand called 'Only True Perspective'. Subject: ${prompt}. Style: Dark, futuristic, minimal, deep purples and cyans. High resolution, 4k. Title reference: ${title}`,
                n: 1,
                size: aspect_ratio === 'landscape' ? "1792x1024" : "1024x1024",
                quality: "hd"
            })
        });

        const aiData = await aiRes.json();
        if (aiData.error) throw new Error(aiData.error.message);
        const tempUrl = aiData.data[0].url;

        // 2. Fetch image buffer
        const imgRes = await fetch(tempUrl);
        const buffer = await imgRes.arrayBuffer();

        // 3. Upload to Supabase Storage (Permanent)
        const fileName = `generated/${Date.now()}-${Math.random().toString(36).substring(7)}.png`;
        const { data: uploadData, error: uploadError } = await supabaseAdmin.storage
            .from('uploads')
            .upload(fileName, buffer, { contentType: 'image/png' });

        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = supabaseAdmin.storage
            .from('uploads')
            .getPublicUrl(fileName);

        res.json({ success: true, url: publicUrl });

    } catch (error) {
        console.error("Image Gen Error:", error.stack);
        res.status(500).json({ success: false, message: error.message });
    }
});

// 5. CONTACT AGENT (AI Auto-Draft)
app.post('/api/contact/submit', async (req, res) => {
    const { name, email, service, message, budget, timeline } = req.body;
    
    // 1. Basic Validation
    if (!name || !email) {
        return res.status(400).json({ success: false, message: "Name and Email are required." });
    }

    try {
        const adminClient = supabaseAdmin; 
        if (!adminClient) throw new Error("Server missing Supabase Admin Key");

        // 2. Save Contact to DB
        const { data: contactData, error: dbError } = await adminClient
            .from('contacts')
            .insert([{ 
                name, email, service, message, budget, timeline, 
                ai_status: 'processing' 
            }])
            .select()
            .single();

        if (dbError) throw dbError;

        // 3. Trigger AI Agent (Fire and Forget or Await?)
        // We will await it to ensure it's done for the demo, but usually this is a background job.
        
        const systemPrompt = `You are the Studio Manager for 'Only True Perspective' (OTP), a high-end creative agency.
        Your goal represents the agency to a potential client.
        Tone: Professional, high-status, concise, slightly futuristic ("dope").
        Action: Draft a reply email acknowledging their inquiry and proposing a time to talk.
        Context: 
        - If budget is low (<$500), allow them to down gently or suggest "The Visualizer" package.
        - If budget is high ($3000+), give them VIP treatment.
        - Sign off with "OTP // Visual Division".`;

        const userPrompt = `Client: ${name}
        Service: ${service}
        Budget: ${budget}
        Message: ${message}
        
        Task: Write the email draft (Subject + Body).`;

        // Use the same AI logic as /generate, but simplified inline here for speed or reuse function.
        // For simplicity, we'll try Gemini first as it's free/fast, fallback to OpenAI.
        
        let draftReply = "";
        let analysis = {};

        if (process.env.GEMINI_API_KEY) {
            const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent?key=${process.env.GEMINI_API_KEY}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    contents: [{ parts: [{ text: systemPrompt + "\n\n" + userPrompt }] }]
                })
            });
            const data = await response.json();
            if (data.candidates) {
                draftReply = data.candidates[0].content.parts[0].text;
            }
        } 
        
        // 4. Update Contact with Draft
        if (draftReply) {
            await adminClient
                .from('contacts')
                .update({ 
                    draft_reply: draftReply,
                    ai_status: 'drafted',
                    ai_analysis: { generated_at: new Date().toISOString() }
                })
                .eq('id', contactData.id);
        }

        res.json({ success: true, message: "Contact received and agent activated." });

    } catch (error) {
        console.error("Agent Error:", error);
        res.status(500).json({ success: false, message: "Server error processing contact." });
    }
});

// 6. PERSPECTIVE AUDIT ENGINE (AI Strategy Generator)
app.post('/api/audit/submit', async (req, res) => {
    const { email, answers } = req.body;
    
    if (!email || !answers) {
        return res.status(400).json({ success: false, message: "Email and answers are required." });
    }

    try {
        const adminClient = supabaseAdmin;
        
        // 1. Construct the Strategic Prompt (Aligned with OTP Oracle style)
        const goal = answers.q1 || 'Unknown';
        const hurdle = answers.q2 || 'Unknown';
        const platform = answers.q3 || 'Unknown';
        const vibe = answers.q4 || 'Unknown';
        const specificGoal = answers.q5_goal || 'Not specified';

        const systemPrompt = `You are the 'OTP Oracle', a high-dimensional strategy entity. 
        Your task is to provide a "Perspective Audit" that feels uniquely calculated for the user.
        
        STYLE GUIDELINES:
        1. **Radical Specificity**: You MUST weave the user's specific goal ("${specificGoal}") and platform ("${platform}") into every single bullet point.
        2. **High-Status / Dope Tone**: Professional, visionary, slightly mystical, but grounded in technical reality.
        3. **Variability**: Each response should approach the problem from a different angle (psychological, technical, or aesthetic). Do not use the same phrasing twice.
        4. **Max Impact**: Under 120 words. No greetings. No "I recommend". Just the Truth.`;

        const userPrompt = `ANALYZE THIS SIGNAL:
        - CORE OBJECTIVE: ${goal}
        - THE BARRIER: ${hurdle}
        - REALM: ${platform}
        - TARGET AESTHETIC: ${vibe}
        - THE SPECIFIC MISSION: "${specificGoal}"
         
        OUTPUT STRUCTURE (Strictly enforce):
        
        **THE DIAGNOSIS.**
        (1-2 surgical sentences on how "${hurdle}" is specifically corrupting the path to "${specificGoal}".)
        
        **THE PLAN.**
        1. **The Tactical Pivot**: (Actionable move involving ${platform} and ${specificGoal}.)
        2. **Visual Rebranding**: (How to achieve the "${vibe}" look in the next 24 hours.)
        3. **The Daily Protocol**: (The repeating habit for long-term dominance.)
        
        **THE FORTUNE.**
        (A short, unique, powerful quote that sounds like it was written for a cyberpunk philosopher.)`;

        let advice = "";

        // 2. Call Gemini (With Robust Logic)
        if (process.env.GEMINI_API_KEY) {
            const modelsToTry = ['gemini-1.5-pro', 'gemini-1.5-flash', 'gemini-2.0-flash-exp'];
            let success = false;
            
            const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

            for (let i = 0; i < modelsToTry.length; i++) {
                const modelName = modelsToTry[i];
                if (success) break;
                try {
                    console.log(`🤖 Oracle Probing Realm via ${modelName}...`);
                    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${process.env.GEMINI_API_KEY}`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            contents: [{ parts: [{ text: systemPrompt + "\n\n" + userPrompt }] }],
                            generationConfig: {
                                temperature: 0.9, // High creativity for variation
                                maxOutputTokens: 600,
                                topP: 0.95,
                                topK: 40
                            }
                        })
                    });

                    if (response.status === 429) {
                        console.warn(`⚠️ Realm Congestion (429) on ${modelName}.`);
                        if (i < modelsToTry.length - 1) await delay(1000 * Math.pow(2, i + 1));
                        continue;
                    }

                    const data = await response.json();
                    if (data.candidates && data.candidates[0].content) {
                        advice = data.candidates[0].content.parts[0].text;
                        success = true;
                        console.log(`✅ Transmission Captured via ${modelName}`);
                    }
                } catch (fetchError) {
                    console.error(`❌ Portal Error (${modelName}):`, fetchError.message);
                    await delay(1000); 
                }
            }

            if (!success) {
                advice = `**THE DIAGNOSIS.**
The Oracle's connection to the realm is unstable. Your specific quest for "${specificGoal}" is noted, but the frequency is jammed.

**THE PLAN.**
1. **Immediate Shift**: Pivot away from "${hurdle}" immediately. No delays.
2. **Visual Pivot**: Lean into the "${vibe}" energy by stripping away all noise.
3. **The Habit**: Execute your move on "${platform}" before the sun sets.

**THE FORTUNE.**
"When the signal is weak, the intent must be absolute."`;
            }
        } else {
            advice = "**THE DIAGNOSIS.**\nOracle Silenced. (Check GEMINI_API_KEY on server)\n\n**THE FORTUNE.**\nAction without vision is a nightmare.";
        }

        // 3. Save Lead to DB (Using Admin Client for bypass)
        if (adminClient) {
            try {
                await adminClient
                    .from('leads')
                    .insert([{ 
                        email, 
                        answers, 
                        advice,
                        status: 'pending',
                        type: 'perspective_audit'
                    }]);
                console.log("✅ Lead saved to database.");
            } catch (dbEx) {
                console.error("DB Exception saving lead:", dbEx);
            }
        }
        
        res.json({ success: true, advice });

    } catch (error) {
        console.error("Audit Engine Critical Error:", error);
        res.status(500).json({ success: false, message: "Server error during audit analysis." });
    }
});

// --- CACHE CONTROL & STATIC ASSETS ---
// Served AFTER API to avoid conflict (e.g. 405 on POST to static)
const staticOptions = {
    dotfiles: 'ignore',
    etag: true,
    extensions: ['html', 'js', 'css', 'png', 'jpg', 'gif', 'svg'],
    index: 'index.html',
    maxAge: '1d', // Cache for 1 day
    redirect: false,
    setHeaders: function (res, path, stat) {
        if (path.endsWith('.html')) {
            // Never cache HTML files to ensure updates are seen immediately
            res.set('Cache-Control', 'no-cache, no-store, must-revalidate');
        } else {
            res.set('x-timestamp', Date.now());
        }
    }
};

app.use(express.static(__dirname, staticOptions));

// --- FALLBACK ROUTE ---
// Serve 404 for any unknown API routes specifically
app.use('/api', (req, res) => {
    res.status(404).json({ success: false, message: "API Endpoint Not Found" });
});

// Serve 404.html for any unknown frontend routes
app.use((req, res) => {
    res.status(404).sendFile(path.join(__dirname, '404.html'));
});

// --- GLOBAL ERROR HANDLER ---
app.use((err, req, res, next) => {
    const errorLog = `[${new Date().toISOString()}] ERROR: ${err.message}\nStack: ${err.stack}\n`;
    fs.appendFileSync('server_debug.log', errorLog);
    console.error(errorLog);
    res.status(500).json({ success: false, message: "Internal Server Error", error: err.message });
});

// --- START SERVER ---
const server = app.listen(port, '0.0.0.0', () => {
    console.log(`\n🚀 OTP SECURE SERVER V1.2.0 ONLINE`);
    console.log(`🔒 Security Headers: ENABLED`);
    console.log(`📦 Compression: ENABLED`);
    console.log(`🔑 Auth System: JWT ENABLED`);
    console.log(`📡 Local: http://localhost:${port}\n`);
});

server.on('error', (e) => {
    console.error("SERVER STARTUP ERROR:", e);
});