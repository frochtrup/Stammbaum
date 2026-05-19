'use strict';
// ==========================================
//  Story-Mode: Epochen-Tabelle
//  Historischer Kontext — deutschsprachiger Raum
//
//  Format: { from, to, label, gen }
//    label — Kurzname für Listen-Anzeige
//    gen   — Genitiv-Form für „in der Zeit …"
//
//  Eigenständig editierbar (analog timeline-hist-events.js).
// ==========================================

const _STORY_EPOCHS = [
  { from: 1618, to: 1648, label: 'Dreißigjähriger Krieg',         gen: 'des Dreißigjährigen Krieges'        },
  { from: 1789, to: 1815, label: 'Napoleonische Ära',             gen: 'der Napoleonischen Ära'              },
  { from: 1848, to: 1849, label: 'Revolutionszeit 1848/49',       gen: 'der Revolutionszeit 1848/49'         },
  { from: 1866, to: 1866, label: 'Deutschen Krieg (1866)',        gen: 'des Deutschen Krieges (1866)'       },
  { from: 1870, to: 1871, label: 'Deutsch-Französischer Krieg',   gen: 'des Deutsch-Französischen Krieges'  },
  { from: 1871, to: 1918, label: 'Deutsches Kaiserreich',         gen: 'des Deutschen Kaiserreichs'         },
  { from: 1914, to: 1918, label: 'Erster Weltkrieg',              gen: 'des Ersten Weltkriegs'               },
  { from: 1918, to: 1933, label: 'Weimarer Republik',             gen: 'der Weimarer Republik'               },
  { from: 1933, to: 1945, label: 'NS-Zeit',                       gen: 'der NS-Zeit'                         },
  { from: 1939, to: 1945, label: 'Zweiter Weltkrieg',             gen: 'des Zweiten Weltkriegs'              },
  { from: 1949, to: 1990, label: 'Geteiltes Deutschland',         gen: 'des geteilten Deutschlands'          },
];
