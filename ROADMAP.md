# Roadmap

Sprint-Geschichte aller abgeschlossenen Versionen: `CHANGELOG.md`

---

## Aktueller Stand

| Version | Branch | Status |
|---|---|---|
| 4.0–7.0 | `main` | Abgeschlossen — Details: CHANGELOG.md |
| 8.0 | `v8-dev` | **Aktiv** |

**sw-Version:** v479 · Cache: `stammbaum-v479`
**Roundtrip GEDCOM:** stabil, net_delta=0, out1===out2 ✓
**Roundtrip GRAMPS:** 60034 Checks ✓ (2894 Pers.)
**Testdaten:** MeineDaten_ancestris.ged (2811 Pers.) · Unsere Familie.gramps (2894 Pers.)

---

## Design-Constraint

Alle neuen Features müssen den GEDCOM 5.5.1 Roundtrip (`out1===out2`, `net_delta=0`) stabil halten. Neue Datenstrukturen dürfen beim GEDCOM-Export keinen zusätzlichen Delta erzeugen — entweder als Passthrough oder als bekannte, dokumentierte Abweichung. Jede Abweichung muss explizit entschieden und in `ARCHITECTURE.md` (ADR) dokumentiert werden.

---

## P1 — Sicherheit & Stabilität (nächster Sprint)

Ergebnis eines Code-Audits (2026-05-15): konkrete Bugs und Sicherheitslücken im bestehenden Code, unabhängig von neuen Features.

| ID | Aufgabe | Details | Aufwand |
|---|---|---|---|
| ~~SEC-1~~ | ~~**XSS in onedrive.js**~~ | ~~Falschalarm: `esc()` wird korrekt verwendet~~ | — |
| ~~SEC-2~~ | ~~**Foto-Upload ohne MIME-Validierung**~~ | ~~Falschalarm: `am-cam-input` hat `accept="image/*"` + `createImageBitmap` wirft bei Nicht-Bild; JSON-Import prüft `startsWith('data:image/')`~~ | — |
| ~~ERR-1~~ | ~~**3 async-Funktionen ohne try-catch**~~ | ~~`revertToSaved` (storage.js), `exportGEDCOM` (storage-file.js), `odLogin` (onedrive-auth.js) — **erledigt sw v448**~~ | — |
| ~~PERF-1~~ | ~~**Kein Debouncing auf Filter-Inputs**~~ | ~~`runGlobalSearch` auf Input debounced (200ms); alle anderen Filter waren bereits debounced — **erledigt sw v449**~~ | — |
| ~~PERF-2~~ | ~~**Soundex nicht gecacht**~~ | ~~`_sdxSurname`/`_sdxGiven` in `_buildSearchIndex` vorberechnet; `filterPersons` nutzt Cache mit Fallback — **erledigt sw v449**~~ | — |

---

## P2 — Features (mittelfristig)

| ID | Aufgabe | Details | Aufwand |
|---|---|---|---|
| F5 | **Lebende-Anonymisierung** | Export: Geb. >~1920 + kein Sterbedatum → Name „Lebende Person", alle Events entfernt; DSGVO-konform; Opt-in im Einstellungs-Modal | M |
| F6 | **Strict GEDCOM Export** | Alle `_`-Tags (\_RUFNAME, \_TASK, \_GRAMPS\_ID etc.) entfernen oder auf Standard-Tags mappen; Export-Modus im Einstellungs-Modal; dokumentiert in ADR | M |
| ASSO-UI | **ASSO-Beziehungen editierbar** | ASSO wird geparst + geschrieben (korrekt), aber kein UI-Formular; read-only Anzeige in Personen-Detail als Schritt 1; Bearbeitung (Zeuge/Pate zu Event zuordnen) als Schritt 2 | M+M |
| ~~CrossMode-CitNotes~~ | ~~**Citation-Notizen im GRAMPS→GEDCOM-Cross-Mode**~~ | ~~`_citExtra[]` `<noteref>`-Einträge → `3 NOTE @grampId@` im GEDCOM-Export; setzt Note-XREF voraus (erledigt v419) — **erledigt sw v450**~~ | — |
| ~~GRAMPS-Orte~~ | ~~**Orts-Picker im GRAMPS-Modus**~~ | ~~3 Schritte abgeschlossen (sw v471–v475): (1) placeId-Erhalt im Edit-Pfad; (2) Place-Picker aus placeObjects mit Typ-Badge; (3) Hierarchie-Anzeige `Stadt → Kreis → Land` in Event-Detail~~ | ~~S+M+S~~ |
| GRAMPS-Edit | **GRAMPS-Attribute editierbar** | `_grampsAttrs[]` in Personen-/Familien-Formular anzeigen + editieren; `grampId` sichtbar | M |
| ~~U12~~ | ~~**Dark Mode**~~ | ~~`prefers-color-scheme: light` + `[data-theme]`-Toggle in `styles.css`; `<meta theme-color media>` in `index.html`; Segment-Control (Auto/Hell/Dunkel) im Einstellungs-Modal; `applyTheme`/`setThemePref` in `storage-file.js` — **erledigt sw v452**~~ | — |
| SOUR-DATA | **SOUR.DATA.EVEN/DATE strukturiert** | Laufzeit + Ereignistypen einer Quelle (z. B. Kirchenbuch 1750–1850, BIRT/MARR/DEAT); Parser: `dataExtra[]` → `s.dataEvens[]` mit `{type,date,plac}`; Writer: `2 DATA / 3 EVEN / 3 DATE / 3 PLAC`; UI: Quellen-Formular + Quellen-Detail (Deckungsbereich sichtbar für Forschungsplanung) | M |
| MEDI-CALN | **MEDI-Typ unter REPO.CALN** | `3 MEDI Mikrofilm\|Digitalisat\|Original` unter `2 CALN`; Parser: `s.repoCallNumMedi`; Writer: eine Zeile; UI: ein Feld im Quellen-Formular | S |
| TREE-GEN-IN-TREE | **Gen-Buttons in den Baum** | Generationswahl (2–6 bzw. 2–7) aus der Topbar herausnehmen und als schwebende Buttons im Baum selbst platzieren; Topbar wird dadurch frei für Proband-Schnellknopf (⌂ direkt in der Topbar) — betrifft Sanduhr-Baum, Nachkommen-Baum und Fächer | S |
| ~~TREE-SPOUSE-FOCUS~~ | ~~**Fokus-Ehepartner bei Mehrfachehen**~~ | ✅ **Abgeschlossen** (sw v478–v479): Nachkommen-Baum + Personen-Detail verwenden beide `p.fams`-Reihenfolge statt Datum-Sort; Personen-Detail: ↑/↓-Buttons zum Umordnen wenn `p.fams.length > 1`; `moveFamOrder()` tauscht Array-Einträge + setzt `changed`; GEDCOM-Roundtrip verlustfrei (Reihenfolge der `1 FAMS`-Zeilen bleibt erhalten). Nachkommen-Baum: Tastatur-Legende jetzt auch im desc-tree-Modus sichtbar. | ~~S~~ |
| F3 | **Pedigree-Collapse** | Mehrfach-Vorfahren erkennen + im Sanduhr-Baum zusammenführen; Inzucht-Koeffizient berechnen | M |
| Perf-Worker | **Web Worker für Duplikat-Scan** | `findDuplicatePairs()` in `Worker` auslagern; Main Thread bleibt bei >2000 Personen reaktiv | M |
| ~~Nachkommen~~ | ~~**Nachkommen-Baum**~~ | ✅ **Abgeschlossen** (sw v468): `ui-desc-tree.js`; Toggle-Button `⇩` im Baum-View; Gen-Buttons 2–7; T-Linien-Layout; `▼`-Badge bei abgeschnittener Tiefe; alle Ehepartner in Reihe rechts am Startpunkt (je ⚭-Button); Geschwister horizontal gestapelt links (variable Überlappung); `½`-Badge für Kinder aus Nebenehe | ~~L~~ |
| ~~OBJE-FIELDS~~ | ~~**OBJE-Felder note/date/scbk/prim dediziert**~~ | ✅ **Abgeschlossen** (sw v476): `p.media[]`/`f.media[]`/`s.media[]` erhalten `note`/`date`/`scbk`/`prim` als dedizierte Felder statt `_extra[]`-Passthrough; `_PRIM` aus GEDCOM korrekt in `m.prim`; `_DATE` → `2 NOTE Aufnahmedatum: …` (GEDCOM-konform, keine neuen Schulden); Edit-Form: Felder Notiz + Aufnahmedatum; alle 4 Save-Pfade | ~~S+S~~ |

---

## Backlog (kein festes Datum)

| ID | Aufgabe | Details | Aufwand |
|---|---|---|---|
| OBJE-TYPE | **OBJE.TYPE strukturiert** | `m.type` (Foto/Urkunde/Karte); Parser + Writer; UI: TYPE als Filter im Media-Browser | S |
| ALIA | **ALIA-Aliasverweise** | `1 ALIA @xref@` auf INDI; Parser: `p.alia[]`; Writer: `1 ALIA`-Blöcke (aktuell Passthrough — kein Datenverlust, aber kein strukturierter Zugriff); UI: Personen-Detail zeigt verlinkte Alias-Personen (read-only Schritt 1, Edit Schritt 2) | S+S |
| REFN | **REFN/RIN strukturiert** | `1 REFN value / 2 TYPE type` auf INDI/FAM/SOUR/REPO; Parser: `p.refns[]` mit `{val,type}`; Writer: `1 REFN`-Blöcke (aktuell Passthrough); UI optional — primär für Companion-Workflows mit externen Programmen (Legacy, RootsMagic) | S |
| TASK-EXPORT-MD | **Aufgabenliste als Markdown exportieren** | Alle offenen Forschungsaufgaben (`p._tasks[]`) und Validierungsbefunde (aus `runValidation()`) als `.md`-Datei herunterladen; gegliedert nach Kategorie (Kirchenbuch / Urkunde / Online-Recherche / Validierung) und Schweregrad (Fehler / Warnung / Info); pro Eintrag: Person, Text, ggf. Regel-ID; Download-Button im Aufgaben-Tab | S |
| VAL-FAM | **Familien-Tasks** | `f._tasks[]` analog zu `p._tasks[]` aufbauen; GEDCOM-Roundtrip via `_TASK` unter FAM-Record; Validierungsbefunde für Familien direkt auf der Familie ablegen statt auf Elternteilen | M |
| VAL-AMPEL | **Severity-Ampel im Personen-Detail** | Kleines farbiges Indikator-Icon (rot/orange/grau) in der Personen-Detailansicht wenn offene Validierungsbefunde vorliegen; Klick navigiert in Aufgaben-Tab gefiltert auf diese Person | S |
| VAL-CONFIG | **Regelkonfiguration Validierung** | Nutzer kann einzelne Validierungsregeln (de)aktivieren und Schwellenwerte anpassen (z. B. Altersgrenze, Jahreszahl Standesamt-Ära); gespeichert in IDB | M |
| GEDCOM-7 | **GEDCOM 7.0 Evaluierung** | FamilySearch-Standard im Kommen; Parser/Writer-Anpassung für neue Tag-Struktur; HEAD GEDC VERS 7.0 | L |
| ASSO-Event | **Event-Rollen voll editierbar** | Personen als Zeugen/Paten zu Events zuordnen; schreibt `1 ASSO`-Block; nur nach ASSO-UI sinnvoll | L |
| F8 | **Cluster-Ansicht** | Alle Personen in denselben Orten/Quellen wie Person X | L |
| F7 | **Narrative-Export** | Fließtext-Biografie → TXT/HTML; LLM-Erweiterung optional | L |
| F9 | **Zeitleiste** | Personen-Events neben historischen Ereignissen; `ui-timeline.js` | XL |
| ~~F10~~ | ~~**Buchgenerator**~~ | ~~`ui-book.js`: Kekule-Ahnenindex, Personen-Biografie, Hauptfoto (base64), Familien, Quellen, Inhaltsverzeichnis, Namenindex; Modus Ahnen/Alle; Download als HTML — **erledigt sw v453**~~ | — |
| F11 | **OCR** | Urkunden-Scan → Text; WASM-Tesseract oder LLM-Backend | XL |

---

*Aufwand: XS (<1h) · S (1–2h) · M (halber Tag) · L (1–2 Tage) · XL (>2 Tage)*
*Vollständige Sprint-Geschichte: CHANGELOG.md*
