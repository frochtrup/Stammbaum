// ─────────────────────────────────────────────────────────────────────────────
//  GEDCOM-VALIDATOR
//  Liefert Befunde als reines RAM-Array — nichts wird gespeichert.
//  UI-Einstieg: ui-views-tasks.js → runValidation()
//  Nutzer befördert einzelne Befunde manuell in echte Tasks (_addTaskToDb).
// ─────────────────────────────────────────────────────────────────────────────

// Extrahiert eine 4-stellige Jahreszahl aus einem GEDCOM-Datumsstring.
// Nutzt die öffentlichen Helfer aus gedcom.js (parseGedDate, gedDatePartToISO).
function _valYear(dateStr) {
  if (!dateStr) return null;
  const { date1 } = parseGedDate(dateStr);
  const iso = gedDatePartToISO(date1 || dateStr);
  const y = parseInt((iso || '').split('-')[0]);
  return isNaN(y) ? null : y;
}

// Gibt true zurück wenn die Person mind. eine Quellenangabe hat
// (Namens-Zitierungen, Geburts-, Tauf-, Tod- oder Bestattungs-Zitierungen).
function _hasSources(p) {
  if (p.nameSources?.length) return true;
  for (const key of ['birth', 'chr', 'death', 'buri']) {
    if (p[key]?.citations?.length) return true;
  }
  for (const ev of (p.events || [])) {
    if (ev.citations?.length) return true;
  }
  return false;
}

// ─── Haupt-Funktion ───────────────────────────────────────────────────────────
// Gibt [{personId, rule, severity, text, category}] zurück.
// severity: 'error' | 'warn' | 'info'
// category: 'kirchenbuch' | 'urkunde' | 'online'  (= TASK_CATEGORIES-Schlüssel)
function runValidation(db) {
  if (!db?.individuals) return [];
  const results = [];

  function push(personId, rule, severity, text, category) {
    results.push({ personId, rule, severity, text, category });
  }

  // ─── Personen-Regeln ────────────────────────────────────────────────────────
  for (const [pid, p] of Object.entries(db.individuals)) {
    const byear = _valYear(p.birth?.date) || _valYear(p.chr?.date);
    const dyear = _valYear(p.death?.date);

    // P1 — Nachname fehlt
    if (!p.surname?.trim())
      push(pid, 'MISSING_SURNAME', 'warn', 'Nachname fehlt', 'online');

    // P2 — Geschlecht unbekannt
    if (!p.sex || p.sex === 'U')
      push(pid, 'MISSING_SEX', 'warn', 'Geschlecht unbekannt', 'online');

    // P3 — kein Geburtsdatum und kein Taufdatum
    if (!p.birth?.date && !p.chr?.date)
      push(pid, 'MISSING_BIRTH', 'info', 'Geburtsdatum/-taufe fehlt', 'kirchenbuch');

    // P4 — Sterbejahr liegt vor Geburtsjahr
    if (byear && dyear && dyear < byear)
      push(pid, 'DEATH_BEFORE_BIRTH', 'error',
        `Sterbejahr ${dyear} liegt vor Geburtsjahr ${byear}`, 'urkunde');

    // P5 — Alter > 110 Jahre
    if (byear && dyear && (dyear - byear) > 110)
      push(pid, 'AGE_OVER_110', 'warn',
        `Alter unrealistisch: ${dyear - byear} Jahre`, 'online');

    // P6 — Geburt nach 1875, keine Quelle (Standesamts-Ära)
    if (byear && byear >= 1876 && !_hasSources(p))
      push(pid, 'BIRTH_AFTER_1875_NO_SOURCE', 'info',
        `Geburt ${byear} — Standesamtsurkunde suchen`, 'urkunde');

    // P7 — Geburtsort fehlt (nur wenn Geburtsdatum vorhanden)
    if (p.birth?.date && !p.birth?.place?.trim())
      push(pid, 'MISSING_BIRTHPLACE', 'info', 'Geburtsort fehlt', 'kirchenbuch');
  }

  // ─── Familien-Regeln (Befunde landen bei den Elternteilen) ─────────────────
  for (const f of Object.values(db.families || {})) {
    const my = _valYear(f.marr?.date);
    const husb = f.husb ? db.individuals[f.husb] : null;
    const wife = f.wife ? db.individuals[f.wife] : null;

    // F1 — Heirat vor Geburt des Vaters
    if (husb && my) {
      const hb = _valYear(husb.birth?.date);
      if (hb && my < hb)
        push(f.husb, 'MARR_BEFORE_BIRTH', 'error',
          `Heiratsjahr ${my} liegt vor eigener Geburt ${hb}`, 'urkunde');
    }

    // F2 — Heirat vor Geburt der Mutter
    if (wife && my) {
      const wb = _valYear(wife.birth?.date);
      if (wb && my < wb)
        push(f.wife, 'MARR_BEFORE_BIRTH', 'error',
          `Heiratsjahr ${my} liegt vor eigener Geburt ${wb}`, 'urkunde');
    }

    // F3 / F4 — Elternalter bei Kindsgeburt
    for (const childId of (f.children || [])) {
      const child = db.individuals[childId];
      if (!child) continue;
      const cy = _valYear(child.birth?.date) || _valYear(child.chr?.date);
      if (!cy) continue;
      const cname = child.name || childId;

      if (wife) {
        const wb = _valYear(wife.birth?.date);
        if (wb) {
          const age = cy - wb;
          if (age < 12)
            push(f.wife, 'MOTHER_TOO_YOUNG', 'error',
              `Zu jung bei Geburt von ${cname}: ${age} Jahre`, 'kirchenbuch');
          else if (age > 60)
            push(f.wife, 'MOTHER_TOO_OLD', 'warn',
              `Alter bei Geburt von ${cname}: ${age} Jahre`, 'kirchenbuch');
        }
      }
      if (husb) {
        const hb = _valYear(husb.birth?.date);
        if (hb && (cy - hb) > 90)
          push(f.husb, 'FATHER_TOO_OLD', 'warn',
            `Alter bei Geburt von ${cname}: ${cy - hb} Jahre`, 'kirchenbuch');
      }
    }
  }

  return results;
}
