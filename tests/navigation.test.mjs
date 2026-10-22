import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';
const location = { origin: 'https://x.com', pathname: '/home', search: '', hash: '' };
const pushes = [], events = [], scrolls = [];
const history = { state: { idx: 4, usr: null, key: 'old' }, pushState(state, title, path) {
  pushes.push(path); this.state = state; const url = new URL(path, location.origin);
  Object.assign(location, { pathname: url.pathname, search: url.search, hash: url.hash });
} };
class PopStateEvent { constructor(type, init) { this.type = type; this.state = init.state; } }
class CustomEvent { constructor(type, init) { this.type = type; this.detail = init.detail; } }
const listeners = new Map();
const document = { getElementById: () => null };
const context = vm.createContext({ URL, document, location, history, PopStateEvent, CustomEvent, Event, crypto: { randomUUID: () => 'new' },
  window: { addEventListener(type, listener) { listeners.set(type, listener); }, dispatchEvent(event) { events.push(event); listeners.get(event.type)?.(event); }, scrollTo: options => scrolls.push(options) } });
vm.runInContext(await readFile(new URL('../navigation-main.js', import.meta.url), 'utf8'), context);
vm.runInContext(await readFile(new URL('../navigation.js', import.meta.url), 'utf8'), context);
const { route, follow } = context.XWorkspaceNavigation;
assert.equal(route('https://x.com/person/status/123?ref=chat#reply', location.origin), '/person/status/123?ref=chat#reply');
assert.equal(route('https://twitter.com/person/status/123', location.origin), '/person/status/123');
for (const href of ['https://example.com/a', 'https://x.com.evil.test/a', 'javascript:alert(1)', 'https://u:p@x.com/a']) assert.equal(route(href,location.origin),null);
const click = overrides => ({ button: 0, preventDefault() { this.prevented = true; }, ...overrides });
const event = click(); assert.equal(follow(event,'https://x.com/person/status/123'),true);
assert(event.prevented); assert.equal(location.pathname,'/person/status/123'); assert.equal(pushes.length,1);
assert.equal(events[0].type,'xw-message-navigation'); const pop=events.find(event=>event.type==='popstate'); assert(pop); assert.equal(pop.state.idx,5); assert.equal(pop.state.key,'new');
assert.equal(scrolls.length,1);
follow(click(),'https://x.com/person/status/123'); assert.equal(pushes.length,1,'Current route should not add duplicate history');
for (const overrides of [{ metaKey:true }, { ctrlKey:true }, { shiftKey:true }, { altKey:true }, { button:1 }, { defaultPrevented:true }]) {
  const event=click(overrides); assert.equal(follow(event,'https://x.com/other'),false); assert(!event.prevented);
}
const external=click(); assert.equal(follow(external,'https://example.com/docs'),false); assert(!external.prevented);
assert.equal(pushes.length,1,'External links use normal same-tab navigation without changing X history');
listeners.get('xw-request-navigation')({detail:JSON.stringify({id:'bad',path:'//evil.test/path'})});
assert.equal(pushes.length,1,'The page-world bridge must reject cross-origin navigation requests');
const routerPushes = [];
const router = { push: path => routerPushes.push(path), listen() {} };
const tree = { child: { sibling: { memoizedProps: { history: router } } } };
const hostFiber = { return: tree };
document.getElementById = () => ({ firstElementChild: { '__reactFiber$fixture': hostFiber } });
follow(click(), 'https://x.com/router/post');
assert.deepEqual(routerPushes, ['/router/post'], 'Use the nested React Router history so its subscribers render the destination');
assert.equal(pushes.length, 1, 'Router navigation must not also push a second browser history entry');
const manifest=JSON.parse(await readFile(new URL('../manifest.json',import.meta.url),'utf8'));
assert(manifest.content_scripts[0].js.indexOf('navigation.js') < manifest.content_scripts[0].js.indexOf('floating-bots.js'));
assert.equal(manifest.content_scripts.find(script=>script.js.includes('navigation-main.js')).world,'MAIN');
console.log('PASS: same-tab X routing, router notification, history state, aliases, external destinations, and explicit modifier clicks');
