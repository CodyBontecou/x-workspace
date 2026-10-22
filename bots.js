(() => {
  'use strict';
  const unread = globalThis.XWorkspaceUnread;
  function isPrimaryBot(label) {
    return /(?:^|,\s*)Primary bot(?:\s*,|$)/i.test(label || '');
  }
  function normalize(entries, origin) {
    const safe = unread.normalize(entries, origin);
    return safe.map(entry => ({ ...entry, unread: entries.find(value => value && unread.chatPath(value.href, origin) === entry.href)?.unread === true }));
  }
  function reconcile(previous, rows) {
    const next = new Map(previous);
    for (const row of rows) {
      next.delete(row.href);
      if (row.bot) next.set(row.href, { href: row.href, name: row.name, avatar: row.avatar, ...(row.avatarIcon ? { avatarIcon: row.avatarIcon } : {}), unread: row.unread });
    }
    return new Map([...next].slice(-50));
  }
  // Pins store identity only; read state must always come from X's current inbox.
  function pins(entries, origin) { return unread.normalize(entries, origin); }
  function sessions(known, pinned) {
    const byPath = new Map(known.map(entry => [entry.href, entry]));
    const pinnedPaths = new Set(pinned.map(entry => entry.href));
    return [
      ...pinned.map(entry => ({ ...(byPath.get(entry.href) || entry), pinned: true, observed: byPath.has(entry.href) })),
      ...known.filter(entry => !pinnedPaths.has(entry.href)).sort((a, b) => Number(b.unread) - Number(a.unread) || a.name.localeCompare(b.name)).map(entry => ({ ...entry, pinned: false, observed: true }))
    ];
  }
  globalThis.XWorkspaceBots = Object.freeze({ isPrimaryBot, normalize, reconcile, pins, sessions });
})();
