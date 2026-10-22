import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';
const context = vm.createContext({ URL });
vm.runInContext(await readFile(new URL('../unread.js', import.meta.url), 'utf8'), context);
const { normalize, chatPath, avatarUrl, reconcile } = context.XWorkspaceUnread;
const origin = 'https://x.com';
assert.equal(chatPath('/i/chat/123-456', origin), '/i/chat/123-456');
assert.equal(chatPath('/i/chat/bots/example', origin), '/i/chat/bots/example');
for (const href of ['javascript:alert(1)', 'https://evil.test/i/chat/123', '//evil.test/i/chat/123', '/i/chat/pin/recovery', '/home']) assert.equal(chatPath(href, origin), null);
assert.equal(avatarUrl('https://pbs.twimg.com/profile_images/example.jpg'), 'https://pbs.twimg.com/profile_images/example.jpg');
for (const avatar of ['data:image/svg+xml,test', 'http://pbs.twimg.com/image.jpg', 'https://twimg.com.evil.test/a', 'https://user:password@pbs.twimg.com/a']) assert.equal(avatarUrl(avatar), null);
const entries = normalize([
  { href: '/i/chat/a', name: 'Alex', avatar: 'https://pbs.twimg.com/a.jpg', message: 'Must never cross the boundary' },
  { href: '/i/chat/a', name: 'Duplicate' },
  { href: 'https://evil.test/i/chat/b', name: 'Invalid' },
  { href: '/i/chat/b', name: '<img onerror=alert(1)>', avatar: 'javascript:alert(1)' }, null
], origin);
assert.equal(entries.length, 2);
assert.equal(Object.keys(entries[0]).sort().join(','), 'avatar,href,name');
assert.equal(entries[1].avatar, null);
assert.equal(normalize({}, origin).length, 0);
assert.equal(normalize(Array.from({ length: 80 }, (_, i) => ({ href: `/i/chat/${i}` })), origin).length, 50);
let known = reconcile(new Map(), [{ href: '/i/chat/a', name: 'Alex', avatar: null, unread: true }]);
assert.equal(known.size, 1);
known = reconcile(known, []); assert.equal(known.size, 1, 'Virtualization must not erase known unread rows');
known = reconcile(known, [{ href: '/i/chat/b', name: 'Sam', avatar: null, unread: true }]);
assert.equal([...known.keys()].join(','), '/i/chat/b,/i/chat/a', 'Newly mounted inbox rows should lead');
known = reconcile(known, [{ href: '/i/chat/a', unread: false }]);
assert(!known.has('/i/chat/a'), 'Explicit read indicator must clear the avatar');
console.log('PASS: unread reconciliation, virtual rows, deduplication, metadata-only payloads, safe links and avatars');
