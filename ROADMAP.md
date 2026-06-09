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

**sw-Version:** v930 · Cache: `stammbaum-v930` · `test-unit.js` = 420 Tests grün · GEDCOM Roundtrip `net_delta=0` stabil · GRAMPS stabil

**SCALE-TEST (2026-06-07):** 20k-GEDCOM Roundtrip net_delta=0 ✅ · Parse 688 ms · Sort (Name) 938 ms · **SORT-CACHE implementiert (v899)** · Parser-Worker bereits vorhanden · Details: SCALE-TEST-BEFUNDE.md

### Zuletzt abgeschlossen — vollständige Details: CHANGELOG.md

**Letzte Highlights** (vollständige Tabelle + ältere Sprints: CHANGELOG.md):

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

### Gesamtbewertung — zuletzt überarbeitet 2026-06-07 (unabhängiges Review, v899; Tabelle aktualisiert auf v909)

> **Methodik:** Nüchterne Standortbestimmung, kein Verkaufsprospekt. Noten basieren auf direkter Code-Prüfung und Browser-Verifikation. **Review 2026-06-07 (v899):** Kernversprechen empirisch nachgeprüft statt aus Doku übernommen — `test-unit.js` **420/420 grün** ausgeführt; GEDCOM-Roundtrip `MeineDaten_ancestris.ged` (83k Z.) **net_delta=0 / stable** (+622 PEDI by design); Strict-5.5.1 strippt sauber; GRAMPS (2894 Pers.) stable (note Δ−116 / citation Δ−782 Dedup, by design); CSP-Header direkt geprüft (kein `unsafe-inline/eval`, `object-src 'none'`, `base-uri 'self'`, `frame-ancestors 'none'`); `esc()` korrekt (5 Zeichen); SCALE-TEST 20k synthetisch belegt. **Korrekturen ggü. der 2026-06-06-Tabelle:** (1) `_attr 486 Z.` war ein Phantom — die Funktion existiert nicht (einziges `_attr` = 3-Zeilen-Helfer); echte Monsterfunktionen: `_parseINDILine` 391, `_parseFAMLine` 298, `writeINDIRecord` 273. (2) Tests 296→**420** + UI-Logik-Tests existieren (v891 Blöcke t–ab). (3) Skalierung „>10k ungetestet" → bis **20k** gemessen (v899).

| Bereich | Note | Kernbefund |
|---|---|---|
| Architektur | 6.8/10 | Saubere Schichtung + **25 ADRs** + Passthrough-Fundament (10 Mechanismen, empirisch tragend). `ViewState` (ADR-025) + `ui-lifecycle.js` schließen PWA-Lifecycle-Lücke. Orts-Speicher von 3 parallelen Quellen auf `placeObjects` konsolidiert (v851–858, gute Selbstkorrektur). **~860 top-level Funktionen** in flachem Namespace + 53 `<script>`-Tags mit manueller Ladereihenfolge bleiben *die* Hauptschuld; Modul-Migration bewusst zurückgestellt (ADR-020, vertretbar). |
| Code-Qualität | **8.0/10** | Lesbar, kein Overengineering, gute „Warum"-Kommentare. Hygiene außergewöhnlich (1 vergessenes `console.log` + 16 TODO in ~38k Z., dichte try/catch). `showDetail` auf ~1 Zeile Boilerplate reduziert (→ `ViewState.setCurrent`). **T0-FUNC-SPLIT abgeschlossen (v904):** `_parseINDILine`/`_parseFAMLine` je → 12 Z. Dispatcher + 4 Level-Helfer; `writeINDIRecord` → 106 Z. + 3 Themen-Helfer. Größter Einzelabzug beseitigt. |
| Sicherheit | 8.5/10 | **Direkt verifiziert:** CSP härter als die meiste produktive SaaS (kein `unsafe-inline/eval`, `object-src 'none'`, `base-uri 'self'`, `frame-ancestors 'none'`, `connect-src` präzise gescoped) + `test-csp.js`; OAuth PKCE S256 + CSRF-`state`; kein `eval` im Produktionscode; `esc()` vollständig + pervasiv. **Abzug:** Refresh-Token in `sessionStorage` (Restrisiko, ohne Backend alternativlos — ADR-021). |
| Design / UX | **8.5/10** | Vollständiges Design-Token-System mit echtem Light-Theme (Parität, nicht invertiert), Playfair/Source Serif self-hosted, Mobile-First, Onboarding, 219 `aria/role` in index.html, `prefers-reduced-motion`. **A11Y-AUDIT abgeschlossen (v905):** axe-core-Messung über alle 6 Kernansichten (Liste, Detail, Baum, Familien, Orte, Quellen) — 0 WCAG 2.1 AA Violations; 5 Kontrastfehler behoben (`--text-muted`, `.p-id`, `.p-kekule`, `.btn-link`, `.tree-half-badge`). WCAG 2.1 AA **belegt, nicht behauptet**. **Abzug:** Handbuch teils noch Mockups. |
| Funktionsstand | **9.1/10** | Undo/Redo · Karten-Animation · Evidenzmodell · GPS-Hypothesen · GED7 · GRAMPS · ASSO-Edit · Verwandtschaftsrechner · Nominatim-Geocoding · GOV-Import (historisch datiert) · Ort-Steckbrief + Ortsbuch-Export (v892) + Validator · Multi-Device-Konflikterkennung. **OUTPUT-RICHNESS Tier A+B+C komplett (v911–v916) + Hofchronik (v917):** Quellenverzeichnis, Forschungsprotokoll-Export, Statistik-Report, Nachkommentafel (d'Aboville), Familienbuch-Buchreife (Cover/Glossar/@page), Großposter-SVG (A1/A0-Vektor), Verwandtschaftsnachweis, Stammtafel-Wall-Chart (Sanduhr-SVG), Ortssippenbuch (narrativ), periodisierter Zeitstrahl (Epochen), Hofchronik (Ort›Hof›Eigentümer/Bewohner+Umzug). **Abzug:** 3D-Tree + DNA/Online-Matching bewusst out-of-scope. |
| Funktions-Qualität | 8.5/10 | GEDCOM/GRAMPS-Treue **empirisch top** (s. Methodik); UI-Flows Browser-verifiziert. View-Robustheit P0–P6 behebt iOS-PWA-Bugs (Void-Artefakte, stale Listen, leere Starts, Toolbar-Cross-Talk) + per-Entität-Scroll-State. Skalierung jetzt bis 20k belegt. **Abzug:** >20k + Echtdaten-Großbestände weiter offen. |
| Performance | 8.0/10 | Web Worker (Parse nicht-blockierend) + virtuelles Scrollen O(log n) + LAZY-LOAD (−119 KB) + Sort-Cache (v899) + dirty-bit. **Abzug:** ~45 Cold-Start-Requests / 53 `<script>`-Tags (flacher Namespace verhindert Bundling — gemildert durch HTTP/2 + SW-Precache). |
| GEDCOM-Konformität | 9.3/10 | `net_delta=0` + `out1===out2` auf 83k-Zeilen-Produktionsdatei (direkt nachgeprüft), Strict-5.5.1 sauber. GED7-opt-in + GRAMPS-Roundtrip automatisiert. Echte, verteidigbare Alleinstellung ggü. MFT/Ancestry. |
| **Tests** | **8.5/10** | GEDCOM + GRAMPS-Roundtrip headless automatisiert. **420 dep-freie Unit-Tests** (Validator, Parser, BFS-Anonymisierung, Evidenz/Hypothesen, Datums-Helfer, PlaceRegistry, Geocoding, Merge, Migration) **+ UI-Logik-Tests** (v891, MiniDOM-Harness, Blöcke t–ab) + `test-scale.js`. **Abzug:** eigenes Harness statt Framework; kein CI-Server (lokal via `osascript`). |
| Dokumentation | **8.7/10** | **25 ADRs** mit „Alternativen erwogen/verworfen" + Datamodel + ~2.2k-Z.-Changelog. Handbuch inhaltlich auf v915 — alle user-relevanten Features dokumentiert (OUTPUT-RICHNESS, Ort-Steckbrief-Erweiterungen, Skalierung, Barrierefreiheit); rein interne Änderungen bewusst ausgespart. **Abzug:** Screenshots teils noch Mockups (→ DOC-SCREENS). |
| PWA / Offline | 9.0/10 | SW direkt geprüft: PRECACHE_CRITICAL (atomar) + PRECACHE_OPTIONAL (`allSettled`); Cache-first für App-Assets, Network-first + 4s-Timeout sonst, `offline.html`-Fallback; `ui-lifecycle.js` mit BFCache-Guard + >60-s-Resume-Heuristik. |
| Datenschutz | 9.0/10 | Lokal-First ✓ · DSGVO-Anonymisierung BFS ✓ (v715) · kein Datamining, kein Tracking, kein Cloud-Zwang. |
| **∅ Gesamt** | **≈ 8.7/10** | *Außergewöhnlich diszipliniertes Solo-Projekt; Kernversprechen (verlustfreie GEDCOM/GRAMPS-Treue, strenge Sicherheit, lokal-first, plattformübergreifend) empirisch bestätigt. T0-FUNC-SPLIT (v904) + CSP-DURCHSETZUNG (v903) beseitigen die stärksten Code-Qualitäts-Abzüge. A11Y-AUDIT (v905) belegt WCAG 2.1 AA. OUTPUT-RICHNESS Tier A+B+C komplett (v911–v916) schließt den größten fachlichen Abstand zu MFT (11 Ausgabe-Formate von Quellenverzeichnis bis Stammtafel-Wall-Chart, Ortssippenbuch und periodisiertem Zeitstrahl). Größte verbleibende Hebel: (1) echte Screenshots statt Mockups im Handbuch → DOC-SCREENS; (2) Skalierung > 20k / Echtdaten → SCALE-REAL.* |

### Maßnahmen aus dem Review 2026-06-07 *(priorisiert nach Hebel/Aufwand)*

| Prio | Maßnahme | Befund aus Review | Aufwand | Verweis |
|---|---|---|---|---|
| **1** | **DOC-SYNC** — Bewertungstabelle + Priorisierungs-Abschnitt von stale/falschen Angaben befreien und an SW-Bumps koppeln | Tabelle (Stand 2026-06-06) nannte Phantom-`_attr 486 Z.`, 296 statt 420 Tests, „keine UI-Logik-Tests", „>10k ungetestet" — alle überholt. | XS | ✅ *dieser Commit* |
| **2** | ✅ **T0-FUNC-SPLIT** — die 3 echten Monsterfunktionen zerlegen | `_parseINDILine` 389→12 Z., `_parseFAMLine` 296→12 Z., `writeINDIRecord` 271→106 Z. in Level-/Themen-Helfer zerlegt. Roundtrip net_delta=0 + 420 Tests grün. | M | ✅ v904 |
| **3** | ✅ **OUTPUT-RICHNESS Tier A+B+C komplett** — Reports/Buch/Poster-Export | Größter fachlicher Abstand zu MacFamilyTree geschlossen. Tier A (Quellenverzeichnis, Forschungsprotokoll, Statistik) + Tier B (Nachkommentafel, Familienbuch-Buchreife, Großposter-SVG, Verwandtschaftsnachweis) + Tier C (Stammtafel-Wall-Chart, Ortssippenbuch, Zeitstrahl) erledigt v911–v916. | L | ✅ v911–v916, s. P4 |
| **4** | ✅ **A11Y-AUDIT** — „WCAG 2.1 AA" belegen statt behaupten | axe-core über 6 Kernansichten: 0 Violations. 5 Kontrastfehler behoben (v905). WCAG 2.1 AA belegt. | S | ✅ v905 |
| 5 | **DOC-SCREENS** — echte Screenshots statt Mockups | Handbuch inhaltlich auf v915 (alle user-relevanten Features dokumentiert, Versionsfelder gesetzt). Verbleibend: Mockups durch echte Screenshots ersetzen. | M | s. Dokumentation |
| 6 | **SCALE-REAL** — Skalierung jenseits 20k + Echtdaten-Großbestand | 20k synthetisch belegt; >20k und reale Großdatei weiter offen. | M | s. P3 |

---

## Design-Constraint

Alle neuen Features müssen den GEDCOM 5.5.1 Roundtrip (`out1===out2`, `net_delta=0`) stabil halten. Neue Datenstrukturen dürfen beim GEDCOM-Export keinen zusätzlichen Delta erzeugen — entweder als Passthrough oder als bekannte, dokumentierte Abweichung. Jede Abweichung muss explizit entschieden und in `ARCHITECTURE.md` (ADR) dokumentiert werden.

---

## Abgeschlossen in v8-dev *(seit v650)*

Vollständige Liste der abgeschlossenen v8-dev-Features (STORY-OPT, WW-PARSER, TL-MULTI, PRINT-OUT, DEDUP-ENH, IMPORT-CMP, CSP-FINAL, T0-REFACT, T0-TYPES, ASSO-DISP, CSV-EXPORT, LIGHT-MODE, VAL-RULES, F5-Anonymisierung, GRAMPS-RT/EDIT u.a.): **CHANGELOG.md**. Zugehörige Architektur-Entscheidungen: **ARCHITECTURE.md** (ADRs).

---

## Priorisierung — überarbeitet 2026-05-31 (nach Re-Verifikation)

Das Test-Sicherheitsnetz und das Modul-Fundament (Pilot) sind erledigt; die Re-Verifikation 2026-05-31 hat **zwei neue, konkrete Engpässe** sichtbar gemacht, die jetzt vor neuen Features stehen:
- ✅ **CSP-Durchsetzung vollständig** (v901–v903): `test-csp.js` JS-Template-Scanner bestätigt 0 inline-`style=`-Fundstellen.
- **Architektur-Schuld** (~860 top-level Funktionen, flacher Namespace) → die Monsterfunktionen sind der konkrete Hebel, nicht die Voll-Modul-Migration. *(Korrektur 2026-06-07: die früher hier genannte „486-Z.-Funktion" `_attr` ist ein Phantom — existiert nicht; echte Längsten s. T0-FUNC-SPLIT.)*

**Reihenfolge:**
1. ✅ **P0 — Test-Sicherheitsnetz** (T0-TEST-2, T0-UNIT): GEDCOM+GRAMPS-Roundtrip automatisiert + 161 Unit-Tests. Regressionsabgesichert.
2. ✅ **P0 — Modul-Fundament-Pilot** (T0-MODULE Phase 1+2): ADR-020 + GRAMPS-/Validator-Cluster als ES-Module. Phasen 3–4 **bewusst zurückgestellt** (Begründung unten).
3. ✅ **P0 — CSP-Durchsetzung verifizierbar machen** *(abgeschlossen v903)*: ① inline-`onclick` entfernt (v794); ② statische inline-`style=` → CSS-Klassen (v902, 10 Dateien, ~50 neue Klassen); ③ dynamische `gramps-tag`-Farben via `data-il-style` + `_applyDynStyles()` (v903); `test-csp.js` JS-Scanner Ergebnis: **0 Fundstellen** — CSP vollständig *belegt* statt behauptet.
4. ✅ **P1 — gezielte Architektur-Entschärfung** *(abgeschlossen v904)*: `_parseINDILine` (389→12 Z.), `_parseFAMLine` (296→12 Z.), `writeINDIRecord` (271→106 Z.) in Level-/Themen-Helfer zerlegt (T0-FUNC-SPLIT).
5. **P2+** — Features. **Verbleibender Zielgruppen-Hebel ggü. MacFamilyTree** (s. Vergleich): **Ausgabe-Reichtum (PDF-Bücher/Poster → OUTPUT-RICHNESS)** als größter fachlicher Abstand; Kamera (mobil → CAM). *(Erledigt seit 2026-05-31: Skalierungstest 20k, Orts-Geocoding Nominatim/GOV.)*

### Architektur-Entscheidung: ES-Modul-Phasen 3–4 + Build-Step zurückgestellt

Kern-Migration + Bundler bringen für Nutzer kaum Mehrwert (PWA-Cache + LAZY-LOAD dominieren) und brechen die bewusst gewählte „edit-anywhere ohne Toolchain"-Eigenschaft (ADR-001/002). Harte Blocker: Worker-`importScripts()`, `idbGet` von 13 Dateien, 59 Brücken-Symbole in `gedcom.js`. **Entscheidung: nicht einführen** — konkreter Wartungs-Hebel ist T0-FUNC-SPLIT, nicht die Voll-Migration. Vollständige Begründung + Phasenplan: **ARCHITECTURE.md ADR-020**. Trigger für Wiederaufnahme: starkes Codebase-Wachstum oder konkrete Namespace-Kollisionen.

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

**Handbuch-Stand: sw v921 *(aktuell — alle user-relevanten Features dokumentiert)*** — Versionsfelder auf v917 gesetzt. **Dokumentiert:** OUTPUT-RICHNESS Tier A+B+C + Hofchronik (Kap. 20 Druckausgaben: A2 Quellenverzeichnis, A3 Forschungsprotokoll, A4 Statistik-Report, B1 Nachkommentafel, B2 Familienbuch-Buchreife, B4 Verwandtschaftsnachweis, Ortsbuch v892, C1 Stammtafel, C2 Ortssippenbuch, C3 Zeitstrahl, Hofchronik v917; Kap. 8 Diagramm-Export PNG + B3 Großposter-SVG); Ort-Steckbrief-Erweiterungen (Orts-Notiz v900, Zugehörigkeit-nach-Jahr inkl. Lücken v908, Zeitraumverteilung); Skalierung/Performance + Barrierefreiheit (WCAG 2.1 AA v905) in FAQ. *Bewusst ohne Handbuch-Eintrag (rein interne Änderungen, keine User-Sichtbarkeit):* View-Robustheit-Internals P0–P6, Koord-Single-Source/-Paar-Invariante, VS-Scroll-Reattach, UI-Logik-Tests T0-UI, CSP-Durchsetzung v901–v903, T0-FUNC-SPLIT v904, Vorname-Normalisierung v909. *(Offen für später: echte Screenshots statt Mockups → DOC-SCREENS.)*

| ID | Aufgabe | Details | Aufwand |
|---|---|---|---|
| **DOC-SYNC** | **Bewertungs- + Priorisierungs-Doku synchron halten** *(Hebel #1 aus Review 2026-06-07 — ✅ Erst-Durchlauf in diesem Commit)* | Die Gesamtbewertungstabelle lief dem Code hinterher (Phantom-`_attr 486`, 296 statt 420 Tests, „keine UI-Logik-Tests", „>10k ungetestet"). **Regel ab jetzt:** bei jedem `CACHE_NAME`-Bump, der eine bewertungsrelevante Zahl ändert (Testanzahl, größte Funktion, Skalierungsgrenze, Feature-Status), die Bewertungstabelle + Vergleichstabelle + Priorisierung mitziehen — analog zur bestehenden sw-Versions-Pflichtregel (CLAUDE.md). Verhindert erneute Drift. | XS (laufend) |
| DOC-SCREENS | **Handbuch: echte Screenshots statt Mockups** | Handbuch inhaltlich auf v915 (alle user-relevanten Features dokumentiert, beide Versionsfelder gesetzt). Verbleibend: alle Mockups durch echte Screenshots ersetzen. Priorität: Sanduhr-Baum, Fächer, Nachkommen-Baum, Zeitleiste, Karte (alle 3 Modi), Personen-Detail, Orts-Steckbrief. | M |

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
| Reports / Bücher / Poster | **✅ sehr gut (12 Formate: Familienbuch m. Cover/Glossar, Ahnenliste, Nachkommentafel d'Aboville, Stammtafel-Wall-Chart, Quellenverzeichnis, Statistik-/Forschungs-Report, Ortsbuch/Ortssippenbuch, Hofchronik, Verwandtschaftsnachweis, Zeitstrahl, Großposter-SVG A1/A0 — v911–v917)** | **✅ exzellent (PDF-Bücher, Großposter)** | ✅ sehr gut | ⚠ mittel |
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
| Skalierung (getestet) | ✅ 20k synthetisch (v899, Parse 688 ms Worker, Sort gecacht) — >20k/Echtdaten offen | ✅ groß erprobt | ✅ 100k+ | Millionen |
| Datenschutz (lokal-first) | **✅ kein Tracking, kein Cloud-Zwang** | ✅ (aber CloudKit-Default) | ✅ | ❌ |
| Lebende anonymisieren | ✅ (v715, BFS beim Export) | ⚠ | ✅ | ⚠ |
| Reife / Politur | ⚠ Solo-Projekt | **✅ 20-J.-Produkt** | ✅ etabliert | ✅ |
| Kosten | **gratis** | €€ einmalig | gratis | €€€ Abo |

**Einzigartige Stärken (real konkurrenzlos):** kostenlose plattformübergreifende Offline-PWA *ohne Installation* + Story-Modus + GRAMPS-Brücke + DSGVO-Anonymisierung + **verifizierte GEDCOM-Treue** + expliziter GPS-Forschungsprozess + kein Datamining. Für die Zielgruppe (mobil + Desktop, datenschutzbewusst, nicht Apple-gebunden) besetzt das eine Nische, die kein kommerzielles Tool exakt abdeckt.

**Ehrliche Lücken vs. Konkurrenz (priorisiert nach Relevanz für die Zielgruppe):**
- vs. **MacFamilyTree** *(der direkte Maßstab)*: ① 3D-Tree (out-of-scope; klassischer Ausgabe-Reichtum mit OUTPUT-RICHNESS Tier A+B+C v911–v916 aufgeholt) · ② nahtloser Multi-Device-Sync (CloudKit — Stammbaum hat Konflikterkennung, aber manuellen Sync) · ③ Reife/Politur. **Dafür schlägt Stammbaum MFT bei:** GEDCOM-Treue, Forschungsprozess-Rigorosität (GPS/Hypothesen/Kanban), historisches Orts-Handling (datierte GOV-Ketten), Plattform-Reichweite, Privacy, Preis.
- vs. **GRAMPS:** Tiefe im professionellen Quellen-/Forschungsworkflow; Skalierung; Report-Vielfalt.
- vs. **Ancestry:** DNA + Online-Matching + Milliarden Records — *kategoriefremd und bewusst out-of-scope*.

*Keine offenen **Standards**-Lücken mehr (GEDCOM/GRAMPS abgedeckt). **Ausgabe-Reichtum** ist mit OUTPUT-RICHNESS Tier A+B+C (v911–v916, 11 Formate) aufgeholt — verbleibend nur 3D-Tree (out-of-scope). Skalierung bis 20k ist seit v899 belegt (>20k/Echtdaten offen). Die netzwerk-/datenbankgebundenen Features (DNA/Records) sind Designziel, kein Defizit.*

---

*Aufwand: XS (<1h) · S (1–2h) · M (halber Tag) · L (1–2 Tage) · XL (>2 Tage)*
*Vollständige Sprint-Geschichte inkl. aller abgeschlossenen Items: CHANGELOG.md*
