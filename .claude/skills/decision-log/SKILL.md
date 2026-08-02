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

### Pflichtfeld, sobald der ADR eine `INV-…` ändert oder einen Mechanismus abschafft

```
- **Berührte Prinzipien:** <LP-N: wie er dafür/dagegen spricht> · <USP-Punkt: welches Versprechen daran hängt>
```

Zwei Fragen, wörtlich zu beantworten, bevor die Entscheidung steht:

1. **Welches Produktversprechen aus der USP-Liste ([01](../../../specs/v9/01-Vision-und-Prinzipien.md)) hängt an diesem Mechanismus?**
2. **Welcher LP steht der Entscheidung ENTGEGEN?** Nicht welcher sie stützt — der ist schnell gefunden. Gesucht ist die Gegenkraft; findet sich keine, ist die Frage vermutlich zu flach gestellt.

**Warum das ein Pflichtfeld ist (ADR-v9-197 → [ADR-v9-198](../../../specs/v9/04-Entscheidungslog.md#adr-v9-198), 2026-08-02):** ADR-v9-197 schaffte die PLAC-Reprojektion im Ladepass ab und zitierte dafür sorgfältig LP-1 (Roundtrip-Treue). **LP-5 („Re-Derivation *ist* die Persistenz") wurde nicht bemerkt** — obwohl er die Gegenkraft ist: wer die Orts-Zuordnung bei jedem Laden neu berechnet, macht die EINGABE dieser Berechnung (den `PLAC`-Text) zum Teil des Zustands. Folge: eine korrigierte Ortskette wurde beim nächsten Laden nicht wiedererkannt, der Seed legte eine Dublette an — und das USP „Historisch datierte Ortsdarstellung (im Markt einzigartig)" war für diesen Fall weg. Aufgefallen erst durch eine Nutzer-Rückfrage, nicht durch Tests.

**Und die Testanpassung deckt es nicht ab.** CLAUDE.md erlaubt sie „nachdem die Invariante bewusst geändert wurde (dann mit ADR)". Diese Regel war erfüllt und trug trotzdem nicht: der ADR war **selbst geschrieben, aus derselben Sitzung**, und die Freigabe erfolgte auf Basis einer Darstellung, die den Zwang nicht enthielt. **Ein selbst verfasster ADR ist kein unabhängiger Prüfstein** — die Prinzipien-Prüfung ist der Ersatz dafür.

**Faustregel für den mitzuziehenden Test:** Fällt eine Invariante, prüfen die zugehörigen Tests fast immer den **Mechanismus** („Feld X wird gesetzt") — die überleben den Wechsel nicht, sie werden angepasst. Ein **Versprechen-Test** (die Sequenz, die der Nutzer erlebt: kuratieren → speichern → laden → ist es noch da?) überlebt ihn und wird rot. Beim Ändern einer Invariante deshalb prüfen, ob für das berührte USP ein Versprechen-Test existiert — und ihn anlegen, wenn nicht (Muster: `tests/core/place-curation-roundtrip.test.ts`).

## Ablauf

1. Nächste freie `ADR-v9-NN` ermitteln (`grep "## ADR-v9-" specs/v9/04-Entscheidungslog.md`).
2. Eintrag **ans Ende** anhängen (chronologisch), Format oben, Datum = heute.
3. Wenn die Entscheidung eine frühere ersetzt: alte auf `♻️ ersetzt durch ADR-v9-NN` setzen, neue verweist zurück.
3a. **Nachtrag zu einem BESTEHENDEN ADR (Bau-Status, Commit, Testzahlen, Verifikationsbefund, Lehre) → `specs/v9/04a-Chronik.md`, NICHT in den ADR selbst.** Unter der `## ADR-v9-NN`-Überschrift dort anhängen (anlegen, falls sie fehlt), und in `04` die `**Chronik & Lehren:**`-Verweiszeile ergänzen, falls noch nicht vorhanden. **Grund (Split 2026-07-16):** ein ADR beantwortet „was gilt?", ein Nachtrag „wie lief der Bau?" — zusammengeschrieben wuchs ADR-v9-78 auf 20k Zeichen (57% Chronik) und war am Stück unlesbar. Ein ADR-Eintrag in `04` bleibt bei ~4k Zeichen; wird er größer, gehört der Zuwachs fast immer nach `04a`. Die Entscheidung selbst wird nie umgeschrieben — ändert sie sich, ist das ein NEUER ADR (Schritt 3). **Gilt auch beim direkten Hand-Edit an `04` (nicht nur beim Skill-Lauf):** kein Bullet `- **Nachtrag…`/`- **Bau-Stand…`/`- **Korrektur…` und keine Testzahlen/Commit-Hashes inline in `04` — sonst kehrt genau die ADR-78-Blähung zurück (real wieder passiert bei ADR-124/125, 2026-07-26, danach nach 04a verschoben). Merkregel: enthält der Zusatz ein Datum „(2026-…)" oder eine Testzahl, gehört er nach `04a`.
4. **Ziel-Spec im selben Zug angleichen — Pflicht, nicht „bei Bedarf".** Für **jedes** Dokument in `Refs:` prüfen: Ändert der ADR, was dieser Abschnitt *vorschreibt*? Dann den Abschnitt **im selben Commit** korrigieren — der Text darf der Entscheidung nicht mehr widersprechen. Insbesondere: die unter **Verworfen** genannte Alternative darf **nicht** mehr als Vorgabe/Beispiel im Ziel-Abschnitt stehenbleiben (genau diese Sorte Drift verursachte die 31-Dev-Umgebung-Funde 2026-07-05: ADR-v9-07/-10 entschieden, aber §3/§4/§8 nannten noch die verworfene Variante). Gilt auch für `03-Altlasten.md`.
4a. **Ändert der ADR eine `INV-…` oder schafft er einen Mechanismus ab: das Pflichtfeld „Berührte Prinzipien" ausfüllen** (s. Eintragsformat) — beide Fragen wörtlich beantworten, bevor die Entscheidung steht, nicht danach als Begründung. Fällt dabei ein USP-Punkt auf, für den es keinen Versprechen-Test gibt, gehört er in denselben Zug oder in eine Backlog-Zeile.
5. `spec-lint` laufen lassen (fängt tote Links/Index-Drift; die semantische ADR↔Spec-Konsistenz aus Schritt 4 muss der Mensch/Agent selbst herstellen — spec-lint sieht sie nur teilweise).

## Grenze

Das Log ist die **Kurz-Begründung**, nicht die Spezifikation. Die ausführliche Regel/Struktur lebt im jeweiligen Subsystem-Spec; der ADR-Eintrag verweist nur darauf. **Aber:** verweist ≠ widerspricht — der Ziel-Abschnitt muss die Entscheidung *tragen*, nicht ihr entgegenstehen (Schritt 4).
