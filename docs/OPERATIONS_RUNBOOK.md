# Operations Runbook (Railway)

Last updated: 2026-02-15

## 1) Required Environment Variables

Required:

- `DATABASE_URL`
- `NOTION_CLIENT_ID`
- `NOTION_CLIENT_SECRET`
- `NOTION_REDIRECT_URI`
- `NEXT_PUBLIC_BASE_URL`

Optional:

- `ADMIN_TOKEN` (enables `/admin`)
- `NOTION_SYNC_MAX_ITEMS` (default `2000`)
- `NOTION_SYNC_LOOKBACK_DAYS` (default `3`)
- `FREE_PLAN_MAX_FEEDS` (default `1`)
- `PREMIUM_TRIAL_DAYS` (default `14`)
- `PAYPAL_ENV` (`sandbox` / `live`)
- `PAYPAL_CLIENT_ID`
- `PAYPAL_CLIENT_SECRET`
- `PAYPAL_PLAN_ID_MONTHLY` / `PAYPAL_PLAN_ID_YEARLY`
- `PAYPAL_WEBHOOK_ID` (for webhook verification)

## 2) Railway Deploy Procedure

1. Push `main` to GitHub.
2. In Railway, open `notionhome` service.
3. Verify variables are set and correct.
4. Click `Deploy`.
5. Verify deployment logs:
   - `prisma db push` succeeds
   - server starts without runtime error
6. Smoke test:
   - `/`
   - `/my`
   - `/admin` (if `ADMIN_TOKEN` enabled)
   - one known `/api/feed/<id>.ics`

## 3) Daily Health Checks

- Confirm app is reachable from public domain.
- Confirm one test ICS URL returns `200`.
- Confirm Notion OAuth can start (`/api/auth/notion` redirects).
- Review Railway logs for `Error` / `Internal Server Error`.

## 4) Common Incidents and Fixes

### A. `{"error":"Missing Notion Client credentials"}`

Cause:
- `NOTION_CLIENT_ID` or `NOTION_CLIENT_SECRET` missing in Railway.

Fix:
1. Add/update variables in Railway.
2. Redeploy.

### B. Redirect jumps to `0.0.0.0:8080`

Cause:
- Wrong base URL handling or missing `NEXT_PUBLIC_BASE_URL`.

Fix:
1. Set `NEXT_PUBLIC_BASE_URL` to public domain (example: `https://notionhome-production.up.railway.app`).
2. Redeploy.

### C. `No accessible databases found`

Cause:
- Integration has no access to target database/data source.

Fix:
1. Open target Notion database page.
2. `Share` -> `Add connections` -> choose integration.
3. Re-run OAuth connect.

### D. `Error connecting to Notion. Please try again.`

Cause:
- OAuth callback mismatch / stale token / insufficient permissions.

Fix:
1. Verify Notion integration redirect URI:
   - `<PUBLIC_BASE_URL>/api/auth/callback/notion`
2. Ensure integration has content read permissions.
3. Re-run OAuth from homepage.

### E. `/admin` shows “登录状态已过期”

Cause:
- Session expired or invalid `ADMIN_TOKEN`.

Fix:
1. Re-login at `/admin`.
2. If still failing, rotate `ADMIN_TOKEN` and redeploy.

### F. Calendar app reports subscription/network unstable

Cause:
- Wrong URL format or temporary network/refresh issue.

Fix:
1. Use exact ICS URL:
   - `/api/feed/<feed-id>.ics`
2. Open URL in browser first; must return calendar text.
3. Retry subscription in Apple/Google Calendar after a short wait.

### G. Only first 100 events appear

Cause:
- Notion pagination or item cap.

Fix:
1. Ensure latest code is deployed (pagination support included).
2. Increase `NOTION_SYNC_MAX_ITEMS` if needed.
3. Check `NOTION_SYNC_LOOKBACK_DAYS` for window filtering behavior.

### H. PayPal checkout cannot start

Cause:
- Missing PayPal env vars or invalid plan id.

Fix:
1. Verify `PAYPAL_CLIENT_ID` / `PAYPAL_CLIENT_SECRET`.
2. Verify `PAYPAL_PLAN_ID_MONTHLY` or `PAYPAL_PLAN_ID_YEARLY`.
3. Confirm `PAYPAL_ENV` matches your plan environment (`sandbox` vs `live`).
4. Retry from `/pricing`.

### I. PayPal webhook rejected

Cause:
- Signature verification failed or missing `PAYPAL_WEBHOOK_ID`.

Fix:
1. Set correct `PAYPAL_WEBHOOK_ID`.
2. Ensure webhook URL is:
   - `https://<PUBLIC_BASE_URL>/api/billing/paypal/webhook`
3. Re-send webhook event from PayPal dashboard.

## 5) Operational Commands

Run locally:

```bash
npm run lint
DATABASE_URL='postgresql://postgres:postgres@localhost:5432/postgres' npm run build
```

Optional DB sync (local):

```bash
npx prisma db push
```

## 6) Rollback Guidance

If a deployment introduces regression:

1. In Railway, redeploy previous healthy commit.
2. Keep env vars unchanged unless incident is config-related.
3. Re-run smoke test on `/`, `/my`, `/admin`, one ICS URL.
