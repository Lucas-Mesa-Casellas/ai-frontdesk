// The background of the sign-in pages (/login and /auth/confirm): a quiet field of
// tiny jade pixels laid out as a wide, softly rolling surface that recedes to a horizon
// behind the card -- like looking across a dark dot-matrix sea. Slow swells pass
// through it and crest points glow a little brighter; every so often a faint sheen
// of light slides across. It is meant to be felt more than watched.
//
// It answers to what the visitor does, which is the "email" part of the story: every
// keystroke sends a ring of light spreading out from the middle of the field, the
// field gets a touch livelier while an address is typed, pressing the button sends a
// bright front sweeping off to the right (the message leaving), and once the link is
// sent two slow rings settle outwards.
//
// One <canvas>, drawn with whole-pixel squares (crisp at any density), at most 2x the
// device pixel ratio, paused while the tab is hidden. prefers-reduced-motion draws a
// single still frame and nothing else.
//
// authField() is self-contained plain browser code on purpose: the React component
// below runs it, and the /auth/confirm route (which returns hand-written HTML) inlines
// its source as a <script>, so the two pages draw exactly the same thing.

export type AuthFieldApi = {
  ripple: () => void; // a ring of light from the middle (a keystroke)
  send: () => void; // a front sweeping across (the button was pressed)
  settle: () => void; // two slow rings (the link has been sent)
  setEnergy: (on: boolean) => void; // livelier while an address is being typed
  destroy: () => void;
};

export function authField(canvas: HTMLCanvasElement): AuthFieldApi {
  const noop = () => {};
  const dead: AuthFieldApi = { ripple: noop, send: noop, settle: noop, setEnergy: noop, destroy: noop };
  const ctx = canvas.getContext("2d");
  if (!ctx) return dead;
  const g = ctx;

  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const COLS = 78;
  const ROWS = 40;
  const XR = 3.2; // half-width of the surface, in ground units
  const ZR = 4.5; // depth of the surface, in ground units
  const PAL = 14;

  // two hues, each in PAL opacity steps: deep jade for the body, mint for the crests
  const deep: string[] = [];
  const mint: string[] = [];
  for (let i = 0; i < PAL; i++) {
    const a = (i / (PAL - 1)).toFixed(3);
    deep.push("rgba(36,214,150," + a + ")");
    mint.push("rgba(150,244,205," + a + ")");
  }

  let w = 0;
  let h = 0;
  let dpr = 1;
  let raf = 0;
  let last = 0;
  let energy = 0;
  let target = 0;
  let lastRipple = 0;
  let sendAt = -1;
  const t0 = performance.now();
  const rings: { x: number; z: number; at: number; speed: number; amp: number }[] = [];
  const clamp = (v: number, a: number, b: number) => (v < a ? a : v > b ? b : v);
  const smooth = (a: number, b: number, v: number) => {
    const k = clamp((v - a) / (b - a), 0, 1);
    return k * k * (3 - 2 * k);
  };

  function resize() {
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    w = canvas.clientWidth;
    h = canvas.clientHeight;
    canvas.width = Math.max(1, Math.round(w * dpr));
    canvas.height = Math.max(1, Math.round(h * dpr));
    if (reduced) draw(2.5, 0);
  }

  function draw(time: number, now: number) {
    const W = canvas.width;
    const H = canvas.height;
    g.clearRect(0, 0, W, H);
    const phone = w < 520;
    const horizon = H * 0.47;
    const bottom = H * 1.1;
    const cx = W / 2;
    const spread = (W * 0.5) / (XR * 0.62);
    const intro = 1 - Math.pow(1 - clamp(time / 1.8, 0, 1), 3);
    const e = energy;
    const lift = (phone ? 0.7 : 1) * dpr;

    // live rings and the sending front, in ground units
    for (let i = rings.length - 1; i >= 0; i--) if ((now - rings[i].at) / 1000 > 3.4) rings.splice(i, 1);
    const frontAge = sendAt < 0 ? 99 : (now - sendAt) / 1000;
    const frontX = -XR - 0.6 + frontAge * 6.4;
    const frontLife = frontAge < 1.9 ? 1 - frontAge / 1.9 : 0;
    const sheenX = ((time * 0.075) % 1) * (2 * XR + 4) - XR - 2;

    for (let r = 0; r < ROWS; r++) {
      const tr = r / (ROWS - 1); // 0 = nearest, 1 = at the horizon
      const f = Math.pow(1 - tr, 1.85); // perspective factor: 1 near, 0 at the horizon
      const gz = tr * ZR;
      const baseY = horizon + (bottom - horizon) * f;
      const near = 0.34 + 0.66 * Math.pow(f, 0.5); // dots fade into the horizon
      const px = Math.max(1, Math.round((0.7 + 1.9 * f) * dpr * (phone ? 0.85 : 1)));
      const xs = spread * (0.42 + 0.58 * f);
      const horizonFade = smooth(0.0, 0.16, f); // nothing sharp right on the horizon line
      for (let c = 0; c < COLS; c++) {
        const gx = -XR + (2 * XR * c) / (COLS - 1);
        // the swell: three slow waves running across and away
        let hv =
          Math.sin(gx * 1.35 + time * 0.55 + tr * 4.2) * 0.55 +
          Math.sin(gx * 2.6 - time * 0.4 + tr * 7.1 + 1.7) * 0.3 +
          Math.sin(gx * 0.7 + tr * 2.2 - time * 0.28 + 4) * 0.45;
        let glow = 0;
        // rings from keystrokes / the settle
        for (let k = 0; k < rings.length; k++) {
          const q = rings[k];
          const age = (now - q.at) / 1000;
          const dd = Math.sqrt((gx - q.x) * (gx - q.x) + (gz - q.z) * (gz - q.z));
          const off = (dd - age * q.speed) / (0.3 + 0.12 * age);
          const env = (1 - age / 3.4) * (1 - age / 3.4);
          const ring = q.amp * env * Math.exp(-off * off);
          hv += ring * 1.3;
          glow += ring;
        }
        // the front that leaves when the button is pressed
        if (frontLife > 0) {
          const o = (gx - frontX + gz * 0.12) / 0.5;
          const band = frontLife * Math.exp(-o * o);
          hv += band * 1.6;
          glow += band * 1.2;
        }
        // an occasional slow sheen
        const so = (gx - sheenX - gz * 0.35) / 0.55;
        glow += 0.3 * Math.exp(-so * so);

        hv *= 0.85 + 0.45 * e;
        const crest = clamp((hv + 1.1) / 2.4, 0, 1);
        let a = near * (0.28 + 0.66 * crest + 0.16 * e) + glow * near * 0.7;
        const x = cx + (gx / XR) * XR * xs;
        const edge = smooth(0, 0.16, x / W) * smooth(0, 0.16, 1 - x / W); // soft left/right edges
        a *= horizonFade * edge * intro * 0.86;
        if (a < 0.03) continue;
        const y = baseY - hv * (5 + 24 * f) * lift;
        const idx = clamp(Math.round(a * (PAL - 1)), 0, PAL - 1);
        g.fillStyle = (crest > 0.78 || glow > 0.35 ? mint : deep)[idx];
        g.fillRect(Math.round(x - px / 2), Math.round(y - px / 2), px, px);
      }
    }
  }

  function frame(nowMs: number) {
    raf = 0;
    if (document.hidden) return;
    const dt = last ? Math.min(0.1, (nowMs - last) / 1000) : 0.016;
    last = nowMs;
    energy += (target - energy) * Math.min(1, dt * 3);
    draw((nowMs - t0) / 1000, nowMs);
    raf = requestAnimationFrame(frame);
  }

  function start() {
    if (reduced || raf) return;
    last = 0;
    raf = requestAnimationFrame(frame);
  }
  function onVisibility() {
    if (document.hidden) {
      if (raf) cancelAnimationFrame(raf);
      raf = 0;
    } else start();
  }

  resize();
  window.addEventListener("resize", resize);
  document.addEventListener("visibilitychange", onVisibility);
  start();

  const add = (x: number, z: number, amp: number, speed: number, delay: number) => {
    if (reduced) return;
    if (rings.length > 12) rings.shift();
    rings.push({ x, z, at: performance.now() + delay, speed, amp });
  };

  return {
    ripple() {
      const now = performance.now();
      if (now - lastRipple < 110) return; // fast typing: a ring every ~110ms at most
      lastRipple = now;
      add((Math.random() - 0.5) * 1.0, 1.6 + Math.random() * 0.8, 0.5, 1.9, 0);
    },
    send() {
      if (!reduced) sendAt = performance.now();
    },
    settle() {
      add(0, 2.1, 0.55, 1.3, 0);
      add(0, 2.1, 0.4, 1.3, 520);
    },
    setEnergy(on: boolean) {
      target = on && !reduced ? 1 : 0;
    },
    destroy() {
      if (raf) cancelAnimationFrame(raf);
      raf = 0;
      window.removeEventListener("resize", resize);
      document.removeEventListener("visibilitychange", onVisibility);
    },
  };
}

// The /auth/confirm route has no React: it inlines the same function.
export function authFieldScript(canvasId: string): string {
  return `var __af=(${authField.toString()})(document.getElementById(${JSON.stringify(canvasId)}));`;
}

export const AUTH_FIELD_CSS = `.af{position:absolute;inset:0;width:100%;height:100%;display:block;pointer-events:none}`;
