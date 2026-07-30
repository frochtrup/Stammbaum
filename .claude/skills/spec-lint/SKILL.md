---
name: spec-lint
description: Prüfe das v9-Spec-Set (specs/v9/) auf Konsistenz. Nutze diesen Skill nach Änderungen an specs/v9/, oder wenn der Nutzer die Kohärenz des Spec-Sets verifizieren will — Trigger wie „prüfe die Specs", „ist das Set konsistent", „spec-lint", „check die Querverweise". Findet tote Links, Index/Datei-Abweichungen, veraltete Status-Zeilen, unreferenzierte oder undefinierte Invarianten, Doku/Code-Drift (legacy-v8 UND aktueller v9-Code) sowie ADR↔Spec-Widersprüche.
---

# spec-lint

Konsistenzprüfung über `specs/v9/`. Abgeleitet aus real gefundener Drift (Doku nannte `bnav-search`, Code hatte `bnav-tasks`; Index/Master ohne Zeilen 31/32).

## Prüfungen

1. **Datei ↔ Index:** jede `specs/v9/*.md` erscheint in `00-Index.md` — in der „Das Set"-Tabelle **und** der Status-Tabelle. Umgekehrt kein Index-Eintrag ohne Datei.
2. **Master-Verweis:** `specs/SPEC-v9-Gesamtsystem.md` listet alle Dokumente.
3. **Links auflösen (mechanisch):**

   ```
   node .claude/skills/spec-lint/check-anchors.mjs
   ```

   Prüft jede Sprungmarke (`](datei.md#anker)` und `](#anker)`) in `specs/**/*.md` + `CLAUDE.md` gegen die Anker, die die Zieldatei tatsächlich anbietet. Exit 0 = alle auflösbar. Relative Pfade **ohne** Anker und `[[…]]` bleiben Handarbeit.

   **Die Slug-Regel wird nicht nachgebaut, sondern benutzt** (`github-slug-regex.mjs`, wörtlich aus `github-slugger@2.0.0`): eine selbstgeschriebene Näherung hat 2026-07-19 in beide Richtungen falsch gemeldet. Die Äquivalenz zum echten Paket ist über alle 327 Überschriften des Repos geprüft (0 Abweichungen), nicht behauptet.

   **Zwei Anker-Arten**, weil GitHub den Slug aus dem VOLLEN Überschriftentext bildet: Überschriften-Slugs — und explizite `<a id="…"></a>`-Zeilen davor, wo der Slug sonst lang und brüchig wäre. Jede ADR-Überschrift trägt seit BL-84 ihren Kurzanker (`#adr-v9-101`), der vorher 21× ins Leere zeigte; ebenso `#17-orte-tab`/`#18-höfe-tab` in [20](../../../specs/v9/20-Funktionen.md), deren Überschriften einen nachgestellten Link tragen, der sonst mit in den Anker wandert.
4. **Invarianten-Bilanz:** jede definierte `INV-…`/`LP-…`/`RT-…`/`TST-…` wird ≥1× referenziert; jede *referenzierte* ID ist auch irgendwo definiert. (Per `grep` beide Mengen bilden und abgleichen.)
5. **Abhängigkeitsgraph:** jedes Dokument taucht im Graphen von `00-Index.md` auf; die dort genannten Abhängigkeiten stimmen mit den Header-Zeilen (`> Abhängig von: …`) überein.
6. **Doku/Code-Drift — legacy-v8 (Stichprobe):** bei konkreten Behauptungen über den v8-Code (Dateinamen, Tab-IDs, Feldnamen) gegen die echten Dateien in `legacy-v8/` gegenprüfen — nicht gegen Memory.
7. **Doku/Code-Drift — aktueller v9-Code (Stichprobe, cross-repo):** Der v9-Code lebt in einem **separaten** Repo (`~/dev/stammbaum-v9`, s. `specs/v9/31-Dev-Umgebung.md` §1) — dieses spec-lint läuft im Spec-Repo und sieht ihn nur, wenn der Pfad erreichbar ist. Ist er es (`test -d ~/dev/stammbaum-v9`), ein paar **hochwertige, konkrete Anker** gegenprüfen, an denen die Spec den echten Code *vorschreibt* — genau die Sorte, die 2026-07-05 in 31-Dev-Umgebung gedriftet war:
   - `package.json`-Scriptnamen/-inhalte gegen `31 §3` (`check:arch`/`lint`/`test` …).
   - `.github/workflows/ci.yml`-Job-Schritte gegen `31 §4`.
   - Top-Level-Verzeichnisse + Schlüsseldateien (`eslint.config.js`, `tests/arch-boundary/…`, `app/public/demo.ged`) gegen `31 §2`.
   - Kein Voll-Abgleich — nur diese wenigen Anker. Ist der Pfad nicht erreichbar, diese Prüfung als „übersprungen (Code-Repo nicht sichtbar)" vermerken, nicht stillschweigend auslassen.
8. **ADR ↔ Spec-Widerspruch (semantisch, Mensch-assistiert):** Für jeden **✅**-ADR in `specs/v9/04-Entscheidungslog.md` die in `Refs:` genannten Abschnitte darauf ansehen, ob die unter **Verworfen** genannte Alternative dort noch als **Vorgabe/Beispiel** steht (der ADR überstimmt die Spec still statt sie zu ändern). Voll-automatisch ist das nicht prüfbar; als Heuristik: markante Begriffe der verworfenen Alternative (Tool-Name, Ansatz) im Ziel-Abschnitt `grep`en und die Treffer im Kontext beurteilen. Ein „Vorgabe/Entwurf"-markierter Abschnitt, dessen Subsystem längst **gebaut** ist, ist ein Drift-Kandidat (die Vorschrift wurde nach dem Bau nie mit der Realität abgeglichen).
9. **Selbstwiderspruch bei mehrteiligen Sitzungs-Ergänzungen (Mensch-assistiert, Lehre ADR-v9-48):** Wurde DERSELBE Abschnitt in einer Sitzung über mehrere Gesprächsrunden hinweg wiederholt erweitert (z. B. ein §-Abschnitt, der über drei/vier ADRs hinweg wächst), reicht das Gegenlesen des jeweils letzten Diffs nicht — jede Einzeländerung kann lokal plausibel wirken und trotzdem der vorherigen widersprechen. Den ganzen betroffenen Abschnitt **am Stück** lesen, nicht nur den Diff. Konkrete Musterfälle, auf die zu achten ist: (a) zwei konkurrierende „es gibt N Fälle/Stellen/Mechanismen"-Aufzählungen im selben Abschnitt (eine neu hinzugefügt, eine ältere stehengelassen, beide über dieselbe Sache, aber mit unterschiedlicher Zählung/Struktur); (b) widersprüchliche Funktionssignaturen für dieselbe Funktion im selben Absatz (z. B. einmal als zwei getrennte Funktionen benannt, einen Satz später als eine Funktion mit Parameter beschrieben). Beide Muster wurden in [11 §3](../../../specs/v9/11-Orte-Hoefe-Identitaet.md)/§9.2 real gefunden, erst durch einen dedizierten Voll-Durchlauf, nicht beim Schreiben selbst.

10. **Backlog-Status ↔ Code (mechanisch, ZUERST ausführen):**

    ```
    node .claude/skills/spec-lint/check-backlog.mjs            # L1–L8
    node .claude/skills/spec-lint/check-backlog.mjs --selftest  # prüft den Prüfer
    ```

    Wertet jede Zeile **beider Statusdateien** — `specs/v9/05-Backlog.md` (Hauptprogramm, `BL-n`) und `specs/v9/05a-Backlog-Orte-Editor.md` (Standalone-Orte-Editor, `OE-n`) — gegen den echten Code aus (Beleg-Syntax dort dokumentiert). **L1** „offen, aber Beleg trifft" und **L2** „gebaut, aber Beleg trifft nicht" sind Fehler (Exit 1); **L3** zählt Status-Wörter in den Specs 10–32 gegen eine Ratsche (seit BL-50 auf **0** — nie wieder anheben); **L4** warnt bei unauflösbaren Spec-Links; **L5** prüft, ob die Zeile im Abschnitt steht, der zu ihrem Status passt (`offen` → „Offene Punkte", `gebaut` → „Erledigte Punkte"); **L6** hält die Regel-Tabelle in `05-Backlog.md` und die Implementierung deckungsgleich; **L7** hält die Zahl der `[S]`/`[E]`-Bullets in Spec 20 gegen die Ratsche `SE_BULLETS` (30 seit BL-206/ADR-v9-148, zuvor 29 seit BL-51); **L8** prüft, ob der Beleg-Pfad einer Zeile in den Zuständigkeitsbereich ihrer Statusdatei fällt (`app-orte/`, `tests/orte/` → 05a, alles andere → 05). Exit 0 = konsistent.

    **L8 ist die Bedingung, unter der die zweite Statusdatei überhaupt zulässig ist** (ADR-v9-164). Eine Aufteilung „je Programm eine Datei" ohne Prüfung wäre eine Vereinbarung — also genau die Sorte Zusage, die das Backlog ersetzt hat. Die Grenze wird deshalb gerechnet, nicht beurteilt: der Beleg-Pfad entscheidet, nicht das Thema. Ein Vorhaben über beide Bereiche wird in zwei Zeilen zerlegt (Regel 2: kein „teilweise"). Ergänzend ist der Fall „Tabelle vorhanden, aber keine Zeile erkannt" ein harter Fehler — sonst meldete ein falscher ID-Präfix „konsistent", ohne dass etwas geprüft wurde.

    **L7 ist die Lehre aus einem unerfüllbaren Beleg.** BL-51 („Inventur vervollständigen") trug `!txt:noch nicht.{0,20}inventarisiert@specs/v9/05-Backlog.md` — ein negierter Text-Beleg auf die Datei, in der er selbst steht. Das Muster stand damit in seiner eigenen Beleg-Zelle und konnte nie abwesend sein; die Zeile war strukturell nicht abschließbar, ohne dass irgendetwas anschlug. **Kein `!txt:`-Beleg darf auf `05-Backlog.md` selbst zeigen.** Der Ersatz macht aus der Doku-Aussage einen Wächter: die Bullet-Zahl ändert sich genau dann, wenn jemand ein Feature ins Spec schreibt — und stellt in diesem Moment die Frage nach der Backlog-Zeile.

    **L6 ist die Regel gegen diese Datei hier.** Die Regeln stehen an drei Stellen — Implementierung, dieser Abschnitt und die Tabelle „Lint-Regeln" in `05-Backlog.md`. Beim Nachrüsten von L5 wurden zwei davon sofort vergessen; damit verletzte ausgerechnet die Regel-Doku die Regel 1 des Backlogs („Zeiger, kein Inhalt — sonst driften zwei Fassungen auseinander"). L6 leitet die implementierten Regeln aus dem EIGENEN Quelltext ab (keine gepflegte Liste, die man vergessen kann) und vergleicht sie in beide Richtungen mit der Tabelle. Diesen Abschnitt hier deckt L6 NICHT ab — er bleibt Prosa und damit in deiner Verantwortung.

    **Warum L5 nachgerüstet wurde (Nutzer-Fund 2026-07-18):** BL-01 war fertig und trug korrekt den Status `gebaut` — blieb aber unter „Offene Punkte" stehen, weil beim Erledigen nur das Status-Wort geändert und die Zeile nicht verschoben wurde. L1/L2 vergleichen Status gegen Beleg, beides passte, der Prüfer meldete vier Läufe lang „konsistent". Aufgefallen ist es erst beim Lesen auf GitHub: dort ist die Statusspalte die achte und liegt außerhalb des Sichtfelds — sichtbar ist die Überschrift. Eine Zeile, die man nur durch Scrollen als erledigt erkennt, ist praktisch nicht erledigt.

    Zwei Eigenheiten, die beim Bau erzwungen wurden und nicht „vereinfacht" werden dürfen: das Skript liest alle Dateien **selbst statt per `grep`** (das lokale ugrep liefert auf manchen Dateien still ein leeres Ergebnis — belegt an `core/places/curation.ts`), und eine **unbekannte Beleg-Art wirft**, statt still `false` zu liefern (ein Lint, der stillschweigend nichts findet, ist schlimmer als keiner). Der `--selftest` deckt genau diese Fälle ab; er ist vor jeder Änderung am Skript zu laufen.

    **Der Selbsttest läuft seit BL-04 bei JEDEM Lauf mit** — nicht mehr nur auf `--selftest`. Grund: dieselbe Verrottung ist **dreimal** passiert, immer nach demselben Muster (ein Testfall hängt an einer Produktivdatei, ein späteres Feature verändert sie, der Fall schlägt danach still fehl):

    | Fall | hing an | wahr geworden durch | gefunden |
    |---|---|---|---|
    | „geskippter Test trifft nicht" | `tests/perf/scale.perf.test.ts` | BL-47 (entskippt) | 2026-07-18, bei L5 |
    | „datei: fehlende Datei" | `app/public/sw.js` | BL-02 (Service Worker gebaut) | 2026-07-18, bei BL-04 |
    | „txt: Muster nicht im Rohtext" | `eslint.config.js` | BL-54 (max-lines eingetragen) | 2026-07-18, bei BL-04 |
    | „txt: findet Kommentar" | `ui/views/timeline/TimelineLensView.svelte` | BL-53 (Kommentar-Rest entfernt) | 2026-07-21, **sofort im Normallauf** |

    Alle vier hängen jetzt an eigenen Vorlagen unter `fixtures/`, die sich nicht unter den Füßen des Prüfers verändern. Die eigentliche Lehre ist aber die zweite: die bisherige Absicherung war **ein Satz in dieser Datei** („wer den Prüfer anfasst, ruft ihn auf") — also Erinnerung statt Zwang, und sie hat zweimal nicht gehalten. Ein fehlschlagender Selbsttest lässt den Normallauf jetzt mit Exit 1 enden; die Ausgabe erscheint nur im Fehlerfall. Wirkung negativ verifiziert (einen Fall absichtlich kaputtgemacht → Exit 1, zurückgesetzt → Exit 0), nicht nur behauptet.

11. **04↔04a-Split (mechanisch, BL-161):**

    ```
    node .claude/skills/spec-lint/check-adr-split.mjs
    node .claude/skills/spec-lint/check-adr-split.mjs --selftest   # prüft den Prüfer
    ```

    Schlägt an, sobald `04-Entscheidungslog.md` einen **Nachtrag-Anführer** inline trägt (Überschrift/Listenpunkt/Blockzitat, dessen fettes Leit-Label Nachtrag/Bau-Stand/Korrektur/… ist) — die Regel aus `decision-log` Schritt 3a, jetzt als Zwang statt Erinnerung (per Hand-Edit an `04` wurde sie umgangen, real bei ADR-124/125). Der Selbsttest läuft bei jedem Lauf mit (wie L1–L7 in check-backlog). **Bewusst NICHT mechanisch** ist die Merkregel „Datum/Testzahl/Commit inline": diese Signale stehen pervasiv in legitimer `Konsequenz:`-/`Kontext:`-/`Befund:`-Substanz — ein Blanko-Gate darauf wäre binnen einer Sitzung abgeschaltet; sie bleiben der Mensch-assistierten Ebene (Prüfung 8/9). Der Kopfkommentar des Skripts begründet den Schnitt am konkreten Falsch-Positiv-Fall (`**Selbstkorrektur vor der Arbeit:**`).

12. **v8-Altlast-Drift bei Orakel-abgeleiteten Backlog-Items (Mensch-assistiert, Lehre BL-206/ADR-v9-148):** Die Kleinlücken-Inventur BL-195…213 ist vollständig aus dem v8-Orakel abgeleitet — ein Nährboden dafür, eine bereits abgeschaffte v8-Form still zurückzuholen (BL-206 wollte wörtlich Altlast §10 nachbauen). **Heuristik, VOR dem Bau eines solchen Items, nicht danach:** die noch offenen Backlog-Zeilen mit „v8-Orakel" im Text auflisten (`grep -n "v8-Orakel" specs/v9/05-Backlog.md`, Status `offen`), und für jede prüfen, ob die von ihr vorgeschriebene FORM eine benannte Altlast aus [03-Altlasten.md](../../../specs/v9/03-Altlasten.md) oder eine `INV-…` verletzt. Trifft es zu: nicht bauen, sondern das Bedürfnis behalten / die Form neu fassen (ADR) — s. den CLAUDE.md-Kern-Disziplin-Bullet dazu. **Bewusst NICHT mechanisch:** ob eine v8-Form eine Altlast reproduziert, ist semantisch (die Zuordnung Glyphenreihe→§10 kennt kein Skript) — ein Blanko-Gate auf „nennt v8-Orakel" wäre reines Rauschen (die meisten Orakel-Items sind harmlos). Diese Prüfung benennt nur die Fläche; das Urteil bleibt beim Menschen.

## Vorgehen

- **Zuerst die mechanischen Prüfungen 3/10/11 laufen lassen** (Sekunden) — erst danach die Mensch-assistierten Prüfungen 6/8/9.
- Dateien per `ls specs/v9/` enumerieren; IDs/Links per `grep` extrahieren.
- Befunde als Tabelle (Prüfung · Status · Fundstelle) berichten.
- Auf Wunsch direkt fixen (fehlende Index-Zeilen, tote Links) und erneut prüfen.

## Nach dem Fix

Keine automatischen Goldfile-/Statusänderungen ohne Hinweis. Wenn ein bewusster inhaltlicher Widerspruch gefunden wird (nicht nur Tippfehler), dem Nutzer vorlegen statt still „glätten".
