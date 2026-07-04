---
name: decision-log
description: Halte eine tragende Architektur- oder Produktentscheidung als ADR-Eintrag im v9-Entscheidungslog fest. Nutze diesen Skill, sobald eine Entscheidung fällt, die den Bau bindet oder eine Alternative bewusst verwirft (z. B. Framework-Wahl, ein Ansatz wird gewählt/verworfen, eine v8-Praxis aufgegeben) — Trigger wie „das entscheiden wir so", „halt das als Entscheidung fest", „ADR", „Entscheidungslog". Ergänzt specs/v9/04-Entscheidungslog.md.
---

# decision-log

Trägt eine dauerhafte Entscheidung konsistent in `specs/v9/04-Entscheidungslog.md` ein. Abgeleitet daraus, dass v9-Entscheidungen (Ansatz C, OneDrive raus, Nav-Modell, Umgebung) sonst verstreut in Specs + Memory liegen.

## Wann anlegen

Nur für **tragende** Entscheidungen: etwas, das den Bau bindet, eine Invariante setzt oder eine Alternative bewusst verwirft. **Nicht** für Kleinkram oder reine Umsetzungsdetails (die gehören ins jeweilige Subsystem-Spec).

## Eintragsformat

Neue Nummer `ADR-v9-NN` fortlaufend vergeben. Status: ✅ akzeptiert · 🟡 offen/vorläufig · ⛔ verworfen · ♻️ ersetzt.

```
## ADR-v9-NN — <Titel> <Status> · <YYYY-MM-DD>
- **Kontext:** warum die Frage aufkam.
- **Entscheidung:** was entschieden wurde (knapp, präzise).
- **Konsequenz:** was daraus folgt.
- **Verworfen:** bewusst nicht gewählte Alternativen (+ kurzer Grund).
- **Refs:** betroffene Specs [NN](NN-….md).
```

## Ablauf

1. Nächste freie `ADR-v9-NN` ermitteln (`grep "## ADR-v9-" specs/v9/04-Entscheidungslog.md`).
2. Eintrag **ans Ende** anhängen (chronologisch), Format oben, Datum = heute.
3. Wenn die Entscheidung eine frühere ersetzt: alte auf `♻️ ersetzt durch ADR-v9-NN` setzen, neue verweist zurück.
4. Betroffene Subsystem-Specs + `03-Altlasten.md` bei Bedarf angleichen (die Entscheidung ist die Kurzfassung, das Spec die Ausführung).
5. `spec-lint` laufen lassen.

## Grenze

Das Log ist die **Kurz-Begründung**, nicht die Spezifikation. Die ausführliche Regel/Struktur lebt im jeweiligen Subsystem-Spec; der ADR-Eintrag verweist nur darauf.
