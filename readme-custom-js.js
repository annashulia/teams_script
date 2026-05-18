/**
 * readme.com Custom JS — Coins.ph API Docs
 *
 * Problem: readme.com's own platform CSS sets several CSS variables to dark
 * values unconditionally.  For unauthenticated (public) users, React hydration
 * clears the Custom CSS field, so the light-mode overrides defined there are
 * removed and the affected elements render with the platform's dark defaults:
 *
 *   • Search bar   — .ThemeContext_line .rm-SearchToggle  (dark BG)
 *   • Sidebar link — .reference-redesign .rm-Sidebar      (dark active-link BG)
 *   • Cards        — .Card_card                           (dark card BG)
 *   • API methods  — .APIMethod                           (dark badge colours)
 *
 * Fix: inject ONLY the overrides for those four groups via JS so they survive
 * hydration.  Everything else continues to be handled by the Custom CSS field.
 */
(function () {
  var STYLE_ID = "coins-hydration-fix";

  var CSS =
    /* ── Search bar ── */
    ".rm-SearchToggle{box-shadow:none}" +
    ".rm-SearchToggle:focus,.rm-SearchToggle:active{box-shadow:none}" +

    "[data-color-mode=light] .rm-SearchToggle," +
    "[data-color-mode=light] .ThemeContext_line .rm-SearchToggle{" +
      "--SearchToggle-bg:#F5F7FA!important;" +
      "--SearchToggle-color:#8795A8!important" +
    "}" +

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

    ".rm-Header-search .rm-SearchToggle *," +
    ".rm-Header-search .rm-SearchToggle-placeholder," +
    ".ThemeContext_line .rm-Header-search .rm-SearchToggle *," +
    ".ThemeContext_line .rm-Header-search .rm-SearchToggle-placeholder{" +
      "color:#8795A8!important;" +
      "fill:#8795A8!important;" +
      "stroke:#8795A8!important" +
    "}" +

    ".rm-Header-search .rm-SearchToggle:hover," +
    ".rm-Header-search .rm-SearchToggle:focus," +
    ".rm-Header-search .rm-SearchToggle:active{" +
      "--SearchToggle-bg:#F5F7FA!important;" +
      "--SearchToggle-color:#8795A8!important;" +
      "background:#F5F7FA!important" +
    "}" +

    /* ── Sidebar active-link (light mode) ── */
    "[data-color-mode=light] .reference-redesign .rm-Sidebar{" +
      "--Sidebar-link-background:#EDF4FF!important;" +
      "--Sidebar-link-color:#1F7AFF!important" +
    "}" +

    /* ── Cards (light mode) ── */
    "[data-color-mode=light] .Card_card{" +
      "--Card-bg-color:#F7F8FB!important;" +
      "--Card-bg-color-hover:#F3F5F9!important" +
    "}" +

    /* ── API method badges (light-mode defaults) ──
       Specificity is lower than the [data-color-mode=dark] .APIMethod rule in
       Custom CSS, so dark mode overrides still apply correctly. */
    ".APIMethod{" +
      "--APIMethod-post-bg-active:#1F7AFF;" +
      "--APIMethod-post-bg:rgba(200,222,255,0.33);" +
      "--APIMethod-post-fg:#1F7AFF;" +
      "--APIMethod-get-bg:rgba(192,245,204,0.38);" +
      "--APIMethod-get-fg:#00BF30;" +
      "--APIMethod-del-bg:rgba(255,207,204,0.3);" +
      "--APIMethod-del-bg-active:#FF3729;" +
      "--APIMethod-del-fg:#FF3729;" +
      "--APIMethod-put-bg:#F3F2FF;" +
      "--APIMethod-put-bg-active:#6B61FF;" +
      "--APIMethod-put-fg:#6B61FF;" +
      "--APIMethod-patch-bg:rgba(252,241,176,0.45);" +
      "--APIMethod-patch-bg-active:#D6AB00;" +
      "--APIMethod-patch-fg:#D6AB00" +
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
