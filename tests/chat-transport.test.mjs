import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';
const listeners = new Set(), frames = [], states = [], results = [], timers = new Set();
let prepare;
const context = vm.createContext({ URL, location: { origin: 'https://x.com' },
  document: { createElement() { const frame = { contentWindow: { postMessage(data, origin) { frame.sent = { data, origin }; } }, remove() { frame.removed = true; } }; frames.push(frame); return frame; } },
  window: { addEventListener: (type, fn) => listeners.add(fn), removeEventListener: (type, fn) => listeners.delete(fn) },
  chrome: { runtime: { sendMessage: async () => prepare } },
  setTimeout: fn => { timers.add(fn); return fn; }, clearTimeout: fn => timers.delete(fn)
});
for (const file of ['unread.js', 'chat-bridge.js', 'chat-transport.js']) vm.runInContext(await readFile(new URL(`../${file}`, import.meta.url), 'utf8'), context);
const create = context.XWorkspaceTransport, container = { append() {} };
assert.equal(create({ href:'https://evil.test/i/chat/bots/a' },container,()=>{},()=>{}),null);
let resolve; prepare = new Promise(done => resolve = done);
const a=create({href:'/i/chat/bots/a',name:'A'},container,state=>states.push(state),result=>results.push(result));
assert.equal(states.at(-1).connecting,true,'Show connecting while establishing the initial connection');
assert.equal(frames.length,0); resolve({ok:true}); await new Promise(done=>setImmediate(done)); assert.equal(frames.length,1);
const receive=[...listeners][0], frame=frames[0];
assert.equal(frame.src, 'https://x.com/i/chat');
receive({ origin:'https://x.com',source:frame.contentWindow,data:{type:'xw-bot-route-ready'} });
assert.equal(frame.sent.data.type,'xw-open-conversation'); assert.equal(frame.sent.data.href,'/i/chat/bots/a');
const event={origin:'https://x.com',source:frame.contentWindow,data:{type:'xw-bot-state',href:'/i/chat/bots/a',ready:true,messages:[{id:'a',text:'Hello',role:'bot',secret:'no'}]}};
receive({...event,source:{}}); receive({...event,origin:'https://evil.test'}); receive({...event,data:{...event.data,href:'/i/chat/bots/b'}}); assert.equal(states.length,1);
receive(event); assert.equal(states.length,2); assert.equal(states.at(-1).ready,true); assert.equal(Object.keys(states.at(-1).messages[0]).sort().join(','),'id,role,text'); assert.equal(timers.size,0);
assert.equal(states.at(-1).connecting,false);
receive(event); assert.equal(states.length,2,'Identical normalized states must not trigger another UI update');
receive({...event,data:{...event.data,messages:[{...event.data.messages[0],secret:'changed but ignored'}]}});
assert.equal(states.length,2,'Ignored metadata must not trigger another UI update');
receive({...event,data:{...event.data,ready:false}});
assert.equal(states.at(-1).ready,false,'A temporarily disabled composer cannot send');
assert.equal(states.at(-1).connecting,false,'A temporarily disabled composer must not announce another connection');
receive({...event,data:{...event.data,messages:[{id:'a',text:'Hello updated',role:'bot'}]}});
assert.equal(states.at(-1).messages[0].text,'Hello updated','Streaming edits must still update');
assert.equal(states.at(-1).connecting,false);
a.send('test','Hi'); assert.equal(frame.sent.data.href,'/i/chat/bots/a'); assert.equal(frame.sent.origin,'https://x.com');
receive({...event,data:{type:'xw-bot-send-result',href:'/i/chat/bots/a',id:'test',ok:true}}); assert.equal(results.length,1);
prepare={ok:true}; await a.reconnect();
assert.equal(states.at(-1).connecting,true,'Explicit reconnect starts a new connection attempt');
assert(frame.removed); assert.equal(frames.length,2);
const count=states.length;
receive(event); assert.equal(states.length,count,'Discard updates from the previous connection');
const replacement=frames[1];
for(const timeout of [...timers]) timeout();
assert.match(states.at(-1).error,/taking longer/);
assert.equal(states.at(-1).connecting,false,'A connection error replaces the connecting notice');
a.destroy(); assert(replacement.removed); assert.equal(listeners.size,0); assert(frame.removed);
prepare=new Promise(done=>resolve=done); const b=create({href:'/i/chat/bots/b',name:'B'},container,()=>{},()=>{}); b.destroy(); resolve({ok:true}); await new Promise(done=>setImmediate(done)); assert.equal(frames.length,2);
const manifest=JSON.parse(await readFile(new URL('../manifest.json',import.meta.url),'utf8')); const scripts=manifest.content_scripts[0].js;
for(const name of ['chat-bridge.js','chat-transport.js','floating-bots.js']) assert(scripts.indexOf(name)>=0&&scripts.indexOf(name)<scripts.indexOf('content.js'));
assert(!scripts.includes('inline-chat.js')); assert(!scripts.includes('bots-view.js'));
console.log('PASS: connection notice lifecycle, normalized state deduplication, streaming updates, transport preparation, bot/source/origin isolation, metadata normalization, sending target, cancellation, cleanup and script order');
