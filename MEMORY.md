# Stammbaum PWA — Projekt-Memory (KI-Kontext)

Kurzorientierung für Entwickler/KI beim Einstieg. **Keine Detail-Duplikate** — diese Datei verweist nur; die Wahrheit steht in den Spezialdocs (s. Doku-Landkarte).

## Projekt in einem Absatz
Genealogie-Editor als **PWA**, Vanilla JS, **kein Framework, kein npm, kein Build-Step** (bewusst, ADR-001/002 — „edit-anywhere ohne Toolchain"). Ziel: iPhone/iPad + Desktop, **GEDCOM 5.5.1/7.0 + GRAMPS** verlustfrei, kein Server, kein Tracking. ~52 JS-Dateien / ~38k Zeilen, alle Funktionen global (flacher Namespace).
Pfad: `/Users/franzdecker/Library/Mobile Documents/com~apple~CloudDocs/Genealogie/AppDev/files/`

## Doku-Landkarte (wer hält was)
| Datei | Inhalt |
|---|---|
| **README.md** | Einstieg, vollständige Dateiliste, Feature-Übersicht, Deployment |
| **ARCHITECTURE.md** | **25 ADRs** (alle Architektur-Entscheidungen), Passthrough-System (10 Mechanismen), Roundtrip-Verlauf, Speicher-/Backup-Architektur |
| **DATAMODEL.md** | Datenstrukturen (Person/Familie/Quelle/Archiv), JS-Sektionen, State, IDB-Keys |
| **GEDCOM.md** | Parser/Writer-Referenz, alle unterstützten Tags, `_`-Tag-Analyse |
| **UI-DESIGN.md** | HTML-Struktur, Navigationsmodell, CSS-Design-System, Baum-Layout-Algorithmen |
| **ROADMAP.md** | Offene Maßnahmen, Gesamtbewertung, Vergleich mit etablierten Tools |
| **CHANGELOG.md** | Vollständige Sprint-Geschichte v1.0–v8.0 (Quelle für „was wurde wann gemacht") |
| **PLACE-REDESIGN.md** · **VIEW-ROBUSTNESS.md** · **SCALE-TEST-BEFUNDE.md** | Technische Detail-Designs abgeschlossener Arbeitspakete (Referenz/Archiv) |

## Aktueller Stand
**v8.0 · Branch `v8-dev` · sw v899 / Cache `stammbaum-v899`.**
- `test-unit.js` = **420 Tests** grün · `test-csp.js` grün · GEDCOM-Roundtrip `net_delta=0` · GRAMPS stable. Verifiziert 2026-06-07.
- Gesamtbewertung ≈ **8.3/10** (unabhängiges Review 2026-06-07 → ROADMAP).
- Größte offene Hebel: **T0-FUNC-SPLIT** (Monsterfunktionen), **OUTPUT-RICHNESS** (PDF-Buch/Poster), **A11Y-AUDIT** (s. ROADMAP).

## Pflichtregeln bei Code-Änderungen (s. CLAUDE.md)
- `sw.js CACHE_NAME` + `ROADMAP.md` sw-Version bei jeder Code-Änderung hochzählen; reine Doku-Commits ohne Bump.
- Bewertungsrelevante Zahlen (Testanzahl, größte Funktion, Skalierung) → ROADMAP-Bewertungstabelle mitziehen (DOC-SYNC).
- Jede neue Datenstruktur: GEDCOM-Roundtrip `out1===out2`/`net_delta=0` stabil halten (Passthrough oder dokumentierte ADR-Abweichung).

## Test-Infrastruktur (dep-frei, kein npm, `node` nicht installiert → `osascript -l JavaScript`)
- `osascript -l JavaScript test-unit.js` — 420 Unit-Tests · `test-roundtrip.js [datei]` — GEDCOM+GRAMPS Roundtrip · `test-scale.js` — Performance · `generate-scale-test.js` — 20k-Synthetik.

## Wenige nicht-offensichtliche Fakten
- **Roundtrip-Deltas „by design":** GEDCOM +PEDI (wo `_FREL==_MREL`); GRAMPS weniger note/citation (Dedup per Text-/Tupel-Key, keine Datenverluste). Beide stabil über Re-Roundtrip.
- **`extraPlaces` ist seit v854 read-only** — `placeObjects` ist single source of truth (Migration via `_migrateExtraPlacesToPlaceObjects`). localStorage-Cleanup offen (T0-EXTRAPLACES-CLEANUP).
- **`ui-event-delegation.js` muss letztes `<script>`** in index.html sein.
- **Cmd+Z** = „Revert to Saved" bei leerem Undo-Stack (korrekt so).
