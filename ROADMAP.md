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

**sw-Version:** v858 · Cache: `stammbaum-v858` · `test-unit.js` = 296 Tests grün
**v858: feat(places): OneDrive Konflikt-Erkennung via _rev+_device (Item 10)** — `stammbaum-orte.json` bekommt Wrapper-Format `{schemaVersion:1, _rev:N, _device, _ts, placeObjects}`. Geräte-ID einmalig generiert + in localStorage. Jedes `savePlaceObjects` bumpt `_rev`. Beim Load: lokale + OneDrive-Daten werden entpackt; höhere `_rev` gewinnt. **Konflikt-Erkennung:** gleiche `_rev` + verschiedene `_device` + abweichender Content → Union-Merge (kein Datenverlust) + Warn-Toast. Backwards-kompat: altes Format (nacktes Object) wird als `schemaVersion:0, _rev:0` entpackt. `_unwrapPlacesData`-Helper für Format-Detection. Browser-verifiziert: schemaV:1 / `_rev:1→2` über zwei Saves, `_device` stabil, Konflikt-Logik detect=true bei gleicher `_rev`/anderem `_device`/anderem Content. GEDCOM Roundtrip net_delta=0 stable. **Beseitigt last-write-wins-Datenverlust-Risiko bei Multi-Device-Nutzung.**
**v857: refactor(places): Koords als single source of truth (P2 Item 9)** — `_eventCoords(ev)` in gedcom.js: liest Koords primär aus `placeObjects` (via `ev.placeId` oder `findByName(ev.place)`), `ev.lati/long` nur als Fallback. Consumer auf Helper umgestellt: `collectPlaces` (po.lat überschreibt jetzt ev.lati statt nur Lücken zu füllen), `evGeoLink(ev)` (alte Signatur `(lati, long)` bleibt backwards-kompat), Person-Detail-`_hasGeo`-Check + 4 GeoLink-Aufrufe, Family-Detail-GeoLink, Map `addEv`-Aufrufe (Birth/Chr/Death/Buri + Custom-Events), Story-Karte (`_addEv`-Wrapper für Birth/Chr/Death/Buri + Custom-Events + Heirats-Events). `_propagateCoordsToEvents` entfernt — Aufrufe aus `savePlace` + `geocodeSinglePlace` weg, Funktion gelöscht (~25 Z. tot). Browser-verifiziert: po.lat-Wechsel zeigt sofort in collectPlaces ohne dass ev.lati je gesetzt wurde. +8 Unit-Tests Gruppe (s). **GEDCOM net_delta=0 stable, GRAMPS stable.**
**v856: feat(places): UX-Quickwins aus Review (Items 11–14)** — **(11)** `savePlaceObjects` meldet IDB- und OneDrive-Fehler EINMAL pro Session als Toast (`_savePoIDBErrored`/`_savePoODErrored`-Flags) statt stillem Schlucken. **(12)** Validator-Badge auf dem ⚠-Button im Orte-Tab zeigt Anzahl `validatePlaces()`-Warnungen ohne Klick (BBox/Datums-Reihenfolge/Pname-Überlappung/enclosedBy-Zirkel); `_refreshPlaceValidatorBadge` in `renderPlaceList`-Pfad. **(13)** GOV-Platzhalter-Toast nach Load (delayed 1.5s, beide Loader-Pfade) + Title/Aria-Label auf ⚙-Filter-Button mit Anzahl unaufgelöster `_govUnresolved`-POs. **(14)** Origin-Hint im Merge-Modal: id-Präfix-Klassifikation (`GRAMPS`/`lokal`/`JSON-Import`/`GOV-Platzhalter`) als kleine kursive Pille hinter jedem Title — hilft beim Aufräumen der Dubletten-Quelle. Browser-verifiziert: Badge zeigt "3" bei 3 Warnungen, Title "2 unaufgelöste GOV-Platzhalter", Modal zeigt alle drei Origin-Tags. GEDCOM Roundtrip net_delta=0 stable.
**v855: fix(places): JSON-Import-Dedup über _normPlaceName (Item 15/B6)** — `_mergePlaceObjectsFromImport` in gedcom.js: title-basierte Dedup (gleicher Ort mit anderem Handle, z.B. GRAMPS `@P0017@` vs lokales `_ep_<hash>`) → verlustfreier Merge in vorhandenes PO statt Duplikat. Remap-Tabelle für `enclosedBy[].placeId`+`parentId`-Referenzen, Suffix `_imp<n>` bei id-Kollision mit verschiedenem Titel. `importPlaceDataFile` ruft den Helper auf; extraPlaces-Import zusätzlich per `_normPlaceName(name)` dedupliziert. +20 Unit-Tests Gruppe (r). Browser-verifiziert: `@TARGET@`-PO "München" + Import-PO `_ep_xyz12345` mit gleichem Titel → 1 PO, pname+_govId übernommen, Koords bestanden. GEDCOM Roundtrip net_delta=0 stable. **Beseitigt Hauptursache von Orts-Dubletten beim Re-Import.**
**v854: refactor(places): extraPlaces als Schreibziel eingefroren (P2 Item 7)** — single source of truth ist `placeObjects`. Schreib-Pfade: `savePlace`, `saveNewPlace`, `addPlaceTrans`, `deletePlaceTrans` (neu `deletePlacePname`) schreiben nur noch in `placeObjects` (via `mutatePlaceObject`/`upsertPlaceObject`). `gedcom-writer.js` `_writePlacTrans` + `geoLines` lesen `placeObjects.pnames`/`lat`/`long` primär, `extraPlaces` als Legacy-Fallback. `_writePlacTrans` filtert undatierte pnames (TRAN-Semantik); datierte historische Namen bleiben GRAMPS-internal. `collectPlaces` extraPlaces-Merge entfällt — `_migrateExtraPlacesToPlaceObjects` (in `setDb`) bringt Altbestände in `placeObjects`. GRAMPS-Loader `pname → extraPlaces.trans`-Backfill entfernt (redundant). `showPlaceDetail` Übersetzungs-Editor zeigt placeObjects.pnames mit Legacy-Fallback. +5 Unit-Tests Gruppe (q). **GEDCOM net_delta=0 stable** (kritisches Akzeptanzkriterium), GRAMPS stable, Browser-verifiziert: writeGEDCOM produziert `_TRAN`/`LANG` aus pnames.
**v853: refactor(places): mutatePlaceObject/upsertPlaceObject Helper (P2 Item 8)** — Zentraler Mutations-Helper in gedcom.js, der das 4-Schritt-Ritual (Mutation + Registry-Invalidation + Cache-Invalidation + markChanged + savePlaceObjects) verriegelt. Callsites umgestellt: `addPlaceName`, `removePlaceName`, `addEnclosedBy`, `removeEnclosedBy` (vergaßen vorher `_placesCache=null` — stale Ortsliste nach Modal-Close), `applyGovText` (vergaß ebenso `_placesCache=null`), `geocodeSinglePlace`. Vergesser-Bugs der v847-Klasse strukturell unmöglich gemacht. +14 Unit-Tests Gruppe (p). GEDCOM net_delta=0/stable, GRAMPS stable.
**v852: test+fix(places): Test-Härtung (P5 aus Review)** — Tests Gruppe (m/n/o) +37: Identity Cross-Path (gleicher Ort, 6 Schreibweisen, pname-Aliase → 1 placeId in `findByName` + `_findOrCreatePO` + `mergeStringPlaces`-Winner-Lookup), `mergeStringPlaces` Edge-Cases (Multi-Loser, ohne Loser-PO, Koord-Erbe), `_migrateExtraPlacesToPlaceObjects` (Merge in vorhandenes PO, idempotent, Skip-Empty), `_epId`-Determinismus. **Geocoding-Fix:** `_findOrCreatePO` nutzt jetzt primär `getPlaceRegistry().findByName` → pname-Aliase werden erkannt (vorher: nur `po.title`-Vergleich → fehlende Aliase). geocoding.js in test-Harness mit Stubs eingebunden. Roundtrip net_delta=0/stable.
**v851: refactor(places): Robustheit-Block (P1 aus Review)** — Identity-Matching zentralisiert auf `_normPlaceName` (geocoding `_findOrCreatePO`, `_propagateCoordsToEvents`, `deleteExtraPlace`). `_placeUsageCounts` zählt jetzt auch `f.events[]` (Bug B1). `mergeStringPlaces` hängt `ev.placeId` der Verlierer auf Winner-PO um (oder null), statt Leichen zu hinterlassen (Bug B2) — Winner/Loser-Identifikation in 2 Pässen, da Norm-Form kollabieren kann. Toter `dated`-Filter in `_renderPlaceNamesList` entfernt (Bug B3). `_epId`-Kollision in `_migrateExtraPlacesToPlaceObjects` → Suffix-Fallback `_ep_<hash>_2` + Warnung statt stillem `continue` (Bug B11). +12 Unit-Tests Gruppe (l). GEDCOM net_delta=0, GRAMPS stable.
**v850: fix(topbar): storyBtn/timelineBtn/probandBtn in Quellen/Ort/Hof/Archiv-Detail ausblenden** — alle vier Non-Person-Detail-Views setzen jetzt `storyBtn`, `timelineBtn`, `probandBtn`, `probandSetBtn` auf `hidden=true`, damit das Lebensgeschichte-Symbol nicht aus vorheriger Personen-/Familienansicht übrig bleibt.
**v849: fix(onedrive): Ordner-Picker startet im GED-Ordner + korrekter Breadcrumb** — `_odBuildStack(parentRef)` neu: baut FolderStack aus `parentReference` auf (voller Pfad, letzter Eintrag mit echter ID). `odBrowseBasePath` zeigt jetzt GED-Ordner selbst (nicht Parent). `_odNavigateToParentOf` baut Breadcrumb mit vollständigem Pfad. Config-Picker-Fallback ebenfalls auf `_odBuildStack` umgestellt.
**v848: fix(onedrive): Mode-Flags konsistent zurücksetzen** — `_odConfigScanMode` jetzt deklariert; `_odResetModes()` Helper; alle Picker-Einstiegspunkte (`odImportPhotos`, `odSetupDocFolder`, `odSetupConfigFolder`, `odBrowseBasePath`, `odPickFileForMedia`, `odPickFileForEditMedia`) rufen `_odResetModes()` als erstes auf → kein staler Mode aus vorheriger Sitzung kann mehr Titel/Buttons des OD-Browsers verfälschen.
**v847: fix(places): Typ-Filter nach Orte-JSON-Import befüllen** — `importPlaceDataFile` ruft jetzt `renderTab()` auf, damit `_refreshPlaceTypeFilter()` die neu importierten Typen sofort in das Select übernimmt.
**v846: fix(onedrive): Ordner-Picker nie bei OneDrive-Root starten** — `_odNavigateToParentOf`: wenn der Parent-Ordner direkt im Root liegt (`parentIsRoot`), wird jetzt der Ordner selbst mit Root im Stack angezeigt statt dem Root mit dem Ordner als Kind-Element. Betrifft alle drei Settings-Picker (GED-Startpfad, Dokumente, Konfig).
**v845: fix(places): Ort entfernen löscht auch placeObject** — `deleteExtraPlace` entfernt jetzt auch den zugehörigen `placeObjects`-Eintrag (Titelabgleich), damit GOV-Kaskaden-Orte nicht als Zombie in der Liste verbleiben. Lösch-Button auch für reine `placeObjects`-Einträge ohne verknüpfte Personen sichtbar.
**v844: fix(onedrive): Config-Ordner-Pfad** — `_odWriteAppData`/`_odReadAppData` nutzen jetzt `folder.id` (Items-API) statt `folder.relPath` als Root-Pfad → `stammbaum-orte.json` landet korrekt im konfigurierten Config-Ordner statt in OneDrive-Root/Config. `odSetupConfigFolder` befüllt `_odFolderStack` mit Root-Eintrag → Breadcrumb und ← Zurück-Button korrekt wenn GED-Ordner als Startpunkt gewählt wird.
**Seit v785:** dedup-Doppelnamen (v793) · MULTI_FAMC/OPEN_HYPO-Opt-in (v790–v792) · Eltern-Suchpicker im Familiendialog (v794) · String-Orts-Dubletten (v802) · Settings-Fixes (v815–v817) · **v818–v819: PLACE-HIST P3+P4 vollständig** — Typ-Filter + Ort-Suchpicker + Kirche↔Kirchenbuch (v818); Nominatim-Geocoding + GOV-Text-Parser (Browser + `gov-enrich.py`) (v819). · **v820: PLACE-HIST P5a** — Ort-Steckbrief: Ereignisse gruppiert nach Typ + placeId-Matching (P5a-1), Quellen-Sektion (P5a-3), Namens-Timeline SVG (P5a-4), Mini-Karte Leaflet (P5a-5). · **v821: PLACE-HIST P5d** — Geo-Plausibilitäts-Validator (⚠-Button). · **v822: PLACE-HIST P5e** — Geo-Plausibilitäts-Validator (⚠-Button im Orte-Tab): Koordinaten-BBox, Zeitachsen-Konsistenz, enclosedBy-Zirkel. · **v823:** Assoziationen-Buttons (Bearbeiten + Entfernen) nebeneinander statt gestapelt. · **v829: PLACE-HIST resolveAsOf** — GEDCOM-Export schreibt periodenkorrekten PLAC-String (`_resolvedPlaceName` via `resolveAsOf(placeId, year)`) für GRAMPS-Quell-Events mit `placeId`; GEDCOM-Roundtrip net_delta=0 unberührt. · **v843: fix(places): applyGovText Platzhalter auflösen** — `po.title` wird auf primären deutschen Namen gesetzt (wenn Titel = GOV-ID); `_govUnresolved` gelöscht; Titel-Eingabefeld im Modal synchronisiert. · **v842: feat(places): GOV-Platzhalter-Filter + Badge** — `_govUnresolved`-Flag in `collectPlaces` propagiert; `GOV?`-Badge (gelb) in Ortsliste; ⚙-Toggle-Button filtert auf unaufgelöste Platzhalter; `togglePlaceGovFilter` + CLICK_MAP. Browser-verifiziert. · **v841: fix(places): _buildFormString ohne Datum → nur atomarer Name** — year=null: kein Periode bestimmbar → `resolveAsOf(id,null).split(',')[0]` (nur Ortsname, keine Hierarchie). year≠null: weiterhin periodengerechte enclosureChain. net_delta=0 ✓. · **v840: fix(places): Orte-Toolbar iPhone-tauglich** — `.icon-btn` Basis-CSS (40px Mindest-Touchfläche, einheitlicher Rahmen/Hintergrund); Toolbar 2-zeilig (Suchfeld oben, Typ-Select + Buttons darunter mit `margin-left:auto`); `.place-type-filter-sel` auf 40px Höhe angeglichen. Browser-verifiziert. · **v839: fix(places): _buildFormString atomarer Knotenname** — GRAMPS ptitle ist hierarchisch ("Ochtrup, Kreis Steinfurt, NRW"); ohne Datum-Korrektur wurde er als erster Kettenknoten verwendet → doppelte Hierarchie im PLAC-String. Fix: `.split(',')[0].trim()` pro Knoten extrahiert atomaren Namen; enclosureChainAsOf liefert dann saubere Hierarchie. GEDCOM net_delta=0 ✓ GRAMPS stable ✓. · **v838: fix(places): Typ-Filter dynamisch** — `_refreshPlaceTypeFilter` befüllt Select aus tatsächlich vorhandenen Typen (alle 19 aus PLACE_TYPE_LBL, inkl. District/Bezirk, Region, State/Bundesland…); statische Hardcode-Liste entfernt; wird beim ersten `renderPlaceList` ohne sorted-Arg aufgerufen. · **v837: feat(places): Gruppen-Modus in Ortsliste** — ⊙-Toggle fasst alle Einträge mit gleicher placeId unter PlaceObject-Titel zusammen; Varianten-Badge zeigt Anzahl historischer Strings; `_groupPlacesByObject` + `filterPlaces`-Integration; `icon-btn--active` CSS. · **v836: fix(places): collectPlaces placeId aus ev.placeId** — `addPlace` propagiert `ev.placeId` direkt; Registry-Loop nutzt `pl.placeId || findByName` → periodengerechte Hierarchie-Strings bleiben nach Verknüpfung mit placeObject verbunden (Typ, Karte, Steckbrief). · **v835: fix(places): Verknüpfen-Button im Preselect-Modus** — `_updateSlinkSources` überschrieb `_slinkSources` im Preselect-Modus mit leerem Set (keine DOM-Checkboxen sichtbar); Fix: Update nur wenn Source-Sektion sichtbar. Browser-verifiziert: 8 Events korrekt verknüpft. · **v834: fix(places): savePlaceObjects alle Einträge** — Filter `_ep_`-only entfernt; alle placeObjects (inkl. GRAMPS-native mit enclosedBy[]/pnames[]) werden in IDB + stammbaum-orte.json persistiert → beim GEDCOM-Load stehen historische Ketten für Link-Pass + buildFormString zur Verfügung; GRAMPS-Load bleibt sicher (loadPlaceObjectsFromIDB überschreibt nie vorhandene Einträge). · **v833: PLACE-HIST Reimport-Erkennung** — `_linkGedcomEventsToPlaceObjects` zweistufig: (1) exakter findByName; (2) erstes Komma-Segment + `_buildFormString`-Vergleich → periodengerecht exportierte Hierarchie-Strings werden beim Reimport automatisch auf das PlaceObject remappt; net_delta=0 ✓. · **v832: PLACE-HIST Link-Button im Ort-Detail** — „🔗 Mit PlaceObject verknüpfen"-Button direkt im Orts-Steckbrief (nur wenn kein placeId + PlaceObjects vorhanden); Modal öffnet im Pre-select-Modus: Ort-Bar statt Quell-Checkliste, direkt mit PlaceObject-Suche. Toolbar-Button entfernt. · **v831: PLACE-HIST String→PlaceObject Link-Modal** — `_buildFormString` (enclosureChainAsOf → Komma-Join, FORM-kompatibel); `applyStringPlaceLink` + `_buildLinkGroups`; Modal „Ortsstrings verknüpfen" (🔗-Button im Orte-Tab): Quell-Checkboxen, PlaceObject-Suche, Ergebnis-Gruppen-Vorschau mit Perioden + Event-Counts, gruppenweise Bestätigung; `_resolvedPlaceName` nutzt `_buildFormString`; GEDCOM net_delta=0 ✓ GRAMPS stable ✓. · **v830: PLACE-HIST Link-Pass** — `_linkGedcomEventsToPlaceObjects` (gedcom.js): nach GEDCOM-Load werden Events via `findByName` + `resolveAsOf`-Absicherung mit placeObjects verknüpft (`ev.placeId` gesetzt); nur bei exaktem resolveAsOf-Match (inkl. historischer pnames) → net_delta=0 garantiert; aktiviert resolveAsOf-Export + Steckbrief/Validator für GEDCOM-Daten.
**Roundtrip GEDCOM:** stabil, net_delta=0, out1===out2 ✓ — *automatisiert* (`test-roundtrip.js`, CI-tauglich)
**Roundtrip GRAMPS:** stabil, xml1===xml2 ✓, Kern-Records (person/family/source/repository) erhalten ✓ — **automatisiert** (T0-TEST-2, sw v750). Note/Citation deduplizieren bewusst (−116 / −782, analog PEDI). In-Browser-Deep-Test (60034 Checks) bleibt ergänzend.
**Testdaten:** MeineDaten_ancestris.ged (2811 Pers.) · Unsere Familie.gramps (2894 Pers.)

### Gesamtbewertung — überarbeitet 2026-05-31 nach unabhängiger Re-Verifikation (Tests/Roundtrip/CSP/OAuth live im Browser geprüft)

> **Methodik-Hinweis:** Nüchterne Standortbestimmung, kein Verkaufsprospekt. Noten basieren auf direkter Code-Prüfung, nicht auf Doku-Behauptungen. **Re-Verifikation 2026-05-31:** 161 Unit-Tests + GEDCOM-Roundtrip selbst ausgeführt (grün); CSP/OAuth/XSS im laufenden Browser getestet. **Korrektur ggü. Selbstbild:** Die Behauptung „CSP-FINAL: alle Inline-Handler entfernt" war **falsch** — 2 inline-`onclick` (jetzt v794 behoben) + ~48 inline-`style=` werden von der strikten CSP still verworfen (empirisch bestätigt). Architektur-Schuld größer als berichtet (844 statt 762 top-level Funktionen; längste Funktion `_attr` 486 Z.). ∅ daher 8.2 → **8.0**.

| Bereich | Note | Kernbefund |
|---|---|---|
| Architektur | 6.5/10 | Saubere Schichtung + 23 ADRs + Passthrough-Fundament. **844 top-level Funktionen** (gemessen, nicht 762) in flachem Namespace bleiben die Hauptschuld; Modul-Migration faktisch überfällig. De-riskter Pfad belegt (ADR-020 + 2 Brücken). |
| Code-Qualität | 7.0/10 | Lesbar, kein Overengineering, gute „Warum"-Kommentare, JSDoc, 155 `.catch()`. **Abzug:** Monsterfunktionen größer als dokumentiert (`_attr` 486, `_parseINDILine` 388, `showDetail` 294, `writeINDIRecord` 269 Z.); `_esc`/`esc` 4–6× dupliziert. |
| Sicherheit | 8.0/10 | **Überdurchschnittlich** für serverlose PWA: CSP ohne `unsafe-inline/eval`, `object-src 'none'`, enge Allowlist; OAuth PKCE S256 + CSRF-`state` + kein `client_secret` (live verifiziert); kein `eval` im App-Code; `esc()` pervasiv. **Abzug:** CSP nicht lückenlos *durchgesetzt* (tote inline-`on*`/`style=`); Refresh-Token in `sessionStorage` (Restrisiko, ohne Backend alternativlos). |
| Design / UX | 8.5/10 | Hochwertige Ästhetik (Playfair/Source Serif, Dark/Light-Parität, Screenshot-bestätigt), Mobile-First, Onboarding, Skip-Link/ARIA/`prefers-reduced-motion`. **Abzug:** „WCAG 2.1 AA" *ohne axe-Audit*; Handbuch noch mit Mockups; tote inline-`style=` (Befund). |
| Funktionsstand | 8.7/10 | Undo/Redo · Karten-Animation · Evidenzmodell · GPS-Hypothesen · GED7 · GRAMPS · ASSO-Edit · Verwandtschaftsrechner · Eltern-Suchpicker · **Nominatim-Geocoding + GOV-Text-Import (v819)** ✓. **Abzug:** Ausgabe-Reichtum < MFT; Lücken out-of-scope: DNA, Online-Matching, Multi-User. |
| Funktions-Qualität | 8.0/10 | GEDCOM/GRAMPS-Treue exzellent; UI-Flows robust (Browser-verifiziert). **Abzug:** Skalierung >10k Personen ungetestet. |
| Performance | 8.0/10 | Web Worker + virtuelles Scrollen (O(log n)) + LAZY-LOAD (−119 KB Cold-Start) + SW-Cache. Ohne Bundling ~45 Cold-Start-Requests (durch HTTP/2 + SW gemildert). |
| GEDCOM-Konformität | 9.3/10 | **Real reproduziert (2026-05-31):** `net_delta=0` + `out1===out2` auf 83k-Zeilen-Produktionsdatei, Strict-5.5.1 sauber. + GED7-opt-in + GRAMPS-Roundtrip automatisiert (T0-TEST-2). |
| **Tests** | **7.5/10** | GEDCOM- **und** GRAMPS-Roundtrip headless automatisiert. **161 dep-freie Unit-Tests** (alle 28 Validator-Regeln je Positiv-/Negativfall, Parser-Edge-Cases, BFS-Anonymisierung, Evidenz/Hypothesen, Datums-Helfer). **Verbleibend:** keine UI-Logik-Tests; eigenes Harness statt Framework. |
| Dokumentation | 8.5/10 | Außergewöhnlich für Solo-Projekt (23 ADRs, Datamodel, ~2k-Z.-Changelog). **Abzug:** Doku überholte Code (CSP-Claim falsch; Handbuch-Stand hinkt v786–794 nach); Screenshots offen. |
| PWA / Offline | 9.0/10 | Eines der ernsthaftesten PWA-Designs: PRECACHE_CRITICAL (atomar) + PRECACHE_OPTIONAL (`allSettled`); Network-first + 4s-Timeout; Offline-Fallback. |
| Datenschutz | 8.5/10 | Lokal-First ✓ · DSGVO-Anonymisierung BFS ✓ (v715) · kein Datamining, kein Cloud-Zwang. |
| **∅ Gesamt** | **≈ 8.0/10** | *Solide, funktionsreich; drei Disziplinen — GEDCOM/GRAMPS-Treue, Sicherheitshärtung, Testabsicherung — auf wirklich gutem Niveau. Größte verbleibende Hebel: (1) CSP-Durchsetzung lückenlos machen + verifizierbar (CI), (2) Architektur-Schuld (Monsterfunktionen) entschärfen, (3) ggü. MacFamilyTree: Ausgabe-Reichtum + Skalierung.* |

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
| **P5** | **Auswertungen** — Details s. u. | gemischt | in Arbeit |

**Reihenfolge:** §3.0 Verifikation ✅ → P0a-1 ✅ → P0a-2 ✅ → P0b-1 ✅ → P0b-2a ✅ → P0b-2b ✅ → P0b-3 ✅ → Review → P2-UI → P3 → P4 → P5.

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

**Handbuch-Stand: sw v819** *(veraltet — v820–v851 noch nicht dokumentiert: PLACE-HIST P5a/d/e, Orts-Robustheit-Fixes, OneDrive-Picker-Verbesserungen, Topbar-Fix)*

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
| Orts-Geocoding / Gazetteer | ❌ (Leaflet-Karte, keine Orts-DB) | **✅ (Geocoding + Heatmaps)** | ✅ | ✅ |
| Geräte-Sync | ⚠ manuell (OneDrive-Datei) | **✅ nahtlos (CloudKit FamilySync)** | ❌ | ✅ Cloud |
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
- vs. **MacFamilyTree** *(der direkte Maßstab)*: ① Ausgabe-Reichtum (PDF-Bücher, Großposter, 3D-Tree) · ② Orts-Geocoding/Heatmaps · ③ nahtloser Multi-Device-Sync (CloudKit) · ④ Reife/Politur. **Dafür schlägt Stammbaum MFT bei:** GEDCOM-Treue, Forschungsprozess-Rigorosität (GPS/Hypothesen/Kanban), Plattform-Reichweite, Privacy, Preis.
- vs. **GRAMPS:** Tiefe im professionellen Quellen-/Forschungsworkflow; Skalierung; Report-Vielfalt.
- vs. **Ancestry:** DNA + Online-Matching + Milliarden Records — *kategoriefremd und bewusst out-of-scope*.

*Keine offenen **Standards**-Lücken mehr (GEDCOM/GRAMPS abgedeckt). Die spürbarsten Lücken liegen — gemessen am direkten Konkurrenten MFT — bei **Ausgabe-Reichtum**, **Orts-Geocoding** und **Skalierung >10k**; die netzwerk-/datenbankgebundenen Features (DNA/Records) sind Designziel, kein Defizit.*

---

*Aufwand: XS (<1h) · S (1–2h) · M (halber Tag) · L (1–2 Tage) · XL (>2 Tage)*
*Vollständige Sprint-Geschichte inkl. aller abgeschlossenen Items: CHANGELOG.md*
