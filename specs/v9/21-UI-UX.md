# 21 — UI / UX

> Schicht: App · Abhängig von: [20 Funktionen](20-Funktionen.md), [02 Zielarchitektur](02-Zielarchitektur-v9.md) · Referenz-Detail (v8-Layout-Algorithmen, Symboltabellen): `legacy-v8/UI-DESIGN.md`

Das UI/UX von v8 ist evolutionär gewachsen und in der Navigation nicht mehr konsistent (Befunde in [§9](#9-konsistenz-befunde-v8--wie-v9-sie-löst)). v9 baut es auf einem klaren Rollenmodell neu — **je Form-Faktor eigenständig designt**, nicht „Mobile verbreitert".

---

## 1. View-Rollen-Modell (Kern)

Jedes Navigations-Element hat **genau eine** von drei Rollen. Das ist die zentrale Ordnung, die v8 fehlte.

| Rolle | Was | Elemente |
|---|---|---|
| **Entitäten** | Datenkategorien zum Browsen/Bearbeiten | Personen · Familien · Quellen · Orte · **Höfe** |
| **Ansichten (Lenses)** | *dieselben* Daten anders betrachtet | **Baum** (Sanduhr/Nachkommen/Fächer) · Karte · Zeitleiste · Statistik · Story |
| **Arbeitsflächen** | querschnittlich | **Suche** · Aufgaben/Forschung · Ausgaben · Einstellungen |

**INV-UI-1:** Ansichten sind **Lenses, keine Nav-Ziele.** Der Wechsel zwischen ihnen läuft über *einen* einheitlichen Lens-Umschalter ([§4](#4-lens-umschalter)), nicht über verstreute Topbar-Glyphen.

**INV-UI-2:** Jedes Ziel ist über **genau einen** kanonischen Weg erreichbar (kein „Karte als Sub-Modus des Orte-Tabs *und* als Diagramm-Toggle").

---

## 2. Mobile-Modell (primär)

**Bottom-Nav = 5 feste Ziele:** **⧖ Baum · 👤 Personen · 🔍 Suche · ☑ Aufgaben · ⋯ Mehr**

- **Suche** ist erstklassig (in v8 versteckt) — das universelle „finde irgendwas".
- **Personen** ist der Einstieg in die Entitäten; **Familien / Quellen / Orte / Höfe** über einen **Segment-Umschalter oben** auf der Listen-Fläche — eine *konsistente* Sub-Navigation statt versteckter Modi.
- **Mehr** = Hub für die Lenses (Karte / Zeitleiste / Statistik / Story) + Ausgaben + Einstellungen.
- **Baum** bleibt als Signatur-Ansicht eigener Slot (häufigster Einstieg).

**Interaktion:**
- Bottom-Sheets mit progressiver Offenlegung für alle Formulare (bewährt, bleibt).
- Aktionsreihen **brechen um** statt horizontal aus dem Bild zu scrollen ([§9 B7](#9-konsistenz-befunde-v8--wie-v9-sie-löst)).
- Swipe-Right = Zurück (herkunftsbewusst).
- FAB „＋" mit Abstand zur letzten Listenzeile.

**Aktiver Nav-Zustand:** deutlich (Balken/Fett/Akzentfarbe) — **nie nur Farbe** (WCAG 1.4.1, LP-8).

---

## 3. Desktop-Modell (eigenständig designt)

Kein verbreitertes Mobile-Layout, sondern ein echtes Desktop-Muster.

- **Persistente linke Sidebar** ersetzt die Bottom-Nav: **beschriftete** Abschnitte nach den drei Rollen —
  - *Entitäten:* Personen · Familien · Quellen · Orte · Höfe
  - *Ansichten:* Baum · Karte · Zeitleiste · Statistik · Story
  - *Arbeit:* Suche · Aufgaben · Ausgaben · Einstellungen

  Labels + Icons, immer sichtbar → löst „kryptische Icon-Leiste" und „aktiver Zustand" strukturell.
- **Multi-Pane Master-Detail:** Navigations-/Listen-Pane + Detail-Pane dauerhaft nebeneinander; optionaler dritter Kontext-Pane (z. B. Quellen zum aktuellen Ereignis).
- **Tastatur-first überall** (nicht nur im Baum): konsistente Shortcuts über alle Listen/Views.
- **Command-Palette (⌘K)** = Desktop-Pendant zur Suche; nutzt denselben Such-Kern ([20](20-Funktionen.md)).
- **Vollbild** ist ein sauberer Layout-Modus (eine State-Klasse), keine `!important`-Kaskade wie in v8.

**Responsive-Grenze:** ab ~900px Desktop-Modell; darunter Mobile-Modell. Die Grenze schaltet *Layout und Navigation* um — nicht nur Spaltenbreiten.

---

## 4. Lens-Umschalter

Ein **einziger**, überall identischer Umschalter ersetzt die v8-Diagramm-Toggle-Glyphen (`◑ ⇩ ⟷ 🗺`, deren starre Reihenfolge-Regeln entfallen).

- Aus jedem Personen-/Kontext-Fokus: Ansicht wählen (Baum ▸ Karte ▸ Zeitleiste ▸ Statistik ▸ Story).
- Segment-Control (Mobile) bzw. Sidebar-Abschnitt „Ansichten" (Desktop).
- Der Fokus (welche Person/welcher Ort) bleibt beim Lens-Wechsel erhalten.

**INV-UI-3:** Es gibt genau einen Lens-Umschalter-Mechanismus; kein Diagramm bringt eigene Wechsel-Buttons mit.

---

## 5. View-State- & Lifecycle-Kontrakt (aus v8-ADR-025, dauerhaft)

> **INV-VS:** Genau *eine* zentrale Instanz verwaltet die aktuelle Auswahl je Ziel (`setCurrent(target, id)` / `getCurrent(target)`), inklusive Persistenz und Change-Event. Keine parallelen Auswahl-Quellen.

- Selektion überlebt App-Resume (Arbeitskopie/Browser-Speicher).
- Bei fehlender Entität → definierter Fallback (nie stiller Abbruch).
- In v9 Teil der **UI-Schale** ([02](02-Zielarchitektur-v9.md)): hält reaktive Referenzen, dispatcht Änderungen an abgeleitete Ansichten.

**PWA-Lifecycle:** ein zentraler Ort für `visibilitychange` (>60s → dirty), `pageshow` (BFCache-Guard), `pagehide` (Flush). Ein Dirty-Bit steuert Re-Render. Der zentrale Invalidierungspfad ([02 §3.2](02-Zielarchitektur-v9.md)) ersetzt das v8-`markChanged(); renderTab()`-Muster.

**Detail-Zustand:** per-Entität-Scroll-State (Desktop: Wechsel Person→Familie→Person stellt Scroll-Position wieder her).

---

## 6. Design-System

Warme Dunkelbraun-Palette (Pergament-Ästhetik) + Gold als Primärfarbe. Dark/Light umschaltbar. (Bleibt aus v8 — konsistent, kein Umbau.)

```
Hintergründe: #18140f → #211c14 → #2a2318 → #342c1e   (bg → surfaces)
Gold:         #c8a84a (primär) · #e5c96e (hell) · #7a6328 (gedämpft)
Text:         #f2e8d4 (haupt) · #a0906e (dim) · #5a4e38 (muted)
Aktion:       #c04040 (rot/löschen)
Radius:       14px (Karten/Modals) · 9px (Buttons/Inputs)
Typografie:   Playfair Display (Titel/Namen) · Source Serif 4 (Body/UI)
```

---

## 7. Symbol-Konventionen (verschlankt)

**Beibehaltene, gute Semantiken** (jede Bedeutung eindeutig):
- `📎` = ausschließlich Medien/OBJE (nie Quellen).
- `§N` (`.src-badge`) = Quellen-Zitat, N = numerischer ID-Teil; QUAY-Farbindikator q0–q3; Tooltip = Quellentitel.
- Geschlecht im Baum: `data-sex` → Border-Farbe (M blau, F rosa, U keine).
- `☰` Menü, `✎` Bearbeiten, `＋` Neu.

**Verschlankt/entfallen ggü. v8:**
- Die starren Reihenfolge-Regeln der Diagramm-Toggle-Glyphen (`◑ ⇩ ⟷ 🗺 nach Separator vor ☰`) entfallen — ersetzt durch den Lens-Umschalter ([§4](#4-lens-umschalter)).
- Doppelbelegung von `⌂` (zwei Bedeutungen, nur per Stil unterschieden) wird aufgelöst: „Zum Probanden" und „Proband setzen" werden getrennte, beschriftete Aktionen.

**Regel:** Jede Icon-only-Aktion trägt auf Desktop ein sichtbares Label (Sidebar/Tooltip), auf Mobile ein Label oder einen Long-Press-Hint (LP-8). Vollständige Alt-Symboltabellen: `legacy-v8/UI-DESIGN.md` (als Referenz, nicht als Vorgabe).

---

## 8. Layout-Algorithmen (imperative Inseln)

Sanduhr-, Nachkommen- und Fächer-Baum, Karte und Zeitleiste sind imperative SVG-Inseln ([02 §5](02-Zielarchitektur-v9.md)). Die konkreten Layout-Konstanten (Kartengrößen, GAPs, ancSpan-Slots, Kekule-Vergabe, Pinch/Drag/Tastatur, T-Linien) sind in `legacy-v8/UI-DESIGN.md` dokumentiert und als *Algorithmus* aus v8 wiederverwendbar. Sie hängen nicht am View-State und werden bei jeder (Re-)Zentrierung vollständig neu berechnet.

---

## 9. Konsistenz-Befunde v8 & wie v9 sie löst

Am v8-Code verifiziert (nicht nur an der Doku):

| # | v8-Befund | v9-Auflösung |
|---|---|---|
| **B1** | 6 Bottom-Nav-Slots, aber ~11 Ziele; Suche/Statistik/Höfe/Karte/Zeitleiste/Story ohne Nav-Button | Rollenmodell ([§1](#1-view-rollen-modell-kern)): Entitäten via Segment/Sidebar, Lenses via Umschalter, Suche erstklassig |
| **B2** | Höfe/Karte nur als versteckte Sub-Modi des Orte-Tabs | Höfe = Entität (Segment/Sidebar); Karte = Lens; INV-UI-2 (ein kanonischer Weg) |
| **B3** | Doku nennt `bnav-search`, Code hat `bnav-tasks` — Drift | v9-Nav explizit spezifiziert; eine Quelle |
| **B4** | Bottom-Nav mischt Entität + Arbeitsfläche + Visualisierung | drei Rollen strikt getrennt |
| **B5** | Desktop = Mobile + Spalten, `!important`-Vollbild-Hacks | eigenständiges Desktop-Modell ([§3](#3-desktop-modell-eigenständig-designt)): Sidebar + Multi-Pane + ⌘K |
| **B6** | Symbol-/Topbar-Wildwuchs, `⌂` doppelbelegt, Icon-only kryptisch | verschlankte Symbolik ([§7](#7-symbol-konventionen-verschlankt)), Labels, Lens-Umschalter |
| **B7** | aktiver Tab kaum sichtbar · Icon-Leisten ohne Labels · Aktionsreihen scrollen weg · FAB-Überlappung · Suchfeld ohne ✕ · `Unknown`-Badge | als Baseline gefixt: deutlicher Aktiv-Zustand, Labels, Umbruch, FAB-Abstand, Such-✕, „Unbekannt" |
