import { createClient } from 'redis';

// Sync store per il Deep Work Tracker.
// Node serverless function: si connette a Redis (Vercel Redis / Redis Cloud) via TCP
// usando la connection string REDIS_URL iniettata automaticamente da Vercel.

let client;
async function getClient() {
  if (!client) {
    client = createClient({ url: process.env.REDIS_URL });
    client.on('error', (e) => console.error('redis error', e));
  }
  if (!client.isOpen) await client.connect();
  return client;
}

export default async function handler(req, res) {
  const key = (req.query && req.query.key) || '';
  if (!key || key.length < 8) return res.status(400).json({ error: 'bad key' });
  if (!process.env.REDIS_URL) return res.status(500).json({ error: 'REDIS_URL mancante' });

  const kvKey = 'dw-' + key;

  try {
    const c = await getClient();

    if (req.method === 'GET') {
      const val = await c.get(kvKey);
      if (val == null) return res.status(404).end();
      res.setHeader('Content-Type', 'application/json');
      return res.status(200).send(val);
    }

    if (req.method === 'POST') {
      let body = req.body;
      if (body == null) body = '';
      if (typeof body !== 'string') body = JSON.stringify(body);
      await c.set(kvKey, body, { EX: 7776000 }); // 90 giorni
      return res.status(200).json({ ok: true });
    }

    return res.status(405).json({ error: 'method not allowed' });
  } catch (e) {
    return res.status(500).json({ error: String((e && e.message) || e) });
  }
}
