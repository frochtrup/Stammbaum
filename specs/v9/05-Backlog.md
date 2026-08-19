# 05 — Backlog

**Die Status-Wahrheit des Hauptprogramms.** Die Specs [10](10-Domaenenmodell.md)–[32](32-Testframework.md)
beschreiben ausschließlich den Soll-Zustand und treffen **keine** Aussage darüber, was
gebaut ist; das [Entscheidungslog](04-Entscheidungslog.md) hält Entscheidungen fest, nicht
Fortschritt. Wer wissen will, was offen ist, liest nur in einer Statusdatei.

**Je Programm eine Statusdatei — es gibt genau zwei.** Der Standalone-Orte-Editor
([22](22-Orte-Editor-Standalone.md)) führt seinen Stand in
[05a](05a-Backlog-Orte-Editor.md) unter dem ID-Raum `OE-n`. Die Grenze wird nicht
beurteilt, sondern gerechnet: eine Zeile gehört dorthin genau dann, wenn ihr Beleg auf
`app-orte/` oder `tests/orte/` zeigt — jeder Beleg daneben gehört hierher, auch wenn der
Punkt fachlich zum Editor gehört. **L8** prüft das bei jedem Lauf. Regeln, Klassen, Typen,
Beleg-Syntax und die Lint-Tabelle stehen nur hier und gelten für beide Dateien; das
Entscheidungslog bleibt ebenfalls ungeteilt (eine Entscheidung über geteilten Code ist
Präzedenz für beide Programme).

Stand: **[K]-Inventur vollständig** (2026-07-18) und **[S]/[E]-Inventur vollständig**
(2026-07-21, BL-51) — jeder Punkt am Code verifiziert, nicht aus der Spec geschlossen.
Alle 29 S/E-Bullets aus [20](20-Funktionen.md) tragen eine Zeile, mit **zwei bewussten
Ausnahmen**: „Geräte-Sync über OS-Sync-Ordner" ([20 §1.2](20-Funktionen.md)) verlangt
gar keine App-Arbeit — genau das ist die Entscheidung (ADR-v9-04), getragen von BL-17/18;
und „Verwandtschaft zum Probanden als Dauer-Sektion" ([20 §1.12](20-Funktionen.md)) ist
im Spec ausdrücklich „noch nicht spezifiziert" und hat damit keinen entscheidbaren
Fertig-Zustand (Regel 4). Die Specs 10–32 sind seit BL-50 frei von Status-Aussagen —
L3 ist hart (Ratsche 0).

**Nachtrag 2026-07-31 — die Inventur zählte Marker, nicht Bullets.** Sie erfasste die
`[K]`/`[S]`/`[E]`-markierten Punkte, und L7 hält seither genau deren Zahl. **[20 §2
„Bearbeitung & Formulare"](20-Funktionen.md) trägt als einziger Abschnitt gar keine
Marker** — seine 13 Punkte waren damit nie Teil der Population und wurden von keinem
Wächter erfragt. Nachgeholt: zehn davon sind gebaut, drei nicht (BL-232/233/234). Die
vier markerlosen Punkte in §1 sind Ausführungen zu bereits getrackten Zeilen, keine
eigenen Vorhaben. Damit ist §2 abgeglichen — die Zähl-Ratsche L7 deckt ihn weiterhin
nicht ab, weil sie an den Markern hängt.

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

   **Für eine `gebaut`-Zeile heißt das: Titel + ADR-Zeiger, sonst nichts** (Konsolidierung
   2026-08-04). Eine offene Zeile darf ausführlich sein — sie muss den Bau tragen, und der
   Form-Abgleich vor dem Bau gehört genau dorthin. Sobald sie gebaut ist, hat ihre
   Begründung eine bessere Adresse: das ADR, das sie ohnehin nennt. Gemessen vor der
   Kürzung: **83 % der Datei steckten in den erledigten Zeilen** (241 von 290 KB, Ø 809
   Zeichen je Zeile, längste 3.568) — und die sechs längsten verwiesen alle auf ADRs, deren
   Text zwei- bis zwölfmal länger ist als die Zeile. Es war also nicht Geschichte, die hier
   aufbewahrt wurde, sondern eine zweite, kürzere Fassung von ihr. Genau das verbietet diese
   Regel.

   **Die Ausnahme, und warum sie eng ist:** erledigte Zeilen **ohne** ADR-Anker sind die
   einzige Fassung ihrer Begründung im Spec-Set und bleiben vollständig stehen (36 Zeilen
   über dem Budget, davon 5 in [05a](05a-Backlog-Orte-Editor.md); die Zahl „zwölf" hier war
   eine Schätzung und ist mit L14 ausgezählt). Wer eine davon kürzt, verschiebt ihren Inhalt
   vorher nach [04a](04a-Chronik.md) — kürzen ohne Ziel wäre löschen.

   **Seit 2026-08-09 misst das L14** — die Regel stand bis dahin nur hier, und das hat fünf
   Tage gehalten: sechs neue erledigte Zeilen à ~800–1.400 Zeichen, dazu BL-311, das seinen
   Bau-Verlauf mitschrieb, bis es **12.879 Zeichen** maß — länger als jede Zeile vor der
   Konsolidierung. Aufgefallen beim Lesen, nicht im Prüflauf. Budget: **200 Zeichen Prosa**
   (Links zählen nicht mit); mit ADR-Zeiger hart, ohne als Ratsche. Der Bau-Verlauf von
   BL-311 liegt jetzt in [04a](04a-Chronik.md#adr-v9-234-236).
2. **Status ist binär: `offen` oder `gebaut`.** Kein „teilweise" — mehrteilige Vorhaben
   werden zerlegt. ADR-v9-78 war sechs Punkte unter einem Sammel-Status, von denen vier
   fertig waren, während die Überschrift weiter „Punkte 3/5/6 weiterhin offen" behauptete.
3. **Jede Zeile trägt einen Beleg** — ein **exportiertes Symbol** oder ein **Dateipfad**,
   nie ein Prosa-Wort. Prosa trifft Kommentare: „Ortszeitgenossen" steht auch in einem
   Ankündigungs-Kommentar in `ViewModeToggle.svelte`. Ein Beleg, der auf Kommentare
   anspringt, meldet Fertigstellung zu früh.
4. **IDs werden nie wiederverwendet.** Erledigte Zeilen bleiben stehen (`gebaut`) — sie
   sind der Drift-Schutz in die zweite Richtung: verschwindet das Symbol durch
   Umbenennung, schlägt der Lint an. **Was bleiben muss, ist die Zeile, nicht ihre Prosa**
   (Regel 1): den Drift-Schutz tragen ID, Beleg und Status, keines davon wird gekürzt.

   Eine **irrtümlich angelegte** Zeile darf dagegen entfernt werden — sie ist nicht
   „erledigt", und eine Zeile, die dauerhaft auf `offen` steht, ohne je einen Fertig-
   Zustand zu haben, ist genau die Risikoliste, die es hier bewusst nicht gibt. **Ihre ID
   bleibt trotzdem verbraucht.** Bisher zurückgezogen: **BL-79** (angelegt und am
   selben Tag entfernt, 2026-07-18, Commit `1de1bc9`) · **BL-248** (2026-08-01: „der geladene
   Bestand ist ohne Navigation ablesbar" — vom Nutzer am selben Tag verworfen, weil der
   Dateidialog die Frage bereits beantwortet und ein Dauer-Element mobil eine eigene Zeile
   kostete. Der Anlass war eine Beobachtung aus der ENTWICKLER-Verifikation, nicht aus der
   Nutzung: wer Datensätze tauscht, braucht die Anzeige — wer mit einem arbeitet, nicht) · **BL-279** (2026-08-01: „GOV-Import/Merge hängen nicht mehr am Editier-Schalter" — von
   [ADR-v9-193](04-Entscheidungslog.md#adr-v9-193) am selben Tag überholt. Die Zeile war aus der
   Design-Kritik als Sichtbarkeits-Defekt formuliert; der ADR hat entschieden, dass das Gate
   genau richtig ist — [ADR-v9-30](04-Entscheidungslog.md#adr-v9-30) verlangt „kein ungegatetes
   Mutations-Control", und beide Sektionen sind Mutations-Controls wie die Namensvarianten
   daneben. Der verbleibende Rest — der Knopf soll benennen, was er öffnet — liegt bei BL-274;
   dort ist zugleich vermerkt, dass „✎ Grunddaten" für Ort/Hof die FALSCHE Verengung wäre) ·
   **BL-313** (2026-08-13: „`type` allein macht einen Ort zur Autorität über seinen Dateitext" —
   von der Messung aufgelöst, [ADR-v9-270](04-Entscheidungslog.md#adr-v9-270). Die Zeile war am
   falschen Merkmal und an der falschen Einheit formuliert: `type` trägt die Autorität in NULL
   Ereignissen, und entschieden wird ohnehin über die ganze Kette, nicht über das gebundene
   Objekt. Was sie befürchtete, tragen seither zwei facettenblinde Mechanismen — die
   Verarmungs-Sperre und die Qualitätsregel `PLAC_EBENE_UNBEKANNT`) ·
   **BL-233** (2026-08-13: „Schnellerfassungs-Modus" — der Bedarf ist von der Serienerfassung
   der Vorlagen gedeckt, die FORM von [ADR-v9-265](04-Entscheidungslog.md#adr-v9-265)/[268](04-Entscheidungslog.md#adr-v9-268)
   überholt: die Erfassung ist ein Entwurf mit Speichern-Knopf, BL-233s Weg über die
   Sofort-Anlage hätte die „unsichtbaren Leichen" erzeugt, vor denen die Zeile selbst warnte.
   Der verbliebene Rest — Quelle und Seite laufen mit — ist als BL-360 allgemeiner gebaut,
   [ADR-v9-271](04-Entscheidungslog.md#adr-v9-271)).
   Wer die nächste ID vergibt, nimmt
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

## Priorisierung & Clusterung der offenen Items (Stand 2026-07-31)

Eine **Priorisierung + Leseordnung** über die offenen Punkte — **keine zweite Status-Wahrheit**
(der Status je Zeile bleibt die Statusspalte unten). **Hier steht ausschließlich Offenes:** wird
eine Zeile `gebaut`, verschwindet sie aus diesem Abschnitt, statt durchgestrichen zu werden —
ihre Geschichte tragen „Erledigte Punkte" und das [Entscheidungslog](04-Entscheidungslog.md).
Ein **Cluster** bündelt Items, die dieselben Dateien/dasselbe Subsystem berühren (ein
fokussierter Bau) oder voneinander abhängen (Primitive vor Konsument); er sagt nichts über die
Reihenfolge **zwischen** Clustern — die steht in den Wellen darunter. Die Klasse wird **nicht
je Item** wiederholt (Regel 1: Zeiger, kein Inhalt) — sie steht in der Spalte `Klasse`; die
Wellen ordnen danach und benennen sie einmal je Welle.

Die Cluster-Buchstaben sind stabile Bezeichner; ADRs verweisen auf sie. **Ⓐ, Ⓑ und Ⓒ sind
vollständig gebaut** (Kleinlücken-Wellen 2026-07-29/30) und stehen deshalb nicht mehr in der
Tabelle. **Ⓕ Forschung ebenso** (2026-07-31): die Kette aus
[ADR-v9-165](04-Entscheidungslog.md#adr-v9-165) — Evidenz-Eingabe, `_EVAL`-Wire-Format,
Forschungsschritt-Vorschlag, Widerspruchsregel — steht vollständig, dazu der Ast-Reifegrad aus
[ADR-v9-167](04-Entscheidungslog.md#adr-v9-167). **Ⓘ ist bis auf das vertagte BL-227 gebaut**;
der zugehörige Editor-Strang steht vollständig in [05a](05a-Backlog-Orte-Editor.md) und ist
dort abgeschlossen. **Ⓚ (App-privater Zustand) ist abgearbeitet** — BL-180 (Bündel),
BL-238 (Prüfung am Referenten) und BL-239 (Mitnahme der Projekte) sind gebaut; der Cluster
führt deshalb keine Zeile mehr, was noch offen ist, hängt sich über BL-230 aus dem eigenen
Cluster ein — der zweite solche Anschluss, die Erfassungs-Vorlagen, ist mit BL-232 gebaut
und hat den Sammlungs-Merge des Bündels dabei vom Sonderweg zur Abschnitts-Eigenschaft
verallgemeinert ([ADR-v9-264](04-Entscheidungslog.md#adr-v9-264)). **Ⓛ (Medien-Auflösung & Anzeige) ist vollständig gebaut**
(BL-256…BL-261 plus die beiden Nachträge BL-262/BL-263) und steht deshalb nicht mehr in
der Tabelle.

| Cluster | Offene Items (interne Reihenfolge) | Fläche / Dateien |
|---|---|---|
| Ⓔ Orte, Karte & Geo | BL-230 (Ebenen-Wahl hängt sich in das gebaute B1-Bündel ein) | Karten-Insel, `MapLensView` |
| Ⓖ Navigation & Shell | BL-359 (gemessener Überlauf, unabhängig) · BL-369 (gemessene Trefferzone, unabhängig) · BL-94 (Inhalt zuerst spezifizieren) | Shell / Navigation, `ui/shell/UndoControls.svelte`, `swipe-nav.ts`, Modal-Schalen, `ui/islands/tree/hourglass-tree.css` |
| Ⓗ Import / Export / Dedup | BL-330 (GRAMPS-Owner-Refs) · BL-207 · BL-166 (vertagt) | Write-Back, Import-Vergleich, Dedup, Export-Pipe |
| Ⓘ Orte-Editor (Standalone) | BL-227 (vertagt) | CI-Workflow |
| Ⓞ Zeitachse der Orte | BL-326 (die Wahlregel, unabhängig und noch unentschieden) | `core/places/types.ts`, `core/places/place-registry.ts`, `core/places/gov.ts`, `services/places/types.ts`, `ui/views/place/PlaceEnclosureEditModal.svelte`, `ui/views/place/PlaceNamesSection.svelte`, `ui/views/hof/HofDetail.svelte` |
| Ⓜ Skalierung & Reaktionszeit | BL-312 (erst das Budget, dann die Optimierung) | `tests/perf/`, `ui/shell/pagination.ts`, `ui/shell/app-state.svelte.ts`, die sechs `*List.svelte` |

**Empfohlene Reihenfolge (Wellen — Priorität, nicht Zwang).** Die Wellen der Kleinlücken-
Inventur sind abgeschlossen; diese Zählung setzt neu an und enthält nur noch Offenes.
**Welle 1 (der Wire-Wert-Komplex: BL-290 · BL-292 · BL-289) ist am 2026-08-02 gebaut**
([ADR-v9-207](04-Entscheidungslog.md#adr-v9-207)) und steht deshalb nicht mehr hier — die
Nummern der folgenden Wellen behalten ihre Bezeichnung, damit Verweise nicht ins Leere gehen.
**Ebenfalls am 2026-08-02 gebaut — und damit ist die Naht „der Writer schreibt beim Neubau
um, was er nicht umschreiben sollte" geschlossen:** der Verlust (BL-302), die stille
Wert-Umdeutung (BL-303), die erfundenen Namens-Untertags (BL-304), der Zeilenumbruch
(BL-305), die globalen Felder geteilter inline-Medien (BL-306) und die Doppelung `_DONE`/`_TSTAT`
(BL-307) ([ADR-v9-208](04-Entscheidungslog.md#adr-v9-208)…[ADR-v9-213](04-Entscheidungslog.md#adr-v9-213)).
Was der Neubau aller Records an `Unsere Familie 2026.ged` jetzt noch ADDIERT, sind die
5 `_TSTAT`, die BL-302 bewusst schreibt — ein eigener Tag der App ist keine Treuefrage.
Welle 1a ist deshalb entfallen; die folgenden Wellen behalten ihre Bezeichnung.
**Am 2026-08-08 gebaut:** der navigationsfeste Ansichtszustand des Qualitäts-Dashboards
und, im selben Zug auf Nutzer-Auftrag, der globalen Suche (BL-319,
[ADR-v9-229](04-Entscheidungslog.md#adr-v9-229)) — die Zeile steht deshalb nicht mehr in
Welle 5. Ihren Platz nimmt die dabei **ausgezählte** Geschwister-Population derselben
Klasse ein (Listen-Suche/-Filter, die drei anderen Forschungs-Segmente): dasselbe Muster,
sieben weitere Flächen — **am selben Tag gebaut** ([ADR-v9-230](04-Entscheidungslog.md#adr-v9-230)). **Welle 5 ist damit vollständig abgetragen:** BL-318 schloss am selben Tag (die Instabilität lag in der Test-Automatik, [ADR-v9-232](04-Entscheidungslog.md#adr-v9-232)) und BL-315 als „nicht reproduzierbar" ([ADR-v9-233](04-Entscheidungslog.md#adr-v9-233), Nutzer-Beleg: mehrfacher Safari-Import über mehrere Sitzungen). Die Zählung der folgenden Wellen bleibt unverändert, damit Verweise nicht ins Leere gehen.

2. **Welle 4 — die Befunde der Stand-Bewertung (2026-08-04):** BL-312.
   Die `basis`-Zeile dieser Welle ist am selben Tag gebaut und steht deshalb nicht mehr
   hier; eine zweite ist am 2026-08-13 zurückgezogen worden, weil die Messung ihre Prämisse
   auflöste ([ADR-v9-270](04-Entscheidungslog.md#adr-v9-270), s. Regel 1).
   Die verbliebene ist bewusst als **Messung vor Optimierung** geschnitten
   (Vorbild: das Perf-Gate, das zuerst verdrahtet und erst danach scharf gestellt wurde —
   die Zeilen nennen es je in ihrem Fertig-Zustand): sie kosten je einen Testlauf, nicht
   einen Umbau, und beantworten erst danach die Frage, ob überhaupt etwas zu bauen ist.
   **Herkunft:** eigene Verifikation am laufenden Programm mit `Unsere Familie 2026.ged`,
   nicht aus dem Spec geschlossen; keiner der Punkte wurde von einem Gate gefangen, weil
   kein Gate an dieser Stelle misst.
3. **Welle 2 — eigenständige Kür:** BL-230 (die Ebenen-Wahl hängt sich in das gebaute
   B1-Bündel ein) · BL-207 · BL-359 (gemessener Kopfleisten-Überlauf bei 375 px,
   Nebenbefund aus [ADR-v9-269](04-Entscheidungslog.md#adr-v9-269) — vorbestehend, hängt an
   nichts und blockiert nichts) · BL-369 (Trefferzone der Baum-Insel-Überlagerung, 28 statt
   44 px, Nebenbefund aus [ADR-v9-275](04-Entscheidungslog.md#adr-v9-275) — gleiche Art wie
   BL-359: vorbestehend, gemessen, blockiert nichts; beide sind Fälle, in denen ein Wächter
   die Stelle nicht sieht, statt sie falsch zu bewerten). **Drei Zeilen dieser Welle sind am 2026-08-03 gebaut**
   ([ADR-v9-217](04-Entscheidungslog.md#adr-v9-217)…[ADR-v9-219](04-Entscheidungslog.md#adr-v9-219): Löschen abgesetzt,
   Tastatur in den Formularen, Rücknahme der Sofort-Anlage) und stehen deshalb nicht mehr hier.
4. **Welle 6 — die Zeitachse der Orte (2026-08-09, [ADR-v9-243](04-Entscheidungslog.md#adr-v9-243)):**
   BL-326. Vier Schritte dieser Welle — der fehlende Überlappungs-Hinweis, die
   Tagesgenauigkeit selbst, die dritte, dabei übersehene Eingabefläche und die Ableitung
   des Grenzjahrs beim Laden ([ADR-v9-248](04-Entscheidungslog.md#adr-v9-248)) — sind
   gebaut und stehen deshalb nicht mehr hier. **BL-326 bewusst zuletzt und unabhängig:** seine Entscheidung
   steht als einzige noch aus, und sie berührt über die Projektion den geschriebenen
   `PLAC` — das ist keine Anzeige-Frage. Was die Achse selbst betrifft, ist seit
   [ADR-v9-245](04-Entscheidungslog.md#adr-v9-245) geklärt: Namen sind genauso
   stichtagsfähig wie Zugehörigkeiten, offen ist nur die Wahl unter gleichzeitig gültigen
   Namen. **Herkunft:** Nutzer-Vorgabe „tagegenau abbildbar" und Nutzer-Einwand gegen
   ADR-v9-243 E5, gemessen am maßgeblichen Bestand (`Testdateien/orte-2.json` rev 277 +
   `Testdateien/Unsere Familie 2026.ged`) über den echten Ladepfad, nicht aus dem Spec
   geschlossen.
5. **Welle 3 — Infra & Hygiene (opportunistisch):**
   BL-330 (stiller Verlust, aber nur auf dem GRAMPS-Weg und nur an zwei Zitat-Listen, die
   dieser Ladepfad ohnehin nicht füllt — am billigsten dann, wenn die GRAMPS-Person-
   Reconciliation ohnehin angefasst wird, [ADR-v9-244](04-Entscheidungslog.md#adr-v9-244)). Die zweite Zeile dieser Welle ist am 2026-08-13 gebaut ([ADR-v9-272](04-Entscheidungslog.md#adr-v9-272)) und steht deshalb nicht mehr hier.

**Bewusst vertagt — nicht einplanen, bis sich der Anlass ändert:** BL-166 (Orte/Höfe-Dedup,
Weg 3 vom 2026-07-26 — geringer Wert gegen hohe Hürde) · BL-227 (Staging-Ziel; lohnt erst,
wenn der Editor auf einem echten Gerät zu prüfen ist) · BL-94 (dritter Kontext-Pane;
zurückgestellt 2026-08-02 — der Anlass ist nicht die Bauzeit, sondern der fehlende INHALT:
[21 §3](21-UI-UX.md) nennt „Quellen zum Ereignis" als Beispiel, nicht als Anforderung. Solange
niemand sagen kann, was der Pane zeigt, ist er eine Fläche auf der Suche nach einem Zweck).

**Herkunft BL-195…213:** Kleinlücken-Inventur v8↔v9 (2026-07-29) — zwei Muster: (a) Modell-Feld
vorhanden, in der UI nicht gezeigt (`nick`/`datePhrase`/`pedigree`/`dataEvents`/`externalRefs`/
`callMedia`); (b) Listen-Zähler/Badges, die v8 proaktiv zeigte. Bereits getrackte Überschneidungen
wurden NICHT dupliziert: Soundex (BL-10), History-Nav (BL-07), CSV (BL-125), Assoziationen
(BL-127), GOV (BL-131). **Offen aus dieser Inventur ist noch BL-207** sowie BL-217
als Abspaltung aus BL-201 — für sie gilt weiter der in `CLAUDE.md` vorgeschriebene Abgleich VOR
dem Bau: die vom Orakel übernommene **Form** gegen [03-Altlasten](03-Altlasten.md), die
einschlägigen `INV-…` **und das Datenmodell** halten. Drei Befunde dieses Abgleichs, die seinen
Umfang begründen: BL-206 hätte eine abgeschaffte Glyphenreihe zurückgeholt (Altlast §10,
[ADR-v9-148](04-Entscheidungslog.md#adr-v9-148)); BL-213 hätte eine zweite Ziel-Liste neben dem
Nav-Register mitgebracht, deren Hälfte auf abgeschaffte Bedienelemente zeigte
([ADR-v9-190](04-Entscheidungslog.md#adr-v9-190)); BL-212 verfehlte zusätzlich das **Modell**
(`RELI` war damals Skalarfeld, kein Ereignistyp — ein Chip hätte beim Export eine zweite
`1 RELI`-Zeile erzeugt, [ADR-v9-156](04-Entscheidungslog.md#adr-v9-156); **seit
[ADR-v9-207](04-Entscheidungslog.md#adr-v9-207)/BL-289 IST `RELI` ein Ereignis** — der Befund
bleibt richtig, sein Grund ist die Modell-FORM gewesen, und die wurde geändert statt umgangen); und `dataEvents` war zwar deklariert,
aber von **keinem Parser gefüllt** ([ADR-v9-151](04-Entscheidungslog.md#adr-v9-151)) — Muster (a)
trägt damit einen dritten Fall: vor dem Bau einer Anzeige prüfen, ob das Feld überhaupt je einen
Wert bekommt, nicht nur, ob es deklariert ist.

**Herkunft BL-270…279:** Design-Kritik der Bearbeitungsfunktion über alle sieben Detail-Seiten
(2026-08-01), rein statisch am Code erhoben — kein Preview-Server, die Größenangaben in BL-272
sind aus dem CSS gerechnet und nicht im Browser gemessen (als solche gekennzeichnet, nicht als
Messung ausgegeben). Anders als die Kleinlücken-Inventur ist **nichts davon v8-Orakel-abgeleitet**:
der Abgleich lief gegen das v9-Spec-Set selbst, und alle zehn Zeilen sind Abweichungen v9↔v9 —
eine benannte Primitive, die ihre eigene Fläche nicht erreicht (`.stb-btn`, BL-273), eine Option,
die gebaut, aber nie verdrahtet wurde (`swipeNav.enabled`, BL-271), eine Invariante, die ihre
eigene Aufzählung nicht einhielt (INV-UI-13 nennt Modal-Backdrops, BL-278). Der in `CLAUDE.md`
vorgeschriebene Form-Abgleich gegen [03-Altlasten](03-Altlasten.md) entfällt deshalb hier;
an seine Stelle tritt die Gegenrichtung — **vor dem Bau prüfen, ob die Spec-Stelle, gegen die
der Befund erhoben wurde, selbst noch gilt**. Zwei Zeilen sind bewusst KEINE Backlog-Zeile
geworden: „vier Bearbeiten-Paradigmen" ist kein Fertig-Zustand, sondern die Beobachtung hinter
BL-274; und die Richtungsfrage in BL-270 (Sofort-Commit vs. verzögert) ist eine Entscheidung
und gehört ins [Entscheidungslog](04-Entscheidungslog.md), nicht in die Statusspalte — sie ist
dort am 2026-08-01 als [ADR-v9-193](04-Entscheidungslog.md#adr-v9-193) gefallen und hat die
gestellte Alternative aufgelöst: der Commit-Zeitpunkt gehört zum Abschnitt, nicht zur Seite,
und der Defekt ist die fehlende sichtbare Transaktionsgrenze. BL-270 trägt seither den daraus
folgenden Fertig-Zustand und ist am selben Tag gebaut. Derselbe ADR hat **BL-279 erledigt,
indem er ihm die Grundlage entzog** — die Zeile wollte die Kurationswerkzeuge aus dem
Editier-Modus lösen, der ADR hat das Gate bestätigt; sie steht deshalb in der
Rückzugsliste (Regel 4), nicht auf `gebaut`. **BL-280 ist die Fortsetzung derselben Kritik:** die Umstellung auf `.stb-btn` (BL-273) hat die beschrifteten Knöpfe erledigt und dabei sichtbar gemacht, dass die ikonischen Inline-Controls eine ANDERE Antwort brauchen — der Wächter aus BL-273 nennt diese Grenze ausdrücklich, statt so zu tun, als sei sie mit erledigt.

## Offene Punkte

| ID | P | Typ | Klasse | Punkt | Spec | Beleg | Status |
|---|---|---|---|---|---|---|---|
| BL-369 | — | defekt | kür | **Die Bedienelemente der Baum-Insel sind 28 px hoch, nicht 44** — gemessen 2026-08-18 im Browser bei 375 px an der Überlagerung `.tree-island__overlay` ([ADR-v9-275](04-Entscheidungslog.md#adr-v9-275)): `.tree-island__fs-btn`, `.tree-island__home-btn` und `.tree-island__gen-sel` teilen sich EINEN Regelblock mit `padding: 0.3rem 0.6rem; font-size: 0.78rem` und setzen **keine** `min-height` — die Höhe fällt aus der Polsterung ab, gegen `--stb-touch-target: 44px`. **Warum kein Wächter anschlägt:** `findUndersizedControls` in `tests/ui/touch-target.test.ts` meldet nur Regeln, die `min-width`/`min-height` **ausdrücklich** unter der Schwelle festschreiben; eine Höhe, die sich bloß aus `padding` ergibt, ist für ihn unsichtbar. Das ist dieselbe Lücke, die [BL-282](#erledigte-punkte) schon einmal für `.event-line__edit-btn` von Hand geschlossen hat — dort war die Diagnose „`line-height: 1` fiel aus der Zählung", hier ist es die fehlende Angabe überhaupt. **Vorbestand, nicht neu:** `.tree-island__fs-btn` ist seit BL-95 so; die beiden Geschwister aus BL-367/368 wurden bewusst daran angeglichen, statt den Vollbild-Schalter im selben Zug umzugestalten — die Angleichung hat den Vorbestand aber von einem auf drei Elemente verbreitert und ihn dadurch erst sichtbar gemacht. **Fertig-Zustand:** die geteilte Trefferzone nach dem [BL-299](#erledigte-punkte)-Muster (Zone hält die Schwelle, die sichtbare Größe darf kleiner bleiben — über dem Diagramm schwebende Knöpfe sollen zurückhaltend aussehen, das ist der Grund für die 28 px und bleibt gültig); dazu die Prüfung, ob der Wächter um den Fall „Höhe entsteht nur aus Polsterung" erweiterbar ist, ohne falsch-positiv zu werden. Gegenzumessen ist danach beides, was die Enge überhaupt erzwungen hat: dass die Überlagerung bei 375 px in EINE Zeile passt (heute 164 px bei 351 px Platz) und dass sie keine anklickbare Karte der obersten Reihe verdeckt (`document.elementFromPoint`, Messweg aus BL-95) | [21 §6i](21-UI-UX.md), [21 §8](21-UI-UX.md), [ADR-v9-275](04-Entscheidungslog.md#adr-v9-275), [ADR-v9-155](04-Entscheidungslog.md#adr-v9-155) | `test:tests/ui/insel-trefferzone.test.ts` | offen |
| BL-359 | — | defekt | kür | **Die Kopfleiste läuft bei 375 px über, wenn „Wiederholen“ und „Zum geladenen Stand“ zusammen stehen** — gemessen `scrollWidth` 393 gegen 375; die Knopfzeile braucht 264 px in einer 230-px-Fläche (118 + 140 + `gap`). Der Kommentar in `UndoControls` begründet das Budget damit, dass „Zum geladenen Stand“ **komplementär zu „Rückgängig“** erscheint — das stimmt, aber zu „Wiederholen“ ist es nicht komplementär, und genau diese Kombination tritt nach jedem Rückgängig-Klick auf. Vorbestehend, am gestashten Stand identisch reproduziert (Nebenbefund aus [ADR-v9-269](04-Entscheidungslog.md#adr-v9-269)). **Fertig-Zustand:** bei 375 px kein horizontaler Überlauf in irgendeiner Kombination der drei Knöpfe; ein Wächter misst es, statt es zu begründen | [21 §6i](21-UI-UX.md), [ADR-v9-155](04-Entscheidungslog.md#adr-v9-155), [ADR-v9-269](04-Entscheidungslog.md#adr-v9-269) | `test:tests/ui/undo-controls-breite.test.ts` | offen |
| BL-330 | — | defekt | kür | **Auf dem GRAMPS-Weg haben `extraNames`- und `associations`-Zitate keinen Owner-Ref** — `buildCitationMap` kennt beide Listen, `assignNewIds` und die `<person>`-Reconciliation nicht ([ADR-v9-244](04-Entscheidungslog.md#adr-v9-244) Verworfen d). Ein dort erfasstes Zitat wird als Record angelegt, findet keinen Verweis und fällt beim Verwaisten-Pass still weg; dieselbe Klasse, die BL-329 für die Kindschaft geschlossen hat. Ebenfalls offen und derselbe Knoten: `Person.parentIn` bleibt auf dem GRAMPS-Ladepfad leer (gemessen an `tests/fixtures/Unsere Familie.gramps`: 910 Familien, 0 `parentIn`) — der Personen-Steckbrief zeigt dort keine eigene Familie. **Fertig-Zustand:** ein Test, der beide Zitat-Arten und `parentIn` über Speichern und Neuladen führt | [13 §6](13-Interop-Roundtrip.md), [10 §2](10-Domaenenmodell.md) | `test:tests/roundtrip/gramps-owner-refs.test.ts` | offen |
| BL-326 | — | feature | kür | **Welcher von mehreren gleichzeitig gültigen Ortsnamen gehört in `PLAC`?** — die Namensachse ist nicht exklusiv ([ADR-v9-245](04-Entscheidungslog.md#adr-v9-245)); an `Testdateien/orte-2.json` (rev 277) stehen 74 echte Überlappungen in drei Formen: identische Perioden (21, „Hochstift Osnabrück" × „Fürstbistum Osnabrück"), Enthaltensein (31, „Sprockhövel [1300…]" ⊇ „Stadt Sprockhövel [1970…]") und unscharfe Schreibvarianten (22, „Bochem"/„Buchem"/„Bokheim"). Über den echten Ladepfad gemessen (`Testdateien/Unsere Familie 2026.ged` + o. g. Bestand) betrifft das **90 der 4391 datierten, ortsgebundenen Ereignisse**; heute wählt `resolveAsOf` stumm nach „höchstes `from`" und schreibt damit z. B. für ein Ereignis 1980 in Guben „Gubin" in die Datei. **Offen ist die Wahlregel** (Vorschlag: der unqualifizierte Grundname statt des jüngsten Eintrags) **und ob die Wahl gemeldet wird** — ein ⚠ wie auf der Hierarchie-Achse ist ausgeschlossen (ADR-v9-245 Entscheidung 3), 74 legitime Einträge wären Falschalarm. Umhängen nach `translations` ist verworfen (trägt für 9 von 74, entfernt den Namen aus der Match-Namensmenge §4.2). **Fertig-Zustand:** eine Entscheidung per ADR und ein Test, der die Wahl an einem Fall je Form festhält | [11 §1](11-Orte-Hoefe-Identitaet.md), [11 §4.2](11-Orte-Hoefe-Identitaet.md), [11 §5](11-Orte-Hoefe-Identitaet.md), [ADR-v9-245](04-Entscheidungslog.md#adr-v9-245) | `test:tests/core/pname-parallelitaet.test.ts` | offen |
| BL-312 | — | hygiene | kür | **Das Perf-Gate misst den Bearbeitungs-Pfad nicht** ([30 §1](30-NFR-und-Persistenz.md) NFR-1, [14 §3.1](14-Dateihandling.md)). Die Budget-Tabelle kennt Parse, Orts-Auflösung und ersten Sort — also das LADEN. Jedes mutierende Kommando löst daneben ein stilles Auto-Save aus, und das serialisiert das GANZE Dokument synchron auf dem Hauptthread (`persistWorkingCopyIfLoaded` → `serializeInternal`, `ui/shell/app-state.svelte.ts`; die IndexedDB-Schreibung danach ist fire-and-forget, die Serialisierung nicht). Gemessen am 2026-08-04: **27–33 ms** bei `Unsere Familie 2026.ged` (3180 Personen, 2,2 MiB) und **72–80 ms** bei der 20k-Skalen-Fixture (8,5 MiB); die Fixture ist pro Person leichter als der Realbestand, ein realdichtes 20k-Dokument liegt also darüber. Auf dem primären Zielgerät (iPad, [30 §1](30-NFR-und-Persistenz.md) NFR-2) ist das ein Vielfaches davon — je Bearbeitung. **Kein Defekt-Nachweis, und deshalb hygiene:** es gibt heute kein Budget, gegen das die Zahl verstoßen könnte — genau das ist die Lücke. **Fertig-Zustand:** eine Zeile „Auto-Save nach einer Bearbeitung" in der NFR-1-Budget-Tabelle plus ein Messpunkt in der Skalen-Ebene, der sie hält (Vorbild [BL-48](#erledigte-punkte): das Gate zuerst, die Optimierung erst, wenn es rot wird). Erst wenn es rot wird, stellt sich die Folgefrage — Worker, Debounce oder inkrementelle Serialisierung — und die gehört dann in eine eigene Zeile | [30 §1](30-NFR-und-Persistenz.md), [14 §3.1](14-Dateihandling.md), [32 §2](32-Testframework.md) | `test:tests/perf/autosave.perf.test.ts` | offen |
| BL-230 | S | feature | usp | **Historische Kartenebene** ([ADR-v9-166](04-Entscheidungslog.md#adr-v9-166)): Ebenen-Umschalter in der Karte-Lens (OSM · OpenHistoricalMap · nutzereigene XYZ-/TMS-Adresse), opt-in; kein kommerzieller Anbieter verdrahtet. Wahl + Adresse als B1-Zustand — ein `mapLayer`-Abschnitt im **gebauten** `app-data.json`-Bündel ([BL-180](#erledigte-punkte)), kein eigener Speicher; Offline-Vektor-Pfad und Mini-Karte bleiben unberührt; Attribution je Ebene sichtbar, Klick-Guard aus ADR-v9-150 gilt weiter | [20 §1.9](20-Funktionen.md), [30 §2.2](30-NFR-und-Persistenz.md), [01 §3](01-Vision-und-Prinzipien.md) | `sym:TILE_LAYERS` | offen |
| BL-227 | E | hygiene | kür | Staging-Ziel: `v9-dev` veröffentlicht den Bau beider Programme zusätzlich auf eine eigene Pages-Adresse (eigenes Repo + Deploy-Key), damit der Editor auf einem echten Gerät mit HTTPS geprüft werden kann, bevor etwas nach `main` geht | [22 §7](22-Orte-Editor-Standalone.md), [31 §4](31-Dev-Umgebung.md) | `txt:staging@.github/workflows/ci.yml` | offen |
| BL-166 | S | feature | kür | Dedup verlustfrei auf Passthrough-Ebene, **Phase 3: Orte/Höfe-Dedup** (ADR-v9-129, Fortsetzung BL-164/165) — **bewusst vertagt** (Weg 3, 2026-07-26): geringer Wert (un-modellierter `<placeobj>`-Passthrough real kaum vorhanden; GEDCOM hat keine Ort-Records) vs. Hürde (Orte persistieren in `orte.json` + Sync-Byte-Vergleich -> `mergedRecordIds` am Modell leckt/verfälscht Sync). Für den Bau: Carry als separate transiente `db`-Struktur (`db.placeMergeCarry`), NICHT am PlaceObject -> dann orte.json/Sync automatisch clean (04a-Chronik). `mergePlaceObjects`/`mergeHofObjects` setzen sie; GRAMPS-`<placeobj>`-Write-Back übernimmt den Verlierer-Passthrough. Gate: GRAMPS-Ort-Merge+Save `xml1===xml2`, Verlierer-placeobj-Passthrough am Gewinner | [13 §2.4](13-Interop-Roundtrip.md), [11 §9.2](11-Orte-Hoefe-Identitaet.md), [ADR-v9-129](04-Entscheidungslog.md#adr-v9-129) | `test:tests/roundtrip/merge-passthrough-places.test.ts` | offen |
| BL-94 | S | feature | kür | Dritter Kontext-Pane auf Desktop — **zurückgestellt 2026-08-02** (Nutzer-Entscheidung): nicht wegen des Aufwands, sondern weil der INHALT fehlt. [21 §3](21-UI-UX.md) nennt „Quellen zum Ereignis" als **Beispiel**, nicht als Anforderung; eine dritte Spalte ohne benannten Zweck ist eine Fläche auf der Suche nach einer Aufgabe. Fertig-Zustand unverändert: erst spezifizieren, was der Pane zeigt, dann bauen — bis dahin steht die Zeile unter „Bewusst vertagt" und wird in keine Welle eingeplant | [21 §3](21-UI-UX.md) | `sym:ContextPane` | offen |
| BL-207 | S | feature | kür | Import-Vergleich: Sektions-Massen-Aktionen („alle übernehmen"/„alle Forschungseintrag") + Score-Begründungs-Tooltip (`reasons`) in der Trefferliste. v8-Orakel `ui-import-compare.js:388/297` | [20 §1.2](20-Funktionen.md) | `sym:bulkApplySection` | offen |

## Erledigte Punkte

Bleiben stehen — jede Zeile hier ist ein aktiver Wächter (Regel 6, Lint-Regel L2), kein
Archiv: ihr Beleg muss weiterhin treffen, sonst ist das Feature umbenannt oder verschwunden.

| ID | P | Typ | Klasse | Punkt | Spec | Beleg | Status |
|---|---|---|---|---|---|---|---|
| BL-371 | — | feature | kür | **Der Fächer reicht bis acht Ahnen-Ringe** (vorher 6) → [ADR-v9-276](04-Entscheidungslog.md#adr-v9-276) | [20 §1.3](20-Funktionen.md), [21 §8](21-UI-UX.md), [ADR-v9-275](04-Entscheidungslog.md#adr-v9-275), [ADR-v9-276](04-Entscheidungslog.md#adr-v9-276) | `txt:jede wählbare Stufe bis 8 hat einen Radius@tests/islands/fan-layout.test.ts` | gebaut |
| BL-370 | — | feature | kür | **Jedes Fächer-Segment nennt im Tooltip Namen und Geburtsjahr** — die gezeichnete Beschriftung verkürzt sich nach außen und endet ab Ring 6 ganz → [ADR-v9-276](04-Entscheidungslog.md#adr-v9-276) | [20 §1.3](20-Funktionen.md), [11 §5](11-Orte-Hoefe-Identitaet.md), [ADR-v9-86](04-Entscheidungslog.md#adr-v9-86), [ADR-v9-276](04-Entscheidungslog.md#adr-v9-276) | `test:tests/ui/fan-tooltip.test.ts` | gebaut |
| BL-368 | — | feature | kür | **Die Generationenzahl ist je Baum-Modus wählbar** → [ADR-v9-275](04-Entscheidungslog.md#adr-v9-275) | [20 §1.3](20-Funktionen.md), [21 §5](21-UI-UX.md), [21 §8](21-UI-UX.md), [ADR-v9-275](04-Entscheidungslog.md#adr-v9-275) | `sym:createTreeViewState` | gebaut |
| BL-367 | — | feature | kür | **„★ Zentrieren" führt in jedem Baum-Modus auf den Probanden zurück** → [ADR-v9-275](04-Entscheidungslog.md#adr-v9-275) | [20 §1.3](20-Funktionen.md), [21 §8](21-UI-UX.md), [ADR-v9-140](04-Entscheidungslog.md#adr-v9-140), [ADR-v9-275](04-Entscheidungslog.md#adr-v9-275) | `sym:homeTargetFor` | gebaut |
| BL-366 | — | defekt | basis | **Die Fächer-Segmente waren im Browser nicht klickbar** → [ADR-v9-275](04-Entscheidungslog.md#adr-v9-275) | [20 §1.3](20-Funktionen.md), [21 §8](21-UI-UX.md), [ADR-v9-275](04-Entscheidungslog.md#adr-v9-275) | `txt:was eine Person benennt, holt sich das Klicken zurück@tests/ui/tree-island-pointer-events.test.ts` | gebaut |
| BL-365 | — | feature | kür | **Verwandtschaft zum Probanden im Kopf des Personen-Steckbriefs** → [ADR-v9-274](04-Entscheidungslog.md#adr-v9-274) | [20 §1.4](20-Funktionen.md), [20 §1.12](20-Funktionen.md), [ADR-v9-274](04-Entscheidungslog.md#adr-v9-274) | `sym:relationToProbandLabel` | gebaut |
| BL-364 | — | feature | kür | **Kinder stehen chronologisch — im Personen- wie im Familien-Detail** → [ADR-v9-274](04-Entscheidungslog.md#adr-v9-274) | [20 §1.4](20-Funktionen.md), [20 §1.5](20-Funktionen.md), [ADR-v9-274](04-Entscheidungslog.md#adr-v9-274) | `sym:sortPersonIdsByBirth` | gebaut |
| BL-363 | — | feature | kür | **Die Familienzeile des Steckbriefs nennt das Hochzeitsdatum** → [ADR-v9-274](04-Entscheidungslog.md#adr-v9-274) | [20 §1.4](20-Funktionen.md), [ADR-v9-274](04-Entscheidungslog.md#adr-v9-274) | `txt:Hochzeitsdatum@ui/views/person/PersonFamilies.svelte` | gebaut |
| BL-362 | — | defekt | basis | **Die Kekule-Nummern folgten der Fokusperson statt dem Probanden** → [ADR-v9-273](04-Entscheidungslog.md#adr-v9-273) | [20 §1.3](20-Funktionen.md), [ADR-v9-135](04-Entscheidungslog.md#adr-v9-135), [ADR-v9-273](04-Entscheidungslog.md#adr-v9-273) | `txt:Kekule-Nummern bleiben auf den Probanden bezogen@tests/islands/tree-layout.test.ts` | gebaut |
| BL-361 | — | defekt | basis | **Der Sanduhr-Baum wurde links angeschnitten** → [ADR-v9-273](04-Entscheidungslog.md#adr-v9-273) | [20 §1.3](20-Funktionen.md), [21 §8](21-UI-UX.md), [ADR-v9-273](04-Entscheidungslog.md#adr-v9-273) | `txt:Die Fläche umschließt, was gezeichnet wird@tests/islands/tree-layout.test.ts` | gebaut |
| BL-360 | — | feature | kür | **Mitführen je Feld: der eingetippte Wert überlebt den Serien-Reset** → [ADR-v9-271](04-Entscheidungslog.md#adr-v9-271) | [20 §2](20-Funktionen.md), [ADR-v9-268](04-Entscheidungslog.md#adr-v9-268), [ADR-v9-271](04-Entscheidungslog.md#adr-v9-271) | `sym:setSlotCarry` | gebaut |
| BL-322 | — | hygiene | kür | **Die zwei Abarbeitungslisten der Doku-Wächter sind leer — und die Räumung hat jetzt ein Gate** → [ADR-v9-272](04-Entscheidungslog.md#adr-v9-272) | [05 Regel 1](05-Backlog.md), [ADR-v9-240](04-Entscheidungslog.md#adr-v9-240), [ADR-v9-272](04-Entscheidungslog.md#adr-v9-272) | `!txt:L14_RATSCHE = 36@spec:.claude/skills/spec-lint/check-backlog.mjs` | gebaut |
| BL-334 | — | hygiene | kür | **Die Meldungs-Kanäle ziehen auf `StatusNotice` nach** → [ADR-v9-269](04-Entscheidungslog.md#adr-v9-269) | [21 §6](21-UI-UX.md), [ADR-v9-247](04-Entscheidungslog.md#adr-v9-247), [ADR-v9-269](04-Entscheidungslog.md#adr-v9-269) | `test:tests/ui/status-notice-kanaele.test.ts` | gebaut |
| BL-357 | — | feature | kür | **Der Builder benutzt die üblichen Eingabefelder, und die Rollen-Blöcke sind verschiebbar** → [ADR-v9-268](04-Entscheidungslog.md#adr-v9-268) | [20 §2](20-Funktionen.md), [21 §6a](21-UI-UX.md) | `sym:moveRoleBlock` | gebaut |
| BL-358 | — | feature | kür | **Die Eltern des Partners als eigene Rollen** → [ADR-v9-268](04-Entscheidungslog.md#adr-v9-268) | [20 §2](20-Funktionen.md), [10 §2](10-Domaenenmodell.md) | `test:tests/core/model/partner-eltern.test.ts` | gebaut |
| BL-356 | — | defekt | basis | **Der Coverage-Wächter meldete 76/135 statt 87/135 — elf beanspruchte Tags fehlten im Nenner** — zehn Ereignistags aus BL-335 plus `DATA`; neue Gegenrichtung im Test statt Erinnerung → [ADR-v9-267](04-Entscheidungslog.md#adr-v9-267) | [32 TST-29](32-Testframework.md), [ADR-v9-249](04-Entscheidungslog.md#adr-v9-249), [ADR-v9-127](04-Entscheidungslog.md#adr-v9-127) | `txt:die Gegenrichtung@tests/core/coverage-spec.test.ts` | gebaut |
| BL-355 | — | defekt | basis | **Eine Ereignis-Fortsetzung erreichte das Modell nicht — 118 Zeichen sind aus einem echten Export verschwunden** — `collectText` beim Lesen, `textNode` beim Schreiben, Verlust-Wächter am Realbestand → [ADR-v9-266](04-Entscheidungslog.md#adr-v9-266) | [13 §2](13-Interop-Roundtrip.md), [32 TST-28](32-Testframework.md), [ADR-v9-211](04-Entscheidungslog.md#adr-v9-211) | `test:tests/roundtrip/wire-loss-realbestand.test.ts` | gebaut |
| BL-354 | — | feature | kür | **JSON-Ex-/Import einzelner Erfassungs-Vorlagen** — ergänzt den Bestand, ersetzt ihn nie ([ADR-v9-264](04-Entscheidungslog.md#adr-v9-264)) | [20 §2](20-Funktionen.md), [30 §2.3](30-NFR-und-Persistenz.md), [14 §2](14-Dateihandling.md) | `sym:exportEntryTemplates` | gebaut |
| BL-353 | — | feature | kür | **Erfassung als Arbeits-Ziel: Vorlagen-Liste und Builder** → [ADR-v9-265](04-Entscheidungslog.md#adr-v9-265) | [20 §2](20-Funktionen.md), [21 §3](21-UI-UX.md), [21 §6h](21-UI-UX.md) | `test:tests/ui/EntryTemplateView.component.test.ts` | gebaut |
| BL-352 | — | feature | kür | **Erfassungs-Fläche der Vorlagen** — geteilte Datumszeile, Vorschlagen statt Binden → [ADR-v9-264](04-Entscheidungslog.md#adr-v9-264) | [20 §2](20-Funktionen.md), [21 §6a](21-UI-UX.md) | `test:tests/ui/EntryTemplateCapture.component.test.ts` | gebaut |
| BL-232 | — | feature | kür | **Erfassungs-Vorlagen — Modell, Persistenz, Anwenden-Kommando** → [ADR-v9-264](04-Entscheidungslog.md#adr-v9-264) | [20 §2](20-Funktionen.md), [30 §2.2](30-NFR-und-Persistenz.md), [10 §5.1](10-Domaenenmodell.md) | `sym:applyEntryTemplate` | gebaut |
| BL-351 | — | defekt | basis | **Native Rückfragen sind in der Vorschau-Fläche wirkungslos — jedes Löschen war dort tot** — geteilter `ConfirmDialog`, Lint-Gate, eine Knopf-Reihenfolge → [ADR-v9-263](04-Entscheidungslog.md#adr-v9-263) | [21 §6](21-UI-UX.md), [32 TST-27](32-Testframework.md), [ADR-v9-263](04-Entscheidungslog.md#adr-v9-263) | `test:tests/ui/confirm-helper.ts` | gebaut |
| BL-350 | — | defekt | basis | **Die Forschungszeile am Steckbrief zeigte nur die Überschrift und war nicht anfassbar** — Ergebnis/Quelle/Datum als Zusatz, keine rohen Enum-Werte, ✎/🗑 je Zeile → [ADR-v9-262](04-Entscheidungslog.md#adr-v9-262) | [20 §1.11](20-Funktionen.md), [12 §2](12-Forschungsdaten.md), [ADR-v9-254](04-Entscheidungslog.md#adr-v9-254), [ADR-v9-262](04-Entscheidungslog.md#adr-v9-262) | `txt:Zusatzangaben, Bearbeiten, Löschen@tests/ui/eltern-und-forschung.component.test.ts` | gebaut |
| BL-349 | — | defekt | basis | **Das eingeblendete Formular schrumpfte auf eine Zeile (32px statt 276)** — Kind mit eigenem `overflow` in der neuen Flex-Wurzel; geteilte `.stb-detail-root` mit `flex-shrink: 0` für die Kinder → [ADR-v9-261](04-Entscheidungslog.md#adr-v9-261) | [21 §6](21-UI-UX.md), [ADR-v9-220](04-Entscheidungslog.md#adr-v9-220), [ADR-v9-255](04-Entscheidungslog.md#adr-v9-255), [ADR-v9-261](04-Entscheidungslog.md#adr-v9-261) | `test:tests/ui/detail-wurzel.test.ts` | gebaut |
| BL-234 | — | feature | kür | **Quellreferenz-Zwischenablage** — [ADR-v9-260](04-Entscheidungslog.md#adr-v9-260) | [20 §2](20-Funktionen.md), [13 §6](13-Interop-Roundtrip.md), [30 §2.2](30-NFR-und-Persistenz.md) | `sym:createCitationClipboard` | gebaut |
| BL-343 | — | hygiene | kür | **Der Abschnitts-Abstand lag achtfach als kopiertes `margin` (fünfmal `top`, zweimal `bottom`)** — jetzt `gap` am Container in allen sieben Ansichten, Ratsche im Wächter → [ADR-v9-255](04-Entscheidungslog.md#adr-v9-255) | [21 §6](21-UI-UX.md), [ADR-v9-255](04-Entscheidungslog.md#adr-v9-255) | `txt:abschnittsAbstandRatsche@tests/ui/sektions-ueberschrift.test.ts` | gebaut |
| BL-347 | — | hygiene | kür | **Auch die beschriftete Knopf-Primitive stand auf dem User-Agent-Wert** — 0,85rem gemessen ausgewählt (hält die dokumentierten 36px), Gefahrenzone übernimmt die `danger`-Variante → [ADR-v9-258](04-Entscheidungslog.md#adr-v9-258) | [21 §6](21-UI-UX.md), [ADR-v9-257](04-Entscheidungslog.md#adr-v9-257), [ADR-v9-258](04-Entscheidungslog.md#adr-v9-258) | `txt:beschriftete Knopf-Primitive setzt ihre Schriftgröße@tests/ui/sektions-ueberschrift.test.ts` | gebaut |
| BL-346 | — | defekt | basis | **Das `gap` traf auch die Fugen INNERHALB der Kopfzeile** — drei oberste Geschwister statt einer Klammer, Ränder addierten sich → [ADR-v9-257](04-Entscheidungslog.md#adr-v9-257) | [21 §6](21-UI-UX.md), [ADR-v9-255](04-Entscheidungslog.md#adr-v9-255), [ADR-v9-257](04-Entscheidungslog.md#adr-v9-257) | `txt:person-detail-header@ui/views/person/PersonDetailHeader.svelte` | gebaut |
| BL-345 | — | defekt | basis | **Die Glyphen-Primitive hatte keine gewählte Schriftgröße** — 16 Fundstellen auf dem UA-Wert 13,333px, Zeilen zwischen 0,7 und 0,95rem; jetzt 1rem, gemessen ausgewählt → [ADR-v9-257](04-Entscheidungslog.md#adr-v9-257) | [21 §6](21-UI-UX.md), [21 §6i](21-UI-UX.md), [ADR-v9-257](04-Entscheidungslog.md#adr-v9-257) | `txt:stb-icon-btn@ui/shell/design-system.css` | gebaut |
| BL-344 | — | defekt | basis | **Das + gehört ans Rollen-Label — und die eigene Familie war gar nicht anlegbar** — je Rolle eine Pille, gemessen statt geschätzt → [ADR-v9-256](04-Entscheidungslog.md#adr-v9-256) | [21 §6j](21-UI-UX.md), [20 §1.4](20-Funktionen.md), [ADR-v9-254](04-Entscheidungslog.md#adr-v9-254), [ADR-v9-256](04-Entscheidungslog.md#adr-v9-256) | `test:tests/ui/eltern-und-forschung.component.test.ts` | gebaut |
| BL-342 | — | defekt | basis | **Vier Überschriften-Ebenen auf einer Seite — die Sektions-Optik stand 13× kopiert** — geteilte `.stb-section-title` + Wächter → [ADR-v9-255](04-Entscheidungslog.md#adr-v9-255) | [21 §6](21-UI-UX.md), [ADR-v9-83](04-Entscheidungslog.md#adr-v9-83), [ADR-v9-255](04-Entscheidungslog.md#adr-v9-255) | `test:tests/ui/sektions-ueberschrift.test.ts` | gebaut |
| BL-341 | — | feature | basis | **Eltern zuordnen/anlegen und Forschungseinträge am Steckbrief** — Picker mit Anlage-Übernahme, geteilte Forschungs-Sektion → [ADR-v9-254](04-Entscheidungslog.md#adr-v9-254) | [20 §1.4/§1.11](20-Funktionen.md), [21 §10f](21-UI-UX.md), [12 §1](12-Forschungsdaten.md), [ADR-v9-254](04-Entscheidungslog.md#adr-v9-254) | `test:tests/ui/eltern-und-forschung.component.test.ts` | gebaut |
| BL-340 | — | defekt | basis | **Ein neu erfasstes Sonder-Ereignis erreichte die Datei nie** — Schreib-Gate `.seen` statt `isEventPresent`, alle sechs Slots → [ADR-v9-253](04-Entscheidungslog.md#adr-v9-253) | [13 §2.1](13-Interop-Roundtrip.md), [10 §5.1](10-Domaenenmodell.md), [ADR-v9-253](04-Entscheidungslog.md#adr-v9-253) | `test:tests/roundtrip/sonderereignis-anlegen.test.ts` | gebaut |
| BL-339 | — | defekt | basis | **Die Geburtszeile fehlte an Personen ohne Geburtsdaten — und war nirgends anlegbar** — [ADR-v9-62](04-Entscheidungslog.md#adr-v9-62) Punkt 1 (bleibt immer offen) war nie umgesetzt → [ADR-v9-253](04-Entscheidungslog.md#adr-v9-253) | [20 §2](20-Funktionen.md), [ADR-v9-62](04-Entscheidungslog.md#adr-v9-62), [ADR-v9-253](04-Entscheidungslog.md#adr-v9-253) | `test:tests/ui/geburt-immer-offen.test.ts` | gebaut |
| BL-338 | — | defekt | basis | **Zwei eigenständige `NOTE`-Zeilen wurden zu einer gefaltet — und der Überschuss schrieb die zweite doppelt** — `extraNotes` je Träger, ein Slot je Wire-Zeile → [ADR-v9-252](04-Entscheidungslog.md#adr-v9-252) | [13 §2](13-Interop-Roundtrip.md), [10 §2/§4](10-Domaenenmodell.md), [ADR-v9-208](04-Entscheidungslog.md#adr-v9-208), [ADR-v9-252](04-Entscheidungslog.md#adr-v9-252) | `test:tests/roundtrip/mehrfach-note.test.ts` | gebaut |
| BL-337 | — | defekt | basis | **`CHAN` war in fünf Ebenen widersprüchlich und wurde nirgends gesetzt** — gelesen an allen fünf Record-Arten, gestempelt am `commit`-Chokepoint, GRAMPS-`change` echt statt `"0"` → [ADR-v9-251](04-Entscheidungslog.md#adr-v9-251) | [10 §4](10-Domaenenmodell.md), [13 §1](13-Interop-Roundtrip.md), [32 §5](32-Testframework.md), [ADR-v9-251](04-Entscheidungslog.md#adr-v9-251) | `sym:withChangeStamps` | gebaut |
| BL-336 | — | defekt | basis | **Die Quelle hatte kein Notizfeld — und das Formularfeld „Notiz" band die Transkription** — `SOUR>NOTE` als `noteText`/`noteRefs`, Beschriftungen getrennt → [ADR-v9-250](04-Entscheidungslog.md#adr-v9-250) | [20 §1.6](20-Funktionen.md), [10 §4](10-Domaenenmodell.md), [13 §1.1](13-Interop-Roundtrip.md), [ADR-v9-79](04-Entscheidungslog.md#adr-v9-79), [ADR-v9-250](04-Entscheidungslog.md#adr-v9-250) | `test:tests/core/source-note.test.ts` | gebaut |
| BL-335 | — | defekt | basis | **Zehn Ereignistags waren übersetzt, aber vom Parser nie erzeugt** — Nutzer-Befund „Priesterweihe wird nicht angezeigt"; ORDN + neun Geschwister, Drift-Wächter über vier Richtungen → [ADR-v9-249](04-Entscheidungslog.md#adr-v9-249) | [20 §2](20-Funktionen.md), [13 §2](13-Interop-Roundtrip.md), [32 TST-6](32-Testframework.md), [ADR-v9-249](04-Entscheidungslog.md#adr-v9-249) | `test:tests/core/event-tag-drift.test.ts` | gebaut |
| BL-332 | — | feature | kür | **Das Grenzjahr wird beim Laden abgeleitet, der Wächter sieht auf die Datei** — `leiteGrenzjahrAb` an beiden Türen → [ADR-v9-248](04-Entscheidungslog.md#adr-v9-248) | [11 §1](11-Orte-Hoefe-Identitaet.md), [30 §2.1](30-NFR-und-Persistenz.md), [ADR-v9-246](04-Entscheidungslog.md#adr-v9-246), [ADR-v9-248](04-Entscheidungslog.md#adr-v9-248) | `sym:leiteGrenzjahrAb` | gebaut |
| BL-333 | — | defekt | basis | **Statuszeile ohne Frist, Befund ohne Weg, Brennpunkte-Key kollidiert** — Regel, `StatusNotice`, eindeutiger Key → [ADR-v9-247](04-Entscheidungslog.md#adr-v9-247) | [20 §3](20-Funktionen.md), [21 §6](21-UI-UX.md), [ADR-v9-247](04-Entscheidungslog.md#adr-v9-247) | `test:tests/ui/FocusPersonList.component.test.ts` | gebaut |
| BL-331 | — | defekt | basis | **Die dritte datierte Liste nimmt jetzt auch einen Stichtag** — Hof-Adressvarianten über denselben Lesepfad wie die beiden Orts-Flächen → [ADR-v9-245](04-Entscheidungslog.md#adr-v9-245) | [11 §1](11-Orte-Hoefe-Identitaet.md), [ADR-v9-243](04-Entscheidungslog.md#adr-v9-243), [ADR-v9-245](04-Entscheidungslog.md#adr-v9-245) | `test:tests/ui/grenz-eingabe-flaechen.test.ts` | gebaut |
| BL-328 | — | defekt | basis | **Die Belege der Kindschaft wurden nie gelesen noch geschrieben** → [ADR-v9-244](04-Entscheidungslog.md#adr-v9-244) | [10 §2](10-Domaenenmodell.md), [13 §1](13-Interop-Roundtrip.md), [ADR-v9-244](04-Entscheidungslog.md#adr-v9-244) | `test:tests/roundtrip/naht-kindschaft-import-export.test.ts` | gebaut |
| BL-329 | — | feature | basis | **Kindschafts-Editor: Kind-Verhältnis und Quellen an beiden Flächen** → [ADR-v9-244](04-Entscheidungslog.md#adr-v9-244) | [20 §1.4](20-Funktionen.md), [20 §1.5](20-Funktionen.md), [10 §3](10-Domaenenmodell.md), [ADR-v9-244](04-Entscheidungslog.md#adr-v9-244) | `sym:saveChildLink` | gebaut |
| BL-311 | — | feature | basis | **Acht Index-Flächen rendern flach — die Suchtreffer sogar bei jedem Tastendruck** → [ADR-v9-234](04-Entscheidungslog.md#adr-v9-234) · [ADR-v9-235](04-Entscheidungslog.md#adr-v9-235) · [ADR-v9-236](04-Entscheidungslog.md#adr-v9-236) | [30 §1](30-NFR-und-Persistenz.md), [21 §10b](21-UI-UX.md), [21 §5](21-UI-UX.md), [32 §2](32-Testframework.md), [ADR-v9-234](04-Entscheidungslog.md#adr-v9-234) | `txt:RATSCHE_SICHTBAR@tests/perf/list-render.perf.test.ts` | gebaut |
| BL-324 | — | feature | usp | **Tagegenaue Gültigkeitsdaten für Verwaltungshierarchie und Ortsnamen** → [ADR-v9-243](04-Entscheidungslog.md#adr-v9-243) | [11 §1](11-Orte-Hoefe-Identitaet.md), [11 §5](11-Orte-Hoefe-Identitaet.md), [30 §2.1](30-NFR-und-Persistenz.md), [ADR-v9-243](04-Entscheidungslog.md#adr-v9-243) | `sym:spanneVonDatiert` | gebaut |
| BL-325 | — | defekt | basis | **Der ⚠-Hinweis auf überlappende Perioden war spezifiziert, aber nicht gebaut** → [ADR-v9-243](04-Entscheidungslog.md#adr-v9-243) | [11 §5](11-Orte-Hoefe-Identitaet.md), [ADR-v9-243](04-Entscheidungslog.md#adr-v9-243) | `txt:place-detail__chain-warn@ui/views/place/PlaceDetail.svelte` | gebaut |
| BL-327 | — | defekt | basis | **TST-21 bewachte nur die GEDCOM-Hälfte der Messgrundlage** → [ADR-v9-242](04-Entscheidungslog.md#adr-v9-242) | [32 TST-21](32-Testframework.md), [ADR-v9-178](04-Entscheidungslog.md#adr-v9-178), [ADR-v9-242](04-Entscheidungslog.md#adr-v9-242) | `txt:ORTSBESTAND@tests/core/realdaten-basis.test.ts` | gebaut |
| BL-323 | — | defekt | basis | **Der Speichern-Knopf im Ereignis-Editor war ab dem zweiten Mal tot** → [ADR-v9-241](04-Entscheidungslog.md#adr-v9-241) | [02 §3.3](02-Zielarchitektur-v9.md), [32 TST-26](32-Testframework.md), [ADR-v9-241](04-Entscheidungslog.md#adr-v9-241) | `test:tests/ui/rohdaten-grenze.component.test.ts` | gebaut |
| BL-315 | — | defekt | basis | **Der Safari-`DataCloneError` beim Ortsdatei-Import: geschlossen als „nicht reproduzierbar"** → [ADR-v9-233](04-Entscheidungslog.md#adr-v9-233) | [14 §6](14-Dateihandling.md), [30 §2.1](30-NFR-und-Persistenz.md), [ADR-v9-233](04-Entscheidungslog.md#adr-v9-233) | `test:tests/core/clone-diagnose.test.ts` | gebaut |
| BL-318 | — | defekt | basis | **Der Kurations-Rundlauf war am neuen Datenstand nicht mehr stabil — die Ursache lag in der Test-Automatik** → [ADR-v9-232](04-Entscheidungslog.md#adr-v9-232) | [11 §9.2](11-Orte-Hoefe-Identitaet.md), [32 §2](32-Testframework.md), [ADR-v9-232](04-Entscheidungslog.md#adr-v9-232) | `txt:typeMismatch@tests/roundtrip/kurations-rundlauf-realdaten.test.ts` | gebaut |
| BL-321 | — | defekt | basis | **Die Autokorrektur ersetzte Eingaben in Namens-, Orts- und Signaturfeldern** → [ADR-v9-231](04-Entscheidungslog.md#adr-v9-231) | [21 §6](21-UI-UX.md), [32 TST-12](32-Testframework.md), [ADR-v9-231](04-Entscheidungslog.md#adr-v9-231) | `test:tests/ui/plain-input.test.ts` | gebaut |
| BL-320 | — | defekt | basis | **Dieselbe Klasse wie BL-319 an sieben weiteren Flächen** → [ADR-v9-230](04-Entscheidungslog.md#adr-v9-230) | [21 §5](21-UI-UX.md), [20 §1.4](20-Funktionen.md), [ADR-v9-230](04-Entscheidungslog.md#adr-v9-230) | `sym:createPersonListState` | gebaut |
| BL-319 | — | defekt | basis | **Der Zustand des Qualitäts-Dashboards (und der globalen Suche) überlebte keine Navigation** → [ADR-v9-229](04-Entscheidungslog.md#adr-v9-229) | [21 §5](21-UI-UX.md), [20 §1.11g](20-Funktionen.md), [ADR-v9-229](04-Entscheidungslog.md#adr-v9-229) | `sym:createQualityDashboardState` | gebaut |
| BL-317 | — | feature | basis | **Strukturierte Adressen waren unsichtbar und nicht bearbeitbar** → [ADR-v9-228](04-Entscheidungslog.md#adr-v9-228) | [10 §5.1](10-Domaenenmodell.md), [13 §1.1](13-Interop-Roundtrip.md), [20 §3](20-Funktionen.md), [ADR-v9-228](04-Entscheidungslog.md#adr-v9-228) | `sym:addrDisplay` | gebaut |
| BL-316 | — | hygiene | basis | **Ein Schreibweg für alle IndexedDB-Stores (`idbPut`) mit Klon-Diagnose im Fehlerfall** → [ADR-v9-227](04-Entscheidungslog.md#adr-v9-227) | [30 §2.1](30-NFR-und-Persistenz.md), [ADR-v9-227](04-Entscheidungslog.md#adr-v9-227) | `sym:idbPut` | gebaut |
| BL-314 | — | feature | basis | **Befüllte Ereignisse waren nicht löschbar — der Umweg „im Editor leeren" scheitert an `lati`/`long`/`media`** → [ADR-v9-226](04-Entscheidungslog.md#adr-v9-226) | [20 §2](20-Funktionen.md), [ADR-v9-226](04-Entscheidungslog.md#adr-v9-226) | `txt:loeschFrage@ui/shell/EventLine.svelte` | gebaut |
| BL-310 | — | defekt | basis | **Die Karte-Lens benennt ihre Leere nicht** → [ADR-v9-221](04-Entscheidungslog.md#adr-v9-221) | [20 §1.9](20-Funktionen.md), [21 §5](21-UI-UX.md) | `sym:mapEmptyReason` | gebaut |
| BL-309 | — | defekt | basis | **Die mobile Detailansicht ließ sich nicht scrollen** → [ADR-v9-220](04-Entscheidungslog.md#adr-v9-220) | [21 §2](21-UI-UX.md), [ADR-v9-220](04-Entscheidungslog.md#adr-v9-220) | `txt:entity-tab__swipe@ui/views/EntityTab.svelte` | gebaut |
| BL-278 | — | hygiene | kür | **Modal-Backdrops portalieren** → [ADR-v9-99](04-Entscheidungslog.md#adr-v9-99) | [21 §6k](21-UI-UX.md) | `txt:use:portal@ui/shell/EventEditModal.svelte` | gebaut |
| BL-277 | — | defekt | kür | **Löschen überall abgesetzt, nie neben „Speichern"** → [ADR-v9-217](04-Entscheidungslog.md#adr-v9-217) · [ADR-v9-30](04-Entscheidungslog.md#adr-v9-30) · [ADR-v9-193](04-Entscheidungslog.md#adr-v9-193) | [20 §2](20-Funktionen.md), [21 §6](21-UI-UX.md) | `txt:DeleteEntityButton@ui/views/place/PlaceDetail.svelte` | gebaut |
| BL-276 | — | feature | kür | **Tastatur in den Entitäts-Formularen** → [ADR-v9-218](04-Entscheidungslog.md#adr-v9-218) | [21 §6i](21-UI-UX.md), [32 TST-15](32-Testframework.md) | `test:tests/ui/entity-form-keyboard.test.ts` | gebaut |
| BL-275 | — | defekt | kür | **„＋ Neu" + „Abbrechen" hinterlässt keinen leeren Datensatz** → [ADR-v9-219](04-Entscheidungslog.md#adr-v9-219) | [20 §2](20-Funktionen.md), [21 §6g](21-UI-UX.md) | `test:tests/ui/entity-create-cancel.test.ts` | gebaut |
| BL-307 | — | defekt | kür | **Zwei Tags für eine Aussage: `_DONE` neben `_TSTAT`** → [ADR-v9-213](04-Entscheidungslog.md#adr-v9-213) | [12 §1](12-Forschungsdaten.md), [13 §2](13-Interop-Roundtrip.md) | `txt:ABGESCHAFFT@core/interop/write-back.ts` | gebaut |
| BL-306 | — | defekt | kür | **Ein geteiltes inline-Medium bekam seine globalen Felder an JEDER Fundstelle** → [ADR-v9-212](04-Entscheidungslog.md#adr-v9-212) | [10 §4](10-Domaenenmodell.md), [13 §1](13-Interop-Roundtrip.md) | `txt:typeSeen@core/model/types.ts` | gebaut |
| BL-304 | — | defekt | kür | **Speichern ergänzte 200 `GIVN`/`SURN`-Zeilen, die die Quelle nicht hatte** → [ADR-v9-112](04-Entscheidungslog.md#adr-v9-112) · [ADR-v9-197](04-Entscheidungslog.md#adr-v9-197) · [ADR-v9-210](04-Entscheidungslog.md#adr-v9-210) | [10 §2](10-Domaenenmodell.md), [13 §1](13-Interop-Roundtrip.md) | `txt:function nameSubtag@core/interop/write-back-emit.ts` | gebaut |
| BL-305 | — | defekt | kür | **Der Writer setzte `CONC`-Umbrüche nicht wieder — Zeilen über 255 Bytes** → [ADR-v9-211](04-Entscheidungslog.md#adr-v9-211) · [ADR-v9-14](04-Entscheidungslog.md#adr-v9-14) | [13 §1](13-Interop-Roundtrip.md), [32 TST-20/21](32-Testframework.md) | `txt:schnittNebenLeerzeichen@core/interop/gedcom-tree.ts` | gebaut |
| BL-303 | — | defekt | kür | **Wert-Umschreibungen allgemein verhindern, nicht je Fall** → [ADR-v9-209](04-Entscheidungslog.md#adr-v9-209) · [ADR-v9-81](04-Entscheidungslog.md#adr-v9-81) | [13 §2](13-Interop-Roundtrip.md) | `txt:function haltWert@core/interop/write-back.ts` | gebaut |
| BL-302 | — | defekt | basis | **Die Überlappungszone: was das Modell beansprucht, aber nicht halten kann** → [ADR-v9-208](04-Entscheidungslog.md#adr-v9-208) | [13 §1](13-Interop-Roundtrip.md), [10](10-Domaenenmodell.md) | `txt:function ueberschuss@core/interop/write-back.ts` | gebaut |
| BL-290 | — | defekt | kür | **`FORM` wird beim Speichern umgeschrieben** → [ADR-v9-197](04-Entscheidungslog.md#adr-v9-197) · [ADR-v9-126](04-Entscheidungslog.md#adr-v9-126) · [ADR-v9-207](04-Entscheidungslog.md#adr-v9-207) | [13 §1](13-Interop-Roundtrip.md), [10 §4](10-Domaenenmodell.md) | `txt:formWire@core/model/types.ts` | gebaut |
| BL-292 | — | defekt | kür | **Restverlust beim Speichern: `NAME`/`ADDR`/Zitat-Klasse** → [ADR-v9-207](04-Entscheidungslog.md#adr-v9-207) · [ADR-v9-151](04-Entscheidungslog.md#adr-v9-151) · [ADR-v9-112](04-Entscheidungslog.md#adr-v9-112) | [13 §1](13-Interop-Roundtrip.md), [10](10-Domaenenmodell.md) | `test:tests/roundtrip/wire-loss-classes.test.ts` | gebaut |
| BL-289 | — | feature | kür | **`RELI` als Ereignis modellieren** → [ADR-v9-197](04-Entscheidungslog.md#adr-v9-197) · [ADR-v9-207](04-Entscheidungslog.md#adr-v9-207) · [ADR-v9-156](04-Entscheidungslog.md#adr-v9-156) | [10](10-Domaenenmodell.md), [20 §1.4](20-Funktionen.md) | `test:tests/roundtrip/wire-loss-classes.test.ts` | gebaut |
| BL-301 | — | defekt | basis | **Ein Edit am inline-Medium erreichte die Datei nie** → [ADR-v9-207](04-Entscheidungslog.md#adr-v9-207) | [13 §1](13-Interop-Roundtrip.md), [10 §4](10-Domaenenmodell.md) | `sym:definingMediaNodes` | gebaut |
| BL-300 | — | defekt | basis | **Der Eltern-Picker im Familien-Steckbrief war ohne Ausweg** → [ADR-v9-206](04-Entscheidungslog.md#adr-v9-206) | [21 §6i](21-UI-UX.md) | `txt:schliesseBeiKlickDaneben@ui/shell/picker-dismiss.ts` | gebaut |
| BL-299 | — | feature | basis | **Sichtbare Größe und Trefferfläche entkoppelt — eine Zone für alle Knopf-Primitiven** → [ADR-v9-205](04-Entscheidungslog.md#adr-v9-205) | [21 §6i](21-UI-UX.md), [21 §6a](21-UI-UX.md), [32 TST-15](32-Testframework.md) | `txt:stb-segment-row--full@ui/shell/design-system.css` | gebaut |
| BL-281 | — | defekt | basis | **Trefferflächen der Navigationsreihen — die Segment-Primitive stellt die Größenfrage gar nicht** → [ADR-v9-132](04-Entscheidungslog.md#adr-v9-132) · [ADR-v9-204](04-Entscheidungslog.md#adr-v9-204) | [21 §6i](21-UI-UX.md), [21 §6a](21-UI-UX.md), [32 TST-15](32-Testframework.md) | `txt:Segment-Primitive trägt die Trefferfläche@tests/ui/touch-target.test.ts` | gebaut |
| BL-298 | — | defekt | basis | **Aus einem Detail führte kein Weg mehr zur Liste** → [ADR-v9-203](04-Entscheidungslog.md#adr-v9-203) | [20 §1.1](20-Funktionen.md), [21 §2](21-UI-UX.md) | `txt:segment.id === activeSegment@ui/views/EntityTab.svelte` | gebaut |
| BL-297 | — | hygiene | kür | **Der Trefferflächen-Wächter rät den Bedienelement-Charakter aus dem Klassennamen** → [ADR-v9-201](04-Entscheidungslog.md#adr-v9-201) | [21 §6i](21-UI-UX.md), [32 TST-15](32-Testframework.md) | `txt:INTERAKTIVE_KLASSEN@tests/ui/touch-target.test.ts` | gebaut |
| BL-282 | — | hygiene | basis | **Der Trefferflächen-Wächter sieht die geteilten Primitiven nicht** → [ADR-v9-201](04-Entscheidungslog.md#adr-v9-201) | [21 §6i](21-UI-UX.md), [32 TST-15](32-Testframework.md), [ADR-v9-155](04-Entscheidungslog.md#adr-v9-155) | `txt:GETEILTE_PRIMITIVEN@tests/ui/touch-target.test.ts` | gebaut |
| BL-280 | — | defekt | basis | **Trefferfläche für ikonische Inline-Bedienelemente — eine eigene Primitive** → [ADR-v9-155](04-Entscheidungslog.md#adr-v9-155) · [ADR-v9-202](04-Entscheidungslog.md#adr-v9-202) | [21 §6i](21-UI-UX.md), [21 §6a](21-UI-UX.md), [32 TST-15](32-Testframework.md) | `txt:stb-icon-btn@ui/shell/design-system.css` | gebaut |
| BL-285 | — | defekt | basis | **Jeder Speichervorgang verliert Daten** → [ADR-v9-197](04-Entscheidungslog.md#adr-v9-197) | [13 §1](13-Interop-Roundtrip.md) | `sym:modellierteKinder` | gebaut |
| BL-294 | — | defekt | basis | **Ein Personen-Merge ließ einen toten Hypothesen-Zeiger zurück** → [ADR-v9-200](04-Entscheidungslog.md#adr-v9-200) · [ADR-v9-174](04-Entscheidungslog.md#adr-v9-174) · [ADR-v9-195](04-Entscheidungslog.md#adr-v9-195) | [10](10-Domaenenmodell.md), [12 §4](12-Forschungsdaten.md) | `txt:hypotheses.refs@core/dedup/merge-persons.ts` | gebaut |
| BL-296 | — | hygiene | basis | **`Testdateien/` war nur zur Hälfte ignoriert** → [04a](04a-Chronik.md#bl-296) | [31](31-Dev-Umgebung.md) | `txt:^Testdateien/$@spec:.gitignore` | gebaut |
| BL-287 | — | test | basis | **Absicherung messen statt Tests zählen — Mutations-Stichprobe, Naht-Tests, Rückbau** → [ADR-v9-196](04-Entscheidungslog.md#adr-v9-196) · [ADR-v9-199](04-Entscheidungslog.md#adr-v9-199) · [ADR-v9-47](04-Entscheidungslog.md#adr-v9-47) | [32](32-Testframework.md), [13 §1](13-Interop-Roundtrip.md) | `txt:test:mutation@package.json` | gebaut |
| BL-291 | — | defekt | basis | **Eine Ortskorrektur muss ihre Ereignisse mitziehen — sonst wird der Ort beim nächsten Laden nicht wiedererkannt** → [ADR-v9-198](04-Entscheidungslog.md#adr-v9-198) | [01](01-Vision-und-Prinzipien.md), [11 §2/§3](11-Orte-Hoefe-Identitaet.md) | `test:tests/core/place-curation-roundtrip.test.ts` | gebaut |
| BL-288 | — | defekt | basis | **Stille Normalisierung abstellen: `PLAC`** → [ADR-v9-197](04-Entscheidungslog.md#adr-v9-197) · [ADR-v9-47](04-Entscheidungslog.md#adr-v9-47) | [11 §3](11-Orte-Hoefe-Identitaet.md), [13 §1](13-Interop-Roundtrip.md) | `txt:Wire-Wahrheit@core/interop/write-back-emit.ts` | gebaut |
| BL-286 | — | hygiene | basis | **Lint-Regel L12: eine Ankündigung braucht eine Adresse** → [ADR-v9-196](04-Entscheidungslog.md#adr-v9-196) · [ADR-v9-74](04-Entscheidungslog.md#adr-v9-74) · [ADR-v9-53](04-Entscheidungslog.md#adr-v9-53) | [ADR-v9-196](04-Entscheidungslog.md#adr-v9-196) | `txt:L12_MARKER@.claude/skills/spec-lint/check-backlog.mjs` | gebaut |
| BL-284 | — | defekt | basis | **Ein Orts-Merge kostete Ereignisse ihre Zuordnung** → [ADR-v9-195](04-Entscheidungslog.md#adr-v9-195) · [ADR-v9-74](04-Entscheidungslog.md#adr-v9-74) · [ADR-v9-72](04-Entscheidungslog.md#adr-v9-72) · [ADR-v9-92](04-Entscheidungslog.md#adr-v9-92) | [11 §4.2/§9.2](11-Orte-Hoefe-Identitaet.md) | `test:tests/ui/place-ref-integrity.test.ts` | gebaut |
| BL-283 | — | defekt | usp | **Auf dem Mac gab es keinen Speicherweg — die Export-Leiter hatte keine „Speichern unter"-Sprosse** → [ADR-v9-194](04-Entscheidungslog.md#adr-v9-194) | [14 §2/§4](14-Dateihandling.md) | `txt:canPickSaveTarget@services/file/file-service.ts` | gebaut |
| BL-274 | — | feature | basis | **Ein Bearbeiten-Paradigma: der Editor ersetzt nie die Kopfzeile** → [ADR-v9-63](04-Entscheidungslog.md#adr-v9-63) · [ADR-v9-193](04-Entscheidungslog.md#adr-v9-193) | [21 §6b](21-UI-UX.md), [20 §2](20-Funktionen.md), [ADR-v9-63](04-Entscheidungslog.md#adr-v9-63) | `txt:verdrängt ihre Kopfzeile@tests/ui/edit-commit-timing.test.ts` | gebaut |
| BL-273 | — | defekt | basis | **Bearbeiten/Speichern/Abbrechen über die vorhandene Button-Primitive** → [ADR-v9-155](04-Entscheidungslog.md#adr-v9-155) | [21 §6](21-UI-UX.md), [21 §6i](21-UI-UX.md), [ADR-v9-155](04-Entscheidungslog.md#adr-v9-155) | `test:tests/ui/edit-controls-primitive.test.ts` | gebaut |
| BL-271 | — | defekt | basis | **Wisch-Geste im offenen Editor und im offenen Modal abschalten** → [04a](04a-Chronik.md#bl-271) | [21 §2](21-UI-UX.md), [21 §5](21-UI-UX.md) | `sym:wischGesperrt` | gebaut |
| BL-272 | — | hygiene | basis | **Trefferflächen-Wächter fängt auch die fehlende Größe** → [ADR-v9-91](04-Entscheidungslog.md#adr-v9-91) | [21 §6i](21-UI-UX.md), [32 TST-15](32-Testframework.md), [ADR-v9-155](04-Entscheidungslog.md#adr-v9-155) | `txt:OHNE_GROESSE_RATSCHE@tests/ui/touch-target.test.ts` | gebaut |
| BL-270 | — | defekt | basis | **Die Transaktionsgrenze sichtbar machen: `editing` verliert seine Doppelbedeutung** → [ADR-v9-193](04-Entscheidungslog.md#adr-v9-193) · [ADR-v9-81](04-Entscheidungslog.md#adr-v9-81) · [ADR-v9-42](04-Entscheidungslog.md#adr-v9-42) · [ADR-v9-30](04-Entscheidungslog.md#adr-v9-30) | [21 §6m](21-UI-UX.md), [20 §2](20-Funktionen.md), [ADR-v9-193](04-Entscheidungslog.md#adr-v9-193), [ADR-v9-81](04-Entscheidungslog.md#adr-v9-81) | `test:tests/ui/edit-commit-timing.test.ts` | gebaut |
| BL-268 | K | feature | usp | **Ortstyp am Kandidaten der Review-Klasse P** → [ADR-v9-77](04-Entscheidungslog.md#adr-v9-77) · [ADR-v9-149](04-Entscheidungslog.md#adr-v9-149) | [11 §6](11-Orte-Hoefe-Identitaet.md), [20 §1.7](20-Funktionen.md), [ADR-v9-77](04-Entscheidungslog.md#adr-v9-77) | `txt:placeTypeLabel@ui/views/place/PlaceReview.svelte` | gebaut |
| BL-269 | K | feature | usp | **Medien-Galerie: ganze Fläche + additive Facetten** → [ADR-v9-192](04-Entscheidungslog.md#adr-v9-192) | [20 §1.4](20-Funktionen.md), [21 §3/§5](21-UI-UX.md), [ADR-v9-192](04-Entscheidungslog.md#adr-v9-192) | `sym:createMediaGalleryFilters` | gebaut |
| BL-267 | K | feature | usp | **Anreicherungs-Grad dreistufig + an den Entscheidungsflächen sichtbar** → [ADR-v9-191](04-Entscheidungslog.md#adr-v9-191) · [ADR-v9-149](04-Entscheidungslog.md#adr-v9-149) | [11 §9.1/§9.2](11-Orte-Hoefe-Identitaet.md), [20 §1.7/§1.8](20-Funktionen.md), [ADR-v9-191](04-Entscheidungslog.md#adr-v9-191) | `sym:placeEnrichmentLevel` | gebaut |
| BL-266 | K | feature | usp | **Prüf-Marker `reviewedAt` + „geprüft“-Knopf** → [ADR-v9-191](04-Entscheidungslog.md#adr-v9-191) | [11 §1/§3/§9.1](11-Orte-Hoefe-Identitaet.md), [30 §4](30-NFR-und-Persistenz.md), [ADR-v9-191](04-Entscheidungslog.md#adr-v9-191) | `sym:markPlaceReviewed` | gebaut |
| BL-265 | K | defekt | usp | **Zugehörigkeit nach Jahr: geerbte Historie wird umattribuiert** → [ADR-v9-191](04-Entscheidungslog.md#adr-v9-191) | [20 §1.7](20-Funktionen.md), [11 §1](11-Orte-Hoefe-Identitaet.md), [ADR-v9-191](04-Entscheidungslog.md#adr-v9-191) | `sym:buildAncestorHistory` | gebaut |
| BL-213 | E | feature | kür | **Onboarding-Spotlight** → [ADR-v9-190](04-Entscheidungslog.md#adr-v9-190) | [20 §1.1](20-Funktionen.md) | `test:tests/ui/onboarding-anchors.component.test.ts` | gebaut |
| BL-247 | — | hygiene | kür | **Eine „am Realbestand"-Aussage im Spec-Set muss ihre Datei nennen** → [ADR-v9-178](04-Entscheidungslog.md#adr-v9-178) · [ADR-v9-151](04-Entscheidungslog.md#adr-v9-151) · [ADR-v9-159](04-Entscheidungslog.md#adr-v9-159) | [32 TST-21](32-Testframework.md) | `txt:L11@.claude/skills/spec-lint/check-backlog.mjs` | gebaut |
| BL-264 | K | defekt | basis | **Die App zeichnete unter die iOS-Systemleisten, ohne deren Insets einzurechnen** → [ADR-v9-189](04-Entscheidungslog.md#adr-v9-189) · [ADR-v9-98](04-Entscheidungslog.md#adr-v9-98) | [21 §6](21-UI-UX.md) | `test:tests/ui/safe-area.test.ts` | gebaut |
| BL-261 | S | feature | kür | **Fotos in Story und §4-Ausgaben aus echten Dateien** → [ADR-v9-187](04-Entscheidungslog.md#adr-v9-187) · [ADR-v9-138](04-Entscheidungslog.md#adr-v9-138) | [20 §1.10/§4](20-Funktionen.md), [14 §7](14-Dateihandling.md) | `sym:storyMediaFiles` | gebaut |
| BL-260 | S | feature | kür | **Bilder in Steckbrief und Ereigniszeile** → [ADR-v9-187](04-Entscheidungslog.md#adr-v9-187) | [20 §1.4](20-Funktionen.md), [21 §10m/§10n](21-UI-UX.md) | `sym:personPortrait` | gebaut |
| BL-259 | S | feature | kür | **Medien-Import ohne FS-Access** → [ADR-v9-187](04-Entscheidungslog.md#adr-v9-187) | [14 §7](14-Dateihandling.md), [20 §1.14](20-Funktionen.md) | `datei:services/media/media-bytes-store.ts` | gebaut |
| BL-262 | — | hygiene | kür | **EIN Aktions-Knopf-Stil; `data-variant` wird ein echter Hook.** → [ADR-v9-155](04-Entscheidungslog.md#adr-v9-155) | [21 §6i](21-UI-UX.md), [ADR-v9-128](04-Entscheidungslog.md#adr-v9-128) | `test:tests/ui/button-style.test.ts` | gebaut |
| BL-263 | — | defekt | kür | **Dateinamen mit Umlaut waren nie auflösbar** → [04a](04a-Chronik.md#bl-263) | [14 §7](14-Dateihandling.md) | `test:tests/services/media-resolver.test.ts` | gebaut |
| BL-258 | S | feature | kür | **Thumbnails aus dem verbundenen Ordner** → [ADR-v9-187](04-Entscheidungslog.md#adr-v9-187) | [20 §1.4](20-Funktionen.md), [14 §7](14-Dateihandling.md), [21 §10n](21-UI-UX.md) | `datei:ui/shell/MediaThumb.svelte` | gebaut |
| BL-257 | S | feature | kür | **Einstellungen-Fläche + Medien-Ordner-Anbindung** → [ADR-v9-188](04-Entscheidungslog.md#adr-v9-188) · [ADR-v9-187](04-Entscheidungslog.md#adr-v9-187) | [20 §1.14](20-Funktionen.md), [14 §7](14-Dateihandling.md), [30 §2.2/§2.3](30-NFR-und-Persistenz.md), [21 §2/§3](21-UI-UX.md) | `datei:ui/views/settings/SettingsView.svelte` | gebaut |
| BL-256 | S | feature | kür | **Medien-Klassifikation + Weblink-Auflösung** → [ADR-v9-187](04-Entscheidungslog.md#adr-v9-187) | [20 §1.4](20-Funktionen.md), [21 §10n](21-UI-UX.md) | `sym:classifyMediaFile` | gebaut |
| BL-249 | K | defekt | usp | **Vorne offene Zugehörigkeit fehlt in der Verwaltungsgeschichte** → [ADR-v9-181](04-Entscheidungslog.md#adr-v9-181) | [11 §1/§4.2](11-Orte-Hoefe-Identitaet.md), [20 §1.7](20-Funktionen.md) | `sym:hierarchySpanLabel` | gebaut |
| BL-250 | K | defekt | basis | **Die Trefferliste des Pickers verschwindet vor dem Klick** → [ADR-v9-182](04-Entscheidungslog.md#adr-v9-182) · [ADR-v9-40](04-Entscheidungslog.md#adr-v9-40) | [21 §6k](21-UI-UX.md), [32](32-Testframework.md) | `txt:haltFokusImFeld@ui/shell/Picker.svelte` | gebaut |
| BL-251 | K | defekt | usp | **Namensvarianten: Gültigkeit sichtbar, bestehende Einträge änderbar** → [ADR-v9-183](04-Entscheidungslog.md#adr-v9-183) · [ADR-v9-81](04-Entscheidungslog.md#adr-v9-81) | [11 §1](11-Orte-Hoefe-Identitaet.md), [20 §1.7](20-Funktionen.md), [21 §2](21-UI-UX.md) | `sym:withUpdatedPname` | gebaut |
| BL-252 | K | defekt | usp | **Zuordnungs-Zeiträume änderbar** → [ADR-v9-183](04-Entscheidungslog.md#adr-v9-183) · [ADR-v9-75](04-Entscheidungslog.md#adr-v9-75) | [11 §1/§4.2](11-Orte-Hoefe-Identitaet.md), [20 §1.7](20-Funktionen.md) | `sym:withUpdatedEnclosedBy` | gebaut |
| BL-253 | K | defekt | basis | **Werkzeug-Overlays blieben unerreichbar, sobald etwas ausgewählt war** → [ADR-v9-184](04-Entscheidungslog.md#adr-v9-184) | [21 §3/§6h](21-UI-UX.md), [11 §6/§9.2](11-Orte-Hoefe-Identitaet.md) | `test:tests/ui/EntityTab.tools-with-selection.component.test.ts` | gebaut |
| BL-254 | K | defekt | basis | **Der Fokus-Schutz des Pickers deckte nur die Zeilen ab** → [ADR-v9-185](04-Entscheidungslog.md#adr-v9-185) | [21 §6k](21-UI-UX.md) | `txt:onmousedown={haltFokusImFeld}@ui/shell/Picker.svelte` | gebaut |
| BL-255 | K | defekt | usp | **Die Hof-Review zeigte einen Befund, den die UI nicht auflösen konnte** → [ADR-v9-186](04-Entscheidungslog.md#adr-v9-186) | [11 §4.3/§6](11-Orte-Hoefe-Identitaet.md), [20 §1.8](20-Funktionen.md) | `txt:hadAddrOnOpen@ui/shell/EventEditModal.svelte` | gebaut |
| BL-217 | S | feature | basis | **Quellen-`SOUR.DATA` als Interop-Projektion** → [ADR-v9-151](04-Entscheidungslog.md#adr-v9-151) · [ADR-v9-178](04-Entscheidungslog.md#adr-v9-178) | [20 §1.6](20-Funktionen.md), [13 §1/§6](13-Interop-Roundtrip.md), [10 §4](10-Domaenenmodell.md) | `test:tests/roundtrip/source-data-roundtrip.test.ts` | gebaut |
| BL-243 | — | defekt | basis | **Das Quellen-Datum hing am falschen Tag** → [ADR-v9-179](04-Entscheidungslog.md#adr-v9-179) | [20 §1.6/§2](20-Funktionen.md), [10 §4](10-Domaenenmodell.md), [13 §1](13-Interop-Roundtrip.md) | `test:tests/roundtrip/source-created-date.test.ts` | gebaut |
| BL-244 | — | defekt | basis | **Externe Referenzen reisen nach GRAMPS als `<srcattribute type="REFN">`** → [ADR-v9-180](04-Entscheidungslog.md#adr-v9-180) | [13 §1/§6](13-Interop-Roundtrip.md) | `test:tests/roundtrip/gramps-source-attributes.test.ts` | gebaut |
| BL-245 | — | defekt | basis | **Signatur und Signatur-Medium am `<reporef>`** → [ADR-v9-180](04-Entscheidungslog.md#adr-v9-180) · [ADR-v9-175](04-Entscheidungslog.md#adr-v9-175) | [13 §1/§6](13-Interop-Roundtrip.md) | `test:tests/roundtrip/gramps-reporef-callno.test.ts` | gebaut |
| BL-246 | — | hygiene | basis | **Wächter über die Messgrundlage** → [ADR-v9-178](04-Entscheidungslog.md#adr-v9-178) · [ADR-v9-91](04-Entscheidungslog.md#adr-v9-91) | [32 TST-21](32-Testframework.md) | `test:tests/core/realdaten-basis.test.ts` | gebaut |
| BL-07 | K | feature | basis | **History-Navigation** → [ADR-v9-177](04-Entscheidungslog.md#adr-v9-177) | [20 §1.1](20-Funktionen.md), [21 §2](21-UI-UX.md) | `sym:createNavHistory` | gebaut |
| BL-238 | — | defekt | basis | **Projekt-Scope prüft seine Referenzen nicht** → [ADR-v9-176](04-Entscheidungslog.md#adr-v9-176) | [30 §2.2](30-NFR-und-Persistenz.md), [12 §5](12-Forschungsdaten.md) | `sym:resolveScopePersonRef` | gebaut |
| BL-239 | — | feature | kür | **Mitnahme der Projekte** → [ADR-v9-176](04-Entscheidungslog.md#adr-v9-176) · [ADR-v9-117](04-Entscheidungslog.md#adr-v9-117) | [30 §2.2/§2.3](30-NFR-und-Persistenz.md), [12 §5](12-Forschungsdaten.md) | `sym:AppDataProjectsStore` | gebaut |
| BL-242 | — | defekt | kür | **GED7-`SCHMA`-Block** → [04a](04a-Chronik.md#bl-242) | [13 §4](13-Interop-Roundtrip.md) | `sym:g7Schma` | gebaut |
| BL-229 | — | feature | kür | **Regel `EVIDENCE_CONFLICT`** → [ADR-v9-165](04-Entscheidungslog.md#adr-v9-165) | [20 §3](20-Funktionen.md), [12 §3](12-Forschungsdaten.md) | `txt:EVIDENCE_CONFLICT@core/validate/rules.ts` | gebaut |
| BL-128 | — | feature | kür | **Quellen-Vorlagen** → [ADR-v9-151](04-Entscheidungslog.md#adr-v9-151) | [20 §1.6](20-Funktionen.md) | `sym:SOURCE_TEMPLATES` | gebaut |
| BL-231 | — | feature | kür | **Ast-Reifegrad im Qualitäts-Dashboard** → [ADR-v9-167](04-Entscheidungslog.md#adr-v9-167) | [20 §1.11g](20-Funktionen.md), [12 §5](12-Forschungsdaten.md) | `sym:ancestorBranches` | gebaut |
| BL-228 | — | feature | kür | **Forschungsschritt-Vorschlag** → [ADR-v9-165](04-Entscheidungslog.md#adr-v9-165) | [20 §3](20-Funktionen.md), [12 §1](12-Forschungsdaten.md) | `sym:suggestResearchStep` | gebaut |
| BL-57 | — | feature | basis | **Evidenz-Bewertung als Aufklapper an der Zitat-Zeile** → [ADR-v9-98](04-Entscheidungslog.md#adr-v9-98) | [12 §3](12-Forschungsdaten.md), [20 §1.11c](20-Funktionen.md) | `!txt:TODO@ui/shell/SourceCitationRow.svelte` | gebaut |
| BL-83 | — | feature | kür | **`_EVAL`-Wire-Format, GEDCOM und GRAMPS** → [ADR-v9-175](04-Entscheidungslog.md#adr-v9-175) | [12 §3](12-Forschungsdaten.md), [13 §2.3](13-Interop-Roundtrip.md) | `test:tests/roundtrip/eval-roundtrip.test.ts` | gebaut |
| BL-241 | — | defekt | kür | **GED7-Export schrieb Freitext in ein Enum-Feld** → [04a](04a-Chronik.md#bl-241) | [13 §3](13-Interop-Roundtrip.md), [10 §2](10-Domaenenmodell.md) | `sym:ged7Role` | gebaut |
| BL-180 | — | feature | kür | **B1-Sync-Bündel `app-data.json`** → [ADR-v9-134](04-Entscheidungslog.md#adr-v9-134) · [ADR-v9-173](04-Entscheidungslog.md#adr-v9-173) | [30 §2.2/§2.3](30-NFR-und-Persistenz.md), [14 §6](14-Dateihandling.md), [ADR-v9-173](04-Entscheidungslog.md#adr-v9-173) | `sym:AppDataSyncService` | gebaut |
| BL-240 | — | feature | basis | **Dublettenausschluss als abgelehnte Identitäts-Hypothese** → [ADR-v9-174](04-Entscheidungslog.md#adr-v9-174) | [12 §4](12-Forschungsdaten.md), [20 §1.12](20-Funktionen.md), [13 §2.3](13-Interop-Roundtrip.md) | `sym:isIdentityExclusion` | gebaut |
| BL-237 | S | hygiene | basis | **Technische Kennung nicht mehr in der Oberfläche** → [ADR-v9-172](04-Entscheidungslog.md#adr-v9-172) | [11 §1](11-Orte-Hoefe-Identitaet.md), [20 §1.8](20-Funktionen.md), [ADR-v9-172](04-Entscheidungslog.md#adr-v9-172) | `sym:hofHeading` | gebaut |
| BL-236 | S | feature | usp | **Dorf eines Hofes änderbar** → [ADR-v9-172](04-Entscheidungslog.md#adr-v9-172) | [11 §9.4](11-Orte-Hoefe-Identitaet.md), [20 §1.8](20-Funktionen.md), [ADR-v9-172](04-Entscheidungslog.md#adr-v9-172) | `sym:moveHofToVillage` | gebaut |
| BL-235 | K | defekt | basis | **Formfaktor-Zustand meldet sich selbst an** → [ADR-v9-171](04-Entscheidungslog.md#adr-v9-171) | [21 §3](21-UI-UX.md), [22 §6](22-Orte-Editor-Standalone.md), [ADR-v9-171](04-Entscheidungslog.md#adr-v9-171) | `test:tests/ui/layout-ohne-start.component.test.ts` | gebaut |
| BL-222 | K | hygiene | blockiert | **`npm run build`, `npm run dev:orte` und `check:csp` erfassen BEIDE Programme** | [22 §2](22-Orte-Editor-Standalone.md), [31 §3](31-Dev-Umgebung.md) | `txt:dev:orte@package.json` | gebaut |
| BL-223 | S | feature | basis | **`applyPlaceResolution` bekommt die Option, den Village-Seed zu überspringen** | [22 §5](22-Orte-Editor-Standalone.md), [11 §4.2](11-Orte-Hoefe-Identitaet.md) | `txt:opts\.seed@services/places/apply-resolution.ts` | gebaut |
| BL-224 | S | feature | basis | **Handbuch: Anhang E und der Extraktor für das Editor-Handbuch** → [04a](04a-Chronik.md#bl-224) | [22 §8](22-Orte-Editor-Standalone.md) | `datei:tools/handbuch/orte-handbuch.manifest.json` | gebaut |
| BL-225 | S | hygiene | basis | **Handbuch-Automatisierung kennt den Editor** | [22 §8](22-Orte-Editor-Standalone.md) | `txt:app-orte@tools/handbuch/changes.mjs` | gebaut |
| BL-226 | S | hygiene | basis | **Eigener Aufnahmepfad für die Editor-Screenshots** → [04a](04a-Chronik.md#bl-226) | [22 §8](22-Orte-Editor-Standalone.md) | `datei:tools/handbuch/capture-orte.mjs` | gebaut |
| BL-220 | K | feature | blockiert | **`PlacesHost`-Vertrag** | [22 §3](22-Orte-Editor-Standalone.md), [02 §3](02-Zielarchitektur-v9.md) | `sym:PlacesHost` | gebaut |
| BL-221 | K | hygiene | blockiert | **Zwei Gates gegen den Rückfall in den Monolithen** | [22 §3](22-Orte-Editor-Standalone.md), [31 §3](31-Dev-Umgebung.md) | `txt:app-orte@tests/arch-boundary/check-arch-boundary.mjs` | gebaut |
| BL-66 | — | hygiene | kür | **a11y-Scanner** → [ADR-v9-170](04-Entscheidungslog.md#adr-v9-170) | [32 §3/TST-15](32-Testframework.md) | `txt:axe-core@package.json` | gebaut |
| BL-218 | K | fix | basis | **Trefferflächen-Kontrakt + Undo/Redo-Knöpfe** → [ADR-v9-155](04-Entscheidungslog.md#adr-v9-155) · [ADR-v9-150](04-Entscheidungslog.md#adr-v9-150) | [21 §6i/§6j](21-UI-UX.md), [20 §1.2](20-Funktionen.md) | `txt:--stb-touch-target@ui/shell/design-system.css` | gebaut |
| BL-60 | S | feature | kür | **Personen-Kontext-Sprung in die Karte** → [04a](04a-Chronik.md#bl-60) | [20 §1.9](20-Funktionen.md), [21 §4/§6h](21-UI-UX.md), [ADR-v9-153](04-Entscheidungslog.md#adr-v9-153) | `sym:focusPersonInLens` | gebaut |
| BL-210 | S | feature | kür | **Karte: Marker-Klick → Orts-Explorationspanel** → [ADR-v9-150](04-Entscheidungslog.md#adr-v9-150) | [20 §1.9](20-Funktionen.md), [ADR-v9-154](04-Entscheidungslog.md#adr-v9-154) | `sym:buildMapExplore` | gebaut |
| BL-131 | S | feature | kür | **GOV-Import (historisch datiert)** → [ADR-v9-148](04-Entscheidungslog.md#adr-v9-148) · [ADR-v9-144](04-Entscheidungslog.md#adr-v9-144) | [20 §1.7](20-Funktionen.md), [11 §1](11-Orte-Hoefe-Identitaet.md), [ADR-v9-154](04-Entscheidungslog.md#adr-v9-154) | `sym:parseGovText` | gebaut |
| BL-89 | — | hygiene | kür | **Skalen-Gate deckt die Orts-Kandidatenbreite ab** → [ADR-v9-88](04-Entscheidungslog.md#adr-v9-88) | [32 §2](32-Testframework.md), [30 §1](30-NFR-und-Persistenz.md), [11 §4.2](11-Orte-Hoefe-Identitaet.md), [ADR-v9-154](04-Entscheidungslog.md#adr-v9-154) | `txt:MIN_DISTINCT_PLACES@tests/perf/scale.perf.test.ts` | gebaut |
| BL-201 | S | feature | kür | **Quellen-Detail: Signatur-Medium + externe Referenz-Nummern.** → [ADR-v9-151](04-Entscheidungslog.md#adr-v9-151) | [20 §1.6](20-Funktionen.md) | `txt:externalRefs@ui/views/source/SourceDetail.svelte` | gebaut |
| BL-203 | S | feature | kür | **Archivtyp deutsch über EINE Quelle** → [ADR-v9-149](04-Entscheidungslog.md#adr-v9-149) · [ADR-v9-152](04-Entscheidungslog.md#adr-v9-152) | [20 §1.6/§1.7](20-Funktionen.md) | `sym:REPO_TYPE_LABELS` | gebaut |
| BL-195 | K | feature | kür | **Personenlisten-Zeilenmarker** | [20 §1.4](20-Funktionen.md) | `txt:[Kk]ekule@ui/views/person/person-list-model.ts` | gebaut |
| BL-196 | S | feature | kür | **Alter-bei-Ereignis** | [20 §1.4](20-Funktionen.md) | `sym:ageAtEvent` | gebaut |
| BL-197 | S | feature | kür | **`datePhrase`** | [20 §1.4](20-Funktionen.md) | `txt:datePhrase@ui/shell/EventLine.svelte` | gebaut |
| BL-198 | K | feature | kür | **Personen-Detailkopf** | [20 §1.4](20-Funktionen.md), [21 §6b](21-UI-UX.md) | `txt:nick@ui/views/person/PersonDetailHeader.svelte` | gebaut |
| BL-199 | S | feature | kür | **Kind-Verhältnis `pedigree`** | [20 §1.5](20-Funktionen.md), [10 §2](10-Domaenenmodell.md) | `txt:pedigree@ui/views/family/FamilyChildrenSection.svelte` | gebaut |
| BL-200 | S | feature | kür | **Medien-📎-Marker in der Quellenliste** | [20 §1.6](20-Funktionen.md) | `txt:hasMedia@ui/views/source/source-list-model.ts` | gebaut |
| BL-202 | S | feature | kür | **Archiv-🏛-Badge in der Quellenliste** | [20 §1.6](20-Funktionen.md) | `txt:repoName@ui/views/source/source-list-model.ts` | gebaut |
| BL-204 | K | feature | kür | **Orts-Liste: Personen-Zähler** | [20 §1.7](20-Funktionen.md) | `txt:personCount@ui/views/place/place-list-model.ts` | gebaut |
| BL-205 | K | feature | kür | **Hof-Liste: Bewohner-/Eigentümer-Zähler + Jahres-Spanne + Notiz-📝** | [20 §1.8](20-Funktionen.md) | `sym:countHofOccupancy` | gebaut |
| BL-206 | S | feature | kür | **Achtungs-Punkt am „Werkzeuge"-Trigger von Orte/Höfe** → [04a](04a-Chronik.md#bl-206) | [20 §1.7/§1.8](20-Funktionen.md), [21 §6h/§10c](21-UI-UX.md) | `txt:stb-filterbar__dot@ui/shell/FilterBar.svelte` | gebaut |
| BL-211 | S | feature | kür | **Geschlechts-Icon in den globalen Suchergebnissen** | [20 §1.1](20-Funktionen.md) | `txt:sex@ui/views/search/GlobalSearchView.svelte` | gebaut |
| BL-09 | K | feature | kür | **Mini-Karte im Ort-Steckbrief** → [ADR-v9-145](04-Entscheidungslog.md#adr-v9-145) | [20 §1.7](20-Funktionen.md) | `datei:ui/views/place/PlaceMiniMap.svelte` | gebaut |
| BL-59 | S | feature | kür | **Ortsübersetzungen** → [ADR-v9-144](04-Entscheidungslog.md#adr-v9-144) | [11 §1](11-Orte-Hoefe-Identitaet.md) | `txt:translations\s*:@core/places/types.ts` | gebaut |
| BL-214 | S | feature | usp | **Mini-Karte: Kontext-Ausschnitt + zweigeteilte Grundkarte** → [ADR-v9-147](04-Entscheidungslog.md#adr-v9-147) | [20 §1.7](20-Funktionen.md), [11 §4](11-Orte-Hoefe-Identitaet.md), [ADR-v9-147](04-Entscheidungslog.md#adr-v9-147) | `sym:fitMiniMapBounds` | gebaut |
| BL-215 | S | fix | kür | **Ortstyp deutsch + „ohne Zusatzangaben“ als Filter statt Zeilen-Pille** → [ADR-v9-149](04-Entscheidungslog.md#adr-v9-149) · [ADR-v9-77](04-Entscheidungslog.md#adr-v9-77) | [21 §9 B7/§10l](21-UI-UX.md), [20 §1.7/§1.8](20-Funktionen.md), [11 §9.1](11-Orte-Hoefe-Identitaet.md), [ADR-v9-149](04-Entscheidungslog.md#adr-v9-149) | `sym:placeTypeLabel` | gebaut |
| BL-216 | S | fix | kür | **Mini-Karte: Regional-Zoom auf das gemessene Maß + die Karte selbst als Sprung zur Karte-Lens** → [ADR-v9-150](04-Entscheidungslog.md#adr-v9-150) · [ADR-v9-147](04-Entscheidungslog.md#adr-v9-147) | [20 §1.7/§1.8](20-Funktionen.md), [21 §7](21-UI-UX.md), [ADR-v9-150](04-Entscheidungslog.md#adr-v9-150) | `sym:focusOnMap` | gebaut |
| BL-212 | E | feature | kür | **Ereignis-Eingabekomfort, v9-Form** → [ADR-v9-156](04-Entscheidungslog.md#adr-v9-156) | [20 §1.4](20-Funktionen.md) | `sym:birthDateFromDeathAge` | gebaut |
| BL-127 | S | feature | kür | **Assoziationen-UI** | [20 §1.4](20-Funktionen.md), [10 §2](10-Domaenenmodell.md) | `txt:associations@ui/views/person/person-detail-model.ts` | gebaut |
| BL-125 | S | feature | kür | **CSV-Export der gefilterten Personen- UND Familienliste** | [20 §1.4/§1.5](20-Funktionen.md) | `sym:toCsv` | gebaut |
| BL-10 | K | feature | kür | **Soundex-Modus in der Personensuche** | [20 §1.4](20-Funktionen.md) | `sym:germanSoundex` | gebaut |
| BL-208 | S | feature | kür | **Forschungs-Signal vollständig** → [ADR-v9-157](04-Entscheidungslog.md#adr-v9-157) | [20 §1.11b/d](20-Funktionen.md) | `txt:log-view__row--pending@ui/views/research-log/LogView.svelte` | gebaut |
| BL-209 | S | feature | kür | **⚡ **Forschungsprojekte** → [ADR-v9-158](04-Entscheidungslog.md#adr-v9-158) · [ADR-v9-173](04-Entscheidungslog.md#adr-v9-173) | [20 §1.11f](20-Funktionen.md) | `txt:--stb-proj-1@ui/shell/design-system.css` | gebaut |
| BL-219 | E | feature | kür | **Statistik-Balken beziffern sich selbst** → [ADR-v9-157](04-Entscheidungslog.md#adr-v9-157) | [20 §1.13](20-Funktionen.md) | `txt:stats-caption@ui/views/stats/StatisticsView.svelte` | gebaut |
| BL-132 | S | feature | kür | **Geo-Plausibilitäts-Validator** → [ADR-v9-96](04-Entscheidungslog.md#adr-v9-96) · [ADR-v9-143](04-Entscheidungslog.md#adr-v9-143) | [20 §1.7](20-Funktionen.md), [20 §3](20-Funktionen.md), [ADR-v9-143](04-Entscheidungslog.md#adr-v9-143) | `txt:GEO_BBOX@core/validate/rules.ts` | gebaut |
| BL-130 | S | feature | kür | **Nominatim-Geocoding (Einzel + Batch)** → [04a](04a-Chronik.md#bl-130) | [20 §1.7](20-Funktionen.md), [30 §NFR-3](30-NFR-und-Persistenz.md) | `sym:geocodePlace` | gebaut |
| BL-191 | S | feature | kür | **Apple-Maps-Koordinateneingabe** | [20 §1.7](20-Funktionen.md) | `sym:parseCoordPair` | gebaut |
| BL-192 | S | feature | kür | **Geo-Befunde im Qualitäts-Dashboard sichtbar** | [20 §1.7](20-Funktionen.md), [20 §3](20-Funktionen.md) | `txt:GeoFindingsTile@ui/views/quality/QualityDashboard.svelte` | gebaut |
| BL-193 | — | defekt | basis | **`hofsWithResidence` las rohes `ev.hofId` statt des `eventHofId`-Chokepoints** | [20 §3](20-Funktionen.md), [11 §5](11-Orte-Hoefe-Identitaet.md) | `txt:eventHofId@core/validate/context.ts` | gebaut |
| BL-194 | — | defekt | basis | **OCCU (Arbeitsstätte) band einen Phantom-Hof** → [ADR-v9-143](04-Entscheidungslog.md#adr-v9-143) | [11 §4.2](11-Orte-Hoefe-Identitaet.md), [ADR-v9-143](04-Entscheidungslog.md#adr-v9-143) | `!txt:'OCCU'@core/places/resolve.ts` | gebaut |
| BL-183 | E | feature | kür | **Story-Satz-Templates + Merge-Sätze** | [20 §1.10](20-Funktionen.md) | `test:tests/ui/story-templates.test.ts` | gebaut |
| BL-184 | E | feature | kür | **Story-Epochen-Kontext** | [20 §1.10](20-Funktionen.md) | `test:tests/ui/story-epochs.test.ts` | gebaut |
| BL-185 | E | feature | kür | **Story-Orts-Kontextsätze** | [20 §1.10](20-Funktionen.md), [11 §4](11-Orte-Hoefe-Identitaet.md) | `sym:buildPlaceContextSentence` | gebaut |
| BL-133 | E | feature | kür | **Story-Lens-Grundgerüst + **Personen-Biografie**** → [ADR-v9-140](04-Entscheidungslog.md#adr-v9-140) | [20 §1.10](20-Funktionen.md), [21 §4](21-UI-UX.md) | `datei:ui/views/story/StoryLensView.svelte` | gebaut |
| BL-186 | E | feature | kür | **Story: Familien-Biografie** → [04a](04a-Chronik.md#bl-186) | [20 §1.10](20-Funktionen.md), [21 §4](21-UI-UX.md) | `sym:buildFamilyStory` | gebaut |
| BL-187 | E | feature | kür | **Story-Karte: Lebensweg-Polylinie** → [04a](04a-Chronik.md#bl-187) | [20 §1.10](20-Funktionen.md), [20 §1.9](20-Funktionen.md) | `sym:buildStoryMapSvg` | gebaut |
| BL-188 | E | feature | kür | **Story: Inline-SVG-Diagramm** → [04a](04a-Chronik.md#bl-188) | [20 §1.10](20-Funktionen.md) | `datei:ui/islands/story/story-diagram.ts` | gebaut |
| BL-189 | E | feature | kür | **Story: eingebettete Fotos** → [04a](04a-Chronik.md#bl-189) | [20 §1.10](20-Funktionen.md), [20 §1.5](20-Funktionen.md) | `sym:collectStoryMedia` | gebaut |
| BL-190 | E | feature | kür | **Story-Download** → [ADR-v9-138](04-Entscheidungslog.md#adr-v9-138) | [20 §1.10](20-Funktionen.md), [20 §4](20-Funktionen.md) | `sym:buildStoryHtml` | gebaut |
| BL-176 | E | feature | kür | **Report #7 **Familienbuch**** → [ADR-v9-142](04-Entscheidungslog.md#adr-v9-142) | [20 §4](20-Funktionen.md) | `sym:buildFamilyBook` | gebaut |
| BL-177 | E | feature | kür | **Report #11 **Ortssippenbuch**** → [ADR-v9-142](04-Entscheidungslog.md#adr-v9-142) | [20 §4](20-Funktionen.md), [11 §4](11-Orte-Hoefe-Identitaet.md) | `sym:buildLocalFamilyBook` | gebaut |
| BL-178 | E | feature | kür | **Report #12 **Hofchronik**** → [ADR-v9-142](04-Entscheidungslog.md#adr-v9-142) | [20 §4](20-Funktionen.md), [11 §7](11-Orte-Hoefe-Identitaet.md) | `sym:buildFarmChronicle` | gebaut |
| BL-179 | E | feature | kür | **Report #13 **Ortsbuch**** → [ADR-v9-142](04-Entscheidungslog.md#adr-v9-142) | [20 §4](20-Funktionen.md), [11 §1](11-Orte-Hoefe-Identitaet.md) | `sym:buildPlaceGazetteer` | gebaut |
| BL-126 | S | feature | kür | **Medien-Verwaltung — ABGESCHLOSSEN** → [ADR-v9-132](04-Entscheidungslog.md#adr-v9-132) · [ADR-v9-133](04-Entscheidungslog.md#adr-v9-133) | [20 §1.4/§1.5](20-Funktionen.md), [10 §4](10-Domaenenmodell.md), [ADR-v9-132](04-Entscheidungslog.md#adr-v9-132) | `datei:ui/views/media/MediaGallery.svelte` | gebaut |
| BL-181 | S | feature | kür | **Medien-Vorschau** → [ADR-v9-136](04-Entscheidungslog.md#adr-v9-136) · [ADR-v9-187](04-Entscheidungslog.md#adr-v9-187) | [20 §1.4](20-Funktionen.md), [13 §4](13-Interop-Roundtrip.md), [ADR-v9-136](04-Entscheidungslog.md#adr-v9-136) | `sym:isEmbeddedImage` | gebaut |
| BL-182 | S | feature | kür | **Hilfelink zum Handbuch** → [ADR-v9-137](04-Entscheidungslog.md#adr-v9-137) | [21 §2/§3](21-UI-UX.md), [30](30-NFR-und-Persistenz.md), [ADR-v9-137](04-Entscheidungslog.md#adr-v9-137) | `txt:handbuchUrl@ui/shell/Sidebar.svelte` | gebaut |
| BL-154 | E | feature | kür | **Cross-Family-Emission (Epic) — ABGESCHLOSSEN** → [04a](04a-Chronik.md#bl-154) | [14 §5](14-Dateihandling.md), [13 §1 RT-4](13-Interop-Roundtrip.md), [ADR-v9-127](04-Entscheidungslog.md#adr-v9-127) | `sym:buildGrampsTreeFromModel` | gebaut |
| BL-160 | S | feature | kür | **Cross-Family** → [ADR-v9-127](04-Entscheidungslog.md#adr-v9-127) · [ADR-v9-113](04-Entscheidungslog.md#adr-v9-113) | [14 §3.2](14-Dateihandling.md), [20 §1.2](20-Funktionen.md), [ADR-v9-127](04-Entscheidungslog.md#adr-v9-127) | `sym:exportCrossFamily` | gebaut |
| BL-159 | S | test | kür | **Cross-Family** → [ADR-v9-127](04-Entscheidungslog.md#adr-v9-127) | [13 §1.1](13-Interop-Roundtrip.md), [ADR-v9-127](04-Entscheidungslog.md#adr-v9-127) | `test:tests/roundtrip/cross-family.test.ts` | gebaut |
| BL-157 | S | feature | kür | **Cross-Family** → [ADR-v9-127](04-Entscheidungslog.md#adr-v9-127) | [13 §3](13-Interop-Roundtrip.md), [ADR-v9-127](04-Entscheidungslog.md#adr-v9-127) | `sym:buildGedcomTreeFromModel` | gebaut |
| BL-158 | S | feature | kür | **Cross-Family** → [ADR-v9-127](04-Entscheidungslog.md#adr-v9-127) · [ADR-v9-113](04-Entscheidungslog.md#adr-v9-113) | [13 §6](13-Interop-Roundtrip.md), [ADR-v9-127](04-Entscheidungslog.md#adr-v9-127) | `sym:buildGrampsTreeFromModel` | gebaut |
| BL-163 | S | hygiene | kür | **Coverage-Nenner um die volle GEDCOM-**7.0**-Enumeration ergänzt** → [ADR-v9-124](04-Entscheidungslog.md#adr-v9-124) | [13 §1.1](13-Interop-Roundtrip.md), [ADR-v9-127](04-Entscheidungslog.md#adr-v9-127) | `txt:GEDCOM_70_TAGS@tests/core/spec-universe.ts` | gebaut |
| BL-165 | S | feature | kür | **Dedup verlustfrei auf Passthrough-Ebene, **Phase 2** → [ADR-v9-129](04-Entscheidungslog.md#adr-v9-129) | [13 §2.4](13-Interop-Roundtrip.md), [ADR-v9-129](04-Entscheidungslog.md#adr-v9-129) | `test:tests/roundtrip/merge-passthrough-gramps.test.ts` | gebaut |
| BL-164 | S | feature | kür | **Dedup verlustfrei auf der **Passthrough-Ebene**, **Phase 1** → [ADR-v9-129](04-Entscheidungslog.md#adr-v9-129) | [13 §2.4](13-Interop-Roundtrip.md), [20 §1.12](20-Funktionen.md), [ADR-v9-129](04-Entscheidungslog.md#adr-v9-129) | `test:tests/roundtrip/merge-passthrough.test.ts` | gebaut |
| BL-162 | S | hygiene | kür | **Coverage-Audit-**Nenner** gegen die öffentliche Spec** → [ADR-v9-124](04-Entscheidungslog.md#adr-v9-124) | [13 §1.1](13-Interop-Roundtrip.md), [ADR-v9-127](04-Entscheidungslog.md#adr-v9-127), [ADR-v9-124](04-Entscheidungslog.md#adr-v9-124) | `test:tests/core/coverage-spec.test.ts` | gebaut |
| BL-156 | S | feature | kür | **Cross-Family** → [ADR-v9-127](04-Entscheidungslog.md#adr-v9-127) | [ADR-v9-127](04-Entscheidungslog.md#adr-v9-127), [ADR-v9-11](04-Entscheidungslog.md#adr-v9-11) | `sym:remapIdsForFormat` | gebaut |
| BL-155 | S | feature | kür | **Cross-Family** → [ADR-v9-127](04-Entscheidungslog.md#adr-v9-127) | [13 §1.1](13-Interop-Roundtrip.md), [ADR-v9-127](04-Entscheidungslog.md#adr-v9-127) | `sym:modelEquiv` | gebaut |
| BL-161 | — | hygiene | kür | **04↔04a-Split strukturell erzwingen** → [04a](04a-Chronik.md#bl-161) | [04a-Chronik.md](04a-Chronik.md) | `txt:check-adr-split@.claude/skills/spec-lint/SKILL.md` | gebaut |
| BL-153 | S | feature | kür | **Input-Kanonisierung `Media.form`→MIME** → [ADR-v9-126](04-Entscheidungslog.md#adr-v9-126) | [13 §4](13-Interop-Roundtrip.md), [ADR-v9-126](04-Entscheidungslog.md#adr-v9-126) | `test:tests/core/media-form-canonical.test.ts` | gebaut |
| BL-145 | K | feature | basis | **Kern-Kaskaden zum referenz-auflösenden Löschen der vier Modell-Entitäten** → [ADR-v9-115](04-Entscheidungslog.md#adr-v9-115) | [20 §1.4](20-Funktionen.md), [10 §6](10-Domaenenmodell.md), [ADR-v9-115](04-Entscheidungslog.md#adr-v9-115) | `sym:deletePersonCascade` | gebaut |
| BL-146 | K | feature | basis | **AppState-Lösch-Kommandos auf die Kaskaden umgestellt** → [ADR-v9-115](04-Entscheidungslog.md#adr-v9-115) | [20 §1.4](20-Funktionen.md), [ADR-v9-115](04-Entscheidungslog.md#adr-v9-115) | `txt:deletePersonCascade as deletePersonCmd@ui/shell/app-state.svelte.ts` | gebaut |
| BL-147 | K | feature | basis | **Lösch-Affordanz in den vier Detail-Views** → [ADR-v9-115](04-Entscheidungslog.md#adr-v9-115) | [20 §1.4–1.6](20-Funktionen.md), [ADR-v9-115](04-Entscheidungslog.md#adr-v9-115) | `datei:ui/shell/DeleteEntityButton.svelte` | gebaut |
| BL-148 | K | test | basis | **Kaskaden-Tests** → [ADR-v9-115](04-Entscheidungslog.md#adr-v9-115) | [32](32-Testframework.md), [ADR-v9-115](04-Entscheidungslog.md#adr-v9-115) | `test:tests/core/delete-cascade.test.ts` | gebaut |
| BL-149 | K | feature | basis | **Forschung als eigene Sidebar-Kategorie** → [ADR-v9-116](04-Entscheidungslog.md#adr-v9-116) | [21 §1/§3](21-UI-UX.md), [ADR-v9-116](04-Entscheidungslog.md#adr-v9-116) | `sym:isResearchTarget` | gebaut |
| BL-150 | S | feature | kür | **Dashboard an erster Stelle der Forschungs-Fläche** → [ADR-v9-116](04-Entscheidungslog.md#adr-v9-116) | [21 §2/§3](21-UI-UX.md), [ADR-v9-116](04-Entscheidungslog.md#adr-v9-116) | `txt:Reihenfolge ≠ Default@ui/views/ResearchTab.svelte` | gebaut |
| BL-135 | S | feature | kür | **„teilweise" als vierter `LogResult`-Wert** → [04a](04a-Chronik.md#bl-135) | [20 §1.11b](20-Funktionen.md), [12 §2](12-Forschungsdaten.md) | `txt:partial@core/research/types.ts` | gebaut |
| BL-109 | S | feature | kür | **Person-Disambiguierung** | [21 §6c](21-UI-UX.md), [20 §1.11](20-Funktionen.md) | `txt:yearPlaceSummary@ui/views/tasks/tasks-model.ts` | gebaut |
| BL-65 | S | feature | kür | **UI-Kurzweg „aus Aufgabe → Protokoll"** | [20 §1.11b](20-Funktionen.md), [12 §2](12-Forschungsdaten.md) | `sym:linkLogToTask` | gebaut |
| BL-56 | S | feature | kür | **Research-Timeline-Umschalter** | [12 §2](12-Forschungsdaten.md), [20 §1.11b](20-Funktionen.md) | `sym:buildResearchTimeline` | gebaut |
| BL-61 | S | feature | kür | **Beweisführungsnotiz** | [20 §1.11e](20-Funktionen.md), [12 §3/§4](12-Forschungsdaten.md) | `sym:buildProofSummary` | gebaut |
| BL-58 | S | feature | kür | **Forschungsprojekte: Scope, Persistenz, Chip-Selektor** → [04a](04a-Chronik.md#bl-58) | [12 §5](12-Forschungsdaten.md), [20 §1.11f](20-Funktionen.md), [30 §2.2](30-NFR-und-Persistenz.md) | `sym:matchesScope` | gebaut |
| BL-71 | S | feature | kür | **`addr`/`note`-Duplikat** → [ADR-v9-53](04-Entscheidungslog.md#adr-v9-53) | [21 §10k](21-UI-UX.md), [ADR-v9-53](04-Entscheidungslog.md) | `sym:dedupeAddrNote` | gebaut |
| BL-70 | S | feature | kür | **Eigene-Seite-Redundanz unterdrückt** → [ADR-v9-78](04-Entscheidungslog.md#adr-v9-78) | [21 §10h](21-UI-UX.md), [ADR-v9-80](04-Entscheidungslog.md) | `txt:chain-seg--self@ui/views/place/PlaceDetail.svelte` | gebaut |
| BL-69 | S | feature | kür | **Prosa → Label+Disclosure** → [ADR-v9-75](04-Entscheidungslog.md#adr-v9-75) | [21 §10g](21-UI-UX.md), [ADR-v9-52](04-Entscheidungslog.md) | `txt:place-detail__info-icon@ui/views/place/PlaceDetail.svelte` | gebaut |
| BL-68 | S | feature | kür | **Leerzustand-Suppression generalisiert (§10f)** → [04a](04a-Chronik.md#bl-68) | [21 §10f](21-UI-UX.md), [20 §2](20-Funktionen.md) | `txt:otherEvents.length > 0@ui/views/family/FamilyDetail.svelte` | gebaut |
| BL-67 | S | feature | kür | **List-Toolbar-Ownership** → [04a](04a-Chronik.md#bl-67) | [21 §10c](21-UI-UX.md), [ADR-v9-52](04-Entscheidungslog.md) | `txt:onOpenDedup@ui/views/place/PlaceList.svelte,ui/views/hof/HofList.svelte` | gebaut |
| BL-143 | S | feature | kür | **Volle GRAMPS-Ortshierarchie ins Modell** → [ADR-v9-114](04-Entscheidungslog.md#adr-v9-114) | [13 §6](13-Interop-Roundtrip.md), [11 §4](11-Orte-Hoefe-Identitaet.md), [11 §7](11-Orte-Hoefe-Identitaet.md), [ADR-v9-114](04-Entscheidungslog.md#adr-v9-114) | `test:tests/core/gramps-place-hierarchy.test.ts` | gebaut |
| BL-139 | S | feature | kür | **GRAMPS als bearbeitbares Zweitformat in der UI erreichbar** → [ADR-v9-114](04-Entscheidungslog.md#adr-v9-114) · [ADR-v9-113](04-Entscheidungslog.md#adr-v9-113) | [13 §6](13-Interop-Roundtrip.md), [14 §3.2](14-Dateihandling.md), [ADR-v9-113](04-Entscheidungslog.md#adr-v9-113), [ADR-v9-114](04-Entscheidungslog.md#adr-v9-114) | `!txt:Exclude<ExportFormat@ui/shell/save-action.ts` | gebaut |
| BL-141 | S | feature | kür | **GRAMPS-Orts-Auflösung** → [ADR-v9-114](04-Entscheidungslog.md#adr-v9-114) | [13 §6](13-Interop-Roundtrip.md), [11 §4](11-Orte-Hoefe-Identitaet.md), [ADR-v9-114](04-Entscheidungslog.md#adr-v9-114) | `test:tests/core/gramps-places.test.ts` | gebaut |
| BL-144 | S | feature | kür | **GRAMPS Event/Zitat: Add/Remove im Write-Back** → [04a](04a-Chronik.md#bl-144) | [13 §6](13-Interop-Roundtrip.md), [ADR-v9-114](04-Entscheidungslog.md#adr-v9-114), [ADR-v9-11](04-Entscheidungslog.md#adr-v9-11) | `test:tests/roundtrip/gramps-add-remove-events.test.ts` | gebaut |
| BL-142 | S | feature | kür | **GRAMPS Write-Back Modell→Baum für die GETEILTEN Records Events/Daten/Zitate** → [ADR-v9-114](04-Entscheidungslog.md#adr-v9-114) | [13 §6](13-Interop-Roundtrip.md), [ADR-v9-114](04-Entscheidungslog.md#adr-v9-114) | `test:tests/roundtrip/gramps-write-back-events.test.ts` | gebaut |
| BL-140 | S | feature | kür | **GRAMPS→Modell Lese-Projektion** → [ADR-v9-114](04-Entscheidungslog.md#adr-v9-114) | [13 §6](13-Interop-Roundtrip.md), [10 §5](10-Domaenenmodell.md), [ADR-v9-114](04-Entscheidungslog.md#adr-v9-114) | `test:tests/core/gramps-enrich.test.ts` | gebaut |
| BL-136 | — | defekt | usp | **GRAMPS-Projektion mischte zwei Schlüsselarten** → [ADR-v9-11](04-Entscheidungslog.md#adr-v9-11) | [13 §6](13-Interop-Roundtrip.md), [10 §2](10-Domaenenmodell.md) | `test:tests/core/gramps-references.test.ts` | gebaut |
| BL-110 | — | defekt | basis | **Picker-Trefferliste hing als `position: absolute` im eigenen Teilbaum** → [04a](04a-Chronik.md#bl-110) | [21 §6k](21-UI-UX.md), [ADR-v9-108](04-Entscheidungslog.md) | `txt:anchoredTo@ui/shell/Picker.svelte` | gebaut |
| BL-95 | — | defekt | basis | **Lens-Umschalter lief bei 375 px über** → [04a](04a-Chronik.md#bl-95) | [21 §2/§4/§9 B7](21-UI-UX.md), [ADR-v9-111](04-Entscheidungslog.md) | `test:tests/ui/lens-header-overflow.test.ts` | gebaut |
| BL-80 | — | defekt | usp | **GRAMPS-Export gab nur den geparsten Baum wieder** → [04a](04a-Chronik.md#bl-80) | [13 §6](13-Interop-Roundtrip.md), [14 §3.2](14-Dateihandling.md), [ADR-v9-110](04-Entscheidungslog.md) | `test:tests/roundtrip/gramps-write-back.test.ts` | gebaut |
| BL-81 | — | defekt | usp | **`xml-tree` verlor gemischten Inhalt still** → [04a](04a-Chronik.md#bl-81) | [13 §6](13-Interop-Roundtrip.md), [ADR-v9-110](04-Entscheidungslog.md) | `test:tests/core/xml-tree-mixed-content.test.ts` | gebaut |
| BL-82 | — | defekt | basis | **Union-Merge verglich `clock.now()` mit `remote.ts`** → [04a](04a-Chronik.md#bl-82) | [11 §2](11-Orte-Hoefe-Identitaet.md), [30 §4](30-NFR-und-Persistenz.md), [ADR-v9-110](04-Entscheidungslog.md) | `test:tests/services/places-sync-tiebreak.test.ts` | gebaut |
| BL-84 | — | hygiene | kür | **26 tote Sprungmarken** → [04a](04a-Chronik.md#bl-84) | [04a](04a-Chronik.md), [20](20-Funktionen.md), [21](21-UI-UX.md) | `txt:check-anchors@.claude/skills/spec-lint/SKILL.md` | gebaut |
| BL-51 | — | hygiene | kür | **[S]/[E]-Inventur: alle 29 Bullets aus Spec 20 am Code verifiziert** → [04a](04a-Chronik.md#bl-51) | [20](20-Funktionen.md) | `txt:SE_BULLETS@.claude/skills/spec-lint/check-backlog.mjs` | gebaut |
| BL-52 | — | hygiene | kür | **Spec 20 führte §1.11 in einem zweiten Format** | [20 §1.11](20-Funktionen.md) | `!txt:^[*][*][a-z][)] .*\[K\]@specs/v9/20-Funktionen.md` | gebaut |
| BL-53 | — | hygiene | kür | **`eslint-disable no-useless-assignment` in `TimelineLensView.svelte` war schon bei BL-01 entfernt worden** | [32](32-Testframework.md) | `!txt:no-useless-assignment@ui/views/timeline/TimelineLensView.svelte` | gebaut |
| BL-111 | S | feature | kür | Demo-Modus: „Demo laden" fährt dieselbe Lade-Pipeline wie eine echte Datei, meldet aber bewusst kein `fileHandle` — funktioniert offline aus dem Service-Worker-Cache | [20 §1.2](20-Funktionen.md) | `datei:app/public/demo.ged` | gebaut |
| BL-112 | S | feature | kür | **Interaktive Karte mit drei Modi** | [20 §1.9](20-Funktionen.md), [21 §4](21-UI-UX.md) | `sym:MapModeId` | gebaut |
| BL-113 | S | feature | kür | **Zeitleiste als imperative Insel** | [20 §1.10](20-Funktionen.md) | `sym:computeSwimLaneLayout` | gebaut |
| BL-114 | S | feature | kür | **Interaktive Statistik-Ansicht** | [20 §1.13](20-Funktionen.md), [20 §4](20-Funktionen.md) | `sym:computeStatistics` | gebaut |
| BL-115 | S | feature | kür | Hypothesen: Annahme, Status, Konfidenz (getrennt von der Quellen-Beweiskraft, INV-H1), Evidenz als reine SID-Referenz (INV-H2) | [20 §1.11d](20-Funktionen.md), [12 §4](12-Forschungsdaten.md) | `datei:ui/views/hypotheses/HypothesesView.svelte` | gebaut |
| BL-116 | S | feature | kür | **Forschungsprotokoll** | [20 §1.11b](20-Funktionen.md), [12 §2](12-Forschungsdaten.md) | `datei:ui/views/research-log/LogView.svelte` | gebaut |
| BL-117 | S | feature | kür | **Evidenzmodell-Kern** | [20 §1.11c](20-Funktionen.md), [12 §3](12-Forschungsdaten.md) | `sym:evalToQuay` | gebaut |
| BL-118 | S | feature | kür | **GED7 und Strict als Serializer im EINEN Export-Rohr** → [ADR-v9-113](04-Entscheidungslog.md#adr-v9-113) | [20 §1.2](20-Funktionen.md), [13](13-Interop-Roundtrip.md), [14 §3](14-Dateihandling.md) | `sym:ExportFormat` | gebaut |
| BL-129 | S | feature | kür | `orte.json`-Import/Export mit Dedup und Multi-Device-Konflikterkennung; der Import löst einen vollen `resolveEvents()`-Neuauflauf aus, weil er die Identitäts-Zuordnung selbst ändern kann (ADR-v9-47) | [20 §1.7](20-Funktionen.md), [11 §3](11-Orte-Hoefe-Identitaet.md) | `sym:createPlacesFileIO` | gebaut |
| BL-64 | S | feature | kür | **Ehepartner/Eltern-Disambiguierung** | [20 §1.4](20-Funktionen.md), [21 §6c](21-UI-UX.md), ADR-v9-52 | `txt:summary: yearPlaceSummary@ui/views/person/person-detail-model.ts` | gebaut |
| BL-108 | — | defekt | basis | **Scoring las `given`/`surname` roh** | [10 §2](10-Domaenenmodell.md), [20 §1.12](20-Funktionen.md) | `datei:core/model/name-parts.ts` | gebaut |
| BL-107 | S | feature | basis | **Import-Vergleich** | [20 §1.12](20-Funktionen.md), [21 §10b](21-UI-UX.md) | `datei:ui/views/import/ImportCompareView.svelte` | gebaut |
| BL-106 | S | feature | basis | **Import-Vergleich** | [20 §1.12](20-Funktionen.md), [10 §4](10-Domaenenmodell.md) | `sym:applyImportPatch` | gebaut |
| BL-63 | S | feature | basis | **Import-Vergleich, Kern** → [ADR-v9-107](04-Entscheidungslog.md#adr-v9-107) | [20 §1.12](20-Funktionen.md), [ADR-v9-107](04-Entscheidungslog.md) | `sym:compareImport` | gebaut |
| BL-105 | S | feature | kür | **„Kein Duplikat" merkt ein Paar dauerhaft** | [30 §2](30-NFR-und-Persistenz.md), [ADR-v9-104](04-Entscheidungslog.md) | `txt:STORE_DEDUP_IGNORED@services/idb-schema.ts` | gebaut |
| BL-104 | S | feature | basis | **Dedup-Ansicht + Merge-Modal für Personen** | [20 §1.12](20-Funktionen.md), [ADR-v9-63](04-Entscheidungslog.md), [ADR-v9-104](04-Entscheidungslog.md) | `datei:ui/views/person/PersonDedupView.svelte` | gebaut |
| BL-103 | S | feature | basis | **`mergePersons` als Kern-Kommando** | [20 §1.12](20-Funktionen.md), [10 §6](10-Domaenenmodell.md), [ADR-v9-104](04-Entscheidungslog.md) | `sym:mergePersons` | gebaut |
| BL-62 | S | feature | basis | **Duplikat-Erkennung Personen** → [ADR-v9-106](04-Entscheidungslog.md#adr-v9-106) | [20 §1.12](20-Funktionen.md), [ADR-v9-104](04-Entscheidungslog.md), [ADR-v9-106](04-Entscheidungslog.md) | `sym:findPersonDuplicates` | gebaut |
| BL-101 | — | defekt | basis | **Picker verlangte ein ZWEITES Eingabefeld** | [21 §6](21-UI-UX.md), [ADR-v9-103](04-Entscheidungslog.md) | `txt:freeText@ui/shell/Picker.svelte` | gebaut |
| BL-102 | — | defekt | basis | **Neun Picker standen in einem `<label>`** | [32 TST-18](32-Testframework.md) | `txt:Ein Picker darf nicht in einem@eslint.config.js` | gebaut |
| BL-97 | — | defekt | basis | **Lens-Gruppe hatte keinen Merker** | [21 §4](21-UI-UX.md), [ADR-v9-102](04-Entscheidungslog.md) | `sym:isLensTarget` | gebaut |
| BL-98 | — | defekt | basis | **Personenauswahl und Anzeige-Modus der Diagramm-Lenses lagen komponenten-lokal und starben beim Unmount** | [21 §4/§5](21-UI-UX.md), [20 §1.9/§1.10](20-Funktionen.md) | `txt:setTimelinePersons@ui/shell/view-state.svelte.ts` | gebaut |
| BL-99 | — | defekt | basis | **Aufgaben-/Forschungsfläche fiel bei jedem Verlassen auf „Aufgaben" zurück** | [20 §1.11](20-Funktionen.md), [ADR-v9-102](04-Entscheidungslog.md) | `txt:researchTarget@ui/shell/route.svelte.ts` | gebaut |
| BL-100 | — | defekt | basis | **Karte/Zeitleiste bauten ihren Personen-Picker als eigenes Overlay nach** | [21 §6](21-UI-UX.md), [ADR-v9-102](04-Entscheidungslog.md) | `!txt:map-lens-view__picker@ui/views/map/MapLensView.svelte` | gebaut |
| BL-96 | — | defekt | basis | **Befehlsflächen-Budget hängt an der Spaltenbreite** | [21 §6h](21-UI-UX.md), [21 §3](21-UI-UX.md) | `!txt:ist mobil skopiert@specs/v9/21-UI-UX.md` | gebaut |
| BL-93 | K | feature | basis | **Command-Palette** | [21 §3/§6k](21-UI-UX.md), [20 §1.1](20-Funktionen.md) | `datei:ui/shell/CommandPalette.svelte` | gebaut |
| BL-08 | K | feature | basis | **Keyboard-Shortcuts Speichern/Escape/Palette; `belongsToField` trennt, was dem Eingabefeld gehört** | [20 §1.2](20-Funktionen.md), [21 §6i](21-UI-UX.md) | `txt:'save'@ui/shell/shortcuts.ts` | gebaut |
| BL-92 | K | feature | basis | **Multi-Pane Master-Detail** | [21 §3](21-UI-UX.md), [ADR-v9-101](04-Entscheidungslog.md) | `test:tests/ui/multi-pane.test.ts` | gebaut |
| BL-06 | K | feature | basis | **Desktop-Sidebar** | [21 §3/§4](21-UI-UX.md), [ADR-v9-101](04-Entscheidungslog.md) | `datei:ui/shell/Sidebar.svelte` | gebaut |
| BL-91 | K | feature | blockiert | **Formfaktor-Modul** | [21 §3](21-UI-UX.md), [ADR-v9-101](04-Entscheidungslog.md) | `sym:isDesktopLayout` | gebaut |
| BL-90 | K | feature | blockiert | **Navigations-Ziel-Register + EINE Routen-Quelle** | [21 §3](21-UI-UX.md), [ADR-v9-101](04-Entscheidungslog.md) | `test:tests/ui/nav-register.test.ts` | gebaut |
| BL-04 | K | feature | basis | **Validierung/Datenprüfung** | [20 §1.11h, §3](20-Funktionen.md) | `sym:runValidation` | gebaut |
| BL-05 | K | feature | basis | **Qualitäts-Dashboard** | [20 §1.11g](20-Funktionen.md) | `sym:buildQualityDashboard` | gebaut |
| BL-55 | — | feature | basis | **Orts-Anzeigetiefe** | [11 §1/§5](11-Orte-Hoefe-Identitaet.md), [21 §6l](21-UI-UX.md), [ADR-v9-90](04-Entscheidungslog.md), [ADR-v9-100](04-Entscheidungslog.md) | `test:tests/ui/place-display-depth.test.ts` | gebaut |
| BL-85 | — | defekt | basis | **Overlays aus klippenden/stapelnden Vorfahren befreit** | [21 §6k](21-UI-UX.md) | `test:tests/ui/overlay-portal.test.ts` | gebaut |
| BL-86 | S | feature | basis | **INV-UI-11-Retrofit der Forschungs-Arbeitsfläche** | [21 §6h](21-UI-UX.md) | `txt:stb-filter-set@ui/shell/design-system.css` | gebaut |
| BL-11 | K | feature | basis | **Rollenbasierte Navigation** | [20 §1.1](20-Funktionen.md) | `datei:ui/shell/BottomNav.svelte` | gebaut |
| BL-12 | K | feature | basis | Einheitlicher Lens-Umschalter | [20 §1.1](20-Funktionen.md) | `datei:ui/shell/LensSwitcher.svelte` | gebaut |
| BL-13 | K | feature | basis | ViewState (Auswahl je Ziel, INV-VS) | [21 §5](21-UI-UX.md) | `sym:createViewState` | gebaut |
| BL-14 | K | feature | basis | Globale Suche über alle fünf Entitäten | [20 §1.1](20-Funktionen.md) | `datei:ui/views/search/GlobalSearchView.svelte` | gebaut |
| BL-167 | S | feature | kür | **Typ-Filter der Suchtreffer** → [ADR-v9-130](04-Entscheidungslog.md#adr-v9-130) | [20 §1.1](20-Funktionen.md), [21 §2](21-UI-UX.md), [ADR-v9-130](04-Entscheidungslog.md#adr-v9-130) | `txt:showFilterChips@ui/views/search/GlobalSearchView.svelte` | gebaut |
| BL-168 | S | feature | kür | **Quellen-Zitat-Weblink in der Quellen-Detail-Referenzliste sichtbar** → [ADR-v9-86](04-Entscheidungslog.md#adr-v9-86) | [20 §1.6](20-Funktionen.md), [21 §7](21-UI-UX.md), [ADR-v9-86](04-Entscheidungslog.md#adr-v9-86) | `txt:source-detail__ref-link@ui/views/source/SourceDetail.svelte` | gebaut |
| BL-15 | K | feature | usp | **GEDCOM 5.5.1 öffnen** | [20 §1.2](20-Funktionen.md), [13](13-Interop-Roundtrip.md) | `sym:parseGedcom` | gebaut |
| BL-16 | K | feature | usp | **GRAMPS XML lesen+schreiben** | [20 §1.2](20-Funktionen.md) | `sym:parseXMLText` | gebaut |
| BL-17 | K | feature | basis | Ein Export-Rohr, zwei Save-Tiers | [20 §1.2](20-Funktionen.md), [14](14-Dateihandling.md) | `datei:services/file/export-pipe.ts` | gebaut |
| BL-18 | K | feature | basis | Auto-Load der Arbeitskopie beim Start | [20 §1.2](20-Funktionen.md) | `datei:services/file/idb-working-copy-store.ts` | gebaut |
| BL-19 | K | feature | basis | **Sanduhr-Baum** | [20 §1.3](20-Funktionen.md) | `datei:ui/islands/tree/hourglass-tree.ts` | gebaut |
| BL-20 | K | feature | basis | **Geschwisterzeile des Probanden** | [20 §1.3](20-Funktionen.md) | `sym:getSiblingIds` | gebaut |
| BL-21 | K | feature | basis | **Personenliste** | [20 §1.4](20-Funktionen.md) | `sym:PersonSortMode` | gebaut |
| BL-22 | K | feature | basis | **Personen-Filter** | [20 §1.4](20-Funktionen.md) | `sym:PersonFilters` | gebaut |
| BL-23 | K | feature | basis | **Personen-Detail** | [20 §1.4](20-Funktionen.md) | `sym:buildPersonDetail` | gebaut |
| BL-24 | K | feature | basis | **Familienliste + Sortier-Umschalter** | [20 §1.5](20-Funktionen.md) | `sym:FamilySortMode` | gebaut |
| BL-25 | K | feature | basis | Familien-Filter | [20 §1.5](20-Funktionen.md) | `sym:FamilyFilters` | gebaut |
| BL-26 | K | feature | basis | **Geteilte Ereigniszeile** | [20 §1.4/§1.5](20-Funktionen.md) | `datei:ui/shell/EventLine.svelte` | gebaut |
| BL-27 | K | feature | basis | **Quellenliste + Detail** | [20 §1.6](20-Funktionen.md) | `sym:buildSourceDetail` | gebaut |
| BL-28 | K | feature | basis | **Archive/Repository** | [20 §1.6](20-Funktionen.md) | `datei:ui/views/repository/RepositoryList.svelte` | gebaut |
| BL-29 | K | feature | usp | Automatischer Orts-Seed beim Import | [20 §1.7](20-Funktionen.md), [11 §4.2](11-Orte-Hoefe-Identitaet.md) | `sym:seedPlacesFromEvents` | gebaut |
| BL-30 | K | feature | usp | Ortsliste (Typ-Badge, Gruppen-Modus, Admin-Filter) | [20 §1.7](20-Funktionen.md) | `sym:PlaceFilters` | gebaut |
| BL-31 | K | feature | usp | Ort-Steckbrief mit Zugehörigkeits-Zeitleiste | [20 §1.7](20-Funktionen.md) | `sym:HierarchyTimelineRow` | gebaut |
| BL-32 | K | feature | usp | **Namens-Zeitstrahl** | [20 §1.7](20-Funktionen.md) | `sym:PlaceVariantRow` | gebaut |
| BL-33 | K | feature | usp | Kettenglieder klickbar | [20 §1.7](20-Funktionen.md) | `sym:ChainSegment` | gebaut |
| BL-34 | K | feature | usp | Ort-Felder editierbar + Zugehörigkeit-Modal | [20 §1.7](20-Funktionen.md) | `datei:ui/views/place/PlaceEnclosureEditModal.svelte` | gebaut |
| BL-35 | K | feature | usp | **„Ort löschen"** | [20 §1.7](20-Funktionen.md) | `sym:deletePlaceCascade` | gebaut |
| BL-36 | K | feature | usp | **String→PlaceObject verknüpfen** | [20 §1.7](20-Funktionen.md) | `sym:linkEventToPlace` | gebaut |
| BL-37 | K | feature | usp | Orts-Review Klasse P | [20 §1.7](20-Funktionen.md), [11 §6](11-Orte-Hoefe-Identitaet.md) | `datei:ui/views/place/PlaceReview.svelte` | gebaut |
| BL-38 | K | feature | usp | **Massen-Dedup Orte** | [20 §1.7](20-Funktionen.md), [11 §9.2](11-Orte-Hoefe-Identitaet.md) | `sym:buildPlaceDedupGroups` | gebaut |
| BL-39 | K | feature | usp | Anreicherungs-Pille | [20 §1.7](20-Funktionen.md), [11 §9.1](11-Orte-Hoefe-Identitaet.md) | `sym:isEnrichedPlace` | gebaut |
| BL-40 | K | feature | usp | **Referenz-Filter** | [20 §1.7](20-Funktionen.md), [11 §9.3](11-Orte-Hoefe-Identitaet.md) | `sym:hasReference` | gebaut |
| BL-41 | K | feature | usp | Hof-Liste (nach Dorf/Straße/Hausnummer) | [20 §1.8](20-Funktionen.md) | `datei:ui/views/hof/hof-list-model.ts` | gebaut |
| BL-42 | K | feature | usp | **Hof-Felder editierbar inkl** | [20 §1.8](20-Funktionen.md) | `sym:withUpdatedHofAddr` | gebaut |
| BL-43 | K | feature | usp | „Hof löschen" | [20 §1.8](20-Funktionen.md) | `sym:deleteHofCascade` | gebaut |
| BL-44 | K | feature | usp | Hof-Review Klassen A/C/D | [20 §1.8](20-Funktionen.md), [11 §6](11-Orte-Hoefe-Identitaet.md) | `datei:ui/views/hof/HofReview.svelte` | gebaut |
| BL-45 | K | feature | usp | Massen-Dedup Höfe | [20 §1.8](20-Funktionen.md) | `sym:buildHofDedupGroups` | gebaut |
| BL-46 | K | feature | basis | **Aufgaben-Kanban** | [20 §1.11a](20-Funktionen.md) | `datei:ui/views/tasks/TasksView.svelte` | gebaut |
| BL-49 | — | hygiene | basis | Backlog-Lint L1–L4 in `spec-lint` überführen | [05](05-Backlog.md) | `txt:check-backlog@.claude/skills/spec-lint/SKILL.md` | gebaut |
| BL-72 | S | feature | usp | Ortszeitgenossen | [20 §1.7](20-Funktionen.md) | `sym:buildPlaceContemporaries` | gebaut |
| BL-73 | S | feature | basis | 21 §10a FilterBar | [21 §10a](21-UI-UX.md) | `datei:ui/shell/FilterBar.svelte` | gebaut |
| BL-74 | S | feature | basis | 21 §10b Gruppierung/Paginierung/Einklappen | [21 §10b](21-UI-UX.md) | `datei:ui/shell/pagination.ts` | gebaut |
| BL-75 | S | feature | basis | 21 §10d SourceCitationRow | [21 §10d](21-UI-UX.md) | `datei:ui/shell/SourceCitationRow.svelte` | gebaut |
| BL-76 | S | feature | kür | 21 §10e Redundanter Hero-Titel entfernt | [21 §10e](21-UI-UX.md) | `datei:ui/shell/DetailHeader.svelte` | gebaut |
| BL-77 | S | feature | kür | 21 §10i Quellen-Badge-Konvention durchgängig | [21 §10i](21-UI-UX.md) | `datei:ui/shell/SourceBadge.svelte` | gebaut |
| BL-78 | S | feature | kür | 21 §10j Hof/Ort-Ereignisgruppierung vereinheitlicht | [21 §10j](21-UI-UX.md) | `datei:ui/shell/event-grouping.ts` | gebaut |
| BL-50 | — | hygiene | basis | **L3 durchsetzen** | [05](05-Backlog.md) | `!txt:nicht gebaut,✅ gebaut,noch offen@specs/v9/1*.md,specs/v9/2*.md,specs/v9/3*.md` | gebaut |
| BL-47 | — | defekt | blockiert | **Orts-Resolver** | [ADR-v9-88](04-Entscheidungslog.md), [11 §4.2](11-Orte-Hoefe-Identitaet.md) | `test:tests/perf/scale.perf.test.ts` | gebaut |
| BL-48 | — | hygiene | basis | Perf-Gate in CI verdrahten | [31 §4](31-Dev-Umgebung.md), [32 §7](32-Testframework.md) | `txt:test:perf@.github/workflows/ci.yml` | gebaut |
| BL-01 | K | feature | blockiert | Undo/Redo (Snapshot-Stack ≥30, „Revert to Saved“) | [20 §1.2](20-Funktionen.md), [ADR-v9-92](04-Entscheidungslog.md) | `test:tests/ui/app-state-undo.test.ts` | gebaut |
| BL-54 | — | hygiene | basis | **`max-lines`-Regel für `.svelte`** | [02 §2](02-Zielarchitektur-v9.md), [32](32-Testframework.md) | `txt:max-lines@eslint.config.js` | gebaut |
| BL-02 | K | feature | basis | **Service Worker + Manifest** | [20 §1.2](20-Funktionen.md), [30](30-NFR-und-Persistenz.md), [ADR-v9-93](04-Entscheidungslog.md) | `datei:app/public/sw.js` | gebaut |
| BL-03 | K | feature | basis | Offline-Indikator in der Schale | [20 §1.2](20-Funktionen.md), [ADR-v9-94](04-Entscheidungslog.md) | `datei:ui/shell/OfflineIndicator.svelte` | gebaut |
| BL-137 | — | defekt | basis | **`given`/`surname` blieben beim Einlesen leer, wenn die GEDCOM-Quelle keine `GIVN`/`SURN`-Untertags trug** → [ADR-v9-18](04-Entscheidungslog.md#adr-v9-18) | [10 §2](10-Domaenenmodell.md), [32 TST-19/TST-20](32-Testframework.md) | `test:tests/roundtrip/gedcom-untagged.roundtrip.test.ts` | gebaut |
| BL-138 | — | defekt | basis | **Anonymisierter Export war unbrauchbar und nicht verdrahtet** → [04a](04a-Chronik.md#bl-138) | [13 §7](13-Interop-Roundtrip.md), [14 §3.2](14-Dateihandling.md), [ADR-v9-113](04-Entscheidungslog.md#adr-v9-113) | `test:tests/core/interop-anonymize-doc.test.ts` | gebaut |
| BL-119 | S | feature | basis | **Export-Fläche im „Datei"-Eintrag** → [04a](04a-Chronik.md#bl-119) | [20 §1.2](20-Funktionen.md), [14 §3](14-Dateihandling.md), [ADR-v9-113](04-Entscheidungslog.md#adr-v9-113) | `datei:ui/views/export/ExportView.svelte` | gebaut |
| BL-151 | S | feature | kür | **Geteilter Insel-Viewport** → [ADR-v9-123](04-Entscheidungslog.md#adr-v9-123) | [21 §8](21-UI-UX.md), [02 §5](02-Zielarchitektur-v9.md), [ADR-v9-123](04-Entscheidungslog.md#adr-v9-123) | `datei:ui/islands/tree/tree-viewport.ts` | gebaut |
| BL-122 | S | feature | kür | **Nachkommen-Baum** → [ADR-v9-123](04-Entscheidungslog.md#adr-v9-123) | [20 §1.3](20-Funktionen.md), [21 §8](21-UI-UX.md), [ADR-v9-123](04-Entscheidungslog.md#adr-v9-123) | `datei:ui/islands/tree/descendant-tree.ts` | gebaut |
| BL-123 | S | feature | kür | **Fan-Chart als eigene Insel** → [04a](04a-Chronik.md#bl-123) | [20 §1.3](20-Funktionen.md), [21 §8](21-UI-UX.md), [ADR-v9-123](04-Entscheidungslog.md#adr-v9-123) | `datei:ui/islands/tree/fan-chart.ts` | gebaut |
| BL-152 | S | feature | kür | **Per-Person-Severity als geteilte Kern-Projektion** → [ADR-v9-123](04-Entscheidungslog.md#adr-v9-123) | [20 §1.3/§1.11](20-Funktionen.md), [21 §8](21-UI-UX.md), [ADR-v9-123](04-Entscheidungslog.md#adr-v9-123) | `sym:computePersonSeverity` | gebaut |
| BL-121 | S | feature | kür | **Vollständigkeits-Heatmap** | [20 §1.3](20-Funktionen.md), [21 §8](21-UI-UX.md), [ADR-v9-123](04-Entscheidungslog.md#adr-v9-123) | `sym:buildTreeRings` | gebaut |
| BL-124 | E | feature | kür | **Diagramm-Export PNG + A1-Vektorposter** → [ADR-v9-123](04-Entscheidungslog.md#adr-v9-123) | [20 §1.3](20-Funktionen.md), [21 §8](21-UI-UX.md), [14 §3](14-Dateihandling.md), [ADR-v9-123](04-Entscheidungslog.md#adr-v9-123) | `datei:ui/islands/tree/diagram-export.ts` | gebaut |
| BL-87 | — | feature | kür | **Karten-Insel INV-UI-14 nachgezogen** | [21 §6l](21-UI-UX.md), [11 §5](11-Orte-Hoefe-Identitaet.md) | `txt:placeDisplayName@ui/islands/map/map-model.ts` | gebaut |
| BL-88 | — | hygiene | kür | **„Kein View liest `po.title` direkt" als ESLint-Regel** | [11 §5](11-Orte-Hoefe-Identitaet.md), [21 §6l](21-UI-UX.md), [32 TST-12](32-Testframework.md) | `txt:placeDisplayName@eslint.config.js` | gebaut |
| BL-169 | S | feature | kür | **Ausgaben-Report-Fundament** → [ADR-v9-138](04-Entscheidungslog.md#adr-v9-138) | [20 §4](20-Funktionen.md), [02 §5](02-Zielarchitektur-v9.md), [ADR-v9-138](04-Entscheidungslog.md#adr-v9-138) | `datei:services/reports/report-shell.ts` | gebaut |
| BL-170 | S | feature | kür | **Report #1 **Ahnenliste**** | [20 §4](20-Funktionen.md), [20 §1.1](20-Funktionen.md), [ADR-v9-138](04-Entscheidungslog.md#adr-v9-138) | `sym:buildAncestorList` | gebaut |
| BL-171 | S | feature | kür | **Report #2 **Familienbogen**** | [20 §4](20-Funktionen.md), [ADR-v9-138](04-Entscheidungslog.md#adr-v9-138) | `sym:buildFamilyGroupSheet` | gebaut |
| BL-172 | S | feature | kür | **Report #3 **Quellenverzeichnis/Bibliographie** mit Belegzählung je Quelle** | [20 §4](20-Funktionen.md), [20 §1.6](20-Funktionen.md), [ADR-v9-138](04-Entscheidungslog.md#adr-v9-138) | `sym:buildBibliography` | gebaut |
| BL-173 | S | feature | kür | **Report #4 **Forschungsprotokoll-Report**** | [20 §4](20-Funktionen.md), [20 §1.11b](20-Funktionen.md), [ADR-v9-138](04-Entscheidungslog.md#adr-v9-138) | `sym:buildResearchLogReport` | gebaut |
| BL-174 | S | feature | kür | **Report #6 **Nachkommentafel** in d'Aboville-Nummerierung** | [20 §4](20-Funktionen.md), [20 §1.10](20-Funktionen.md), [ADR-v9-138](04-Entscheidungslog.md#adr-v9-138) | `sym:buildDAbovilleReport` | gebaut |
| BL-134 | S | feature | kür | **Beziehungsrechner** → [ADR-v9-139](04-Entscheidungslog.md#adr-v9-139) · [ADR-v9-135](04-Entscheidungslog.md#adr-v9-135) | [20 §1.12](20-Funktionen.md), [ADR-v9-139](04-Entscheidungslog.md#adr-v9-139) | `sym:findRelationshipPath` | gebaut |
| BL-175 | S | feature | kür | **Report #9 **Verwandtschaftsnachweis**** → [ADR-v9-139](04-Entscheidungslog.md#adr-v9-139) | [20 §4](20-Funktionen.md), [20 §1.12](20-Funktionen.md), [ADR-v9-139](04-Entscheidungslog.md#adr-v9-139) | `sym:buildRelationshipProof` | gebaut |
| BL-120 | S | feature | kür | **Proband konfigurierbar + „Zum Probanden"-Navigation** → [ADR-v9-140](04-Entscheidungslog.md#adr-v9-140) · [ADR-v9-135](04-Entscheidungslog.md#adr-v9-135) | [20 §1.1](20-Funktionen.md), [ADR-v9-140](04-Entscheidungslog.md#adr-v9-140), [ADR-v9-135](04-Entscheidungslog.md#adr-v9-135) | `txt:function goToProband@ui/shell/app-navigation.svelte.ts` | gebaut |
| BL-308 | — | test | kür | **Das Pflichtfeld „Berührte Prinzipien" wird von Hand-Edits umgangen — 0 von 212 ADRs tragen es** → [ADR-v9-198](04-Entscheidungslog.md#adr-v9-198) · [ADR-v9-197](04-Entscheidungslog.md#adr-v9-197) · [ADR-v9-213](04-Entscheidungslog.md#adr-v9-213) · [ADR-v9-214](04-Entscheidungslog.md#adr-v9-214) · [ADR-v9-200](04-Entscheidungslog.md#adr-v9-200) | [01](01-Vision-und-Prinzipien.md), [32](32-Testframework.md) | `txt:BL-308@.claude/skills/spec-lint/check-adr-prinzipien.mjs` | gebaut |
| BL-293 | — | test | kür | **Vier Invarianten hängen an je einer Testdatei** → [ADR-v9-199](04-Entscheidungslog.md#adr-v9-199) · [ADR-v9-215](04-Entscheidungslog.md#adr-v9-215) | [32](32-Testframework.md) | `txt:INV-VS@tests/ui/naht-view-state-nav.test.ts` | gebaut |
| BL-295 | — | test | kür | **Systematischer Rückbau der Einzelfall-Tests** → [ADR-v9-196](04-Entscheidungslog.md#adr-v9-196) · [ADR-v9-216](04-Entscheidungslog.md#adr-v9-216) · [ADR-v9-104](04-Entscheidungslog.md#adr-v9-104) · [ADR-v9-174](04-Entscheidungslog.md#adr-v9-174) | [32](32-Testframework.md) | `txt:RUECKBAU_GEPRUEFT@tools/mutation/mutationen.mjs` | gebaut |

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
- `txt:<Regex>@<Pfad>` — Datei enthält das Muster (für CI-/Konfig-Verdrahtung). Der Pfad
  wird erst im Code-, dann im Spec-Repo gesucht; `spec:`/`code:` davor **erzwingen** eines
  von beiden (`txt:muster@spec:.gitignore`). Nötig bei gleichnamigen Dateien: BL-296 meinte
  die `.gitignore` des Spec-Repos, gelesen wurde die des Code-Repos — sie existiert auch,
  kam zuerst, und der Beleg meldete stumm „trifft nicht".
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
| L8 | Beleg-Pfad einer Zeile gegen den Zuständigkeitsbereich ihrer Statusdatei (`app-orte/`, `tests/orte/` → [05a](05a-Backlog-Orte-Editor.md), alles andere → hier) | **Fehler** | Eine Zeile in der falschen Statusdatei. Die Aufteilung „je Programm eine Datei" ist nur so viel wert, wie sie eingehalten wird; ohne Prüfung wäre sie eine Vereinbarung, also genau die Sorte Zusage, die dieses Dokument ersetzt hat. `spec:`/`txt:`-Belege auf Spec-Dateien und negierte `!sym:`-Belege haben keinen Code-Pfad und werden übersprungen. |
| L9 | Kopfzeile einer Tabelle ohne Trennzeile `\|---\|` direkt darunter | **Fehler** | Eine Tabelle, die gar nicht mehr als Tabelle rendert. Am 2026-07-28 wurden zwei erledigte Zeilen ZWISCHEN Kopf- und Trennzeile eingefügt; jeder weitere Erledigt-Commit schob die Trennzeile tiefer (am Ende 23 Zeilen), und „Erledigte Punkte" erschien auf GitHub als Absatz voller Striche. Zwölf Läufe meldeten „konsistent", weil L1/L2/L5 die Zeilen per Regex lesen und die Struktur nie ansahen — dieselbe Lücke wie bei L5, eine Ebene tiefer (Fund 2026-07-31). |
| L10 | Planungsteil der Priorisierung ↔ Statusspalte, und jede offene Zeile in Cluster **und** Welle (oder ausdrücklich vertagt) | **Fehler** | Eine zweite Fassung derselben IDs, die sich vom Status löst — Regel 1 im Kleinen. BL-220…226 waren gebaut und korrekt einsortiert; L1/L2/L5 meldeten „konsistent", die Wellen planten sie trotzdem weiter ein (Fund 2026-07-31, vom Nutzer beim Lesen entdeckt). **Verschärft 2026-08-02:** eine Erwähnung genügte — fünf neu angelegte Zeilen (BL-289/290/292/293/295) standen in der Cluster-Tabelle und damit „in der Priorisierung", kamen aber in keiner Welle vor; der Lint war grün, die Reihenfolge unvollständig, aufgefallen ist es dem Nutzer. Die Cluster-Tabelle sagt WOHIN, die Wellen sagen WANN. Drei zulässige Zustände statt zwei: in einer Welle, oder unter „Bewusst vertagt" (BL-166/BL-227 stehen genau deshalb in keiner Welle — „noch nicht eingeplant" und „bewusst nicht eingeplant" sehen im Dokument gleich aus und sind das Gegenteil voneinander). Geprüft wird in beide Richtungen: Gebautes darf dort nicht als Arbeit stehen, Offenes muss vorkommen. Bewusst NUR der Planungsteil — die Herkunfts-Prosa nennt legitim erledigte IDs, ein Verbot dort ließe die Begründung verschwinden statt der Drift. |
| L11 | Zähl-Aussage über den Realbestand (`Realbestand`, `im Bestand`, `am echten Bestand` … **plus eine Zahl im selben Fenster**) ohne begleitenden Dateinamen, Ratsche `L11_RATSCHE` (7, angezogen 2026-08-04 — vorher 14, Stand BL-247) | Warnung, **Fehler** über der Ratsche | Eine Zahl aus dem Bestand ohne die Datei, an der sie gemessen wurde — [ADR-v9-178](04-Entscheidungslog.md#adr-v9-178): ADR-v9-151 nannte die Datei und maß trotzdem die falsche, BL-217 nannte gar keine. Bewusst **Marker + Zahl**, nicht `N×` allein: das nackte Muster traf 79 Zeilen, überwiegend Aussagen über den Code ("siebenmal dupliziert"). Die Altfälle nennt der Prüflauf namentlich — sie sind die Abarbeitungsliste, nicht ein geduldeter Sockel. **Von 14 auf 7 gefallen (2026-08-04):** die Hälfte saß in der Prosa erledigter Backlog-Zeilen und ist mit der Konsolidierung (Regel 1) verschwunden. Die verbliebenen 7 stehen alle in [04](04-Entscheidungslog.md); dieses Dokument trägt keine einzige mehr. Ratsche entsprechend nachgezogen — eine, die 14 zulässt, wo 7 stehen, erlaubt sieben neue. |
| L12 | ADR-**Absatz** in 04/04a, der einen Rest ankündigt (`Offener Folgepunkt`, `Offen geblieben`, `nicht Teil dieses Fixes`, `nicht entschieden`, `bleibt offen` …), ohne eine `BL-`Nummer im selben Absatz, Ratsche `L12_RATSCHE` (5, Stand 2026-08-02) | Warnung, **Fehler** über der Ratsche | Eine Ankündigung ohne Zeile ist schlechter als gar keine Notiz — sie erzeugt den Eindruck, der Punkt sei erfasst, und taucht in keiner Priorisierung auf ([ADR-v9-196](04-Entscheidungslog.md#adr-v9-196)). Beleg: [ADR-v9-74](04-Entscheidungslog.md#adr-v9-74) beschrieb den hängenden `event.placeId` exakt und blieb sieben Wochen liegen, bis der Nutzer den Defekt meldete ([ADR-v9-195](04-Entscheidungslog.md#adr-v9-195)). Geprüft wird der ABSATZ, nicht das ADR (fast jedes ADR nennt irgendwo eine BL-Nummer) — und wer die Ankündigung liest, soll dort erfahren, wo sie weiterlebt. **Zitate** sind ausgenommen: ein späteres ADR, das den Satz eines früheren wiedergibt, berichtet, statt anzukündigen. |
| L13 | Jede in `specs/v9/` benannte `INV-…`/`LP-…` hat eine Zeile in `tools/mutation/mutationen.mjs` (Mutation, anderes Gate oder ausdrücklich offen) | **Fehler** | Eine neue Invariante, deren Absicherung nie gemessen wird. TST-2 fragt, OB ein Test existiert — die Mutations-Tabelle, ob er ANSCHLÄGT ([32 TST-22](32-Testframework.md), [ADR-v9-199](04-Entscheidungslog.md#adr-v9-199)). Ohne den Zwang wächst das Spec-Set weiter und die Messung bleibt stehen, wo sie angelegt wurde. Ohne Code-Repo: Warnung statt Fehler. |
| L14 | Prosa einer `gebaut`-Zeile (Punkt-Spalte ohne Markdown-Links) gegen das Budget `L14_BUDGET` (200 Zeichen): **mit** ADR-Zeiger hart, **ohne** als Warnung mit Ratsche `L14_RATSCHE` (**0**, Stand BL-322 2026-08-13 — vorher 36) | **Fehler** / Warnung | Die Rückkehr der Doppelfassung, die Regel 1 verbietet. Die Konsolidierung vom 2026-08-04 (290 → 132 KB) stand danach nur als Prosa in Regel 1 — **fünf Tage später waren 20 KB zurück**: sechs neue erledigte Zeilen à ~800–1.400 Zeichen und BL-311 mit **12.879 Zeichen**, länger als jede Zeile vor der Kürzung. Alle trugen ADR-Zeiger, waren also durchweg die kürzere zweite Fassung eines Textes, der schon im Log steht. Gemessen wird Prosa, nicht Zeilenlänge — sonst bestrafte die Regel eine Zeile dafür, dass sie ordentlich verweist. Die Grenze zwischen hart und weich ist die Ausnahme aus Regel 1: eine Zeile ohne ADR-Anker ist die einzige Fassung ihrer Begründung, ihr Inhalt zieht erst nach [04a](04a-Chronik.md) um und wird dann gekürzt. **Am 2026-08-13 ist genau das für alle 36 geschehen** ([BL-322](#erledigte-punkte)): ihr Text steht wörtlich in [04a](04a-Chronik.md#erledigte-zeilen-ohne-adr), die Zeilen tragen Titel + Zeiger, die Ratsche steht auf 0. Das Budget ist gemessen: 270 von 308 erledigten Zeilen lagen nach der Konsolidierung bei ≤ 200 (181 unter 50) — die Verteilung ist dort bimodal. |
| L15 | Datierte **Vorgeschichte** in den Specs 10–32 (Geschichts-Wort `Nachtrag`/`Lehre (`/`Befund (`/`Korrektur`/`Konsistenz-Analyse`/`Ursprünglich` in Sichtweite eines Datums), Ratsche `L15_RATSCHE` (**0**, Stand BL-322 2026-08-13) | **Fehler** | Die Rückkehr der Vorgeschichte in die Soll-Dokumente. [ADR-v9-240](04-Entscheidungslog.md#adr-v9-240) E3 hat 20/21/32 von Hand geräumt und die übrigen sechs als BL-322 offen gelassen — eine Räumung ohne Gate ist eine Räumung auf Wiedervorlage (beim Backlog gemessene Halbwertszeit: fünf Tage). Dieselbe Bauform wie L3, dieselben Dateien. **Bewusst NICHT getroffen ist der datierte BELEG einer geltenden Zusage** (`**Belegt (2026-08-09…)**`, `gemessen 2026-08-03`, die Ist-Spalte einer Budget-Tabelle, `(Nutzer-Befund 2026-08-10)` mitten im Satz) — eine Messung belegt, was GILT; ein Nachtrag erzählt, was WAR. **Benannte Grenze:** eine Vorgeschichte ohne eines dieser Wörter („sah bis 2026-07-16 gar kein Gate") fängt die Regel nicht; sie wurde beim Räumen von Hand mitgenommen. Ein Wächter mit benannter Lücke ist ehrlicher als eine Wortliste, die halbe Sätze errät und dabei Belege mitnimmt. |
| — | Status weder `offen` noch `gebaut` | **Fehler** | Rückkehr von „teilweise" (Regel 2). |
| — | Statusdatei mit Tabelle, aus der **keine** Zeile erkannt wird | **Fehler** | Ein Prüflauf, der „konsistent" meldet, ohne etwas geprüft zu haben — der falsche ID-Präfix genügt dafür. |

**Die Asymmetrie ist Absicht.** Status `offen` + kein Treffer ist immer in Ordnung, auch
wenn der spätere Bau ein anderes Symbol wählt als der hier vorhergesagte Beleg — dieser
Fall scheitert sicher (meldet weiter „offen", bis jemand die Zeile beim Bau anfasst).
Die gefährliche Richtung ist „steht als offen drin, ist längst da"; die fängt L1 hart ab.
Ein Backlog, das zu viel Arbeit anzeigt, kostet einen Blick; eines, das zu wenig anzeigt,
kostet einen doppelt gebauten Feature-Zweig.
