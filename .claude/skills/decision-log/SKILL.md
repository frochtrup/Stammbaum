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
3a. **Nachtrag zu einem BESTEHENDEN ADR (Bau-Status, Commit, Testzahlen, Verifikationsbefund, Lehre) → `specs/v9/04a-Chronik.md`, NICHT in den ADR selbst.** Unter der `## ADR-v9-NN`-Überschrift dort anhängen (anlegen, falls sie fehlt), und in `04` die `**Chronik & Lehren:**`-Verweiszeile ergänzen, falls noch nicht vorhanden. **Grund (Split 2026-07-16):** ein ADR beantwortet „was gilt?", ein Nachtrag „wie lief der Bau?" — zusammengeschrieben wuchs ADR-v9-78 auf 20k Zeichen (57% Chronik) und war am Stück unlesbar. Ein ADR-Eintrag in `04` bleibt bei ~4k Zeichen; wird er größer, gehört der Zuwachs fast immer nach `04a`. Die Entscheidung selbst wird nie umgeschrieben — ändert sie sich, ist das ein NEUER ADR (Schritt 3).
4. **Ziel-Spec im selben Zug angleichen — Pflicht, nicht „bei Bedarf".** Für **jedes** Dokument in `Refs:` prüfen: Ändert der ADR, was dieser Abschnitt *vorschreibt*? Dann den Abschnitt **im selben Commit** korrigieren — der Text darf der Entscheidung nicht mehr widersprechen. Insbesondere: die unter **Verworfen** genannte Alternative darf **nicht** mehr als Vorgabe/Beispiel im Ziel-Abschnitt stehenbleiben (genau diese Sorte Drift verursachte die 31-Dev-Umgebung-Funde 2026-07-05: ADR-v9-07/-10 entschieden, aber §3/§4/§8 nannten noch die verworfene Variante). Gilt auch für `03-Altlasten.md`.
5. `spec-lint` laufen lassen (fängt tote Links/Index-Drift; die semantische ADR↔Spec-Konsistenz aus Schritt 4 muss der Mensch/Agent selbst herstellen — spec-lint sieht sie nur teilweise).

## Grenze

Das Log ist die **Kurz-Begründung**, nicht die Spezifikation. Die ausführliche Regel/Struktur lebt im jeweiligen Subsystem-Spec; der ADR-Eintrag verweist nur darauf. **Aber:** verweist ≠ widerspricht — der Ziel-Abschnitt muss die Entscheidung *tragen*, nicht ihr entgegenstehen (Schritt 4).
