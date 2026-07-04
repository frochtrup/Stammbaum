# Stammbaum — v9 (spezifikationsgetriebener Neuaufsatz)

Genealogie-Editor als Progressive Web App (iPhone/iPad + Desktop), vollständig im Browser — keine Installation, kein Server, keine Cloud-Pflicht.

Dieses Repository befindet sich im **Neuaufsatz (v9)** auf Basis eines modularen Spezifikations-Sets. Der bewährte Funktions- und Datenstand von **Version 8** ist als eingefrorene Referenz + Verhaltens-Orakel in [`legacy-v8/`](legacy-v8/) erhalten.

## Struktur

```
specs/v9/          ← das v9-Spezifikations-Set (Quelle der Wahrheit)
  00-Index.md        Einstieg: Lesereihenfolge, Abhängigkeitsgraph, Status
CLAUDE.md          ← Arbeitsanweisungen (wird von der Claude-App automatisch gelesen)
.claude/skills/    ← Projekt-Skills (altlast-audit, spec-new, spec-lint, roundtrip-verify, decision-log)
legacy-v8/         ← eingefrorene v8-Codebasis: Referenz + Roundtrip-Orakel (nicht weiterentwickelt)

GEDCOM.md · ARCHITECTURE.md · DATAMODEL.md · UI-DESIGN.md · CHANGELOG.md · ROADMAP.md
                   ← v8-Detail-Referenz, auf die die Specs verweisen
```

## Einstieg

1. **[specs/v9/00-Index.md](specs/v9/00-Index.md)** lesen — Vision, Zielarchitektur, Subsysteme.
2. Arbeit ist **spec-first**: vor jeder Änderung das betroffene Subsystem-Spec lesen; die Spec gewinnt bei Widerspruch zum Code (siehe [`CLAUDE.md`](CLAUDE.md)).
3. Umgebung: lokal (nicht iCloud), in der Claude-Desktop-App öffnen; GitHub = Quelle + CI; GitHub Actions = Test/Build/Deploy (siehe [specs/v9/31-Dev-Umgebung.md](specs/v9/31-Dev-Umgebung.md)).

## Status

Spezifikation vollständig (Meta/Kern/App/Betrieb + Testframework + Entscheidungslog). Offene Vorbedingung vor Baubeginn: **UI-Framework-Wahl** (ADR-v9-09 in [specs/v9/04-Entscheidungslog.md](specs/v9/04-Entscheidungslog.md)).

## Das v8-Orakel

`legacy-v8/` enthält die vollständige, lauffähige v8-App inkl. Tests. Es dient dem v9-Bau als **Roundtrip-Paritäts-Orakel** (der neue Kern muss `net_delta=0` / dieselben Ergebnisse liefern). Details: [`legacy-v8/README.md`](legacy-v8/README.md).
