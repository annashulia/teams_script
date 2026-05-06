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
(function ($) {
  // List every slug that should have Copy Page hidden + full-width content
  var HIDDEN_SLUGS = [
    '/docs/roadmap',
    '/docs/agent-automatic-backups-archive'
  ];

  function shouldFix() {
    return HIDDEN_SLUGS.some(function (slug) {
      return window.location.pathname.includes(slug);
    });
  }

  function fixLayout() {
    if (!shouldFix()) return;

    var container = document.getElementById('content-container');
    if (!container) return;

    document.querySelectorAll('button, [role="button"]').forEach(function (el) {
      if (!/copy page/i.test(el.textContent)) return;

      var col = el;
      while (col.parentElement && col.parentElement !== container) {
        col = col.parentElement;
      }
      if (col.parentElement !== container) return;

      // Skip the article/main-content column — it contains an <article> or .rm-Article
      if (col.querySelector('article, .rm-Article, iframe')) return;

      col.style.setProperty('display', 'none', 'important');

      [].forEach.call(container.children, function (sib) {
        if (sib !== col) {
          sib.style.setProperty('max-width', '100%', 'important');
          sib.style.setProperty('flex', '1 1 100%', 'important');
          sib.style.setProperty('width', '100%', 'important');
        }
      });
    });
  }

  // 1. Direct page visits (pageLoad does NOT fire on initial load)
  $(document).ready(function () { setTimeout(fixLayout, 800); });

  // 2. SPA navigations (clicking links within ReadMe)
  $(window).on('pageLoad', function () { setTimeout(fixLayout, 800); });

}(jQuery));
</script>
```

### What was wrong before and what this fixes

The previous "walk up" loop kept going even when it couldn't find a matching class name, eventually reaching a top-level page wrapper and hiding that (taking the whole page with it). The fix:

1. **`getElementById('content-container')` as anchor** — stops the walk exactly at the grid container; if that ID is missing the function exits cleanly instead of destructively.
2. **Hard bail if we overshoot** — `if (col.parentElement !== container) return` means if the walk-up ever passes `#content-container`, nothing gets hidden.
3. **Content safety check** — `col.querySelector('#aira-roadmap-root, iframe, article')` identifies the article column (which contains your custom HTML root) and skips it, so only the Copy Page column is hidden.
4. **Expand siblings** — once the right column is gone, all other direct children of `#content-container` are set to `100%` width so the content fills the space.
