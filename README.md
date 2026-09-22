# FinanceX

Personal finance app for tracking bank imports, monthly spending, savings targets, commitments, and net worth. Built for multi-account households (UYU + USD) with Santander Uruguay CSV imports, manual fixes, and optional AI-assisted categorization.

Each main screen includes an **info** button next to section titles; copy lives in `src/lib/help/section-info.ts`.

## What it does

| Area | Routes | Purpose |
|------|--------|---------|
| **Home** | `/home`, `/month/[month]` | Year overview, month tiles, charts, category breakdown; drill into a month for data coverage, spend vs target, recent movements |
| **Movements** | `/movements`, `/transactions` | Full ledger: filter, edit categories, transfer tags, refund links, delete |
| **Control** | `/control` | Monthly pay/receive checklist; reconcile rows to imported movements |
| **Targets** | `/target`, `/target/month`, `/target/annual` | Plan vs actual: income pace, room to spend, category budgets (monthly and annual) |
| **Wealth** | `/wealth` | Net worth: cash from balance anchors + movements, manual positions, transfer reconciliation |
| **Settings** | `/settings` | FX rate, savings %, income sources, accounts, categories |
| **Import / review** | `/import`, `/review/[importId]` | Upload CSVs, review uncertain rows, save categorization rules |

Legacy **`/dashboard`** and **`/budget`** routes still exist for older chart views; primary navigation uses Home and Targets.

## Stack

- **Next.js 16** (App Router) + **React 19** + **TypeScript**
- **Tailwind CSS 4** + shadcn/ui-style components
- **Recharts** for charts
- **Supabase** — Auth, PostgreSQL, Row Level Security
- **Vitest** for unit tests on accounting, parsers, and control logic
- **Vercel** — hosting + scheduled cron (due commitments)

Optional integrations:

- **OpenAI** — classify ambiguous import lines when `OPENAI_API_KEY` is set
- **Resend** — daily email digest for due commitments (cron + backend keys)

## Sign convention and currency

- **Positive amount** = money entering the account  
- **Negative amount** = money leaving the account  

Original amounts and currencies are stored on each movement. Summaries convert to **USD** using the **UYU/USD rate** from Settings (default mindset: ~40 UYU = 1 USD; you configure the live rate).

Transfers, card payments, and refunds have dedicated types; tagging transfers helps Wealth reconciliation (money that left the bank but is not “spending”).

## Prerequisites

- **Node.js** 20+ (LTS recommended)
- **npm** 10+
- A **Supabase** project (free tier is enough for personal use)

## Setup

### 1. Clone and install

```bash
git clone <your-repo-url>
cd financeX
npm install
```

### 2. Environment variables

```bash
cp .env.example .env.local
```

Required for local dev:

| Variable | Description |
|----------|-------------|
| `NEXT_PUBLIC_SUPABASE_URL` | Project URL (Supabase → Settings → API) |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Publishable key (`sb_publishable_...`). Legacy `NEXT_PUBLIC_SUPABASE_ANON_KEY` still works |

Optional:

| Variable | Description |
|----------|-------------|
| `NEXT_PUBLIC_SITE_URL` | Canonical site URL for auth emails and links |
| `OPENAI_API_KEY` | Enables AI categorization on import/review |
| `OPENAI_CLASSIFY_MODEL` | Defaults to `gpt-4o-mini` |
| `SUPABASE_SECRET_KEY` | Backend only; required for cron digest (bypasses RLS safely on server) |
| `CRON_SECRET` | `Authorization: Bearer …` for `/api/cron/due-commitments` |
| `RESEND_API_KEY`, `EMAIL_FROM` | Outbound email for due-commitment reminders |

Never commit `.env.local` or put the **secret** Supabase key in `NEXT_PUBLIC_*` variables.

### 3. Database migrations

Apply SQL migrations **in numeric order** in the Supabase SQL editor (or via Supabase CLI linked to the same project):

```
supabase/migrations/001_initial_schema.sql
supabase/migrations/002_add_p_transfer_rule.sql
… through …
supabase/migrations/012_wealth_reconciliation.sql
```

After migrations, enable **Email** auth (or your preferred providers) under Authentication → Providers. Redirect URLs should include `http://localhost:3000/auth/callback` for local dev and your production URL.

### 4. Run locally

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000), sign up, configure **Settings** (accounts, categories, FX), then **Import** Santander CSVs.

### 5. Verify

```bash
npm run lint
npm run test
npm run build
```

## Typical workflow

1. **Settings** — Add accounts, categories, income sources, savings target %, UYU/USD rate. Set **balance anchors** on Wealth when you reconcile with the bank.
2. **Import** — Upload Santander UYU checking/savings, USD, and credit card exports (`src/lib/parsers/` adapter pattern).
3. **Review** — Confirm or fix categories; optional “remember rule” for future imports.
4. **Movements** — Fine-tune dates (e.g. budget month), transfer tags, refund links.
5. **Home / month** — See savings rate, where money went, import coverage per account slot.
6. **Targets** — Align category budgets with planned income and savings.
7. **Control** — Track rent, salary, subscriptions; reconcile to real movements.
8. **Wealth** — Net worth = tracked cash + manual positions; review transfer breakdown.

**Incognito mode** (Settings) hides sensitive amounts in the UI without changing stored data.

## CSV imports

Initial parsers target **Santander Uruguay** exports. The pipeline is bank-agnostic at the core: add a parser under `src/lib/parsers/` and wire it in the import UI. Imports dedupe overlapping uploads and respect manual date shifts within a configured window.

## Deploy on Vercel

1. Connect the Git repository.
2. Set the same env vars as production (at minimum Supabase URL + publishable key).
3. For cron emails: set `CRON_SECRET`, `SUPABASE_SECRET_KEY`, `RESEND_API_KEY`, `EMAIL_FROM`, and `NEXT_PUBLIC_SITE_URL`.

`vercel.json` schedules **`/api/cron/due-commitments`** daily (UTC). Vercel sends `Authorization: Bearer <CRON_SECRET>` when `CRON_SECRET` is configured in the project.

## Project structure

```
src/
  app/
    (app)/          # Authenticated app shell (home, movements, control, …)
    (auth)/         # Login, signup, password reset
    (portal)/       # Apps portal (if enabled)
    actions/        # Server actions (settings, transactions, …)
    api/cron/       # Scheduled jobs
  components/       # UI grouped by feature (home, import, wealth, …)
  lib/
    accounting/     # Pure financial math (heavily tested)
    categorization/ # Rules + optional OpenAI classify
    control/        # Commitments and due logic
    help/           # Section info copy for modals
    import/         # Coverage, dedupe, statement months
    parsers/        # Bank CSV adapters
    queries/        # Supabase read models
    supabase/       # Client, middleware, env helpers
    wealth/         # Positions, transfers, reconciliation
  types/            # Generated / hand-maintained DB types
supabase/migrations/
public/
```

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Development server |
| `npm run build` | Production build |
| `npm run start` | Serve production build |
| `npm run lint` | ESLint (Next.js config) |
| `npm run test` | Vitest unit tests |

## Contributing / agents

See `AGENTS.md` for Next.js version notes used by automated tooling in this repo.

## License

Private project (`"private": true` in `package.json`). All rights reserved unless otherwise noted by the repository owner.
