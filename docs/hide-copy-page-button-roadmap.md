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

  if (!window._rmNavPatch) {
    window._rmNavPatch = true;
    ['pushState', 'replaceState'].forEach(function (fn) {
      var orig = history[fn];
      history[fn] = function () {
        // Set flag BEFORE orig.apply so CSS deactivates before React renders
        if (window.location.pathname === SLUG) {
          var dest = String(arguments[2] || '');
          if (dest.indexOf(SLUG) === -1) {
            var root = document.getElementById('aira-roadmap-root');
            if (root) root.setAttribute('data-rmhide', '1');
          }
        }
        var r = orig.apply(this, arguments);
        sync();
        return r;
      };
    });
    window.addEventListener('popstate', sync);
  }

  if (!window._rmNavObs) {
    window._rmNavObs = new MutationObserver(sync);
    window._rmNavObs.observe(document.body, { childList: true, subtree: true });
  }
})();
</script>
```

Remove any inline script from the HTML block.

## Why setting the flag before `orig.apply` matters

All previous approaches called sync AFTER the URL changed (`orig.apply` first, then sync). React schedules rendering immediately after pushState, so by the time sync ran, React may already have started rendering the new page with the CSS still active.

Setting `data-rmhide` BEFORE `orig.apply` means:
- URL hasn't changed yet
- React hasn't started rendering
- CSS rule `body:has(#aira-roadmap-root:not([data-rmhide]))` becomes false immediately
- By the time React renders the new page, the layout is already correct — zero window of wrongness
