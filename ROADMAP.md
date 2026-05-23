# Roadmap

Sprint-Geschichte aller abgeschlossenen Versionen: `CHANGELOG.md`

---

## App-Ziel

**Visuell-einsteigerfreundlich für ambitionierte Hobby-Genealogen.**

Zielgruppe: Ambitionierte Hobby-Genealogen, die **mobil** (Archiv, Feldarbeit: schnelle Erfassung, Forschungsaufgaben, Medien) und **am Desktop** (heavy use: Quellen, Auswertung, Ausgaben) arbeiten.

Vier Dimensionen leiten die Priorisierung:
- **Stabilität** — Sicherheit, Roundtrip-Integrität, technische Schulden
- **Mobil** — Schnellerfassung, Offline-Robustheit, Kamera-Integration
- **Forschungsqualität** — Protokoll, Quellenvorlagen, Validierung, Duplikate
- **Ausgaben** — Karten, Timeline, Story, Diagramme, Druckausgaben

---

## Aktueller Stand

| Version | Branch | Status |
|---|---|---|
| 4.0–7.0 | `main` | Abgeschlossen — Details: CHANGELOG.md |
| 8.0 | `v8-dev` | **Aktiv** |

**sw-Version:** v683 · Cache: `stammbaum-v683`
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
| STATS-2 | Statistik-Dashboard ausgebaut (Lebensspannen, Heiratsalter, Ereignisse/Dekade, Sterbeorte, Kinderzahl) | v597 |
| SEARCH-ADV | Erweiterte Suche: Fehlende-Felder-Checkboxen | v596 |
| MAP-ANIM | Karte: animierter Migrationspfad (Play/Pause/Stopp) | v603 |
| MAP-TOPBAR | Karte als Diagramm: 🗺-Button in allen Diagramm-Topbars | v604 |
| SEC-3 | XSS: `buildPlacePartsHtml()` → DOM-API `_buildPlaceParts()` | v607 |
| STAB-2 | Konflikt-Erkennung beim Speichern (`lastModified`-Check) | v607 |
| MEDIA-MGR | Medien-Sub-Tab im Quellen-Tab (Kachelgalerie, Lazy-Loading, Filter) | v608 |
| MEDIA-MGR-DETAIL | Medien-Detailansicht mit Referenz-Management | v609–v622 |
| PERF-MEDIA | Medien-Galerie: IntersectionObserver + Thumb-Cache | v623 |
| MEDIA-SORT | Medienliste: Sortierung nach Dateiname (⇅) | v624 |
| REFACT-1 | `parseGEDCOM()` in 5 Sub-Parser aufgeteilt; Kontext-Objekt `x`; Roundtrip stabil | v627 |
| TEST-AUTO | `test.html`: Standalone Roundtrip-Tester (kein UI-Load); Drag-Drop beliebig viele .ged | — |
| TL-MULTI | Zeitleiste Mehrpersonen-Modus: 2–5 Personen parallel, ⊕-Button, Farb-Chips, Person-Bar | v665 |
| PRINT-OUT | Ahnenliste (Kekule-Tabelle) + Familienbogen als druckbare HTML-Downloads; `ui-print.js` | v669 |

---

## P0 — Sicherheit & Stabilität *(Pflicht vor jedem Release)*

| ID | Aufgabe | Details | Aufwand |
|---|---|---|---|
| ~~SEC-1~~ | ~~**XSS in onedrive.js**~~ | URL-Sanitizer für href in ui-media.js (sw v576) | - |
| ~~SEC-2~~ | ~~**MIME-Validierung Foto-Upload**~~ | file.type-Check + Fehler-Toast in amCamChange (sw v576) | - |
| ~~ERR-1~~ | ~~**try-catch in async-Funktionen**~~ | bereits vollständig | - |
| ~~PERF-1~~ | ~~**Debouncing Suche/Filter**~~ | bereits erledigt | - |
| ~~PERF-2~~ | ~~**Soundex-Cache**~~ | bereits erledigt | - |
| ~~SEC-3~~ | ~~**XSS: innerHTML mit placeId absichern**~~ | `buildPlacePartsHtml()` → `_buildPlaceParts(placeId, container)` mit DOM-API (`createElement`/`textContent`); kein innerHTML mehr (sw v607) | - |
| ~~STAB-2~~ | ~~**Konflikt-Erkennung beim Speichern (Desktop)**~~ | `saveToFileHandle()` prüft `file.lastModified` vor dem Schreiben; Confirm-Dialog bei externer Änderung; Timestamp nach jedem Laden/Speichern in `AppState._fileLastModified` (sw v607) | - |

---

## P1 — Mobile Feldarbeit *(Kernnutzen unterwegs)*

Feldarbeit = Archiv, Kirchenbuch vor Ort, Friedhof, Bibliothek. Ziel: neue Erkenntnisse in <60 Sekunden erfassen, ohne Desktop-Ablenkung.

| ID | Aufgabe | Details | Aufwand |
|---|---|---|---|
| ~~QUICK-ADD~~ | ~~**Schnellerfassung neue Person**~~ | `modalAdd` → „⚡ Neue Person (Schnell)": Minimalformular; Masseneingabe-Modus; „Fertig"-Button öffnet letzte Person (sw v577) | - |
| ~~CAM-LINK~~ | ~~**Foto direkt an Ereignis**~~ | `<input capture="environment">` im Ereignis-Formular; Foto → IDB → `ev.media[]` (sw v578) | - |
| QUICK-TPL | **Konfigurierbares QuickAdd (Quellen-Templates)** | QuickAdd-Formular passt sich der gewählten Quelle an: Quellentyp bestimmt welche Felder erscheinen. Beispiel Taufbuch: Geburt + Taufe als Chips, separates Datum je Ereignis. Konfiguration als `quickAddTemplates[]` JSON, analog SOUR-TMPL. | M |
| F5 | **Lebende-Anonymisierung** | Export: Geb. >~1920 + kein Sterbedatum → „Lebende Person", alle Events entfernt; DSGVO-konform beim Teilen; Opt-in im Einstellungs-Modal | M |

---

## P2 — Forschungsqualität *(von Datensammlung zu systematischer Forschung)*

Der Unterschied zwischen Hobbysammler und ernsthaftem Forscher: Protokoll, Quellenkritik, Lückenanalyse.

| ID | Aufgabe | Details | Aufwand |
|---|---|---|---|
| ~~SOUR-TMPL~~ | ~~**Quellen-Vorlagen**~~ | 10 Vorlagen; Select-Dropdown bei Neuanlage; befüllt ABBR/TITL/AUTH/PUBL/MEDI (sw v586) | - |
| ~~FORSCH-LOG~~ | ~~**Forschungsprotokoll**~~ | `1 _RLOG`; Felder DATE/REPO/SOUR/QUERY/RESULT/NOTE; globaler Tab; Filter + MD-Export (sw v582–v585) | - |
| ~~VAL-EXTEND~~ | ~~**Validierung ausbauen**~~ | 21 Regeln in 4 Gruppen; konfigurierbarer `VAL_CONFIG`; Config-UI (sw v590) | - |
| ~~TREE-HEAT~~ | ~~**Vollständigkeits-Heatmap im Baum**~~ | `data-completeness="1/2/3"` auf Baum-Karten (Sanduhr + Nachkommen); Farb-Ringe; `_personCompleteness()` in ui-views.js (sw v598) | - |
| F3 | **Pedigree-Collapse** | Mehrfach-Vorfahren im Sanduhr-Baum erkennen + visuell zusammenführen; Inzucht-Koeffizient optional | M |

---

## P3 — Desktop-Auswertung *(Heavy Use am Desktop)*

Funktionen für den Rechner-Abend: strukturieren, bereinigen, auswerten, ausgeben.

| ID | Aufgabe | Details | Aufwand |
|---|---|---|---|
| ~~STATS-2~~ | ~~**Statistik-Dashboard ausgebaut**~~ | Lebensspannen, Heiratsalter-Verteilung, Ereignisse/Jahrzehnt, Top-Sterbeorte, Kinderzahl-Verteilung (sw v597) | - |
| ~~SEARCH-ADV~~ | ~~**Erweiterte Suche**~~ | Fehlende-Felder-Checkboxen kombinierbar mit allen Filtern (sw v596) | - |
| FAN-COLOR | **Fächer-Chart: Farbe nach Generation** | 6 CSS-Variablen für Generationsstufen statt einheitlich gold; sofort lesbarer; keine Layout-Änderung nötig | XS |
| ~~CHART-EXPORT~~ | ~~**Diagramm-Export als PNG**~~ | `ui-chart-export.js`: `_svgToPng()` Kern-Engine (CSS-Var-Auflösung + Canvas); Fächer-Chart direkt; Nachkommen-Baum DOM-Snapshot (lines + rect+text aus Divs); `↓`-Button in Baum-Topbar (sw v629) | - |
| ~~EXPORT-UNSTACK~~ | ~~**PNG-Export: Stapel auflösen**~~ | Sanduhr-Export: Peek-Karten (Geschwister + Ehepartner) vollständig nebeneinander; `_computeUnstack()` berechnet neue Positionen + SVG wächst in der Höhe; `data-role`-Labels auf SVG-Linien für saubere Endpoint-Korrektur (sw v631) | - |
| ~~TREE-SIB-HORIZ~~ | ~~**Sanduhr: Geschwister + Ehepartner horizontal**~~ | Geschwister in einer Reihe links des Probanden (baumbreitenabhängige Kartenbreite, min 60px, +N-Badge bei Überlauf); Ehepartner immer horizontal rechts; kein vertikaler Stapel mehr; T-Balken-Konnektoren; Fallback Peek-Stapel bei ancLevels < 3 (sw v632) | - |
| ~~EXPORT-SANDUHR-FIX~~ | ~~**Sanduhr-Export: neue Elemente nachgezogen**~~ | `ui-chart-export.js`: `.tree-sib-more` (…-Box) als gestricheltes SVG-Rect gerendert; `--sib-count`-Badge (∞N, unten links) als goldene Pill im `badgeFull`-Pfad; obsolete `sib-v`- und `spouse-active`-Endpunkt-Korrekturen entfernt (sw v637) | - |
| CSV-EXPORT | **CSV-Export für Listen** | Personen- und Familienliste als CSV aus der aktuell gefilterten Ansicht; Spalten konfigurierbar (Name, Geburt, Tod, Ort, Quellenzahl); Download-Button im Listen-Header. Wichtige Kompatibilität zu Excel/Numbers für Abgleich und Druck. | S |
| ~~REL-CALC~~ | ~~**Beziehungsrechner**~~ | BFS-Beziehungsrechner: Verwandtschaft zum Probanden + gemeinsamer Vorfahre mit Geburtsjahr in Person-Detail; freier Zweipersonen-Vergleich via „🔗 zu …"-Button; visueller Pfad als klickbare Karten-Kette im Modal (sw v626) | - |
| ~~MEDIA-MGR~~ | ~~**Medienverwaltung (eigene View)**~~ | Dritter Sub-Tab „Medien" im Quellen-Tab; Kachelgalerie aller Medien (Personen + Familien + Quellen); Filter-Chips Alle/Personen/Familien/Quellen; Lazy-Loading mit ⚠-Overlay; Klick navigiert zum Kontext-Datensatz; ersetzt drei Modal-Browser (sw v608) | - |
| ~~MEDIA-MGR-DETAIL~~ | ~~**Medien-Detailansicht**~~ | `showMediaDetail()`: Detailansicht im rechten Panel; globale Felder FILE/FORM/MEDI; Referenzliste mit ↗ Navigation und × Löschen; per-Ref-Felder TITL/DATE/NOTE/_PRIM; Inline-Suchpanel zum Hinzufügen neuer Referenzen (Person/Familie/Quelle) mit Lebensdaten-Anzeige (sw v609–v622) | - |
| ~~DUP-DETECT~~ | ~~**Duplikat-Erkennung**~~ | Levenshtein-Score (Nachname/Vorname/Sex/Geburtsjahr/Ort), Nachname-Bucketing O(n·k²), Merge-Modal mit Seiten-Tausch, Ignore-Liste (localStorage), `pushUndo` vor Merge (sw v628). Web Worker → WW-PARSER. | - |
| ~~PRINT-OUT~~ | ~~**Strukturierte Druckausgaben**~~ | Ahnenliste (Kekule-Tabelle) + Familienbogen als druckbare HTML-Downloads; `ui-print.js` (sw v669) | - |
| ~~DEDUP-ENH~~ | ~~**Duplikat-Erkennung ausgebaut**~~ | Zeilenweise Feldauswahl im Merge-Modal (sw v670); Forschungseintrag-Button für beide Personen (sw v671); Eltern + Partner im Scoring, normalisiert auf 100 (sw v672); Suchfeld zum Filtern der Paar-Liste (sw v683) | - |
| ~~IMPORT-CMP~~ | ~~**Datei-Vergleichs- & Merge-Assistent**~~ | `compare-engine.js` + `ui-import-compare.js`; Matching, Diff, Additions/Konflikte, Forschungseinträge (📋), Neue-Person-Import mit Familienverknüpfung (sw v673–v682) | - |
| ~~WW-PARSER~~ | ~~**Web Worker für große GEDCOM-Dateien**~~ | `parseGEDCOM()` in `gedcom-worker.js` ausgelagert; `onProgress`-Callback alle 5%; Fortschrittsbalken `#loadingBar` im Lade-Overlay; Sync-Fallback wenn `Worker` nicht verfügbar; `_finishLoad()` als gemeinsamer Post-Parse-Pfad (sw v649) | - |

---

## P4 — Visuelle Ausgaben *(Wow-Faktor)*

Ausgaben, die Genealogen ihren Familien zeigen. Fundament abgeschlossen (Timeline ✓, Story ✓, Karte ✓, Fächer ✓, Nachkommen-Baum ✓, Animierter Migrationspfad ✓).

| ID | Aufgabe | Details | Aufwand |
|---|---|---|---|
| ~~MAP-ANIM~~ | ~~**Karte: animierter Migrationspfad**~~ | Play/Pause/Stopp-Bar; stroke-dashoffset (Migr) / opacity-Fade (Person); Geschwindigkeit; Loop (sw v603) | - |
| ~~MAP-TOPBAR~~ | ~~**Karte als Diagramm: 🗺-Button in allen Diagramm-Topbars**~~ | 🗺 in Person-Detail, Zeitleiste, Sanduhr-Baum + Detail-NavBar (sw v604) | - |
| MAP-HIST-A | **Vintage-Kartenstil** | CSS-Filter (`sepia/brightness/contrast`) auf OSM-Kacheln; Toggle Modern/Historisch im Kartenview; UIState-Persistenz; kein API-Key | S |
| ~~TL-MULTI~~ | ~~**Zeitleiste: Mehrpersonen-Modus**~~ | 2–5 Personen in Swim-Lanes; ⊕-Button in Filterbar; farbige Chips + Lebensspannen pro Person; `_tlPersonIds[]`; Person-Bar mit ✕; Querformat only (sw v665) | - |
| ~~STORY-OPT~~ | ~~**Story: Textqualität verbessern**~~ | OCCU-Merge (Berufe mit Zeitraum in einem Satz); Kinder mit Geburtsjahren; Partner-Lebensdaten in Heiratssatz; Geschwisterzahl in Frühleben; Todesursache mit „an"-Präposition; `_sectionEpoch` + `story-epochs.js` (11 Epochen); LLM-Opt-in separates Ticket (sw v638) | - |
| STORY-FAM | **Story-Mode für Familien** | Familien-Narrative: Eltern + alle Kinder, gemeinsame Ereignisse, Geschwister-Vergleich, Zeitspanne der Familie; HTML-Download + Print-CSS analog Person-Story | M |
| ~~STORY-DIAGRAM~~ | ~~**Story: Stammbaum-Diagramme einbetten**~~ | Inline-SVG Ahnentafel nach der Karte: GP-Zeile → Eltern → Proband ⚭ Partner → Kinder (bis 4 + „+N"-Pill); eigenständiger SVG-Generator in `_sectionDiagram()` ohne DOM-Abhängigkeit; CSS-Var-Fallbacks für HTML-Export; Klick-Navigation via `showDetail()`; entfällt wenn weder Eltern noch Kinder vorhanden (sw v645) | - |
| MAP-HIST-B | **Echter Historikkartenhintergrund** | Swisstopo Siegfriedkarte (1883–1949, WMTS bestätigt) als Layer + Jahres-Dropdown. Coverage: Schweiz + Grenzregionen (Vorarlberg, Elsass, Baden). | M |

---

## P5 — Standards & Interoperabilität *(für Fortgeschrittene)*

| ID | Aufgabe | Details | Aufwand |
|---|---|---|---|
| ASSO-UI | **ASSO-Beziehungen (Zeugen, Paten, Informanten)** | Schritt 1: Read-only Anzeige vorhandener `1 ASSO`-Blöcke in Personen-Detail (Rolle + verknüpfte Person). Schritt 2: Bearbeitung — Person als Zeuge/Pate/Informant zu einem Ereignis zuordnen, `1 ASSO`-Block schreiben + Roundtrip-stabil. | M+M |
| F6 | **Strict GEDCOM Export** | Alle `_`-Tags entfernen oder auf Standard-Tags mappen; Export-Modus im Einstellungs-Modal; ADR dokumentiert | M |
| GRAMPS-Edit | **GRAMPS-Attribute editierbar** | `_grampsAttrs[]` in Personen-/Familien-Formular anzeigen + editieren; `grampId` sichtbar | M |
| GRAMPS-RT | **GRAMPS-Writer vollständig + Roundtrip-Test** | `gramps-writer.js` auf Vollständigkeit prüfen: alle geparsten GRAMPS-Felder müssen zurückgeschrieben werden. Automatisierter Test: GRAMPS laden → exportieren → reimportieren → Delta auf 0. Besonderes Augenmerk: `_TASK`/`_RLOG` (kein GRAMPS-Pendant — als `attribute type="…"` oder Note schreiben?); FREL/MREL-Qualifiers. | M |
| ~~TEST-AUTO~~ | ~~**Standalone GEDCOM Roundtrip Test**~~ | `test.html`: lädt nur `gedcom.js` + `gedcom-parser.js` + `gedcom-writer.js` (kein UI, ~100ms); Drag-Drop für beliebig viele .ged-Dateien; parse→write→parse→write; Tabelle mit Personen/Familien/Quellen, net_delta, Stabilität, Zeit; aufklappbarer Diff bei Instabilität | - |
| OBJE-TYPE | **Medien-Typ strukturiert** ⚠ | `m._type` als Vendor-Extension (`2 _TYPE`); kein Standard-Tag in GEDCOM 5.5.1; ADR erforderlich vor Umsetzung | S |

---

## T0 — Technische Schulden *(kein Nutzer-Feature, aber Fundament für alles andere)*

| ID | Aufgabe | Details | Aufwand |
|---|---|---|---|
| ~~REFACT-1~~ | ~~**`parseGEDCOM()` in Sub-Parser aufteilen**~~ | Monolithische ~977-Zeilen-Hauptschleife in 5 Sub-Parser aufgeteilt: `_parseINDILine`, `_parseFAMLine`, `_parseSOURLine`, `_parseNOTELine`, `_parseREPOLine`; gemeinsamer Kontext-Objekt `x` (14 Felder) per Parameter übergeben; Hauptfunktion auf ~200 Z. geschrumpft; gleicher Input/Output, Roundtrip net_delta=0 stabil (sw v627) | - |
| ~~REFACT-2~~ | ~~**Datum-Parsing-Logik zentralisieren**~~ | Bereits erledigt: alle Datum-Funktionen (`normGedDate`, `normMonth`, `parseGedDate`, `buildGedDate`, `gedDateSortKey`, `gedDatePartToISO`) sind in `gedcom.js` zentralisiert; `gedcom-parser.js` speichert nur rohe Strings; UI-Dateien nutzen ausschließlich die Funktionen aus `gedcom.js`; `gramps-parser.js:_parseDateEl()` ist korrekterweise ein eigenständiger XML-Attribut-Parser. | - |

---

## Dokumentation

Handbuch-Pflege: kein Funktionsrelease nötig, aber separater Aufwand.

**Konvention:** Bei jedem Handbuch-Update wird der aktuelle sw-Stand im `HANDBUCH.html`-Deckblatt vermerkt (z. B. `Stand: sw v604`) und parallel in dieser Sektion notiert.

**Handbuch-Stand: sw v622** (aktualisiert 2026-05-18)

| ID | Aufgabe | Details | Aufwand |
|---|---|---|---|
| ~~DOC-SEARCH-ADV~~ | ~~**Handbuch Kap. 11: Erweiterte Suche**~~ | Abschnitt „Fehlende-Felder-Filter" ergänzen (sw v596) | - |
| ~~DOC-STATS~~ | ~~**Handbuch: Statistik-Kapitel**~~ | Neues Kapitel Statistik & Auswertung (sw v597) | - |
| ~~DOC-TREE-HEAT~~ | ~~**Handbuch Kap. 8: Vollständigkeits-Heatmap**~~ | Farb-Ringe in Sanduhr-Baum (sw v598) | - |
| ~~DOC-VAL-22~~ | ~~**Handbuch Kap. 13: Regelzahl korrigiert**~~ | 21 → 22 Regeln (sw v590) | - |
| ~~DOC-MAP-ANIM~~ | ~~**Handbuch Kap. 9: Animierter Migrationspfad**~~ | Animations-Leiste erklärt (sw v603) | - |
| ~~DOC-MAP-TOPBAR~~ | ~~**Handbuch Kap. 9: 🗺-Button in Diagramm-Topbars**~~ | 🗺-Button in Diagramm-Topbar-Tabelle ergänzt + eigener Unterabschnitt in Kap. 7 (sw v622) | - |
| ~~DOC-MEDIA-MGR~~ | ~~**Handbuch Kap. 18: Medien-Manager vollständig**~~ | Kap. 18 komplett überarbeitet: Galerie, Detailansicht, Referenz-Management, Suchpanel mit Lebensdaten (sw v622) | - |
| DOC-REL-CALC | **Handbuch Kap. 4: Beziehungsrechner** | Neuer Unterabschnitt unter „Abschnitte in der Detailansicht": (1) Verwandtschaft-Zeile zum Probanden mit gemeinsamem Vorfahren und Geburtsjahr; (2) „🔗 zu …"-Button für freien Zweipersonen-Vergleich; (3) Pfad-Modal: klickbare Karten-Kette, ⬡-Symbol für gemeinsamen Vorfahren, Hinweis auf mehrere Pfade (sw v626) | S |
| DOC-SCREENS | **Handbuch: echte Screenshots** | Alle Mockups in `HANDBUCH.html` durch echte Screenshots ersetzen. Priorität: Sanduhr-Baum, Fächer, Nachkommen-Baum, Zeitleiste, Karte (Migrations-Modus + Person-Modus + animiert), Personen-Detail, Ereignis-Formular. | M |

---

## Backlog / Forschung

Kein festes Datum. Kandidaten für spätere Versionen.

| ID | Aufgabe | Details | Aufwand |
|---|---|---|---|
| F8 | **Cluster-Ansicht** | Alle Personen in denselben Orten/Quellen wie Person X | L |
| GEDCOM-7 | **GEDCOM 7.0 Evaluierung** | FamilySearch-Standard; Parser/Writer-Anpassung; HEAD GEDC VERS 7.0 | L |
| F11 | **OCR** | Urkunden-Scan → Text; WASM-Tesseract oder LLM-Backend | XL |
| COLLAB | **Kollaboratives Editieren** | Konflikt-freies Merge zweier GEDCOM-Dateien (ähnliche Personen identifizieren, Delta anzeigen). Grundlage: DUP-DETECT + STAB-2. | XL |

---

*Aufwand: XS (<1h) · S (1–2h) · M (halber Tag) · L (1–2 Tage) · XL (>2 Tage)*
*Vollständige Sprint-Geschichte inkl. aller abgeschlossenen Items: CHANGELOG.md*
