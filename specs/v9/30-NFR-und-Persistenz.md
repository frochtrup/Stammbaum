# 30 — Nicht-funktionale Anforderungen & Persistenz

> Schicht: Betrieb · Abhängig von: [11 Orte/Höfe](11-Orte-Hoefe-Identitaet.md) (orte.json), [13 Interop](13-Interop-Roundtrip.md) (Datei) · Plattform-APIs leben hier, nicht im Kern ([02 §7](02-Zielarchitektur-v9.md))

---

## 1. Nicht-funktionale Anforderungen

**NFR-1 Performance & Skalierung:**
- Parsing großer Dateien im Hintergrund (Worker), Fortschrittsanzeige.
- Virtuelles Scrollen für lange Listen (O(log n)-Positionsbestimmung).
- Sortier-Cache mit gezielter Invalidierung.
- v8 verifiziert bis 20.000 Personen (Parse < 700 ms, erster Sort ~1 s). Ziel-offen: 50k/100k (Speicher, Storage-Quota) — in v9 von Anfang mitdenken (SCALE-REAL).

**NFR-2 Offline/PWA:**
- Service Worker mit atomarem Precache kritischer Assets, Cache-first/Network-first-Strategie, Offline-Fallback-Seite, BFCache-Guard.
- Bei App-Update: Nutzerhinweis (kein stiller Bruch durch alten Cache).
- **v9-Falle (aus v8):** Bei Modul-/Asset-Umstellung Cache-Version bumpen — sonst liefert ein alter SW eine veraltete Shell, die neue Module falsch lädt.

**NFR-3 Sicherheit (LP-8):**
- CSP `script-src 'self'` ohne `unsafe-inline`/`eval` (keine Inline-Styles/-Handler; Event-Delegation + CSSOM bzw. Framework-Bindings).
- Konsequentes HTML-Escaping aller Nutzerstrings.
- OAuth 2.0 PKCE (S256), Token in `sessionStorage` (bewusste Wahl ohne Backend; Restrisiko dokumentiert).
- Automatisiertes CSP-Test-Gate.

**NFR-4 Datenschutz (LP-2):**
- Lokal-First, kein Tracking, keine Telemetrie, kein Cloud-Zwang.
- DSGVO-Anonymisierung beim Export ([13 §7](13-Interop-Roundtrip.md)).

**NFR-5 Barrierefreiheit (LP-8):**
- WCAG 2.1 AA, 0 Violations. Tastaturbedienbarkeit, aria-labels, Kontraste, nicht-nur-Farbe.

**NFR-6 Testbarkeit (kritisch — [02 INV-ARCH-2](02-Zielarchitektur-v9.md)):**
- Alle Kern-Domänenlogik headless testbar (kein Browser, kein Nutzer, **kein Build**): Roundtrip-Tests (GEDCOM + GRAMPS), Unit-Tests der reinen Funktionen, Snapshot-Test kritischer Render-Ausgaben, CSP-Gate.
- Test-Suite als Pre-Commit-Gate.
- Deterministischer Synthetik-Generator für Skalierungstests.
- Import-Graph-Check als Gate für [02 INV-ARCH-1](02-Zielarchitektur-v9.md) (Kern importiert nichts von oben).

---

## 2. Speicher- & Konfigurationsmodell

### 2.1 Speicherschichten

| Schicht | Zweck |
|---|---|
| **Datei** (GEDCOM/GRAMPS) | Wahrheit für Genealogie (LP-3) |
| **Browser-Storage (IndexedDB)** | Cache des Datei-**Texts** (Auto-Load), Foto-Cache (pfad-basiert), App-Konfiguration |
| **`orte.json`** (lokal + OneDrive) | Cross-Stammbaum Orts-/Hofwissen (LP-4) mit Revision/Device-Konflikterkennung |
| **OneDrive** (optional) | Sync-Kanal für Datei + Fotos + `orte.json` |

> Es wird der **Datei-Text** gecacht, nicht das In-Memory-Modell (Sets/Referenzen nicht trivial serialisierbar; die Datei ist ohnehin die Wahrheit).

### 2.2 App-Konfiguration (geräteweit, reist NICHT mit Datei)

Proband-ID · Theme (dark/light) · Anonymisierungs-Flag · GED-Version · Strict-Flag · Duplikat-Ignorierliste · Quick-Templates · Validierungs-Config · Projekte ([12 §5](12-Forschungsdaten.md)) · OneDrive-Ordner-Referenzen (relativ zu `od_base_path`).

---

## 3. Medien-Pfad-Modell

`media.file` = relativer Pfad ab `od_base_path` (dem Datei-Ordner). Vollpfad = `od_base_path + '/' + media.file`. Laden zweistufig: Download-URL beschaffen → fetchen → Base64 im Browser-Cache (`img:<relPath>`).

---

## 4. Multi-Device-Konfliktschutz (LP-9)

- **`orte.json`:** Wrapper mit `_rev`/`_device`/`_ts`; gleiche Revision + verschiedenes Device + abweichender Inhalt → Union-Merge + Warn-Toast. Höhere `_schemaVersion` als bekannt → Read-Only-Schreibstopp ([11 §2](11-Orte-Hoefe-Identitaet.md)).
- **Datei (OneDrive):** ETag-Erfassung bei Load/Save, `If-Match`-PUT; bei 412 → Überschreib-/Abbruch-Dialog statt stillem last-write-wins.

---

## 5. Speicher-/Backup-Verhalten (Zusammenfassung)

```
Speichern:
  iOS:            navigator.share({ files: [main, backup] })   (Hauptdatei + Zeitstempel-Backup)
  Chrome Desktop: FileSystemFileHandle.createWritable()        (direkt in Originaldatei)
  Safari/Firefox: <a download> Hauptdatei + Zeitstempel-Backup

Wiederherstellung bei Reload:
  FileHandle aus Browser-Speicher, Permission prüfen → restaurieren
  Auto-Load des gecachten Datei-Texts, falls kein Handle
```

Anonymisierter/Strict/GED7-Export: nie direktes Speichern (Suffix am Dateinamen), Original unberührt.
