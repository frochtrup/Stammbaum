# Roadmap

Sprint-Geschichte aller abgeschlossenen Versionen: `CHANGELOG.md`

---

## Aktueller Stand

| Version | Branch | Status |
|---|---|---|
| 4.0–6.0 | `main` / `v6-dev` | Abgeschlossen — Details: CHANGELOG.md |
| 7.0 | `v7-dev` | In Entwicklung |

**sw-Version:** v386 · Cache: `stammbaum-v386`
**Roundtrip GEDCOM:** stabil, net_delta=0 · **GRAMPS:** 60034 Checks ✓ (2894 Pers.)
**Testdaten:** MeineDaten_ancestris.ged (2811 Pers.) · Unsere Familie.gramps (2894 Pers.)

---

## Version 7.0 — Abgeschlossene Phasen

| Phase | Inhalt | SW |
|---|---|---|
| 1 | GRAMPS-GEDCOM-Kompatibilität — `detectGRAMPS()`, `grampId`-Felder | v190 |
| 2 | GRAMPS XML Import — `gramps-parser.js`, `db.placeObjects{}`, `db._grampsHandles{}` | v191–v196 |
| 3 | GRAMPS XML Round-trip — `gramps-writer.js`, 60034 Deep-Test-Checks ✓ | v193–v204 |
| 3b | UI: Höfe-Ansicht, RESI-Autocomplete, Bewohner-Formular | v224–v228 |
| Cleanup | Virtual Scroll, onclick-Delegation, State-Konsolidierung, Suche indexiert | v230–v233 |
| 4a | UX: `compactPlace()`, Notizen-Modal, noteRefs editierbar + löschbar | v236–v242 |
| 4b | Duplikat-Erkennung + Merge: Levenshtein-Scoring, Merge-Modal | v243 |
| 4c | Kartenansicht: Leaflet lokal, Orte + Personenbiografie, Desktop-Panel | v244–v250 |
| 4d | Hof-Koordinaten + Notizen: `db.hofObjects{}`, PLAC+MAP am RESI, Hof-Marker | v280–v283 |
| 4e | Hof-Eigentum: PROP-Ereignisse, `propEntries[]`, chronologische Sortierung | v261–v265 |
| 4f | UX/UI-Review: Touch-Targets, Swipe-down, Unified Nav, `showToast(type)` | v289–v297 |
| 4g | Rufname: `_RUFNAME`-Tag Roundtrip, Detailansicht, Baum | v298 |
| 4h | Security/A11y: `user-scalable=no` entfernt, `esc()`, Debug `?debug=1`-only | v300–v306 |
| 4j | Forschungsaufgaben: `p._tasks[]`, GEDCOM+GRAMPS-Roundtrip, globale Liste, Badge | v307 |
| 5.1 | ASSO/RELA/Taufpaten: `p.associations[]`, GEDCOM↔GRAMPS, Taufpaten-CHR-Formular | v323–v329 |
| F1 | Sosa/Kekule: 9-Gen-Baum + Fächer, `_buildKekuleMap()`, `#N`-Badges | v330–v332 |
| F2 | Beziehungsrechner: BFS, `_relLabel()`, Pfad-Modal, Pedigree-Collapse-Hinweis | v333–v348 |
| — | OBJE ohne FORM: `m.form = null`; Writer gibt FORM nur aus wenn nicht null | v349 |
| F4 | Soundex-Suche: `germanSoundex()` mit Umlaut-Normalisierung, ≈-Toggle | v350 |
| SEC | Security-Review: OAuth CSRF State, `safeLinkHref()`, `esc(addr)`, `_validCoord()` | v351 |
| A3/A4 | SW Cache-first für App-Assets + Fonts lokal (8 woff2, CSP bereinigt) | v352–v353 |
| A6 | `initAutocomplete()` zusammengeführt — `initPlaceAutocomplete` u.a. als Wrapper | v354 |
| U1–U6 | Menü (Sektionen, Datei schließen), ARIA Dialogs, Touch-Targets, Hilfe-Modal | v355 |
| — | Rufname-Formularfeld `pf-rufname`; Parser: Asterisk-Konvention in `2 GIVN` | v356 |
| A11y/UX | Touch-Targets WCAG 2.5.5 (≥44px), Toast `aria-live="polite"` | v357 |
| SEC5 | `innerHTML` → `textContent` in `onedrive-auth.js` | v358 |
| A7/A9 | `_placeModes` → `UIState._placeModes`; `_odMigrateIfNeeded()` in auto-load | v359 |
| — | Personen-IDs anzeigen + suchbar: `.p-id`, Suchindex, `detail-id-xref` | v361 |
| A10 | `unsafe-inline` aus CSP entfernen — alle 6 Phasen ✅ (ADR-015) | v370–v373 |
| U16–U19 + A11y | ♂/♀-Symbol + `aria-label` Baum-Karten; Kekule-Badge `title`; `.field-invalid` Formular-Validierung (Blur+Submit); `<label for>` in ui-forms.js ✅ | v376 |
| U21 | `evGeoLink(lati, long)` in `ui-views.js` — 5 duplizierte maps.apple.com-Inline-URLs ersetzt; Bugfix `data-action="stop"` in generic-events-Loop | v377 |
| U22 | Onboarding: „Stammbaum-Datei öffnen", Formatzeile `.ged · .gramps` mit Programmnamen, Demo-Button mit Personenzahl | v377 |
| U23 | **`ui-forms.js` aufgeteilt** (1007 → 619 Z.): `ui-forms-person.js` (Person + Extra-Name-Formular, 273 Z.) + `ui-forms-family.js` (Familie-Formular, 124 Z.); Load-Order + SW-Precache aktualisiert | v380 |

GEDCOM-Roundtrip-Fixes: v208–v220 (Orts-Hierarchie, FAM CHIL-Quellenrefs, @@-Normalisierung)

---

## Offene Aufgaben

Prioritäten: **P0** sofort · **P1** nächster Sprint · **P2** mittelfristig · **Backlog** ohne festes Datum

---

---

### P1 — Nächster Sprint

| ID | Aufgabe | Details | Aufwand |
|---|---|---|---|
| ~~U20~~ | ~~God-Functions aufteilen~~ | verworfen — Nutzen gering bei Solo-Projekt; nur `_pdetLifeData()` aus `showDetail()` extrahiert (Lebensdaten-Block inkl. Events-Gruppierung) | – |
| F5 | **Lebende-Anonymisierung** | Export: Geb. >~1920 + kein Sterbedatum → "Lebende Person"; DSGVO-konform | M |
| F6 | **Strict GEDCOM Export** | Alle `_`-Tags entfernen; `p._rufname` → `2 NICK`; Export-Modus im Einstellungs-Modal | M |
| GRAMPS-Badge | **GRAMPS-Modus sichtbar machen** | Bei `db._grampsMaster`: Badge in Topbar + primäres Export-Format = `.gramps` | S |
| GRAMPS-Tags | **Tags als Badges** | `db.tags{}` in Personen-/Familien-Detail als farbige Badges | S |

---

### P2 — Mittelfristig

| ID | Aufgabe | Details | Aufwand |
|---|---|---|---|
| U12 | **Dark Mode** | `prefers-color-scheme` in `styles.css`; `theme_color` in `manifest.json` | M |
| F3 | **Pedigree-Collapse** | Inzucht-Koeffizient; baut auf F2-BFS auf | M |
| GRAMPS-Orte | **Orts-Picker** | `db.placeObjects{}` als strukturierter Picker (Hierarchie: Stadt → Kreis → Land) | M |
| GRAMPS-Edit | **Personen-/Ereignis-Formular** | `_grampsAttrs[]` anzeigen/editieren; `grampId` + `_grampsCall` sichtbar; Witness-Rollen read-only | M+M |
| Nachkommen | **Nachkommen-Baum** | Top-down SVG | L |

---

### Backlog (kein festes Datum)

| ID | Aufgabe | Details | Aufwand |
|---|---|---|---|
| ~~F4b~~ | ~~**Mehrfach-Zitierungen**~~ | ✅ **Abgeschlossen** (sw v381): `citations:[{sid,page,quay,note,extra,media}]` in allen 8 Dateien; Roundtrip verlustfrei | XL |
| U8 | **Granulares Undo** | History-Stack auf AppState; heute: Cmd+Z = "Revert to Saved" | XL |
| F7 | **Narrative-Export** | Fließtext-Biografie → TXT/HTML; LLM-Erweiterung optional | L |
| F8 | **Cluster-Ansicht** | Personen in denselben Orten/Quellen wie Person X | L |
| F9 | **Zeitleiste** | Events neben historischen Ereignissen; `ui-timeline.js` | XL |
| F10 | **Buchgenerator** | HTML/PDF Familienbuch; Ahnentafel + Biografie + Fotos | XL |
| F11 | **OCR** | Urkunden-Scan → Text; WASM-Tesseract oder LLM-Backend | XL |
| F12 | **Event-NOTE-Referenzen** | ✅ sw v387 — `ev.noteRefs[]` in allen Event-Objekten; Parser: `2 NOTE @ref@` → Ref statt Inline-Text + Resolve-Loop; Writer: Refs ausgeben; HOF-Notizen als `0 @N_HOF_n@ NOTE`-Records + RESI-Events referenzieren. | M |

---

## Wartungsschuld — Konkrete Hinweise

Schulden nach Dringlichkeit, unabhängig vom Feature-Backlog anzugehen:

### Mittelfristig (je L)

~~**F4b: Zitierungs-Datenstruktur**~~ ✅ *Abgeschlossen sw v381* — `citations:[{sid,page,quay,note,extra,media}]` ersetzt 6 parallele Dicts; `citationObj()` Factory; `_migrateLegacyCitations()` für IDB-Altdaten; `citTagsHtml()` für Detailansichten; Parser/Writer/Forms/Views vollständig migriert.

**Einheitliche Render-Konvention**
Manche Views geben HTML-Strings zurück (`innerHTML =`), andere manipulieren direkt DOM-Nodes. Da `unsafe-inline` aus CSP entfernt ist, sollte mittelfristig alles auf DOM-Manipulation umgestellt werden — reduziert XSS-Angriffsfläche und macht Template-Strings überflüssig.

---

*Aufwand: XS (<1h) · S (1–2h) · M (halber Tag) · L (1–2 Tage) · XL (>2 Tage)*
*Abgelehnte Aufgaben und Archiv: CHANGELOG.md*
