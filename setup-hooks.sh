#!/usr/bin/env bash
# setup-hooks.sh — installiert lokales Pre-Commit-Gate für test-csp.js + test-unit.js
# Aufruf: ./setup-hooks.sh
#
# Hintergrund: .git/hooks/ ist nicht versionierbar — neue Worktrees / neue Geräte
# müssen den Hook lokal anlegen. Dieses Skript ist idempotent (überschreibt einen
# bestehenden Hook) und nutzt nur Bordmittel (osascript, bash).
#
# Nach der Installation läuft vor jedem `git commit`:
#   - osascript -l JavaScript test-csp.js
#   - osascript -l JavaScript test-unit.js
# Schlägt einer fehl, wird der Commit abgebrochen.
# Notfall-Skip (mit Begründung im Commit-Message verwenden):
#   git commit --no-verify

set -e

GIT_DIR=$(git rev-parse --git-dir 2>/dev/null) || {
  echo "✗ kein Git-Repository — bitte vom Projekt-Root aus aufrufen." >&2
  exit 1
}

HOOK_PATH="$GIT_DIR/hooks/pre-commit"

cat > "$HOOK_PATH" <<'HOOK_EOF'
#!/usr/bin/env bash
# Pre-Commit-Gate für Stammbaum PWA
# Verhindert, dass CSP-/Unit-Test-Regressionen unbemerkt eingehen.
# Quelle: setup-hooks.sh — bei Änderung dort nachziehen.

set -e

REPO_ROOT=$(git rev-parse --show-toplevel)
cd "$REPO_ROOT"

echo "→ Pre-Commit: test-csp.js"
if ! osascript -l JavaScript test-csp.js > /tmp/stammbaum-csp.out 2>&1; then
  echo "✗ test-csp.js fehlgeschlagen — Commit abgebrochen." >&2
  cat /tmp/stammbaum-csp.out >&2
  echo "" >&2
  echo "Notfall-Skip (mit Begründung im Commit-Message): git commit --no-verify" >&2
  exit 1
fi

echo "→ Pre-Commit: test-unit.js"
if ! osascript -l JavaScript test-unit.js > /tmp/stammbaum-unit.out 2>&1; then
  echo "✗ test-unit.js fehlgeschlagen — Commit abgebrochen." >&2
  tail -30 /tmp/stammbaum-unit.out >&2
  echo "" >&2
  echo "Notfall-Skip (mit Begründung im Commit-Message): git commit --no-verify" >&2
  exit 1
fi

# test-snapshot-place: verriegelt showPlaceDetail-Output gegen Refactor-Drift
# (SHOWPLACE-SPLIT, sw v949). Nutzt demo.ged + synthetisches PlaceObject —
# reproduzierbar auf jedem Worktree.
echo "→ Pre-Commit: test-snapshot-place.js"
if ! osascript -l JavaScript test-snapshot-place.js > /tmp/stammbaum-snap.out 2>&1; then
  echo "✗ test-snapshot-place.js fehlgeschlagen — Commit abgebrochen." >&2
  tail -30 /tmp/stammbaum-snap.out >&2
  echo "" >&2
  echo "Bei beabsichtigter UI-Änderung: --update neu erzeugen und Goldfile-Diff in den Commit nehmen:" >&2
  echo "  osascript -l JavaScript test-snapshot-place.js --update" >&2
  exit 1
fi

echo "✓ Pre-Commit-Gate grün (test-csp + test-unit + test-snapshot-place)."
HOOK_EOF

chmod +x "$HOOK_PATH"
echo "✓ Pre-Commit-Hook installiert: $HOOK_PATH"
echo ""
echo "Vor jedem Commit laufen:"
echo "  - osascript -l JavaScript test-csp.js   (~0.5 s)"
echo "  - osascript -l JavaScript test-unit.js  (~5 s)"
echo ""
echo "Notfall-Skip: git commit --no-verify"
