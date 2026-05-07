"""
Phase 5 — Markdown report generator.

Produces a single Android_PublicWiFi_Demo_Report_<date>.md inside ./reports/
with sections geared toward 16-year-old IT students:
  • Executive summary
  • Devices discovered
  • Attack vectors (what we did)
  • What the attacker could see / do (and what would be possible WITH internet)
  • Screenshot guide
  • Security recommendations
"""

import os
from datetime import datetime
from .utils import COLORS, info, ok


HERE = os.path.dirname(os.path.abspath(__file__))
PROJECT_ROOT = os.path.abspath(os.path.join(HERE, ".."))
REPORTS_DIR = os.path.join(PROJECT_ROOT, "reports")


def _table(rows, headers):
    if not rows:
        return "_(none)_\n"
    out = ["| " + " | ".join(headers) + " |",
           "|" + "|".join(["---"] * len(headers)) + "|"]
    for r in rows:
        out.append("| " + " | ".join(str(c) for c in r) + " |")
    return "\n".join(out) + "\n"


def generate(session: dict) -> str:
    os.makedirs(REPORTS_DIR, exist_ok=True)
    date_tag = datetime.now().strftime("%Y-%m-%d_%H%M")
    path = os.path.join(REPORTS_DIR, f"Android_PublicWiFi_Demo_Report_{date_tag}.md")

    hosts   = session.get("discovered_hosts") or []
    android = session.get("android_target") or {}
    scan    = session.get("scan_results") or {}
    mitm_l  = session.get("mitm_log") or []
    dns_l   = session.get("dns_spoof_log") or []
    fake_l  = session.get("fake_server_log") or []
    phases  = session.get("phases_run") or []

    # Build the device table
    device_rows = []
    gateway = session.get("gateway")
    for h in hosts:
        notes = []
        if gateway and h["ip"] == gateway:
            notes.append("🌐 Gateway")
        if android and h["ip"] == android.get("ip"):
            notes.append("📱 **TARGET**")
        if h.get("vendor", "").startswith("ATTACKER"):
            notes.append("🦹 Attacker (us)")
        device_rows.append([
            h["ip"],
            h.get("mac") or "?",
            h.get("vendor") or "(unknown)",
            h.get("hostname") or "—",
            " ".join(notes) or "—",
        ])

    # Open ports table
    port_rows = []
    for p in scan.get("open_ports", []):
        port_rows.append([p["port"], p["state"], p["service"], p.get("version") or "—"])

    md = f"""# 📡 Public WiFi Attack Demo — Android Report

> **Lab:** isolated classroom router, no internet uplink
> **Generated:** {datetime.now().strftime("%Y-%m-%d %H:%M:%S")}
> **Operator interface:** `{session.get('interface')}` &nbsp;•&nbsp; **Subnet:** `{session.get('subnet')}`
> **Phases executed:** {", ".join(phases) if phases else "_none_"}

---

## ⚠️ Disclaimer

This report documents an **authorized, educational** demonstration carried out
in a closed lab. Reproducing any of these steps against networks or devices
you do not own — or do not have **explicit written permission** to test — is
**illegal** under Brazilian law (Lei 12.737/2012, Marco Civil da Internet) and
in most other countries.

---

## 🧠 Executive Summary

In **{len(hosts)}** seconds of scanning we mapped the entire local network,
identified an **Android phone** on it, and demonstrated three classes of
attacks that any attacker on the same Wi-Fi could perform:

1. **🔍 Network reconnaissance** — invisible to the victim, finds every
   device, its manufacturer and OS.
2. **🕵️ Man-in-the-Middle (ARP spoofing)** — silently routes the victim's
   traffic through the attacker's laptop.
3. **🎭 DNS spoofing + fake login page** — the victim opens `google.com` and
   lands on a perfect-looking page hosted by us. Any password they type
   is captured in plaintext.

**The most uncomfortable lesson:** all of this works *without* internet.
On a real public Wi-Fi the same techniques expose Instagram, banking apps,
WhatsApp Web sessions and personal email.

---

## 📋 Devices Discovered

Target subnet: `{session.get('subnet')}`  •  Gateway: `{session.get('gateway') or '—'}`

{_table(device_rows, ["IP", "MAC", "Vendor", "Hostname", "Role"])}

📱 **Android target selected:** `{android.get('ip', '—')}` &nbsp;•&nbsp;
vendor: *{android.get('vendor', '—')}* &nbsp;•&nbsp;
hostname: *{android.get('hostname') or '—'}*

---

## 🎯 Detailed Scan of the Android

Target: `{scan.get('target', '—')}`
Device type: *{scan.get('device_type') or '—'}*
OS guess: *{scan.get('os_guess') or '—'}*

### Open ports / services

{_table(port_rows, ["Port", "State", "Service", "Version"])}

> 💡 Even a fully-locked phone usually leaks **mDNS** (port 5353) and
> **SSDP** (port 1900). Those services often broadcast the *real name*
> of the user (e.g. `Lucas's Galaxy A54`) — without ever being asked.

---

## 🕵️ Attack Vectors Demonstrated

### 1. ARP Spoofing (Man-in-the-Middle)

We poisoned the ARP caches of the victim and the gateway, so every packet
going **from** the phone **to** the router (and back) flowed through this
laptop first. Selected events captured live:

```
{chr(10).join(mitm_l[-30:]) if mitm_l else '(no MITM phase was run)'}
```

> **What this means:** while the spoof is active the attacker sees
> *every URL the victim visits*, *every DNS lookup*, *every plaintext
> HTTP request*, and (with internet) could strip TLS on apps that don't
> pin certificates.

### 2. DNS Spoofing

When the phone asked "what is the IP of `google.com`?", we replied first
— with **our IP**. The kernel ARP-poisoning made sure the question
reached us before the real router could answer.

```
{chr(10).join(dns_l[-30:]) if dns_l else '(no DNS-spoof phase was run)'}
```

### 3. Fake Login Page

Once DNS pointed `google.com` at us, the phone's browser loaded our
locally-hosted clone. Anything the victim typed was captured in plain
text on the attacker laptop:

```
{chr(10).join(fake_l[-30:]) if fake_l else '(no fake-page phase was run)'}
```

📂 Captures are saved as JSONL files in `./captures/`.

---

## 👀 What the Attacker Could See / Do

Even on a closed lab network with **no internet**, we already saw:

- ✅ Every device on the network and its manufacturer
- ✅ The Android phone's open ports / running services
- ✅ Every DNS query the phone made
- ✅ Every URL the phone tried to open
- ✅ Plaintext form data submitted to fake pages

If the network *had* internet (a real coffee-shop Wi-Fi), the same setup
would also enable:

- 🚨 Hijacking unencrypted login forms
- 🚨 SSL-stripping on apps with weak TLS pinning
- 🚨 Cookie / session theft for sites without `Secure`+`HttpOnly`
- 🚨 Pushing fake update prompts to install malware
- 🚨 Real-time phishing of the victim's *own* social accounts

---

## 📸 Screenshots Guide (for the live demo write-up)

When teaching with this script, capture and add these screenshots to
the report manually (drop them under `./reports/screenshots/` and link):

1. **`01-discovery.png`** — terminal showing the device table with the
   Android highlighted.
2. **`02-android-scan.png`** — `nmap` output with the open ports.
3. **`03-arp-before.png`** — phone's `arp -a` (or a router-side capture)
   *before* the attack: gateway has its real MAC.
4. **`04-arp-after.png`** — same view *during* the attack: gateway's
   MAC is now the attacker's MAC.
5. **`05-live-dns.png`** — terminal scrolling DNS queries from the
   victim in real time.
6. **`06-fake-page-phone.png`** — phone screenshot of the fake Google /
   Instagram login.
7. **`07-credentials-captured.png`** — terminal showing the captured
   credentials banner.

---

## 🛡️ Security Recommendations (for the students)

For the **users**:

1. **Treat any open Wi-Fi as hostile** — assume someone is in the middle.
2. **Use a VPN** when you must connect to public Wi-Fi (it tunnels every
   packet inside encryption that ARP/DNS spoofing can't break).
3. **Look for the padlock + the right domain** — a fake page can look
   identical, but an attacker rarely controls the real cert *and* the
   real domain at the same time.
4. **Disable auto-connect** to known SSID names like "Free WiFi",
   "Aeroporto", "Starbucks". A fake AP can wear those names too.
5. **Forget networks** you no longer use, so your phone stops shouting
   their names at airports and cafés.
6. **Turn off Wi-Fi when you don't need it.** A phone with Wi-Fi off
   can't be tricked.
7. **Keep your phone updated.** Most ARP / DNS protections live in the
   OS — old Androids are easier to exploit.

For **developers / IT students** building apps:

1. **HTTPS everywhere.** No exceptions.
2. **HSTS preload** so even the very first connection refuses HTTP.
3. **Certificate pinning** in mobile apps to defeat SSL-stripping.
4. **Cookies must be `Secure` + `HttpOnly` + `SameSite=Strict`**.
5. **Never trust the network.** Validate everything server-side.

---

## 🧪 Reproducing this report

```bash
sudo python3 wifi_demo.py --interface wlan0
```

Then run phases 1 → 5 from the menu, or just:

```bash
sudo python3 wifi_demo.py --all
```

Reports land in `./reports/`, captured creds in `./captures/`.

---

*This report was generated automatically by `wifi_demo.py`.*
*Stay curious. Stay ethical. 🛡️*
"""

    with open(path, "w") as f:
        f.write(md)
    return path
