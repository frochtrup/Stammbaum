# Gesamtspezifikation — Stammbaum v9 → aufgeteilt

> **Diese monolithische Spec wurde in ein modulares Set aufgeteilt.**
> Einstieg: **[specs/v9/00-Index.md](v9/00-Index.md)**

Die ursprüngliche Gesamtspezifikation (alle 20 Abschnitte in einer Datei) ist in subsystem-orientierte Einzeldokumente unter `specs/v9/` überführt worden, damit sie sich unabhängig versionieren lassen und jeweils einer baubaren Einheit der Zielarchitektur entsprechen.

## Das Set auf einen Blick

| # | Dokument | Schicht |
|---|---|---|
| 00 | [Index](v9/00-Index.md) | Meta |
| 01 | [Vision & Prinzipien](v9/01-Vision-und-Prinzipien.md) | Meta |
| 02 | [Zielarchitektur v9](v9/02-Zielarchitektur-v9.md) | Meta |
| 03 | [Altlasten](v9/03-Altlasten.md) | Meta |
| 04 | [Entscheidungslog](v9/04-Entscheidungslog.md) | Meta |
| 10 | [Domänenmodell](v9/10-Domaenenmodell.md) | Kern |
| 11 | [Orte, Höfe & Identitätsauflösung](v9/11-Orte-Hoefe-Identitaet.md) | Kern |
| 12 | [Forschungsdaten](v9/12-Forschungsdaten.md) | Kern |
| 13 | [Interoperabilität & Roundtrip](v9/13-Interop-Roundtrip.md) | Kern |
| 14 | [Dateihandling](v9/14-Dateihandling.md) | Kern/Betrieb |
| 20 | [Funktionen](v9/20-Funktionen.md) | App |
| 21 | [UI/UX](v9/21-UI-UX.md) | App |
| 30 | [NFR & Persistenz](v9/30-NFR-und-Persistenz.md) | Betrieb |
| 31 | [Dev-Umgebung & Auslieferung](v9/31-Dev-Umgebung.md) | Betrieb |
| 32 | [Testframework](v9/32-Testframework.md) | Betrieb |

Neu gegenüber der Monolith-Fassung: **02 — Zielarchitektur v9** (Ansatz C: framework-freier Domänenkern + reaktive UI-Schale + imperative Diagramm-Inseln), **31 — Dev-Umgebung** (VS Code + GitHub + Actions), **32 — Testframework** (Vitest, Kontrakt-Matrix je Subsystem) und **14 — Dateihandling** (radikal vereinfacht: Arbeitskopie + ein Export-Rohr + OS-Sync statt App-Cloud).

Referenz-Detailtiefe (Tag-Tabellen, ADR-Begründungen, Sprint-Historie des erreichten v8-Stands) bleibt in `GEDCOM.md`, `ARCHITECTURE.md`, `DATAMODEL.md`, `UI-DESIGN.md`, `ROADMAP.md`, `CHANGELOG.md`.
