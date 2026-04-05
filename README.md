# Stammbaum PWA — Version 5.0-dev

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
├── index.html          ← App-Shell (HTML + CSS)
├── gedcom.js           ← Globals, AppState/UIState, Labels, Datum/Ort-Helfer, Getter/Setter
├── gedcom-parser.js    ← parseGEDCOM(), parseGeoCoord()
├── gedcom-writer.js    ← writeGEDCOM(), pushCont()
├── storage.js          ← IndexedDB, Dateiverwaltung, Auto-Load
├── ui-views.js         ← gemeinsame Hilfsfunktionen (Labels, Topbar, Scroll-Helpers)
├── ui-views-person.js  ← Personen-Detailansicht
├── ui-views-family.js  ← Familien-Detailansicht
├── ui-views-source.js  ← Quellen-Detailansicht
├── ui-views-tree.js    ← Sanduhr-Baum + Fan Chart + Tastaturnavigation
├── ui-forms.js         ← Formulare Person/Familie/Quelle + Source-Widget + Utils
├── ui-forms-event.js   ← Event-Formular (showEventForm, saveEvent, deleteEvent)
├── ui-forms-repo.js    ← Archiv-Formular + Picker + Detail-Ansicht
├── ui-media.js         ← Medien Add/Edit/Delete/Browser
├── onedrive-auth.js    ← OAuth2 PKCE: Login, Logout, Token-Refresh, Callback
├── onedrive-import.js  ← Foto-Import-Wizard, Ordner-Browser, Pick-Modus
├── onedrive.js         ← Media-URL, Upload, File-I/O, Pfad-Helfer, Settings
├── demo.ged            ← Demo-GEDCOM (12 Pers., 6 Fam., 3 Quellen, 4 Medien)
├── sw.js               ← Service Worker (offline, Cache v146)
├── manifest.json       ← PWA-Manifest (Icons, standalone)
├── index_v1.2.html     ← Archiv: Version 1.2 (Phase 1)
├── README.md           ← dieses Dokument
├── ARCHITECTURE.md     ← ADRs, Passthrough-System, Roundtrip-Verlauf
├── DATAMODEL.md        ← Datenstrukturen (Person/Familie/Quelle), JS-Sektionen, Variablen
├── UI-DESIGN.md        ← HTML-Struktur, Navigation, CSS Design-System, Sanduhr-Layout
├── GEDCOM.md           ← Parser/Writer-Referenz, alle unterstützten Tags
├── ROADMAP.md          ← Phasen-Übersicht, bekannte Probleme
├── CHANGELOG.md        ← vollständige Sprint-Geschichte v1.0–v4.0
└── MEMORY.md           ← Projekt-Memory für KI-Kontext
```

---

## Features

### Navigation
| Feature | Details |
|---|---|
| Globale Bottom-Nav | 6 Tabs: ⧖ Baum · 👤 Personen · ⚭ Familien · 📖 Quellen · 📍 Orte · 🔍 Suche |
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
| Direktes Speichern (Chrome Mac) | `fileHandle.createWritable()` → schreibt direkt in die geöffnete Datei |
| Download-Fallback (Safari/Firefox) | `<a download>` → Datei im Browser-Download-Ordner + Zeitstempel-Backup |
| iOS Speichern (lokal) | `navigator.share()` → Share Sheet mit Hauptdatei + Zeitstempel-Backup |
| Demo-Modus | Menü → Demo-Daten öffnen |
| URL-Parameter `?datei=` | Dateiname in der Topbar anzeigen — z.B. `index.html?datei=MeineDaten.ged` |
| **Offline** | Service Worker + `manifest.json` → App funktioniert ohne Internet-Verbindung |
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
- **Pinch-Zoom**: Touch-Geste skaliert den Baum (0.4×–2.0×)
- **Drag-to-Pan**: Maus-Drag scrollt den Baum (Desktop)
- **Vollbild-Modus**: ⤢-Button blendet Sidebar aus (Desktop)
- **Tastaturnavigation**: ↑ Vater · Shift+↑ Mutter · ↓ Kind · → Partner · ← Zurück (Desktop)
- **Desktop Auto-Fit-Zoom**: Baum passt sich beim ersten Laden an die Fenstergröße an

### Personen-Tab
- Alphabetische Liste mit Buchstaben-Trenner, Geburts-/Sterbejahr und Ort
- **Suche** über: Name, Titel, alle Ereignisse (Typ, Wert, Datum, Ort), Notizen, Religion
- **Geburtsjahr-Filter**: Von/Bis-Felder mit ✕-Clear-Button
- **Foto**: Upload im Personen-Formular, Anzeige (80×96px) links neben Name in Detailansicht; Klick öffnet Lightbox
- **Mehrere Fotos**: Medien-Abschnitt mit allen Fotos klickbar; „Als Hauptfoto setzen" in Lightbox
- **Medien bearbeiten**: + Hinzufügen (Titel + Dateiname, optional aus OneDrive) · × Entfernen — direkt in der Detailansicht
- **Detail**: Geburt, Taufe, Tod (inkl. Todesursache), Beerdigung, alle weiteren Ereignisse
- **Quellen-Badges** `§N` direkt in der Ereigniszeile → klickbar zur Quellen-Detailansicht
- **📍** Geo-Links öffnen Apple Maps bei Ereignissen mit Koordinaten
- **Familie-Links**: direkte Navigationszeilen zu Ehe-Familie und Herkunftsfamilie

### Familien-Tab
- **Suche** nach Name, Heiratsdatum, Heiratsort
- Liste: Elternpaar, Heiratsdatum, Kinderanzahl
- Detail: Heirat (Datum, Ort, Geo-Link, Quellen), Mitglieder anklickbar
- **Medien bearbeiten**: + Hinzufügen · × Entfernen — direkt in der Familiendetailansicht
- ⧖-Button öffnet Sanduhr zentriert auf den Ehemann

### Quellen-Tab
- **Suche** nach Titel, Kurzname, Autor
- Liste: Kurzname (ABBR), Autor, Datum, Anzahl Referenzen, 🏛-Badge bei verknüpftem Archiv
- Detail: alle Metadaten + alle referenzierenden Personen und Familien
- **Medien bearbeiten**: + Hinzufügen · × Entfernen — direkt in der Quellendetailansicht
- **Archive-Sektion**: alle REPO-Records mit Quellen-Zähler; Sprungbutton „🏛 Archive"

### Orte-Tab
- **Suche** nach Ortsname
- Automatisch aus allen Ereignissen gesammelt (Geburt, Taufe, Tod, Beerdigung, weitere)
- Alphabetisch mit 📍 bei vorhandenen Koordinaten
- Detail: Apple Maps Link + alle Personen dieses Ortes
- **Ort umbenennen**: Bearbeiten-Button → benennt in allen Personen und Familien um

### Bearbeiten
| Was | Felder |
|---|---|
| Person | Name (Vor-/Nachname, Präfix, Suffix), Geschlecht, Titel, Religion, Notiz, RESN, E-Mail, Website |
| Ereignis | Typ (BIRT/CHR/DEAT/BURI/OCCU/RESI/EVEN/FACT/MILI/…), Datum (Qualifier + Tag/Monat/Jahr), Ort (Freitext oder 6-Felder), Adresse (bei RESI), Todesursache (bei DEAT), Quellen + Seitenangabe + Qualität (QUAY) |
| Familie | Eltern (Dropdown), Heirat + Verlobung (Datum, Ort), Kinder hinzufügen/entfernen, Quellen |
| Quelle | Titel, Kurzname, Autor, Datum, Verlag, Archiv (aus REPO-Liste), Signatur (CALN), Notiz |
| Archiv | Name, Adresse, Telefon, Website, E-Mail |
| Ort | Name umbenennen (wirkt sich auf alle Personen und Familien aus) |

**Beziehungen modellieren** (v1.1): `+ Ehepartner`, `+ Kind`, `+ Elternteil` direkt in den Detailansichten — bestehende Person wählen oder neue erstellen → Familien-Formular öffnet vorausgefüllt.

**Archive / Repositories** (v1.2): GEDCOM `0 @Rxx@ REPO`-Records vollständig unterstützt — Picker im Quellen-Formular, Detailansicht mit verlinkten Quellen, CALN (Signatur).

**Quellen-Widget**: einheitlich in allen Formularen — Tags mit ✕, aufklappbare Picker-Liste; im Ereignis-Formular zusätzlich editierbares Seitenfeld (PAGE) und Qualitäts-Dropdown (QUAY 0–3) pro Quelle.

**Strukturiertes Datum** (v2.0): Qualifier-Dropdown (exakt / ca. / vor / nach / zwischen) + 3-Felder-Eingabe (Tag / Monat / Jahr). Monat akzeptiert Zahlen und deutsch/englische Namen.

**Strukturierter Ort** (v2.0): Toggle zwischen Freitext und 6-Felder-Eingabe (Dorf / Stadt / PLZ / Landkreis / Bundesland / Staat) entsprechend dem PLAC.FORM aus dem GEDCOM-Header.

---

## Technischer Überblick

```
┌──────────────────────────────────────────────┐
│  Stammbaum PWA v4.0                          │
│  Vanilla JS · Kein Framework · Kein Build    │
│                                              │
│  index.html        — App-Shell, CSS          │
│  gedcom.js         — State, Labels, Helfer   │
│  gedcom-parser.js  — parseGEDCOM()           │
│  gedcom-writer.js  — writeGEDCOM()           │
│  storage.js        — IDB, Dateiverwaltung    │
│  ui-views*.js      — Baum, Detail, Listen    │
│  ui-forms*.js      — Formulare (3 Module)    │
│  ui-media.js       — Medien                  │
│  onedrive*.js      — OAuth, Fotos (3 Module) │
│  sw.js             — Service Worker (offline)│
│                                              │
│  State: AppState { db, changed, currentId…} │
│         UIState  { _treeHistory, _relMode…} │
│                                              │
│  Persistenz:                                 │
│  - IndexedDB primär (GEDCOM-Text, Fotos)     │
│  - localStorage stiller Fallback             │
│  - FileSystemFileHandle (Chrome direktes     │
│    Speichern)                                │
│  - Microsoft Graph API (OneDrive)            │
│                                              │
│  Offline: sw.js + manifest.json              │
└──────────────────────────────────────────────┘
```

**GEDCOM-Roundtrip:** Parse → Edit → Write → Parse: **STABIL · net_delta=0** (CONC/CONT-Neuformatierung akzeptiert; HEAD verbatim bei idempotenten Schreibvorgängen)
**Version 5.0-dev** — April 2026 — Branch `v5-dev` · sw v146

---

## Deployment: GitHub Pages

```
1. github.com → neues Repository „stammbaum" (public)
2. index.html hochladen (Upload files)
3. Settings → Pages → Branch: main → Save
4. URL: https://[username].github.io/stammbaum
```

Update: `index.html` ersetzen → nach ~1 Minute aktiv.

---

## Workflow: Stammbaum App ↔ Ancestris (Mac)

### OneDrive-Workflow (Standard)

OneDrive ist der primäre Workflow: Ancestris exportiert direkt in OneDrive, die App liest und schreibt dieselbe Datei via Microsoft Graph API — kein manuelles Übertragen mehr.

```
Ancestris (Mac)
  └─ Datei → Export → GEDCOM → OneDrive/Genealogie/MeineDaten.ged

Stammbaum App (Browser, beliebiges Gerät)
  └─ Menü → ☁ OneDrive verbinden (PKCE OAuth, einmalig)
     → Menü → 📂 Aus OneDrive öffnen → .ged-Datei wählen
     → Bearbeiten …
     → Menü → 💾 In OneDrive speichern

Ancestris (Mac):
  └─ Datei automatisch aktualisiert (OneDrive-Sync)
     → kein manueller Import nötig
```

**Voraussetzung (einmalig):** Azure App Registration mit `Files.ReadWrite`-Permission und Redirect-URI `https://[username].github.io/stammbaum/` (kostenlos, ~5 Min. im Azure Portal).

**Technisch:** Microsoft Graph API · PKCE OAuth (kein Server nötig) · Token in `sessionStorage` (nicht persistent nach Tab-Schließen) · `od_base_path` = GED-Datei-Ordner (auto-abgeleitet) · alle Medienpfade relativ dazu · `@microsoft.graph.downloadUrl` für CORS-freien Foto-Fetch · Session-Cache (Data-URLs, iOS-kompatibel)

### Lokaler Workflow (Fallback)

```
Ancestris (Mac)
  └─ Datei → Export → GEDCOM → iCloud Drive/Genealogie/MeineDaten.ged

Stammbaum App
  └─ Menü → Öffnen… (lokal) → .ged-Datei wählen
     → Bearbeiten …

Änderungen speichern (iOS):
  └─ 💾 Speichern → Share Sheet → In Dateien sichern → iCloud Drive/Genealogie

Änderungen speichern (Mac, Chrome):
  └─ 💾 Speichern → direkt in Originaldatei (Schreiberlaubnis beim Öffnen erteilt)

Änderungen speichern (Mac, Safari):
  └─ 💾 Speichern → Download-Ordner (+ Zeitstempel-Backup)

Ancestris (Mac):
  └─ Datei → Import → GEDCOM → MeineDaten.ged übernehmen
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
| iPhone (iOS 17+) | Safari | ✅ | ✅ Share Sheet |
| iPhone (iOS 17+) | Chrome | ✅ | ⚠️ Share Sheet nicht unterstützt |
| Mac | Safari | ✅ | ⚠️ Download (direktes Speichern nicht möglich) |
| Mac | Chrome | ✅ | ✅ Direktes Speichern |
| Mac | Firefox | ✅ | ⚠️ Download |
| Android | Chrome | ✅ | ⚠️ Apple Maps Links funktionieren nicht |
