# 20 — Funktionen

> Schicht: App · Abhängig von: [10](10-Domaenenmodell.md), [11](11-Orte-Hoefe-Identitaet.md), [12](12-Forschungsdaten.md), [13](13-Interop-Roundtrip.md) · Darstellung: [21 UI/UX](21-UI-UX.md)

Referenz-Katalog des erreichten v8-Umfangs. Prioritäten: **[K]**ern (muss), **[S]**tandard (soll), **[E]**rweitert (kann). Feature-Detail-Historie: `legacy-v8/ROADMAP.md` / `legacy-v8/CHANGELOG.md`.

---

## 1. Feature-Katalog

### 1.1 Navigation & Views
- **[K]** Rollenbasierte Navigation ([21 §1](21-UI-UX.md)): Entitäten · Ansichten (Lenses) · Arbeitsflächen. Mobile: Bottom-Nav **Baum · Personen · Suche · Aufgaben · Mehr** + Entitäts-Segment-Umschalter. Desktop: beschriftete Sidebar + Multi-Pane + Command-Palette (⌘K).
- **[K]** Einheitlicher Lens-Umschalter (Baum/Karte/Zeitleiste/Statistik/Story) statt verstreuter Diagramm-Toggles ([21 §4](21-UI-UX.md)).
- **[K]** History-Navigation (Zurück/Vorwärts, herkunftsbewusst), Swipe-Right auf Mobile.
- **[K]** Globale Suche (erstklassiges Ziel) über Personen/Familien/Quellen/Orte, gruppierte Ergebnisse.
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
- **[K]** Interaktion: Klick-Rezentrierung, Pinch-Zoom (0.3×–3×), Drag-Pan, Vollbild, Tastaturnavigation, Desktop Auto-Fit.
- **[S]** Nachkommen-Baum (top-down, Gen 2–7, Ehepartner/Geschwister, T-Linien).
- **[S]** Fan-Chart (konzentrische Halbkreis-Segmente, 3–6 Generationen).
- **[E]** Diagramm-Export als PNG; Großposter-SVG (A1, vektoriell).

### 1.4 Personen-Tab
- **[K]** Alphabetische Liste mit Buchstaben-Trenner, Geburts-/Sterbejahr + Ort.
- **[K]** Sortier-Umschalter Name ⇄ Geburtsdatum (ein Toggle, ersetzt die Buchstaben-Trenner-Gruppierung im Datum-Modus durch schlichte chronologische Reihenfolge).
- **[K]** Suche über Name/Titel/Ereignisse/Notizen/Religion (inkl. Namensvarianten, Soundex-Modus optional); erweiterte Filter: Geschlecht, Geburtsjahr-Bereich, Geburtsort (Textmatch auf Geburts-/Taufort), fehlende Felder (kein Sterbedatum · keine Quellen · keine Eltern).
- **[S]** CSV-Export der gefilterten Liste.
- **[K]** Detail: alle Ereignisse, Quellen-Badges `§N` (QUAY-Farbindikator), Geo-Links, Familien-Navigationszeilen.
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
- **[K]** Bearbeitung: Name, Koordinaten, Typ, `pnames`, `enclosedBy`.
- **[K]** String→PlaceObject verknüpfen (Re-Import-Erkennung erhält Identität über Roundtrip).
- **[S]** Nominatim-Geocoding (Einzel + Batch), GOV-Import (historisch datiert), Geo-Plausibilitäts-Validator, Dubletten-Merge (verlustfrei, Herkunfts-Pille), JSON-Import/Export mit Dedup + Multi-Device-Konflikterkennung.

### 1.8 Höfe-Tab *(Kern: [11](11-Orte-Hoefe-Identitaet.md))*
- **[K]** Hof-Liste (aus Events aufgelöst, numerisch sortiert), Detail mit Bewohnern chronologisch.
- **[K]** Hof-Bearbeitung (Adressvarianten, Koordinaten, Notiz, Lebenszyklus).
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
| Familie | Eltern (Dropdown), Heirat + Verlobung, Kinder ±, Quellen |
| Quelle | Titel, Kurzname, Autor, Datum, Verlag, Archiv, Signatur, Notiz |
| Archiv | Name, Typ, Adresse, Telefon, Website, E-Mail, Findbuch-URL |
| Ort | Name, Koordinaten, Typ, datierte Namensvarianten, übergeordnete Orte |
| Hof | Adressvarianten, Koordinaten, Notiz, Dorf-Zuordnung, Lebenszyklus |

**Struktureingaben:**
- **Datum:** Qualifier-Dropdown + Tag/Monat/Jahr; Monat akzeptiert Zahl + DE/EN-Namen ([10 §5.2](10-Domaenenmodell.md)).
- **Ort:** Toggle Freitext ↔ 6 Felder (Dorf/Stadt/PLZ/Landkreis/Bundesland/Staat) gemäß HEAD `PLAC.FORM`.
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
