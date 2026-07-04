# 04 — Entscheidungslog (v9-ADRs)

> Schicht: Meta · Pflege via Skill `decision-log`

Chronologisches Log der tragenden Architektur- und Produktentscheidungen des v9-Neuaufsatzes. **Unabhängig** von den v8-ADRs (die in `legacy-v8/ARCHITECTURE.md` stehen). Ein Eintrag wird angelegt, sobald eine Entscheidung fällt, die den Bau bindet oder eine Alternative bewusst verwirft.

**Status-Legende:** ✅ akzeptiert · 🟡 offen/vorläufig · ⛔ verworfen · ♻️ ersetzt durch spätere Entscheidung.

**Eintragsformat:** Kontext (warum die Frage aufkam) · Entscheidung · Konsequenz · verworfene Alternativen · Refs.

---

## ADR-v9-01 — Spezifikationsgetriebener Neuaufsatz ✅ · 2026-07-04
- **Kontext:** v8 evolutionär gewachsen, zunehmende Inkonsistenzen/Altlasten.
- **Entscheidung:** Neuaufsatz auf Basis eines **modularen Spec-Sets** (`specs/v9/`); v8-Code eingefroren als Referenz + Verhaltens-Orakel.
- **Konsequenz:** Arbeit ist spec-first; die Spec gewinnt bei Widerspruch zum Code.
- **Refs:** [00](00-Index.md), [03 Altlasten](03-Altlasten.md).

## ADR-v9-02 — Zielarchitektur „Ansatz C" (Hybrid) ✅ · 2026-07-04
- **Kontext:** Vanilla vs. Framework. v8-Schmerz = manuelle Zustand↔Ansicht-Synchronisation; zugleich starke imperative SVG-Diagramme.
- **Entscheidung:** **framework-freier, DOM-freier Domänenkern** + **reaktive UI-Schale** + **imperative Diagramm-Inseln**. Abhängigkeiten nur nach unten (INV-ARCH-1); Kern build-frei testbar (INV-ARCH-2).
- **Konsequenz:** Reaktivität nur in der Schale; Kern rein/testbar; Diagramme als Inseln.
- **Verworfen:** reines Vanilla (A — trifft den Schmerz nicht), durchgängiges Framework (B — Overhead bei Diagrammen + Build-Zwang für alles).
- **Refs:** [02](02-Zielarchitektur-v9.md).

## ADR-v9-03 — ADR-001/002 (kein Build-Step) für v9 aufgehoben ✅ · 2026-07-04
- **Kontext:** v8 verbot bewusst Build-Step/Toolchain („edit-anywhere").
- **Entscheidung:** Für v9 **nicht mehr bindend**. Build-Step für die UI-Schale erlaubt; der **Kern bleibt build-frei ausführbar** (Tests ohne Bundler).
- **Konsequenz:** ESM/TypeScript/Vite für die UI möglich; Kern-Sicherheitsnetz unabhängig von der UI-Toolchain.
- **Refs:** [02 §1/§4](02-Zielarchitektur-v9.md).

## ADR-v9-04 — Dateihandling radikal vereinfacht ✅ · 2026-07-04
- **Kontext:** v8-Dateihandling (~5 Module, OneDrive Graph API, OAuth, ETag, filemap) war der komplexeste, am wenigsten essenzielle Teil.
- **Entscheidung:** **eine Arbeitskopie (IDB)** + **ein Export-Rohr (N Serializer)** + **FileService mit 2 Save-Tiers** als einzige Plattform-Verzweigung. **Geräte-Sync macht das OS** (Sync-Ordner), nicht die App.
- **Konsequenz:** ~5 Module → ein `FileService` + Kern-Serializer; LP-2 bleibt.
- **Verworfen:** app-verwaltete Cloud als Pflicht (nur noch optionaler Adapter hinter derselben Schnittstelle).
- **Refs:** [14](14-Dateihandling.md), [03 §9](03-Altlasten.md).

## ADR-v9-05 — Navigations-Rollenmodell + form-faktor-eigenständiges UI ✅ · 2026-07-04
- **Kontext:** v8-Navigation inkonsistent (6 Slots für ~11 Ziele, versteckte Sub-Modi, Desktop = Mobile + Spalten).
- **Entscheidung:** drei Rollen (Entitäten / Ansichten-Lenses / Arbeitsflächen). **Mobile:** Bottom-Nav `Baum · Personen · Suche · Aufgaben · Mehr` + Entitäts-Segment. **Desktop:** beschriftete Sidebar + Multi-Pane + Command-Palette (⌘K). Ein einheitlicher Lens-Umschalter.
- **Konsequenz:** ein kanonischer Weg je Ziel; Diagramm-Toggle-Glyphen entfallen.
- **Refs:** [21](21-UI-UX.md), [03 §10](03-Altlasten.md).

## ADR-v9-06 — Testframework Vitest-basiert, Kontrakt-Matrix ✅ · 2026-07-04
- **Kontext:** Tests als ausführbares Spec-Orakel; v8-JXA-Fallen vermeiden.
- **Entscheidung:** **Vitest** (Node, headless, build-frei) + fast-check + Testing-Library/happy-dom + optional Playwright. **Kontrakt-Matrix** bindet jede Invariante an eine Testart (TST-2). Fixtures = v8-Echtdateien als Regressions-Orakel.
- **Konsequenz:** JXA-Fallen entfallen; Pre-Commit = schneller Kern-Subset, CI = alle Ebenen.
- **Refs:** [32](32-Testframework.md).

## ADR-v9-07 — Entwicklungsumgebung: Claude-Desktop-App als Ein-Fenster ✅ · 2026-07-04
- **Kontext:** Nutzer dirigiert den Agenten, codet nicht selbst, will **eine** Umgebung für alle Rollen.
- **Entscheidung:** **Claude-Desktop-App** (Code-Tab: Chat/Diff/Preview/Terminal/File/Tasks) als Ein-Fenster-Umgebung + **GitHub** (Quelle/Review/CI) + **GitHub Actions** (Test/Build/Deploy). Liest `CLAUDE.md` + `.claude/skills/` automatisch (verifiziert).
- **Konsequenz:** keine separate IDE nötig; Repo lokal, nicht iCloud (INV-DEV-1).
- **Verworfen:** VS Code als Cockpit (Editor-Wert ungenutzt); **Cursor als vierte Säule** (redundanter zweiter KI-Agent, zweites Regelsystem → Drift statt Konsistenz; nur sinnvoll, wenn selbst gecodet wird).
- **Refs:** [31](31-Dev-Umgebung.md).

## ADR-v9-08 — Repo außerhalb von iCloud ✅ · 2026-07-04
- **Kontext:** v8 lag in iCloud Drive → File-I/O-Falle; Build-Projekte + `node_modules` vertragen sich nicht mit Datei-Sync-Diensten.
- **Entscheidung:** **INV-DEV-1** — v9-Repo lokal (`~/dev/stammbaum-v9`), nur GitHub als „Wolke".
- **Refs:** [31 §1](31-Dev-Umgebung.md).

## ADR-v9-09 — UI-Framework: Svelte 5 + Vite ✅ · 2026-07-04
- **Kontext:** Ansatz C braucht ein reaktives Schale-Framework mit leichter Escape-Hatch ins Imperative.
- **Entscheidung:** **Svelte 5 + Vite** (Komponenten-Bibliothek, **kein** SvelteKit — statischer Build, kein Server). Runes (`$state`/`$derived`) für die Schale; `bind:this`/`$effect` als Ausstieg in die imperativen SVG-Inseln.
- **Konsequenz:** UI-Test-Tooling = `@testing-library/svelte` + happy-dom ([32 §3](32-Testframework.md)); Vite-Build → dist/ nach GitHub Pages ([31](31-Dev-Umgebung.md)). Node.js als einmalige Voraussetzung.
- **Verworfen:** Solid (kleineres Ökosystem, JSX dichter für Review), Lit (gröbere Reaktivität → näher am manuellen v8-Schmerz), React (schwerer + Reconciler-Reibung mit imperativem SVG). Setup/Kosten waren kein Unterscheidungsmerkmal (alle gratis, alle nur Node).
- **Refs:** [02 §6](02-Zielarchitektur-v9.md).

## ADR-v9-10 — INV-ARCH-1-Gate: eigenes Node-Skript statt eslint-plugin-boundaries ✅ · 2026-07-04
- **Kontext:** Baubeginn, Projekt-Skelett in `~/dev/stammbaum-v9` angelegt ([31 §2](31-Dev-Umgebung.md)). INV-ARCH-1 (Kern importiert nichts von oben, keine DOM-/Plattform-API im Kern) braucht ein CI-Gate; [32 §3](32-Testframework.md) nennt beispielhaft `eslint-plugin-boundaries`/`dependency-cruiser`.
- **Entscheidung:** Gate als schlankes eigenes Skript `tests/arch-boundary/check-arch-boundary.mjs` (regex-basiert: verbotene Imports aus `../services|../ui|../app|svelte|vite`, verbotene Globals `window`/`document`/`fetch`/`indexedDB`/`localStorage`/`navigator`), verdrahtet als `npm run check:arch`.
- **Konsequenz:** Keine zusätzliche ESLint-Flat-Config-Ebene für Boundary-Regeln beim Skelett-Aufbau; das Skript deckt exakt die zwei verbotenen Muster ab, läuft ohne zusätzliche Abhängigkeit, ist in CI (`ci.yml`) vor `lint`/`test` verdrahtet.
- **Verworfen:** `eslint-plugin-boundaries`/`dependency-cruiser` — mehr Konfigurationsfläche als der Zweck erfordert (Vereinfachen vor Erfinden). Bleibt Option, falls das Regex-Skript an Grenzfällen scheitert (dynamische Imports, Re-Exports) — dann Wechsel + neuer ADR-Eintrag.
- **Refs:** [02 §2](02-Zielarchitektur-v9.md), [32 §3](32-Testframework.md).

## ADR-v9-11 — Deterministische, injizierte ID-Vergabe im Domänenkern ✅ · 2026-07-04
- **Kontext:** Kern-Baubeginn `core/model` (Spec 10). Neue Entitäten brauchen GEDCOM-konforme IDs (`@Ixx@`/`@Fxx@`/`@Sxx@`/`@Rxx@`/`@Nxx@`). Eine ID-Quelle im Kern darf weder Zufall noch Wall-Clock lesen (TST-3, INV-ARCH-1).
- **Entscheidung:** Fortlaufender Zähler je Präfix (I/F/S/R/N), gekapselt in einem `IdAllocator`. `nextId(alloc, prefix)` vergibt fortlaufend; `allocatorFromDatabase(db)` leitet den kollisionsfreien Startzustand aus vorhandenen IDs ab (höchste belegte Nummer je Präfix + 1). Der Allocator wird von außen gehalten/injiziert, nicht global im Kern erzeugt.
- **Konsequenz:** ID-Sequenzen sind test-reproduzierbar (gleicher Startzustand → gleiche Sequenz); die einzige Nichtdeterminismus-Quelle (Startzustand) ist explizit und injizierbar. Deckt sich mit dem injizierten Takt für `CHAN/DATE` ([32 §5](32-Testframework.md)).
- **Verworfen:** `crypto.randomUUID`/`Math.random` (verletzt TST-3 — Zufall im Kern) und Wall-Clock-basierte IDs (verletzt INV-ARCH-1 — Plattform-/Uhr-Referenz im Kern). Nicht-GEDCOM-Handles bleiben Roundtrip-Fidelity-Feldern vorbehalten (z. B. `grampsHandle`), sind aber keine Primär-IDs.
- **Refs:** [10 §1](10-Domaenenmodell.md), [32 §5](32-Testframework.md), [02 §2/§4](02-Zielarchitektur-v9.md).

## ADR-v9-12 — Eine autoritative QUAY-Ableitung im Kern (`evalToQuay`) ✅ · 2026-07-04
- **Kontext:** Kern-Baubeginn `core/research` (Spec 12). Spec 12 §3 definiert die verbindliche QUAY-*Vorschlagsregel* aus dem 3-Achsen-Evidenzmodell (`original+primary`→3, `negative`→0, `authored/undetermined/indirect`→1, sonst 2). Das Skelett hatte in `core/model/citation.ts` bereits ein zweites, score-basiertes `suggestQuayFromEval` mit abweichenden Werten (z. B. `authored`→0 statt →1) — zwei divergierende QUAY-Regeln in einem Kern.
- **Entscheidung:** Genau **eine** autoritative Regel: `evalToQuay(ev)` in `core/research/eval.ts` (Spec 12 §3, geordnete Regel — erste Übereinstimmung gewinnt: negative → original+primary → 1-Klasse → 2). `suggestQuayFromEval` (Spec 10, INV-C2) delegiert an `evalToQuay`. Beide bleiben rein informativ und setzen QUAY nie automatisch (INV-C2). Die Forschungstypen (`ResearchTask`/`LogEntry`/`Hypothesis`) ersetzen die `unknown[]`-Platzhalter an `Person`/`Family`; `EvidenceEval` erhält das optionale `informant`-Feld (`_INFM`, Spec 12 §3). Alle Nichtdeterminismus-Quellen (`created`/`date`) werden injiziert (TST-3).
- **Konsequenz:** Keine Doppel-Wahrheit bei der QUAY-Ableitung; die Regel lebt an einer Stelle (Spec-12-Territorium), das Modell verweist darauf. Zitat-QUAY (Quellqualität) und Hypothesen-`weight` (Forscher-Konfidenz) bleiben strukturell getrennt (INV-H1); Hypothesen-Evidenz ist reine SID-Referenz ohne Zitatkörper (INV-H2). Modell→Forschung-Import folgt dem Abhängigkeitspfeil 10→12.
- **Verworfen:** Zwei parallele QUAY-Heuristiken (score-basiert + Spec-Regel) nebeneinander stehen lassen — bewusst verworfen (Doppel-Wahrheit, Drift-Risiko; „Vereinfachen vor Erfinden"). Ein eigener Zitatkörper an der Hypothese (Zwei-Schichten-Evidenz / Alternativ-Baum) — verworfen, bräche Roundtrip-Treue (Spec 12 §4, INV-H2).
- **Refs:** [12 §3/§4](12-Forschungsdaten.md), [10 §5.3](10-Domaenenmodell.md), [32 §6](32-Testframework.md).

## ADR-v9-13 — Orts-/Hof-Auflösung als zustandslose reine Funktion mit Bootstrap-Rückgabe ✅ · 2026-07-04
- **Kontext:** Kern-Baubeginn `core/places` (Spec 11). Die v8-Auflösung (`_link`/`_placeLink`/`_tryHof*`) war stateful: sie mutierte `AppState.db.hofObjects` direkt und hing an lazy-gecachten Registries (`UIState._placeRegistry`/`_hofRegistry`). Spec 11 §4.1 verlangt jedoch eine **reine, totale, deterministische Funktion** `(events, placeObjects, hofObjects) → (placeId, hofId, …)` als Property-Test-Naht. Der Konflikt: die Bootstrap-Pfade (C, B') **erzeugen** Höfe — das ist ein Seiteneffekt.
- **Entscheidung:** `resolveEvents(events, places, hofObjects)` gibt eine **Arbeitskopie** der `hofObjects` (inkl. gebootstrappter Höfe) und die aufgelösten Event-Kopien als Ergebnis zurück, statt die Eingabe zu mutieren. Registries (`makePlaceRegistry`/`makeHofRegistry`) sind reine `context → registry`-Funktionen ohne Zustand. `findOrCreateHof` gibt einen neu zu erzeugenden `HofObject` als `created` zurück (mutiert die Sammlung nicht selbst). INV-PLACE (Reprojektion) ist in `resolveOne` strukturell verankert: **jeder** Rückgabepfad läuft durch denselben `reproject()`-Wrapper — es gibt keinen Pfad ohne Reprojektion, Stale-Cache ist ausgeschlossen. Die vier Chokepoints (`eventPlaceId`/`eventHofId`/`eventCoords`/`buildPlacForGedcom`) sind die einzige Lese-Naht.
- **Konsequenz:** Die Auflösung ist direkt property-testbar (gleiche Eingabe → gleiche Ausgabe, fast-check über 300 Läufe grün), reihenfolgestabil und idempotent (Re-Auflösung des Ergebnisses legt keine neuen Höfe an). Der Aufrufer (UI-Schale / Load-Pfad, Spec 14/21) übernimmt die zurückgegebene `hofObjects`-Sammlung und persistiert sie (`orte.json`, Spec 30) — die Persistenz-Entscheidung liegt außerhalb des reinen Kerns. Die *Algorithmen* aus v8 (Konvention-α-Extract, Read-Tolerance, `resolveAddrAsOf`, deterministischer HofId-Slug) sind wiederverwendet; die **drei-Speicher-/Cache-Struktur** wurde bewusst nicht übernommen (Altlast). Verwaltungs-Match (PLAC=Dorf) und Hof-Link (ADDR=Hof) sind orthogonal: Schritt 3 verankert das Dorf, ohne zurückzukehren, wenn eine explizite `ADDR` vorliegt — der Hof läuft danach über Pfad B/B' (spiegelt v8 `_placeLink` ohne `return`, dann `_tryHofAddrLink`).
- **Verworfen:** In-Place-Mutation der `hofObjects`-Map wie in v8 (verletzt die Reinheit / Property-Naht, Spec 11 §4.1). Persistenz der Auflösungs-Ergebnisse (`placeId`/`hofId`) als Sidecar/Custom-Tags — verworfen: Re-Derivation *ist* die Persistenz (LP-5, Spec 11 §4.1), `event.placeId`/`hofId` bleiben runtime-only. Per-Event-Override-Annotation für unauflösbare Fälle — verworfen (widerspräche dem Determinismus, Spec 11 §6); Ungewissheit bleibt dauerhaft im Review (Klassen A/C/D).
- **Refs:** [11 §3/§4/§5/§6](11-Orte-Hoefe-Identitaet.md), [32 §5/§6](32-Testframework.md), [02 §2](02-Zielarchitektur-v9.md).

## ADR-v9-14 — Interop-Roundtrip über einen struktur-erhaltenden Passthrough-Baum (Fidelity-Backbone) ✅ · 2026-07-04
- **Kontext:** Kern-Baubeginn `core/interop` (Spec 13). Kernversprechen ist der byte-treue Roundtrip: `MeineDaten_ancestris.ged` (83k Z., 2795 INDI-Records) → `net_delta=0` + `out1===out2`; `Unsere Familie.gramps` (5,7 MB XML) → `xml1===xml2`. Die naheliegende, aber falsche Route wäre ein *modell-rekonstruktiver* Writer (jedes Feld aus dem Domänenmodell an kanonischer Position neu erzeugen) — der driftet unvermeidlich byte-weise von der Quelle ab (Feld-Reihenfolge, unmodellierte Tags, Formatnuancen) und reproduziert die 10 v8-Ad-hoc-Passthrough-Kontexte als neue Altlast ([03 §4](03-Altlasten.md)).
- **Entscheidung:** Der Parser baut einen **generischen Zeilenbaum** `{level, xref, tag, value, children[]}` (GEDCOM, `gedcom-tree.ts`) bzw. einen **struktur-erhaltenden XML-Baum** (GRAMPS, `xml-tree.ts`). Dieser Baum ist die **einzige Quelle der Roundtrip-Treue** (INV-PT); das Domänenmodell ([10](10-Domaenenmodell.md)) ist eine **Projektion** aus dem Baum, die nur dem Editieren dient. Der Writer serialisiert bei nicht-mutierendem Speichern **primär den Baum** — der HEAD ist die einzige kontrollierte Ausnahme (verbatim aus `header.raw`, `1 DATE`/`2 TIME` nur über die injizierte Clock bei echtem Speichern, TST-3). GED7-/Strict-Export sind reine Baum-Adapter (`transformGed7`/`stripStrict`); Anonymisierung ist ein reiner Baum-Filter mit injiziertem Bezugsjahr. Der GRAMPS-Test-Seam (`parseXMLText`/`buildXMLText`, [13 §6](13-Interop-Roundtrip.md)) ist synchron und gzip-/Blob-frei (die Plattform-Randschicht legt gzip später darum).
- **Konsequenz:** `net_delta=0` und `out1===out2`/`xml1===xml2` entstehen **strukturell** — die geparste Struktur wird beim nicht-mutierenden Roundtrip exakt wiedergegeben (für die GEDCOM-Orakel-Datei: logische Zeilen der Ausgabe == logische Zeilen der Quelle, Position für Position). Ein **einziger** INV-PT-Mechanismus ersetzt die zehn v8-Kontexte; jeder unbekannte Tag/jedes unbekannte Element überlebt in Reihenfolge und Tiefe, ohne eigene Sonderbehandlung. Modellierte `_`-Tags werden nicht doppelt geschrieben, weil der Baum die einzige Schreibquelle ist (keine zweite kanonische Ausgabestelle). Kein Datenverlust bei GRAMPS trotz Whitespace-Normierung (Element-/Attribut-/Textparität geprüft; Ziel ist Writer-Idempotenz, nicht Byte-Gleichheit zur Quelle — Register `DEV-03`).
- **Verworfen:** Modell-rekonstruktiver Writer als Primärpfad (Byte-Drift, Altlast-Reproduktion) — bewusst verworfen. Ein echter DOM/`DOMParser` für GRAMPS (verletzt INV-ARCH-1: DOM-frei im Kern) — verworfen zugunsten eines dependency-freien String-XML-Parsers. **Offen (bewusst, App-Schritt):** das Zurückprojizieren *editierter* Modellfelder an ihre kanonische Baumposition ([13 §2.1](13-Interop-Roundtrip.md), 2. Halbsatz) — das ist ein Editier-Pfad, kein Roundtrip-Pfad; bis dahin ist der Kern-Roundtrip vollständig verlustfrei.
- **Refs:** [13 §2/§3/§4/§5/§6/§7](13-Interop-Roundtrip.md), [10 §5](10-Domaenenmodell.md), [11 §5](11-Orte-Hoefe-Identitaet.md), [32 §4/§5/§6/§9](32-Testframework.md), [02 §2](02-Zielarchitektur-v9.md).

## ADR-v9-15 — FileService: fünf schmale Adapter-Interfaces statt eines Plattform-Blocks; kein `fake-indexeddb` ✅ · 2026-07-04
- **Kontext:** Baubeginn `services/file` (Spec 14). Die Tier-Auswahl-Logik (INV-FILE-3) und die Arbeitskopie-Verwaltung (INV-FILE-1) müssen headless mit gemockten Adaptern testbar sein (Spec 32 §5), ohne dass Tests je eine echte Plattform-API (IndexedDB, File System Access API, `navigator.share`, `<a download>`) berühren.
- **Entscheidung:** `services/file/types.ts` definiert fünf schmale Interfaces (`WorkingCopyStore`, `PickerAdapter`, `FsHandleAdapter`, `ShareAdapter`, `DownloadAdapter`), die `FileService` injiziert bekommt (`FileServiceAdapters`-Bündel). `FileService` selbst (`file-service.ts`) enthält ausschließlich Orchestrierung/Tier-Auswahl, keine Plattform-Referenz. Tests mocken die Interfaces mit einfachen In-Memory-Fakes (`tests/services/mock-adapters.ts`) — **kein** `fake-indexeddb` als Dev-Dependency, weil die zu prüfende Logik (Tier-Wahl, Arbeitskopie-Ersetzung) nicht von echter IndexedDB-Transaktionssemantik abhängt; ein `load/save/clear`-Interface genügt (Vereinfachen vor Erfinden). Die reale IndexedDB-Implementierung (`idb-working-copy-store.ts`) nutzt einen Object-Store mit festem Key `"current"` — erzwingt INV-FILE-1 strukturell, nicht nur per Konvention. Das Export-Rohr (`export-pipe.ts`) führt alle vier Formate (`gedcom-5.5.1`/`gedcom-strict`/`gedcom-7.0`/`gramps`) durch dieselbe `FileService.exportToFile()` (INV-FILE-2); die GRAMPS-Gzip-Hülle hängt selbst hinter einem injizierbaren `GzipAdapter`, damit `core/interop` nie `CompressionStream`/DOM berührt.
- **Konsequenz:** INV-FILE-1/2/3 sind je durch benannte Tests mit gemockten Adaptern verriegelt (4+6+7 = 18 Tests, `tests/services/file-service.test.ts` + `export-pipe.test.ts`); keine Test-Assertion ruft eine ungemockte Plattform-API auf. Neue Tiers (z. B. ein optionaler Cloud-Adapter, Spec 14 §5) lassen sich als sechstes schmales Interface ergänzen, ohne bestehende Adapter-Verträge zu ändern.
- **Verworfen:** `fake-indexeddb`-Dev-Dependency (unnötige Komplexität für das, was tatsächlich geprüft werden muss). Ein einziges großes `PlatformAdapter`-Interface statt fünf schmaler — verworfen, weil es die Tier-Auswahl-Logik unnötig koppeln und gezieltes Mocken erschweren würde.
- **Refs:** [14 §3/§4](14-Dateihandling.md), [32 §5/§6](32-Testframework.md), [02 §7](02-Zielarchitektur-v9.md).
