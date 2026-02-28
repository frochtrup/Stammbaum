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
| `SEX` | 1 | `sex` | M / F → sonst 'U' |
| `TITL` | 1 | `titl` | Adelstitel etc. |
| `RELI` | 1 | `reli` | Religion |
| `BIRT` | 1 | `birth.{date,place,lati,long,sources}` | |
| `CHR` | 1 | `chr.{date,place,lati,long,sources}` | Taufe |
| `DEAT` | 1 | `death.{date,place,lati,long,sources}` | |
| `BURI` | 1 | `buri.{date,place,lati,long,sources}` | Beerdigung |
| `OCCU` | 1 | `events[]` type='OCCU' | Beruf |
| `RESI` | 1 | `events[]` type='RESI' | Wohnort |
| `EDUC` | 1 | `events[]` type='EDUC' | Bildung |
| `EMIG` | 1 | `events[]` type='EMIG' | Auswanderung |
| `IMMI` | 1 | `events[]` type='IMMI' | Einwanderung |
| `NATU` | 1 | `events[]` type='NATU' | Einbürgerung |
| `EVEN` | 1 | `events[]` type='EVEN' | Allgemeines Ereignis |
| `GRAD` | 1 | `events[]` type='GRAD' | Abschluss |
| `ADOP` | 1 | `events[]` type='ADOP' | Adoption |
| `TYPE` | 2 | `events[].eventType` | Unter EVEN: „Schule", „Hochschule" etc. |
| `DATE` | 2 | `events[].date` | Freitext, Legacy-Format |
| `PLAC` | 2 | `events[].place` | |
| `MAP` | 3 | *(Kontext)* | Legacy: Level 3 (Standard: Level 2) |
| `LATI` | 4 | `events[].lati` | N52.15 → 52.15, S → negativ |
| `LONG` | 4 | `events[].long` | E7.33 → 7.33, W → negativ |
| `SOUR` | 1–4 | `sourceRefs` (Set) + pro Ereignis `sources[]` | Alle Ebenen |
| `NOTE` | 1 | `noteText` / `noteRefs[]` | Inline-Text oder @Ref@ |
| `CONC`/`CONT` | 2 | `noteText` (angehängt) | Mehrzeilige Notizen |
| `OBJE` | 1 | `media[].{file,title}` | Foto-Referenz |
| `FILE` | 2 | `media[].file` | Unter OBJE |
| `FAMC` | 1 | `famc[].{famId,frel,mrel}` | Kind-in-Familie |
| `_FREL` | 2 | `famc[].frel` | Vater-Beziehungstyp (Legacy) |
| `_MREL` | 2 | `famc[].mrel` | Mutter-Beziehungstyp (Legacy) |
| `FAMS` | 1 | `fams[]` | Ehepartner-in-Familie |
| `CHAN` | 1 | `lastChanged` | Letztes Änderungsdatum |

### FAM (Familie)

| Tag | Level | Feld | |
|---|---|---|---|
| `HUSB` | 1 | `husb` | ID der Person |
| `WIFE` | 1 | `wife` | ID der Person |
| `CHIL` | 1 | `children[]` | ID der Person |
| `MARR` | 1 | `marr.{date,place,lati,long,sources}` | |
| `ENGA` | 1 | `engag.{date,place}` | Verlobung (gelesen und geschrieben, nicht bearbeitet) |
| `NOTE` | 1 | `noteText` | |
| `SOUR` | 1–3 | `sourceRefs` (Set) | |

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

### NOTE (Notiz-Record)
Werden beim Parsen in `notes`-Map gespeichert und beim Anzeigen über `noteRefs` aufgelöst. Nicht editierbar.

---

## Parser-Implementierung

### Kontext-Tracking
Der Parser verwendet **flaches Kontext-Tracking** (kein Stack):

```javascript
let lv1tag = '';    // aktueller Level-1-Tag (BIRT, DEAT, EVEN, ...)
let lv2tag = '';    // aktueller Level-2-Tag
let lv3tag = '';    // aktueller Level-3-Tag
let evIdx  = -1;    // Index in cur.events (-1 wenn kein Event aktiv)
let inMap  = false; // sind wir in einem MAP-Block?
let mapParent = ''; // welcher lv1tag gehört zur aktuellen MAP?
```

Bei jeder Zeile:
- `lv===1`: alle Kontext-Vars zurücksetzen, neuen lv1tag setzen
- `lv===2`: lv2tag setzen, `inMap=false` (außer tag==='MAP')
- `lv===3`: wenn tag==='MAP' → `inMap=true`, `mapParent=lv1tag`

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
Quellen werden auf **allen Ebenen** (1–4) gesammelt, sowohl pro Ereignis als auch in der Person-Gesamt-Referenz:

```javascript
// Level 2 in BIRT-Block:
if (lv1tag === 'BIRT' && tag==='SOUR' && val.startsWith('@')) {
  cur.birth.sources.push(val);   // für dieses Ereignis
  cur.sourceRefs.add(val);       // für die Gesamtperson
}
// Level 3 (unter DATE/PLAC):
if (tag === 'SOUR' && val.startsWith('@')) cur.sourceRefs.add(val);
```

---

## Writer-Implementierung

### Ausgabe-Format
- Zeilenende: `\r\n` (GEDCOM-Standard)
- Kodierung: UTF-8
- Header mit aktuellem Datum

### Was geschrieben wird
```
0 HEAD
1 SOUR Stammbaum-App
2 VERS 1.0
1 GEDC / 2 VERS 5.5.1
1 CHAR UTF-8
1 DATE [aktuelles Datum]

0 @Ixx@ INDI
1 NAME Vorname /Nachname/
2 GIVN / SURN / NPFX / NSFX
1 TITL / 1 RELI / 1 SEX
1 BIRT / 2 DATE / 2 PLAC / 3 MAP / 4 LATI / 4 LONG / 2 SOUR
1 CHR / 1 DEAT / 1 BURI  (gleiche Struktur inkl. SOUR)
1 OCCU ... / 1 EVEN ... (alle events[])
  2 TYPE / 2 DATE / 2 PLAC / 3 MAP / 4 LATI / 4 LONG / 2 SOUR
1 NOTE ... (mit 2 CONT für Zeilenumbrüche)
1 FAMC + 2 _FREL / 2 _MREL
1 FAMS
1 OBJE + 2 FILE / 3 TITL
1 CHAN + 2 DATE

0 @Fxx@ FAM
1 HUSB / 1 WIFE / 1 CHIL
1 MARR + 2 DATE / 2 PLAC / 3 MAP / 2 SOUR
1 ENGA + 2 DATE / 2 PLAC
1 NOTE (mit 2 CONT für Zeilenumbrüche)

0 @Sxx@ SOUR
1 ABBR / 1 TITL / 1 AUTH / 1 DATE / 1 PUBL / 1 REPO / 1 TEXT

0 TRLR
```

### Was NICHT geschrieben wird (aber beim Laden erhalten bleibt)
Tags die der Parser nicht kennt (z.B. `ADDR`, `EMAIL`, `WWW`, `RESN`, `_STAT`) gehen beim nächsten Speichern verloren, da der Writer sie nicht ausgibt.

**Bekannte Verluste beim Roundtrip:**
- `ADDR` (Adresse unter RESI)
- `_STAT` (Status: Never Married etc., Legacy-spezifisch)
- `QUAY` (Qualitätsbewertung der Quelle)
- `PAGE` (Seitenangabe bei Quell-Referenz) — SOUR-Referenzen werden ohne PAGE/QUAY zurückgeschrieben
- `NOTE`-Records als `@ref@` — werden beim Laden in `noteText` aufgelöst und als Inline-NOTE zurückgeschrieben
- `notes`-Records (0 @Nxx@ NOTE) werden nicht neu ausgegeben
- `2 SOUR` unter `1 RELI` — RELI-Quellen (1 Occurrence in MeineDaten.ged, kein UI-Effekt)

---

## Datums-Format
GEDCOM-Datumsangaben werden als **Freitext** gespeichert und nicht geparst:
- `12 MAR 1890`
- `ABT 1875` (ungefähr)
- `BEF 1900` (vor)
- `AFT 1850` (nach)
- `1973 To 1977` (Zeitraum, Legacy-Format)
- `Aug 1977 To Jul 1984`

Für die Suche funktioniert das gut (Jahreszahlen sind enthalten). Für Sortierung nach Datum wäre Parsing nötig (nicht implementiert).

---

## ID-Vergabe
```javascript
function nextId(prefix) {
  // prefix: 'I' für Personen, 'F' für Familien, 'S' für Quellen
  const existing = Object.keys(
    prefix === 'I' ? db.individuals :
    prefix === 'F' ? db.families : db.sources
  );
  // Findet die höchste vorhandene Nummer und inkrementiert
  const nums = existing.map(id => parseInt(id.replace(/\D/g,''))||0);
  const next = (Math.max(0, ...nums) + 1);
  return `@${prefix}${next}@`;
}
```
