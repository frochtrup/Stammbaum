# Stammbaum PWA

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
├── index.html          ← gesamte App (~2869 Zeilen, alles in einer Datei)
├── README.md           ← dieses Dokument
├── ARCHITECTURE.md     ← ADRs, Datenmodell, JS-Sektionen, CSS-Design-System
├── GEDCOM.md           ← Parser/Writer-Referenz, alle unterstützten Tags
└── ROADMAP.md          ← Phasen-Übersicht, offene Features, bekannte Probleme
```

---

## Features

### Laden & Speichern
| Feature | Details |
|---|---|
| GEDCOM öffnen | Datei-Picker, `accept="*/*"` (iOS-kompatibel) |
| Auto-Load | Letzte Datei in `localStorage` gecacht → automatisch beim Start |
| Desktop Speichern | File System Access API → Verzeichnis einmalig wählen, dann automatisch |
| Desktop Backup | Versionierte Sicherung: `backup/MeineDaten_YYYY-MM-DD_NNN.ged` |
| iOS Speichern | `navigator.share()` → zwei Dateien: Hauptdatei + Zeitstempel-Backup |
| Demo-Modus | Beispiel-Daten ohne eigene Datei |

### Sanduhr-Ansicht (Stammbaum)
- Grafische Familienansicht: Großeltern → Eltern → Person + Ehepartner → Kinder
- Klick auf jede Karte → neu zentrieren; Klick auf Zentrum → Detailansicht
- Kinder mehrzeilig bei mehr als 4 (max. 4 pro Zeile)
- Startansicht nach Datei-Load: Person mit kleinster ID
- Erreichbar über ⧖-Button in Personen- und Familienansicht

### Personen-Tab
- Alphabetische Liste mit Buchstaben-Trenner, Geburts-/Sterbejahr und Ort
- **Suche** über: Name, Titel, alle Ereignisse (Typ, Wert, Datum, Ort), Notizen, Religion
- **Detail**: Geburt, Taufe, Tod (inkl. Todesursache), Beerdigung, alle weiteren Ereignisse
- **Bearbeiten**: alle Ereignisse über einheitliches Formular (auch BIRT/CHR/DEAT/BURI)
- **📍** Geo-Links öffnen Apple Maps bei Ereignissen mit Koordinaten
- **📖** Quellen-Badges pro Ereignis → klickbar zur Quellen-Detailansicht

### Familien-Tab
- Liste: Elternpaar, Heiratsdatum, Kinderanzahl
- Detail: Heirat (Datum, Ort, Geo-Link, Quellen), Mitglieder anklickbar
- ⧖-Button öffnet Sanduhr zentriert auf den Ehemann

### Quellen-Tab
- Liste: Kurzname (ABBR), Autor, Datum, Anzahl Referenzen
- Detail: alle Metadaten + alle referenzierenden Personen und Familien

### Orte-Tab
- Automatisch aus allen Ereignissen gesammelt (Geburt, Taufe, Tod, Beerdigung, weitere)
- Alphabetisch mit 📍 bei vorhandenen Koordinaten
- Detail: Apple Maps Link + alle Personen dieses Ortes
- **Ort umbenennen**: Bearbeiten-Button → benennt in allen Personen und Familien um

### Bearbeiten
| Was | Felder |
|---|---|
| Person | Name (Vor-/Nachname, Präfix, Suffix), Geschlecht, Titel, Religion, Notiz |
| Ereignis | Typ (BIRT/CHR/DEAT/BURI/OCCU/RESI/…), Datum, Ort, Todesursache, Quellen |
| Familie | Eltern (Dropdown), Heirat (Datum, Ort), Kinder hinzufügen/entfernen, Quellen |
| Quelle | Titel, Kurzname, Autor, Datum, Verlag, Aufbewahrungsort, Notiz |
| Ort | Name umbenennen (wirkt sich auf alle Personen und Familien aus) |

**Quellen-Widget**: einheitlich in allen Formularen — Tags mit ✕, aufklappbare Picker-Liste mit allen Quellen

---

## Technischer Überblick

```
┌──────────────────────────────────────────────┐
│  index.html                                  │
│  Vanilla JS · Kein Framework · Kein Build    │
│  ~2869 Zeilen · ~80 Funktionen · ~145 KB     │
│                                              │
│  Globaler State: let db = {                  │
│    individuals, families, sources            │
│  }                                           │
│                                              │
│  Persistenz:                                 │
│  - localStorage (GEDCOM-Text, Auto-Load)     │
│  - IndexedDB (Verzeichnis-Handle Desktop)    │
└──────────────────────────────────────────────┘
```

**GEDCOM-Roundtrip:** Parse → Edit → Write → Parse: **1 Diff in 2796 Personen** (MeineDaten_ancestris.ged)

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
  └─ ☁ Speichern → Share Sheet → In Dateien sichern → iCloud Drive/Genealogie
     (zwei Dateien: Hauptdatei + Zeitstempel-Backup)

Änderungen speichern (Mac):
  └─ ☁ Speichern → Verzeichnis wählen (einmalig) → überschreibt + Backup-Ordner

Ancestris (Mac):
  └─ Datei → Import → GEDCOM → MeineDaten.ged übernehmen
```

---

## Lokale Entwicklung

```bash
python3 -m http.server 8080
# → http://localhost:8080
```

Oder direkt `index.html` im Browser öffnen (reicht für die meisten Features; File System Access API erfordert einen HTTP-Server).

---

## Getestete Umgebungen

| Plattform | Browser | Status |
|---|---|---|
| iPhone (iOS 17+) | Safari | Vollständig |
| iPhone (iOS 17+) | Chrome | Share Sheet nicht unterstützt |
| Mac | Safari | Vollständig |
| Mac | Chrome | Vollständig |
| Mac | Firefox | Vollständig |
| Android | Chrome | Apple Maps Links funktionieren nicht |
