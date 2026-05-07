"""
Phase 1 — Network discovery.

Two complementary techniques:
  1. arp-scan / nmap -sn   →  who is on the LAN?
  2. nmap -O --osscan-guess →  rough OS fingerprint
"""

import re
import subprocess
from typing import Optional

from .utils import COLORS, info, ok, warn, err, _run, get_iface_ip


# Vendors that almost always indicate Android phones / mobiles
MOBILE_VENDORS = (
    "samsung", "xiaomi", "huawei", "motorola", "lg ", "lge ",
    "oneplus", "oppo", "vivo", "nokia", "asustek (mobile)",
    "google, inc.", "google llc", "tcl ", "realme", "sony mobile",
    "zte", "lenovo", "honor",
)


def _parse_arp_scan(output: str) -> list[dict]:
    hosts = []
    for line in output.splitlines():
        # "192.168.1.42  aa:bb:cc:dd:ee:ff  Samsung Electronics Co.,Ltd"
        m = re.match(r"^(\d+\.\d+\.\d+\.\d+)\s+([0-9a-f:]{17})\s+(.*)$", line.strip(), re.I)
        if m:
            hosts.append({
                "ip":     m.group(1),
                "mac":    m.group(2).lower(),
                "vendor": m.group(3).strip() or "(unknown)",
                "hostname": "",
                "os": "",
                "ports": [],
            })
    return hosts


def _arp_scan(iface: str, subnet: str) -> list[dict]:
    info(f"Running arp-scan on {subnet} via {iface} ...")
    try:
        out = subprocess.run(
            ["arp-scan", "--interface", iface, subnet, "--retry=2", "--timeout=500"],
            capture_output=True, text=True, check=False, timeout=60,
        ).stdout
    except FileNotFoundError:
        warn("arp-scan not available, falling back to `nmap -sn`.")
        return []
    except subprocess.TimeoutExpired:
        warn("arp-scan timed out.")
        return []
    return _parse_arp_scan(out)


def _nmap_ping_sweep(subnet: str) -> list[dict]:
    info(f"Running `nmap -sn` on {subnet} ...")
    out = _run(["nmap", "-sn", "-PR", "-n", subnet])
    hosts = []
    cur = None
    for line in out.splitlines():
        if line.startswith("Nmap scan report for "):
            ip = line.replace("Nmap scan report for ", "").strip()
            cur = {"ip": ip, "mac": "", "vendor": "(unknown)", "hostname": "", "os": "", "ports": []}
            hosts.append(cur)
        elif line.startswith("MAC Address:") and cur is not None:
            # "MAC Address: AA:BB:CC:DD:EE:FF (Samsung Electronics)"
            m = re.match(r"MAC Address:\s+([0-9A-F:]{17})\s*\((.*)\)", line)
            if m:
                cur["mac"] = m.group(1).lower()
                cur["vendor"] = m.group(2).strip()
    return hosts


def _enrich_with_hostnames(hosts: list[dict]) -> None:
    """Try a quick reverse / netbios resolution. Best-effort; no internet needed."""
    for h in hosts:
        if h.get("hostname"):
            continue
        try:
            out = _run(["nmblookup", "-A", h["ip"]])
            m = re.search(r"\s*(\S+)\s+<00>\s+-\s+B\s+<ACTIVE>", out)
            if m:
                h["hostname"] = m.group(1)
        except FileNotFoundError:
            pass


def _detect_gateway(iface: str, subnet: str, hosts: list[dict]) -> Optional[str]:
    """Default gateway = the .1 of the subnet on cheap home routers, or `ip route`."""
    out = _run(["ip", "route", "show", "default", "dev", iface])
    for line in out.splitlines():
        parts = line.split()
        if "via" in parts:
            return parts[parts.index("via") + 1]
    # Offline lab: guess `<subnet>.1`
    network = subnet.rsplit(".", 1)[0]
    candidate = f"{network}.1"
    for h in hosts:
        if h["ip"] == candidate:
            return candidate
    return candidate  # Most routers do live at .1 anyway


def pick_android_target(hosts: list[dict]) -> Optional[dict]:
    """Return the most likely Android device, or None."""
    candidates = []
    for h in hosts:
        v = h.get("vendor", "").lower()
        if any(name in v for name in MOBILE_VENDORS):
            candidates.append(h)
    if not candidates:
        return None
    # Prefer the one with the highest IP (DHCP usually hands phones higher numbers)
    candidates.sort(key=lambda h: list(map(int, h["ip"].split("."))))
    return candidates[-1]


def manual_pick(hosts: list[dict]) -> Optional[dict]:
    if not hosts:
        return None
    print(f"\n{COLORS['info']}Pick a target by index:{COLORS['end']}")
    for i, h in enumerate(hosts):
        print(f"  [{i}] {h['ip']:15s}  {h['mac'] or '??:??:??:??:??:??'}  {h.get('vendor','')}")
    try:
        idx = int(input("    > ").strip())
        return hosts[idx]
    except (ValueError, IndexError):
        warn("Invalid pick.")
        return None


def _print_table(hosts: list[dict], gateway: Optional[str], android: Optional[dict]) -> None:
    print()
    print(f"{COLORS['bold']}{'IP':16s}{'MAC':19s}{'Vendor':28s}{'Notes'}{COLORS['end']}")
    print("-" * 78)
    for h in hosts:
        notes = []
        if gateway and h["ip"] == gateway:
            notes.append("🌐 GATEWAY")
        if android and h["ip"] == android["ip"]:
            notes.append(f"📱 {COLORS['ok']}ANDROID TARGET{COLORS['end']}")
        v = (h.get("vendor") or "(unknown)")[:27]
        print(f"{h['ip']:16s}{(h.get('mac') or '?'):19s}{v:28s}{' '.join(notes)}")
    print()


def full_discovery(iface: str, subnet: str) -> tuple[list[dict], Optional[str]]:
    hosts = _arp_scan(iface, subnet)
    if not hosts:
        hosts = _nmap_ping_sweep(subnet)
    # Merge in our own IP so we know who "we" are
    my_ip = get_iface_ip(iface)
    if my_ip and not any(h["ip"] == my_ip for h in hosts):
        hosts.append({"ip": my_ip, "mac": "(self)", "vendor": "ATTACKER (you)",
                      "hostname": "", "os": "", "ports": []})

    _enrich_with_hostnames(hosts)
    hosts.sort(key=lambda h: list(map(int, h["ip"].split("."))))

    gateway = _detect_gateway(iface, subnet, hosts)
    android = pick_android_target(hosts)

    ok(f"Found {len(hosts)} host(s) on {subnet}")
    _print_table(hosts, gateway, android)

    return hosts, gateway
