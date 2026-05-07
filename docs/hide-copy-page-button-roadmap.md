# Hide "Copy Page" button on the Roadmap page

## DOM structure (confirmed from DevTools)

```
#content-container
  section.content-body.grid-75   ← main article (contains the HTMLBlock)
  section.content-toc.grid-25    ← Copy Page button lives here
```

## Solution — two layers inside the HTML block

### 1. In the HTML block's `<style>` tag — add these two rules

```css
body:has(#aira-roadmap-root:not([data-rmhide])) section.content-toc  { display: none !important; }
body:has(#aira-roadmap-root:not([data-rmhide])) section.content-body { max-width: 100% !important; flex: 1 1 100% !important; width: 100% !important; }
```

### 2. Admin Settings → Footer HTML — replace everything with this

```html
<script>
(function () {
  var SLUG = '/docs/roadmap';

  function sync() {
    var root = document.getElementById('aira-roadmap-root');
    if (!root) return;
    if (window.location.pathname === SLUG) {
      root.removeAttribute('data-rmhide');
    } else {
      root.setAttribute('data-rmhide', '1');
    }
  }

  sync();
  window.addEventListener('pageshow', sync);

  if (!window._rmAttrPatch) {
    window._rmAttrPatch = true;
    ['pushState', 'replaceState'].forEach(function (fn) {
      var orig = history[fn];
      history[fn] = function () { orig.apply(this, arguments); sync(); };
    });
    window.addEventListener('popstate', sync);
  }

  if (!window._rmAttrObs) {
    window._rmAttrObs = new MutationObserver(sync);
    window._rmAttrObs.observe(document.body, { childList: true, subtree: true });
  }
})();
</script>
```

Remove any inline script from the HTML block.

## Why this is more robust

Previous approaches tried to clean up `section.content-toc` and `section.content-body` directly — shared layout nodes that React reuses, making cleanup unreliable.

This approach only touches `#aira-roadmap-root` (the HTML block's own element). The CSS `:has(#aira-roadmap-root:not([data-rmhide]))` deactivates in three independent ways:

1. `#aira-roadmap-root` is removed from DOM
2. `#aira-roadmap-root` has `data-rmhide` attribute set
3. `#aira-roadmap-root` never existed on this page

Setting an attribute does **not** trigger `childList` mutations so there is no observer loop.
