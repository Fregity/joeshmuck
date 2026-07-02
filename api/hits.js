import { Redis } from '@upstash/redis';

const redis = new Redis({
  url: process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL,
  token: process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN,
});

const COUNT_KEY = 'hits:count';
const STARTING_COUNT = 0;

export default async function handler(req, res) {
  try {
    // GET just reads the count without incrementing (useful for testing / admin views)
    if (req.method === 'GET' && req.query && req.query.peek === '1') {
      const current = Number((await redis.get(COUNT_KEY)) || 0);
      return res.status(200).json({ hits: current + STARTING_COUNT });
    }

    const count = await redis.incr(COUNT_KEY);
    return res.status(200).json({ hits: count + STARTING_COUNT });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Something went wrong on the server side.' });
  }
}
