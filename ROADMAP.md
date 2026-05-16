# Roadmap

Sprint-Geschichte aller abgeschlossenen Versionen: `CHANGELOG.md`

---

## App-Ziel

**Visuell-einsteigerfreundlich für ambitionierte Hobby-Genealogen.**

Drei Dimensionen leiten die Priorisierung:
- **Visuell** — Ausgaben, die Genealogen stolz zeigen: Karten, Timeline, Story
- **Einsteigerfreundlich** — Orientierung, was fehlt; Teilen ohne DSGVO-Stress
- **Ambitioniert** — Quellenqualität, Validierung, Standards für ernsthafte Forschung

---

## Aktueller Stand

| Version | Branch | Status |
|---|---|---|
| 4.0–7.0 | `main` | Abgeschlossen — Details: CHANGELOG.md |
| 8.0 | `v8-dev` | **Aktiv** |

**sw-Version:** v567 · Cache: `stammbaum-v567`
**Roundtrip GEDCOM:** stabil, net_delta=0, out1===out2 ✓
**Roundtrip GRAMPS:** 60034 Checks ✓ (2894 Pers.)
**Testdaten:** MeineDaten_ancestris.ged (2811 Pers.) · Unsere Familie.gramps (2894 Pers.)

---

## Design-Constraint

Alle neuen Features müssen den GEDCOM 5.5.1 Roundtrip (`out1===out2`, `net_delta=0`) stabil halten. Neue Datenstrukturen dürfen beim GEDCOM-Export keinen zusätzlichen Delta erzeugen — entweder als Passthrough oder als bekannte, dokumentierte Abweichung. Jede Abweichung muss explizit entschieden und in `ARCHITECTURE.md` (ADR) dokumentiert werden.

---

## T1 — Einstieg & Orientierung *(Beginner-UX zuerst)*

Kleine Aufwände mit hohem Orientierungswert für neue Nutzer.

| ID | Aufgabe | Details | Aufwand |
|---|---|---|---|
| SAFARI-SWIPE | **Safari-„Zurück"-Swipe abfangen** | Wischgeste nach rechts in Safari löst Browser-History-Back aus → App wird auf leere Seite zurückgesetzt (kompletter State-Verlust). Lösungsansatz: `history.pushState` beim App-Start + `popstate`-Event abfangen und an internes Nav-System delegieren statt Browser-Default zuzulassen. Betrifft iPhone/iPad im Browser-Modus (nicht als PWA installiert). | M |
| TASK-EXPORT-MD | **Aufgabenliste als Markdown exportieren** | Alle offenen Forschungsaufgaben + Validierungsbefunde als `.md`-Datei; gegliedert nach Kategorie und Schweregrad; Download-Button im Aufgaben-Tab | S |
| OBJE-TYPE | **Medien-Typ strukturiert** ⚠ nicht GEDCOM-konform | `m._type` als Vendor-Extension (`2 _TYPE`); kein Standard-Tag unter OBJE in GEDCOM 5.5.1; ADR erforderlich vor Umsetzung | S |
| F5 | **Lebende-Anonymisierung** | Export: Geb. >~1920 + kein Sterbedatum → „Lebende Person", alle Events entfernt; DSGVO-konform; Opt-in im Einstellungs-Modal | M |

---

## T2 — Visuelle Ausgaben *(der „Wow"-Faktor für Hobby-Genealogen)*

Ausgaben, die Genealogen ihren Familien zeigen und auf die sie stolz sind. Höchster Ziel-Impact.

| ID | Aufgabe | Details | Aufwand |
|---|---|---|---|
| MAP-HIST-A | **Vintage-Kartenstil** | CSS-Filter (`sepia/brightness/contrast`) auf OSM-Kacheln via `L.tileLayer className`; Toggle Modern/Historisch im Kartenview; UIState-Persistenz; kein API-Key, keine neue Bibliothek. Hinweis: ändert nur Optik, keine historischen Daten. | S |
| MAP-HIST-B | **Echter Historikkartenhintergrund** | Verifiziert funktionierender freier WMTS: **Swisstopo** Siegfriedkarte (1883–1949, HTTP 200 bestätigt) + Dufourkarte (~1845–1865). URL: `https://wmts.geo.admin.ch/1.0.0/ch.swisstopo.hiks-siegfried/default/{year}/3857/{z}/{x}/{y}.png`; `{year}` = 1883–1949. Coverage: Schweiz + Grenzregionen (Vorarlberg, Elsass, Baden). Für Deutschland flächendeckend kein freier Dienst ohne API-Key verfügbar (OHM: nur Vektor/MapLibre; NLS-S3-URLs: 404; Landesarchiv-WMS: instabil). Nächster Schritt: Swisstopo als ersten echten Historik-Layer + Jahres-Dropdown (1883–1949). | M |
| F9 | **Zeitleiste** ✓ | `ui-timeline.js` + `timeline-hist-events.js` (sw v501–v540): View `#v-timeline`, ⊙-Button (⟷) in Detail-Topbar + Baum-Topbar, `_buildPersonEvents()` (Sonder-Ereignisse + events[] + Heiraten + Kinder), `_HIST_EVENTS` (71 Einträge 1315–2024, in eigene Datei ausgelagert), Rendering vertikal (Dekaden) / horizontal Swim-Lane (5 Lanes: Leben/Wohnorte/Beruf/Familie/Kirche), `_afterLayout`-Utility, Vollbild-Modus, Baumnavigation in Topbar (Sanduhr/Fächer/Nachkommen/Proband), Mouseover-Tooltip, Filter-Toggles (Krieg/Seuche/Politik/Religion/Natur), Lebensspanne-Balken, Altersanzeige, undatierte Chips vertikal zentriert | XL ✓ |
| STORY | **Story Mode** ✓ | `ui-story.js` (sw v549–v560): View `#v-story`, 📖-Button in Detail-Topbar, Fließtext-Erzählung aus GEDCOM-Events (Geburt/Taufe/Eltern/Events/Ehen/Kinder/Tod/Notiz), pronomen-aware Templates (18 Event-Typen), deutsches Datumsformat (FROM/BET/BEF/AFT/ABT), Orts-Kurzform (addr+place kombiniert wie Timeline), Hero-Foto + Galerie async (IDB/OneDrive), Leaflet-Karte mit Bewegungspfad + CircleMarker, HTML-Download, Print-CSS | XL ✓ |
| STORY-OPT | **Story: Textqualität verbessern** | Weiterer Optimierungsbedarf: natürlichere Satzstrukturen für häufige Ereigniskombinationen (z.B. Beruf mit Zeitraum), Familiennarrative (Geschwister, Anzahl Kinder), Kontext bei Epochen, LLM-optionale Anreicherung als Opt-in | M |

*Empfohlene Reihenfolge: MAP-HIST (Fundament für STORY-Karte) → F9 (Fundament für STORY-Timeline) → STORY ✓*

---

## T3 — Forschungsqualität *(für ernsthafte Hobby-Genealogen)*

Features, die aus oberflächlicher Datensammlung systematische Forschung machen.

| ID | Aufgabe | Details | Aufwand |
|---|---|---|---|
| SOUR-DATA | **SOUR.DATA.EVEN/DATE strukturiert** ✓ | `s.dataEvens[]` mit `{evens,date,plac}`; Parser + Writer + Detail-Anzeige + Formular (sw v546) | M ✓ |
| F3 | **Pedigree-Collapse** | Mehrfach-Vorfahren im Sanduhr-Baum erkennen + zusammenführen; Inzucht-Koeffizient berechnen | M |
| Perf-Worker | **Web Worker für Duplikat-Scan** | `findDuplicatePairs()` in Worker auslagern; Main Thread bleibt bei >2000 Personen reaktiv | M |

---

## T4 — Standards & Interoperabilität *(für Fortgeschrittene)*

Wichtig für Nutzer, die mit anderen Tools (Legacy, RootsMagic, GRAMPS) zusammenarbeiten.

| ID | Aufgabe | Details | Aufwand |
|---|---|---|---|
| F6 | **Strict GEDCOM Export** | Alle `_`-Tags entfernen oder auf Standard-Tags mappen; Export-Modus im Einstellungs-Modal; ADR dokumentiert | M |
| ASSO-UI | **ASSO-Beziehungen** | Read-only Anzeige in Personen-Detail (Schritt 1); Bearbeitung (Zeuge/Pate zu Event zuordnen, Schritt 2) | M+M |
| GRAMPS-Edit | **GRAMPS-Attribute editierbar** | `_grampsAttrs[]` in Personen-/Familien-Formular anzeigen + editieren; `grampId` sichtbar | M |
| MEDI-CALN | **MEDI-Typ unter REPO.CALN** ✓ | `3 MEDI` unter `2 CALN`; `s.repoCallMedi`; Parser + Writer + Select im Quellen-Formular (sw v545) | S ✓ |
| ALIA | **ALIA-Aliasverweise** ✓ | `1 ALIA @xref@`; Parser: `p.alia[]`; Writer; UI: Warn-Row mit ≈-Label + left-border; Edit: symmetrisch hinzufügen/entfernen (sw v499) | S+S ✓ |
| REFN | **REFN/RIN strukturiert** ✓ | `refns[]` mit `{val,type}` auf INDI/FAM/SOUR; Parser + Writer + read-only Detail (sw v548) | S ✓ |

---

## Backlog / Forschung

Kein festes Datum. Kandidaten für spätere Versionen.

| ID | Aufgabe | Details | Aufwand |
|---|---|---|---|
| F8 | **Cluster-Ansicht** | Alle Personen in denselben Orten/Quellen wie Person X | L |
| ASSO-Event | **Event-Rollen voll editierbar** | Personen als Zeugen/Paten zu Events; `1 ASSO`-Block schreiben; nur nach ASSO-UI sinnvoll | L |
| GEDCOM-7 | **GEDCOM 7.0 Evaluierung** | FamilySearch-Standard; Parser/Writer-Anpassung; HEAD GEDC VERS 7.0 | L |
| F11 | **OCR** | Urkunden-Scan → Text; WASM-Tesseract oder LLM-Backend | XL |

---

*Aufwand: XS (<1h) · S (1–2h) · M (halber Tag) · L (1–2 Tage) · XL (>2 Tage)*
*Vollständige Sprint-Geschichte inkl. aller abgeschlossenen Items: CHANGELOG.md*
