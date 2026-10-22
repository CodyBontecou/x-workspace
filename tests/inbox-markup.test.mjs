import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';
const context = vm.createContext({ URL });
for (const file of ['avatars.js', 'unread.js', 'bots.js']) {
  vm.runInContext(await readFile(new URL(`../${file}`, import.meta.url), 'utf8'), context);
}
// Structure observed in Arc's live X inbox: bot route, optional Primary bot label,
// first row child containing an inline SVG, followed by the title/message column.
function node(tag, attrs = {}, children = []) {
  return { localName: tag, attributes: Object.entries(attrs).map(([name, value]) => ({ name, value })), children,
    getAttribute: name => attrs[name] ?? null,
    ownerDocument: { defaultView: { getComputedStyle: () => ({ getPropertyValue: name => name === '--fg' ? '#FF6700' : '#000000', color: '#FF6700' }) } } };
}
const svg = node('svg', { viewBox: '0 0 70.59 70.59' }, [node('defs', {}, [node('g', { id: 'body' }, [node('path', { d: 'M0 0L10 10Z' })])]), node('use', { href: '#body', fill: 'var(--fg)' })]);
svg.parentElement = { style: { width: '147.066%' } };
const previewImage = { currentSrc: 'https://pbs.twimg.com/wrong-preview.jpg' };
const avatarRoot = { querySelector: selector => selector === 'svg' ? svg : null };
const row = { firstElementChild: avatarRoot, querySelector: selector => selector === '.line-clamp-1' ? { textContent: 'Bookmarks Brain' } : selector === 'img' ? previewImage : null };
const link = { getAttribute: name => name === 'href' ? '/i/chat/bots/example-session' : 'Bookmarks Brain', querySelector: () => row };
const rows = context.XWorkspaceUnread.scan({ querySelectorAll: () => [link] }, 'https://x.com');
assert.equal(rows[0].bot, true, 'Bot session URLs must work without a Primary bot label');
assert.equal(rows[0].avatar, null, 'Never substitute an image from the message column');
assert.equal(rows[0].avatarIcon.tag, 'svg', 'Preserve the native SVG avatar');
assert.equal(rows[0].avatarIcon.children[1].attrs.fill, '#FF6700', 'Resolve the inherited bot color');
const normalized = context.XWorkspaceUnread.normalize(rows, 'https://x.com');
assert.equal(normalized[0].avatarIcon.tag, 'svg');
const unread = context.XWorkspaceUnread.reconcile(new Map(), [{ ...rows[0], unread: true }]);
assert.equal(unread.values().next().value.avatarIcon.tag, 'svg');
const bots = context.XWorkspaceBots.reconcile(new Map(), rows);
assert.equal(bots.values().next().value.avatarIcon.tag, 'svg');
assert.equal(context.XWorkspaceBots.pins(rows, 'https://x.com')[0].avatarIcon.tag, 'svg');
const unsafe = { tag: 'svg', attrs: { onload: 'alert(1)', style: 'background:url(https://evil.test)' }, children: [
  { tag: 'script', attrs: {}, children: [] }, { tag: 'use', attrs: { href: 'https://evil.test/a.svg#x', fill: 'url(https://evil.test)' }, children: [] }
] };
const safe = context.XWorkspaceAvatars.normalize(unsafe);
assert.equal(safe.attrs.onload, undefined); assert.equal(safe.attrs.style, undefined);
assert.equal(safe.children.length, 1); assert.equal(safe.children[0].attrs.href, undefined); assert.equal(safe.children[0].attrs.fill, undefined);
assert.equal(context.XWorkspaceAvatars.normalize({ tag: 'img', attrs: {}, children: [] }), null);
assert.equal(context.XWorkspaceAvatars.normalize({ tag: 'svg', attrs: { id: {} }, children: [] }).attrs.id, undefined);
const manifest = JSON.parse(await readFile(new URL('../manifest.json', import.meta.url), 'utf8'));
const scripts = manifest.content_scripts[0].js;
assert(scripts.indexOf('avatars.js') >= 0 && scripts.indexOf('avatars.js') < scripts.indexOf('content.js'));
const doc = { createElementNS(namespace, tag) { return { tag, attrs: {}, style: {}, children: [], setAttribute(key, value) { this.attrs[key] = value; }, append(child) { this.children.push(child); } }; } };
const first = context.XWorkspaceAvatars.render(rows[0].avatarIcon, doc);
const second = context.XWorkspaceAvatars.render(rows[0].avatarIcon, doc);
assert.equal(first.style.width, '147.066%');
assert.notEqual(first.children[0].children[0].attrs.id, second.children[0].children[0].attrs.id, 'Each rendered avatar needs unique local IDs');
assert.equal(first.children[1].attrs.href, '#' + first.children[0].children[0].attrs.id);
console.log('PASS: live inbox bot route, SVG avatar/color, preview exclusion, metadata propagation and SVG sanitization');
