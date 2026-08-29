---
name: spec-new
description: Lege ein neues v9-Subsystem-Spec-Dokument unter specs/v9/ an und verdrahte es vollständig ins Set. Nutze diesen Skill, wenn ein neues Spec/Subsystem/Concern dokumentiert werden soll — Trigger wie „neues Spec für X", „spezifiziere X als eigenes Dokument", „lege ein Subsystem-Spec an". Stellt sicher, dass Index-Tabelle, Abhängigkeitsgraph, Status-Tabelle UND Master-Verweis mitgezogen werden (das leicht vergessene Ritual).
---

# spec-new

Scaffoldet ein neues Dokument im v9-Spec-Set (`specs/v9/`) mit Standard-Header und verdrahtet es überall — damit nicht wieder Index/Graph/Status/Master auseinanderlaufen (in der Vergangenheit mehrfach vergessen: Index ohne 31, Master ohne 31/32).

## Eingaben klären

- **Nummer `NN`** (Konvention: 00–09 Meta, 10–1x Kern, 20–2x App, 30–3x Betrieb).
- **Titel** (Substantiv-Phrase).
- **Schicht** (Meta / Kern / App / Betrieb).
- **Abhängigkeiten** (welche anderen Specs es referenziert / die es referenzieren).

## Ablauf

1. **Datei `specs/v9/NN-Name.md`** anlegen mit Standard-Header:
   ```
   # NN — Titel

   > Schicht: … · Abhängig von: [..](..) · Verwandt: [..](..)
   ```
   Danach Abschnitte mit den etablierten Konventionen: `INV-…` für harte Invarianten, `LP-…`-Bezüge, `[K]/[S]/[E]`-Prioritäten, „**Neuaufsatz-Hinweis**" für Abgrenzung zu v8.
2. **`00-Index.md` mitziehen (alle drei Stellen):**
   - „Das Set"-Tabelle (Zeile mit Nr./Link/Schicht/Inhalt),
   - Abhängigkeitsgraph,
   - Status-Tabelle.
3. **`SPEC-v9-Gesamtsystem.md`** (Master-Verweis): Zeile in der Tabelle ergänzen; ggf. „Neu gegenüber der Monolith-Fassung"-Satz.
4. **Rückverweise** aus verwandten Specs auf das neue Dokument setzen.
5. **`spec-lint`** laufen lassen → sicherstellen, dass keine toten Links / fehlenden Einträge entstanden sind.

## Stil

Am Bestand orientieren (Dichte, Ton, Tabellen-Stil der vorhandenen Specs). Kern-Dokumente bleiben DOM-frei/implementierungs-agnostisch; App/Betrieb dürfen konkreter werden.
