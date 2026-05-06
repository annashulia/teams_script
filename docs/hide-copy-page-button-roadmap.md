# Hide "Copy Page" button on the Roadmap page

## DOM structure (confirmed from DevTools)

On every ReadMe page the layout is:

```
#content-container
  section.content-body.grid-75   ← main article
  section.content-toc.grid-25    ← Copy Page button lives here
```

`content-toc` and `content-body` are **stable class names** (not hashed). No DOM walking, no button-text search, no article detection needed — just target these two sections directly.

## Solution — paste into Admin Settings → Footer HTML

```html
<script>
(function () {
  var SLUG    = '/docs/roadmap';
  var applied = false;
  var watchObs = null;

  var debounce = function (fn, ms) {
    var t;
    return function () { clearTimeout(t); t = setTimeout(fn, ms); };
  };

  // Query fresh on every cleanup — handles both reused and replaced React nodes
  function cleanup() {
    applied = false;
    if (watchObs) { watchObs.disconnect(); watchObs = null; }
    var toc  = document.querySelector('section.content-toc');
    var body = document.querySelector('section.content-body');
    if (toc)  toc.style.removeProperty('display');
    if (body) {
      body.style.removeProperty('max-width');
      body.style.removeProperty('flex');
      body.style.removeProperty('width');
    }
  }

  function applyFix() {
    if (!window.location.pathname.includes(SLUG)) return;
    if (applied) return;
    var toc  = document.querySelector('section.content-toc');
    var body = document.querySelector('section.content-body');
    if (!toc || !body) return;       // not rendered yet — observer will retry
    applied = true;
    if (watchObs) { watchObs.disconnect(); watchObs = null; }
    toc.style.setProperty('display',    'none',     'important');
    body.style.setProperty('max-width', '100%',     'important');
    body.style.setProperty('flex',      '1 1 100%', 'important');
    body.style.setProperty('width',     '100%',     'important');
  }

  var ensure = debounce(function () {
    if (!window.location.pathname.includes(SLUG)) { cleanup(); return; }
    applyFix();
    if (!applied && !watchObs) {
      watchObs = new MutationObserver(function () { applyFix(); });
      watchObs.observe(document.body, { childList: true, subtree: true });
    }
  }, 50);

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', ensure);
  else ensure();
  window.addEventListener('pageshow', ensure);

  // Shared history patch — co-exists with search script via _historyPatched guard
  (function patchHistory() {
    if (window._historyPatched) return;
    window._historyPatched = true;
    var fire = function () { window.dispatchEvent(new Event('app:navigate')); };
    ['pushState', 'replaceState'].forEach(function (fn) {
      var orig = history[fn];
      history[fn] = function () { var r = orig.apply(this, arguments); fire(); return r; };
    });
    window.addEventListener('popstate', fire);
  })();

  window.addEventListener('app:navigate', ensure);
})();
</script>
```
