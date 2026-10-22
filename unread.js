(() => {
  'use strict';
  function chatPath(value, origin) {
    try {
      const url = new URL(value, origin);
      return url.origin === origin && /^\/i\/chat\/(?!pin(?:\/|$))[a-zA-Z0-9_:/-]+$/.test(url.pathname) ? url.pathname : null;
    } catch { return null; }
  }
  function avatarUrl(value) {
    try {
      const url = new URL(value);
      return url.protocol === 'https:' && /(^|\.)twimg\.com$/.test(url.hostname) && !url.username && !url.password ? url.href : null;
    } catch { return null; }
  }
  function normalize(entries, origin) {
    const unique = new Map();
    if (!Array.isArray(entries)) return [];
    for (const entry of entries.slice(0, 50)) {
      if (!entry || typeof entry !== 'object') continue;
      const href = chatPath(entry.href, origin);
      if (!href || unique.has(href)) continue;
      const avatarIcon = globalThis.XWorkspaceAvatars?.normalize(entry.avatarIcon);
      unique.set(href, { href, name: String(entry.name || 'Conversation').slice(0, 80), avatar: avatarUrl(entry.avatar), ...(avatarIcon ? { avatarIcon } : {}) });
    }
    return [...unique.values()];
  }
  function scan(root, origin) {
    const rows = [];
    for (const link of root.querySelectorAll('a[href*="/i/chat/"]')) {
      const href = chatPath(link.getAttribute('href'), origin);
      const row = link.querySelector('[data-inbox-row]');
      if (!href || !row) continue;
      const label = link.getAttribute('aria-label') || '';
      const unread = !!row.querySelector('[data-icon="icon-circle-fill"].text-chat-accent') || /(?:^|,\s*)unread(?:,|$)/i.test(label);
      // Read the title and the leading avatar column, never preview images or text.
      const name = row.querySelector('.line-clamp-1')?.textContent?.trim() || label.replace(/,\s*(unread|Primary bot)\b/gi, '').trim() || 'Conversation';
      const avatarRoot = row.firstElementChild;
      const img = avatarRoot?.querySelector('img');
      const avatarIcon = globalThis.XWorkspaceAvatars?.capture(avatarRoot?.querySelector('svg'));
      const bot = /^\/i\/chat\/bots\/[^/]+$/.test(href) || (globalThis.XWorkspaceBots?.isPrimaryBot(label) || false);
      rows.push({ href, name, bot, ...(avatarIcon ? { avatarIcon } : {}), avatar: avatarUrl(img?.currentSrc || img?.getAttribute('src')), unread });
    }
    return rows;
  }
  function reconcile(previous, rows) {
    const remaining = new Map(previous);
    const next = new Map();
    // Unmounted virtual rows retain their last known unread state. An explicit
    // read row removes it, so collapsing or opening a conversation can't clear all badges.
    for (const row of rows) {
      remaining.delete(row.href);
      if (row.unread) next.set(row.href, { href: row.href, name: row.name, avatar: row.avatar, ...(row.avatarIcon ? { avatarIcon: row.avatarIcon } : {}) });
    }
    return new Map([...next, ...remaining].slice(0, 50));
  }
  globalThis.XWorkspaceUnread = Object.freeze({ chatPath, avatarUrl, normalize, scan, reconcile });
})();
