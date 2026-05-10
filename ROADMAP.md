# Roadmap

Sprint-Geschichte aller abgeschlossenen Versionen: `CHANGELOG.md`

---

## Aktueller Stand

| Version | Branch | Status |
|---|---|---|
| 4.0–6.0 | `main` / `v6-dev` | Abgeschlossen — Details: CHANGELOG.md |
| 7.0 | `v7-dev` | In Entwicklung |

**sw-Version:** v374 · Cache: `stammbaum-v374`
**Roundtrip GEDCOM:** stabil, net_delta=0 · **GRAMPS:** 60034 Checks ✓ (2894 Pers.)
**Testdaten:** MeineDaten_ancestris.ged (2811 Pers.) · Unsere Familie.gramps (2894 Pers.)

---

## Version 7.0 — Abgeschlossene Phasen

| Phase | Inhalt | SW |
|---|---|---|
| 1 | GRAMPS-GEDCOM-Kompatibilität — `detectGRAMPS()`, `grampId`-Felder | v190 |
| 2 | GRAMPS XML Import — `gramps-parser.js`, `db.placeObjects{}`, `db._grampsHandles{}` | v191–v196 |
| 3 | GRAMPS XML Round-trip — `gramps-writer.js`, 60034 Deep-Test-Checks ✓ | v193–v204 |
| 3b | UI: Höfe-Ansicht, RESI-Autocomplete, Bewohner-Formular | v224–v228 |
| Cleanup | Virtual Scroll, onclick-Delegation, State-Konsolidierung, Suche indexiert | v230–v233 |
| 4a | UX: `compactPlace()`, Notizen-Modal, noteRefs editierbar + löschbar | v236–v242 |
| 4b | Duplikat-Erkennung + Merge: Levenshtein-Scoring, Merge-Modal | v243 |
| 4c | Kartenansicht: Leaflet lokal, Orte + Personenbiografie, Desktop-Panel | v244–v250 |
| 4d | Hof-Koordinaten + Notizen: `db.hofObjects{}`, PLAC+MAP am RESI, Hof-Marker | v280–v283 |
| 4e | Hof-Eigentum: PROP-Ereignisse, `propEntries[]`, chronologische Sortierung | v261–v265 |
| 4f | UX/UI-Review: Touch-Targets, Swipe-down, Unified Nav, `showToast(type)` | v289–v297 |
| 4g | Rufname: `_RUFNAME`-Tag Roundtrip, Detailansicht, Baum | v298 |
| 4h | Security/A11y: `user-scalable=no` entfernt, `esc()`, Debug `?debug=1`-only | v300–v306 |
| 4j | Forschungsaufgaben: `p._tasks[]`, GEDCOM+GRAMPS-Roundtrip, globale Liste, Badge | v307 |
| 5.1 | ASSO/RELA/Taufpaten: `p.associations[]`, GEDCOM↔GRAMPS, Taufpaten-CHR-Formular | v323–v329 |
| F1 | Sosa/Kekule: 9-Gen-Baum + Fächer, `_buildKekuleMap()`, `#N`-Badges | v330–v332 |
| F2 | Beziehungsrechner: BFS, `_relLabel()`, Pfad-Modal, Pedigree-Collapse-Hinweis | v333–v348 |
| — | OBJE ohne FORM: `m.form = null`; Writer gibt FORM nur aus wenn nicht null | v349 |
| F4 | Soundex-Suche: `germanSoundex()` mit Umlaut-Normalisierung, ≈-Toggle | v350 |
| SEC | Security-Review: OAuth CSRF State, `safeLinkHref()`, `esc(addr)`, `_validCoord()` | v351 |
| A3/A4 | SW Cache-first für App-Assets + Fonts lokal (8 woff2, CSP bereinigt) | v352–v353 |
| A6 | `initAutocomplete()` zusammengeführt — `initPlaceAutocomplete` u.a. als Wrapper | v354 |
| U1–U6 | Menü (Sektionen, Datei schließen), ARIA Dialogs, Touch-Targets, Hilfe-Modal | v355 |
| — | Rufname-Formularfeld `pf-rufname`; Parser: Asterisk-Konvention in `2 GIVN` | v356 |
| A11y/UX | Touch-Targets WCAG 2.5.5: `.topbar-btn` + `.search-input` + `.task-*` auf ≥44px; Toast `aria-live="polite"` für Screen-Reader | v357 |
| SEC5 | `innerHTML` → `textContent` in `onedrive-auth.js` (Button-Label hardcoded, kein Risiko, aber cleaner Stil) | v358 |
| A7/A9 | `_placeModes` → `UIState._placeModes`; `_odMigrateIfNeeded()` auch in `odAutoLoadFromOneDrive()` | v359 |

GEDCOM-Roundtrip-Fixes: v208–v220 (Orts-Hierarchie, FAM CHIL-Quellenrefs, @@-Normalisierung)

---

## Offene Aufgaben

### Architektur

| ID | Aufgabe | Details | Aufwand |
|---|---|---|---|
| A10 | **`unsafe-inline` aus CSP entfernen** | ✅ alle 6 Phasen abgeschlossen (v373). Details: ADR-015 in `ARCHITECTURE.md`. | XL → ✅ |

#### A10 — Fortschritt (Stand 2026-05-10)

| Phase | Scope | Status | SW |
|---|---|---|---|
| 1 | Utility- + Component-Klassen in `styles.css` (+354 Z.) | ✅ | — |
| 2 | `index.html`: 240 `style=` → Klassen + `hidden` | ✅ | — |
| 3 | `ui-forms*.js`: 7 inline styles | ✅ | v370 |
| 4 | View-Dateien: hof 55 · person 52 · family 33 · media 26 · source 23 | ✅ | v371 |
| 5 | Alle verbleibenden JS-Dateien (12×, inkl. `_applyDynStyles()` für dyn. Werte) | ✅ | v372 |
| 6 | `unsafe-inline` aus CSP-Header entfernen | ✅ | v373 |

### UX / Benutzerführung

| ID | Aufgabe | Details | Aufwand |
|---|---|---|---|
| U8 | **Cmd+Z granulares Undo** | History-Stack auf AppState; aktuell: Cmd+Z = "Revert to Saved" | XL |
| U12 | **Dark Mode** | `prefers-color-scheme` in `styles.css`; `theme_color` in `manifest.json` | M |
| U16 | **Farbkodierung Baum A11y** | Geschlecht nur durch Farbe — keine Text-Alternative für Farb-Sehschwäche | XS |
| U17 | **Focus-Trap in Modals** | Tab-Navigation verlässt offene Modals; `Tab`-Cycle auf Modal-Inhalte begrenzen. | S |
| U18 | **Formular-Validierung sichtbar** | `.form-error { display: none }` wird nie angezeigt; Inline-Fehlerhinweise vor Submit zeigen. | S |
| U19 | **Tooltips auf Baum-Karten + QUAY-Legende** | `.tree-card` ohne Tooltip; QUAY-Stufen nur farbkodiert ohne Legende; Kekule-Nummern unerläutert. | S |
| U20 | **`showDetail()` + `showFamilyDetail()` aufteilen** | 344 bzw. 235 Zeilen lange God-Functions; in 4–5 Hilfsfunktionen aufteilen. | M |
| U21 | **Copy-Paste Meta/Geo-Templates auslagern** | Geburtsort/-datum-Konstruktion und Geo-Button-Template in `ui-views-person.js` + `ui-views-family.js` identisch dupliziert → in `ui-views.js` auslagern. | S |
| U22 | **Onboarding verbessern** | Landing-Page erklärt nicht, was GEDCOM ist; kein Hinweis auf erwartetes Dateiformat; Demo-Button ohne Intro-Text. | S |

### GRAMPS — Editierbarkeit (Phase 5.2/5.3)

| Aufgabe | Aufwand |
|---|---|
| Personen-Formular — `_grampsAttrs[]` anzeigen/editieren; `grampId` + `_grampsCall` sichtbar | M |
| Ereignis-Formular — `_grampsAttrs[]` pro Event; Witness-Rollen (read-only) | M |
| Orts-Picker — `db.placeObjects{}` als strukturierter Picker (Hierarchie: Stadt → Kreis → Land) | M |
| GRAMPS-Badge in Topbar — bei `db._grampsMaster`: Icon + `.gramps` als primäres Export-Format | S |
| Tags anzeigen — `db.tags{}` in Personen-/Familien-Detail als Badges | S |

### Features & Analyse

| ID | Aufgabe | Details | Aufwand |
|---|---|---|---|
| F3 | **Pedigree-Collapse** | Inzucht-Koeffizient; baut auf F2-BFS auf | M |
| F4b | **Mehrfach-Zitierungen** | `citations:[{sid,page,quay}]` statt `sources[]+sourcePages{}`; ~8 Dateien; Roundtrip neu verifizieren | XL |
| F5 | **Lebende-Anonymisierung** | Export: Geb. >~1920 + kein Sterbedatum → "Lebende Person"; DSGVO | M |
| F6 | **Strict GEDCOM Export** | Alle `_`-Tags entfernen (maximale Interoperabilität mit Ancestry/FTM/MacFamilyTree). Konkret: `p._rufname` → `2 NICK`; Rufname-Wort im `2 GIVN` mit `*` markieren (Ahnenblatt-Konvention). Export-Modus als Option im Einstellungs-Modal. | M |
| F7 | **Narrative-Export** | Fließtext-Biografie → TXT/HTML; LLM-Erweiterung optional | L |
| F8 | **Cluster-Ansicht** | Personen in denselben Orten/Quellen wie Person X | L |
| F9 | **Zeitleiste** | Events neben historischen Ereignissen; `ui-timeline.js` | XL |
| F10 | **Buchgenerator** | HTML/PDF Familienbuch; Ahnentafel + Biografie + Fotos | XL |
| F11 | **OCR** | Urkunden-Scan → Text; WASM-Tesseract oder LLM-Backend | XL |
| — | **Nachkommen-Baum** | Top-down SVG | L |

---

*Aufwand: XS (<1h) · S (1–2h) · M (halber Tag) · L (1–2 Tage) · XL (>2 Tage)*
*Abgelehnte Aufgaben und Archiv: CHANGELOG.md*
