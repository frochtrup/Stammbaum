---
name: spec-lint
description: Prüfe das v9-Spec-Set (specs/v9/) auf Konsistenz. Nutze diesen Skill nach Änderungen an specs/v9/, oder wenn der Nutzer die Kohärenz des Spec-Sets verifizieren will — Trigger wie „prüfe die Specs", „ist das Set konsistent", „spec-lint", „check die Querverweise". Findet tote Links, Index/Datei-Abweichungen, veraltete Status-Zeilen, unreferenzierte oder undefinierte Invarianten und Doku/Code-Drift.
---

# spec-lint

Konsistenzprüfung über `specs/v9/`. Abgeleitet aus real gefundener Drift (Doku nannte `bnav-search`, Code hatte `bnav-tasks`; Index/Master ohne Zeilen 31/32).

## Prüfungen

1. **Datei ↔ Index:** jede `specs/v9/*.md` erscheint in `00-Index.md` — in der „Das Set"-Tabelle **und** der Status-Tabelle. Umgekehrt kein Index-Eintrag ohne Datei.
2. **Master-Verweis:** `specs/SPEC-v9-Gesamtsystem.md` listet alle Dokumente.
3. **Links auflösen:** alle Markdown-Links (relative Pfade **und** `#anchor`) zeigen auf existierende Dateien/Überschriften. Keine toten `[[…]]`.
4. **Invarianten-Bilanz:** jede definierte `INV-…`/`LP-…`/`RT-…`/`TST-…` wird ≥1× referenziert; jede *referenzierte* ID ist auch irgendwo definiert. (Per `grep` beide Mengen bilden und abgleichen.)
5. **Abhängigkeitsgraph:** jedes Dokument taucht im Graphen von `00-Index.md` auf; die dort genannten Abhängigkeiten stimmen mit den Header-Zeilen (`> Abhängig von: …`) überein.
6. **Doku/Code-Drift (Stichprobe):** bei konkreten Behauptungen über den v8-Code (Dateinamen, Tab-IDs, Feldnamen) gegen die echten Dateien gegenprüfen — nicht gegen Memory.

## Vorgehen

- Dateien per `ls specs/v9/` enumerieren; IDs/Links per `grep` extrahieren.
- Befunde als Tabelle (Prüfung · Status · Fundstelle) berichten.
- Auf Wunsch direkt fixen (fehlende Index-Zeilen, tote Links) und erneut prüfen.

## Nach dem Fix

Keine automatischen Goldfile-/Statusänderungen ohne Hinweis. Wenn ein bewusster inhaltlicher Widerspruch gefunden wird (nicht nur Tippfehler), dem Nutzer vorlegen statt still „glätten".
