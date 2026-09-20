# FinanceX

Personal finance dashboard for tracking monthly income, expenses, savings, budgets, and trends.

## Stack

- Next.js (App Router) + TypeScript
- Tailwind CSS + shadcn/ui
- Recharts
- Supabase (Auth + PostgreSQL)
- Vercel deployment

## Sign convention

**Positive amount** = money entering the account  
**Negative amount** = money leaving the account

Original transaction amounts and currencies are always preserved. Dashboard reporting converts to USD using the configurable UYU/USD rate (default: 40 UYU = 1 USD).

## Setup

### 1. Install dependencies

```bash
npm install
```

### 2. Configure Supabase

1. Create a Supabase project at [supabase.com](https://supabase.com)
2. Run the migration in `supabase/migrations/001_initial_schema.sql` via the SQL editor
3. Copy `.env.example` to `.env.local` and fill in your keys from **Supabase → Settings → API Keys**:

```bash
cp .env.example .env.local
```

Use the **publishable** key (`sb_publishable_...`) — it replaces the legacy `anon` key.  
Do **not** put the **secret** key (`sb_secret_...`) in the frontend; this app does not need it for normal use.

### 3. Run locally

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000), sign up, and import CSVs.

### 4. Run tests

```bash
npm run test
```

## Workflow

1. **Import** — Upload Santander UYU/USD bank and credit card CSVs
2. **Review** — Fix uncertain classifications; optionally save rules
3. **Dashboard** — View income, spending, savings, and charts
4. **Budget** — Compare category spending vs targets
5. **Settings** — FX rate, savings target, accounts, categories

## CSV formats

Initial parsers support Santander Uruguay exports via an adapter pattern (`src/lib/parsers/`). New banks can be added without changing the core import pipeline.

## Deploy to Vercel

1. Push to GitHub
2. Import project in Vercel
3. Add environment variables:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`

## Project structure

```
src/
  app/           # Routes and server actions
  components/    # UI by feature
  lib/
    accounting/  # Pure financial calculations (tested)
    categorization/
    currency/
    parsers/
    queries/
    supabase/
  types/
supabase/migrations/
```

## Phase status

- ✅ Phase 1: Schema, auth, categories, transactions
- ✅ Phase 2: CSV parsers, import pipeline, rules
- ✅ Phase 3: Review workflow + remember rule
- ✅ Phase 4: Dashboard + calculations + charts
- ✅ Phase 5: Budget, rules management, settings
