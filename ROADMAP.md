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

**sw-Version:** v986 · Cache: `stammbaum-v986` · `test-unit.js` = **475 Tests** grün · `test-csp.js` grün · `test-snapshot-place.js` grün (2 Goldfiles) · GEDCOM Roundtrip `net_delta=0` stabil · GRAMPS stabil · **Pre-Commit-Gate aktiv** (test-csp + test-unit + test-snapshot-place)

**SCALE-TEST (2026-06-07):** 20k-GEDCOM Roundtrip net_delta=0 ✅ · Parse 688 ms · Sort (Name) 938 ms · **SORT-CACHE implementiert (v899)** · Parser-Worker bereits vorhanden · Details: SCALE-TEST-BEFUNDE.md

### Zuletzt abgeschlossen — vollständige Details: CHANGELOG.md

**Letzte Highlights** (vollständige Tabelle + ältere Sprints: CHANGELOG.md):

- **v983–v986 — Historische Ortsanzeige: Projektions-Invariante (ADR-024).** Kernbefund: bei gesetztem `ev.placeId` ist `ev.place` **keine eigene Wahrheit**, sondern die zwischengespeicherte periodengerechte Projektion `_buildFormString(placeId, year)` — Anzeige (`_evFullPlace`) und Writer (`_resolvedPlaceName`) leiten beide live ab. **v984 war falsch** (placeId gesetzt + `ev.place` stale gelassen → stille Massen-Mutation beim nächsten Save), **v985 ersetzt es durch Link-Pass A1**: atomare Cache-Strings (kein Komma) werden per Identitäts-`findByName` verknüpft und auf die Projektion neu kollabiert (+`markChanged` wenn das Modell reicher wurde), Komma-Hierarchien nur bei exaktem Match (fremde/manuelle Hierarchien geschützt); erklärender Info-Toast in `storage-file.js`. **v986** macht stale Ortsstrings auffindbar: Dubletten-Zähler-Badge auf ⇉ (`_refreshPlaceMergeBadge`) — sie erscheinen ohnehin automatisch in der Ortsliste (`collectPlaces`) und werden von der String-Dedup (`_placeStringCoreFold`) mit dem placeObject gruppiert → per Merge lösbar. **Lehre:** `net_delta=0` gilt nur für *unveränderte* Modelle; Orts-Anreicherung darf legitim dirty machen. Details: Memory `place_hist`.
- **v975–v980 — Quellen-Integrität: verwaiste Quellbezüge.** `deleteSource` ruft jetzt `_removeSourceRefs` → entfernt alle `citations[]`/`nameCitations`/`extraNames[].citations`/`associations[].citations`/`topSources`/`childRelations[].citations` der gelöschten SID aus allen Personen + Familien (v980-Fix: `db.individuals` statt `db.persons`). Neue Validator-Regel `ORPHAN_CITATION` (warn) erkennt Bezüge auf nicht mehr vorhandene Quellen (INDI + FAM). Verwaiste Bezüge werden visuell markiert (oranges ⚠-Badge in Detail + Form) und per ✕ direkt entfernbar (`_removeOrphanCitBySid` → re-render via `showDetail`).
- **v969–v973 — Quellen-Darstellung Personendetail:** `nameCitations` werden in der Quellen-Zeile mitangezeigt (v970), Quellen-Chips ins Hero-Banner verlagert (v971), `src-badge`-Link bekommt `cursor:pointer`+Hover (v972), „S."-Prefix bei Seitenangabe/Tooltip entfernt (v969/v973).
- **v981–v982 — Quellen-Selects sortiert:** Aufgabe-Modal (neues `addTaskSrcSid`, gespeichert als `t.sid`) und Forschungsprotokoll zeigen Quellen jetzt nach Kurzname (`abbr || title`) sortiert — wie überall sonst.
- **v974 — Ortsliste-Filter persistent:** `renderPlaceList()` (no-arg) delegiert an `filterPlaces()` mit aktuellem Suchtext, statt direkt zu rendern — Typ-/GOV-Filter, Gruppierung und Suche bleiben nach Tab-Wechsel + Datenänderungen aktiv.
- **v968 — GEDCOM-Writer byte-sichere 255-Byte-Grenze:** CONC/NOTE-Records splitten an Byte- statt Zeichen-Grenze (Mehrbyte-UTF-8-Sicherheit).
- **v951 — Boot-Loader (Start-Indikator):** Vollflächiger Boot-Loader (`#bootLoader` in `index.html`, Styles in `styles.css`, Logik in neuem `boot-loader.js`) sichtbar von der ersten HTML-Parse-Phase bis zur ersten interaktiven Ansicht. Fünf Stages (`code`/`init`/`read`/`parse`/`render`) als Public-API `window.bootStage(key|label, pct?)`, `window.bootHide()` für Ausblendung mit Fade. Wired in `storage.js`: `init` im `'load'`-Handler, `read`/`parse`/`render` in `tryAutoLoad` (Yield via `setTimeout(0)` vor `parseGEDCOM` für sichtbares Stage-Update), `bootHide` in beiden Auto-Load-Pfaden + am Ende des `'load'`-Handlers (Landing-Fallback). Failsafes: 30 s-Timeout, `pageshow` bei BFCache-Rückkehr. CSP-konform (kein Inline-Style/Script).
- **v950 — Refaktor-Härtung nach Selbstkritik:** Vier konkrete Verbesserungen am v949-Split: (1) `winner()`-Duplikation beseitigt — neue Registry-Methode `enclosureWinnerAsOf(placeId, year)` in `gedcom.js`; `enclosureChainAsOf` (Writer) und `_placeDetailEnclosureTimeline` (View) rufen jetzt dieselbe Funktion → WYSIWYG-Invariante strukturell verriegelt statt per Konvention. (2) +18 Unit-Tests für den Kernel (Block (i2)), Total 420 → 438. (3) Helfer-Naming einheitlich `_placeDetail*` (vorher gemischt `_placeHist*` / `_placeDetail*`). (4) Doku entschärft (ROADMAP-Ratings begründet, CHANGELOG proportional).
- **v949 — SHOWPLACE-SPLIT (schmale Variante):** `showPlaceDetail` von **631 → 423 Zeilen** (−33 %) — zwei Logik-Helfer `_placeHistEnclosureTimeline` (78 Z., Verwaltungsgeschichte mit `winner()`-Funktion, WYSIWYG zum GEDCOM-Writer) + `_placeHistHierarchyTimeline` (64 Z., Zugehörigkeit-nach-Jahr mit BFS-Schlüsseljahren) extrahiert, plus 4 triviale Helfer (Hero / LinkButton / Note / MapSection / DeleteRow). Schutz vorher gebaut: `test-snapshot-place.js` mit Goldfile-Vergleich für 2 charakteristische Orte aus `demo.ged` + synthetischem Test-PlaceObject (deckt alle Phase-A-Sub-Sektionen ab). Pre-Commit-Hook erweitert um Snapshot-Gate. Snapshots byte-identisch über beide Phasen.
- **v948 — CSP-Regress-Fix + Pre-Commit-Gate:** Eine inline-`style="margin-top:8px;"` (eingeschleust mit v945-Template-Builder) → Utility-Klasse `.mt-8`; `test-csp.js` zeigt wieder „OK". Neuer `.git/hooks/pre-commit` führt `test-csp.js` + `test-unit.js` vor jedem Commit aus, bricht bei Rot ab; versionierter `setup-hooks.sh` als idempotenter Installer. Strukturelle Lehre: das CSP-/Unit-Test-Sicherheitsnetz war inhaltlich da, lief aber nicht als Gate — die v945-Regression ist 3 Tage geschlüpft. Jetzt verriegelt.
- **v945–v947 — Template-Generator (Frei-konfigurierbar):** Builder erlaubt pro Feld einen Vorbelegungs-Wert (ausgefüllt = implizit gesetzt, leer = abgefragt); `context.implicitMode` schaltet zwischen Chip-im-Kopf (`hidden`) und Vorbelegung mit 🔒 (`prefill`); Ortspicker für `place`/`resi` mit `placeId`-Persistenz in allen vier Save-Pfaden. v946 trennt Wohnort=Adresse vom Ort (`addr=val`, `place`/`placeId` aus ctx). v947 erkennt verknüpfte Eltern/Ehepartner und reused die bestehende Familie (Kind anhängen, Beleg auf `childRelations.citations`/`marr.citations`).
- **v937–v941 — Ortspicker periodengerecht + Verwaltungs-Zeitlinie:** Picker zeigt nur den Haupttitel (`po.title`), trägt aber den damaligen Namen ein (`resolveAsOf(placeId, year)`); `pname`-Duplikate durch Hierarchie-Strings beseitigt (Atomname-Whitelist im Select, `_migratePlaceObjects` auch nach `loadPlaceObjectsFromIDB`); Ort-Steckbrief zeigt Verwaltungs-Zeitlinie identisch zum GEDCOM-Writer (Mittelpunkt-`refYear`, Gewinner-Auflösung, Überlappungs-Badge); `_evFullPlace` Datengap-Fallback auf nächstgelegene Zugehörigkeit.
- **v929–v936 — Validator P17/P18 + UI-Politur:** `ISOLATED_PERSON` (kein famc/fams, Hinweis) + `DISCONNECTED_FROM_ROOT` (BFS vom Probanden, warn) inkl. dynamischem Render der Prüfregel-Checkboxen aus `VAL_RULES`; RESI-Datums-Schnellhilfe (🎂/⚭); Hof-Notiz direkt bei RESI-Events mit passender Adresse.
- **v921–v928 — Ortsdarstellung periodengerecht:** Listen zeigen Kurzname (`shortPlace`), Detail-Zeilen den vollen Hierarchiestring zum Ereigniszeitpunkt (`_evFullPlace`), 🏘-Button springt in den Ort-Steckbrief; BAPM wie CHR als Kerndatum; Such-Index nach File-Open neu aufgebaut; Leer-Segment-Robustheit (`', Ochtrup, , , ,'` und Hierarchiestring-als-Titel).
- **v904 — T0-FUNC-SPLIT:** `_parseINDILine` (389→12 Z.), `_parseFAMLine` (296→12 Z.), `writeINDIRecord` (271→106 Z.) in Level-/Themen-Helfer zerlegt; `_parseSourCitSub` + `_parseFamEvMediaLv3` als geteilte Helfer. Roundtrip net_delta=0 + 420 Tests grün.
- **v901–v903 — CSP-DURCHSETZUNG vollständig:** 62 statische inline-`style=` → CSS-Klassen (~55 neue Klassen); dynamische gramps-tag-Farben via `data-il-style` + `_applyDynStyles()`; `test-csp.js` JS-Template-Scanner → **0 Fundstellen** — CSP belegt statt behauptet.
- **v899 — SCALE-TEST + SORT-CACHE:** 20k-GEDCOM Roundtrip net_delta=0; `UIState._personSortCache` → 0 ms Sort-Overhead nach Erstrender. Detail: SCALE-TEST-BEFUNDE.md.
- **v892 — Ortsreport + Ortsbuch-Export:** Steckbrief mit Namenshäufigkeiten/Zeitverteilung/Hierarchie-Timeline; `exportOrtsbuch()` standalone-HTML.
- **v891 — UI-Logik-Tests (T0-UI):** MiniDOM-Harness, +124 Tests (296→420), Blöcke t–ab verriegeln die P0–P6-Bugklassen.
- **v861–v890 — View-Robustheit P0–P6:** iOS-PWA-Lifecycle + per-Entität-Scroll-State (ADR-025; Detail: VIEW-ROBUSTNESS.md).
- **v796–v858 — PLACE-HIST + Konsolidierung:** placeObjects als Ort-Master, extraPlaces eingefroren, OneDrive-Konflikterkennung (ADR-024; Detail: PLACE-REDESIGN.md).

**Vollständige Sprint-Geschichte seit v796:** CHANGELOG.md

**Roundtrip:** GEDCOM net_delta=0, out1===out2 ✓ · GRAMPS xml1===xml2 ✓ · beide headless automatisiert (`test-roundtrip.js`)
**Testdaten:** MeineDaten_ancestris.ged (2811 Pers.) · Unsere Familie.gramps (2894 Pers.)

### Gesamtbewertung — zuletzt überarbeitet 2026-06-13 (unabhängiges Re-Review v948, nachgezogen v949, gehärtet v950)

> **Methodik:** Nüchterne Standortbestimmung, kein Verkaufsprospekt. Noten basieren auf direkter Code-Prüfung und Browser-Verifikation, keine Übernahme stehengebliebener Doku-Aussagen.
>
> **Re-Review 2026-06-13 (v948):** Kernversprechen direkt nachgeprüft — `test-unit.js` **420/420 grün**; GEDCOM-Roundtrip `MeineDaten_ancestris.ged` (83k Z.) **net_delta=0 / stable / 329 ms** (+622 PEDI by design); Strict-5.5.1 sauber; GRAMPS-Roundtrip (2894 Pers., 2167 ms) stable (note Δ−116 / citation Δ−782 Dedup, by design); `test-csp.js` **grün** (`index.html` frei von inline-`on*=`/`style=`); SCALE-TEST 20k synthetisch belegt (Parse 721 ms cold, Sort-Cache greift ab Erstrender). Architektur-Vermessung: 69 JS-Dateien · 40 178 LOC · 53 Script-Tags · 84 top-level-Funktionen allein in `gedcom.js` · 25 ADRs.
>
> **Drei reale Befunde der Re-Review:**
> 1. **CSP-Regression seit v945 lebte 3 Tage unentdeckt** — ein `style="margin-top:8px;"` im Template-Builder-Block (`index.html:544`). **Behoben in v948** (Utility-Klasse `.mt-8`) + **strukturell verriegelt** durch Pre-Commit-Hook (`test-csp.js` + `test-unit.js`); idempotenter Setup-Hook im `setup-hooks.sh`. Lehre: das Sicherheitsnetz war *inhaltlich* da, aber nicht als *Gate* angebunden.
> 2. **Neue Monsterfunktion im View-Layer entstanden:** `showPlaceDetail` (ui-views-place.js) ist **631 Zeilen** — länger als alle drei T0-FUNC-SPLIT-Opfer (`_parseINDILine` 391 + `_parseFAMLine` 298 + `writeINDIRecord` 273) zusammen. T0-FUNC-SPLIT hat die Parser/Writer beseitigt, im View-Layer ist parallel dasselbe Anti-Pattern gewachsen. **Neuer Hebel: SHOWPLACE-SPLIT** (s. Maßnahmen).
> 3. **`_qtSaveCustom` auf 196 Z. gewachsen** (Familien-Dedup v947) — noch lesbar, aber Grenz-Kandidat für nächste Aufteilung.

| Bereich | Note | Kernbefund |
|---|---|---|
| Architektur | **6.9/10** ↑ | Saubere Schichtung + **25 ADRs** + Passthrough-Fundament (10 Mechanismen, empirisch tragend). `ViewState` (ADR-025) + `ui-lifecycle.js` schließen PWA-Lifecycle-Lücke. Orts-Speicher von 3 parallelen Quellen auf `placeObjects` konsolidiert (v851–858, gute Selbstkorrektur). **SHOWPLACE-SPLIT (v949+v950)** etabliert ein wiederholbares Verfahren für View-Layer-Helfer: erst Snapshot-Schutz, dann Phasen-Extraktion, byte-genauer Verifikation. v950 härtet das Ergebnis: `winner()`-Duplikation beseitigt durch neue Registry-Methode `enclosureWinnerAsOf` — View und Writer rufen jetzt **dieselbe** Funktion, WYSIWYG-Invariante strukturell statt per Konvention verriegelt. **84 top-level-Funktionen allein in `gedcom.js`** + 53 `<script>`-Tags mit manueller Ladereihenfolge bleiben *die* Hauptschuld; Modul-Migration bewusst zurückgestellt (ADR-020, vertretbar). |
| Code-Qualität | **8.0/10** ↑ | Hygiene außergewöhnlich (**1 vergessenes `console.log` + 1 TODO in 40k LOC**, 122 try-Blöcke, 213 innerHTML / 746 esc-Aufrufe ≈ 3.5× pro innerHTML). `showDetail` schlank (→ `ViewState.setCurrent`). T0-FUNC-SPLIT (v904) hat die Parser/Writer-Monster beseitigt; **SHOWPLACE-SPLIT (v949+v950)** hat `showPlaceDetail` von **631 → 423 Z.** zurückgebracht; **QT-SPLIT (v967)** hat `_qtSaveCustom` von **196 → 75 Z.** geschrumpft — 3 Helfer (`_qtApplyPersonFields` 58, `_qtReuseParentFam` 18, `_qtReuseSpouseFam` 20) + 22 neue Unit-Tests (Gruppe ac). Verbleibende >100-Z.-Funktionen: `showDetail` 275, `_pdetLifeData` 195. Die `_build*Html`-Familie (162–213 Z., HTML-Templates) ist deklarativ akzeptabel. |
| Sicherheit | **8.5/10** | **Direkt verifiziert** (Re-Review): CSP härter als die meiste produktive SaaS (kein `unsafe-inline/eval`, `object-src 'none'`, `base-uri 'self'`, `frame-ancestors 'none'`, `connect-src` präzise gescoped); OAuth PKCE S256 + CSRF-`state`; kein `eval`/`new Function` im Produktionscode; `esc()` 5-Zeichen-korrekt + pervasiv. **`test-csp.js` jetzt als Pre-Commit-Gate** verriegelt (v948) — die v945-Regression kann sich strukturell nicht wiederholen. **Abzug:** Refresh-Token in `sessionStorage` (Restrisiko, ohne Backend alternativlos — ADR-021). |
| Design / UX | 8.5/10 | Vollständiges Design-Token-System mit echtem Light-Theme (Parität, nicht invertiert), Playfair/Source Serif self-hosted, Mobile-First, Onboarding, **117 `aria/role` + 297 `data-action`** in index.html, `prefers-reduced-motion`. **A11Y-AUDIT abgeschlossen (v905):** axe-core über alle 6 Kernansichten — 0 WCAG 2.1 AA Violations; 5 Kontrastfehler behoben. **Abzug:** Handbuch teils noch Mockups (→ DOC-SCREENS). |
| Funktionsstand | **9.1/10** | Undo/Redo · Karten-Animation · Evidenzmodell · GPS-Hypothesen · GED7 · GRAMPS · ASSO-Edit · Verwandtschaftsrechner · Nominatim-Geocoding · GOV-Import (historisch datiert) · Ort-Steckbrief + Ortsbuch-Export + **30 Validator-Regeln** (inkl. P17/P18 Vernetzungs-Gruppe v929/v930) · Multi-Device-Konflikterkennung · **Periodengerechte Ortsanzeige in allen Ansichten** (v921–v941, einzigartig im Markt) · **Template-Generator mit impliziten Default-Werten + Familien-Dedup** (v945–v947). **OUTPUT-RICHNESS komplett (v911–v917): 12 Druckausgaben** von Quellenverzeichnis über Stammtafel-Wall-Chart bis Hofchronik. **Abzug:** 3D-Tree + DNA/Online-Matching bewusst out-of-scope. |
| Funktions-Qualität | 8.5/10 | GEDCOM/GRAMPS-Treue **empirisch top** (s. Methodik); UI-Flows Browser-verifiziert. View-Robustheit P0–P6 behebt iOS-PWA-Bugs (Void-Artefakte, stale Listen, leere Starts, Toolbar-Cross-Talk) + per-Entität-Scroll-State. Skalierung bis 20k belegt. **Abzug:** >20k + Echtdaten-Großbestände offen (→ SCALE-REAL). |
| Performance | 8.0/10 | Web Worker (Parse nicht-blockierend) + virtuelles Scrollen O(log n) + LAZY-LOAD (−119 KB) + Sort-Cache (v899) + dirty-bit. **Abzug:** ~45 Cold-Start-Requests / 53 `<script>`-Tags (flacher Namespace verhindert Bundling — gemildert durch HTTP/2 + SW-Precache); erster Sort von 20k bleibt 1 s. |
| GEDCOM-Konformität | 9.3/10 | `net_delta=0` + `out1===out2` auf 83k-Zeilen-Produktionsdatei (Re-Review direkt nachgeprüft, 329 ms), Strict-5.5.1 sauber. GED7-opt-in + GRAMPS-Roundtrip automatisiert. Echte, verteidigbare Alleinstellung ggü. MFT/Ancestry. |
| **Tests** | **8.7/10** ↑ | GEDCOM + GRAMPS-Roundtrip headless. **475 dep-freie Unit-Tests** (u. a. +18 in v950 für `enclosureWinnerAsOf`-Kernel, +22 in v967 Gruppe ac) + UI-Logik T0-UI + `test-scale.js` + `test-csp.js` + **`test-snapshot-place.js` (v949)** — Goldfile-Schutz für `showPlaceDetail`, 2 Test-Orte (Standard + synthetisch-historisch) aus `demo.ged`, byte-genauer Vergleich. **Pre-Commit-Gate** koppelt alle drei (`test-csp` + `test-unit` + `test-snapshot-place`) an jeden Commit. **Abzug:** eigenes Harness statt Framework; kein CI-Server (lokal via `osascript`); Roundtrip bewusst nicht im Hook (~2 s + Datei-Abhängigkeit). |
| Dokumentation | 8.7/10 | **25 ADRs** mit „Alternativen erwogen/verworfen" + Datamodel + ~2.5k-Z.-Changelog. **Handbuch inhaltlich auf v948** (alle user-relevanten Features dokumentiert, beide Versionsfelder gesetzt). **Abzug:** Screenshots teils noch Mockups (→ DOC-SCREENS). |
| PWA / Offline | 9.0/10 | SW (`sw.js` 116 Z.) direkt geprüft: PRECACHE_CRITICAL (atomar) + PRECACHE_OPTIONAL (`allSettled`); Cache-first für App-Assets, Network-first + 4s-Timeout sonst, `offline.html`-Fallback; `ui-lifecycle.js` mit BFCache-Guard + >60-s-Resume-Heuristik. |
| Datenschutz | 9.0/10 | Lokal-First ✓ · DSGVO-Anonymisierung BFS ✓ (v715) · kein Datamining, kein Tracking, kein Cloud-Zwang. |
| **∅ Gesamt** | **≈ 8.6/10** | *Außergewöhnlich diszipliniertes Solo-Projekt (1400+ Commits, 25 ADRs, 475 Unit-Tests + 2 Snapshots). Kernversprechen empirisch bestätigt. T0-FUNC-SPLIT (v904) + CSP-Durchsetzung (v903) + CSP-Pre-Commit-Gate (v948) + **SHOWPLACE-SPLIT (v949)** + **Refaktor-Härtung v950** + **QT-SPLIT (v967)** (3 Helfer, +22 Tests, `_qtSaveCustom` 196→75 Z.) + A11Y-Audit (v905) + OUTPUT-RICHNESS Tier A+B+C (v911–v917) sind das Gerüst dieser v8-Phase. **Verlauf seit Re-Review:** 8.7 (v909, stale) → 8.5 (v948, drei reale Befunde) → 8.6 (v949+v950, Hebel #1+#2+#3) → **8.6 (v967, Hebel #4 QT-Split ✅)**. Größte verbleibende Hebel: (1) DOC-SCREENS — echte Screenshots statt Mockups (M); (2) SCALE-REAL — Skalierung > 20k / Echtdaten (M); (3) ONEDRIVE-AUTO — nahtloser Sync ohne manuellen Trigger (L).* |

### Maßnahmen aus den Reviews *(konsolidiert 2026-06-13)*

#### ✅ Erledigt seit Review 2026-06-07

| Maßnahme | Ergebnis | Verweis |
|---|---|---|
| **T0-FUNC-SPLIT** — die 3 Parser/Writer-Monster zerlegen | `_parseINDILine` 389→12 Z., `_parseFAMLine` 296→12 Z., `writeINDIRecord` 271→106 Z. in Level-/Themen-Helfer | v904 |
| **OUTPUT-RICHNESS Tier A+B+C** — Reports/Buch/Poster | Größter fachlicher Abstand zu MFT geschlossen — 11 neue Druckausgaben + Hofchronik | v911–v917 |
| **A11Y-AUDIT** — WCAG 2.1 AA belegen | axe-core über 6 Kernansichten: 0 Violations; 5 Kontrastfehler behoben | v905 |
| **DOC-SYNC laufend** — Doku an sw-Bumps koppeln | Memory-Regel etabliert; HANDBUCH v948 inhaltlich aktuell | dieser Commit |
| **Hebel #1 CSP-Regress-Fix** *(aus Re-Review 2026-06-13)* | `style="margin-top:8px;"` → `.mt-8`; `test-csp.js` wieder grün | v948 |
| **Hebel #2 Pre-Commit-Gate** *(aus Re-Review 2026-06-13)* | `.git/hooks/pre-commit` (test-csp + test-unit) + `setup-hooks.sh` | v948 |
| **SHOWPLACE-SPLIT (schmale Variante)** *(aus Re-Review 2026-06-13, P1)* | `showPlaceDetail` 631 → 423 Z.; 2 Logik-Helfer (Phase A) + 4 triviale (Phase B); neuer `test-snapshot-place.js` als Goldfile-Schutz + Pre-Commit-Gate-Erweiterung | v949 |
| **Refaktor-Härtung (Selbstkritik-Schleife)** *(v950)* | Vier post-Refactor-Verbesserungen, die die Selbstkritik benannt hat: `winner()`-Duplikation beseitigt (neue Registry-Methode `enclosureWinnerAsOf`, View + Writer rufen dieselbe Funktion); 18 neue Unit-Tests für den Kernel (Edge-Cases: leer / undatiert / Überlappung / Gap / Truncation); Helfer-Naming auf `_placeDetail*` vereinheitlicht; ROADMAP/CHANGELOG entschärft. | v950 |

#### Offen — priorisiert nach Hebel/Aufwand

| Prio | Maßnahme | Befund | Aufwand | Verweis |
|---|---|---|---|---|
| ✅ | **`_qtSaveCustom`-Split** *(v967)* | `_qtSaveCustom` 196→75 Z.: 3 Helfer `_qtApplyPersonFields` / `_qtReuseParentFam` / `_qtReuseSpouseFam` + 22 neue Unit-Tests (Gruppe ac). | S | Code-Qualität 7.9→8.0 |
| 2 | **DOC-SCREENS** — echte Screenshots statt Mockups | Handbuch inhaltlich auf v948. Verbleibend: Mockups durch echte Screenshots ersetzen. Priorität: Sanduhr-Baum, Fächer, Nachkommen-Baum, Zeitleiste, Karte (alle 3 Modi), Personen-Detail, Orts-Steckbrief. | M | s. Dokumentation |
| 3 | **SCALE-REAL** — Skalierung jenseits 20k + Echtdaten-Großbestand | 20k synthetisch belegt; >20k und reale Großdatei (z. B. 50k-MyHeritage-Smart-Match-Export) offen. | M | s. Forschung |
| 4 | **ONEDRIVE-AUTO** — nahtloser Sync ohne manuellen Trigger | Konflikt-Erkennung (v858) löst Datenverlust, aber Sync ist weiter manuell — verbleibende Lücke ggü. MFT/CloudKit. Idee: `visibilitychange`+Heuristik + Pull-Indikator. | L | s. Vergleich |
| 5 | **T0-EXTRAPLACES-CLEANUP** — `stammbaum_extraplaces_*` localStorage entfernen | extraPlaces seit v854 read-only; Migration in placeObjects steht. Schritte: write-Pfad aus `savePlace` entfernen, post-Migration `localStorage.removeItem`, Helfer löschen. **Voraussetzung:** alle Geräte mindestens 1× mit v854+ gestartet (Eigennutzung erfüllt). | S | s. T0 |

---

## Design-Constraint

Alle neuen Features müssen den GEDCOM 5.5.1 Roundtrip (`out1===out2`, `net_delta=0`) stabil halten. Neue Datenstrukturen dürfen beim GEDCOM-Export keinen zusätzlichen Delta erzeugen — entweder als Passthrough oder als bekannte, dokumentierte Abweichung. Jede Abweichung muss explizit entschieden und in `ARCHITECTURE.md` (ADR) dokumentiert werden.

---

## Abgeschlossen in v8-dev *(seit v650)*

Vollständige Liste der abgeschlossenen v8-dev-Features (STORY-OPT, WW-PARSER, TL-MULTI, PRINT-OUT, DEDUP-ENH, IMPORT-CMP, CSP-FINAL, T0-REFACT, T0-TYPES, ASSO-DISP, CSV-EXPORT, LIGHT-MODE, VAL-RULES, F5-Anonymisierung, GRAMPS-RT/EDIT u.a.): **CHANGELOG.md**. Zugehörige Architektur-Entscheidungen: **ARCHITECTURE.md** (ADRs).

---

## Priorisierung — konsolidiert 2026-06-13

**Erledigt (P0+P1, in dieser Reihenfolge angegangen):**

1. ✅ **Test-Sicherheitsnetz** (T0-TEST-2, T0-UNIT) — GEDCOM+GRAMPS-Roundtrip headless + 420 Unit-Tests. Regressionsabgesichert.
2. ✅ **Modul-Fundament-Pilot** (T0-MODULE Phase 1+2) — ADR-020 + GRAMPS-/Validator-Cluster als ES-Module. Phasen 3–4 bewusst zurückgestellt (Begründung unten).
3. ✅ **CSP-Durchsetzung** (v901–v903) — statische inline-`style=` → CSS-Klassen, dynamische `gramps-tag`-Farben via `data-il-style` + `_applyDynStyles()`; `test-csp.js` bestätigt 0 Fundstellen in `index.html`.
4. ✅ **T0-FUNC-SPLIT** (v904) — `_parseINDILine` 389→12, `_parseFAMLine` 296→12, `writeINDIRecord` 271→106 Z.
5. ✅ **OUTPUT-RICHNESS Tier A+B+C** (v911–v917) — 12 Druckausgaben; größter fachlicher Abstand zu MFT geschlossen.
6. ✅ **A11Y-AUDIT** (v905) — WCAG 2.1 AA belegt (axe-core, 0 Violations).
7. ✅ **PLACE-HIST** (v796–v858, ADR-024) — historisch datierte Orte; **periodengerechte UI-Ausgabe** (v921–v941) folgt.
8. ✅ **CSP-Pre-Commit-Gate** (v948) — `test-csp.js` + `test-unit.js` als Pre-Commit-Hook, idempotenter `setup-hooks.sh`. Strukturelle Antwort auf die v945-CSP-Regression.

**Aktive Engpässe (Priorisierung der offenen Maßnahmen siehe oben):**

- **Code-Qualität im View-Layer** — `showPlaceDetail` (631 Z., neue Monsterfunktion) ist der Top-Hebel; `_qtSaveCustom` (196 Z.) als Grenz-Kandidat beobachten. → SHOWPLACE-SPLIT.
- **Handbuch-Politur** — Mockups durch echte Screenshots ersetzen. → DOC-SCREENS.
- **Skalierung jenseits 20k auf Echtdaten** — Synth-Test belegt, Echtdaten offen. → SCALE-REAL.
- **Multi-Device-Sync ohne manuellen Trigger** — verbleibende ggü.-MFT-Lücke. → ONEDRIVE-AUTO.

**Architektur-Schuld** (~860 top-level-Funktionen über 69 JS-Dateien, davon 84 in `gedcom.js`, flacher Namespace) bleibt — der konkrete Hebel sind die Monsterfunktionen (s. SHOWPLACE-SPLIT), nicht die Voll-Modul-Migration. *(Korrektur 2026-06-07: die früher hier genannte „486-Z.-Funktion" `_attr` war ein Phantom — existiert nicht.)*

### Architektur & Startup — konsolidierte Lösungsbewertung 2026-06-13

**Zwei gekoppelte Probleme mit gemeinsamem Wurzelmechanismus** (Multi-File no-Build, ADR-001/002):

1. **Architektur-Schuld:** ~860 Globals über 69 Dateien; ESM-Brücken-Migration stagniert nach 2 Brücken in ~10 Monaten (GRAMPS v751, Validator v752, keine Folgemigration). ADR-020-Phase 3 hat drei harte Blocker: `gedcom-worker.js` `importScripts()`, `idbGet` von 13 Dateien genutzt, 59 Top-Level-Symbole in `gedcom.js`.
2. **Startup-Perf grenzwertig:** ~50 sequenzielle Script-Requests bei Cold-Load, ~1–2 MB Roh-JS-Parse vor App-Boot, jeder `CACHE_NAME`-Bump invalidiert *alle* Assets gleichzeitig.

**Sofort-Maßnahme** (unabhängig von der Architektur, ✅ **v951 erledigt**): **Boot-Loader** (`#bootLoader` in `index.html`, `boot-loader.js`) entkoppelt „perceived" von „actual performance". Die Architektur-Entscheidung muss damit nur noch die *tatsächliche* Ladezeit rechtfertigen, nicht zusätzlich das Stillstandsgefühl.

**Sechs evaluierte Lösungspfade**

| # | Pfad | Architektur | Startup kalt | Startup warm | SW-Bump | Verdikt |
|---|---|---|---|---|---|---|
| 1 | Namespace-Hygiene (IIFE + 1 Namespace pro Datei) | + | 0 | 0 | 0 | Backlog (disziplinär, nicht verriegelt) |
| 2 | Module Worker (`gedcom-worker.js` → `type:'module'`) | + | 0 | 0 | 0 | **Mittelfristig** — räumt einen ADR-020-Blocker |
| 3 | Import Maps statt Bundler | ++ | **–** | 0 | 0 | **Verworfen** — mehr Cold-Load-Requests |
| 4 | Hybrid Source + Bundle parallel | ++ | + | 0 | + | Verworfen — Wartungsfalle, Bundle rottet |
| 5 | Voll-Bundler (esbuild, ADR-001/002 ablösen) | +++ | +++ | + | +++ | **Trigger-basiert** — größter Hebel, höchster ADR-Bruch |
| 6 | Boot-Splitting ohne Bundler (kritisches Shell + Lazy-Inject) | + | + | 0 | + | **Kurz** — Startup-Gewinn ohne ADR-Bruch |

**Detail-Bewertung**

- **Pfad 1 — Namespace-Hygiene:** kosmetisch, keine strukturelle Verriegelung. Wird nur durchgehalten solang die Disziplin trägt. Adressiert nicht die ~860 Alt-Globals.
- **Pfad 2 — Module Worker:** lokaler, klar abgegrenzter Schritt (1–2 Sprints). Beseitigt explizit den ersten der drei ADR-020-Phase-3-Blocker, ohne weitere Migration zu erzwingen. iOS-Safari Module-Worker stabil ab 15+ — Versions-Floor verträglich.
- **Pfad 3 — Import Maps:** liefert echte explizite Deps ohne Bundler, ADR-001/002 unverletzt. **Aber:** ~50 native Module-Requests beim Cold-Load (Discovery-Kaskade) machen genau das schlechter, was wir gerade nicht verschlechtern wollen. Wenn ESM, dann mit Bundler (Pfad 5).
- **Pfad 4 — Hybrid Source + Bundle:** zwei Lade-Pfade synchron zu halten verdoppelt die Wartung; `test-unit.js` Mini-DOM-Harness müsste entscheiden was es testet. Sobald das Bundle einmal „kaputt" geht, weicht man auf Source aus und das Bundle verrottet. Kompromiss-Antwort, die in der Praxis nichts entscheidet.
- **Pfad 5 — Voll-Bundler:** vollständigste Lösung mit Tree-Shaking, Source-Maps, Hot-Reload. Bricht die Gründungs-Entscheidung ADR-001/002 (mobile iCloud-Edit ohne Toolchain) explizit. Solo-Dev mit aktuell hoher Velocity (709 Sprints in 4 Wochen) verliert mehr durch Toolchain-Last als gewonnen wird, **solang** Pfad 6 trägt.
- **Pfad 6 — Boot-Splitting ohne Bundler:** `index.html` lädt im ersten Pass nur das *kritische Shell* (~10–15 Dateien: `gedcom.js`, `storage-file`, `storage`, `ui-views`, `ui-views-person`, das Nötigste). Der Rest wird per `<script>`-Injection nach dem ersten Paint nachgeladen, getriggert vom Boot-Loader-Hook (v951). Komplett ohne Bundler, edit-anywhere bleibt. Manuelle Pflege der Kritisch-Liste ist die offene Frage — kann als zweiter Trigger für Pfad 5 dienen.

**Sequenzierte Empfehlung**

1. ✅ **Sofort:** Boot-Loader (v951, erledigt) — perceived performance entkoppelt
2. 🟡 **Kurz (nächster Sprint-Block):** Pfad 6 — Boot-Splitting ohne Bundler. Vorarbeit: Dependency-Graph der ~50 Dateien einmal exakt vermessen (welche Datei nutzt welches Global vor erstem Paint?)
3. 🟡 **Mittel (parallelisierbar, niedrige Dringlichkeit):** Pfad 2 — Module Worker. Räumt einen ADR-020-Blocker, nicht dringend (Parser läuft im Hintergrund, blockiert nicht Boot)
4. 🔵 **Lang (Trigger-basiert):** Pfad 5 — Voll-Bundler. **Erweiterte Trigger** gegenüber ADR-020-Original („Codebase-Wachstum / Namespace-Kollisionen"): zusätzlich (a) **Boot-Splitting-Manifest pflegt sich nicht mehr von selbst** (Pfad 6 trägt nicht mehr) oder (b) **SW-Bump-Schmerz wird user-sichtbar gemeldet** (Cold-Load nach jedem Update zu lang)

**Verworfen**

- **Pfad 3 (Import Maps):** Architektur-Vorteile real, aber Cold-Load wird messbar schlechter — falsche Richtung für die aktuelle Startup-Sorge.
- **Pfad 4 (Hybrid):** kein klarer Endzustand, Wartungs-Verdoppelung ohne Veriegelung gegen Rotting des Bundle-Pfads.

**Bezug zu bestehenden ADRs**

- **ADR-001/002** („Multi-File HTML + Vanilla JS, kein Build-Step") bleibt **gültig**, solang Pfad 6 die Startup-Perf trägt. Pfad-5-Trigger sind eine *explizite Ausstiegsklausel*.
- **ADR-020** („ESM-Brücken-Pattern, Phasen 3–4 zurückgestellt") bleibt gültig; die Phase-3-Blocker werden durch Pfad 2 (Worker-Blocker) einzeln und billig adressiert, ohne Phase 3 zu starten.

Voll-Detail Phasenplan + Pilot-Befunde: **ARCHITECTURE.md ADR-020** · v951-Sprint: **CHANGELOG.md**.

---

## Forschungstiefe — Ausbauplan ✅ abgeschlossen (P1–P4)

**Ziel:** Forschungsqualität vom „gut" (RLOG/Tasks/Validierung/Dedup) zum durchgängigen Workflow — Pipeline `Dashboard → Aufgabe → Protokoll → Quelle+Bewertung → Hypothese → Auflösung → Dashboard`. **Leitconstraint:** jede persistierte Struktur entweder `_`-Tag mit Writer-Support (reist mit der Datei) oder App-privater IDB-Store + JSON-Export — pro Feld explizit gewählt.

- **P1 RES-DASH** (v772) — Konflikt-/Qualitätsdashboard + Lückenradar (Ampel, Vollständigkeits-Score, 6 Balken, Lücke→Aufgabe).
- **P2 RES-EVAL** (v773–777) — 3-Achsen-Evidenzmodell je Zitat → `_EVAL` (**ADR-022**) + Repository-Rest (Archivtyp/Findbuch-URL).
- **P3 RES-PROJ** (v778–780) — Forschungsprojekte + Kanban (`_TSTAT`) + Research-Timeline.
- **P4 RES-HYPO** (v781–784) — leichtes Hypothesen-System → `_HYPO` (**ADR-023**) + GPS-Beweisführungs-Panel.

**Bewusst draußen:** echtes Zwei-Schichten-Evidenzmodell / Alternativ-Baum-Motor (opfert die Roundtrip-Treue) · Multi-User/Kollaboration (lokal-first → Backlog COLLAB). Voll-Detail: CHANGELOG + ADR-022/023.

---

## Ortstiefe — Ausbauplan (PLACE-HIST) ✅ Kern abgeschlossen

**Ziel:** historische Dimension von Orten (Name & Zugehörigkeit über Zeit), verlustfreie Normalisierung, typisierte Event-Orte — **ohne userspezifische Tags** (Roundtrip-Schutz). Leitidee: `db.placeObjects` als Ort-Master über Standard-GRAMPS-Konstrukte (datierte `<pname>`/`<placeref>`); GEDCOM kollabiert zum periodenkorrekten PLAC-String. Architektur: **ADR-024** · Detail-Design: **PLACE-REDESIGN.md**.

**Abgeschlossen (v796–v822):** Zeitachse Parser/Writer (P0a-1) · `PlaceRegistry` (P0a-2) · Entität-Verknüpfung `collectPlaces` (P0b-1) · Dubletten-Erkennung + Merge-Dialog (P0b-2) · `extraPlaces→placeObjects`-Migration (P0b-3) · historische UI im Orts-Modal (P2) · Typ-Filter + Ort-Suchpicker + Kirche↔Kirchenbuch (P3) · Nominatim-Geocoding + GOV-Import (P4) · Ort-Steckbrief + Geo-Validator + Story-Kontextsatz (P5a/d/e) · Robustheit-Block + String→PlaceLink. **Verifiziert:** GEDCOM net_delta=0, GRAMPS stable. Voll-Detail: CHANGELOG.

**Noch angedacht (P5-Rest, Backlog):**

| ID | Inhalt | Aufwand |
|---|---|---|
| P5b | Karten-Zeitschieber im Orte-Tab (`resolveAsOf(year)` → Marker/Popup nach Jahr; enclosedBy-Layer) | M–L |
| P5c | Pfarrei-Rekonstruktion (Picker + Ereignis-Tabelle untergeordneter Orte + CSV-Export) | M |
| P5f | Orts-Hypothesen (`hypo`-Feld via GRAMPS `<url type="_hypo">` + Steckbrief-Badge) | M |

---

## View-Robustheit — Ausbauplan ✅ abgeschlossen (P0–P6)

Stabiler Ansichtenwechsel iOS-PWA + Desktop (keine „Void"-Artefakte, Listen-Sync nach Edit, persistente Per-Tab-Selektion über PWA-Resume). Befund war: drei nicht-synchronisierte Selektionsquellen + 0 Lifecycle-Handler. **Gelöst (v861–v890):** zentraler `ViewState.setCurrent/getCurrent` (IDB-persistent, exklusiver Fokus) + `ui-lifecycle.js` (visibilitychange/pageshow/pagehide) + dirty-bit + 5 separate Detail-Container mit Per-Entität-Scroll-State. Architektur: **ADR-025** · Detail-Design + File:Line-Befunde: **VIEW-ROBUSTNESS.md** · strukturelle Test-Verriegelung: UI-Logik-Tests (v891).

---

## P0 — Sicherheitsnetz & Fundament ✅ abgeschlossen

Test-Sicherheitsnetz + Modul-Fundament stehen: **GEDCOM- + GRAMPS-Roundtrip** headless automatisiert (`test-roundtrip.js`, `net_delta=0` / `xml1===xml2`) · **420 Unit-Tests** (`test-unit.js`) · **ES-Modul-Pilot** Phase 1+2 (GRAMPS- + Validator-Cluster → `export` + Brücken, **ADR-020**; Phase 3–4 bewusst zurückgestellt). Detail: CHANGELOG + ADR-020.

---

## T0 — Restliche technische Schulden

**✅ Erledigt:** CSP-DURCHSETZUNG (v795, `test-csp.js`) · T0-SW (v743) · T0-XSS (v744, 166 innerHTML auditiert) · T0-TOKEN (**ADR-021**) · T0-TEST/T0-TEST-2 (Roundtrip GEDCOM+GRAMPS) · T0-UNIT (420 Tests) · **T0-FUNC-SPLIT** (v904): `_parseINDILine` 389→12 Z., `_parseFAMLine` 296→12 Z., `writeINDIRecord` 271→106 Z. in Level-/Themen-Helfer zerlegt.
**⛔ Wontfix:** T0-STORAGE (extraPlaces/hofObjects <50 KB, Quota-Risiko theoretisch) · T0-DRY `_esc`-Konsolidierung (erst nach ADR-020 Phase 3 sauber möglich; `showDetail` bereits gegliedert).

**Offen:**

| ID | Aufgabe | Details | Aufwand |
|---|---|---|---|
| **T0-TOPSRC-MERGE** | **`topSources` + `nameCitations` zusammenführen** *(neu 2026-06-14)* | **Hintergrund:** Beide sind „Quellen für die Person", aber strukturell getrennt: `topSources` (GEDCOM `1 SOUR @S@` direkt unter INDI, aus Import) und `nameCitations` (GEDCOM `2 SOUR @S@` unter `1 NAME`, aus Form-Widget). Die GEDCOM-Semantik (Name vs. Person als Ganzes) ist in der Praxis bedeutungslos — kein gängiges Programm nutzt sie konsistent. **Symptom:** Formular-Quellen gingen im Detail-View verloren (v970: Workaround, beide werden jetzt angezeigt). **Cleanup-Optionen:** ① Im Form-Save `nameCitations` in `topSources/topSourcePages/topSourceQUAY` überführen statt separat zu halten. ② Im Writer beide als `1 SOUR` schreiben (NAME-level-SOUR weglassen). ③ Langfristig: `nameCitations`-Feld aus dem Personenmodell entfernen. **Risiko:** GEDCOM-Roundtrip-Test muss nach Schritt ② neu validiert werden (bisher `2 SOUR` unter `NAME` → müsste zu `1 SOUR` werden). | M |
| **T0-EXTRAPLACES-CLEANUP** | **`stammbaum_extraplaces_*` localStorage aufräumen** *(neu 2026-06-06)* | **Hintergrund:** `extraPlaces` war das ursprüngliche Koordinaten-/Übersetzungssystem vor `placeObjects`. Seit v854 ist es als Schreibziel eingefroren — alle Saves gehen in `placeObjects` (IDB + OneDrive). `loadExtraPlaces()` wird noch aufgerufen, damit `_migrateExtraPlacesToPlaceObjects()` Altdaten einmalig überführt. `saveExtraPlaces()` (ui-forms.js:913) schreibt noch in localStorage, ist aber toter Write. **Cleanup-Schritte:** ① `saveExtraPlaces()`-Call in `savePlace` entfernen. ② `_migrateExtraPlacesToPlaceObjects` nach erfolgreichem Durchlauf `localStorage.removeItem(_extraPlacesKey())` aufrufen lassen (idempotent, da Migration selbst idempotent). ③ Wenn alle Instanzen sicher migriert: `loadExtraPlaces()` + `_extraPlacesKey()` + `saveExtraPlaces()` aus ui-forms.js löschen; `db.extraPlaces`-Feld aus AppState entfernen. **Voraussetzung:** mindestens einmaliger App-Start mit v854+ auf allen genutzten Geräten (bei Eigennutzung sofort möglich). **Risiko bei zu frühem Cleanup:** Nutzer mit Altdaten (nie v854+ gestartet) verlieren Koordinaten, die noch nicht in placeObjects migriert wurden. | S |

---

## P1 — Mobile Feldarbeit

**✅ Erledigt:** QUICK-TPL (v759–769, schema-getriebene quellengebundene Erfassungs-Templates — Detail: CHANGELOG).

**Offen:**

| ID | Aufgabe | Details | Aufwand |
|---|---|---|---|
| **CAM** | **Kamera-Integration** | `<input accept="image/*" capture="environment">` → Foto direkt als Medienreferenz zur Person oder Quelle anhängen; kein OneDrive erforderlich; funktioniert iOS + Android PWA nativ. Konkrete Lücke vs. MacFamilyTree iOS. | **S** |

---

## P2 — Onboarding & Forschungsqualität

**✅ Erledigt:** ONBOARDING (v748, Spotlight-Overlay).

**Offen:**

| ID | Aufgabe | Details | Aufwand |
|---|---|---|---|
| F3 | **Pedigree-Collapse** | Mehrfach-Vorfahren im Sanduhr-Baum erkennen + visuell zusammenführen; Inzucht-Koeffizient optional. Voraussetzung: BFS-Algorithmus aus REL-CALC nutzen. | M |

---

## P3 — Desktop-Auswertung & Performance

**✅ Erledigt:** SCALE-TEST 20k + SORT-CACHE (v899) + PARSER-WORKER (vorhanden) — Detail: SCALE-TEST-BEFUNDE.md · CSS-PURGE (v745) · LAZY-LOAD (v747, −119 KB) · ACCESSIBILITY-Grundhärtung (v724).

**Offen:**

| ID | Aufgabe | Details | Aufwand |
|---|---|---|---|
| **SCALE-REAL** | **Skalierung jenseits 20k + Echtdaten-Großbestand** *(Hebel #6 aus Review 2026-06-07)* | 20k synthetisch ist belegt; offen: (1) Lauf bei **50k/100k** (Speicher, IDB-Quota, Snapshot-Undo-Kosten); (2) realer Großbestand (nicht synthetisch — andere Tag-Verteilung, mehr Passthrough). Erst angehen, wenn ein konkreter Bestand das nötig macht. | M |
| ✅ **A11Y-AUDIT** | **WCAG 2.1 AA belegt (v905)** | axe-core 4.9.1 lokal (kein npm) gegen alle 6 Kernansichten. Befunde: nur `color-contrast` im Light-Mode. Fixes: `--text-muted: #8a7050 → #6b5232` (5.0–6.6:1 auf allen Hintergründen); `.p-id opacity: 0.6 → 1`; `.p-kekule` Gold → `--text-muted`; `.btn-link` → `--text-dim`; `.tree-half-badge` Textfarbe → `--text` (dunkel auf Gold-Hintergrund). Ergebnis: **0 Violations** über alle Ansichten. | S |
| **FAN-COLOR** | **Fächer-Chart: Farbe nach Generation** | 6 CSS-Variablen für Generationsstufen statt einheitlich gold; keine Layout-Änderung nötig. | **XS** |

---

## P4 — Visuelle Ausgaben

| ID | Aufgabe | Details | Aufwand |
|---|---|---|---|
| **OUTPUT-RICHNESS** | **Ausgabe-Reichtum — 10 Items** *(Hebel #3 aus Review 2026-06-07 — größter fachlicher Abstand zu MacFamilyTree)* | Fundament: `ui-print.js` (Ahnenliste/Familienbogen/Ortsbuch), `ui-book.js`, `ui-story-person.js`, `ui-chart-export.js` (PNG). Kein Server, kein PDF-Lib — Browser-Druck → PDF. Details s. Unter-Items. | — |
| ✅ **A2** | **Quellenbibliografie (v911)** *(Gramps, RootsMagic, Legacy)* | `_buildBibliographieHtml`/`downloadBibliographie` in `ui-print.js`. Alle Quellen alphabetisch nach Autor-Nachname, bibliografischer Eintrag (Autor. Titel. Verlag. Datum.) + Aufbewahrungsort/Signatur + Belegzählung (Personen/Familien via `sourceRefs`). Orphan-Quellen ohne Beleg markiert; Summary-Kopf. Menü „Quellenverzeichnis". | **S** |
| ✅ **A3** | **Forschungsprotokoll-Export (v912)** *(Gramps, Legacy Family Tree)* | `_buildForschungHtml`/`downloadForschungsProtokoll` in `ui-print.js`. Aufgaben (`_tasks`) + Protokoll (`_rlog`) aller Personen/Familien, gruppiert nach Entität (alphabetisch), Status-Badges (offen/in Arbeit/erledigt) + Kategorie, Protokoll-Ergebnis-Badges (gefunden/teilweise/…) + Repo/Quelle/Datum/Query/Notiz. Summary-Kopf. Menü „Forschungsprotokoll". | **S** |
| ✅ **A4** | **Statistik-Report (v913)** *(Gramps Statistics Gramplet, MacFamilyTree)* | `_buildStatistikHtml`/`downloadStatistik` in `ui-print.js`. Übersichts-Kacheln, Geschlecht + Datenvollständigkeit (Balken-Tabelle), Lebens-/Heiratsalter-Kennzahlen, Kinderzahl-Verteilung, Ereignisse pro Jahrzehnt, Top-15 Nachnamen/Vornamen + Top-12 Geburts-/Sterbeorte. Reuse `_yearFrom`/`_statsTop`/`compactPlace`. Menü „Statistik-Report (PDF)". | **M** |
| ✅ **B1** | **Nachkommentafel-Report (v914)** *(Gramps „Descendant Report", RootsMagic, Legacy)* | `_buildNachkommenHtml`/`downloadNachkommentafel` in `ui-print.js`. d'Aboville-Nummerierung (`1`, `1.1`, `1.1.2` …) via DFS-Traversal über `p.fams`→`fam.children` mit Zyklus-Guard. Pro Person: Generationsüberschrift (röm.), Kurzbiografie (* …, † …), Ehe(n) mit Partner + Heirat, Kinder-Nummern-Verweise. Root = `currentPersonId`. Menü „Nachkommentafel (PDF)". | **M** |
| ✅ **B2** | **Familienbuch-Upgrade: Buchreife (v915)** *(MacFamilyTree, Legacy, Family Tree Maker)* | Ausbau `ui-book.js`: Titelblatt mit Cover-Foto (Primärfoto Proband), `@page { size:A4; margin:2cm }` + `@bottom-right counter(page)` (best-effort), Glossar (Zeichen */~/†/⚰/⚭ + BIRT/CHR/DEAT/BURI + Kekulé-Erklärung) mit `page-break-before`. | **M** |
| ✅ **B3** | **Großposter SVG (A1/A0 Vektor-Export) (v915)** *(MacFamilyTree, Ancestris)* | `_svgToVectorFile`/`exportChartSvgVector` in `ui-chart-export.js`. Aktuelles Diagramm (Fächer/Nachkommen/Sanduhr) als `.svg` (var(--*) aufgelöst), width/height seitenverhältnistreu auf A1-Fit in mm, viewBox bleibt → beliebig skalierbar (A0). Topbar-Button ⬡ neben PNG-Export. | **M** |
| ✅ **B4** | **Verwandtschafts-Zertifikat (v915)** *(MacFamilyTree „Beziehungsnachweis", RootsMagic)* | `_buildRelCertHtml`/`downloadRelCertificate` in `ui-print.js`. Nutzt `calcRelationship`: Verdikt + gemeinsamer Vorfahre + nummerierter Pfad (⬡ am Common Node) als A4-Zertifikat. Button im Verwandtschafts-Modal (`modalRelPath`), ids via `UIState._relCertA/B`. | **M** |
| ✅ **C1** | **Stammtafel Wall Chart (v916)** *(Ancestris, Ahnenblatt, MacFamilyTree)* | `_buildWallChartHtml`/`downloadWallChart` in `ui-print.js`. Vorfahren (Pedigree/Kekulé) + Nachkommen (rekursiv, Blatt-basiert) als kombinierte Sanduhr-SVG, direkt aus der DB berechnet (unabhängig vom Live-Baum), Zyklus-Guard, A4-quer-Druck. Root = `currentPersonId`. Menü „Stammtafel". | **L** |
| ✅ **C2** | **Ortssippenbuch + Narrative (v916)** *(Ahnenblatt, Gramps Place-based Reports)* | `_buildOrtssippenbuchHtml`/`downloadOrtssippenbuch` in `ui-print.js`. Familien nach Ort gruppiert (Heirats-/Geburtsort), je Familie ein erzählender Kurztext (Paar + Heirat + Kinder), TOC. Menü „Ortssippenbuch". | **L** |
| ✅ **C3** | **Periodisierter Zeitstrahl-Ausdruck (v916)** *(MacFamilyTree „Zeitleiste drucken", Gramps Timeline Chart)* | `_buildZeitstrahlHtml`/`downloadZeitstrahl` in `ui-print.js`. Ereignisse von Person + Familie auf horizontaler Zeitachse-SVG, überlagert mit historischen Epochen aus `story-epochs.js` (`_STORY_EPOCHS`), Dekaden-Ticks, A4-quer. Menü „Zeitstrahl (PDF)". | **L** |
| ✅ **HOF-CHRONIK** | **Hofchronik / Hofgeschichten-Buch (v917)** *(Ahnenblatt Hofbuch; Nutzer-Wunsch)* | `_buildHofchronikHtml`/`downloadHofchronik` in `ui-print.js`. Ort › Hof › Eigentümer (PROP) + Bewohner (RESI) mit Familie + Zu-/Wegzug. Nutzt `buildHofIndex` + `hofObjects` (Notiz/Koord); Zu-/Wegzug aus `_hofPersonStations` (RESI/PROP-Kette). Dedup pro Abschnitt nach pid. Zugang: Menü „Hofchronik" + 📖-Button im Höfe-Tab. | **M** |
| MAP-HIST-A | **Vintage-Kartenstil** | CSS-Filter (`sepia/brightness/contrast`) auf OSM-Kacheln; Toggle Modern/Historisch; UIState-Persistenz; kein API-Key. | S |
| MAP-HIST-B | **Historischer Kartenhintergrund (Swisstopo)** | Swisstopo Siegfriedkarte (1883–1949, WMTS) als Layer + Jahres-Dropdown. Coverage: Schweiz + Grenzregionen. Nur sinnvoll nach MAP-HIST-A. | M |

---

## P5 — Standards & Interoperabilität ✅ weitgehend abgeschlossen

**✅ Erledigt:** ASSO-EDIT (v734) · Strict-GEDCOM-Export F6 (v749, **ADR-019**) · GRAMPS-EDIT (v739) · GRAMPS-RT (v737–738) · GED7 komplett — Eval/Parser/Writer/Cross-Transfer/UI (v724–733, **ADR-018**). Keine offenen Standards-Lücken (GEDCOM 5.5.1/7 + GRAMPS abgedeckt). Detail: CHANGELOG.

**Offen:**

| ID | Aufgabe | Details | Aufwand |
|---|---|---|---|
| OBJE-TYPE | **Medien-Typ strukturiert** ⚠ | `m._type` als Vendor-Extension (`2 _TYPE`); ADR erforderlich vor Umsetzung. | S |

---

## Dokumentation

**Handbuch-Stand: sw v947/v948 *(veraltet — v951–v986 noch nicht dokumentiert)*** — Versionsfeld im HANDBUCH auf v947. **User-sichtbar, aber noch ohne Handbuch-Eintrag:** Boot-Loader (v951), verwaiste Quellbezüge (⚠-Badge + ✕-Entfernen + Validator-Regel `ORPHAN_CITATION`, v975–v980), Quellen-Chips im Hero-Banner (v971), sortierte Quellen-Selects in Aufgabe/Forschungsprotokoll (v981–v982), persistenter Ortsliste-Filter (v974), Orts-Dubletten-Badge auf ⇉ (v986). Bereits dokumentiert: 12 Druckausgaben (Kap. 20), Ort-Steckbrief inkl. Verwaltungs-Zeitlinie WYSIWYG (Kap. 7), Validator-Regeln (Kap. 13), Template-Generator (Kap. 4), periodengerechte Ortsanzeige mit 🏘-Sprung (Kap. 4), RESI-Datums-Schnellhilfe + Hof-Notiz-Automatik (Kap. 15), Skalierung/Barrierefreiheit in FAQ. *Bewusst ohne Handbuch-Eintrag (rein interne Änderungen):* View-Robustheit-Internals P0–P6, Koord-Single-Source, Orts-Projektions-Invariante (v983–v985, intern), T0-UI-Tests, CSP-Durchsetzung + Pre-Commit-Gate, T0-FUNC-SPLIT, Vorname-Normalisierung. *(Offen: echte Screenshots statt Mockups → DOC-SCREENS.)*

**DOC-SYNC** *(laufende Regel seit Review 2026-06-07)*: bei jedem `CACHE_NAME`-Bump, der eine bewertungsrelevante Zahl ändert (Testanzahl, größte Funktion, Skalierungsgrenze, Feature-Status), die Bewertungstabelle + Vergleichstabelle + Priorisierung mitziehen — analog zur bestehenden sw-Versions-Pflichtregel (CLAUDE.md). Verhindert Drift wie die 2026-06-06-Tabelle (Phantom-`_attr 486`, 296 statt 420 Tests).

**DOC-SCREENS** (offen, M-Aufwand) → in der Maßnahmen-Tabelle oben.

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

## Vergleich mit etablierten Tools *(faire Einordnung — Stärken der Konkurrenz benannt; aktualisiert 2026-06-13)*

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
| Reports / Bücher / Poster | **✅ sehr gut (12 Formate: Familienbuch m. Cover/Glossar, Ahnenliste, Nachkommentafel d'Aboville, Stammtafel-Wall-Chart, Quellenverzeichnis, Statistik-/Forschungs-Report, Ortsbuch/Ortssippenbuch, Hofchronik, Verwandtschaftsnachweis, Zeitstrahl, Großposter-SVG A1/A0 — v911–v917)** | **✅ exzellent (PDF-Bücher, Großposter)** | ✅ sehr gut | ⚠ mittel |
| Visualisierung | ✅ sehr gut + Story-Modus einzigartig | **✅ exzellent (3D „Virtual Tree", Charts)** | ⚠ mittel | ✅ gut |
| Orts-Geocoding / Gazetteer | ✅ Nominatim + GOV (historisch datiert) | **✅ (Geocoding + Heatmaps)** | ✅ | ✅ |
| Geräte-Sync | ⚠ OneDrive-Datei + Konflikterkennung (v858) | **✅ nahtlos (CloudKit FamilySync)** | ❌ | ✅ Cloud |
| Karte + Zeitleiste | ✅ (hist. Ereignisse, Mehrpersonen-TL) | ✅ | ⚠ | ⚠ |
| Validierungsregeln | ✅ **30 Regeln**, konfigurierbar (inkl. Vernetzungs-Gruppe ISOLATED_PERSON / DISCONNECTED_FROM_ROOT v929/v930) | ⚠ | ✅ | ⚠ |
| Historisch datierte Ortsdarstellung | **✅ einzigartig** — `placeObjects` als single-source, Picker zeigt `po.title` und füllt periodengerechten Namen ein (v937), Verwaltungs-Zeitlinie WYSIWYG zum Writer (v940) | ⚠ Aktualname | ⚠ Place-Hierarchy ja, Zeitachse nein | ⚠ Aktualname |
| Duplikat-Erkennung + Merge | ✅ (Scoring, Gegenüberstellung) | ✅ | ✅ | ⚠ |
| Verwandtschaftsrechner | ✅ (BFS, Cousin-Grade + „entfernt") | ✅ | ✅ | ✅ |
| DNA-Integration | ❌ | ❌ | ⚠ Plugin | **✅ Kernfeature** |
| Online-Matching / Records | ❌ | ⚠ (FamilySearch-Anbindung) | ❌ | **✅ Killer-Feature** |
| Multi-User / Kollaboration | ❌ | ❌ | ❌ | ✅ |
| Skalierung (getestet) | ✅ 20k synthetisch (v899, Parse 688 ms Worker, Sort gecacht) — >20k/Echtdaten offen | ✅ groß erprobt | ✅ 100k+ | Millionen |
| Datenschutz (lokal-first) | **✅ kein Tracking, kein Cloud-Zwang** | ✅ (aber CloudKit-Default) | ✅ | ❌ |
| Lebende anonymisieren | ✅ (v715, BFS beim Export) | ⚠ | ✅ | ⚠ |
| Reife / Politur | ⚠ Solo-Projekt | **✅ 20-J.-Produkt** | ✅ etabliert | ✅ |
| Kosten | **gratis** | €€ einmalig | gratis | €€€ Abo |

**Einzigartige Stärken (real konkurrenzlos):** kostenlose plattformübergreifende Offline-PWA *ohne Installation* + Story-Modus + GRAMPS-Brücke + DSGVO-Anonymisierung + **verifizierte GEDCOM-Treue** (`net_delta=0` auf 83k-Zeilen-Datei, direkt nachgeprüft) + expliziter GPS-Forschungsprozess + **historisch datierte Ortsdarstellung mit periodengerechter Auflösung** (v937–v940 — keine andere Software macht das) + kein Datamining. Für die Zielgruppe (mobil + Desktop, datenschutzbewusst, nicht Apple-gebunden) besetzt das eine Nische, die kein kommerzielles Tool exakt abdeckt.

**Ehrliche Lücken vs. Konkurrenz (priorisiert nach Relevanz für die Zielgruppe):**
- vs. **MacFamilyTree** *(der direkte Maßstab)*: ① 3D-Tree (out-of-scope; klassischer Ausgabe-Reichtum mit OUTPUT-RICHNESS Tier A+B+C v911–v917 aufgeholt) · ② **nahtloser Multi-Device-Sync** (CloudKit — Stammbaum hat Konflikterkennung, aber manuellen Sync → Hebel ONEDRIVE-AUTO offen) · ③ Reife/Politur (MFT 20 Jahre vs. v8-dev 18 Monate). **Dafür schlägt Stammbaum MFT bei:** GEDCOM-Treue, Forschungsprozess-Rigorosität (GPS/Hypothesen/Kanban), **periodengerechtes Orts-Handling** (datierte GOV-Ketten + Picker-Auflösung), Plattform-Reichweite, Privacy, Preis.
- vs. **GRAMPS:** Tiefe im professionellen Quellen-/Forschungsworkflow; Skalierung 100k+; Report-Vielfalt. **Dafür schlägt Stammbaum GRAMPS bei:** PWA-Plattform (mobil!), Story-Modus, Hofchronik, iOS-PWA-Lifecycle-Robustheit (ADR-025).
- vs. **Ancestry / MyHeritage:** DNA + Online-Matching + Milliarden Records — *kategoriefremd und bewusst out-of-scope*. Dafür macht Stammbaum das, was diese SaaS nicht können: **lokal bleiben**.

*Keine offenen **Standards**-Lücken mehr (GEDCOM/GRAMPS abgedeckt). **Ausgabe-Reichtum** ist mit OUTPUT-RICHNESS Tier A+B+C + Hofchronik (v911–v917, 12 Formate) aufgeholt — verbleibend nur 3D-Tree (out-of-scope). Skalierung bis 20k ist seit v899 belegt (>20k/Echtdaten offen → SCALE-REAL). Die netzwerk-/datenbankgebundenen Features (DNA/Records) sind Designziel, kein Defizit.*

---

*Aufwand: XS (<1h) · S (1–2h) · M (halber Tag) · L (1–2 Tage) · XL (>2 Tage)*
*Vollständige Sprint-Geschichte inkl. aller abgeschlossenen Items: CHANGELOG.md*
