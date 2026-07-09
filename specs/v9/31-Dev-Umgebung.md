# 31 — Entwicklungsumgebung & Auslieferung

> Schicht: Betrieb · Abhängig von: [02 Zielarchitektur](02-Zielarchitektur-v9.md), [30 NFR & Persistenz](30-NFR-und-Persistenz.md)

Werkzeug- und Auslieferungskette für v9. Ziel: die Architektur-Invarianten ([02](02-Zielarchitektur-v9.md)) maschinell erzwingen und das wichtigste Sicherheitsnetz (Roundtrip, LP-1) automatisieren. Der Aufbau ist etabliert und in Betrieb — dieses Dokument beschreibt den Ist-Zustand, nicht einen Umstellungsplan.

---

## 1. Grundpfeiler

| Aspekt | Umsetzung |
|---|---|
| Ablageort | **lokales Git-Repo** `~/dev/stammbaum-v9` (Code) + `~/Documents/GitHub/Stammbaum` (Spec-Set) |
| Umgebung | **Claude-Desktop-App** als Ein-Fenster-Cockpit (ADR-v9-07, §7) |
| Lokal-Server | `npm run dev` (Vite, Hot-Reload) |
| Tests | `npm test` lokal + CI bei jedem Push |
| Deploy | GitHub Actions baut `dist/` → GitHub Pages (nur bei grünen Tests) |

> **INV-DEV-1 (kritisch):** Das Projekt liegt **NICHT** in iCloud Drive / OneDrive / Dropbox. Build-Step-Projekte erzeugen zehntausende kleine `node_modules`-Dateien; Datei-Sync-Dienste verursachen Locks, halb-synchronisierte Zustände und langsame Builds. Einzige „Wolke" ist GitHub. (ADR-v9-08.)

---

## 2. Repository-Layout

```
~/dev/stammbaum-v9/
├── package.json            ← Vite + Svelte 5 + Vitest, Scripts (§3)
├── tsconfig.json
├── vite.config.ts          ← base-Pfad für GitHub Pages, PWA
├── vitest.config.ts        ← browser-Conditions für Component-Tests (ADR-v9-16)
├── eslint.config.js        ← Flat-Config; Svelte + TS-Parser (ADR-v9-16)
├── .gitignore              ← node_modules/, dist/, .DS_Store, *.local
├── /core                   ← Domänenkern (framework-frei, DOM-frei, build-frei testbar)
│   ├── /model /places /research /interop
├── /services               ← Anwendungsdienste (Plattform-APIs gekapselt)
├── /ui                     ← reaktive Schale + /islands (imperative SVG) + /shell + /views
├── /app                    ← Einstieg, /public (statische Assets, demo.ged)
├── /tests                  ← headless: core, ui, services, islands, /arch-boundary, /fixtures
└── .github/workflows/ci.yml
```

Verzeichnisschichten entsprechen [02 §7](02-Zielarchitektur-v9.md). `node_modules/` und `dist/` sind **nie** eingecheckt. Roundtrip-Fixtures liegen in `/tests/fixtures` (Echtdaten gitignoriert, lokal); `app/public/demo.ged` ist der mitgelieferte Demo-Datensatz ([20 §1.2](20-Funktionen.md), zugleich Verifikations-Fixture [32 §4](32-Testframework.md)).

---

## 3. package.json — Scripts

```jsonc
{
  "scripts": {
    "dev":        "vite",                                      // Dev-Server mit HMR
    "build":      "vite build",                                // erzeugt dist/ für Pages
    "preview":    "vite preview",                              // dist/ lokal prüfen
    "test":       "vitest run",                                // ALLE Tests
    "test:core":  "vitest run tests/core",                     // nur Kern (build-frei, schnell)
    "test:round": "vitest run tests/roundtrip",
    "test:watch": "vitest",
    "lint":       "eslint . && tsc --noEmit",                  // Stil + Typen
    "check:arch": "node tests/arch-boundary/check-arch-boundary.mjs"  // INV-ARCH-1 Gate
  }
}
```

- **Test-Runner:** `vitest` (nutzt Vite-Transform, kann TypeScript direkt, läuft in Node — headless, ohne Browser). Erfüllt [30 NFR-6](30-NFR-und-Persistenz.md) und [02 INV-ARCH-2](02-Zielarchitektur-v9.md): Kern-Tests brauchen **keinen** Bundle-Schritt.
- **`check:arch`** ist ein eigenes, abhängigkeitsfreies Node-Skript (regex-basiert: verbotene Aufwärts-Imports + verbotene Plattform-Globals im Kern), **kein** ESLint-Plugin — bewusste Vereinfachung (ADR-v9-10). Bleibt austauschbar, falls Grenzfälle es sprengen.

---

## 4. GitHub Actions — `ci.yml`

Ein Workflow deckt Test-Gate **und** Auslieferung ab. Deploy nur, wenn alle Gates grün.

```yaml
name: CI & Deploy
on:
  push:         { branches: [main, v9-dev] }
  pull_request: { branches: [main] }

permissions: { contents: read, pages: write, id-token: write }

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: 20, cache: npm }
      - run: npm ci
      - run: npm run check:arch    # Import-Boundary + Kern-Reinheit (INV-ARCH-1)
      - run: npm run check:csp     # CSP-Test-Gate (NFR-3, ADR-v9-39)
      - run: npm run lint          # ESLint + Typen (tsc --noEmit)
      - run: npm test              # Roundtrip + Unit + Component + Snapshot (LP-1)

  deploy:
    needs: test                    # nur bei grünen Gates
    if: github.ref == 'refs/heads/main'
    runs-on: ubuntu-latest
    environment: github-pages
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: 20, cache: npm }
      - run: npm ci
      - run: npm run build
      - uses: actions/upload-pages-artifact@v3
        with: { path: dist }
      - uses: actions/deploy-pages@v4
```

**Wirkung:** Architektur-Grenze (INV-ARCH-1), Roundtrip-Treue (LP-1) und Typen werden zur automatischen Vorbedingung jedes Releases — die drei Gates laufen als getrennte Schritte, damit ein Fehlschlag sofort dem richtigen Bereich zuzuordnen ist.

---

## 5. Vite / GitHub-Pages-Konfiguration

- **`base`** in `vite.config.ts` auf den Repo-Pfad setzen (z. B. `/stammbaum-v9/`), sonst brechen Asset-Pfade auf Pages. Bei eigener Domain oder User-Pages entsprechend `/`. **Zwingend command-abhängig setzen** (`defineConfig(({ command }) => ({ base: command === 'build' ? '/stammbaum-v9/' : '/' }))`), NICHT als statischer Top-Level-Wert — ein statisches `base` gilt auch für den lokalen Dev-Server (`vite`/`command === 'serve'`) und verschiebt die App dort unter denselben Unterpfad; Vite selbst redirected `/` → `/stammbaum-v9/` korrekt, aber lokales Tooling, das die Wurzel `/` erwartet (Preview-/Healthcheck-Tools), sieht die App dann nie als erreichbar. **Lehre (2026-07-07):** genau dieser Fehler ist beim ersten Pages-Deploy passiert („Vorschau startet nicht") und wurde erst durch den Nutzer-Hinweis entdeckt, nicht vorab.
- **PWA:** `vite-plugin-pwa` (oder handgeschriebener Service Worker in `/app`) für Precache + Offline-Fallback ([30 NFR-2](30-NFR-und-Persistenz.md)). Cache-Version automatisch aus dem Build-Hash — kein manuelles Bumpen, keine „alter SW liefert veraltete Shell"-Falle.
- **Ergebnis bleibt statisch:** `dist/` ist reines HTML/JS/CSS. Lokal-First und Offline (LP-2) unverändert; kein Server im Betrieb.

---

## 6. Branch- & Arbeitsmodell

- **`main`** = deploybar; jeder Merge löst Build+Deploy aus (nur bei grünen Gates).
- **`v9-dev`** = Integrationsbranch während des Aufbaus (CI läuft, Deploy nicht).
- Feature-Arbeit auf kurzlebigen Branches → PR nach `v9-dev`; PR-Checks = `test`-Job.
- **Solo-Pragmatik:** Branch-Protection auf `main` optional, aber „required status checks = test" empfohlen — verhindert versehentliches Deployen mit rotem Gate.
- Cache-Versionierung ist automatisiert (§5); Doku-Sync läuft über das Spec-Set + Skills (`decision-log`/`spec-lint`), nicht über manuelle Bump-Pflichten.

---

## 7. Claude Code in dieser Umgebung

- Läuft in der **Claude-Desktop-App** (ADR-v9-07): Ein-Fenster-Cockpit mit Chat/Diff/Preview/Terminal/File/Tasks auf dem lokalen Code-Repo — voller Datei-/Git-/Test-Zugriff, keine iCloud-I/O-Falle. Liest `CLAUDE.md` + `.claude/skills/`/`.claude/agents/` automatisch.
- `npm test` / `npm run lint` / `npm run check:arch` sind für den Agenten direkt ausführbar (Bash) → Verifikation ohne Nutzerinteraktion (headless-Testanforderung erfüllt).
- Bau-Rollen sind auf spezialisierte Agenten aufgeteilt (`.claude/agents/`: kern-/places-/interop-/services-/ui-/islands-builder); die Skills (`build-from-spec`, `decision-log`, `spec-lint`, `spec-new`, `altlast-audit`, `roundtrip-verify`) tragen die wiederkehrenden Rituale.

---

## 8. Bezug zum eingefrorenen v8

Die v8-Codebasis liegt eingefroren unter `legacy-v8/` (im Spec-Repo) und dient als **Datenerhalt-Orakel** ([32 §9](32-Testframework.md)) und Algorithmus-Referenz — **nicht** als Struktur-Vorlage. Wiederverwendbare *Algorithmen* (Identitätsauflösung, Anonymisierungs-BFS, Layout-Berechnungen, Datums-Normierung) werden portiert, die Modulstruktur ausdrücklich nicht ([02 §8](02-Zielarchitektur-v9.md), [03 Altlasten](03-Altlasten.md)). Der einmalige Umzug (Repo-Aufsatz, Fixture-Übernahme, Skelett + erste grüne CI) ist abgeschlossen.
