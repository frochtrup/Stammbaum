# Stammbaum v9 — Spezifikations-Set

Modulare, spezifikationsorientierte Neufassung. Ersetzt die monolithische `specs/SPEC-v9-Gesamtsystem.md` (dort bleibt nur ein Verweis). Jedes Dokument spezifiziert **ein Subsystem** und ist so geschnitten, dass es einer baubaren Einheit der Zielarchitektur (siehe `02`) entspricht.

## Lesereihenfolge

Neu im Projekt → in dieser Reihenfolge lesen:

1. **01 — Vision & Prinzipien** — warum es das Produkt gibt, die 9 unverhandelbaren Leitprinzipien, Nicht-Ziele, Glossar.
2. **02 — Zielarchitektur v9** — die Schichtung (Domänenkern / UI-Schale / imperative Inseln), an der sich alle anderen Specs ausrichten.
3. **03 — Altlasten** — was aus v8 bewusst NICHT übernommen wird (der Grund für den Neuaufsatz).

Dann je nach Arbeitsschwerpunkt.

## Das Set

| # | Dokument | Schicht | Inhalt |
|---|---|---|---|
| **00** | Index (dieses Dokument) | — | Übersicht, Status, Abhängigkeitsgraph |
| **01** | [Vision & Prinzipien](01-Vision-und-Prinzipien.md) | Meta | Produktvision, Zielgruppe, Leitprinzipien LP-1…9, Systemkontext, Nicht-Ziele, Glossar |
| **02** | [Zielarchitektur v9](02-Zielarchitektur-v9.md) | Meta | Schichtenmodell (Ansatz C), Kern-↔-Schale-Grenze, imperative Diagramm-Inseln, Framework-Wahl, Verzeichnis-Layout |
| **03** | [Altlasten](03-Altlasten.md) | Meta | Inkonsistenzen aus v8, die der Neuaufsatz vermeidet |
| **04** | [Entscheidungslog](04-Entscheidungslog.md) | Meta | v9-ADRs: tragende Architektur-/Produktentscheidungen (Pflege via Skill `decision-log`) |
| **10** | [Domänenmodell](10-Domaenenmodell.md) | Kern | Person, Familie, Quelle, Archiv, Notiz, Medien; Ereignis- & Zitationsmodell; Invarianten |
| **11** | [Orte, Höfe & Identitätsauflösung](11-Orte-Hoefe-Identitaet.md) | Kern | PlaceObject/HofObject, Zeitachse, Projektions-Invariante, deterministischer Link-Pass, Review-Workflow |
| **12** | [Forschungsdaten](12-Forschungsdaten.md) | Kern | Aufgaben, Protokoll, Evidenzmodell, Hypothesen, Projekte |
| **13** | [Interoperabilität & Roundtrip](13-Interop-Roundtrip.md) | Kern | GEDCOM 5.5.1/7.0/Strict, GRAMPS, Anonymisierung, Passthrough-Prinzip, Roundtrip-Anforderung |
| **14** | [Dateihandling](14-Dateihandling.md) | Kern/Betrieb | Arbeitskopie, ein Export-Rohr, FileService (2 Save-Tiers), OS-Sync statt App-Cloud, Medien |
| **20** | [Funktionen](20-Funktionen.md) | App | Feature-Katalog, Formulare, Validierungsregeln, Ausgaben/Reports |
| **21** | [UI/UX](21-UI-UX.md) | App | View-Hierarchie, View-State-/Lifecycle-Kontrakt, Responsive, Design-System, Symbolkonventionen |
| **30** | [NFR & Persistenz](30-NFR-und-Persistenz.md) | Betrieb | Performance/Skalierung, Offline/PWA, Sicherheit, Datenschutz, Barrierefreiheit, Speicher-/Sync-/Konfigurationsmodell |
| **31** | [Dev-Umgebung & Auslieferung](31-Dev-Umgebung.md) | Betrieb | VS Code + Git/GitHub, Repo-Layout, `ci.yml`, Vite/Pages, Branch-Modell, Migration aus v8 |
| **32** | [Testframework](32-Testframework.md) | Betrieb | Test-Ebenen (Pyramide), Werkzeuge (Vitest u. a.), Fixtures, Determinismus/Seams, Kontrakt-Matrix je Subsystem, Pre-Commit/CI |

## Abhängigkeitsgraph

```
01 Vision/Prinzipien ─────────────┐ (gilt für alle)
02 Zielarchitektur ───────────────┤
04 Entscheidungslog ──────────────┤ (protokolliert Entscheidungen zu 02/14/21/31/32 …)
                                  │
Kern:  10 Domänenmodell ──┬──► 11 Orte/Höfe ──┐
                          └──► 12 Forschung   ├──► 13 Interop/Roundtrip ──► 14 Dateihandling
                                              │
App:   20 Funktionen ◄── 10,11,12,13,14       │
       21 UI/UX      ◄── 20                    │
                                              │
Betrieb: 30 NFR/Persistenz ◄── 11 (orte.json), 13 (Datei)
         31 Dev-Umgebung   ◄── 02 (Schichten/Invarianten), 30 (PWA/Cache)
         32 Testframework  ◄── prüft Invarianten ALLER Specs; 02/30/31
```

**Regel:** App-Schicht (20/21) darf Kern-Schicht (10–13) referenzieren, nie umgekehrt. Der Kern kennt keine UI. Diese Richtung ist die zentrale Architektur-Invariante (siehe 02).

## Status

| Dokument | Reifegrad | Bemerkung |
|---|---|---|
| 00–04 | 🟢 Entwurf vollständig | Meta-Ebene festgelegt; 04 Entscheidungslog laufend gepflegt |
| 10–13 | 🟢 Entwurf vollständig | aus v8-Stand extrahiert, invariant markiert |
| 14 | 🟢 Entwurf vollständig | Dateihandling radikal vereinfacht (Arbeitskopie + OS-Sync) |
| 20 | 🟢 Entwurf vollständig | Feature-Katalog = erreichter v8-Umfang |
| 21 | 🟢 Entwurf vollständig | Navigation neu (Rollenmodell); Mobile Bottom-Nav + Desktop Sidebar/Multi-Pane/⌘K; Konsistenz-Befunde B1–B7 |
| 30 | 🟢 Entwurf vollständig | NFR-Baseline aus v8 |
| 31 | 🟢 Entwurf vollständig | VS Code/Claude-App + GitHub + Actions; Framework (02): Svelte 5 ✅ |
| 32 | 🟢 Entwurf vollständig | Vitest-basiert, Kontrakt-Matrix je Subsystem; UI-Test-Tooling: @testing-library/svelte ✅ |

**Legende Reifegrad:** 🟢 spezifiziert · 🟡 in Arbeit · 🔴 offen/TODO.

## Konventionen dieser Specs

- **Prioritäts-Tags:** **[K]**ern (muss), **[S]**tandard (soll), **[E]**rweitert (kann).
- **INV-…** = harte Invariante (Akzeptanzkriterium, nicht optional).
- **LP-…** = Leitprinzip (siehe 01), gilt dokumentübergreifend.
- **„Neuaufsatz-Hinweis"** = Abgrenzung zur v8-Implementierung (was anders/besser wird).
- Zeitlose Wire-Referenz (GEDCOM/GRAMPS Tag-Semantik + Datei-Format): `GEDCOM.md` (am Root). Die historische v8-Detailtiefe (ADR-Begründungen, altes Datenmodell, Layout-/Symboltabellen, Sprint-Historie) liegt eingefroren in `legacy-v8/` (`ARCHITECTURE.md`, `DATAMODEL.md`, `UI-DESIGN.md`, `CHANGELOG.md`, `ROADMAP.md`) — Referenz/Orakel, **kein v9-Design**.
