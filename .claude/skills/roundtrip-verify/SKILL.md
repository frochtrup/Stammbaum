---
name: roundtrip-verify
description: Führe den GEDCOM/GRAMPS-Roundtrip-Test auf einer Fixture aus (out1===out2, net_delta=0), headless und ohne Nutzer. Nutze diesen Skill nach jeder Parser-/Writer-Änderung oder wenn die Roundtrip-Treue (LP-1) verifiziert werden soll — Trigger wie „roundtrip prüfen", „net_delta", „ist der Roundtrip stabil", „check nach Parser-Änderung". Das ist das Kernversprechen — Reflex-Check nach Interop-Änderungen.
---

# roundtrip-verify

Verifiziert das Kernversprechen (LP-1): Parse → Write → Parse ist stabil (`out1===out2`, `net_delta=0`). Läuft headless per Bash, **kein Nutzer nötig**.

## Ausführung

**v8-Stand (aktuelles Repo):**
```
osascript -l JavaScript test-roundtrip.js <fixture>
```
- Flags: `--apply` (Schreib-Simulation), `--update` (Goldfile aktualisieren — nur bei bewusster Änderung).
- Deckt GEDCOM **und** GRAMPS ab (dep-freier Mini-DOMParser + `_gramps*XMLText`-Seams).

**v9-Stand (nach Migration ins v9-Repo):**
```
npm run test:round      # bzw. vitest auf die Roundtrip-Suite
```

## Standard-Fixtures

| Fixture | Format |
|---|---|
| `MeineDaten_ancestris.ged` (2811 Pers., 83k Z.) | GEDCOM, Ancestris |
| `Unsere Familie.gramps` (2894 Pers.) | GRAMPS |
| `scale-test-20000.ged` | Skalierung |

## Bewertung

- `net_delta` melden; bei **0** + `out1===out2` → stabil.
- Bei ≠0: den Delta/Diff sichtbar machen und die Ursache im Parser/Writer suchen — **nicht** durch Goldfile-Update übertünchen.
- Bei modellierten neuen `_`-Tags auf Doppelschreibung achten (`_REPO_MODELLED`-Lehre: Parser muss den Tag aus dem Passthrough herauslösen).

## Wann

Reflexartig nach jeder Änderung an Parser/Writer/Serializer oder am Passthrough. Roundtrip ist bewusst außerhalb des schnellen Pre-Commit-Hooks — dieser Skill macht die manuelle Prüfung ein-Kommando-leicht.
