// Runs in the page's JS world so X's history integration sees the navigation.
(() => {
  'use strict';
  function routerHistory() {
    // The workspace lives outside X's React tree. Find the Router's history
    // through that tree so push() notifies its subscribers as well as the URL.
    const root = document.getElementById('react-root');
    if (!root) return null;
    const host = root.firstElementChild || root;
    const key = Object.keys(host).find(key => key.startsWith('__reactFiber$'));
    let fiber = key && host[key];
    while (fiber?.return) fiber = fiber.return;
    const stack = fiber ? [fiber] : [];
    for (let count = 0; stack.length && count < 20000; count++) {
      const node = stack.pop();
      const candidate = node.memoizedProps?.history;
      if (typeof candidate?.push === 'function' && typeof candidate?.listen === 'function') return candidate;
      if (node.sibling) stack.push(node.sibling);
      if (node.child) stack.push(node.child);
    }
    return null;
  }
  window.addEventListener('xw-request-navigation', event => {
    if (typeof event.detail !== 'string' || event.detail.length > 8192) return;
    let data;
    try { data = JSON.parse(event.detail); } catch { return; }
    if (typeof data.id !== 'string' || data.id.length > 80 || typeof data.path !== 'string' || !data.path.startsWith('/')) return;
    let url;
    try { url = new URL(data.path, location.origin); } catch { return; }
    if (url.origin !== location.origin) return;
    const router = routerHistory();
    if (router) {
      router.push(url.pathname + url.search + url.hash);
    } else {
      const state = { ...(history.state || {}), key: crypto.randomUUID() };
      if (Number.isFinite(state.idx)) state.idx++;
      history.pushState(state, '', url.pathname + url.search + url.hash);
      window.dispatchEvent(new PopStateEvent('popstate', { state: history.state }));
    }
    if (!url.hash) window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
    window.dispatchEvent(new CustomEvent('xw-navigation-complete', { detail: data.id }));
  });
})();
