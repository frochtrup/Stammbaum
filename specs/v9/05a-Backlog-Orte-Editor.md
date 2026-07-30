# 05a — Backlog: Orte-Editor (Standalone)

**Die Status-Wahrheit des Standalone-Orte-Editors** ([22](22-Orte-Editor-Standalone.md)).
Das Hauptprogramm führt seine eigene unter [05](05-Backlog.md); Entscheidungen stehen für
beide Programme gemeinsam im [Entscheidungslog](04-Entscheidungslog.md).

Es gelten die **Regeln, Klassen, Typen und die Beleg-Syntax aus [05](05-Backlog.md)**
unverändert — sie stehen dort einmal und werden hier nicht wiederholt. Diese Datei
unterscheidet sich von [05](05-Backlog.md) in genau zwei Punkten:

1. **ID-Raum `OE-n`** statt `BL-n`. Zwei Dateien, die sich eine Nummernfolge teilen,
   konkurrieren bei parallelen Arbeitssträngen um „die nächste freie Nummer"; und an der
   Referenzstelle sieht man der Zahl sonst nicht an, welches Programm gemeint ist.
2. **Zuständigkeit über den Beleg-Pfad, nicht über das Thema.** Eine Zeile gehört hierher
   genau dann, wenn ihr Beleg auf `app-orte/` oder `tests/orte/` zeigt. Jeder Beleg
   daneben — `core/`, `services/`, `ui/`, `app/`, `tools/`, Build-/CI-Konfiguration —
   gehört nach [05](05-Backlog.md), auch wenn der Punkt fachlich zum Editor gehört.
   Berührt ein Vorhaben beide Bereiche, wird es in zwei Zeilen zerlegt (Regel 2 in
   [05](05-Backlog.md): kein „teilweise").

Beides wird geprüft, nicht vereinbart: **L8** (Tabelle „Lint-Regeln" in
[05](05-Backlog.md)) wertet den Beleg-Pfad jeder Zeile gegen den Zuständigkeitsbereich
ihrer Datei aus, und der Prüfer meldet einen Fehler, wenn eine Tabelle vorhanden ist, aus
der keine `OE-`Zeile erkannt wird — eine Statusdatei, die stillschweigend nicht geprüft
wird, wäre schlimmer als keine.

Warum die Trennung überhaupt: der Editor ist ein eigenes Programm mit eigenem
Einstiegspunkt, eigenem Build und eigener Auslieferungsadresse
([22 §2](22-Orte-Editor-Standalone.md)). Seine Arbeit liegt in einem Verzeichnisbaum, den
das Hauptprogramm nicht anfasst — die Grenze existiert also bereits im Code und muss
nicht erfunden werden.

## Offene Punkte

| ID | P | Typ | Klasse | Punkt | Spec | Beleg | Status |
|---|---|---|---|---|---|---|---|

## Erledigte Punkte

| ID | P | Typ | Klasse | Punkt | Spec | Beleg | Status |
|---|---|---|---|---|---|---|---|
| OE-1 | K | feature | basis | Programm-Skelett: eigener Einstieg `app-orte/` mit eigener Vite-Konfiguration (`root`, `base` `/stammbaum-v9/orte/`, `outDir ../dist/orte`, `emptyOutDir: false`), CSP-Plugin wiederverwendet. Die Konfiguration liegt IM Editor-Baum, damit sein Bau-Wissen mit ihm zusammenbleibt | [22 §2](22-Orte-Editor-Standalone.md) | `datei:app-orte/vite.config.ts` | gebaut |
| OE-2 | K | feature | basis | Dokument-Lebenszyklus (INV-ORTE-3): öffnen über eigene `PickerAdapter`-Instanz, „Neu", Änderungsmarke, Speichern mit `rev+1`/`device`/`ts` durch `FileService.exportToFile` (Tier 1 in dieselbe Datei, sonst Teilen/Download), Schema-Gate → Nur-Lese-Modus | [22 §4](22-Orte-Editor-Standalone.md) | `sym:saveDocument` | gebaut |
| OE-3 | K | feature | basis | `PlacesHost`-Implementierung des Editors über `makeDatabase()` + geladene Orte/Höfe, mit Undo/Redo über `services/undo` auf Schnappschüssen von `{placeObjects, hofObjects}`; `caps.hasEventContext` folgt der geladenen Kontextdatei, `canEditEvents`/`canNavigateToLens` sind dauerhaft falsch | [22 §3](22-Orte-Editor-Standalone.md) | `sym:createOrteHost` | gebaut |
| OE-4 | K | feature | basis | Absturz-Wiederherstellung: entprellter Entwurf in IndexedDB, Angebot beim Start, Verfall beim erfolgreichen Speichern. Kein `rev`-Bump, kein Union-Merge, nie Quelle (INV-ORTE-3) | [22 §4](22-Orte-Editor-Standalone.md) | `sym:IdbOrteDraftStore` | gebaut |
| OE-5 | K | feature | basis | Orts-Fläche angeschlossen: Liste, Steckbrief, Bearbeiten, GOV-Import, Dubletten/Zusammenführen — geteilte Komponenten unverändert, keine Kopie (INV-ORTE-1) | [22 §3](22-Orte-Editor-Standalone.md) | `test:tests/orte/orte-flaeche.test.ts` | gebaut |
| OE-6 | K | feature | basis | Hof-Fläche angeschlossen: Liste, Detail, Adressvarianten inkl. Umbenennung, Dubletten/Zusammenführen | [22 §3](22-Orte-Editor-Standalone.md) | `test:tests/orte/hof-flaeche.test.ts` | gebaut |
| OE-7 | S | feature | basis | Kontextdatei nur lesend (INV-ORTE-2): GED/GRAMPS laden, Auflösung auf Kopien der Orts-/Hofmengen, übernommen werden ausschließlich Ereignis-Verknüpfungen auf vorhandene Objekte. Test serialisiert das Dokument vor und nach dem Laden und vergleicht | [22 §5](22-Orte-Editor-Standalone.md) | `test:tests/orte/kontextdatei-unveraendert.test.ts` | gebaut |
| OE-8 | K | feature | basis | Dokument-Rundlauf (TST-8-Analogon zu `net_delta=0`): laden → bearbeiten → speichern → erneut laden → identisch, gegen `tools/handbuch/fixtures/orte.json` als Vorlage | [22 §4](22-Orte-Editor-Standalone.md), [32 §1](32-Testframework.md) | `test:tests/orte/dokument-rundlauf.test.ts` | gebaut |
| OE-9 | S | feature | basis | Ausgeliefertes Editor-Handbuch: der aus Anhang E + Kap. 7/8 erzeugte Extrakt liegt beim Editor und wird von ihm verlinkt (Erzeugung selbst: BL-224) | [22 §8](22-Orte-Editor-Standalone.md) | `datei:app-orte/public/HANDBUCH-ORTE.html` | gebaut |
| OE-10 | E | feature | kür | Eigener Service Worker / PWA-Installierbarkeit des Editors (Precache + Offline-Fallback wie das Hauptprogramm, eigener Cache-Namensraum) | [22 §2](22-Orte-Editor-Standalone.md), [30 NFR-2](30-NFR-und-Persistenz.md) | `datei:app-orte/public/sw.js` | gebaut |
