if (location.search.includes('debug=1') || location.hash === '#debug') {
  var s = document.createElement('script');
  s.src = 'ui-debug.js';
  document.head.appendChild(s);
  document.querySelectorAll('[data-debug-only]').forEach(function(el) { el.removeAttribute('hidden'); });
}
