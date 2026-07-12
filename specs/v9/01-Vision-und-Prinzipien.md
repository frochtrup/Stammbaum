# 01 — Vision & Prinzipien

> Schicht: Meta · gilt dokumentübergreifend · keine Abhängigkeiten

---

## 1. Produktvision

Ein Genealogie-Editor als Progressive Web App. Läuft vollständig im Browser — keine Installation, kein App Store, kein Server, keine Cloud-Pflicht.

**Zielgruppe:** Ambitionierte Hobby-Genealogen, die **mobil** (Archiv/Feldarbeit: schnelle Erfassung, Forschungsaufgaben, Fotos) *und* am **Desktop** (Quellenarbeit, Auswertung, Ausgaben) arbeiten.

**Kernversprechen (Alleinstellungsmerkmale, die erhalten bleiben müssen):**
- **Verlustfreie GEDCOM-Treue** — verifizierbarer Roundtrip (`net_delta=0`). Technische Kernstärke und Existenzgrund gegenüber verlustbehafteten Konkurrenten.
- **Lokal-First & Datenschutz** — keine Datenweitergabe, kein Tracking, kein Cloud-Zwang, DSGVO-konforme Export-Anonymisierung.
- **Plattformübergreifend** — dieselbe App auf iPhone/iPad/Mac/Windows/Android.
- **GRAMPS-Brücke** — GRAMPS XML als vollwertiges Zweitformat (read+write).
- **Historisch datierte Ortsdarstellung** — periodengerechte Auflösung von Ortsnamen, Verwaltungszugehörigkeit und Hofadressen (im Markt einzigartig).
- **Forschungsprozess** — Protokoll, Aufgaben (Kanban), Evidenzbewertung, Hypothesen (GPS), Projekte, Validierung.
- **Reiche Ausgaben** — Karten, Zeitleiste, Story, Diagramme, Druck-/Buchformate.

**Fünf Priorisierungs-Dimensionen:** Stabilität · Datenschutz · Mobil · Forschungsqualität · Ausgaben.

---

## 2. Leitprinzipien (harte Constraints)

Akzeptanzkriterien für jede Änderung. Der Neuaufsatz wählt die *technische Umsetzung* frei, muss aber diese *Eigenschaften* garantieren.

**LP-1 — Roundtrip-Integrität ist unverhandelbar.**
Parse → Edit → Write → Parse muss stabil sein: `out1 === out2` und `net_delta = 0` gegenüber der Ur-Quelle (bei idempotenten Speichervorgängen). Jede bewusste Abweichung (HEAD-Rewrite, Anonymisierung) ist explizit dokumentiert. Kein unbekanntes Feld darf verloren gehen (Passthrough-Prinzip, [13](13-Interop-Roundtrip.md)).

**LP-2 — Lokal-First.**
Vollständig funktionsfähig ohne Netzwerk und ohne Server. Alle Nutzerdaten lokal (Datei + Browser-Arbeitskopie). Geräte-Sync macht das OS (Sync-Ordner), nicht die App; ein optionaler Cloud-Adapter ([14 §5](14-Dateihandling.md)) ist möglich, nie Voraussetzung.

**LP-3 — Datei ist die Wahrheit für Genealogie.**
Genealogische Inhalte leben in der GEDCOM-/GRAMPS-Datei. App-interne Ableitungen (Auflösungsergebnisse, Caches) werden nicht in die Datei geschrieben, wenn sie deterministisch re-derivierbar sind.

**LP-4 — Cross-Stammbaum-Wissen ist getrennt.**
Orts-/Hofwissen über eine einzelne Datei hinaus (Koordinaten, historische Namen, Verwaltungshierarchie) lebt in separatem, geräteübergreifend synchronisiertem Speicher (`orte.json`), **niemals** redundant in der Genealogie-Datei.

**LP-5 — Determinismus statt Persistenz.**
Wo ein Ergebnis reine Funktion über vorhandene Eingaben ist (z. B. Event→Ort-Zuordnung), wird es beim Laden neu berechnet statt gespeichert. Re-Derivation *ist* die Persistenz. Keine Sidecar-Dateien, keine Custom-Tags für re-derivierbare Fakten.

**LP-6 — Sichtbarkeit von Ungewissheit.**
Genuine Mehrdeutigkeit / fehlendes Wissen wird sichtbar gemacht (Review-Workflows), nicht durch stille Heuristik verdeckt. „Schreibe streng, lies tolerant."

**LP-7 — Mobile-First, aber Desktop-vollwertig.**
Bedienung primär für Touch/Portrait; Desktop bietet zusätzliche Dichte (Zweispalten, Tastatur, mehr Baum-Ebenen), nie weniger.

**LP-8 — Barrierefreiheit & Sicherheit als Baseline.**
WCAG 2.1 AA (0 Violations) über alle Ansichten — vollständige Tastaturbedienbarkeit, Screenreader-Beschriftung aller interaktiven Elemente, Respekt vor `prefers-reduced-motion`, Kontrast AA in Light- und Dark-Mode. CSP ohne `unsafe-inline`/`eval`. Konsequentes Escaping aller Nutzerstrings. Keine Information nur über Farbe. Konkretisiert in [30 NFR-5](30-NFR-und-Persistenz.md), operationalisiert auf Mechanismus-Ebene in [21 §6i](21-UI-UX.md), Test-Gate [32 TST-15](32-Testframework.md).

**LP-9 — Kein Datenverlust bei Multi-Device.**
Gleichzeitige Bearbeitung auf mehreren Geräten darf nicht zu stillem last-write-wins-Verlust führen. Für `orte.json`: Erkennung per Revision/Device → Union-Merge ([11 §2](11-Orte-Hoefe-Identitaet.md)). Für die Genealogie-Datei: Konflikte sind OS-Konflikte des Sync-Ordners; Milderung per Disk-Timestamp-Hinweis beim Öffnen ([14 §5](14-Dateihandling.md)).

---

## 3. Systemkontext & Plattformen

**Betriebsmodell:** Statisch ausgelieferte Web-App (z. B. GitHub Pages). Keine serverseitige Logik. HTTP/2-Auslieferung vorausgesetzt (kein Bündelungszwang aus Performance-Gründen).

**Unterstützte Umgebungen (verifiziert in v8):**

| Plattform | Browser | Laden | Speichern (Save-Tier, [14](14-Dateihandling.md)) |
|---|---|---|---|
| iPhone/iPad iOS 17+ | Safari, Chrome | ✅ | Tier 2: Share-Sheet → „In Dateien sichern" |
| macOS | Safari | ✅ | Tier 2: Share-Sheet / Download |
| macOS | Chrome/Edge | ✅ | Tier 1: in-place (FS-Access) |
| macOS | Firefox | ✅ | Tier 2: Download |
| Windows/Android | Chrome/Edge | ✅ | Tier 1: in-place (FS-Access) |

**Externe Abhängigkeiten (alle optional / lokal gebündelt):**
- **Geräte-Sync** — über OS-Sync-Ordner (iCloud/OneDrive-Ordner), *nicht* app-verwaltet ([14](14-Dateihandling.md)). Optionaler Cloud-Adapter später möglich.
- **Nominatim (OSM)** — Geocoding (opt-in, Einzel + Batch).
- **GOV (gov.genealogy.net)** — historische Verwaltungszugehörigkeiten.
- **Kartenkacheln (OSM)** — Kartenansicht.
- **Kartenbibliothek** — lokal ausgeliefert (kein CDN).

Alle externen Aufrufe sind nutzerausgelöst und für den Kern-Workflow entbehrlich (LP-2).

---

## 4. Nicht-Ziele (out of scope)

Bewusste Abgrenzungen, die auch der Neuaufsatz nicht anstrebt:
- **DNA-Integration** (kategoriefremd).
- **Online-Matching / Record-Hints** (Ancestry/MyHeritage-Domäne).
- **Echtzeit-Kollaboration / Multi-User** (CRDT/Server — bricht Lokal-First).
- **3D-Baum** (MacFamilyTree-Nische).
- **Server-Backend** jeglicher Art für den Kern-Workflow.
- **Zwei-Schichten-Evidenz / Alternativ-Bäume** mit widersprüchlichen Faktenversionen (würde Roundtrip-Treue brechen; Hypothesen bleiben leichte Annotation, [12](12-Forschungsdaten.md)).

Optionale Zukunfts-Kandidaten (nicht Teil des Kern-Neuaufsatzes): Pedigree-Collapse/Inzuchtkoeffizient, historische Kartenlayer, LLM-gestützte Story (opt-in, anonymisiert), OCR (opt-in).

---

## 5. Glossar

| Begriff | Bedeutung |
|---|---|
| **PlaceObject / Ort** | Verwaltungseinheit (Dorf, Stadt, Pfarrei …) mit datierter Namens- und Hierarchie-Historie. |
| **HofObject / Hof** | Eigenständige Wohn-/Wirtschaftseinheit innerhalb eines Dorfes, mit datierten Adressvarianten und eigenem Lebenszyklus. |
| **Projektion** | Der periodengerecht (für ein Jahr) aufgelöste `place`/`addr`-String, abgeleitet aus dem Modell. Nie eigene Wahrheit. |
| **Reprojektions-Invariante** | `event.place` ist bei gesetztem `placeId/hofId` nur Projektions-Cache; Anzeige und Writer leiten live ab. |
| **Identitätsauflösung / Link-Pass** | Die deterministische Funktion, die Events beim Laden Orten/Höfen zuordnet ([11](11-Orte-Hoefe-Identitaet.md)). |
| **Passthrough** | Verbatim-Erhalt unbekannter Datei-Konstrukte für verlustfreien Roundtrip. |
| **Roundtrip** | Parse→Edit→Write→Parse; Ziel `out1===out2`, `net_delta=0`. |
| **QUAY** | GEDCOM-Zuverlässigkeitsgrad 0–3 pro Zitat. |
| **Evidenzmodell** | 3-Achsen-Bewertung (Quellentyp/Information/Evidenz) pro Zitat, unabhängig von QUAY. |
| **Hypothese** | Statusbehaftete genealogische Annahme (offen/bestätigt/verworfen) mit Konfidenz und Evidenz-Refs. |
| **Konvention 1/2/3** | Quell-Schreibweisen von Hof+Ort (Ancestris / MyHeritage-GRAMPS / atomar), die die Auflösung unterscheidet. |
| **orte.json** | Cross-Stammbaum-Speicher für Orts-/Hofwissen mit Konflikterkennung. |
| **Proband** | Konfigurierbare Startperson der Baumansicht. |
| **Kekule** | Ahnentafel-Nummerierung (Proband=1, Vater=2, Mutter=3 …). |
| **Chokepoint** | Definierte reine Query-Funktion, über die die UI den Kern liest ([02 §3](02-Zielarchitektur-v9.md)). |
| **Imperative Insel** | SVG-lastige Ansicht, die framework-frei in einem Container gerendert wird ([02 §5](02-Zielarchitektur-v9.md)). |
