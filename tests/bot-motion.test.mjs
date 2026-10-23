import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';

const frames = new Map();
let serial = 0, time = 0;
function events() {
  const handlers = new Map();
  return {
    addEventListener(type, fn) { if (!handlers.has(type)) handlers.set(type, new Set()); handlers.get(type).add(fn); },
    removeEventListener(type, fn) { handlers.get(type)?.delete(fn); },
    emit(type, event = {}) { for (const fn of handlers.get(type) || []) fn(event); },
    count() { return [...handlers.values()].reduce((n, set) => n + set.size, 0); }
  };
}
const reduced = { ...events(), matches: false }, fine = { ...events(), matches: true };
const document = { ...events(), hidden: false }, window = events();
const context = vm.createContext({ document, window,
  matchMedia: query => query.includes('reduce') ? reduced : fine,
  requestAnimationFrame(fn) { frames.set(++serial, fn); return serial; },
  cancelAnimationFrame(id) { frames.delete(id); }
});
vm.runInContext(await readFile(new URL('../bot-motion.js', import.meta.url), 'utf8'), context);
const motion = context.XWorkspaceBotMotion();
const eyes = { style: {}, children: [-25, -25].map(angle => ({getAttribute: () => `rotate(${angle} 20 20)`})) };
const svg = { viewBox: {baseVal: {width: 40}}, querySelector: () => eyes, querySelectorAll: () => [] };
const visual = {isConnected: true, style: {}, matches: () => false, querySelector: () => svg};
const button = {...events(), getBoundingClientRect: () => ({left: 0, top: 0, width: 30, height: 34})};
motion.attach(button, () => visual);
const mouse = (x = 15, y = 17) => ({pointerType: 'mouse', button: 0, clientX: x, clientY: y});
function advance(count) {
  for (let i = 0; i < count; i++) {
    time += 1000 / 60;
    const pending = [...frames.values()]; frames.clear();
    for (const fn of pending) fn(time);
  }
}
button.emit('pointerenter', mouse()); advance(200);
assert(Math.abs(Number(visual.style.transform.match(/rotate\(([-\d.]+)deg/)[1]) - 25) < .01, 'Use the actual resting eye angle');
button.emit('pointermove', mouse(30, 34)); advance(200);
assert.match(visual.style.transform, /translate\(1\.0[45]/, 'Scale body travel to the 30px hit target');
const gaze = eyes.style.transform.match(/translate\(([-\d.]+)px,([-\d.]+)px\)/).slice(1).map(Number);
const radians = 31 * Math.PI / 180;
assert(Math.abs(gaze[0] * Math.cos(radians) - gaze[1] * Math.sin(radians) - 1.8) < .01, 'Gaze stays aimed right as the body turns');
const beforePress = visual.style.transform;
button.emit('pointerdown', mouse(30, 34));
assert.equal(visual.style.transform, beforePress, 'Press does not snap the current pose');
advance(100); assert.match(visual.style.transform, /scale\(0\.9[56]/);
button.emit('pointerup', mouse()); advance(200);
button.emit('pointerleave'); advance(240);
assert.equal(visual.style.transform, ''); assert.equal(eyes.style.transform, ''); assert.equal(frames.size, 0);
button.emit('pointerenter', {...mouse(), pointerType: 'touch'}); assert.equal(frames.size, 0);
reduced.matches = true; button.emit('pointerenter', mouse()); assert.equal(frames.size, 0);
reduced.matches = false; button.emit('pointerenter', mouse()); advance(5);
reduced.matches = true; reduced.emit('change'); assert.equal(visual.style.transform, ''); assert.equal(frames.size, 0);
reduced.matches = false; button.emit('pointerenter', mouse()); advance(5);
visual.isConnected = false; advance(1); assert.equal(frames.size, 0);
visual.isConnected = true; button.emit('pointerenter', mouse()); advance(5);
motion.destroy(); assert.equal(frames.size, 0); assert.equal(button.count(), 0);
assert.equal(reduced.count() + fine.count() + document.count() + window.count(), 0);
console.log('PASS: adaptive eye angle, icon-size travel, gaze direction, continuous press/release, settling, reduced motion, touch, detachment and cleanup');
