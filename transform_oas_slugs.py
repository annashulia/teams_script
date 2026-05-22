#!/usr/bin/env python3
"""
Transform operationId values in local OpenAPI spec files using the slug mapping CSV.

Use this if you prefer to edit your spec files locally and re-upload them
through the ReadMe dashboard manually.

Usage:
    python transform_oas_slugs.py spec1.yaml spec2.json
    python transform_oas_slugs.py oas_files/*.yaml --output-dir transformed/
    python transform_oas_slugs.py spec.yaml --in-place
"""

import argparse
import csv
import json
import sys
from pathlib import Path

import yaml

MAPPING_FILE = Path(__file__).parent / "slug_mapping.csv"


def load_slug_mapping(mapping_file: Path) -> dict[str, str]:
    """Load {old_slug: new_slug} for rows marked 'Yes'."""
    mapping = {}
    with open(mapping_file, "r", encoding="utf-8") as f:
        reader = csv.DictReader(f)
        for row in reader:
            old = row.get("Old Slug (ReadMe)", "").strip()
            new = row.get("New Slug (apidocs-aligned)", "").strip()
            changed = row.get("Changed?", "").strip()
            if changed == "Yes" and old and new and old != new:
                mapping[old] = new
    return mapping


def process_spec(spec: dict, mapping: dict[str, str]) -> list[tuple[str, str]]:
    """Transform operationId values using the mapping. Returns (old, new) pairs."""
    changes = []
    for _path, path_item in spec.get("paths", {}).items():
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


def load_spec(filepath: Path) -> dict:
    text = filepath.read_text(encoding="utf-8")
    if filepath.suffix == ".json":
        return json.loads(text)
    return yaml.safe_load(text)


def save_spec(spec: dict, filepath: Path):
    if filepath.suffix == ".json":
        filepath.write_text(json.dumps(spec, indent=2, ensure_ascii=False), encoding="utf-8")
    else:
        filepath.write_text(
            yaml.dump(spec, default_flow_style=False, allow_unicode=True, sort_keys=False),
            encoding="utf-8",
        )


def main():
    parser = argparse.ArgumentParser(
        description="Transform operationIds in OpenAPI specs using the slug mapping CSV.",
    )
    parser.add_argument("files", nargs="+", type=Path, help="OAS files to process.")
    parser.add_argument("--in-place", action="store_true", help="Modify files in place (creates .bak backups).")
    parser.add_argument("--output-dir", type=Path, help="Write transformed files to this directory.")
    parser.add_argument(
        "--mapping-file", type=Path, default=MAPPING_FILE,
        help=f"Path to slug mapping CSV (default: {MAPPING_FILE}).",
    )

    args = parser.parse_args()

    if not args.mapping_file.exists():
        print(f"ERROR: Mapping file not found: {args.mapping_file}")
        sys.exit(1)

    mapping = load_slug_mapping(args.mapping_file)
    print(f"Loaded {len(mapping)} slug mappings.\n")

    if not args.in_place and not args.output_dir:
        print("Previewing changes (use --in-place or --output-dir to save):\n")

    if args.output_dir:
        args.output_dir.mkdir(parents=True, exist_ok=True)

    total = 0
    for filepath in args.files:
        if not filepath.exists():
            print(f"[SKIP] File not found: {filepath}")
            continue

        print(f"--- {filepath.name} ---")
        spec = load_spec(filepath)
        changes = process_spec(spec, mapping)

        if not changes:
            print("  No matching operationIds found.")
            continue

        total += len(changes)
        for old_id, new_id in changes:
            print(f"  {old_id}  ->  {new_id}")

        if args.in_place:
            backup = filepath.with_suffix(filepath.suffix + ".bak")
            filepath.rename(backup)
            save_spec(spec, filepath)
            print(f"  Saved (backup at {backup.name})")
        elif args.output_dir:
            out_path = args.output_dir / filepath.name
            save_spec(spec, out_path)
            print(f"  Saved to {out_path}")

    print(f"\nTotal: {total} operationId(s) transformed.")


if __name__ == "__main__":
    main()
