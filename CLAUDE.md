@AGENTS.md

## Task Module Architecture (Sprint 3+)
- Task views: `task_views` table per-user (future: workspace-level via `workspace_id` column)
- Custom fields: `custom_field_definitions` (workspace) + `custom_field_values` (per task) — Sprint 3C
- Drag-and-drop: `@dnd-kit/core` + `@dnd-kit/sortable` (already installed)
- Table view: `@tanstack/react-table` — Sprint 3B
- Task sort order: `sort_order FLOAT` column on `tasks` table, fractional indexing `(a+b)/2`
- Checklist sort order: `position INT` already exists, update on drag end
- Edit in panel: TaskDialog preserved for task creation only; editing happens inline in TaskDetailPanel

## Next.js 16 Breaking Changes
- Middleware is now called **Proxy** — file is `src/proxy.ts` (not `middleware.ts`). Add public routes to `isPublicRoute` in that file.
- `searchParams` in page components is a `Promise` — always `await searchParams`.
- `params` in route handlers (e.g. `[accountId]`) is also a `Promise` — always `await params`.

## Auth Architecture
- `src/proxy.ts` — proxy middleware; controls which routes require login. Bearer-token API calls bypass it (already configured).
- `src/lib/api-auth.ts` — `getAuthenticatedClient()` handles both cookie sessions and `Authorization: Bearer <apiKey>`. Use this in all API route handlers.
- `createAdminClient()` in `src/lib/supabase/server.ts` — for Inngest/background jobs where no cookie store exists.

## Database Gotchas
- `api_keys` table has no `expires_at` column — don't select it.
- Selecting a non-existent column via Supabase returns `data: null` silently; always check the `error` field too.

## MCP Remote Connector
- OAuth 2.1 endpoints live at `/.well-known/`, `/oauth/authorize`, `/api/oauth/`. OAUTH_SIGNING_SECRET env var required on Vercel.
- MCP auth failures must return HTTP 401 (not HTTP 200 + JSON-RPC error) so Claude Desktop re-authenticates correctly.
- Internal `apiFetch` calls in MCP tools pass `Authorization: Bearer` — these hit the proxy, so `/api/` routes with Bearer headers are already whitelisted.
