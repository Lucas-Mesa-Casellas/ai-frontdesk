// The background of the sign-in pages (/login and /auth/confirm): a voice-waveform
// line in the product's jade that crosses the screen behind the card, so it looks
// like it passes through the (opaque) card and comes out on both sides.
//
// Three layered paths plus a blurred copy of the main one for the neon glow. The
// main line draws in left to right (stroke-dashoffset, once), then stays lit and
// drifts sideways forever (one translateX loop over a repeating path) while its
// height "breathes" (scaleY). Everything that loops is transform/opacity only, with
// no JS. prefers-reduced-motion shows it static and fully drawn.
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

// One period of "speech": a loud burst, a short pause, a quieter burst. Every
// frequency is a whole number of cycles per period, so the line is continuous where
// one period meets the next and the drift can loop without a seam.
function wave(amp: number, phase: number, weights: [number, number, number]): string {
  const pts: string[] = [];
  for (let x = 0; x <= W; x += 3) {
    const t = (x % PERIOD) / PERIOD;
    const lobe = t < 0.56 ? Math.sin(Math.PI * (t / 0.56)) : 0.62 * Math.sin(Math.PI * ((t - 0.56) / 0.44));
    const env = Math.pow(Math.abs(lobe), 1.35);
    const s =
      weights[0] * Math.sin(2 * Math.PI * 11 * t + phase) +
      weights[1] * Math.sin(2 * Math.PI * 17 * t + phase * 1.7 + 0.8) +
      weights[2] * Math.sin(2 * Math.PI * 6 * t + 2.1 + phase);
    const y = MID - (amp * env * s) / 1.7;
    pts.push(`${x === 0 ? "M" : "L"}${x} ${y.toFixed(1)}`);
  }
  return pts.join("");
}

const MAIN = wave(86, 0, [1, 0.45, 0.25]);
const L2 = wave(64, 0.9, [1, 0.5, 0.3]);
const L3 = wave(42, 1.8, [0.9, 0.6, 0.35]);

export const AUTH_WAVE_CSS = `
.aw{position:absolute;inset:0;overflow:hidden;pointer-events:none;
  -webkit-mask-image:linear-gradient(90deg,transparent,#000 14%,#000 86%,transparent);
  mask-image:linear-gradient(90deg,transparent,#000 14%,#000 86%,transparent)}
.aw-rail{position:absolute;left:0;width:100%;top:calc(50% + var(--aw-offset,0px));transform:translateY(-50%)}
.aw-breathe{--aw-amp:1;transform:scaleY(var(--aw-amp));animation:aw-breathe 6s ease-in-out infinite alternate}
.aw-drift{width:max(120vw,1200px);will-change:transform;animation:aw-drift 16s linear infinite}
.aw-drift svg{display:block;width:100%;height:auto;overflow:visible}
.aw-draw{stroke-dasharray:1;stroke-dashoffset:1;animation:aw-draw 1.6s cubic-bezier(.4,0,.2,1) .15s forwards}
.aw-l2{opacity:.3;animation:aw-fade 1.2s ease-out .5s both}
.aw-l3{opacity:.15;animation:aw-fade 1.2s ease-out .9s both}
.aw-glow{opacity:.5;animation:aw-fade 1.4s ease-out .3s both}
@keyframes aw-draw{to{stroke-dashoffset:0}}
@keyframes aw-fade{from{opacity:0}}
@keyframes aw-drift{to{transform:translateX(-33.3333%)}}
@keyframes aw-breathe{from{transform:scaleY(calc(.9*var(--aw-amp)))}to{transform:scaleY(calc(1.1*var(--aw-amp)))}}
/* a phone's card is almost as wide as the screen, so behind it the line would be invisible: there it runs in the space above the card, smaller and fainter */
@media (max-width:480px){.aw{opacity:.62}.aw-breathe{--aw-amp:.62}.aw-rail{top:21%}}
@media (prefers-reduced-motion:reduce){
  .aw *{animation:none!important}
  .aw-draw{stroke-dashoffset:0}
}
`;

const stroke = (d: string, color: string, width: number, extra = "") =>
  `<path d="${d}" fill="none" stroke="${color}" stroke-width="${width}" stroke-linecap="round" stroke-linejoin="round" ${extra}/>`;

// The wave, as one HTML string. aria-hidden and pointer-events none: it is decoration.
export function authWaveMarkup(): string {
  return (
    `<div class="aw" aria-hidden="true"><div class="aw-rail"><div class="aw-breathe"><div class="aw-drift">` +
    `<svg viewBox="0 0 ${W} ${H}" focusable="false">` +
    `<defs><filter id="aw-blur" filterUnits="userSpaceOnUse" x="-40" y="-40" width="${W + 80}" height="${H + 80}"><feGaussianBlur stdDeviation="7"/></filter></defs>` +
    // the blurred copy of the main line: the neon glow
    `<g class="aw-glow" filter="url(#aw-blur)">${stroke(MAIN, "#37e29b", 5, 'pathLength="1" class="aw-draw"')}</g>` +
    `<g class="aw-l3">${stroke(L3, "#37e29b", 1.5)}</g>` +
    `<g class="aw-l2">${stroke(L2, "#12b981", 1.5)}</g>` +
    `<g style="opacity:.55">${stroke(MAIN, "#37e29b", 2, 'pathLength="1" class="aw-draw"')}</g>` +
    `</svg></div></div></div></div>`
  );
}

export default function AuthWave() {
  return (
    <>
      <div dangerouslySetInnerHTML={{ __html: authWaveMarkup() }} style={{ display: "contents" }} />
      <style>{AUTH_WAVE_CSS}</style>
    </>
  );
}
