# 22 — Orte-Editor (Standalone)

> Schicht: App · Abhängig von: [11 Orte/Höfe](11-Orte-Hoefe-Identitaet.md), [14 Dateihandling](14-Dateihandling.md), [21 UI/UX](21-UI-UX.md), [02 Zielarchitektur](02-Zielarchitektur-v9.md) · Wird gelesen von: [31 Dev-Umgebung](31-Dev-Umgebung.md), [32 Testframework](32-Testframework.md)

Ein zweites, eigenständig aufrufbares Programm: ein Editor für die Datei `orte.json`
([14 §6](14-Dateihandling.md)). Er lädt eine Ortsdatei, bearbeitet sie — einschließlich
GOV-Übernahme, Dubletten und Zusammenführen — und speichert sie zurück. Er baut auf
denselben Bausteinen wie das Hauptprogramm; abweichen darf er nur dort, wo die Abweichung
benannt ist.

Das Fachliche steht **nicht** hier: Orts- und Hof-Modell, Identitätsauflösung, Kuration
und Massen-Dedup sind in [11](11-Orte-Hoefe-Identitaet.md) spezifiziert, die
Bedienflächen in [20 §1.7/§1.8](20-Funktionen.md). Dieses Dokument beschreibt, was den
Editor vom Hauptprogramm unterscheidet: seine Gestalt als Programm, seinen Vertrag zur
geteilten Oberfläche, sein Dokument-Modell und seine Auslieferung.

---

## 1. Zweck und Abgrenzung

`orte.json` ist **Cross-Stammbaum-Wissen** ([11 §2](11-Orte-Hoefe-Identitaet.md)): der
Orts- und Hofbestand gilt über die einzelne Genealogie-Datei hinaus. Ihn zu pflegen ist
eine eigene Tätigkeit mit eigenem Rhythmus — sie braucht weder eine geladene
Genealogie-Datei noch die übrige Programmoberfläche.

Der Editor ist deshalb **dateizentriert**: sein Dokument ist die Ortsdatei, wie das
Dokument eines Texteditors seine Textdatei ist. Er schreibt **nie** eine
Genealogie-Datei.

**Nicht-Ziele:** kein Personen-, Familien-, Quellen- oder Medien-Zugang; keine
Diagramm-Linsen; kein Ereignis-Editor; keine zweite Fachlogik für Orte — jede
Auflösungs-, Kurations- und Dedup-Regel kommt unverändert aus `core/places`.

---

## 2. Programmgestalt

Der Editor lebt im selben Quellbaum wie das Hauptprogramm und ist dort ein **zweiter
Einstiegspunkt**:

```
~/dev/stammbaum-v9/
├── app/                     ← Hauptprogramm
├── app-orte/                ← Orte-Editor
│   ├── index.html
│   ├── vite.config.ts       eigene Konfiguration, im Editor-Baum
│   ├── main.ts
│   ├── OrteApp.svelte       Schale: Kopfzeile · Orte|Höfe · Liste ↔ Detail
│   ├── orte-state.svelte.ts PlacesHost-Implementierung + Undo/Redo
│   ├── orte-doc.ts          Dokument-Lebenszyklus
│   └── public/              Manifest, Symbol, ausgeliefertes Handbuch
├── ui/shell/places-host.ts  ← der geteilte Vertrag (§3)
└── ui/views/place|hof       ← geteilt, von beiden Programmen unverändert genutzt
```

Ein Quellbaum, ein Testlauf, eine CI: eine Änderung an den geteilten Bausteinen wirkt in
beiden Programmen sofort, ohne Versionsstand und ohne Abgleichschritt. Die
Vite-Konfiguration des Editors liegt in seinem eigenen Verzeichnis — sein Bau-Wissen
bleibt bei ihm.

**Konfiguration:** eigenes `root` (`app-orte/`), `base` `/stammbaum-v9/orte/` nach
derselben command-abhängigen Regel wie das Hauptprogramm ([31 §5](31-Dev-Umgebung.md)),
`outDir ../dist/orte` mit `emptyOutDir: false`, damit beide Programme in dasselbe
Auslieferungsverzeichnis bauen. Das CSP-Plugin und die Richtlinie
([30 NFR-3](30-NFR-und-Persistenz.md)) gelten unverändert, einschließlich der Freigabe für
Nominatim (Geocoding auf Nutzeraktion). `gov.genealogy.net` bleibt draußen — die
GOV-Übernahme arbeitet auf eingefügtem Text, nicht über das Netz.

---

## 3. Wiederverwendung: der `PlacesHost`-Vertrag

Die Orts- und Hof-Oberfläche (`ui/views/place`, `ui/views/hof`) ist von beiden Programmen
geteilt. Ihre Bindung an das jeweilige Programm läuft über **einen schmalen Vertrag**, den
beide erfüllen — nicht über die Zustandsschale des Hauptprogramms:

```ts
// ui/shell/places-host.ts
interface PlacesHost {
  readonly db: Database;
  readonly placeContext: PlaceContext;
  readonly caps: PlacesHostCaps;

  savePlace(model) · saveHof(model) · updateHofAddr(hofId, index, value, from, to)
  deletePlace(id)  · deleteHof(id)
  mergePlace(survivorId, mergedIds) · mergeHof(survivorId, mergedIds)
  importGovEntry(placeId, rawText)
  linkEventToPlace(event, placeId)  · linkEventToHof(event, hofId, villageId?)
}

interface PlacesHostCaps {
  hasEventContext: boolean;   // Referenz-Sichtbarkeit, Review, Zeitgenossen, Verwendungszahl
  canEditEvents: boolean;     // „Quelle schärfen" führt in einen Ereignis-Editor
  canNavigateToLens: boolean; // Sprung in Karte/Zeitleiste
}

interface PlacesNav { getCurrent(target) · setCurrent(target, id) }
```

Der Vertrag ist die Naht aus [02 §3](02-Zielarchitektur-v9.md), eine Ebene höher gezogen:
Lese-Chokepoint (`db`, `placeContext`) plus Kommandos mit vollständigen Objekten. Er ist
bewusst klein und bleibt es.

> **INV-ORTE-1:** Beide Programme nutzen die Orts-/Hof-Views **unverändert**. Eine
> Abweichung im Verhalten ist eine benannte Fähigkeit in `PlacesHostCaps` — nie eine
> kopierte, abgezweigte oder programm-eigene Komponente.

Zwei Gates halten das, statt es zu vereinbaren: `check:arch` verbietet den Import der
Zustandsschale des Hauptprogramms in `ui/views/place`/`ui/views/hof`, und ein Fork-Guard
verbietet in `app-orte/` jede Datei, deren Basisname in diesen Verzeichnissen existiert.

### 3.1 Die sechs Fähigkeits-Abweichungen

| # | Fläche | Ohne Ereignis-Kontext | Fähigkeit |
|---|---|---|---|
| D1 | Referenz-Sichtbarkeit „Ohne Bezug" ([11 §9.3](11-Orte-Hoefe-Identitaet.md)) | entfällt; die Hauptliste zeigt alle Objekte | `hasEventContext` |
| D2 | Zuordnungen prüfen, Klassen A/C/D/P ([11 §6](11-Orte-Hoefe-Identitaet.md)) | entfällt | `hasEventContext` |
| D3 | Ortszeitgenossen und Hof-Bewohner | entfällt | `hasEventContext` |
| D4 | Gewinner-Vorschlag im Dedup: erste Stufe Verwendungszahl ([11 §9.2](11-Orte-Hoefe-Identitaet.md)) | wirkungslos; die Heuristik beginnt bei den Koordinaten | `hasEventContext` |
| D5 | „Quelle schärfen" → Ereignis-Editor | entfällt; der Editor schreibt keine Genealogie-Datei | `canEditEvents` |
| D6 | Sprung in Karte-/Zeitleisten-Linse | entfällt; die Kartenvorschau im Steckbrief bleibt | `canNavigateToLens` |

D1 verdient eine eigene Begründung: ohne Ereignisse ist „referenzlos" für **jedes** Objekt
wahr. Der Filter wäre nicht falsch, sondern bedeutungslos — deshalb entfällt er, statt
leer angeboten zu werden.

---

## 4. Dokument-Modell

> **INV-ORTE-3:** Der Zustand des Editors ist die geladene Datei plus die Änderungen seit
> dem letzten Speichern. Es gibt keinen zweiten dauerhaften Speicher; der
> Absturz-Entwurf ist Wiederherstellung, nie Quelle.

Zustände: **kein Dokument → geladen → geändert → gespeichert.**

- **Öffnen** über eine eigene `PickerAdapter`-Instanz — getrennt von jedem
  Genealogie-Datei-Zustand ([14 §6](14-Dateihandling.md)). Der Text wird als
  `PlacesFileWrapper` geparst; eine fremde oder beschädigte Datei erzeugt eine klare
  Meldung, keinen stillen Absturz.
- **Neu** legt ein leeres Dokument an. Der Editor ist ohne Datei startbar.
- **Speichern** serialisiert mit `rev + 1`, der eigenen Gerätekennung und einem
  Zeitstempel und läuft durch dasselbe Export-Rohr wie jede andere Ausgabe
  (INV-FILE-2/-3): in dieselbe Datei zurück, wenn ein Datei-Handle vorliegt, sonst über
  Teilen/Download. Das Revisions- und Geräte-Protokoll aus
  [30 §4](30-NFR-und-Persistenz.md) wird damit gepflegt: eine im Editor bearbeitete Datei
  erscheint dem Hauptprogramm beim Import als Stand eines anderen Geräts und läuft durch
  den regulären Union-Merge.
- **Schema-Gate:** eine höhere `schemaVersion` als die bekannte schaltet das Dokument in
  einen Nur-Lese-Modus ([11 §2](11-Orte-Hoefe-Identitaet.md)).
- **Änderungsmarke** in der Kopfzeile; das Verlassen mit ungespeicherten Änderungen wird
  angekündigt.
- **Absturz-Entwurf:** ein entprellter Zwischenstand in IndexedDB, beim Start zur
  Wiederherstellung angeboten, beim erfolgreichen Speichern verworfen. Er bumpt keine
  Revision, nimmt an keinem Merge teil und ist für das Hauptprogramm unsichtbar.
- **Undo/Redo** über den geteilten Undo-Stapel auf Schnappschüssen von
  `{placeObjects, hofObjects}`.

---

## 5. Kontextdatei

Zusätzlich zum Dokument kann eine Genealogie-Datei (GEDCOM oder GRAMPS) **nur lesend**
geladen werden. Mit ihr setzt `caps.hasEventContext` auf wahr, und die vier
ereignisabhängigen Flächen aus §3.1 arbeiten wie im Hauptprogramm: Referenz-Sichtbarkeit,
Zuordnungs-Review, Zeitgenossen und der verwendungsbasierte Gewinner-Vorschlag.

> **INV-ORTE-2:** Das Laden einer Kontextdatei verändert das Dokument nicht — nachweisbar
> durch Vergleich der serialisierten Fassung vor und nach dem Ladevorgang.

Das ist keine Selbstverständlichkeit, sondern eine Anforderung an den Ladepfad: der
Village-Seed-Vorpass ([11 §4.2](11-Orte-Hoefe-Identitaet.md) Schritt 0) legt fehlende
Orte an, und der Hof-Bootstrap (Pfade C/B′) legt Höfe an. Beides wäre im Editor ein
stiller Schreibvorgang auf das Dokument des Nutzers. Zwei Vorkehrungen zusammen tragen die
Invariante:

1. Die Auflösung läuft mit **übersprungenem Seed**.
2. Sie arbeitet auf **Kopien** der Orts- und Hofmengen. Übernommen werden ausschließlich
   die Ereignis-Verknüpfungen, und davon nur die, die auf ein im Dokument vorhandenes
   Objekt zeigen; im Bootstrap entstandene Objekte werden verworfen.

---

## 6. Bedienoberfläche

Die Schale ist bewusst klein: **Kopfzeile** (Dateiname, Änderungsmarke, Öffnen, Neu,
Speichern, Kontextdatei, Undo/Redo, Handbuch), **zwei Segmente** Orte | Höfe, darunter die
geteilte Liste-/Detail-Fläche. Keine Bottom-Navigation, keine Linsen-Umschaltung, kein
Dashboard.

**Zwei Fenster ab der Layout-Grenze, eines darunter** (Spec 21 §3, dieselbe Grenze und
derselbe Mechanismus wie im Hauptprogramm — der Formfaktor wird an genau einer Stelle
entschieden). Oberhalb steht die Liste dauerhaft links neben dem Steckbrief; darunter
ersetzt der Steckbrief die Liste und trägt den Rückweg „← Zur Liste".

Das ist keine Layout-Vorliebe, sondern trägt zwei Dinge: Ortskuration ist
**Vergleichsarbeit** — Schreibvarianten, Dubletten und Verwaltungsketten beurteilt man
nebeneinander, nicht nacheinander (anders als im Hauptprogramm, wo die Liste ein Index
zum Überfliegen ist). Und es macht die Voraussetzung wahr, unter der die geteilte
Kopfzeile ihren Rückweg oberhalb der Grenze weglässt: dort ist die Liste sichtbar. Eine
Fähigkeit „dieser Wirt hat keine Liste daneben" wäre die Alternative gewesen — sie hätte
eine Aussage über den Wirt getroffen, statt sie einzulösen.

Ein Werkzeug (Massen-Dedup) nimmt in beiden Formfaktoren die **ganze** Fläche: es ist
eine eigene Arbeitsfläche, keine Detailansicht neben der Liste.

Es gilt dasselbe Design-System und dasselbe Befehlsflächen-Budget wie überall
(INV-UI-11, [21 §6h](21-UI-UX.md)) — die Kopfzeile eines Ein-Dokument-Programms ist keine
Ausnahme davon, und das Maß bleibt die Spaltenbreite, nicht der Formfaktor. Alles, was
über die Datei-Befehle hinausgeht, lebt hinter der `FilterBar`-Disclosure der jeweiligen
Liste.

Der Editor bringt **keine** eigenen Listen-, Formular- oder Dialogmuster mit; er zeigt die
Komponenten des Hauptprogramms (INV-UI-4).

---

## 7. Auslieferung und Umgebungen

| Umgebung | Adresse | Zweck |
|---|---|---|
| Entwicklung | eigener Dev-Server (`dev:orte`) | Bau und Verifikation |
| Vorschau | `dist/orte/` über die lokale Vorschau | Prüfung des echten Bauergebnisses |
| Produktion | `…/stammbaum-v9/orte/` (GitHub Pages, von `main`) | eigenständig aufrufbares Programm |
| Staging | eigene Pages-Adresse aus `v9-dev` | Prüfung auf einem echten Gerät mit HTTPS vor `main` |

`npm run build` erzeugt **beide** Programme, `check:csp` prüft **beide** Einstiegsseiten.
Ein Bau, der nur das Hauptprogramm erfasst, ließe den Editor unbemerkt zurückfallen.

---

## 8. Handbuch

Der Editor liefert ein **eigenständig lesbares Handbuch** aus. Es entsteht durch
**Zusammenstellung**, nicht durch eine zweite Fassung: Quelle bleibt das eine
`HANDBUCH.html` des Hauptprogramms.

- **Kapitel 7 (Orte) und 8 (Höfe) bleiben unverändert dort, wo sie sind** und behalten
  ihren Rang im Hauptbuch. Sie sind zugleich der fachliche Hauptteil des Editor-Handbuchs.
- **Anhang E** trägt, was nur den Editor betrifft: Einstieg, Datei öffnen und speichern,
  Entwurfs-Wiederherstellung, Kontextdatei, Grenzen und Zusammenspiel mit dem
  Hauptprogramm. Er ist in zwei Abschnitte geteilt, damit der Einstieg im Extrakt vorn
  stehen kann, während er im Hauptbuch hinten steht.
- **Ein Attribut, zwei Werte:** `data-doc="app"` erscheint nur im Hauptbuch,
  `data-doc="orte"` nur im Editor-Handbuch, alles Unmarkierte in beiden. Wo ein Satz nur
  mit Verrenkung für beide Leser stimmt, wird er verdoppelt statt verbogen; im Zweifel
  gewinnt die Lesbarkeit des Hauptbuchs.
- **Ein Manifest** bestimmt Auswahl, Reihenfolge und Überschriften des Extrakts — aus
  „7. Orte" wird dort „2. Orte". Das ist der Unterschied zwischen einem Anhang und einem
  eigenen Handbuch.
- **Screenshots:** eine Variante `<name>.orte.png` gewinnt, falls vorhanden; sonst bleibt
  das geteilte Bild. Aufnahmen, die nur geteilte Komponenten zeigen, brauchen keine
  Variante.

Wächter des Extrakts: jede Manifest-Kennung existiert, jeder interne Anker im Extrakt löst
auf, und jedes `data-doc="orte"`-Element liegt in einem Abschnitt des Manifests —
andernfalls entstünde Editor-Prosa, die nie ausgeliefert wird.

---

## 9. Invarianten

| Invariante | Aussage | Prüfung |
|---|---|---|
| **INV-ORTE-1** | Geteilte Views unverändert; Abweichung nur als benannte Fähigkeit | `check:arch`-Regel + Fork-Guard (§3) |
| **INV-ORTE-2** | Kontextdatei verändert das Dokument nicht | Serialisierter Vergleich vor/nach dem Laden (§5) |
| **INV-ORTE-3** | Die Datei ist die einzige Wahrheit; der Entwurf ist nie Quelle | Dokument-Rundlauf + Verfall des Entwurfs beim Speichern (§4) |

Jede trägt einen eigenen Test (TST-2, [32 §1](32-Testframework.md)); der
Dokument-Rundlauf „laden → bearbeiten → speichern → erneut laden → identisch" ist das
Gegenstück zu `net_delta = 0` (LP-1) auf der Ortsdatei.
