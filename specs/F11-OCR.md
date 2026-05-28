# F11 — OCR: On-Device Volltext-Erkennung (Backlog)

**Status:** Backlog — kein festes Datum  
**Aufwand:** XL (>2 Tage)  
**Autor:** Copilot für Franz, Stand 2026-03-31  
**Roadmap-Eintrag:** ROADMAP.md → Backlog → F11

---

## Ziel

Lokales OCR-System (On-Device) das Scans und Fotos von Quellen automatisch in durchsuchbaren Text umwandelt. Alle Operationen laufen offline, im Browser, ohne Server — vollständig datenschutzfreundlich.

---

## Umfang des MVP

- Tesseract-WASM OCR im WebWorker
- Preprocessing (Kontrast, Deskew, Binarize)
- IndexedDB-Speicher für OCR-Texte
- Inverted Index für Volltextsuche
- UI-Modal zum Scannen, Bearbeiten, Speichern
- Integration in globale Suche
- Undo-Mechanismus
- Feature-Flag für kontrollierten Rollout

---

## Neue Dateien

| Datei | Zweck |
|---|---|
| `ui-ocr.js` | UI-Modal, Upload, Preview, Edit, Save, Progress |
| `ocr-worker.js` | WebWorker mit Tesseract-WASM |
| `ocr-index.js` | Tokenizer, Normalizer, Inverted-Index, Search |
| `tests/ocr.spec.js` | Unit- und Integrationstests |

## Änderungen an bestehenden Dateien

| Datei | Änderung |
|---|---|
| `storage.js` | Neue IDB-Stores: `ocr_texts`, `ocr_index`, `ocr_meta` |
| `ui-media.js` | Button „OCR hinzufügen" in Quellen-Detail |
| `ui-views.js` | OCR-Suchtreffer in globaler Suche anzeigen |
| `README.md` | Dokumentation des OCR-Features + Privacy-Hinweis |

---

## Architektur

```
Nutzer lädt Scan/Foto hoch
    → ocr-worker.js (Tesseract-WASM, Preprocessing)
    → Text → ocr_texts (IDB)
    → ocr-index.js (Tokenizer → Inverted Index)
    → Globale Suche nutzt OCR-Index
    → Undo: löscht ocr_texts + Indexeinträge
```

---

## IndexedDB-Schema

### Store `ocr_texts`
```javascript
{
  id:          'ocr_@S12@_0',
  sourceId:    '@S12@',
  pageIndex:   0,
  text:        'extrahierter Text…',
  lang:        'deu',
  confidence:  0.92,
  createdAt:   '2026-03-31T20:00:00Z'
}
```

### Store `ocr_index`
```javascript
{
  term:     'muenchen',
  postings: [{ sourceId: '@S12@', pageIndex: 0, positionsCount: 3, positionsHash: 'a1b2c3' }]
}
```

### Store `ocr_meta`
```javascript
{
  sourceId:  '@S12@',
  pages:     3,
  engine:    'tesseract-wasm',
  createdAt: '2026-03-31T20:00:00Z',
  options:   { lang: 'deu', quality: 'accurate' }
}
```

---

## UI-Flow

**Einstieg:** Quellen-Detailansicht → Button „OCR hinzufügen (lokal)"

**Modal-Ablauf:**
1. Upload (Bild JPG/PNG oder PDF mehrseitig)
2. Optionen: Sprache (Deutsch/Englisch/Auto), Qualität (fast/accurate), Datenschutz-Checkbox
3. Progress-Screen (Fortschrittsbalken, „Seite 1/3 wird verarbeitet…")
4. Page-Preview (links: Thumbnail, rechts: OCR-Text editierbar; Wörter mit niedriger Confidence farbig markiert)
5. Speichern → Toast „OCR abgeschlossen — 3 Seiten indexiert"

---

## API-Spezifikation

### `ocr-worker.js`
```javascript
initWorker()
recognizeBlob(blob, options)  // → { text, lang, confidence }
terminateWorker()
```

### `ocr-index.js`
```javascript
initOCRIndex()
indexOCRPage(sourceId, pageIndex, text, meta)
removeOCRPage(sourceId, pageIndex)
removeOCRForSource(sourceId)
searchOCR(query, opts)
tokenize(text)
normalizeToken(token)
```

---

## Tokenisierung & Ranking

**Normalisierung:** Unicode NFKC → Kleinbuchstaben → Satzzeichen entfernen → Diakritika (ä→ae, ö→oe, ü→ue) → Stopwords → optional Stemming-Hook

**Beispiel:**
```
Eingabe: "München, 12. März 1890 – Taufregister"
Tokens:  ["muenchen", "12", "maerz", "1890", "taufregister"]
```

**Ranking-Formel:**
```
score = Σ(termWeight × tf × idf) + pageBoost
  termWeight: exakt=1.0, fuzzy=0.6
  tf:         Term Frequency (positionsCount)
  idf:        log(1 + totalPages / (1 + docFreq))
  pageBoost:  +0.2 wenn Treffer im Titel/ersten 50 Zeichen
```

---

## Feature-Flag

```javascript
// gedcom.js
AppState.features = { ocr: false };
```

Rollout: intern → Beta → standardmäßig aktiv

---

## Akzeptanzkriterien

- OCR funktioniert offline, vollständig im Browser
- Mindestens eine Seite pro Quelle kann erkannt und gespeichert werden
- Globale Suche findet OCR-Text zuverlässig
- Undo entfernt OCR-Texte und Indexeinträge vollständig
- UI bleibt responsiv (OCR im Worker)
- Keine Netzwerkverbindungen außer bei explizit aktiviertem Cloud-OCR
- Indexgröße bleibt unter konfigurierter Quota

---

## Risiken

| Risiko | Mitigation |
|---|---|
| Hohe CPU-Last (v.a. iPhone) | Worker + Quality-Option „fast" |
| Speicherverbrauch Index | Quota + Purge-UI + LRU-Cleanup |
| Schlechte OCR-Qualität (Handschrift, alte Drucke) | Confidence-Highlighting + Editiermodus |
| Datenschutz bei sensiblen Dokumenten | Standard: lokal only, klare Hinweise |
| PDF Mehrseiten — lange Laufzeit | Page-by-page, sofortige Vorschau, Abbrechen möglich |

---

## Roadmap nach MVP

- **Multipage PDF OCR:** Automatische Seitenerkennung, Batch-Speichern
- **Fuzzy Search:** Levenshtein-Distanz, Treffer auch bei OCR-Fehlern
- **OneDrive Batch-OCR:** OCR über komplette Dokumentenordner
- **OCR-Korrektur-Assistent:** Vorschläge für falsch erkannte Wörter, Auto-Korrektur
- **OCR-Statistik:** Seitenanzahl, Erkennungsqualität, häufigste Begriffe

---

## Commit-Plan (MVP)

1. `feat(ocr): add ocr-worker with tesseract-wasm integration`
2. `chore(storage): add IndexedDB stores for OCR`
3. `feat(ocr): implement inverted index and search API`
4. `feat(ocr-ui): add OCR modal with upload, preview, edit, save`
5. `feat(search): integrate OCR results into global search`
6. `feat(undo): add undo support for OCR imports`
7. `test(ocr): add unit and integration tests`
8. `docs(ocr): add README section and privacy notes`
