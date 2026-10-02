import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

/**
 * Next.js 16 renamed the middleware.ts convention to proxy.ts, and the
 * exported function must be named `proxy` — creating middleware.ts here
 * (as older guides, and Kimi's plan, suggest) is silently ignored by
 * this version. See frontend/AGENTS.md, which already warns about this.
 */
// Remembers which area a signed-in owner last used, so coming back to the site
// opens the same area: "dashboard" whenever a /dashboard/* page was served
// (they come back to the Overview, never to a deeper page), "site" whenever the
// marketing landing was (it opens at the top).
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

const DEMO_HEADER = "x-lmc-demo";
const LANG_COOKIE = "lmc_locale";

export async function proxy(request: NextRequest) {
  const { pathname: path } = request.nextUrl;

  // The interactive demo: /demo/* is the real dashboard rendered with sample
  // data (see lib/demo/*). It needs no session and touches no database, so it
  // is answered here, before anything auth-related. The header that switches
  // the pages into demo mode is set only on this path; a copy sent by a client
  // is deleted everywhere else below.
  if (path === "/demo" || path.startsWith("/demo/")) {
    const headers = new Headers(request.headers);
    headers.set(DEMO_HEADER, "1");
    const url = request.nextUrl.clone();
    url.pathname = "/dashboard" + path.slice("/demo".length);
    const res = NextResponse.rewrite(url, { request: { headers } });
    res.headers.set("X-Robots-Tag", "noindex, nofollow");
    return res;
  }

  // Every other route (the API routes included) must never see a demo switch a
  // client sent: only the rewrite above may set it. Routes that need neither a
  // session check nor cookies are forwarded right away, without the Supabase call.
  const touchesSession = path === "/" || path === "/login" || path.startsWith("/dashboard") || path.startsWith("/auth");
  if (!touchesSession) {
    const h = new Headers(request.headers);
    h.delete(DEMO_HEADER);
    return NextResponse.next({ request: { headers: h } });
  }

  // ?lang=fr|es|en on the landing sets the language and remembers it. The
  // cookie goes on the request too, so this very render already uses it.
  const langParam = path === "/" ? request.nextUrl.searchParams.get("lang")?.toLowerCase() : null;
  const newLang = langParam === "en" || langParam === "es" || langParam === "fr" ? langParam : null;
  if (newLang) request.cookies.set(LANG_COOKIE, newLang);

  // what the pages get to see of the request: its headers, minus any demo
  // switch a client may have sent
  const forward = () => {
    const h = new Headers(request.headers);
    h.delete(DEMO_HEADER);
    return { request: { headers: h } };
  };
  let response = NextResponse.next(forward());
  if (newLang) response.cookies.set(LANG_COOKIE, newLang, { maxAge: 60 * 60 * 24 * 365, path: "/", sameSite: "lax" });

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
          response = NextResponse.next(forward());
          if (newLang) response.cookies.set(LANG_COOKIE, newLang, { maxAge: 60 * 60 * 24 * 365, path: "/", sameSite: "lax" });
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
    if (!isBackgroundFetch(request)) response.cookies.set(AREA_COOKIE, "dashboard", COOKIE_OPTS);
    return response;
  }

  // The landing page. A signed-in visitor is taken into the dashboard Overview
  // only when they last left from the dashboard AND this is a cold arrival
  // (typed URL, bookmark, reopened browser). The dashboard's Home link, or a
  // last area of "site", shows the landing, which always opens at the top.
  if (pathname === "/" && user && request.cookies.get(AREA_COOKIE)?.value === "dashboard" && isColdArrival(request)) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  // "/login" with a still-valid session goes straight to the Overview.
  if (pathname === "/login" && user) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  // The landing was served: that is now the last area used.
  if (pathname === "/" && !isBackgroundFetch(request)) {
    response.cookies.set(AREA_COOKIE, "site", COOKIE_OPTS);
  }

  return response;
}

export const config = {
  // Everything except Next's static files and public assets: the demo header must
  // be stripped from API routes too (see above), not only from the pages.
  matcher: ["/((?!_next/static|_next/image|favicon|apple-touch-icon|icon-|site\\.webmanifest|tour/|business/|.*\\.(?:png|jpg|jpeg|webp|svg|ico|mp3|txt|xml)$).*)"],
};
