export async function onRequestPost({ request, env }) {
  let data;
  try {
    data = await request.json();
  } catch {
    return new Response(JSON.stringify({ ok: false, error: 'Invalid JSON' }), { status: 400 });
  }

  const email = (data.email || '').trim();
  const name = (data.name || '').trim();
  const commitment = (data.commitmentText || '').trim();
  const dateVal = (data.dateVal || '').trim();

  if (!email || !email.includes('@')) {
    return new Response(JSON.stringify({ ok: false, error: 'Valid email is required' }), { status: 400 });
  }

  await env.DB.prepare(
    'INSERT INTO signups (name, email, commitment, date_val, created_at) VALUES (?, ?, ?, ?, ?)'
  ).bind(name, email, commitment, dateVal, new Date().toISOString()).run();

  return new Response(JSON.stringify({ ok: true }), {
    headers: { 'content-type': 'application/json' },
  });
}
