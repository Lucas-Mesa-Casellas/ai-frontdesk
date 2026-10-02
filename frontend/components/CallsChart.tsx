"use client";

import { useState } from "react";

type Bar = { count: number; tip: string; tick: string };
type View = { id: string; tab: string; title: string; sub: string; bars: Bar[]; thinLabels?: boolean };

// The Overview's calls chart: one card, one chart area, two views of the same
// calls -- by hour of day and by day of the week -- switched with a small
// segmented control. Everything shown (labels, tooltips, day names) is worked
// out on the server in the dashboard's language and passed in, so this only
// holds which view is open. The markup and classes are the ones the hour chart
// always had (styles live in app/dashboard/page.tsx).
export default function CallsChart({ views, switchLabel }: { views: View[]; switchLabel: string }) {
  const [id, setId] = useState(views[0].id);
  const view = views.find((v) => v.id === id) ?? views[0];

  const counts = view.bars.map((b) => b.count);
  const maxCount = Math.max(1, ...counts);
  // The y axis runs 0..niceMax in four equal steps (4, 8, 12... never a
  // ragged top like 7), and bars are scaled to it so they sit on the gridlines.
  const niceMax = Math.max(4, Math.ceil(maxCount / 4) * 4);
  const yTicks = [0, 1, 2, 3, 4].map((i) => (niceMax / 4) * (4 - i));
  const n = view.bars.length;

  return (
    <>
      <div className="ov-panel-head">
        <div>
          <h2 className="ov-h2">{view.title}</h2>
          <p className="ov-sub">{view.sub}</p>
        </div>
        <div className="ov-seg" role="group" aria-label={switchLabel}>
          {views.map((v) => (
            <button
              key={v.id} type="button" className={`ov-seg-btn${v.id === view.id ? " on" : ""}`}
              aria-pressed={v.id === view.id} onClick={() => setId(v.id)}
            >
              {v.tab}
            </button>
          ))}
        </div>
      </div>

      <div className={`ov-chart${n <= 7 ? " is-wide" : ""}`} key={view.id}>
        <div className="ov-yaxis" aria-hidden="true">
          {yTicks.map((v, i) => <span key={v} style={{ top: `${i * 25}%` }}>{v}</span>)}
        </div>
        <div className="ov-plot">
          <div className="ov-gridlines" aria-hidden="true"><i /><i /><i /><i /><i /></div>
          <div className="ov-hourbars">
            {/* Each slot is a full-height column (the bar sits in its bottom),
                so an empty one is still hoverable -- the bar alone is 2px tall
                when there are no calls. */}
            {view.bars.map((b, i) => (
              <div
                key={i}
                className={`ov-hourcol${i < 3 ? " edge-l" : i > n - 4 ? " edge-r" : ""}`}
                data-tip={b.tip}
                role="img"
                aria-label={b.tip}
              >
                <div
                  className={`ov-hourbar${b.count > 0 && b.count === maxCount ? " is-peak" : ""}`}
                  style={{ height: b.count > 0 ? `${Math.max((b.count / niceMax) * 100, 4)}%` : 2 }}
                />
              </div>
            ))}
          </div>
        </div>
      </div>
      <div className={`ov-hourlabels${n <= 7 ? " is-wide" : ""}`}>
        {/* One span per bar, same flex/gap sizing as .ov-hourbars, so each tick
            sits directly under its own bar. Slots without a tick render an
            empty span purely to hold the same width. */}
        {view.bars.map((b, i) => (
          <span key={i} className={view.thinLabels && i % 6 !== 0 ? "ov-hourlabel-thin" : undefined}>{b.tick}</span>
        ))}
      </div>
    </>
  );
}
