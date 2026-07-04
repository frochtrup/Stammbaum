---
name: altlast-audit
description: Prüfe einen v8-Bereich auf evolutionär gewachsene Inkonsistenzen und plane das v9-Modell. Nutze diesen Skill, wenn der Nutzer einen v8-Teil checken/vereinfachen/neu strukturieren will (Dateihandling, Navigation/UI, eine Datenstruktur, ein Subsystem) — Trigger wie „checke X", „vereinfache X", „ist X noch konsistent", „plane Änderungen für X", „X scheint nicht mehr konsistent". Ergebnis: am echten Code belegte Befunde + v9-Plan, auf Freigabe ins Spec-Set (specs/v9/) eingetragen.
---

# altlast-audit

Wiederholbarer Ablauf, um einen evolutionär gewachsenen v8-Bereich zu prüfen und sein v9-Zielmodell zu planen. Spiegelt das Vorgehen, das für Dateihandling und UI-Navigation bereits angewandt wurde.

## Grundregel

**Immer am echten Code verifizieren, nie aus Memory/Doku zitieren.** Docs und Code driften (belegt: `bnav-search` in der Doku vs. `bnav-tasks` im Code). Jeder Befund braucht einen Beleg als `datei:zeile`.

## Ablauf

1. **Bereich abgrenzen.** Welche v8-Dateien/Strukturen gehören dazu? (z. B. `onedrive*.js`+`storage*.js` fürs Dateihandling; `index.html`+`styles.css`+`ui-views*` für Navigation.)
2. **Echten Code lesen.** `grep`/`Read` auf die realen Dateien. Struktur, nicht nur Kosmetik erfassen (parallele Speicher, versteckte Sub-Modi, Rollen-Vermischung, God-Module, Doku/Code-Drift).
3. **Befunde als Tabelle** (`B1…Bn`): je Befund die strukturelle Inkonsistenz + Beleg (`datei:zeile`).
4. **v9-Modell vorschlagen.** Ein kohärentes Zielmodell, das die Befunde *strukturell* löst (nicht nur die Symptome patcht). Klar benennen, **was bewusst erhalten bleibt** (keine Altlast).
5. **Echte Produkt-Entscheidungen** (die den Plan verzweigen) per `AskUserQuestion` klären — nicht raten.
6. **Auf Freigabe codifizieren:**
   - betroffene(s) Subsystem-Spec(s) unter `specs/v9/` überarbeiten;
   - neuen Eintrag `specs/v9/03-Altlasten.md §N` (v8-Zustand → v9-Auflösung, mit Querverweis);
   - alle Querverweise + `00-Index.md` (Status) nachziehen;
   - abschließend `spec-lint` laufen lassen.
7. **Memory** aktualisieren (project_v9_spec_rebuild.md), wenn eine dauerhafte Entscheidung fiel.

## Leitprinzipien beachten

Vereinfachen vor Erfinden: zuerst fragen, was den Zweck mit *weniger* Mechanismus erfüllt. Neue Mechanismen widersprechen dem Refactor-Ziel. Roundtrip-Treue (LP-1) und die Schicht-Invarianten (INV-ARCH-1/2) dürfen nie gebrochen werden.
