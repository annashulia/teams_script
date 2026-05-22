# ReadMe Slug Updater for LeadSquared API Docs

Bulk-update URL slugs on your ReadMe documentation to match your existing API docs site structure.

**Before:** `/reference/create_or_update_leads_in_bulk`
**After:** `/reference/bulk-create-or-update`

The exact old-to-new slug mapping is defined in `slug_mapping.csv` (259 slugs total, loaded from the [Google Sheet](https://docs.google.com/spreadsheets/d/1HnGZTL5EQ99OMEbNwu8MgiHd_JlAp68cQIkp0rbZEy8/edit?usp=sharing)).

---

## What You Need

1. **Python 3.10+** (already installed on most Mac/Linux systems)
2. **Your ReadMe API key** (a bearer token that lets the script talk to ReadMe)
3. **A terminal** (Terminal on Mac, PowerShell on Windows)

You do **not** need VS Code, but you can use it if you prefer.

---

## Setup (Step-by-Step)

### 1. Get your ReadMe API key

1. Log in to your ReadMe dashboard at https://dash.readme.com
2. Go to **Configuration** > **API Keys**
3. Copy the API key (it starts with `rdme_...`)

### 2. Open a terminal

- **Mac**: Open **Terminal** (search for "Terminal" in Spotlight)
- **Windows**: Open **PowerShell** (search for "PowerShell" in Start menu)
- **Linux**: Open your terminal emulator

### 3. Download this project

```bash
git clone https://github.com/annashulia/teams_script.git
cd teams_script
```

Or download the ZIP from GitHub and unzip it.

### 4. Install Python dependencies

```bash
pip install -r requirements.txt
```

If `pip` doesn't work, try `pip3`:

```bash
pip3 install -r requirements.txt
```

---

## Usage

### Step 1: Preview Changes (Dry Run)

**Always start here.** This is safe and makes zero changes:

```bash
python update_readme_slugs.py --api-key rdme_YOUR_KEY_HERE --dry-run
```

This will:
- Connect to your ReadMe project
- Download all 7 OpenAPI spec files
- Show every slug that will change, based on `slug_mapping.csv`
- Back up original spec files to `backups/`
- **Make no modifications**

Example output:

```
--- openapi_LeadSquared_Sales_CRM_v2_APIs_20260128_124533.yaml ---
  Backed up to backups/openapi_LeadSquared_Sales_CRM_v2_APIs_20260128_124533.yaml
  Found 15 operationId(s) to update:
    create_or_update_leads_in_bulk  ->  bulk-create-or-update
    get_a_lead_by_id               ->  get-lead-by-id
    create_a_lead                  ->  create-a-lead
    ...
  [DRY RUN] Would upload modified spec.
```

### Step 2: Apply Changes

Once you're satisfied with the dry run output:

```bash
python update_readme_slugs.py --api-key rdme_YOUR_KEY_HERE
```

### Optional Flags

```bash
# Only update API reference pages (via OpenAPI spec operationIds):
python update_readme_slugs.py --api-key rdme_YOUR_KEY_HERE --specs-only

# Only update guide/docs pages (direct slug update):
python update_readme_slugs.py --api-key rdme_YOUR_KEY_HERE --pages-only

# Use a specific branch/version (default is "stable"):
python update_readme_slugs.py --api-key rdme_YOUR_KEY_HERE --branch 1.0

# Use a different mapping file:
python update_readme_slugs.py --api-key rdme_YOUR_KEY_HERE --mapping-file my_mappings.csv
```

### Using an Environment Variable

Instead of passing `--api-key` every time:

```bash
# Mac/Linux:
export README_API_KEY=rdme_your_key_here

# Windows PowerShell:
$env:README_API_KEY = "rdme_your_key_here"

# Then run without --api-key:
python update_readme_slugs.py --dry-run
```

---

## Transforming Local OAS Files (Optional)

If you prefer to edit spec files locally and re-upload them through the ReadMe dashboard:

```bash
# Preview changes:
python transform_oas_slugs.py my_spec.yaml

# Save transformed files to a new directory:
python transform_oas_slugs.py my_spec.yaml --output-dir transformed/

# Transform files in place (creates .bak backups):
python transform_oas_slugs.py my_spec.yaml --in-place

# Process multiple files:
python transform_oas_slugs.py spec1.yaml spec2.json spec3.yaml --output-dir transformed/
```

---

## How It Works

### Slug Mapping (`slug_mapping.csv`)

The CSV file defines exactly which slugs to change. Each row has:

| Column | Description |
|--------|-------------|
| `Title` | Human-readable page title |
| `Old Slug (ReadMe)` | Current slug on ReadMe (e.g. `create_or_update_leads_in_bulk`) |
| `New Slug (apidocs-aligned)` | Target slug matching the API docs site (e.g. `bulk-create-or-update`) |
| `Changed?` | `Yes` if this slug needs updating, `No` if it stays the same |

There are 259 slug changes defined, of which 153 are simple underscore-to-dash conversions and 106 are custom renames.

### API Reference Pages

ReadMe generates URL slugs for API reference pages from the `operationId` field in the OpenAPI spec. The script downloads each spec, finds `operationId` values that match the mapping, updates them, and re-uploads.

### Guide Pages

For non-API-reference pages (guides, docs), the script updates the slug directly via the ReadMe v2 API (`PATCH /branches/{branch}/guides/{slug}`).

---

## Backups

Original OpenAPI spec files are saved to `backups/` before any changes are made. If anything goes wrong, you can re-upload these through the ReadMe dashboard.

---

## Files in This Project

| File | Purpose |
|------|---------|
| `update_readme_slugs.py` | Main script: connects to ReadMe API, updates slugs |
| `transform_oas_slugs.py` | Offline tool: transforms local OAS files using the mapping |
| `slug_mapping.csv` | The exact old-to-new slug mapping (259 changes) |
| `requirements.txt` | Python dependencies |
| `backups/` | Created automatically to store original spec files |

---

## FAQ

**Q: Do I need VS Code?**
No. Any terminal works. VS Code has a built-in terminal (View > Terminal) which is convenient, but not required.

**Q: What if something goes wrong?**
Your original specs are backed up in `backups/`. Re-upload them through the ReadMe dashboard or API.

**Q: Will this break my UI customizations on ReadMe?**
The script only changes `operationId` values in the specs. UI customizations made through the ReadMe editor are stored separately and should be preserved.

**Q: Can I add more slug changes?**
Yes. Edit `slug_mapping.csv` to add new rows with the old slug, new slug, and set Changed? to "Yes".

**Q: Can I undo the changes?**
Yes. Re-upload the backup files from `backups/`, or create a reverse mapping CSV.
