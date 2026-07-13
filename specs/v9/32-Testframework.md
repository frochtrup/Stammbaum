# 32 — Testframework

> Schicht: Betrieb (querschnittlich) · Abhängig von: [02 Zielarchitektur](02-Zielarchitektur-v9.md), [30 NFR](30-NFR-und-Persistenz.md), [31 Dev-Umgebung](31-Dev-Umgebung.md) · prüft die Invarianten aller Kern-Specs

Tests sind in einem spezifikationsgetriebenen Prozess das **ausführbare Spec-Orakel**: jede `INV-…` und jedes `LP-…` ist durch mindestens einen Test abgesichert. Die v8-Suite (884 Unit-Tests + Roundtrip auf 83k-Zeilen-Produktionsdatei) wird zum **Regressions-Orakel** des neuen Kerns ([02 §8](02-Zielarchitektur-v9.md)).

---

## 1. Prinzipien

- **TST-1 — Kern-Tests sind build-frei & headless.** Roundtrip-, Unit-, Snapshot-, Property-Tests laufen ohne Bundler, ohne Browser, ohne Nutzer (Node/Vitest). Erfüllt [02 INV-ARCH-2](02-Zielarchitektur-v9.md) + [30 NFR-6](30-NFR-und-Persistenz.md): das wichtigste Sicherheitsnetz (Roundtrip, LP-1) hängt **nie** an der UI-Toolchain.
- **TST-2 — Jede Invariante hat einen Test.** Kein `INV-…`/`LP-…` ohne zugehörigen, benannten Test ([§6 Kontrakt-Matrix](#6-test-kontrakte-je-subsystem)).
- **TST-3 — Determinismus by design.** Kein Zugriff auf Wall-Clock/Zufall/Plattform im Kern; alle Nichtdeterminismus-Quellen werden injiziert ([§5](#5-determinismus--seams)).
- **TST-4 — Jeder Bug wird zum Test.** Ein reproduzierter Fehler bekommt zuerst einen roten Test, dann den Fix (Regressions-Verriegelung — die v8-Praxis).
- **TST-5 — Testpyramide.** Viele schnelle Kern-Unit-Tests, wenige Komponenten-Tests, minimale E2E. Nicht umgekehrt.
- **TST-6 — Das Orakel ist eng.** Die v8-Suite verbürgt **Datenerhalt** (Roundtrip, `net_delta=0`) — **nicht** v8-Verhalten, -Modell oder -UI. Bei Konflikt zwischen Orakel und Spec-Invariante **gewinnt die Spec**; jede bewusste Abweichung vom Orakel ist registriert ([§9](#9-orakel-disziplin--v8-abweichungs-register)). **Zweischneidiges Schwert bei Feature-Umfang (Nutzer-Klarstellung 2026-07-05):** ist ein Spec-Bullet knapper formuliert als das zugehörige Oracle-Feature, ist WEDER „automatisch das ganze Oracle-Verhalten nachbauen" (reproduziert genau die evolutionär gewachsene Form, die der Neuaufsatz auflösen soll) NOCH „alles Nicht-Erwähnte automatisch als außer Scope behandeln" (verliert stillschweigend genealogisch relevante Information, s. ADR-v9-23/24/27) die richtige Standard-Reaktion. Richtig: die Diskrepanz **explizit im Abschlussbericht benennen** (Umfang bewusst eingegrenzt, Grund nennen) statt sie stillschweigend in die eine oder andere Richtung aufzulösen — die Entscheidung bleibt beim Menschen/der Spec-Pflege, nicht beim Bauagenten.
- **TST-7 — Kapazität/Überlauf ist Teil des Tests, nicht nur der Happy-Path.** Jede Mehrfach-Element-Darstellung (Listen, Chips, Kandidaten, Zeilen mit variabler Anzahl) wird zusätzlich zum 1-3-Element-Fall mit überdurchschnittlich vielen bzw. dicht beieinanderliegenden Elementen verifiziert — sowohl als Unit-Test der Layout-/Modell-Funktion (Grenzfälle, Determinismus) als auch in der Pflicht-Browser-Verifikation. **Lehre (2026-07-05):** Sanduhr-Geschwisterzeile und Zeitleiste-Swim-Lane liefen beide erst bei explizit angeforderten Stresstests (10 Geschwister, 5 Personen) sichtbar über — die anfängliche Browser-Verifikation mit 1-3 gut verteilten Elementen hatte das nicht gefangen.
- **TST-8 — Persistenz-Rundlauf ist Pflicht bei jedem Save-/Update-Kommando.** Ein neues oder geändertes Kommando, das Zustand persistieren soll (App-State-Kommandos, Services-Schreibpfade), wird mit „speichern → neu laden → Zustand noch vorhanden" verifiziert — nicht nur mit „kein Fehler beim Speichern". **Lehre (2026-07-05):** `savePlace`/`saveHof` schrieben nie in den `orte.json`/IDB-Speicher zurück — unentdeckt, bis ein Bauabschnitt zufällig einen vollen Speichern-neu-laden-Zyklus prüfte; frühere Bauabschnitte, die dieselben Kommandos nutzten, hatten das nie getestet.
- **TST-9 — Feld-Vollständigkeit bei Editier-Formularen.** Vor „fertig" jedes Feld des editierten Domänenmodell-Typs (`core/model/types.ts`) durchgehen: entweder im Formular abgedeckt ODER bewusst ausgeschlossen (kurzer Kommentar, warum) — kein stilles Weglassen. **Lehre (2026-07-06/07):** `EditableEvent` in `PersonForm.svelte`/`FamilyForm.svelte` hatte anfangs gar kein Feld für `Event.value` — ein generisches Ereignis (z. B. `OCCU`/Beruf) ließ sich anlegen, der eigentliche Wert (der Beruf selbst) war aber nirgends eintragbar. Fiel erst nach mehreren Nutzer-Feedback-Runden auf, nicht beim ersten Bau oder der ersten Browser-Verifikation.
- **TST-10 — `untrack()` bei `$state`-Initialisierung aus Props.** Formular-Zustand, der nur beim Mount aus einem übergebenen Objekt gelesen wird, IMMER als `$state(untrack(() => model.field))`, nie `$state(model.field)` direkt — sonst meldet Svelte `state_referenced_locally` (Zustand synct sonst fälschlich bei jedem Prop-Wechsel mit statt nur einmal beim Mount zu lesen). **Lehre (2026-07-06/07):** `SourceForm.svelte`/`RepositoryForm.svelte` wurden zunächst ohne `untrack()` gebaut (`PersonForm.svelte`/`FamilyForm.svelte` als Vorbild hatten es bereits, wurde beim Bau der neuen Formulare aber nicht übertragen) — Compiler-Warnings bei jedem Testlauf, nachträglich korrigiert.
- **TST-11 — Layout-Verifikation auf der tatsächlichen Ziel-Breite, nicht nur Desktop.** Ein `flex-wrap`-Layout, das auf der primären mobilen Zielbreite ([21 §2](21-UI-UX.md), 375px) kompakt bleiben soll, wird explizit bei dieser Breite verifiziert (`mcp__Claude_Browser__resize_window(preset: "mobile")`) — eine Desktop-Verifikation (typische Vorschaubreite ≥ 800px) deckt Umbrüche nicht auf, die erst bei 375px auftreten. **Lehre (2026-07-06):** Die erste Umsetzung der Datums-Struktureingabe (Qualifier+Tag/Monat/Jahr in einer Zeile, ADR-v9-30) wurde nur am Desktop-Viewport verifiziert und bestätigt — brach aber auf 375px weiterhin auf zwei Zeilen um (Qualifier-`<select>`/Monat-Feld ohne Breitenbegrenzung), was erst ein nachträglicher Nutzer-Screenshot vom Mobilgerät aufdeckte.
- **TST-12 — `<select bind:value>` ist unter happy-dom nicht zuverlässig testbar; strukturell per Lint-Gate erzwungen, nicht nur dokumentiert.** happy-dom reflektiert `:checked` auf `<option>` nach einem `fireEvent.change` nicht zuverlässig zurück in Svelte 5s kompiliertes `bind:value` — der gebundene Wert bleibt beim nächsten Lesen (z. B. ein Speichern-Klick direkt danach) veraltet, ohne Compile-Fehler. Ersatzmuster: `value={x} onchange={(e) => (x = e.currentTarget.value)}`. **Lehre (2026-07-05, wiederholt 2026-07-07):** einmal projektweit gefunden und in 7 Stellen behoben — tauchte in der Task/Log/Hypothesis-Bau-Session (ADR-v9-37) in 7 NEUEN Stellen wieder auf (inkl. eines eigenen Zusatzes), weil die Lehre nur in Code-Kommentaren stand, nicht strukturell erzwungen war; erst beim Schreiben der Komponenten-Tests durch zwei fehlschlagende Assertions entdeckt, nicht durch Code-Lesen. **Deshalb — anders als TST-9/10/11 — zusätzlich als ESLint-Regel `no-restricted-syntax` in `eslint.config.js` verankert** (Selector `SvelteElement[name.name="select"] SvelteDirective[kind="Binding"]:has(SvelteDirectiveKey[name.name="value"])`): ein Verstoß ist jetzt ein Lint-Fehler (`npm run lint`/CI-Gate), keine Bauagenten-Erinnerung mehr nötig. Dieser Eintrag bleibt trotzdem stehen, damit das WARUM nachvollziehbar ist, falls die Regel je gelockert werden soll.
- **TST-13 — Löschen/Leeren einer Struktur per Reload verifizieren, nicht nur an der reaktiven Live-Ansicht.** Ein UI-Zustand, der ein Feld/Ereignis „entfernt" aussehen lässt (z. B. weil eine Anzeige-Filterfunktion einen leeren Eintrag herausrechnet), muss nicht bedeuten, dass die zugrunde liegende Struktur wirklich aus dem Modell entfernt wurde — ohne vollen Reload bleibt das unsichtbar. **Lehre (2026-07-12):** ein testweise angelegtes, dann wieder geleertes generisches Ereignis (Beruf/Wohnort) verschwand augenscheinlich aus `PersonDetail`, weil die Projektion (`toEventRow`) leere Einträge herausfilterte — blieb aber als leerer `events[]`-Eintrag dauerhaft in der Datenbank hängen (kein Löschmechanismus vorhanden). Erst ein echter Seiten-Reload (nicht nur die reaktive Neuberechnung nach dem Speichern) deckte das auf. Konsequenz: JEDE „X ist jetzt entfernt/geleert/zurückgesetzt"-Behauptung in der eigenen Verifikation braucht einen Reload-Schritt, bevor sie als bestätigt gilt — dieselbe Disziplin wie TST-8 (Persistenz-Rundlauf), hier auf die Kehrseite (Entfernen statt Anlegen) angewendet. Strukturelle Konsequenz aus demselben Fund: jede UI-Aktion, die eine wiederholbare Kindstruktur (Ereignis, Zitat, …) per Pill/Menü frisch anlegt, MUSS einen Weg bieten, einen noch leeren, ungewollt angelegten Eintrag wieder zu entfernen (✕-Control, solange die Struktur leer ist, [21 INV-UI-10](21-UI-UX.md)) — sonst akkumulieren sich unsichtbare verwaiste Datensätze bei jedem Ausprobieren/Abbrechen.
- **TST-14 — Anzeige-Vollständigkeit: erfassbar ≠ sichtbar, beide Richtungen einzeln verifizieren.** Ein Feld/Attribut, das der Editor korrekt entgegennimmt und roundtrip-sicher speichert (TST-9 grün, Editor selbst vollständig), ist damit NICHT automatisch auch in irgendeiner Lese-Ansicht sichtbar — Editor-Vollständigkeit (TST-9: „kann der Nutzer es eingeben") und Anzeige-Vollständigkeit (TST-14: „sieht der Nutzer es danach je wieder") sind zwei unabhängige Kontrakte. TST-9 allein fängt eine Lücke auf DIESER Seite nicht. **Lehre (2026-07-12, ADR-v9-64):** `EventEditModal` erfasste Datums-Qualifier (`ABT`/`CAL`/`EST`/`BEF`/`AFT`/`BET`/`FROM`) UND Tag/Monat bereits vollständig und TST-9-konform — die primäre Lese-Ansicht (`PersonDetail`/`FamilyDetail`s eigene Ereigniszeilen) zeigte davon aber ausschließlich die nackte Jahreszahl, der Rest verschwand spurlos. Kein Datenverlust (Speicherung/Roundtrip korrekt) — aber für den Nutzer von echtem Datenverlust nicht unterscheidbar, weil unsichtbar ist unsichtbar. Erst eine gezielte Nutzer-Rückfrage nach dem bereits abgeschlossenen Feature deckte auf, dass TST-9 allein diese Bug-Klasse strukturell nicht abdeckt. **Konsequenz:** bei jedem neuen/erweiterten Editor-Feld zusätzlich zu TST-9 explizit verifizieren, WO (welche Lese-Ansicht(en)) der eingegebene Wert tatsächlich angezeigt wird — ein Feld ohne jede Lese-Oberfläche ist entweder ein Bug oder bewusst ein reines Backend-/Export-Feld (dann kurz kommentieren, warum, analog TST-9s Ausschluss-Pflicht).
- **TST-15 — Barrierefreiheits-Gate (LP-8), automatisiert wo möglich.** [01 LP-8](01-Vision-und-Prinzipien.md)/[21 §6i](21-UI-UX.md) sind ein Kontrakt (WCAG 2.1 AA, 0 Violations), kein reiner Anspruch — brauchen wie CSP ([§3](#3-werkzeuge-konkret) `check:csp`) ein automatisiertes Gate. Automatisiert prüfbar (axe-core-artige Regelprüfung, z. B. via `@testing-library/svelte`-Komponententests oder ein dediziertes `check:a11y`-Skript analog `check-csp.mjs`): fehlende zugängliche Namen, unzureichender Kontrast, fehlende Formular-Label-Assoziationen. NICHT zuverlässig automatisierbar, daher manuelle Stichprobe je Bauabschnitt: tatsächliche Tastatur-Fokus-Reihenfolge in den imperativen SVG-Inseln, ob `prefers-reduced-motion` in der jeweiligen Insel wirklich greift. Gate wird mitgebaut, sobald die erste barrierefreiheitsrelevante UI-Komponente entsteht — nicht erst nachträglich nach einem Fund ergänzt.
- **TST-16 — Orts-/Hof-bezogene Verifikation deckt BEIDE Zustände ab (angereichert UND unangereichert), nicht nur ein kuratiertes Beispiel.** Jede neue Orts-/Hof-bezogene Funktion (Anzeige, Verknüpfung, Navigation, Karten-Interaktion) wird mit MINDESTENS einem angereicherten UND einem plain/unangereicherten Objekt verifiziert (`isEnrichedPlace`/`isEnrichedHof`, [11 §9.1](11-Orte-Hoefe-Identitaet.md)) — der unangereicherte, frisch geseedete Zustand ist der DEFAULT direkt nach Import (ADR-v9-28/44), nicht der Sonderfall, auch wenn ein naheliegend gewähltes Test-Beispiel (oft ein bereits mehrfach kuratierter Kern-Ort) ihn nicht zeigt. **Lehre (2026-07-14, ADR-v9-78-Nachtrag):** zwei parallel arbeitende Bau-Agenten bauten je eine Hälfte des Kartenlink-Sprungs (`CoordIndicator` setzt einen Fokus-Slot, die Karte-Insel konsumiert ihn) und verifizierten JEDER FÜR SICH erfolgreich mit einem bereits angereicherten Ort (Burgsteinfurt/Münster bzw. Röddensen) — beide Berichte plausibel, beide grün, beide nutzten sogar die echte Geschwister-Komponente (kein Simulations-Artefakt). Die eigene, unabhängige Nachverifikation mit einem unangereicherten Ort (`demo.ged`s „Rheine" — Koordinaten nur als `ev.lati/long`-Event-Fallback, kein eigenes PlaceObject-Feld) fand einen Klick, der navigierte, aber nichts zentrierte/markierte (0 gefundene Marker per DOM-Abfrage, reproduzierbar). Keiner der beiden Agenten hatte den unangereicherten Fall geprüft, obwohl er der in ADR-v9-28/44 explizit dokumentierte Regelfall direkt nach Import ist, nicht die Ausnahme — dieselbe Verwechslung „seltener Sonderfall" statt „häufigster Ausgangszustand", die die Anreicherungs-Pille (§9.1) überhaupt erst nötig machte.

---

## 2. Test-Ebenen

| Ebene | Was | Umfang | Werkzeug |
|---|---|---|---|
| **Kern-Unit** | reine Funktionen: `parse`/`serialize`, Identitätsauflösung, Datums-Norm, Anonymisierungs-BFS, Validatoren, Beziehungsrechner | **Masse** (Bulk) | Vitest (Node) |
| **Roundtrip** | `out1===out2`, `net_delta=0` gegen echte Fixtures (GEDCOM + GRAMPS) | Kronjuwel | Vitest |
| **Property/Invariante** | Eigenschaften statt Einzelfälle: Auflösung deterministisch, Roundtrip idempotent, Passthrough verlustfrei | gezielt | Vitest + fast-check (property-based) |
| **Snapshot/Goldfile** | stabile Render-Ausgaben, **aus dem Modell gerechnet** (Reports, Orts-Steckbrief) — nicht DOM-abhängig | pro Report | Vitest snapshot |
| **Architektur-Gates** | Import-Grenze (INV-ARCH-1), CSP (LP-8), Barrierefreiheit (LP-8, TST-15), Funktionsgröße | CI-Gate | dependency-cruiser / ESLint / CSP-Scanner / a11y-Scanner |
| **Komponenten** | reaktive UI-Schale: Formulare, Listen, View-State-Kontrakt | wenige | @testing-library/svelte + happy-dom |
| **E2E** | 2–3 kritische Flows real: Datei öffnen → editieren → exportieren → re-parsen; Offline-Boot | minimal | Playwright (optional) |

**Imperative Inseln** (Baum/Karte/Zeitleiste, [02 §5](02-Zielarchitektur-v9.md)) werden über ihre **Layout-Berechnung** unit-getestet (reine Funktion Modell→Positionen), nicht über gerenderte Pixel.

---

## 3. Werkzeuge (konkret)

- **Vitest** — Kern-Unit + Roundtrip + Property + Snapshot. Nutzt Vite-Transform (TypeScript direkt), läuft in Node → headless, build-frei ([31 §3](31-Dev-Umgebung.md)).
- **fast-check** — property-based Tests für Invarianten (Determinismus, Idempotenz).
- **@testing-library/svelte** + **happy-dom** — Komponenten-Tests der Schale (Svelte 5, [02 §6](02-Zielarchitektur-v9.md)).
- **Playwright** *(optional, minimal)* — 2–3 E2E-Flows in echtem Browser inkl. Offline/PWA-Boot.
- **dependency-cruiser** oder **eslint-plugin-boundaries** — Import-Grenzen-Gate (INV-ARCH-1: Kern importiert nichts von oben).
- **CSP-Scanner** — Portierung von v8 `test-csp.js`: findet inline-Styles/-Handler (LP-8). **Umgesetzt (ADR-v9-39):** `tests/csp/check-csp.mjs`, CI-Gate `npm run check:csp`.
- **a11y-Scanner** (TST-15, LP-8) — noch nicht umgesetzt. Vorschlag: `axe-core` gegen die bereits vorhandenen Komponententests (`@testing-library/svelte`), analog zum CSP-Scanner ein CI-Gate `npm run check:a11y`. Werkzeug-Wahl ist Implementierungsdetail.
- **Synthetik-Generator** — Portierung von v8 `generate-scale-test.js` (deterministisch, N Personen) für Skalierungs-/Perf-Tests.

> **Neuaufsatz-Hinweis:** Der Wechsel von v8-JXA/`osascript` auf Vitest/Node beseitigt die JXA-spezifischen Fallen (Function-Decl-Hoisting, const-Eval-Leak, Microtask-Falle, fehlendes `console.warn`) ersatzlos. Die *methodische* Lehre bleibt: Test-Seams + injizierter Takt.

---

## 4. Fixtures & Testdaten

Liegen in `/tests/fixtures` ([31 §2](31-Dev-Umgebung.md)):

| Fixture | Zweck |
|---|---|
| `MeineDaten_ancestris.ged` (2811 Pers., 83k Z.) | GEDCOM-Roundtrip-Orakel, Ancestris-Konvention |
| `Unsere Familie.gramps` (2894 Pers.) | GRAMPS-Roundtrip-Orakel (`xml1===xml2`) |
| `scale-test-20000.ged` (regenerierbar) | Skalierung/Perf |
| kuratierte Klein-Fixtures je Feature | ein Fixture pro Konvention/Kante (Hof-Konventionen 1/2/3a/3b, `_EVAL`, `_HYPO`, PEDI-Delta, Leer-Segment-Guard, ADDR=Village …) — aus den v8-Testgruppen übernommen |
| `app/public/demo.ged` (fiktiv, mitgebauter Demo-Modus, [20 §1.2](20-Funktionen.md)) | rein erfundener, aber reichhaltiger Mehr-Feature-Datensatz (mehrere Ahnen-Ebenen, Voll-/Halbgeschwister, Mehrfach-Ehe, geokodierte Orte, Quellen mit gestaffelten QUAY-Stufen, jahrzehntelange Ereignisse) — erster Anlaufpunkt für Browser-Verifikation, bevor ein neuer Wegwerf-Datensatz gebaut wird |

- **TST-FIX:** Fixtures sind eingecheckt und unveränderlich; ein bewusst geänderter Goldfile-Output wird explizit aktualisiert (Review-pflichtig), nie automatisch.
- **TST-REUSE:** Vor dem Bau eines neuen synthetischen Test-/Verifikations-Datensatzes IMMER zuerst `app/public/demo.ged` und `tests/fixtures/` auf einen bereits passenden oder erweiterbaren Datensatz prüfen — keinen weiteren Wegwerf-Datensatz für dieselbe Art Verifikation anlegen. **Lehre (2026-07-05):** vor dem Demo-Modus-Bauabschnitt hat praktisch jeder Bauabschnitt seinen eigenen, einmaligen synthetischen GEDCOM-Schnipsel für die Browser-Verifikation gebaut (Doppelarbeit) — INV-UI-4 („eine Quelle statt N Kopien") gilt sinngemäß auch für Testdaten, nicht nur für CSS/Komponenten.

Die v8-Fixtures sind ein **Datenerhalt-Orakel**, keine Verhaltens-Vorlage — der Umgang mit Abweichungen steht in [§9](#9-orakel-disziplin--v8-abweichungs-register).

---

## 5. Determinismus & Seams

Damit Roundtrip/Auflösung reproduzierbar testbar sind:

- **Reine Kern-API:** `parse(text) → model`, `serialize(model, format) → bytes` — keine Seiteneffekte, kein DOM, kein I/O.
- **Injizierter Takt:** `CHAN/DATE`-Zeitstempel kommen aus einer injizierten Clock (Test setzt feste Zeit) → `updateHeadDate`-Determinismus ohne Sonderpfad (die v8-Lehre, sauber gelöst).
- **GRAMPS-Test-Seam:** synchrone `buildXMLText(db)` / `parseXMLText(xml)` ohne gzip/Blob/`DecompressionStream` → GRAMPS-Roundtrip headless ([13 §6](13-Interop-Roundtrip.md)).
- **Plattform-Adapter mockbar:** `FileService`-Tiers (FS-Access / share / download) hinter einer Schnittstelle → die **Tier-Auswahl-Logik** ist testbar, die echten Plattform-APIs werden gemockt ([14 §4](14-Dateihandling.md)).
- **Identitätsauflösung ist rein:** `(events, placeObjects, hofObjects) → (placeId, hofId, …)` ohne Zustand → direkt property-testbar ([11 §4](11-Orte-Hoefe-Identitaet.md)).

---

## 6. Test-Kontrakte je Subsystem

Jede Zeile = Pflicht-Testabdeckung. Vollständigkeit ist Teil der Definition of Done ([§8](#8-migration--definition-of-done)).

| Spec | Zu verriegelnde Invarianten | Testart |
|---|---|---|
| [02](02-Zielarchitektur-v9.md) | INV-ARCH-1 (Import-Grenze), INV-ARCH-2 (Kern build-frei) | Architektur-Gate |
| [10](10-Domaenenmodell.md) | INV-P1…P5 (sex, verwaiste Refs gemeldet, INDI↔FAM-Konsistenz, seen-Flag), INV-C1/C2 (Zitat-Identität, quay/eval unabhängig) | Unit |
| [11](11-Orte-Hoefe-Identitaet.md) | Auflösung **deterministisch** (gleiche Eingabe→gleiche Ausgabe), INV-PLACE (Reprojektion), Konventions-Matrix (jede Konvention→erwarteter Pfad), Konvention-α-Extract, Read-Tolerance, Review-Klassifikation A/C/D | Unit + Property |
| [12](12-Forschungsdaten.md) | Task `done===status==='done'`, INV-H1/H2 (weight getrennt, Evidenz als SID-Ref) | Unit |
| [13](13-Interop-Roundtrip.md) | RT-1/RT-2/RT-3 (Roundtrip), INV-PT (unbekannter Tag überlebt), modellierte `_`-Tags ohne Doppelschreibung, Strict strippt, GED7-Downgrade, Anonymisierung | Roundtrip + Unit |
| [14](14-Dateihandling.md) | INV-FILE-1 (eine Arbeitskopie), INV-FILE-2 (ein Export-Rohr, alle Formate), INV-FILE-3 (Tier-Auswahl einzige Verzweigung) | Unit (Adapter gemockt) |
| [20](20-Funktionen.md) | jede Validierungsregel (31) hat einen Test; jeder Report erzeugt stabiles Goldfile | Unit + Snapshot |
| [21](21-UI-UX.md) | INV-VS (eine Auswahl-Instanz), INV-UI-1/2/3 (Lens-Trennung, ein kanonischer Weg) | Komponente |
| [30](30-NFR-und-Persistenz.md) | LP-8 (CSP-Scan), Skalierung (Perf-Budget auf 20k-Fixture) | Gate + Perf |

---

## 7. Pre-Commit vs. CI

- **Pre-Commit (lokal, schnell):** Kern-Unit + Roundtrip + CSP-Gate + Import-Grenze. Muss in Sekunden laufen (`npm run test:core`).
- **CI (GitHub Actions, [31 §4](31-Dev-Umgebung.md)):** **alle** Ebenen inkl. Komponenten, Perf und (falls vorhanden) E2E. Rot = kein Deploy.
- **TST-GATE:** Deploy nach GitHub Pages nur bei grüner CI — die Roundtrip-Treue (LP-1) und die Architektur-Grenze (INV-ARCH-1) sind harte Release-Vorbedingung, kein manueller Hook mehr.

---

## 8. Migration & Definition of Done

1. **Zuerst der Kern, test-first:** `parse`/`serialize` + ein Minimal-Roundtrip auf einer Klein-Fixture grün, **bevor** UI gebaut wird.
2. **v8-Suite als Datenerhalt-Orakel:** die 884 v8-Tests + Roundtrip-Fixtures werden als **Paritäts-Vergleich** herangezogen — der neue Kern muss dieselben *Bytes* liefern **oder** die Abweichung ist bewusst und registriert ([§9](#9-orakel-disziplin--v8-abweichungs-register)). v8s *Struktur/Modell* wird ausdrücklich **nicht** nachgebaut ([03 Altlasten](03-Altlasten.md)).
3. **Kuratierte Kanten-Fixtures** aus den v8-Testgruppen (Hof-Konventionen, `_EVAL`/`_HYPO`, PEDI-Delta …) übernehmen.

**Definition of Done (pro Subsystem):**
- Alle `INV-…` des Subsystems durch benannte Tests abgedeckt (TST-2).
- Roundtrip-Fixtures grün (`out1===out2`, `net_delta=0`).
- Architektur-Gate grün (keine Grenzverletzung).
- Neue Bugs mit Regressions-Test verriegelt (TST-4).
- Keine **undokumentierte** Abweichung vom v8-Orakel — jede beabsichtigte Abweichung steht im Register mit verriegelndem Test (TST-DEV, [§9](#9-orakel-disziplin--v8-abweichungs-register)).
- **Kapazitäts-/Überlauf-Fall verifiziert** bei jeder Mehrfach-Element-Darstellung — nicht nur der 1-3-Element-Happy-Path (TST-7).
- **Persistenz-Rundlauf verifiziert** bei jedem neuen/geänderten Save-/Update-Kommando — „speichern → neu laden → noch da", nicht nur „kein Fehler beim Speichern" (TST-8).
- **Bestehende Fixtures geprüft, bevor ein neuer Wegwerf-Testdatensatz gebaut wird** (`app/public/demo.ged`/`tests/fixtures/`, TST-REUSE).
- **Feld-Vollständigkeit bei Editier-Formularen** — jedes Feld des Zieltyps abgedeckt oder bewusst ausgeschlossen, kein stilles Weglassen (TST-9).
- **`untrack()` bei `$state`-Initialisierung aus Props**, nicht direkte Prop-Referenz (TST-10).
- **Layout-Verifikation auf 375px** bei jedem `flex-wrap`-Layout, das dort kompakt bleiben soll — nicht nur am Desktop-Viewport (TST-11).
- **Kein `<select bind:value>`** — `npm run lint` erzwingt das automatisch (TST-12), nur relevant falls die Regel je bewusst umgangen werden müsste (dann Begründung + Alternative dokumentieren).

---

## 9. Orakel-Disziplin & v8-Abweichungs-Register

Verhindert, dass v8s Fehler, Inkonsistenzen und Schwächen über das Roundtrip-Orakel wieder in v9 einsickern.

### Warum das Orakel v8s Schwächen nicht durchreicht

Das Orakel vergleicht die **Wire-Ausgabe** (GEDCOM/GRAMPS-Bytes), nicht v8s Innenleben. v8s strukturelle Altlasten (drei Ortsspeicher, zerstreute Zitate, God-Module) sind **intern** — v9 erzeugt mit einem **sauberen** Modell dieselben Bytes. Über das Orakel können sie also gar nicht einwandern; und da v9 aus der **Spec** neu gebaut wird (kein Port), wandern auch v8s Code-Bugs nicht mit.

### Zwei unabhängige Testquellen

- **Invarianten-Tests** (aus der Spec, [§6](#6-test-kontrakte-je-subsystem)) — definieren *korrektes* Soll-Verhalten, top-down; **nicht** aus v8 abgeleitet.
- **Orakel-/Roundtrip-Tests** (aus v8) — verbürgen *Datenerhalt*, bottom-up.

Widersprechen sich beide, zeigt das genau die Stelle, an der v8 vom Soll abwich → **die Spec gewinnt** (TST-6).

### Klassifikation bei Roundtrip-Abweichung (`net_delta ≠ 0`)

Default-Annahme: **Regression, bis als Verbesserung bewiesen.**
1. **v9 verliert, was v8 hielt** → Regression → fixen.
2. **v9 behandelt korrekt, was v8 verstümmelte** (echter v8-Bug) → **beabsichtigte Abweichung**: Register-Eintrag + Test, der das neue korrekte Verhalten verriegelt.

### Das Register — `tests/v8-abweichungen.md`

Geführte Liste jeder Stelle, an der v9-Ausgabe **bewusst** vom v8-Orakel abweicht:

| Feld | Inhalt |
|---|---|
| **ID** | `DEV-01`, `DEV-02`, … |
| **Kontext** | Fixture / Tag / Konstrukt |
| **v8-Verhalten** | was v8 ausgibt |
| **v9-Verhalten** | was v9 ausgibt |
| **Grund** | `bug-fix` (v8 war falsch) · `by-design` (Format-Grenze) |
| **Test** | verriegelnder Test-Bezug |

**Seed-Einträge** (schon in [13 §4/§8](13-Interop-Roundtrip.md) beschlossen): HEAD-Rewrite (`by-design`), Konvention-2→1-Übergang (`by-design`); dazu die dokumentierten v8-Einzelverluste (doppeltes `3 MAP`, nacktes `1 CHAN` ohne DATE) als `bug-fix`-Kandidaten, sobald v9 sie besser macht.

### Regel

- **TST-DEV:** Keine undokumentierte Abweichung vom Orakel. Jede beabsichtigte Abweichung hat **(a)** einen Register-Eintrag **und (b)** einen Test, der das neue Verhalten festhält. Ein **unerwarteter** Orakel-Diff ohne Register-Eintrag bricht die CI (wird wie eine Regression behandelt).

Das Register ist die nachvollziehbare Grenze zwischen „Regression" (verboten) und „bewusste Verbesserung / Format-Grenze" (registriert). Es wird beim Kern-Baubeginn angelegt und wächst mit dem Bau.
