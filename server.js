require('dotenv').config();
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
const port = process.env.PORT || 3000;

// Initialize Supabase Admin Client (Service Role)
// Only needed if performing admin actions like Delete/Update on restricted tables
const supabaseAdmin = process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_KEY 
    ? createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY) 
    : null;

// --- SECURITY & OPTIMIZATION MIDDLEWARE ---

// 1. Helmet: Sets various HTTP headers for security
app.use(helmet({
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'", "https://unpkg.com", "https://cdn.jsdelivr.net"],
            styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
            fontSrc: ["'self'", "https://fonts.gstatic.com"],
            imgSrc: ["'self'", "data:", "https:", "blob:"],
            connectSrc: ["'self'", "https://*.supabase.co", "https://api.openai.com", "https://generativelanguage.googleapis.com"],
            mediaSrc: ["'self'", "https:"],
            objectSrc: ["'none'"],
            upgradeInsecureRequests: null,
        },
    },
}));

// 2. Compression: Gzip/Brotli for text assets
app.use(compression());

// 3. CORS: Allow same-origin (adjust if frontend is separate)
app.use(cors());

// 4. Rate Limiting: Prevent abuse
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // limit each IP to 100 requests per windowMs
    message: "Too many requests from this IP, please try again later."
});
// app.use('/api/', limiter); // TEMPORARILY DISABLED FOR LOCALHOST DEBUGGING

// 5. Body Parsing
app.use(bodyParser.json());

// --- API ROUTES ---
// Defined BEFORE static files to ensure they take precedence

// 1. Auth Route
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

        } else if (provider === 'gemini') {
            if (!process.env.GEMINI_API_KEY) throw new Error("Gemini Key not configured on server.");
            
            const geminiModel = model || 'gemini-1.5-flash';
            const payload = {
                contents: [{ parts: [{ text: `${systemPrompt}\n\nUser Input: Generate post titled "${title}" based on prompt: "${prompt}"` }] }],
                generationConfig: { response_mime_type: "application/json" }
            };

            let apiRes = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${geminiModel}:generateContent?key=${process.env.GEMINI_API_KEY}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            const data = await apiRes.json();
            if (data.error) throw new Error(data.error.message);
            
            const text = data.candidates[0].content.parts[0].text;
            result = JSON.parse(text.replace(/```json|```/g, '').trim());
        } else {
            throw new Error("Invalid provider");
        }

        res.json({ success: true, data: result });

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
    const { id, slug } = req.body;
    
    if (!supabaseAdmin) {
        return res.status(500).json({ success: false, message: "Server misconfiguration: Missing Supabase Service Key" });
    }

    try {
        let query = supabaseAdmin.from('posts').delete();
        
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

// --- START SERVER ---
const server = app.listen(port, () => {
    console.log(`\n🚀 OTP SECURE SERVER V3.2.1 ONLINE`);
    console.log(`🔒 Security Headers: ENABLED`);
    console.log(`📦 Compression: ENABLED`);
    console.log(`🔑 Auth System: JWT ENABLED`);
    console.log(`📡 Local: http://localhost:${port}\n`);
});

server.on('error', (e) => {
    console.error("SERVER STARTUP ERROR:", e);
});