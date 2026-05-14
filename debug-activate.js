if (location.search.includes('debug=1') || location.hash === '#debug') {
  document.querySelectorAll('[data-debug-only]').forEach(function(el) { el.removeAttribute('hidden'); });
}
