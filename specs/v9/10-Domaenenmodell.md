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
  title (TITL): string
  religion (RELI): string
  restriction (RESN): string        // confidential | locked | privacy
  email (EMAIL), www (WWW): string
  uid (_UID): string                // externe UUID

  // Hauptereignisse (Sonderstatus, siehe §5): birth, chr, death (+cause), buri
  events: Event[]                   // OCCU, RESI, EDUC, EMIG, IMMI, NATU, EVEN,
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
  abbr (ABBR), title (TITL), author (AUTH), date (DATE), publisher (PUBL), text (TEXT): string
  repo (REPO): RepoId | string     // @Rxx@-Referenz ODER Legacy-Freitext
  callNumber (CALN): string        // Signatur
  callMedia (MEDI): string
  dataEvents: SourceDataEvent[]    // DATA/EVEN/DATE/PLAC — Ereignis-Abdeckung
  externalRefs (REFN): {value, type}[]
  media: MediaCitation[]              // s. §4
  lastChanged: string
}

Repository {
  id: RepoId
  name (NAME): string
  type (_RTYPE / GRAMPS <type>): string       // Archivtyp (Enum REPO_TYPES)
  address (ADDR + Sub-Tags): string
  phone (PHON), www (WWW), email (EMAIL): string
  findingAid (_FAURL / GRAMPS url): string     // Findbuch/Online-Katalog
  lastChanged: string
}

Note { id, type: 'NOTE' | 'SNOTE', text }
```

**Medien — Vorschlag, noch nicht entschieden.** Der aktuelle `MediaRef { file, title }` wird je Kontext dupliziert eingebettet (`Citation.media`, `Event.media`, `Person.media`, `Family.media`, `Source.media`) — mehrere unabhängige Kopien desselben Datensatzes, wenn ein Foto mehrfach verknüpft ist, nur über den `file`-Pfad identifiziert. Vorgeschlagene Auflösung, analog zu Orten (`PlaceObject`+`event.placeId`) und Quellen (`Source`+`Citation`):

```
Media {
  id: MediaId
  file: string                      // FILE — relativer Pfad (Datei-/Sync-Ordner, [14 §7](14-Dateihandling.md)), einzige Wahrheitsquelle
  form: string                      // FORM — Dateiformat (jpg, pdf, …)
  type: string                      // MEDI — Medientyp (Foto/Dokument/Ton/Video …)
  lastChanged: string
}

MediaCitation {                     // Referenz-spezifische Verknüpfung EIN Medium ↔ EINE Entität/Ereignis/Zitat
  mediaId: MediaId
  title: string                     // TITL — Beschriftung NUR für diesen Kontext
  date: string                      // _DATE — Aufnahmedatum in diesem Kontext
  note: string                      // NOTE
  primary: bool                     // _PRIM — Hauptfoto/-dokument für DIESEN Datensatz
}
```
`Person.media`/`Family.media`/`Event.media`/`Citation.media`/`Source.media` sind `MediaCitation[]` (statt `MediaRef[]`) — EIN Medium, viele typisierte Referenzen mit eigenen Feldern, gleiche Rollenverteilung wie `Source`/`Citation`. Voraussetzung für die globale Kachelgalerie und „Speichern (alle Ref.)" ([20 §1.4](20-Funktionen.md)) — mit dupliziert-flachen Kopien nicht baubar (keine Medien-Identität über Referenzen hinweg, nur Pfad-String-Zufallstreffer).

**Vor Umsetzung Pflicht:** betrifft Parser/Writer an fünf Call-Sites (`gedcom-parse.ts`/`write-back-emit.ts`) — `roundtrip-verify` auf allen Fixtures nach der Migration (LP-1).

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
  addr: string              // ADDR — Wire-Adresse (bei RESI etc.)

  note: string
  citations: Citation[]
  media: MediaCitation[]              // s. §4
}
```

**Sonder-Ereignisse:** `birth`, `chr`, `death` (+`cause`), `buri` auf der Person sowie `marriage`, `engagement` auf der Familie sind eigene benannte Felder (nicht im `events[]`-Array) — feste UI-Position + Sondersemantik. v9 *darf* sie modellintern vereinheitlichen, muss aber Sonderdarstellung im UI und feste Position im Writer beibehalten. **UI-Konsequenz (ADR-v9-30):** progressive Offenlegung darf sie zur Reduktion der Standard-Sichtbarkeit je hinter einem eigenen Schnellauswahl-Pill verstecken (`isEventPresent`-gesteuert, [20 §2](20-Funktionen.md)), aber NICHT mit `events[]` zu einer generischen Hinzufügen/Entfernen-Liste verschmelzen — jedes bleibt eine eigene benannte Sektion. Ein nie aktivierter Pill wird gar nicht gerendert; sein `seen`-Flag (INV-P5, [§6](#6-modell-invarianten)) bleibt dadurch beim Speichern unangetastet.

**Event-Feld-Tristate:** `date`/`place` unterscheiden `null` (Tag nicht vorhanden), `''` (Tag vorhanden, leer), `Wert` (belegt). Roundtrip-relevant. **UI-Konsequenz (ADR-v9-30):** ein Bearbeitungsformular darf diese Unterscheidung nicht durch bloßes Auswerten leerer Eingabefelder einebnen — rührt der Nutzer ein Datums-/Ort-Feld nicht an, muss der ursprüngliche Rohwert (inkl. `''`) unverändert erhalten bleiben (Dirty-Tracking statt Feld-Auswertung, [20 §2](20-Funktionen.md)).

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
  quay (QUAY): 0 | 1 | 2 | 3         // Zuverlässigkeit
  note: string
  media: MediaCitation[]              // OBJE unter SOUR (strukturiert), s. §4
  eval: EvidenceEval | null           // 3-Achsen-Evidenzmodell (siehe 12 §3)
  deepLinkUrl: string                 // = media[0].file (OBJE/FILE), NICHT page
}
```

- **INV-C1:** Ein Zitat referenziert genau eine Quelle-ID; Mehrfachzitate derselben Quelle mit unterschiedlicher Seite erlaubt, dedupliziert dargestellt.
- **INV-C2:** `quay` bleibt unabhängig editierbar; `eval` kann einen `quay`-Vorschlag ableiten, überschreibt ihn nicht automatisch.

> **Neuaufsatz-Hinweis:** v8 streut Zitate über viele parallele Maps + gespaltenes `topSources`/`nameCitations` — Altlast ([03 §2/§3](03-Altlasten.md)). v9 modelliert **ein** `Citation[]`-Array je Kontext.

---

## 6. Modell-Invarianten

- **INV-P1:** `sex ∈ {M, F, U}`; unbekannt/leer → `U`.
- **INV-P2:** Jede referenzierte ID (in `children`/`husband`/`wife`/`associations`/`aliases`/`citations.sourceId` …) existiert oder wird beim Laden als verwaiste Referenz **gemeldet** (nicht still ignoriert).
- **INV-P3:** INDI-Seite (`childOf`/`parentIn`) und FAM-Seite (`children`/`husband`/`wife`) sind wechselseitig konsistent; die App hält beide Seiten synchron.
- **INV-P4:** Kind-Beziehungstyp wird ausschließlich INDI-seitig geschrieben.
- **INV-P5:** Ein `seen`-Flag auf Sonder-Ereignissen bewahrt leere-aber-vorhandene Blöcke (`1 BIRT` ohne Sub-Tags bleibt beim Roundtrip erhalten).
- Ort-/Projektions-Invarianten: siehe [11](11-Orte-Hoefe-Identitaet.md).
