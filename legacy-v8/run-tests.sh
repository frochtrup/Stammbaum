#!/bin/bash
# Stammbaum GEDCOM Roundtrip Test — Automatisierung
#
# Voraussetzung: Dev-Server läuft in AppDev/files/
#   python3 -m http.server 8080
#
# Verwendung:
#   ./run-tests.sh                          # nur demo.ged
#   ./run-tests.sh demo.ged                 # eine Datei
#   ./run-tests.sh demo.ged,test_ged.ged    # mehrere (kommagetrennt)
#
# Die Dateien müssen im selben Verzeichnis wie der Dev-Server liegen.

BASE="http://localhost:8080/test.html"
FILES="${1:-demo.ged}"

# Prüfen ob Dev-Server erreichbar
if ! curl -sf "http://localhost:8080/" > /dev/null 2>&1; then
  echo "Dev-Server nicht erreichbar."
  echo "Starten mit: python3 -m http.server 8080"
  echo "Verzeichnis: $(dirname "$0")"
  exit 1
fi

URL="${BASE}?files=${FILES}"
echo "Öffne: ${URL}"
open "$URL"
echo "--- CSP-Selbsttest ---"
osascript -l JavaScript test-csp.js
