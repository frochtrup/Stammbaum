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
- Kein OAuth/Token im Kern-Dateipfad (App-verwaltete Cloud entfällt, [14 §5](14-Dateihandling.md)). Nur falls ein optionaler Cloud-Adapter zugeschaltet wird: OAuth 2.0 PKCE (S256), Token in `sessionStorage`, Restrisiko isoliert auf dieses Modul.
- Automatisiertes CSP-Test-Gate.
- **Umgesetzt (ADR-v9-39):** `app/csp-policy.ts` (einzige Quelle der Wahrheit) + `app/csp-plugin.ts` (Vite-`transformIndexHtml`, injiziert das Meta-Tag NUR im Produktions-Build — GitHub Pages liefert keine eigenen Response-Header) + `tests/csp/check-csp.mjs` (CI-Gate `npm run check:csp`, Portierung von v8 `test-csp.js`). Direktiven-Set gegenüber dem v8-Orakel bewusst reduziert: kein OneDrive/Microsoft-Graph/OAuth-Zubehör (ADR-v9-04) und kein Nominatim/gov.genealogy.net (in v9 nicht aufgerufen). `img-src` braucht `data: blob:` — Leaflets gebündeltes CSS/JS bettet selbst `data:image/...`-URIs ein (Zoom-Controls, Marker-Schatten), sonst bricht die Karten-Insel unter aktiver CSP (browser-verifiziert). Bekannte Restlücke: konsequentes HTML-Escaping ist NICHT gesondert verifiziert (Svelte escaped Templates standardmäßig, aber `ui/islands/map/leaflet-map.ts` übergibt Personen-/Orts-Freitext ungeprüft an Leaflets `bindTooltip` (innerHTML-basiert) — CSP `script-src 'self'` mildert eine darüber eingeschleuste Inline-Handler-Injektion strukturell ab, behebt die zugrunde liegende Escaping-Lücke aber nicht; offener Folge-Punkt, nicht Teil dieser Entscheidung).

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

### 2.2 App-Konfiguration (geräteweit, reist NICHT mit Datei)

Proband-ID · Theme (dark/light) · Anonymisierungs-Flag · GED-Version · Strict-Flag · Duplikat-Ignorierliste · Quick-Templates · Validierungs-Config · Projekte ([12 §5](12-Forschungsdaten.md)) · letzter Dateiname + FS-Handle der Arbeitskopie ([14](14-Dateihandling.md)).

---

## 3. Medien-Pfad-Modell

`media.file` = relativer Pfad bezogen auf den Datei-Ordner (den Sync-Ordner). Auflösung: Desktop via optionalem Directory-Handle (FS-Access) direkt; sonst expliziter Import + IDB-Cache (`img:<relPath>`). Kein OneDrive-`downloadUrl`-Fetch. Detail: [14 §7](14-Dateihandling.md).

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
