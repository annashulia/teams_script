# Hide "Copy Page" button on the Roadmap page

## DOM structure (confirmed from DevTools)

On every ReadMe page the layout is:

```
#content-container
  section.content-body.grid-75   ← main article
  section.content-toc.grid-25    ← Copy Page button lives here
```

`content-toc` and `content-body` are **stable class names** (not hashed).

## Solution — paste into Admin Settings → Footer HTML

```html
<script>
(function () {
  var SLUG     = '/docs/roadmap';
  var STYLE_ID = 'roadmap-cp-fix';

  function applyFix() {
    if (document.getElementById(STYLE_ID)) return;
    var s = document.createElement('style');
    s.id = STYLE_ID;
    s.textContent =
      'section.content-toc{display:none!important}' +
      'section.content-body{max-width:100%!important;flex:1 1 100%!important;width:100%!important}';
    document.head.appendChild(s);
  }

  function cleanup() {
    var s = document.getElementById(STYLE_ID);
    if (s) s.parentNode.removeChild(s);
  }

  function check() {
    if (window.location.pathname.includes(SLUG)) applyFix();
    else cleanup();
  }

  // Initial load
  check();
  window.addEventListener('pageshow', check);

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

  // app:navigate fires right after pushState changes the URL,
  // before React renders the new page — perfect timing to inject/remove the style
  window.addEventListener('app:navigate', check);
})();
</script>
```

## Why a `<style>` tag instead of inline styles

- **No blink on roadmap**: the `<style>` is injected the moment `pushState` fires (before React renders), so `section.content-toc` is hidden from the very first paint
- **No widen on other pages**: `cleanup()` removes the `<style>` the moment `pushState` fires (before React renders the new page), so other pages never see our rules
- **No MutationObserver needed**: CSS applies to elements that don't exist yet — when React renders `section.content-toc`, the rule is already there waiting
- **No debounce needed**: acting on `app:navigate` (synchronous post-`pushState`) is always ahead of React's render cycle
