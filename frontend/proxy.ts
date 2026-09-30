import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

/**
 * Next.js 16 renamed the middleware.ts convention to proxy.ts, and the
 * exported function must be named `proxy` — creating middleware.ts here
 * (as older guides, and Kimi's plan, suggest) is silently ignored by
 * this version. See frontend/AGENTS.md, which already warns about this.
 */
// Remembers where a signed-in owner last was, so coming back to the site
// picks up where they left off:
//   - LAST_PATH_COOKIE: the last dashboard page (e.g. the calendar).
//   - AREA_COOKIE: which area they were last in -- "dashboard" whenever a
//     /dashboard/* page was served, "site" whenever the marketing landing was.
const LAST_PATH_COOKIE = "dash_last_path";
const AREA_COOKIE = "lmc_area";
const COOKIE_OPTS = { maxAge: 60 * 60 * 24 * 30, path: "/", sameSite: "lax" as const };

// Sec-Fetch-Site is "none" when the visit did not come from any page: a typed
// URL, a bookmark, a reopened browser. A click on a link inside the site is
// "same-origin". A browser that doesn't send the header at all is treated as a
// cold arrival only when there is no Referer either.
function isColdArrival(request: NextRequest) {
  const site = request.headers.get("sec-fetch-site");
  return site ? site === "none" : !request.headers.get("referer");
}

// Only a real page load (a document request) counts as the visitor being on
// that page. Next.js's own background fetches -- link prefetches and in-app
// navigations, which reach here as ordinary requests with the RSC headers
// already stripped -- are script fetches (Sec-Fetch-Dest: empty) and must not
// overwrite the remembered page; components/RememberPlace.tsx records the
// in-dashboard navigation from the browser instead.
function isBackgroundFetch(request: NextRequest) {
  return request.headers.get("sec-fetch-dest") === "empty";
}

export async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const { data: { user } } = await supabase.auth.getUser();
  const { pathname } = request.nextUrl;

  if (pathname.startsWith("/dashboard") && !user) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  if (pathname.startsWith("/dashboard") && user) {
    if (!isBackgroundFetch(request)) {
      response.cookies.set(LAST_PATH_COOKIE, pathname, COOKIE_OPTS);
      response.cookies.set(AREA_COOKIE, "dashboard", COOKIE_OPTS);
    }
    return response;
  }

  // The landing page. A signed-in visitor is taken into the dashboard only
  // when they last left from the dashboard AND this is a cold arrival (typed
  // URL, bookmark, reopened browser). The dashboard's Home link, or a last
  // area of "site", shows the landing -- where its own saved scroll position
  // (client side, see app/page.tsx) puts them back where they were.
  if (pathname === "/" && user && request.cookies.get(AREA_COOKIE)?.value === "dashboard" && isColdArrival(request)) {
    const lastPath = request.cookies.get(LAST_PATH_COOKIE)?.value;
    const target = lastPath?.startsWith("/dashboard") ? lastPath : "/dashboard";
    return NextResponse.redirect(new URL(target, request.url));
  }

  // "/login" with a still-valid session goes straight to the last dashboard
  // page (or the overview).
  if (pathname === "/login" && user) {
    const lastPath = request.cookies.get(LAST_PATH_COOKIE)?.value;
    const target = lastPath?.startsWith("/dashboard") ? lastPath : "/dashboard";
    return NextResponse.redirect(new URL(target, request.url));
  }

  // The landing was served: that is now the last area used.
  if (pathname === "/" && !isBackgroundFetch(request)) {
    response.cookies.set(AREA_COOKIE, "site", COOKIE_OPTS);
  }

  return response;
}

export const config = {
  matcher: ["/", "/dashboard/:path*", "/login", "/auth/:path*"],
};
