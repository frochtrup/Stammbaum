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
**Aktuelle sw-Version:** v166 / Cache: `stammbaum-v166`

---

## Version 6.0 (Branch `v6-dev`, ab 2026-04-05)

Code-, Architektur- und Sicherheits-Review durchgeführt 2026-04-06 — Befund: B+ (Security A–, Architektur B, Performance B–, Code-Qualität B, PWA B). Gesamtbewertung: solide Basis, gezielter Abbau technischer Schulden.

Priorisierung der offenen Schulden (2026-04-06):
```
P1 Sicherheits-Blocker  →  onclick= Migration (CSP vollständig wirksam)       ✅ sw v163
P2a Datenqualität       →  Ereignis-TYPE für alle Event-Typen editierbar        ✅ sw v164
P2 Maintainability      →  parseGEDCOM + writeGEDCOM aufteilen; storage.js aufgeteilt ✅ sw v166
P3 Performance          →  Suche indexieren, touchmove throttlen, VS profilen
P4 Release-Hygiene      →  DEV-Diagnose, _navHistory, Rendering-Helper
P5 UX-Schulden          →  INDI-Notes-Editierproblem, Cmd+Z (eigener Sprint)
P6 Neue Features        →  erst nach P1+P2 beginnen
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

- [ ] **`parseGEDCOM()` aufteilen** — 750-Zeilen-Monolith in `gedcom-parser.js`; Ziel: INDI/FAM/EVENT als Sub-Parser je < 200 Z.
- [ ] **`writeGEDCOM()` in Subfunktionen aufteilen** — 477-Zeilen-Monolith; je ein Writer für INDI/FAM/SOUR/HEAD (gedcom-writer.js)
- [x] **`storage.js` aufteilen** — `storage-file.js` (IDB-Primitives + File System Access API + Export/Save + File Loading, ~305 Z.) + `storage.js` (Demo/Backup/Init/Foto-Export, ~345 Z.) ✅ sw v166

---

### P3 — Performance

- [ ] **Globale Suche indexieren** — O(n×m) bei 2800+ Personen ~80ms pro Tastendruck ohne Debounce; Debounce + vorberechneter Index (ui-views.js)
- [ ] **`touchmove` Pinch-Zoom mit `requestAnimationFrame` throttlen** — feuert aktuell 100+/s direkt auf DOM-Properties, Frame-Drops auf älteren iPhones (ui-views-tree.js)
- [ ] **Virtual Scroll bei 2800+ Einträgen profilen** — Spacer-Logik auf Korrektheit verifizieren; Threshold 500 ggf. anpassen

---

### P4 — Release-Hygiene & Code-Qualität

- [ ] **DEV-Diagnose im Menü entfernen** — OD-Token-Details (`OD: ...`, `Token: ...`) und SW-Version-Toast (`DEV sw vXXX`) vor Abschluss v6 entfernen (`index.html` menuVersionInfo-Block kürzen, `storage.js` DEV-Blöcke löschen)
- [ ] **`_navHistory` + `_probandId` in `UIState` konsolidieren** — aktuell lose Globals in ui-views.js, inkonsistent mit ADR-003
- [ ] **Rendering-Helper extrahieren** — `renderEventBlock()`, `renderSourceBadge()`, `renderMediaPhoto()` aus Person/Familie/Quelle-Views (~15% Duplikation); sinnvoll vor ersten neuen Views

---

### P5 — UX-Schulden (hoher Aufwand, klarer Nutzen)

- [ ] **Mehrere inline INDI-Notes: Editierproblem** — beim Speichern werden mehrere Notes zu einer zusammengeführt (Roundtrip ohne Edit stabil; Edit-Pfad verlustbehaftet); betrifft auch Duplikat-Erkennung
- [ ] **Cmd+Z = granulares Undo** — aktuell "Revert to Saved"; History-Stack auf `AppState` erforderlich; eigener Sprint

---

### P6 — Neue Features (erst nach P1+P2)

- [ ] Zeitleiste (`ui-timeline.js`) — Personen/Ereignisse auf horizontaler Zeitachse
- [ ] Nachkommen-Baum (top-down SVG)
- [ ] Karten-Ansicht (Apple Maps Link-Cluster oder leaflet.js)
- [ ] Statistik-Dashboard (Gesamtzahlen, Vollständigkeit, häufigste Namen/Orte)
- [ ] Duplikat-Erkennung (gleicher Name + Geburtsjahr ±2, nur Anzeige)
- [ ] Volltextsuche (Ereignis-Orte, Quellen-Titel, Notizen)

---

### Bekannte Fehler / kleine Erweiterungen

- [x] Ereignis-Gruppierung in Personendetail: EVEN-Ereignisse mit unterschiedlichem `eventType` wurden unter einem Block zusammengefasst — behoben: Gruppierungsschlüssel `type:eventType` (ui-views-person.js)
- [x] Ereignis-TYPE nur für FACT/MILI/EVEN editierbar — jetzt für alle Event-Typen; Label-Darstellung `"Beruf: Staatsangehörigkeit"` für nicht-EVEN/FACT; EVEN-Details im Roundtrip-Report (sw v164)
- [x] EVEN-Details im Roundtrip-Report: ID, Name, TYPE, Datum, Ort pro EVEN-Eintrag (sw v164)
- [ ] Beschäftigung als OCCU inkl. Arbeitgeber — AGNC modellieren

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

Priorisierte Liste — Details und Kontext in v6.0-Abschnitt oben.

**Offen (priorisiert):**
- ~~**P1** `onclick=`-Handler-Migration~~ → sw v163 ✓
- **P2** `parseGEDCOM()` aufteilen (750 Z.) · `writeGEDCOM()` aufteilen (477 Z.) · ~~`storage.js` aufteilen~~ → sw v166 ✓
- **P3** Globale Suche indexieren (O(n×m)) · `touchmove` throttlen · Virtual Scroll profilen
- **P4** DEV-Diagnose entfernen · `_navHistory`/`_probandId` in UIState · Rendering-Helper extrahieren
- **P5** INDI-Notes Editierproblem · Cmd+Z granulares Undo (eigener Sprint)
- Familien-Avatar: CSS-Symbol statt OS-Emoji

**Behoben:**
- ~~Virtuelles Scrollen für Listen >500 Einträge~~ → sw v145/v146
- ~~DIV/DIVF/ENG: Formularfelder für Datum/Ort~~ → sw v147
- ~~OAuth-Token in `localStorage`~~ → sw v136
- ~~Inline Event-Handler in HTML-Strings~~ → sw v137
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
