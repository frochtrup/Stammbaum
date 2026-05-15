# Roadmap

Sprint-Geschichte aller abgeschlossenen Versionen: `CHANGELOG.md`

---

## Aktueller Stand

| Version | Branch | Status |
|---|---|---|
| 4.0–7.0 | `main` | Abgeschlossen — Details: CHANGELOG.md |
| 8.0 | `v8-dev` | **Aktiv** |

**sw-Version:** v447 · Cache: `stammbaum-v447`
**Roundtrip GEDCOM:** stabil, net_delta=0, out1===out2 ✓
**Roundtrip GRAMPS:** 60034 Checks ✓ (2894 Pers.)
**Testdaten:** MeineDaten_ancestris.ged (2811 Pers.) · Unsere Familie.gramps (2894 Pers.)

---

## Design-Constraint

Alle neuen Features müssen den GEDCOM 5.5.1 Roundtrip (`out1===out2`, `net_delta=0`) stabil halten. Neue Datenstrukturen dürfen beim GEDCOM-Export keinen zusätzlichen Delta erzeugen — entweder als Passthrough oder als bekannte, dokumentierte Abweichung. Jede Abweichung muss explizit entschieden und in `ARCHITECTURE.md` (ADR) dokumentiert werden.

---

## P1 — Sicherheit & Stabilität (nächster Sprint)

Ergebnis eines Code-Audits (2026-05-15): konkrete Bugs und Sicherheitslücken im bestehenden Code, unabhängig von neuen Features.

| ID | Aufgabe | Details | Aufwand |
|---|---|---|---|
| ~~SEC-1~~ | ~~**XSS in onedrive.js**~~ | ~~Falschalarm: `esc()` wird korrekt verwendet~~ | — |
| ~~SEC-2~~ | ~~**Foto-Upload ohne MIME-Validierung**~~ | ~~Falschalarm: `am-cam-input` hat `accept="image/*"` + `createImageBitmap` wirft bei Nicht-Bild; JSON-Import prüft `startsWith('data:image/')`~~ | — |
| ~~ERR-1~~ | ~~**3 async-Funktionen ohne try-catch**~~ | ~~`revertToSaved` (storage.js), `exportGEDCOM` (storage-file.js), `odLogin` (onedrive-auth.js) — **erledigt sw v448**~~ | — |
| ~~PERF-1~~ | ~~**Kein Debouncing auf Filter-Inputs**~~ | ~~`runGlobalSearch` auf Input debounced (200ms); alle anderen Filter waren bereits debounced — **erledigt sw v449**~~ | — |
| ~~PERF-2~~ | ~~**Soundex nicht gecacht**~~ | ~~`_sdxSurname`/`_sdxGiven` in `_buildSearchIndex` vorberechnet; `filterPersons` nutzt Cache mit Fallback — **erledigt sw v449**~~ | — |

---

## P2 — Features (mittelfristig)

| ID | Aufgabe | Details | Aufwand |
|---|---|---|---|
| F5 | **Lebende-Anonymisierung** | Export: Geb. >~1920 + kein Sterbedatum → Name „Lebende Person", alle Events entfernt; DSGVO-konform; Opt-in im Einstellungs-Modal | M |
| F6 | **Strict GEDCOM Export** | Alle `_`-Tags (\_RUFNAME, \_TASK, \_GRAMPS\_ID etc.) entfernen oder auf Standard-Tags mappen; Export-Modus im Einstellungs-Modal; dokumentiert in ADR | M |
| ASSO-UI | **ASSO-Beziehungen editierbar** | ASSO wird geparst + geschrieben (korrekt), aber kein UI-Formular; read-only Anzeige in Personen-Detail als Schritt 1; Bearbeitung (Zeuge/Pate zu Event zuordnen) als Schritt 2 | M+M |
| CrossMode-CitNotes | **Citation-Notizen im GRAMPS→GEDCOM-Cross-Mode** | `_citExtra[]` `<noteref>`-Einträge → `3 NOTE @grampId@` im GEDCOM-Export; setzt Note-XREF voraus (erledigt v419) | M |
| GRAMPS-Orte | **Orts-Picker im GRAMPS-Modus** | `db.placeObjects{}` als strukturierter Picker (Hierarchie: Stadt → Kreis → Land); Orts-Zuweisung an Events | M |
| GRAMPS-Edit | **GRAMPS-Attribute editierbar** | `_grampsAttrs[]` in Personen-/Familien-Formular anzeigen + editieren; `grampId` sichtbar | M |
| U12 | **Dark Mode** | `prefers-color-scheme` Media Query in `styles.css`; `theme_color` in `manifest.json` anpassen | M |
| F3 | **Pedigree-Collapse** | Mehrfach-Vorfahren erkennen + im Sanduhr-Baum zusammenführen; Inzucht-Koeffizient berechnen | M |
| Perf-Worker | **Web Worker für Duplikat-Scan** | `findDuplicatePairs()` in `Worker` auslagern; Main Thread bleibt bei >2000 Personen reaktiv | M |

---

## Backlog (kein festes Datum)

| ID | Aufgabe | Details | Aufwand |
|---|---|---|---|
| GEDCOM-7 | **GEDCOM 7.0 Evaluierung** | FamilySearch-Standard im Kommen; Parser/Writer-Anpassung für neue Tag-Struktur; HEAD GEDC VERS 7.0 | L |
| ASSO-Event | **Event-Rollen voll editierbar** | Personen als Zeugen/Paten zu Events zuordnen; schreibt `1 ASSO`-Block; nur nach ASSO-UI sinnvoll | L |
| Nachkommen | **Nachkommen-Baum** | Top-down SVG analog zum Sanduhr-Baum | L |
| F8 | **Cluster-Ansicht** | Alle Personen in denselben Orten/Quellen wie Person X | L |
| F7 | **Narrative-Export** | Fließtext-Biografie → TXT/HTML; LLM-Erweiterung optional | L |
| F9 | **Zeitleiste** | Personen-Events neben historischen Ereignissen; `ui-timeline.js` | XL |
| F10 | **Buchgenerator** | HTML/PDF Familienbuch; Ahnentafel + Biografie + Fotos | XL |
| F11 | **OCR** | Urkunden-Scan → Text; WASM-Tesseract oder LLM-Backend | XL |

---

*Aufwand: XS (<1h) · S (1–2h) · M (halber Tag) · L (1–2 Tage) · XL (>2 Tage)*
*Vollständige Sprint-Geschichte: CHANGELOG.md*
