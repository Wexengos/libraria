# Libraria

Libraria is a cultural catalogue for films, music, and books. The repository is a TypeScript Yarn workspaces monorepo with a React frontend and a NestJS modular-monolith API.

## Current scope: Phase 7 — refinement underway

- `frontend/` is a React 19, Vite, and TypeScript application. Tailwind CSS 4 supplies utility styling, with custom CSS for the editorial dark theme. React Router provides routes, TanStack Query handles API state, and Lucide supplies icons. Route screens load on demand, and shared React, router, query, and Supabase packages are emitted as separate build chunks.
- `backend/` is a NestJS REST API. `/api/health` reports API availability and `/api/health/database` verifies PostgreSQL through Prisma.
- Prisma ORM 7 uses the PostgreSQL driver adapter. Database URLs are assembled from separate environment fields. The API uses `DATABASE_*`; Prisma CLI migrations use optional `DIRECT_DATABASE_*` overrides from `prisma.config.ts`, falling back to `DATABASE_*`.
- Supabase Auth handles email/password registration and login in the browser. The API validates bearer tokens with Supabase Auth before serving protected profile endpoints; frontend state is for navigation and never grants API access on its own.
- `UserProfile` stores public profile fields keyed by the Supabase Auth UUID. Profiles are created on first authenticated profile access, so email-confirmation settings do not block registration. Public profiles are available at `/u/:username`; signed-in users can edit their own profile at `/profile`.
- The `user_profiles` table has Row Level Security enabled and no browser-facing policies. Profile reads and writes go through the NestJS API, which checks the authenticated identity.
- The media catalogue search and detail requests are proxied through NestJS. The browser never calls TMDB, MusicBrainz, Cover Art Archive, or Open Library directly.
- TMDB supplies film metadata, MusicBrainz supplies album metadata, Cover Art Archive supplies album artwork, and Open Library supplies book metadata and covers. Provider results are normalized by the API and cached briefly in process memory. Search results remain transient until a signed-in user adds a title to their library or a list.
- `MediaItem`, `ExternalIdentifier`, and category detail tables hold shared catalogue records. On import, the API reuses a record with the same provider identifier or creates it before creating the library or list relationship.
- `UserMedia` connects a profile to a media item, with category-specific statuses, a favorite flag, notes, started/completed dates, and an optional 0–5 rating in 0.5 steps. Its unique user/media constraint prevents duplicates. The API filters and sorts each user's entries and protects every library route with Supabase Auth.
- Reviews are authenticated text entries with an optional title, limited to one per user and media item. A review requires the user to set a rating in their library first; review cards read that same `UserMedia` rating, so there is only one stored score.
- Custom media lists belong to their creator, default to private visibility, and can be made public. Owners can add up to 500 catalogue items, remove items, and reorder the complete list. Public lists can be read without signing in; private lists are visible only to their owner.
- `MediaCatalogService` resolves provider identifiers to shared internal media records for both personal libraries, reviews, and lists. External provider IDs remain separate from internal UUIDs.
- Social follows use a follower/following join table with a composite key and a database check that prevents self-follows. Follow changes are authenticated and checked against the caller's identity.
- Activity rows are written with the library, review, and list change that produced them. The feed reads the current personal-library rating rather than copying ratings into activity records. Public feeds omit events tied to private lists.
- `/community` supports profile discovery and search. Public profiles show connection counts, activity, and lists; signed-in users can follow or unfollow other profiles. `/activity` shows recent activity from followed profiles.
- Catalogue and personal-library tables have RLS enabled without browser-facing policies; the backend owns all data access.
- Film search requires a server-side TMDB API Read Access Token (or the optional v3 API key fallback). MusicBrainz and Open Library use identifying User-Agent strings rather than API keys. Their upstream rate limits are respected by the backend.
- `/credits` identifies metadata sources and includes TMDB's required attribution.

The frontend calls the API at `VITE_API_URL` (default `http://localhost:3000/api`). CORS is restricted to the comma-separated `FRONTEND_URL` allow-list.

## Requirements

- Node.js 24.15+ (or a currently supported NestJS CLI runtime) with Corepack and Yarn 4.18
- A Supabase PostgreSQL project for database connectivity and migration execution

## Local setup

1. Enable Corepack if needed, then use the Yarn version pinned in `package.json`.
2. Copy `.env.example` to `.env` in the repository root and set `SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY`, `VITE_SUPABASE_URL`, and `VITE_SUPABASE_PUBLISHABLE_KEY` from your Supabase project. Then enter the database host, port, name, username, and password as separate fields. Use the transaction-pooler endpoint in `DATABASE_*` for serverless runtime; set the direct endpoint in `DIRECT_DATABASE_*` for migrations. `DIRECT_DATABASE_PASSWORD` can be omitted to reuse `DATABASE_PASSWORD`.
3. In Supabase Auth URL settings, allow `http://localhost:5173` as a redirect URL for email confirmation. Account creation may require email confirmation depending on the project's Auth settings.
4. Set provider values in the root `.env` when ready. TMDB credentials are obtained from TMDB account API settings; the other two values are application identification strings, not secrets. See [provider setup](#catalogue-provider-setup).
5. Install dependencies with `yarn install`.
6. Apply pending migrations from the backend workspace: `yarn workspace @libraria/backend db:migrate:dev`.
7. Start both applications with `yarn dev`.
8. Open the Vite URL (normally `http://localhost:5173`). The footer reports API connectivity. Check `http://localhost:3000/api/health/database` for the database connection.

## Catalogue provider setup

- **TMDB film search:** Create/sign into a TMDB account, then open Account Settings → API and request API access. Put the API Read Access Token in `TMDB_API_READ_ACCESS_TOKEN` in the repository root `.env`. Keep it server-side; never add a `VITE_` prefix. A v3 API key can be used as the optional `TMDB_API_KEY` fallback.
- **MusicBrainz music search:** Public catalogue search and lookup do not require OAuth. Set `MUSICBRAINZ_USER_AGENT` to `Libraria/0.1.0 (https://your-public-project-page)` in `.env`; MusicBrainz expects an identifying User-Agent and limits requests to one per second. If a future endpoint requires user authentication, set its OAuth **access token** in `MUSICBRAINZ_ACCESS_TOKEN`; the backend sends it as a Bearer token. Do not put a client secret in this variable.
- **Open Library book search:** No API key is used. Set `OPEN_LIBRARY_USER_AGENT` in the same format. Open Library asks clients to identify themselves and cache requests.
- If you do not have a public project page, a shared project mailbox can be used in the User-Agent contact field; do not put personal contact details in a public repository.
- Restart the backend after editing `.env`. Film search returns a clear configuration error until TMDB credentials are set.

For CI or deployment, use `yarn workspace @libraria/backend db:migrate:deploy` after setting the database environment fields, then `yarn build`. Never commit `.env` or expose database credentials through `VITE_` variables.

## Repository layout

```text
frontend/              React + Vite client
  src/features/library/ Personal collection and rating controls
  src/features/reviews/ Review form and media reviews
  src/features/lists/    Custom list creation and ordering
  src/features/social/   Community discovery, follows, and activity feeds
  src/                 App, routes, styles, and UI
backend/               NestJS API
  src/media/            Provider adapters, normalized catalogue API, image proxy, and cache
  src/library/          Authenticated collection management and filters
  src/reviews/          Authenticated review management and public media review reads
  src/lists/            Owner-managed lists and visibility-aware public reads
  src/social/           Follow management, activity feeds, and community discovery
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
- Auth users remain owned by Supabase, while the API stores corresponding profile fields under each Auth UUID. Phase 3 adds shared media catalogue tables, and Phase 4 creates local media records only when an authenticated user imports them.
- External media providers are accessed only through backend adapters. API requests are normalized to a shared response shape, and image bytes are proxied through the backend as well.
- Personal library ratings are stored as integer half-star units from 0 to 10, then exposed by the API as 0 to 5 in 0.5 increments. A null value means the user has not rated the item. Reviews do not store a second rating; they display the author's corresponding personal-library rating.
- The first review/list release keeps one editable review per user and media item. Lists are private by default; public list reads are enabled, while list management and review edits always check ownership in the backend.
- Social activity records are created in the same database transaction as the library, review, or list operation that produced them. Public profile activity and the following feed exclude private-list events; the owner can see their own private-list activity.

## Phase 5 API

- `POST /api/reviews` creates one review for a title already rated in the author's library; `PATCH` and `DELETE /api/reviews/:id` are owner-only.
- `GET /api/media/:provider/:externalId/reviews` returns public reviews and each author's shared library rating.
- `GET` and `POST /api/lists` list or create the signed-in user's collections. `GET /api/lists/:id` returns public lists to anyone and private lists only to their owner.
- `PATCH` and `DELETE /api/lists/:id` manage a list. `POST /api/lists/:id/items`, `DELETE /api/lists/:id/items/:itemId`, and `PUT /api/lists/:id/items/order` add, remove, and reorder titles. Reorder requests must contain every current list item exactly once.
- Phase 5 tables use foreign keys, indexes, unique constraints, rating checks where applicable, and RLS without browser-facing policies. The NestJS API remains the only application data path.

## Phase 6 API

- `POST` and `DELETE /api/users/:username/follow` follow or unfollow a profile. The API rejects self-follows and stores each relationship once.
- `GET /api/community?q=` returns a searchable list of public profiles, including follower counts and the signed-in viewer's follow state when available.
- `GET /api/activity` returns recent activity from followed profiles. `GET /api/users/:username/activity` returns a public profile's activity and allows the profile owner to see their private-list events.
- `GET /api/users/:username/social` returns follower/following counts and the viewer's follow state. `GET /api/users/:username/followers` and `/following` return profile connections.
- `GET /api/users/:username/lists` returns public lists, or all of the owner's lists when requested by that owner.
- Follow and activity tables have foreign keys, indexes, a self-follow check, and RLS without browser-facing policies.

The full product scope and development phases are defined in the Libraria Project Blueprint. Phase 7 refinement is underway; automated tests, a full responsive/accessibility pass, and deployment preparation remain.
