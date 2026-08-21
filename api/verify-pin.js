export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ ok: false, error: 'Method Not Allowed' });
  const expected = process.env.APP_PIN || '';
  let body;
  try { body = typeof req.body === 'string' ? JSON.parse(req.body) : (req.body || {}); }
  catch { return res.status(400).json({ ok: false }); }
  const pin = String(body.pin ?? '').trim();
  const ok = !!expected && pin === expected;
  return res.status(ok ? 200 : 401).json({ ok });
}
