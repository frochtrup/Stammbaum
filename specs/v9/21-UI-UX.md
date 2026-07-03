# 21 — UI / UX

> Schicht: App · Abhängig von: [20 Funktionen](20-Funktionen.md), [02 Zielarchitektur](02-Zielarchitektur-v9.md) · Referenz-Detail (Layout-Algorithmen, Symboltabellen): `UI-DESIGN.md`

---

## 1. View-Hierarchie

```
Landing (kein Back, keine Bottom-Nav)
   ↓ Datei laden
[Baum | Listen-Tabs]  (Bottom-Nav sichtbar)
   ↓ Karte/Zeile
Detail  (Bottom-Nav versteckt)
   ↓ ← Zurück (herkunftsbewusst)
[Baum | Listen-Tabs]
```

---

## 2. View-State-Kontrakt (dauerhaft, aus v8-ADR-025)

> **INV-VS:** Genau *eine* zentrale Instanz verwaltet die aktuelle Auswahl je Tab (`setCurrent(tab, id)` / `getCurrent(tab)`), inklusive Persistenz und Change-Event. Keine parallelen Auswahl-Quellen.

- Selektion überlebt App-Resume (Browser-Speicher).
- Bei fehlender Entität → definierter Fallback (nie stiller Abbruch).
- In v9 ist der View-State Teil der **UI-Schale** ([02](02-Zielarchitektur-v9.md)); er hält reaktive Referenzen und dispatcht Änderungen an abgeleitete Ansichten.

**PWA-Lifecycle-Kontrakt:** Ein zentraler Ort für `visibilitychange` (>60s → Views „dirty"), `pageshow` (BFCache-Guard), `pagehide` (Flush). Ein Dirty-Bit steuert Re-Render — kein unnötiges Neuzeichnen. In v9 ersetzt der zentrale Invalidierungspfad ([02 §3.2](02-Zielarchitektur-v9.md)) das v8-`markChanged(); renderTab()`-Muster.

**Detail-Container:** Separate Container je Entitätstyp mit per-Entität-Scroll-State (Desktop: Tab-Wechsel stellt Scroll-Position wieder her).

---

## 3. Responsive

- **Mobile (Portrait):** Bottom-Sheets, 2 Baum-Ebenen, Swipe-Back, FAB.
- **Desktop (≥900px):** Zweispalten (Liste 360px + Detail/Baum), Tastaturnavigation, bis 4 Baum-Ebenen, Vollbild.

---

## 4. Design-System

Warme Dunkelbraun-Palette (Pergament-Ästhetik) + Gold als Primärfarbe. Dark/Light umschaltbar.

```
Hintergründe: #18140f → #211c14 → #2a2318 → #342c1e   (bg → surfaces)
Gold:         #c8a84a (primär) · #e5c96e (hell) · #7a6328 (gedämpft)
Text:         #f2e8d4 (haupt) · #a0906e (dim) · #5a4e38 (muted)
Aktion:       #c04040 (rot/löschen)
Radius:       14px (Karten/Modals) · 9px (Buttons/Inputs)
Typografie:   Playfair Display (Titel/Namen) · Source Serif 4 (Body/UI)
```

---

## 5. Symbol-Konventionen (streng, eindeutig)

Jedes Symbol hat **genau eine** Bedeutung. Invariante Regeln (Auszug):
- `📎` = ausschließlich Medien/OBJE (nie Quellen).
- `§N` (`.src-badge`) = Quellen-Zitat, N = numerischer ID-Teil; QUAY-Farbindikator q0–q3; Tooltip = Quellentitel.
- `☰` (Menü) steht **immer ganz rechts** in jeder Topbar.
- `✎` (Bearbeiten) steht **direkt links von** `☰` in Detail-Topbars.
- Diagramm-Wechsel-Symbole (`◑ ⇩ ⟷ 🗺`) stehen immer nach dem Separator, vor `☰`.
- Geschlecht im Baum: `data-sex` → Border-Farbe (M blau, F rosa, U keine).
- Barrierefreiheit: nie Information nur über Farbe; alle Icon-Buttons mit aria-label (LP-8).

Vollständige Symbol- und Topbar-Layout-Tabellen: `UI-DESIGN.md`.

---

## 6. Bekannte UX-Defekte (aus v9 zu beheben)

Aus dem v8-UX-Audit (relevant für einen sauberen Neustart):
- Aktiver Bottom-Nav-Tab visuell zu schwach (nur Braunton-Nuance) → deutlicher Aktiv-Zustand (Balken/Fett/Akzentfarbe), WCAG 1.4.1.
- Englische Typ-Badges (`Unknown`) im deutschen UI → lokalisieren.
- Horizontal abgeschnittene Button-Reihen im Person-Detail → Umbruch/Scroll-Hinweis.
- Reine Icon-Leisten ohne Labels → Mini-Labels/Tooltips.
- FAB überlappt letzte Listenzeile → Listen-Padding.
- Suchfeld ohne sichtbaren Lösch-Button.

---

## 7. Layout-Algorithmen (imperative Inseln)

Sanduhr- und Nachkommen-Baum sind imperative SVG-Inseln ([02 §5](02-Zielarchitektur-v9.md)). Die konkreten Layout-Konstanten (Kartengrößen, GAPs, ancSpan-Slots, Kekule-Vergabe, Pinch/Drag/Tastatur-Verhalten, T-Linien) sind in `UI-DESIGN.md` dokumentiert und als *Algorithmus* aus v8 wiederverwendbar. Sie hängen nicht am View-State und werden bei jeder (Re-)Zentrierung vollständig neu berechnet.
