#!/usr/bin/env bash
# Auth-boundary smoke check (#179).
#
# Shred heeft GEEN applicatie-auth. De enige beveiligingslaag is Tailscale
# (WireGuard + ACL). Deze check borgt de Docker-poortgrens die daarbij hoort:
# alleen de statische app (nginx, :8088 fallback) en Caddy (:80) mogen een
# host-poort hebben. De API en Whisper mogen NOOIT direct op een host-poort
# luisteren — ze zijn alleen bereikbaar via het interne docker-net / Caddy.
#
#   bash api/check-auth-boundary.sh        # exit 0 = grens intact, 1 = lek
set -u
fail=0

check_no_port () {
  local name="$1"
  local ports
  ports="$(docker port "$name" 2>/dev/null)"
  if [ -n "$ports" ]; then
    echo "FAIL  $name heeft een host-poort: $ports"
    fail=1
  else
    echo "OK    $name: geen host-poort (alleen intern bereikbaar)"
  fi
}

echo "== API/Whisper mogen niet direct op een host-poort luisteren =="
check_no_port shred-api
check_no_port shred-whisper

echo
echo "== Verwachte ingress (host-poorten) =="
docker port shred-caddy 2>/dev/null | sed 's/^/  caddy: /' || echo "  (shred-caddy niet gevonden)"
docker port shred       2>/dev/null | sed 's/^/  nginx: /' || true

echo
echo "Let op: dit borgt alleen de Docker-poortgrens. De échte vertrouwensgrens"
echo "is Tailscale. Open frodo NOOIT op LAN/internet (geen Funnel, geen"
echo "port-forward op 80/443) en verbreed de tailnet-ACL niet naar untrusted"
echo "devices — dat zou alle data onge-authenticeerd blootleggen."
exit $fail
