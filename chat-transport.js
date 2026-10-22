(() => {
  'use strict';
  globalThis.XWorkspaceTransport = function (entry, container, onState, onResult) {
    const href = globalThis.XWorkspaceUnread.chatPath(entry.href, location.origin);
    if (!href || !/^\/i\/chat\/bots\/[^/]+$/.test(href)) return null;
    let frame, destroyed = false, generation = 0, timer;
    let connected = false, previousState;
    function publish(ready, messages = [], error = '') {
      if (ready) connected = true;
      const state = { ready, connecting: !connected && !ready && !error, messages, error };
      const snapshot = JSON.stringify(state);
      if (snapshot === previousState) return;
      previousState = snapshot;
      onState(state);
    }
    function receive(event) {
      if (event.origin !== location.origin || event.source !== frame?.contentWindow) return;
      if (event.data?.type === 'xw-bot-route-ready') { frame.contentWindow.postMessage({ type: 'xw-open-conversation', href }, location.origin); return; }
      if (event.data?.href !== href) return;
      if (event.data.type === 'xw-bot-state') {
        if (event.data.ready === true) clearTimeout(timer);
        publish(event.data.ready === true, globalThis.XWorkspaceChatBridge.normalizeMessages(event.data.messages));
      }
      if (event.data.type === 'xw-bot-send-result') onResult(event.data);
      if (event.data.type === 'xw-bot-send-progress') onResult(event.data);
    }
    window.addEventListener('message', receive);
    async function load() {
      const current = ++generation;
      clearTimeout(timer); frame?.remove(); frame = undefined;
      connected = false; previousState = undefined;
      publish(false);
      try {
        const result = await chrome.runtime.sendMessage({ type: 'xw-prepare-chat' });
        if (!result?.ok) throw new Error('Could not prepare X Chat. Reload the extension.');
        if (destroyed || current !== generation) return;
        frame = document.createElement('iframe'); frame.name = 'x-workspace-bot-transport';
        frame.title = `X connection for ${entry.name}`; frame.src = `${location.origin}/i/chat`;
        container.append(frame);
        timer = setTimeout(() => publish(false, [], 'X is taking longer to connect. Check sign-in in X, then reconnect.'), 25000);
      } catch (error) { if (!destroyed && current === generation) publish(false, [], error.message); }
    }
    load();
    return {
      send(id, text, files = []) { frame?.contentWindow.postMessage({ type: 'xw-bot-send', href, id, text, files }, location.origin); },
      history() { frame?.contentWindow.postMessage({ type: 'xw-bot-history', href }, location.origin); },
      reconnect: load,
      destroy() { destroyed = true; ++generation; clearTimeout(timer); window.removeEventListener('message', receive); frame?.remove(); }
    };
  };
})();
