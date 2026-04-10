#!/usr/bin/env python3
"""
gedcom_gramps_prep.py
Bereitet eine GEDCOM-Datei (Ancestris-Export) für den GRAMPS-Import vor.

Korrekturen:
  1. FORM-Tag: von Ebene n+2 (unter FILE) auf Ebene n+1 (unter OBJE), vor FILE
  2. DATE TO <datum> ohne FROM -> DATE BEF <datum>
  3. ADDR unter Events -> NOTE (verhindert Duplikat-Orte in GRAMPS)
     ADDR unter REPO/SUBM bleibt unverändert.

Original bleibt unverändert. Ausgabe: <name>_gramps_ready.ged
"""

import re
import sys
from pathlib import Path


# ── Korrektur 1: FORM-Position ───────────────────────────────────────────────

def fix_form_position(lines):
    """
    Verschiebt FORM, das als Kind von FILE steht, eine Ebene nach oben
    (Geschwister von FILE) und platziert es VOR dem FILE-Tag.

    Ancestris schreibt:
        n FILE foo.jpg
        n+1 FORM jpg        <- falsch: Kind von FILE

    GEDCOM 5.5.1 / GRAMPS erwartet:
        n FORM jpg          <- Geschwister von FILE, vor FILE
        n FILE foo.jpg
    """
    result = []
    i = 0
    n = len(lines)
    fixes = 0

    while i < n:
        line = lines[i].rstrip('\r\n')

        m_file = re.match(r'^(\d+) FILE\b', line)
        if m_file:
            file_level = int(m_file.group(1))
            expected_form_level = file_level + 1

            # Prüfe: ist die nächste Zeile FORM auf file_level+1?
            if i + 1 < n:
                next_line = lines[i + 1].rstrip('\r\n')
                m_form = re.match(r'^(\d+) FORM\b', next_line)
                if m_form and int(m_form.group(1)) == expected_form_level:
                    # FORM eine Ebene höher setzen (file_level statt file_level+1)
                    corrected_form = str(file_level) + next_line[len(str(expected_form_level)):]
                    result.append(corrected_form + '\n')   # FORM zuerst
                    result.append(line + '\n')              # dann FILE
                    i += 2                                  # FILE + FORM überspringen
                    fixes += 1
                    continue

        result.append(line + '\n')
        i += 1

    return result, fixes


# ── Korrektur 2: DATE TO ohne FROM ──────────────────────────────────────────

def fix_date_to_without_from(lines):
    """
    Korrigiert 'DATE TO <datum>' (ohne FROM) -> 'DATE BEF <datum>'.

    'DATE TO x' ohne vorangehendes FROM ist nicht GEDCOM-5.5.1-konform.
    'BEF x' drückt semantisch dasselbe aus: Ereignis endete bis zu diesem Datum.
    """
    result = []
    fixes = 0
    pattern = re.compile(r'^(\d+ DATE) TO (.+)$')

    for line in lines:
        stripped = line.rstrip('\r\n')
        m = pattern.match(stripped)
        if m:
            corrected = f'{m.group(1)} BEF {m.group(2)}'
            result.append(corrected + '\n')
            fixes += 1
            print(f'  DATE-Fix: "{stripped}" -> "{corrected}"')
        else:
            result.append(line if line.endswith('\n') else line + '\n')

    return result, fixes


# ── Korrektur 3: ADDR unter Events -> NOTE ───────────────────────────────────

# ADDR-Subfelder, deren Werte in die NOTE übernommen werden
_ADDR_SUB_TAGS = {'ADR1', 'ADR2', 'ADR3', 'CITY', 'STAE', 'POST', 'CTRY'}


def fix_addr_to_note(lines):
    """
    Wandelt ADDR-Tags unter Events (Ebene >= 2) in NOTE-Tags um.
    Verhindert damit doppelte Ortseinträge in GRAMPS.

    Ancestris schreibt:
        2 ADDR Landsberger Str. 507     <- GRAMPS erzeugt Duplikat-Ort
        3 CITY München
        3 POST 80804

    Wird zu:
        2 NOTE Adresse: Landsberger Str. 507, München, 80804

    ADDR unter REPO/SUBM (Ebene 1) bleibt unverändert —
    GRAMPS importiert diese korrekt.
    """
    result = []
    i = 0
    n = len(lines)
    fixes = 0

    while i < n:
        line = lines[i].rstrip('\r\n')

        m_addr = re.match(r'^(\d+) ADDR\b(.*)', line)
        if m_addr:
            addr_level = int(m_addr.group(1))
            addr_text  = m_addr.group(2).strip()

            # Nur Events-ADDR konvertieren (Ebene >= 2).
            # Ebene 1 = direkt unter REPO/SUBM -> unverändert lassen.
            if addr_level >= 2:
                note_parts = [addr_text] if addr_text else []

                # Alle Kind-Zeilen konsumieren (egal welcher Tag)
                j = i + 1
                while j < n:
                    sub = lines[j].rstrip('\r\n')
                    m_sub = re.match(r'^(\d+) (\w+)(.*)', sub)
                    if not m_sub:
                        j += 1
                        continue
                    sub_level = int(m_sub.group(1))
                    if sub_level <= addr_level:
                        break                           # Subtree von ADDR beendet
                    sub_tag = m_sub.group(2)
                    sub_val = m_sub.group(3).strip()
                    if sub_tag in _ADDR_SUB_TAGS and sub_val:
                        note_parts.append(sub_val)
                    j += 1

                note_text = ', '.join(note_parts)
                note_line = f'{addr_level} NOTE Adresse: {note_text}' if note_text \
                            else f'{addr_level} NOTE Adresse'
                result.append(note_line + '\n')
                print(f'  ADDR-Fix: "{line}" -> "{note_line}"')
                i = j
                fixes += 1
                continue

        result.append(line + '\n')
        i += 1

    return result, fixes


# ── Hauptprogramm ────────────────────────────────────────────────────────────

def main():
    if len(sys.argv) < 2:
        input_path = Path(__file__).parent / 'Unsere Familie.ged'
    else:
        input_path = Path(sys.argv[1])

    if not input_path.exists():
        print(f'Fehler: Datei nicht gefunden: {input_path}')
        sys.exit(1)

    output_path = input_path.with_stem(input_path.stem + '_gramps_ready')

    print(f'Eingabe:  {input_path.name}')
    print(f'Ausgabe:  {output_path.name}')
    print()

    with open(input_path, 'r', encoding='utf-8') as f:
        lines = f.readlines()

    print(f'Zeilen gelesen: {len(lines)}')
    print()

    print('── Korrektur 1: FORM-Position ──────────────────')
    lines, form_fixes = fix_form_position(lines)
    print(f'  {form_fixes} FORM-Tags korrigiert (von Ebene n+2 auf n+1, vor FILE)')
    print()

    print('── Korrektur 2: DATE TO ohne FROM ──────────────')
    lines, date_fixes = fix_date_to_without_from(lines)
    print(f'  {date_fixes} DATE-Einträge korrigiert (TO -> BEF)')
    print()

    print('── Korrektur 3: ADDR -> NOTE ───────────────────')
    lines, addr_fixes = fix_addr_to_note(lines)
    print(f'  {addr_fixes} ADDR-Tags in NOTE umgewandelt')
    print()

    with open(output_path, 'w', encoding='utf-8') as f:
        f.writelines(lines)

    total = form_fixes + date_fixes + addr_fixes
    print('── Ergebnis ────────────────────────────────────')
    print(f'  Gesamt-Korrekturen: {total}')
    print(f'  Geschrieben:        {output_path}')
    print()
    print('Hinweise für den GRAMPS-Import:')
    print('  - PLAC-Format: "Dorf, Stadt, VALID, Landkreis, Bundesland, Staat"')
    print('    Im Import-Dialog die 6 Felder auf GRAMPS-Ortstypen mappen.')
    print('  - _SCBK / _PRIM Tags werden von GRAMPS ignoriert (kein Datenverlust).')
    print('  - Nach dem Import: Werkzeuge -> Datenbank prüfen')


if __name__ == '__main__':
    main()
