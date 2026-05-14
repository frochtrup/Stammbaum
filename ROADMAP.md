# Roadmap

Sprint-Geschichte aller abgeschlossenen Versionen: `CHANGELOG.md`

---

## Aktueller Stand

| Version | Branch | Status |
|---|---|---|
| 4.0–6.0 | `main` | Abgeschlossen — Details: CHANGELOG.md |
| 7.0 | `main` (PR #1) | **Abgeschlossen** |
| 8.0 | `v8-dev` | **Aktiv** |

**sw-Version:** v414 · Cache: `stammbaum-v414`
**Roundtrip GEDCOM:** stabil, net_delta=0, out1===out2 ✓ · **GRAMPS:** 60034 Checks ✓ (2894 Pers.)
**Testdaten:** Unsere Familie.gramps (2894 Pers.)

---

## Version 8.0 — Offene Aufgaben

Prioritäten: **P1** nächster Sprint · **P2** mittelfristig · **Backlog** ohne festes Datum

**Design-Constraint:** Alle neuen Features müssen den GEDCOM 5.5.1 Roundtrip (`out1===out2`, `net_delta=0`) stabil halten. Neue Datenstrukturen dürfen beim GEDCOM-Export keinen zusätzlichen Delta erzeugen — entweder als Passthrough oder als bekannte, dokumentierte Abweichung. Jede neue Abweichung vom Roundtrip-Verhalten muss explizit entschieden und in `ARCHITECTURE.md` (ADR) dokumentiert werden; sie darf nicht stillschweigend entstehen.

---

### P1 — Nächster Sprint

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
| U12 | **Dark Mode** | `prefers-color-scheme` in `styles.css`; `theme_color` in `manifest.json` | M |
| F3 | **Pedigree-Collapse** | Inzucht-Koeffizient; baut auf F2-BFS auf | M |
| GRAMPS-Orte | **Orts-Picker** | `db.placeObjects{}` als strukturierter Picker (Hierarchie: Stadt → Kreis → Land) | M |
| GRAMPS-Edit | **Personen-/Ereignis-Formular** | `_grampsAttrs[]` anzeigen/editieren; `grampId` + `_grampsCall` sichtbar; Witness-Rollen read-only (Editierbarkeit → ASSO-Edit im Backlog) | M+M |
| GRAMPS-ID | **gramps_id im Writer** | `gramps_id` aus `db.persons/families` beim GRAMPS-Export wieder ausgeben; verhindert Handle-Verlust bei Roundtrip | S |
| GRAMPS-Notes | **Notes als eigene Entität** | `db.notes{}` im Parser als eigene Tabelle; Passthrough für Top-Level-`NOTE`-Records; verhindert Datenverlust bei fremden GRAMPS-Dateien | M |
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
