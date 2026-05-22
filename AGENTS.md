# AGENTS.md

## Cursor Cloud specific instructions

This is a **Playwright E2E test suite** that tests `https://app.slotsense.ai` remotely. There is no backend or database to run — the only service is the Playwright test runner against the external site.

### Quick reference

| Task | Command |
|---|---|
| Install deps | `npm install` |
| Install browsers | `npx playwright install --with-deps chromium` |
| Type-check | `npx tsc --noEmit` |
| Run all tests | `npm test` (alias for `npx playwright test`) |
| Run single test | `npx playwright test --grep "AUTH-001"` |
| Regenerate tests from CSV | `npm run generate` |

### Environment variables

Tests use these env vars (all optional, with defaults):

- `BASE_URL` — target app URL (default: `https://app.slotsense.ai`)
- `TEST_EMAIL` — login email (default: `user@example.com`)
- `TEST_PASSWORD` — login password (default: `Passw0rd!`)

The default credentials are placeholders. Tests that require real authentication (AUTH-001, AUTH-009) will fail without valid `TEST_EMAIL` and `TEST_PASSWORD`.

### Gotchas

- Playwright is configured for **Chromium only** (`playwright.config.ts`). No Firefox/WebKit browsers are needed.
- Test failures are expected with placeholder credentials — the infrastructure still works correctly.
- The `npm run generate` script regenerates `tests/auth.spec.ts` from `sheet.csv`. Manual edits to the spec file will be overwritten.
- Screenshots/videos from failed test runs are saved to `test-results/` and are not committed.
