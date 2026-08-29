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

## Messergebnisse (`test-scale.js`) — gemessen vor v899

| # | Operation | Zeit (JXA) | Chromium-Schätzung | Status nach v899 |
|---|---|---|---|---|
| [1] | Parse (`parseGEDCOM`) | 688 ms | ~230–350 ms | ✅ läuft im Worker-Thread (nicht-blockierend) |
| [2] | Write (`writeGEDCOM`) | 219 ms | ~70–110 ms | unverändert, nur beim Speichern |
| [3] | Sort Name (`localeCompare`) | 938 ms | ~310–470 ms | ✅ **Cache-Hit ab 2. Aufruf: ~0 ms** |
| [4] | Sort Datum (`dateKey + localeCompare`) | 1445 ms | ~480–720 ms | ✅ **Cache-Hit ab 2. Aufruf: ~0 ms** |
| [5] | SearchIndex Build | 50 ms | ~17–25 ms | unverändert, lazy + gecacht |
| [6] | Filter ungefiltert (re-sort) | 939 ms | ~310–470 ms | ✅ **Cache-Hit ab 2. Aufruf: ~0 ms** |
| [7] | Filter "Müller" (String-Match) | 4 ms | < 2 ms | unverändert |
| [8] | collectPlaces | 12 ms | < 5 ms | unverändert |
| [9] | Object.values(individuals) | 0 ms | < 1 ms | unverändert |

### Erwartete Zeiten nach v899

| Szenario | Vor v899 (JXA) | Nach v899 (JXA) | Vor v899 (Chromium) | Nach v899 (Chromium) |
|---|---|---|---|---|
| **Datei laden** (UI-Thread-Block) | ~688 ms | ~0 ms | ~230–350 ms | ~0 ms |
| **Erster Sort** nach Laden | ~938 ms | ~938 ms | ~310–470 ms | ~310–470 ms |
| **Tab-Wechsel** (2.–n. Mal) | ~938 ms | **~0 ms** | ~310–470 ms | **~0 ms** |
| **Tab-Wechsel nach Edit** | ~938 ms | ~938 ms | ~310–470 ms | ~310–470 ms |
| **Sort-Modus wechseln** | ~938 ms | ~938 ms | ~310–470 ms | ~310–470 ms |
| **Filter leeren** (re-sort nötig?) | ~938 ms | **~0 ms** | ~310–470 ms | **~0 ms** |
| **Suche tippen** (gefiltert, klein) | < 5 ms | < 5 ms | < 2 ms | < 2 ms |

**Anmerkung Datei laden:** Parse läuft im Worker-Thread (`gedcom-worker.js`), blockiert den UI-Thread nicht. Der erste Sort nach dem Laden trifft immer den Cache-Miss (~938 ms JXA) — das ist der einzige noch spürbare Moment.

---

## Engpass 1 — Sort ohne Cache ✅ behoben in v899

**Datei:** `ui-views-person.js`

**Ursache (vor v899):** `renderPersonList` rief `[...persons].sort(localeCompare)` bei jedem Aufruf neu auf — bei Tab-Wechsel, Filter-Clear, Edit-Save. Bei 20k Personen ~940 ms (JXA) / ~320 ms (Chromium) **pro Aufruf**.

**Fix (v899):** `UIState._personSortCache = { mode, count, sorted }`

```js
const allCount = Object.keys(AppState.db.individuals || {}).length;
const sc = UIState._personSortCache;
let sorted;
if (sc && sc.mode === _personSort && sc.count === allCount && persons.length === allCount) {
  sorted = sc.sorted;                          // Cache-Hit: 0 ms
} else {
  sorted = [...persons].sort(/* localeCompare */);
  if (persons.length === allCount) {
    UIState._personSortCache = { mode: _personSort, count: allCount, sorted };
  }
}
```

**Cache-Logik:**
- **Hit** wenn: `persons.length === allCount` (keine Filter aktiv) **und** gleicher Sort-Modus **und** kein `markChanged()` seit letztem Sort
- **Miss + Befüllung** wenn: gleiche Bedingungen aber Cache leer/veraltet
- **Miss ohne Befüllung** wenn: Filter aktiv (gefilterter Subset → nie gecacht, aber typisch klein → sort schnell)

**Invalidierung (vollständig):**

| Auslöser | Pfad | Korrekt? |
|---|---|---|
| Person/Familie editieren | `markChanged()` → `_invalidatePersonListCache()` → `_personSortCache = null` | ✅ |
| Neue Datei laden (GEDCOM) | `_finishLoad` → `UIState._personSortCache = null` | ✅ |
| Neue Datei laden (GRAMPS) | `_loadGRAMPS` → `UIState._personSortCache = null` | ✅ |
| Sort-Modus wechseln | `togglePersonSort()` → `_personSort` ändert sich → Cache-Miss via Mode-Check | ✅ |
| Person löschen | `markChanged()` (indirekt) → `_personSortCache = null` | ✅ |
| Person anlegen | `markChanged()` (indirekt) → `_personSortCache = null` | ✅ |

**Stale-Cache-Sicherheit bei Datei-Wechsel:** Cache-Key enthält `count` (Anzahl Personen). Ein neuer Datei-Load mit zufällig gleicher Personenanzahl würde ohne explizites `_personSortCache = null` in `_finishLoad` stale Daten aus der alten Datei zurückgeben — deshalb wird `_personSortCache` in `_finishLoad` **explizit genullt**, analog zu `_placesCache` und `_hofCache`.

---

## ~~Engpass 2 — Parser synchron im UI-Thread~~ ✅ war bereits gelöst

`gedcom-worker.js` (`importScripts('gedcom-parser.js')`) ist vorhanden und wird in `storage-file.js:_processLoadedText` (Z. 437) genutzt: `new Worker('gedcom-worker.js')` mit Progress-Callbacks (`pct`) + Sync-Fallback. Die ~688 ms Parse-Zeit (JXA) laufen im Worker-Thread — der UI-Thread ist frei. **Kein Handlungsbedarf.**

---

## Unbedenkliche Bereiche

| Bereich | Warum unbedenklich |
|---|---|
| **Virtuelles Scrollen** | O(visible_rows), nicht O(n) — kein Skalierungsproblem |
| **SearchIndex Build** | 50 ms JXA, lazy (nur beim ersten Suchaufruf), danach gecacht |
| **Filter-String** | 4 ms (linearer Scan auf `_searchStr`) |
| **collectPlaces** | 12 ms, gecacht nach erstem Aufruf (`UIState._placesCache`) |
| **Object.values()** | < 1 ms pro Aufruf |
| **Writer** | 219 ms JXA / ~75 ms Chromium — nur beim Speichern, akzeptabel |
| **`_buildKekuleMap`** | Bounded auf depth 8 = max. 512 Personen, vernachlässigbar |
| **Post-Processing im Parser** | `resolveNoteRefs`, `primSort`, `etAdd` — alle O(n), linear, gesamt < 100 ms |

---

## Fazit

### Nach v899 bei 20k Personen

| Metrik | Wert |
|---|---|
| Cold-Start (UI-Thread-Block) | **~0 ms** (Parse im Worker-Thread) |
| Erster Sort nach Laden | ~310–470 ms Chromium (einmalig, unvermeidbar) |
| Tab-Wechsel (2.–n.) | **~0 ms** (Cache-Hit) |
| Tab-Wechsel nach Edit | ~310–470 ms Chromium (markChanged invalidiertCache) |
| Suche/Filter | < 2 ms Chromium ✓ |
| Scrollen (VS) | flüssig, O(visible_rows) ✓ |

### Bei 2.800 Personen (aktuelles Realdaten-Maximum)

Parse und Sort skalieren linear. Der erste Sort trifft bei 2.800 Personen:
- Sort: ~940 ms × (2800/20000) ≈ **131 ms** JXA / **~45 ms** Chromium (kaum spürbar)

Der Cache wirkt auch bei kleinen Dateien: bereits ab ~500 Personen ist Tab-Wechsel nach dem ersten Render instant.

### Offene Optimierungen (niedrige Priorität)

| Fix | Aufwand | Wirkung |
|---|---|---|
| Sort-Key Precompute (`p._sortKey = surname + '\x00' + given`) | XS | ~30 % schnellerer erster Sort (einmaliger Cache-Miss) |

---

## Test-Artefakte

| Datei | Zweck |
|---|---|
| `generate-scale-test.js` | Deterministischer GEDCOM-Generator (Standard: 20k, Größe via Argument) |
| `test-scale.js` | Performance-Messung der 9 Hot-Pfade (JXA + Node) |
| `scale-test-20000.ged` | Synthetisches 20k-GEDCOM (gitignore-würdig, regenerierbar) |
