# Hide "Copy Page" button on the Roadmap page

## The problem

The `/docs/roadmap` page uses a full-width custom HTML block. ReadMe renders a "Copy Page" button in the top-right corner of every guide page. On this page the button wastes horizontal space that the HTML content could otherwise use.

## Solution — JavaScript snippet in Admin Settings → Footer HTML

ReadMe is a React SPA, so the "Copy Page" button is injected into the DOM after the initial page load and also on every client-side navigation. A `MutationObserver` is the right tool: it watches the DOM continuously and removes the button whenever it appears, on any page transition.

### Where to add it

Go to **Admin Settings → Custom CSS, JS, HTML → Footer HTML** and paste the snippet below.  
*(Footer HTML is injected just before `</body>` on every page — the observer only acts when the URL matches `/docs/roadmap`.)*

### The snippet — paste into Admin Settings → Footer HTML

```html
<script>
(function () {
  var SLUG = '/docs/roadmap';
  var hiddenCol  = null;
  var expandedSibs = [];
  var watchObs = null;

  var debounce = function (fn, ms) {
    var t;
    return function () { clearTimeout(t); t = setTimeout(fn, ms); };
  };

  function cleanup() {
    if (hiddenCol) { hiddenCol.style.removeProperty('display'); hiddenCol = null; }
    expandedSibs.forEach(function (s) {
      s.style.removeProperty('max-width');
      s.style.removeProperty('flex');
      s.style.removeProperty('width');
    });
    expandedSibs = [];
    if (watchObs) { watchObs.disconnect(); watchObs = null; }
  }

  function applyFix() {
    if (hiddenCol) return; // already applied
    document.querySelectorAll('button, [role="button"]').forEach(function (el) {
      if (hiddenCol || !/copy page/i.test(el.textContent)) return;

      var container = document.getElementById('content-container');
      if (!container) return;

      var col = el;
      while (col.parentElement && col.parentElement !== container) {
        col = col.parentElement;
      }
      if (col.parentElement !== container) return;
      if (col.querySelector('#aira-roadmap-root, iframe, article')) return;

      hiddenCol = col;
      col.style.setProperty('display', 'none', 'important');

      [].forEach.call(container.children, function (sib) {
        if (sib !== col) {
          sib.style.setProperty('max-width', '100%', 'important');
          sib.style.setProperty('flex', '1 1 100%', 'important');
          sib.style.setProperty('width', '100%', 'important');
          expandedSibs.push(sib);
        }
      });
    });
  }

  var ensure = debounce(function () {
    if (!window.location.pathname.includes(SLUG)) {
      // Navigated away — undo everything so other pages are clean
      cleanup();
      return;
    }

    applyFix();

    // Button not in DOM yet — watch for it, then disconnect once found
    if (!hiddenCol && !watchObs) {
      watchObs = new MutationObserver(debounce(function () {
        applyFix();
        if (hiddenCol) { watchObs.disconnect(); watchObs = null; }
      }, 50));
      watchObs.observe(document.body, { childList: true, subtree: true });
    }
  }, 50);

  // Initial load
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', ensure);
  else ensure();
  window.addEventListener('pageshow', ensure);

  // History patch — shared with other scripts via _historyPatched guard
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

### What was wrong before and what this fixes

The previous "walk up" loop kept going even when it couldn't find a matching class name, eventually reaching a top-level page wrapper and hiding that (taking the whole page with it). The fix:

1. **`getElementById('content-container')` as anchor** — stops the walk exactly at the grid container; if that ID is missing the function exits cleanly instead of destructively.
2. **Hard bail if we overshoot** — `if (col.parentElement !== container) return` means if the walk-up ever passes `#content-container`, nothing gets hidden.
3. **Content safety check** — `col.querySelector('#aira-roadmap-root, iframe, article')` identifies the article column (which contains your custom HTML root) and skips it, so only the Copy Page column is hidden.
4. **Expand siblings** — once the right column is gone, all other direct children of `#content-container` are set to `100%` width so the content fills the space.
