# 30 — Nicht-funktionale Anforderungen & Persistenz

> Schicht: Betrieb · Abhängig von: [11 Orte/Höfe](11-Orte-Hoefe-Identitaet.md) (orte.json), [13 Interop](13-Interop-Roundtrip.md) (Datei) · Plattform-APIs leben hier, nicht im Kern ([02 §7](02-Zielarchitektur-v9.md))

---

## 1. Nicht-funktionale Anforderungen

**NFR-1 Performance & Skalierung:**
- Parsing großer Dateien im Hintergrund (Worker), Fortschrittsanzeige.
- **Virtuelles Scrollen für die Index-Flächen** — welche das sind, entscheidet das Kriterium in [21 §10b](21-UI-UX.md) ([ADR-v9-234](04-Entscheidungslog.md#adr-v9-234)); die FORM steht in [ADR-v9-235](04-Entscheidungslog.md#adr-v9-235) und [ADR-v9-236](04-Entscheidungslog.md#adr-v9-236):
  - **Ein Fenster je Gruppe**, wo mehrere Listen einen Scroll-Container teilen (Suchtreffer) — die Gruppenstruktur bleibt erhalten, statt für ein gemeinsames Fenster flachgelegt zu werden.
  - **Positionsbestimmung O(log n) über eine Höhen-Präfixsumme mit binärer Suche.** Die Höhe einer Zeile folgt aus ihrer **Höhenklasse**, und die steht in den DATEN (hat die Zeile eine Zweitzeile? ist sie eine Zwischenüberschrift?); gemessen wird nur EINE Musterhöhe je Klasse. Eine einzige Höhe je Gruppe genügt nicht: dieselbe Trefferliste enthält 34,1px- und 51,1px-Zeilen.
  - **Eine Messung, die den Zustand speist, aus dem sie folgt, wird monoton übernommen** (nur größere Werte). Sonst kreist sie, und der Effektbaum bricht ab — die Fläche friert dann ein, statt falsch zu rechnen.
  - **Platzhalter tragen die nicht gerenderten Zeilen** — `Platzhalter + Fenster = Gesamthöhe` an JEDER Scroll-Position, damit Scrollbalken und Position wahr bleiben.
  - **Ohne gemessene Höhe rendert die Fläche ein Anfangsfenster** — nicht nichts (das sähe aus wie Datenverlust) und nicht alles (das wäre im ersten Takt genau die Knoten-Spitze, gegen die es das Fenster gibt).
  - **Die Höhe einer Zeile ist gemessen, sobald sie einmal im Fenster stand**; die Klassenhöhe ist nur die Schätzung für alles Ungerenderte. Sonst legt eine einzige umgebrochene Zeile ihre Höhe unter jede andere ihrer Klasse.
  - **Eine Gruppe außerhalb des Sichtbereichs rendert gar nichts** — sonst kostet jede Gruppe mindestens ihr Overscan-Fenster, und eine nach Buchstaben gruppierte Liste zahlt das 27-fach.
  - **Die Höhenklasse folgt aus den DATEN, nicht aus dem Layout** — bei einer Liste „hat die Zeile eine Zweitzeile?", bei einem Kachelraster „enthält die Reihe eine Miniatur?". Eine Klasse, deren Schätzung weit neben der Wahrheit liegt, löst beim Scrollen eine Korrektur-Kettenreaktion aus.
  - **Gewacht wird ein absolutes Knoten-Budget je Fläche, unabhängig von der Zeilenzahl** (`tests/perf/list-render.perf.test.ts`) — eine Kennzahl „je Zeile" misst eine Fläche, die mit ihren Daten wächst, und genau das soll es nicht mehr geben.
- Sortier-Cache mit gezielter Invalidierung.
- **v9-Zusicherung: 20.000 Personen** (ADR-v9-89). Budgets bei dieser Größe:

  | Schritt | Budget | Ist (2026-07-18) |
  |---|---|---|
  | Parse (GEDCOM → Modell) | < 400 ms | 112 ms |
  | Orts-/Hof-Auflösung | < 2.000 ms | **89.436 ms** — offener Defekt (ADR-v9-88) |
  | Erster Sort (Personenliste) | < 400 ms | 81 ms |

  Verifiziert durch die Skalen-Testebene ([32 §2](32-Testframework.md), `npm run test:perf`) gegen eine deterministisch erzeugte Fixture. Die dortigen Test-Budgets liegen bewusst ~3× über diesen Zusicherungen — sie sind Größenordnungs-Wecker auf fremder CI-Hardware, nicht die Zusicherung selbst.
- **Historische v8-Referenz** (keine v9-Vorgabe): v8 war bis 20.000 Personen verifiziert (Parse < 700 ms, erster Sort ~1 s). v9 liegt bei Parse und Sortierung deutlich darunter; die Orts-/Hof-Auflösung gab es in v8 in dieser Form nicht und wird ausdrücklich **nicht** an v8 gemessen (ADR-v9-89).
- Ziel-offen und unverbindlich: 50k/100k (Speicher, Storage-Quota) — in v9 von Anfang mitdenken (SCALE-REAL).

**NFR-2 Offline/PWA:**
- Service Worker mit atomarem Precache kritischer Assets, Cache-first/Network-first-Strategie, Offline-Fallback-Seite, BFCache-Guard.
- Bei App-Update: Nutzerhinweis (kein stiller Bruch durch alten Cache). Der neue Worker aktiviert sich **nicht** von selbst — er wartet auf eine Nutzerentscheidung, sonst mischt eine offene Seite alte und neue Chunks.
- **Precache-Liste und Cache-Version werden beim Build erzeugt, nicht gepflegt** (ADR-v9-93). Die Version ist ein Inhalts-Hash über alle Precache-Dateien; sie ändert sich damit auch bei Dateien ohne Hash im Namen (`offline.html`, `icon.svg`). Die aus v8 geerbte Regel „bei Modul-/Asset-Umstellung Cache-Version von Hand bumpen" gilt deshalb **nicht mehr** — sie war die Ursache dafür, dass ein alter SW eine veraltete Shell auslieferte, und ist durch den Automatismus ersetzt.

**NFR-3 Sicherheit (LP-8):**
- CSP `script-src 'self'` ohne `unsafe-inline`/`eval` (keine Inline-Styles/-Handler; Event-Delegation + CSSOM bzw. Framework-Bindings).
- Konsequentes HTML-Escaping aller Nutzerstrings.
- Kein OAuth/Token im Kern-Dateipfad (App-verwaltete Cloud entfällt, [14 §5](14-Dateihandling.md)). Nur falls ein optionaler Cloud-Adapter zugeschaltet wird: OAuth 2.0 PKCE (S256), Token in `sessionStorage`, Restrisiko isoliert auf dieses Modul.
- Automatisiertes CSP-Test-Gate.
- **Umgesetzt (ADR-v9-39):** `app/csp-policy.ts` (einzige Quelle der Wahrheit) + `app/csp-plugin.ts` (Vite-`transformIndexHtml`, injiziert das Meta-Tag NUR im Produktions-Build — GitHub Pages liefert keine eigenen Response-Header) + `tests/csp/check-csp.mjs` (CI-Gate `npm run check:csp`, Portierung von v8 `test-csp.js`). Direktiven-Set gegenüber dem v8-Orakel bewusst reduziert: kein OneDrive/Microsoft-Graph/OAuth-Zubehör (ADR-v9-04). `connect-src` erlaubt Nominatim (OSM) für das opt-in-Geocoding (BL-130, nur auf Nutzeraktion); gov.genealogy.net bleibt draußen (nicht aufgerufen). `img-src` braucht `data: blob:` — Leaflets gebündeltes CSS/JS bettet selbst `data:image/...`-URIs ein (Zoom-Controls, Marker-Schatten), sonst bricht die Karten-Insel unter aktiver CSP (browser-verifiziert). Bekannte Restlücke: konsequentes HTML-Escaping ist NICHT gesondert verifiziert (Svelte escaped Templates standardmäßig, aber `ui/islands/map/leaflet-map.ts` übergibt Personen-/Orts-Freitext ungeprüft an Leaflets `bindTooltip` (innerHTML-basiert) — CSP `script-src 'self'` mildert eine darüber eingeschleuste Inline-Handler-Injektion strukturell ab, behebt die zugrunde liegende Escaping-Lücke aber nicht; offener Folge-Punkt, nicht Teil dieser Entscheidung).

**NFR-4 Datenschutz (LP-2):**
- Lokal-First, kein Tracking, keine Telemetrie, kein Cloud-Zwang.
- DSGVO-Anonymisierung beim Export ([13 §7](13-Interop-Roundtrip.md)).

**NFR-5 Barrierefreiheit (LP-8):**
- WCAG 2.1 AA, 0 Violations. Tastaturbedienbarkeit, aria-labels, Kontraste, nicht-nur-Farbe, `prefers-reduced-motion`.
- Operationalisierter Kontrakt (konkrete Mechanismen je Teilanforderung, Beispiele, Cross-Refs): [21 §6i](21-UI-UX.md). Test-Gate: [32 TST-15](32-Testframework.md).

**NFR-6 Testbarkeit (kritisch — [02 INV-ARCH-2](02-Zielarchitektur-v9.md)):**
- Alle Kern-Domänenlogik headless testbar (kein Browser, kein Nutzer, **kein Build**): Roundtrip-Tests (GEDCOM + GRAMPS), Unit-Tests der reinen Funktionen, Snapshot-Test kritischer Render-Ausgaben, CSP-Gate.
- Test-Suite als Pre-Commit-Gate; Import-Graph-Check als Gate für [02 INV-ARCH-1](02-Zielarchitektur-v9.md); deterministischer Synthetik-Generator für Skalierungstests.
- **Vollständige Spezifikation: [32 Testframework](32-Testframework.md)** (Ebenen, Werkzeuge, Fixtures, Determinismus/Seams, Kontrakt-Matrix je Subsystem).

---

## 2. Speicher- & Konfigurationsmodell

### 2.1 Speicherschichten

| Schicht | Zweck |
|---|---|
| **Datei** (GEDCOM/GRAMPS) im **OS-Sync-Ordner** | Wahrheit für Genealogie (LP-3); Geräte-Sync macht das OS (iCloud/OneDrive-Ordner), nicht die App |
| **Arbeitskopie (IndexedDB)** | *eine* kanonische Text-Kopie: Auto-Load, Absturz-Recovery, Offline; Foto-Cache (pfad-basiert), App-Konfiguration |
| **`orte.json`** (IndexedDB-Spiegel immer; Datei im Sync-Ordner optional) | Cross-Stammbaum Orts-/Hofwissen (LP-4) mit Revision/Device-Konflikterkennung; Datei-Ein-/Ausgang über eigenes FS-Handle, explizite Export-/Import-Aktion ([14 §6](14-Dateihandling.md)) |

> Es wird der **Datei-Text** gecacht (Arbeitskopie), nicht das In-Memory-Modell (Sets/Referenzen nicht trivial serialisierbar; die Datei ist ohnehin die Wahrheit). Vollständiges Dateihandling: [14](14-Dateihandling.md).

**Ein Schreibweg für alle Object-Stores.** Jeder Schreibzugriff auf IndexedDB läuft über
`idbPut` (`services/idb-schema.ts`) — dieselbe Begründung wie beim EINEN Schema-Öffner
daneben, eine Ebene tiefer. Der Grund ist nicht die eingesparte Boilerplate, sondern der
Fehlerfall: lehnt der Browser einen Wert als nicht klonbar ab, nennt seine Meldung weder
den Speicher noch das Feld, und jede Fassung lautet anders (WebKit: „The object can not be
cloned.", Chromium: „… could not be cloned."). `idbPut` misst im Fehlerfall nach, welcher
Pfad das Klonen verhindert, und stellt Speichername und Feld in die Meldung. Dasselbe gilt
für den Kern-Chokepoint jeder Bearbeitung (`core/model/draft.ts::thaw`). Ein Store, der
selbst `objectStore(…).put(…)` aufruft, ist ein Testfehler, kein Stilfehler
([32](32-Testframework.md), `tests/services/idb-schema.test.ts`).

### 2.2 App-privater Zustand (geräteweit in IndexedDB, reist NICHT mit der Genealogie-Datei)

Klassen mit unterschiedlichem Sync-Bedarf, getrennt entlang **zwei** Fragen: reist es sinnvoll auf ein anderes **Gerät** (A gegen B), und gilt es auch in einem anderen **Bestand** (B1 gegen B2)? Beide müssen beantwortet sein, bevor etwas mitreist — die zweite fehlte zunächst ([ADR-v9-173](04-Entscheidungslog.md#adr-v9-173)):

**Kategorie A — gerätespezifisch** (bleibt lokal; eine Mitnahme wäre sinnlos oder falsch):
Theme (dark/light) · FS-Handle + letzter Dateiname der Arbeitskopie ([14](14-Dateihandling.md)) · **Verzeichnis-Handle des Medien-Ordners** ([§3](#3-medien-pfad-modell), [ADR-v9-187](04-Entscheidungslog.md#adr-v9-187)) · Arbeitskopie selbst (IDB) · Foto-/Medien-Cache (`img:<relPath>`, [§3](#3-medien-pfad-modell)).

> Der Medien-Ordner ist der Musterfall der Kategorie-A-Grenze: ein `FileSystemDirectoryHandle` ist nicht serialisierbar und auf einem zweiten Gerät bedeutungslos — mitreisen kann nur die Zuordnungs**regel**, nicht der Zugang ([B1](#22-app-privater-zustand-geräteweit-in-indexeddb-reist-nicht-mit-der-genealogie-datei) unten). Ein Pfad-String als Ersatz wäre eine Attrappe: aus ihm bekommt der Browser keine Bytes.

**Kategorie B — nutzer-erarbeiteter Zustand** (geräteweit gespeichert, aber echte Nutzerarbeit; geht heute bei Gerätewechsel verloren). Zerfällt in zwei Unterklassen — **nur eine davon gilt über Bestände hinweg** ([ADR-v9-173](04-Entscheidungslog.md#adr-v9-173)):

- **B1 — dateiübergreifend** (identifiziert über Schema, Regelnamen, Flags, URL — nichts davon zeigt in einen Bestand): Quick-Templates · Validierungs-Config · Export-Vorwahl (Anonymisierungs-Flag · GED-Version · Strict-Flag) · **Kartenebenen-Wahl + eigene Kachel-Adresse** ([20 §1.9](20-Funktionen.md), [ADR-v9-166](04-Entscheidungslog.md#adr-v9-166)) · **Medien-Zuordnung** — der Ordner**name** als Wiederfindungs-Hinweis, und zusätzliche Suchordner erst, wenn der Index sie nachweislich braucht ([ADR-v9-188](04-Entscheidungslog.md#adr-v9-188); der Ordner-Zugang selbst ist Kategorie A oben). Reist über `app-data.json` — [§2.3](#23-geräteübergreifende-mitnahme-des-app-privaten-zustands).
- **B2 — baumgebunden** (identifiziert über **datei-lokale** GEDCOM-Ids): **nur noch die Projekte** ([12 §5](12-Forschungsdaten.md), `scope.personRefs`). Außerhalb ihres Bestands zeigen diese Ids auf fremde Personen — `@I1@` existiert in fast jeder Datei. Projekte bleiben app-privat, weil sie eine **Sicht** auf den Bestand sind und keine Aussage über ihn ([ADR-v9-117](04-Entscheidungslog.md#adr-v9-117)); die scharfe Kante wird nicht über eine Baum-Identität entschärft, sondern durch **Prüfung am Referenten**: jeder Personenbezug trägt einen Fingerabdruck (Name + Geburtsjahr), Nicht-Passendes wird beim Auswerten ignoriert ([12 §5](12-Forschungsdaten.md), [ADR-v9-176](04-Entscheidungslog.md#adr-v9-176)). **Damit reist B2 in derselben `app-data.json` mit** — ohne Baum-Schlüssel, weil ein fremder Scope dort wirkungslos ist statt falsch.
- **Der Dublettenausschluss ist KEIN app-privater Zustand mehr** ([ADR-v9-174](04-Entscheidungslog.md#adr-v9-174)): „diese beiden Datensätze sind nicht dieselbe Person" ist eine Aussage **über die Datensätze** und gehört dorthin, wo sie leben — als abgelehnte Identitäts-Hypothese in die Genealogie-Datei ([12 §4](12-Forschungsdaten.md)). Dort sind die Ids per Konstruktion gültig, der Befund reist mit der Datei und braucht weder Schlüssel noch Sync. **Die allgemeine Form dieser Frage:** Zustand, der Datei-Ids referenziert, gehört zuerst auf die Probe „Aussage über den Bestand oder Sicht auf ihn?" — und erst bei „Sicht" nach Kategorie B.

**Nicht persistiert — Proband-ID:** eine benutzerabhängige Ansichtswahl (welcher Ast gerade interessiert), weder Baum-Eigenschaft noch Geräte-Zustand. Bewusst **transienter Session-Zustand** (keine Kategorie A/B, kein Sync); Default beim Dateistart ist das Individuum mit der kleinsten ID ([ADR-v9-135](04-Entscheidungslog.md#adr-v9-135)).

### 2.3 Geräteübergreifende Mitnahme des app-privaten Zustands

Der app-private Zustand der Klasse B reist über **dasselbe Muster wie `orte.json`** ([14 §6](14-Dateihandling.md), [§4](#4-multi-device-konfliktschutz-lp-9)) — kein neuer Sync-Mechanismus, kein Cloud-Adapter, kein Eintrag in die Genealogie-Datei (LP-1 unberührt). Die Analogie trägt genau so weit, wie sie hier steht: `orte.json` ist geräte- **und** stammbaumübergreifend (LP-4), und `app-data.json` ist es deshalb auch. Die Schranke lautet nicht „keine GEDCOM-Ids", sondern **„keine ungeprüften GEDCOM-Ids"** ([ADR-v9-176](04-Entscheidungslog.md#adr-v9-176)): der Merge kennt keinen Datei-Kontext, deshalb muss ein baumgebundener Abschnitt seine Bezüge selbst prüfbar machen — die Projekte tun das über den Fingerabdruck am Personenbezug ([§2.2](#22-app-privater-zustand-geräteweit-in-indexeddb-reist-nicht-mit-der-genealogie-datei)):

- Ein geräteweiter **IDB-Spiegel** (Wahrheit zur Laufzeit) plus ein optionaler **Datei-Ein-/Ausgang** (`app-data.json`) im Sync-Ordner über dasselbe `FileService`-Adapter-Muster ([14 §4](14-Dateihandling.md)) — eigenes FS-Handle, **explizite** Export-/Import-Aktion, kein stiller Schreib-Sync pro Mutation (Tier-2-Share-Sheet-Spam).
- Konflikterkennung/-auflösung wie bei `orte.json`: `_rev`/`_device`/`_ts`-Wrapper, Drei-Wege-Merge gegen den gemeinsamen Vorfahren, Union bei disjunkten Änderungen ([§4](#4-multi-device-konfliktschutz-lp-9)). Keine neue Plattform-Verzweigung (INV-FILE-3).
- **Die Merge-Einheit richtet sich nach der FORM des Abschnitts.** B1 besteht aus Singletons (eine Regel-Konfiguration, eine Export-Vorwahl) — ein „beide Seiten bleiben erhalten" gibt es dort nicht, es stehen keine zwei Objekte nebeneinander; dort ist die Merge-Einheit der **Abschnitt**. Ändert nur eine Seite einen Abschnitt, gewinnt sie (das ist die Union bei disjunkten Änderungen); ändern beide denselben Abschnitt unterschiedlich, gewinnt die lokale Fassung **mit benanntem Hinweis**, statt still überschrieben zu werden. Dieselbe bewusste Grenze wie beim `shortName` ([ADR-v9-116](04-Entscheidungslog.md#adr-v9-116)), eine Ebene gröber.
- **Ein Abschnitt, der eine SAMMLUNG trägt, mergt dagegen je Objekt** — die Singleton-Begründung trifft auf ihn nicht zu: zwei Geräte, die je ein eigenes Projekt anlegen, haben keinen Konflikt, sondern zwei Projekte. Dafür gilt unverändert die id-gekeyte Politik von `orte.json` ([§4](#4-multi-device-konfliktschutz-lp-9)), aus einem gemeinsamen Modul, nicht als zweite Kopie derselben Regel ([ADR-v9-176](04-Entscheidungslog.md#adr-v9-176)). Betroffen ist bislang genau ein Abschnitt: die Projekte.
- **Baumgebundene Abschnitte tragen keinen Baum-Schlüssel**, sondern machen ihre Bezüge selbst prüfbar (Fingerabdruck am Referenten, [§2.2](#22-app-privater-zustand-geräteweit-in-indexeddb-reist-nicht-mit-der-genealogie-datei)). Ein Schlüssel verlangte eine Baum-Identität, die es nicht gibt, und scheiterte still an der Id-Neuvergabe durch Fremdwerkzeuge; die Prüfung am Referenten deckt beides ab.

---

## 3. Medien-Pfad-Modell

`media.file` = relativer Pfad bezogen auf den Datei-Ordner (den Sync-Ordner) — **oder** ein eingebetteter `data:`-URI **oder** ein Weblink; welches davon, entscheidet eine Klassifikation, nicht die jeweilige Anzeigestelle ([ADR-v9-187](04-Entscheidungslog.md#adr-v9-187)). Auflösung relativer Pfade: Desktop via optionalem Directory-Handle (FS-Access) direkt; sonst expliziter Import + IDB-Cache (`img:<relPath>`, hält verkleinerte Vorschauen). Weblinks werden **verlinkt, nie geladen** (LP-2/CSP). Kein OneDrive-`downloadUrl`-Fetch. Detail: [14 §7](14-Dateihandling.md).

---

## 4. Multi-Device-Konfliktschutz (LP-9)

- **`orte.json`:** Wrapper mit `_rev`/`_device`/`_ts`; gleiche Revision + verschiedenes Device + abweichender Inhalt → Union-Merge + Warn-Toast. Höhere `_schemaVersion` als bekannt → Read-Only-Schreibstopp ([11 §2](11-Orte-Hoefe-Identitaet.md)). Die Konflikterkennung bleibt, egal ob Sync per OS-Ordner oder optionalem Cloud-Adapter läuft.
- **Genealogie-Datei:** Konflikte sind **OS-Konflikte** des Sync-Ordners („Datei (Konflikt).ged"), nicht App-Sache. Milderung beim Öffnen: Hinweis, wenn Disk-Timestamp neuer als Arbeitskopie ([14 §5](14-Dateihandling.md)). App-verwaltetes ETag/If-Match entfällt (war OneDrive-Graph, [03 §9](03-Altlasten.md)).

---

## 5. Speicher-/Backup-Verhalten (Zusammenfassung)

Zwei Save-Tiers, an einer Stelle gekapselt ([14 §4](14-Dateihandling.md)):

```
Speichern (exportToFile):
  Tier 1 (Desktop Chrome/Edge, Android): FileSystemFileHandle.createWritable()  → in-place
  Tier 2 (iOS/Safari, Firefox):          navigator.share({files}) | <a download>

Jederzeit still:  saveWorkingCopy(text) → IndexedDB
Start:            loadWorkingCopy() → Auto-Load; FS-Handle aus IDB, Permission-Reprompt
```

Timestamp-Backup nur **optional/explizit** (nicht bei jedem Save). Anonymisierter/Strict/GED7-Export: nie in-place (Suffix am Dateinamen), Original unberührt.
