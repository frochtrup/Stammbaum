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
├── index.html          ← gesamte App (~4000 Zeilen, alles in einer Datei)
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
| GEDCOM öffnen | Datei-Picker, `accept="*/*"` (iOS-kompatibel) |
| Auto-Load | Letzte Datei in `localStorage` gecacht → automatisch beim Start |
| Desktop Speichern | `<a download>` → Datei landet im Browser-Download-Ordner |
| iOS Speichern | `navigator.share()` → zwei Dateien: Hauptdatei + Zeitstempel-Backup |
| Demo-Modus | Beispiel-Daten ohne eigene Datei |

> **Hinweis Mac:** Gespeicherte Datei liegt im Browser-Download-Ordner und muss ggf. manuell an den Originalort (iCloud Drive) verschoben werden. Direktes Zurückschreiben ist noch nicht zuverlässig gelöst.

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
│  index.html                                  │
│  Vanilla JS · Kein Framework · Kein Build    │
│  ~4000 Zeilen · ~130 Funktionen · ~210 KB    │
│                                              │
│  Globaler State: let db = {                  │
│    individuals, families, sources,           │
│    repositories, extraPlaces                 │
│  }                                           │
│                                              │
│  Persistenz:                                 │
│  - localStorage (GEDCOM-Text, Auto-Load)     │
│  - IndexedDB (Datei-Handle, Reserve)         │
└──────────────────────────────────────────────┘
```

**GEDCOM-Roundtrip:** Parse → Edit → Write → Parse: **1 Diff in 2796 Personen** (MeineDaten_ancestris.ged)
**Version 1.2** — März 2026

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
  └─ ☁ Speichern → lädt MeineDaten.ged in Download-Ordner
     → Datei manuell nach iCloud Drive/Genealogie verschieben

Ancestris (Mac):
  └─ Datei → Import → GEDCOM → MeineDaten.ged übernehmen
```

---

## Lokale Entwicklung

```bash
python3 -m http.server 8080
# → http://localhost:8080
```

Oder direkt `index.html` im Browser öffnen.

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
