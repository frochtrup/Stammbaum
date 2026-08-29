# legacy-v8 — eingefrorene v8-Codebasis (Referenz + Orakel)

Dies ist die vollständige **Version-8**-App (Vanilla-JS-PWA). Sie wird **nicht mehr weiterentwickelt**. Zweck im v9-Neuaufsatz:

1. **Verhaltens-Orakel** — der v9-Kern muss dieselben GEDCOM/GRAMPS-Roundtrip-Ergebnisse liefern (`net_delta=0`, `out1===out2`). Die hier liegenden Tests + Fixtures sind der Paritäts-Maßstab ([specs/v9/32-Testframework.md](../specs/v9/32-Testframework.md), [31 §7](../specs/v9/31-Dev-Umgebung.md)).
2. **Referenz** — bewährte Algorithmen (Identitätsauflösung, Anonymisierungs-BFS, Layout-Berechnungen, Datums-Normierung) zum Re-Implementieren.

## Orakel ausführen (headless, kein Nutzer nötig)

Aus diesem Verzeichnis:

```bash
osascript -l JavaScript test-unit.js                       # 884 Unit-Tests
osascript -l JavaScript test-roundtrip.js MeineDaten_ancestris.ged   # GEDCOM-Roundtrip
osascript -l JavaScript test-csp.js                        # CSP-Scan
```

Die großen `.ged`/`.gramps`-Fixtures sind **gitignoriert** (persönliche Daten) und liegen nur lokal in diesem Ordner.

## Nicht hier weiterbauen

v9-Arbeit findet ausschließlich im Repo-Root (`specs/`, später `core/`/`services/`/`ui/`) statt. `legacy-v8/` bleibt unangetastet — es ist der Vergleichsmaßstab, kein Baustellen-Bereich.
