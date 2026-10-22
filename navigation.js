(() => {
  'use strict';
  function route(value, origin) {
    try {
      const url = new URL(value, origin);
      if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password) return null;
      const base = new URL(origin);
      const xAlias = base.hostname === 'x.com' && ['x.com', 'www.x.com', 'twitter.com', 'www.twitter.com'].includes(url.hostname) && !url.port;
      return url.origin === origin || xAlias ? url.pathname + url.search + url.hash : null;
    } catch { return null; }
  }
  function follow(event, href) {
    if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return false;
    const path = route(href, location.origin);
    if (!path) return false; // External links follow the anchor in this tab.
    event.preventDefault();
    if (path === location.pathname + location.search + location.hash) return true;
    window.dispatchEvent(new Event('xw-message-navigation'));
    const id = crypto.randomUUID();
    window.dispatchEvent(new CustomEvent('xw-request-navigation', { detail: JSON.stringify({ id, path }) }));
    return true;
  }
  globalThis.XWorkspaceNavigation = Object.freeze({ route, follow });
})();
