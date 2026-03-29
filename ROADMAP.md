# Roadmap

Detaillierte Sprint-Geschichte aller abgeschlossenen Versionen: `CHANGELOG.md`

---

## Aktueller Stand

| Version | Branch | Status |
|---|---|---|
| 3.0 | `main` | Live — stabil |
| 4.0 | `v4-dev` | In Entwicklung |

**Roundtrip:** `stable=true`, `net_delta=-4` (CONC/CONT-Neuformatierung + HEAD-Rewrite akzeptiert; alle tag-counts ✓)
**Testdaten:** MeineDaten_ancestris.ged — 2811 Personen, 880 Familien, 130 Quellen, 4 Archive
**Aktuelle sw-Version:** v53 / Cache: `stammbaum-v53`

---

## Version 4.0 (Branch `v4-dev`, ab 2026-03-27)

### Schwerpunkt 1: Passthrough-Reduktion ✅ ABGESCHLOSSEN (2026-03-29)

Ziel erreicht: Alle tag-counts im Roundtrip-Test ✓, delta=-4 (nur CONC/CONT-Neuformatierung).

- [x] HEAD-Rewrite: vollständiger Erhalt aller HEAD-Felder via `_headLines[]` ✅
- [x] ENGA vollständig: Parser + Writer + alle Felder ✅
- [x] sourceMedia{}: OBJE unter SOUR-Zitierungen strukturiert ✅
- [x] Medien-Verwaltung: Einheitliches Karten-Layout, Edit-Modal, async Thumbnails ✅ (sw v50–v52)

**Akzeptiertes Rest-Delta** (kein Datenverlust, nur Formatnormalisierung):
- CONC/CONT -35/-26: Langen Text neu umbrechen
- PAGE -22, TIME -1, DATE -1: Normalisierung
- Passthrough-Reste: childRel.extra (44 Eintr.), SOUR._passthrough (2), NOTE._passthrough (1), extraRecords (2)

**Offen (niedrige Priorität, kein Datenverlust):**
- FAM-Events: `DIV`, `DIVF` — noch in passthrough
- INDI-Events: `CENS`, `CONF`, `FCOM`, `ORDN`, `RETI`, `PROP`, `WILL`, `PROB`
- Mehrere inline INDI-Notes: konkateniert statt Array
- Zweite `1 NAME`-Einträge (Geburtsname etc.)

### Schwerpunkt 2: Desktop UI/UX

- [ ] Grössere Bäume: mehr Generationen (3–4 Ebenen Vorfahren, mehr Nachkommen)
- [ ] Vollbild-Baum-Modus (ohne Listenspalte links)
- [ ] Baum-Navigation: Panning via Drag (nicht nur Pinch-Zoom)
- [ ] Tastaturnavigation im Baum (Pfeiltasten)
- [ ] Desktop-Sidebar: Kontextinfos zur gewählten Person (Ereignisse, Quellen)

### Schwerpunkt 3: Quellenmanagement

- [x] Quellen-Detailansicht: Mediendateien aus GEDCOM-Pfaden anzeigen — statische Icons + async OneDrive-Laden ✅ (sw v48)
- [x] OneDrive Dokumente-Ordner: Scan → Dateiname-Matching → auto-Vorschau ohne manuelles Verknüpfen ✅ (sw v49)
- [x] sourceMedia{}: OBJE unter SOUR-Zitierungen strukturiert — kein Datenverlust im Roundtrip ✅ (sw v45)
- [x] Einheitliches Medien-UI: Karten-Layout, Edit-Modal + Thumbnail in allen Ansichten ✅ (sw v50–v52)
- [x] OneDrive-Einstellungen: Ordner-Anzeige, Ändern, Zurücksetzen ✅ (sw v53)
- [ ] Quellenansicht: verknüpfte Personen/Familien auflisten (Rückverweise)
- [ ] Quellen-Schnellerstellung auf iPhone: Kamera-Button → Foto machen → als Medienobjekt einbinden (`capture="camera"`)
- [ ] Quellen-Vorlage: Häufig genutzte Quellentypen (Kirchenbuch, Standesamt, Volkszählung) als Vorlagen
- [ ] Medien-Browser: alle Mediendateien aller Quellen in einer Übersicht

### Schwerpunkt 4: Mobile UX (iPhone)

- [ ] Schnell-Formular für neue Quellen (minimale Pflichtfelder, Rest später ergänzen)
- [ ] Swipe-Gesten: zurück/vorwärts in Detailansichten
- [ ] Offline-Sync-Indikator: zeigt ausstehende Änderungen die noch nicht in OneDrive gespeichert sind

---

## Offene Architektur-Schulden

- State-Management: ~27 globale Variablen, keine Schichtentrennung
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
