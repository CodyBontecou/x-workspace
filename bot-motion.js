(() => {
  'use strict';
  // One interruptible spring per hovered icon. Hit areas never move.
  globalThis.XWorkspaceBotMotion = function () {
    const reduced = matchMedia('(prefers-reduced-motion: reduce)');
    const fine = matchMedia('(hover: hover) and (pointer: fine)');
    const bindings = new Map();
    function attach(button, getVisual) {
      let frame = 0, previous = 0, active = false, pressed = false, visual, eyes, svg;
      let upright = 0, eyeRange = 0, travel = 0;
      let value = [0, 0, 0, 1, 0, 0], velocity = [0, 0, 0, 0, 0, 0], target = [...value];
      function clear() {
        cancelAnimationFrame(frame); frame = 0; previous = 0; active = false; pressed = false;
        if (visual) visual.style.transform = '';
        if (eyes) eyes.style.transform = '';
        value = [0, 0, 0, 1, 0, 0]; velocity.fill(0); target = [...value];
      }
      function paint() {
        // A little velocity-driven squash makes reversals feel soft, then disappears.
        const squash = Math.max(-.018, Math.min(.018, velocity[2] * .0002));
        visual.style.transform = `translate(${value[0]}px,${value[1]}px) rotate(${value[2]}deg) scale(${value[3] * (1 + squash)},${value[3] * (1 - squash)})`;
        if (eyes) {
          // Keep the gaze aimed at the cursor while its parent turns underneath.
          const angle = value[2] * Math.PI / 180;
          const x = value[4] * Math.cos(angle) + value[5] * Math.sin(angle);
          const y = value[5] * Math.cos(angle) - value[4] * Math.sin(angle);
          eyes.style.transform = `translate(${x}px,${y}px)`;
        }
      }
      function tick(time) {
        if (!visual?.isConnected || reduced.matches || !fine.matches) { clear(); return; }
        // Substeps keep the mass=1, stiffness=100, damping=10 spring stable
        // across refresh rates and after a suspended browser tab resumes.
        let remaining = Math.min((time - (previous || time - 16)) / 1000, .064);
        previous = time;
        while (remaining > 0) {
          const dt = Math.min(remaining, 1 / 120); remaining -= dt;
          for (let i = 0; i < value.length; i++) {
            // Eyes respond sooner and settle without wobbling independently.
            const mass = i >= 4 ? .5 : 1;
            const damping = i >= 4 ? 2 * Math.sqrt(100 * mass) : 10;
            velocity[i] += ((target[i] - value[i]) * 100 - velocity[i] * damping) / mass * dt;
            value[i] += velocity[i] * dt;
          }
        }
        paint();
        const settled = value.every((n, i) => Math.abs(n - target[i]) < .001 && Math.abs(velocity[i]) < .001);
        if (settled) {
          frame = 0; previous = 0;
          if (!active) clear();
        } else frame = requestAnimationFrame(tick);
      }
      function start() { if (!frame) { previous = 0; frame = requestAnimationFrame(tick); } }
      function move(event) {
        if (event.pointerType !== 'mouse' || reduced.matches || !fine.matches) return;
        const next = getVisual();
        if (!next) return;
        if (visual !== next) {
          clear(); visual = next;
          svg = visual.matches('svg') ? visual : visual.querySelector('svg');
          eyes = null; upright = 0;
          const width = svg?.viewBox.baseVal.width || 64;
          eyeRange = width * .045;
          travel = Math.min(button.getBoundingClientRect().width, 64) * .035;
          if (svg) {
            eyes = svg.querySelector('[data-xw-eyes]');
            // Recognize only two matching, narrow dark eye rectangles. Avatar
            // artwork and photos without this structure still get a gentle tilt.
            const dark = fill => {
              if (/^(black|#000)$/i.test(fill || '')) return true;
              if (!/^#[0-9a-f]{6}$/i.test(fill || '')) return false;
              return [1, 3, 5].every(index => parseInt(fill.slice(index, index + 2), 16) < 64);
            };
            const pair = [...svg.querySelectorAll('rect')].filter(el => {
              const w = Number(el.getAttribute('width')), h = Number(el.getAttribute('height'));
              return dark(el.getAttribute('fill')) && w > 0 && w <= width * .2 && h > w && h <= width * .4;
            });
            const matching = pair.length === 2 && pair[0].parentNode === pair[1].parentNode &&
              ['width', 'height', 'transform'].every(key => key === 'transform'
                ? (pair[0].getAttribute(key) || '').split(/[ (]/)[0] === (pair[1].getAttribute(key) || '').split(/[ (]/)[0]
                : pair[0].getAttribute(key) === pair[1].getAttribute(key));
            if (!eyes && matching) {
              eyes = document.createElementNS('http://www.w3.org/2000/svg', 'g');
              eyes.dataset.xwEyes = ''; pair[0].before(eyes); eyes.append(...pair);
            }
            if (eyes) {
              const angles = [...eyes.children].map(el => Number(el.getAttribute('transform')?.match(/^rotate\(\s*([-\d.]+)/)?.[1] || 0));
              if (angles.length === 2 && angles[0] === angles[1]) upright = Math.max(-35, Math.min(35, -angles[0]));
            }
          }
        }
        active = true;
        const box = button.getBoundingClientRect();
        const x = Math.max(-1, Math.min(1, (event.clientX - box.left) / box.width * 2 - 1));
        const y = Math.max(-1, Math.min(1, (event.clientY - box.top) / box.height * 2 - 1));
        target = [x * travel, y * travel, upright + x * 6, pressed ? .96 : 1.06, x * eyeRange, y * eyeRange];
        start();
      }
      function leave() { if (!active) return; active = false; pressed = false; target = [0, 0, 0, 1, 0, 0]; start(); }
      function press(event) {
        if (event.pointerType !== 'mouse' || event.button !== 0) return;
        move(event);
        if (active) { pressed = true; target[3] = .96; start(); }
      }
      function release(event) { pressed = false; if (active) move(event); }
      const listeners = { pointerenter: move, pointermove: move, pointerleave: leave, pointercancel: leave, pointerdown: press, pointerup: release, blur: clear };
      for (const [type, listener] of Object.entries(listeners)) button.addEventListener(type, listener);
      const dispose = () => { clear(); for (const [type, listener] of Object.entries(listeners)) button.removeEventListener(type, listener); bindings.delete(button); };
      bindings.get(button)?.dispose();
      bindings.set(button, { clear, dispose });
      return dispose;
    }
    function reset() { for (const binding of bindings.values()) binding.clear(); }
    function visibility() { if (document.hidden) reset(); }
    reduced.addEventListener('change', reset); fine.addEventListener('change', reset);
    document.addEventListener('visibilitychange', visibility); window.addEventListener('blur', reset);
    return { attach, reset, destroy() { for (const binding of [...bindings.values()]) binding.dispose(); reduced.removeEventListener('change', reset); fine.removeEventListener('change', reset); document.removeEventListener('visibilitychange', visibility); window.removeEventListener('blur', reset); } };
  };
})();
