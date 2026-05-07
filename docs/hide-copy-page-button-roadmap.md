# Hide "Copy Page" button on the Roadmap page

## DOM structure (confirmed from DevTools)

```
#content-container
  section.content-body.grid-75   ← main article (contains the HTMLBlock)
  section.content-toc.grid-25    ← Copy Page button lives here
```

## Solution — two layers inside the HTML block

### Admin Settings → Footer HTML

Remove any previous Copy Page script. Put only this:

```html
<script>
(function () {
  function sync() {
    var toc  = document.querySelector('section.content-toc');
    var body = document.querySelector('section.content-body');
    if (!toc || !body) return;
    if (window.location.pathname === '/docs/roadmap') {
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

  if (!window._rmSyncObs) {
    window._rmSyncObs = new MutationObserver(sync);
    window._rmSyncObs.observe(document.body, { childList: true, subtree: true });
  }
})();
</script>
```

Also remove the inline script from the HTML block — it is no longer needed. The `:has()` CSS rules are also not needed.

## Why this works

Instead of "apply once, clean up when leaving" (which has many failure modes), this runs `sync()` on every DOM mutation React produces during any page transition. It checks the current URL and applies or removes the styles accordingly — self-healing by design.

Setting `style` properties does not trigger `childList` mutations, so there is no observer loop. The `_rmSyncObs` guard ensures only one observer is ever created.
