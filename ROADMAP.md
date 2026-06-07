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

**sw-Version:** v900 · Cache: `stammbaum-v900` · `test-unit.js` = 420 Tests grün · GEDCOM Roundtrip `net_delta=0` stabil · GRAMPS stabil

**SCALE-TEST (2026-06-07):** 20k-GEDCOM Roundtrip net_delta=0 ✅ · Parse 688 ms · Sort (Name) 938 ms · **SORT-CACHE implementiert (v899)** · Parser-Worker bereits vorhanden · Details: SCALE-TEST-BEFUNDE.md

### Zuletzt abgeschlossen — vollständige Details: CHANGELOG.md

**Letzte Highlights** (vollständige Tabelle + ältere Sprints: CHANGELOG.md):

- **v899 — SCALE-TEST + SORT-CACHE:** 20k-GEDCOM Roundtrip net_delta=0; `UIState._personSortCache` → 0 ms Sort-Overhead nach Erstrender. Detail: SCALE-TEST-BEFUNDE.md.
- **v892 — Ortsreport + Ortsbuch-Export:** Steckbrief mit Namenshäufigkeiten/Zeitverteilung/Hierarchie-Timeline; `exportOrtsbuch()` standalone-HTML.
- **v891 — UI-Logik-Tests (T0-UI):** MiniDOM-Harness, +124 Tests (296→420), Blöcke t–ab verriegeln die P0–P6-Bugklassen.
- **v861–v890 — View-Robustheit P0–P6:** iOS-PWA-Lifecycle + per-Entität-Scroll-State (ADR-025; Detail: VIEW-ROBUSTNESS.md).
- **v796–v858 — PLACE-HIST + Konsolidierung:** placeObjects als Ort-Master, extraPlaces eingefroren, OneDrive-Konflikterkennung (ADR-024; Detail: PLACE-REDESIGN.md).

**Vollständige Sprint-Geschichte seit v796:** CHANGELOG.md

**Roundtrip:** GEDCOM net_delta=0, out1===out2 ✓ · GRAMPS xml1===xml2 ✓ · beide headless automatisiert (`test-roundtrip.js`)
**Testdaten:** MeineDaten_ancestris.ged (2811 Pers.) · Unsere Familie.gramps (2894 Pers.)

### Gesamtbewertung — zuletzt überarbeitet 2026-06-07 (unabhängiges Review, v899)

> **Methodik:** Nüchterne Standortbestimmung, kein Verkaufsprospekt. Noten basieren auf direkter Code-Prüfung und Browser-Verifikation. **Review 2026-06-07 (v899):** Kernversprechen empirisch nachgeprüft statt aus Doku übernommen — `test-unit.js` **420/420 grün** ausgeführt; GEDCOM-Roundtrip `MeineDaten_ancestris.ged` (83k Z.) **net_delta=0 / stable** (+622 PEDI by design); Strict-5.5.1 strippt sauber; GRAMPS (2894 Pers.) stable (note Δ−116 / citation Δ−782 Dedup, by design); CSP-Header direkt geprüft (kein `unsafe-inline/eval`, `object-src 'none'`, `base-uri 'self'`, `frame-ancestors 'none'`); `esc()` korrekt (5 Zeichen); SCALE-TEST 20k synthetisch belegt. **Korrekturen ggü. der 2026-06-06-Tabelle:** (1) `_attr 486 Z.` war ein Phantom — die Funktion existiert nicht (einziges `_attr` = 3-Zeilen-Helfer); echte Monsterfunktionen: `_parseINDILine` 391, `_parseFAMLine` 298, `writeINDIRecord` 273. (2) Tests 296→**420** + UI-Logik-Tests existieren (v891 Blöcke t–ab). (3) Skalierung „>10k ungetestet" → bis **20k** gemessen (v899).

| Bereich | Note | Kernbefund |
|---|---|---|
| Architektur | 6.8/10 | Saubere Schichtung + **25 ADRs** + Passthrough-Fundament (10 Mechanismen, empirisch tragend). `ViewState` (ADR-025) + `ui-lifecycle.js` schließen PWA-Lifecycle-Lücke. Orts-Speicher von 3 parallelen Quellen auf `placeObjects` konsolidiert (v851–858, gute Selbstkorrektur). **~860 top-level Funktionen** in flachem Namespace + 53 `<script>`-Tags mit manueller Ladereihenfolge bleiben *die* Hauptschuld; Modul-Migration bewusst zurückgestellt (ADR-020, vertretbar). |
| Code-Qualität | 7.0/10 | Lesbar, kein Overengineering, gute „Warum"-Kommentare. Hygiene außergewöhnlich (1 vergessenes `console.log` + 16 TODO in ~38k Z., dichte try/catch). `showDetail` auf ~1 Zeile Boilerplate reduziert (→ `ViewState.setCurrent`). **Abzug:** echte Monsterfunktionen `_parseINDILine` 391 Z., `_parseFAMLine` 298 Z., `writeINDIRecord` 273 Z. (Parser-Dispatch mit `_ptDepth`-Zustand = höchstes Regressionsrisiko-pro-Zeile). |
| Sicherheit | 8.5/10 | **Direkt verifiziert:** CSP härter als die meiste produktive SaaS (kein `unsafe-inline/eval`, `object-src 'none'`, `base-uri 'self'`, `frame-ancestors 'none'`, `connect-src` präzise gescoped) + `test-csp.js`; OAuth PKCE S256 + CSRF-`state`; kein `eval` im Produktionscode; `esc()` vollständig + pervasiv. **Abzug:** Refresh-Token in `sessionStorage` (Restrisiko, ohne Backend alternativlos — ADR-021). |
| Design / UX | 8.0/10 | Vollständiges Design-Token-System mit echtem Light-Theme (Parität, nicht invertiert), Playfair/Source Serif self-hosted, Mobile-First, Onboarding, 219 `aria/role` in index.html, `prefers-reduced-motion`. **Abzug:** „WCAG 2.1 AA" *behauptet, nicht gemessen* (kein axe/Lighthouse-Audit → A11Y-AUDIT); Handbuch teils noch Mockups. |
| Funktionsstand | 8.8/10 | Undo/Redo · Karten-Animation · Evidenzmodell · GPS-Hypothesen · GED7 · GRAMPS · ASSO-Edit · Verwandtschaftsrechner · Nominatim-Geocoding · GOV-Import (historisch datiert) · Ort-Steckbrief + Ortsbuch-Export (v892) + Validator · Multi-Device-Konflikterkennung. **Abzug:** Ausgabe-Reichtum < MFT (kein PDF-Buch/Poster); DNA/Online-Matching bewusst out-of-scope. |
| Funktions-Qualität | 8.5/10 | GEDCOM/GRAMPS-Treue **empirisch top** (s. Methodik); UI-Flows Browser-verifiziert. View-Robustheit P0–P6 behebt iOS-PWA-Bugs (Void-Artefakte, stale Listen, leere Starts, Toolbar-Cross-Talk) + per-Entität-Scroll-State. Skalierung jetzt bis 20k belegt. **Abzug:** >20k + Echtdaten-Großbestände weiter offen. |
| Performance | 8.0/10 | Web Worker (Parse nicht-blockierend) + virtuelles Scrollen O(log n) + LAZY-LOAD (−119 KB) + Sort-Cache (v899) + dirty-bit. **Abzug:** ~45 Cold-Start-Requests / 53 `<script>`-Tags (flacher Namespace verhindert Bundling — gemildert durch HTTP/2 + SW-Precache). |
| GEDCOM-Konformität | 9.3/10 | `net_delta=0` + `out1===out2` auf 83k-Zeilen-Produktionsdatei (direkt nachgeprüft), Strict-5.5.1 sauber. GED7-opt-in + GRAMPS-Roundtrip automatisiert. Echte, verteidigbare Alleinstellung ggü. MFT/Ancestry. |
| **Tests** | **8.5/10** | GEDCOM + GRAMPS-Roundtrip headless automatisiert. **420 dep-freie Unit-Tests** (Validator, Parser, BFS-Anonymisierung, Evidenz/Hypothesen, Datums-Helfer, PlaceRegistry, Geocoding, Merge, Migration) **+ UI-Logik-Tests** (v891, MiniDOM-Harness, Blöcke t–ab) + `test-scale.js`. **Abzug:** eigenes Harness statt Framework; kein CI-Server (lokal via `osascript`). |
| Dokumentation | 8.5/10 | **25 ADRs** mit „Alternativen erwogen/verworfen" + Datamodel + ~2.2k-Z.-Changelog. **Abzug:** Bewertungstabelle lief dem Code hinterher (Phantom-`_attr`, Testzahl, Skalierung — jetzt korrigiert → DOC-SYNC); Handbuch sw v858 (v859–v899 offen → DOC-SCREENS); Screenshots teils Mockups. |
| PWA / Offline | 9.0/10 | SW direkt geprüft: PRECACHE_CRITICAL (atomar) + PRECACHE_OPTIONAL (`allSettled`); Cache-first für App-Assets, Network-first + 4s-Timeout sonst, `offline.html`-Fallback; `ui-lifecycle.js` mit BFCache-Guard + >60-s-Resume-Heuristik. |
| Datenschutz | 9.0/10 | Lokal-First ✓ · DSGVO-Anonymisierung BFS ✓ (v715) · kein Datamining, kein Tracking, kein Cloud-Zwang. |
| **∅ Gesamt** | **≈ 8.3/10** | *Außergewöhnlich diszipliniertes Solo-Projekt; Kernversprechen (verlustfreie GEDCOM/GRAMPS-Treue, strenge Sicherheit, lokal-first, plattformübergreifend) empirisch bestätigt. Keine unkorrigierte Fehlentscheidung der Vergangenheit gefunden. Größte verbleibende Hebel: (1) Monsterfunktionen zerlegen → T0-FUNC-SPLIT; (2) ggü. MFT Ausgabe-Reichtum → OUTPUT-RICHNESS; (3) A11y messen → A11Y-AUDIT; (4) Doku-Drift schließen → DOC-SYNC.* |

### Maßnahmen aus dem Review 2026-06-07 *(priorisiert nach Hebel/Aufwand)*

| Prio | Maßnahme | Befund aus Review | Aufwand | Verweis |
|---|---|---|---|---|
| **1** | **DOC-SYNC** — Bewertungstabelle + Priorisierungs-Abschnitt von stale/falschen Angaben befreien und an SW-Bumps koppeln | Tabelle (Stand 2026-06-06) nannte Phantom-`_attr 486 Z.`, 296 statt 420 Tests, „keine UI-Logik-Tests", „>10k ungetestet" — alle überholt. | XS | ✅ *dieser Commit* |
| **2** | **T0-FUNC-SPLIT** — die 3 echten Monsterfunktionen zerlegen | `_parseINDILine` 391, `_parseFAMLine` 298, `writeINDIRecord` 273 Z.; verschachtelte `_ptDepth`-Zustandslogik = höchstes Regressionsrisiko. Roundtrip- + Unit-Tests decken die Risiken bereits ab. | M | s. T0 (korrigiert) |
| **3** | **OUTPUT-RICHNESS** — echter PDF-Buch-/Poster-Export | Größter fachlicher Abstand zu MacFamilyTree für die Zielgruppe; Fundament vorhanden (`ui-print.js`, `ui-book.js`, `exportOrtsbuch` v892). | L | s. P4 (neu) |
| **4** | **A11Y-AUDIT** — „WCAG 2.1 AA" belegen statt behaupten | A11y ist gut gemacht (219 aria/role, Skip-Link, reduced-motion), aber nie mit axe/Lighthouse gemessen. | S | s. P3 (neu) |
| 5 | **DOC-SCREENS / Handbuch v859–v899** — echte Screenshots + Versionsfelder | Handbuch hängt auf sw v858; CLAUDE.md-Pflicht (beide Versionsfelder). | M | s. Dokumentation |
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
- **CSP-Durchsetzung ist lückenhaft** (Doku behauptete „vollständig"). Tote inline-`on*`/`style=` → CSP-DURCHSETZUNG (s. P0).
- **Architektur-Schuld** (~860 top-level Funktionen, flacher Namespace) → die Monsterfunktionen sind der konkrete Hebel, nicht die Voll-Modul-Migration. *(Korrektur 2026-06-07: die früher hier genannte „486-Z.-Funktion" `_attr` ist ein Phantom — existiert nicht; echte Längsten s. T0-FUNC-SPLIT.)*

**Reihenfolge:**
1. ✅ **P0 — Test-Sicherheitsnetz** (T0-TEST-2, T0-UNIT): GEDCOM+GRAMPS-Roundtrip automatisiert + 161 Unit-Tests. Regressionsabgesichert.
2. ✅ **P0 — Modul-Fundament-Pilot** (T0-MODULE Phase 1+2): ADR-020 + GRAMPS-/Validator-Cluster als ES-Module. Phasen 3–4 **bewusst zurückgestellt** (Begründung unten).
3. **P0 — CSP-Durchsetzung verifizierbar machen** *(neu 2026-05-31)*: ① ✅ inline-`onclick` entfernt (v794); ② tote inline-`style=` → CSS-Klassen (CSP-DURCHSETZUNG); ③ CSP-Report-Only-Selbsttest, damit „CSP vollständig" *belegt* statt behauptet ist. **Kleiner Aufwand, schließt einen echten Funktions-/Robustheits-Bug-Typ.**
4. **P1 — gezielte Architektur-Entschärfung**: die 3 echten Monsterfunktionen (`_parseINDILine` 391, `_parseFAMLine` 298, `writeINDIRecord` 273 Z.) zerlegen — unabhängig vom Modulsystem, größter Wartungs-Hebel (T0-FUNC-SPLIT).
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

**✅ Erledigt:** CSP-DURCHSETZUNG (v795, `test-csp.js`) · T0-SW (v743) · T0-XSS (v744, 166 innerHTML auditiert) · T0-TOKEN (**ADR-021**) · T0-TEST/T0-TEST-2 (Roundtrip GEDCOM+GRAMPS) · T0-UNIT (420 Tests).
**⛔ Wontfix:** T0-STORAGE (extraPlaces/hofObjects <50 KB, Quota-Risiko theoretisch) · T0-DRY `_esc`-Konsolidierung (erst nach ADR-020 Phase 3 sauber möglich; `showDetail` bereits gegliedert).

**Offen:**

| ID | Aufgabe | Details | Aufwand |
|---|---|---|---|
| **T0-FUNC-SPLIT** | **Größte Funktionen zerlegen** *(Hebel #2 aus Review 2026-06-07)* | Die 3 längsten Funktionen — `_parseINDILine` **391**, `_parseFAMLine` **298**, `writeINDIRecord` **273** Z. (gemessen 2026-06-07; das früher gelistete `_attr` 486 ist ein Phantom, `showDetail` ist bereits auf ~1 Z. Boilerplate reduziert) — in benannte Teilschritte gliedern. Parser-Dispatch mit verschachtelter `_ptDepth`-Zustandslogik = höchstes Regressionsrisiko-pro-Zeile. Unabhängig vom Modulsystem. Roundtrip- (`net_delta=0`) + Unit-Tests (420) decken die Risiken. Größter konkreter Wartungs-Hebel. | M |
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
| **A11Y-AUDIT** | **„WCAG 2.1 AA" belegen statt behaupten** *(Hebel #4 aus Review 2026-06-07)* | A11y ist gut umgesetzt (219 aria/role, Skip-Link, `:focus-visible`, `aria-invalid`, `prefers-reduced-motion`) aber nie **gemessen**. Lighthouse-A11y-Lauf + axe-core (als Bookmarklet oder einmaliges DevTools-Audit, kein npm-Dependency) gegen die 6 Kernansichten (Liste, Detail, Baum, Formular, Karte, Modal); gefundene Verstöße fixen; danach Claim belegt führen. | S |
| **FAN-COLOR** | **Fächer-Chart: Farbe nach Generation** | 6 CSS-Variablen für Generationsstufen statt einheitlich gold; keine Layout-Änderung nötig. | **XS** |

---

## P4 — Visuelle Ausgaben

| ID | Aufgabe | Details | Aufwand |
|---|---|---|---|
| **OUTPUT-RICHNESS** | **PDF-Buch + Großposter-Export** *(Hebel #3 aus Review 2026-06-07 — größter fachlicher Abstand zu MacFamilyTree)* | Aktuell: HTML/Print begrenzt (`ui-print.js` Kekule/Familienbogen, `ui-book.js`, `exportOrtsbuch` v892). Ziel: ① mehrseitiges **Familienbuch** (Titelblatt, Inhaltsverzeichnis, pro-Person-Steckbrief mit Foto/Quellen/Story, Index) als druckfertiges Standalone-HTML mit sauberer `@media print`-Paginierung (Seitenumbrüche, Kopf-/Fußzeilen, Seitenzahlen); ② **Großposter** (Sanduhr/Nachkommen als skalierbares SVG für DIN-A1/A0-Druck). Kein Server, kein PDF-Lib-Dependency nötig — Browser-Druck → PDF. Baut auf vorhandenem Print-Fundament auf. | L |
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

**Handbuch-Stand: sw v858** *(veraltet — v859–v900 noch nicht dokumentiert: UX-Polish Orte-Steckbrief + View-Robustheit P0–P6 + Koord-Paar-Invariante + Koord-Löschen + po-gewinnt-immer + Ereignisliste/-gruppen + VS-Scroll-Reattach + UI-Logik-Tests T0-UI + Ortsreport/Ortsbuch v892 + SCALE/SORT-CACHE v899 + Orts-Notiz v900)*

| ID | Aufgabe | Details | Aufwand |
|---|---|---|---|
| **DOC-SYNC** | **Bewertungs- + Priorisierungs-Doku synchron halten** *(Hebel #1 aus Review 2026-06-07 — ✅ Erst-Durchlauf in diesem Commit)* | Die Gesamtbewertungstabelle lief dem Code hinterher (Phantom-`_attr 486`, 296 statt 420 Tests, „keine UI-Logik-Tests", „>10k ungetestet"). **Regel ab jetzt:** bei jedem `CACHE_NAME`-Bump, der eine bewertungsrelevante Zahl ändert (Testanzahl, größte Funktion, Skalierungsgrenze, Feature-Status), die Bewertungstabelle + Vergleichstabelle + Priorisierung mitziehen — analog zur bestehenden sw-Versions-Pflichtregel (CLAUDE.md). Verhindert erneute Drift. | XS (laufend) |
| DOC-SCREENS | **Handbuch: echte Screenshots + v859–v899** | Alle Mockups durch echte Screenshots ersetzen + Versionsfelder (beide, CLAUDE.md-Pflicht) auf aktuelle sw-Version. Priorität: Sanduhr-Baum, Fächer, Nachkommen-Baum, Zeitleiste, Karte (alle 3 Modi), Personen-Detail, Orts-Steckbrief. | M |

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
| Skalierung (getestet) | ✅ 20k synthetisch (v899, Parse 688 ms Worker, Sort gecacht) — >20k/Echtdaten offen | ✅ groß erprobt | ✅ 100k+ | Millionen |
| Datenschutz (lokal-first) | **✅ kein Tracking, kein Cloud-Zwang** | ✅ (aber CloudKit-Default) | ✅ | ❌ |
| Lebende anonymisieren | ✅ (v715, BFS beim Export) | ⚠ | ✅ | ⚠ |
| Reife / Politur | ⚠ Solo-Projekt | **✅ 20-J.-Produkt** | ✅ etabliert | ✅ |
| Kosten | **gratis** | €€ einmalig | gratis | €€€ Abo |

**Einzigartige Stärken (real konkurrenzlos):** kostenlose plattformübergreifende Offline-PWA *ohne Installation* + Story-Modus + GRAMPS-Brücke + DSGVO-Anonymisierung + **verifizierte GEDCOM-Treue** + expliziter GPS-Forschungsprozess + kein Datamining. Für die Zielgruppe (mobil + Desktop, datenschutzbewusst, nicht Apple-gebunden) besetzt das eine Nische, die kein kommerzielles Tool exakt abdeckt.

**Ehrliche Lücken vs. Konkurrenz (priorisiert nach Relevanz für die Zielgruppe):**
- vs. **MacFamilyTree** *(der direkte Maßstab)*: ① Ausgabe-Reichtum (PDF-Bücher, Großposter, 3D-Tree) · ② nahtloser Multi-Device-Sync (CloudKit — Stammbaum hat Konflikterkennung, aber manuellen Sync) · ③ Reife/Politur. **Dafür schlägt Stammbaum MFT bei:** GEDCOM-Treue, Forschungsprozess-Rigorosität (GPS/Hypothesen/Kanban), historisches Orts-Handling (datierte GOV-Ketten), Plattform-Reichweite, Privacy, Preis.
- vs. **GRAMPS:** Tiefe im professionellen Quellen-/Forschungsworkflow; Skalierung; Report-Vielfalt.
- vs. **Ancestry:** DNA + Online-Matching + Milliarden Records — *kategoriefremd und bewusst out-of-scope*.

*Keine offenen **Standards**-Lücken mehr (GEDCOM/GRAMPS abgedeckt). Die spürbarste Lücke liegt — gemessen am direkten Konkurrenten MFT — bei **Ausgabe-Reichtum** (PDF-Buch/Poster → OUTPUT-RICHNESS); Skalierung bis 20k ist seit v899 belegt (>20k/Echtdaten offen). Die netzwerk-/datenbankgebundenen Features (DNA/Records) sind Designziel, kein Defizit.*

---

*Aufwand: XS (<1h) · S (1–2h) · M (halber Tag) · L (1–2 Tage) · XL (>2 Tage)*
*Vollständige Sprint-Geschichte inkl. aller abgeschlossenen Items: CHANGELOG.md*
