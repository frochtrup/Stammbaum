# Changelog

Vollständige Sprint-Geschichte aller abgeschlossenen Versionen.
Aktuelle Planung: `ROADMAP.md`

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

**Bewusst akzeptierte Verluste (final):**
- DATE -106 / CONC -70 / CONT -7: Normalisierung/Resplitting (Daten erhalten, Format geändert)
- `@Nxx@` -8: NOTE-Records mit leerem lv=0-Header + CONC-Fortsetzung
- SOUR -10, PAGE -4, ADDR -2, FILE -1, VERS/NAME/CORP/DEST/SUBM je -1: HEAD-Rewrite (by design)

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
