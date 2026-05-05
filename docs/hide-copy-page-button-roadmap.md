# Hide "Copy Page" button on the Roadmap page

## The problem

The `/docs/roadmap` page uses a full-width custom HTML block. ReadMe renders a "Copy Page" button in the top-right corner of every guide page. On this page the button wastes horizontal space that the HTML content could otherwise use.

## Solution — JavaScript snippet in Admin Settings → Footer HTML

ReadMe is a React SPA, so the "Copy Page" button is injected into the DOM after the initial page load and also on every client-side navigation. A `MutationObserver` is the right tool: it watches the DOM continuously and removes the button whenever it appears, on any page transition.

### Where to add it

Go to **Admin Settings → Custom CSS, JS, HTML → Footer HTML** and paste the snippet below.  
*(Footer HTML is injected just before `</body>` on every page — the observer only acts when the URL matches `/docs/roadmap`.)*

### The snippet

```html
<script>
(function () {
  function fixRoadmapLayout() {
    if (!window.location.pathname.includes('/docs/roadmap')) return;

    // Hide the Copy Page dropdown — walk up the tree to the column-level container
    // (the direct child of the flex content-container that holds ONLY the Copy Page)
    document.querySelectorAll('button, [role="button"]').forEach(function (el) {
      if (!/copy page/i.test(el.textContent)) return;

      var node = el;
      while (node.parentElement) {
        var p = node.parentElement;
        if (
          p.classList.contains('content-container') ||
          p.classList.contains('rm-Article') ||
          p === document.body
        ) {
          // node is the right-column wrapper — hide it
          if (!node.dataset.rmHidden) {
            node.dataset.rmHidden = '1';
            node.style.setProperty('display', 'none', 'important');
          }
          break;
        }
        node = p;
      }
    });

    // Expand the main article to fill the vacated space
    ['.rm-Article', 'section[class*="content-toc"]', '.content-body'].forEach(function (sel) {
      var el = document.querySelector(sel);
      if (el && !el.dataset.rmExpanded) {
        el.dataset.rmExpanded = '1';
        el.style.setProperty('max-width', '100%', 'important');
        el.style.setProperty('width', '100%', 'important');
        el.style.setProperty('flex', '1 1 100%', 'important');
      }
    });
  }

  fixRoadmapLayout();

  new MutationObserver(fixRoadmapLayout).observe(document.documentElement, {
    childList: true,
    subtree: true
  });
})();
</script>
```

### Why this works

- **Walks up to the column container** — instead of hiding just the `<button>` or the `Dropdown` div, it walks up the DOM tree until it finds the direct child of `.content-container` (the right column), and hides that whole node. This removes all the space the column occupied.
- **Expands the article** — sets `max-width: 100%`, `width: 100%`, and `flex: 1 1 100%` on `.rm-Article`, `section[class*="content-toc"]`, and `.content-body` so the main content stretches into the vacated space.
- **`data-rm-hidden` / `data-rm-expanded` guards** — marks elements once processed so repeated MutationObserver calls don't cause an infinite style-mutation loop.
- **`document.documentElement` not `document.body`** — `body` can be `null` at Footer HTML execution time.
- **URL guard** — only runs on `/docs/roadmap`.
