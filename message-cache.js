(() => {
  'use strict';
  const KEY = 'botMessageCache', MAX_CHATS = 20, MAX_BYTES = 80000, MAX_AGE = 7 * 86400000;
  const validPath = href => typeof href === 'string' && /^\/i\/chat\/bots\/[^/?#]+$/.test(href);
  const bytes = value => new TextEncoder().encode(JSON.stringify(value)).length;
  function messages(rows) {
    const result = []; let size = 0;
    for (const { images, ...row } of globalThis.XWorkspaceChatBridge.normalizeMessages(rows).slice(-100).reverse()) {
      // Native decrypted image URLs belong to the live connection. Keep only
      // their text labels on disk; reconnecting supplies fresh previews.
      const length = bytes(row);
      if (size + length > MAX_BYTES) break;
      result.unshift(row); size += length;
    }
    return result;
  }
  function normalize(value) {
    if (!value || typeof value !== 'object' || Array.isArray(value)) return {};
    const entries = Object.entries(value).flatMap(([href, item]) => {
      if (!validPath(href) || !item || !Number.isFinite(item.updatedAt) || item.updatedAt > Date.now() || Date.now() - item.updatedAt > MAX_AGE) return [];
      const entry = globalThis.XWorkspaceBots.normalize([{ ...item.entry, href, unread: false }], location.origin)[0];
      const rows = messages(item.messages);
      return entry && rows.length ? [[href, { entry, messages: rows, updatedAt: item.updatedAt }]] : [];
    });
    return Object.fromEntries(entries.sort((a, b) => a[1].updatedAt - b[1].updatedAt).slice(-MAX_CHATS));
  }
  globalThis.XWorkspaceMessageCache = async function (storage) {
    let cached = {};
    try { cached = normalize((await storage.get(KEY))[KEY]); } catch { /* Cache failures must not block live chat. */ }
    let dirty = {}, timer, firstChange = 0, writing = Promise.resolve();
    function flush() {
      clearTimeout(timer); timer = undefined; firstChange = 0;
      if (!Object.keys(dirty).length) return writing;
      const changes = dirty; dirty = {};
      writing = writing.then(async () => {
        // Merge other tabs' cached conversations instead of replacing their snapshots.
        const stored = normalize((await storage.get(KEY))[KEY]);
        for (const [href, item] of Object.entries(changes)) if (!stored[href] || stored[href].updatedAt <= item.updatedAt) stored[href] = item;
        await storage.set({ [KEY]: normalize(stored) });
      }).catch(() => { /* Storage may be unavailable or full; X remains authoritative. */ });
      return writing;
    }
    return {
      get(href) { return globalThis.XWorkspaceChatBridge.normalizeMessages(cached[href]?.messages); },
      entries() { return Object.values(cached).map(item => item.entry); },
      put(entry, rows) {
        if (!validPath(entry.href)) return;
        const item = normalize({ [entry.href]: { entry, messages: rows, updatedAt: Date.now() } })[entry.href];
        if (!item || JSON.stringify([cached[entry.href]?.entry, cached[entry.href]?.messages]) === JSON.stringify([item.entry, item.messages])) return;
        cached[entry.href] = item; cached = normalize(cached); dirty[entry.href] = item;
        if (!firstChange) firstChange = Date.now();
        clearTimeout(timer); timer = setTimeout(flush, Math.max(0, Math.min(300, 2000 - (Date.now() - firstChange))));
      },
      flush
    };
  };
})();
