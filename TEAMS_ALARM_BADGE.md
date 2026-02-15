# Teams Badge Alarm Script

This script watches the Microsoft Teams badge in the macOS Dock and plays an alarm sound when the badge **increases** (for example `0 -> 1`, `1 -> 2`).

It does **not** start the alarm when the badge decreases (for example `2 -> 1`).

## Files to share with your colleague

- `teams_alarm_badge.py`
- `alarm.mp3` (or any sound file, but update `ALARM_FILE` in the script if path/name changes)

## Requirements

- macOS
- Microsoft Teams installed
- `python3` available in terminal
- Accessibility permission enabled for the app running the script (Terminal/iTerm/PyCharm, etc.)
  - macOS: **System Settings -> Privacy & Security -> Accessibility**

## Configure

Open `teams_alarm_badge.py` and check:

- `ALARM_FILE` path
- `POLL_SEC` (poll interval)
- `COOLDOWN_SEC` (debounce)
- `APP_NAMES` (if Teams app name is different in Dock)

## Run

Use the same command format (quotes are required because folder has a space):

```bash
python3 "/Users/anna/Desktop/T script/teams_alarm_badge.py"
```

## Controls while running

- `Enter` -> stop current alarm
- `r` + `Enter` -> reset baseline badge to current value
- `q` + `Enter` -> quit script

## Notes

- Baseline starts from current badge value when script launches.
- Alarm triggers only on ascending badge changes.
- If alarm is already ringing and badge increases again, it keeps ringing (no duplicate alarm process).
