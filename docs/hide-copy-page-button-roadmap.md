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
  function hideCopyPageButton() {
    if (!window.location.pathname.includes('/docs/roadmap')) return;

    document.querySelectorAll('button, [role="button"]').forEach(function (el) {
      if (/copy page/i.test(el.textContent)) {
        // Hide the whole Dropdown wrapper (covers the button + chevron together)
        var wrapper = el.closest('[class*="Dropdown"]') ||
                      el.closest('[data-testid*="dropdown"]') ||
                      el.parentElement ||
                      el;
        wrapper.style.setProperty('display', 'none', 'important');
      }
    });
  }

  hideCopyPageButton();

  new MutationObserver(hideCopyPageButton).observe(document.documentElement, {
    childList: true,
    subtree: true
  });
})();
</script>
```

### Why this works reliably

- **No `childElementCount === 0` guard** — the Copy Page button contains child elements (icon + text span), so the previous leaf-node guard was silently skipping it entirely.
- **Hides the Dropdown wrapper** — the button and its chevron live inside a shared `Dropdown` container; hiding the wrapper removes both in one shot.
- **`document.documentElement` not `document.body`** — `body` can be `null` at script execution time in ReadMe's Footer HTML, causing a `TypeError` that kills the observer.
- **Text matching** — survives ReadMe's hashed class renames which change on every deploy.
- **`MutationObserver`** — fires after every React re-render and SPA route change.
- **URL guard** — only acts on `/docs/roadmap`; every other page is untouched.
