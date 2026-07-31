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
  result: 'found' | 'partial' | 'notfound' | 'pending', note
  taskId: string | ''                   // optionaler Bezug: welche Aufgabe hat diesen Sucheintrag ausgelöst
}
```
GEDCOM `_RLOG` (Wire-Struktur analog `_TASK`, [13 §2.3](13-Interop-Roundtrip.md)). `result='partial'` („teilweise") trennt „nichts gefunden" von „Fund, aber unvollständig" und trägt damit die Wiedervorlage. Globaler Protokoll-Tab (personenweise gruppiert ⇄ chronologische Research-Timeline) mit Markdown-Export. UI: [20 §1.11b](20-Funktionen.md).

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

`evalToQuay()` leitet einen QUAY-*Vorschlag* ab (`original+primary`→3, `negative`→0, `authored/undetermined/indirect`→1, sonst 2). Serialisiert als **modellierter** `_EVAL`-Subtree unter SOUR (nicht verbatim — [13 §2.3](13-Interop-Roundtrip.md)). Validator-Regel `MISSING_EVAL` bewusst **default-off** (opt-in-Disziplin, [20 §3](20-Funktionen.md)). UI-Verdrahtung (Bewertungs-Aufklapper an der Zitat-Zeile): [20 §1.11c](20-Funktionen.md).

**Widerspruch zwischen Belegen — `EVIDENCE_CONFLICT`** ([ADR-v9-165](04-Entscheidungslog.md#adr-v9-165)): trägt ein Faktum ≥2 Zitate, deren `evidence`-Achse gegenläufig ist (eines `direct`, eines `negative`), meldet die Validierungs-Engine das als ⚠ Warnung ([20 §3](20-Funktionen.md)) — **dieselbe Engine, keine zweite Prüfstelle**. Ab Werk **an**, anders als `MISSING_EVAL`: die Regel schlägt ausschließlich dort an, wo jemand zwei Bewertungen bewusst gesetzt hat, klagt also nicht über Abwesenheit. Sie verlangt **keine** zweite Faktenschicht — der Widerspruch lebt in der Bewertung der Belege, nicht in konkurrierenden Werten (§4 unten, [01 §4](01-Vision-und-Prinzipien.md)). **Voraussetzungskette:** die Achsen müssen erst eingebbar (Aufklapper) und über den Roundtrip haltbar (`_EVAL`-Wire-Format) sein — sonst prüft die Regel Daten, die das Speichern nicht überleben.

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
  kind: 'free' | 'identity'             // Art der Behauptung (Vorgabe 'free')
  refs: string[]                        // weitere betroffene Datensätze (@I…@/@F…@)
}
```
GEDCOM `_HYPO`-Subtree auf INDI/FAM.

**`kind` + `refs` (ADR-v9-174).** Eine Hypothese hängt an *einem* Datensatz, spricht aber oft über **zwei** — „diese beiden sind dieselbe Person", „dieses Kind gehört in jene Familie". `refs` trägt die weiteren Bezüge (wiederholbar, Person↔Person, Person↔Familie, Familie↔Familie); `kind` sagt, **welcher Art** die Behauptung ist, damit ein Leser sie maschinell auswerten darf statt den Freitext zu raten.

- **`kind: 'identity'`** — „die referenzierten Datensätze bezeichnen dieselbe Person". Zusammen mit dem Status trägt sie das ganze Dubletten-Urteil: `rejected` = **Dublettenausschluss** (die Suche zeigt das Paar nicht mehr), `confirmed` = dokumentierte Zusammenführungs-Begründung, `open` = in Prüfung. Der Ausschluss ist damit ein belegter Befund in der Datei und **kein app-privater Merker** ([30 §2.2](30-NFR-und-Persistenz.md), [20 §1.12](20-Funktionen.md)).
- **INV-H3:** eine Hypothese mit `kind: 'identity'` hat mindestens einen `refs`-Eintrag und eine nicht-leere `rationale` — ein Ausschluss ohne Begründung ist eine Abweisung, kein Befund.
- `kind: 'free'` ist die unveränderte bisherige Hypothese; sie schreibt weder `_HKIND` noch `_HREF`.

**Bewusst OHNE Task-/Log-Bezug (Konsistenz-Analyse 2026-07-07, ADR-v9-36):** anders als `LogEntry` bekommt `Hypothesis` KEINEN `taskId`/Log-Verweis — eine Hypothese verdichtet sich typischerweise aus mehreren Sucheinträgen über Zeit, ein einzelner Vorwärts-Verweis wäre irreführend bzw. würde nur den letzten Auslöser abbilden. `evidence` bleibt die einzige Verknüpfung nach außen (SID-Referenz, INV-H2).

**Bewusste Abgrenzung (Kern-Entscheidung):** *leichte* statusbehaftete Annotation, KEIN Alternativ-Baum / Zwei-Schichten-Evidenzmodell. Die Hypothese ist Metadaten *über* die Person; sie ändert die Fakten nicht. (Ein Alternativ-Baum bräche die Roundtrip-Treue — siehe [01 §4 Nicht-Ziele](01-Vision-und-Prinzipien.md).)

- **INV-H1:** `weight` (Forscher-Konfidenz zur Hypothese) ist getrennt von `citation.quay`/`eval` (Qualität der Quelle).
- **INV-H2:** Evidenz ist SID-Referenz, kein duplizierter Zitatkörper (kein Dangling, keine Doppelung).

---

## 5. Forschungsprojekt (App-privat)

```
Project { id, name, color, scope: {surnames[], places[], yearFrom, yearTo, personIds[]}, note, created }
```
Reist **nicht** mit der Datei (app-privat, geräteweit — Persistenz siehe [30 §2](30-NFR-und-Persistenz.md)). Ein Projekt gilt trotzdem nur **für den Bestand, in dem es entstand**: `scope.personIds` sind datei-lokale Ids (Klasse B2, [30 §2.2](30-NFR-und-Persistenz.md)). Kernstück ist die Scope-Matching-Funktion `matchesScope`: welche Personen erfüllen einen `ProjectScope` — die drei Achsen Nachname/Ort/Zeitraum **UND-verknüpft**, eine leere Achse schränkt nicht ein, eine ausdrücklich in `personIds` gelistete Person ist immer enthalten. Das aktive Projekt scoped Aufgaben/Protokoll/Hypothesen/Dashboard über einen Chip-Selektor. UI: [20 §1.11f](20-Funktionen.md), Budget-Platzierung [21 §6h](21-UI-UX.md).
