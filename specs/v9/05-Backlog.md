# 05 — Backlog

**Die einzige Status-Wahrheit des Projekts.** Die Specs [10](10-Domaenenmodell.md)–[32](32-Testframework.md)
beschreiben ausschließlich den Soll-Zustand und treffen **keine** Aussage darüber, was
gebaut ist; das [Entscheidungslog](04-Entscheidungslog.md) hält Entscheidungen fest, nicht
Fortschritt. Wer wissen will, was offen ist, liest nur hier.

Stand: **[K]-Inventur vollständig** (2026-07-18) und **[S]/[E]-Inventur vollständig**
(2026-07-21, BL-51) — jeder Punkt am Code verifiziert, nicht aus der Spec geschlossen.
Alle 29 S/E-Bullets aus [20](20-Funktionen.md) tragen eine Zeile, mit **zwei bewussten
Ausnahmen**: „Geräte-Sync über OS-Sync-Ordner" ([20 §1.2](20-Funktionen.md)) verlangt
gar keine App-Arbeit — genau das ist die Entscheidung (ADR-v9-04), getragen von BL-17/18;
und „Verwandtschaft zum Probanden als Dauer-Sektion" ([20 §1.12](20-Funktionen.md)) ist
im Spec ausdrücklich „noch nicht spezifiziert" und hat damit keinen entscheidbaren
Fertig-Zustand (Regel 4). Die Specs 10–32 sind seit BL-50 frei von Status-Aussagen —
L3 ist hart (Ratsche 0).

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
| BL-135 | S | feature | kür | `LogResult` kennt nur `found`/`notfound`/`pending` — der vierte Ergebniswert „teilweise" fehlt, der „nichts gefunden" von „Fund, aber unvollständig" trennt (Wiedervorlage). Beim Aufräumen von §1.11b gefunden, wo er bis dahin als Prosa-Nachtrag stand | [20 §1.11b](20-Funktionen.md), [12 §2](12-Forschungsdaten.md) | `txt:partial@core/research/types.ts` | offen |
| BL-119 | S | feature | basis | Export-Auswahl in der UI: Anonymisierung/GED7/Strict/GRAMPS sind im Rohr gebaut (BL-118), aber von KEINER Fläche aus erreichbar — `ExportFormat` hat in `ui/`/`app/` keinen einzigen Aufrufer, der Speichern-Knopf fährt ausschließlich 5.5.1 in-place | [20 §1.2](20-Funktionen.md), [14 §3](14-Dateihandling.md) | `datei:ui/views/export/ExportView.svelte` | offen |
| BL-120 | S | feature | kür | Proband konfigurierbar + „Zum Probanden"-Navigation. Heute existiert `probandId` NUR als Feld der Validierungs-Konfiguration (BFS-Wurzel in `core/validate/context.ts`) — keine Einstellfläche, kein Navigationsbefehl | [20 §1.1](20-Funktionen.md) | `sym:goToProband` | offen |
| BL-121 | S | feature | kür | Vollständigkeits-Heatmap: Ring an der Baum-Karte aus derselben Per-Person-Befundschwere wie das Dashboard (kein zweiter Mini-Validator) — die Baum-Insel bekommt die Schwere vorberechnet übergeben | [20 §1.3](20-Funktionen.md), [21 §8](21-UI-UX.md) | `txt:severity@ui/islands/tree/tree-model.ts` | offen |
| BL-122 | S | feature | kür | Nachkommen-Baum (top-down, Gen 2–7, Ehepartner/Geschwister, T-Linien) | [20 §1.3](20-Funktionen.md) | `datei:ui/islands/tree/descendant-tree.ts` | offen |
| BL-123 | S | feature | kür | Fan-Chart (konzentrische Halbkreis-Segmente, 3–6 Generationen) | [20 §1.3](20-Funktionen.md) | `datei:ui/islands/tree/fan-chart.ts` | offen |
| BL-124 | E | feature | kür | Diagramm-Export als PNG; Großposter-SVG (A1, vektoriell) | [20 §1.3](20-Funktionen.md) | `sym:exportDiagramAsPng` | offen |
| BL-125 | S | feature | kür | CSV-Export der gefilterten Personen- UND Familienliste (zwei Spec-Bullets, ein Mechanismus — INV-UI-4). Projektweit existiert bislang kein CSV-Pfad | [20 §1.4/§1.5](20-Funktionen.md) | `sym:toCsv` | offen |
| BL-126 | S | feature | kür | Medien-Verwaltung: Kachelgalerie · Medium-Detail (globale vs. referenz-spezifische Felder) · Referenzliste mit `Picker`-Verknüpfen. Kern-Modell `Media`/`MediaCitation` steht, UI fehlt vollständig | [20 §1.4/§1.5](20-Funktionen.md), [10 §4](10-Domaenenmodell.md) | `datei:ui/views/media/MediaGallery.svelte` | offen |
| BL-127 | S | feature | kür | Assoziationen-UI (Zeugen/Paten/Informanten): Kern samt Parser/Writer ist vollständig gebaut, `associations` kommt in `ui/` kein einziges Mal vor — reine UI-Lücke, kein neues Kern-Konzept | [20 §1.4](20-Funktionen.md), [10 §2](10-Domaenenmodell.md) | `txt:associations@ui/views/person/person-detail-model.ts` | offen |
| BL-128 | S | feature | kür | Quellen-Vorlagen (Kirchenbuch/Standesamt/Volkszählung …) füllen Kurzname/Titel/Autor/Medientyp vor — gleiche Preset+Freitext-`datalist`-Mechanik wie Aufgaben-Kategorien (INV-UI-4) | [20 §1.6](20-Funktionen.md) | `sym:SOURCE_TEMPLATES` | offen |
| BL-130 | S | feature | kür | Nominatim-Geocoding (Einzel + Batch). Bislang existiert nur der CSP-Eintrag für den Host (`app/csp-policy.ts`), kein Aufruf | [20 §1.7](20-Funktionen.md) | `sym:geocodePlace` | offen |
| BL-131 | S | feature | kür | GOV-Import (historisch datiert). `govId`/`govTypes` sind als Felder gebaut und editierbar — der importierende Weg fehlt | [20 §1.7](20-Funktionen.md), [11 §1](11-Orte-Hoefe-Identitaet.md) | `sym:importGovEntry` | offen |
| BL-132 | S | feature | kür | Geo-Plausibilitäts-Validator. Die Regelgruppe `plausibilitaet` in `core/validate/rules.ts` prüft ausschließlich Alters-/Datumsplausibilität, keine Koordinaten | [20 §1.7](20-Funktionen.md), [20 §3](20-Funktionen.md) | `txt:PLACE_COORD@core/validate/rules.ts` | offen |
| BL-133 | E | feature | kür | Story-Modus (Biografie aus Event-Templates + Epochen-Kontext, Karte, Download) — im Register bereits als „Story (folgt)" sichtbar | [20 §1.10](20-Funktionen.md) | `datei:ui/views/story/StoryView.svelte` | offen |
| BL-134 | S | feature | kür | Beziehungsrechner (BFS, gemeinsamer Vorfahre, Cousin-Grade) + Beziehungen modellieren (+Ehepartner/+Kind/+Elternteil). On-Demand-Werkzeug, kein Dauer-Element (INV-UI-11) | [20 §1.12](20-Funktionen.md) | `sym:findRelationshipPath` | offen |
| BL-95 | — | defekt | basis | Lens-Umschalter-Zeile läuft bei 375px über: benötigt 383px, hat 272px (der „Vollbild"-Knopf teilt sich die Zeile) → „Story" liegt vollständig außerhalb, erreichbar nur per Horizontal-Scroll ohne Affordanz. Verstößt gegen [21 §2](21-UI-UX.md) „Aktionsreihen brechen um statt zu scrollen" und holt v8-Befund B7 zurück. Die Entitäts-Reihe ist NICHT betroffen (375/375, volle Breite) — der Kanon `.stb-segment-row` (`overflow-x: auto`) trägt nur dort nicht, wo eine Aktion neben den Segmenten sitzt | [21 §2/§9 B7](21-UI-UX.md), [21 §4](21-UI-UX.md) | `test:tests/ui/lens-header-overflow.test.ts` | offen |
| BL-94 | S | feature | kür | Dritter Kontext-Pane auf Desktop — Inhalt zuerst spezifizieren, dann bauen (§3 nennt „Quellen zum Ereignis" als Beispiel, nicht als Anforderung) | [21 §3](21-UI-UX.md) | `sym:ContextPane` | offen |
| BL-07 | K | feature | basis | History-Navigation (Zurück/Vorwärts, Swipe-Right) | [20 §1.1](20-Funktionen.md) | `sym:useHistory` | offen |
| BL-09 | K | feature | kür | Mini-Karte im Ort-Steckbrief | [20 §1.7](20-Funktionen.md) | `datei:ui/views/place/PlaceMiniMap.svelte` | offen |
| BL-10 | K | feature | kür | Soundex-Modus in der Personensuche (im Spec „optional") | [20 §1.4](20-Funktionen.md) | `sym:soundex` | offen |
| BL-80 | — | defekt | usp | GRAMPS-Export schreibt editierten `db`-Zustand nicht zurück (nur Passthrough aus `roots`) | [13 §3](13-Interop-Roundtrip.md), [14 §3.2](14-Dateihandling.md) | `test:tests/roundtrip/gramps-write-back.test.ts` | offen |
| BL-81 | — | defekt | usp | `xml-tree`-Serializer verliert Mixed Content **still** (`hasText && hasChildren`) — fail-loud statt Verlust | [13](13-Interop-Roundtrip.md) | `test:tests/core/xml-tree-mixed-content.test.ts` | offen |
| BL-82 | — | defekt | basis | Union-Merge-Tie-Break vergleicht Speicherzeit (`clock.now()`) statt Autorenzeit → lokal gewinnt praktisch immer | [11 §2](11-Orte-Hoefe-Identitaet.md) | `test:tests/services/places-sync-tiebreak.test.ts` | offen |
| BL-83 | S | feature | kür | `_EVAL`-Wire-Format (Parser + Writer) — heute nur im Strict-Adapter gestrippt, nirgends erzeugt | [12 §3](12-Forschungsdaten.md) | `test:tests/roundtrip/eval-roundtrip.test.ts` | offen |
| BL-89 | — | hygiene | kür | Skalen-Gate deckt die Orts-Kandidatenbreite nicht ab: 20k Personen erzeugen nur **23** PlaceObjects (6 Dörfer) zu 2.196 Höfen — real ist es 416 zu 210. Disambiguierungs-Pfade (§4.2 3c/3c′, Review-Klasse P) laufen dort praktisch leer; der Generator-Kopfkommentar behauptet dennoch „realistisch schwer" | [32 §2](32-Testframework.md), [30 §1](30-NFR-und-Persistenz.md), [11 §4.2](11-Orte-Hoefe-Identitaet.md) | `txt:MIN_DISTINCT_PLACES@tests/perf/scale.perf.test.ts` | offen |
| BL-87 | — | feature | kür | INV-UI-14-Reichweite auf die Karten-Insel klären und nachziehen — `map-model.ts` liest `pl.title` an drei Stellen direkt (Marker-Titel, Hof-Titel, Event-Fallback) | [21 §6l](21-UI-UX.md), [11 §5](11-Orte-Hoefe-Identitaet.md) | `txt:placeDisplayName@ui/islands/map/map-model.ts` | offen |
| BL-88 | — | hygiene | kür | „Kein View liest `po.title` direkt" als Lint-Regel erzwingen statt als Konvention (analog der `<select bind:value>`-Regel, [32 TST-12](32-Testframework.md)) | [11 §5](11-Orte-Hoefe-Identitaet.md), [21 §6l](21-UI-UX.md) | `txt:placeDisplayName@eslint.config.js` | offen |
| BL-56 | S | feature | kür | Research-Timeline-Umschalter (Protokoll chronologisch) | [12 §2](12-Forschungsdaten.md) | `sym:buildResearchTimeline` | offen |
| BL-57 | S | feature | basis | Evidenz-Bewertung: Aufklapper an der Zitat-Zeile | [12 §3](12-Forschungsdaten.md) | `!txt:TODO@ui/shell/SourceCitationRow.svelte` | offen |
| BL-58 | S | feature | kür | Forschungsprojekte: Scope-Matching + UI | [12 §5](12-Forschungsdaten.md) | `sym:matchesScope` | offen |
| BL-59 | S | feature | kür | Ortsübersetzungen (`PlaceObject.translations`) | [11 §1](11-Orte-Hoefe-Identitaet.md) | `txt:translations\s*:@core/places/types.ts` | offen |
| BL-60 | S | feature | kür | Personen-Kontext-Sprung in die Karte | [20 §1.9](20-Funktionen.md) | `sym:goToMapForPerson` | offen |
| BL-61 | S | feature | kür | Beweisführungsnotiz (GPS-Zusammenfassung) | [20 §1.11e](20-Funktionen.md) | `sym:buildEvidenceSummary` | offen |
| BL-109 | S | feature | kür | INV-UI-6 in den drei Forschungslisten: Aufgaben, Protokoll und Hypothesen führen die Person als `entityLabel` ohne Disambiguierung — zwei gleichnamige Personen erzeugen zwei identisch beschriftete Gruppen. Braucht einen `PlaceContext` in `collectAllTasks`/`collectAllLogEntries`/`collectAllHypotheses` (heute nur `db`) | [21 §6c](21-UI-UX.md), [20 §1.11](20-Funktionen.md) | `txt:yearPlaceSummary@ui/views/tasks/tasks-model.ts` | offen |
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
| BL-110 | — | defekt | basis | Picker-Trefferliste hing als `position: absolute` im eigenen Teilbaum — dritte Overlay-Art, die BL-85 nicht mitzog. Gemessen an „Kind hinzufügen": Klippkante `.family-detail` bei y=333, Panel bis y=570, sichtbar 34 px, Treffer unerreichbar. Jetzt `use:anchoredTo` (INV-UI-13); `--stb-anchor-width` hält die Liste feldbündig, `focusout` prüft beide Teilbäume, sonst schlösse der eigene Klick die Liste vor der Auswahl | [21 §6k](21-UI-UX.md), [ADR-v9-108](04-Entscheidungslog.md) | `txt:anchoredTo@ui/shell/Picker.svelte` | gebaut |
| BL-84 | — | hygiene | kür | 26 tote Sprungmarken (21× `#adr-v9-NN` aus [04a](04a-Chronik.md), 4× `#17-orte-tab`/`#18-höfe-tab` in [20](20-Funktionen.md), 1× in [21 §5](21-UI-UX.md)) — GitHub bildet den Anker aus der VOLLEN Überschrift. Statt die Links auf Langslugs umzuschreiben tragen die Ziele jetzt echte `<a id>`-Anker (107 ADR-Überschriften, uniform); `check-anchors.mjs` prüft es mechanisch, mit GitHubs vendorierter Slug-Regel statt einer Näherung (Äquivalenz über 327 Überschriften gemessen) | [04a](04a-Chronik.md), [20](20-Funktionen.md), [21](21-UI-UX.md) | `txt:check-anchors@.claude/skills/spec-lint/SKILL.md` | gebaut |
| BL-51 | — | hygiene | kür | [S]/[E]-Inventur: alle 29 Bullets aus Spec 20 am Code verifiziert, 21 neue Zeilen (BL-111…BL-134), zwei begründete Ausnahmen (s. Kopf). Der ursprüngliche Beleg `!txt:noch nicht…inventarisiert@05-Backlog.md` war **strukturell unerfüllbar** — das Muster stand in der Beleg-Zelle selbst, ein negierter `txt:`-Beleg auf die eigene Datei kann nie zutreffen. Ersetzt durch die L7-Ratsche, die aus der Doku-Aussage einen Wächter macht | [20](20-Funktionen.md) | `txt:SE_BULLETS@.claude/skills/spec-lint/check-backlog.mjs` | gebaut |
| BL-52 | — | hygiene | kür | Spec 20 führte §1.11 in einem zweiten Format (`**a) Titel [K] — gebaut.**`) — es trug als einziges noch Status-Aussagen („gebaut", „Kern gebaut, UI offen", „Fehlt: …"), an L3 vorbei, weil dessen Wortliste sie nicht kennt. Jetzt Standardformat `- **[K]** **a) Titel.**`; die Buchstaben bleiben (§1.11a–h wird aus vier Dokumenten referenziert), die Status-Aussagen sind zu Zeilen geworden | [20 §1.11](20-Funktionen.md) | `!txt:^[*][*][a-z][)] .*\[K\]@specs/v9/20-Funktionen.md` | gebaut |
| BL-53 | — | hygiene | kür | `eslint-disable no-useless-assignment` in `TimelineLensView.svelte` war schon bei BL-01 entfernt worden — stehen blieben die Begründungs-Prosa und eine Zeile aus Leerzeichen. Die Regel ist aktiv (`--print-config`: Schwere 2) und meldet nichts mehr, der Kommentar beschrieb also einen Zustand, den es nicht mehr gab; der sachliche Teil (Fallback-Wert, Deklarations-Reihenfolge/TDZ) bleibt | [32](32-Testframework.md) | `!txt:no-useless-assignment@ui/views/timeline/TimelineLensView.svelte` | gebaut |
| BL-111 | S | feature | kür | Demo-Modus: „Demo laden" fährt dieselbe Lade-Pipeline wie eine echte Datei, meldet aber bewusst kein `fileHandle` — funktioniert offline aus dem Service-Worker-Cache | [20 §1.2](20-Funktionen.md) | `datei:app/public/demo.ged` | gebaut |
| BL-112 | S | feature | kür | Interaktive Karte mit drei Modi (Orte · Personen-Cluster · Migrationen) als imperative Insel; Modus im ViewState verankert (BL-98) | [20 §1.9](20-Funktionen.md), [21 §4](21-UI-UX.md) | `sym:MapModeId` | gebaut |
| BL-113 | S | feature | kür | Zeitleiste als imperative Insel: Swim-Lane + Dekaden-Modus, Mehrpersonen, historische Ereignisse als Kontextband | [20 §1.10](20-Funktionen.md) | `sym:computeSwimLaneLayout` | gebaut |
| BL-114 | S | feature | kür | Interaktive Statistik-Ansicht — EIN Rechenkern für Live-Ansicht und gedruckten Report, rechnet über `PlaceContext` statt über rohe `event.place`-Strings | [20 §1.13](20-Funktionen.md), [20 §4](20-Funktionen.md) | `sym:computeStatistics` | gebaut |
| BL-115 | S | feature | kür | Hypothesen: Annahme, Status, Konfidenz (getrennt von der Quellen-Beweiskraft, INV-H1), Evidenz als reine SID-Referenz (INV-H2) | [20 §1.11d](20-Funktionen.md), [12 §4](12-Forschungsdaten.md) | `datei:ui/views/hypotheses/HypothesesView.svelte` | gebaut |
| BL-116 | S | feature | kür | Forschungsprotokoll: Eintrag (Datum, Archiv, Quelle, Suchanfrage, Ergebnis, Notiz) + globale Liste. Der chronologische Timeline-Umschalter ist eine eigene Zeile (BL-56) | [20 §1.11b](20-Funktionen.md), [12 §2](12-Forschungsdaten.md) | `datei:ui/views/research-log/LogView.svelte` | gebaut |
| BL-117 | S | feature | kür | Evidenzmodell-Kern: drei Achsen + `evalToQuay()` als AUTORITATIVE QUAY-Vorschlagsregel. Die Zitat-Zeile bietet die Achsen noch nicht an (BL-57) | [20 §1.11c](20-Funktionen.md), [12 §3](12-Forschungsdaten.md) | `sym:evalToQuay` | gebaut |
| BL-118 | S | feature | kür | Anonymisierung, GED7 und Strict als Serializer im EINEN Export-Rohr (Format-Auswahl entscheidet Serializer + Dateiendung). Erreichbar ist bislang nur 5.5.1 in-place — die Auswahlfläche fehlt (BL-119) | [20 §1.2](20-Funktionen.md), [13](13-Interop-Roundtrip.md), [14 §3](14-Dateihandling.md) | `sym:ExportFormat` | gebaut |
| BL-129 | S | feature | kür | `orte.json`-Import/Export mit Dedup und Multi-Device-Konflikterkennung; der Import löst einen vollen `resolveEvents()`-Neuauflauf aus, weil er die Identitäts-Zuordnung selbst ändern kann (ADR-v9-47) | [20 §1.7](20-Funktionen.md), [11 §3](11-Orte-Hoefe-Identitaet.md) | `sym:createPlacesFileIO` | gebaut |
| BL-64 | S | feature | kür | Ehepartner/Eltern-Disambiguierung: `fam.members` in `PersonDetail` trägt jetzt `yearPlaceSummary` wie die Kinder-Zeile daneben (INV-UI-6). Picker/globale Suche gegengeprüft — erfüllen die Regel bereits. (Der ursprüngliche Beleg `sym:memberLabel` benannte ein Symbol, das nie existierte — L2 fing es beim Umtragen) | [20 §1.4](20-Funktionen.md), [21 §6c](21-UI-UX.md), ADR-v9-52 | `txt:summary: yearPlaceSummary@ui/views/person/person-detail-model.ts` | gebaut |
| BL-108 | — | defekt | basis | Scoring las `given`/`surname` roh — bei GEDCOM ohne `GIVN`/`SURN`-Untertags (`1 NAME Anna /Decker/`, verbreitete Form) fielen 44 der 100 Punkte weg und das Bucketing griff ins Leere; Duplikat-Erkennung meldete auf solchen Dateien nichts. Kanonische Ermittlung jetzt im Kern, `person-display` delegiert | [10 §2](10-Domaenenmodell.md), [20 §1.12](20-Funktionen.md) | `datei:core/model/name-parts.ts` | gebaut |
| BL-107 | S | feature | basis | Import-Vergleich: Ansicht bei den Datei-Aktionen — Klassifikation, Diff in drei Kategorien, je Feld Übernehmen · A+B · Ignorieren · Forschungseintrag, „≠ Andere Person"; geschrieben wird erst auf „Übernehmen" (Undo-fähig). GRAMPS wird abgewiesen statt still falsch geparst | [20 §1.12](20-Funktionen.md), [21 §10b](21-UI-UX.md) | `datei:ui/views/import/ImportCompareView.svelte` | gebaut |
| BL-106 | S | feature | basis | Import-Vergleich: `applyImportPatch` — übernehmen · A+B · neue Personen samt Familienbindungen · EINE Import-Quelle als Beleg. Zieht Quellen UND deren Archive aus der Fremddatei mit, statt Zitate verwaisen zu lassen (am echten Material gefunden: erst 6, dann 1 hängende Referenz) | [20 §1.12](20-Funktionen.md), [10 §4](10-Domaenenmodell.md) | `sym:applyImportPatch` | gebaut |
| BL-63 | S | feature | basis | Import-Vergleich, Kern: `compareImport` (Klassifikation ≥75/40–74/<40) + `diffPerson` (Ergänzungen · Konflikte · Identisch). Teilt Scoring und Bucketing mit BL-62; `scorePersonPair` nimmt dafür einen zweiten Graphen — v8 schlug die Verwandtschaft der Fremdperson im FALSCHEN Bestand nach (ADR-v9-107) | [20 §1.12](20-Funktionen.md), [ADR-v9-107](04-Entscheidungslog.md) | `sym:compareImport` | gebaut |
| BL-105 | S | feature | kür | „Kein Duplikat" merkt ein Paar dauerhaft — eigener Store im gemeinsamen IDB-Schema (Version 5) hinter dem `DedupIgnoreStore`-Vertrag, app-lokal wie `val-config`; `pairKey` im Kern als EINE Schlüsseldefinition für Finder, Ansicht und Speicher | [30 §2](30-NFR-und-Persistenz.md), [ADR-v9-104](04-Entscheidungslog.md) | `txt:STORE_DEDUP_IGNORED@services/idb-schema.ts` | gebaut |
| BL-104 | S | feature | basis | Dedup-Ansicht + Merge-Modal für Personen — Overlay im Personen-Segment (INV-UI-4), Öffner hinter der Werkzeuge-Disclosure (INV-UI-11), Item-Modal mit Feld-für-Feld-Wahl aus `MERGEABLE_PERSON_FIELDS`, „⇄ Seiten tauschen", „📝 Forschungseintrag" statt Merge | [20 §1.12](20-Funktionen.md), [ADR-v9-63](04-Entscheidungslog.md), [ADR-v9-104](04-Entscheidungslog.md) | `datei:ui/views/person/PersonDedupView.svelte` | gebaut |
| BL-103 | S | feature | basis | `mergePersons` als Kern-Kommando (`core/dedup`) — Save+Delete hinterlässt gegengeprüft 3 Waisen, das Kommando 0; Umhängen über die synchron haltenden Kommandos aus `integrity.ts` (INV-P3), Feldauswahl aus EINER Liste (`MERGEABLE_PERSON_FIELDS`) für Kommando und Modal | [20 §1.12](20-Funktionen.md), [10 §6](10-Domaenenmodell.md), [ADR-v9-104](04-Entscheidungslog.md) | `sym:mergePersons` | gebaut |
| BL-62 | S | feature | basis | Duplikat-Erkennung Personen: Kern-Finder (`core/dedup`). Gewichte aus dem v8-Orakel bis auf den gemessenen Geburtsjahr-Malus (ADR-v9-106: 2.436 → 1.234 Paare ohne Verlust echter Duplikate), Ortsvergleich zusätzlich über `placeId` (INV-PLACE statt Schreibweise). Nachname-Bucketing mit 3 Zeichen als gemessene Entscheidung: ohne Bucketing 36× Laufzeit für 2,4 % mehr Paare | [20 §1.12](20-Funktionen.md), [ADR-v9-104](04-Entscheidungslog.md), [ADR-v9-106](04-Entscheidungslog.md) | `sym:findPersonDuplicates` | gebaut |
| BL-101 | — | defekt | basis | Picker verlangte ein ZWEITES Eingabefeld: Ort/Adresse hinter einer 🔍-Lupe, Entitäts-Picker hinter einem Feld-Knopf — vier Interaktionen für eine Auswahl. `Picker.svelte` ist jetzt eine Combobox (das Feld IST das Suchfeld, ↓/↑/Enter/Escape), `freeText` trägt die Ort/Adresse-Seite; im Freitext-Modus gilt der vorhandene Wert NICHT als Suchbegriff | [21 §6](21-UI-UX.md), [ADR-v9-103](04-Entscheidungslog.md) | `txt:freeText@ui/shell/Picker.svelte` | gebaut |
| BL-102 | — | defekt | basis | Neun Picker standen in einem `<label>` — mit eingebetteter Trefferliste öffnet ein Treffer-Klick die eben geschlossene Liste sofort wieder. Ersetzt durch `.stb-field`/`.stb-field__caption`, als Lint-Gate verankert (TST-18); der handgeschriebene grep fand nur sieben der neun | [32 TST-18](32-Testframework.md) | `txt:Ein Picker darf nicht in einem@eslint.config.js` | gebaut |
| BL-97 | — | defekt | basis | Lens-Gruppe hatte keinen Merker: der Baum-Slot sprang stur auf den Baum statt auf die zuletzt offene Lens — Vor-/Zurückspringen zwischen zwei Ansichten unmöglich. `route.lensTarget`/`openLens()`, `LENS_SLOT_TARGETS` löst zugleich die doppelte Ziel-Aufzählung in `bottomNavSlotFor` auf | [21 §4](21-UI-UX.md), [ADR-v9-102](04-Entscheidungslog.md) | `sym:isLensTarget` | gebaut |
| BL-98 | — | defekt | basis | Personenauswahl und Anzeige-Modus der Diagramm-Lenses lagen komponenten-lokal und starben beim Unmount. Karte → ViewState-Ziel `mapPerson`, Zeitleiste → `setTimelinePersons` (Liste); Modi → `route.mapMode`/`timelineMode`. Geteilter `lensFocus` belegt nur noch vor, wenn die Sicht selbst keine Auswahl hat | [21 §4/§5](21-UI-UX.md), [20 §1.9/§1.10](20-Funktionen.md) | `txt:setTimelinePersons@ui/shell/view-state.svelte.ts` | gebaut |
| BL-99 | — | defekt | basis | Aufgaben-/Forschungsfläche fiel bei jedem Verlassen auf „Aufgaben" zurück (`activeSegment` lokal, Verzicht auf die Verankerung war im Kopfkommentar sogar ausdrücklich festgehalten) → `route.researchTarget` | [20 §1.11](20-Funktionen.md), [ADR-v9-102](04-Entscheidungslog.md) | `txt:setResearchTarget@ui/shell/route.svelte.ts` | gebaut |
| BL-100 | — | defekt | basis | Karte/Zeitleiste bauten ihren Personen-Picker als eigenes Overlay nach (Substring-Filter, keine Unterzeile) statt `PersonPicker` zu nutzen — dritter realer INV-UI-4-Bruch. Jetzt gemeinsamer Picker: Geburtsjahr/-ort als Unterzeile, `matchesSearch` wie die globale Suche; `Picker.onClose`/`PersonPicker.allowCreate` ergänzt | [21 §6](21-UI-UX.md), [ADR-v9-102](04-Entscheidungslog.md) | `!txt:map-lens-view__picker@ui/views/map/MapLensView.svelte` | gebaut |
| BL-96 | — | defekt | basis | Befehlsflächen-Budget hängt an der Spaltenbreite (≤ 400px), nicht am Formfaktor — die Desktop-Listenspalte misst 352px. Orts-/Hof-Werkzeuge hinter EINEN „Werkzeuge"-Einstieg (§6h); gemessen: PlaceList 161→124px und 3→2 Zeilen, HofList 2→1 Zeile | [21 §6h](21-UI-UX.md), [21 §3](21-UI-UX.md) | `!txt:ist mobil skopiert@specs/v9/21-UI-UX.md` | gebaut |
| BL-93 | K | feature | basis | Command-Palette (⌘K) über `globalSearch` + Registerziele als „Gehe zu"; Overlay portaliert, Escape greift auch im Suchfeld, Fokus kehrt zurück | [21 §3/§6k](21-UI-UX.md), [20 §1.1](20-Funktionen.md) | `datei:ui/shell/CommandPalette.svelte` | gebaut |
| BL-08 | K | feature | basis | Keyboard-Shortcuts Speichern/Escape/Palette; `belongsToField` trennt, was dem Eingabefeld gehört (nur ⌘Z/⇧⌘Z) — sonst wäre Escape im Overlay-Suchfeld ein Keyboard-Trap | [20 §1.2](20-Funktionen.md), [21 §6i](21-UI-UX.md) | `txt:'save'@ui/shell/shortcuts.ts` | gebaut |
| BL-92 | K | feature | basis | Multi-Pane Master-Detail (zwei Panes): Liste **und** Detail nebeneinander, Leerzustand im Detail-Pane, `DetailHeader` ohne „← Zur Liste"; Review-/Dedup-Werkzeuge bleiben vollbreit | [21 §3](21-UI-UX.md), [ADR-v9-101](04-Entscheidungslog.md) | `test:tests/ui/multi-pane.test.ts` | gebaut |
| BL-06 | K | feature | basis | Desktop-Sidebar: alle Ziele des Registers, nach Rolle gruppiert, Labels + Icons, ersetzt oberhalb 900px die Bottom-Nav; Entitäts-Segmentreihe und Lens-Umschalter entfallen dort (INV-UI-2/3) | [21 §3/§4](21-UI-UX.md), [ADR-v9-101](04-Entscheidungslog.md) | `datei:ui/shell/Sidebar.svelte` | gebaut |
| BL-91 | K | feature | blockiert | Formfaktor-Modul: EIN `matchMedia` in der Schale, zwei benannte Breakpoints (640 Overlay-Darstellung / 900 Layout+Navigation); Wächter verbietet unbenannte px-Breiten-Media-Queries | [21 §3](21-UI-UX.md), [ADR-v9-101](04-Entscheidungslog.md) | `sym:isDesktopLayout` | gebaut |
| BL-90 | K | feature | blockiert | Navigations-Ziel-Register + EINE Routen-Quelle (INV-UI-15): `nav-model.ts` + `route.svelte.ts` lösen `App.activeTarget`, `EntityTab.activeSegment` **und** `MoreView.openEntry` ab; BottomNav/MoreView/EntityTab projizieren. Voraussetzung für BL-06/BL-07 | [21 §3](21-UI-UX.md), [ADR-v9-101](04-Entscheidungslog.md) | `test:tests/ui/nav-register.test.ts` | gebaut |
| BL-04 | K | feature | basis | Validierung/Datenprüfung (Regel-Engine, RAM-Bericht) | [20 §1.11h, §3](20-Funktionen.md) | `sym:runValidation` | gebaut |
| BL-05 | K | feature | basis | Qualitäts-Dashboard (Score/Ampel/Lückenradar/Brennpunkte) | [20 §1.11g](20-Funktionen.md) | `sym:buildQualityDashboard` | gebaut |
| BL-55 | — | feature | basis | Orts-Anzeigetiefe (INV-UI-14): `shortName` + `buildListPlaceName` (Ort/Hof/Rohtext), Kette in Tooltip + Detailzeile | [11 §1/§5](11-Orte-Hoefe-Identitaet.md), [21 §6l](21-UI-UX.md), [ADR-v9-90](04-Entscheidungslog.md), [ADR-v9-100](04-Entscheidungslog.md) | `test:tests/ui/place-display-depth.test.ts` | gebaut |
| BL-85 | — | defekt | basis | Overlays aus klippenden/stapelnden Vorfahren befreit — Portal-Mechanismus (INV-UI-13) | [21 §6k](21-UI-UX.md) | `test:tests/ui/overlay-portal.test.ts` | gebaut |
| BL-86 | S | feature | basis | INV-UI-11-Retrofit der Forschungs-Arbeitsfläche (FilterBar + ViewModeToggle in Aufgaben/Protokoll/Hypothesen) | [21 §6h](21-UI-UX.md) | `txt:stb-filter-set@ui/shell/design-system.css` | gebaut |
| BL-11 | K | feature | basis | Rollenbasierte Navigation (Mobile Bottom-Nav) | [20 §1.1](20-Funktionen.md) | `datei:ui/shell/BottomNav.svelte` | gebaut |
| BL-12 | K | feature | basis | Einheitlicher Lens-Umschalter | [20 §1.1](20-Funktionen.md) | `datei:ui/shell/LensSwitcher.svelte` | gebaut |
| BL-13 | K | feature | basis | ViewState (Auswahl je Ziel, INV-VS) | [21 §5](21-UI-UX.md) | `sym:createViewState` | gebaut |
| BL-14 | K | feature | basis | Globale Suche über alle fünf Entitäten | [20 §1.1](20-Funktionen.md) | `datei:ui/views/search/GlobalSearchView.svelte` | gebaut |
| BL-15 | K | feature | usp | GEDCOM 5.5.1 öffnen (Parser) | [20 §1.2](20-Funktionen.md), [13](13-Interop-Roundtrip.md) | `sym:parseGedcom` | gebaut |
| BL-16 | K | feature | usp | GRAMPS XML lesen+schreiben (Passthrough; Write-Back editierter Daten fehlt → BL-80) | [20 §1.2](20-Funktionen.md) | `sym:parseXMLText` | gebaut |
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
| BL-02 | K | feature | basis | Service Worker + Manifest (Offline-Betrieb) | [20 §1.2](20-Funktionen.md), [30](30-NFR-und-Persistenz.md), [ADR-v9-93](04-Entscheidungslog.md) | `datei:app/public/sw.js` | gebaut |
| BL-03 | K | feature | basis | Offline-Indikator in der Schale | [20 §1.2](20-Funktionen.md), [ADR-v9-94](04-Entscheidungslog.md) | `datei:ui/shell/OfflineIndicator.svelte` | gebaut |

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

**Erster Vollzug (2026-07-18, BL-04):** `TasksView.svelte` stand exakt auf seinem
Altfallwert 676 — die Validierungs-UI hätte ihn gerissen, und genau das ist der Zweck.
Statt die Schwelle anzuheben (eine Ratsche, die man hochdreht, ist keine) wurde die
Datei zerlegt: das Aufgaben-Formular ist nach `TaskForm.svelte` gewandert, `TasksView`
liegt bei **598** Zeilen und läuft jetzt gegen die reguläre 600er-Schwelle. **Der
Altfall-Eintrag ist gestrichen — die Liste ist von fünf auf vier geschrumpft**, zum
ersten Mal. Damit ist auch belegt, dass die Ratsche nicht nur blockiert, sondern die
beabsichtigte Handlung tatsächlich auslöst.

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
| L7 | Zahl der [S]/[E]-Bullets in [20](20-Funktionen.md) gegen die Ratsche `SE_BULLETS` (29, Stand BL-51) | **Fehler** | Ein neues [S]/[E]-Bullet im Spec, zu dem niemand eine Backlog-Zeile angelegt hat — genau die stille Verrottung, an der die [K]-Inventur vor BL-50 scheiterte. Bewusst ein Zähler und keine Bullet↔Zeile-Zuordnung: die gibt es nirgends maschinenlesbar, sie wäre erfunden. |
| — | Status weder `offen` noch `gebaut` | **Fehler** | Rückkehr von „teilweise" (Regel 2). |

**Die Asymmetrie ist Absicht.** Status `offen` + kein Treffer ist immer in Ordnung, auch
wenn der spätere Bau ein anderes Symbol wählt als der hier vorhergesagte Beleg — dieser
Fall scheitert sicher (meldet weiter „offen", bis jemand die Zeile beim Bau anfasst).
Die gefährliche Richtung ist „steht als offen drin, ist längst da"; die fängt L1 hart ab.
Ein Backlog, das zu viel Arbeit anzeigt, kostet einen Blick; eines, das zu wenig anzeigt,
kostet einen doppelt gebauten Feature-Zweig.
