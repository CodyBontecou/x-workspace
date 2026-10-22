// Store-only demo: real UI module, fake local data, no X connection or requests.
(() => {
  const settings = { botPins: [], botPanels: {} };
  const entries = ['Analytics Coach', 'Article Tracker', 'Bookmarks Brain', 'Chief of Staff', 'Quote Post Scout', 'X Researcher'].map((name, index) => ({
    name, href: `/i/chat/bots/demo-${index}`, unread: index === 1 || index === 5,
    avatarIcon: { tag: 'svg', attrs: { viewBox: '0 0 40 40' }, children: [
      { tag: 'rect', attrs: { x: '3', y: '3', width: '34', height: '34', rx: '14', fill: ['#ff9c00', '#ff2548', '#f327a9', '#ff6700', '#9656ff', '#00bca6'][index], transform: 'rotate(-12 20 20)' }, children: [] },
      ...[16, 25].map(x => ({ tag: 'rect', attrs: { x: String(x), y: '11', width: '4', height: '10', rx: '2', fill: '#17151e', transform: `rotate(-25 ${x} 16)` }, children: [] }))
    ] }
  }));
  const history = [
    { id: 'demo-1', role: 'user', text: 'What should I focus on today?' },
    { id: 'demo-2', role: 'bot', text: 'Your short build updates are starting the most conversations. Share one thing you shipped, and what you learned from it.' },
    { id: 'demo-3', role: 'user', text: 'I just finished the bot sidebar. Help me keep the update simple.' },
    { id: 'demo-4', role: 'bot', text: 'Try this:\n\nBuilt a little home for my Grok bots today. One focused chat, the others tucked away as tiny avatars. Much calmer.\n\nWhat would you add next?' }
  ];
  window.XWorkspaceTransport = (entry, engines, onState, onResult) => {
    const timer = setTimeout(() => onState({ ready: true, messages: history.map(row => ({ ...row })), error: '' }), 20);
    return { destroy() { clearTimeout(timer); }, history() {}, reconnect() {}, send(id) { onResult({ id, ok: false, error: 'This is a store preview; no messages are sent.' }); } };
  };
  const host = document.createElement('div'); host.id = 'x-workspace';
  const shadow = host.attachShadow({ mode: 'open' }); document.body.append(host);
  const engines = document.createElement('div'); engines.className = 'engines'; shadow.append(engines);
  const ui = window.XWorkspaceFloatingBots(shadow, { getSettings: () => settings, save() {}, engines, reconnectInbox() {} });
  ui.update(entries);
})();
