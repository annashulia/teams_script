# teams_script

Playwright E2E test automation for Slotsense auth flows, plus tooling for ReadMe documentation management.

---

## ReadMe Slug Updater

`scripts/update-readme-slugs.ts` bulk-converts every Guide page slug on your ReadMe project from **underscore** format (`create_or_update_leads_in_bulk`) to **dash** format (`create-or-update-leads-in-bulk`), matching the URL structure of your public API docs site.

### Prerequisites

- **Node.js** 18 or later (built-in `https` module is used; no extra HTTP libraries required)
- **ts-node** (already a dev-dependency in this project)
- A **ReadMe API key** — find it in your ReadMe dashboard under *Configuration → API Keys*

### Setup (first time)

```bash
npm install
```

### Running the script

#### 1 – Preview first (dry run, no changes written)

```bash
README_API_KEY=your_key_here npm run update-slugs:dry
```

Or with a specific docs version:

```bash
README_API_KEY=your_key_here ts-node scripts/update-readme-slugs.ts --dry-run --version=v2.0
```

This prints every slug that *would* be changed without touching ReadMe.

#### 2 – Apply the changes

```bash
README_API_KEY=your_key_here npm run update-slugs
```

#### All options

| Option | Default | Description |
|---|---|---|
| `--dry-run` | off | Preview only; no writes |
| `--version=<ver>` | project default | Target a specific ReadMe version (e.g. `v2.0`) |
| `--delay=<ms>` | `500` | Milliseconds to pause between API calls (avoids rate-limiting) |
| `--category=<slug>` | all categories | Process a single category only |

#### Environment variables

| Variable | Required | Description |
|---|---|---|
| `README_API_KEY` | **yes** | Your ReadMe API key |
| `README_VERSION` | no | Fallback version if `--version` flag is not set |

### What it does, step by step

1. Calls `GET /categories` (paginated) to retrieve every category in your project.
2. For each category, calls `GET /categories/{slug}/docs` to list all pages, including nested child pages.
3. Any page whose slug contains an underscore (`_`) is queued for an update.
4. For each queued page it:
   - Fetches the full page content via `GET /docs/{slug}`.
   - Sends a `PUT /docs/{slug}` with all existing fields preserved, but with the `slug` field set to the dash version.
5. Prints a summary of successes and failures.

### Notes on API Reference pages

ReadMe API Reference pages derive their URLs from the `operationId` field in your OpenAPI spec file, **not** from the ReadMe page slug. To change those URLs you need to edit the `operationId` values in your OAS file(s) and re-upload the spec.

If you have UI customisations on top of a spec, export the latest spec from ReadMe (*Dashboard → API Reference → Export*) before editing, so your UI changes are not lost.

---

## Playwright tests

### Generate tests from CSV

```bash
npm run generate
```

Reads `sheet.csv` and writes `tests/<group>.spec.ts` files.

### Run tests

```bash
npm test
```

Or with environment overrides:

```bash
BASE_URL=https://staging.slotsense.ai TEST_EMAIL=me@example.com TEST_PASSWORD=secret npm test
```
