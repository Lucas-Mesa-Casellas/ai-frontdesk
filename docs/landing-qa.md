# Landing page QA

Run 2026-10-01/02 against a production build (`next build` + `next start`) in headless Chrome,
in English, Spanish and French, at 320x568, 375x812, 390x844, 414x896, 768x1024, 1024x768 and
1440x900. Automated checks per viewport: horizontal overflow (before and after scrolling the whole
page), elements wider than the screen, interactive elements without an accessible name, images
without `alt`, duplicate ids, dead `#anchors`, `<h1>` count, transfer weight, console errors; plus the
tour (all four pages), the demo overlay (opens, size, no overflow inside the frame, dialog roles),
the voice player (with a missing audio file), language switching, `?lang=`, meta tags, robots, sitemap.

## Fixed (objective defects only; no design or copy changed)

| Defect | Where | Fix |
|---|---|---|
| At 320px the hero paragraph ran off the right edge ("understa|") because a plain `1fr` grid column cannot shrink below its widest child (the 340px sphere) | `app/globals.css` (`.hero` at <=1000px) | `minmax(0,1fr)` |
| `<html lang>` stayed `en` after switching the language on the page (screen readers keep the wrong pronunciation) | `components/Landing.tsx` (`pickLang`) | sets `document.documentElement.lang` |
| No canonical URL on the landing | `app/page.tsx` | `alternates.canonical = "/"` on that page only (not on `/login`) |
| No `theme-color` | `app/layout.tsx` | `viewport.themeColor` = the page background `#08090C` |

## Checked and fine

- No horizontal scroll at any width or language; the tour (4 pages), the voice player and the language menu do not overflow.
- Demo overlay: opens at every width, fills the screen on phones (about 90% on desktop), `role="dialog"` + `aria-modal`, closes with Escape, no overflow inside the frame.
- Voice player: all six clips load; a missing file shows a message and disables Play.
- Language: first visit English; `?lang=fr|es|en` sets and saves it; an invalid value falls back to English; no flash (server-rendered in the saved language).
- One `<h1>`, sensible heading order, no duplicate ids, no dead anchors, every `<img>` has `alt`, no console errors.
- Title, description, Open Graph (image 1200x630), Twitter card, icons, manifest all present; `robots.txt` disallows `/dashboard`, `/demo`, `/api`; sitemap lists `/` and `/login`; `/demo` is `noindex` and not in the sitemap.

## Found and left alone

| Item | Why left |
|---|---|
| Info icons (`.dh-i`) measure 16px on phones; the tap area is 40px through an invisible `::after`, but the visible target is small | design |
| Demo overlay buttons are 30-35px tall (below the 44px guideline) | design |
| Tour screenshots are 1440px wide PNGs (210-320 KB each, 1.2 MB for the four) shown at 290-380px on phones | performance, not a defect; a 720px `srcset` (or WebP) would cut roughly 70% on phones |
| Title and description are English only (they do not follow the visitor's language); no `og:locale` | would need new copy |
| The sphere's outer ring is cropped by a few px at 320px | decorative, no content lost |
| Sitemap `lastmod` is the request time (changes on every fetch) | harmless; set real dates when convenient |
| The contact textarea has a visible `<label>` (an automated "no name" flag on it is a false positive) | n/a |
| Page weight at first load: about 1.5 MB (180 KB JS, 48 KB fonts, 1.2 MB images), `DOMContentLoaded` 1.1-4.5 s on this machine under throttling-free headless Chrome | measured, no regressions found |
