# Orts-Redesign — Technisches Detail-Design (P0/P1)

> Status: **Entwurf zum Review** · erstellt 2026-05-31 · Branch `v8-dev`
> Vorstufe zu **ADR-024 (Orts-Entität & historische Dimension)**. Sobald reviewt → Kern in `ARCHITECTURE.md` (ADR-024) + Feature-Detail/Phasen in `ROADMAP.md` überführen, dieses File kann dann bestehen bleiben oder gelöscht werden.

Ziel des Nutzers (wörtlich): Geocoding/Ortshandling verbessern, **historische Dimension von Orten** erfassen und Orte **verlustfrei normalisieren**; neben RESI/PROP-Historie auch andere wesentliche Plätze für Events nutzbar machen (z. B. **Kirchen**); ortsbezogene Auswertungen erweitern. **Möglichst ohne userspezifische Tags**, um Roundtrips nicht zu gefährden.

---

## 1. Ausgangslage (verifiziert im Code)

Das Fundament existiert bereits — Orte sind **nicht** nur Strings:

| Baustein | Fundstelle | Bemerkung |
|---|---|---|
| Erstklassige Place-Entität `db.placeObjects[id] = {title, type, pnames[], lat, long, _parentHandle}` | `gramps-parser.js:402-417`, `gramps-writer.js:647-669` | roundtript nativ über GRAMPS `<placeobj>` |
| `_PLACE_MODELLED = Set(['ptitle','pname','coord','placeref'])` | `gramps-parser.js:363` | **Schlüssel:** nur diese Kinder werden modelliert; Rest → Passthrough (ADR-012, verbatim) |
| Event→Ort-Link `ev.placeId` (+ `place`, `lati`, `long`) | `gramps-parser.js:736-738` | Link aus GRAMPS gesetzt; in GEDCOM nur `place`+Koords |
| Koordinaten-Roundtrip GEDCOM `PLAC.MAP.LATI/LONG` | `gedcom-parser.js:354-360`, `gedcom-writer.js:148-177` (`geoLines`) | Standard-Tags, kein `_`-Tag |
| Koordinaten-Roundtrip GRAMPS `<coord lat long>` | `gramps-parser.js:384-388`, `gramps-writer.js:86` (`_decToGrampsCoord`) | dezimal ↔ `N52.15`/`E7.33` |
| Mehrsprachige `<pname lang>` → `extraPlaces[].trans` | `storage-file.js:485-488`, `gramps-parser.js:378-380` | nur value+lang, **kein Datum** |
| Höfe als typisierte Orte (`type=Building`, `_HOF_PLACE_TYPES`) + RESI/PROP-Historie mit Datumsspannen | `gramps-parser.js:427-428`, `ui-views-hof.js` | abgeleitet zu `hofObjects` |
| Auto-Hierarchie aus Komma-String beim GRAMPS-Export (Eltern-`placeref`) | `gramps-writer.js:733-765` | „Dorf, Stadt, Kreis" → genestete placeobj |
| `PLAC.FORM`-Template `db.placForm` | `gedcom-writer.js:831,842` | Hierarchie-Schema |
| Karte (Leaflet/OSM), Modi *Orte* + *Migration* | `ui-views-map.js` | |
| Listen-Aggregation **über getrimmten String** | `ui-views-place.js:4-42` (`collectPlaces`) | **nutzt `placeObjects` noch nicht** |
| `extraPlaces` (Koords/trans) in **localStorage** | `storage.js`, `storage-file.js:373-377` | T0-STORAGE-Schuld |

### Die drei echten Lücken
1. **Zeitachse fehlt.** Parser liest `pname` nur als `{value,lang}` (`:378-380`) und nur `placeref[0]` ohne Datum (`:392-393`). GRAMPS erlaubt an `<pname>` **und** `<placeref>` ein `<daterange>/<datespan>/<dateval>` → historischer Name & wechselnde Verwaltungszugehörigkeit *über Zeit*.
2. **Typisierte Event-Orte (Kirchen) nicht nutzbar.** `type` existiert, aber nur Hof-Typen werden ausgewertet; keine UI, um z. B. eine Kirche anzulegen und Taufe→Kirche zu verknüpfen (obwohl `ev.placeId` technisch existiert).
3. **Keine verlustfreie Normalisierung.** `collectPlaces()` aggregiert über String → gleiche Orte in verschiedenen Schreibweisen = mehrere Einträge; die Place-Entität wird in der Anzeige ignoriert.

---

## 2. Leitprinzipien

1. **Ort = Entität (`placeId`)**, persistiert nativ als GRAMPS `<placeobj>` (Master), degradiert verlustfrei zu Standard-GEDCOM `PLAC + MAP + FORM` (Companion).
2. **Null Custom-Tags.** Alles auf Standard-GRAMPS (`<pname><daterange>`, `<placeref><daterange>`, `<url>`) bzw. Standard-GEDCOM. Roundtrip-Sicherheit hat Vorrang vor Features.
3. **GEDCOM kann die Zeitachse nicht.** Beim GEDCOM-Export kollabiert die Historie zum **periodenkorrekten** PLAC-String (`resolveAsOf`) + Koordinaten. By design, wird dokumentiert.
4. **Additiv & abwärtskompatibel.** Bestehende `placeObjects`/`extraPlaces`/`hofObjects` bleiben lesbar; neue Felder sind optional.

---

## 3. P0 — Fundament: Zeitachse + PlaceRegistry

### 3.0 KRITISCHE Vorab-Verifikation (Roundtrip-Risiko #1)

> **Vor jeder Code-Änderung zu klären:** Was passiert heute mit `<daterange>` unter `<pname>`/`<placeref>` beim Roundtrip?
> Da `pname` und `placeref` **in** `_PLACE_MODELLED` stehen, baut der Writer sie aus dem Modell neu auf. Wenn der Parser die Datums-Kinder **nicht** liest, werden sie beim Schreiben **nicht** reproduziert → **stiller Datenverlust** (kein net_delta=0, falls eine Test-Datei datierte pnames enthält).
> **Test:** Mini-`.gramps` mit `<pname value="Alt" lang=""><daterange start="1700" stop="1800"/></pname>` durch `test-roundtrip.js` schicken. Ergebnis bestimmt, ob P0 ein *Bugfix* (Verlust heute) oder eine *Erweiterung* (heute via Passthrough erhalten) ist. **Design unten gilt für beide Fälle** — es macht die Daten in jedem Fall *zugänglich*.

> **✅ ERGEBNIS (2026-05-31, empirisch verifiziert):**
> **Vorher (Baseline):** datierte `<pname>`/`<placeref>` wurden **still verworfen** — `pname`/`placeref` ∈ `_PLACE_MODELLED` → Writer baut sie aus dem Modell neu; Parser las die Date-Kinder nicht → Passthrough griff nicht (nur Nicht-modellierte placeobj-Kinder landen in `_extra`). Bestätigung, dass P0a ein **Bugfix** (Datenverlust-Vermeidung) ist, nicht nur eine Erweiterung.
> **Nachher (P0a-1 implementiert, sw v796):** instrumentierter `test-roundtrip.js` auf der **realen** `Unsere Familie_2026-04-11.gramps` (2894 Pers.): Orts-Datumselemente `input=29 → xml1=29` (**alle erhalten**), verbatim `dateval type="…"`-Attribute `input=8 → xml1=8` (**alle erhalten** via `_dateRaw`-Hybrid), Event-Dates `2230→2230` (keine Kollateralschäden), `counts=ok`, `stable` (xml1===xml2). GEDCOM-Roundtrip `MeineDaten_ancestris.ged` net_delta=0/stable unverändert. +6 gezielte Unit-Tests in neuer GRAMPS-Gruppe (h) (`test-unit.js` 161→167; MiniDOMParser + gramps-Module ins Harness portiert). **Akzeptanzkriterium erfüllt.**

### 3.1 Datenmodell-Erweiterung `db.placeObjects[id]`

```js
{
  id, title, type,                      // type → Taxonomie (§5)
  lat, long,                            // unverändert (dezimal)
  pnames: [                             // ERWEITERT
    { value, lang,                      //   bisher
      dateFrom, dateTo,                 //   NEU: Gültigkeit der Schreibweise (Jahr-String o. null)
      _dateRaw }                        //   NEU: verbatim GRAMPS-Date-XML für exakten Roundtrip
  ],
  enclosedBy: [                         // NEU (ersetzt einzelnes parentId)
    { placeId, dateFrom, dateTo, _dateRaw }   // datierte, evtl. mehrfache Zugehörigkeit
  ],
  parentId,                             // BEHALTEN als Abwärtskompat./Fallback (resolved, undatiert)
  authority: { gov, geonames, wikidata },     // NEU optional → GRAMPS <url> (P4)
  note
}
```

> **Hinweis Ist-Modell:** Der Parser löst `placeref/@hlink` heute in einer zweiten Pass zu `parentId` auf (`gramps-parser.js:418`); `_parentHandle` existiert nur im temporären `_placeObjsTemp`, **nicht** im finalen `placeObjects[id]`. `enclosedBy[]` tritt also neben `parentId`, nicht neben `_parentHandle`.

**Migration:** Beim Laden alter Daten: wenn `enclosedBy` fehlt aber `parentId` gesetzt → `enclosedBy = [{placeId: parentId, dateFrom:null, dateTo:null}]`. `pnames[].dateFrom/To` default `null`.

### 3.2 Parser-Änderungen (`gramps-parser.js`, ~Z. 363-428)

- `_PLACE_MODELLED` bleibt `{ptitle,pname,coord,placeref}` (die Tags selbst weiter modelliert).
- pname-Schleife (`:378-380`): zusätzlich `_grampsDateOf(pn)` lesen → `{dateFrom,dateTo,_dateRaw}`.
- placeref: **Schleife statt `[0]`** (`:392-393`) → temporär alle hlinks+Dates sammeln; in der zweiten Pass (`:413-420`) zu `enclosedBy[]` (resolved placeId + Date) auflösen, `parentId` = `enclosedBy[0].placeId` für Abwärtskompat.
- Neuer Helfer `_grampsDateOf(el)`: liest `<daterange>`/`<datespan>`/`<dateval>` (Kind von `el`), liefert `{dateFrom,dateTo,_dateRaw}`. **Wiederverwendung** der bestehenden Event-Datums-Logik/`_gramps*XMLText`-Seams (gleiche Tags wie Event-Dates).
- `placeMap[h]` (Event-Resolution, `:402`) unverändert (`{title,lat,long}`), zusätzlich `pnames` für `resolveAsOf` verfügbar machen (z. B. `placeMap[h].pnames`).

### 3.3 Writer-Änderungen (`gramps-writer.js`)

Beide Schreibpfade anpassen (Pfad A `db.placeObjects` `:647-669`; Pfad B abgeleitet `:745-765`):
- pname-Schleife (`:655-658`): wenn `pn.dateFrom||dateTo||_dateRaw` → Date-Kind schreiben (`_dateRaw` bevorzugt für exakten Roundtrip, sonst aus dateFrom/To bauen). `<pname>` wird dann **Element mit Kind** statt self-closing.
- placeref: aus `enclosedBy[]` **mehrere** `<placeref>` mit Date-Kind schreiben (statt einem aus `parentId`, `:664-667`). Fallback `parentId` wenn `enclosedBy` leer (Altdaten).
- Neuer Helfer `_grampsDateXML(dateFrom,dateTo,_dateRaw)` — Gegenstück zu `_grampsDateOf`, identische Serialisierung wie Event-Dates.

### 3.4 PlaceRegistry (`gedcom.js`)

Neues leichtes Lookup-Objekt, beim DB-Load/`invalidate` gebaut:

```js
PlaceRegistry = {
  byId:   { [placeId]: placeObject },
  byNorm: { [normName]: placeId },          // _normPlaceName(title|pname.value) → id
  resolveAsOf(placeId, year),               // → periodenkorrekter Name (pname gültig im Jahr, sonst title)
  enclosureChainAsOf(placeId, year),        // → ["Dorf","Amt","Fürstbistum",…] zum Jahr
  findByName(str)                           // String → placeId (Normalisierung + Alias über pnames[])
}
```

- `_normPlaceName(s)`: trim, Mehrfach-Spaces, Unicode-NFC, casefold — **nur für Matching**, nie für Anzeige/Speicherung (verlustfrei!).
- `resolveAsOf`: wählt `pname` mit `dateFrom<=year<=dateTo` (offene Grenzen erlaubt); kein Treffer → `title`.
- Invalidation an bestehende Cache-Invalidierung hängen (`UIState._placesCache = null`, `invalidatePlacePersonIndex()` in `ui-views-map.js:74`).

### 3.5 GEDCOM-Export mit Zeitkollaps

- `gedcom-writer.js` `geoLines`/PLAC-Schreibstellen (`:358,594`): wenn Event `placeId` + Datum hat → `PLAC` = `resolveAsOf(placeId, eventYear)` statt rohem `ev.place`. Ohne Datum/placeId → bisheriges Verhalten.
- Koordinaten unverändert über `geoLines`.
- `db.placForm` weiter als FORM-Template.

### 3.6 Tests (Pflicht, ohne User)

- `test-roundtrip.js` auf `Unsere Familie.gramps`: **`net_delta=0` muss bleiben.** Zusätzlich Mini-Fixture mit datierten `pname`/`placeref` → `net_delta=0`.
- `test-unit.js` (aktuell 161): neue Fälle für `_grampsDateOf`/`_grampsDateXML`, `resolveAsOf`, `enclosureChainAsOf`, `_normPlaceName`, Migration `_parentHandle→enclosedBy`. **Neue `gedcom.js`-Helfer in `window._api`-Whitelist (~Z.84) aufnehmen** (JXA-Pfad), sonst `API.x is not a function`.
- `CACHE_NAME` bump + `ROADMAP.md` sw-Version (Code-Commit).

---

## 4. P1 — Normalisierung & Konsolidierung

### 4.1 `collectPlaces()` auf Entität umstellen (`ui-views-place.js`)
- Aggregation primär über `placeId` (via `PlaceRegistry.findByName` für String-Orte ohne id).
- String-Orte ohne `placeObject` **lazy promoten**: beim ersten Bedarf (Koord-Setzen, Merge, Typ-Zuweisung) wird ein `placeObject` erzeugt; reine Anzeige promotet nicht (Performance bei 2800+ Personen).
- Anzeige weiter über `compactPlace()`; Identität über id.

### 4.2 Dubletten-Merge (verlustfrei)
- Merge-Dialog (analog `ui-dedup.js`): zwei `placeId` → eine; **alte Schreibweisen werden zu `pnames[]`** (nichts geht verloren), alle `ev.placeId` umgehängt.
- Heuristik-Vorschläge: gleicher `_normPlaceName`, gleiche Koords (±Toleranz), Levenshtein auf `compactPlace`.
- **Validator-Regel** (opt-in, `validator.bridge.js`): „mögliche Ort-Dublette".

### 4.3 `extraPlaces` → `placeObjects` (T0-STORAGE-Abbau)
- `extraPlaces[name]={lati,long,trans[]}` in `placeObjects` überführen (Koords→lat/long, trans→pnames). 
- Migrationspfad einmalig beim Laden; `loadExtraPlaces()` bleibt als Fallback-Leser für Altbestände. Ziel: `stammbaum_extraplaces_*`-localStorage entfällt schrittweise.
- **Roundtrip beachten:** GEDCOM-`extraPlaces`-PLAC/TRAN-Schreibstelle (`gedcom-writer.js:17`) auf neue Quelle umbiegen, net_delta=0 prüfen.

---

## 5. P2–P5 (Kurz-Spezifikation, Detail folgt nach P0/P1-Review)

**P2 Historische UI** — Ort-Editor mit datierter Namensliste + Zugehörigkeits-Historie (von–bis, übergeordneter Ort, Picker). Anzeige/Export via `resolveAsOf`.

**P3 Kirchen & typisierte Event-Orte**
- **Typ-Taxonomie** → Mapping auf GRAMPS-Standardtypen: Dorf/`Village`, Stadt/`City`, Gemeinde/`Municipality`, Kreis/`County`, Region/`Region`, Land/`Country`, **Kirche/`Building`(+pname/role)**, **Pfarrei/`Parish`**, Friedhof/`Cemetery`, Hof/`Building`/`Farm`. (Genaues Mapping bei Implementierung gegen GRAMPS-Typliste verifizieren.)
- Event-Formular: Ort-**Suchpicker** (Muster wie Eltern-Picker v794, `relPicker`) erlaubt typisierten Ort; Taufe/Heirat/Beerdigung → Kirche.
- **Kirche↔Kirchenbuch:** typisierten Ort mit Repository/Source verknüpfen (Pfarrei-Bestände).
- Höfe als Spezialfilter der generischen typisierten Place-Sicht (`ui-views-hof.js` wird Filter, nicht Sonderwelt).

**P4 Geocoding & Gazetteer**
- Autorität **GOV (gov.genealogy.net)** priorisiert — liefert historische Verwaltungszugehörigkeit *über Zeit* (ideal westfälisch: Decker, Rensing-Viefhues) → speist `enclosedBy[]`+`pnames[]` automatisch. GeoNames/Wikidata alternativ. Speicherung als GRAMPS `<url>`.
- Batch-Geocoding gegen `placeObjects`, Dedup/Merge, Hierarchie-Ableitung. CSP: externe Fetch-Domains in `connect-src` whitelisten (`test-csp.js` beachten).

**P5 Erweiterte Auswertungen**
- **Ort-Steckbrief** (analog Person/Familie): Events hier, Personen, Quellen, Karte, Namens-Timeline.
- Karten-**Zeitschieber**: Name/Zugehörigkeit zum gewählten Jahr; Migration über historische Grenzen.
- **Pfarrei-Rekonstruktion:** alle Taufen/Trauungen an einer Kirche.
- Validator: Geo-Plausibilität (Geburt↔Taufe-Distanz vs. Epoche; Ort ohne Koords; Zugehörigkeit unplausibel fürs Datum).

**Tool-konforme Zusatz-Features**
- Hypothesen auf Ortsebene (`_HYPO` existiert): „dieses ‚Bergkirchen' = GOV-ID X" + Evidenz.
- Story/Buch (`story-epochs.js`, `timeline-hist-events.js`): Orts-Kontextsatz („zur Geburt gehörte X zum Fürstbistum Münster").

---

## 6. Risiken & Regeln
- **R1 Roundtrip** — datierte pname/placeref dürfen net_delta nicht brechen (§3.0 zuerst klären). `_dateRaw`-Verbatim als Absicherung.
- **R2 GEDCOM-Verlust** — Zeitachse kollabiert (by design, dokumentieren).
- **R3 Performance** — kein eager-Promote aller String-Orte bei 2800+ Personen; PlaceRegistry beim Load einmal bauen, cachen.
- **R4 localStorage-Migration** — extraPlaces-Überführung darf GEDCOM-PLAC/TRAN nicht verändern.
- Bei jedem Code-Commit: `CACHE_NAME` bump + ROADMAP sw-Version. Kein Build-Step (ADR-020), Vanilla JS. Tests grün.

---

## 7. Reihenfolge
**§3.0 Verifikation ✅ → P0a-1 ✅ (Zeitachse Parser/Writer, sw v796) → P0a-2 ✅ (PlaceRegistry, sw v797) → P0b-1 ✅ (collectPlaces↔Entität + Ort-Detail-Historie, sw v798) → P0b-2a ✅ (Dubletten-Erkennung + Merge-Kern, sw v799) → P0b-2b ✅ (Merge-Dialog UI, sw v801) → P0b-3 ✅ (extraPlaces→placeObjects-Migration, in `setDb`) → P2 ✅ (Inline-Editor pnames/enclosedBy) → P3 ✅ (sw v818, Typ-Filter+Suchpicker+Kirchenbuch) → P4 ✅ (sw v819, Nominatim+GOV-Text) → P5a/d/e ✅ (sw v820–v822, Steckbrief+Validator+Kontextsatz) → String-Link ✅ (sw v829–v833) → Robustheit-Block ✅ (sw v851, P1 aus Review). Status-Detail in `ARCHITECTURE.md` ADR-024.**

**Stand (Implementierung, sw v801, test-unit 198 grün):**
- **P0a-1** `gramps-parser.js`/`gramps-writer.js`: datierte `<pname>`/`<placeref>` → `pnames[].{dateFrom,dateTo,dateType,_dateRaw}` + `enclosedBy[]` (HYBRID strukturiert + `_dateRaw` verbatim).
- **P0a-2** `gedcom.js`: `getPlaceRegistry()` (`byId`/`byNorm`/`findByName`/`resolveAsOf`/`enclosureChainAsOf`, `_normPlaceName` nur Matching) + `_migratePlaceObjects` (`parentId→enclosedBy`, in `setDb`).
- **P0b-1** `ui-views-place.js`: `collectPlaces()` mischt `placeId`+`type`+Koords additiv ein (String-Key unverändert); Ort-Detail-Abschnitt „Ort (historisch)" (Typ/Zugehörigkeitskette/frühere Namen).
- **P0b-2a** `gedcom.js`: `findPlaceDuplicates()` (Fold-Key `_placeFold` + Haversine `_placeDistKm`, union-find) + `mergePlaceObjects()` (verlustfrei: Schreibweisen→`pnames`, `ev.placeId`/parent/enclosedBy umgehängt, Verlierer gelöscht).
- **P0b-2b** `ui-views-place.js` + `ui-event-delegation.js` + `index.html` + `styles.css`: Orte-Tab ⇉-Button → `modalPlaceMerge`; `openPlaceMergeModal`/`_renderPlaceMergeList`/`placeMergeGroup`/`_placeUsageCounts` + `_CLICK_MAP`-Einträge; Radio-Gewinnerwahl (Vorschlag = meiste Event-Verwendungen), CSP-safe (`data-action`). **Browser-verifiziert** (preview: Modal/Merge/Repointing, 0 Console-Errors).
