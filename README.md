# Leash

**Give your AI agent a PayPal wallet, with a leash on it.**

Leash lets an AI shopping agent spend your money within rules you write in plain
English. The agent can only *propose* purchases. A deterministic policy engine
(no LLM) decides: **ALLOW** (charged to your saved PayPal wallet), **ASK** (sent
to your phone for approval), or **DENY** (refused, with a reason). Prompt
injection can't talk its way past code.

Built for the [PayPal AI Hackathon](https://paypalaihackathon.devpost.com/) (deadline Nov 12, 2026).

## Stack

- Next.js 16 + TypeScript, deployed on Vercel
- Postgres via Drizzle: local Postgres in dev, Supabase in production
- OpenAI via the Vercel AI SDK (`OPENAI_MODEL` env var)
- PayPal: Payment Tokens API (vault a wallet) + Orders v2 (charge `vault_id`, buyer not present)
- Channel3 for real product search

## Layout

```
src/lib/policy/     policy engine: types, evaluate(), tests  ← the core
src/lib/paypal/     REST client, vault + charge + refund
src/lib/channel3.ts product search
src/lib/agent/      model config
src/db/             Drizzle schema + client
scripts/            week-1 spikes
```

## Setup

1. `pnpm install`
2. `cp .env.example .env.local` and fill it in:
   - **PayPal**: [developer.paypal.com](https://developer.paypal.com) → Apps & Credentials → Sandbox → create an app. In its features, tick **Save payment methods** (the Vault API) and **Transaction search**. Also note the sandbox *personal* account under Testing Tools → Sandbox Accounts; that's who you log in as when approving.
   - **Channel3**: key from [trychannel3.com](https://trychannel3.com).
   - **OpenAI**: API key; set `OPENAI_MODEL` to the model you want.
   - **DATABASE_URL**: your local Postgres.
3. Create the database and run migrations:
   ```
   createdb -U postgres leash
   pnpm db:migrate
   ```

## Week 1 spikes (retire the risks)

```
pnpm test                 # policy engine tests
pnpm spike:channel3       # does product search work + does our normalizer match?
pnpm spike:vault start    # get an approval link; approve as the sandbox personal account
pnpm spike:vault finish   # save the wallet, charge $1 with no buyer present
pnpm spike:vault charge   # charge it again
pnpm spike:vault refund   # refund the last charge
pnpm spike:agent "Plan a birthday party for 12 kids"
pnpm spike:agent --inject "Plan a birthday party for 12 kids"
```

For `spike:vault start`, run `pnpm dev` in another terminal so the PayPal return page loads.

## Deploying (Vercel + Supabase)

- Import the GitHub repository into Vercel; it detects Next.js and pnpm automatically.
- Use Supabase's **transaction pooler** connection string (port 6543) for `DATABASE_URL`.
- Add every variable from `.env.example` to Vercel, using sandbox credentials for PayPal.
- Set `APP_URL` to the production Vercel URL so PayPal redirects back correctly.
- Run `pnpm db:migrate` against Supabase once (locally with the Supabase `DATABASE_URL`).
- The activity cursor is polled from Postgres, so live pages work across Vercel function instances.

## Hackathon scope note

Channel3 returns real products from real retailers, but sandbox PayPal can't buy from them.
Leash acts as merchant of record: every charge goes to the Leash sandbox business account with
one PayPal line item per product, and fulfillment is simulated. In production, Leash would pay
PayPal Agent Ready merchants directly.
