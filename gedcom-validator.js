// ─────────────────────────────────────────────────────────────────────────────
//  GEDCOM-VALIDATOR
//  Liefert Befunde als reines RAM-Array — nichts wird gespeichert.
//  UI-Einstieg: ui-views-tasks.js → runValidation()
//  Nutzer befördert einzelne Befunde manuell in echte Tasks (_addTaskToDb).
// ─────────────────────────────────────────────────────────────────────────────

const VAL_CONFIG_DEFAULTS = {
  disabled: new Set(),
  thresholds: {
    maxAge:       110,
    staStAera:    1876,  // Geburt ab diesem Jahr → Standesamtsurkunde suchen
    minMotherAge:  12,
    maxMotherAge:  60,
    maxFatherAge:  90,
  }
};

// Alle Regeln mit Beschreibung und Standardschwellenwert (für die Config-UI)
const VAL_RULES = [
  { key: 'MISSING_SURNAME',          label: 'Nachname fehlt',                      severity: 'warn',  threshold: null },
  { key: 'MISSING_SEX',              label: 'Geschlecht unbekannt',                 severity: 'warn',  threshold: null },
  { key: 'MISSING_BIRTH',            label: 'Geburtsdatum/-taufe fehlt',            severity: 'info',  threshold: null },
  { key: 'DEATH_BEFORE_BIRTH',       label: 'Sterbejahr vor Geburtsjahr',           severity: 'error', threshold: null },
  { key: 'AGE_OVER_MAX',             label: 'Unrealistisches Alter',                severity: 'warn',  threshold: 'maxAge' },
  { key: 'BIRTH_AFTER_STAERA',       label: 'Geburt nach Standesamt-Jahr, keine Q.', severity: 'info', threshold: 'staStAera' },
  { key: 'MISSING_BIRTHPLACE',       label: 'Geburtsort fehlt',                    severity: 'info',  threshold: null },
  { key: 'MARR_BEFORE_BIRTH',        label: 'Heirat vor eigener Geburt',            severity: 'error', threshold: null },
  { key: 'MOTHER_TOO_YOUNG',         label: 'Mutter zu jung bei Geburt',            severity: 'error', threshold: 'minMotherAge' },
  { key: 'MOTHER_TOO_OLD',           label: 'Mutter zu alt bei Geburt',             severity: 'warn',  threshold: 'maxMotherAge' },
  { key: 'FATHER_TOO_OLD',           label: 'Vater zu alt bei Geburt',              severity: 'warn',  threshold: 'maxFatherAge' },
];

// Extrahiert eine 4-stellige Jahreszahl aus einem GEDCOM-Datumsstring.
function _valYear(dateStr) {
  if (!dateStr) return null;
  const { date1 } = parseGedDate(dateStr);
  const iso = gedDatePartToISO(date1 || dateStr);
  const y = parseInt((iso || '').split('-')[0]);
  return isNaN(y) ? null : y;
}

// Gibt true zurück wenn die Person mind. eine Quellenangabe hat
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
// Gibt [{personId, familyId, rule, severity, text, category}] zurück.
// severity: 'error' | 'warn' | 'info'
// category: 'kirchenbuch' | 'urkunde' | 'online'
// familyId: null bei Personen-Befunden, FAM-ID bei Familien-Befunden
function runValidation(db, config) {
  if (!db?.individuals) return [];
  const cfg = config || VAL_CONFIG_DEFAULTS;
  const disabled = cfg.disabled instanceof Set ? cfg.disabled : new Set(cfg.disabled || []);
  const thr = { ...VAL_CONFIG_DEFAULTS.thresholds, ...(cfg.thresholds || {}) };
  const results = [];

  function push(personId, rule, severity, text, category, familyId = null) {
    if (disabled.has(rule)) return;
    results.push({ personId, familyId, rule, severity, text, category });
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

    // P5 — Alter > Schwellenwert
    if (byear && dyear && (dyear - byear) > thr.maxAge)
      push(pid, 'AGE_OVER_MAX', 'warn',
        `Alter unrealistisch: ${dyear - byear} Jahre (Grenze: ${thr.maxAge})`, 'online');

    // P6 — Geburt nach Standesamt-Ära, keine Quelle
    if (byear && byear >= thr.staStAera && !_hasSources(p))
      push(pid, 'BIRTH_AFTER_STAERA', 'info',
        `Geburt ${byear} — Standesamtsurkunde suchen`, 'urkunde');

    // P7 — Geburtsort fehlt (nur wenn Geburtsdatum vorhanden)
    if (p.birth?.date && !p.birth?.place?.trim())
      push(pid, 'MISSING_BIRTHPLACE', 'info', 'Geburtsort fehlt', 'kirchenbuch');
  }

  // ─── Familien-Regeln ────────────────────────────────────────────────────────
  for (const [fid, f] of Object.entries(db.families || {})) {
    const my = _valYear(f.marr?.date);
    const husb = f.husb ? db.individuals[f.husb] : null;
    const wife = f.wife ? db.individuals[f.wife] : null;

    // F1 — Heirat vor Geburt des Vaters
    if (husb && my) {
      const hb = _valYear(husb.birth?.date);
      if (hb && my < hb)
        push(f.husb, 'MARR_BEFORE_BIRTH', 'error',
          `Heiratsjahr ${my} liegt vor eigener Geburt ${hb}`, 'urkunde', fid);
    }

    // F2 — Heirat vor Geburt der Mutter
    if (wife && my) {
      const wb = _valYear(wife.birth?.date);
      if (wb && my < wb)
        push(f.wife, 'MARR_BEFORE_BIRTH', 'error',
          `Heiratsjahr ${my} liegt vor eigener Geburt ${wb}`, 'urkunde', fid);
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
          if (age < thr.minMotherAge)
            push(f.wife, 'MOTHER_TOO_YOUNG', 'error',
              `Zu jung bei Geburt von ${cname}: ${age} Jahre`, 'kirchenbuch', fid);
          else if (age > thr.maxMotherAge)
            push(f.wife, 'MOTHER_TOO_OLD', 'warn',
              `Alter bei Geburt von ${cname}: ${age} Jahre`, 'kirchenbuch', fid);
        }
      }
      if (husb) {
        const hb = _valYear(husb.birth?.date);
        if (hb && (cy - hb) > thr.maxFatherAge)
          push(f.husb, 'FATHER_TOO_OLD', 'warn',
            `Alter bei Geburt von ${cname}: ${cy - hb} Jahre`, 'kirchenbuch', fid);
      }
    }
  }

  return results;
}
