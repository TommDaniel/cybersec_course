"""
Shared helpers: colored output, root check, tool availability, network helpers.
"""

import os
import sys
import shutil
import subprocess
import ipaddress
from typing import Optional


COLORS = {
    "ok":     "\033[92m",
    "info":   "\033[96m",
    "warn":   "\033[93m",
    "err":    "\033[91m",
    "banner": "\033[95m",
    "dim":    "\033[2m",
    "bold":   "\033[1m",
    "end":    "\033[0m",
}


BANNER = f"""{COLORS['banner']}
   ╔══════════════════════════════════════════════════════════════════╗
   ║                                                                  ║
   ║   ██████╗ ██╗   ██╗██████╗ ██╗     ██╗ ██████╗    ██╗    ██╗██╗  ║
   ║   ██╔══██╗██║   ██║██╔══██╗██║     ██║██╔════╝    ██║    ██║██║  ║
   ║   ██████╔╝██║   ██║██████╔╝██║     ██║██║         ██║ █╗ ██║██║  ║
   ║   ██╔═══╝ ██║   ██║██╔══██╗██║     ██║██║         ██║███╗██║██║  ║
   ║   ██║     ╚██████╔╝██████╔╝███████╗██║╚██████╗    ╚███╔███╔╝██║  ║
   ║   ╚═╝      ╚═════╝ ╚═════╝ ╚══════╝╚═╝ ╚═════╝     ╚══╝╚══╝ ╚═╝  ║
   ║                                                                  ║
   ║          📡 PUBLIC  WIFI  ATTACK  DEMO  —  ANDROID  EDITION 📱   ║
   ║                                                                  ║
   ║                  ⚠️  AUTHORIZED LAB USE ONLY  ⚠️                  ║
   ║      No internet uplink — fully offline classroom demo           ║
   ╚══════════════════════════════════════════════════════════════════╝
{COLORS['end']}"""


def info(msg: str) -> None:
    print(f"{COLORS['info']}[*]{COLORS['end']} {msg}")


def ok(msg: str) -> None:
    print(f"{COLORS['ok']}[+]{COLORS['end']} {msg}")


def warn(msg: str) -> None:
    print(f"{COLORS['warn']}[!]{COLORS['end']} {msg}")


def err(msg: str) -> None:
    print(f"{COLORS['err']}[-]{COLORS['end']} {msg}", file=sys.stderr)


def ask_confirm(prompt: str, default: bool = False) -> bool:
    """Always prompt before any dangerous action. Default is shown in caps."""
    suffix = "[Y/n]" if default else "[y/N]"
    ans = input(f"{COLORS['warn']}[?]{COLORS['end']} {prompt} {suffix} ").strip().lower()
    if not ans:
        return default
    return ans in ("y", "yes", "s", "sim")


def pause() -> None:
    input(f"\n{COLORS['dim']}Press <Enter> to return to the menu...{COLORS['end']}")


def require_root() -> None:
    if os.geteuid() != 0:
        err("This tool needs root (raw sockets, ARP, port 53/80).")
        err("Run: sudo python3 wifi_demo.py")
        sys.exit(1)


REQUIRED_TOOLS = {
    "nmap":      "sudo apt install nmap",
    "arp-scan":  "sudo apt install arp-scan",
    "ip":        "sudo apt install iproute2",
    # bettercap is OPTIONAL — we have a Scapy fallback
}
OPTIONAL_TOOLS = {
    "bettercap": "sudo apt install bettercap   # nicer MITM TUI (optional)",
}


def ensure_tools() -> None:
    missing = []
    for tool, hint in REQUIRED_TOOLS.items():
        if shutil.which(tool) is None:
            missing.append((tool, hint))
    if missing:
        err("Missing required tools:")
        for t, h in missing:
            err(f"   - {t}   →   {h}")
        sys.exit(1)
    # warn-only for optional
    for tool, hint in OPTIONAL_TOOLS.items():
        if shutil.which(tool) is None:
            warn(f"Optional tool not installed: {tool}   ({hint})")
    # scapy is checked at import time inside its module


# ----------------------------------------------------------------------------
# Network helpers
# ----------------------------------------------------------------------------
def _run(cmd: list[str]) -> str:
    return subprocess.run(cmd, capture_output=True, text=True, check=False).stdout


def get_default_iface() -> str:
    """
    Find the interface that has the default route.
    Falls back to the first wireless-looking interface.
    """
    out = _run(["ip", "route", "show", "default"])
    for line in out.splitlines():
        parts = line.split()
        if "dev" in parts:
            return parts[parts.index("dev") + 1]

    # No default route (offline lab). Take the first non-loopback wlan/eth.
    out = _run(["ip", "-o", "link", "show"])
    for line in out.splitlines():
        # "2: wlan0: <BROADCAST,...> ..."
        try:
            iface = line.split(":")[1].strip().split("@")[0]
        except IndexError:
            continue
        if iface == "lo":
            continue
        if iface.startswith(("wl", "wlan", "wlp", "en", "eth", "enp")):
            return iface

    err("Could not auto-detect a network interface.")
    sys.exit(1)


def get_iface_ip(iface: str) -> Optional[str]:
    out = _run(["ip", "-4", "-o", "addr", "show", "dev", iface])
    # "3: wlan0    inet 192.168.1.42/24 brd ..."
    for line in out.splitlines():
        if "inet " in line:
            return line.split("inet ")[1].split("/")[0].strip()
    return None


def get_subnet_for_iface(iface: str) -> str:
    """
    Return the CIDR subnet of the given interface, snapped to /24
    when the address falls in 192.168.0.0/24 or 192.168.1.0/24.
    """
    out = _run(["ip", "-4", "-o", "addr", "show", "dev", iface])
    for line in out.splitlines():
        if "inet " in line:
            cidr = line.split("inet ")[1].split()[0]
            net = ipaddress.ip_network(cidr, strict=False)
            # Prefer /24 for the kind of cheap router used in the lab
            if net.prefixlen < 24:
                ip = ipaddress.ip_interface(cidr).ip
                return f"{ip.exploded.rsplit('.', 1)[0]}.0/24"
            return str(net)

    # No IP on the interface — fall back to the lab's typical subnets
    warn(f"No IPv4 on {iface} — defaulting to 192.168.1.0/24")
    return "192.168.1.0/24"
