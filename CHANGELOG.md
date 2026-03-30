# Changelog

Vollständige Sprint-Geschichte aller abgeschlossenen Versionen.
Aktuelle Planung: `ROADMAP.md`

---

## Version 4.0 🚧 (Branch `v4-dev`, ab 2026-03-27)

Schwerpunkt: Roundtrip-Vollständigkeit, ENGA-Ausbau, Quellenmanagement, Desktop UI/UX, Mobile.

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
