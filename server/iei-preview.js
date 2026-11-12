'use strict';

// IEI preview rendering is intentionally configuration-only. No generated code
// is executed and no prospect data is published without owner approval.
function esc(value) {
  return String(value == null ? '' : value).replace(/[&<>"']/g, function (ch) {
    return {'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'}[ch];
  });
}
function validSlug(value) {
  return typeof value === 'string' && value.length <= 90 && /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(value);
}
function publicPreview(job, slug) {
  const config = job && job.project_data && job.project_data.iei;
  return !!(config && config.slug === slug && config.publicApproved === true
    && config.contentVerified === true && !job.archived_at);
}
function readServices(input) {
  return (Array.isArray(input) ? input : []).slice(0, 6)
    .filter(function (value) { return typeof value === 'string' && value.length > 0 && value.length <= 100; });
}
function trustedDemoUrl(value) {
  try {
    const url = new URL(String(value || ''));
    return url.protocol === 'https:' && (url.hostname === 'lovable.app' || url.hostname.endsWith('.lovable.app'))
      ? url.href : '';
  } catch (_) { return ''; }
}
function renderIeiPreviewPage(job, slug) {
  if (!publicPreview(job, slug)) return '';
  const c = job.project_data.iei;
  const name = String(job.business_name || c.businessName || 'Local Business').slice(0, 130);
  const headline = String(c.headline || 'Built for your next customer.').slice(0, 150);
  const intro = String(c.intro || 'A faster, clearer way to discover services and get in touch.').slice(0, 450);
  const services = readServices(c.services);
  const demo = trustedDemoUrl(c.lovableUrl);
  const paid = c.stage === 'PAID_ONBOARDING' && job.payment_status === 'Paid';
  const book = '/start-project?preview=' + encodeURIComponent(slug) + '&business=' + encodeURIComponent(name);
  const claim = 'https://os.onlytrueperspective.tech/api/iei/claim-site?slug=' + encodeURIComponent(slug);
  const claimReady = c.claimEnabled === true && Number(job.total_price_cents) === 45000;
  const serviceCards = services.length ? services.map(function (service, index) {
    return '<article class="service"><small>0' + (index + 1) + '</small><h3>' + esc(service) + '</h3><p>Ask about availability and project details.</p></article>';
  }).join('') : '<article class="service"><small>01</small><h3>Local service, modern presentation.</h3><p>Contact the business to discuss its current offerings.</p></article>';
  const priceLink = claimReady
    ? '<a class="claim" href="' + esc(claim) + '">Claim &amp; Launch · $450</a>'
    : '<a class="claim" href="' + esc(book) + '">Discuss This Concept</a>';
  const bar = paid ? '' : '<aside class="preview-bar"><div class="preview-caption"><b>OTP · CONCEPT PREVIEW</b><span>Unofficial design proposal for ' + esc(name) + '</span></div><div class="preview-actions"><a class="book" href="' + esc(book) + '">Book a 10-Min Call</a>' + priceLink + '</div></aside>';
  const demoLink = demo ? '<a class="demo" href="' + esc(demo) + '" target="_blank" rel="noopener noreferrer nofollow">Open interactive Lovable design ↗</a>' : '';
  return '<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">'
    + '<meta name="robots" content="noindex,nofollow,noarchive"><meta name="referrer" content="no-referrer">'
    + '<title>' + esc(name) + ' · OTP Concept Preview</title>'
    + '<style>'
    + ':root{color-scheme:dark}*{box-sizing:border-box}body{margin:0;color:#f4f7fb;background:#090d14;font-family:Inter,ui-sans-serif,system-ui,-apple-system,sans-serif}a{text-decoration:none;color:inherit}'
    + '.shell{max-width:1080px;margin:auto;padding:0 25px}.eyebrow{font-size:11px;letter-spacing:.2em;font-weight:800;color:#efab6a}.mast{display:flex;align-items:center;justify-content:space-between;gap:20px;padding-top:27px;padding-bottom:27px;border-bottom:1px solid #ffffff19}.mast strong{letter-spacing:-.04em;font-size:19px}.mast span{color:#a9b8ce;font-size:12px}'
    + '.hero{min-height:550px;display:flex;flex-direction:column;align-items:start;justify-content:center;position:relative;overflow:hidden;background:radial-gradient(ellipse at 85% 25%,#32204b88,transparent 45%),linear-gradient(115deg,#111b2e,#080b11);border-bottom:1px solid #ffffff22}.hero h1{font-size:clamp(45px,8vw,91px);line-height:1.03;max-width:850px;letter-spacing:-.067em;margin:22px 0}.hero p{color:#c4cfdb;line-height:1.6;max-width:630px;font-size:clamp(16px,2vw,21px)}.cta{display:inline-flex;padding:15px 22px;margin-top:22px;border-radius:12px;background:#f6fafc;color:#121723;font-weight:800;font-size:14px}'
    + '.section{padding:88px 0 130px}.section h2{font-size:clamp(31px,5vw,55px);letter-spacing:-.05em;margin:13px 0 36px}.cards{display:grid;grid-template-columns:repeat(auto-fit,minmax(230px,1fr));gap:15px}.service{min-height:190px;padding:25px;border:1px solid #2b3648;border-radius:18px;background:linear-gradient(140deg,#151f31,#10151f)}.service small{color:#e9a76b}.service h3{margin:20px 0 10px}.service p{color:#95a3b9;font-size:13px;line-height:1.5}.demo{display:inline-block;margin-top:28px;color:#e8b27b;border-bottom:1px solid #e8b27b}'
    + 'footer{border-top:1px solid #ffffff20;padding:28px 0 135px;color:#93a1b6;font-size:12px}.preview-bar{position:fixed;bottom:15px;left:50%;transform:translateX(-50%);width:min(95vw,850px);z-index:100;display:flex;align-items:center;justify-content:space-between;gap:18px;padding:13px 16px;border:1px solid #715d7b;border-radius:20px;background:#0b1022ed;box-shadow:0 15px 50px #000b;backdrop-filter:blur(18px)}.preview-caption{display:flex;flex-direction:column;gap:5px}.preview-caption b{color:#ecab74;font-size:11px;letter-spacing:.12em}.preview-caption span{font-size:12px;color:#e6eaf4}.preview-actions{display:flex;gap:8px;flex-wrap:wrap}.preview-actions a{border-radius:12px;padding:13px 15px;font-size:12px;white-space:nowrap;font-weight:800;text-align:center}.book{border:1px solid #67758b}.claim{background:#ff861e;color:#0b0b11}'
    + '@media(max-width:700px){.mast span{display:none}.hero{min-height:480px}.section{padding:60px 0 180px}.preview-bar{align-items:stretch;flex-direction:column;gap:12px;bottom:10px}.preview-actions a{flex:1}.hero h1{font-size:clamp(44px,11vw,68px)}}'
    + '</style></head><body><header class="shell mast"><strong>' + esc(name) + '</strong><span>DESIGN CONCEPT · NOT AN OFFICIAL BUSINESS WEBSITE</span></header>'
    + '<main><section class="hero"><div class="shell"><div class="eyebrow">LOCAL BUSINESS · REIMAGINED</div><h1>' + esc(headline) + '</h1><p>' + esc(intro) + '</p><a class="cta" href="' + esc(book) + '">Discuss this website concept ↗</a></div></section>'
    + '<section class="shell section"><div class="eyebrow">A CLEANER DIGITAL EXPERIENCE</div><h2>Made to be easy to navigate.</h2><div class="cards">' + serviceCards + '</div>' + demoLink + '</section></main>'
    + '<footer><div class="shell">Independent design concept by OnlyTruePerspective. Not affiliated with or endorsed by ' + esc(name) + '. Business details and services require owner approval before any official launch.</div></footer>'
    + bar + '</body></html>';
}
function registerIeiPreviewRoute(app, supabaseAdmin) {
  app.get('/p/:slug', async function (req, res) {
    const slug = req.params.slug;
    res.set('Cache-Control', 'private, no-store, max-age=0');
    res.set('X-Robots-Tag', 'noindex, nofollow, noarchive');
    res.set('Referrer-Policy', 'no-referrer');
    if (!validSlug(slug)) return res.status(404).send('Preview not found');
    if (!supabaseAdmin) return res.status(503).send('Preview temporarily unavailable');
    try {
      const result = await supabaseAdmin.from('ops_jobs')
        .select('job_id,business_name,project_data,payment_status,total_price_cents,archived_at')
        .is('archived_at', null)
        .contains('project_data', { iei: { slug: slug, publicApproved: true, contentVerified: true } })
        .limit(2);
      if (result.error) throw result.error;
      if (!result.data || result.data.length !== 1 || !publicPreview(result.data[0], slug)) {
        return res.status(404).send('Preview not found');
      }
      return res.status(200).type('html').send(renderIeiPreviewPage(result.data[0], slug));
    } catch (error) {
      console.warn('IEI preview lookup unavailable:', error && error.message);
      return res.status(503).send('Preview temporarily unavailable');
    }
  });
}
module.exports = { registerIeiPreviewRoute, renderIeiPreviewPage, publicPreview, validSlug, trustedDemoUrl };
