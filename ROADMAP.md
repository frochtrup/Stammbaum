# Roadmap

Sprint-Geschichte aller abgeschlossenen Versionen: `CHANGELOG.md`

---

## App-Ziel

**Visuell-einsteigerfreundlich für ambitionierte Hobby-Genealogen.**

Zielgruppe: Ambitionierte Hobby-Genealogen, die **mobil** (Archiv, Feldarbeit: schnelle Erfassung, Forschungsaufgaben, Medien) und **am Desktop** (heavy use: Quellen, Auswertung, Ausgaben) arbeiten.

Fünf Dimensionen leiten die Priorisierung:
- **Stabilität** — Sicherheit, Roundtrip-Integrität, technische Schulden
- **Datenschutz** — Lokal-First, DSGVO-Konformität beim Export, keine Cloud-Pflicht
- **Mobil** — Schnellerfassung, Offline-Robustheit, Kamera-Integration
- **Forschungsqualität** — Protokoll, Quellenvorlagen, Validierung, Duplikate
- **Ausgaben** — Karten, Timeline, Story, Diagramme, Druckausgaben

---

## Aktueller Stand

| Version | Branch | Status |
|---|---|---|
| 4.0–7.0 | `main` | Abgeschlossen — Details: CHANGELOG.md |
| 8.0 | `v8-dev` | **Aktiv** |

**sw-Version:** v889 · Cache: `stammbaum-v889` · `test-unit.js` = 296 Tests grün · GEDCOM Roundtrip `net_delta=0` stabil · GRAMPS stabil

### Zuletzt abgeschlossen (v851–v889) — vollständige Details: CHANGELOG.md

| sw | Feature | Auswirkung |
|---|---|---|
| v889 | **View-Robustheit P6 — B6 Place/Source-Listen-Sync** — `showPlaceDetail` und `showSourceDetail` hatten — im Gegensatz zu `showDetail`/`showFamilyDetail` — **keinen** Listen-Highlight-Sync im Full-Render-Pfad. Folge: Klick auf einen anderen Ort in der placeList wechselt das Detail, aber `.current` blieb auf dem alten Eintrag stehen, bis der User den Tab erneut wechselte (dann griff der B3-Skip-Pfad). Neue Helper `_updatePlaceListCurrent(name)` + `_updateSourceListCurrent(id)` in ui-views.js (analog `_updatePersonListCurrent`); aufgerufen in `show*Detail` (Full-Render), `_dcAlreadyShows` (Skip-Pfad, ersetzt das vorige Inline-Pattern aus B3) und `_mobileSelectionRestore` (Dedup). | Listen-Highlight synchron zur Detail-Ansicht in allen 4 Tabs — sofort beim ersten Klick, nicht erst nach Tab-Re-Klick. |
| v888 | **View-Robustheit P6 — B5 Detail-Toolbar zentral** — `_configureDetailToolbar(tab, entityId)` neu in ui-views.js (~75 Z.): konfiguriert TopTitle + 8 Buttons (`editBtn`, `treeBtn`, `timelineBtn`, `storyBtn`, `probandBtn`, `probandSetBtn`, `detailMapBtn`) für jeden der 4 Skip-Pfad-Tabs (persons/families/sources/places). Die bisher in jeder `show*Detail` inline duplizierte Toolbar-Konfig (Z. 695-716 person, 395-407 family, 10-17 source, 924-930 place) → ein Helper-Aufruf. `_dcAlreadyShows` ruft den Helper jetzt auch im Skip-Pfad + `requestAnimationFrame(_updateDetailHistBtn)`. Architektonisch: A4-Container-Trennung + A5-Skip waren auf innerHTML-Re-Render-Vermeidung optimiert; Toolbar-State ist aber ein **Cross-Cutting-Effekt** zwischen allen Detail-Typen, der zentralisiert werden muss. | **Funktional kritischer** Fix: vorher zeigte die Toolbar nach Tab-Wechsel-Skip noch den State der vorigen Entität — `storyBtn`-Klick auf Personen-Detail rief `showFamilyStory(F1)` statt `showStory(I123)` etc. Jetzt sind alle 8 Buttons + TopTitle nach Skip korrekt verdrahtet. |
| v887 | **View-Robustheit P6 — B4 has-detail im Skip-Pfad** — direkter Folge-Fix zu v886: `_dcAlreadyShows` setzt jetzt zusätzlich `body.has-detail = true` + `AppState._detailActive = true` im Skip-Pfad. `showDetail`/`showFamilyDetail`/etc. rufen am Ende `showView('v-detail')` auf, was diese Flags setzt — der CSS-Schalter für den `desktopPlaceholder` ("Eintrag in der Liste auswählen"). Im Skip-Pfad entfällt dieser Aufruf, sodass der Placeholder oben im scrollbaren v-detail sichtbar blieb und das eigentliche Detail erst beim Runterscrollen erschien. Gleiche Bug-Klasse wie B3 (vergessenes Seiteneffekt-Mitziehen bei A5-Skip), nur für body-Klassen statt Liste. | Detail-Inhalt erscheint direkt sichtbar nach Tab-Wechsel zurück; kein "Void"-Placeholder-Artefakt mehr im Detail-Fenster. |
| v886 | **View-Robustheit P6** — drei Tab-Wechsel-Konsistenz-Bugs nachgezogen, die das P0–P5-Refactoring strukturell offengelassen hatte. B1: `showView` nutzt `querySelectorAll('.view.active')` statt `querySelector` — Desktop hält v-main + v-tree/v-detail gleichzeitig active (ADR-009), der R1-Direkt-Swap deaktivierte aber nur die *erste* aktive View → v-tree blieb nach Tab-Wechsel sichtbar. B2: `showTree`/`showDescTree` schreiben jetzt via `ViewState.setCurrent('persons', personId)` statt direkt `AppState.currentPersonId` — Baum-Navigation ist implizite Personen-Selektion, P2-A1 hatte diesen Schreibpfad übersehen. B3: `_dcAlreadyShows` synchronisiert die linke Liste auch im Skip-Pfad (`_updatePersonListCurrent`/`_updateFamilyListCurrent`/Source+Place-Highlight) — P5-A5 hatte den Listen-Sync zusammen mit dem Detail-Re-Render herausoptimiert. `_vsReattach` liest `ViewState.getCurrent` statt `AppState.currentX` (Letzteres ist exklusiv genullt). | Drei Klassen von Tab-Wechsel-Glitches behoben: Baum bleibt sichtbar bei Wechsel in andere Tabs (Desktop), falscher Fokus nach Baum-Navigation, Liste an falscher Position nach Skip-Re-Render. |
| v869 | **View-Robustheit P5** — A4: 5 separate Detail-Container (`detailPerson/Family/Place/Source/Media`) statt einem `#detailContent`; `_activateDetailContainer(cid, entityId)` mit Scroll-Save/Restore (per-Entität-Scroll-State auf Desktop). A5: `data-view-init`-Flag — `_desktopAutoSelect` überspringt Re-Render wenn Container bereits die richtige Entität zeigt und Tab nicht dirty. | Tab-Wechsel (Person→Familie→zurück) ohne innerHTML-Reset; Scroll-Position pro Entität erhalten; Bug-4-Klasse strukturell beseitigt. |
| v868 | **View-Robustheit P4** — R1: `showView` direkter View-Swap (1–2 DOM-Ops statt N, weniger Layout-Flash iOS); R2: `switchTab` ruft `_vsTeardown` für inaktive VS-Listen (_vsP/_vsF); R3: `_navHistoryCap()` — `_navHistory` auf 50 Einträge begrenzt; R4: `_initDetailSwipe` bereits idempotent; R7: alle `setTimeout`-Magic-Delays → `_afterLayout` (2× rAF). SW: `ui-book/print/dedup.js` bereits in PRECACHE_OPTIONAL. | Scroll-Listener-Leak bei Tab-Wechsel behoben; unbegrenztes navHistory-Wachstum gestoppt; Layout-Konsistenz verbessert. |
| v867 | **View-Robustheit P3** — A2: `markChanged()` setzt `UIState._dirty` für alle Daten-Tabs; `switchTab()` rendert nur wenn `_dirty[tab] !== false` (dirty oder nie besucht). A3: neues `ui-lifecycle.js` — `visibilitychange` mit >60-s-Heuristik (alle Tabs dirty), `pageshow` mit BFCache-Reload-Guard, `pagehide` mit `_persistLastTabSel`-Flush. | Unnötige Re-Renders bei Tab-Wechsel ohne Edit eliminiert; BFCache-Inkonsistenz verhindert; saubere Trennung Lifecycle vs. View-Routing. |
| v866 | **View-Robustheit P2** — `ViewState` IIFE (A1, ADR-025): `setCurrent(tab,id)` (IDB-persistent, exklusiver Fokus, `viewstate-change`-Event) + `getCurrent(tab)` (Existenz-Validierung). Alle 4 `show*Detail`-Funktionen: 5-Zeiler (AppState.currentX + _lastTabSel + persist) → `ViewState.setCurrent`. `_desktopAutoSelect` + `_mobileSelectionRestore` → `ViewState.getCurrent`. | Parallele Buchführung `AppState.currentX` + `UIState._lastTabSel` konsolidiert. Basis für ADR-025 + P3. |
| v865 | **View-Robustheit P1** — K4 Mobile-Selektions-Restore (`_mobileSelectionRestore`); K5 `_desktopAutoSelect`-Validierung (verlorene IDs → Fallback); K6 `_lastTabSel` IDB-persistent (`idbPut/idbGet 'last_tab_sel'`); K7 `showStartView` lädt savedSel + ruft `_desktopAutoSelect('persons')`; R6 `showDetail`/`showFamilyDetail`/`showPlaceDetail`/`showSourceDetail` bei fehlendem Entity → `showMain()` statt lautlosem `return`. | Behebt Bugs 3+4: Mobile-Highlight nach Tab-Tipp; verlorene ID nach Merge/Delete = leere View; `_lastTabSel` überlebt iOS-Process-Kill; Desktop-Startansicht nicht leer. |
| v864 | **collectPlaces po-Pass: po gewinnt IMMER (auch null)** — Item-9-Konsequenz vollständig: wenn placeId vorhanden, überschreibt po.lat/long *auch wenn null* die ev.lati/long aus `addPlace()`. | Behebt Folgebug von v863: trotz erfolgreichem Koord-Löschen blieb in der Detail-Anzeige die alte Koord stehen (kam aus dem Event-Datensatz, nicht aus dem po). |
| v863 | **Koord-Löschen via leeren Feldern** — savePlace/saveNewPlace Tri-State: beide Felder leer → Koord wird auf null gesetzt (löschen); gültiges Paar → setzen; unvollständig → bestehende Koord unverändert + Warntoast. | Behebt „Koordinate eines Ortes lässt sich nicht mehr löschen" — bisheriger `if (lati != null)`-Update überschrieb null nicht |
| v862 | **Koord-Paar-Invariante** — savePlace/saveNewPlace verhindern halbe Koord-Paare (lat ohne long) durch Toast + beide null; showPlaceDetail/collectPlaces/renderPlaceList prüfen beide Achsen; einmalige Migration in `_migratePlaceObjects` setzt halbe Bestands-Paare auf null. | Behebt „Ort in Liste nicht klickbar" — `place.long.toFixed` crashte auf null wenn User Koords in DMS ohne Direction eingab |
| v861 | **View-Robustheit P0** — Mobile `v-detail.scrollTop=0`-Reset (K1); `visibilitychange`-Handler für PWA-Resume (K2); `renderTab()` in 6 Form-Save-Pfaden (savePerson/transferEvent/saveEvent/deleteEvent/saveFamEvent/deleteFamEvent) (K3); `_lastFilteredPersons` in `markChanged()` invalidiert (R5). | Behebt „Void/Artefakt nach iOS-Tab/App-Wechsel" + „Listen-Stale nach Edit". Detail-Plan: VIEW-ROBUSTNESS.md |
| v859–v860 | **UX-Polish Orte-Tab** — Lösch-Button vom Anfang ans Ende der Detail-Steckbrief verschoben; Geocodieren/Verknüpfen auf `btn-ghost`-Style umgestellt; neue CSS-Klassen `.place-action-row`/`.place-delete-row`/`.btn-ghost-danger`/`.tran-add-btn`. | Steckbrief-UX dezenter — primärer Lese-Fluss steht im Vordergrund |
| v858 | **OneDrive Konflikterkennung** — `stammbaum-orte.json` mit Wrapper `{schemaVersion,_rev,_device}`; Union-Merge + Warn-Toast bei Gerätekollision; backwards-kompat. (Item 10) | Kein last-write-wins-Datenverlust bei Multi-Device |
| v857 | **Koords Single Source of Truth** — `_eventCoords(ev)` primär aus placeObjects; `_propagateCoordsToEvents` gelöscht; +8 Tests (s) | po.lat-Änderung sofort überall sichtbar |
| v856 | **UX-Quickwins** (Items 11–14) — Validator-Badge auf ⚠, Toast-once bei Speicherfehlern, GOV-Platzhalter-Toast, Merge-Modal Origin-Pille | |
| v855 | **JSON-Import-Dedup** — `_mergePlaceObjectsFromImport` title-basiert; kein Duplikat beim Re-Import; +20 Tests (r) (Item 15) | Beseitigt Hauptursache von Orts-Dubletten |
| v854 | **extraPlaces eingefroren** — placeObjects = single source of truth; Schreib-Pfade nur noch auf placeObjects; GEDCOM-Writer liest pnames/lat primär; +5 Tests (q) (Item 7) | Cross-Datei-Konsistenz hergestellt |
| v853 | **mutatePlaceObject/upsertPlaceObject** — zentraler Mutations-Helper verriegelt 4-Schritt-Ritual; +14 Tests (p) (Item 8) | Vergesser-Bugs der v847-Klasse strukturell unmöglich |
| v852 | **Test-Härtung** — Identity Cross-Path, mergeStringPlaces Edge-Cases, epId-Determinismus; geocoding.js im Harness; +37 Tests (m/n/o) | 247 → neue Baseline |
| v851 | **Robustheit-Block** — `_normPlaceName` überall; Bugs B1/B2/B3/B11 behoben; +12 Tests (l) | Identity-Matching kanonisch |
| v844–v849 | **OneDrive-Picker-Fixes** — Ordner-Pfad via `folder.id`, `_odResetModes()`, korrekter Breadcrumb | |
| v829–v843 | **String→PlaceObject Link** — `_buildFormString`, `applyStringPlaceLink`, Reimport-Erkennung, GOV-Platzhalter-Auflösung | |
| v820–v822 | **PLACE-HIST P5a/d/e** — Ort-Steckbrief, Geo-Validator, Story-Kontextsatz | |

**Vollständige Sprint-Geschichte seit v796:** CHANGELOG.md

**Roundtrip:** GEDCOM net_delta=0, out1===out2 ✓ · GRAMPS xml1===xml2 ✓ · beide headless automatisiert (`test-roundtrip.js`)
**Testdaten:** MeineDaten_ancestris.ged (2811 Pers.) · Unsere Familie.gramps (2894 Pers.)

### Gesamtbewertung — zuletzt überarbeitet 2026-06-06

> **Methodik:** Nüchterne Standortbestimmung, kein Verkaufsprospekt. Noten basieren auf direkter Code-Prüfung und Browser-Verifikation. **Baseline 2026-05-31:** 161 Unit-Tests + GEDCOM-Roundtrip + CSP/OAuth live getestet. **Fortschritt bis 2026-06-07:** PLACE-HIST vollständig (ADR-024 🟢), View-Robustheit P0–P5 ✅ (ADR-025 🟢), 296 Unit-Tests, CSP lückenlos.

| Bereich | Note | Kernbefund |
|---|---|---|
| Architektur | 6.8/10 | Saubere Schichtung + **25 ADRs** + Passthrough-Fundament. `ViewState` (ADR-025) + `ui-lifecycle.js` schließen PWA-Lifecycle-Lücke. **~860 top-level Funktionen** in flachem Namespace bleiben die Hauptschuld; Modul-Migration bewusst zurückgestellt (ADR-020). |
| Code-Qualität | 7.2/10 | Lesbar, kein Overengineering, gute „Warum"-Kommentare. `showDetail` von ~294 auf ~1 Zeile Boilerplate reduziert (→ `ViewState.setCurrent`). **Abzug:** `_attr` 486 Z., `_parseINDILine` 388 Z. bleiben. |
| Sicherheit | 8.5/10 | CSP ohne `unsafe-inline/eval` + `test-csp.js` ✅; OAuth PKCE S256 + CSRF-`state`; kein `eval`; `esc()` pervasiv. **Abzug:** Refresh-Token in `sessionStorage` (Restrisiko, ohne Backend alternativlos). |
| Design / UX | 8.5/10 | Hochwertige Ästhetik (Playfair/Source Serif, Dark/Light-Parität), Mobile-First, Onboarding, Skip-Link/ARIA/`prefers-reduced-motion`. **Abzug:** „WCAG 2.1 AA" ohne axe-Audit; Handbuch noch mit Mockups. |
| Funktionsstand | 9.0/10 | Undo/Redo · Karten-Animation · Evidenzmodell · GPS-Hypothesen · GED7 · GRAMPS · ASSO-Edit · Verwandtschaftsrechner · Nominatim-Geocoding · GOV-Import (historisch datiert) · Ort-Steckbrief + Validator · Multi-Device-Konflikterkennung. **Abzug:** Ausgabe-Reichtum < MFT; DNA/Online-Matching bewusst out-of-scope. |
| Funktions-Qualität | 8.2/10 | GEDCOM/GRAMPS-Treue exzellent; UI-Flows Browser-verifiziert. View-Robustheit P0–P5 behebt iOS-PWA-Bugs (Void-Artefakte, stale Listen, leere Starts) + per-Entität-Scroll-State. **Abzug:** Skalierung >10k Personen ungetestet. |
| Performance | 8.0/10 | Web Worker + virtuelles Scrollen O(log n) + LAZY-LOAD (−119 KB) + SW-Cache. dirty-bit verhindert unnötige Re-Renders. ~45 Cold-Start-Requests (HTTP/2 + SW gemildert). |
| GEDCOM-Konformität | 9.3/10 | `net_delta=0` + `out1===out2` auf 83k-Zeilen-Produktionsdatei, Strict-5.5.1 sauber. GED7-opt-in + GRAMPS-Roundtrip automatisiert. |
| **Tests** | **8.0/10** | GEDCOM + GRAMPS-Roundtrip headless automatisiert. **296 dep-freie Unit-Tests** (Validator, Parser, BFS-Anonymisierung, Evidenz/Hypothesen, Datums-Helfer, PlaceRegistry, Geocoding, Merge, Migration). **Verbleibend:** keine UI-Logik-Tests; eigenes Harness statt Framework. |
| Dokumentation | 9.0/10 | **25 ADRs** + Datamodel + ~2.2k-Z.-Changelog + Handbuch (sw v858, veraltet). **Abzug:** Screenshots noch Mockups; Handbuch v859–v869 ausstehend. |
| PWA / Offline | 9.2/10 | PRECACHE_CRITICAL (atomar) + PRECACHE_OPTIONAL (`allSettled`); Network-first + 4s-Timeout; `ui-lifecycle.js` mit BFCache-Guard + >60-s-Resume-Heuristik. |
| Datenschutz | 8.5/10 | Lokal-First ✓ · DSGVO-Anonymisierung BFS ✓ (v715) · kein Datamining, kein Cloud-Zwang. |
| **∅ Gesamt** | **≈ 8.4/10** | *Solide, funktionsreich; GEDCOM/GRAMPS-Treue, Sicherheit, Testabsicherung und Orts-Handling auf gutem Niveau. View-Robustheit P0–P5 schließt iOS-PWA-Lifecycle-Lücken + per-Entität-Scroll-State. Größte verbleibende Hebel: (1) Monsterfunktionen zerlegen, (2) ggü. MacFamilyTree: Ausgabe-Reichtum + Skalierung >10k.* |

---

## Design-Constraint

Alle neuen Features müssen den GEDCOM 5.5.1 Roundtrip (`out1===out2`, `net_delta=0`) stabil halten. Neue Datenstrukturen dürfen beim GEDCOM-Export keinen zusätzlichen Delta erzeugen — entweder als Passthrough oder als bekannte, dokumentierte Abweichung. Jede Abweichung muss explizit entschieden und in `ARCHITECTURE.md` (ADR) dokumentiert werden.

---

## Abgeschlossen in v8-dev *(seit v650 — vollständig: CHANGELOG.md)*

| ID | Feature | sw |
|---|---|---|
| STORY-OPT | Story: Textqualität (OCCU-Merge, Epochen, Berufsverbindungen) | v638–v644 |
| STORY-DIAGRAM | Story: Inline-SVG Ahnentafel | v645 |
| STORY-PRINT | Story: Print-CSS A4, `@media print` | v646–v647 |
| WW-PARSER | Web Worker für GEDCOM-Parse + Fortschrittsbalken | v649 |
| TL-MULTI | Zeitleiste Mehrpersonen-Modus (2–5 Personen, Farb-Chips) | v665 |
| PRINT-OUT | Ahnenliste (Kekule) + Familienbogen als HTML-Download | v669 |
| DEDUP-ENH | Duplikat-Erkennung ausgebaut (Feldauswahl, Scoring, Suchfeld) | v670–v683 |
| IMPORT-CMP | Datei-Vergleichs- & Merge-Assistent | v673–v682 |
| CSP-FINAL | CSP vollständig: alle Inline-Handler durch Event-Delegation | v686–v690 |
| SEARCH-QA | Komma-Normierung Namen + Quellen-Zwischenablage | v691 |
| T0-REFACT-3 | Große Dateien aufgeteilt (Phase A/B/C) | v696–v697, v714 |
| T0-TYPES | JSDoc-Typen für 12 Kern-Datenstrukturen | v698 |
| ASSO-DISP | ASSO-Beziehungen anzeigen (Paten, Zeugen) | v698+ |
| CSV-EXPORT | CSV-Export Personen- und Familienliste (gefiltert, BOM) | v699 |
| OFFLINE-DIAG | Offline-Indikator im Header + Cache-Check | v699 |
| LIGHT-MODE | Light-Mode Parity: Kontrast, Leaflet, Schatten | v700 |
| VAL-RULES-2 | Validierung: +3 Regeln (PLACE_INCONSISTENCY, MISSING_QUAY, MANY_CHILDREN) | v701 |
| VAL-CONFIG-TOGGLE | Val-Config: Alle/Keine-Toggle + fehlende Checkboxen | v702 |
| BUG-704 | 6 Bugfixes (Hof-Cache, Baum-Reste, Elternkachel, Fächersymbol …) | v704 |
| STORY-FAM | Story-Mode für Familien | v713 |
| HOTFIX-CMP | `compare-engine.js` in index.html eingebunden (ReferenceError-Fix) | v714 |
| F5 | DSGVO: Lebende-Anonymisierung beim GEDCOM-Export (BFS-Propagation, `_anon`-Suffix) | v715 |
| GRAMPS-RT | GRAMPS-Roundtrip vollständig: `_RLOG`/`_TASK` Parser+Writer (Pers.+Fam.); Roundtrip-Tests ausgebaut | v737–v738 |
| GRAMPS-EDIT | GRAMPS-Sektion in Formularen: `grampId` (read-only), `_grampsAttrs[]` editierbar, `_grampsTags[]` Chips | v739 |

---

## Priorisierung — überarbeitet 2026-05-31 (nach Re-Verifikation)

Das Test-Sicherheitsnetz und das Modul-Fundament (Pilot) sind erledigt; die Re-Verifikation 2026-05-31 hat **zwei neue, konkrete Engpässe** sichtbar gemacht, die jetzt vor neuen Features stehen:
- **CSP-Durchsetzung ist lückenhaft** (Doku behauptete „vollständig"). Tote inline-`on*`/`style=` → CSP-DURCHSETZUNG (s. P0).
- **Architektur-Schuld größer als berichtet** (844 Funktionen, 486-Z.-Funktion) → die Monsterfunktionen sind der konkrete Hebel, nicht die Voll-Modul-Migration.

**Reihenfolge:**
1. ✅ **P0 — Test-Sicherheitsnetz** (T0-TEST-2, T0-UNIT): GEDCOM+GRAMPS-Roundtrip automatisiert + 161 Unit-Tests. Regressionsabgesichert.
2. ✅ **P0 — Modul-Fundament-Pilot** (T0-MODULE Phase 1+2): ADR-020 + GRAMPS-/Validator-Cluster als ES-Module. Phasen 3–4 **bewusst zurückgestellt** (Begründung unten).
3. **P0 — CSP-Durchsetzung verifizierbar machen** *(neu 2026-05-31)*: ① ✅ inline-`onclick` entfernt (v794); ② tote inline-`style=` → CSS-Klassen (CSP-DURCHSETZUNG); ③ CSP-Report-Only-Selbsttest, damit „CSP vollständig" *belegt* statt behauptet ist. **Kleiner Aufwand, schließt einen echten Funktions-/Robustheits-Bug-Typ.**
4. **P1 — gezielte Architektur-Entschärfung**: die 3–4 größten Funktionen (`_attr`, `_parseINDILine`, `showDetail`, `writeINDIRecord`) zerlegen — unabhängig vom Modulsystem, größter Wartungs-Hebel.
5. **P2+** — Features. **Zielgruppen-Hebel ggü. MacFamilyTree** (s. Vergleich): Ausgabe-Reichtum (PDF-Bücher/Poster), Skalierungstest >10k, Orts-Geocoding, Kamera (mobil).

### Architektur-Entscheidung: ES-Modul-Phasen 3–4 zurückgestellt (Mai 2026)

**Kontext:** Nach Phase 1+2 (GRAMPS + Validator) standen als nächste Schritte Kern-Migration (`gedcom.js` + GEDCOM-Parser/Writer + `storage-file.js`) und danach UI-Cluster + Bundling.

**Gemessene Blocker für Phase 3:**
- `gedcom-worker.js` lädt den Parser via **`importScripts()`** — das kann keine ES-Module laden. Ohne Web-Worker-Umbau (`{type:'module'}` + Refactoring) kann `gedcom-parser.js` nicht auf `export` umgestellt werden.
- `idbGet` aus `storage-file.js` wird von **13 Dateien** genutzt — Kern zu Modul machen erzeugt Kaskade durch fast alle Konsumenten.
- `gedcom.js` hat **59 top-level Symbole** — eine handgeschriebene Brücke mit ~59 Einträgen ist fragil.

**Kernfrage: lohnt ein Build-Step (esbuild/Rollup)?**
Analysiert auf zwei Ebenen:
- **Nutzer-Seite:** kaum spürbar. PWA-Cache macht den Warmstart sofort; LAZY-LOAD hat die größten Kaltstart-Gewinne bereits geholt. Offline-PWA, lokal-first, kein Datamining — all das ist Laufzeit, unberührt vom Build.
- **Entwickler-Seite:** der eigentliche Handel. Ein Build-Step beseitigt die 762-Globals-Schuld und ermöglicht Tree-Shaking — aber er bricht **ADR-001/002** (kein npm, kein Build, Datei editieren & neu laden, vom iPad editierbar). Mit npm + `node` + Build/Watch-Prozess entfällt die bewusst gewählte „edit-anywhere"-Eigenschaft.

**Entscheidung:** Build-Step wird **nicht eingeführt**. Begründung: Das Projekt ist stabil und funktionsreich (∅ 8.0). Die Schulden sind *entschärft* — `_`-Konventionen + Testabsicherung (Roundtrip + 161 Unit-Tests) fangen die Risiken ab, gegen die Module schützen würden. *(Re-Verifikation 2026-05-31: Entscheidung bestätigt; konkreter Hebel ist T0-FUNC-SPLIT, nicht die Voll-Migration.)* Den größten verbleibenden Gewinn (explizite Imports, Wegfall der Brücken) gibt es erst *mit* Bundler — zu diesem Preis ist er für dieses Solo-Projekt nicht rechtfertigbar.

**Phasen 3–4 im Backlog** (ES-MODULE-Eintrag). Trigger für Wiederaufnahme: Codebase wächst stark (neue Cluster, weitere Mitwirkende) oder Namespace-Kollisionen treten konkret auf. Die zwei vorhandenen Brücken (GRAMPS, Validator) sind stabil und harmlos.

---

## Forschungstiefe — Ausbauplan (Mai 2026)

**Ziel:** die Dimension *Forschungsqualität* (s. App-Ziel) vom „gut" (RLOG, Tasks, Validierung, Dedup) zum *durchgängigen Forschungs-Workflow* ausbauen — die ehrliche Lücke vs. GRAMPS im professionellen Quellen-/Forschungsworkflow schließen, **ohne** die Kernstärke (verifizierte GEDCOM-Treue, lokal-first) zu opfern.

**Leitender Constraint (s. Design-Constraint):** Jede neue persistierte Struktur ist *entweder* ein `_`-Tag mit Writer-Support (reist mit der Datei, GEDCOM+GRAMPS — Muster `_RLOG`/`_TASK`) *oder* ein App-privater IDB-Store + JSON-Export (Muster `quick_templates`, kein Roundtrip-Risiko). Diese Wahl wird pro Feld explizit getroffen.

**Kern-Einsicht:** Die Features sind keine Inseln, sondern eine Pipeline:
`Dashboard (Lücke) → Aufgabe → Protokoll + Foto → Quelle + Bewertung → Hypothese → Auflösung → Dashboard (grün)`.
Deshalb zuerst die Pipeline-Endpunkte (Dashboard + Quellenbewertung), die allem anderen Bedeutung geben.

| Phase | ID | Inhalt | Speicherung | Status |
|---|---|---|---|---|
| **1** | **RES-DASH** | **Konflikt- & Qualitätsdashboard + Lückenradar** — Ampel pro Person (Validator-Aggregat), Vollständigkeits-Score, 6 Lückenradar-Balken, Brennpunkt-Liste, Lücke→Aufgabe (einzeln + „+ alle") | *(keine — reine Präsentation)* | ✅ **Abgeschlossen sw v772** |
| **2** | **RES-EVAL** | **Quellenbewertung (Evidenzmodell)** — 3 Achsen je Zitat: Quellentyp (Original/Abschrift/Autorenwerk) · Information (primär/sekundär) · Evidenz (direkt/indirekt/negativ); „Informant" via ASSO-Rolle. **+ Repository-Rest:** Archivtyp, Findbuch-URL. Speist Dashboard (Schwach-Quellen-Flag). | `citation.eval` als `_EVAL`-Tag (ADR-022) | **✅ vollständig sw v777 (2a–2e)** |

**RES-EVAL Teilschritte (2a–2e ✅ sw v773–v777):** Evidenzmodell `citation.eval` (3 Achsen) als `_EVAL`-Tag (ADR-022, modelliert/kein Doppel-Schreiben) · `⚖`-UI je Zitat + „→Q"-QUAY-Übernahme · Regel `MISSING_EVAL` (default-aus, opt-in) + Dashboard-Balken · GRAMPS-`<attribute>`-Serialisierung · Repository-Rest (Archivtyp + Findbuch-URL). Verifiziert: GEDCOM `net_delta=0` + GRAMPS-Roundtrip + Unit-Tests. *(Voll-Detail: CHANGELOG + ADR-022.)*
| **3** | **RES-PROJ** | **Forschungsprojekte + Kanban + Research-Timeline** — Projekte gruppieren Tasks/Log (Scope: Linie/Ort/Zeitraum); Tasks `status` statt nur `done` → Kanban; `_rlog` nach Datum als Aktivitäts-Timeline | Projekte: IDB+JSON · Task-`status`: am `_TASK` | **✅ vollständig sw v780 (3a–3c)** |

**RES-PROJ Teilschritte (3a–3c ✅ sw v778–v780):** Task-`status ∈ {todo,doing,done}` (Invariante `done===status==='done'`) + Kanban-Board (mobil tap-to-advance, kein DnD-Lib), `_TSTAT`-Serialisierung · Projekte (IDB+JSON, Membership **berechnet** via `_projectMatches` → kein Dangling) mit projekt-skopiertem Dashboard/RLOG · Research-Timeline (`_renderRlogTimeline`, farbcodierte Ergebnis-Knoten). **CSP-Lehre:** Farben als feste Paletten-Klassen `pc0–pc5`, kein `style=""` (ADR-015). *(Voll-Detail: CHANGELOG.)*
| **4** | **RES-HYPO** | **Hypothesen-System (leichte Variante)** — statusbehaftete Annotation (offen/verworfen/bestätigt) an Person/Familie, verlinkt auf Evidenz, mit Gewichtung. **Bewusst KEIN** Alternativ-Baum-/Zwei-Schichten-Modell (wäre v9-Neuarchitektur, bricht Roundtrip-Einfachheit). | `_HYPO` als `_`-Tag (ADR-023) | **✅ vollständig sw v784 (4a–4e)** |

**RES-HYPO Teilschritte (4a–4e ✅ sw v781–v784, ADR-023):** `_hypotheses[]` auf INDI/FAM (`{id,text,status,weight,rationale,conclusion,evidence[],created}`, **Evidenz = SID-Ref** → kein Dangling) als `_HYPO`-Subtree (modelliert) + GRAMPS-JSON-`<attribute>` · UI-Sektion + `modalAddHypo` in Person- und Familiendetail · Regel `OPEN_HYPO` (default-aus) + Dashboard-Balken · **GPS-Beweisführungs-Panel** (Genealogical Proof Standard: Quellenlage/bestätigte Schlüsse/offene Fragen/verworfene Annahmen). **Bewusst KEIN** Alternativ-Baum (wäre v9, bräche Roundtrip-Treue). Verifiziert: GEDCOM `net_delta=0` + GRAMPS-Roundtrip + 161 Unit-Tests. *(Voll-Detail: CHANGELOG + ADR-023.)*
**Forschungstiefe-Ausbauplan P1–P4 damit vollständig abgeschlossen.**

**Ergänzungen (in die Phasen eingebettet):**
- **GPS-/Beweisführungs-Notiz** pro Person (Genealogical Proof Standard) — bündelt Quellen + Hypothesen zum Argument; natürliches Ziel von Phase 4.
- **Zitat-Gesundheit** („braucht Arbeit"-Flag, z. B. Bewertung fehlt) → fließt ins Dashboard (Phase 2).
- **Citation-Text-Generierung** (Evidence-Explained-Stil) — später auf QUICK-TPL-Infrastruktur (Backlog).

**Bewusst draußen:** echtes Zwei-Schichten-Evidenzmodell + Alternativ-Baum-Motor (opfert die verifizierte Roundtrip-Treue — Kernstärke) · Multi-User/Kollaboration (lokal-first, s. Backlog COLLAB).

---

## Ortstiefe — Ausbauplan (PLACE-HIST, Mai 2026)

**Ziel (Nutzer):** Geocoding/Ortshandling verbessern — **historische Dimension** von Orten erfassen (Name & Verwaltungszugehörigkeit über Zeit), Orte **verlustfrei normalisieren**, **typisierte Event-Orte** (Kirchen/Pfarreien/Friedhöfe) neben der RESI/PROP-Hof-Historie nutzbar machen, ortsbezogene Auswertungen erweitern. **Harte Vorgabe: keine userspezifischen Tags** (Roundtrip-Schutz). Architektur-Entscheidung: **ADR-024** · technisches Detail-Design: **`PLACE-REDESIGN.md`**.

**Leitidee:** `db.placeObjects` (existiert, roundtript nativ über GRAMPS `<placeobj>`) zum durchgängigen **Ort-Master** ausbauen — ausschließlich über **Standard-GRAMPS-Konstrukte** (datierte `<pname>`/`<placeref>` mit `<daterange>`, `<url>`), kein `_`-Tag. GEDCOM-Export kollabiert die Zeitachse verlustig zum periodenkorrekten PLAC-String (`resolveAsOf`) + Koordinaten (by design, GRAMPS = Master). Konsolidiert nebenbei `extraPlaces` (localStorage) in `placeObjects`.

**Roundtrip-Risiko #1 (vor Code klären):** `pname`/`placeref` stehen in `_PLACE_MODELLED` → Writer baut sie aus dem Modell neu. Liest der Parser die `<daterange>`-Kinder nicht, gehen sie verloren. Daher zuerst Mini-`.gramps`-Fixture mit datiertem pname durch `test-roundtrip.js` (PLACE-REDESIGN.md §3.0); `_dateRaw`-Verbatim als Absicherung; **net_delta=0 auf `Unsere Familie.gramps` = Pflicht-Akzeptanz.**

| Phase | Inhalt | Speicherung | Status |
|---|---|---|---|
| **P0a-1** | **Zeitachse Parser/Writer** ✅ *(sw v796)* — datierte `<pname>` → `pnames[].{dateFrom,dateTo,dateType,_dateRaw}`; **mehrere** datierte `<placeref>` → `enclosedBy[]` (neben `parentId`). HYBRID: strukturierte Felder + `_dateRaw` verbatim (erhält Zusatz-Attribute wie `type="from"`). `_grampsPlaceDateOf`/`_grampsPlaceDateXML`-Helfer. **Verifiziert:** real `Unsere Familie.gramps` 29/29 Orts-Datumselemente + 8/8 verbatim-Attrs erhalten, counts=ok/stable; GEDCOM net_delta=0; +6 Unit-Tests (167 total, neue GRAMPS-Gruppe (h) in test-unit.js inkl. portiertem MiniDOMParser). | GRAMPS-Standard (kein `_`-Tag) | ✅ erledigt |
| **P0a-2** | **`PlaceRegistry`** ✅ *(sw v797)* — `getPlaceRegistry()` in gedcom.js (`byId`/`byNorm`/`findByName`/`resolveAsOf`/`enclosureChainAsOf`, `_normPlaceName` NFC+casefold nur fürs Matching → verlustfrei) + `_migratePlaceObjects` (`parentId→enclosedBy` für Altdaten, idempotent, in `setDb` verdrahtet + Cache-Invalidierung). +13 Unit-Tests (180 total); Roundtrip net_delta=0/stable unverändert. | reine App-Logik | ✅ erledigt |
| **P0b-1** | **Entität-Verknüpfung (additiv)** ✅ *(sw v798)* — `collectPlaces()` mischt je String-Ort additiv `placeId` (via `PlaceRegistry.findByName`) + `type` + fehlende Koordinaten aus dem `placeObject` ein; **String-Key unverändert** → kein Ripple bei den 8 Consumern. Ort-Detail zeigt **Typ**, **Zugehörigkeitskette** (`enclosureChainAsOf`) und **frühere Namen** (datierte `pnames`). Render-/roundtrip-neutral für GEDCOM-Daten ohne placeObjects. +5 Unit-Tests (185). | reine App-Logik | ✅ erledigt |
| **P0b-2a** | **Dubletten-Erkennung + Merge-Kern** ✅ *(sw v799)* — `findPlaceDuplicates()` (Fold-Key `_placeFold` Umlaut-Faltung + Koordinaten-Nähe via Haversine, union-find-Cluster) + `mergePlaceObjects(winner, losers[])` (Schreibweisen→`pnames[]` verlustfrei, `enclosedBy` vereinigt, **alle `ev.placeId` + parent/enclosedBy umgehängt**, Verlierer gelöscht). Headless, +13 Unit-Tests (198). | reine App-Logik | ✅ erledigt |
| **P0b-2b** | **Merge-Dialog (UI)** ✅ *(sw v801)* — Orte-Tab: ⇉-Button öffnet `modalPlaceMerge`; pro Dublettengruppe Radio-Auswahl des Hauptorts (Vorschlag = meiste Event-Verwendungen, dann meiste pnames) + „Zusammenführen". `openPlaceMergeModal`/`_renderPlaceMergeList`/`placeMergeGroup`/`_placeUsageCounts` (ui-views-place.js), `_CLICK_MAP`-Einträge, Modal+Button (index.html), `.place-merge-*` (styles.css). Ruft `findPlaceDuplicates`/`mergePlaceObjects` (P0b-2a); CSP-safe (data-action). **Browser-verifiziert** (preview: Modal rendert, München-Vorschlag, Merge → Verlierer gelöscht, beide Schreibweisen als pname erhalten, ev.placeId umgehängt, Liste neu „Keine Dubletten", 0 Console-Errors). | UI | ✅ erledigt |
| **P0b-3** | **`extraPlaces` → `placeObjects`** ✅ *(sw v807)* — `_migrateExtraPlacesToPlaceObjects` (gedcom.js): beim Laden wird jedes `extraPlaces`-Objekt mit Koordinaten oder Übersetzungen idempotent in `db.placeObjects` überführt (`_epId` djb2-Hash → stabile ID `_ep_XXXXXXXX`; vorhandene placeObjects werden additiv ergänzt, neue angelegt). Aufruf in `setDb` + nach `loadExtraPlaces`+parsedPlaceTrans-Merge (GEDCOM) + nach GRAMPS-Load (storage-file.js). Writer (`gedcom-writer.js`): `_writePlacTrans` + `geoLines` lesen placeObjects via PlaceRegistry als Fallback wenn extraPlaces leer. `loadExtraPlaces()` bleibt als Altbestand-Leser; localStorage-Abbau schrittweise. **Verifiziert:** GEDCOM net_delta=0/stable ✓ · GRAMPS stable ✓ · 198 Unit-Tests grün. | GRAMPS-Standard | ✅ erledigt |
| **P2-UI** | **Historische UI** ✅ *(sw v809)* — `modalPlace` erweitert: Typ-Dropdown (Village/City/Parish/…), Sektion „Alternative/frühere Namen" (pnames[] mit Sprache + von–bis inline editierbar, sofort wirksam), Sektion „Teil von" (enclosedBy[] via Select aller placeObjects + Datumsbereich). `showPlaceForm` lädt placeObject-Daten; `savePlace` legt placeObject bei erstem Speichern an (`_epId`) oder aktualisiert es (title/type/coords). Neue Actions: `addPlaceName`/`removePlaceName`/`addEnclosedBy`/`removeEnclosedBy` in CLICK_MAP. CSS-Klassen `.place-edit-section`, `.pname-row`, `.pname-span`. **Browser-verifiziert:** Typ korrekt vorbelegt, pnames mit Datum+Sprache, enclosedBy mit Datumsspanne, 0 Console-Errors. | UI | ✅ erledigt |
| **P3** | **Kirchen & typisierte Event-Orte** ✅ *(sw v818)* — **Typ-Filter** im Orte-Tab (`<select>` Alle/Dorf/Stadt/Pfarrei/Kirche/Friedhof/Hof; kombiniert mit Textsuche). **Typ-Badge** in Listenzeilen (⛪/⚰/🏡/…). **Ort-Suchpicker** im Event-Formular (📍-Button neben `ef-place`/`fev-place` → `modalPlacePicker`; zeigt alle placeObjects mit Typ-Icon; Auswahl setzt Input + hidden placeId). **Kirche↔Kirchenbuch** (light): Place-Detail für Church/Parish/Cemetery-Typen zeigt Sektion „Verknüpfte Kirchenbücher" mit Repos + Quellen die den Ortsnamen enthalten. | `type` (vorhanden) | ✅ erledigt |
| **P4** | **Geocoding & Gazetteer** ✅ *(sw v819)* — **Nominatim (OSM)** als primäre API (GOV: keine CORS-fähige JSON-API vorhanden). `geocoding.js`: `geocodeSinglePlace()` + `batchGeocodePlaces()` mit 1-req/sec Rate-Limit; befüllt `lat/lon`, `type`, `enclosedBy[]`-Kette (bis Country). CSP `connect-src` um `nominatim.openstreetmap.org` + `gov.genealogy.net` erweitert. **UI:** 📍-Button im Place-Detail + 🌐-Batch-Button im Orte-Tab mit Fortschrittsbalken-Modal. | `geocoding.js` | ✅ erledigt |
| **P5** | **Auswertungen** — P5a/d/e ✅ · P5b/c/f angedacht — Details s. u. | gemischt | ✅ Kernitems abgeschlossen |

**Reihenfolge:** §3.0 ✅ → P0a-1 ✅ → P0a-2 ✅ → P0b-1 ✅ → P0b-2a ✅ → P0b-2b ✅ → P0b-3 ✅ → P2-UI ✅ → P3 ✅ → P4 ✅ → P5a ✅ → P5d ✅ → P5e ✅ → Robustheit-Block ✅ → String→PlaceLink ✅ → Item 7–10/15 ✅ · P5b/c/f angedacht.

### PLACE-HIST P5 — Auswertungen (Detail-Plan)

**Ziel:** Den aufgebauten Ort-Master (`db.placeObjects`, `PlaceRegistry`, Geocoordinaten, Typ, historische enclosedBy-Ketten) für den Nutzer sichtbar nutzbar machen — als Steckbrief, Karte, Plausibilitäts-Check und narrative Einbettung.

#### P5a — Ort-Steckbrief ✅ *(sw v820)*

| Sub | Inhalt | Status |
|---|---|---|
| P5a-1 | **Events-Liste nach Typ gruppiert** — placeId-aware Matching (String + `ev.placeId`); gruppiert nach Geburt/Taufe/Heirat/Beerdigung/Tod/…; Personenzähler im Titel. | ✅ |
| P5a-2 | **Personen-Zähler** — dedupliziert aus den gesammelten Events. | ✅ |
| P5a-3 | **Quellen-Liste** — Quellen, deren Titel Ort-Name oder pnames-Alias enthält; mit Repo-Name + Direktlink. | ✅ |
| P5a-4 | **Namens-Timeline SVG** — horizontale Balken für pnames[] mit Datumsbereich; Jahres-Achse; nur wenn datierte Einträge vorhanden. | ✅ |
| P5a-5 | **Mini-Karte** — kleiner Leaflet-Container im Standort-Abschnitt (160 px); Marker + Links zu Apple Maps + OSM. | ✅ |

#### P5b — Karten-Zeitschieber (Orte-Tab) *(angedacht)*

| Sub | Inhalt | Aufwand |
|---|---|---|
| P5b-1 | **Karten-Panel** — Leaflet + OSM-Tiles; alle placeObjects mit Koordinaten als Marker; Popup = Ort-Name + Typ + Steckbrief-Link. | M |
| P5b-2 | **Zeitschieber** — `<input type="range">` (ca. 1600–heute); beim Verschieben: `resolveAsOf(year)` → Popup-Name + Marker-Farbe nach Typ. | M |
| P5b-3 | **Zugehörigkeits-Layer** — enclosedBy-Beziehungen als Linien (child → parent) zum gewählten Jahr. | L |

#### P5c — Pfarrei-Rekonstruktion *(angedacht)*

| Sub | Inhalt | Aufwand |
|---|---|---|
| P5c-1 | **Pfarrei-Picker** — Dropdown aller Church/Parish-Orte. | XS |
| P5c-2 | **Ereignis-Tabelle** — Taufen/Trauungen/Bestattungen der gewählten Pfarrei + untergeordnete Orte (enclosureChainAsOf); sortierbar. | M |
| P5c-3 | **Export** — CSV-Download. | S |

#### P5d — Geo-Plausibilitäts-Validator ✅ *(sw v821)*

| Sub | Inhalt | Status |
|---|---|---|
| P5d-1 | **Koordinaten-Plausibilität** — außerhalb Europa-BBox (27–72°N, 25°W–50°O) flaggen. | ✅ |
| P5d-2 | **Zeitachsen-Konsistenz** — `dateFrom > dateTo` in pnames[]; überlappende Perioden gleicher Sprache; enclosedBy-Zirkel. | ✅ |
| P5d-3 | **Event-Ort-Mismatch** — `resolveAsOf(birthYear)` vs. PLAC-String. | angedacht |
| P5d-4 | **UI** — ⚠-Button im Orte-Tab-Header; kollabierbare Warnliste mit Typ-Code + Direktsprung. | ✅ |

#### P5e — Orts-Kontextsatz in Story/Buch ✅ *(sw v822)*

| Sub | Inhalt | Status |
|---|---|---|
| P5e-1 | **`buildPlaceContextSentence(placeId, year)`** — „{Name} ({year}) war — ein {Typ} in {enclosureChain}." Nutzt `resolveAsOf` + `enclosureChainAsOf`. | ✅ |
| P5e-2 | **Story-Integration** — bei BIRT/CHR/DEAT/BURI mit `ev.placeId` → Kontextsatz nach dem Event-Satz; CSP-safe via `_esc()`. | ✅ |

#### P5f — Orts-Hypothesen (`_HYPO`) *(angedacht)*

| Sub | Inhalt | Aufwand |
|---|---|---|
| P5f-1 | **`hypo`-Feld in placeObject** — `{status, confidence, evidenceSids[]}`; Roundtrip via GRAMPS `<url type="_hypo">`. | M |
| P5f-2 | **UI** — Hypothesen-Badge im Steckbrief; Filter im Orte-Tab. | S |

#### Reihenfolge P5

**Empfohlen:** P5a ✅ → P5d → P5e → P5b → P5c → P5f

---

## View-Robustheit — Ausbauplan (Juni 2026)

**Ziel (Nutzer):** Stabiler Ansichtenwechsel auf iOS-PWA + Desktop — keine „Void"-Artefakte nach Tab-/App-Wechsel, Listen aktualisieren sich nach Edits ohne manuellen Eingriff, zuletzt gewählte Person/Familie/Ort/Quelle bleibt pro Tab stabil und überlebt PWA-Resume, keine leeren Seiten bei Erstanwahl. Technisches Detail-Design: **`VIEW-ROBUSTNESS.md`**.

**Befund-Kern (drei strukturelle Quellen, nicht synchronisiert):** `AppState.currentX`-IDs (nur eine je gesetzt), `UIState._lastTabSel` (nicht validiert, nicht persistent, mobile ignoriert), `UIState._navHistory` (orthogonal). Zusätzlich **0 PWA-Lifecycle-Handler** (`visibilitychange`/`pageshow`/`pagehide`), `renderTab()` wird aus keinem Form-Save-Pfad gerufen, `_det.scrollTop=0` nur im Desktop-Zweig von `showView`.

| Phase | Inhalt | Aufwand | Status |
|---|---|---|---|
| **P0** | K1 Mobile-`scrollTop`-Reset + K2 `visibilitychange`-Handler + K3 `renderTab()` aus 6 Save-Pfaden + R5 `_lastFilteredPersons` invalidieren. Behebt Bugs 1+2. | ~1 h | ✅ *(sw v861)* |
| **P1** | K4 Mobile-Selektions-Restore + K5 `_lastTabSel`-Validierung + K6 `_lastTabSel` IDB-persistieren + K7 `showStartView` AutoSelect + R6 `showDetail`-Fallback. Behebt Bugs 3+4. | ~1.5 h | ✅ *(sw v865)* |
| **P2** | A1 zentraler `ViewState.setCurrent/getCurrent` mit IDB-Persistenz + ID-Validierung + `viewstate-change`-Event. Ersetzt parallele Buchführung. | ~3 h | ✅ *(sw v866)* |
| **P3** | A2 `data-dirty`-Bit pro Tab + A3 `ui-lifecycle.js` (visibilitychange/pageshow/pagehide). | ~2 h | ✅ *(sw v867)* |
| **P4** | Hygiene: R1 (Layout-Flash) + R2 (`_vsP`-Teardown) + R3 (`_navHistory`-Cap) + R4 (`_initDetailSwipe` idempotent) + R7 (`setTimeout` → `_afterLayout`) + SW (lazy-Module aus `PRECACHE_CRITICAL` raus). | ~1 h | ✅ *(sw v868)* |
| **P5** | A4: 5 separate Container (`detailPerson/Family/Place/Source/Media`) + `_activateDetailContainer` mit Scroll-Save/Restore. A5: `data-view-init`-Flag + Skip-Re-Render in `_desktopAutoSelect`. | ~5 h | ✅ *(sw v869)* |

**Reihenfolge:** P0 → P1 → (P2 ∥ P3 ∥ P4) → P5. P2 ist Voraussetzung für P5; P4 jederzeit.

**Architektur-Folge:** nach P2-Abschluss → **ADR-025** in `ARCHITECTURE.md` (zentraler ViewState-Helper + PWA-Lifecycle-Kontrakt).

---

## P0 — Sicherheitsnetz & Fundament *(neu priorisiert nach Audit)*

| ID | Aufgabe | Details | Aufwand |
|---|---|---|---|
| ~~T0-TEST-2~~ | ~~**GRAMPS-Roundtrip automatisieren**~~ | ✅ **Abgeschlossen sw v750** — `test-roundtrip.js` um GRAMPS erweitert; **abhängigkeitsfreier** Mini-DOMParser (kein npm, kein `linkedom`) + `_gunzip` (Node `zlib` / JXA `gzip -dc`). Test-Seams `_grampsBuildXMLText()` / `_grampsParseXMLText()` (umgehen gzip/Blob/CompressionStream). Assertion: `xml1===xml2` + Kern-Record-Counts (person/family/source/repository) gegen Original. **Fand sofort einen echten Bug:** Repo-`<type>` wurde in `_extra` durchgereicht *und* hartcodiert erneut geschrieben → wuchs +1 pro Roundtrip; behoben (`_REPO_MODELLED` + `r.rtype`-Erhalt). | ~~M~~ |
| ~~T0-UNIT~~ | ~~**Unit-Tests für Kern-Logik**~~ | ✅ **Abgeschlossen** — `test-unit.js`, **161** dep-freie Tests (JXA/Node), CI-Exit-Code: (a) Parser-Edge-Cases (CONC/CONT, lv>4, leere Tags, Passthrough), (b) alle **28** Validator-Regeln je Positiv-/Negativfall, (c) BFS-Anonymisierung `_buildLivingSet` (6 DSGVO-Fälle), (d) Datums-Helfer, (e) Evidenzmodell + Hypothesen (`_EVAL`/`_HYPO`). | ~~M~~ |
| **T0-MODULE** | **ES-Modul-Migration — Plan + saubere Cluster** | ✅ **Phase 1+2 abgeschlossen (sw v751/v752)** — **ADR-020** (Strategie + gemessene Erkenntnisse + Phasenplan). **Phase 1:** GRAMPS-Cluster → `export` + `gramps.bridge.js`. **Phase 2:** Validator-Cluster → `export` + `validator.bridge.js`. Beide Browser-verifiziert (Boot fehlerfrei, Globals gesetzt, End-to-End-Aufrufe, Module lesen `gedcom.js`-Globals zur Laufzeit). **Gemessener Befund:** GRAMPS-*Konsumenten* sind nicht billig migrierbar (z. B. `idbGet` von 13 Dateien genutzt) → Brücke schrumpft erst nach Kern-Migration; daher zuerst alle sauberen Leaf-Cluster. **Offen:** Phase 3 (Kern) + Phase 4 (UI/Bundling). | **L (Phase 1+2: M ✓)** |

---

## T0 — Restliche technische Schulden

| ID | Aufgabe | Details | Aufwand |
|---|---|---|---|
| ~~CSP-DURCHSETZUNG~~ | **CSP lückenlos durchsetzen + verifizierbar** ✅ *(v795, 2026-05-31)* | Befund (live verifiziert): strikte CSP verwirft inline-`on*` UND inline-`style=` still. ① ✅ 2 tote `onclick` entfernt (v794, Eltern-Picker). ② ✅ 45 tote inline-`style=` aus index.html entfernt (v795; CSP-inert → 0 Render-Änderung, empirisch belegt). ③ ✅ `test-csp.js` (headless, in run-tests.sh) prüft index.html auf inline-`on*`/`style=` → „CSP vollständig" belegt. | **S** |
| **T0-FUNC-SPLIT** | **Größte Funktionen zerlegen** *(neu 2026-05-31)* | Die 3–4 längsten Funktionen (`_attr` 486, `_parseINDILine` 388, `showDetail` 294, `writeINDIRecord` 269 Z.) in benannte Teilschritte gliedern. Unabhängig vom Modulsystem (anders als T0-DRY-`_esc`). Roundtrip- + Unit-Tests decken die Risiken. Größter konkreter Wartungs-Hebel. | M |
| **T0-EXTRAPLACES-CLEANUP** | **`stammbaum_extraplaces_*` localStorage aufräumen** *(neu 2026-06-06)* | **Hintergrund:** `extraPlaces` war das ursprüngliche Koordinaten-/Übersetzungssystem vor `placeObjects`. Seit v854 ist es als Schreibziel eingefroren — alle Saves gehen in `placeObjects` (IDB + OneDrive). `loadExtraPlaces()` wird noch aufgerufen, damit `_migrateExtraPlacesToPlaceObjects()` Altdaten einmalig überführt. `saveExtraPlaces()` (ui-forms.js:913) schreibt noch in localStorage, ist aber toter Write. **Cleanup-Schritte:** ① `saveExtraPlaces()`-Call in `savePlace` entfernen. ② `_migrateExtraPlacesToPlaceObjects` nach erfolgreichem Durchlauf `localStorage.removeItem(_extraPlacesKey())` aufrufen lassen (idempotent, da Migration selbst idempotent). ③ Wenn alle Instanzen sicher migriert: `loadExtraPlaces()` + `_extraPlacesKey()` + `saveExtraPlaces()` aus ui-forms.js löschen; `db.extraPlaces`-Feld aus AppState entfernen. **Voraussetzung:** mindestens einmaliger App-Start mit v854+ auf allen genutzten Geräten (bei Eigennutzung sofort möglich). **Risiko bei zu frühem Cleanup:** Nutzer mit Altdaten (nie v854+ gestartet) verlieren Koordinaten, die noch nicht in placeObjects migriert wurden. | S |
| ~~T0-SW~~ | ~~**SW Install-Robustness**~~ | ✅ **Abgeschlossen sw v743** — `PRECACHE_CRITICAL` (atomar) + `PRECACHE_OPTIONAL` via `Promise.allSettled()` | ~~XS~~ |
| ~~T0-XSS~~ | ~~**innerHTML-Audit**~~ | ✅ **Abgeschlossen sw v744** — alle 166 `innerHTML`-Assignments auditiert; kein echter XSS-Vektor; `esc()` konsequent. | ~~S~~ |
| ~~T0-TOKEN~~ | ~~**Refresh-Token-Restrisiko dokumentieren**~~ | ✅ **Abgeschlossen** — ADR-021 in `ARCHITECTURE.md`. Restrisiko bewusst geführt: `sessionStorage` ist bewusste Wahl (kein Backend, Tab-scoped, keine Persistenz). `Files.ReadWrite.AppFolder`-Scope geprüft und abgelehnt (bricht Kernfunktionalität + erfordert Azure-Portal-Änderung). Mitigationen: CSP `script-src 'self'` + `esc()`-Audit (T0-XSS) + Refresh-Token-Rotation. | ~~S~~ |
| ~~T0-STORAGE~~ | ~~**localStorage / IDB-Strategie Phase 3**~~ | ⛔ **wontfix** — `extraPlaces` + `hofObjects` sind klein (<50 KB), Quota-Risiko rein theoretisch. `stammbaum_filename` bleibt ohnehin in `localStorage` (sync, intentional) → localStorage wird durch diese Migration nicht eliminiert. Aufwand M (7 async-Umbau-Stellen) nicht durch realen Nutzen gedeckt. | ~~S~~ |
| ~~T0-DRY~~ | ~~**`_esc`/`esc`-Duplikat + Monsterfunktionen**~~ | ⛔ **wontfix (beide Teile)** — **`_esc`-Konsolidierung:** 4× definiert (`gedcom.js:1131`, `gramps-writer.js:24`, `ui-timeline.js:556`, `ui-story.js:82`); lokale Definitionen defensiv bzw. ESM-bedingt; Konsolidierung erst nach ADR-020 Phase 3 möglich (vorher kein sauberer `import` in klassischen Scripts). **`showDetail`-Split** (`ui-views-person.js:681`, ~300 Z.): Funktion ist intern bereits durch Kommentare gegliedert (10 Blöcke); `_pdetLifeData` halb-etabliertes Muster. Kein echter Gewinn: alle Blöcke brauchen `(p, id)`, keine Wiederverwendung, kein DOM-Testfundament, null Nutzer-Benefit. Sinnvoller Zeitpunkt: wenn `showDetail` aus konkretem Anlass ohnehin angefasst wird. | ~~S~~ |
| ~~T0-TEST~~ | ~~**Roundtrip-Test-Automation (GEDCOM)**~~ | ✅ **Abgeschlossen sw v746** — `test-roundtrip.js`: Node ohne Deps (`vm.runInContext`); `net_delta=0` + `out1===out2`; CI-Exit-Code. *(GRAMPS-Teil → T0-TEST-2)* | ~~M~~ |

---

## P1 — Mobile Feldarbeit

| ID | Aufgabe | Details | Aufwand |
|---|---|---|---|
| **CAM** | **Kamera-Integration** | `<input accept="image/*" capture="environment">` → Foto direkt als Medienreferenz zur Person oder Quelle anhängen; kein OneDrive erforderlich; funktioniert iOS + Android PWA nativ. Konkrete Lücke vs. MacFamilyTree iOS. | **S** |
| ~~QUICK-TPL~~ | ~~**Quellengebundene Eingabe-Templates**~~ | ✅ **Phasen A–E abgeschlossen (sw v759–v769)** — `ui-quicktpl.js`: schema-getriebener, quellengebundener Erfassungs-Motor. Basismuster `marriage/baptism/burial` + frei konfigurierbare `base:'custom'`-Templates (`tpl.schema.fields[]`, Rollen-Katalog `QT_ROLE_CATALOG` mit FAMC/FAMS-Semantik). Dedup-aware Personen-Matching („verknüpfen statt neu anlegen"), Inline-Plausi nach Speichern, „aus aktueller Quelle erstellen" (⚡), Undo-fest. Persistenz: portable JSON-Config + IDB-Cache (nicht in GED); Deeplinks → `citations[].media[]`. **Census zurückgestellt.** *(Voll-Detail: CHANGELOG.)* | ~~L~~ |

---

## P2 — Onboarding & Forschungsqualität

| ID | Aufgabe | Details | Aufwand |
|---|---|---|---|
| ~~ONBOARDING~~ | ~~**Onboarding für Erstnutzer**~~ | ✅ **Abgeschlossen sw v748** — Spotlight-Overlay, 4 Schritte (Personenliste, Baum-Button, FAB, eigene Datei laden). Einmalig nach Demo-Load, localStorage-Flag `stammbaum_onboarding_done`. `ui-onboarding.js` neu. | ~~S~~ |
| F3 | **Pedigree-Collapse** | Mehrfach-Vorfahren im Sanduhr-Baum erkennen + visuell zusammenführen; Inzucht-Koeffizient optional. Voraussetzung: BFS-Algorithmus aus REL-CALC nutzen. | M |

---

## P3 — Desktop-Auswertung & Performance

| ID | Aufgabe | Details | Aufwand |
|---|---|---|---|
| **SCALE-TEST** | **Skalierungstest >10k Personen** *(neu 2026-05-31)* | Größte spürbare Lücke ggü. MacFamilyTree/GRAMPS (getestet nur ~2.800). Synthetisches 20k-GEDCOM erzeugen, Cold-Start/Listen-Scroll/Baum-Render/Roundtrip messen, Engpässe identifizieren (virtuelles Scrollen prüfen, ggf. weitere O(n)-Stellen). Liefert belastbare Skalierungs-Aussage statt Vermutung. | M |
| **FAN-COLOR** | **Fächer-Chart: Farbe nach Generation** | 6 CSS-Variablen für Generationsstufen statt einheitlich gold; keine Layout-Änderung nötig. | **XS** |
| ~~CSS-PURGE~~ | ~~**CSS aufräumen**~~ | ✅ **Abgeschlossen sw v745** — 796 CSS-Klassen gegen index.html + *.js geprüft; 21 tote Klassen entfernt (17 ungenuzte Utility-Klassen + `src-tag-x`, `tpl-btn`, `btn-gold-text`, `c-red`); Leaflet-Overrides + dynamisch gebaute Klassen (`tl-pc${idx}` etc.) korrekt behalten. 3416 → 3385 Zeilen (−31). | ~~S~~ |
| ~~LAZY-LOAD~~ | ~~**Lazy-Loading optionaler Module**~~ | ✅ **Abgeschlossen sw v747** — `lazy-loader.js` (`_lazyScript`/`_lazyScripts`). 5 Dateien (~119 KB) aus Cold-Start entfernt: `ui-book.js` + `ui-print.js` (Buch/Druck), `ui-dedup.js` (Dedup), `ui-import-compare.js` + `compare-engine.js` (Datei-Vergleich). Entry-Points in `ui-event-delegation.js` gewrappt. PRECACHE_OPTIONAL im SW. OneDrive-Gruppe skip (tief integriert). | ~~M~~ |
| ~~ACCESSIBILITY~~ | ~~**Accessibility-Audit + Grundhärtung**~~ | ✅ **Abgeschlossen sw v724** — Skip-Link, ARIA-Live, Baum tabindex/role=button, :focus-visible, aria-invalid, prefers-reduced-motion | ~~M~~ |

---

## P4 — Visuelle Ausgaben

| ID | Aufgabe | Details | Aufwand |
|---|---|---|---|
| MAP-HIST-A | **Vintage-Kartenstil** | CSS-Filter (`sepia/brightness/contrast`) auf OSM-Kacheln; Toggle Modern/Historisch; UIState-Persistenz; kein API-Key. | S |
| MAP-HIST-B | **Historischer Kartenhintergrund (Swisstopo)** | Swisstopo Siegfriedkarte (1883–1949, WMTS) als Layer + Jahres-Dropdown. Coverage: Schweiz + Grenzregionen. Nur sinnvoll nach MAP-HIST-A. | M |

---

## P5 — Standards & Interoperabilität

| ID | Aufgabe | Details | Aufwand |
|---|---|---|---|
| ~~ASSO-EDIT~~ | ~~**ASSO-Beziehungen editierbar**~~ | ✅ Abgeschlossen sw v734 — Person-Picker via `modalRelPicker` ('asso'-Modus); `modalAsso` Bottom-Sheet mit Rollen-Select (Godparent/Witness/Informant/Friend/Associate/Eigene) + Notiz-Feld; Assoziationen-Section: alle gespeicherten mit ✎ × Buttons; abgeleitete Patenkinder read-only; `saveAsso`/`deleteAsso`/`showAssoRoleStep`/`assoRoleChange`. | ~~M~~ |
| ~~F6~~ | ~~**Strict GEDCOM Export**~~ | ✅ Abgeschlossen sw v749 — `_strictGed`-Flag + `_ptLines()` in `gedcom-writer.js`; alle `_`-Tags entfernt oder gemappt (`_UID`→`REFN TYPE UID`, `_RUFNAME`→`NICK`, `_TRAN`→`NOTE`, `_FREL/_MREL`→`PEDI`); Toggle in modalSettings; Suffix `_strict.ged`; ADR-019; Strict-Roundtrip-Test stabil. | ~~M~~ |
| ~~GRAMPS-EDIT~~ | ~~**GRAMPS-Attribute editierbar**~~ | ✅ Abgeschlossen sw v739 — GRAMPS-Sektion in Person- + Familien-Formular; `grampId` read-only; `_grampsAttrs[]` editierbar (Typ + Wert, +/×); `_grampsTags[]` read-only Chips; Sektion nur sichtbar wenn GRAMPS-Daten vorhanden. | ~~M~~ |
| ~~GRAMPS-RT~~ | ~~**GRAMPS-Writer vollständig + Roundtrip-Test**~~ | ✅ Abgeschlossen sw v737–v738 — `_RLOG`-Serialisierung (Parser + Writer) für Personen + Familien; `f._tasks` Fix; `_TASK`/`_RLOG`-Checks in allen drei Roundtrip-Testfunktionen (`_grampsDeepTest`, `_grampsDeepRoundtrip`, `runGrampsRoundtripTest`). | ~~M~~ |
| OBJE-TYPE | **Medien-Typ strukturiert** ⚠ | `m._type` als Vendor-Extension (`2 _TYPE`); ADR erforderlich vor Umsetzung. | S |
| ~~GEDCOM-7-EVAL~~ | ~~**GEDCOM 7.0 Evaluierung**~~ | ✅ Abgeschlossen sw v724 — ADR-018 in ARCHITECTURE.md. Ergebnis: Conditional Go; opt-in Exportmodus; Vollplan in 4 Phasen. | ~~M~~ |
| ~~GEDCOM-7-1~~ | ~~**GED7: Datenmodell + Parser**~~ | ✅ Abgeschlossen sw v725 — Parser-Handler NO/EXID/CREA/SNOTE/PHRASE/TRAN; `_parsedPlaceTrans`→`extraPlaces`; `.rela`→`.role`; Typedefs + RELA_LABELS. | ~~M~~ |
| ~~GEDCOM-7-2~~ | ~~**GED7: Writer (opt-in Export)**~~ | ✅ Abgeschlossen sw v726 — `gedExportVersion` ('5.5.1'/'7.0', IDB); `pushCont()` ohne CONC; HEAD `VERS 7.0` + SCHMA; SNOTE/ROLE/PHRASE/NO/EXID/CREA/PLAC·TRAN/NAME·TRAN; Toggle in modalSettings. | ~~M~~ |
| ~~GEDCOM-7-3~~ | ~~**GED7: Cross-Transfer-Adapter**~~ | ✅ Abgeschlossen sw v732 — `_writePlacTrans()` GED5/GED7 unified (`_TRAN`/`TRAN`); `nameTrans[]` als `2 _TRAN` in GED5; Re-Import-Parser erkennt `_TRAN` unter PLAC+NAME; GED5-Downgrade: `exids[]`→REFN, `noEvents`→NOTE, SNOTE→NOTE; GRAMPS-Adapter: `noEvents`→`<attribute>`, `exids[]`→`<url>`, `datePhrase`→`datestr`-Fallback. | ~~M~~ |
| ~~GEDCOM-7-4~~ | ~~**GED7: UI**~~ | ✅ Abgeschlossen sw v733 — `datePhrase` kursiv in allen Event-Zeilen (BIRT/CHR/DEAT/BURI + Array); `noEvents` als ✗-Badges; `exids[]` Panel neben REFN; `aliaNames[]` Textaliase; `nameTrans[]` read-only Chips; Übersetzungs-Editor für `extraPlaces[].trans[]` inline in Ort-Detail (add/remove). | ~~S~~ |

---

## Dokumentation

**Handbuch-Stand: sw v858** *(veraltet — v859–v889 noch nicht dokumentiert: UX-Polish Orte-Steckbrief + View-Robustheit P0–P6 + Koord-Paar-Invariante + Koord-Löschen + po-gewinnt-immer + Ereignisliste/-gruppen + VS-Scroll-Reattach)*

| ID | Aufgabe | Details | Aufwand |
|---|---|---|---|
| DOC-SCREENS | **Handbuch: echte Screenshots** | Alle Mockups durch echte Screenshots ersetzen. Priorität: Sanduhr-Baum, Fächer, Nachkommen-Baum, Zeitleiste, Karte (alle 3 Modi), Personen-Detail. | M |

---

## Backlog / Forschung

*Kein festes Datum. Kandidaten für v9+ oder bei geänderter Priorität.*

| ID | Aufgabe | Details | Aufwand |
|---|---|---|---|
| LLM-STORY | **LLM-gestützte Story-Verbesserung** | Opt-in API-Call zum Umschreiben des Story-Textes in natürlicheres Deutsch. Privacy: nur anonymisierte Daten senden. | M |
| F8 | **Cluster-Ansicht** | Alle Personen in denselben Orten/Quellen wie Person X — Netzwerk-Graph oder Liste. | L |
| ES-MODULE | **Vollständige ES-Modul-Migration (Phasen 3–4)** | Phase 1+2 erledigt (GRAMPS + Validator, ADR-020). **Phasen 3–4 bewusst zurückgestellt** — Kern-Migration (Worker-`importScripts`-Blocker, `idbGet`-Kaskade, 59 Brücken-Symbole) lohnt sich ohne Build-Step kaum; vollständiger Nutzen erst mit Bundler. Brücken-Pattern aus ADR-020 wiederverwendbar wenn Trigger eintritt (s. Entscheidung im Priorisierungs-Abschnitt). | XL |
| BUILD-STEP | **Build-Step (esbuild/Rollup) einführen** | Voraussetzung für vollen Nutzen von ES-MODULE-Phase 3–4 + BUNDLING. Analysiert Mai 2026: bringt für Nutzer kaum Mehrwert (PWA-Cache + LAZY-LOAD dominieren); bricht für Entwickler die bewusste „edit-anywhere ohne Toolchain"-Eigenschaft (ADR-001/002). **Entscheidung: zurückgestellt.** Trigger: Codebase wächst stark oder Namespace-Kollisionen treten konkret auf. | XL |
| BUNDLING | **Bundling für Erstladezeit** | Nur sinnvoll nach BUILD-STEP + ES-MODULE vollständig. Mit LAZY-LOAD sind die größten Cold-Start-Gewinne bereits ohne Build-Step realisiert; Bundling bringt danach nur noch marginale Verbesserung (~40–60 % Größenreduktion, aber Warmstart via SW-Cache schon sofortig). | L |
| F11 | **OCR** | Urkunden-Scan → Text; WASM-Tesseract oder LLM-Backend als Opt-in. | XL |
| COLLAB | **Kollaboratives Editieren** | Konflikt-freies Merge zweier GEDCOM-Dateien. Grundlage: IMPORT-CMP + DUP-DETECT. Erfordert Server oder CRDTs. | XL |

---

## Vergleich mit etablierten Tools *(faire Einordnung — Stärken der Konkurrenz benannt; überarbeitet 2026-05-31)*

> Frühere Version dieser Tabelle war parteiisch (sich selbst durchgehend ✅, Konkurrenz ⚠). Hier ehrlicher: wo etablierte Tools führen, steht es da. **MacFamilyTree (MFT)** ist der *direkteste* Vergleich — Synium Software, nativ macOS+iOS, deutscher Markt, visuell-first, gleiche Zielgruppe (Hobby, mobil+Desktop). Genau deshalb sind die Lücken zu MFT die aussagekräftigsten.

| Dimension | Stammbaum PWA | MacFamilyTree | GRAMPS | Ancestry |
|---|---|---|---|---|
| Plattform-Reichweite | **✅ PWA = überall (auch Android/Windows)** | ⚠ Apple-only | Desktop (3 OS) | Web/Abo |
| Offline | ✅ vollständig | ✅ | ✅ | ❌ Cloud-Zwang |
| GEDCOM-Treue (Roundtrip) | **✅ exzellent — verifiziert `net_delta=0`** | ⚠ verlustbehaftet (re-ordert, droppt Custom-Tags) | ✅ gut | ⚠ verlustbehaftet |
| GEDCOM 7.0 | ⚠ opt-in Export | ⚠ teilw. | ⚠ | ❌ |
| GRAMPS XML | ✅ read+write | ❌ | ✅ nativ | ❌ |
| Quellenverwaltung | ✅ gut (Mehrfachzitate, Evidenzmodell, Templates) | ✅ gut | **✅ exzellent (quellenzentriert)** | ⚠ mittel |
| Forschungsworkflow | **✅ stark (RLOG · Kanban · Projekte · Hypothesen/GPS · Dashboard)** | ⚠ mittel (visualisierungs-first) | **✅ exzellent** | ✅ Online-Hints stark |
| Reports / Bücher / Poster | ⚠ HTML/Print (begrenzt) | **✅ exzellent (PDF-Bücher, Großposter)** | ✅ sehr gut | ⚠ mittel |
| Visualisierung | ✅ sehr gut + Story-Modus einzigartig | **✅ exzellent (3D „Virtual Tree", Charts)** | ⚠ mittel | ✅ gut |
| Orts-Geocoding / Gazetteer | ✅ Nominatim + GOV (historisch datiert) | **✅ (Geocoding + Heatmaps)** | ✅ | ✅ |
| Geräte-Sync | ⚠ OneDrive-Datei + Konflikterkennung (v858) | **✅ nahtlos (CloudKit FamilySync)** | ❌ | ✅ Cloud |
| Karte + Zeitleiste | ✅ (hist. Ereignisse, Mehrpersonen-TL) | ✅ | ⚠ | ⚠ |
| Validierungsregeln | ✅ 28 Regeln, konfigurierbar | ⚠ | ✅ | ⚠ |
| Duplikat-Erkennung + Merge | ✅ (Scoring, Gegenüberstellung) | ✅ | ✅ | ⚠ |
| Verwandtschaftsrechner | ✅ (BFS, Cousin-Grade + „entfernt") | ✅ | ✅ | ✅ |
| DNA-Integration | ❌ | ❌ | ⚠ Plugin | **✅ Kernfeature** |
| Online-Matching / Records | ❌ | ⚠ (FamilySearch-Anbindung) | ❌ | **✅ Killer-Feature** |
| Multi-User / Kollaboration | ❌ | ❌ | ❌ | ✅ |
| Skalierung (getestet) | ⚠ ~2.800 Pers. (>10k ungetestet) | ✅ groß erprobt | ✅ 100k+ | Millionen |
| Datenschutz (lokal-first) | **✅ kein Tracking, kein Cloud-Zwang** | ✅ (aber CloudKit-Default) | ✅ | ❌ |
| Lebende anonymisieren | ✅ (v715, BFS beim Export) | ⚠ | ✅ | ⚠ |
| Reife / Politur | ⚠ Solo-Projekt | **✅ 20-J.-Produkt** | ✅ etabliert | ✅ |
| Kosten | **gratis** | €€ einmalig | gratis | €€€ Abo |

**Einzigartige Stärken (real konkurrenzlos):** kostenlose plattformübergreifende Offline-PWA *ohne Installation* + Story-Modus + GRAMPS-Brücke + DSGVO-Anonymisierung + **verifizierte GEDCOM-Treue** + expliziter GPS-Forschungsprozess + kein Datamining. Für die Zielgruppe (mobil + Desktop, datenschutzbewusst, nicht Apple-gebunden) besetzt das eine Nische, die kein kommerzielles Tool exakt abdeckt.

**Ehrliche Lücken vs. Konkurrenz (priorisiert nach Relevanz für die Zielgruppe):**
- vs. **MacFamilyTree** *(der direkte Maßstab)*: ① Ausgabe-Reichtum (PDF-Bücher, Großposter, 3D-Tree) · ② nahtloser Multi-Device-Sync (CloudKit — Stammbaum hat Konflikterkennung, aber manuellen Sync) · ③ Reife/Politur. **Dafür schlägt Stammbaum MFT bei:** GEDCOM-Treue, Forschungsprozess-Rigorosität (GPS/Hypothesen/Kanban), historisches Orts-Handling (datierte GOV-Ketten), Plattform-Reichweite, Privacy, Preis.
- vs. **GRAMPS:** Tiefe im professionellen Quellen-/Forschungsworkflow; Skalierung; Report-Vielfalt.
- vs. **Ancestry:** DNA + Online-Matching + Milliarden Records — *kategoriefremd und bewusst out-of-scope*.

*Keine offenen **Standards**-Lücken mehr (GEDCOM/GRAMPS abgedeckt). Die spürbarsten Lücken liegen — gemessen am direkten Konkurrenten MFT — bei **Ausgabe-Reichtum** und **Skalierung >10k**; die netzwerk-/datenbankgebundenen Features (DNA/Records) sind Designziel, kein Defizit.*

---

*Aufwand: XS (<1h) · S (1–2h) · M (halber Tag) · L (1–2 Tage) · XL (>2 Tage)*
*Vollständige Sprint-Geschichte inkl. aller abgeschlossenen Items: CHANGELOG.md*
