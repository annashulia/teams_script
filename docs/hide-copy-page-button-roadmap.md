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

    // Cast a wide net: ReadMe may render this as a button, div, or span
    document.querySelectorAll('button, [role="button"], div, span, a').forEach(function (el) {
      if (el.childElementCount === 0 && /^Copy Page/i.test(el.textContent.trim())) {
        el.style.setProperty('display', 'none', 'important');
      }
    });
  }

  hideCopyPageButton();

  // IMPORTANT: use documentElement, not body — body may be null in ReadMe's
  // Footer HTML execution context, causing a TypeError that breaks the observer.
  new MutationObserver(hideCopyPageButton).observe(document.documentElement, {
    childList: true,
    subtree: true
  });
})();
</script>
```

### Why this works reliably

- **`document.documentElement` not `document.body`** — `body` can be `null` when ReadMe's Footer HTML script runs, which throws `TypeError: parameter 1 is not of type 'Node'` and silently kills the observer. `documentElement` (`<html>`) is always a valid Node.
- **`childElementCount === 0` guard** — limits matches to leaf nodes so we don't accidentally hide a large wrapper that merely contains the words "Copy Page" somewhere inside it.
- **Text matching** — survives ReadMe's hashed class renames (e.g. `CopyPageButton-x7f2a`) which change on every deploy.
- **`MutationObserver`** — fires after every React re-render and SPA route change.
- **URL guard** — only acts on `/docs/roadmap`; every other page is untouched.
