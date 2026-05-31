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

**sw-Version:** v798 · Cache: `stammbaum-v798` · `test-unit.js` = 185 Tests grün
**Seit v785:** dedup-Doppelnamen (v793) · MULTI_FAMC/OPEN_HYPO-Opt-in (v790–v792) · **Eltern-Suchpicker im Familiendialog (v794)** — `<select>`+tote `onclick`-Buttons → relPicker-Logik wie „+ Elternteil".
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
| Funktionsstand | 8.5/10 | Undo/Redo · Karten-Animation · Evidenzmodell · GPS-Hypothesen · GED7 · GRAMPS · ASSO-Edit · **Verwandtschaftsrechner** (BFS, Cousin-Grade) · Eltern-Suchpicker (v794) ✓. **Abzug:** Orts-Geocoding-DB fehlt; Ausgabe-Reichtum < MFT; Lücken bewusst out-of-scope: DNA, Online-Matching, Multi-User. |
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
| **P0b-2** | **Dubletten-Merge** — Merge-Dialog (Schreibvarianten → `pnames[]`, `ev.placeId` umhängen); Heuristik via `_normPlaceName`/Koord/Levenshtein. | GRAMPS-Standard | 🔜 geplant |
| **P0b-3** | **`extraPlaces` → `placeObjects`** (T0-STORAGE-Abbau); GEDCOM-PLAC/TRAN-Schreibpfad umbiegen, net_delta=0 wahren. | GRAMPS-Standard | 🔜 geplant |
| **P2-UI** | **Historische UI** — Ort-Editor mit datierter Namens- + Zugehörigkeits-Historie (von–bis, übergeordneter Ort, Picker); Anzeige/Export via `resolveAsOf`. | — | angedacht |
| **P3** | **Kirchen & typisierte Event-Orte** — Typ-Taxonomie (Dorf…Land, Kirche/Pfarrei/Friedhof, Hof) → GRAMPS-Standardtypen; Ort-**Suchpicker** im Event-Formular (Muster Eltern-Picker v794); Kirche↔Kirchenbuch (Repository/Source); Höfe als Filter der generischen Ort-Sicht. | `type` (vorhanden) | angedacht |
| **P4** | **Geocoding & Gazetteer** — **GOV** (gov.genealogy.net) priorisiert (historische Zugehörigkeit über Zeit, ideal westfälisch) → speist `enclosedBy[]`/`pnames[]`; GeoNames/Wikidata alternativ; Batch-Geocoding + Dedup. CSP `connect-src` whitelisten + `test-csp.js`. | `authority` → GRAMPS `<url>` | angedacht |
| **P5** | **Auswertungen** — Ort-Steckbrief (Events/Personen/Quellen/Karte/Namens-Timeline); Karten-**Zeitschieber** (Name/Zugehörigkeit zum Jahr); **Pfarrei-Rekonstruktion** (alle Taufen/Trauungen einer Kirche); Geo-Plausibilitäts-Validator; Orts-Hypothesen (`_HYPO`); Orts-Kontextsatz in Story/Buch. | gemischt | angedacht |

**Reihenfolge:** §3.0 Verifikation ✅ → P0a-1 ✅ → P0a-2 ✅ → P0b-1 ✅ → P0b-2/P0b-3 → Review → P2-UI → P3 → P4 → P5.

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

**Handbuch-Stand: sw v785** *(veraltet — v786–v794 noch nicht dokumentiert: dedup-Doppelnamen, MULTI_FAMC/OPEN_HYPO-Opt-in, Eltern-Suchpicker im Familiendialog)*

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
