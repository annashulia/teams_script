#!/usr/bin/env python3
"""
Bulk-update ReadMe URL slugs for LeadSquared API documentation.

Uses the exact slug mapping from slug_mapping.csv to rename pages.
For API Reference pages, it downloads each OpenAPI spec, updates the
operationId values, and re-uploads the spec.
For Guide/Reference pages, it updates slugs directly via the ReadMe API.

Usage:
    python update_readme_slugs.py --api-key YOUR_README_API_KEY [options]

Run with --dry-run first to preview changes without applying them.
"""

import argparse
import csv
import json
import os
import sys
import time
from pathlib import Path

import requests
import yaml

BASE_URL = "https://api.readme.com/v2"
BACKUP_DIR = Path("backups")
MAPPING_FILE = Path(__file__).parent / "slug_mapping.csv"


def load_slug_mapping(mapping_file: Path) -> dict[str, str]:
    """Load the old->new slug mapping from the CSV file.

    Returns a dict of {old_slug: new_slug} for rows marked 'Yes' in the Changed? column.
    """
    mapping = {}
    with open(mapping_file, "r", encoding="utf-8") as f:
        reader = csv.DictReader(f)
        for row in reader:
            old_slug = row.get("Old Slug (ReadMe)", "").strip()
            new_slug = row.get("New Slug (apidocs-aligned)", "").strip()
            changed = row.get("Changed?", "").strip()
            if changed == "Yes" and old_slug and new_slug and old_slug != new_slug:
                mapping[old_slug] = new_slug
    return mapping


def get_headers(api_key: str) -> dict:
    return {
        "Authorization": f"Bearer {api_key}",
        "Accept": "application/json",
    }


# ---------------------------------------------------------------------------
# API Reference pages (operationId in the OpenAPI spec determines the slug)
# ---------------------------------------------------------------------------

def list_api_definitions(api_key: str, branch: str) -> list[dict]:
    url = f"{BASE_URL}/branches/{branch}/apis"
    resp = requests.get(url, headers=get_headers(api_key))
    resp.raise_for_status()
    data = resp.json()
    return data.get("data", data) if isinstance(data, dict) else data


def download_api_spec(api_key: str, branch: str, filename: str) -> dict:
    url = f"{BASE_URL}/branches/{branch}/apis/{filename}"
    resp = requests.get(url, headers=get_headers(api_key))
    resp.raise_for_status()
    body = resp.json()
    return body.get("data", body) if isinstance(body, dict) else body


def upload_api_spec(api_key: str, branch: str, filename: str, spec: dict) -> dict:
    url = f"{BASE_URL}/branches/{branch}/apis/{filename}"
    headers = get_headers(api_key)

    if filename.endswith(".json"):
        spec_content = json.dumps(spec, indent=2)
        content_type = "application/json"
    else:
        spec_content = yaml.dump(
            spec, default_flow_style=False, allow_unicode=True, sort_keys=False
        )
        content_type = "application/x-yaml"

    files = {"schema": (filename, spec_content, content_type)}
    resp = requests.put(url, headers=headers, files=files)
    resp.raise_for_status()
    return resp.json()


def transform_operation_ids(spec: dict, mapping: dict[str, str]) -> list[tuple[str, str]]:
    """Update operationId values in the spec using the provided mapping.

    Returns a list of (old_id, new_id) pairs that were changed.
    """
    changes = []
    paths = spec.get("paths", {})
    for _path, path_item in paths.items():
        for method in ("get", "post", "put", "patch", "delete", "head", "options", "trace"):
            operation = path_item.get(method)
            if not operation:
                continue
            old_id = operation.get("operationId", "")
            if old_id in mapping:
                new_id = mapping[old_id]
                operation["operationId"] = new_id
                changes.append((old_id, new_id))
    return changes


def process_api_specs(api_key: str, branch: str, mapping: dict[str, str], dry_run: bool) -> int:
    print("\n" + "=" * 70)
    print("  API REFERENCE PAGES (via OpenAPI spec operationId)")
    print("=" * 70)

    definitions = list_api_definitions(api_key, branch)
    print(f"\nFound {len(definitions)} API definitions.\n")

    total_changes = 0

    for api_def in definitions:
        filename = api_def["filename"]
        print(f"\n--- {filename} ---")

        spec_data = download_api_spec(api_key, branch, filename)
        spec = spec_data.get("schema") if isinstance(spec_data, dict) else spec_data

        if spec is None:
            print(f"  [SKIP] Could not retrieve schema for {filename}")
            continue

        BACKUP_DIR.mkdir(exist_ok=True)
        backup_path = BACKUP_DIR / filename
        if filename.endswith(".json"):
            backup_path.write_text(json.dumps(spec, indent=2))
        else:
            backup_path.write_text(
                yaml.dump(spec, default_flow_style=False, allow_unicode=True, sort_keys=False)
            )
        print(f"  Backed up to {backup_path}")

        changes = transform_operation_ids(spec, mapping)

        if not changes:
            print("  No matching operationIds found in mapping. Skipping.")
            continue

        total_changes += len(changes)
        print(f"  Found {len(changes)} operationId(s) to update:")
        for old_id, new_id in changes:
            print(f"    {old_id}  ->  {new_id}")

        if dry_run:
            print("  [DRY RUN] Would upload modified spec.")
        else:
            print("  Uploading modified spec...")
            try:
                result = upload_api_spec(api_key, branch, filename, spec)
                status = "unknown"
                if isinstance(result, dict):
                    status = result.get("data", {}).get("upload", {}).get("status", "unknown")
                print(f"  Upload status: {status}")
                time.sleep(3)
            except requests.HTTPError as e:
                print(f"  [ERROR] Upload failed: {e}")
                print(f"  Response: {e.response.text if e.response else 'N/A'}")

    return total_changes


# ---------------------------------------------------------------------------
# Guide & Reference pages (slugs updated directly via the API)
# ---------------------------------------------------------------------------

def list_categories_for_section(api_key: str, branch: str, section: str) -> list[dict]:
    url = f"{BASE_URL}/branches/{branch}/categories/{section}"
    resp = requests.get(url, headers=get_headers(api_key))
    if resp.status_code == 404:
        return []
    resp.raise_for_status()
    data = resp.json()
    return data.get("data", data) if isinstance(data, dict) else data


def list_category_pages(api_key: str, branch: str, section: str, title: str) -> list[dict]:
    url = f"{BASE_URL}/branches/{branch}/categories/{section}/{title}/pages"
    resp = requests.get(url, headers=get_headers(api_key))
    if resp.status_code == 404:
        return []
    resp.raise_for_status()
    data = resp.json()
    return data.get("data", data) if isinstance(data, dict) else data


def update_page_slug(api_key: str, branch: str, section: str, old_slug: str, new_slug: str) -> dict:
    url = f"{BASE_URL}/branches/{branch}/{section}/{old_slug}"
    headers = get_headers(api_key)
    headers["Content-Type"] = "application/json"
    body = {"slug": new_slug}
    resp = requests.patch(url, headers=headers, json=body)
    resp.raise_for_status()
    return resp.json()


def process_pages(api_key: str, branch: str, mapping: dict[str, str], dry_run: bool) -> int:
    print("\n" + "=" * 70)
    print("  GUIDE & REFERENCE PAGES (direct slug update)")
    print("=" * 70)

    total_changes = 0

    for section in ("guides", "reference"):
        print(f"\n  Section: {section}")

        categories = list_categories_for_section(api_key, branch, section)
        if not categories:
            print(f"    No categories found.")
            continue

        for cat in categories:
            cat_title = cat.get("title", cat.get("name", "unknown"))
            print(f"\n    Category: {cat_title}")

            pages = list_category_pages(api_key, branch, section, cat_title)
            if not pages:
                print("      No pages found.")
                continue

            for page in pages:
                slug = page.get("slug", "")
                title = page.get("title", "")
                if slug in mapping:
                    new_slug = mapping[slug]
                    total_changes += 1
                    print(f"      {slug}  ->  {new_slug}  ({title})")
                    if not dry_run:
                        try:
                            update_page_slug(api_key, branch, section, slug, new_slug)
                            print("        Updated successfully.")
                            time.sleep(1)
                        except requests.HTTPError as e:
                            print(f"        [ERROR] {e}")
                            if e.response:
                                print(f"        Response: {e.response.text}")

    return total_changes


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------

def main():
    parser = argparse.ArgumentParser(
        description="Bulk-update ReadMe URL slugs using the mapping from slug_mapping.csv.",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  # Preview all changes (safe, no modifications):
  python update_readme_slugs.py --api-key rdme_xxxx --dry-run

  # Apply changes to API reference pages only:
  python update_readme_slugs.py --api-key rdme_xxxx --specs-only

  # Apply changes to guide/reference pages only:
  python update_readme_slugs.py --api-key rdme_xxxx --pages-only

  # Apply all changes:
  python update_readme_slugs.py --api-key rdme_xxxx

  # Use a specific branch:
  python update_readme_slugs.py --api-key rdme_xxxx --branch 1.0
        """,
    )

    parser.add_argument(
        "--api-key",
        default=os.environ.get("README_API_KEY"),
        help="ReadMe API key (or set README_API_KEY env var).",
    )
    parser.add_argument(
        "--branch",
        default="stable",
        help="ReadMe project branch/version (default: stable).",
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Preview changes without applying them.",
    )
    parser.add_argument(
        "--specs-only",
        action="store_true",
        help="Only process API reference specs (operationIds).",
    )
    parser.add_argument(
        "--pages-only",
        action="store_true",
        help="Only process guide/reference page slugs.",
    )
    parser.add_argument(
        "--mapping-file",
        type=Path,
        default=MAPPING_FILE,
        help=f"Path to the slug mapping CSV (default: {MAPPING_FILE}).",
    )

    args = parser.parse_args()

    if not args.api_key:
        print("ERROR: --api-key is required (or set README_API_KEY env var).")
        print("You can find your API key at: https://dash.readme.com > Project Settings > API Keys")
        sys.exit(1)

    if not args.mapping_file.exists():
        print(f"ERROR: Mapping file not found: {args.mapping_file}")
        sys.exit(1)

    mapping = load_slug_mapping(args.mapping_file)
    print(f"ReadMe Slug Updater")
    print(f"  Branch       : {args.branch}")
    print(f"  Mapping file : {args.mapping_file}")
    print(f"  Slugs to change: {len(mapping)}")
    print(f"  Mode         : {'DRY RUN (preview only)' if args.dry_run else 'LIVE (changes will be applied)'}")

    if args.dry_run:
        print("\n  ** No changes will be made. Remove --dry-run to apply. **")

    total = 0
    do_specs = not args.pages_only
    do_pages = not args.specs_only

    if do_specs:
        total += process_api_specs(args.api_key, args.branch, mapping, args.dry_run)

    if do_pages:
        total += process_pages(args.api_key, args.branch, mapping, args.dry_run)

    print("\n" + "=" * 70)
    action = "would be" if args.dry_run else "were"
    print(f"  SUMMARY: {total} slug(s) {action} updated.")
    if args.dry_run and total > 0:
        print("  Run again without --dry-run to apply changes.")
    print("=" * 70 + "\n")


if __name__ == "__main__":
    main()
