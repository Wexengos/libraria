# Libraria

Libraria is a cultural catalogue for films, music, and books. The repository is a TypeScript Yarn workspaces monorepo with a React frontend and a NestJS modular-monolith API.

## Phase 1 foundation

- `frontend/` is a React 19, Vite, and TypeScript application. Tailwind CSS 4 supplies utility styling, with custom CSS for the editorial dark theme. React Router provides routes, TanStack Query handles API state, and Lucide supplies icons.
- `backend/` is a NestJS REST API. `/api/health` reports API availability and `/api/health/database` verifies PostgreSQL through Prisma.
- Prisma ORM 7 uses the PostgreSQL driver adapter. Database URLs are assembled from separate environment fields. The API uses `DATABASE_*`; Prisma CLI migrations use optional `DIRECT_DATABASE_*` overrides from `prisma.config.ts`, falling back to `DATABASE_*`.
- Product-domain models are intentionally not introduced in this phase. The foundation migration verifies database access and records migration history without creating domain tables.

The frontend calls the API at `VITE_API_URL` (default `http://localhost:3000/api`). CORS is restricted to the comma-separated `FRONTEND_URL` allow-list.

## Requirements

- Node.js 24.15+ (or a currently supported NestJS CLI runtime) with Corepack and Yarn 4.18
- A Supabase PostgreSQL project for database connectivity and migration execution

## Local setup

1. Enable Corepack if needed, then use the Yarn version pinned in `package.json`.
2. Copy `.env.example` to `.env` in the repository root and enter the Supabase host, port, database, username, and password as separate fields. Use the transaction-pooler endpoint in `DATABASE_*` for serverless runtime; set the direct endpoint in `DIRECT_DATABASE_*` for migrations. `DIRECT_DATABASE_PASSWORD` can be omitted to reuse `DATABASE_PASSWORD`.
3. Install dependencies with `yarn install`.
4. Apply the initial migration from the backend workspace: `yarn workspace @libraria/backend db:migrate:dev`.
5. Start both applications with `yarn dev`.
6. Open the Vite URL (normally `http://localhost:5173`). The footer reports API connectivity. Check `http://localhost:3000/api/health/database` for the database connection.

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
- The first migration runs a harmless `SELECT 1` to establish migration history and verify database access without pulling authentication or media-domain work forward from later phases.

The detailed scope and future development phases are defined in the project blueprint supplied for this repository.
