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

### 2. Footer HTML — replace everything with this

```html
<script>
$(function () {
  function check() {
    $('body').toggleClass('rm-roadmap-active', location.pathname === '/docs/roadmap');
  }

  check();
  $(window).on('pageshow', check);

  // pageLoad fires BEFORE pathname updates — wait for it to settle
  $(window).on('pageLoad', function () { setTimeout(check, 200); });

  // pushState fires with pathname already updated — immediate and accurate
  if (!window._rmPushPatch) {
    window._rmPushPatch = true;
    var orig = history.pushState;
    history.pushState = function () { orig.apply(this, arguments); check(); };
  }
});
</script>
```

Remove any inline script from the HTML block. Remove any `:has()` rules from the `<style>` tag.

## Why pageLoad alone was not enough

`pageLoad` fires **before** `location.pathname` updates to the new page URL. So when navigating away from roadmap, `check()` still sees `/docs/roadmap` and keeps the class on — the CSS stays applied on the new page.

`history.pushState` fires with the URL **already updated**. By patching it and calling `check()` immediately after, the class toggles at the exact right moment before React renders the new page. `pageLoad` with a 200ms delay is kept as a safety net for edge cases.
