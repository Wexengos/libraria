# Libraria

Libraria is a cultural catalogue for films, music, and books. The repository is a TypeScript Yarn workspaces monorepo with a React frontend and a NestJS modular-monolith API.

## Current scope: Phase 2 — authentication and profiles

- `frontend/` is a React 19, Vite, and TypeScript application. Tailwind CSS 4 supplies utility styling, with custom CSS for the editorial dark theme. React Router provides routes, TanStack Query handles API state, and Lucide supplies icons.
- `backend/` is a NestJS REST API. `/api/health` reports API availability and `/api/health/database` verifies PostgreSQL through Prisma.
- Prisma ORM 7 uses the PostgreSQL driver adapter. Database URLs are assembled from separate environment fields. The API uses `DATABASE_*`; Prisma CLI migrations use optional `DIRECT_DATABASE_*` overrides from `prisma.config.ts`, falling back to `DATABASE_*`.
- Supabase Auth handles email/password registration and login in the browser. The API validates bearer tokens with Supabase Auth before serving protected profile endpoints; frontend state is for navigation and never grants API access on its own.
- `UserProfile` stores public profile fields keyed by the Supabase Auth UUID. Profiles are created on first authenticated profile access, so email-confirmation settings do not block registration. Public profiles are available at `/u/:username`; signed-in users can edit their own profile at `/profile`.
- The `user_profiles` table has Row Level Security enabled and no browser-facing policies. Profile reads and writes go through the NestJS API, which checks the authenticated identity.
- Media-domain models remain out of scope until Phase 3.

The frontend calls the API at `VITE_API_URL` (default `http://localhost:3000/api`). CORS is restricted to the comma-separated `FRONTEND_URL` allow-list.

## Requirements

- Node.js 24.15+ (or a currently supported NestJS CLI runtime) with Corepack and Yarn 4.18
- A Supabase PostgreSQL project for database connectivity and migration execution

## Local setup

1. Enable Corepack if needed, then use the Yarn version pinned in `package.json`.
2. Copy `.env.example` to `.env` in the repository root and set `SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY`, `VITE_SUPABASE_URL`, and `VITE_SUPABASE_PUBLISHABLE_KEY` from your Supabase project. Then enter the database host, port, name, username, and password as separate fields. Use the transaction-pooler endpoint in `DATABASE_*` for serverless runtime; set the direct endpoint in `DIRECT_DATABASE_*` for migrations. `DIRECT_DATABASE_PASSWORD` can be omitted to reuse `DATABASE_PASSWORD`.
3. In Supabase Auth URL settings, allow `http://localhost:5173` as a redirect URL for email confirmation. Account creation may require email confirmation depending on the project's Auth settings.
4. Install dependencies with `yarn install`.
5. Apply pending migrations from the backend workspace: `yarn workspace @libraria/backend db:migrate:dev`.
6. Start both applications with `yarn dev`.
7. Open the Vite URL (normally `http://localhost:5173`). The footer reports API connectivity. Check `http://localhost:3000/api/health/database` for the database connection.

For CI or deployment, use `yarn workspace @libraria/backend db:migrate:deploy` after setting the database environment fields, then `yarn build`. Never commit `.env` or expose database credentials through `VITE_` variables.

## Repository layout

```text
frontend/              React + Vite client
  src/                 App, routes, styles, and UI
backend/               NestJS API
  src/health/           API and PostgreSQL health endpoints
  src/prisma/           Prisma service and client integration
  prisma/               PostgreSQL schema and migration history
package.json            Yarn workspaces and common commands
.env.example            Local environment variable template
```

## Architectural decisions

- One repository and one Yarn lockfile coordinate the two apps without adding a shared package before shared contracts exist. Yarn uses the `node_modules` linker for compatibility with NestJS and Prisma tooling.
- The backend owns database access and future business logic; frontend requests use HTTP REST.
- PostgreSQL credentials are server-side only and stored as separate environment fields. Runtime queries can use Supabase's transaction pooler, while Prisma CLI migrations can use a direct connection through `DIRECT_DATABASE_*` overrides.
- The foundation migration records database access; the Phase 2 migration adds only the user profile table. Auth users remain owned by Supabase, while the API stores corresponding profile fields under each Auth UUID.

The full product scope and development phases are defined in the Libraria Project Blueprint. The current implementation stops at Phase 2; later phases require explicit direction before work begins.
