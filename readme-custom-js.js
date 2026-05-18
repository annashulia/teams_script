<!--
  Coins.ph API Docs — JS safety net (optional)
  Paste into: HTML tab → "End of Body Tag" field

  This is only needed if the <style> tag in the <head> field ever fails
  to render (e.g. platform caching or a future readme.com change).
  If the head <style> is working correctly, this file is not required.
-->
<script>
(function () {
  var STYLE_ID = "coins-hydration-fix";

  /* Re-use the same CSS that is already in the <head> <style> tag.
     This only takes effect if that tag is missing (safety net). */
  var CSS =
    ".rm-SearchToggle{box-shadow:none}" +
    ".rm-SearchToggle:focus,.rm-SearchToggle:active{box-shadow:none}" +
    "[data-color-mode=light] .rm-SearchToggle," +
    "[data-color-mode=light] .ThemeContext_line .rm-SearchToggle{--SearchToggle-bg:#F5F7FA!important;--SearchToggle-color:#8795A8!important}" +
    ".rm-Header-search .rm-SearchToggle,.rm-Header-search .rm-SearchToggle_primary," +
    ".ThemeContext_line .rm-Header-search .rm-SearchToggle," +
    ".ThemeContext_line .rm-Header-search .rm-SearchToggle_primary{--SearchToggle-bg:#F5F7FA!important;--SearchToggle-color:#8795A8!important;background:#F5F7FA!important;color:#8795A8!important;box-shadow:none!important}" +
    ".rm-Header-search .rm-SearchToggle *,.rm-Header-search .rm-SearchToggle-placeholder," +
    ".ThemeContext_line .rm-Header-search .rm-SearchToggle *," +
    ".ThemeContext_line .rm-Header-search .rm-SearchToggle-placeholder{color:#8795A8!important;fill:#8795A8!important;stroke:#8795A8!important}" +
    ".rm-Header-search .rm-SearchToggle:hover,.rm-Header-search .rm-SearchToggle:focus,.rm-Header-search .rm-SearchToggle:active{--SearchToggle-bg:#F5F7FA!important;--SearchToggle-color:#8795A8!important;background:#F5F7FA!important}" +
    "[data-color-mode=light] .reference-redesign .rm-Sidebar{--Sidebar-link-background:#EDF4FF!important;--Sidebar-link-color:#1F7AFF!important}" +
    "[data-color-mode=light] .Card_card{--Card-bg-color:#F7F8FB!important;--Card-bg-color-hover:#F3F5F9!important}" +
    ".APIMethod{--APIMethod-post-bg-active:#1F7AFF;--APIMethod-post-bg:rgba(200,222,255,0.33);--APIMethod-post-fg:#1F7AFF;--APIMethod-get-bg:rgba(192,245,204,0.38);--APIMethod-get-fg:#00BF30;--APIMethod-del-bg:rgba(255,207,204,0.3);--APIMethod-del-bg-active:#FF3729;--APIMethod-del-fg:#FF3729;--APIMethod-put-bg:#F3F2FF;--APIMethod-put-bg-active:#6B61FF;--APIMethod-put-fg:#6B61FF;--APIMethod-patch-bg:rgba(252,241,176,0.45);--APIMethod-patch-bg-active:#D6AB00;--APIMethod-patch-fg:#D6AB00}";

  function injectIfMissing() {
    if (document.getElementById(STYLE_ID)) return; /* head <style> present, nothing to do */
    var el = document.createElement("style");
    el.id = STYLE_ID;
    el.textContent = CSS;
    document.head.appendChild(el);
  }

  injectIfMissing();
  window.addEventListener("load", injectIfMissing);
})();
</script>
