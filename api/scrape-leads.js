/**
 * Lead scraper — runs every 6 hours via cron or external trigger.
 * Sources: Reddit, HackerNews, We Work Remotely, Remotive, RemoteOK,
 *          Facebook (via RSSHub public RSS bridge), TikTok hashtags (via RSSHub)
 *
 * Set these env vars in Vercel dashboard:
 *   SUPABASE_URL          — your Supabase project URL
 *   SUPABASE_SERVICE_KEY  — service role key (from Supabase → Settings → API)
 *   RESEND_API_KEY        — from resend.com (free tier = 3000 emails/month)
 *   LEADS_EMAIL           — dedicated email just for leads (NOT your main gmail)
 *   SCRAPER_TOKEN         — any secret string to protect the endpoint
 */

const SUPABASE_URL  = process.env.SUPABASE_URL  || 'https://cjzewfvtdayjgjdpdmln.supabase.co';
const SUPABASE_KEY  = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_ANON_KEY;
const RESEND_KEY    = process.env.RESEND_API_KEY;
const LEADS_EMAIL   = process.env.LEADS_EMAIL; // set this to a NEW email, not your main one
const SCRAPER_TOKEN = process.env.SCRAPER_TOKEN;

// ── Keyword scoring ───────────────────────────────────────────────────────────
const WEIGHTS = {
  // SA-specific — very high value
  'south africa': 15, 'south african': 15, 'durban': 15, 'johannesburg': 12,
  'cape town': 12, 'pretoria': 12, 'payfast': 15, 'paystack': 14, 'ozow': 14,
  'sa developer': 15, 'sa freelancer': 14,
  // Your core skills
  'supabase': 12, 'cpanel': 11, 'vercel': 8, 'postgresql': 7,
  'web developer': 11, 'website developer': 11, 'full stack': 10, 'full-stack': 10,
  'e-commerce': 10, 'ecommerce': 10, 'online store': 10, 'shopify': 9,
  'business website': 10, 'need a website': 12, 'build a website': 12,
  'booking system': 9, 'booking website': 9, 'booking app': 9,
  'payment gateway': 9, 'online payment': 8,
  // General dev signals
  'frontend developer': 8, 'front-end': 7, 'javascript developer': 8,
  'landing page': 7, 'web design': 7, 'hire a developer': 9,
  'looking for developer': 11, 'need developer': 11, 'need a developer': 11,
  'freelance developer': 9, 'hire freelancer': 8, 'hire a freelancer': 8,
  'woocommerce': 8, 'wordpress developer': 7,
  // Urgency signals
  'urgent': 5, 'asap': 5, 'immediately': 4, 'budget': 3, 'paying': 4, 'paid': 3,
};

function scorePost(title = '', body = '') {
  const text = (title + ' ' + body).toLowerCase();
  let score = 0;
  const tags = [];
  for (const [kw, pts] of Object.entries(WEIGHTS)) {
    if (text.includes(kw)) { score += pts; tags.push(kw); }
  }
  return { score, tags };
}

// ── Reddit ────────────────────────────────────────────────────────────────────
async function scrapeReddit() {
  const subs = [
    'forhire', 'hireadev', 'webdev', 'entrepreneur',
    'smallbusiness', 'slavelabour', 'jobbit', 'webdesign',
  ];
  const leads = [];
  for (const sub of subs) {
    try {
      const res = await fetch(
        `https://www.reddit.com/r/${sub}/new.json?limit=50`,
        { headers: { 'User-Agent': 'TCDevLeadBot/1.0' } }
      );
      if (!res.ok) continue;
      const { data } = await res.json();
      for (const { data: p } of data?.children || []) {
        const { score, tags } = scorePost(p.title, p.selftext);
        if (score >= 7) leads.push({
          source: `reddit/r/${sub}`,
          title: p.title.trim(),
          body: (p.selftext || '').slice(0, 600).trim() || null,
          url: `https://reddit.com${p.permalink}`,
          author: p.author,
          score,
          relevance_tags: tags,
        });
      }
    } catch (e) { console.error(`Reddit r/${sub}:`, e.message); }
  }
  return leads;
}

// ── HackerNews ────────────────────────────────────────────────────────────────
async function scrapeHackerNews() {
  const queries = [
    'hire web developer', 'need website built',
    'looking for freelance developer', 'ecommerce website needed',
    'web developer wanted',
  ];
  const leads = [];
  const seen = new Set();
  for (const q of queries) {
    try {
      const res = await fetch(
        `https://hn.algolia.com/api/v1/search_by_date?query=${encodeURIComponent(q)}&tags=story&hitsPerPage=30`
      );
      const { hits = [] } = await res.json();
      for (const h of hits) {
        const link = h.url || `https://news.ycombinator.com/item?id=${h.objectID}`;
        if (seen.has(link)) continue;
        seen.add(link);
        const { score, tags } = scorePost(h.title, h.story_text || '');
        if (score >= 6) leads.push({
          source: 'hackernews',
          title: (h.title || '').trim(),
          body: (h.story_text || '').replace(/<[^>]+>/g, '').slice(0, 600).trim() || null,
          url: link,
          author: h.author,
          score,
          relevance_tags: tags,
        });
      }
    } catch (e) { console.error('HackerNews:', e.message); }
  }
  return leads;
}

// ── RSS parser (works for WeWorkRemotely, Remotive, RemoteOK, RSSHub) ─────────
function parseRSS(xml) {
  const items = xml.match(/<item>([\s\S]*?)<\/item>/g) || [];
  return items.map(item => {
    const get = tag => {
      const cdata = item.match(new RegExp(`<${tag}[^>]*><!\\[CDATA\\[([\\s\\S]*?)\\]\\]><\\/${tag}>`))?.[1];
      const plain = item.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`))?.[1];
      return (cdata || plain || '').trim();
    };
    return { title: get('title'), body: get('description'), url: get('link') };
  });
}

async function scrapeRSS(url, source, minScore = 5) {
  const leads = [];
  try {
    const res = await fetch(url, { headers: { 'User-Agent': 'TCDevLeadBot/1.0' } });
    if (!res.ok) return leads;
    const xml = await res.text();
    for (const { title, body, url: link } of parseRSS(xml)) {
      if (!link || !title) continue;
      const clean = body.replace(/<[^>]+>/g, '').slice(0, 600).trim();
      const { score, tags } = scorePost(title, clean);
      if (score >= minScore) leads.push({
        source, title: title.trim(), body: clean || null,
        url: link.trim(), author: null, score, relevance_tags: tags,
      });
    }
  } catch (e) { console.error(`RSS ${source}:`, e.message); }
  return leads;
}

// ── Facebook via RSSHub (public groups & page posts) ─────────────────────────
// RSSHub converts Facebook public groups/pages into RSS feeds.
// Add more public SA business Facebook group IDs below.
// To find a group ID: go to the group → copy the number from the URL.
async function scrapeFacebook() {
  const RSSHUB = 'https://rsshub.app'; // free public instance

  // Public Facebook pages/groups known to have "looking for developer" posts
  const feeds = [
    // SA Business / entrepreneur pages — add more group IDs here
    `${RSSHUB}/facebook/group/southafricanentrepreneurs`,
    `${RSSHUB}/facebook/group/kznbusiness`,
  ];

  // Also search Twitter/X via Nitter RSS for SA dev hiring posts
  const twitterFeeds = [
    `${RSSHUB}/twitter/keyword/looking for web developer south africa`,
    `${RSSHUB}/twitter/keyword/need a website developer SA`,
    `${RSSHUB}/twitter/keyword/hire freelance developer johannesburg OR durban OR capetown`,
  ];

  const leads = [];
  for (const url of [...feeds, ...twitterFeeds]) {
    const source = url.includes('facebook') ? 'facebook' : 'twitter/x';
    const results = await scrapeRSS(url, source, 6);
    leads.push(...results);
  }
  return leads;
}

// ── TikTok hashtag search via RSSHub ─────────────────────────────────────────
// Monitors hashtags where people post about needing a website/developer
async function scrapeTikTok() {
  const RSSHUB = 'https://rsshub.app';
  const tags = [
    'needawebsite', 'lookingforadeveloper', 'needadeveloper',
    'websitedesign', 'onlinebusiness', 'southafricanbusiness',
    'kznbusiness', 'durbanbusiness', 'sabusiness',
  ];
  const leads = [];
  for (const tag of tags) {
    const results = await scrapeRSS(`${RSSHUB}/tiktok/tag/${tag}`, `tiktok/#${tag}`, 5);
    leads.push(...results);
  }
  return leads;
}

// ── Save to Supabase (skip duplicates by URL) ─────────────────────────────────
async function saveLeads(leads) {
  const newLeads = [];
  for (const lead of leads) {
    try {
      const res = await fetch(`${SUPABASE_URL}/rest/v1/leads`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': SUPABASE_KEY,
          'Authorization': `Bearer ${SUPABASE_KEY}`,
          'Prefer': 'return=representation,resolution=ignore-duplicates',
        },
        body: JSON.stringify(lead),
      });
      if (res.status === 201) {
        const saved = await res.json();
        if (saved?.length) newLeads.push(lead);
      }
    } catch (e) { console.error('Supabase save:', e.message); }
  }
  return newLeads;
}

// ── Email notification via Resend ─────────────────────────────────────────────
async function sendEmail(newLeads) {
  if (!RESEND_KEY || !LEADS_EMAIL || !newLeads.length) return;
  const top = [...newLeads].sort((a, b) => b.score - a.score).slice(0, 15);

  const sourceIcon = s => {
    if (s.includes('reddit')) return '🟠';
    if (s.includes('facebook')) return '🔵';
    if (s.includes('tiktok')) return '🎵';
    if (s.includes('twitter')) return '🐦';
    if (s.includes('hackernews')) return '🟡';
    return '🌐';
  };

  const html = `
<div style="font-family:system-ui,sans-serif;max-width:660px;margin:auto;background:#0a0a0f;border-radius:14px;overflow:hidden">
  <div style="background:linear-gradient(135deg,#7c3aed 0%,#a855f7 50%,#ec4899 100%);padding:28px 32px">
    <h1 style="color:#fff;margin:0;font-size:22px;letter-spacing:-0.03em">🎯 ${newLeads.length} New Developer Lead${newLeads.length>1?'s':''}</h1>
    <p style="color:rgba(255,255,255,0.75);margin:8px 0 0;font-size:13px">${new Date().toLocaleString('en-ZA',{dateStyle:'full',timeStyle:'short'})} · Reply fast — first dev in wins</p>
  </div>
  <div style="padding:24px 32px">
    ${top.map(l=>`
    <div style="border:1px solid #2e2e44;border-radius:10px;padding:18px 20px;margin-bottom:14px;background:#1e1e2e">
      <div style="margin-bottom:8px">
        <span style="font-size:13px;color:#8b8ba8">${sourceIcon(l.source)} ${l.source}</span>
        <span style="float:right;background:#1a3320;color:#34d399;padding:2px 9px;border-radius:20px;font-size:11px;font-weight:700">⭐ ${l.score}</span>
      </div>
      <a href="${l.url}" style="color:#a855f7;font-weight:700;font-size:15px;text-decoration:none;display:block;margin-bottom:8px;line-height:1.35">${l.title}</a>
      ${l.body?`<p style="color:#8b8ba8;font-size:13px;margin:0 0 10px;line-height:1.55">${l.body.slice(0,200)}${l.body.length>200?'…':''}</p>`:''}
      ${(l.relevance_tags||[]).slice(0,4).map(t=>`<span style="background:#2e2e44;color:#a78bfa;padding:3px 9px;border-radius:20px;font-size:11px;margin-right:4px">${t}</span>`).join('')}
    </div>`).join('')}
    ${newLeads.length>15?`<p style="color:#8b8ba8;font-size:13px;text-align:center">+ ${newLeads.length-15} more leads saved in your dashboard</p>`:''}
    <div style="text-align:center;margin-top:24px;padding-top:20px;border-top:1px solid #2e2e44">
      <p style="color:#8b8ba8;font-size:12px;margin:0">This is your automated TC.dev lead scraper — running every 6 hours</p>
    </div>
  </div>
</div>`;

  try {
    await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${RESEND_KEY}` },
      body: JSON.stringify({
        from: 'onboarding@resend.dev',
        to: LEADS_EMAIL,
        subject: `🎯 ${newLeads.length} new lead${newLeads.length>1?'s':''} — ${new Date().toLocaleDateString('en-ZA')}`,
        html,
      }),
    });
    console.log(`Email sent to ${LEADS_EMAIL}`);
  } catch (e) { console.error('Resend error:', e.message); }
}

// ── Main handler ──────────────────────────────────────────────────────────────
module.exports = async function handler(req, res) {
  if (SCRAPER_TOKEN) {
    const tok = req.headers['x-scraper-token'] || req.query.token;
    if (tok !== SCRAPER_TOKEN) return res.status(401).json({ error: 'Unauthorized' });
  }

  const start = Date.now();
  try {
    const [reddit, hn, wwr, remotive, remoteok, facebook, tiktok] = await Promise.allSettled([
      scrapeReddit(),
      scrapeHackerNews(),
      scrapeRSS('https://weworkremotely.com/categories/remote-programming-jobs.rss', 'weworkremotely'),
      scrapeRSS('https://remotive.com/api/remote-jobs/feed?category=software-dev', 'remotive'),
      scrapeRSS('https://remoteok.com/remote-dev-jobs.rss', 'remoteok'),
      scrapeFacebook(),
      scrapeTikTok(),
    ]).then(results => results.map(r => r.value || []));

    const all = [...reddit, ...hn, ...wwr, ...remotive, ...remoteok, ...facebook, ...tiktok]
      .filter((v, i, a) => a.findIndex(x => x.url === v.url) === i)
      .sort((a, b) => b.score - a.score);

    const newLeads = await saveLeads(all);
    await sendEmail(newLeads);

    return res.status(200).json({
      success: true,
      duration_ms: Date.now() - start,
      total_found: all.length,
      new_leads: newLeads.length,
      sources: {
        reddit: reddit.length,
        hackernews: hn.length,
        weworkremotely: wwr.length,
        remotive: remotive.length,
        remoteok: remoteok.length,
        facebook: facebook.length,
        tiktok: tiktok.length,
      },
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: err.message });
  }
};
