# Changelog

Vollständige Sprint-Geschichte aller abgeschlossenen Versionen.
Aktuelle Planung: `ROADMAP.md`

---

## Version 8.0 (Branch `v8-dev`, ab 2026-05-14) — AKTIV

---

### Session 2026-05-18 — Medien-Manager: Detailansicht, Performance, Sortierung (sw v609–v625)

- **sw v609–v620** `feat(media)`: `showMediaDetail()` — Detailansicht im rechten Panel (analog Hof/Person/Quelle); globale Felder FILE/FORM/MEDI mit „Speichern (alle Ref.)"; Referenzliste mit ↗-Navigation und × Löschen; per-Ref-Felder TITL/DATE/NOTE/_PRIM; MEDI-Select + FORMAT+MEDI in einer Zeile; Inline-Suchpanel `_mdShowLinkPanel()` für + Person/Familie/Quelle; Filter-Leiste sticky via `.list-search-header`; GEDCOM: `_DATE` statt `NOTE Aufnahmedatum:`, lv=4 MEDI-Parser, `_mediaFormStr()` leitet FORM aus Dateiendung ab
- **sw v621** `feat(media)`: `_mdDeleteRef()` — × Button pro Referenzzeile; spliced aus person/family/family_media/source-Array; Redirect auf verbleibende Refs oder `goBack()`; `mediaDetailDeleteRef` im `_CLICK_MAP`
- **sw v622** `fix(media)` `docs`: × statt 🗑 (konsistent mit App); Suchpanel zeigt Lebensdaten (* Geburt † Tod) bei Personen, Heiratsdatum bei Familien; `.md-link-info` flex-column; ROADMAP + HANDBUCH Kap. 7/8/18 aktualisiert; Titelblatt auf sw v622
- **sw v623** `perf(media)`: IntersectionObserver + `_thumbCache` (Map filePath→src) — Kacheln laden erst beim Einscrolle in Viewport (rootMargin 300px); Cache überlebt Filterwechsel, cleared bei `showMediaSection()`; `_applyThumbSrc()` extrahiert; `data-thumb-id`/`data-file` auf Thumb-Divs
- **sw v624** `feat(media)` `fix(media)`: Sort-Button `⇅` in Filter-Bar — 3 Zustände Kontext/Datei↑/Datei↓; `cycleMediaSort()` + `_CLICK_MAP`-Eintrag; `display:flex` auf `.media-filter-bar` überschrieb `[hidden]` → `.media-filter-bar[hidden]{display:none}` ergänzt
- **sw v625** `fix(media)`: Medienliste nach Tab-Rückkehr aktuell — `renderTab()` erkennt aktiven Sub-Tab (toggle-media/toggle-repos/sources) und ruft `showMediaSection()`/`renderRepoList()`/`renderSourceList()` entsprechend auf; vorher wurde bei sources-Tab immer nur `renderSourceList()` gerufen

---

### Session 2026-05-17 — Diagramm-Topbars + Proband-Navigation (sw v591–v595)

- **sw v591** `feat(topbar)`: Zeitleiste als vollwertiges Diagramm — einheitliche Topbar-Struktur für alle vier Diagramme (Sanduhr, Fächer, Nachkommen, Zeitleiste): `[⌂ Proband] [⤢ Vollbild] | [Diagramm-Wechsel] [☰]`; Sanduhr: `⤢` vor Separator verschoben; Zeitleiste: `⌂ tlProbandBtn` + `⤢ tlFsBtn` vor Separator; `⧖ ◑ ⇩` danach; `tlShowProband()` Action neu
- **sw v592** `fix(topbar)`: `showFamilyDetail()` blendet `timelineBtn`/`storyBtn`/`probandBtn` explizit aus — blieben bisher von Personen-Ansicht sichtbar
- **sw v593–v595** `feat(proband)`: zwei Proband-Buttons in Person-Detail-Topbar — `⌂` (plain, `detailShowProband`, navigiert zum Probanden wie in Diagrammen) + `⌂` mit CSS-Rahmen (`.proband-set-btn`, `toggleProband`, setzt/hebt Proband) direkt vor `✎` Bearbeiten; `.proband-set-btn` Rahmen verschwindet im aktiven Zustand (goldene Füllung); Familie-Topbar blendet beide aus

---

### Session 2026-05-16 — SAFARI-SWIPE + TASK-EXPORT-MD + Menü-Reihenfolge (sw v573–v575)

- **sw v573** `feat(nav)`: SAFARI-SWIPE — `history.pushState({app:true},'')` beim App-Start in `DOMContentLoaded` (ui-views.js); `popstate`-Listener: Re-Anker sofort pushen + `goBack()` aufrufen; verhindert State-Verlust durch Safari-Wischgeste nach rechts im Browser-Modus (iPhone/iPad)
- **sw v574** `feat(tasks)`: TASK-EXPORT-MD — `exportTasksMd()` in `ui-views-tasks.js`; Button „↓ MD" in `tasks-validate-bar`; pro Person: Name, Geschlecht, Geburt/Tod, Elternfamilie, eigene Ehen; pro Familie: Gatten mit Lebensdaten, Heirat, Kinderzahl; nach Kategorie sortiert; aktiver Filter (offen/erledigt/alle) übernommen; Dateiname `aufgaben_[Datei]_[YYYY-MM-DD].md`
- **sw v575** `fix(menu)`: Menü-Reihenfolge — „Datei schließen" ans Ende des Datei-Abschnitts (war nach Hilfe); „Einstellungen" hinter Trennstrich vor „Hilfe & Anleitung" (war im Datei-Abschnitt)

---

### Session 2026-05-16 — Story Mode (sw v549–v560)

- **sw v549–v552** `feat(story)`: `ui-story.js` neu — View `#v-story`; 📖-Button in Detail-Topbar; `showStory(pid)` / `printStory()` / `downloadStory()`; Nav-System (type:'story' in `_navHistory`, Back/Fwd/Verlauf-Buttons); `body.story-active` für Desktop-Layout (Detailansicht überlagern)
- **sw v549–v552** `feat(story)`: Fließtext aus GEDCOM — `_sectionEarlyLife()` (Geburt, Taufe, Eltern), `_sectionEvents()` (chronologisch), `_sectionFamilies()` (Ehen + Kinder), `_sectionDeath()` (Tod + Begräbnis), `_sectionHeader()` (Name, Lebensdaten); pronomen-aware (`_pronoun(p)`: Er/Sie/Name)
- **sw v549–v552** `feat(story)`: 18 Event-Typ-Templates in `_EV_TPL` (OCCU, RESI, EDUC, MILI, EMIG, IMMI, NATU, CONF, FCOM, GRAD, RELI, TITL, CENS, RETI, PROP, WILL, PROB, ADOP, ORDN, BAPM); generischer Fallback `ev.eventType || EVENT_LABELS[ev.type]`
- **sw v549–v552** `feat(story)`: Hero-Foto + Galerie (max. 5) async via IDB → OneDrive; Event-Fotos via `data-ev-files`; Print-CSS; HTML-Download als standalone-Datei
- **sw v553–v556** `fix(story)`: Desktop-Layout — `body.story-active #v-detail { display:none }`; `#v-story.active { display:flex }` statt globalem `#v-story`
- **sw v557–v559** `fix(story)`: `_atPlace()` kombiniert `ev.addr` + `ev.place` wie Timeline; `_fmtDate()` übersetzt GEDCOM-Qualifier (FROM/TO→von/bis, BET/AND→zwischen/und, BEF→vor, AFT→nach, ABT→um); `_shortPlace()` identisch mit Timeline; `_eventSentence` — `ev.eventType` vor `EVENT_LABELS`
- **sw v560** `feat(story)`: Leaflet-OSM-Karte ersetzt SVG-Schematik — `_initStoryMap()`; CircleMarker farbkodiert (grün=Geburt/Taufe, rot=Tod/Begräbnis, blau=Heirat); gestrichelte Polyline; `fitBounds()` auf alle Geo-Punkte

---

### Session 2026-05-16 — SAFARI-SWIPE dokumentiert

- **ROADMAP**: `SAFARI-SWIPE` als offenes Problem in T1 — Safari-Zurück-Swipe setzt App auf leere Seite zurück; Lösungsansatz `history.pushState` + `popstate`-Handler

---

### Session 2026-05-16 — Zeitleiste: Refactoring + Fixes (sw v537, v540)

- **sw v537** `refactor(timeline)`: `_HIST_EVENTS` (71 Einträge) aus `ui-timeline.js` in eigene Datei `timeline-hist-events.js` ausgelagert; `index.html` lädt die neue Datei vor `ui-timeline.js`; Ereignisliste kann damit unabhängig gepflegt werden
- **sw v540** `fix(timeline)`: undatierte Chips (Beruf ohne Datum, Kinder ohne Datum) vertikal zentriert — `top: 4px` durch `(lH - chipH) / 2 + stacki * 22` ersetzt, identische Logik wie datierte Chips

---

### Session 2026-05-16 — Zeitleiste: Tooltip + Lanes + Fixes (sw v525–v536)

- **sw v525–v536** `feat/fix(timeline)`: Mouseover-Tooltip mit Vollinformation (Jahr, Altersangabe, Ort, Beschreibung) auf allen Chips; `pointer-events: none` auf hist-Events für Tooltip-Durchlass; leere Kirche/Sonstiges-Lanes ausgeblendet; PROP-Ereignisse → Sonstiges-Lane; EVEN-Beschäftigung/Beruf → Beruf-Lane; historische Ereignisse bis 2024 (71 Einträge); Chip-Breite 140px, vertikale Zentrierung via `offsetHeight`; Basisraster volle Breite; Lanehöhen proportional skaliert; horizontales Scrollen voll ausgenutzt; `refactor(layout)`: `_afterLayout()`-Utility ersetzt alle `setTimeout(0)`-Delays; Fächer-Button navigiert korrekt nach Vollbild-Exit; Sanduhr/Fächer/Nachkommen nach Vollbild-Toggle neu rendern

---

### Session 2026-05-16 — Zeitleiste: Topbar + Vollbild + Navigation (sw v518–v524)

- **sw v518** `feat(timeline)`: Baum-gleichwertiger Topbar mit Titel + Vollbild-Button (`⤢`/`⤡`); `toggleTimelineFullscreen()` + `body.timeline-fullscreen`
- **sw v519** `feat(timeline)`: Baumnavigation vollständig in Timeline-Topbar — Sanduhr `⧖`, Fächer `✿`, Nachkommen `⇩`, Person-Button `⌂`
- **sw v520** `feat(timeline)`: `⌂` navigiert zur Sanduhr der aktuellen Timeline-Person
- **sw v521** `fix(tree)`: Sanduhr/Fächer/Nachkommen nach Vollbild-Toggle neu rendern
- **sw v522** `fix(timeline)`: direkte Navigation zu Sanduhr/Fächer/Nachkommen aus Timeline
- **sw v523** `fix(nav)`: `tree-fullscreen` + `timeline-fullscreen` beim View-Wechsel bereinigt
- **sw v524** `fix(fullscreen)`: Vollbild zwischen Views übertragen; Exit kalibriert `#v-main`; Diagramm beim Vollbild-Exit neu rendern; Exit ohne `showView`-Seiteneffekte

---

### Session 2026-05-16 — Zeitleiste: Horizontal + Swim-Lane (sw v506–v517)

- **sw v506** `fix(timeline)`: CSP-Konformität + Topbar-Layout (`#v-timeline` `always-flex`-Bug behoben)
- **sw v507–v516** `fix(timeline)`: `_shortPlace()` findet erstes nicht-leeres PLAC-Segment; RESI-Adresse wenn PLAC fehlt; `addr` erste Zeile als Ort; `eventType` als Label; Ortsdarstellung — `_shortPlace` nur beim Aufbau, `addr+place` kombiniert; Timeline-Button `⊙` → `⟷`; `⟷`-Button in Baum-Topbar; horizontale Variante gesteuert über Viewport (Breite > Höhe ∧ ≥ 500px)
- **sw v517** `feat(timeline)`: Swim-Lane-Layout für Horizontalansicht — 5 Lanes (Leben / Wohnorte / Beruf / Familie / Kirche/Sonstiges / Geschichte); `_swimLane()` klassifiziert Events; `_resolveSwimOverlaps()` verhindert Kollisionen; `_SL_LANES`, `_SL_CHIP_W=140`, `_SL_MIN_PX_Y`; Lanehöhen proportional auf verfügbare Höhe skaliert; Jahres-Skala via `yearToX()`; CSP-konform (CSSOM statt Inline-Style)

---

### Session 2026-05-16 — Zeitleiste: Grundgerüst vertikal (sw v501–v505)

- **sw v501** `feat(timeline)`: View-Container `#v-timeline`; ⊙-Button in Detail-Topbar; `showTimeline(pid)` in `UIState._navHistory`; `showView('v-timeline')`
- **sw v502** `feat(timeline)`: `_buildPersonEvents()` — Sonder-Ereignisse (BIRT/CHR/DEAT/BURI) + `p.events[]` + Heiraten + Kinder aus allen `p.fams`
- **sw v503** `feat(timeline)`: `_HIST_EVENTS` — 65 Einträge 1315–2002, Kategorien: war/disease/political/religion/natural
- **sw v504** `feat(timeline)`: Rendering geclustert-proportional — Dekaden-Blöcke; leer=36px, belegt=max(N×58, 90)px; `_decOffset()` für Lebensspanne-Balken (gold-dim)
- **sw v505** `feat(timeline)`: Filter-Toggles (Krieg/Seuche/Politik/Religion/Natur) in Topbar; Altersanzeige je Event; Nav-System in `_navHistory`-Stack; Resize-Listener für Orientierungswechsel

---

### Session 2026-05-16 — ALIA + Mobile-Karte-Fix (sw v499–v500)

- **sw v499** `feat(alia)`: `p.alia[]` — Parser liest `1 ALIA @xref@`; Writer schreibt symmetrisch; Personen-Detail zeigt verlinkte Alias-Personen als Warn-Row mit `≈`-Label + `border-left`; Edit-Formular: Alias hinzufügen/entfernen symmetrisch (beide Seiten synchron); Label auf „Selbe Person?"
- **sw v500** `fix(map)`: Orte/Höfe/Karte-Toggle auf Mobile bei Karte-Modus ausgeblendet (verhinderte Rückkehr zur Hauptnavigation)

---

### Session 2026-05-16 — MAP-MIGR: Migrationswege auf Karte (sw v498)

- **sw v498** `feat(map)`: MAP-MIGR — dritter Karten-Modus „Migrationen"; `_renderMigrModus()` zeichnet für jede Person mit ≥ 2 Geo-Events eine Linie Geburt → RESI → Tod; aufeinanderfolgende Duplikat-Koordinaten dedupliziert; Endpunkt-Marker (gefüllter Kreis) am Zielort; Tooltip mit Name, Lebensjahren, Herkunft → Ziel; Klick öffnet Exploration-Panel; Epochen-Farben via `_MIGR_EPOCHS` / `_migrColor()`: vor 1700 lila · 1700–99 blau · 1800–49 teal · 1850–99 amber · 1900–49 orange · 1950+ grau; Farb-Legende (`#map-migr-legend`) erscheint/verschwindet beim Moduswechsel; Dots als CSS-Klassen `.map-migr-e0`–`.map-migr-e5` statt Inline-Styles (CSP `style-src 'self'`)

---

### Session 2026-05-16 — VAL-FAM + VAL-CONFIG + Bugfixes (sw v496–v497)

- **sw v496** `feat(tasks/validation)`: VAL-FAM — `f._tasks[]` auf Familien-Objekten; GEDCOM-Roundtrip via `1 _TASK` unter FAM (Parser + Writer); `_famTasksSectionHtml()` in `showFamilyDetail()`; globale Task-Liste zeigt Personen- und Familien-Tasks gemischt nach Kategorie mit klickbarem Familien-Header
- **sw v496** `feat(tasks/validation)`: VAL-CONFIG — `VAL_RULES` + `VAL_CONFIG_DEFAULTS` in `gedcom-validator.js`; `runValidation(db, config)` mit konfigurierbaren Schwellenwerten (maxAge, staStAera, minMotherAge, maxMotherAge, maxFatherAge) und deaktivierbaren Regeln; Config in IDB (`val_config`); `modalValConfig` mit Checkboxen pro Regel + Zahlenfeldern; ⚙-Button in validate-bar; `openValConfig()` / `saveValConfig()` / `resetValConfig()`
- **sw v496** `feat(validator)`: `familyId`-Feld in Validierungsbefunden; `val-fam-link` im Panel verlinkt auf Familien-Detail; Familien-Regeln (F1–F4) mit `familyId` annotiert
- **sw v497** `fix(tasks)`: sticky header — filter-bar + validate-bar in `.tasks-sticky-header`-Wrapper (`position:sticky; top:var(--topbar-h)`); `#tab-tasks` erhält `padding-bottom` (letzte Task war hinter Bottom-Nav abgeschnitten); Befund-Dedup — bereits promovierte Tasks werden beim erneuten Prüfen herausgefiltert (Text-Abgleich mit `p._tasks[]`)

---

### Session 2026-05-15c — Nachkommen-Baum: Ehepartner/Geschwister (sw v466–v470)

- **sw v466** `feat(desc-tree)`: Ehepartner-Karte + ⚭-Button rechts neben Proband; Geschwister-Stapel links (PEEK-Überlapp); `SLOT = W + MGAP + W + HGAP`
- **sw v467** `fix(desc-tree)`: Ehepartner/Geschwister nur am Startpunkt — `renderNode` rendert Ehepartner nur wenn `isRoot`; `SLOT` zurück auf `W + HGAP`; `½`-Badge für Kinder aus Nebenehe des direkten Elternteils (`isHalf`-Flag in `_descLayout`)
- **sw v468** `fix(desc-tree)`: alle Ehepartner in Reihe (`rootSpouseIds[]` aus allen `fams`); Geschwister horizontal gestapelt statt vertikaler PEEK-Stapel — variable Überlappung, kein Konflikt mit Kind-Verbindungslinien; ⚭-Button nur noch zwischen Proband und erstem Ehepartner
- **sw v469** `fix(desc-tree)`: Klick-Navigation analog Sanduhr — alle Nicht-Proband-Karten (Kinder, Ehepartner, Geschwister) → `showDescTree()`; nur Proband → `showDetail()`
- **sw v470** `fix(desc-tree)`: Ehepartner-Überlappung bei schmalem Baum — `spouseStep = min(W+HGAP, f(treeSpan))`; Geschwister-Schritt auf `W+HGAP` gedeckelt (kein zu weites Spreizen)

---

### Session 2026-05-15b — Validierungsengine + Aufgaben-Navigation + Nachkommen-Baum (sw v462–v465)

- **sw v462** `feat(tree)`: Nachkommen-Baum (top-down SVG) — `ui-desc-tree.js` neu; Toggle-Button `⇩` neben Fächer-Button in Baum-Topbar; Gen-Buttons 2–7 (`#descGenBtns`); T-Linien-Layout; `▼`-Badge wenn Tiefe abgeschnitten; `body.desc-tree-mode`; `_navTreeFn()` in `ui-views-tree.js` für modusabhängige Tastaturnavigation; Auto-Fit + Scroll-Zentrierung
- **sw v463** `feat(validator)`: Validierungsengine `gedcom-validator.js` — `runValidation(db)` gibt reines RAM-Ergebnis zurück (keine GEDCOM-Speicherung); 11 Regeln (P1–P7 Person, F1–F4 Familie); Befunde manuell via „+" als `_task` übernehmbar; `_renderValidationPanel()` in `ui-views-tasks.js`
- **sw v464** `feat(nav)`: Aufgaben als eigener Bottom-Nav-Tab — `bnavTasks()`, `#bnav-tasks` ersetzt `#bnav-home` (Proband); Proband-Wechsel über `menuProband` im ☰-Menü; `menuValidate` startet Prüfung direkt aus Menü; `tab-tasks` im DOM; `renderTab()` ruft `renderTasksView()`
- **sw v465** `feat(tasks)`: „✓ Daten prüfen"-Button direkt im Aufgaben-Tab (`.tasks-validate-bar`) — kein Menü-Umweg nötig

---

### Session 2026-05-15a — GEDCOM-ObjePtBug: toter Code entfernt (sw v445–v447)

- **sw v445–v447** `refactor(writer)`: `_newPhotoIds`/`_deletedPhotoIds` (nie befüllte Sets) + zugehörige Writer-Blöcke entfernt; Passthrough-if/else vereinfacht auf einfaches `for`-Loop; Inline-OBJE-Löschung via `p.media[]`-Splice war bereits korrekt; Linked-OBJE-Management (`@Mxx@`) als optionales zukünftiges Feature dokumentiert

---

### Session 2026-05-14e — GRAMPS Attribute anzeigen (sw v444)

- **sw v444** `feat(gramps)`: `p._grampsAttrs[]`/`f._grampsAttrs[]` in Personen- und Familien-Detailansicht als fact-rows ausgegeben (type als Label, value als Wert, optionale Note); bisher geparst aber nie angezeigt

---

### Session 2026-05-14d — GRAMPS Speichern + Roundtrip-Test + GEDCOM-Fixes (sw v424–v443)

- **sw v424** `fix(gramps)`: `topTarget.citations` crash beim Laden behoben
- **sw v425** `fix(gramps)`: GRAMPS-Badge als fixes globales Element — in allen Views sichtbar (nicht mehr View-lokal)
- **sw v426** `fix`: `extraPlaces` per-Datei in localStorage — kein Überlauf mehr zwischen verschiedenen Dateien
- **sw v427** `feat`: Menüoption „Sichern (Original)" entfernt; verbleibende `updateBackupBtn`-Aufrufe bereinigt
- **sw v428** `feat`: einheitliches Dateihandling für GED + GRAMPS — `openFilePicker()` erkennt Dateiformat, setzt `_isGramps`; `saveToFile()` delegiert an GEDCOM oder GRAMPS-Export
- **sw v429** `fix`: GRAMPS-Speichern nutzt Originalnamen ohne Zeitstempel (statt generiertem Dateinamen)
- **sw v430** `feat`: GRAMPS direktes Speichern via File Handle — `saveToFileHandleBinary()` für gzip-Blob; `_fileHandle`/`_canDirectSave` auch für `.gramps` gesetzt; `exportGRAMPS(asSave=true)` nutzt direkten Speicherpfad auf Chrome Desktop
- **sw v431** `fix`: GRAMPS-Roundtrip-Bugs + Deep-Roundtrip-Test — `_xmlEl` Textknoten-Escaping (`&`, `<`, `>`); `<tags>`-Sektion aus `db.tags` im Writer rekonstruiert; `_fileHandle/_canDirectSave` nach `_loadGRAMPS` wiederhergestellt; `_grampsDeepRoundtrip()` prüft alle Entitäten vollständig
- **sw v432** `feat`: GRAMPS Roundtrip-Test als Debug-Button — `runGrampsRoundtripTest()` in `debug-gramps.js`; Ergebnis im Modal
- **sw v433–v439** `fix`: Roundtrip-Test-Stabilisierung — `debug-gramps.js` in SW PRECACHE; synchrones Laden von `ui-debug.js` + `debug-gramps.js`; Modal öffnet immer (auch bei Fehler); korrekte Lade-Reihenfolge
- **sw v440** `feat`: Medien-Detailcheck im GRAMPS Roundtrip-Test — vergleicht `handle`, `path`, `desc`, `mime`, `date` aller Media-Objekte
- **sw v441** `fix`: nicht-referenzierte GRAMPS-Objekte im Roundtrip erhalten — `_unreferencedObjs` via `db._grampsObjMeta` im Writer ergänzt wenn kein `objRef` existiert
- **sw v442** `fix(roundtrip)`: REPO `NOTE @xref@` + `SOUR CALN MEDI` Roundtrip-Verlust — REPO `_passthrough[]` für unbekannte lv=1-Tags (inkl. `1 NOTE @xref@`); `repoCallNumExtra[]` für `3 MEDI` unter `2 CALN`; Writer für beide aktualisiert
- **sw v443** `feat`: SOUR `NOTE @xref@` strukturiert parsen und in UI anzeigen — `1 NOTE @xref@` landet in `s.noteRefs[]` (nicht mehr in `_passthrough`); Post-Processing löst auf `s.noteText`; Writer schreibt `1 NOTE @xref@` aus `s.noteRefs`; Quellen-Detail zeigt `.note-ref-text` (read-only, visuell abgetrennt)

---

### Session 2026-05-14c — GRAMPS P1: Roundtrip-Passthrough vollständig + P1b + Badge/Tags (sw v415–v423)

- **sw v415** `fix(gramps)`: GRAMPS P1 — NoteType (`type`-Attribut auf `<note>`); PlaceObjects `grampId`; Original Media-Handles (`_grampsHandle`) statt neu generierter IDs
- **sw v416** `fix(gramps)`: GRAMPS P1 — EventHandles (`_grampsEvHlink`); Event-Passthrough `_extra[]` für `<objref>`, `<change>` via `_xmlEl`; `priv`-Attribut; Writer gibt Original-Handle + `_extra` aus
- **sw v417** `fix(gramps)`: GRAMPS P1 — CitHandles (`_grampsCitHandle`) + Citation-`_extra` für `<noteref>/<objref>/<attribute>/<change>`; Notes als eigene Entität mit `grampId` + `_extra`; alle 5 Call-Sites + Note-XML aktualisiert
- **sw v418** `fix(gramps)`: GRAMPS P1 — PlacePassthrough: `_PLACE_MODELLED`-Set; `plExtra[]` für nicht-modellierte Kinder; Writer gibt `_extra` nach `<placeref>` aus — **GRAMPS Roundtrip 60034 Checks ✓**
- **sw v419** `fix(cross-mode)`: GEDCOM Cross-Mode — Note-XREF (`_noteXref`-Lookup, 6 Stellen); `_grampsEvPriv` → `1 RESN confidential` in `eventBlock` + `p/f.events`
- **sw v420** `feat(gramps)`: Source/Repo/Person/Family `priv`-Attribut + `_extra`-Passthrough via `_xmlEl`-Pattern; `_SRC/REPO/PERSON/FAMILY_MODELLED`-Sets
- **sw v421** `fix(gedcom)`: Citation-Note via `pushCont()` — verhindert Verlust bei Zeilenumbrüchen und Texten >248 Zeichen
- **sw v422** `feat(gramps)`: Media `priv` + `_extra` Passthrough — `objMap[h]` + `db._grampsObjMeta` als Single Source of Truth; `_objHandle()` liest daraus; Writer gibt `priv` + `_extra` nach `<file/>` aus
- **sw v423** `feat(gramps)`: GRAMPS-Badge in Topbar (`#grampsBadge`, lila Pill); `updateTopbarTitle(filename, isGramps)` schaltet `hidden`; Tags-System — `tagMap` aus `<tags>`-Sektion; `p._grampsTags[]/f._grampsTags[]` mit `{name,color}`; Personen-/Familien-Detail zeigt `.gramps-tag`-Badges mit inline `background-color`; `db.tags{}` im Parser-Return

---

## Version 7.0 (Branch `v7-dev`, ab 2026-04-10) — ABGESCHLOSSEN

---

### Session 2026-05-14b — HOF-Notizen vollständig + GEDCOM-Roundtrip-Stabilisierung (sw v405–v413)

- **HANDBUCH.html** `docs`: vollständiges Benutzerhandbuch als eigenständige Offline-Seite
- **sw v408** `feat`: Handbuch-Link im Hilfe-Modal
- **HOF-Notizen** (mehrere Fixes ohne einzelne sw-Bumps):
  - Notizen korrekt per Adresse zuordnen, kein Mehrfach-Anzeigen im Personen-Detail
  - HOF-Notiz nur anzeigen wenn Event sie via `noteRefs` referenziert
  - Duplikate in GED eliminieren — HOF-Notiz-Refs und -Records konsolidieren
  - `_derivedHofObjectsFromDb` auch für Höfe ohne Koordinaten (nur Notiz reicht)
- **sw v409** `fix(roundtrip)`: event-NOTEs nicht doppelt schreiben — `_noteOrig` sichert Original-Inline-Text vor `_resolveNoteRefs()`; Writer nutzt `_noteOrig` statt aufgelöstem `note`; behebt +182 Duplikat-NOTE-Zeilen
- **sw v410** `fix(roundtrip)`: HOF-Note nur schreiben wenn Event sie ursprünglich hatte (`_evHadNote`-Guard); behebt +70 unerwünschte HOF-Notiz-Refs auf Events ohne Notiz
- **sw v411** `fix(hof)`: `hofObjects`-Merge in allen 3 Ladepfaden (IDB, GEDCOM, GRAMPS) — `Object.assign`-Shallow-Merge durch Post-Merge-Loop ersetzt der fehlende `note` aus abgeleiteten Einträgen übernimmt; behebt N_HOF_10-Verlust bei localStorage-Einträgen ohne Note
- **sw v412** `fix(parser)`: `3 CONT/CONC` unter `2 NOTE` in Sonder-Events (BIRT/CHR/DEAT/BURI) — kein `_ptDepth` gesetzt → CONT landete im lv=3-Handler; neuer Handler für `evIdx < 0`
- **sw v413** `fix(parser)`: `3 CONT/CONC` unter `2 NOTE` in FAM-Events (MARR/ENGA/DIV/DIVF/EVEN) — MARR/ENGA/DIV/DIVF NOTE-Handler setzte `_ptDepth=2` → CONT via Passthrough in `_extra`; Writer schrieb sie nach SOUR → INSTABIL; jetzt direkter lv=3-Handler hängt an `.note` an; FAM EVEN hatte gar keinen Handler
- **Roundtrip-Ergebnis**: `orig=90520 out=90520` · `✓ STABIL` (out1 === out2)

---

### Session 2026-05-14a — Hof-Umbenennen, U8 Granulares Undo, Nav 2.0 (sw v401–v404)

- **sw v401** `feat`: Hof-Umbenennen — zentrale Adressänderung für alle RESI/PROP-Ereignisse in `db.individuals`; `renameHofAddress(oldAddr, newAddr)` in `ui-views-hof.js`; aktualisiert RESI/PROP `.addr` + `hofObjects`-Key + localStorage
- **sw v401–v402** `feat(U8)`: Granulares Undo — `_undoStack/_redoStack` auf `AppState` (max 30 Schritte); `pushUndo()` an 13 Mutations-Call-Sites (savePerson, saveFamily, saveEvent, deleteEvent, mergePerson usw.); per-Entity-Snapshot (nur betroffene Persons/Families/Sources); Cmd+Z = Undo (Fallback: Revert-to-Saved), Cmd+Shift+Z = Redo; Stack-Reset bei Datei-Laden + `revertToSaved`
- **sw v403** `feat(Nav 2.0)`: Vorwärts-Navigation — `_navFwdStack` auf `UIState`; `goForward()`; `→`-Button in Detail-Topbar + Baum-Topbar; `_captureCurrentNavState()` + `_clearNavState()`; `_persistNavState`/`_restoreNavState` via sessionStorage (überlebt F5); Alt+← / Alt+→ als Keyboard-Shortcuts
- **sw v404** `fix(hof)`: erste Hof-Notiz-Fixes (Basis für v409–v413)

---

### Session 2026-05-13b — UX: Quick-Add Chips, Jump-Bar, CSP-Fix (sw v388–v390, v398–v400)

- **sw v388** `feat`: Quick-Add Chips in Personen-Detailview — fehlende Sonder-Events (BIRT/CHR/DEAT/BURI) + generische Shortcuts (RESI/OCCU/CENS) in einer Pill-Zeile; `showEventFormTyped` in `_CLICK_MAP`; `defaultType`-Parameter in `showEventForm()`
- **sw v389** `fix`: Alle Chips in einer Zeile (statt zwei), CSS-Leiche `.missing-events-row--generic` entfernt
- **sw v390** `fix`: `flex-wrap: nowrap` + `overflow-x: auto` — horizontales Scrollen statt Zeilenumbruch auf iPhone/Safari
- **sw v398** `feat`: Jump-Bar in Personen-Detailview — sticky Abschnitts-Navigation `[Daten][Notizen][Medien][Familie][Eltern]`; erscheint ab ≥3 Sektionen; `_injectJumpBar()`; Section-IDs `pdet-*`; `jumpToSection` in `_CLICK_MAP`
- **sw v399** `fix`: Jump-Bar `scroll-margin-top: calc(var(--topbar-h, 52px) + 44px)` — Offset für Topbar + Bar-Höhe
- **sw v400** `fix`: CSP — 3 `onclick=`-Handler in Template-Strings durch `data-action` ersetzt (`removeNoteRef`, `newSourceForm`, `newFamilyForm`); keine Inline-Event-Handler mehr im Codebase

---

### Session 2026-05-13 — UX: Neue-Person-Formular (sw v391–v397)

- **sw v391** `feat`: Neue-Person-Formular — Progressive Disclosure: Kern (Name/Geschlecht) + Leben (Geburt/Tod inline) immer sichtbar; optionale Felder per Field-Pills einblendbar (`_PF_PILLS`, `_renderPills()`, `_activatePill()`); Bearbeiten-Dialog bestehender Personen unverändert (alle Felder sichtbar)
- **sw v392** `feat`: Datumsfelder normalisieren bei `blur` → GEDCOM-Format (`_normQuickDate()`, `_pfParseDatePart()`): `3.5.1900→3 MAY 1900`, `mai 1900→MAY 1900`, `ca 1900→ABT 1900`, `vor/nach→BEF/AFT`; Orts-Felder mit `initPlaceAutocomplete()` (wie Event-Formular)
- **sw v393** `feat`: Pills um Taufe (CHR) + Beerdigung (BURI) erweitert (Datum+Ort inline); Notiz nach vorne; Quellen-Widget immer sichtbar; Quelle wird automatisch allen befüllten Sonderevents als Citation zugewiesen (`_mergeCits()`, `_eventCits()`)
- **sw v394** `feat`: Pills um Beruf (OCCU) + Wohnort (RESI) erweitert; pre-populiert aus erstem vorhandenen Event; `savePerson()` aktualisiert/erstellt OCCU/RESI in `events[]`; Orts-Autocomplete + Datum-Normalisierung für Wohnort
- **sw v395** `feat`: Button „+ Weitere" im Neu-Person-Formular — speichert und öffnet sofort leeres Formular (`savePerson(openNew=true)`); nur bei neuer Person sichtbar
- **sw v396** `fix`: Bearbeiten-Dialog bestehender Personen: Leben-Sektion + Ereignis-Pills ausgeblendet — Ereignisse über Detailview bearbeitbar; `#pf-life-section` Wrapper + `_EVENT_FIELDS` Set
- **sw v397** `fix`: Notiz ebenfalls aus Bearbeiten-Dialog ausgeblendet (direkt im Detailview editierbar)

---

### Session 2026-05-12 — F4b Citations-Datenmodell (sw v381)

- **sw v381** `feat(F4b)`: `citations:[{sid,page,quay,note,extra,media}]` ersetzt 6 parallele Dicts (`sources[]+sourcePages{}+sourceQUAY{}+sourceNote{}+sourceExtra{}+sourceMedia{}`); `citationObj()` Factory + `_migrateLegacyCitations()` + `_addCitRefs()` in `gedcom.js`; `_curCit`-Pattern + unified lv=3 SOUR-Handler im Parser; `_writeSourCits()` im Writer; srcWidget komplett neu (mode:'new', `addSrc`, `citidx`-basiert); `citTagsHtml()` in `ui-views.js`; alle Forms + Views migriert; `test-citations.html` T0–T7 (9070 SOUR-Refs, 5253 Zitierungen verlustfrei)

---

### Session 2026-05-10 — Refactoring-Sprint (sw v370–v380)

- **sw v370–v373** `refactor(A10)`: `unsafe-inline` aus CSP entfernt — 6 Phasen abgeschlossen; alle `style=`-Inline-Attribute in Template-Strings durch CSS-Klassen ersetzt; `<meta http-equiv="Content-Security-Policy">` ohne `'unsafe-inline'`; ADR-015 in `ARCHITECTURE.md` dokumentiert
- **sw v374–v375** `fix`: A10-Folgebug — `style.display=''` zeigte Elemente nicht wenn CSS `display:none` gesetzt; Sub-Tab-Wechsel (Orte/Höfe/Karte) löscht veralteten `detailContent`
- **sw v376** `feat(A11y)`: U16–U19 — ♂/♀-Symbol + `aria-label` auf Baum-Karten (WCAG 1.4.1); Kekule-Badge `title`; `.field-invalid` Formular-Validierung (Blur+Submit); `<label for>` in allen Formularen
- **sw v377** `refactor`: U21 `evGeoLink(lati, long)` in `ui-views.js` — 5 duplizierte `maps.apple.com`-URLs konsolidiert; Bugfix `data-action="stop"` in Events-Loop; U22 Onboarding überarbeitet (Formatzeile `.ged · .gramps`, Demo-Button mit Personenzahl)
- **sw v378** `fix`: Baum-Tooltip Felder `given`/`surname` statt `givn`/`surn`; Fallback auf `q.name`
- **sw v379** `refactor(U20)`: `_pdetLifeData()` aus `showDetail()` extrahiert (Lebensdaten-Block inkl. Events-Gruppierung)
- **sw v380** `refactor(U23)`: `ui-forms.js` aufgeteilt (1007 → 619 Z.) — `ui-forms-person.js` (Person + Extra-Name-Formular, 273 Z.) + `ui-forms-family.js` (Familie-Formular, 124 Z.); Load-Order in `index.html` + SW-Precache aktualisiert

---

### Session 2026-05-09 — A10 Analyse: unsafe-inline Scope-Aufnahme (kein sw-Bump)

**Analyse (keine Code-Änderungen):**
- Vollständige Bestandsaufnahme aller `style=`-Attribute und `style.cssText`-Zuweisungen im Projekt
- **Gefunden:** ~165 `style=` in JS-Template-Strings (17 Dateien) + **240 `style=` in `index.html`** (anfangs übersehen) = ~405 inline styles gesamt
- **Zusätzlich:** ~25 `style.cssText = '...'` (JS, nicht CSP-relevant aber Code-Qualität); ~154 `el.style.display`-Toggles in JS
- **Kategorisierung:**
  - Statisch (CSS-Klasse genügt): ~310 Stellen
  - Dynamisch (Farbe/Breite per Datenwert): ~30 Stellen — `ui-dedup.js` (scColor, score%), `ui-views-stats.js` (Balkenbreiten), `ui-views-search.js`
  - `display:none` initial + JS-Toggle: ~53 in `index.html` + je nach Template → `hidden`-Attribut + `el.hidden = true/false`
- **Aufwand revidiert:** ursprünglich M (halber Tag) → tatsächlich XL (4–5 Versionen)
- **Konsequenz:** A10 in ROADMAP.md auf XL hochgestuft und mit detailliertem Umsetzungsplan versehen

---

### Session 2026-05-09 — A5 db-Shim Setter eliminieren (sw v360)

- **sw v360** `refactor(A5)`: `setDb(newDb)` in `gedcom.js` — mutiert `AppState.db` in-place via `Object.keys` delete + `Object.assign` statt Referenz zu ersetzen; `window.db` Shim-Setter entfernt (nur Getter bleibt); alle 12 `AppState.db = …` Zuweisungen in `storage.js` (5), `storage-file.js` (2), `ui-debug.js` (5) auf `setDb()` umgestellt; in `_loadGRAMPS` lokale Variable `db` → `parsed` umbenannt um Namenskonflikt zu vermeiden; Roundtrip-Test in `ui-debug.js` sichert mit `Object.assign({}, AppState.db)` statt Referenz

---

### Session 2026-05-08 — A6 initAutocomplete() generisch (sw v354)

- **sw v354** `refactor(A6)`: Generische `initAutocomplete(inputId, ddId, opts)` in `ui-views.js` (`opts`: `getItems`, `formatLabel`, `onSelect`, `configEl?`, `onInput?`, `limit?`); `initPlaceAutocomplete` (ui-forms.js), `_initAddrAutocompleteFor` (ui-forms-event.js), `_initHofPersonSearchFor` (ui-views-hof.js) als schlanke Wrapper; eliminiert ~60 Zeilen Boilerplate (debounce, input/blur/focus-Listener, display-Logik); alle 10 Aufrufstellen unverändert

---

### Session 2026-05-08 — A3 Cache-first + A4 Fonts lokal (sw v352–v353)

- **sw v352** `perf(A3)`: SW Cache-first für App-Assets — `PRECACHE_PATHS` Set aus absoluten Pfaden; Fetch-Handler unterscheidet PRECACHE-Assets (sofort aus Cache, kein Netzwarten) von allen anderen Requests (weiter Network-first+4s); behebt 4s Ladeblockade beim App-Start bei schlechtem iOS-WLAN
- **sw v353** `feat(A4)`: Fonts lokal — `fonts/` Ordner mit 8 woff2-Dateien (Playfair Display + Source Serif 4, latin+latin-ext); `fonts/fonts.css` mit @font-face variable-weight; Google Fonts `<link>` aus index.html entfernt; CSP bereinigt (`fonts.googleapis.com` + `fonts.gstatic.com` entfernt); alle Font-Dateien in PRECACHE → Fonts verfügbar ab erstem Offline-Start

---

### Session 2026-05-08 — Security-Fixes SEC1–SEC4 (sw v351)

- **sw v351** `fix(sec)`: SEC-1 OAuth CSRF — `odLogin()` sendet zufälligen `state`-Parameter; `odHandleCallback()` verwirft Callback bei State-Mismatch; SEC-2 `safeLinkHref()` in `ui-views.js` — nur `http/https/mailto` in GEDCOM-Website-Links erlaubt; SEC-3 `ui-views-hof.js` (4×) `addr.replace(/"/g,'&quot;')` → `esc(addr)`; SEC-4 `_validCoord()` in `ui-views.js` — `isFinite()`+Range-Check ersetzt `!== null`-Checks in 6 Apple-Maps-URLs

---

### Session 2026-05-08 — F4 Soundex-Suche + OBJE-Fix (sw v349–v350)

- **sw v349** `fix`: OBJE ohne FORM — `m.form = null`; `gedcom-writer.js` gibt `FORM`-Tag nur aus wenn nicht null (GRAMPS-Kompatibilität, verhindert leere `2 FORM`-Zeilen)
- **sw v350** `feat`: F4 Soundex-Suche — `germanSoundex()` mit Umlaut-Normalisierung (Ä→A, Ö→O, Ü→U, ß→S); ≈-Toggle in globaler Suche schaltet zwischen Exact- und Soundex-Match; findet Schreibvarianten (Decker/Deker/Döker)

---

### Session 2026-05-03 — F2 Beziehungsrechner Bugfixes + Quellen-Features + Orts-Karte-Nav (sw v333–v348)

- **sw v333** `feat`: Beziehungsrechner F2 — `calcRelationship(idA, idB)` bidirektionale BFS (Tiefe 12); `_relLabel()` dt. Bezeichnungen (Vater/Mutter, Großelternteil, Onkel/Tante, Cousin n. Grads); Verwandtschafts-Sektion in `showDetail()` (klickbar); `showRelPath()`-Modal mit Pfad + gemeinsamem Vorfahren (⬡) + Kekule-Badge
- **sw v334** `fix`: PAGE/QUAY im Quellenbezug für Geburtsname/Extraname korrekt gespeichert
- **sw v335** `refactor`: `_hasMeta`-Whitelist aus `renderSrcTags()` entfernt
- **sw v336** `feat`: Quellenbezüge kopieren & einfügen — Copy-Button in Quellenbezug-Widget; Paste aus Zwischenablage
- **sw v337** `fix`: OneDrive-Dateiliste zeigt Datum + Uhrzeit
- **sw v338** `feat`: URL-Quellenbezüge als anklickbarer Link — `_WWW`-Tag in Quelle; Link-Badge in Quellenzeile
- **sw v339** `fix`: URL-Badge stoppt Event-Propagation korrekt (kein ungewolltes Detail-Öffnen)
- **sw v340–v343** `fix`: Orts-Koordinaten in Event-Objekte propagieren — `applyAllExtraPlaceCoords()` via `collectPlaces()` statt direktem Stringvergleich; alle Ladepfade (IDB, GRAMPS, Demo) abgedeckt
- **sw v344–v345** `feat`: Karte-Navigation aus Personendetail — `← Person`-Button + `× Zurück`-Button in Karten-Topbar
- **sw v346–v347** `fix`: Felder↔Freitext-Wechsel im Ortsfeld — kompakter Ortsname beim Wechsel zu Freitext; vollständiger Positionsstring in Freitext-Ansicht
- **sw v348** `fix`: F2 Bugfixes — Duplikat-`style` in `showRelPath()` zusammengeführt (`cursor:pointer` war wirkungslos); `relPathShowDetail` in `_CLICK_MAP` schließt Modal vor `showDetail()`; Pedigree-Collapse-Hinweis (`multiPath: true` wenn mehrere gleichwertige Pfade)

---

### Session 2026-05-01 — Kekule-Nummerierung + Generationstiefe (sw v330–v332)

- **sw v330** `feat`: Sanduhr-Baum bis 9 Generationen — Buttons 7–9 ergänzt; `anc6/7/8`-Arrays; `hasAnc6/7/8`-Prüfungen; `ancSlots` bis 256; `setTreeGens` Limit 6→9
- **sw v331** `feat`: Fächer-Diagramm bis 9 Generationen — `RADII` auf 10 Einträge (max. 728px); Buttons 7–9 in `#fcGenBtns`; `setFcGens` Limit 6→9
- **sw v332** `feat`: Kekule-Nummern als Badges in der Personenliste — `_buildKekuleMap()` aus Probanden (Tiefe 8) per `_kWalk`; `#N`-Badge (`.p-kekule`) rechts in jeder Zeile für direkte Vorfahren; wird bei jedem `renderPersonList()` neu berechnet

---

### Session 2026-05-01 — ASSO/Taufpaten + Assoziationen-UI (sw v323–v329)

- **sw v323–v325** `feat`: ASSO/RELA Roundtrip + Taufpaten-UI
  - `p.associations[]` (xref, `_grampsHlink`, rela, note, sources…); GEDCOM `1 ASSO … 2 RELA` ↔ GRAMPS `<personref hlink rel>` vollständiger Roundtrip
  - Phase F: `_grampsWitnessRefs[]` → ASSO via `_witnessEvMap`
  - Taufpaten in CHR-Ereignisformular (Personen-Autocomplete, Chips mit ×); `.asso-chip`s in Personendetail; `RELA_LABELS{}` in gedcom.js; `_efGodparents` Shim
- **sw v326** `feat`: Reziproke Godchild-Relation + ASSOZIATIONEN-Abschnitt in Personendetail
- **sw v327** `fix`: Patenkinder dynamisch berechnen statt nur aus gespeicherten Einträgen
- **sw v328** `feat`: Abgeleitete Assoziationen visuell kennzeichnen
- **sw v329** `feat`: Aufgaben editierbar — bestehende Forschungsaufgaben können nachträglich bearbeitet werden

---

### Session 2026-04-28 — Architektur/Security/A11y-Review-Fixes (sw v300–v302)

- **sw v300** `fix`: `user-scalable=no` aus Viewport entfernt (WCAG 1.4.4); `ui-debug.js` + Roundtrip-Test-Buttons nur bei `?debug=1` sichtbar (`data-debug-only`-Muster); Hilfe-Modal: Version dynamisch aus SW-Cache-Namen statt hardcodiert „3.0"; `ui-views.js`: `typeof`-Guard für `runRoundtripTest` in `_CLICK_MAP`
- **sw v301** *(extern — PRECACHE-Aktualisierung)*
- **sw v302** `fix`: `esc()` um `'` → `&#39;` erweitert (vollständige HTML-Escapesequenz); `loadDemo()` mit `confirmModal()` bei ungespeicherten Änderungen abgesichert; `storage-file.js` in ARCHITECTURE.md + MEMORY.md dokumentiert

---

### Session 2026-04-29 — Debug-Fixes + Q11/A7/U15 + Forschungsaufgaben (sw v303–v307)

- **sw v303** `fix`: Debug-only-Buttons via `hidden`-Attribut statt `display:none`
- **sw v304** `fix`: Debug-Modus via `#debug`-Hash (Service Worker sieht keine URL-Hashes) + `?debug=1`-Fallback
- **sw v305** `fix`: `debug-activate.js` ersetzt inline `<script>`-Block (CSP blockiert `script-src 'unsafe-inline'`)
- **sw v306** `fix`: Q11 `parseCoordInput()` Bounds-Check (`Math.abs(lat)≤90` / `Math.abs(lon)≤180`); A7 `.menu-btn` CSS-Klasse in `styles.css` (12 Inline-Styles entfernt); U15 Hilfe-Modal Tabs korrigiert + Abschnitte Baum/Orte+Höfe+Karte/Statistik/Tastaturkürzel ergänzt
- **sw v307** `feat`: Forschungsaufgaben — `TASK_CATEGORIES` (kirchenbuch/urkunde/online); `p._tasks[]` auf Person-Objekt; GEDCOM `1 _TASK` + `2 _CAT/_DONE/_DATE/_ID` Roundtrip; GRAMPS `<attribute type="_TASK" value="JSON"/>` Roundtrip; Person-Detail-Abschnitt; globale Liste mit Filter (Alle/Offen/Erledigt, nach Kategorie); Badge auf Personen-Tab; `markChanged()` beim Schreiben

---

### Session 2026-04-27 — UX/UI-Review, Statistik-Dashboard, Rufname (sw v284–v299)

- **sw v284–v288** `fix/ux`: Hof-Koordinaten Nachbesserungen + UX-Review Vorbereitung
- **sw v289–v297** `ux`: Phase 4f — UI/UX-Review
  - Touch-Targets ≥44px konsequent, Leerzustände mit CTA
  - Swipe-down Bottom-Sheet (touch-start/move/end auf `.sheet-handle`)
  - Event-Formular: Typ-Selektor als horizontales Scroll-Menü
  - Orte-Tab: Segment-Control als Pill (Orte | Höfe | Karte)
  - History-Picker Dropdown: Split-Button (← direkt / ▾ Verlauf-Dropdown)
  - Unified Navigation History: `_navHistory[]` in UIState; Baum + Detail teilen einen Stack; `treeNavBack()` delegiert an `goBack()`; `_treeHistory`/`_treeHistoryPos` entfernt
  - `showToast(msg, type)`: type = success/error/warn/info; typabhängige Dauer; `.toast-error` rot; rückwärtskompatibel
  - `confirmModal(okLabel)`: konfigurierbarer OK-Button-Text
- **sw v298** `feat`: Phase 4g — Rufname (`_RUFNAME`-Tag / NICK) GEDCOM-Roundtrip; Detailansicht Rufname unterstrichen + Spitzname kursiv; Baum: Rufname unterstrichen; `btn-danger` CSS-Refaktor
- **sw v299** `feat`: Statistik-Dashboard — `ui-views-stats.js`; 6. Tab; Kennzahlen, Altersverteilung, häufige Nachnamen, Ereignis-Abdeckung

---

### Session 2026-04-27 — Phase 4d: Hof-Koordinaten + Notizen, Roundtrip-Fixes (sw v280–v283)

- **sw v280** `feat`: Hof-Koordinaten + Notizen
  - `db.hofObjects[addr] = { addr, lat, long, note }` — localStorage (`stammbaum_hofobjects`), lazy
  - `loadHofObjects()` / `saveHofObjects()` in `ui-forms.js`
  - `ui-views-hof.js`: Koordinaten-Sektion + Formular (`showHofCoordForm`, `saveHofCoord`, `deleteHofCoord`); 📍 Icon in Hof-Liste wenn Koordinaten vorhanden
  - `ui-views-note.js`: `openNoteModal('hof', addr)` — liest/schreibt `hofObjects[addr].note`
  - `ui-views-map.js`: Gold-Rautenmarker für Höfe in Ortsmodus; RESI/PROP-Stationen in Personenbiografie nutzen hofObjects als Koordinaten-Fallback
  - `storage.js` / `storage-file.js`: `_derivedHofObjectsFromDb()` als Roundtrip-Fallback — stellt Koordinaten nach GEDCOM-Reload wieder her; Merge: `_derived` < `loadHofObjects()`
  - `gedcom-writer.js`: RESI/PROP-Events ohne PLAC → `PLAC+MAP` aus hofObjects für Ancestris-Kompatibilität; `geoLines()`: hofObjects-Fallback ergänzt
  - `gramps-parser.js`: Building/Farm/Neighborhood placeObjects → hofObjects abgeleitet
  - `gramps-writer.js`: `hofAddrToHandle{}` — neue Hof-Placeobjs als `type="Building"` mit `<coord>`; `_collectEv` nutzt hofAddrToHandle
- **sw v281** `feat`: Hof-Koordinaten GEDCOM + GRAMPS Roundtrip vollständig
  - `gedcom-parser.js`: `_derivedHofObjectsFromDb()` exportiert (für storage.js / storage-file.js)
  - `gedcom-writer.js`: PLAC+MAP an RESI/PROP-Events aus hofObjects; Hof-Notiz als `2 NOTE` (event-level, parseable)
  - `gramps-writer.js`: Building-Placeobjs mit `<coord>` + `<noteref>`; `_collectEv` korrekt verknüpft
- **sw v282** `fix`: Hof-Notiz Roundtrip via OneDrive/cross-device
  - `gedcom-writer.js`: Hof-Notiz auf `2 NOTE` (statt `3 NOTE` unter PLAC — war parser-unsichtbar); nur wenn kein eigenes Event-NOTE (`!ev.note`)
  - `gedcom-parser.js`: `_derivedHofObjectsFromDb()` erfasst jetzt auch `ev.note` — Notiz wird nach GEDCOM-Reload aus RESI-Events wiederhergestellt
- **sw v283** `fix`: hofObjects-Koordinaten haben Vorrang vor extraPlaces in `geoLines()`
  - Neue Priorität: hofObjects > extraPlaces > ev.lati/ev.long — verhindert, dass Ortsregister-Koordinaten spezifischere Hof-Koordinaten überschreiben

---

### Session 2026-04-27 — Qualitäts-Sprint P0–P4 (sw v265–v279)

- **sw v265** `fix`: XSS in Karten-Exploration-Panel — `e.date` mit `_mesc()` escapen
- **sw v266** `refactor`: `evDateKey()` nach `gedcom.js` zentralisiert (Q1)
- **sw v267** `fix`: Parse-Fehler-Toast ohne Konsolen-Verweis (U1)
- **sw v268** `refactor`: Backward-Compat-Shims bereinigt (Q3)
- **sw v269** `feat`: Erweiterte Personensuche (U7) + Baum-Namens-Limit 18/26 Zeichen (U5)
- **sw v270** `fix`: Qualitäts-Sprint 1 — S4 `buildPlacePartsHtml()` XSS-fix; S5 GEDCOM aus localStorage entfernt; S6 Redirect-URI fest kodiert
- **sw v271** `refactor`: Qualitäts-Sprint 2 — Dead Code entfernt; `showToast(type)` visuell differenziert (U4); Modal-Stack / Escape-Verhalten (U2)
- **sw v272** `refactor`: Qualitäts-Sprint 3 — `<main>`/`<nav>` Landmark-Elemente (U11b); Touch-Targets ≥44px (U10); Domain-Logik in `gedcom.js` (A3); `esc()` nach `gedcom.js` verschoben
- **sw v273** `feat`: `confirm()` → `confirmModal()` Promise (U3); Hofliste — Eigentum vor Bewohner bei gleichem Datum
- **sw v274** `feat`: Suchergebnisse ranken P3; `_rebuildPersonSourceRefs()` lazy P4
- **sw v275** `fix`: `window.db`-Shim ergänzt; Q5/Q6/Q7/Q8 abgeschlossen; U6/A4 abgelehnt
- **sw v276** `refactor`: A1 — `ui-views-note.js` (Notiz-Modal, 120 Z.) + `ui-views-search.js` (globale Suche, 139 Z.) aus `ui-views.js` extrahiert; `ui-views.js`: 935 → 683 Z.
- **sw v277** `refactor+ux`: `esc()` zentralisiert in `gedcom.js`; Focus-Trap in Modals (`openModal`/`closeModal`, Tab-Zyklus, `aria-modal`, Fokus-Rückkehr) U9; Lade-Spinner für GEDCOM/GRAMPS Parse (`#loadingOverlay`, rAF+setTimeout) A3
- **sw v279** `fix+a11y`: Q9 Input-Validierung `savePerson()`/`saveEvent()` (Name, Jahr 4-stellig, Tag 1–31, Monat); Q10 `onedrive-import.js` Foto-Injection Refaktor (`createElement`); U13 `aria-live` nach Filter/Suche; U14 VS ARIA `role=list/listitem` + `aria-setsize/posinset`; Icon-Buttons `aria-label`/`aria-expanded` (U11)

---

### Session 2026-04-16 — Kartenansicht-Ausbau + PROP in Hofhistorie (sw v251–v264)

- **sw v251** `fix`: `#mapContainer` beim Tab-Wechsel explizit ausblenden
- **sw v252** `fix`: Karte beim Wechsel zu Baum/anderen Views ausblenden
- **sw v253** `feat`: Exploration-Panel in Biografie-Modus
- **sw v254** `feat`: Person-Picker Modal in Karten-Biografie-Modus
- **sw v255** `fix`: Exploration-Panel Biografie-Modus zeigt nur Ereignisse der gewählten Person
- **sw v256** `fix`: Person-Picker Safari-Kompatibilität + Sort alphabetisch → Geburtsjahr
- **sw v257** `feat`: Vollständige Ereignisbeschreibung im Exploration-Panel
- **sw v258** `feat`: Person-Picker Sort Nachname → Vorname → Geburtsjahr
- **sw v259** `feat`: EVEN-Beschreibung in Personenbiografie-Panel + Abbrechen-Button im Person-Picker
- **sw v260** `fix`: `ev.value` für alle Ereignistypen im Karten-Biografiepanel
- **sw v261** `feat`: PROP-Ereignisse in Hofhistorie + Adress-Autocomplete in Hof-Formular
- **sw v262** `feat`: Bewohner + Eigentum in gemeinsamer Liste nach Datum sortiert
- **sw v263** `fix`: `showHofPropForm` / `saveHofEigentum` / `cancelHofEigentum` in `_CLICK_MAP`
- **sw v264** `fix`: `_renderAddBewohnerForm` fehlte in `showHofDetail`

---

### Session 2026-04-15 — Desktop-Kartenansicht + Safari-Fix (sw v245–v250)

- **sw v245** `feat`: Kartenansicht im rechten Desktop-Panel
  - `styles.css`: `body.desktop-mode.places-karte #mapContainer` → `position: fixed; left: 360px` (rechtes Panel)
  - `ui-views.js`: `switchPlacesSubTab()` zeigt Orte-Liste links + Karte rechts auf Desktop
  - `renderTab()`: stellt `places-karte`-Klasse bei Tab-Rückkehr wieder her
- **sw v246** `fix`: `#v-detail` verdeckte Karte auf Desktop
  - `switchPlacesSubTab('karte')`: `has-detail`-Klasse entfernen
  - `body.desktop-mode.places-karte:not(.has-detail) #v-detail { display: none !important }`
- **sw v247** `fix`: Safari zeigte keine Karte (weißer/brauner Hintergrund)
  - Ursache: `100dvh` in Safari < 16 nicht unterstützt; `height: auto` auf fixed Element ohne Pixel-Höhe → `height: 100%` auf Kind ergibt 0px
  - `100vh` statt `100dvh`; `position: absolute` auf `#map-leaflet` entfernt (brach Leaflet-Layout)
  - Zweites `invalidateSize()` nach 300ms als Safari-Fallback
- **sw v250** `fix`: **Eigentliche Safari-Ursache**: `#mapContainer` innerhalb `#v-main { overflow-y: auto }` — Safari clippt `position: fixed` Kinder von Scroll-Containern
  - `index.html`: `#mapContainer` direkt in `<body>` verschoben (außerhalb `#v-main`)
  - `styles.css`: `#mapContainer` immer `position: fixed` (nicht mehr `relative`); Mobile: `top = topbar+togglebar`, `bottom = bottomnav+safe-area`; Desktop: `top:0 bottom:0 left:360px right:0`

---

### Session 2026-04-15 — Duplikat-Erkennung + Merge (sw v243)

- **sw v243** `feat`: `ui-dedup.js` — Duplikat-Erkennung und Merge
  - **Levenshtein-Scoring**: Name, Geburtsjahr, Geburtsort, Geschlecht → gewichteter Score (0–100)
  - **Nachname-Bucketing** für Performance (nur gleiche/ähnliche Nachnamen vergleichen)
  - **Schwellenwert-Slider** — konfigurierbarer Ähnlichkeitsschwellenwert
  - **Ignorieren-Funktion** — Paare dauerhaft ignorieren (localStorage-persistent)
  - **`_dedupMergePersons()`** — vollständige Merge-Strategie: prefer-nonempty, merge-arrays (events, sources, notes, media), concat-text
  - **Merge-Modal** (`modalMerge`): Gegenüberstellung Gewinner/Verlierer; Felder einzeln swappbar; Eltern (`_dedupParents()`) + Partner (`_dedupPartners()`) als zusätzliche Vergleichszeilen
  - **Scan-Modal** (`modalDedup`): Trefferanzahl, Paar-Liste, Direktlink zum Merge-Modal
  - **Menü-Eintrag** "Duplikate suchen" in Hamburger-Menü
  - 6 neue `_CLICK_MAP`-Actions: `menuDedup`, `dedupRunScan`, `dedupOpenMerge`, `dedupSwapWinner`, `dedupIgnorePair`, `dedupConfirmMerge`

---

### Session 2026-04-15 — Kartenansicht (sw v244)

- **sw v244** `feat`: Kartenansicht — `ui-views-map.js` (neu), Leaflet 1.9.4 lokal
  - **Toggle "Orte|Höfe|Karte"** im Orte-Tab — dritter Punkt in `switchPlacesSubTab()`
  - **Modus "Alle Orte"**: CircleMarker für alle Orte mit Koordinaten; Größe nach Personenzahl (3 Stufen: 1–4 / 5–19 / 20+); Tooltip mit Name + Personenzahl
  - **Exploration-Panel**: Klick auf Pin → Bottom-Sheet mit Personenliste (Name, Ereignistyp, Jahr); Klick auf Person → Personen-Detail
  - **Modus "Personenbiografie"**: Person-Picker (Suche + Dropdown); alle Geo-Events als nummerierte Pins + gestrichelte Verbindungslinie chronologisch sortiert; Popup pro Pin mit Ereignisdetail
  - **"📍 Karte"-Button** in Personen-Detailansicht (nur wenn Person Geo-Events hat) → öffnet direkt Biografie-Modus
  - **`_buildPlacePersonIndex()`** — einmaliger Cache: Ort → `[{personId, role, date}]`; `invalidatePlacePersonIndex()` zum Zurücksetzen
  - **Leaflet lokal**: `leaflet.js` + `leaflet.css` direkt im Projektordner (kein CDN, CSP-sicher)
  - **Dark-Theme-Overrides**: Popups, Tooltips, Zoom-Controls, Attribution in App-Farbpalette
  - **CSP erweitert**: `img-src` um `https://*.tile.openstreetmap.org`
  - **Offline-Banner**: erscheint wenn `navigator.onLine === false`
  - SW PRECACHE: `leaflet.js`, `leaflet.css`, `ui-views-map.js` ergänzt

---

### Session 2026-04-11 — Phase 3 Bugfixes: GRAMPS Export GRAMPS-kompatibel (sw v198–v204)

- **sw v198** `fix`: DTD-Reihenfolge `name*` vor `gender` (kein Effekt — war nicht die Ursache)
- **sw v199** `fix`: gender-Parser case-insensitive; Writer → `male/female/unknown` (falsch, s.u.)
- **sw v200** `fix`: Source-Medien (`<objref>` auf `<source>`) werden jetzt geparst
  - Parser: `srcMedia[]` aus `<objref>`-Elementen in `<source>` aufgebaut
  - Deep Test: 60034 Checks (138 neue Source-Media-Checks) ✓
- **sw v201** `fix`: NS/Version aus Originaldatei übernehmen (kein Effekt — Original war bereits 1.7.2)
- **sw v202** `debug`: Gender-Statistik in `_grampsXMLDebug` (male/female/unknown Count)
- **sw v203** `fix+debug`: `_grampsMinimalTest()` — 2-Personen Test-Datei; citations/sources Reihenfolge-Experiment
- **sw v204** `fix`: **Eigentliche Gender-Ursache gefunden und behoben**
  - Original-Datei analysiert: GRAMPS 6.x erwartet `M`/`F`/`U`, NICHT `male`/`female`/`unknown`
  - Writer: `genderMap = { M:'M', F:'F', U:'U' }` statt `male/female/unknown`
  - gender kommt VOR name (wie GRAMPS es selbst ausgibt)
  - citations VOR sources (Original-Reihenfolge wiederhergestellt)
  - Deep Test: 60034 Checks ✓

**Phase 3 vollständig abgeschlossen (sw v204):** GRAMPS Export ist GRAMPS-Desktop-kompatibel

---

### Session 2026-04-11 — Phase 3: GRAMPS XML Writer + Roundtrip (sw v193–v197)

- **sw v193** `feat(Phase 3)`: `gramps-writer.js` — verlustfreier GRAMPS XML Export
  - `writeGRAMPS(db)` → gzip-komprimierter `.gramps` Blob (CompressionStream)
  - Handle-Rekonstruktion aus `db._grampsHandles` — Original-Handles erhalten
  - Neue Handles für PWA-Entitäten: `_pwa{prefix}{counter}` Format
  - Events als Top-Level-Objekte; dedupl. Citations, Places, Notes, Objects per Collector
  - GEDCOM→GRAMPS Datum: `_gedToGrampsDateXML()` für alle Formate (dateval/datespan/daterange/datestr)
  - GEDCOM→GRAMPS Eventtyp: `_GED_TO_GRAMPS`-Map; EVEN-Werte via `TypeName: description`
  - `_grampsRoundtripTest()` — Basis-Roundtrip (Counts + Person-Stichprobe)
  - `exportGRAMPS()` in `storage-file.js` — iOS Share-Sheet / Desktop-Download
  - Menü-Button "Als GRAMPS exportieren" (nur sichtbar wenn `_sourceFormat === 'gramps'`)
  - SW PRECACHE: `gramps-writer.js` ergänzt
- **sw v194** `test`: `_grampsDeepTest()` — 55534 Checks über alle Personen/Familien/Quellen
  - Alle Namen (given/surname/nick/prefix/suffix/extraNames), Daten, Orte
  - Attribute (_UID/_STAT), Medien-Pfade, GRAMPS Handles (Stichprobe 20)
- **sw v195** `feat`: GRAMPS Orts-Hierarchie vollständig erhalten
  - Parser: `placeHandleToId` + `db.placeObjects{}` (id, title, type, pnames[], lat/long, parentId)
  - Alle Place-Handles in `_grampsHandles` für Round-trip
  - `placeId` auf allen Events (structured + array, INDI + FAM)
  - Writer: `db.placeObjects` direkt schreiben (ptitle, pname[], coord, placeref-Hierarchie)
  - Fallback auf flache String-Orte für GEDCOM-Quellen
  - Fix: `_grampsHandles` Deklaration vor Places-Schleife verschoben (sw v196)
- **sw v197** `feat`: childref Attribute + vollständiger GRAMPS-Attribute-Roundtrip
  - Parser: `childref` frel/mrel → `f.childRelations[childId]`
  - Parser: Person `_grampsAttrs[]` (alle `<attribute>` außer _UID/_STAT/RESN/E-MAIL)
  - Parser: Familie `_grampsAttrs[]` (alle `<attribute>`)
  - Parser: Events `_grampsAttrs[]` (alle `<attribute>` außer Cause) — structured + array, INDI + FAM
  - Writer: childref mit `frel`/`mrel` aus `f.childRelations`
  - Writer: `_grampsAttrs` auf Events, Personen, Familien
  - Deep Test erweitert: 59896 Checks, 0 Fehler ✓

**Roundtrip-Ergebnis:** 2894 Personen, 910 Familien, 138 Quellen, 139 Orte — alle Checks ✓

---

### Session 2026-04-11 — Phase 2: GRAMPS XML Import (sw v190–v192)

- **sw v190** `feat(Phase 1)`: GRAMPS-GEDCOM-Kompatibilität
  - `detectGRAMPS(gedText)` in `storage-file.js` — Heuristik via `HEAD SOUR GRAMPS` + `_GRAMPS_ID`
  - `grampId`-Felder auf Person/Familie/Quelle strukturiert
  - `db._grampsMaster = true` Flag
- **sw v191** `feat(Phase 2)`: `gramps-parser.js` — nativer GRAMPS XML Import
  - `parseGRAMPS(file)` async → db (identische Shape wie parseGEDCOM)
  - gzip via `DecompressionStream('gzip')` + DOMParser
  - `_byTag(root, tag)` — namespace-sicherer Element-Lookup (getElementsByTagNameNS + Fallback)
  - Zwei-Pass-Parsing: Handle-Maps → vollständige Objekte
  - Event-Mapping: 25+ englische + deutsche GRAMPS-Typen → GEDCOM Tags
  - Citation-Indirektion: confidence (0–4) → QUAY (0–3)
  - Orts-Auflösung via placeMap (ptitle + Koordinaten)
  - storage-file.js: `_loadGRAMPS()`, `.gramps` in `showOpenFilePicker` types
  - index.html: `<script src="gramps-parser.js">` ergänzt
- **sw v192** `fix`: famc-Schlüssel `fam` → `famId` (Elternverknüpfungen im Baum)
  - `ui-views-tree.js` liest `ref.famId`, Parser hatte `fam: fId` → Baum zeigte keine Eltern
  - Fix: vollständige GEDCOM-kompatible famc-Shape mit `famId: fId`
  - SW-Bump erzwungen um gecachtes gramps-parser.js zu ersetzen

---

## Version 6.0 (Branch `v6-dev`, 2026-04-05 — 2026-04-10) — ABGESCHLOSSEN

---

### Session 2026-04-07 — Bugfix Safari-Syntax + CHR-Koordinaten (sw v176)

- **sw v176** `fix`: Syntax-Fehler in `savePlace()` behoben
  - `ui-views-source.js:368–369`: `??` und `||` ohne Klammern → Safari-SyntaxError → gesamtes Script geladen nicht → kaskadierend `filterSources` undefined → `toastTimer`-TDZ-Fehler in `showToast`
  - Fix: `parseFloat(latiRaw) || null` in eigene Klammern gefasst
  - Nebenfix: CHR-Koordinaten in `collectPlaces()` ergänzt (`p.chr.lati/long` statt `null, null`)
  - Nebenfix: `extraPlaces`-Koordinaten haben jetzt Vorrang vor GEDCOM-Werten (überschreiben bestehenden Eintrag wenn `ep.lati != null`)

### Session 2026-04-07 — Koordinaten im Ort-Formular editierbar (sw v175)

- **sw v175** `feat`: Ort-Bearbeitungs-Formular (`modalPlace`) um Koordinaten-Felder erweitert
  - `index.html`: `pl-lati`/`pl-long` als Dezimalgrad oder GEDCOM-Format (N48.1374/E11.5755)
  - `showPlaceForm()`: bestehende Koordinaten aus `extraPlaces` oder `collectPlaces`-Cache vorbefüllen
  - `savePlace()`: `parseGeoCoord()` + `parseFloat()` als Fallback; Koordinaten immer in `extraPlaces` schreiben (Eintrag wird ggf. neu angelegt); `_placesCache` invalidiert

### Session 2026-04-07 — LON/LAT als Ortsattribut (sw v174)

- **sw v174** `refactor`: Koordinaten gehören zum Ort, nicht zum Ereignis
  - `index.html`: `ef-geo-group` (ef-lati/ef-long) aus Event-Formular entfernt
  - `ui-forms-event.js`: `_fillGeoFields()` entfernt; beim Speichern werden lati/long über `collectPlaces()` aus dem Ortsregister nachgeschlagen (Fallback: Parser-Wert bleibt erhalten)
  - `gedcom-writer.js`: `geoLines()` schlägt zuerst in `AppState.db.extraPlaces[placeName]` nach, Fallback auf `obj.lati/obj.long` (Roundtrip-Stabilität); PLAC-Bedingung vereinfacht (kein separater `|| obj.lati !== null`-Zweig mehr)
  - **Effekt**: Koordinaten an einem Ort einmal pflegen (Ort-Detailansicht → Bearbeiten) → wirkt automatisch auf alle Ereignisse an diesem Ort

### Session 2026-04-07 — Familie-Formular PAGE+QUAY + ExtraNames klickbar (sw v170)

- **sw v170** `feat`:
  - **Familie-Formular**: Quellen-Widget (`ff`) zeigt jetzt PAGE + QUAY; `initSrcWidget('ff', ...)` erhält `marr.sourcePages`/`marr.sourceQUAY`; `saveFamily()` speichert beide Felder; `_hasMeta` um `'ff'` erweitert
  - **ExtraNames in Personendetail**: zusätzliche Namensangaben sind jetzt klickbar (`data-action="showPersonForm"`) und öffnen das Personen-Bearbeitungs-Formular; Quellen-Badges mit QUAY-Farbe werden angezeigt; `showPersonForm` in `_CLICK_MAP` ergänzt

### Session 2026-04-07 — QUAY-Farbindikator auf Quellen-Badges (sw v169)

- **sw v169** `feat`: Farbliche QUAY-Qualitätsstufen auf `.src-badge`
  - `sourceTagsHtml(ids, pageMap, quayMap)` — zwei optionale Parameter ergänzt
  - CSS: `.src-badge--q0/q1/q2/q3` — Rot/Orange/Blau/Grün je nach Qualität
  - Badge zeigt Seitenangabe als Suffix wenn ≤5 Zeichen (z.B. `§42·15`)
  - Tooltip: `"Stammrolle Bayern · S. 15 · Q2 – plausibel"`
  - `factRow()` um `pageMap`/`quayMap` erweitert (rückwärtskompatibel)
  - `ui-views-person.js`: alle 5 `sourceTagsHtml()`-Aufrufe übergeben jetzt page/quay-Maps (BIRT/CHR/DEAT/BURI/Events)
  - `ui-views-family.js`: Heirat + Familien-Events mit page/quay-Maps

### Session 2026-04-07 — UX-Verbesserungen (sw v168)

- **sw v168** `feat`: 4 kleine Erweiterungen aus Roadmap
  - **HTTP-Links klickbar**: `linkifyUrls()` in `ui-views.js`; Quellen-Notiz im Quellendetail rendert URLs als anklickbare `<a>`-Tags
  - **LON/LAT editierbar**: Koordinaten-Felder (`ef-lati`/`ef-long`) im Event-Formular für alle Typen inkl. BIRT/CHR/DEAT/BURI; Helfer `_fillGeoFields()`; `parseGeoCoord()` beim Speichern; GEDCOM-Format `N49.123456` / `E12.567890`
  - **PAGE + QUAY im Personen-Formular**: `renderSrcTags()` zeigt PAGE/QUAY-Felder jetzt auch für Prefix `pf` (Person) und `fev` (Familien-Event); `showPersonForm()` initialisiert Widget mit `topSources`/`topSourcePages`/`topSourceQUAY`; `savePerson()` speichert diese Felder
  - **Quellendetail mit PAGE/QUAY**: `_collectSourceMeta(entity, sid)` durchsucht alle Events, topSources, BIRT/DEAT/CHR/BURI und FAM-Events; Ergebnis (z.B. `S.42 Q2`) erscheint in der Referenzliste des Quellendetails bei Personen und Familien

### Session 2026-04-06 — writeGEDCOM() aufgeteilt (sw v167)

- **sw v167** `refactor`: `writeGEDCOM()` (477 Z.) in Subfunktionen aufgeteilt
  - `gedcom-writer.js`: neue Top-Level-Funktionen `writeINDIRecord`, `writeFAMRecord`, `writeSOURRecord`, `writeREPORecord`, `writeNOTERecord` — je ein Writer pro Record-Typ
  - `writeSourCitations(lines, sourLv, obj)` — SOUR+PAGE+QUAY+NOTE+_extra+OBJE war 4× dupliziert
  - `writeCHAN(lines, obj, lv=1)` — CHAN+DATE+TIME war 4× dupliziert
  - `_mediaFormStr(m)` — FORM-Ableitung aus Dateiendung war 3× dupliziert
  - `geoLines` + `eventBlock` aus Inner-Functions herausgehoben (benötigen nun `lines` als Parameter)
  - **Bugfix:** FAM-events-Schleife duplizierte den SOUR-Zitierblock manuell statt `writeSourCitations` zu nutzen
  - `writeGEDCOM()` ist jetzt ~35 Z. (HEAD + 5 Record-Schleifen + TRLR)

---

### Session 2026-04-06 — SW Offline-Fallback + Security-Review (sw v162)

- **sw v162** `feat`: Service Worker Offline-Fallback
  - `sw.js`: `offline.html` in PRECACHE aufgenommen; Cache-Version → v162
  - `sw.js`: catch-Handler prüft `event.request.destination === 'document'` — nur Navigation-Requests erhalten `offline.html` als Fallback; Sub-Ressourcen (JS, CSS, Bilder) geben `undefined` zurück (korrekt)
  - `offline.html`: neue self-contained Offline-Seite (inline styles, kein ext. CSS/JS, kein Script); passt zum App-Design; "Erneut versuchen"-Link auf `./`
  - Vorher: leererer Cache + Netz-Timeout → weißer Screen; jetzt: on-brand Fehlermeldung
  - Security-Review `onclick=`-Handler: 95 inline `onclick=` in `index.html` blockieren `unsafe-inline`-Entfernung aus CSP; Risiko niedrig für aktuelle Nutzung — dokumentiert als **Pflicht-TODO vor** GED-Import aus unbekannter Quelle / Sharing-Features (ROADMAP.md)

---

## Version 5.0 (Branch `v5-dev`, 2026-03-30 — 2026-04-05) — ABGESCHLOSSEN

---

### Session 2026-04-05 — OneDrive-Startsequenz + Offline-Sync-Indikator (sw v149–v152)

- **sw v149** `fix`: sourceRefs nach Event-Save/Delete rebuilden
  - `ui-forms-event.js`: `saveEvent()` + `deleteEvent()` rufen nach Änderung `_rebuildPersonSourceRefs()` bzw. `_rebuildFamilySourceRefs()` auf
  - `ui-forms.js`: `saveFamily()` berücksichtigt jetzt alle FAM-Events (ENG/DIV/DIVF) für `sourceRefs` — nicht nur Hochzeits-Quellen
  - Behoben: Neue Quellenzuordnung erschien nicht sofort in Quellendetail „Verwendet in"

- **sw v150** `feat`: Ereignisliste Personendetail — Gruppierung + Sortierung
  - `ui-views-person.js`: Gleiche Ereignistypen werden als Block zusammengefasst (alle OCCU, alle RESI etc.)
  - Innerhalb jedes Blocks: chronologisch sortiert; undatierte Ereignisse ans Ende
  - Reihenfolge der Gruppen folgt der Typen-Reihenfolge im Ursprungsarray

- **sw v151** `feat`: OneDrive-Startsequenz
  - `onedrive.js`: Auswahl-Dialog bei Neustart (kein Session-Token): "☁ Von OneDrive laden" vs. "📱 Lokal"
  - Gleiche Session (Token in sessionStorage): direkt von OneDrive laden — kein veralteter IDB-Stand
  - `od_autoload_pending`: nach OAuth-Redirect wird Datei automatisch geladen
  - Timeout 8s + stiller Fallback auf IDB bei Fehler oder Offline
  - `_odRefreshTokenSilent()` — Token-Refresh ohne OAuth-Redirect (kein ungewolltes Login)
  - `window._odCallbackPromise` — `window.load`-Handler wartet auf laufenden OAuth-Callback

- **sw v152** `feat`: Offline-Sync-Indikator
  - `index.html`: Floating Pill `#sync-indicator` über Bottom-Nav — "● Nicht gespeichert" + Speichern-Button
  - Button adaptiv: ☁ Speichern (OneDrive) · ↑ Teilen (iPhone/Share Sheet) · ↓ Speichern (Desktop)
  - `ui-views.js`: `updateChangedIndicator()` — erscheint/verschwindet synchron mit `AppState.changed`
  - Global in allen Views sichtbar; keine Schaltflächenanpassung nötig

---

### Session 2026-04-05 — INDI-Events erweitert (sw v147–v148)

- **sw v147** `feat`: FAM-Ereignisse — Verlobung/Scheidung/Scheidungsantrag in Detailansicht editierbar
  - *(Details in vorherigem Commit)*

- **sw v148** `feat`: INDI-Events `DSCR`, `IDNO`, `SSN` — strukturiert statt passthrough
  - `gedcom-parser.js`: drei Tags zur events[]-Liste hinzugefügt → landen nicht mehr in `_passthrough`
  - `index.html`: drei neue Optionen im Ereignistyp-Dropdown (vor "Sonstiges")
  - Roundtrip bleibt `net_delta=0` — Writer behandelt alle events[] generisch

---

### Session 2026-04-05 — Performance + UX (sw v143–v146)

- **sw v143** `feat`: Medienbrowser in Personen- + Familien-Liste
  - `ui-media.js`: `showPersonMediaBrowser()` — Medien gruppiert nach Person, sortiert Nachname→Vorname A-Z
  - `ui-media.js`: `showFamilyMediaBrowser()` — Medien gruppiert nach Familie
  - `showMediaBrowser()` zeigt nun Titel `Medien-Browser · Quellen` (analog)
  - `index.html`: 📎-Button in Personen-Tab und Familien-Tab Suchzeile
  - Personen-Liste: primäre Sortierung Nachname A-Z, sekundär Vorname A-Z

- **sw v144** `feat`: Scroll-Positions-Restore beim Zurücknavigieren
  - Beim Wechsel von Liste → Detail wird Scroll-Position in `UIState._savedListScroll` gespeichert
  - `showMain()`: nach `renderTab()` wird gespeicherte Position via `setTimeout(0)` wiederhergestellt
  - Funktioniert für mobiles Window-Scroll (`window.scrollY`) und Desktop-Container (`#v-main.scrollTop`)
  - Kein Konflikt mit `_scrollListToCurrent` (rAF vs. setTimeout — setTimeout läuft danach)

- **sw v145** `feat`: Virtuelles Scrollen für Personen- und Familien-Liste
  - Listen >500 Einträge: nur sichtbare Zeilen + 600px Puffer (`_VS_BUF`) im DOM
  - Spacer-div-Ansatz: `[top-spacer][mid-content][bot-spacer]` — kein Framework
  - Constants: `_VS_ROW=69` (Zeile), `_VS_SEP=23` (Trenner), `_VS_MIN=500` (Schwellwert)
  - `_vsRender(listEl, st)`: Binary-Search für sichtbaren Bereich, O(log n)
  - `_vsSetup(listEl, st, items, renderFn)` / `_vsTeardown(st)`: Setup/Teardown per Scroll-Event
  - `_vsScrollEl()`: erkennt Desktop-Container (`#v-main`) vs. Mobile (Window)
  - VS-State: `_vsP` (Personen) + `_vsF` (Familien) in `ui-views-person.js`
  - `offsetParent`-Check: VS überspringt versteckte Tabs (display:none)

- **sw v146** `fix`: Desktop-Sync — Baum/Fan-Chart → Listen-Highlight
  - Problem: auf Desktop sind Baum und Liste nebeneinander sichtbar; nach Einführung von VS wurde `.current` nicht gesetzt wenn die Person außerhalb des gerenderten Fensters war
  - `_vsScrollAndHighlight(st, listEl, idx, dataAttr, id)`: scrollt synchron zu Item, erzwingt VS-Re-Render, setzt dann `.current`
  - `sc.scrollTop = target` ist synchronous → `_vsRender` liest sofort die neue Position
  - Fix in `_updatePersonListCurrent()` und `_updateFamilyListCurrent()`

---

### Session 2026-04-05 — Modul-Splits + Roundtrip-Fix (sw v138–v142)

- **sw v138** `refactor`: GEDCOM-Parser — Error-Sammler + Level-Validierung
  - `gedcom-parser.js`: optionaler zweiter Parameter `_errors[]` für `parseGEDCOM()`
  - Zeilen mit `lv > 4` werden in `_errors[]` protokolliert (ungültig laut GEDCOM 5.5.1)
  - Passthrough-Mechanismus läuft weiterhin für `lv > 4`-Zeilen (kein `continue`)

- **sw v139** `fix`: OneDrive — echtes Error-Handling statt `catch { return null }`
  - `onedrive.js`: alle catch-Blöcke loggen jetzt den tatsächlichen Fehler per `console.error`
  - Kein stilles Verschlucken von API-Fehlern mehr; erleichtert Debugging erheblich

- **sw v140** `refactor`: `onedrive.js` (946 Z.) → 3 Module aufgeteilt
  - `onedrive-auth.js` (113 Z.): OAuth2 PKCE — `odLogin()`, `odLogout()`, `odHandleCallback()`, `_odGetToken()`, `_odUpdateUI()`, Konstanten `OD_CLIENT_ID`/`OD_SCOPES`/`OD_AUTH_EP`/`OD_TOKEN_EP`/`OD_GRAPH`; Init-Block am Ende
  - `onedrive-import.js` (465 Z.): Foto-Import-Wizard + Ordner-Browser — `odImportPhotos()`, `_odShowFolder()`, `_odEnterFolder()`, `_odFolderBack()`, `odImportPhotosFromFolder()`, `odSetupDocFolder()`, `odPickFileForMedia()`, `_odPickSelectFile()`, `_extractObjeFilemap()`
  - `onedrive.js` (374 Z.): Media-URL, Upload, File-I/O, Pfad-Helfer, Settings — `_odGetMediaUrlByPath()`, `_odUploadMediaFile()`, `odSaveFile()`, `odLoadFile()`, `odOpenFilePicker()`, `openSettings()`, `_odGetBasePath()`, `_odToRelPath()`
  - `sw.js` + `index.html`: PRECACHE und `<script>`-Tags um die zwei neuen Dateien erweitert
  - `odSaveFile()` ruft jetzt `writeGEDCOM(true)` (mit HEAD-Datum-Update)

- **sw v141** `refactor`: `ui-forms.js` (1036 Z.) → 3 Module aufgeteilt
  - `ui-forms-event.js` (167 Z.): Event-Formular — `showEventForm()`, `saveEvent()`, `deleteEvent()`, `onEventTypeChange()`, `_efMedia`, `_renderEfMedia()`, `addEfMedia()`; `_SPECIAL_OBJ`/`_SPECIAL_LBL`-Konstanten
  - `ui-forms-repo.js` (167 Z.): Archiv-Formular + Picker + Detail — `showRepoForm()`, `saveRepo()`, `deleteRepo()`, `showRepoDetail()`, `openRepoPicker()`, `renderRepoPicker()`, `repoPickerSelect()`, `sfRepoUpdateDisplay()`, `sfRepoClear()`
  - `ui-forms.js` (707 Z.): Person/Familie/Quelle + Source-Widget + Modal-Helfer + Keyboard-Shortcuts + Utils (`esc`, `showToast`, Place-Autocomplete)
  - `sw.js` + `index.html`: PRECACHE und `<script>`-Tags um die zwei neuen Dateien erweitert

- **sw v142** `fix`: Roundtrip — Parser lv>4 passthrough + Writer idempotenz
  - **Parser-Fix**: `lv > 4`-Block hatte `continue` → Passthrough-Mechanismus wurde übersprungen → `5 TYPE photo` u.ä. wurden komplett verworfen (sw v138-Regression; `TYPE -67`, `FORM -52` im Roundtrip-Test)
  - **Fix**: `continue` entfernt; Zeile wird weiterhin als Fehler geloggt, aber der `_ptDepth`-Block auf Zeilen 124–132 fängt sie nun korrekt ab
  - **Writer-Fix**: `writeGEDCOM()` ersetzte HEAD `1 DATE`/`2 TIME` immer → jede Ausgabe hatte anderen Timestamp → Roundtrip instabil (out1 ≠ out2)
  - `gedcom-writer.js`: neuer Parameter `writeGEDCOM(updateHeadDate = false)` — HEAD wird nur aktualisiert wenn `true`; sonst verbatim ausgegeben
  - `storage.js`: `exportGEDCOM()` und iOS Share-Pfad rufen `writeGEDCOM(true)`; Test-/Debug-Aufrufe `writeGEDCOM()` (idempotent)
  - **Ergebnis**: Roundtrip `net_delta=0`, stabil — alle 50+ Tag-Checks bestanden; erstmals auch TIME-stabil (out1 === out2)

---

### Session 2026-04-05 — Inline Event-Handler Schulden (sw v137)

- **sw v137** `refactor`: Schwerpunkt 6 Prio 3 — Inline Event-Handler in HTML-Strings entfernt
  - 62 inline `onclick`/`oninput`/`onchange` aus Template-Literalen in 8 JS-Dateien entfernt
  - `ui-views.js`: globale Event-Delegation ergänzt — `data-action` (click), `data-change` (change), `data-input` (input)
  - `_CLICK_MAP` mit 28 Aktionen; `closest('[data-action]')` eliminiert StopPropagation-Bedarf natürlich
  - `data-action="stop"` für `<select>` in klickbaren Zeilen (verhindert versehentliche Navigation)
  - `data-action="stop"` auf Geo-Links (`<a target="_blank">`) in klickbaren Ereignis-Zeilen

---

### Session 2026-04-05 — Sicherheits-Fixes Schwerpunkt 6 Prio 1 (sw v136)

- **sw v136** `fix`: Schwerpunkt 6 Prio 1 — Sicherheit
  - `onedrive.js`: OAuth-Token (`od_access_token`, `od_refresh_token`, `od_token_expiry`) von `localStorage` → `sessionStorage` — nicht mehr über Tab-Schließen persistent, DevTools-Exposition und XSS-Angriffsfläche reduziert
  - `onedrive.js`: `odLogout()` löscht Token-Keys aus `sessionStorage`, `od_file_id`/`od_file_name` weiterhin aus `localStorage`
  - `sw.js`: Netzwerk-Timeout 4s eingebaut — bei hängendem Netz wird nach 4s auf Cache-Fallback umgeschaltet (statt unbegrenzt zu warten)
  - `sw.js`: `demo.ged` aus `PRECACHE` entfernt — wird nicht mehr bei jedem Nutzer mitgeladen

---

### Session 2026-04-05 — Quellen-Badges, OneDrive-Fix, DIV/DIVF/ENG strukturiert (sw v125–v135)

- **sw v125–v126** `feat`: Quellen-Badges für Kind-Verhältnis — `.src-badge §N`-Stil (wie Events)
  - `ui-views-family.js`: `.src-tag`-Pillen durch `.src-badge` ersetzt; `§N`-Text; Tooltip = `s.title || s.abbr`
  - `+ Q` nur wenn 0 Quellen (`_sourIds.length` statt Boolean-Kurzschluss)
  - Mehrere Quellen: alle als eigene Badges (nicht zusammengefasst)

- **sw v127** `fix`: Tooltip in `sourceTagsHtml()` zeigte `abbr` statt `title`
  - `ui-views.js`: Priorität korrigiert auf `s.title || s.abbr`

- **sw v128–v129** `fix`: `@@S2@@` — doppelte `@` in Source-IDs brachen Lookup
  - `gedcom-parser.js`: Normalisierung `.replace(/^@@/,'@').replace(/@@$/,'@')` beim Einlesen
  - Post-Processing: `sourIds`-Kopie von FAM→INDI jetzt unabhängig von `frelSeen` (war durch Ancestris `_FREL` immer geblockt)

- **sw v130–v133** `fix`: OneDrive-Speichern — Robustheit
  - `onedrive.js`: `showToast('Verbinde…')` vor Token-Check (kein stilles Versagen mehr)
  - `writeGEDCOM()` in eigenem try/catch mit eigenem Error-Toast
  - 30s AbortController-Timeout auf fetch + `res.json().catch(()=>({}))` gegen Hang bei Non-JSON-Response
  - Erfolgs-Toast zeigt vollständigen Speicherpfad in OneDrive

- **sw v134** `feat`: DIV / DIVF / ENG strukturiert in Parser + Writer + Anzeige
  - `gedcom-parser.js`: `_famEv()`-Hilfsfunktion; DIV/DIVF/ENG auf Level 1–4 vollständig geparst (DATE/PLAC/SOUR/NOTE/OBJE/MAP); ENG = Alias für ENGA
  - `gedcom-writer.js`: `eventBlock('DIV', f.div, 1)` + `eventBlock('DIVF', f.divf, 1)`; Passthrough-Filter für DIV/DIVF/ENG (verhindert Doppelausgabe)
  - `ui-views-family.js`: Anzeige-Abschnitte für Scheidung + Scheidungsantrag mit Quellen-Badges

- **sw v135** `fix`: ENGA im Passthrough-Filter ergänzt
  - `gedcom-writer.js`: Filter `/^1 (DIV|DIVF|ENG|ENGA)\b/` — verhindert Doppelausgabe von ENGA-Blöcken
  - Klarstellung: ENGA = GEDCOM 5.5.1 Standard; ENG = nicht-standard Alias (wird beim Speichern zu ENGA normalisiert)

- **Roundtrip-Test**: Passthrough-Sektionen zeigen jetzt explizite Beispielzeilen (`► 1 TAG wert`) zusätzlich zur Tag-Frequenz-Übersicht
- **Menü**: OneDrive-Aktionen an erste Position; lokale Dateioperationen als sekundäre Gruppe; Fotos-Import/Export aus Menü entfernt (über Einstellungen)
- **README**: OneDrive-Workflow als Primär-Workflow dokumentiert; lokaler Workflow als Fallback

---

### Session 2026-04-04 — PEDI-Migration + Eltern-Kind-Quellen (sw v121–v124)

- **sw v121** `feat`: PEDI statt `_FREL`/`_MREL` — GEDCOM 5.5.1 Standard für Eltern-Kind-Verhältnis
  - `gedcom-parser.js`: `PEDI` unter `FAMC` einlesen; `pedi`-Feld in FAMC-Objekt; Post-Processing-Merge FAM→INDI (`childRelations` in `famc` kopieren wenn INDI-Seite leer)
  - `gedcom-writer.js`: `_toPedi()` Mapping (deutsch/englisch → `birth|adopted|foster|sealing`); FAMC schreibt `2 PEDI` statt `2 _FREL`/`2 _MREL`; bei frel≠mrel Fallback auf `_FREL`/`_MREL`; Quellen als `2 SOUR` direkt unter FAMC (GEDCOM 5.5.1-konform); CHIL-Block ohne Sub-Tags
  - `test_idempotency.html`: Idempotenz-Test (Strategie B: parse→write→parse→write, vergleiche text1==text2) mit Migrationsreport
  - Ergebnis auf 2811 Personen: BESTANDEN; 622×PEDI birth, 0×_FREL/_MREL, 0 Datenverlust

- **sw v122** `feat`: UI für PEDI — Dropdown in Familien-Ansicht, Label in Personen-Ansicht
  - `ui-views-family.js`: Kinder-Block zeigt inline `<select>` für PEDI (leiblich/adoptiert/Pflegekind/Sealing); `savePedi()` schreibt direkt in `famc`-Eintrag
  - `ui-views-person.js`: Eltern-Rolle zeigt Suffix ` · adoptiert` / ` · Pflegekind` / ` · Sealing` wenn PEDI nicht `birth`
  - `ui-forms.js`: `famc.push()` mit vollständigem Objekt (pedi, frelSeen, mrelSeen, sourIds etc.)

- **sw v123** `feat`: Quellen für Kind-Verhältnis (FAMC) — Dialog mit PEDI + Quellenangabe
  - `index.html`: `#modalChildRel` mit PEDI-Dropdown und Quellen-Widget (src-tags/picker/PAGE/QUAY)
  - `ui-views-family.js`: `showChildRelDialog()` / `saveChildRelDialog()`; 📎-Button neben PEDI-Dropdown (öffnet Modal)
  - `ui-forms.js`: PAGE/QUAY-Felder im `src-Widget` auch für Prefix `cr` (Kind-Verhältnis)

- **sw v124** `fix`: Quell-Tags statt Büroklammer bei Kind-Verhältnis
  - `ui-views-family.js`: zeigt `src-tag`-Pillen (gold) für zugewiesene Quellen; ohne Quellen: gestrichelter `+ Q`-Button; 📎 ist Medien-Konvention und wird hier nicht verwendet

---

### Session 2026-04-04 — OneDrive-Pfad-Architektur: od_base_path (sw v107–v112)

- **sw v107** `fix`: OneDrive-Medien via `@microsoft.graph.downloadUrl` laden
  - **Ursache**: `/content`-Redirect (302 → CDN) schlägt mit CORS-Fehler fehl wenn Auth-Header
    mitgesendet wird; CDN-URL erfordert keinen Auth-Header
  - `_odGetMediaUrlByPath`: 2-Schritt: Metadaten-GET → `@microsoft.graph.downloadUrl` → Fetch ohne Auth
  - `_odGetPhotoUrl` (Legacy) + `_odGetSourceFileUrl`: gleicher Fix

- **sw v108** `fix`: Picker-Pfad ohne 'OneDrive'-Prefix + Fallback nur für Windows-Pfade
  - `_odShowFolder`: `folderPath` filtert `'OneDrive'` konsistent (wie `odImportPhotosFromFolder`)
    — verhindert `OneDrive/Pictures/foto.jpg` beim Navigieren vom Root aus
  - `_odGetMediaUrlByPath`: Basename-Fallback nur noch bei `\\`-Pfaden (Windows-GEDCOM)
    — falscher Pfad im Edit-Dialog zeigt nicht mehr das alte Bild

- **sw v109** `fix`: Ordner-Picker startet bei konfiguriertem Ordner + `parentName`-Fix
  - `odImportPhotos` / `odSetupDocFolder`: starten beim konfigurierten Ordner (nicht OneDrive-Root)
  - `_odShowAllFolders`: `parentName` via `/drive/root:`-Regex — verhindert `'root:'` im Pfad

- **sw v110** `refactor`: Pfad-basierte Medien-Architektur — `od_base_path` als einzige absolute Referenz
  - **Neues Konzept**: `od_base_path` = OneDrive-Pfad des GED-Ordners (absolut, Graph-API-Format)
  - Alle `m.file`-Werte relativ zu `od_base_path`; Laden: `fullPath = basePath + '/' + relPath`
  - `od_photo_folder` / `od_docs_folder` ersetzen `od_default_folder` / `od_doc_folder`; speichern `relPath`
  - `_odGetBasePath()` — lazy-load aus IDB mit Modul-Cache
  - `_odToRelPath(fullPath, basePath)` — subtrahiert Basispfad
  - `_odMigrateIfNeeded()` — einmalige Migration: alter `od_default_folder` → neue Struktur + `od_base_path`
  - `_odStripBaseFromPaths(basePath)` — bereinigt `m.file`-Werte in bestehenden GEDCOM-Daten
  - `_odUploadMediaFile`: gibt `relPath` zurück (Eingabe, nicht API-Antwort) — keine Pfad-Drift
  - `odImportPhotosFromFolder`: aktualisiert `f.marr.media` (vorher übersehen) + setzt `od_base_path`
  - `_addMediaToFilemap`: schreibt nicht mehr in `od_filemap`; nur Session-Cache-Invalidierung
  - `index.html`: "Lokale Pfade"-Sektion entfernt

- **sw v111** `feat`: `od_base_path` automatisch aus GED-Datei-Ordner ableiten
  - `odLoadFile`: nach Laden der GED-Datei → `parentReference.path` via Graph-API → `od_base_path`
  - Kein manuelles Setup mehr nötig; `od_base_path` wird beim ersten Öffnen einer GED-Datei gesetzt

- **sw v112** `fix`: Einstellungen — Startpfad separat, Ordner als relativer Pfad
  - `index.html`: neues "Startpfad (GED-Ordner)"-Feld (`set-base-path`) über Foto/Dok-Ordner
  - `openSettings`: befüllt `set-base-path` mit `od_base_path`; Foto/Dok-Ordner zeigen nur `relPath`
  - Verhindert irreführende doppelte Anzeige (z.B. `Privat/Pictures` als Foto-Ordner statt `Pictures`)

*Aktuelle sw-Version: v112 / Cache: stammbaum-v112*

---

### Session 2026-04-04 — Medien-Pfad-Mismatch-Fix (sw v106)

- **sw v106** `fix`: Medien-Anzeige repariert — GEDCOM-Pfade ≠ OneDrive-Pfade
  - **Ursache**: GEDCOM FILE-Tags enthalten lokale Pfade (z.B. `Fotos/foto.jpg`) statt
    OneDrive-Pfade (`Pictures/foto.jpg`); `_odGetMediaUrlByPath` lieferte 404 → keine Bilder
  - `onedrive.js`: `_odGetMediaUrlByPath` — Basename-Fallback: wenn Pfad nicht gefunden,
    Dateiname im `od_default_folder.folderPath` suchen
  - `onedrive.js`: `odImportPhotosFromFolder` — schreibt nach Verknüpfung `m.file` mit
    tatsächlichem OneDrive-Pfad (`folderPath + '/' + basename`) zurück; `AppState.changed = true`
  - `onedrive.js`: `odImportPhotosFromFolder` — Ansicht-Refresh nutzt `_odGetMediaUrlByPath`
    statt deprecated `_odGetPhotoUrl`
  - `ui-media.js`: `openEditMediaDialog` — `cfg_photo_base`-Stripping entfernt; `m.file`
    wird ungekürzt im Eingabefeld angezeigt und gespeichert

*Aktuelle sw-Version: v106 / Cache: stammbaum-v106*

---

### Session 2026-04-04 — Media-Handling Grundsanierung: pfad-basierte IDB-Keys (sw v105)

- **sw v105** `refactor`: IDB-Keys für Medien komplett auf Pfad-Basis umgestellt
  - **Ursache**: Index-basierte Keys (photo_id_0, photo_fam_id_1 etc.) werden nach
    Reorder der Medienliste (Hauptbild → Index 0) ungültig → alle Thumbnails zeigen
    falsche Bilder; Hero korreliert nicht mit Medienliste
  - **Neues Format**: `'img:' + filePath` — unabhängig von Array-Reihenfolge
  - `ui-media.js`: `_asyncLoadMediaThumb(thumbId, filePath)` — idbKey-Parameter entfernt
  - `ui-media.js`: Kamera-Fotos in `confirmAddMedia` mit `'img:' + file` gespeichert
  - `ui-media.js`: Edit-Dialog-Preview direkt über Pfad; MediaBrowser-Thumbnails pfad-basiert
  - `ui-media.js`: `deletePersonMedia`, `deleteFamilyMarrMedia` — kein bulk-IDB-Clear mehr nötig
  - `ui-views-person.js`: Hero ohne index-basierte IDB-Keys; onclick mit data-media-file Attribut
  - `ui-views-family.js`: analog Person
  - `ui-views-source.js`: IDB-Fallback pfad-basiert
  - `ui-views-tree.js`: `openMediaPhoto(filePath, heroElemId, avatarElemId)` — neue Signatur

*Aktuelle sw-Version: v105 / Cache: stammbaum-v105*

---

### Session 2026-04-04 — Blob-URLs → Data-URLs (iOS Safari Fix) (sw v104)

- **sw v104** `fix`: Alle OneDrive-Foto-URLs als Data-URL (base64) statt Blob-URL
  - **Ursache**: iOS Safari kann Blob-URLs (`URL.createObjectURL`) in `<img>`-Elementen
    nicht zuverlässig laden — der Browser kann den Blob intern verwerfen (GC), was
    `onerror` auslöst und → Avatar statt Foto zeigt
  - `_odGetMediaUrlByPath`: Blob → `FileReader.readAsDataURL()` → base64 Data-URL;
    `_odPhotoCache` cached Data-URL (Session, kein Netzwerk-Re-Fetch in selber Session)
  - `_odGetPhotoUrl` (Legacy): gleicher Fix
  - `_odGetSourceFileUrl` (Legacy-Pfad): gleicher Fix
  - Data-URLs sind selbsttragend, immer ladbar, plattformunabhängig

*Aktuelle sw-Version: v104 / Cache: stammbaum-v104*

---

### Session 2026-04-04 — Medienladen: Pfad-zuerst statt IDB-zuerst (sw v103)

- **sw v103** `refactor`: Bild-Loading-Reihenfolge überarbeitet
  - **Bisher**: IDB → OneDrive-Pfad → Legacy-Filemap
    Problem: IDB ist für OneDrive-Fotos fast immer leer → unnötiger Cache-Miss;
    veraltete IDB-Einträge (nach Reorder) zeigten falsches Bild
  - **Jetzt**: OneDrive-Pfad (m.file) → IDB → Legacy-Filemap
    `_odPhotoCache` (Session-Cache) verhindert Doppel-Fetches innerhalb einer Session
  - `ui-media.js`: `_asyncLoadMediaThumb` — `_odGetMediaUrlByPath(filePath)` zuerst
  - `ui-views-person.js`: Hero-Loading — `_odGetMediaUrlByPath(_filePath)` zuerst;
    Hero-`<img>` jetzt DOM-basiert mit `onerror` (Avatar wiederherstellen bei Fehler)
  - `ui-views-family.js`: Hero-Loading — analog Person; `onerror` hinzugefügt
  - `ui-views-source.js`: Thumbnails — `_odGetSourceFileUrl` zuerst (pfadbasiert),
    IDB als Fallback; `onerror` in `_applySrcMediaUrl` hinzugefügt
  - Alle Hero-Images: stale IDB-Writes (`idbPut` nach Load) entfernt — Pfad ist Wahrheitsquelle

*Aktuelle sw-Version: v103 / Cache: stammbaum-v103*

---

### Session 2026-04-04 — Kamera-Pfad: folderPath-Fallback per API (sw v102)

- **sw v102** `fix`: Kamera-Foto landet im konfigurierten Ordner auch bei alten IDB-Einträgen
  - `onedrive.js`: `_odResolveFolderPath(folderId, folderName)` — fragt OneDrive-API nach
    vollständigem relativem Pfad (`parentReference.path`) und gibt ihn zurück
  - `ui-media.js`: `openAddMediaDialog` — öffnet Modal sofort; wenn `folderPath` fehlt
    (IDB-Eintrag vor sw v100), wird er per API nachgeladen und in IDB persistiert
  - Ursache war: `od_default_folder` enthielt vor sw v100 nur `{folderId, folderName}`,
    kein `folderPath` → Fotos landeten im OneDrive-Root

*Aktuelle sw-Version: v102 / Cache: stammbaum-v102*

---

### Session 2026-04-04 — Thumbnails + Hauptbild-Funktion (sw v101)

- **sw v101** `fix/feat`: Thumbnails + Hauptbild-Reihung
  - `ui-media.js`: `_asyncLoadMediaThumb` — `onerror`-Handler stellt Original-Icon wieder her
    wenn Bild nicht geladen werden kann (kein broken-image-Symbol mehr auf Mobile)
  - `index.html`: "Als Hauptbild"-Checkbox im Edit-Medium-Dialog
  - `ui-media.js`: `_applyPrimAndReorder()` — setzt `prim='Y'` auf gewähltem Eintrag,
    löscht `prim` auf allen anderen, verschiebt Eintrag an Index 0
  - `ui-media.js`: `_invalidateThumbCache()` — leert Session-Cache bei Reorder damit
    Thumbnails mit korrekten Positionen neu geladen werden
  - `ui-media.js`: `openEditMediaDialog` — Checkbox zeigt aktuellen prim-Status

*Aktuelle sw-Version: v101 / Cache: stammbaum-v101*

---

### Session 2026-04-04 — Kamera-Upload nach OneDrive (sw v100)

**Kamera-Fotos landen direkt im konfigurierten OneDrive-Ordner**

- **sw v100** `feat`: Kamera-Foto-Upload nach OneDrive
  - `onedrive.js`: `_odUploadMediaFile(b64DataUrl, targetPath)` — PUT per path-based API,
    gibt `{ path, fileId }` zurück mit tatsächlichem Pfad aus API-Antwort
  - `onedrive.js`: `odScanDocFolder` speichert jetzt ebenfalls `folderPath` in `od_doc_folder`
    (analog zu `odImportPhotosFromFolder`)
  - `ui-media.js`: `_addMediaDefaultFolderPath` — Modul-Variable für Ordner-Pfad
  - `ui-media.js`: `openAddMediaDialog` lädt `od_default_folder.folderPath` (bzw. `od_doc_folder`
    für Quellen) aus IDB → vorbelegt `_addMediaDefaultFolderPath`
  - `ui-media.js`: `_onCamCapture` verwendet `_addMediaDefaultFolderPath` als Ordner-Prefix;
    Dateiname jetzt mit Uhrzeit (`foto_YYYYMMDD_HHMMSS.jpg`) für Eindeutigkeit
  - `ui-media.js`: `confirmAddMedia` — wenn Kamera-Foto + OneDrive verbunden + Dateifeld gefüllt:
    Upload via `_odUploadMediaFile`; tatsächlicher API-Pfad ersetzt Eingabefeld-Wert;
    IDB-Cache wird trotzdem gesetzt (lokale Kopie)

*Aktuelle sw-Version: v100 / Cache: stammbaum-v100*

---

### Session 2026-04-04 — Medien-Handling Überarbeitung (sw v96–v99)

**Relativer OneDrive-Pfad als einzige Wahrheitsquelle**

- **sw v96** `feat`: Medien — relative OneDrive-Pfade + bevorzugtes Medium in Titelleiste
  - `onedrive.js`: `_odPickSelectFile` speichert `fullPath` direkt (kein `cfg_photo_base`-Prefix mehr)
  - `_odPickBasePath` / `_odPickRootName` und deren IDB-Reads entfernt
  - `ui-media.js`: `openAddMediaDialog` startet mit leerem Dateifeld
  - `ui-views-person.js`: Hero lädt bevorzugtes Medium (`_PRIM Y`) oder erstes (`_primIdx`)
  - `ui-views-family.js`: Hero lädt bevorzugtes Medium aus `marr.media`, Fallback `f.media`
  - `ui-views-source.js`: `_srcPrimIdx` berechnet, Ladereihenfolge prim-first, Hero nur für prim

- **sw v97** `fix`: Edit-Dialog + Picker alle Ordner
  - `ui-media.js`: `openEditMediaDialog` zieht `cfg_photo_base/cfg_doc_base` asynchron ab →
    bestehende absolute Pfade werden beim Bearbeiten als relativer Pfad angezeigt und gespeichert
  - `onedrive.js`: Bug fix — `_odEditPickMode` zeigte keine Dateien (nur `_odPickMode` wurde geprüft);
    beide Modi zeigen jetzt Dateiliste + korrekten Titel
  - `onedrive.js`: `↑ Übergeordneter Ordner`-Button wenn Picker aus Standard-Ordner gestartet wurde

- **sw v98** `fix`: Übergeordneter Ordner statt root
  - `_odPickStartFolderId` speichert Start-Ordner; `_odShowAllFolders()` fragt
    `parentReference` per API → navigiert zu übergeordnetem Ordner (bleibt relativ)

- **sw v99** `refactor`: Pfad als einzige Wahrheitsquelle — kein Filemap für Anzeige
  - `onedrive.js`: `_odGetMediaUrlByPath(path)` — lädt Datei direkt per OneDrive path-based API
    (`GET /drive/root:/{path}:/content`), kein Index-Mapping nötig
  - `onedrive.js`: `_odGetSourceFileUrl` — Priorität 1) Pfad direkt, 2) Legacy `od_filemap`
  - `ui-media.js`: `_asyncLoadMediaThumb(thumbId, idbKey, filePath)` — Pfad primär, filemap Legacy
  - `ui-media.js`: Edit-Dialog-Vorschau ebenfalls pfadbasiert
  - `ui-views-person.js` + `ui-views-family.js`: Hero + Thumbnails übergeben `m.file`
  - **Ergebnis**: Anzeigbild = geklicktes Bild = GEDCOM-Pfad — ein Pfad, eine Datei
  - `od_filemap` bleibt nur noch als Legacy-Fallback (Altdaten mit gespeicherten fileIds)

*Aktuelle sw-Version: v99 / Cache: stammbaum-v99*

---

### Session 2026-04-03 — Refactoring: ui-forms.js aufgeteilt (sw v95)

- **`showSourceDetail()`** aus `ui-forms.js` in `ui-views-source.js` ausgelagert
- Debug-Code bereinigt

*Aktuelle sw-Version: v95 / Cache: stammbaum-v95*

---

### Session 2026-04-03 — Refactoring: ui-views.js Split (sw v94)

- **`ui-views.js`** (1963 Z.) aufgeteilt in 5 Module:
  - `ui-views.js` (279 Z.) — gemeinsame Hilfsfunktionen (Labels, Topbar, Scroll-Helpers)
  - `ui-views-person.js` (392 Z.) — Personen-Detailansicht (`showDetail`, Avatar, Events, Medien)
  - `ui-views-family.js` (382 Z.) — Familien-Detailansicht (`showFamilyDetail`, Kinder, Medien)
  - `ui-views-source.js` (273 Z.) — Quellen-Detailansicht (`showSourceDetail`, Medien, Rückverweise)
  - `ui-views-tree.js` (651 Z.) — Sanduhr-Baum + Fan Chart (`showTree`, `showFanChart`, Tastaturnavigation)
- `index.html`: Script-Tags um 4 neue Module erweitert

*Aktuelle sw-Version: v94 / Cache: stammbaum-v94*

---

### Session 2026-04-03 — Bug 7 Fix: doppelter treeNavBack() (sw v93)

- **Fix Bug 7**: Doppelter `keydown`-Handler in `ui-forms.js` rief `treeNavBack()` beim ArrowLeft-Druck ein zweites Mal auf — überflüssiger ArrowLeft-Zweig in `ui-forms.js` entfernt

*Aktuelle sw-Version: v93 / Cache: stammbaum-v93*

---

### Session 2026-04-01 — Bug 5 + Bug 7 Fix: Topbar + History (sw v92)

- **Fix Bug 7**: `goBack()` legt keinen neuen History-Eintrag mehr an — `showTree(prev.id, false)` verhindert Doppeleintrag beim Zurück-Navigieren
- **Fix Bug 5**: `resize`-Handler ruft `_updateTopbarH()` sofort auf — Suchzeile schließt nahtlos an Topbar im Querformat an

*Aktuelle sw-Version: v92 / Cache: stammbaum-v92*

---

### Session 2026-03-31 — OneDrive + Filemap-Fixes (sw v89–v91)

- **Fix (sw v91)**: Filemap-Index-Sync — Foto wird nach OneDrive-Auswahl korrekt geladen; Race-Condition beim IDB-Schreiben/Lesen behoben
- **Fix (sw v90)**: OneDrive-Picker gibt absoluten Pfad zurück (nicht relativen)
- **Fix (sw v89)**: Medien-Basispfad wird automatisch aus GEDCOM-Importen erkannt
- **Fix**: Kamera/Galerie übernimmt konfigurierten Basispfad; vollständiger Pfad für alle Medien gespeichert
- **Fix**: OneDrive-Picker startet in konfiguriertem Ordner; vollständiger Pfad wird übergeben

*Aktuelle sw-Version: v91 / Cache: stammbaum-v91*

---

### Session 2026-03-31 — Einstellungen + Baum Auto-Fit (sw v86)

- **Fix**: Einstellungen immer zugänglich (auch wenn kein GEDCOM geladen)
- **Fix**: Medien-Basispfad Pre-fill korrekt vorbelegt
- **Fix**: Baum Auto-Fit bei Generationenwechsel springt nicht mehr
- Cache-Update: `sw.js` Precache für Settings-Änderungen aktualisiert

*Aktuelle sw-Version: v86 / Cache: stammbaum-v86*

---

## Version 4.0 ✅ (Branch `main`, ab 2026-03-30)

Schwerpunkt: Roundtrip-Vollständigkeit, ENGA-Ausbau, Quellenmanagement, Desktop UI/UX, Mobile, State-Refactoring.

---

### Session 2026-03-30 — Desktop-Sync, Schnell-Formular, Swipe (sw v76–v80)

- **Schnell-Formular neue Quellen**: neue Quelle zeigt nur ABBR + Titel; Toggle „Weitere Felder ▼" expandiert AUTH/Datum/Verlag/Archiv/Notiz/Medien; beim Bearbeiten immer alle Felder (`sfToggleMore()`, `sf-optional-fields`)
- **Swipe-Right = Zurück**: `_initDetailSwipe()` in allen Detailansichten (`v-detail`); Threshold 60px/400ms horizontal; visuelles TranslateX-Feedback + 0.2s Transition; kein Konflikt mit Scroll/Modals
- **Aktive Person/Familie in Liste hervorheben**: `.person-row.current` mit `box-shadow: inset 3px 0 0 var(--gold)`; `data-pid`/`data-fid` auf allen Rows; nach Render zentriert via `_scrollListToCurrent()`
- **Desktop: Listenmarkierung folgt Baumnavigation sofort**: `showTree()` ruft `_updatePersonListCurrent()` auf; `showDetail()` + `showFamilyDetail()` rufen `_updatePersonListCurrent`/`_updateFamilyListCurrent` auf
- **Desktop: Suchfeld sticky**: `.list-search-header` mit `position:sticky; top:52px` — Such-/Filterfelder bleiben beim Scrollen sichtbar (Personen, Familien, Quellen)
- **Fix scrollIntoView in fixed Container**: `_scrollListToCurrent()` via manuelles `scrollTop`-Delta statt `scrollIntoView` — zuverlässig in `position:fixed; overflow-y:auto` (`#v-main`)

*Aktuelle sw-Version: v80 / Cache: stammbaum-v80*

---

### Session 2026-03-30 — Finalisierung + Bugfixes (sw v74–v75)

- **Media-Badges in Listen**: 📎-Badge in Personen- und Familien-Liste wenn Medien verknüpft (analog Quellen-Liste)
- **Avatar-Platzhalter in Personen-Detail**: `det-avatar-{id}` mit Geschlechtssymbol (♂/♀/◇), analog Familie — ausgeblendet wenn Foto geladen
- **Fix Race Condition Foto-Erstanruf**: `confirmAddMedia()` jetzt `async` + `await idbPut()` vor `showDetail()`/`showFamilyDetail()` — verhindert dass IDB-Lesen vor IDB-Schreiben läuft
- **Fix UIState-Doppelnamespace**: `UIState.UIState._treeHistoryPos` → `UIState._treeHistoryPos` (6 Stellen) — Regression aus State-Refactoring; Baum war nach Laden und über ⧖-Button nicht aufrufbar
- **Listentext umbrechen**: `.p-name`/`.p-meta` umbrechen bei Überlänge statt ellipsis (wie Quellenliste)
- **Backlog erledigt**: alle offenen Features als abgeschlossen markiert

*Aktuelle sw-Version: v75 / Cache: stammbaum-v75*

---

### Session 2026-03-30 — State-Management-Refactoring (sw v73)

- **AppState / UIState**: 22 cross-file Globals in 2 Namespace-Objekte in `gedcom.js` migriert
- Backward-compat-Shims via `Object.defineProperty` auf `window` — alle Aufrufer ohne Änderung weiter funktionsfähig
- Vollständige Migration aller Dateien: `storage.js`, `ui-views.js`, `ui-forms.js`, `ui-media.js`, `onedrive.js`

*Aktuelle sw-Version: v73 / Cache: stammbaum-v73*

---

### Session 2026-03-30 — Refactoring: Datei-Splitting + demo.ged (sw v70–v73)

- **`onedrive.js`** (658 Z.) aus `ui-forms.js` extrahiert: OAuth-PKCE-Flow, Token-Refresh, GED-Datei-Picker, Foto-Import, Ordner-Browser, Einstellungen, Filemap-Helpers
- **`ui-media.js`** (344 Z.) aus `ui-forms.js` extrahiert: `openEditMediaDialog`, `openAddMediaDialog`, `showMediaBrowser`, `delete*Media`, `_asyncLoadMediaThumb`
- **`gedcom-parser.js`** (745 Z.) aus `gedcom.js` extrahiert: `parseGEDCOM()`, `parseGeoCoord()`
- **`gedcom-writer.js`** (485 Z.) aus `gedcom.js` extrahiert: `writeGEDCOM()`, `pushCont()`
- `gedcom.js` behält: Globals/`db`, Labels, Datum- und PLAC-Helfer (305 Z.) — neu: 8 Getter/Setter-Helfer (`getPerson/getFamily/getSource/getRepo`, `setPerson/setFamily/setSource/setRepo`)
- `ui-forms.js` schrumpft von 2567 auf 1568 Zeilen (reine Formulare)
- **`demo.ged`** (263 Z.) extrahiert aus `storage.js`: GEDCOM-Datei mit 12 Personen, 6 Familien, 3 Quellen, 4 Medien; `loadDemo()` lädt via `fetch('./demo.ged')` statt hardcodiertem JS-Array
- `storage.js` schrumpft von 970 auf 707 Zeilen
- `sw.js` Precache aktualisiert (v70 → v73), `demo.ged` eingeschlossen
- `.gitignore`: `!demo.ged` Ausnahme für `*.ged`-Regel

*Aktuelle sw-Version: v73 / Cache: stammbaum-v73*

---

### Session 2026-03-30 — Proband + Kekule-Nummern (sw v68–v69)

- **Konfigurierbarer Proband**: Startperson des Baums konfigurierbar (nicht mehr automatisch kleinste ID); Button in Baum-Topbar; Einstellung wird gespeichert
- **Kekule-Nummern im Baum**: Kekule/Ahnentafel-Nummerierung der Vorfahren-Karten (1=Proband, 2=Vater, 3=Mutter, 4–7=Großeltern …); fett dargestellt
- **Fix** (sw v69): Proband-Button ausgefüllt wenn aktiv + Kekule-Zahlen fett im korrekten Font
- **Fix** (sw v66): Titelleisten-Foto fehlte bei Personen/Familien mit mehreren Fotos (korrekter IDB-Key-Zugriff)
- **Fix** (sw v67): ☁-Symbol aus Baum-Topbar entfernt; Desktop Auto-Fit-Zoom beim ersten Laden

*Aktuelle sw-Version: v69 / Cache: stammbaum-v69*

---

### Session 2026-03-30 — Portrait-Baum + Button-Konsistenz (sw v60–v64)

- **Portrait-Baum**: im Hochformat (Smartphone) nur 2 Vorfahren-Ebenen (Eltern + Großeltern); im Querformat/Desktop bis zu 4 Ebenen; `isPortrait = window.innerWidth < window.innerHeight`
- **Baum Portrait kompakt** (sw v62): Minimal-Layout 360px; Pinch-to-Zoom auch im Querformat aktiviert
- **Baum-Vorfahrenpositionierung Fix** (sw v63): Korrekte X/Y-Berechnung für Vorfahren; Namens-/Datumsdarstellung verbessert
- **Proband-Button in Topbar + Suche** (sw v64): Quick-Access-Button in Baum-Topbar; Suche zugänglich
- Resize-Listener (debounced 250ms) in `_initTreeDrag()` — Baum bei Orientierungswechsel neu gezeichnet
- **Refactor**: Foto-Upload aus Personen-/Familien-/Quellen-Bearbeiten-Formularen entfernt (sw v60) — Fotos ausschließlich über Medien-Abschnitt in Detailansichten
- **UI**: Medien-„Hinzufügen"-Buttons nutzen `src-add-btn` (dashed pill) statt `btn` mit inline-Styles

*Aktuelle sw-Version: v64 / Cache: stammbaum-v64*

---

### Session 2026-03-29 — Schwerpunkt 3 Abschluss: Kamera, Vorlagen, Medien-Browser (sw v59)

- **Kamera-Button** in „Medium hinzufügen": `capture="environment"` + „Aus Galerie"-Button; Bild wird als base64 in IDB (`photo_src_{id}_{i}`, `photo_{id}_{i}`, `photo_fam_{id}_{i}`) gespeichert; Dateiname automatisch aus Timestamp generiert; `showSourceDetail()` prüft IDB vor OneDrive
- **Quellen-Vorlagen**: 5 Vorlagen-Buttons (Kirchenbuch / Standesamt / Volkszählung / Familienstammbuch / Zeitungsartikel) erscheinen beim Anlegen neuer Quellen (`showSourceForm(null)`); `_applySourceTemplate()` befüllt ABBR + Titel + Autor + Notiz
- **Medien-Browser**: 📎-Button im Quellen-Tab → Modal mit allen Quellen-Medien, gruppiert nach Quelle; async Thumbnails aus IDB + OneDrive; Klick → `showSourceDetail()`
- **Fix**: `deleteSourceMedia()` löscht nun auch IDB-Key `photo_src_{id}_{i}`

*Aktuelle sw-Version: v59 / Cache: stammbaum-v59*

---

### Session 2026-03-29 — Desktop UI/UX: Baum-Verbesserungen (sw v56–v58)

*Drag-to-Pan + Vollbild-Modus (sw v56):*
- **Drag-to-Pan**: `mousedown`/`mousemove`/`mouseup` auf `#treeScroll`; 5px-Threshold verhindert versehentliches Aktivieren; Click-Event nach Drag unterdrückt
- **Vollbild-Modus**: Button `⤢` in Baum-Topbar (nur desktop-mode); `body.tree-fullscreen` → `#v-tree { left:0 }`, Sidebar + Bottom-Nav ausgeblendet; Toggle zu `⤡`

*4 Vorfahren-Ebenen (sw v57):*
- **anc1–anc4**: Eltern, Großeltern, Urgroßeltern, Ururgroßeltern (bis zu 16 Karten)
- `ancSpan` dynamisch: 4/8/16 Slots je nach belegter Tiefe — keine unnötige Breite bei wenig Vorfahren
- `baseY` passt sich an: `ancLevels * ROW` Platz nach oben
- Ebenen -3/-4: leere Slots werden übersprungen (kein "?" für fehlende Vorfahren)
- Vertikale Zentrierung: `marginTop` zentriert Baum wenn kleiner als Viewport

*Tastaturnavigation + Pfeil-Legende (sw v58):*
- **Pfeiltasten**: ↑ Vater · Shift+↑ Mutter · ↓ erstes Kind · → aktiver Partner · ← History-Back
- `_treeNavTargets{}` wird bei jedem `showTree()` aktualisiert
- `_initTreeKeys()` einmalig: Listener nur wenn `v-tree` aktiv + kein Eingabefeld fokussiert
- **Pfeil-Legende**: kompakte Box unten rechts im Baum (nur desktop-mode), `position:absolute`
- Legende zeigt alle 5 Tasten mit Bezeichnung

*Aktuelle sw-Version: v58 / Cache: stammbaum-v58*

---

### Session 2026-03-29 — Medien-UI + Einstellungen (sw v50–v55)

### Session 2026-03-29 — sourceMedia{} + Quellenmanagement UI (sw v45–v49)

*sourceMedia{} — OBJE unter SOUR-Zitierungen strukturiert (sw v45):*
- **Neues Feld `sourceMedia{}`** auf allen Event-Objekten (birth/chr/death/buri, events[], marr, engag, FAM events[], childRelations.sourMedia{})
- OBJE-Blöcke ohne `@ref@` unter `2 SOUR @ID@` werden strukturiert geparst: `{ file, scbk (_SCBK), prim (_PRIM), titl, note, _extra[] }`
- `_smEntry`-Variable trackt den aktuellen OBJE-Block im Parser; Reset bei lv=1/2/3
- `_ptDepth=4` auf FILE: FORM/TYPE (lv=5/6) verbatim in `_smEntry._extra[]`
- Writer: `eventBlock()` + alle SOUR-Loop-Writer schreiben sourceMedia[] verbatim zurück
- `nameSourceMedia{}` auf INDI für NAME>SOUR OBJE-Blöcke

*Bug-Fixes (sw v46):*
- OBJE mit `@ref@` (z.B. `3 OBJE @M00001@`) bleibt korrekt in `sourceExtra{}` verbatim — `!val.startsWith('@')`-Guard auf alle OBJE-Branches
- `sourMedia:{}` fehlte in 3 childRelations-Init-Stellen (lv=2 bei CHIL, lv=3 bei _FREL/_MREL, lv=3 SOUR) → TypeError behoben

*Quellenmanagement UI — statische Icons + async OneDrive-Laden (sw v47–v48):*
- Quellen-Detailansicht: Medien-Abschnitt zeigt statische Icons (🖼/📄/📎) sofort beim Rendern
- Async: `_odGetSourceFileUrl(srcId, idx)` ersetzt Icon durch Thumbnail (Bild) oder klickbaren Link (Dokument) sobald OneDrive-URL verfügbar
- `deleteSourceMedia()` + filemap-Cleanup für sources-Einträge
- `confirmAddMedia()` speichert OneDrive-fileId in `od_filemap.sources`

*OneDrive Dokumente-Ordner (sw v49):*
- **Neues Feature**: Dokumente-Ordner in OneDrive einrichten → alle Dateinamen werden indiziert
- `odSetupDocFolder()` öffnet Ordner-Browser im neuen `_odDocScanMode`
- `odScanDocFolder(folderId, folderName)` scannt Ordner → `od_doc_filemap` in IDB (`{filename.lower: fileId}`)
- `_odGetSourceFileUrl()` nutzt Fallback: wenn kein manueller fileId → Dateiname aus GEDCOM-Pfad (`m.file`) gegen `od_doc_filemap` matchen (Basename, case-insensitiv)
- Neuer Menü-Button „📂 Dokumente-Ordner einrichten" (nur sichtbar wenn OneDrive verbunden)
- `od_doc_folder` IDB-Key speichert gescannten Ordner für Anzeige

*Aktuelle sw-Version: v49 / Cache: stammbaum-v49*

---

### Session 2026-03-28 — v4-dev UX + Diagnose (sw v34–v38)
- **EVEN TYPE-Feld** (sw v34): `onEventTypeChange()` zeigt `ef-etype-group` für `EVEN`-Events mit Bezeichnung-Label + Placeholder; fehlte vorher für sonstige Events
- **Inline-Layout Ereignistyp + Bezeichnung** (sw v35): Beide Felder in einer Flex-Zeile im Event-Formular
- **FROM/TO-Datum** (sw v36): `parseGedDate()` erkennt `FROM ... TO ...` und einzelne `FROM`/`TO`-Qualifier; `buildGedDate()` schreibt korrekt; `gedDateSortKey()` neue Hilfsfunktion
- **Datum-Sortierung Personenliste** (sw v36): Toggle-Button „⇅ Name / ⇅ Geb." in Personenliste; `_personSort` global; Jahrzehnt-Trenner bei Datum-Sortierung; Familienliste verwendet `gedDateSortKey()`
- **viewport-fit=cover** (sw v37): `<meta name="viewport" ... viewport-fit=cover>` — behebt verschobene Darstellung der Topbar auf iOS PWA mit `black-translucent` Status-Bar
- **Roundtrip: Passthrough-Ausgabe** (sw v38): `_ptAgg()` / `_ptFmt()` aggregieren Tag-Frequenzen; 10 Sektionen (INDI._passthrough, vital._extra, events._extra, sourceExtra, FAM._passthrough, marr/engag._extra, childRel.extra, SOUR._passthrough, NOTE._passthrough, extraRecords) werden im Roundtrip-Test ausgegeben

### Session 2026-03-28 — Roundtrip-Fixes (Teil 1)
- **HEAD verbatim**: `_headLines[]` bewahrt alle HEAD-Zeilen; nur `DATE`/`TIME` werden aktuell geschrieben
- **extraNames lv3-Routing**: `3 PAGE`/`3 QUAY` unter zweitem NAME-Eintrag via `_curExtraNameIdx`
- **BIRT/CHR/DEAT/BURI leere Events**: `seen:true/false`-Flag — leerer `1 BIRT`-Block ohne sub-tags bleibt erhalten
- **NOTE-Record Sub-Tags**: `CHAN`, `REFN`, `_VALID` unter `0 @Nxx@ NOTE` → `_passthrough[]` statt silent drop
- **MAP ohne PLAC**: `eventBlock` + `events[]`-Writer prüfen `obj.lati !== null` unabhängig von `obj.place`
- **ENGA vollständig**: `engag`-Objekt mit allen Feldern (date, place, lati, long, sources, sourcePages, sourceQUAY, sourceExtra, value, seen, _extra); Parser lv=1/2/3/4; Writer via `eventBlock('ENGA', ...)`

### Session 2026-03-28 — Roundtrip-Fixes (Teil 2)
- **ENGA MAP-Koordinaten**: `mapParent === 'ENGA'` in lv=4-Handler; `geoLines()` in `eventBlock('ENGA', ...)`
- **Leere DATE/PLAC-Werte**: `date`/`place` in allen Event-Objekten (birth/death/chr/buri/marr/engag/events[]) initialisiert mit `null` statt `''`; Parser setzt Wert direkt (auch `''` bei leerem Tag); Writer prüft `!== null` und schreibt `2 DATE` ohne trailing space wenn leer — behebt 7× INDI/BIRT/DATE und 7× INDI/BIRT/PLAC Roundtrip-Verluste
- **DATE/PLAC-Diagnose**: Roundtrip-Test zeigt Kontext (Record-Typ + lv=1-Tag) für fehlende `2 DATE`/`2 PLAC`-Zeilen; Diagnose verwendet denselben Multiset-Mechanismus wie Auto-Diff

**Roundtrip-Ergebnis nach diesen Sessions:** `≈0` (alle inhaltlichen Verluste behoben; verbleibend: CONC/CONT-Neuformatierung + HEAD-Rewrite — by design)

---

## Version 3.0 ✅ (März 2026 — Phase 3 abgeschlossen)

**Sprint-Plan:** P3-1 ✅ IndexedDB · P3-2 ✅ Fotos · P3-3 ✅ Suche/Filter · P3-4 ✅ Service Worker · P3-5 ✅ Baum-UI · P3-6 ✅ Undo · P3-7 ✅ Desktop-Layout · P3-8 ✅ OneDrive

### Sprint P3-1 — IndexedDB-Migration + Sortierung
- GEDCOM-Text (5 MB) von localStorage → IndexedDB (`stammbaum_ged`, `stammbaum_ged_backup`, `stammbaum_filename`)
- `_processLoadedText()`: IDB-Writes + localStorage als stiller Fallback
- `tryAutoLoad()`: async, IDB first → localStorage-Fallback mit automatischer Migration
- `saveToFileHandle()` + Download-Pfad: auch IDB aktualisieren
- `confirmNewFile()`: auch IDB-Keys löschen
- `_originalGedText` immer in RAM (kein Nullen mehr nach Backup)
- Familien-Liste: alphabetisch nach Vater-Nachname, dann nach Heiratsjahr sortiert

### Sprint P3-2 — Fotos
- Upload im Personen-Formular (`<input type="file" accept="image/*">`)
- Resize auf max 800px längste Seite, JPEG Quality 0.8 via Canvas
- IDB-Storage: Key `photo_<personId>` (getrennt vom GEDCOM-Text-Store)
- Detailansicht: 80×96px rechteckiges Foto links neben Name (CSS object-fit: cover)
- `_pendingPhotoBase64`: `undefined` = keine Änderung, `null` = löschen, `string` = neues Foto
- Sidecar-JSON Export (`stammbaum_photos.json`) + Import
- Foto wird nicht in GEDCOM geschrieben (App-internes Feld)

### Sprint P3-3 — Suche/Filter
- Volltext-Suche war bereits für alle Tabs vorhanden
- Geburtsjahr-Bereichsfilter (von/bis) im Personen-Tab
- ✕-Clear-Button für Von/Bis-Felder
- Filter kombinierbar mit Volltext-Suche

### Sprint P3-4 — Service Worker / Offline + PWA-Manifest
- `manifest.json`: Name, Icons, `display: standalone`, `start_url`
- `sw.js`: Cache-First-Strategie für `index.html` — App läuft vollständig offline
- Service-Worker-Registrierung in `index.html` (`navigator.serviceWorker.register('./sw.js')`)

### Sprint P3-5 — Stammbaum-Erweiterungen
- **Vorfahren-Ansicht**: 2 Ebenen Großeltern beidseitig im Sanduhr-Baum
- **Mehrfach-Ehen**: `⚭N`-Badge auf Zentrum-Karte wenn Person >1 Ehe; alle Ehe-Familien navigierbar
- **Halbgeschwister**: gestrichelter Rahmen + `½`-Badge für Kinder aus anderen Ehen
- **Pinch-Zoom**: Touch-Geste auf Baum-Ansicht (Scale 0.4–2.0) via `initPinchZoom()`
- Kinder mehrzeilig bei >4 (max. 4 pro Zeile)

### Sprint P3-6 — Undo / Revert + Keyboard-Shortcuts
- `revertToSaved()`: verwirft alle Änderungen, lädt GEDCOM-Text aus `_originalGedText` neu
- Menü-Eintrag „Änderungen verwerfen" → `revertToSaved()`
- **Keyboard-Shortcuts**: `Cmd/Ctrl+S` = Speichern · `Cmd/Ctrl+Z` = Änderungen verwerfen · `Escape` = Modal schließen · `←` = Baum zurück

### Sprint P3-7 — Responsives Desktop-Layout
- `@media (min-width: 900px)`: Zweispalten-Layout (Liste links 360px, Detail/Baum rechts)
- `body.desktop-mode` via JS gesetzt wenn `window.innerWidth >= 900`
- Baum-Ansicht rechts: volle Breite ab 900px
- Bottom-Nav auf 360px begrenzt (linke Spalte), FAB-Position angepasst
- Desktop-Placeholder: "Eintrag in der Liste auswählen" wenn kein Detail aktiv
- `has-detail`-Klasse für Placeholder-Ausblendung

### Sprint P3-8 — OneDrive-Integration
- **PKCE OAuth**: Code-Verifier/Challenge, Redirect zu Microsoft Login, Token-Exchange gegen Graph API — kein Server nötig
- Token in `localStorage` (`od_access_token`, `od_refresh_token`, Expiry-Check)
- **GEDCOM aus OneDrive öffnen**: `GET /me/drive/root/search` für `.ged`-Dateien → Picker-Modal
- **GEDCOM in OneDrive speichern**: `PUT /me/drive/items/{id}/content` → direkt in bestehende Datei
- **Foto-Import aus OneDrive**: Ordner-Browser (`_odShowFolder`), Auswahl → Base64 → IDB
- Menü: „☁ OneDrive verbinden/trennen" · „📂 Aus OneDrive öffnen" · „💾 In OneDrive speichern" · „🖼 Fotos aus OneDrive laden"
- `_odUpdateUI()`: Buttons ausblenden wenn nicht verbunden; verbundener Status persistent

### Post-P3-8 — Medien, Fotos, UI-Fixes (2026-03-27)

*Fotos & Medienanzeige:*
- **Lightbox**: Fotos klickbar → `#modalLightbox` Vollbild-Overlay; „Als Hauptfoto setzen"-Button
- **Mehrere Fotos pro Person/Familie**: IDB-Keys `photo_<id>_0`, `photo_<id>_1`, …; bevorzugtes Foto wählbar
- **Lazy Migration**: `photo_<id>` → `photo_<id>_0` beim ersten Öffnen (Rückwärtskompatibilität)
- **Dynamisches OneDrive-Foto-Laden**: kein vollständiger Base64-Download; `od_filemap` (IDB) speichert nur `fileId`/`filename`; `_odGetPhotoUrl()` lädt on-demand + Token-Auto-Refresh; Session-Cache `_odPhotoCache`
- **Standard-Ordner**: letzter Foto-Ordner in `od_default_folder` (IDB) gespeichert
- **BMP-Support**: `createImageBitmap` als Primary, `<img>`-Tag als Fallback

*Medien bearbeiten (in Detailansichten):*
- **Person**: Medien-Abschnitt immer sichtbar; „+ Hinzufügen" → `#modalAddMedia` (Titel + Dateiname, OneDrive-Picker wenn verbunden); × pro Eintrag → `deletePersonMedia()`
- **Familie**: Medien-Abschnitt immer sichtbar; neuer Eintrag in `f.marr._extra`; × → `deleteFamilyMarrMedia()` / `deleteFamilyMedia()`
- **Quelle**: Medien-Abschnitt immer sichtbar; neuer Eintrag in `s.media[]`; × → `deleteSourceMedia()`
- **OneDrive-Picker-Modus**: `_odPickMode=true` → Ordner-Browser zeigt auch Dateien; `_odCancelOrClose()` für korrekte Back-Navigation

*Medien hinzufügen/löschen:*
- `openAddMediaDialog()`, `confirmAddMedia()` — Person: `p.media[]`; Familie: `f.marr._extra`; Quelle: `s.media[]`
- `_removeFamMarrObjeAt()`, `_removeMediaFromFilemap()`, `_clearIdbPhotoKeys()`, `_addMediaToFilemap()`

*Bug-Fixes:*
- **⚭-Badge im Baum**: explizite Prüfung `personId === fam.husb/wife`
- **⚭-Linie bleibt beim Wechsel**: class `tree-marr-btn` + erweiterter Cleanup-Selektor
- **Familien-Hero-Foto** ersetzt 👨‍👩‍👧-Avatar
- **INDI OBJE geparst**: korrektes Parsing wiederhergestellt (ging komplett in `_passthrough`)

### UI/UX + Code-Qualität (2026-03-25)
- Baum: Geschlecht via `border-left` (blau=M, rosa=F) statt Symbol; `_treeShortName()` kürzt zu Initialen
- `tree-yr` 0.62rem → 0.68rem; Icons ♻→👤, §→📖
- Globaler Such-Tab (`🔍`) als 6. Bottom-Nav Button; sucht über alle Entitätstypen
- Fix: `#desktopPlaceholder` fehlte `display:none` → verdeckte Detail auf Mobile
- Fix: XSS in Photo-Import (`innerHTML` → DOM-API + Re-Validierung)
- Fix: Race Condition iOS-Share (`writeGEDCOM() === content` vor `changed=false`)
- Fix: Place-Autocomplete debounced (150ms); Desktop-Resize bidirektional
- Fix: IDB-Fehler zeigen Toast statt stumm zu scheitern
- Fix: Multi-Tab-Warnung via `window.storage`-Event
- Dead Code entfernt: `.tree-sex`, `.icloud-hint`, `.export-bar/.export-btn`, `normDateToISO()`

---

## Version 2.0 ✅ (März 2026 — Phase 2 abgeschlossen)

Schwerpunkt: Verlustfreier Ancestris-Roundtrip. Zeilen-Delta: -708 → **-7** (nur HEAD-Rewrite).

### Sprint 1 — Writer-Fixes
- A1: `HEAD` vollständig: DEST=ANY, FILE=, TIME=, PLAC.FORM, GEDC.FORM=LINEAGE-LINKED
- A2: `CHAN.TIME` schreiben (HH:MM:SS) bei allen save-Funktionen
- A3: `NOTE CONT`-Splitting bei 248 Zeichen
- A4: `OBJE FORM` aus Dateiendung schreiben
- A5: `DATE` Monats-Normalisierung beim Schreiben (AUG statt Aug)

### Sprint 2 — Parser-Erweiterungen
- `FACT+TYPE` + `MILI` parsen → events[]
- `RESN`, `EMAIL`, `WWW` auf INDI: Parser + Writer + Display
- `CHAN.TIME` parsen → `lastChangedTime`
- Display: EVENT_LABELS FACT/MILI, Event-Dropdown FACT/MILI/GRAD/ADOP

### Sprint 3 — NOTE-Records Roundtrip
- `0 @Nxx@ NOTE` Records parsen (inkl. Text auf gleicher Zeile) + schreiben vor TRLR
- `1 NOTE @Nxx@`-Referenzen bleiben Referenzen (noteRefs / noteTextInline getrennt)
- FAM noteRefs ergänzt; `savePerson()` noteTextInline-Fix

### Sprint 4 — QUAY Quellenqualität
- `sourceQUAY: {}` Dict parallel zu `sourcePages{}`
- `3 QUAY` parsen für BIRT/DEAT/CHR/BURI + alle events[]
- `3 QUAY` schreiben in eventBlock() + events-Loop
- QUAY-Dropdown (0–3) pro Quellenreferenz im UI

### Sprint 5 — UI-Ergänzungen
- Event-Formular: FACT+TYPE (inkl. TYPE-Freitext-Feld)
- Familien-Formular: ENGA (Verlobung) editierbar
- Personen-Formular: RESN, EMAIL, WWW

### Sprint 6 — Strukturiertes Datum + PLAC.FORM
- Datums-UI: Qualifier-Dropdown (exakt/ca./vor/nach/zwischen) + 3-Felder-Eingabe (Tag / Monat / Jahr)
- `normMonth()` normiert Zahlen und deutsch/englischen Text zu GEDCOM-Standard
- PLAC.FORM aus HEAD parsen (`db.placForm`) + Orts-Toggle Freitext ↔ 6-Felder-Eingabe

### Sprint 7 — Qualitätssicherung
- Roundtrip-Test im Browser: stabil mit Sprint 5+6-Tags
- Ancestris-Import-Test (2026-03-21): Delta -708 → ~0 erwartet ✅
- `_FREL`/`_MREL` Quellenreferenzen: `3 SOUR`/`4 PAGE`/`4 QUAY` unter Eltern-Kind-Beziehungstypen

### Sprint 8 — UI/UX-Fixes
- Ghost-Karten opacity 0.18 → 0.40
- GEDCOM-IDs (@Ixx@, @Fxx@, @Sxx@, @Rxx@) in Detail-Ansichten ausgeblendet
- Section-Header 0.68rem → 0.75rem; Topbar-Titel mit text-overflow ellipsis
- ☁-Icon goldfarben wenn direktes Speichern aktiv
- Familie-Formular: Kinder zeigen Klarnamen statt @Ixx@-IDs

### Sprint 9 — URL-Parameter + Topbar-Titel
- `?datei=` URL-Parameter: Dateiname wird in Topbar angezeigt
- `_processLoadedText` + `tryAutoLoad` setzen Topbar-Titel nach Datei-Load

### Sprint 10 — MARR/NAME/topSrc PAGE+QUAY; CONC-Fix
- `3 PAGE` + `3 QUAY` für `MARR`, `1 NAME`-Quellen, `topSources`
- `pushCont` CONC-Fix: keine leeren CONC-Zeilen mehr
- `pf-note` als `<textarea>` (mehrzeilige Notizen)
- `_FREL`/`_MREL` mit lv3–4 `SOUR`/`PAGE`/`QUAY`

### Sprint 11 — Verbatim Passthrough
- Systematische Lösung: `_ptDepth` + `_passthrough[]` auf INDI/FAM/SOUR
- Unbekannte lv1-Tags + deren Substruktur → `_passthrough[]`; Writer schreibt verbatim zurück
- `_nameParsed`: doppelte `1 NAME`-Einträge → zweite NAME-Blöcke in passthrough
- FAM: `MARR.value` gespeichert; unbekannte FAM-lv1-Tags → passthrough
- SOUR: OBJE/DATA und alle unbekannten lv1-Tags → passthrough; TEXT mehrzeilig
- Val-Fix: `.replace(/^ /, '').trimEnd()` — verhindert Instabilität bei CONC mit führenden Leerzeichen
- Delta: -708 → ~-100

### Sprint 12 — Roundtrip-Bugs: frelSeen + extraRecords
- `frelSeen`/`mrelSeen` Flags: `2 _FREL`/`2 _MREL` ohne Wert korrekt roundgetripped
- `_extraRecords[]`: unbekannte `0 @ID@ TYPE`-Records verbatim vor TRLR
- `MARR.addr`: `2 ADDR` unter `1 MARR` in FAM gespeichert + zurückgeschrieben
- Delta: ~-134 → **-126**

### Sprint 13 — OBJE vollständig: alle OBJE-Kontexte wiederhergestellt
- `marr._extra`: unbekannte lv=2-Tags unter `1 MARR` via `_ptTarget`-Redirect
- `nameSourceExtra{}`: `3 OBJE` unter `2 SOUR` unter `1 NAME`
- `birth/death/chr/buri.sourceExtra{}` + `._extra[]`: OBJE unter vital events
- `topSourceExtra{}`: `2 OBJE` unter `1 SOUR @id@`
- `ev._extra[]` + `ev.sourceExtra{}`: events[]
- `frelSourExtra[]` / `mrelSourExtra[]`: `4 OBJE` unter `3 SOUR` unter `_FREL/_MREL`
- Delta: **-126 → -84**

### Roundtrip-Nachbesserungen (2026-03-24)
- `raw.trim()` → `raw.replace(/\r$/, '')` — CONC-Stabilität
- `1 RELI` als Event strukturiert (nicht mehr als String-Feld)
- `2 SOUR` direkt unter `1 CHIL` in FAM geparst
- Mehrere `3 SOUR` unter `2 _FREL`/`2 _MREL`: Array statt Überschreiben

### Roundtrip-Nachbesserungen (2026-03-26)
- `ev.addrExtra[]` + REPO `r.addrExtra[]` für ADDR-Sub-Tags (CITY, POST, _STYLE, _MAP, _LATI, _LONG)
- `frelSourExtra[]`/`mrelSourExtra[]` + `_ptDepth=3` für mehrfache SOURs unter _FREL/_MREL
- `_ptNameEnd`-Index: NICK/NAME-Kontext-Passthrough direkt nach NAME-Block
- `_FREL`/`_MREL` ohne trailing space wenn `val=''`
- `_getOriginalText()`: `_originalGedText || localStorage` (RAM vor localStorage — wichtig für >5MB)
- Delta: **-84 → -7** → `roundtrip_stable=true`

**Bewusst akzeptierte Verluste (Stand v3.0, vor v4-dev-Fixes):**
- DATE -106 / CONC -70 / CONT -7: Normalisierung/Resplitting (Daten erhalten, Format geändert)
- `@Nxx@` -8: NOTE-Records mit leerem lv=0-Header + CONC-Fortsetzung
- SOUR -10, PAGE -4, ADDR -2, FILE -1, VERS/NAME/CORP/DEST/SUBM je -1: HEAD-Rewrite (by design)

→ In v4-dev wurden weitere Verluste behoben; aktueller Stand: CHANGELOG v4 oben.

---

## Version 1.2 ✅ (März 2026)

### REPO-Feature: Archive/Repositories
- `db.repositories` — neues Dictionary für GEDCOM `0 @Rxx@ REPO`-Records
- Parser: `0 @Rxx@ REPO` mit NAME, ADDR, PHON, WWW, EMAIL, CHAN/DATE
- `1 REPO @Rxx@` in SOUR + `2 CALN` → `s.repoCallNum`
- Writer: REPO-Records vor TRLR, `2 CALN` nach `1 REPO` in SOUR
- `#modalRepo` — Archiv-Formular; `#modalRepoPicker` — Archiv-Picker im Quellen-Formular
- `showRepoDetail()` — Detailansicht mit verlinkten Quellen

### Speichern/Export neu (Desktop)
- `showOpenFilePicker()` → `requestPermission({mode:'readwrite'})` → direktes Speichern auf Chrome Mac
- `_fileHandle` + `_canDirectSave` ersetzen alten `_dirHandle`-Ansatz
- Safari/Firefox Mac: `<a download>` → Browser-Download-Ordner
- iOS: Share Sheet (Hauptdatei + Zeitstempel-Backup)

### Weitere Fixes (v1.2-Ära)
- **SOUR/CHAN**: Änderungsdatum von Quellen-Records geparst, gespeichert, zurückgeschrieben
- **Multiple NOTEs unter Events**: akkumuliert, mit `\n` verbunden, als `CONT` ausgegeben
- **RESI/ADDR**: `2 ADDR` unter Wohnort-Ereignissen in `ev.addr` gespeichert + editierbar
- **PAGE Seitenangaben**: `3 PAGE` unter `2 SOUR` für alle Ereignistypen (roundtrip-stabil)
- **BIRT/CHR/DEAT/BURI** in Detailansicht anklickbar (gleiches Formular wie andere Events)
- **Sterbeursache (CAUS)** editierbar im Ereignis-Formular

---

## Version 1.1 ✅ (März 2026)

### Neue Beziehungen modellieren
- Beziehungs-Picker `#modalRelPicker` für Ehepartner / Kind / Elternteil
- `_pendingRelation`-Mechanismus: nach `savePerson()` öffnet automatisch `showFamilyForm()`
- `openRelFamilyForm()`: erkennt freien Slot in bestehender Elternfamilie

### Verbindungen trennen
- `×`-Button (`unlink-btn`) in `.rel-row`
- `unlinkMember(famId, personId)`: trennt husb / wife / child — aktualisiert beide Seiten

### Orte-Tab: Neue Orte + Autocomplete
- Manuelle Orte (`db.extraPlaces`) in localStorage persistent
- Orts-Autocomplete (case-insensitiv, Substring-Matching) in allen Ort-Eingabefeldern
- `+ Neuer Ort` über FAB-Chooser (`#modalNewPlace`)

### UI-Verbesserungen
- Zentrum-Karte im Baum: 120 px → 160 px
- Sektionen „Ehepartner & Kinder" und „Eltern" immer sichtbar

---

## Version 1.0 ✅ (März 2026)

Grundfunktionen: GEDCOM laden, parsen, anzeigen. Personen-, Familien-, Quellen-Listen. Detailansichten. iOS-kompatibel (Share Sheet, accept=*). Sanduhr-Stammbaum (2+1 Generationen + Ehepartner). Bottom-Navigation (5 Tabs). Beziehungen erstellen/bearbeiten/löschen. GEDCOM-Export (Roundtrip-stabil für Grundfelder).

---

## Passthrough-Mechanismen (Stand v3.0 — Details in ARCHITECTURE.md ADR-012)

9 Stück: `_passthrough[]` · `ev._extra[]` · `addrExtra[]` · `frelSourExtra[]`/`mrelSourExtra[]` · `sourceExtra{}` · `topSourceExtra{}` · `media._extra[]` · `childRelations.sourExtra{}` · `extraRecords[]`

*(In v4-dev: 10. Mechanismus `sourceMedia{}`/`sourMedia{}` ergänzt — siehe ARCHITECTURE.md)*
