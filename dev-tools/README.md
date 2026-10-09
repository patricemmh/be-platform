# Dev tools

Shared UI helpers for static HTML prototypes. Copy this folder into a project, then add this to each page `<head>`:

```html
<link rel="stylesheet" href="dev-tools/dev-tools.css">
<script src="dev-tools/dev-tools.js" defer></script>
```

The script places its icons in the page header (top bar, subhead actions, or the sidebar mark when there is no header). Inspect is on by default only after you turn it on once; that choice is remembered in `localStorage` under `dev-tools-inspect`.

## Inspect

The code icon turns click-to-inspect on. The panel icon shows or hides the floating panel. Click an element to read its computed layout, type, colors, box model, a Tailwind approximation, and a copyable handoff block. Escape closes the panel. The header of the panel is a drag handle. Clicks on the inspect icons are ignored so you can turn the tool off.

Mark any region that must stay clickable with `data-dev-inspect-exclude`. To choose the icon slot yourself, add `data-dev-tools-slot` to that element.

## Add another tool

Load a second script after `dev-tools.js`:

```html
<script src="dev-tools/tools/guides.js" defer></script>
```

```js
DevTools.register({
  id: "guides",
  mount(bar) {
    const button = document.createElement("button");
    button.type = "button";
    button.textContent = "?";
    button.title = "Layout guides";
    bar.append(button);
  },
});
```

`mount` receives the same header cluster as the inspect icons.
