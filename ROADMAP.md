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

**Roundtrip GEDCOM:** `stable=true`, `net_delta=0` — alle tag-counts ✓ (inkl. PAGE/QUAY); CONC/CONT-Neuformatierung + HEAD-Rewrite by design akzeptiert
**Roundtrip GRAMPS:** `deep_test=true`, 60034 Checks ✓ — 2894 Personen, 910 Familien, 138 Quellen, 139 Orte — GRAMPS Desktop-Import bestätigt (gender, Medienlinks)
**Testdaten:** MeineDaten_ancestris.ged — 2811 Personen, 880 Familien, 130 Quellen, 4 Archive / Unsere Familie.gramps — 2894 Personen
**Aktuelle sw-Version:** v228 / Cache: `stammbaum-v228`

---

## Version 7.0 (Branch `v7-dev`, ab 2026-04-10)

### Strategische Ausrichtung: GRAMPS-Integration als iOS-Companion

**Kernprinzip:** GEDCOM bleibt vollständig erhalten — alle bestehenden Lade-, Edier- und Schreib-Funktionen für GEDCOM 5.5.1 bleiben unverändert. GRAMPS-Unterstützung ist eine *Erweiterung*, kein Ersatz.

**Warum GRAMPS XML statt GEDCOM als Austauschformat:**
GEDCOM-Export aus GRAMPS verliert systematisch: Ortshierarchien (GRAMPS top-level Ortsobjekte → flacher PLAC-Text), Tags/Kategorien, komplexe Beziehungstypen, Medienbeschreibungen, interne Handles. GRAMPS XML (.gramps, gzip) ist verlustfrei und öffentlich spezifiziert (grampsxml.dtd).

**Workflow-Ziel:**
```
GRAMPS (Desktop) ←→ GRAMPS XML (.gramps) ←→ PWA (iOS/iPad Companion)
GEDCOM (.ged)    ←→ GEDCOM 5.5.1          ←→ PWA (alle anderen Quellen)
```

---

### Architektur-Review-Befund (2026-04-10)

Vollständiges Review durchgeführt — Befund: **B+** (Roundtrip-Fundament solide, GRAMPS-Tags fragmentiert).

**Was bereits funktioniert:**
- `_UID` + `_STAT`: Parser + Writer roundtrip-stabil (Z.166/190 Parser, Z.272/273 Writer)
- Event TYPE beliebig editierbar (sw v164) — GRAMPS Fact Types funktionieren
- 10 Passthrough-Mechanismen — kein Datenverlust bei unbekannten Tags
- OneDrive `od_base_path`-Architektur kompatibel mit GRAMPS-Cloud-Workflow

**Bekannte Lücken (Priorität für v7):**
- `_GRAMPS_ID`: landet in `_passthrough[]`, nicht strukturiert → beim GRAMPS-Re-Import neue Referenzen
- `_ASSO`: verbatim passthrough, kein UI, kein TYPE-Handling
- NAME-Context-Duplikation: GIVN/SURN/NICK doppelt (strukturiert + passthrough) — vor GRAMPS-Roundtrip prüfen
- Mehrfach-Notizen: `p.noteTexts[]` im Parser, Writer/Formulare nur `p.noteText` (singular)
- Keine GRAMPS-Erkennung im Import-Dialog (kein `detectGRAMPS()`)
- AppState fehlen: `db.placeObjects{}`, `db.tags{}`, `db._grampsHandles{}`

---

### Code- und Architektur-Review (2026-04-12)

Review aller 24 JS-Dateien (~11.000 Zeilen) — Befund: **8/10** (Fundament solide; gezielte Lücken in Fehler-Handling und Daten-Konsistenz).

**Neu identifizierte kritische Lücken (nach Codecheck verifiziert):**
- **`parseErrors[]` nicht in allen Ladepfaden angezeigt** ✅ behoben sw v229 — `_processLoadedText` zeigte bereits Toast, aber `tryAutoLoad()` (IDB + localStorage-Pfad) und `revertToSaved()` fehlten; gleiche Prüfung ergänzt
- ~~**Geo-Koordinaten-Sync defekt**~~ — *Falsch-positiv*: Writer hat 2-stufigen Fallback (`extraPlaces` → `obj.lati/obj.long`); `markChanged()` invalidiert `_placesCache`; System korrekt
- ~~**`photo_` vs. `img:` IDB-Key-Inkonsistenz**~~ — *Falsch-positiv*: Zwei verschiedene Systeme (`photo_@I001@` = Demo-Avatare; `img:path` = Media-Cache); keine Überschneidung
- ~~**State-Pollution `_efMedia`/`_pfExtraNames`**~~ — *Falsch-positiv*: Beide werden in `showEventForm()` / `showPersonForm()` explizit zurückgesetzt
- ~~**IDB-Quota nicht gefangen**~~ — *Falsch-positiv*: Hauptpfad `saveToFileHandle()` hat `.catch(() => showToast(...))` bereits
- ~~**OneDrive 401 silent fail**~~ — *Falsch-positiv*: `_odGetToken()` ruft `odLogin()` auf → OAuth-Redirect (korrekt); stille Version nur für Auto-Connect beim Start

**Neu identifizierte Architektur-Verletzungen (bestätigt):**
- Form-State als lose Globals, nicht in `UIState` (ADR-003): `srcWidgetState`, `_pfExtraNames`, `_efMedia`, `_probandId`
- Virtual Scroll (`_vsRender()`) nur für Personen-Liste; Familien/Quellen/Orte ohne VS
- Notes-Datenmodell: `p.noteText`, `p.noteTexts[]`, `p.noteTextInline` — 3 Felder, eine Bedeutung
- Doppelte Label-Tabellen: `EVENT_LABELS` (gedcom.js) und `_SPECIAL_LBL` (ui-forms-event.js) parallel

**Bestätigt-stabile Bereiche:**
- Passthrough-System (10 Mechanismen) — kein Datenverlust bei unbekannten Tags ✓
- GRAMPS-Roundtrip (60034 Checks ✓) ✓
- CSP + Event-Delegation vollständig wirksam (seit v6 P1) ✓
- SW Network-first + Offline-Fallback ✓
- Virtual Scroll Personen/Familien — korrekte Binary-Search-Implementierung ✓

---

### Phase 1 — GRAMPS-GEDCOM-Kompatibilität ✅ ABGESCHLOSSEN (sw v190)

- [x] **`detectGRAMPS(gedText)`** — Heuristik via `HEAD SOUR GRAMPS` + `_GRAMPS_ID`; Flag `db._grampsMaster`
- [x] **`_GRAMPS_ID` strukturieren** — `p.grampId` / `f.grampId` / `s.grampId`
- ~~Import-Hinweis~~ — obsolet (Parser läuft stabil, kein expliziter Hinweis nötig)
- ~~NAME-Duplikation~~ — → Offene Architektur-Schulden
- ~~`_ASSO` dokumentieren~~ — → ARCHITECTURE.md (kein Sprint-Item)

---

### Phase 2 — GRAMPS XML Import (read-only) ✅ ABGESCHLOSSEN (sw v191–v196)

**`gramps-parser.js`** (668 Zeilen)
- [x] gzip via `DecompressionStream('gzip')` + DOMParser
- [x] Namespace-sicherer Lookup via `_byTag()` (getElementsByTagNameNS + Fallback)
- [x] Zwei-Pass-Parsing: Handle-Maps → vollständige Objekte
- [x] `db.placeObjects{}` — Ortshierarchie (type, pnames[], parentId, coord)
- [x] `db._grampsHandles{}` — Handle-zu-ID-Mapping
- [x] `db._sourceFormat = 'gramps'`, `db._grampsMaster = true`
- [x] Datei-Öffnen-Dialog: `.gramps` akzeptiert
- [x] famc `famId`-Fix (sw v192) — Elternverknüpfungen im Baum
- ~~`db.tags{}`~~ — → Phase 4
- ~~GRAMPS-Badge in Topbar~~ — → Phase 5.3
- ~~Orts-Hierarchie-Anzeige in UI~~ — → Phase 5.2/5.3

---

### Phase 3 — GRAMPS XML Export (Round-trip) ✅ ABGESCHLOSSEN (sw v193–v197)

**`gramps-writer.js`** (~700 Zeilen)
- [x] `writeGRAMPS(db)` → gzip Blob (CompressionStream)
- [x] Handle-Rekonstruktion aus `db._grampsHandles{}` — Original-Handles erhalten
- [x] Neue Handles für PWA-Entitäten: `_pwa{prefix}{counter}`
- [x] Orts-Hierarchie: `db.placeObjects` direkt mit `placeref`, `type`, `pname[]`
- [x] childref `frel`/`mrel` aus `f.childRelations`
- [x] Person/Familie/Event `_grampsAttrs[]` — alle GRAMPS-Attribute vollständig
- [x] `exportGRAMPS()` in storage-file.js — iOS Share / Desktop-Download
- [x] `_grampsRoundtripTest()` — Basis-Test (Counts + Stichprobe)
- [x] `_grampsDeepTest()` — 59896 Checks ✓ (alle Felder, Orte, Attribute, Handles)
- ~~Tags erhalten~~ — → Phase 4
- [ ] **Export-Hinweis "Zuletzt geladen: Datum"** — → Phase 4

---

### Phase 3b — UI-Ergänzungen (Höfe + Adress-Autocomplete) ✅ ABGESCHLOSSEN (sw v224–v228)

- [x] **RESI-Adress-Autocomplete** (sw v224) — `collectAddresses()` in `ui-forms-event.js`; Dropdown beim Adressfeld; bei Auswahl wird PLAC-Feld via `_addrToPlace()` auto-befüllt
- [x] **Höfe-Ansicht** (sw v224–v225) — Toggle Orte|Höfe im Orte-Tab; `buildHofIndex()` gruppiert alle RESI-Ereignisse nach `ev.addr`; Hof-Liste mit Bewohner-Anzahl + Jahrbereich; Sticky-Suchfeld
- [x] **Hof-Detail + Bewohner-Formular** (sw v227–v228) — `showHofDetail()` zeigt alle Bewohner; Inline-Formular: Person-Picker, vollständiges Datum (Qualifier + TT/Mon/JJJJ + BET-Bereich), Ort mit Autocomplete + Vorbelegung, Quelle/Seite/QUAY → erzeugt vollständiges RESI-Event bei Person
- [x] **Architektur-Cleanup** (sw v224) — Place-Funktionen aus `ui-views-source.js` → `ui-views-place.js`; neue Datei `ui-views-hof.js`; Safari-Toggle-Fix (explizit `classList.add/remove`, `type="button"`)

---

### Phase 4 — iOS-Companion-Optimierungen

- [ ] **Quick-Add** — neue schlanke View `ui-quick-add.js`: Vorname + Nachname + Geburtsjahr + optionale Familie; kein volles Formular; ~4h Aufwand
- [ ] **Foto-direkt-zu-Person** — iOS-Kamera → direkt an Person hängen ohne Umweg über Media-Browser
- [ ] **GRAMPS-Tag-Editor** — Tags hinzufügen/entfernen (read-only in Phase 2, editierbar hier)
- [ ] **Orts-Hierarchie-Editor** — einfaches Formular für Ortsangaben mit Hierarchie-Unterstützung
- [ ] **Export-Hinweis** — Topbar/Export-Dialog: "Zuletzt geladen: Datum" anzeigen

---

### Phase 5 — UI-Review: GRAMPS-Inhalte editierbar + Cross-Parser-Betrieb

**Ziel:** Alle Views und Formulare auf vollständige GRAMPS-Kompatibilität prüfen — sowohl beim Bearbeiten von GRAMPS-geladenen Inhalten als auch beim Cross-Betrieb (GEDCOM lesen → GRAMPS schreiben und umgekehrt).

#### 5.1 Cross-Parser-Betrieb (Konvertierung)

- [x] **GEDCOM → GRAMPS** — funktioniert; Orts-Hierarchie-Fix (sw v208), weitere Fixes v209–v220; bekannte Gaps: Orte nur flach (keine `placeObjects`), keine Tags, neue `_pwa`-Handles
- [x] **GRAMPS → GEDCOM** — funktioniert; Roundtrip-stable; GRAMPS-spezifisches degradiert verlustfrei (Orts-Hierarchie → PLAC-Text, `_grampsAttrs` → passthrough)
- [x] **Roundtrip-Test beider Pfade** — `_grampsRoundtripTest()` + `_grampsDeepTest()` (60034 Checks ✓) stabil seit sw v204
- [ ] **ASSO/RELA/ROLE → Witness-Roundtrip (GEDCOM↔GRAMPS)** — ASSO-Block → `_grampsWitnessRefs`; Writer: role ≠ Primary → `1 ASSO @ID@\n2 RELA {role}`; eigenständiger Sprint (~4h)
- [ ] **OBJE ohne FORM stabilisieren** — `m.form = null`; Writer nur ausgeben wenn nicht null; erste-Pass-Diff bleibt aktuell

#### 5.2 UI-Review: GRAMPS-Inhalte in Formularen

- [ ] **Personen-Formular** — `_grampsAttrs[]` anzeigen und editierbar machen (aktuell nur passthrough); Anzeige von `grampId`; `_grampsCall` (Rufname) im Formular sichtbar
- [ ] **Ereignis-Formular** — `_grampsAttrs[]` pro Ereignis anzeigen/editieren; Witness-Rollen anzeigen (read-only reicht für v7); GRAMPS-spezifische Event-Typen (z.B. „Beschäftigung", „Militärdienst") im Type-Dropdown
- [ ] **Familien-Formular** — `_grampsAttrs[]` auf Familien-Ebene anzeigen/editieren
- [ ] **Orts-Picker** — bei GRAMPS-Daten `db.placeObjects{}` als strukturierten Picker anbieten (statt Freitext); Hierarchie-Anzeige (Stadt → Kreis → Land)
- [ ] **Medien-Browser** — GRAMPS-Medienpfade (relativ zu `od_base_path`) korrekt auflösen; MIME-Typ-Anzeige; Beschreibungsfeld (`titl`) editierbar
- [ ] **Quellen-Formular** — Source-Notes (aktuell nur Text) im Formular editierbar; Anzeige ob Quelle aus GRAMPS (`grampId` sichtbar)
- [ ] **Notizen** — `db.notes{}` (GRAMPS-Notes mit Handle) in Detailansichten anzeigen; Editier-Pfad definieren (Erweiterung der Notizen-Überarbeitung aus P6)

#### 5.3 GRAMPS-spezifische Anzeige-Elemente

- [ ] **GRAMPS-Badge in Topbar** — wenn `db._grampsMaster === true`: Icon/Badge „GRAMPS" anzeigen; Export-Button zeigt `.gramps` als primäres Format
- [ ] **Orts-Hierarchie in Event-Detailansicht** — bei `placeId` gesetzt: vollständigen Pfad (`Stadt > Kreis > Land`) aus `db.placeObjects{}` auflösen und anzeigen
- [ ] **Tags anzeigen** — `db.tags{}` (Phase 4) in Personen-/Familien-Detailansicht als Badges; kein Editor nötig für v7

---

### Gesamtpriorisierung aller offenen Themen (Stand 2026-04-12)

Integriert: Schulden aus v6 (P3–P5) + neue Befunde aus Code-Review 2026-04-12.

---

#### P1 — Datenverlust-Risiken

- [x] **`parseErrors[]` in allen Ladepfaden anzeigen** ✅ sw v229 — `tryAutoLoad()` (IDB + localStorage) und `revertToSaved()` zeigen jetzt denselben Toast wie `_processLoadedText`; `DEV sw vXXX`-Toast entfernt
- ~~**Geo-Koordinaten-Sync**~~ — *Falsch-positiv* nach Codecheck; System korrekt (Writer 2-stufiger Fallback, Cache wird in `markChanged()` invalidiert)
- ~~**`photo_` → `img:` IDB-Key-Migration**~~ — *Falsch-positiv*; zwei unabhängige Systeme
- ~~**State-Reset `_efMedia`/`_pfExtraNames`**~~ — *Falsch-positiv*; Reset in `showEventForm()`/`showPersonForm()` vorhanden
- ~~**IDB-Quota-Ausnahme fangen**~~ — *Falsch-positiv*; Hauptpfad zeigt bereits Toast
- ~~**OneDrive 401 behandeln**~~ — *Falsch-positiv*; `_odGetToken()` redirectet zu Login (korrekt)

---

#### P2 — Architektur-Verletzungen

- [ ] **Form-State in UIState konsolidieren** — `srcWidgetState`, `_pfExtraNames`, `_efMedia`, `_probandId` als lose Globals; nach `UIState._formState{}` verschieben (ADR-003) (~3h)
- [ ] **Virtual Scroll auf alle Listen** — `_vsRender()` nur Personen; Familien-/Quellen-/Orte-Liste unoptimiert ab 500+ Einträgen (~3h)
- [ ] **JS-seitige `onclick=` entfernen** — P1 v6 hat index.html bereinigt; direkte `.onclick =`-Zuweisungen im JS verbleiben (ui-forms-event.js L30, ui-forms.js L353) → vollständig auf `data-action`-Delegation (~2h)
- [ ] **`_navHistory` + `_probandId` in UIState** — loose Globals in ui-views.js, inkonsistent mit ADR-003; gleichzeitig Tree-History und Detail-History auf einheitliches System bringen (~3h)

---

#### P3 — Performance

- [ ] **Globale Suche indexieren** — O(n×m) bei 2800+ Personen ~80ms/Tastendruck; Debounce + vorberechneter Index (`runGlobalSearch` in ui-views.js)
- [ ] **`applyPersonFilter()` Debounce** — inkonsistent: `filterFamiliesDebounced` hat Debounce, `applyPersonFilter` nicht (ui-views.js L676–689)
- [ ] **`touchmove` Pinch-Zoom throttlen** — 100+/s direkt auf DOM, Frame-Drops auf älteren iPhones (ui-views-tree.js) → `requestAnimationFrame`
- [ ] **Virtual Scroll profilen** — Spacer-Logik verifizieren; Threshold 500 ggf. anpassen

---

#### P4 — Release-Hygiene & Code-Qualität

- [ ] **DEV-Diagnose entfernen** — OD-Token-Details + SW-Version-Toast (`DEV sw vXXX`) aus Menü und storage.js
- [ ] **Debug-Funktionen aus gramps-writer.js auslagern** — `_debug_minimal()`, `test_gramps()`, `test_deepQuery()`, `test_roundtrip()` (L728–1072, ~340 LOC) → separate `gramps-test.js`, nur per URL-Param `?debug=1` geladen
- [ ] **Notes-Datenmodell konsolidieren** — `p.noteText`, `p.noteTexts[]`, `p.noteTextInline` — 3 Felder für dasselbe Konzept; Single source of truth definieren (gedcom-parser.js, gedcom-writer.js, ui-forms.js)
- [ ] **Konstanten für Magic Strings** — `MODALS{}` + `EL{}` Konstanten; `EVENT_LABELS` (gedcom.js) und `_SPECIAL_LBL` (ui-forms-event.js) zusammenführen; 50+ verstreute String-Literale ersetzen
- [ ] **Generische `initAutocomplete()`** — `_initEtypeAutocomplete()` (ui-forms-event.js L41–77) und `initPlaceAutocomplete()` (ui-forms.js L775–816) strukturell identisch; gemeinsame Funktion `initAutocomplete(inputId, ddId, fetchFn)` spart ~60 Zeilen
- [ ] **Media-Rendering-Helfer** — `_renderEfMedia()`, `_renderMediaList()`, inline Rendering in Person-/Familien-Views konsolidieren
- [ ] **PEDI vs. `_FREL`/`_MREL` Precedence im Code dokumentieren** — Vorrang im Parser kommentieren; Testfall für gemischten Input ergänzen
- [ ] **Rendering-Helper extrahieren** — `renderEventBlock()`, `renderSourceBadge()`, `renderMediaPhoto()` aus Person/Familie/Quelle-Views (~15% Duplikation)

---

#### P5 — UX-Schulden

- [ ] **INDI-Notes Editierproblem** — mehrere Notes werden beim Speichern zusammengeführt; Edit-Pfad verlustbehaftet
- [ ] **Cmd+Z granulares Undo** — History-Stack auf AppState erforderlich; eigener Sprint
- [ ] **`showToast(type)`** — `type ∈ {success, warning, error}` + CSS-Differenzierung; verbessert Wahrnehmbarkeit kritischer Meldungen
- [ ] **`confirm()` → Modal** — 6+ Stellen; `confirmModal(msg)` → Promise; einheitliche Optik
- [ ] **Formular Progressive Disclosure** — einheitliches Pattern für optionale Felder definieren (aktuell jedes Formular eigene Logik)
- [ ] **`handleError()` zentralisieren** — 181 try/catch, 13 console.error, viele `.catch(() => {})` → zentrale `handleError(e, context, userMsg)` Funktion; besonders kritisch in storage.js + onedrive.js

---

#### P6 — Neue Features (erst nach P1+P2)

- [ ] Zeitleiste (`ui-timeline.js`) — Personen/Ereignisse auf horizontaler Zeitachse
- [ ] Nachkommen-Baum (top-down SVG)
- [ ] Karten-Ansicht (Apple Maps Link-Cluster)
- [ ] Statistik-Dashboard (Gesamtzahlen, Vollständigkeit, häufigste Namen/Orte)
- [ ] Duplikat-Erkennung (gleicher Name + Geburtsjahr ±2, nur Anzeige)
- [ ] Rufname (NICK / `_RUFNAME`) in Detailansicht + Baum-Karten
- [ ] **Notizen-Überarbeitung (gesamthaft)** — welche Entitäten haben Notizen; Editier-Pfad für alle; Anzeige vereinheitlichen
- [ ] ASSO/RELA/ROLE → Witness-Roundtrip GEDCOM↔GRAMPS (Phase 5.1, ~4h)
- [ ] OBJE ohne FORM stabilisieren (Phase 5.1)

---

## Version 6.0 (Branch `v6-dev`, 2026-04-05 — 2026-04-10) — ABGESCHLOSSEN

Code-, Architektur- und Sicherheits-Review durchgeführt 2026-04-06 — Befund: B+ (Security A–, Architektur B, Performance B–, Code-Qualität B, PWA B). Gesamtbewertung: solide Basis, gezielter Abbau technischer Schulden.

Erweitertes Architektur- und UX-Konsistenz-Review durchgeführt 2026-04-08 — Schwerpunkte: Event-Handler-Konsolidierung, Code-Duplikation, Magic Strings, Feedback-Mechanismen, Formular-Inkonsistenz, fehlende Debounces.

Priorisierung der Schulden (Stand 2026-04-10):
```
P1 Sicherheits-Blocker  →  onclick= Migration (CSP vollständig wirksam)       ✅ sw v163
P2a Datenqualität       →  Ereignis-TYPE für alle Event-Typen editierbar        ✅ sw v164
P2 Maintainability      →  ~~parseGEDCOM aufteilen~~ (verworfen) · writeGEDCOM aufgeteilt ✅ sw v167 · storage.js aufgeteilt ✅ sw v166
P3 Performance          →  offen → v7
P4 Release-Hygiene      →  offen → v7
P5 UX-Schulden          →  offen → v7
P6 Neue Features        →  offen → v7 (GRAMPS-Integration)
```

---

### Schwerpunkt 1: Sicherheit & Aufräumen — ✅ ABGESCHLOSSEN

- [x] **Aufräumen** — `index_v1.2.html` (4011 Z.) und `test_idempotency.html` gelöscht (sw v153)
- [x] **Content Security Policy** — `default-src 'self'`, `connect-src` auf OneDrive-Endpunkte begrenzt, `object-src 'none'`, `frame-ancestors 'none'` (sw v153); `script-src 'unsafe-inline'` entfernt → sw v163
- [x] **Memory-Leak: Photo-Cache** — `_odPhotoCache` auf LRU-Cache (Max 30 Einträge) umgestellt; `clear()` + `clearByPrefix()` (sw v153)
- [x] **Service Worker Offline-Fallback** — `offline.html` + PRECACHE; `destination === 'document'`-Check (sw v162)
- [x] **CSS aus `index.html` auslagern** — ~800 Z. Inline-CSS → `styles.css` (sw v161)

---

### P1 — Sicherheits-Blocker — ✅ ABGESCHLOSSEN (sw v163)

- [x] **Alle inline Handler auf `data-action`-Delegation migriert** — 121 `onclick=`, 10 `oninput=`, 4 `onblur=`, 4 `onchange=` in `index.html` vollständig entfernt; `unsafe-inline` aus `script-src` entfernt; CSP jetzt wirksam. `_CLICK_MAP` um 70 neue Aktionen erweitert, `data-change`/`data-input`/`data-blur`-Delegation ausgebaut (ui-views.js, sw v163).

---

### P2 — Maintainability (Aufwand steigt mit jeder Erweiterung)

- [~] **`parseGEDCOM()` aufteilen** — ❌ verworfen: Parser ist eine Single-Pass-State-Machine mit tiefem Shared State (`_ptDepth`, `_ptTarget`, `evIdx`, `lastSourVal` …). Sub-Funktionen würden den Lesefluss verschlechtern (ctx-Objekt nötig, Sprünge zwischen Funktionen). Code ist roundtrip-stabil und durch Section-Kommentare (`// ── INDI ──`) navigierbar — Aufwand ohne operativen Nutzen.
- [x] **`writeGEDCOM()` in Subfunktionen aufteilen** — `writeINDIRecord`, `writeFAMRecord`, `writeSOURRecord`, `writeREPORecord`, `writeNOTERecord`; `writeSourCitations` / `writeCHAN` / `_mediaFormStr` als Hilfsfunktionen; `geoLines` + `eventBlock` aus Inner-Functions herausgehoben; FAM-events-Duplikation behoben ✅ sw v167
- [x] **`storage.js` aufteilen** — `storage-file.js` (IDB-Primitives + File System Access API + Export/Save + File Loading, ~305 Z.) + `storage.js` (Demo/Backup/Init/Foto-Export, ~345 Z.) ✅ sw v166

---

### P3 — Performance

- [ ] **Globale Suche indexieren** — O(n×m) bei 2800+ Personen ~80ms pro Tastendruck ohne Debounce; Debounce + vorberechneter Index (ui-views.js `runGlobalSearch`)
- [ ] **`applyPersonFilter()` Debounce einbauen** — aktuell kein Debounce, während `filterFamiliesDebounced` ihn hat; inkonsistent (ui-views.js:676–689)
- [ ] **`touchmove` Pinch-Zoom mit `requestAnimationFrame` throttlen** — feuert aktuell 100+/s direkt auf DOM-Properties, Frame-Drops auf älteren iPhones (ui-views-tree.js)
- [ ] **Virtual Scroll für Quellen-Liste** — Source-Liste rendert aktuell alle Einträge ohne VS; ab ~500 Quellen spürbar; analog zu Person-/Familienliste implementieren (ui-views-source.js)
- [ ] **Virtual Scroll bei 2800+ Einträgen profilen** — Spacer-Logik auf Korrektheit verifizieren; Threshold 500 ggf. anpassen

---

### P4 — Release-Hygiene & Code-Qualität

- [ ] **DEV-Diagnose im Menü entfernen** — OD-Token-Details (`OD: ...`, `Token: ...`) und SW-Version-Toast (`DEV sw vXXX`) vor Abschluss v6 entfernen (`index.html` menuVersionInfo-Block kürzen, `storage.js` DEV-Blöcke löschen)
- [ ] **`_navHistory` + `_probandId` in `UIState` konsolidieren** — aktuell lose Globals in ui-views.js, inkonsistent mit ADR-003; gleichzeitig Tree-History (`UIState._treeHistory`) und Detail-History (`_navHistory`) auf einheitliches System bringen
- [ ] **Rendering-Helper extrahieren** — `renderEventBlock()`, `renderSourceBadge()`, `renderMediaPhoto()` aus Person/Familie/Quelle-Views (~15% Duplikation); sinnvoll vor ersten neuen Views
- [ ] **Konstanten für Magic Strings** — 50+ Modal-IDs und Element-IDs als String-Literale verteilt (`'modalPerson'`, `'detailContent'`, `'modalEvent'` …); Konstanten-Objekte `MODALS{}` und `EL{}` einführen; verhindert Tipp-Fehler und erleichtert Umbenennungen
- [ ] **Generische `initAutocomplete()`-Funktion** — `_initEtypeAutocomplete()` (ui-forms-event.js:41–77) und `initPlaceAutocomplete()` (ui-forms.js:775–816) sind strukturell identisch; eine generische Funktion `initAutocomplete(inputId, ddId, fetchFn)` reduziert ~60 Zeilen Duplikat
- [ ] **Media-Rendering-Helfer vereinheitlichen** — `_renderEfMedia()` (ui-forms-event.js), `_renderMediaList()` (ui-forms.js) und inline Rendering in Person-/Familien-Views leisten dasselbe (Array → Rows + Delete-Buttons); auf eine gemeinsame Funktion konsolidieren
- [ ] **JS-seitige `onclick=`-Handler entfernen** — P1 hat `index.html` bereinigt; es verbleiben direkte `el.onclick = ...`-Zuweisungen im JS-Code (z.B. ui-forms-event.js:30, ui-forms.js:353); vollständig auf `data-action`-Delegation migrieren

---

### P5 — UX-Schulden (hoher Aufwand, klarer Nutzen)

- [ ] **Mehrere inline INDI-Notes: Editierproblem** — beim Speichern werden mehrere Notes zu einer zusammengeführt (Roundtrip ohne Edit stabil; Edit-Pfad verlustbehaftet); betrifft auch Duplikat-Erkennung
- [ ] **Cmd+Z = granulares Undo** — aktuell "Revert to Saved"; History-Stack auf `AppState` erforderlich; eigener Sprint
- [ ] **`showToast()` nach Typ differenzieren** — aktuell wird `showToast()` undifferenziert für Erfolg (`✓ Person gespeichert`) und Fehler (`⚠ Mindestens ein Elternteil`) genutzt; `showToast(msg, type)` mit `type ∈ {success, warning, error}` + entsprechendes CSS-Styling (verschiedene Hintergrundfarben); verbessert Wahrnehmbarkeit kritischer Meldungen erheblich
- [ ] **`confirm()` durch eigenes Modal ersetzen** — nativer Browser-Dialog für Lösch-Bestätigungen (aktuell 6+ Stellen); nicht gestylebar, auf iOS in bestimmten Kontexten blockiert; eigene `confirmModal(msg)` → Promise-Rückgabe; einheitliche Optik mit restlicher UI
- [ ] **Formular-Stile vereinheitlichen (Progressive Disclosure)** — jedes Formular hat eigene Logik für optionale Felder: Person versteckt sie standardmäßig, Source nutzt Toggle-Buttons, Event nutzt `onEventTypeChange()`; einheitliches Pattern definieren und umsetzen
- [ ] **Fehler-Handling standardisieren** — 181 try/catch-Blöcke, aber nur 13 console.error-Aufrufe; viele silent fails (`.catch(() => {})`); zentrale `handleError(e, context, userMsg)` Funktion einführen; besonders kritisch in storage.js und onedrive.js wo Datenverlust droht

---

### P6 — Neue Features (erst nach P1+P2)

- [ ] Zeitleiste (`ui-timeline.js`) — Personen/Ereignisse auf horizontaler Zeitachse
- [ ] Nachkommen-Baum (top-down SVG)
- [ ] Karten-Ansicht (Apple Maps Link-Cluster oder leaflet.js)
- [ ] Statistik-Dashboard (Gesamtzahlen, Vollständigkeit, häufigste Namen/Orte)
- [ ] Duplikat-Erkennung (gleicher Name + Geburtsjahr ±2, nur Anzeige)
- [x] Volltextsuche — Personen-/Familien-/Quellenliste + globale Suche: Ereignis-Orte, eventType, Notizen, Quellen-Text durchsucht; Parität zwischen allen drei Sucheinstiegen hergestellt (sw v184–v186)
- [ ] Rufname — Definition und Anzeige des Rufnamens (GEDCOM: `NICK` oder `_RUFNAME`); Anzeige in Detailansicht, Karten im Baum und Suchergebnissen
- [ ] **Notizen-Überarbeitung (gesamthaft)** — Aktuell zu wenige Eingabe- und Bearbeitungsmöglichkeiten; Analyse und Überarbeitung erforderlich:
  - Welche Entitäten haben Notizen? (Person, Familie, Quelle, Ereignis, Archiv)
  - Wo können Notizen derzeit eingegeben/bearbeitet werden?
  - Mehrere Notizen pro Person (inline + Referenz-Notizen) — Editierproblem (P5)
  - Notizen an Ereignissen editierbar machen
  - Notizen an Quell-Zitierungen (SOUR.NOTE) editierbar machen
  - Anzeige von Notizen vereinheitlichen (Detailansicht Person/Familie/Quelle)

---

### Bekannte Fehler / kleine Erweiterungen

- [x] Ereignis-Gruppierung in Personendetail: EVEN-Ereignisse mit unterschiedlichem `eventType` wurden unter einem Block zusammengefasst — behoben: Gruppierungsschlüssel `type:eventType` (ui-views-person.js)
- [x] Ereignis-TYPE nur für FACT/MILI/EVEN editierbar — jetzt für alle Event-Typen; Label-Darstellung `"Beruf: Staatsangehörigkeit"` für nicht-EVEN/FACT; EVEN-Details im Roundtrip-Report (sw v164)
- [x] EVEN-Details im Roundtrip-Report: ID, Name, TYPE, Datum, Ort pro EVEN-Eintrag (sw v164)
- [x] RESI mit ADDR/DATE/PLAC: Parser + Formular korrekt; Anzeige in Personendetail (addr vor date/place) (sw v178)
- [x] http links in quellenangaben klickbar — `linkifyUrls()` in `ui-views.js`, genutzt in Quellendetail (sw v168)
- [x] LON/LAT editierbar — Koordinaten-Felder im Event-Formular für alle Event-Typen incl. BIRT/DEAT/CHR/BURI (sw v168)
- [x] bei einem quellenbezug sollten auch die Angaben zu seiten und ein qualitätsindentikator eingeführt werden — PAGE + QUAY jetzt auch im Personen-Hauptformular (`pf`) und Familien-Event-Formular (`fev`) (sw v168)
- [x] in der Quellendetailansicht werden alle referenzierende Personen und Familien aufgeführt - ergänze jeweils die Angaben zu PAGE und QUAY — `_collectSourceMeta()` durchsucht alle Events/topSources (sw v168)

---

## Version 5.0 (Branch `v5-dev`, 2026-03-30 — 2026-04-05) — ABGESCHLOSSEN

### Schwerpunkt 1: Weitere Darstellungen

Ziel: Ergänzende Visualisierungen neben der Sanduhr — besonders nutzbar auf Desktop und iPhone Querformat.

#### Fan Chart (Fächer-/Halbkreisdiagramm) — ✅ ABGESCHLOSSEN (sw v83–v84)
- [x] Vorfahren als konzentrische Halbkreis-Segmente (Probanden-Mitte, Eltern 1. Ring, Großeltern 2. Ring usw.)
- [x] Rendering: SVG, polar coordinates; Segmente klickbar → showFanChart(id) oder showDetail(id)
- [x] Konfigurierbar: 3–6 Generationen; Buttons in Topbar
- [x] Toggle-Button `◑` im Baum-View; Desktop + Mobile
- [x] Neue Datei `ui-fanchart.js`

#### Generationen-Buttons im Sanduhr-Baum — ✅ ABGESCHLOSSEN (sw v84)
- [x] Buttons 2/3/4/5/6 in Topbar (nur bei tree-active); Standard 5
- [x] Dynamische Positionsfunktionen für bis zu 5 Ahnen-Ebenen (32 Slots)
- [x] Portrait bleibt auf max. 2 Ebenen begrenzt

#### Zeitleiste — Priorität 2
- [ ] Personen/Ereignisse auf horizontaler Zeitachse (Geburt, Heirat, Tod)
- [ ] Gefiltert nach aktueller Person + direkte Vorfahren/Nachkommen
- [ ] Neue Datei `ui-timeline.js`

#### Nachkommen-Baum — Priorität 3
- [ ] Probanden oben, Kinder/Enkel nach unten (top-down SVG)

#### Karten-Ansicht — Priorität 4
- [ ] Geburts-/Sterbeorte auf Landkarte (Apple Maps Link-Cluster oder leaflet.js)

---

### Schwerpunkt 2: Performance + UX

#### Virtuelles Scrollen ✅ sw v145
- [x] Listen >500 Einträge: nur sichtbare Zeilen + Puffer im DOM rendern
- [x] Betrifft: Personen-Liste (2811 Eintr.), Familien-Liste (880 Eintr.)
- [x] Kein Framework; Spacer-div-Ansatz, Binary-Search O(log n)

#### Statistik-Dashboard — Priorität 2
- [ ] Neues Modal oder eigener Tab: Gesamtzahlen, Vollständigkeit, häufigste Namen/Orte
- [ ] Karten-Grid (Personen, Familien, Quellen, Medien, fehlende Daten %)

#### Offline-Sync-Indikator — ✅ ABGESCHLOSSEN (sw v152)
- [x] Floating Pill über Bottom-Nav: "● Nicht gespeichert" + Speichern-Button
- [x] Button adaptiv: ☁ Speichern (OD) · ↑ Teilen (iPhone) · ↓ Speichern (Desktop)
- [x] Global in allen Views sichtbar; erscheint/verschwindet via `updateChangedIndicator()`

---

### Schwerpunkt 3: Datenqualität

#### Erweiterte Events (restliche Passthrough-Reste) — Priorität 1
- [x] FAM-Events: `DIV`, `DIVF`, `ENG`/`ENGA` — strukturiert statt passthrough ✅ (sw v134–v135)
- [x] FAM-Events: Formularfelder für DIV/DIVF/ENG (Datum, Ort) — "Ereignisse"-Sektion in Familiendetail, Verlobung aus Haupt-Edit in Ereignisliste verschoben ✅ (sw v147)
- [x] INDI-Events: `DSCR`, `IDNO`, `SSN` — strukturiert statt passthrough ✅ (sw v148)

#### Ereignisliste Personendetail — ✅ ABGESCHLOSSEN (sw v150)
- [x] Gleiche Ereignistypen als Block gruppiert darstellen (alle OCCU zusammen, alle RESI zusammen etc.)
- [x] Innerhalb jedes Blocks: Ereignisse nach Datum sortiert (undatierte ans Ende)

#### Duplikat-Erkennung — Priorität 2
- [ ] Personen mit gleichem Name + Geburtsjahr (±2): Hinweis + Vergleichs-Ansicht
- [ ] Kein automatisches Merge — nur Anzeige + manuelle Entscheidung

#### Volltextsuche — Priorität 3
- [ ] Suche über Ereignis-Orte, Quellen-Titel, Notizen (nicht nur Name)
- [ ] Erweiterung des bestehenden Suchfelds in Personen-/Quellen-Liste

---

### Schwerpunkt 4: OneDrive-Integration

#### Startsequenz — ✅ ABGESCHLOSSEN (sw v151)
- [x] Auswahl-Dialog bei Neustart (kein Session-Token): "☁ Von OneDrive laden" vs. "📱 Lokal"
- [x] Gleiche Session (Token in sessionStorage): direkt von OneDrive laden, kein alter IDB-Stand
- [x] OAuth-Return mit `od_autoload_pending`: nach Login automatisch Datei laden
- [x] Timeout 8s + stiller Fallback auf IDB bei Fehler/Offline
- [x] `_odRefreshTokenSilent()` — Token-Refresh ohne OAuth-Redirect (kein ungewolltes Login)
- [x] `window._odCallbackPromise` — `window.load` wartet auf laufenden OAuth-Callback

---

### Schwerpunkt 5: Sonstiges

#### Offene Fehler — ✅ ABGESCHLOSSEN (sw v149–v150)
- [x] Bug: Neue Quellenzuordnung bei FAM-/INDI-Ereignis erschien nicht sofort in Quellendetail „Verwendet in" — behoben durch `_rebuildPersonSourceRefs()` / `_rebuildFamilySourceRefs()` nach jedem Event-Save/Delete (sw v149)
- [x] Bug: `saveFamily()` setzte `sourceRefs` nur aus Hochzeits-Quellen → Verlobung/Scheidung-Quellen fehlten in Referenzliste — behoben sw v149

#### Fehler allgemein — ✅ ABGESCHLOSSEN (sw v85)
- [x] Fan Button wird nicht angezeigt ✅ (sw v84)
- [x] bei 'Medien einfügen' den vollständigen Pfad abspeichern ✅ (sw v85)
- [x] bei 'Medien einfügen' mit dem in der Konfiguration definierten Dateipfad starten ✅ (sw v85)
- [x] neues Sonstiges Ereignis speichert den Typ nicht ✅ (sw v85)
- [x] ermögliche das Löschen von Ereignissen ✅ (sw v85)

#### Fehler Mobile — ✅ ABGESCHLOSSEN (sw v91–v92)
- [x] Querformat mit Liste: Suchzeile Gap zur Topbar ✅ (sw v92)
- [x] Personen Detail: Foto Anzeige nach Verknüpfung neues Bild ✅ (sw v91)

#### Fehler Desktop — ✅ ABGESCHLOSSEN (sw v92–v93)
- [x] Pfeil links: ein Tastendruck → zwei Schritte zurück ✅ (sw v92–v93)

#### Refactoring: ui-views.js Split — ✅ ABGESCHLOSSEN (sw v94–v95)
- [x] `ui-views.js` (1963 Z.) aufgeteilt in 5 Module (sw v94)
- [x] `showSourceDetail()` aus `ui-forms.js` in `ui-views-source.js` ausgelagert (sw v95)

#### Medien-Handling Überarbeitung — ✅ ABGESCHLOSSEN (sw v96–v99)
- [x] Relative OneDrive-Pfade: `_odPickSelectFile` speichert `fullPath` direkt (sw v96)
- [x] Bevorzugtes Medium (`_PRIM Y`) in Titelleiste Person/Familie/Quelle (sw v96)
- [x] Bug fix: `_odEditPickMode` zeigte keine Dateien (sw v97)
- [x] `↑ Übergeordneter Ordner`-Button im Picker (sw v97–v98)
- [x] `_odGetMediaUrlByPath(path)` — path-based OneDrive API, ein Pfad = eine Datei (sw v99)
- [x] `od_filemap` nur noch Legacy-Fallback; Pfad in `m.file` ist Single Source of Truth (sw v99)
- [x] Kamera-Fotos werden per PUT-API direkt in konfigurierten OneDrive-Ordner hochgeladen (sw v100)

#### OneDrive-Pfad-Architektur: od_base_path — ✅ ABGESCHLOSSEN (sw v107–v112)
- [x] `@microsoft.graph.downloadUrl` statt `/content`-Redirect (CORS-Fix) (sw v107)
- [x] Picker-Pfad filtert `'OneDrive'`-Prefix konsistent (sw v108)
- [x] Ordner-Picker startet bei konfiguriertem Ordner (nicht Root) (sw v109)
- [x] `od_base_path` = einzige absolute Referenz; alle `m.file` relativ dazu (sw v110)
- [x] `od_photo_folder` / `od_docs_folder` mit `relPath`-Feld (sw v110)
- [x] `od_base_path` automatisch aus GED-Datei `parentReference.path` ableiten (sw v111)
- [x] Einstellungen: Startpfad separat anzeigen; Ordner als relativer Pfad (sw v112)

#### PEDI + Eltern-Kind-Quellen — ✅ ABGESCHLOSSEN (sw v121–v124)
- [x] PEDI statt `_FREL`/`_MREL` — GEDCOM 5.5.1 Standard (sw v121)
- [x] UI: inline PEDI-Dropdown in Familien-Ansicht + Suffix in Personen-Ansicht (sw v122)
- [x] `#modalChildRel` — PEDI + Quellenangabe pro Kind-Verhältnis (sw v123)
- [x] `.src-badge §N`-Stil für Kind-Verhältnis-Quellen (sw v124–v126)

#### Quellen-Badges + OneDrive-Fix + DIV/DIVF strukturiert — ✅ ABGESCHLOSSEN (sw v125–v135)
- [x] `.src-badge §N` einheitlich für alle Kontexte; Tooltip = `s.title || s.abbr` (sw v125–v127)
- [x] `@@S2@@` doppelte @-Bug in Source-IDs behoben (sw v128–v129)
- [x] OneDrive-Speichern: robuste Fehlerbehandlung, 30s Timeout, Pfad im Toast (sw v130–v133)
- [x] DIV / DIVF / ENG strukturiert in Parser + Writer + Anzeige (sw v134)
- [x] ENGA im Passthrough-Filter; Menü OneDrive-first; Roundtrip explizit (sw v135)

---

### Schwerpunkt 5 — OCR
- [ ] Konzept in `OCR.md`

---

---

### Schwerpunkt 6: Code-Qualität & Sicherheit (aus Review 2026-04-05)

#### Sicherheit — Priorität 1

- [x] **OAuth-Token von `localStorage` → `sessionStorage`** — Token sind aktuell im DevTools lesbar und bei XSS abgreifbar; betrifft OneDrive-Vollzugriff (onedrive.js, storage.js)
- [x] **Service Worker: Netzwerk-Timeout einbauen** — Network-first ohne Fallback-Timeout lässt App bei hängendem Netz unbegrenzt warten; Fix: 4s-Timeout → Cache-Fallback (sw.js)
- [x] **`demo.ged` aus Produktions-Cache entfernen** — wird bei jedem Nutzer unnötig mitgeladen (sw.js)

#### Performance — Priorität 2

- [ ] **`touchmove` Pinch-Zoom mit `requestAnimationFrame` throttlen** — feuert aktuell 100+/s direkt auf DOM-Properties, Frame-Drops auf älteren iPhones (ui-views-tree.js)
- [ ] **Globale Suche indexieren** — O(n×m) auf alle Personen/Felder ohne Cache; spürbar ab ~1000 Personen; Debounce + vorberechneter Index (ui-views.js)

#### Refactoring — Priorität 3

- [x] **Inline Event-Handler durch Event-Delegation ersetzen** — `oninput="updateSrcPage(...)"` u.ä. sind XSS-anfällig bei unvollständigem Escaping und erzeugen Memory-Leaks bei Modal-Reopen (ui-forms.js, viele ui-*.js)
- [x] **GEDCOM-Parser: Error-Sammler einbauen** — ungültige Zeilen werden aktuell still ignoriert; `parseErrors[]`-Array als optionaler zweiter Parameter; Level-Validierung (max. lv=4) (gedcom-parser.js) ✅ (sw v138)
- [x] **`writeGEDCOM()` in Subfunktionen aufteilen** — `writeINDIRecord`, `writeFAMRecord`, `writeSOURRecord`, `writeREPORecord`, `writeNOTERecord`; `writeSourCitations` / `writeCHAN` / `_mediaFormStr` als Hilfsfunktionen; `geoLines` + `eventBlock` aus Inner-Functions herausgehoben; FAM-events-Duplikation behoben ✅ sw v167
- [x] **`catch { return null }` durch echtes Error-Handling ersetzen** — maskiert alle OneDrive-API-Fehler, erschwert Debugging (onedrive.js) ✅ (sw v139)
- [x] **`onedrive.js` in 3 Module aufteilen** — 946-Zeilen-Monolith; `onedrive-auth.js` (OAuth-Flow, Token), `onedrive-import.js` (Foto-Import-Wizard, Ordner-Browser), `onedrive.js` (Media-URL, File-I/O, Pfad-Helfer, Settings) ✅ (sw v140)
- [x] **`ui-forms.js` in 3 Module aufteilen** — 1036 Zeilen; `ui-forms-event.js` (Event-Formular ~170 Z.), `ui-forms-repo.js` (Archiv/Picker/Detail ~163 Z.), `ui-forms.js` (Person/Familie/Quelle + Utilities ~706 Z.) ✅ (sw v141)

---

## Offene Architektur-Schulden

Priorisierte Liste — Details und Kontext in v6.0-Abschnitt oben.

**Offen (priorisiert):**
- ~~**P1** `onclick=`-Handler-Migration (HTML)~~ → sw v163 ✓
- ~~**P2**~~ ~~`parseGEDCOM()` aufteilen~~ → verworfen · ~~`writeGEDCOM()` aufteilen~~ → sw v167 ✓ · ~~`storage.js` aufteilen~~ → sw v166 ✓
- **P3** Globale Suche indexieren (O(n×m)) · `applyPersonFilter()` Debounce · `touchmove` throttlen · Virtual Scroll profilen · Source-Liste VS
- **P4** DEV-Diagnose entfernen · `_navHistory`/`_probandId` in UIState · einheitliches History-System (Tree+Detail) · Rendering-Helper extrahieren · Magic-String-Konstanten · `initAutocomplete()` + Media-Render-Helfer · verbleibende JS-seitige `onclick=`-Reste
- **P5** INDI-Notes Editierproblem · Cmd+Z granulares Undo · `showToast(type)` · `confirm()` → eigenes Modal · Formular Progressive Disclosure · `handleError()` zentralisieren
- Familien-Avatar: CSS-Symbol statt OS-Emoji

**Behoben:**
- ~~Virtuelles Scrollen für Listen >500 Einträge~~ → sw v145/v146
- ~~DIV/DIVF/ENG: Formularfelder für Datum/Ort~~ → sw v147
- ~~OAuth-Token in `localStorage`~~ → sw v136
- ~~Inline Event-Handler in HTML-Strings (`index.html`)~~ → sw v137, sw v163
- ~~GEDCOM-Parser ohne Fehler-Sammler~~ → sw v138
- ~~`sourceRefs` nach Event-Save nicht aktualisiert~~ → sw v149
- ~~Ereignisliste unsortiert/ungruppiert~~ → sw v150
- ~~Service Worker: weißer Screen bei leerem Cache + Netz-Timeout~~ → sw v162

---

## Getestete Umgebungen

| Plattform | Browser | Laden | Speichern |
|---|---|---|---|
| iPhone (iOS 17+) | Safari | ✅ | ✅ OneDrive (primär) / Share Sheet (lokal) |
| iPhone (iOS 17+) | Chrome | ✅ | ✅ OneDrive (primär) |
| Mac | Safari | ✅ | ✅ OneDrive (primär) / Download (lokal) |
| Mac | Chrome | ✅ | ✅ OneDrive (primär) / Direktes Speichern (lokal) |
| Mac | Firefox | ✅ | ✅ OneDrive (primär) / Download (lokal) |
| Android | Chrome | ✅ | ✅ OneDrive (primär) |

---

## Datei-Statistiken (MeineDaten_ancestris.ged)

```
Personen:      2811
Familien:       880
Quellen:        130
Archive:           4
Notizen:         195
Dateigröße:    ~5 MB  (83152 Zeilen)
```
