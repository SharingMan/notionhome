# Changelog

All notable changes to this project are documented in this file.

The format follows Keep a Changelog, and versioning follows Semantic Versioning.

## [Unreleased]

### Added
- Placeholder for next release notes.

## [1.0.0] - 2026-02-15

### Added
- Notion OAuth connect flow with calendar feed generation.
- Feed configuration UI (database selection + property mapping).
- Public ICS endpoint for calendar subscription.
- `/my` user subscription center with Notion login session.
- `/my/edit/[feedId]` dedicated subscription edit page.
- `/admin` token-protected operations panel with CRUD actions.
- Pricing page with Free/Premium plan model.
- Trial activation flow for Premium.
- PayPal subscription flow:
  - Create subscription
  - Return callback activation
  - Webhook verification and plan sync
- Region-aware zh-CN localization for core pages.
- Release/operations documents:
  - `docs/REGRESSION_CHECKLIST.md`
  - `docs/OPERATIONS_RUNBOOK.md`

### Changed
- Migrated runtime/database setup to PostgreSQL (Prisma adapter).
- Switched commercialization checkout direction to PayPal-first.
- Redesigned subscription management UI to table + edit-flow model.
- Improved admin UI and routing behavior for production proxy environments.

### Fixed
- Fixed OAuth/config redirect issues pointing to `0.0.0.0:8080`.
- Fixed admin session cookie path mismatch causing false “session expired”.
- Fixed Notion object compatibility for `database` and `data_source`.
- Added Notion pagination support to break the 100-item limit.
- Reduced ICS cache TTL and improved freshness behavior.
- Added robust error handling for missing Notion access/configurations.

