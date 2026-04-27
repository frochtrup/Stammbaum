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
**Aktuelle sw-Version:** v273 / Cache: `stammbaum-v273`
**Qualitäts-Sprint 2026-04-27:** S4–S6 (XSS, localStorage, Redirect-URI), U9 (Modal-Fokus), U11 (Icon-Button aria-labels, aria-expanded) ✅
**Qualitäts-Sprint 2 2026-04-27:** U11b (Landmarks), Q6 (verify), U10 (Touch-Targets 44px), A3 (Domain-Logik → gedcom.js) ✅

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
| Cleanup | Virtual Scroll, onclick-Delegation, State-Konsolidierung, Suche indexiert, Debug ausgelagert | v230–v233 |

GEDCOM-Roundtrip-Fixes: v208–v220 (Orts-Hierarchie, FAM CHIL-Quellenrefs, @@-Normalisierung u.a.)

---

## Nächste Top-Prioritäten (Qualität)

*Stand: 2026-04-27 — abgeleitet nach Abschluss des Sicherheits-Sprints (S4–S6, U9, U11)*

| Rang | ID | Aufgabe | Kategorie | Aufwand | Begründung |
|---|---|---|---|---|---|
| ~~1~~ | ~~Q5~~ | ~~`updateStats()` No-op entfernen — 12+ tote Aufrufe~~ ✅ 2026-04-27 | Code | XS | |
| ~~2~~ | ~~Q7~~ | ~~`_getOriginalText()` localStorage-Fallback entfernen~~ ✅ 2026-04-27 | Code | XS | |
| ~~3~~ | ~~Q8~~ | ~~`tryAutoLoad()` Migration-Pfad mit TODO markieren~~ ✅ 2026-04-27 | Code | XS | |
| ~~4~~ | ~~U4~~ | ~~`showToast(type)` — visuell Erfolg/Warnung/Fehler trennen~~ ✅ 2026-04-27 | UX | S | |
| ~~5~~ | ~~U2~~ | ~~Modal-Stack / Escape schließt oberstes Modal~~ ✅ 2026-04-27 | UX | S | |
| ~~6~~ | ~~U10~~ | ~~Touch-Targets ≥44px (WCAG 2.5.5)~~ ✅ 2026-04-27 — `.src-tag` min-height:44px; `.src-tag-x` align-self:stretch; `.src-add-btn` min-height:44px; `.src-picker-item` min-height:44px; `× Entfernen` → `.btn-remove-ref` | ~~UX/a11y~~ | ~~S~~ | |
| ~~7~~ | ~~Q6~~ | ~~`_buildSearchIndex()` dirty-Pfad verifizieren~~ ✅ 2026-04-27 — kein Bug; `lower &&`-Guard sicher (leere Suche wertet `_searchStr` nie aus); Kommentar in `ui-views-person.js:266` | ~~Code~~ | ~~S~~ | |
| ~~8~~ | ~~U11b~~ | ~~Landmark-Elemente `<main>`, `<nav role>` ergänzen~~ ✅ 2026-04-27 — `<div id="v-main">` → `<main>`; `<nav class="bottom-nav">` + `aria-label="Hauptnavigation"` | ~~a11y~~ | ~~S~~ | |
| ~~9~~ | ~~U3~~ | ~~`confirm()` → `confirmModal()` Promise (6+ Stellen)~~ ✅ 2026-04-27 — `confirmModal(msg)` Promise; `modalConfirm` HTML+CSS; Escape/Backdrop resolve(false); 8 Stellen async | ~~UX~~ | ~~M~~ | |
| 10 | A3 | Domain-Logik (`buildHofIndex`, Dedup-Scoring) nach `gedcom.js` | Architektur | M | UI-Dateien haben Business-Logik; Testbarkeit |

**Nicht in dieser Liste (eigene Sprints):**
- A1 `ui-views.js` aufteilen (L) — erst nach A3
- U8 Cmd+Z granulares Undo (XL) — eigenständiger Sprint
- U12 Dark Mode (M) — eigenständiger Sprint

---

## Offene Aufgaben nach Priorität

### P0 — Sicherheit *(vor jedem Sharing- oder Fremd-Import-Feature)*

| ID | Aufgabe | Aufwand |
|---|---|---|
| S1 | ~~**XSS-Audit**~~ ✅ sw v265 — vollständiger Audit aller `innerHTML`-Assignments; Lücke behoben: `ui-views-map.js:217` `e.date` fehlte `_mesc()` | M |
| S2 | ~~**DOMPurify**~~ — gestrichen; `esc()`/`_mesc()` konsistent (129 Aufrufe in 12 Dateien); kein Rich-Text | S |
| S3 | ~~**CSP `unsafe-inline` Styles**~~ — gestrichen; ~445 `style=`-Attribute; `element.style.*` CSP-unberührt; Sicherheitsgewinn gering | L |
| S4 | ~~**XSS `buildPlacePartsHtml()`**~~ ✅ 2026-04-27 — `esc(lbl)` in `gedcom.js:297` | XS |
| S5 | ~~**GEDCOM aus localStorage entfernen**~~ ✅ 2026-04-27 — Schreib-Stellen in `storage-file.js` entfernt; Migration-Reads in `storage.js` bleiben für Bestandsnutzer | S |
| S6 | ~~**Redirect-URI fest kodieren**~~ ✅ 2026-04-27 — `onedrive-auth.js`: zwei feste URIs (GitHub Pages + localhost), dynamischer Fallback nur für unregistrierte Origins | XS |

---

### P1 — Code-Qualität

| ID | Aufgabe | Aufwand |
|---|---|---|
| Q1 | ~~**`evDateKey()` zentralisieren**~~ ✅ sw v266 | XS |
| Q2 | ~~**`_renderMediaList()` + `_renderEfMedia()` zusammenführen**~~ — gestrichen; unterschiedliche Kontexte | S |
| Q3 | ~~**Backward-Compat-Shims bereinigen**~~ ✅ sw v268 | M |
| Q4 | ~~**Getter konsequent durchziehen**~~ — gestrichen; Risiko > Nutzen | M |
| Q5 | ~~**`updateStats()` No-op entfernen**~~ ✅ 2026-04-27 — Funktion + 14 Aufrufe in 5 Dateien entfernt | XS |
| Q6 | ~~**`_buildSearchIndex()` dirty-Pfad prüfen**~~ ✅ 2026-04-27 — kein Bug; `lower &&`-Guard sicher (leere Suche wertet `_searchStr` nie aus); Kommentar in `ui-views-person.js:266` | S |
| Q7 | ~~**`_getOriginalText()` localStorage-Fallback entfernen**~~ ✅ 2026-04-27 — `gedcom.js:67`: Dead Code entfernt; Funktion liefert nur noch `AppState._originalGedText ?? null` | XS |
| Q8 | ~~**`tryAutoLoad()` Migration-Pfad markieren**~~ ✅ 2026-04-27 — TODO-Kommentar mit Datum Q3/2026 in `storage.js:135` | XS |

*Gestrichen: generische `initAutocomplete()` — unterschiedliche Kontexte, Aufwand > Nutzen (bewertet 2026-04-14)*

---

### P2 — Architektur

| ID | Aufgabe | Aufwand |
|---|---|---|
| A1 | **`ui-views.js` aufteilen** (922 Z., 5 Verantwortlichkeiten): Navigation/Routing → `ui-router.js`, Modal-Manager → `ui-modal.js`, Note-Modal → `ui-views-note.js` | L |
| A2 | **`_CLICK_MAP` nach Feature-Bereich strukturieren**: Sub-Maps `_CLICK_MAP_PERSON`, `_CLICK_MAP_FAMILY` etc., im Init zusammengeführt | M |
| A3 | ~~**Domain-Logik in `gedcom.js` verlagern**~~ ✅ 2026-04-27 — `buildHofIndex()`, `_dedupNormName`, `_dedupLevenshtein`, `_dedupYearFromGed`, `_dedupScorePair`, `findDuplicatePairs` nach `gedcom.js`; UI-Dateien referenzieren globale Funktionen | M |
| A4 | **`_formState` kapseln**: Transiente Formular-States nicht global in UIState, sondern an Formular-Lifecycle binden | M |

---

### P3 — Performance

| ID | Aufgabe | Aufwand |
|---|---|---|
| P1 | **Virtual Scroll für Hof-Liste** — analog zur Personen/Familien-Liste | M |
| P2 | **IDB Batch-Reads für Medien**: `getAll()` mit Index statt sequentielle Einzelabfragen | M |
| P3 | **Suchergebnisse ranken** statt nach Position (`slice(0,20)`); Hinweis wenn >20 Treffer | S |
| P4 | **`_rebuildPersonSourceRefs()` lazy**: nur bei tatsächlicher Source-Änderung, nicht bei jedem Save | S |

---

### P4 — UX-Schulden

| ID | Aufgabe | Aufwand |
|---|---|---|
| U1 | ~~**Fehlermeldungen nutzerfreundlich**~~ ✅ sw v267 | S |
| U2 | ~~**Modal-Stack / Escape-Verhalten**~~ ✅ 2026-04-27 — `querySelectorAll` + letztes Element; schließt immer das oberste Modal | S |
| U3 | ~~**`confirm()` → Modal**~~ ✅ 2026-04-27 — `confirmModal(msg)` Promise; `modalConfirm` HTML+CSS (alertdialog); Escape/Backdrop/Cancel resolve(false); OK resolve(true); 8 Stellen in 5 Dateien async | M |
| U4 | ~~**`showToast(type)`**~~ ✅ 2026-04-27 — Auto-Erkennung via Präfix (✓ → gold, ⚠ → orange); `.toast-success` + `.toast-warn` in styles.css | S |
| U5 | ~~**Namens-Truncation im Baum**~~ ✅ sw v269 | XS |
| U6 | **`handleError()` zentralisieren**: try/catch → `handleError(e, context, userMsg)` | M |
| U7 | ~~**Advanced Search**~~ ✅ sw v269 | L |
| U8 | **Cmd+Z granulares Undo**: History-Stack auf AppState; eigener Sprint | XL |
| U9 | ~~**Fokus-Management in Modals**~~ ✅ 2026-04-27 — `openModal()` fokussiert per `requestAnimationFrame` das erste sichtbare Input/Select/Textarea; wirkt für alle Modals | S |
| U10 | ~~**Touch-Targets zu klein**~~ ✅ 2026-04-27 — `.src-tag` min-height:44px; `.src-tag-x` stretch+flex; `.src-add-btn`/`.src-picker-item` min-height:44px; `× Entfernen` → `.btn-remove-ref`; `ui-forms.js:62` Inline-Style → Klasse | S |
| U11 | ~~**Icon-Buttons `aria-label` + `aria-expanded`**~~ ✅ 2026-04-27 — Topbar, FAB, Filter-Buttons, Tree-View; `advFilterToggle` mit `aria-expanded` synchron zu `toggleAdvFilter()` | S |
| U11b | ~~**Landmark-Elemente ergänzen**~~ ✅ 2026-04-27 — `<div id="v-main">` → `<main>`; `<nav class="bottom-nav">` + `aria-label="Hauptnavigation"` | S |
| U12 | **Dark Mode**: `prefers-color-scheme` Media Query in `styles.css` fehlt; `theme_color` in `manifest.json` fest | M |

---

### P5 — GRAMPS Phase 4/5 (iOS-Companion + Editierbarkeit)

#### Phase 4 — iOS-Companion-Optimierungen

- [ ] **Quick-Add** — `ui-quick-add.js`: Vorname + Nachname + Geburtsjahr + optionale Familie
- [ ] **Foto-direkt-zu-Person** — iOS-Kamera → direkt an Person ohne Umweg über Media-Browser
- [ ] **GRAMPS-Tag-Editor** — Tags hinzufügen/entfernen (Phase 2 read-only, hier editierbar)
- [ ] **Orts-Hierarchie-Editor** — Formular mit `db.placeObjects{}`-Unterstützung
- [ ] **Export-Hinweis** — "Zuletzt geladen: Datum" in Topbar/Export-Dialog

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
- [ ] Statistik-Dashboard
- [ ] Rufname (NICK / `_RUFNAME`) in Detailansicht + Baum
- [ ] **Eigentum in Hofhistorie** — PROP-Ereignisse in Hof-Detail als hervorgehobene Zeile; `buildHofIndex()` um PROP-Einträge erweitern; Ereignis-Formular für PROP: Adress-Auswahl analog zu RESI, kein Pflichtfeld (Acker, Mühle, Scheune …)

---

*Aufwand: XS (<1h) · S (1–2h) · M (halber Tag) · L (1–2 Tage) · XL (>2 Tage)*
