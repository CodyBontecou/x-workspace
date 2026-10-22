import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';

const source = await readFile(new URL('../chat-bridge.js', import.meta.url), 'utf8');
function setup({ stuck = false, existing = false, missing = false, noClear = false } = {}) {
  let receive, elapsed = 0, submitted = 0, uploaded = false, staged = false;
  const replies = [], files = [];
  class Textarea { get value() { return this.draft || ''; } set value(value) { this.draft = value; } }
  class Transfer { constructor() { this.files = []; this.items = { add: file => this.files.push(file) }; } }
  const input = new Textarea(); input.isConnected = true; input.dispatchEvent = () => {};
  input.ownerDocument = { defaultView: { HTMLTextAreaElement: Textarea } };
  const send = { disabled: false, click() { assert(uploaded, 'Upload must finish before Send'); submitted++; input.value = ''; if (!noClear) staged = false; } };
  const form = {
    get textContent() { return staged && !uploaded ? 'test.png. Uploading...' : ''; },
    querySelectorAll: () => existing || staged ? [{}] : [],
    querySelector: selector => selector === '[data-testid="dm-composer-send-button"]' || selector.includes(':not(:disabled)') && uploaded ? send : null
  };
  input.closest = () => form;
  const fileInput = { set files(value) { files.push(...value); }, dispatchEvent(event) { assert.equal(event.type, 'change'); staged = true; } };
  const root = { querySelector: selector => selector.includes('textarea') ? input : selector.includes('type="file"') ? missing ? null : fileInput : null };
  const parent = { postMessage: data => replies.push(data) };
  const context = vm.createContext({ parent, location: { origin: 'https://x.com', pathname: '/i/chat/bots/a' }, URL, Blob, Event, DataTransfer: Transfer,
    Date: { now: () => elapsed }, setTimeout: callback => { elapsed += 100; if (!stuck && staged && elapsed >= 500) uploaded = true; return Promise.resolve().then(callback); },
    window: { addEventListener: (_, fn) => { receive = fn; } } });
  vm.runInContext(source, context); context.XWorkspaceChatBridge.connect(() => root, () => {});
  const request = (id, attachments, text = '') => receive({ source: parent, origin: 'https://x.com', data: { type: 'xw-bot-send', href: '/i/chat/bots/a', id, text, files: attachments } });
  return { request, replies, files, input, validate: context.XWorkspaceChatBridge.validateFiles, get submitted() { return submitted; } };
}
const file = new File(['image bytes'], 'test.png', { type: 'image/png' });
const app = setup();
assert.equal(app.validate([file]).length, 1);
assert.throws(() => app.validate(Array(7).fill(file)), /6 files/);
assert.throws(() => app.validate([{ name: 'fake', size: 1 }]), /non-empty/);
assert.throws(() => app.validate([new File([], 'empty')]), /non-empty/);
const large = new File([new Uint8Array(26 * 1024 * 1024)], 'big.png', { type: 'image/png' });
assert.throws(() => app.validate([large]), /25 MB/);
await app.request('attachment-only', [file]);
assert.equal(app.submitted, 1); assert.equal(app.files[0], file);
assert.equal(app.replies[0].type, 'xw-bot-send-progress'); assert.equal(app.replies.at(-1).ok, true);
await app.request('attachment-only', [file]); assert.equal(app.submitted, 1, 'Duplicate requests must not upload or send twice');
for (const options of [{ existing: true }, { missing: true }, { stuck: true }, { noClear: true }]) {
  const blocked = setup(options); await blocked.request('blocked', [file], 'Keep my caption');
  assert.equal(blocked.replies.at(-1).ok, false);
  assert.equal(blocked.submitted, options.noClear ? 1 : 0);
}
const draft = setup(); draft.input.value = 'Native draft'; await draft.request('draft', [file], 'New text');
assert.equal(draft.files.length, 0, 'An existing native draft must be protected before upload');
assert.equal(draft.input.value, 'Native draft');
const invalid = setup(); await invalid.request('invalid', Array(7).fill(file));
assert.equal(invalid.files.length, 0); assert.equal(invalid.submitted, 0);
console.log('PASS: attachment validation, attachment-only sending, upload readiness, native draft protection, duplicate protection, failed uploads and attachment-clear acknowledgement');
