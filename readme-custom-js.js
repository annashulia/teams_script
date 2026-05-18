/**
 * readme.com Custom JS — Coins.ph API Docs
 *
 * Problem: readme.com's own platform CSS sets dark SearchToggle variables
 * unconditionally (.ThemeContext_line .rm-SearchToggle). For unauthenticated
 * users, React hydration clears the Custom CSS field, so the light-mode
 * override defined there is removed and the search bar appears black.
 *
 * Fix: inject ONLY the searchbar overrides via JS so they survive hydration.
 * Everything else (buttons, cards, sidebar, API methods, inputs …) continues
 * to be handled by the Custom CSS field, which works correctly.
 */
(function () {
  var STYLE_ID = "coins-searchbar-fix";

  var CSS =
    /* box-shadow resets */
    ".rm-SearchToggle{box-shadow:none}" +
    ".rm-SearchToggle:focus,.rm-SearchToggle:active{box-shadow:none}" +

    /* light-mode: override platform's unconditional dark defaults */
    "[data-color-mode=light] .rm-SearchToggle," +
    "[data-color-mode=light] .ThemeContext_line .rm-SearchToggle{" +
      "--SearchToggle-bg:#F5F7FA!important;" +
      "--SearchToggle-color:#8795A8!important" +
    "}" +

    /* header search bar — force light regardless of theme attribute */
    ".rm-Header-search .rm-SearchToggle," +
    ".rm-Header-search .rm-SearchToggle_primary," +
    ".ThemeContext_line .rm-Header-search .rm-SearchToggle," +
    ".ThemeContext_line .rm-Header-search .rm-SearchToggle_primary{" +
      "--SearchToggle-bg:#F5F7FA!important;" +
      "--SearchToggle-color:#8795A8!important;" +
      "background:#F5F7FA!important;" +
      "color:#8795A8!important;" +
      "box-shadow:none!important" +
    "}" +

    /* icon and placeholder text colour */
    ".rm-Header-search .rm-SearchToggle *," +
    ".rm-Header-search .rm-SearchToggle-placeholder," +
    ".ThemeContext_line .rm-Header-search .rm-SearchToggle *," +
    ".ThemeContext_line .rm-Header-search .rm-SearchToggle-placeholder{" +
      "color:#8795A8!important;" +
      "fill:#8795A8!important;" +
      "stroke:#8795A8!important" +
    "}" +

    /* keep light background on hover / focus / active */
    ".rm-Header-search .rm-SearchToggle:hover," +
    ".rm-Header-search .rm-SearchToggle:focus," +
    ".rm-Header-search .rm-SearchToggle:active{" +
      "--SearchToggle-bg:#F5F7FA!important;" +
      "--SearchToggle-color:#8795A8!important;" +
      "background:#F5F7FA!important" +
    "}";

  function inject() {
    var el = document.getElementById(STYLE_ID);
    if (!el) {
      el = document.createElement("style");
      el.id = STYLE_ID;
    }
    el.textContent = CSS;
    document.head.appendChild(el);
  }

  /* 1. Inject immediately. */
  inject();

  /* 2. Re-inject after window load + one animation frame
        (React hydration finishes around this point). */
  window.addEventListener("load", function () {
    requestAnimationFrame(inject);
  });

  /* 3. MutationObserver: if our tag is removed, put it back instantly. */
  var observer = new MutationObserver(function (mutations) {
    for (var i = 0; i < mutations.length; i++) {
      var removed = mutations[i].removedNodes;
      for (var j = 0; j < removed.length; j++) {
        if (removed[j].id === STYLE_ID) {
          inject();
          return;
        }
      }
    }
  });

  if (document.head) {
    observer.observe(document.head, { childList: true });
  } else {
    document.addEventListener("DOMContentLoaded", function () {
      observer.observe(document.head, { childList: true });
    });
  }
})();
