// Where each info icon sits on the tour screenshots, in % of the 1440x900 image: just
// after the end of the label each note explains, in each language. Measured from
// the real dashboard with the same selectors the demo uses (components/demo/DemoShell.tsx);
// re-measure when the screenshots are retaken. Order matches lib/tour-notes.ts.
import type { NoteSlide, TourLang } from "./tour-notes";

export const TOUR_ICONS: Record<TourLang, Record<NoteSlide, { x: number; y: number }[]>> = {
  EN: {
    overview: [{ x: 60.01, y: 24.02 }, { x: 32.03, y: 37.33 }],
    calls: [{ x: 24.05, y: 23.35 }, { x: 52.62, y: 36.72 }, { x: 75.8, y: 36.72 }],
    calendar: [{ x: 66.56, y: 24.45 }, { x: 74.08, y: 32.41 }],
    support: [{ x: 30.33, y: 24.91 }, { x: 32.24, y: 65.66 }],
  },
  ES: {
    overview: [{ x: 60.37, y: 24.02 }, { x: 34.87, y: 37.33 }],
    calls: [{ x: 24.6, y: 23.35 }, { x: 52.34, y: 36.72 }, { x: 76.49, y: 36.72 }],
    calendar: [{ x: 66.56, y: 24.45 }, { x: 73.93, y: 32.41 }],
    support: [{ x: 34.55, y: 24.91 }, { x: 34.64, y: 65.66 }],
  },
  FR: {
    overview: [{ x: 63.99, y: 24.02 }, { x: 30.72, y: 37.33 }],
    calls: [{ x: 23.09, y: 23.35 }, { x: 51.7, y: 36.72 }, { x: 75.72, y: 36.72 }],
    calendar: [{ x: 66.56, y: 24.45 }, { x: 74.19, y: 32.41 }],
    support: [{ x: 38.3, y: 27.32 }, { x: 33.09, y: 68.07 }],
  },
};
