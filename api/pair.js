'use strict';

// Vercel serverless proxy: browser -> same-origin /api/pair -> Katabump bot.
// Configure BOT_API_URL (HTTPS base URL of the bot) and SITE_ORIGIN in Vercel.
module.exports = async function pair(req, res) {
  res.setHeader('Cache-Control', 'no-store, max-age=0');
  res.setHeader('Content-Type', 'application/json; charset=utf-8');

  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Méthode non autorisée.' });
  }

  const botApiUrl = process.env.BOT_API_URL;
  const siteOrigin = process.env.SITE_ORIGIN;
  if (!botApiUrl || !siteOrigin) {
    return res.status(503).json({ error: 'Configuration Vercel incomplète : BOT_API_URL et SITE_ORIGIN sont requis.' });
  }

  let botUrl;
  try {
    botUrl = new URL(botApiUrl);
    if (botUrl.protocol !== 'https:') throw new Error('HTTPS requis');
  } catch (_) {
    return res.status(503).json({ error: 'BOT_API_URL doit être une URL HTTPS valide du serveur Katabump.' });
  }

  const origin = req.headers.origin;
  if (!origin || origin.replace(/\/$/, '') !== siteOrigin.replace(/\/$/, '')) {
    return res.status(403).json({ error: 'Origine du site non autorisée.' });
  }

  const number = typeof req.body?.number === 'string' ? req.body.number.replace(/\D/g, '') : '';
  if (!/^\d{8,15}$/.test(number)) {
    return res.status(400).json({ error: 'Numéro WhatsApp invalide. Utilise le format international.' });
  }

  const target = new URL('/api/pair', botUrl);
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 45000);
  try {
    const upstream = await fetch(target, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
      body: JSON.stringify({ number }),
      signal: controller.signal
    });
    const text = await upstream.text();
    let payload;
    try { payload = JSON.parse(text); }
    catch (_) { payload = { error: 'Réponse invalide du serveur Katabump.' }; }
    return res.status(upstream.status).json(payload);
  } catch (error) {
    const message = error.name === 'AbortError'
      ? 'Le serveur Katabump ne répond pas à temps.'
      : 'Impossible de joindre le serveur Katabump. Vérifie son URL HTTPS et son état.';
    return res.status(502).json({ error: message });
  } finally {
    clearTimeout(timer);
  }
};
