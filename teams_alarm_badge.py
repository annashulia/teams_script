#!/usr/bin/env python3
import os
import signal
import subprocess
import sys
import time
import select
from datetime import datetime

# ==== Settings ====
ALARM_FILE = "/Users/anna/Desktop/T script/alarm.mp3"
POLL_SEC = 1.5            # requesting Dock time
COOLDOWN_SEC = 3          # debounce protection (sec)
APP_NAMES = ("Microsoft Teams", "Teams")  # App Name Dock

# ==== AppleScript для чтения бейджа у иконки Teams в Dock ====
AS_GET_BADGE = r'''
on run
  try
    tell application "System Events"
      if not (exists process "Dock") then return ""
      tell process "Dock"
        if not (exists list 1) then return ""
        set dockItems to UI elements of list 1 whose role description is "application dock item"
        repeat with di in dockItems
          try
            set nm to name of di
            if nm contains "Microsoft Teams" or nm contains "Teams" then
              try
                set badgeVal to value of attribute "AXStatusLabel" of di
                if badgeVal is missing value then return ""
                return badgeVal as text
              on error
                return ""
              end try
            end if
          end try
        end repeat
      end tell
    end tell
  on error
    return ""
  end try
end run
'''

def get_teams_badge_text() -> str:
    """Returns badge text (for example '1', '2' or '')."""
    try:
        out = subprocess.run(["osascript", "-e", AS_GET_BADGE],
                             capture_output=True, text=True, timeout=5)
        return out.stdout.strip()
    except Exception:
        return ""

def normalize_badge(btxt: str) -> int:
    """Converts badge text to number. Empty/dot -> 0."""
    if not btxt:
        return 0
    # on some systems badge can be a dot • instead of a number
    if "•" in btxt:
        return 1
    # use only leading digits
    num = ""
    for ch in btxt:
        if ch.isdigit():
            num += ch
        else:
            break
    return int(num) if num else 0

def start_alarm():
    """Loops mp3 via afplay. Returns subprocess.Popen."""
    code = f'''
while true; do
  /usr/bin/afplay "{ALARM_FILE}";
done
'''
    # separate process group to terminate loop cleanly
    return subprocess.Popen(["/bin/bash", "-c", code], preexec_fn=os.setsid)

def stop_alarm(p):
    try:
        os.killpg(os.getpgid(p.pid), signal.SIGTERM)
    except Exception:
        try:
            p.terminate()
        except Exception:
            pass

def kb_readline(timeout_sec: float):
    """Non-blocking stdin read with timeout."""
    r, _, _ = select.select([sys.stdin], [], [], timeout_sec)
    if r:
        return sys.stdin.readline().strip()
    return None

def main():
    if not os.path.exists(ALARM_FILE):
        print(f"[!] File not found: {ALARM_FILE}")
        return

    # initial baseline = current badge
    btxt = get_teams_badge_text()
    baseline = normalize_badge(btxt)
    print("[✓] TEAMS BADGE→ALARM: listening...")
    print("    Enter = stop alarm | r + Enter = reset baseline | q + Enter = quit")
    print(f"\n[i] Baseline badge: {baseline}")

    alarm_proc = None
    ringing = False
    last_change = 0.0

    try:
        while True:
            # --- keyboard ---
            cmd = kb_readline(0.0)
            if cmd is not None:
                if cmd.lower() == "q":
                    if alarm_proc:
                        stop_alarm(alarm_proc)
                    print("[x] Exit.")
                    return
                if cmd.lower() == "r":
                    # manual baseline resync
                    btxt = get_teams_badge_text()
                    baseline = normalize_badge(btxt)
                    print(f"[i] Reset baseline → {baseline}")
                if cmd == "" and ringing:
                    # Enter to stop alarm
                    stop_alarm(alarm_proc)
                    alarm_proc = None
                    ringing = False
                    print("[i] Alarm: stopped by user.")

            # --- Dock poll ---
            btxt = get_teams_badge_text()
            badge = normalize_badge(btxt)

            # trigger only when badge ascends relative to baseline
            if badge != baseline and (time.time() - last_change) > COOLDOWN_SEC:
                last_change = time.time()
                old_baseline = baseline
                baseline = badge

                if badge > old_baseline:
                    if not ringing:
                        print(f"[!] Badge ascended {old_baseline} → {badge} → ALARM!")
                        alarm_proc = start_alarm()
                        ringing = True
                else:
                    # descending or zero reset: never start alarm,
                    # and stop active ring automatically.
                    print(f"[i] Badge descended {old_baseline} → {badge}")
                    if ringing and alarm_proc:
                        stop_alarm(alarm_proc)
                        alarm_proc = None
                        ringing = False
                        print("[i] Alarm: stopped (badge descended).")

            time.sleep(POLL_SEC)

    except KeyboardInterrupt:
        if alarm_proc:
            stop_alarm(alarm_proc)
        print("\n[x] Exit.")

if __name__ == "__main__":
    main()
