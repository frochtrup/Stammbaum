# 05 — Backlog

**Die einzige Status-Wahrheit des Projekts.** Die Specs [10](10-Domaenenmodell.md)–[32](32-Testframework.md)
beschreiben ausschließlich den Soll-Zustand und treffen **keine** Aussage darüber, was
gebaut ist; das [Entscheidungslog](04-Entscheidungslog.md) hält Entscheidungen fest, nicht
Fortschritt. Wer wissen will, was offen ist, liest nur hier.

Stand: **[K]-Inventur vollständig** (2026-07-18, jeder Punkt am Code verifiziert),
plus Defekte und Hygiene-Vorgänge aus derselben Sitzung. Die Specs 10–32 sind seit
BL-50 frei von Status-Aussagen — L3 ist hart (Ratsche 0). [S]/[E] noch nicht
vollständig inventarisiert (BL-51).

**Ein Fund wird zu genau einem von drei Dingen** — sonst ist er nicht handlungsfähig:
eine **Backlog-Zeile** (entscheidbarer Fertig-Zustand + prüfbarer Beleg), ein
**[ADR](04-Entscheidungslog.md)** (offene Entscheidung, keine offene Arbeit — fällt sie
auf „tun", entsteht daraus eine Backlog-Zeile) oder er wird **verworfen**. Es gibt
bewusst **keine Risikoliste**: ein Risiko ohne Fertig-Zustand wird von niemandem
geschlossen und verrottet wie die Status-Marker, die dieses Dokument ersetzt. Wer ein
Risiko für relevant hält, macht es entscheidbar (BL-54 ist genau diese Umwandlung: aus
„die Views werden fett" wurde eine Lint-Schwelle) — oder lässt es.

## Regeln

1. **Zeiger, kein Inhalt.** Eine Zeile nennt den Punkt knapp und verweist auf die
   Spec-Stelle. Der Anforderungstext bleibt dort — sonst driften zwei Fassungen
   auseinander (genau der Fehler, den diese Datei behebt).
2. **Status ist binär: `offen` oder `gebaut`.** Kein „teilweise" — mehrteilige Vorhaben
   werden zerlegt. ADR-v9-78 war sechs Punkte unter einem Sammel-Status, von denen vier
   fertig waren, während die Überschrift weiter „Punkte 3/5/6 weiterhin offen" behauptete.
3. **Jede Zeile trägt einen Beleg** — ein **exportiertes Symbol** oder ein **Dateipfad**,
   nie ein Prosa-Wort. Prosa trifft Kommentare: „Ortszeitgenossen" steht auch in einem
   Ankündigungs-Kommentar in `ViewModeToggle.svelte`. Ein Beleg, der auf Kommentare
   anspringt, meldet Fertigstellung zu früh.
4. **IDs werden nie wiederverwendet.** Erledigte Zeilen bleiben stehen (`gebaut`) — sie
   sind der Drift-Schutz in die zweite Richtung: verschwindet das Symbol durch
   Umbenennung, schlägt der Lint an.

   Eine **irrtümlich angelegte** Zeile darf dagegen entfernt werden — sie ist nicht
   „erledigt", und eine Zeile, die dauerhaft auf `offen` steht, ohne je einen Fertig-
   Zustand zu haben, ist genau die Risikoliste, die es hier bewusst nicht gibt. **Ihre ID
   bleibt trotzdem verbraucht.** Bisher zurückgezogen: **BL-79** (angelegt und am
   selben Tag entfernt, 2026-07-18, Commit `1de1bc9`). Wer die nächste ID vergibt, nimmt
   also nicht `max+1` aus der Tabelle, sondern zählt diese Liste mit.
5. **Priorität** `[K]`/`[S]`/`[E]` wird aus dem Spec übernommen, nicht hier neu erfunden.
   Die Reihenfolge-Aussage steht in `Klasse`, nicht in einer Zahl.
6. **Jeder Beleg soll ein Wächter sein, kein Meilenstein.** Ein *Wächter* sagt aus, was
   dauerhaft gelten muss, und behält nach der Erledigung Wert (L2 schlägt an, wenn es
   kippt). Ein *Meilenstein* bestätigt nur, dass einmal etwas passiert ist, und ist
   danach tot. Wo ein Beleg als Meilenstein formuliert ist, lässt er sich fast immer als
   Wächter umschreiben — dann ist die Zeile auch nach `gebaut` nicht bloß Archiv.

   Wächter sind: negierte Belege (`!txt:` — „muss abwesend bleiben"), `test:` („muss
   unskipped bleiben"), `txt:` auf Konfiguration („Regel muss verdrahtet bleiben"),
   `sym:`/`datei:` auf Produktcode („darf nicht verschwinden").

   **Gegenbeispiel und Anlass der Regel:** BL-49 trug zuerst `spec:…/check-backlog.mjs` —
   der Prüfer prüfte seine eigene Existenz. Wird das Skript gelöscht, läuft überhaupt
   nichts mehr; L2 hätte dort nie etwas gefangen. Ersetzt durch
   `txt:check-backlog@…/SKILL.md`: das bewacht den realistischen Verfallsweg — ein Skript,
   das zwar existiert, aber im Skill nicht mehr referenziert ist, ruft niemand mehr auf.

   Die Regel gilt **unabhängig vom `Typ`**. Naheliegend wäre, erledigte `hygiene`- und
   `defekt`-Zeilen als nicht lint-relevant auszusortieren — das wäre falsch: gerade
   BL-50 (Status-Wörter bleiben draußen) wird nach seiner Erledigung der wichtigste
   Wächter des ganzen Dokuments, und BL-47 verhindert, dass ein rot gewordener
   Skalen-Test einfach wieder geskippt wird.

## Klassen (statt Prioritätszahlen)

| Klasse | Bedeutung |
|---|---|
| `blockiert` | Verteuert oder blockiert andere Arbeit; die Nachrüstkosten wachsen mit jedem Tag. |
| `usp` | Trägt das Alleinstellungsmerkmal (Orte/Höfe, Roundtrip-Treue). |
| `basis` | Nötig für ein benutzbares Produkt, ohne Sogwirkung auf anderes. |
| `kür` | Verbessert, blockiert nichts. |

## Offene Punkte

| ID | P | Typ | Klasse | Punkt | Spec | Beleg | Status |
|---|---|---|---|---|---|---|---|
| BL-02 | K | feature | basis | Service Worker + Manifest (Offline-Betrieb) | [20 §1.2](20-Funktionen.md), [30](30-NFR-und-Persistenz.md) | `datei:app/public/sw.js` | offen |
| BL-03 | K | feature | basis | Offline-Indikator in der Schale | [20 §1.2](20-Funktionen.md) | `datei:ui/shell/OfflineIndicator.svelte` | offen |
| BL-04 | K | feature | basis | Validierung/Datenprüfung (Regel-Engine, RAM-Bericht) | [20 §1.11h, §3](20-Funktionen.md) | `sym:validateDatabase` | offen |
| BL-05 | K | feature | basis | Qualitäts-Dashboard (hängt an BL-04) | [20 §1.11g](20-Funktionen.md) | `sym:buildQualityDashboard` | offen |
| BL-06 | K | feature | basis | Desktop-Layout (Sidebar, Multi-Pane, ⌘K) | [21 §1](21-UI-UX.md) | `datei:ui/shell/Sidebar.svelte` | offen |
| BL-07 | K | feature | basis | History-Navigation (Zurück/Vorwärts, Swipe-Right) | [20 §1.1](20-Funktionen.md) | `sym:useHistory` | offen |
| BL-08 | K | feature | basis | Keyboard-Shortcuts Speichern/Verwerfen/Escape (⌘Z/⇧⌘Z sind mit BL-01 gebaut) | [20 §1.2](20-Funktionen.md) | `txt:'save'@ui/shell/shortcuts.ts` | offen |
| BL-09 | K | feature | kür | Mini-Karte im Ort-Steckbrief | [20 §1.7](20-Funktionen.md) | `datei:ui/views/place/PlaceMiniMap.svelte` | offen |
| BL-10 | K | feature | kür | Soundex-Modus in der Personensuche (im Spec „optional") | [20 §1.4](20-Funktionen.md) | `sym:soundex` | offen |
| BL-51 | — | hygiene | kür | [S]/[E]-Inventur vervollständigen (Spec 20 hat 29 S/E-Bullets; erfasst sind bisher nur die, deren Status-Wörter BL-50 entfernt hat) | [05](05-Backlog.md) | `!txt:noch nicht.{0,20}inventarisiert@specs/v9/05-Backlog.md` | offen |
| BL-52 | — | hygiene | kür | Zweites [K]-Format in Spec 20 vereinheitlichen | [20](20-Funktionen.md) | `!txt:^[*][*][a-z][)] .*\[K\]@specs/v9/20-Funktionen.md` | offen |
| BL-53 | — | hygiene | kür | Übrig gebliebenes `eslint-disable` entfernen | [32](32-Testframework.md) | `!txt:no-useless-assignment@ui/views/timeline/TimelineLensView.svelte` | offen |
| BL-55 | — | feature | basis | `shortName` + Listen zeigen `shortName ?? title` | [11 §1](11-Orte-Hoefe-Identitaet.md), [ADR-v9-90](04-Entscheidungslog.md) | `txt:shortName@core/places/types.ts` | offen |
| BL-56 | S | feature | kür | Research-Timeline-Umschalter (Protokoll chronologisch) | [12 §2](12-Forschungsdaten.md) | `sym:buildResearchTimeline` | offen |
| BL-57 | S | feature | basis | Evidenz-Bewertung: Aufklapper an der Zitat-Zeile | [12 §3](12-Forschungsdaten.md) | `!txt:TODO@ui/shell/SourceCitationRow.svelte` | offen |
| BL-58 | S | feature | kür | Forschungsprojekte: Scope-Matching + UI | [12 §5](12-Forschungsdaten.md) | `sym:matchesScope` | offen |
| BL-59 | S | feature | kür | Ortsübersetzungen (`PlaceObject.translations`) | [11 §1](11-Orte-Hoefe-Identitaet.md) | `txt:translations@core/places/types.ts` | offen |
| BL-60 | S | feature | kür | Personen-Kontext-Sprung in die Karte | [20 §1.9](20-Funktionen.md) | `sym:goToMapForPerson` | offen |
| BL-61 | S | feature | kür | Beweisführungsnotiz (GPS-Zusammenfassung) | [20 §1.11e](20-Funktionen.md) | `sym:buildEvidenceSummary` | offen |
| BL-62 | S | feature | basis | Duplikat-Erkennung Personen + Merge-Modal | [20 §1.12](20-Funktionen.md) | `sym:findPersonDuplicates` | offen |
| BL-63 | S | feature | basis | Import-Vergleich (Datei-Diff, 3 Kategorien) | [20 §1.12](20-Funktionen.md) | `sym:compareImport` | offen |
| BL-64 | S | feature | kür | Ehepartner/Eltern-Disambiguierung (INV-UI-6 vervollständigen) | [20 §1.4](20-Funktionen.md), ADR-v9-52 | `sym:memberLabel` | offen |
| BL-65 | S | feature | kür | UI-Kurzweg Aufgabe ⇄ Protokoll (`taskId`) | [20 §1.11b](20-Funktionen.md) | `sym:linkLogToTask` | offen |
| BL-66 | — | hygiene | kür | a11y-Scanner (TST-15) | [32 §3](32-Testframework.md) | `txt:axe-core@package.json` | offen |
| BL-67 | S | feature | kür | 21 §10c List-Toolbar-Ownership | [21 §10c](21-UI-UX.md) | `sym:ListToolbar` | offen |
| BL-68 | S | feature | kür | 21 §10f Leerzustand-Suppression generalisiert | [21 §10f](21-UI-UX.md) | `sym:suppressEmpty` | offen |
| BL-69 | S | feature | kür | 21 §10g Prosa → Label+Disclosure | [21 §10g](21-UI-UX.md) | `sym:Disclosure` | offen |
| BL-70 | S | feature | kür | 21 §10h Eigene-Seite-Redundanz unterdrückt | [21 §10h](21-UI-UX.md) | `sym:hideSelfLink` | offen |
| BL-71 | S | feature | kür | 21 §10k `addr`/`note`-Duplikat (ADR-v9-53) | [21 §10k](21-UI-UX.md) | `sym:dedupeAddrNote` | offen |

## Erledigte Punkte

Bleiben stehen — jede Zeile hier ist ein aktiver Wächter (Regel 6, Lint-Regel L2), kein
Archiv: ihr Beleg muss weiterhin treffen, sonst ist das Feature umbenannt oder verschwunden.

| ID | P | Typ | Klasse | Punkt | Spec | Beleg | Status |
|---|---|---|---|---|---|---|---|
| BL-11 | K | feature | basis | Rollenbasierte Navigation (Mobile Bottom-Nav) | [20 §1.1](20-Funktionen.md) | `datei:ui/shell/BottomNav.svelte` | gebaut |
| BL-12 | K | feature | basis | Einheitlicher Lens-Umschalter | [20 §1.1](20-Funktionen.md) | `datei:ui/shell/LensSwitcher.svelte` | gebaut |
| BL-13 | K | feature | basis | ViewState (Auswahl je Ziel, INV-VS) | [21 §5](21-UI-UX.md) | `sym:createViewState` | gebaut |
| BL-14 | K | feature | basis | Globale Suche über alle fünf Entitäten | [20 §1.1](20-Funktionen.md) | `datei:ui/views/search/GlobalSearchView.svelte` | gebaut |
| BL-15 | K | feature | usp | GEDCOM 5.5.1 öffnen (Parser) | [20 §1.2](20-Funktionen.md), [13](13-Interop-Roundtrip.md) | `sym:parseGedcom` | gebaut |
| BL-16 | K | feature | usp | GRAMPS XML lesen+schreiben | [20 §1.2](20-Funktionen.md) | `sym:parseXMLText` | gebaut |
| BL-17 | K | feature | basis | Ein Export-Rohr, zwei Save-Tiers | [20 §1.2](20-Funktionen.md), [14](14-Dateihandling.md) | `datei:services/file/export-pipe.ts` | gebaut |
| BL-18 | K | feature | basis | Auto-Load der Arbeitskopie beim Start | [20 §1.2](20-Funktionen.md) | `datei:services/file/idb-working-copy-store.ts` | gebaut |
| BL-19 | K | feature | basis | Sanduhr-Baum (Kekule, Mehrfach-Ehen) | [20 §1.3](20-Funktionen.md) | `datei:ui/islands/tree/hourglass-tree.ts` | gebaut |
| BL-20 | K | feature | basis | Geschwisterzeile des Probanden (voll + halb) | [20 §1.3](20-Funktionen.md) | `sym:getSiblingIds` | gebaut |
| BL-21 | K | feature | basis | Personenliste (Gruppierung, Sortier-Umschalter) | [20 §1.4](20-Funktionen.md) | `sym:PersonSortMode` | gebaut |
| BL-22 | K | feature | basis | Personen-Filter (Geschlecht, Jahr, Ort, fehlende Felder) | [20 §1.4](20-Funktionen.md) | `sym:PersonFilters` | gebaut |
| BL-23 | K | feature | basis | Personen-Detail (Ereignisse, Quellen-Badges, Familien) | [20 §1.4](20-Funktionen.md) | `sym:buildPersonDetail` | gebaut |
| BL-24 | K | feature | basis | Familienliste + Sortier-Umschalter (3 Zustände) | [20 §1.5](20-Funktionen.md) | `sym:FamilySortMode` | gebaut |
| BL-25 | K | feature | basis | Familien-Filter | [20 §1.5](20-Funktionen.md) | `sym:FamilyFilters` | gebaut |
| BL-26 | K | feature | basis | Geteilte Ereigniszeile (Ort klickbar, Coord-Icon) | [20 §1.4/§1.5](20-Funktionen.md) | `datei:ui/shell/EventLine.svelte` | gebaut |
| BL-27 | K | feature | basis | Quellenliste + Detail (referenzierende Einträge) | [20 §1.6](20-Funktionen.md) | `sym:buildSourceDetail` | gebaut |
| BL-28 | K | feature | basis | Archive/Repository (Picker, Detail, Signatur) | [20 §1.6](20-Funktionen.md) | `datei:ui/views/repository/RepositoryList.svelte` | gebaut |
| BL-29 | K | feature | usp | Automatischer Orts-Seed beim Import | [20 §1.7](20-Funktionen.md), [11 §4.2](11-Orte-Hoefe-Identitaet.md) | `sym:seedPlacesFromEvents` | gebaut |
| BL-30 | K | feature | usp | Ortsliste (Typ-Badge, Gruppen-Modus, Admin-Filter) | [20 §1.7](20-Funktionen.md) | `sym:PlaceFilters` | gebaut |
| BL-31 | K | feature | usp | Ort-Steckbrief mit Zugehörigkeits-Zeitleiste | [20 §1.7](20-Funktionen.md) | `sym:HierarchyTimelineRow` | gebaut |
| BL-32 | K | feature | usp | Namens-Zeitstrahl (Varianten) | [20 §1.7](20-Funktionen.md) | `sym:PlaceVariantRow` | gebaut |
| BL-33 | K | feature | usp | Kettenglieder klickbar | [20 §1.7](20-Funktionen.md) | `sym:ChainSegment` | gebaut |
| BL-34 | K | feature | usp | Ort-Felder editierbar + Zugehörigkeit-Modal | [20 §1.7](20-Funktionen.md) | `datei:ui/views/place/PlaceEnclosureEditModal.svelte` | gebaut |
| BL-35 | K | feature | usp | „Ort löschen" (Kaskaden-Reset auf `placeId`) | [20 §1.7](20-Funktionen.md) | `sym:deletePlaceCascade` | gebaut |
| BL-36 | K | feature | usp | String→PlaceObject verknüpfen (Sofort-Reprojektion) | [20 §1.7](20-Funktionen.md) | `sym:linkEventToPlace` | gebaut |
| BL-37 | K | feature | usp | Orts-Review Klasse P | [20 §1.7](20-Funktionen.md), [11 §6](11-Orte-Hoefe-Identitaet.md) | `datei:ui/views/place/PlaceReview.svelte` | gebaut |
| BL-38 | K | feature | usp | Massen-Dedup Orte (Konflikt-Gruppen) | [20 §1.7](20-Funktionen.md), [11 §9.2](11-Orte-Hoefe-Identitaet.md) | `sym:buildPlaceDedupGroups` | gebaut |
| BL-39 | K | feature | usp | Anreicherungs-Pille | [20 §1.7](20-Funktionen.md), [11 §9.1](11-Orte-Hoefe-Identitaet.md) | `sym:isEnrichedPlace` | gebaut |
| BL-40 | K | feature | usp | Referenz-Filter („Ohne Bezug") | [20 §1.7](20-Funktionen.md), [11 §9.3](11-Orte-Hoefe-Identitaet.md) | `sym:hasReference` | gebaut |
| BL-41 | K | feature | usp | Hof-Liste (nach Dorf/Straße/Hausnummer) | [20 §1.8](20-Funktionen.md) | `datei:ui/views/hof/hof-list-model.ts` | gebaut |
| BL-42 | K | feature | usp | Hof-Felder editierbar inkl. durchgängiger Umbenennung | [20 §1.8](20-Funktionen.md) | `sym:withUpdatedHofAddr` | gebaut |
| BL-43 | K | feature | usp | „Hof löschen" | [20 §1.8](20-Funktionen.md) | `sym:deleteHofCascade` | gebaut |
| BL-44 | K | feature | usp | Hof-Review Klassen A/C/D | [20 §1.8](20-Funktionen.md), [11 §6](11-Orte-Hoefe-Identitaet.md) | `datei:ui/views/hof/HofReview.svelte` | gebaut |
| BL-45 | K | feature | usp | Massen-Dedup Höfe | [20 §1.8](20-Funktionen.md) | `sym:buildHofDedupGroups` | gebaut |
| BL-46 | K | feature | basis | Aufgaben-Kanban (Liste⇄Board) | [20 §1.11a](20-Funktionen.md) | `datei:ui/views/tasks/TasksView.svelte` | gebaut |
| BL-49 | — | hygiene | basis | Backlog-Lint L1–L4 in `spec-lint` überführen | [05](05-Backlog.md) | `txt:check-backlog@.claude/skills/spec-lint/SKILL.md` | gebaut |
| BL-72 | S | feature | usp | Ortszeitgenossen | [20 §1.7](20-Funktionen.md) | `sym:buildPlaceContemporaries` | gebaut |
| BL-73 | S | feature | basis | 21 §10a FilterBar | [21 §10a](21-UI-UX.md) | `datei:ui/shell/FilterBar.svelte` | gebaut |
| BL-74 | S | feature | basis | 21 §10b Gruppierung/Paginierung/Einklappen | [21 §10b](21-UI-UX.md) | `datei:ui/shell/pagination.ts` | gebaut |
| BL-75 | S | feature | basis | 21 §10d SourceCitationRow | [21 §10d](21-UI-UX.md) | `datei:ui/shell/SourceCitationRow.svelte` | gebaut |
| BL-76 | S | feature | kür | 21 §10e Redundanter Hero-Titel entfernt | [21 §10e](21-UI-UX.md) | `datei:ui/shell/DetailHeader.svelte` | gebaut |
| BL-77 | S | feature | kür | 21 §10i Quellen-Badge-Konvention durchgängig | [21 §10i](21-UI-UX.md) | `datei:ui/shell/SourceBadge.svelte` | gebaut |
| BL-78 | S | feature | kür | 21 §10j Hof/Ort-Ereignisgruppierung vereinheitlicht | [21 §10j](21-UI-UX.md) | `datei:ui/shell/event-grouping.ts` | gebaut |
| BL-50 | — | hygiene | basis | L3 durchsetzen: Status-Wörter aus Specs 10–32 entfernen | [05](05-Backlog.md) | `!txt:nicht gebaut,✅ gebaut,noch offen@specs/v9/1*.md,specs/v9/2*.md,specs/v9/3*.md` | gebaut |
| BL-47 | — | defekt | blockiert | Orts-Resolver: Registry-Neubau pro Event (89 s bei 20k) | [ADR-v9-88](04-Entscheidungslog.md), [11 §4.2](11-Orte-Hoefe-Identitaet.md) | `test:tests/perf/scale.perf.test.ts` | gebaut |
| BL-48 | — | hygiene | basis | Perf-Gate in CI verdrahten | [31 §4](31-Dev-Umgebung.md), [32 §7](32-Testframework.md) | `txt:test:perf@.github/workflows/ci.yml` | gebaut |
| BL-01 | K | feature | blockiert | Undo/Redo (Snapshot-Stack ≥30, „Revert to Saved“) | [20 §1.2](20-Funktionen.md), [ADR-v9-92](04-Entscheidungslog.md) | `test:tests/ui/app-state-undo.test.ts` | gebaut |
| BL-54 | — | hygiene | basis | `max-lines`-Regel für `.svelte` (Ratsche, s. u.) | [02 §2](02-Zielarchitektur-v9.md), [32](32-Testframework.md) | `txt:max-lines@eslint.config.js` | gebaut |

## Typen

| Typ | Bedeutung | Priorität |
|---|---|---|
| `feature` | Steht als Anforderung in einem Spec-Bullet. | erbt `[K]`/`[S]`/`[E]` aus dem Spec |
| `defekt` | Etwas Gebautes funktioniert nicht wie zugesichert. Kein Spec-Bullet, daher `—`. | `—` |
| `hygiene` | Arbeit am Projekt selbst (Gates, Lints, Spec-Pflege), nicht am Produkt. | `—` |

## Beleg-Syntax

Ein Beleg **trifft**, wenn die Fertig-Bedingung erfüllt ist. `offen` + Treffer und
`gebaut` + kein Treffer sind beides Fehler (L1/L2).

- `sym:<Name>` — Deklaration `export function|const|class|interface|type <Name>` im
  Code-Repo (`core/ services/ ui/ app/`).
- `datei:<Pfad>` — Datei existiert im **Code-Repo**.
- `spec:<Pfad>` — Datei existiert im **Spec-Repo** (dieses Repo).
- `test:<Pfad>` — Testdatei existiert **und enthält kein `it.skip`/`describe.skip`**.
  Für Defekte die richtige Wahl: sie nimmt die Lösung nicht vorweg. Bei BL-47 ist die
  Fertig-Bedingung exakt „der 20k-Test läuft unskipped grün" — unabhängig davon, ob die
  Lösung eine inkrementelle Registry, ein Cache oder etwas Drittes wird.
- `txt:<Regex>@<Pfad>` — Datei enthält das Muster (für CI-/Konfig-Verdrahtung).
- `!` vor einer Art **negiert**: die Fertig-Bedingung ist die *Abwesenheit* des Musters —
  nötig für Aufräum-Zeilen (BL-50/52/53), deren Erfolg sich nur als Fehlen zeigt.

**Drei Schreibregeln, jede aus einem Fehlschlag beim Aufsetzen dieser Tabelle:**

1. **Kein `|` in einem Beleg** — auch nicht als `\|`. Eine Markdown-Tabelle wird an `|`
   gesplittet, *bevor* irgendetwas unescaped wird; ein Regex-Alternativ-Strich zerlegt
   die Zeile. Alternativen deshalb **komma-getrennt**: `txt:muster1,muster2@pfad`
   (Bedeutung: mindestens eines trifft). Mehrere Pfade ebenso komma-getrennt, `*` als
   Glob im Dateinamen erlaubt.
2. **Nur `sym:` entfernt vorher Kommentare, `txt:` sucht im Rohtext.** Bei `sym:` ist
   Prosa in Kommentaren die Gefahr; bei `txt:` ist der Kommentar oft genau das Ziel
   (BL-53 sucht ein `eslint-disable`, das ein Kommentar *ist*) — und in Markdown-Dateien
   wäre Strippen ohnehin sinnlos.
3. **Regex-Sonderzeichen mit einfachem Backslash escapen** (`\[K\]`), nicht doppelt und
   nicht als `[]]`: `[]` ist in JavaScript eine *leere* Zeichenklasse, die nie trifft —
   `[[]K[]]` sieht aus wie „eckige Klammer, K, eckige Klammer" und matcht in Wahrheit
   nichts.
- **Der Scanner muss die Dateien selbst einlesen, nicht `grep` aufrufen.** Bei der
  [K]-Inventur las das lokale `grep` (ugrep) `core/places/curation.ts` stillschweigend als
  leer — `isEnrichedPlace`/`hasReference`/`findPlaceDuplicates` wurden als „nicht gebaut"
  gemeldet, obwohl alle drei existieren. Ein Scanner, der still nichts findet, erzeugt
  falsche `offen`-Zeilen und damit exakt die Doppelarbeit, die dieses Dokument verhindern soll.

## BL-54 im Detail — aus einer Beobachtung wird ein Gate

Der Fund lautete ursprünglich „die Views werden fett" (`PlaceDetail.svelte` 922 Zeilen,
UI zu Kern 4:1). Als Risikozeile wäre das ein Gradient ohne Fertig-Zustand — deshalb die
Umwandlung in eine Schwelle. Ist-Verteilung (2026-07-18): **Median 195 Zeilen**, 12 Dateien
über 400, **9 über 500**.

Umgesetzt ist dasselbe Ratschen-Muster wie beim Perf-Budget (ADR-v9-88): eine
`max-lines`-Regel für `.svelte` bei **600 Zeilen** in `eslint.config.js`, die Altfälle
einzeln eingetragen. Neue Dateien laufen sofort gegen die Schwelle; die Altfälle werden
beim nächsten inhaltlichen Anfassen zerlegt und ihre Zeile dabei gestrichen. **Die
Altfall-Liste ist der Fortschrittsanzeiger** — schrumpft sie nicht, ist das sichtbar,
statt in einer Risikoliste zu verschwinden.

Zwei Präzisierungen beim Bau (2026-07-18):

- **Fünf Altfälle, nicht neun.** Die Planzeile übernahm die „9 über 500" aus der
  Ist-Verteilung, obwohl die Schwelle bei 600 liegt: über 600 liegen nur
  `PlaceDetail` (921), `TasksView` (676), `HofDetail` (641), `PersonDetail` (621),
  `HypothesesView` (608). Ein Eintrag für die vier Dateien zwischen 500 und 600 hätte
  sie von der 600er-Schwelle **ausgenommen** — also den Schutz abgeschaltet, den er
  vorgibt zu dokumentieren.
- **Der Eintrag ist keine Freistellung, sondern eine Ratsche auf dem Ist-Wert**
  (`'ui/views/place/PlaceDetail.svelte': 921`): schrumpfen erlaubt, wachsen nicht.
  `max-lines: 'off'` hätte den größten Dateien als einzigen unbegrenztes Wachstum
  erlaubt.

**Wirkung verifiziert, nicht nur Exit-Code** (die Lehre aus BL-47/48, ADR-v9-91): neue
Datei mit 601 Zeilen → Fehler, mit 600 → grün; ein Altfall um eine Zeile verlängert →
Fehler („Maximum allowed is 608"), zurückgesetzt → grün. Die Zählung umfasst dabei die
**ganze Datei inkl. Markup**, nicht nur den `<script>`-Block — bei diesen Views der
überwiegende Teil, ohne den die Regel fast nichts gemessen hätte.

## Lint-Regeln (Erweiterung von `spec-lint`)

Ausführen: `node .claude/skills/spec-lint/check-backlog.mjs` (Exit 0 = konsistent).
Den Prüfer selbst prüfen: `… --selftest`.

| # | Prüfung | Härte | Fängt |
|---|---|---|---|
| L1 | Status `offen`, Beleg **trifft** | **Fehler** | Fertig gebaut, Doku sagt offen → Doppelarbeit (der ADR-v9-78-Fall). |
| L2 | Status `gebaut`, Beleg **trifft nicht** | **Fehler** | Umbenennung/Löschung eines fertigen Features. |
| L3 | **Jedes** Status-Wort in den Specs 10–32 (Ratsche seit BL-50 auf **0**) | **Fehler** | Rückfall in die Vermischung von Soll und Ist. Die Ratsche stand bis 2026-07-18 auf 33 (Altlast); seit deren Beseitigung ist jede neue Fundstelle ein harter Fehler und darf nie wieder geduldet werden. |
| L4 | Backlog-Zeile ohne auflösbaren Spec-Link | Warnung | Verwaiste Zeilen. |
| L5 | Zeile steht im Abschnitt, der **nicht** zu ihrem Status passt | **Fehler** | Erledigtes, das unter „Offene Punkte“ stehen bleibt, weil beim Bau nur das Status-Wort geändert und die Zeile nicht verschoben wurde. Beim Lesen sieht man die Überschrift, nicht die achte Spalte — eine Zeile, die man nur durch Scrollen als erledigt erkennt, ist praktisch nicht erledigt (Fund 2026-07-18 an BL-01). |
| L6 | Diese Tabelle ↔ tatsächlich implementierte Regeln | **Fehler** | Drift der Regel-Doku selbst. Die Regeln stehen an drei Stellen (Implementierung, `SKILL.md`, diese Tabelle); beim Nachrüsten von L5 wurden zwei davon sofort vergessen. Das Skript leitet seine Regeln aus dem eigenen Quelltext ab und vergleicht sie hiermit — in beide Richtungen. |
| — | Status weder `offen` noch `gebaut` | **Fehler** | Rückkehr von „teilweise" (Regel 2). |

**Die Asymmetrie ist Absicht.** Status `offen` + kein Treffer ist immer in Ordnung, auch
wenn der spätere Bau ein anderes Symbol wählt als der hier vorhergesagte Beleg — dieser
Fall scheitert sicher (meldet weiter „offen", bis jemand die Zeile beim Bau anfasst).
Die gefährliche Richtung ist „steht als offen drin, ist längst da"; die fängt L1 hart ab.
Ein Backlog, das zu viel Arbeit anzeigt, kostet einen Blick; eines, das zu wenig anzeigt,
kostet einen doppelt gebauten Feature-Zweig.
