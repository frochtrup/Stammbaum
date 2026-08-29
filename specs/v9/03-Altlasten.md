# 03 — Altlasten (bewusst NICHT übernehmen)

> Schicht: Meta · Kernbegründung des Neuaufsatzes

Die aus der evolutionären Entstehung von v8 stammenden Inkonsistenzen. Jeder Punkt nennt den v8-Zustand und die Zielvorgabe. Diese Liste ist der Prüfstein: reproduziert ein v9-Entwurf einen dieser Punkte, ist er falsch.

**§1 — Drei parallele Ortsspeicher.**
v8: `extraPlaces` (localStorage, dateiweise), `placeObjects` (app-weit, synchronisiert) *und* `event.placeId`. `extraPlaces` ist seit v854 read-only, aber nie entfernt (localStorage-Migrationsschulden).
→ **v9:** genau ein `placeObjects` + orthogonales `hofObjects` ([11](11-Orte-Hoefe-Identitaet.md)). Kein dateiweiser Ortsspeicher.

**§2 — Gespaltene Personen-Zitate.**
v8: `topSources` (INDI-Level) und `nameCitations` (NAME-Level) strukturell getrennt, obwohl semantisch bedeutungsgleich (führte zu verlorenen Formular-Quellen).
→ **v9:** ein einheitlicher Zitatspeicher je Kontext ([10 §5.3](10-Domaenenmodell.md)).

**§3 — Zerstreute Zitat-Felder.**
v8: Zitatdaten in vielen parallelen Maps (`sourcePages{}`, `sourceQUAY{}`, `sourceExtra{}`, `sourceMedia{}`, `topSourcePages{}` …) statt in einem Objekt.
→ **v9:** `Citation[]` mit vollständigen Feldern ([10 §5.3](10-Domaenenmodell.md)).

**§4 — Zehn Ad-hoc-Passthrough-Mechanismen.**
v8: Verbatim-Erhalt über 10 kontextspezifische Speicher verstreut.
→ **v9:** ein generischer Passthrough-Baum ([13 §2](13-Interop-Roundtrip.md)). Das Passthrough-*Prinzip* bleibt zwingend (LP-1), die zersplitterte Umsetzung nicht.

**§5 — God-Module & fehlendes Modulsystem.**
v8: `gedcom.js` ~2.300 Zeilen / ~96 Top-Level-Funktionen; ~860 globale Symbole; ~53 `<script>`-Tags in fragiler Ladereihenfolge; kein `import/export` (bewusst kein Build-Step, ADR-001/002; ESM-Migration nach 2 Clustern stagniert).
→ **v9:** echtes Modulsystem, Schichtung nach [02](02-Zielarchitektur-v9.md). Domänenkern DOM-frei und headless testbar; UI separat. Der Zwang „edit-anywhere ohne Toolchain" entfällt.

**§6 — Manuelle Render-Aufrufe & Zustandssynchronisation.**
v8: kein Framework; Listen nach jeder Änderung manuell neu gerendert; Dirty-Tracking ad hoc; `markChanged(); renderTab()`-Streuselcode.
→ **v9:** reaktive UI-Schale mit einem zentralen Invalidierungspfad ([02 §3.2](02-Zielarchitektur-v9.md)); imperative Diagramme als Ausnahme-Inseln.

**§7 — localStorage-Sidecar für Höfe.**
v8: `stammbaum_hofobjects` (V1) parallel zu `hofObjects` V2 als Migrationsrest.
→ **v9:** nur die getrennte `hofObjects`-Entität in `orte.json` v2.

**§8 — Monsterfunktionen.**
v8: Rest-Bestand (`showDetail` ~275 Z., `_pdetLifeData` ~195 Z.) trotz mehrerer Split-Runden.
→ **v9:** Funktionsgrößen-Disziplin von Anfang an; Detail-Rendering datengetrieben komponieren.

**§9 — App-verwaltete Cloud-Sync + komplexes Dateihandling.**
v8: ~5 Module (`storage.js`, `storage-file.js`, `onedrive-auth.js`, `onedrive-import.js`, `onedrive.js`) mit OneDrive Graph API, OAuth/Token, `od_base_path`, ETag/If-Match, Ordner-Picker, `filemap`, automatischen Timestamp-Backups und mehreren Text-Caches — der komplexeste, am wenigsten essenzielle Teil.
→ **v9:** **ein** `FileService` + Kern-Serializer. Arbeitskopie (IDB) + zwei Save-Tiers; Geräte-Sync macht das OS (Sync-Ordner). App-Cloud nur noch als optionaler Adapter hinter derselben Schnittstelle. Vollständig: [14 Dateihandling](14-Dateihandling.md).

**§10 — Inkonsistente, evolutionär gewachsene Navigation.**
v8: 6 Bottom-Nav-Slots für ~11 Ziele; Suche/Statistik ohne Nav-Button; Höfe/Karte als versteckte Sub-Modi des Orte-Tabs; Entität + Arbeitsfläche + Visualisierung in einer flachen Leiste vermischt; Diagramm-Toggles als verstreute Glyphen mit starren Ordnungsregeln; Desktop nur „Mobile + Spalten" mit `!important`-Vollbild-Hacks; Doku und Code driften (bnav-search vs. bnav-tasks).
→ **v9:** Rollenmodell (Entitäten / Ansichten-Lenses / Arbeitsflächen), je Form-Faktor eigenständig designt (Mobile Bottom-Nav Baum·Personen·Suche·Aufgaben·Mehr; Desktop Sidebar + Multi-Pane + ⌘K), ein Lens-Umschalter. Vollständig: [21 §1–§4 + §9](21-UI-UX.md).

---

## Was bewusst erhalten bleibt (keine Altlast)

- die getrennte Orts-/Hof-Modellierung ([11](11-Orte-Hoefe-Identitaet.md)),
- die deterministische Identitätsauflösung (Re-Derivation *ist* Persistenz, LP-5),
- das Passthrough-*Prinzip* ([13](13-Interop-Roundtrip.md)),
- das Zitat-/Evidenz-/Hypothesen-Modell ([10](10-Domaenenmodell.md)/[12](12-Forschungsdaten.md)),
- der View-State- und PWA-Lifecycle-Kontrakt ([21](21-UI-UX.md)),
- die vier Ausgabemodi ([13](13-Interop-Roundtrip.md)),
- die Symbol-Konventionen und das Design-System ([21](21-UI-UX.md)).
