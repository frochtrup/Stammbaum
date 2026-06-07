# Stammbaum PWA — Claude-Anweisungen

## Aktiver Entwicklungs-Branch

**Aktiver Branch: `v8-dev`**

Claude Code erstellt Worktrees automatisch vom `main`-Branch.
**Am Anfang jeder Session im Worktree zuerst ausführen:**

```bash
git fetch origin
git reset --hard origin/v8-dev
```

Danach sind alle Commits direkt auf dem Stand von `v8-dev`. Änderungen dann pushen mit:

```bash
git push origin HEAD:v8-dev
```

Kein cherry-pick, keine Konflikte.

## Pflichtregeln bei Code-Änderungen

- `sw.js`: `CACHE_NAME` bei jeder Änderung hochzählen (aktuell: `stammbaum-v891`)
- `ROADMAP.md`: sw-Version im Abschnitt "Aktueller Stand" synchron halten
- `ROADMAP.md` Handbuch-Stand: bei Code-Änderungen ohne Handbuch-Update → `*(veraltet — vXXX–vYYY noch nicht dokumentiert)*` setzen
- `HANDBUCH.html`: wenn aktualisiert, BEIDE Versionsfelder (`<p class="version">` + Footer) auf die **aktuelle** sw-Version setzen; gleichzeitig `ROADMAP.md` Handbuch-Stand auf `*(aktuell)*` korrigieren

## Projektpfad

`/Users/franzdecker/Library/Mobile Documents/com~apple~CloudDocs/Genealogie/AppDev/files/`

## Dev-Server

```bash
python3 -m http.server 8080
```
