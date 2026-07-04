---
name: build-from-spec
description: Setze ein v9-Subsystem test-first aus seinem Spec um (Spec → Code). Nutze diesen Skill, wenn mit dem eigentlichen Bau begonnen oder ein Subsystem implementiert werden soll — Trigger wie „bau X um", „implementiere Subsystem NN", „fang mit dem Kern an", „Baubeginn", „Projekt aufsetzen". Erzeugt bei Bedarf zuerst das Projekt-Skelett, dann Tests-vor-Code gemäß Kontrakt-Matrix und Definition of Done.
---

# build-from-spec

Überbrückt Spezifikation → Code für ein v9-Subsystem. **Test-first**, gemäß Definition of Done ([32 §8](../../specs/v9/32-Testframework.md)). Der `legacy-v8/`-Code ist das **Paritäts-Orakel**, nicht die Vorlage — Struktur folgt den Specs, nicht v8.

## Voraussetzungen prüfen

- **Node.js** vorhanden (`node -v`, `npm -v`). Falls nicht: user-lokal ohne sudo installierbar.
- **Projekt-Skelett** vorhanden? Wenn nein → zuerst scaffolden (siehe unten).
- Das betroffene **Subsystem-Spec gelesen** ([00-Index](../../specs/v9/00-Index.md) → das jeweilige Dokument) inkl. seiner `INV-…` und der Zeile in der **Kontrakt-Matrix** ([32 §6](../../specs/v9/32-Testframework.md)).

## Projekt-Skelett (nur beim allerersten Mal)

Struktur nach [02 §7](../../specs/v9/02-Zielarchitektur-v9.md): `core/` (framework-frei, DOM-frei) · `services/` · `ui/` (Svelte 5) · `tests/` · `app/`.
- **Kern + Tests build-frei** (INV-ARCH-2): TypeScript, `vitest` läuft ohne Bundler.
- **UI**: Svelte 5 + Vite (Komponenten-Bibliothek, **kein** SvelteKit — statischer Build), `@testing-library/svelte` + happy-dom (ADR-v9-09).
- **Fixtures** aus `legacy-v8/` (Roundtrip-Orakel) nach `tests/fixtures/` (gitignorierte Echtdaten bleiben lokal).
- Import-Grenzen-Gate einrichten (INV-ARCH-1: Kern importiert nichts von oben).

## Ablauf je Subsystem

1. **Reihenfolge:** immer **Kern zuerst** ([31 §7](../../specs/v9/31-Dev-Umgebung.md)). Für Interop: `parse`/`serialize` + ein Minimal-Roundtrip auf einer Klein-Fixture grün, **bevor** UI gebaut wird.
2. **Tests vor Code:** jede `INV-…` des Subsystems als benannter Test formulieren (rot), dann implementieren (grün) — TST-2/TST-4.
3. **Reine Funktionen:** Kern-Logik ohne DOM/Plattform/Wall-Clock; Nichtdeterminismus injizieren ([32 §5](../../specs/v9/32-Testframework.md)).
4. **Roundtrip-Parität:** wo relevant, Ergebnis gegen das `legacy-v8/`-Orakel prüfen (`roundtrip-verify`), Ziel `net_delta=0`.
5. **Architektur-Grenze halten:** Abhängigkeiten nur nach unten; UI liest den Kern nur über die definierten Chokepoints ([02 §3](../../specs/v9/02-Zielarchitektur-v9.md)).

## Definition of Done (pro Subsystem)

- Alle `INV-…` durch benannte Tests abgedeckt.
- Roundtrip-Fixtures grün (`out1===out2`, `net_delta=0`), wo einschlägig.
- Import-Grenzen-Gate grün.
- Neue Bugs mit Regressions-Test verriegelt.

## Nach dem Bau

- Bau-relevante Entscheidung getroffen → `decision-log` (ADR-v9-NN).
- Specs berührt/präzisiert → `spec-lint`.
- Die Spec bleibt die Wahrheit: weicht der Bau bewusst ab, **zuerst die Spec ändern**, dann den Code.
