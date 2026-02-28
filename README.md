# Stammbaum PWA

Genealogie-Editor als Progressive Web App für iPhone/iPad und Desktop.  
Läuft vollständig im Browser – keine Installation, kein App Store, kein Server.

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
├── index.html              ← gesamte App (~2300 Zeilen, alles in einer Datei)
└── docs/
    ├── README.md           ← dieses Dokument
    ├── ARCHITECTURE.md     ← Architektur-Entscheidungen & Datenmodell
    ├── GEDCOM.md           ← Parser/Writer Referenz & alle unterstützten Tags
    └── ROADMAP.md          ← offene Features & bekannte Probleme
```

---

## Features

### Laden & Speichern
| Feature | Details |
|---|---|
| GEDCOM öffnen | Datei-Picker, `accept="*/*"` (iOS-kompatibel) |
| Auto-Load | Letzte Datei in `localStorage` gecacht → automatisch beim Start |
| iOS Speichern | `navigator.share()` → Share Sheet → „In Dateien sichern" → iCloud |
| Desktop Speichern | Blob-Download |
| Demo-Modus | Beispiel-Daten ohne eigene Datei |

### Personen-Tab
- Alphabetische Liste mit Buchstaben-Trenner, Geburts-/Sterbejahr und Ort
- **Suche** über: Name, Titel, Geburts-/Sterbe-/Tauf-/Beerdigungsort und -datum, alle Ereignisse (Typ, Wert, Datum, Ort), Notizen, Religion
- **Detail**: Lebensdaten (Geburt, Taufe, Tod, Beerdigung), alle Ereignisse mit Typ, Notizen, Medien-Liste, Familienmitglieder
- **📍** Geo-Links öffnen Apple Maps (bei allen Ereignissen mit Koordinaten)
- **📖** Quellen-Badges pro Ereignis → klickbar zur Quellen-Detailansicht
- Ereignisse antippen → Bearbeitungsformular

### Familien-Tab
- Liste: Elternpaar, Heiratsdatum, Kinderanzahl
- Detail: Heirat (Datum, Ort, Geo-Link, Quellen), Mitglieder anklickbar

### Quellen-Tab
- Liste: Kurzname (ABBR), Autor, Datum, Anzahl Referenzen
- Detail: alle Metadaten + alle referenzierenden Personen + Familien

### Orte-Tab
- Automatisch aus allen Ereignissen gesammelt
- Alphabetisch mit 📍 bei vorhandenen Koordinaten
- Detail: Apple Maps Link + alle Personen dieses Ortes mit Ereignistyp

### Bearbeiten
- **Personen**: Name, Geschlecht, Geburt, Tod, Beruf, Notiz, Quellen
- **Familien**: Eltern (Dropdown), Heirat (Datum, Ort), Kinder, Quellen
- **Quellen**: Titel, Kurzname, Autor, Datum, Verlag, Aufbewahrung, Notiz
- **Ereignisse**: Typ, Wert, Datum, Ort, Quellen — neu oder bestehend bearbeiten
- **Quellen-Widget**: einheitlich in allen Formularen — Tags mit ✕, aufklappbare Picker-Liste

---

## Deployment: GitHub Pages

```
1. github.com → neues Repository „stammbaum" (public)
2. index.html hochladen (Upload files)
3. Settings → Pages → Branch: main → Save
4. URL: https://[username].github.io/stammbaum
```

Jedes Update: `index.html` ersetzen → nach ~1 Minute aktiv.

---

## Workflow: iPhone ↔ Ancestris (Mac)

```
Ancestris (Mac)
  └─ Datei → Export → GEDCOM → iCloud Drive/Genealogie/MeineDaten.ged

iPhone Safari → stammbaum App
  └─ Lädt automatisch aus localStorage (nach erstem Mal)
     oder: Datei laden → iCloud Drive → MeineDaten.ged

Änderungen speichern:
  └─ Teilen (☁) → In Dateien sichern → iCloud Drive/Genealogie

Ancestris (Mac):
  └─ Datei → Import → GEDCOM → überschreiben
```

---

## Lokale Entwicklung

```bash
# Direkt öffnen (reicht für die meisten Features)
open index.html

# Mit lokalem Server (falls CORS-Probleme)
python3 -m http.server 8080
# → http://localhost:8080
```
