# Release Checklist

Use this checklist for every production release.

## 1) Prepare

- [ ] Branch is up to date with `main`.
- [ ] Scope is frozen (no last-minute feature additions).
- [ ] Env var changes are documented.
- [ ] DB schema changes reviewed (`prisma/schema.prisma`).

## 2) Verify

- [ ] `npm run lint` passes.
- [ ] `DATABASE_URL='postgresql://postgres:postgres@localhost:5432/postgres' npm run build` passes.
- [ ] Manual regression completed using `docs/REGRESSION_CHECKLIST.md`.

## 3) Release Notes

- [ ] Update `CHANGELOG.md`:
  - Move items from `[Unreleased]` to the new version.
  - Add release date.
- [ ] Confirm user-facing changes are clearly listed.

## 4) Git Release

- [ ] Commit release docs/changelog updates.
- [ ] Create annotated tag:

```bash
git tag -a vX.Y.Z -m "vX.Y.Z release"
```

- [ ] Push main and tags:

```bash
git push origin main --tags
```

## 5) Deploy (Railway)

- [ ] Deploy the tagged commit.
- [ ] Check runtime logs:
  - Prisma startup schema sync succeeds.
  - App starts without errors.
- [ ] Smoke test in production:
  - `/`
  - `/my`
  - `/pricing`
  - `/admin` (if enabled)
  - one `/api/feed/<id>.ics`

## 6) Post-release

- [ ] Confirm payment path works (`/pricing`, trial, PayPal callback/webhook if enabled).
- [ ] Confirm no abnormal 5xx spikes in logs.
- [ ] Announce release summary (version + highlights).

