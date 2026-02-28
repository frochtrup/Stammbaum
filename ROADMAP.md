# Roadmap

## Status: Phase 2 abgeschlossen ✅

Testdatei: MeineDaten.ged — 2795 Personen, 871 Familien, 114 Quellen, 3473 Orte

---

## Phase 3: Fotos (offen)

Personen haben in Ancestris Fotos verknüpft. Die Pfade stehen im GEDCOM, aber die Dateien liegen auf dem Mac.

### Optionen

**Option A: Fotos aus iCloud laden**
- User wählt beim ersten Mal pro Person ein Foto aus
- Foto wird als Base64 im `db`-Objekt gespeichert
- Problem: GEDCOM-Standard hat kein Base64-Foto-Format → eigenes Format nötig
- Beim Export: separates JSON mit Foto-Mapping mitexportieren?

**Option B: Foto-Upload beim Bearbeiten**
- Im Person-Formular: „Foto hinzufügen" → Datei-Picker → Base64
- Einfacher zu implementieren, aber Fotos gehen bei GEDCOM-Roundtrip verloren

**Option C: ZIP-Export**
- Export als ZIP: GEDCOM + alle Base64-Fotos als echte Bilddateien
- Benötigt JSZip-Library (oder native Compression Streams API)

**Empfehlung:** Option B als Einstieg, Option C später.

### Umsetzung Option B (Skizze)
```javascript
// Im Person-Formular: Foto-Picker
<input type="file" id="pf-photo" accept="image/*">

// Beim Speichern: als Base64 im Personen-Objekt
const file = document.getElementById('pf-photo').files[0];
const reader = new FileReader();
reader.onload = e => { p.photoBase64 = e.target.result; };

// In Detailansicht anzeigen:
if (p.photoBase64) {
  html += `<img src="${p.photoBase64}" style="width:100%;border-radius:8px">`;
}
```

---

## Phase 4: Stammbaum-Ansicht (offen)

Grafische Darstellung als Baum statt Liste.

### Varianten
- **Vorfahren-Baum**: von einer Person aus nach oben (Eltern, Großeltern, ...)
- **Nachkommen-Baum**: von einer Person aus nach unten
- **Sanduhr**: beides zusammen

### Technologie-Optionen
- **SVG direkt**: Maximale Kontrolle, gut für einfache Bäume
- **D3.js**: Mächtig, aber externe Dependency (~500 KB)
- **Einfaches CSS Flexbox/Grid**: Für 3–4 Generationen ausreichend

### Herausforderungen
- Generationen-Tiefe: Bei 2795 Personen kann ein Baum sehr groß werden
- Mehrfach-Ehen, Adoptionen: Komplexe Graph-Strukturen
- Mobile: Baum muss zoomb- und scrollbar sein

**Empfehlung:** Zunächst nur 3 Generationen (Eltern ← Person → Kinder) als einfache Übersicht in der Detailansicht, kein vollständiger Baum.

---

## Phase 5: Verbesserungen (offen)

### Suche & Filter
- [ ] Filtern nach Geburtsjahrgang (z.B. 1850–1900)
- [ ] Filtern nach Ort
- [ ] Filtern nach Quelle (alle Personen mit Quelle X)
- [ ] Duplikate finden (gleicher Name + ähnliche Daten)

### Personen-Formular
- [ ] Person zu bestehender Familie hinzufügen (direkt aus Detailansicht)
- [ ] Taufe und Beerdigung direkt im Formular bearbeiten (aktuell nur Geburt/Tod)
- [ ] Sterbeursache (CAUS)

### Import
- [ ] Konfliktauflösung beim Importieren (wenn neuere GEDCOM-Version vorliegt)
- [ ] Merge zweier GEDCOM-Dateien

### Export
- [ ] GEDCOM-Roundtrip vollständig (ADDR, EMAIL, _STAT, QUAY, PAGE erhalten)
- [ ] Quellenreferenzen mit PAGE/QUAY zurückschreiben

### UX
- [ ] Undo/Redo (letzte 10 Änderungen)
- [ ] Offline-Modus / Service Worker (App funktioniert ohne Internet)
- [ ] PWA-Manifest überprüfen (Icons, Splash Screen)
- [ ] Tastatur-Shortcuts für Desktop

---

## Bekannte Probleme

### Kritisch
| Problem | Ursache | Workaround |
|---|---|---|
| localStorage-Limit | MeineDaten.ged ≈ 5 MB, localStorage ≈ 5–10 MB | Wird still ignoriert wenn voll; App startet neu mit leerem State |
| GEDCOM-Roundtrip verliert Tags | Writer gibt nicht alle Tags aus | Selten genutzte Tags (ADDR, _STAT etc.) gehen beim Speichern verloren |

### Mittel
| Problem | Ursache | Workaround |
|---|---|---|
| Foto-Pfade falsch | Windows-Pfade aus Legacy (C:\Users\...) | Fotos können nicht geladen werden; Dateinamen werden angezeigt |
| Quellenreferenzen partiell | SOUR mit PAGE/QUAY sub-tags wird vereinfacht | Originalreferenz geht beim Speichern verloren |
| `Set` nicht in JSON serialisierbar | JavaScript-Limitation | localStorage cacht GEDCOM-Text statt geparsten Objekt → kein Problem |

### Klein
| Problem | Status |
|---|---|
| Datumsformat nicht normiert | Freitext, keine Sortierung nach Datum möglich |
| ENGA (Verlobung) wird geparst aber nicht angezeigt | Niedrige Priorität |
| FAM-sourceRefs zeigt marr.sources nicht separat in Familie-Edit | In Bearbeitung |
| Sehr lange Ortsnamen (z.B. „Burgsteinfurt, , Nordrhein-Westfalen, Deutschland") in Listen abgeschnitten | Kosmetisch |

---

## Getestete Umgebungen

| Plattform | Browser | Status |
|---|---|---|
| iPhone (iOS 17+) | Safari | ✅ Vollständig |
| iPhone (iOS 17+) | Chrome | ⚠️ Share Sheet nicht unterstützt |
| Mac | Safari | ✅ |
| Mac | Chrome | ✅ |
| Mac | Firefox | ✅ |
| Android | Chrome | ⚠️ Apple Maps Links funktionieren nicht (Google Maps stattdessen) |

---

## Datei-Statistiken (MeineDaten.ged)

```
Personen:     2795
Familien:      871
Quellen:       114
Orte:         3473 (eindeutige Ortsnamen)
Mit Geo:      1989 Personen haben Geburtsgeo-Koordinaten
Medien-Refs:   146
Notiz-Records: 186
Dateigröße:   ~5 MB
```
