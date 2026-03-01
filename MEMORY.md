# Stammbaum PWA — Projekt-Memory

## Projekt-Überblick
- **Was:** Genealogie-Editor als Single-File PWA (`index.html`)
- **Ziel:** iPhone/iPad + Desktop, GEDCOM 5.5.1, kein Server, kein Build-Step
- **Stack:** Vanilla JS, kein Framework, kein npm
- **Pfad:** `/Users/franzdecker/Library/Mobile Documents/com~apple~CloudDocs/Genealogie/AppDev/files/`

## Dateien
- `index.html` — gesamte App (~3120 Zeilen, alle CSS/HTML/JS in einer Datei)
- `ARCHITECTURE.md` — ADRs, Datenmodell, JS-Sektionen, CSS-Design-System, Sanduhr-Algorithmus
- `GEDCOM.md` — Parser/Writer-Referenz, alle unterstützten Tags
- `ROADMAP.md` — Phasen-Übersicht, offene Features, bekannte Probleme
- `MEMORY.md` — dieses Dokument (auch unter `.claude/projects/.../memory/MEMORY.md`)
- `.claude/launch.json` — Dev-Server: `python3 -m http.server 8080`

## Aktueller Stand: Version 1.0 ✅ (März 2026)
Testdaten: MeineDaten_ancestris.ged — 2796 Personen, 873 Familien, 114 Quellen

---

## Roundtrip-Status (nach Fixes Feb 2026)
**Getestet: 1 Diff in 2796 Personen**

Alle wichtigen Felder überleben Parse→Write→Parse:
- NSFX (Suffix), RELI (Religion), CHAN (Änderungsdatum)
- OBJE/media (Foto-Pfade), SOUR pro Ereignis (BIRT/DEAT/CHR/BURI/events)
- FAM: MARR SOUR, ENGA (date/place), NOTE (inline + CONT)
- _UID, CAUS (Sterbeursache), 2 NOTE unter Events
- 2 SOUR unter NAME → `p.nameSources[]`
- SOUR direkt auf INDI → `p.topSources[]`

Bewusst akzeptierte Verluste: _STAT, QUAY, NOTE-Records

## GEDCOM-Nachbesserungen (März 2026)

### SOUR/CHAN
- Parser: `lv1tag==='CHAN' && tag==='DATE'` → `cur.lastChanged` (in SOUR-Block)
- Writer: nach `1 TEXT` → `1 CHAN / 2 DATE` wenn `s.lastChanged` gesetzt
- Detail: zeigt `· geändert DD MMM YYYY` in `detail-id`-Zeile
- `saveSource()`: setzt `lastChanged` automatisch auf heutiges Datum (GEDCOM-Format `DD MMM YYYY`)

### Multiple NOTEs unter Events
- Parser: `ev.note += (ev.note ? '\n' : '') + val` statt `ev.note = val`
- Mehrere `2 NOTE` unter einem Ereignis werden akkumuliert, nicht überschrieben

### RESI/ADDR
- Parser: `if (tag==='ADDR') ev.addr = (ev.addr ? ev.addr + '\n' : '') + val`
- Event-Init: `addr:''` in `cur.events.push({})`
- Writer: nach `2 NOTE`-Block → `2 ADDR [al[0]] / 3 CONT [al[i]]`
- Formular: `#ef-addr-group` (Textarea) sichtbar nur bei Typ RESI
- `onEventTypeChange()`: `ef-val-group` bei RESI ausgeblendet (semantisch leer)
- `showEventForm()`: lädt `ev.addr` in `ef-addr`
- `saveEvent()`: speichert `ef-addr` → `ev.addr`

### Quellen-Formular erweitert
- Felder: ABBR (Kurzname), TITL, AUTH, DATE, PUBL (Verlag), REPO, TEXT (Textarea)
- `showSourceDetail()`: zeigt alle Felder, `lastChanged` in ID-Zeile

### PAGE / Seitenangaben bei Quellenreferenzen (v1.0)
- `ev.sourcePages = { '@S1@': '47', ... }` — Parallel-Map zu `ev.sources[]`
- Gilt für birth / chr / death / buri und alle `events[]`
- Parser: `lastSourVal` trackt letzte SOUR-ID; `3 PAGE` unter `2 SOUR` → `sourcePages[lastSourVal]`
- `initSrcWidget(prefix, ids, pageMap)`: 3. Parameter übergibt Seiten-Map
- `srcPageState[prefix]` parallel zu `srcState[prefix]`; `updateSrcPage(prefix, sid, val)` als Setter
- `renderSrcTags()`: zeigt `<input class="src-page-input" placeholder="Seite…">` neben Quellen-Tag (nur bei prefix==='ef')
- `saveEvent()`: speichert `sourcePages: { ...(srcPageState['ef'] || {}) }`
- Writer `eventBlock()`: `${lv+2} PAGE` nach `${lv+1} SOUR`; reguläre events: `3 PAGE` nach `2 SOUR`

---

## UI-Cleanups (März 2026)

### Ereignis-Formular vereinheitlicht
- BIRT/CHR/DEAT/BURI in Detailansicht anklickbar → öffnen `#modalEvent`
- `_SPECIAL_OBJ = { BIRT:'birth', CHR:'chr', DEAT:'death', BURI:'buri' }`
- `_SPECIAL_LBL` für Labels
- Bei BIRT/CHR/DEAT/BURI: Typ-Feld gesperrt (disabled)
- Bei DEAT: `ef-cause`-Feld sichtbar
- `onEventTypeChange()` steuert Sichtbarkeit der Felder
- `saveEvent()` schreibt in `p.birth`/`p.chr`/`p.death`/`p.buri` oder `p.events[]`

### Personenformular bereinigt
- Geburtsdatum/Geburtsort/Sterbedatum/Sterbeort aus `#modalPerson` entfernt
- `savePerson()`: birth/death nur initialisiert wenn neu, nicht überschrieben

### Orte editierbar
- `#modalPlace`: Ort umbenennen
- `savePlace()`: benennt Ort in allen INDI (birth/chr/death/buri/events) + FAM (marr/engag) um

---

## Speichern / Backup (März 2026)

### Desktop (File System Access API)
- `exportGEDCOM()` → `saveToDirectory()`
- Verzeichnis-Handle (`_dirHandle`) in IndexedDB gespeichert
- `restoreDirHandle()` beim App-Start
- Speichert: `[dir]/MeineDaten.ged` + `[dir]/backup/MeineDaten_YYYY-MM-DD_NNN.ged`

### iOS (Share API)
- Zwei Dateien: `MeineDaten.ged` + `MeineDaten_YYYY-MM-DD_HHmmss.ged`

### IndexedDB-Helpers
- `_getIDB()` / `idbGet(key)` / `idbPut(key, val)` / `idbDel(key)`
- Store: `stammbaum_app` v1, Object Store `kv`

---

## Sanduhr-Ansicht (Phase 4, März 2026) ✅

### Layout
```
Ebene -2:  [GP0] [GP1]      [GP2] [GP3]   ← 4 Großeltern-Slots
Ebene -1:    [Vater]          [Mutter]
Ebene  0:      [Person★]  ⟿ [Ehepartner]  ← gold + gestrichelte Linie
Ebene +1:        [K0] [K1] [K2] [K3]      ← max. 4/Zeile, mehrzeilig
```

### Karten-Dimensionen
- Regulär: W=96, H=64 (CSS `.tree-card`)
- Zentrum: CW=120, CH=80 (CSS `.tree-card-center`)
- HGAP=10, VGAP=44, MGAP=20, SLOT=106, PAD=20, ROW=108

### Halbgeschwister
- Kinder aus anderen Ehen der Zentrumsperson → `.tree-card-half` (gestrichelter Rahmen) + `½`-Badge
- Verbindungslinie: `lineHalf()` — gestrichelt, gold-dim
- `halfSiblingSet = new Set(halfChildren)`; Vergleich gegen `spouseFamId`

### Interaktion
- Klick Nicht-Zentrum → `showTree(id)`
- Klick Zentrum → `showDetail(id)` → Zurück führt zum Baum zurück
- ⧖-Button in Personen- und Familien-Detailansicht
- Kein separater Detail-Button in Topbar (redundant)

### Startansicht
- `showStartView()`: nach Datei-Load → `showTree(smallestPersonId())`
- `smallestPersonId()`: sortiert numerisch, gibt @I001@ bei Standard-GEDs zurück

### Hilfsfunktionen
- `getParentIds(pid)` → `{ father, mother }` aus erster famc-Familie
- `getChildIds(pid)` → alle Kinder aus allen fams-Familien
- `let currentTreeId = null`

---

## Navigation (Phase 7, März 2026) ✅

### Bottom-Nav
- Globales `<nav id="bottomNav">` außerhalb aller Views, z-index 400
- Sichtbar: `v-main`, `v-tree`; versteckt: `v-landing`, `v-detail`
- 5 Tabs: `#bnav-tree` ⧖, `#bnav-persons` ♻, `#bnav-families` ⚭, `#bnav-sources` §, `#bnav-places` 📍
- `setBnavActive(name)` setzt `.active`-Klasse

### History-Stack
```javascript
const _navHistory = [];       // {type:'person'|'family'|'source'|'place'|'tree', id|name}
let _skipHistoryPush = false; // verhindert Doppel-Push während goBack()
```
- `_beforeDetailNavigate()`: am Anfang jeder Detail-Funktion
  - v-detail aktiv → Detail-auf-Detail: aktuellen State pushen
  - v-tree aktiv → `{type:'tree', id:currentTreeId}` pushen
  - sonst → History löschen (frischer Einstieg aus Liste)
- `goBack()`: pop → dispatch je nach type; leer → `showMain()`

### Familien-Links in Personendetail
- Abschnitt „Ehepartner & Kinder": `.family-nav-row` mit `onclick="showFamilyDetail(famId)"`
- Abschnitt „Eltern": analog für Herkunftsfamilien

---

## Quellen-Badges (Phase 7, März 2026) ✅

- `srcNum(sid)`: `@S042@` → `42`
- `sourceTagsHtml(sourceIds)`: gibt Inline-Spans `<span class="src-badge">§N</span>` zurück
  - `onclick="event.stopPropagation(); showSourceDetail(sid)"`
  - kein Wrapper-Div mehr
- `factRow(label, value, rawSuffix, srcIds)`: 4. Parameter für Quellen optional
- Badges direkt in `fact-val` eingebettet, bei langen Texten Zeilenumbruch

---

## Suche (Phase 7, März 2026) ✅

| Tab | Suchfelder | Filter-Funktion |
|---|---|---|
| Personen | Name, Titel, Ereignisse, Notizen, Religion | `filterPersons(q)` |
| Familien | Partner-Namen, Heiratsdatum, Heiratsort | `filterFamilies(q)` |
| Quellen | Titel, Kurzname, Autor | `filterSources(q)` |
| Orte | Ortsname | `filterPlaces(q)` |

Render-Funktionen akzeptieren optionale gefilterte Liste: `renderFamilyList(fams?)`, `renderSourceList(srcs?)`, `renderPlaceList(sorted?)`

---

## Globale Variablen (komplett)
```javascript
let db = { individuals:{}, families:{}, sources:{} };
let changed = false;
let currentPersonId = null;
let currentFamilyId = null;
let currentSourceId = null;
let currentTab = 'persons';
let currentTreeId = null;
const srcState = {};
const srcPageState = {};       // {prefix: {sid: page}} — Seitenangaben pro Quelle
let _dirHandle = null;
let _idb = null;
let _originalGedText = '';
const _navHistory = [];       // Navigation-History-Stack
let _skipHistoryPush = false; // Anti-Doppel-Push-Flag
```

---

## Architektur-Schlüsselentscheidungen
- Single-File HTML (ADR-001)
- Vanilla JS, kein Framework (ADR-002)
- Globales `db`-Objekt (ADR-003)
- localStorage cacht GEDCOM-Text (ADR-004)
- iOS: `accept="*/*"`, `navigator.share()` (ADR-005)
- Desktop: File System Access API + IndexedDB (ADR-007)
- BIRT/CHR/DEAT/BURI als Sonder-Objekte, nicht in `p.events[]` (ADR-008)
- Globale Bottom-Nav außerhalb aller Views (ADR-009)

---

## Nächste Schritte (ROADMAP)
- Phase 5: Fotos — Option B (Upload, Base64, max 800px JPEG)
- Phase 6: Filter nach Jahrgang/Ort/Quelle, Duplikate
- Phase 8: Stammbaum-Erweiterungen (Zoom, mehrere Ehepartner)
- Phase 9: Undo/Redo, Service Worker, QUAY

## Nutzer-Präferenzen
- Sprache: Deutsch
- Kommunikation: kurz und direkt
- Keine Emojis
