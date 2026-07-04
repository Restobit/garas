# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

Garas (HKR) — multi-user, local-first household expense tracker. Two npm packages: `backend/` (Node + Express + Mongoose, TypeScript strict, ESM) and `frontend/` (React 18 + Vite + MUI v5 + TanStack React Query). MongoDB stores data; file attachments go to GridFS (5 MB limit).

**Language convention:** all code comments, UI text, API error messages, and route slugs (`/havi-koltseg`, `/artortenet`, …) are Hungarian. Follow that in new code. UI strings live in `frontend/src/i18n/hu.json` (the only complete locale; `en.json` is an empty placeholder, fallback is `hu`).

## Commands

```bash
# Full local stack (mongo + backend :4000 + vite dev :5173)
docker compose up --build

# Without Docker (mongo still in a container)
docker compose up -d mongo
cd backend && MONGO_URI=mongodb://localhost:27017/garas npm run dev
cd frontend && npm run dev

# In backend/ or frontend/:
npm test                      # Vitest unit tests
npx vitest run src/services/logic.test.ts        # single file (backend)
npx vitest run src/lib/format.test.ts -t "name"  # single test by name
npm run typecheck             # tsc --noEmit
npm run build

# E2E (Playwright, from frontend/) — needs the full stack running WITHOUT Clerk keys
npx playwright install chromium   # first time
npm run test:e2e                  # projects: "desktop" and "mobile" (Pixel 7)
npx playwright test e2e/app.spec.ts --project=desktop
```

Backend health check: `curl http://localhost:4000/health`. Smoke-test an API route with the dev auth header: `curl -H "x-dev-user: smoke" http://localhost:4000/api/settings`.

## Architecture

### Auth: Clerk is optional, dev mode is header-based

If `CLERK_SECRET_KEY` is unset (and `NODE_ENV != production`), the backend runs in dev auth mode: `requireUser` (`backend/src/middleware/auth.ts`) takes the user id from the `x-dev-user` header (default `dev-user`). E2E tests depend on this. The frontend mirrors it: `auth/useOptionalClerk.ts` + `setTokenGetter` in `lib/api.ts` — with Clerk it sends a Bearer token, without it the `x-dev-user` header (value from `localStorage["garas.devUser"]`).

### Multi-tenancy: userId scoping is mandatory

Every Mongoose model (all in `backend/src/models.ts`) has a required, indexed `userId`. The generic CRUD layer injects it on create and filters every query by it; updates strip client-sent `userId`/`_id`. Any new model, route, or aggregation must scope by `req.userId` the same way — this is the security boundary between users.

### Backend request pipeline

`app.ts`: `cors → express.json → /api: clerkGuard → requireUser → ensureSeedData → api router → notFound → errorHandler`. `ensureSeedData` (`services/seed.ts`) lazily creates starter categories/payment methods/settings per user on first request. All handlers wrap in `asyncHandler` and throw `ApiError(status, hungarianMessage, CODE)` from `middleware/error.ts`.

### Generic CRUD factory — how entities are added

`backend/src/routes/crud.ts` exports `crudRouter(Model, { filterFields, sort, beforeSave, afterDelete })` providing list/get/create/update/delete, all userId-scoped. `routes/index.ts` registers ~14 entities with it and layers special endpoints on top (e.g. `receiptsRouter` before the generic one on `/receipts`, `POST /expenses/batch` for quick entry). Non-CRUD routes: `routes/dashboard.ts` (aggregations), `routes/baseCosts.ts` (auto-fill logic), `routes/files.ts` (GridFS upload/download).

The frontend counterpart is equally generic: `lib/queries.ts` (`useList`/`useCreate`/`useUpdate`/`useDelete` keyed by entity name, with invalidation) and `components/CrudPage.tsx`, a config-driven table+dialog page. Most simple pages in `pages/SimplePages.tsx` are just `CrudPage` configs. Adding an entity typically means: schema in `models.ts` → `crudRouter` line in `routes/index.ts` → type in `frontend/src/lib/types.ts` → `CrudPage` config → i18n keys in `hu.json` → usage-check entry if other entities can reference it.

### Business logic is isolated and pure

Date/price computations (price-history resolution `resolveAmount`, usage intervals, due-in-month frequency logic) live DB-free in `backend/src/services/logic.ts` and are the main unit-test surface (`logic.test.ts`). Keep new computation logic there, not in route handlers. Frontend equivalents: `lib/format.ts` and `lib/quickSession.ts` (receipt quick-entry session in localStorage), both unit-tested.

### Delete-with-usage-check pattern

Every delete first calls `GET /api/usage/:entityType/:id` (`services/usageCheck.ts` — a declarative reference map) and shows the results in a confirm popup (`useDeleteWithCheck` + `ConfirmDeleteDialog`). When adding cross-entity references, register them in `usageCheck.ts`.

### Deployment split

Local dev uses `docker-compose.yml` (all three services); production is `docker-compose.prod.yml` (mongo + backend only, Mongo port not published) on a VPS, with the frontend deployed separately to Vercel (root directory `frontend`, `VITE_API_URL` pointing at the backend). The backend refuses to start in production without `CLERK_SECRET_KEY`.
