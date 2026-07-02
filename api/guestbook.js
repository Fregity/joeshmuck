import { Redis } from '@upstash/redis';

// Works with either the newer Marketplace var names (KV_REST_API_*)
// or the classic Upstash var names (UPSTASH_REDIS_REST_*).
const redis = new Redis({
  url: process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL,
  token: process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN,
});

const LIST_KEY = 'guestbook:entries';
const MAX_ENTRIES = 5;

// Google Apps Script Web App URL that appends a row to a Google Sheet.
// Set this in Vercel's Environment Variables. See google-apps-script.gs
// and README.md for setup instructions.
const LOG_WEBHOOK_URL = process.env.GUESTBOOK_LOG_URL;
const LOG_SECRET = process.env.GUESTBOOK_LOG_SECRET;

function parseEntry(raw) {
  try {
    return typeof raw === 'string' ? JSON.parse(raw) : raw;
  } catch {
    return { name: 'Unknown', msg: String(raw) };
  }
}

// Sends the full entry to the permanent log (Google Sheet). This is
// separate from Redis on purpose: Redis only ever holds the 5 most
// recent entries, so it stays small and cheap regardless of how many
// people have ever signed the guestbook. Failure here never blocks
// the guestbook from working.
async function logToSheet(entry) {
  if (!LOG_WEBHOOK_URL) return;
  try {
    await fetch(LOG_WEBHOOK_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...entry, secret: LOG_SECRET }),
    });
  } catch (err) {
    console.error('Failed to log guestbook entry to sheet:', err);
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

      // Permanent record (Google Sheet) and the trimmed live view (Redis)
      // happen together so the log is always in sync with what's shown.
      await logToSheet(entry);
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

