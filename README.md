# Stammbaum PWA — Version 1.2

Genealogie-Editor als Progressive Web App für iPhone/iPad und Desktop.
Läuft vollständig im Browser — keine Installation, kein App Store, kein Server.

---

## Schnellstart

```
1. index.html auf GitHub Pages hochladen
2. https://[username].github.io/stammbaum in Safari öffnen
3. Teilen → „Zum Home-Bildschirm"
4. GEDCOM aus iCloud Drive laden
```

---

## Dateien

```
stammbaum/
├── index.html          ← gesamte App (v1.2, Phase 1 abgeschlossen)
├── index_v2.html       ← Entwicklungsdatei Phase 2 (v2.0-dev)
├── README.md           ← dieses Dokument
├── ARCHITECTURE.md     ← ADRs, Datenmodell, JS-Sektionen, CSS-Design-System
├── GEDCOM.md           ← Parser/Writer-Referenz, alle unterstützten Tags
├── ROADMAP.md          ← Phasen-Übersicht, offene Features, bekannte Probleme
└── MEMORY.md           ← Projekt-Memory für KI-Kontext
```

---

## Features

### Navigation
| Feature | Details |
|---|---|
| Globale Bottom-Nav | 5 Tabs: ⧖ Baum · ♻ Personen · ⚭ Familien · § Quellen · 📍 Orte |
| Baum als Standardansicht | Nach Datei-Load wird der Sanduhr-Baum gezeigt |
| History-Navigation | Zurück-Button merkt Herkunft: Detail→Detail→Baum navigiert korrekt zurück |
| Menü überall erreichbar | ☰ Menü-Button in Baum- und Listenansicht |

### Laden & Speichern
| Feature | Details |
|---|---|
| GEDCOM öffnen (Chrome Mac) | `showOpenFilePicker()` → Schreiberlaubnis wird beim Öffnen angefragt |
| GEDCOM öffnen (Safari/iOS) | `<input type="file">`, `accept="*/*"` (iOS-kompatibel) |
| Auto-Load | Letzte Datei in `localStorage` gecacht → automatisch beim Start |
| Direktes Speichern (Chrome Mac) | `fileHandle.createWritable()` → schreibt direkt in die geöffnete Datei |
| Download-Fallback (Safari Mac, Firefox) | `<a download>` → Datei im Browser-Download-Ordner |
| Backup automatisch | Bei Download-Fallback: Zeitstempel-Backup des Originals zusätzlich heruntergeladen |
| iOS Speichern | `navigator.share()` → Share Sheet mit Hauptdatei + Zeitstempel-Backup |
| Demo-Modus | Beispiel-Daten ohne eigene Datei |

**Chrome Mac — direktes Speichern:**
1. Upload-Box klicken → Dateidialog öffnet sich
2. `.ged`-Datei auswählen → Browser fragt Schreiberlaubnis → bestätigen
3. Toast: „✓ Datei geladen · Direktes Speichern aktiv"
4. Speichern-Button (💾) → schreibt direkt in die Originaldatei

**Safari Mac — Download-Workflow:**
1. Datei laden → `<a download>` beim Speichern → landet in `~/Downloads`
2. Optionaler Tipp: Safari → Einstellungen → Allgemein → Downloadordner auf iCloud Drive setzen

### Sanduhr-Ansicht (Stammbaum)
- Grafische Familienansicht: Großeltern → Eltern → Person + Ehepartner → Kinder
- Klick auf jede Karte → neu zentrieren; Klick auf Zentrum → Detailansicht
- Zurück aus Detailansicht führt direkt zum Baum zurück
- Halbgeschwister (aus anderen Ehen) mit gestricheltem Rahmen + `½`-Badge markiert
- Kinder mehrzeilig bei mehr als 4 (max. 4 pro Zeile)
- Startansicht nach Datei-Load: Person mit kleinster ID

### Personen-Tab
- Alphabetische Liste mit Buchstaben-Trenner, Geburts-/Sterbejahr und Ort
- **Suche** über: Name, Titel, alle Ereignisse (Typ, Wert, Datum, Ort), Notizen, Religion
- **Detail**: Geburt, Taufe, Tod (inkl. Todesursache), Beerdigung, alle weiteren Ereignisse
- **Quellen-Badges** `§N` direkt in der Ereigniszeile → klickbar zur Quellen-Detailansicht
- **📍** Geo-Links öffnen Apple Maps bei Ereignissen mit Koordinaten
- **Familie-Links**: direkte Navigationszeilen zu Ehe-Familie und Herkunftsfamilie

### Familien-Tab
- **Suche** nach Name, Heiratsdatum, Heiratsort
- Liste: Elternpaar, Heiratsdatum, Kinderanzahl
- Detail: Heirat (Datum, Ort, Geo-Link, Quellen), Mitglieder anklickbar
- ⧖-Button öffnet Sanduhr zentriert auf den Ehemann

### Quellen-Tab
- **Suche** nach Titel, Kurzname, Autor
- Liste: Kurzname (ABBR), Autor, Datum, Anzahl Referenzen, 🏛-Badge bei verknüpftem Archiv
- Detail: alle Metadaten + alle referenzierenden Personen und Familien
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
| Person | Name (Vor-/Nachname, Präfix, Suffix), Geschlecht, Titel, Religion, Notiz |
| Ereignis | Typ (BIRT/CHR/DEAT/BURI/OCCU/RESI/…), Datum, Ort, Adresse (bei RESI), Todesursache (bei DEAT), Quellen + Seitenangabe |
| Familie | Eltern (Dropdown), Heirat (Datum, Ort), Kinder hinzufügen/entfernen, Quellen |
| Quelle | Titel, Kurzname, Autor, Datum, Verlag, Archiv (aus REPO-Liste), Signatur (CALN), Notiz |
| Archiv | Name, Adresse, Telefon, Website, E-Mail |
| Ort | Name umbenennen (wirkt sich auf alle Personen und Familien aus) |

**Beziehungen modellieren** (v1.1): `+ Ehepartner`, `+ Kind`, `+ Elternteil` direkt in den Detailansichten — bestehende Person wählen oder neue erstellen → Familien-Formular öffnet vorausgefüllt.

**Archive / Repositories** (v1.2): GEDCOM `0 @Rxx@ REPO`-Records vollständig unterstützt — Picker im Quellen-Formular, Detailansicht mit verlinkten Quellen, CALN (Signatur).

**Quellen-Widget**: einheitlich in allen Formularen — Tags mit ✕, aufklappbare Picker-Liste; im Ereignis-Formular zusätzlich editierbares Seitenfeld (PAGE) pro Quelle.

---

## Technischer Überblick

```
┌──────────────────────────────────────────────┐
│  index.html (v1.2 — Phase 1 abgeschlossen)   │
│  Vanilla JS · Kein Framework · Kein Build    │
│  ~4200 Zeilen · ~140 Funktionen · ~215 KB    │
│                                              │
│  Globaler State: let db = {                  │
│    individuals, families, sources,           │
│    repositories, extraPlaces                 │
│  }                                           │
│                                              │
│  Persistenz:                                 │
│  - localStorage (GEDCOM-Text, Auto-Load)     │
│  - IndexedDB (FileSystemFileHandle)          │
└──────────────────────────────────────────────┘
```

**GEDCOM-Roundtrip:** Parse → Edit → Write → Parse: **1 Diff in 2796 Personen** (MeineDaten_ancestris.ged)
**Version 1.2** — März 2026 — Phase 1 abgeschlossen

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

## Workflow: iPhone ↔ Ancestris (Mac)

```
Ancestris (Mac)
  └─ Datei → Export → GEDCOM → iCloud Drive/Genealogie/MeineDaten.ged

iPhone Safari → Stammbaum App
  └─ Automatisch aus localStorage (nach erstem Laden)
     oder: Datei laden → iCloud Drive → MeineDaten.ged

Änderungen speichern (iOS):
  └─ 💾 Speichern → Share Sheet → In Dateien sichern → iCloud Drive/Genealogie
     (zwei Dateien: Hauptdatei + Zeitstempel-Backup)

Änderungen speichern (Mac, Chrome — direktes Speichern):
  └─ Datei über Upload-Box öffnen → Schreiberlaubnis bestätigen
     → 💾 Speichern → direkt in Originaldatei

Änderungen speichern (Mac, Safari — Download):
  └─ 💾 Speichern → MeineDaten.ged im Download-Ordner
     → Tipp: Safari-Download-Ordner auf iCloud Drive/Genealogie setzen

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
