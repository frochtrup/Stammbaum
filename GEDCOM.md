# GEDCOM Referenz

## Unterstützte Tags

### INDI (Person)

| Tag | Level | Feld in `db.individuals` | Notizen |
|---|---|---|---|
| `NAME` | 1 | `name`, `given`, `surname` | `/Nachname/` Format geparst |
| `GIVN` | 2 | `given` | Überschreibt NAME-Parsing |
| `SURN` | 2 | `surname` | Überschreibt NAME-Parsing |
| `NPFX` | 2 | `prefix` | z.B. „Dr.-Ing." |
| `NSFX` | 2 | `suffix` | z.B. „Jr." |
| `SOUR` | 2 | `nameSources[]` | SOUR direkt unter NAME |
| `SEX` | 1 | `sex` | M / F → sonst 'U' |
| `TITL` | 1 | `titl` | Adelstitel etc. |
| `RELI` | 1 | `reli` | Religion (String) |
| `_UID` | 1 | `uid` | Ancestris/Legacy UUID |
| `BIRT` | 1 | `birth.{date,place,lati,long,sources}` | Sonder-Objekt |
| `CHR` | 1 | `chr.{date,place,lati,long,sources}` | Taufe, Sonder-Objekt |
| `DEAT` | 1 | `death.{date,place,lati,long,sources,cause}` | Sonder-Objekt |
| `BURI` | 1 | `buri.{date,place,lati,long,sources}` | Beerdigung, Sonder-Objekt |
| `CAUS` | 2 | `death.cause` | Sterbeursache (unter DEAT) |
| `OCCU` | 1 | `events[]` type='OCCU' | Beruf |
| `RESI` | 1 | `events[]` type='RESI' | Wohnort |
| `EDUC` | 1 | `events[]` type='EDUC' | Bildung |
| `EMIG` | 1 | `events[]` type='EMIG' | Auswanderung |
| `IMMI` | 1 | `events[]` type='IMMI' | Einwanderung |
| `NATU` | 1 | `events[]` type='NATU' | Einbürgerung |
| `EVEN` | 1 | `events[]` type='EVEN' | Allgemeines Ereignis |
| `GRAD` | 1 | `events[]` type='GRAD' | Abschluss |
| `ADOP` | 1 | `events[]` type='ADOP' | Adoption |
| `MILI` | 1 | `events[]` type='MILI' | Militärdienst |
| `FACT` | 1 | `events[]` type='FACT' | Fakt/Merkmal mit TYPE-Klassifikation |
| `TYPE` | 2 | `events[].eventType` | Unter EVEN/FACT: Klassifikationstext |
| `DATE` | 2 | `events[].date` | Freitext, Legacy-Format |
| `PLAC` | 2 | `events[].place` | Ortsname |
| `MAP` | 3 | *(Kontext)* | Legacy: Level 3 (Standard: Level 2) |
| `LATI` | 4 | `events[].lati` | N52.15 → 52.15, S → negativ |
| `LONG` | 4 | `events[].long` | E7.33 → 7.33, W → negativ |
| `NOTE` | 2 | `events[].note` | Mehrere NOTEs akkumuliert mit `\n` |
| `ADDR` | 2 | `events[].addr` + `events[].addrExtra[]` | Adresse; Sub-Tags (CITY, POST, CONT, _STYLE, _MAP, _LATI, _LONG) via `addrExtra[]` + `_ptDepth=2` |
| `SOUR` | 1–4 | `sourceRefs` (Set) + pro Ereignis `sources[]` | Alle Ebenen gesammelt; `3 PAGE` darunter → `sourcePages[sid]` |
| `PAGE` | 3 | `events[].sourcePages[sid]` / `birth.sourcePages[sid]` etc. | Seitenangabe unter SOUR, editierbar im Ereignis-Formular |
| `QUAY` | 3 | `events[].sourceQUAY[sid]` / `birth.sourceQUAY[sid]` etc. | Quellenqualität 0–3 unter SOUR, editierbar im Quellen-Widget |
| `SOUR` | 1 | `topSources[]` + `topSourcePages{}` + `topSourceQUAY{}` | SOUR direkt unter INDI (Level 1) |
| `PAGE` | 2 | `topSourcePages[sid]` | Seitenangabe unter INDI-Level SOUR |
| `QUAY` | 2 | `topSourceQUAY[sid]` | Quellenqualität unter INDI-Level SOUR |
| `NOTE` | 1 | `noteText` / `noteRefs[]` | Inline-Text oder @Ref@ |
| `CONC`/`CONT` | 2 | `noteText` (angehängt) | Mehrzeilige Notizen |
| `RESN` | 1 | `resn` | Beschränkung (confidential / locked / privacy) |
| `EMAIL` | 1 | `email` | E-Mail-Adresse der Person |
| `WWW` | 1 | `www` | Website-URL der Person |
| `OBJE` | 1 | `media[].{file,title}` | Foto-Referenz |
| `FILE` | 2 | `media[].file` | Pfad (oft Windows-Pfad aus Legacy) |
| `TITL` | 3 | `media[].title` | Unter OBJE/FILE |
| `FAMC` | 1 | `famc[].{famId,frel,mrel,frelSeen,mrelSeen,frelSour,frelPage,frelQUAY,frelSourExtra[],mrelSour,mrelPage,mrelQUAY,mrelSourExtra[],sourIds[],sourPages{},sourQUAY{},sourExtra{}}` | Kind-in-Familie |
| `_FREL` | 2 | `famc[].frel` + `famc[].frelSeen` | Vater-Beziehungstyp (Leiblich / Adoptiert etc.); `frelSeen=true` auch wenn `val=''` |
| `SOUR` | 3 | `famc[].frelSour` (erster) + `famc[].frelSourExtra[]` (weitere) | Quellen für Vater-Beziehung; mehrfache SOURs via `frelSourExtra[]` + `_ptDepth=3` |
| `PAGE` | 4 | `famc[].frelPage` | Seitenangabe (erster SOUR) |
| `QUAY` | 4 | `famc[].frelQUAY` | Quellenqualität 0–3 (erster SOUR) |
| `_MREL` | 2 | `famc[].mrel` + `famc[].mrelSeen` | Mutter-Beziehungstyp; `mrelSeen=true` auch wenn `val=''` |
| `SOUR` | 3 | `famc[].mrelSour` + `famc[].mrelSourExtra[]` | Quellen für Mutter-Beziehung; mehrfache SOURs via `mrelSourExtra[]` |
| `PAGE` | 4 | `famc[].mrelPage` | Seitenangabe (erster SOUR) |
| `QUAY` | 4 | `famc[].mrelQUAY` | Quellenqualität 0–3 (erster SOUR) |
| `SOUR` | 2 | `famc[].sourIds[]` + `famc[].sourPages{}` + `famc[].sourQUAY{}` + `famc[].sourExtra{}` | SOUR direkt unter FAMC (nicht unter _FREL/_MREL) |
| `FAMS` | 1 | `fams[]` | Elternteil-in-Familie |
| `CHAN` | 1 | `lastChanged` | Letztes Änderungsdatum |

### FAM (Familie)

| Tag | Level | Feld | Notizen |
|---|---|---|---|
| `HUSB` | 1 | `husb` | ID der Person |
| `WIFE` | 1 | `wife` | ID der Person |
| `CHIL` | 1 | `children[]` | IDs der Kinder |
| `MARR` | 1 | `marr.{date,place,lati,long,sources}` | Heirat |
| `ENGA` | 1 | `engag.{date,place}` | Verlobung (geparst + geschrieben + editierbar im Familien-Formular) |
| `NOTE` | 1 | `noteText` | Inline-Text mit CONT-Unterstützung |
| `SOUR` | 1–3 | `sourceRefs` (Set) + `marr.sources[]` | |
| `PAGE` | 3 | `marr.sourcePages[sid]` | Seitenangabe unter MARR SOUR |
| `QUAY` | 3 | `marr.sourceQUAY[sid]` | Quellenqualität unter MARR SOUR |

### SOUR (Quelle)

| Tag | Level | Feld | |
|---|---|---|---|
| `ABBR` | 1 | `abbr` | Kurzname (für Listen verwendet) |
| `TITL` | 1 | `title` | Vollständiger Titel |
| `AUTH` | 1 | `author` | |
| `DATE` | 1 | `date` | |
| `PUBL` | 1 | `publ` | Verlag |
| `REPO` | 1 | `repo` | `@Rxx@`-Referenz auf REPO-Record **oder** Legacy-Freitext |
| `CALN` | 2 | `repoCallNum` | Signatur / Bestellnummer (unter `1 REPO`) |
| `TEXT` | 1 | `text` | Notiz / Beschreibung |
| `CHAN` | 1 | `lastChanged` | Letztes Änderungsdatum; wird beim Speichern auto-gesetzt |

### REPO (Archiv / Bibliothek) — v1.2

| Tag | Level | Feld in `db.repositories` | |
|---|---|---|---|
| `NAME` | 1 | `name` | Vollständiger Name des Archivs |
| `ADDR` | 1 | `addr` + `addrExtra[]` | Adresse (Hauptzeile); Sub-Tags (CITY, POST, CONT, _STYLE, _MAP, _LATI, _LONG) via `addrExtra[]` + `_ptDepth=1` |
| `CONT` | 2 | `addr` (angehängt) | Folgezeilen der Adresse (direkte CONT, nicht via addrExtra) |
| `PHON` | 1 | `phon` | Telefonnummer |
| `WWW` | 1 | `www` | Website-URL |
| `EMAIL` | 1 | `email` | E-Mail-Adresse |
| `CHAN` | 1 | `lastChanged` | via `2 DATE` |

### NOTE (Notiz-Record)
Werden beim Parsen in `notes`-Map gespeichert und beim Anzeigen über `noteRefs` aufgelöst. Werden beim Export als Inline-NOTE zurückgeschrieben (Record-Struktur geht verloren).

---

## Parser-Implementierung

### Kontext-Tracking
Der Parser verwendet **flaches Kontext-Tracking** (kein Stack):

```javascript
let lv1tag = '';      // aktueller Level-1-Tag (BIRT, DEAT, EVEN, ...)
let lv2tag = '';      // aktueller Level-2-Tag
let lv3tag = '';      // aktueller Level-3-Tag
let evIdx  = -1;      // Index in cur.events (-1 wenn kein Event aktiv)
let inMap  = false;   // sind wir in einem MAP-Block?
let mapParent = '';   // welcher lv1tag gehört zur aktuellen MAP?
let lastSourVal = ''; // letzte SOUR @id@ — wird bei lv2 UND lv3 SOUR gesetzt
                      // → ermöglicht PAGE/QUAY auf lv3 (Events) und lv4 (_FREL/_MREL)
```

Bei jeder Zeile:
- `lv===0`: neues Haupt-Record (INDI / FAM / SOUR / NOTE / TRLR)
- `lv===1`: alle Kontext-Vars zurücksetzen, neuen lv1tag setzen, `lastSourVal=''`
- `lv===2`: lv2tag setzen, inMap=false (außer tag==='MAP'); bei tag==='SOUR': `lastSourVal=val`
- `lv===3`: wenn tag==='MAP' → inMap=true, mapParent=lv1tag; bei lv2tag==='SOUR' && tag==='PAGE' → `sourcePages[lastSourVal]=val`

### Geo-Koordinaten Parsing
```javascript
// N52.216667 → 52.216667
// S10.5      → -10.5
// W7.183333  → -7.183333
function parseGeoCoord(val) {
  const sign = (val[0] === 'S' || val[0] === 'W') ? -1 : 1;
  return sign * parseFloat(val.slice(1));
}
```

### Quellen-Sammlung (multi-level)
Quellen werden auf **allen Ebenen** gesammelt, sowohl pro Ereignis als auch in der Gesamt-Referenz der Person:

```javascript
// Level 2 unter BIRT:
if (lv1tag === 'BIRT' && tag==='SOUR') {
  cur.birth.sources.push(val);   // für dieses Ereignis
  cur.sourceRefs.add(val);       // für die Gesamtperson
}
// Level 3+ (unter DATE/PLAC):
if (tag === 'SOUR') cur.sourceRefs.add(val);
// Level 1 direkt unter INDI:
if (lv===1 && tag==='SOUR') cur.topSources.push(val);
```

---

## Writer-Implementierung

### Ausgabe-Format
- Zeilenende: `\r\n` (GEDCOM-Standard)
- Kodierung: UTF-8
- Header mit aktuellem Datum

### Vollständige Ausgabe-Struktur
```
0 HEAD
1 SOUR Stammbaum-App / 2 VERS 1.0
1 GEDC / 2 VERS 5.5.1
1 CHAR UTF-8
1 DATE [aktuelles Datum]

0 @Ixx@ INDI
1 NAME Vorname /Nachname/
  2 GIVN / SURN / NPFX / NSFX
  2 SOUR @Sxx@                   ← nameSources[]
1 SEX M/F
1 TITL / 1 RELI
1 _UID [uid]
1 BIRT / 1 CHR / 1 DEAT / 1 BURI
  2 DATE / 2 PLAC
  3 MAP / 4 LATI / 4 LONG         ← wenn Koordinaten vorhanden
  2 CAUS [cause]                  ← nur bei DEAT
  2 SOUR @Sxx@                    ← birth.sources[]
  3 PAGE [Seite]                  ← wenn birth.sourcePages[@Sxx@] gesetzt
1 [OCCU|RESI|EDUC|EMIG|IMMI|NATU|EVEN|GRAD|ADOP|MILI] [value]
  2 TYPE / 2 DATE / 2 PLAC
  3 MAP / 4 LATI / 4 LONG
  2 NOTE [text] / 3 CONT [...]
  2 ADDR [text] / 3 CONT [...]    ← nur wenn ev.addr gesetzt
  2 SOUR @Sxx@                    ← ev.sources[]
  3 PAGE [Seite]                  ← wenn ev.sourcePages[@Sxx@] gesetzt
1 NOTE [noteText] / 2 CONT [...]
1 SOUR @Sxx@                      ← topSources[]
  2 PAGE [Seite]                  ← topSourcePages[sid]
  2 QUAY [0-3]                    ← topSourceQUAY[sid]
1 FAMC @Fxx@
  2 _FREL [Leiblich|Adoptiert]
    3 SOUR @@Sxx@@                ← frelSour (Ancestris @@-Syntax)
      4 PAGE [Seite]              ← frelPage
      4 QUAY [0-3]               ← frelQUAY
  2 _MREL [Leiblich|Adoptiert]
    3 SOUR @@Sxx@@               ← mrelSour
      4 PAGE [Seite]             ← mrelPage
      4 QUAY [0-3]              ← mrelQUAY
1 FAMS @Fxx@
1 OBJE / 2 FILE [path] / 3 TITL [title]
1 CHAN / 2 DATE [lastChanged]

0 @Fxx@ FAM
1 HUSB @Ixx@ / 1 WIFE @Ixx@ / 1 CHIL @Ixx@
1 MARR / 2 DATE / 2 PLAC / 3 MAP
  2 SOUR @Sxx@                    ← marr.sources[]
    3 PAGE [Seite]                ← marr.sourcePages[sid]
    3 QUAY [0-3]                  ← marr.sourceQUAY[sid]
1 ENGA / 2 DATE / 2 PLAC
1 NOTE [noteText] / 2 CONT [...]
1 SOUR @Sxx@                      ← sourceRefs (ohne marr-Quellen)

0 @Sxx@ SOUR
1 ABBR / 1 TITL / 1 AUTH / 1 DATE / 1 PUBL
1 REPO @Rxx@                      ← wenn @Rxx@-Referenz
  2 CALN [Signatur]               ← wenn repoCallNum gesetzt
1 REPO [Freitext]                 ← wenn Legacy-Freitext (kein CALN)
1 TEXT
1 CHAN / 2 DATE [lastChanged]

0 @Rxx@ REPO                      ← v1.2: vor TRLR
1 NAME [name]
1 ADDR [erste Zeile]
  2 CONT [Folgezeile]
1 PHON / 1 WWW / 1 EMAIL
1 CHAN / 2 DATE [lastChanged]

0 TRLR
```

### Kontext-Tracking (Parser)
| Level | Variable | Bedeutung |
|---|---|---|
| lv1 | `lv1tag` | Aktueller Level-1-Tag, `lastSourVal=''` zurücksetzen |
| lv2 | `lv2tag` | Aktueller Level-2-Tag; bei `SOUR`: `lastSourVal=val` |
| lv3 | `lv3tag` | Aktueller Level-3-Tag; bei `SOUR`: `lastSourVal=val` (für lv4 PAGE/QUAY) |
| lv4 | *(kein eigenes Tag)* | Liest `lv1tag`/`lv2tag`/`lv3tag` zur Kontextbestimmung |

### Was NICHT geschrieben wird (bekannte Verluste / Passthrough-Lücken)

**Akzeptierte Verluste (HEAD-Rewrite — by design):**
| Was | Grund |
|---|---|
| `1 SOUR ANCESTRIS` + Sub-Tags | HEAD wird von App neu geschrieben (`1 SOUR Stammbaum-App`) |
| `1 SUBM @S0@`, `1 FILE`, HEAD `1 NOTE` | HEAD-Rewrite |

**Via Passthrough erhalten (kein Datenverlust, aber nicht editierbar im UI):**
| Tag-Kontext | Passthrough-Feld | Optimierungspotenzial |
|---|---|---|
| `2 NICK` und andere NAME-Sub-Tags außer GIVN/SURN/NPFX/NSFX | `_passthrough[]` (via `_ptNameEnd` korrekt nach NAME-Block) | — |
| `1 DATA` in SOUR-Records (GEDCOM 5.5 `2 AGNC`, `2 EVEN`) | SOUR `_passthrough[]` | Selten |
| Mehrere `1 NAME`-Blöcke (Geburtsname, Alias) | INDI `_passthrough[]` | 2. Name editierbar machen |

**Bekannte Einzelverluste (Edge Cases in MeineDaten_ancestris.ged):**
| Was | Anzahl | Ursache |
|---|---|---|
| Doppeltes `3 MAP` unter einer `2 PLAC` | 1 | Erstes MAP-Block verloren — zweiter überschreibt |
| Bare `1 CHAN` ohne `2 DATE` | 1 | Writer schreibt CHAN nur mit DATE |
| `1 REFN`, `1 _VALID` | je 1 | Unbekannte lv=1-Tags die _ptDepth nicht korrekt auslösen |

**Mehrfache inline INDI-Notes:**
Mehrere `1 NOTE`-Zeilen ohne @ref@ auf einer Person werden beim Parsen konkateniert (`noteTextInline += val`) und als ein `1 NOTE`-Block ausgegeben → Count -1 pro zusätzliche inline Note. Kein Datenverlust, aber Struktur verändert.

---

## Datums-Format
GEDCOM-Datumsangaben werden intern als **Raw-String** gespeichert und beim Export unverändert ausgegeben (nach Groß/Klein-Normierung).

**Unterstützte GEDCOM-Qualifier:**
| Qualifier | Bedeutung | Beispiel |
|---|---|---|
| *(keiner)* | Exaktes Datum | `12 MAR 1890` |
| `ABT` | ungefähr (About) | `ABT 1875` |
| `CAL` | errechnet (Calculated) | `CAL 1875` |
| `EST` | geschätzt (Estimated) | `EST 1875` |
| `BEF` | vor (Before) | `BEF 1900` |
| `AFT` | nach (After) | `AFT 1850` |
| `BET … AND …` | zwischen (Between) | `BET 1880 AND 1890` |

**Eingabe in `index.html`:** Strukturierte 3-Felder-Eingabe (Tag / Monat / Jahr) mit Qualifier-Dropdown. Der Monats-Eingabe akzeptiert Zahlen (1–12) sowie deutsch und englisch geschriebene Monatsnamen und normiert diese zu GEDCOM-Abkürzungen (JAN–DEC). `normMonth()` übernimmt diese Konvertierung.

Für die Volltextsuche funktioniert Raw-Format gut (Jahreszahlen sind enthalten). Chronologische Sortierung der Listen ist noch nicht implementiert.

---

## ID-Vergabe
```javascript
function nextId(prefix) {
  // prefix: 'I' für Personen, 'F' für Familien, 'S' für Quellen, 'R' für Repos
  const existing = Object.keys(
    prefix === 'I' ? db.individuals :
    prefix === 'F' ? db.families :
    prefix === 'R' ? db.repositories : db.sources
  );
  const nums = existing.map(id => parseInt(id.replace(/\D/g,''))||0);
  const next = (Math.max(0, ...nums) + 1);
  return `@${prefix}${next}@`;
}
```

## Startperson nach Datei-Load
```javascript
function smallestPersonId() {
  return Object.keys(db.individuals)
    .sort((a, b) => {
      const na = parseInt(a.replace(/\D/g, '')) || 0;
      const nb = parseInt(b.replace(/\D/g, '')) || 0;
      return na - nb;
    })[0] || null;
}
```
Nach dem Laden wird `showTree(smallestPersonId())` aufgerufen — die Person mit der niedrigsten numerischen ID wird als Startpunkt der Sanduhr-Ansicht gesetzt.
