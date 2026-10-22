(() => {
  'use strict';
  globalThis.XWorkspaceTransport = function (entry, container, onState, onResult) {
    const href = globalThis.XWorkspaceUnread.chatPath(entry.href, location.origin);
    if (!href || !/^\/i\/chat\/bots\/[^/]+$/.test(href)) return null;
    let frame, destroyed = false, generation = 0, timer;
    function receive(event) {
      if (event.origin !== location.origin || event.source !== frame?.contentWindow) return;
      if (event.data?.type === 'xw-bot-route-ready') { frame.contentWindow.postMessage({ type: 'xw-open-conversation', href }, location.origin); return; }
      if (event.data?.href !== href) return;
      if (event.data.type === 'xw-bot-state') {
        if (event.data.ready === true) clearTimeout(timer);
        onState({ ready: event.data.ready === true, messages: globalThis.XWorkspaceChatBridge.normalizeMessages(event.data.messages), error: '' });
      }
      if (event.data.type === 'xw-bot-send-result') onResult(event.data);
    }
    window.addEventListener('message', receive);
    async function load() {
      const current = ++generation;
      clearTimeout(timer); frame?.remove(); frame = undefined;
      onState({ ready: false, messages: [], error: '' });
      try {
        const result = await chrome.runtime.sendMessage({ type: 'xw-prepare-chat' });
        if (!result?.ok) throw new Error('Could not prepare X Chat. Reload the extension.');
        if (destroyed || current !== generation) return;
        frame = document.createElement('iframe'); frame.name = 'x-workspace-bot-transport';
        frame.title = `X connection for ${entry.name}`; frame.src = `${location.origin}/i/chat`;
        container.append(frame);
        timer = setTimeout(() => onState({ ready: false, messages: [], error: 'X is taking longer to connect. Check sign-in in X, then reconnect.' }), 25000);
      } catch (error) { if (!destroyed && current === generation) onState({ ready: false, messages: [], error: error.message }); }
    }
    load();
    return {
      send(id, text) { frame?.contentWindow.postMessage({ type: 'xw-bot-send', href, id, text }, location.origin); },
      history() { frame?.contentWindow.postMessage({ type: 'xw-bot-history', href }, location.origin); },
      reconnect: load,
      destroy() { destroyed = true; ++generation; clearTimeout(timer); window.removeEventListener('message', receive); frame?.remove(); }
    };
  };
})();
