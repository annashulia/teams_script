# Hide "Copy Page" button on the Roadmap page

## DOM structure (confirmed from DevTools)

```
#content-container
  section.content-body.grid-75   ← main article (contains the HTMLBlock)
  section.content-toc.grid-25    ← Copy Page button lives here
```

## Solution — two layers inside the HTML block

### Admin Settings → Footer HTML

Remove any previous Copy Page script. Remove any inline script from the HTML block. Put only this:

```html
<script>
(function () {
  var SLUG = '/docs/roadmap';

  function sync() {
    var toc  = document.querySelector('section.content-toc');
    var body = document.querySelector('section.content-body');
    if (!toc || !body) return;
    if (window.location.pathname === SLUG) {
      toc.style.setProperty('display',    'none',     'important');
      body.style.setProperty('max-width', '100%',     'important');
      body.style.setProperty('flex',      '1 1 100%', 'important');
      body.style.setProperty('width',     '100%',     'important');
    } else {
      toc.style.removeProperty('display');
      body.style.removeProperty('max-width');
      body.style.removeProperty('flex');
      body.style.removeProperty('width');
    }
  }

  sync();
  window.addEventListener('pageshow', sync);

  if (!window._rmRoadmapPatched) {
    window._rmRoadmapPatched = true;
    ['pushState', 'replaceState'].forEach(function (fn) {
      var orig = history[fn];
      history[fn] = function () { orig.apply(this, arguments); sync(); };
    });
    window.addEventListener('popstate', sync);
  }

  if (!window._rmSyncObs) {
    window._rmSyncObs = new MutationObserver(sync);
    window._rmSyncObs.observe(document.body, { childList: true, subtree: true });
  }
})();
</script>
```

## Why three layers

React's navigation order (URL change vs DOM change) is non-deterministic:

- **`pushState`/`replaceState` patch** — `sync()` fires the instant the URL changes, correct when URL updates before DOM
- **MutationObserver** — `sync()` fires on every DOM change, correct when DOM updates before URL
- **`pageshow`** — covers hard refresh and bfcache restores

Between both timing cases, one of these always fires `sync()` with the correct URL already set. Setting `style` properties does not trigger `childList` mutations so there is no observer loop.
