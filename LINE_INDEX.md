# index.html — Zeilen-Index

Stand: Sprint 13 (2026-03-21). Bei grösseren Edits bitte aktualisieren.

## Globale Variablen / Konstanten
| Symbol | Zeile |
|---|---|
| `let db = {` | 1381 |
| `let changed`, `_placesCache`, `_originalGedText`, … | 1382–1405 |
| `function _getOriginalText()` | 1407 |
| `function nextId()` | 1411 |
| `const EVENT_LABELS = {` | 1417 |
| `const srcWidgetState = {}` | 4127 |

## GEDCOM Parser (`parseGEDCOM`)
| Sektion | Zeile |
|---|---|
| `function parseGEDCOM(text)` | 1438 |
| `const _extraRecords = []` (Sprint 12: unbekannte lv=0 Records) | 1447 |
| `let _ptDepth = 0` | 1458 |
| `let _ptTarget = null` | 1459 |
| Level-0 Dispatch (INDI / FAM / SOUR / NOTE / REPO / **_extra**) | ~1469–1513 |
| **INDI init** (incl. `nameRaw:''`) | 1474 |
| `birth:{…}` / `chr:{…}` / `death:{…}` / `buri:{…}` | 1477–1482 |
| `famc push` (incl. `frelSeen:false, mrelSeen:false`) | 1556 |
| **FAM init** (incl. `marr.seen:false, marr.addr:''`) | 1490 |
| **SOUR init** | 1493 |
| **NOTE init** | 1496 |
| **REPO init** | 1500 |
| `_extra` handler (sub-lines verbatim) | 1515 |
| Context-Tracking (`lv1tag`, `lv2tag`, `lv3tag`, `inMap`, …) | 1517–1519 |
| **Verbatim Passthrough check** (`_ptDepth`) | 1522–1530 |
| `// ── INDIVIDUAL ──` | 1534 |
| INDI lv=1 (`if (lv === 1)`) | ~1537–1582 |
| INDI lv=2 (inkl. FAMC `frelSeen`/`mrelSeen`) | ~1584–1635 |
| INDI lv=3 (PAGE, QUAY, CHAN.TIME, FAMC `frelSour`/`mrelSour`) | ~1637–1686 |
| INDI lv=4 (MAP LATI/LONG, _FREL/_MREL PAGE/QUAY) | ~1688–1714 |
| `// ── FAMILY ──` | 1728 |
| FAM lv=1 (HUSB, WIFE, CHIL, NOTE, SOUR, MARR.seen, ENGA, CHAN) | 1730–1746 |
| FAM lv=2 (MARR/ENGA/NOTE/CHAN/CHIL `frelSeen`/`mrelSeen`; MARR else→`_extra`) | 1747–1770 |
| FAM lv=3 (MARR SOUR PAGE/QUAY, CHIL `frelSour`/`mrelSour`) | 1769–1784 |
| FAM lv=4 (MAP MARR LATI/LONG, CHIL _FREL/_MREL PAGE/QUAY) | 1785–1806 |
| `// ── SOURCE ──` | 1806 |
| `// ── NOTE record ──` / `// ── REPO record ──` | ~1826 / ~1840 |
| Resolve NOTE references (post-parse) | ~1858–1864 |
| `return { individuals, families, …, extraRecords }` | 1864 |

## Datum-Hilfsfunktionen
| Funktion | Zeile |
|---|---|
| `const _GED_MONTHS = […]` | 1863 |
| `const _MONTH_NUM = {…}` | 1880 |
| `function _parseDatePart(s)` | 1883 |
| `function gedDatePartToISO(s)` | 1895 |
| `function parseGedDate(raw)` | 1908 |
| `function buildGedDate(qual, date1, date2)` | 1920 |
| `function normDateToISO(raw)` | 1928 |
| `function fillDateFields(qualId, dateBaseId, date2BaseId, raw)` | 1938 |
| `function onDateQualChange(selectEl, date2Id)` | 1950 |
| `function normMonth(s)` | 1958 |
| `function writeDatePartToFields(baseId, dateStr)` | 1984 |
| `function readDatePartFromFields(baseId)` | 1995 |
| `function buildGedDateFromFields(qualId, dateBaseId, date2BaseId)` | 2007 |

## PLAC-Hilfsfunktionen (Sprint 6b)
| Funktion | Zeile |
|---|---|
| `const _placeModes = {}` | 2016 |
| `function getPlacLabels()` | 2018 |
| `function buildPlacePartsHtml(placeId)` | 2023 |
| `function fillPlaceParts(placeId, raw)` | 2029 |
| `function joinPlaceParts(placeId)` | 2037 |
| `function getPlaceFromForm(placeId)` | 2046 |
| `function initPlaceMode(placeId)` | 2051 |
| `function togglePlaceMode(placeId)` | 2061 |

## GEDCOM Writer (`writeGEDCOM`)
| Sektion | Zeile |
|---|---|
| `function writeGEDCOM()` | 2124 |
| HEAD block | ~2129–2143 |
| `function eventBlock(tag, obj, lv)` | 2155 |
| eventBlock: `obj.seen` guard (marr, engag) | 2157 |
| eventBlock: SOUR+PAGE+QUAY output | ~2163–2167 |
| **INDI Writer loop** `for (const p of …)` | 2171 |
| INDI NAME (nameRaw fallback) | 2175 |
| INDI GIVN/SURN/NPFX/NSFX | ~2177–2184 |
| INDI events loop (BIRT/CHR/DEAT/BURI, events[]) | ~2197–2217 |
| INDI famc loop (`frelSeen`/`mrelSeen` guard) | 2222–2242 |
| INDI media loop + passthrough | ~2244–2260 |
| **FAM Writer loop** | 2264 |
| FAM CHIL + childRelations (`frelSeen`/`mrelSeen` guard) | 2268–2288 |
| FAM MARR via `eventBlock` + ADDR + `marr._extra` | 2290–2295 |
| FAM passthrough | ~2304 |
| **SOUR Writer loop** | 2308 |
| SOUR passthrough | ~2334 |
| **REPO Writer loop** | ~2338 |
| **NOTE Records loop** (vor TRLR) | ~2356 |
| **extraRecords loop** (Sprint 12: SUBM u.a.) | 2375 |
| `lines.push('0 TRLR')` | 2379 |

## UI — Detail-Ansicht
| Funktion | Zeile |
|---|---|
| `function showDetail(id, pushHistory = true)` | 3612 |
| Detail: events forEach-Loop | ~3665 |
| `function showFamilyDetail(id, pushHistory = true)` | 3762 |
| `function showSourceDetail(id, pushHistory = true)` | 3822 |
| `function factRow(…)` | 3912 |
| `function sourceTagsHtml(…)` | 3924 |
| `function runRoundtripTest()` | 3936 |

## UI — Formulare
| Funktion | Zeile |
|---|---|
| `function showPersonForm(id)` | 4235 |
| `function savePerson()` | 4253 |
| `function _refreshChildDisplay()` | 4339 |
| `function showFamilyForm(id, ctx)` | 4357 |
| `function saveFamily()` | 4401 |
| `function saveSource()` | 4484 |
| `function showRepoDetail(id, pushHistory = true)` | 4591 |
| `function saveRepo()` | 4643 |
| `function onEventTypeChange()` | 4691 |
| `function showEventForm(personId, evIdx)` | 4699 |
| `function saveEvent()` | 4740 |

## UI — Topbar / Startup
| Symbol | Zeile |
|---|---|
| `<span id="topbarFileName">` (Listen-Topbar, v-main) | 712 |
| `function updateSaveIndicator()` | 2401 |
| `function updateTopbarTitle(filename)` | 2410 |
| `function _processLoadedText(text, filename)` | 2625 |
| `function tryAutoLoad()` | 2677 |
| `window.addEventListener('load', …)` — URL-Param `?datei=` | 2694 |

## UI — Source-Widget (`srcWidgetState`)
| Funktion | Zeile |
|---|---|
| `const srcWidgetState = {}` | 4127 |
| `function updateSrcPage(prefix, sid, value)` | 4129 |
| `function updateSrcQuay(prefix, sid, value)` | 4134 |
| `function initSrcWidget(prefix, selectedIds, pageMap, quayMap)` | 4139 |
| `function renderSrcTags(prefix)` | 4151 |
| `function renderSrcPicker(prefix)` | 4188 |
| `function toggleSrcPicker(prefix)` | 4205 |
| `function removeSrc(prefix, sid)` | 4219 |

## Person-Formular HTML
| Element | Zeile |
|---|---|
| `<input id="pf-given">` Vorname | ~836 |
| `<input id="pf-surname">` Nachname | ~841 |
| `<select id="pf-sex">` | ~845 |
| `<input id="pf-note">` Notiz | ~857 |
| `<input id="pf-resn">` Beschränkung | ~861 |
| `<input id="pf-email">` E-Mail | ~866 |
| `<input id="pf-www">` Website | ~871 |

## Familien-Formular HTML
| Element | Zeile |
|---|---|
| `<select id="ff-mdate-qual">` Heiratsdatum-Qualifier | ~908 |
| `#ff-mdate-d` / `#ff-mdate-m` / `#ff-mdate-y` (3 Felder) | ~917 |
| `#ff-mplace-toggle` + `#ff-mplace-free` + `#ff-mplace-parts` | ~920–927 |
| `<input id="ff-mplace">` Heiratsort | ~922 |
| `<select id="ff-edate-qual">` Verlobungsdatum-Qualifier | ~932 |
| `#ff-edate-d` / `#ff-edate-m` / `#ff-edate-y` (3 Felder) | ~941 |
| `<div id="ff-children-display">` Kinder-Anzeige (Namen) | ~972 |
| `<input type="hidden" id="ff-children">` Kinder-IDs | ~977 |

## Event-Formular HTML
| Element | Zeile |
|---|---|
| `<select id="ef-type">` Dropdown | ~1023 |
| `<input id="ef-val">` Wert/Beschreibung | ~1044 |
| `<input id="ef-etype">` TYPE-Klassifikation | ~1048 |
| `<input id="ef-cause">` Todesursache | ~1071 |
| `<input id="ef-addr">` Adresse | ~1075 |
| `<select id="ef-date-qual">` Datum-Qualifier | ~1079 |
| `#ef-date-d` / `#ef-date-m` / `#ef-date-y` (3 Felder) | ~1090 |
| `#ef-date2-group` + `#ef-date2-d/m/y` (BET bis-Datum) | ~1097 |
| `#ef-place-toggle` + `#ef-place-free` + `#ef-place-parts` | ~1097–1107 |
| `<input id="ef-place">` Ort | ~1101 |

## Sprint-Status
| Sprint | Inhalt | Status |
|---|---|---|
| 1 | A1 HEAD, A2 CHAN.TIME, A3 CONT-Split, A4 OBJE-FORM, A5 DATE-Norm | ✅ |
| 2 | B3 FACT+MILI Parser, B4 RESN/EMAIL/WWW, B5 CHAN.TIME parsen | ✅ |
| 3 | B1 NOTE-Records Roundtrip | ✅ |
| 4 | B2 QUAY Parser+Writer; Roundtrip-Test als In-App-Funktion | ✅ |
| 5 | D1–D6 UI: FACT+TYPE, QUAY-Widget, ENGA, RESN/EMAIL/WWW | ✅ |
| 6a | C1+D3 Strukturiertes Datum: Qualifier + 3-Felder-Eingabe | ✅ |
| 6b | C2+D4 PLAC.FORM aus HEAD + Orts-Toggle Freitext ↔ 6-Felder | ✅ |
| 7 | E1: Roundtrip-Test erweitert; E2: Ancestris-Import-Test stabil | ✅ |
| 8 | UI/UX-Fixes B1–B14 (Ghost-Karten, Topbar, Kinder-Feld, etc.) | ✅ |
| 9 | URL-Parameter `?datei=`: Dateiname in Topbar | ✅ |
| 10 | MARR/NAME/topSrc PAGE+QUAY; CONC-Fix; _FREL/_MREL lv3-4 | ✅ |
| 11 | Verbatim Passthrough (ADR-012); DEAT.value; CONC val-fix; Auto-Diff | ✅ |
| 12 | `frelSeen`/`mrelSeen` (leere _FREL/_MREL); `extraRecords` SUBM-Passthrough; INDI.famc frelSour; MARR.addr | ✅ |
