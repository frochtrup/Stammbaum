# 11 — Orte, Höfe & Identitätsauflösung

> Schicht: Kern · Abhängig von: [10 Domänenmodell](10-Domaenenmodell.md) · Wird gelesen von: [20 Funktionen](20-Funktionen.md), [30 Persistenz](30-NFR-und-Persistenz.md)

Das differenzierendste und anspruchsvollste Subsystem (v8-ADR-024, konsolidiert aus vier ADRs). Muss präzise nachgebaut werden. Der gesamte Inhalt ist DOM-frei und headless testbar.

---

## 1. Zwei orthogonale Entitäten

**PlaceObject — Verwaltungseinheit:**
```
PlaceObject {
  id: PlaceId
  title: string                    // aktuelle Bezeichnung — speist auch den EXPORT (resolveAsOf-Fallback)
  shortName: string                // optional, nur ANZEIGE in Listen; leer ⇒ title. Nie Export, nie Identität
  type: string                     // Country/State/County/Town/Parish/Church/Cemetery …
                                   //   NIE Farm/Building — Höfe sind separate Entität
  pnames: DatedName[]              // datierte Namensvarianten (sprachlich/orthographisch/historisch)
  translations: NameTranslation[]  // mehrsprachige Namensform (sprachlich, NICHT zeitlich)
  enclosedBy: DatedRef[]           // datierte Hierarchie (Zeitachse der Verwaltungszugehörigkeit)
  lat, long: number
  note: string
  existsFrom, existsTo: year
  govId: string                    // GOV-Referenz
  govTypes: […]
}
```

**`shortName` — die dritte Achse: Anzeige (ADR-v9-90).** `pnames` ist die Zeitachse, `translations` die Sprachachse, `shortName` die **Anzeigeachse**: EIN zeitinvarianter Name für kompakte Listen. Listen zeigen `shortName ?? title` und **nie** eine abgeleitete Kettenform — begründet durch Messung am realen Bestand: Ortsnamen treten dort mit bis zu 16 verschiedenen Verwaltungsketten auf (Ochtrup, 1750–1990), die alle **denselben** Ort meinen; jede abgeleitete Kettenform ließe einen Ort in der Liste wie mehrere aussehen. Die volle periodengerechte Kette bleibt im Tooltip und in der Detailansicht.

`shortName` ist **rein app-privat** (`orte.json`) und erreicht den Export **nie**: `resolveAsOf` liefert „im Jahr gültige `pname`, sonst `title`", und daraus baut `buildFormString` den PLAC — würde man stattdessen `title` zu „Frankfurt (Main)" ändern, stünde diese Anzeigekonvention in der GEDCOM-Datei (LP-1). `shortName` ist außerdem **nie Identitätsmerkmal und nie Match-Kriterium**: Verträglichkeitsprüfung und Namensmengen (§4.2) sehen weiterhin ausschließlich `title` + `pnames`. Default ist leer — für einen Bestand ohne echte Homonyme ist nichts zu pflegen (am realen Bestand gemessen: 416 Orte, kein einziger `title` mit Komma).

Daraus folgen drei Regeln für die schreibenden Pfade (ADR-v9-100): **Merge** (§9.2) füllt `shortName` nur, wenn der Überlebende keinen hat (fill-if-empty wie `type`/`note`), und faltet ihn **nicht** in `pnames` — dort stehen Identitätsnamen. **Suche/Filter** nimmt `shortName` zusätzlich in den Heuhaufen auf (was sichtbar ist, muss auffindbar sein), ohne dass er zum Match-Kriterium der Auflösung wird. **Persistenz**: neues optionales Feld in `orte.json`, in beide Richtungen abwärtskompatibel (alte Datei ohne Feld lädt; neue Datei in älterer App ignoriert es) → **kein** `PLACES_SCHEMA_VERSION`-Bump. Bekannte Grenze des Union-Merge (LP-9, [30 §4](30-NFR-und-Persistenz.md)): er entscheidet je Objekt ganz, nicht je Feld — kollidiert dasselbe Orts-Objekt auf zwei Geräten, kann ein kuratierter `shortName` der Verlierer-Seite verloren gehen, **ohne** dass es im Export sichtbar wird (er steht dort ja nie). Das ist keine neue Eigenschaft, aber `shortName` ist das erste Feld, bei dem der Verlust unsichtbar bleibt.

**`translations` vs. `pnames` — zwei Achsen, bewusst getrennte Felder:** `pnames` beantwortet „wie hieß der Ort WANN" (Zeitachse, `{value, from, to}`), `translations` beantwortet „wie heißt derselbe Ort JETZT in welcher Sprache" (Sprachachse, `NameTranslation {lang, value}`, [10](10-Domaenenmodell.md) — derselbe Typ, den Person bereits für `nameTrans` nutzt, INV-UI-4 auf Datenebene: EIN Übersetzungs-Struct für beide Entitäten, nicht zwei). Beide sind „alternative Bezeichnung desselben Orts", aber mit orthogonalen Diskriminatoren — ein gemeinsames Feld mit optionalem `lang`-ODER-`from/to`-Diskriminator wurde geprüft und verworfen: die beiden GEDCOM-Wire-Formate (`_HIST`-artige Datumsvarianten vs. `TRAN`/`_TRAN`+`LANG`) sind strukturell verschieden, ein gemeinsames Feld würde den Writer nur verkomplizieren, ohne dass die UI dadurch weniger Code bräuchte (beide nutzen ohnehin dieselbe Zeilen-Komponente, s. u.). Historisches Beispiel, das den Unterschied zeigt: *Breslau* → *Wrocław* ist eine Übersetzung (`translations`, Grenzverschiebung 1945, dieselbe Stadt heißt auf Polnisch anders), *Sassenbergk* → *Sassenberg* ist eine Zeitvariante (`pnames`, historische Schreibweise desselben deutschen Namens).

**HofObject — Hof als eigenständige Entität:**
```
HofObject {
  id: HofId                        // deterministisch: _hof_<addr>_<village>
  villageId: PlaceId               // FK auf Dorf-PlaceObject (Pflicht)
  addrs: DatedAddress[]            // datierte Adress-Bezeichnungen (Umbenennung, Hausnr.-Reform)
  lat, long: number                // eigene Geodaten → Binnenmigration im Dorf sichtbar
  note: string
  existsFrom, existsTo: year
  predecessor, successor: HofId    // Lebenszyklus
  govId, govTypes
  schemaVersion: int
}
```

`DatedName`/`DatedRef`/`DatedAddress` = `{ value, from, to }` (Wert mit optionalem Gültigkeitszeitraum).

**Warum getrennt (dauerhafte Entscheidung):** Ein Hof ist keine Verwaltungseinheit. Die frühere v8-Modellierung als `placeObject type='Farm'` scheiterte an vier Punkten: Adress-Doppelung, semantische Vermischung Geografie/Adresse, `pnames` mit Adress-Historie überladen, Hof-Lebenszyklus nicht erstklassig. v9 startet direkt mit der getrennten Entität.

---

## 2. Persistenzschichten

| Daten | Speicher | Geltungsbereich | Konflikt |
|---|---|---|---|
| `placeObjects` + `hofObjects` | `orte.json` (Wrapper `_rev`/`_device`/`_ts`/`_schemaVersion`); Browser-Spiegel | **Cross-Stammbaum** (jede Datei mit diesen Orten) | Revision+Device, Union-Merge (LP-9) |
| Event-Inhalte (`PLAC`, `ADDR`, `DATE`, …) | GED-/GRAMPS-Datei | **stammbaum-spezifisch** | Datei-Versionierung beim Nutzer |
| `event.placeId` / `event.hofId` | **runtime-only** | — | deterministische Re-Derivation (§3) |
| bekannte Schema-Version | Konstante im Code | — | höhere Version in `orte.json` → Read-Only-Schreibstopp |

**Herkunft der `placeObjects` (ADR-v9-28, ersetzt ADR-v9-27):** Beim Import werden Village-PlaceObjects **automatisch** aus den distinkten PLAC-Hierarchien der geladenen Ereignisse erzeugt (Seed-Vorpass, §4.2 Schritt 0) — Orte sind genealogische Standardinformation und nach *jedem* Import sofort sichtbar, ohne Nutzeraktion. Die Schicht ist damit **auto-seeded *und* kuratiert**: anfängliche PLAC-Inkonsistenz (Schreibvarianten desselben Orts über mehrere Zweige) ist bewusst akzeptiert und wird *nachgelagert* über die Kurationswerkzeuge bereinigt (Dubletten-Merge, String→PlaceObject-Verknüpfung, [20 §1.7](20-Funktionen.md)). Der frühere Opt-in-Vorschlag (ADR-v9-27) ist ersetzt (♻️). **Höfe bleiben unberührt** — sie entstehen ausschließlich über die Hof-Bootstrap-Pfade (§4.2/§4.3), nie über den Seed.

**Import-Zeit vs. UI-Zeit (ADR-v9-42, Präzisierung nach wiederholtem Fehlschluss):** Die Kurations-Sorge oben (Schreibvarianten, kein unkuratierter Wildwuchs) gilt für **automatische, massenhafte** Anlage beim Import — dort können hunderte PLAC-Varianten aus einer Fremd-Datei stammen, die niemand einzeln geprüft hat. Sie gilt NICHT für eine **einzelne, bewusste Nutzerhandlung** im Editier-Modus (z. B. „+ neuen Ort/Hof anlegen" aus einem Picker heraus, nachdem die Suche bereits gezeigt hat, dass der Kandidat fehlt) — das ist strukturell identisch zu „+ Neue Person/Familie/Quelle/Archiv anlegen" und braucht keine Ausnahme. Beide Vorgänger-ADRs dieses Dokuments (ADR-v9-40, ADR-v9-41) verwechselten das zunächst, bevor ADR-v9-42 es korrigierte — bei künftigen Ort/Hof-nahen Entscheidungen diese Zeile zuerst prüfen, statt die Verwechslung ein drittes Mal zu machen.

**Vollständigkeit statt Anreicherungs-Gate (ADR-v9-44).** `placeObjects`/`hofObjects` werden **ungefiltert** persistiert — auch Einträge, die exakt dem Seed-Rohzustand entsprechen (kein zusätzlicher Name, keine datierte/zweite `enclosedBy`/`addrs`-Zeile, keine Koordinaten/Notiz/GOV-Referenz). Ein Persistenz-Gate „nur angereicherte Objekte schreiben" wurde geprüft und verworfen: es hätte zwei strukturelle Probleme geerbt — hängende `HofObject.villageId`-FKs auf nie persistierte Dörfer, und eine `PlaceId`-Vergabe (`mintId()` in `seed.ts`), die bei Namenskollisionen von der Verarbeitungsreihenfolge des jeweiligen Ladevorgangs abhängt, also nicht dateiübergreifend stabil ist. „Angereichert vs. plain" bleibt trotzdem eine scharfe, nützliche Unterscheidung — nur wirkt sie ausschließlich als **Anzeige-Prädikat** (§9), nicht als Schreibbedingung.

Details `orte.json`-Format + Sync: [30 §3/§4](30-NFR-und-Persistenz.md).

---

## 3. Projektions-Invariante (zentral)

> **INV-PLACE (Reprojektions-Invariante):** Wenn `event.placeId` oder `event.hofId` gesetzt ist, ist `event.place` **ausschließlich** die zwischengespeicherte periodengerechte Projektion `buildPlacForGedcom(event, year)`. `event.place`/`event.addr` sind **Projektions-Cache, keine eigene Wahrheit**. Anzeige *und* Writer leiten beide LIVE aus dem Modell ab. Modelländerungen wirken sofort in Anzeige und Export. Stale-Cache ist strukturell ausgeschlossen — durch **zwei komplementäre Mechanismen** (ADR-v9-47, Präzisierung nach Code-Befund), nicht einen:

1. **Reprojektion am Cache** — läuft beim vollen Lade-Pass (§4.1) und in jedem `placeId`/`hofId`-*setzenden* Kommando (`linkEventToPlace`/`linkEventToHof`, ADR-v9-19): `event.place` wird dort unmittelbar überschrieben.
2. **Live-Lesen statt Cache-Vertrauen** — für jede reine Orts-/Hof-**Attribut**-Änderung bei GLEICHER `placeId`/`hofId` (`savePlaceObject`/`saveHofObject`, z. B. eine neue datierte `enclosedBy`-Periode): hier läuft **keine** Reprojektion (kein Event-Walk, `savePlaceObject` kennt keine Events). Stattdessen gilt eine generalisierte **Chokepoint-Pflicht**: außerhalb der Reprojektion selbst darf `event.place`/`event.addr` bei gesetzter `placeId`/`hofId` **nirgends roh gelesen** werden — auch nicht im Writer oder im Dirty-Check. Jeder Konsument berechnet in diesem Fall selbst live über `buildPlacForGedcom`/`eventPlaceLabel`. Betrifft konkret: Writer (`applyDatabaseToRoots`/`write-back-emit.ts`), Dirty-Check (`write-back.ts::eventEqual`), Edit-Anfangswert des Einzel-Ereignis-Editors (`EventEditModal`, [20 §2](20-Funktionen.md), ADR-v9-63) — dieselbe Disziplin, die die Listen-Anzeige (`eventPlaceLabel`, §5) bereits einhält.

Mechanismus 1 lohnt sich für Massenänderungen (voller Lade-Pass, Identität kann sich ändern — z. B. neue `orte.json`). Mechanismus 2 ist der skalierbare Weg für die häufigere Einzel-Anreicherung (Identität bleibt gleich, nur die Projektion ändert sich): kein Event-Scan, keine Massen-Operation, O(1) Zusatzkosten pro ohnehin besuchtem Event.

**Mechanismus 1 im Detail (ADR-v9-19, ✅ entschieden):** greift an **zwei** Stellen: (a) beim **Laden** (voller Auflösungs-Pass, §4) und (b) in **jedem Modell-Mutations-Kommando**, das `placeId`/`hofId` setzt (z. B. `linkEventToPlace`, [20 §1.7](20-Funktionen.md)) — das Kommando reprojiziert `event.place` unmittelbar selbst per `buildPlacForGedcom` (reine Kern-Funktion, INV-ARCH-1-konform). Zwischen (a)/(b) gibt es **keinen** Zwischenzustand, in dem `placeId` gesetzt, `event.place` aber veraltet ist. Persistiert wird weiterhin nur `placeId`/`hofId` (§2), nie `event.place` selbst.

**Präzisierung „Identität kann sich ändern" bei (a) — nur wenn das Event NOCH NICHT gelinkt ist (ADR-v9-74).** Der REPROJECT-Kurzschluss in §4.2 Schritt 1 gilt unbedingt: ein Event mit bereits gesetzter `placeId`/`hofId` wird bei jedem vollen Lade-Pass NUR reprojiziert, nie neu gematcht — unabhängig davon, ob zwischenzeitlich reichhaltigere Orte verfügbar wurden. „Identität kann sich ändern" bezieht sich auf noch UNGELINKTE Events (frisch geparst, `placeId=null`) sowie auf den expliziten Ausnahmefall `resetUncuratedLinks` (`applyPlaceResolution`-Option, nur vom `orte.json`-Import-Pfad genutzt, `ui/shell/app-state.svelte.ts::replacePlacesAndHofs`): dort werden vor der Auflösung gezielt die Events zurückgesetzt, deren aktuelles Ziel NICHT kuratiert ist (`isEnrichedPlace`/`isEnrichedHof`, §9.1) — kuratierte, ggf. bewusst per `linkEventToPlace` bestätigte Ziele bleiben unangetastet. Landet ein zurückgesetztes Event danach auf ≥ 2 gleichnamigen Kandidaten (der alte unkuratierte Seed-Eintrag plus der neu importierte kuratierte), ist das **korrekt** Review-Klasse P/C (§6, ADR-v9-29 bleibt bindend) — kein stilles Umhängen auf den kuratierten Ort. Die tatsächliche Konsolidierung läuft über den Massen-Dedup (§9.2).

Analog: `event.lati/long` sind nur Render-Fallback; Wahrheit sind die Koordinaten am PlaceObject/HofObject — dieselbe Chokepoint-Pflicht gilt hier bereits (`eventCoords`, §5).

---

## 4. Identitätsauflösung: Events → Orte/Höfe (Kern-Algorithmus)

### 4.1 Charakter der Funktion

`(event.placeId, event.hofId, event.place', event.addr')` ist eine **reine, totale, deterministische Funktion** über:
- Eingabe: `(event.type, event.place, event.addr, event.date)`
- Kontext: `(placeObjects, hofObjects)`

Der volle Auflösungs-Pass wird bei **jedem Laden** ausgeführt; die Reprojektion (§3) läuft zusätzlich in **jedem `placeId`/`hofId`-setzenden Modell-Kommando** (ADR-v9-19). Re-Derivation *ist* die Persistenz (LP-5): persistiert werden nur `placeId`/`hofId`, keine Sidecar-Datei, keine Custom-Tags, nie `event.place` selbst.

### 4.2 Auflösungsreihenfolge (pro Event)

```
0. SEED-VORPASS (einmal je Import, VOR der Auflösung — ADR-v9-28):
   distinkte PLAC-Hierarchien → fehlende Village-PlaceObjects (+ enclosedBy-Kette).
   Village-Segment-Wahl mit dem Konventions-Signal (§4.3): Konvention-1-Hof-Fall
   (Hof-Typ + ADDR-Extract trifft Leitsegment) → Village = segs[1..];
   sonst → Leitsegment. Erzeugt NIE einen Hof.
1. Durchreich-REPROJECT — bereits gelinkt (aus GRAMPS-Parser oder vorigem Load)
                          → event.place auf periodengerechte Projektion aktualisieren
2. Pfad A   — PLAC-Leitsegment matcht hof.addrs[] im Dorf-Anker (existierender Hof)
3. Verwaltungs-Match:
   3a. atomare PLAC matcht placeObject per Identität
   3b. Hierarchie-PLAC matcht voll-projektions-exakt
   3c. Hierarchie-PLAC: Leitname eindeutig UND Elternkette verträglich (Konsistenz-Guard)
   3c′. Leitname mehrdeutig → Eltern-Disambiguierung (enclosureChainAsOf): genau EIN
        verträglicher Kandidat gewinnt, sonst → Review-Klasse P
4. Pfad A'  — atomare PLAC ohne PO-Match → globaler hofObject-Lookup
5. Pfad C   — rich-PLAC ohne Hof → Bootstrap eines Hofs aus Komma-Hierarchie
6. Pfad B   — event.addr matcht hof.addrs[] im Dorf-Scope (existierender Hof)
7. Pfad B'  — event.addr ohne Hof + type ∈ {RESI, PROP, CENS, OCCU}
              → Bootstrap eines Hofs aus Event-Typ-Semantik

REPROJECT am Pfad-Ende:
   event.place ← buildPlacForGedcom(event, year)
   event.addr  ← resolveAddrAsOf(hofId, year)   (nur wenn leer)
```

**Schritt 0 — Village-Seed-Vorpass (ADR-v9-28, rein & deterministisch).** Vor der eigentlichen Auflösung erzeugt ein Vorpass (`seedPlacesFromEvents`) aus den distinkten PLAC-Hierarchien der Ereignisse die fehlenden **Village-PlaceObjects** (plus datierte `enclosedBy`-Kette aus den Folgesegmenten). Dadurch finden die Verwaltungs-Match-Pfade 3a/3b/3c anschließend ein existierendes PlaceObject vor — der frühere „leeres Orte-Tab bei reinem GEDCOM-Import" entfällt, **ohne** dass der Match-Algorithmus selbst geändert wird. **Kein Hof entsteht im Seed:** welches Segment das Village ist, entscheidet der Vorpass mit exakt dem Signal, das §4.3 ohnehin für Konvention 1 vs. 2 nutzt — liegt ein hof-relevanter Event-Typ **mit** `event.addr` vor, dessen Extract (Konvention α, §4.4) das PLAC-Leitsegment trifft (Konvention 1, „Hof, Dorf, …"), ist das Village `segs[1..]` (das Leitsegment bleibt dem Hof-Bootstrap überlassen); sonst ist das Leitsegment selbst das Village (Konvention 2 / einfache Orte). Der Seed läuft ausschließlich auf der Verwaltungs-Achse und weicht die Hof-Erkennung nicht auf. Anfängliche Schreibvarianten desselben Orts erzeugen zunächst getrennte PlaceObjects (akzeptiert) und werden über den **Dubletten-Merge** ([20 §1.7](20-Funktionen.md)) zusammengeführt.

**Einschränkung:** Hof-Bootstrap-Pfade (A/A'/C) feuern nur für hof-relevante Event-Typen `{RESI, PROP, CENS, OCCU}`. BIRT/DEAT/MARR/BURI/EDUC/GRAD/EVEN mit reichem PLAC (z. B. „Krankenhaus St. Joseph, Münster") werden NIE als Hof interpretiert. Pfad B (explizite `event.addr`) bleibt für alle Typen offen — explizite Adresseingabe ist Nutzer-Intent.

**Konsistenz-Guard & Orts-Disambiguierung (3c/3c′, ADR-v9-29).** Ein eindeutiger Leitname genügt für 3c **nicht** — die Folgesegmente des PLAC müssen mit der `enclosureChainAsOf` des Kandidaten **verträglich** sein (Kette stimmt überein *oder* PLAC nennt keine Eltern). Ein widersprechender Elter ist ein **Veto**, kein Match (z. B. `Oldenburg, USA` bindet NICHT an ein PO „Oldenburg" mit Kette Niedersachsen/Deutschland — sonst stille Falschattribution). Trifft ein Leitname **mehrere** gleichnamige POs, disambiguiert **3c′** über die Elternkette; genau ein verträglicher Kandidat gewinnt. Bleibt es mehrdeutig (atomarer PLAC ohne Elter, oder kein/mehrere passende Kandidaten) → **Review-Klasse P** (§6), kein stilles Raten. **Dieselbe Verträglichkeits-Regel steuert den Seed-Dedup** (Schritt 0): gleicher Leitname + verträgliche Eltern → **ein** PO (hunderte `Ochtrup`, auch atomar+reich gemischt, bleiben ein Ort), widersprüchliche Eltern → **distinkte** POs (Oldenburg/Niedersachsen ≠ Oldenburg/USA). Der Dedup-Schlüssel ist damit **weder** name-only (verschmölze die Oldenburgs) **noch** Voll-Hierarchie-String (spaltete Ochtrup nach Schreibtiefe).

**Verträglichkeit prüft die volle Namensmenge JEDES Kettenknotens (title + alle `pnames`), nicht einen einzelnen Namen (ADR-v9-71).** Ein PLAC-Segment kann einen Knoten über eine beliebige seiner Schreibweisen treffen — Titel- *oder* Zeitvarianten-Form. Ein Segment „Bayern" ist mit dem Knoten verträglich, dessen im Ereignisjahr gültiger Name „Königreich Bayern" ist; „Deutsches Reich" ist mit dem Land verträglich, dessen Titel „Deutschland" lautet. Deshalb liefert die Registry für die Kandidatenkette die periodenkorrekte **Knoten-ID-Kette** (`enclosureIdsAsOf`, §5), und der Guard prüft pro Knoten **Namensmengen-Mitgliedschaft** — nicht den einen periodenkorrekten Namen aus `enclosureChainAsOf` gegen das Segment (das vetote sonst dieselbe reale Identität fälschlich → eindeutiges Ereignis kippte grundlos in Review-Klasse P; derselbe Vergleich steuert cross-load auch den Seed-Dedup, wo ein Falsch-Veto pro Reload die ganze Verwaltungskette neu anlegte).

**Genealogische Unsicherheits-Marker („?") kollabieren NICHT mit dem unmarkierten Namen (ADR-v9-73 — Korrektur eines Fixes vom selben Tag wie ADR-v9-71).** Ein „?" direkt am Ortsnamen (`, Ochtrup ?, …`) ist eine Aussage über die Quelle — „nicht sicher, ob das stimmt" —, kein Schreibrauschen. `normPlaceName` streift es deshalb bewusst NICHT ab: „Ochtrup ?" bleibt für Seed/Resolver/Dedup ein vom unmarkierten „Ochtrup" **verschiedener** Ort, automatische Auflösung darf die beiden nicht gleichsetzen (sonst würde INV-PLACE bei gesetzter `placeId` die Unsicherheit beim nächsten Reprojizieren spurlos löschen). Zusammenführen bleibt eine bewusste, manuelle Dedup-Entscheidung — der bestehende Namens-Faltungs-Schritt beim Merge (§9.2) übernimmt „Ochtrup ?" dabei korrekt als eigene `pname`-Variante des Ziels, statt es als Dublette stillschweigend fallenzulassen.

**Nach einem Orts-Merge: Verträglichkeit gegen ALLE historischen Ketten, nicht nur die erste (ADR-v9-72).** Ein gemergter Überlebender trägt mehrere gleichzeitig gültige, undatierte `enclosedBy`-Einträge (je einen pro ursprünglich gemergtem Ort — das ist die bewahrte Historie, kein Fehler). Die undatierte Verträglichkeitsprüfung (`chainCompatibleAnyPath`, §5) durchsucht deshalb ALLE `enclosedBy`-Pfade eines Knotens (Backtracking), nicht nur den ersten — sonst würde ein PLAC-Segment, dessen Kette zufällig nicht der ersten der mehreren gemergten Ketten entspricht, den bereits bekannten Ort für unbekannt halten und die (bereits vorhandene) Kette beim nächsten Laden erneut anlegen. Der bereits korrekt periodengerecht wählende datierte Pfad (`enclosureWinnerAsOf`) ist davon nicht betroffen — er durchsucht seit jeher alle datierten Einträge.

### 4.3 Wire-Konventions-Matrix

Deterministische Auflösung verschiedener Quell-Konventionen (Ancestris, MyHeritage, GRAMPS, alte Quellen):

| Konvention | Eingabe | Hof existiert | Hof existiert nicht |
|---|---|---|---|
| **1** Ancestris | `PLAC Hof, Dorf, … + ADDR Hof` | Pfad A | Pfad C (Bootstrap) |
| **2** MyHeritage/GRAMPS, Hof-Typ | `PLAC Dorf, … + ADDR Hof`, type ∈ {RESI,PROP,CENS,OCCU} | Pfad B | Pfad B' (Bootstrap) |
| **2** dito, Non-Hof-Typ | `PLAC Dorf, … + ADDR …`, type ∈ {BIRT,DEAT,…} | Pfad B | **Review** (Klasse A) |
| **3a** atomar, global eindeutig | `PLAC Wall 33` (kein ADDR) | Pfad A' | — |
| **3b** atomar, ohne Match | `PLAC Wall 33` | — | **Review** / Quelle schärfen |

**Wire-Treue-Anforderung:**
- Konvention 1: bit-identisch (`net_delta=0`, `out1===out2`).
- Konvention 2: sichtbarer, ehrlicher Übergang beim ersten Speichern (Hof-Präfix wird in PLAC ergänzt → Toast + „geändert"), danach idempotent.
- Konvention 3a: bit-identisch bei eindeutigem Match.

### 4.4 Hof-Identitäts-Konvention α

Die Hof-Identität (`hof.addrs[].value`) endet beim **ersten Komma ODER Zeilenumbruch** der eingehenden Adresse. `event.addr` bleibt unangetastet (ADDR-Roundtrip).

| `event.addr` (eingehend) | extrahierte Hof-Identität |
|---|---|
| `Wall 33` | `Wall 33` |
| `Wall 33, 48607 Ochtrup, Deutschland` | `Wall 33` |
| `Wall 33\n48607 Ochtrup` | `Wall 33` |
| `Schulze-Hof` | `Schulze-Hof` |

- **Read-Tolerance:** beim Lesen zuerst Voll-Normalisierung, dann Extract-Fallback (Robustness Principle — „schreibe streng, lies tolerant", LP-6). Historische Komma-Höfe (vor Konvention α) bleiben über Voll-Norm auffindbar.
- Explizite UI-Varianten-Anlage durchläuft den Extract **nicht** (Nutzer-Intent „diese Schreibweise speichern" bleibt erhalten).
- **ADDR=Village-Redundanz:** manche Programme schreiben bei RESI den Ortsnamen selbst in `ADDR`; konservativ erkannt (Match gegen Village-Titel + `pnames`) → kein Pseudo-Hof.

---

## 5. Lese-Seite: die einzigen erlaubten Reads (Chokepoints)

Vier zentrale Helfer für die **Event→Ort/Hof-Auflösung** — die einzigen korrekten Reads dieser Art außerhalb des Auflösungs-Codes selbst. Sie sind zugleich die Naht zur UI-Schale ([02 §3.1](02-Zielarchitektur-v9.md)). Zwei weitere, objektseitige Prädikate ergänzen sie unten.

| Helfer | Frage | Auflösung |
|---|---|---|
| `eventPlaceId(ev)` | Welches Dorf? | A: `ev.placeId` (Wahrheit) · B: `findByName(ev.place)` (Projektion) |
| `eventHofId(ev)` | Welcher Hof? | A: `ev.hofId` · B: `findByAddr(ev.addr, year)` im Dorf-Scope |
| `eventCoords(ev)` | Welche Koordinaten? | placeObject/hofObject primär, `ev.lati/long` Fallback |
| `buildPlacForGedcom(ev, year)` | Welcher PLAC-String würde geschrieben? | Hof + Dorf-Hierarchie, periodengerecht |
| `buildListPlaceName(ev)` | Was zeigt eine **Listenzeile**? | Kurzname statt Kette — Hof: `Adresse, Dorf-Kurzname` · Ort: `shortName ?? title` · ungelinkt: erstes Komma-Segment |

**`buildListPlaceName` ist der Listen-Zwilling von `buildPlacForGedcom`** (ADR-v9-100, [21 §6l](21-UI-UX.md) INV-UI-14) und liegt bewusst im Kern, nicht in der UI-Schale: die Zeitleisten-Insel ([21 §8](21-UI-UX.md)) konsumiert ihn ebenso wie `ui/shell/person-display.ts` — EINE Regel, zwei Konsumenten (INV-UI-4). Er ist **reine Anzeige**: er speist nie den Writer, nie eine Identitäts-/Match-Entscheidung und nie die Review-Klassifikation (§6). Sein Bestandteil `placeDisplayName(po) = po.shortName || po.title || po.id` ist der einzige erlaubte Weg, „den anzuzeigenden Namen eines Orts" zu bilden — kein View liest dafür `po.title` direkt.

**Überlappende `enclosedBy`-Perioden — Tie-Break-Regel:** widersprechen sich zwei `enclosedBy`-Einträge für dasselbe Jahr (z. B. fehlerhaft importierte oder manuell überlappend eingetragene Zeiträume), gewinnt der Eintrag mit dem **höheren Startjahr** (`from`) — die zeitlich näher liegende Periode. `buildPlacForGedcom`/`enclosureChainAsOf` markieren den Fall mit einem Warnhinweis (⚠, Ort-Steckbrief), still gewählt wird trotzdem deterministisch, kein Blockieren der Projektion.

**Aggregatoren** (`collectPlaces`, `buildHofIndex`) sind **id-basiert** (nicht string-basiert): zwei gleichnamige Orte bleiben distinkt, mehrere Cache-Varianten desselben Orts kollabieren auf einen Eintrag.

**Drei weitere reine Prädikate/Helfer** (ADR-v9-44/46/50, objekt- statt event-seitig, aber derselben Chokepoint-Disziplin unterworfen — Details §9): `isEnrichedPlace(po)`/`isEnrichedHof(hof)` (weicht das Objekt vom Seed-Rohzustand ab?), `hasReference(id, events)` (löst mindestens ein Event der geladenen Datei auf dieses Objekt auf?) und `buildFullPlaceName(reg, id)` (volle, periodenunabhängige Namenskette eines Orts — für Kuration/Anzeige OHNE Event-/Jahres-Kontext, z. B. Massen-Dedup §9.2; anders als `buildFormString` mit `year=null`, das bewusst nur den atomaren Einzelnamen liefert). Alle drei sind reine Funktionen über vorhandene Felder bzw. Events — kein zusätzlicher persistierter Zustand.

---

## 6. Daten-Lücken-UI (Review-Workflow)

Ungewissheit wird sichtbar gemacht (LP-6). Ein „Zuordnungen prüfen"-Modal zeigt Events mit ungewisser Hof- **oder Orts**-Zuordnung, klassifiziert:

| Klasse | Beschreibung | Aktionen |
|---|---|---|
| **A** | Non-Hof-Event-Typ mit ADDR ohne Hof-Match | „+ Hof anlegen" \| „Quelle schärfen" |
| **C** | ≥2 Höfe gleicher Adresse im Dorf (mehrdeutig) | „Hof wählen" \| „Quelle schärfen" |
| **D** | Norm-Drift: Adresse matcht keinen Hof, aber Höfe existieren im Dorf | „Variante zum Hof" \| „Hof wählen" \| „+ Hof anlegen" \| „Quelle schärfen" |
| **P** | Verwaltungs-Ort mehrdeutig: atomarer PLAC oder rich-PLAC ohne disambiguierenden Elter trifft ≥2 gleichnamige PlaceObjects (oder einziger Kandidat per Konsistenz-Guard verworfen, §4.2) | „Ort wählen" \| „Quelle schärfen" (ADR-v9-84) · „+ Ort anlegen" **gibt es hier bewusst nicht**, s. u. |

Aktionstypen, jeweils am *korrekten* Ort persistent:
- **Quelle schärfen** → Event-Edit (Nutzer passt PLAC/ADDR an) → Anreicherung wandert in GED/GRAMPS (stammbaum-spezifisch). Für Klasse P der **deterministische** Weg: disambiguierenden Elter in den PLAC schreiben (`Oldenburg` → `Oldenburg, USA`) → Re-Derivation greift beim nächsten Load.
- **Hof anlegen** → `findOrCreateHof(addr, placeId)` → Anreicherung wandert in `orte.json` (cross-stammbaum).
- **Variante zum Hof** → hängt `addr` als neue `addrs[]`-Bezeichnung an → künftige Events greifen deterministisch via Pfad B.
- **Ort wählen** (Klasse P, ADR-v9-84) → Auswahl eines PlaceObject über `linkEventToPlace` (ID **und** PLAC-Text sofort atomar reprojiziert, ADR-v9-19/-42): der geschärfte PLAC bindet beim nächsten vollen Lade-Pass deterministisch, das Kommando erledigt „Quelle schärfen" für diesen Fall also gleich mit. Die Kandidaten werden mit ihrer **vollen Verwaltungskette** angeboten („Oldenburg › Niedersachsen" vs. „Oldenburg › USA") — bei P sind per Definition alle gleichnamig, der Titel allein wäre als Auswahlhilfe wertlos.
- **„+ Ort anlegen" (Klasse P) — bewusst ausgeschlossen** (ADR-v9-84): bei P existieren bereits ≥1 gleichnamige Kandidaten; ein weiterer gleichnamiger Ort verschärft die Mehrdeutigkeit meist, statt sie zu lösen. Der Guard-Veto-Unterfall (der richtige Ort fehlt ganz) bleibt über „Quelle schärfen" + Neuanlage im Orte-Tab lösbar.
- **Nicht unterscheidbare Kandidaten sind ein Dubletten-, kein Auswahl-Problem** (ADR-v9-84, Befund am echten Datenbestand: 23 von 96 P-Fällen, hinter denen nur **vier Ortspaare** stecken (Bremen, Essen, Hildesheim, Bottrop) — je zwei PlaceObjects mit derselben Kette, beide unangereichert, beide ohne Koordinaten). „Ort wählen" bände dort eines von N identischen Objekten und ließe die übrigen liegen; derselbe Fall kehrte beim nächsten Import wieder. Tragen alle Kandidaten dasselbe Label, zeigt die Review daher **statt einer sinnlosen Wahl** einen Hinweis auf den Massen-Dedup (§9.2) — danach bleibt EIN Kandidat und die Zuordnung wird eindeutig, ganz ohne Wahl.

**Kein per-Event-Override.** Keine event-lokale Annotation, die dem Determinismus widerspräche. Genealogische Ungewissheit (der Forscher selbst weiß es nicht) bleibt dauerhaft im Review sichtbar — die korrekte Systemantwort auf Quell-Ungewissheit.

---

## 7. Wire-Mapping (Kurzfassung)

- **GEDCOM:** `PLAC` aus `buildPlacForGedcom` — **live berechnet beim Schreiben** (ADR-v9-47; vorher am Code drifted: `write-back-emit.ts` schrieb den Projektions-Cache `event.place`, was eine Orts-Attribut-Änderung ohne Datei-Reload verlor), nicht aus `event.place` gelesen; `MAP/LATI/LONG` aus `eventCoords`; `ADDR` = `event.addr` (byte-identisch geschrieben) — bleibt bewusst bei der bestehenden Fill-if-empty-Regel (§4.2 REPROJECT: `resolveAddrAsOf` nur wenn `event.addr` leer ist), NICHT auf live-Neuberechnung bei jedem Schreiben umgestellt wie `PLAC`: die Hof-Adresse ist stärker nutzer-/quellen-eigen (Konvention α, Freitext-Erhaltung), PLAC dagegen vollständig herleitbar. **Ausnahme (ADR-v9-81): eine EXPLIZITE Hof-Umbenennung im Editor** (`updateHofAddr` → `renameHofAddrInEvents`, `services/places/apply-resolution.ts`) zieht den neuen Adresswert aktiv auf `event.addr` ALLER referenzierenden Events nach (`ev.hofId === hofId && ev.addr === alterWert`) — nur so wirkt die Umbenennung durchgängig (Anzeige, ADDR-Export) UND übersteht den nächsten Lade-Pass (der `ev.hofId` aus dem — sonst veralteten — ADDR neu auflöst). Der `ev.addr === alterWert`-Guard schützt LP-1: byte-abweichende, quellen-eigene `addr`-Werte bleiben unangetastet. Die Fill-if-empty-Regel für den AUTOMATISCHen Lade-/Link-Pfad ist davon unberührt — die Ausnahme gilt nur für die bewusste Nutzeraktion (ADR-v9-47 zielt auf ungewollte automatische Änderungen, nicht auf explizite Edits); Hof-Notiz als `NOTE @N_HOF@` mit Präfix `[Hof] `. Historische Zeitachse (pnames, enclosedBy, addrs) wird beim GEDCOM-Export **kollabiert** (by design — GEDCOM kann sie nicht abbilden).
- **GRAMPS:** vollständig. `placeObjects` ↔ `<placeobj>`, `hofObjects` ↔ `<placeobj type="Building">` mit `<placeref>` aufs Dorf. Parser teilt deterministisch (Type `Building` → `hofObjects`).

Vollständiges Format-Mapping: [13](13-Interop-Roundtrip.md).

---

## 8. Restklassen & offene Spezifikationsfragen (ehrlich offen)

Zwei Klassen, die durch keine Algorithmus-/UI-Aktion eindeutig werden:
1. **Genealogische Ungewissheit** — der Forschende weiß es selbst nicht. Bleibt dauerhaft im Review (korrekt).
2. **PLAC-Lücken außerhalb Hof-Kontext** — EDUC/GRAD/EVEN mit fremden Verwaltungs-Hierarchien ohne PO. Keine Hof-Themen; inzwischen weitgehend durch Auto-Seed (ADR-v9-28) + Review-Klasse P (ADR-v9-29) adressiert; dauerhaft offen bleibt nur echte Quell-Ungewissheit (→ Klasse 1).

Vier zuvor offene Spezifikationsfragen sind inzwischen **entschieden** (hier nur noch als Verweis dokumentiert, kein offener Auftrag mehr — die Umsetzung folgt phasenweise im Code):

3. **Orte-Bootstrap: automatisch statt nur Opt-in — ENTSCHIEDEN (ADR-v9-28, ersetzt ADR-v9-27 ♻️).** PlaceObjects werden beim Import **automatisch** aus PLAC geseedet (§2 „Herkunft der `placeObjects`", §4.2 Schritt 0), Kuration erfolgt nachgelagert (Dubletten-Merge, String→PlaceObject-Verknüpfung). Die Verwaltungs-Match-Pfade 3a/3b/3c bleiben unverändert — sie finden die geseedeten POs vor. Hof-Erkennung (Konvention 1/2, §4.3) bleibt unangetastet. *Umsetzung:* Kern `seedPlacesFromEvents` (Phase 1) + Lade-Pipeline/UI (Phase 2).
4. **Reprojektion bei UI-Verknüpfung — ENTSCHIEDEN: sofort im Kommando (ADR-v9-19 ✅).** Jeder `placeId`/`hofId`-setzende Mutationspfad (`linkEventToPlace` u. a.) reprojiziert `event.place` unmittelbar selbst (§3 „Zeitpunkt der Reprojektion", §4.1). Die frühere Lesart (b) des Code-Kommentars (nur Load-Pfad) ist damit verworfen. *Umsetzung + Regressionstest:* Phase 1.2.
5. **Gleichnamige Orts-Disambiguierung — ENTSCHIEDEN (ADR-v9-29 ✅).** Seed-Dedup nach Name+Hierarchie-Verträglichkeit, Resolver-Konsistenz-Guard (3c) + Eltern-Disambiguierung (3c′) und **Review-Klasse P** (§4.2/§6) — löst die stille Falschverknüpfung `Oldenburg, USA` → deutscher Oldenburg, das Kollabieren von Oldenburg/NS + Oldenburg/USA und die verdeckte atomare Mehrdeutigkeit; hunderte `Ochtrup` bleiben dabei **ein** Ort. *Umsetzung:* Phase 1 (1.1a Seed-Dedup, 1.1b Guard/3c′, 1.1c Klasse P).
6. **Gleichnamige Orte mit widersprüchlicher, aber real identischer Verwaltungshistorie — ENTSCHIEDEN (ADR-v9-50 ✅ inkl. Nachtrag, ersetzt ADR-v9-49 ♻️).** Zunächst (ADR-v9-49) bewusst als Restklasse OHNE Kern-Fix dokumentiert; nach zwei Nutzer-Rückfragen final gelöst (§9.2): Kriterium 1 in `findPlaceDuplicates` gruppiert JEDE Namensgleichheit, UNABHÄNGIG von Eltern-Verträglichkeit (auch Oldenburg/Niedersachsen vs. Oldenburg/USA) — als `conflict: true`-markierte Gruppe mit voller Namenskette (`buildFullPlaceName`) statt bloßem Titel. Eine zunächst erwogene Zwischenlösung („gemeinsamer Vorfahre irgendwo in der Kette") wurde verworfen, weil sie Fälle wie `Ochtrup, Preußen, Deutsches Reich` vs. `Ochtrup, NRW, Deutschland` (real derselbe Ort, aber komplett umbenannte Kette) ebenso ausgeschlossen hätte wie Oldenburg — keine Ketten-Heuristik kann das zuverlässig trennen. Sicher, weil Massen-Dedup nie automatisch zusammenführt: ADR-v9-29 bleibt für `resolve.ts`/`seed.ts` (die automatischen Pfade) unangetastet.
7. **Geo-Plausibilitätsprüfung (Bounding-Box, Zeitachsen-Inkonsistenz, `enclosedBy`-Zirkel, `HOF_NO_COORD`, `HOF_FAR`) — ENTSCHIEDEN (ADR-v9-68), spezifiziert in [20 §3](20-Funktionen.md), NICHT hier dupliziert.** Bewusst in dieselbe Validierungs-Engine integriert wie die Personen-/Familien-Regeln (EIN „✓ Daten prüfen", EIN Dashboard) statt v8s separatem Orte-Tab-Badge — Details/Schwellenwerte/Schweregrade s. dort.

---

## 9. Kuration: Anreicherung, Massen-Dedup, Referenz-Sichtbarkeit (ADR-v9-44/45/46)

Drei zusammenhängende Regeln, die die volle (§2) statt gefilterte Persistenz von `orte.json` handhabbar halten — Anzeige-/Kurations-Werkzeuge, keine Schreibbeschränkung.

### 9.1 Anreicherungs-Prädikat (ADR-v9-44)

`isEnrichedPlace(po)` ist **falsch** genau dann, wenn `po` bit-identisch dem `seedPlacesFromEvents`-Rohzustand entspricht: `type=''`, `pnames=[]`, **höchstens EIN** `enclosedBy`-Eintrag mit `from=null,to=null` (Top-Level-Länder werden mit `enclosedBy=[]` geseedet — kein Elternteil, nicht „genau einer"; Korrektur 2026-07-10, beim Bau am echten `seed.ts`-Verhalten gefunden, s. ADR-v9-48), `lat=null`, `long=null`, `note=''`, `existsFrom=null`, `existsTo=null`, `govId=null`, `govTypes=null`. Jede Abweichung (weiterer Name, datierte oder zweite `enclosedBy`-Zeile, gesetzte Koordinaten/Notiz/Existenz-Spanne/GOV-Referenz/Typ) macht das Objekt „angereichert".

`isEnrichedHof(hof)` ist **falsch** genau dann, wenn `hof.addrs.length === 1` mit `addrs[0].from === null && addrs[0].to === null` (undatiert), sowie `lat=null`, `long=null`, `note=''`, `existsFrom=null`, `existsTo=null`, `predecessor=null`, `successor=null`, `govId=null`, `govTypes=null` — bit-identisch dem Bootstrap-Rohzustand aus `findOrCreateHof()` (`core/places/hof-id.ts`). Jede Abweichung (Adress-Historie, Lebenszyklus-Verweis, Koordinaten, Notiz) macht den Hof „angereichert".

Beide Prädikate sind reine, headless testbare Kern-Funktionen (`core/places`), **nicht** als persistiertes Feld geführt (würde bei Mutation veralten können — LP-5 eine Ebene tiefer angewandt: „ist angereichert" ist selbst wieder deterministisch aus den vorhandenen Feldern berechenbar).

**Verwendung — Pillen-Text bewusst ohne Herkunfts-Aussage:** Orte-/Höfe-Tab ([20 §1.7/§1.8](20-Funktionen.md)) markiert plain (`!isEnriched…`) Einträge mit einer Pille „**ohne Zusatzangaben**" (nicht „automatisch erkannt" — das Prädikat prüft nur den INHALT, nicht die Herkunft: ein von Hand über „+ neuen Ort anlegen" ([20 §2](20-Funktionen.md), ADR-v9-42) frisch angelegter, noch nicht weiter ausgefüllter Ort erfüllt dieselbe Bedingung wie ein Seed-Ergebnis, wurde aber nicht automatisch erkannt — ein Herkunfts-Claim wäre hier schlicht falsch). Keine Auswirkung auf Persistenz, Auflösung oder Export — reine Anzeige-Information.

### 9.2 Massen-Dedup (ADR-v9-45)

**Eine** Funktion, nicht zwei getrennte — `findPlaceDuplicates(items, kind, toleranceKm = 1)`, reine, deterministische Funktion (`items` ist `placeObjects` für `kind ∈ {'places','all'}`, `hofObjects` für `kind='farms'`). Liefert Kandidatengruppen (`{ ids: (PlaceId|HofId)[], conflict?: boolean, typeMismatch?: boolean }[]`, ≥ 2 Mitglieder, `typeMismatch` s. u., ADR-v9-77) nach zwei Kriterien (Union-Find):

1. **Namensgleichheit — bei `kind ∈ {'places','all'}` UNABHÄNGIG von Eltern-Verträglichkeit (ADR-v9-50).** Gleicher normalisierter Leitname (`normPlaceName`, title/pnames) → immer eine Kandidatengruppe, egal ob die Elternketten verträglich sind. Bei `kind='farms'`: gleiche normalisierte Adresse (`normHofAddr`, §4.4 Konvention α) UND gleiches `villageId` — Hof-Identität läuft über Adresse+Dorf, nicht über Namens-Hierarchie, hier bleibt die Verträglichkeits-Frage irrelevant.
2. **Bare↔reich Cross-Achse** — NUR bei `kind ∈ {'places','all'}`: ein plain PO (§9.1) ohne `enclosedBy`/`pnames` mit Komma-Titel wird gegen ein angereichertes PO verglichen, dessen Titel dem Leitsegment entspricht (kein Namens-Fold-Treffer, da unterschiedliche Titel-Strings). Durch ADR-v9-44 (alle plain Einträge bleiben dauerhaft in `orte.json`) tritt dieser Fall in v9 häufiger auf als im v8-Vorbild. Bei `kind='farms'` übersprungen (wie im v8-Vorbild).

`kind` unterscheidet `'places'` (Farm/Building ausgeschlossen), `'farms'` (nur Hof-Äquivalent), `'all'` (Migrations-/Test-Zweck).

**`conflict`-Flag und UI-Pflicht (ADR-v9-50).** Eine Gruppe trägt `conflict: true`, wenn mindestens ein Mitglieder-Paar unverträgliche Elternketten hat (§4.2, ADR-v9-29-Regel: eine Kette ist Präfix der anderen, oder leer) — Namensgleichheit allein hat die Gruppe gebildet, nicht wechselseitige Verträglichkeit ALLER Mitglieder. Die UI ([20 §1.7](20-Funktionen.md)) MUSS in diesem Fall die **volle, periodenunabhängige Namenskette** je Mitglied zeigen (`buildFullPlaceName(reg, id)`, §5 — NICHT den bloßen `title`, sonst sind gleichnamige, unterschiedlich verortete Einträge nicht unterscheidbar) plus einen sichtbaren Warnhinweis. Kein zusätzlicher automatischer Gewinner-Bias — die bestehende Heuristik (Verwendungszahl → Koordinaten → Notiz → kleinste ID) bleibt unverändert Vorschlag, nie bindend. `conflict` ist reine Zusatz-Information, kein Gate — Zusammenführen bleibt in JEDEM Fall (ob `conflict` oder nicht) ein expliziter Nutzer-Klick, nie automatisch.

**Warum die Elternketten-Verträglichkeit hier KEIN Gate ist, anders als beim Event-Resolver (ADR-v9-29-Abgrenzung, wichtig).** `parentsCompatible` bleibt für `resolve.ts`/`seed.ts` (Event→Ort-Auflösung, Seed-Dedup) unverändert strikt bindend — dort wird STILL/AUTOMATISCH entschieden, ein Guard-Verzicht würde `Oldenburg, USA` an den deutschen Oldenburg binden, ohne dass ein Mensch das je sieht. Massen-Dedup führt dagegen NIE automatisch zusammen (§9.2 oben) — dort ist die Verträglichkeits-Frage keine Algorithmus-, sondern eine Menschen-Entscheidung. Eine Heuristik-Zwischenlösung („gruppiere nur, wenn die Ketten irgendwo einen gemeinsamen Vorfahren teilen") wurde geprüft und verworfen: sie hätte `Oldenburg, Niedersachsen` weiterhin von `Oldenburg, USA` getrennt gehalten, aber ebenso `Ochtrup, Amt Ochtrup, Königreich Preußen, Deutsches Reich` von `Ochtrup, Kreis Steinfurt, Nordrhein-Westfalen, Deutschland` — real derselbe Ort nach einer vollständigen Verwaltungsreform (jede Ebene umbenannt, keine textuelle Überlappung), strukturell aber nicht von Oldenburg/USA unterscheidbar. Keine String-Heuristik auf Elternketten kann diese beiden Fälle zuverlässig trennen — nur ein Mensch mit genealogischem Kontextwissen. Deshalb: Namensgleichheit gruppiert immer, `conflict` warnt, der Mensch entscheidet.

**Abweichung vom v8-Vorbild (bewusst):** v8s `findPlaceDuplicates` nutzte für Kriterium 1 (Places) einen reinen Fold-Key-Vergleich, identisch im Ergebnis zur jetzigen v9-Fassung (Namensgleichheit gruppiert immer) — v9 ergänzt das `conflict`-Flag + die volle Namenskette in der UI, die es in v8 nicht gab.

**Kuratiert-Kennzeichnung + Teil-Auswahl im Dedup-Dialog (ADR-v9-72).** Jedes Gruppenmitglied zeigt das `isEnrichedPlace`/`isEnrichedHof`-Anzeige-Prädikat (§9.1, dieselbe „ohne Zusatzangaben"-Pille wie in der Haupt-Liste) — der Nutzer erkennt den kuratierten Eintrag unabhängig vom Gewinner-Vorschlag und kann ihn bewusst als Ziel wählen. Zusätzlich eine „einbeziehen"-Checkbox pro Mitglied (Standard: alle aktiv außer dem Gewinner selbst, der nicht abwählbar ist) — „Zusammenführen" wirkt nur auf die ausgewählten Mitglieder; abgewählte bleiben im Bestand und erscheinen bei der nächsten Neuberechnung ggf. wieder (kleinere) Gruppe. Beides reine UI-Ergänzung ohne Änderung an `findPlaceDuplicates`/`pickWinnerId` selbst — die Gewinner-Heuristik bleibt unverändert Vorschlag, nie bindend (s. o.).

**`typeMismatch`-Flag — Orts-Kategorie als zweites Warn-Signal (ADR-v9-77, nur `kind ∈ {'places','all'}`).** Namensgleichheit gruppiert IMMER (Kriterium 1 oben), auch wenn zwei Mitglieder erkennbar verschiedene Verwaltungsebenen sind — der häufigste Fall: eine Stadt und der gleichnamige Kreis (z. B. „Steinfurt" als Stadt UND als Kreis). `conflict` (Elternketten-Widerspruch) erfasst diesen Fall NICHT zuverlässig, da die Elternketten von Stadt und Kreis oft kompatibel sind (die Stadt liegt IM Kreis) oder beide top-level ohne Eltern stehen. Deshalb ein eigenes, unabhängiges Flag: `typeMismatch: true`, wenn mindestens ein Mitglieder-Paar zwei verschiedene, BEIDE nicht-leere `type`-Werte trägt (`PlaceObject.type`, z. B. „Town" vs. „District"). Ein leerer `type` (Seed-Rohzustand, noch nicht kategorisiert) triggert KEIN Mismatch — das ist der normale, unauffällige Fall „ein Mitglied noch nicht klassifiziert", kein Widerspruch. Die UI zeigt bei `typeMismatch` einen eigenen Warnhinweis (analog zum `conflict`-Badge, eigener Text) UND den `type` jedes Mitglieds als Pille direkt in der Mitgliederzeile (nicht nur bei Mismatch — Kategorisierung ist immer sichtbar, damit der Nutzer sie auch ohne ausgelöstes Flag prüfen kann). Wie `conflict`: reine Zusatz-Information, kein Gate — Zusammenführen bleibt immer eine bewusste Entscheidung.

**Merge:** `mergePlaceObjects(places, hofObjects, survivorId, mergedIds: PlaceId[])` — Erweiterung der bestehenden paarweisen Kern-Funktion (§-intern: dünner Wrapper, mehrfacher Aufruf der Einzel-Merge-Logik, keine Duplizierung) auf mehrere Verlierer. Analog `mergeHofObjects`. Verlustfrei wie die bestehende paarweise Fassung: Namens-/Zugehörigkeits-Union (dedupliziert), Lücken-Auffüllung (nur leere Gewinner-Felder), alle Fremdreferenzen (`event.placeId`/`hofId`, andere `enclosedBy`/`villageId`) umgehängt.

**Automatischer Hof-Nachlauf nach Dorf-Merge (ADR-v9-45, Nachtrag 2026-07-10 — korrigiert v8-Abweichung von oben zurück).** Ursprünglich als „bewusst nicht übernommen" entschieden (kein Analogon zu v8s `_reconcileFarmsUnderVillage`, stattdessen ein zweiter manueller Dedup-Lauf) — das war falsch, aus zwei Gründen: (1) **Entdeckbarkeit** — niemand stößt Massen-Dedup von selbst direkt nach einem thematisch anderen Vorgang (Dorf-Merge) noch mal an. (2) **Echte Resolver-Regression, kein reines Unordnungsproblem** — `hof-registry.ts::findByAddr` liefert bei ≥2 Kandidaten `null` („strikt eindeutig — sonst Review"), das Event fällt in Review-Klasse C (§6). Zwei gleichnamige Höfe waren vor dem Dorf-Merge unter verschiedenen Dörfern eindeutig auflösbar; nach dem Merge hängen beide am selben Dorf — bei GEDCOM-Quellen kippt das bei JEDEM folgenden vollen Reload (`hofId` nie persistiert, §2) von „eindeutig" auf „mehrdeutig". Der fehlende Nachlauf ist damit keine Frage der Aufräum-Ordnung, sondern eine stille Verschlechterung der Auflösungsqualität für zuvor korrekt funktionierende Events.

Anders als das allgemeine Massen-Dedup (Kriterium 1 bei Orten ist eine Heuristik, „wahrscheinlich derselbe Ort") braucht dieser Fall **keine** neue Nutzer-Entscheidung: `(villageId, normalisierte Adresse)` ist bereits die strukturelle Identität eines Hofs (§4.4, Kriterium 1 oben) — sobald der Nutzer „Dorf A = Dorf B" per Dorf-Merge bestätigt hat, folgt „zwei Höfe mit identischer Adresse im resultierenden Dorf sind derselbe Hof" zwingend daraus.

`mergePlaceObjects` bekommt daher zwei zusätzliche, feste Schritte (kein separates Nutzer-Kommando):

```
mergePlaceObjects(places, hofObjects, survivorId, mergedIds):
  … Schritte 1–5 (Namen/enclosedBy vereinigen, HofObject.villageId umhängen)
  6. Höfe unter survivorId nach normalisierter Adresse gruppieren
     → jede Gruppe ≥2 automatisch zusammenführen (Gewinner-Heuristik wie
       oben: Verwendungszahl → Koordinaten → Notiz → kleinste ID) —
       ruft dieselbe verlustfreie Merge-Logik von oben auf, kein neuer
       Mechanismus.
  7. Toast, falls konsolidiert wurde: „N Hof-Dubletten unter ⟨Dorf⟩
     automatisch zusammengeführt" (Transparenz, LP-6 — analog dem
     Konvention-2-Übergangs-Toast, §4.3).
```

Automatisierung ist hier sicher: die Merge-Operation selbst ist bereits verlustfrei, und es ist keine unabhängige menschliche Abwägung mehr nötig — der Nutzer hat sie mit dem Dorf-Merge bereits getroffen (derselbe Fehlschluss-Typ wie ADR-v9-40→42: eine Spannung fälschlich als „braucht neue Bestätigung" behandeln, obwohl eine bereits getroffene Entscheidung sie strukturell schon auflöst).

**UI** ([20 §1.7/§1.8](20-Funktionen.md)): Massen-Dedup-Ansicht zeigt vorgeschlagene Gruppen mit Gewinner-Vorschlag (Heuristik: Verwendungszahl → Koordinaten vorhanden → Notiz vorhanden → kleinste ID — Vorschlag, vom Nutzer änderbar), „Zusammenführen" pro Gruppe als explizites, bestätigtes Kommando. Kein automatisches Zusammenführen beim Laden.

### 9.3 Referenz-Sichtbarkeit (ADR-v9-46)

`hasReference(id, events)` — reine Funktion: mindestens ein Event der aktuell geladenen Datei löst via `eventPlaceId`/`eventHofId` (§5) auf `id` auf.

Die **Haupt**-Orte-/Höfe-Liste ([20 §1.7/§1.8](20-Funktionen.md)) zeigt nur referenzierte Objekte (`hasReference === true`). Referenzlose Objekte (existieren in `orte.json`, aber kein Event der geladenen Datei zeigt (mehr) darauf) erscheinen in einem separaten Filter/Abschnitt „Ohne Bezug" — dort vollständig editierbar und löschbar wie jedes andere Objekt. **Keine automatische Löschung** — referenzlose Objekte bleiben bestehen, bis der Nutzer aktiv löscht oder eine spätere Datei/ein Merge sie wieder referenziert.

**Löschen referenzierter Objekte (ADR-v9-78) — volle Nutzerkontrolle, kein Sonderfall.** „vollständig editierbar und löschbar wie jedes andere Objekt" (Zeile oben) gilt für referenzierte UND referenzlose Objekte gleichermaßen — die Trennung in §9.3 betrifft nur die Haupt-/Nebenliste, nicht die Bearbeitungsrechte. `deletePlaceObject`/`deleteHofObject` (`core/places/commands.ts`) entfernen das Objekt unbedingt; referenzierende `event.placeId`/`event.hofId` werden im selben Kommando auf `null` zurückgesetzt (identischer Reset-Primitive wie `resetUncuratedLinks`, ADR-v9-74) — **kein** Kaskaden-Löschen der Events/Personen/Familien selbst. Kein neuer Zwischenzustand mit hängender Fremdreferenz: der nächste volle Lade-Pass (§4.1/§4.2) behandelt die zurückgesetzten Events identisch zu frisch geparsten, noch ungelinkten Events — Verwaltungs-Match (3a–3c′) bzw. Hof-Bootstrap (Pfade A/A'/C/B') laufen regulär erneut, entweder auf einen verbleibenden gleichnamigen/gleichadressigen Kandidaten oder (Village-Seed-Vorpass, Schritt 0, bzw. Hof-Bootstrap) auf einen frischen, unangereicherten Platzhalter aus der in GED/GRAMPS unverändert erhaltenen PLAC/ADDR-Rohangabe. Bleibt der Kandidat mehrdeutig, greift regulär Review-Klasse P/A/C/D (§6) — keine neue Review-Klasse, keine neue Sonderbehandlung.

**Bewusste Abweichung vom v8-Orakel:** v8 blendet referenzlose `placeObjects` nicht aus der Hauptliste aus, sondern zeigt sie dort mit einer „Nicht verknüpft"-Badge. v9 trennt stärker (separate Sichtbarkeit statt Badge in derselben Liste) — explizite v9-Entscheidung, keine Nachbau-Lücke (Oracle-vs-Spec-Disziplin, [32 TST-6](32-Testframework.md)).

**Schnittmenge mit §9.1:** ein Objekt kann gleichzeitig plain UND referenzlos sein (z. B. Rest eines gelöschten Events oder einer rückgängig gemachten Bearbeitung) — der Hauptkandidat für eine spätere manuelle Aufräumaktion über §9.2, aber ohne eigenen Automatismus.
