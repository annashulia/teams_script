# Hide "Copy Page" button on the Roadmap page

## DOM structure (confirmed from DevTools)

```
#content-container
  section.content-body.grid-75   ← main article
  section.content-toc.grid-25    ← Copy Page button lives here
```

## Solution

### 1. CSS — in the HTML block `<style>` tag (or Admin Custom CSS)

```css
body.rm-roadmap-active section.content-toc  { display: none !important; }
body.rm-roadmap-active section.content-body { max-width: 100% !important; flex: 1 1 100% !important; width: 100% !important; }
```

### 2. Footer HTML — replace everything with this

```html
<script>
(function () {
  var SLUG = '/docs/roadmap';
  var CLS  = 'rm-roadmap-active';

  function destPath(url) {
    return String(url || '').replace(/^https?:\/\/[^\/]+/, '').split('?')[0].split('#')[0];
  }
  function clearStale() {
    var t = document.querySelector('section.content-toc');
    var b = document.querySelector('section.content-body');
    if (t) t.style.removeProperty('display');
    if (b) { b.style.removeProperty('max-width'); b.style.removeProperty('flex'); b.style.removeProperty('width'); }
  }
  function applyClass(isRoadmap) {
    document.body.classList.toggle(CLS, !!isRoadmap);
  }

  clearStale();
  applyClass(window.location.pathname === SLUG);

  window.addEventListener('pageshow', function () {
    clearStale();
    applyClass(window.location.pathname === SLUG);
  });

  if (!window._rmClassPatch) {
    window._rmClassPatch = true;
    ['pushState', 'replaceState'].forEach(function (fn) {
      var orig = history[fn];
      history[fn] = function () {
        applyClass(destPath(arguments[2]) === SLUG); // destination BEFORE URL changes
        var r = orig.apply(this, arguments);
        clearStale();
        return r;
      };
    });
    window.addEventListener('popstate', function () {
      clearStale();
      applyClass(window.location.pathname === SLUG);
    });
  }
})();
</script>
```

Remove any inline script from the HTML block. Remove any `:has()` rules from the `<style>` tag.

## Why body class instead of `:has(#aira-roadmap-root)`

React keeps `#aira-roadmap-root` alive in the DOM after navigating away (cached for fast back navigation). So `:has(#aira-roadmap-root)` always matches after the first roadmap visit — it cannot be used as the CSS trigger.

`document.body` is always the same element, always accessible. Toggling a class on it is atomic and instant.

The key: `applyClass(destPath(arguments[2]) === SLUG)` uses the **destination URL** and runs **before** `orig.apply`. The CSS switches state before React starts rendering the new page. No race condition.

`clearStale()` removes any leftover inline styles from previous script versions.
