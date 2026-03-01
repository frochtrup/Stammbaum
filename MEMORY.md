# Stammbaum PWA — Projekt-Memory

## Projekt-Überblick
- **Was:** Genealogie-Editor als Single-File PWA (`index.html`)
- **Ziel:** iPhone/iPad + Desktop, GEDCOM 5.5.1, kein Server, kein Build-Step
- **Stack:** Vanilla JS, kein Framework, kein npm
- **Pfad:** `/Users/franzdecker/Library/Mobile Documents/com~apple~CloudDocs/Genealogie/AppDev/files/`

## Dateien
- `index.html` — gesamte App (~4000 Zeilen, alle CSS/HTML/JS in einer Datei)
- `README.md` — Schnellstart, Feature-Übersicht, Workflow iPhone↔Mac
- `ARCHITECTURE.md` — ADRs, Datenmodell, JS-Sektionen, CSS-Design-System, Sanduhr-Algorithmus
- `GEDCOM.md` — Parser/Writer-Referenz, alle unterstützten Tags
- `ROADMAP.md` — Phasen-Übersicht, offene Features, bekannte Probleme
- `MEMORY.md` — dieses Dokument (auch unter `.claude/projects/.../memory/MEMORY.md`)
- `.claude/launch.json` — Dev-Server: `python3 -m http.server 8080`

## Aktueller Stand: Version 1.2 ✅ — zuletzt aktualisiert: 2026-03-02
Testdaten: MeineDaten_ancestris.ged — 2796 Personen, 873 Familien, 114 Quellen

---

## Version 1.2 — Neue Features (März 2026)

### REPO-Feature: Archive/Repositories
- `db.repositories` — neues Dictionary `{ '@R1@': { id, name, addr, phon, www, email, lastChanged } }`
- Parser: `0 @Rxx@ REPO` records + `1 REPO` / `2 CALN` in SOUR
- Writer: `0 @Rxx@ REPO` vor `0 TRLR`, `2 CALN` nach `1 REPO` in SOUR
- `currentRepoId = null` — State analog zu `currentPersonId`
- `_pendingRepoLink = { sourceId }` — gesetzt vor `showRepoForm(null)` aus Quellen-Formular
- `showRepoDetail(id)`, `showRepoForm(id)`, `saveRepo()`, `deleteRepo()`
- `#modalRepo` — Archiv-Formular (Name, Adresse, Telefon, Website, E-Mail)
- `#modalRepoPicker` — Archiv-Picker im Quellen-Formular mit Suche + "Neues Archiv"
- Quellen-Formular: `sf-repo-display` (klickbar, zeigt Name), `sf-caln` (Signatur, nur bei @Rxx@)
- Quellen-Detail: `s.repo` als klickbarer Link wenn `@Rxx@` → `showRepoDetail()`
- Quellen-Liste: `.repo-badge` (🏛) klickbar → `showRepoDetail()` + `🏛 Archive`-Sprungbutton
- Quellen-Tab: "Archive"-Sektion mit `renderRepoList()` nach Source-Liste
- Navigation: `_beforeDetailNavigate` + `goBack()` unterstützen `type:'repo'`

### Speichern/Export (Desktop)
- File System Access API entfernt (unzuverlässig auf macOS + iCloud Drive)
- `exportGEDCOM()` immer via `<a download>` — Browser-Download-Ordner
- iOS: Share Sheet bleibt unverändert
- `updateDirMenuBtn()` ist jetzt No-Op

---

## Version 1.1 — Neue Features (März 2026)

### Neue Beziehungen modellieren
- `#modalRelPicker` — Beziehungs-Picker Bottom-Sheet für Ehepartner / Kind / Elternteil
- Einstieg über `+ Ehepartner` / `+ Kind` / `+ Elternteil` direkt in Detailansichten
- Flow: bestehende Person wählen **oder** neue Person erstellen → Familien-Formular vorausgefüllt
- `_pendingRelation = { mode, anchorId }` — gesetzt vor `showPersonForm()`, ausgewertet in `savePerson()`
- `openRelFamilyForm(anchorId, partnerId, mode)`: erkennt freien Slot in bestehender Elternfamilie
- `showFamilyForm(id, ctx?)`: `ctx = { husb, wife, addChild }` für Vorausfüllung

### Verbindungen trennen
- `.unlink-btn` — 24px kreisförmiger ×-Button in `.rel-row`
- `unlinkMember(famId, personId)` — erkennt husb/wife/child, aktualisiert beide Seiten
- Person-Detail: `×` bei Ehepartner + Kindern; `×` am Herkunftsfamilien-Header
- Familien-Detail: `×` bei allen Mitgliedern

### UI-Verbesserungen
- Zentrum-Karte: CW=120 → CW=160 px
- `.section-add`-Buttons: `min-width: 100px; text-align: center; flex-shrink: 0`
- `.section-head` — Flexbox-Kopfzeile mit Titel + Add-Button
- Sektionen „Ehepartner & Kinder" + „Eltern" immer sichtbar (auch ohne Einträge)
- `+ Kind` auch in Personen-Detailansicht (pro Familien-Block)

---

## Roundtrip-Status
**Getestet: 1 Diff in 2796 Personen**

Alle wichtigen Felder überleben Parse→Write→Parse — Details in ARCHITECTURE.md.
Bewusst akzeptierte Verluste: _STAT, QUAY, NOTE-Records

---

## Globale Variablen (komplett)
```javascript
let db = { individuals:{}, families:{}, sources:{}, extraPlaces:{}, repositories:{} };
let changed = false;
let _placesCache = null;
let currentPersonId = null; let currentFamilyId = null; let currentSourceId = null;
let currentRepoId = null;
let currentTab = 'persons'; let currentTreeId = null;
const srcState = {}; const srcPageState = {};
let _dirHandle = null; let _idb = null; let _originalGedText = '';
const _navHistory = []; let _skipHistoryPush = false;
// v1.1 Beziehungs-Picker:
let _relMode = ''; let _relAnchorId = ''; let _pendingRelation = null;
// v1.2 REPO:
let _pendingRepoLink = null;
```

---

## Architektur-Schlüsselentscheidungen
- Single-File HTML (ADR-001) · Vanilla JS (ADR-002) · Globales `db` (ADR-003)
- localStorage cacht GEDCOM-Text (ADR-004) · iOS `accept="*/*"` (ADR-005)
- Desktop-Export: `<a download>` statt File System Access API (iCloud Drive inkompatibel) (ADR-007)
- BIRT/CHR/DEAT/BURI als Sonder-Objekte via `_SPECIAL_OBJ` (ADR-008)
- Globale Bottom-Nav außerhalb Views, z-index 400 (ADR-009)

## Sanduhr-Karten-Dimensionen
- Regulär: W=96, H=64 · Zentrum: CW=160, CH=80
- HGAP=10, VGAP=44, MGAP=20, SLOT=106, PAD=20, ROW=108

## Nächste Schritte
- **Offen (hohe Priorität):** Direktes Speichern auf dem Mac ohne manuelles Verschieben der Download-Datei. Bisherige Versuche (showDirectoryPicker, showSaveFilePicker + createWritable) scheitern auf macOS + iCloud Drive mit NotAllowedError / 0 KB. Details in ROADMAP.md.
- Phase 5: Fotos (Base64, max 800px JPEG)
- Phase 6: Filter nach Jahrgang/Ort/Quelle, Duplikate
- Phase 8: Zoom, mehrere Ehepartner im Baum
- Phase 9: Undo/Redo, Service Worker, QUAY

## Nutzer-Präferenzen
- Sprache: Deutsch · Kommunikation: kurz und direkt · Keine Emojis
