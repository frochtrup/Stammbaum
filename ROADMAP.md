# Roadmap

Sprint-Geschichte aller abgeschlossenen Versionen: `CHANGELOG.md`

---

## Aktueller Stand

| Version | Branch | Status |
|---|---|---|
| 4.0–6.0 | `main` | Abgeschlossen — Details: CHANGELOG.md |
| 7.0 | `main` (PR #1) | **Abgeschlossen** |
| 8.0 | `v8-dev` | **Aktiv** |

**sw-Version:** v419 · Cache: `stammbaum-v419`
**Roundtrip GEDCOM:** stabil, net_delta=0, out1===out2 ✓ · **GRAMPS:** 60034 Checks ✓ (2894 Pers.)
**Testdaten:** Unsere Familie.gramps (2894 Pers.)

---

## Version 8.0 — Offene Aufgaben

Prioritäten: **P1** nächster Sprint · **P2** mittelfristig · **Backlog** ohne festes Datum

**Design-Constraint:** Alle neuen Features müssen den GEDCOM 5.5.1 Roundtrip (`out1===out2`, `net_delta=0`) stabil halten. Neue Datenstrukturen dürfen beim GEDCOM-Export keinen zusätzlichen Delta erzeugen — entweder als Passthrough oder als bekannte, dokumentierte Abweichung. Jede neue Abweichung vom Roundtrip-Verhalten muss explizit entschieden und in `ARCHITECTURE.md` (ADR) dokumentiert werden; sie darf nicht stillschweigend entstehen.

---

### P1 — GRAMPS Roundtrip (aktiver Sprint)

Ziel: Passthrough-Lücken schließen ohne GEDCOM-Roundtrip zu berühren. Reihenfolge = Implementierungsreihenfolge (Abhängigkeiten beachten).

| ID | Aufgabe | Details | Aufwand |
|---|---|---|---|
| ~~GRAMPS-EventAttrFix~~ | ~~**Event-Attribute als Plain-Objects**~~ | ~~Parser-Bug: `evMap[h].attrs` speichert DOM-Elemente statt `{type,value}`-Plain-Objects~~ | ~~S~~ | **erledigt (war bereits korrekt)** |
| ~~GRAMPS-NoteType~~ | ~~**Note-`type`-Attribut bewahren**~~ | ~~`<note type="Research/Private/…">` lesen → `db.notes[id].type`; Writer gibt `type="…"` wieder aus~~ | ~~XS~~ | **erledigt sw v415** |
| ~~GRAMPS-ID~~ | ~~**Ursprüngliche Handles im Writer**~~ | ~~`grampId` auf PlaceObjects ergänzt; Personen/Familien/Quellen/Repos bereits korrekt~~ | ~~S~~ | **erledigt sw v415** |
| ~~GRAMPS-ObjHandles~~ | ~~**Original Media-Handles bewahren**~~ | ~~`_objHandle()` nutzt `m._grampsHandle` statt `_h('ob')` — verhindert Objekt-ID-Churn~~ | ~~S~~ | **erledigt sw v415** |
| ~~GRAMPS-EventHandles~~ | ~~**Original Event-Handles bewahren**~~ | ~~`evObj._grampsEvHlink` im Parser; Writer nutzt Original-Handle statt `_h('ev')`; Witness-Events via `wr._origHlink`~~ | ~~XS~~ | **erledigt sw v416** |
| ~~GRAMPS-EventExtra~~ | ~~**Event-Passthrough für nicht-modellierte Sub-Elemente**~~ | ~~`_xmlEl`-Helper; `evMap._extra[]` für `<objref>`, `<change>`; `_priv`-Attribut; Propagation auf alle Event-Typen + Witness; Writer gibt `_extra` und `priv` aus~~ | ~~S~~ | **erledigt sw v416** |
| ~~GRAMPS-CitHandles~~ | ~~**Original Citation-Handles + Passthrough**~~ | ~~`_grampsCitHandle`+`_citExtra` in `_applyCit`; `citMap` erfasst `<noteref>`,`<objref>`,`<attribute>`,`<change>`; `_citHandle` nutzt Original-Handle; alle 5 Call-Sites aktualisiert; Citation-XML gibt `_extra` aus~~ | ~~M~~ | **erledigt sw v417** |
| ~~GRAMPS-Notes~~ | ~~**Notes als eigene Entität**~~ | ~~`noteMap` erfasst `grampId` + `_extra` (style/change/citref); `_noteId` propagiert beide; `_noteHandleFromObj` nutzt `grampId` + `_extra`; Note-XML gibt `_extra` aus~~ | ~~M~~ | **erledigt sw v417** |
| ~~GRAMPS-PlacePassthrough~~ | ~~**placeobj Sub-Elemente Passthrough**~~ | ~~`_PLACE_MODELLED`-Set; `plExtra[]` via `_xmlEl` für alle nicht-modellierten Kinder; `_extra` in `_placeObjsTemp` + `placeObjects`; Writer gibt `_extra` nach `<placeref>` aus~~ | ~~M~~ | **erledigt sw v418** |

---

### P1b — Nächster Sprint (Features)

| ID | Aufgabe | Details | Aufwand |
|---|---|---|---|
| F5 | **Lebende-Anonymisierung** | Export: Geb. >~1920 + kein Sterbedatum → "Lebende Person"; DSGVO-konform | M |
| F6 | **Strict GEDCOM Export** | Alle `_`-Tags entfernen; `p._rufname` → `2 NICK`; Export-Modus im Einstellungs-Modal | M |
| GRAMPS-Badge | **GRAMPS-Modus sichtbar machen** | Bei `db._grampsMaster`: Badge in Topbar + primäres Export-Format = `.gramps` | S |
| GRAMPS-Tags | **Tags als Badges** | `db.tags{}` in Personen-/Familien-Detail als farbige Badges | S |

---

### P2 — Mittelfristig

| ID | Aufgabe | Details | Aufwand |
|---|---|---|---|
| CrossMode-CitNotes | **Citation-Notizen im Cross-Mode** | `_citExtra[]` `<noteref>`-Einträge → `3 NOTE @grampId@` im GEDCOM-Export; setzt Fix-1 (Note-XREF) voraus; nur bei GRAMPS-Quelle aktiv | M |
| U12 | **Dark Mode** | `prefers-color-scheme` in `styles.css`; `theme_color` in `manifest.json` | M |
| F3 | **Pedigree-Collapse** | Inzucht-Koeffizient; baut auf F2-BFS auf | M |
| GRAMPS-Orte | **Orts-Picker** | `db.placeObjects{}` als strukturierter Picker (Hierarchie: Stadt → Kreis → Land) | M |
| GRAMPS-Edit | **Personen-/Ereignis-Formular** | `_grampsAttrs[]` anzeigen/editieren; `grampId` + `_grampsCall` sichtbar; Witness-Rollen read-only (Editierbarkeit → ASSO-Edit im Backlog) | M+M |
| ASSO-Parser | **ASSO-Tag parsen (GEDCOM + GRAMPS)** | `1 ASSO @Ix@` + `2 RELA`-Text parsen; in Personen-Detail read-only anzeigen (Zeuge, Pate, Trauzeugen, Nachbar…); GEDCOM 5.5.1-konform, kein Roundtrip-Delta da Passthrough | L |
| Perf-Worker | **Web Worker Duplikate-Scan** | Duplikat-Erkennung in `Worker` auslagern; entlastet Main Thread bei >2000 Personen | M |

---

### Backlog (kein festes Datum)

| ID | Aufgabe | Details | Aufwand |
|---|---|---|---|
| ASSO-Edit | **Event-Rollen editierbar** | Personen als Zeugen/Paten zu Events zuordnen; schreibt `1 ASSO`-Block in GEDCOM-Output; nur nach ASSO-Parser sinnvoll | L |
| Nachkommen | **Nachkommen-Baum** | Top-down SVG | L |
| F8 | **Cluster-Ansicht** | Personen in denselben Orten/Quellen wie Person X | L |
| F7 | **Narrative-Export** | Fließtext-Biografie → TXT/HTML; LLM-Erweiterung optional | L |
| F9 | **Zeitleiste** | Events neben historischen Ereignissen; `ui-timeline.js` | XL |
| F10 | **Buchgenerator** | HTML/PDF Familienbuch; Ahnentafel + Biografie + Fotos | XL |
| F11 | **OCR** | Urkunden-Scan → Text; WASM-Tesseract oder LLM-Backend | XL |

---

*Aufwand: XS (<1h) · S (1–2h) · M (halber Tag) · L (1–2 Tage) · XL (>2 Tage)*
*Vollständige Sprint-Geschichte: CHANGELOG.md*
