# Hide "Copy Page" button on the Roadmap page

## The problem

The `/docs/roadmap` page uses a full-width custom HTML block. ReadMe renders a "Copy Page" button in the top-right corner of every guide page. On this page the button wastes horizontal space that the HTML content could otherwise use.

## Solution — add one CSS rule to the page's existing `<style>` block

The roadmap page already contains a large `<style>` tag inside its `<HTMLBlock>`. Appending the rule below hides the Copy Page button **only on this page** — no admin-level custom CSS required, and no risk of affecting other pages.

Open the page in Edit mode in ReadMe, locate the `<style>` tag inside `<HTMLBlock>`, and add this rule anywhere inside it:

```css
/* Hide the Copy Page button on this custom HTML page */
.rm-CopyPageButton {
  display: none !important;
}
```

### Where to put it

The style block starts with `#aira-roadmap-root {` — just append the rule before the closing `}` of the style tag, or at the very end of the `<style>` block:

```html
<style>
  /* ... existing rules ... */

  /* Hide Copy Page button */
  .rm-CopyPageButton {
    display: none !important;
  }
</style>
```

That is all. Save and publish. The button will disappear and the content area will fill the full right-hand column.

## Why this works reliably

- `.rm-CopyPageButton` is a stable ReadMe class (prefixed with `rm-`) — ReadMe's own documentation explicitly says to use `.rm-` selectors since hashed selectors change on every deploy.
- The `<style>` tag is scoped to the page because custom HTML pages only load their own inline styles.
- No JavaScript, no MutationObserver, no admin-level custom JS required.

## Alternative — ReadMe Admin Settings › Custom CSS (if you prefer a global stylesheet approach)

If you would rather manage it centrally, go to **Admin Settings → Appearance → Custom CSS** and add:

```css
/* Hide Copy Page button on the roadmap page only */
body[data-page="roadmap"] .rm-CopyPageButton,
.rm-Guides [data-slug="roadmap"] ~ * .rm-CopyPageButton {
  display: none !important;
}
```

However, the inline approach described above is simpler and guaranteed to be scoped to only this page.
