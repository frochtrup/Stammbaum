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
- **TST-6 — Das Orakel ist eng.** Die v8-Suite verbürgt **Datenerhalt** (Roundtrip, `net_delta=0`) — **nicht** v8-Verhalten, -Modell oder -UI. Bei Konflikt zwischen Orakel und Spec-Invariante **gewinnt die Spec**; jede bewusste Abweichung vom Orakel ist registriert ([§9](#9-orakel-disziplin--v8-abweichungs-register)). **Zweischneidiges Schwert bei Feature-Umfang:** ist ein Spec-Bullet knapper formuliert als das zugehörige Oracle-Feature, ist WEDER „automatisch das ganze Oracle-Verhalten nachbauen" (reproduziert genau die evolutionär gewachsene Form, die der Neuaufsatz auflösen soll) NOCH „alles Nicht-Erwähnte automatisch als außer Scope behandeln" (verliert stillschweigend genealogisch relevante Information, s. ADR-v9-23/24/27) die richtige Standard-Reaktion. Richtig: die Diskrepanz **explizit im Abschlussbericht benennen** (Umfang bewusst eingegrenzt, Grund nennen) statt sie stillschweigend in die eine oder andere Richtung aufzulösen — die Entscheidung bleibt beim Menschen/der Spec-Pflege, nicht beim Bauagenten.
- **TST-7 — Kapazität/Überlauf ist Teil des Tests, nicht nur der Happy-Path.** Jede Mehrfach-Element-Darstellung (Listen, Chips, Kandidaten, Zeilen mit variabler Anzahl) wird zusätzlich zum 1-3-Element-Fall mit überdurchschnittlich vielen bzw. dicht beieinanderliegenden Elementen verifiziert — sowohl als Unit-Test der Layout-/Modell-Funktion (Grenzfälle, Determinismus) als auch in der Pflicht-Browser-Verifikation.
- **TST-8 — Persistenz-Rundlauf ist Pflicht bei jedem Save-/Update-Kommando.** Ein neues oder geändertes Kommando, das Zustand persistieren soll (App-State-Kommandos, Services-Schreibpfade), wird mit „speichern → neu laden → Zustand noch vorhanden" verifiziert — nicht nur mit „kein Fehler beim Speichern".
- **TST-9 — Feld-Vollständigkeit bei Editier-Formularen.** Vor „fertig" jedes Feld des editierten Domänenmodell-Typs (`core/model/types.ts`) durchgehen: entweder im Formular abgedeckt ODER bewusst ausgeschlossen (kurzer Kommentar, warum) — kein stilles Weglassen.
- **TST-10 — `untrack()` bei `$state`-Initialisierung aus Props.** Formular-Zustand, der nur beim Mount aus einem übergebenen Objekt gelesen wird, IMMER als `$state(untrack(() => model.field))`, nie `$state(model.field)` direkt — sonst meldet Svelte `state_referenced_locally` (Zustand synct sonst fälschlich bei jedem Prop-Wechsel mit statt nur einmal beim Mount zu lesen).
- **TST-11 — Layout-Verifikation auf der tatsächlichen Ziel-Breite, nicht nur Desktop.** Ein `flex-wrap`-Layout, das auf der primären mobilen Zielbreite ([21 §2](21-UI-UX.md), 375px) kompakt bleiben soll, wird explizit bei dieser Breite verifiziert (`mcp__Claude_Browser__resize_window(preset: "mobile")`) — eine Desktop-Verifikation (typische Vorschaubreite ≥ 800px) deckt Umbrüche nicht auf, die erst bei 375px auftreten.
- **TST-12 — `<select bind:value>` ist unter happy-dom nicht zuverlässig testbar; strukturell per Lint-Gate erzwungen, nicht nur dokumentiert.** happy-dom reflektiert `:checked` auf `<option>` nach einem `fireEvent.change` nicht zuverlässig zurück in Svelte 5s kompiliertes `bind:value` — der gebundene Wert bleibt beim nächsten Lesen (z. B. ein Speichern-Klick direkt danach) veraltet, ohne Compile-Fehler. Ersatzmuster: `value={x} onchange={(e) => (x = e.currentTarget.value)}`.
- **TST-13 — Löschen/Leeren einer Struktur per Reload verifizieren, nicht nur an der reaktiven Live-Ansicht.** Ein UI-Zustand, der ein Feld/Ereignis „entfernt" aussehen lässt (z. B. weil eine Anzeige-Filterfunktion einen leeren Eintrag herausrechnet), muss nicht bedeuten, dass die zugrunde liegende Struktur wirklich aus dem Modell entfernt wurde — ohne vollen Reload bleibt das unsichtbar.
- **TST-14 — Anzeige-Vollständigkeit: erfassbar ≠ sichtbar, beide Richtungen einzeln verifizieren.** Ein Feld/Attribut, das der Editor korrekt entgegennimmt und roundtrip-sicher speichert (TST-9 grün, Editor selbst vollständig), ist damit NICHT automatisch auch in irgendeiner Lese-Ansicht sichtbar — Editor-Vollständigkeit (TST-9: „kann der Nutzer es eingeben") und Anzeige-Vollständigkeit (TST-14: „sieht der Nutzer es danach je wieder") sind zwei unabhängige Kontrakte. TST-9 allein fängt eine Lücke auf DIESER Seite nicht.
- **TST-15 — Barrierefreiheits-Gate (LP-8), automatisiert wo möglich.** [01 LP-8](01-Vision-und-Prinzipien.md)/[21 §6i](21-UI-UX.md) sind ein Kontrakt (WCAG 2.1 AA, 0 Violations), kein reiner Anspruch — brauchen wie CSP ([§3](#3-werkzeuge-konkret) `check:csp`) ein automatisiertes Gate. Automatisiert prüfbar (axe-core-artige Regelprüfung, z. B. via `@testing-library/svelte`-Komponententests oder ein dediziertes `check:a11y`-Skript analog `check-csp.mjs`): fehlende zugängliche Namen, unzureichender Kontrast, fehlende Formular-Label-Assoziationen. NICHT zuverlässig automatisierbar, daher manuelle Stichprobe je Bauabschnitt: tatsächliche Tastatur-Fokus-Reihenfolge in den imperativen SVG-Inseln, ob `prefers-reduced-motion` in der jeweiligen Insel wirklich greift. Gate wird mitgebaut, sobald die erste barrierefreiheitsrelevante UI-Komponente entsteht — nicht erst nachträglich nach einem Fund ergänzt. **Umgesetzt in fünf Scheiben.** Zwei lesen CSS-Text: Kontrast auf Token-Ebene (`tests/ui/text-contrast.test.ts`, ADR-v9-119) und Trefferflächen-Mindestgröße (`tests/ui/touch-target.test.ts`, ADR-v9-155). Die vierte liest Markup: der **Tastatur-Kontrakt der Formulare** (`tests/ui/entity-form-keyboard.test.ts`, [ADR-v9-218](04-Entscheidungslog.md#adr-v9-218)) — jede Fläche mit einer Speichern-Aktion ist ein `<form onsubmit>` mit `type="submit"` und hat einen Escape-Ausgang, über eine **gerechnete** Population statt einer Namensliste. **Seine Grenze gehört zum Ergebnis:** dass ein Enter IM FELD den Submit auslöst, ist Browser-Verhalten (implicit submission) — happy-dom bildet es nicht nach, und die Browser-Automatisierung löst es ebenfalls nicht aus (gegengeprüft an einem nackten `<form><input><button type="submit">`: 0 Submits). Geprüft wird deshalb die Bauform plus die Escape-Wirkung; das Enter selbst bleibt manuelle Stichprobe. Die fünfte hält den **Modal-Fokus** (`tests/ui/modal-focus-trap.test.ts`, [21 §6i](21-UI-UX.md)): dass jedes Modal den Fokus fängt, dass es einen Escape-Ausgang hat (ohne den wäre der Ring der Verstoß) und dass Tab an den Rändern umlenkt. Beides über dieselbe **gerechnete** Population wie das Portal. **Der Anlass ist zugleich die Grenze des Scanners:** axe-core prüft kein Fokus-Trapping — es ist Verhalten über Zeit, kein DOM-Merkmal; das Gate war mit 984 Zuständen grün, während alle vier Modale die Zusage aus `aria-modal` nicht hielten. Was auch dieser Wächter nicht sieht: die native Tab-Reihenfolge zwischen den Rändern (happy-dom hat keine) — sie bleibt manuelle Stichprobe. Die dritte prüft gerenderte Elemente: **axe-core als `afterEach` über die bereits vorhandenen Komponententests** (`tests/a11y/axe-setup.ts`, [ADR-v9-170](04-Entscheidungslog.md#adr-v9-170)) — kein eigener Testkorpus, sondern jeder `render` und jede Interaktion, die dort ohnehin stattfindet. Eigener Lauf (`npm run check:a11y`, eigener CI-Schritt), weil der Scanner `sequence.hooks: 'list'` braucht, um den DOM VOR dem Aufräumen durch `@testing-library` zu sehen. **Die erreichte Reichweite ist Teil des Ergebnisses** und hat eine Untergrenze: `tools/a11y/run-a11y.mjs` schreibt „N gescannte Testzustände · M DOM-Knoten · R greifende Regeln" ins CI-Log und schlägt an, wenn N einbricht — grün ohne Reichweite ist kein Ergebnis (gemessen: mit der falschen Hook-Reihenfolge 24 statt 827 Testzustände). **Grenzen, ausdrücklich benannt statt als Voll-Abdeckung ausgegeben:** `color-contrast` ist unter happy-dom nicht bewertbar (keine gerechneten Pixel, dafür die zwei Token-Wächter), und die zwei Seitenkontext-Regeln `region`/`heading-order` sind abgeschaltet — ein isoliert gerendertes Fragment hat keine Landmarken und beginnt mitten in der Überschriften-Hierarchie. Diese drei bleiben Teil der manuellen Stichprobe.
- **TST-16 — Orts-/Hof-bezogene Verifikation deckt BEIDE Zustände ab (angereichert UND unangereichert), nicht nur ein kuratiertes Beispiel.** Jede neue Orts-/Hof-bezogene Funktion (Anzeige, Verknüpfung, Navigation, Karten-Interaktion) wird mit MINDESTENS einem angereicherten UND einem plain/unangereicherten Objekt verifiziert (`isEnrichedPlace`/`isEnrichedHof`, [11 §9.1](11-Orte-Hoefe-Identitaet.md)) — der unangereicherte, frisch geseedete Zustand ist der DEFAULT direkt nach Import (ADR-v9-28/44), nicht der Sonderfall, auch wenn ein naheliegend gewähltes Test-Beispiel (oft ein bereits mehrfach kuratierter Kern-Ort) ihn nicht zeigt.

- **TST-17 — Ein Test einer formfaktor-abhängigen Oberfläche benennt seinen Formfaktor.** Sobald eine Komponente `layout.isDesktopLayout` liest ([21 §3](21-UI-UX.md), `ui/shell/layout.svelte.ts`), entscheidet die Viewport-Breite der Testumgebung mit, welchen Zweig sie rendert — und happy-dom ist standardmäßig **1024px breit**, also Desktop. Ein Komponententest, der das nicht festlegt, prüft einen Zweig, den er nicht gewählt hat. Festgelegt wird über `tests/ui/layout-harness.ts` (`pinLayout(false|true)`), bei Tests, die `App.svelte` selbst rendern, über dessen `layoutEnv`-Prop — die Komponente ruft im `onMount` selbst `layout.start()` und überschriebe eine daneben gesetzte Festlegung. **Zwei Fallen, beide real aufgetreten:** (a) beim Einführen der ersten formfaktor-abhängigen Verzweigungen kippten in drei Wellen 14, 15 und 7 bestehende Tests auf einen Schlag — nicht weil ihr Gegenstand sich geändert hätte, sondern weil sie stillschweigend ins Desktop-Modell rutschten. (b) Vitest sucht den Environment-Docblock als **reine Zeichenfolge im Dateiinhalt** und findet ihn auch in einem Kommentar, der ihn nur *erwähnt*: ein Kopfkommentar mit der Erklärung, dass die Datei ohne DOM läuft, schaltete happy-dom ein und ließ einen `matchMedia`-Test mit unerklärlichem `true` fehlschlagen. Wer einen Environment-Docblock in Prosa erwähnen will, umschreibt ihn.
- **TST-18 — Ein Picker steht nie in einem `<label>`; per Lint-Gate erzwungen, nicht dokumentiert.** Ein `<label>` reicht **jeden** Klick in seinem Inneren an das zugehörige Formularfeld weiter. Solange der Picker ein Knopf war, der ein Panel öffnete, blieb das folgenlos; seit er eine Combobox mit **eingebetteter Trefferliste** ist ([ADR-v9-103](04-Entscheidungslog.md)), liegen die Trefferzeilen INNERHALB dieses Wrappers — ein Klick auf einen Treffer klickt damit zusätzlich das Feld an und öffnet die eben geschlossene Liste sofort wieder. Ersatzmuster: `<div class="stb-field">` + `<span class="stb-field__caption">`, den zugänglichen Namen trägt der Picker über seine `label`-Prop. **Warum als Gate und nicht als Merksatz:** beim Umbau lagen **neun** solche Stellen vor, und ein handgeschriebener `grep` fand nur sieben davon — die zwei übrigen (`HofDetail.svelte`, Picker nicht als erstes Kind) deckte erst die fertige Lint-Regel auf. Eine Regel, deren erste Anwendung schon die eigene manuelle Suche schlägt, gehört nicht in die Erinnerung (dieselbe Begründung wie TST-12, dieselbe `no-restricted-syntax`-Bauform). Wirkung negativ verifiziert: einen Wrapper testweise zurückgebaut → Lint rot, zurückgesetzt → grün.

- **TST-19 — Personennamen werden nicht von Hand zusammengesetzt; per Lint-Gate erzwungen.** `${p.given} ${p.surname}` verliert Präfix und Suffix und umgeht den Rückfall für namenlose Personen. Ersatz: `displayName(p)` bzw. `displayNameOr(p, fallback)` aus `ui/shell/person-display.ts`, für den rohen GEDCOM-NAME-Wert `composeGedcomName()` aus `core/model/name-parts.ts` ([10 §2](10-Domaenenmodell.md)). **Bewusst eng gefasst:** verboten ist die Komposition, nicht der Feldzugriff — seit der Parser `given`/`surname` beim Einlesen füllt, ist rohes Lesen korrekt, und ein Pauschalverbot träfe legitime Stellen (Vornamen-Statistik, Validierungsregeln, Suchheuhaufen). **Warum als Gate:** dieselbe Zeile stand in ALLEN DREI Diagramm-Inseln (Sanduhr, Karte, Zeitleiste), nachdem die Regel zuvor zweimal nur als Kommentar festgehalten worden war (ADR-v9-18, BL-108) — die Sanduhr zeigte deshalb Nachnamen mitsamt Schrägstrichen. Wirkung negativ verifiziert: das alte Muster testweise wieder eingesetzt → Lint rot, zurückgesetzt → grün.

- **TST-20 — Eine Fixture-Familie, die eine optionale Formvariante nie enthält, prüft sie auch nicht.** Alle GEDCOM-Fixturen trugen `GIVN`/`SURN` nahezu durchgängig (Ancestris 2840/2863, `demo.ged` 24/24, `mini.small.ged` 1/1) — die verbreitete Form **ohne** diese Untertags kam schlicht nicht vor, weshalb drei Anläufe lang kein Test bemerkte, dass die Felder dann leer blieben. Optionale Bestandteile eines Fremdformats brauchen eine Fixture, die sie WEGLÄSST (`tests/fixtures/mini.untagged.ged`), nicht nur eine, die sie enthält. Vor dem Bau gegen ein Formatdetail: die Formenverteilung in den vorhandenen Fixturen **auszählen**, statt anzunehmen, sie decke die Varianten ab.

- **TST-21 — Eine Aussage über „den Realbestand" benennt ihre Datei und prüft sie nach; ein stiller Skip zählt als Fehlschlag.** Jede Priorisierung der Form „kommt N× vor" hängt daran, welche Datei ausgezählt wurde — und die naheliegendste ist nicht die richtige: der maßgebliche Bestand liegt gitignored **außerhalb** des Code-Repos (`Unsere Familie 2026.ged`, 3180 Personen), während `tests/fixtures/MeineDaten_ancestris.ged` (2795 Personen) im Code-Repo kanonisch aussieht, weil die Tests dagegen laufen. [ADR-v9-151](04-Entscheidungslog.md#adr-v9-151) hat sechs Quellen-Zahlen an der falschen Datei gemessen; alle sechs waren falsch, eine Backlog-Zeile trug „0 Vorkommen" für ein Feld mit sieben kuratierten Einträgen ([ADR-v9-178](04-Entscheidungslog.md#adr-v9-178) — zweiter Fall nach [ADR-v9-62](04-Entscheidungslog.md#adr-v9-62)/[65](04-Entscheidungslog.md#adr-v9-65)). Der Realdaten-Test benennt deshalb die Datei, prüft ihre Personenzahl gegen einen erwarteten Wert und **schlägt fehl, statt zu skippen**, wenn eine andere geladen ist. **Die Messgrundlage hat ZWEI Dateien** ([ADR-v9-242](04-Entscheidungslog.md#adr-v9-242)): den GEDCOM-Export UND den kuratierten Ortsbestand (`Testdateien/orte-2.json`) — ohne ihn trifft die Auflösung nie auf einen periodengerecht datierten Ort und misst etwas anderes. Beide werden gleich hart geprüft; die Ortsbestand-Hälfte stand zwei Monate als unbenutzte Deklaration da (Symlink auf die älteste von vier Dateien, `erwartet` passte nicht einmal zu ihr), weil ein deklarierter Erwartungswert, den kein Test liest, keine Zusicherung ist. `describe.skipIf(!existsSync)` bleibt für Läufe ohne Privatdaten zulässig (CI), darf aber nicht die Frage verdecken, WELCHE Datei gemessen wurde: der Skip-Grund wird ausgegeben, nicht verschwiegen (Wächter-Reflex aus [ADR-v9-91](04-Entscheidungslog.md#adr-v9-91) — die Zahl ist der Nutzen, die Schwelle nur der Wecker).

- **TST-22 — Ein Test beweist erst dann etwas, wenn er ROT wird, sobald die Regel bricht.** TST-2 verlangt zu jeder `INV-…`/`LP-…` einen Test — das ist die schwächere Hälfte: „es gibt einen Test" und „ein Bruch fällt auf" sind zwei verschiedene Aussagen. Gemessen wird die zweite mit `npm run test:mutation` ([ADR-v9-199](04-Entscheidungslog.md#adr-v9-199)): je Invariante wird die Regel im Quelltext gezielt gebrochen und gezählt, wie viele Testfälle in wie vielen **Dateien** das merken. Drei Festlegungen halten das Instrument ehrlich:
  1. **Die Liste ist abgeleitet, nicht ausgewählt.** `tools/mutation/mutationen.mjs` führt JEDE in den Specs benannte Invariante — als Mutation, als Verweis auf ein anderes Gate (`check:arch`, `check:a11y`, `check:csp`) oder ausdrücklich als offen mit Fundort. Lint-Regel **L13** erzwingt die Vollständigkeit: eine neue Invariante ohne Zeile ist ein Fehler. Eine selbst zusammengestellte Auswahl „kritischer Stellen" war der erste Entwurf und ist verworfen — sie hatte keine prüfbare Herkunft.
  2. **Gemessen wird in Dateien, nicht in Fällen.** Eine Fall-Schwelle belohnt das Zersplittern einer Zusicherung in viele `it` — dieselbe Absicherung, höhere Zahl. Was die erste Messung dagegen zeigte: jede unzureichend geschützte Invariante hing an **einer einzigen Testdatei**, deren Umbau die Absicherung lautlos mitnimmt. Untergrenze sind deshalb zwei unabhängige Dateien; bekannte Rückstände stehen namentlich in `UNTERGRENZE_RUECKSTAND`, ein neuer ist ein Fehler (Ratschen-Form wie L3/L11/L12).
  3. **Kalibriert wird ohne die privaten Fixturen.** Sonst wäre die Schwelle auf jedem anderen Rechner und in CI unerreichbar. Die Realdaten dürfen die Zahlen erhöhen, nie tragen — was nur mit ihnen gilt, ist in CI keine Zusicherung. Eine Schwelle ist dabei ein **Boden**, kein Ist-Wert: wo eine Mutation über Dutzende Dateien streut, wird sie bewusst unter den gemessenen Wert gesetzt, sonst flackert sie bei jeder unbeteiligten Umsortierung — und ein flackerndes Gate wird abgeschaltet.
  4. **Beim Rückbau ist die Messung ein VETO, kein Auswahlkriterium.** Sie kennt nur die benannten Invarianten, nicht das Verhalten dazwischen; „schlägt bei keiner Mutation an" trifft fast jede Testdatei und sagt über ihren Wert nichts. Ein Rückbau-Kandidat braucht deshalb zuerst einen INHALTLICHEN Grund (der Anlass ist weggefallen, die Zusage steht anderswo vollständig), und die Messung entscheidet erst danach, ob die Löschung etwas kostet. Jede Durchsicht hinterlässt ihren Filter samt Ergebnis in `RUECKBAU_GEPRUEFT` (`tools/mutation/mutationen.mjs`) — auch den Negativbefund, sonst wird sie beim nächsten Anlauf von vorn begonnen.
  Der Lauf kostet einen vollen Suitenlauf je Stelle (gemessen: 76 s auf dem CI-Runner) und hängt deshalb an einem eigenen, wöchentlichen Job, nicht am Push.

- **TST-23 — Eine Zusicherung gehört auf eine eingecheckte Fixture; der Realbestand ist Finder, nicht Zeuge.** Der Realbestand zeigt, was VORKOMMT, nie was vorkommen KANN — und er fehlt in CI. Eine Zahl aus ihm (`ADDR −82`) ist eine Aussage über einen Export, kein Kontrakt. Richtig ist die Arbeitsteilung: am Realbestand die KLASSE finden („strukturierte Adressen haben im Modell keine Felder"), sie dann auf einer kleinen, eingecheckten Fixture festnageln, die das Konstrukt trägt. Wo die Zusicherung eine Menge betrifft, wird sie gegen die Tabelle geprüft, die die Regel selbst benutzt, statt gegen eine Stichprobe: `tests/roundtrip/passthrough-matrix.test.ts` legt unter JEDEN Eintrag von `MODELLIERTE_KINDER` ein un-modelliertes Kind und bewacht zugleich, dass die Fixture die Tabelle vollständig abdeckt. Das ist die konstruktive Kehrseite von TST-20.

- **TST-24 — Eine Test-Naht, die eine MESSUNG stellt, beweist die Messung nicht: layout-abhängige Mechanismen brauchen einen Browser-Beleg.**
  happy-dom hat kein Layout (`clientHeight`/`offsetHeight`/`getBoundingClientRect` liefern 0).
  Ein Mechanismus, dessen Kern eine Layout-Messung ist — virtuelles Scrollen, sticky-Verhalten,
  Größen-abhängige Umbrüche — lässt sich im Emulator nur mit gestellten Werten prüfen. Genau
  diese Naht überbrückt dann den Teil, der schiefgehen kann. **Belegt (2026-08-09, BL-311,
  [ADR-v9-235](04-Entscheidungslog.md#adr-v9-235)):** vier Komponententests waren grün, während
  die Suchfläche im Browser ab ~150.000px Scroll-Position leere Bereiche zeigte — die Tests
  setzten die Gruppen-Positionen, deren Ermittlung defekt war. **Folge:** Die Naht bleibt
  (ohne sie wäre die Arithmetik ungeprüft), sie ist aber als solche zu benennen, und der
  Fertig-Zustand einer solchen Zeile verlangt zusätzlich einen Browser-Lauf, der die Kette in
  EINEM Zug geht (Daten laden → Eingabe → scrollen → hinsehen). Zwei Fallen dabei, beide real
  aufgetreten: ein wiederverwendeter Dev-Server liefert HMR-Leichen, und eine Seite ohne
  Reload zeigt alten Code — die verräterische Spur ist ein Messwert, der über ALLE Eingaben
  hinweg identisch bleibt.
  **Zweite Lesart derselben Spur, teurer erkauft ([ADR-v9-236](04-Entscheidungslog.md#adr-v9-236)):**
  identische Messwerte heißen nicht nur „alter Code", sondern auch „das Framework hat
  aufgegeben". Ein abgebrochener Svelte-Effektbaum (`effect_update_depth_exceeded`, ausgelöst
  von einer Messung, die den Zustand speist, aus dem sie folgt) liefert für JEDE Eingabe
  dieselbe Zahl, weil die Seite nicht mehr rendert. Beide Lesarten trennt EIN Handgriff, und
  er kommt vor jeder weiteren Hypothese: erst die **Konsole** lesen, dann einen
  **Bau-Marker** in die Fläche legen (eine Zahl im DOM, die sich bei jeder Änderung ändert)
  und im Browser prüfen, dass er mitzieht — HMR *und* Reload. Was danach gemessen wird, ist
  belegbar; was davor gemessen wurde, ist es nicht.

- **TST-25 — Untestbar ist das LAYOUT, nicht die RÜCKKOPPLUNG: einen messenden Mechanismus
  headless fahren, indem man die Höhen stellt statt das Layout.**
  Die konstruktive Kehrseite von TST-24. Dort steht, dass eine Naht, die einen Messwert
  STELLT, die Messung nicht beweist — richtig, und daraus wurde drei Anläufe lang der
  Fehlschluss „also ist hier nur der Browser zuständig". Er ist es für die Frage „misst der
  Browser, was wir annehmen". Er ist es NICHT für die Frage, an der der Mechanismus zweimal
  gestorben ist: ob der KREIS aus Fenster berechnen → Zeilen darin messen → Fenster neu
  berechnen bei ungleichen Höhen zur Ruhe kommt. Dieser Kreis braucht kein Layout, nur
  Höhen — und die dürfen aus einer Tabelle kommen, solange sie so ungleich sind wie die
  echten (`tests/ui/window-convergence.test.ts` fährt ihn mit den im Browser gemessenen
  Verteilungen und prüft an jeder Scroll-Position Konvergenz, Deckung und die
  Platzhalter-Zusicherung). **Die Arbeitsteilung, die daraus folgt:** der Test beweist, warum
  es nicht fehlschlagen KANN; der Browser beweist, dass es TUT. Belegt am Gegenbeispiel
  (2026-08-09): die Scroll-Wiederherstellung war im Browser grün und im Test rot — sie
  überschrieb ihr eigenes Ziel, nur nicht in dem Moment, in dem hingesehen wurde.
  **Und die Umkehrung gilt nicht:** ein Wächter, dessen Rot-Fall sich nicht konstruieren
  lässt, belegt nicht, dass das Bewachte entbehrlich ist (bei der monotonen Höhenübernahme
  genau so eingetreten — sie bleibt stehen, ihre Rolle ist nur nicht mehr die tragende).

- **TST-26 — Ein Test über eine Umgebungs-Eigenschaft prüft zuerst, dass die Umgebung sie
  hat; und ein Wächter über eine Menge von Kommandos vergleicht seine Liste gegen die
  echte.**
  Zwei Formen desselben stillen Ausfalls, beide an derselben Zusicherung aufgetreten
  (Proxys gehören nicht in die Datenbank, [ADR-v9-241](04-Entscheidungslog.md#adr-v9-241)).
  **(a) Die Umgebung.** `structuredClone` lehnt einen Svelte-Proxy im Browser und unter
  happy-dom ab, unter **node** klont es ihn klaglos (hier nachgemessen; dieselbe Falle
  bereits in [ADR-v9-117](04-Entscheidungslog.md#adr-v9-117) belegt). Eine Datei ohne
  `@vitest-environment happy-dom` hätte dieselben Zusicherungen enthalten und wäre
  vollständig grün gewesen, ohne irgendetwas zu prüfen. Deshalb steht als erste Zusicherung
  eine **Kontrollprobe**, die die Umgebungs-Eigenschaft selbst feststellt — sie wird rot,
  wenn der Docblock verschwindet, statt dass die Fälle darunter still bedeutungslos werden.
  **(b) Die Vollständigkeit.** Ein Wächter, der EINE Zusicherung für N gleichartige
  Kommandos einlöst, ist so viel wert wie seine Liste. Statt sie zu pflegen, wird sie
  gegen die Wirklichkeit gehalten (`Object.keys(appState).filter(k => k.startsWith('save'))`):
  ein neu hinzugefügtes Kommando ohne Testfall macht den Wächter rot. Das ist die
  Testebenen-Entsprechung zum Prüfstein aus
  [ADR-v9-239](04-Entscheidungslog.md#adr-v9-239) — für eine Verfahrensregel den
  mechanischen Boden bauen, statt sie aufzuschreiben.

- **TST-27 — Kein nativer Browser-Dialog in der Haupt-App; per Lint-Gate erzwungen.** `window.confirm` liefert in der Vorschau-Fläche **sofort `false`**, ohne je ein Fenster zu zeigen — jede bestätigungspflichtige Aktion war dort wirkungslos (Nutzer-Befund 2026-08-12, [ADR-v9-263](04-Entscheidungslog.md#adr-v9-263)). Ersatz: `ConfirmDialog.svelte` (ui/shell), Teil des gerenderten Baums. Ausgenommen ist der Standalone-Orte-Editor ([22](22-Orte-Editor-Standalone.md)), der ohne die Shell-Primitiven läuft. **Der eigentliche Lehrsatz steckt in den Tests, nicht im Dialog:** alle 16 Lösch-Tests begannen mit `vi.stubGlobal('confirm', () => true)` und prüften damit alles AUSSER dem Mechanismus, der versagte — die Stub-Zeile ersetzt genau das Stück, um das es geht (Verwandtschaft: TST-22 misst, ob ein Test ROT wird; hier war die Frage, ob er überhaupt das Richtige berührt). Migriert auf `tests/ui/confirm-helper.ts`: die Rückfrage wird **angeklickt** wie von einem Nutzer. Wirkung negativ verifiziert: ein `window.confirm` testweise eingesetzt → Lint rot, zurückgesetzt → grün.

- **TST-28 — Der Verlust-Zensus läuft auch am Realbestand, nicht nur an kuratierten Fixturen.** Die Frage „welcher Text fehlt, nachdem ALLE Records neu gebaut wurden?" war dreifach gebaut (`wire-loss-classes`, `wire-loss-rest`, `wire-value-drift`) — jedes Mal an einer kleinen, eingecheckten Datei, die genau die Konstrukte trägt, an die jemand gedacht hat. Am Realbestand lief zwar ein Wächter über alle Records (`line-length-conc.test.ts`), der prüfte aber nur die **Zeilenlänge**: das Fahrzeug war da, die Zusicherung fehlte. Durch beide Maschen lief [BL-355](05-Backlog.md) — ein Ereigniswert ohne seine `CONC`-Fortsetzung — und hat in einem echten Export des Nutzers 118 Zeichen vernichtet ([ADR-v9-266](04-Entscheidungslog.md#adr-v9-266)). Ergänzung, kein Ersatz: die Fixture-Zensen sind die Zusicherung, die in CI GILT (der Bestand ist gitignored, TST-20/21/23); der Realbestand-Zensus ist der **Finder** für Formen, die keine kuratierte Fixture vorhersieht, und deckt die noch daten-losen Geschwister derselben Klasse (`DATE`/`PLAC`/`TYPE`/`PAGE` mit Fortsetzung) mechanisch mit ab. **Verglichen werden Text-FRAGMENTE, weißraum-frei** — beide Abweichungen sind belegt und keine Verluste: unser Umbruch schneidet nicht neben einem Leerzeichen (drei `TEXT`-Zeilen kommen ein Zeichen LÄNGER zurück, [ADR-v9-211](04-Entscheidungslog.md#adr-v9-211)), und eine Waisen-Fortsetzung im Quelltext rutscht beim Neubau hinter einen anderen Knoten, was die FALTUNG verschiebt, nicht den Inhalt. Ein Wächter, der so etwas als Verlust meldet, wird abgeschaltet. Wirkung negativ verifiziert: den Fix zurückgenommen → der Wächter benennt genau die gekürzte Zeile.

- **TST-29 — Ein Wächter über zwei Listen prüft BEIDE Richtungen; die teurere ist die, in der die Liste hinterherhinkt.** `coverage-spec.test.ts` fragte „ist jeder als modelliert geführte Tag im Spec-Universum verortet?" — das fängt Tippfehler und verkappte Erweiterungen. Es kann nicht fangen, dass die Liste selbst veraltet: ein Tag, den der Parser projiziert, der aber im Nenner fehlt, sieht für den Report wie ein bewusst nicht modellierter aus. [ADR-v9-249](04-Entscheidungslog.md#adr-v9-249) nahm zehn Ereignistags auf, `MODELED_GEDCOM_TAGS` blieb unverändert, und der Report meldete zwei Monate lang **76/135 statt 87/135** (mit `DATA` waren es elf Positionen, [ADR-v9-267](04-Entscheidungslog.md#adr-v9-267)) — eine Coverage-Zahl, die Bauarbeit unterschlägt, verstellt gerade die Priorisierung, für die sie da ist. Zum Vergleich: `event-tag-drift.test.ts` prüft **vier** Richtungen zwischen vier Listen und hat genau deshalb gehalten. **Wo Ableitung nicht möglich ist, ist Containment der Ersatz:** die Coverage-Liste lässt sich nicht aus den Erkennungsmengen erzeugen (sie ist deren Obermenge — auch Kinder wie `GIVN`/`LATI`/`PAGE` sind modelliert), und ein blinder String-Literal-Match über den Projektions-Code liefert Falsch-Positive (der Grund, aus dem `GRAMPS_MODELED` kuratiert ist). Geprüft wird deshalb die eindeutige Richtung: was der Code **beansprucht** (`ERKANNTE_TAGS` ∪ `EVENT_TAGS` ∪ `SPECIAL_EVENT_TAGS`), muss geführt sein. Damit bewegt sich die Zahl mit dem Bau statt mit der Erinnerung. Verwandt: TST-22 (misst, ob ein Test rot wird), TST-28 (Zusicherung fehlte, Fahrzeug war da).

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
| **Skalen/Performance** | NFR-Budgets ([30 §1](30-NFR-und-Persistenz.md)) gegen eine deterministisch erzeugte Groß-Fixture: Parse, Orts-Auflösung, erster Sort | 1 Gate, eigener Lauf | Vitest, eigene Config (`npm run test:perf`) |

**Imperative Inseln** (Baum/Karte/Zeitleiste, [02 §5](02-Zielarchitektur-v9.md)) werden über ihre **Layout-Berechnung** unit-getestet (reine Funktion Modell→Positionen), nicht über gerenderte Pixel.

**Der Standalone-Orte-Editor** ([22](22-Orte-Editor-Standalone.md)) bekommt keine eigene Test-Ebene, sondern ein eigenes Verzeichnis (`tests/orte/`) auf den vorhandenen Ebenen — sein Dokument-Rundlauf ist ein Roundtrip-Test, seine Flächen sind Komponenten-Tests, seine beiden Gates (Import-Verbot, Fork-Guard) laufen im Architektur-Gate mit. Der `PlacesHost`-Vertrag wird als **Kontrakt-Test** geführt: beide Programme erfüllen ihn, geprüft als Typ-Zusicherung und als Laufzeit-Aufruf jedes Kommandos — sonst läuft der Editor an einer stillschweigend erweiterten Schnittstelle vorbei. Komponenten-Tests der Orts-/Hof-Flächen binden gegen einen kleinen `PlacesHost`-Doppelgänger, nicht gegen die Zustandsschale eines Programms.

**Die Skalen-Ebene läuft bewusst NICHT im Standardlauf** (eigene Vitest-Config, aus der Haupt-Config ausgeschlossen): die Groß-Fixture kostet ein Vielfaches aller übrigen Tests zusammen und würde den Pre-Commit-Subset (§7) unbrauchbar machen. Zwei Konsequenzen aus dem Bau: (a) ein Aufruf gegen die Haupt-Config fände durch deren `exclude` **null Tests und meldete grün** — deshalb die eigene Config statt eines Pfad-Arguments; (b) Zeitbudgets allein genügen nicht, jeder Skalen-Test braucht **Plausibilitäts-Zusicherungen** über die verarbeitete Menge (Personen-/Familien-/Hof-Anzahl), sonst zertifiziert er einen Pfad als schnell, der gar nicht gelaufen ist — genau so geschehen, als eine fehlerhafte Fixture 0 Höfe erzeugte. **(c) Eine Mengen-Zusicherung muss die richtige GRÖSSE prüfen, nicht bloße Existenz** (BL-89, [ADR-v9-154](04-Entscheidungslog.md#adr-v9-154)): `placeObjects.size > 0` war jahrelang erfüllt, während die Fixture nur **23** Orte erzeugte — die teuren Auflösungspfade (Konsistenz-Guard 3c, Eltern-Disambiguierung 3c′, Review-Klasse P, [11 §4.2](11-Orte-Hoefe-Identitaet.md)) arbeiten über Kandidatenmengen und liefen damit leer, obwohl der Generator-Kommentar „realistisch schwer" behauptete. Die Untergrenze orientiert sich seither am gemessenen Realbestand (`MIN_DISTINCT_PLACES`), und die Fixture erzwingt die richtige SORTE Schwere: gleichnamige Kandidaten unter widersprüchlichen Verwaltungsketten plus atomare Ereignisse darauf. Die gemessenen Zahlen (Orte, Höfe, mehrdeutige Leitnamen, Review-Zeilen) stehen im Test-Log — die Zahl ist der Nutzen, die Schwelle nur der Wecker.

---

## 3. Werkzeuge (konkret)

- **Vitest** — Kern-Unit + Roundtrip + Property + Snapshot. Nutzt Vite-Transform (TypeScript direkt), läuft in Node → headless, build-frei ([31 §3](31-Dev-Umgebung.md)).
- **fast-check** — property-based Tests für Invarianten (Determinismus, Idempotenz).
- **@testing-library/svelte** + **happy-dom** — Komponenten-Tests der Schale (Svelte 5, [02 §6](02-Zielarchitektur-v9.md)).
- **Playwright** *(optional, minimal)* — 2–3 E2E-Flows in echtem Browser inkl. Offline/PWA-Boot.
- **dependency-cruiser** oder **eslint-plugin-boundaries** — Import-Grenzen-Gate (INV-ARCH-1: Kern importiert nichts von oben).
- **CSP-Scanner** — Portierung von v8 `test-csp.js`: findet inline-Styles/-Handler (LP-8). **Umgesetzt (ADR-v9-39):** `tests/csp/check-csp.mjs`, CI-Gate `npm run check:csp`.
- **a11y-Scanner** (TST-15, LP-8). **Umgesetzt ([ADR-v9-170](04-Entscheidungslog.md#adr-v9-170)):** `axe-core` gegen die bereits vorhandenen Komponententests (`@testing-library/svelte`), CI-Gate `npm run check:a11y` (`tools/a11y/run-a11y.mjs` + `vitest.a11y.config.ts`).
- **Synthetik-Generator** — Portierung von v8 `generate-scale-test.js` (deterministisch, N Personen) für Skalierungs-/Perf-Tests.
- **Mutations-Stichprobe** (TST-22). **Umgesetzt ([ADR-v9-199](04-Entscheidungslog.md#adr-v9-199)):** `tools/mutation/` (Liste `mutationen.mjs`, Lauf `run-mutation.mjs`), Aufruf `npm run test:mutation`, eigener wöchentlicher Workflow `.github/workflows/mutation.yml`. Kein Mutation-Testing-Framework (Stryker & Co. mutieren erschöpfend und brauchen Stunden) — Vollständigkeit über alle Code-Zeilen ist ausdrücklich nicht das Ziel, Vollständigkeit über die benannten Invarianten ist es.

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
- **TST-REUSE:** Vor dem Bau eines neuen synthetischen Test-/Verifikations-Datensatzes IMMER zuerst `app/public/demo.ged` und `tests/fixtures/` auf einen bereits passenden oder erweiterbaren Datensatz prüfen — keinen weiteren Wegwerf-Datensatz für dieselbe Art Verifikation anlegen.

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
| [22](22-Orte-Editor-Standalone.md) | INV-ORTE-1 (geteilte Views unverändert — Import-Verbot + Fork-Guard), INV-ORTE-2 (Kontextdatei verändert das Dokument nicht — serialisierter Vergleich vor/nach), INV-ORTE-3 (Datei ist die einzige Wahrheit — Dokument-Rundlauf „laden → bearbeiten → speichern → erneut laden → identisch", Entwurf verfällt beim Speichern); beide Programme erfüllen `PlacesHost` | Architektur-Gate + Unit + Komponente |
| [30](30-NFR-und-Persistenz.md) | LP-8 (CSP-Scan), Skalierung (Perf-Budget auf 20k-Fixture) | Gate + Perf |

---

## 7. Pre-Commit vs. CI

- **Pre-Commit (lokal, schnell):** Kern-Unit + Roundtrip + CSP-Gate + Import-Grenze. Muss in Sekunden laufen (`npm run test:core`).
- **CI (GitHub Actions, [31 §4](31-Dev-Umgebung.md)):** **alle** Ebenen inkl. Komponenten, Perf und (falls vorhanden) E2E. Rot = kein Deploy.
- **TST-GATE:** Deploy nach GitHub Pages nur bei grüner CI — die Roundtrip-Treue (LP-1) und die Architektur-Grenze (INV-ARCH-1) sind harte Release-Vorbedingung, kein manueller Hook mehr.
- **Dritte Frequenz — wöchentlich:** die Mutations-Stichprobe (TST-22, `npm run test:mutation`). Sie prüft nicht den Code, sondern die Tests, und kostet einen vollen Suitenlauf je Stelle (76 s auf dem Runner gemessen, ~20 min für die heutige Liste — gegen ~4 min für den kompletten Push-Lauf). Sie ändert sich in Wochen, nicht in Commits; ein eigener Job mit `schedule` + `workflow_dispatch` ist die passende Frequenz, kein Schritt im Push-Workflow.

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
- **Komponententests bauen die Verdrahtung in der ECHTEN Mount-Reihenfolge auf** — bei Zustand aus einem Singleton außerhalb des Komponentenbaums also erst rendern, dann verdrahten (Kind-`onMount` läuft vor Wurzel-`onMount`). Ein Test, der die Verdrahtung vorher aufbaut, prüft eine Reihenfolge, die es real nicht gibt: der Offline-Indikator (BL-03, ADR-v9-94) war mit sechs grünen Tests im Browser vollständig tot, weil das `$derived` beim ersten Auswerten den nicht-reaktiven Zweig las und einfror.
- **`.svelte`-Dateien bleiben unter 600 Zeilen** — `max-lines` in `eslint.config.js` erzwingt das automatisch ([05](05-Backlog.md) BL-54). Die dort einzeln eingetragenen Altfälle sind auf ihren Ist-Wert geratscht (schrumpfen erlaubt, wachsen nicht); wer eine davon inhaltlich anfasst, zerlegt sie und streicht ihre Zeile — die Liste ist der Fortschrittsanzeiger, kein Freibrief.

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
