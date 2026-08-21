// functions/api/verify-pin.js
export async function onRequestPost(context) {
  const { request, env } = context;
  let body;
  try {
    body = await request.json();
  } catch (e) {
    return new Response(JSON.stringify({ ok: false }), { status: 400 });
  }
  const ok = !!env.APP_PIN && body.pin === env.APP_PIN;
  return new Response(JSON.stringify({ ok }), {
    status: ok ? 200 : 401,
    headers: { "Content-Type": "application/json" },
  });
}
