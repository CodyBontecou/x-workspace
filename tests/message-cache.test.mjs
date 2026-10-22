import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';
let stored = {}, writes = 0;
const timers = new Map(); let timerId = 0;
const storage = {
  async get(key) { return key === null ? structuredClone(stored) : { [key]: structuredClone(stored[key]) }; },
  async set(value) { writes++; Object.assign(stored, structuredClone(value)); }
};
const context = vm.createContext({ URL, TextEncoder, location: { origin: 'https://x.com' },
  setTimeout(fn) { timers.set(++timerId, fn); return timerId; }, clearTimeout(id) { timers.delete(id); }
});
for (const file of ['unread.js', 'bots.js', 'chat-bridge.js', 'message-cache.js']) vm.runInContext(await readFile(new URL(`../${file}`, import.meta.url), 'utf8'), context);
const create = context.XWorkspaceMessageCache;
const bot = { href: '/i/chat/bots/a', name: 'A', avatar: '', unread: true };
const row = { id: '1', text: 'Last reply', role: 'bot' };
let cache = await create(storage);
assert.equal(cache.get(bot.href).length, 0);
cache.put(bot, [row]);
assert.equal(cache.get(bot.href)[0].text, 'Last reply');
await cache.flush(); assert.equal(writes, 1);
cache = await create(storage);
assert.equal(cache.get(bot.href)[0].text, 'Last reply', 'A new page restores messages without waiting for X');
assert.equal(cache.entries()[0].name, 'A', 'Cached bot metadata permits immediate panel restoration');
assert.equal(cache.entries()[0].unread, false, 'Cached metadata must not restore stale unread dots');
cache.put(bot, [row]); await cache.flush(); assert.equal(writes, 1, 'Unchanged snapshots must not write again');
const incoming = [{ ...row, text: 'Edited streaming reply' }, { id: '2', text: 'New reply', role: 'bot' }];
const merged = context.XWorkspaceChatBridge.mergeMessages(cache.get(bot.href), incoming);
cache.put(bot, merged); await cache.flush();
cache = await create(storage);
assert.equal(cache.get(bot.href).length, 2);
assert.equal(cache.get(bot.href)[0].text, 'Edited streaming reply');
assert.equal(context.XWorkspaceChatBridge.mergeMessages(cache.get(bot.href), []).length, 2, 'Initial empty/loading snapshots retain cached history');
cache.put(bot, [{id:'unsafe',role:'bot',text:'click',links:[{start:0,end:5,href:'javascript:alert(1)'}],pending:'unsent',secret:'omit'}]);
await cache.flush();
assert.equal(Object.keys(stored.botMessageCache[bot.href].messages[0]).sort().join(','), 'id,role,text');
cache.put(bot,[{id:'image',text:'[icon.png]',role:'user',images:[{src:'blob:https://x.com/private-image',alt:'icon.png'}]}]);
await cache.flush();
assert.equal(stored.botMessageCache[bot.href].messages[0].text,'[icon.png]');
assert.equal(stored.botMessageCache[bot.href].messages[0].images,undefined,'Do not persist decrypted image URLs');
cache.put(bot, Array.from({length:150}, (_,i)=>({id:String(i),text:'Hello',role:'bot'})));
await cache.flush(); assert.equal(stored.botMessageCache[bot.href].messages.length, 100);
cache.put(bot, Array.from({length:100}, (_,i)=>({id:String(i),text:'😀'.repeat(2000),role:'bot'})));
await cache.flush();
assert(new TextEncoder().encode(JSON.stringify(stored.botMessageCache[bot.href].messages)).length < 81000);
assert.equal(stored.botMessageCache[bot.href].messages.at(-1).id, '99', 'Keep the newest messages when bounding bytes');
for(let i=0;i<25;i++) cache.put({...bot,href:`/i/chat/bots/${i}`}, [row]);
assert.equal(timers.size,1, 'Streaming/cache changes share a debounced write');
await cache.flush(); assert.equal(Object.keys(stored.botMessageCache).length,20);
stored.botMessageCache = {
  expired: {entry:bot,messages:[row],updatedAt:1},
  '/i/chat/bots/expired': {entry:bot,messages:[row],updatedAt:1},
  'https://evil.test/i/chat/bots/x': {entry:bot,messages:[row],updatedAt:Date.now()},
  '/i/chat/bots/malformed': {entry:bot,messages:'not an array',updatedAt:Date.now()}
};
cache = await create(storage); assert.equal(cache.entries().length,0,'Expired, foreign and malformed entries are ignored');
const unavailable = { async get(){throw Error('unavailable');}, async set(){throw Error('quota');} };
cache = await create(unavailable); cache.put(bot,[row]); await cache.flush();
assert.equal(cache.get(bot.href)[0].text,'Last reply','Storage failure does not break live in-memory state');
const manifest = JSON.parse(await readFile(new URL('../manifest.json',import.meta.url),'utf8'));
const scripts = manifest.content_scripts[0].js;
assert(scripts.indexOf('message-cache.js') > scripts.indexOf('chat-bridge.js'));
assert(scripts.indexOf('message-cache.js') < scripts.indexOf('content.js'));
console.log('PASS: immediate cache restoration, live reconciliation, no stale unread state, normalized messages, write deduplication/debouncing, retention/size limits, malformed data and storage failure');
