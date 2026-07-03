# 02 — Zielarchitektur v9

> Schicht: Meta · gilt für alle anderen Specs · Abhängig von: [01 Vision & Prinzipien](01-Vision-und-Prinzipien.md)

Dieses Dokument legt die **Bauform** des Neuaufsatzes fest. Es ist die Antwort auf die zentrale offene Frage aus der Masterspec: „Vanilla vs. Framework". Ergebnis der Abwägung ist **Ansatz C (Hybrid)** — begründet unten.

---

## 1. Grundentscheidung: Hybrid (Ansatz C)

Drei erwogene Wege:

- **A — Vanilla + native ESM (manuelles Rendering):** kein Build-Step, aber Zustand↔Ansicht von Hand. Trifft genau den v8-Schmerz ([03 Altlast §6](03-Altlasten.md)).
- **B — Framework durchgängig (reaktiv):** löst die Zustandssynchronisation, zahlt aber Overhead bei den imperativen SVG-Diagrammen (der Stärke der App) und führt Build/npm ein.
- **C — Hybrid (gewählt):** framework-freier **Domänenkern** + reaktive **UI-Schale** + imperative **Diagramm-Inseln**.

**Begründung:** Die App zerfällt in ~2 diagrammlastige imperative Ansichten (Sanduhr, Fan/Nachkommen, Karte, Zeitleiste) und Dutzende listen-/formular-/detaillastige Ansichten. Reaktivität hilft der Mehrheit (Listen/Formulare) und schadet der Diagramm-Minderheit. C nimmt Reaktivität, wo sie hilft, und behält imperatives SVG, wo es hilft — bei framework-freiem, roundtrip-kritischem Kern.

**Konsequenz für Leitprinzipien:** ADR-001/002 aus v8 („kein Build-Step, edit-anywhere") gelten **nicht mehr**. Ein Build-Step für die UI ist zulässig. Der Domänenkern bleibt jedoch **build-frei ausführbar** (siehe §4) — damit die Roundtrip-/Unit-Tests wie bisher ohne Toolchain laufen.

---

## 2. Schichtenmodell

```
┌─────────────────────────────────────────────────────────────┐
│  UI-SCHALE (reaktiv, Framework)                             │
│  Listen · Detail-Ansichten · Formulare/Bottom-Sheets ·      │
│  Suche · Filter · Aufgaben/Dashboard · Navigation/ViewState │
│      │  bindet ein ▼                    ▲ ruft auf │         │
│      ▼                                  │           │        │
│  ┌──────────────────────────┐          │           │        │
│  │  IMPERATIVE INSELN        │          │           │        │
│  │  (Vanilla-SVG in Container)│         │           │        │
│  │  Sanduhr · Fan · Nachkommen│         │           │        │
│  │  · Karte · Zeitleiste      │         │           │        │
│  └──────────────────────────┘          │           │        │
├─────────────────────────────────────────┼───────────┼───────┤
│  ANWENDUNGSDIENSTE (framework-frei)     │           │        │
│  Laden/Speichern · Sync · Undo/Redo ·   │           │        │
│  Export-Orchestrierung · Validierung ·  │           │        │
│  Report-Generierung · Config            │           │        │
├─────────────────────────────────────────┴───────────┴───────┤
│  DOMÄNENKERN (framework-frei, DOM-frei, headless testbar)   │
│  Datenmodell (10) · Orte/Höfe + Identitätsauflösung (11) ·  │
│  Forschungsmodell (12) · Parser/Writer/Roundtrip (13)       │
└─────────────────────────────────────────────────────────────┘
```

**Abhängigkeitsrichtung (harte Invariante):**

> **INV-ARCH-1:** Abhängigkeiten zeigen **nur nach unten**. UI-Schale → Anwendungsdienste → Domänenkern. Der Domänenkern importiert **nichts** aus höheren Schichten und referenziert **kein** DOM, kein Framework, keine Web-Plattform-API (kein `window`, `document`, `fetch`, `IndexedDB` im Kern).

Das ist die eine Regel, deren Bruch die v8-Altlasten reproduzieren würde. Sie ist testbar (Lint-Regel/Import-Graph-Check).

---

## 3. Die Kern-↔-Schale-Grenze (Seams)

Die Schnittstelle zwischen reaktiver UI und Kern ist bewusst schmal. Zwei Kategorien:

### 3.1 Lese-Chokepoints (Kern → UI)

Die UI liest den Kern **ausschließlich** über definierte, reine Query-Funktionen — nie über direkte Feldzugriffe auf interne Strukturen. Für Orte/Höfe sind das die vier aus [11 §4](11-Orte-Hoefe-Identitaet.md):

```
eventPlaceId(ev)          → welches Dorf?
eventHofId(ev)            → welcher Hof?
eventCoords(ev)           → welche Koordinaten?
buildPlacForGedcom(ev,y)  → welcher PLAC-String würde geschrieben?
```

Analog für andere Aggregate (Personenliste, Quellenliste …): der Kern liefert **abgeleitete, id-basierte Views**, die UI verteilt sie nur. Diese Chokepoints sind die natürliche Naht — die UI-Schale hängt an ihnen, nicht an der internen Modellform.

### 3.2 Kommandos (UI → Kern)

Mutationen laufen über **Kommando-Funktionen** mit vollständigen Objekten, nicht über verstreute Feld-Setter:

```
savePerson(model)     statt  document.getElementById('pf-given').value lesen
saveEvent(model)
mergePlaces(a, b)
findOrCreateHof(addr, placeId)
```

Jedes Kommando: (1) validiert, (2) mutiert das Modell atomar, (3) invalidiert betroffene abgeleitete Views, (4) meldet „geändert" für Undo/Autosave. **Ein** Invalidierungspfad — nicht das v8-`markChanged(); renderTab()`-Streuselmuster ([03 Altlast §6](03-Altlasten.md)).

### 3.3 Reaktivität endet am Kern

Der Domänenkern hat **keine** Reaktivität (keine Signals, keine Stores). Er ist reine Funktionen + Datenstrukturen. Reaktivität ist ein reines UI-Schale-Konzept: die Schale hält reaktive Referenzen auf Kern-Aggregate und rechnet abgeleitete Ansichten (`derived`) daraus. Ein Kommando → Schale re-liest die Chokepoints → reaktive Views aktualisieren sich.

---

## 4. Build-Freiheit des Kerns (kritisch)

> **INV-ARCH-2:** Der Domänenkern (10–13) und die Anwendungsdienste, soweit DOM-frei, MÜSSEN ohne Bündelung/Framework-Kompilierung ausführbar bleiben — als plain ESM, direkt von einem Test-Runner geladen.

Damit gilt:
- Die Roundtrip-Tests (GEDCOM + GRAMPS) und Unit-Tests laufen **headless ohne Build** (heute `osascript`/JXA; Ziel: `node`/`tsx`/`esbuild --run` oder gleichwertig). Deine wichtigsten Sicherheitsnetze hängen nie an der UI-Toolchain.
- Der Build-Step betrifft **nur** die UI-Schale + imperative Inseln.
- TypeScript ist erlaubt, muss aber so eingesetzt werden, dass der Kern ohne Bündelung testbar bleibt (Transpile-on-the-fly statt Bundle-Zwang).

---

## 5. Imperative Diagramm-Inseln

SVG-lastige Ansichten (Sanduhr, Fan-Chart, Nachkommen, Karte, Zeitleiste) sind **imperative Inseln**:

- Die reaktive Schale rendert nur einen leeren Container (`<div class="tree-host">`) und übergibt ihm Kern-Daten + Callbacks.
- Innerhalb der Insel läuft **framework-freies** JS: Layout rechnen, SVG/Karten aufbauen, Pinch/Drag/Tastatur-Listener, Klick→Rezentrieren (kompletter Neu-Aufbau — kein Fein-Diffing).
- Die Insel ruft nach oben nur über Callbacks/Kommandos (`onSelect(id)`, `onEdit(id)`).

**Warum:** Feinkörnige Reaktivität ist hier wertlos (bei Rezentrierung wird ohnehin alles neu berechnet); ein Framework-Reconciler wäre reiner Overhead. Reports (14) folgen demselben Prinzip: aus dem Modell gerechnet, nie aus dem Live-DOM — damit headless testbar.

---

## 6. Framework-Wahl (Leitplanken, nicht final)

Für die reaktive Schale eignen sich **compile-away-Frameworks mit leichter Escape-Hatch ins Imperative**:

| Kandidat | Eignung | Bemerkung |
|---|---|---|
| **Svelte / Solid** | ✅ empfohlen | winziges Runtime, sauberer Ref-Ausstieg (`bind:this`), reibt sich nicht mit imperativem SVG; Vite-Dev instant |
| **Lit / Web Components** | ⚠️ Kompromiss | fast build-frei, aber gröbere Reaktivität — näher an Ansatz A |
| **React** | ⚠️ eher nicht | schwerer, Reconciler reibt stärker an imperativem SVG/Refs |

Kriterien für die endgültige Wahl: (1) kleines Runtime (Offline-Bundle), (2) sauberer Ausstieg ins imperative DOM für die Inseln, (3) einfacher, schneller Dev-Loop, (4) statisches Build-Ergebnis für GitHub-Pages-Deploy. **Entscheidung offen — 🟡 vor Baubeginn festlegen.**

---

## 7. Verzeichnis-Layout (Vorschlag)

```
/core            ← Domänenkern (framework-frei, DOM-frei, headless testbar)
  /model           Entitäten + Invarianten (Spec 10)
  /places          PlaceObject/HofObject + Identitätsauflösung (Spec 11)
  /research        Aufgaben/Protokoll/Evidenz/Hypothesen (Spec 12)
  /interop         Parser/Writer GEDCOM+GRAMPS, Passthrough, Roundtrip (Spec 13)
/services        ← Anwendungsdienste (framework-frei; Plattform-APIs hier gekapselt)
  storage, sync, undo, export, validation, reports, config
/ui              ← reaktive Schale (Framework)
  /views           Listen, Detail, Formulare, Suche, Dashboard
  /islands         imperative SVG-Inseln (Sanduhr, Fan, Nachkommen, Karte, Zeitleiste)
  /shell           ViewState, Routing, Lifecycle (Spec 21)
/tests           ← headless: Roundtrip, Unit, Snapshot, CSP; Skalierungs-Generator
/app             ← Einstiegspunkt, PWA-Manifest, Service Worker
```

**Grenze der Plattform-APIs:** `window`/`fetch`/`IndexedDB`/`navigator.share`/Graph-API leben **nur** in `/services` (und `/app`). Der Kern bekommt sie bei Bedarf als injizierte Abhängigkeit (z. B. `parseFile(text)` ist rein; das Datei-Lesen macht `/services`). Das hält den Kern headless testbar (INV-ARCH-2).

---

## 8. Migrationshaltung

Der Neuaufsatz ist ein **Rewrite mit Spec als Vorgabe**, keine schrittweise Refaktorierung des v8-Codes. Wiederverwendbar aus v8 sind vor allem *Algorithmen* (Identitätsauflösung, Anonymisierungs-BFS, Layout-Berechnungen, Datums-Normierung) und die *Testdaten/Testfälle* — nicht die Modulstruktur. Die 884 v8-Tests dienen als Verhaltens-Orakel: der neue Kern muss dieselben Roundtrip-Ergebnisse liefern.
