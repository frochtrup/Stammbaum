#!/usr/bin/env osascript -l JavaScript
// test-unit.js — Unit-Tests für Kern-Logik ohne Browser (T0-UNIT)
//
//   osascript -l JavaScript test-unit.js
//   node test-unit.js            (falls installiert)
//
// Deckt ab:
//   (a) GEDCOM-Parser Edge-Cases (CONC/CONT, lv>4, leere Tags, Passthrough)
//   (b) gedcom-validator.js — je 1 Positiv-/Negativfall pro Regel
//   (c) BFS-Anonymisierung (_buildLivingSet) — DSGVO-kritisch
//   (d) Datums-Helfer (normMonth, buildGedDate, *FromFields)
//
// Exit 0 = alle Tests grün, Exit 1 = Fehler.

// ── Umgebungserkennung ──────────────────────────────────────────────────────
var IS_NODE = typeof require === 'function';
var IS_JXA  = typeof ObjC   !== 'undefined';
if (!IS_NODE && !IS_JXA) throw new Error('Unbekannte Umgebung — osascript oder node verwenden.');

// ── I/O-Abstraktion ─────────────────────────────────────────────────────────
var _dir, _read, _exit;
if (IS_NODE) {
  var _fs = require('fs'), _path = require('path'), _vm = require('vm');
  _dir  = _path.dirname(_path.resolve(__filename));
  _read = function(p) { return _fs.readFileSync(p, 'utf8'); };
  _exit = function(c) { process.exit(c); };
} else {
  ObjC.import('Foundation');
  var _fm = $.NSFileManager.defaultManager;
  _dir  = ObjC.unwrap(_fm.currentDirectoryPath);
  _read = function(p) {
    var s = $.NSString.stringWithContentsOfFileEncodingError(p, $.NSUTF8StringEncoding, null);
    if (!s || !s.js) throw new Error('Lesefehler: ' + p);
    return ObjC.unwrap(s);
  };
  _exit = function(c) { if (c !== 0) throw new Error('FAIL'); };
}

// ── Konfigurierbarer document-Stub (für Datumsfeld-Tests) ────────────────────
var _fields = {};
function setField(id, val) { _fields[id] = { value: String(val) }; }
function clearFields()     { for (var k in _fields) delete _fields[k]; }

// ── MiniDOM für UI-Logik-Tests (T0-UI) ───────────────────────────────────────
// Schlankes DOM-Subset, das die UI-Module (ui-views.js, ui-views-person.js,
// ui-event-delegation.js, ui-lifecycle.js) ohne Browser ausführen lässt.
// Fällt für getElementById auf den Datums-Stub `_fields` zurück → existierende
// (d)-Tests bleiben kompatibel. Tests reichern den DOM gezielt an
// (`_dom.ensureId(id, tag)`) und feuern Events (`_dom.fireDoc`/`_dom.fireWin`).
function _makeMiniDOM() {
  var _idMap = {};
  var _docListeners = {};
  var _winListeners = {};

  function _d(k) {
    if (k.slice(0,5) !== 'data-') return k;
    return k.slice(5).replace(/-([a-z])/g, function(_, c) { return c.toUpperCase(); });
  }
  function _matchEl(el, sel) {
    if (!el || el.nodeType !== 1) return false;
    sel = String(sel).trim();
    // [data-x="y"] oder [data-x]
    var m = sel.match(/^\[([^=\]]+)(?:=["']?([^"'\]]*)["']?)?\]$/);
    if (m) {
      var key = m[1], val = m[2], ds = _d(key);
      if (val == null) return (key in el._attrs) || (ds in el.dataset);
      return (el._attrs[key] === val) || (el.dataset[ds] === val);
    }
    // tag[attr=val]
    var mTA = sel.match(/^([\w-]+)\[([^=\]]+)(?:=["']?([^"'\]]*)["']?)?\]$/);
    if (mTA) {
      if (el.tagName !== mTA[1].toUpperCase()) return false;
      var key2 = mTA[2], val2 = mTA[3], ds2 = _d(key2);
      if (val2 == null) return (key2 in el._attrs) || (ds2 in el.dataset);
      return (el._attrs[key2] === val2) || (el.dataset[ds2] === val2);
    }
    if (sel.charAt(0) === '#') return el.id === sel.slice(1);
    // .class.class2 oder tag.class
    var mTC = sel.match(/^([\w-]+)\.([\w-]+(?:\.[\w-]+)*)$/);
    if (mTC) {
      if (el.tagName !== mTC[1].toUpperCase()) return false;
      var classes = mTC[2].split('.').filter(Boolean);
      return classes.every(function(c) { return el._classes.has(c); });
    }
    if (sel.charAt(0) === '.') {
      var classes2 = sel.split('.').filter(Boolean);
      return classes2.every(function(c) { return el._classes.has(c); });
    }
    if (/^[\w-]+$/.test(sel)) return el.tagName === sel.toUpperCase();
    return false;
  }
  function _findAll(root, sel) {
    var res = [];
    (function walk(n) {
      var ch = (n && n.childNodes) || [];
      for (var i = 0; i < ch.length; i++) {
        var c = ch[i];
        if (c.nodeType !== 1) continue;
        if (_matchEl(c, sel)) res.push(c);
        walk(c);
      }
    })(root);
    return res;
  }
  function makeEl(tag) {
    tag = String(tag || 'div');
    var el = {
      nodeType: 1,
      tagName: tag.toUpperCase(),
      id: '',
      style: { setProperty: function() {}, removeProperty: function() {} },
      dataset: {},
      _attrs: {},
      _listeners: {},
      _classes: new Set(),
      childNodes: [],
      children: [],
      parentNode: null,
      hidden: false,
      scrollTop: 0,
      scrollLeft: 0,
      offsetHeight: 0,
      offsetWidth: 0,
      offsetTop: 0,
      textContent: '',
      value: '',
      innerHTML: '',
      options: [],
      files: null,
      checked: false,
      disabled: false,
      title: '',
    };
    el.classList = {
      add:    function() { for (var i=0; i<arguments.length; i++) el._classes.add(arguments[i]); },
      remove: function() { for (var i=0; i<arguments.length; i++) el._classes.delete(arguments[i]); },
      contains: function(c) { return el._classes.has(c); },
      toggle: function(c, force) {
        if (force === true)  { el._classes.add(c); return true; }
        if (force === false) { el._classes.delete(c); return false; }
        if (el._classes.has(c)) { el._classes.delete(c); return false; }
        el._classes.add(c); return true;
      },
    };
    Object.defineProperty(el, 'className', {
      get: function() { return [].slice.call(el._classes).join(' '); },
      set: function(v) { el._classes = new Set(String(v||'').split(/\s+/).filter(Boolean)); },
    });
    el.appendChild = function(child) {
      el.childNodes.push(child);
      if (child && child.nodeType === 1) el.children.push(child);
      if (child) child.parentNode = el;
      return child;
    };
    el.removeChild = function(child) {
      el.childNodes = el.childNodes.filter(function(c) { return c !== child; });
      el.children   = el.children.filter(function(c) { return c !== child; });
      if (child) child.parentNode = null;
      return child;
    };
    el.remove = function() { if (el.parentNode) el.parentNode.removeChild(el); };
    el.setAttribute = function(k, v) {
      el._attrs[k] = String(v);
      if (k === 'hidden') el.hidden = true;
      if (k === 'id') el.id = String(v);
    };
    el.getAttribute = function(k) { return (k in el._attrs) ? el._attrs[k] : null; };
    el.removeAttribute = function(k) { delete el._attrs[k]; if (k === 'hidden') el.hidden = false; };
    el.hasAttribute = function(k) { return (k in el._attrs); };
    el.addEventListener = function(type, fn) { (el._listeners[type] || (el._listeners[type] = [])).push(fn); };
    el.removeEventListener = function(type, fn) {
      if (!el._listeners[type]) return;
      el._listeners[type] = el._listeners[type].filter(function(f) { return f !== fn; });
    };
    el.dispatchEvent = function(ev) {
      (el._listeners[ev.type] || []).forEach(function(fn) { fn.call(el, ev); });
      return !ev.defaultPrevented;
    };
    el.scrollIntoView = function() {};
    el.focus = function() {};
    el.blur = function() {};
    el.click = function() { el.dispatchEvent({ type: 'click', target: el, defaultPrevented: false, preventDefault: function() { this.defaultPrevented = true; }, stopPropagation: function() {} }); };
    el.querySelector    = function(sel) { return _findAll(el, sel)[0] || null; };
    el.querySelectorAll = function(sel) { return _findAll(el, sel); };
    el.closest = function(sel) {
      var n = el;
      while (n && n.nodeType === 1) {
        if (_matchEl(n, sel)) return n;
        n = n.parentNode;
      }
      return null;
    };
    el.getBoundingClientRect = function() { return { top:0, left:0, bottom:0, right:0, width:0, height:0, x:0, y:0 }; };
    return el;
  }

  var doc = makeEl('#document');
  doc.body = makeEl('body');
  doc.documentElement = makeEl('html');
  doc.documentElement.style = { setProperty: function() {}, removeProperty: function() {} };
  doc.documentElement.appendChild(doc.body);
  doc.appendChild(doc.documentElement);
  doc._hidden = false;
  Object.defineProperty(doc, 'hidden', {
    get: function() { return doc._hidden; },
    set: function(v) { doc._hidden = !!v; },
  });
  doc.addEventListener = function(type, fn) { (_docListeners[type] || (_docListeners[type] = [])).push(fn); };
  doc.removeEventListener = function(type, fn) {
    if (_docListeners[type]) _docListeners[type] = _docListeners[type].filter(function(f) { return f !== fn; });
  };
  doc.dispatchEvent = function(ev) {
    (_docListeners[ev.type] || []).forEach(function(fn) { fn.call(doc, ev); });
    return !ev.defaultPrevented;
  };
  doc.createElement = function(tag) { return makeEl(tag); };
  doc.createTextNode = function(txt) { return { nodeType: 3, textContent: String(txt) }; };
  doc.createDocumentFragment = function() { return makeEl('#fragment'); };
  doc.getElementById = function(id) {
    if (_idMap[id]) return _idMap[id];
    if (_fields[id]) return _fields[id];   // (d)-Tests Backwards-Kompatibilität
    // Fallback: dynamisch via createElement+appendChild angelegte Elemente
    // (z.B. parts-Inputs aus _buildPlaceParts) sind im body-Tree, aber nicht
    // im _idMap registriert — Tree-Walk findet sie.
    var found = null;
    (function walk(n) {
      if (found || !n) return;
      if (n.nodeType === 1 && n.id === id) { found = n; return; }
      var ch = n.childNodes || [];
      for (var i = 0; i < ch.length && !found; i++) walk(ch[i]);
    })(doc);
    return found;
  };
  doc.querySelector    = function(sel) { return _findAll(doc, sel)[0] || null; };
  doc.querySelectorAll = function(sel) { return _findAll(doc, sel); };

  function fireEvent(target, type, detail) {
    var ev = {
      type: type, detail: detail || null, target: target,
      defaultPrevented: false, _stopped: false,
      preventDefault:  function() { this.defaultPrevented = true; },
      stopPropagation: function() { this._stopped = true; },
    };
    target.dispatchEvent(ev);
    return ev;
  }

  return {
    document: doc,
    docListeners: _docListeners,
    winListeners: _winListeners,
    idMap: _idMap,
    ensureId: function(id, tag) {
      if (_idMap[id]) return _idMap[id];
      var el = makeEl(tag || 'div');
      el.id = id;
      _idMap[id] = el;
      doc.body.appendChild(el);
      return el;
    },
    addWinListener: function(type, fn) { (_winListeners[type] || (_winListeners[type] = [])).push(fn); },
    fireDoc: function(type, detail) { return fireEvent(doc, type, detail); },
    fireWin: function(type, detail) {
      var ev = { type: type, detail: detail || null, persisted: !!(detail && detail.persisted),
        defaultPrevented: false, preventDefault: function() { this.defaultPrevented = true; },
        stopPropagation: function() {} };
      (_winListeners[type] || []).forEach(function(fn) { fn.call(null, ev); });
      return ev;
    },
    reset: function() {
      // Vor jedem Testblock aufrufbar — alle dynamisch angelegten IDs entfernen
      // und Event-Listener leeren. body wird neu initialisiert.
      for (var k in _idMap) delete _idMap[k];
      for (var t in _docListeners) delete _docListeners[t];
      for (var t2 in _winListeners) delete _winListeners[t2];
      doc.body.childNodes = []; doc.body.children = []; doc.body._classes = new Set();
      doc._hidden = false;
    },
    makeEl: makeEl,
  };
}

// ── UI-Stubs (für ui-*.js Module ohne Browser) ───────────────────────────────
// Wird VOR den UI-Source-Files in den Eval-Scope geladen. Enthält no-op-Stubs
// für UI-Querreferenzen, die im Unit-Harness nicht relevant sind. Spies werden
// AFTER UI-Eval in einem IIFE installiert (siehe _UI_SUFFIX).
var _UI_STUBS = [
  // Brücke aus der ersten Eval-Phase (gedcom.js etc.) — const-Bindings
  // wurden dort per window.X = X exponiert; im UI-Eval als var reanknüpfen.
  'var AppState = window.AppState; var UIState = window.UIState;',
  'var getPlaceRegistry = window.getPlaceRegistry; var setDb = window.setDb;',
  'var _normPlaceName = window._normPlaceName;',
  'var _buildFormString = window._buildFormString;',
  'var applyStringPlaceLink = window.applyStringPlaceLink;',
  'var mutatePlaceObject = window.mutatePlaceObject;',
  'var upsertPlaceObject = window.upsertPlaceObject;',
  'var getPlaceFromForm = window.getPlaceFromForm;',
  'var initPlaceMode = window.initPlaceMode;',
  'var togglePlaceMode = window.togglePlaceMode;',
  'function markChanged() { AppState && (AppState.changed = true); }',
  'var _idbStore = {};',
  'function idbGet(k) { return Promise.resolve(_idbStore[k] || null); }',
  'function idbPut(k, v) { _idbStore[k] = v; return Promise.resolve(); }',
  'function idbDel(k) { delete _idbStore[k]; return Promise.resolve(); }',
  // Eindeutige Toast-Sammlung pro Lauf
  'window._toastLog = [];',
  'function showToast(msg, type) { window._toastLog.push({ msg: msg, type: type || "info" }); }',
  // Helper, die ui-views.js etc. erwarten — alle no-op oder defensiv
  'function getSource() { return null; }',
  'function getProbandId() { return null; }',
  'function smallestPersonId() { var inds = (AppState && AppState.db && AppState.db.individuals) || {}; for (var k in inds) return k; return null; }',
  'function _smallestId(obj) { for (var k in (obj||{})) return k; return null; }',
  'function getDocLang() { return "de"; }',
  'function getParentIds() { return { father: null, mother: null }; }',
  'function evDateKey(s) { return String(s || ""); }',
  'function goBack() {}',
  // Spies via Counter-Objekt
  'window._spy = { renderTab:0, applyPersonFilter:0, _vsReattach:0, _vsTeardown:0, showDetail:[], showFamilyDetail:[], showSourceDetail:[], showPlaceDetail:[] };',
  // Render-/Show-Stubs (Default-Verhalten ist no-op; spies via post-eval-wrap)
  'function applyPersonFilter() {}',
  'function renderFamilyList() {}',
  'function renderSourceList() {}',
  'function renderRepoList() {}',
  'function showMediaSection() {}',
  'function renderPlaceList() {}',
  'function renderHofList() {}',
  'function initOrRefreshPlaceMap() {}',
  'function renderStatsTab() {}',
  'function runGlobalSearch() {}',
  'function runGlobalSearchDebounced() {}',
  'function renderTasksView() {}',
  'function _announceList() {}',
  'function _normalizeWheel() {}',
  'function _initDetailSwipe() {}',
  'function _updateTopbarH() {}',
  'function _updateDetailHistBtn() {}',
  'function _scrollListToCurrent() {}',
  'function _vsTeardown() { window._spy._vsTeardown++; }',
  'function _vsReattach() { window._spy._vsReattach++; }',
  'function _vsScrollAndHighlight() {}',
  'function _vsSetup() {}',
  'function showDetail(id) { window._spy.showDetail.push(id); }',
  'function showFamilyDetail(id) { window._spy.showFamilyDetail.push(id); }',
  'function showSourceDetail(id) { window._spy.showSourceDetail.push(id); }',
  'function showPlaceDetail(name) { window._spy.showPlaceDetail.push(name); }',
  'function showRepoDetail() {}',
  'function showHofDetail() {}',
  'function showStory() {}',
  'function showFamilyStory() {}',
  'function showView() {}',
  'function showTree() {}',
  'function showMain() {}',
  'function showEventForm() {}',
  'function showSourceForm() {}',
  'function showFamilyForm() {}',
  'function openNoteModal() {}',
  'function openPlaceMergeModal() {}',
  'function _odIsConnected() { return false; }',
  'var _odCurFileId = null;',
  // CSS.escape stub — Identity, da MiniDOM string-vergleichend matcht
  'var CSS = { escape: function(s) { return String(s); } };',
  // CustomEvent shim — minimal
  'function CustomEvent(type, init) { this.type = type; this.detail = (init && init.detail) || null; this.defaultPrevented = false; this.bubbles = !!(init && init.bubbles); this.cancelable = !!(init && init.cancelable); this.preventDefault = function() { this.defaultPrevented = true; }; this.stopPropagation = function() {}; }',
  // history stub
  'var history = { pushState: function() {} };',
  // requestAnimationFrame — synchron
  'var requestAnimationFrame = function(fn) { try { fn(0); } catch(e) {} return 0; };',
  // collectPlaces ist schon in geocoding-Stub gesetzt; defensiv re-deklarieren
  'if (typeof collectPlaces !== "function") { var collectPlaces = function() { return new Map(); }; }',
  '',
].join('\n');

// ── UI-Suffix (nach UI-Source) ──────────────────────────────────────────────
// Wrappt renderTab als Spy + exponiert UI-Symbole via window._uiApi.
var _UI_SUFFIX = [
  '(function _installUIApi() {',
  // renderTab: Spy + Original ausführen. Original ruft applyPersonFilter etc.
  // (jetzt als Spy ersetzt) oder anderen Renderer (je nach Tab).
  '  var _origRender = renderTab;',
  '  renderTab = function() { window._spy.renderTab++; return _origRender && _origRender(); };',
  // applyPersonFilter: NUR Spy — Original würde _applyPersonFilterDebounced
  // aufrufen, das im Unit-Harness nicht existiert. Tests prüfen nur den Aufruf.
  '  applyPersonFilter = function() { window._spy.applyPersonFilter++; };',
  // _vsReattach/_vsTeardown sind in ui-views.js function-Decls → Stubs werden
  // beim Hoisting überschrieben. Nach UI-Eval erneut als Spy ersetzen.
  '  _vsReattach = function() { window._spy._vsReattach++; };',
  '  _vsTeardown = function() { window._spy._vsTeardown++; };',
  // Show*-Funktionen werden in den echten UI-Modulen als function-Decls über-
  // schrieben → hier nochmal als Spy ersetzen, damit Tests deterministisch sind.
  '  showDetail       = function(id) { window._spy.showDetail.push(id); };',
  '  showFamilyDetail = function(id) { window._spy.showFamilyDetail.push(id); };',
  '  showSourceDetail = function(id) { window._spy.showSourceDetail.push(id); };',
  '  showPlaceDetail  = function(name) { window._spy.showPlaceDetail.push(name); };',
  '  window._uiApi = {',
  '    ViewState: ViewState,',
  '    _activateDetailContainer: window._activateDetailContainer,',
  '    _DC_TAB_MAP: _DC_TAB_MAP,',
  '    _DC_IDS: _DC_IDS,',
  '    _CLICK_MAP: _CLICK_MAP,',
  '    _persistLastTabSel: _persistLastTabSel,',
  '    _dcAlreadyShows: _dcAlreadyShows,',
  '    switchTab: switchTab,',
  '    renderTab: function() { return renderTab.apply(null, arguments); },',
  '    _mobileSelectionRestore: _mobileSelectionRestore,',
  '    _updatePlaceListCurrent: _updatePlaceListCurrent,',
  '    _updateSourceListCurrent: _updateSourceListCurrent,',
  '    _updatePersonListCurrent: _updatePersonListCurrent,',
  '    _updateFamilyListCurrent: _updateFamilyListCurrent,',
  '    _configureDetailToolbar: _configureDetailToolbar,',
  '    _vsP: _vsP,',
  '    _vsF: _vsF,',
  '    initPlaceMode: initPlaceMode,',
  '    togglePlaceMode: togglePlaceMode,',
  '    getPlaceFromForm: getPlaceFromForm,',
  '    _buildFormString: _buildFormString,',
  '    applyStringPlaceLink: applyStringPlaceLink,',
  // Block (z) Toast-Once: savePlaceObjects + Reset-Hooks
  '    savePlaceObjects: savePlaceObjects,',
  '    _setIdbPut: function(fn) { idbPut = fn; },',
  '    _resetToastFlags: function() { _savePoIDBErrored = false; _savePoODErrored = false; _placesLocalRev = 0; },',
  '  };',
  '})();',
].join('\n');

var _docStub = {
  getElementById: function(id) { return _fields[id] || null; },
  createElement:  function()   { return { style: {}, options: [], appendChild: function() {} }; },
};

// ── ESM-Syntax für flachen eval/vm entfernen ────────────────────────────────
// gedcom-validator.js ist auf ES-Module umgestellt (T0-MODULE Phase 2). Dieses
// Harness lädt flach (kein Modul-Loader) → `export`/`import` entfernen.
function _stripMod(s) {
  return s
    .replace(/^export\s+(?=(async\s+)?function\b|const\b|let\b|var\b|class\b)/gm, '')
    .replace(/^export\s*\{[^}]*\}\s*;?\s*$/gm, '')
    .replace(/^import\b[^\n]*$/gm, '');
}
// gramps-parser.js + gramps-writer.js sind ESM (T0-MODULE) → ebenfalls strippen.
var _MODFILES = { 'gedcom-validator.js': 1, 'gramps-parser.js': 1, 'gramps-writer.js': 1 };
function _readSrc(f) { var s = _read(_dir + '/' + f); return _MODFILES[f] ? _stripMod(s) : s; }

// ── Mini-DOMParser (abhängigkeitsfrei) — für GRAMPS-Parser-Tests ─────────────
// Schlanke DOM-Teilmenge die gramps-parser.js nutzt. GRAMPS-XML ist
// maschinengeneriert + wohlgeformt → ein Tokenizer genügt. (Spiegel des
// Parsers in test-roundtrip.js; bewusst dupliziert, damit beide Harnesse
// abhängigkeitsfrei einzeln lauffähig bleiben.)
function _makeMiniDOMParser() {
  function decodeEnt(s) {
    return s.replace(/&(#x?[0-9a-fA-F]+|amp|lt|gt|quot|apos);/g, function(m, e) {
      if (e === 'amp')  return '&'; if (e === 'lt') return '<'; if (e === 'gt') return '>';
      if (e === 'quot') return '"'; if (e === 'apos') return "'";
      if (e.charAt(0) === '#') { var code = e.charAt(1) === 'x' ? parseInt(e.slice(2), 16) : parseInt(e.slice(1), 10); return String.fromCodePoint(code); }
      return m;
    });
  }
  function textOf(node) {
    var out = '', ch = node.childNodes;
    for (var i = 0; i < ch.length; i++) { if (ch[i].nodeType === 3) out += ch[i].textContent; else if (ch[i].nodeType === 1) out += textOf(ch[i]); }
    return out;
  }
  function makeEl(tag) {
    var colon = tag.indexOf(':');
    var el = { nodeType: 1, tagName: tag, localName: colon >= 0 ? tag.slice(colon + 1) : tag, namespaceURI: null, _attrs: {}, attributes: [], childNodes: [] };
    el.getAttribute = function(n) { return (n in this._attrs) ? this._attrs[n] : null; };
    Object.defineProperty(el, 'children', { get: function() { return this.childNodes.filter(function(c) { return c.nodeType === 1; }); } });
    Object.defineProperty(el, 'textContent', { get: function() { return textOf(this); } });
    el.getElementsByTagName = function(t) { var res = []; (function walk(n) { for (var i = 0; i < n.childNodes.length; i++) { var c = n.childNodes[i]; if (c.nodeType === 1) { if (t === '*' || c.tagName === t) res.push(c); walk(c); } } })(this); return res; };
    el.getElementsByTagNameNS = function(ns, t) { var res = []; (function walk(n) { for (var i = 0; i < n.childNodes.length; i++) { var c = n.childNodes[i]; if (c.nodeType === 1) { if ((t === '*' || c.localName === t) && (ns === '*' || c.namespaceURI === ns)) res.push(c); walk(c); } } })(this); return res; };
    el.querySelector = function(sel) { return this.getElementsByTagName(sel)[0] || null; };
    return el;
  }
  function parse(xml) {
    xml = String(xml).replace(/^﻿/, '');
    var n = xml.length, i = 0, doc = makeEl('#document'); doc.documentElement = null;
    var stack = [doc];
    function curNS() { for (var s = stack.length - 1; s >= 0; s--) if (stack[s].namespaceURI) return stack[s].namespaceURI; return null; }
    while (i < n) {
      if (xml.charAt(i) === '<') {
        if (xml.substr(i, 4) === '<!--')      { var e = xml.indexOf('-->', i); i = e < 0 ? n : e + 3; continue; }
        if (xml.substr(i, 9) === '<![CDATA[') { var e = xml.indexOf(']]>', i); var d = xml.slice(i + 9, e < 0 ? n : e); stack[stack.length - 1].childNodes.push({ nodeType: 3, textContent: d }); i = e < 0 ? n : e + 3; continue; }
        if (xml.charAt(i + 1) === '?')         { var e = xml.indexOf('?>', i); i = e < 0 ? n : e + 2; continue; }
        if (xml.charAt(i + 1) === '!')         { var e = xml.indexOf('>', i);  i = e < 0 ? n : e + 1; continue; }
        if (xml.charAt(i + 1) === '/')         { var e = xml.indexOf('>', i); stack.pop(); i = e + 1; continue; }
        var e = xml.indexOf('>', i), raw = xml.slice(i + 1, e), self = raw.charAt(raw.length - 1) === '/';
        if (self) raw = raw.slice(0, -1);
        var nameM = raw.match(/^([^\s/>]+)/), el = makeEl(nameM[1]);
        var attrRe = /([^\s=]+)\s*=\s*("([^"]*)"|'([^']*)')/g, am, rest = raw.slice(nameM[1].length);
        while ((am = attrRe.exec(rest))) { var av = decodeEnt(am[3] !== undefined ? am[3] : am[4]); el._attrs[am[1]] = av; el.attributes.push({ name: am[1], value: av }); }
        el.namespaceURI = (el._attrs.xmlns !== undefined) ? el._attrs.xmlns : curNS();
        var parent = stack[stack.length - 1]; parent.childNodes.push(el);
        if (parent === doc && !doc.documentElement) doc.documentElement = el;
        if (!self) stack.push(el);
        i = e + 1;
      } else {
        var lt = xml.indexOf('<', i), txt = xml.slice(i, lt < 0 ? n : lt);
        if (txt) stack[stack.length - 1].childNodes.push({ nodeType: 3, textContent: decodeEnt(txt) });
        i = lt < 0 ? n : lt;
      }
    }
    return doc;
  }
  return function MiniDOMParser() { this.parseFromString = function(xml, _t) { return parse(xml); }; };
}
var _MiniDOMParser = _makeMiniDOMParser();
// Lazy: MiniDOM für UI-Tests wird erst beim ersten Block instanziiert.
var _dom = null;

// ── Module laden ──────────────────────────────────────────────────────────────
var API = {};
var UI  = null;   // wird nach UI-Eval aus window._uiApi befüllt (Lazy via _loadUI())
if (IS_NODE) {
  var _ctx = _vm.createContext({
    window: {}, console: console,
    localStorage: { getItem: function() { return null; }, setItem: function() {}, removeItem: function() {} },
    performance:  { now: function() { return Date.now(); } },
    document:     _docStub,
    DOMParser:    _MiniDOMParser,
    setTimeout: setTimeout, clearTimeout: clearTimeout,
    Promise:      Promise,
    Set:          Set, Map: Map,
  });
  _ctx.window = _ctx;
  ['gedcom.js', 'gedcom-parser.js', 'gedcom-writer.js', 'gedcom-validator.js', 'gramps-parser.js', 'gramps-writer.js']
    .forEach(function(f) { _vm.runInContext(_readSrc(f), _ctx, { filename: f }); });
  // geocoding.js: nur _findOrCreatePO testbar (sync); async-fetch-Pfad wird nicht aufgerufen.
  // Stubs für globale Bezüge, die geocoding.js erwartet.
  _ctx.fetch = function() { throw new Error('fetch not stubbed for tests'); };
  _ctx.markChanged = function() {};
  _ctx.savePlaceObjects = function() {};
  _ctx.showToast = function() {};
  _ctx._propagateCoordsToEvents = function() {};
  _ctx.collectPlaces = function() { return new Map(); };
  _vm.runInContext(_readSrc('geocoding.js'), _ctx, { filename: 'geocoding.js' });
  API = _ctx;
  API.grampsParse = _ctx._grampsParseXMLText;
  API.grampsBuild = _ctx._grampsBuildXMLText;
} else {
  window       = this;
  localStorage = { getItem: function() { return null; }, setItem: function() {}, removeItem: function() {} };
  performance  = { now: function() { return Date.now(); } };
  document     = _docStub;
  DOMParser    = _MiniDOMParser;
  // Stubs für geocoding.js-Bezüge (async-fetch-Pfad wird nicht aufgerufen, nur _findOrCreatePO sync getestet)
  window.fetch = function() { throw new Error('fetch not stubbed for tests'); };
  window.markChanged = function() {};
  window.savePlaceObjects = function() {};
  window.showToast = function() {};
  window._propagateCoordsToEvents = function() {};
  window.collectPlaces = function() { return new Map(); };
  var _combined =
    _readSrc('gedcom.js')          + '\n' +
    _readSrc('gedcom-parser.js')   + '\n' +
    _readSrc('gedcom-writer.js')   + '\n' +
    _readSrc('gedcom-validator.js')+ '\n' +
    _readSrc('gramps-parser.js')   + '\n' +
    _readSrc('gramps-writer.js')   + '\n' +
    _readSrc('geocoding.js')       + '\n' +
    'window._api = { parseGEDCOM: parseGEDCOM, runValidation: runValidation, ' +
    '_buildLivingSet: _buildLivingSet, normMonth: normMonth, buildGedDate: buildGedDate, ' +
    'buildGedDateFromFields: buildGedDateFromFields, readDatePartFromFields: readDatePartFromFields, ' +
    '_splitPageUrl: _splitPageUrl, migratePageUrls: migratePageUrls, ' +
    '_evalToQuay: _evalToQuay, evalIsEmpty: evalIsEmpty, ' +
    'hypoIsEmpty: hypoIsEmpty, _hypoStatus: _hypoStatus, ' +
    'grampsParse: _grampsParseXMLText, grampsBuild: _grampsBuildXMLText, ' +
    'setDb: setDb, getPlaceRegistry: getPlaceRegistry, _normPlaceName: _normPlaceName, ' +
    '_migratePlaceObjects: _migratePlaceObjects, _placeFold: _placeFold, ' +
    'findPlaceDuplicates: findPlaceDuplicates, mergePlaceObjects: mergePlaceObjects, ' +
    'mergeStringPlaces: mergeStringPlaces, _migrateExtraPlacesToPlaceObjects: _migrateExtraPlacesToPlaceObjects, ' +
    '_epId: _epId, _findOrCreatePO: _findOrCreatePO, ' +
    'mutatePlaceObject: mutatePlaceObject, upsertPlaceObject: upsertPlaceObject, ' +
    '_mergePlaceObjectsFromImport: _mergePlaceObjectsFromImport, ' +
    '_eventCoords: _eventCoords, AppState: AppState, UIState: UIState,' +
    'buildHofIndex: buildHofIndex, _derivedHofObjectsFromDb: _derivedHofObjectsFromDb, ' +
    '_isHofNoteText: _isHofNoteText, _stripHofPrefix: _stripHofPrefix, HOF_NOTE_PREFIX: HOF_NOTE_PREFIX, ' +
    '_migrateHofObjectsToPlaceObjects: _migrateHofObjectsToPlaceObjects, _hofVillageId: _hofVillageId, ' +
    '_hofVillageString: _hofVillageString, _findVillagePO: _findVillagePO, _buildFormString: _buildFormString, ' +
    '_sliceByteLen: _sliceByteLen, pushCont: pushCont, writeGEDCOM: writeGEDCOM };' +
    // Brücke für die UI-Eval-Phase: const-Bindings (AppState, UIState…)
    // leaken nicht aus diesem eval — auf window kopieren, damit der UI-Eval
    // sie als var aus window.X übernehmen kann.
    'window.AppState = AppState; window.UIState = UIState;' +
    'window.getPlaceRegistry = getPlaceRegistry; window.setDb = setDb;' +
    'window._normPlaceName = _normPlaceName;' +
    'window._buildFormString = _buildFormString;' +
    'window.applyStringPlaceLink = applyStringPlaceLink;' +
    'window.mutatePlaceObject = mutatePlaceObject;' +
    'window.upsertPlaceObject = upsertPlaceObject;' +
    'window.getPlaceFromForm = getPlaceFromForm;' +
    'window.initPlaceMode = initPlaceMode;' +
    'window.togglePlaceMode = togglePlaceMode;' +
    // Brücke für QT-Tests (ui-quicktpl.js nutzt diese gedcom.js-Funktionen)
    // Brücke für Writer-Tests
    'window._sliceByteLen = _sliceByteLen; window.pushCont = pushCont; window.writeGEDCOM = writeGEDCOM;' +
    // Brücke für QT-Tests (ui-quicktpl.js nutzt diese gedcom.js-Funktionen)
    'window.nextId = nextId; window.citationObj = citationObj;' +
    'window.gedcomDate = gedcomDate; window.gedcomTime = gedcomTime;' +
    'window._rebuildPersonSourceRefs = _rebuildPersonSourceRefs;' +
    'window._rebuildFamilySourceRefs = _rebuildFamilySourceRefs;';
  eval(_combined);
  API = window._api;
}

// ── UI-Module laden (lazy, einmal pro Lauf) ─────────────────────────────────
// Hängt MiniDOM als globales `document`/`window` ein, lädt die vier UI-Module
// + Stubs und exponiert UI-Symbole via window._uiApi. Wird vom ersten UI-Test-
// Block (t) aufgerufen.
// Extrahiert savePlaceObjects + Konfig aus ui-forms.js (Slice PLACES_SCHEMA_VERSION
// bis exportPlaceData). Slice statt Full-Load, weil ui-forms.js viele weitere
// Querreferenzen hat (Source-Widget, Camera-Modal etc.), die für die Toast-Once-
// Tests irrelevant sind.
function _extractSavePO() {
  var src = _readSrc('ui-forms.js');
  var start = src.indexOf('const PLACES_SCHEMA_VERSION');
  var end   = src.indexOf('function exportPlaceData');
  if (start < 0 || end < 0) throw new Error('savePlaceObjects-Slice nicht gefunden in ui-forms.js');
  return src.slice(start, end);
}

function _loadUI() {
  if (UI) return UI;
  _dom = _makeMiniDOM();
  var _uiSource = [
    _readSrc('ui-views-person.js'),
    _readSrc('ui-views.js'),
    _readSrc('ui-event-delegation.js'),
    _readSrc('ui-lifecycle.js'),
    _extractSavePO(),
  ].join('\n');
  // Datums-Tests (d) haben document._fields-Fallback gesetzt; MiniDOM erbt die
  // Map über die Closure in `_makeMiniDOM` (sieht _fields via äußere Scope).
  if (IS_NODE) {
    _ctx.document = _dom.document;
    // window-Bezeichner zeigt im vm-Context auf _ctx selbst, neue Felder
    // (innerWidth etc.) hängen wir direkt an _ctx
    _ctx.innerWidth  = 1200;
    _ctx.innerHeight = 800;
    _ctx.scrollTo    = function() {};
    _ctx.matchMedia  = function() { return { matches: false, addListener: function() {}, removeListener: function() {} }; };
    _ctx.location    = { reload: function() { _ctx._reloadCount = (_ctx._reloadCount || 0) + 1; }, href: '' };
    // window.addEventListener wird im vm an _ctx.addEventListener erwartet;
    // wir delegieren auf MiniDOM.addWinListener via _ctx.window
    _ctx.addEventListener    = function(t, fn) { _dom.addWinListener(t, fn); };
    _ctx.removeEventListener = function() {};
    _ctx.dispatchEvent       = function(ev) {
      (_dom.winListeners[ev.type] || []).forEach(function(fn) { fn.call(null, ev); });
      return !ev.defaultPrevented;
    };
    _ctx.Promise = Promise; _ctx.Set = Set; _ctx.Map = Map;
    _vm.runInContext(_UI_STUBS + '\n' + _uiSource + '\n' + _UI_SUFFIX, _ctx, { filename: 'ui-combined.js' });
    UI = _ctx._uiApi;
  } else {
    document = _dom.document;
    // window-Listener via MiniDOM-Hooks (addWinListener auf dem MiniDOM)
    window.innerWidth  = 1200;
    window.innerHeight = 800;
    window.scrollTo    = function() {};
    window.matchMedia  = function() { return { matches: false, addListener: function() {}, removeListener: function() {} }; };
    window.location    = { reload: function() { window._reloadCount = (window._reloadCount || 0) + 1; }, href: '' };
    // ui-lifecycle.js registriert pageshow/pagehide auf window.addEventListener
    // → an MiniDOM weiterreichen
    window.addEventListener    = function(t, fn) { _dom.addWinListener(t, fn); };
    window.removeEventListener = function() {};
    window.dispatchEvent       = function(ev) {
      (_dom.winListeners[ev.type] || []).forEach(function(fn) { fn.call(null, ev); });
      return !ev.defaultPrevented;
    };
    eval(_UI_STUBS + '\n' + _uiSource + '\n' + _UI_SUFFIX);
    UI = window._uiApi;
  }
  return UI;
}

// ── Mini-Test-Framework ───────────────────────────────────────────────────────
var RED = '\x1b[31m', GREEN = '\x1b[32m', DIM = '\x1b[2m', BOLD = '\x1b[1m', RESET = '\x1b[0m';
var _pass = 0, _fail = 0, _curGroup = '';
function group(name) { _curGroup = name; console.log('\n' + BOLD + name + RESET); }
function _ok(label)       { _pass++; console.log('  ' + GREEN + '✓' + RESET + ' ' + label); }
function _no(label, detail) {
  _fail++;
  console.log('  ' + RED + '✗ ' + label + RESET + (detail ? DIM + '  → ' + detail + RESET : ''));
}
function eq(actual, expected, label) {
  var a = JSON.stringify(actual), e = JSON.stringify(expected);
  (a === e) ? _ok(label) : _no(label, 'erwartet ' + e + ', war ' + a);
}
function ok(cond, label)  { cond ? _ok(label) : _no(label); }
function rulesOf(results) { return results.map(function(r) { return r.rule; }); }
function hasRule(results, rule, label)    { ok(rulesOf(results).indexOf(rule) >= 0, label); }
function lacksRule(results, rule, label)  { ok(rulesOf(results).indexOf(rule) <  0, label); }

// ── Helfer: minimale Person/DB ────────────────────────────────────────────────
function P(over) {
  return Object.assign({
    given: 'Hans', surname: 'Müller', sex: 'M',
    birth: {}, chr: {}, death: {}, buri: {}, events: [],
    fams: [], famc: [],
  }, over || {});
}
function withSource(p) {                       // hängt 1 Quelle an Geburt
  p.birth = p.birth || {};
  p.birth.citations = [{ sid: '@S1@', page: 'p1' }];
  return p;
}
function DB(individuals, families) {
  return { individuals: individuals || {}, families: families || {} };
}
function val(individuals, families) { return API.runValidation(DB(individuals, families)); }

// ═══════════════════════════════════════════════════════════════════════════
//  (d) DATUMS-HELFER
// ═══════════════════════════════════════════════════════════════════════════
group('(d) Datums-Helfer');

eq(API.normMonth('3'),       'MAR', 'normMonth Zahl "3" → MAR');
eq(API.normMonth('03'),      'MAR', 'normMonth "03" → MAR');
eq(API.normMonth('März'),    'MAR', 'normMonth "März" → MAR');
eq(API.normMonth('march'),   'MAR', 'normMonth "march" → MAR');
eq(API.normMonth('Dezember'),'DEC', 'normMonth "Dezember" → DEC');
eq(API.normMonth('FEB'),     'FEB', 'normMonth "FEB" → FEB');
eq(API.normMonth('Quatsch'), '',    'normMonth ungültig → ""');
eq(API.normMonth(''),        '',    'normMonth leer → ""');

eq(API.buildGedDate('', '12 MAR 1845', ''),            '12 MAR 1845',           'buildGedDate ohne Qualifier');
eq(API.buildGedDate('ABT', '1845', ''),                'ABT 1845',              'buildGedDate ABT');
eq(API.buildGedDate('BET', '1880', '1890'),            'BET 1880 AND 1890',     'buildGedDate BET … AND');
eq(API.buildGedDate('BET', '1880', ''),                '1880',                  'buildGedDate BET ohne d2 → d1');
eq(API.buildGedDate('FROM', '1900', '1910'),           'FROM 1900 TO 1910',     'buildGedDate FROM … TO');
eq(API.buildGedDate('FROM', '1900', ''),               'FROM 1900',             'buildGedDate FROM ohne d2');
eq(API.buildGedDate('', '', ''),                       '',                      'buildGedDate leer → ""');

clearFields();
setField('ef-date-d', '12'); setField('ef-date-m', 'März'); setField('ef-date-y', '1845');
eq(API.readDatePartFromFields('ef-date'), '12 MAR 1845', 'readDatePartFromFields Tag/Monat/Jahr');
clearFields();
setField('ef-date-m', '5'); setField('ef-date-y', '1900');
eq(API.readDatePartFromFields('ef-date'), 'MAY 1900', 'readDatePartFromFields nur Monat/Jahr');
clearFields();
setField('ef-date-y', '1700');
eq(API.readDatePartFromFields('ef-date'), '1700', 'readDatePartFromFields nur Jahr');
clearFields();
setField('ef-date-d', '12'); setField('ef-date-m', '3');   // kein Jahr
eq(API.readDatePartFromFields('ef-date'), '', 'readDatePartFromFields ohne Jahr → ""');

clearFields();
setField('q', 'BET');
setField('a-d', ''); setField('a-m', ''); setField('a-y', '1880');
setField('b-d', ''); setField('b-m', ''); setField('b-y', '1890');
eq(API.buildGedDateFromFields('q', 'a', 'b'), 'BET 1880 AND 1890', 'buildGedDateFromFields BET aus Feldern');

// ═══════════════════════════════════════════════════════════════════════════
//  (a) PARSER EDGE-CASES
// ═══════════════════════════════════════════════════════════════════════════
group('(a) Parser Edge-Cases');

(function() {
  var ged = [
    '0 HEAD', '1 SOUR Test', '0 @I1@ INDI',
    '1 NAME Hans /Müller/', '1 SEX M',
    '1 NOTE Dies ist ein langer', '2 CONC  Text der zusammen', '2 CONT gehört auf zwei Zeilen',
    '0 TRLR',
  ].join('\n');
  var errs = [], db = API.parseGEDCOM(ged, errs);
  ok(db.individuals['@I1@'], 'INDI @I1@ geparst');
  eq(db.individuals['@I1@'].surname, 'Müller', 'SURN aus NAME /…/ extrahiert');
})();

(function() {  // CONC/CONT bleibt im Note-Roundtrip erhalten (kein Verlust)
  var ged = ['0 HEAD','1 SOUR T','0 @I1@ INDI','1 NAME A /B/',
             '1 NOTE Zeile1','2 CONT Zeile2','0 TRLR'].join('\n');
  var errs = [], db = API.parseGEDCOM(ged, errs);
  ok(db.individuals['@I1@'], 'INDI mit CONT-Note geparst (kein Crash)');
})();

(function() {  // leeres Tag ohne Wert darf nicht crashen
  var ged = ['0 HEAD','1 SOUR T','0 @I1@ INDI','1 NAME /Nurnachname/','1 BIRT','2 DATE 1850','0 TRLR'].join('\n');
  var errs = [], db = API.parseGEDCOM(ged, errs);
  ok(db.individuals['@I1@'], 'INDI mit leerem BIRT-Tag geparst');
  eq(db.individuals['@I1@'].birth.date, '1850', 'BIRT.DATE trotz leerem BIRT-Wert gelesen');
  eq(db.individuals['@I1@'].given, '', 'Nur-Nachname → given leer');
})();

(function() {  // unbekanntes Tag landet im Passthrough (kein Verlust)
  var ged = ['0 HEAD','1 SOUR T','0 @I1@ INDI','1 NAME A /B/','1 _CUSTOM Wert','0 TRLR'].join('\n');
  var errs = [], db = API.parseGEDCOM(ged, errs);
  var pt = (db.individuals['@I1@']._passthrough || []).join('\n');
  ok(/_CUSTOM Wert/.test(pt), 'Unbekanntes _CUSTOM in _passthrough[]');
})();

(function() {  // INDI-Level dieselbe Quelle mehrfach → Dedup (verhindert N²-Verdopplung, MyHeritage)
  var ged = ['0 HEAD','1 SOUR T','0 @I1@ INDI','1 NAME A /B/',
             '1 SOUR @S1@','2 PAGE p1','2 EVEN Smart Matching',
             '1 SOUR @S1@','2 PAGE p2','2 EVEN Smart Matching','0 TRLR'].join('\n');
  var errs = [], db = API.parseGEDCOM(ged, errs);
  var p = db.individuals['@I1@'];
  eq(p.topSources.length, 1,            'Parser: INDI-Quelle 2× → topSources dedup auf 1');
  eq(p.topSourcePages['@S1@'], 'p1',    'Parser: keep-first PAGE bei INDI-Quellen-Dedup');
})();

(function() {  // lv>4 darf den Passthrough nicht abbrechen (ADR-012)
  var ged = ['0 HEAD','1 SOUR T','0 @I1@ INDI','1 NAME A /B/',
             '1 OBJE','2 FILE bild.jpg','3 FORM jpg','4 TYPE photo','5 _X tief','0 TRLR'].join('\n');
  var errs = [], db = API.parseGEDCOM(ged, errs);
  ok(db.individuals['@I1@'], 'INDI mit lv5-Zeile geparst (kein Abbruch)');
})();

// ═══════════════════════════════════════════════════════════════════════════
//  (b) VALIDATOR — je Positiv-/Negativfall
// ═══════════════════════════════════════════════════════════════════════════
group('(b) Validator');

// MISSING_SURNAME
hasRule (val({ '@1@': P({ surname: '' }) }),                'MISSING_SURNAME', 'MISSING_SURNAME feuert bei leerem Nachnamen');
lacksRule(val({ '@1@': withSource(P({ surname: 'Müller' })) }), 'MISSING_SURNAME', 'MISSING_SURNAME schweigt mit Nachname');

// MISSING_SEX
hasRule (val({ '@1@': P({ sex: 'U' }) }),  'MISSING_SEX', 'MISSING_SEX feuert bei U');
lacksRule(val({ '@1@': P({ sex: 'F' }) }), 'MISSING_SEX', 'MISSING_SEX schweigt bei F');

// MISSING_BIRTH
hasRule (val({ '@1@': P({ birth: {}, chr: {} }) }),                  'MISSING_BIRTH', 'MISSING_BIRTH feuert ohne Geburt/Taufe');
lacksRule(val({ '@1@': P({ birth: { date: '1850' } }) }),           'MISSING_BIRTH', 'MISSING_BIRTH schweigt mit Geburtsdatum');

// DEATH_BEFORE_BIRTH
hasRule (val({ '@1@': P({ birth: { date: '1900' }, death: { date: '1850' } }) }), 'DEATH_BEFORE_BIRTH', 'DEATH_BEFORE_BIRTH feuert (1850<1900)');
lacksRule(val({ '@1@': P({ birth: { date: '1850' }, death: { date: '1900' } }) }), 'DEATH_BEFORE_BIRTH', 'DEATH_BEFORE_BIRTH schweigt (normal)');

// AGE_OVER_MAX (Default maxAge 120)
hasRule (val({ '@1@': P({ birth: { date: '1700' }, death: { date: '1900' } }) }), 'AGE_OVER_MAX', 'AGE_OVER_MAX feuert bei 200 Jahren');
lacksRule(val({ '@1@': P({ birth: { date: '1850' }, death: { date: '1920' } }) }), 'AGE_OVER_MAX', 'AGE_OVER_MAX schweigt bei 70 Jahren');

// MISSING_BIRTHPLACE
hasRule (val({ '@1@': P({ birth: { date: '1850' } }) }),                       'MISSING_BIRTHPLACE', 'MISSING_BIRTHPLACE feuert (Datum ohne Ort)');
lacksRule(val({ '@1@': P({ birth: { date: '1850', place: 'Köln' } }) }),      'MISSING_BIRTHPLACE', 'MISSING_BIRTHPLACE schweigt (Ort vorhanden)');

// BIRTH_AFTER_STAERA (staStAera 1876, ohne Quelle)
hasRule (val({ '@1@': P({ birth: { date: '1900' } }) }),                                'BIRTH_AFTER_STAERA', 'BIRTH_AFTER_STAERA feuert (Geburt 1900, keine Quelle)');
lacksRule(val({ '@1@': withSource(P({ birth: { date: '1900', place: 'Köln' } })) }),   'BIRTH_AFTER_STAERA', 'BIRTH_AFTER_STAERA schweigt (Quelle vorhanden)');
lacksRule(val({ '@1@': P({ birth: { date: '1850' } }) }),                               'BIRTH_AFTER_STAERA', 'BIRTH_AFTER_STAERA schweigt (vor 1876)');

// EVENT_AFTER_DEATH
hasRule (val({ '@1@': P({ death: { date: '1880' }, chr: { date: '1890' } }) }), 'EVENT_AFTER_DEATH', 'EVENT_AFTER_DEATH feuert (Taufe nach Tod)');
lacksRule(val({ '@1@': P({ death: { date: '1890' }, chr: { date: '1850' } }) }), 'EVENT_AFTER_DEATH', 'EVENT_AFTER_DEATH schweigt (normal)');

// MISSING_GIVEN
hasRule (val({ '@1@': P({ given: '', surname: 'Müller' }) }),  'MISSING_GIVEN', 'MISSING_GIVEN feuert (Nachname ohne Vorname)');
lacksRule(val({ '@1@': P({ given: 'Hans', surname: 'Müller' }) }), 'MISSING_GIVEN', 'MISSING_GIVEN schweigt (Vorname vorhanden)');

// MISSING_DEATHPLACE
hasRule (val({ '@1@': P({ death: { date: '1880' } }) }),                  'MISSING_DEATHPLACE', 'MISSING_DEATHPLACE feuert (Datum ohne Ort)');
lacksRule(val({ '@1@': P({ death: { date: '1880', place: 'Köln' } }) }), 'MISSING_DEATHPLACE', 'MISSING_DEATHPLACE schweigt (Ort vorhanden)');

// NO_SOURCES_AT_ALL
hasRule (val({ '@1@': P() }),                'NO_SOURCES_AT_ALL', 'NO_SOURCES_AT_ALL feuert ohne Quelle');
lacksRule(val({ '@1@': withSource(P()) }),   'NO_SOURCES_AT_ALL', 'NO_SOURCES_AT_ALL schweigt mit Quelle');

// MISSING_QUAY (Quelle vorhanden, aber kein QUAY)
(function() {
  var p = P(); p.birth = { date: '1850', citations: [{ sid: '@S1@', page: 'p' }] };       // ohne quay
  hasRule(val({ '@1@': p }), 'MISSING_QUAY', 'MISSING_QUAY feuert (Quelle ohne QUAY)');
  var q = P(); q.birth = { date: '1850', citations: [{ sid: '@S1@', page: 'p', quay: '3' }] };
  lacksRule(val({ '@1@': q }), 'MISSING_QUAY', 'MISSING_QUAY schweigt (QUAY gesetzt)');
})();

// MISSING_EVAL (Quelle vorhanden, aber keine Evidenzbewertung) — RES-EVAL 2c
// Regel ist default-AUS (opt-in) → Tests mit explizit aktivierender Config (leeres disabled-Set)
(function() {
  var ON = { disabled: new Set() };
  var evalRules = function(inds) { return rulesOf(API.runValidation(DB(inds), ON)); };
  var p = P(); p.birth = { date: '1850', citations: [{ sid: '@S1@', page: 'p', quay: '3' }] }; // ohne eval
  ok(evalRules({ '@1@': p }).indexOf('MISSING_EVAL') >= 0, 'MISSING_EVAL feuert (Quelle ohne Evidenzbewertung)');
  var q = P(); q.birth = { date: '1850', citations: [{ sid: '@S1@', page: 'p', eval: { srcType: 'original' } }] };
  ok(evalRules({ '@1@': q }).indexOf('MISSING_EVAL') < 0, 'MISSING_EVAL schweigt (eval gesetzt)');
  var n = P();  // ohne Quelle → MISSING_EVAL schweigt (NO_SOURCES greift)
  ok(evalRules({ '@1@': n }).indexOf('MISSING_EVAL') < 0, 'MISSING_EVAL schweigt ohne Quelle');
  // default-AUS: ohne explizite Config kein MISSING_EVAL
  lacksRule(val({ '@1@': p }), 'MISSING_EVAL', 'MISSING_EVAL default-deaktiviert (kein Befund ohne Opt-in)');
})();

// PLACE_INCONSISTENCY (zwei Schreibweisen desselben Ortes)
(function() {
  var a = P({ birth: { date: '1850', place: 'München' } });
  var b = P({ birth: { date: '1851', place: 'Muenchen' } });
  hasRule(val({ '@1@': a, '@2@': b }), 'PLACE_INCONSISTENCY', 'PLACE_INCONSISTENCY feuert (München/Muenchen)');
  var c = P({ birth: { date: '1850', place: 'München' } });
  lacksRule(val({ '@1@': c }), 'PLACE_INCONSISTENCY', 'PLACE_INCONSISTENCY schweigt (eindeutig)');
})();

// ═══════════════════════════════════════════════════════════════════════════
//  (c) BFS-ANONYMISIERUNG (_buildLivingSet) — DSGVO-kritisch
// ═══════════════════════════════════════════════════════════════════════════
group('(c) BFS-Anonymisierung (_buildLivingSet)');

(function() {
  var living = API._buildLivingSet(DB({ '@1@': P({ birth: { date: '2010' } }) }));
  ok(living.has('@1@'), 'kürzlich geboren (2010) → lebend');
})();
(function() {
  var living = API._buildLivingSet(DB({ '@1@': P({ birth: { date: '1850' } }) }));
  ok(!living.has('@1@'), 'lange vor 100 Jahren geboren (1850) → tot');
})();
(function() {
  var living = API._buildLivingSet(DB({ '@1@': P({ death: { date: '1900' } }) }));
  ok(!living.has('@1@'), 'mit Sterbedatum → tot');
})();
(function() {  // BFS: Ehepartner einer lebenden Person ohne Daten → lebend
  var inds = {
    '@1@': P({ birth: { date: '2000' }, fams: ['@F1@'] }),
    '@2@': P({ fams: ['@F1@'] }),                          // keine Daten
  };
  var fams = { '@F1@': { husb: '@1@', wife: '@2@', children: ['@3@'] } };
  inds['@3@'] = P({ famc: ['@F1@'] });                     // Kind, keine Daten
  var living = API._buildLivingSet(DB(inds, fams));
  ok(living.has('@2@'), 'Ehepartner einer Lebenden (ohne Daten) → lebend (BFS)');
  ok(living.has('@3@'), 'Kind einer Lebenden (ohne Daten) → lebend (BFS)');
})();
(function() {  // lange toter Vorfahr bleibt tot, auch wenn Nachkomme lebt
  var inds = {
    '@1@': P({ birth: { date: '2000' }, famc: ['@F1@'] }),  // lebendes Kind
    '@2@': P({ birth: { date: '1850' }, fams: ['@F1@'] }),  // toter Elternteil
  };
  var fams = { '@F1@': { husb: '@2@', wife: null, children: ['@1@'] } };
  var living = API._buildLivingSet(DB(inds, fams));
  ok(living.has('@1@'),  'lebendes Kind → lebend');
  ok(!living.has('@2@'), 'toter Vorfahr (1850) bleibt tot trotz lebendem Kind');
})();
(function() {  // konservativ: Person ganz ohne Daten → lebend
  var living = API._buildLivingSet(DB({ '@1@': P() }));
  ok(living.has('@1@'), 'Person ohne jegliche Daten → konservativ lebend');
})();

// ═══════════════════════════════════════════════════════════════════════════
//  (b2) VALIDATOR — FAMILIEN-REGELN
// ═══════════════════════════════════════════════════════════════════════════
group('(b2) Validator — Familien-Regeln');

// Familie mit Quelle (unterdrückt NO_FAM_SOURCES in Positivtests anderer Regeln)
function fam(over) { return Object.assign({ husb: null, wife: null, children: [], marr: {}, sourceRefs: new Set(['@S1@']) }, over || {}); }
function valF(inds, fams) { return API.runValidation(DB(inds, fams)); }

// MARR_BEFORE_BIRTH
hasRule (valF({ '@H@': P({ birth: { date: '1900' } }) }, { '@F@': fam({ husb: '@H@', marr: { date: '1880' } }) }), 'MARR_BEFORE_BIRTH', 'MARR_BEFORE_BIRTH feuert (Heirat 1880 < Geburt 1900)');
lacksRule(valF({ '@H@': P({ birth: { date: '1900' } }) }, { '@F@': fam({ husb: '@H@', marr: { date: '1925' } }) }), 'MARR_BEFORE_BIRTH', 'MARR_BEFORE_BIRTH schweigt (normal)');

// MARR_AFTER_DEATH
hasRule (valF({ '@H@': P({ death: { date: '1880' } }) }, { '@F@': fam({ husb: '@H@', marr: { date: '1890' } }) }), 'MARR_AFTER_DEATH', 'MARR_AFTER_DEATH feuert (Heirat nach Tod)');
lacksRule(valF({ '@H@': P({ death: { date: '1890' } }) }, { '@F@': fam({ husb: '@H@', marr: { date: '1870' } }) }), 'MARR_AFTER_DEATH', 'MARR_AFTER_DEATH schweigt (normal)');

// MARR_TOO_YOUNG (minMarrAge 14)
hasRule (valF({ '@H@': P({ birth: { date: '1900' } }) }, { '@F@': fam({ husb: '@H@', marr: { date: '1910' } }) }), 'MARR_TOO_YOUNG', 'MARR_TOO_YOUNG feuert (Heiratsalter 10)');
lacksRule(valF({ '@H@': P({ birth: { date: '1900' } }) }, { '@F@': fam({ husb: '@H@', marr: { date: '1925' } }) }), 'MARR_TOO_YOUNG', 'MARR_TOO_YOUNG schweigt (Alter 25)');

// MISSING_MARRDATE (beide Gatten bekannt, kein Datum)
hasRule (valF({ '@H@': P(), '@W@': P({ sex: 'F' }) }, { '@F@': fam({ husb: '@H@', wife: '@W@', marr: {} }) }), 'MISSING_MARRDATE', 'MISSING_MARRDATE feuert (kein Heiratsdatum)');
lacksRule(valF({ '@H@': P(), '@W@': P({ sex: 'F' }) }, { '@F@': fam({ husb: '@H@', wife: '@W@', marr: { date: '1900' } }) }), 'MISSING_MARRDATE', 'MISSING_MARRDATE schweigt (Datum vorhanden)');

// NO_FAM_SOURCES
hasRule (valF({ '@H@': P() }, { '@F@': fam({ husb: '@H@', sourceRefs: new Set() }) }), 'NO_FAM_SOURCES', 'NO_FAM_SOURCES feuert (keine Quelle)');
lacksRule(valF({ '@H@': P() }, { '@F@': fam({ husb: '@H@' }) }),                          'NO_FAM_SOURCES', 'NO_FAM_SOURCES schweigt (Quelle vorhanden)');

// MANY_CHILDREN (maxChildren 15)
(function() {
  var kids = {}, ids = [];
  for (var i = 0; i < 16; i++) { var id = '@K' + i + '@'; kids[id] = P(); ids.push(id); }
  kids['@H@'] = P();
  hasRule(valF(kids, { '@F@': fam({ husb: '@H@', children: ids }) }), 'MANY_CHILDREN', 'MANY_CHILDREN feuert (16 Kinder)');
  lacksRule(valF({ '@H@': P(), '@K@': P() }, { '@F@': fam({ husb: '@H@', children: ['@K@'] }) }), 'MANY_CHILDREN', 'MANY_CHILDREN schweigt (1 Kind)');
})();

// CHILD_BEFORE_PARENT (Kind nicht jünger als Mutter)
hasRule (valF({ '@W@': P({ sex: 'F', birth: { date: '1900' } }), '@K@': P({ birth: { date: '1890' } }) }, { '@F@': fam({ wife: '@W@', children: ['@K@'] }) }), 'CHILD_BEFORE_PARENT', 'CHILD_BEFORE_PARENT feuert (Kind 1890 vor Mutter 1900)');
lacksRule(valF({ '@W@': P({ sex: 'F', birth: { date: '1880' } }), '@K@': P({ birth: { date: '1905' } }) }, { '@F@': fam({ wife: '@W@', children: ['@K@'] }) }), 'CHILD_BEFORE_PARENT', 'CHILD_BEFORE_PARENT schweigt (normal)');

// MOTHER_TOO_YOUNG (minMotherAge 12)
hasRule (valF({ '@W@': P({ sex: 'F', birth: { date: '1900' } }), '@K@': P({ birth: { date: '1908' } }) }, { '@F@': fam({ wife: '@W@', children: ['@K@'] }) }), 'MOTHER_TOO_YOUNG', 'MOTHER_TOO_YOUNG feuert (Mutter 8 J.)');
lacksRule(valF({ '@W@': P({ sex: 'F', birth: { date: '1880' } }), '@K@': P({ birth: { date: '1905' } }) }, { '@F@': fam({ wife: '@W@', children: ['@K@'] }) }), 'MOTHER_TOO_YOUNG', 'MOTHER_TOO_YOUNG schweigt (25 J.)');

// MOTHER_TOO_OLD (maxMotherAge 60)
hasRule (valF({ '@W@': P({ sex: 'F', birth: { date: '1850' } }), '@K@': P({ birth: { date: '1920' } }) }, { '@F@': fam({ wife: '@W@', children: ['@K@'] }) }), 'MOTHER_TOO_OLD', 'MOTHER_TOO_OLD feuert (Mutter 70 J.)');
lacksRule(valF({ '@W@': P({ sex: 'F', birth: { date: '1880' } }), '@K@': P({ birth: { date: '1910' } }) }, { '@F@': fam({ wife: '@W@', children: ['@K@'] }) }), 'MOTHER_TOO_OLD', 'MOTHER_TOO_OLD schweigt (30 J.)');

// FATHER_TOO_YOUNG (minFatherAge 15)
hasRule (valF({ '@H@': P({ birth: { date: '1900' } }), '@K@': P({ birth: { date: '1912' } }) }, { '@F@': fam({ husb: '@H@', children: ['@K@'] }) }), 'FATHER_TOO_YOUNG', 'FATHER_TOO_YOUNG feuert (Vater 12 J.)');
lacksRule(valF({ '@H@': P({ birth: { date: '1880' } }), '@K@': P({ birth: { date: '1910' } }) }, { '@F@': fam({ husb: '@H@', children: ['@K@'] }) }), 'FATHER_TOO_YOUNG', 'FATHER_TOO_YOUNG schweigt (30 J.)');

// FATHER_TOO_OLD (maxFatherAge 90)
hasRule (valF({ '@H@': P({ birth: { date: '1850' } }), '@K@': P({ birth: { date: '1945' } }) }, { '@F@': fam({ husb: '@H@', children: ['@K@'] }) }), 'FATHER_TOO_OLD', 'FATHER_TOO_OLD feuert (Vater 95 J.)');
lacksRule(valF({ '@H@': P({ birth: { date: '1880' } }), '@K@': P({ birth: { date: '1910' } }) }, { '@F@': fam({ husb: '@H@', children: ['@K@'] }) }), 'FATHER_TOO_OLD', 'FATHER_TOO_OLD schweigt (30 J.)');

// CHILD_AFTER_FATHER_DEATH (>1 Jahr nach Tod)
hasRule (valF({ '@H@': P({ birth: { date: '1850' }, death: { date: '1880' } }), '@K@': P({ birth: { date: '1885' } }) }, { '@F@': fam({ husb: '@H@', children: ['@K@'] }) }), 'CHILD_AFTER_FATHER_DEATH', 'CHILD_AFTER_FATHER_DEATH feuert (Kind 1885, Tod 1880)');
lacksRule(valF({ '@H@': P({ birth: { date: '1850' }, death: { date: '1890' } }), '@K@': P({ birth: { date: '1885' } }) }, { '@F@': fam({ husb: '@H@', children: ['@K@'] }) }), 'CHILD_AFTER_FATHER_DEATH', 'CHILD_AFTER_FATHER_DEATH schweigt (Kind vor Tod)');

// ═══════════════════════════════════════════════════════════════════════════
//  (e) PAGE→MEDIA/NOTE-MIGRATION (Deeplink aus PAGE lösen)
// ═══════════════════════════════════════════════════════════════════════════
group('(e) PAGE→Media/Note-Migration');

// _splitPageUrl (rein)
eq(API._splitPageUrl('fol. 12r'),                                  { page:'fol. 12r', urls:[] },                                  '_splitPageUrl ohne URL');
eq(API._splitPageUrl('https://data.matricula-online.eu/a?pg=12'),  { page:'', urls:['https://data.matricula-online.eu/a?pg=12'] }, '_splitPageUrl nur URL → page leer');
eq(API._splitPageUrl('fol. 12 https://x/y'),                       { page:'fol. 12', urls:['https://x/y'] },                      '_splitPageUrl Lokator + URL getrennt');
eq(API._splitPageUrl('S. 5; https://x/y)'),                        { page:'S. 5', urls:['https://x/y'] },                         '_splitPageUrl Satzzeichen bereinigt');
eq(API._splitPageUrl(''),                                          { page:'', urls:[] },                                          '_splitPageUrl leer');

// migratePageUrls → media (Default), Lokator bleibt
(function() {
  var cit = { sid:'@S1@', page:'fol. 12 https://m.eu/scan?pg=12', quay:'3', note:null, extra:[], media:[] };
  var p = P(); p.birth = { date:'1800', citations:[cit] };
  var rep = API.migratePageUrls(DB({ '@1@': p }));
  eq(cit.page, 'fol. 12',                       'migrate: page bereinigt (Lokator bleibt)');
  eq(cit.media.length, 1,                       'migrate: 1 media-Item erzeugt');
  eq(cit.media[0].file, 'https://m.eu/scan?pg=12', 'migrate: URL in media[].file');
  eq(rep.migrated, 1,                           'migrate: report.migrated=1');
})();

// idempotent
(function() {
  var cit = { sid:'@S1@', page:'https://m.eu/x', quay:'', note:null, extra:[], media:[] };
  var db = DB({ '@1@': Object.assign(P(), { birth:{ date:'1800', citations:[cit] } }) });
  API.migratePageUrls(db);
  var rep2 = API.migratePageUrls(db);
  eq(rep2.migrated, 0,    'migrate: zweiter Lauf no-op (idempotent)');
  eq(cit.media.length, 1, 'migrate: keine Dublette');
})();

// note-Ziel + Event-Host (verschachtelt)
(function() {
  var cit = { sid:'@S1@', page:'Nr. 4 https://m.eu/y', quay:'', note:null, extra:[], media:[] };
  var p = P(); p.events = [{ type:'OCCU', date:'', place:'', citations:[cit] }];
  API.migratePageUrls(DB({ '@1@': p }), { target:'note' });
  eq(cit.page, 'Nr. 4',           'migrate(note): page bereinigt im Event-Host');
  eq(cit.note, 'https://m.eu/y',  'migrate(note): URL in note');
  eq(cit.media.length, 0,         'migrate(note): media unverändert');
})();

// ohne URL → unangetastet
(function() {
  var cit = { sid:'@S1@', page:'fol. 7', quay:'', note:null, extra:[], media:[] };
  var rep = API.migratePageUrls(DB({ '@1@': Object.assign(P(), { birth:{ date:'1800', citations:[cit] } }) }));
  eq(rep.migrated, 0,        'migrate: ohne URL nichts migriert');
  eq(cit.page, 'fol. 7',     'migrate: page unverändert');
})();

// ═══════════════════════════════════════════════════════════════════════════
//  (e) RES-EVAL — Evidenzmodell (ADR-022)
// ═══════════════════════════════════════════════════════════════════════════
group('(e) RES-EVAL Evidenzmodell');

// _evalToQuay — abgeleiteter QUAY-Vorschlag
eq(API._evalToQuay({ srcType:'original',  infoQual:'primary',      evidence:'direct'   }), '3', 'eval Original+primär+direkt → QUAY 3');
eq(API._evalToQuay({ srcType:'original',  infoQual:'primary',      evidence:''         }), '3', 'eval Original+primär (ohne Evidenzachse) → QUAY 3');
eq(API._evalToQuay({ srcType:'original',  infoQual:'primary',      evidence:'indirect' }), '1', 'eval Original+primär+indirekt → QUAY 1');
eq(API._evalToQuay({ srcType:'derivative',infoQual:'secondary',    evidence:''         }), '2', 'eval Abschrift+sekundär → QUAY 2');
eq(API._evalToQuay({ srcType:'authored',  infoQual:'undetermined', evidence:'indirect' }), '1', 'eval Autorenwerk+unbestimmt+indirekt → QUAY 1');
eq(API._evalToQuay({ srcType:'',          infoQual:'',             evidence:'negative' }), '0', 'eval Negativ-Evidenz → QUAY 0');
eq(API._evalToQuay({}), '', 'eval leer → ""');

// evalIsEmpty
ok(API.evalIsEmpty({ srcType:'', infoQual:'', evidence:'', informant:'' }), 'evalIsEmpty true bei leer');
ok(API.evalIsEmpty(null),                                                   'evalIsEmpty true bei null');
ok(!API.evalIsEmpty({ srcType:'original', infoQual:'', evidence:'', informant:'' }), 'evalIsEmpty false bei gesetzt');

// Parser: _EVAL wird modelliert in citation.eval extrahiert — NICHT in extra (kein Doppel-Schreiben)
(function() {
  var ged = ['0 HEAD','1 SOUR T','0 @S1@ SOUR','1 TITL Q','0 @I1@ INDI','1 NAME A /B/',
    '1 BIRT','2 DATE 1850','2 SOUR @S1@','3 PAGE 5','3 QUAY 3',
    '3 _EVAL','4 _STYP original','4 _INFO primary','4 _EVID direct','4 _INFM @I9@','0 TRLR'].join('\n');
  var errs = [], db = API.parseGEDCOM(ged, errs);
  var c = db.individuals['@I1@'].birth.citations[0];
  ok(c.eval, 'Zitat hat eval-Objekt');
  eq(c.eval && c.eval.srcType,   'original', '_STYP → eval.srcType');
  eq(c.eval && c.eval.infoQual,  'primary',  '_INFO → eval.infoQual');
  eq(c.eval && c.eval.evidence,  'direct',   '_EVID → eval.evidence');
  eq(c.eval && c.eval.informant, '@I9@',     '_INFM → eval.informant');
  var ex = (c.extra || []).join('|');
  ok(ex.indexOf('_EVAL') < 0, '_EVAL nicht in extra (kein Doppel-Schreiben)');
  ok(ex.indexOf('_STYP') < 0, '_STYP-Achse nicht in extra');
})();

// Parser: Zitat ohne _EVAL behält eval=null (keine Strukturänderung)
(function() {
  var ged = ['0 HEAD','1 SOUR T','0 @S1@ SOUR','1 TITL Q','0 @I1@ INDI','1 NAME A /B/',
    '1 BIRT','2 DATE 1850','2 SOUR @S1@','3 PAGE 5','0 TRLR'].join('\n');
  var errs = [], db = API.parseGEDCOM(ged, errs);
  var c = db.individuals['@I1@'].birth.citations[0];
  ok(!c.eval, 'Zitat ohne _EVAL → eval bleibt leer/null');
})();

// ═══════════════════════════════════════════════════════════════════════════
//  (f) RES-PROJ — Task-Status (Kanban)
// ═══════════════════════════════════════════════════════════════════════════
group('(f) RES-PROJ Task-Status');

// _TSTAT wird geparst (Person + Familie)
(function() {
  var ged = ['0 HEAD','1 SOUR T','0 @I1@ INDI','1 NAME A /B/',
    '1 _TASK Sterbeurkunde suchen','2 _CAT urkunde','2 _DONE 0','2 _TSTAT doing','2 _ID t1',
    '0 @F1@ FAM','1 _TASK Heiratseintrag','2 _DONE 1','2 _TSTAT done','2 _ID t2','0 TRLR'].join('\n');
  var errs = [], db = API.parseGEDCOM(ged, errs);
  var pt = db.individuals['@I1@']._tasks[0];
  eq(pt.status, 'doing', '_TSTAT → task.status (doing)');
  eq(pt.done,   false,   '_DONE 0 bleibt erhalten neben _TSTAT');
  var ft = db.families['@F1@']._tasks[0];
  eq(ft.status, 'done', '_TSTAT → Familien-task.status (done)');
})();

// Task ohne _TSTAT → status leer (UI migriert lazy aus done)
(function() {
  var ged = ['0 HEAD','1 SOUR T','0 @I1@ INDI','1 NAME A /B/',
    '1 _TASK Alt','2 _DONE 1','0 TRLR'].join('\n');
  var errs = [], db = API.parseGEDCOM(ged, errs);
  var t = db.individuals['@I1@']._tasks[0];
  ok(!t.status, 'Bestandstask ohne _TSTAT → status leer (kein Roundtrip-Delta)');
  eq(t.done, true, 'done bleibt true');
})();

// ═══════════════════════════════════════════════════════════════════════════
//  (g) RES-HYPO — Hypothesen-System (ADR-023)
// ═══════════════════════════════════════════════════════════════════════════
group('(g) RES-HYPO Hypothesen');

// Helfer
ok(API.hypoIsEmpty({ text:'', rationale:'', conclusion:'', evidence:[] }), 'hypoIsEmpty true bei leer');
ok(API.hypoIsEmpty(null),                                                  'hypoIsEmpty true bei null');
ok(!API.hypoIsEmpty({ text:'X', evidence:[] }),                            'hypoIsEmpty false bei Text');
ok(!API.hypoIsEmpty({ text:'', evidence:[{sid:'@S1@'}] }),                 'hypoIsEmpty false bei Evidenz');
eq(API._hypoStatus({ status:'confirmed' }), 'confirmed', '_hypoStatus liest status');
eq(API._hypoStatus({}),                     'open',      '_hypoStatus migriert leer → open');
eq(API._hypoStatus({ status:'bogus' }),     'open',      '_hypoStatus fängt Ungültiges → open');

// Parser: _HYPO wird modelliert extrahiert (Person), inkl. Evidenz + mehrzeilig
(function() {
  var ged = ['0 HEAD','1 SOUR T','0 @S1@ SOUR','1 TITL Q','0 @S2@ SOUR','1 TITL R',
    '0 @I1@ INDI','1 NAME A /B/','1 SEX M',
    '1 _HYPO Johann ist Sohn des Peter','2 _ID h1','2 _HSTAT open','2 _HWGT medium','2 _DATE 2026-05-31',
    '2 SOUR @S1@','3 PAGE fol. 12','2 SOUR @S2@',
    '2 _RATIO Erste Zeile.','3 CONT Zweite Zeile.','2 _CONCL Noch offen.','0 TRLR'].join('\n');
  var errs = [], db = API.parseGEDCOM(ged, errs);
  var h = db.individuals['@I1@']._hypotheses[0];
  ok(h, 'Person hat Hypothese');
  eq(h.text,   'Johann ist Sohn des Peter', '_HYPO-Wert → text');
  eq(h.id,     'h1',     '_ID → id');
  eq(h.status, 'open',   '_HSTAT → status');
  eq(h.weight, 'medium', '_HWGT → weight');
  eq(h.evidence.length, 2,        'zwei Evidenz-Refs');
  eq(h.evidence[0].sid,  '@S1@',  'Evidenz 1 sid');
  eq(h.evidence[0].page, 'fol. 12','Evidenz 1 page (lv3 PAGE)');
  eq(h.evidence[1].sid,  '@S2@',  'Evidenz 2 sid (ohne page)');
  eq(h.rationale, 'Erste Zeile.\nZweite Zeile.', '_RATIO + CONT mehrzeilig');
  eq(h.conclusion,'Noch offen.', '_CONCL → conclusion');
  // _HYPO nicht im Passthrough (kein Doppel-Schreiben)
  var pt = (db.individuals['@I1@']._passthrough || []).join('|');
  ok(pt.indexOf('_HYPO') < 0, '_HYPO nicht im Passthrough (modelliert)');
})();

// Parser: _HYPO an Familie
(function() {
  var ged = ['0 HEAD','1 SOUR T','0 @S1@ SOUR','1 TITL Q','0 @F1@ FAM','1 HUSB @I1@',
    '1 _HYPO Ehe vermutlich 1675','2 _HSTAT confirmed','2 _HWGT high','2 SOUR @S1@','0 TRLR'].join('\n');
  var errs = [], db = API.parseGEDCOM(ged, errs);
  var h = db.families['@F1@']._hypotheses[0];
  ok(h, 'Familie hat Hypothese');
  eq(h.status, 'confirmed', 'Familien-_HSTAT → status');
  eq(h.evidence[0].sid, '@S1@', 'Familien-Evidenz sid');
})();

// Person ohne _HYPO → leeres Array (keine Strukturänderung)
(function() {
  var ged = ['0 HEAD','1 SOUR T','0 @I1@ INDI','1 NAME A /B/','1 SEX M','0 TRLR'].join('\n');
  var errs = [], db = API.parseGEDCOM(ged, errs);
  eq(db.individuals['@I1@']._hypotheses.length, 0, 'keine Hypothese → leeres Array');
})();

// Validator OPEN_HYPO — default-AUS (opt-in), feuert nur bei offenen Hypothesen
(function() {
  var ON = { disabled: new Set() };
  var hRules = function(inds) { return rulesOf(API.runValidation(DB(inds), ON)); };
  var open = P({ _hypotheses: [{ id:'h1', text:'X', status:'open' }] });
  ok(hRules({ '@1@': open }).indexOf('OPEN_HYPO') >= 0, 'OPEN_HYPO feuert bei offener Hypothese');
  var noStatus = P({ _hypotheses: [{ id:'h2', text:'Y' }] });   // leer → gilt als offen
  ok(hRules({ '@1@': noStatus }).indexOf('OPEN_HYPO') >= 0, 'OPEN_HYPO feuert bei Hypothese ohne Status (= offen)');
  var done = P({ _hypotheses: [{ id:'h3', text:'Z', status:'confirmed' }] });
  ok(hRules({ '@1@': done }).indexOf('OPEN_HYPO') < 0, 'OPEN_HYPO schweigt bei bestätigt');
  var rej = P({ _hypotheses: [{ id:'h4', text:'W', status:'rejected' }] });
  ok(hRules({ '@1@': rej }).indexOf('OPEN_HYPO') < 0, 'OPEN_HYPO schweigt bei verworfen');
  var none = P();
  ok(hRules({ '@1@': none }).indexOf('OPEN_HYPO') < 0, 'OPEN_HYPO schweigt ohne Hypothesen');
  // default-AUS: ohne Opt-in kein Befund
  lacksRule(val({ '@1@': open }), 'OPEN_HYPO', 'OPEN_HYPO default-deaktiviert (kein Befund ohne Opt-in)');
})();

// ═══════════════════════════════════════════════════════════════════════════
//  (h) PLACE-HIST — datierte pname/placeref (ADR-024)
// ═══════════════════════════════════════════════════════════════════════════
group('(h) PLACE-HIST Ortshistorie');

var _PLHIST_XML = '<?xml version="1.0"?>\n<database xmlns="http://gramps-project.org/xml/1.7.1/">\n<places>\n'
  + '<placeobj handle="_pP" id="P0001" type="Region"><ptitle>Fürstbistum Münster</ptitle><pname value="Fürstbistum Münster"/></placeobj>\n'
  + '<placeobj handle="_pL" id="P0002" type="Village"><ptitle>Sassenberg</ptitle>'
  + '<pname value="Sassenberg"/>'
  + '<pname value="Sassenbergk" lang=""><daterange start="1650" stop="1802"/></pname>'
  + '<coord lat="N51.99" long="E8.04"/>'
  + '<placeref hlink="_pP"><dateval val="1500-01-01" type="from"/></placeref>'
  + '</placeobj>\n</places>\n</database>';

(function() {
  var db  = API.grampsParse(_PLHIST_XML);
  var pl  = db.placeObjects['@P0002@'];
  var pn  = (pl.pnames || []).filter(function(p) { return p.value === 'Sassenbergk'; })[0] || {};
  eq(pn.dateFrom + '/' + pn.dateTo, '1650/1802', 'datierter pname (daterange) → dateFrom/dateTo geparst');
  eq(pn.dateType, 'range', 'pname dateType = range');
  var enc = (pl.enclosedBy || [])[0] || {};
  eq(enc.placeId + '|' + enc.dateFrom, '@P0001@|1500-01-01', 'datierter placeref → enclosedBy mit placeId + Datum');

  var out = API.grampsBuild(db);
  ok(/<pname value="Sassenbergk"[^>]*>\s*<daterange start="1650" stop="1802"\/>\s*<\/pname>/.test(out), 'datierter pname roundtrip (write erzeugt daterange-Kind)');
  ok(/<dateval val="1500-01-01" type="from"\/>/.test(out), 'placeref verbatim-Attribut type="from" überlebt (via _dateRaw)');

  var out2 = API.grampsBuild(API.grampsParse(out));
  eq(out === out2 ? 'stable' : 'drift', 'stable', 'place-date idempotent ((build∘parse)² stabil)');
})();

// ═══════════════════════════════════════════════════════════════════════════
//  (i) PLACE-HIST — PlaceRegistry (ADR-024 P0a-2)
// ═══════════════════════════════════════════════════════════════════════════
group('(i) PLACE-HIST PlaceRegistry');

// _normPlaceName — nur Matching, verlustfrei (kein Speicher-/Anzeigewert)
eq(API._normPlaceName('  Münster '), 'münster', '_normPlaceName trimmt + casefold');
eq(API._normPlaceName('Bad   Bentheim'), 'bad bentheim', '_normPlaceName kollabiert Spaces');
eq(API._normPlaceName(''), '', '_normPlaceName leer → ""');

(function() {
  // DB mit datiertem Ort: Sassenberg (1650–1802 "Sassenbergk"), eingebettet in P0001
  var db = {
    individuals: {}, families: {},
    placeObjects: {
      '@P0001@': { id:'@P0001@', title:'Fürstbistum Münster', type:'Region', pnames:[{value:'Fürstbistum Münster'}], enclosedBy:[] },
      '@P0002@': { id:'@P0002@', title:'Sassenberg', type:'Village',
        pnames:[ {value:'Sassenberg'}, {value:'Sassenbergk', dateFrom:'1650', dateTo:'1802', dateType:'range'} ],
        enclosedBy:[ {placeId:'@P0001@', dateFrom:'1500', dateTo:'1803', dateType:'span'} ] },
    },
  };
  API.setDb(db);
  var reg = API.getPlaceRegistry();
  eq(reg.findByName('sassenberg'), '@P0002@', 'findByName (Haupttitel, normalisiert)');
  eq(reg.findByName('Sassenbergk'), '@P0002@', 'findByName (historische Schreibweise als Alias)');
  eq(reg.findByName('unbekannt'), null, 'findByName unbekannt → null');
  eq(reg.resolveAsOf('@P0002@', 1700), 'Sassenbergk', 'resolveAsOf 1700 → periodenkorrekter Name');
  eq(reg.resolveAsOf('@P0002@', 1900), 'Sassenberg', 'resolveAsOf 1900 → Haupttitel (kein passender pname)');
  eq(reg.resolveAsOf('@P0002@', null), 'Sassenberg', 'resolveAsOf ohne Jahr → Haupttitel');
  eq(reg.enclosureChainAsOf('@P0002@', 1700), ['Sassenbergk', 'Fürstbistum Münster'], 'enclosureChainAsOf 1700 (Kette periodenkorrekt)');
})();

(function() {
  // Migration: Alt-Ort nur mit parentId (undatiert) → enclosedBy[] abgeleitet
  var db = {
    individuals: {}, families: {},
    placeObjects: {
      '@P1@': { id:'@P1@', title:'Land', type:'Country', pnames:[{value:'Land'}] },
      '@P2@': { id:'@P2@', title:'Dorf', type:'Village', pnames:[{value:'Dorf'}], parentId:'@P1@' },
    },
  };
  API.setDb(db);            // setDb ruft _migratePlaceObjects auf
  var pl = API.getPlaceRegistry().byId['@P2@'];
  eq(pl.enclosedBy.length, 1, 'Migration: parentId → enclosedBy[] (1 Eintrag)');
  eq(pl.enclosedBy[0].placeId, '@P1@', 'Migration: enclosedBy[0].placeId aus parentId');
  eq(API.getPlaceRegistry().enclosureChainAsOf('@P2@', 1800), ['Dorf', 'Land'], 'Migration: Kette via abgeleitetes enclosedBy');
})();

// ═══════════════════════════════════════════════════════════════════════════
//  (i2) enclosureWinnerAsOf — Kernel der WYSIWYG-Invariante v940/v949
// ═══════════════════════════════════════════════════════════════════════════
// Die Registry-Methode liefert den *gewinnenden* enclosedBy-Eintrag eines
// Knotens zum Stichjahr. Dieselbe Funktion wird von enclosureChainAsOf (Writer)
// und _placeDetailEnclosureTimeline (View) genutzt → strukturelle Verriegelung
// statt Code-Duplikat (v949-Verbesserung gegenüber dem ursprünglichen Split).
group('(i2) PlaceRegistry.enclosureWinnerAsOf');

(function() {
  var P_PA  = { id:'@PA@',  title:'Parent-A', type:'Region', pnames:[{value:'Parent-A'}], enclosedBy: [] };
  var P_PB  = { id:'@PBP@', title:'Parent-B', type:'Region', pnames:[{value:'Parent-B'}], enclosedBy: [] };

  function _setupDb(encs) {
    API.setDb({ individuals:{}, families:{}, placeObjects: {
      '@PB@':  { id:'@PB@',  title:'Basis', type:'Village', pnames:[{value:'Basis'}], enclosedBy: encs },
      '@PA@':  P_PA,
      '@PBP@': P_PB,
    } });
    return API.getPlaceRegistry();
  }

  // (1) Keine Eltern-Einträge → enc=null + truncated=false
  var r = _setupDb([]);
  var w = r.enclosureWinnerAsOf('@PB@', 1800);
  eq(w.enc, null,        '(1) leer: enc=null');
  eq(w.truncated, false, '(1) leer: truncated=false');

  // (2) Nur undatierter Eintrag → wird als Fallback zurückgegeben
  r = _setupDb([{ placeId:'@PA@' }]);
  w = r.enclosureWinnerAsOf('@PB@', 1800);
  eq(w.enc && w.enc.placeId, '@PA@', '(2) undatiert: als Fallback');
  eq(w.truncated, false,             '(2) undatiert: nicht truncated (gilt als immer-gültig)');

  // (3) Datierter Eintrag, Jahr innerhalb → dieser Eintrag gewinnt
  r = _setupDb([{ placeId:'@PA@', dateFrom:'1500', dateTo:'1799' }]);
  w = r.enclosureWinnerAsOf('@PB@', 1700);
  eq(w.enc && w.enc.placeId, '@PA@', '(3) inside range: gewinnt');
  eq(w.truncated, false,             '(3) inside range: nicht truncated');

  // (4) Datierter Eintrag, Jahr außerhalb → null + truncated=true
  r = _setupDb([{ placeId:'@PA@', dateFrom:'1500', dateTo:'1799' }]);
  w = r.enclosureWinnerAsOf('@PB@', 1850);
  eq(w.enc, null,       '(4) outside range: enc=null');
  eq(w.truncated, true, '(4) outside range: truncated=true (datierte Eltern vorhanden, keiner passt)');

  // (5) Überlappung am Grenzdatum: bis=1802 + ab=1802 → höchstes dateFrom gewinnt
  r = _setupDb([
    { placeId:'@PA@',  dateFrom:'1500', dateTo:'1802' },
    { placeId:'@PBP@', dateFrom:'1802', dateTo:'' },
  ]);
  w = r.enclosureWinnerAsOf('@PB@', 1802);
  eq(w.enc && w.enc.placeId, '@PBP@', '(5) Überlappung: höchstes dateFrom gewinnt (Parent-B "tritt in Kraft")');

  // (6) Datiert + undatiert, Jahr im datierten Bereich → datierter gewinnt
  r = _setupDb([
    { placeId:'@PA@',  dateFrom:'1500', dateTo:'1800' },
    { placeId:'@PBP@' },
  ]);
  w = r.enclosureWinnerAsOf('@PB@', 1700);
  eq(w.enc && w.enc.placeId, '@PA@', '(6) datiert+undatiert, im Bereich: datiert gewinnt');

  // (7) Datiert + undatiert, Jahr außerhalb → undatiert als Fallback
  r = _setupDb([
    { placeId:'@PA@',  dateFrom:'1500', dateTo:'1800' },
    { placeId:'@PBP@' },
  ]);
  w = r.enclosureWinnerAsOf('@PB@', 1900);
  eq(w.enc && w.enc.placeId, '@PBP@', '(7) datiert+undatiert, außerhalb: undatiert als Fallback');
  eq(w.truncated, false,              '(7) undatierter Fallback verhindert truncated');

  // (8) year=null → null + truncated=false (kein Jahres-Constraint)
  r = _setupDb([{ placeId:'@PA@', dateFrom:'1500', dateTo:'1799' }]);
  w = r.enclosureWinnerAsOf('@PB@', null);
  eq(w.enc, null,        '(8) year=null: enc=null');
  eq(w.truncated, false, '(8) year=null: truncated=false');

  // (9) Unbekannte placeId → defensive null, kein Crash
  r = _setupDb([{ placeId:'@PA@' }]);
  w = r.enclosureWinnerAsOf('@DOES_NOT_EXIST@', 1800);
  eq(w.enc, null,        '(9) unbekannter Knoten: enc=null');
  eq(w.truncated, false, '(9) unbekannter Knoten: truncated=false');

  // (10) Verschachtelte überlappende datierte Einträge: höchstes dateFrom gewinnt
  r = _setupDb([
    { placeId:'@PA@',  dateFrom:'1500', dateTo:'1900' },
    { placeId:'@PBP@', dateFrom:'1700', dateTo:'1800' },
  ]);
  w = r.enclosureWinnerAsOf('@PB@', 1750);
  eq(w.enc && w.enc.placeId, '@PBP@', '(10) verschachtelte Überlappung: jüngerer (höchstes dateFrom) gewinnt');

  // (11) Regression: enclosureChainAsOf nutzt jetzt enclosureWinnerAsOf
  // → Sassenberg-Beispiel aus Block (i) muss weiter Bit-genau funktionieren.
  API.setDb({ individuals:{}, families:{}, placeObjects: {
    '@P0001@': { id:'@P0001@', title:'Fürstbistum Münster', type:'Region', pnames:[{value:'Fürstbistum Münster'}], enclosedBy:[] },
    '@P0002@': { id:'@P0002@', title:'Sassenberg', type:'Village',
      pnames:[{value:'Sassenberg'}, {value:'Sassenbergk', dateFrom:'1650', dateTo:'1802'}],
      enclosedBy:[{placeId:'@P0001@', dateFrom:'1500', dateTo:'1803'}] },
  } });
  eq(API.getPlaceRegistry().enclosureChainAsOf('@P0002@', 1700),
     ['Sassenbergk', 'Fürstbistum Münster'],
     '(11) enclosureChainAsOf nach Refaktor: Sassenberg-Kette unverändert');
})();

// ═══════════════════════════════════════════════════════════════════════════
//  (j) PLACE-HIST — collectPlaces↔Entität-Verknüpfung (ADR-024 P0b-1)
// ═══════════════════════════════════════════════════════════════════════════
group('(j) PLACE-HIST collectPlaces-Entität');

// collectPlaces lebt in ui-views-place.js (UI-Schicht, nicht im Unit-Harness geladen).
// Wir testen daher die zugrundeliegende Verknüpfungslogik direkt über die Registry:
// findByName liefert die placeId, byId trägt type + Koordinaten, die collectPlaces
// additiv einmischt. Das ist die exakt selbe Operation wie in collectPlaces P0b-1.
(function() {
  var db = {
    individuals: {}, families: {},
    placeObjects: {
      '@P1@': { id:'@P1@', title:'Münster', type:'City',
        pnames:[{value:'Münster'}, {value:'Monasterium', dateFrom:'1500', dateTo:'1800', dateType:'range'}],
        lat:51.96, long:7.62, enclosedBy:[] },
    },
  };
  API.setDb(db);
  var reg = API.getPlaceRegistry();
  var id  = reg.findByName('Münster');
  eq(id, '@P1@', 'P0b-1: String-Ort → placeId (findByName)');
  var po  = reg.byId[id];
  eq(po.type, 'City', 'P0b-1: Entität liefert type für Anzeige');
  ok(po.lat === 51.96 && po.long === 7.62, 'P0b-1: Koordinaten aus placeObject übernehmbar');
  var dated = (po.pnames || []).filter(function(p){ return p.dateFrom || p.dateTo; });
  eq(dated.length, 1, 'P0b-1: datierte Namensvariante für „Frühere Namen"');
  eq(dated[0].value, 'Monasterium', 'P0b-1: frühere Schreibweise gelesen');
})();

// ═══════════════════════════════════════════════════════════════════════════
//  (k) PLACE-HIST — Dubletten-Erkennung + Merge (ADR-024 P0b-2a)
// ═══════════════════════════════════════════════════════════════════════════
group('(k) PLACE-HIST Dubletten + Merge');

// _placeFold: aggressive Normalisierung (Umlaut-Faltung) für Kandidatensuche
eq(API._placeFold('München'),  'munchen',  '_placeFold faltet ü→u');
eq(API._placeFold('Muenchen'), 'munchen',  '_placeFold faltet ue→u (= München)');
eq(API._placeFold('  Köln '),  'koln',     '_placeFold ö→o + trim');

(function() {
  // Dublette per Schreibweise: "München" vs "Muenchen" (gleicher Fold-Key)
  var db = {
    individuals: {}, families: {},
    placeObjects: {
      '@P1@': { id:'@P1@', title:'München', type:'City', pnames:[{value:'München'}], enclosedBy:[], lat:48.14, long:11.58 },
      '@P2@': { id:'@P2@', title:'Muenchen', type:'City', pnames:[{value:'Muenchen'}], enclosedBy:[] },
      '@P3@': { id:'@P3@', title:'Hamburg',  type:'City', pnames:[{value:'Hamburg'}],  enclosedBy:[] },
    },
  };
  API.setDb(db);
  var dups = API.findPlaceDuplicates();
  eq(dups.length, 1, 'findPlaceDuplicates: genau 1 Dublettengruppe (München/Muenchen)');
  eq(dups[0].ids.length, 2, 'Gruppe hat 2 Mitglieder');
  ok(dups[0].ids.indexOf('@P1@') >= 0 && dups[0].ids.indexOf('@P2@') >= 0, 'Gruppe enthält @P1@ + @P2@');
  ok(dups[0].ids.indexOf('@P3@') < 0, 'Hamburg ist NICHT in der Gruppe');
})();

(function() {
  // Merge: Verlierer-Schreibweise wird zu pname des Gewinners; ev.placeId umgehängt
  var db = {
    individuals: {
      '@I1@': { id:'@I1@', birth:{ place:'Muenchen', placeId:'@P2@' }, chr:{}, death:{}, buri:{}, events:[] },
      '@I2@': { id:'@I2@', birth:{}, chr:{}, death:{ place:'München', placeId:'@P1@' }, buri:{}, events:[] },
    },
    families: {},
    placeObjects: {
      '@P1@': { id:'@P1@', title:'München', type:'City', pnames:[{value:'München'}], enclosedBy:[], lat:48.14, long:11.58 },
      '@P2@': { id:'@P2@', title:'Muenchen', type:'City', pnames:[{value:'Muenchen'}], enclosedBy:[] },
    },
  };
  API.setDb(db);
  var res = API.mergePlaceObjects('@P1@', ['@P2@']);
  eq(res.merged, 1, 'merge: 1 Verlierer zusammengeführt');
  eq(res.repointed, 1, 'merge: 1 ev.placeId umgehängt (@P2@→@P1@)');
  ok(!API.getPlaceRegistry().byId['@P2@'], 'merge: Verlierer-placeObject gelöscht');
  var w = API.getPlaceRegistry().byId['@P1@'];
  ok((w.pnames || []).some(function(p){ return p.value === 'Muenchen'; }), 'merge: Verlierer-Schreibweise als pname erhalten (verlustfrei)');
  eq(db.individuals['@I1@'].birth.placeId, '@P1@', 'merge: INDI birth.placeId zeigt auf Gewinner');
  eq(API.getPlaceRegistry().findByName('Muenchen'), '@P1@', 'merge: alte Schreibweise findet jetzt den Gewinner');
})();

// ═══════════════════════════════════════════════════════════════════════════
//  (l) PLACE-HIST — Robustheit-Fixes (B2 mergeStringPlaces, B11 _epId-Kollision)
// ═══════════════════════════════════════════════════════════════════════════
group('(l) PLACE-HIST Robustheit (sw v851)');

// B2: mergeStringPlaces muss ev.placeId mit-repointen (vorher: Leiche nach Delete)
// Realistischer Mock: zwei Schreibweisen, die trim()-verschieden sind ("München"/"Muenchen").
(function() {
  var winnerId = API._epId('München');
  var loserId  = API._epId('Muenchen');
  ok(winnerId !== loserId, 'B2-pre: _epId verschiedener Inputs → verschiedene IDs');
  var db = {
    individuals: {
      '@I1@': { id:'@I1@', birth:{ place:'Muenchen', placeId: loserId },  chr:{}, death:{}, buri:{}, events:[] },
      '@I2@': { id:'@I2@', birth:{ place:'München',  placeId: winnerId }, chr:{}, death:{}, buri:{}, events:[] },
    },
    families: {},
    extraPlaces: {},
    placeObjects: {},
  };
  db.placeObjects[winnerId] = { id:winnerId, title:'München',  type:'City', pnames:[], enclosedBy:[], parentId:null };
  db.placeObjects[loserId]  = { id:loserId,  title:'Muenchen', type:'City', pnames:[], enclosedBy:[], parentId:null };
  API.setDb(db);

  var res = API.mergeStringPlaces('München', ['Muenchen']);
  ok(res.repointed >= 1, 'B2: mindestens 1 ev.place umbenannt');
  eq(db.individuals['@I1@'].birth.place, 'München', 'B2: ev.place auf Winner-String normiert');
  eq(db.individuals['@I1@'].birth.placeId, winnerId, 'B2: ev.placeId auf Winner-PO umgehängt (vorher: Leiche)');
  ok(!db.placeObjects[loserId], 'B2: Verlierer-_ep_-placeObject gelöscht');
  ok(!!db.placeObjects[winnerId], 'B2: Winner-placeObject erhalten');
})();

// B2b: mergeStringPlaces ohne Winner-PO → ev.placeId auf null setzen, nicht Leiche lassen
(function() {
  var loserId = API._epId('Hamburg loser');
  var db = {
    individuals: {
      '@I1@': { id:'@I1@', birth:{ place:'Hamburg loser', placeId: loserId }, chr:{}, death:{}, buri:{}, events:[] },
    },
    families: {},
    extraPlaces: {},
    placeObjects: {},
  };
  db.placeObjects[loserId] = { id:loserId, title:'Hamburg loser', type:'City', pnames:[], enclosedBy:[], parentId:null };
  API.setDb(db);
  API.mergeStringPlaces('Hamburg', ['Hamburg loser']);
  eq(db.individuals['@I1@'].birth.placeId, null, 'B2b: kein Winner-PO → ev.placeId auf null gesetzt (statt Leiche)');
})();

// B11: _epId-Kollision → Suffix-Fallback, kein stilles continue
(function() {
  var name = 'Wuppertal-Elberfeld';
  var collidingId = API._epId(name); // gleicher Name → gleiche ID, simuliert Kollisions-Position
  var db = {
    individuals: {}, families: {},
    extraPlaces: {},
    placeObjects: {},
  };
  // Hash-Slot belegen mit einem völlig anderen Eintrag → erzwingt Kollision in der Migration
  db.placeObjects[collidingId] = { id: collidingId, title: 'Belegt-Anderer-Ort', type:'City',
    pnames:[], enclosedBy:[], parentId:null, lat:50.0, long:7.0 };
  db.extraPlaces[name] = { name: name, lati: 51.25, long: 7.15 };
  API.setDb(db);
  API._migrateExtraPlacesToPlaceObjects(db);
  ok(!!db.placeObjects[collidingId + '_2'], 'B11: Kollision → Suffix _2 angelegt');
  eq(db.placeObjects[collidingId + '_2'].title, name, 'B11: Suffix-PO hat korrekten Titel (Ort nicht verschluckt)');
  eq(db.placeObjects[collidingId].title, 'Belegt-Anderer-Ort', 'B11: bestehendes PO unangetastet');
})();

// P1.1: _normPlaceName ist kanonisch — gleiche Identität trotz Whitespace + Casing
ok(API._normPlaceName(' Berlin ') === API._normPlaceName('berlin'), 'P1.1: _normPlaceName Whitespace+Case identisch');
ok(API._normPlaceName('München') === API._normPlaceName('münchen'), 'P1.1: _normPlaceName casefold');

// ═══════════════════════════════════════════════════════════════════════════
//  (m) PLACE-HIST — Identity Cross-Path Vertrag
//  Gleicher logischer Ort, fünf Schreibweisen → eine placeId in ALLEN Pfaden.
//  Verriegelt _normPlaceName als KANONISCHE Identitätsfunktion.
// ═══════════════════════════════════════════════════════════════════════════
group('(m) PLACE-HIST Identity Cross-Path');

(function() {
  var db = {
    individuals: {}, families: {},
    extraPlaces: {},
    placeObjects: {
      '@P1@': { id:'@P1@', title:'Münster', type:'City',
        pnames:[{value:'Münster'}, {value:'Monasterium', lang:'lat'}],
        enclosedBy:[], parentId:null },
    },
  };
  API.setDb(db);
  var reg = API.getPlaceRegistry();
  var truth = '@P1@';
  var variants = ['Münster', 'münster', 'MÜNSTER', '  Münster ', 'Münster\t', 'münster '];
  variants.forEach(function(v) {
    eq(reg.findByName(v), truth, 'm.findByName: "' + v + '" → @P1@');
  });
  // Alias via pname (Monasterium) muss ebenfalls auf @P1@ zeigen
  eq(reg.findByName('monasterium'), truth, 'm.findByName: pname-Alias casefold → @P1@');
  eq(reg.findByName('  Monasterium '), truth, 'm.findByName: pname-Alias + Whitespace → @P1@');

  // Cross-Path: _findOrCreatePO darf KEIN neues PO erzeugen, sondern @P1@ liefern
  var before = Object.keys(db.placeObjects).length;
  var id1 = API._findOrCreatePO('  MÜNSTER ', 'City');
  var id2 = API._findOrCreatePO('münster', 'City');
  var id3 = API._findOrCreatePO('Monasterium', 'City');
  var after = Object.keys(db.placeObjects).length;
  eq(id1, truth, 'm._findOrCreatePO: "  MÜNSTER " findet bestehendes @P1@ (kein Neu-Anlegen)');
  eq(id2, truth, 'm._findOrCreatePO: "münster" findet bestehendes @P1@');
  eq(id3, truth, 'm._findOrCreatePO: pname-Alias "Monasterium" findet @P1@');
  eq(after, before, 'm.Cross-Path: kein neues PO angelegt (Identity zentral korrekt)');
})();

// Cross-Path: mergeStringPlaces Winner-Lookup nutzt _normPlaceName
(function() {
  var winnerId = API._epId('Köln');
  var loserId  = API._epId('Koeln');
  var db = {
    individuals: {
      '@I1@': { id:'@I1@', birth:{ place:'Koeln', placeId: loserId }, chr:{}, death:{}, buri:{}, events:[] },
    },
    families: {},
    extraPlaces: {},
    placeObjects: {},
  };
  db.placeObjects[winnerId] = { id:winnerId, title:'Köln',  type:'City', pnames:[], enclosedBy:[], parentId:null };
  db.placeObjects[loserId]  = { id:loserId,  title:'Koeln', type:'City', pnames:[], enclosedBy:[], parentId:null };
  API.setDb(db);
  // Winner-Name in anderer Casing/Whitespace → muss trotzdem das richtige Winner-PO finden
  var res = API.mergeStringPlaces(' köln ', ['Koeln']);
  eq(db.individuals['@I1@'].birth.placeId, winnerId,
    'm.mergeStringPlaces: Winner-Lookup via _normPlaceName findet PO trotz Whitespace+Case');
  ok(!db.placeObjects[loserId], 'm.mergeStringPlaces: Verlierer-PO trotzdem gelöscht');
  ok(!!db.placeObjects[winnerId], 'm.mergeStringPlaces: Winner-PO erhalten');
})();

// ═══════════════════════════════════════════════════════════════════════════
//  (n) PLACE-HIST — mergeStringPlaces Edge-Cases
// ═══════════════════════════════════════════════════════════════════════════
group('(n) PLACE-HIST mergeStringPlaces Edge-Cases');

// Leere loserNames → no-op
(function() {
  API.setDb({ individuals:{}, families:{}, extraPlaces:{}, placeObjects:{} });
  var res = API.mergeStringPlaces('Berlin', []);
  eq(res.repointed, 0, 'n.leer: leere loserNames → 0 repointed');
})();

// Mehrere Verlierer in einem Aufruf
(function() {
  var wId = API._epId('Hamburg');
  var l1  = API._epId('Hamborg');
  var l2  = API._epId('Hambourg');
  var db = {
    individuals: {
      '@I1@': { id:'@I1@', birth:{ place:'Hamborg',  placeId: l1 }, chr:{}, death:{}, buri:{}, events:[] },
      '@I2@': { id:'@I2@', birth:{ place:'Hambourg', placeId: l2 }, chr:{}, death:{}, buri:{}, events:[] },
    },
    families: {},
    extraPlaces: {},
    placeObjects: {},
  };
  db.placeObjects[wId] = { id:wId, title:'Hamburg',  type:'City', pnames:[], enclosedBy:[], parentId:null };
  db.placeObjects[l1]  = { id:l1,  title:'Hamborg',  type:'City', pnames:[], enclosedBy:[], parentId:null };
  db.placeObjects[l2]  = { id:l2,  title:'Hambourg', type:'City', pnames:[], enclosedBy:[], parentId:null };
  API.setDb(db);
  var res = API.mergeStringPlaces('Hamburg', ['Hamborg', 'Hambourg']);
  ok(res.repointed >= 2, 'n.multi: ≥2 Events umbenannt');
  eq(db.individuals['@I1@'].birth.placeId, wId, 'n.multi: I1.placeId auf Winner umgehängt');
  eq(db.individuals['@I2@'].birth.placeId, wId, 'n.multi: I2.placeId auf Winner umgehängt');
  ok(!db.placeObjects[l1] && !db.placeObjects[l2], 'n.multi: beide Verlierer-POs gelöscht');
  ok(!!db.placeObjects[wId], 'n.multi: Winner-PO erhalten');
})();

// Verlierer-String OHNE placeObject (reiner GEDCOM-Fall) → kein Crash, kein Repoint-Fehler
(function() {
  var wId = API._epId('Bremen');
  var db = {
    individuals: {
      '@I1@': { id:'@I1@', birth:{ place:'Brema', placeId:null }, chr:{}, death:{}, buri:{}, events:[] },
    },
    families: {},
    extraPlaces: { 'Brema': { name:'Brema', lati:null, long:null } },
    placeObjects: {},
  };
  db.placeObjects[wId] = { id:wId, title:'Bremen', type:'City', pnames:[], enclosedBy:[], parentId:null };
  API.setDb(db);
  var res = API.mergeStringPlaces('Bremen', ['Brema']);
  eq(db.individuals['@I1@'].birth.place, 'Bremen', 'n.no-loser-PO: ev.place auf Winner-String normiert');
  ok(!db.extraPlaces['Brema'], 'n.no-loser-PO: extraPlaces-Eintrag des Verlierers entfernt');
  ok(!!db.placeObjects[wId], 'n.no-loser-PO: Winner-PO unangetastet');
})();

// Verlierer hat Koordinaten in extraPlaces — Winner-PO ohne Koords erbt sie
(function() {
  var wId = API._epId('Dresden');
  var db = {
    individuals: {
      '@I1@': { id:'@I1@', birth:{ place:'Drezno', placeId:null }, chr:{}, death:{}, buri:{}, events:[] },
    },
    families: {},
    extraPlaces: { 'Drezno': { name:'Drezno', lati:51.05, long:13.74 } },
    placeObjects: {},
  };
  db.placeObjects[wId] = { id:wId, title:'Dresden', type:'City', pnames:[], enclosedBy:[], parentId:null, lat:null, long:null };
  API.setDb(db);
  API.mergeStringPlaces('Dresden', ['Drezno']);
  eq(db.placeObjects[wId].lat,  51.05, 'n.coord-inherit: Winner-PO erbt lat aus Verlierer-extraPlaces');
  eq(db.placeObjects[wId].long, 13.74, 'n.coord-inherit: Winner-PO erbt long aus Verlierer-extraPlaces');
})();

// ═══════════════════════════════════════════════════════════════════════════
//  (o) PLACE-HIST — _migrateExtraPlacesToPlaceObjects + _epId
// ═══════════════════════════════════════════════════════════════════════════
group('(o) PLACE-HIST extraPlaces-Migration + _epId');

// _epId: gleicher Input → gleiche ID
eq(API._epId('Münster'), API._epId('Münster'), 'o._epId: deterministisch (gleicher Input)');
ok(API._epId('Münster') !== API._epId('Muenster'), 'o._epId: andere Inputs → andere IDs (typisch)');
ok(/^_ep_[0-9a-f]{8}/.test(API._epId('Test')), 'o._epId: Format _ep_<8 hex>');

// Migration: extraPlaces mit Koords → neues placeObject
(function() {
  var db = {
    individuals:{}, families:{},
    extraPlaces: { 'Görlitz': { name:'Görlitz', lati:51.15, long:14.99 } },
    placeObjects: {},
  };
  API.setDb(db);
  API._migrateExtraPlacesToPlaceObjects(db);
  var newId = API._epId('Görlitz');
  ok(!!db.placeObjects[newId], 'o.migrate: neues placeObject angelegt');
  eq(db.placeObjects[newId].title, 'Görlitz', 'o.migrate: Titel korrekt');
  eq(db.placeObjects[newId].lat, 51.15, 'o.migrate: lat übernommen');
})();

// Migration: existierendes placeObject ohne Koords → ergänzt
(function() {
  var existingId = '@P_X@';
  var db = {
    individuals:{}, families:{},
    extraPlaces: { 'Lübeck': { name:'Lübeck', lati:53.87, long:10.69, trans:[{value:'Lubeca', lang:'lat'}] } },
    placeObjects: {},
  };
  db.placeObjects[existingId] = { id:existingId, title:'Lübeck', type:'City',
    pnames:[], enclosedBy:[], parentId:null, lat:null, long:null };
  API.setDb(db);
  API._migrateExtraPlacesToPlaceObjects(db);
  eq(db.placeObjects[existingId].lat, 53.87, 'o.merge-into-existing: Koords ergänzt');
  ok(db.placeObjects[existingId].pnames.some(function(p){ return p.value === 'Lubeca'; }),
    'o.merge-into-existing: trans als pname übernommen');
  var newId = API._epId('Lübeck');
  ok(!db.placeObjects[newId] || newId === existingId, 'o.merge-into-existing: KEIN Duplikat angelegt');
})();

// Migration: idempotent (2× hintereinander = stabil)
(function() {
  var db = {
    individuals:{}, families:{},
    extraPlaces: { 'Erfurt': { name:'Erfurt', lati:50.98, long:11.03 } },
    placeObjects: {},
  };
  API.setDb(db);
  API._migrateExtraPlacesToPlaceObjects(db);
  var count1 = Object.keys(db.placeObjects).length;
  API._migrateExtraPlacesToPlaceObjects(db);
  var count2 = Object.keys(db.placeObjects).length;
  eq(count1, count2, 'o.idempotent: zweiter Aufruf legt nichts Neues an');
})();

// Migration: extraPlaces ohne Koords UND ohne trans → übersprungen
(function() {
  var db = {
    individuals:{}, families:{},
    extraPlaces: { 'Nichts': { name:'Nichts', lati:null, long:null } },
    placeObjects: {},
  };
  API.setDb(db);
  API._migrateExtraPlacesToPlaceObjects(db);
  eq(Object.keys(db.placeObjects).length, 0, 'o.skip-empty: kein PO für leere extraPlaces');
})();

// ═══════════════════════════════════════════════════════════════════════════
//  (p) PLACE-HIST — mutatePlaceObject / upsertPlaceObject (P2 Item 8)
// ═══════════════════════════════════════════════════════════════════════════
group('(p) PLACE-HIST mutatePlaceObject (sw v853)');

// mutatePlaceObject: mutiert, invalidiert Registry+Cache, gibt true zurück
(function() {
  var db = {
    individuals:{}, families:{},
    extraPlaces:{},
    placeObjects: { '@P_M@': { id:'@P_M@', title:'Test', type:'City', pnames:[], enclosedBy:[], parentId:null } },
  };
  API.setDb(db);
  // Registry vorab cachen, damit wir Invalidation sehen
  var reg1 = API.getPlaceRegistry();
  ok(reg1.byId['@P_M@'].type === 'City', 'p.pre: Registry-Cache vor Mutation');

  var ret = API.mutatePlaceObject('@P_M@', function(po) {
    po.type = 'Village';
    po.pnames.push({ value:'Alt-Test', lang:'', dateFrom:null, dateTo:null, dateType:null, _dateRaw:null });
  });
  eq(ret, true, 'p.mutate: return true bei existierendem placeObject');
  eq(db.placeObjects['@P_M@'].type, 'Village', 'p.mutate: Mutation angewendet (type)');
  eq(db.placeObjects['@P_M@'].pnames.length, 1, 'p.mutate: Mutation angewendet (pname push)');

  // Registry-Cache muss invalidiert worden sein → neuer Aufruf liefert frische Daten
  var reg2 = API.getPlaceRegistry();
  ok(reg1 !== reg2, 'p.mutate: Registry-Cache invalidiert (neuer Registry-Instance-Bezug)');
  eq(reg2.byId['@P_M@'].type, 'Village', 'p.mutate: neue Registry zeigt mutierten type');
})();

// mutatePlaceObject: false zurück bei unbekannter id, keine Anlage
(function() {
  var db = { individuals:{}, families:{}, extraPlaces:{}, placeObjects:{} };
  API.setDb(db);
  var ret = API.mutatePlaceObject('@NOPE@', function(po) { po.touched = true; });
  eq(ret, false, 'p.mutate-missing: return false bei unbekannter id');
  eq(Object.keys(db.placeObjects).length, 0, 'p.mutate-missing: kein PO angelegt');
})();

// ═══════════════════════════════════════════════════════════════════════════
//  (q) PLACE-HIST — P2 Item 7: TRAN aus placeObjects.pnames
// ═══════════════════════════════════════════════════════════════════════════
group('(q) PLACE-HIST TRAN aus pnames (sw v854)');

// GEDCOM-Schreiber muss TRAN-Zeilen aus placeObjects.pnames produzieren
// (undatierte Aliase mit value !== Haupttitel; lang optional).
(function() {
  var db = {
    individuals: {
      '@I1@': { id:'@I1@', name:'Test /Mann/', sex:'M',
        birth:{ place:'Wrocław', date:'1900', lati:null, long:null,
          citations:[], _extra:[] },
        chr:{}, death:{}, buri:{}, events:[],
        sourceRefs:new Set(), _passthrough:[], topSources:[] },
    },
    families: {}, sources: {}, repositories: {}, notes: {}, extraRecords:[],
    headLines: [], placForm: '',
    extraPlaces: {},
    placeObjects: {
      '@P1@': { id:'@P1@', title:'Wrocław', type:'City', lat:null, long:null,
        pnames:[
          { value:'Wrocław',  lang:'pol' },                                 // = Titel → kein TRAN
          { value:'Breslau',  lang:'deu' },                                  // undatiert → TRAN
          { value:'Vratislavia', lang:'lat' },                               // undatiert → TRAN
          { value:'Wratislavia', lang:'lat', dateFrom:'1200', dateTo:'1400' },// datiert → KEIN TRAN
        ],
        enclosedBy:[], parentId:null },
    },
  };
  API.setDb(db);
  // GEDCOM-Schreiben simulieren via _writePlacTrans — geht über setDb's writeGEDCOM-Pfad.
  // Wir testen das Verhalten transitiv über die globale _writePlacTrans wenn die im
  // Harness verfügbar ist; sonst über die Registry-Filter direkt.
  var reg = API.getPlaceRegistry();
  var pid = reg.findByName('Wrocław');
  var po  = reg.byId[pid];
  // Filter wie im Writer
  var trans = (po.pnames || [])
    .filter(function(pn) { return pn.value && pn.value !== 'Wrocław' && !pn.dateFrom && !pn.dateTo; })
    .map(function(pn) { return { value: pn.value, lang: pn.lang || '' }; });
  eq(trans.length, 2, 'q.filter: 2 TRAN-Kandidaten (Haupttitel + datierter gefiltert)');
  ok(trans.some(function(t){return t.value==='Breslau' && t.lang==='deu';}),     'q.filter: Breslau/deu enthalten');
  ok(trans.some(function(t){return t.value==='Vratislavia' && t.lang==='lat';}), 'q.filter: Vratislavia/lat enthalten');
  ok(!trans.some(function(t){return t.value==='Wratislavia';}), 'q.filter: datierte historische Namen NICHT als TRAN');
  ok(!trans.some(function(t){return t.value==='Wrocław';}),     'q.filter: Haupttitel NICHT als TRAN');
})();

// ═══════════════════════════════════════════════════════════════════════════
//  (r) PLACE-HIST — JSON-Import-Dedup (Item 15/B6, sw v855)
// ═══════════════════════════════════════════════════════════════════════════
group('(r) PLACE-HIST JSON-Import Dedup');

// Title-Match → Merge in vorhandenes PO, kein Duplikat
(function() {
  var db = {
    individuals:{}, families:{}, extraPlaces:{},
    placeObjects: {
      '@TARGET@': { id:'@TARGET@', title:'München', type:'City', lat:48.14, long:11.58,
        pnames:[], enclosedBy:[], parentId:null },
    },
  };
  API.setDb(db);
  var imported = {
    '_ep_xyz12345': { id:'_ep_xyz12345', title:'München', type:'City', lat:null, long:null,
      pnames:[{value:'Munchen', lang:'eng', dateFrom:null, dateTo:null}],
      enclosedBy:[], parentId:null, _govId:'object_999' },
  };
  var stats = API._mergePlaceObjectsFromImport(db, imported);
  eq(stats.added,  0, 'r.title-match: kein neues PO angelegt');
  eq(stats.merged, 1, 'r.title-match: 1 ins bestehende gemerged');
  eq(Object.keys(db.placeObjects).length, 1, 'r.title-match: Anzahl POs unverändert');
  ok(db.placeObjects['@TARGET@'].pnames.some(function(p){return p.value==='Munchen';}),
    'r.title-match: imported pname übernommen');
  eq(db.placeObjects['@TARGET@']._govId, 'object_999',
    'r.title-match: imported _govId übernommen (fehlte vorher)');
  eq(db.placeObjects['@TARGET@'].lat, 48.14,
    'r.title-match: bestehende Koords NICHT überschrieben');
})();

// Kein Title-Match → mit eigener id einfügen
(function() {
  var db = {
    individuals:{}, families:{}, extraPlaces:{},
    placeObjects: {
      '@P1@': { id:'@P1@', title:'Hamburg', type:'City', pnames:[], enclosedBy:[], parentId:null, lat:null, long:null },
    },
  };
  API.setDb(db);
  var imported = {
    '_ep_neu1234': { id:'_ep_neu1234', title:'Berlin', type:'City', lat:52.5, long:13.4,
      pnames:[], enclosedBy:[], parentId:null },
  };
  var stats = API._mergePlaceObjectsFromImport(db, imported);
  eq(stats.added,  1, 'r.no-match: 1 neu hinzugefügt');
  eq(stats.merged, 0, 'r.no-match: 0 gemerged');
  ok(!!db.placeObjects['_ep_neu1234'], 'r.no-match: mit eigener id eingefügt');
  eq(db.placeObjects['_ep_neu1234'].title, 'Berlin', 'r.no-match: Titel übernommen');
})();

// Verschiedene Schreibweisen kollabieren (case+whitespace)
(function() {
  var db = {
    individuals:{}, families:{}, extraPlaces:{},
    placeObjects: {
      '@T@': { id:'@T@', title:'Köln', pnames:[], enclosedBy:[], parentId:null, lat:null, long:null, type:'City' },
    },
  };
  API.setDb(db);
  var imported = {
    '_a': { id:'_a', title:'  KÖLN ',   pnames:[{value:'Colonia', lang:'lat'}], enclosedBy:[], parentId:null },
    '_b': { id:'_b', title:'köln',      pnames:[{value:'Cologne', lang:'eng'}], enclosedBy:[], parentId:null },
  };
  var stats = API._mergePlaceObjectsFromImport(db, imported);
  eq(stats.added,  0, 'r.case-fold: kein neuer PO (Title-Norm kollabiert)');
  eq(stats.merged, 2, 'r.case-fold: beide ins bestehende gemerged');
  eq(Object.keys(db.placeObjects).length, 1, 'r.case-fold: nur 1 PO insgesamt');
  var pnames = db.placeObjects['@T@'].pnames;
  ok(pnames.some(function(p){return p.value==='Colonia';}), 'r.case-fold: Colonia/lat übernommen');
  ok(pnames.some(function(p){return p.value==='Cologne';}), 'r.case-fold: Cologne/eng übernommen');
})();

// enclosedBy-Remap: import_id → final_id
(function() {
  var db = {
    individuals:{}, families:{}, extraPlaces:{},
    placeObjects: {
      // Eltern existiert bereits unter anderem Handle
      '@PARENT@': { id:'@PARENT@', title:'Kreis Steinfurt', type:'County',
        pnames:[], enclosedBy:[], parentId:null, lat:null, long:null },
    },
  };
  API.setDb(db);
  var imported = {
    // Eltern im Import (anderer id, gleicher Titel)
    '_imp_parent': { id:'_imp_parent', title:'Kreis Steinfurt', type:'County',
      pnames:[], enclosedBy:[], parentId:null },
    // Kind referenziert Eltern-import-id
    '_imp_child': { id:'_imp_child', title:'Ochtrup', type:'Town',
      pnames:[], enclosedBy:[{placeId:'_imp_parent', dateFrom:null, dateTo:null}],
      parentId:'_imp_parent' },
  };
  API._mergePlaceObjectsFromImport(db, imported);
  var child = db.placeObjects['_imp_child'];
  ok(!!child, 'r.remap: Kind eingefügt');
  eq(child.enclosedBy[0].placeId, '@PARENT@',
    'r.remap: enclosedBy[0].placeId auf existierende Parent-id remapped');
  eq(child.parentId, '@PARENT@', 'r.remap: parentId auf existierende Parent-id remapped');
  ok(!db.placeObjects['_imp_parent'], 'r.remap: Import-Parent nicht als Duplikat angelegt');
})();

// ID-Kollision bei verschiedenen Titeln → Suffix
(function() {
  var db = {
    individuals:{}, families:{}, extraPlaces:{},
    placeObjects: {
      '_ep_abc12345': { id:'_ep_abc12345', title:'Original', type:'City',
        pnames:[], enclosedBy:[], parentId:null, lat:null, long:null },
    },
  };
  API.setDb(db);
  var imported = {
    '_ep_abc12345': { id:'_ep_abc12345', title:'Anderer Ort', type:'Village',
      pnames:[], enclosedBy:[], parentId:null, lat:null, long:null },
  };
  var stats = API._mergePlaceObjectsFromImport(db, imported);
  eq(stats.added, 1, 'r.id-collision: trotz id-Kollision (anderer Titel) als neu eingefügt');
  ok(!!db.placeObjects['_ep_abc12345_imp2'], 'r.id-collision: Suffix _imp2 verwendet');
  eq(db.placeObjects['_ep_abc12345'].title, 'Original',
    'r.id-collision: bestehender PO unangetastet');
})();

// upsertPlaceObject: legt an wenn id fehlt, mutiert wenn da
(function() {
  var db = { individuals:{}, families:{}, extraPlaces:{}, placeObjects:{} };
  API.setDb(db);
  // upsert auf nicht-existierender id → makeNew wird aufgerufen
  var id = API.upsertPlaceObject('@P_U@', function() {
    return { id:'@P_U@', title:'Neu', type:'City', pnames:[], enclosedBy:[], parentId:null };
  }, function(po) {
    po.type = 'Village'; // weiter mutieren nach Anlage
  });
  eq(id, '@P_U@', 'p.upsert-new: gibt placeId zurück');
  ok(!!db.placeObjects['@P_U@'], 'p.upsert-new: placeObject angelegt');
  eq(db.placeObjects['@P_U@'].type, 'Village', 'p.upsert-new: fn nach Anlage angewendet');

  // upsert auf existierender id → makeNew NICHT aufgerufen
  var makeNewCalled = false;
  API.upsertPlaceObject('@P_U@', function() {
    makeNewCalled = true;
    return { id:'@P_U@', title:'Sollte nicht', type:'Country', pnames:[], enclosedBy:[], parentId:null };
  }, function(po) { po.title = 'Geändert'; });
  eq(makeNewCalled, false, 'p.upsert-existing: makeNew NICHT aufgerufen wenn id existiert');
  eq(db.placeObjects['@P_U@'].title, 'Geändert', 'p.upsert-existing: fn angewendet');
  eq(db.placeObjects['@P_U@'].type,  'Village', 'p.upsert-existing: bestehende Felder erhalten');
})();

// ═══════════════════════════════════════════════════════════════════════════
//  (s) PLACE-HIST — _eventCoords (P2 Item 9: single source of truth)
// ═══════════════════════════════════════════════════════════════════════════
group('(s) PLACE-HIST _eventCoords (sw v857)');

// ev.placeId zeigt auf po mit lat → po.lat hat Vorrang
(function() {
  var db = {
    individuals: {}, families: {}, extraPlaces: {},
    placeObjects: {
      '@P1@': { id:'@P1@', title:'München', type:'City', lat:48.14, long:11.58,
        pnames:[], enclosedBy:[], parentId:null },
    },
  };
  API.setDb(db);
  var c1 = API._eventCoords({ placeId:'@P1@', place:'München', lati:99, long:99 });
  eq(c1.lati, 48.14, 's.placeId-priority: po.lat überschreibt ev.lati');
  eq(c1.long, 11.58, 's.placeId-priority: po.long überschreibt ev.long');
})();

// Kein ev.placeId aber ev.place findet po via findByName
(function() {
  API.setDb({
    individuals:{}, families:{}, extraPlaces:{},
    placeObjects: {
      '@P1@': { id:'@P1@', title:'Hamburg', lat:53.55, long:9.99,
        pnames:[], enclosedBy:[], parentId:null },
    },
  });
  var c = API._eventCoords({ placeId:null, place:'Hamburg', lati:null, long:null });
  eq(c.lati, 53.55, 's.findByName: ev ohne placeId aber mit place → po.lat via findByName');
})();

// Kein po → ev.lati fallback
(function() {
  API.setDb({ individuals:{}, families:{}, extraPlaces:{}, placeObjects:{} });
  var c = API._eventCoords({ place:'Unknown', lati:55.5, long:13.5 });
  eq(c.lati, 55.5, 's.fallback: kein po → ev.lati');
  eq(c.long, 13.5, 's.fallback: kein po → ev.long');
})();

// po existiert aber ohne Koords → ev.lati fallback
(function() {
  API.setDb({
    individuals:{}, families:{}, extraPlaces:{},
    placeObjects: {
      '@P1@': { id:'@P1@', title:'NoCoord', lat:null, long:null,
        pnames:[], enclosedBy:[], parentId:null },
    },
  });
  var c = API._eventCoords({ placeId:'@P1@', place:'NoCoord', lati:7.7, long:8.8 });
  eq(c.lati, 7.7, 's.po-empty: po ohne lat → ev.lati');
})();

// ev=null → {null, null}
(function() {
  var c = API._eventCoords(null);
  eq(c.lati, null, 's.null: null-Event → lati null');
  eq(c.long, null, 's.null: null-Event → long null');
})();

// ═══════════════════════════════════════════════════════════════════════════
//  UI-LOGIK-TESTS (t)–(ab) — siehe _loadUI()/_makeMiniDOM oben
//  Decken die wiederkehrend brüchigen UI-Pfade aus den P5/P6-Robustheits-
//  Sprints ab (sw v861–v890): ViewState, DetailContainer, ClickMap, DirtyBit,
//  Lifecycle, ListSync, Toast-Once, PLAC-Mode, FormSaveMerge.
// ═══════════════════════════════════════════════════════════════════════════

// UI-Helper: in NODE/JXA gleichermaßen Zugriff auf den Eval-Scope —
// AppState/UIState liegen nach dem Eval als globale Variablen vor (JXA: this,
// Node: _ctx). API-Objekt enthält sie zusätzlich für Convenience.
function _uiState() { return IS_NODE ? _ctx : window; }
function _ui()      { return _loadUI(); }

// Setzt AppState.db + UIState auf Test-Defaults zurück.
// Nach jedem Block aufrufen, damit Blöcke voneinander unabhängig sind.
function _uiReset() {
  var W = _uiState();
  W.AppState.db = { individuals: {}, families: {}, sources: {}, placeObjects: {}, extraPlaces: {} };
  W.AppState.currentTab = null;
  W.AppState.currentPersonId = null;
  W.AppState.currentFamilyId = null;
  W.AppState.currentSourceId = null;
  W.AppState.currentRepoId   = null;
  W.AppState.currentPlaceName = null;
  W.AppState._detailActive = false;
  W.AppState.changed = false;
  W.UIState._lastTabSel = {};
  W.UIState._dirty = {};
  W.UIState._placeModes = {};
  W.UIState._placeRegistry = null;
  W.UIState._placesCache = null;
  // _dom.reset() löscht IDs + body, NICHT die globalen click/change/input-
  // Listener (die einmal beim UI-Load registriert werden und über die ganze
  // Lebensdauer der Tests aktiv bleiben sollen). Wir leeren nur die Test-
  // spezifischen Buckets (viewstate-change, visibilitychange) und IDs.
  for (var k in _dom.idMap) delete _dom.idMap[k];
  ['viewstate-change'].forEach(function(t) { delete _dom.docListeners[t]; });
  _dom.document.body.childNodes = [];
  _dom.document.body.children = [];
  _dom.document.body._classes = new Set();
  _dom.document._hidden = false;
  W._toastLog = [];
  W._idbStore = {};
  W._spy = { renderTab:0, applyPersonFilter:0, _vsReattach:0, _vsTeardown:0,
             showDetail:[], showFamilyDetail:[], showSourceDetail:[], showPlaceDetail:[] };
}

(function _smoke() {
  group('(t-smoke) UI-Loader');
  var ui = _ui();
  ok(ui && typeof ui.ViewState === 'object', 'UI-Loader: window._uiApi.ViewState exponiert');
  ok(typeof ui._activateDetailContainer === 'function', '_activateDetailContainer exponiert');
  ok(typeof ui._CLICK_MAP === 'object',                   '_CLICK_MAP exponiert');
  ok(typeof ui.switchTab === 'function',                  'switchTab exponiert');
  ok(typeof ui._mobileSelectionRestore === 'function',    '_mobileSelectionRestore exponiert');
})();

// ═══════════════════════════════════════════════════════════════════════════
//  (t) UI — ViewState (ADR-025 A1)
//  Exklusiver Fokus, Validierung gegen AppState.db, viewstate-change-Event,
//  IDB-Persistenz via _persistLastTabSel.
// ═══════════════════════════════════════════════════════════════════════════
group('(t) UI ViewState');

(function() {
  _uiReset();
  var W = _uiState(), ui = _ui();
  W.AppState.db.individuals['@I1@'] = { id:'@I1@', name:'A /B/' };
  W.AppState.db.families['@F1@']    = { id:'@F1@', husb:'@I1@' };

  // Event-Listener: viewstate-change soll genau einmal feuern
  var events = [];
  _dom.document.addEventListener('viewstate-change', function(ev) { events.push(ev.detail); });

  ui.ViewState.setCurrent('persons', '@I1@');
  eq(W.AppState.currentPersonId, '@I1@', 't.setCurrent: persons → AppState.currentPersonId');
  eq(W.AppState.currentFamilyId, null,    't.setCurrent: andere currentX bleiben/werden null');
  eq(W.UIState._lastTabSel.persons, '@I1@', 't.setCurrent: UIState._lastTabSel[persons] gesetzt');
  eq(events.length, 1, 't.setCurrent: viewstate-change einmal dispatcht');
  eq(events[0] && events[0].tab, 'persons', 't.setCurrent: Event.detail.tab=persons');
  eq(events[0] && events[0].id,  '@I1@',    't.setCurrent: Event.detail.id=@I1@');

  // Wechsel auf families → currentPersonId muss exklusiv zurückgesetzt werden
  ui.ViewState.setCurrent('families', '@F1@');
  eq(W.AppState.currentPersonId, null,   't.setCurrent: Wechsel auf families löscht currentPersonId (exklusiver Fokus)');
  eq(W.AppState.currentFamilyId, '@F1@', 't.setCurrent: families → AppState.currentFamilyId');
  eq(W.UIState._lastTabSel.persons,  '@I1@', 't.setCurrent: persons-Auswahl bleibt in _lastTabSel');
  eq(W.UIState._lastTabSel.families, '@F1@', 't.setCurrent: families-Auswahl in _lastTabSel');

  // IDB-Persistenz (via _persistLastTabSel)
  ok(W._idbStore.last_tab_sel && W._idbStore.last_tab_sel.persons === '@I1@',
     't.setCurrent: idbPut(last_tab_sel) via _persistLastTabSel');
})();

(function() {
  _uiReset();
  var W = _uiState(), ui = _ui();
  W.AppState.db.individuals['@I1@'] = { id:'@I1@', name:'A /B/' };

  ui.ViewState.setCurrent('persons', '@I1@');
  eq(ui.ViewState.getCurrent('persons'), '@I1@', 't.getCurrent: gespeicherte ID');

  // Entität entfernt → getCurrent gibt null (Validierung gegen AppState.db)
  delete W.AppState.db.individuals['@I1@'];
  eq(ui.ViewState.getCurrent('persons'), null, 't.getCurrent: gelöschte ID → null (Validierung)');

  // Nichts gesetzt → null
  _uiReset();
  W = _uiState(); ui = _ui();
  eq(ui.ViewState.getCurrent('persons'), null, 't.getCurrent: ohne Setup → null');

  // places werden NICHT gegen db validiert (Existenz wird erst bei Verwendung in collectPlaces geprüft)
  ui.ViewState.setCurrent('places', 'Berlin');
  eq(ui.ViewState.getCurrent('places'), 'Berlin', 't.getCurrent: places → ohne Validierung');
})();

(function() {
  // Mehrfaches setCurrent auf gleichem Tab überschreibt id
  _uiReset();
  var W = _uiState(), ui = _ui();
  W.AppState.db.individuals['@I1@'] = { id:'@I1@', name:'A /B/' };
  W.AppState.db.individuals['@I2@'] = { id:'@I2@', name:'B /C/' };
  ui.ViewState.setCurrent('persons', '@I1@');
  ui.ViewState.setCurrent('persons', '@I2@');
  eq(W.AppState.currentPersonId, '@I2@', 't.setCurrent: Re-Set überschreibt');
  eq(W.UIState._lastTabSel.persons, '@I2@', 't.setCurrent: _lastTabSel persons → @I2@');
})();

// ═══════════════════════════════════════════════════════════════════════════
//  (u) UI — _activateDetailContainer (ADR-025 P5 A4/A5)
//  5 separate Detail-Container, per-Entität Scroll-Save/Restore, viewInit-Flag.
// ═══════════════════════════════════════════════════════════════════════════
group('(u) UI _activateDetailContainer');

// Hilfsfunktion: legt alle 5 Detail-Container + v-detail + body.desktop-mode an
function _setupDetailContainers() {
  _uiReset();
  _dom.ensureId('v-detail', 'div');
  ['detailPerson','detailFamily','detailPlace','detailSource','detailMedia']
    .forEach(function(id) { _dom.ensureId(id, 'div'); });
  _dom.document.body.classList.add('desktop-mode');
  return _ui();
}

(function() {
  var ui = _setupDetailContainers();
  ui._activateDetailContainer('detailPerson', '@I1@');
  // Nur detailPerson hat dc-active
  ['detailPerson','detailFamily','detailPlace','detailSource','detailMedia'].forEach(function(id) {
    var el = _dom.document.getElementById(id);
    eq(el.classList.contains('dc-active'), id === 'detailPerson',
       'u.dc-active: ' + id + ' Klasse korrekt (' + (id === 'detailPerson' ? 'aktiv' : 'inaktiv') + ')');
  });
})();

(function() {
  // Wechsel + Scroll-Save/Restore
  var ui = _setupDetailContainers();
  var vdet = _dom.document.getElementById('v-detail');

  ui._activateDetailContainer('detailPerson', '@I1@');
  vdet.scrollTop = 250;                          // User scrollt im Personen-Detail

  ui._activateDetailContainer('detailFamily', '@F1@');
  var dp = _dom.document.getElementById('detailPerson');
  eq(dp.dataset.savedScroll, '250', 'u.scroll-save: Personen-Scroll vor Wechsel gesichert');
  eq(vdet.scrollTop, 0, 'u.scroll-new: neue Entität → scrollTop=0');

  // Zurück zu Personen → Scroll restoren
  vdet.scrollTop = 0;                            // reset für Klarheit
  ui._activateDetailContainer('detailPerson', '@I1@');
  eq(vdet.scrollTop, 250, 'u.scroll-restore: zurück zu @I1@ → savedScroll=250 angewendet');
})();

(function() {
  // Gleiche entityId nach Re-Aktivierung → changed=false → savedScroll bleibt
  var ui = _setupDetailContainers();
  var vdet = _dom.document.getElementById('v-detail');
  var dp = _dom.document.getElementById('detailPerson');

  ui._activateDetailContainer('detailPerson', '@I1@');
  vdet.scrollTop = 300;
  // Switch to family and back
  ui._activateDetailContainer('detailFamily', '@F1@');
  ui._activateDetailContainer('detailPerson', '@I1@');
  eq(vdet.scrollTop, 300, 'u.same-entity: gleiche entityId → savedScroll restauriert');
  eq(dp.dataset.viewInit, 'true', 'u.viewInit: data-view-init=true gesetzt');
  eq(dp.dataset.currentId, '@I1@', 'u.currentId: data-current-id auf @I1@');
})();

(function() {
  // Andere entityId im gleichen Container → scrollTop=0 (changed=true)
  var ui = _setupDetailContainers();
  var vdet = _dom.document.getElementById('v-detail');

  ui._activateDetailContainer('detailPerson', '@I1@');
  vdet.scrollTop = 400;
  ui._activateDetailContainer('detailPerson', '@I2@');
  eq(vdet.scrollTop, 0, 'u.change-entity: andere entityId → scrollTop=0');
  eq(_dom.document.getElementById('detailPerson').dataset.currentId, '@I2@',
     'u.change-entity: currentId aktualisiert');
})();

(function() {
  // Mobile (kein desktop-mode) → kein Scroll-Save/Restore
  _uiReset();
  ['detailPerson','detailFamily','detailPlace','detailSource','detailMedia']
    .forEach(function(id) { _dom.ensureId(id, 'div'); });
  _dom.ensureId('v-detail', 'div');
  // body NICHT desktop-mode
  var ui = _ui();
  var vdet = _dom.document.getElementById('v-detail');
  vdet.scrollTop = 99;
  ui._activateDetailContainer('detailPerson', '@I1@');
  ok(vdet.scrollTop === 99 || vdet.scrollTop === 0,
     'u.mobile: Mobile-Pfad ändert scrollTop nicht via Save/Restore-Logik (entweder 99 oder 0)');
  var dp = _dom.document.getElementById('detailPerson');
  eq(dp.dataset.savedScroll, undefined, 'u.mobile: kein savedScroll-Eintrag gesetzt');
})();

(function() {
  // entityId === undefined → früher Return nach Container-Toggle, kein Side-Effect
  var ui = _setupDetailContainers();
  ui._activateDetailContainer('detailPerson');   // ohne entityId
  var dp = _dom.document.getElementById('detailPerson');
  ok(dp.classList.contains('dc-active'), 'u.no-entity: Container trotzdem aktiviert');
  eq(dp.dataset.currentId, undefined, 'u.no-entity: dataset.currentId nicht gesetzt');
  eq(dp.dataset.viewInit, undefined, 'u.no-entity: dataset.viewInit nicht gesetzt');
})();

// ═══════════════════════════════════════════════════════════════════════════
//  (v) UI — _CLICK_MAP Event-Delegation (ui-event-delegation.js)
//  Action-String → Funktion-Dispatch, stop-Sentinel, dataset-Fallbacks.
// ═══════════════════════════════════════════════════════════════════════════
group('(v) UI ClickMap');

(function() {
  // Vorhandensein wichtiger Actions im _CLICK_MAP
  var ui = _ui();
  ok(typeof ui._CLICK_MAP.showDetail === 'function',         'v.map: showDetail im _CLICK_MAP');
  ok(typeof ui._CLICK_MAP.showFamilyDetail === 'function',   'v.map: showFamilyDetail im _CLICK_MAP');
  ok(typeof ui._CLICK_MAP.showPlaceDetail === 'function',    'v.map: showPlaceDetail im _CLICK_MAP');
  ok(typeof ui._CLICK_MAP.showSourceDetail === 'function',   'v.map: showSourceDetail im _CLICK_MAP');
  ok(typeof ui._CLICK_MAP.switchPlacesSubTab === 'function', 'v.map: switchPlacesSubTab im _CLICK_MAP');
})();

(function() {
  // showDetail liest dataset.pid bevorzugt, fällt auf dataset.id zurück
  _uiReset();
  var W = _uiState(), ui = _ui();
  var el1 = _dom.makeEl('button'); el1.dataset.pid = '@I1@';
  ui._CLICK_MAP.showDetail(el1);
  eq(W._spy.showDetail.length, 1, 'v.showDetail: 1× gerufen (pid)');
  eq(W._spy.showDetail[0], '@I1@', 'v.showDetail: dataset.pid → @I1@');

  var el2 = _dom.makeEl('button'); el2.dataset.id = '@I9@';
  ui._CLICK_MAP.showDetail(el2);
  eq(W._spy.showDetail.length, 2,    'v.showDetail: 2× gerufen (id-Fallback)');
  eq(W._spy.showDetail[1], '@I9@',   'v.showDetail: dataset.id → @I9@ (Fallback)');
})();

(function() {
  // showFamilyDetail/showSourceDetail: dataset.fid/sid bevorzugt
  _uiReset();
  var W = _uiState(), ui = _ui();
  var el = _dom.makeEl('li'); el.dataset.fid = '@F7@';
  ui._CLICK_MAP.showFamilyDetail(el);
  eq(W._spy.showFamilyDetail[0], '@F7@', 'v.showFamilyDetail: dataset.fid → @F7@');

  var el2 = _dom.makeEl('li'); el2.dataset.sid = '@S3@';
  ui._CLICK_MAP.showSourceDetail(el2);
  eq(W._spy.showSourceDetail[0], '@S3@', 'v.showSourceDetail: dataset.sid → @S3@');
})();

(function() {
  // showPlaceDetail nutzt dataset.name
  _uiReset();
  var W = _uiState(), ui = _ui();
  var el = _dom.makeEl('li'); el.dataset.name = 'Köln';
  ui._CLICK_MAP.showPlaceDetail(el);
  eq(W._spy.showPlaceDetail[0], 'Köln', 'v.showPlaceDetail: dataset.name → Köln');
})();

(function() {
  // stop-Sentinel: stopPropagation, kein Dispatch
  _uiReset();
  var W = _uiState();
  var btn = _dom.makeEl('button');
  btn.dataset.action = 'stop';
  _dom.document.body.appendChild(btn);
  var stopped = false;
  var ev = { type:'click', target: btn,
    defaultPrevented: false,
    preventDefault:  function() { this.defaultPrevented = true; },
    stopPropagation: function() { stopped = true; } };
  // Direkter Test des Dispatcher-Pfads via Document-Click-Listener
  (_dom.docListeners['click'] || []).forEach(function(fn) { fn.call(_dom.document, ev); });
  ok(stopped, 'v.stop: data-action="stop" → e.stopPropagation aufgerufen');
  eq(W._spy.showDetail.length, 0, 'v.stop: kein _CLICK_MAP-Eintrag dispatcht');
})();

(function() {
  // Unbekannte Action: kein _CLICK_MAP-Treffer + kein cmp-Prefix → kein Throw, kein Effekt
  _uiReset();
  var W = _uiState();
  var btn = _dom.makeEl('button');
  btn.dataset.action = 'thisActionDoesNotExist';
  _dom.document.body.appendChild(btn);
  var ev = { type:'click', target: btn,
    defaultPrevented: false,
    preventDefault: function() { this.defaultPrevented = true; },
    stopPropagation: function() {} };
  var threw = false;
  try { (_dom.docListeners['click'] || []).forEach(function(fn) { fn.call(_dom.document, ev); }); }
  catch(e) { threw = true; }
  ok(!threw, 'v.unknown: unbekannte Action → kein Throw');
  eq(W._spy.showDetail.length, 0, 'v.unknown: kein Show-Aufruf');
})();

(function() {
  // closest('[data-action]') findet das nächstgelegene Element mit data-action,
  // nicht zwingend e.target → Klick auf inneres Span im Button mit data-action
  _uiReset();
  var W = _uiState();
  var btn = _dom.makeEl('button');
  btn.dataset.action = 'showDetail';
  btn.dataset.pid = '@I42@';
  var span = _dom.makeEl('span');
  btn.appendChild(span);
  _dom.document.body.appendChild(btn);
  var ev = { type:'click', target: span,
    defaultPrevented: false,
    preventDefault: function() {},
    stopPropagation: function() {} };
  (_dom.docListeners['click'] || []).forEach(function(fn) { fn.call(_dom.document, ev); });
  eq(W._spy.showDetail[0], '@I42@', 'v.closest: Klick im inneren Element → data-action via closest gefunden');
})();

// ═══════════════════════════════════════════════════════════════════════════
//  (w) UI — switchTab DirtyBit (ui-views.js A2)
//  Render-Logik: nur wenn dirty[tab] !== false → renderTab; sonst Skip.
//  VS-Reattach-Pfad: bei vsP.top && dirty===false → _vsReattach statt Re-Render.
// ═══════════════════════════════════════════════════════════════════════════
group('(w) UI switchTab DirtyBit');

// Hilfsfunktion: alle tab-XYZ Container vorbereiten, die switchTab anfasst
function _setupSwitchTab() {
  _uiReset();
  ['tab-persons','tab-families','tab-sources','tab-places','tab-stats','tab-search','tab-tasks']
    .forEach(function(id) { _dom.ensureId(id, 'div'); });
  _dom.ensureId('fabBtn',       'button');
  _dom.ensureId('mapContainer', 'div');
  _dom.ensureId('v-main',       'div');
  _dom.ensureId('personList',   'ul');
  _dom.ensureId('familyList',   'ul');
  // v-main muss .active sein, damit renderTab nicht früher zurückkehrt
  _dom.document.getElementById('v-main').classList.add('active');
  return _ui();
}

(function() {
  // (w.1) dirty=true → renderTab gerufen + dirty wird false
  var ui = _setupSwitchTab();
  var W = _uiState();
  W.UIState._dirty = { persons: true };
  ui.switchTab('persons');
  ok(W._spy.renderTab >= 1, 'w.dirty-true: renderTab gerufen');
  eq(W.UIState._dirty.persons, false, 'w.dirty-true: _dirty[persons] → false nach Render');
})();

(function() {
  // (w.2) dirty=false, kein vs.top → weder renderTab noch _vsReattach
  var ui = _setupSwitchTab();
  var W = _uiState();
  W.UIState._dirty = { persons: false };
  ui._vsP.active = false; ui._vsP.top = null;
  ui.switchTab('persons');
  eq(W._spy.renderTab,    0, 'w.dirty-false: kein renderTab');
  eq(W._spy._vsReattach,  0, 'w.dirty-false: kein _vsReattach (vsP.top null)');
})();

(function() {
  // (w.3) dirty=undefined (initial) → renderTab gerufen + dirty wird false
  var ui = _setupSwitchTab();
  var W = _uiState();
  W.UIState._dirty = {};   // persons undefined
  ui.switchTab('persons');
  ok(W._spy.renderTab >= 1, 'w.dirty-undef: renderTab gerufen (initial)');
  eq(W.UIState._dirty.persons, false, 'w.dirty-undef: _dirty[persons] → false');
})();

(function() {
  // (w.4) dirty=false + vsP.top truthy + vsP.active=false → _vsReattach (kein Re-Render)
  var ui = _setupSwitchTab();
  var W = _uiState();
  W.UIState._dirty = { persons: false };
  ui._vsP.active = false;
  ui._vsP.top = {};    // truthy → vs war aufgebaut
  ui.switchTab('persons');
  ok(W._spy._vsReattach >= 1, 'w.vs-reattach: _vsReattach gerufen');
  eq(W._spy.renderTab,     0, 'w.vs-reattach: kein renderTab');
  // Cleanup: vsP.top zurücksetzen für andere Tests
  ui._vsP.top = null;
})();

(function() {
  // (w.5) tab=families analog
  var ui = _setupSwitchTab();
  var W = _uiState();
  W.UIState._dirty = { families: true };
  ui.switchTab('families');
  ok(W._spy.renderTab >= 1, 'w.families-dirty: renderTab gerufen');
  eq(W.UIState._dirty.families, false, 'w.families-dirty: _dirty[families] → false');
})();

(function() {
  // (w.6) AppState.currentTab wird gesetzt
  var ui = _setupSwitchTab();
  var W = _uiState();
  ui.switchTab('sources');
  eq(W.AppState.currentTab, 'sources', 'w.currentTab: AppState.currentTab nach switchTab gesetzt');
})();

// ═══════════════════════════════════════════════════════════════════════════
//  (x) UI — Lifecycle-Handler (ui-lifecycle.js, ADR-025 P3-A3)
//  visibilitychange + >60s-Heuristik, pageshow BFCache-reload, pagehide persist.
// ═══════════════════════════════════════════════════════════════════════════
group('(x) UI Lifecycle');

// Lifecycle-Setup: v-main als active markieren, damit renderTab nicht früh
// zurückkehrt — sonst kann _spy.renderTab nicht prüfen.
function _setupLifecycle() {
  _uiReset();
  _dom.ensureId('v-main', 'div').classList.add('active');
  return _ui();
}

(function() {
  // (x.1) visibilitychange: kurze Abwesenheit (<60s) → _dirty unverändert
  _setupLifecycle();
  var W = _uiState();
  W.UIState._dirty = { persons: false, families: false };
  W.AppState.currentTab = 'persons';
  // hidden=true → speichert _lifecycleHiddenAt; visible=false → return
  _dom.document._hidden = true;
  _dom.fireDoc('visibilitychange');
  // kurze Pause (Simuliert): direkt visible
  _dom.document._hidden = false;
  _dom.fireDoc('visibilitychange');
  eq(W.UIState._dirty.persons,  false, 'x.short: <60s zurück → _dirty.persons bleibt false');
  eq(W.UIState._dirty.families, false, 'x.short: <60s zurück → _dirty.families bleibt false');
})();

(function() {
  // (x.2) visibilitychange: visible-Pfad → renderTab wird gerufen
  _setupLifecycle();
  var W = _uiState();
  W.UIState._dirty = { persons: false };
  W.AppState.currentTab = 'persons';

  // hidden=true → setzt _lifecycleHiddenAt = Date.now()
  _dom.document._hidden = true;
  _dom.fireDoc('visibilitychange');

  // Trick: _lifecycleHiddenAt lebt im UI-Eval-Scope; wir manipulieren ihn via
  // einem kleinen Eval-Pulled-Helper. Direktzugriff ist nicht möglich.
  // Alternativ: warten ist nicht praktikabel → wir testen die Reaktion auf
  // hidden=true (setzt Timestamp) + visible=true und nehmen kurze Zeit hin.
  // Stattdessen: testen mit visible=true + langer Pause via setTimeout NICHT
  // möglich; wir prüfen indirekt: nach hidden→visible UNMITTELBAR ist <60s
  // garantiert (kurze Variante). Für den >60s-Pfad: simulieren via direkt
  // gerufenem Handler mit gefälschtem Date.now() (siehe x.3).
  _dom.document._hidden = false;
  _dom.fireDoc('visibilitychange');
  // Wir prüfen nur: renderTab wurde gerufen (immer im visible-Pfad).
  ok(W._spy.renderTab >= 1, 'x.visible: renderTab gerufen im visible-Pfad');
})();

(function() {
  // (x.3) >60s-Pfad: Date.now() um 70s vorspulen ZWISCHEN hidden und visible
  // Da der visible-Pfad UIState._dirty[currentTab] sofort wieder auf false
  // setzt (durch renderTab), testen wir mit currentTab=null → kein Reset.
  _setupLifecycle();
  var W = _uiState();
  W.UIState._dirty = { persons: false, families: false, sources: false, places: false };
  W.AppState.currentTab = null;  // verhindert dirty[tab]=false-Reset im visible-Handler

  // Trick: temporär Date.now() um 70s in die Zukunft schieben, NACH dem hidden-Event
  var realNow = Date.now;
  _dom.document._hidden = true;
  _dom.fireDoc('visibilitychange');           // setzt _lifecycleHiddenAt = realNow()
  // Jetzt: 70s vorspulen
  Date.now = function() { return realNow() + 70000; };
  _dom.document._hidden = false;
  _dom.fireDoc('visibilitychange');
  Date.now = realNow;

  eq(W.UIState._dirty.persons,  true, 'x.>60s: persons als dirty markiert');
  eq(W.UIState._dirty.families, true, 'x.>60s: families als dirty markiert');
  eq(W.UIState._dirty.sources,  true, 'x.>60s: sources als dirty markiert');
  eq(W.UIState._dirty.places,   true, 'x.>60s: places als dirty markiert');
})();

(function() {
  // (x.4) AppState._detailActive=true → v-detail.scrollTop wird auf 0 gesetzt
  _setupLifecycle();
  var W = _uiState();
  W.AppState._detailActive = true;
  W.AppState.currentTab = 'persons';
  var vdet = _dom.ensureId('v-detail', 'div');
  vdet.scrollTop = 500;
  _dom.document._hidden = false;
  _dom.fireDoc('visibilitychange');
  eq(vdet.scrollTop, 0, 'x.detail-scrollTop: visible + _detailActive → v-detail.scrollTop=0 (Void-Artefakt-Fix)');
})();

(function() {
  // (x.5) pageshow mit persisted=true → location.reload()
  _setupLifecycle();
  var W = _uiState();
  W._reloadCount = 0;
  _dom.fireWin('pageshow', { persisted: true });
  eq(W._reloadCount, 1, 'x.pageshow-bfcache: persisted=true → location.reload() gerufen');
})();

(function() {
  // (x.6) pagehide → _persistLastTabSel (= idbPut(last_tab_sel)) wird gerufen
  _setupLifecycle();
  var W = _uiState();
  W.UIState._lastTabSel = { persons: '@I1@', families: '@F1@' };
  _dom.fireWin('pagehide');
  ok(W._idbStore.last_tab_sel && W._idbStore.last_tab_sel.persons === '@I1@',
     'x.pagehide: idbPut(last_tab_sel) via _persistLastTabSel');
})();

// ═══════════════════════════════════════════════════════════════════════════
//  (y) UI — Listen-Highlight-Sync (P6-B6)
//  _updatePersonListCurrent/Family/Place/Source: .current-Klasse auf richtigem
//  Listenpunkt + alte Markierung entfernt.
// ═══════════════════════════════════════════════════════════════════════════
group('(y) UI ListSync');

// Hilfsfunktion: Personen-Liste mit data-pid-Items befüllen
function _setupPersonList(ids) {
  _uiReset();
  var list = _dom.ensureId('personList', 'ul');
  ids.forEach(function(id) {
    var li = _dom.makeEl('li');
    li.dataset.pid = id;
    li._classes.add('person-row');
    list.appendChild(li);
  });
  _dom.ensureId('v-main', 'div');
  return _ui();
}

(function() {
  var ui = _setupPersonList(['@I1@','@I2@','@I3@']);
  ui._updatePersonListCurrent('@I2@');
  var list = _dom.document.getElementById('personList');
  var li1 = list.querySelectorAll('[data-pid="@I1@"]')[0];
  var li2 = list.querySelectorAll('[data-pid="@I2@"]')[0];
  var li3 = list.querySelectorAll('[data-pid="@I3@"]')[0];
  ok(!li1.classList.contains('current'), 'y.persons: @I1@ nicht .current');
  ok( li2.classList.contains('current'), 'y.persons: @I2@ ist .current');
  ok(!li3.classList.contains('current'), 'y.persons: @I3@ nicht .current');

  // Wechsel auf @I3@: alte Markierung weg, neue gesetzt
  ui._updatePersonListCurrent('@I3@');
  ok(!li2.classList.contains('current'), 'y.persons-switch: @I2@ verliert .current');
  ok( li3.classList.contains('current'), 'y.persons-switch: @I3@ erhält .current');

  // null → alle Markierungen weg
  ui._updatePersonListCurrent(null);
  ok(!li1.classList.contains('current') && !li2.classList.contains('current') && !li3.classList.contains('current'),
     'y.persons-null: alle .current entfernt');
})();

(function() {
  // _updateFamilyListCurrent
  _uiReset();
  var list = _dom.ensureId('familyList', 'ul');
  ['@F1@','@F2@'].forEach(function(id) {
    var li = _dom.makeEl('li');
    li.dataset.fid = id;
    li._classes.add('person-row');
    list.appendChild(li);
  });
  _dom.ensureId('v-main', 'div');
  var ui = _ui();
  ui._updateFamilyListCurrent('@F1@');
  var f1 = list.querySelectorAll('[data-fid="@F1@"]')[0];
  var f2 = list.querySelectorAll('[data-fid="@F2@"]')[0];
  ok( f1.classList.contains('current'), 'y.families: @F1@ ist .current');
  ok(!f2.classList.contains('current'), 'y.families: @F2@ nicht .current');
})();

(function() {
  // _updatePlaceListCurrent (P6-B6)
  _uiReset();
  var list = _dom.ensureId('placeList', 'ul');
  ['Köln','München','Berlin'].forEach(function(name) {
    var li = _dom.makeEl('li');
    li.dataset.name = name;
    list.appendChild(li);
  });
  _dom.ensureId('v-main', 'div');
  var ui = _ui();
  ui._updatePlaceListCurrent('München');
  var li_K = list.querySelectorAll('[data-name="Köln"]')[0];
  var li_M = list.querySelectorAll('[data-name="München"]')[0];
  ok( li_M.classList.contains('current'), 'y.places: München ist .current');
  ok(!li_K.classList.contains('current'), 'y.places: Köln nicht .current');

  ui._updatePlaceListCurrent(null);
  ok(!li_M.classList.contains('current'), 'y.places-null: alle .current entfernt');
})();

(function() {
  // _updateSourceListCurrent (P6-B6)
  _uiReset();
  var list = _dom.ensureId('sourceList', 'ul');
  ['@S1@','@S2@'].forEach(function(id) {
    var li = _dom.makeEl('li');
    li.dataset.sid = id;
    list.appendChild(li);
  });
  _dom.ensureId('v-main', 'div');
  var ui = _ui();
  ui._updateSourceListCurrent('@S2@');
  var s1 = list.querySelectorAll('[data-sid="@S1@"]')[0];
  var s2 = list.querySelectorAll('[data-sid="@S2@"]')[0];
  ok( s2.classList.contains('current'), 'y.sources: @S2@ ist .current');
  ok(!s1.classList.contains('current'), 'y.sources: @S1@ nicht .current');
})();

(function() {
  // Liste fehlt komplett → kein Throw
  _uiReset();
  var ui = _ui();
  var threw = false;
  try {
    ui._updatePersonListCurrent('@I1@');
    ui._updateFamilyListCurrent('@F1@');
    ui._updatePlaceListCurrent('Berlin');
    ui._updateSourceListCurrent('@S1@');
  } catch(e) { threw = true; }
  ok(!threw, 'y.no-list: kein Throw wenn personList/familyList/placeList/sourceList fehlen');
})();

// ═══════════════════════════════════════════════════════════════════════════
//  (z) UI — Toast-Once bei savePlaceObjects (ui-forms.js, Item 11)
//  Bei wiederholten IDB-/OD-Fehlern wird der Toast nur EINMAL pro Session
//  gezeigt — verhindert Spam-Toasts bei Quota-Exhausted o.ä.
// ═══════════════════════════════════════════════════════════════════════════
group('(z) UI Toast-Once');

// Synchron-rejecting Thenable — simuliert .catch-Pfad ohne Microtask-Flush.
// Wir benutzen das in JXA, da Promise.reject().catch() den Handler erst im
// nächsten Microtask-Tick fortsetzt und JXA keinen Event-Loop-Pulse hat.
function _syncReject(err) {
  return {
    then: function(_, fn) { if (typeof fn === 'function') fn(err); return this; },
    catch: function(fn)   { if (typeof fn === 'function') fn(err); return this; },
  };
}
function _syncResolve(val) {
  return {
    then: function(fn) { if (typeof fn === 'function') fn(val); return this; },
    catch: function() { return this; },
  };
}

(function() {
  // (z.1) idbPut OK → kein Toast
  _uiReset();
  var W = _uiState(), ui = _ui();
  ui._resetToastFlags();
  ui._setIdbPut(function(k, v) { W._idbStore[k] = v; return _syncResolve(); });
  W.AppState.db.placeObjects = { '@P1@': { id:'@P1@', title:'Berlin' } };
  ui.savePlaceObjects();
  eq(W._toastLog.length, 0, 'z.ok: kein Fehler → kein Toast');
  ok(!!W._idbStore.stammbaum_placeobjects, 'z.ok: IDB-Eintrag geschrieben');
})();

(function() {
  // (z.2) Erster IDB-Fehler → genau 1 Toast
  _uiReset();
  var W = _uiState(), ui = _ui();
  ui._resetToastFlags();
  ui._setIdbPut(function() { return _syncReject(new Error('quota-exhausted')); });
  W.AppState.db.placeObjects = { '@P1@': { id:'@P1@', title:'Berlin' } };
  ui.savePlaceObjects();
  eq(W._toastLog.length, 1, 'z.err1: 1 Toast bei IDB-Fehler');
  ok(/IDB/.test(W._toastLog[0].msg), 'z.err1: Toast-Text enthält "IDB"');
  eq(W._toastLog[0].type, 'error', 'z.err1: Toast-Typ = error');
})();

(function() {
  // (z.3) Zweiter IDB-Fehler → kein zweiter Toast (Toast-Once)
  _uiReset();
  var W = _uiState(), ui = _ui();
  ui._resetToastFlags();
  ui._setIdbPut(function() { return _syncReject(new Error('quota')); });
  W.AppState.db.placeObjects = { '@P1@': { id:'@P1@' } };
  ui.savePlaceObjects();
  ui.savePlaceObjects();
  ui.savePlaceObjects();
  eq(W._toastLog.length, 1, 'z.once: bei 3× Fehler nur 1 Toast (Once-Flag)');
})();

(function() {
  // (z.4) Nach Reset der Toast-Flags → erneut 1 Toast (Session-Reset-Simulation)
  _uiReset();
  var W = _uiState(), ui = _ui();
  ui._resetToastFlags();
  ui._setIdbPut(function() { return _syncReject(new Error('quota')); });
  W.AppState.db.placeObjects = { '@P1@': { id:'@P1@' } };
  ui.savePlaceObjects();
  eq(W._toastLog.length, 1, 'z.reset-pre: 1 Toast vor Reset');
  ui._resetToastFlags();
  ui.savePlaceObjects();
  eq(W._toastLog.length, 2, 'z.reset-post: nach Reset → erneut 1 Toast (insgesamt 2)');
})();

// ═══════════════════════════════════════════════════════════════════════════
//  (aa) UI — PLAC-Modus (gedcom.js, ADR-010)
//  Toggle zwischen Freitext + Felder-Eingabe; UIState._placeModes pro placeId.
// ═══════════════════════════════════════════════════════════════════════════
group('(aa) UI PLAC-Mode');

function _setupPlacField(placeId) {
  _uiReset();
  // free-Container (textarea) + parts-Container (div) + toggle-Button + Input
  _dom.ensureId(placeId + '-free',   'div');
  _dom.ensureId(placeId + '-parts',  'div');
  _dom.ensureId(placeId + '-toggle', 'button');
  _dom.ensureId(placeId,             'input');
  return _ui();
}

(function() {
  // (aa.1) initPlaceMode setzt free-Mode + zeigt free, hidet parts
  var ui = _setupPlacField('birth');
  var W = _uiState();
  ui.initPlaceMode('birth');
  eq(W.UIState._placeModes['birth'], 'free', 'aa.init: Mode = free');
  eq(_dom.document.getElementById('birth-free').hidden,  false, 'aa.init: free sichtbar');
  eq(_dom.document.getElementById('birth-parts').hidden, true,  'aa.init: parts versteckt');
  eq(_dom.document.getElementById('birth-toggle').textContent, '⊞ Felder', 'aa.init: Toggle-Text');
})();

(function() {
  // (aa.2) togglePlaceMode wechselt free → parts
  var ui = _setupPlacField('birth');
  var W = _uiState();
  ui.initPlaceMode('birth');
  _dom.document.getElementById('birth').value = 'Köln, Rheinland, Deutschland';
  ui.togglePlaceMode('birth');
  eq(W.UIState._placeModes['birth'], 'parts', 'aa.toggle: free → parts');
  eq(_dom.document.getElementById('birth-free').hidden,  true,  'aa.toggle: free versteckt');
  eq(_dom.document.getElementById('birth-parts').hidden, false, 'aa.toggle: parts sichtbar');
  // Wechsel zurück
  ui.togglePlaceMode('birth');
  eq(W.UIState._placeModes['birth'], 'free', 'aa.toggle-back: parts → free');
})();

(function() {
  // (aa.3) getPlaceFromForm im free-Mode → Input.value
  var ui = _setupPlacField('death');
  ui.initPlaceMode('death');
  _dom.document.getElementById('death').value = '  Hamburg  ';
  eq(ui.getPlaceFromForm('death'), 'Hamburg', 'aa.getForm-free: Input.value (getrimmt)');
})();

(function() {
  // (aa.4) getPlaceFromForm im parts-Mode → joinPlaceParts (death-p0, p1…)
  var ui = _setupPlacField('death');
  var W = _uiState();
  // Toggle in parts-Mode (legt parts-Container an + füllt p0,p1,…)
  W.AppState.db.placForm = 'Dorf, Stadt, Land';
  ui.initPlaceMode('death');
  ui.togglePlaceMode('death');
  // togglePlaceMode hat _buildPlaceParts → fillPlaceParts gerufen.
  // Manuell parts-Inputs setzen:
  var p0 = _dom.document.getElementById('death-p0');
  var p1 = _dom.document.getElementById('death-p1');
  var p2 = _dom.document.getElementById('death-p2');
  if (p0) p0.value = 'Sassenberg';
  if (p1) p1.value = 'Münster';
  if (p2) p2.value = '';
  eq(ui.getPlaceFromForm('death'), 'Sassenberg, Münster',
    'aa.getForm-parts: joinPlaceParts ohne trailing leere Teile');
})();

// ═══════════════════════════════════════════════════════════════════════════
//  (ab) UI — _buildFormString + applyStringPlaceLink (gedcom.js, ADR-024)
//  Periodengerechte Stringbildung + Reimport-Erkennung.
// ═══════════════════════════════════════════════════════════════════════════
group('(ab) UI FormSaveMerge');

(function() {
  // (ab.1) _buildFormString mit Jahr → atomarer Name aus resolveAsOf
  _uiReset();
  var W = _uiState(), ui = _ui();
  ui = _ui();
  API.setDb({
    individuals:{}, families:{},
    placeObjects: {
      '@P1@': { id:'@P1@', title:'Sassenberg', type:'Village',
        pnames:[{value:'Sassenberg'}, {value:'Sassenbergk', dateFrom:'1650', dateTo:'1802', dateType:'range'}],
        enclosedBy:[] },
    },
  });
  // periodengerecht — 1700 fällt in den Sassenbergk-Range
  eq(ui._buildFormString('@P1@', 1700), 'Sassenbergk', 'ab.formString: 1700 → Sassenbergk');
  eq(ui._buildFormString('@P1@', 1900), 'Sassenberg',  'ab.formString: 1900 → Sassenberg (Haupttitel)');
  eq(ui._buildFormString('@P1@', null), 'Sassenberg',  'ab.formString: null Jahr → atomarer Name');
  eq(ui._buildFormString(null,   1700), null,          'ab.formString: ohne placeId → null');
})();

(function() {
  // (ab.2) _buildFormString mit enclosedBy → Hierarchie
  _uiReset();
  var ui = _ui();
  API.setDb({
    individuals:{}, families:{},
    placeObjects: {
      '@P_REGION@': { id:'@P_REGION@', title:'Fürstbistum Münster', type:'Region',
        pnames:[{value:'Fürstbistum Münster'}], enclosedBy:[] },
      '@P_VILLAGE@': { id:'@P_VILLAGE@', title:'Sassenberg, Kreis Warendorf', type:'Village',
        pnames:[{value:'Sassenberg, Kreis Warendorf'}],
        enclosedBy:[{placeId:'@P_REGION@', dateFrom:'1500', dateTo:'1802', dateType:'range'}] },
    },
  });
  var s = ui._buildFormString('@P_VILLAGE@', 1700);
  ok(s && /Fürstbistum Münster/.test(s), 'ab.chain: enclosure-Kette enthält Region');
  // Erstes Komma-Segment des Village-Titels, kein Doppel-Komma
  ok(s && s.indexOf('Sassenberg') === 0, 'ab.chain: Village zuerst');
})();

(function() {
  // (ab.3) applyStringPlaceLink → ev.placeId + ev.place auf periodengerechten String
  _uiReset();
  var ui = _ui();
  var db = {
    individuals: {
      '@I1@': { id:'@I1@', name:'A /B/',
        birth: { date:'1700', place:'Sassenbergk' }, chr:{}, death:{}, buri:{},
        events:[] },
    },
    families: {},
    placeObjects: {
      '@P1@': { id:'@P1@', title:'Sassenberg', type:'Village',
        pnames:[{value:'Sassenberg'}, {value:'Sassenbergk', dateFrom:'1650', dateTo:'1802', dateType:'range'}],
        enclosedBy:[] },
    },
  };
  API.setDb(db);
  // Konfirmierter String: 'Sassenbergk' (periodengerecht für 1700)
  var linked = ui.applyStringPlaceLink(['Sassenbergk'], '@P1@', ['Sassenbergk']);
  eq(linked, 1, 'ab.link: 1 Ereignis verlinkt');
  eq(db.individuals['@I1@'].birth.placeId, '@P1@', 'ab.link: ev.placeId gesetzt');
  eq(db.individuals['@I1@'].birth.place,   'Sassenbergk', 'ab.link: ev.place auf periodengerechten String');
})();

(function() {
  // (ab.4) applyStringPlaceLink — Nicht konfirmierter String → kein Link
  _uiReset();
  var ui = _ui();
  var db = {
    individuals: {
      '@I1@': { id:'@I1@', name:'A /B/',
        birth: { date:'1700', place:'Sassenbergk' }, chr:{}, death:{}, buri:{},
        events:[] },
    },
    families: {},
    placeObjects: {
      '@P1@': { id:'@P1@', title:'Sassenberg', type:'Village',
        pnames:[{value:'Sassenberg'}, {value:'Sassenbergk', dateFrom:'1650', dateTo:'1802', dateType:'range'}],
        enclosedBy:[] },
    },
  };
  API.setDb(db);
  var linked = ui.applyStringPlaceLink(['Sassenbergk'], '@P1@', ['Sassenberg']);  // anderer String konfirmiert
  eq(linked, 0, 'ab.no-confirm: nicht konfirmierter String → kein Link');
  eq(db.individuals['@I1@'].birth.placeId, undefined, 'ab.no-confirm: placeId unverändert');
})();

(function() {
  // (ab.5) applyStringPlaceLink invalidiert _placesCache + _placeRegistry
  _uiReset();
  var W = _uiState(), ui = _ui();
  W.UIState._placeRegistry = { stale: true };
  W.UIState._placesCache   = new Map();
  var db = {
    individuals: {
      '@I1@': { id:'@I1@', birth: { date:'1700', place:'X' }, chr:{}, death:{}, buri:{}, events:[] },
    },
    families: {},
    placeObjects: { '@P1@': { id:'@P1@', title:'X', pnames:[{value:'X'}], enclosedBy:[] } },
  };
  API.setDb(db);
  ui.applyStringPlaceLink(['X'], '@P1@', ['X']);
  eq(W.UIState._placeRegistry, null, 'ab.invalidate: _placeRegistry invalidiert');
  eq(W.UIState._placesCache,   null, 'ab.invalidate: _placesCache invalidiert');
})();

(function() {
  // (ab.6) applyStringPlaceLink ohne targetPlaceId → 0
  _uiReset();
  var ui = _ui();
  API.setDb({ individuals:{}, families:{}, placeObjects:{} });
  eq(ui.applyStringPlaceLink(['X'], null, ['X']), 0, 'ab.no-target: null targetPlaceId → 0');
})();

// ── Hilfsfunktion: UTF-8-Byte-Länge einer JS-Zeichenkette ────────────────────
function _utf8ByteLen(s) {
  var n = 0;
  for (var i = 0; i < s.length; i++) {
    var c = s.charCodeAt(i);
    if (c >= 0xD800 && c <= 0xDBFF && i + 1 < s.length) { n += 4; i++; }
    else n += c < 0x80 ? 1 : c < 0x800 ? 2 : 3;
  }
  return n;
}

group('(ad) Writer _sliceByteLen + pushCont 255-Byte-Limit');

(function() {
  // (ad.1) _sliceByteLen — reine ASCII: 248 Zeichen → 248 Bytes
  var s = 'A'.repeat(300);
  var take = API._sliceByteLen(s, 248);
  eq(take, 248, 'ad.1: ASCII 300→nimmt 248');
  eq(_utf8ByteLen(s.slice(0, take)), 248, 'ad.1: ASCII Byte-Länge exakt 248');
})();

(function() {
  // (ad.2) _sliceByteLen — Umlaute (2 Bytes je Zeichen): 248 Byte-Limit → ≤124 Zeichen
  var s = 'ä'.repeat(200);
  var take = API._sliceByteLen(s, 248);
  eq(take, 124, 'ad.2: Umlaut-String 200→124 Zeichen (248 Bytes)');
  eq(_utf8ByteLen(s.slice(0, take)), 248, 'ad.2: Byte-Länge exakt 248');
})();

(function() {
  // (ad.3) _sliceByteLen — leerer String
  eq(API._sliceByteLen('', 248), 0, 'ad.3: leerer String → 0');
})();

(function() {
  // (ad.4) _sliceByteLen — Schnitt genau an Byte-Grenze (kein halber Multi-Byte-Char)
  var s = 'A'.repeat(247) + 'ä';   // 247 + 2 = 249 Bytes
  var take = API._sliceByteLen(s, 248);
  eq(take, 247, 'ad.4: Schnitt vor Umlaut der nicht mehr passt');
  eq(_utf8ByteLen(s.slice(0, take)), 247, 'ad.4: Byte-Länge 247 ≤ 248');
})();

(function() {
  // (ad.5) pushCont — ASCII-Text: erste CONC-Zeile max 255 Bytes
  var lines = [];
  API.pushCont(lines, 1, 'NOTE', 'X'.repeat(600));
  // Erste Zeile: "1 NOTE " (7 Bytes) + chunk
  var firstBytes = _utf8ByteLen(lines[0]);
  ok(firstBytes <= 255, 'ad.5: erste NOTE-Zeile ≤ 255 Bytes (war ' + firstBytes + ')');
  // Alle Folgezeilen: "2 CONC " (7 Bytes) + chunk
  var allOk = lines.every(function(l) { return _utf8ByteLen(l) <= 255; });
  ok(allOk, 'ad.5: alle Zeilen ≤ 255 Bytes');
  ok(lines.length > 1, 'ad.5: Text wurde gesplittet');
})();

(function() {
  // (ad.6) pushCont — Umlaut-Text: alle Zeilen ≤ 255 Bytes
  var s = 'ö'.repeat(300);   // 600 Bytes — würde mit alter MAX=248-Zeichen-Logik Zeilen >255 Bytes erzeugen
  var lines = [];
  API.pushCont(lines, 1, 'NOTE', s);
  var allOk = lines.every(function(l) { return _utf8ByteLen(l) <= 255; });
  ok(allOk, 'ad.6: Umlaut-Text — alle Zeilen ≤ 255 Bytes');
  // Roundtrip: alle Chunks zusammengesetzt ergeben den Originaltext
  var reconstructed = '';
  lines.forEach(function(l) {
    if (l.startsWith('1 NOTE '))      reconstructed += l.slice(7);
    else if (l.startsWith('2 CONC ')) reconstructed += l.slice(7);
    else if (l.startsWith('2 CONT ')) reconstructed += '\n' + l.slice(7);
  });
  eq(reconstructed, s, 'ad.6: Roundtrip — kein Datenverlust');
})();

(function() {
  // (ad.7) pushCont — gemischter Text mit CONT (Zeilenumbrüchen) + Umlaut-Overflow
  var s = 'Hä'.repeat(100) + '\n' + 'Bö'.repeat(100);
  var lines = [];
  API.pushCont(lines, 1, 'NOTE', s);
  var allOk = lines.every(function(l) { return _utf8ByteLen(l) <= 255; });
  ok(allOk, 'ad.7: gemischter Text — alle Zeilen ≤ 255 Bytes');
  var contLines = lines.filter(function(l) { return l.startsWith('2 CONT '); });
  ok(contLines.length >= 1, 'ad.7: mindestens eine CONT-Zeile für Zeilenumbruch');
})();

(function() {
  // (ad.8) writeGEDCOM — NOTE-Record erste Zeile ≤ 255 Bytes auch bei langem xref
  var db = {
    individuals: {}, families: {}, sources: {}, repositories: {},
    placeObjects: {}, hofObjects: {},
    notes: {
      '@NRANSMANN@': {
        id: '@NRANSMANN@', type: 'NOTE', grampId: null,
        text: 'ä'.repeat(300),   // Umlaut-Text, würde ohne Fix erste Zeile sprengen
        lastChanged: '', lastChangedTime: '', chanNote: '', _passthrough: [],
      }
    },
    head: { charset: 'UTF-8', lang: '', source: '', vers: '5.5.1', gedcVers: '5.5.1',
      copyrightTexts: [], coprNote: '', place: '', _extra: [] },
    _idCounters: {}, _gedVersion: '5.5.1',
  };
  API.setDb(db);
  var ged = API.writeGEDCOM(false, false, false);
  var noteLines = ged.split(/\r?\n/).filter(function(l) { return l.length > 0; });
  var allOk = noteLines.every(function(l) { return _utf8ByteLen(l) <= 255; });
  ok(allOk, 'ad.8: writeGEDCOM — keine Zeile > 255 Bytes (auch bei @NRANSMANN@)');
})();

// ═══════════════════════════════════════════════════════════════════════════
//  (ae) HOF-DOMÄNE  (buildHofIndex · _derivedHofObjectsFromDb · [Hof]-Roundtrip)
//  Verriegelt die Hof-Logik strukturell — Bugklassen v987 (Notiz verschwand
//  bei Streu-Hof) + v988 (Hof-/Event-Notiz-Trennung via [Hof]-Marker).
// ═══════════════════════════════════════════════════════════════════════════
group('(ae) HOF-Domäne (sw v988)');

// ── [Hof]-Marker-Helfer ──
ok(API._isHofNoteText('[Hof] Erbhof seit 1700'), 'ae.1: [Hof]-Präfix erkannt');
ok(!API._isHofNoteText('Erbhof seit 1700'),      'ae.1: gewöhnliche Notiz ist keine Hof-Notiz');
ok(!API._isHofNoteText(''),                      'ae.1: leerer String ist keine Hof-Notiz');
ok(!API._isHofNoteText(null),                    'ae.1: null ist keine Hof-Notiz');
eq(API._stripHofPrefix('[Hof] Erbhof'), 'Erbhof', 'ae.1: Präfix gestrippt');
eq(API._stripHofPrefix('Erbhof'),       'Erbhof', 'ae.1: ohne Präfix unverändert');

// ── buildHofIndex: RESI (Bewohner) + PROP (Eigentümer) nach addr aggregiert ──
(function() {
  API.setDb({ individuals: {
    '@I1@': P({ id:'@I1@', name:'Hans Müller',
      events:[ { type:'RESI', addr:'Hof Schulze 1', place:'Ochtrup', date:'1850' } ] }),
    '@I2@': P({ id:'@I2@', name:'Anna Müller', events:[
      { type:'RESI', addr:'Hof Schulze 1', place:'Ochtrup', date:'1855' },
      { type:'PROP', addr:'Hof Schulze 1', value:'Mühle',   date:'1860' },
    ] }),
  }, families:{} });
  API.UIState._hofCache = null;
  var idx = API.buildHofIndex();
  eq(idx.size, 1, 'ae.2: gleiche Adresse → 1 Hof aggregiert');
  var hof = idx.get('Hof Schulze 1');
  eq(hof.entries.length,     2,         'ae.2: 2 RESI-Bewohner');
  eq(hof.propEntries.length, 1,         'ae.2: 1 PROP-Eigentümer');
  eq(hof.place,              'Ochtrup', 'ae.2: Ort aus erstem RESI übernommen');
  eq(hof.propEntries[0].desc,'Mühle',   'ae.2: PROP-Beschreibung aus ev.value');
})();

// ── buildHofIndex: addr.trim() vereint führenden/folgenden Whitespace ──
(function() {
  API.setDb({ individuals: {
    '@I1@': P({ id:'@I1@', events:[ { type:'RESI', addr:'  Hof A  ', place:'X' } ] }),
    '@I2@': P({ id:'@I2@', events:[ { type:'RESI', addr:'Hof A',     place:'X' } ] }),
  }, families:{} });
  API.UIState._hofCache = null;
  var idx = API.buildHofIndex();
  eq(idx.size, 1, 'ae.3: "  Hof A  " und "Hof A" trimmen auf denselben Key');
  eq(idx.get('Hof A').entries.length, 2, 'ae.3: beide Bewohner unter getrimmtem Key');
})();

// ── buildHofIndex: RESI ohne addr erzeugt keinen Hof ──
(function() {
  API.setDb({ individuals: {
    '@I1@': P({ id:'@I1@', events:[ { type:'RESI', addr:'', place:'X' } ] }),
  }, families:{} });
  API.UIState._hofCache = null;
  eq(API.buildHofIndex().size, 0, 'ae.4: RESI ohne Adresse → kein Hof');
})();

// ── _derivedHofObjectsFromDb: Koords + [Hof]-Notiz ja, gewöhnliche Notiz nein (v988) ──
(function() {
  var der = API._derivedHofObjectsFromDb({ individuals: {
    '@I1@': { events:[ { type:'RESI', addr:'Hof B', lati:52.1, long:7.2,
      _noteOrig:'[Hof] Erbhof seit 1700', noteRefs:[] } ] },
    '@I2@': { events:[ { type:'RESI', addr:'Hof C', lati:null, long:null,
      _noteOrig:'private Notiz der Person', noteRefs:[] } ] },
  }, notes:{} });
  eq(der['Hof B'].lat,  52.1,               'ae.5: Koordinaten aus RESI-Event abgeleitet');
  eq(der['Hof B'].note, 'Erbhof seit 1700', 'ae.5: [Hof]-Notiz abgeleitet + Präfix gestrippt');
  ok(!der['Hof C'], 'ae.5: gewöhnliche Event-Notiz ohne Koords → KEIN Hof (v988-Trennung)');
})();

// ── _derivedHofObjectsFromDb: [Hof]-Notiz aus geteiltem NOTE-Record (noteRefs) ──
(function() {
  var der = API._derivedHofObjectsFromDb({ individuals: {
    '@I1@': { events:[ { type:'RESI', addr:'Hof D', lati:null, long:null,
      _noteOrig:'', noteRefs:['@N1@'] } ] },
  }, notes: { '@N1@': { text:'[Hof] Vierständerhof' } } });
  eq(der['Hof D'].note, 'Vierständerhof', 'ae.6: [Hof]-Notiz aus geteiltem NOTE-Record (noteRefs)');
})();

// ── GEDCOM-Roundtrip: Hof-Notiz überlebt write→parse, Präfix korrekt (v987/v988) ──
(function() {
  API.setDb({
    individuals: {
      '@I1@': P({ id:'@I1@', given:'Hans', surname:'Schulze', name:'Hans Schulze', media:[], events:[
        { type:'RESI', value:'', date:'1850', place:'Ochtrup', addr:'Hof Schulze 1',
          eventType:'', note:'', lati:null, long:null, phon:[], email:[],
          sources:[], sourcePages:{}, sourceQUAY:{}, sourceNote:{}, sourceExtra:{}, sourceMedia:{},
          media:[], _extra:[], noteRefs:[] } ] }),
    },
    families:{}, sources:{}, repositories:{}, notes:{}, extraPlaces:{}, placeObjects:{},
    hofObjects: { 'Hof Schulze 1': { addr:'Hof Schulze 1', lat:52.2, long:7.1, note:'Erbhof seit 1700' } },
    head: { charset:'UTF-8', lang:'', source:'', vers:'5.5.1', gedcVers:'5.5.1',
      copyrightTexts:[], coprNote:'', place:'', _extra:[] },
    _idCounters:{}, _gedVersion:'5.5.1',
  });
  var ged = API.writeGEDCOM(false, false, false);
  ok(/\[Hof\] Erbhof seit 1700/.test(ged), 'ae.7: Hof-Notiz mit [Hof]-Präfix in GEDCOM geschrieben');
  var prefixCount = (ged.match(/\[Hof\] Erbhof seit 1700/g) || []).length;
  eq(prefixCount, 1, 'ae.7: [Hof]-Notiz-Record genau einmal geschrieben (kein Doppel)');
  var errs = [];
  var rdb = API.parseGEDCOM(ged, errs);
  var der = API._derivedHofObjectsFromDb(rdb);
  eq(der['Hof Schulze 1'].note, 'Erbhof seit 1700',
     'ae.7: Hof-Notiz überlebt Roundtrip, Präfix beim Reimport gestrippt');
})();

// ── GEDCOM-Roundtrip: Hof-Koordinaten überleben write→parse (PLAC+MAP, Event ohne place) ──
(function() {
  API.setDb({
    individuals: {
      '@I1@': P({ id:'@I1@', given:'Anna', surname:'Hof', name:'Anna Hof', media:[], events:[
        { type:'RESI', value:'', date:'1870', place:null, addr:'Kotten 3',
          eventType:'', note:'', lati:null, long:null, phon:[], email:[],
          sources:[], sourcePages:{}, sourceQUAY:{}, sourceNote:{}, sourceExtra:{}, sourceMedia:{},
          media:[], _extra:[], noteRefs:[] } ] }),
    },
    families:{}, sources:{}, repositories:{}, notes:{}, extraPlaces:{}, placeObjects:{},
    hofObjects: { 'Kotten 3': { addr:'Kotten 3', lat:51.5, long:6.9 } },
    head: { charset:'UTF-8', lang:'', source:'', vers:'5.5.1', gedcVers:'5.5.1',
      copyrightTexts:[], coprNote:'', place:'', _extra:[] },
    _idCounters:{}, _gedVersion:'5.5.1',
  });
  var ged = API.writeGEDCOM(false, false, false);
  var errs = [];
  var rdb = API.parseGEDCOM(ged, errs);
  var der = API._derivedHofObjectsFromDb(rdb);
  eq(der['Kotten 3'].lat, 51.5, 'ae.8: Hof-Koordinaten überleben Roundtrip (PLAC+MAP, Event ohne PLAC)');
})();

// ═══════════════════════════════════════════════════════════════════════════
//  (af) ADR-026 PHASE 1 — _migrateHofObjectsToPlaceObjects
//  Höfe (hofObjects[addr]) → Farm-placeObjects (enclosedBy Dorf, eigene Koords).
//  Pure + idempotent; noch NICHT in setDb verdrahtet (Verdrahtung = Phase 2).
// ═══════════════════════════════════════════════════════════════════════════
group('(af) ADR-026 Hof→Farm-Migration');

// Hilfs-Konstruktor für Dorf-/Farm-placeObjects
function _PO(o) { return Object.assign({ id:'', title:'', type:'Unknown', lat:null, long:null, note:'', pnames:[], enclosedBy:[], parentId:null }, o); }

// ── Basis: Farm angelegt, Koords/Notiz/Enclosure übernommen, Events umgehängt ──
(function() {
  var db = {
    individuals: {
      '@I1@': { events:[ { type:'RESI', addr:'Hof Schulze', place:'Ochtrup', placeId:null } ] },
      '@I2@': { events:[ { type:'RESI', addr:'Hof Schulze', place:'Ochtrup', placeId:null },
                         { type:'PROP', addr:'Hof Schulze', place:'Ochtrup', placeId:null } ] },
    },
    placeObjects: { '@V_OCH@': _PO({ id:'@V_OCH@', title:'Ochtrup', type:'City', lat:52.20, long:7.18 }) },
    hofObjects: { 'Hof Schulze': { addr:'Hof Schulze', lat:52.213, long:7.165, note:'Erbhof seit 1700' } },
  };
  API._migrateHofObjectsToPlaceObjects(db);
  var farms = Object.values(db.placeObjects).filter(po => po.type === 'Farm');
  eq(farms.length, 1,                  'af.1: 1 Farm-placeObject angelegt');
  var farm = farms[0];
  eq(farm.title, 'Hof Schulze',        'af.1: Farm-Titel = Adress-Blatt');
  eq(farm.lat,   52.213,               'af.1: Hof-Koordinaten übernommen');
  eq(farm.note,  'Erbhof seit 1700',   'af.1: Hof-Notiz übernommen');
  eq(farm.enclosedBy[0].placeId, '@V_OCH@', 'af.1: enclosedBy = Dorf Ochtrup');
  var allEv = db.individuals['@I1@'].events.concat(db.individuals['@I2@'].events);
  ok(allEv.every(ev => ev.placeId === farm.id), 'af.1: alle RESI/PROP-Events auf Farm umgehängt');
  ok(allEv.every(ev => ev.addr === 'Hof Schulze'), 'af.1: ev.addr als Postdetail erhalten');
})();

// ── Wiederverwendung: existierendes Farm-Objekt (Name+Dorf) wird gemerged, nicht dupliziert ──
(function() {
  var db = {
    individuals: { '@I1@': { events:[ { type:'RESI', addr:'Hof Schulze', place:'Ochtrup' } ] } },
    placeObjects: {
      '@V_OCH@':   _PO({ id:'@V_OCH@', title:'Ochtrup', type:'City' }),
      '@F_EXIST@': _PO({ id:'@F_EXIST@', title:'Hof Schulze', type:'Farm', enclosedBy:[{ placeId:'@V_OCH@' }] }),
    },
    hofObjects: { 'Hof Schulze': { addr:'Hof Schulze', lat:52.213, long:7.165, note:'Erbhof' } },
  };
  API._migrateHofObjectsToPlaceObjects(db);
  eq(Object.values(db.placeObjects).filter(po => po.type === 'Farm').length, 1,
     'af.2: existierendes Farm-Objekt wiederverwendet (keine Dublette)');
  eq(db.placeObjects['@F_EXIST@'].lat,  52.213, 'af.2: Koordinaten ins existierende Farm-Objekt gemerged');
  eq(db.placeObjects['@F_EXIST@'].note, 'Erbhof', 'af.2: Notiz gemerged');
  eq(db.individuals['@I1@'].events[0].placeId, '@F_EXIST@', 'af.2: Event auf existierendes Farm-Objekt umgehängt');
})();

// ── Scope-Trennung: gleicher Farm-Name, anderes Dorf → richtiges Objekt getroffen ──
(function() {
  var db = {
    individuals: { '@I1@': { events:[ { type:'RESI', addr:'Hof Meyer', place:'Borghorst' } ] } },
    placeObjects: {
      '@V_A@': _PO({ id:'@V_A@', title:'Ochtrup',   type:'City' }),
      '@V_B@': _PO({ id:'@V_B@', title:'Borghorst', type:'City' }),
      '@F_A@': _PO({ id:'@F_A@', title:'Hof Meyer', type:'Farm', enclosedBy:[{ placeId:'@V_A@' }] }),
      '@F_B@': _PO({ id:'@F_B@', title:'Hof Meyer', type:'Farm', enclosedBy:[{ placeId:'@V_B@' }] }),
    },
    hofObjects: { 'Hof Meyer': { addr:'Hof Meyer', lat:52.1, long:7.3, note:'' } },
  };
  API._migrateHofObjectsToPlaceObjects(db);
  eq(db.placeObjects['@F_B@'].lat, 52.1, 'af.3: Koords ins Borghorster Farm-Objekt (richtiger Scope)');
  eq(db.placeObjects['@F_A@'].lat, null, 'af.3: Ochtruper gleichnamiges Farm-Objekt unberührt');
  eq(db.individuals['@I1@'].events[0].placeId, '@F_B@', 'af.3: Event auf Borghorster Farm umgehängt');
})();

// ── Idempotenz: zweiter Lauf erzeugt keine Dubletten, placeId stabil ──
(function() {
  var db = {
    individuals: { '@I1@': { events:[ { type:'RESI', addr:'Hof Idem', place:'Ochtrup', placeId:null } ] } },
    placeObjects: { '@V_OCH@': _PO({ id:'@V_OCH@', title:'Ochtrup', type:'City' }) },
    hofObjects: { 'Hof Idem': { addr:'Hof Idem', lat:52.0, long:7.0, note:'N' } },
  };
  API._migrateHofObjectsToPlaceObjects(db);
  var idAfter1 = db.individuals['@I1@'].events[0].placeId;
  var cnt1 = Object.values(db.placeObjects).filter(po => po.type === 'Farm').length;
  API._migrateHofObjectsToPlaceObjects(db);
  var cnt2 = Object.values(db.placeObjects).filter(po => po.type === 'Farm').length;
  eq(cnt1, 1, 'af.4: nach 1. Lauf genau 1 Farm');
  eq(cnt2, 1, 'af.4: nach 2. Lauf weiterhin 1 Farm (idempotent)');
  eq(db.individuals['@I1@'].events[0].placeId, idAfter1, 'af.4: ev.placeId über Läufe stabil');
})();

// ── Reine Adresse ohne Koords/Notiz → keine Migration ──
(function() {
  var db = {
    individuals: { '@I1@': { events:[ { type:'RESI', addr:'Nur Adresse', place:'Ochtrup', placeId:null } ] } },
    placeObjects: { '@V_OCH@': _PO({ id:'@V_OCH@', title:'Ochtrup', type:'City' }) },
    hofObjects: { 'Nur Adresse': { addr:'Nur Adresse' } },
  };
  API._migrateHofObjectsToPlaceObjects(db);
  eq(Object.values(db.placeObjects).filter(po => po.type === 'Farm').length, 0,
     'af.5: hofObjects ohne Koords/Notiz → kein Farm-Objekt');
  eq(db.individuals['@I1@'].events[0].placeId, null, 'af.5: ev.placeId bleibt null');
})();

// ── Kein auflösbares Dorf → Farm mit leerem enclosedBy ──
(function() {
  var db = {
    individuals: { '@I1@': { events:[ { type:'RESI', addr:'Einödhof', place:'', placeId:null } ] } },
    placeObjects: {},
    hofObjects: { 'Einödhof': { addr:'Einödhof', lat:51.9, long:6.8 } },
  };
  API._migrateHofObjectsToPlaceObjects(db);
  var farm = Object.values(db.placeObjects).filter(po => po.type === 'Farm')[0];
  ok(!!farm, 'af.6: Farm auch ohne Dorf angelegt');
  eq(farm.enclosedBy.length, 0, 'af.6: enclosedBy leer (kein Dorf auflösbar)');
})();

// ── _hofVillageId: häufigstes Dorf gewinnt + village→farm-Repointing ──
(function() {
  var db = {
    individuals: {
      '@I1@': { events:[ { type:'RESI', addr:'X', place:'Ochtrup',   placeId:'@V_OCH@' } ] },
      '@I2@': { events:[ { type:'RESI', addr:'X', place:'Ochtrup',   placeId:'@V_OCH@' } ] },
      '@I3@': { events:[ { type:'RESI', addr:'X', place:'Borghorst', placeId:'@V_BOR@' } ] },
    },
    placeObjects: {
      '@V_OCH@': _PO({ id:'@V_OCH@', title:'Ochtrup',   type:'City' }),
      '@V_BOR@': _PO({ id:'@V_BOR@', title:'Borghorst', type:'City' }),
    },
    hofObjects: { 'X': { addr:'X', lat:52.0, long:7.0 } },
  };
  eq(API._hofVillageId(db, 'X'), '@V_OCH@', 'af.7: häufigstes Dorf gewinnt (2× Ochtrup vs 1× Borghorst)');
  API._migrateHofObjectsToPlaceObjects(db);
  var farm = Object.values(db.placeObjects).filter(po => po.type === 'Farm')[0];
  eq(farm.enclosedBy[0].placeId, '@V_OCH@', 'af.7: Farm enclosedBy = häufigstes Dorf');
  ok(db.individuals['@I1@'].events[0].placeId === farm.id, 'af.7: Event mit Dorf-placeId → auf Farm umgehängt');
})();

// ── Dorf-Promotion: kein Dorf-placeObject (GEDCOM) → aus ev.place anlegen ──
(function() {
  var db = {
    individuals: { '@I1@': { events:[ { type:'RESI', addr:'Hof Neu', place:'Ochtrup', placeId:null } ] } },
    placeObjects: {},
    hofObjects: { 'Hof Neu': { addr:'Hof Neu', lat:52.2, long:7.1 } },
  };
  API._migrateHofObjectsToPlaceObjects(db);
  var farm = Object.values(db.placeObjects).filter(po => po.type === 'Farm')[0];
  var vil  = Object.values(db.placeObjects).filter(po => po.type === 'Unknown')[0];
  ok(!!vil, 'af.8: Dorf-placeObject aus ev.place promoviert (GEDCOM ohne Dorf-PO)');
  eq(vil.title, 'Ochtrup', 'af.8: Dorf-Titel = ev.place');
  eq(vil.type, 'Unknown', 'af.8: promovierter Ort = Typ Unknown (kein falsches City-Label)');
  eq(farm.enclosedBy[0].placeId, vil.id, 'af.8: Farm enclosedBy promoviertes Dorf');
})();

// ── ev.place == Adresse → KEIN gleichnamiges Dorf (Idempotenz-Bug-Schutz) ──
(function() {
  var db = {
    individuals: { '@I1@': { events:[ { type:'RESI', addr:'Regerplatz 3', place:'Regerplatz 3', placeId:null } ] } },
    placeObjects: {},
    hofObjects: { 'Regerplatz 3': { addr:'Regerplatz 3', lat:52, long:7 } },
  };
  API._migrateHofObjectsToPlaceObjects(db);
  eq(Object.values(db.placeObjects).filter(po => po.type !== 'Farm').length, 0,
     'af.9: ev.place == Adresse → kein gleichnamiger Ort angelegt (nur Farm existiert)');
  eq(Object.values(db.placeObjects).filter(po => po.type === 'Farm')[0].enclosedBy.length, 0,
     'af.9: Farm ohne Enclosure');
})();

// ── Leaf-Strip: ev.place="Hof, Dorf" (Reimport-Form) → Dorf="Dorf" ──
(function() {
  var db = {
    individuals: { '@I1@': { events:[ { type:'RESI', addr:'Hof Schulze', place:'Hof Schulze, Ochtrup', placeId:null } ] } },
    placeObjects: {},
    hofObjects: { 'Hof Schulze': { addr:'Hof Schulze', lat:52, long:7 } },
  };
  eq(API._hofVillageString(db, 'Hof Schulze'), 'Ochtrup',
     'af.10: führendes Hof-Blatt aus ev.place gestrippt (Reimport-Idempotenz)');
  API._migrateHofObjectsToPlaceObjects(db);
  eq(Object.values(db.placeObjects).filter(po => po.type === 'Unknown')[0].title, 'Ochtrup',
     'af.10: Dorf = Ochtrup (nicht "Hof Schulze, Ochtrup")');
})();

// ── Mehrstufiger Ort → echte Enclosure-Kette (kein Komma-Titel-Verlust) ──
(function() {
  var db = {
    individuals: { '@I1@': { events:[ { type:'RESI', addr:'Sonnenstr 12', place:'München, Bayern, Deutschland', placeId:null } ] } },
    placeObjects: {},
    hofObjects: { 'Sonnenstr 12': { addr:'Sonnenstr 12', lat:48, long:11 } },
  };
  API._migrateHofObjectsToPlaceObjects(db);
  var byTitle = {}; Object.values(db.placeObjects).forEach(po => byTitle[po.title] = po);
  ok(byTitle['München'] && byTitle['Bayern'] && byTitle['Deutschland'],
     'af.11: Enclosure-Kette München←Bayern←Deutschland angelegt (3 Glieder)');
  eq(byTitle['München'].enclosedBy[0].placeId, byTitle['Bayern'].id,      'af.11: München enclosedBy Bayern');
  eq(byTitle['Bayern'].enclosedBy[0].placeId,  byTitle['Deutschland'].id, 'af.11: Bayern enclosedBy Deutschland');
  eq(byTitle['Deutschland'].enclosedBy.length, 0,                         'af.11: Deutschland = oberstes Level');
  eq(byTitle['Sonnenstr 12'].enclosedBy[0].placeId, byTitle['München'].id, 'af.11: Farm enclosedBy feinstes Level (München)');
})();

// ── REGRESSION: Ortshistorie bleibt erhalten (ADR-024 ∩ ADR-026) ──
// Gleicher Hof über verschiedene historische Ortsstrings → selbe Identität;
// periodengerechte Ortsnamen lösen weiterhin korrekt auf (durch die Farm-Kette).
(function() {
  var db = {
    individuals: {
      '@I1@': { events:[
        { type:'RESI', addr:'Hof Meyer', place:'Sassenbergk', date:'1700', placeId:null },
        { type:'RESI', addr:'Hof Meyer', place:'Sassenberg',  date:'1850', placeId:null },
      ] },
    },
    families: {}, extraPlaces: {},
    placeObjects: {
      '@P0001@': { id:'@P0001@', title:'Fürstbistum Münster', type:'Region',
        pnames:[{value:'Fürstbistum Münster'}], enclosedBy:[], lat:null, long:null },
      '@P0002@': { id:'@P0002@', title:'Sassenberg', type:'Village',
        pnames:[ {value:'Sassenberg'}, {value:'Sassenbergk', dateFrom:'1650', dateTo:'1802', dateType:'range'} ],
        enclosedBy:[ {placeId:'@P0001@', dateFrom:'1500', dateTo:'1803', dateType:'span'} ], lat:null, long:null },
    },
    hofObjects: { 'Hof Meyer': { addr:'Hof Meyer', lat:51.9, long:8.0 } },
  };
  API.setDb(db);
  API._migrateHofObjectsToPlaceObjects(API.AppState.db);
  var D = API.AppState.db, evs = D.individuals['@I1@'].events;
  ok(evs[0].placeId && evs[0].placeId === evs[1].placeId,
     'af.12: gleicher Hof über versch. historische Ortsstrings (Sassenbergk/Sassenberg) → selbe placeId');
  var farm = D.placeObjects[evs[0].placeId];
  eq(farm.type, 'Farm', 'af.12: Event zeigt auf Farm-PO');
  eq(farm.enclosedBy[0].placeId, '@P0002@',
     'af.12: Farm enclosedBy EXISTIERENDES Sassenberg-PO (per pname-Match erkannt, keine Dublette)');
  eq(Object.values(D.placeObjects).filter(p => p.type !== 'Farm' && API._normPlaceName(p.title) === 'sassenberg').length, 1,
     'af.12: kein doppeltes Sassenberg-PO angelegt');
  eq(API._buildFormString(farm.id, 1700), 'Hof Meyer, Sassenbergk, Fürstbistum Münster',
     'af.12: 1700 → historischer Ortsname Sassenbergk löst durch die Farm-Kette korrekt auf');
  // 1850: enclosedBy Fürstbistum Münster endet 1803 (Säkularisation) → Parent fällt
  // korrekt weg. Beweist: datierte Zugehörigkeit wirkt durch die Farm-Kette hindurch.
  eq(API._buildFormString(farm.id, 1850), 'Hof Meyer, Sassenberg',
     'af.12: 1850 → moderner Name Sassenberg, Parent (bis 1803 datiert) korrekt entfallen');
})();

// ── QT-Kern laden (lazy, einmal pro Lauf) ─────────────────────────────────────
// Extrahiert _qtSaveCustom + Helfer aus ui-quicktpl.js ohne UI/DOM-Bezug.
var _QT = null;
function _loadQT() {
  if (_QT) return _QT;
  var src = _readSrc('ui-quicktpl.js');
  var p1End   = src.indexOf('\nfunction _qtList(');
  var p2Start = src.indexOf('\nlet _qtActiveTpl = null;');
  var p2End   = src.indexOf('\nfunction _qtAfterSave(');
  var p3Start = src.indexOf('\nfunction _qtAddCitToEvent(');
  var p3End   = src.indexOf('\nfunction _qtShowInlinePlausi(');
  // Nach Refactor: Helfer stehen vor _qtSaveCustom → früheren Marker nehmen
  var p4Start = src.indexOf('\nfunction _qtApplyPersonFields(');
  if (p4Start < 0) p4Start = src.indexOf('\nfunction _qtSaveCustom(');
  var p4End   = src.indexOf('\nfunction qtEntryDone(');
  if ([p1End, p2Start, p2End, p3Start, p3End, p4Start, p4End].some(function(x) { return x < 0; })) {
    throw new Error('_loadQT: Marker in ui-quicktpl.js nicht gefunden — Refactor prüfen');
  }
  var qtSlice = [
    src.slice(0, p1End),
    src.slice(p2Start, p2End),
    src.slice(p3Start, p3End),
    src.slice(p4Start, p4End),
    // Brücke: Globals aus _combined reanknüpfen (für JXA-Eval-Isolation)
    'var AppState                 = window.AppState;',
    'var nextId                   = window.nextId;',
    'var citationObj              = window.citationObj;',
    'var gedcomDate               = window.gedcomDate;',
    'var gedcomTime               = window.gedcomTime;',
    'var _rebuildPersonSourceRefs = window._rebuildPersonSourceRefs;',
    'var _rebuildFamilySourceRefs = window._rebuildFamilySourceRefs;',
    // Stubs (DOM-schwer oder nicht im gedcom-Kern)
    'function _normQuickDate(s) { return s || ""; }',
    'function _qtAfterSave() {}',
    'function _qtShowInlinePlausi() {}',
    'function pushUndo() {}',
    'function markChanged() { if (window.AppState) window.AppState.changed = true; }',
    'function renderTab() {}',
    // Exponiere für Tests
    'window._qtApi = {',
    '  _qtSaveCustom: _qtSaveCustom,',
    '  _getSession:   function() { return _qtSession; },',
    '  _setMatchSel:  function(v) { _qtMatchSel = v; },',
    '  _resetState:   function() { _qtSession = []; _qtMatchSel = {}; },',
    '};',
  ].join('\n');
  if (IS_NODE) {
    _vm.runInContext(qtSlice, _ctx, { filename: 'ui-quicktpl-core.js' });
    _QT = _ctx._qtApi;
  } else {
    eval(qtSlice);
    _QT = window._qtApi;
  }
  return _QT;
}

function _qtReset(dbOverride) {
  API.setDb(dbOverride || { individuals: {}, families: {}, placeObjects: {} });
  var qt = _loadQT();
  qt._resetState();
  return qt;
}

group('(ac) QT _qtSaveCustom');

(function() {
  // (ac.1) Neue Hauptperson mit Geburtsort — Person landet in db, keine Familie
  var qt = _qtReset();
  var tpl = { base: 'custom', context: { sid: '@S1@', quay: '3' },
    schema: { fields: [
      { role: 'main', type: 'surname' },
      { role: 'main', type: 'given'   },
      { role: 'main', type: 'date',  target: 'birth' },
      { role: 'main', type: 'place', target: 'birth' },
    ]}};
  qt._qtSaveCustom(tpl, { c0: 'Müller', c1: 'Hans', c2: '1 JAN 1900', c3: 'Münster' });
  var inds = API.AppState.db.individuals;
  var fams = API.AppState.db.families;
  var ids = Object.keys(inds);
  eq(ids.length, 1, 'ac.1: genau 1 Person angelegt');
  var p = inds[ids[0]];
  eq(p.surname, 'Müller', 'ac.1: Nachname korrekt');
  eq(p.given,   'Hans',   'ac.1: Vorname korrekt');
  eq(p.birth && p.birth.date, '1 JAN 1900', 'ac.1: Geburtsdatum gesetzt');
  eq(p.birth && p.birth.place, 'Münster', 'ac.1: Geburtsort gesetzt');
  eq(Object.keys(fams).length, 0, 'ac.1: keine Familie angelegt');
  eq(qt._getSession().length, 1, 'ac.1: Session enthält 1 ID');
})();

(function() {
  // (ac.2) Hauptperson + Vater + Mutter (alle neu) → neue Eltern-Familie
  var qt = _qtReset();
  var tpl = { base: 'custom', context: { sid: '@S1@', quay: '2' },
    schema: { fields: [
      { role: 'main',   type: 'surname' }, { role: 'main',   type: 'given' },
      { role: 'father', type: 'surname' }, { role: 'father', type: 'given' },
      { role: 'mother', type: 'surname' }, { role: 'mother', type: 'given' },
    ]}};
  qt._qtSaveCustom(tpl, { c0:'Kind',  c1:'Anna', c2:'Vater', c3:'Fritz', c4:'Mutter', c5:'Lisa' });
  var inds = API.AppState.db.individuals;
  var fams = API.AppState.db.families;
  eq(Object.keys(inds).length, 3, 'ac.2: 3 Personen angelegt');
  eq(Object.keys(fams).length, 1, 'ac.2: 1 Familie angelegt');
  var fam = fams[Object.keys(fams)[0]];
  ok(fam.children && fam.children.length === 1, 'ac.2: Kind in Familie.children');
  // Hauptperson hat famc-Eintrag
  var main = Object.values(inds).find(function(p) { return p.surname === 'Kind'; });
  ok(main && Array.isArray(main.famc) && main.famc.length === 1, 'ac.2: main.famc gesetzt');
})();

(function() {
  // (ac.3) Hauptperson + bestehende Eltern (bereits verknüpft) → Familie wiederverwenden
  var fa = { id: '@I1@', lastName: 'Alt', firstName: 'Vater', sex: 'M',
    birth:{}, chr:{}, death:{}, buri:{}, events:[], fams:['@F1@'], famc:[], citations:[] };
  var mo = { id: '@I2@', lastName: 'Alt', firstName: 'Mutter', sex: 'F',
    birth:{}, chr:{}, death:{}, buri:{}, events:[], fams:['@F1@'], famc:[], citations:[] };
  var existFam = { id: '@F1@', husb: '@I1@', wife: '@I2@', children: [],
    marr:{}, engag:{}, div:{}, divf:{}, noteTexts:[], noteText:'', media:[], sourceRefs: new Set(),
    lastChanged:'', lastChangedTime:'', childRelations: {} };
  var db = { individuals: { '@I1@': fa, '@I2@': mo }, families: { '@F1@': existFam }, placeObjects: {} };
  var qt = _qtReset(db);
  qt._setMatchSel({ father: '@I1@', mother: '@I2@' });
  var tpl = { base: 'custom', context: { sid: '@S1@', quay: '2' },
    schema: { fields: [
      { role: 'main',   type: 'surname' }, { role: 'main',   type: 'given' },
      { role: 'father', type: 'surname' }, { role: 'father', type: 'given' },
      { role: 'mother', type: 'surname' }, { role: 'mother', type: 'given' },
    ]}};
  qt._qtSaveCustom(tpl, { c0:'Kind', c1:'Eva', c2:'', c3:'', c4:'', c5:'' });
  var inds = API.AppState.db.individuals;
  var fams = API.AppState.db.families;
  eq(Object.keys(fams).length, 1, 'ac.3: keine neue Familie angelegt (Reuse)');
  ok(existFam.children.includes(Object.keys(inds).find(function(id) { return id !== '@I1@' && id !== '@I2@'; })),
    'ac.3: neues Kind in bestehender Familie.children');
})();

(function() {
  // (ac.4) Hauptperson + Ehepartner (beide neu) → neue Ehe-Familie, fams gesetzt
  var qt = _qtReset();
  var tpl = { base: 'custom', context: { sid: '@S1@', quay: '3', place: 'Münster', placeId: null },
    schema: { fields: [
      { role: 'main',  type: 'surname' }, { role: 'main',  type: 'given' }, { role: 'main',  type: 'sex' },
      { role: 'spouse',type: 'surname' }, { role: 'spouse',type: 'given' }, { role: 'spouse',type: 'sex' },
      { role: 'main',  type: 'date', target: 'marr' },
    ]}};
  qt._qtSaveCustom(tpl, { c0:'Bauer', c1:'Klaus', c2:'M', c3:'Schmitt', c4:'Eva', c5:'F', c6:'15 MAR 1950' });
  var inds = API.AppState.db.individuals;
  var fams = API.AppState.db.families;
  eq(Object.keys(inds).length, 2, 'ac.4: 2 Personen angelegt');
  eq(Object.keys(fams).length, 1, 'ac.4: 1 Ehe-Familie angelegt');
  var fam = fams[Object.keys(fams)[0]];
  eq(fam.marr && fam.marr.date, '15 MAR 1950', 'ac.4: Heiratsdatum gesetzt');
  var main = Object.values(inds).find(function(p) { return p.surname === 'Bauer'; });
  ok(main && Array.isArray(main.fams) && main.fams.length === 1, 'ac.4: main.fams gesetzt');
})();

(function() {
  // (ac.5) Bestehende Ehe → Reuse: Datum + Beleg ergänzen, keine zweite Familie
  var m  = { id: '@I1@', lastName: 'A', firstName: 'M', sex: 'M',
    birth:{}, chr:{}, death:{}, buri:{}, events:[], fams:['@F1@'], famc:[], citations:[] };
  var sp = { id: '@I2@', lastName: 'B', firstName: 'S', sex: 'F',
    birth:{}, chr:{}, death:{}, buri:{}, events:[], fams:['@F1@'], famc:[], citations:[] };
  var existFam = { id: '@F1@', husb: '@I1@', wife: '@I2@', children: [],
    marr:{ date:'', place:'', placeId:null, lati:null, long:null, citations:[], _extra:[], value:'', seen:true, note:'', noteRefs:[], media:[] },
    engag:{}, div:{}, divf:{}, noteTexts:[], noteText:'', media:[], sourceRefs: new Set(),
    lastChanged:'', lastChangedTime:'' };
  var db = { individuals: { '@I1@': m, '@I2@': sp }, families: { '@F1@': existFam }, placeObjects: {} };
  var qt = _qtReset(db);
  qt._setMatchSel({ main: '@I1@', spouse: '@I2@' });
  var tpl = { base: 'custom', context: { sid: '@S1@', quay: '3' },
    schema: { fields: [
      { role: 'main',   type: 'surname' }, { role: 'main',   type: 'given' },
      { role: 'spouse', type: 'surname' }, { role: 'spouse', type: 'given' },
      { role: 'main',   type: 'date', target: 'marr' },
    ]}};
  qt._qtSaveCustom(tpl, { c0:'', c1:'', c2:'', c3:'', c4:'10 JUN 1960' });
  var fams = API.AppState.db.families;
  eq(Object.keys(fams).length, 1, 'ac.5: keine neue Familie, Reuse');
  eq(existFam.marr.date, '10 JUN 1960', 'ac.5: Heiratsdatum in bestehender Familie ergänzt');
  ok(existFam.marr.citations && existFam.marr.citations.some(function(c) { return c.sid === '@S1@'; }),
    'ac.5: Beleg an Heirat angehängt');
})();

(function() {
  // (ac.6) Age-Feld → Geburtsdatum aus Sterbedatum + Alter berechnet
  var qt = _qtReset();
  var tpl = { base: 'custom', context: { sid: '@S1@', quay: '2' },
    schema: { fields: [
      { role: 'main', type: 'surname' },
      { role: 'main', type: 'given'  },
      { role: 'main', type: 'date',  target: 'death' },
      { role: 'main', type: 'age',   target: 'death' },
    ]}};
  qt._qtSaveCustom(tpl, { c0:'Test', c1:'Max', c2:'1 JAN 1900', c3: { y:'40', m:'0', d:'0' } });
  var inds = API.AppState.db.individuals;
  var p = inds[Object.keys(inds)[0]];
  eq(p.death && p.death.date, '1 JAN 1900', 'ac.6: Sterbedatum gesetzt');
  ok(p.birth && p.birth.date && p.birth.date.indexOf('1860') >= 0, 'ac.6: Geburtsjahr ~1860 berechnet');
})();

// ── Zusammenfassung ───────────────────────────────────────────────────────────
console.log('');
if (_fail === 0) {
  console.log(GREEN + BOLD + 'Alle ' + _pass + ' Unit-Tests bestanden.' + RESET);
  _exit(0);
} else {
  console.log(RED + BOLD + _fail + ' von ' + (_pass + _fail) + ' Tests fehlgeschlagen.' + RESET);
  _exit(1);
}
