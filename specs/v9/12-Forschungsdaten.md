# 12 — Forschungsdaten

> Schicht: Kern · Abhängig von: [10 Domänenmodell](10-Domaenenmodell.md)

Forschungsartefakte hängen an Person/Familie. Alle außer Projekten **reisen mit der Datei** (GEDCOM via `_`-Tags, GRAMPS via `<attribute>`) — weil sie zur Person/Familie gehören, nicht ins App-Private (LP-3). Serialisierung: siehe [13](13-Interop-Roundtrip.md).

---

## 1. Forschungsaufgabe (Task)

```
ResearchTask {
  id, text: string
  category: 'Kirchenbuch' | 'Urkunde' | 'Online-Recherche' | …
  status: 'todo' | 'doing' | 'done'    // Kanban
  done: bool                            // INV: done === (status === 'done')
  created: date
}
```
GEDCOM: `_TASK`/`_CAT`/`_TSTAT`/`_DONE`/`_ID`. Pro Person/Familie + globale Liste (Filter Alle/Offen/Erledigt) + Markdown-Export. UI: [20 §1.11](20-Funktionen.md).

---

## 2. Forschungsprotokoll (Log)

```
LogEntry { date, repoRef: RepoId, sourceRef: SourceId, query, result: 'found'|'notfound'|'pending', note }
```
GEDCOM `_RLOG`. Pro Person/Familie + globaler Protokoll-Tab + Markdown-Export.

---

## 3. Evidenzmodell (3 Achsen, GPS / Evidence Explained)

Pro Zitat (`citation.eval`, siehe [10 §5.3](10-Domaenenmodell.md)), unabhängig von QUAY:

| Achse | Werte | GEDCOM |
|---|---|---|
| Quellentyp | `original` · `derivative` · `authored` | `_STYP` |
| Information | `primary` · `secondary` · `undetermined` | `_INFO` |
| Evidenz | `direct` · `indirect` · `negative` | `_EVID` |
| Informant (optional) | Freitext oder Person-Xref | `_INFM` |

```
EvidenceEval { sourceType, infoQuality, evidence, informant }
```

`evalToQuay()` leitet einen QUAY-*Vorschlag* ab (`original+primary`→3, `negative`→0, `authored/undetermined/indirect`→1, sonst 2). Serialisiert als **modellierter** `_EVAL`-Subtree unter SOUR (nicht verbatim — [13 §2.3](13-Interop-Roundtrip.md)). Validator-Regel `MISSING_EVAL` bewusst **default-off** (opt-in-Disziplin, [20 §3](20-Funktionen.md)).

---

## 4. Hypothese (leichtes GPS-Modell)

```
Hypothesis {
  id, created
  text: string                          // die Behauptung
  status: 'open' | 'confirmed' | 'rejected'
  weight: 'low' | 'medium' | 'high'     // Forscher-Konfidenz (getrennt von Quellqualität!)
  evidence: {sourceId, page}[]          // SID-Referenzen, KEIN eigener Zitatkörper
  rationale: string                     // Beweisführung (mehrzeilig)
  conclusion: string                    // Auflösungsnotiz
}
```
GEDCOM `_HYPO`-Subtree auf INDI/FAM.

**Bewusste Abgrenzung (Kern-Entscheidung):** *leichte* statusbehaftete Annotation, KEIN Alternativ-Baum / Zwei-Schichten-Evidenzmodell. Die Hypothese ist Metadaten *über* die Person; sie ändert die Fakten nicht. (Ein Alternativ-Baum bräche die Roundtrip-Treue — siehe [01 §4 Nicht-Ziele](01-Vision-und-Prinzipien.md).)

- **INV-H1:** `weight` (Forscher-Konfidenz zur Hypothese) ist getrennt von `citation.quay`/`eval` (Qualität der Quelle).
- **INV-H2:** Evidenz ist SID-Referenz, kein duplizierter Zitatkörper (kein Dangling, keine Doppelung).

---

## 5. Forschungsprojekt (App-privat)

```
Project { id, name, color, scope: {surnames[], places[], yearFrom, yearTo, personIds[]}, note, created }
```
Reist **nicht** mit der Datei (app-privat, geräteweit — Persistenz siehe [30 §2](30-NFR-und-Persistenz.md)). Scope-Filter über die Personenliste; aktives Projekt als Chip-Selektor. UI: [20](20-Funktionen.md).
