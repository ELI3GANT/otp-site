const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

// 1. Get Config
const configPath = path.join(__dirname, '../site-config.js');
const content = fs.readFileSync(configPath, 'utf8');
const urlMatch = content.match(/supabaseUrl:\s*['"]([^'"]+)['"]/);
const keyMatch = content.match(/supabaseKey:\s*['"]([^'"]+)['"]/);

if (!urlMatch || !keyMatch) {
    console.error("❌ Could not parse site-config.js for credentials.");
    process.exit(1);
}

const supabase = createClient(urlMatch[1], keyMatch[1]);

async function bakeInsights() {
    console.log("🍳 BAKING INSIGHTS TO HTML...");

    // 2. Fetch Posts
    const { data: posts, error } = await supabase
        .from('posts')
        .select('*')
        .eq('published', true)
        .order('created_at', { ascending: false });

    if (error) {
        console.error("❌ Error fetching posts:", error);
        process.exit(1);
    }

    console.log(`✅ Fetched ${posts.length} posts.`);

    // 3. Generate HTML
    const escapeHtml = (str) => {
        if (!str) return '';
        return str.replace(/&/g, "&amp;")
                  .replace(/</g, "&lt;")
                  .replace(/>/g, "&gt;")
                  .replace(/"/g, "&quot;")
                  .replace(/'/g, "&#039;");
    };

    const cardsHtml = posts.map(post => {
        const date = new Date(post.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
        let link = `insight.html?slug=${post.slug}`;
        if (post.slug === 'spooky-luh-ooky') link = 'spooky-luh-ooky.html';
        
        // Strip tags for excerpt
        let rawBody = post.excerpt || post.content || '';
        let safeBody = rawBody.replace(/<[^>]*>/g, '').substring(0, 100) + (rawBody.length > 100 ? '...' : '');

        const tagsHtml = (post.tags || []).map(t => `<span class="post-tag">#${escapeHtml(t.toUpperCase())}</span>`).join('');

        return `
            <article class="insight-card k-hover">
                <div class="insight-card-inner">
                    <div class="insight-date">${date} • ${escapeHtml(post.category || 'Insight')}</div>
                    <h2>${escapeHtml(post.title)}</h2>
                    <p>${escapeHtml(safeBody)}</p>
                    
                    <div style="display: flex; gap: 6px; flex-wrap: wrap; margin-bottom: 20px;">
                        ${tagsHtml}
                    </div>

                    <div class="insight-footer">
                        <a href="${link}" class="read-more">Read Insight</a>
                    </div>
                </div>
            </article>
        `;
    }).join('\n');

    // 4. Inject into insights.html
    const htmlPath = path.join(__dirname, '../insights.html');
    let html = fs.readFileSync(htmlPath, 'utf8');

    // Regex to replace content inside .insights-grid
    // We look for <div class="insights-grid">...</div>
    // This is tricky with regex if nested, but here structure is simple.
    // We'll search for the opening tag and the closing tag, assuming simple structure or use a marker if needed.
    // Actually, looking at the file, it has:
    // <div class="insights-grid">
    //   <!-- Content populated dynamically from Supabase -->
    //   <div class="loader"...>...</div>
    // </div>
    
    // We'll replace everything between <div class="insights-grid"> and </div> with the new cards + a hidden data island for JS to hydrate if needed.
    
    const gridStart = '<div class="insights-grid">';
    const gridEnd = '</div>';
    
    const startIdx = html.indexOf(gridStart);
    if (startIdx === -1) {
        console.error("❌ Could not find .insights-grid in HTML");
        process.exit(1);
    }
    
    // Find the closing div for the grid. 
    // Since we know the current content is just a loader comment, we can scan for the next </div>
    const contentStartIdx = startIdx + gridStart.length;
    let contentEndIdx = html.indexOf(gridEnd, contentStartIdx);
    
    // verify it's not too far (simple heuristic)
    if (contentEndIdx === -1) {
         console.error("❌ Could not find closing div for .insights-grid");
         process.exit(1);
    }

    const newContent = `
        ${cardsHtml}
        <!-- BAKED_DATA_END -->
    `;

    const newHtml = html.substring(0, contentStartIdx) + newContent + html.substring(contentEndIdx);
    
    fs.writeFileSync(htmlPath, newHtml, 'utf8');
    console.log("✅ HTML Updated with Baked Posts.");
}

bakeInsights();
