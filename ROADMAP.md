# Roadmap

Sprint-Geschichte aller abgeschlossenen Versionen: `CHANGELOG.md`

---

## App-Ziel

**Visuell-einsteigerfreundlich für ambitionierte Hobby-Genealogen.**

Zielgruppe: Ambitionierte Hobby-Genealogen, die **mobil** (Archiv, Feldarbeit: schnelle Erfassung, Forschungsaufgaben, Medien) und **am Desktop** (heavy use: Quellen, Auswertung, Ausgaben) arbeiten.

Drei Dimensionen leiten die Priorisierung:
- **Mobil** — Schnellerfassung, Offline-Robustheit, Kamera-Integration
- **Forschungsqualität** — Protokoll, Quellenvorlagen, Validierung, Duplikate
- **Ausgaben** — Karten, Timeline, Story, Druckausgaben

---

## Aktueller Stand

| Version | Branch | Status |
|---|---|---|
| 4.0–7.0 | `main` | Abgeschlossen — Details: CHANGELOG.md |
| 8.0 | `v8-dev` | **Aktiv** |

**sw-Version:** v578 · Cache: `stammbaum-v578`
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
| F9 | Zeitleiste (Swim-Lane, 71 hist. Ereignisse) | v501–v540 |
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
| ERR-1 | try-catch in async-Funktionen | ✓ bereits vollständig — alle Funktionen haben try/catch oder .catch()-Fallback | — ✓ |
| PERF-1 | Debouncing Suche/Filter | ✓ bereits erledigt — _applyPersonFilterDebounced 200ms in ui-forms.js | — ✓ |
| PERF-2 | Soundex-Cache | ✓ bereits erledigt — p._sdxSurname/_sdxGiven beim Index-Aufbau vorberechnet | — ✓ |

---

## P1 — Mobile Feldarbeit *(Kernnutzen unterwegs)*

Feldarbeit = Archiv, Kirchenbuch vor Ort, Friedhof, Bibliothek. Ziel: neue Erkenntnisse in <60 Sekunden erfassen, ohne Desktop-Ablenkung.

| ID | Aufgabe | Details | Aufwand |
|---|---|---|---|
| QUICK-ADD | **Schnellerfassung neue Person** ✓ | `modalAdd` → „⚡ Neue Person (Schnell)": Minimalformular (Vorname, Nachname, Ereignis-Typ, Datum, Ort, Quelle-Picker); Masseneingabe-Modus (Modal bleibt offen, Quelle+Seite bleiben vorbelegt); „Fertig"-Button öffnet letzte angelegte Person (sw v577) | S ✓ |
| CAM-LINK | **Foto direkt an Ereignis** ✓ | Im Ereignis-Formular: „📷 Foto aufnehmen"-Button oberhalb Medien-Liste; `<input capture="environment">` direkt sichtbar; Foto → IDB → `ev.media[]` (sw v578) | S ✓ |
| F5 | **Lebende-Anonymisierung** | Export: Geb. >~1920 + kein Sterbedatum → „Lebende Person", alle Events entfernt; DSGVO-konform beim Teilen; Opt-in im Einstellungs-Modal | M |

---

## P2 — Forschungsqualität *(von Datensammlung zu systematischer Forschung)*

Der Unterschied zwischen Hobbysammler und ernsthaftem Forscher: Protokoll, Quellenkritik, Lückenanalyse.

| ID | Aufgabe | Details | Aufwand |
|---|---|---|---|
| FORSCH-LOG | **Forschungsprotokoll** | Neues IDB-Objekt `researchLog[]`: Datum, verknüpfte Person/Familie, Archiv/Quelle, Suchzeitraum, Ergebnis (Treffer / Kein Treffer / Unvollständig), Notiz. Anzeige im Aufgaben-Tab als zweiter Reiter „Protokoll". Export MD/CSV. — Negativbefunde sind für ernsthafte Genealogie genauso dokumentationspflichtig wie Funde. | M |
| SOUR-TMPL | **Quellen-Vorlagen** | `sourceTemplates[]` als JSON-Config: 8–10 deutsche Standardquellen (Kirchenbuch Taufe/Heirat/Tod, Standesamt Geburt/Heirat/Tod, Volkszählung, Grabstein, Totenzettel, Militärakte). Im Quellen-Formular: Vorlage wählen → Felder vorausfüllen. GEDCOM-konform über bestehende Felder. | M |
| VAL-EXTEND | **Validierung ausbauen** | Bestehende `VAL_RULES` dokumentieren + ergänzen: Elternteil-Alterscheck (>70 bei Geburt Kind), Heiratsalter (<14), Tod vor Geburt, Person ohne Quellenangabe (Badge), chronologische Konsistenz Events, Name+Geburtsdatum-Duplikat als Warnhinweis | M |
| F3 | **Pedigree-Collapse** | Mehrfach-Vorfahren im Sanduhr-Baum erkennen + visuell zusammenführen; Inzucht-Koeffizient optional | M |

---

## P3 — Desktop-Auswertung *(Heavy Use am Desktop)*

Funktionen für den Rechner-Abend: strukturieren, bereinigen, auswerten, ausgeben.

| ID | Aufgabe | Details | Aufwand |
|---|---|---|---|
| SEARCH-ADV | **Erweiterte Suche** | Kombinationsfilter: Geburtsort, Geburtsjahr-Bereich, Geburtsname, fehlende Felder (kein Tod / keine Quelle / kein Elternteil). Ergebnis als Liste mit Direktsprung. Basis für systematische Lückenanalyse. | M |
| DUP-DETECT | **Duplikat-Erkennung** | `findDuplicatePairs()` via Web Worker (Main Thread bleibt reaktiv bei >2000 Personen). Soundex-Namensvergleich + Geburtsdatum-Ähnlichkeit. Merge-Vorschlag-UI. | L |
| REL-CALC | **Beziehungsrechner** | „Wie sind X und Y verwandt?" — BFS durch Familiengraph. Anzeige: „3. Grad Cousin, gemeinsamer Vorfahre: Johann Decker (1780)". Erreichbar aus Personen-Detail. | M |
| PRINT-OUT | **Strukturierte Druckausgaben** | Ahnenliste (Kekule-Nummerierung) als HTML-Tabelle + PDF via `window.print()`. Familienbogen als druckbare HTML-Seite. Kein Layout-Monster — die 2 für den deutschen Raum relevantesten Formate. | M+M |

---

## P4 — Visuelle Ausgaben *(Wow-Faktor)*

Ausgaben, die Genealogen ihren Familien zeigen und auf die sie stolz sind. Fundament bereits abgeschlossen (Timeline ✓, Story ✓, Karte ✓).

| ID | Aufgabe | Details | Aufwand |
|---|---|---|---|
| STORY-OPT | **Story: Textqualität verbessern** | Natürlichere Satzstrukturen für häufige Ereigniskombinationen (Beruf mit Zeitraum, Familiennarrative, Anzahl Kinder); Epochen-Kontext; LLM-optionale Anreicherung als Opt-in | M |
| MAP-HIST-A | **Vintage-Kartenstil** | CSS-Filter (`sepia/brightness/contrast`) auf OSM-Kacheln; Toggle Modern/Historisch im Kartenview; UIState-Persistenz; kein API-Key, keine neue Bibliothek | S |
| MAP-HIST-B | **Echter Historikkartenhintergrund** | Swisstopo Siegfriedkarte (1883–1949, WMTS bestätigt) als erster Layer + Jahres-Dropdown. Coverage: Schweiz + Grenzregionen (Vorarlberg, Elsass, Baden). Für Deutschland kein freier Flächendienst verfügbar. | M |

---

## P5 — Standards & Interoperabilität *(für Fortgeschrittene)*

| ID | Aufgabe | Details | Aufwand |
|---|---|---|---|
| ASSO-UI | **ASSO-Beziehungen** | Read-only Anzeige in Personen-Detail (Schritt 1); Bearbeitung (Zeuge/Pate zu Event zuordnen, Schritt 2) | M+M |
| F6 | **Strict GEDCOM Export** | Alle `_`-Tags entfernen oder auf Standard-Tags mappen; Export-Modus im Einstellungs-Modal; ADR dokumentiert | M |
| GRAMPS-Edit | **GRAMPS-Attribute editierbar** | `_grampsAttrs[]` in Personen-/Familien-Formular anzeigen + editieren; `grampId` sichtbar | M |
| OBJE-TYPE | **Medien-Typ strukturiert** ⚠ | `m._type` als Vendor-Extension (`2 _TYPE`); kein Standard-Tag in GEDCOM 5.5.1; ADR erforderlich vor Umsetzung | S |

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
