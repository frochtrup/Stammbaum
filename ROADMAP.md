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
**Aktuelle sw-Version:** v230 / Cache: `stammbaum-v230`

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

GEDCOM-Roundtrip-Fixes: v208–v220 (Orts-Hierarchie, FAM CHIL-Quellenrefs, @@-Normalisierung u.a.)

---

### Phase 4 — iOS-Companion-Optimierungen

- [ ] **Quick-Add** — `ui-quick-add.js`: Vorname + Nachname + Geburtsjahr + optionale Familie (~4h)
- [ ] **Foto-direkt-zu-Person** — iOS-Kamera → direkt an Person ohne Umweg über Media-Browser
- [ ] **GRAMPS-Tag-Editor** — Tags hinzufügen/entfernen (Phase 2 read-only, hier editierbar)
- [ ] **Orts-Hierarchie-Editor** — Formular mit `db.placeObjects{}`-Unterstützung
- [ ] **Export-Hinweis** — "Zuletzt geladen: Datum" in Topbar/Export-Dialog

---

### Phase 5 — GRAMPS-Inhalte editierbar + Cross-Parser-Betrieb

#### 5.1 Cross-Parser

- [x] GEDCOM → GRAMPS / GRAMPS → GEDCOM — Roundtrip stabil (v204–v220)
- [ ] **ASSO/RELA/ROLE → Witness-Roundtrip (GEDCOM↔GRAMPS)** (~4h)
- [ ] **OBJE ohne FORM stabilisieren** — `m.form = null`; Writer nur ausgeben wenn nicht null

#### 5.2 Formulare

- [ ] **Personen-Formular** — `_grampsAttrs[]` anzeigen/editieren; `grampId` + `_grampsCall` sichtbar
- [ ] **Ereignis-Formular** — `_grampsAttrs[]` pro Event; Witness-Rollen (read-only); GRAMPS Event-Typen im Dropdown
- [ ] **Familien-Formular** — `_grampsAttrs[]` auf Familien-Ebene
- [ ] **Orts-Picker** — `db.placeObjects{}` als strukturierten Picker (Hierarchie: Stadt → Kreis → Land)
- [ ] **Medien-Browser** — GRAMPS-Pfade auflösen; MIME-Typ; `titl` editierbar
- [ ] **Quellen-Formular** — Source-Notes editierbar; `grampId` sichtbar
- [ ] **Notizen** — `db.notes{}` in Detailansichten anzeigen; Editier-Pfad definieren

#### 5.3 Anzeige

- [ ] **GRAMPS-Badge in Topbar** — bei `db._grampsMaster`: Icon + `.gramps` als primäres Export-Format
- [ ] **Orts-Hierarchie in Event-Detail** — vollständigen Pfad aus `db.placeObjects{}` auflösen
- [ ] **Tags anzeigen** — `db.tags{}` in Personen-/Familien-Detail als Badges (kein Editor)

---

## Offene Themen nach Priorität (Stand 2026-04-12)

### P2 — Architektur-Verletzungen

- [ ] **Form-State in UIState** — `srcWidgetState`, `_pfExtraNames`, `_efMedia`, `_probandId` → `UIState._formState{}` (ADR-003) (~3h)
- [ ] **Virtual Scroll auf alle Listen** — Familien-Liste ohne VS (Quellen/Orte zu klein) (~2h)
- [x] **JS-seitige `onclick=` entfernen** ✅ sw v230 — 15 Zuweisungen ersetzt; treeBtn/probandBtn auf `data-action`+`dataset.id`; `showEditSheet()` um Repo+Place erweitert; `AppState.currentPlaceName` neu
- [ ] **`_navHistory` + `_probandId` in UIState** — lose Globals → UIState; Tree-History und Detail-History vereinheitlichen (~3h) — *Vorbedingung für Phase 6*

### P3 — Performance

- [ ] **Globale Suche indexieren** — O(n×m) bei 2800+ Personen ~80ms/Tastendruck; Debounce + vorberechneter Index
- [ ] **`applyPersonFilter()` Debounce** — `filterFamiliesDebounced` hat Debounce, `applyPersonFilter` nicht
- [ ] **`touchmove` Pinch-Zoom throttlen** — 100+/s auf DOM → `requestAnimationFrame` (ui-views-tree.js)

### P4 — Code-Qualität

- [ ] **DEV-Diagnose entfernen** — OD-Token-Details + SW-Version-Toast aus Menü/storage.js
- [ ] **Debug-Funktionen auslagern** — `_debug_minimal()`, `test_*()` (~340 LOC) → `gramps-test.js`, nur bei `?debug=1`
- [ ] **Notes-Datenmodell konsolidieren** — `p.noteText` / `p.noteTexts[]` / `p.noteTextInline` → Single source of truth
- [ ] **Konstanten für Magic Strings** — `EVENT_LABELS` + `_SPECIAL_LBL` zusammenführen; `MODALS{}` + `EL{}`
- [ ] **Generische `initAutocomplete()`** — `_initEtypeAutocomplete()` und `initPlaceAutocomplete()` zusammenführen (~60 Zeilen)
- [ ] **Rendering-Helper extrahieren** — `renderEventBlock()`, `renderSourceBadge()`, `renderMediaPhoto()` (~15% Duplikation)

### P5 — UX-Schulden

- [ ] **INDI-Notes Editierproblem** — mehrere Notes werden beim Speichern zusammengeführt
- [ ] **Cmd+Z granulares Undo** — History-Stack auf AppState; eigener Sprint
- [ ] **`showToast(type)`** — `type ∈ {success, warning, error}` + CSS-Differenzierung
- [ ] **`confirm()` → Modal** — 6+ Stellen → `confirmModal(msg)` Promise
- [ ] **`handleError()` zentralisieren** — 181 try/catch → `handleError(e, context, userMsg)`

### P6 — Neue Features (erst nach P2)

- [ ] Zeitleiste (`ui-timeline.js`)
- [ ] Nachkommen-Baum (top-down SVG)
- [ ] Karten-Ansicht (Apple Maps Link-Cluster)
- [ ] Statistik-Dashboard
- [ ] Duplikat-Erkennung (Name + Geburtsjahr ±2)
- [ ] Rufname (NICK / `_RUFNAME`) in Detailansicht + Baum
- [ ] Notizen-Überarbeitung (gesamthaft)
