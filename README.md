# AGE MT. HARYONO - Vercel Backend

Backend ini kompatibel dengan index.html saat ini karena tetap memakai:
- POST /api/verify-pin
- GET /api/state
- POST /api/state

Database penyimpanan memakai Redis REST (Upstash) agar cocok dengan Vercel.

## Environment Variables di Vercel
APP_PIN = PIN aplikasi
KV_REST_API_URL = URL REST Upstash Redis
KV_REST_API_TOKEN = token REST Upstash Redis

Tidak perlu menjalankan schema.sql untuk backend Vercel ini.
