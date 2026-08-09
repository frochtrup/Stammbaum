# 13 — Interoperabilität & Roundtrip

> Schicht: Kern · Abhängig von: [10 Domänenmodell](10-Domaenenmodell.md), [11 Orte/Höfe](11-Orte-Hoefe-Identitaet.md), [12 Forschung](12-Forschungsdaten.md)

Vier Ausgabemodi über **ein** gemeinsames internes Modell. Tag-Semantik + Wire-Format (INDI/FAM/SOUR/REPO, Ausgabestruktur, GED7-Deltas) stehen in der zeitlosen Wire-Referenz [`GEDCOM.md`](../../GEDCOM.md).

---

## 1. Roundtrip-Anforderung (die zentrale Qualität)

- **RT-1:** `out1 === out2` (Idempotenz) auf allen Testdateien, in allen vier Ausgabemodi.
- **RT-2:** `net_delta = 0` gegenüber der Ur-Quelle bei nicht-mutierenden Speichervorgängen. Bewusste Ausnahmen: HEAD-Rewrite, dokumentierte CONC/CONT-Neuformatierung, Anonymisierung, Konvention-2→1-Übergang ([11 §4.3](11-Orte-Hoefe-Identitaet.md)).
- **RT-3:** Automatisierte, **headless** ausführbare Roundtrip-Tests für GEDCOM und GRAMPS (ohne UI, ohne Nutzer) — laufen build-frei ([02 INV-ARCH-2](02-Zielarchitektur-v9.md)).
- **RT-4 (Cross-Family, ADR-v9-126/-127):** `Format A → Modell → Format B → Modell'` ⇒ `Modell ≈ Modell'`. Byte-Gleichheit ist über Familiengrenzen (GEDCOM↔GRAMPS) unmöglich; die Metrik ist **Modell-Äquivalenz** (Kern-Genealogie erhalten). RT-1/2/3 sichern weiterhin die **native** Treue und bleiben unangetastet — RT-4 ist ein SEPARATER Pfad (Emission aus dem Modell), er darf keinen RT-1/2/3-Test aufweichen. Die Äquivalenz-Relation (welche Felder erhalten bleiben MÜSSEN, was dokumentiert verloren gehen DARF) definiert [ADR-v9-127](04-Entscheidungslog.md#adr-v9-127).

Test-Gates (Vorlage-Belege): `MeineDaten_ancestris.ged` (2811 Pers., 83k Z., Ancestris) → `net_delta=0` + `out1===out2`; `Unsere Familie.gramps` (2894 Pers.) → `xml1===xml2`.

### 1.1 RT-4-Äquivalenz `modelEquiv` + Coverage (BL-155)

Die RT-4-Metrik ist die reine Funktion **`modelEquiv(a, b): Diff[]`** (`core/interop/model-equiv.ts`) — `[]` = äquivalent. Da IDs cross-family remapped werden (ADR-v9-127 Entscheidung 2), vergleicht sie **nie über `id`-Gleichheit**, sondern über id-freie strukturelle Signaturen; Referenzen (Familie→Person, Zitat→Quelle, Ereignis→Medium) über die Signatur der aufgelösten Zielentität. Identitätsgate: `modelEquiv(db, db) === []` auf allen Fixtures inkl. beider Realdaten-Sätze.

**Was RT-4 erhalten MUSS** (Diff bei Abweichung): Personen (Namensteile, Geschlecht, Kern-Ereignisse BIRT/CHR/DEAT/BURI + `events[]` mit date/place/value, Zitat-Quellen, Medien-Datei-Referenzen, Familienlinks, Notiz), Familien (husband/wife/children als Personen-Signaturen, Ereignisse), Quellen, Repositories, Notizen, Orte/Höfe. **Was dokumentiert abweichen DARF** (kein Diff): `id` (remapped), GRAMPS-`grampsId`/`handle`, `wireOrigin`, `lastChanged`/`createdDate`, Passthrough-Rohbäume (`GedNode`, `MediaCitation.extra`), `shortName`, format-native Wert-Repräsentation (Datum/`form` — volle Normalisierung in BL-156/159).

**Coverage-Audit (an den Realdaten-Fixtures gemessen, 2026-07-26; Zensus reproduzierbar über `tests/core/_coverage-audit.census.test.ts`).** **Vorbehalt ([ADR-v9-178](04-Entscheidungslog.md#adr-v9-178)):** der Zensus lief gegen `MeineDaten_ancestris.ged` (7 MAR 2026, 2795 Personen); maßgeblich ist `Unsere Familie 2026.ged` (25 JUN 2026, 3180 Personen, gitignored außerhalb des Code-Repos). Für die Quellenfelder wichen alle nachgezählten Werte ab — jede Vorkommens-Zahl hier steht unter diesem Vorbehalt, bis der Wächter aus [32 TST-21](32-Testframework.md) die Grundlage festhält. Passthrough-only = im Datei-Backbone erhalten (LP-1), aber NICHT im Modell strukturiert — geht bei Cross-Family-Emission (BL-157/158) verloren, weil der Zielbaum aus dem Modell gebaut wird und den Quell-Backbone verlässt:

| Format | Passthrough-only (Auswahl, Vorkommen) | im Modell (kein Verlust) |
|---|---|---|
| GEDCOM | `INDI/FAM>_STAT` (44/2), `ADDR>CITY/POST/ADR1/_MAP/_LATI/_LONG` (`event.addr` ist Flach-String), `NOTE>_VALID`, `OBJE>_SCBK` (via `MediaCitation.extra`, edit-sicher) | `REFN`→`exids`, `_UID`→`uid`, Namensteile, Ereignisse, Zitate, Medien, `SOUR>DATA/AGNC` + `_DATE` (BL-217/243), `FAMC>SOUR` → `ChildLink.citations` (BL-328) |
| GRAMPS | `<attribute>` **komplett** (person 2838: `_UID` 2793, `_STAT` 46, `Cause` 16, `Telefon` 9, `E-MAIL` 2, `RESN` 1), `<srcattribute>`, `<note><style/range>` (Formatierung), `placeobj>coord/type/placeref/pname` (nur `title` projiziert) | `<url href>`→`repository.www`, `<objref>`→`MediaCitation`, `<childref>` mit `frel`/`mrel` + `<citationref>` → `ChildLink` (BL-329) |

**Kern-Asymmetrie für BL-156/157/158:** Felder, die GEDCOM ins Modell projiziert (`uid`, `email`, `cause`, `restriction`, Telefon), hält GRAMPS nur als generisches `<attribute>` im Passthrough — nicht im Modell. GRAMPS→GEDCOM verliert sie daher (Kandidat: diese `<attribute>`-Typen beim GRAMPS-Parse ins Modell projizieren, da `uid`/`email`/`cause`/`restriction` bereits Modellfelder sind); GEDCOM→GRAMPS muss sie umgekehrt als `<attribute>` emittieren. Die restliche Coverage-Schließung ist Backlog-Futter über M1/M2 (ADR-v9-127). **Nenner gegen die öffentliche Spec (BL-162).** Der Zensus oben misst nur `kommt vor` in zwei Bestandsdateien; der Möglichkeitsraum der Specs ist in `tests/core/spec-universe.ts` eingefroren — **aus den authoritativen Quellen SELBST extrahiert** (nicht via Summarizer, der 17 der 107 DTD-Elemente unterschlug; ADR-v9-124-Lehre): **GEDCOM 5.5.1** = 135 Standard-Tags (offizielles PDF, Appendix A), **GRAMPS 1.7.2** = 107 DTD-`<!ELEMENT>` (offizielle DTD, exakt die Fixture-Version). `tests/core/coverage-spec.test.ts` hält die Modell-Abdeckung dagegen (längen-gepinnt → Spec-Versionswechsel erzwingt Revision) und berichtet die Coverage-Quote:

- **GEDCOM 5.5.1: 76/135 Standard-Tags modelliert**, 59 passthrough-only (bei Cross-Family verloren) — LDS-Ordinanzen (`BAPL/SLGC/SLGS/ENDL/ORDI`), Record-IDs (`AFN/RFN/RIN`), Submitter (`SUBM/SUBN`), sowie `EMAI` (5.5.1-Schreibweise — nur die 7.0-Form `EMAIL` ist modelliert).
- **GEDCOM 7.0: 78/141 Standard-Tags modelliert** (BL-163; 141 aus der maschinenlesbaren FamilySearch-Registry `structure/standard/*.yaml`, selbst extrahiert — der HTML-Summarizer lieferte eine unvollständige Liste), 63 passthrough-only — zusätzlich zu den 5.5.1-Lücken die 7.0-Neuerungen `MIME/PHRASE/SCHMA/TRAN/SDATE/CROP/HEIGHT/WIDTH/TOP/LEFT/NO/INIL` u. a.
- **GRAMPS 1.7.2: 64/107 DTD-Elemente modelliert**, 43 passthrough-only — u. a. `attribute`/`srcattribute` (die Kern-Asymmetrie oben), `<address>`-Unterfelder (`street/city/state/…`), `style`/`range` (Notiz-Formatierung), `lds_ord`/`temple`/`sealed_to`, `tag`/`tags`/`tagref`, `bookmarks`/`namemaps`/`name-formats` (App-Konfig).

„0 Vorkommen" im Zensus heißt damit belegbar „nicht in diesen Dateien", nicht „nicht in der Spec". Die GRAMPS-Modell-Seite ist KONSERVATIV kuratiert (unsichere Elemente zählen als passthrough → die At-Risk-Menge ist eine sichere Obergrenze, kein verstecktes Risiko).

**Realisierte Cross-Family-Emission (BL-157/158, Vollbaum-Synthese aus dem Modell).** An den Realdaten gemessen, `modelEquiv`-Metrik, signatur-frei als kein-Verlust bestätigt:

- **GRAMPS→GEDCOM** (`buildGedcomTreeFromModel`): sauber — einzige `modelEquiv`-Abweichung `place`/`hof` als **Records** (GEDCOM kennt keine Ort-Records; die Ort-*Information* bleibt vollständig auf den Ereignissen, 0 `*.place`-String-Diffs). Personen/Familien/Quellen/Links/Zitate/Medien vollständig.
- **GEDCOM→GRAMPS** (`buildGrampsTreeFromModel`): kein struktureller Verlust (Personen/Familien/Quellen/`family.children`/husband/wife/events-Zählungen + given+surname-Multiset identisch). Die verbleibenden `modelEquiv`-Diffs sind dokumentierte **Repräsentationsgrenzen**, kein Verlust: `person.name` (GEDCOM-NAME-Zeile vs. GRAMPS-`given /surname/`-Rekonstruktion — Teile erhalten), `event.eventType` (`2 TYPE` ohne GRAMPS-Gegenstück), `place`-Records (String round-trippt), `childOf`/`parentIn` (GRAMPS trägt Familien-Links **nativ family-seitig** — der native Parser lässt die person-seitigen Slots leer, gilt also für JEDE GRAMPS-Datei), `source.text`, `source.dataEvents` (mehrwertig — s. §6), `INT`-Datumsqualifier. **`callNumber`/`callMedia` gehören NICHT (mehr) in diese Liste** ([ADR-v9-180](04-Entscheidungslog.md#adr-v9-180)): `<reporef>` trägt `callno` und `medium` als native Attribute — das Gegenstück liegt nicht im `<source>`, sondern eine Ebene tiefer.
- **RT-4-Gate (BL-159):** `tests/roundtrip/cross-family.test.ts` prüft beide Richtungen an Klein- + Realdaten über zwei Ebenen — signatur-freie Struktur-Invarianten (Zahlen + given/surname-Multiset) UND `modelEquiv` minus die obigen dokumentierten Kategorien ⇒ substantieller Rest = []. **Metrik-Härtung erledigt:** `modelEquiv`-Personen-Signatur läuft über Namens*teile* (nicht mehr den zusammengesetzten `name`-String, der cross-family zerbricht); der Cross-Namespace-Resolver-Bug ist in BL-157 gefixt. Beide waren durch das reine Identitäts-Gate `modelEquiv(db,db)` (BL-155) nicht sichtbar — erst der echte A→B-Pfad an Realdaten deckte sie auf.

---

## 2. Passthrough-Prinzip

Jedes Datei-Konstrukt, das der Parser nicht strukturiert modelliert, wird **verbatim** erfasst und bei der Ausgabe exakt reproduziert. Kein unbekannter Tag geht verloren (LP-1).

**Adress-Unterfelder werden GEHALTEN, nicht nur durchgereicht ([ADR-v9-228](04-Entscheidungslog.md#adr-v9-228)).** `ADR1`/`ADR2`/`ADR3`/`CITY`/`STAE`/`POST`/`CTRY` liegen als `Event.addrExtra` (`GedNode[]`) am Modell und werden verbatim zurückgeschrieben — sie zählen deshalb nicht mehr zu den passthrough-only-Tags, die bei Cross-Family verloren gehen. Modelliert im Sinne einer eigenen Semantik sind sie trotzdem nicht: die Spec weist sie als Index-Kopien der `ADDR`/`CONT`-Zeilen aus.

**Die Grenze des Passthroughs liegt beim MODELLIERTEN Elternknoten** ([ADR-v9-207](04-Entscheidungslog.md#adr-v9-207)). Ein Teilbaum überlebt, sobald sein Elternknoten wieder geschrieben wird — schreibt der Writer den Elternknoten NICHT, fällt der ganze Teilbaum mit. Deshalb braucht jedes modellierte Feld, dessen Tag auch **ohne Wert** vorkommen kann, einen dritten Zustand; sonst fällt „Tag fehlt" mit „Tag da, aber leer" zusammen und die Ausgabe lässt die Zeile weg. Konkret: `ADDR` ohne Wert, aber mit `ADR1`/`CITY`/`POST` darunter (→ Tristate, [10 §5.1](10-Domaenenmodell.md)). Umgekehrt gilt für **kanonisierte** Felder dasselbe eine Ebene höher: wo der Parser einen Wert an der Formatgrenze normalisiert (`FORM`→MIME), ist der Rohwert nicht rekonstruierbar und braucht einen eigenen Platz im Modell (`Media.formWire`) — sonst schreibt jedes Speichern ihn um. **Beides ist derselbe Satz: der Writer darf nur ändern, was jemand geändert hat.**

**Ein Modell-Slot je Wire-Konstrukt, das mehrfach vorkommen darf.** Kommt ein Tag im Bestand mehrfach am selben Träger vor, ist ein Skalarfeld die falsche Form. Wo die zweite Zeile eine eigene FACHLICHE Bedeutung hat, bekommt sie einen Platz im Modell: mehrere `1 NAME`-Zeilen (`extraNames`), `1 RELI` als Ereignis statt Skalar.

**Die Überlappungszone — und warum das Passthrough-Prinzip sie nicht abdeckt** ([ADR-v9-208](04-Entscheidungslog.md#adr-v9-208)). Der Passthrough rettet, was das Modell **nicht beansprucht**. Für einen beanspruchten Tag gilt umgekehrt „fehlt im Modell = vom Nutzer gelöscht" — und das muss so sein, sonst käme jeder gelöschte Wert bei jedem Speichern zurück. Dazwischen liegt die Zone, in der beide Regeln danebengreifen: **Tags, die das Modell beansprucht, aber nicht vollständig halten kann.** Zwei Formen, zwei Werkzeuge:

- **Ein Slot, mehrere Wire-Zeilen** (zweites `NOTE`/`TEXT`, `1 NAME` ohne Wert) → der **Überschuss**, allgemein und ohne Tag-Namen: der Emitter wird zusätzlich auf die Projektion des UNVERÄNDERTEN Originals angewandt; erzeugt er für einen Tag weniger Knoten, als das Original trägt, liegt das am Modell, und die überzähligen Knoten bleiben erhalten. Löscht dagegen der Nutzer, steht der Wert in dieser Probe weiterhin — kein Überschuss, die Löschung wirkt. Verglichen wird nur die **Anzahl je Tag**, nie die Struktur: der Emitter ordnet Kinder kanonisch um.
- **Wertraum enger als der Draht** (`QUAY 0` fällt mit dem Default 0 zusammen, `SEX U` mit dem Default U) → der dritte Zustand am Feld (`quay: … | null`, `sexSeen`). Der Überschuss allein genügt hier NICHT: er hält zwar die Bytes, zieht aber die alte Zeile zusätzlich wieder ein, sobald der Nutzer den Wert ändert — die Ausgabe trüge `QUAY 0` **und** `QUAY 2`.

**Die zweite Hälfte: der Wert-Halt** ([ADR-v9-209](04-Entscheidungslog.md#adr-v9-209)). Der Überschuss ist zähl-basiert und fängt keine **Wert-Umschreibung** — dort stimmt die Anzahl. Dieselbe Probe beantwortet auch diese Frage, nur auf den Wert statt die Menge: weicht der Original-Wert von der Probe ab, kann das Modell ihn nicht halten; stimmt die Probe zugleich mit der frischen Emission überein, hat der Nutzer nichts geändert — dann gilt die Quelle. Andernfalls gewinnt der Nutzer. Damit überlebt ein Enum-Wert, den das Modell nicht kennt (`_TSTAT erledigt`, `_HWGT 7`), **ohne dass sein Tag namentlich bekannt sein muss**.

Zwei Randbedingungen, ohne die der Halt schadet:

- **Die Probe braucht den Ausgangszustand, nicht den aktuellen.** Wird sie mit dem bereits editierten Seiten-Stand gespeist (`db.media`), hält sie einen Nutzer-Edit für eine Modell-Normalisierung und schreibt ihn zurück. Sie wird deshalb mit dem Medienstand der DATEI gebaut.
- **`CONC`/`CONT` machen den Wert zum Fragment.** Der volle Text steht erst mit den Fortsetzungs-Kindern da, und die baut der Emitter neu. Den Wert allein zurückzusetzen schneidet den Rest ab — mehrzeilige Werte bleiben deshalb außen vor (ihr Umbruch ist eine eigene Frage, s. unten).

**Der Zeilenumbruch ist eine Format-Frage, keine Modell-Frage** ([ADR-v9-211](04-Entscheidungslog.md#adr-v9-211)). GEDCOM 5.5.1 begrenzt eine physische Zeile auf **255 Bytes** und setzt den Rest mit `CONC` fort (`CONT` ist der echte Zeilenumbruch, ein anderer Tag für eine andere Sache); GEDCOM 7 kennt weder Grenze noch `CONC`. Deshalb sitzt der Umbruch in der **Serialisierung**, hinter jedem Modell-Vergleich — dort kann er Überschuss, Wert-Halt und Knoten-Paarung nicht beeinflussen, die Fortsetzungen ohnehin als Sonderfall behandeln. Drei Regeln:

- Gerechnet wird in **UTF-8-Bytes**, nicht in Zeichen, und ein Zeichen wird nie zerrissen (ein Umlaut zählt 2, ein Surrogatpaar 4).
- Die Fortsetzung eines `2 CONT` ist ein `2 CONC`, kein `3 CONC` — beide sind Geschwister unter demselben Elternknoten.
- **Die Naht liegt nie an einem Leerzeichen.** `CONC` fügt beim Zusammensetzen nichts ein, ein Leerzeichen an der Naht ist also inhaltlich korrekt — steht dann aber führend oder nachlaufend im Zeilenwert, und jeder trimmende Leser verliert es (`assembleLines`, das net_delta-Maß, eingeschlossen). Die Naht rückt deshalb nach links, bis kein Leerzeichen an ihr liegt. Die LESE-Richtung bleibt tolerant: fremde Schreiber schneiden hart, und der Parser trennt den Wert hinter genau einem Trennzeichen ab.

Der Umbruch ist **keine Wert-Änderung** — `assembleLines` faltet ihn zurück, `net_delta` bleibt 0. Deshalb wird auch eine überlange Passthrough-Zeile umbrochen (bewusst, benannt in [ADR-v9-211](04-Entscheidungslog.md#adr-v9-211)); eine konforme Zeile bleibt byte-identisch.

**Was der Halt NICHT leistet:** er rettet die Datei, nicht die Anzeige. Ein Wert, den das Modell nicht kennt, wird weiterhin normalisiert GELESEN — eine Aufgabe mit `_TSTAT erledigt` steht in der App auf „offen". Wo die Deutung zählt, braucht es weiterhin den Einzelfall (`_RESULT`, `_DONE`); der allgemeine Halt deckt die Bewahrung.

### 2.1 Anforderung an die v9-Umsetzung

> **Neuaufsatz-Hinweis:** v8 kennt **10 Ad-hoc-Passthrough-Kontexte** (verbatim lv=0-Records, INDI/FAM/SOUR-Subtrees, Event-Sub-Tags, ADDR-Sub-Tags, SOUR-Ref-Sub-Tags, OBJE-Blöcke, CHIL-SOUR …) — Altlast ([03 §4](03-Altlasten.md)). v9 entwirft **einen einheitlichen, generischen Passthrough-Baum**:

- **INV-PT:** Jeder geparste Knoten hält seine nicht-erkannten Kind-Zeilen an **genau einer** Stelle, in **Reihenfolge** und **Tiefe**. Ein einziger, testbarer Mechanismus statt zehn.

Konkret: der Parser baut zu jedem Record einen Baum aus `{tag, value, children[]}`; erkannte Knoten werden ins Domänenmodell projiziert, nicht erkannte bleiben als Roh-Teilbäume am nächsthöheren erkannten Knoten hängen. Der Writer serialisiert erkannte Felder an ihrer kanonischen Position und fügt die Roh-Teilbäume an definierter Stelle wieder ein.

### 2.2 GEDCOM-Datumsgenauigkeit-Fallen (aus v8 gelernt)

- Zeilen mit Level > 4 dürfen den Passthrough nicht abbrechen (sonst fallen tiefe OBJE/TYPE-Ketten weg).
- NAME-Kontext-Subtags (z. B. `NICK`) müssen direkt nach dem NAME-Block ausgegeben werden, nicht am Record-Ende.
- `\r\n`-Zeilenenden, UTF-8; HEAD wird neu geschrieben (`1 SOUR Stammbaum-App`), Rest verbatim.

### 2.3 Modellierte vs. verbatim `_`-Tags

Wird ein bisher verbatim durchgereichter `_`-Tag *modelliert* (editierbar gemacht), MUSS der Parser ihn aus dem Passthrough **herauslösen**, sonst Doppelschreibung pro Roundtrip (`_REPO_MODELLED`-Lehre). Beim Modellieren gilt: genau *eine* Writer-Stelle je logischem Kontext. Betrifft u. a. `_EVAL` (Evidenz), `_HYPO` (Hypothese), `_RTYPE`/`_FAURL` (Repository) — siehe [12](12-Forschungsdaten.md)/[10](10-Domaenenmodell.md).

### 2.4 Passthrough unter Edit, Merge und Cross-Family

- **Nativer Edit:** Ein geänderter Record behält seine nicht-erkannten Kind-Zeilen an Ort und Stelle (Merge-in-place, INV-PT); nur die erkannten Feldgruppen werden aus dem Modell neu geschrieben. Editieren einer Person/eines Ortes verliert ihren Passthrough NICHT.
- **Dedup/Merge:** Der Passthrough des Verlierer-Records wird verlustfrei in den Gewinner übernommen — Default, ohne Auswahl-UI ([ADR-v9-129](04-Entscheidungslog.md#adr-v9-129)). Mechanik: eine format-agnostische id-Liste `mergedRecordIds` am Modell; der Write-Back holt die un-modellierten, referenz-freien Zeilen der absorbierten Verlierer-Records und hängt sie byte-strukturell dedupliziert an (GRAMPS: an DTD-korrekter Position). **Gebaut: Personen-Merge, GEDCOM + GRAMPS** — damit umfasst das „verlustfrei"-Versprechen der Personen-Merge-Fläche ([20 §1.12](20-Funktionen.md)) auch die un-modellierten Zeilen. **Orts-/Hof-Dedup ([20 §1.8](20-Funktionen.md)) ist ausgenommen und offen** (BL-166): nur GRAMPS-`<placeobj>` trägt dort überhaupt Passthrough, und der ist real fast durchgängig modelliert (coord/ptitle/placeref/pname) — der un-modellierte Rest kommt kaum vor; zudem persistieren Orte in `orte.json` und werden für die Sync-Konflikterkennung byte-verglichen, was die id-Listen-Mechanik dort leck-anfällig macht (ADR-v9-129-Chronik).
- **Cross-Family-Emission:** Passthrough geht bewusst verloren — der Zielbaum wird nur aus dem Modell gebaut (RT-4, §1.1 At-Risk-Mengen). Deshalb Download/Suffix statt in-place ([14 §3.2](14-Dateihandling.md)).

---

## 3. GEDCOM 5.5.1 (Standard)

Kanonisches Ein-/Ausgabeformat. Vollständige Tag-Abdeckung für INDI/FAM/SOUR/REPO/NOTE. `db.gedVersion` steuert **nur** den Writer; der Parser liest 5.5.1 und 7.0. HEAD-Rewrite akzeptiert.

**Geo-Parsing:** `N52.21`→`52.21`, `S…`/`W…`→negativ. MAP auf Level 2 **und** 3 tolerieren (Legacy).

**ID-Vergabe:** `nextId(prefix)` = höchste vorhandene numerische ID + 1, je Typ (`I`/`F`/`S`/`R`).
**Startperson nach Load:** Person mit kleinster numerischer ID → `showTree(...)`.

---

## 4. GEDCOM 7.0 (opt-in Export)

Writer gibt 7.0 nur bei `gedVersion === '7.0'` aus. Unterschiede:

| Feature | GED5 (Standard) | GED7 (opt-in) |
|---|---|---|
| Fehlendes Ereignis | `1 NOTE Kein bekanntes Ereignis: BIRT` | `1 NO BIRT` |
| Externe IDs | `1 REFN` + `2 TYPE` | `1 EXID` + `2 TYPE` |
| Geteilte Notizen | `0 NOTE @xref@` | `0 SNOTE @xref@` |
| Übersetzungen | `_TRAN` | `TRAN` |
| Datum-Freitext | — | `PHRASE` unter DATE |
| ASSO-Rolle | `RELA` (Freitext) | `ROLE` (Enum) |
| CONC | erlaubt (255-Byte-Grenze) | abgeschafft — vorhandene `CONC` werden in den fortgesetzten Wert gefaltet |
| SCHMA | — | `1 SCHMA` deklariert die **tatsächlich geschriebenen** `_`-Tags (abgeleitet, keine gepflegte Liste — [05 BL-242](05-Backlog.md)) |

Cross-Transfer-Adapter GED7→GED5 und GED7→GRAMPS für Downgrade ohne Verlust wo möglich.

---

## 5. Strict GEDCOM 5.5.1 (opt-in Export)

Maximale Fremdkompatibilität — **ohne** proprietäre `_`-Tags. Mapping: `_UID`→`REFN`+`TYPE UID`, `_RUFNAME`→`NICK`, `_FREL/_MREL`→`PEDI`, `_TASK/_RLOG/_EVAL/_HYPO`→weglassen. Roundtrip-stabil (`out1===out2`), aber bewusst **nicht** verlustfrei. Dateiname-Suffix `_strict`, nie direkt speichern.

---

## 6. GRAMPS XML (read+write)

Vollwertiges, **bearbeitbares** Zweitformat (gzip XML). Kern-Genealogie wird ins gemeinsame Modell projiziert (nicht nur durchgereicht), damit ein GRAMPS-Dokument im Editor dieselben Felder trägt wie ein GEDCOM-Dokument; genuin nicht-modellierte Felder bleiben verlustfreier Passthrough via Handles (ADR-v9-114 legt die Projektion fest).

- **Referenzen zeigen auf Modell-`id`, nicht auf Datei-Handles.** GRAMPS verweist per `handle`; die Projektion übersetzt Handles beim Lesen in die Modell-`id`, das Write-Back schreibt sie zurück (Handles bleiben Fidelity-Felder, keine Primär-IDs — ADR-v9-11/BL-136).
- **Ereignisse** (Top-Level `<events>`, referenziert per `<eventref role>`) werden **by-reference** projiziert: `role="Primary"` → Ereignis des Personen-Owners (Main-Slots Birth/Christening/Death/Burial + `events[]`), `role="Family"` → Familien-Ereignis; andere Rollen (Witness/Godparent/…) → `Association` (ASSO). Ein geteiltes Ereignis bleibt EIN Record in `<events>` — nie in mehrere Owner dupliziert.
- **Datum:** GRAMPS-`<dateval>`/`<daterange>`/`<datespan>`/`<datestr>` ↔ `Event.date` (roher GEDCOM-Datumsstring) + `datePhrase`; Qualifier/Qualität nach dem GRAMPS-Writer (`from/to/before/after/about`, `estimated/calculated`).
- **Zitate:** zweistufig `citationref → <citation> → sourceref` → `Citation{sourceId, page, quay}`, `<confidence>` 0–4 → `quay` = `min(confidence,3)`.
- **Orte:** die Event-Projektion liefert den Orts-**String**; `placeId`/`hofId` leitet `services/places.applyPlaceResolution` ab (derselbe Weg wie GEDCOM-PLAC). `<placeobj>`-Koordinaten/Hierarchie/`type` bleiben vorerst Passthrough (volle `placeobj`↔`PlaceObject`-Abbildung: eigener Bauabschnitt).
- **Forschungsartefakte** ↔ `<attribute>` (JSON-serialisiert → „neue Felder gratis").
- **Quellen-Felder ohne natives Element** ([ADR-v9-180](04-Entscheidungslog.md#adr-v9-180)): `<source>` führt laut DTD `(stitle?, sauthor?, spubinfo?, sabbrev?, noteref*, objref*, srcattribute*, reporef*, tagref*)` — **kein Datums-Element**; das einzige Datum ist das Pflicht-Attribut `change` (= `CHAN`). Was dort kein Element hat und **einwertig** ist, reist als **`<srcattribute type/value>`** an der DTD-Position (nach `objref*`, vor `reporef*`), Schlüssel = der GEDCOM-Tagname: `externalRefs` (`REFN`), `agnc` (`AGNC`), `createdDate` (`_DATE`) — dieselbe Mechanik wie die Evidenz-Achsen am `<citation>` (ADR-v9-175), und die Form, die GRAMPS selbst schreibt (`<srcattribute type="REFN" …/>`). **`dataEvents` reist NICHT mit:** ein Eintrag trägt drei Felder (Arten, Zeitraum, Ort), `<srcattribute>` nur ein `value`; eine zusammengesetzte Zeichenkette wäre eine erfundene Kodierung in einem nutzersichtbaren Feld. Der Verlust ist eine benannte Repräsentationsgrenze (§1), keine stille Lücke. **Nicht** als `<note>`: das ist GRAMPS' eigene Verlustform beim GEDCOM-Import (`1 DATA` → „Tag erkannt, aber nicht unterstützt"), sie wird nicht zur Absicht erhoben.
- **Signatur:** `callNumber` → `reporef/@callno`, `callMedia` → `reporef/@medium` — native Attribute, kein `srcattribute`.
- Roundtrip `xml1===xml2`. Notizen/Zitate werden dedupliziert (gemeinsame Handles) — stabil, kein Datenverlust.
- **Test-Seam:** synchrone `buildXMLText(db)` / `parseXMLText(xml)` ohne gzip/Blob, damit der GRAMPS-Roundtrip headless ohne Web-Plattform-APIs testbar ist.

**Offene Frage: dedizierte GRAMPS-Tags-/Attribute-UI.** GRAMPS kennt neben den in `<attribute>` verpackten Forschungsartefakten auch eigene `<tag>`-Referenzen und freie `<attribute>`-Paare außerhalb des Forschungsdaten-Modells (Anwenderklassifikation, Notizen-Kategorien). Datenerhalt ist bereits über den generischen Passthrough garantiert (LP-1) — offen ist nur, ob eine GRAMPS-spezifische Anzeige-/Bearbeitungs-Oberfläche dafür entsteht (Tag-Pillen, editierbarer Attribut-Abschnitt) oder ob Passthrough-Erhalt ohne eigene UI genügt. Entscheidung vertagt bis zum GRAMPS-Import-Bauabschnitt.

---

## 7. Anonymisierter Export (DSGVO)

Opt-in **je Export** (kein persistenter Modus, der die Bedeutung des Speichern-Knopfes ändert) und **orthogonal zum Format**: kein eigener `ExportFormat`-Wert, sondern ein Schalter am selben Rohr ([14 §3.2](14-Dateihandling.md)), kombinierbar mit 5.5.1/Strict/GED7. Das Bezugsjahr wird injiziert (kein Wall-Clock im Kern).

**Klassifikation lebender Personen in drei Phasen:**
1. **datumbasiert** — kein Sterbedatum + Geburts-/Taufjahr **≥** Bezugsjahr−100 → lebend; ein Sterbedatum ODER ein Geburtsjahr davor → **verstorben**. Die Grenze schließt ein (ADR-v9-95).
2. **BFS-Propagation über Verwandte** (Ehepartner, Eltern↔Kinder) — sie läuft **ausschließlich über undatierte Verwandte**: wer in Phase 1 als verstorben eingestuft ist, wird nie durch Propagation lebend und leitet sie nicht weiter. Ohne diese Bremse erreicht die Kante jede zusammenhängende Linie bis ins 17. Jahrhundert und schwärzt praktisch den ganzen Bestand (gemessen: 2767 statt 689 von 2795 Personen).
3. **konservativ** — Personen ganz ohne Datum → lebend.

**Was geschwärzt wird:** INDI-Records lebender Personen behalten nur `NAME Lebende Person` + `SEX` + Familienlinks (`FAMC`/`FAMS`). FAM-Records mit mindestens einem lebenden Partner behalten `HUSB`/`WIFE`/`CHIL`, verlieren aber Datum/Ort/Quellen ihrer Familien-Ereignisse (`MARR`/`DIV`/…) — ein Hochzeitsdatum ist ein personenbezogenes Datum der Lebenden.

**Was der Export nicht anfasst:** Dateiname-Suffix `_anon`, nie in-place (auch nicht bei 5.5.1 mit vorhandenem Handle, [14 §4](14-Dateihandling.md)), Original und Arbeitskopie unberührt — die Schwärzung ist eine reine Funktion auf einer Kopie, ihr Ergebnis fließt nie in den App-Zustand zurück.

---

## 8. Design-Constraint für alle neuen Features

> Jedes neue Feature muss den GEDCOM-Roundtrip (`out1===out2`, `net_delta=0`) stabil halten. Neue Datenstrukturen erzeugen beim GEDCOM-Export keinen zusätzlichen Delta — entweder als Passthrough oder als bekannte, dokumentierte Abweichung. Jede Abweichung wird explizit dokumentiert (in v8: ADR; in v9: hier bzw. im betroffenen Subsystem-Spec).
