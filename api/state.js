const MAX_SIZE = 4500000;

function json(res, data, status = 200) {
  return res.status(status).setHeader('Content-Type', 'application/json; charset=utf-8').json(data);
}

function authorized(req) {
  const configured = process.env.APP_PIN || '';
  const supplied = String(req.headers['x-app-pin'] || '');
  return !!configured && supplied === configured;
}

async function redis(command) {
  const url = process.env.KV_REST_API_URL;
  const token = process.env.KV_REST_API_TOKEN;
  if (!url || !token) throw new Error('Redis environment variables are not configured');
  const r = await fetch(url, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(command)
  });
  if (!r.ok) throw new Error(`Redis HTTP ${r.status}`);
  const data = await r.json();
  if (data.error) throw new Error(data.error);
  return data.result;
}

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-App-Pin, X-Device-Name');

  if (req.method === 'OPTIONS') return res.status(204).end();
  if (!authorized(req)) return json(res, { error: 'PIN salah atau belum diisi' }, 401);

  try {
    if (req.method === 'GET') {
      const row = await redis(['GET', 'age:main']);
      if (!row) return json(res, { value: null, updatedAt: 0, updatedBy: null });
      const parsed = JSON.parse(row);
      return json(res, parsed);
    }

    if (req.method === 'POST') {
      const body = typeof req.body === 'string' ? JSON.parse(req.body) : (req.body || {});
      if (typeof body.value !== 'string') return json(res, { error: "Field 'value' (string JSON) wajib diisi" }, 400);
      if (body.value.length > MAX_SIZE) return json(res, { error: 'Data terlalu besar' }, 413);

      const currentRaw = await redis(['GET', 'age:main']);
      const current = currentRaw ? JSON.parse(currentRaw) : null;
      if (typeof body.expectedUpdatedAt === 'number' && current && current.updatedAt > body.expectedUpdatedAt) {
        return json(res, { error: 'conflict', message: 'Data sudah diubah dari device lain. Muat ulang dulu.', updatedAt: current.updatedAt }, 409);
      }

      const now = Date.now();
      const deviceName = String(req.headers['x-device-name'] || 'unknown').slice(0, 60);
      const payload = JSON.stringify({ value: body.value, updatedAt: now, updatedBy: deviceName });
      await redis(['SET', 'age:main', payload]);
      return json(res, { ok: true, updatedAt: now });
    }

    return json(res, { error: 'Method Not Allowed' }, 405);
  } catch (err) {
    console.error(err);
    return json(res, { error: 'Server belum terhubung ke database penyimpanan' }, 500);
  }
}
