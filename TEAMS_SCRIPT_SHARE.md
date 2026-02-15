# Teams Alarm Badge Script: Share Guide

Use this guide to share `teams_alarm_badge.py` with your colleague and run it with English debug logs.

## 1) What to share

Send these two files:

1. `teams_alarm_badge.py`
2. `TEAMS_SCRIPT_SHARE.md` (this guide)

The easiest way is to put both files in one folder and zip it.

## 2) Requirements

- macOS (the script uses AppleScript)
- Python 3.9+ (`python3 --version`)
- Microsoft Teams desktop app installed and running

## 3) Run command (path with spaces)

If the script is on Desktop in a folder named `T script`, run:

```bash
python3 "/Users/anna/Desktop/T script/teams_alarm_badge.py"
```

To see debug output in English:

```bash
python3 "/Users/anna/Desktop/T script/teams_alarm_badge.py" --debug
```

## 4) Useful options

- `--once` : run one check and exit
- `--interval 3` : check every 3 seconds
- `--min-unread 2` : alert only if unread count is at least 2
- `--alarm-repeat 3` : play alarm 3 times
- `--confirm-samples 2` : require stable repeated badge reads before changing state
- `--dry-run` : log only, no sound

Example:

```bash
python3 "/Users/anna/Desktop/T script/teams_alarm_badge.py" --debug --interval 3 --min-unread 1
```

## 5) If your colleague gets permission errors

On macOS, allow Automation/Accessibility access for the terminal app used to run Python:

1. **System Settings** -> **Privacy & Security**
2. Open **Automation** and **Accessibility**
3. Enable access for Terminal (or iTerm) and Python if prompted

Then run the command again.

## 6) Notes on debug language

All debug and error log messages in this script are in English for easier sharing and troubleshooting.
