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
    // Exact match — includes() is too loose and can match unrelated URLs
    var path = window.location.pathname.replace(/\/$/, '');
    document.body.classList.toggle(CLS, path === SLUG);
  }

  check();
  window.addEventListener('pageshow', check);

  // Own flag — wraps history and calls check() directly.
  // Does NOT rely on app:navigate from other scripts (search script etc.)
  // which may be broken or missing. check() is idempotent so double-calls are fine.
  if (!window._rmCpCheck) {
    window._rmCpCheck = true;
    ['pushState', 'replaceState'].forEach(function (fn) {
      var orig = history[fn];
      history[fn] = function () {
        var r = orig.apply(this, arguments); // URL updates first
        check();                              // then sync body class
        return r;
      };
    });
    window.addEventListener('popstate', check);
  }

  // Extra safety nets
  window.addEventListener('app:navigate', check);
  if (typeof jQuery !== 'undefined') { jQuery(window).on('pageLoad', check); }
})();
</script>
```

## Why body class instead of removing the `<style>` tag

The previous approach removed the `<style>` tag on navigation. If removal failed for any reason (race condition, event missed), the CSS leaked to every page. The body class approach eliminates this entirely:

- The `<style>` is injected **once and never touched again**
- CSS rules only fire when `<body>` has `rm-roadmap-full` class
- `classList.toggle` is synchronous — no timing gap possible
- Wrong state on one page is self-correcting on the very next navigation
