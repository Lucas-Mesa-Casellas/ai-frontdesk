// The background of the sign-in pages (/login and /auth/confirm): a voice-waveform
// line in the product's jade that crosses the screen behind the card, so it looks
// like it passes through the (opaque) card and comes out on both sides.
//
// The line is alive and never settles. Its main stroke draws in once, left to right,
// then keeps travelling; two fainter echo lines travel at other speeds and in the
// other direction, so the three keep crossing and the shape is always changing;
// each layer's height breathes on its own rhythm; and a scatter of tiny square
// "pixels" rides the line and bobs up and down. Everything that loops is
// transform/opacity only, with no JS. On /login the card passes `active` while
// someone is typing their address, and the wave answers by growing and brightening
// (like a voice speaking). prefers-reduced-motion shows it static and fully drawn.
//
// It is plain markup + CSS strings, exported both as a component (the login page)
// and as strings (authWaveMarkup / AUTH_WAVE_CSS, for the /auth/confirm route
// handler, which returns hand-written HTML), so the two pages share one source.
// Position it by giving a positioned parent; --aw-offset moves the line down from
// the parent's vertical middle (to meet a card that is not exactly centred).

const W = 1800; // viewBox width: three repeats of a 600-unit period, so a drift of one third loops seamlessly
const H = 240;
const MID = H / 2;
const PERIOD = 600;

type Weights = [number, number, number];

// One period of "speech": a loud burst, a short pause, a quieter burst. Every
// frequency is a whole number of cycles per period, so the line is continuous where
// one period meets the next and the drift can loop without a seam.
function waveY(x: number, amp: number, phase: number, w: Weights): number {
  const t = (x % PERIOD) / PERIOD;
  const lobe = t < 0.56 ? Math.sin(Math.PI * (t / 0.56)) : 0.62 * Math.sin(Math.PI * ((t - 0.56) / 0.44));
  const env = Math.pow(Math.abs(lobe), 1.35);
  const s =
    w[0] * Math.sin(2 * Math.PI * 11 * t + phase) +
    w[1] * Math.sin(2 * Math.PI * 17 * t + phase * 1.7 + 0.8) +
    w[2] * Math.sin(2 * Math.PI * 6 * t + 2.1 + phase);
  return MID - (amp * env * s) / 1.7;
}

function wave(amp: number, phase: number, w: Weights): string {
  const pts: string[] = [];
  for (let x = 0; x <= W; x += 3) pts.push(`${x === 0 ? "M" : "L"}${x} ${waveY(x, amp, phase, w).toFixed(1)}`);
  return pts.join("");
}

const MAIN_ARGS: [number, number, Weights] = [86, 0, [1, 0.45, 0.25]];
const MAIN = wave(...MAIN_ARGS);
const L2 = wave(64, 0.9, [1, 0.5, 0.3]);
const L3 = wave(42, 1.8, [0.9, 0.6, 0.35]);

// The "pixels": tiny squares sitting near the main line (each one a little above or
// below it), each bobbing and twinkling on its own timing. One period's worth is
// made once and repeated, so they travel with the line and loop without a seam.
// Fixed pseudo-random numbers, so the server and the browser draw the same thing.
function pixels(): string {
  let seed = 7;
  const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  const one: { x: number; dy0: number; size: number; bob: number; dur: number; delay: number }[] = [];
  for (let x = 14; x < PERIOD; x += 17 + Math.floor(rnd() * 16)) {
    one.push({
      x,
      dy0: (rnd() - 0.5) * 70, // a little above or below the line
      size: 2 + rnd() * 2.2,
      bob: 5 + rnd() * 13, // how far it travels up and down
      dur: 1.8 + rnd() * 2.6,
      delay: -rnd() * 4,
    });
  }
  let out = "";
  for (let rep = 0; rep < W / PERIOD; rep++) {
    for (const p of one) {
      const x = p.x + rep * PERIOD;
      const y = waveY(x, ...MAIN_ARGS) + p.dy0;
      out += `<rect class="aw-px" x="${(x - p.size / 2).toFixed(1)}" y="${(y - p.size / 2).toFixed(1)}" width="${p.size.toFixed(1)}" height="${p.size.toFixed(1)}" style="--dy:${p.bob.toFixed(1)}px;--d:${p.dur.toFixed(2)}s;--dl:${p.delay.toFixed(2)}s"/>`;
    }
  }
  return out;
}
const PIXELS = pixels();

export const AUTH_WAVE_CSS = `
.aw{position:absolute;inset:0;overflow:hidden;pointer-events:none;
  -webkit-mask-image:linear-gradient(90deg,transparent,#000 14%,#000 86%,transparent);
  mask-image:linear-gradient(90deg,transparent,#000 14%,#000 86%,transparent)}
.aw-rail{position:absolute;left:0;width:100%;top:calc(50% + var(--aw-offset,0px));transform:translateY(-50%)}
/* while someone types, the whole wave grows and brightens, and eases back when they stop */
.aw-react{transform:scaleY(1);transition:transform .7s cubic-bezier(.22,1,.36,1),opacity .7s ease-out}
.aw--active .aw-react{transform:scaleY(1.4)}
.aw--active .aw-px{filter:brightness(1.5)}
/* each layer breathes on its own rhythm (--aw-amp is the phone's smaller size) */
.aw-breathe{--aw-amp:1;transform:scaleY(var(--aw-amp));animation:aw-breathe 5s ease-in-out infinite alternate}
.aw-b2{animation-duration:7.5s;animation-direction:alternate-reverse;animation-delay:-2s}
.aw-b3{animation-duration:6.2s;animation-delay:-4s}
/* three layers travelling at different speeds, the middle one the other way, so they keep crossing */
.aw-drift{width:max(120vw,1200px);will-change:transform;animation:aw-drift 11s linear infinite}
.aw-d2{animation-duration:15s;animation-direction:reverse}
.aw-d3{animation-duration:21s}
.aw-drift svg{display:block;width:100%;height:auto;overflow:visible}
.aw-stack{position:relative}
.aw-stack > .aw-breathe + .aw-breathe{position:absolute;left:0;top:0;width:100%}
.aw-draw{stroke-dasharray:1;stroke-dashoffset:1;animation:aw-draw 1.6s cubic-bezier(.4,0,.2,1) .15s forwards}
.aw-l2{opacity:.34;animation:aw-fade 1.2s ease-out .5s both}
.aw-l3{opacity:.2;animation:aw-fade 1.2s ease-out .9s both}
.aw-glow{opacity:.5;animation:aw-fade 1.4s ease-out .3s both}
.aw-pxs{opacity:.8;animation:aw-fade 1.6s ease-out 1s both}
.aw-px{fill:#8bf0c6;transition:filter .5s;animation:aw-bob var(--d) ease-in-out var(--dl) infinite alternate,aw-twinkle calc(var(--d)*1.4) ease-in-out var(--dl) infinite alternate}
@keyframes aw-draw{to{stroke-dashoffset:0}}
@keyframes aw-fade{from{opacity:0}}
@keyframes aw-drift{to{transform:translateX(-33.3333%)}}
@keyframes aw-breathe{from{transform:scaleY(calc(.85*var(--aw-amp)))}to{transform:scaleY(calc(1.15*var(--aw-amp)))}}
@keyframes aw-bob{from{transform:translateY(calc(var(--dy)*-1))}to{transform:translateY(var(--dy))}}
@keyframes aw-twinkle{from{opacity:.25}to{opacity:1}}
/* a phone's card is almost as wide as the screen, so behind it the line would be invisible: there it runs in the space above the card, smaller and fainter */
@media (max-width:480px){.aw{opacity:.7}.aw-breathe{--aw-amp:.62}.aw-rail{top:21%}}
@media (prefers-reduced-motion:reduce){
  .aw *{animation:none!important;transition:none!important}
  .aw-draw{stroke-dashoffset:0}
  .aw-px{opacity:.6}
}
`;

const stroke = (d: string, color: string, width: number, extra = "") =>
  `<path d="${d}" fill="none" stroke="${color}" stroke-width="${width}" stroke-linecap="round" stroke-linejoin="round" ${extra}/>`;

const DEFS = `<defs><filter id="aw-blur" filterUnits="userSpaceOnUse" x="-40" y="-40" width="${W + 80}" height="${H + 80}"><feGaussianBlur stdDeviation="7"/></filter></defs>`;
const svg = (inner: string) => `<svg viewBox="0 0 ${W} ${H}" focusable="false">${inner}</svg>`;
const layer = (breathe: string, drift: string, inner: string) =>
  `<div class="aw-breathe ${breathe}"><div class="aw-drift ${drift}">${svg(inner)}</div></div>`;

// The wave, as one HTML string. aria-hidden and pointer-events none: it is decoration.
export function authWaveMarkup(active = false): string {
  return (
    `<div class="aw${active ? " aw--active" : ""}" aria-hidden="true"><div class="aw-rail"><div class="aw-react"><div class="aw-stack">` +
    // the main line, its blurred glow copy and the pixels riding it
    layer(
      "aw-b1",
      "aw-d1",
      DEFS +
        `<g class="aw-glow" filter="url(#aw-blur)">${stroke(MAIN, "#37e29b", 5, 'pathLength="1" class="aw-draw"')}</g>` +
        `<g style="opacity:.6">${stroke(MAIN, "#37e29b", 2, 'pathLength="1" class="aw-draw"')}</g>` +
        `<g class="aw-pxs">${PIXELS}</g>`,
    ) +
    // two fainter echoes travelling at their own speeds
    layer("aw-b2", "aw-d2", `<g class="aw-l2">${stroke(L2, "#12b981", 1.5)}</g>`) +
    layer("aw-b3", "aw-d3", `<g class="aw-l3">${stroke(L3, "#37e29b", 1.5)}</g>`) +
    `</div></div></div></div>`
  );
}

export default function AuthWave({ active = false }: { active?: boolean }) {
  return (
    <>
      {/* the markup never changes after render; `active` is a class on its root, set from outside */}
      <div dangerouslySetInnerHTML={{ __html: authWaveMarkup(false) }} style={{ display: "contents" }} ref={(el) => {
        el?.querySelector(".aw")?.classList.toggle("aw--active", active);
      }} />
      <style>{AUTH_WAVE_CSS}</style>
    </>
  );
}
