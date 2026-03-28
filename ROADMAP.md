# Roadmap

Detaillierte Sprint-Geschichte aller abgeschlossenen Versionen: `CHANGELOG.md`

---

## Aktueller Stand

| Version | Branch | Status |
|---|---|---|
| 3.0 | `main` | Live — stabil |
| 4.0 | `v4-dev` | In Entwicklung |

**Roundtrip:** `stable=true`, `net_delta≈0` (alle inhaltlichen Verluste behoben; CONC/CONT-Neuformatierung + HEAD-Rewrite akzeptiert)
**Testdaten:** MeineDaten_ancestris.ged — 2796 Personen, 873 Familien, 114 Quellen, 11 Archive

---

## Version 4.0 (Branch `v4-dev`, ab 2026-03-27)

### Schwerpunkt 1: Passthrough-Reduktion

Ziel: Möglichst viele Tags aus `_passthrough[]` herausnehmen — strukturiert speichern, editieren, schreiben.

**Kandidaten (nach Häufigkeit in MeineDaten_ancestris.ged):**
- [x] HEAD-Rewrite: vollständiger Erhalt aller HEAD-Felder via `_headLines[]` ✅ (2026-03-28)
- [x] ENGA vollständig: Parser + Writer + alle Felder ✅ (2026-03-28)
- [ ] FAM-Events: `DIV`, `DIVF` — Parser + Writer + Formularfeld
- [ ] INDI-Events: `CENS`, `CONF`, `FCOM`, `ORDN`, `RETI`, `PROP`, `WILL`, `PROB` — in `events[]` strukturieren
- [ ] Mehrere inline INDI-Notes: Array statt Konkatenation
- [ ] Zweite `1 NAME`-Einträge (Geburtsname etc.) — strukturiert statt passthrough

### Schwerpunkt 2: Desktop UI/UX

- [ ] Grössere Bäume: mehr Generationen (3–4 Ebenen Vorfahren, mehr Nachkommen)
- [ ] Vollbild-Baum-Modus (ohne Listenspalte links)
- [ ] Baum-Navigation: Panning via Drag (nicht nur Pinch-Zoom)
- [ ] Tastaturnavigation im Baum (Pfeiltasten)
- [ ] Desktop-Sidebar: Kontextinfos zur gewählten Person (Ereignisse, Quellen)

### Schwerpunkt 3: Quellenmanagement

- [ ] Quellen-Detailansicht: Mediendateien aus `../documents`-Ordner anzeigen (OneDrive-Integration)
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
Personen:      2796
Familien:       873
Quellen:        114
Archive:         11
Orte:          3473 (eindeutige Ortsnamen)
Medien-Refs:    146
Notiz-Records:  186
Dateigröße:    ~5 MB
```
