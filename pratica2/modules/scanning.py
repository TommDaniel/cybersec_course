"""
Phase 2 — Detailed scan of a single Android target.

Goal: show the class that even a "locked" phone exposes services.
Common Android services worth highlighting in class:
  - 5555/tcp  ADB (when developer mode + wireless debugging is on)
  - 8008/tcp  Chromecast / Google Cast
  - 1900/udp  SSDP / UPnP
  - 5353/udp  mDNS (announces hostname + services)
  - 62078/tcp (iOS — useful as a counter-example)
"""

import re
from .utils import COLORS, info, ok, warn, _run


INTERESTING_PORTS = "21,22,23,53,80,135,139,443,445,554,1900,5353,5555,8008,8080,8443,8888,9100,62078"


def scan_android(target_ip: str) -> dict:
    """
    Run a TCP service scan + light OS detection. Saves output for the report.
    """
    info(f"Scanning {target_ip} (TCP service detection)...")
    cmd = [
        "nmap", "-sS", "-sV", "-Pn",
        "-p", INTERESTING_PORTS,
        "--osscan-guess", "--max-os-tries", "1",
        "-O",
        "-T4",
        target_ip,
    ]
    out = _run(cmd)

    result = {
        "target":        target_ip,
        "raw":           out,
        "open_ports":    [],
        "os_guess":      "",
        "device_type":   "",
    }

    in_ports = False
    for line in out.splitlines():
        s = line.strip()
        if s.startswith("PORT") and "STATE" in s:
            in_ports = True
            continue
        if in_ports:
            if not s or s.startswith("MAC Address") or s.startswith("Device type") \
               or s.startswith("Running") or s.startswith("OS ") or s.startswith("Aggressive"):
                in_ports = False
                continue
            # "5555/tcp open  adb              Android Debug Bridge"
            m = re.match(r"^(\d+/\w+)\s+(\S+)\s+(\S+)(?:\s+(.*))?$", s)
            if m:
                result["open_ports"].append({
                    "port":    m.group(1),
                    "state":   m.group(2),
                    "service": m.group(3),
                    "version": (m.group(4) or "").strip(),
                })

        if s.startswith("Device type:"):
            result["device_type"] = s.split(":", 1)[1].strip()
        if s.startswith("OS details:") or s.startswith("Aggressive OS guesses:"):
            result["os_guess"] = s.split(":", 1)[1].strip()
        elif s.startswith("Running:") and not result["os_guess"]:
            result["os_guess"] = s.split(":", 1)[1].strip()

    # Pretty print
    print()
    print(f"{COLORS['bold']}Open ports on {target_ip}:{COLORS['end']}")
    if not result["open_ports"]:
        warn("No open ports detected. The phone may be locked, or filtering aggressively.")
        warn("That's already a useful lesson: 'closed' doesn't mean 'invisible'.")
    else:
        print(f"{COLORS['bold']}{'PORT':12s}{'STATE':8s}{'SERVICE':18s}VERSION{COLORS['end']}")
        print("-" * 70)
        for p in result["open_ports"]:
            highlight = COLORS["warn"] if p["service"].lower() in ("adb", "upnp", "ssdp") else ""
            end = COLORS["end"] if highlight else ""
            print(f"{highlight}{p['port']:12s}{p['state']:8s}{p['service']:18s}{p['version']}{end}")

    if result["device_type"]:
        ok(f"Device type: {result['device_type']}")
    if result["os_guess"]:
        ok(f"OS guess   : {result['os_guess']}")

    print(f"\n{COLORS['info']}What this means in class:{COLORS['end']}")
    print("  • Each open port is a 'door' the attacker can knock on.")
    print("  • Service banners often reveal exact phone model & Android version.")
    print("  • mDNS / SSDP often leak the user's REAL NAME ('John's Galaxy').")
    return result
