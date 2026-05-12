# Roadmap

Detaillierte Sprint-Geschichte aller abgeschlossenen Versionen: `CHANGELOG.md`

---

## Aktueller Stand

| Version | Branch | Status |
|---|---|---|
| 4.0 | `main` | Abgeschlossen (2026-03-30) — Details: CHANGELOG.md |
| 5.0 | `main` | Abgeschlossen (2026-04-05) — Details: CHANGELOG.md |
| 6.0 | `v6-dev` | In Entwicklung |

**Roundtrip:** `stable=true`, `net_delta≈0` (CONC/CONT-Neuformatierung + HEAD-Rewrite akzeptiert; alle tag-counts ✓)
**Testdaten:** MeineDaten_ancestris.ged — 2811 Personen, 880 Familien, 130 Quellen, 4 Archive
**Aktuelle sw-Version:** v152 / Cache: `stammbaum-v152`

---

## Version 6.0 (Branch `v6-dev`, ab 2026-04-05)

*Planung in Arbeit — offene Punkte aus v5 + neue Schwerpunkte*

### Offen aus v5

- [ ] Zeitleiste (`ui-timeline.js`) — Personen/Ereignisse auf horizontaler Zeitachse
- [ ] Nachkommen-Baum (top-down SVG)
- [ ] Karten-Ansicht (Apple Maps Link-Cluster oder leaflet.js)
- [ ] Statistik-Dashboard (Gesamtzahlen, Vollständigkeit, häufigste Namen/Orte)
- [ ] Duplikat-Erkennung (gleicher Name + Geburtsjahr ±2, nur Anzeige)
- [ ] Volltextsuche (Ereignis-Orte, Quellen-Titel, Notizen)
- [ ] `writeGEDCOM()` in Subfunktionen aufteilen (477-Zeilen-Monolith)
- [ ] `touchmove` Pinch-Zoom mit `requestAnimationFrame` throttlen
- [ ] Globale Suche indexieren (Debounce + vorberechneter Index)

### Neue Schwerpunkte

*(werden in der nächsten Session definiert)*

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
- [ ] **`writeGEDCOM()` in Subfunktionen aufteilen** — 477-Zeilen-Monolith; je ein Writer für INDI/FAM/SOUR/HEAD (gedcom-writer.js)
- [x] **`catch { return null }` durch echtes Error-Handling ersetzen** — maskiert alle OneDrive-API-Fehler, erschwert Debugging (onedrive.js) ✅ (sw v139)
- [x] **`onedrive.js` in 3 Module aufteilen** — 946-Zeilen-Monolith; `onedrive-auth.js` (OAuth-Flow, Token), `onedrive-import.js` (Foto-Import-Wizard, Ordner-Browser), `onedrive.js` (Media-URL, File-I/O, Pfad-Helfer, Settings) ✅ (sw v140)
- [x] **`ui-forms.js` in 3 Module aufteilen** — 1036 Zeilen; `ui-forms-event.js` (Event-Formular ~170 Z.), `ui-forms-repo.js` (Archiv/Picker/Detail ~163 Z.), `ui-forms.js` (Person/Familie/Quelle + Utilities ~706 Z.) ✅ (sw v141)

---

## Offene Architektur-Schulden

- ~~Virtuelles Scrollen für Listen >500 Einträge~~ → behoben sw v145: Spacer-div, Binary-Search, Desktop-Sync-Fix sw v146
- Cmd+Z = "Revert to Saved" (nicht granulares Undo) — dokumentiert, aber UX-Problem
- Familien-Avatar: CSS-Symbol statt OS-Emoji
- Duplikat-Erkennung in Suche
- ~~DIV/DIVF/ENG: Formularfelder für Datum/Ort~~ → behoben sw v147: "Ereignisse"-Sektion in Familiendetail
- ~~OAuth-Token in `localStorage`~~ → behoben sw v136: jetzt `sessionStorage`
- ~~Inline Event-Handler in HTML-Strings~~ → behoben sw v137: globale Event-Delegation
- ~~GEDCOM-Parser ohne Fehler-Sammler~~ → behoben sw v138: `parseErrors[]` + Level-Validierung
- ~~`sourceRefs` nach Event-Save nicht aktualisiert~~ → behoben sw v149: rebuild-Funktionen nach save/delete
- ~~Ereignisliste unsortiert/ungruppiert~~ → behoben sw v150: Typ-Gruppen + Datum-Sortierung

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

## Datei-Statistiken

### MeineDaten_ancestris.ged

```
Personen:      2811
Familien:       880
Quellen:        130
Archive:           4
Notizen:         195
Dateigröße:    ~5 MB  (83152 Zeilen)
```

### Unsere Familie.ged — Primäre Roundtrip-Testdatei (aktuell, 2026-05-12)

```
Personen:      2918
Familien:       917
Quellen:        142
Archive:           5
Notizen:         195
SOUR-Referenzen: 9070
Dateigröße:    ~1.7 MB  (90681 Zeilen)
```

**Besonderheit:** 2360 Events mit Mehrfachzitierungen derselben Quelle (gleiche `@Sxx@` mehrfach
pro Event mit verschiedenen Seitenzahlen) — direkter Nachweis des F4b-Datenmodell-Problems.
Die aktuelle `sources[]+sourcePages{}`-Struktur verliert diese Duplikate beim Roundtrip.

---

## Backlog

*Kein festes Datum. Vor Implementierung: erst P1-Features (F5 Anonymisierung, F6 Strict GEDCOM)
abschließen.*

| ID | Feature | Kurzbeschreibung | Aufwand |
|---|---|---|---|
| F4b | **Mehrfach-Zitierungen** | `citations:[{sid,page,quay,note,extra,media}]` statt 6 paralleler Felder; Migration + Roundtrip-Neuverifikation; 8 Dateien + Test-Suite | XL |
| U8  | **Granulares Undo** | History-Stack auf AppState; heute: Cmd+Z = "Revert to Saved" | XL |
| F3  | **Pedigree-Collapse** | Vorfahren-Kollaps im Baum bei gemeinsamen Ahnen | L |
| F9  | **Zeitleiste** | Events neben historischen Ereignissen; `ui-timeline.js` | XL |
| F10 | **Buchgenerator** | HTML/PDF Familienbuch; Ahnentafel + Biografie + Fotos | XL |
| F11 | **OCR** | Urkunden-Scan → Text; WASM-Tesseract oder LLM-Backend | XL |

*Aufwand: XS (<1h) · S (1–2h) · M (halber Tag) · L (1–2 Tage) · XL (>2 Tage)*

---

## F4b — Detailplan: Mehrfach-Zitierungen

### Problem (Ist-Zustand)

Quellenreferenzen werden als **sechs parallele Felder** gespeichert:

```js
sources:     ['@S1@', '@S2@'],
sourcePages: { '@S1@': 'S. 12' },
sourceQUAY:  { '@S1@': '2' },
sourceNote:  { '@S1@': 'Notiz' },
sourceExtra: { '@S1@': ['3 DATA foo'] },
sourceMedia: { '@S1@': [...] }
```

Kernproblem: Wenn dieselbe Quelle (`@S1@`) dasselbe Ereignis zweimal belegt
(z.B. KB Taufe S. 12 + KB Taufe S. 87), überschreibt `sourcePages['@S1@']` den ersten Eintrag.
Belegt durch `Unsere Familie.ged`: **2360 Events** mit Mehrfachzitierungen gehen beim Roundtrip verloren.

### Ziel-Datenmodell

```js
citations: [
  { sid: '@S1@', page: 'S. 12', quay: '2', note: '', extra: [], media: [] },
  { sid: '@S1@', page: 'S. 87', quay: '2', note: '', extra: [], media: [] },
  { sid: '@S2@', page: '',      quay: '3', note: '', extra: [], media: [] },
]
```

`citations[]` ersetzt vollständig: `sources[]`, `sourcePages{}`, `sourceQUAY{}`,
`sourceNote{}`, `sourceExtra{}`, `sourceMedia{}`.

### Betroffene Dateien

| Datei | Änderung |
|---|---|
| `gedcom.js` | `citationObj()` Factory, AppState-Defaults, Clipboard-Format |
| `gedcom-parser.js` | `_curCit` statt `lastSourVal` + 6 parallele Dicts; alle 12 Event-Kontexte |
| `gedcom-writer.js` | `writeSourCitations()` iteriert über `citations[]` |
| `ui-forms.js` | `srcWidgetState`, `initSrcWidget`, `renderSrcTags`, Copy/Paste |
| `ui-forms-event.js` | Event-Formular lesen/schreiben |
| `ui-forms-person.js` | Name-Level-Zitierungen (`nameCitations`) |
| `ui-forms-family.js` | Familien-Ereignisse |
| `ui-views-person.js` | Detailansicht Quellen-Anzeige |

Optional (wenn GRAMPS-Support erhalten): `gramps-parser.js`, `gramps-writer.js`.

### Sprint-Aufteilung

**Phase 1 — Datenmodell + Parser + Writer**

1. `citationObj(sid,page,quay,note,extra,media)` Factory in `gedcom.js`; alle Defaults auf `citations:[]`
2. Parser (`gedcom-parser.js`): `_curCit` ersetzt `lastSourVal`; beim `2/3 SOUR @Sxx@` → `citations.push(citationObj(sid))`; PAGE/QUAY/NOTE/OBJE/extra schreiben auf `_curCit`
3. Migration beim Laden: `_migrateLegacyCitations(obj)` — erkennt Altformat (`sources[]` vorhanden), konvertiert in-memory transparent
4. Writer (`gedcom-writer.js`): `writeSourCitations()` iteriert `citations[]`; kein Altformat-Code mehr

**Phase 2 — UI-Widget**

5. `srcWidgetState[prefix] = { citations: [] }` (statt `{ids, pages, quay}`)
6. `initSrcWidget(prefix, citations)` — direkte Übergabe
7. `renderSrcTags(prefix)` — eine Zeile pro Citation; Reihenfolge = GEDCOM-Reihenfolge; selbe Quelle mehrfach erlaubt
8. Copy/Paste: Clipboard = `{ citations: [{...},...] }`; Paste fügt an, dedupliziert nur bei sid+page identisch

**Phase 3 — Formulare + Ansichten + GRAMPS**

9. `ui-forms-event.js`, `-person.js`, `-family.js`: `initSrcWidget` und Speicherpfade anpassen
10. `ui-views-person.js`: Quellen-Badges aus `citations[]` statt `sources[]`
11. GRAMPS: `gramps-parser.js` `sourceref` → `citationObj()`; `gramps-writer.js` `citations[]` → `<sourceref>`

### Automatisierte Teststrategie

**Datei:** `test-citations.js` — standalone, keine externen Dependencies, läuft im Browser
(`test.html`) oder via `node --input-type=module`.

| Gruppe | Was wird getestet |
|---|---|
| T1 Parser | GEDCOM-String → `citations[]`; Mehrfachzitierung derselben Quelle |
| T2 Writer | `citations[]` → GEDCOM-Zeilen; korrekte Level, leere Felder ausgelassen |
| T3 Roundtrip | `parse(write(parse(ged)))` === `parse(ged)` — kein Delta |
| T4 Migration | Altformat `sources[]+sourcePages{}` → `citations[]`; Felder danach gelöscht |
| T5 Widget | `initSrcWidget` + `renderSrcTags` DOM-Snapshot; Copy/Paste-Logik |
| T6 Edge Cases | Leere Citations, fehlende Quelle in db, NOTE mit CONT, Inline-OBJE |
| T7 Integration | `Unsere Familie.ged` (90681 Zeilen): Citation-Count vor/nach Migration identisch; Roundtrip ohne Delta |
| T8 GRAMPS | `gramps-parser` → `citations[]` → `gramps-writer` → parse → identisch |

**T7 konkret:**
```js
// Vor Migration: Summe aller sources[].length über alle Personen + Familien
// Nach Migration: Summe aller citations.length muss identisch sein
// Dann: parse(write(parse('Unsere Familie.ged'))) — vollständige Datei, kein Delta
```

### Risiken

| Risiko | Maßnahme |
|---|---|
| Alter IDB-Cache (Altformat) | `_migrateLegacyCitations()` läuft transparent beim Laden |
| `sourceRefs.add()` im Parser | bleibt: `cur.sourceRefs.add(_curCit.sid)` |
| `topSources[]` auf INDI-Ebene | separates Feld, kein Teil von Event-Citations, unverändert |
| `_SPECIAL_OBJ`-Alias | zeigt weiter auf Event-Objekte; nur deren interne Felder ändern sich |
| GRAMPS-Roundtrip | eigene T8-Gruppe; erst nach T3 grün anfassen |
