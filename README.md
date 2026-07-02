# Joe Shmuck's Beer Emporium — Deploy Guide

Your page now has two small serverless functions (`/api/guestbook` and `/api/hits`)
that store data in a free shared Redis database instead of `localStorage`. That's
the part that makes it visible to *every* visitor, not just the one browser that
signed it.

## 1. Get the project onto GitHub (or skip and use the Vercel CLI)

Easiest path: push this folder to a new GitHub repo, then import it in Vercel.
Or, if you have Node installed, just run from inside this folder:

```bash
npm install -g vercel
vercel
```

and follow the prompts (it'll create the project for you).

## 2. Add a free Redis database from the Vercel Marketplace

Vercel KV was retired — the current way to get a shared key/value store is via
the Marketplace:

1. In your Vercel dashboard, open your project.
2. Go to **Storage** → **Create Database** (or **Integrations** → browse the
   **Storage** category) and pick **Upstash Redis** (referred to as "Serverless DB").
3. Follow the prompts to create it and connect it to this project — this is free
   on the smallest tier, which is plenty for a guestbook.
4. Vercel will automatically add the connection info as environment variables.
   Go to **Settings → Environment Variables** and check what they're named — it
   should be either:
   - `KV_REST_API_URL` / `KV_REST_API_TOKEN`, or
   - `UPSTASH_REDIS_REST_URL` / `UPSTASH_REDIS_REST_TOKEN`

   The code in `api/guestbook.js` and `api/hits.js` already checks for both
   names, so you shouldn't need to change anything — but if the names are
   different in your dashboard, update those two files to match.

## 3. Redeploy

After the database is connected, trigger a redeploy (Vercel usually does this
automatically, or click **Redeploy** in the dashboard). The environment
variables only take effect on a fresh deploy.

## 4. Point your domain at it

In **Settings → Domains**, add your custom domain and follow Vercel's DNS
instructions (usually just an A record or CNAME at your registrar).

## How it works

- **Guestbook**: entries are stored in a Redis list. Every time someone signs
  it, the server trims the list down to the 5 most recent entries, so it never
  grows unbounded and everyone who loads the page sees the same last 5 messages.
- **Counter**: a single Redis integer that increments by 1 on each page load
  (offset by a starting number so it doesn't restart at 0). Every visitor
  bumps the same shared number.

## Local testing (optional)

```bash
npm install
vercel dev
```

`vercel dev` runs the API functions locally and pulls your env vars if you've
run `vercel link` first.
