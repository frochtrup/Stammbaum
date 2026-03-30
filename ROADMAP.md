# Roadmap

Detaillierte Sprint-Geschichte aller abgeschlossenen Versionen: `CHANGELOG.md`

---

## Aktueller Stand

| Version | Branch | Status |
|---|---|---|
| 3.0 | (archiviert) | Abgelöst durch v4.0 |
| 4.0 | `main` | Live — stabil |

**Roundtrip:** `stable=true`, `net_delta=-4` (CONC/CONT-Neuformatierung + HEAD-Rewrite akzeptiert; alle tag-counts ✓)
**Testdaten:** MeineDaten_ancestris.ged — 2811 Personen, 880 Familien, 130 Quellen, 4 Archive
**Aktuelle sw-Version:** v80 / Cache: `stammbaum-v80`

---

## Version 4.0 ✅ ABGESCHLOSSEN (Branch `main`, ab 2026-03-30)

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

### Schwerpunkt 2: Desktop UI/UX ✅ ABGESCHLOSSEN (2026-03-29)

- [x] Grössere Bäume: 4 Vorfahren-Ebenen (Eltern, Großeltern, Urgroßeltern, Ururgroßeltern) ✅ (sw v57)
- [x] Vollbild-Baum-Modus (ohne Listenspalte links) ✅ (sw v56)
- [x] Baum-Navigation: Drag-to-Pan via Maus ✅ (sw v56)
- [x] Tastaturnavigation im Baum (↑ Vater, ⇧↑ Mutter, ↓ Kind, → Partner, ← Zurück) ✅ (sw v58)
- [x] Pfeil-Legende unten rechts im Baum ✅ (sw v58)

### Schwerpunkt 3: Quellenmanagement ✅ ABGESCHLOSSEN (2026-03-29)

- [x] Quellen-Detailansicht: Mediendateien aus GEDCOM-Pfaden anzeigen — statische Icons + async OneDrive-Laden ✅ (sw v48)
- [x] OneDrive Dokumente-Ordner: Scan → Dateiname-Matching → auto-Vorschau ohne manuelles Verknüpfen ✅ (sw v49)
- [x] sourceMedia{}: OBJE unter SOUR-Zitierungen strukturiert — kein Datenverlust im Roundtrip ✅ (sw v45)
- [x] Einheitliches Medien-UI: Karten-Layout, Edit-Modal + Thumbnail in allen Ansichten ✅ (sw v50–v52)
- [x] OneDrive-Einstellungen: Ordner-Anzeige, Ändern, Zurücksetzen ✅ (sw v53)
- [x] Quellenansicht: verknüpfte Personen/Familien auflisten (Rückverweise) ✅ (war schon implementiert via `sourceRefs`)
- [x] Kamera-Button in „Medium hinzufügen": `capture="environment"` + Galerie-Option + IDB-Speicherung (base64) ✅ (sw v59)
- [x] Quellen-Vorlage: Kirchenbuch / Standesamt / Volkszählung / Familienstammbuch / Zeitungsartikel → Pre-Fill beim Anlegen ✅ (sw v59)
- [x] Medien-Browser: alle Mediendateien aller Quellen in einer Übersicht (📎-Button im Quellen-Tab) ✅ (sw v59)

### Schwerpunkt 4: Mobile UX (iPhone) — teilweise abgeschlossen

- [x] Portrait-Modus: 2 Vorfahren-Ebenen im Hochformat, Querformat = 4 Ebenen ✅ (sw v60)
- [x] Baum Portrait kompakt (360px), Pinch-to-Zoom im Querformat ✅ (sw v62)
- [x] Proband konfigurierbar (nicht mehr automatisch kleinste ID); Button in Topbar ✅ (sw v68)
- [x] Kekule/Ahnentafel-Nummern im Baum ✅ (sw v68–v69)
- [x] Foto-Upload aus Formularen entfernt — nur noch über Medien-Abschnitt ✅ (sw v60)
- [x] Schnell-Formular für neue Quellen: nur ABBR + Titel sichtbar, Optional-Felder per Toggle erweiterbar ✅ (sw v76)
- [x] Swipe-Gesten: Swipe-Right = Zurück in allen Detailansichten, mit visueller Rückmeldung ✅ (sw v76)
- [x] Desktop: Listenmarkierung folgt Baumnavigation sofort; Suchfeld sticky ✅ (sw v78–v80)
- [ ] Offline-Sync-Indikator: zeigt ausstehende Änderungen die noch nicht in OneDrive gespeichert sind

### Offene Features (backlog) ✅ ABGESCHLOSSEN (2026-03-30)

- [x] Medienlinks in Events analog zu Quellen-Ansicht (Bilder + Dokumente je Event klickbar) ✅
- [x] Medienlinks überall editierbar (Person, Familie, Event, Quelle — einheitliches Verhalten) ✅
- [x] Konfigurierbare Foto/Dokumente-Verzeichnisse ohne OneDrive (lokale Pfade) ✅
- [x] Quellenliste: Badge wenn externe Mediendatei verknüpft vorhanden ✅
- [x] Bug: `2 PAGE` erscheint doppelt in bestimmten Konstellationen — prüfen ✅

---

### Schwerpunkt 5: State-Management-Refactoring ✅ ABGESCHLOSSEN

**Ziel:** 22 cross-file Globals in `gedcom.js` in benannte Namespace-Objekte gruppieren. Kein neues Framework, kein Build-Step, Vanilla JS.

**Ist-Zustand:** 22 Variablen in gedcom.js direkt als `let` deklariert, von allen Dateien ungekapselt gelesen/geschrieben.

**Soll-Zustand:** 2 Namespace-Objekte + schrittweise Migration der Aufrufer.

#### Schritt 1 — Namespaces in `gedcom.js` einführen

```javascript
const AppState = {
  db: null, changed: false, idCounter: 1,
  currentPersonId: null, currentFamilyId: null,
  currentSourceId: null, currentRepoId: null,
  currentTab: 'persons', _detailActive: false,
  _fileHandle: null, _canDirectSave: false, _originalGedText: ''
};

const UIState = {
  _treeScale: 1, _treeHistory: [], _treeHistoryPos: -1,
  _relMode: null, _relAnchorId: null,
  _pendingRelation: null, _pendingRepoLink: null,
  _newPhotoIds: new Set(), _deletedPhotoIds: new Set(),
  _placesCache: null
};
```

Backward-compat-Aliase direkt danach (übergangsweise):

```javascript
// Aliase für schrittweise Migration — werden Datei für Datei entfernt
let db = AppState.db;  // usw.
```

#### Schritt 2 — Aufrufer migrieren (Datei für Datei)

| Datei | Cross-file Zugriffe | Aufwand |
|---|---|---|
| `storage.js` | db, changed, idCounter, currentPersonId/FamilyId/SourceId/RepoId, currentTab, _detailActive, _fileHandle, _canDirectSave, _originalGedText, _treeHistory, _treeHistoryPos, _treeScale, _relMode, _relAnchorId, _pendingRelation, _pendingRepoLink, _newPhotoIds, _deletedPhotoIds, _placesCache | hoch |
| `ui-views.js` | db, changed, currentPersonId, _treeHistory, _treeHistoryPos, _treeScale | mittel |
| `ui-forms.js` | db, changed, currentPersonId, currentFamilyId, currentSourceId, currentRepoId, _newPhotoIds, _deletedPhotoIds | mittel |
| `ui-media.js` | db, changed, currentPersonId, currentFamilyId, currentSourceId, _newPhotoIds, _deletedPhotoIds | gering |
| `onedrive.js` | changed, _fileHandle, _canDirectSave | gering |

#### Schritt 3 — Aliase entfernen

Sobald alle Aufrufer migriert: `let db = AppState.db` etc. aus gedcom.js entfernen.

**Optionaler Schritt 4 — Setter mit Nebeneffekten** (spätere Phase)

```javascript
// Statt: changed = true; _placesCache = null;
// AppState.setChanged(true) → setzt Flag + leert Cache + triggert UI-Update
```

**Risiko:** gering — Aliase überbrücken alte API während Migration.
**Abhängigkeiten:** keine (kein neues Framework, kein Build-Step).

---

## Offene Architektur-Schulden

- State-Management: ✅ Abgeschlossen — AppState/UIState + vollständige Migration aller Dateien
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
