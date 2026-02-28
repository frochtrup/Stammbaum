# Architektur

## Überblick

```
┌──────────────────────────────────────────────────────┐
│                    index.html                        │
│                                                      │
│  <style>         <body>            <script>          │
│  CSS             HTML-Struktur     Vanilla JS        │
│  ~490 Zeilen     ~380 Zeilen       ~1440 Zeilen      │
│                                                      │
│  Keine externen Dependencies · Kein Build-Step       │
│  Keine Frameworks · Kein Server                      │
└──────────────────────────────────────────────────────┘
```

**Größe aktuell:** ~2305 Zeilen · 55 Funktionen · ~110 KB

---

## Architektur-Entscheidungen (ADRs)

### ADR-001: Single-File HTML
**Entscheidung:** Alle CSS, HTML und JavaScript in einer einzigen `index.html`.

**Warum:**
- Deployment = eine Datei auf GitHub Pages laden, fertig
- Kein npm, kein Webpack, kein Build-Prozess
- Claude kann die Datei direkt mit `str_replace` bearbeiten
- Nutzer der Zielgruppe (Hobby-Genealoge ohne Programmierkenntnisse) versteht ein einzelnes File

**Konsequenzen:**
- Datei wächst mit neuen Features (~2300 Z. jetzt, ~3000 Z. erwartet nach Phase 3)
- Ab ~5000 Zeilen sollte Aufteilung in CSS/JS-Dateien erwogen werden
- Kein Hot-Reload, kein TypeScript, kein Linting

---

### ADR-002: Vanilla JavaScript, kein Framework
**Entscheidung:** Kein React, Vue, Angular.

**Warum:**
- Keine Build-Toolchain nötig
- Keine veraltenden Abhängigkeiten
- `innerHTML`-Rendering für Listen mit ~3000 Einträgen ist schnell genug
- App ist primär daten-getrieben, nicht interaktiv-reaktiv

**Muster im Code:**
```javascript
// Listen werden bei jeder Änderung neu gerendert
function renderPersonList(persons) {
  el.innerHTML = persons.map(p => `<div ...>${esc(p.name)}</div>`).join('');
}
// Nach jeder Änderung manuell aufrufen:
markChanged(); updateStats(); renderTab();
```

---

### ADR-003: Globales `db`-Objekt als State
**Entscheidung:** Ein globales `let db` als einzige Wahrheitsquelle.

```javascript
let db = {
  individuals: { '@I1@': {...}, '@I2@': {...} },
  families:    { '@F1@': {...} },
  sources:     { '@S1@': {...} },
  // notes: intern, nicht editierbar
};
let changed = false;  // Änderungs-Flag
```

**Warum:** Einfachstes mögliches State-Management. Kein Flux, kein Store.

**Konsequenz:** Kein Undo/Redo. Bei Seitenreload sind ungespeicherte Änderungen weg (außer Auto-Load aus localStorage).

---

### ADR-004: localStorage für Auto-Load
**Entscheidung:** Nach dem Laden wird der rohe GEDCOM-Text in localStorage gecacht.

```javascript
// Beim Laden:
localStorage.setItem('stammbaum_ged', gedcomText);
localStorage.setItem('stammbaum_filename', file.name);

// Beim App-Start:
const saved = localStorage.getItem('stammbaum_ged');
if (saved) { db = parseGEDCOM(saved); showMain(); }
```

**Warum:** Browser können aus Sicherheitsgründen keine lokalen Dateien automatisch lesen. localStorage ermöglicht Persistenz ohne Server.

**Wichtig:** Es wird der GEDCOM-Text gecacht, **nicht** das geparste `db`-Objekt. Grund: `Set`-Objekte (`sourceRefs`) lassen sich nicht mit `JSON.stringify` serialisieren.

**Limit:** localStorage hat ~5–10 MB je Browser. MeineDaten.ged ≈ 5 MB — grenzwertig. Bei Fehler (QuotaExceededError) wird still ignoriert, App bleibt funktionsfähig.

---

### ADR-005: iOS-spezifische Datei-Behandlung
**Problem:** iOS Safari erkennt `.ged` nicht als gültigen MIME-Type → zeigt nur Kamera/Fotos an.

**Lösung:** `accept="*/*"` — alle Dateitypen erlauben, Inhalt selbst validieren.

```html
<input type="file" id="fileInput" accept="*/*">
```

**Download auf iOS:** `<a download>` funktioniert in iOS Safari nicht zuverlässig.

```javascript
// iOS: Share Sheet
if (navigator.share && navigator.canShare) {
  navigator.share({ files: [file], title: filename });
  // User wählt „In Dateien sichern" → iCloud Drive
}
// Desktop: Blob-Download
else {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  a.click();
}
```

---

### ADR-006: Geo-Koordinaten nur lesen, nicht bearbeiten
**Entscheidung:** Koordinaten werden gelesen und als Apple Maps Links angezeigt, aber nicht editierbar.

**Warum:** Ancestris/Legacy setzt Koordinaten automatisch. Manuelles Eingeben von Dezimalgraden ist fehleranfällig und unintuitiv für den Zielnutzer.

**Geo-Format in MeineDaten.ged (Legacy-spezifisch):**
```gedcom
2 PLAC Ochtrup, , Nordrhein-Westfalen, Deutschland
3 MAP           ← Level 3 (GEDCOM-Standard sieht Level 2 vor!)
4 LATI N52.216667
4 LONG E7.183333
```
Der Parser behandelt MAP auf Level 3 **und** Level 2.

---

## HTML-Seitenstruktur

```
body
├── #v-landing          Startseite: GEDCOM laden / Demo
│   ├── Upload-Box      Drag & Drop + Datei-Picker
│   └── iCloud-Hinweis  Workflow-Erklärung
│
├── #v-main             Hauptansicht
│   ├── .topbar         App-Titel · Bearbeiten-Button · ☰ Menü
│   ├── .stats-bar      Personen · Familien · Quellen · Ereignisse
│   ├── .tabs           Personen / Familien / Quellen / Orte
│   ├── #tab-persons    Personen-Liste mit Suche
│   ├── #tab-families   Familien-Liste
│   ├── #tab-sources    Quellen-Liste
│   └── #tab-places     Orte-Liste
│
├── #v-detail           Detailansicht (Person / Familie / Quelle / Ort)
│   ├── .topbar         ← Zurück · Titel · Bearbeiten ✎
│   └── #detailContent  dynamisch gerendert
│
├── Modals (Bottom Sheets)
│   ├── #modalAdd       + Neu (Auswahl: Person / Familie / Quelle)
│   ├── #modalPerson    Person bearbeiten
│   ├── #modalFamily    Familie bearbeiten
│   ├── #modalSource    Quelle bearbeiten
│   ├── #modalEvent     Ereignis hinzufügen / bearbeiten
│   └── #modalMenu      ☰ Menü (Speichern, neue Datei, etc.)
│
├── .fab                Floating Action Button (＋)
├── .export-bar         Speichern-Leiste (sichtbar wenn Änderungen)
└── #toast              Status-Meldungen (auto-hide)
```

---

## JavaScript-Sektionen

| Sektion | Zeilen | Funktionen |
|---|---|---|
| State & IDs | 870–888 | `nextId(prefix)` |
| GEDCOM Parser | 889–1130 | `parseGEDCOM(text)`, `parseGeoCoord(val)` |
| GEDCOM Writer | 1142–1240 | `writeGEDCOM()` |
| Export / Speichern | 1244–1355 | `exportGEDCOM()`, `readFile()`, `tryAutoLoad()`, `confirmNewFile()` |
| Navigation | 1358–1410 | `showView()`, `showMain()`, `switchTab()`, `renderTab()`, `updateStats()`, `markChanged()` |
| Personen-Liste | 1414–1476 | `renderPersonList()`, `filterPersons()` |
| Familien-Liste | 1480–1505 | `renderFamilyList()` |
| Quellen-Liste | 1509–1527 | `renderSourceList()` |
| Orte-System | 1529–1655 | `collectPlaces()`, `renderPlaceList()`, `showPlaceDetail()` |
| Detail-Ansichten | 1659–1910 | `showDetail()`, `showFamilyDetail()`, `showSourceDetail()` |
| Render-Helfer | 1912–1942 | `factRow()`, `sourceTagsHtml()`, `relRow()` |
| Quellen-Widget | 1949–2009 | `initSrcWidget()`, `renderSrcTags()`, `renderSrcPicker()`, `toggleSrc()`, `removeSrc()` |
| Formulare | 2013–2272 | `showPersonForm/saveFamily/saveEvent` etc. |
| Utils | 2291–2305 | `esc()`, `showToast()`, `openModal()`, `closeModal()` |

---

## CSS Design-System

### Farb-Tokens
```css
/* Hintergründe — warmes Dunkelbraun (Pergament-Ästhetik) */
--bg:        #18140f    /* Seiten-Hintergrund */
--surface:   #211c14    /* Karten */
--surface2:  #2a2318    /* Erhöhte Elemente, Tags */
--surface3:  #342c1e    /* Hover */
--border:    #3e3424    /* Trennlinien */

/* Gold — Primärfarbe */
--gold:      #c8a84a    /* Akzente, Links, Aktiv-Zustände */
--gold-lt:   #e5c96e    /* Überschriften */
--gold-dim:  #7a6328    /* Badges, gedämpfte Elemente */
--gold-glow: rgba(200,168,74,0.15)

/* Text */
--text:      #f2e8d4    /* Haupttext */
--text-dim:  #a0906e    /* Sekundärtext */
--text-muted:#5a4e38    /* Labels, Platzhalter */

/* Aktionsfarben */
--red:       #c04040    /* Löschen */
--blue:      #4a7ab5    /* (reserviert) */
--green:     #4a9060    /* (reserviert) */

/* Geometrie */
--radius:    14px       /* Karten, Modals */
--radius-sm: 9px        /* Buttons, Inputs */
```

### Typografie
| Schrift | Verwendung |
|---|---|
| **Playfair Display** | App-Titel, Modal-Titel, Personen-Namen in Detailansicht |
| **Source Serif 4** | Body-Text, Formulare, Listen, alle UI-Elemente |

### Wichtige Komponenten-Klassen
| Klasse | Beschreibung |
|---|---|
| `.person-row` | Listen-Eintrag: Avatar-Kreis · Name + Meta · Pfeil |
| `.detail-hero` | Großes Avatar + Name ganz oben in Detailansicht |
| `.section` | Inhalts-Abschnitt mit `.section-title` |
| `.fact-row` | Label–Wert-Zeile (z.B. „Geburt · 12 MAR 1890, München") |
| `.rel-row` | Personen-Verknüpfung (Eltern, Kinder, Partner) mit Pfeil |
| `.source-card` | Quellen-Karte in der Quellen-Liste |
| `.src-tag` | Quellen-Badge (gold, pill-förmig) in Detailansicht |
| `.src-picker-item` | Eintrag in der Quellen-Auswahlliste |
| `.sheet` | Bottom-Sheet Modal (slide-up von unten) |
| `.modal-overlay` | Halbtransparenter Hintergrund hinter Modals |
| `.fab` | Floating Action Button (＋, unten rechts) |
| `.toast` | Status-Meldung (fixiert unten, verschwindet nach 2.8s) |
| `.fade-up` | Einblend-Animation (opacity + translateY) |

---

## Globale Variablen

```javascript
let db = { individuals:{}, families:{}, sources:{} };  // Hauptdaten
let changed = false;               // Ungespeicherte Änderungen?
let currentPersonId  = null;       // Aktive Detailansicht
let currentFamilyId  = null;
let currentSourceId  = null;
let currentTab = 'persons';        // Aktiver Tab
const srcState = {};               // Zustand des Quellen-Widgets: {prefix: Set}
```
