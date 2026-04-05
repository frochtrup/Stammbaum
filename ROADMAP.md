# Roadmap

Detaillierte Sprint-Geschichte aller abgeschlossenen Versionen: `CHANGELOG.md`

---

## Aktueller Stand

| Version | Branch | Status |
|---|---|---|
| 4.0 | `main` | Abgeschlossen (2026-03-30) — Details: CHANGELOG.md |
| 5.0 | `v5-dev` | In Entwicklung |

**Roundtrip:** `stable=true`, `net_delta≈0` (CONC/CONT-Neuformatierung + HEAD-Rewrite akzeptiert; alle tag-counts ✓)
**Testdaten:** MeineDaten_ancestris.ged — 2811 Personen, 880 Familien, 130 Quellen, 4 Archive
**Aktuelle sw-Version:** v142 / Cache: `stammbaum-v142`

---

## Version 5.0 (Branch `v5-dev`, ab 2026-03-30)

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

#### Offline-Sync-Indikator — Priorität 3
- [ ] Badge/Banner wenn `AppState.changed=true` und noch nicht gespeichert
- [ ] Besonders wichtig auf iPhone wo direktes Speichern nicht immer möglich

---

### Schwerpunkt 3: Datenqualität

#### Erweiterte Events (restliche Passthrough-Reste) — Priorität 1
- [x] FAM-Events: `DIV`, `DIVF`, `ENG`/`ENGA` — strukturiert statt passthrough ✅ (sw v134–v135)
- [ ] FAM-Events: Formularfelder für DIV/DIVF/ENG (Datum, Ort) — Parser/Writer done, UI fehlt; analog Ereignisse im Personen-Detail: Verlobung aus Haupt-Edit-Fenster in normale Ereignisliste verschieben
- [ ] INDI-Events: selten genutzte Tags die noch in passthrough landen (z.B. `DSCR`, `IDNO`)

#### Duplikat-Erkennung — Priorität 2
- [ ] Personen mit gleichem Name + Geburtsjahr (±2): Hinweis + Vergleichs-Ansicht
- [ ] Kein automatisches Merge — nur Anzeige + manuelle Entscheidung

#### Volltextsuche — Priorität 3
- [ ] Suche über Ereignis-Orte, Quellen-Titel, Notizen (nicht nur Name)
- [ ] Erweiterung des bestehenden Suchfelds in Personen-/Quellen-Liste

---

### Schwerpunkt 4: Sonstiges

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
- [ ] **Media-Count cachen** — Logik wird bei jedem Render neu berechnet, statt einmalig pro Datensatz (ui-views-person/family/source.js)

#### Refactoring — Priorität 3

- [x] **Inline Event-Handler durch Event-Delegation ersetzen** — `oninput="updateSrcPage(...)"` u.ä. sind XSS-anfällig bei unvollständigem Escaping und erzeugen Memory-Leaks bei Modal-Reopen (ui-forms.js, viele ui-*.js)
- [ ] **Gemeinsame `renderListItem()`-Funktion** — Media-Count, Sortierung und List-Rendering in ui-views-person/family/source.js deduplizieren (3× identische Logik)
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
- DIV/DIVF/ENG: Formularfelder für Datum/Ort (Parser/Writer done); Verlobung aus Haupt-Edit in Ereignisliste
- ~~OAuth-Token in `localStorage`~~ → behoben sw v136: jetzt `sessionStorage`
- ~~Inline Event-Handler in HTML-Strings~~ → behoben sw v137: globale Event-Delegation
- ~~GEDCOM-Parser ohne Fehler-Sammler~~ → behoben sw v138: `parseErrors[]` + Level-Validierung

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
