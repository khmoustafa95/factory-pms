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
cp .env.example .env.local
```

Fill `.env.local` with your Supabase project values:

```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=your-publishable-key
```

## Scripts

| Command             | Description                             |
| ------------------- | --------------------------------------- |
| `npm run dev`       | Start the Vite dev server               |
| `npm run build`     | Typecheck and production build          |
| `npm run preview`   | Preview the production build            |
| `npm run typecheck` | Run TypeScript project references check |
| `npm run lint`      | Run ESLint                              |
| `npm run format`    | Format with Prettier                    |

Pre-commit runs ESLint and Prettier on staged files via Husky + lint-staged.

## Agent / conventions

- [`AGENTS.md`](AGENTS.md) — project map for coding agents
- [`.cursor/rules/`](.cursor/rules/) — scoped Cursor rules (core, React/TS, Supabase)
- [`.cursor/hooks.json`](.cursor/hooks.json) — format edited files with Prettier after agent edits
- [`.vscode/`](.vscode/) — format on save + recommended extensions

## Next

1. Create or connect a Supabase project and fill `.env.local`
2. Generate DB types into `src/types/database.ts` when your schema exists
