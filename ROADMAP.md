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

**sw-Version:** v498 · Cache: `stammbaum-v498`
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
| VAL-AMPEL | **Severity-Ampel im Personen-Detail** | Farbiges Icon (rot/orange/grau) im Personen-Detail wenn offene Validierungsbefunde vorliegen; Klick filtert Aufgaben-Tab auf diese Person | S |
| TASK-EXPORT-MD | **Aufgabenliste als Markdown exportieren** | Alle offenen Forschungsaufgaben + Validierungsbefunde als `.md`-Datei; gegliedert nach Kategorie und Schweregrad; Download-Button im Aufgaben-Tab | S |
| OBJE-TYPE | **Medien-Typ strukturiert** | `m.type` (Foto/Urkunde/Karte); Parser + Writer; UI: TYPE als Filter im Media-Browser | S |
| F5 | **Lebende-Anonymisierung** | Export: Geb. >~1920 + kein Sterbedatum → „Lebende Person", alle Events entfernt; DSGVO-konform; Opt-in im Einstellungs-Modal | M |

---

## T2 — Visuelle Ausgaben *(der „Wow"-Faktor für Hobby-Genealogen)*

Ausgaben, die Genealogen ihren Familien zeigen und auf die sie stolz sind. Höchster Ziel-Impact.

| ID | Aufgabe | Details | Aufwand |
|---|---|---|---|
| MAP-MIGR | **Migrationswege auf Karte** | Pfeile zwischen Geburts-/Wohn-/Sterbeort; Farbe nach Generation oder Zeitraum; Modus-Toggle im Kartenview | M |
| MAP-HIST-A | **Vintage-Kartenstil** | CSS-Filter (`sepia/brightness/contrast`) auf OSM-Kacheln via `L.tileLayer className`; Toggle Modern/Historisch im Kartenview; UIState-Persistenz; kein API-Key, keine neue Bibliothek. Hinweis: ändert nur Optik, keine historischen Daten. | S |
| MAP-HIST-B | **Echter Historikkartenhintergrund** | `L.tileLayer.wms()` gegen Mapire.eu (Habsburg ~1780–1918) oder deutschen Geodatendienst (Messtischblätter); erfordert Research-Spike: ToS-Prüfung, WMS-URL-Validierung, Coverage-Check (wahrscheinlich nur Habsburggebiet/Preußen, nicht flächendeckend). OHM und freie XYZ-Raster-Tiles ohne API-Key sind nicht verfügbar (OHM liefert nur Vektor-PBF, braucht MapLibre). | S+Research |
| F9 | **Visuelle Timeline** | Horizontale Lebenslinie in `ui-timeline.js`; Ereignisse als Icons auf der Zeitachse; Farben nach Kategorie (Familie/Beruf/Militär/Migration); Fotos an markanten Punkten; historische Kontext-Ebene; Export als SVG/HTML | XL |
| STORY | **Story Mode** | Reichhaltige Personen-Erzählung aus GEDCOM-Events: Markdown-Template mit Platzhaltern → clientseitig befülltes HTML → PDF via `window.print()` + Print-CSS; Fließtext-Gerüst automatisch generiert; eingebettete Fotos (base64); Mini-Karte (→ MAP-MIGR) + Zeitstrahl (→ F9) an Lebenspunkten; `ui-story.js`; Download als HTML oder PDF | XL |

*Empfohlene Reihenfolge: MAP-MIGR → MAP-HIST (Fundament für STORY-Karte) → F9 (Fundament für STORY-Timeline) → STORY*

---

## T3 — Forschungsqualität *(für ernsthafte Hobby-Genealogen)*

Features, die aus oberflächlicher Datensammlung systematische Forschung machen.

| ID | Aufgabe | Details | Aufwand |
|---|---|---|---|
| SOUR-DATA | **SOUR.DATA.EVEN/DATE strukturiert** | Laufzeit + Ereignistypen einer Quelle (z. B. Kirchenbuch 1750–1850, BIRT/MARR/DEAT); Parser: `s.dataEvens[]`; Writer: `2 DATA / 3 EVEN / 3 DATE / 3 PLAC`; UI: Deckungsbereich sichtbar im Quellen-Formular + Quellen-Detail | M |
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
| MEDI-CALN | **MEDI-Typ unter REPO.CALN** | `3 MEDI Mikrofilm\|Digitalisat\|Original` unter `2 CALN`; Parser + Writer + ein Feld im Quellen-Formular | S |
| ALIA | **ALIA-Aliasverweise** | `1 ALIA @xref@`; Parser: `p.alia[]`; Writer; UI: verlinkte Alias-Personen in Personen-Detail | S+S |
| REFN | **REFN/RIN strukturiert** | `p.refns[]` mit `{val,type}`; aktuell Passthrough; primär für Companion-Workflows | S |

---

## Backlog / Forschung

Kein festes Datum. Kandidaten für spätere Versionen.

| ID | Aufgabe | Details | Aufwand |
|---|---|---|---|
| F8 | **Cluster-Ansicht** | Alle Personen in denselben Orten/Quellen wie Person X | L |
| F7 | **Narrative-Export** | Fließtext-Biografie → TXT/HTML; LLM-Erweiterung optional | L |
| ASSO-Event | **Event-Rollen voll editierbar** | Personen als Zeugen/Paten zu Events; `1 ASSO`-Block schreiben; nur nach ASSO-UI sinnvoll | L |
| GEDCOM-7 | **GEDCOM 7.0 Evaluierung** | FamilySearch-Standard; Parser/Writer-Anpassung; HEAD GEDC VERS 7.0 | L |
| F11 | **OCR** | Urkunden-Scan → Text; WASM-Tesseract oder LLM-Backend | XL |

---

*Aufwand: XS (<1h) · S (1–2h) · M (halber Tag) · L (1–2 Tage) · XL (>2 Tage)*
*Vollständige Sprint-Geschichte inkl. aller abgeschlossenen Items: CHANGELOG.md*
