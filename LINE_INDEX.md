# index.html — Zeilen-Index

Stand: Sprint 11 (2026-03-21). Bei grösseren Edits bitte aktualisieren.

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
| Level-0 Dispatch (INDI / FAM / SOUR / NOTE / REPO) | ~1468–1503 |
| **INDI init** `cur = { id:tag, _passthrough:[], _nameParsed:false, …` | 1474 |
| `birth:{…}` / `chr:{…}` / `death:{…}` / `buri:{…}` | 1477–1482 |
| `events:[], famc:[], fams:[]` | ~1483–1486 |
| **FAM init** `cur = { id:tag, _passthrough:[], …` | 1489 |
| **SOUR init** `cur = { id:tag, _passthrough:[], …` | 1492 |
| **NOTE init** | 1497 |
| **REPO init** | 1499 |
| Context-Tracking (`lv1tag`, `lv2tag`, `lv3tag`, `inMap`, …) | 1507–1509 |
| **Verbatim Passthrough check** (`_ptDepth`) | 1511–1519 |
| `// ── INDIVIDUAL ──` | 1521 |
| INDI lv=1 (`if (lv === 1)`) | 1524–1568 |
| INDI lv=2 | 1570–1634 |
| INDI lv=3 (PAGE, QUAY, CHAN.TIME, _FREL/_MREL SOUR …) | 1636–1673 |
| INDI lv=4 (MAP LATI/LONG, _FREL/_MREL PAGE/QUAY …) | 1675–1709 |
| `// ── FAMILY ──` | 1711 |
| FAM lv=1 (HUSB, WIFE, CHIL, NOTE, SOUR, MARR, ENGA, CHAN) | 1713–1729 |
| FAM lv=2 (MARR DATE/PLAC/SOUR, ENGA DATE/PLAC, NOTE CONC …) | 1730–1787 |
| `// ── SOURCE ──` | 1788 |
| SOUR lv=1 (TITL, ABBR, AUTH, DATE, PUBL, REPO, TEXT, CHAN, else→passthrough) | 1790–1803 |
| SOUR lv=2 / lv=3 | 1805–1813 |
| `// ── NOTE record ──` | 1816 |
| `// ── REPO record ──` | 1822 |
| Resolve NOTE references (post-parse) | ~1840–1860 |
| `return { individuals, families, … }` | ~1862 |

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
| `function writeGEDCOM()` | 2106 |
| HEAD block | 2111–2125 |
| `function eventBlock(tag, obj, lv)` | 2137 |
| eventBlock: SOUR+PAGE+QUAY output | ~2145–2149 |
| **INDI Writer loop** `for (const p of …)` | 2153 |
| INDI NAME + GIVN/SURN/NPFX/NSFX | 2156–2166 |
| INDI events loop (BIRT/CHR/DEAT/BURI, events[]) | 2179–2199 |
| INDI media loop + passthrough | 2227–2243 |
| **FAM Writer loop** | 2246 |
| FAM MARR via `eventBlock('MARR', f.marr, 1)` | 2272 |
| FAM ENGA block | 2273–2277 |
| FAM passthrough | 2286 |
| **SOUR Writer loop** | 2289 |
| SOUR passthrough | 2316 |
| **REPO Writer loop** | ~2320 |
| **NOTE Records loop** (vor TRLR) | ~2338 |
| `lines.push('0 TRLR')` | ~2344 |

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
