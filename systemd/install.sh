#!/usr/bin/env bash
# Install the host-side mDNS alias publisher so iPhone/Mac can reach
# http://shred.frodo.local on the LAN. One-time setup; requires sudo.
#
# Usage: sudo bash ~/shred/systemd/install.sh
set -euo pipefail

UNIT_SRC="$(cd "$(dirname "$0")" && pwd)/shred-mdns-alias.service"
UNIT_DST=/etc/systemd/system/shred-mdns-alias.service

if [[ $EUID -ne 0 ]]; then
  echo "Run with sudo: sudo bash $0" >&2
  exit 1
fi

apt-get update -qq
apt-get install -y --no-install-recommends avahi-utils

install -m 0644 "$UNIT_SRC" "$UNIT_DST"
systemctl daemon-reload
systemctl enable --now shred-mdns-alias.service

echo
echo "Done. Checking:"
systemctl --no-pager --full status shred-mdns-alias.service | head -10
echo
echo "Test from another host on the LAN:"
echo "  getent hosts shred.frodo.local"
echo "  curl http://shred.frodo.local"
