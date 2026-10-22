import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';
const parent = {}, handlers = [], replies = [];
parent.postMessage = (data, origin) => replies.push({ data, origin });
class Textarea { get value() { return this._value || ''; } set value(value) { this._value = value; } }
const input = new Textarea(); input.isConnected = true; input.ownerDocument = { defaultView: { HTMLTextAreaElement: Textarea } };
let submitted = 0, inputEvents = 0, formSubmissions = 0, clearDelay = 0;
input.dispatchEvent = event => { assert.equal(event.type, 'input'); inputEvents++; };
// Live X uses a type="button" control with a click handler, not form submission.
const sendButton = { disabled: false, click() { assert.equal(inputEvents, submitted + 1, 'Native input must update before send'); submitted++; if (clearDelay) setTimeout(() => { input.value = ''; }, clearDelay); else input.value = ''; } };
const form = { querySelector: selector => selector === '[data-testid="dm-composer-send-button"]' ? sendButton : null, requestSubmit() { formSubmissions++; } };
input.closest = () => form;
const root = { querySelector: selector => selector.includes('textarea') ? input : { scrollTo() {} } };
const context = vm.createContext({ parent, location: { origin: 'https://x.com', pathname: '/i/chat/bots/a' }, Event, URL, Blob, setTimeout,
  window: { addEventListener: (type, fn) => handlers.push(fn) } });
vm.runInContext(await readFile(new URL('../chat-bridge.js', import.meta.url), 'utf8'), context);
const { normalizeMessages, mergeMessages, scan, connect, messageParts } = context.XWorkspaceChatBridge;
assert.equal(normalizeMessages([{ id: 'a', text: 'Hello', role: 'bot', secret: 'no' }, { id: 'a', text: 'dup' }, { text: 'bad' }]).length, 1);
assert.equal(Object.keys(normalizeMessages([{ id: 'a', text: '<img onerror=alert(1)>', role: 'bad' }])[0]).sort().join(','), 'id,role,text');
let messages = [{ id: 'a', text: 'A', role: 'bot' }, { id: 'b', text: 'B', role: 'user' }];
messages = mergeMessages(messages, [{ id: 'b', text: 'Edited', role: 'user' }, { id: 'c', text: 'C', role: 'bot' }]);
assert.equal(messages.map(row => row.id).join(','), 'a,b,c'); assert.equal(messages[1].text, 'Edited');
messages = mergeMessages(messages, [{ id: 'earlier', text: 'Earlier', role: 'bot' }, { id: 'a', text: 'A', role: 'bot' }]);
assert.equal(messages.map(row => row.id).join(','), 'earlier,a,b,c'); assert.equal(mergeMessages(messages, []).length, 4);
const temporary = [{id:'anchor',text:'Choose an idea',role:'bot'},{id:'temporary-user',text:'That first one',role:'user'}];
const committed = mergeMessages(temporary,[{id:'anchor',text:'Choose an idea',role:'bot'},{id:'server-user',text:'That first one',role:'user'},{id:'reply',text:'On it',role:'bot'}]);
assert.equal(committed.map(row=>row.id).join(','),'anchor,server-user,reply','Replacing X’s temporary outgoing ID must not leave a second message');
const repeated = mergeMessages([{id:'anchor',text:'Hello',role:'bot'},{id:'first',text:'Same text',role:'user'}],[{id:'anchor',text:'Hello',role:'bot'},{id:'first',text:'Same text',role:'user'},{id:'second',text:'Same text',role:'user'}]);
assert.equal(repeated.filter(row=>row.text==='Same text').length,2,'Two real messages with identical text must remain separate');
const outside = mergeMessages([{id:'older',text:'Same text',role:'user'},{id:'anchor',text:'Hello',role:'bot'}],[{id:'anchor',text:'Hello',role:'bot'},{id:'newer',text:'Same text',role:'user'}]);
assert.equal(outside.map(row=>row.id).join(','),'older,anchor,newer','Do not merge equal text across different history gaps');
const item = (id, text, user, bubble = true) => ({ getAttribute: () => id, textContent: text, querySelector: selector => selector === '.rounded-chat' ? bubble ? { textContent: text } : null : { classList: { contains: () => user } } });
const rows = scan({ querySelectorAll: () => [item('sep-1','date'),item('a','Hello',false),item('b','Hi',true),item('event-a','Updated routine',false,false)] });
assert.equal(rows.length,3); assert.equal(rows.map(row=>row.role).join(','),'bot,user,system');
const txt = textContent => ({ nodeType: 3, textContent });
const el = (tagName, childNodes, attrs = {}) => ({ nodeType: 1, tagName, childNodes, getAttribute: key => attrs[key] ?? null });
const nativeBubble = el('DIV', [el('P', [txt('@tpae says '), el('A', [el('STRONG', [txt('@tpae')])], { href: '/tpae' }), txt(' shared '), el('A', [txt('this post')], { href: 'https://x.com/tpae/status/123' })]), el('P', [txt('Visit https://example.com/docs. '), el('A', [txt('unsafe')], { href: 'javascript:alert(1)' })])]);
const linkedItem = { getAttribute: () => 'linked', querySelector: selector => selector === '.rounded-chat' ? nativeBubble : { classList: { contains: () => false } } };
const linked = scan({ querySelectorAll: () => [linkedItem] })[0];
assert.equal(linked.text, '@tpae says @tpae shared this post\nVisit https://example.com/docs. unsafe');
assert.equal(linked.links.length, 2);
assert.equal(linked.links[0].start, 11, 'Repeated plain text must not steal a later anchor');
assert.equal(linked.links[0].href, 'https://x.com/tpae');
const parts = messageParts(linked);
assert.equal(parts.map(part => part.text).join(''), linked.text);
assert.equal(parts.filter(part => part.href).map(part => part.href).join(','), 'https://x.com/tpae,https://x.com/tpae/status/123,https://example.com/docs');
assert.equal(messageParts({ text: 'See (https://example.com/a_(b)). www.example.com!', links: [] }).filter(part => part.href).map(part => part.href).join(','), 'https://example.com/a_(b),https://www.example.com/');
const unsafeLinks = normalizeMessages([{ id: 'unsafe', text: 'abc', links: [
  { start: 0, end: 1, href: 'javascript:alert(1)' }, { start: 0, end: 1, href: 'data:text/html,test' },
  { start: 0, end: 1, href: 'https://user:pass@example.com' }, { start: 0, end: 4, href: 'https://example.com' },
  { start: 0, end: 2, href: 'https://example.com' }, { start: 1, end: 3, href: 'https://overlap.test' }
] }])[0];
assert.equal(unsafeLinks.links.length, 1); assert.equal(unsafeLinks.links[0].href, 'https://example.com/');
const updated = mergeMessages([linked], [{ ...linked, links: [{ ...linked.links[0], href: 'https://x.com/updated' }] }]);
assert.equal(updated[0].links[0].href, 'https://x.com/updated');
const imageBubble = el('DIV', [el('IMG', [], {src:'blob:https://x.com/test-image',alt:'icon.png'})]);
const imageRow = scan({querySelectorAll:()=>[{getAttribute:()=> 'image',querySelector:selector=>selector==='.rounded-chat'?imageBubble:null}]})[0];
assert.equal(imageRow.text,'[icon.png]'); assert.equal(imageRow.images[0].src,'blob:https://x.com/test-image');
const media = normalizeMessages([{id:'media',text:'',images:[
  {src:'blob:https://x.com/local',alt:'Local'}, {src:'https://pbs.twimg.com/media/a.png',alt:'Remote'},
  {src:'blob:https://evil.test/private',alt:'Foreign blob'}, {src:'https://evil.test/tracker.png'},
  {src:'data:image/svg+xml,<svg/>'}, {src:'javascript:alert(1)'}
]}])[0];
assert.equal(media.images.length,2); assert.match(media.text,/Local/);
assert.equal(normalizeMessages([{id:'unsafe-image',text:'',images:[{src:'https://evil.test/x.png'}]}]).length,0);
const changedImage = mergeMessages([imageRow],[{...imageRow,images:[{src:'blob:https://x.com/reloaded',alt:'icon.png'}]}]);
assert.equal(changedImage[0].images[0].src,'blob:https://x.com/reloaded','Fresh native image URLs replace expired ones');
const imageBlobs = [];
context.atob = atob;
context.URL = class extends URL {
  static createObjectURL(blob) { imageBlobs.push(blob); return `blob:https://x.com/decrypted-${imageBlobs.length}`; }
  static revokeObjectURL() {}
};
const dataImage = el('DIV',[el('IMG',[],{src:'data:image/png;base64,aW1hZ2U=',alt:'embedded.png'})]);
const dataRoot = {querySelectorAll:()=>[{getAttribute:()=> 'embedded',querySelector:selector=>selector==='.rounded-chat'?dataImage:null}]};
assert.equal(scan(dataRoot)[0].images[0].src,'blob:https://x.com/decrypted-1');
assert.equal(scan(dataRoot)[0].images[0].src,'blob:https://x.com/decrypted-1');
assert.equal(imageBlobs.length,1,'Decode each mounted native image only once');
assert.equal(imageBlobs[0].type,'image/png'); assert.equal(imageBlobs[0].size,5);
connect(() => root, () => {});
const receive = handlers[0];
const event = (id, text, overrides = {}) => ({ source: parent, origin: 'https://x.com', data: { type: 'xw-bot-send', href: '/i/chat/bots/a', id, text }, ...overrides });
await receive(event('wrong-origin','Hi',{origin:'https://evil.test'})); await receive(event('wrong-source','Hi',{source:{}}));
await receive({ ...event('wrong-chat','Hi'), data: { ...event('wrong-chat','Hi').data, href:'/i/chat/bots/b' } }); assert.equal(submitted,0);
input.value='Existing draft'; await receive(event('draft','Hello')); assert.equal(submitted,0); assert.equal(input.value,'Existing draft'); assert.equal(replies.at(-1).data.ok,false);
input.value=''; await receive(event('send-a','Hello')); assert.equal(submitted,1); assert.equal(replies.at(-1).data.ok,true);
await receive(event('send-a','Hello')); assert.equal(submitted,1,'Duplicate request IDs must never send twice');
assert.equal(formSubmissions,0,'Never substitute form submission for X’s Send click handler');
clearDelay=450; await receive(event('send-slow','A slower native acknowledgement')); assert.equal(submitted,2); assert.equal(replies.at(-1).data.ok,true,'A native acknowledgement slower than 160ms must succeed');
await receive(event('send-slow','A slower native acknowledgement')); assert.equal(submitted,2,'Waiting for acknowledgement must not resend');
assert.equal(replies.at(-1).origin,'https://x.com');
console.log('PASS: message normalization, virtualized history merge, role detection, isolated sends, draft protection, native input/submit and duplicate prevention');
