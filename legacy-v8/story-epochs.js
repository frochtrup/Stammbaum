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
  { from: 1618, to: 1648, label: 'Dreißigjähriger Krieg',
    gen: 'des Dreißigjährigen Krieges',
    ctx: 'Krieg, Seuchen und Hungersnöte verwüsteten weite Teile Mitteleuropas.' },
  { from: 1789, to: 1815, label: 'Napoleonische Ära',
    gen: 'der Napoleonischen Ära',
    ctx: 'Die Napoleonischen Kriege veränderten die politische Landkarte Europas grundlegend.' },
  { from: 1848, to: 1849, label: 'Revolutionszeit 1848/49',
    gen: 'der Revolutionszeit 1848/49',
    ctx: 'Forderungen nach nationaler Einheit und bürgerlichen Freiheiten erschütterten die alten Mächte.' },
  { from: 1866, to: 1866, label: 'Deutschen Krieg (1866)',
    gen: 'des Deutschen Krieges (1866)',
    ctx: 'Der Krieg zwischen Preußen und Österreich entschied die Vorherrschaft im deutschen Raum.' },
  { from: 1870, to: 1871, label: 'Deutsch-Französischer Krieg',
    gen: 'des Deutsch-Französischen Krieges',
    ctx: 'Der Sieg über Frankreich ebnete den Weg zur Gründung des Deutschen Kaiserreichs.' },
  { from: 1871, to: 1918, label: 'Deutsches Kaiserreich',
    gen: 'des Deutschen Kaiserreichs',
    ctx: 'Industrialisierung, wirtschaftliches Wachstum und Aufbruch in die Moderne prägten diese Ära.' },
  { from: 1914, to: 1918, label: 'Erster Weltkrieg',
    gen: 'des Ersten Weltkriegs',
    ctx: 'Der Erste Weltkrieg kostete Millionen das Leben und erschütterte die alte europäische Ordnung.' },
  { from: 1918, to: 1933, label: 'Weimarer Republik',
    gen: 'der Weimarer Republik',
    ctx: 'Demokratischer Neuanfang, Hyperinflation und politische Unruhen wechselten einander ab.' },
  { from: 1933, to: 1945, label: 'NS-Zeit',
    gen: 'der NS-Zeit',
    ctx: 'Die nationalsozialistische Diktatur brachte Terror, Verfolgung und schließlich den Krieg.' },
  { from: 1939, to: 1945, label: 'Zweiter Weltkrieg',
    gen: 'des Zweiten Weltkriegs',
    ctx: 'Der Zweite Weltkrieg war der verlustreichste Krieg der Geschichte und hinterließ Europa in Trümmern.' },
  { from: 1949, to: 1990, label: 'Geteiltes Deutschland',
    gen: 'des geteilten Deutschlands',
    ctx: 'Deutschland war in Bundesrepublik im Westen und DDR im Osten geteilt.' },
];
