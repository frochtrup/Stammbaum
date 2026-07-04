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

## Tests

Kern-Tests headless & build-frei (Vitest, [32](specs/v9/32-Testframework.md)). **Jede `INV-…`/`LP-…` hat einen Test (TST-2).** Pre-Commit = schneller Kern-Subset; CI = alle Ebenen, Deploy nur bei grün.
*(Hinweis: der aktuelle Git-Pre-Commit-Hook läuft noch die v8-Tests — für v9-Doku-Commits unschädlich; wird beim Repo-Umzug durch das Vitest-/CI-Gate ersetzt.)*

## Stack (entschieden)

UI-Schale: **Svelte 5 + Vite** (kein SvelteKit); Domänenkern framework-frei ([02](specs/v9/02-Zielarchitektur-v9.md)). Tests: Vitest + `@testing-library/svelte` ([32](specs/v9/32-Testframework.md)). Einmalige Voraussetzung: Node.js. **Baubeginn kann starten.**

## Projektpfad (aktuell, transitorisch)

`/Users/franzdecker/Library/Mobile Documents/com~apple~CloudDocs/Genealogie/AppDev/files/`
