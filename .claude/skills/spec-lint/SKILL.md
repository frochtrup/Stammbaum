---
name: spec-lint
description: Prüfe das v9-Spec-Set (specs/v9/) auf Konsistenz. Nutze diesen Skill nach Änderungen an specs/v9/, oder wenn der Nutzer die Kohärenz des Spec-Sets verifizieren will — Trigger wie „prüfe die Specs", „ist das Set konsistent", „spec-lint", „check die Querverweise". Findet tote Links, Index/Datei-Abweichungen, veraltete Status-Zeilen, unreferenzierte oder undefinierte Invarianten, Doku/Code-Drift (legacy-v8 UND aktueller v9-Code) sowie ADR↔Spec-Widersprüche.
---

# spec-lint

Konsistenzprüfung über `specs/v9/`. Abgeleitet aus real gefundener Drift (Doku nannte `bnav-search`, Code hatte `bnav-tasks`; Index/Master ohne Zeilen 31/32).

## Prüfungen

1. **Datei ↔ Index:** jede `specs/v9/*.md` erscheint in `00-Index.md` — in der „Das Set"-Tabelle **und** der Status-Tabelle. Umgekehrt kein Index-Eintrag ohne Datei.
2. **Master-Verweis:** `specs/SPEC-v9-Gesamtsystem.md` listet alle Dokumente.
3. **Links auflösen:** alle Markdown-Links (relative Pfade **und** `#anchor`) zeigen auf existierende Dateien/Überschriften. Keine toten `[[…]]`.
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

## Vorgehen

- Dateien per `ls specs/v9/` enumerieren; IDs/Links per `grep` extrahieren.
- Befunde als Tabelle (Prüfung · Status · Fundstelle) berichten.
- Auf Wunsch direkt fixen (fehlende Index-Zeilen, tote Links) und erneut prüfen.

## Nach dem Fix

Keine automatischen Goldfile-/Statusänderungen ohne Hinweis. Wenn ein bewusster inhaltlicher Widerspruch gefunden wird (nicht nur Tippfehler), dem Nutzer vorlegen statt still „glätten".
