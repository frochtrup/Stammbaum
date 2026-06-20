# ADR-027 — Hof-Entität als eigenständiges Objekt (HOF-ENT, ENTWURF)

> **Status: ENTWURF** — noch nicht beschlossen. Ergänzt/korrigiert ADR-026.
> Implementierung ist gesperrt, bis dieser Entwurf vom Maintainer signiert ist.

## Kontext

ADR-026 modelliert Höfe als `placeObject` vom Typ `Farm`/`Building` mit `enclosedBy → Dorf`. Das hat das ursprüngliche Ziel (geräteübergreifende Hof-Koords, sichtbare Binnenmigration) erreicht. In der Praxis sind seit v989 vier strukturelle Schwächen sichtbar geworden:

1. **Adresse hat keinen Wahrheits-Anker.** Der Adress-String lebt parallel in `placeObjects[hofId].title` *und* in `ev.addr`. Daraus folgt die Form-Doppelung in der Event-Ansicht (ADRESSE-Feld + ORT-Feld zeigen denselben Text), die in v1017 mit einem Display-Skip und in v1018 mit `opts.includeAddrLeaf` notdürftig geflickt wurde. Beide Fixes sind Modus-Schalter in einer Funktion, die eigentlich nur eine Antwort haben sollte.

2. **Semantische Vermischung von Geografie und Adresse.** „Farm" ist im `placeObjects.type`-Slot, der sonst Verwaltungseinheiten (Town/County/State/Country) trägt. „Farm `enclosedBy` Town" stimmt geografisch, aber semantisch ist es eine *Verortung* (Gebäude/Parzelle liegt in einem Ort), keine Hierarchie-Einbettung (Stadt liegt in einem Kreis). Code, der über die enclosure-Kette läuft (Statistik, Aggregation, periodengerechte Projektion), muss diesen Sonderfall jedes Mal entscheiden.

3. **pnames als Adress-Historie überlädt die Semantik.** `placeObject.pnames` ist konzeptuell „Namensform für denselben Ort" (Sassenbergk = Sassenberg, sprachliche/orthographische Varianten). Eine Adressänderung (Straßenumbenennung 1970, Hausnummer-Reform 1985, Eigentümer-Wechsel im Hof-Namen) ist eine semantisch *andere* Klasse von Änderung — sie bezeichnet *dasselbe physische Objekt* unter wechselnder Konvention. Beides in `pnames` zu pressen, vergiftet Reichtums-Score, Merge-Heuristiken und Statistik-Aggregation.

4. **Hof-Lebenszyklus ist nicht erstklassig.** Vorgänger/Nachfolger (Aufgang in Nachbarhof, Erbteilung), Existenzspanne (Niederbrand, Wiederaufbau), Eigentümerwechsel — all das wäre für eine Hofchronik wertvoll, ist aber heute nicht modellierbar. Die existierende `_buildHofchronikHtml` (v917) gruppiert über `addr` als Schlüssel und würde einen Hof nach Umnummerierung als zwei Höfe zählen.

Symptome: v1011–v1018 waren Korrekturen entlang dieser Wurzel. Jeder Fix war für sich genommen vertretbar, aber das Muster zeigt, dass das zugrundeliegende Modell die Fragen, die das System tatsächlich stellt, nicht sauber beantwortet.

## Entscheidung

Ein Hof wird zu einer **eigenständigen Entität** `hofObject` mit Fremdschlüssel auf ein Dorf-`placeObject`. `placeObjects` enthält fortan ausschließlich Verwaltungseinheiten (Country/State/County/District/Town/Parish/Region). Events tragen `ev.placeId` *immer* auf das Dorf, plus optional `ev.hofId` auf das Hof-Objekt.

Adresse ist single source in `hofObject.addrs[]` mit Zeitfenstern — analog zu `placeObject.pnames`, aber semantisch sauber getrennt. Der Auflösungs-Mechanismus (`resolveAsOf`) wird wiederverwendet, nicht neu erfunden.

Höfe leben in ihrem eigenen Cross-Device-Sync (entweder eigene `hofe.json` oder als separate Sektion in `orte.json` mit erweiterten Schema). Konflikt-Erkennung analog ADR-024-Item-10.

## Modell-Schema

### hofObject

```js
{
  id:        "_hof_wall_33_ochtrup",   // _hof_-Präfix analog _po_/_ep_; deterministisch aus addr + villageId
  villageId: "_po_ochtrup",            // FK auf placeObject (Dorf, immer ungleich null)
  addrs: [                             // zeitvariante Adress-Bezeichnungen (analog pnames)
    { value: "Schulze-Hof",                   lang: "deu", dateFrom: null,   dateTo: "1900", dateType: null, _dateRaw: null },
    { value: "Metelener Str. 18",             lang: "deu", dateFrom: "1900", dateTo: "1970", dateType: null, _dateRaw: null },
    { value: "Wall 33 (Metelener Str. 18)",   lang: "deu", dateFrom: "1970", dateTo: null,   dateType: null, _dateRaw: null },
  ],
  lat:        52.2073,
  long:       7.1867,
  note:       "Erbhof seit ca. 1500. 1830 niedergebrannt, 1832 wiederaufgebaut.",
  existsFrom: "1500",                  // Lebenszyklus-Spanne
  existsTo:   null,
  predecessor: null,                   // optional: hofId eines früheren Hofs, der hier aufgegangen ist
  successor:   null,                   // optional: hofId eines späteren Hofs, in dem dieser aufgegangen ist
  _govId:     null,                    // optional: GOV-Referenz (falls Hof in GOV erfasst)
  _govTypes:  null,
  schemaVersion: 1,                    // pro hofObject-Schema-Migration inkrementiert
}
```

### Event

```js
ev = {
  type:    'RESI',
  date:    '15 MAY 1819',
  place:   '...',                      // GEDCOM-PLAC-String (Wire-Repräsentation; siehe Wire-Mapping)
  placeId: '_po_ochtrup',              // FK auf Dorf (NIE auf Hof; Hof-Identität via hofId)
  hofId:   '_hof_wall_33_ochtrup',     // optional FK; gesetzt nur bei eindeutigem Quell-Bezug oder bewusster User-Aktion
  addr:    '...',                      // optional; bei gesetztem hofId redundant zu resolveHofAddr(hofId, year)
  // addrCity, addrCtry, addrPost, addrExtra etc. — unverändert (ADR-026-Postdetails)
  lati: 52.2073, long: 7.1867,         // weiterhin event-lokaler Backup, single source bleibt po.lat/hof.lat (ADR-024 Item 9)
}
```

`ev.placeId` und `ev.hofId` sind **orthogonale Achsen**: ein Event kann (a) nur placeId haben (Geburt im Dorf), (b) placeId + hofId (RESI/PROP am Hof), (c) nur addr ohne hofId (freie Adresse ohne Hof-Modellierung, z.B. „Hauptbahnhof Frankfurt"), (d) nichts (datenlos).

### Persistenz

| Was | Wo | Notizen |
|---|---|---|
| `db.hofObjects` | IDB-Key `stammbaum_hofobjects_v2` | Neuer Key — Altschlüssel `stammbaum_hofobjects` bleibt read-only für Legacy-Migration. |
| Cross-Device-Sync | `orte.json` Schema v2 mit Top-Level `hofObjects` | Ein File, ein `_rev`/`_device`/`_ts` — Konflikt-Erkennung pro-Datei wie heute. Alternative `hofe.json` wäre architektonisch sauberer, verdoppelt aber die Sync-Infra; gegen entschieden. |
| Schema-Versionierung | `orte.json._schemaVersion: 2` | v1-Files (placeObjects only) bleiben lesbar; beim Speichern wird auf v2 hochgeschrieben. |

### Helper-API (in `gedcom.js`)

```js
// Auflösung analog placeRegistry
getHofRegistry()                                // lazy cached: { byId, byVillageId, findByAddr, resolveAddrAsOf }
getHofRegistry().findByAddr(addrString, year)   // exact + norm-fold-Match gegen addrs[] zum Jahr, gibt hofId|null
getHofRegistry().resolveAddrAsOf(hofId, year)   // analog placeRegistry.resolveAsOf

// Mutations-Helper analog mutatePlaceObject
mutateHofObject(hofId, fn)                      // 4-Schritt-Ritual (Cache-Invalidate + markChanged + saveHofObjects) verriegelt
upsertHofObject(hofId, makeNew, fn)
```

## Wire-Mapping

**Wire-Garantie: bit-identischer Roundtrip auf Produktionsdaten.** Das Modell ist eine *interne* Refaktorierung; GEDCOM/GRAMPS-Bytes ändern sich nicht.

### GEDCOM 5.5.1 (+ GED7 opt-in)

**Schreiben** (`gedcom-writer.js` `_resolvedPlaceName` + `_writeEventBody`):

```
function buildPlacForGedcom(ev, year):
  villagePart = _buildFormString(ev.placeId, year)        // OHNE Modus-Flag — reine Dorf-Hierarchie
  if ev.hofId:
    hofAddr = resolveAddrAsOf(ev.hofId, year)
    return hofAddr + (villagePart ? ', ' + villagePart : '')
  return villagePart
```

`MAP/LATI/LONG` bezieht sich auf den Punkt, an dem das Event stattfand: bei gesetztem `hofId` aus `hof.lat/long`, sonst aus `placeObject.lat/long`. Konvention bleibt: Koords stehen unter PLAC, weil die GEDCOM-PLACE_STRUCTURE das verlangt.

`ADDR` aus `resolveAddrAsOf(hofId, year)` (wenn Hof) oder aus `ev.addr` (wenn frei), plus die bestehenden Postdetail-Sub-Tags (`CITY/POST/CTRY/addrExtra`).

**Lesen** (`gedcom-parser.js` + Link-Pass):

1. Parser füllt `ev.place`, `ev.addr`, `ev.lati/long` wie heute. Kein `ev.hofId`/`ev.placeId` gesetzt.
2. **Link-Pass-Erweiterung** (sw v???, neu unter ADR-027):
   - Segmentiere `ev.place` per Komma in `[lead, ...rest]`.
   - **Eindeutiger Hof-Match:** Wenn `lead` exakt oder per `_normPlaceName` gegen `hofObjects.addrs[].value` zum Stichjahr matcht UND der Match eindeutig ist (genau ein hofId) UND der `rest` die Dorf-Hierarchie der `hof.villageId` matcht (analog ADR-024-Anker-Check aus v1015), dann: `ev.hofId = hofId`, `ev.placeId = hof.villageId`.
   - **Sonst** (kein Hof-Match, oder mehrdeutig, oder rest-Hierarchie passt nicht): `ev.hofId` bleibt null; `ev.placeId` wird wie ADR-024 über `_linkGedcomEventsToPlaceObjects` aus der vollen PLAC-Kette aufgelöst.
3. **`ev.place` bleibt unverändert** (Wire-Treue) — der Writer rekonstruiert beim nächsten Save aus `(placeId, hofId, year)`.

**Konventions-Erhalt (zentrale Regel):** `ev.hofId` wird vom Link-Pass *nur* gesetzt, wenn die Quelle einen tatsächlichen Hof-Bezug im PLAC trug. Wenn die Quelle PLAC ohne Adress-Präfix schrieb (ev.addr existiert, aber nicht als PLAC-Leitsegment), bleibt `ev.hofId` null — der Writer schreibt dann PLAC ohne Präfix, identisch zur Quelle. **Anreicherung um einen Hof-Bezug erfolgt nur über bewusste User-Aktion** im Detail-UI („Hof zuweisen"), nicht über stille Heuristik. Dieselbe Regel, die wir in ADR-024 Stufe 2b (Anker-Check) für Orte etabliert haben.

### GRAMPS XML

GRAMPS modelliert Höfe heute als `<placeobj type="Building">` mit `<placeref hlink="…dorf…">`. Unter ADR-027:

- **Schreiben:** Jeder hofObject wird als `<placeobj type="Building">` mit `<placeref>` auf das Dorf-`<placeobj>` serialisiert. `addrs[]` werden als `<pname>` mit `<daterange>` geschrieben (GRAMPS-konformes Datumsmodell), `lat/long` als `<coord>`, `note` als `<noteref>`, `existsFrom/To` als `<daterange>` am `<placeobj>`. Predecessor/Successor als `<placeref type="predecessor">`/`<placeref type="successor">` (GRAMPS unterstützt typisierte placeref-Beziehungen).
- **Lesen:** `gramps-parser.js` erkennt `<placeobj type="Building"|"Farm">` und schreibt sie in `db.hofObjects` statt in `db.placeObjects`. Bestehende Reconciliation-Logik (Title-Match, Pname-Match) wird auf den Hof-Pfad gespiegelt.
- **Roundtrip-Garantie:** `xml1 === xml2` bleibt erhalten, weil die Aufteilung deterministisch ist (`type === 'Building'|'Farm'` → hofObjects, alles andere → placeObjects).

### Vorbedingung: PWA-Auto-Reload + Schema-Refusal (v1019)

ADR-027 setzt voraus, dass alle aktiv genutzten Geräte zeitnah auf die neue App-Version laufen. Dafür wurden mit sw v1019 zwei Mechaniken eingezogen, die ADR-027-unabhängig nützlich sind:

1. **Auto-Reload bei SW-Update** (`storage.js`): `controllerchange`-Handler löst nach SW-`skipWaiting`+`clients.claim` einen Page-Reload aus. Dirty-Schutz: bei ungespeicherten Änderungen wird der Reload zurückgestellt, bis der Stand sauber ist (Polling alle 3 s + User-Toast). Damit landet jede neue App-Version innerhalb von Sekunden auf jedem online genutzten Gerät, ohne dass der User manuell refreshen muss.
2. **Schema-Version-Refusal beim Laden** (in Phase 1 zu ergänzen): wenn `orte.json._schemaVersion > APP_KNOWN_SCHEMA_VERSION`, geht die App in einen Read-Only-Modus mit klarer User-Information („Datei wurde mit neuerer App-Version erstellt — bitte aktualisieren"). Speichern ist gesperrt; ein einmal aktualisiertes Gerät kann nicht versehentlich eine v2-Datei mit v1-Code zerschießen.

Diese Kombination ersetzt den ursprünglich angedachten v1-Reader-Passthrough für `hofObjects`. Der Passthrough-Code entfällt — Schutz erfolgt nicht durch Toleranz auf der Lese-Seite, sondern durch garantierte App-Aktualität + harten Schreibstopp bei Versions-Mismatch.

### Edge Case: PLAC-Konventions-Vielfalt

Drei Quellkonventionen in der freien Wildbahn (alle drei kommen vor):

1. **MIT Adress-Präfix:** `2 PLAC Wall 33, Ochtrup, …` + `2 ADDR Wall 33` — Ancestris-Standard.
2. **OHNE Adress-Präfix:** `2 PLAC Ochtrup, …` + `2 ADDR Wall 33` — MyHeritage, manche GRAMPS-Exports.
3. **Nur Adresse als PLAC:** `2 PLAC Wall 33` (kein ADDR) — sehr alte oder schlampige Quellen.

Unter ADR-027 wird (1) und (3) als Hof-Bezug erkannt (sofern eindeutig matchbar); (2) wird *nicht* automatisch als Hof verlinkt — der User entscheidet bewusst. Beim Re-Write wird die Quelle der Konvention treu gespiegelt: Fall (1)/(3) schreibt mit Präfix, Fall (2) ohne. Damit bleibt **net_delta=0 pro Event**.

## Anreicherung über bewusste User-Aktion

Drei UI-Pfade machen die Modell-Klarheit für den User nutzbar:

1. **Hof-Tab** (neu oder erweitert): zeigt alle hofObjects sortiert nach Dorf. Pro Hof: Adress-Historie (chronologisch), Koords auf Mini-Karte, Eigentümer/Bewohner (aus PROP/RESI-Events aggregiert über `hofId`), Notiz, Existenzspanne, Vorgänger/Nachfolger. Editor erlaubt Hinzufügen neuer Adress-Bezeichnungen mit Datum.
2. **Event-Detail „Hof zuweisen"** (analog String→PlaceObject-Link in `openPlaceStringLinkModal`): zeigt für ein Event ohne `hofId`, aber mit `ev.addr` und Dorf-`ev.placeId`, alle Höfe im selben Dorf + „neuer Hof hier anlegen". User-Aktion setzt `hofId`. Beim nächsten Save wird PLAC mit Präfix geschrieben (Roundtrip-Bruch ggü. der Quelle, aber **gewollte Anreicherung**, sichtbar in `markChanged`).
3. **Dubletten-Erkennung** (Erweiterung von `findPlaceDuplicates`/v1014): wenn zwei hofObjects im selben Dorf dieselbe Adress-Bezeichnung haben (ggf. mit Norm-Fold), werden sie als Merge-Vorschlag gelistet. Merge konsolidiert verlustfrei (analog `mergePlaceObjects`/v1010).

Das Prinzip ist symmetrisch zur ADR-024-Welt für Orte: **automatischer Link nur bei eindeutigem Quell-Bezug, Anreicherung über bewusste User-Aktion.**

## Migrationsplan

Sechs Phasen, jede einzeln testbar, mit hartem Gate (Pre-Commit + Roundtrip) zwischen den Phasen. Migration läuft **idempotent** in `_deriveHofAndMigrate` (ADR-026), das bereits an allen Lade-Pfaden verdrahtet ist.

### Phase 0 — Entwurf gefroren

ADR vom Maintainer abgenickt. Section „Entscheidung" eingefroren. Implementation gestartet erst nach Phase 0.

### Phase 1 — Schema + Persistenz (kein UI-Effekt)

- `db.hofObjects = {}` als leerer Slot in `setDb`.
- `loadHofObjectsFromIDB` / `saveHofObjects` (parallel zu placeObjects, IDB-Key `stammbaum_hofobjects_v2`).
- `orte.json` Schema-Erweiterung: optionaler Top-Level `hofObjects` + `_schemaVersion: 2`. Beim Load: wenn `hofObjects` fehlt, leer initialisieren (v1-Datei). Beim Save immer als v2 schreiben.
- **Schema-Refusal:** Konstante `APP_KNOWN_SCHEMA_VERSION = 2` in `gedcom.js`. Beim Load von `orte.json`: wenn Datei-Schema > App-Schema, App in Read-Only-Modus + blockierendes Modal („Datei wurde mit neuerer App-Version erstellt"). Speichern gesperrt, bis App-Update.
- `getHofRegistry()` mit `byId`, `byVillageId`, `findByAddr(addr, year)`, `resolveAddrAsOf(hofId, year)`.
- `mutateHofObject` / `upsertHofObject` Helper.
- **Tests:** Schema-Validation, Registry-Cache-Invalidierung, IDB-Roundtrip, Konflikt-Erkennung-Inkrement, Schema-Refusal-Modal bei v3-Fixture (simuliert „aus der Zukunft").
- **Gate:** Alle bestehenden Tests grün; neue Hof-Schema-Tests grün; Produktions-Roundtrip net_delta=0; Auto-Reload aus v1019 verfügbar (sw bereits gebumpt).

### Phase 2 — Mapping-Layer (Parser + Writer)

- **Writer**: `buildPlacForGedcom(ev, year)` — siehe Wire-Mapping oben. `_resolvedPlaceName` ruft `buildPlacForGedcom` statt direkt `_buildFormString`. `geoLines` wählt Koord-Quelle (`hofObjects[hofId]` oder `placeObjects[placeId]`).
- **Link-Pass**: erweitert um Hof-Match-Versuch *vor* dem heutigen Place-Link-Pfad. Eindeutigkeit + Hierarchie-Anker-Check (analog ADR-024 v1015). Bei Treffer: `ev.hofId` setzen, `ev.placeId = hof.villageId`. Sonst Fallthrough zu bestehender Logik.
- **GRAMPS-Parser**: `<placeobj type="Building"|"Farm">` → `db.hofObjects`. `<pname>` → `addrs[]`. `<placeref type="predecessor"|"successor">` → entsprechende Felder.
- **GRAMPS-Writer**: hofObjects als `<placeobj type="Building">` mit allen Feldern.
- **Tests:** PLAC-Roundtrip mit/ohne Präfix (Konvention pro Event erhalten), Hof-Match eindeutig/mehrdeutig/anker-fehlend, GRAMPS-Serialisierung.
- **Gate:** Produktions-Roundtrip net_delta=0 + out1===out2; GRAMPS xml1===xml2; `MeineDaten_ancestris.ged` byte-identisch nach 2 Pässen.

### Phase 3 — Daten-Migration (Farm-PO → hofObject)

- `_migrateFarmPOsToHofObjects(db)` — idempotent:
  - Für jeden `placeObject.type ∈ {Farm, Building}`:
    - Aktuelle Adresse (`po.title`) als undatierter Eintrag `addrs[]` (oder, falls bereits in hofObjects.addrs vorhanden via Norm-Fold, skippen).
    - `villageId = po.enclosedBy[0]?.placeId || po.parentId` (das umschließende Dorf).
    - Koords, Notiz, existsFrom/To, _govId/_govTypes übernehmen.
    - Neue `hofId` deterministisch: `_hof_<normaddr>_<villageNormName>` (kollisionssicher).
    - Persistente Map `_farmIdToHofId[farmPoId] = hofId` für den Repointing-Schritt.
  - Für jedes Event mit `ev.placeId ∈ _farmIdToHofId`:
    - `ev.hofId = _farmIdToHofId[ev.placeId]`
    - `ev.placeId = hofObjects[ev.hofId].villageId`
  - Farm/Building-`placeObjects` löschen.
- **Backup vor Migration:** automatischer Snapshot `orte-backup-pre-ADR027-YYYYMMDD.json` ins selbe Verzeichnis. Schreibt `_migration_pre_adr027: true`-Flag in `db` für „Migration gelaufen, kein Re-Run".
- **Rollback-Fenster:** ein Reverse-Migrator `_migrateHofObjectsBackToFarmPOs(db)` (nur Daten-Wiederherstellung; reiche Hof-Felder wie addrs-Historie/predecessor gehen verloren) als Sicherheitsnetz für die ersten 2 Versionen nach Cutover. Danach ersatzlos entfernen.
- **Tests:** Migration auf synthetischen Fixtures (alle 4 Fall-Kombinationen aus Wire-Mapping-Edge-Case), Idempotenz (Migration 2x → identisches Ergebnis), Backup-Existenz.
- **Gate:** Migration auf realer Produktionsdatei läuft fehlerfrei; danach Roundtrip out1===out2 (gegen Post-Migration-Zustand, nicht gegen Original — siehe ADR-026 Akzeptanzkriterium); GRAMPS stable.

### Phase 4 — Cleanup (Schwachstellen-Beseitigung)

Erst nach Phase 3 ausführen, sonst Test-Brüche.

- **`_buildFormString` Parameter `opts.includeAddrLeaf` entfernen.** Funktion wird wieder einargumentig. Der Farm/Building-Spezialfall im Body entfällt komplett — `placeObjects` enthält fortan nie mehr Farm/Building.
- **`gedcom-writer.js` `_resolvedPlaceName`** ohne opts-Übergabe.
- **`collectPlaces` `_seenIds`-Skip (v1013)** entfällt. Bare-vs-rich-Farm-Dubletten können nicht mehr entstehen, weil Höfe nicht mehr in placeObjects landen. Die Liste aggregiert sauber über `ev.placeId`.
- **ADR-026-Felder** in placeObjects (`Farm`/`Building` als type) sind danach ungenutzt; type-Whitelist auf Verwaltungseinheiten einschränken.
- **Hofchronik** (`_buildHofchronikHtml`) gruppiert über `hofId` statt `addr`. Adress-Auflösung pro Event über `resolveAddrAsOf(hofId, year)` → chronologisch korrekte Adress-Schreibweise pro Sub-Zeile.
- **Map-Layer** plottet hofObjects als eigene Marker-Schicht (visuell trennbar von Verwaltungsorten).
- **Validator** `HOF_NO_COORD` / `HOF_FAR` (v998) operieren über hofObjects statt Farm-POs.
- **Tests:** alle bisherigen ADR-026-Tests entweder auf hofObjects umgestellt oder ersatzlos entfernt (wenn sie Sonderfall-Verhalten testeten, das wegfällt).
- **Gate:** alle Tests grün; `includeAddrLeaf` als String im Repo nicht mehr existent (`grep` als CI-Check); Pre-Commit-Gate grün.

### Phase 5 — UI-Anreicherung

- **Hof-Tab überarbeiten:** Listenansicht aller hofObjects gruppiert nach Dorf. Pro Hof: Detail-Sheet mit Adress-Historie, Koords, Eigentümer/Bewohner, Notiz, Vorgänger/Nachfolger-Links.
- **Event-Detail „Hof zuweisen"-Modal:** für Events mit `ev.addr` ohne `ev.hofId` im gewählten Dorf. Listet bestehende Höfe + Option „neu anlegen". `markChanged` zeigt die Anreicherung.
- **Adress-Editor**: am hofObject-Detail kann der User neue undatierte oder datierte addrs hinzufügen. Existierende Events mit altem `ev.addr`-Wortlaut greifen automatisch die neue zeitgenössische Schreibweise beim nächsten Save.
- **Dubletten-Erkennung** Erweiterung von `findPlaceDuplicates`: hofObjects-Pendant `findHofDuplicates` (gleicher Algorithmus, addrs statt pnames).
- **Tests:** UI-Logik via T0-UI-Harness (`_uiReset`, ClickMap-Dispatch).
- **Gate:** Browser-verifiziert an Realdaten; alle Tests grün; Handbuch-Stand nachgezogen.

### Phase 6 — Legacy entfernen

- Nach mindestens 2 Versionen ohne Reverse-Migration-Bedarf:
  - `_migrateHofObjectsBackToFarmPOs` löschen.
  - Legacy-IDB-Key `stammbaum_hofobjects` löschen.
  - Legacy-Code-Pfade in `gedcom-parser.js`/`gramps-parser.js` für `type=Farm` in placeObjects ersatzlos entfernen (nur noch hofObjects-Pfad).
  - `orte.json` Schema-v1-Load entfernen (alle Geräte müssen migriert sein).

## Konsequenzen

**Was strukturell besser wird:**

- **Eine Wahrheit pro Konzept.** Adresse lebt in `hofObject.addrs`. Koords in `hofObject.lat/long`. Verwaltungs-Hierarchie in `placeObject.enclosedBy`. Keine Dopplung mehr.
- **Eine Projektion pro Funktion.** `_buildFormString` hat wieder *eine* Antwort. Kein `opts.includeAddrLeaf`, kein Display/GEDCOM-Modus-Split.
- **Pname-Semantik wieder sauber.** `placeObject.pnames` = Ortsnamen-Varianten. `hofObject.addrs` = Adress-Bezeichnungen. Reichtums-Score, Merge-Heuristiken und Statistik-Aggregation operieren auf semantisch homogenen Mengen.
- **Hof-Lebenszyklus erstklassig.** Vorgänger/Nachfolger, Existenzspanne, zeitvariante Adresse — natürlich modellierbar.
- **Hofchronik wird korrekt.** Gruppierung über stabile `hofId`, Adressauflösung periodengerecht.
- **Map-Rendering semantisch klar getrennt.** Höfe und Verwaltungsorte sind nicht dieselbe Marker-Klasse.

**Was sich für externe Konsumenten *nicht* ändert:**

- GEDCOM-Wire: bit-identisch (bei Konventions-Erhalt-Regel).
- GRAMPS-Wire: bit-identisch (über Mapping-Layer).
- OneDrive-Sync: dieselbe `orte.json`-Datei, erweitertes Schema (v2 ist abwärtskompatibel-lesbar zu v1).

**Risiken:**

- **Migration ist destruktiv für reiche Hof-Eigenschaften, die wir später erfinden:** wenn ein User in Phase 4 schon hofObjects-Felder pflegt und wir später Phase 5 doch zurückdrehen müssen, sind diese Felder weg. Mitigation: Backup vor Migration bleibt im Repo / im Datenordner.
- **Konventions-Tracking pro Event:** das `hofId`-Flag pro Event entscheidet, ob beim Re-Write der Präfix erscheint. Bei sehr vielen Events ist das viele Booleans-pro-Event, aber das ist Vorhandene Größenordnung (jedes Event hat ja schon `placeId`).
- **Phase 3 läuft auf realen Daten beim ersten Start nach dem Update.** Backup vor Migration zwingend; Rollback-Pfad mindestens 2 Versionen verfügbar.
- **Cross-device-Reihenfolge bei der Migration:** Auto-Reload (v1019) bringt aktive Geräte zeitnah auf die neue App-Version. Für offline-eingefrorene Geräte greift die Schema-Refusal (Read-Only-Modus, siehe Vorbedingung), damit v1-Code keine v2-Datei zerschießt. Kein Passthrough-Code auf der Leseseite nötig.

## Alternativen erwogen

- **Modell A bleibt (heute, ADR-026 unverändert):** verlangt für jede künftige Schwäche neue Modus-Flags und Spezialfälle. Verworfen als Pfad-Verlängerung.
- **Modell A' (Farm.title als alleinige Adress-Wahrheit, ev.addr wird derived):** löst die Form-Doppelung ohne Migration, aber lässt semantische Vermischung + pname-Überlastung + fehlenden Lebenszyklus bestehen. Akzeptabler 80%-Schritt, wenn Migration nicht tragbar wäre; hier nicht gewählt, weil der lang­fristige Gewinn von B die einmaligen Migrations-Kosten überwiegt.
- **`ev.addr` als Hof-Identität behalten (kein hofObjects):** entspricht dem Pre-ADR-026-Zustand. Verworfen wegen fehlender Sync und fehlender Identität bei Adress-Wandel.
- **Hof als separate JSON `hofe.json` mit eigener Sync-Infra:** architektonisch sauberer (Trennung der Belange), aber verdoppelt Konflikt-Erkennung, Backup, OAuth-Auth-Pfad. Verworfen zugunsten erweiterter `orte.json`.
- **Hof als Linked Data im Event verbatim (`ev._hof: {addr, lat, long, ...}`):** Hof-Identität pro Event lokal, kein globaler Store. Verworfen wegen fehlender Cross-Event-Aggregation (Hofchronik unmöglich), Dubletten-Risiko.

## Akzeptanzkriterien

Vor Phase 6 (Legacy entfernen) muss gelten:

1. **Wire-Treue:** GEDCOM-Roundtrip `net_delta=0` und `out1===out2` auf `MeineDaten_ancestris.ged` (83k Zeilen). GRAMPS `xml1===xml2` auf `Unsere Familie.gramps`.
2. **Konventions-Erhalt pro Event:** Fixture-Test mit drei parallelen RESI-Events derselben Person am selben Hof in den drei Wire-Konventionen (mit Präfix / ohne Präfix / nur Adresse) → jeder schreibt sich nach Re-Save bit-identisch zur Quelle.
3. **Idempotenz der Migration:** zweimaliges Ausführen von `_migrateFarmPOsToHofObjects` ergibt denselben DB-Zustand wie einmalige Ausführung.
4. **Anreicherung über User-Aktion verifizierbar:** Browser-Test, in dem ein Event aus Konvention (b) per UI manuell einem Hof zugewiesen wird → `markChanged` aktiv → Re-Save schreibt PLAC mit Präfix (gewollter Roundtrip-Bruch ggü. Original).
5. **`includeAddrLeaf` als String im Repo nicht mehr existent** (Code-Hygiene-Gate via `grep`).
6. **Alle Tests grün** (Unit + Roundtrip + Snapshot + CSP).
7. **Hofchronik gruppiert sichtbar über `hofId`** — eine Test-Fixture mit umnummeriertem Hof (zwei addrs-Einträge) erzeugt **einen** Chronik-Eintrag mit Sub-Zeilen für Adress-Historie, nicht zwei separate Einträge.

## Status

🟡 **Entwurf** — nicht beschlossen. Phase 0 (Maintainer-Sign-Off) ausstehend.

Beim Sign-Off: Status auf 🟠 (in Umsetzung), Phasen-Tracking in CHANGELOG, ADR aus diesem Standalone-Dokument in ARCHITECTURE.md gefolded (Standalone-Datei wird Verlauf/Diskussions-Archiv).

Bei Abnahme nach Phase 6: Status auf 🟢 (abgeschlossen).

## Beschlossene Entscheidungen (vorab Sign-Off-Diskussion)

1. **`orte.json` erweitert mit `hofObjects`-Sektion** (Schema v2). Eine Sync-Infra, ein Konfliktmodell.
2. **`predecessor`/`successor` in v1-Schema enthalten** als optionale Felder. Kein Initial-UI-Effekt; vermeidet spätere Schema-Migration, wenn das Lebenszyklus-UI nachzieht.
3. **Link-Pass-Anker-Check für Höfe nutzt dieselbe Regel wie ADR-024 v1015** — mindestens ein matchendes Hierarchie-Segment zwischen PLAC-`rest` und `hof.villageId`-Kette. Keine neue Heuristik.
4. **Migrations-Backup sichtbar** im Daten-Verzeichnis als `orte-backup-pre-ADR027-YYYYMMDD.json` + `events-backup-pre-ADR027-YYYYMMDD.json` (zwei Dateien für verlustfreien Snapshot-Restore).
5. **Reverse-Migrator als Snapshot-basierter App-Schalter im Debug-Bereich**, sichtbar für 2 Versionen nach Phase 3. Plus CLI-Skript als Notfall-Fallback („App startet nicht"-Szenario). Variante A (algorithmischer Reverse) und C (beides) verworfen.
6. **Auto-Reload + Schema-Refusal-Mechanik** als Vorbedingung in sw v1019 ausgerollt — der ursprünglich angedachte v1-Reader-Passthrough für `hofObjects` entfällt ersatzlos.

— Ende des Entwurfs —
