# Roadmap

## Aktueller Stand: Phase 7 (UX-Remake) abgeschlossen ✅ (März 2026)

Testdatei: MeineDaten_ancestris.ged — 2796 Personen, 873 Familien, 114 Quellen

---

## Abgeschlossene Phasen

### Phase 1: Grundfunktionen ✅
- GEDCOM laden, parsen, anzeigen
- Personen-, Familien-, Quellen-Listen
- Detailansichten
- iOS-kompatibel (Share Sheet, accept=*)

### Phase 2: Bearbeiten ✅
- Personen erstellen / bearbeiten / löschen
- Familien erstellen / bearbeiten
- Quellen erstellen / bearbeiten
- Ereignisse hinzufügen / bearbeiten
- Quellen-Widget (multi-select pro Ereignis)
- GEDCOM-Export (Roundtrip-stabil)

### Phase 2.5: Roundtrip-Fixes ✅ (Feb 2026)
Getestet mit MeineDaten_ancestris.ged: **1 Diff in 2796 Personen**

Alle wichtigen Felder überleben Parse→Write→Parse:
- NSFX (Suffix), RELI (Religion), CHAN (Änderungsdatum)
- OBJE/media (Foto-Pfade), SOUR pro Ereignis (BIRT/DEAT/CHR/BURI/events)
- FAM: MARR SOUR, ENGA (date/place), NOTE (inline + CONT)
- _UID (Ancestris/Legacy), CAUS (Sterbeursache)
- 2 NOTE unter Events, 2 SOUR unter NAME, SOUR direkt auf INDI

Bewusst akzeptierte Verluste:
- _STAT — nie geparst
- QUAY, PAGE an Quell-Referenzen — vereinfacht
- NOTE-Records als @ref@ → werden zu Inline-NOTE
- 2 SOUR unter 1 RELI — 1 Vorkommen, kein UI-Effekt

### Phase 2.6: GEDCOM-Nachbesserungen ✅ (März 2026)
- **SOUR/CHAN**: Änderungsdatum von Quellen-Records wird geparst, gespeichert und beim Export zurückgeschrieben. `saveSource()` setzt `lastChanged` automatisch auf heutiges Datum (GEDCOM-Format).
- **Multiple NOTEs unter Events**: Mehrere `2 NOTE`-Tags unter einem Ereignis werden jetzt akkumuliert (statt überschrieben), mit `\n` verbunden, beim Export als `CONT` ausgegeben.
- **RESI/ADDR**: Adress-Subtag (`2 ADDR`) unter Wohnort-Ereignissen wird in `ev.addr` gespeichert, im Ereignis-Formular editierbar (nur bei Typ RESI sichtbar) und beim Export als `2 ADDR / 3 CONT` ausgegeben.

### Phase 3a: UI-Cleanups ✅ (März 2026)
- BIRT/CHR/DEAT/BURI in Detailansicht anklickbar (gleiches Formular wie andere Events)
- Sterbeursache (CAUS) editierbar im Ereignis-Formular
- Geburt/Tod-Felder aus Personen-Formular entfernt (nur noch über Ereignis-Formular)
- Orts-Detailansicht: Ort umbenennen (ersetzt in allen INDI + FAM)

### Phase 3b: Speichern/Backup ✅ (März 2026)
- Desktop (Chrome/Edge/Firefox): File System Access API
  - Verzeichnis einmalig wählen, danach automatisch speichern
  - Hauptdatei überschreiben + versioniertes Backup (MeineDaten_YYYY-MM-DD_NNN.ged)
  - Verzeichnis-Handle in IndexedDB persistiert
- iOS: Zwei Dateien im Share Sheet (Hauptdatei + Zeitstempel-Backup)
- Fallback: Blob-Download mit Original-Dateiname

### Phase 4: Sanduhr-Ansicht ✅ (März 2026)
Grafische Familienansicht als scrollbarer Baum.

**Layout (2+1 Generationen + Ehepartner):**
```
Großeltern (4)      →  unbekannte als Ghost-Karten
Eltern (2)          →  Vater links, Mutter rechts
Person + Ehepartner →  Person gold, Ehepartner rechts (gestrichelte Linie)
Kinder (1+ Zeilen)  →  max. 4 pro Zeile, mehrzeilig bei >4
```

**Features:**
- Klick auf jede Karte → neu zentrieren auf diese Person
- Klick auf Zentrum-Karte → Detailansicht
- ⧖-Button in Personen- und Familien-Detailansicht
- Vollständige Namen (2-zeilig via CSS line-clamp)
- Startansicht nach Datei-Load: Tree der Person mit kleinster ID
- SVG Bezier-Kurven als Verbindungslinien

### Phase 7: UI/UX-Remake ✅ (März 2026)

#### Globale Bottom-Navigation
- Horizontale Tabs + Stats-Leiste ersetzt durch Bottom-Nav mit 5 gleichwertigen Tabs
- Tabs: ⧖ Baum | ♻ Personen | ⚭ Familien | § Quellen | 📍 Orte
- Bottom-Nav sichtbar in Baum + Listen, ausgeblendet in Detail + Landing
- FAB ausgeblendet auf Orte-Tab und Baum-Tab
- Baum-Topbar: ☁️ Speichern + ☰ Menü direkt erreichbar

#### Navigation & History
- Navigations-History-Stack: `_navHistory[]` mit `_beforeDetailNavigate()` + `goBack()`
- Zurück aus Detailansicht → vorherige Detailansicht (Person→Familie→Zurück→Person)
- Zurück aus Detailansicht → Baum (wenn von dort gekommen)
- Detail-Button aus Baum-Topbar entfernt (Klick auf Zentrumskarte öffnet Detail)

#### Direkte Familien-Links in Personendetail
- Abschnitt „Ehepartner & Kinder": klickbare „⚭ Familie · Datum"-Zeile vor jedem Partner
- Abschnitt „Eltern": klickbare „⚭ Herkunftsfamilie · ID"-Zeile vor Vater/Mutter

#### Halbgeschwister im Baum
- Kinder aus anderen Ehen der Zentrumsperson → gestrichelter Kartenrahmen + `½`-Badge
- Verbindungslinien zu Halbgeschwistern gestrichelt (gold-dim)

#### Kompakte Quellen-Badges
- Quellen-Badges von Titelblöcken zu `§N`-Inline-Badges verkleinert
- Direkt in der Ereigniszeile (inline in `fact-val`), kein separates Div
- Klick auf Badge: stopPropagation (verhindert Ereignis-Formular) + öffnet Quellen-Detail

#### Landing-Screen vereinfacht
- Langer iCloud-Hilfetext entfernt
- Kurztagline + „Hilfe & Anleitung ›" → neues `#modalHelp` Bottom-Sheet

#### Suche in allen Tabs
- Familien: Suche nach Name, Heiratsdatum, Heiratsort
- Quellen: Suche nach Titel, Kurzname, Autor
- Orte: Suche nach Ortsname

---

## Phase 5: Fotos (offen)

Personen haben in Ancestris Fotos verknüpft. Die Pfade stehen im GEDCOM, aber die Dateien liegen auf dem Mac.

### Empfohlene Umsetzung: Option B (Upload im Formular)

```javascript
// Im Person-Formular: Foto-Picker
<input type="file" id="pf-photo" accept="image/*">

// Beim Speichern: als Base64, komprimiert auf max. 800px
const canvas = document.createElement('canvas');
// ... resize auf max 800px, Quality 0.8 JPEG
p.photoBase64 = canvas.toDataURL('image/jpeg', 0.8);

// In Detailansicht anzeigen:
if (p.photoBase64) {
  html += `<img src="${p.photoBase64}" style="width:100%;border-radius:8px">`;
}
```

**Hinweis:** `photoBase64` ist ein App-eigenes Feld, kein GEDCOM-Standard. Beim GEDCOM-Export geht das Foto verloren (bewusst). Eventuell: separates JSON-Mapping exportieren.

**Option C (später):** ZIP-Export: GEDCOM + Fotos als echte Bilddateien (erfordert JSZip oder Compression Streams API).

---

## Phase 6: Erweiterte Suche & Filter (offen)

- [ ] Filtern nach Geburtsjahrgang (z.B. 1850–1900)
- [ ] Filtern nach Ort (alle Personen aus Ort X) — direkt aus Orts-Detail erreichbar
- [ ] Filtern nach Quelle (alle Personen mit Quelle X) — direkt aus Quellen-Detail erreichbar
- [ ] Duplikate finden (gleicher Name + ähnliche Daten)
- [ ] Sortierung in Listen (nach Name / Geburtsjahr)

---

## Phase 8: Stammbaum-Erweiterungen (offen)

- [ ] Zoom (Pinch-to-Zoom auf Mobile)
- [ ] Mehrere Ehepartner darstellen (aktuell: nur erster Ehepartner)
- [ ] Vorfahren-Modus: reiner Vorfahren-Baum (mehr als 2 Ebenen hoch)
- [ ] Navigation in Geschwister möglich (Klick auf Halbgeschwister → Baum zentriert)

---

## Phase 9: Technische Verbesserungen (offen)

- [ ] Undo/Redo (letzte 10 Änderungen)
- [ ] Offline-Modus / Service Worker (App funktioniert ohne Internet)
- [ ] PWA-Manifest prüfen (Icons, Splash Screen)
- [ ] Tastatur-Shortcuts für Desktop
- [ ] Import: Konfliktauflösung beim Importieren (wenn neuere GEDCOM-Version vorliegt)
- [ ] Merge zweier GEDCOM-Dateien
- [ ] Quellenreferenzen mit PAGE/QUAY zurückschreiben

---

## Bekannte Probleme

### Kritisch
| Problem | Ursache | Workaround |
|---|---|---|
| localStorage-Limit | MeineDaten.ged ≈ 5 MB, localStorage ≈ 5–10 MB | Wird still ignoriert wenn voll |
| GEDCOM-Roundtrip verliert Tags | Writer kennt nicht alle Tags | _STAT etc. gehen verloren |

### Mittel
| Problem | Ursache | Workaround |
|---|---|---|
| Fotos nicht ladbar | Windows-Pfade aus Legacy (C:\Users\...) | Dateiname wird angezeigt |
| Quellenreferenzen partiell | SOUR mit PAGE/QUAY vereinfacht | Originalreferenz geht verloren |

### Klein
| Problem | Status |
|---|---|
| Datumsformat nicht normiert | Freitext, keine Sortierung nach Datum möglich |
| ENGA (Verlobung) wird geparst aber nicht editierbar | Niedrige Priorität |
| Sanduhr zeigt nur ersten Ehepartner | Mehrfach-Ehen noch nicht unterstützt |

---

## Getestete Umgebungen

| Plattform | Browser | Status |
|---|---|---|
| iPhone (iOS 17+) | Safari | ✅ Vollständig |
| iPhone (iOS 17+) | Chrome | ⚠️ Share Sheet nicht unterstützt |
| Mac | Safari | ✅ |
| Mac | Chrome | ✅ |
| Mac | Firefox | ✅ |
| Android | Chrome | ⚠️ Apple Maps Links funktionieren nicht |

---

## Datei-Statistiken (MeineDaten_ancestris.ged)

```
Personen:     2796
Familien:      873
Quellen:       114
Orte:         3473 (eindeutige Ortsnamen)
Mit Geo:      1989 Personen haben Geburtsgeo-Koordinaten
Medien-Refs:   146
Notiz-Records: 186
Dateigröße:   ~5 MB
```
