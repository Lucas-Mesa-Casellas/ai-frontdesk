import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

/**
 * Next.js 16 renamed the middleware.ts convention to proxy.ts, and the
 * exported function must be named `proxy` — creating middleware.ts here
 * (as older guides, and Kimi's plan, suggest) is silently ignored by
 * this version. See frontend/AGENTS.md, which already warns about this.
 */
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

  if (request.nextUrl.pathname.startsWith("/dashboard") && !user) {
    return NextResponse.redirect(new URL("/login", request.url));
  }
  if (request.nextUrl.pathname === "/login" && user) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  return response;
}

export const config = {
  matcher: ["/dashboard/:path*", "/login", "/auth/:path*"],
};
