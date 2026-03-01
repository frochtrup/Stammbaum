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
| `TYPE` | 2 | `events[].eventType` | Unter EVEN: „Schule", „Hochschule" etc. |
| `DATE` | 2 | `events[].date` | Freitext, Legacy-Format |
| `PLAC` | 2 | `events[].place` | Ortsname |
| `MAP` | 3 | *(Kontext)* | Legacy: Level 3 (Standard: Level 2) |
| `LATI` | 4 | `events[].lati` | N52.15 → 52.15, S → negativ |
| `LONG` | 4 | `events[].long` | E7.33 → 7.33, W → negativ |
| `NOTE` | 2 | `events[].note` | Mehrere NOTEs akkumuliert mit `\n` |
| `ADDR` | 2 | `events[].addr` | Adresse (nur RESI relevant), `3 CONT` für Zeilen |
| `SOUR` | 1–4 | `sourceRefs` (Set) + pro Ereignis `sources[]` | Alle Ebenen gesammelt; `3 PAGE` darunter → `sourcePages[sid]` |
| `PAGE` | 3 | `events[].sourcePages[sid]` / `birth.sourcePages[sid]` etc. | Seitenangabe unter SOUR, editierbar im Ereignis-Formular |
| `SOUR` | 1 | `topSources[]` | SOUR direkt unter INDI (Level 1) |
| `NOTE` | 1 | `noteText` / `noteRefs[]` | Inline-Text oder @Ref@ |
| `CONC`/`CONT` | 2 | `noteText` (angehängt) | Mehrzeilige Notizen |
| `OBJE` | 1 | `media[].{file,title}` | Foto-Referenz |
| `FILE` | 2 | `media[].file` | Pfad (oft Windows-Pfad aus Legacy) |
| `TITL` | 3 | `media[].title` | Unter OBJE/FILE |
| `FAMC` | 1 | `famc[].{famId,frel,mrel}` | Kind-in-Familie |
| `_FREL` | 2 | `famc[].frel` | Vater-Beziehungstyp (Legacy) |
| `_MREL` | 2 | `famc[].mrel` | Mutter-Beziehungstyp (Legacy) |
| `FAMS` | 1 | `fams[]` | Elternteil-in-Familie |
| `CHAN` | 1 | `lastChanged` | Letztes Änderungsdatum |

### FAM (Familie)

| Tag | Level | Feld | Notizen |
|---|---|---|---|
| `HUSB` | 1 | `husb` | ID der Person |
| `WIFE` | 1 | `wife` | ID der Person |
| `CHIL` | 1 | `children[]` | IDs der Kinder |
| `MARR` | 1 | `marr.{date,place,lati,long,sources}` | Heirat |
| `ENGA` | 1 | `engag.{date,place}` | Verlobung (geparst + geschrieben, kein Edit) |
| `NOTE` | 1 | `noteText` | Inline-Text mit CONT-Unterstützung |
| `SOUR` | 1–3 | `sourceRefs` (Set) + `marr.sources[]` | |

### SOUR (Quelle)

| Tag | Level | Feld | |
|---|---|---|---|
| `ABBR` | 1 | `abbr` | Kurzname (für Listen verwendet) |
| `TITL` | 1 | `title` | Vollständiger Titel |
| `AUTH` | 1 | `author` | |
| `DATE` | 1 | `date` | |
| `PUBL` | 1 | `publ` | Verlag |
| `REPO` | 1 | `repo` | Aufbewahrungsort |
| `TEXT` | 1 | `text` | Notiz / Beschreibung |
| `CHAN` | 1 | `lastChanged` | Letztes Änderungsdatum; wird beim Speichern auto-gesetzt |

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
let lastSourVal = ''; // letzte gesehene 2 SOUR @id@ (für 3 PAGE Zuordnung)
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
1 FAMC @Fxx@ / 2 _FREL / 2 _MREL
1 FAMS @Fxx@
1 OBJE / 2 FILE [path] / 3 TITL [title]
1 CHAN / 2 DATE [lastChanged]

0 @Fxx@ FAM
1 HUSB @Ixx@ / 1 WIFE @Ixx@ / 1 CHIL @Ixx@
1 MARR / 2 DATE / 2 PLAC / 3 MAP / 2 SOUR @Sxx@
1 ENGA / 2 DATE / 2 PLAC
1 NOTE [noteText] / 2 CONT [...]
1 SOUR @Sxx@                      ← sourceRefs (ohne marr-Quellen)

0 @Sxx@ SOUR
1 ABBR / 1 TITL / 1 AUTH / 1 DATE / 1 PUBL / 1 REPO / 1 TEXT
1 CHAN / 2 DATE [lastChanged]

0 TRLR
```

### Was NICHT geschrieben wird (bekannte Verluste)
| Tag | Grund |
|---|---|
| `_STAT` | Nie geparst (Legacy: Never Married etc.) |
| `QUAY` | Qualitätsbewertung — vereinfacht |
| `NOTE`-Records (`0 @Nxx@ NOTE`) | Werden nicht neu ausgegeben |
| `2 SOUR` unter `1 RELI` | RELI ist noch ein String, kein Objekt |
| `EMAIL`, `WWW`, `RESN` | Nie geparst |

---

## Datums-Format
GEDCOM-Datumsangaben werden als **Freitext** gespeichert und nicht normiert:
- `12 MAR 1890` — Standardformat
- `ABT 1875` — ungefähr (About)
- `BEF 1900` — vor (Before)
- `AFT 1850` — nach (After)
- `1973 To 1977` — Zeitraum (Legacy-Format)
- `Aug 1977 To Jul 1984` — Zeitraum mit Monaten

Für die Volltextsuche funktioniert das gut (Jahreszahlen sind enthalten). Für Sortierung nach Datum wäre Normierung nötig (nicht implementiert).

---

## ID-Vergabe
```javascript
function nextId(prefix) {
  // prefix: 'I' für Personen, 'F' für Familien, 'S' für Quellen
  const existing = Object.keys(
    prefix === 'I' ? db.individuals :
    prefix === 'F' ? db.families : db.sources
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
