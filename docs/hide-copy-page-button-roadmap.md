# Hide "Copy Page" button on the Roadmap page

## DOM structure (confirmed from DevTools)

```
#content-container
  section.content-body.grid-75   ← main article
  section.content-toc.grid-25    ← Copy Page button lives here
```

## Solution

### 1. CSS — in the HTML block `<style>` tag

```css
body.rm-roadmap-active section.content-toc  { display: none !important; }
body.rm-roadmap-active section.content-body { max-width: 100% !important; flex: 1 1 100% !important; width: 100% !important; }
```

### 2. Footer HTML — replace everything with just this

```html
<script>
$(function () {
  function check() {
    $('body').toggleClass('rm-roadmap-active', location.pathname === '/docs/roadmap');
  }
  check();
  $(window).on('pageLoad pageshow', check);
});
</script>
```

Remove any inline script from the HTML block. Remove any `:has()` rules from the `<style>` tag.

## Why this works

- `pageLoad` is ReadMe's own official SPA navigation event — fires on every page change
- `pageshow` covers hard refresh and bfcache restores
- jQuery is already loaded by ReadMe — no extra dependency
- `toggleClass` is atomic — class is either on or off, no timing window
- No history patching, no MutationObserver, no custom events

## Why `:has(#aira-roadmap-root)` was applying globally

React keeps `#aira-roadmap-root` alive in the DOM after navigating away (cached for fast back navigation). So `:has(#aira-roadmap-root)` matches on every page after the first roadmap visit. The body class approach avoids this entirely since `document.body` is always the same element and we toggle the class directly.
