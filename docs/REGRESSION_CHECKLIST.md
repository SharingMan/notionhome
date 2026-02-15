# Regression Checklist (v1.0)

Last updated: 2026-02-15

## 1) Automated Baseline

Run these in project root:

```bash
npm run lint
DATABASE_URL='postgresql://postgres:postgres@localhost:5432/postgres' npm run build
```

Expected:
- `eslint` passes with no error.
- `next build` passes.
- App routes include:
  - `/`
  - `/config/[feedId]`
  - `/my`
  - `/my/edit/[feedId]`
  - `/admin`
  - `/api/feed/[id]`

## 2) Manual Regression Flow

### A. OAuth + Feed Creation

- [ ] Open `/`, click `Connect Notion`.
- [ ] Complete Notion OAuth consent.
- [ ] Redirect to `/config/<feedId>` (must not jump to `0.0.0.0:8080`).
- [ ] Select database + mapping, click `Generate Calendar URL`.
- [ ] Success page shows:
  - ICS URL
  - `Open ICS URL` button
  - `Manage My Subscriptions` button

### B. My Subscriptions (`/my`)

- [ ] Open `/my`, if not logged in then click `Notion 登录`.
- [ ] After OAuth login, only current Notion account feeds are shown.
- [ ] List table shows: name, state, database, calendar URL copy action, updated time, edit action.
- [ ] `Copy to clipboard` works.

### C. Edit Page (`/my/edit/:feedId`)

- [ ] Click edit icon from `/my` row.
- [ ] Edit and save:
  - calendar name
  - database ID
  - title/date/description property
- [ ] Save succeeds and values persist.
- [ ] Delete flow removes feed and redirects back to `/my`.

### D. Admin (`/admin`)

- [ ] Login with `ADMIN_TOKEN`.
- [ ] Create new subscription from admin.
- [ ] Update mapping and save from admin list.
- [ ] Delete one feed from admin.

### E. ICS Endpoint

- [ ] Open `/api/feed/<id>.ics` in browser.
- [ ] Response headers include:
  - `Content-Type: text/calendar`
  - `Cache-Control: public, max-age=0, s-maxage=30, stale-while-revalidate=30`
- [ ] Content reflects Notion updates within expected subscription refresh window.

### F. Pricing / Billing

- [ ] Open `/pricing`, confirm Free/Premium cards render.
- [ ] Free user over feed limit is redirected to `/pricing?reason=limit`.
- [ ] Start trial button works and plan changes to Premium.
- [ ] If PayPal configured, monthly/yearly checkout buttons are visible.
- [ ] If PayPal not configured, page shows configuration hint instead of checkout buttons.

## 3) Release Sign-off

- [ ] Automated baseline passed.
- [ ] Manual flow A-F passed.
- [ ] Railway deployment green.
- [ ] Production smoke test passed on:
  - `/`
  - `/my`
  - `/admin`
  - one live ICS URL
