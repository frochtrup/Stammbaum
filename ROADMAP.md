# Roadmap

Sprint-Geschichte aller abgeschlossenen Versionen: `CHANGELOG.md`

---

## App-Ziel

**Visuell-einsteigerfreundlich für ambitionierte Hobby-Genealogen.**

Zielgruppe: Ambitionierte Hobby-Genealogen, die **mobil** (Archiv, Feldarbeit: schnelle Erfassung, Forschungsaufgaben, Medien) und **am Desktop** (heavy use: Quellen, Auswertung, Ausgaben) arbeiten.

Drei Dimensionen leiten die Priorisierung:
- **Mobil** — Schnellerfassung, Offline-Robustheit, Kamera-Integration
- **Forschungsqualität** — Protokoll, Quellenvorlagen, Validierung, Duplikate
- **Ausgaben** — Karten, Timeline, Story, Diagramme, Druckausgaben

---

## Aktueller Stand

| Version | Branch | Status |
|---|---|---|
| 4.0–7.0 | `main` | Abgeschlossen — Details: CHANGELOG.md |
| 8.0 | `v8-dev` | **Aktiv** |

**sw-Version:** v601 · Cache: `stammbaum-v601`
**Roundtrip GEDCOM:** stabil, net_delta=0, out1===out2 ✓
**Roundtrip GRAMPS:** 60034 Checks ✓ (2894 Pers.)
**Testdaten:** MeineDaten_ancestris.ged (2811 Pers.) · Unsere Familie.gramps (2894 Pers.)

---

## Design-Constraint

Alle neuen Features müssen den GEDCOM 5.5.1 Roundtrip (`out1===out2`, `net_delta=0`) stabil halten. Neue Datenstrukturen dürfen beim GEDCOM-Export keinen zusätzlichen Delta erzeugen — entweder als Passthrough oder als bekannte, dokumentierte Abweichung. Jede Abweichung muss explizit entschieden und in `ARCHITECTURE.md` (ADR) dokumentiert werden.

---

## Abgeschlossen in v8-dev *(Auswahl — vollständig: CHANGELOG.md)*

| ID | Feature | sw |
|---|---|---|
| SAFARI-SWIPE | Safari-„Zurück"-Swipe abfangen | v573 |
| TASK-EXPORT-MD | Aufgabenliste als Markdown exportieren | v574 |
| F9 | Zeitleiste (Swim-Lane, 71 hist. Ereignisse); ab v591 vollwertiges Diagramm mit einheitlicher Topbar-Struktur (`[⌂][⤢] \| [⧖◑⇩][☰]`) | v501–v540, v591 |
| STORY | Story Mode (Fließtext, Karte, Galerie, Print) | v549–v560 |
| SOUR-DATA | SOUR.DATA.EVEN/DATE strukturiert | v546 |
| MEDI-CALN | MEDI-Typ unter REPO.CALN | v545 |
| ALIA | ALIA-Aliasverweise symmetrisch | v499 |
| REFN | REFN/RIN strukturiert | v548 |
| SEC-1 | XSS-Härtung: URL-Sanitizer href (onedrive-Vorschau) | v576 |
| SEC-2 | MIME-Validierung Foto-Upload + Fehler-Toast | v576 |
| QUICK-ADD | Schnellerfassung neue Person (Masseneingabe-Modus) | v577 |
| CAM-LINK | Foto direkt an Ereignis (Kamera-Button im Event-Formular) | v578 |

---

## P0 — Sicherheit & Stabilität *(Pflicht vor jedem Release)*

| ID | Aufgabe | Details | Aufwand |
|---|---|---|---|
| SEC-1 | XSS in onedrive.js | ✓ URL-Sanitizer für href in ui-media.js (sw v576) | S ✓ |
| SEC-2 | MIME-Validierung Foto-Upload | ✓ file.type-Check + Fehler-Toast in amCamChange (sw v576) | S ✓ |
| ERR-1 | try-catch in async-Funktionen | ✓ bereits vollständig | — ✓ |
| PERF-1 | Debouncing Suche/Filter | ✓ bereits erledigt | — ✓ |
| PERF-2 | Soundex-Cache | ✓ bereits erledigt | — ✓ |

---

## P1 — Mobile Feldarbeit *(Kernnutzen unterwegs)*

Feldarbeit = Archiv, Kirchenbuch vor Ort, Friedhof, Bibliothek. Ziel: neue Erkenntnisse in <60 Sekunden erfassen, ohne Desktop-Ablenkung.

| ID | Aufgabe | Details | Aufwand |
|---|---|---|---|
| QUICK-ADD | **Schnellerfassung neue Person** ✓ | `modalAdd` → „⚡ Neue Person (Schnell)": Minimalformular; Masseneingabe-Modus; „Fertig"-Button öffnet letzte Person (sw v577) | S ✓ |
| CAM-LINK | **Foto direkt an Ereignis** ✓ | `<input capture="environment">` im Ereignis-Formular; Foto → IDB → `ev.media[]` (sw v578) | S ✓ |
| QUICK-TPL | **Konfigurierbares QuickAdd (Quellen-Templates)** | QuickAdd-Formular passt sich der gewählten Quelle an: Quellentyp bestimmt welche Felder erscheinen. Beispiel Taufbuch: Geburt + Taufe als Chips, separates Datum je Ereignis. Konfiguration als `quickAddTemplates[]` JSON, analog SOUR-TMPL. | M |
| F5 | **Lebende-Anonymisierung** | Export: Geb. >~1920 + kein Sterbedatum → „Lebende Person", alle Events entfernt; DSGVO-konform beim Teilen; Opt-in im Einstellungs-Modal | M |

---

## P2 — Forschungsqualität *(von Datensammlung zu systematischer Forschung)*

Der Unterschied zwischen Hobbysammler und ernsthaftem Forscher: Protokoll, Quellenkritik, Lückenanalyse.

| ID | Aufgabe | Details | Aufwand |
|---|---|---|---|
| SOUR-TMPL | **Quellen-Vorlagen** ✓ | 10 Vorlagen; Select-Dropdown bei Neuanlage; befüllt ABBR/TITL/AUTH/PUBL/MEDI (sw v586) | S ✓ |
| FORSCH-LOG | **Forschungsprotokoll** ✓ | `1 _RLOG`; Felder DATE/REPO/SOUR/QUERY/RESULT/NOTE; globaler Tab; Filter + MD-Export (sw v582–v585) | M ✓ |
| VAL-EXTEND | **Validierung ausbauen** ✓ | 21 Regeln in 4 Gruppen; konfigurierbarer `VAL_CONFIG`; Config-UI (sw v590) | M ✓ |
| TREE-HEAT | **Vollständigkeits-Heatmap im Baum** ✓ | `data-completeness="1/2/3"` auf Baum-Karten (Sanduhr + Nachkommen): fehlend: Geburtsdatum / mind. 1 Quellenreferenz / mind. 1 Zitat mit QUAY≥2; box-shadow gelb→orange→rot; `_personCompleteness()` in ui-views.js (sw v598) | S ✓ |
| F3 | **Pedigree-Collapse** | Mehrfach-Vorfahren im Sanduhr-Baum erkennen + visuell zusammenführen; Inzucht-Koeffizient optional | M |

---

## P3 — Desktop-Auswertung *(Heavy Use am Desktop)*

Funktionen für den Rechner-Abend: strukturieren, bereinigen, auswerten, ausgeben.

| ID | Aufgabe | Details | Aufwand |
|---|---|---|---|
| FAN-COLOR | **Fächer-Chart: Farbe nach Generation** | 6 CSS-Variablen für Generationsstufen statt einheitlich gold; sofort lesbarer; keine Layout-Änderung nötig | XS |
| CHART-EXPORT | **Diagramm-Export als PNG** | SVG-basierte Diagramme (Fächer, Nachkommen-Baum) via Canvas-Konvertierung als PNG herunterladen; Download-Button in Topbar; ein Button pro Diagramm | S |
| STATS-2 | **Statistik-Dashboard ausbauen** ✓ | Lebensspannen (Ø, Median, Min, Max + 10-Jahres-Histogramm); Heiratsalter-Verteilung (Ø Mann/Frau + 5-Jahres-Bins); Ereignisse pro Jahrzehnt (Geburten/Sterbefälle/Heiraten getrennt mit Legende); Top-Sterbeorte; Kinderzahl-Verteilung pro Familie (sw v597) | M ✓ |
| SEARCH-ADV | **Erweiterte Suche** ✓ | Fehlende-Felder-Checkboxen: Kein Sterbedatum / Keine Quellen / Keine Eltern; in advFilterPanel integriert; kombinierbar mit Jahresfilter, Geburtsort, Geschlecht, Volltext (sw v596) | M ✓ |
| MEDIA-MGR | **Medienverwaltung (eigene View)** | Zentraler Medien-Tab oder Menüeintrag statt verteilter 📎-Buttons in Personen-/Familien-/Quellen-Liste. Einheitliche Galerie aller Medien mit Filter nach Typ (Foto/Dokument/Audio), Zuordnung (Person/Familie/Quelle) und fehlender Verknüpfung. Klick öffnet Kontext (Person-/Familiendetail). Ersetzt `showPersonMediaBrowser`, `showFamilyMediaBrowser`, `showMediaBrowser` durch einen einzigen View `#v-media`. | L |
| REL-CALC | **Beziehungsrechner** | „Wie sind X und Y verwandt?" — BFS durch Familiengraph. Text: „3. Grad Cousin, gemeinsamer Vorfahre: Johann Decker (1780)". Erweiterung: visueller Pfad als klickbare Karten-Kette im Modal. Erreichbar aus Personen-Detail. | M |
| PRINT-OUT | **Strukturierte Druckausgaben** | Ahnenliste (Kekule-Nummerierung) als HTML-Tabelle + PDF via `window.print()`. Familienbogen als druckbare HTML-Seite. Die 2 für den deutschen Raum relevantesten Formate. | M+M |
| DUP-DETECT | **Duplikat-Erkennung** | `findDuplicatePairs()` via Web Worker (Main Thread reaktiv bei >2000 Personen). Soundex-Namensvergleich + Geburtsdatum-Ähnlichkeit. Merge-Vorschlag-UI. | L |

---

## P4 — Visuelle Ausgaben *(Wow-Faktor)*

Ausgaben, die Genealogen ihren Familien zeigen und auf die sie stolz sind. Fundament bereits abgeschlossen (Timeline ✓, Story ✓, Karte ✓, Fächer ✓, Nachkommen-Baum ✓).

| ID | Aufgabe | Details | Aufwand |
|---|---|---|---|
| MAP-ANIM | **Karte: animierter Migrationspfad** | Play-Button im Migrationsmodus: `polyline`-Segmente werden zeitlich per CSS-Transition abgefahren (Epochen-Farben bleiben); Geschwindigkeit wählbar; Loop-Option | S |
| MAP-HIST-A | **Vintage-Kartenstil** | CSS-Filter (`sepia/brightness/contrast`) auf OSM-Kacheln; Toggle Modern/Historisch im Kartenview; UIState-Persistenz; kein API-Key | S |
| TL-MULTI | **Zeitleiste: Mehrpersonen-Modus** | 2–5 Personen parallel in den Swim-Lanes; Personen-Picker analog Baum; gemeinsame historische Ereignisse; Farb-Kodierung pro Person; Basis (`ui-timeline.js`) steht | M |
| STORY-OPT | **Story: Textqualität verbessern** | Natürlichere Satzstrukturen für häufige Ereigniskombinationen (Beruf mit Zeitraum, Familiennarrative, Kinderzahl); Epochen-Kontext; LLM-optionale Anreicherung als Opt-in | M |
| STORY-FAM | **Story-Mode für Familien** | Familien-Narrative: Eltern + alle Kinder, gemeinsame Ereignisse, Geschwister-Vergleich, Zeitspanne der Familie; HTML-Download + Print-CSS analog Person-Story | M |
| MAP-HIST-B | **Echter Historikkartenhintergrund** | Swisstopo Siegfriedkarte (1883–1949, WMTS bestätigt) als Layer + Jahres-Dropdown. Coverage: Schweiz + Grenzregionen (Vorarlberg, Elsass, Baden). | M |

---

## P5 — Standards & Interoperabilität *(für Fortgeschrittene)*

| ID | Aufgabe | Details | Aufwand |
|---|---|---|---|
| ASSO-UI | **ASSO-Beziehungen (Zeugen, Paten, Informanten)** | Schritt 1: Read-only Anzeige vorhandener `1 ASSO`-Blöcke in Personen-Detail (Rolle + verknüpfte Person). Schritt 2: Bearbeitung — Person als Zeuge/Pate/Informant zu einem Ereignis zuordnen, `1 ASSO`-Block schreiben + Roundtrip-stabil. | M+M |
| F6 | **Strict GEDCOM Export** | Alle `_`-Tags entfernen oder auf Standard-Tags mappen; Export-Modus im Einstellungs-Modal; ADR dokumentiert | M |
| GRAMPS-Edit | **GRAMPS-Attribute editierbar** | `_grampsAttrs[]` in Personen-/Familien-Formular anzeigen + editieren; `grampId` sichtbar | M |
| OBJE-TYPE | **Medien-Typ strukturiert** ⚠ | `m._type` als Vendor-Extension (`2 _TYPE`); kein Standard-Tag in GEDCOM 5.5.1; ADR erforderlich vor Umsetzung | S |

---

## Dokumentation

Handbuch-Pflege: kein Funktionsrelease nötig, aber separater Aufwand.

| ID | Aufgabe | Details | Aufwand |
|---|---|---|---|
| DOC-SEARCH-ADV | **Handbuch Kap. 11: Erweiterte Suche** | Abschnitt „Fehlende-Felder-Filter" ergänzen: Die drei Checkboxen „Kein Sterbedatum", „Keine Quellen", „Keine Eltern" im advFilterPanel (☰ Suche → Erweitert) erklären; kombinierbar mit Jahresfilter, Geburtsort, Geschlecht, Volltext. | XS |
| DOC-STATS | **Handbuch: Statistik-Kapitel** | Neues Kapitel „Statistik & Auswertung" (oder als Unterabschnitt in Kap. 3 Hauptbereiche): Statistik-Tab erreichbar über ☰ → Statistik; enthält Übersichts-Kacheln, Geschlechterverteilung, Datenvollständigkeit, Lebensspannen (Ø/Median/Min/Max + Histogramm), Heiratsalter-Verteilung (♂/♀ getrennt), Ereignisse pro Jahrzehnt (Geburten/Sterbefälle/Heiraten), Top-Sterbeorte, Kinderzahl-Verteilung, Top-Namen/Orte. | S |
| DOC-TREE-HEAT | **Handbuch Kap. 8: Vollständigkeits-Heatmap** | In „Bedeutung der Farben" (Sanduhr-Baum-Abschnitt) ergänzen: farbige Ringe auf Karten zeigen fehlende Daten — goldgelb (1 Feld fehlt), orange (2 fehlen), rot (alle 3 fehlen); geprüft werden Geburtsdatum · Quellenangabe · mind. 1 Zitat mit QUAY ≥ 2; Hover-Tooltip nennt konkret fehlende Felder. | XS |
| DOC-VAL-22 | **Handbuch Kap. 13: Regelzahl + neue Regel** | Tabelle „21 Regeln" → „22 Regeln" korrigieren; neue Zeile in Gruppe QUELLEN: „Keine Quellenangabe (Familie)" → ℹ Hinweis ergänzen. | XS |
| DOC-SCREENS | **Handbuch: echte Screenshots** | Alle Mockups und Prinzipbilder in `HANDBUCH.html` durch echte Screenshots aus dem Preview-Fenster ersetzen. Priorität: Sanduhr-Baum, Fächer-Diagramm, Nachkommen-Baum, Zeitleiste, Karte (Migrations-Modus), Personen-Detailansicht, Ereignis-Formular. Vorgehen: App mit Demo-Daten laden, Screenshot je View, als `<img>` einbetten oder als Base64-Data-URI. | M |

---

## Backlog / Forschung

Kein festes Datum. Kandidaten für spätere Versionen.

| ID | Aufgabe | Details | Aufwand |
|---|---|---|---|
| F8 | **Cluster-Ansicht** | Alle Personen in denselben Orten/Quellen wie Person X | L |
| GEDCOM-7 | **GEDCOM 7.0 Evaluierung** | FamilySearch-Standard; Parser/Writer-Anpassung; HEAD GEDC VERS 7.0 | L |
| F11 | **OCR** | Urkunden-Scan → Text; WASM-Tesseract oder LLM-Backend | XL |

---

*Aufwand: XS (<1h) · S (1–2h) · M (halber Tag) · L (1–2 Tage) · XL (>2 Tage)*
*Vollständige Sprint-Geschichte inkl. aller abgeschlossenen Items: CHANGELOG.md*
