export const config = { runtime: 'edge' };

// Sync store per il Deep Work Tracker.
// Usa la REST API di Vercel KV (Upstash) via fetch: nessuna dipendenza, nessun build.
// Le env KV_REST_API_URL e KV_REST_API_TOKEN vengono iniettate da Vercel
// automaticamente quando colleghi un database KV al progetto.

export default async function handler(req) {
  const url = new URL(req.url);
  const key = url.searchParams.get('key');
  if (!key || key.length < 8) return json({ error: 'bad key' }, 400);

  const KV_URL = process.env.KV_REST_API_URL;
  const KV_TOKEN = process.env.KV_REST_API_TOKEN;
  if (!KV_URL || !KV_TOKEN) return json({ error: 'KV non configurato' }, 500);

  const kvKey = 'dw-' + key;
  const call = (cmd) =>
    fetch(KV_URL, {
      method: 'POST',
      headers: { Authorization: 'Bearer ' + KV_TOKEN },
      body: JSON.stringify(cmd),
    }).then((r) => r.json());

  try {
    if (req.method === 'GET') {
      const { result } = await call(['GET', kvKey]);
      if (result == null) return new Response(null, { status: 404 });
      return new Response(result, { headers: { 'Content-Type': 'application/json' } });
    }
    if (req.method === 'POST') {
      const body = await req.text();
      await call(['SET', kvKey, body, 'EX', 7776000]); // 90 giorni
      return json({ ok: true });
    }
    return json({ error: 'method not allowed' }, 405);
  } catch (e) {
    return json({ error: String(e) }, 500);
  }
}

function json(obj, status = 200) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}
