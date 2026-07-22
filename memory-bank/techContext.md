# Tech context

## Stack

| Layer        | Choice                                                    |
| ------------ | --------------------------------------------------------- |
| App          | Vite 8 + React 19 + TypeScript                            |
| Styling      | Tailwind CSS v4 + shadcn/ui (radix-nova) + Geist font     |
| Routing      | react-router-dom v7                                       |
| Server state | `@tanstack/react-query`                                   |
| Forms        | `react-hook-form` + `zod` + `@hookform/resolvers`         |
| Dates        | `date-fns`                                                |
| Icons        | `lucide-react`                                            |
| Toasts       | `sonner` + `next-themes`                                  |
| Backend      | Supabase JS (`@supabase/supabase-js`)                     |
| Tooling      | ESLint, Prettier, Husky + lint-staged, `shadcn` CLI (dev) |

## Scripts

| Command             | Purpose                      |
| ------------------- | ---------------------------- |
| `npm run dev`       | Dev server                   |
| `npm run build`     | Typecheck + production build |
| `npm run typecheck` | `tsc -b`                     |
| `npm run lint`      | ESLint                       |
| `npm run verify`    | Typecheck + lint             |
| `npm run format`    | Prettier write               |
| `npm run preview`   | Preview production build     |

## Environment

Copy `.env.example` → `.env.local`:

```env
VITE_SUPABASE_URL=
VITE_SUPABASE_PUBLISHABLE_KEY=
```

Never commit secrets or use the service-role key in the SPA.

## Still planned

- Hosting: Vercel or Netlify
- Generated `Database` types from Supabase schema
- Additional shadcn components as screens need them (Kanban/Gantt libs TBD)

## Agent tooling

- Cursor rules: `.cursor/rules/`
- Post-edit format hook: `.cursor/hooks.json`
- Memory Bank: `memory-bank/`
- Product PRD: Notion _Projects Management system_
- UI kit config: `components.json`
