// Vorlage für den Selbsttest-Fall „txt: findet Kommentar (nicht gestrippt)".
//
// Der Fall hing bis 2026-07-21 an `txt:no-useless-assignment@ui/views/timeline/
// TimelineLensView.svelte` — dort stand ein `eslint-disable`-Kommentar. BL-53 entfernte
// genau diesen Rest, und der Selbsttest schlug fehl: der VIERTE Fall derselben
// Verrottung (s. skipped-example.ts, stabiler-text.txt, fixtures/nie-angelegt.ts).
// Diesmal fiel er sofort auf, weil der Selbsttest seit BL-04 bei jedem Lauf mitläuft.
//
// Der Unterschied, den dieser Fall bewacht: `sym:` strippt Kommentare vor der Suche,
// `txt:` nicht — ein Beleg auf eine Konfigurations- oder Kommentarzeile muss auch dann
// treffen, wenn dieselbe Zeichenfolge nirgends im Code steht. Genau das prüft er hier:
// diesesTokenStehtNurImKommentar
//
// Diese Datei ändert sich nicht unter den Füßen des Prüfers.

export const vorlage = 'ohne Bezug zum Produktivcode';
