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
    // Only act on the roadmap page
    if (!window.location.pathname.includes('/docs/roadmap')) return;

    // Match by button text so the selector survives ReadMe's hashed class renames
    document.querySelectorAll('button, [role="button"]').forEach(function (el) {
      if (el.textContent.trim().startsWith('Copy Page')) {
        el.style.setProperty('display', 'none', 'important');
      }
    });
  }

  // Run once on initial load
  hideCopyPageButton();

  // Re-run on every DOM mutation (React re-renders + SPA navigation)
  var observer = new MutationObserver(hideCopyPageButton);
  observer.observe(document.body, { childList: true, subtree: true });
})();
</script>
```

### Why this works reliably

- **Text-content matching** — searches for any button whose visible text starts with "Copy Page". This survives ReadMe's hashed class renames (e.g. `CopyPageButton-abc123`) which change on every deploy.
- **`MutationObserver`** — fires after every React re-render and after SPA route changes, so the button never sneaks back in.
- **URL guard** — the observer is global but the hide logic only runs on `/docs/roadmap`, so no other pages are affected.
- **`!important` via `setProperty`** — overrides any inline style ReadMe may apply.
