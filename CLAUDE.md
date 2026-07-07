# Stammbaum — Claude-Anweisungen (v9)

Spezifikationsgetriebener Neuaufsatz. Der v8-Stand (Code in diesem Repo) ist **eingefrorene Referenz + Verhaltens-Orakel** — er wird nicht mehr weiterentwickelt. Der eigentliche v9-Bau zieht in ein eigenes lokales Repo um (siehe `specs/v9/31-Dev-Umgebung.md`), **nicht** in iCloud (INV-DEV-1).

## Aktiver Branch

`v9-dev`. Auf `v9-dev` committen; nach `main` nur per PR mit grüner CI.
*(v8-Branches `main`/`v8-dev` behalten ihre eigenen, v8-spezifischen Regeln — dieser Datei-Stand gilt nur auf `v9-dev`.)*

## Spezifikation = Quelle der Wahrheit

Das v9-System ist vollständig in `specs/v9/` spezifiziert. **Einstieg: `specs/v9/00-Index.md`.**

- **Vor jeder Änderung** das betroffene Subsystem-Spec lesen, dann handeln.
- Code widerspricht Spec → die **Spec gewinnt** (oder die Spec bewusst zuerst ändern).
- Entscheidungen von Tragweite → im **Entscheidungslog `specs/v9/04-Entscheidungslog.md`** festhalten (Skill `decision-log`).

## Skills (`.claude/skills/`, greifen automatisch)

- `altlast-audit` — v8-Bereich am echten Code prüfen → v9-Modell planen → Altlast §N
- `spec-new` — neues Subsystem-Spec anlegen + vollständig ins Set verdrahten
- `spec-lint` — Konsistenz des Spec-Sets prüfen
- `roundtrip-verify` — GEDCOM/GRAMPS-Roundtrip (`net_delta=0`) headless
- `decision-log` — Entscheidung als ADR-Eintrag festhalten

## Kern-Disziplin (nicht verhandelbar)

- **Am echten Code verifizieren, nicht aus Memory/Doku zitieren** — Docs driften (belegt).
- **Roundtrip-Treue (LP-1):** nach jeder Parser-/Writer-/Serializer-Änderung `roundtrip-verify`; `net_delta≠0` **nie** per Goldfile-Update übertünchen.
- **Vereinfachen vor Erfinden:** zuerst fragen, was den Zweck mit *weniger* Mechanismus löst.
- **Schicht-Invarianten ([02](specs/v9/02-Zielarchitektur-v9.md)):** INV-ARCH-1 (Abhängigkeiten nur nach unten; Kern DOM-/Framework-frei), INV-ARCH-2 (Kern build-frei testbar).
- **Delegierte UI-/Insel-Bauabschnitte selbst gegenprüfen:** nach jeder Agenten-Delegation mit sichtbarer UI-Änderung eine eigene, unabhängige Browser-Verifikation (Screenshot/Snapshot/Inspect) fahren, bevor die Aufgabe als abgeschlossen gemeldet wird — der Agentenbericht allein reicht nicht (Lehre 2026-07-05: doppelte Kopfzeile + inkonsistenter Segment-Stil wurden vom Nutzer entdeckt, nicht vom Bauagenten selbst oder von mir vorab).
- **Eigene Verifikation mit frischem Server, nach jedem Agenten-Lauf:** einen bereits laufenden, wiederverwendeten Preview-Server vor der eigenen Prüfung stoppen und neu starten — ein lange laufender/von mehreren Agenten geteilter Server kann HMR-Leichen zurücklassen, die zu falschen Navigations-/Zustandsfehlern führen (Lehre 2026-07-06: zwei parallel arbeitende UI-Agenten am selben Browser-Tab verursachten Race-Conditions, die erst mit einem frischen Server verschwanden). Bei zwei parallelen UI-Agenten-Aufträgen: möglichst unterschiedliche Dateien zuweisen, nicht denselben View gleichzeitig anfassen lassen.
- **Task-Notification ohne Abschlussbericht → sofort Repo-Zustand prüfen, nicht als „nichts passiert" werten:** trifft ein delegierter Agent das Ausgaben-Limit, enthält die Benachrichtigung nur eine Fehlermeldung statt der gewohnten Zusammenfassung — der Agent kann trotzdem bereits einen erheblichen, ggf. kaputten Zwischenstand hinterlassen haben (unfertige Verdrahtung, fehlende Tests, Referenzfehler). `git status`/`npm test` sofort prüfen; kleine Lücken selbst schließen statt einen weiteren Agenten mit demselben unvollständigen Kontext zu beauftragen (Lehre 2026-07-06/07).
- **Oracle vs. Spec ist ein zweischneidiges Schwert ([32 TST-6](specs/v9/32-Testframework.md)):** weder das gesamte v8-Verhalten eines Feature-Bereichs blind nachbauen (reproduziert die evolutionär gewachsene Form, die der Neuaufsatz auflösen soll) noch alles im Spec-Bullet nicht explizit Genannte automatisch als außer Scope behandeln (verliert genealogisch relevante Information still, s. ADR-v9-23/24/27). Diskrepanzen zwischen knappem Spec-Text und reichhaltigem Oracle-Feature explizit benennen, nicht in eine Richtung auflösen.

## Tests

Kern-Tests headless & build-frei (Vitest, [32](specs/v9/32-Testframework.md)). **Jede `INV-…`/`LP-…` hat einen Test (TST-2).** Pre-Commit = schneller Kern-Subset; CI = alle Ebenen, Deploy nur bei grün.
*(Hinweis: der aktuelle Git-Pre-Commit-Hook läuft noch die v8-Tests — für v9-Doku-Commits unschädlich; wird beim Repo-Umzug durch das Vitest-/CI-Gate ersetzt.)*

## Stack (entschieden)

UI-Schale: **Svelte 5 + Vite** (kein SvelteKit); Domänenkern framework-frei ([02](specs/v9/02-Zielarchitektur-v9.md)). Tests: Vitest + `@testing-library/svelte` ([32](specs/v9/32-Testframework.md)). Einmalige Voraussetzung: Node.js. **Baubeginn kann starten.**

## Projektpfade

- **Spec-Repo (dieses Repo):** `/Users/franzdecker/Documents/GitHub/Stammbaum`.
- **v9-Code-Repo (Baufortschritt):** `/Users/franzdecker/dev/stammbaum-v9` (separates Git-Repo, `INV-DEV-1`/ADR-v9-08 — außerhalb iCloud). Bau-Agenten arbeiten dort.
- **v8-Original (eingefroren, nur Referenz):** `/Users/franzdecker/Library/Mobile Documents/com~apple~CloudDocs/Genealogie/AppDev/files/`.
