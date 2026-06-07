# SCALE-TEST — Befunde 2026-06-07

## Testaufbau

| Parameter | Wert |
|---|---|
| Generator | `generate-scale-test.js` |
| Datei | `scale-test-20000.ged` |
| Personen | 20.000 |
| Familien | 9.999 |
| Dateigröße | 6,22 MB / 446.226 Zeilen |
| Struktur | ~10 Generationen, je Familie 2–4 Kinder, jedes Kind heiratet + bekommt eigene Familie |
| Daten pro Person | NAME, SEX, BIRT (Datum+Ort+SOUR), DEAT (~70%), OCCU (~30%), FAMC/FAMS |
| Quellen | 9 SOUR-Records, je Person 1–2 Zitierungen |
| Umgebung | JXA (osascript) = Proxy für Safari-JS; Chromium ~2–3× schneller |

Roundtrip: **net_delta=0**, stable ✅ — keine Datenverluste bei 20k Personen.

---

## Messergebnisse (`test-scale.js`)

| # | Operation | Zeit (JXA) | Chromium-Schätzung | Bewertung |
|---|---|---|---|---|
| [1] | Parse (`parseGEDCOM`) | **688 ms** | ~230–350 ms | ⚠ Kritisch (Cold-Start) |
| [2] | Write (`writeGEDCOM`) | 219 ms | ~70–110 ms | △ OK |
| [3] | Sort Name (`localeCompare`) | **938 ms** | ~310–470 ms | ⚠ Kritisch (Tab-Wechsel) |
| [4] | Sort Datum (`dateKey + localeCompare`) | **1445 ms** | ~480–720 ms | ⚠ Kritisch (Tab-Wechsel) |
| [5] | SearchIndex Build | 50 ms | ~17–25 ms | ✓ |
| [6] | Filter ungefiltert (inkl. re-sort) | **939 ms** | ~310–470 ms | ⚠ dominiert durch Sort |
| [7] | Filter "Müller" (String-Match) | 4 ms | < 2 ms | ✓ |
| [8] | collectPlaces | 12 ms | < 5 ms | ✓ |
| [9] | Object.values(individuals) | 0 ms | < 1 ms | ✓ |

**Cold-Start gesamt** (Parse + erster Sort): ~1.626 ms JXA / ~540–820 ms Chromium  
**Tab-Wechsel Personen** (Sort only): ~939 ms JXA / ~310–470 ms Chromium  
**Erste Suche** (Index Build + Filter): ~54 ms JXA / ~18–27 ms Chromium

---

## Engpass 1 — Sort ohne Cache (höchste Priorität)

**Datei:** `ui-views-person.js:151`

```js
function renderPersonList(persons) {
  _lastFilteredPersons = persons;
  _buildKekuleMap();
  const sorted = [...persons].sort((a, b) => {          // ← JEDES MAL NEU
    const c = (a.surname || '').localeCompare(b.surname || '', 'de');
    if (c !== 0) return c;
    return (a.given || '').localeCompare(b.given || '', 'de');
  });
  ...
}
```

**Problem:** `renderPersonList` wird aufgerufen bei:
- Jedem Tab-Wechsel zur Personenliste
- Jedem `applyPersonFilter()` (Suche, Jahresfilter, Geschlecht, Geburtsort)
- Jedem `markChanged()` → renderTab (nach jedem Edit-Save)

Bei 20k Personen kostet `localeCompare`-Sort ~940 ms (JXA) / ~320 ms (Chromium) **pro Aufruf**. Das sortierte Ergebnis wird verworfen, nichts gecacht.

**Fix (SORT-CACHE, Aufwand S):**

```js
// UIState: _sortedPersonsCache = { mode: 'name'|'date', arr: [...] } | null
// Invalidierung in markChanged() → UIState._sortedPersonsCache = null

function renderPersonList(persons) {
  _lastFilteredPersons = persons;
  _buildKekuleMap();

  // Cache nutzen wenn gleicher Modus + gleiche Eingabeliste
  let sorted;
  const cacheKey = _personSort + ':' + persons.length;
  if (UIState._sortedPersonsCache?.key === cacheKey && !UIState._sortedPersonsDirty) {
    sorted = UIState._sortedPersonsCache.arr;
  } else {
    sorted = [...persons].sort(/* localeCompare */);
    UIState._sortedPersonsCache = { key: cacheKey, arr: sorted };
    UIState._sortedPersonsDirty = false;
  }
  ...
}
```

Alternativ einfacher: Sort-Key (`surname + '\x00' + given`) einmalig als `p._sortKey` auf jedem Personen-Objekt beim Parse vorberechnen, dann einfacher String-Vergleich statt doppeltem `localeCompare` (spart ~30 % Vergleichskosten zusätzlich).

**Erwartete Wirkung:** Tab-Wechsel nach dem ersten Render: ~0 ms Sort-Overhead.

---

## ~~Engpass 2 — Parser synchron im UI-Thread~~ ✅ bereits gelöst

`gedcom-worker.js` (`importScripts('gedcom-parser.js')`) ist bereits vorhanden und wird in `storage-file.js:_processLoadedText` (Z. 437) aktiv genutzt: `new Worker('gedcom-worker.js')` mit Progress-Callbacks (`pct`) + Sync-Fallback bei Worker-Fehler. Cold-Start ist bereits nicht-blockierend.

Die ~688 ms Parse-Zeit (JXA-Messung) laufen im Worker-Thread — der UI-Thread ist während des Parsens frei. **Kein Handlungsbedarf.**

---

## Unbedenkliche Bereiche

| Bereich | Warum unbedenklich |
|---|---|
| **Virtuelles Scrollen** | O(visible_rows), nicht O(n) — kein Skalierungsproblem |
| **SearchIndex Build** | 50 ms JXA, lazy (nur beim ersten Suchaufruf), gecacht |
| **Filter-String** | 4 ms (linearer Scan auf _searchStr) |
| **collectPlaces** | 12 ms, gecacht nach erstem Aufruf |
| **Object.values()** | < 1 ms pro Aufruf |
| **Writer** | 219 ms JXA / ~75 ms Chromium — nur beim Speichern, akzeptabel |
| **_buildKekuleMap** | Bounded auf depth 8 = max. 512 Personen, vernachlässigbar |
| **Post-Processing** (resolveNoteRefs, primSort, etAdd) | Alle O(n), keine inneren Schleifen über alle Personen, gesamt < 100 ms |

---

## Fazit & Priorisierung

**Aktueller Zustand bei 20k Personen:**
- Cold-Start: ~540–820 ms Chromium (blockierend)
- Tab-Wechsel Personen: ~310–470 ms Chromium (spürbar bei jedem Wechsel)
- Suche/Filter: < 30 ms ✓
- Scrollen (VS): flüssig ✓

**Bei 2.800 Personen** (aktuell getestetes Realdaten-Maximum) skalieren Sort+Parse linear:
- Sort: ~940 ms × (2800/20000) ≈ **131 ms** (knapp spürbar)
- Parse: ~688 ms × (2800/20000) ≈ **96 ms** (akzeptabel)

→ Erst ab ~5.000 Personen wird Sort spürbar träge. Der SORT-CACHE lohnt sich aber generell.

| Fix | Aufwand | Wirkung | Priorität |
|---|---|---|---|
| **SORT-CACHE** | S (< 1 Tag) | Tab-Wechsel nach erstem Render: ~0 ms | **1** |
| Sort-Key Precompute | XS (2 h) | ~30 % schnellerer erster Sort | 2 |
| ~~PARSER-WORKER~~ | ~~L~~ | ~~Cold-Start nicht-blockierend~~ | ✅ bereits implementiert |

---

## Test-Artefakte

| Datei | Zweck |
|---|---|
| `generate-scale-test.js` | Deterministischer GEDCOM-Generator (20k Standard, Größe via Argument) |
| `test-scale.js` | Performance-Messung der 9 Hot-Pfade (JXA + Node) |
| `scale-test-20000.ged` | Synthetisches 20k-GEDCOM (gitignore-würdig, regenerierbar) |
