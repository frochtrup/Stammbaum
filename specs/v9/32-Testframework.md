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
- **TST-6 — Das Orakel ist eng.** Die v8-Suite verbürgt **Datenerhalt** (Roundtrip, `net_delta=0`) — **nicht** v8-Verhalten, -Modell oder -UI. Bei Konflikt zwischen Orakel und Spec-Invariante **gewinnt die Spec**; jede bewusste Abweichung vom Orakel ist registriert ([§9](#9-orakel-disziplin--v8-abweichungs-register)).

---

## 2. Test-Ebenen

| Ebene | Was | Umfang | Werkzeug |
|---|---|---|---|
| **Kern-Unit** | reine Funktionen: `parse`/`serialize`, Identitätsauflösung, Datums-Norm, Anonymisierungs-BFS, Validatoren, Beziehungsrechner | **Masse** (Bulk) | Vitest (Node) |
| **Roundtrip** | `out1===out2`, `net_delta=0` gegen echte Fixtures (GEDCOM + GRAMPS) | Kronjuwel | Vitest |
| **Property/Invariante** | Eigenschaften statt Einzelfälle: Auflösung deterministisch, Roundtrip idempotent, Passthrough verlustfrei | gezielt | Vitest + fast-check (property-based) |
| **Snapshot/Goldfile** | stabile Render-Ausgaben, **aus dem Modell gerechnet** (Reports, Orts-Steckbrief) — nicht DOM-abhängig | pro Report | Vitest snapshot |
| **Architektur-Gates** | Import-Grenze (INV-ARCH-1), CSP (LP-8), Funktionsgröße | CI-Gate | dependency-cruiser / ESLint / CSP-Scanner |
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
- **CSP-Scanner** — Portierung von v8 `test-csp.js`: findet inline-Styles/-Handler (LP-8).
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

- **TST-FIX:** Fixtures sind eingecheckt und unveränderlich; ein bewusst geänderter Goldfile-Output wird explizit aktualisiert (Review-pflichtig), nie automatisch.

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

1. **Zuerst der Kern, test-first:** `parse`/`serialize` + ein Minimal-Roundtrip auf einer Klein-Fixture grün, **bevor** UI gebaut wird ([31 §7](31-Dev-Umgebung.md)).
2. **v8-Suite als Datenerhalt-Orakel:** die 884 v8-Tests + Roundtrip-Fixtures werden als **Paritäts-Vergleich** herangezogen — der neue Kern muss dieselben *Bytes* liefern **oder** die Abweichung ist bewusst und registriert ([§9](#9-orakel-disziplin--v8-abweichungs-register)). v8s *Struktur/Modell* wird ausdrücklich **nicht** nachgebaut ([03 Altlasten](03-Altlasten.md)).
3. **Kuratierte Kanten-Fixtures** aus den v8-Testgruppen (Hof-Konventionen, `_EVAL`/`_HYPO`, PEDI-Delta …) übernehmen.

**Definition of Done (pro Subsystem):**
- Alle `INV-…` des Subsystems durch benannte Tests abgedeckt (TST-2).
- Roundtrip-Fixtures grün (`out1===out2`, `net_delta=0`).
- Architektur-Gate grün (keine Grenzverletzung).
- Neue Bugs mit Regressions-Test verriegelt (TST-4).
- Keine **undokumentierte** Abweichung vom v8-Orakel — jede beabsichtigte Abweichung steht im Register mit verriegelndem Test (TST-DEV, [§9](#9-orakel-disziplin--v8-abweichungs-register)).

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
