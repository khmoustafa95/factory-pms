# Projects System Management

React + TypeScript SPA for project system management, with Supabase client wiring.

## Stack

- Vite + React 19 + TypeScript
- Tailwind CSS v4
- React Router
- Supabase JS client (env-based)

## Setup

```bash
npm install
```

### Local Supabase (recommended for development)

```bash
npm run supabase:start   # start local stack + apply migrations
npm run dev:local        # Vite dev server → http://127.0.0.1:54321
```

Or one command: `npm run start:local`

Local Studio: http://127.0.0.1:54323

Demo login accounts (password shared): see [`supabase/demo-accounts.md`](supabase/demo-accounts.md).

### Staging / production

See **[`docs/staging-deployment.md`](docs/staging-deployment.md)** for the full staging deploy guide (free Supabase + Cloudflare/Vercel).

1. Copy `.env.staging` or `.env.production` to `.env.<mode>.local` (gitignored).
2. Fill `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY` from the Supabase dashboard.

```bash
npm run dev:staging          # dev against staging
npm run build:staging        # build for staging
npm run build:production     # build for production (same as npm run build)
```

## Scripts

| Command                     | Description                                        |
| --------------------------- | -------------------------------------------------- |
| `npm run dev` / `dev:local` | Dev server (local Supabase via `.env.development`) |
| `npm run dev:staging`       | Dev server against staging                         |
| `npm run start:local`       | `supabase start` then dev server                   |
| `npm run build`             | Production build                                   |
| `npm run build:staging`     | Staging build                                      |
| `npm run build:production`  | Production build (alias)                           |
| `npm run preview`           | Preview production build                           |
| `npm run preview:staging`   | Preview staging build                              |
| `npm run supabase:start`    | Start local Supabase                               |
| `npm run supabase:stop`     | Stop local Supabase                                |
| `npm run supabase:status`   | Show local URLs and keys                           |
| `npm run supabase:reset`    | Reset local DB (migrations + seed)                 |
| `npm run supabase:types`    | Regenerate `src/types/database.ts` from local DB   |
| `npm run typecheck`         | TypeScript check                                   |
| `npm run lint`              | ESLint                                             |
| `npm run verify`            | Typecheck + lint                                   |
| `npm run format`            | Prettier write                                     |

Pre-commit runs ESLint and Prettier on staged files via Husky + lint-staged.

## Agent / conventions

- [`AGENTS.md`](AGENTS.md) — project map for coding agents
- [`.cursor/rules/`](.cursor/rules/) — scoped Cursor rules (core, React/TS, Supabase)
- [`.cursor/hooks.json`](.cursor/hooks.json) — format edited files with Prettier after agent edits
- [`.vscode/`](.vscode/) — format on save + recommended extensions

## Next

1. Create or connect a Supabase project and fill `.env.local`
2. Generate DB types into `src/types/database.ts` when your schema exists
