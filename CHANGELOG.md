# Changelog

Vollständige Sprint-Geschichte aller abgeschlossenen Versionen.
Aktuelle Planung: `ROADMAP.md`

---

## Version 6.0 (Branch `v6-dev`, ab 2026-04-05) — IN ENTWICKLUNG

---

### Session 2026-04-06 — SW Offline-Fallback + Security-Review (sw v162)

- **sw v162** `feat`: Service Worker Offline-Fallback
  - `sw.js`: `offline.html` in PRECACHE aufgenommen; Cache-Version → v162
  - `sw.js`: catch-Handler prüft `event.request.destination === 'document'` — nur Navigation-Requests erhalten `offline.html` als Fallback; Sub-Ressourcen (JS, CSS, Bilder) geben `undefined` zurück (korrekt)
  - `offline.html`: neue self-contained Offline-Seite (inline styles, kein ext. CSS/JS, kein Script); passt zum App-Design; "Erneut versuchen"-Link auf `./`
  - Vorher: leererer Cache + Netz-Timeout → weißer Screen; jetzt: on-brand Fehlermeldung
  - Security-Review `onclick=`-Handler: 95 inline `onclick=` in `index.html` blockieren `unsafe-inline`-Entfernung aus CSP; Risiko niedrig für aktuelle Nutzung — dokumentiert als **Pflicht-TODO vor** GED-Import aus unbekannter Quelle / Sharing-Features (ROADMAP.md)

---

## Version 5.0 (Branch `v5-dev`, 2026-03-30 — 2026-04-05) — ABGESCHLOSSEN

---

### Session 2026-04-05 — OneDrive-Startsequenz + Offline-Sync-Indikator (sw v149–v152)

- **sw v149** `fix`: sourceRefs nach Event-Save/Delete rebuilden
  - `ui-forms-event.js`: `saveEvent()` + `deleteEvent()` rufen nach Änderung `_rebuildPersonSourceRefs()` bzw. `_rebuildFamilySourceRefs()` auf
  - `ui-forms.js`: `saveFamily()` berücksichtigt jetzt alle FAM-Events (ENG/DIV/DIVF) für `sourceRefs` — nicht nur Hochzeits-Quellen
  - Behoben: Neue Quellenzuordnung erschien nicht sofort in Quellendetail „Verwendet in"

- **sw v150** `feat`: Ereignisliste Personendetail — Gruppierung + Sortierung
  - `ui-views-person.js`: Gleiche Ereignistypen werden als Block zusammengefasst (alle OCCU, alle RESI etc.)
  - Innerhalb jedes Blocks: chronologisch sortiert; undatierte Ereignisse ans Ende
  - Reihenfolge der Gruppen folgt der Typen-Reihenfolge im Ursprungsarray

- **sw v151** `feat`: OneDrive-Startsequenz
  - `onedrive.js`: Auswahl-Dialog bei Neustart (kein Session-Token): "☁ Von OneDrive laden" vs. "📱 Lokal"
  - Gleiche Session (Token in sessionStorage): direkt von OneDrive laden — kein veralteter IDB-Stand
  - `od_autoload_pending`: nach OAuth-Redirect wird Datei automatisch geladen
  - Timeout 8s + stiller Fallback auf IDB bei Fehler oder Offline
  - `_odRefreshTokenSilent()` — Token-Refresh ohne OAuth-Redirect (kein ungewolltes Login)
  - `window._odCallbackPromise` — `window.load`-Handler wartet auf laufenden OAuth-Callback

- **sw v152** `feat`: Offline-Sync-Indikator
  - `index.html`: Floating Pill `#sync-indicator` über Bottom-Nav — "● Nicht gespeichert" + Speichern-Button
  - Button adaptiv: ☁ Speichern (OneDrive) · ↑ Teilen (iPhone/Share Sheet) · ↓ Speichern (Desktop)
  - `ui-views.js`: `updateChangedIndicator()` — erscheint/verschwindet synchron mit `AppState.changed`
  - Global in allen Views sichtbar; keine Schaltflächenanpassung nötig

---

### Session 2026-04-05 — INDI-Events erweitert (sw v147–v148)

- **sw v147** `feat`: FAM-Ereignisse — Verlobung/Scheidung/Scheidungsantrag in Detailansicht editierbar
  - *(Details in vorherigem Commit)*

- **sw v148** `feat`: INDI-Events `DSCR`, `IDNO`, `SSN` — strukturiert statt passthrough
  - `gedcom-parser.js`: drei Tags zur events[]-Liste hinzugefügt → landen nicht mehr in `_passthrough`
  - `index.html`: drei neue Optionen im Ereignistyp-Dropdown (vor "Sonstiges")
  - Roundtrip bleibt `net_delta=0` — Writer behandelt alle events[] generisch

---

### Session 2026-04-05 — Performance + UX (sw v143–v146)

- **sw v143** `feat`: Medienbrowser in Personen- + Familien-Liste
  - `ui-media.js`: `showPersonMediaBrowser()` — Medien gruppiert nach Person, sortiert Nachname→Vorname A-Z
  - `ui-media.js`: `showFamilyMediaBrowser()` — Medien gruppiert nach Familie
  - `showMediaBrowser()` zeigt nun Titel `Medien-Browser · Quellen` (analog)
  - `index.html`: 📎-Button in Personen-Tab und Familien-Tab Suchzeile
  - Personen-Liste: primäre Sortierung Nachname A-Z, sekundär Vorname A-Z

- **sw v144** `feat`: Scroll-Positions-Restore beim Zurücknavigieren
  - Beim Wechsel von Liste → Detail wird Scroll-Position in `UIState._savedListScroll` gespeichert
  - `showMain()`: nach `renderTab()` wird gespeicherte Position via `setTimeout(0)` wiederhergestellt
  - Funktioniert für mobiles Window-Scroll (`window.scrollY`) und Desktop-Container (`#v-main.scrollTop`)
  - Kein Konflikt mit `_scrollListToCurrent` (rAF vs. setTimeout — setTimeout läuft danach)

- **sw v145** `feat`: Virtuelles Scrollen für Personen- und Familien-Liste
  - Listen >500 Einträge: nur sichtbare Zeilen + 600px Puffer (`_VS_BUF`) im DOM
  - Spacer-div-Ansatz: `[top-spacer][mid-content][bot-spacer]` — kein Framework
  - Constants: `_VS_ROW=69` (Zeile), `_VS_SEP=23` (Trenner), `_VS_MIN=500` (Schwellwert)
  - `_vsRender(listEl, st)`: Binary-Search für sichtbaren Bereich, O(log n)
  - `_vsSetup(listEl, st, items, renderFn)` / `_vsTeardown(st)`: Setup/Teardown per Scroll-Event
  - `_vsScrollEl()`: erkennt Desktop-Container (`#v-main`) vs. Mobile (Window)
  - VS-State: `_vsP` (Personen) + `_vsF` (Familien) in `ui-views-person.js`
  - `offsetParent`-Check: VS überspringt versteckte Tabs (display:none)

- **sw v146** `fix`: Desktop-Sync — Baum/Fan-Chart → Listen-Highlight
  - Problem: auf Desktop sind Baum und Liste nebeneinander sichtbar; nach Einführung von VS wurde `.current` nicht gesetzt wenn die Person außerhalb des gerenderten Fensters war
  - `_vsScrollAndHighlight(st, listEl, idx, dataAttr, id)`: scrollt synchron zu Item, erzwingt VS-Re-Render, setzt dann `.current`
  - `sc.scrollTop = target` ist synchronous → `_vsRender` liest sofort die neue Position
  - Fix in `_updatePersonListCurrent()` und `_updateFamilyListCurrent()`

---

### Session 2026-04-05 — Modul-Splits + Roundtrip-Fix (sw v138–v142)

- **sw v138** `refactor`: GEDCOM-Parser — Error-Sammler + Level-Validierung
  - `gedcom-parser.js`: optionaler zweiter Parameter `_errors[]` für `parseGEDCOM()`
  - Zeilen mit `lv > 4` werden in `_errors[]` protokolliert (ungültig laut GEDCOM 5.5.1)
  - Passthrough-Mechanismus läuft weiterhin für `lv > 4`-Zeilen (kein `continue`)

- **sw v139** `fix`: OneDrive — echtes Error-Handling statt `catch { return null }`
  - `onedrive.js`: alle catch-Blöcke loggen jetzt den tatsächlichen Fehler per `console.error`
  - Kein stilles Verschlucken von API-Fehlern mehr; erleichtert Debugging erheblich

- **sw v140** `refactor`: `onedrive.js` (946 Z.) → 3 Module aufgeteilt
  - `onedrive-auth.js` (113 Z.): OAuth2 PKCE — `odLogin()`, `odLogout()`, `odHandleCallback()`, `_odGetToken()`, `_odUpdateUI()`, Konstanten `OD_CLIENT_ID`/`OD_SCOPES`/`OD_AUTH_EP`/`OD_TOKEN_EP`/`OD_GRAPH`; Init-Block am Ende
  - `onedrive-import.js` (465 Z.): Foto-Import-Wizard + Ordner-Browser — `odImportPhotos()`, `_odShowFolder()`, `_odEnterFolder()`, `_odFolderBack()`, `odImportPhotosFromFolder()`, `odSetupDocFolder()`, `odPickFileForMedia()`, `_odPickSelectFile()`, `_extractObjeFilemap()`
  - `onedrive.js` (374 Z.): Media-URL, Upload, File-I/O, Pfad-Helfer, Settings — `_odGetMediaUrlByPath()`, `_odUploadMediaFile()`, `odSaveFile()`, `odLoadFile()`, `odOpenFilePicker()`, `openSettings()`, `_odGetBasePath()`, `_odToRelPath()`
  - `sw.js` + `index.html`: PRECACHE und `<script>`-Tags um die zwei neuen Dateien erweitert
  - `odSaveFile()` ruft jetzt `writeGEDCOM(true)` (mit HEAD-Datum-Update)

- **sw v141** `refactor`: `ui-forms.js` (1036 Z.) → 3 Module aufgeteilt
  - `ui-forms-event.js` (167 Z.): Event-Formular — `showEventForm()`, `saveEvent()`, `deleteEvent()`, `onEventTypeChange()`, `_efMedia`, `_renderEfMedia()`, `addEfMedia()`; `_SPECIAL_OBJ`/`_SPECIAL_LBL`-Konstanten
  - `ui-forms-repo.js` (167 Z.): Archiv-Formular + Picker + Detail — `showRepoForm()`, `saveRepo()`, `deleteRepo()`, `showRepoDetail()`, `openRepoPicker()`, `renderRepoPicker()`, `repoPickerSelect()`, `sfRepoUpdateDisplay()`, `sfRepoClear()`
  - `ui-forms.js` (707 Z.): Person/Familie/Quelle + Source-Widget + Modal-Helfer + Keyboard-Shortcuts + Utils (`esc`, `showToast`, Place-Autocomplete)
  - `sw.js` + `index.html`: PRECACHE und `<script>`-Tags um die zwei neuen Dateien erweitert

- **sw v142** `fix`: Roundtrip — Parser lv>4 passthrough + Writer idempotenz
  - **Parser-Fix**: `lv > 4`-Block hatte `continue` → Passthrough-Mechanismus wurde übersprungen → `5 TYPE photo` u.ä. wurden komplett verworfen (sw v138-Regression; `TYPE -67`, `FORM -52` im Roundtrip-Test)
  - **Fix**: `continue` entfernt; Zeile wird weiterhin als Fehler geloggt, aber der `_ptDepth`-Block auf Zeilen 124–132 fängt sie nun korrekt ab
  - **Writer-Fix**: `writeGEDCOM()` ersetzte HEAD `1 DATE`/`2 TIME` immer → jede Ausgabe hatte anderen Timestamp → Roundtrip instabil (out1 ≠ out2)
  - `gedcom-writer.js`: neuer Parameter `writeGEDCOM(updateHeadDate = false)` — HEAD wird nur aktualisiert wenn `true`; sonst verbatim ausgegeben
  - `storage.js`: `exportGEDCOM()` und iOS Share-Pfad rufen `writeGEDCOM(true)`; Test-/Debug-Aufrufe `writeGEDCOM()` (idempotent)
  - **Ergebnis**: Roundtrip `net_delta=0`, stabil — alle 50+ Tag-Checks bestanden; erstmals auch TIME-stabil (out1 === out2)

---

### Session 2026-04-05 — Inline Event-Handler Schulden (sw v137)

- **sw v137** `refactor`: Schwerpunkt 6 Prio 3 — Inline Event-Handler in HTML-Strings entfernt
  - 62 inline `onclick`/`oninput`/`onchange` aus Template-Literalen in 8 JS-Dateien entfernt
  - `ui-views.js`: globale Event-Delegation ergänzt — `data-action` (click), `data-change` (change), `data-input` (input)
  - `_CLICK_MAP` mit 28 Aktionen; `closest('[data-action]')` eliminiert StopPropagation-Bedarf natürlich
  - `data-action="stop"` für `<select>` in klickbaren Zeilen (verhindert versehentliche Navigation)
  - `data-action="stop"` auf Geo-Links (`<a target="_blank">`) in klickbaren Ereignis-Zeilen

---

### Session 2026-04-05 — Sicherheits-Fixes Schwerpunkt 6 Prio 1 (sw v136)

- **sw v136** `fix`: Schwerpunkt 6 Prio 1 — Sicherheit
  - `onedrive.js`: OAuth-Token (`od_access_token`, `od_refresh_token`, `od_token_expiry`) von `localStorage` → `sessionStorage` — nicht mehr über Tab-Schließen persistent, DevTools-Exposition und XSS-Angriffsfläche reduziert
  - `onedrive.js`: `odLogout()` löscht Token-Keys aus `sessionStorage`, `od_file_id`/`od_file_name` weiterhin aus `localStorage`
  - `sw.js`: Netzwerk-Timeout 4s eingebaut — bei hängendem Netz wird nach 4s auf Cache-Fallback umgeschaltet (statt unbegrenzt zu warten)
  - `sw.js`: `demo.ged` aus `PRECACHE` entfernt — wird nicht mehr bei jedem Nutzer mitgeladen

---

### Session 2026-04-05 — Quellen-Badges, OneDrive-Fix, DIV/DIVF/ENG strukturiert (sw v125–v135)

- **sw v125–v126** `feat`: Quellen-Badges für Kind-Verhältnis — `.src-badge §N`-Stil (wie Events)
  - `ui-views-family.js`: `.src-tag`-Pillen durch `.src-badge` ersetzt; `§N`-Text; Tooltip = `s.title || s.abbr`
  - `+ Q` nur wenn 0 Quellen (`_sourIds.length` statt Boolean-Kurzschluss)
  - Mehrere Quellen: alle als eigene Badges (nicht zusammengefasst)

- **sw v127** `fix`: Tooltip in `sourceTagsHtml()` zeigte `abbr` statt `title`
  - `ui-views.js`: Priorität korrigiert auf `s.title || s.abbr`

- **sw v128–v129** `fix`: `@@S2@@` — doppelte `@` in Source-IDs brachen Lookup
  - `gedcom-parser.js`: Normalisierung `.replace(/^@@/,'@').replace(/@@$/,'@')` beim Einlesen
  - Post-Processing: `sourIds`-Kopie von FAM→INDI jetzt unabhängig von `frelSeen` (war durch Ancestris `_FREL` immer geblockt)

- **sw v130–v133** `fix`: OneDrive-Speichern — Robustheit
  - `onedrive.js`: `showToast('Verbinde…')` vor Token-Check (kein stilles Versagen mehr)
  - `writeGEDCOM()` in eigenem try/catch mit eigenem Error-Toast
  - 30s AbortController-Timeout auf fetch + `res.json().catch(()=>({}))` gegen Hang bei Non-JSON-Response
  - Erfolgs-Toast zeigt vollständigen Speicherpfad in OneDrive

- **sw v134** `feat`: DIV / DIVF / ENG strukturiert in Parser + Writer + Anzeige
  - `gedcom-parser.js`: `_famEv()`-Hilfsfunktion; DIV/DIVF/ENG auf Level 1–4 vollständig geparst (DATE/PLAC/SOUR/NOTE/OBJE/MAP); ENG = Alias für ENGA
  - `gedcom-writer.js`: `eventBlock('DIV', f.div, 1)` + `eventBlock('DIVF', f.divf, 1)`; Passthrough-Filter für DIV/DIVF/ENG (verhindert Doppelausgabe)
  - `ui-views-family.js`: Anzeige-Abschnitte für Scheidung + Scheidungsantrag mit Quellen-Badges

- **sw v135** `fix`: ENGA im Passthrough-Filter ergänzt
  - `gedcom-writer.js`: Filter `/^1 (DIV|DIVF|ENG|ENGA)\b/` — verhindert Doppelausgabe von ENGA-Blöcken
  - Klarstellung: ENGA = GEDCOM 5.5.1 Standard; ENG = nicht-standard Alias (wird beim Speichern zu ENGA normalisiert)

- **Roundtrip-Test**: Passthrough-Sektionen zeigen jetzt explizite Beispielzeilen (`► 1 TAG wert`) zusätzlich zur Tag-Frequenz-Übersicht
- **Menü**: OneDrive-Aktionen an erste Position; lokale Dateioperationen als sekundäre Gruppe; Fotos-Import/Export aus Menü entfernt (über Einstellungen)
- **README**: OneDrive-Workflow als Primär-Workflow dokumentiert; lokaler Workflow als Fallback

---

### Session 2026-04-04 — PEDI-Migration + Eltern-Kind-Quellen (sw v121–v124)

- **sw v121** `feat`: PEDI statt `_FREL`/`_MREL` — GEDCOM 5.5.1 Standard für Eltern-Kind-Verhältnis
  - `gedcom-parser.js`: `PEDI` unter `FAMC` einlesen; `pedi`-Feld in FAMC-Objekt; Post-Processing-Merge FAM→INDI (`childRelations` in `famc` kopieren wenn INDI-Seite leer)
  - `gedcom-writer.js`: `_toPedi()` Mapping (deutsch/englisch → `birth|adopted|foster|sealing`); FAMC schreibt `2 PEDI` statt `2 _FREL`/`2 _MREL`; bei frel≠mrel Fallback auf `_FREL`/`_MREL`; Quellen als `2 SOUR` direkt unter FAMC (GEDCOM 5.5.1-konform); CHIL-Block ohne Sub-Tags
  - `test_idempotency.html`: Idempotenz-Test (Strategie B: parse→write→parse→write, vergleiche text1==text2) mit Migrationsreport
  - Ergebnis auf 2811 Personen: BESTANDEN; 622×PEDI birth, 0×_FREL/_MREL, 0 Datenverlust

- **sw v122** `feat`: UI für PEDI — Dropdown in Familien-Ansicht, Label in Personen-Ansicht
  - `ui-views-family.js`: Kinder-Block zeigt inline `<select>` für PEDI (leiblich/adoptiert/Pflegekind/Sealing); `savePedi()` schreibt direkt in `famc`-Eintrag
  - `ui-views-person.js`: Eltern-Rolle zeigt Suffix ` · adoptiert` / ` · Pflegekind` / ` · Sealing` wenn PEDI nicht `birth`
  - `ui-forms.js`: `famc.push()` mit vollständigem Objekt (pedi, frelSeen, mrelSeen, sourIds etc.)

- **sw v123** `feat`: Quellen für Kind-Verhältnis (FAMC) — Dialog mit PEDI + Quellenangabe
  - `index.html`: `#modalChildRel` mit PEDI-Dropdown und Quellen-Widget (src-tags/picker/PAGE/QUAY)
  - `ui-views-family.js`: `showChildRelDialog()` / `saveChildRelDialog()`; 📎-Button neben PEDI-Dropdown (öffnet Modal)
  - `ui-forms.js`: PAGE/QUAY-Felder im `src-Widget` auch für Prefix `cr` (Kind-Verhältnis)

- **sw v124** `fix`: Quell-Tags statt Büroklammer bei Kind-Verhältnis
  - `ui-views-family.js`: zeigt `src-tag`-Pillen (gold) für zugewiesene Quellen; ohne Quellen: gestrichelter `+ Q`-Button; 📎 ist Medien-Konvention und wird hier nicht verwendet

---

### Session 2026-04-04 — OneDrive-Pfad-Architektur: od_base_path (sw v107–v112)

- **sw v107** `fix`: OneDrive-Medien via `@microsoft.graph.downloadUrl` laden
  - **Ursache**: `/content`-Redirect (302 → CDN) schlägt mit CORS-Fehler fehl wenn Auth-Header
    mitgesendet wird; CDN-URL erfordert keinen Auth-Header
  - `_odGetMediaUrlByPath`: 2-Schritt: Metadaten-GET → `@microsoft.graph.downloadUrl` → Fetch ohne Auth
  - `_odGetPhotoUrl` (Legacy) + `_odGetSourceFileUrl`: gleicher Fix

- **sw v108** `fix`: Picker-Pfad ohne 'OneDrive'-Prefix + Fallback nur für Windows-Pfade
  - `_odShowFolder`: `folderPath` filtert `'OneDrive'` konsistent (wie `odImportPhotosFromFolder`)
    — verhindert `OneDrive/Pictures/foto.jpg` beim Navigieren vom Root aus
  - `_odGetMediaUrlByPath`: Basename-Fallback nur noch bei `\\`-Pfaden (Windows-GEDCOM)
    — falscher Pfad im Edit-Dialog zeigt nicht mehr das alte Bild

- **sw v109** `fix`: Ordner-Picker startet bei konfiguriertem Ordner + `parentName`-Fix
  - `odImportPhotos` / `odSetupDocFolder`: starten beim konfigurierten Ordner (nicht OneDrive-Root)
  - `_odShowAllFolders`: `parentName` via `/drive/root:`-Regex — verhindert `'root:'` im Pfad

- **sw v110** `refactor`: Pfad-basierte Medien-Architektur — `od_base_path` als einzige absolute Referenz
  - **Neues Konzept**: `od_base_path` = OneDrive-Pfad des GED-Ordners (absolut, Graph-API-Format)
  - Alle `m.file`-Werte relativ zu `od_base_path`; Laden: `fullPath = basePath + '/' + relPath`
  - `od_photo_folder` / `od_docs_folder` ersetzen `od_default_folder` / `od_doc_folder`; speichern `relPath`
  - `_odGetBasePath()` — lazy-load aus IDB mit Modul-Cache
  - `_odToRelPath(fullPath, basePath)` — subtrahiert Basispfad
  - `_odMigrateIfNeeded()` — einmalige Migration: alter `od_default_folder` → neue Struktur + `od_base_path`
  - `_odStripBaseFromPaths(basePath)` — bereinigt `m.file`-Werte in bestehenden GEDCOM-Daten
  - `_odUploadMediaFile`: gibt `relPath` zurück (Eingabe, nicht API-Antwort) — keine Pfad-Drift
  - `odImportPhotosFromFolder`: aktualisiert `f.marr.media` (vorher übersehen) + setzt `od_base_path`
  - `_addMediaToFilemap`: schreibt nicht mehr in `od_filemap`; nur Session-Cache-Invalidierung
  - `index.html`: "Lokale Pfade"-Sektion entfernt

- **sw v111** `feat`: `od_base_path` automatisch aus GED-Datei-Ordner ableiten
  - `odLoadFile`: nach Laden der GED-Datei → `parentReference.path` via Graph-API → `od_base_path`
  - Kein manuelles Setup mehr nötig; `od_base_path` wird beim ersten Öffnen einer GED-Datei gesetzt

- **sw v112** `fix`: Einstellungen — Startpfad separat, Ordner als relativer Pfad
  - `index.html`: neues "Startpfad (GED-Ordner)"-Feld (`set-base-path`) über Foto/Dok-Ordner
  - `openSettings`: befüllt `set-base-path` mit `od_base_path`; Foto/Dok-Ordner zeigen nur `relPath`
  - Verhindert irreführende doppelte Anzeige (z.B. `Privat/Pictures` als Foto-Ordner statt `Pictures`)

*Aktuelle sw-Version: v112 / Cache: stammbaum-v112*

---

### Session 2026-04-04 — Medien-Pfad-Mismatch-Fix (sw v106)

- **sw v106** `fix`: Medien-Anzeige repariert — GEDCOM-Pfade ≠ OneDrive-Pfade
  - **Ursache**: GEDCOM FILE-Tags enthalten lokale Pfade (z.B. `Fotos/foto.jpg`) statt
    OneDrive-Pfade (`Pictures/foto.jpg`); `_odGetMediaUrlByPath` lieferte 404 → keine Bilder
  - `onedrive.js`: `_odGetMediaUrlByPath` — Basename-Fallback: wenn Pfad nicht gefunden,
    Dateiname im `od_default_folder.folderPath` suchen
  - `onedrive.js`: `odImportPhotosFromFolder` — schreibt nach Verknüpfung `m.file` mit
    tatsächlichem OneDrive-Pfad (`folderPath + '/' + basename`) zurück; `AppState.changed = true`
  - `onedrive.js`: `odImportPhotosFromFolder` — Ansicht-Refresh nutzt `_odGetMediaUrlByPath`
    statt deprecated `_odGetPhotoUrl`
  - `ui-media.js`: `openEditMediaDialog` — `cfg_photo_base`-Stripping entfernt; `m.file`
    wird ungekürzt im Eingabefeld angezeigt und gespeichert

*Aktuelle sw-Version: v106 / Cache: stammbaum-v106*

---

### Session 2026-04-04 — Media-Handling Grundsanierung: pfad-basierte IDB-Keys (sw v105)

- **sw v105** `refactor`: IDB-Keys für Medien komplett auf Pfad-Basis umgestellt
  - **Ursache**: Index-basierte Keys (photo_id_0, photo_fam_id_1 etc.) werden nach
    Reorder der Medienliste (Hauptbild → Index 0) ungültig → alle Thumbnails zeigen
    falsche Bilder; Hero korreliert nicht mit Medienliste
  - **Neues Format**: `'img:' + filePath` — unabhängig von Array-Reihenfolge
  - `ui-media.js`: `_asyncLoadMediaThumb(thumbId, filePath)` — idbKey-Parameter entfernt
  - `ui-media.js`: Kamera-Fotos in `confirmAddMedia` mit `'img:' + file` gespeichert
  - `ui-media.js`: Edit-Dialog-Preview direkt über Pfad; MediaBrowser-Thumbnails pfad-basiert
  - `ui-media.js`: `deletePersonMedia`, `deleteFamilyMarrMedia` — kein bulk-IDB-Clear mehr nötig
  - `ui-views-person.js`: Hero ohne index-basierte IDB-Keys; onclick mit data-media-file Attribut
  - `ui-views-family.js`: analog Person
  - `ui-views-source.js`: IDB-Fallback pfad-basiert
  - `ui-views-tree.js`: `openMediaPhoto(filePath, heroElemId, avatarElemId)` — neue Signatur

*Aktuelle sw-Version: v105 / Cache: stammbaum-v105*

---

### Session 2026-04-04 — Blob-URLs → Data-URLs (iOS Safari Fix) (sw v104)

- **sw v104** `fix`: Alle OneDrive-Foto-URLs als Data-URL (base64) statt Blob-URL
  - **Ursache**: iOS Safari kann Blob-URLs (`URL.createObjectURL`) in `<img>`-Elementen
    nicht zuverlässig laden — der Browser kann den Blob intern verwerfen (GC), was
    `onerror` auslöst und → Avatar statt Foto zeigt
  - `_odGetMediaUrlByPath`: Blob → `FileReader.readAsDataURL()` → base64 Data-URL;
    `_odPhotoCache` cached Data-URL (Session, kein Netzwerk-Re-Fetch in selber Session)
  - `_odGetPhotoUrl` (Legacy): gleicher Fix
  - `_odGetSourceFileUrl` (Legacy-Pfad): gleicher Fix
  - Data-URLs sind selbsttragend, immer ladbar, plattformunabhängig

*Aktuelle sw-Version: v104 / Cache: stammbaum-v104*

---

### Session 2026-04-04 — Medienladen: Pfad-zuerst statt IDB-zuerst (sw v103)

- **sw v103** `refactor`: Bild-Loading-Reihenfolge überarbeitet
  - **Bisher**: IDB → OneDrive-Pfad → Legacy-Filemap
    Problem: IDB ist für OneDrive-Fotos fast immer leer → unnötiger Cache-Miss;
    veraltete IDB-Einträge (nach Reorder) zeigten falsches Bild
  - **Jetzt**: OneDrive-Pfad (m.file) → IDB → Legacy-Filemap
    `_odPhotoCache` (Session-Cache) verhindert Doppel-Fetches innerhalb einer Session
  - `ui-media.js`: `_asyncLoadMediaThumb` — `_odGetMediaUrlByPath(filePath)` zuerst
  - `ui-views-person.js`: Hero-Loading — `_odGetMediaUrlByPath(_filePath)` zuerst;
    Hero-`<img>` jetzt DOM-basiert mit `onerror` (Avatar wiederherstellen bei Fehler)
  - `ui-views-family.js`: Hero-Loading — analog Person; `onerror` hinzugefügt
  - `ui-views-source.js`: Thumbnails — `_odGetSourceFileUrl` zuerst (pfadbasiert),
    IDB als Fallback; `onerror` in `_applySrcMediaUrl` hinzugefügt
  - Alle Hero-Images: stale IDB-Writes (`idbPut` nach Load) entfernt — Pfad ist Wahrheitsquelle

*Aktuelle sw-Version: v103 / Cache: stammbaum-v103*

---

### Session 2026-04-04 — Kamera-Pfad: folderPath-Fallback per API (sw v102)

- **sw v102** `fix`: Kamera-Foto landet im konfigurierten Ordner auch bei alten IDB-Einträgen
  - `onedrive.js`: `_odResolveFolderPath(folderId, folderName)` — fragt OneDrive-API nach
    vollständigem relativem Pfad (`parentReference.path`) und gibt ihn zurück
  - `ui-media.js`: `openAddMediaDialog` — öffnet Modal sofort; wenn `folderPath` fehlt
    (IDB-Eintrag vor sw v100), wird er per API nachgeladen und in IDB persistiert
  - Ursache war: `od_default_folder` enthielt vor sw v100 nur `{folderId, folderName}`,
    kein `folderPath` → Fotos landeten im OneDrive-Root

*Aktuelle sw-Version: v102 / Cache: stammbaum-v102*

---

### Session 2026-04-04 — Thumbnails + Hauptbild-Funktion (sw v101)

- **sw v101** `fix/feat`: Thumbnails + Hauptbild-Reihung
  - `ui-media.js`: `_asyncLoadMediaThumb` — `onerror`-Handler stellt Original-Icon wieder her
    wenn Bild nicht geladen werden kann (kein broken-image-Symbol mehr auf Mobile)
  - `index.html`: "Als Hauptbild"-Checkbox im Edit-Medium-Dialog
  - `ui-media.js`: `_applyPrimAndReorder()` — setzt `prim='Y'` auf gewähltem Eintrag,
    löscht `prim` auf allen anderen, verschiebt Eintrag an Index 0
  - `ui-media.js`: `_invalidateThumbCache()` — leert Session-Cache bei Reorder damit
    Thumbnails mit korrekten Positionen neu geladen werden
  - `ui-media.js`: `openEditMediaDialog` — Checkbox zeigt aktuellen prim-Status

*Aktuelle sw-Version: v101 / Cache: stammbaum-v101*

---

### Session 2026-04-04 — Kamera-Upload nach OneDrive (sw v100)

**Kamera-Fotos landen direkt im konfigurierten OneDrive-Ordner**

- **sw v100** `feat`: Kamera-Foto-Upload nach OneDrive
  - `onedrive.js`: `_odUploadMediaFile(b64DataUrl, targetPath)` — PUT per path-based API,
    gibt `{ path, fileId }` zurück mit tatsächlichem Pfad aus API-Antwort
  - `onedrive.js`: `odScanDocFolder` speichert jetzt ebenfalls `folderPath` in `od_doc_folder`
    (analog zu `odImportPhotosFromFolder`)
  - `ui-media.js`: `_addMediaDefaultFolderPath` — Modul-Variable für Ordner-Pfad
  - `ui-media.js`: `openAddMediaDialog` lädt `od_default_folder.folderPath` (bzw. `od_doc_folder`
    für Quellen) aus IDB → vorbelegt `_addMediaDefaultFolderPath`
  - `ui-media.js`: `_onCamCapture` verwendet `_addMediaDefaultFolderPath` als Ordner-Prefix;
    Dateiname jetzt mit Uhrzeit (`foto_YYYYMMDD_HHMMSS.jpg`) für Eindeutigkeit
  - `ui-media.js`: `confirmAddMedia` — wenn Kamera-Foto + OneDrive verbunden + Dateifeld gefüllt:
    Upload via `_odUploadMediaFile`; tatsächlicher API-Pfad ersetzt Eingabefeld-Wert;
    IDB-Cache wird trotzdem gesetzt (lokale Kopie)

*Aktuelle sw-Version: v100 / Cache: stammbaum-v100*

---

### Session 2026-04-04 — Medien-Handling Überarbeitung (sw v96–v99)

**Relativer OneDrive-Pfad als einzige Wahrheitsquelle**

- **sw v96** `feat`: Medien — relative OneDrive-Pfade + bevorzugtes Medium in Titelleiste
  - `onedrive.js`: `_odPickSelectFile` speichert `fullPath` direkt (kein `cfg_photo_base`-Prefix mehr)
  - `_odPickBasePath` / `_odPickRootName` und deren IDB-Reads entfernt
  - `ui-media.js`: `openAddMediaDialog` startet mit leerem Dateifeld
  - `ui-views-person.js`: Hero lädt bevorzugtes Medium (`_PRIM Y`) oder erstes (`_primIdx`)
  - `ui-views-family.js`: Hero lädt bevorzugtes Medium aus `marr.media`, Fallback `f.media`
  - `ui-views-source.js`: `_srcPrimIdx` berechnet, Ladereihenfolge prim-first, Hero nur für prim

- **sw v97** `fix`: Edit-Dialog + Picker alle Ordner
  - `ui-media.js`: `openEditMediaDialog` zieht `cfg_photo_base/cfg_doc_base` asynchron ab →
    bestehende absolute Pfade werden beim Bearbeiten als relativer Pfad angezeigt und gespeichert
  - `onedrive.js`: Bug fix — `_odEditPickMode` zeigte keine Dateien (nur `_odPickMode` wurde geprüft);
    beide Modi zeigen jetzt Dateiliste + korrekten Titel
  - `onedrive.js`: `↑ Übergeordneter Ordner`-Button wenn Picker aus Standard-Ordner gestartet wurde

- **sw v98** `fix`: Übergeordneter Ordner statt root
  - `_odPickStartFolderId` speichert Start-Ordner; `_odShowAllFolders()` fragt
    `parentReference` per API → navigiert zu übergeordnetem Ordner (bleibt relativ)

- **sw v99** `refactor`: Pfad als einzige Wahrheitsquelle — kein Filemap für Anzeige
  - `onedrive.js`: `_odGetMediaUrlByPath(path)` — lädt Datei direkt per OneDrive path-based API
    (`GET /drive/root:/{path}:/content`), kein Index-Mapping nötig
  - `onedrive.js`: `_odGetSourceFileUrl` — Priorität 1) Pfad direkt, 2) Legacy `od_filemap`
  - `ui-media.js`: `_asyncLoadMediaThumb(thumbId, idbKey, filePath)` — Pfad primär, filemap Legacy
  - `ui-media.js`: Edit-Dialog-Vorschau ebenfalls pfadbasiert
  - `ui-views-person.js` + `ui-views-family.js`: Hero + Thumbnails übergeben `m.file`
  - **Ergebnis**: Anzeigbild = geklicktes Bild = GEDCOM-Pfad — ein Pfad, eine Datei
  - `od_filemap` bleibt nur noch als Legacy-Fallback (Altdaten mit gespeicherten fileIds)

*Aktuelle sw-Version: v99 / Cache: stammbaum-v99*

---

### Session 2026-04-03 — Refactoring: ui-forms.js aufgeteilt (sw v95)

- **`showSourceDetail()`** aus `ui-forms.js` in `ui-views-source.js` ausgelagert
- Debug-Code bereinigt

*Aktuelle sw-Version: v95 / Cache: stammbaum-v95*

---

### Session 2026-04-03 — Refactoring: ui-views.js Split (sw v94)

- **`ui-views.js`** (1963 Z.) aufgeteilt in 5 Module:
  - `ui-views.js` (279 Z.) — gemeinsame Hilfsfunktionen (Labels, Topbar, Scroll-Helpers)
  - `ui-views-person.js` (392 Z.) — Personen-Detailansicht (`showDetail`, Avatar, Events, Medien)
  - `ui-views-family.js` (382 Z.) — Familien-Detailansicht (`showFamilyDetail`, Kinder, Medien)
  - `ui-views-source.js` (273 Z.) — Quellen-Detailansicht (`showSourceDetail`, Medien, Rückverweise)
  - `ui-views-tree.js` (651 Z.) — Sanduhr-Baum + Fan Chart (`showTree`, `showFanChart`, Tastaturnavigation)
- `index.html`: Script-Tags um 4 neue Module erweitert

*Aktuelle sw-Version: v94 / Cache: stammbaum-v94*

---

### Session 2026-04-03 — Bug 7 Fix: doppelter treeNavBack() (sw v93)

- **Fix Bug 7**: Doppelter `keydown`-Handler in `ui-forms.js` rief `treeNavBack()` beim ArrowLeft-Druck ein zweites Mal auf — überflüssiger ArrowLeft-Zweig in `ui-forms.js` entfernt

*Aktuelle sw-Version: v93 / Cache: stammbaum-v93*

---

### Session 2026-04-01 — Bug 5 + Bug 7 Fix: Topbar + History (sw v92)

- **Fix Bug 7**: `goBack()` legt keinen neuen History-Eintrag mehr an — `showTree(prev.id, false)` verhindert Doppeleintrag beim Zurück-Navigieren
- **Fix Bug 5**: `resize`-Handler ruft `_updateTopbarH()` sofort auf — Suchzeile schließt nahtlos an Topbar im Querformat an

*Aktuelle sw-Version: v92 / Cache: stammbaum-v92*

---

### Session 2026-03-31 — OneDrive + Filemap-Fixes (sw v89–v91)

- **Fix (sw v91)**: Filemap-Index-Sync — Foto wird nach OneDrive-Auswahl korrekt geladen; Race-Condition beim IDB-Schreiben/Lesen behoben
- **Fix (sw v90)**: OneDrive-Picker gibt absoluten Pfad zurück (nicht relativen)
- **Fix (sw v89)**: Medien-Basispfad wird automatisch aus GEDCOM-Importen erkannt
- **Fix**: Kamera/Galerie übernimmt konfigurierten Basispfad; vollständiger Pfad für alle Medien gespeichert
- **Fix**: OneDrive-Picker startet in konfiguriertem Ordner; vollständiger Pfad wird übergeben

*Aktuelle sw-Version: v91 / Cache: stammbaum-v91*

---

### Session 2026-03-31 — Einstellungen + Baum Auto-Fit (sw v86)

- **Fix**: Einstellungen immer zugänglich (auch wenn kein GEDCOM geladen)
- **Fix**: Medien-Basispfad Pre-fill korrekt vorbelegt
- **Fix**: Baum Auto-Fit bei Generationenwechsel springt nicht mehr
- Cache-Update: `sw.js` Precache für Settings-Änderungen aktualisiert

*Aktuelle sw-Version: v86 / Cache: stammbaum-v86*

---

## Version 4.0 ✅ (Branch `main`, ab 2026-03-30)

Schwerpunkt: Roundtrip-Vollständigkeit, ENGA-Ausbau, Quellenmanagement, Desktop UI/UX, Mobile, State-Refactoring.

---

### Session 2026-03-30 — Desktop-Sync, Schnell-Formular, Swipe (sw v76–v80)

- **Schnell-Formular neue Quellen**: neue Quelle zeigt nur ABBR + Titel; Toggle „Weitere Felder ▼" expandiert AUTH/Datum/Verlag/Archiv/Notiz/Medien; beim Bearbeiten immer alle Felder (`sfToggleMore()`, `sf-optional-fields`)
- **Swipe-Right = Zurück**: `_initDetailSwipe()` in allen Detailansichten (`v-detail`); Threshold 60px/400ms horizontal; visuelles TranslateX-Feedback + 0.2s Transition; kein Konflikt mit Scroll/Modals
- **Aktive Person/Familie in Liste hervorheben**: `.person-row.current` mit `box-shadow: inset 3px 0 0 var(--gold)`; `data-pid`/`data-fid` auf allen Rows; nach Render zentriert via `_scrollListToCurrent()`
- **Desktop: Listenmarkierung folgt Baumnavigation sofort**: `showTree()` ruft `_updatePersonListCurrent()` auf; `showDetail()` + `showFamilyDetail()` rufen `_updatePersonListCurrent`/`_updateFamilyListCurrent` auf
- **Desktop: Suchfeld sticky**: `.list-search-header` mit `position:sticky; top:52px` — Such-/Filterfelder bleiben beim Scrollen sichtbar (Personen, Familien, Quellen)
- **Fix scrollIntoView in fixed Container**: `_scrollListToCurrent()` via manuelles `scrollTop`-Delta statt `scrollIntoView` — zuverlässig in `position:fixed; overflow-y:auto` (`#v-main`)

*Aktuelle sw-Version: v80 / Cache: stammbaum-v80*

---

### Session 2026-03-30 — Finalisierung + Bugfixes (sw v74–v75)

- **Media-Badges in Listen**: 📎-Badge in Personen- und Familien-Liste wenn Medien verknüpft (analog Quellen-Liste)
- **Avatar-Platzhalter in Personen-Detail**: `det-avatar-{id}` mit Geschlechtssymbol (♂/♀/◇), analog Familie — ausgeblendet wenn Foto geladen
- **Fix Race Condition Foto-Erstanruf**: `confirmAddMedia()` jetzt `async` + `await idbPut()` vor `showDetail()`/`showFamilyDetail()` — verhindert dass IDB-Lesen vor IDB-Schreiben läuft
- **Fix UIState-Doppelnamespace**: `UIState.UIState._treeHistoryPos` → `UIState._treeHistoryPos` (6 Stellen) — Regression aus State-Refactoring; Baum war nach Laden und über ⧖-Button nicht aufrufbar
- **Listentext umbrechen**: `.p-name`/`.p-meta` umbrechen bei Überlänge statt ellipsis (wie Quellenliste)
- **Backlog erledigt**: alle offenen Features als abgeschlossen markiert

*Aktuelle sw-Version: v75 / Cache: stammbaum-v75*

---

### Session 2026-03-30 — State-Management-Refactoring (sw v73)

- **AppState / UIState**: 22 cross-file Globals in 2 Namespace-Objekte in `gedcom.js` migriert
- Backward-compat-Shims via `Object.defineProperty` auf `window` — alle Aufrufer ohne Änderung weiter funktionsfähig
- Vollständige Migration aller Dateien: `storage.js`, `ui-views.js`, `ui-forms.js`, `ui-media.js`, `onedrive.js`

*Aktuelle sw-Version: v73 / Cache: stammbaum-v73*

---

### Session 2026-03-30 — Refactoring: Datei-Splitting + demo.ged (sw v70–v73)

- **`onedrive.js`** (658 Z.) aus `ui-forms.js` extrahiert: OAuth-PKCE-Flow, Token-Refresh, GED-Datei-Picker, Foto-Import, Ordner-Browser, Einstellungen, Filemap-Helpers
- **`ui-media.js`** (344 Z.) aus `ui-forms.js` extrahiert: `openEditMediaDialog`, `openAddMediaDialog`, `showMediaBrowser`, `delete*Media`, `_asyncLoadMediaThumb`
- **`gedcom-parser.js`** (745 Z.) aus `gedcom.js` extrahiert: `parseGEDCOM()`, `parseGeoCoord()`
- **`gedcom-writer.js`** (485 Z.) aus `gedcom.js` extrahiert: `writeGEDCOM()`, `pushCont()`
- `gedcom.js` behält: Globals/`db`, Labels, Datum- und PLAC-Helfer (305 Z.) — neu: 8 Getter/Setter-Helfer (`getPerson/getFamily/getSource/getRepo`, `setPerson/setFamily/setSource/setRepo`)
- `ui-forms.js` schrumpft von 2567 auf 1568 Zeilen (reine Formulare)
- **`demo.ged`** (263 Z.) extrahiert aus `storage.js`: GEDCOM-Datei mit 12 Personen, 6 Familien, 3 Quellen, 4 Medien; `loadDemo()` lädt via `fetch('./demo.ged')` statt hardcodiertem JS-Array
- `storage.js` schrumpft von 970 auf 707 Zeilen
- `sw.js` Precache aktualisiert (v70 → v73), `demo.ged` eingeschlossen
- `.gitignore`: `!demo.ged` Ausnahme für `*.ged`-Regel

*Aktuelle sw-Version: v73 / Cache: stammbaum-v73*

---

### Session 2026-03-30 — Proband + Kekule-Nummern (sw v68–v69)

- **Konfigurierbarer Proband**: Startperson des Baums konfigurierbar (nicht mehr automatisch kleinste ID); Button in Baum-Topbar; Einstellung wird gespeichert
- **Kekule-Nummern im Baum**: Kekule/Ahnentafel-Nummerierung der Vorfahren-Karten (1=Proband, 2=Vater, 3=Mutter, 4–7=Großeltern …); fett dargestellt
- **Fix** (sw v69): Proband-Button ausgefüllt wenn aktiv + Kekule-Zahlen fett im korrekten Font
- **Fix** (sw v66): Titelleisten-Foto fehlte bei Personen/Familien mit mehreren Fotos (korrekter IDB-Key-Zugriff)
- **Fix** (sw v67): ☁-Symbol aus Baum-Topbar entfernt; Desktop Auto-Fit-Zoom beim ersten Laden

*Aktuelle sw-Version: v69 / Cache: stammbaum-v69*

---

### Session 2026-03-30 — Portrait-Baum + Button-Konsistenz (sw v60–v64)

- **Portrait-Baum**: im Hochformat (Smartphone) nur 2 Vorfahren-Ebenen (Eltern + Großeltern); im Querformat/Desktop bis zu 4 Ebenen; `isPortrait = window.innerWidth < window.innerHeight`
- **Baum Portrait kompakt** (sw v62): Minimal-Layout 360px; Pinch-to-Zoom auch im Querformat aktiviert
- **Baum-Vorfahrenpositionierung Fix** (sw v63): Korrekte X/Y-Berechnung für Vorfahren; Namens-/Datumsdarstellung verbessert
- **Proband-Button in Topbar + Suche** (sw v64): Quick-Access-Button in Baum-Topbar; Suche zugänglich
- Resize-Listener (debounced 250ms) in `_initTreeDrag()` — Baum bei Orientierungswechsel neu gezeichnet
- **Refactor**: Foto-Upload aus Personen-/Familien-/Quellen-Bearbeiten-Formularen entfernt (sw v60) — Fotos ausschließlich über Medien-Abschnitt in Detailansichten
- **UI**: Medien-„Hinzufügen"-Buttons nutzen `src-add-btn` (dashed pill) statt `btn` mit inline-Styles

*Aktuelle sw-Version: v64 / Cache: stammbaum-v64*

---

### Session 2026-03-29 — Schwerpunkt 3 Abschluss: Kamera, Vorlagen, Medien-Browser (sw v59)

- **Kamera-Button** in „Medium hinzufügen": `capture="environment"` + „Aus Galerie"-Button; Bild wird als base64 in IDB (`photo_src_{id}_{i}`, `photo_{id}_{i}`, `photo_fam_{id}_{i}`) gespeichert; Dateiname automatisch aus Timestamp generiert; `showSourceDetail()` prüft IDB vor OneDrive
- **Quellen-Vorlagen**: 5 Vorlagen-Buttons (Kirchenbuch / Standesamt / Volkszählung / Familienstammbuch / Zeitungsartikel) erscheinen beim Anlegen neuer Quellen (`showSourceForm(null)`); `_applySourceTemplate()` befüllt ABBR + Titel + Autor + Notiz
- **Medien-Browser**: 📎-Button im Quellen-Tab → Modal mit allen Quellen-Medien, gruppiert nach Quelle; async Thumbnails aus IDB + OneDrive; Klick → `showSourceDetail()`
- **Fix**: `deleteSourceMedia()` löscht nun auch IDB-Key `photo_src_{id}_{i}`

*Aktuelle sw-Version: v59 / Cache: stammbaum-v59*

---

### Session 2026-03-29 — Desktop UI/UX: Baum-Verbesserungen (sw v56–v58)

*Drag-to-Pan + Vollbild-Modus (sw v56):*
- **Drag-to-Pan**: `mousedown`/`mousemove`/`mouseup` auf `#treeScroll`; 5px-Threshold verhindert versehentliches Aktivieren; Click-Event nach Drag unterdrückt
- **Vollbild-Modus**: Button `⤢` in Baum-Topbar (nur desktop-mode); `body.tree-fullscreen` → `#v-tree { left:0 }`, Sidebar + Bottom-Nav ausgeblendet; Toggle zu `⤡`

*4 Vorfahren-Ebenen (sw v57):*
- **anc1–anc4**: Eltern, Großeltern, Urgroßeltern, Ururgroßeltern (bis zu 16 Karten)
- `ancSpan` dynamisch: 4/8/16 Slots je nach belegter Tiefe — keine unnötige Breite bei wenig Vorfahren
- `baseY` passt sich an: `ancLevels * ROW` Platz nach oben
- Ebenen -3/-4: leere Slots werden übersprungen (kein "?" für fehlende Vorfahren)
- Vertikale Zentrierung: `marginTop` zentriert Baum wenn kleiner als Viewport

*Tastaturnavigation + Pfeil-Legende (sw v58):*
- **Pfeiltasten**: ↑ Vater · Shift+↑ Mutter · ↓ erstes Kind · → aktiver Partner · ← History-Back
- `_treeNavTargets{}` wird bei jedem `showTree()` aktualisiert
- `_initTreeKeys()` einmalig: Listener nur wenn `v-tree` aktiv + kein Eingabefeld fokussiert
- **Pfeil-Legende**: kompakte Box unten rechts im Baum (nur desktop-mode), `position:absolute`
- Legende zeigt alle 5 Tasten mit Bezeichnung

*Aktuelle sw-Version: v58 / Cache: stammbaum-v58*

---

### Session 2026-03-29 — Medien-UI + Einstellungen (sw v50–v55)

### Session 2026-03-29 — sourceMedia{} + Quellenmanagement UI (sw v45–v49)

*sourceMedia{} — OBJE unter SOUR-Zitierungen strukturiert (sw v45):*
- **Neues Feld `sourceMedia{}`** auf allen Event-Objekten (birth/chr/death/buri, events[], marr, engag, FAM events[], childRelations.sourMedia{})
- OBJE-Blöcke ohne `@ref@` unter `2 SOUR @ID@` werden strukturiert geparst: `{ file, scbk (_SCBK), prim (_PRIM), titl, note, _extra[] }`
- `_smEntry`-Variable trackt den aktuellen OBJE-Block im Parser; Reset bei lv=1/2/3
- `_ptDepth=4` auf FILE: FORM/TYPE (lv=5/6) verbatim in `_smEntry._extra[]`
- Writer: `eventBlock()` + alle SOUR-Loop-Writer schreiben sourceMedia[] verbatim zurück
- `nameSourceMedia{}` auf INDI für NAME>SOUR OBJE-Blöcke

*Bug-Fixes (sw v46):*
- OBJE mit `@ref@` (z.B. `3 OBJE @M00001@`) bleibt korrekt in `sourceExtra{}` verbatim — `!val.startsWith('@')`-Guard auf alle OBJE-Branches
- `sourMedia:{}` fehlte in 3 childRelations-Init-Stellen (lv=2 bei CHIL, lv=3 bei _FREL/_MREL, lv=3 SOUR) → TypeError behoben

*Quellenmanagement UI — statische Icons + async OneDrive-Laden (sw v47–v48):*
- Quellen-Detailansicht: Medien-Abschnitt zeigt statische Icons (🖼/📄/📎) sofort beim Rendern
- Async: `_odGetSourceFileUrl(srcId, idx)` ersetzt Icon durch Thumbnail (Bild) oder klickbaren Link (Dokument) sobald OneDrive-URL verfügbar
- `deleteSourceMedia()` + filemap-Cleanup für sources-Einträge
- `confirmAddMedia()` speichert OneDrive-fileId in `od_filemap.sources`

*OneDrive Dokumente-Ordner (sw v49):*
- **Neues Feature**: Dokumente-Ordner in OneDrive einrichten → alle Dateinamen werden indiziert
- `odSetupDocFolder()` öffnet Ordner-Browser im neuen `_odDocScanMode`
- `odScanDocFolder(folderId, folderName)` scannt Ordner → `od_doc_filemap` in IDB (`{filename.lower: fileId}`)
- `_odGetSourceFileUrl()` nutzt Fallback: wenn kein manueller fileId → Dateiname aus GEDCOM-Pfad (`m.file`) gegen `od_doc_filemap` matchen (Basename, case-insensitiv)
- Neuer Menü-Button „📂 Dokumente-Ordner einrichten" (nur sichtbar wenn OneDrive verbunden)
- `od_doc_folder` IDB-Key speichert gescannten Ordner für Anzeige

*Aktuelle sw-Version: v49 / Cache: stammbaum-v49*

---

### Session 2026-03-28 — v4-dev UX + Diagnose (sw v34–v38)
- **EVEN TYPE-Feld** (sw v34): `onEventTypeChange()` zeigt `ef-etype-group` für `EVEN`-Events mit Bezeichnung-Label + Placeholder; fehlte vorher für sonstige Events
- **Inline-Layout Ereignistyp + Bezeichnung** (sw v35): Beide Felder in einer Flex-Zeile im Event-Formular
- **FROM/TO-Datum** (sw v36): `parseGedDate()` erkennt `FROM ... TO ...` und einzelne `FROM`/`TO`-Qualifier; `buildGedDate()` schreibt korrekt; `gedDateSortKey()` neue Hilfsfunktion
- **Datum-Sortierung Personenliste** (sw v36): Toggle-Button „⇅ Name / ⇅ Geb." in Personenliste; `_personSort` global; Jahrzehnt-Trenner bei Datum-Sortierung; Familienliste verwendet `gedDateSortKey()`
- **viewport-fit=cover** (sw v37): `<meta name="viewport" ... viewport-fit=cover>` — behebt verschobene Darstellung der Topbar auf iOS PWA mit `black-translucent` Status-Bar
- **Roundtrip: Passthrough-Ausgabe** (sw v38): `_ptAgg()` / `_ptFmt()` aggregieren Tag-Frequenzen; 10 Sektionen (INDI._passthrough, vital._extra, events._extra, sourceExtra, FAM._passthrough, marr/engag._extra, childRel.extra, SOUR._passthrough, NOTE._passthrough, extraRecords) werden im Roundtrip-Test ausgegeben

### Session 2026-03-28 — Roundtrip-Fixes (Teil 1)
- **HEAD verbatim**: `_headLines[]` bewahrt alle HEAD-Zeilen; nur `DATE`/`TIME` werden aktuell geschrieben
- **extraNames lv3-Routing**: `3 PAGE`/`3 QUAY` unter zweitem NAME-Eintrag via `_curExtraNameIdx`
- **BIRT/CHR/DEAT/BURI leere Events**: `seen:true/false`-Flag — leerer `1 BIRT`-Block ohne sub-tags bleibt erhalten
- **NOTE-Record Sub-Tags**: `CHAN`, `REFN`, `_VALID` unter `0 @Nxx@ NOTE` → `_passthrough[]` statt silent drop
- **MAP ohne PLAC**: `eventBlock` + `events[]`-Writer prüfen `obj.lati !== null` unabhängig von `obj.place`
- **ENGA vollständig**: `engag`-Objekt mit allen Feldern (date, place, lati, long, sources, sourcePages, sourceQUAY, sourceExtra, value, seen, _extra); Parser lv=1/2/3/4; Writer via `eventBlock('ENGA', ...)`

### Session 2026-03-28 — Roundtrip-Fixes (Teil 2)
- **ENGA MAP-Koordinaten**: `mapParent === 'ENGA'` in lv=4-Handler; `geoLines()` in `eventBlock('ENGA', ...)`
- **Leere DATE/PLAC-Werte**: `date`/`place` in allen Event-Objekten (birth/death/chr/buri/marr/engag/events[]) initialisiert mit `null` statt `''`; Parser setzt Wert direkt (auch `''` bei leerem Tag); Writer prüft `!== null` und schreibt `2 DATE` ohne trailing space wenn leer — behebt 7× INDI/BIRT/DATE und 7× INDI/BIRT/PLAC Roundtrip-Verluste
- **DATE/PLAC-Diagnose**: Roundtrip-Test zeigt Kontext (Record-Typ + lv=1-Tag) für fehlende `2 DATE`/`2 PLAC`-Zeilen; Diagnose verwendet denselben Multiset-Mechanismus wie Auto-Diff

**Roundtrip-Ergebnis nach diesen Sessions:** `≈0` (alle inhaltlichen Verluste behoben; verbleibend: CONC/CONT-Neuformatierung + HEAD-Rewrite — by design)

---

## Version 3.0 ✅ (März 2026 — Phase 3 abgeschlossen)

**Sprint-Plan:** P3-1 ✅ IndexedDB · P3-2 ✅ Fotos · P3-3 ✅ Suche/Filter · P3-4 ✅ Service Worker · P3-5 ✅ Baum-UI · P3-6 ✅ Undo · P3-7 ✅ Desktop-Layout · P3-8 ✅ OneDrive

### Sprint P3-1 — IndexedDB-Migration + Sortierung
- GEDCOM-Text (5 MB) von localStorage → IndexedDB (`stammbaum_ged`, `stammbaum_ged_backup`, `stammbaum_filename`)
- `_processLoadedText()`: IDB-Writes + localStorage als stiller Fallback
- `tryAutoLoad()`: async, IDB first → localStorage-Fallback mit automatischer Migration
- `saveToFileHandle()` + Download-Pfad: auch IDB aktualisieren
- `confirmNewFile()`: auch IDB-Keys löschen
- `_originalGedText` immer in RAM (kein Nullen mehr nach Backup)
- Familien-Liste: alphabetisch nach Vater-Nachname, dann nach Heiratsjahr sortiert

### Sprint P3-2 — Fotos
- Upload im Personen-Formular (`<input type="file" accept="image/*">`)
- Resize auf max 800px längste Seite, JPEG Quality 0.8 via Canvas
- IDB-Storage: Key `photo_<personId>` (getrennt vom GEDCOM-Text-Store)
- Detailansicht: 80×96px rechteckiges Foto links neben Name (CSS object-fit: cover)
- `_pendingPhotoBase64`: `undefined` = keine Änderung, `null` = löschen, `string` = neues Foto
- Sidecar-JSON Export (`stammbaum_photos.json`) + Import
- Foto wird nicht in GEDCOM geschrieben (App-internes Feld)

### Sprint P3-3 — Suche/Filter
- Volltext-Suche war bereits für alle Tabs vorhanden
- Geburtsjahr-Bereichsfilter (von/bis) im Personen-Tab
- ✕-Clear-Button für Von/Bis-Felder
- Filter kombinierbar mit Volltext-Suche

### Sprint P3-4 — Service Worker / Offline + PWA-Manifest
- `manifest.json`: Name, Icons, `display: standalone`, `start_url`
- `sw.js`: Cache-First-Strategie für `index.html` — App läuft vollständig offline
- Service-Worker-Registrierung in `index.html` (`navigator.serviceWorker.register('./sw.js')`)

### Sprint P3-5 — Stammbaum-Erweiterungen
- **Vorfahren-Ansicht**: 2 Ebenen Großeltern beidseitig im Sanduhr-Baum
- **Mehrfach-Ehen**: `⚭N`-Badge auf Zentrum-Karte wenn Person >1 Ehe; alle Ehe-Familien navigierbar
- **Halbgeschwister**: gestrichelter Rahmen + `½`-Badge für Kinder aus anderen Ehen
- **Pinch-Zoom**: Touch-Geste auf Baum-Ansicht (Scale 0.4–2.0) via `initPinchZoom()`
- Kinder mehrzeilig bei >4 (max. 4 pro Zeile)

### Sprint P3-6 — Undo / Revert + Keyboard-Shortcuts
- `revertToSaved()`: verwirft alle Änderungen, lädt GEDCOM-Text aus `_originalGedText` neu
- Menü-Eintrag „Änderungen verwerfen" → `revertToSaved()`
- **Keyboard-Shortcuts**: `Cmd/Ctrl+S` = Speichern · `Cmd/Ctrl+Z` = Änderungen verwerfen · `Escape` = Modal schließen · `←` = Baum zurück

### Sprint P3-7 — Responsives Desktop-Layout
- `@media (min-width: 900px)`: Zweispalten-Layout (Liste links 360px, Detail/Baum rechts)
- `body.desktop-mode` via JS gesetzt wenn `window.innerWidth >= 900`
- Baum-Ansicht rechts: volle Breite ab 900px
- Bottom-Nav auf 360px begrenzt (linke Spalte), FAB-Position angepasst
- Desktop-Placeholder: "Eintrag in der Liste auswählen" wenn kein Detail aktiv
- `has-detail`-Klasse für Placeholder-Ausblendung

### Sprint P3-8 — OneDrive-Integration
- **PKCE OAuth**: Code-Verifier/Challenge, Redirect zu Microsoft Login, Token-Exchange gegen Graph API — kein Server nötig
- Token in `localStorage` (`od_access_token`, `od_refresh_token`, Expiry-Check)
- **GEDCOM aus OneDrive öffnen**: `GET /me/drive/root/search` für `.ged`-Dateien → Picker-Modal
- **GEDCOM in OneDrive speichern**: `PUT /me/drive/items/{id}/content` → direkt in bestehende Datei
- **Foto-Import aus OneDrive**: Ordner-Browser (`_odShowFolder`), Auswahl → Base64 → IDB
- Menü: „☁ OneDrive verbinden/trennen" · „📂 Aus OneDrive öffnen" · „💾 In OneDrive speichern" · „🖼 Fotos aus OneDrive laden"
- `_odUpdateUI()`: Buttons ausblenden wenn nicht verbunden; verbundener Status persistent

### Post-P3-8 — Medien, Fotos, UI-Fixes (2026-03-27)

*Fotos & Medienanzeige:*
- **Lightbox**: Fotos klickbar → `#modalLightbox` Vollbild-Overlay; „Als Hauptfoto setzen"-Button
- **Mehrere Fotos pro Person/Familie**: IDB-Keys `photo_<id>_0`, `photo_<id>_1`, …; bevorzugtes Foto wählbar
- **Lazy Migration**: `photo_<id>` → `photo_<id>_0` beim ersten Öffnen (Rückwärtskompatibilität)
- **Dynamisches OneDrive-Foto-Laden**: kein vollständiger Base64-Download; `od_filemap` (IDB) speichert nur `fileId`/`filename`; `_odGetPhotoUrl()` lädt on-demand + Token-Auto-Refresh; Session-Cache `_odPhotoCache`
- **Standard-Ordner**: letzter Foto-Ordner in `od_default_folder` (IDB) gespeichert
- **BMP-Support**: `createImageBitmap` als Primary, `<img>`-Tag als Fallback

*Medien bearbeiten (in Detailansichten):*
- **Person**: Medien-Abschnitt immer sichtbar; „+ Hinzufügen" → `#modalAddMedia` (Titel + Dateiname, OneDrive-Picker wenn verbunden); × pro Eintrag → `deletePersonMedia()`
- **Familie**: Medien-Abschnitt immer sichtbar; neuer Eintrag in `f.marr._extra`; × → `deleteFamilyMarrMedia()` / `deleteFamilyMedia()`
- **Quelle**: Medien-Abschnitt immer sichtbar; neuer Eintrag in `s.media[]`; × → `deleteSourceMedia()`
- **OneDrive-Picker-Modus**: `_odPickMode=true` → Ordner-Browser zeigt auch Dateien; `_odCancelOrClose()` für korrekte Back-Navigation

*Medien hinzufügen/löschen:*
- `openAddMediaDialog()`, `confirmAddMedia()` — Person: `p.media[]`; Familie: `f.marr._extra`; Quelle: `s.media[]`
- `_removeFamMarrObjeAt()`, `_removeMediaFromFilemap()`, `_clearIdbPhotoKeys()`, `_addMediaToFilemap()`

*Bug-Fixes:*
- **⚭-Badge im Baum**: explizite Prüfung `personId === fam.husb/wife`
- **⚭-Linie bleibt beim Wechsel**: class `tree-marr-btn` + erweiterter Cleanup-Selektor
- **Familien-Hero-Foto** ersetzt 👨‍👩‍👧-Avatar
- **INDI OBJE geparst**: korrektes Parsing wiederhergestellt (ging komplett in `_passthrough`)

### UI/UX + Code-Qualität (2026-03-25)
- Baum: Geschlecht via `border-left` (blau=M, rosa=F) statt Symbol; `_treeShortName()` kürzt zu Initialen
- `tree-yr` 0.62rem → 0.68rem; Icons ♻→👤, §→📖
- Globaler Such-Tab (`🔍`) als 6. Bottom-Nav Button; sucht über alle Entitätstypen
- Fix: `#desktopPlaceholder` fehlte `display:none` → verdeckte Detail auf Mobile
- Fix: XSS in Photo-Import (`innerHTML` → DOM-API + Re-Validierung)
- Fix: Race Condition iOS-Share (`writeGEDCOM() === content` vor `changed=false`)
- Fix: Place-Autocomplete debounced (150ms); Desktop-Resize bidirektional
- Fix: IDB-Fehler zeigen Toast statt stumm zu scheitern
- Fix: Multi-Tab-Warnung via `window.storage`-Event
- Dead Code entfernt: `.tree-sex`, `.icloud-hint`, `.export-bar/.export-btn`, `normDateToISO()`

---

## Version 2.0 ✅ (März 2026 — Phase 2 abgeschlossen)

Schwerpunkt: Verlustfreier Ancestris-Roundtrip. Zeilen-Delta: -708 → **-7** (nur HEAD-Rewrite).

### Sprint 1 — Writer-Fixes
- A1: `HEAD` vollständig: DEST=ANY, FILE=, TIME=, PLAC.FORM, GEDC.FORM=LINEAGE-LINKED
- A2: `CHAN.TIME` schreiben (HH:MM:SS) bei allen save-Funktionen
- A3: `NOTE CONT`-Splitting bei 248 Zeichen
- A4: `OBJE FORM` aus Dateiendung schreiben
- A5: `DATE` Monats-Normalisierung beim Schreiben (AUG statt Aug)

### Sprint 2 — Parser-Erweiterungen
- `FACT+TYPE` + `MILI` parsen → events[]
- `RESN`, `EMAIL`, `WWW` auf INDI: Parser + Writer + Display
- `CHAN.TIME` parsen → `lastChangedTime`
- Display: EVENT_LABELS FACT/MILI, Event-Dropdown FACT/MILI/GRAD/ADOP

### Sprint 3 — NOTE-Records Roundtrip
- `0 @Nxx@ NOTE` Records parsen (inkl. Text auf gleicher Zeile) + schreiben vor TRLR
- `1 NOTE @Nxx@`-Referenzen bleiben Referenzen (noteRefs / noteTextInline getrennt)
- FAM noteRefs ergänzt; `savePerson()` noteTextInline-Fix

### Sprint 4 — QUAY Quellenqualität
- `sourceQUAY: {}` Dict parallel zu `sourcePages{}`
- `3 QUAY` parsen für BIRT/DEAT/CHR/BURI + alle events[]
- `3 QUAY` schreiben in eventBlock() + events-Loop
- QUAY-Dropdown (0–3) pro Quellenreferenz im UI

### Sprint 5 — UI-Ergänzungen
- Event-Formular: FACT+TYPE (inkl. TYPE-Freitext-Feld)
- Familien-Formular: ENGA (Verlobung) editierbar
- Personen-Formular: RESN, EMAIL, WWW

### Sprint 6 — Strukturiertes Datum + PLAC.FORM
- Datums-UI: Qualifier-Dropdown (exakt/ca./vor/nach/zwischen) + 3-Felder-Eingabe (Tag / Monat / Jahr)
- `normMonth()` normiert Zahlen und deutsch/englischen Text zu GEDCOM-Standard
- PLAC.FORM aus HEAD parsen (`db.placForm`) + Orts-Toggle Freitext ↔ 6-Felder-Eingabe

### Sprint 7 — Qualitätssicherung
- Roundtrip-Test im Browser: stabil mit Sprint 5+6-Tags
- Ancestris-Import-Test (2026-03-21): Delta -708 → ~0 erwartet ✅
- `_FREL`/`_MREL` Quellenreferenzen: `3 SOUR`/`4 PAGE`/`4 QUAY` unter Eltern-Kind-Beziehungstypen

### Sprint 8 — UI/UX-Fixes
- Ghost-Karten opacity 0.18 → 0.40
- GEDCOM-IDs (@Ixx@, @Fxx@, @Sxx@, @Rxx@) in Detail-Ansichten ausgeblendet
- Section-Header 0.68rem → 0.75rem; Topbar-Titel mit text-overflow ellipsis
- ☁-Icon goldfarben wenn direktes Speichern aktiv
- Familie-Formular: Kinder zeigen Klarnamen statt @Ixx@-IDs

### Sprint 9 — URL-Parameter + Topbar-Titel
- `?datei=` URL-Parameter: Dateiname wird in Topbar angezeigt
- `_processLoadedText` + `tryAutoLoad` setzen Topbar-Titel nach Datei-Load

### Sprint 10 — MARR/NAME/topSrc PAGE+QUAY; CONC-Fix
- `3 PAGE` + `3 QUAY` für `MARR`, `1 NAME`-Quellen, `topSources`
- `pushCont` CONC-Fix: keine leeren CONC-Zeilen mehr
- `pf-note` als `<textarea>` (mehrzeilige Notizen)
- `_FREL`/`_MREL` mit lv3–4 `SOUR`/`PAGE`/`QUAY`

### Sprint 11 — Verbatim Passthrough
- Systematische Lösung: `_ptDepth` + `_passthrough[]` auf INDI/FAM/SOUR
- Unbekannte lv1-Tags + deren Substruktur → `_passthrough[]`; Writer schreibt verbatim zurück
- `_nameParsed`: doppelte `1 NAME`-Einträge → zweite NAME-Blöcke in passthrough
- FAM: `MARR.value` gespeichert; unbekannte FAM-lv1-Tags → passthrough
- SOUR: OBJE/DATA und alle unbekannten lv1-Tags → passthrough; TEXT mehrzeilig
- Val-Fix: `.replace(/^ /, '').trimEnd()` — verhindert Instabilität bei CONC mit führenden Leerzeichen
- Delta: -708 → ~-100

### Sprint 12 — Roundtrip-Bugs: frelSeen + extraRecords
- `frelSeen`/`mrelSeen` Flags: `2 _FREL`/`2 _MREL` ohne Wert korrekt roundgetripped
- `_extraRecords[]`: unbekannte `0 @ID@ TYPE`-Records verbatim vor TRLR
- `MARR.addr`: `2 ADDR` unter `1 MARR` in FAM gespeichert + zurückgeschrieben
- Delta: ~-134 → **-126**

### Sprint 13 — OBJE vollständig: alle OBJE-Kontexte wiederhergestellt
- `marr._extra`: unbekannte lv=2-Tags unter `1 MARR` via `_ptTarget`-Redirect
- `nameSourceExtra{}`: `3 OBJE` unter `2 SOUR` unter `1 NAME`
- `birth/death/chr/buri.sourceExtra{}` + `._extra[]`: OBJE unter vital events
- `topSourceExtra{}`: `2 OBJE` unter `1 SOUR @id@`
- `ev._extra[]` + `ev.sourceExtra{}`: events[]
- `frelSourExtra[]` / `mrelSourExtra[]`: `4 OBJE` unter `3 SOUR` unter `_FREL/_MREL`
- Delta: **-126 → -84**

### Roundtrip-Nachbesserungen (2026-03-24)
- `raw.trim()` → `raw.replace(/\r$/, '')` — CONC-Stabilität
- `1 RELI` als Event strukturiert (nicht mehr als String-Feld)
- `2 SOUR` direkt unter `1 CHIL` in FAM geparst
- Mehrere `3 SOUR` unter `2 _FREL`/`2 _MREL`: Array statt Überschreiben

### Roundtrip-Nachbesserungen (2026-03-26)
- `ev.addrExtra[]` + REPO `r.addrExtra[]` für ADDR-Sub-Tags (CITY, POST, _STYLE, _MAP, _LATI, _LONG)
- `frelSourExtra[]`/`mrelSourExtra[]` + `_ptDepth=3` für mehrfache SOURs unter _FREL/_MREL
- `_ptNameEnd`-Index: NICK/NAME-Kontext-Passthrough direkt nach NAME-Block
- `_FREL`/`_MREL` ohne trailing space wenn `val=''`
- `_getOriginalText()`: `_originalGedText || localStorage` (RAM vor localStorage — wichtig für >5MB)
- Delta: **-84 → -7** → `roundtrip_stable=true`

**Bewusst akzeptierte Verluste (Stand v3.0, vor v4-dev-Fixes):**
- DATE -106 / CONC -70 / CONT -7: Normalisierung/Resplitting (Daten erhalten, Format geändert)
- `@Nxx@` -8: NOTE-Records mit leerem lv=0-Header + CONC-Fortsetzung
- SOUR -10, PAGE -4, ADDR -2, FILE -1, VERS/NAME/CORP/DEST/SUBM je -1: HEAD-Rewrite (by design)

→ In v4-dev wurden weitere Verluste behoben; aktueller Stand: CHANGELOG v4 oben.

---

## Version 1.2 ✅ (März 2026)

### REPO-Feature: Archive/Repositories
- `db.repositories` — neues Dictionary für GEDCOM `0 @Rxx@ REPO`-Records
- Parser: `0 @Rxx@ REPO` mit NAME, ADDR, PHON, WWW, EMAIL, CHAN/DATE
- `1 REPO @Rxx@` in SOUR + `2 CALN` → `s.repoCallNum`
- Writer: REPO-Records vor TRLR, `2 CALN` nach `1 REPO` in SOUR
- `#modalRepo` — Archiv-Formular; `#modalRepoPicker` — Archiv-Picker im Quellen-Formular
- `showRepoDetail()` — Detailansicht mit verlinkten Quellen

### Speichern/Export neu (Desktop)
- `showOpenFilePicker()` → `requestPermission({mode:'readwrite'})` → direktes Speichern auf Chrome Mac
- `_fileHandle` + `_canDirectSave` ersetzen alten `_dirHandle`-Ansatz
- Safari/Firefox Mac: `<a download>` → Browser-Download-Ordner
- iOS: Share Sheet (Hauptdatei + Zeitstempel-Backup)

### Weitere Fixes (v1.2-Ära)
- **SOUR/CHAN**: Änderungsdatum von Quellen-Records geparst, gespeichert, zurückgeschrieben
- **Multiple NOTEs unter Events**: akkumuliert, mit `\n` verbunden, als `CONT` ausgegeben
- **RESI/ADDR**: `2 ADDR` unter Wohnort-Ereignissen in `ev.addr` gespeichert + editierbar
- **PAGE Seitenangaben**: `3 PAGE` unter `2 SOUR` für alle Ereignistypen (roundtrip-stabil)
- **BIRT/CHR/DEAT/BURI** in Detailansicht anklickbar (gleiches Formular wie andere Events)
- **Sterbeursache (CAUS)** editierbar im Ereignis-Formular

---

## Version 1.1 ✅ (März 2026)

### Neue Beziehungen modellieren
- Beziehungs-Picker `#modalRelPicker` für Ehepartner / Kind / Elternteil
- `_pendingRelation`-Mechanismus: nach `savePerson()` öffnet automatisch `showFamilyForm()`
- `openRelFamilyForm()`: erkennt freien Slot in bestehender Elternfamilie

### Verbindungen trennen
- `×`-Button (`unlink-btn`) in `.rel-row`
- `unlinkMember(famId, personId)`: trennt husb / wife / child — aktualisiert beide Seiten

### Orte-Tab: Neue Orte + Autocomplete
- Manuelle Orte (`db.extraPlaces`) in localStorage persistent
- Orts-Autocomplete (case-insensitiv, Substring-Matching) in allen Ort-Eingabefeldern
- `+ Neuer Ort` über FAB-Chooser (`#modalNewPlace`)

### UI-Verbesserungen
- Zentrum-Karte im Baum: 120 px → 160 px
- Sektionen „Ehepartner & Kinder" und „Eltern" immer sichtbar

---

## Version 1.0 ✅ (März 2026)

Grundfunktionen: GEDCOM laden, parsen, anzeigen. Personen-, Familien-, Quellen-Listen. Detailansichten. iOS-kompatibel (Share Sheet, accept=*). Sanduhr-Stammbaum (2+1 Generationen + Ehepartner). Bottom-Navigation (5 Tabs). Beziehungen erstellen/bearbeiten/löschen. GEDCOM-Export (Roundtrip-stabil für Grundfelder).

---

## Passthrough-Mechanismen (Stand v3.0 — Details in ARCHITECTURE.md ADR-012)

9 Stück: `_passthrough[]` · `ev._extra[]` · `addrExtra[]` · `frelSourExtra[]`/`mrelSourExtra[]` · `sourceExtra{}` · `topSourceExtra{}` · `media._extra[]` · `childRelations.sourExtra{}` · `extraRecords[]`

*(In v4-dev: 10. Mechanismus `sourceMedia{}`/`sourMedia{}` ergänzt — siehe ARCHITECTURE.md)*
