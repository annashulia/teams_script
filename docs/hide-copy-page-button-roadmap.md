# Hide "Copy Page" button on the Roadmap page

## DOM structure (confirmed from DevTools)

```
#content-container
  section.content-body.grid-75   ← main article
  section.content-toc.grid-25    ← Copy Page button lives here
```

## Solution — paste into Admin Settings → Footer HTML

```html
<script>
(function () {
  var SLUG = '/docs/roadmap';
  var CLS  = 'rm-roadmap-full';

  // Inject <style> once and leave it — scoped to body class so it never
  // affects pages that don't have the class. No removal needed.
  if (!document.getElementById('rm-roadmap-styles')) {
    var s = document.createElement('style');
    s.id = 'rm-roadmap-styles';
    s.textContent =
      'body.' + CLS + ' section.content-toc{display:none!important}' +
      'body.' + CLS + ' section.content-body{max-width:100%!important;flex:1 1 100%!important;width:100%!important}';
    (document.head || document.documentElement).appendChild(s);
  }

  function check() {
    if (!document.body) return;
    document.body.classList.toggle(CLS, window.location.pathname.includes(SLUG));
  }

  // Initial load
  check();
  window.addEventListener('pageshow', check);

  // Own patch with separate flag — works alongside search script without conflict
  if (!window._rmRoadmapPatch) {
    window._rmRoadmapPatch = true;
    var fire = function () { window.dispatchEvent(new Event('app:navigate')); };
    ['pushState', 'replaceState'].forEach(function (fn) {
      var orig = history[fn];
      history[fn] = function () { var r = orig.apply(this, arguments); fire(); return r; };
    });
    window.addEventListener('popstate', fire);
  }
  window.addEventListener('app:navigate', check);

  // ReadMe's own jQuery pageLoad as extra safety net
  if (typeof jQuery !== 'undefined') {
    jQuery(window).on('pageLoad', check);
  }
})();
</script>
```

## Why body class instead of removing the `<style>` tag

The previous approach removed the `<style>` tag on navigation. If removal failed for any reason (race condition, event missed), the CSS leaked to every page. The body class approach eliminates this entirely:

- The `<style>` is injected **once and never touched again**
- CSS rules only fire when `<body>` has `rm-roadmap-full` class
- `classList.toggle` is synchronous — no timing gap possible
- Wrong state on one page is self-correcting on the very next navigation
