(() => {
  'use strict';
  const FRAME_NAME = 'x-workspace-native-chat';
  const defaults = { enabled: true, botPins: [], botWindows: {}, botPanels: null, botsVisible: true };
  const root = document.documentElement;
  const unread = globalThis.XWorkspaceUnread;
  const bots = globalThis.XWorkspaceBots;

  // Only touch our own chat frame, never X's other embedded documents.
  if (window.top !== window) {
    if (![FRAME_NAME, 'x-workspace-bot-transport'].includes(window.name)) return;
    const transport = window.name === 'x-workspace-bot-transport';
    let previousMessages = '';
    let targetConversation = transport && /^\/i\/chat\/bots\/[^/]+$/.test(location.pathname) ? location.pathname : null;
    let routeOpened = !!targetConversation;
    if (transport) globalThis.XWorkspaceChatBridge.connect(() => observedRoot, schedule, () => targetConversation);
    root.classList.add('xw-frame');
    let ready = false;
    let observedRoot;
    let scheduled;
    let previous = '';
    let known = new Map();
    let knownBots = new Map();
    let previousBots = '';
    const shadowObserver = new MutationObserver(schedule);
    function refresh() {
      scheduled = undefined;
      const embed = document.querySelector('[data-testid="xchatEmbedRoute"]');
      if (!ready && (embed || document.querySelector('input'))) {
        ready = true; parent.postMessage({ type: 'xw-chat-ready' }, location.origin);
      }
      const chatRoot = embed?.shadowRoot;
      if (!chatRoot) return;
      if (chatRoot !== observedRoot) {
        shadowObserver.disconnect(); observedRoot = chatRoot;
        shadowObserver.observe(chatRoot, { childList: true, subtree: true, characterData: true, attributes: true, attributeFilter: ['class', 'aria-label', 'src', 'srcset', 'href', 'disabled'] });
        known = new Map(); knownBots = new Map();
      }
      if (transport) {
        if (!targetConversation) { parent.postMessage({ type: 'xw-bot-route-ready' }, location.origin); return; }
        if (!routeOpened) {
          const link = Array.from(chatRoot.querySelectorAll('a[href]')).find(link => unread.chatPath(link.getAttribute('href'), location.origin) === targetConversation);
          if (!link) return;
          routeOpened = true; link.click(); schedule(); return;
        }
        const messages = globalThis.XWorkspaceChatBridge.scan(chatRoot);
        const input = chatRoot.querySelector('[data-testid="dm-composer-textarea"]');
        const state = { type: 'xw-bot-state', href: targetConversation, ready: !!input && !input.disabled, messages };
        const snapshot = JSON.stringify(state);
        if (snapshot !== previousMessages) { previousMessages = snapshot; parent.postMessage(state, location.origin); }
        return;
      }
      const rows = unread.scan(chatRoot, location.origin);
      known = unread.reconcile(known, rows);
      knownBots = bots.reconcile(knownBots, rows);
      const botEntries = [...knownBots.values()];
      const botSnapshot = JSON.stringify(botEntries);
      if (botSnapshot !== previousBots) {
        previousBots = botSnapshot;
        parent.postMessage({ type: 'xw-chat-bots', entries: botEntries }, location.origin);
      }
      const entries = [...known.values()];
      const snapshot = JSON.stringify(entries);
      if (snapshot !== previous) {
        previous = snapshot;
        parent.postMessage({ type: 'xw-chat-unread', entries }, location.origin);
      }
    }
    function schedule() { if (!scheduled) scheduled = setTimeout(refresh, 120); }
    new MutationObserver(schedule).observe(document.body, { childList: true, subtree: true });
    // A newly attached shadow root does not produce a document mutation.
    setInterval(schedule, 2000);
    window.addEventListener('message', event => {
      if (event.source !== parent || event.origin !== location.origin || event.data?.type !== 'xw-open-conversation') return;
      const href = unread.chatPath(event.data.href, location.origin);
      if (!href) return;
      if (transport) { if (!/^\/i\/chat\/bots\/[^/]+$/.test(href) || targetConversation && targetConversation !== href) return; targetConversation = href; schedule(); return; }
      const link = Array.from(observedRoot?.querySelectorAll('a[href]') || []).find(link => unread.chatPath(link.getAttribute('href'), location.origin) === href);
      if (link) link.click(); else location.assign(href);
    });
    refresh();
    return;
  }

  let settings = { ...defaults };
  let frame, ui, messageCache, loading = false, generation = 0, keepWorkspace = false;
  const host = document.createElement('div'); host.id = 'x-workspace';
  const shadow = host.attachShadow({ mode: 'open' });
  const engines = document.createElement('div'); engines.className = 'engines'; engines.inert = true; engines.setAttribute('aria-hidden', 'true'); shadow.append(engines);
  const save = () => chrome.storage.local.set(settings);
  const excluded = () => /^\/i\/(flow|jf)(\/|$)/.test(location.pathname) || !keepWorkspace && /^\/i\/chat(\/|$)/.test(location.pathname);
  window.addEventListener('xw-message-navigation', () => { keepWorkspace = true; });
  async function loadInbox() {
    const current = ++generation; loading = true; frame?.remove(); frame = undefined;
    try {
      const result = await chrome.runtime.sendMessage({ type: 'xw-prepare-chat' });
      if (!result?.ok) throw new Error('Could not prepare X Chat.');
      if (current !== generation) return;
      frame = document.createElement('iframe'); frame.name = FRAME_NAME;
      frame.title = 'X bot inbox connection'; frame.src = `${location.origin}/i/chat`; engines.append(frame);
    } catch { /* The bot rail offers a link to check sign-in. */ }
    finally { if (current === generation) loading = false; }
  }
  function render() {
    const active = settings.enabled && !excluded();
    root.classList.toggle('xw-active', active); host.hidden = !active;
    if (!active) {
      ++generation; loading = false; ui?.destroy(); ui = undefined; frame?.remove(); frame = undefined;
      chrome.runtime.sendMessage({ type: 'xw-release-chat' }).catch(() => {});
      return;
    }
    if (!ui) ui = globalThis.XWorkspaceFloatingBots(shadow, { getSettings: () => settings, save, engines, reconnectInbox: loadInbox, messageCache });
    ui.render();
    if (!frame && !loading) loadInbox();
  }
  window.addEventListener('message', event => {
    if (event.origin !== location.origin || event.source !== frame?.contentWindow) return;
    if (event.data?.type === 'xw-chat-bots') ui?.update(event.data.entries);
  });
  chrome.storage.onChanged.addListener((changes, area) => {
    if (area !== 'local') return;
    let changed = false;
    for (const key of Object.keys(defaults)) if (changes[key]) { settings[key] = changes[key].newValue ?? defaults[key]; changed = true; }
    if (changed) render();
  });
  Promise.all([chrome.storage.local.get(defaults), globalThis.XWorkspaceMessageCache(chrome.storage.local)]).then(([value, cache]) => {
    settings = { ...defaults, ...value }; messageCache = cache; document.body.append(host); render();
  });
  window.addEventListener('pagehide', () => { void messageCache?.flush(); });
  let route = location.pathname;
  new MutationObserver(() => { if (route !== location.pathname) { route = location.pathname; render(); } }).observe(document.body, { childList: true, subtree: true });
})();
