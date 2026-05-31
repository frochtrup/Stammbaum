#!/usr/bin/env python3
"""
gov-enrich.py — Offline-Anreicherung exportierter placeObjects.

Zwei Modi:

1. WIKIDATA-Modus (Standard):
   Liest exportierte placeObjects.json, fragt Wikidata SPARQL je Ort,
   befüllt Koordinaten + Typ. enclosedBy[] wird NICHT befüllt
   (Wikidata liefert nur heutigen Verwaltungsstand).

   python3 gov-enrich.py placeObjects.json [--out enriched.json] [--dry-run]

2. GOV-TEXT-Modus (historisch, empfohlen für deutsche Orte):
   Liest eine .txt-Datei mit kopierten GOV-Textzusammenfassungen
   (gov.genealogy.net → Ort aufrufen → Text kopieren, mehrere Einträge
   hintereinander in eine Datei einfügen).
   Löst object_XXXXX-Eltern-IDs via GOV-HTML auf.
   Kombiniert mit placeObjects.json für Titel-Abgleich.

   python3 gov-enrich.py placeObjects.json --gov-text gov_texte.txt [--out enriched.json]

Optionen:
  --out          Ausgabedatei (default: <input>_enriched.json)
  --dry-run      Nur ausgeben, nicht schreiben
  --only-missing Nur Orte ohne Koordinaten/Typ (default: an)
  --overwrite    Bestehende Werte überschreiben
  --gov-text     GOV-Textzusammenfassungen (.txt, mehrere Blöcke)
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

# ─── GOV-Text-Modus ──────────────────────────────────────────────────────────

GOV_TYPE_MAP = {
    'Landgemeinde':'Municipality', 'Gemeinde':'Municipality', 'Verbandsgemeinde':'Municipality',
    'Samtgemeinde':'Municipality', 'Verwaltungsgemeinschaft':'Municipality', 'Amt':'Municipality',
    'Stadt':'Town', 'Stadt (Gebietskörperschaft)':'Town', 'Stadtgemeinde':'Town',
    'Wigbold':'Town', 'Flecken':'Town', 'Marktgemeinde':'Town',
    'Dorf':'Village', 'Kirchdorf':'Village',
    'Weiler':'Hamlet', 'Einöde':'Hamlet',
    'Kirchspiel':'Parish', 'Kirchengemeinde':'Parish', 'Pfarrei':'Parish',
    'Bistum':'Parish', 'Erzbistum':'Parish',
    'Landkreis':'County', 'Kreis':'County', 'Stadtkreis':'County',
    'Regierungsbezirk':'District', 'Bezirk':'District',
    'Provinz':'State', 'Bundesland':'State', 'Land':'State', 'Freistaat':'State',
    'Staat':'Country', 'Königreich':'Country', 'Großherzogtum':'Country',
    'Herzogtum':'Country', 'Fürstentum':'Country', 'Kurfürstentum':'Country',
    'Freie Stadt':'City', 'Kirche':'Church', 'Friedhof':'Cemetery', 'Hof':'Farm',
}

def _extract_date(s):
    if not s: return None
    m = re.search(r'(\d{4}(?:-\d{2}(?:-\d{2})?)?)', s)
    return m.group(1) if m else None

def parse_gov_block(raw_block):
    """Parst einen GOV-Textblock → dict mit govId, title, types, names, parents, extIds."""
    lines = [l.strip().rstrip(',;').strip() for l in raw_block.split('\n') if l.strip()]
    if not lines: return None
    result = {'govId': lines[0], 'title': None, 'types': [], 'names': [], 'parents': [], 'extIds': {}}
    for line in lines[1:]:
        # gehört [ab DATE] [bis DATE] zu object_XXX / GOVID
        m = re.match(r'gehört(?:\s+ab\s+(\S+))?(?:\s+bis\s+(\S+))?\s+(?:\S+\s+)?zu\s+(\S+)', line)
        if m:
            result['parents'].append({'govObjId': m.group(3), 'dateFrom': _extract_date(m.group(1)), 'dateTo': _extract_date(m.group(2))})
            continue
        m2 = re.match(r'gehört\s+(\S+)\s+zu\s+(\S+)', line)
        if m2:
            d = _extract_date(m2.group(1))
            result['parents'].append({'govObjId': m2.group(2), 'dateFrom': d, 'dateTo': d})
            continue
        # ist [ab DATE] [bis DATE] (auf deu) TYPE
        m3 = re.match(r'ist(?:\s+ab\s+(\S+))?(?:\s+bis\s+(\S+))?\s+\(auf \w+\)\s+(.+?)(?:\s+sagt|$)', line)
        if m3:
            rt = m3.group(3).strip()
            result['types'].append({'rawType': rt, 'type': GOV_TYPE_MAP.get(rt, 'Unknown'), 'dateFrom': _extract_date(m3.group(1)), 'dateTo': _extract_date(m3.group(2))})
            continue
        # heißt (auf LANG) NAME
        m4 = re.match(r'heißt\s+(?:\S+\s+)?\(auf (\w+)\)\s+(.+?)(?:\s+sagt|$)', line)
        if m4:
            result['names'].append({'lang': m4.group(1), 'value': m4.group(2).strip()})
            if result['title'] is None and m4.group(1) in ('deu', 'de'):
                result['title'] = m4.group(2).strip()
            continue
        # hat externe Kennung
        m5 = re.match(r'hat externe Kennung\s+(\w+):(\S+)', line)
        if m5: result['extIds'][m5.group(1)] = m5.group(2)
    return result

def fetch_gov_name(gov_obj_id, cache={}):
    """Holt den Namen eines GOV-Objekts via HTML-Scraping."""
    if gov_obj_id in cache: return cache[gov_obj_id]
    url = f"https://gov.genealogy.net/item/show/{gov_obj_id}"
    try:
        req = urllib.request.Request(url, headers={'User-Agent': 'StammbaumPWA-enrich/1.0'})
        with urllib.request.urlopen(req, timeout=10) as r:
            html = r.read().decode('utf-8', errors='replace')
        m = re.search(r'<title>([^<]+)\s*-\s*GOV</title>', html)
        name = m.group(1).strip() if m else None
        cache[gov_obj_id] = name
        time.sleep(0.5)
        return name
    except Exception as e:
        print(f"  ⚠ GOV-Fetch fehlgeschlagen für {gov_obj_id}: {e}", file=sys.stderr)
        cache[gov_obj_id] = None
        return None

def apply_gov_text_mode(pos, gov_text_path, overwrite=False):
    """Verarbeitet GOV-Textblöcke: parst, löst Eltern auf, schreibt in pos."""
    with open(gov_text_path, encoding='utf-8') as f:
        raw = f.read()

    # Blöcke trennen: jeder Block beginnt mit einer Zeile ohne führende Tabs
    blocks_raw = re.split(r'\n(?=\S)', raw.strip())
    blocks = [parse_gov_block(b) for b in blocks_raw if b.strip()]
    blocks = [b for b in blocks if b and b['govId']]
    print(f"📄 {len(blocks)} GOV-Blöcke gefunden in {gov_text_path}")

    # Index: govId → block (für interne Auflösung)
    gov_index = {b['govId']: b for b in blocks}

    # Für jeden Block das passende placeObject in pos finden
    changed = 0
    for block in blocks:
        # Passendes placeObject suchen: via _govId oder Titel-Match
        po = next((p for p in pos.values() if p.get('_govId') == block['govId']), None)
        if not po and block['title']:
            lc = block['title'].lower()
            po = next((p for p in pos.values() if (p.get('title') or '').lower() == lc), None)
        if not po:
            # Neues placeObject anlegen
            title = block['title'] or block['govId']
            pid = epid(title)
            po = {'id': pid, 'title': title, 'type': 'Unknown', 'lat': None, 'long': None,
                  'pnames': [], 'enclosedBy': [], 'parentId': None}
            pos[pid] = po

        po['_govId'] = block['govId']

        # Typ (neuester ohne dateTo)
        current_type = next((t for t in reversed(block['types']) if not t['dateTo']), None) \
                    or (block['types'][-1] if block['types'] else None)
        if current_type and current_type['type'] != 'Unknown' and (overwrite or not po.get('type') or po['type'] == 'Unknown'):
            po['type'] = current_type['type']

        # Namen
        if not isinstance(po.get('pnames'), list): po['pnames'] = []
        for n in block['names']:
            if not any(p['value'] == n['value'] and p.get('lang') == n['lang'] for p in po['pnames']):
                po['pnames'].append({'value': n['value'], 'lang': n['lang'], 'dateFrom': None, 'dateTo': None, 'dateType': None, '_dateRaw': None})

        # Eltern-Referenzen auflösen
        if overwrite: po['enclosedBy'] = []
        if not isinstance(po.get('enclosedBy'), list): po['enclosedBy'] = []

        for parent in block['parents']:
            obj_id = parent['govObjId']
            # 1) Im selben Datei-Index nachschlagen
            parent_block = gov_index.get(obj_id)
            parent_title = parent_block['title'] if parent_block else None
            # 2) In pos nachschlagen
            if not parent_title:
                existing = next((p for p in pos.values() if p.get('_govId') == obj_id), None)
                parent_title = existing['title'] if existing else None
            # 3) Hinweis: GOV-HTML-Scraping durch Bot-Schutz blockiert.
            #    Lösung: GOV-Text des Eltern-Objekts ebenfalls in die .txt-Datei kopieren.
            if not parent_title:
                print(f"    ⚠ Unaufgelöst: {obj_id} — GOV-Text des Eltern-Ortes zur Datei hinzufügen")

            title = parent_title or obj_id
            parent_id = find_or_create_po(pos, title, None)
            if parent_block:
                ct = next((t for t in reversed(parent_block['types']) if not t['dateTo']), None)
                if ct and ct['type'] != 'Unknown':
                    pos[parent_id]['type'] = ct['type']
            pos[parent_id]['_govId'] = obj_id

            already = any(e['placeId'] == parent_id and e.get('dateFrom') == parent['dateFrom']
                          and e.get('dateTo') == parent['dateTo'] for e in po['enclosedBy'])
            if not already:
                po['enclosedBy'].append({'placeId': parent_id, 'dateFrom': parent['dateFrom'],
                                         'dateTo': parent['dateTo'], 'dateType': None, '_dateRaw': None})

        if po['enclosedBy'] and not po.get('parentId'):
            po['parentId'] = po['enclosedBy'][0]['placeId']
        changed += 1
        print(f"  ✓ {po['title']} ({po.get('type','?')}) — {len(po['enclosedBy'])} enclosedBy")

    return changed

# ─── main ─────────────────────────────────────────────────────────────────────

def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("input",           help="Exportierte placeObjects.json")
    ap.add_argument("--out",           help="Ausgabedatei (default: <input>_enriched.json)")
    ap.add_argument("--dry-run",       action="store_true", help="Nicht schreiben")
    ap.add_argument("--only-missing",  action="store_true", default=True,
                    help="Nur Orte ohne Koordinaten/Typ verarbeiten (default)")
    ap.add_argument("--overwrite",     action="store_true", help="Bestehende Werte überschreiben")
    ap.add_argument("--gov-text",      help="GOV-Textzusammenfassungen (.txt, mehrere Blöcke)")
    args = ap.parse_args()

    out_path = args.out or args.input.replace(".json", "_enriched.json")

    with open(args.input, encoding="utf-8") as f:
        data = json.load(f)

    # Die exportierte JSON kann entweder direkt ein Dict sein oder {"placeObjects":{...}}
    pos = data.get("placeObjects", data) if isinstance(data, dict) else data
    print(f"📂 {len(pos)} placeObjects geladen aus {args.input}")

    # GOV-Text-Modus: parsen und direkt schreiben
    if args.gov_text:
        n = apply_gov_text_mode(pos, args.gov_text, overwrite=args.overwrite)
        print(f"\n✅ {n} placeObjects via GOV-Text angereichert")
        if not args.dry_run:
            out_data = pos if not data.get("placeObjects") else {**data, "placeObjects": pos}
            with open(out_path, "w", encoding="utf-8") as f:
                json.dump(out_data, f, ensure_ascii=False, indent=2)
            print(f"💾 Gespeichert: {out_path}")
            print(f"   → Im Stammbaum: Orte-Tab → ↑ Ortsdaten importieren")
        return

    # Wikidata-Modus (Standard)
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
