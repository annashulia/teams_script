#!/usr/bin/env python3
"""
Monitor Microsoft Teams unread badge count and trigger an alarm.

Primary source: Teams badge text from the Dock icon (more reliable on macOS).
Fallback source: Teams front window title.
"""

from __future__ import annotations

import argparse
from collections import deque
from dataclasses import dataclass
import logging
import platform
import re
import subprocess
import sys
import time

LOGGER = logging.getLogger("teams_alarm_badge")

DEFAULT_APP_NAMES = ("Microsoft Teams", "Microsoft Teams classic", "Teams")
WINDOW_TITLE_PATTERNS = (
    re.compile(r"^\((\d+)\)"),
    re.compile(r"^\[(\d+)\]"),
    re.compile(r"(\d+)\s+unread", re.IGNORECASE),
)


@dataclass
class BadgeSample:
    unread_count: int
    source: str
    raw_value: str
    app_name: str


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Monitor Teams unread badge count and play an alarm."
    )
    parser.add_argument(
        "--app-name",
        default="Microsoft Teams",
        help=(
            "Teams process name or comma-separated list. "
            'Example: "Microsoft Teams,Teams".'
        ),
    )
    parser.add_argument(
        "--interval",
        type=float,
        default=5.0,
        help="Polling interval in seconds (default: 5).",
    )
    parser.add_argument(
        "--alarm-repeat",
        type=int,
        default=2,
        help="How many beeps to play when unread count increases (default: 2).",
    )
    parser.add_argument(
        "--min-unread",
        type=int,
        default=1,
        help="Minimum unread count required to trigger alarm (default: 1).",
    )
    parser.add_argument(
        "--confirm-samples",
        type=int,
        default=2,
        help=(
            "How many identical samples are required before applying a state change "
            "(default: 2). Set to 1 for immediate changes."
        ),
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Do not play sound; only print log messages.",
    )
    parser.add_argument(
        "--once",
        action="store_true",
        help="Run one check and exit.",
    )
    parser.add_argument(
        "--debug",
        action="store_true",
        help="Enable debug-level logs in English.",
    )
    return parser.parse_args()


def configure_logging(debug: bool) -> None:
    level = logging.DEBUG if debug else logging.INFO
    logging.basicConfig(
        level=level,
        format="%(asctime)s | %(levelname)s | %(message)s",
        datefmt="%Y-%m-%d %H:%M:%S",
    )


def run_osascript(lines: list[str]) -> str:
    command = ["osascript"]
    for line in lines:
        command.extend(["-e", line])

    proc = subprocess.run(command, text=True, capture_output=True, check=False)
    if proc.returncode != 0:
        stderr = proc.stderr.strip() or "Unknown AppleScript error."
        raise RuntimeError(stderr)
    return proc.stdout.strip()


def escape_applescript_string(value: str) -> str:
    return value.replace("\\", "\\\\").replace('"', '\\"')


def build_app_name_candidates(app_name_arg: str) -> list[str]:
    names = [name.strip() for name in app_name_arg.split(",") if name.strip()]
    for fallback in DEFAULT_APP_NAMES:
        if fallback not in names:
            names.append(fallback)
    return names


def read_teams_dock_badge(app_name: str) -> tuple[bool, str]:
    escaped_name = escape_applescript_string(app_name)
    applescript = [
        'tell application "System Events"',
        'if not (exists process "Dock") then return "__DOCK_NOT_FOUND__"',
        'tell process "Dock"',
        'if (count of lists) is 0 then return "__DOCK_EMPTY__"',
        "tell list 1",
        f'set matchingItems to (every UI element whose name contains "{escaped_name}")',
        'if (count of matchingItems) is 0 then return "__APP_NOT_FOUND__"',
        "set appIcon to item 1 of matchingItems",
        'set badgeText to ""',
        "try",
        'set badgeText to value of attribute "AXStatusLabel" of appIcon as text',
        "on error",
        'set badgeText to ""',
        "end try",
        "if badgeText is missing value then set badgeText to \"\"",
        'return "__FOUND__:" & badgeText',
        "end tell",
        "end tell",
        "end tell",
    ]
    output = run_osascript(applescript)
    if output.startswith("__FOUND__:"):
        return True, output[len("__FOUND__:") :]
    return False, ""


def read_teams_window_title(app_name: str) -> str:
    escaped_name = escape_applescript_string(app_name)
    applescript = [
        'tell application "System Events"',
        f'set matchingProcesses to (every process whose name contains "{escaped_name}")',
        "if (count of matchingProcesses) is 0 then return \"\"",
        "set targetProcess to item 1 of matchingProcesses",
        "tell targetProcess",
        'if (count of windows) is 0 then return ""',
        "return name of front window",
        "end tell",
        "end tell",
    ]
    return run_osascript(applescript)


def extract_unread_count_from_dock_badge(badge_text: str) -> int:
    cleaned = badge_text.strip()
    if not cleaned:
        return 0
    match = re.search(r"(\d+)", cleaned)
    if match:
        try:
            return int(match.group(1))
        except ValueError:
            return 0

    # Non-empty, non-numeric status label still means something unread.
    return 1


def extract_unread_count_from_window_title(window_title: str) -> int:
    if not window_title:
        return 0
    for pattern in WINDOW_TITLE_PATTERNS:
        match = pattern.search(window_title)
        if match:
            try:
                return int(match.group(1))
            except ValueError:
                continue
    return 0


def read_badge_sample(app_names: list[str]) -> BadgeSample | None:
    for app_name in app_names:
        found_in_dock, badge_text = read_teams_dock_badge(app_name)
        if found_in_dock:
            unread_count = extract_unread_count_from_dock_badge(badge_text)
            return BadgeSample(
                unread_count=unread_count,
                source="dock_badge",
                raw_value=badge_text,
                app_name=app_name,
            )

    for app_name in app_names:
        window_title = read_teams_window_title(app_name)
        if window_title:
            unread_count = extract_unread_count_from_window_title(window_title)
            return BadgeSample(
                unread_count=unread_count,
                source="window_title",
                raw_value=window_title,
                app_name=app_name,
            )

    return None


def play_alarm(repeat: int) -> None:
    for idx in range(max(1, repeat)):
        LOGGER.debug("Playing alarm beep %d.", idx + 1)
        print("\a", end="", flush=True)
        if platform.system() == "Darwin":
            subprocess.run(
                ["osascript", "-e", "beep 1"],
                check=False,
                capture_output=True,
                text=True,
            )
        time.sleep(0.2)


def check_supported_platform() -> None:
    if platform.system() != "Darwin":
        raise RuntimeError(
            "This script currently supports macOS only (uses AppleScript)."
        )


def monitor(args: argparse.Namespace) -> int:
    check_supported_platform()

    app_name_candidates = build_app_name_candidates(args.app_name)
    confirm_samples = max(1, args.confirm_samples)
    recent_samples: deque[int] = deque(maxlen=confirm_samples)
    stable_unread: int | None = None

    LOGGER.info(
        "Starting Teams badge monitor for app names: %s",
        ", ".join(app_name_candidates),
    )
    LOGGER.info(
        "Settings: interval=%.1fs, min_unread=%d, alarm_repeat=%d, "
        "confirm_samples=%d, dry_run=%s",
        args.interval,
        args.min_unread,
        args.alarm_repeat,
        confirm_samples,
        args.dry_run,
    )

    while True:
        try:
            sample = read_badge_sample(app_name_candidates)
        except RuntimeError as error:
            LOGGER.error(
                "Failed to read Teams badge. "
                "Check macOS Automation/Accessibility permissions. Error: %s",
                error,
            )
            return 1

        if sample is None:
            LOGGER.debug(
                "Teams app not detected in Dock or window list. Waiting for app..."
            )
            if args.once:
                LOGGER.info("No Teams process detected.")
                return 0
            time.sleep(max(0.2, args.interval))
            continue

        unread_count = sample.unread_count
        recent_samples.append(unread_count)
        LOGGER.debug(
            "Sample: source=%s app=%s raw=%r unread=%d",
            sample.source,
            sample.app_name,
            sample.raw_value or "<empty>",
            unread_count,
        )

        if args.once:
            LOGGER.info(
                "Unread count: %d (source=%s, app=%s).",
                unread_count,
                sample.source,
                sample.app_name,
            )
            return 0

        confirmed_unread: int | None = None
        if confirm_samples == 1:
            confirmed_unread = unread_count
        elif len(recent_samples) == confirm_samples and len(set(recent_samples)) == 1:
            confirmed_unread = recent_samples[-1]
        else:
            LOGGER.debug(
                "Waiting for %d matching samples before state change: %s",
                confirm_samples,
                list(recent_samples),
            )

        if confirmed_unread is not None:
            if stable_unread is None:
                stable_unread = confirmed_unread
                LOGGER.info("Initial unread count: %d", stable_unread)
            elif confirmed_unread > stable_unread and confirmed_unread >= args.min_unread:
                LOGGER.info(
                    "Unread count increased from %d to %d. Triggering alarm.",
                    stable_unread,
                    confirmed_unread,
                )
                if not args.dry_run:
                    play_alarm(args.alarm_repeat)
                stable_unread = confirmed_unread
            elif confirmed_unread < stable_unread:
                LOGGER.info(
                    "Unread count decreased from %d to %d. Alarm state reset.",
                    stable_unread,
                    confirmed_unread,
                )
                stable_unread = confirmed_unread
            else:
                LOGGER.debug("Unread count unchanged at %d.", stable_unread)

        time.sleep(max(0.2, args.interval))


def main() -> int:
    args = parse_args()
    configure_logging(debug=args.debug)

    try:
        return monitor(args)
    except KeyboardInterrupt:
        LOGGER.info("Stopped by user.")
        return 0
    except RuntimeError as error:
        LOGGER.error("%s", error)
        return 1


if __name__ == "__main__":
    sys.exit(main())
