(() => {
  'use strict';
  const tags = new Set(['svg', 'g', 'defs', 'mask', 'clipPath', 'path', 'use', 'rect', 'circle', 'ellipse', 'line', 'polyline', 'polygon']);
  const numeric = new Set(['x', 'y', 'x1', 'x2', 'y1', 'y2', 'cx', 'cy', 'r', 'rx', 'ry', 'width', 'height', 'opacity', 'fill-opacity', 'stroke-opacity', 'stroke-width', 'stroke-miterlimit', 'viewBox', 'points', 'stroke-dasharray', 'stroke-dashoffset']);
  const color = value => /^(?:none|currentColor|#[\da-f]{3,8}|(?:rgb|hsl)a?\([\d\s.,%+/-]+\))$/i.test(value);
  function normalize(icon) {
    let budget = 65536, count = 0;
    function visit(value, depth) {
      if (!value || typeof value !== 'object' || !tags.has(value.tag) || depth > 12 || ++count > 100) return null;
      const attrs = {};
      for (const [key, text] of Object.entries(value.attrs || {}).slice(0, 40)) {
        if (typeof text !== 'string' || text.length > 32768 || (budget -= text.length) < 0) continue;
        const safe = numeric.has(key) ? /^[\d\s.,%+eE-]+$/.test(text)
          : key === 'd' ? /^[MmZzLlHhVvCcSsQqTtAa\d\s.,+eE-]+$/.test(text)
          : key === 'transform' ? /^(?:(?:matrix|translate|scale|rotate|skewX|skewY)\([\d\s.,+eE-]+\)\s*)+$/.test(text)
          : ['fill', 'stroke'].includes(key) ? color(text)
          : key === 'id' ? /^[\w-]{1,100}$/.test(text)
          : key === 'href' ? /^#[\w-]{1,100}$/.test(text)
          : ['mask', 'clip-path'].includes(key) ? /^url\(#[\w-]{1,100}\)$/.test(text)
          : ['fill-rule', 'clip-rule'].includes(key) ? /^(nonzero|evenodd)$/.test(text)
          : key === 'maskUnits' || key === 'clipPathUnits' ? /^(userSpaceOnUse|objectBoundingBox)$/.test(text)
          : key === 'stroke-linecap' ? /^(butt|round|square)$/.test(text)
          : key === 'stroke-linejoin' ? /^(miter|round|bevel)$/.test(text) : false;
        if (safe) attrs[key] = text;
      }
      const children = Array.isArray(value.children) ? value.children.slice(0, 100).map(child => visit(child, depth + 1)).filter(Boolean) : [];
      return { tag: value.tag, attrs, children };
    }
    if (icon?.tag !== 'svg') return null;
    const result = visit(icon, 0);
    if (!result || budget < 0 || count > 100) return null;
    result.scale = Number.isFinite(icon.scale) ? Math.max(100, Math.min(160, icon.scale)) : 100;
    return result;
  }
  function capture(svg) {
    if (!svg) return null;
    const computed = svg.ownerDocument.defaultView.getComputedStyle(svg);
    const colors = { '--fg': computed.getPropertyValue('--fg').trim(), '--bg': computed.getPropertyValue('--bg').trim() };
    function visit(element, depth = 0) {
      if (depth > 12 || !tags.has(element.localName)) return null;
      const attrs = {};
      for (const attr of Array.from(element.attributes)) {
        let value = attr.value;
        if (['fill', 'stroke'].includes(attr.name)) {
          value = value.replace(/var\((--fg|--bg)\)/g, (_, key) => colors[key]);
          if (value === 'currentColor') value = computed.color;
        }
        attrs[attr.name] = value;
      }
      return { tag: element.localName, attrs, children: Array.from(element.children).slice(0, 100).map(child => visit(child, depth + 1)).filter(Boolean) };
    }
    const icon = visit(svg);
    if (!icon) return null;
    icon.scale = parseFloat(svg.parentElement?.style.width) || 100;
    return normalize(icon);
  }
  let serial = 0;
  function render(icon, doc = document) {
    const safe = normalize(icon);
    if (!safe) return null;
    const prefix = `xw-avatar-${++serial}-`;
    function visit(value) {
      const el = doc.createElementNS('http://www.w3.org/2000/svg', value.tag);
      for (const [key, text] of Object.entries(value.attrs)) {
        const resolved = key === 'id' ? prefix + text : key === 'href' ? '#' + prefix + text.slice(1) : ['mask', 'clip-path'].includes(key) ? text.replace('url(#', `url(#${prefix}`) : text;
        el.setAttribute(key, resolved);
      }
      for (const child of value.children) el.append(visit(child));
      return el;
    }
    const svg = visit(safe);
    svg.setAttribute('aria-hidden', 'true'); svg.setAttribute('focusable', 'false');
    svg.style.width = `${safe.scale}%`; svg.style.height = `${safe.scale}%`; svg.style.flexShrink = '0';
    return svg;
  }
  globalThis.XWorkspaceAvatars = Object.freeze({ normalize, capture, render });
})();
