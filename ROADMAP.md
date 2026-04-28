# Roadmap

Detaillierte Sprint-Geschichte aller abgeschlossenen Versionen: `CHANGELOG.md`

---

## Aktueller Stand

| Version | Branch | Status |
|---|---|---|
| 4.0 | `main` | Abgeschlossen (2026-03-30) — Details: CHANGELOG.md |
| 5.0 | `main` | Abgeschlossen (2026-04-05) — Details: CHANGELOG.md |
| 6.0 | `v6-dev` | Abgeschlossen (2026-04-10) — Details: CHANGELOG.md |
| 7.0 | `v7-dev` | In Entwicklung |

**Roundtrip GEDCOM:** `stable=true`, `net_delta=0` — alle tag-counts ✓; CONC/CONT-Neuformatierung + HEAD-Rewrite by design akzeptiert
**Roundtrip GRAMPS:** `deep_test=true`, 60034 Checks ✓ — 2894 Personen, 910 Familien, 138 Quellen, 139 Orte
**Testdaten:** MeineDaten_ancestris.ged (2811 Pers.) / Unsere Familie.gramps (2894 Pers.)
**Aktuelle sw-Version:** v306 / Cache: `stammbaum-v306`

---

## Version 7.0 (Branch `v7-dev`, ab 2026-04-10)

**Strategie:** GRAMPS als Desktop-Master, PWA als iOS-Companion. GEDCOM bleibt vollständig erhalten.

```
GRAMPS (Desktop) ←→ GRAMPS XML (.gramps) ←→ PWA (iOS/iPad Companion)
GEDCOM (.ged)    ←→ GEDCOM 5.5.1          ←→ PWA (alle anderen Quellen)
```

---

### Abgeschlossene Phasen

| Phase | Inhalt | SW |
|---|---|---|
| 1 | GRAMPS-GEDCOM-Kompatibilität — `detectGRAMPS()`, `grampId`-Felder | v190 |
| 2 | GRAMPS XML Import read-only — `gramps-parser.js`, `db.placeObjects{}`, `db._grampsHandles{}` | v191–v196 |
| 3 | GRAMPS XML Export Round-trip — `gramps-writer.js`, 60034 Deep-Test-Checks ✓ | v193–v204 |
| 3b | UI: Höfe-Ansicht, RESI-Adress-Autocomplete, Bewohner-Formular | v224–v228 |
| 4a | UX: `compactPlace()`, Notizen-Modal, noteRefs editierbar + löschbar, `_pruneOrphanNotes()` | v236–v242 |
| 4b | Duplikat-Erkennung + Merge: Levenshtein-Scoring, Merge-Modal, Ignorieren | v243 |
| 4c | Kartenansicht: Leaflet lokal; Alle Orte + Personenbiografie; Desktop rechtes Panel; Safari-Fix | v244–v250 |
| 4d | Hof-Koordinaten + Notizen: `db.hofObjects{}`, PLAC+MAP am RESI, Hof-Marker auf Karte, RESI-Stationen in Personenbiografie; Roundtrip-Fixes v282–v283 | v280–v285 |
| 4e | Hof-Eigentum: PROP-Ereignisse in Hofhistorie; `propEntries[]` in `buildHofIndex()`; `showHofPropForm`/`saveHofEigentum`; Bewohner+Eigentum chronologisch sortiert | v261–v265 |
| 4f | UX/UI-Review: Touch-Targets, Leerzustände, Swipe-down, Event-Typ-Selektor, History-Picker, Unified Nav History, `showToast(type)`, `confirmModal(okLabel)` | v289–v297 |
| 4g | Rufname: `_RUFNAME`-Tag GEDCOM-Roundtrip; Detailansicht Rufname+Spitzname; Baum unterstrichen | v298 |
| 4h | Security/A11y-Review: `user-scalable=no` entfernt (WCAG 1.4.4); `esc()` + `'`; `ui-debug.js` + Roundtrip-Test `?debug=1`-only; `loadDemo()` `confirmModal()`; Hilfe-Version dynamisch | v300–v302 |
| Cleanup | Virtual Scroll, onclick-Delegation, State-Konsolidierung, Suche indexiert, Debug ausgelagert | v230–v233 |

GEDCOM-Roundtrip-Fixes: v208–v220 (Orts-Hierarchie, FAM CHIL-Quellenrefs, @@-Normalisierung u.a.)

---

## Nächste Top-Prioritäten

| Rang | ID | Aufgabe | Kategorie | Aufwand |
|---|---|---|---|---|
| 1 | A5 | `db`-Shim eliminieren: `setDb()` mit `Object.assign` auf stabiler Referenz; `const db = AppState.db` modul-level | Architektur | L |
| 2 | U12 | Dark Mode: `prefers-color-scheme` in `styles.css`; `theme_color` in `manifest.json` | UX | M |
| 3 | U8 | Cmd+Z granulares Undo: History-Stack auf AppState | UX | XL |

---

## Offene Aufgaben

### P1 — Code-Qualität

| ID | Aufgabe | Aufwand |
|---|---|---|
| — | *P1 vollständig — siehe Archiv* | |

---

### P2 — Architektur

| ID | Aufgabe | Aufwand |
|---|---|---|
| A1 | ~~**`ui-views.js` aufteilen**~~ ✅ 2026-04-27 — `ui-views-note.js` (120 Z., Notiz-Modal) + `ui-views-search.js` (139 Z., `runGlobalSearch`) extrahiert; ui-views.js: 935 → 683 Z.; `ui-router.js` + `ui-modal.js` abgelehnt (Navigation global verwoben, Modal-Manager in ui-forms.js) | S |
| A5 | **`db`-Shim eliminieren**: `window.db` leitet per Shim auf `AppState.db` weiter (176 bare-Zugriffe in 14 Dateien). Lösung: `setDb(newDb)` mit `Object.assign` auf stabiler Referenz; `const db = AppState.db` modul-level. Betroffene Stellen: ~12 Zuweisungen in `storage.js`, `storage-file.js`, `ui-debug.js`. | L |
| A6 | ~~**`ui-forms.js` aufteilen**~~ abgelehnt 2026-04-27 — Splits zu granular (`ui-modal.js`: 4 Fns, `ui-utils.js`: 3 Fns/20 Z.); `openModal`/`closeModal` form-nah; kein Build-Step = jede Datei kostet Script-Tag + PRECACHE; Datei ist kohärent (Formulare + Hilfsfunktionen) | M |
| A7 | ~~**Menü-Buttons CSS-Klasse**~~ ✅ 2026-04-29 — `.menu-btn` in `styles.css`; 12 Inline-Styles in `#modalMenu` ersetzt | S |

---

### P4 — UX-Schulden

| ID | Aufgabe | Aufwand |
|---|---|---|
| U8 | **Cmd+Z granulares Undo**: History-Stack auf AppState; eigener Sprint | XL |
| U12 | **Dark Mode**: `prefers-color-scheme` Media Query in `styles.css` fehlt; `theme_color` in `manifest.json` fest | M |
| U15 | ~~**Hilfe-Modal Inhalt aktualisieren**~~ ✅ 2026-04-29 — Tabs korrigiert (⌂ Proband statt 🔍 Suche); Abschnitte Baum/Orte+Höfe+Karte/Statistik/Tastaturkürzel ergänzt | S |
| U16 | **Farbkodierung Baum Barrierefreiheit**: Geschlecht nur durch Farbe (blau/pink/gold) kodiert — keine Text-Alternative für Farb-Sehschwäche; `data-sex`-Attribut ist maschinenlesbar, aber nicht sichtbar | XS |
| Q11 | ~~**Koordinaten Bounds-Check**~~ ✅ 2026-04-29 — `parseCoordInput()`: `Math.abs(lat)<=90`/`Math.abs(lon)<=180` an beiden Return-Pfaden; Out-of-range → NaN | XS |

---

### P5 — GRAMPS Phase 4/5 (iOS-Companion + Editierbarkeit)

#### Phase 4 — iOS-Companion-Optimierungen

- [ ] **Quick-Add** — `ui-quick-add.js`: Vorname + Nachname + Geburtsjahr + optionale Familie
- [ ] **Foto-direkt-zu-Person** — iOS-Kamera → direkt an Person ohne Umweg über Media-Browser
- [ ] **GRAMPS-Tag-Editor** — Tags hinzufügen/entfernen (Phase 2 read-only, hier editierbar)
- [ ] **Orts-Hierarchie-Editor** — Formular mit `db.placeObjects{}`-Unterstützung
- [ ] **Export-Hinweis** — "Zuletzt geladen: Datum" in Topbar/Export-Dialog

#### Phase 4d — Hof-Koordinaten + Notizen ✅ v283

**Datenmodell:** `db.hofObjects[addr] = { addr, lat, long, note }` — localStorage (`stammbaum_hofobjects`), lazy (nur wenn Koordinaten/Notiz vorhanden).

**Serialisierung:**
- GEDCOM: Koordinaten als `PLAC + MAP/LATI/LONG` an allen RESI/PROP-Events dieser Adresse (ADDR bleibt erhalten, andere Programme lesen beides)
- GRAMPS: `placeobj` mit `type="Building"` + `coord lat/long` + `noteref` (Phase 5)

**Ortsliste:** bleibt unverändert sauber — `hofObjects` ist von `extraPlaces` getrennt, Höfe erscheinen nicht in `collectPlaces()`.

| Schritt | Datei | Status |
|---|---|---|
| `db.hofObjects{}` + `loadHofObjects/saveHofObjects` | `gedcom.js`, `ui-forms.js`, `storage.js` | ✅ v280 |
| Koordinaten-Sektion + Formular in Hof-Detail | `ui-views-hof.js` | ✅ v280 |
| Notiz-Typ `'hof'` in Notizen-Modal | `ui-views-note.js` | ✅ v280 |
| Hof-Marker auf Karte + RESI-Stationen in Personenbiografie | `ui-views-map.js` | ✅ v280 |
| GEDCOM-Writer: PLAC+MAP an RESI/PROP-Events | `gedcom-writer.js` | ✅ v281 |
| GEDCOM-Parser: PLAC+MAP aus RESI-Events → hofObjects | `gedcom-parser.js` | ✅ v281 |
| GRAMPS: placeobj type=Building | `gramps-parser.js`, `gramps-writer.js` | ✅ v281 |
| Fix: Hof-Notiz Roundtrip via OneDrive (lv=2 NOTE + ev.note in _derived) | `gedcom-writer.js`, `gedcom-parser.js` | ✅ v282 |
| Fix: hofObjects Priorität vor extraPlaces in `geoLines()` | `gedcom-writer.js` | ✅ v283 |

---

#### Phase 5.1 — Cross-Parser

- [ ] **ASSO/RELA/ROLE → Witness-Roundtrip (GEDCOM↔GRAMPS)**
- [ ] **OBJE ohne FORM stabilisieren** — `m.form = null`; Writer nur ausgeben wenn nicht null

#### Phase 5.2 — Formulare

- [ ] **Personen-Formular** — `_grampsAttrs[]` anzeigen/editieren; `grampId` + `_grampsCall` sichtbar
- [ ] **Ereignis-Formular** — `_grampsAttrs[]` pro Event; Witness-Rollen (read-only); GRAMPS Event-Typen im Dropdown
- [ ] **Familien-Formular** — `_grampsAttrs[]` auf Familien-Ebene
- [ ] **Orts-Picker** — `db.placeObjects{}` als strukturierten Picker (Hierarchie: Stadt → Kreis → Land)
- [ ] **Medien-Browser** — GRAMPS-Pfade auflösen; MIME-Typ; `titl` editierbar

#### Phase 5.3 — Anzeige

- [ ] **GRAMPS-Badge in Topbar** — bei `db._grampsMaster`: Icon + `.gramps` als primäres Export-Format
- [ ] **Orts-Hierarchie in Event-Detail** — vollständigen Pfad aus `db.placeObjects{}` auflösen
- [ ] **Tags anzeigen** — `db.tags{}` in Personen-/Familien-Detail als Badges

---

### P6 — Neue Features *(erst nach P0)*

- [ ] Zeitleiste (`ui-timeline.js`)
- [ ] Nachkommen-Baum (top-down SVG)
- ~~Statistik-Dashboard~~ ✅ v299

---

## Archiv — Abgeschlossene/abgelehnte Sprints

### P0 — Sicherheit ✅ vollständig

| ID | Aufgabe | Ergebnis |
|---|---|---|
| S1 | XSS-Audit | ✅ sw v265 |
| S2 | DOMPurify | gestrichen — `esc()`/`_mesc()` konsistent, kein Rich-Text |
| S3 | CSP `unsafe-inline` Styles | gestrichen — ~445 `style=`-Attribute, Gewinn gering |
| S4 | XSS `buildPlacePartsHtml()` | ✅ 2026-04-27 |
| S5 | GEDCOM aus localStorage entfernen | ✅ 2026-04-27 |
| S6 | Redirect-URI fest kodieren | ✅ 2026-04-27 |
| S7 | `user-scalable=no` entfernt (WCAG 1.4.4 — Zoom für alle Nutzer) | ✅ 2026-04-28 |
| S8 | `esc()` Apostroph `'` → `&#39;` (vollständige HTML-Escapesequenz) | ✅ 2026-04-28 |
| S9 | `ui-debug.js` + Roundtrip-Test-Buttons nur bei `?debug=1` | ✅ 2026-04-28 |

### P1 — Code-Qualität (Teilarchiv)

| ID | Aufgabe | Ergebnis |
|---|---|---|
| Q1 | `evDateKey()` zentralisieren | ✅ sw v266 |
| Q2 | `_renderMediaList()` + `_renderEfMedia()` zusammenführen | gestrichen — unterschiedliche Kontexte |
| Q3 | Backward-Compat-Shims bereinigen | ✅ sw v268 |
| Q4 | Getter konsequent durchziehen | gestrichen — Risiko > Nutzen |
| Q5 | `updateStats()` No-op entfernen | ✅ 2026-04-27 |
| Q6 | `_buildSearchIndex()` dirty-Pfad prüfen | ✅ 2026-04-27 — kein Bug |
| Q7 | `_getOriginalText()` localStorage-Fallback entfernen | ✅ 2026-04-27 |
| Q8 | `tryAutoLoad()` Migration-Pfad markieren | ✅ 2026-04-27 |
| Q9 | Input-Validierung `savePerson()` + `saveEvent()`: Name leer, Jahr 4-stellig, Tag 1–31, Monat gültig; Inline-Fehler via `.form-error`; `validateDatePartFields()` in `gedcom.js` | ✅ 2026-04-27 |
| Q10 | `onedrive-import.js` Foto-Injection Refaktor: `_updatePersonPhoto()` / `_updateFamilyPhoto()`; `createElement` statt `innerHTML` | ✅ 2026-04-27 |
| — | generische `initAutocomplete()` | gestrichen — unterschiedliche Kontexte |

### P2 — Architektur (Teilarchiv)

| ID | Aufgabe | Ergebnis |
|---|---|---|
| A2 | `_CLICK_MAP` nach Feature-Bereich strukturieren | abgelehnt — 82/144 Einträge "Sonstiges", kein sinnvoller Split |
| A3 | Domain-Logik in `gedcom.js` verlagern | ✅ 2026-04-27 |
| A4 | `_formState` kapseln | abgelehnt — `show*Form()` reinitialisiert bereits, single-modal, kein Leak |
| A6 | `ui-forms.js` aufteilen | abgelehnt 2026-04-27 — Splits zu granular; `openModal`/`closeModal` form-nah; kein Build-Step = jede Datei kostet Script-Tag + PRECACHE |
| — | `esc()` nach `gedcom.js` verschieben (globale Abhängigkeit sichtbar machen) | ✅ 2026-04-27 |

### P3 — Performance ✅ vollständig

| ID | Aufgabe | Ergebnis |
|---|---|---|
| P1 | Virtual Scroll für Hof-Liste | abgelehnt — <200 Adressen typisch, `_VS_MIN=500` nie erreicht |
| P2 | IDB Batch-Reads für Medien | abgelehnt — pfad-basierte Keys, 1–5 Items/Person, kein Engpass |
| P3 | Suchergebnisse ranken | ✅ 2026-04-27 |
| P4 | `_rebuildPersonSourceRefs()` lazy | ✅ 2026-04-27 |

### P4 — UX-Schulden (Teilarchiv)

| ID | Aufgabe | Ergebnis |
|---|---|---|
| U1 | Fehlermeldungen nutzerfreundlich | ✅ sw v267 |
| U2 | Modal-Stack / Escape-Verhalten | ✅ 2026-04-27 |
| U3 | `confirm()` → `confirmModal()` Promise | ✅ 2026-04-27 |
| U3b | `loadDemo()` mit `confirmModal()` bei ungespeicherten Änderungen | ✅ 2026-04-28 |
| U4 | `showToast(type)` visuell differenzieren | ✅ 2026-04-27 |
| U5 | Namens-Truncation im Baum | ✅ sw v269 |
| U6 | `handleError()` zentralisieren | abgelehnt — 14 Catches bewusste Fallbacks, individuelle Meldungen ausreichend |
| U7 | Advanced Search | ✅ sw v269 |
| U9 | Focus-Trap in Modals (`openModal`/`closeModal`): Tab-Zyklus, `aria-modal`, Fokus-Rückkehr | ✅ 2026-04-27 |
| U10 | Touch-Targets ≥44px | ✅ 2026-04-27 |
| U11 | Icon-Buttons `aria-label` + `aria-expanded` | ✅ 2026-04-27 |
| U11b | Landmark-Elemente `<main>`, `<nav>` | ✅ 2026-04-27 |
| U13 | `aria-live`-Announcement nach Filter/Suche: `#list-announce` (role=status, sr-only); `_announceList()` in allen drei Render-Fns | ✅ 2026-04-27 |
| U14 | VS ARIA: `role="list"` auf Container; `role="listitem"` + `aria-setsize`/`aria-posinset` auf allen Zeilen (VS + small list + sourceList) | ✅ 2026-04-27 |
| — | Lade-Spinner für GEDCOM/GRAMPS Parse + Import: `#loadingOverlay`, `rAF+setTimeout`-Pattern, `finally`-Blöcke | ✅ 2026-04-27 |

---

*Aufwand: XS (<1h) · S (1–2h) · M (halber Tag) · L (1–2 Tage) · XL (>2 Tage)*
