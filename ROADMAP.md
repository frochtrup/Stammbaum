# Roadmap

Detaillierte Sprint-Geschichte aller abgeschlossenen Versionen: `CHANGELOG.md`

---

## Aktueller Stand

| Version | Branch | Status |
|---|---|---|
| 4.0 | `main` | Abgeschlossen (2026-03-30) — Details: CHANGELOG.md |
| 5.0 | `main` | Abgeschlossen (2026-04-05) — Details: CHANGELOG.md |
| 6.0 | `v6-dev` | Abgeschlossen (2026-04-10) — Details: CHANGELOG.md |
| 7.0 | `v7-dev` | In Entwicklung |

**Roundtrip GEDCOM:** `stable=true`, `net_delta=0` — alle tag-counts ✓; CONC/CONT-Neuformatierung + HEAD-Rewrite by design akzeptiert
**Roundtrip GRAMPS:** `deep_test=true`, 60034 Checks ✓ — 2894 Personen, 910 Familien, 138 Quellen, 139 Orte
**Testdaten:** MeineDaten_ancestris.ged (2811 Pers.) / Unsere Familie.gramps (2894 Pers.)
**Aktuelle sw-Version:** v250 / Cache: `stammbaum-v250`

---

## Version 7.0 (Branch `v7-dev`, ab 2026-04-10)

**Strategie:** GRAMPS als Desktop-Master, PWA als iOS-Companion. GEDCOM bleibt vollständig erhalten.

```
GRAMPS (Desktop) ←→ GRAMPS XML (.gramps) ←→ PWA (iOS/iPad Companion)
GEDCOM (.ged)    ←→ GEDCOM 5.5.1          ←→ PWA (alle anderen Quellen)
```

---

### Abgeschlossene Phasen

| Phase | Inhalt | SW |
|---|---|---|
| 1 | GRAMPS-GEDCOM-Kompatibilität — `detectGRAMPS()`, `grampId`-Felder | v190 |
| 2 | GRAMPS XML Import read-only — `gramps-parser.js`, `db.placeObjects{}`, `db._grampsHandles{}` | v191–v196 |
| 3 | GRAMPS XML Export Round-trip — `gramps-writer.js`, 60034 Deep-Test-Checks ✓ | v193–v204 |
| 3b | UI: Höfe-Ansicht, RESI-Adress-Autocomplete, Bewohner-Formular | v224–v228 |
| 4a | UX: `compactPlace()`, Notizen-Modal, noteRefs editierbar + löschbar, `_pruneOrphanNotes()` | v236–v242 |
| 4b | Duplikat-Erkennung + Merge: Levenshtein-Scoring, Merge-Modal, Ignorieren | v243 |
| 4c | Kartenansicht: Leaflet lokal; Alle Orte + Personenbiografie; Desktop rechtes Panel; Safari-Fix | v244–v250 |
| Cleanup | Virtual Scroll, onclick-Delegation, State-Konsolidierung, Suche indexiert, Debug ausgelagert | v230–v233 |

GEDCOM-Roundtrip-Fixes: v208–v220 (Orts-Hierarchie, FAM CHIL-Quellenrefs, @@-Normalisierung u.a.)

---

## Offene Aufgaben nach Priorität

### P0 — Sicherheit *(vor jedem Sharing- oder Fremd-Import-Feature)*

| ID | Aufgabe | Aufwand |
|---|---|---|
| S1 | ~~**XSS-Audit**~~ ✅ sw v265 — vollständiger Audit aller `innerHTML`-Assignments; eine Lücke gefunden und behoben: `ui-views-map.js:217` `e.date` fehlte `_mesc()` im Karten-Exploration-Panel | M |
| S2 | ~~**DOMPurify einbinden**~~ — nicht notwendig; `esc()`/`_mesc()` konsistent angewendet (129 Aufrufe in 12 Dateien); kein Rich-Text-Rendering, DOMPurify hätte keinen zusätzlichen Nutzen | S |
| S3 | ~~**CSP `unsafe-inline` für Styles entfernen**~~ — gestrichen; ~445 `style=`-Attribute (228 index.html + 217 JS), `element.style.*` in JS ist CSP-unberührt; Sicherheitsgewinn gering (kein JS-Execution via CSS); `script-src 'self'` ohne `unsafe-inline` ist bereits aktiv | L |

---

### P1 — Code-Qualität

| ID | Aufgabe | Aufwand |
|---|---|---|
| Q1 | ~~**`_hofDateKey()` + `_evDateKey()` zusammenführen**~~ ✅ sw v266 — `evDateKey(d)` in `gedcom.js`; lokale Kopien aus `ui-views-hof.js` und `ui-views-person.js` entfernt | XS |
| Q2 | ~~**`_renderMediaList()` + `_renderEfMedia()` zusammenführen**~~ — gestrichen; grundlegend unterschiedlich: `_renderMediaList` = Read-only-Referenzliste mit `data-idx`; `_renderEfMedia` = Live-Editor mit zwei Eingabefeldern, mutiert `_efMedia[]` direkt | S |
| Q3 | ~~**Backward-Compat-Shims entfernen**~~ ✅ sw v268 — AppState-Shims (13) vollständig entfernt (waren ungenutzt); `_navHistory`/`_probandId` → `UIState._navHistory`/`UIState._probandId` migriert (13 Stellen in ui-views.js); formState-Shims (`srcWidgetState`, `_pfExtraNames`, `_efMedia`) behalten — Lesbarkeit gerechtfertigt (50 Verwendungen, tief verschachtelte UIState-Pfade) | M |
| Q4 | ~~**Getter konsequent durchziehen**~~ — gestrichen; 112 direkte Bracket-Zugriffe in 14 Dateien, viele Patterns nicht trivial ersetzbar (`(f.husb && AppState.db.individuals[f.husb]) || null`), kein funktionaler Unterschied, Risiko > Nutzen | M |

*Gestrichen: generische `initAutocomplete()` — unterschiedliche Kontexte, Aufwand > Nutzen (bewertet 2026-04-14)*

---

### P2 — Architektur

| ID | Aufgabe | Aufwand |
|---|---|---|
| A1 | **`ui-views.js` aufteilen** (922 Z., 5 Verantwortlichkeiten): Navigation/Routing → `ui-router.js`, Modal-Manager → `ui-modal.js`, Note-Modal → `ui-views-note.js` | L |
| A2 | **`_CLICK_MAP` nach Feature-Bereich strukturieren**: Sub-Maps `_CLICK_MAP_PERSON`, `_CLICK_MAP_FAMILY` etc., im Init zusammengeführt | M |
| A3 | **Domain-Logik in `gedcom.js` verlagern**: `buildHofIndex()`, Duplikat-Scoring gehören nicht in UI-Dateien | M |
| A4 | **`_formState` kapseln**: Transiente Formular-States nicht global in UIState, sondern an Formular-Lifecycle binden | M |

---

### P3 — Performance

| ID | Aufgabe | Aufwand |
|---|---|---|
| P1 | **Virtual Scroll für Hof-Liste** — analog zur Personen/Familien-Liste | M |
| P2 | **IDB Batch-Reads für Medien**: `getAll()` mit Index statt sequentielle Einzelabfragen | M |
| P3 | **Suchergebnisse ranken** statt nach Position (`slice(0,20)`); Hinweis wenn >20 Treffer | S |
| P4 | **`_rebuildPersonSourceRefs()` lazy**: nur bei tatsächlicher Source-Änderung, nicht bei jedem Save | S |

---

### P4 — UX-Schulden

| ID | Aufgabe | Aufwand |
|---|---|---|
| U1 | ~~**Fehlermeldungen nutzerfreundlich**~~ ✅ sw v267 — `— Details in der Konsole` in 4 Dateien → `— Datei wurde trotzdem vollständig geladen`; `e.message`-Toasts (OneDrive, Speichern, Öffnen) behalten — liefern nützlichen Kontext | S |
| U2 | **Modal-Stack klären**: Escape-Verhalten bei mehreren offenen Modals (`#modal` + `#modalNote` + `#modalDedup`) | S |
| U3 | **`confirm()` → Modal**: 6+ Stellen → `confirmModal(msg)` Promise; Lösch-UX vereinheitlichen | M |
| U4 | **`showToast(type)`**: `type ∈ {success, warning, error}` + CSS-Differenzierung | S |
| U5 | **Namens-Truncation im Baum**: 18 → 24 Zeichen für reguläre Karten | XS |
| U6 | **`handleError()` zentralisieren**: try/catch → `handleError(e, context, userMsg)` | M |
| U7 | **Advanced Search**: Filter nach Geburtsort / Zeitraum / Familie als ausklappbare Optionen | L |
| U8 | **Cmd+Z granulares Undo**: History-Stack auf AppState; eigener Sprint | XL |

---

### P5 — GRAMPS Phase 4/5 (iOS-Companion + Editierbarkeit)

#### Phase 4 — iOS-Companion-Optimierungen

- [ ] **Quick-Add** — `ui-quick-add.js`: Vorname + Nachname + Geburtsjahr + optionale Familie
- [ ] **Foto-direkt-zu-Person** — iOS-Kamera → direkt an Person ohne Umweg über Media-Browser
- [ ] **GRAMPS-Tag-Editor** — Tags hinzufügen/entfernen (Phase 2 read-only, hier editierbar)
- [ ] **Orts-Hierarchie-Editor** — Formular mit `db.placeObjects{}`-Unterstützung
- [ ] **Export-Hinweis** — "Zuletzt geladen: Datum" in Topbar/Export-Dialog

#### Phase 5.1 — Cross-Parser

- [ ] **ASSO/RELA/ROLE → Witness-Roundtrip (GEDCOM↔GRAMPS)**
- [ ] **OBJE ohne FORM stabilisieren** — `m.form = null`; Writer nur ausgeben wenn nicht null

#### Phase 5.2 — Formulare

- [ ] **Personen-Formular** — `_grampsAttrs[]` anzeigen/editieren; `grampId` + `_grampsCall` sichtbar
- [ ] **Ereignis-Formular** — `_grampsAttrs[]` pro Event; Witness-Rollen (read-only); GRAMPS Event-Typen im Dropdown
- [ ] **Familien-Formular** — `_grampsAttrs[]` auf Familien-Ebene
- [ ] **Orts-Picker** — `db.placeObjects{}` als strukturierten Picker (Hierarchie: Stadt → Kreis → Land)
- [ ] **Medien-Browser** — GRAMPS-Pfade auflösen; MIME-Typ; `titl` editierbar

#### Phase 5.3 — Anzeige

- [ ] **GRAMPS-Badge in Topbar** — bei `db._grampsMaster`: Icon + `.gramps` als primäres Export-Format
- [ ] **Orts-Hierarchie in Event-Detail** — vollständigen Pfad aus `db.placeObjects{}` auflösen
- [ ] **Tags anzeigen** — `db.tags{}` in Personen-/Familien-Detail als Badges

---

### P6 — Neue Features *(erst nach P0)*

- [ ] Zeitleiste (`ui-timeline.js`)
- [ ] Nachkommen-Baum (top-down SVG)
- [ ] Statistik-Dashboard
- [ ] Rufname (NICK / `_RUFNAME`) in Detailansicht + Baum
- [ ] **Eigentum in Hofhistorie** — PROP-Ereignisse in Hof-Detail als hervorgehobene Zeile; `buildHofIndex()` um PROP-Einträge erweitern; Ereignis-Formular für PROP: Adress-Auswahl analog zu RESI, kein Pflichtfeld (Acker, Mühle, Scheune …)

---

*Aufwand: XS (<1h) · S (1–2h) · M (halber Tag) · L (1–2 Tage) · XL (>2 Tage)*
