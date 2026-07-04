# 04 — Entscheidungslog (v9-ADRs)

> Schicht: Meta · Pflege via Skill `decision-log`

Chronologisches Log der tragenden Architektur- und Produktentscheidungen des v9-Neuaufsatzes. **Unabhängig** von den v8-ADRs (die in `legacy-v8/ARCHITECTURE.md` stehen). Ein Eintrag wird angelegt, sobald eine Entscheidung fällt, die den Bau bindet oder eine Alternative bewusst verwirft.

**Status-Legende:** ✅ akzeptiert · 🟡 offen/vorläufig · ⛔ verworfen · ♻️ ersetzt durch spätere Entscheidung.

**Eintragsformat:** Kontext (warum die Frage aufkam) · Entscheidung · Konsequenz · verworfene Alternativen · Refs.

---

## ADR-v9-01 — Spezifikationsgetriebener Neuaufsatz ✅ · 2026-07-04
- **Kontext:** v8 evolutionär gewachsen, zunehmende Inkonsistenzen/Altlasten.
- **Entscheidung:** Neuaufsatz auf Basis eines **modularen Spec-Sets** (`specs/v9/`); v8-Code eingefroren als Referenz + Verhaltens-Orakel.
- **Konsequenz:** Arbeit ist spec-first; die Spec gewinnt bei Widerspruch zum Code.
- **Refs:** [00](00-Index.md), [03 Altlasten](03-Altlasten.md).

## ADR-v9-02 — Zielarchitektur „Ansatz C" (Hybrid) ✅ · 2026-07-04
- **Kontext:** Vanilla vs. Framework. v8-Schmerz = manuelle Zustand↔Ansicht-Synchronisation; zugleich starke imperative SVG-Diagramme.
- **Entscheidung:** **framework-freier, DOM-freier Domänenkern** + **reaktive UI-Schale** + **imperative Diagramm-Inseln**. Abhängigkeiten nur nach unten (INV-ARCH-1); Kern build-frei testbar (INV-ARCH-2).
- **Konsequenz:** Reaktivität nur in der Schale; Kern rein/testbar; Diagramme als Inseln.
- **Verworfen:** reines Vanilla (A — trifft den Schmerz nicht), durchgängiges Framework (B — Overhead bei Diagrammen + Build-Zwang für alles).
- **Refs:** [02](02-Zielarchitektur-v9.md).

## ADR-v9-03 — ADR-001/002 (kein Build-Step) für v9 aufgehoben ✅ · 2026-07-04
- **Kontext:** v8 verbot bewusst Build-Step/Toolchain („edit-anywhere").
- **Entscheidung:** Für v9 **nicht mehr bindend**. Build-Step für die UI-Schale erlaubt; der **Kern bleibt build-frei ausführbar** (Tests ohne Bundler).
- **Konsequenz:** ESM/TypeScript/Vite für die UI möglich; Kern-Sicherheitsnetz unabhängig von der UI-Toolchain.
- **Refs:** [02 §1/§4](02-Zielarchitektur-v9.md).

## ADR-v9-04 — Dateihandling radikal vereinfacht ✅ · 2026-07-04
- **Kontext:** v8-Dateihandling (~5 Module, OneDrive Graph API, OAuth, ETag, filemap) war der komplexeste, am wenigsten essenzielle Teil.
- **Entscheidung:** **eine Arbeitskopie (IDB)** + **ein Export-Rohr (N Serializer)** + **FileService mit 2 Save-Tiers** als einzige Plattform-Verzweigung. **Geräte-Sync macht das OS** (Sync-Ordner), nicht die App.
- **Konsequenz:** ~5 Module → ein `FileService` + Kern-Serializer; LP-2 bleibt.
- **Verworfen:** app-verwaltete Cloud als Pflicht (nur noch optionaler Adapter hinter derselben Schnittstelle).
- **Refs:** [14](14-Dateihandling.md), [03 §9](03-Altlasten.md).

## ADR-v9-05 — Navigations-Rollenmodell + form-faktor-eigenständiges UI ✅ · 2026-07-04
- **Kontext:** v8-Navigation inkonsistent (6 Slots für ~11 Ziele, versteckte Sub-Modi, Desktop = Mobile + Spalten).
- **Entscheidung:** drei Rollen (Entitäten / Ansichten-Lenses / Arbeitsflächen). **Mobile:** Bottom-Nav `Baum · Personen · Suche · Aufgaben · Mehr` + Entitäts-Segment. **Desktop:** beschriftete Sidebar + Multi-Pane + Command-Palette (⌘K). Ein einheitlicher Lens-Umschalter.
- **Konsequenz:** ein kanonischer Weg je Ziel; Diagramm-Toggle-Glyphen entfallen.
- **Refs:** [21](21-UI-UX.md), [03 §10](03-Altlasten.md).

## ADR-v9-06 — Testframework Vitest-basiert, Kontrakt-Matrix ✅ · 2026-07-04
- **Kontext:** Tests als ausführbares Spec-Orakel; v8-JXA-Fallen vermeiden.
- **Entscheidung:** **Vitest** (Node, headless, build-frei) + fast-check + Testing-Library/happy-dom + optional Playwright. **Kontrakt-Matrix** bindet jede Invariante an eine Testart (TST-2). Fixtures = v8-Echtdateien als Regressions-Orakel.
- **Konsequenz:** JXA-Fallen entfallen; Pre-Commit = schneller Kern-Subset, CI = alle Ebenen.
- **Refs:** [32](32-Testframework.md).

## ADR-v9-07 — Entwicklungsumgebung: Claude-Desktop-App als Ein-Fenster ✅ · 2026-07-04
- **Kontext:** Nutzer dirigiert den Agenten, codet nicht selbst, will **eine** Umgebung für alle Rollen.
- **Entscheidung:** **Claude-Desktop-App** (Code-Tab: Chat/Diff/Preview/Terminal/File/Tasks) als Ein-Fenster-Umgebung + **GitHub** (Quelle/Review/CI) + **GitHub Actions** (Test/Build/Deploy). Liest `CLAUDE.md` + `.claude/skills/` automatisch (verifiziert).
- **Konsequenz:** keine separate IDE nötig; Repo lokal, nicht iCloud (INV-DEV-1).
- **Verworfen:** VS Code als Cockpit (Editor-Wert ungenutzt); **Cursor als vierte Säule** (redundanter zweiter KI-Agent, zweites Regelsystem → Drift statt Konsistenz; nur sinnvoll, wenn selbst gecodet wird).
- **Refs:** [31](31-Dev-Umgebung.md).

## ADR-v9-08 — Repo außerhalb von iCloud ✅ · 2026-07-04
- **Kontext:** v8 lag in iCloud Drive → File-I/O-Falle; Build-Projekte + `node_modules` vertragen sich nicht mit Datei-Sync-Diensten.
- **Entscheidung:** **INV-DEV-1** — v9-Repo lokal (`~/dev/stammbaum-v9`), nur GitHub als „Wolke".
- **Refs:** [31 §1](31-Dev-Umgebung.md).

## ADR-v9-09 — UI-Framework-Wahl 🟡 offen
- **Kontext:** Ansatz C braucht ein reaktives Schale-Framework mit leichter Escape-Hatch ins Imperative.
- **Stand:** **offen.** Favorisiert Svelte oder Solid (compile-away, kleines Runtime, sauberer Ref-Ausstieg). Vor Baubeginn festlegen; legt zugleich das UI-Test-Tooling ([32 §3](32-Testframework.md)) fest.
- **Refs:** [02 §6](02-Zielarchitektur-v9.md).
