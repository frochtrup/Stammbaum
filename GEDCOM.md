# GEDCOM / GRAMPS — Wire-Referenz

> Zeitlose Referenz für Tag-Semantik, Datei-Format und Roundtrip-Details des GEDCOM-Standards (5.5.1 / 7.0). Enthält **externes Standardwissen**, das die Specs bewusst nicht duplizieren.
>
> Das **v9-Datenmodell** steht in [`specs/v9/10-Domaenenmodell.md`](specs/v9/10-Domaenenmodell.md); die **Roundtrip- und Passthrough-Anforderung** in [`specs/v9/13-Interop-Roundtrip.md`](specs/v9/13-Interop-Roundtrip.md). Die konkrete v8-Implementierung (Parser-Interna, `_`-Tag-Häufigkeiten in Bestandsdateien) liegt in [`legacy-v8/`](legacy-v8/) — hier absichtlich nicht.

---

## 1. Unterstützte Tags

Spalten: **Tag** · **Level** · **Bedeutung**. Die Zuordnung auf das v9-Modell (Sonder-Ereignisse, `Citation[]`, `PlaceObject`/`HofObject` …) regelt [10](specs/v9/10-Domaenenmodell.md).

### INDI (Person)

| Tag | Level | Bedeutung |
|---|---|---|
| `NAME` | 1 | Name; `Vorname /Nachname/`-Format |
| `GIVN` / `SURN` | 2 | Vor-/Nachname (überschreiben NAME-Parsing) |
| `NPFX` / `NSFX` | 2 | Namenspräfix / -suffix |
| `NICK` | 2 | Rufname |
| `SOUR` | 2 | Zitat unter NAME |
| `SEX` | 1 | `M` / `F` → sonst `U` |
| `TITL` | 1 | Titel |
| `RELI` | 1 | Religion |
| `RESN` | 1 | Beschränkung (confidential / locked / privacy) |
| `EMAIL` / `WWW` | 1 | Kontaktangaben |
| `BIRT` / `CHR` / `DEAT` / `BURI` | 1 | Haupt-Ereignisse (Sonderstatus im Modell) |
| `CAUS` | 2 | Todesursache (unter DEAT) |
| `OCCU` `RESI` `EDUC` `EMIG` `IMMI` `NATU` `EVEN` `GRAD` `ADOP` `MILI` `FACT` `CENS` `PROP` | 1 | weitere Ereignisse |
| `TYPE` | 2 | Klassifikationstext unter EVEN/FACT |
| `DATE` | 2 | Ereignis-Datum (Raw-String, § 5) |
| `PLAC` | 2 | Ortsname (Projektions-Cache, siehe [11](specs/v9/11-Orte-Hoefe-Identitaet.md)) |
| `MAP` / `LATI` / `LONG` | 3/4 | Geo-Koordinaten (MAP auf Lv 2 **oder** 3 tolerieren; § 3) |
| `NOTE` | 1/2 | Inline-Text (mehrere akkumuliert) oder `@Ref@` |
| `ADDR` | 2 | Adresse + Sub-Tags (CITY, POST, CONT, …) |
| `SOUR` / `PAGE` / `QUAY` | 1–4 | Zitat auf jeder Ebene; PAGE = Seite, QUAY = Zuverlässigkeit 0–3 |
| `OBJE` / `FILE` / `FORM` / `_TYPE` | 1/2/2/2 | Medien-Objekt-Ebene (global, gilt für ALLE Referenzen — `Media`, [10 §4](specs/v9/10-Domaenenmodell.md)): FILE = relativer Pfad (einzige Wahrheitsquelle), FORM = Dateiformat, `_TYPE` = Medientyp (Foto/Dokument/…) |
| `OBJE` / `TITL` / `_DATE` / `NOTE` / `_PRIM` (an der Referenzstelle) | 1–2 | Referenz-spezifische Ebene (NUR für DIESE Verknüpfung — `MediaCitation`, [10 §4](specs/v9/10-Domaenenmodell.md)): TITL = Beschriftung in diesem Kontext, `_DATE` = Aufnahmedatum in diesem Kontext, `_PRIM` = Hauptfoto für diesen Datensatz |
| `FAMC` | 1 | Mitgliedschaft als Kind |
| `PEDI` | 2 | Eltern-Kind-Verhältnis: `birth` \| `adopted` \| `foster` \| `sealing` |
| `FAMS` | 1 | Mitgliedschaft als Elternteil |
| `ALIA` | 1 | `@xref@`-Zeiger (GED5) **oder** Name-String (GED7) |
| `ASSO` / `RELA` / `ROLE` | 1/2 | Assoziation (Pate, Zeuge …); Rolle aus `RELA` (GED5, Freitext) **oder** `ROLE` (GED7, Enum) |
| `NO` / `EXID` / `CREA` | 1 | GED7: bestätigtes Fehlen / externe ID / Erstellungsdatum |
| `CHAN` | 1 | letztes Änderungsdatum (via `2 DATE`) |

### FAM (Familie)

| Tag | Level | Bedeutung |
|---|---|---|
| `HUSB` / `WIFE` | 1 | Ehemann / Ehefrau (Personen-ID) |
| `CHIL` | 1 | Kind (Personen-ID) |
| `MARR` / `ENGA` | 1 | Heirat / Verlobung (Sonder-Ereignisse) |
| `NOTE` | 1 | Notiz (CONT-fähig) |
| `SOUR` / `PAGE` / `QUAY` | 1–3 | Zitate (auch unter MARR) |

### SOUR (Quelle)

| Tag | Level | Bedeutung |
|---|---|---|
| `ABBR` / `TITL` / `AUTH` / `DATE` / `PUBL` / `TEXT` | 1 | Kurzname / Titel / Autor / Datum / Verlag / Beschreibung |
| `REPO` | 1 | `@Rxx@`-Referenz **oder** Legacy-Freitext |
| `CALN` / `MEDI` | 2/3 | Signatur / Medium (unter REPO) |
| `DATA` → `EVEN` / `DATE` / `PLAC` | 1–3 | Ereignis-Abdeckung der Quelle |
| `REFN` (+`TYPE`) | 1/2 | externe Referenznummer |
| `CHAN` | 1 | Änderungsdatum |

### REPO (Archiv)

| Tag | Level | Bedeutung |
|---|---|---|
| `NAME` | 1 | Name des Archivs |
| `ADDR` (+ `CONT`, Sub-Tags) | 1/2 | Adresse |
| `PHON` / `WWW` / `EMAIL` | 1 | Kontakt |
| `CHAN` | 1 | Änderungsdatum |

### NOTE / SNOTE (Record)

`0 NOTE`/`0 SNOTE`-Records werden in einer Notiz-Map gehalten (Typ `NOTE`|`SNOTE`) und über Referenzen aufgelöst. Writer gibt `0 NOTE` bzw. `0 SNOTE` je nach Typ aus.

### Proprietäre `_`-Tags

Alle `_`-Tags werden im Roundtrip **verlustfrei erhalten** (Passthrough-Prinzip, [13 § 2](specs/v9/13-Interop-Roundtrip.md)). Modellierte `_`-Tags (editierbar gemacht) müssen vom Parser aus dem Passthrough **herausgelöst** werden, sonst Doppelschreibung. Beispiele modellierter Extensions: `_UID`, `_FREL`/`_MREL` (→ PEDI), `_EVAL` (Evidenz, [12](specs/v9/12-Forschungsdaten.md), noch nicht implementiert), `_HYPO` (Hypothese, implementiert), `_RTYPE`/`_FAURL` (Repository), `_TASK` (Forschungsaufgabe, implementiert), `_RLOG` (Forschungsprotokoll, implementiert). Wire-Formate aller drei 1:1 aus dem echten v8-Code (`gedcom-writer.js`/`gedcom-parser.js`) übernommen, NICHT neu erfunden (ADR-v9-37) — Byte-Kompatibilität mit evtl. vorhandenen echten v8-Dateien, die dieses Feature bereits genutzt haben. Der Strict-Export lässt alle `_`-Tags weg ([13 § 5](specs/v9/13-Interop-Roundtrip.md)).

**`_TASK`** (Forschungsaufgabe, [12 § 1](specs/v9/12-Forschungsdaten.md), auf INDI **und** FAM, mehrfach wiederholbar, Level 1):

| Tag | Level | Bedeutung |
|---|---|---|
| `_TASK` | 1 | Werttext = Aufgaben-Text |
| `_CAT` | 2 | Kategorie (Freitext) |
| `_DONE` | 2 | `0`/`1` — wird **immer** geschrieben, beim Lesen aber **nicht** ausgewertet (redundant zu `_TSTAT`) |
| `_TSTAT` | 2 | Status: `todo` \| `doing` \| `done` — **die Wahrheit**, `done`-Flag wird beim Parsen immer daraus abgeleitet |
| `_DATE` | 2 | Anlagedatum (EIGENER Tag, NICHT Standard-`DATE`) |
| `_ID` | 2 | Aufgaben-ID |
| `SOUR` | 2 | optionaler Quellen-Bezug (Standard-Tag, roher `@Sxx@`-Xref) — `sourceRef`, v9-Ergänzung (ADR-v9-36) |

**`_RLOG`** (Forschungsprotokoll, [12 § 2](specs/v9/12-Forschungsdaten.md), auf INDI **und** FAM, mehrfach wiederholbar, Level 1; kein `_ID` — index-adressiert):

| Tag | Level | Bedeutung |
|---|---|---|
| `_RLOG` | 1 | ohne Wert |
| `DATE` | 2 | Standard-Tag (bewusst NICHT `_DATE` — v8 ist hier inkonsistent zu `_TASK`, aus Oracle-Treue übernommen) |
| `REPO` | 2 | roher `@Rxx@`-Xref |
| `SOUR` | 2 | roher `@Sxx@`-Xref |
| `_QUERY` | 2 | Suchbegriff |
| `_RESULT` | 2 | `found` \| `notfound` \| `pending` |
| `NOTE` | 2 | Notiz, CONT-fähig |
| `_TASKID` | 2 | optionaler Bezug zur auslösenden `ResearchTask.id` — v9-Ergänzung, kein Oracle-Vorbild (ADR-v9-36) |

**`_HYPO`** (Hypothese, [12 § 4](specs/v9/12-Forschungsdaten.md), auf INDI **und** FAM, mehrfach wiederholbar, Level 1):

| Tag | Level | Bedeutung |
|---|---|---|
| `_HYPO` | 1 | Werttext = die Behauptung |
| `_ID` | 2 | Hypothesen-ID |
| `_HSTAT` | 2 | Status: `open` \| `confirmed` \| `rejected` |
| `_HWGT` | 2 | Forscher-Konfidenz: `low` \| `medium` \| `high` |
| `_DATE` | 2 | Anlagedatum (EIGENER Tag, wie bei `_TASK`) |
| `SOUR` | 2 | wiederholbar — ein `evidence[]`-Item pro Block (SID-Referenz, INV-H2) |
| `PAGE` | 3 | gehört zum vorangehenden `SOUR`-Block (`evidence[].page`) |
| `_RATIO` | 2 | Begründung (`rationale`), CONT-fähig |
| `_CONCL` | 2 | Auflösungsnotiz (`conclusion`), CONT-fähig |

---

## 2. GEDCOM 7.0 — Deltas

Der Parser liest 5.5.1 **und** 7.0; der Writer gibt 7.0 nur bei `gedVersion === '7.0'` aus. Standard bleibt 5.5.1.

| Feature | GED5 (Standard) | GED7 (opt-in) |
|---|---|---|
| Fehlendes Ereignis | `1 NOTE Kein bekanntes Ereignis: BIRT` | `1 NO BIRT` |
| Externe IDs | `1 REFN` + `2 TYPE` | `1 EXID` + `2 TYPE` |
| Geteilte Notizen | `0 NOTE @xref@` | `0 SNOTE @xref@` |
| Orts-/Namensübersetzung | `_TRAN` (+ `LANG`) | `TRAN` (+ `LANG`) |
| Datum-Freitext | — | `PHRASE` unter `DATE` |
| ASSO-Rolle | `RELA` (Freitext) | `ROLE` (Enum: GODP, WITN …) |
| ALIA | nur `@xref@` | auch Name-String |
| CONC | erlaubt | nicht erlaubt (nur CONT) |
| `CHAR UTF-8` im HEAD | vorhanden | entfällt |
| `GEDC`/`VERS` | `5.5.1` | `7.0` |
| `SCHMA` | — | deklariert alle `_`-Tags (`2 TAG _xyz https://…`) |

**Orts-/Namensübersetzung — Domänenmodell:** Personen nutzen `NameTranslation[]` (`Person.nameTrans`, Spec 10 §2). Orte nutzen denselben Struct-Typ (`PlaceObject.translations`, Spec 11 §1).

---

## 3. Wire-Format

**Ausgabe:** `\r\n`-Zeilenenden, UTF-8. Der HEAD wird von der App neu geschrieben (`1 SOUR Stammbaum-App`); der Rest der Datei bleibt verbatim (Roundtrip, [13](specs/v9/13-Interop-Roundtrip.md)).

**Grundstruktur:**
```
0 HEAD
  1 SOUR <app> / 2 VERS <v>
  1 GEDC / 2 VERS 5.5.1        (bzw. 7.0)
  1 CHAR UTF-8                 (nur GED5)
  1 DATE <Datum>
0 @Ixx@ INDI   …              (Personen)
0 @Fxx@ FAM    …              (Familien)
0 @Sxx@ SOUR   …              (Quellen)
0 @Rxx@ REPO   …              (Archive)
0 @Nxx@ NOTE|SNOTE …          (Notizen)
0 TRLR
```
Feste Ausgabe-Reihenfolge je Record (Sonder-Ereignisse an fester Position); Detail der Feld-Serialisierung → [10](specs/v9/10-Domaenenmodell.md)/[13](specs/v9/13-Interop-Roundtrip.md).

**Geo-Koordinaten:** Himmelsrichtungs-Präfix, Süd/West negativ.
```
N52.216667 → 52.216667      S10.5 → -10.5      W7.183333 → -7.183333
```
`MAP` auf Level 2 **und** 3 tolerieren (Legacy-Exportprogramme).

---

## 4. HEAD-Rewrite (akzeptierte, dokumentierte Abweichung)

Beim Neuschreiben des HEAD gehen bewusst verloren: `1 SOUR ANCESTRIS` + Sub-Tags, `1 SUBM`, HEAD-`1 FILE`, HEAD-`1 NOTE`. Das ist die einzige by-design-Abweichung im ansonsten byte-treuen Roundtrip (`net_delta=0` misst gegen die Ur-Quelle bei idempotenten Speichervorgängen).

---

## 5. Datums-Format

Datumsangaben werden intern als **Raw-String** geführt und unverändert exportiert (nach Groß-/Kleinschreibungs-Normierung).

| Qualifier | Bedeutung | Beispiel |
|---|---|---|
| *(keiner)* | exakt | `12 MAR 1890` |
| `ABT` | ungefähr | `ABT 1875` |
| `CAL` | errechnet | `CAL 1875` |
| `EST` | geschätzt | `EST 1875` |
| `BEF` / `AFT` | vor / nach | `BEF 1900` / `AFT 1850` |
| `BET … AND …` | zwischen | `BET 1880 AND 1890` |
| `FROM … TO …` | Zeitraum | `FROM 1985 TO 1990` |

Monate als GEDCOM-Abkürzung `JAN`–`DEC`. Eingabe akzeptiert Zahl (1–12) sowie deutsche/englische Namen und normiert. Anzeige lokalisiert (§ 5.2 in [10](specs/v9/10-Domaenenmodell.md)).

---

## 6. Identität & Startpunkt

- **ID-Vergabe:** höchste vorhandene numerische ID je Typ + 1, im Format `@<Präfix><n>@` (`I` Personen · `F` Familien · `S` Quellen · `R` Archive · `N` Notizen).
- **Startperson nach Load:** Person mit der kleinsten numerischen ID → Einstieg der Baumansicht.
