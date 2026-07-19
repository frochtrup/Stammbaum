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
| **Arbeitsflächen** | querschnittlich | **Suche** · Aufgaben/Forschung · Ausgaben · Einstellungen · Datei (Laden/Speichern) |

**INV-UI-1:** Ansichten sind **Lenses, keine Nav-Ziele.** Der Wechsel zwischen ihnen läuft über *einen* einheitlichen Lens-Umschalter ([§4](#4-lens-umschalter)), nicht über verstreute Topbar-Glyphen.

**INV-UI-2:** Jedes Ziel ist über **genau einen** kanonischen Weg erreichbar (kein „Karte als Sub-Modus des Orte-Tabs *und* als Diagramm-Toggle").

---

## 2. Mobile-Modell (primär)

**Bottom-Nav = 5 feste Ziele:** **⧖ Baum · 👤 Personen · 🔍 Suche · ☑ Aufgaben · ⋯ Mehr**

- **Suche** ist erstklassig (in v8 versteckt) — das universelle „finde irgendwas".
- **Personen** ist der Einstieg in die Entitäten; **Familien / Quellen / Orte / Höfe** über einen **Segment-Umschalter oben** auf der Listen-Fläche — eine *konsistente* Sub-Navigation statt versteckter Modi.
- **Mehr** = Hub für die Lenses (Karte / Zeitleiste / Statistik / Story) + Ausgaben + Einstellungen + **Datei** (Laden/Speichern, [20 §1.2](20-Funktionen.md)). **Nachtrag 2026-07-07:** Datei öffnen/Demo laden/Speichern standen ursprünglich als permanent sichtbare Aktionsleiste über JEDER Ansicht — Nutzer-Fund per Screenshot: das sind Session-Rand-Aktionen (Anfang/Ende), keine Aktionen, die während der Arbeit an Personen/Familien laufend sichtbar sein müssen; v8-Oracle bestätigt das Muster (`legacy-v8/UI-DESIGN.md` Zeile 61: „`☰ Menü` (Speichern, Backup, neue Datei, OneDrive-Aktionen)" lag im Menü, nicht permanent in der Topbar). Gehört daher in den Mehr-Hub statt in eine eigene Kopfzeile.
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
  - *Arbeit:* Suche · Aufgaben · **Datei** · Ausgaben · Einstellungen

  Labels + Icons, immer sichtbar → löst „kryptische Icon-Leiste" und „aktiver Zustand" strukturell. **Datei** (Laden/Speichern, [§1](#1-view-rollen-modell-kern)) steht hier ausdrücklich mit: auf Desktop gibt es keinen Mehr-Hub, der es sonst trüge.

  **Die Sidebar-Gruppe „Ansichten" ist nicht deckungsgleich mit dem Lens-Umschalter** ([§4](#4-lens-umschalter)). Der Umschalter deckt die Kontext-Fokus-Lenses ab (dieselbe Person anders betrachtet: Baum ▸ Karte ▸ Zeitleiste ▸ Story); **Statistik** ist ein globales Dashboard ohne Personenfokus und daher kein Lens-Eintrag, in der Sidebar aber sehr wohl ein Ziel dieser Gruppe. Eine Sidebar-Gruppe ist eine Beschriftungs-Ordnung, kein Mechanismus — INV-UI-3 bleibt unberührt.
- **Multi-Pane Master-Detail:** Navigations-/Listen-Pane + Detail-Pane dauerhaft nebeneinander; optionaler dritter Kontext-Pane (z. B. Quellen zum aktuellen Ereignis). Bei leerer Auswahl trägt der Detail-Pane einen Leerzustand — „← Zur Liste" ([§6b](#6b-detail-kopfzeile-eine-gemeinsame-quelle-inv-ui-4-nachtrag-2026-07-06)) entfällt hier, weil die Liste sichtbar bleibt: dieselbe Kopfzeilen-Komponente in einem Modus, keine zweite Umsetzung.
- **Tastatur-first überall** (nicht nur im Baum): konsistente Shortcuts über alle Listen/Views. Baum-Navigation (Sanduhr/Nachkommen/Fächer, [20 §1.3](20-Funktionen.md)): ↑ zum Vater, ↓ zum ersten Kind, → zum Ehepartner, Tab zykelt zwischen sichtbaren Kacheln, Enter/Leertaste öffnet die fokussierte Kachel. App-weit: `Cmd/Ctrl+F` öffnet die Suche, `Cmd/Ctrl+S` speichert.
- **Command-Palette (⌘K)** = Desktop-Pendant zur Suche; nutzt denselben Such-Kern ([20](20-Funktionen.md)) — dieselbe Funktion, nicht dieselbe Idee. Sie führt zusätzlich die Navigationsziele des Registers (INV-UI-15) als „Gehe zu"-Befehle. Ihr Overlay verlässt seinen Teilbaum wie jedes andere (INV-UI-13, [§6k](#6k-overlays-verlassen-ihren-teilbaum-inv-ui-13-adr-v9-99)).
- **Vollbild** ist ein sauberer Layout-Modus (eine State-Klasse), keine `!important`-Kaskade wie in v8.

**Was die Sidebar trägt, trägt der Inhaltsbereich nicht mehr.** Oberhalb der Layout-Grenze entfallen die mobilen Sub-Navigationen, deren Ziele die Sidebar bereits beschriftet und dauerhaft führt — die **Entitäts-Segmentreihe** ([§2](#2-mobile-modell-primär)) und der **Lens-Umschalter** ([§4](#4-lens-umschalter)). Beides gleichzeitig wären zwei Wege zum selben Ziel (INV-UI-2) bzw. zwei Umschalt-Mechanismen für denselben Wechsel (INV-UI-3). Was **kein** Navigationsziel ist, bleibt: die Quellen/Archive-Unterreihe (Archive sind eine Unteransicht des Quellen-Ziels, [20 §1.6](20-Funktionen.md)) und die Aktionen der Lens-Kopfzeile (Vollbild). Umgekehrt entfällt auf Desktop der **Mehr-Hub** ersatzlos; ein dort gestrandeter Zustand fällt auf die Entitäten-Fläche zurück ([§5](#5-view-state--lifecycle-kontrakt-aus-v8-adr-025-dauerhaft): nie ein stiller Abbruch).

**INV-UI-15 (ein Navigations-Register, mehrere Projektionen):** Jedes Navigationsziel der App ist **einmal** beschrieben — Id, Rolle ([§1](#1-view-rollen-modell-kern)), Symbol, Beschriftung, Implementiert-Status — in einer reinen, DOM-freien Quelle (`ui/shell/nav-model.ts`, Bauform wie `lens-model.ts`, damit build-frei testbar, INV-ARCH-2). Bottom-Nav (5 Slots), Sidebar (alle Ziele), Mehr-Hub (was nicht in die 5 Slots passt) und Command-Palette sind **Projektionen** darauf und halten **keine eigenen Ziel-Listen**. Ebenso gibt es **genau eine** Quelle dafür, welches Ziel gerade aktiv ist (`ui/shell/route.svelte.ts`) — nicht eine Haupt-Route in der App-Wurzel plus einen privaten Segment-Zustand im Entitäten-Umbrella plus einen Hub-Zustand. Ohne diese eine Quelle ist die Sidebar nicht ohne zweite Navigationsquelle baubar und INV-UI-2 („genau ein kanonischer Weg") nicht haltbar. Sie ist zugleich die Voraussetzung für die History-Navigation ([20 §1.1](20-Funktionen.md)): Zurück/Vorwärts brauchen einen Stack, den es ohne eine Routen-Quelle nicht gibt.

**Responsive-Grenzen — zwei, bewusst getrennt, beide benannt in `ui/shell/layout.svelte.ts`:**

| Grenze | Was sie umschaltet |
|---|---|
| **640 px** | *Darstellung eines Overlays*: Bottom-Sheet (darunter) ⇄ Popover am Trigger (darüber) — `FilterBar`, Menüs, Palette ([§6k](#6k-overlays-verlassen-ihren-teilbaum-inv-ui-13-adr-v9-99)). |
| **900 px** | *Layout und Navigation*: Bottom-Nav ⇄ Sidebar, ein Pane ⇄ zwei Panes. Nicht nur Spaltenbreiten. |

Ein Tablet im Hochformat bekommt damit Popover ohne Sidebar — gewollt, nicht Nebenwirkung. Beide Grenzen laufen über **ein** `matchMedia`-Modul (dieselbe Bauform wie der zentrale `prefers-reduced-motion`-Check, [§6i](#6i-barrierefreiheit--operationalisierter-kontrakt-lp-8-adr-v9-67)), nicht als verstreute Zahlen in n Stylesheets.

**Das Befehlsflächen-Budget ([§6h](#6h-befehlsflächen-budget-inv-ui-11-adr-v9-66)) hängt an der Spaltenbreite, nicht am Formfaktor** — der Desktop-Modus befreit keine Fläche davon. Was die Sidebar löst, ist die *Navigation*; die Toolbar einer Liste bleibt so knapp, wie ihre Spalte breit ist.

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

**INV-UI-4 (wiederkehrende visuelle Muster haben genau eine Quelle):** Ein UI-Muster, das an mehreren Stellen dieselbe Rolle spielt (Segment-Control/Tab-Reihe, View-Kopfzeile, Listenzeile, Badge, …), wird **einmal** als gemeinsame CSS-Klasse(n) in `design-system.css` (oder eine gemeinsame Shell-Komponente) definiert und von allen Konsumenten referenziert — nicht pro View neu geschrieben. **Lehre (2026-07-05, ADR-v9-26):** `EntityTab`s Entitäten-Segmente und der spätere `LensSwitcher` implementierten unabhängig voneinander zwei sichtbar unterschiedliche Segment-Control-Stile (individuell umrandete Pillen vs. gemeinsamer Track mit transparenten Items), bevor auf `.stb-segment-row`/`.stb-segment-btn` konsolidiert wurde; ebenso hatten `TreeView`/`MapLensView` je eine eigene, unterschiedlich hohe Kopfzeile mit redundantem Titel-Text neben dem bereits aktive-markierenden Lens-Umschalter, bevor auf `LensViewHeader` konsolidiert wurde. **Vor dem Bau eines neuen „sieht aus wie X"-Elements:** `design-system.css` und bestehende `ui/views`/`ui/shell`-Dateien nach einem vergleichbaren Muster durchsuchen (grep nach ähnlichen Klassennamen/Rollen) — existiert eines, wiederverwenden statt neu erfinden. **Weiterer Befund (2026-07-10):** Formular-Eingabefelder (`input`/`select`/`textarea`) waren `.person-form`/`.family-form`-lokal dupliziert, MIT `font: inherit` statt einem expliziten `font-size` — ein Datumszeilen-`<div>` außerhalb jedes `<label>`s erbte dadurch den Browser-Default (16px) statt des Formular-Fontsize (0.8rem) und wirkte sichtbar überdimensioniert neben Vorname/Nachname. Geteilte Shell-Komponenten wie `EventPlaceField.svelte` bekamen die lokale Regel gar nicht (Svelte-Scoped-CSS überschreitet keine Komponentengrenze) und blieben komplett unstyled (weißer Browser-Default-Hintergrund). Konsolidiert auf einen globalen `input, select, textarea`-Grundstil in `design-system.css` — behebt beide Symptome gleichzeitig, weil kein Vererbungs-Kontext mehr nötig ist.

---

## 6a. Kompakte Zeilen — Anzeige, Formular-Struktureingaben UND Listenzeilen (ADR-v9-30, ADR-v9-57)

**INV-UI-5:** Ein zusammengehöriges Element — eine **Detail-Zeile** (Ereignis, Zitat, Familien-Mitgliedszeile …), eine **Formular-Struktureingabe** (Datum: Qualifier+Tag/Monat/Jahr; Ort: 6-Felder-Toggle; …) ODER eine **Listenzeile** (Personen-/Orte-/Höfe-Liste: Titel + Status-Pille + Metadaten) — nutzt so wenige Zeilen wie sein Inhalt zulässt. Die Teilelemente stehen in **derselben** Zeile (`flex-wrap`), solange sie umbruchfrei passen; erst wenn die Breite nicht reicht, brechen sie um. Kein einzelnes Teilelement bekommt eine eigene volle Zeile, wenn es neben das vorherige passt — das gilt für Anzeige-Metadaten (Ort-Link, Kartenlink, Quellen-Badge) GENAUSO wie für Eingabefelder (ein Qualifier-Dropdown neben Tag neben Monat neben Jahr) UND für Listenzeilen (Titel neben Status-Pille neben Metadaten, nicht jedes in einer eigenen Zeile).

**Häufigste konkrete Ursache (wiederholt gefunden, s. Befunde unten):** der Container der Teilelemente hat `flex-direction: column` (oder gar kein `display: flex`) statt `display: flex; flex-wrap: wrap`. `flex-direction: column` erzwingt IMMER eine eigene Zeile je Kind, unabhängig von der verfügbaren Breite — das ist der Gegensatz zu INV-UI-5, nicht nur ein Sonderfall davon. **Vor dem Bau einer neuen mehrteiligen Zeile (Detail, Formular ODER Liste):** prüfen, ob der umgebende Container `flex-wrap: wrap` (nicht `flex-direction: column`) nutzt.

**Zeilenabstand/Padding — EIN Quelle pro Achse, nicht pro Ebene addiert:** wird eine Zeile aus mehreren verschachtelten Containern zusammengesetzt (z. B. `<li>` einer geteilten Gruppen-Komponente UM einen eigenen `<button>`-Zeileninhalt), darf **nur eine** Ebene das vertikale Padding tragen — addieren sich Padding-Werte mehrerer Ebenen, wirkt die Zeile trotz korrektem `flex-wrap` optisch „groß" (Befund 2026-07-10 unten). Horizontales Padding braucht dagegen oft eine bewusste Entscheidung, WELCHE Ebene es trägt: Container ohne eigenes Padding (z. B. eine Liste, deren Zeilen randlose Hover-Flächen brauchen) delegieren es an jedes Kind einzeln — geteilte Komponenten, die ursprünglich für gepolsterte Container gebaut wurden (z. B. `EventsByType.svelte`s Gruppen-Header, ausgelegt auf `padding:1rem`-Detail-Seiten), tragen in einem ungepolsterten Kontext KEIN Padding und sitzen dann sichtbar auf der Kante — vor Wiederverwendung einer geteilten Komponente in einem neuen Container-Typ das Padding-Modell des Zielkontexts prüfen, nicht nur die Komponente selbst.

**Befunde:**
- (2026-07-06) Eine Geburts-Zeile in `PersonDetail`/`FamilyDetail` belegte bisher bis zu drei Zeilen (Datum+Ort · Kartenlink · Quellen-Badge einzeln), obwohl der Inhalt in zwei Zeilen passt (Datum+Ort+Kartenlink zusammen, Badge mitlaufend oder in einer zweiten Zeile mit weiteren Badges — nicht isoliert in einer dritten).
- (2026-07-06) Die Datums-Struktureingabe in `PersonForm`/`FamilyForm` belegte vier Zeilen (Checkbox+Qualifier+Tag / Monat+Jahr einzeln gestapelt), obwohl Qualifier-Dropdown+Tag+Monat+Jahr (die Checkbox selbst entfällt ohnehin, s. o.) in eine Zeile passen (bzw. bei `BET`/`FROM` in zwei — eine je Datumshälfte). Gleiche Erwartung gilt für die 6-Felder-Ort-Eingabe ([20 §2](20-Funktionen.md)), sobald gebaut.
- (2026-07-06, weiterer Befund nach erster Umsetzung) Der oben beschriebene Fix reichte nicht: `.person-detail__geo-link`/`.family-detail__geo-link` hatten `margin-left: auto` UNBEDINGT gesetzt — existiert neben dem Kartenlink noch ein Ort-/Hof-Link im selben Flex-Container, drückt das den Rest der Zeile so weit nach rechts, dass der zweite Link doch wieder umbricht. **Regel-Präzisierung:** `margin-left: auto` gehört auf `:last-child` (weicht automatisch, wenn ein weiteres Element danach folgt), nicht unbedingt auf das Element selbst. Außerdem lagen Quellen-Badges in einem VOM Header getrennten Flex-Container — dadurch bekamen sie immer eine eigene Zeile, obwohl `flex-wrap` das nur tun soll, wenn der Platz wirklich fehlt. Label/Datum/Ort/Kartenlink/Ortslink/Badges gehören in EINEN gemeinsamen `flex-wrap`-Fluss, nicht in separate Geschwister-Container mit je eigenem Zeilenumbruch-Verhalten.
- (2026-07-10, ADR-v9-57 — INV-UI-5 gilt auch für Listenzeilen, nicht nur Detail/Formular) `HofList.svelte`s Zeile (Adresse/„ohne Zusatzangaben"-Pille/Ort+Koordinaten) rendere als DREI erzwungene Zeilen — `.hof-list__row` hatte `flex-direction: column`, dasselbe Muster wie oben, unabhängig wiederentdeckt in einem dritten Kontext (Liste statt Detail/Formular). Nach dem Fix (EIN `flex-wrap`-Container) zwei weitere, eng verwandte Befunde: (a) Zeilenabstand blieb trotzdem groß — `.hof-list__row`s eigenes vertikales Padding (0.55rem) addierte sich mit dem vertikalen Padding der umgebenden `<li>` (0.3rem, aus der wiederverwendeten `EventsByType.svelte`), macht zusammen ~27px statt der beabsichtigten ~15px; behoben durch EINE Padding-Quelle (nur das `<li>`). (b) Der neu eingeführte Dorf-Gruppen-Header (`EventsByType`s `<h4>`) saß exakt auf der linken Bildschirmkante, während die Zeilen darunter korrekt eingerückt waren — `EventsByType` trägt selbst kein horizontales Padding (in `PlaceDetail`/`SourceDetail` korrekt, weil deren Container `padding:1rem` hat), `HofList`s Container hat aber KEIN eigenes Padding (Zeilen tragen ihres selbst, für randlose Hover-Flächen). Behoben mit einer gezielten `:global()`-Ergänzung, NICHT durch Ändern von `EventsByType.svelte` selbst (hätte `PlaceDetail`/`SourceDetail` doppelt eingerückt).

---

## 6b. Detail-Kopfzeile: eine gemeinsame Quelle (INV-UI-4, Nachtrag 2026-07-06)

**Befund am echten Code:** `EntityTab.svelte` rendert „← Zur Liste" als eigene, von der jeweiligen Detail-Komponente UNABHÄNGIGE Zeile (`.entity-tab__detail-header`) — direkt darüber sitzt dann `PersonDetail.svelte`/`FamilyDetail.svelte`s eigene `__hero`-Zeile (Titel + „✎ Bearbeiten" + „⧖ Im Baum anzeigen"). Zwei getrennte Komponenten erzeugen zwei optisch getrennte Zeilen für das, was inhaltlich EIN Kopfbereich ist. `PlaceDetail.svelte`/`HofDetail.svelte` haben denselben Bruch (eigener Bearbeiten-Button, aber „Zurück" kommt separat von `EntityTab`).

**Konvention:** alle navigierenden/aktions-Funktionen einer Detail-Ansicht („← Zur Liste", „✎ Bearbeiten", „⧖ Im Baum anzeigen" und künftige View-spezifische Aktionen) stehen in EINER gemeinsamen Kopfzeile (`flex-wrap`, INV-UI-5/§6a) — NICHT in zwei gestapelten Zeilen aus zwei verschiedenen Komponenten. Der Titel (Personenname/Familienlabel/Ortsname/…) bekommt eine EIGENE Zeile darunter (er ist Inhalt, keine Navigations-Funktion). Diese Kopfzeile ist ein wiederkehrendes Muster über Person/Familie/Ort/Hof (und künftig Quelle/Archiv) hinweg — sie bekommt EINE gemeinsame Quelle (INV-UI-4): eine geteilte Komponente/CSS-Klasse statt fünf unabhängiger `__hero`-Umsetzungen mit potenziell abweichendem Verhalten (die exakte Umsetzung — geteilte Svelte-Komponente vs. reine CSS-Klasse — ist Implementierungsdetail, s. betroffenes Subsystem).

---

## 6c. Personen-Disambiguierung bei Namensgleichheit (INV-UI-6, ADR-v9-51)

**INV-UI-6:** Jede Stelle, die eine Person als anklickbaren Namen in einer Liste/Zeile referenziert — Kinder-/Ehepartner-/Eltern-Zeilen in Personen- UND Familien-Detail, Entitäts-Picker-Ergebnisse ([20 §2](20-Funktionen.md) `Picker.svelte`), globale Suche, künftige Duplikat-/Merge-Ansichten — zeigt bei Namensgleichheits-Risiko ein disambiguierendes Sekundärmerkmal (Geburtsjahr, ggf. +Ort) über **denselben** `yearPlaceSummary`-Mechanismus (`ui/shell/person-display.ts`) — kein View entscheidet das unabhängig neu (INV-UI-4-Grundsatz, hier auf Daten- statt nur Layout-Ebene angewandt).

**Befund (2026-07-10, ADR-v9-51):** `FamilyDetail`s Kinder-Zeile bekam das Geburtsjahr bereits (Nachtrag 2026-07-06 zu [20 §1.5](20-Funktionen.md) — Grund: mehrere Personen mit identischem Namen im Datenbestand, nur über Geburtsjahr unterscheidbar). `PersonDetail`s strukturell identische Kinder-Zeile (`FamilyNavRow.children`, dieselben Personen, andere Aufrufkette) hatte dasselbe Geburtsjahr NICHT — zwei unabhängige Implementierungen derselben fachlichen Entscheidung liefen auseinander, obwohl die Begründung identisch gilt. Gefixt: `FamilyNavRow.children` führt jetzt `summary: yearPlaceSummary(child.birth, ctx)`, gerendert analog `FamilyDetail`. **Offen (Folgearbeit, ADR-v9-52):** `PersonDetail`s `fam.members` (Ehepartner bei `parentIn`, Eltern bei `childOf`) haben denselben Mangel weiterhin — kein Geburtsjahr, obwohl `FamilyDetail`s Eltern-Boxen (`.stb-person-box__meta`) es für dieselben Personen bereits zeigen. Entitäts-Picker/globale Suche wurden nicht geprüft, ob sie INV-UI-6 bereits erfüllen.

---

## 6d. Ereigniszeile-Inhaltshierarchie (INV-UI-7, ADR-v9-53)

**INV-UI-7:** Die typspezifische Nutzlast eines Ereignisses (`value` bei OCCU/GRAD/…, `addr` bei RESI/PROP/CENS/OCCU) ist der Headline-Inhalt der Zeile — sie steht **immer direkt nach dem Label**, in derselben Textfarbe/-größe wie das Label-Umfeld (kein Kursiv/Dimmen). Datum/Ort (`summary`) ist nachrangiger Kontext und folgt **danach**. Sind `value` UND `addr` beide gesetzt (z. B. GRAD mit Abschlussbezeichnung UND Institution), erscheinen beide vor der Summary, in derselben Typografie. Reihenfolge: `Label → value → addr → summary → Geo-/Ort-/Hof-Links → Quellen-Badges`.

**Befund (2026-07-10, ADR-v9-53):** Bei der Einführung von `value`/`addr` (ADR-v9-51-Vorarbeit) stand `value` bereits korrekt als Erstes, `addr` dagegen nach der Summary, gedimmt-kursiv — als wäre die Adresse eine Randnotiz. Für RESI/PROP/CENS ist die Adresse aber der eigentliche Punkt der Zeile, genau wie der Beruf bei OCCU. Gefixt in `PersonDetail.svelte`/`FamilyDetail.svelte`.

---

## 6e. Deutsche Ereignistyp-Labels + Kategorie-Gruppierung (INV-UI-8, ADR-v9-58)

**INV-UI-8:** Jede Stelle, die einen GEDCOM-Ereignistyp-Tag (BIRT/OCCU/GRAD/RESI/…) als Text zeigt — Detail-Zeilen-Label, Formular-Pill, `<select>`-Option, Formular-Card-Header, Gruppen-Header einer typisierten Liste — übersetzt ihn ins Deutsche über **EINE** Quelle (`ui/shell/event-labels.ts::eventTypeLabel`), nicht roh und nicht mit einer eigenen lokalen Übersetzungstabelle. Ein freier `TYPE`-Sub-Wert (`ev.eventType`, z. B. „Schule" bei einem `EDUC`-Ereignis) hat PRIORITÄT vor der generischen Übersetzung, wenn gesetzt.

**Befund (2026-07-10):** Nur BIRT/CHR/DEAT/BURI (Person) und ENGA/MARR (Familie) waren übersetzt — über FÜNF unabhängige, sich überschneidende `SPECIAL_LABELS`/`PERSON_SPECIAL_LABELS`-Kopien (`person-detail-model.ts`, `family-detail-model.ts`, `hof-detail-model.ts`, `place-detail-model.ts` ×2). Jeder generische Typ (GRAD, EDUC, OCCU, RESI, …) erschien roh — „Ereignisse lesen sich unruhig, wenn deutsche und rohe Bezeichnungen gemischt sind". Konsolidiert auf `event-labels.ts`; alle fünf Kopien entfernt, `PersonForm.svelte`/`FamilyForm.svelte`s Pills/`<select>`-Optionen/Card-Header/aria-Labels ebenfalls umgestellt (Lese- UND Bearbeiten-Ansicht zeigen jetzt konsistent dieselbe Übersetzung).

**Kategorie-Gruppierung (nur `PersonDetail`, Nutzer-Vorgabe 2026-07-10):** die „Ereignisse"-Sektion gruppiert in eine FESTE Reihenfolge — `EVENT_CATEGORY_ORDER` in `event-labels.ts`: **Lebensdaten** (BIRT/CHR/DEAT/BURI) → **Bildung** (EDUC/GRAD) → **Beruf** (OCCU/RETI) → **Wohnen & Eigentum** (RESI/PROP/CENS) → **Weitere Ereignisse** (alles andere). Ein Tag mit eigener Kategorie-Bedeutung entscheidet immer zuerst; NUR bei kategorie-losen Tags (EVEN/FACT) prüft die Zuordnung zusätzlich den freien `TYPE`-Text gegen bekannte Synonyme (`CATEGORY_BY_CUSTOM_TEXT`, aktuell: „Beschäftigung" → Beruf) — ein `EVEN`-Ereignis mit `TYPE Beschäftigung` landet dadurch in derselben Gruppe wie ein `OCCU`-Ereignis, nicht in „Weitere Ereignisse". Umgesetzt via `groupByKey`s neuem optionalen `order`-Parameter ([21 §6b](21-UI-UX.md)-Mechanismus, INV-UI-4 — keine neue Gruppierungsfunktion).

**Kompaktheit (Nutzer-Fund 2026-07-10, "Kompaktheit ist das Ziel"):** `.person-detail__event`s Padding/Margin wurde reduziert (0.6rem/0.8rem Padding + 0.5rem Margin → 0.4rem/0.65rem + 0.3rem) — mehrere Kategorien mit je eigenem Header brauchten sonst insgesamt mehr statt weniger Vertikalraum als die vorherige flache Liste.

**Sortierung innerhalb "Beruf" (Nachtrag 2026-07-10):** Zeilen innerhalb einer Kategorie behalten normalerweise die Einfüge-Reihenfolge aus `person.events[]` (keine Neusortierung) — AUSSER innerhalb "Beruf": dort steht ein OCCU-Ereignis immer vor allen anderen (z. B. "Beschäftigung"-Synonym-Zeilen), danach chronologisch nach Jahr (`sortWithinCategory` in `person-detail-model.ts`). Andere Kategorien wurden NICHT geändert — nur für "Beruf" explizit angefragt.

---

## 6f. Datums-Anzeigetiefe folgt dem Kontext (INV-UI-9, ADR-v9-64)

**INV-UI-9:** Die Anzeigetiefe eines Ereignis-Datums richtet sich danach, OB die Detail-Seite die eigenen Ereignisse der gerade betrachteten Entität zeigt, oder ob eine Liste FREMDER Entitäten zur schnellen Unterscheidung durchsucht wird:

- **Eigene-Ereignis-Kontext** (die Detail-Seite EINER Person/Familie zeigt IHRE EIGENEN Ereigniszeilen — `PersonDetail`/`FamilyDetail`s „Ereignisse"-Sektion): **volles, lokalisiertes Datum** — Tag+Monat wo vorhanden, Qualifier-Präfix (`ca.`/`vor`/`nach`/…), Zeitraum-Format bei `BET`/`FROM`. Das Datum IST hier der Seiteninhalt, den der Nutzer recherchiert und verifiziert hat — jede Verkürzung ist ein Informationsverlust in der Anzeige (Genauigkeit bleibt im Modell erhalten, LP-1, nur die Darstellung war unvollständig).
- **Disambiguierungs-/Übersichts-Kontext** (eine Liste MEHRERER Personen in einer fremden Detail-Seite oder Übersicht — Kinder-/Ehepartner-/Eltern-Zeilen [INV-UI-6](#6c-personen-disambiguierung-bei-namensgleichheit-inv-ui-6-adr-v9-51), Ort-/Hof-Bewohnerlisten, globale Suche): **Jahr genügt** — dient nur der groben zeitlichen Einordnung/Unterscheidung zwischen mehreren gleichnamigen oder ähnlichen Einträgen, ein volles Datum wäre hier Rauschen statt Hilfe.

Beide Stufen nutzen denselben zugrunde liegenden `core/model/gedcom-date.ts`-Parser (`parseDateValue`), nicht zwei unabhängige Implementierungen — nur die Formatierungstiefe unterscheidet sich (INV-UI-4).

**Befund (2026-07-12, Nutzer-Fund):** Vor dieser Invariante nutzten `PersonDetail`/`FamilyDetail`s EIGENE Ereigniszeilen denselben Jahr-only-Mechanismus (`yearPlaceSummary`) wie die Disambiguierungs-Listen — beide Kontexte wurden nicht unterschieden. Tag/Monat/Qualifier waren im `EventEditModal` korrekt eingebbar und wurden roundtrip-sicher gespeichert, verschwanden aber in JEDER Lese-Ansicht der eigenen Ereignisse spurlos. Siehe [10 §5.2](10-Domaenenmodell.md) für das Anzeigeformat je Qualifier.

---

## 6g. Direkt-Kommandos ohne Modal brauchen von Anfang an eine ebenso leichte Rücknahme (INV-UI-10, ADR-v9-65)

**INV-UI-10:** Jede neue Ein-Klick-Sofort-Aktion — ein Direkt-Kommando ohne Modal, ohne Bestätigungsdialog, das sofort einen Zustand setzt (z. B. „als verstorben markieren", ein leeres Ereignis per Pill anlegen) — wird **im selben Bau-Auftrag** um eine ebenso leichte Rücknahme ergänzt, solange der gesetzte Zustand noch „leer/unbestätigt" ist (kein nachträglich ergänzter Inhalt). Die Rücknahme ist selbst wieder ein Direkt-Kommando (kein Modal, keine Bestätigung) — dieselbe Interaktions-Leichtigkeit wie die ursprüngliche Aktion, sonst entsteht eine Einbahnstraße: leicht anzulegen, schwer/unmöglich zu korrigieren.

**Befund (2026-07-12, zweimal in derselben Sitzung, einmal am konkreten Einzelfall, einmal generalisiert):** „☠ Verstorben markieren" (ADR-v9-62) wurde zunächst OHNE Rücknahme spezifiziert und gebaut — ein Nutzer-Fund bei der eigenen Test-Verifikation deckte auf, dass eine versehentliche Markierung nicht mehr rückgängig zu machen war, ohne echte (leere) Sterbedaten anzulegen. Direkt danach zeigte sich beim Versuch, eigene Testdaten aufzuräumen, dass dieselbe Lücke JEDES per Pill/Menü frisch angelegte, noch leere Ereignis betraf (Beleg: [32 TST-13](32-Testframework.md)) — nicht nur den Tod-Sonderfall. Beide Male deckte erst eine NACHTRÄGLICHE Rückfrage/Beobachtung es auf, nicht die ursprüngliche Spezifikation selbst — obwohl die Notwendigkeit einer Rücknahme bei jeder Ein-Klick-Aktion grundsätzlich vorhersehbar gewesen wäre.

**Anwendung:** Beim Entwurf eines neuen Direkt-Kommandos die Rücknahme-Frage explizit mitdenken, BEVOR ein Nutzer-Fund sie aufdeckt — „kann dieser Klick versehentlich/vorschnell ausgelöst werden, und wenn ja, wie leicht kommt man zurück?" ist Teil der Spezifikation der Aktion selbst, kein separater Folge-Punkt. Sobald der Zustand echten, recherchierten Inhalt trägt, ist die leichte Rücknahme NICHT mehr die richtige Stelle (destruktiv, bräuchte Bestätigung) — das bleibt einer künftigen, größeren Lösch-Funktion vorbehalten, s. [20 §2](20-Funktionen.md).

---

## 6h. Befehlsflächen-Budget (INV-UI-11, ADR-v9-66)

**INV-UI-11:** Der permanente Kopfbereich einer Arbeitsfläche (Segment-Reihe + Toolbar, VOR jedem Inhalt) darf in **jeder Spalte ≤ 400px** höchstens **zwei** Zeilen und **fünf** dauerhaft sichtbare Bedienelemente belegen.

**Das Maß ist die Spaltenbreite, nicht der Formfaktor.** Die primäre mobile Zielbreite (375px) ist der bekannteste Fall, aber nicht der einzige: die Desktop-Listenspalte des Multi-Pane ([§3](#3-desktop-modell-eigenständig-designt)) misst **352px** und ist damit sogar schmaler. „Desktop" befreit eine Fläche also nicht — die Sidebar löst die *Navigation*, nicht die Enge einer Listen-Toolbar. Wer das Budget am Formfaktor festmacht, prüft die falsche Zahl. Segment-/Tab-Buttons selbst zählen NICHT mit (sie sind Navigation, [§1](#1-view-rollen-modell-kern), kein Befehl) — aber jedes weitere Bedienelement geht zu Lasten dieses Budgets, nicht obendrauf. v9 wiederholt sonst v8s Altlast §10 (Diagramm-Toggles/Toolbars als unkoordiniert wachsende, verstreute Glyphenreihen) auf einer neuen Fläche, nur additiv statt evolutionär entstanden.

**Zuordnungsregeln (kein View erfindet sein eigenes Muster, INV-UI-4):**
- **Filter** → immer hinter `FilterBar` (§10a unten), nie als Dauer-Pillenreihe mit mehr als einem sichtbaren Element.
- **Alternativansicht-Umschalter** (Liste⇄Board, Liste⇄Timeline, künftige Fälle) → EIN geteilter `ViewModeToggle`-Mechanismus, ein Icon-Slot — nicht pro View eine eigene Implementierung desselben „Liste ⇄ Alternativdarstellung"-Konzepts.
- **Seltene/schwere Konfiguration** (Regel-Schwellenwerte, Export-Feinoptionen) → Bottom-Sheet hinter EINEM Einstiegspunkt, niemals ein Dauer-Icon in der Kopfzeile (gleiche Disclosure-Logik wie seltene Formularfelder, ADR-v9-30, hier auf Befehlsflächen übertragen).
- **Cross-cutting Scope-Filter** (z. B. ein aktives Forschungsprojekt, das mehrere Segmente gleichzeitig einschränkt, [20 §1.11](20-Funktionen.md)) → EINMAL auf der Umbrella-Ebene der Arbeitsfläche, NICHT in jedem Kind-View dupliziert.
- **Export einer gefilterten Liste** (↓ MD, CSV, …) gehört fachlich zum Filter-Kontext, nicht als eigenständiges Dauer-Icon daneben — wandert mit hinter die Filter-Disclosure.

**Vor dem Bau eines neuen Toolbar-Elements:** das Budget der Ziel-View am echten Screenshot bei 375px nachzählen (nicht schätzen) — ist es bereits ausgeschöpft, MUSS ein bestehendes Element hinter Disclosure wandern, bevor ein neues hinzukommt.

**Vollzogen (ADR-v9-98):** `TasksView`/`LogView`/`HypothesesView` überschritten das Budget (Aufgaben-Tab: 3 gestapelte Kopfzeilen mit 9 dauerhaft sichtbaren Elementen; Protokoll-Tab: 2 Zeilen, 6 Elemente, dessen Filterreihe bei 375px ohne Restbreite endete). Der `FilterBar`-Retrofit war Voraussetzung für das Dashboard-Segment und ist mit ihm zusammen gebaut — Filter und Export liegen hinter der Disclosure, der Liste⇄Board-Umschalter kommt aus `ViewModeToggle`. Am echten Screenshot bei 375px nachgezählt, nicht geschätzt: je Segment EINE Toolbar-Zeile, höchstens drei Elemente.

**Konsolidierte Ziel-Struktur für die Forschungs-Arbeitsfläche** (`ResearchTab`, [20 §1.11](20-Funktionen.md)):
```
Zeile 1: [Aufgaben] [Protokoll] [Hypothesen] [Dashboard]   ← Segmente, zählen nicht ins Budget
Zeile 2: [Alle Projekte ▾]  ← EIN Chip-Selektor, cross-cutting, kollabiert wenn "Alle" aktiv
─── ab hier segment-spezifisch, Budget = 1 Zeile / max. 3 Elemente ───
Aufgaben:    [Filter · N] [☰ Liste ▦ Board] [+ Aufgabe]
Protokoll:   [Filter · N] [🕒 Timeline] [+ Eintrag]
Hypothesen:  [Filter · N] [+ Hypothese]
Dashboard:   [Filter · N] [✓ Bericht] [⚙]
```
Vier Segmente in Zeile 1 sind zulässig, weil `EntityTab`s Segment-Reihe bei derselben Breite bereits fünf Segmente (Personen/Familien/Quellen/Orte/Höfe) umbruchfrei zeigt — die Wortlängen sind vergleichbar. **Beim Bau am echten Screenshot gegengeprüft (375px): umbruchfrei.** `[✓ Bericht]` im Dashboard statt `[Projekt-Kontext geerbt]`: der vollständige Prüfbericht ([20 §1.11h](20-Funktionen.md)) ist die einzige Fläche, die auch Orts-/Hof-Befunde zeigt, und gehört damit neben das personbezogene Dashboard — nicht in die Aufgaben-Kopfzeile, die sonst vier Elemente trüge (ADR-v9-98).

---

## 6i. Barrierefreiheit — operationalisierter Kontrakt (LP-8, ADR-v9-67)

Operationalisierung von [01 LP-8](01-Vision-und-Prinzipien.md)/[30 NFR-5](30-NFR-und-Persistenz.md) auf Mechanismus-Ebene — vier Teilanforderungen, je auf konkrete v9-Komponenten/-Muster heruntergebrochen:

- **Tastaturbedienbarkeit — app-weit, nicht auf Desktop beschränkt.** „Tastatur-first überall" ([§3](#3-desktop-modell-eigenständig-designt)) gilt für Mobile UND Desktop gleichermaßen: kein Keyboard-Trap in Bottom-Sheets/Modals (`EventEditModal`, Picker, Assoziations-/Ortsübersetzungs-Add-Zeilen), sinnvolle Fokus-Reihenfolge, Escape schließt jedes Overlay — auch auf Mobile mit externer Tastatur/Switch-Control.
- **Screenreader-Beschriftung — jede interaktive Kontrolle, nicht nur Icon-only.** Jede Liste, jeder Button, jedes Formularfeld hat einen korrekten zugänglichen Namen (`aria-label`/`aria-labelledby`/verknüpftes `<label>`) — ein sichtbares Label allein (z. B. eine `.stb-role-label`-Pille ohne semantisches Element) ist kein zugänglicher Name. Segment-Reihen (`role="tablist"`, `ResearchTab.svelte`) und `Picker.svelte`-Ergebnislisten sind Referenzimplementierung (am häufigsten wiederverwendet, INV-UI-4).
- **`prefers-reduced-motion`.** Betrifft die imperativen SVG-Inseln ([§8](#8-layout-algorithmen-imperative-inseln)): Baum-Zentrierung/-Zoom-Übergänge, Karte-Migrationsmodus (Play/Pause/Loop-Animation, [20 §1.9](20-Funktionen.md)), Zeitleiste-Übergänge. Bei gesetzter Systemeinstellung „Bewegung reduzieren" springen Zustandswechsel direkt statt zu animieren — EIN zentraler Check (`window.matchMedia('(prefers-reduced-motion: reduce)')`), von allen Inseln gemeinsam gelesen (INV-UI-4), nicht pro Insel neu abgefragt.
- **Kontrast AA — über alle Ansichten.** Gilt für jede zum jeweiligen Zeitpunkt existierende Ansicht, Light- UND Dark-Mode — keine auf eine feste Anzahl Ansichten eingegrenzte Liste.

**Test-Gate:** [32 TST-15](32-Testframework.md) — automatisiert wo möglich (analog `check:csp`), manuelle Stichprobe für das, was Automation nicht zuverlässig fängt (tatsächlich wahrgenommene Fokus-Reihenfolge in den imperativen Inseln, ob reduzierte Bewegung sich auch "richtig" anfühlt).

---

## 6j. Affordanz sitzt am bedeutungstragenden Element (INV-UI-12, ADR-v9-87)

**INV-UI-12:** Eine Aktion/Navigation hängt an dem Element, das ihre Bedeutung ohnehin schon trägt — **nicht** an einer zusätzlichen, separaten „Tu X →"-Textzeile daneben. Zwei Ausprägungen:

- **(a) Navigation zu einer verwandten Entität** macht das bereits sichtbare Label/den Namen dieser Entität selbst zum Link. Beispiel: das Rollen-Label „Herkunftsfamilie"/„Eigene Familie" (`PersonDetail`) navigiert selbst zur Familien-Detailseite — **kein** separater „Familie ansehen →"-Button daneben.
- **(b) Sekundäre/externe Aktion ohne eigenes Textlabel** wird ein kompaktes, **monochromes** Symbol + Tooltip (via `use:tooltip`, [§7](#7-symbol-konventionen-verschlankt)) — kein ausgeschriebener Link-Text. Beispiel: „↗ OpenStreetMap" → „↗" + Tooltip „Auf OpenStreetMap öffnen" (`CoordIndicator`). Emoji sind hier fehl am Platz (farbig, brechen die Gold-Monochrom-Ästhetik) — ein Glyph in Textfarbe.

Ziel: verschlankte, konsistente Oberfläche (verstärkt INV-UI-5) mit EINEM kanonischen Klickweg je Ziel (INV-UI-2/3), statt redundanter Beschreibungstexte. Screenreader-Name bleibt über `aria-label` erhalten (LP-8, §6i). **Test:** `PersonDetail.component.test.ts` (Rollen-Label navigiert, kein „Familie ansehen") + `CoordIndicator.component.test.ts` (OSM-`aria-label`).

---

## 6k. Overlays verlassen ihren Teilbaum (INV-UI-13, ADR-v9-99)

**INV-UI-13:** Ein Overlay, das über den Fluss seines Auslösers hinausragt — Popover, Menü, Bottom-Sheet, Modal-Backdrop — wird an den `<body>` portaliert (`ui/shell/portal.ts`: `use:portal` bzw. `use:anchoredTo`) und positioniert sich in Viewport-Koordinaten. Es bleibt **nicht** im Teilbaum seines Auslösers.

**Warum das keine Stilfrage ist:** ein Overlay im eigenen Teilbaum ist der Sichtbarkeit seiner Vorfahren ausgeliefert, und zwar auf zwei Wegen, die beide **nicht** über `z-index` erreichbar sind:

- **Stapelnder Vorfahre** — ein Vorfahre mit eigenem Stacking-Context (`position: sticky; z-index: 1` einer Toolbar) löst jede Zahl des Kindes INNERHALB seines Kontexts auf; nach außen konkurriert der ganze Kontext mit *seinem* Wert. Am laufenden System bis `z-index: 9999` gemessen, wirkungslos.
- **Klippender Vorfahre** — ein Scroll-Container (`overflow: auto`) schneidet das Overlay an seiner Kante ab. Gemessen an `.person-detail`: Unterkante 523 px, Menü bis 630 px, die unteren Einträge nicht anklickbar.

**Platzierung** (`ui/shell/anchor-position.ts`, rein und ohne DOM): unten bevorzugt · nach oben klappen nur, wenn unten zu wenig und oben mehr Platz ist · an den Viewport-Rändern begrenzen · bei einem Overlay höher als der Viewport gewinnt der obere Rand, der Inhalt scrollt selbst. Der Breakpoint bleibt im Stylesheet: die Rechnung schreibt Koordinaten als CSS-Variablen, das CSS entscheidet, ob es sie benutzt (`FilterBar` ist auf Mobil ein Bottom-Sheet, auf Desktop ein Popover am Trigger).

**Aufräumen ist Teil des Mechanismus.** Svelte entfernt beim Unmount nur Knoten, die es selbst im Baum hält; ein portalierter Knoten muss von der Action entfernt werden — sonst bleibt bei jedem Öffnen ein unsichtbarer, klickfangender Backdrop über dem Dokument liegen.

**Konsequenz für Tests:** eine auf den Render-Container eingegrenzte Abfrage (`within(container)`) erreicht Overlay-Inhalte nicht mehr — das ist kein Fehler, sondern der Nachweis, dass der Vorfahre verlassen wurde. Overlay-Inhalte über `screen`/`document` abfragen. **Test:** `tests/ui/overlay-portal.test.ts` (Platzierungs-Rechnung, Umhängen, Aufräumen — und dass die Komponenten den Mechanismus auch benutzen).

---

## 6l. Orts-Anzeigetiefe folgt dem Kontext (INV-UI-14, ADR-v9-90/-100)

**INV-UI-14:** Die Anzeigetiefe eines Ortsnamens richtet sich — wie die Datumstiefe in [INV-UI-9](#6f-datums-anzeigetiefe-folgt-dem-kontext-inv-ui-9-adr-v9-64), nach derselben Kontext-Grenze — danach, OB der Ort der recherchierte Seiteninhalt ist oder ob eine Liste überflogen wird:

- **Eigene-Ereignis-Kontext** (die Detail-Seite EINER Person/Familie/eines Orts zeigt IHRE EIGENEN Ereigniszeilen, `EventLine`): **volle periodengerechte Verwaltungskette** (`buildPlacForGedcom`) — genau der String, der auch exportiert würde. Die Kette IST hier Inhalt.
- **Disambiguierungs-/Übersichts-Kontext** (Personen-/Familien-/Orte-/Höfe-Listen, globale Suche, Entitäts-Picker, Kinder-/Ehepartner-/Eltern-Zeilen, **Zeitleisten-Insel**): **ein zeitinvarianter Kurzname**, nie eine abgeleitete Kettenform. Die volle Kette bleibt per `use:tooltip` (ADR-v9-86) an derselben Zeile erreichbar — es geht keine Information verloren, sie wechselt nur die Ebene.

**Was „Kurzname" je Fall heißt** — EINE Kern-Funktion `buildListPlaceName(ev, ctx)` ([11 §5](11-Orte-Hoefe-Identitaet.md)), kein View-lokaler Zuschnitt (INV-UI-4), drei Fälle in dieser Reihenfolge:

| Fall | Anzeige | Anteil (gemessen) |
|---|---|---|
| `hofId` gesetzt | `Hofadresse, <Dorf-Kurzname>` — zwei Glieder, Dorfkette abgeschnitten | 15 % |
| `placeId` gesetzt | `shortName ?? title` des Orts | 83 % |
| ungelinkt, nur Rohtext | erstes Komma-Segment von `ev.place` (`atomic()`) | 1,2 % |

Der Hof behält sein Dorf, weil eine Hausnummer allein („Oster 82a") zwischen Dörfern nicht eindeutig ist; die Verwaltungskette hinter dem Dorf ist derselbe Ballast wie im Orts-Fall. Der Rohtext-Fall ist bewusst nicht „ehrlich lang": es sind genau die Zeilen, die sonst am schlechtesten aussehen, und die Verkürzung ist rein anzeigeseitig — Auflösung und Review-Klassifikation ([11 §6](11-Orte-Hoefe-Identitaet.md)) sehen den Rohwert unverändert.

**Offen: die Karten-Insel** (BL-87). `ui/islands/map/map-model.ts` liest `pl.title` an drei Stellen direkt weiter. Ob ein Kartenmarker Listen- oder Detail-Kontext ist, entscheidet diese Invariante bewusst noch nicht — ein Marker-Label wird überflogen wie eine Liste, steht aber allein statt in einer Spalte, in der Kettenlängen optisch konkurrieren. Vor dem Nachziehen zuerst diese Frage beantworten, nicht die Regel mechanisch ausrollen.

**Zwei bewusste Ausnahmen, die die Kette behalten**, weil dort Unterscheiden der Zweck ist, nicht Überfliegen: die Kandidatenliste der Review-Klasse P („Oldenburg › Niedersachsen" vs. „Oldenburg › USA", [11 §6](11-Orte-Hoefe-Identitaet.md)) und der Massen-Dedup ([11 §9.2](11-Orte-Hoefe-Identitaet.md), `buildFullPlaceName`).

**Test:** `tests/ui/place-display-depth.test.ts` — die drei Kurzformen, die Detailzeile mit voller Kette, und der Negativ-Beweis, dass ein gesetzter `shortName` den exportierten PLAC nicht verändert.

---

## 7. Symbol-Konventionen (verschlankt)

**Beibehaltene, gute Semantiken** (jede Bedeutung eindeutig):
- `📎` = ausschließlich Medien/OBJE (nie Quellen).
- `§N` (`.src-badge`) = Quellen-Zitat, N = numerischer ID-Teil; QUAY-Farbindikator q0–q3; Tooltip = Quellenname + Referenz (PAGE). Führt die Referenz einen Weblink (Zitat-`OBJE/FILE`-URL bzw. `deepLinkUrl`, Altdaten auch PAGE-als-URL), erscheint direkt neben der Pille ein klickbares `↗` (öffnet die Webseite in neuem Tab). Eintragbar je Referenz in `SourceCitationRow` als eigenes Weblink-Feld — ADR-v9-86.
- **Tooltips generell** laufen über EINE geteilte Svelte-Action `use:tooltip={text}` (`ui/shell/tooltip.ts`, INV-UI-4), NICHT über das native `title`-Attribut: native Tooltips erscheinen auf Touch/iPad gar nicht und auf dem Desktop nur verzögert. Die Action zeigt sofort bei Hover UND Tastatur-Fokus, auf Touch per Long-Press; Screenreader-Text liegt auf `aria-label`. **Die gesamte UI ist migriert** — reaktive Views/Shell (Quellen-Pille, Koordinaten-Glyph, ✕-Rücknahme, Export-/Ansichts-Icons, Info-Pillen/-Badges, ⓘ-Icon, Statistik-Balken) UND die imperativen SVG-Inseln ([§8](#8-layout-algorithmen-imperative-inseln), `hourglass-tree`/`timeline-view`), dort per direktem Funktionsaufruf statt `use:` (die Insel bleibt framework-frei: `tooltip.ts` ist zur Laufzeit reines DOM). **Kollisionsfrei mit Pan/Pinch/Drag**, weil jede Bewegung den Long-Press abbricht, `touchmove` passiv ist und `touchend`-`preventDefault` nur nach stationärem Long-Press feuert — am echten Baum verifiziert (Drag-Pan unverändert, kein Tooltip während des Pannens). Mehrzeilige Tooltip-Texte brauchen `white-space: pre-line` (Zeitleisten-Chips liefern „Datum\nTyp\nOrt", natives `title` konnte das) — ADR-v9-86/87.
- `◎`/`◌` (`CoordIndicator`) = Koordinaten vorhanden/fehlen; `◎` ist zugleich der interne Karte-Sprung (ADR-v9-78/80), Tooltip „Koordinaten vorhanden/fehlen".
- `↗` = „externen Link in neuem Tab öffnen" — EINE Bedeutung: Quellen-Weblink (`SourceBadge`), externe Kartenansicht (`CoordIndicator`, Tooltip „Auf OpenStreetMap öffnen", INV-UI-12b). Monochrom-Gold, nie Emoji.
- Geschlecht im Baum: `data-sex` → Border-Farbe (M blau, F rosa, U keine).
- `☰` Menü, `✎` Bearbeiten, `＋` Neu.

**Verschlankt/entfallen ggü. v8:**
- Die starren Reihenfolge-Regeln der Diagramm-Toggle-Glyphen (`◑ ⇩ ⟷ 🗺 nach Separator vor ☰`) entfallen — ersetzt durch den Lens-Umschalter ([§4](#4-lens-umschalter)).
- Doppelbelegung von `⌂` (zwei Bedeutungen, nur per Stil unterschieden) wird aufgelöst: „Zum Probanden" und „Proband setzen" werden getrennte, beschriftete Aktionen.

**Regel:** Jede Icon-only-Aktion trägt auf Desktop ein sichtbares Label (Sidebar/Tooltip), auf Mobile ein Label oder einen Long-Press-Hint (LP-8). Vollständige Alt-Symboltabellen: `legacy-v8/UI-DESIGN.md` (als Referenz, nicht als Vorgabe).

---

## 8. Layout-Algorithmen (imperative Inseln)

Sanduhr-, Nachkommen- und Fächer-Baum, Karte und Zeitleiste sind imperative SVG-Inseln ([02 §5](02-Zielarchitektur-v9.md)). Die konkreten Layout-Konstanten (Kartengrößen, GAPs, ancSpan-Slots, Kekule-Vergabe, Pinch/Drag/Tastatur, T-Linien) sind in `legacy-v8/UI-DESIGN.md` dokumentiert und als *Algorithmus* aus v8 wiederverwendbar. Sie hängen nicht am View-State und werden bei jeder (Re-)Zentrierung vollständig neu berechnet.

**Vollständigkeits-Heatmap ([20 §1.3](20-Funktionen.md)) — Dateneingabe, keine Berechnung in der Insel selbst.** Die Sanduhr-Insel bekommt für jede sichtbare Person eine vorberechnete Befundschwere (aus derselben Validierungs-Engine wie das Qualitäts-Dashboard, [20 §1.11](20-Funktionen.md)) als reinen Rendering-Input übergeben — sie wertet KEINE eigenen Kriterien aus (kein zweiter, insel-lokaler Mini-Validator wie im v8-Vorbild). Ring-Rendering folgt derselben Reduced-Motion-Regel wie jede andere Übergangsanimation der Insel (§6i oben).

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

---

## 10. Listen-/Detail-Primitiven der Gesamtüberarbeitung (ADR-v9-52/54)

Konkrete, baubereite Entscheidungen für den 12-Punkte-Befundkatalog aus ADR-v9-52 (Screenshot-Review 2026-07-10). Bau-Status je Punkt: [05 Backlog](05-Backlog.md) (BL-67…BL-78).

**a) FilterBar (Punkt 1).** Neue Shell-Komponente `ui/shell/FilterBar.svelte`: geschlossen per Default, Trigger-Button zeigt „Filter" bzw. bei aktiven Kriterien „Filter · N" (N = Anzahl gesetzter Filterfelder). Klick öffnet die vorhandenen Filterfelder in einem Bottom-Sheet (Mobile) / Popover unterhalb des Buttons (Desktop) — kein Layout-Verdrängen des darunterliegenden Listeninhalts mehr. Ersetzt die unabhängig kopierten `{#if showFilters}`-Blöcke in `PersonList.svelte`/`FamilyList.svelte`/`PlaceList.svelte` (INV-UI-4). Die Filterfelder selbst (Geschlecht, Geburtsjahr-Range, …) bleiben unverändert — nur der Container ändert sich. Nicht verpflichtend für `SourceList`/`RepositoryList`/`HofList`, solange dort keine Filterfelder existieren.

**b) Gruppierte/paginierte/einklappbare lange Listen (Punkt 2, erweitert ADR-v9-78).** Neue Shell-Komponente `ui/shell/PagedList.svelte` (oder gleichwertige Hilfsfunktion `pageSlice(items, pageSize)`): initial max. 30 Einträge, „N weitere laden"-Button hängt die nächsten 30 an. Keine Virtualisierung (kein neuer Dependency-Zweig, Einfachheit vor Performance-Feinschliff bei realistischer Referenzzahl). `SourceDetail.svelte`s Referenzen-Liste nutzt dies UND gruppiert vorher nach Ereignistyp (analog `PlaceDetail`s „Ereignisse nach Typ", §6c-Nachbarprinzip) — Paginierung greift je Gruppe, nicht global.

**Einklappbare Gruppen (ADR-v9-78-Ergänzung, gilt für jede `EventsByType`/`groupByKey`-Gruppe, nicht nur den Ortszeitgenossen-Anlass, der sie auslöste — [20 §1.7](20-Funktionen.md)).** Jede Gruppe bleibt per Default aufgeklappt, KLAPPT SICH aber automatisch ein, sobald ihre Zeilenzahl die Paginierungs-Seitengröße (30, s. o.) überschreitet — der bereits vorhandene Gruppen-Header („RESI (3)") wird dabei selbst zum Klick-/Tap-Ziel (kein zusätzliches Icon nötig, Anzahl bleibt sichtbar = Statistik pro Gruppe ist bereits Teil des bestehenden Headers). Ab drei gleichzeitig eingeklappten Gruppen erscheint EIN „alle aufklappen"/„alle einklappen"-Toggle auf Listenebene (nicht pro Gruppe dupliziert) — reine Erweiterung von `EventsByType.svelte`/`groupByKey` (§6b-Nachbarprinzip, INV-UI-4), keine zweite Gruppierungs-Darstellung.

**Wählbare Gruppierungslogik, nur wo mehrere Gruppierungen fachlich sinnvoll sind.** Eine Liste, für die mehr als eine Gruppierung Sinn ergibt (z. B. Ortszeitgenossen: nach Jahrzehnt · nach Hof · ungruppiert-chronologisch), bekommt einen Umschalter für die Gruppierungsvariante — über den bereits etablierten `ViewModeToggle`-Mechanismus (INV-UI-11 Zuordnungsregel „Alternativansicht-Umschalter"), NICHT über einen neuen View-lokalen Steuerungstyp. Listen mit nur einer sinnvollen Gruppierung (z. B. `SourceDetail`s Referenzen nach Ereignistyp) bekommen KEINEN Umschalter — das Feature ist bedarfsgetrieben, nicht pauschal an jede gruppierte Liste angehängt.

**Filter bleiben `FilterBar`-Sache (Punkt a oben), nicht Teil dieser Komponente.** Eine lange/gruppierte Liste mit eigenen Filterkriterien (z. B. der Ortszeitgenossen-Zeitfenster-Filter) reicht diese über `FilterBar` ein, nicht über einen eigenen Filter-Header — dieselbe Zuordnungsregel wie INV-UI-11.

**c) List-Toolbar-Ownership (Punkt 3).** Eine Liste besitzt ihre gesamte Toolbar (Suche, Sortierung, Gruppieren-Toggle, Filter-Trigger, Bulk-Aktionen wie „Massen-Dedup") in EINER Komponente — `EntityTab.svelte` rendert nie listen-spezifische Aktions-Buttons, nur den Entitäts-Segment-Umschalter. Der „Massen-Dedup"-Button wandert von `EntityTab.svelte` in `PlaceList.svelte`/`HofList.svelte` (Slot-Reihenfolge: Sortierung → Neu-Anlegen → Suche → Gruppieren/Filter → Bulk-Aktionen, rechtsbündig wo sinnvoll).

**d) SourceCitationRow (Punkt 4).** Neue Shell-Komponente `ui/shell/SourceCitationRow.svelte`: EINE `flex-wrap`-Zeile (Quellenname als Link + Seite-Input + QUAY-Dropdown + Notiz-Input + ✕), ersetzt die 3-zeilige Entitäts-Card pro Zitat in `PersonForm.svelte`/`FamilyForm.svelte` (INV-UI-5-Nachrüstung). Quellenname bleibt Klartext/Link, kein `.stb-person-box`-Kartenstil mehr für Zitate (der bleibt Entitäts-Pickern vorbehalten).

**e) Redundanter Hero-Titel (Punkt 5).** `FamilyDetail.svelte`s Titelzeile („Ehemann ⚭ Ehefrau") entfällt als eigene große Zeile; der `DetailHeader` (§6b) trägt stattdessen ein kompaktes Label in der Kopfzeile selbst (kein zweiter, informationsärmerer Titel unter den bereits informativeren Eltern-Boxen).

**f) Leerzustand-Suppression generalisiert (Punkt 6).** Verallgemeinert den bereits akzeptierten Quellen-Widget-Präzedenzfall ([20 §2](20-Funktionen.md)) auf alle Detail-View-Sektionen: eine strukturell **optionale** Sektion (Kinder, Namens-Varianten, „Weitere Ereignisse") rendert bei leerem Inhalt **weder Header noch „Keine X"-Satz** — sie erscheint erst, sobald Inhalt vorhanden ist. Eine strukturell **erwartbare Hauptsektion** (z. B. „Ereignisse" auf `PersonDetail`) behält ihren Header, aber ohne redundante „Keine X erfasst"-Zeile, wenn eine vorhandene Aktions-Affordanz (z. B. „+ Ereignis") die Leere bereits impliziert.

**g) Prosa-als-Dokumentation → Label+Disclosure (Punkt 7).** Dauerhaft sichtbare Erklärsätze über Berechnungsmechanismen (`PlaceDetail`s „Aktuell:"/„Zugehörigkeit nach Jahr:", ADR-v9-75/76) werden zu einem kompakten Label + einer ⓘ-Affordanz (Klick/Tap zeigt die Erklärung in einem Tooltip/Popover, analog Formular-Feldhilfen). Mechanismus-Jargon in Sektionstiteln (z. B. „(Herkunfts-Pillen)") entfällt aus dem sichtbaren Titel, bleibt höchstens als Code-Kommentar.

**h) Eigene-Seite-Redundanz unterdrückt (Punkt 8).** Neue Regel: eine Ereignis-/Referenzzeile auf der Detailseite der Entität X wiederholt niemals X' eigene volle Identitätskette, wenn die Seite selbst bereits X ist — nur abweichende/ergänzende Information wird gezeigt (z. B. `PlaceDetail`s „Ereignisse nach Typ" zeigt Person+Datum, nicht die volle Ortskette, die die Seite selbst schon trägt).

**i) Quellen-Badge-Konvention durchgängig (Punkt 9).** `PlaceDetail.svelte`s „Quellen"-Sektion nutzt `SourceBadge` (dieselbe Komponente wie `PersonDetail`/`FamilyDetail`/`SourceDetail`) statt reinem Text — INV-UI-4.

**j) Hof/Ort-Ereignisgruppierung vereinheitlicht (Punkt 10).** Neue geteilte Komponente `ui/shell/EventsByType.svelte` (oder gleichwertig), von `PlaceDetail.svelte` genutzt. `HofDetail`s „Bewohner (chronologisch)" bekommt eine `role`-Markierung je Zeile (RESI/CENS = „Bewohner", PROP = „Eigentümer") — kein Sektionstitel, der für PROP-Zeilen sachlich falsch ist.

**Nachtrag (2026-07-10, Nutzer-Fund nach erster Umsetzung):** die erste Fassung setzte dafür `EventsByType.svelte` ein und trennte Bewohner/Eigentümer in zwei GRUPPIERTE Sektionen (analog `PlaceDetail`s „Ereignisse nach Typ"). Nutzer-Korrektur: bei einem Hof gehören Bewohner- UND Eigentümerwechsel zu EINER zusammenhängenden Zeiterzählung (wer wohnte wann neben wem, wer besaß den Hof zu welcher Zeit) — getrennte Sektionen reißen das auseinander. Revidiert auf **eine zeitlich integrierte, chronologische Liste** (`HofDetailModel.residents`, nicht mehr gruppiert); Differenzierung nur noch über ein **Format-Merkmal je Zeile** — ein Rollen-Label (`.stb-role-label`, INV-UI-4, geteilt mit `FamilyDetail`s „EHEMANN"/„EHEFRAU" und `PersonDetail`s „EIGENE FAMILIE"/„HERKUNFTSFAMILIE" — drittes unabhängiges Auftreten desselben Musters, jetzt konsolidiert). `EventsByType.svelte` bleibt für `PlaceDetail`/`SourceDetail` weiterhin die richtige Wahl, da deren Ereignistypen unabhängige Kategorien sind, keine gemeinsame Zeiterzählung wie bei Hof-Bewohnern/-Eigentümern.

**k) `addr`/`note`-Duplikat-Beobachtung (Punkt 12, ADR-v9-53).** Vor einem Fix: `core/interop`-Parser-Pfad prüfen, ob `ADDR` und `NOTE` bei GEDCOM-Import systematisch denselben Rohwert erhalten (Einzelfall vs. Muster) — Untersuchung, kein feststehender Fix.

**l) Listen-Metadaten-Badges: EIN Zahlen-Stil, EIN Icon-Indikator, EIN Pill (ADR-v9-79) — konsolidiert drei vormals parallele Ist-Zustände.** Befund: `PersonList`/`FamilyList`/`SourceList` rendern ihre jeweilige Zeilen-Zusatzinfo als drei unabhängige, bare `<span>`-Stile (`.person-list__meta`/`.family-list__meta` gedimmt, `.source-list__refcount` gold); `PlaceList` allein hat für drei strukturell gleiche „Zusatzfakt zur Zeile"-Badges DREI verschiedene Umsetzungen (`.place-list__type-badge` lokal umrandet, `.stb-pill` voll gerundet für die Anreicherungs-Pille, ein randloser Glyph `◎`/`◌` für Koordinaten); `HofList` dupliziert den Koordinaten-Glyph ein zweites Mal unter eigenem Klassennamen. Drei Konsolidierungs-Ziele (Nutzer-Entscheidung 2026-07-13):

1. **Zahlen-Fakten bleiben Text, EIN gemeinsamer Stil — DRITTE, eigene Optik zwischen reinem Text und `.stb-pill` (Nutzer-Nachtrag 2026-07-14).** Reine Zählungen (Kinderzahl `FamilyList`, Referenzzähler `SourceList`, künftige analoge Zählungen) bekommen EINE gemeinsame CSS-Klasse (`.stb-list-stat`, `design-system.css`, ersetzt `.family-list__meta`/`.source-list__refcount`) — kein `.stb-pill` (Zahlen erscheinen auf praktisch jeder Zeile, ein Pill dafür wäre zu viel Dichte, s. Verworfen-Punkt unten), aber auch NICHT bloßer unstilisierter Text: dezenter Hintergrund-Chip (`--stb-surface-2`, kleiner Radius, KEIN Rahmen, engeres Padding als `.stb-pill`) — Nutzer-Fund nach Ansicht des ersten Ergebnisses, reiner Text ging in einer langen Liste optisch unter, schnelles Scannen war nicht möglich. `PersonList`s Geburts-/Sterbejahr-Zeile ist KEIN Zahlen-Fakt in diesem Sinn (biografische Kerninfo, kein Zusatz-Zähler) und bleibt außerhalb dieser Konsolidierung unverändert.
2. **Koordinaten bleiben ein Icon-Indikator, aber EINE Quelle.** Neue geteilte Komponente (o. ä. `ui/shell/CoordIndicator.svelte`, INV-UI-4) ersetzt `.place-list__coord-indicator`/`.hof-list__coord-indicator` — gleicher Glyph (`◎`/`◌`), gleicher Tooltip-Text, EINE Implementierung statt zwei. Bleibt bewusst außerhalb der `.stb-pill`-Familie: ein Paar-Zustand (vorhanden/fehlt), IMMER sichtbar, keine reine Präsenz-Meldung wie die übrigen Badges hier.
3. **Alle übrigen Zusatzfakten werden `.stb-pill`, sichtbar NUR bei Zutreffen.** `PlaceList`s Typ-Badge (`.place-list__type-badge` entfällt, wird `.stb-pill`) plus die drei neuen Präsenz-Badges (📎 Medien `PersonList`, Notizen `SourceList`, Hierarchie `PlaceList` — [20 §1.4/§1.6/§1.7](20-Funktionen.md)). **Polarität bewusst NICHT einheitlich, zwei verschiedene Fragen:** die bestehende Anreicherungs-Pille „ohne Zusatzangaben" (§9.1, [11](11-Orte-Hoefe-Identitaet.md)) markiert einen NEGATIVEN/unvollständigen Zustand als Hinweis (Handlungsaufforderung); die neuen Präsenz-Badges markieren einen POSITIVEN Zustand als Zusatzinfo (kein Gegenstück „ohne Medien"/„ohne Notizen"/„ohne Hierarchie" — das wäre der Regelfall auf den meisten Zeilen, keine Info wert). Beide Pill-Sorten teilen dieselbe `.stb-pill`-Optik, unterscheiden sich nur im AUSGELÖST-Kriterium — kein Widerspruch, zwei unabhängige Fragen an dieselbe Komponente.

**m) Ereigniszeile: EIN klickbarer Ort statt drei getrennter Affordanzen, EINE geteilte Komponente (ADR-v9-80) — `ui/shell/EventLine.svelte`.** Befund: `PersonDetail.svelte`/`FamilyDetail.svelte`s `{#snippet eventRow}` sind byte-identisch dupliziert (dieselbe Drift-Historie wie §6a bereits zweimal unabhängig belegt: `.person-detail__geo-link`/`.family-detail__geo-link` mussten für dieselbe Regel zweimal getrennt gefixt werden) und zeigen pro Zeile mit Orts-/Hof-Bezug DREI getrennte Affordanzen nebeneinander: Text „Karte ↗" (externer OSM-Link), Button „Ort ansehen →"/„Hof ansehen →" (interne Navigation), plus den unverlinkten Orts-/Hof-Namen selbst innerhalb von `ev.summary` (heute EIN vorverknüpfter String `"${date}, ${place}"`, `dateSummary()`). Zwei Korrekturen, EIN Aufwand:
1. **Der Orts-/Hof-Name selbst wird zum Link, „Ort ansehen →"/„Hof ansehen →" entfällt.** Das Zeilen-Modell liefert `dateLabel`/`placeLabel` getrennt statt eines vorverknüpften `summary`-Strings (`fullDateLabel(ev)`/`eventPlaceLabel(ev, ctx)`, beide bereits vorhandene Chokepoint-Helfer, [11 §5](11-Orte-Hoefe-Identitaet.md) — keine neue Kern-Berechnung); die Zeile rendert „Datum, [Ort-Link]" — der Ort-Link navigiert wie bisher zu `PlaceDetail`/`HofDetail` (`goToPlace`/`goToHof`, INV-UI-6-Präzedenzfall). Fehlt `placeId`/`hofId` (unaufgelöster Freitext-Ort), bleibt der Name unverlinkter Text — kein Link ohne Ziel.
2. **Der Karte-Link wird zum geteilten Coord-Icon statt Text-Label.** „Karte ↗" entfällt zugunsten desselben Icons wie die Listen-Ansichten (`CoordIndicator`/`.stb-coord-indicator`, Punkt l/ADR-v9-79) — EIN Icon-Vokabular für „hat Koordinaten" app-weit, ob in einer Liste oder einer Ereigniszeile. Klickverhalten folgt, sobald gebaut, ADR-v9-78 (intern zur Karte-Lens primär, „↗ OpenStreetMap" sekundär) — diese Spec-Stelle ändert nur die Optik, nicht das dort bereits entschiedene Verhalten.
3. **Neue geteilte Komponente `ui/shell/EventLine.svelte`** (o. ä. Name) ersetzt BEIDE `{#snippet eventRow}`-Kopien in `PersonDetail.svelte`/`FamilyDetail.svelte` — INV-UI-4, behebt die Duplikations-Ursache selbst statt nur das aktuelle Symptom; künftige Änderungen an der Ereigniszeile (Label/Value/Addr/Summary/Ort-Link/Coord-Icon/Quellen-Badges) treffen dann automatisch beide Detail-Ansichten statt zwei unabhängige Baustellen zu bleiben.
