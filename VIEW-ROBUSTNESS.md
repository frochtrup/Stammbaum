# View-Robustheit — Technisches Detail-Design & Roadmap

> Status: **P0 ✅ · P1 ✅ · P2 ✅ · P3 ✅ · P4–P5 offen** · erstellt 2026-06-06 · Branch `v8-dev` · Stand-Code: sw v867
> Ergebnis eines gesamthaften Reviews der View-Switching-Architektur. Behebt 4 vom Nutzer reproduzierbare Bugs und schließt strukturelle Lücken in State-Modell und Lifecycle.
> Kern-Architektur-Entscheidungen werden nach Abschluss in `ARCHITECTURE.md` (ADR-025 vorgesehen) überführt; dieses File dokumentiert Befunde, Maßnahmen und Reihenfolge bis dahin.

---

## 1. Symptome (Nutzerbericht)

| # | Beobachtung | Häufigkeit |
|---|---|---|
| 1 | „Void mit PersonDetail-Artefakt beim Runterscrollen" nach Tab- oder App-Wechsel | reproduzierbar auf iOS-PWA |
| 2 | Änderungen im Detail-Fenster (Edit/Save) **aktualisieren die Listen nicht** — manueller Tab-Wechsel nötig | systematisch |
| 3 | Zuletzt gewählte Person/Familie/Ort beim Tab-Rückwechsel **nicht stabil** | sporadisch, mehrere Pfade |
| 4 | **Leere Seiten** bei Erstanwahl eines Tabs | beim App-Start + nach PWA-Resume |

---

## 2. Architektur-Diagnose (Gesamtbild)

Die View-Architektur ist gewachsen; **drei parallele Quellen** halten Auswahl-State, ohne synchronisiert zu sein:

| Quelle | File:Line | Verwendung | Risiko |
|---|---|---|---|
| `AppState.currentPersonId` / `currentFamilyId` / `currentSourceId` / `currentPlaceName` | gedcom.js:12-16 | „Was steht gerade in der Detail-Ansicht" — wird beim `showDetail` einer anderen Entität auf `null` gewischt (ui-views-person.js:686-690 u. ä.) | Nur **eine** der vier IDs ist je gesetzt → keine pro-Tab-Erinnerung |
| `UIState._lastTabSel.{persons,families,places,sources}` | ui-views.js:406 | „Was war zuletzt im jeweiligen Tab gewählt" | Nur in `showDetail`/`showFamilyDetail`/… geschrieben (ui-views-person.js:691, ui-views-family.js:390, ui-views-place.js:809, ui-views-source.js:13). Nur von `_desktopAutoSelect` gelesen — mobile ignoriert es. Nicht persistent. |
| `UIState._navHistory` | gedcom.js:42 | Globaler Back-Stack über alle Detail-Ansichten | Orthogonal zu `_lastTabSel`, mischt Tabs |

**Zwei strukturelle Folgen:**
- **Mobile hat keinerlei Selektions-Restore** — `_desktopAutoSelect` returned früh bei `!desktop-mode` (ui-views.js:405).
- **Kein PWA-Lifecycle** — `visibilitychange`, `pagehide`, `pageshow`, `freeze`, `resume`: 0 Handler in `*.js` + `index.html`. iOS-Resume-Glitches sind nicht abgefangen.

---

## 3. Befunde — pro Bug (mit File:Line)

### Bug 1 · Void/PersonDetail-Artefakt nach Tab/App-Wechsel

**Wahrscheinliche Hauptursache:** stehengebliebenes `scrollTop` auf `#v-detail` im Mobile-Zweig.

`showView` (ui-views.js:39) setzt `_det.scrollTop = 0` **nur im Desktop-Zweig** (ui-views.js:90):
```js
if (desktop) {
  …
  if (id === 'v-detail') { const _det = …; _det.scrollTop = 0; _normalizeWheel(_det); _initDetailSwipe(); … }
} else {
  …
  if (id === 'v-detail') _initDetailSwipe();   // ← KEIN scrollTop-Reset!
}
```

`window.scrollTo(0, 0)` (ui-views.js:43) wirkt nur auf `<html>`, nicht auf den inneren Scroll-Container `#v-detail`. Nach iOS-Resume zeigt `v-detail.scrollTop` noch auf die alte Y-Position; neues, kürzeres Detail-HTML → Whitespace + GPU-Composite-Reste der vorigen Person sichtbar.

**Verstärkend:** Kein `pageshow`-Handler, der nach Resume Re-Layout + scrollTop-Reset erzwingt.

### Bug 2 · Listen nicht aktualisiert nach Save

`renderTab()` (ui-views.js:455) ist das einzige Liste-Re-Render. Wird gerufen aus:
- `switchTab()` (ui-views.js:452) — beim Tabwechsel
- `showMain()` (ui-views.js:369) — beim Rückweg

**Nicht** aus den Form-Save-Handlern:
- ui-forms-person.js:447 `if (AppState.currentPersonId === id) showDetail(id);` — kein `renderTab()`
- ui-forms-event.js:287, :389, :406 — gleiches Muster
- ui-forms-event.js:538, :558 — gleiches Muster für Familie
- ui-forms-family.js:170 — gleiches Muster
- ui-forms.js:461 — Source

**Desktop:** `v-main` ist parallel zu `v-detail` aktiv (ui-views.js:82) — Liste ist sichtbar, aber DOM ist stale.
**Mobile:** Bei Rückweg via `_navHistory` (ui-views-nav.js:162-176) läuft ggf. nur `showDetail(prevId)` ohne `renderTab`.

**Verschärfend (R5):** `markChanged()` (ui-views.js:503) invalidiert `_placesCache`, `_hofCache`, `_searchIndexDirty` — aber NICHT `_lastFilteredPersons` (ui-views-person.js:123). Erklärt „braucht weiteren manuellen Aufruf".

### Bug 3 · Zuletzt gewählte Entität nicht stabil

a) **Mobile** ignoriert `_lastTabSel` komplett — `_desktopAutoSelect` early-return (ui-views.js:405).
b) **`_lastTabSel.X` wird nicht validiert** — nach Merge/Delete zeigt `showDetail(id, false)` bei verschwundenem Datensatz (`if (!p) return;` ui-views-person.js:684) auf eine leere Detail-View ohne Fallback.
c) **`_lastTabSel` ist nicht persistent** — lebt im JS-Heap. Process-Kill auf iOS → weg. (`_probandId` und `_navHistory` werden in IDB persistiert über ui-views-nav.js:232-244, `_lastTabSel` nicht.)

### Bug 4 · Leere Seiten bei Erstanwahl

`showStartView()` (ui-views.js:424) ist `async`:
```js
async function showStartView() {
  AppState.currentTab = 'persons';
  showMain();                                  // ← kein _desktopAutoSelect!
  const saved = await idbGet('proband_id')…;
  …
  if (startId) showTree(startId);
}
```
1. `showMain` ruft **kein** `_desktopAutoSelect` (nur `bnavTab` tut das, ui-views.js:228) → Desktop sieht beim Start leere `#detailContent`.
2. **Orte-Tab-Erstanwahl + Race:** wenn `placeObjects` noch aus IDB lädt, ist `_firstPlaceName()` → `null` → `_desktopAutoSelect` macht nichts → leeres Detail.
3. Tasks/Stats/Search haben kein Detail — leere `#detailContent` sieht aus wie Bug.

---

## 4. Priorisierte Roadmap

### P0 — Schnellbehebung der akut schmerzenden Bugs ✅ *(sw v861, 2026-06-06)*

| ID | Aufgabe | File:Line | Status |
|---|---|---|---|
| **K1** | `_det.scrollTop = 0` auch im Mobile-Zweig von `showView('v-detail')` | ui-views.js:94-99 | ✅ |
| **K2** | `visibilitychange`-Handler: bei `visible` → `if (AppState._detailActive) v-detail.scrollTop=0; renderTab();` | ui-views.js (vor `_initOfflineDiag`) | ✅ |
| **K3** | Form-Save-Handler: nach erfolgreichem Save zusätzlich `renderTab()` rufen — Family-Save (ui-forms-family.js:168) und Source-Save (ui-forms.js:459) hatten es bereits | ui-forms-person.js (savePerson) + ui-forms-event.js (transferEvent/saveEvent/deleteEvent/saveFamEvent/deleteFamEvent) | ✅ 6/6 |
| **R5** | `markChanged()` invalidiert auch `_lastFilteredPersons` via Helper `_invalidatePersonListCache()` | ui-views.js (markChanged) + ui-views-person.js (Helper) | ✅ |

**Akzeptanzkriterien — Verifikation:**
- Mobile: nach Tab-/App-Wechsel keine Void-Artefakte mehr — durch K1 (Mobile-`scrollTop`-Reset) + K2 (visibilitychange-Resume-Reset).
- Nach Save (Person/Familie/Quelle): die Liste zeigt sofort die neuen Daten (Geb-Jahr, Name, Counts) — kein manueller Tab-Switch nötig (K3).
- `test-unit.js` weiter grün, GEDCOM-Roundtrip `net_delta=0` (kein Logik-Eingriff, nur zusätzliche UI-Refreshes).

### P1 — Selektions-Persistenz & Erstanwahl *(~1.5 h, 1 Commit, sw-Bump)*

| ID | Aufgabe | File:Line | Aufwand |
|---|---|---|---|
| **K4** | Mobile-Selektions-Restore: in `bnavTab` (oder neuem `_mobileSelectionRestore`) auch ohne `desktop-mode` `UIState._lastTabSel[tab]` lesen — nur Liste auf den Eintrag scrollen + highlighten, NICHT `showDetail` rufen (mobile soll mit der Liste starten) | ui-views.js:211-229 | 30 min |
| **K5** | `_desktopAutoSelect` Validierung: wenn `_lastTabSel.X` nicht mehr existiert → auf `smallestPersonId()` / `_smallestId(…)` / `_firstPlaceName()` fallen | ui-views.js:407-419 | 10 min |
| **K6** | `_lastTabSel` in IDB persistieren (analog `_probandId`, `_navHistory`) — überlebt Process-Kill auf iOS | ui-views-nav.js:232-244 erweitern | 20 min |
| **K7** | `showStartView`: auf Desktop nach `await idbGet` zusätzlich `_desktopAutoSelect('persons')` aufrufen → nicht-leere Detail-View beim Start | ui-views.js:424-431 | 10 min |
| **R6** | `showDetail`/`showFamilyDetail`/`showPlaceDetail`/`showSourceDetail`: `if (!entity)` → `showMain()` als Fallback statt schlucken | ui-views-person.js:684, ui-views-family.js:390, ui-views-place.js:809, ui-views-source.js:13 | 15 min |

**Akzeptanzkriterien:**
- Mobile: nach App-Resume + Tab-Tipp wird zur letzten Auswahl gescrollt und gehighlightet.
- Verlorene ID (Merge/Delete) führt nicht mehr zu leerer Detail-View.
- App-Neustart: Desktop zeigt sofort die letzte Person/Familie pro Tab.

### P2 — Zentraler ViewState-Helper *(~3 h, eigener Commit)*

| ID | Aufgabe | Detail | Aufwand |
|---|---|---|---|
| **A1** | `ViewState.setCurrent(tab, id)` / `ViewState.getCurrent(tab)` einführen | Garantien: ① schreibt in IDB-persistent, ② validiert gegen `AppState.db` (existiert die ID noch?), ③ emittiert `viewstate-change` CustomEvent. Ersetzt die parallele Buchführung `AppState.currentX` + `UIState._lastTabSel`. | M (~3 h) |

**Akzeptanzkriterien:**
- Alle Schreib-Stellen (`showDetail`/`showFamilyDetail`/…) gehen über `ViewState.setCurrent`.
- Keine direkten `_lastTabSel.X = …`-Zuweisungen mehr.
- `AppState.currentPersonId` bleibt als Read-Convenience erhalten (Shim via getter), wird aber ausschließlich aus `ViewState` abgeleitet.

### P3 — Lifecycle & Dirty-Bit *(~2 h, eigener Commit)*

| ID | Aufgabe | Detail | Aufwand |
|---|---|---|---|
| **A2** | `data-dirty`-Bit pro Tab — `markChanged()` setzt `UIState._dirty = {persons:true, families:true, …}`. Beim Tab-Aktivieren in `switchTab` → wenn `_dirty[tab]` → `renderTab()` + Reset. | Macht expliziten `renderTab`-Aufruf aus den Save-Handlern (K3) auf Sicht überflüssig — wenn der User nach Edit erst zur Liste wechselt, refreshed sie sich automatisch. | S |
| **A3** | `ui-lifecycle.js` (~50 Z.): `visibilitychange` (mit „>60 s weg → safety re-render"), `pageshow` (mit `e.persisted` → `location.reload()`), `pagehide` (Save-Hook für unflushed State) | Saubere Trennung vom View-Routing. | S |

### P4 — Hygiene & Robustheits-Quickfixes *(~1 h)*

| ID | Aufgabe | File:Line | Aufwand |
|---|---|---|---|
| **R1** | `showView` `display:none`-Stacking auf iOS — Layout-Flash über `dataset.active`-Toggle reduzieren | ui-views.js:41-42 | S |
| **R2** | `_vsP` Cache leakt nach Tabwechsel — `switchTab` ruft `_vsTeardown` für nicht-aktive Listen | ui-views.js:437 + ui-views-person.js:90 | S |
| **R3** | `_navHistory` Längen-Cap (z. B. 50 Einträge, alte abschneiden) | ui-views-nav.js:135-149 | S |
| **R4** | `_initDetailSwipe`-Bind idempotent prüfen | ui-views-tree.js:156 + Aufrufer ui-views.js:90, :94 | S |
| **R7** | `setTimeout`-Magic durchgängig auf `_afterLayout` umstellen | ui-views.js:62, :236, :373 | S |
| **SW** | `ui-book.js`/`ui-print.js`/`ui-dedup.js` aus `PRECACHE_CRITICAL` raus, in `PRECACHE_OPTIONAL`. Falsche Klassifizierung — sie sind lazy-Load (ui-event-delegation.js:310-344); Fehlen einer Datei darf nicht den ganzen `addAll` killen. | sw.js:33 | XS |

### P5 — Mittelfristige Struktur *(~5 h, größerer Refactor)*

| ID | Aufgabe | Detail | Aufwand |
|---|---|---|---|
| **A4** | Detail-View als 4 separate Container statt Single `#detailContent` (Person/Familie/Ort/Quelle/Hof) | Vorteile: per-Entität-Scroll-State, schnellerer Switch-Back, nativer Browser-Scroll-Restore. Nachteil: mehr DOM. | L |
| **A5** | `data-view-init` pro View — Unterscheidung „echt leer" vs. „noch nicht initialisiert" | Beseitigt Bug-4-Klasse strukturell. | S (im Zuge von A4) |

---

## 5. Test-Strategie

- **`test-unit.js`** bleibt grüne Pflicht. Für State-Helper (`ViewState`) neue Test-Gruppe in den Test-Harness aufnehmen (JXA + Node).
- **GEDCOM-Roundtrip `net_delta=0`** unverändert Pflicht (`test-roundtrip.js`).
- **Manuelle Verifikation pro Phase:**
  - P0: iOS-PWA hintergrund → Vordergrund, Detail scrollen → kein Artefakt. Save Birth-Datum → Liste zeigt neues Jahr ohne Tab-Wechsel.
  - P1: App killen, neu starten → letzte Auswahl pro Tab steht. Person in Detail mergen → neuer Eintritt zeigt Winner, nicht leere View.
  - P2: Keine Verhaltensänderung sichtbar (Refactor) — kein Unit-Test-Regress + manueller Smoketest aller 4 Tabs.
  - P3: Hintergrund > 60 s → Vordergrund → Liste/Detail beide aktuell.

---

## 6. Reihenfolge & Abhängigkeiten

```
P0 → unabhängig — gute erste Session
P1 → unabhängig von P0, aber sinnvoll danach (K6 baut auf IDB-Persistenz-Muster)
P2 → setzt P0+P1 voraus (sonst Doppelarbeit beim Refactor)
P3 → unabhängig, kann parallel zu P2 (A3 = isoliertes Modul)
P4 → jederzeit (Hygiene)
P5 → erst nach P2 (sonst kein sauberer State-Anker für 4 Container)
```

---

## 7. Aus-Scope (bewusst nicht enthalten)

- Datei-I/O-Pfade (storage.js, storage-file.js, onedrive.js) — keine Beobachtung, dass die View-Bugs daher kommen.
- GEDCOM/GRAMPS-Parser/Writer — orthogonal.
- Karten-/Story-/Timeline-Views — eigene Sub-Views mit eigenen Lifecycle-Eigenheiten; bei akuten Bugs separat zu reviewen.
- ES-Modul-Migration (ADR-020 Phasen 3+4) — zurückgestellt, davon unabhängig.

---

## 8. Verweise

- Architektur-Kontext: `ARCHITECTURE.md` (ADR-009 Bottom-Nav, ADR-020 ESM-Brücken)
- Memory: `feedback_preview_verification.md` (Test-Vorgehen nach UI-Änderung)
- Pflichtregeln: `CLAUDE.md` (sw-Bump pro Code-Change, Handbuch-Stand-Synchronisation)
