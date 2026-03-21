# Roadmap

---

## Version 2.0 ✅ (März 2026 — Phase 2 abgeschlossen)

Detaillierter Implementierungsplan: `GEDCOM_V2_PLAN.md` (Archiv)

### Schwerpunkt 1: Verlustfreier Ancestris-Roundtrip ✅

Ziel: `parse → edit → write → ancestris-import` ohne strukturelles Delta und ohne Ancestris-Warnungen.

**Sprint 1 — Writer-Fixes (Phase A, kein Risiko)** ✅
- [x] A1: `HEAD` vollständig: DEST=ANY, FILE=, TIME=, PLAC.FORM, GEDC.FORM=LINEAGE-LINKED
- [x] A2: `CHAN.TIME` schreiben (HH:MM:SS) bei allen save-Funktionen
- [x] A3: `NOTE CONT`-Splitting bei 248 Zeichen
- [x] A4: `OBJE FORM` aus Dateiendung schreiben
- [x] A5: `DATE` Monats-Normalisierung beim Schreiben (AUG statt Aug)

**Sprint 2 — Parser-Erweiterungen (Phase B, einfach)** ✅
- [x] B3: `FACT+TYPE` + `MILI` parsen → events[]
- [x] B4: `RESN`, `EMAIL`, `WWW` auf INDI: Parser + Writer + Display
- [x] B5: `CHAN.TIME` parsen → `lastChangedTime`
- [x] Display: EVENT_LABELS FACT/MILI, Event-Dropdown FACT/MILI/GRAD/ADOP

**Sprint 3 — NOTE-Records Roundtrip** ✅
- [x] B1: `0 @Nxx@ NOTE` Records parsen (inkl. Text auf gleicher Zeile) + schreiben vor TRLR
- [x] `1 NOTE @Nxx@`-Referenzen bleiben Referenzen (noteRefs / noteTextInline getrennt)
- [x] FAM noteRefs ergänzt; `savePerson()` noteTextInline-Fix

**Sprint 4 — QUAY Quellenqualität** ✅
- [x] B2: `sourceQUAY: {}` Dict parallel zu `sourcePages{}` (konservatives Modell, kein Breaking Change)
- [x] `3 QUAY` parsen für BIRT/DEAT/CHR/BURI + alle events[]
- [x] `3 QUAY` schreiben in eventBlock() + events-Loop
- [x] `saveEvent()` erhält sourceQUAY beim Bearbeiten

**Sprint 5 — UI-Ergänzungen** ✅
- [x] D1: Event-Formular: FACT+TYPE (inkl. TYPE-Freitext-Feld)
- [x] D2: Quellen-Widget: QUAY-Dropdown (0–3) pro Quellenreferenz
- [x] D6: Familien-Formular: ENGA (Verlobung) editierbar
- [x] D5: Personen-Formular: RESN, EMAIL, WWW

**Sprint 6 — Strukturiertes Datum + PLAC.FORM** ✅
- [x] C1+D3: Datums-UI: Qualifier-Dropdown (exakt/ca./vor/nach/zwischen) + 3-Felder-Eingabe (Tag / Monat / Jahr); `normMonth()` normiert Zahlen und deutsch/englischen Text zu GEDCOM-Standard
- [x] C2+D4: PLAC.FORM aus HEAD parsen (`db.placForm`) + Orts-Toggle Freitext ↔ 6-Felder-Eingabe

**Sprint 7 — Qualitätssicherung** ✅
- [x] E1: Roundtrip-Test im Browser: erweitert mit Sprint 5+6-Tags (FACT, MILI, ENGA, QUAY, RESN, EMAIL, WWW, DATE-Qualifier, PLAC.FORM); `additive`-Flag für Tags die Writer immer schreibt; stabil
- [x] E2: Ancestris-Import-Test (2026-03-21) — Ergebnis: `3 QUAY`/`3 PAGE` -5 (von -159), Zeilen-Delta -708 (von -1016), stabil ✅
- [x] E3: `_FREL`/`_MREL` Quellenreferenzen (2026-03-21) — `3 SOUR`/`4 PAGE`/`4 QUAY` unter Eltern-Kind-Beziehungstypen; ~1263+1059+1049 Tags; Zeilen-Delta -708 → ~0 erwartet ✅

**Sprint 8 — UI/UX-Fixes** ✅
- [x] B2: Ghost-Karten opacity 0.18 → 0.40
- [x] B4: Ereignistyp bei BIRT/CHR/DEAT/BURI als Plain-Text (kein Dropdown-Pfeil)
- [x] B5: ORT-Toggle zeigt "⊞ Felder" / "⊠ Freitext"
- [x] B7: AUFBEWAHRUNGSORT als Pseudo-Input mit Rahmen
- [x] B3: GEDCOM-IDs (@Ixx@, @Fxx@, @Sxx@, @Rxx@) in Detail-Ansichten ausgeblendet
- [x] B6: Menü "Datei schließen" statt "Schließen"
- [x] B11: Version "2.0" (kein "-dev") im Hilfe-Modal
- [x] B9: FAB-Padding für alle Listen (Familien, Quellen, Orte, Archive)
- [x] B13: Section-Header 0.68rem → 0.75rem
- [x] B12: Topbar-Titel mit text-overflow ellipsis
- [x] B14: ☁-Icon goldfarben wenn direktes Speichern aktiv
- [x] B1: Familie-Formular: Kinder zeigen Klarnamen statt @Ixx@-IDs

**Sprint 9 — URL-Parameter + Topbar-Titel** ✅
- [x] `?datei=` URL-Parameter: Dateiname wird in Topbar angezeigt (`updateTopbarTitle`, `#topbarFileName`)
- [x] `_processLoadedText` + `tryAutoLoad` setzen Topbar-Titel nach Datei-Load

**Sprint 10 — MARR/NAME/topSrc PAGE+QUAY; CONC-Fix; _FREL/_MREL** ✅
- [x] `3 PAGE` + `3 QUAY` für `MARR`, `1 NAME`-Quellen, `topSources` (direkte INDI-Quellen)
- [x] `pushCont` CONC-Fix: keine leeren CONC-Zeilen mehr; stabile CONC-Splits
- [x] `pf-note` als `<textarea>` (mehrzeilige Notizen)
- [x] `_FREL`/`_MREL` mit lv3–4 `SOUR`/`PAGE`/`QUAY` (Eltern-Kind-Beziehungstypen)

**Sprint 11 — Verbatim Passthrough + Roundtrip-Verbesserungen** ✅
- [x] Systematische Lösung für alle unbekannten GEDCOM-Tags: `_ptDepth` + `_passthrough[]` auf INDI/FAM/SOUR
- [x] Parser: unbekannte lv1-Tags + deren gesamte Substruktur landen in `_passthrough[]`; Writer schreibt sie verbatim am Record-Ende zurück
- [x] `_nameParsed`: doppelte `1 NAME`-Einträge (z.B. Geburtsname nach Heirat) → zweite NAME-Blöcke gehen in passthrough statt verloren
- [x] INDI OBJE: vollständig in passthrough (inkl. FILE, FORM, _SCBK, _PRIM, TYPE — kein Datenverlust mehr)
- [x] FAM: `MARR.value` gespeichert (für `1 MARR Y` — "gestorben, keine Details"); unbekannte FAM-lv1-Tags → passthrough
- [x] SOUR: OBJE/DATA und alle unbekannten lv1-Tags → passthrough; TEXT mit CONT/CONC korrekt mehrzeilig
- [x] Val-Fix: `(m[3]||'').trim()` → `.replace(/^ /, '').trimEnd()` — verhindert Instabilität bei CONC-Zeilen mit führenden Leerzeichen
- [x] Auto-Diff im Roundtrip-Test: Multiset-Vergleich Original↔Output, top-20 fehlende Tags nach Häufigkeit
- [x] Zeilen-Delta MeineDaten_ancestris.ged: -708 → -436 → -290 → -226 → -179 → ~-100 (nach INDI OBJE passthrough)

**Sprint 12 — Roundtrip-Bugs: frelSeen + extraRecords** ✅
- [x] `frelSeen`/`mrelSeen` Flags auf `famc[]` (INDI) und `childRelations{}` (FAM): `2 _FREL`/`2 _MREL` ohne Wert (`val=''`) werden jetzt korrekt roundgetripped — falsy-String-Bug analog zu `marr.seen`
- [x] INDI lv=3: `frelSour`/`mrelSour` korrekt gesetzt (dead-code-Fix: war in lv=2-Block, jetzt in lv=3)
- [x] `_extraRecords[]` Passthrough für unbekannte `0 @ID@ TYPE`-Records (SUBM u.ä.): verbatim vor TRLR ausgegeben; HEAD + TRLR explizit ausgenommen (keine `@`-ID)
- [x] `MARR.addr`: `2 ADDR` unter `1 MARR` in FAM gespeichert + zurückgeschrieben
- [x] Zeilen-Delta: ~-134 → **-126**; `_FREL`/`_MREL`/`3 SOUR (FAM)`/`4 PAGE`/`4 QUAY` alle ✓; STABIL

**Sprint 13 — OBJE vollständig: alle OBJE-Kontexte wiederhergestellt** ✅
- [x] `marr._extra`: unbekannte lv=2-Tags unter `1 MARR` (FAM) via `_ptTarget`-Redirect
- [x] `nameSourceExtra{}`: `3 OBJE` unter `2 SOUR` unter `1 NAME` (INDI)
- [x] `birth/death/chr/buri.sourceExtra{}`: `3 OBJE` unter `2 SOUR` unter vital events
- [x] `birth/death/chr/buri._extra[]`: `2 OBJE` direkt unter `1 BIRT/DEAT/CHR/BURI`
- [x] `topSourceExtra{}`: `2 OBJE` unter `1 SOUR @id@` (INDI top-level)
- [x] `ev._extra[]` + `ev.sourceExtra{}`: events[] (OCCU/RESI/etc.)
- [x] `frelSourExtra[]` / `mrelSourExtra[]`: `4 OBJE` unter `3 SOUR` unter `2 _FREL/_MREL` in INDI FAMC + FAM childRelations
- [x] `fref.sourIds[]` / `fref.sourExtra{}`: `3 OBJE` unter `2 SOUR` direkt unter `1 FAMC` (INDI)
- [x] `marr.sourceExtra{}`: `3 OBJE` unter `2 SOUR` unter `1 MARR` (FAM)
- [x] OBJE-Diagnose im Roundtrip-Test (zeigt fehlende OBJE-Zeilen mit Kontext)
- [x] Delta: **-126 → -84**; OBJE-Diagnose leer (alle OBJE-Zeilen wiederhergestellt); STABIL

**Bewusst akzeptierte Verluste (Stand Sprint 13):**
- DATE -106 / CONC -70 / CONT -7: Normalisierung/Resplitting (Daten erhalten, Format geändert)
- `@Nxx@` -8: NOTE-Records mit leerem lv=0-Header + CONC-Fortsetzung → Writer merged auf lv=0-Zeile (kein Datenverlust, gleiche Ursache wie CONC -70)
- SOUR -10, PAGE -4, ADDR -2, FILE -1: HEAD-Rewrite + unbekannte Kontexte
- VERS/NAME/CORP/DEST/SUBM je -1: HEAD-Rewrite-Verluste (by design)

**Phase 2 Abschluss-Status (März 2026):**
- Zeilen-Delta: -708 → **-84** (akzeptierte Normalisierungsverluste: DATE/CONC/CONT)
- OBJE-Diagnose: leer — alle OBJE-Strukturen vollständig roundtrip-fähig
- Roundtrip: STABIL (out1 === out2)
- Datei: `index.html` v2.0 (~4700 Zeilen, ~150 Funktionen)

---

## Version 3.0 (Phase 3 — in Arbeit, März 2026)

**Sprint-Plan:** P3-1 IndexedDB · P3-2 Fotos · P3-3 Suche/Filter · P3-4 Service Worker · P3-5 Baum-UI · P3-6 Undo · P3-7 Desktop-Layout · P3-8 OneDrive

---

**Sprint P3-1 — IndexedDB-Migration + Sortierung** ✅ (2026-03-22)
- [x] GEDCOM-Text (5 MB) von localStorage → IndexedDB (`stammbaum_ged`, `stammbaum_ged_backup`, `stammbaum_filename`)
- [x] `_processLoadedText()`: IDB-Writes + localStorage als stiller Fallback (kein Toast mehr bei Cache-Fehler)
- [x] `tryAutoLoad()`: async, IDB first → localStorage-Fallback mit automatischer Migration
- [x] `saveToFileHandle()` + Download-Pfad: auch IDB aktualisieren
- [x] `confirmNewFile()`: auch IDB-Keys löschen
- [x] `_originalGedText` immer in RAM (kein Nullen mehr nach Backup)
- [x] Familien-Liste: alphabetisch nach Vater-Nachname, dann nach Heiratsjahr sortiert

---

### Schwerpunkt 1: Architektur & Wartbarkeit

- [ ] Komponentenbasiertes Rendering (kein monolithisches `innerHTML`) ← bekanntes XSS-Risiko + Performance
- [ ] Klares State-Management (Store-Muster statt ~11 globaler Variablen)
- [ ] Virtuelles Scrollen für große Listen (>1000 Personen)

### Schwerpunkt 2: Speichern / Cloud

- [ ] OneDrive-Integration via Microsoft Graph API (PKCE OAuth, kein Server)
- [ ] iCloud Drive: bestehende `showOpenFilePicker`-Architektur bleibt

### Schwerpunkt 3: UI/UX Redesign

- [ ] Responsives Layout (Desktop-Zweispalten-Ansicht)
- [ ] Erweiterter Stammbaum (Vorfahren-Modus, Mehrfach-Ehen sichtbar)
- [ ] Fotos (Base64 + Resize auf max. 800px JPEG)
- [ ] Erweiterte Suche & Filter (Jahrgang, Ort, Quelle, Duplikate)
- [ ] Undo/Redo
- [ ] Service Worker / Offline
- [ ] Familien-Avatar CSS-Symbol statt OS-Emoji

**Datei:** `index.html` (weiterentwickelt von v2.0)

---

## Version 1.2 ✅ (März 2026 — Phase 1 abgeschlossen)

### REPO-Feature: Archive/Repositories
- `db.repositories` — neues Dictionary für GEDCOM `0 @Rxx@ REPO`-Records
- Parser: `0 @Rxx@ REPO` mit NAME, ADDR, PHON, WWW, EMAIL, CHAN/DATE
- `1 REPO @Rxx@` in SOUR + `2 CALN` → `s.repoCallNum`
- Writer: REPO-Records vor TRLR, `2 CALN` nach `1 REPO` in SOUR
- `#modalRepo` — Archiv-Formular mit allen Feldern
- `#modalRepoPicker` — Archiv-Picker im Quellen-Formular (Suche + "Neues Archiv")
- `showRepoDetail()` — Detailansicht mit verlinkten Quellen
- Quellen-Liste: `🏛`-Badge klickbar → Archiv-Detail; "🏛 Archive"-Sprungbutton
- Quellen-Tab: "Archive"-Sektion mit `renderRepoList()`
- Navigation vollständig: History-Stack, `goBack()`, `showEditSheet()` unterstützen REPO

### Speichern/Export neu (Desktop)
- `showOpenFilePicker()` → `requestPermission({mode:'readwrite'})` → `testCanWrite()` → direktes Speichern auf Chrome Mac ✅
- `_fileHandle` + `_canDirectSave` ersetzen alten `_dirHandle`-Ansatz
- File System Access API (showSaveFilePicker, showDirectoryPicker) vollständig entfernt — auf iCloud Drive unzuverlässig
- Safari/Firefox Mac: `<a download>` → Browser-Download-Ordner
- iOS: Share Sheet unverändert (Hauptdatei + Zeitstempel-Backup)
- Bei `<a download>`: Zeitstempel-Backup des Originals + aktuelle Version als zwei Downloads
- `updateSaveIndicator()`: Save-Buttons zeigen aktiven Modus als Tooltip

---

## Version 1.1 ✅ (März 2026)

### Neue Beziehungen modellieren
- Beziehungs-Picker `#modalRelPicker` für Ehepartner / Kind / Elternteil
- Einstieg über `+ Ehepartner` / `+ Kind` / `+ Elternteil` direkt in den Detailansichten
- Flow: bestehende Person wählen **oder** neue Person erstellen → Familien-Formular öffnet vorausgefüllt
- `_pendingRelation`-Mechanismus: nach `savePerson()` öffnet automatisch `showFamilyForm()` mit Vorausfüllung
- `openRelFamilyForm()`: erkennt freien Slot in bestehender Elternfamilie

### Verbindungen trennen
- `×`-Button (`unlink-btn`) in `.rel-row` über optionalen dritten Parameter von `relRow()`
- `unlinkMember(famId, personId)`: trennt husb / wife / child — aktualisiert beide Seiten der Beziehung
- In Person-Detail: `×` bei Ehepartner + Kindern; `×` am Herkunftsfamilien-Header
- In Familien-Detail: `×` bei allen Mitgliedern

### Orte-Tab: Neue Orte + Autocomplete
- Manuelle Orte (`db.extraPlaces`) in localStorage persistent
- Orts-Autocomplete (case-insensitiv, Substring-Matching) in allen Ort-Eingabefeldern
- `+ Neuer Ort` über FAB-Chooser (`#modalNewPlace`)
- Lösch-Button für ungenutzte Extra-Orte in Orts-Detail

### UI-Verbesserungen
- Zentrum-Karte im Baum: 120 px → 160 px (mehr Platz für lange Namen)
- `section-add`-Buttons standardisiert: `min-width: 100px`, `text-align: center`
- `+ Kind` auch in Personen-Detailansicht (pro Familien-Block)
- Sektionen „Ehepartner & Kinder" und „Eltern" immer sichtbar (auch ohne Einträge)

---

## Version 1.0 ✅ (März 2026)

Testdatei: MeineDaten_ancestris.ged — 2796 Personen, 873 Familien, 114 Quellen

---

## Abgeschlossene Phasen (Phase 1)

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

Bewusst akzeptierte Verluste (nach Sprint 11):
- `_STAT` — nie geparst (Legacy: Never Married etc.)
- NOTE-Records: `@ref@` → Inline-NOTE (Record-Struktur geht verloren)
- `2 SOUR` unter `1 RELI` — 1 Vorkommen, kein UI-Effekt
- `3 QUAY`/`3 PAGE` unter `TITL`/`RELI` — 5 Einträge, kein Event-Kontext
- `_FREL`/`_MREL` lv3-4: 3 Kinder mit nicht-birth-Beziehungstypen (Parser-Bug, selten)
- Restliche Delta ~-100: hauptsächlich DATE-Normalisierung + CONC-Resplitting (Daten nicht verloren, nur Format normalisiert)

### Phase 2.6: GEDCOM-Nachbesserungen ✅ (März 2026)
- **SOUR/CHAN**: Änderungsdatum von Quellen-Records wird geparst, gespeichert und beim Export zurückgeschrieben. `saveSource()` setzt `lastChanged` automatisch auf heutiges Datum (GEDCOM-Format).
- **Multiple NOTEs unter Events**: Mehrere `2 NOTE`-Tags unter einem Ereignis werden jetzt akkumuliert (statt überschrieben), mit `\n` verbunden, beim Export als `CONT` ausgegeben.
- **RESI/ADDR**: Adress-Subtag (`2 ADDR`) unter Wohnort-Ereignissen wird in `ev.addr` gespeichert, im Ereignis-Formular editierbar (nur bei Typ RESI sichtbar) und beim Export als `2 ADDR / 3 CONT` ausgegeben.

### Phase 2.7: PAGE / Seitenangaben ✅ (März 2026)
- **Seitenangaben bei Quellenreferenzen**: `3 PAGE`-Tag unter `2 SOUR` wird geparst, in `ev.sourcePages[sid]` gespeichert, im Ereignis-Formular neben dem Quellen-Tag editierbar und beim Export als `3 PAGE` zurückgeschrieben.
- Gilt für alle Ereignistypen: BIRT / CHR / DEAT / BURI sowie alle regulären events[].
- Roundtrip-stabil: Parse → Bearbeiten → Write → Re-Parse verlustfrei.

### Phase 3a: UI-Cleanups ✅ (März 2026)
- BIRT/CHR/DEAT/BURI in Detailansicht anklickbar (gleiches Formular wie andere Events)
- Sterbeursache (CAUS) editierbar im Ereignis-Formular
- Geburt/Tod-Felder aus Personen-Formular entfernt (nur noch über Ereignis-Formular)
- Orts-Detailansicht: Ort umbenennen (ersetzt in allen INDI + FAM)

### Phase 3b: Speichern/Backup ✅ (März 2026, abgeschlossen v1.2)
- Desktop Chrome: `showOpenFilePicker()` → `requestPermission({mode:'readwrite'})` → `createWritable()` → direktes Speichern in Originaldatei
- Desktop Safari/Firefox: `<a download>` → Browser-Download-Ordner
- iOS: Share Sheet (Hauptdatei + Zeitstempel-Backup)
- Bei Download: Zeitstempel-Backup des Originals wird automatisch mitgeliefert

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

## Offene Features (für Phase 2 / Version 2.0)

### Fotos (ex Phase 5)

Personen haben in Ancestris Fotos verknüpft. Die Pfade stehen im GEDCOM, aber die Dateien liegen auf dem Mac.

**Empfohlene Umsetzung: Option B (Upload im Formular)**

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

### Erweiterte Suche & Filter (ex Phase 6)

- [ ] Filtern nach Geburtsjahrgang (z.B. 1850–1900)
- [ ] Filtern nach Ort (alle Personen aus Ort X) — direkt aus Orts-Detail erreichbar
- [ ] Filtern nach Quelle (alle Personen mit Quelle X) — direkt aus Quellen-Detail erreichbar
- [ ] Duplikate finden (gleicher Name + ähnliche Daten)
- [ ] Sortierung in Listen (nach Name / Geburtsjahr)

### Stammbaum-Erweiterungen (ex Phase 8)

- [ ] Zoom (Pinch-to-Zoom auf Mobile)
- [ ] Mehrere Ehepartner darstellen (aktuell: nur erster Ehepartner)
- [ ] Vorfahren-Modus: reiner Vorfahren-Baum (mehr als 2 Ebenen hoch)
- [ ] Navigation in Geschwister möglich (Klick auf Halbgeschwister → Baum zentriert)

### Technische Verbesserungen (ex Phase 9)

- [ ] Undo/Redo (letzte 10 Änderungen)
- [ ] Offline-Modus / Service Worker (App funktioniert ohne Internet)
- [ ] PWA-Manifest prüfen (Icons, Splash Screen)
- [ ] Tastatur-Shortcuts für Desktop
- [ ] Import: Konfliktauflösung beim Importieren (wenn neuere GEDCOM-Version vorliegt)
- [ ] Merge zweier GEDCOM-Dateien
- [ ] QUAY (Qualitätsbewertung) für Quellenreferenzen

### OneDrive-Integration

- [ ] Microsoft Graph API (PKCE OAuth, kein Server nötig)
- [ ] Gleiche `_fileHandle`-Architektur wie für lokale iCloud-Dateien
- [ ] Voraussetzung: lokal synchronisierte OneDrive-Dateien funktionieren bereits mit bestehendem `showOpenFilePicker()`-Ansatz

---

## Bekannte Probleme

### Kritisch
| Problem | Ursache | Workaround |
|---|---|---|
| localStorage-Limit | MeineDaten.ged ≈ 5 MB, localStorage ≈ 5–10 MB | Toast-Warnung wenn voll (Code-Review-Fix 4) |
| GEDCOM-Roundtrip verliert Tags | Writer kennt nicht alle Tags | _STAT etc. gehen verloren |

### Mittel
| Problem | Ursache | Workaround |
|---|---|---|
| Fotos nicht ladbar | Windows-Pfade aus Legacy (C:\Users\...) | Dateiname wird angezeigt |

### Klein
| Problem | Status |
|---|---|
| Sortierung nach Datum | Datum ist Raw-String; chronologische Sortierung noch offen |
| Sanduhr zeigt nur ersten Ehepartner | Mehrfach-Ehen noch nicht unterstützt |

---

## Getestete Umgebungen

| Plattform | Browser | Laden | Speichern |
|---|---|---|---|
| iPhone (iOS 17+) | Safari | ✅ | ✅ Share Sheet |
| iPhone (iOS 17+) | Chrome | ✅ | ⚠️ Share Sheet nicht unterstützt |
| Mac | Safari | ✅ | ⚠️ Download (kein direktes Speichern) |
| Mac | Chrome | ✅ | ✅ Direktes Speichern |
| Mac | Firefox | ✅ | ⚠️ Download |
| Android | Chrome | ✅ | ⚠️ Apple Maps Links funktionieren nicht |

---

## Datei-Statistiken (MeineDaten_ancestris.ged)

```
Personen:     2796
Familien:      873
Quellen:       114
Archive:        11
Orte:         3473 (eindeutige Ortsnamen)
Mit Geo:      1989 Personen haben Geburtsgeo-Koordinaten
Medien-Refs:   146
Notiz-Records: 186
Dateigröße:   ~5 MB
```
