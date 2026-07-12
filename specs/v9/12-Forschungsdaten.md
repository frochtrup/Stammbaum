# 12 — Forschungsdaten

> Schicht: Kern · Abhängig von: [10 Domänenmodell](10-Domaenenmodell.md)

Forschungsartefakte hängen an Person/Familie. Alle außer Projekten **reisen mit der Datei** (GEDCOM via `_`-Tags, GRAMPS via `<attribute>`) — weil sie zur Person/Familie gehören, nicht ins App-Private (LP-3). Serialisierung: siehe [13](13-Interop-Roundtrip.md).

**Verhältnis der drei Forschungsartefakte (Nachtrag 2026-07-07, ADR-v9-36):** Task/LogEntry/Hypothesis bilden die drei Phasen eines GPS-Forschungszyklus — Task = „was ist zu tun" (zukunftsgerichtet), LogEntry = „was habe ich gesucht, was kam raus" (ein konkreter Suchvorgang), Hypothesis = „was vermute ich, warum" (schwebende Theorie bis Klärung). Bewusst **drei getrennte** Typen mit unterschiedlicher Status-Semantik statt eines gemeinsamen „Vorgang"-Typs — ein Zusammenlegen würde echte Bedeutungsunterschiede verlieren (Kanban-Status ≠ Suchergebnis ≠ Hypothesen-Verdikt). Zwei schlanke, **optionale** Vorwärts-Verweise verbinden sie, ohne die Typen zu koppeln: `ResearchTask.sourceRef` (§1) und `LogEntry.taskId` (§2). `Hypothesis.evidence` bleibt bewusst OHNE Task-/Log-Bezug (INV-H2: reine SID-Referenz, kein zweiter Verweis-Pfad zu pflegen) — eine Hypothese kann aus mehreren Sucheinträgen über Zeit entstehen, ein einzelner Log-Verweis wäre irreführend.

---

## 1. Forschungsaufgabe (Task)

```
ResearchTask {
  id, text: string
  category: 'Kirchenbuch' | 'Urkunde' | 'Online-Recherche' | …
  status: 'todo' | 'doing' | 'done'    // Kanban
  done: bool                            // INV: done === (status === 'done')
  created: date
  sourceRef: SourceId | ''              // optionaler Quellen-Bezug (v8-Parität, s. Nachtrag)
}
```
GEDCOM: `_TASK`/`_CAT`/`_TSTAT`/`_DONE`/`_ID` + optional `SOUR @Sxx@` (Standard-Tag, kein neuer `_`-Tag) für `sourceRef`. Pro Person/Familie + globale Liste (Filter Alle/Offen/Erledigt) + Markdown-Export. UI: [20 §1.11](20-Funktionen.md).

**Nachtrag (Konsistenz-Analyse 2026-07-07, ADR-v9-36):** `sourceRef` war im v8-Oracle vorhanden (`ui-views-tasks.js` `t.sid`, per Quellen-Dropdown im Aufgabe-Modal setzbar, gegen den echten v8-Code verifiziert) und ist beim v9-Neuaufsatz zunächst ohne bewusste Entscheidung entfallen — hiermit wiederhergestellt.

---

## 2. Forschungsprotokoll (Log)

```
LogEntry {
  date, repoRef: RepoId, sourceRef: SourceId, query,
  result: 'found' | 'notfound' | 'pending', note
  taskId: string | ''                   // optionaler Bezug: welche Aufgabe hat diesen Sucheintrag ausgelöst
}
```
GEDCOM `_RLOG` (Wire-Struktur analog `_TASK`, [13 §2.3](13-Interop-Roundtrip.md)). **Status (korrigiert ADR-v9-66 — vorherige Fassung war stale):** Parser + Write-Back gebaut (ADR-v9-37), globaler Protokoll-Tab (`LogView.svelte`) inkl. Markdown-Export gebaut. **Noch offen:** Research-Timeline-Umschalter (chronologische Alternativansicht, [20 §1.11(b)](20-Funktionen.md)), Ergebniswert „teilweise" (Handbuch-Vorbild, aktuell nur gefunden/nicht gefunden/ausstehend), UI-Kurzweg „aus Aufgabe direkt Protokolleintrag anlegen" trotz vorhandener `taskId`-Kernverknüpfung.

**`taskId`-Verknüpfung (Konsistenz-Analyse 2026-07-07, ADR-v9-36):** verbindet einen Sucheintrag mit der Aufgabe, die ihn veranlasst hat — schließt die bislang fehlende Verbindung zwischen „was ist zu tun" (Task) und „was habe ich gesucht" (Log), die weder im v8-Oracle noch in der ursprünglichen v9-Spec bestand. Bewusst NUR ein optionaler Vorwärts-Verweis (Log → Task), keine erzwungene 1:1-Kopplung oder automatisches Schließen der Aufgabe — eine Aufgabe kann mehrere Sucheinträge brauchen, bevor sie erledigt ist; das Schließen bleibt eine bewusste Nutzerhandlung (`status`), kein abgeleiteter Seiteneffekt.

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

**Status (korrigiert ADR-v9-66):** `evalToQuay()`/`makeEvidenceEval()` gebaut und getestet (`core/research/eval.ts`). UI-Verdrahtung (Bewertungs-Aufklapper an der Zitat-Zeile, [20 §1.11(c)](20-Funktionen.md)) noch offen — im Code selbst als TODO markiert (`ui/shell/SourceCitationRow.svelte`).

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

**Bewusst OHNE Task-/Log-Bezug (Konsistenz-Analyse 2026-07-07, ADR-v9-36):** anders als `LogEntry` bekommt `Hypothesis` KEINEN `taskId`/Log-Verweis — eine Hypothese verdichtet sich typischerweise aus mehreren Sucheinträgen über Zeit, ein einzelner Vorwärts-Verweis wäre irreführend bzw. würde nur den letzten Auslöser abbilden. `evidence` bleibt die einzige Verknüpfung nach außen (SID-Referenz, INV-H2).

**Bewusste Abgrenzung (Kern-Entscheidung):** *leichte* statusbehaftete Annotation, KEIN Alternativ-Baum / Zwei-Schichten-Evidenzmodell. Die Hypothese ist Metadaten *über* die Person; sie ändert die Fakten nicht. (Ein Alternativ-Baum bräche die Roundtrip-Treue — siehe [01 §4 Nicht-Ziele](01-Vision-und-Prinzipien.md).)

- **INV-H1:** `weight` (Forscher-Konfidenz zur Hypothese) ist getrennt von `citation.quay`/`eval` (Qualität der Quelle).
- **INV-H2:** Evidenz ist SID-Referenz, kein duplizierter Zitatkörper (kein Dangling, keine Doppelung).

---

## 5. Forschungsprojekt (App-privat)

```
Project { id, name, color, scope: {surnames[], places[], yearFrom, yearTo, personIds[]}, note, created }
```
Reist **nicht** mit der Datei (app-privat, geräteweit — Persistenz siehe [30 §2](30-NFR-und-Persistenz.md)). Scope-Filter über die Personenliste; aktives Projekt als Chip-Selektor. UI: [20 §1.11(f)](20-Funktionen.md), Budget-Platzierung [21 §6h](21-UI-UX.md).

**Status (korrigiert ADR-v9-66):** Typ + Konstruktor (`makeProject`) gebaut (`core/research/project.ts`), keine Persistenz, keine UI. **Noch offen:** die Scope-Matching-Funktion selbst (welche Personen erfüllen `ProjectScope` — UND-Verknüpfung der drei Achsen, leere Achse schränkt nicht ein) existiert noch nicht, nur der Typ.
