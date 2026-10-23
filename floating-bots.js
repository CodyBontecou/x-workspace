(() => {
  'use strict';
  globalThis.XWorkspaceFloatingBots = function (shadow, { getSettings, save, engines, reconnectInbox, messageCache }) {
    const bridge = globalThis.XWorkspaceChatBridge;
    const sessions = new Map(), rows = new Map(), restored = new Set();
    let entries = messageCache?.entries() || [], botsVisible = true, destroyed = false;
    const style = document.createElement('style');
    style.textContent = `
      :host { all: initial; font: 13px -apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif; color: #f3f1f7; color-scheme: dark; --ease-out: cubic-bezier(0.23,1,0.32,1); }
      :host([hidden]),[hidden] { display: none !important; } * { box-sizing: border-box; }
      button,textarea,a,summary { font: inherit; color: inherit; } button,summary { cursor: pointer; }
      button:focus-visible,a:focus-visible,summary:focus-visible { outline: 2px solid #bca2ff; outline-offset: 3px; }
      button:disabled { cursor: default; opacity: .35; }
      .engines { position: fixed; left: -10000px; top: 0; width: 440px; height: 720px; visibility: hidden; pointer-events: none; }
      .engines iframe { position: absolute; inset: 0; width: 440px; height: 720px; border: 0; }
      .bot-dock { position: fixed; top: 20px; right: 18px; bottom: 20px; z-index: 100; width: min(360px,calc(100vw - 30px)); display: flex; flex-direction: column; align-items: flex-end; gap: 10px; pointer-events: none; }
      .bot-dock button,.bot-dock a,.bot-dock summary { pointer-events: auto; }
      .dock-open { margin: 0 4px 0 0; position: relative; flex: 0 0 44px; width: 44px; height: 44px; border: 0; background: transparent; border-radius: 50%; padding: 5px; display: grid; place-items: center; color: #fff; }
      .dock-open svg { display: block; width: 34px; height: 34px; filter: drop-shadow(0 2px 5px #0006); }
      .dock-unread { position: absolute; right: 2px; top: 2px; width: 7px; height: 7px; border-radius: 50%; background: #c3a5ff; box-shadow: 0 0 0 2px #17161e; }
      .dock-chips { flex: 1; min-height: 0; display: block; width: 100%; overflow-y: auto; overflow-anchor: none; overscroll-behavior: contain; scrollbar-width: thin; scrollbar-color: #45404e transparent; padding: 4px; visibility: hidden; opacity: 0; transform: translateY(12px); transition: opacity 200ms var(--ease-out),transform 200ms var(--ease-out),visibility 0s 200ms; }
      .rail-content { display: flex; flex-direction: column; gap: 6px; width: 100%; }
      .dock-chips.is-visible { visibility: visible; opacity: 1; transform: translateY(0); transition-delay: 0s; }
      .dock-chips:not(.is-visible),.dock-chips:not(.is-visible) * { pointer-events: none !important; }
      .dock-chips.instant { transition: none; }
      .bot-tooltip { position: fixed; z-index: 101; max-width: calc(100vw - 16px); padding: 5px 8px; border: 1px solid #ffffff1c; border-radius: 7px; background: #242128; color: #f3f1f7; font-size: 11px; line-height: 1.4; overflow-wrap: anywhere; box-shadow: 0 3px 12px #0005; pointer-events: none; }
      .dock-footer { display: flex; align-items: center; justify-content: flex-end; gap: 8px; width: 100%; flex-shrink: 0; }
      .dock-switcher { display: flex; align-items: center; gap: 3px; min-width: 0; overflow-x: auto; overflow-y: hidden; overscroll-behavior: contain; scrollbar-width: none; pointer-events: auto; visibility: visible; transition: visibility 0s; }
      .dock-switcher::-webkit-scrollbar { display: none; }
      .dock-switcher.is-hidden { visibility: hidden; transition-delay: var(--bot-exit-duration,180ms); }
      .dock-switcher.is-hidden,.dock-switcher.is-hidden * { pointer-events: none !important; }
      .dock-switcher .rail-bot { width: 30px; flex: 0 0 30px; opacity: 1; transition: opacity 180ms var(--ease-out); transition-delay: var(--bot-enter-delay,0ms); }
      .dock-switcher.is-hidden .rail-bot { opacity: 0; transition-delay: var(--bot-exit-delay,0ms); }
      .dock-switcher.instant,.dock-switcher.instant .rail-bot { transition: none; }
      .dock-switcher .dock-chip { width: 30px; height: 34px; border-radius: 10px; }
      .dock-switcher .rail-name,.dock-switcher .chat-reveal { display: none; }
      .dock-switcher .rail-icon { flex-basis: 30px; width: 30px; height: 30px; }
      .dock-switcher .bot-avatar { width: 23px; height: 23px; border-radius: 8px; }
      .dock-switcher .dock-unread { width: 5px; height: 5px; right: 0; top: 0; }
      .bot-dock.is-focused .dock-chips { overflow: hidden; }
      .bot-dock.is-focused .rail-content { height: 100%; padding-top: 0 !important; padding-bottom: 0 !important; }
      .bot-dock.is-focused .dock-switcher .dock-chip[aria-expanded="false"] .bot-avatar { opacity: .4; }
      .dock-switcher .dock-chip[aria-expanded="true"] .bot-avatar { opacity: 1; }
      .bot-dock.is-focused .chat-reveal.is-open { flex: 1; min-height: 0; height: auto !important; }
      .bot-dock.is-focused .conversation { height: 100%; max-height: none; min-height: 0; }
      .bot-dock.is-focused .message-viewport { flex: 1; }

      .rail-bot { flex: none; width: 100%; pointer-events: auto; }
      .dock-chip { display: flex; align-items: center; justify-content: flex-end; gap: 10px; width: fit-content; max-width: 100%; margin-left: auto; height: 44px; border: 0; background: transparent; border-radius: 12px; padding: 0; text-align: right; }
      .rail-icon { position: relative; display: grid; place-items: center; flex: 0 0 44px; width: 44px; height: 44px; }
      .rail-name { min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; color: #d8d2e0; font-size: 12px; font-weight: 550; text-shadow: 0 1px 5px #000,0 0 12px #000; }
      .dock-chip[aria-expanded="true"] .rail-name { color: #fff; }
      .bot-avatar { display: grid; place-items: center; width: 32px; height: 32px; border-radius: 11px; background: #ffffff0b; overflow: hidden; color: #d6c8f3; font-size: 11px; font-weight: 650; pointer-events: none; }
      .bot-avatar.has-icon { background: transparent; } .bot-avatar img { width: 100%; height: 100%; object-fit: cover; }
      .rail-empty { margin: 0; padding: 10px 4px; text-align: right; color: #a79caf; }
      .rail-empty a { color: inherit; }
      .chat-reveal { height: 0; opacity: 0; transform: translateY(-6px); overflow: hidden; transition: height 200ms var(--ease-out),opacity 150ms var(--ease-out),transform 200ms var(--ease-out); }
      .chat-reveal.is-open { opacity: 1; transform: translateY(0); }
      .chat-reveal.instant { transition: none; }
      .conversation { pointer-events: auto; max-height: max(140px,min(380px,calc(100vh - 160px))); display: flex; flex-direction: column; padding: 6px 4px 12px; }
      .message-viewport { position: relative; display: flex; flex-direction: column; flex: 0 1 auto; min-height: 0; }
      .jump-latest { position: absolute; bottom: 14px; left: 50%; transform: translateX(-50%); display: grid; place-items: center; width: 36px; height: 36px; border: 1px solid #ffffff30; border-radius: 50%; background: #302b3b; color: #f3f1f7; box-shadow: 0 3px 12px #0006; font-size: 21px; }
      .jump-latest:hover { background: #433a52; }
      .message-log { display: flex; flex-direction: column; flex: 1 1 auto; min-height: 0; overflow-y: auto; overscroll-behavior: contain; scrollbar-width: thin; scrollbar-color: #45404e transparent; padding: 6px 6px 0; }
      .message-stack { flex: 0 0 auto; margin-top: auto; width: 100%; }
      .message { width: fit-content; max-width: 92%; white-space: pre-wrap; overflow-wrap: anywhere; line-height: 1.55; margin: 0 0 10px; padding: 10px 14px; border-radius: 19px 19px 19px 6px; background: #26242d; color: #f0edf5; box-shadow: 0 3px 12px #0002; }
      .message.user { margin-left: auto; background: #3478f6; color: #fff; border-radius: 19px 19px 6px 19px; }
      .message.system { max-width: 100%; margin: 6px auto 12px; padding: 4px 10px; border-radius: 12px; background: #151419cc; color: #a69bad; text-align: center; font-size: 11px; box-shadow: none; }
      .message.pending { opacity: .6; } .pending-label { display: block; font-size: 10px; margin-top: 4px; }
      .message.has-images { padding: 6px; max-width: 92%; }
      .message.system.has-images { margin: 0 0 10px auto; background: #26242d; text-shadow: none; }
      .message-image-button { display: block; max-width: 100%; padding: 0; margin: 0; border: 0; border-radius: 14px; overflow: hidden; background: #ffffff08; cursor: zoom-in; }
      .message-image { display: block; width: auto; max-width: 100%; max-height: 240px; min-width: 64px; min-height: 64px; object-fit: contain; }
      .message-image-label { display: block; margin: 5px 6px; color: inherit; font-size: 11px; overflow-wrap: anywhere; }
      .message.has-images > .message-copy { display: block; padding: 4px 8px; }
      .message.has-files { padding: 6px; min-width: min(230px,100%); }
      .message.system.has-files { margin: 0 0 10px auto; background: #26242d; text-align: left; }
      .message.has-files > .message-copy { display: block; padding: 4px 8px; }
      .file-card { display: flex; align-items: center; gap: 10px; width: 100%; min-width: 0; padding: 11px; border: 1px solid #ffffff20; border-radius: 13px; background: #ffffff08; text-align: left; }
      .file-card + .file-card { margin-top: 6px; }
      .file-card-type { display: grid; place-items: center; flex: 0 0 42px; height: 46px; border: 1px solid #ffffff25; border-radius: 7px; background: #ffffff0a; font-size: 10px; font-weight: 650; letter-spacing: .3px; }
      .file-card-info { display: flex; flex: 1; flex-direction: column; gap: 3px; min-width: 0; }
      .file-card-name { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-size: 12px; font-weight: 550; }
      .file-card-detail { font-size: 10px; opacity: .65; }
      .file-card-action { flex: 0 0 auto; font-size: 18px; opacity: .7; }
      .image-viewer { max-width: min(960px,calc(100vw - 32px)); max-height: calc(100vh - 32px); padding: 40px 12px 12px; border: 1px solid #ffffff30; border-radius: 18px; background: #17151d; color: #f3f1f7; }
      .image-viewer::backdrop { background: #000b; }
      .image-viewer img { display: block; max-width: 100%; max-height: calc(100vh - 110px); object-fit: contain; }
      .image-viewer-close { position: absolute; right: 8px; top: 8px; width: 28px; height: 28px; border: 0; border-radius: 50%; background: #ffffff18; color: #fff; }
      .message a { color: #d4c6ff; text-decoration: underline; text-underline-offset: 3px; overflow-wrap: anywhere; } .message.user a { color: #fff; }
      .chat-notice { margin: 0; padding: 6px 10px; font-size: 11px; line-height: 1.5; color: #c8bad5; text-shadow: 0 1px 5px #000; } .chat-notice:empty { display: none; }
      .chat-compose { flex-shrink: 0; display: flex; align-items: flex-end; gap: 7px; padding: 8px 6px 0; }
      .compose-wrap { min-width: 0; flex: 1; display: flex; flex-direction: column; gap: 8px; padding: 9px 9px 9px 14px; border: 1px solid #ffffff20; border-radius: 22px; background: #1d1b23; }
      .compose-line { display: flex; align-items: flex-end; gap: 10px; width: 100%; min-width: 0; }
      .attach-button { display: grid; place-items: center; flex: 0 0 26px; width: 26px; height: 28px; padding: 4px; border: 0; border-radius: 50%; background: transparent; color: #b8afc6; }
      .attach-button svg { width: 18px; height: 18px; }
      .attachment-list { display: flex; gap: 7px; width: 100%; overflow-x: auto; padding: 3px 2px; scrollbar-width: thin; }
      .attachment-card { position: relative; display: flex; align-items: center; gap: 7px; flex: 0 0 auto; max-width: 190px; padding: 6px 28px 6px 6px; border: 1px solid #ffffff20; border-radius: 12px; background: #ffffff08; }
      .attachment-card img { width: 44px; height: 44px; border-radius: 7px; object-fit: cover; }
      .attachment-name { min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-size: 11px; }
      .attachment-remove { position: absolute; right: 3px; top: 3px; width: 22px; height: 22px; border: 0; border-radius: 50%; background: #ffffff10; color: #ded6e8; }
      .compose-wrap.is-dragging { border-color: #bca2ff; background: #292333; }
      .compose-wrap:focus-within { border-color: #bca2ff80; box-shadow: 0 0 0 1px #bca2ff18; }
      .chat-input { min-width: 0; flex: 1; max-height: 120px; resize: none; border: 0; outline: none; padding: 4px 0; background: transparent; color: #f3f1f7; line-height: 1.5; overflow-wrap: anywhere; overscroll-behavior: contain; scrollbar-width: thin; scrollbar-color: #ffffff30 transparent; }
      .chat-input::-webkit-scrollbar { width: 4px; }
      .chat-input::-webkit-scrollbar-thumb { border-radius: 4px; background: #ffffff30; }
      .chat-input::-webkit-scrollbar-track { background: transparent; }
      .chat-input::placeholder { color: #93899f; }
      .send-button { display: grid; place-items: center; flex: 0 0 28px; width: 28px; height: 28px; border: 0; border-radius: 50%; background: #3478f6; color: #fff; font-size: 19px; }
      .chat-actions { position: relative; flex-shrink: 0; margin-bottom: 8px; }
      .chat-actions summary { list-style: none; display: grid; place-items: center; width: 24px; height: 24px; border-radius: 50%; color: #b8afc6; background: #1d1b23; } .chat-actions summary::-webkit-details-marker { display: none; }
      .chat-menu { position: absolute; bottom: 32px; left: 0; z-index: 2; min-width: 170px; padding: 5px; border: 1px solid #ffffff16; border-radius: 12px; background: #242128; box-shadow: 0 8px 24px #0006; }
      .chat-menu a,.chat-menu button { display: block; width: 100%; padding: 9px 10px; border: 0; border-radius: 7px; background: transparent; color: #d8d2e0; font-size: 12px; text-align: left; text-decoration: none; white-space: nowrap; }
      @media (hover:hover) and (pointer:fine) { .dock-chip:hover,.chat-actions summary:hover,.chat-menu a:hover,.chat-menu button:hover { background: #ffffff09; } }
      @media (prefers-reduced-motion:reduce) { .dock-switcher .rail-bot,.dock-switcher.is-hidden .rail-bot { transform: none; transition: opacity 100ms var(--ease-out); transition-delay: 0s; } .dock-switcher.is-hidden { transition-delay: 100ms; } .dock-switcher.instant,.dock-switcher.instant .rail-bot { transition: none; } .chat-reveal { transition: opacity 100ms var(--ease-out); transform: none; } .dock-chips { transform: none; transition: opacity 100ms var(--ease-out),visibility 0s 100ms; } .dock-chips.is-visible { transform: none; transition-delay: 0s; } }
    `;
    shadow.append(style);
    const imageViewer = document.createElement('dialog'); imageViewer.className = 'image-viewer'; imageViewer.setAttribute('aria-label', 'Image preview');
    const viewerClose = document.createElement('button'); viewerClose.type = 'button'; viewerClose.className = 'image-viewer-close'; viewerClose.textContent = '×'; viewerClose.setAttribute('aria-label', 'Close image preview');
    const viewerImage = document.createElement('img'); imageViewer.append(viewerClose, viewerImage); shadow.append(imageViewer);
    viewerClose.addEventListener('click', () => imageViewer.close());
    imageViewer.addEventListener('click', event => { if (event.target === imageViewer) imageViewer.close(); });
    imageViewer.addEventListener('close', () => viewerImage.removeAttribute('src'));
    const dock = document.createElement('div'); dock.className = 'bot-dock';
    const list = document.createElement('div'); list.className = 'dock-chips'; list.setAttribute('aria-label', 'Your bots'); list.inert = true; list.setAttribute('aria-hidden', 'true');
    const content = document.createElement('div'); content.className = 'rail-content'; list.append(content);
    const toggle = document.createElement('button'); toggle.className = 'dock-open'; toggle.type = 'button';
    const svgNS = 'http://www.w3.org/2000/svg';
    const botIcon = document.createElementNS(svgNS, 'svg'); botIcon.setAttribute('viewBox', '0 0 64 64'); botIcon.setAttribute('aria-hidden', 'true'); botIcon.setAttribute('focusable', 'false');
    const faceMask = document.createElementNS(svgNS, 'mask'); const maskId = `xw-launcher-${crypto.randomUUID()}`; faceMask.id = maskId;
    const silhouette = document.createElementNS(svgNS, 'path'); silhouette.setAttribute('d', 'M34 3C50 2 61 14 61 30C62 47 51 60 34 61C17 63 4 53 3 37C1 20 15 5 34 3Z'); silhouette.setAttribute('fill', 'white'); faceMask.append(silhouette);
    for (const [x, y] of [[37, 13], [51, 9]]) { const eye = document.createElementNS(svgNS, 'rect'); eye.setAttribute('x', String(x)); eye.setAttribute('y', String(y)); eye.setAttribute('width', '7'); eye.setAttribute('height', '16'); eye.setAttribute('rx', '3.5'); eye.setAttribute('transform', `rotate(-30 ${x + 3.5} ${y + 8})`); eye.setAttribute('fill', 'black'); faceMask.append(eye); }
    const defs = document.createElementNS(svgNS, 'defs'); defs.append(faceMask);
    const face = document.createElementNS(svgNS, 'rect'); face.setAttribute('width', '64'); face.setAttribute('height', '64'); face.setAttribute('fill', 'currentColor'); face.setAttribute('mask', `url(#${maskId})`); botIcon.append(defs, face);
    const dockUnread = document.createElement('span'); dockUnread.className = 'dock-unread'; dockUnread.hidden = true; dockUnread.setAttribute('aria-hidden', 'true'); toggle.append(botIcon, dockUnread); toggle.title = 'Your bots'; toggle.setAttribute('aria-label', 'Your bots');
    const footer = document.createElement('div'); footer.className = 'dock-footer';
    const switcher = document.createElement('div'); switcher.className = 'dock-switcher'; switcher.setAttribute('aria-label', 'Your bots');
    footer.append(switcher, toggle); dock.append(list, footer);
    shadow.append(dock);
    // Render outside the scrolling avatar row so the label cannot be clipped.
    const tooltip = document.createElement('div'); tooltip.className = 'bot-tooltip';
    tooltip.id = `xw-bot-tooltip-${crypto.randomUUID()}`; tooltip.setAttribute('role', 'tooltip'); tooltip.hidden = true; shadow.append(tooltip);
    let tooltipRow;
    function hideTooltip() {
      tooltipRow?.button.removeAttribute('aria-describedby'); tooltipRow = undefined; tooltip.hidden = true;
    }
    function showTooltip(row) {
      if (destroyed || !botsVisible) return;
      hideTooltip(); tooltipRow = row; tooltip.textContent = row.entry.name; tooltip.hidden = false;
      row.button.setAttribute('aria-describedby', tooltip.id);
      const anchor = row.icon.getBoundingClientRect(), label = tooltip.getBoundingClientRect();
      tooltip.style.left = `${Math.max(8, Math.min(innerWidth - label.width - 8, anchor.left + (anchor.width - label.width) / 2))}px`;
      tooltip.style.top = `${Math.max(8, anchor.top - label.height - 7)}px`;
    }
    toggle.addEventListener('click', event => {
      switcher.classList.toggle('instant', !shouldAnimate(event));
      list.classList.toggle('instant', !shouldAnimate(event));
      botsVisible = !botsVisible;
      hideTooltip();
      if (!botsVisible && (list.contains(shadow.activeElement) || switcher.contains(shadow.activeElement))) toggle.focus({ preventScroll: true });
      if (botsVisible) {
        for (const session of sessions.values()) if (session.open) session.unread = 0;
        if (!entries.length) reconnectInbox();
      }
      renderRail();
    });
    switcher.addEventListener('scroll', hideTooltip, { passive: true });
    list.addEventListener('scroll', hideTooltip, { passive: true });
    const motionQuery = matchMedia('(prefers-reduced-motion: reduce)');
    const shouldAnimate = event => event?.detail > 0 && !motionQuery.matches;
    function alignListBottom() {
      // Freeze this leading space while conversations change height. Only rows
      // below the clicked bot reflow; overflow scrolls instead of lifting its row.
      content.style.paddingTop = '0px'; content.style.paddingBottom = '0px';
      if (dock.classList.contains('is-focused')) return;
      const children = [...content.children];
      const contentHeight = children.reduce((height, child) => height + child.getBoundingClientRect().height, 0) + Math.max(0, children.length - 1) * 6;
      content.style.paddingTop = `${Math.max(0, list.clientHeight - contentHeight - 8)}px`;
    }
    dock.addEventListener('keydown', event => {
      if (event.key !== 'Escape') return;
      if (!tooltip.hidden) { hideTooltip(); event.preventDefault(); event.stopPropagation(); return; }
      const actions = event.target.closest('.chat-actions');
      if (actions?.open) { actions.open = false; actions.querySelector('summary').focus(); return; }
      const focused = [...sessions.values()].find(session => session.open);
      if (focused) { setSessionOpen(focused, false); focused.row.button.focus({ preventScroll: true }); }
    });
    function avatar(entry) {
      const el = document.createElement('span'); el.className = 'bot-avatar';
      const initials = entry.name.trim().split(/\s+/).slice(0, 2).map(word => Array.from(word)[0] || '').join('').toUpperCase(); el.textContent = initials || '?';
      const icon = globalThis.XWorkspaceAvatars.render(entry.avatarIcon);
      if (icon) { el.classList.add('has-icon'); el.replaceChildren(icon); }
      else if (entry.avatar) { const img = document.createElement('img'); img.src = entry.avatar; img.alt = ''; img.addEventListener('error', () => { el.textContent = initials || '?'; }, { once: true }); el.replaceChildren(img); }
      return el;
    }
    function savedPanels() {
      const saved = getSettings().botPanels;
      // Old floating-window coordinates are deliberately unused in this layout.
      const value = saved && typeof saved === 'object' && !Array.isArray(saved) ? saved : Object.fromEntries(Object.entries(getSettings().botWindows || {}).map(([href, box]) => [href, { open: box?.open === true && box?.minimized !== true }]));
      return Object.fromEntries(Object.entries(value).filter(([href, box]) => /^\/i\/chat\/bots\/[^/]+$/.test(href) && box && typeof box === 'object').slice(-100).map(([href, box]) => [href, { open: box.open === true }]));
    }
    function remember(session) {
      const saved = savedPanels();
      for (const box of Object.values(saved)) box.open = false;
      delete saved[session.entry.href]; saved[session.entry.href] = { open: session.open };
      getSettings().botPanels = Object.fromEntries(Object.entries(saved).slice(-100)); save();
    }
    function reserveScrollSpace(session, nextHeight) {
      const shrinking = session.reveal.getBoundingClientRect().height - nextHeight;
      if (shrinking <= 0) return;
      // Keep enough trailing scroll space to avoid the browser clamping scrollTop
      // when a scrolled conversation closes. That clamp would move its bot row.
      const extra = Math.max(0, Math.ceil(list.scrollTop + list.clientHeight - (list.scrollHeight - shrinking)));
      if (extra) content.style.paddingBottom = `${parseFloat(getComputedStyle(content).paddingBottom) + extra}px`;
    }
    function updateLatestButton(session) {
      session.latest.hidden = !session.open || session.log.scrollHeight - session.log.scrollTop - session.log.clientHeight < 70;
    }
    function scrollToLatest(session) {
      session.followLatest = true;
      session.log.scrollTop = session.log.scrollHeight;
      updateLatestButton(session);
    }
    function sizePanel(session) {
      if (!session.open) return;
      session.input.style.height = 'auto'; session.input.style.height = `${Math.min(120, session.input.scrollHeight)}px`;
      if (dock.classList.contains('is-focused')) { session.reveal.style.height = ''; return; }
      const height = session.el.getBoundingClientRect().height;
      reserveScrollSpace(session, height); session.reveal.style.height = `${height}px`;
    }
    function setSessionOpen(session, open, { animate = false, focus = false, persist = true } = {}) {
      if (open) for (const other of sessions.values()) {
        if (other !== session && other.open) setSessionOpen(other, false, { persist: false });
      }
      if (open) botsVisible = true;
      session.open = open;
      if (!open && session.el.contains(shadow.activeElement)) session.row.button.focus({ preventScroll: true });
      session.actions.open = false;
      if (!animate) session.reveal.classList.add('instant');
      session.reveal.inert = !open; session.reveal.setAttribute('aria-hidden', String(!open));
      session.reveal.classList.toggle('is-open', open);
      const height = open ? session.el.getBoundingClientRect().height : 0;
      reserveScrollSpace(session, height); session.reveal.style.height = `${height}px`;
      session.row.button.setAttribute('aria-expanded', String(open));
      if (open) { session.unread = 0; session.followLatest = true; if (focus) session.input.focus({ preventScroll: true }); }
      if (!animate) { void session.reveal.offsetHeight; session.reveal.classList.remove('instant'); }
      if (persist) remember(session);
      renderRail();
      // The focused layout reparents the log and changes its height. Scroll afterward.
      if (open) scrollToLatest(session); else updateLatestButton(session);
    }
    function renderRail() {
      if (destroyed) return;
      const hadRows = rows.size > 0;
      const focusedControl = shadow.activeElement;
      const pinned = globalThis.XWorkspaceBots.pins(getSettings().botPins, location.origin);
      const items = globalThis.XWorkspaceBots.sessions(entries, pinned);
      const paths = new Set(items.map(entry => entry.href));
      for (const session of sessions.values()) if (!paths.has(session.entry.href)) { items.push(session.entry); paths.add(session.entry.href); }
      const focused = [...sessions.values()].find(session => session.open);
      const wasFocused = dock.classList.contains('is-focused');
      dock.classList.toggle('is-focused', !!focused);
      switcher.classList.toggle('is-hidden', !botsVisible);
      switcher.setAttribute('aria-hidden', String(!botsVisible));
      switcher.inert = !botsVisible;
      const showConversation = botsVisible && (!!focused || !items.length);
      list.classList.toggle('is-visible', showConversation);
      list.inert = !showConversation; list.setAttribute('aria-hidden', String(!showConversation));
      if (!!focused !== wasFocused) { list.scrollTop = 0; alignListBottom(); }
      for (const [href, row] of rows) if (!paths.has(href)) { row.el.remove(); rows.delete(href); }
      content.querySelector('.rail-empty')?.remove();
      const staggerStep = Math.min(40, 240 / Math.max(1, items.length - 1));
      switcher.style.setProperty('--bot-exit-duration', `${180 + Math.max(0, items.length - 1) * staggerStep}ms`);
      let switcherIndex = 0;
      items.forEach(entry => {
        let row = rows.get(entry.href);
        if (!row) {
          const el = document.createElement('section'); el.className = 'rail-bot'; el.dataset.href = entry.href;
          const button = document.createElement('button'); button.className = 'dock-chip'; button.type = 'button'; button.setAttribute('aria-expanded', 'false');
          const name = document.createElement('span'); name.className = 'rail-name';
          const icon = document.createElement('span'); icon.className = 'rail-icon';
          const reveal = document.createElement('div'); reveal.className = 'chat-reveal'; reveal.id = `xw-conversation-${crypto.randomUUID()}`; reveal.inert = true; reveal.setAttribute('aria-hidden', 'true'); button.setAttribute('aria-controls', reveal.id);
          button.append(name, icon); el.append(button, reveal); row = { el, button, name, icon, reveal, entry }; rows.set(entry.href, row);
          icon.addEventListener('pointerenter', event => { if (event.pointerType === 'mouse' && matchMedia('(hover:hover) and (pointer:fine)').matches) showTooltip(row); });
          icon.addEventListener('pointerleave', hideTooltip);
          button.addEventListener('focus', () => { if (button.matches(':focus-visible')) showTooltip(row); });
          button.addEventListener('blur', hideTooltip);
          button.addEventListener('pointerdown', hideTooltip);
          button.addEventListener('click', event => {
            hideTooltip();
            const session = sessions.get(entry.href);
            if (session) setSessionOpen(session, !session.open, { animate: shouldAnimate(event), focus: false });
            else openSession(row.entry, { animate: shouldAnimate(event) });
          });
        }
        row.entry = entry;
        const session = sessions.get(entry.href);
        if (session) session.entry = entry;
        const snapshot = JSON.stringify([entry.name, entry.avatar, entry.avatarIcon]);
        if (row.snapshot !== snapshot) { row.snapshot = snapshot; row.name.textContent = entry.name; row.icon.replaceChildren(avatar(entry)); }
        const unread = session ? session.unread > 0 : entry.unread;
        let dot = row.icon.querySelector('.dock-unread');
        if (unread && !dot) { dot = document.createElement('span'); dot.className = 'dock-unread'; dot.setAttribute('aria-hidden', 'true'); row.icon.append(dot); }
        if (!unread) dot?.remove();
        const status = session?.open ? 'Collapse' : 'Open';
        row.button.setAttribute('aria-label', `${status} ${entry.name}${unread ? ', unread' : ''}`);
        row.button.setAttribute('aria-expanded', String(session?.open === true));
        // Keep every avatar in the footer while the selected conversation fills the list.
        if (session === focused && focused) {
          if (row.reveal.parentNode !== content) content.append(row.reveal);
        } else if (row.reveal.parentNode !== row.el) row.el.append(row.reveal);
        const destination = switcher;
        const index = switcherIndex++;
        // Reveal from the Grokbot launcher outward; keep long rows responsive.
        const delay = (items.length - 1 - index) * staggerStep;
        row.el.style.setProperty('--bot-enter-delay', `${delay}ms`);
        row.el.style.setProperty('--bot-exit-delay', `${index * staggerStep}ms`);
        const current = destination.children[index]; if (current !== row.el) destination.insertBefore(row.el, current || null);
      });
      const unread = items.filter(entry => { const session = sessions.get(entry.href); return session ? session.unread > 0 : entry.unread; }).length;
      const launcherLabel = botsVisible ? 'Hide bots' : 'Show bots';
      toggle.setAttribute('aria-expanded', String(botsVisible));
      toggle.title = launcherLabel;
      toggle.setAttribute('aria-label', `${launcherLabel}${unread ? `, ${unread} unread` : ''}`);
      dockUnread.hidden = !unread;
      if (!items.length) {
        const note = document.createElement('p'); note.className = 'rail-empty';
        const link = document.createElement('a'); link.href = `${location.origin}/i/chat`; link.target = '_blank'; link.rel = 'noopener noreferrer'; link.textContent = 'Open X inbox to load bots ↗'; note.append(link); content.append(note);
      }
      if (!!focused !== wasFocused || getComputedStyle(list).visibility === 'hidden' || !hadRows && rows.size) alignListBottom();
      if (focused) sizePanel(focused);
      if (tooltipRow) { if (tooltipRow.button.isConnected && !tooltipRow.button.closest('[hidden]')) showTooltip(tooltipRow); else hideTooltip(); }
      // Moving a bot between the list and switcher must retain keyboard focus.
      if (focusedControl?.isConnected && shadow.activeElement !== focusedControl && !focusedControl.closest('[hidden]')) focusedControl.focus({ preventScroll: true });
    }
    function restorePanels() {
      if ([...sessions.values()].some(session => session.open)) return;
      // Older versions allowed several open panels; restore the most recent one.
      const saved = Object.entries(savedPanels()).reverse().find(([href, box]) => box.open && !restored.has(href) && rows.has(href));
      if (saved) openSession(rows.get(saved[0]).entry, { restoring: true });
    }
    function openSession(entry, { restoring = false, animate = false } = {}) {
      if (typeof entry === 'string') entry = rows.get(entry)?.entry;
      if (!entry || !rows.has(entry.href)) return;
      if (sessions.has(entry.href)) { setSessionOpen(sessions.get(entry.href), true, { animate }); return; }
      restored.add(entry.href);
      const row = rows.get(entry.href), reveal = row.reveal;
      const cachedMessages = messageCache?.get(entry.href) || [];
      const el = document.createElement('section'); el.className = 'conversation'; el.setAttribute('aria-label', `Chat with ${entry.name}`);
      const log = document.createElement('div'); log.className = 'message-log'; log.setAttribute('role', 'log'); log.setAttribute('aria-label', `${entry.name} messages`); log.setAttribute('aria-live', 'polite');
      const viewport = document.createElement('div'); viewport.className = 'message-viewport';
      const latest = document.createElement('button'); latest.type = 'button'; latest.className = 'jump-latest'; latest.textContent = '↓'; latest.title = 'Back to latest message'; latest.setAttribute('aria-label', 'Back to latest message'); latest.hidden = true;
      viewport.append(log, latest);
      const messagesEl = document.createElement('div'); messagesEl.className = 'message-stack'; log.append(messagesEl);
      const notice = document.createElement('p'); notice.className = 'chat-notice'; notice.setAttribute('role', 'status'); notice.textContent = cachedMessages.length ? '' : 'Connecting to X…';
      const form = document.createElement('form'); form.className = 'chat-compose';
      const actions = document.createElement('details'); actions.className = 'chat-actions';
      const more = document.createElement('summary'); more.textContent = '⋯'; more.setAttribute('aria-label', `Options for ${entry.name}`); more.title = 'Chat options';
      const menu = document.createElement('div'); menu.className = 'chat-menu';
      const history = document.createElement('button'); history.type = 'button'; history.textContent = 'Load earlier messages';
      const native = document.createElement('a'); native.href = `${location.origin}${entry.href}`; native.target = '_blank'; native.rel = 'noopener noreferrer'; native.textContent = 'Open in X ↗';
      const reconnect = document.createElement('button'); reconnect.type = 'button'; reconnect.textContent = 'Reconnect';
      menu.append(history, native, reconnect); actions.append(more, menu);
      menu.addEventListener('click', event => { if (event.target.closest('button,a')) actions.open = false; });
      el.addEventListener('focusout', event => { if (!el.contains(event.relatedTarget)) actions.open = false; });
      const compose = document.createElement('div'); compose.className = 'compose-wrap';
      const attachmentList = document.createElement('div'); attachmentList.className = 'attachment-list'; attachmentList.hidden = true; attachmentList.setAttribute('aria-label', 'Attachments');
      const composeLine = document.createElement('div'); composeLine.className = 'compose-line';
      const picker = document.createElement('input'); picker.type = 'file'; picker.multiple = true; picker.hidden = true;
      const attach = document.createElement('button'); attach.type = 'button'; attach.className = 'attach-button'; attach.title = 'Attach files'; attach.setAttribute('aria-label', `Attach files to ${entry.name}`);
      const clip = document.createElementNS(svgNS, 'svg'); clip.setAttribute('viewBox', '0 0 24 24'); clip.setAttribute('fill', 'none'); clip.setAttribute('stroke', 'currentColor'); clip.setAttribute('stroke-width', '1.7'); clip.setAttribute('stroke-linecap', 'round'); clip.setAttribute('aria-hidden', 'true');
      const clipPath = document.createElementNS(svgNS, 'path'); clipPath.setAttribute('d', 'M8 12.5 14.5 6a3.5 3.5 0 0 1 5 5l-9 9a5 5 0 0 1-7-7l9-9a2 2 0 0 1 3 3l-8 8a.8.8 0 0 1-1-1l7-7'); clip.append(clipPath); attach.append(clip);
      const input = document.createElement('textarea'); input.className = 'chat-input'; input.rows = 1; input.maxLength = 30000; input.placeholder = 'Message…'; input.setAttribute('aria-label', `Message ${entry.name}`);
      const send = document.createElement('button'); send.type = 'submit'; send.className = 'send-button'; send.textContent = '↑'; send.setAttribute('aria-label', `Send to ${entry.name}`); send.disabled = true;
      composeLine.append(attach, input, send); compose.append(attachmentList, composeLine, picker); form.append(actions, compose); el.append(viewport, notice, form); reveal.append(el);
      const session = { entry, row, el, reveal, log, messagesEl, latest, followLatest: true, input, send, notice, reconnect, actions, attachments: [], open: false, ready: false, messages: cachedMessages, pending: new Map(), sendingId: null, initialized: false, unread: 0 };
      sessions.set(entry.href, session);
      latest.addEventListener('click', () => { scrollToLatest(session); input.focus({ preventScroll: true }); });
      log.addEventListener('scroll', () => {
        if (!session.open || !log.clientHeight) return;
        session.followLatest = log.scrollHeight - log.scrollTop - log.clientHeight < 70;
        updateLatestButton(session);
      }, { passive: true });
      // Keep the latest message visible as attachments and the viewport change size.
      session.scrollObserver = new ResizeObserver(() => {
        if (!session.open) return;
        if (session.followLatest) scrollToLatest(session); else updateLatestButton(session);
      });
      session.scrollObserver.observe(log); session.scrollObserver.observe(messagesEl);
      void reveal.offsetHeight;
      function updateControls() { input.disabled = !!session.sendingId; attach.disabled = !!session.sendingId; reconnect.disabled = !!session.sendingId; attachmentList.querySelectorAll('button').forEach(button => { button.disabled = !!session.sendingId; }); send.disabled = !session.ready || !!session.sendingId || (!input.value.trim() && !session.attachments.length); }
      function renderAttachments() {
        attachmentList.replaceChildren(); attachmentList.hidden = !session.attachments.length;
        session.attachments.forEach(item => {
          const card = document.createElement('div'); card.className = 'attachment-card';
          if (item.url) { const image = document.createElement('img'); image.src = item.url; image.alt = ''; card.append(image); }
          const label = document.createElement('span'); label.className = 'attachment-name'; label.textContent = item.file.name; label.title = `${item.file.name} (${Math.ceil(item.file.size / 1024)} KB)`;
          const remove = document.createElement('button'); remove.type = 'button'; remove.className = 'attachment-remove'; remove.textContent = '×'; remove.setAttribute('aria-label', `Remove ${item.file.name}`);
          remove.addEventListener('click', () => { if (session.sendingId) return; if (item.url) URL.revokeObjectURL(item.url); session.attachments = session.attachments.filter(value => value !== item); renderAttachments(); input.focus(); });
          card.append(label, remove); attachmentList.append(card);
        }); updateControls(); sizePanel(session);
      }
      session.releaseAttachments = () => { for (const item of session.attachments) if (item.url) URL.revokeObjectURL(item.url); session.attachments = []; };
      function addFiles(files) {
        if (session.sendingId || !files.length) return;
        try {
          bridge.validateFiles([...session.attachments.map(item => item.file), ...files]);
          session.attachments.push(...files.map(file => ({ file, url: /^image\/(png|jpeg|gif|webp|avif|bmp)$/.test(file.type) ? URL.createObjectURL(file) : null })));
          notice.textContent = ''; renderAttachments(); input.focus();
        } catch (error) { notice.textContent = error.message; }
      }
      attach.addEventListener('click', () => picker.click());
      picker.addEventListener('change', () => { addFiles(Array.from(picker.files)); picker.value = ''; });
      input.addEventListener('paste', event => { const files = Array.from(event.clipboardData?.files || []); if (files.length) { event.preventDefault(); addFiles(files); } });
      compose.addEventListener('dragover', event => { if (Array.from(event.dataTransfer?.types || []).includes('Files')) { event.preventDefault(); compose.classList.add('is-dragging'); } });
      compose.addEventListener('dragleave', event => { if (!compose.contains(event.relatedTarget)) compose.classList.remove('is-dragging'); });
      compose.addEventListener('drop', event => { compose.classList.remove('is-dragging'); const files = Array.from(event.dataTransfer?.files || []); if (files.length) { event.preventDefault(); addFiles(files); } });
      session.updateControls = updateControls;
      session.transport = globalThis.XWorkspaceTransport(entry, engines, state => {
        const previousIds = new Set(session.messages.map(row => row.id));
        session.ready = state.ready;
        session.messages = bridge.mergeMessages(session.messages, state.messages);
        if (state.messages.length) messageCache?.put(session.entry, session.messages);
        if (session.initialized && (!session.open || !botsVisible)) session.unread += state.messages.filter(row => row.role === 'bot' && !previousIds.has(row.id)).length;
        if (state.messages.length) session.initialized = true;
        for (const row of state.messages) {
          if (row.role !== 'user') continue;
          for (const [id, pending] of session.pending) if (!pending.files.length && pending.text === row.text && !pending.baseline.has(row.id)) { clearTimeout(pending.timer); session.pending.delete(id); if (session.sendingId === id) session.sendingId = null; break; }
        }
        const status = state.error || (state.connecting && !session.messages.length ? 'Connecting to X…' : '');
        if (notice.textContent !== status) notice.textContent = status;
        updateControls(); renderMessages(session); renderRail();
      }, result => {
        const pending = session.pending.get(result.id); if (!pending) return;
        if (result.type === 'xw-bot-send-progress') { pending.status = 'Uploading attachments…'; renderMessages(session); return; }
        clearTimeout(pending.timer); session.sendingId = null;
        if (result.ok === true) { pending.status = 'Submitted to X'; if (pending.files.length) { session.pending.delete(result.id); session.releaseAttachments(); renderAttachments(); } }
        else { session.pending.delete(result.id); input.value = pending.text; notice.textContent = typeof result.error === 'string' ? result.error.slice(0, 300) : 'X could not submit this message. Your draft is preserved.'; }
        updateControls(); renderMessages(session);
      });
      if (!session.transport) { session.ready = false; notice.textContent = 'This is not a supported bot session.'; }
      input.addEventListener('input', () => { sizePanel(session); updateControls(); });
      input.addEventListener('keydown', event => { if (event.key === 'Enter' && !event.shiftKey && !event.isComposing) { event.preventDefault(); form.requestSubmit(); } });
      form.addEventListener('submit', event => {
        event.preventDefault(); const text = input.value;
        if ((!text.trim() && !session.attachments.length) || !session.open || !session.ready || session.sendingId || !session.transport) return;
        const id = crypto.randomUUID();
        const files = session.attachments.map(item => item.file);
        const pending = { text, files: files.map(file => file.name), status: files.length ? 'Uploading attachments…' : 'Handing to X…', baseline: new Set(session.messages.map(row => row.id)) };
        pending.timer = setTimeout(() => { if (!session.pending.has(id)) return; session.pending.delete(id); if (session.sendingId === id) session.sendingId = null; input.value = text; notice.textContent = 'Delivery was not confirmed. Check the conversation in X before retrying. Your draft is preserved.'; updateControls(); renderMessages(session); }, files.length ? 75000 : 12000);
        session.pending.set(id, pending); session.sendingId = id; input.value = ''; notice.textContent = ''; updateControls(); renderMessages(session); session.transport.send(id, text, files);
      });
      history.addEventListener('click', () => { session.transport?.history(); });
      reconnect.addEventListener('click', () => session.transport?.reconnect());
      setSessionOpen(session, true, { animate, persist: !restoring });
      renderMessages(session);
    }
    function renderMessages(session) {
      const nearBottom = session.followLatest;
      const scroll = session.log.scrollTop;
      session.messageNodes ||= new Map();
      const rows = session.messages.map(row => ({ ...row, key: row.id }));
      if (!rows.length && session.ready && !session.pending.size) rows.push({ key: 'empty-placeholder', text: 'A fresh little conversation. Say hello when you’re ready.', role: 'system' });
      for (const [id, pending] of session.pending) rows.push({ key: `pending:${id}`, text: [pending.text, ...pending.files.map(name => `📎 ${name}`)].filter(Boolean).join('\n'), role: 'user', pending: pending.status });
      const keys = new Set(rows.map(row => row.key));
      for (const [key, node] of session.messageNodes) if (!keys.has(key)) { node.remove(); session.messageNodes.delete(key); }
      rows.forEach((row, index) => {
        let bubble = session.messageNodes.get(row.key);
        if (!bubble) { bubble = document.createElement('div'); session.messageNodes.set(row.key, bubble); }
        const snapshot = JSON.stringify([row.text, row.role, row.pending, row.links, row.images, row.files, row.files?.length ? session.ready : null]);
        if (bubble.dataset.snapshot !== snapshot) {
          bubble.dataset.snapshot = snapshot;
          bubble.className = `message ${row.role}${row.pending ? ' pending' : ''}${row.images?.length ? ' has-images' : ''}${row.files?.length ? ' has-files' : ''}`; bubble.replaceChildren();
          for (const attachment of row.images || []) {
            const button = document.createElement('button'); button.type = 'button'; button.className = 'message-image-button'; button.setAttribute('aria-label', `View ${attachment.alt || 'image attachment'}`);
            const image = document.createElement('img'); image.className = 'message-image'; image.src = attachment.src; image.alt = attachment.alt || 'Image attachment'; image.referrerPolicy = 'no-referrer'; image.decoding = 'async';
            image.addEventListener('load', () => { sizePanel(session); if (session.followLatest) scrollToLatest(session); else updateLatestButton(session); });
            image.addEventListener('error', () => { button.hidden = true; sizePanel(session); });
            button.addEventListener('click', () => { viewerImage.src = attachment.src; viewerImage.alt = image.alt; imageViewer.showModal(); });
            button.append(image); bubble.append(button);
            const caption = document.createElement('span'); caption.className = 'message-image-label'; caption.textContent = image.alt; bubble.append(caption);
          }
          for (const file of row.files || []) {
            const button = document.createElement('button'); button.type = 'button'; button.className = 'file-card'; button.disabled = !session.ready; button.setAttribute('aria-label', `Download ${file.name}`); button.title = file.name;
            const extension = file.name.split('.').pop().toUpperCase();
            const icon = document.createElement('span'); icon.className = 'file-card-type'; icon.textContent = extension.length <= 5 ? extension : 'FILE'; icon.setAttribute('aria-hidden', 'true');
            const info = document.createElement('span'); info.className = 'file-card-info';
            const name = document.createElement('span'); name.className = 'file-card-name'; name.textContent = file.name;
            const detail = document.createElement('span'); detail.className = 'file-card-detail'; detail.textContent = [extension.length <= 12 ? `${extension} file` : 'File', file.size].filter(Boolean).join(' · ');
            const action = document.createElement('span'); action.className = 'file-card-action'; action.textContent = '↓'; action.setAttribute('aria-hidden', 'true');
            info.append(name, detail); button.append(icon, info, action); bubble.append(button);
            button.addEventListener('click', async () => {
              if (!session.ready || !session.transport) return;
              button.disabled = true; button.setAttribute('aria-busy', 'true');
              try { await session.transport.downloadFile(row.id, file); }
              catch (error) { session.notice.textContent = error.message; }
              finally { button.removeAttribute('aria-busy'); button.disabled = !session.ready; }
            });
          }
          const copy = document.createElement('span'); copy.className = 'message-copy';
          const attachmentLabels = [...(row.images || []).map(image => `[${image.alt}]`), ...(row.files || []).map(file => `[${file.name}]`)].join('').replace(/\s/g, '');
          const attachmentOnly = attachmentLabels && row.text.replace(/\s/g, '') === attachmentLabels;
          for (const part of attachmentOnly ? [] : bridge.messageParts(row)) {
            if (!part.href) { copy.append(document.createTextNode(part.text)); continue; }
            const link = document.createElement('a'); link.href = part.href; link.textContent = part.text; link.rel = 'noopener noreferrer';
            link.addEventListener('click', event => globalThis.XWorkspaceNavigation.follow(event, part.href)); copy.append(link);
          }
          if (copy.childNodes.length) bubble.append(copy);
          bubble.setAttribute('aria-label', row.role === 'user' ? 'You' : row.role === 'bot' ? session.entry.name : 'Activity');
          if (row.pending) { const label = document.createElement('span'); label.className = 'pending-label'; label.textContent = row.pending; bubble.append(label); }
        }
        const current = session.messagesEl.children[index];
        if (current !== bubble) session.messagesEl.insertBefore(bubble, current || null);
      });
      sizePanel(session);
      if (nearBottom) scrollToLatest(session); else { session.log.scrollTop = scroll; updateLatestButton(session); }
    }
    const resize = () => { hideTooltip(); for (const session of sessions.values()) sizePanel(session); alignListBottom(); };
    window.addEventListener('resize', resize);
    return {
      update(value) { entries = globalThis.XWorkspaceBots.normalize(value, location.origin); renderRail(); restorePanels(); },
      render() { renderRail(); restorePanels(); },
      openSession,
      destroy() { hideTooltip(); tooltip.remove(); imageViewer.close(); imageViewer.remove(); destroyed = true; window.removeEventListener('resize', resize); for (const session of sessions.values()) { session.scrollObserver.disconnect(); session.transport?.destroy(); session.releaseAttachments(); for (const pending of session.pending.values()) clearTimeout(pending.timer); } sessions.clear(); rows.clear(); dock.remove(); style.remove(); }
    };
  };
})();
