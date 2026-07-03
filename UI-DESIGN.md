# UI & Design

HTML-Seitenstruktur, Navigationsmodell, CSS Design-System, Sanduhr-Layout.
Architektur-Entscheidungen: `ARCHITECTURE.md` · Datenmodell: `DATAMODEL.md`

---

## HTML-Seitenstruktur

```
body  (index.html — Hauptapp)
├── #v-landing          Startseite: GEDCOM laden / Demo
│   ├── Upload-Box      Drag & Drop + Datei-Picker
│   ├── .landing-tagline  „Vollständig im Browser · Keine Installation · Keine Cloud"
│   ├── Demo-Button     loadDemo()
│   └── Hilfe-Link      öffnet #modalHelp
│
├── #v-main             Hauptansicht (Listen-Tabs)
│   ├── .topbar         App-Titel „⚘ Stammbaum" · ☁️ Speichern · ☰ Menü
│   ├── #tab-persons    Personen-Liste mit Suche + Geburtsjahr-Filter
│   ├── #tab-families   Familien-Liste mit Suche
│   ├── #tab-sources    Quellen-Liste mit Suche + Archive-Sektion
│   ├── #tab-places     Orte-Liste mit Suche
│   └── #tab-search     Globale Suche (alle Entitätstypen)
│
├── #v-detail           Detailansicht (Person / Familie / Quelle / Ort)
│   ├── .topbar         ← Zurück · Titel · [⌂ navigate] … [⌂▢ set] [✎ Bearbeiten]
│   └── #detailContent  dynamisch gerendert
│       ├── .fact-row + inline §N Quellen-Badges
│       └── .family-nav-row  (⚭ Familie › in Person-Detail)
│
├── #v-tree             Sanduhr-Stammbaum (Standardansicht nach Load)
│   ├── .topbar         Personenname · ☁️ Speichern · ☰ Menü
│   └── #treeScroll
│       └── #treeWrap   Absolut positionierte Karten + SVG-Linien
│           └── #treeSvg  Bezier-Kurven
│
├── #bottomNav          Globale Bottom-Navigation (außerhalb Views, z-index 400)
│   ├── #bnav-tree      ⧖ Baum
│   ├── #bnav-persons   👤 Personen
│   ├── #bnav-families  ⚭ Familien
│   ├── #bnav-sources   📖 Quellen
│   ├── #bnav-places    📍 Orte
│   └── #bnav-search    🔍 Suche
│
├── Modals (Bottom Sheets)
│   ├── #modalAdd           + Neu (Auswahl: Person / Familie / Quelle)
│   ├── #modalPerson        Person bearbeiten
│   ├── #modalFamily        Familie bearbeiten
│   ├── #modalSource        Quelle bearbeiten
│   ├── #modalEvent         Ereignis hinzufügen / bearbeiten (inkl. BIRT/CHR/DEAT/BURI)
│   ├── #modalPlace         Ort umbenennen
│   ├── #modalNewPlace      Neuen Ort anlegen
│   ├── #modalAddMedia      Medienobjekt hinzufügen (Titel + Dateiname + OneDrive-Picker)
│   ├── #modalRelPicker     Beziehungs-Picker: Person suchen/wählen oder neu erstellen (v1.1)
│   ├── #modalRepo          Archiv bearbeiten/erstellen (v1.2)
│   ├── #modalRepoPicker    Archiv-Picker im Quellen-Formular (v1.2)
│   ├── #modalChildRel      Kind-Verhältnis bearbeiten (PEDI-Dropdown + Quellen-Widget)
│   ├── #modalOneDrive      OneDrive-Ordner-Browser (Fotos importieren / Datei wählen / Ordner wählen)
│   ├── #modalLightbox      Vollbild-Foto-Overlay + „Als Hauptfoto setzen"-Button
│   ├── #modalMenu          ☰ Menü (Speichern, Backup, neue Datei, OneDrive-Aktionen)
│   └── #modalHelp          Hilfe & Anleitung
│
├── .fab                Floating Action Button (＋), ausgeblendet auf Orte-Tab + Baum
└── #toast              Status-Meldungen (auto-hide nach 2.8s)

offline.html  (self-contained, kein ext. CSS/JS — Offline-Fallback via Service Worker)
```

---

## Navigationsmodell

### View-Hierarchie
```
v-landing          (kein Back, kein BottomNav)
    ↓ Datei laden
[v-tree | v-main]  (BottomNav sichtbar)
    ↓ Karte/Zeile anklicken
v-detail           (BottomNav versteckt)
    ↓ ← Zurück
[v-tree | v-main]  ← je nach Herkunft (History-Stack)
```

### History-Stack (`_navHistory`)
- `_beforeDetailNavigate()` zu Beginn jeder Detail-Funktion
- Von `v-tree` → `{ type:'tree', id:currentTreeId }` in History
- Von `v-detail` → aktuellen State in History (Detail→Detail-Navigation)
- Von `v-main` → History löschen (frischer Einstieg)
- `goBack()` popt den Stack; leer → `showMain()`
- Alle show-Funktionen haben `pushHistory = true` als Default-Parameter
  - `goBack()` ruft mit `pushHistory = false` → kein neuer History-Eintrag

### Swipe-Right (Zurück, Mobile)
`_initDetailSwipe()` — einmalig registriert (Flag `_swipeInit`), aufgerufen beim Wechsel auf `v-detail`.
- **Trigger:** 1 Finger-Touch auf `#v-detail`; kein Modal offen
- **Erkennung:** `dx > 60px` + `|dx| > |dy| × 1.2` (horizontal dominiert) + `elapsed < 400ms`
- **Visuelles Feedback:** `translateX(dx)` während des Swipe; `transition: transform 0.2s` beim Loslassen
- **Aktion:** `goBack()` — identisch mit ← Zurück-Button
- **Kein Konflikt** mit vertikalem Scrollen (dy-Check) und Modals (früher Abbruch)

### Bottom-Nav Highlight
`setBnavActive(name)` mit `name ∈ { 'tree', 'persons', 'families', 'sources', 'places', 'tasks' }`

`#bnav-tasks` (☑ Aufgaben) ist der sechste Tab; Proband-Navigation über `menuProband` im ☰-Menü.

### Desktop-Zweispalten (ab 900px)
```
body.desktop-mode:
  ├── Linke Spalte (360px): Listen-View + Bottom-Nav
  └── Rechte Spalte (flex:1): Detail-View oder Tree
      └── #desktopPlaceholder wenn kein Detail aktiv (display:none auf Mobile)
```

---

## CSS Design-System

### Farb-Tokens
```css
/* Hintergründe — warmes Dunkelbraun (Pergament-Ästhetik) */
--bg:        #18140f    /* Seiten-Hintergrund */
--surface:   #211c14    /* Karten */
--surface2:  #2a2318    /* Erhöhte Elemente, Tags */
--surface3:  #342c1e    /* Hover / Zentrum-Karte */
--border:    #3e3424    /* Trennlinien, Karten-Rahmen */

/* Gold — Primärfarbe */
--gold:      #c8a84a    /* Akzente, Links, Aktiv-Zustände */
--gold-lt:   #e5c96e    /* Überschriften, Namen */
--gold-dim:  #7a6328    /* Badges, gedämpfte Elemente */
--gold-glow: rgba(200,168,74,0.15)

/* Text */
--text:      #f2e8d4    /* Haupttext */
--text-dim:  #a0906e    /* Sekundärtext */
--text-muted:#5a4e38    /* Labels, Platzhalter */

/* Aktionsfarben */
--red:       #c04040    /* Löschen */

/* Geometrie */
--radius:    14px       /* Karten, Modals */
--radius-sm: 9px        /* Buttons, Inputs, Tree-Karten */
--bg-card:   var(--surface)
```

### Typografie
| Schrift | Verwendung |
|---|---|
| **Playfair Display** | App-Titel, Modal-Titel, Personen-Namen in Detailansicht, Tree-Zentrum-Name |
| **Source Serif 4** | Body-Text, Formulare, Listen, alle UI-Elemente, Tree-Karten, Bottom-Nav-Labels |

### Topbar
```css
.topbar {
  position: sticky; top: 0; z-index: 200;
  background: rgba(24,20,15,0.96);
  backdrop-filter: blur(16px);
  padding: env(safe-area-inset-top, 0px) 16px 0;
  min-height: 52px;
}
```
`env(safe-area-inset-top)` kompensiert iOS-Notch (Dynamic Island / Home-Indicator).

### Komponenten-Klassen
| Klasse | Beschreibung |
|---|---|
| `.bottom-nav` | Globale Bottom-Navigation (fixed, außerhalb Views, z-index 400) |
| `.bnav-btn` | Bottom-Nav Button (flex-column, icon + label) |
| `.bnav-btn.active` | Aktiver Tab (gold) |
| `.bnav-icon` | Icon in Bottom-Nav (1.2rem) |
| `.bnav-lbl` | Label in Bottom-Nav (0.62rem, Source Serif 4) |
| `.person-row` | Listen-Eintrag: Avatar-Kreis · Name + Meta · Pfeil |
| `.detail-hero` | Großes Avatar + Name ganz oben in Detailansicht |
| `.section` | Inhalts-Abschnitt mit `.section-title` |
| `.section-head` | Flexbox-Zeile: `.section-title` links, `.section-add`-Button rechts |
| `.section-add` | Kleiner Add-Button im Sektions-Kopf (min-width: 100px, border 1px, rounded) |
| `.fact-row` | Label–Wert-Zeile (z.B. „Geburt · 12 MAR 1890, München") |
| `.family-nav-row` | Klickbare Familie-Link-Zeile in Person-Detail (⚭ Familie ›) |
| `.row-arrow` | Pfeil-Icon in `.family-nav-row` |
| `.rel-row` | Personen-Verknüpfung mit Pfeil (Eltern, Kinder, Partner) |
| `.unlink-btn` | Kreisförmiger ×-Button (24px) zum Trennen von Beziehungen |
| `.source-card` | Quellen-Karte in der Quellen-Liste |
| `.src-badge` | Kompakter Quellen-Badge: §N (inline in fact-row, gold-dim, 0.62rem); optional mit Seiten-Suffix (z.B. `§42·15`) |
| `.src-badge--q0/q1/q2/q3` | QUAY-Farbindikator: Rot (unzuverlässig) / Orange / Blau / Grün (direkt) |
| `.src-picker-item` | Eintrag in der Quellen-Auswahlliste |
| `.sheet` | Bottom-Sheet Modal (slide-up von unten) |
| `.modal-overlay` | Halbtransparenter Hintergrund hinter Modals |
| `.fab` | Floating Action Button (＋, unten rechts, über Bottom-Nav) |
| `.toast` | Status-Meldung (fixiert über Bottom-Nav, verschwindet nach 2.8s) |
| `.fade-up` | Einblend-Animation (opacity + translateY) |
| `.tree-scroll` | Scrollbarer Container der Sanduhr-Ansicht |
| `.tree-wrap` | Absolut-positionierter Canvas (Breite/Höhe per JS gesetzt) |
| `.tree-svg` | SVG-Overlay für Bezier-Verbindungslinien |
| `.tree-card` | Personen-Karte im Baum (96×64 px) |
| `.tree-card-center` | Zentrum-Karte (160×80 px, gold umrandet) |
| `.tree-card-half` | Halbgeschwister-Karte (gestrichelter Rahmen, gold-dim) |
| `.tree-half-badge` | „½"-Badge auf Halbgeschwister-Karten (bottom-right) |
| `.tree-card-empty` | Ghost-Karte für unbekannte Vorfahren (opacity 0.18, gestrichelt) |
| `.tree-card-peek` | Geschwister-Karte im Peek-Stapel (Sanduhr) |
| `.tree-name` | Name in Tree-Karte (2-zeilig via -webkit-line-clamp) |
| `.tree-yr` | Geburts-/Sterbejahr in Tree-Karte (0.68rem) |
| `.tree-desc-more` | `▼`-Badge auf Karte mit abgeschnittenen Nachkommen |
| `.tree-marr-btn` | Klickbarer ⚭-Button zwischen Proband und erstem Ehepartner |
| `.tree-marr-badge` | ⚭-Symbol-Span innerhalb des Marr-Buttons |
| `.landing-tagline` | Tagline auf Landing-Screen |
| `.btn-link` | Textlink-Button (Hilfe-Link auf Landing-Screen) |

### Badge- und Symbol-Konventionen

Jedes Symbol hat genau eine Bedeutung — sie dürfen nicht gemischt werden.

#### Baum-Badges

| Symbol / Klasse | Bedeutung | Kontext |
|---|---|---|
| `📎` | Medien-Anhang vorhanden (OBJE, Foto, Dokument) | Personen-/Familien-Liste, Detail-Hero |
| `.src-badge` (`§N`) | Quellen-Zitat — N = numerischer Teil der GEDCOM-ID (z.B. `@S042@` → `§42`); Tooltip = `s.abbr \|\| s.title` (max. 60 Z.); QUAY-Farbe via `.src-badge--q0/q1/q2/q3`; Seiten-Suffix wenn ≤5 Zeichen | fact-row, Kindbeziehungs-Zeile, überall einheitlich |
| `+ Q` (gestrichelt) | Quellen-Zitat hinzufügen — CTA wenn noch keine Quelle zugewiesen | Kindbeziehungs-Zeile, Events ohne Quellen |
| `½` (`.tree-half-badge`) | Halbgeschwister — Kind gehört zu anderer Ehe des Zentrum-Elternteils | Baum-Karte (bottom-right) |
| `⚭N` | Mehrfach-Ehe — Person hat N Ehen gesamt; Karte zeigt aktive Ehe | Zentrum-Karte im Sanduhr-Baum |
| `⚭` (`.tree-marr-btn`) | Heirats-Navigation — öffnet Familien-Detail; zwischen Proband und Ehepartner | Nachkommen-Baum |
| `▼` (`.tree-desc-more`) | Abgeschnittene Nachkommen — mehr vorhanden, Klick lädt tiefere Gens | Nachkommen-Baum-Karte |

#### Topbar-Aktionen

| Symbol / Klasse | Bedeutung | Position in Topbar | Kontext |
|---|---|---|---|
| `⌂` (plain) | Zum Probanden navigieren — ohne Rahmenstil | Ganz links (Diagramme) / nach Zurück-Button (Person-Detail) | Alle Diagramm-Topbars, Person-Detail |
| `⤢` / `⤡` | Vollbild ein / aus | Zweite Position von links, vor Separator | Sanduhr, Fächer, Nachkommen, Zeitleiste |
| `◑` | Fan-Chart-Umschalter | Nach Separator, Diagramm-Wechsel-Gruppe | Alle Diagramm-Topbars |
| `⇩` | Nachkommen-Baum-Umschalter | Nach Separator, Diagramm-Wechsel-Gruppe | Alle Diagramm-Topbars |
| `⟷` | Zeitleiste-Umschalter | Nach Separator, Diagramm-Wechsel-Gruppe | Alle Diagramm-Topbars + Person-Detail |
| `🗺` | Kartenansicht-Umschalter | Nach Separator, Diagramm-Wechsel-Gruppe | Alle Diagramm-Topbars + Person-Detail |
| `☰` | Menü öffnen | Immer **ganz rechts** | Alle Topbars |
| `⌂` (`.proband-set-btn`) | Proband setzen / aufheben — Rahmen-Stil (`box-shadow: inset 0 0 0 1.5px currentColor`); goldene Füllung im aktiven Zustand | Direkt vor `✎` | Person-Detail-Topbar |
| `✎` | Bearbeiten — öffnet Formular des aktuellen Datensatzes | Direkt vor `☰` | Person-/Familien-/Quellen-Detail-Topbar |
| `←` | Zurück — `goBack()`; Swipe-Right auf Mobile hat dieselbe Wirkung | Ganz links | Detail-Topbar |

**Topbar-Layout** (unveränderlich):
```
Diagramm:      [⌂] [⤢]  |  [◑][⇩][⟷][🗺]  [☰]
Person-Detail: [←] [⌂]  …  [⌂▢] [✎]  [☰]
```

#### Aktions-Buttons (Tab-Header, Modals, Listen)

| Symbol / Klasse | Bedeutung | Kontext |
|---|---|---|
| `＋` (FAB, `.fab`) | Neu erstellen — öffnet `#modalAdd` (Person/Familie/Quelle); ausgeblendet auf Orte-Tab + Baum | Floating Action Button (unten rechts) |
| `↓` (`.act-btn-icon`) | Exportieren / Herunterladen — Download der aktuellen Ansicht | Tab-Header `action-btns` (z.B. `↓ MD` Aufgaben, `↓ PNG` Diagramm) |
| `⊕` | Person zur Mehrpersonen-Zeitleiste hinzufügen — öffnet modalRelPicker im Modus `'tlmulti'`; max. 5 Personen | **Nur** Zeitleiste Filterleiste (TL-MULTI) |
| `⧉` | Kopieren — Quelle/Zitat in Zwischenablage legen | QuickAdd Quellen-Zwischenablage, src-Widget |
| `📋` | Einfügen (Paste) — Quelle/Zitat aus Zwischenablage übernehmen | QuickAdd Quellen-Zwischenablage, src-Widget |

#### Import-Vergleich (3-Wege-Entscheidung)

Diese drei Symbole sind **ausschließlich** im Merge-Assistenten als Gruppe definiert:

| Symbol | Bedeutung |
|---|---|
| `✓` | Feld / Person übernehmen |
| `📝` | Als Forschungseintrag anlegen — erstellt `_rlog`-Eintrag mit `result:'pending'` |
| `✗` | Ablehnen / nicht übernehmen |

In anderen Kontexten einzeln: `✓` = Aufgabe erledigt (Aufgaben-Liste); `✗` / `×` = Modal schließen oder Tag entfernen.

---

**Regeln:**
- `📎` steht **ausschließlich** für Medien/OBJE — nie für Quellen
- Quellen werden **überall einheitlich** als `.src-badge` `§N` dargestellt — N ist der numerische Teil der GEDCOM-ID; in fact-rows, Kindbeziehungs-Zeilen und allen anderen Kontexten
- Tooltip auf `.src-badge` zeigt immer den Quellentitel (`s.abbr || s.title`, max. 60 Zeichen), nicht die GEDCOM-ID
- Click auf `.src-badge` öffnet je nach Kontext `showSourceDetail(sid)` (fact-row) oder den zugehörigen Dialog (z.B. `showChildRelDialog`)
- `+ Q` erscheint nur wenn wirklich 0 Quellen zugewiesen sind; verschwindet nach erstem Hinzufügen
- `☰` steht **immer ganz rechts** in jeder Topbar — kein anderer Button darf rechts davon stehen
- `✎` steht **direkt links von `☰`** in der Detail-Topbar — nie an anderer Position
- `⊕` erscheint **nur in der Zeitleiste** als „Person hinzufügen" — nicht als allgemeines Hinzufügen-Symbol (dafür: `＋` FAB oder `.section-add`)
- Die vier Diagramm-Wechsel-Symbole (`◑ ⇩ ⟷ 🗺`) stehen **immer nach dem Separator** und **immer vor `☰`** — keine andere Reihenfolge
- Die 3-Wege-Gruppe `✓ / 📝 / ✗` wird **ausschließlich** im Import-Vergleich als Gruppe eingesetzt
- `.src-tag` wird **nicht** verwendet — war ein veraltetes Zwischenformat, abgelöst durch `.src-badge`
- **ExtraNames** (zweite+ Namenangaben) sind in Personendetail klickbar (`data-action="showPersonForm"`) und öffnen das Personen-Formular

### Geschlecht im Baum
```css
/* data-sex Attribut auf .tree-card → border-left Farbe */
[data-sex="M"] { border-left: 3px solid #5b8fd4; }   /* blau */
[data-sex="F"] { border-left: 3px solid #d485a0; }   /* rosa */
/* U/kein Attribut: kein border-left */
```

---

## Sanduhr-Ansicht: Layout-Algorithmus

```
Ebene -4:  [UUG0]..[UUG15]                  ← bis zu 16 Ururgroßeltern-Slots (Desktop/Querformat)
Ebene -3:  [UG0]..[UG7]                     ← bis zu 8 Urgroßeltern-Slots
Ebene -2:  [GP0] [GP1]   [GP2] [GP3]        ← 4 Großeltern-Slots
Ebene -1:    [Vater]       [Mutter]          ← 2 Eltern, je über 2 Großeltern
Ebene  0:      [Person★]  ⟿  [Ehepartner]  ← Zentrum gold, Ehepartner rechts
Ebene +1:         [K0] [K1] [K2] [K3]       ← max. 4 Kinder/Zeile, mehrzeilig
           [K4] [K5] ...                     ← Folgezeilen bei >4 Kindern
```

**Portrait-Modus** (`isPortrait = window.innerWidth < window.innerHeight`):
- Nur Ebenen -2 und -1 (Eltern + Großeltern)
- `hasAnc3 = false`, `hasAnc4 = false` — keine Ururgroßeltern im Hochformat
- Resize-Listener (debounced 250ms): Baum wird bei Orientierungswechsel neu gezeichnet

**Konstanten:**
- Reguläre Karte: W=96px, H=64px
- Zentrum-Karte: CW=160px, CH=80px
- HGAP=10, VGAP=44, MGAP=20 (Person↔Ehepartner), SLOT=106, PAD=20
- `ancSpan` dynamisch: 4/8/16 Slots je nach belegter Tiefe (keine Leerbreite)
- `baseY` = `ancLevels × ROW` — Platz nach oben je nach aktiven Ebenen

**Layout-Breite** = max(ancSpan×SLOT, max-Kinder-Zeile×SLOT, Person+MGAP+W) + 2×PAD

**Namen:** `_treeShortName(p, isCenter)` — Limit 18 (regulär) / 26 (Zentrum) Zeichen, dann Initialen

**Kekule/Ahnentafel-Nummern** (v4-dev sw v68):
- Proband = 1, Vater = 2, Mutter = 3, Vatersvater = 4, Vatermutter = 5 …
- Anzeige auf jeder Vorfahren-Karte (fett, gold-dim)

**Interaktion:**
- Klick auf reguläre Karte → `showTree(id)` (neu zentrieren)
- Klick auf Zentrum-Karte → `showDetail(id)` → Zurück führt wieder zum Baum
- ⧖-Button in Detailansicht und Familienansicht → öffnet Tree
- **Pinch-to-Zoom** (Mobile): `touchstart/touchmove/touchend` auf `#treeScroll` mit 2 Fingern
  - Startwert: `_pinchStartDist` (Euklidischer Abstand der 2 Touch-Punkte) + `_pinchStartScale`
  - `_treeZoomScale = clamp(0.3, 3, _pinchStartScale × dist / _pinchStartDist)`
  - Anwendung: `#treeWrap { transform: scale(_treeZoomScale) }` + `#treeScaleWrap` Größe angepasst
  - Bereich: 0.3× (Übersicht) bis 3× (Detail)
- **Drag-to-Pan** (Desktop): `mousedown/mousemove/mouseup` auf `#treeScroll`; 5px-Threshold verhindert versehentliches Aktivieren; Click-Event nach Drag unterdrückt
- **Vollbild-Modus**: `⤢`-Button in Topbar; `body.tree-fullscreen` blendet Sidebar aus; Toggle zu `⤡`
- **Tastaturnavigation** (Desktop):
  - `↑` → Vater · `Shift+↑` → Mutter · `↓` → erstes Kind · `→` → aktiver Partner · `←` → History-Back
  - `_treeNavTargets{}` wird bei jedem `showTree()` aktualisiert
  - `_initTreeKeys()` einmalig: Listener nur wenn `v-tree` aktiv + kein Eingabefeld fokussiert
- **Pfeil-Legende**: kompakte Box unten rechts (nur `desktop-mode`), alle 5 Tasten mit Bezeichnung
- **Auto-Fit-Zoom** (Desktop sw v67): Baum passt sich beim ersten Laden an Fenstergröße an

**History-Navigation:**
- `_treeHistory[]` + `_treeHistoryPos` — Stack für ← im Baum
- `treeNavBack()` popt Stack; `←`-Taste ruft `treeNavBack()` auf
- `_prevTreeId` sichert letzte Tree-ID vor Überschreibung

**Halbgeschwister:**
- Kinder der aktuellen Ehe = Hauptfamilien-Kinder (normale Karte)
- Kinder aus anderen `fams`-Einträgen = Halbgeschwister → `.tree-card-half` + `½`-Badge
- Verbindungslinien: gestrichelt (`lineHalf()`, stroke-dasharray 4 3)

**Mehrfach-Ehen:**
- `⚭N`-Badge auf Zentrum-Karte wenn Person >1 Ehe hat
- Alle Ehe-Familien navigierbar; aktive Familie in `_activeSpouseMap` gespeichert

---

## Nachkommen-Ansicht: Layout-Algorithmus

`ui-desc-tree.js` — Toggle `⇩` in Baum-Topbar; `body.desc-tree-mode` aktiv.

```
Ebene 0:  [Geschwister-Stapel←]  [Proband★]  [⚭]  [Ehepartner1] [Ehepartner2…]
Ebene 1:      [Kind1]  [Kind2½]  [Kind3]           ← ½ = Halbkind (andere Ehe)
Ebene 2:    [Enkel1]  [Enkel2]     [Enkel3]
     …
```

**Konstanten** (Portrait / Landscape):
- Reguläre Karte: W=80/96 px, H=54/64 px
- Proband-Karte: CW=124/160 px, CH=72/80 px
- HGAP=8/10, VGAP=38/48, MGAP=8/10 (Proband↔Ehepartner-Gruppe), SIB_GAP=8/10
- `SLOT = W + HGAP` — Breite einer Kind-Einheit (kein Ehepartner-Platz pro Kind)

**Layout-Berechnung (`_descLayout`):**
- Bottom-up: `slots` = Summe der Kinder-Slots (mind. 1)
- `spouseId` = erster Ehepartner mit vollständiger Familie → bestimmt `mainKidSet`
- `isHalf: true` auf Kindern außerhalb der Hauptfamilie (andere Ehe)
- `hasMore: true` wenn `depth=0` aber Kinder vorhanden (→ `▼`-Badge)

**Ehepartner-Gruppe (Proband-Ebene):**
- `rootSpouseIds[]` = alle Ehepartner in Familien-Reihenfolge
- `spouseStep = min(W+HGAP, f(treeSpan))` — Überlapp bei schmalem Baum, max. normaler Abstand
- Ein ⚭-Button zwischen Proband-Karte und erster Ehepartner-Karte (öffnet Familien-Detail)
- `rootSpouseW = MGAP + spouseStep × (n−1) + W`

**Geschwister-Stapel (Proband-Ebene links):**
- Aus `p.famc[0]` ohne Proband selbst
- Horizontal gestapelt; `sibStep = min(W+HGAP, (availW−W)/(n−1))`, mind. 16 px sichtbar
- T-Linie horizontal: rechte Stapelkante → linke Proband-Kante

**Verbindungslinien (T-Linien):**
- Proband → `juncY` (40% von VGAP): vertikale Linie
- `juncY`: horizontale Linie über alle Kinder-CXs
- Jeder Kind-CX: vertikale Linie nach unten

**Interaktion:**
- Klick auf Proband → `showDetail(id)`
- Klick auf alle anderen Karten (Kinder, Ehepartner, Geschwister) → `showDescTree(id)`
- Gen-Buttons 2–7 in Topbar (`#descGenBtns`, `data-dgen`): `setDescTreeGens(n)`
- `⇩`-Button: Toggle zwischen Sanduhr und Nachkommen-Baum (`toggleDescTree()`)
- Tastatur: `↑`=Vater, `↓`=erstes Kind, `→`=erster Ehepartner, `←`=History-Back

**Auto-Fit + Scroll (Desktop):**
- `fit = min(1, clientW/totalW, clientH/totalH)` — Zoom wenn Baum größer als Fenster
- Scroll zentriert auf Proband-X; Scroll-Top = 0

---

## Einheitliche Diagramm-Topbar-Struktur (ab sw v591)

Alle vier Diagramme — Sanduhr (`#v-tree`), Fächer (`ui-fanchart.js`), Nachkommen-Baum (`ui-desc-tree.js`) und Zeitleiste (`ui-timeline.js`) — folgen demselben Topbar-Muster:

```
[⌂ Proband]  [⤢ Vollbild]  |  [Diagramm-Wechsel-Buttons]  [☰ Menü]
```

- **Vor dem Separator:** `⌂ tlProbandBtn` (navigiert zur aktuellen Person im Probanden-Fokus) + `⤢ tlFsBtn` (Vollbild-Toggle)
- **Nach dem Separator:** Diagramm-spezifische Wechsel-Buttons (`⧖ ◑ ⇩ ⟷`) + `☰ Menü`
- **Person-Detail-Topbar:** zwei `⌂`-Buttons — `probandBtn` (plain, navigiert zum Probanden) + `probandSetBtn` (`.proband-set-btn`, setzt/hebt Proband, steht direkt vor `✎ Bearbeiten`)
