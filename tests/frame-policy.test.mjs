import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';
const source = await readFile(new URL('../background.js', import.meta.url), 'utf8');
let onMessage, onRemoved;
let enabled = true;
const rules = new Map();
let updateFinished = false;
const chrome = {
  runtime: { onMessage: { addListener: fn => { onMessage = fn; } } },
  storage: { local: { get: async () => ({ enabled }) } },
  tabs: { onRemoved: { addListener: fn => { onRemoved = fn; } } },
  declarativeNetRequest: { updateSessionRules: async ({ removeRuleIds = [], addRules = [] }) => {
    await Promise.resolve();
    removeRuleIds.forEach(id => rules.delete(id));
    addRules.forEach(rule => rules.set(rule.id, rule));
    updateFinished = true;
  } }
};
vm.runInNewContext(source, { chrome, URL, console });
const sender = { frameId: 0, tab: { id: 42 }, url: 'https://x.com/home' };
async function message(type, from = sender) {
  return new Promise(resolve => {
    const result = onMessage({ type }, from, reply => { assert(updateFinished || !reply.ok); resolve(reply); });
    if (result !== true) resolve(undefined);
  });
}
assert.equal((await message('xw-prepare-chat')).ok, true);
const [rule] = rules.values();
assert.equal(rule.action.type, 'modifyHeaders');
assert.equal(JSON.stringify(rule.action.responseHeaders), JSON.stringify([{ header: 'x-frame-options', operation: 'remove' }]));
assert.equal(JSON.stringify(rule.condition.tabIds), '[42]');
assert.equal(JSON.stringify(rule.condition.resourceTypes), '["sub_frame"]');
assert.equal(JSON.stringify(rule.condition.initiatorDomains), '["x.com"]');
const pattern = new RegExp(rule.condition.regexFilter);
for (const url of ['https://x.com/i/chat', 'https://x.com/i/chat/pin/recovery?from=x', 'https://x.com/i/chat/123']) assert(pattern.test(url));
for (const url of ['https://x.com/home', 'https://x.com/i/chatty', 'https://evil.test/i/chat', 'https://x.com.evil.test/i/chat']) assert(!pattern.test(url));
await message('xw-release-chat'); assert.equal(rules.size, 0);
enabled = false; assert.equal((await message('xw-prepare-chat')).ok, false); assert.equal(rules.size, 0);
enabled = true;
assert.equal(await message('xw-prepare-chat', { ...sender, frameId: 2 }), undefined);
assert.equal(await message('xw-prepare-chat', { ...sender, url: 'https://evil.test/' }), undefined);
await message('xw-prepare-chat'); await onRemoved(42); assert.equal(rules.size, 0);
console.log('PASS: chat frame policy installed before acknowledgement; tab, route, origin and resource scoping; disabled rejection; cleanup');
