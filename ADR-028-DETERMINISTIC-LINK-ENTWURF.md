# ADR-028 — Deterministische Identitäts-Auflösung Event→Ort/Hof: Persistenz durch Daten, nicht durch Annotationen

> **Status: 🟠 IN UMSETZUNG** — Phase 0 (Sign-Off) erteilt 2026-06-21, Phase 1 ✅ (sw v1026), Phasen 2–6 ausstehend.
> Ergänzt ADR-024 (Orts-Entität) + ADR-027 (Hof-Entität).

## Kontext

Nach ADR-024/026/027 lebt die Identitäts-Information in drei Schichten: `placeObjects` (Verwaltungseinheiten, cross-device via `orte.json`), `hofObjects` (Höfe, gleicher Sync-Kanal seit ADR-027 P1) und die Event-Felder `ev.placeId`/`ev.hofId` als Auflösungs-Ergebnis. Die ersten beiden persistieren ehrlich; die dritten sind **runtime-only** — jeder Load löst sie neu auf, geschrieben werden sie weder ins GEDCOM noch in `orte.json` (Konsistenz-Begründung: stammbaum-spezifische Auflösungen wären auf Cross-Stammbaum-Storage architekturfremd).

Das funktioniert nur, wenn die Auflösungs-Funktion **total und deterministisch** ist. Heute ist sie *partiell* — und genau die Lücken äußern sich als die zwei aktuell gemeldeten Klassen von Bugs:

1. **„Höfe in der Ortsliste"** — Pfad A/B/C ([gedcom.js:1259ff](gedcom.js)) setzen `ev.placeId`/`ev.hofId`, lassen den Projektions-Cache `ev.place` aber stehen. `collectPlaces` ([ui-views-place.js:151](ui-views-place.js:151)) keyt nach Roh-String, listet die stale Projektion als eigenen Eintrag, die Registry-Pass-Anreicherung verleiht ihm den Village-Typ als Badge. Plus: Farm/Building-POs ohne `villageId` werden von der ADR-027-Phase-3-Migration übersprungen ([gedcom.js:1697](gedcom.js)) und bleiben als Zombies in `placeObjects`. Beide Effekte kumulieren.

2. **„RESI verliert Ortszuordnung"** — Wire-Konvention 3 (`PLAC Wall 33` atomar, kein ADDR, kein Komma) wird vom heutigen Link-Pass nicht erfasst: Pfad A/C verlangen Komma, Pfad B verlangt bereits gesetzte `ev.placeId`, `_placeLink` Fall 1 sucht in `placeObjects` (Farm-POs nach Phase 3 weg). Zusätzlich: Pfad B greift nur bei *existierenden* hofObjects — bei Konvention 2 (`PLAC Dorf, … + ADDR Hof`) ohne vorab modellierten Hof landet das Event ohne Hof-Link.

Beide Bugklassen werden derzeit als „Migrations-Fehlfunktion" wahrgenommen. Tatsächlich sind sie **Determinismus-Lücken** der Auflösungs-Funktion. Eine zusätzliche Persistenz-Schicht (Sidecar `event_links.json` oder Custom-Tags `_HOFID`/`_PID`) wurde im Design-Dialog erwogen und verworfen: Sidecar verletzt die Architektur-Trennung „Cross-Stammbaum-Referenz vs. stammbaum-spezifische Genealogie"; Custom-Tags brechen die Norm „spezifische Tags nur als letzte Ausnahme". Die richtige Antwort ist, die Auflösungs-Funktion *total* zu machen — dann ist ihre Wiederholung beim Load die Persistenz.

## Entscheidung

**Architekturprinzip:** `(ev.placeId, ev.hofId)` ist eine **reine, totale, deterministische Funktion** über die implizite Information:

```
resolve(ev, placeObjects, hofObjects) → (placeId | null, hofId | null, place', addr')
```

Eingaben sind ausschließlich der Event-Inhalt (`ev.type, ev.place, ev.addr, ev.date`) und die Referenz-Daten (`placeObjects`, `hofObjects`). Ausgabe enthält *zusätzlich* die periodengerecht reprojizierten Cache-Strings `place'`/`addr'`. Es gibt keine Persistenz-Schicht für das Ergebnis — die Wiederholung der Funktion beim Load **ist** die Persistenz.

Wo die Funktion heute partiell ist, schließen wir die Lücken auf zwei Achsen, beide kongruent zum Prinzip:

- **Algorithmus-Vollständigung**: jede Klasse von Eingaben, die deterministisch auflösbar wäre, MUSS aufgelöst werden (keine künstlichen Komma- oder Existenz-Bedingungen). Die Erweiterung nutzt **vorhandene Semantik-Träger** als zweite Quell-Anker: bei Konvention 1 die rich-PLAC-Struktur (Pfad C, schon implementiert), bei Konvention 2 den Event-Typ (`RESI`/`PROP`/`CENS`/`OCCU` deklarieren „ADDR ist Hof"), bei Konvention 3 das globale hofObjects-Wissen.

- **Daten-Anreicherung als ehrlicher Fallthrough**: wo die Eingaben genuin lückenhaft sind, surface das System die Lücke (Review-Badge) und bietet dem User **drei Anreicherungs-Pfade**, die alle das nächste-Load-Determinismus herstellen — ohne event-lokale Annotationen:
  - **Quelle schärfen** → editiert `PLAC`/`ADDR` des Events (Anreicherung im GED/GRAMPS).
  - **Hof anlegen** → erzeugt `hofObject` aus Event-Kontext (Anreicherung in `orte.json`).
  - **Wissen ergänzen** → fügt `addrs[]`-Variante an Hof / `pnames[]`-Variante an Ort / Typ-Annotation an Ort hinzu (Anreicherung in `orte.json`).

Der Review-Badge ändert damit seine Rolle: kein Entscheidungs-Speicher mehr (wie in ADR-027 Phase 5 angelegt), sondern **Daten-Lücken-Anzeiger** mit Anreicherungs-Aktionen.

## Modell — Algorithmus-Spezifikation

### Wire-Konventions-Matrix

| Konvention | Eingabe | hofObject existiert | hofObject existiert noch nicht |
|---|---|---|---|
| **1** Ancestris-Standard | `PLAC Hof, Dorf, … + ADDR Hof` | Pfad A (existing) | Pfad C — Bootstrap aus rich-PLAC-Struktur |
| **2a** MyHeritage/GRAMPS, Hof-Event | `PLAC Dorf, … + ADDR Hof`, `ev.type ∈ {RESI,PROP,CENS,OCCU}` | Pfad B (existing) | **Pfad B' — Bootstrap aus Event-Typ-Semantik** |
| **2b** MyHeritage/GRAMPS, sonstiges Event | `PLAC Dorf, … + ADDR …`, `ev.type ∈ {BIRT,DEAT,MARR,BURI,BAPT,…}` | Pfad B (existing) | Review (Event-Typ trägt keine Hof-Semantik) |
| **3a** atomar, Hof global eindeutig | `PLAC Wall 33` (kein ADDR) | **Pfad A' — atomarer Hof-Lookup** | — |
| **3b** atomar, mehrdeutig oder unbekannt | `PLAC Wall 33` | Pfad A' blockiert bei Mehrdeutigkeit → Review | Review (kein Dorf-Kontext) |

Drei algorithmische Ergänzungen ggü. dem Stand v1025 (Pfad C):
- **Pfad A'** — Erweiterung von Pfad A auf atomare PLAC-Strings: wenn `!ev.place.includes(',')` und Fall 1 (placeObject-Match) leer ist, dann `hofReg.findAllByAddr(ev.place)` **global** (ohne Village-Scope). Eindeutig → Link, mehrdeutig → Review.
- **Pfad B'** — Bootstrap-Variante von Pfad B: wenn `ev.placeId` aufgelöst, `ev.addr` non-empty, kein hofObject im Dorf-Scope matcht, **und** `ev.type ∈ {RESI, PROP, CENS, OCCU}` → `findOrCreateHofObject(ev.addr, ev.placeId)`, `ev.hofId = neuer-id`. Begründung: der Event-Typ deklariert die Hof-Semantik genauso unzweideutig wie rich-PLAC bei Pfad C.

### Auflösungs-Reihenfolge (deterministisch)

```
resolve(ev):
  year ← _placeYear(ev.date)

  # 1. Bereits aufgelöst (z.B. aus GRAMPS-Parser oder voriger Mutation) → durchreichen
  if ev.placeId ∧ ev.hofId: return REPROJECT(ev, year)
  if ev.placeId ∧ kein hofObject erwartet: return REPROJECT(ev, year)

  # 2. Hof-Match aus PLAC-Leitsegment (Konvention 1 mit existierendem Hof)
  if PfadA(ev, year): return REPROJECT(ev, year)

  # 3. Atomarer Hof-Lookup (Konvention 3a)
  if PfadAprime(ev, year): return REPROJECT(ev, year)

  # 4. Ort-Match (Verwaltungs-Hierarchie via Fall 1 / 2a / 2b)
  PlaceLink(ev, year)            # setzt ev.placeId wenn Verwaltungs-PO matcht

  # 5. Hof-Bootstrap aus rich-PLAC (Konvention 1 ohne Hof)
  if PfadC(ev, year): return REPROJECT(ev, year)

  # 6. Hof-Match via ADDR im Dorf-Scope (Konvention 2 mit Hof)
  if PfadB(ev, year): return REPROJECT(ev, year)

  # 7. Hof-Bootstrap aus ADDR + Event-Typ (Konvention 2a ohne Hof)
  if PfadBprime(ev, year): return REPROJECT(ev, year)

  # 8. Kein Match → Review-Badge zählt; Felder bleiben null
  return REPROJECT(ev, year)


REPROJECT(ev, year):
  if ev.hofId:
    ev.place ← buildPlacForGedcom(ev, year)            # Hof, Dorf, …
    ev.addr  ← resolveAddrAsOf(ev.hofId, year) ∨ ev.addr
  elif ev.placeId:
    ev.place ← _buildFormString(ev.placeId, year)       # Dorf, …
  # sonst: ev.place/ev.addr bleiben unverändert (kein Anker)
  return (ev.placeId, ev.hofId, ev.place, ev.addr)
```

Vier strukturelle Eigenschaften der Spezifikation:

- **Reihenfolge ist begründet**: Hof-Pfade vor Place-Pfaden (Hof ist spezifischer als Dorf); Bootstrap-Pfade nach den jeweiligen Match-Pfaden (vorhandenes Wissen vor Neuanlage); Pfad C vor Pfad B' (rich-PLAC ist strikterer Anker als Event-Typ-Heuristik).
- **REPROJECT am Ende jedes erfolgreichen Pfads** ist die fehlende Hälfte der ADR-024-Projektions-Invariante: `ev.place` ist die zwischengespeicherte Projektion, **immer**. Ohne diese Zeile bleibt der Cache stale, `collectPlaces` zeigt Phantom-Einträge.
- **Idempotenz**: zweiter Aufruf von `resolve(ev)` auf identische Eingabe ändert nichts. Bootstrap-Pfade nutzen `findOrCreateHofObject` (idempotent über Norm-Key); REPROJECT ist eine Funktion (gleiches Input → gleicher Output).
- **Totalität**: jeder Eingangs-Event terminiert mit einem Ergebnis (auch wenn `placeId`/`hofId` null bleiben). Kein silent-drop.

### Migration ohne villageId — keine Skip-Pfade mehr

ADR-027 Phase 3 überspringt heute Farm/Building-POs ohne `villageId` ([gedcom.js:1697](gedcom.js)). Diese überleben in `placeObjects`, taucht in `collectPlaces` auf (Quelle Bug #1 Teil 2). Korrektur:

```
für jedes Farm/Building-PO ohne villageId:
  villageStr ← _hofVillageString(db, po.title)       # häufigste ev.place der zugehörigen Events
  wenn villageStr:
    villagePO ← _findOrCreatePO(villageStr, type='Unknown')
    po.enclosedBy ← [{ placeId: villagePO.id, dateFrom: null, dateTo: null, dateType: null, _dateRaw: null }]
    # jetzt regulär migrierbar: Phase-3-Schleife nimmt es im nächsten Durchlauf mit
  sonst:
    # echter Orphan: kein Event referenziert diesen PO → in Review als "Hof ohne Bezug" markieren
```

Damit gibt es keinen Pfad mehr, der ein Farm/Building-PO im post-Migration-Zustand zurücklässt.

## Lese-Seite konsolidiert

`_eventPlaceId(ev)` (Stufe 1, v1005) ist der korrekte Chokepoint für die Frage „welches Dorf hat dieses Event?" — aber er wird heute nur in `_matchPlace` + `_placeUsageCounts` genutzt. Andere Aggregatoren (`collectPlaces`, `buildHofIndex`, Hofchronik, Statistik, Map) gehen weiter über Roh-Strings oder direkte `findByName`-Aufrufe. Damit ist die Determinismus-Garantie nur partial auf der Lese-Seite sichtbar.

Zwei strukturelle Änderungen:

### `_eventPlaceId` + `_eventHofId` als einzige Lese-Chokepoints

Neuer Helper `_eventHofId(ev) → hofId | null` analog `_eventPlaceId`:
- Zweig A: `ev.hofId` (Wahrheit).
- Zweig B: `getHofRegistry().findByAddr(ev.addr, year)` mit `villageId === _eventPlaceId(ev, year)`-Filter (Projektion).

Beide Helper werden in **jedem** Aggregator verwendet — keine direkten `ev.placeId`/`findByName`-Reads außerhalb des Link-Passes mehr. Damit ist die Projektions-Invariante auch für Caches strukturell erzwungen.

### `collectPlaces` id-keyed statt string-keyed

Heute: `Map<placeName-string, {personIds, eventTypes, lati, …}>`. Konsequenz: derselbe Ort unter zwei Cache-Strings (z.B. „Ochtrup" + „Ochtrup (Westf.)") ergibt zwei Einträge; Stale-Strings nach Pfad-Match ergeben Phantom-Einträge.

Neu: `Map<placeId | normString, …>`. Primärschlüssel ist `_eventPlaceId(ev)`; nur Events ohne aufgelöste placeId fallen auf den Roh-String zurück (zweiter Bucket „unverknüpfte Strings"). Display-String bleibt die periodengerechte Projektion (`_buildFormString(placeId, repräsentatives Jahr)`).

Konsequenz: Bug #1 strukturell ausgeschlossen, auch bei vergessenen REPROJECTs. Wenn die `placeId` da ist, gibt es genau einen Listen-Eintrag — egal wieviele Cache-String-Varianten in den Events stehen.

`buildHofIndex` läuft analog auf `_eventHofId`-keyed um.

## Review-Badge als Daten-Anreicherungs-UI

Phase 5 von ADR-027 hat den Review-Badge als Speicher für per-Event-User-Entscheidungen angelegt („Hof wählen", „+ neu anlegen", „Ignorieren"). Unter dem Determinismus-Prinzip wird er zur **Daten-Lücken-Anzeige** mit drei Anreicherungs-Aktionen:

| Klasse | Anzeige | Aktionen |
|---|---|---|
| **A — Pfad B' für non-Hof-Event** | „RESI/PROP/CENS/OCCU-Event ohne ADDR-Hof — nur bei BIRT/DEAT/etc. wird hier nichts angelegt" | nur Hand-Aktionen verfügbar (s.u.) |
| **B — atomare PLAC ohne Match** | „Atomarer Ort `Wall 33` — kein Dorf-Kontext ableitbar" | „Quelle schärfen" (PLAC erweitern) |
| **C — Mehrdeutigkeit** | „2 Höfe `Schmiede` matchen — Ochtrup und Bocholt" | „Quelle schärfen" (Dorf/Disambiguierungs-Token in PLAC), oder „Wissen ergänzen" (eine Hof-Variante schärfer benennen) |
| **D — Norm-Drift** | „ADDR `Wall 33` matcht kein hofObject (nächst-ähnlich: `Wall 33 (Metelener Str.)`)" | „Wissen ergänzen" (Variante zum Hof hinzufügen) |
| **E — Fremde Verwaltung im PLAC-Rest** | „PLAC-Rest `Franklin County, Indiana` matcht keine Vorfahren-Kette" | „Wissen ergänzen" (pname an Verwaltungs-PO) ODER „Quelle schärfen" |

Drei Aktions-Typen, alle persistent am korrekten Ort:

1. **Quelle schärfen** — editiert `ev.place`/`ev.addr` direkt. Persistenz: GED/GRAMPS-Wire beim nächsten Save. Stammbaum-spezifisch.
2. **Hof anlegen** — `findOrCreateHofObject` mit User-bestätigten Feldern. Persistenz: `orte.json` (cross-device). Cross-Stammbaum-Referenz.
3. **Wissen ergänzen** — `mutateHofObject` (addrs[]) / `mutatePlaceObject` (pnames[]/type). Persistenz: `orte.json`. Cross-Stammbaum-Referenz.

**Was wegfällt:** der „Ignorieren"-Pfad aus ADR-027 Phase 5 (Event als bewusst nicht-Hof markieren). Determinismus-äquivalent: User legt einen `placeObject` Typ `Hospital`/etc. an und passt PLAC an — der Event landet dann in Fall 2a, der Hof-Pfad feuert nicht, der Badge-Zähler sinkt automatisch. Ein per-Event-Ignore-Flag wäre die eine Stelle, an der event-lokale Annotation entstehen müsste; die Datenanreicherungs-Variante erreicht dasselbe ohne Annotation.

Badge-Zähler ist Größe der Vereinigung der fünf Klassen. Im Idealzustand (vollständig gepflegte Daten) → 0.

## Restklasse — was strukturell offen bleibt

Es gibt genau **zwei** Klassen, die durch keine der drei Aktionen aufgelöst werden:

1. **Der Genealoge weiß die Antwort selbst nicht.** Z.B. „1845 wohnte er bei der Tante, vermutlich auf dem Schmiede-Hof, aber welcher der zwei Schmieden im Dorf?". Der Badge bleibt für diesen Event dauerhaft sichtbar. Das ist die korrekte Antwort des Systems: es lügt nicht über Ungewissheit.

2. **Geschwächte Wire-Konvention 2b.** Ein `BIRT/DEAT` mit `ADDR` und Konvention-2-PLAC (Dorf + freie Adresse) bleibt im Review, weil der Event-Typ keine Hof-Semantik trägt. User-Aktion „Hof anlegen" löst es; ohne User-Aktion bleibt der Badge. Selten in der Praxis (BIRT/DEAT ohne PLAC-Hof-Präfix ist meist Krankenhaus, nicht Hof — der Badge zeigt das richtig an).

Beide Klassen sind nicht Algorithmus-Schwächen, sondern Konsequenzen unvollständiger Quelldaten. Das System tut hier richtig, sie sichtbar zu machen.

## Migrationsplan

Sechs Phasen, jede einzeln testbar, Pre-Commit-Gate (`test-csp` + `test-unit` + `test-snapshot-place`) + Roundtrip zwischen den Phasen. Wo Phase auf real-Datenbestand wirkt, vorher Backup analog ADR-027 P3 (`_backupPre…` in IDB).

### Phase 0 — Entwurf gefroren ✅ (2026-06-21)

Sign-Off erteilt. Implementation gestartet.

### Phase 1 — REPROJECT + Migration-ohne-Skip ✅ (sw v1026, 2026-06-21)

- **REPROJECT-Wrapper** in `_linkGedcomEventsToPlaceObjects` an allen vier Pfad-Enden (A, A', B, C; B' kommt in Phase 4). Mechanische Änderung, kein neuer Pfad.
- **`_migrateFarmPOsToHofObjects` ohne Skip** ([gedcom.js:1697](gedcom.js)): bei fehlendem `villageId` zuerst `_hofVillageString` → `_findOrCreatePO`, dann regulär migrieren. Echte Orphans (PO ohne Event-Referenz) explizit markieren statt überspringen.
- **Tests:** REPROJECT-Idempotenz pro Pfad, kein Stale-Cache nach Link-Pass, Migration ohne villageId terminiert für alle realen Fixtures.
- **Gate:** alle bestehenden Tests grün; `collectPlaces.size` auf `MeineDaten_ancestris.ged` sinkt (Zombie-POs verschwinden); GEDCOM `net_delta=0` + `out1===out2` stable; GRAMPS xml1===xml2 stable.

### Phase 2 — Pfad A' (atomarer Hof-Lookup, Konvention 3a)

- Erweiterung in `_linkGedcomEventsToPlaceObjects`: vor `_placeLink`-Fall 1 (atomar) ein `hofReg.findAllByAddr(ev.place)`-Versuch ohne Village-Scope. Eindeutig → Link inkl. `ev.placeId = hof.villageId`. Mehrdeutig → blockieren (Review).
- Reihenfolge gegen Fall 1: Village-Match in placeObjects gewinnt (ein PO „Berlin" als Stadt schlägt einen hofObject „Berlin" als Hof — unwahrscheinliche aber definierte Auflösung).
- **Tests:** atomar mit globalem Single-Match, atomar mit Multi-Match (Block), atomar mit Village-Konflikt (Village gewinnt).
- **Gate:** Konvention-3-Fixture (Hof „Wall 33" global eindeutig) wird ohne User-Touch aufgelöst; bestehende Roundtrips stable.

### Phase 3 — Lese-Seite konsolidiert

- `_eventHofId(ev)` neu in `gedcom.js` analog `_eventPlaceId`. API-Whitelist + Tests.
- `collectPlaces` umgestellt auf `Map<placeId | normString, …>`-Keyer; Fallback-Bucket für unverknüpfte Strings beibehalten.
- `buildHofIndex` umgestellt auf `_eventHofId`-Keyer.
- Alle externen `ev.placeId`-Direkt-Reads in Aggregatoren (Statistik, Map, Hofchronik, Story, etc.) auf `_eventPlaceId`/`_eventHofId` umgestellt — Grep-Gate auf `\.placeId` außerhalb von `gedcom.js`/`gedcom-writer.js`/`gedcom-parser.js`/`gramps-*.js`/`storage*.js` als CI-Check.
- **Tests:** id-keyed Aggregation deduppt mehrere Cache-Strings auf eine Listen-Zeile; Hofchronik aggregiert über hofId, nicht addr.
- **Gate:** alle bestehenden View-/Aggregator-Tests grün; Bug #1 in Realdaten-Browser-Test nicht mehr reproduzierbar.

### Phase 4 — Pfad B' (Bootstrap aus Event-Typ-Semantik, Konvention 2a)

- Konstante `HOF_BOOTSTRAP_EVENT_TYPES = {'RESI', 'PROP', 'CENS', 'OCCU'}` in `gedcom.js`.
- `_tryHofBootstrapFromAddr(ev, year)` in `_linkGedcomEventsToPlaceObjects` *nach* `_tryHofAddrLink` (Pfad B): wenn `ev.type ∈ HOF_BOOTSTRAP_EVENT_TYPES`, `ev.placeId` gesetzt, `ev.addr` non-empty, kein Hof-Match → `findOrCreateHofObject(ev.addr, ev.placeId)`.
- Toast-Klasse `linkedHofTypeBootstrap` parallel zu `linkedHofBootstrap`.
- **Tests:** RESI/PROP/CENS/OCCU mit ADDR ohne Hof → Auto-Anlage; BIRT/DEAT mit ADDR ohne Hof → Review (keine Auto-Anlage); RESI mit ADDR und bestehendem Hof → Pfad B (kein Bootstrap).
- **Gate:** `Unsere Familie 2026.ged` (MyHeritage-Export, Konvention-2-lastig) wird nach erstem Load ohne User-Touch vollständig verlinkt; Roundtrip: erster Save ist bewusster Konvention-2→1-Übergang (sichtbar via Toast + `markChanged`), `out2===out3` idempotent.

### Phase 5 — Review-Modal als Daten-Anreicherungs-UI

- Klassifizierung der unaufgelösten Events in die fünf Klassen A–E.
- Aktions-Buttons pro Klasse (siehe Tabelle oben). „Quelle schärfen" öffnet Event-Edit-Form vorgefüllt; „Hof anlegen" öffnet Hof-Edit-Modal mit Vorbelegung; „Wissen ergänzen" öffnet das passende Sub-Modal (addrs / pnames / type).
- „Ignorieren"-Pfad aus ADR-027 P5 entfernt. Migrations-Schritt: alte Ignorier-Markierungen (falls in localStorage gespeichert) → User-Toast „N markierte Events erneut zu sichten" + Reset.
- **Tests:** UI-Logik via T0-UI-Harness (`_uiReset`, ClickMap-Dispatch). Aktion „Hof anlegen" am Sample-Event setzt korrekt `hofObject` + nächster Load auflöst deterministisch.
- **Gate:** Browser-verifiziert an Realdaten; alle Tests grün; Handbuch-Stand nachgezogen (Review-Badge dokumentiert).

### Phase 6 — Cleanup

- Wenn nach 2 Versionen keine Re-Verifikations-Korrekturen mehr nötig waren:
  - `_migration_pre_adr027` Flag-Logik vereinfachen (kein Backup-Bedarf für reine Algorithmus-Phasen).
  - Code-Hygiene-Gate erweitern: `grep -rE "\.placeId" --include="*.js"` außerhalb der zugelassenen Module = leer.
  - Memory `place_hist.md` mit ADR-028-Lehren ergänzen.

## Konsequenzen

**Was strukturell besser wird:**

- **Eine Funktion, eine Antwort.** `resolve(ev, refs)` ist total und deterministisch — jeder Load erzeugt denselben Zustand. „Wo ist dieses Event?" hat genau eine Antwort, lese-seitig durch zwei Chokepoints (`_eventPlaceId`/`_eventHofId`) materialisiert.
- **Persistenz an der konzeptuell richtigen Stelle.** Stammbaum-spezifische Anreicherungen landen im GED/GRAMPS (`PLAC`/`ADDR`-Schärfung). Cross-Stammbaum-Wissen landet in `orte.json` (`hofObjects.addrs[]`, `placeObjects.pnames[]/type`). Keine event-lokalen Annotationen, kein Sidecar, keine Custom-Tags.
- **Cache-Konsistenz garantiert.** `ev.place` ist nach jedem Pfad-Match die periodengerechte Projektion — die ADR-024-Invariante wird zum ersten Mal vollständig durchgesetzt.
- **Bug-Klassen strukturell ausgeschlossen.** Bug #1 („Höfe in Ortsliste") durch REPROJECT + id-keyed Lesen + Migration-ohne-Skip. Bug #2 („RESI verliert Zuordnung") durch Pfad A' + Pfad B'.
- **Review-Badge spricht Wahrheit.** Sein Inhalt = genuin lückenhafte Quelldaten, nicht „Algorithmus war zu schwach".

**Was sich für externe Konsumenten nicht ändert:**

- GEDCOM-Wire: byte-identisch in Konvention 1 (`out1===out2` ist Akzeptanzkriterium). Konvention 2 + 3 bekommen beim ersten Save den Konvention-1-Übergang (sichtbar, einmal), danach idempotent — exakt das bereits etablierte ADR-024/027-Muster.
- GRAMPS-Wire: bit-identisch (`xml1===xml2`), keine neuen Tags.
- `orte.json` Schema: unverändert (v2 aus ADR-027 P1). Nur die Inhalte werden reicher (mehr `addrs[]`-Varianten, mehr `pnames[]`-Aliase, mehr Typ-Annotationen).

**Risiken:**

- **Pfad B' false positives:** Ein `RESI` mit `ADDR Krankenhaus St. Joseph` (seltener Langzeitaufenthalt) wird auto-bootstrappt. Begrenzte Folgen: sichtbar im Höfe-Tab, trivial korrigierbar (Hof löschen, `placeObject` Typ `Hospital` anlegen, PLAC schärfen). Akzeptiert als Preis für die viel häufigere true-positive-Quote bei rural-Höfen.
- **Phase 3 (Lese-Seite-Konsolidierung) berührt viele Module.** Risiko mit Grep-Gate + Phasen-Roundtrip-Tests einzudämmen, nicht durch konservative Teilumstellung.
- **Algorithmus-Performance:** Pfad A' / Pfad B'-Bootstrap fügt pro Load-Pass je einen `findAllByAddr`-Lookup pro non-trivialem Event hinzu. Bei 20k-Events ist das untergeordnet (`findAllByAddr` ist O(1) gegen die `byNorm`-Map), aber Scale-Test (`test-scale.js`) sollte das verifizieren.

## Alternativen erwogen (und verworfen)

- **D1 — Sidecar `event_links.json`** für stammbaum-spezifische Auflösungs-Caches. Verworfen: bricht das Architektur-Prinzip „Cross-Stammbaum-Referenz (orte.json) vs. stammbaum-spezifische Genealogie (GED/GRAMPS)". User-Einwand korrekt: Event-Links sind genealogische Information.
- **D2 — Custom-Tags `_HOFID` / `_PID` / `_HOF`-Record im GEDCOM.** Verworfen: spezifische Tags nur als letzte Ausnahme. Bei Vorhandensein deterministischer Auflösung über implizite Daten kein Bedarf. Würde zudem den Wire bei jedem ersten Save brechen — derselbe Preis wie der vorgeschlagene Konvention-2→1-Übergang, aber mit zusätzlicher Tag-Schuld.
- **Eager-Materialisierung beim Load → IDB-Cache der `(placeId, hofId)`-Map.** Verworfen: bringt keine neue Information, nur einen weiteren Cache, der invalidieren kann. Determinismus + lazy-recompute ist die einfachere Antwort.
- **Pfad B' auch für BIRT/DEAT/MARR/BURI.** Verworfen: Event-Typen tragen hier keine Hof-Semantik (Krankenhaus, Friedhof, Standesamt). False-positive-Rate zu hoch.
- **Review-Modal mit per-Event-Ignore-Pfad (wie ADR-027 P5).** Verworfen: wäre die einzige Stelle event-lokaler Annotation. Anreicherungs-äquivalent (User legt `placeObject` Typ `Hospital` an, PLAC schärft sich) erreicht dasselbe ohne Annotation.

## Akzeptanzkriterien

Vor Phase 6 (Cleanup) muss gelten:

1. **Determinismus:** `resolve(ev)` zweimal auf identische Eingabe ergibt identischen Output (Idempotenz pro Event); Reload einer Datei ohne Änderung erzeugt identischen `(placeId, hofId)`-Stand für jedes Event.
2. **Totalität:** für jeden Event endet `resolve` mit einem definierten Ergebnis (auch `(null, null)`); kein silent-drop, kein Fehlerpfad.
3. **REPROJECT-Invariante:** für jeden Event mit `ev.placeId ∨ ev.hofId` gilt `ev.place === buildPlacForGedcom(ev, year)`; Test-Fixture mit Hierarchie-Strings demonstriert Stable-Cache nach Link-Pass.
4. **Wire-Treue Konvention 1:** `MeineDaten_ancestris.ged` (Ancestris) — `net_delta=0` + `out1===out2`.
5. **Konvention 2 → 1 idempotent ab Iteration 2:** Fixture mit RESI-Konvention-2-Event ohne Hof — erster Load auto-bootstrapped, erster Save schreibt Konvention 1, `out2===out3`.
6. **Konvention 3a:** Fixture mit atomarem PLAC + global eindeutigem Hof — auto-Link ohne User-Touch.
7. **Konvention 3b:** Fixture mit atomarem PLAC ohne Hof — landet im Review, kein silent-drop.
8. **Bug #1 nicht reproduzierbar:** auf `MeineDaten_ancestris.ged` nach Phase 1+3 zeigt `collectPlaces` keine Hof-Adressen mehr als separate Orts-Einträge.
9. **Bug #2 nicht reproduzierbar:** auf `Unsere Familie 2026.ged` (MyHeritage) nach Phase 4 sind alle RESI-Events mit ADDR aufgelöst (`_eventHofId(ev) !== null`).
10. **Review-Badge spricht Wahrheit:** Klick auf jede Review-Zeile bietet mindestens eine der drei Anreicherungs-Aktionen; nach Aktion + Reload-Pass sinkt der Badge-Zähler.
11. **Alle Tests grün** (Unit + Roundtrip + Snapshot + CSP).
12. **Code-Hygiene-Gate:** `grep "ev\.placeId"` außerhalb der definierten Auflöser-Module = leer.

## Status

🟠 **In Umsetzung** — Phase 0 (Sign-Off) erteilt 2026-06-21, Phase 1 ✅ (sw v1026, REPROJECT + Migration-ohne-Skip), Phasen 2–6 ausstehend. ADR in ARCHITECTURE.md gefolded; Standalone-Datei dient als Verlauf/Diskussions-Archiv.

Bei Abnahme nach Phase 6: Status auf 🟢 (abgeschlossen).

## Beschlossene Entscheidungen (vorab Sign-Off-Diskussion)

1. **Architekturprinzip „Determinismus durch implizite Information"** als Grundsatz. Persistenz lebt in den Eingaben (`orte.json` für cross-Stammbaum-Referenz; `PLAC`/`ADDR` im GED/GRAMPS für stammbaum-spezifisch), nicht in event-lokalen Annotationen.
2. **Pfad B' (Bootstrap aus Event-Typ-Semantik) für `RESI`/`PROP`/`CENS`/`OCCU`.** Event-Typ ist gleichwertiger Quell-Anker wie rich-PLAC-Struktur bei Pfad C. Auto-Anlage bei eindeutiger Quell-Semantik; bewusste User-Aktion nur bei Typen ohne Hof-Semantik.
3. **Pfad A' (atomarer Hof-Lookup) für Konvention 3a.** Globales `findAllByAddr` ohne Village-Scope; eindeutig → Link, mehrdeutig → Review.
4. **REPROJECT-Invariante strukturell verriegelt.** Am Ende jedes erfolgreichen Pfads wird `ev.place` / `ev.addr` neu projiziert. Die ADR-024-Invariante wird damit zum ersten Mal vollständig durchgesetzt.
5. **Lese-Seite über `_eventPlaceId` + `_eventHofId` konsolidiert.** Keine direkten `ev.placeId`-Reads in Aggregatoren mehr; Grep-Gate als CI-Check. `collectPlaces` und `buildHofIndex` id-keyed statt string-keyed.
6. **Review-Badge ist Daten-Lücken-Anzeige.** Drei Anreicherungs-Aktionen (Quelle schärfen / Hof anlegen / Wissen ergänzen) ersetzen den per-Event-Override-Pfad aus ADR-027 P5. „Ignorieren"-Pfad entfällt — Datenanreicherungs-Variante (placeObject Typ Hospital) erreicht dasselbe ohne Annotation.
7. **Migration ohne villageId via `_hofVillageString`-Promotion.** Kein Skip-Pfad mehr; echte Orphans (PO ohne Event-Bezug) werden explizit markiert.
8. **Wire-Bruch beim ersten Save akzeptiert.** Konvention 2 + 3 → Konvention 1 ist eine sichtbare, einmalige Anreicherung (`markChanged` + Toast); danach idempotent (`out2===out3`). Exakt das ADR-024/027-Muster.

— Ende des Entwurfs —
