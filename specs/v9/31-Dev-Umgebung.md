# 31 — Entwicklungsumgebung & Auslieferung

> Schicht: Betrieb · Abhängig von: [02 Zielarchitektur](02-Zielarchitektur-v9.md), [30 NFR & Persistenz](30-NFR-und-Persistenz.md)

Spezifiziert die Werkzeug- und Auslieferungskette für v9. Ziel: die Architektur-Invarianten ([02](02-Zielarchitektur-v9.md)) maschinell erzwingen und das wichtigste Sicherheitsnetz (Roundtrip, LP-1) automatisieren.

---

## 1. Grundentscheidungen

| Aspekt | v8 (Ist) | v9 (Soll) |
|---|---|---|
| Ablageort | iCloud Drive | **lokales Git-Repo** (`~/dev/stammbaum-v9`) |
| Editor | beliebig | VS Code (TypeScript, Svelte/Solid, ESLint) |
| Lokal-Server | `python3 -m http.server` | `npm run dev` (Vite, Hot-Reload) |
| Tests | manuell (`osascript`/JXA) | `npm test` lokal + CI bei jedem Push |
| Deploy | Rohdateien hochladen | GitHub Actions baut `dist/` → GitHub Pages |
| CI | keine | **GitHub Actions** (schließt v8-Lücke „kein CI-Server") |

> **INV-DEV-1 (kritisch):** Das Projekt liegt **NICHT** in iCloud Drive / OneDrive / Dropbox. Build-Step-Projekte erzeugen zehntausende kleine `node_modules`-Dateien; Datei-Sync-Dienste verursachen Locks, halb-synchronisierte Zustände und langsame Builds. Das behebt zugleich die aus v8 bekannte iCloud-File-I/O-Falle. Einzige „Wolke" ist GitHub.

---

## 2. Repository-Layout

```
~/dev/stammbaum-v9/
├── package.json            ← Vite + Framework + Test-Runner, Scripts
├── tsconfig.json
├── vite.config.ts          ← base-Pfad für GitHub Pages, PWA-Plugin
├── .gitignore              ← node_modules/, dist/, .DS_Store, *.local
├── .eslintrc / eslint.config.js  ← inkl. Import-Boundary-Regel (INV-ARCH-1)
├── /core                   ← Domänenkern (framework-frei, DOM-frei, build-frei testbar)
│   ├── /model /places /research /interop
├── /services               ← Anwendungsdienste (Plattform-APIs gekapselt)
├── /ui                     ← reaktive Schale + /islands (imperative SVG) + /shell
├── /app                    ← Einstieg, PWA-Manifest, Service Worker
├── /tests                  ← headless: roundtrip, unit, snapshot, csp, arch-boundary
│   └── /fixtures           ← Roundtrip-Testdateien (aus v8 übernommen)
├── /public                 ← statische Assets (Fonts, Leaflet, icons)
└── .github/workflows/ci.yml
```

Verzeichnisschichten entsprechen [02 §7](02-Zielarchitektur-v9.md). `node_modules/` und `dist/` sind **nie** eingecheckt.

---

## 3. package.json — Scripts (Vorgabe)

```jsonc
{
  "scripts": {
    "dev":        "vite",                    // lokaler Dev-Server mit HMR
    "build":      "vite build",              // erzeugt dist/ für Pages
    "preview":    "vite preview",            // dist/ lokal prüfen
    "test":       "vitest run",              // ALLE Tests
    "test:core":  "vitest run tests/core",   // nur Kern (build-frei, schnell)
    "test:round": "vitest run tests/roundtrip",
    "lint":       "eslint . && tsc --noEmit",
    "check:arch": "eslint --rule 'import-boundary' ." // INV-ARCH-1 Gate
  }
}
```

- **Test-Runner:** `vitest` (nutzt Vite-Transform, kann TypeScript direkt, läuft in Node — headless, ohne Browser). Erfüllt [30 NFR-6](30-NFR-und-Persistenz.md) und [02 INV-ARCH-2](02-Zielarchitektur-v9.md): Kern-Tests brauchen **keinen** Bundle-Schritt.
- Die v8-Roundtrip-Fixtures (`MeineDaten_ancestris.ged`, `Unsere Familie.gramps`, `scale-test-20000.ged`) wandern nach `/tests/fixtures` und werden zum Verhaltens-Orakel ([02 §8](02-Zielarchitektur-v9.md)).

---

## 4. GitHub Actions — `ci.yml` (Entwurf)

Ein Workflow deckt Test-Gate **und** Auslieferung ab. Deploy nur, wenn Tests grün.

```yaml
name: CI & Deploy
on:
  push:        { branches: [main, v9-dev] }
  pull_request: { branches: [main] }

permissions:
  contents: read
  pages: write
  id-token: write

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: 20, cache: npm }
      - run: npm ci
      - run: npm run lint          # Typen + Import-Boundary (INV-ARCH-1)
      - run: npm test              # Roundtrip + Unit + Snapshot + CSP (LP-1/LP-8)

  deploy:
    needs: test                    # nur bei grünen Tests
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

**Wirkung:** Roundtrip-Treue (LP-1), CSP (LP-8) und die Architektur-Grenze (INV-ARCH-1) werden zur automatischen Vorbedingung jedes Releases — nicht mehr nur ein manueller Pre-Commit-Hook.

---

## 5. Vite / GitHub-Pages-Konfiguration

- **`base`** in `vite.config.ts` auf den Repo-Pfad setzen (z. B. `/stammbaum-v9/`), sonst brechen Asset-Pfade auf Pages. Bei eigener Domain oder User-Pages entsprechend `/`.
- **PWA:** `vite-plugin-pwa` (oder handgeschriebener Service Worker in `/app`) für Precache + Offline-Fallback ([30 NFR-2](30-NFR-und-Persistenz.md)). Cache-Version bei jedem Release automatisch aus dem Build-Hash — beseitigt die v8-Falle „alter SW liefert veraltete Shell".
- **Ergebnis bleibt statisch:** `dist/` ist reines HTML/JS/CSS. Lokal-First und Offline (LP-2) unverändert; kein Server im Betrieb.

---

## 6. Branch- & Arbeitsmodell

- **`main`** = deploybar; jeder Merge löst Build+Deploy aus (nur bei grünen Tests).
- **`v9-dev`** = Integrationsbranch während des Neuaufbaus (CI läuft, Deploy nicht).
- Feature-Arbeit auf kurzlebigen Branches → PR nach `v9-dev`; PR-Checks = `test`-Job.
- **Solo-Pragmatik:** Branch-Protection auf `main` optional, aber „required status checks = test" empfohlen — verhindert versehentliches Deployen mit rotem Roundtrip.

> v8-CLAUDE.md-Regeln (SW-Version bumpen, Handbuch-Sync) entfallen bzw. werden ersetzt: Cache-Versionierung automatisiert (§5), Doku-Sync als eigener Punkt im Spec-Set statt manueller Bump-Pflicht.

---

## 7. Migration aus v8 (einmalig)

1. Neues lokales Repo `~/dev/stammbaum-v9` (nicht in iCloud) → GitHub-Repo anlegen/verknüpfen.
2. Testdaten (`.ged`/`.gramps`-Fixtures) aus dem v8-Ordner nach `/tests/fixtures` kopieren.
3. Wiederverwendbare *Algorithmen* aus v8 als Referenz portieren (Identitätsauflösung, Anonymisierungs-BFS, Layout-Berechnungen, Datums-Normierung) — nicht die Modulstruktur ([02 §8](02-Zielarchitektur-v9.md)).
4. Erste CI grün bekommen mit einem Minimal-Roundtrip-Test, bevor UI gebaut wird (Test-First auf dem Kern).
5. v8-Repo bleibt eingefroren als Referenz + Verhaltens-Orakel.

---

## 8. Claude Code in dieser Umgebung

- Läuft im VS-Code-Terminal **oder** als VS-Code-Extension auf dem lokalen Repo — voller Datei-/Git-/Test-Zugriff, keine iCloud-I/O-Falle mehr.
- `npm test` / `npm run lint` sind für den Agenten direkt ausführbar (Bash) → Verifikation ohne Nutzerinteraktion (erfüllt die headless-Testanforderung).
