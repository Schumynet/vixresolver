// resolve_service.js
const express = require('express');
const { chromium } = require('playwright');

const app = express();
app.use(express.json());

async function resolveSources(url, timeout = 20000) {
  const browser = await chromium.launch({ headless: true, args: ['--no-sandbox'] });
  const context = await browser.newContext();
  const page = await context.newPage();
  const seen = new Set();
  const found = [];

  page.on('request', req => {
    const u = req.url();
    if (/(?:\.mp4|\.m3u8|\.webm)(?:\?|$)/i.test(u) || /\/(?:sources|ajax|stream|token)[^?]*/i.test(u)) {
      if (!seen.has(u)) { seen.add(u); found.push({ label: 'network', url: u }); }
    }
  });

  try {
    await page.goto(url, { timeout });
  } catch (e) {
    // continua comunque l'analisi se il goto fallisce per timeout
  }
  try { await page.waitForLoadState('networkidle', { timeout: 5000 }); } catch(e){}

  const html = await page.content();
  const matches = [...html.matchAll(/https?:\/\/[^\s"'<>]+?\.(?:mp4|m3u8|webm)[^\s"'<>]*/ig)];
  for (const m of matches) {
    const u = m[0];
    if (!seen.has(u)) { seen.add(u); found.push({ label: 'html', url: u }); }
  }

  await browser.close();
  return found;
}

app.get('/resolve', async (req, res) => {
  const url = req.query.url;
  if (!url) return res.status(400).json({ ok: false, error: 'missing url' });
  try {
    const sources = await resolveSources(url);
    return res.json({ ok: true, url, sources });
  } catch (err) {
    console.error('resolve error', err);
    return res.status(500).json({ ok: false, error: String(err) });
  }
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => console.log(`Resolve service listening on ${PORT}`));