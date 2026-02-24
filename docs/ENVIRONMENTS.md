# Environment & Version Strategy

This project should run with three environments:

1. `local` (developer machine)
2. `staging` (internal development / test)
3. `production` (public users)

## Branch Strategy

- `main`: production source of truth.
- `develop`: internal development integration branch.
- `feature/*`: short-lived feature branches merged into `develop`.

Release flow:

1. Develop feature in `feature/*`.
2. Merge feature into `develop`.
3. Deploy `develop` to Railway `staging`.
4. Run regression checklist.
5. Merge `develop` into `main`.
6. Tag release (`vX.Y.Z`) and deploy production.

## Railway Mapping

- `production` service:
  - Git branch: `main`
  - Public domain only
  - Production variables only

- `staging` service:
  - Git branch: `develop`
  - Internal/test domain
  - Separate variables and database from production

## Environment Variables by Stage

Required in all stages:

- `DATABASE_URL`
- `NOTION_CLIENT_ID`
- `NOTION_CLIENT_SECRET`
- `NOTION_REDIRECT_URI`
- `NEXT_PUBLIC_BASE_URL`

Optional:

- `ADMIN_TOKEN`
- `NOTION_SYNC_MAX_ITEMS`
- `NOTION_SYNC_LOOKBACK_DAYS`
- `APP_ENV` (`local`, `staging`, `production`)

## Non-negotiable Safety Rules

- Never share DB between `staging` and `production`.
- Never share Notion OAuth redirect URL between `staging` and `production`.
- Always smoke test `staging` before merging to `main`.
- Use `prisma migrate deploy` for long-term production stability planning.
