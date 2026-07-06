# 20 — Funktionen

> Schicht: App · Abhängig von: [10](10-Domaenenmodell.md), [11](11-Orte-Hoefe-Identitaet.md), [12](12-Forschungsdaten.md), [13](13-Interop-Roundtrip.md) · Darstellung: [21 UI/UX](21-UI-UX.md)

Referenz-Katalog des erreichten v8-Umfangs. Prioritäten: **[K]**ern (muss), **[S]**tandard (soll), **[E]**rweitert (kann). Feature-Detail-Historie: `legacy-v8/ROADMAP.md` / `legacy-v8/CHANGELOG.md`.

---

## 1. Feature-Katalog

### 1.1 Navigation & Views
- **[K]** Rollenbasierte Navigation ([21 §1](21-UI-UX.md)): Entitäten · Ansichten (Lenses) · Arbeitsflächen. Mobile: Bottom-Nav **Baum · Personen · Suche · Aufgaben · Mehr** + Entitäts-Segment-Umschalter. Desktop: beschriftete Sidebar + Multi-Pane + Command-Palette (⌘K).
- **[K]** Einheitlicher Lens-Umschalter (Baum/Karte/Zeitleiste/Statistik/Story) statt verstreuter Diagramm-Toggles ([21 §4](21-UI-UX.md)).
- **[K]** History-Navigation (Zurück/Vorwärts, herkunftsbewusst), Swipe-Right auf Mobile.
- **[K]** Globale Suche (erstklassiges Ziel) über Personen/Familien/Quellen/Orte/Höfe, gruppierte Ergebnisse. **Nachtrag 2026-07-04 (ADR-v9-24):** Höfe waren in der ursprünglichen Aufzählung ausgelassen, obwohl Höfe im Orte-/Höfe-Tab ([§1.8](#18-höfe-tab)) ein gleichrangiges Entitäten-Segment sind — hiermit ergänzt.
- **[S]** Proband (Startperson) konfigurierbar; „Zum Probanden"-Navigation.

### 1.2 Laden & Speichern
- **[K]** GEDCOM lokal öffnen (iOS `accept="*/*"`, Chrome `showOpenFilePicker`).
- **[K]** GRAMPS XML öffnen (read+write).
- **[K]** Speichern über ein Export-Rohr, zwei Tiers: in-place (Desktop/Android FS-Access) · Share-Sheet/Download (iOS/Safari/Firefox). Details: [14](14-Dateihandling.md).
- **[K]** Auto-Load der Arbeitskopie beim Start (Absturz-Recovery, Offline).
- **[S]** Geräte-Sync über OS-Sync-Ordner (iCloud/OneDrive-Ordner) — App-verwaltete Cloud entfällt ([14 §5](14-Dateihandling.md)); optionaler Cloud-Adapter später möglich.
- **[K]** Offline-Betrieb (Service Worker + Manifest), Offline-Indikator.
- **[S]** Demo-Modus.
- **[S]** DSGVO-Export (Anonymisierung), GED7-Export, Strict-Export (je opt-in — [13](13-Interop-Roundtrip.md)).
- **[K]** Keyboard-Shortcuts (Speichern/Verwerfen/Escape/Baum-Zurück).
- **[K]** Undo/Redo (Snapshot-Stack, ≥30 Einträge); Fallback „Revert to Saved" bei leerem Stack.

### 1.3 Baum-Visualisierungen *(imperative Inseln — [02 §5](02-Zielarchitektur-v9.md))*
- **[K]** Sanduhr-Baum: bis 4 Vorfahren-Ebenen (Desktop) / 2 (Portrait) + Proband + Ehepartner + Kinder. Kekule-Nummern. Mehrfach-Ehen (`⚭N`), Halbgeschwister (`½`).
- **[K]** Geschwisterzeile des Probanden (Voll- und Halbgeschwister, aus den Kindern der Eltern-Familie(n) außer dem Proband selbst) — eigene Zeile neben/um den Proband, nicht nur die `½`-Markierung auf fremden Kindern. **Nachtrag 2026-07-04:** in der ersten Sanduhr-Bauabschnitt (ADR-v9-23) versehentlich als nicht explizit gelistet ausgelassen, obwohl v8 dies als Teil der Sanduhr hatte — hiermit nachträglich als [K] präzisiert.
- **[K]** Interaktion: Klick-Rezentrierung, Pinch-Zoom (0.3×–3×), Drag-Pan, Vollbild, Tastaturnavigation, Desktop Auto-Fit.
- **[S]** Nachkommen-Baum (top-down, Gen 2–7, Ehepartner/Geschwister, T-Linien).
- **[S]** Fan-Chart (konzentrische Halbkreis-Segmente, 3–6 Generationen).
- **[E]** Diagramm-Export als PNG; Großposter-SVG (A1, vektoriell).

### 1.4 Personen-Tab
- **[K]** Alphabetische Liste mit Buchstaben-Trenner, Geburts-/Sterbejahr + Ort.
- **[K]** Sortier-Umschalter Name ⇄ Geburtsdatum (ein Toggle, ersetzt die Buchstaben-Trenner-Gruppierung im Datum-Modus durch schlichte chronologische Reihenfolge).
- **[K]** Suche über Name/Titel/Ereignisse/Notizen/Religion (inkl. Namensvarianten, Soundex-Modus optional); erweiterte Filter: Geschlecht, Geburtsjahr-Bereich, Geburtsort (Textmatch auf Geburts-/Taufort), fehlende Felder (kein Sterbedatum · keine Quellen · keine Eltern).
- **[S]** CSV-Export der gefilterten Liste.
- **[K]** Detail: alle Ereignisse, Quellen-Badges `§N` (QUAY-Farbindikator), Geo-Links, Familien-Navigationszeilen — kompakte Zeilendarstellung (INV-UI-5, [21 §6a](21-UI-UX.md)). **Wesentliche Beziehungen vollständig sichtbar** (ADR-v9-30-Nachtrag 2026-07-06, Befund am echten Code: `person-detail-model.ts` zeigte bei der eigenen Familie bisher NUR den Ehepartner, keine Kinder): bei der eigenen Familie (`parentIn`) werden Ehepartner UND Kinder angezeigt, bei der Herkunftsfamilie (`childOf`) beide Eltern — alle Namen anklickbar (Cross-Tab-Navigation zur jeweiligen Person), kompakt dargestellt (INV-UI-5) statt eine Zeile je Kind.
- **[S]** Fotos (Upload, Lightbox, Hauptfoto), Medien-Verwaltung, Kamera-Schnellzugriff.

### 1.5 Familien-Tab
- **[K]** Liste (Elternpaar, Heiratsdatum, Kinderzahl), Detail mit anklickbaren Mitgliedern, Baum-Sprung.
- **[K]** Sortier-Umschalter mit drei Zuständen: Nachname Ehemann · Nachname Ehefrau · Heiratsdatum (fehlender Wert je Modus sortiert ans Ende). **Neuaufsatz-Hinweis:** v8 hatte hierfür nur feste Listenreihenfolge + Textsuche ohne Sortier-Umschalter — diese Zeile ist eine bewusste v9-Erweiterung über den erreichten v8-Umfang hinaus, analog zum Personen-Sortier-Umschalter ([§1.4](#14-personen-tab)) gebaut, kein Orakel-Befund.
- **[K]** Suche über Ehepartnernamen/Kindernamen/Ereignisse/Notizen; erweiterte Filter analog Personen-Tab: Heiratsjahr-Bereich, Heiratsort (Textmatch), fehlende Felder (kein Heiratsdatum · keine Quellen · keine Kinder).
- **[S]** CSV-Export der gefilterten Liste, Medien-Verwaltung.

### 1.6 Quellen-Tab & Archive
- **[K]** Liste (Kurzname, Autor, Datum, Referenzzähler), Suche, Detail mit allen referenzierenden Personen/Familien inkl. PAGE/QUAY.
- **[K]** Archive (Repository): Picker, Detail mit verlinkten Quellen, Signatur.

### 1.7 Orte-Tab *(Kern: [11](11-Orte-Hoefe-Identitaet.md))*
- **[K]** Automatische Sammlung aus allen Ereignissen; Typ-Badge, Koordinaten-Indikator, Typ-Filter.
- **[K]** Gruppen-Modus (String-Varianten unter PlaceObject-Titel), Admin-Filter (Verwaltungseinheiten ausblendbar).
- **[K]** Ort-Steckbrief: Ereignisse nach Typ, Quellen, Namens-Zeitstrahl (SVG), Mini-Karte, periodengerechte Verwaltungszeitlinie.
- **[K]** Bearbeitung: Name, Koordinaten, Typ, `pnames`, `enclosedBy` — **als EIN Bearbeitungs-Modus** (Bearbeiten-Button schaltet den gesamten Steckbrief auf editierbar um, analog Person/Familie [§2](#2-bearbeitung--formulare)). ALLE editierbaren Felder gehören hinter diesen einen Modus — **kein** Add/Remove-Control (auch nicht `pnames`/`enclosedBy`) darf außerhalb des Bearbeitungs-Modus sichtbar sein (ADR-v9-30, Befund an `PlaceDetail.svelte`: Namensvarianten- und Verwaltungszugehörigkeits-Sektion zeigten ihre Add/Remove-Controls bisher unabhängig vom Bearbeiten-Modus, Name/Koordinaten/Typ waren dagegen korrekt gegated).
- **[K]** String→PlaceObject verknüpfen (Re-Import-Erkennung erhält Identität über Roundtrip).
- **[K]** **Automatischer Orts-Seed beim Import** (ADR-v9-28, ersetzt den Opt-in-Vorschlag ADR-v9-27): beim Laden werden Village-PlaceObjects automatisch aus den distinkten PLAC-Hierarchien der Ereignisse erzeugt ([11 §4.2 Schritt 0](11-Orte-Hoefe-Identitaet.md)) — Orte sind nach *jedem* GEDCOM-Import sofort sichtbar, ohne Nutzeraktion. Anfängliche PLAC-Inkonsistenz ist akzeptiert und wird nachgelagert bereinigt (Dubletten-Merge + String→PlaceObject-Verknüpfung, [11 §2](11-Orte-Hoefe-Identitaet.md)). Höfe bleiben den Hof-Bootstrap-Pfaden vorbehalten (nicht auto-geseedet).
- **[K]** Dubletten-Merge (verlustfrei, Herkunfts-Pille) — Kurations-Gegenstück zum automatischen Orts-Seed: führt Schreibvarianten desselben Orts zusammen.
- **[S]** Nominatim-Geocoding (Einzel + Batch), GOV-Import (historisch datiert), Geo-Plausibilitäts-Validator, JSON-Import/Export mit Dedup + Multi-Device-Konflikterkennung.

### 1.8 Höfe-Tab *(Kern: [11](11-Orte-Hoefe-Identitaet.md))*
- **[K]** Hof-Liste (aus Events aufgelöst, numerisch sortiert), Detail mit Bewohnern chronologisch.
- **[K]** Hof-Bearbeitung (Adressvarianten, Koordinaten, Notiz, Lebenszyklus) — gleiche Anzeige/Bearbeitung-Trennung wie beim Orte-Tab (analog [§1.7](#17-orte-tab), ADR-v9-30).
- **[K]** „Hof-Zuweisungen prüfen"-Review (Klassen A/C/D — [11 §6](11-Orte-Hoefe-Identitaet.md)).

### 1.9 Karte
- **[S]** Interaktive Karte (3 Modi: Orte · Personen-Cluster · Migrationen nach Epoche eingefärbt/animiert). *Imperative Insel.*

### 1.10 Zeitleiste & Story
- **[S]** Zeitleiste (Swim-Lane + Dekaden-Modus, Mehrpersonen bis 5, historische Ereignisse als Kontext). *Imperative Insel.*
- **[E]** Story-Modus (Personen-/Familien-Biografie aus Event-Templates + Epochen-Kontext, Karte, Download).

### 1.11 Forschung *(Modell: [12](12-Forschungsdaten.md))*
- **[K]** Aufgaben-Tab mit Badge, Kanban-Status, Kategorien, globale Liste, MD-Export.
- **[S]** Forschungsprotokoll (RLOG), Evidenzbewertung pro Zitat, Hypothesen (GPS), Projekte mit Scope-Filter.
- **[S]** Qualitäts-Dashboard (Ampel, Lückenradar, Brennpunkte, Lücke→Aufgabe).

### 1.12 Datenprüfung
- **[K]** Validierung auf Knopfdruck (RAM-Bericht, keine automatischen Aufgaben), Befund→Aufgabe-Button, Schweregrade, konfigurierbar (§3).

### 1.13 Werkzeuge
- **[S]** Duplikat-Erkennung (Levenshtein-Scoring, Merge-Modal), Import-Vergleich (2-Panel Merge-Assistent), Beziehungsrechner (BFS, gemeinsamer Vorfahre, Cousin-Grade), Beziehungen modellieren (+Ehepartner/+Kind/+Elternteil).

---

## 2. Bearbeitung & Formulare

Formulare als Bottom-Sheets (Mobile) / Panels (Desktop) mit progressiver Offenlegung. In v9 gehören sie in die **reaktive Schale** ([02 §2](02-Zielarchitektur-v9.md)); Speichern läuft über Kommandos (`savePerson(model)` …), nicht über DOM-Lesen ([02 §3.2](02-Zielarchitektur-v9.md)).

| Entität | Felder |
|---|---|
| Person | Name (Vor-/Nachname, Präfix, Suffix, Rufname), Geschlecht, Titel, Religion, Notiz, RESN, E-Mail, Website |
| Ereignis | Typ, Datum (Qualifier + 3 Felder), Ort (Freitext oder 6-Felder), Adresse (RESI), Todesursache (DEAT), Quellen + Seite + QUAY (+ Evidenz-Achsen) |
| Familie | Eltern (Personen-Picker), Heirat + Verlobung, Kinder ± (Personen-Picker), Quellen |
| Quelle | Titel, Kurzname, Autor, Datum, Verlag, Archiv, Signatur, Notiz |
| Archiv | Name, Typ, Adresse, Telefon, Website, E-Mail, Findbuch-URL |
| Ort | Name, Koordinaten, Typ, datierte Namensvarianten, übergeordnete Orte |
| Hof | Adressvarianten, Koordinaten, Notiz, Dorf-Zuordnung, Lebenszyklus |

**Progressive Offenlegung heißt konkret, über Schnellauswahl-Pills (ADR-v9-30, verfeinert nach v8-Vorbild):** häufige Felder/Cluster liegen sofort offen und flach im Formular. Jedes seltene Feld bzw. jede seltene Sektion bekommt einen EIGENEN „+ Label"-Pill-Button (analog v8 `_PF_PILLS`/`.field-pill`, `legacy-v8/ui-forms-person.js`) — Klick blendet genau dieses eine Feld an seiner **kanonischen Position** ein (Reihenfolge im Formular folgt immer der GEDCOM-Schreibreihenfolge, nicht der Klick-Reihenfolge) und der Pill verschwindet danach aus der Reihe. Nie einzelfeldweise innerhalb eines fachlichen Clusters (z. B. „Geburt" bleibt Datum+Ort+Quellen zusammen, nicht das Datum separat pillbar von Ort/Quellen) — Pills gelten für ganze seltene Cluster/Sektionen, nicht für Teile eines häufigen Clusters.

**Sichtbarkeits-Kriterium („gefüllt schlägt selten"):** ein Feld/Ereignis erscheint als Pill NUR, wenn es leer/nicht vorhanden ist — für Sonder-Ereignisse via `isEventPresent(ev)` (`core/model/event.ts`, kein neuer Mechanismus; `seen`-Flag/INV-P5 zählt als „vorhanden"), für Skalarfelder via leerem String. Ist ein Feld/Ereignis bereits befüllt (importiert oder per Pill ergänzt), wird es UNBEDINGT inline an kanonischer Position gezeigt, nie hinter einer Pill versteckt.

- **Person:** immer offen: Name(given/surname)+Geschlecht, **Geburt** (Datum+Ort+Quellen). **Zwei graphisch getrennte Pill-Gruppen** (Nachtrag 2026-07-06 — eine gemeinsame Reihe vermischte bisher Identität und Ereignisse ununterscheidbar):
  - **Identitäts-Pills** (bei der Identitäts-Sektion, DIREKT NACH den Identitätsfeldern, nicht davor): Präfix+Suffix (ein Pill), Rufname, Titel, Religion, RESN, E-Mail, Website.
  - **Ereignis-Pills** (eigene Reihe, positioniert NACH Geburt UND — falls befüllt — Tod, s. u.): je EIN eigener Pill für Taufe, Tod (+Todesursache), Bestattung (nicht gebündelt, jede Sektion bleibt eigenständig benannt) — UND je ein eigener Pill für die häufigsten generischen Ereignisse **Beruf (OCCU)**, **Wohnort (RESI)**, **Auswanderung (EMIG)**, **Einwanderung (IMMI)** und **Militärdienst (MILI)** (Beruf/Wohnort analog v8 `_PF_PILLS`; Auswanderung/Einwanderung/Militärdienst ohne v8-Vorbild, aber genealogisch als häufig begründet — Auswanderungswellen/Wehrpflicht in deutschen Datensätzen). Klick fügt sofort das entsprechende Event zu `events[]` hinzu. Der generische „+ Ereignis hinzufügen"-Typ-Dropdown bleibt für die verbleibenden, selteneren Typen (EDUC/NATU/EVEN/GRAD/ADOP/FACT/CENS/PROP).
  - **EINE gemeinsame Überschrift „Ereignisse"** (Nachtrag 2026-07-06 — ersetzt die getrennten Überschriften „Sonder-Ereignisse"/„Weitere Ereignisse", die nicht zielführend waren): Sonder-Ereignisse und `events[]` erscheinen unter einer Überschrift. Reihenfolge: Geburt (immer offen) → Tod (weiterhin `isEventPresent`-gesteuert wie jedes andere Ereignis-Pill — KEINE Sonderbehandlung; erscheint bei Befüllung kanonisch direkt nach Geburt) → Ereignis-Pill-Reihe (rückt bei leerem Tod direkt nach Geburt) → aktivierte/weitere Ereignisse. Ein aktivierter Pill (z. B. Taufe) fügt sich weiterhin an seiner kanonischen GEDCOM-Position ein (zwischen Geburt und Tod), nicht ans Ende der Liste.
- **Familie:** immer offen: Eltern-Zuordnung, **Heirat** (Datum+Ort+Quellen), Kinder ±. Eigener Pill für Verlobung, generisch „+ Ereignis hinzufügen" für `events[]` (kein Beruf/Wohnort-Analogon — das sind Personen-Ereignisse).
- Gilt analog für künftige Formulare.
- **Sonder-Ereignisse behalten ihre Sondersemantik** ([10 §5.1](10-Domaenenmodell.md)): Taufe/Tod/Bestattung (bzw. Verlobung bei Familie) sind je eine eigene, fest benannte Sektion — NICHT mit `events[]` zu einer generischen Hinzufügen/Entfernen-Liste verschmolzen, auch nicht hinter ihrem Pill. Ein nie aktivierter Pill wird gar nicht gerendert — er kann beim Speichern nicht angetastet werden (einfacheres Dirty-Tracking als ein Sammel-Aufklapper); insbesondere bleibt `seen` (INV-P5) für einen inaktiven Pill unverändert, ein leerer-aber-vorhandener Block (`1 CHR` ohne Sub-Tags) geht dadurch nicht beim Speichern eines unbeteiligten Formularteils verloren.
- Gilt analog für künftige Formulare (Quelle/Archiv/Ort/Hof): häufigstes Feld-Cluster zuerst offen, seltene Cluster gebündelt dahinter.

**Struktureingaben:**
- **Datum:** Qualifier-Dropdown + Tag/Monat/Jahr — **immer direkt sichtbar und editierbar, kein Gate-Checkbox davor**, alle Teilfelder **in einer Zeile auf der primären mobilen Zielbreite** ([21 §2](21-UI-UX.md) „Mobile-Modell primär"; INV-UI-5, [21 §6a](21-UI-UX.md); bei `BET`/`FROM` eine zweite Zeile für die zweite Datumshälfte — nicht jedes Teilfeld einzeln gestapelt, ADR-v9-30, Korrektur einer ersten Umsetzung mit Checkbox + gestapelten Feldern). Dafür brauchen ALLE VIER Teilfelder eine begrenzte, kompakte Breite — nicht nur Tag/Jahr, auch der Qualifier-`<select>` (sonst durch die längste Option „zwischen (BET…AND…)" aufgebläht) und das Monat-Feld (Nachtrag 2026-07-06, Umsetzungsbefund an einer ersten Fassung, die trotz `flex-wrap` auf zwei Zeilen umbrach). Monat akzeptiert Zahl + DE/EN-Namen ([10 §5.2](10-Domaenenmodell.md)). **Tristate-Erhaltung per Dirty-Tracking, nicht per Feld-Auswertung** ([10 §5.1](10-Domaenenmodell.md)): rührt der Nutzer die Datumsfelder nicht an, bleibt der ursprüngliche `event.date`-Rohwert unverändert (egal ob `null`, `''` oder Wert — ein bloßes „alle Felder leer → `null`" würde ein geparstes `''` beim Speichern eines unbeteiligten Formularteils still verlieren). Ändert der Nutzer aktiv ein Feld, wird neu aus Qualifier+Tag/Monat/Jahr zusammengebaut; aktives Leeren aller Felder ergibt `null` (nie `''` — dieser Zustand ist nur bewahrbar, nicht durch Nutzerabsicht erzeugbar).
- **Ort:** Toggle Freitext ↔ 6 Felder (Dorf/Stadt/PLZ/Landkreis/Bundesland/Staat) gemäß HEAD `PLAC.FORM`, Felder in einer Zeile soweit umbruchfrei (INV-UI-5, [21 §6a](21-UI-UX.md)). Gleiche Tristate-Erhaltung wie beim Datum ([10 §5.1](10-Domaenenmodell.md)): unangetastet bleibt der Rohwert von `event.place` erhalten.
- **Personen-Picker (ADR-v9-30):** einheitliches, durchsuchbares Auswahlfeld für JEDE Person-Referenz in Formularen (Ehemann/Ehefrau, Kind hinzufügen, künftig Assoziationen/Alias) — Tippen filtert nach Name/Namensvariante (analog globaler Suche, [§1.1](#11-navigation--views)), Ergebnisliste zeigt Name + Geburts-/Sterbejahr zur Disambiguierung. Ersetzt ein flaches `<select>` über alle Personen, das ab wenigen Dutzend Einträgen unpraktikabel wird. Enthält immer eine Option „+ Neue Person anlegen …" — öffnet das Personen-Formular für eine neu ID-vergebene Person, kehrt nach dem Speichern mit der neuen Person als getroffener Auswahl ins ursprüngliche Formular zurück (kein Kontextverlust).
- **Quellen-Widget:** einheitlich in allen Formularen — Tags mit ✕, aufklappbarer Picker; im Ereignis-Formular zusätzlich Seitenfeld + QUAY-Dropdown + Evidenz-Aufklapper pro Quelle.
- **Eingabe-Templates (Quick-Templates):** wiederverwendbare Vorlagen (app-privat, [30 §2](30-NFR-und-Persistenz.md)).

---

## 3. Validierungsregeln

Validierung erzeugt einen **RAM-Bericht** (keine automatischen Datenänderungen). v8-Stand: **31 Regeln**, konfigurierbar (einzeln deaktivierbar, Schwellwerte, bekannte Ausnahmen). Schweregrade: **✗ Fehler · ⚠ Warnung · ℹ Hinweis**.

**Regelklassen:**
- **Vollständigkeit:** fehlendes Sterbedatum, keine Quellen (`MISSING_QUAY`), keine Eltern, fehlende Evidenzbewertung (`MISSING_EVAL`, default-off).
- **Plausibilität:** unrealistisches Alter, Geburt nach Tod, Elternalter, Heiratsalter, Kinderzahl/-abstände.
- **Konsistenz:** Ortsnamenvarianten, verwaiste Quellen-/Personenreferenzen, Datumswidersprüche.
- **Geo (Orte/Höfe):** Bounding-Box, Zeitachsen-Inkonsistenz, `enclosedBy`-Zirkel, `HOF_NO_COORD`, `HOF_FAR` (Haversine > 25 km).

Jeder Befund hat „+"-Button (→ Aufgabe). Config merkt sich den Regelstand (`known`), damit neue opt-in-Regeln bei Bestandsnutzern korrekt deaktiviert erben.

> **Neuaufsatz-Hinweis:** Regel-Registry deklarativ: Regel = `{id, severity, defaultEnabled, predicate, message}` → daten- statt codegetrieben.

---

## 4. Ausgaben & Reports

v8-Stand: **12 Standalone-HTML-Ausgaben** (Browser-Druck → PDF, kein Server, keine externe Bibliothek), **aus dem Datenmodell gerechnet** (nie aus dem Live-DOM → headless testbar, [02 §5](02-Zielarchitektur-v9.md)).

| # | Ausgabe |
|---|---|
| 1 | Ahnenliste (Kekule) |
| 2 | Familienbogen |
| 3 | Quellenverzeichnis / Bibliographie (Belegzählung, Orphan-Markierung) |
| 4 | Forschungsprotokoll-Report |
| 5 | Statistik-Report (Lebensspannen, Heiratsalter, Histogramme) |
| 6 | Nachkommentafel (d'Aboville) |
| 7 | Familienbuch (buchreif, Coverfoto, Seitenzahlen, Glossar) |
| 8 | Großposter-SVG (A1, vektoriell, skalierbar) |
| 9 | Verwandtschaftsnachweis (aus Beziehungsrechner) |
| 10 | Stammtafel-Wall-Chart (Sanduhr-SVG aus DB) |
| 11 | Ortssippenbuch (Familien nach Ort + Narrativ) |
| 12 | Hofchronik (Ort › Hof › Eigentümer/Bewohner mit Zu-/Wegzug) |

**Prinzip:** Reports werden aus dem Modell gerechnet, nie aus dem sichtbaren DOM → unabhängig vom View-State, automatisiert testbar.
