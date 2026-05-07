# Hide "Copy Page" button on the Roadmap page

## DOM structure (confirmed from DevTools)

```
#content-container
  section.content-body.grid-75   ← main article (contains the HTMLBlock)
  section.content-toc.grid-25    ← Copy Page button lives here
```

## Solution — two layers inside the HTML block

### 1. In the `<style>` tag — instant visual application (zero flash)

```css
body:has(#aira-roadmap-root) section.content-toc  { display: none !important; }
body:has(#aira-roadmap-root) section.content-body { max-width: 100% !important; flex: 1 1 100% !important; width: 100% !important; }
```

### 2. Just before the closing `</div>` of `#aira-roadmap-root` — reliable cleanup

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

## Why two layers

- **`:has()` CSS** fires before JS runs — no flash of the Copy Page button even on SPA navigation
- **Inline script** removes the inline styles the moment React actually removes `#aira-roadmap-root` — handles the transition bleed that CSS alone can't prevent
- `:has()` alone bleeds because ReadMe briefly keeps `#aira-roadmap-root` in the DOM during transitions; the script catches the actual removal and cleans up inline styles immediately
- The observer disconnects after one use — no ongoing overhead
