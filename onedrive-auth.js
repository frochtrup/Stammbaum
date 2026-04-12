// ─────────────────────────────────────
//  ONEDRIVE AUTH (OAuth2 PKCE)
// ─────────────────────────────────────
const OD_CLIENT_ID = '688c9052-89c3-4d66-8ee0-c601e089336e';
const OD_SCOPES    = 'Files.ReadWrite offline_access User.Read';
const OD_AUTH_EP   = 'https://login.microsoftonline.com/common/oauth2/v2.0/authorize';
const OD_TOKEN_EP  = 'https://login.microsoftonline.com/common/oauth2/v2.0/token';
const OD_GRAPH     = 'https://graph.microsoft.com/v1.0';

function _odRedirectUri() {
  // /Stammbaum/index.html → /Stammbaum/  (muss mit registrierter URI übereinstimmen)
  return location.origin + location.pathname.replace(/[^/]*$/, '');
}
function _odIsConnected()  { return !!sessionStorage.getItem('od_access_token'); }

function _odUpdateUI() {
  const conn = _odIsConnected();
  const cb  = document.getElementById('odConnectBtn');
  const ob  = document.getElementById('odOpenBtn');
  const sb  = document.getElementById('odSaveBtn');
  if (cb)  cb.innerHTML = (conn ? '☁ &nbsp; OneDrive trennen' : '☁ &nbsp; OneDrive verbinden');
  if (ob)  ob.style.display  = conn ? '' : 'none';
  if (sb)  sb.style.display  = conn ? '' : 'none';
  // Settings-Button immer sichtbar (enthält auch lokale Pfade)
  const gb = document.getElementById('grampsExportBtn');
  if (gb)  gb.style.display = AppState.db ? '' : 'none';
  // SW-Version aus aktivem Cache-Namen auslesen
  const swVerEl   = document.getElementById('menuSwVersion');
  const swStateEl = document.getElementById('menuSwState');
  if (swVerEl) {
    if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
      caches.keys().then(keys => {
        const name = keys.find(k => k.startsWith('stammbaum-')) || keys[0] || '–';
        swVerEl.textContent   = 'SW: ' + name;
        if (swStateEl) swStateEl.textContent = 'Status: aktiv';
      });
    } else {
      swVerEl.textContent   = 'SW: nicht aktiv';
      if (swStateEl) swStateEl.textContent = 'Status: –';
    }
  }
}

function odToggle() { _odIsConnected() ? odLogout() : odLogin(); }

function odLogout() {
  ['od_access_token','od_refresh_token','od_token_expiry']
    .forEach(k => sessionStorage.removeItem(k));
  ['od_file_id','od_file_name']
    .forEach(k => localStorage.removeItem(k));
  _odUpdateUI();
  showToast('OneDrive getrennt');
}

async function odLogin() {
  const verifier  = _odCodeVerifier();
  const challenge = await _odCodeChallenge(verifier);
  sessionStorage.setItem('od_verifier', verifier);
  const p = new URLSearchParams({
    client_id: OD_CLIENT_ID, response_type: 'code',
    redirect_uri: _odRedirectUri(), scope: OD_SCOPES,
    code_challenge: challenge, code_challenge_method: 'S256', response_mode: 'query'
  });
  location.href = OD_AUTH_EP + '?' + p;
}

function _odCodeVerifier() {
  const a = new Uint8Array(64); crypto.getRandomValues(a);
  return btoa(String.fromCharCode(...a)).replace(/\+/g,'-').replace(/\//g,'_').replace(/=/g,'');
}
async function _odCodeChallenge(v) {
  const d = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(v));
  return btoa(String.fromCharCode(...new Uint8Array(d))).replace(/\+/g,'-').replace(/\//g,'_').replace(/=/g,'');
}

async function odHandleCallback() {
  const p     = new URLSearchParams(location.search);
  const code  = p.get('code');
  const error = p.get('error');
  history.replaceState({}, '', location.pathname);
  if (error || !code) { if (error) showToast('OneDrive: ' + (p.get('error_description') || error)); return; }
  const verifier = sessionStorage.getItem('od_verifier');
  sessionStorage.removeItem('od_verifier');
  if (!verifier) { showToast('OneDrive: Sitzung abgelaufen'); return; }
  try {
    const body = new URLSearchParams({
      client_id: OD_CLIENT_ID, grant_type: 'authorization_code',
      code, redirect_uri: _odRedirectUri(), code_verifier: verifier
    });
    const res  = await fetch(OD_TOKEN_EP, { method:'POST', headers:{'Content-Type':'application/x-www-form-urlencoded'}, body });
    const data = await res.json();
    if (data.access_token) {
      sessionStorage.setItem('od_access_token', data.access_token);
      sessionStorage.setItem('od_refresh_token', data.refresh_token || '');
      sessionStorage.setItem('od_token_expiry',  Date.now() + (data.expires_in - 60) * 1000);
      _odUpdateUI();
      showToast('✓ OneDrive verbunden');
    } else {
      showToast('OneDrive: ' + (data.error_description || 'Anmeldung fehlgeschlagen'));
    }
  } catch(e) { showToast('OneDrive: Netzwerkfehler'); }
}

async function _odGetToken() {
  const expiry = parseInt(sessionStorage.getItem('od_token_expiry') || '0');
  if (Date.now() < expiry) return sessionStorage.getItem('od_access_token');
  const rt = sessionStorage.getItem('od_refresh_token');
  if (!rt) { odLogin(); return null; }
  try {
    const body = new URLSearchParams({
      client_id: OD_CLIENT_ID, grant_type: 'refresh_token',
      refresh_token: rt, scope: OD_SCOPES, redirect_uri: _odRedirectUri()
    });
    const res  = await fetch(OD_TOKEN_EP, { method:'POST', headers:{'Content-Type':'application/x-www-form-urlencoded'}, body });
    const data = await res.json();
    if (data.access_token) {
      sessionStorage.setItem('od_access_token', data.access_token);
      if (data.refresh_token) sessionStorage.setItem('od_refresh_token', data.refresh_token);
      sessionStorage.setItem('od_token_expiry', Date.now() + (data.expires_in - 60) * 1000);
      return data.access_token;
    }
  } catch(e) { console.warn('[OD] Token-Refresh:', e); }
  odLogin(); return null;
}

// Stiller Token-Refresh — kein OAuth-Redirect bei Fehler (für Auto-Connect beim Start)
async function _odRefreshTokenSilent() {
  const expiry = parseInt(sessionStorage.getItem('od_token_expiry') || '0');
  if (Date.now() < expiry) return sessionStorage.getItem('od_access_token');
  const rt = sessionStorage.getItem('od_refresh_token');
  if (!rt) return null;
  try {
    const ctrl = new AbortController();
    const _to  = setTimeout(() => ctrl.abort(), 5000);
    const body = new URLSearchParams({
      client_id: OD_CLIENT_ID, grant_type: 'refresh_token',
      refresh_token: rt, scope: OD_SCOPES, redirect_uri: _odRedirectUri()
    });
    const res  = await fetch(OD_TOKEN_EP, { method:'POST', headers:{'Content-Type':'application/x-www-form-urlencoded'}, body, signal: ctrl.signal });
    clearTimeout(_to);
    const data = await res.json();
    if (data.access_token) {
      sessionStorage.setItem('od_access_token', data.access_token);
      if (data.refresh_token) sessionStorage.setItem('od_refresh_token', data.refresh_token);
      sessionStorage.setItem('od_token_expiry', Date.now() + (data.expires_in - 60) * 1000);
      return data.access_token;
    }
  } catch(e) { /* still — kein Log für normalen Offline-Fall */ }
  return null;
}

// OneDrive OAuth-Callback nach Redirect abfangen
window._odCallbackPromise = null;
if (location.search.includes('code=') || location.search.includes('error=')) {
  window._odCallbackPromise = odHandleCallback();
}
_odUpdateUI();
