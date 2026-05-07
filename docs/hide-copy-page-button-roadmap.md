# Hide "Copy Page" button on the Roadmap page

## DOM structure (confirmed from DevTools)

```
#content-container
  section.content-body.grid-75   ← main article (contains the HTMLBlock)
  section.content-toc.grid-25    ← Copy Page button lives here
```

## Solution — two layers inside the HTML block

### Just before the closing `</div>` of `#aira-roadmap-root`

Do NOT use `:has()` CSS for the layout — if React keeps `#aira-roadmap-root` in the DOM (hidden) during transitions, those rules keep firing on other pages.

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

  // Kill any previous observer (in case script re-ran on SPA navigation back to this page)
  if (window._rmRoadmapObs) window._rmRoadmapObs.disconnect();

  var obs = new MutationObserver(function () {
    // Check URL, not element presence — React updates the URL before touching the DOM,
    // so the URL is always correct by the time the first post-navigation mutation fires
    if (window.location.pathname === '/docs/roadmap') return;
    toc.style.removeProperty('display');
    body.style.removeProperty('max-width');
    body.style.removeProperty('flex');
    body.style.removeProperty('width');
    delete window._rmRoadmapObs;
    obs.disconnect();
  });
  obs.observe(document.body, { childList: true, subtree: true });
  window._rmRoadmapObs = obs;
})();
</script>
```

**Remove any Copy Page script from Admin Settings → Footer HTML** — it is no longer needed.

## Why URL check instead of element presence check

React sometimes keeps `#aira-roadmap-root` in the DOM (hidden, not removed) when navigating away. Checking `getElementById('aira-roadmap-root')` would find it still present and never clean up.

React always calls `pushState` (URL change) **before** making DOM changes for the new page. So by the time the first DOM mutation fires after navigation, `window.location.pathname` already reflects the new page. Checking the URL is always reliable.

## Do you need JS?

Yes for a SPA. Pure CSS cannot read the URL, and ReadMe keeps DOM nodes alive across navigation. The minimum viable JS is: apply inline styles, watch for any DOM mutation after leaving the page (URL is already correct by then), clean up.
