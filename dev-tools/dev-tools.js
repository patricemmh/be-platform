/**
 * Shared developer tools for static HTML prototypes.
 *
 * Drop dev-tools.css and dev-tools.js into a project and add them in <head>:
 *   <link rel="stylesheet" href="dev-tools/dev-tools.css">
 *   <script src="dev-tools/dev-tools.js" defer></script>
 *
 * The script finds a header and inserts its icons there.
 * Add another tool from a later script:
 *   DevTools.register({
 *     id: "guides",
 *     mount(bar) { bar.append(yourButton); }
 *   });
 */
(function () {
  const tools = [];
  let bar = null;
  let booted = false;

  function register(tool) {
    tools.push(tool);
    if (booted && bar) tool.mount(bar);
  }

  const ICON = {
    code: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m18 16 4-4-4-4"/><path d="m6 8-4 4 4 4"/><path d="m14.5 4-5 16"/></svg>',
    panel: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect width="18" height="18" x="3" y="3" rx="2"/><path d="M15 3v18"/><path d="m10 15-3-3 3-3"/></svg>',
    grip: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="9" r="1"/><circle cx="19" cy="9" r="1"/><circle cx="5" cy="9" r="1"/><circle cx="12" cy="15" r="1"/><circle cx="19" cy="15" r="1"/><circle cx="5" cy="15" r="1"/></svg>',
    x: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>',
    copy: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect width="14" height="14" x="8" y="8" rx="2"/><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/></svg>',
    check: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20 6 9 17l-5-5"/></svg>',
  };

  function isShown(el) {
    if (!el || !el.isConnected) return false;
    let node = el;
    while (node && node !== document.documentElement) {
      const cs = getComputedStyle(node);
      if (cs.display === "none" || cs.visibility === "hidden") return false;
      node = node.parentElement;
    }
    const rect = el.getBoundingClientRect();
    return rect.width > 0 && rect.height > 0;
  }

  function firstShown(selector) {
    return [...document.querySelectorAll(selector)].find(isShown) || null;
  }

  function findHost() {
    const explicit = firstShown("[data-dev-tools-slot]");
    if (explicit) return { mode: "append", el: explicit };

    const topRight = firstShown(".topbar .top-right, header .top-right");
    if (topRight) {
      const header = topRight.closest("header") || topRight.parentElement;
      const brand = header && header.querySelector(".brand, .logo-link");
      if (brand && isShown(brand)) return { mode: "after-brand", el: brand };
      return { mode: "prepend", el: topRight };
    }

    const topTools = firstShown(".topbar .top-tools, header .top-tools");
    if (topTools) return { mode: "prepend", el: topTools };

    const toolsEl = firstShown("header.topbar .tools, .topbar .tools");
    if (toolsEl) return { mode: "append", el: toolsEl };

    const actions = firstShown(".subhead-actions");
    if (actions) return { mode: "prepend", el: actions };

    const topbar = firstShown("header.topbar");
    if (topbar) return { mode: "cluster-end", el: topbar };

    const chatTop = firstShown(".chat-top");
    if (chatTop) return { mode: "before-end", el: chatTop };

    const headActions = firstShown(".head-actions");
    if (headActions) return { mode: "prepend", el: headActions };

    const side = firstShown("aside.side");
    if (side) return { mode: "after-mark", el: side };

    return { mode: "fixed", el: document.body };
  }

  function placeBar(node) {
    const host = findHost();
    if (host.mode === "prepend") {
      host.el.prepend(node);
      return;
    }
    if (host.mode === "append") {
      host.el.append(node);
      return;
    }
    if (host.mode === "after-brand") {
      node.classList.add("dt-toggle-after-brand");
      host.el.insertAdjacentElement("afterend", node);
      return;
    }
    if (host.mode === "before-end") {
      node.classList.add("dt-toggle-push");
      const last = host.el.lastElementChild;
      if (last) last.before(node);
      else host.el.append(node);
      return;
    }
    if (host.mode === "cluster-end") {
      const cluster = document.createElement("div");
      cluster.className = "dt-cluster";
      cluster.setAttribute("data-dev-inspect-exclude", "");
      [...host.el.children].slice(1).forEach((child) => cluster.appendChild(child));
      cluster.appendChild(node);
      host.el.appendChild(cluster);
      return;
    }
    if (host.mode === "after-mark") {
      const row = document.createElement("div");
      row.className = "dt-side-row";
      row.setAttribute("data-dev-inspect-exclude", "");
      row.appendChild(node);
      const mark = host.el.querySelector(".mark");
      if (mark) mark.insertAdjacentElement("afterend", row);
      else host.el.prepend(row);
      return;
    }
    node.classList.add("dt-toggle-fixed");
    document.body.appendChild(node);
  }

  function createInspectTool() {
    const STORAGE_KEY = "dev-tools-inspect";
    const MARGIN = 10;
    const HEX_TO_COLOR_TOKEN = {
      fcfdef: "brand-white",
      f9f8f7: "brand-grey-100",
      f4f2ef: "brand-grey-200",
      e4e3df: "brand-grey-300",
      d0cec9: "brand-grey-400",
      a6a4a0: "brand-grey-500",
      "76746f": "brand-grey-600",
      "44423d": "brand-grey-700",
      "2e2c2a": "brand-black",
      ffc531: "brand-yellow",
      ffedad: "brand-yellow-light",
      f95a25: "brand-red",
      db3700: "brand-red-dark",
    };

    let enabled = false;
    let drawerOpen = false;
    let selected = null;
    let spec = null;
    let position = null;
    let copiedTimer = 0;
    let drag = null;

    let toggleBtn = null;
    let panelBtn = null;
    let box = null;
    let badge = null;
    let panel = null;

    try {
      enabled = window.localStorage.getItem(STORAGE_KEY) === "1";
      drawerOpen = enabled;
    } catch {
      enabled = false;
    }

    function px(value) {
      const n = parseFloat(value);
      return Number.isFinite(n) ? n : 0;
    }

    function esc(value) {
      return String(value).replace(/[&<>"']/g, (ch) => ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;",
      }[ch]));
    }

    function parseColorToHex(cssColor) {
      const t = cssColor.trim().toLowerCase();
      if (t === "transparent" || t === "rgba(0, 0, 0, 0)" || t === "rgb(0 0 0 / 0)") return null;
      if (t.startsWith("#")) {
        const h = t.slice(1);
        if (h.length === 3) return h.split("").map((c) => c + c).join("");
        if (h.length === 6 || h.length === 8) return h.slice(0, 6);
        return null;
      }
      const m = t.match(/rgba?\(\s*(\d+)[\s,]+(\d+)[\s,]+(\d+)/);
      if (!m) return null;
      const to = (n) => Number(n).toString(16).padStart(2, "0");
      return `${to(m[1])}${to(m[2])}${to(m[3])}`;
    }

    function describeComputedColor(cssColor) {
      const hex = parseColorToHex(cssColor);
      return {
        raw: cssColor.trim(),
        hex: hex ? `#${hex}` : null,
        brandToken: hex ? HEX_TO_COLOR_TOKEN[hex] || null : null,
      };
    }

    function colorUtility(prefix, cssColor) {
      const hex = parseColorToHex(cssColor);
      if (!hex) return null;
      const token = HEX_TO_COLOR_TOKEN[hex];
      return token ? `${prefix}-${token}` : `${prefix}-[#${hex}]`;
    }

    function spacingUtility(prefix, top, right, bottom, left) {
      const pt = px(top);
      const pr = px(right);
      const pb = px(bottom);
      const pl = px(left);
      if (!pt && !pr && !pb && !pl) return [];
      if (pt === pr && pr === pb && pb === pl) return [`${prefix}-[${pt}px]`];
      if (pt === pb && pl === pr) return [`${prefix}x-[${pl}px]`, `${prefix}y-[${pt}px]`];
      return [
        pt ? `${prefix}t-[${pt}px]` : "",
        pr ? `${prefix}r-[${pr}px]` : "",
        pb ? `${prefix}b-[${pb}px]` : "",
        pl ? `${prefix}l-[${pl}px]` : "",
      ].filter(Boolean);
    }

    function fontSizeUtility(fontSize) {
      const size = px(fontSize);
      const map = [[12, "text-xs"], [14, "text-sm"], [16, "text-base"], [18, "text-lg"], [20, "text-xl"], [24, "text-2xl"], [30, "text-3xl"], [36, "text-4xl"]];
      for (const [n, utility] of map) {
        if (Math.abs(size - n) < 0.5) return utility;
      }
      return `text-[${size}px]`;
    }

    function fontWeightUtility(weight) {
      const n = parseInt(weight, 10);
      if (weight === "normal" || n === 400) return "font-normal";
      if (n === 500) return "font-medium";
      if (n === 600) return "font-semibold";
      if (n === 700) return "font-bold";
      if (n === 800) return "font-extrabold";
      return `font-[${weight}]`;
    }

    function radiusUtility(radius) {
      const n = px(radius);
      if (n === 0) return "rounded-none";
      if (Math.abs(n - 4) < 0.6) return "rounded";
      if (Math.abs(n - 6) < 0.6) return "rounded-md";
      if (Math.abs(n - 8) < 0.6) return "rounded-lg";
      if (Math.abs(n - 12) < 0.6) return "rounded-xl";
      if (Math.abs(n - 16) < 0.6) return "rounded-2xl";
      if (Math.abs(n - 9999) < 2 || String(radius).includes("%")) return "rounded-full";
      return `rounded-[${radius}]`;
    }

    function displayUtility(display) {
      return {
        flex: "flex",
        "inline-flex": "inline-flex",
        block: "block",
        "inline-block": "inline-block",
        grid: "grid",
        "inline-grid": "inline-grid",
        none: "hidden",
        inline: "inline",
      }[display] || "";
    }

    function specToTailwind(current) {
      const parts = [];
      const display = displayUtility(current.display);
      if (display) parts.push(display);
      const gap = px(current.gap);
      if (gap > 0) parts.push(`gap-[${gap}px]`);
      parts.push(...spacingUtility("p", current.paddingTop, current.paddingRight, current.paddingBottom, current.paddingLeft));
      parts.push(...spacingUtility("m", current.marginTop, current.marginRight, current.marginBottom, current.marginLeft));
      const weight = fontWeightUtility(current.fontWeight);
      if (weight !== "font-normal") parts.push(weight);
      parts.push(fontSizeUtility(current.fontSize));
      if (current.lineHeight !== "normal" && current.lineHeight !== "0") parts.push(`leading-[${current.lineHeight}]`);
      if (current.letterSpacing && current.letterSpacing !== "normal") parts.push(`tracking-[${current.letterSpacing}]`);
      if (current.fontFamily.toLowerCase().includes("urbanist")) parts.push("font-sans");
      const text = colorUtility("text", current.color);
      if (text) parts.push(text);
      const bg = colorUtility("bg", current.backgroundColor);
      if (bg) parts.push(bg);
      if (current.border && current.border !== "none" && !/^0px/.test(current.border)) parts.push("border", "border-brand-grey-200");
      const radius = radiusUtility(current.borderRadius);
      if (radius && radius !== "rounded-none") parts.push(radius);
      const seen = new Set();
      return parts.filter((part) => part && !seen.has(part) && seen.add(part)).join(" ");
    }

    function shorthand(kind, top, right, bottom, left) {
      if (top === right && right === bottom && bottom === left) {
        return px(top) === 0 ? `${kind}: 0;` : `${kind}: ${top};`;
      }
      if (top === bottom && left === right) return `${kind}: ${top} ${right};`;
      return `${kind}: ${top} ${right} ${bottom} ${left};`;
    }

    function buildExport(current) {
      const w = Math.round(current.rect.width);
      const h = Math.round(current.rect.height);
      const tw = specToTailwind(current);
      const textC = describeComputedColor(current.color);
      const bgC = describeComputedColor(current.backgroundColor);
      const lines = [];
      const pushIf = (cond, line) => { if (cond) lines.push(line); };

      lines.push("/* ═══════════════════════════════════════════════════════════════════");
      lines.push("   UI inspect: computed styles + Tailwind v4 hints");
      lines.push("   ═══════════════════════════════════════════════════════════════════ */");
      lines.push("");
      lines.push("// Layer (selector preview)");
      lines.push(`// ${current.selector}`);
      lines.push(`// Border box: ${w} × ${h} px`);
      const cW = Math.max(1, Math.round(w - px(current.borderLeftWidth) - px(current.borderRightWidth) - px(current.paddingLeft) - px(current.paddingRight)));
      const cH = Math.max(1, Math.round(h - px(current.borderTopWidth) - px(current.borderBottomWidth) - px(current.paddingTop) - px(current.paddingBottom)));
      lines.push(`// Content box (approx.): ${cW} × ${cH} px`);
      lines.push("");
      if (current.existingClasses) {
        lines.push("// Source className in the DOM");
        lines.push(`// ${current.existingClasses}`);
        lines.push("");
      }
      lines.push("/* ── Layout (CSS) ───────────────────────────────────────────── */");
      lines.push(`display: ${current.display};`);
      if (current.display === "flex" || current.display === "inline-flex") {
        pushIf(current.flexDirection !== "row", `flex-direction: ${current.flexDirection};`);
        pushIf(current.flexWrap !== "nowrap", `flex-wrap: ${current.flexWrap};`);
        pushIf(current.justifyContent && current.justifyContent !== "normal", `justify-content: ${current.justifyContent};`);
        pushIf(current.alignItems && current.alignItems !== "normal" && current.alignItems !== "stretch", `align-items: ${current.alignItems};`);
        pushIf(current.alignContent && current.alignContent !== "normal", `align-content: ${current.alignContent};`);
        if (current.gap && current.gap !== "normal") lines.push(`gap: ${current.gap};`);
        if (current.rowGap && current.rowGap !== "normal" && px(current.rowGap) > 0) lines.push(`row-gap: ${current.rowGap};`);
        if (current.columnGap && current.columnGap !== "normal" && px(current.columnGap) > 0) lines.push(`column-gap: ${current.columnGap};`);
      } else if (current.gap && current.gap !== "normal" && px(current.gap) > 0) {
        lines.push(`gap: ${current.gap};`);
      }
      lines.push(shorthand("padding", current.paddingTop, current.paddingRight, current.paddingBottom, current.paddingLeft));
      lines.push(shorthand("margin", current.marginTop, current.marginRight, current.marginBottom, current.marginLeft));
      pushIf(current.boxSizing !== "content-box", `box-sizing: ${current.boxSizing};`);
      pushIf(current.width !== "auto", `width: ${current.width};`);
      pushIf(current.height !== "auto", `height: ${current.height};`);
      pushIf(current.maxWidth !== "none", `max-width: ${current.maxWidth};`);
      pushIf(current.minWidth !== "0px" && current.minWidth !== "auto", `min-width: ${current.minWidth};`);
      if (current.border && current.border !== "none" && !/^0px/.test(current.border)) lines.push(`border: ${current.border};`);
      if (current.borderRadius && px(current.borderRadius) > 0) lines.push(`border-radius: ${current.borderRadius};`);
      if (current.boxShadow && current.boxShadow !== "none") lines.push(`box-shadow: ${current.boxShadow};`);
      if (current.opacity && current.opacity !== "1") lines.push(`opacity: ${current.opacity};`);
      lines.push("");
      lines.push("/* ── Typography (CSS) ────────────────────────────────────────── */");
      lines.push(`font-family: ${current.fontFamily};`);
      lines.push(`font-size: ${current.fontSize};`);
      lines.push(`font-weight: ${current.fontWeight};`);
      lines.push(`line-height: ${current.lineHeight};`);
      if (current.letterSpacing && current.letterSpacing !== "normal") lines.push(`letter-spacing: ${current.letterSpacing};`);
      lines.push(`color: ${current.color};`);
      if (textC.hex || textC.brandToken) {
        const hint = [textC.hex && `hex ${textC.hex}`, textC.brandToken && `@theme → ${textC.brandToken}`].filter(Boolean).join(" · ");
        lines.push(`/* ${hint} · Tailwind: ${textC.brandToken ? `text-${textC.brandToken}` : "text-[…]"} */`);
      }
      pushIf(current.textAlign && current.textAlign !== "start", `text-align: ${current.textAlign};`);
      pushIf(current.textTransform !== "none", `text-transform: ${current.textTransform};`);
      pushIf(current.whiteSpace !== "normal", `white-space: ${current.whiteSpace};`);
      pushIf(current.overflowWrap !== "normal", `overflow-wrap: ${current.overflowWrap};`);
      pushIf(current.textDecorationLine !== "none", `text-decoration-line: ${current.textDecorationLine};`);
      lines.push("");
      lines.push("/* ── Background (CSS) ─────────────────────────────────────── */");
      lines.push(`background-color: ${current.backgroundColor};`);
      if (bgC.hex || bgC.brandToken) {
        const hint = [bgC.hex && `hex ${bgC.hex}`, bgC.brandToken && `@theme → ${bgC.brandToken}`].filter(Boolean).join(" · ");
        lines.push(`/* ${hint} · Tailwind: ${bgC.brandToken ? `bg-${bgC.brandToken}` : "bg-[…]"} */`);
      }
      lines.push("");
      lines.push("/* ── Colors summary ────────────────── */");
      lines.push(`// Text:    ${textC.raw}${textC.hex ? `  →  ${textC.hex}` : ""}${textC.brandToken ? `  →  text-${textC.brandToken}` : ""}`);
      lines.push(`// Surface: ${bgC.raw}${bgC.hex ? `  →  ${bgC.hex}` : ""}${bgC.brandToken ? `  →  bg-${bgC.brandToken}` : ""}`);
      lines.push("");
      lines.push("/* ── Tailwind v4: suggested utilities (approximation) ──────── */");
      lines.push(`className="${tw}"`);
      lines.push("");
      lines.push("/* ── JSX ─ */");
      lines.push(`<${current.tagName}`);
      lines.push(`  className="${tw}"`);
      lines.push(">");
      lines.push("  {/* … */}");
      lines.push(`</${current.tagName}>`);
      lines.push("");
      lines.push("// End inspect export");
      return lines.join("\n");
    }

    function selectorPreview(el) {
      const tag = el.tagName.toLowerCase();
      if (el.id) return `${tag}#${CSS.escape(el.id)}`;
      const raw = el.getAttribute("class");
      if (raw) {
        const parts = raw.trim().split(/\s+/).filter(Boolean).slice(0, 8);
        if (parts.length) return `${tag}.${parts.join(".")}`;
      }
      return tag;
    }

    function gather(el) {
      const cs = getComputedStyle(el);
      const rect = el.getBoundingClientRect();
      const border = `${cs.borderWidth} ${cs.borderStyle} ${cs.borderColor}`.replace(/ rgba?\([^)]+\)/g, (m) => m.trim());
      const existingClasses = el instanceof HTMLElement && typeof el.className === "string" ? el.className.trim() : "";
      return {
        tagName: el.tagName.toLowerCase(),
        selector: selectorPreview(el),
        rect,
        paddingTop: cs.paddingTop,
        paddingRight: cs.paddingRight,
        paddingBottom: cs.paddingBottom,
        paddingLeft: cs.paddingLeft,
        marginTop: cs.marginTop,
        marginRight: cs.marginRight,
        marginBottom: cs.marginBottom,
        marginLeft: cs.marginLeft,
        fontSize: cs.fontSize,
        lineHeight: cs.lineHeight,
        fontWeight: cs.fontWeight,
        letterSpacing: cs.letterSpacing,
        fontFamily: cs.fontFamily,
        color: cs.color,
        backgroundColor: cs.backgroundColor,
        borderRadius: cs.borderRadius,
        border: border.replace(/none 0px rgb\([^)]+\)/i, "none").trim() || "none",
        borderTopWidth: cs.borderTopWidth,
        borderRightWidth: cs.borderRightWidth,
        borderBottomWidth: cs.borderBottomWidth,
        borderLeftWidth: cs.borderLeftWidth,
        display: cs.display,
        gap: cs.gap,
        boxSizing: cs.boxSizing,
        width: cs.width,
        height: cs.height,
        maxWidth: cs.maxWidth,
        minWidth: cs.minWidth,
        textAlign: cs.textAlign,
        textTransform: cs.textTransform,
        whiteSpace: cs.whiteSpace,
        overflowWrap: cs.overflowWrap,
        textDecorationLine: cs.textDecorationLine,
        flexDirection: cs.flexDirection,
        flexWrap: cs.flexWrap,
        justifyContent: cs.justifyContent,
        alignItems: cs.alignItems,
        alignContent: cs.alignContent,
        rowGap: cs.rowGap,
        columnGap: cs.columnGap,
        opacity: cs.opacity,
        boxShadow: cs.boxShadow,
        existingClasses,
      };
    }

    function row(label, value) {
      return `<div class="dt-row"><span>${esc(label)}</span><span>${esc(value)}</span></div>`;
    }

    function colorRow(label, css) {
      return `<div class="dt-color"><span>${esc(label)}</span><div class="dt-swatch-line"><i class="dt-swatch" style="background:${esc(css)}"></i><span class="dt-swatch-label">${esc(css)}</span></div></div>`;
    }

    function bandVisual(physical) {
      if (physical <= 0) return 0;
      return Math.min(48, Math.max(5, physical));
    }

    function sideBand(show, visual, label, tone, horizontal) {
      if (!show) return "";
      const size = horizontal
        ? `width:${visual || 0}px;min-width:${visual || 0}px`
        : `height:${visual || 0}px;min-height:${visual || 0}px`;
      return `<div class="dt-band dt-band-${tone}" style="${size}">${label > 0 ? `${label}px` : ""}</div>`;
    }

    function boxModel(current) {
      const m = { t: px(current.marginTop), r: px(current.marginRight), b: px(current.marginBottom), l: px(current.marginLeft) };
      const p = { t: px(current.paddingTop), r: px(current.paddingRight), b: px(current.paddingBottom), l: px(current.paddingLeft) };
      const b = { t: px(current.borderTopWidth), r: px(current.borderRightWidth), b: px(current.borderBottomWidth), l: px(current.borderLeftWidth) };
      const bbW = Math.round(current.rect.width);
      const bbH = Math.round(current.rect.height);
      const cW = Math.max(1, bbW - b.l - b.r - p.l - p.r);
      const cH = Math.max(1, bbH - b.t - b.b - p.t - p.b);
      const hasMargin = m.t || m.r || m.b || m.l;
      const hasBorder = b.t || b.r || b.b || b.l;
      const hasPadding = p.t || p.r || p.b || p.l;
      const contentW = Math.max(72, Math.min(160, bandVisual(cW) + 40));
      const contentH = Math.max(44, Math.min(100, bandVisual(cH) + 24));
      return `<div class="dt-boxmodel">
        <p class="dt-section-label">Box model</p>
        <p class="dt-note">Concentric regions (not to scale if values are large). Numbers are computed from the selected element.</p>
        <div class="dt-diagram-wrap"><div class="dt-diagram">
          ${sideBand(hasMargin, hasMargin ? bandVisual(m.t) : 0, m.t, "m", false)}
          <div class="dt-rowline">
            ${sideBand(hasMargin, hasMargin ? bandVisual(m.l) : 0, m.l, "m", true)}
            <div class="dt-col">
              ${sideBand(hasBorder, hasBorder ? bandVisual(b.t) : 0, b.t, "b", false)}
              <div class="dt-rowline">
                ${sideBand(hasBorder, hasBorder ? bandVisual(b.l) : 0, b.l, "b", true)}
                <div class="dt-col">
                  ${sideBand(hasPadding, hasPadding ? bandVisual(p.t) : 0, p.t, "p", false)}
                  <div class="dt-rowline">
                    ${sideBand(hasPadding, hasPadding ? bandVisual(p.l) : 0, p.l, "p", true)}
                    <div class="dt-content" style="min-width:${contentW}px;min-height:${contentH}px">${cW} × ${cH}<em>Content</em></div>
                    ${sideBand(hasPadding, hasPadding ? bandVisual(p.r) : 0, p.r, "p", true)}
                  </div>
                  ${sideBand(hasPadding, hasPadding ? bandVisual(p.b) : 0, p.b, "p", false)}
                </div>
                ${sideBand(hasBorder, hasBorder ? bandVisual(b.r) : 0, b.r, "b", true)}
              </div>
              ${sideBand(hasBorder, hasBorder ? bandVisual(b.b) : 0, b.b, "b", false)}
            </div>
            ${sideBand(hasMargin, hasMargin ? bandVisual(m.r) : 0, m.r, "m", true)}
          </div>
          ${sideBand(hasMargin, hasMargin ? bandVisual(m.b) : 0, m.b, "m", false)}
        </div></div>
        <div class="dt-legend">
          <span><i class="m"></i>Margin</span>
          <span><i class="b"></i>Border</span>
          <span><i class="p"></i>Padding</span>
          <span><i class="c"></i>Content</span>
        </div>
        <p class="dt-foot">Border box (matches purple outline): ${bbW} × ${bbH} px</p>
      </div>`;
    }

    const HANDOFF = {
      specPath: "docs/interview-ui-handoff-prompt.md",
      githubBlob:
        "https://github.com/patricemmh/be-platform/blob/main/docs/interview-ui-handoff-prompt.md",
      githubRaw:
        "https://raw.githubusercontent.com/patricemmh/be-platform/main/docs/interview-ui-handoff-prompt.md",
      pagesInterview: "https://patricemmh.github.io/be-platform/interview.html",
    };

    function interviewHandoffStarterPrompt() {
      return [
        "Implement the Live AI Interview UI for BetterEngineer using this repo’s handoff spec and static prototypes.",
        "",
        "Full spec (read first):",
        HANDOFF.githubRaw,
        "",
        "Spec on GitHub (browse):",
        HANDOFF.githubBlob,
        "",
        "Visual reference — match pixel behavior, spacing, typography, and state transitions:",
        `- Interview room: ${HANDOFF.pagesInterview}`,
        "",
        "Source file: interview.html (runtime room + in-room question set setup). Post-close target: vetting.html.",
        "",
        "Follow the spec: design tokens, body state classes, localStorage keys, call lifecycle, and QA checklist. Side-by-side with the GitHub Pages interview prototype is required.",
      ].join("\n");
    }

    function handoffSection() {
      const prompt = interviewHandoffStarterPrompt();
      return `<div class="dt-section dt-handoff">
          <div class="dt-copy-row">
            <div>
              <p class="dt-section-label">Handoff — Live AI Interview UI</p>
              <p class="dt-note">Starter prompt for Claude Code. Links to spec and prototypes.</p>
            </div>
            <button type="button" class="dt-copy" data-dt-handoff-copy>${ICON.copy} Copy prompt</button>
          </div>
          <ul class="dt-link-list">
            <li><a href="${esc(HANDOFF.githubBlob)}" target="_blank" rel="noopener noreferrer">Spec on GitHub (blob)</a></li>
            <li><a href="${esc(HANDOFF.githubRaw)}" target="_blank" rel="noopener noreferrer">Spec raw URL</a></li>
            <li><a href="${esc(HANDOFF.pagesInterview)}" target="_blank" rel="noopener noreferrer">Prototype: interview.html (Pages)</a></li>
          </ul>
          <details class="dt-handoff-details" data-dt-handoff-preview>
            <summary>Spec preview (same origin)</summary>
            <p class="dt-note dt-handoff-md-status" data-dt-handoff-md-status>Loading…</p>
            <pre class="dt-handoff-md" data-dt-handoff-md hidden spellcheck="false"></pre>
          </details>
          <textarea class="dt-export dt-handoff-prompt" readonly spellcheck="false" hidden aria-hidden="true">${esc(prompt)}</textarea>
        </div>`;
    }

    let handoffSpecCache;

    function applyHandoffPreview(block) {
      if (!block) return;
      const pre = block.querySelector("[data-dt-handoff-md]");
      const status = block.querySelector("[data-dt-handoff-md-status]");
      const max = 14000;
      if (handoffSpecCache) {
        const slice =
          handoffSpecCache.length > max
            ? `${handoffSpecCache.slice(0, max)}\n\n… [truncated]`
            : handoffSpecCache;
        if (pre) {
          pre.textContent = slice;
          pre.hidden = false;
        }
        if (status) status.textContent = "Loaded from /docs/interview-ui-handoff-prompt.md on this host.";
        return;
      }
      if (handoffSpecCache === "") {
        if (status) status.textContent = "Preview unavailable here — use the GitHub links above.";
      }
    }

    function loadHandoffPreview(root) {
      const block = root && root.querySelector("[data-dt-handoff-preview]");
      if (!block) return;
      if (handoffSpecCache !== undefined) {
        applyHandoffPreview(block);
        return;
      }
      fetch(`/${HANDOFF.specPath}`)
        .then((res) => {
          if (!res.ok) throw new Error(String(res.status));
          return res.text();
        })
        .then((text) => {
          handoffSpecCache = text;
          applyHandoffPreview(block);
        })
        .catch(() => {
          handoffSpecCache = "";
          applyHandoffPreview(block);
        });
    }

    function copyText(copyBtn, text, labelCopied) {
      const markCopied = () => {
        copyBtn.innerHTML = `${ICON.check} ${labelCopied}`;
        window.clearTimeout(copiedTimer);
        copiedTimer = window.setTimeout(() => {
          if (copyBtn.isConnected) copyBtn.innerHTML = `${ICON.copy} Copy prompt`;
        }, 2000);
      };
      const fallback = () => {
        const area = panel.querySelector(".dt-handoff-prompt");
        if (!area) return;
        area.hidden = false;
        area.focus();
        area.select();
        try {
          if (document.execCommand("copy")) markCopied();
        } catch {
          /* ignore */
        }
        area.hidden = true;
      };
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(text).then(markCopied).catch(fallback);
      } else fallback();
    }

    function panelBody(current) {
      if (!current) {
        return `<p class="dt-empty">Nothing selected yet. Click something on the page. The inspect icons stay clickable so you can turn this off.</p>${handoffSection()}`;
      }
      const flex = current.display === "flex" || current.display === "inline-flex";
      const tw = specToTailwind(current);
      const exported = buildExport(current);
      return `<div class="dt-stack">
        <div class="dt-section">
          <p class="dt-section-label">Element</p>
          <p class="dt-selector">${esc(current.selector)}</p>
          ${row("Size", `${Math.round(current.rect.width)} × ${Math.round(current.rect.height)} px (border box)`)}
          ${row("CSS width", current.width)}
          ${row("CSS height", current.height)}
          ${row("Max width", current.maxWidth)}
        </div>
        <div class="dt-section">
          <p class="dt-section-label">Layout</p>
          <div class="dt-rows">
            ${row("Padding", `${current.paddingTop} ${current.paddingRight} ${current.paddingBottom} ${current.paddingLeft}`)}
            ${row("Margin", `${current.marginTop} ${current.marginRight} ${current.marginBottom} ${current.marginLeft}`)}
            ${row("Display", current.display)}
            ${row("Gap", current.gap)}
            ${row("Box sizing", current.boxSizing)}
            ${row("Radius", current.borderRadius)}
            ${row("Border", current.border)}
            ${row("Border (sides)", `${current.borderTopWidth} ${current.borderRightWidth} ${current.borderBottomWidth} ${current.borderLeftWidth}`)}
          </div>
        </div>
        ${boxModel(current)}
        <div class="dt-section">
          <p class="dt-section-label">Typography</p>
          <div class="dt-rows">
            ${row("Font size", current.fontSize)}
            ${row("Line height", current.lineHeight)}
            ${row("Weight", current.fontWeight)}
            ${row("Letter", current.letterSpacing)}
            ${row("Font", current.fontFamily)}
            ${row("Text align", current.textAlign)}
            ${row("Whitespace", current.whiteSpace)}
            ${row("Overflow wrap", current.overflowWrap)}
            ${row("Decoration", current.textDecorationLine)}
          </div>
        </div>
        ${flex ? `<div class="dt-section"><p class="dt-section-label">Flex</p><div class="dt-rows">
          ${row("Direction", current.flexDirection)}
          ${row("Justify", current.justifyContent)}
          ${row("Align items", current.alignItems)}
          ${row("Gap", current.gap)}
        </div></div>` : ""}
        <div class="dt-section">
          <p class="dt-section-label">Colors</p>
          <div class="dt-rows">
            ${colorRow("Text", current.color)}
            ${colorRow("Background", current.backgroundColor)}
          </div>
        </div>
        <div class="dt-section">
          <p class="dt-section-label">Tailwind</p>
          <p class="dt-note">One-line approximation from computed styles. Known brand colors become theme tokens; everything else stays an arbitrary value.</p>
          <p class="dt-code">${esc(tw || "-")}</p>
        </div>
        <div class="dt-section">
          <div class="dt-copy-row">
            <div>
              <p class="dt-section-label">Copy for devs</p>
              <p>CSS blocks, color tokens, Tailwind, and JSX, similar to Figma Dev Mode.</p>
            </div>
            <button type="button" class="dt-copy" data-dt-copy>${ICON.copy} Copy</button>
          </div>
          <textarea class="dt-export" readonly spellcheck="false">${esc(exported)}</textarea>
        </div>
        ${handoffSection()}
      </div>`;
    }

    function clamp(left, top, panelW, panelH) {
      const maxL = Math.max(MARGIN, window.innerWidth - panelW - MARGIN);
      const maxT = Math.max(MARGIN, window.innerHeight - panelH - MARGIN);
      return {
        left: Math.min(Math.max(MARGIN, left), maxL),
        top: Math.min(Math.max(MARGIN, top), maxT),
      };
    }

    function applyPosition() {
      if (!panel) return;
      if (!position) {
        panel.style.right = `${MARGIN}px`;
        panel.style.top = `${MARGIN}px`;
        panel.style.left = "auto";
        return;
      }
      panel.style.right = "auto";
      panel.style.left = `${position.left}px`;
      panel.style.top = `${position.top}px`;
    }

    function measurePanel() {
      if (!panel || !drawerOpen) return;
      const w = panel.offsetWidth;
      const h = panel.offsetHeight;
      position = position
        ? clamp(position.left, position.top, w, h)
        : clamp(window.innerWidth - w - MARGIN, MARGIN, w, h);
      applyPosition();
    }

    function paintOverlay() {
      if (!box || !badge) return;
      if (!enabled || !spec) {
        box.hidden = true;
        badge.hidden = true;
        return;
      }
      const rect = selected && document.contains(selected) ? selected.getBoundingClientRect() : spec.rect;
      box.hidden = false;
      badge.hidden = false;
      box.style.left = `${rect.left}px`;
      box.style.top = `${rect.top}px`;
      box.style.width = `${rect.width}px`;
      box.style.height = `${rect.height}px`;
      badge.style.left = `${rect.left}px`;
      badge.style.top = `${Math.max(4, rect.top - 22)}px`;
      badge.textContent = `${Math.round(rect.width)} × ${Math.round(rect.height)}`;
    }

    function paintPanel() {
      if (!panel) return;
      panel.classList.toggle("is-closed", !drawerOpen);
      panel.setAttribute("aria-hidden", drawerOpen ? "false" : "true");
      const body = panel.querySelector(".dt-body");
      const scroll = body.scrollTop;
      body.innerHTML = panelBody(spec);
      body.scrollTop = scroll;
      loadHandoffPreview(body);
      requestAnimationFrame(measurePanel);
    }

    function syncButtons() {
      if (!toggleBtn || !panelBtn) return;
      toggleBtn.classList.toggle("is-on", enabled);
      toggleBtn.setAttribute("aria-pressed", enabled ? "true" : "false");
      toggleBtn.title = enabled ? "Turn off UI dev inspect" : "Turn on UI dev inspect";
      panelBtn.hidden = !enabled;
      panelBtn.classList.toggle("is-panel", drawerOpen);
      panelBtn.title = drawerOpen ? "Close inspect panel" : "Open inspect panel";
    }

    function setEnabled(value) {
      enabled = value;
      try { window.localStorage.setItem(STORAGE_KEY, value ? "1" : "0"); } catch { /* ignore */ }
      if (!value) {
        drawerOpen = false;
        selected = null;
        spec = null;
      } else {
        drawerOpen = true;
      }
      syncButtons();
      paintOverlay();
      paintPanel();
    }

    function select(el) {
      selected = el;
      spec = el && document.contains(el) ? gather(el) : null;
      paintOverlay();
      paintPanel();
    }

    function onClickCapture(event) {
      if (!enabled || event.button !== 0) return;
      const raw = event.target;
      const el = raw instanceof Element ? raw : raw instanceof Text ? raw.parentElement : null;
      if (!el) return;
      if (el.closest("[data-dev-inspect-drawer], [data-dev-inspect-exclude]")) return;
      event.preventDefault();
      event.stopPropagation();
      select(el);
    }

    function onScroll() {
      if (!enabled || !selected || !document.contains(selected)) return;
      spec = gather(selected);
      paintOverlay();
    }

    function ensureChrome() {
      if (box) return;
      box = document.createElement("div");
      box.className = "dt-box";
      box.hidden = true;
      badge = document.createElement("div");
      badge.className = "dt-badge";
      badge.hidden = true;
      panel = document.createElement("aside");
      panel.className = "dt-panel is-closed";
      panel.setAttribute("data-dev-inspect-drawer", "");
      panel.setAttribute("aria-hidden", "true");
      panel.innerHTML = `<div class="dt-head">
        <div class="dt-drag" aria-label="Drag to move inspect panel">
          <div class="dt-kicker">${ICON.grip}<span>Drag to move</span></div>
          <h2>Inspect</h2>
          <p>Click any element on the page to select it</p>
        </div>
        <div class="dt-close-wrap"><button type="button" class="dt-close" aria-label="Close">${ICON.x}</button></div>
      </div>
      <div class="dt-body"></div>`;
      document.body.append(box, badge, panel);
      applyPosition();

      panel.querySelector(".dt-close").addEventListener("click", () => {
        drawerOpen = false;
        syncButtons();
        paintPanel();
      });
      panel.addEventListener("click", (event) => {
        const handoffCopyBtn = event.target.closest("[data-dt-handoff-copy]");
        if (handoffCopyBtn) {
          copyText(handoffCopyBtn, interviewHandoffStarterPrompt(), "Copied");
          return;
        }
        const copyBtn = event.target.closest("[data-dt-copy]");
        if (!copyBtn || !spec) return;
        const text = buildExport(spec);
        const markCopied = () => {
          copyBtn.innerHTML = `${ICON.check} Copied`;
          window.clearTimeout(copiedTimer);
          copiedTimer = window.setTimeout(() => {
            if (copyBtn.isConnected) copyBtn.innerHTML = `${ICON.copy} Copy`;
          }, 2000);
        };
        const fallback = () => {
          const area = panel.querySelector(".dt-export");
          if (!area) return;
          area.focus();
          area.select();
          try { if (document.execCommand("copy")) markCopied(); } catch { /* ignore */ }
        };
        if (navigator.clipboard && navigator.clipboard.writeText) {
          navigator.clipboard.writeText(text).then(markCopied).catch(fallback);
        } else fallback();
      });

      const handle = panel.querySelector(".dt-drag");
      handle.addEventListener("pointerdown", (event) => {
        if (event.button !== 0) return;
        const rect = panel.getBoundingClientRect();
        drag = { id: event.pointerId, ox: event.clientX - rect.left, oy: event.clientY - rect.top };
        handle.setPointerCapture(event.pointerId);
      });
      handle.addEventListener("pointermove", (event) => {
        if (!drag || drag.id !== event.pointerId) return;
        position = clamp(event.clientX - drag.ox, event.clientY - drag.oy, panel.offsetWidth, panel.offsetHeight);
        applyPosition();
      });
      const endDrag = (event) => {
        if (!drag || drag.id !== event.pointerId) return;
        drag = null;
        try { handle.releasePointerCapture(event.pointerId); } catch { /* ignore */ }
      };
      handle.addEventListener("pointerup", endDrag);
      handle.addEventListener("pointercancel", endDrag);
    }

    function mount(host) {
      ensureChrome();
      toggleBtn = document.createElement("button");
      toggleBtn.type = "button";
      toggleBtn.innerHTML = ICON.code;
      toggleBtn.addEventListener("click", () => setEnabled(!enabled));

      panelBtn = document.createElement("button");
      panelBtn.type = "button";
      panelBtn.innerHTML = ICON.panel;
      panelBtn.addEventListener("click", () => {
        drawerOpen = !drawerOpen;
        syncButtons();
        paintPanel();
      });

      host.append(toggleBtn, panelBtn);
      syncButtons();
      paintOverlay();
      paintPanel();

      document.addEventListener("click", onClickCapture, true);
      window.addEventListener("scroll", onScroll, true);
      window.addEventListener("resize", () => {
        onScroll();
        if (panel && position) {
          position = clamp(position.left, position.top, panel.offsetWidth, panel.offsetHeight);
          applyPosition();
        }
      });
      window.addEventListener("keydown", (event) => {
        if (event.key === "Escape" && enabled && drawerOpen) {
          drawerOpen = false;
          syncButtons();
          paintPanel();
        }
      });
    }

    return { id: "inspect", mount };
  }

  function boot() {
    if (booted) return;
    booted = true;
    bar = document.createElement("div");
    bar.className = "dt-toggle";
    bar.setAttribute("data-dev-inspect-exclude", "");
    placeBar(bar);
    tools.forEach((tool) => tool.mount(bar));
  }

  register(createInspectTool());
  window.DevTools = { register, version: 1 };

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
  else boot();
})();
