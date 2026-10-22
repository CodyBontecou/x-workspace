(() => {
  'use strict';
  const FRAME_NAME = 'x-workspace-native-chat';
  const defaults = { enabled: true, collapsed: false, width: 440 };
  const root = document.documentElement;
  const unread = globalThis.XWorkspaceUnread;

  // Only touch our own chat frame, never X's other embedded documents.
  if (window.top !== window) {
    if (window.name !== FRAME_NAME) return;
    root.classList.add('xw-frame');
    let ready = false;
    let observedRoot;
    let scheduled;
    let previous = '';
    let known = new Map();
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
        shadowObserver.observe(chatRoot, { childList: true, subtree: true, characterData: true, attributes: true, attributeFilter: ['class', 'aria-label', 'src', 'srcset', 'href'] });
        known = new Map();
      }
      known = unread.reconcile(known, unread.scan(chatRoot, location.origin));
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
      const link = Array.from(observedRoot?.querySelectorAll('a[href]') || []).find(link => unread.chatPath(link.getAttribute('href'), location.origin) === href);
      if (link) link.click(); else location.assign(href);
    });
    refresh();
    return;
  }

  let settings = { ...defaults };
  let mounted = false;
  let frame;
  let timeout;
  let loading = false;
  let loadGeneration = 0;
  const host = document.createElement('div');
  host.id = 'x-workspace';
  const shadow = host.attachShadow({ mode: 'open' });
  shadow.innerHTML = `
    <style>
      :host { all: initial; font: 13px -apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif; color: #e7e9ea; }
      :host([hidden]) { display: none !important; }
      * { box-sizing: border-box; } [hidden] { display: none !important; }
      button,a { font: inherit; color: inherit; } button { cursor: pointer; }
      button:focus-visible,a:focus-visible,[role=separator]:focus-visible { outline: 2px solid #1d9bf0; outline-offset: -3px; }
      .pane { position: fixed; inset: 0 0 0 auto; width: var(--xw-pane); z-index: 30; background: #000; border-left: 1px solid #2f3336; display: flex; flex-direction: column; transform: translateX(0); transition: transform 240ms cubic-bezier(0.32, 0.72, 0, 1), visibility 0s linear; }
      .pane.collapsed { transform: translateX(calc(100% + 8px)); visibility: hidden; pointer-events: none; transition-delay: 0s, 240ms; }
      .pane.instant { transition: none !important; }
      @media (prefers-reduced-motion: reduce) {
        .pane { transform: none; opacity: 1; transition: opacity 120ms cubic-bezier(0.23, 1, 0.32, 1), visibility 0s linear; }
        .pane.collapsed { transform: none; opacity: 0; transition-delay: 0s, 120ms; }
      }
      .bar { flex: 0 0 46px; display: flex; align-items: center; gap: 6px; padding: 0 12px; border-bottom: 1px solid #2f3336; }
      .title { font-weight: 650; flex: 1; } .bar button,.bar a { border: 0; background: transparent; border-radius: 6px; padding: 7px 9px; text-decoration: none; }
      .bar button:hover,.bar a:hover { background: #181818; }
      .body { flex: 1; position: relative; min-height: 0; }
      iframe { display: block; width: 100%; height: 100%; border: 0; background: #000; }
      .status { position: absolute; inset: 0; background: #000; padding: 36px 24px; line-height: 1.6; color: #8b98a5; }
      .status a { color: #1d9bf0; }
      .grip { position: absolute; left: -4px; top: 0; bottom: 0; width: 8px; cursor: col-resize; touch-action: none; z-index: 2; }
      .grip:hover,.grip:focus-visible { background: #1d9bf066; }
      .launcher { position: fixed; right: 20px; bottom: 20px; z-index: 30; }
      .open-chat { border: 1px solid #333; border-radius: 24px; background: #eff3f4; color: #0f1419; font-weight: 650; padding: 12px 18px; box-shadow: 0 4px 20px #0005; }
      .open-chat:active,.avatar:active { transform: scale(.97); }
      .avatars { position: absolute; right: 8px; bottom: calc(100% - 9px); display: flex; align-items: center; padding: 4px; isolation: isolate; }
      .avatar { display: grid; place-items: center; width: 32px; height: 32px; padding: 0; border: 2px solid #000; border-radius: 50%; background: #243b50; color: #fff; font-size: 11px; font-weight: 650; box-shadow: 0 0 0 1px #1d9bf0; position: relative; }
      .avatar + .avatar { margin-left: -6px; }
      .avatar img { width: 100%; height: 100%; object-fit: cover; border-radius: inherit; }
      .more { background: #1d9bf0; font-size: 10px; }
      @media (hover: hover) and (pointer: fine) { .avatar:hover { z-index: 2; box-shadow: 0 0 0 2px #1d9bf0; } .open-chat:hover { background: #dce2e5; } }
      .cover { position: fixed; inset: 0; z-index: 31; cursor: col-resize; }
    </style>
    <aside class="pane instant" aria-label="X chat workspace">
      <div class="grip" role="separator" aria-label="Resize chat pane" aria-orientation="vertical" tabindex="0" aria-valuemin="400" aria-valuemax="640"></div>
      <div class="bar"><span class="title">Chat workspace</span><button class="reload" aria-label="Reload chat" title="Reload chat">↻</button><a href="https://x.com/i/chat" target="_blank" rel="noopener noreferrer" aria-label="Open chat in a new tab" title="Open in new tab">↗</a><button class="collapse" aria-label="Collapse chat" title="Collapse chat">›</button></div>
      <div class="body"><div class="status" role="status">Loading X Chat…</div></div>
    </aside>
    <div class="launcher" hidden><div class="avatars" role="group" aria-label="Unread conversations" hidden></div><button class="open-chat">Open chat</button></div><div class="cover" hidden></div>`;
  const pane = shadow.querySelector('.pane');
  const launcher = shadow.querySelector('.launcher');
  const openChat = shadow.querySelector('.open-chat');
  const avatars = shadow.querySelector('.avatars');
  let unreadEntries = [];
  function renderUnread() {
    avatars.replaceChildren();
    avatars.hidden = unreadEntries.length === 0;
    openChat.setAttribute('aria-label', unreadEntries.length ? `Open chat, ${unreadEntries.length} unread conversations` : 'Open chat');
    for (const [index, entry] of unreadEntries.slice(0, 3).entries()) {
      const button = document.createElement('button');
      button.className = 'avatar'; button.style.zIndex = String(3 - index);
      button.title = `Unread: ${entry.name}`;
      button.setAttribute('aria-label', `Open unread conversation with ${entry.name}`);
      const initials = entry.name.trim().split(/\s+/).slice(0, 2).map(word => Array.from(word)[0] || '').join('').toUpperCase();
      button.textContent = initials || '?';
      if (entry.avatar) {
        const img = document.createElement('img'); img.alt = ''; img.src = entry.avatar;
        img.addEventListener('error', () => { button.textContent = initials || '?'; }, { once: true });
        button.replaceChildren(img);
      }
      button.addEventListener('click', event => {
        toggle(false, event);
        frame?.contentWindow.postMessage({ type: 'xw-open-conversation', href: entry.href }, location.origin);
      });
      avatars.append(button);
    }
    if (unreadEntries.length > 3) {
      const more = document.createElement('button'); more.className = 'avatar more';
      more.textContent = `+${unreadEntries.length - 3}`;
      more.setAttribute('aria-label', `${unreadEntries.length - 3} more unread conversations`);
      more.addEventListener('click', event => toggle(false, event)); avatars.append(more);
    }
  }
  const status = shadow.querySelector('.status');
  const grip = shadow.querySelector('.grip');
  const cover = shadow.querySelector('.cover');
  const save = () => chrome.storage.local.set(settings);
  // The 600px feed stays centered in the area to the right of the 76px rail.
  // Fit chat into its right gutter where possible, preserving X's 400px minimum.
  const availableWidth = () => Math.max(400, Math.min(640, Math.floor((root.clientWidth - 76 - 600) / 2)));
  const width = () => Math.max(400, Math.min(availableWidth(), Number(settings.width) || 440));
  const excluded = () => /^\/i\/(chat|flow|jf)(\/|$)/.test(location.pathname);
  async function loadChat() {
    const generation = ++loadGeneration;
    loading = true;
    clearTimeout(timeout);
    status.textContent = 'Preparing X Chat…';
    status.hidden = false;
    if (frame) frame.remove();
    frame = undefined;
    unreadEntries = []; renderUnread();
    try {
      const result = await chrome.runtime.sendMessage({ type: 'xw-prepare-chat' });
      if (!result?.ok) throw new Error(result?.error || 'Reload the extension to enable chat embedding.');
    } catch (error) {
      if (generation === loadGeneration) {
        loading = false;
        status.textContent = `Chat could not start. ${error.message} Then refresh X.`;
      }
      return;
    }
    if (generation !== loadGeneration) return;
    loading = false;
    status.textContent = 'Loading X Chat…';
    frame = document.createElement('iframe');
    frame.name = FRAME_NAME;
    frame.title = 'Native X Chat';
    frame.src = `${location.origin}/i/chat`;
    shadow.querySelector('.body').prepend(frame);
    timeout = setTimeout(() => {
      status.innerHTML = 'Chat is taking longer than expected. <a href="https://x.com/i/chat" target="_blank" rel="noopener noreferrer">Open X Chat in a new tab</a> to check sign-in or your passcode, then reload this pane.';
    }, 20000);
  }
  function render() {
    const active = settings.enabled && !excluded();
    const closed = settings.collapsed;
    root.classList.toggle('xw-active', active);
    host.hidden = !active;
    pane.classList.toggle('collapsed', closed);
    pane.inert = closed;
    pane.setAttribute('aria-hidden', String(closed));
    launcher.hidden = !closed;
    host.style.setProperty('--xw-pane', `${Math.min(width(), Math.max(0, root.clientWidth - 76))}px`);
    grip.setAttribute('aria-valuenow', String(width()));
    grip.setAttribute('aria-valuemax', String(availableWidth()));
    if (!active && (frame || loading)) {
      ++loadGeneration; loading = false; clearTimeout(timeout);
      frame?.remove(); frame = undefined;
      unreadEntries = []; renderUnread();
      chrome.runtime.sendMessage({ type: 'xw-release-chat' }).catch(() => {});
    }
    if (active && !frame && !loading) loadChat();
  }
  function toggle(collapsed, event) {
    // Initial mount and keyboard activation stay immediate. Pointer toggles use
    // interruptible CSS transitions, including a reversal partway through exit.
    pane.classList.toggle('instant', event?.detail === 0);
    settings.collapsed = collapsed; render(); save();
    if (collapsed) openChat.focus({ preventScroll: true });
    else shadow.querySelector('.collapse').focus({ preventScroll: true });
  }
  shadow.querySelector('.collapse').addEventListener('click', event => toggle(true, event));
  openChat.addEventListener('click', event => toggle(false, event));
  shadow.querySelector('.reload').addEventListener('click', loadChat);
  window.addEventListener('message', event => {
    if (event.origin !== location.origin || event.source !== frame?.contentWindow) return;
    if (event.data?.type === 'xw-chat-ready') { clearTimeout(timeout); status.hidden = true; }
    if (event.data?.type === 'xw-chat-unread') {
      unreadEntries = unread.normalize(event.data.entries, location.origin); renderUnread();
    }
  });
  grip.addEventListener('keydown', event => {
    if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
    event.preventDefault();
    settings.width = event.key === 'Home' ? 400 : event.key === 'End' ? availableWidth() : width() + (event.key === 'ArrowLeft' ? 20 : -20);
    settings.width = Math.max(400, Math.min(availableWidth(), settings.width));
    render(); save();
  });
  grip.addEventListener('pointerdown', event => {
    if (event.button !== 0) return;
    event.preventDefault(); grip.setPointerCapture(event.pointerId); cover.hidden = false;
    const move = event => { settings.width = Math.max(400, Math.min(availableWidth(), innerWidth - event.clientX)); render(); };
    const end = () => { cover.hidden = true; grip.removeEventListener('pointermove', move); grip.removeEventListener('pointerup', end); grip.removeEventListener('pointercancel', end); save(); };
    grip.addEventListener('pointermove', move); grip.addEventListener('pointerup', end); grip.addEventListener('pointercancel', end);
  });
  window.addEventListener('resize', render);
  chrome.storage.onChanged.addListener((changes, area) => {
    if (area !== 'local') return;
    for (const key of Object.keys(defaults)) if (changes[key]) settings[key] = changes[key].newValue ?? defaults[key];
    render();
  });
  chrome.storage.local.get(defaults).then(value => {
    settings = { ...defaults, ...value }; document.body.append(host); mounted = true; render();
  });
  // X navigates without a document reload. Only react to actual route changes.
  let route = location.pathname;
  new MutationObserver(() => {
    if (route === location.pathname) return;
    route = location.pathname; if (mounted) render();
  }).observe(document.body, { childList: true, subtree: true });
})();
