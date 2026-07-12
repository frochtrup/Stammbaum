# 14 — Dateihandling

> Schicht: Kern (Serializer) + Betrieb (FileService) · Abhängig von: [13 Interop/Roundtrip](13-Interop-Roundtrip.md), [30 NFR & Persistenz](30-NFR-und-Persistenz.md) · Ersetzt die v8-Dateimodule (`storage.js`, `storage-file.js`, `onedrive*.js`)

Radikale Vereinfachung gegenüber v8. GEDCOM 5.5.1 ist Master; GRAMPS, Strict-GEDCOM und GED7 sind alternative Serialisierungen desselben Modells.

---

## 1. Prinzip: drei getrennte Belange

v8 hat drei Dinge vermischt, die getrennt gehören:

1. **Roundtrip-Treue** = Eigenschaft des **Kerns** (`parse`/`serialize`, [13](13-Interop-Roundtrip.md)). Unabhängig davon, wo die Datei liegt.
2. **Dateihandling** = zwei Verben: **Bytes rein** (Import), **Bytes raus** (Export/Save).
3. **Geräte-Sync** = separates Thema → in v9 Sache des **Betriebssystems**, nicht der App (§5).

> **Unvermeidbare Wahrheit:** Keine Browser-API schreibt auf *allen* Plattformen still in dieselbe Datei zurück. Desktop Chrome/Edge + Android: ja (File System Access API). Safari + iOS: nein — jeder „echte" Datei-Save ist eine Nutzer-Geste (Share-Sheet). Das wird an **genau einer** Stelle gekapselt ([§4](#4-fileservice-die-einzige-plattform-verzweigung)), nicht durch den Code gestreut.

---

## 2. Das notwendige Minimum

| Baustein | Zweck | Plattform |
|---|---|---|
| `<input type="file">` / Drag-Drop | Import (Bytes rein) | **überall identisch** |
| `parse` / `serialize` | Roundtrip | Kern ([13](13-Interop-Roundtrip.md)) |
| **Arbeitskopie** (Dateitext in IndexedDB) | Auto-Load, Absturz-Recovery, Offline | **überall identisch** |
| Export-Tier 1: FS-Access-Handle | still in-place speichern | Desktop Chrome/Edge, Android |
| Export-Tier 2: `navigator.share` / `<a download>` | „In Dateien sichern" | Safari/iOS, Firefox |

**Nicht notwendig** (aus v8 entfernt): OneDrive-OAuth/Token, `od_base_path`, ETag/If-Match, Ordner-Picker, `filemap`, automatische Timestamp-Backups bei jedem Save, mehrfache Storage-Caches. Siehe [03 §9](03-Altlasten.md).

---

## 3. Modell: „Arbeitskopie + ein Export-Rohr"

### 3.1 Arbeitskopie (plattformübergreifende Konstante)

Der kanonische Dateitext liegt zur Laufzeit als **eine** Arbeitskopie in IndexedDB. Sie liefert Auto-Load beim Start, Offline-Betrieb und Absturz-Wiederherstellung — **ohne** Plattform-Verzweigung. Das ist der „unabhängig von Desktop/Mobile"-Teil.

- **INV-FILE-1:** Es gibt genau **eine** Arbeitskopie (aktueller Dateitext + Dateiname + optionaler FS-Handle). Kein zweiter paralleler Text-Cache.
- IndexedDB genügt (Dateien ≤ ~6 MB); kein OPFS/Graph-Store nötig.

### 3.2 Ein Export-Rohr, N Serializer

```
Modell → serialize(format) → Bytes → save()
             └ 'gedcom-5.5.1' | 'gedcom-strict' | 'gedcom-7.0' | 'gramps'
```

- **Querexport** und **Strict** sind **kein Sonderpfad** — nur ein anderes Format im selben Export-Dialog.
- GRAMPS (gzip) läuft durch dasselbe Rohr, weil es **Bytes** behandelt, nicht Text.
- **INV-FILE-2:** Jeder Format-Export geht durch dasselbe Save-Rohr. Keine format-spezifische Save-Maschinerie.

### 3.3 Diagnose & Wartung (lokaler Zustand)

Zwei Nutzer-seitige Selbsthilfe-Aktionen in den Einstellungen, für den Fall eines inkonsistenten lokalen Zustands:
- **„Ortsdaten zurücksetzen"** — löscht nur den `orte.json`-IDB-Spiegel ([§6](#6-ortejson-cross-stammbaum-wissen)); die geladene Datei selbst bleibt unberührt, Orte werden beim nächsten Laden neu aufgelöst ([11 §4](11-Orte-Hoefe-Identitaet.md)).
- **„Alle lokalen Daten löschen"** — setzt Arbeitskopie ([§3.1](#31-arbeitskopie-plattformübergreifende-konstante)) und `orte.json`-Spiegel vollständig zurück, App startet leer.

Beide Aktionen betreffen ausschließlich lokal abgeleiteten/zwischengespeicherten Zustand — keine Datei-Löschung auf Betriebssystem-Ebene, kein Datenverlust an der eigentlichen GEDCOM-/GRAMPS-Datei.

---

## 4. FileService: die einzige Plattform-Verzweigung

Gekapselt in `/services` ([02 §7](02-Zielarchitektur-v9.md)); kennt **kein** Genealogie-Wissen.

```
FileService {
  pickAndImport():        Promise<{ text, name, handle? }>   // <input>/Picker, universal
  loadWorkingCopy():      Promise<{ text, name } | null>     // Auto-Load, universal
  saveWorkingCopy(text):  Promise<void>                       // still, jederzeit (IDB)
  exportToFile(bytes, name): Promise<SaveResult>
     ├ Tier 1: handle.createWritable()      (in-place — Desktop Chrome/Edge, Android)
     └ Tier 2: navigator.share({files}) | <a download>   (iOS/Safari, Firefox)
}
```

- Der Kern kennt nur `parse(text)` / `serialize(model, format)` — **kein** DOM, kein Picker (INV-ARCH-1, [02](02-Zielarchitektur-v9.md)).
- **INV-FILE-3:** Die Tier-1/Tier-2-Verzweigung ist die **einzige** `if (Plattform)`-Stelle des Dateihandlings.
- FS-Handle wird in IDB behalten; bei Reload Permission neu anfragen (`queryPermission`/`requestPermission`).
- Anonymisierter/Strict/GED7-Export: nie in-place (Suffix am Dateinamen, z. B. `_strict`/`_anon`), Original unberührt.

---

## 5. Sync: das Betriebssystem, nicht die App

v8 baute OneDrive per Graph API nach, um „dieselbe Datei auf mehreren Geräten" zu erreichen — der komplexeste Brocken, und **unnötig**:

- **Desktop:** Datei liegt in einem iCloud-Drive- / OneDrive-**Ordner**; FS-Access schreibt in-place; das **OS** synct.
- **Mobile:** „In Dateien sichern" → iCloud-Drive-Ordner; das **OS** synct.
- **Gemeinsame Datei über Geräte** = gemeinsamer Sync-Ordner. Datei-Konflikte sind **OS-Konflikte** („Datei (Konflikt).ged"), nicht App-Sache.

Robuster als app-verwaltete Graph-Calls und null Komplexität für die App. **LP-2 (Lokal-First) bleibt vollständig erhalten.**

**Ehrlicher Tradeoff:** Ohne App-Cloud gibt es kein automatisches „beim Öffnen ist die neueste Version schon da". Milderung: Auto-Load zeigt die letzte Arbeitskopie; beim erneuten Öffnen einer Datei mit neuerem Disk-Timestamp Hinweis „Datei auf der Festplatte ist neuer — laden?".

**Optionaler Cloud-Adapter (später, falls gewünscht):** als eigenständiges optionales Modul **hinter derselben `FileService`-Schnittstelle** — nie im Kern. Erst dann kämen OAuth/Token/Konfliktprotokoll zurück, isoliert auf dieses Modul.

---

## 6. `orte.json` (Cross-Stammbaum-Wissen)

`orte.json` ([11 §2](11-Orte-Hoefe-Identitaet.md)) folgt demselben Prinzip: liegt **im Sync-Ordner**, das OS synct — der Nutzer platziert die Datei dort selbst (z. B. neben der Genealogie-Datei), die App entdeckt sie nicht automatisch über ein Verzeichnis-Handle. Die Revision/Device-Konflikterkennung (`_rev`/`_device`) bleibt — sie ist gegen *nebenläufige* Bearbeitung nötig, egal ob der Sync per OS oder Cloud läuft. Union-Merge bei Konflikt. Kein Graph-API-Pfad mehr.

Persistenzschichten (Spec 11 §2): ein geräteweiter **IndexedDB-Spiegel** (immer vorhanden, `PlacesSyncService`) plus ein optionaler **Datei-Ein-/Ausgang** über dasselbe Adapter-Muster wie die Genealogie-Datei ([§4](#4-fileservice-die-einzige-plattform-verzweigung)) — ein eigenes, von der Genealogie-Arbeitskopie getrenntes FS-Handle:
- **Export** („Orte exportieren"): serialisiert den IDB-Spiegel-Stand zu JSON und schreibt ihn über `exportToFile` (Tier 1 in-place, falls Handle gemerkt, sonst Tier 2 Share/Download) — dasselbe Rohr wie der Genealogie-Export (INV-FILE-2).
- **Import** („Orte importieren"): liest eine gewählte `orte.json` über denselben `PickerAdapter`, gleicht sie über `reconcileAndSave` (Union-Merge, Schema-Gate) gegen den IDB-Spiegel ab — wie ein Stand von einem anderen Gerät.

Kein stiller Schreib-Sync bei jeder einzelnen Orts-/Hof-Mutation (auf Tier-2-Plattformen wäre das Share-Sheet-Spam bei jedem Edit) — Export/Import bleiben explizite Nutzeraktionen.

---

## 7. Medien

`media.file` = relativer Pfad bezogen auf den Datei-Ordner (den Sync-Ordner). Auflösung vereinfacht:
- **Desktop (FS-Access):** optionaler **Directory-Handle** des Datei-Ordners → Geschwister-Medien direkt lesbar.
- **Mobile / ohne Directory-Handle:** Medien werden **explizit importiert** und in IDB gecacht (`img:<relPath>`).
- Kein OneDrive-`downloadUrl`-Fetch mehr. Medien sind **[S]**, nicht **[K]** — die Kern-Roundtrip-Fähigkeit hängt nicht daran.

---

## 8. Umsetzungsreihenfolge

1. **Kern** (`/core/interop`): `parse` + `serialize(model, format)` als reine Funktionen ([13](13-Interop-Roundtrip.md)).
2. **FileService** (`/services`): 2 Save-Tiers + Arbeitskopie (IDB).
3. **Ein Export-Dialog** mit Format-Auswahl → das eine Rohr.
4. **Auto-Load** aus Arbeitskopie beim Start; FS-Handle-Persistenz + Permission-Reprompt.
5. Timestamp-Backup nur **optional/explizit**, nicht automatisch.
6. *(Optional, später)* Cloud-Adapter hinter `FileService`.

**Reduktion:** ~5 v8-Module (`storage.js`, `storage-file.js`, `onedrive-auth.js`, `onedrive-import.js`, `onedrive.js`) → **ein** `FileService` + die Kern-Serializer.
