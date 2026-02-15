#!/usr/bin/env python3
"""
Monitor Microsoft Teams unread badge count and trigger an alarm.

This script targets macOS and reads the Teams window title via AppleScript.
If your Teams title contains unread numbers (for example "(3) Activity"),
the script detects the count and alerts when the count increases.
"""

from __future__ import annotations

import argparse
import logging
import platform
import re
import subprocess
import sys
import time

LOGGER = logging.getLogger("teams_alarm_badge")

WINDOW_TITLE_PATTERNS = (
    re.compile(r"\((\d+)\)"),
    re.compile(r"\[(\d+)\]"),
    re.compile(r"\b(\d+)\b"),
)


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Monitor Teams unread badge count and play an alarm."
    )
    parser.add_argument(
        "--app-name",
        default="Microsoft Teams",
        help='macOS process name (default: "Microsoft Teams").',
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


def read_teams_window_title(app_name: str) -> str:
    applescript = [
        'tell application "System Events"',
        f'if not (exists process "{app_name}") then return ""',
        f'tell process "{app_name}"',
        "if (count of windows) is 0 then return \"\"",
        "return name of front window",
        "end tell",
        "end tell",
    ]
    return run_osascript(applescript)


def extract_unread_count(window_title: str) -> int:
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
    previous_unread: int | None = None

    LOGGER.info('Starting Teams badge monitor for process "%s".', args.app_name)
    LOGGER.info(
        "Settings: interval=%.1fs, min_unread=%d, alarm_repeat=%d, dry_run=%s",
        args.interval,
        args.min_unread,
        args.alarm_repeat,
        args.dry_run,
    )

    while True:
        try:
            window_title = read_teams_window_title(args.app_name)
        except RuntimeError as error:
            LOGGER.error(
                "Failed to read Teams window title. "
                "Check macOS Automation permissions for Terminal/Python. Error: %s",
                error,
            )
            return 1

        unread_count = extract_unread_count(window_title)

        LOGGER.debug("Current Teams window title: %r", window_title or "<empty>")
        LOGGER.debug("Detected unread count: %d", unread_count)

        if previous_unread is None:
            LOGGER.info("Initial unread count: %d", unread_count)
            previous_unread = unread_count
        else:
            if unread_count > previous_unread and unread_count >= args.min_unread:
                LOGGER.info(
                    "Unread count increased from %d to %d. Triggering alarm.",
                    previous_unread,
                    unread_count,
                )
                if not args.dry_run:
                    play_alarm(args.alarm_repeat)
            elif unread_count < previous_unread:
                LOGGER.info(
                    "Unread count decreased from %d to %d.",
                    previous_unread,
                    unread_count,
                )
            previous_unread = unread_count

        if args.once:
            return 0

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
