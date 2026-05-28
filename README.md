# Stammbaum PWA — Version 8.0

Genealogie-Editor als Progressive Web App für iPhone/iPad und Desktop.
Läuft vollständig im Browser — keine Installation, kein App Store, kein Server.

---

## Schnellstart

**Mit OneDrive (empfohlen):**
```
1. index.html auf GitHub Pages hochladen
2. https://[username].github.io/stammbaum in Safari öffnen
3. Teilen → „Zum Home-Bildschirm"
4. Menü → ☁ OneDrive verbinden → GEDCOM aus OneDrive laden
5. 💾 Speichern → schreibt direkt in OneDrive zurück
```

**Ohne OneDrive (lokal):**
```
1. index.html auf GitHub Pages hochladen
2. App im Browser öffnen
3. Menü → Öffnen… (lokal) → .ged-Datei wählen
```

---

## Dateien

```
stammbaum/
├── index.html          ← App-Shell (HTML-Struktur + Script-Tags)
├── styles.css          ← alle App-Styles
├── gedcom.js           ← AppState/UIState, Labels, Datum/Ort-Helfer, Getter/Setter
├── gedcom-parser.js    ← parseGEDCOM(), parseGeoCoord()
├── gedcom-writer.js    ← write*Record(), pushCont()
├── storage.js          ← IndexedDB, Demo, Backup, Foto-Export, Init
├── storage-file.js     ← IDB-Primitives, File System Access API, Export/Save
├── ui-views.js         ← gemeinsame Hilfsfunktionen (Labels, Topbar, Event-Delegation)
├── ui-views-person.js  ← Personen-Detailansicht + Liste
├── ui-views-family.js  ← Familien-Detailansicht + Liste
├── ui-views-source.js  ← Quellen-Detailansicht + Liste
├── ui-views-tree.js    ← Sanduhr-Baum + Tastaturnavigation
├── ui-desc-tree.js     ← Nachkommen-Baum (top-down SVG, Ehepartner/Geschwister)
├── ui-fanchart.js      ← Fan Chart (SVG, konzentrische Halbkreis-Segmente)
├── ui-timeline.js      ← Zeitleiste (Swim-Lane 5 Lanes + Dekaden-Modus, Mehrpersonen)
├── timeline-hist-events.js ← Historische Ereignisse (71 Einträge 1315–2024)
├── ui-story.js         ← Story Mode (Koordination, Helfer, Karte, Download)
├── ui-story-person.js  ← Personen-Biografie (18 Event-Templates, Ahnentafel-SVG)
├── ui-story-fam.js     ← Familien-Biografie (Heirat, Kinder, Geschwister)
├── story-epochs.js     ← Epochen-Tabelle für Story Mode (11 Einträge)
├── ui-chart-export.js  ← Diagramm-Export als PNG (Fächer, Sanduhr, Nachkommen)
├── gedcom-validator.js ← Validierungsengine: runValidation(db) → RAM-Befundbericht
├── ui-dedup.js         ← Duplikat-Erkennung (Levenshtein, Merge-Modal)
├── compare-engine.js   ← Datei-Vergleichs-Engine: cmpLoadFile(), cmpMatchPersons()
├── ui-import-compare.js ← Merge-Assistent (2-Panel Sheet: Liste + Diff)
├── ui-print.js         ← Druckausgaben: Ahnenliste (Kekule) + Familienbogen
├── ui-book.js          ← Buchgenerator (Ahnenindex, Biografie, Namenindex)
├── ui-forms.js         ← Source-Widget, Quelle-Formular, Modals, Gesten, Keyboard, Utils
├── ui-forms-person.js  ← Person-Formular + Extra-Name-Formular
├── ui-forms-family.js  ← Familie-Formular
├── ui-forms-event.js   ← Event-Formular (showEventForm, saveEvent, deleteEvent)
├── ui-forms-repo.js    ← Archiv-Formular + Picker + Detail-Ansicht
├── ui-media.js         ← Medien Add/Edit/Delete/Browser
├── onedrive-auth.js    ← OAuth2 PKCE: Login, Logout, Token-Refresh, Callback
├── onedrive-import.js  ← Foto-Import-Wizard, Ordner-Browser, Pick-Modus
├── onedrive.js         ← Media-URL, Upload, File-I/O, Pfad-Helfer, Settings
├── gramps-parser.js    ← parseGRAMPS() — GRAMPS XML-Import (read-only)
├── gramps-writer.js    ← writeGRAMPS() — GRAMPS XML-Export (gzip Blob)
├── debug-gramps.js     ← Debug-Tools für GRAMPS-Roundtrip (nur bei ?debug=1)
├── debug-activate.js   ← lädt debug-gramps.js dynamisch nur bei ?debug=1
├── gedcom-worker.js    ← Web Worker: parseGEDCOM() mit onProgress-Callback (5%-Schritte)
├── ui-views-map.js     ← Kartenansicht (Leaflet, Orte- und Personen-Modus, Animation)
├── ui-views-place.js   ← Orte-Ansicht: collectPlaces(), renderPlaceList(), showPlaceDetail()
├── ui-views-hof.js     ← Höfe-Ansicht: buildHofIndex(), renderHofList(), showHofDetail()
├── ui-views-tasks.js   ← Forschungsaufgaben: IDB-Persistenz, Badge, Tab, Click-Handler
├── ui-views-rlog.js    ← Forschungsprotokoll (RLOG): Add/Edit/Delete, Filter, MD-Export
├── ui-views-val.js     ← Validierungspanel + Val-Config-Modal
├── ui-views-nav.js     ← History-Navigation: goBack/goForward, _navHistory, Verlaufs-Picker
├── ui-views-undo.js    ← Undo/Redo: pushUndo, applyUndo, applyRedo
├── ui-event-delegation.js ← _CLICK_MAP (~100 Einträge), document-Listener (click/change/input)
├── ui-views-stats.js   ← Statistik-Dashboard (Lebensspannen, Heiratsalter, Histogramme)
├── ui-views-search.js  ← Globale Suche (Personen + Familien + Quellen + Orte, gruppiert)
├── ui-views-note.js    ← Notiz-Ansicht
├── leaflet.js          ← Leaflet 1.9.4 lokal (kein CDN)
├── leaflet.css         ← Leaflet CSS
├── demo.ged            ← Demo-GEDCOM (12 Pers., 6 Fam., 3 Quellen, 4 Medien)
├── offline.html        ← Offline-Fallback (self-contained, kein ext. CSS/JS)
├── sw.js               ← Service Worker (Network-first + 4s Timeout, Cache v742)
├── manifest.json       ← PWA-Manifest (Icons, standalone)
├── test.html           ← Standalone GEDCOM Roundtrip-Tester (kein UI, Drag-Drop .ged)
├── HANDBUCH.html       ← Benutzer-Handbuch (Stand: sw v741)
├── README.md           ← dieses Dokument
├── ARCHITECTURE.md     ← ADRs, Passthrough-System, Roundtrip-Verlauf
├── DATAMODEL.md        ← Datenstrukturen (Person/Familie/Quelle), JS-Sektionen, Variablen
├── UI-DESIGN.md        ← HTML-Struktur, Navigation, CSS Design-System, Sanduhr-Layout
├── GEDCOM.md           ← Parser/Writer-Referenz, alle unterstützten Tags
├── ROADMAP.md          ← Phasen-Übersicht, offene Features, bekannte Probleme
├── CHANGELOG.md        ← vollständige Sprint-Geschichte v1.0–v8.0
├── MEMORY.md           ← Projekt-Memory für KI-Kontext
└── specs/              ← Feature-Specs für Backlog-Items (F11-OCR.md etc.)
```

---

## Features

### Navigation
| Feature | Details |
|---|---|
| Globale Bottom-Nav | 6 Tabs: ⧖ Baum · 👤 Personen · ⚭ Familien · 📖 Quellen · 📍 Orte · ☑ Aufgaben |
| Proband wechseln | ☰ Menü → „⌂ Zum Probanden" navigiert zur aktuellen Startperson |
| Baum als Standardansicht | Nach Datei-Load wird der Sanduhr-Baum gezeigt |
| History-Navigation | Zurück-Button merkt Herkunft: Detail→Detail→Baum navigiert korrekt zurück |
| Menü überall erreichbar | ☰ Menü-Button in Baum- und Listenansicht |
| Globale Suche | 🔍-Tab durchsucht gleichzeitig Personen, Familien, Quellen und Orte mit gruppierten Ergebnissen |

### Laden & Speichern
| Feature | Details |
|---|---|
| **OneDrive öffnen** | Menü → ☁ OneDrive verbinden (PKCE OAuth, einmalig) → 📂 Aus OneDrive öffnen |
| **OneDrive speichern** | 💾 In OneDrive speichern → schreibt direkt in die OneDrive-Datei (Toast mit Pfad) |
| **Foto-Ordner** | Einstellungen → Foto-Ordner einrichten → Fotos dynamisch aus OneDrive geladen |
| **Dokumente-Ordner** | Einstellungen → Dokumente-Ordner einrichten |
| Auto-Load | Letzte Datei in IndexedDB gecacht → automatisch beim Start |
| GEDCOM öffnen (lokal) | Menü → Öffnen… (lokal) → `showOpenFilePicker()` (Chrome) oder `<input type="file">` |
| **GRAMPS XML öffnen** | Menü → Öffnen… (lokal) → `.gramps`-Datei wählen (gzip XML, read/write) |
| **GRAMPS-Badge** | Lila Pill in Topbar zeigt aktiven GRAMPS-Modus |
| Direktes Speichern (Chrome Mac) | `fileHandle.createWritable()` → schreibt direkt in die geöffnete Datei (GED + GRAMPS) |
| Download-Fallback (Safari/Firefox) | `<a download>` → Datei im Browser-Download-Ordner + Zeitstempel-Backup |
| iOS Speichern (lokal) | `navigator.share()` → Share Sheet mit Hauptdatei + Zeitstempel-Backup |
| Demo-Modus | Menü → Demo-Daten öffnen |
| **Offline** | Service Worker + `manifest.json` → App funktioniert ohne Internet-Verbindung |
| **Offline-Indikator** | Roter Indikator in Topbar + Toast bei Online/Offline-Wechsel; Cache-Status-Check |
| **DSGVO-Export** | Einstellungen → Datenschutz: lebende Personen beim GEDCOM-Export anonymisieren; `_anon`-Suffix; Original bleibt unberührt |
| **Keyboard-Shortcuts** | `Cmd/Ctrl+S` = Speichern · `Cmd/Ctrl+Z` = Änderungen verwerfen · `Escape` = Modal schließen · `←` = Baum zurück |

### Sanduhr-Ansicht (Stammbaum)
- Grafische Familienansicht: bis zu 4 Vorfahren-Ebenen (Eltern/Großeltern/Urgroßeltern/Ururgroßeltern) → Person + Ehepartner → Kinder
- Portrait-Modus: 2 Vorfahren-Ebenen; Querformat/Desktop: bis zu 4 Ebenen
- Klick auf jede Karte → neu zentrieren; Klick auf Zentrum → Detailansicht
- Zurück aus Detailansicht führt direkt zum Baum zurück
- **Mehrfach-Ehen**: `⚭N`-Badge auf Zentrum-Karte wenn >1 Ehe; alle Ehen navigierbar
- Halbgeschwister (aus anderen Ehen) mit gestricheltem Rahmen + `½`-Badge markiert
- Kinder mehrzeilig bei mehr als 4 (max. 4 pro Zeile)
- **Kekule-Nummern**: Ahnentafel-Nummern auf allen Vorfahren-Karten (1=Proband, 2=Vater, 3=Mutter …)
- **Konfigurierbarer Proband**: Startperson des Baums wählbar (Button in Topbar)
- **Pinch-Zoom**: Touch-Geste skaliert den Baum (0.3×–3.0×)
- **Drag-to-Pan**: Maus-Drag scrollt den Baum (Desktop)
- **Vollbild-Modus**: ⤢-Button blendet Sidebar aus (Desktop)
- **Tastaturnavigation**: ↑ Vater · Shift+↑ Mutter · ↓ Kind · → Partner · ← Zurück (Desktop)
- **Desktop Auto-Fit-Zoom**: Baum passt sich beim ersten Laden an die Fenstergröße an
- **Fan Chart**: ◑-Button in Topbar — konzentrische Halbkreis-Segmente (3–6 Generationen)

### Nachkommen-Ansicht
- **Toggle `⇩`** in der Baum-Topbar wechselt zwischen Sanduhr und Nachkommen-Baum
- Top-down-Darstellung: Proband oben, Kinder/Enkel darunter (Generationen 2–7 wählbar)
- **Ehepartner** des Probanden: in Reihe rechts mit ⚭-Button (öffnet Familien-Detail); bei mehreren Ehepartnern variabler Überlapp wenn wenig Platz
- **Geschwister** des Probanden: horizontal gestapelt links (variable Überlappung, max. normaler Kästchenabstand)
- **`½`-Badge** auf Kindern aus anderen Ehen des Elternteils (Halbkinder, analog Sanduhr)
- **`▼`-Badge** auf Karten mit abgeschnittenen Nachkommen — Klick lädt tiefere Generationen
- **Klick-Navigation**: alle Nicht-Proband-Karten navigieren im Baum; Klick auf Proband öffnet Detailansicht
- **T-Linien-Layout**: vertikale Linie vom Elternteil → horizontale Verbindungslinie → vertikale Linien zu allen Kindern

### Personen-Tab
- Alphabetische Liste mit Buchstaben-Trenner, Geburts-/Sterbejahr und Ort
- **Suche** über: Name, Titel, alle Ereignisse (Typ, Wert, Datum, Ort), Notizen, Religion
- **Erweiterte Filter**: Fehlende Felder-Checkboxen (kein Sterbedatum, keine Quellen, keine Eltern) kombinierbar
- **Geburtsjahr-Filter**: Von/Bis-Felder mit ✕-Clear-Button
- **CSV-Export**: gefilterte Personenliste als `;`-getrennte CSV-Datei (BOM für Excel/Numbers)
- **Foto**: Upload im Personen-Formular, Anzeige links neben Name in Detailansicht; Klick öffnet Lightbox
- **Mehrere Fotos**: Medien-Abschnitt mit allen Fotos klickbar; „Als Hauptfoto setzen" in Lightbox
- **Medien bearbeiten**: + Hinzufügen (Titel + Dateiname, optional aus OneDrive) · × Entfernen
- **Detail**: Geburt, Taufe, Tod (inkl. Todesursache), Beerdigung, alle weiteren Ereignisse
- **Quellen-Badges** `§N` direkt in der Ereigniszeile → klickbar zur Quellen-Detailansicht; QUAY-Farbindikator (Rot/Orange/Blau/Grün)
- **📍** Geo-Links öffnen Apple Maps bei Ereignissen mit Koordinaten
- **Familie-Links**: direkte Navigationszeilen zu Ehe-Familie und Herkunftsfamilie

### Familien-Tab
- **Suche** nach Name, Heiratsdatum, Heiratsort
- Liste: Elternpaar, Heiratsdatum, Kinderanzahl
- Detail: Heirat (Datum, Ort, Geo-Link, Quellen), Mitglieder anklickbar
- **Medien bearbeiten**: + Hinzufügen · × Entfernen
- **CSV-Export**: gefilterte Familienliste als `;`-getrennte CSV-Datei
- ⧖-Button öffnet Sanduhr zentriert auf den Ehemann

### Quellen-Tab
- **Suche** nach Titel, Kurzname, Autor
- Liste: Kurzname (ABBR), Autor, Datum, Anzahl Referenzen, 🏛-Badge bei verknüpftem Archiv
- Detail: alle Metadaten + alle referenzierenden Personen und Familien (inkl. PAGE/QUAY je Verwendung)
- **Medien bearbeiten**: + Hinzufügen · × Entfernen
- **Archive-Sektion**: alle REPO-Records mit Quellen-Zähler; Sprungbutton „🏛 Archive"

### Orte-Tab
- **Suche** nach Ortsname
- Automatisch aus allen Ereignissen gesammelt (Geburt, Taufe, Tod, Beerdigung, weitere)
- Alphabetisch mit 📍 bei vorhandenen Koordinaten
- Detail: Apple Maps Link + alle Personen dieses Ortes
- **Ort bearbeiten**: Name umbenennen (wirkt auf alle Personen/Familien) + Koordinaten editieren (Dezimalgrad oder GEDCOM-Format)
- **Kartenansicht**: interaktive Karte (Leaflet) mit Orte-Modus (alle geokodierten Orte) und Personen-Modus (Personen-Cluster)

### Höfe-Tab
- Listet alle Hofnamen aus den Ereignissen (RESI, EVEN, FACT)
- Detail: alle Bewohner eines Hofs chronologisch
- **Höfe-Formular**: Bewohner hinzufügen/entfernen

### Forschungsaufgaben (☑ Aufgaben-Tab)
- Eigener Bottom-Nav-Tab ☑ mit Badge für offene Aufgaben
- Aufgaben pro Person und Familie, kategorisiert (Kirchenbuch / Urkunde / Online-Recherche)
- Persistenz in GEDCOM (`_TASK`-Tag) und GRAMPS — Roundtrip-stabil
- Globale Aufgabenliste: Filter Alle / Offen / Erledigt; Klick auf Person/Familie → Detailansicht
- Aufgaben in der Personen- und Familien-Detailansicht direkt hinzufügen/bearbeiten/abhaken
- **Markdown-Export** (↓ MD): alle Aufgaben mit Kerndaten (Lebensdaten, Eltern, Ehen) als `.md`-Download
- **Forschungsprotokoll** (RLOG): pro Person/Familie — Archiv, Quelle, Suchanfrage, Ergebnis-Badge (gefunden/nicht gefunden/ausstehend); globaler Protokoll-Tab mit Filter + MD-Export

### Datenprüfung
- **„✓ Daten prüfen"**-Button direkt im Aufgaben-Tab (auch über ☰ Menü erreichbar)
- Prüft alle Personen und Familien auf 25 Regeln (fehlende Quellen, unrealistische Altersangaben, Konsistenz, Ortsnamenvarianten …)
- Befunde werden als reiner RAM-Bericht angezeigt (keine automatischen Aufgaben)
- **„+"**-Button neben jedem Befund: Befund als Forschungsaufgabe übernehmen
- Schweregrade: ✗ Fehler · ⚠ Warnungen · ℹ Hinweise

### Bearbeiten
| Was | Felder |
|---|---|
| Person | Name (Vor-/Nachname, Präfix, Suffix, Rufname), Geschlecht, Titel, Notiz, RESN, E-Mail, Website |
| Ereignis | Typ (BIRT/CHR/DEAT/BURI/OCCU/RESI/EVEN/FACT/MILI/…), Datum (Qualifier + Tag/Monat/Jahr), Ort (Freitext oder 6-Felder), Adresse (bei RESI), Todesursache (bei DEAT), Quellen + Seitenangabe + Qualität (QUAY) |
| Familie | Eltern (Dropdown), Heirat + Verlobung (Datum, Ort), Kinder hinzufügen/entfernen, Quellen + PAGE/QUAY |
| Quelle | Titel, Kurzname, Autor, Datum, Verlag, Archiv (aus REPO-Liste), Signatur (CALN), Notiz |
| Archiv | Name, Adresse, Telefon, Website, E-Mail |
| Ort | Name umbenennen + Koordinaten (wirkt sich auf alle Personen und Familien aus) |

**Beziehungsrechner**: Verwandtschaftsbeziehung zwischen zwei beliebigen Personen berechnen (BFS-Algorithmus, gemeinsamer Vorfahre, Generationsabstand). Aufruf über „🔗 zu …"-Button in der Personen-Detailansicht.

**Beziehungen modellieren**: `+ Ehepartner`, `+ Kind`, `+ Elternteil` direkt in den Detailansichten — bestehende Person wählen oder neue erstellen → Familien-Formular öffnet vorausgefüllt.

**Archive / Repositories**: GEDCOM `0 @Rxx@ REPO`-Records vollständig unterstützt — Picker im Quellen-Formular, Detailansicht mit verlinkten Quellen, CALN (Signatur).

**Quellen-Widget**: einheitlich in allen Formularen — Tags mit ✕, aufklappbare Picker-Liste; im Ereignis-Formular zusätzlich editierbares Seitenfeld (PAGE) und Qualitäts-Dropdown (QUAY 0–3) pro Quelle.

**Strukturiertes Datum**: Qualifier-Dropdown (exakt / ca. / vor / nach / zwischen) + 3-Felder-Eingabe (Tag / Monat / Jahr). Monat akzeptiert Zahlen und deutsch/englische Namen.

**Strukturierter Ort**: Toggle zwischen Freitext und 6-Felder-Eingabe (Dorf / Stadt / PLZ / Landkreis / Bundesland / Staat) entsprechend dem PLAC.FORM aus dem GEDCOM-Header.

---

## Technischer Überblick

```
┌──────────────────────────────────────────────┐
│  Stammbaum PWA v8.0                          │
│  Vanilla JS · Kein Framework · Kein Build    │
│                                              │
│  index.html          — App-Shell             │
│  styles.css          — alle Styles           │
│  gedcom.js           — State, Labels, Helfer │
│  gedcom-parser.js    — parseGEDCOM()         │
│  gedcom-writer.js    — write*Record()        │
│  gramps-parser.js    — parseGRAMPS()         │
│  gramps-writer.js    — writeGRAMPS()         │
│  storage*.js         — IDB, Dateiverwaltung  │
│  ui-views*.js        — Baum, Detail, Listen  │
│  ui-views-map.js     — Kartenansicht         │
│  ui-views-place.js   — Orte-Ansicht          │
│  ui-views-hof.js     — Höfe-Ansicht          │
│  ui-views-tasks.js   — Aufgaben + Validierung │
│  ui-desc-tree.js     — Nachkommen-Baum       │
│  gedcom-validator.js — Validierungsengine    │
│  ui-forms*.js        — Formulare (4 Module)  │
│  ui-fanchart.js      — Fan Chart (SVG)       │
│  ui-media.js         — Medien                │
│  onedrive*.js        — OAuth, Fotos (3 Mod.) │
│  leaflet.js/css      — Karte (lokal)         │
│  sw.js               — Service Worker        │
│                                              │
│  State: AppState { db, changed, currentId…} │
│         UIState  { _navHistory, _relMode…}  │
│                                              │
│  Persistenz:                                 │
│  - IndexedDB primär (GEDCOM/GRAMPS, Fotos)   │
│  - localStorage stiller Fallback             │
│  - FileSystemFileHandle (Chrome direktes     │
│    Speichern, GED + GRAMPS gzip)             │
│  - Microsoft Graph API (OneDrive)            │
│                                              │
│  Offline: sw.js + manifest.json              │
└──────────────────────────────────────────────┘
```

**GEDCOM-Roundtrip:** Parse → Edit → Write → Parse: **STABIL · net_delta=0** (CONC/CONT-Neuformatierung akzeptiert; HEAD verbatim bei idempotenten Schreibvorgängen)
**GRAMPS-Roundtrip:** Parse → Write → Parse: **STABIL** (vollständiger Passthrough aller nicht-modellierten Felder; 60034+ Checks)
**Version 8.0** — Mai 2026 — `v8-dev` · sw v742

---

## Deployment: GitHub Pages

```
1. github.com → neues Repository „stammbaum" (public)
2. Alle Dateien hochladen
3. Settings → Pages → Branch: main → Save
4. URL: https://[username].github.io/stammbaum
```

Update: Geänderte Dateien ersetzen → nach ~1 Minute aktiv.

---

## Workflow: GEDCOM-Dateien

### OneDrive-Workflow (Standard)

OneDrive ist der primäre Workflow: GEDCOM-Datei direkt in OneDrive ablegen, die App liest und schreibt dieselbe Datei via Microsoft Graph API.

```
Desktop-Programm (GRAMPS, Ancestris, …)
  └─ Datei → Export → GEDCOM → OneDrive/Genealogie/MeineDaten.ged

Stammbaum App (Browser, beliebiges Gerät)
  └─ Menü → ☁ OneDrive verbinden (PKCE OAuth, einmalig)
     → Menü → 📂 Aus OneDrive öffnen → .ged-Datei wählen
     → Bearbeiten …
     → Menü → 💾 In OneDrive speichern

Desktop-Programm:
  └─ Datei automatisch aktualisiert (OneDrive-Sync)
```

**Voraussetzung (einmalig):** Azure App Registration mit `Files.ReadWrite`-Permission und Redirect-URI `https://[username].github.io/stammbaum/` (kostenlos, ~5 Min. im Azure Portal).

**Technisch:** Microsoft Graph API · PKCE OAuth (kein Server nötig) · Token in `sessionStorage` · `od_base_path` = GED-Datei-Ordner (auto-abgeleitet) · alle Medienpfade relativ dazu · `@microsoft.graph.downloadUrl` für CORS-freien Foto-Fetch

### Lokaler Workflow (Fallback)

```
Desktop-Programm
  └─ Datei → Export → GEDCOM → iCloud Drive/Genealogie/MeineDaten.ged

Stammbaum App
  └─ Menü → Öffnen… (lokal) → .ged-Datei wählen → Bearbeiten …

Änderungen speichern (iOS):
  └─ 💾 Speichern → Share Sheet → In Dateien sichern → iCloud Drive/Genealogie

Änderungen speichern (Mac, Chrome):
  └─ 💾 Speichern → direkt in Originaldatei

Änderungen speichern (Mac, Safari):
  └─ 💾 Speichern → Download-Ordner (+ Zeitstempel-Backup)
```

---

## Lokale Entwicklung

```bash
python3 -m http.server 8080
# → http://localhost:8080
```

Dev-Server via `.claude/launch.json` konfiguriert.

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
