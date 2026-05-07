#!/usr/bin/env bash
# ============================================================================
#  Public WiFi Attack Demo — installer for Pop!_OS / Ubuntu / Debian
#
#  This script installs all the system tools and Python deps the demo needs.
#  It is intended to run on the *attacker* laptop in the isolated lab.
# ============================================================================
set -euo pipefail

if [[ $EUID -ne 0 ]]; then
  echo "This installer must be run as root (apt + pip):"
  echo "    sudo bash install.sh"
  exit 1
fi

echo "[*] Updating apt index ..."
apt-get update -y

echo "[*] Installing system tools ..."
apt-get install -y \
  python3 python3-pip python3-venv \
  nmap arp-scan \
  iproute2 iputils-ping net-tools \
  tcpdump \
  samba-common-bin \
  bettercap         # OPTIONAL but recommended for the nicer TUI

echo "[*] Installing Python deps ..."
pip3 install --break-system-packages -r "$(dirname "$0")/requirements.txt" \
  || pip3 install -r "$(dirname "$0")/requirements.txt"

echo
echo "[+] Done. Run the demo with:"
echo "      sudo python3 wifi_demo.py"
echo
echo "[!] Reminder: this is for AUTHORIZED lab use ONLY."
