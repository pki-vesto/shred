#!/usr/bin/env bash
# End-to-end test van de spraak-pipeline (whisper → Claude) met curl.
#
# Gebruik:
#   ./test-voice.sh                      # alleen health + uitleg
#   ./test-voice.sh opname.m4a           # stuur een opname (maaltijd = lunch)
#   ./test-voice.sh opname.m4a ontbijt   # met maaltijd-context
#
# Overrides:  BASE=https://shred.frodo.local ./test-voice.sh opname.m4a
# Audio mag webm/mp4/m4a/wav/ogg zijn (whisper/ffmpeg decodeert op inhoud).
set -euo pipefail
cd "$(dirname "$0")/.."

BASE="${BASE:-https://localhost}"     # via Caddy; -k accepteert het interne cert
AUDIO="${1:-}"
MEAL="${2:-lunch}"
TOKEN="$(grep -E '^BEARER_TOKEN=' .env | cut -d= -f2- || true)"

if [ -z "${TOKEN}" ]; then echo "Geen BEARER_TOKEN in ~/shred/.env"; exit 1; fi

pp() { if command -v jq >/dev/null 2>&1; then jq .; else cat; fi; }

echo "== GET /api/health =="
curl -sk "${BASE}/api/health"; echo; echo

if [ -z "${AUDIO}" ]; then
  cat <<EOF
Geen audiobestand opgegeven.
  Gebruik: $0 opname.m4a [maaltijd]
  Neem een korte Nederlandse clip op, bv.:
  "honderdvijftig gram kip met rijst en broccoli"
EOF
  exit 0
fi
[ -f "${AUDIO}" ] || { echo "Bestand niet gevonden: ${AUDIO}"; exit 1; }

# Kleine voorbeeldbibliotheek (id, naam, macro's per 100 g). In de echte app
# stuurt de client de volledige bibliotheek mee.
LIB='[
  {"id":"seed:kipfilet","name":"Kipfilet (gegrild)","kcalPer100g":165,"pPer100g":31,"cPer100g":0,"fPer100g":3.6},
  {"id":"seed:witte-rijst","name":"Witte rijst (gekookt)","kcalPer100g":130,"pPer100g":2.7,"cPer100g":28,"fPer100g":0.3},
  {"id":"seed:broccoli","name":"Broccoli","kcalPer100g":34,"pPer100g":2.8,"cPer100g":7,"fPer100g":0.4}
]'

echo "== POST /api/meals/voice  (meal=${MEAL}, file=${AUDIO}) =="
curl -sk -X POST "${BASE}/api/meals/voice" \
  -H "Authorization: Bearer ${TOKEN}" \
  -F "audio=@${AUDIO}" \
  -F "meal=${MEAL}" \
  -F "dayN=1" \
  -F "library=${LIB}" | pp
echo
