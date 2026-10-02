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
    // The link itself was fine (Supabase redirected here with a code) but this
    // browser never asked for it: the PKCE verifier lives in the browser that
    // requested the email, so a link opened from a mail app's own browser, or
    // on another device, can't be exchanged. Say so instead of "expired".
    if (/code verifier/i.test(`${error.name} ${error.message}`)) {
      return NextResponse.redirect(`${origin}/login?error=browser`);
    }
  }

  return NextResponse.redirect(`${origin}/login?error=link`);
}
