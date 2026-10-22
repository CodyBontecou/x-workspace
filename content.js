(() => {
  'use strict';
  const FRAME_NAME = 'x-workspace-native-chat';
  const defaults = { enabled: true, collapsed: false, width: 440 };
  const root = document.documentElement;

  // Only touch our own chat frame, never X's other embedded documents.
  if (window.top !== window) {
    if (window.name !== FRAME_NAME) return;
    root.classList.add('xw-frame');
    const announce = () => {
      const ready = document.querySelector('[data-testid="xchatEmbedRoute"], input');
      if (ready) { parent.postMessage({ type: 'xw-chat-ready' }, location.origin); observer.disconnect(); }
    };
    const observer = new MutationObserver(announce);
    observer.observe(document.body, { childList: true, subtree: true });
    announce();
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
      .pane { position: fixed; inset: 0 0 0 auto; width: var(--xw-pane); z-index: 30; background: #000; border-left: 1px solid #2f3336; display: flex; flex-direction: column; }
      .bar { flex: 0 0 46px; display: flex; align-items: center; gap: 6px; padding: 0 12px; border-bottom: 1px solid #2f3336; }
      .title { font-weight: 650; flex: 1; } .bar button,.bar a { border: 0; background: transparent; border-radius: 6px; padding: 7px 9px; text-decoration: none; }
      .bar button:hover,.bar a:hover { background: #181818; }
      .body { flex: 1; position: relative; min-height: 0; }
      iframe { display: block; width: 100%; height: 100%; border: 0; background: #000; }
      .status { position: absolute; inset: 0; background: #000; padding: 36px 24px; line-height: 1.6; color: #8b98a5; }
      .status a { color: #1d9bf0; }
      .grip { position: absolute; left: -4px; top: 0; bottom: 0; width: 8px; cursor: col-resize; touch-action: none; z-index: 2; }
      .grip:hover,.grip:focus-visible { background: #1d9bf066; }
      .launcher { position: fixed; right: 20px; bottom: 20px; z-index: 30; border: 1px solid #333; border-radius: 24px; background: #eff3f4; color: #0f1419; font-weight: 650; padding: 12px 18px; box-shadow: 0 4px 20px #0005; }
      .cover { position: fixed; inset: 0; z-index: 31; cursor: col-resize; }
    </style>
    <aside class="pane" aria-label="X chat workspace">
      <div class="grip" role="separator" aria-label="Resize chat pane" aria-orientation="vertical" tabindex="0" aria-valuemin="400" aria-valuemax="640"></div>
      <div class="bar"><span class="title">Chat workspace</span><button class="reload" aria-label="Reload chat" title="Reload chat">↻</button><a href="https://x.com/i/chat" target="_blank" rel="noopener noreferrer" aria-label="Open chat in a new tab" title="Open in new tab">↗</a><button class="collapse" aria-label="Collapse chat" title="Collapse chat">›</button></div>
      <div class="body"><div class="status" role="status">Loading X Chat…</div></div>
    </aside>
    <button class="launcher" hidden>Open chat</button><div class="cover" hidden></div>`;
  const pane = shadow.querySelector('.pane');
  const launcher = shadow.querySelector('.launcher');
  const status = shadow.querySelector('.status');
  const grip = shadow.querySelector('.grip');
  const cover = shadow.querySelector('.cover');
  const save = () => chrome.storage.local.set(settings);
  const availableWidth = () => Math.max(400, Math.min(640, innerWidth - 676));
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
    const compact = innerWidth < 1100;
    const closed = settings.collapsed;
    root.classList.toggle('xw-active', active);
    root.style.setProperty('--xw-pane', active && !closed && !compact ? `${width()}px` : '0px');
    host.hidden = !active;
    pane.hidden = closed;
    launcher.hidden = !closed;
    host.style.setProperty('--xw-pane', `${compact ? Math.min(width(), innerWidth - 76) : width()}px`);
    grip.setAttribute('aria-valuenow', String(width()));
    if (!active && (frame || loading)) {
      ++loadGeneration; loading = false; clearTimeout(timeout);
      frame?.remove(); frame = undefined;
      chrome.runtime.sendMessage({ type: 'xw-release-chat' }).catch(() => {});
    }
    if (active && !closed && !frame && !loading) loadChat();
  }
  function toggle(collapsed) { settings.collapsed = collapsed; render(); save(); }
  shadow.querySelector('.collapse').addEventListener('click', () => toggle(true));
  launcher.addEventListener('click', () => toggle(false));
  shadow.querySelector('.reload').addEventListener('click', loadChat);
  window.addEventListener('message', event => {
    if (event.origin !== location.origin || event.source !== frame?.contentWindow || event.data?.type !== 'xw-chat-ready') return;
    clearTimeout(timeout); status.hidden = true;
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
