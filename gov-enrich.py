#!/usr/bin/env python3
"""
gov-enrich.py — Offline-Anreicherung exportierter placeObjects mit Wikidata.

Liefert für jeden Ort:
  • Koordinaten (P625)
  • Typ (P31 → Village/Town/City/Parish/Church/Farm/Cemetery/County/State/Country)
  • enclosedBy[] mit historischen Datumsgrenzen aus P131 (inkl. P580/P582-Qualifikatoren)

GOV (gov.genealogy.net) hat keine nutzbare JSON/SPARQL-API.
Wikidata deckt westeuropäische Orte sehr gut ab und enthält häufig
historische Verwaltungszugehörigkeiten mit Datumsgrenzen.

Verwendung:
  python3 gov-enrich.py <placeObjects.json> [--out enriched.json] [--dry-run]

  placeObjects.json  = exportiert via Orte-Tab → ↓-Button
  --out              = Ausgabedatei (default: <input>_enriched.json)
  --dry-run          = nur ausgeben, nicht schreiben
  --only-missing     = nur Orte ohne Koordinaten/Typ verarbeiten (default: an)
  --overwrite        = bestehende Werte überschreiben
"""

import sys, json, time, urllib.request, urllib.parse, argparse, re

SPARQL_URL = "https://query.wikidata.org/sparql"
RATE_DELAY = 1.1  # Sekunden zwischen Wikidata-Anfragen

# Wikidata P31-Werte → unser Typ-Vokabular
P31_TYPE_MAP = {
    "Q532":      "Village",      # village
    "Q5119":     "City",         # capital city
    "Q515":      "City",         # city
    "Q3910694":  "Town",         # town in Germany
    "Q262166":   "Municipality", # Gemeinde in Deutschland
    "Q13221722": "Municipality", # Gemeinde
    "Q1549591":  "City",         # big city
    "Q56061":    "Municipality", # administrative territorial entity
    "Q15221":    "Hamlet",       # hamlet
    "Q702492":   "Parish",       # Kirchspiel
    "Q16970":    "Church",       # church building
    "Q16831714": "Church",       # Kirchengemeinde
    "Q23413":    "Castle",       # castle
    "Q188509":   "Hamlet",       # suburb
    "Q10864048": "Village",      # rural municipality (Deutschland)
    "Q253019":   "County",       # Landkreis
    "Q1221156":  "County",       # Kreis
    "Q200547":   "County",       # kreisfreie Stadt
    "Q2039348":  "State",        # Bundesland
    "Q43": "Country",
    "Q6256": "Country",          # country
}

def sparql_query(q):
    """Führt eine SPARQL-Abfrage gegen Wikidata aus, gibt Bindings zurück."""
    params = urllib.parse.urlencode({"query": q, "format": "json"})
    req = urllib.request.Request(
        f"{SPARQL_URL}?{params}",
        headers={"Accept": "application/sparql-results+json",
                 "User-Agent": "StammbaumPWA-enrich/1.0 (genealogy research)"}
    )
    with urllib.request.urlopen(req, timeout=15) as r:
        return json.loads(r.read())["results"]["bindings"]

def wd_id(uri):
    """Extrahiert QID aus Wikidata-URI."""
    return uri.split("/")[-1] if uri else None

def parse_date(dt_str):
    """Konvertiert Wikidata-Datum (+1750-01-01T00:00:00Z) → '1750'."""
    if not dt_str:
        return None
    m = re.match(r"[+-]?(\d{4})", dt_str)
    return m.group(1) if m else None

def wikidata_enrich(place_name):
    """
    Sucht einen Ort in Wikidata und gibt zurück:
      { lat, lon, type, enclosedBy: [{title, type, dateFrom, dateTo}] }
    oder None wenn nicht gefunden.
    """
    # Schritt 1: Item-ID über deutschen Label suchen
    q_search = f"""
    SELECT ?item ?itemLabel WHERE {{
      ?item rdfs:label "{place_name}"@de .
      ?item wdt:P31 ?type .
      SERVICE wikibase:label {{ bd:serviceParam wikibase:language "de,en" }}
    }} LIMIT 5
    """
    try:
        rows = sparql_query(q_search)
    except Exception as e:
        print(f"  ⚠ Wikidata-Fehler (Suche): {e}", file=sys.stderr)
        return None

    if not rows:
        # Fallback: ersten Teil des Namens (z.B. "München" aus "München, Bayern, Deutschland")
        short = place_name.split(",")[0].strip()
        if short != place_name:
            q_search2 = f"""
            SELECT ?item ?itemLabel WHERE {{
              ?item rdfs:label "{short}"@de .
              ?item wdt:P31 ?type .
              SERVICE wikibase:label {{ bd:serviceParam wikibase:language "de,en" }}
            }} LIMIT 5
            """
            try:
                rows = sparql_query(q_search2)
                time.sleep(RATE_DELAY)
            except Exception as e:
                print(f"  ⚠ Wikidata-Fehler (Suche2): {e}", file=sys.stderr)
                return None

    if not rows:
        return None

    item_id = wd_id(rows[0]["item"]["value"])

    # Schritt 2: Details abrufen (Koordinaten, Typ, P131-Kette mit Datumsgrenzen)
    q_detail = f"""
    SELECT ?coord ?typeId ?adminId ?adminLabel ?start ?end WHERE {{
      BIND(wd:{item_id} AS ?item)
      OPTIONAL {{ ?item wdt:P625 ?coord }}
      OPTIONAL {{ ?item wdt:P31 ?typeId }}
      OPTIONAL {{
        ?item p:P131 ?adminStmt .
        ?adminStmt ps:P131 ?adminId .
        ?adminId rdfs:label ?adminLabel . FILTER(LANG(?adminLabel)="de")
        OPTIONAL {{ ?adminStmt pq:P580 ?start }}
        OPTIONAL {{ ?adminStmt pq:P582 ?end }}
      }}
    }}
    """
    try:
        detail = sparql_query(q_detail)
    except Exception as e:
        print(f"  ⚠ Wikidata-Fehler (Detail): {e}", file=sys.stderr)
        return None

    lat, lon, place_type = None, None, None
    admin_entries = []

    for row in detail:
        # Koordinaten
        if lat is None and "coord" in row:
            coord_val = row["coord"]["value"]  # "Point(lon lat)"
            m = re.match(r"Point\(([0-9.\-]+) ([0-9.\-]+)\)", coord_val)
            if m:
                lon, lat = float(m.group(1)), float(m.group(2))

        # Typ
        if place_type is None and "typeId" in row:
            qid = wd_id(row["typeId"]["value"])
            place_type = P31_TYPE_MAP.get(qid)

        # Verwaltungszugehörigkeit (historisch)
        if "adminId" in row and "adminLabel" in row:
            entry = {
                "title":    row["adminLabel"]["value"],
                "wikidataId": wd_id(row["adminId"]["value"]),
                "dateFrom": parse_date(row.get("start", {}).get("value")),
                "dateTo":   parse_date(row.get("end",   {}).get("value")),
            }
            # Duplikate vermeiden
            if not any(e["wikidataId"] == entry["wikidataId"]
                       and e["dateFrom"] == entry["dateFrom"]
                       and e["dateTo"] == entry["dateTo"]
                       for e in admin_entries):
                admin_entries.append(entry)

    return {
        "lat":        lat,
        "lon":        lon,
        "type":       place_type,
        "enclosedBy": admin_entries,
    }

def epid(title):
    """djb2-Hash → _ep_XXXXXXXX (kompatibel mit gedcom.js _epId())."""
    h = 5381
    for c in title:
        h = ((h << 5) + h) ^ ord(c)
    h = h & 0xFFFFFFFF
    return f"_ep_{h:08x}"

def find_or_create_po(pos, title, po_type):
    """Findet oder legt ein placeObject an; gibt ID zurück."""
    lc = title.lower()
    for po in pos.values():
        if (po.get("title") or "").lower() == lc:
            if not po.get("type") or po["type"] == "Unknown":
                po["type"] = po_type
            return po["id"]
    new_id = epid(title)
    pos[new_id] = {
        "id": new_id, "title": title, "type": po_type or "Unknown",
        "lat": None, "long": None, "pnames": [], "enclosedBy": [], "parentId": None
    }
    return new_id

def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("input",           help="Exportierte placeObjects.json")
    ap.add_argument("--out",           help="Ausgabedatei (default: <input>_enriched.json)")
    ap.add_argument("--dry-run",       action="store_true", help="Nicht schreiben")
    ap.add_argument("--only-missing",  action="store_true", default=True,
                    help="Nur Orte ohne Koordinaten/Typ verarbeiten (default)")
    ap.add_argument("--overwrite",     action="store_true", help="Bestehende Werte überschreiben")
    args = ap.parse_args()

    out_path = args.out or args.input.replace(".json", "_enriched.json")

    with open(args.input, encoding="utf-8") as f:
        data = json.load(f)

    # Die exportierte JSON kann entweder direkt ein Dict sein oder {"placeObjects":{...}}
    pos = data.get("placeObjects", data) if isinstance(data, dict) else data
    print(f"📂 {len(pos)} placeObjects geladen aus {args.input}")

    to_process = []
    for po in pos.values():
        if args.overwrite:
            to_process.append(po)
        elif args.only_missing:
            if not po.get("lat") or not po.get("type") or po.get("type") == "Unknown":
                to_process.append(po)
        else:
            to_process.append(po)

    print(f"🔍 {len(to_process)} Orte zu verarbeiten")

    ok = 0
    for i, po in enumerate(to_process, 1):
        name = po.get("title", "")
        print(f"  [{i}/{len(to_process)}] {name}", end=" … ", flush=True)
        time.sleep(RATE_DELAY)

        result = wikidata_enrich(name)
        if not result:
            print("nicht gefunden")
            continue

        changed = False

        if result["lat"] and (args.overwrite or not po.get("lat")):
            po["lat"]  = result["lat"]
            po["long"] = result["lon"]
            changed = True

        if result["type"] and (args.overwrite or not po.get("type") or po["type"] == "Unknown"):
            po["type"] = result["type"]
            changed = True

        # enclosedBy[] mit historischen Datumsgrenzen
        if result["enclosedBy"] and (args.overwrite or not po.get("enclosedBy")):
            new_enc = []
            for entry in result["enclosedBy"]:
                parent_id = find_or_create_po(pos, entry["title"], None)
                new_enc.append({
                    "placeId":  parent_id,
                    "dateFrom": entry["dateFrom"],
                    "dateTo":   entry["dateTo"],
                    "dateType": None,
                    "_dateRaw": None,
                })
            po["enclosedBy"] = new_enc
            if new_enc:
                po["parentId"] = new_enc[0]["placeId"]
            changed = True

        if changed:
            ok += 1
            enc_info = f", {len(po['enclosedBy'])} enclosedBy" if po.get("enclosedBy") else ""
            print(f"✓ {result['type'] or '?'} · {result['lat']:.4f},{result['lon']:.4f}{enc_info}")
        else:
            print("keine Änderung")

    print(f"\n✅ {ok}/{len(to_process)} Orte angereichert")

    if not args.dry_run:
        # Rückgabe-Format: direkt placeObjects-Dict (kompatibel mit Import)
        out_data = pos if not data.get("placeObjects") else {**data, "placeObjects": pos}
        with open(out_path, "w", encoding="utf-8") as f:
            json.dump(out_data, f, ensure_ascii=False, indent=2)
        print(f"💾 Gespeichert: {out_path}")
        print(f"   → Im Stammbaum: Orte-Tab → ↑ Ortsdaten importieren")
    else:
        print("(Dry-run — nicht gespeichert)")

if __name__ == "__main__":
    main()
