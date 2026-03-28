const fs = require('fs');
// CRASH DEBUGGING
// CRASH DEBUGGING (Console Only for Vercel/ReadOnly FS)
process.on('uncaughtException', (err) => {
    console.error('CRASH (Uncaught):', err);
    process.exit(1);
});
process.on('unhandledRejection', (reason, promise) => {
    console.error('CRASH (Unhandled Rejection):', reason);
});
process.on('exit', (code) => {
    console.log(`EXIT CODE: ${code}`);
});

// Load environment variables (Standard)
require('dotenv').config();
const express = require('express');
const path = require('path');
const helmet = require('helmet');
const compression = require('compression');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const bodyParser = require('body-parser');
const jwt = require('jsonwebtoken');

// Safe Stripe Init
let stripe = null;
try {
    if (process.env.STRIPE_SECRET_KEY) {
        // Trim to remove accidental whitespace/newlines from copy-paste
        stripe = require('stripe')(process.env.STRIPE_SECRET_KEY.trim());
    }
} catch (err) {
    console.warn("⚠️ Stripe Init Failed (Check ENV Key format):", err.message);
}

const { createClient } = require('@supabase/supabase-js');
const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));

if (!stripe) {
    console.warn("⚠️ Stripe Payment System OFFLINE: Key missing or invalid.");
}

const app = express();
app.disable('x-powered-by'); // Hide stack details
const port = process.env.PORT || 3000;

// Initialize Supabase Admin Client (Service Role)
// Only needed if performing admin actions like Delete/Update on restricted tables
const supabaseAdmin = process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_KEY 
    ? createClient(process.env.SUPABASE_URL.trim(), process.env.SUPABASE_SERVICE_KEY.trim()) 
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

// CRITICAL AUTH CHECKS
if (!process.env.ADMIN_PASSCODE) {
    console.error("❌ CRITICAL: ADMIN_PASSCODE not found in .env. Admin login will be disabled.");
}
if (!process.env.JWT_SECRET) {
    console.error("❌ CRITICAL: JWT_SECRET not found in .env. Authentication will fail.");
}

// --- SECURITY & OPTIMIZATION MIDDLEWARE ---
app.use(compression());

// 1. Helmet: Sets various HTTP headers for security
app.use(helmet({
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'", "https://unpkg.com", "https://cdn.jsdelivr.net", "https://cdnjs.cloudflare.com", "https://assets.calendly.com", "https://js.stripe.com"],
            scriptSrcAttr: ["'unsafe-inline'"],
            styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com", "https://assets.calendly.com"],
            fontSrc: ["'self'", "https://fonts.gstatic.com"],
            imgSrc: ["'self'", "data:", "https:", "blob:"],
            connectSrc: ["'self'", "https://*.supabase.co", "wss://*.supabase.co", "https://api.openai.com", "https://generativelanguage.googleapis.com", "https://calendly.com", "https://api.stripe.com"],
            mediaSrc: ["'self'", "https:"],
            frameSrc: ["'self'", "https://calendly.com", "https://open.spotify.com", "https://embed.music.apple.com", "https://music.apple.com", "https://www.youtube.com", "https://w.soundcloud.com", "https://js.stripe.com", "https://hooks.stripe.com"],
            objectSrc: ["'none'"],
            upgradeInsecureRequests: [],
        },
    },
}));

// --- EMAIL WORKFLOW SYSTEM ---
const BUSINESS_EMAILS = {
    MAIN: 'eli3gant@onlytrueperspective.tech',
    CONTACT: 'contact@onlytrueperspective.tech',
    BOOKINGS: 'bookings@onlytrueperspective.tech',
    INFO: 'info@onlytrueperspective.tech'
};

async function sendSecureEmail({ to, subject, html, text, from = BUSINESS_EMAILS.CONTACT }) {
    const key = process.env.RESEND_API_KEY; // Recommended service
    
    // For local dev/demo, we log the intent if no key exists
    if (!key) {
        console.log(`
[📩 EMAIL WORKFLOW SIMULATION]
FROM: ${from}
TO: ${to}
SUBJECT: ${subject}
BODY: ${text || 'HTML Content Sent'}
-------------------------------
        `);
        return { success: true, simulated: true };
    }

    try {
        const response = await fetch('https://api.resend.com/emails', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${key}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                from: `OnlyTruePerspective <${from}>`,
                to: [to],
                subject,
                html,
                text
            })
        });
        const data = await response.json();
        return { success: response.ok, data };
    } catch (e) {
        console.error("❌ Email Sending Failed:", e.message);
        return { success: false, error: e.message };
    }
}

// 3. Global Cache Protocol (BREAK PERSISTENT BROWSER CACHING)
app.use((req, res, next) => {
    res.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    res.set('Pragma', 'no-cache');
    res.set('Expires', '0');
    res.set('Surrogate-Control', 'no-store');
    next();
});

// 2. Compression: Gzip/Brotli for text assets
app.use(compression());

// --- STATIC ASSETS (CRITICAL FIX) ---
const staticPath = __dirname;
console.log("Static Path Configured:", staticPath);

app.use(express.static(staticPath, {
    maxAge: '1d',
    etag: true
}));

// Root Route
app.get('/', (req, res) => {
    res.sendFile(path.join(staticPath, 'index.html'));
});

// Static Fallback for Vercel
app.get('/:file', (req, res, next) => {
    const file = req.params.file;
    const ext = path.extname(file).toLowerCase();
    const allowed = ['.html', '.css', '.js', '.png', '.jpg', '.jpeg', '.gif', '.svg', '.webp', '.ico', '.webmanifest', '.xml', '.txt'];
    
    if (allowed.includes(ext)) {
        return res.sendFile(path.join(staticPath, file), (err) => {
            if (err) next();
        });
    }
    next();
});


app.get('/api/status', async (req, res) => {
    try {
        if (!supabaseAdmin) return res.json({ status: 'ERR', database: 'DISCONNECTED', message: 'No Service Key' });
        const { error } = await supabaseAdmin.from('posts').select('id', { head: true, count: 'exact' }).limit(1);
        if (error) throw error;
        res.json({ status: 'UP', database: 'CONNECTED', timestamp: new Date().toISOString() });
    } catch (e) {
        res.status(500).json({ status: 'ERR', database: 'DISCONNECTED', message: e.message });
    }
});

// 3. CORS: Allow same-origin (adjust if frontend is separate)
// 3. CORS: Restrict to main domain and known satellites
const allowedOrigins = [
    'https://onlytrueperspective.tech',
    'https://www.onlytrueperspective.tech',
    'https://otp-site.vercel.app',
    'http://localhost:3000',
    'http://localhost:8080',
    'http://localhost:5500' // Local dev (Live Server)
];
app.use(cors({
    origin: (origin, callback) => {
        if (!origin) return callback(null, true);
        
        if (allowedOrigins.includes(origin)) {
            callback(null, true);
        } else {
            // Tighten Vercel Preview URL matching if necessary
            if (origin.endsWith('.vercel.app') && !origin.includes('evil')) {
                callback(null, true);
            } else {
                console.warn(`🛑 CORS Blocked: ${origin}`);
                callback(new Error('CORS Policy Restricted'));
            }
        }
    },
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept', 'Origin'],
    credentials: true,
    optionsSuccessStatus: 200
}));
app.options('*', cors()); // Enable pre-flight for all routes

// LOG OPTIONS REQUESTS (DEBUGGING 405)
app.use((req, res, next) => {
    if (req.method === 'OPTIONS') {
        console.log(`📡 OPTIONS PREFLIGHT: ${req.url} | Origin: ${req.headers.origin}`);
    }
    next();
});

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
// --- VERBOSE REQUEST LOGGING ---
app.use((req, res, next) => {
    const log = `[${new Date().toISOString()}] ${req.method} ${req.url} - IP: ${req.ip}\n`;
    // fs.appendFile removed for Vercel
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
app.get('/api', (req, res) => {
    res.send("OTP API SERVICE RUNNING");
});
app.get('/ping', (req, res) => res.json({ status: 'PONG', timestamp: new Date() }));
app.get('/api/health', async (req, res) => {
    const health = {
        status: 'UP',
        timestamp: new Date(),
        integrations: {
            supabase: 'UNKNOWN',
            stripe: !!stripe ? 'CONFIGURED' : 'DISCONNECTED',
            ai: (!!process.env.GEMINI_API_KEY || !!process.env.OPENAI_API_KEY || !!process.env.ANTHROPIC_API_KEY || !!process.env.GROQ_API_KEY) ? 'CONFIGURED' : 'UNAVAILABLE'
        }
    };
    
    try {
        if (supabaseAdmin) {
            const { error } = await supabaseAdmin.from('posts').select('id', { count: 'exact', head: true }).limit(1);
            health.integrations.supabase = error ? 'ERROR' : 'CONNECTED';
        }
    } catch(e) { health.integrations.supabase = 'ERROR'; }

    res.json(health);
});

app.get('/api/status', (req, res) => {
    res.json({ version: 'v10.5.1', env: process.env.NODE_ENV, stripe: !!stripe });
});

app.all('/api/diag', (req, res) => {
    res.json({ method: req.method, path: req.path, headers: req.headers });
});

// Strict Rate Limiting for Login Route (Brute-force protection)
const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 10, // Limit each IP to 10 login requests per windowMs
    message: { success: false, message: "Too many login attempts. Please try again in 15 minutes." }
});

app.post('/api/auth/login', authLimiter, (req, res) => {
    let { passcode } = req.body;
    const envPass = (process.env.ADMIN_PASSCODE || '').trim();
    // Robust comparison with trimming and case-insensitivity
    if (passcode && passcode.trim().toLowerCase() === envPass.toLowerCase()) {
        // Issue JWT
        const token = jwt.sign({ role: 'admin' }, process.env.JWT_SECRET, { expiresIn: '12h' });
        return res.json({ success: true, token });
    }
    
    // SECURITY: Do not log the target passcode in production!
    console.warn(`🔓 Failed login attempt for passcode: [REDACTED]`);
    return res.status(401).json({ success: false, message: 'Access Denied: Invalid Passcode' });
});

// Middleware to verify JWT
const verifyToken = (req, res, next) => {
    const bearerHeader = req.headers['authorization'];
    if (typeof bearerHeader !== 'undefined') {
        const bearer = bearerHeader.split(' ');
        const bearerToken = bearer[1];

        // STATIC BYPASS (Dev Only or Explicitly Enabled)
        const isLocal = req.hostname === 'localhost' || req.hostname === '127.0.0.1';
        const isDev = process.env.NODE_ENV === 'development';
        const legacyBypass = process.env.LEGACY_BYPASS_ENABLED === 'true';
        
        if (bearerToken === 'static-bypass-token' && (legacyBypass || (isLocal && isDev))) {
            req.auth = { role: 'admin', bypass: true };
            return next();
        }

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
    const { provider, prompt, title, systemPrompt, model, modelConfig = {}, keys = {} } = req.body;
    
    try {
        let result;
        let usage;
        if (provider === 'openai') {
            const openaiKey = (process.env.OPENAI_API_KEY || keys.openai || '').trim();
            if (!openaiKey) throw new Error("OpenAI Key not configured on server or terminal.");
            
            const response = await fetch('https://api.openai.com/v1/chat/completions', {
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json', 
                    'Authorization': `Bearer ${openaiKey}` 
                },
                body: JSON.stringify({
                    model: "gpt-4o",
                    messages: [
                        { role: "system", content: systemPrompt }, 
                        { role: "user", content: `Generate post: "${title}". Focus: ${prompt}` }
                    ],
                    temperature: 0.8,
                    response_format: { type: "json_object" },
                    user: "admin-otp"
                })
            });
            
            const data = await response.json();
            if (data.error) throw new Error(data.error.message);
            result = JSON.parse(data.choices[0].message.content);
            usage = data.usage;

        } else if (provider === 'gemini') {
            const geminiKey = (process.env.GEMINI_API_KEY || keys.gemini || '').trim();
            if (!geminiKey) throw new Error("Gemini Key not configured on server or terminal.");
            
            const candidates = model ? [model] : ['gemini-2.0-flash', 'gemini-1.5-flash', 'gemini-1.5-pro'];
            const versions = ['v1', 'v1beta'];
            
            // Map standard OpenAI-style model configs to Gemini format
            const geminiConfig = { response_mime_type: "application/json" };
            if (modelConfig.temperature !== undefined) geminiConfig.temperature = modelConfig.temperature;
            if (modelConfig.max_tokens !== undefined) geminiConfig.maxOutputTokens = modelConfig.max_tokens;
            if (modelConfig.top_p !== undefined) geminiConfig.topP = modelConfig.top_p;

            const payload = {
                systemInstruction: {
                    parts: [{ text: systemPrompt || 'You are a professional blog writer.' }]
                },
                contents: [{ 
                    role: 'user',
                    parts: [{ text: `Generate a post titled "${title || 'New Insight'}" based on this prompt: "${prompt}". Return ALL fields as JSON.` }] 
                }],
                generationConfig: geminiConfig
            };

            let lastErr = "";
            let success = false;

            for (const v of versions) {
                if(success) break;
                for (const m of candidates) {
                    if(success) break;
                    try {
                        const cleanModel = m.includes('models/') ? m : `models/${m}`;
                        console.log(`🤖 Gemini [${v}] Probing: ${cleanModel}...`);
                        const apiRes = await fetch(`https://generativelanguage.googleapis.com/${v}/${cleanModel}:generateContent?key=${geminiKey}`, {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify(payload)
                        });
                        
                        const data = await apiRes.json();
                        
                        if (data.error) {
                            lastErr = `${m} [${v}]: ${data.error.message}`; 
                            console.warn(`⚠️ ${m} [${v}] Failed: ${data.error.message}`);
                            continue;
                        }

                        if (data.candidates && data.candidates[0].finishReason === 'SAFETY') {
                            lastErr = `${m} [${v}]: NEURAL BLOCK: Content flagged by safety filter.`;
                            console.warn(`⚠️ ${m} [${v}] SAFETY BLOCK.`);
                            continue;
                        }

                        if (data.candidates && data.candidates[0].content && data.candidates[0].content.parts && data.candidates[0].content.parts[0].text) {
                            let text = data.candidates[0].content.parts[0].text;
                            // Robust JSON Extraction
                            const jsonMatch = text.match(/\{[\s\S]*\}/);
                            if (jsonMatch) text = jsonMatch[0];
                            
                            result = JSON.parse(text);
                            usage = data.usageMetadata ? { total_tokens: data.usageMetadata.totalTokenCount } : null;
                            success = true;
                            console.log(`✅ Success via ${m} [${v}]`);
                        } else { 
                            lastErr = `${m} [${v}]: Unexpected response structure.`;
                            console.warn(`⚠️ ${m} [${v}] Unexpected format:`, JSON.stringify(data).substring(0, 100));
                        }
                    } catch (e) {
                        lastErr = `${m} [${v}]: ${e.message}`;
                    }
                }
            }
            if(!success) throw new Error(`Gemini Probe Failed: ${lastErr}`);

        } else if (provider === 'anthropic') {
            const anthropicKey = (process.env.ANTHROPIC_API_KEY || keys.anthropic || '').trim();
            if (!anthropicKey) throw new Error("Claude Key not configured on server or terminal.");
            const response = await fetch('https://api.anthropic.com/v1/messages', {
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json', 
                    'x-api-key': anthropicKey,
                    'anthropic-version': '2023-06-01'
                },
                body: JSON.stringify({
                    model: model || 'claude-3-5-sonnet-20240620',
                    max_tokens: 4000,
                    messages: [{ role: 'user', content: `${systemPrompt}\n\n${title}: ${prompt}` }],
                    ...modelConfig
                })
            });
            const data = await response.json();
            if (data.error) throw new Error(data.error.message);
            result = JSON.parse(data.content[0].text);
            usage = data.usage ? { total_tokens: data.usage.input_tokens + data.usage.output_tokens } : null;

        } else if (provider === 'groq') {
            const groqKey = (process.env.GROQ_API_KEY || '').trim();
            if (!groqKey) throw new Error("Groq Key not configured on server.");
            const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${groqKey}` },
                body: JSON.stringify({
                    model: model || 'llama-3.1-70b-versatile',
                    messages: [
                        { role: 'system', content: systemPrompt },
                        { role: "user", content: `Generate post: "${title}". ${prompt}` }
                    ],
                    response_format: { type: "json_object" },
                    ...modelConfig
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
        res.status(500).json({ 
            success: false, 
            message: error.message || "Internal Server Error during AI generation" 
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

    const allowedTables = ['posts', 'broadcasts', 'leads', 'contacts', 'categories', 'ai_archetypes'];
    if (!allowedTables.includes(targetTable)) {
        return res.status(403).json({ success: false, message: "Restricted table access denied" });
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

// 3.5 Admin Write Endpoint (Bypasses RLS for secure writing)
app.post('/api/admin/write-data', verifyToken, async (req, res) => {
    const { id, payload, table } = req.body;
    const targetTable = table || 'posts';
    
    if (!supabaseAdmin) {
        return res.status(500).json({ success: false, message: "Server misconfiguration: Missing Supabase Service Key" });
    }

    const allowedTables = ['posts', 'broadcasts', 'leads', 'contacts', 'site_content', 'categories', 'ai_archetypes'];
    if (!allowedTables.includes(targetTable)) {
        return res.status(403).json({ success: false, message: "Restricted table access denied" });
    }

    try {
        let query;
        if (id) {
            // Ensure updated_at is set for tracking
            if (!payload.updated_at) payload.updated_at = new Date().toISOString();
            query = supabaseAdmin.from(targetTable).update(payload).eq('id', id);
        } else {
            // INSERT
            // Ensure created/updated timestamps exist
            if (!payload.created_at) payload.created_at = new Date().toISOString();
            if (!payload.updated_at) payload.updated_at = payload.created_at;
            query = supabaseAdmin.from(targetTable).insert([payload]);
        }

        const { data, error } = await query.select();
        if (error) throw error;

        res.json({ success: true, message: id ? "Updated" : "Created", data });

    } catch (error) {
        console.error("Save Error:", error.message);
        res.status(500).json({ success: false, message: error.message });
    }
});

// 2.7 Secure Multi-Table Data Fetching (Bypass RLS via Service Key)
app.post('/api/admin/fetch-data', verifyToken, async (req, res) => {
    const { table, select = '*', order = 'created_at', descending = true, filters = [], limit } = req.body;
    
    if (!supabaseAdmin) return res.status(503).json({ success: false, message: "Database Admin Interface Offline" });

    try {
        let query = supabaseAdmin.from(table).select(select);
        
        // Apply basic filters if any
        filters.forEach(f => {
            if (f.op === 'eq') query = query.eq(f.column, f.value);
            if (f.op === 'neq') query = query.neq(f.column, f.value);
        });

        query = query.order(order, { ascending: !descending });

        // Apply limit if provided
        if (limit && Number.isInteger(limit) && limit > 0) {
            query = query.limit(limit);
        }

        const { data, error } = await query;
        
        if (error) throw error;
        res.json({ success: true, data });

    } catch (error) {
        console.error(`Fetch Error [${table}]:`, error.message);
        res.status(500).json({ success: false, message: error.message });
    }
});

// 4. Secure Image Generation (DALL-E 3 + Supabase Storage)
// 2.5 Secure AI Chat Completion (Generic)
app.post('/api/ai/chat', verifyToken, async (req, res) => {
    const { provider, messages, systemPrompt, model, modelConfig = {} } = req.body;
    
    try {
        let result;
        if (provider === 'openai') {
            const openaiKey = (process.env.OPENAI_API_KEY || '').trim();
            if (!openaiKey) throw new Error("OpenAI Key not configured on server.");
            
            const response = await fetch('https://api.openai.com/v1/chat/completions', {
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json', 
                    'Authorization': `Bearer ${openaiKey}` 
                },
                body: JSON.stringify({
                    model: "gpt-4o",
                    messages: [
                        { role: "system", content: systemPrompt || "You are a professional assistant." },
                        ...messages
                    ],
                    ...modelConfig
                })
            });
            
            const data = await response.json();
            if (data.error) throw new Error(data.error.message);
            result = data.choices[0].message.content;

        } else if (provider === 'gemini') {
            const geminiKey = (process.env.GEMINI_API_KEY || '').trim();
            if (!geminiKey) throw new Error("Gemini Key not configured on server.");
            
            const m = model || 'gemini-1.5-flash';
            const payload = {
                systemInstruction: {
                    parts: [{ text: systemPrompt || 'You are a professional assistant.' }]
                },
                contents: messages.map(msg => ({
                    role: msg.role === 'assistant' ? 'model' : 'user',
                    parts: [{ text: msg.content }]
                })),
                generationConfig: modelConfig
            };

            const apiRes = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${m}:generateContent?key=${geminiKey}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            
            const data = await apiRes.json();
            if (data.error) throw new Error(data.error.message);
            result = data.candidates[0].content.parts[0].text;

        } else {
            throw new Error("Invalid provider requested for chat.");
        }

        res.json({ success: true, data: result });

    } catch (error) {
        console.error("AI Chat Error:", error.stack);
        res.status(500).json({ success: false, message: error.message });
    }
});

app.post('/api/ai/generate-image', verifyToken, async (req, res) => {
    const { prompt, title, aspect_ratio, cloud_key } = req.body;
    
    try {
        let buffer;

        // Try OpenAI DALL-E 3 First (If Key Provided)
        const openaiKey = (process.env.OPENAI_API_KEY || '').trim();
        const apiKey = openaiKey || cloud_key;
        let usedOpenAI = false;

        if (apiKey && apiKey.length > 10) {
            try {
                const aiRes = await fetch('https://api.openai.com/v1/images/generations', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey.trim()}` },
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
                
                const imgRes = await fetch(aiData.data[0].url);
                buffer = Buffer.from(await imgRes.arrayBuffer());
                usedOpenAI = true;
            } catch(e) {
                console.warn("OpenAI Image Sync Failed, triggering Flux fallback:", e.message);
            }
        }

        // 2. Flux Image Proxy Failover (High-Speed Cinematic Engine)
        if (!usedOpenAI) {
            const width = aspect_ratio === 'landscape' ? 1280 : 1024;
            const height = aspect_ratio === 'landscape' ? 720 : 1024;
            
            const models = ['flux', 'flux-pro', 'flux-realism', 'any'];
            const seed = Date.now();
            const enhancedPrompt = `${prompt}. Cinematic lighting, ultra-detailed. Style: Dark futuristic.`;
            const safePrompt = encodeURIComponent(enhancedPrompt);

            let success = false;
            let lastErr = "";

            // --- TIER 1: MULTI-MODEL PROBE ---
            for (const m of models) {
                if (success) break;
                try {
                    const url = `https://pollinations.ai/p/${safePrompt}?width=${width}&height=${height}&nologo=true&seed=${seed}&model=${m}`;
                    console.log(`🤖 Visual Probing [${m}]: ${url.substring(0, 80)}...`);
                    const res = await fetch(url, { signal: AbortSignal.timeout(15000) });
                    if (res.ok) {
                        buffer = Buffer.from(await res.arrayBuffer());
                        success = true;
                        console.log(`✅ Success via ${m}`);
                    } else {
                        lastErr = `HTTP ${res.status}`;
                    }
                } catch(e) {
                    lastErr = e.message;
                }
            }

            // --- TIER 2: RAW BYPASS (SIMPLEST URL) ---
            if (!success) {
                try {
                    console.log("⚠️ Neural Synthesis Straining. Attempting RAW Bypass...");
                    const bypassUrl = `https://pollinations.ai/p/${encodeURIComponent(prompt)}?width=1024&height=1024&nologo=true`;
                    const res = await fetch(bypassUrl, { signal: AbortSignal.timeout(10000) });
                    if (res.ok) {
                        buffer = Buffer.from(await res.arrayBuffer());
                        success = true;
                    }
                } catch(e) { lastErr = e.message; }
            }

            // --- TIER 3: STATIC DECONSTRUCTION FALLBACK (LAST RESORT) ---
            if (!success) {
                console.warn("🛑 All Visual Engines Exhausted. Using Static Deconstruction Background.");
                // High-End dark tech placeholder from stock-ish source
                const fallbackUrl = "https://images.unsplash.com/photo-1635776062127-d379bfcbb9c8?q=80&w=1792&h=1024&auto=format&fit=crop";
                try {
                    const res = await fetch(fallbackUrl);
                    buffer = Buffer.from(await res.arrayBuffer());
                    success = true;
                } catch(e) {
                    throw new Error(`CRITICAL SYSTEM FAILURE: ${lastErr}`);
                }
            }
        }

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


// --- ANALYTICS UPLINK (Bypasses RLS to increment views) ---
// MOVED TO /api/analytics/view (Line 1145) for better robustness.

// 5. CONTACT AGENT (AI Auto-Draft)
app.post('/api/contact/submit', async (req, res) => {
    const { name, email, project_type, project_details, budget, timeline, _gotcha } = req.body;
    
    // 0. Honeypot Spam Check
    if (_gotcha) {
        console.warn(`🛑 Spam caught by honeypot: ${email}`);
        return res.status(200).json({ success: true, message: "Contact received." }); // Fake success for bots
    }

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
                name, 
                email, 
                service: project_type, // Map to DB column
                message: project_details, // Map to DB column
                budget, 
                timeline, 
                ai_status: 'processing' 
            }])
            .select()
            .single();

        if (dbError) throw dbError;

        // 3. INTERNAL NOTIFICATION (Forward to contact@)
        await sendSecureEmail({
            to: BUSINESS_EMAILS.CONTACT,
            subject: `[NEW LEAD] ${name} // OTP`,
            html: `
                <div style="font-family: sans-serif; padding: 20px; background: #000; color: #fff;">
                    <h2 style="color: #00ffaa; border-bottom: 1px solid #333; padding-bottom: 10px;">TACTICAL LEAD ACQUISITION</h2>
                    <p><strong>NAME:</strong> ${name}</p>
                    <p><strong>EMAIL:</strong> ${email}</p>
                    <p><strong>PROJECT TYPE:</strong> ${project_type}</p>
                    <p><strong>BUDGET:</strong> ${budget || 'N/A'}</p>
                    <p><strong>TIMELINE:</strong> ${timeline || 'N/A'}</p>
                    <p><strong>DETAILS:</strong><br>${project_details}</p>
                    <div style="margin-top: 20px; font-size: 0.8rem; color: #666;">
                        Generated via OTP Portal System // ID: ${contactData.id}
                    </div>
                </div>
            `,
            text: `NEW LEAD: ${name}\nEmail: ${email}\nProject Type: ${project_type}\nBudget: ${budget}\nTimeline: ${timeline}\n\nMessage:\n${project_details}`,
            from: BUSINESS_EMAILS.CONTACT
        });

        // 4. AUTO-RESPONSE (Send to Lead)
        await sendSecureEmail({
            to: email,
            subject: 'We got your request — OnlyTruePerspective',
            text: `Hey — appreciate you reaching out to OnlyTruePerspective.\n\nWe just received your request and we’re reviewing it now.\n\nIf you want to speed things up, reply with your timeline, budget range, and any references or examples.\n\nWe’ll get back to you shortly.\n\n– ELI\nOnlyTruePerspective`,
            html: `
                <div style="font-family: sans-serif; line-height: 1.6; color: #111;">
                    <p>Hey — appreciate you reaching out to OnlyTruePerspective.</p>
                    <p>We just received your request and we’re reviewing it now.</p>
                    <p>If you want to speed things up, reply with your timeline, budget range, and any references or examples.</p>
                    <p>We’ll get back to you shortly.</p>
                    <br>
                    <p><strong>– ELI</strong><br>OnlyTruePerspective</p>
                </div>
            `,
            from: BUSINESS_EMAILS.CONTACT
        });

        // 5. TRIGGER AI AGENT (Content Analysis & Draft Generation)
        const systemPrompt = `You are the Studio Manager for 'Only True Perspective' (OTP), a high-end creative agency.
        Draft a high-status, professional reply email for ${name}.
        Sign off with "OTP // Visual Division".`;

        const userPrompt = `Lead: ${name}\nService: ${project_type}\nBudget: ${budget}\nDetails: ${project_details}`;
        
        let draftReply = "";
        try {
            if (process.env.GEMINI_API_KEY) {
                const geminiKey = (process.env.GEMINI_API_KEY || '').trim();
                let data = null;
                const endpoints = ['v1', 'v1beta'];
                for (const v of endpoints) {
                    try {
                        const response = await fetch(`https://generativelanguage.googleapis.com/${v}/models/gemini-1.5-flash:generateContent?key=${geminiKey}`, {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                                contents: [{ parts: [{ text: systemPrompt + "\n\n" + userPrompt }] }]
                            })
                        });
                        data = await response.json();
                        if (data?.candidates?.[0]?.content?.parts?.[0]?.text) {
                            draftReply = data.candidates[0].content.parts[0].text;
                            break;
                        } else if (data.error) {
                            console.warn(`⚠️ Lead Draft Prompt [${v}] Error:`, data.error.message);
                        }
                    } catch (fetchErr) {
                        console.warn(`⚠️ Lead Draft Prompt [${v}] Fetch Error:`, fetchErr.message);
                    }
                }
            } 
        } catch (aiError) {
            console.warn("⚠️ AI Drafting fallback triggered:", aiError.message);
        }
        
        // Update DB with Draft
        if (draftReply) {
            await adminClient
                .from('contacts')
                .update({ 
                    draft_reply: draftReply,
                    ai_status: 'drafted',
                    ai_analysis: { processed_at: new Date().toISOString() }
                })
                .eq('id', contactData.id);
        }

        res.json({ success: true, message: "Contact workflow initiated successfully." });

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
        // Sanitization with safe limits
        const sanitize = (s, len) => (typeof s === 'string' ? s.replace(/[<>"{}$[\]\\]/g, '') : '').substring(0, len);
        
        const goal = sanitize(answers.q1, 50) || 'Unknown';
        const hurdle = sanitize(answers.q2, 50) || 'Unknown';
        const platform = sanitize(answers.q3, 50) || 'Unknown';
        const vibe = sanitize(answers.q4, 50) || 'Unknown';
        const specificGoal = sanitize(answers.q5_goal, 200) || 'Not specified';

        const systemPrompt = `You are the 'OTP Oracle', a high-dimensional strategy entity. 
        Your task is to provide a "Perspective Audit" that feels uniquely calculated for the user.
        
        STYLE GUIDELINES (STRICT):
        1. **Hyper-Detail**: Provide real-life, actionable tips. Don't be vague. Give them the actual move.
        2. **Radical Specificity**: You MUST weave the user's specific goal ("${specificGoal}") and platform ("${platform}") into every single point.
        3. **High-Status / Tactical Tone**: Professional, visionary, slightly mystical, but grounded in technical and street reality.
        4. **NO CORNINESS**: Absolutely FORBIDDEN phrases: "In today's fast-paced world", "Unlock your potential", "Elevate your brand", "Harness the power", "The road to success", "Game-changer".
        5. **Maximum Value**: Under 250 words. Focus on raw insight over filler. Just the Truth. No introductions or 'Hope this helps'. Start directly with the situation.`;

        const userPrompt = `ANALYZE THIS SIGNAL:
        - CORE OBJECTIVE: ${goal}
        - THE BARRIER: ${hurdle}
        - REALM: ${platform}
        - TARGET AESTHETIC: ${vibe}
        - THE SPECIFIC MISSION: "${specificGoal}"
         
        OUTPUT STRUCTURE (Strictly enforce):
        
        **YOUR SITUATION.**
        (Briefly explain why "${hurdle}" is the main blocker for "${specificGoal}". Be direct.)
        
        **THE MOVE.**
        1. **The Tactical Pivot**: (One specific action for ${platform} to hit "${specificGoal}".)
        2. **Visual Rebranding**: (How to achieve the "${vibe}" look right now.)
        3. **The Habit**: (A simple daily rule to ensure success.)
        
        **THE CORE.**
        (Give 2 specific insider tips for "${platform}" that directly help achieve "${specificGoal}". No filler.)

        **THE TAKE.**
        (A short, powerful closing thought for the creator.)`;

        let advice = "";

        // 2. Call Gemini (With Robust Logic)
        if (process.env.GEMINI_API_KEY) {
            const modelsToTry = ['gemini-2.0-flash', 'gemini-1.5-pro', 'gemini-1.5-flash'];
            let success = false;
            
            const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

            for (let i = 0; i < modelsToTry.length; i++) {
                const modelName = modelsToTry[i];
                if (success) break;
                try {
                    console.log(`[ORACLE] Transmitting signal to AI Realm via ${modelName}...`);
                    
                    const controller = new AbortController();
                    const timeoutId = setTimeout(() => controller.abort(), 15000); // Extended to 15s to allow deep strategy synthesis

                    const geminiKey = (process.env.GEMINI_API_KEY || '').trim();
                    const startTime = Date.now();
                    
                    const fetchPromise = fetch(`https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${geminiKey}`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            systemInstruction: {
                                parts: [{ text: systemPrompt }]
                            },
                            contents: [{ 
                                role: 'user',
                                parts: [{ text: userPrompt }] 
                            }],
                            generationConfig: {
                                temperature: 0.85,
                                maxOutputTokens: 1500,
                                topP: 0.9,
                                topK: 40
                            },
                            safetySettings: [
                                { category: "HARM_CATEGORY_HARASSMENT", threshold: "BLOCK_ONLY_HIGH" },
                                { category: "HARM_CATEGORY_HATE_SPEECH", threshold: "BLOCK_ONLY_HIGH" },
                                { category: "HARM_CATEGORY_SEXUALLY_EXPLICIT", threshold: "BLOCK_ONLY_HIGH" },
                                { category: "HARM_CATEGORY_DANGEROUS_CONTENT", threshold: "BLOCK_ONLY_HIGH" }
                            ]
                        }),
                        signal: controller.signal
                    });

                    const response = await fetchPromise.finally(() => clearTimeout(timeoutId));
                    const duration = Date.now() - startTime;

                    if (response.status === 429) {
                        console.warn(`[ORACLE-WARN] Realm Congestion (HTTP 429) on ${modelName} after ${duration}ms.`);
                        if (i < modelsToTry.length - 1) await delay(1000 * Math.pow(2, i + 1));
                        continue;
                    }

                    if (!response.ok) {
                        const errData = await response.text();
                        console.error(`[ORACLE-ERROR] HTTP ${response.status} on ${modelName}. Body: ${errData}`);
                        throw new Error(`API Error: ${response.status}`);
                    }

                    const data = await response.json();
                    
                    if (data && data.candidates && data.candidates[0] && data.candidates[0].content && data.candidates[0].content.parts) {
                        advice = data.candidates[0].content.parts[0].text;
                        success = true;
                        console.log(`[ORACLE-SUCCESS] Transmission Captured via ${modelName} in ${duration}ms. Tokens: ${data.usageMetadata?.totalTokenCount || 'N/A'}`);
                    } else if (data.error) {
                        console.error(`[ORACLE-ERROR] Gemini Error Response (${modelName}):`, data.error.message);
                    } else if (data.candidates && data.candidates[0].finishReason === 'SAFETY') {
                        console.warn(`[ORACLE-WARN] SAFETY BLOCK triggered on ${modelName}`);
                    } else {
                        console.warn(`[ORACLE-WARN] Unexpected response format from ${modelName}:`, JSON.stringify(data).substring(0, 200));
                    }
                } catch (fetchError) {
                    const isTimeout = fetchError.name === 'AbortError';
                    console.error(`[ORACLE-FAILED] Portal Error (${modelName}):`, isTimeout ? 'TIMEOUT (15s)' : fetchError.message);
                    if (!isTimeout) await delay(1500); // Backoff before retry
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
        // FAIL-SAFE: Never show the user a 500 error. Fallback to the hardcoded advice.
        const fallbackAdvice = `**THE DIAGNOSIS.**
The neural link encountered static, but your signal was received. The path to "${req.body.answers?.q5_goal || 'Excellence'}" requires immediate action.

**THE PLAN.**
1. **The Reset**: Clear your current strategy board. Start fresh today.
2. **The Visuals**: Simplify. If it doesn't serve the goal, delete it.
3. **The Protocol**: One high-value action every morning before consumption.

**THE FORTUNE.**
"Obstacles are just instructions in disguise."`;

        res.json({ success: true, advice: fallbackAdvice });
    }
});

// --- ADMIN POWER TOOLS (Service Role Bypass) ---
app.post('/api/admin/purge-leads', verifyToken, async (req, res) => {
    if (!supabaseAdmin) return res.status(500).json({ error: 'Server Audit Config Missing (SUPABASE_SERVICE_KEY)' });

    try {
        // 1. Authentication handled by verifyToken middleware
        console.log(`🗑️ PURGE LEADS initiated by Admin`);
        
        // Use the absolute "Delete Everything" filter for UUIDs
        const { error } = await supabaseAdmin.from('leads').delete().not('id', 'is', null);

        if (error) throw error;
        
        res.json({ success: true, message: 'System Purge Complete' });

    } catch (e) {
        console.error("Purge Error:", e);
        res.status(500).json({ error: e.message });
    }
});

// --- PURGE ALL INBOX CONTACTS ---
app.post('/api/admin/purge-contacts', verifyToken, async (req, res) => {
    if (!supabaseAdmin) return res.status(500).json({ success: false, message: 'Server Config Missing (SUPABASE_SERVICE_KEY)' });

    try {
        console.log(`🗑️ PURGE CONTACTS/INBOX initiated by Admin`);
        const { error } = await supabaseAdmin.from('contacts').delete().not('id', 'is', null);
        if (error) throw error;
        res.json({ success: true, message: 'Inbox purged successfully' });
    } catch (e) {
        console.error("Inbox Purge Error:", e);
        res.status(500).json({ success: false, message: e.message });
    }
});

// --- NEW SECURE PROXIES (Relay Client Actions to Service Role) ---

// 6.1 Secure Analytics Tracking
app.post('/api/analytics/view', async (req, res) => {
    const { slug } = req.body;
    if (!slug) return res.status(400).json({ success: false, message: "Missing Slug" });

    // Prevent direct spamming by checking simple rate limit (already applied globally, but logic here helps too)
    // We strictly use the Service Key here to bypass "Anonymous" RLS restrictions on UPDATES.
    if (!supabaseAdmin) return res.status(500).json({ success: false, message: "Server Analytics Config Missing" });

    try {
        // 1. Try Posts Table
        // We use the RPC if possible, otherwise manual select+update
        // RPC is preferred for atomicity: create function increment_view_count(post_slug text) ...
        
        let handled = false;

        // Try RPC first (Atomic)
        const { error: rpcError } = await supabaseAdmin.rpc('increment_view_count', { post_slug: slug });
        if (!rpcError) {
            handled = true;
        } else {
            // Fallback: Manual Update (Race conditions possible but rare for this scale)
            // Check Posts
            const { data: pData } = await supabaseAdmin.from('posts').select('views, id').eq('slug', slug).single();
            if (pData) {
                await supabaseAdmin.from('posts').update({ views: (pData.views || 0) + 1 }).eq('id', pData.id);
                handled = true;
            } else {
                // Check Broadcasts
                const { data: bData } = await supabaseAdmin.from('broadcasts').select('views, id').eq('slug', slug).single();
                if (bData) {
                    await supabaseAdmin.from('broadcasts').update({ views: (parseInt(bData.views) || 0) + 1 }).eq('id', bData.id);
                    handled = true;
                }
            }
        }

        if (handled) res.json({ success: true });
        else res.json({ success: false, message: "Slug not found in valid tables" });

    } catch (e) {
        console.error("Analytics Error:", e);
        res.status(500).json({ error: e.message });
    }
});

// 6.2 Secure Live Editor Update
app.post('/api/content/update', verifyToken, async (req, res) => {
    const { updates } = req.body; // Array of { key, content }
    
    if (!updates || !Array.isArray(updates)) {
        return res.status(400).json({ success: false, message: "Invalid payload" });
    }

    if (!supabaseAdmin) return res.status(500).json({ success: false, message: "Server DB Config Missing" });

    try {
        console.log(`📝 Secure Content Update: ${updates.length} items from ${req.auth?.role || 'admin'}`);
        
        const { error } = await supabaseAdmin.from('site_content').upsert(updates.map(u => ({
            key: u.key,
            content: u.content,
            updated_by: 'admin-proxy',
            updated_at: new Date().toISOString()
        })));

        if (error) throw error;
        
        res.json({ success: true, message: "Content Updated Securely" });

    } catch (e) {
        console.error("Content Update Error:", e);
        res.status(500).json({ error: e.message });
    }
});

// 7. STRIPE CHECKOUT SESSION (ADDED FOR PAYMENTS)
app.route('/api/create-checkout-session')
    .post(async (req, res) => {
    const { packageName, customerEmail } = req.body;
    
    // Check if Stripe is actually ready (Key might be invalid or missing)
    if (!stripe) {
        return res.status(500).json({ error: "PAYMENT SYSTEM OFFLINE (Stripe Config Error)" });
    }

    const protocol = req.headers['x-forwarded-proto'] || 'https';
    const host = req.get('host');
    const origin = req.headers.origin || `${protocol}://${host}`;


    // Pricing Map (In cents) - Customize these values
    // Using lowercase keys for robust matching
    // Pricing Map (In cents) - Synchronized with index.html
    const prices = {
        'the signal': 10000,         // $100.00
        'the perspective': 40000,    // $400.00
        'the alliance': 150000,      // $1,500.00
        // Legacy Support
        'the drop': 10000,
        'the vision': 40000,
        'the campaign': 150000
    };

    // Normalize input to lowercase to avoid case-mismatch fallbacks
    const normalizedName = packageName ? packageName.toLowerCase().trim() : '';
    const amount = prices[normalizedName];

    if (!amount) {
        console.error(`❌ Checkout Failed: Package [${packageName}] not found in map.`);
        return res.status(400).json({ error: `Package '${packageName}' is currently set to Inquiry Only.` });
    }

    try {
        const sessionConfig = {
            payment_method_types: ['card'],
            line_items: [{
                price_data: {
                    currency: 'usd',
                    product_data: {
                        name: `OTP // ${(packageName || 'CREATIVE SERVICE').toUpperCase()}`,
                        // Dynamic Description based on package
                        description: normalizedName === 'the signal' ? '1x Tactical Asset (Viral/Ad) + Advanced VFX - 24/48H Delivery' :
                                     normalizedName === 'the perspective' ? 'On-Location Production (3h) + 4x Tactical Assets + 20 Premium Deliverables' :
                                     normalizedName === 'the alliance' ? 'Retainer Creative Direction + 10x Cinematic Assets + Agency-Level Support' :
                                     normalizedName === 'the drop' ? '1 High-End Vertical Edit (Algorithm Friendly)' :
                                     normalizedName === 'the vision' ? 'Editorial/Studio Shoot (4h) - 15 High-End Retouched Images' :
                                     normalizedName === 'the campaign' ? 'Comprehensive Production Package (Shoot + Full High-End Edit Bundle)' :
                                     normalizedName === 'the visualizer' ? 'Perfect Loop + Lyric Integration for Audio' :
                                     normalizedName === 'the identity' ? 'Professional Brand Identity System (Logo + Marks)' :
                                     normalizedName === 'the stack' ? '5-10 Short-Form Edits / Batch Alignment' :
                                     normalizedName === 'the rollout' ? 'Album/EP Launch Kit (Cover + Teasers)' :
                                     normalizedName === 'the official video' ? 'Full Video Production + VFX + Color' :
                                     normalizedName === 'the digital hq' ? 'Modern, High-Speed Performance Website' :
                                     normalizedName === 'the rebrand' ? 'Full Logo System + Professional Website Overhaul' :
                                     normalizedName === 'the partner' ? 'Monthly Creative Retainer - Priority Activation' :
                                     'OTP Priority Activation & Booking',
                        metadata: {
                            package: packageName,
                            realm: 'visual_division',
                            server_version: 'v10.5.1'
                        }
                    },
                    unit_amount: amount,
                },
                quantity: 1,
            }],
            mode: 'payment',
            success_url: `${origin}/payment_success.html?session_id={CHECKOUT_SESSION_ID}`,
            cancel_url: `${origin}/index.html#packages`,
        };

        // Pre-fill email if provided from contact form
        if (customerEmail) {
            sessionConfig.customer_email = customerEmail;
        }

        const session = await stripe.checkout.sessions.create(sessionConfig);

        res.json({ id: session.id });
    } catch (e) {
        console.error("Stripe Error:", e.message);
        res.status(500).json({ error: e.message });
    }
})
.all((req, res) => res.status(405).json({ error: "Method Not Allowed. Use POST." }));


// --- FALLBACK ROUTE ---
// Serve 404 for any unknown API routes specifically
app.use('/api', (req, res) => {
    res.status(404).json({ success: false, message: "API Endpoint Not Found" });
});

// Serve 404.html for any unknown frontend routes
app.use((req, res) => {
    res.status(404).sendFile(path.join(staticPath, '404.html'));
});

// --- GLOBAL ERROR HANDLER ---
// --- GLOBAL ERROR HANDLER ---
app.use((err, req, res, next) => {
    const errorLog = `[${new Date().toISOString()}] ERROR: ${err.message}\nStack: ${err.stack}\n`;
    // Console only for Vercel
    console.error(errorLog);
    res.status(500).json({ success: false, message: "Internal Server Error", error: err.message });
});

// --- START SERVER ---
// --- START SERVER ---
// Only listen if running locally (not imported as a module)
if (require.main === module) {
    const server = app.listen(port, '0.0.0.0', () => {
        console.log(`\n🚀 OTP SECURE SERVER V1.4.1 ONLINE`);
        console.log(`🔒 Security Headers: ENABLED`);
        console.log(`📦 Compression: ENABLED`);
        console.log(`🔑 Auth System: JWT ENABLED`);
        console.log(`📡 Local: http://localhost:${port}\n`);
    });

    server.on('error', (e) => {
        console.error("SERVER STARTUP ERROR:", e);
    });
}

// Export for Vercel Serverless Function
module.exports = app;