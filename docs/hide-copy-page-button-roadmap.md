# Hide "Copy Page" button on the Roadmap page

## DOM structure (confirmed from DevTools)

```
#content-container
  section.content-body.grid-75   ← main article (contains the HTMLBlock)
  section.content-toc.grid-25    ← Copy Page button lives here
```

## Solution — add two CSS rules inside the HTML block's existing `<style>` tag

Edit the roadmap page in ReadMe. The `<HTMLBlock>` already has a large `<style>` tag at the top (starting with `#aira-roadmap-root {`). Add these two rules anywhere inside it:

```css
/* Scoped to roadmap page only via :has() — #aira-roadmap-root only exists here */
body:has(#aira-roadmap-root) section.content-toc  { display: none !important; }
body:has(#aira-roadmap-root) section.content-body { max-width: 100% !important; flex: 1 1 100% !important; width: 100% !important; }
```

**Remove any Copy Page script from Admin Settings → Footer HTML** — it is no longer needed.

## Why CSS inside the HTML block, not JavaScript

Every JavaScript approach must fight React's render cycle: inject on arrival, clean up on departure, survive SPA navigations. Any timing gap leaks styles to other pages.

CSS inside the HTML block sidesteps this entirely:

- The `<style>` tag lives **inside the page content** (`article.rm-Article`), not in `<head>`
- When React navigates to a different page it unmounts the roadmap article, removing the `<style>` from the DOM automatically
- Other pages never see these rules — no cleanup, no history patching, no events
- The first CSS attempt failed because it targeted `.rm-CopyPageButton` (wrong selector). `section.content-toc` and `section.content-body` are the confirmed correct selectors from DevTools inspection
