// gramps.bridge.js — ES-Modul-Brücke (T0-MODULE Pilot, ADR-020)
//
// Der GRAMPS-Cluster (gramps-parser.js / gramps-writer.js) ist auf echte
// ES-Module (import/export) umgestellt. Die übrigen Module sind weiterhin
// klassische <script>-Globals und rufen parseGRAMPS()/writeGRAMPS() global auf
// (storage-file.js, onedrive.js, compare-engine.js, ui-debug.js, debug-gramps.js).
//
// Diese Brücke importiert die Public-API und legt sie auf window ab, damit die
// klassischen Konsumenten ohne Änderung weiterlaufen. Sie ist die einzige Datei,
// die als <script type="module"> geladen wird. Wenn weitere Cluster migriert
// sind, kann die Brücke schrittweise entfallen.
//
// Lädt deferred (Modul-Default) → läuft nach gedcom.js (klassisch) und vor jedem
// nutzerausgelösten Aufruf. Der Cluster liest AppState/citationObj zur Laufzeit
// aus dem globalen Scope von gedcom.js (klassisches Skript, vorher geladen).

import { parseGRAMPS, _grampsParseXMLText } from './gramps-parser.js';
import { writeGRAMPS, _grampsBuildXMLText } from './gramps-writer.js';

Object.assign(window, { parseGRAMPS, writeGRAMPS, _grampsParseXMLText, _grampsBuildXMLText });
