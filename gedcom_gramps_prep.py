#!/usr/bin/env python3
"""
gedcom_gramps_prep.py
Bereitet eine GEDCOM-Datei (Ancestris-Export) für den GRAMPS-Import vor.

Korrekturen:
  1. FORM-Tag: von Ebene n+2 (unter FILE) auf Ebene n+1 (unter OBJE), vor FILE
  2. DATE TO <datum> ohne FROM -> DATE BEF <datum>

Original bleibt unverändert. Ausgabe: <name>_gramps_ready.ged
"""

import re
import sys
from pathlib import Path


# ── Hilfsfunktionen ──────────────────────────────────────────────────────────

def gedcom_level(line: str):
    """Gibt die GEDCOM-Ebene einer Zeile zurück, oder None."""
    m = re.match(r'^(\d+) ', line)
    return int(m.group(1)) if m else None


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


# ── Hauptprogramm ────────────────────────────────────────────────────────────

def main():
    if len(sys.argv) < 2:
        # Standard-Eingabedatei wenn kein Argument angegeben
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

    # Einlesen
    with open(input_path, 'r', encoding='utf-8') as f:
        lines = f.readlines()

    print(f'Zeilen gelesen: {len(lines)}')
    print()

    # Korrekturen anwenden
    print('── Korrektur 1: FORM-Position ──────────────────')
    lines, form_fixes = fix_form_position(lines)
    print(f'  {form_fixes} FORM-Tags korrigiert (von Ebene n+2 auf n+1, vor FILE)')
    print()

    print('── Korrektur 2: DATE TO ohne FROM ──────────────')
    lines, date_fixes = fix_date_to_without_from(lines)
    print(f'  {date_fixes} DATE-Einträge korrigiert (TO -> BEF)')
    print()

    # Schreiben
    with open(output_path, 'w', encoding='utf-8') as f:
        f.writelines(lines)

    print('── Ergebnis ────────────────────────────────────')
    print(f'  Gesamt-Korrekturen: {form_fixes + date_fixes}')
    print(f'  Geschrieben:        {output_path}')
    print()
    print('Hinweise für den GRAMPS-Import:')
    print('  - PLAC-Format: "Dorf, Stadt, VALID, Landkreis, Bundesland, Staat"')
    print('    Im Import-Dialog die 6 Felder auf GRAMPS-Ortstypen mappen.')
    print('  - _SCBK / _PRIM Tags werden von GRAMPS ignoriert (kein Datenverlust).')
    print('  - Nach dem Import: Werkzeuge -> Datenbank prüfen')


if __name__ == '__main__':
    main()
