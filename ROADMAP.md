# Roadmap

Detaillierte Sprint-Geschichte aller abgeschlossenen Versionen: `CHANGELOG.md`

---

## Aktueller Stand

| Version | Branch | Status |
|---|---|---|
| 4.0 | `main` | Abgeschlossen (2026-03-30) — Details: CHANGELOG.md |
| 5.0 | `v5-dev` | In Entwicklung |

**Roundtrip:** `stable=true`, `net_delta=-4` (CONC/CONT-Neuformatierung + HEAD-Rewrite akzeptiert; alle tag-counts ✓)
**Testdaten:** MeineDaten_ancestris.ged — 2811 Personen, 880 Familien, 130 Quellen, 4 Archive
**Aktuelle sw-Version:** v94 / Cache: `stammbaum-v94`

---

## Version 5.0 (Branch `v5-dev`, ab 2026-03-30)

### Schwerpunkt 1: Weitere Darstellungen

Ziel: Ergänzende Visualisierungen neben der Sanduhr — besonders nutzbar auf Desktop und iPhone Querformat.

#### Fan Chart (Fächer-/Halbkreisdiagramm) — ✅ ABGESCHLOSSEN (sw v83–v84)
- [x] Vorfahren als konzentrische Halbkreis-Segmente (Probanden-Mitte, Eltern 1. Ring, Großeltern 2. Ring usw.)
- [x] Rendering: SVG, polar coordinates; Segmente klickbar → showFanChart(id) oder showDetail(id)
- [x] Konfigurierbar: 3–6 Generationen; Buttons in Topbar
- [x] Toggle-Button `◑` im Baum-View; Desktop + Mobile
- [x] Neue Datei `ui-fanchart.js`

#### Generationen-Buttons im Sanduhr-Baum — ✅ ABGESCHLOSSEN (sw v84)
- [x] Buttons 2/3/4/5/6 in Topbar (nur bei tree-active); Standard 5
- [x] Dynamische Positionsfunktionen für bis zu 5 Ahnen-Ebenen (32 Slots)
- [x] Portrait bleibt auf max. 2 Ebenen begrenzt

#### Zeitleiste — Priorität 2
- [ ] Personen/Ereignisse auf horizontaler Zeitachse (Geburt, Heirat, Tod)
- [ ] Gefiltert nach aktueller Person + direkte Vorfahren/Nachkommen
- [ ] Neue Datei `ui-timeline.js`

#### Nachkommen-Baum — Priorität 3
- [ ] Probanden oben, Kinder/Enkel nach unten (top-down SVG)

#### Karten-Ansicht — Priorität 4
- [ ] Geburts-/Sterbeorte auf Landkarte (Apple Maps Link-Cluster oder leaflet.js)

---

### Schwerpunkt 2: Performance + UX

#### Virtuelles Scrollen — Priorität 1
- [ ] Listen >500 Einträge: nur sichtbare Zeilen + Puffer im DOM rendern
- [ ] Betrifft: Personen-Liste (2811 Eintr.), Familien-Liste (880 Eintr.)
- [ ] Kein Framework; einfacher scroll-event-basierter Ansatz

#### Statistik-Dashboard — Priorität 2
- [ ] Neues Modal oder eigener Tab: Gesamtzahlen, Vollständigkeit, häufigste Namen/Orte
- [ ] Karten-Grid (Personen, Familien, Quellen, Medien, fehlende Daten %)

#### Offline-Sync-Indikator — Priorität 3
- [ ] Badge/Banner wenn `AppState.changed=true` und noch nicht gespeichert
- [ ] Besonders wichtig auf iPhone wo direktes Speichern nicht immer möglich

---

### Schwerpunkt 3: Datenqualität

#### Erweiterte Events (restliche Passthrough-Reste) — Priorität 1
- [ ] FAM-Events: `DIV`, `DIVF` — strukturiert statt passthrough
- [ ] INDI-Events: `CENS`, `CONF`, `FCOM`, `ORDN`, `RETI`, `PROP`, `WILL`, `PROB`
- [ ] Familienrelationen
- [ ] Mediendatei mit @Mx@
- [ ] Formularfelder + Parser + Writer

#### Duplikat-Erkennung — Priorität 2
- [ ] Personen mit gleichem Name + Geburtsjahr (±2): Hinweis + Vergleichs-Ansicht
- [ ] Kein automatisches Merge — nur Anzeige + manuelle Entscheidung

#### Volltextsuche — Priorität 3
- [ ] Suche über Ereignis-Orte, Quellen-Titel, Notizen (nicht nur Name)
- [ ] Erweiterung des bestehenden Suchfelds in Personen-/Quellen-Liste

---

### Schwerpunkt 4: Sonstiges

#### Fehler allgemein — ✅ ABGESCHLOSSEN (sw v85)
- [x] Fan Button wird nicht angezeigt ✅ (sw v84)
- [x] bei 'Medien einfügen' den vollständigen Pfad abspeichern ✅ (sw v85)
- [x] bei 'Medien einfügen' mit dem in der Konfiguration definierten Dateipfad starten ✅ (sw v85)
- [x] neues Sonstiges Ereignis speichert den Typ nicht ✅ (sw v85)
- [x] ermögliche das Löschen von Ereignissen ✅ (sw v85)

#### Fehler Mobile — ✅ ABGESCHLOSSEN (sw v91–v92)
- [x] Querformat mit Liste: Suchzeile Gap zur Topbar ✅ (sw v92)
- [x] Personen Detail: Foto Anzeige nach Verknüpfung neues Bild ✅ (sw v91)

#### Fehler Desktop — ✅ ABGESCHLOSSEN (sw v92–v93)
- [x] Pfeil links: ein Tastendruck → zwei Schritte zurück ✅ (sw v92–v93)

#### Refactoring: ui-views.js Split — ✅ ABGESCHLOSSEN (sw v94)
- [x] `ui-views.js` (1963 Z.) aufgeteilt in 5 Module:
  - `ui-views.js` (279 Z.) — gemeinsame Hilfsfunktionen
  - `ui-views-person.js` (392 Z.) — Personen-Detailansicht
  - `ui-views-family.js` (382 Z.) — Familien-Detailansicht
  - `ui-views-source.js` (273 Z.) — Quellen-Detailansicht
  - `ui-views-tree.js` (651 Z.) — Sanduhr-Baum + Fan Chart

---

### Schwerpunkt 5 - OCR
- [ ] OCR.md

---

## Offene Architektur-Schulden

- Virtuelles Scrollen für Listen >1000 Einträge
- Cmd+Z = "Revert to Saved" (nicht granulares Undo) — dokumentiert, aber UX-Problem
- Familien-Avatar: CSS-Symbol statt OS-Emoji
- Duplikat-Erkennung in Suche

---

## Getestete Umgebungen

| Plattform | Browser | Laden | Speichern |
|---|---|---|---|
| iPhone (iOS 17+) | Safari | ✅ | ✅ Share Sheet |
| iPhone (iOS 17+) | Chrome | ✅ | ⚠️ Share Sheet nicht unterstützt |
| Mac | Safari | ✅ | ⚠️ Download (kein direktes Speichern) |
| Mac | Chrome | ✅ | ✅ Direktes Speichern |
| Mac | Firefox | ✅ | ⚠️ Download |
| Android | Chrome | ✅ | ⚠️ Apple Maps Links funktionieren nicht |

---

## Datei-Statistiken (MeineDaten_ancestris.ged)

```
Personen:      2811
Familien:       880
Quellen:        130
Archive:           4
Notizen:         195
Dateigröße:    ~5 MB  (83152 Zeilen)
```
