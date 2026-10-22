(() => {
  'use strict';
  const MAX_TEXT = 30000;
  // X embeds decrypted attachments as data URLs. Convert each mounted image
  // once so state messages carry a short, live URL rather than image bytes.
  const imageSources = new WeakMap();
  const imageURLs = new Set();
  let imageBytes = 0;
  function readImageSource(node) {
    const src = node.currentSrc || node.getAttribute('src');
    if (typeof src !== 'string' || !src.startsWith('data:')) return src;
    const previous = imageSources.get(node);
    if (previous?.src === src) return previous.url;
    if (src.length > 36 * 1024 * 1024 || imageBytes - (previous?.size || 0) + src.length * .75 > 64 * 1024 * 1024 || imageURLs.size >= 100 || !/^data:image\/(?:png|jpeg|gif|webp|avif|bmp);base64,[A-Za-z0-9+/=]+$/.test(src)) return null;
    try {
      const comma = src.indexOf(','), type = src.slice(5, src.indexOf(';'));
      const bytes = Uint8Array.from(atob(src.slice(comma + 1)), char => char.charCodeAt(0));
      const url = URL.createObjectURL(new Blob([bytes], { type }));
      if (previous?.url) { URL.revokeObjectURL(previous.url); imageURLs.delete(previous.url); imageBytes -= previous.size; }
      imageSources.set(node, { src, url, size: bytes.length }); imageURLs.add(url); imageBytes += bytes.length; return url;
    } catch { return null; }
  }
  function validateFiles(files = []) {
    if (!Array.isArray(files) || files.length > 6) throw new Error('Attach up to 6 files per message.');
    let total = 0;
    for (const file of files) {
      if (!(file instanceof Blob) || typeof file.name !== 'string' || !file.name || file.name.length > 255 || !file.size) throw new Error('Choose a non-empty file.');
      const limit = file.type.startsWith('video/') ? 200 : 25;
      if (file.size > limit * 1024 * 1024) throw new Error(`${file.name} exceeds the ${limit} MB file limit.`);
      total += file.size;
    }
    if (total > 200 * 1024 * 1024) throw new Error('Keep the total attachment size under 200 MB.');
    return files;
  }
  function safeLink(value) {
    if (typeof value !== 'string' || !value || value.length > 4096) return null;
    try {
      const url = new URL(value, location.origin);
      return ['https:', 'http:'].includes(url.protocol) && !url.username && !url.password ? url.href : null;
    } catch { return null; }
  }
  function normalizeLinks(links, text) {
    if (!Array.isArray(links)) return [];
    let end = 0;
    return links.slice(0, 100).filter(link => link && Number.isInteger(link.start) && Number.isInteger(link.end))
      .sort((a, b) => a.start - b.start).flatMap(link => {
        const href = safeLink(link.href);
        if (!href || link.start < end || link.start < 0 || link.end <= link.start || link.end > text.length) return [];
        end = link.end; return [{ start: link.start, end: link.end, href }];
      });
  }
  function normalizeImages(images) {
    if (!Array.isArray(images)) return [];
    const seen = new Set();
    return images.slice(0, 6).flatMap(image => {
      if (!image || typeof image.src !== 'string' || image.src.length > 4096) return [];
      try {
        const url = new URL(image.src);
        const allowed = url.protocol === 'blob:' ? url.origin === location.origin :
          url.protocol === 'https:' && ['pbs.twimg.com', 'ton.twitter.com', 'abs.twimg.com'].includes(url.hostname);
        if (!allowed || url.username || url.password || seen.has(url.href)) return [];
        seen.add(url.href);
        return [{ src: url.href, alt: typeof image.alt === 'string' ? image.alt.slice(0, 200) : 'Image attachment' }];
      } catch { return []; }
    });
  }
  function readMessage(element) {
    // Read text and link ranges together; never copy native HTML into our UI.
    if (!element.childNodes) return { text: element.innerText || element.textContent || '' };
    let text = ''; const links = [], images = [];
    const newline = () => { if (text && !text.endsWith('\n')) text += '\n'; };
    function visit(node) {
      if (text.length >= MAX_TEXT) return;
      if (node.nodeType === 3) { text += node.textContent.slice(0, MAX_TEXT - text.length); return; }
      if (node.nodeType !== 1 || ['SCRIPT', 'STYLE', 'NOSCRIPT'].includes(node.tagName) || node.hidden || node.getAttribute('aria-hidden') === 'true') return;
      if (node.tagName === 'BR') { text += '\n'; return; }
      if (node.tagName === 'IMG') {
        const alt = node.getAttribute('alt') || 'Image attachment';
        text += `[${alt}]`;
        images.push({ src: readImageSource(node), alt }); return;
      }
      const block = /^(DIV|P|LI|UL|OL|BLOCKQUOTE|PRE|H[1-6])$/.test(node.tagName);
      if (block) newline();
      const start = text.length;
      for (const child of node.childNodes) visit(child);
      if (node.tagName === 'A' && text.length > start) links.push({ start, end: text.length, href: node.getAttribute('href') });
      if (block) newline();
    }
    for (const child of element.childNodes) visit(child);
    text = text.slice(0, MAX_TEXT).trimEnd();
    return { text, links: normalizeLinks(links, text), images: normalizeImages(images) };
  }
  function messageParts(row) {
    const text = typeof row.text === 'string' ? row.text.slice(0, MAX_TEXT) : '';
    const links = normalizeLinks(row.links, text);
    // Plain pasted URLs also work, without replacing native linked labels.
    for (const match of text.matchAll(/(?:https?:\/\/|www\.)[^\s<>]+/gi)) {
      if (links.length >= 100) break;
      let label = match[0].replace(/[.,;:!?]+$/, '');
      for (const [open, close] of [['(', ')'], ['[', ']'], ['{', '}']]) {
        while (label.endsWith(close) && label.split(close).length > label.split(open).length) label = label.slice(0, -1);
      }
      const start = match.index, end = start + label.length;
      if (links.some(link => start < link.end && end > link.start)) continue;
      const href = safeLink(/^www\./i.test(label) ? `https://${label}` : label);
      if (href) links.push({ start, end, href });
    }
    const parts = []; let at = 0;
    for (const link of links.sort((a, b) => a.start - b.start)) {
      if (link.start > at) parts.push({ text: text.slice(at, link.start) });
      parts.push({ text: text.slice(link.start, link.end), href: link.href }); at = link.end;
    }
    if (at < text.length) parts.push({ text: text.slice(at) });
    return parts;
  }
  function normalizeMessages(rows) {
    const seen = new Set();
    if (!Array.isArray(rows)) return [];
    return rows.slice(-250).flatMap(row => {
      if (!row || typeof row.id !== 'string' || !row.id || row.id.length > 240 || seen.has(row.id)) return [];
      const images = normalizeImages(row.images);
      const text = (typeof row.text === 'string' ? row.text.slice(0, MAX_TEXT) : '') || images.map(image => `[${image.alt || 'Image attachment'}]`).join('\n');
      if (!text.trim() && !images.length) return [];
      seen.add(row.id);
      const links = normalizeLinks(row.links, text);
      return [{ id: row.id, text, role: ['user', 'bot', 'system'].includes(row.role) ? row.role : 'system', ...(links.length ? { links } : {}), ...(images.length ? { images } : {}) }];
    });
  }
  function mergeMessages(previous, incoming) {
    const next = normalizeMessages(incoming);
    if (!next.length) return previous;
    const ids = new Set(next.map(row => row.id));
    const previousIds = new Set(previous.map(row => row.id));
    const shared = new Set([...previousIds].filter(id => ids.has(id)));
    // X may replace its temporary outgoing row ID with a server ID. Match only
    // disappearing/replacing user rows in the same gap between stable IDs, so
    // virtualization and intentionally repeated messages retain their history.
    function gaps(rows) {
      const right = []; let anchor = null;
      for (let i = rows.length - 1; i >= 0; i--) { right[i] = anchor; if (shared.has(rows[i].id)) anchor = rows[i].id; }
      let left = null;
      return rows.map((row, i) => {
        const key = left || right[i] ? JSON.stringify([left, right[i], row.text]) : null;
        if (shared.has(row.id)) left = row.id;
        return { row, key };
      });
    }
    const candidates = new Map();
    for (const { row, key } of gaps(next)) if (key && row.role === 'user' && !previousIds.has(row.id)) candidates.set(key, (candidates.get(key) || 0) + 1);
    const replaced = new Set();
    for (const { row, key } of gaps(previous)) {
      if (key && row.role === 'user' && !ids.has(row.id) && candidates.get(key)) {
        replaced.add(row.id); candidates.set(key, candidates.get(key) - 1);
      }
    }
    const anchor = previous.findIndex(row => ids.has(row.id));
    const retained = previous.filter(row => !ids.has(row.id) && !replaced.has(row.id));
    const at = anchor < 0 ? retained.length : previous.slice(0, anchor).filter(row => !ids.has(row.id) && !replaced.has(row.id)).length;
    retained.splice(at, 0, ...next);
    return retained.slice(-250);
  }
  function scan(root) {
    const rows = [];
    for (const item of root.querySelectorAll('[data-testid="dm-message-scroller"] [data-dm-item-key]')) {
      const id = item.getAttribute('data-dm-item-key');
      if (!id || id.startsWith('sep-')) continue;
      const bubble = item.querySelector('.rounded-chat');
      const alignment = item.querySelector('.flex.w-full.flex-wrap');
      const role = bubble || alignment && item.querySelector('img')?.tagName === 'IMG' ? alignment?.classList.contains('justify-end') ? 'user' : 'bot' : 'system';
      rows.push({ id, ...readMessage(bubble || item), role });
    }
    return normalizeMessages(rows);
  }
  function connect(getRoot, refresh, getPath = () => location.pathname) {
    let sending = false;
    const handled = new Set();
    async function waitFor(check, timeout) {
      const deadline = Date.now() + timeout;
      do { if (check()) return true; await new Promise(resolve => setTimeout(resolve, 100)); } while (Date.now() < deadline);
      return check();
    }
    async function receive(event) {
      if (event.source !== parent || event.origin !== location.origin || event.data?.href !== getPath()) return;
      const data = event.data, root = getRoot();
      if (data.type === 'xw-bot-history') { root?.querySelector('[data-testid="dm-message-scroller"]')?.scrollTo({ top: 0 }); return; }
      if (data.type !== 'xw-bot-send' || typeof data.id !== 'string' || data.id.length > 120 || handled.has(data.id)) return;
      const reply = (ok, error) => parent.postMessage({ type: 'xw-bot-send-result', href: getPath(), id: data.id, ok, error }, location.origin);
      if (sending) { reply(false, 'This chat is still sending a message.'); return; }
      const text = typeof data.text === 'string' ? data.text : '';
      let files;
      try { files = validateFiles(data.files); } catch (error) { reply(false, error.message); return; }
      if ((!text.trim() && !files.length) || text.length > MAX_TEXT) { reply(false, 'Write a message of 30,000 characters or fewer, or attach a file.'); return; }
      const input = root?.querySelector('[data-testid="dm-composer-textarea"]');
      const form = input?.closest('form');
      if (!input || input.disabled || !form) { reply(false, 'X Chat is not ready. Open the connection panel to check sign-in.'); return; }
      // A native draft may belong to the user. Never overwrite a different one.
      if (input.value && input.value !== text) { reply(false, 'There is a different draft in X. Open this conversation in X to review it.'); return; }
      const removals = () => Array.from(form.querySelectorAll?.('button[aria-label^="Remove "]') || []);
      if (removals().length) { reply(false, 'There are attachments in X’s draft. Open this conversation in X to review them, or reconnect before retrying.'); return; }
      const fileInput = files.length ? root.querySelector('input[type="file"]') : null;
      if (files.length && !fileInput) { reply(false, 'X’s attachment control is unavailable. Open this conversation in X.'); return; }
      sending = true; handled.add(data.id);
      if (handled.size > 100) handled.delete(handled.values().next().value);
      try {
        if (files.length) {
          parent.postMessage({ type: 'xw-bot-send-progress', href: getPath(), id: data.id, status: 'Uploading attachments…' }, location.origin);
          const transfer = new DataTransfer();
          for (const file of files) transfer.items.add(file);
          fileInput.files = transfer.files;
          fileInput.dispatchEvent(new Event('change', { bubbles: true, composed: true }));
          const uploaded = await waitFor(() => {
            if (!input.isConnected || getPath() !== data.href) return true;
            return removals().length === files.length && !/Uploading(?:\.{3}|…)/i.test(form.textContent || '') && !form.querySelector('[role="progressbar"]') &&
              !!form.querySelector('[data-testid="dm-composer-send-button"]:not(:disabled),button[aria-label="Send"]:not(:disabled)');
          }, 60000);
          if (!uploaded || !input.isConnected || getPath() !== data.href) throw new Error('Attachments did not finish uploading. Your files are preserved here. Open in X to review its draft, or reconnect before retrying.');
        }
        const setter = Object.getOwnPropertyDescriptor(input.ownerDocument.defaultView.HTMLTextAreaElement.prototype, 'value').set;
        setter.call(input, text);
        input.dispatchEvent(new Event('input', { bubbles: true, composed: true }));
        // React must commit the updated draft before its submit handler runs.
        await new Promise(resolve => setTimeout(resolve, 80));
        if (input.value !== text || !input.isConnected) throw new Error('The X composer changed. Your draft is still here.');
        let submit;
        const ready = await waitFor(() => {
          submit = form.querySelector('[data-testid="dm-composer-send-button"]') || form.querySelector('button[type="submit"]');
          return !!submit && !submit.disabled && submit.getAttribute?.('aria-disabled') !== 'true';
        }, 2000);
        if (!ready) throw new Error('X’s Send button is not ready. Your draft is preserved.');
        if (input.value !== text || !input.isConnected || getPath() !== data.href) throw new Error('The X composer changed. Check this conversation in X.');
        // X's native Send button is type="button"; form.requestSubmit() does not
        // invoke its click handler. Click exactly once and never retry for timing.
        submit.click();
        // Only report submission when the native composer accepted and cleared it.
        const accepted = await waitFor(() => {
          if (getPath() !== data.href) return false;
          const composer = getRoot()?.querySelector('[data-testid="dm-composer-textarea"]');
          return !!composer && !composer.value && (!files.length || !removals().length);
        }, 8000);
        if (!accepted) throw new Error('X has not confirmed submission. Check the conversation before retrying.');
        reply(true); refresh();
      } catch (error) { reply(false, error.message || 'X could not submit this message.'); }
      finally { sending = false; }
    }
    window.addEventListener('message', receive);
  }
  globalThis.XWorkspaceChatBridge = Object.freeze({ normalizeMessages, mergeMessages, scan, connect, messageParts, validateFiles });
})();
