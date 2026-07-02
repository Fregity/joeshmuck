import { Redis } from '@upstash/redis';

// Works with either the newer Marketplace var names (KV_REST_API_*)
// or the classic Upstash var names (UPSTASH_REDIS_REST_*).
const redis = new Redis({
  url: process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL,
  token: process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN,
});

const LIST_KEY = 'guestbook:entries';
const MAX_ENTRIES = 5;

function parseEntry(raw) {
  try {
    return typeof raw === 'string' ? JSON.parse(raw) : raw;
  } catch {
    return { name: 'Unknown', msg: String(raw) };
  }
}

export default async function handler(req, res) {
  try {
    if (req.method === 'GET') {
      const entries = await redis.lrange(LIST_KEY, 0, MAX_ENTRIES - 1);
      return res.status(200).json(entries.map(parseEntry));
    }

    if (req.method === 'POST') {
      const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {});
      const msg = (body.msg || '').toString().trim().slice(0, 300);
      const name = (body.name || '').toString().trim().slice(0, 60) || 'A Thirsty Stranger';

      if (!msg) {
        return res.status(400).json({ error: "You gotta actually say something, this ain't a mime convention." });
      }

      const entry = { name, msg, ts: Date.now() };
      await redis.lpush(LIST_KEY, JSON.stringify(entry));
      await redis.ltrim(LIST_KEY, 0, MAX_ENTRIES - 1); // keep only the last 5

      const entries = await redis.lrange(LIST_KEY, 0, MAX_ENTRIES - 1);
      return res.status(200).json(entries.map(parseEntry));
    }

    res.setHeader('Allow', ['GET', 'POST']);
    return res.status(405).end('Method Not Allowed');
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Something went wrong on the server side.' });
  }
}
