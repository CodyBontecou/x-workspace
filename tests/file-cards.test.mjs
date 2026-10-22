import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFile} from 'node:fs/promises';
const listeners = [], replies = []; let downloads = 0;
const name = 'Annual report.pdf';
const button = {nodeType:1,tagName:'BUTTON',childNodes:[],textContent:'Annual report.pdfTap to download',
  getAttribute:()=>null, querySelector:selector=>selector==='.font-medium'?{textContent:name}:selector==='.x-middot-group'?{textContent:'Tap to download'}:null,
  click:()=>downloads++};
const item = {childNodes:[button],getAttribute:()=> 'pdf-row',
  querySelector:selector=>selector==='.relative.flex.w-full'?{classList:{contains:()=>true}}:null,
  querySelectorAll:()=>[button]};
const root = {querySelectorAll:()=>[item]};
const parent = {postMessage:message=>replies.push(message)};
const context = vm.createContext({URL,Blob,Event,parent,location:{origin:'https://x.com',pathname:'/i/chat/bots/a'},
  window:{addEventListener:(_,fn)=>listeners.push(fn)},setTimeout});
vm.runInContext(await readFile(new URL('../chat-bridge.js',import.meta.url),'utf8'),context);
const bridge = context.XWorkspaceChatBridge;
const row = bridge.scan(root)[0];
assert.equal(row.files.length,1); assert.equal(row.files[0].name,name);
assert.equal(row.role,'user'); assert.equal(row.text,'[Annual report.pdf]');
assert.equal(row.files[0].size,'','X can omit the file size');
const unsafeLink = {...button,tagName:'A',getAttribute:key=>key==='href'?'javascript:alert(1)':key==='download'?'unsafe.pdf':null};
const unsafeItem = {...item,childNodes:[unsafeLink],querySelectorAll:()=>[unsafeLink]};
assert.equal(bridge.scan({querySelectorAll:()=>[unsafeItem]}).length,0,'Unsafe native download links cannot become clickable cards');
assert.equal(bridge.normalizeMessages([{id:'file-only',files:[{name,index:0,size:'12.5 KB'}]}])[0].files[0].size,'12.5 KB');
assert.equal(bridge.normalizeMessages([{id:'bad',text:'safe',files:[{name,index:-1}]}])[0].files,undefined);
const normalized = bridge.normalizeMessages([{id:'bad',text:'safe',files:[{name,index:0,size:'<img>',url:'javascript:alert(1)',secret:'omit'}]}])[0].files[0];
assert.equal(Object.keys(normalized).sort().join(','),'index,name,size'); assert.equal(normalized.size,'');
bridge.connect(()=>root,()=>{});
const receive = listeners[0];
const event = (id,overrides={})=>({source:parent,origin:'https://x.com',data:{type:'xw-bot-file',href:'/i/chat/bots/a',id,messageId:'pdf-row',file:{name,index:0,size:''}},...overrides});
await receive(event('origin',{origin:'https://evil.test'})); await receive(event('source',{source:{}})); assert.equal(downloads,0);
await receive(event('file')); assert.equal(downloads,1); assert.equal(replies.at(-1).ok,true);
await receive(event('file')); assert.equal(downloads,1,'Duplicate file requests must not click twice');
const wrongName = event('renamed'); wrongName.data.file.name='Different.pdf'; await receive(wrongName);
assert.equal(downloads,1); assert.equal(replies.at(-1).ok,false);
const missing = event('missing'); missing.data.messageId='older-row'; await receive(missing);
assert.equal(downloads,1); assert.equal(replies.at(-1).ok,false);
const wrongChat = event('wrong-chat'); wrongChat.data.href='/i/chat/bots/b'; await receive(wrongChat); assert.equal(downloads,1);
console.log('PASS: native PDF cards, split filenames, optional sizes, bounded safe metadata, isolated native downloads, duplicate requests and stale attachments');
