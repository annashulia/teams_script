#!/usr/bin/env python3
import os
import select
import signal
import subprocess
import sys
import time
from datetime import datetime
from typing import Optional, Sequence

# ==== Settings ====
ALARM_FILE = "/Users/anna/Desktop/T script/alarm.mp3"
POLL_SEC = 1.5  # Dock polling interval
COOLDOWN_SEC = 3  # Debounce for badge changes
APP_NAMES: Sequence[str] = ("Microsoft Teams", "Teams")  # Teams app names in Dock
DEBUG = True


def log(message: str) -> None:
    if DEBUG:
        stamp = datetime.now().strftime("%H:%M:%S")
        print(f"[{stamp}] {message}")


def build_badge_applescript(app_names: Sequence[str]) -> str:
    escaped_names = [name.replace('"', '\\"') for name in app_names if name.strip()]
    if not escaped_names:
        escaped_names = ["Teams"]
    name_checks = " or ".join(f'nm contains "{name}"' for name in escaped_names)

    return f"""
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
            if {name_checks} then
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
""".strip()


AS_GET_BADGE = build_badge_applescript(APP_NAMES)


def get_teams_badge_text() -> str:
    """Return badge text from Dock (e.g., '1', '2', or '')."""
    try:
        out = subprocess.run(
            ["osascript", "-e", AS_GET_BADGE],
            capture_output=True,
            text=True,
            timeout=5,
            check=False,
        )
        return out.stdout.strip()
    except Exception:
        return ""


def normalize_badge(badge_text: str) -> int:
    """Convert badge text to int. Empty/bullet values are treated as notifications."""
    if not badge_text:
        return 0
    if "•" in badge_text:
        return 1

    num = ""
    for ch in badge_text:
        if ch.isdigit():
            num += ch
        else:
            break
    return int(num) if num else 0


def start_alarm() -> subprocess.Popen:
    """Loop ALARM_FILE forever with afplay."""
    code = f"""
while true; do
  /usr/bin/afplay "{ALARM_FILE}";
done
"""
    # Start separate process group so we can terminate the full loop reliably.
    return subprocess.Popen(["/bin/bash", "-c", code], preexec_fn=os.setsid)


def stop_alarm(proc: Optional[subprocess.Popen]) -> None:
    if not proc:
        return
    try:
        os.killpg(os.getpgid(proc.pid), signal.SIGTERM)
    except Exception:
        try:
            proc.terminate()
        except Exception:
            pass


def kb_readline(timeout_sec: float) -> Optional[str]:
    """Non-blocking stdin line read with timeout."""
    readable, _, _ = select.select([sys.stdin], [], [], timeout_sec)
    if readable:
        return sys.stdin.readline().strip()
    return None


def main() -> None:
    if not os.path.exists(ALARM_FILE):
        print(f"[!] Alarm file not found: {ALARM_FILE}")
        return

    badge_text = get_teams_badge_text()
    baseline = normalize_badge(badge_text)
    print("[✓] TEAMS BADGE -> ALARM: listening...")
    print("    Enter = stop alarm | r + Enter = reset baseline | q + Enter = quit")
    print(f"\n[i] Baseline badge: {baseline}")

    alarm_proc: Optional[subprocess.Popen] = None
    ringing = False
    last_change_ts = 0.0

    try:
        while True:
            # --- keyboard ---
            cmd = kb_readline(0.0)
            if cmd is not None:
                if cmd.lower() == "q":
                    stop_alarm(alarm_proc)
                    print("[x] Exit.")
                    return
                if cmd.lower() == "r":
                    badge_text = get_teams_badge_text()
                    baseline = normalize_badge(badge_text)
                    print(f"[i] Baseline reset -> {baseline}")
                if cmd == "" and ringing:
                    stop_alarm(alarm_proc)
                    alarm_proc = None
                    ringing = False
                    print("[i] Alarm: stopped by user.")

            if ringing and alarm_proc and alarm_proc.poll() is not None:
                ringing = False
                alarm_proc = None
                log("Alarm process ended.")

            # --- Dock poll ---
            badge_text = get_teams_badge_text()
            badge = normalize_badge(badge_text)

            if badge != baseline:
                now = time.time()
                if (now - last_change_ts) > COOLDOWN_SEC:
                    previous = baseline
                    baseline = badge
                    last_change_ts = now

                    if badge > previous:
                        if not ringing:
                            print(f"[!] Badge increased {previous} -> {badge}: ALARM!")
                            alarm_proc = start_alarm()
                            ringing = True
                        else:
                            log(f"Badge increased {previous} -> {badge}, alarm already ringing.")
                    else:
                        log(f"Badge changed {previous} -> {badge}, no alarm (not ascending).")

            time.sleep(POLL_SEC)

    except KeyboardInterrupt:
        stop_alarm(alarm_proc)
        print("\n[x] Exit.")


if __name__ == "__main__":
    main()
