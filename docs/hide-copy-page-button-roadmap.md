# Hide "Copy Page" button on the Roadmap page

## DOM structure (confirmed from DevTools)

```
#content-container
  section.content-body.grid-75   ← main article (contains the HTMLBlock)
  section.content-toc.grid-25    ← Copy Page button lives here
```

## Solution — add a script at the end of the HTML block

Just before the closing `</div>` of `#aira-roadmap-root`, add:

```html
<script>
(function () {
  var toc  = document.querySelector('section.content-toc');
  var body = document.querySelector('section.content-body');
  if (!toc || !body) return;

  toc.style.setProperty('display',    'none',     'important');
  body.style.setProperty('max-width', '100%',     'important');
  body.style.setProperty('flex',      '1 1 100%', 'important');
  body.style.setProperty('width',     '100%',     'important');

  // Watch for this page's content being unmounted by React
  var obs = new MutationObserver(function () {
    if (document.getElementById('aira-roadmap-root')) return;
    toc.style.removeProperty('display');
    body.style.removeProperty('max-width');
    body.style.removeProperty('flex');
    body.style.removeProperty('width');
    obs.disconnect();
  });
  obs.observe(document.body, { childList: true, subtree: true });
})();
</script>
```

**Remove any Copy Page script from Admin Settings → Footer HTML** — it is no longer needed.

## Why this works

- The script only executes on the roadmap page (it lives inside the HTML block)
- Cleanup is triggered by `#aira-roadmap-root` disappearing from the DOM — React's own unmount, not navigation events
- The observer disconnects immediately after cleanup — no ongoing overhead
- `:has()` CSS was unreliable because ReadMe sometimes keeps `#aira-roadmap-root` briefly in the DOM during page transitions, making the rule fire on other pages
