# 10 — Domänenmodell

> Schicht: Kern · Abhängig von: [01](01-Vision-und-Prinzipien.md) · Verwandt: [11 Orte/Höfe](11-Orte-Hoefe-Identitaet.md), [12 Forschung](12-Forschungsdaten.md), [13 Interop](13-Interop-Roundtrip.md)

Das Datenmodell orientiert sich an GEDCOM 5.5.1 als lingua franca, ergänzt um App-Konzepte. IDs folgen der GEDCOM-Konvention `@Ixx@`/`@Fxx@`/`@Sxx@`/`@Rxx@`/`@Nxx@`. Dieser Kern ist DOM-frei und headless testbar ([02 INV-ARCH-1/2](02-Zielarchitektur-v9.md)).

---

## 1. Datenbank-Wurzel

```
Database {
  individuals:  Map<PersonId,  Person>
  families:     Map<FamilyId,  Family>
  sources:      Map<SourceId,  Source>
  repositories: Map<RepoId,    Repository>
  notes:        Map<NoteId,    Note>          // NOTE + SNOTE
  placeObjects: Map<PlaceId,   PlaceObject>   // Verwaltungseinheiten (siehe 11)
  hofObjects:   Map<HofId,     HofObject>     // Höfe (siehe 11)
  placForm:     string                        // HEAD PLAC.FORM (Ortsstruktur-Schema)
  gedVersion:   'unknown' | '5.5.1' | '7.0'   // steuert nur den Writer
  header:       HeaderMeta                     // verbatim erhaltene HEAD-Zeilen
}
```

> **Neuaufsatz-Hinweis:** In v8 existiert zusätzlich `extraPlaces` als dritter Ortsspeicher — Altlast ([03 §1](03-Altlasten.md)). v9 kennt nur `placeObjects` + `hofObjects`.

---

## 2. Person

```
Person {
  id: PersonId

  // Identität
  name, given, surname: string
  prefix (NPFX), suffix (NSFX), nick (NICK): string
  sex: 'M' | 'F' | 'U'
  sexSeen: bool                     // stand `1 SEX` in der Quelle? (Fidelity, s. INV-P1)
  givenSeen, surnameSeen,
  suffixSeen: bool                  // standen GIVN/SURN/NSFX in der Quelle? (Fidelity, s. §2 Namenszerlegung)
  title (TITL): string
  nameType (NAME.TYPE): string      // birth | married | aka … am HAUPTnamen (die weiteren tragen ihn je Form, s. „Namen")
  restriction (RESN): string        // confidential | locked | privacy
  email (EMAIL), www (WWW): string
  uid (_UID): string                // externe UUID

  // Hauptereignisse (Sonderstatus, siehe §5): birth, chr, death (+cause), buri
  events: Event[]                   // OCCU, RESI, EDUC, EMIG, IMMI, NATU, EVEN, RELI,
                                    //   GRAD, ADOP, MILI, FACT, CENS, PROP …

  // Namen
  extraNames: PersonName[]          // zweite+ NAME-Blöcke, strukturiert
  aliases: PersonId[]               // ALIA @xref@ — Verweis auf identische Person
  aliaNames: string[]               // GED7 ALIA als Name-String
  nameTrans: NameTranslation[]      // TRAN unter NAME (mehrsprachig)

  // Quellen (siehe §5.3) — EIN vereinheitlichter Zitatspeicher
  topLevelCitations: Citation[]     // SOUR direkt auf INDI-Ebene
  nameCitations: Citation[]         // SOUR unter NAME
  //   → v9 führt beide zu EINEM Zitatspeicher zusammen ([03 §2])

  // Beziehungen
  childOf: ChildLink[]              // FAMC — Mitgliedschaft als Kind
  parentIn: FamilyId[]              // FAMS — Mitgliedschaft als Elternteil
  associations: Association[]       // ASSO/personref — Pate, Zeuge, Informant …

  // Medien & Notizen
  media: MediaCitation[]              // s. §4
  noteText: string
  noteRefs: NoteId[]

  // GED7-Ergänzungen
  noEvents: Set<string>             // NO BIRT etc. — bestätigtes Fehlen
  exids: ExternalId[]               // EXID (FamilySearch ARK, WikiTree …)
  createdDate (CREA): string

  // Forschung (siehe 12) — reisen mit der Datei
  tasks: ResearchTask[]
  researchLog: LogEntry[]
  hypotheses: Hypothesis[]

  // Metadaten
  lastChanged (CHAN/DATE): string
}
```

**ChildLink (FAMC):**
```
ChildLink {
  familyId: FamilyId
  pedigree: 'birth' | 'adopted' | 'foster' | 'sealing' | ''   // PEDI
  fatherRel, motherRel: string     // gleich → PEDI, verschieden → _FREL/_MREL
  fatherRelSeen, motherRelSeen: bool
  citations: Citation[]            // SOUR unter FAMC
}
```

**PersonName (extraNames):** `{ nameRaw, given, surname, prefix, suffix, type, citations: Citation[] }`

Jede weitere `1 NAME`-Zeile wird als `PersonName` gelesen und geschrieben — beidseitig in beiden Formaten (GEDCOM: die zweite+ NAME-Zeile; GRAMPS: das zweite+ `<name>`, dort mit `alt`-Kennung); die Tag↔Typ-Zuordnung liegt einmal in der Enum-Tabelle, unbekannte Werte reisen verlustfrei durch. **Bewusst ohne die Untertag-Ergänzung aus dem NAME-Wert**, die der Hauptname macht ([ADR-v9-112](04-Entscheidungslog.md#adr-v9-112)): die ist eine Anzeige-Bequemlichkeit und erzeugte hier `GIVN`/`SURN`-Zeilen, die in der Quelle nicht standen — eine Ergänzung ohne Anlass ([ADR-v9-197](04-Entscheidungslog.md#adr-v9-197)). Eine Namensform reist so, wie sie kam. Der `TYPE` des HAUPTnamens hat seinen eigenen Platz (`Person.nameType`); ohne ihn wäre er modelliert-aber-heimatlos und ginge beim Neubau verloren ([ADR-v9-207](04-Entscheidungslog.md#adr-v9-207)).

**Namenszerlegung (`name` ↔ `given`/`surname`/`suffix`).** `name` ist der **rohe** GEDCOM-NAME-Wert mit dem Nachnamen zwischen Schrägstrichen (`Anna /Decker/`); `given`/`surname`/`suffix` sind die zerlegte Form. Beide sind Hälften derselben Sache und werden nie einzeln geschrieben.

- **Beim Einlesen** füllt der Parser `given`/`surname`/`suffix` **feldweise** aus `name`, soweit die Untertags `GIVN`/`SURN`/`NSFX` fehlen. Ein vorhandenes Untertag wird nie überschrieben (eine Quelle darf `GIVN Anna` bewusst enger setzen als `Anna Maria /Decker/`).
- Zerlegt wird **nur bei genau einem wohlgeformten Schrägstrichpaar**. `Anna Maria` ohne Schrägstriche bleibt unzerlegt: „alles ist Vorname" wäre eine Aussage, die die Quelle nicht macht — und die der Writer bei der nächsten Bearbeitung als `GIVN`-Zeile in die Datei schriebe.
- **Beim Schreiben in Modell oder Datei** wird `name` aus den Teilen neu gebildet, damit die Schrägstrich-Form erhalten bleibt. Die eine Stelle für beide Richtungen: `core/model/name-parts.ts` (`splitGedcomName` / `composeGedcomName`).
- **Die Herkunft steht im Modell:** `givenSeen`/`surnameSeen`/`suffixSeen` halten fest, ob der Untertag in der QUELLE stand — gefragt am Knoten, nicht am Wert (ein `2 GIVN` ohne Wert ist vorhanden). Ohne diese Auskunft kann der Writer einen eingelesenen Wert nicht von einem zerlegten unterscheiden ([ADR-v9-210](04-Entscheidungslog.md#adr-v9-210)). Dieselbe Rolle wie `sexSeen` (INV-P1) und `Event.seen` (INV-P5); bewusst **kein Tristate an `given`/`surname` selbst** — die Zusage „ab Import gefüllt" darf eine reine Writer-Frage nicht zurücknehmen.
- **Beim Schreiben in die Datei** erscheint ein Untertag aus genau zwei Gründen: **die Quelle hatte ihn**, oder **sein Wert lässt sich aus dem `NAME`-Wert nicht ableiten** (Name ohne Schrägstrichpaar; ein enger gesetztes `GIVN Johann` bei `NAME Johann Wilhelm /von der Heide/`). Sonst nicht — er wäre reine Wiederholung, und die Zerlegung holt ihn beim nächsten Laden identisch zurück. Ein Namens-Edit landet damit im `NAME`-Wert (über `composeGedcomName`), statt eine zweite Fundstelle daneben zu erzeugen; unberührte Records passieren den Writer ohnehin unverändert ([13 §2.1](13-Interop-Roundtrip.md)).

**NameTranslation (nameTrans, GED7 `NAME`/`TRAN`):** `{ lang: string, value: string }` — mehrsprachige Namensform, GED7-Feature. Kein eigenes UI-Bullet in [20](20-Funktionen.md): derselbe Mechanismus wie die Orts-Übersetzung ([11 §1](11-Orte-Hoefe-Identitaet.md), Sprachkürzel+Text, INV-UI-4) — Personen-UI dafür ist noch nicht spezifiziert, verwendet bei Bedarf dieselbe Komponente wie Orts-Übersetzungen.

**Association (ASSO ↔ GRAMPS personref):**
```
Association {
  personRef: PersonId | null       // xref auf verknüpfte Person
  grampsHandle: string | null      // Roundtrip-Fidelity für GRAMPS-Herkunft
  role: string                     // vereinheitlicht: RELA (GED5) / rel (GRAMPS) / ROLE (GED7)
  note: string
  citations: Citation[]
}
```

---

## 3. Familie

```
Family {
  id: FamilyId
  husband, wife: PersonId | null
  children: PersonId[]
  marriage (MARR): Event           // Sonder-Objekt
  engagement (ENGA): Event         // Sonder-Objekt
  events: Event[]                  // weitere FAM-Events
  noteText: string
  citations: Citation[]            // FAM-Level SOUR
  tasks, researchLog, hypotheses   // wie Person (siehe 12)
  lastChanged: string
}
```

> Kind-Beziehungstypen werden **INDI-seitig** (in `ChildLink`) geführt und geschrieben. Beim Lesen einer FAM-seitigen `CHIL`-Beziehung (Legacy) wird sie in die INDI-Seite gemergt.

---

## 4. Quelle, Archiv, Notiz, Medien

```
Source {
  id: SourceId
  abbr (ABBR), title (TITL), author (AUTH), publisher (PUBL), text (TEXT): string
  createdDate (CREA·7.0 / _DATE·5.5.1): string   // Erfassungsdatum; „Erfasst am"
  repo (REPO): RepoId | string     // @Rxx@-Referenz ODER Legacy-Freitext
  callNumber (CALN → GRAMPS reporef/@callno): string   // Signatur
  callMedia (MEDI → GRAMPS reporef/@medium): string
  agnc (DATA.AGNC): string         // verantwortliche Behörde/Stelle
  dataEvents: SourceDataEvent[]    // DATA/EVEN/DATE/PLAC — Ereignis-Abdeckung
  externalRefs (REFN): {value, type}[]
  media: MediaCitation[]              // s. §4
  lastChanged: string
}

Repository {
  id: RepoId
  name (NAME): string
  type (_RTYPE / GRAMPS <type>): string       // Archivtyp (Enum REPO_TYPES)
  address (ADDR): string | null     // TRISTATE wie Event.addr — die Sub-Tags bleiben Passthrough
  phone (PHON), www (WWW), email (EMAIL): string
  findingAid (_FAURL / GRAMPS url): string     // Findbuch/Online-Katalog
  lastChanged: string
}

Note { id, type: 'NOTE' | 'SNOTE', text }
```

**Medien.** `Media` ist eine **Top-Level-Entität** (in `db.media`, gleichrangig zu `Source`/`Repository`/`Note`) — GEDCOM 7.0 und GRAMPS führen Medien nativ als eigene Records, referenziert per Zeiger; GEDCOM 5.5.1 erlaubt das ebenso (plus eine Inline-Altform). Owner halten nur einen **Verweis** (`MediaCitation`), exakt wie `Citation`→`Source` oder `event.placeId`→`PlaceObject`:

```
Media {                             // Top-Level-Datensatz EINES Mediums, in db.media
  id: MediaId                       // GEDCOM: @M@-Xref (Record) bzw. FILE-Pfad (Inline-Altform); GRAMPS: id (O0000). App-intern, NICHT serialisiert
  file: string                      // FILE / <file src> — relativer Pfad, einzige Wahrheitsquelle ([14 §7](14-Dateihandling.md))
  form: string                      // FORM / <file mime> — Dateiformat, KANONISIERT als MIME (Narrow Waist)
  formWire: string                  // der GEDCOM-FORM-Wert, wie er in der Quelle stand (JPEG/BMP/FILE/URL) — Fidelity, s. u.; GRAMPS lässt ihn leer
  type: string                      // MEDI — Medientyp (Standard-Enum unter FORM); GRAMPS/Import oft leer
  typeWire: string                  // `type`, wie er in der Quelle stand — der Vergleichswert für „hat jemand ihn angefasst?", s. u.
  title: string                     // GLOBALE Beschriftung: GED7-Record-TITL / GRAMPS <file description>; leer bei 5.5.1-Inline
  wireOrigin: 'record' | 'inline'   // Wire-Herkunft — der Writer erhält sie unverändert (LP-1): Record→Record+Zeiger, Inline→inline
  lastChanged: string
}

MediaCitation {                     // Referenz-spezifische Verknüpfung EIN Medium ↔ EINE Entität/Ereignis/Zitat
  mediaId: MediaId
  title: string                     // Per-Ref-OVERRIDE der globalen Media.title (leer = globalen Titel verwenden)
  date: string                      // _DATE — Aufnahmedatum in diesem Kontext
  note: string                      // NOTE
  primary: bool                     // _PRIM — Hauptfoto/-dokument für DIESEN Datensatz
  formSeen, typeSeen: bool          // trug DIESE Fundstelle die globalen Zeilen FORM bzw. FORM→MEDI? (Default true: eine neu angelegte ist die volle Form)
  extra: GedNode[]                  // unbekannte Referenz-Kinder (5.5.1-`_SCBK`, GED7-`CROP`, GRAMPS-`region`/`attribute`) verbatim (INV-PT)
}
```
`Person.media`/`Event.media`/`Citation.media`/`Source.media` sind `MediaCitation[]` (Familien-Medien hängen an den Familien-Ereignissen). Trägt die globale Kachelgalerie und „Speichern (alle Ref.)" ([20 §1.4](20-Funktionen.md)).

**Titel: global + Override.** Der Titel liegt global auf `Media` (so führen ihn GED7 und GRAMPS). `MediaCitation.title` ist ein optionaler Per-Ref-Override (nur die 5.5.1-Inline-Form trägt den Titel von Haus aus je Referenz); leer ⇒ der globale `Media.title` gilt. Die UI zeigt/ediert beide Ebenen getrennt ([20 §1.4](20-Funktionen.md) „globale vs. referenz-spezifische Felder").

**Änderungserkennung an der natürlichen Stelle.** Weil `Media` Top-Level ist, wird eine Änderung an den globalen Feldern (Datei/Format/Typ/Titel) **am `Media`-Record** erkannt und zurückgeschrieben (record-basierte Medien: eigener Dirty-Check + Emit wie `Source`), NICHT durch Abscannen jeder referenzierenden Entität. Am Owner wird nur noch die **Verweis-Menge** (welches Medium, Per-Ref-Felder) verglichen. Die 5.5.1-Inline-Altform (`wireOrigin='inline'`, kein Record) trägt ihre Daten weiterhin am Verweis; dort greift die Owner-seitige Erkennung.

**`form` ist kanonisiert, `formWire` ist die Wahrheit.** `form` hält einheitlich das MIME (Standard in 7.0 und GRAMPS, [ADR-v9-126](04-Entscheidungslog.md#adr-v9-126)); die Kanonisierung an der Parse-Grenze ist aber **nicht umkehrbar** — `JPEG`→`image/jpeg`→`jpg`, und `FILE`/`URL` bezeichnen überhaupt kein Format. Ohne einen zweiten Platz schrieb jedes Speichern die Schreibweise um, eine byte-verändernde Projektion ohne Anlass ([ADR-v9-197](04-Entscheidungslog.md#adr-v9-197), [ADR-v9-207](04-Entscheidungslog.md#adr-v9-207)). `formWire` trägt den Rohwert, **eine** Stelle entscheidet über den ausgegebenen `FORM`-Wert, und sie gilt nur, solange der Rohwert noch dasselbe Format bezeichnet wie `form` — ein Nutzer-Edit an Format oder Dateiname setzt ihn damit von selbst außer Kraft, statt ihn einzufrieren. **Nur GEDCOM:** GRAMPS hat kein `FORM`, sein `<file mime>` IST das kanonische MIME und wird aus `form` geschrieben.

**Ein inline-Medium wird an seiner definierenden Fundstelle geändert.** Es hat keinen eigenen Record; seine globalen Felder stehen im `OBJE` des verweisenden Records, und die Datei IST seine Identität. Dieselbe Datei darf mehrfach mit **abweichenden** Untertags dastehen — dann definiert das erste Vorkommen in Dokumentordnung den Datensatz (dieselbe Regel, mit der er gelesen wird), und nur dort schlägt ein globaler Edit durch. Die übrigen Fundstellen bleiben unangetastet: sie zu „korrigieren" hieße, eine Änderung zu schreiben, die niemand gemacht hat ([ADR-v9-207](04-Entscheidungslog.md#adr-v9-207)).

**Ein geteiltes inline-Medium: globale Werte, referenz-spezifische Zeilen** ([ADR-v9-212](04-Entscheidungslog.md#adr-v9-212)). Die 5.5.1-Inline-Form hat keinen eigenen Record: `FORM`/`MEDI` beschreiben die DATEI, stehen physisch aber am `OBJE` **jeder** verweisenden Stelle — und die Stellen dürfen einander widersprechen. `Media` ist nach Dateipfad geschlüsselt und hält deshalb genau eine Fassung (erstes Vorkommen gewinnt, dieselbe Regel für Sammeln und Dirty-Frage). Damit der Writer sie nicht an Fundstellen zurückschreibt, die sie nie trugen, hält `MediaCitation` die referenz-spezifische Auskunft `formSeen`/`typeSeen`, und die Zeile erscheint aus **genau zwei Gründen** — dieselbe Form wie bei den Namens-Untertags (§2 „Namenszerlegung", [ADR-v9-210](04-Entscheidungslog.md#adr-v9-210)):

- **diese Fundstelle trug sie**, oder
- **der globale Wert weicht vom Dateistand ab** (`type` ≠ `typeWire`, bzw. der `FORM`-Wert ≠ `formWire`) — ein Nutzer-Edit käme sonst nirgends an.

Die Frage ist **pro Fundstelle** zu stellen, nicht pro Record: am Realbestand tragen 291 Records zugleich die definierende und eine weitere Fundstelle desselben Mediums.

**Wire-Formen (öffentliche Spec).** GEDCOM: **Pointer** `n OBJE @M1@`→`0 @M1@ OBJE` (5.5.1 optional, **7.0 einzige Form**) und **Inline** `n OBJE`→`FILE`→`FORM`→`MEDI` (nur 5.5.1). GRAMPS: `<object handle id><file src mime description/></object>` + `<objref hlink>`. Alle drei projizieren auf dieselbe `Media`/`MediaCitation`-Struktur; der Writer erhält die Wire-Herkunft je Medium (`wireOrigin`) — **kein** Umschreiben Inline↔Record (bräche LP-1). Medientyp = Standard-`MEDI`, nicht das v8-interne `_TYPE`.

---

## 5. Ereignis- und Zitationsmodell

### 5.1 Event

Alle Ereignisse (Person und Familie) teilen ein Modell:

```
Event {
  type: string              // BIRT, DEAT, OCCU, RESI, MARR, EVEN, FACT, …
  value: string             // Ereignis-Wert (z. B. Beruf bei OCCU)
  eventType: string         // TYPE-Klassifikation bei EVEN/FACT
  date: DateValue           // strukturiert, siehe §5.2
  datePhrase: string        // GED7 PHRASE — Freitext-Datum

  // Ortsbezug (siehe 11)
  place: string             // PROJEKTIONS-CACHE, NICHT eigene Wahrheit
  placeId: PlaceId | null   // FK auf Dorf-PlaceObject (Wahrheit für Ort)
  hofId: HofId | null       // FK auf Hof (orthogonal, optional)
  lati, long: number        // Render-Fallback (single source: placeObject/hofObject)
  addr: string | null       // ADDR — Wire-Adresse (bei RESI etc.); TRISTATE wie date/place, s. u.

  note: string
  citations: Citation[]
  media: MediaCitation[]              // s. §4
}
```

**Sonder-Ereignisse:** `birth`, `chr`, `death` (+`cause`), `buri` auf der Person sowie `marriage`, `engagement` auf der Familie sind eigene benannte Felder (nicht im `events[]`-Array) — feste UI-Position + Sondersemantik. v9 *darf* sie modellintern vereinheitlichen, muss aber Sonderdarstellung im UI und feste Position im Writer beibehalten. **UI-Konsequenz (ADR-v9-30):** progressive Offenlegung darf sie zur Reduktion der Standard-Sichtbarkeit je hinter einem eigenen Schnellauswahl-Pill verstecken (`isEventPresent`-gesteuert, [20 §2](20-Funktionen.md)), aber NICHT mit `events[]` zu einer generischen Hinzufügen/Entfernen-Liste verschmelzen — jedes bleibt eine eigene benannte Sektion. Ein nie aktivierter Pill wird gar nicht gerendert; sein `seen`-Flag (INV-P5, [§6](#6-modell-invarianten)) bleibt dadurch beim Speichern unangetastet.

**Event-Feld-Tristate:** `date`/`place`/`addr` unterscheiden `null` (Tag nicht vorhanden), `''` (Tag vorhanden, leer), `Wert` (belegt). Roundtrip-relevant. **UI-Konsequenz (ADR-v9-30):** ein Bearbeitungsformular darf diese Unterscheidung nicht durch bloßes Auswerten leerer Eingabefelder einebnen — rührt der Nutzer ein Datums-/Ort-Feld nicht an, muss der ursprüngliche Rohwert (inkl. `''`) unverändert erhalten bleiben (Dirty-Tracking statt Feld-Auswertung, [20 §2](20-Funktionen.md)).

**Warum `addr` dazugehört ([ADR-v9-207](04-Entscheidungslog.md#adr-v9-207)):** eine `ADDR`-Zeile OHNE Wert, aber MIT `ADR1`/`ADR2`/`CITY`/`POST`/`CTRY` darunter, ist der Regelfall der strukturierten Adresse. Solange `''` „kein ADDR" hieß, schrieb der Writer die Zeile nicht — und mit ihr fiel der gesamte un-modellierte Teilbaum weg, den der Tiefen-Passthrough sonst rettet. Die Untertags selbst bleiben **bewusst un-modelliert**: sie überleben als Passthrough (INV-PT), sobald ihr Elternknoten wieder geschrieben wird; nötig war nur der dritte Zustand am Elternknoten, nicht fünf neue Felder. Dasselbe gilt für `Repository.address`. **UI-Konsequenz:** ein leeres Adressfeld heißt nicht „kein ADDR" — war die Zeile schon vorher leer, bleibt sie; erst das Löschen eines VORHANDENEN Werts entfernt sie.

### 5.2 Datumsmodell

GEDCOM-Datumsangaben intern als **normalisierter Raw-String** (nach Groß-/Kleinschreibungs-Normierung unverändert exportiert). Qualifier:

| Qualifier | Bedeutung | Beispiel |
|---|---|---|
| — | exakt | `12 MAR 1890` |
| `ABT` | ungefähr | `ABT 1875` |
| `CAL` | errechnet | `CAL 1875` |
| `EST` | geschätzt | `EST 1875` |
| `BEF` | vor | `BEF 1900` |
| `AFT` | nach | `AFT 1850` |
| `BET…AND…` | zwischen | `BET 1880 AND 1890` |
| `FROM…TO…` | Zeitraum | `FROM 1985 TO 2005` |

- **Eingabe:** Qualifier-Dropdown + Tag/Monat/Jahr; Monat akzeptiert Zahl (1–12) + DE/EN-Namen, normiert auf `JAN`–`DEC`.
- **Anzeige — zwei Genauigkeitsstufen, siehe [21 INV-UI-9](21-UI-UX.md) für den Kontextunterschied:**
  - **Volles Datum** (Eigene-Ereignis-Kontext): Tag+Monat+Jahr wo vorhanden, deutscher Monatsname (`12. März 1890`), fehlender Tag → nur `März 1890`, nur Jahr → `1890`. Qualifier-Präfix: `ABT` → `ca. 1875`, `CAL` → `errechnet 1875`, `EST` → `geschätzt 1875`, `BEF` → `vor 1900`, `AFT` → `nach 1850`, `BET…AND…` → `zwischen 1880 und 1890`, `FROM…TO…` → `1985–2005`.
  - **Jahr-only** (Disambiguierungs-/Übersichts-Kontext): wie bisher, nur die Jahreszahl — kein Qualifier-Präfix, keine Monats-/Tagesangabe (der Qualifier ist hier ohnehin irrelevant, es geht nur um grobe zeitliche Einordnung zur Unterscheidung).
  - **Befund (2026-07-12, Nutzer-Fund):** vor dieser Präzisierung nutzte die Anzeige AUSSCHLIESSLICH die Jahr-only-Form — auch im Eigene-Ereignis-Kontext (`PersonDetail`/`FamilyDetail`s eigene Ereigniszeilen). Tag/Monat waren im Editor eingebbar, verschwanden aber in JEDER Lese-Ansicht spurlos; derselbe Mangel betraf den Qualifier (kein „ca."/„vor"/… sichtbar). Nicht nur ein Kosmetik-Fehler: bei Datumsangaben mit Tag+Monat (z. B. Kirchenbuch-Einträge) ging die recherchierte Präzision für den Nutzer unsichtbar verloren, obwohl sie korrekt gespeichert war (kein Datenverlust, nur ein Anzeige-Fehler — roundtrip-sicher).
- **Sortierung:** deterministischer Sortierschlüssel; undatierte Einträge ans Ende.

### 5.3 Zitationsmodell (Citation)

Ein einheitlicher Zitatkörper gilt in **allen** Kontexten (birth/chr/death/buri, events[], marriage/engagement, associations, name, childLink):

```
Citation {
  sourceId: SourceId
  page (PAGE): string
  quay (QUAY): 0 | 1 | 2 | 3 | null  // Zuverlässigkeit; null = kein QUAY-Tag, s. u.
  note: string
  media: MediaCitation[]              // OBJE unter SOUR (strukturiert), s. §4
  eval: EvidenceEval | null           // 3-Achsen-Evidenzmodell (siehe 12 §3)
  deepLinkUrl: string                 // = media[0].file (OBJE/FILE), NICHT page
}
```

- **INV-C1:** Ein Zitat referenziert genau eine Quelle-ID; Mehrfachzitate derselben Quelle mit unterschiedlicher Seite erlaubt, dedupliziert dargestellt.
- **INV-C2:** `quay` bleibt unabhängig editierbar; `eval` kann einen `quay`-Vorschlag ableiten, überschreibt ihn nicht automatisch.
- **`quay` ist ein Tristate** ([ADR-v9-208](04-Entscheidungslog.md#adr-v9-208)). `0` heißt in GEDCOM „unzuverlässig" und ist damit eine AUSSAGE — solange `0` zugleich der Default war, fiel sie mit „gar keine Bewertung" zusammen und der Writer ließ die Zeile weg. `null` = kein `QUAY`-Tag. Der Editor führt beides getrennt (`QUAY —`), anzeigende Leser nehmen `quay ?? 0`.

> **Neuaufsatz-Hinweis:** v8 streut Zitate über viele parallele Maps + gespaltenes `topSources`/`nameCitations` — Altlast ([03 §2/§3](03-Altlasten.md)). v9 modelliert **ein** `Citation[]`-Array je Kontext.

---

## 6. Modell-Invarianten

- **INV-P1:** `sex ∈ {M, F, U}`; unbekannt/leer → `U`. **Von der Wire-Frage unberührt:** weil `U` zugleich der Default jedes Records OHNE `SEX`-Zeile ist, unterdrückte der Writer ein ausdrückliches `1 SEX U`. Das löst `sexSeen` (Vorbild `Event.seen`/INV-P5, [ADR-v9-208](04-Entscheidungslog.md#adr-v9-208)) — bewusst KEIN Tristate an `sex` selbst: INV-P1 sagt jedem Leser einen gültigen Wert zu, und diese Zusage darf eine reine Writer-Frage nicht brechen.
- **INV-P2:** Jede referenzierte ID (in `children`/`husband`/`wife`/`associations`/`aliases`/`citations.sourceId` …) existiert oder wird beim Laden als verwaiste Referenz **gemeldet** (nicht still ignoriert).
- **INV-P3:** INDI-Seite (`childOf`/`parentIn`) und FAM-Seite (`children`/`husband`/`wife`) sind wechselseitig konsistent; die App hält beide Seiten synchron.
- **INV-P4:** Kind-Beziehungstyp wird ausschließlich INDI-seitig geschrieben.
- **INV-P5:** Ein `seen`-Flag auf Sonder-Ereignissen bewahrt leere-aber-vorhandene Blöcke (`1 BIRT` ohne Sub-Tags bleibt beim Roundtrip erhalten).
- Ort-/Projektions-Invarianten: siehe [11](11-Orte-Hoefe-Identitaet.md).
