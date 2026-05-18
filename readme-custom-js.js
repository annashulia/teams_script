/**
 * readme.com Custom JS — Coins.ph API Docs
 *
 * Problem: readme.com's React hydration clears the Custom CSS stylesheet for
 * unauthenticated (public) users.  The dark-mode SearchToggle variables defined
 * in Custom CSS are removed before they can be overridden, so the search bar
 * renders black in light mode.
 *
 * Fix: inject all custom styles as a <style> tag via JS, which survives
 * hydration.  The injection runs:
 *   1. Immediately (catches pre-hydration render).
 *   2. On window "load" + a short rAF delay (catches post-hydration render).
 *   3. Via a MutationObserver watching <head> — if our tag is ever removed it
 *      is instantly re-appended (covers any future React re-renders).
 */
(function () {
  var STYLE_ID = "coins-custom-styles";

  var CSS = [
    /* ── Focus / active box-shadow resets ── */
    ".rm-SearchToggle{box-shadow:none}",
    ".rm-SearchToggle:focus,.rm-SearchToggle:active{box-shadow:none}",
    ".Input:not(:disabled):active,.Input:not(:disabled):focus,.Input:not(:disabled):focus-visible{box-shadow:none!important}",
    ".Button:focus,.Button:not(:disabled):focus-visible,.Button:active{box-shadow:none!important}",
    ".rm-ReferenceMain a:active,.rm-ReferenceMain a:focus{box-shadow:none}",
    ".QuickNav-button2KzlQbz5Pm2Y:active,.QuickNav-button2KzlQbz5Pm2Y:focus{box-shadow:none;border-color:transparent}",
    ".APIMethod_modern{border-radius:3px}",

    /* ── Light mode ── */
    "[data-color-mode=light] .rm-SearchToggle{--SearchToggle-bg:#F5F7FA;--SearchToggle-color:#8795A8}",
    "[data-color-mode=light] .reference-redesign .rm-Sidebar{--Sidebar-link-background:#EDF4FF;--Sidebar-link-color:#1F7AFF}",
    "[data-color-mode=light] .container .Button_primary,[data-color-mode=light] .Flex .Button_primary{background:#17191D;color:#fff;border-width:0}",
    "[data-color-mode=light] .container .Button_primary:not(:disabled):hover,[data-color-mode=light] .Flex .Button_primary:not(:disabled):hover{background:#131B26}",
    "[data-color-mode=light] .container .Button_primary:not(:disabled):active,[data-color-mode=light] .container .Button_primary:not(:disabled):focus,[data-color-mode=light] .container .Button_primary:not(:disabled):focus-visible,[data-color-mode=light] .Flex .Button_primary:not(:disabled):active,[data-color-mode=light] .Flex .Button_primary:not(:disabled):focus,[data-color-mode=light] .Flex .Button_primary:not(:disabled):focus-visible{background:#5B6572}",
    "[data-color-mode=light] .container .Button_primary:disabled,[data-color-mode=light] .Flex .Button_primary:disabled{background:#E7E9EE;color:#B8C1CD}",
    "[data-color-mode=light] .container .Button_secondary_outline,[data-color-mode=light] .Flex .Button_secondary_outline{background:#fff;color:#17191D;border-color:#17191D}",
    "[data-color-mode=light] .container .Button_secondary_outline:not(:disabled):hover,[data-color-mode=light] .Flex .Button_secondary_outline:not(:disabled):hover{background:#F7F8FB;border-color:#17191D;color:#17191D}",
    "[data-color-mode=light] .container .Button_secondary_outline:not(:disabled):active,[data-color-mode=light] .container .Button_secondary_outline:not(:disabled):focus-visible,[data-color-mode=light] .Flex .Button_secondary_outline:not(:disabled):active,[data-color-mode=light] .Flex .Button_secondary_outline:not(:disabled):focus-visible{background:#E7E9EE;border-color:#17191D}",
    "[data-color-mode=light] .Card_card{--Card-bg-color:#F7F8FB;--Card-bg-color-hover:#F3F5F9}",
    "[data-color-mode=light] .ThemeContext_line .rm-LandingPageHeader{--LandingPageHeader-button-primary-background:#17191D;--LandingPageHeader-button-primary-color:#fff;--LandingPageHeader-button-secondary-color:#17191D;--LandingPageHeader-button-primary-background-hover:#131B26;--LandingPageHeader-button-secondary-border-hover:#17191D;--LandingPageHeader-button-primary-background-focus:#5B6572;--LandingPageHeader-button-primary-background-25:rgba(91,101,114,0.25);--LandingPageHeader-button-secondary-border-focus:#17191D;--LandingPageHeader-button-secondary-shadow-hover:rgba(23,25,29,0.28)}",
    "[data-color-mode=light] .ThemeContext_line .rm-LandingPageHeader .LandingPageHeader-button_secondary3s2XpkqwCz8B{border-color:#17191D;background:#fff}",
    "[data-color-mode=light] .ThemeContext_line .rm-LandingPageHeader .LandingPageHeader-button_secondary3s2XpkqwCz8B:hover{background:#F7F8FB}",
    "[data-color-mode=light] .ThemeContext_line .rm-LandingPageHeader .LandingPageHeader-button_secondary3s2XpkqwCz8B:active,[data-color-mode=light] .ThemeContext_line .rm-LandingPageHeader .LandingPageHeader-button_secondary3s2XpkqwCz8B:focus{background:#E7E9EE}",
    "[data-color-mode=light] .ThemeContext_line .rm-LandingPageHeader .LandingPageHeader-button_secondary3s2XpkqwCz8B:disabled{background:#fff;color:#B8C1CD;border-color:#B8C1CD}",

    /* ── Root / global tokens (light defaults) ── */
    ":root{--color-border-default:#F5F7FA;--color-input-background:#F5F7FA;--color-input-text:#17191D;--color-input-border:transparent;--color-input-border-hover:#F3F5F9;--color-input-border-active:#131B26;--color-input-border-focus:#131B26;--color-input-background-disabled:#E7E9EE;--color-input-text-disabled:#B8C1CD;--color-input-placeholder:#B8C1CD;--Input-border-active:#131B26;--Input-border-focus:#131B26;--Input-border-hover:#131B26;--border-width:1px;--border-radius:8px;--green30:#00BF30;--blue:#4D8EFF}",

    /* ── APIMethod light tokens ── */
    ".APIMethod{--APIMethod-post-bg-active:#1F7AFF;--APIMethod-post-bg:rgba(200,222,255,0.33);--APIMethod-post-fg:#1F7AFF;--APIMethod-get-bg:rgba(192,245,204,0.38);--APIMethod-get-fg:#00BF30;--APIMethod-del-bg:rgba(255,207,204,0.3);--APIMethod-del-bg-active:#FF3729;--APIMethod-del-fg:#FF3729;--APIMethod-put-bg:#F3F2FF;--APIMethod-put-bg-active:#6B61FF;--APIMethod-put-fg:#6B61FF;--APIMethod-patch-bg:rgba(252,241,176,0.45);--APIMethod-patch-bg-active:#D6AB00;--APIMethod-patch-fg:#D6AB00}",

    /* ── Dark mode ── */
    "[data-color-mode=dark]{--color-bg-page-layer:#1B1B1C;--color-input-background:#1B1B1C;--color-input-background-disabled:#2A2A2E;--color-input-border:rgba(255,255,255,0.1);--color-input-text:#fff;--color-input-text-disabled:#4F4F57;--color-input-placeholder:#4F4F57;--color-code-dark-bg:#1B1B1C;--Input-border-hover:#FAFAFA;--Input-border-active:#FAFAFA;--Input-border-focus:#FAFAFA;--color-border-default:#1B1B1C;--green30:#00C227;--color-text-muted:#FAFAFA}",
    "[data-color-mode=dark] .APIMethod{--APIMethod-post-bg-active:#4D8EFF;--APIMethod-post-bg:rgba(30,50,85,0.5);--APIMethod-post-fg:#4D8EFF;--APIMethod-get-bg:rgba(30,50,85,0.5);--APIMethod-get-fg:#00C227;--APIMethod-del-bg:rgba(83,31,28,0.45);--APIMethod-del-bg-active:#FF4824;--APIMethod-del-fg:#FF4824;--APIMethod-put-bg:#1B192E;--APIMethod-put-bg-active:#6B61FF;--APIMethod-put-fg:#6B61FF;--APIMethod-patch-bg:rgba(70,57,7,0.42);--APIMethod-patch-bg-active:#D6AB00;--APIMethod-patch-fg:#D6AB00}",
    "[data-color-mode=dark] .ThemeContext_line .rm-SearchToggle{--SearchToggle-bg:#1B1B1C;--SearchToggle-color:#4F4F57}",
    "[data-color-mode=dark] .reference-redesign .rm-Sidebar{--Sidebar-link-background:#131C2B;--Sidebar-link-color:#1F7AFF}",
    "[data-color-mode=dark] .Input{border-width:0}",
    "[data-color-mode=dark] .Input:disabled{border-width:0}",
    "[data-color-mode=dark] .Input:not(:disabled):hover{background-color:#19191A}",
    "[data-color-mode=dark] .Input:not(:disabled):active,[data-color-mode=dark] .Input:not(:disabled):focus{border-width:1px;border-color:#FAFAFA;box-shadow:none}",
    "[data-color-mode=dark] .Card_card{--Card-bg-color:#151515;--Card-bg-color-hover:#19191A}",
    "[data-color-mode=dark] .ThemeContext_line .rm-LandingPageHeader{--LandingPageHeader-button-primary-background:#FAFAFA;--LandingPageHeader-button-primary-color:#121212;--LandingPageHeader-button-secondary-color:#FAFAFA;--LandingPageHeader-button-primary-background-hover:#E3E3E3;--LandingPageHeader-button-secondary-border-hover:#FAFAFA;--LandingPageHeader-button-primary-background-focus:#B6B6BD;--LandingPageHeader-button-secondary-color-focus:#FAFAFA;--LandingPageHeader-button-primary-background-25:rgba(91,101,114,0.25);--LandingPageHeader-button-secondary-shadow-hover:rgba(250,250,250,0.28)}",
    "[data-color-mode=dark] .ThemeContext_line .rm-LandingPageHeader .LandingPageHeader-button_secondary3s2XpkqwCz8B{border-color:#FAFAFA;background:transparent}",
    "[data-color-mode=dark] .ThemeContext_line .rm-LandingPageHeader .LandingPageHeader-button_secondary3s2XpkqwCz8B:not(:disabled):hover{background:#151515}",
    "[data-color-mode=dark] .ThemeContext_line .rm-LandingPageHeader .LandingPageHeader-button_secondary3s2XpkqwCz8B:not(:disabled):active,[data-color-mode=dark] .ThemeContext_line .rm-LandingPageHeader .LandingPageHeader-button_secondary3s2XpkqwCz8B:not(:disabled):focus{background:#2A2A2E}",
    "[data-color-mode=dark] .ThemeContext_line .rm-LandingPageHeader .LandingPageHeader-button_secondary3s2XpkqwCz8B:disabled{background:transparent;color:#4F4F57;border-color:#4F4F57}",
    "[data-color-mode=dark] .Flex .Button_primary{background:#FAFAFA;color:#121212}",
    "[data-color-mode=dark] .Flex .Button_primary:not(:disabled):hover{background:#E3E3E3}",
    "[data-color-mode=dark] .Flex .Button_primary:not(:disabled):active,[data-color-mode=dark] .Flex .Button_primary:not(:disabled):focus,[data-color-mode=dark] .Flex .Button_primary:not(:disabled):focus-visible{background:#B6B6BD}",
    "[data-color-mode=dark] .Flex .Button_primary:disabled{background:#2A2A2E;color:#4F4F57}",
    "[data-color-mode=dark] .Flex .Button_secondary_outline{background:transparent;border-color:#FAFAFA;color:#FAFAFA}",
    "[data-color-mode=dark] .Flex .Button_secondary_outline:not(:disabled):hover{background:#151515;color:#FAFAFA;border-color:#FAFAFA}",
    "[data-color-mode=dark] .Flex .Button_secondary_outline:not(:disabled):active,[data-color-mode=dark] .Flex .Button_secondary_outline:not(:disabled):focus,[data-color-mode=dark] .Flex .Button_secondary_outline:not(:disabled):focus-visible{background:#2A2A2E}",
    "[data-color-mode=dark] .Flex .Button_secondary_outline:disabled{background:transparent;color:#4F4F57;border-color:#4F4F57}",

    /* ── Force light-mode search bar (survives hydration) ── */
    ".rm-Header-search .rm-SearchToggle,.rm-Header-search .rm-SearchToggle_primary,.ThemeContext_line .rm-Header-search .rm-SearchToggle,.ThemeContext_line .rm-Header-search .rm-SearchToggle_primary{--SearchToggle-bg:#F5F7FA!important;--SearchToggle-color:#8795A8!important;background:#F5F7FA!important;color:#8795A8!important;box-shadow:none!important}",
    ".rm-Header-search .rm-SearchToggle *,.rm-Header-search .rm-SearchToggle-placeholder,.ThemeContext_line .rm-Header-search .rm-SearchToggle *,.ThemeContext_line .rm-Header-search .rm-SearchToggle-placeholder{color:#8795A8!important;fill:#8795A8!important;stroke:#8795A8!important}",
    ".rm-Header-search .rm-SearchToggle:hover,.rm-Header-search .rm-SearchToggle:focus,.rm-Header-search .rm-SearchToggle:active{--SearchToggle-bg:#F5F7FA!important;--SearchToggle-color:#8795A8!important;background:#F5F7FA!important}",
  ].join("\n");

  /* ── helpers ── */

  function inject() {
    var el = document.getElementById(STYLE_ID);
    if (!el) {
      el = document.createElement("style");
      el.id = STYLE_ID;
    }
    el.textContent = CSS;
    // Always place it last in <head> so it wins over platform defaults.
    document.head.appendChild(el);
  }

  /* 1. Inject right away (runs before/during hydration). */
  inject();

  /* 2. Re-inject after full page load + one animation frame
        (React hydration finishes around window "load"). */
  window.addEventListener("load", function () {
    requestAnimationFrame(inject);
  });

  /* 3. Watch <head> for our tag being removed and put it straight back.
        This is the main guard against hydration-triggered stylesheet clearing. */
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

  /* Start observing as soon as <head> exists. */
  function startObserver() {
    if (document.head) {
      observer.observe(document.head, { childList: true });
    } else {
      document.addEventListener("DOMContentLoaded", function () {
        observer.observe(document.head, { childList: true });
      });
    }
  }

  startObserver();
})();
