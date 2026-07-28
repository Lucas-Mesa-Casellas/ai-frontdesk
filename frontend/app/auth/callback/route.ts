import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase-server";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const rawNext = searchParams.get("next") ?? "/dashboard";

  // Only allow genuine same-origin relative paths. Rejects anything that
  // could be read as an absolute or protocol-relative URL by any parser —
  // including the classic "//evil.com" trick and the backslash-normalization
  // variant ("/\evil.com") some browsers still fold into "//evil.com".
  const next = /^\/(?!\/|\\)\S*$/.test(rawNext) ? rawNext : "/dashboard";

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  return NextResponse.redirect(`${origin}/login?error=link`);
}
