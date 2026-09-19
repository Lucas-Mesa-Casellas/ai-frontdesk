import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

/**
 * Next.js 16 renamed the middleware.ts convention to proxy.ts, and the
 * exported function must be named `proxy` — creating middleware.ts here
 * (as older guides, and Kimi's plan, suggest) is silently ignored by
 * this version. See frontend/AGENTS.md, which already warns about this.
 */
// Remembers the last dashboard page a signed-in owner was on, so coming
// back to the site (the marketing homepage, or "/login" with a still-valid
// session) drops them back there instead of always bouncing to /dashboard
// and making them re-navigate to wherever they'd been (e.g. the calendar).
const LAST_PATH_COOKIE = "dash_last_path";

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
    response.cookies.set(LAST_PATH_COOKIE, pathname, {
      maxAge: 60 * 60 * 24 * 30,
      path: "/",
      sameSite: "lax",
    });
    return response;
  }

  // The dashboard's Home link goes to "/?marketing=1" on purpose: without
  // this bypass, "/" for a signed-in visitor would redirect straight back
  // into the dashboard, so Home would never actually reach the marketing
  // page. Typing or bookmarking plain "/" still resumes the dashboard.
  const wantsMarketing = pathname === "/" && request.nextUrl.searchParams.has("marketing");
  if ((pathname === "/login" || pathname === "/") && user && !wantsMarketing) {
    const lastPath = request.cookies.get(LAST_PATH_COOKIE)?.value;
    const target = lastPath?.startsWith("/dashboard") ? lastPath : "/dashboard";
    return NextResponse.redirect(new URL(target, request.url));
  }

  return response;
}

export const config = {
  matcher: ["/", "/dashboard/:path*", "/login", "/auth/:path*"],
};
