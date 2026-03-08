# index.html — Zeilen-Index

Stand: nach UI/UX-Fixes Sprint (2026-03-08). Bei grösseren Edits bitte aktualisieren.

## Globale Variablen / Konstanten
| Symbol | Zeile |
|---|---|
| `let db = {` | ~1367 |
| `let changed`, `_placesCache`, `_originalGedText`, … | ~1368–1389 |
| `function _getOriginalText()` | ~1393 |
| `function nextId()` | ~1400 |
| `const EVENT_LABELS = {` | ~1406 |
| `const srcWidgetState = {}` | 3881 |

## GEDCOM Parser (`parseGEDCOM`)
| Sektion | Zeile |
|---|---|
| `function parseGEDCOM(text)` | 1390 |
| Level-0 Dispatch (INDI / FAM / SOUR / NOTE / REPO) | 1415–1450 |
| **INDI init** `cur = { id:tag, …` | 1419 |
| `birth:{…, sourceQUAY:{}}` | 1423 |
| `death:{…, cause:''}` | 1424 |
| `chr:{…}` / `buri:{…}` | 1425–1426 |
| `events:[], famc:[], fams:[]` | 1427 |
| **FAM init** (engag:{} enthalten) | 1434 |
| **SOUR init** | 1437 |
| **NOTE init** | 1441 |
| **REPO init** | 1444 |
| `// ── INDIVIDUAL ──` | 1456 |
| INDI lv1 (NAME, SEX, NOTE, RESN, FACT, MILI …) | ~1458–1490 |
| INDI lv2 (GIVN, SURN, event DATE/PLAC/TYPE …) | ~1490–1560 |
| INDI lv3 (PAGE, QUAY, CHAN.TIME …) | ~1560–1610 |
| `// ── FAMILY ──` | 1608 |
| `// ── SOURCE ──` | 1646 |
| `// ── NOTE record ──` | 1672 |
| `// ── REPO record ──` | 1678 |
| Resolve NOTE references (post-parse) | ~1700 |
| `return { individuals, families, … }` | ~1710 |

## Datum-Hilfsfunktionen (Sprint 6a + 3-Felder-Datum)
| Funktion | Zeile |
|---|---|
| `const _MONTH_NUM = {…}` | ~1768 |
| `function _parseDatePart(s)` | ~1771 | ← neu: gemeinsamer Parser → {d,m,y}
| `function gedDatePartToISO(s)` | ~1785 | ← nutzt _parseDatePart
| `function parseGedDate(raw)` | ~1800 |
| `function buildGedDate(qual, date1, date2)` | ~1812 |
| `function normDateToISO(raw)` | ~1820 |
| `function fillDateFields(qualId, dateBaseId, date2BaseId, raw)` | ~1830 |
| `function onDateQualChange(selectEl, date2Id)` | ~1840 |
| `function normMonth(s)` | ~1860 |
| `function writeDatePartToFields(baseId, dateStr)` | ~1880 | ← nutzt _parseDatePart
| `function readDatePartFromFields(baseId)` | ~1895 |
| `function buildGedDateFromFields(qualId, dateBaseId, date2BaseId)` | ~1908 |

## PLAC-Hilfsfunktionen (Sprint 6b)
| Funktion | Zeile |
|---|---|
| `const _placeModes = {}` | 1910 |
| `function getPlacLabels()` | 1912 |
| `function buildPlacePartsHtml(placeId)` | 1917 |
| `function fillPlaceParts(placeId, raw)` | 1923 |
| `function joinPlaceParts(placeId)` | 1931 |
| `function getPlaceFromForm(placeId)` | 1940 |
| `function initPlaceMode(placeId)` | 1959 |
| `function togglePlaceMode(placeId)` | 1969 |

## GEDCOM Writer (`writeGEDCOM`)
| Sektion | Zeile |
|---|---|
| `function writeGEDCOM()` | 1995 |
| HEAD block | ~2001 |
| `function eventBlock(tag, obj, lv)` | 2026 |
| eventBlock: SOUR+PAGE+QUAY output | ~2035–2039 |
| **INDI Writer loop** `for (const p of …)` | 2042 |
| INDI events loop (FACT, MILI etc.) | ~2065 |
| **FAM Writer loop** | 2110 |
| FAM ENGA block | 2116 |
| **SOUR Writer loop** | 2131 |
| **REPO Writer loop** | 2150 |
| **NOTE Records loop** (vor TRLR) | 2168 |
| `lines.push('0 TRLR')` | 2174 |

## UI — Detail-Ansicht
| Funktion | Zeile |
|---|---|
| `function showDetail(id, pushHistory = true)` | 3434 |
| Detail: events forEach-Loop | ~3490 |
| Detail: titl / reli / resn / email / www | ~3496 |
| Detail: notes section | ~3510 |
| `function showFamilyDetail(id, pushHistory = true)` | 3584 |
| FamilyDetail: ENGA (Verlobung) Sektion | ~3620 |
| `function showSourceDetail(id, pushHistory = true)` | 3644 |
| `function factRow(…)` | 3734 |
| `function sourceTagsHtml(…)` | 3746 |
| `function runRoundtripTest()` | 3758 |

## UI — Formulare
| Funktion | Zeile |
|---|---|
| `function showPersonForm(id)` | 4004 |
| `function savePerson()` | 4022 |
| `function _refreshChildDisplay()` | 4108 |
| `function showFamilyForm(id, ctx)` | 4126 |
| `function saveFamily()` | 4170 |
| `function saveSource()` | 4253 |
| `function showRepoDetail(id, pushHistory = true)` | 4360 |
| `function saveRepo()` | 4412 |
| `function onEventTypeChange()` | 4460 |
| `function showEventForm(personId, evIdx)` | 4468 |
| `function saveEvent()` | 4509 |

## UI — Topbar / Startup
| Symbol | Zeile |
|---|---|
| `<span id="topbarFileName">` (Listen-Topbar, v-main) | 712 |
| `function updateSaveIndicator()` | 2234 |
| `function updateTopbarTitle(filename)` | 2243 |
| `function _processLoadedText(text, filename)` | ~2460 |
| `function tryAutoLoad()` | ~2510 |
| `window.addEventListener('load', …)` — URL-Param `?datei=` | ~2527 |

## UI — Source-Widget (`srcWidgetState`)
| Funktion | Zeile |
|---|---|
| `const srcWidgetState = {}` | 3896 |
| `function updateSrcPage(prefix, sid, value)` | 3898 |
| `function updateSrcQuay(prefix, sid, value)` | 3903 |
| `function initSrcWidget(prefix, selectedIds, pageMap, quayMap)` | 3908 |
| `function renderSrcTags(prefix)` | 3920 |
| `function renderSrcPicker(prefix)` | 3957 |
| `function toggleSrcPicker(prefix)` | 3974 |
| `function removeSrc(prefix, sid)` | 3988 |

## Person-Formular HTML
| Element | Zeile |
|---|---|
| `<input id="pf-given">` Vorname | ~836 |
| `<input id="pf-surname">` Nachname | ~841 |
| `<select id="pf-sex">` | ~845 |
| `<input id="pf-occu">` Beruf | ~853 |
| `<input id="pf-note">` Notiz | ~857 |
| `<input id="pf-resn">` Beschränkung | ~861 |
| `<input id="pf-email">` E-Mail | ~866 |
| `<input id="pf-www">` Website | ~871 |

## Familien-Formular HTML
| Element | Zeile |
|---|---|
| `<select id="ff-mdate-qual">` Heiratsdatum-Qualifier | 908 |
| `#ff-mdate-d` / `#ff-mdate-m` / `#ff-mdate-y` (3 Felder) | ~917 |
| `#ff-mplace-toggle` + `#ff-mplace-free` + `#ff-mplace-parts` | 920–927 |
| `<input id="ff-mplace">` Heiratsort | ~922 |
| `<select id="ff-edate-qual">` Verlobungsdatum-Qualifier | ~932 |
| `#ff-edate-d` / `#ff-edate-m` / `#ff-edate-y` (3 Felder) | ~941 |
| `#ff-eplace-toggle` + `#ff-eplace-free` + `#ff-eplace-parts` | 960–964 |
| `<input id="ff-eplace">` Verlobungsort | ~962 |
| `<div id="ff-children-display">` Kinder-Anzeige (Namen) | ~972 |
| `<input type="hidden" id="ff-children">` Kinder-IDs | ~977 |

## Event-Formular HTML
| Element | Zeile |
|---|---|
| `<select id="ef-type">` Dropdown | ~1023 |
| `<input id="ef-val">` Wert/Beschreibung | ~1044 |
| `<input id="ef-etype">` TYPE-Klassifikation | ~1048 |
| `<select id="ef-date-qual">` Datum-Qualifier | 1079 |
| `#ef-date-d` / `#ef-date-m` / `#ef-date-y` (3 Felder) | ~1090 |
| `#ef-date2-group` + `#ef-date2-d/m/y` (BET bis-Datum) | ~1097 |
| `#ef-place-toggle` + `#ef-place-free` + `#ef-place-parts` | ~1097–1107 |
| `<input id="ef-place">` Ort | ~1101 |
| `<input id="ef-addr">` Adresse | ~1075 |
| `<input id="ef-cause">` Todesursache | ~1071 |

## Sprint-Status
| Sprint | Inhalt | Status |
|---|---|---|
| Sprint 1 | A1 HEAD, A2 CHAN.TIME, A3 CONT-Split, A4 OBJE-FORM, A5 DATE-Norm | ✅ |
| Sprint 2 | B3 FACT+MILI Parser, B4 RESN/EMAIL/WWW | ✅ |
| Sprint 3 | B1 NOTE-Records Roundtrip | ✅ |
| Sprint 3+ | Display: RESN/EMAIL/WWW, Event-Dropdown FACT/MILI/GRAD/ADOP, Note-Inline-Fix | ✅ |
| Sprint 4 | B2 QUAY Parser+Writer (`sourceQUAY: {}`) | ✅ |
| Sprint 4b | Roundtrip-Test als In-App-Funktion (`runRoundtripTest`, `#modalRoundtrip`) | ✅ |
| Sprint 5 | D1–D6 UI (FACT+TYPE, QUAY-Widget, ENGA, RESN/EMAIL/WWW-Formular) | ✅ |
| Sprint 6a | C1+D3 Strukturiertes Datum (Qualifier-Dropdown, BET-Toggle) | ✅ |
| Sprint 6b | C2+D4 PLAC.FORM aus HEAD + Orts-Toggle (Freitext ↔ 6 Felder) | ✅ |
| Sprint 7 | E1 Roundtrip-Test erweitert (Sprint 5/6-Tags), ✓ STABIL | ✅ |
| Sprint 7 E2 | Ancestris-Import-Test | ⬜ manuell |
| Sprint 8 | UI/UX-Fixes (B1–B15): Ghost-Karten, IDs ausblenden, ORT-Toggle-Label, Kinder-Display, Typ-Label, AUFBEWAHRUNGSORT, Cloud-Icon | ✅ |
| Sprint 9 | URL-Parameter `?datei=`: Dateiname in Topbar anzeigen (`updateTopbarTitle`, `#topbarFileName`) | ✅ |
