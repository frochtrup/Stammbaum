// validator.bridge.js — ES-Modul-Brücke (T0-MODULE Phase 2, ADR-020)
//
// Zweiter migrierter Cluster nach GRAMPS (gramps.bridge.js). gedcom-validator.js
// ist auf ES-Module umgestellt; diese Brücke legt die Public-API auf window für
// die klassischen Konsumenten: ui-views-val.js, ui-views-tasks.js,
// ui-event-delegation.js.
//
// Der Validator liest nur gedcom.js-Globals (parseGedDate, gedDatePartToISO) zur
// Laufzeit aus dem globalen Scope — gedcom.js ist klassisch + vorher geladen.

import { runValidation, VAL_RULES, VAL_CONFIG_DEFAULTS } from './gedcom-validator.js';

Object.assign(window, { runValidation, VAL_RULES, VAL_CONFIG_DEFAULTS });
