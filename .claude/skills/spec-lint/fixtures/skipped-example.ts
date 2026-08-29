// Vorlage NUR für den Selbsttest von check-backlog.mjs — kein echter Test, wird von
// keinem Testlauf eingesammelt (liegt außerhalb von tests/ und des Code-Repos).
//
// Zweck: die `test:`-Beleg-Art muss einen GESKIPPTEN Test als „trifft nicht" erkennen.
// Vorher hing dieser Selbsttest-Fall an `tests/perf/scale.perf.test.ts`, das damals
// `it.skip` trug. Mit BL-47 wurde es entskippt — und der Selbsttest schlug seither still
// fehl, weil ihn niemand aufrief (`--selftest` läuft weder im Normallauf noch in CI).
// Eine Vorlage, die sich unter den Füßen verändern kann, taugt nicht als Fixpunkt.
it.skip('absichtlich geskippt — Fixpunkt für den Selbsttest', () => {});
