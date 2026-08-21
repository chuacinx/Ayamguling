// functions/api/state.js
// Cloudflare Pages Function — jalan otomatis di /api/state
// Butuh binding D1 bernama "DB" dan environment variable "APP_PIN" (di-set sebagai Secret).

function checkPin(request, env) {
  const pin = request.headers.get("X-App-Pin") || "";
  if (!env.APP_PIN) return false; // kalau PIN belum di-set, tolak semua demi keamanan
  return pin === env.APP_PIN;
}

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json; charset=utf-8" },
  });
}

export async function onRequestGet(context) {
  const { request, env } = context;
  if (!checkPin(request, env)) return json({ error: "PIN salah atau belum diisi" }, 401);

  const row = await env.DB
    .prepare("SELECT value, updated_at, updated_by FROM app_state WHERE id = ?")
    .bind("main")
    .first();

  if (!row) return json({ value: null, updatedAt: 0, updatedBy: null });

  return json({ value: row.value, updatedAt: row.updated_at, updatedBy: row.updated_by });
}

export async function onRequestPost(context) {
  const { request, env } = context;
  if (!checkPin(request, env)) return json({ error: "PIN salah atau belum diisi" }, 401);

  let body;
  try {
    body = await request.json();
  } catch (e) {
    return json({ error: "Body bukan JSON valid" }, 400);
  }

  if (typeof body.value !== "string") {
    return json({ error: "Field 'value' (string JSON) wajib diisi" }, 400);
  }
  if (body.value.length > 4_500_000) {
    return json({ error: "Data terlalu besar" }, 413);
  }

  const now = Date.now();
  const deviceName = (request.headers.get("X-Device-Name") || "unknown").slice(0, 60);

  // Optimistic concurrency ringan: kalau client kirim expectedUpdatedAt dan ternyata
  // sudah ada perubahan lebih baru dari device lain, kabari client (bukan menimpa diam-diam).
  if (typeof body.expectedUpdatedAt === "number") {
    const current = await env.DB
      .prepare("SELECT updated_at FROM app_state WHERE id = ?")
      .bind("main")
      .first();
    if (current && current.updated_at > body.expectedUpdatedAt) {
      return json(
        {
          error: "conflict",
          message: "Data sudah diubah dari device lain. Muat ulang dulu.",
          updatedAt: current.updated_at,
        },
        409
      );
    }
  }

  await env.DB
    .prepare(
      `INSERT INTO app_state (id, value, updated_at, updated_by)
       VALUES ('main', ?, ?, ?)
       ON CONFLICT(id) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at, updated_by = excluded.updated_by`
    )
    .bind(body.value, now, deviceName)
    .run();

  return json({ ok: true, updatedAt: now });
}

export async function onRequestOptions() {
  return new Response(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, X-App-Pin, X-Device-Name",
    },
  });
}
