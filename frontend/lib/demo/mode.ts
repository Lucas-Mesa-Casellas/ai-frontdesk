import { headers } from "next/headers";

// Demo mode is switched on only by proxy.ts, which rewrites /demo/* to the real
// /dashboard/* pages and sets this request header itself (it deletes any copy a
// client sends). In demo mode the dashboard reads sample data from memory
// instead of Supabase and never sees a real session.
export async function isDemo(): Promise<boolean> {
  return (await headers()).get("x-lmc-demo") === "1";
}

// Where the dashboard lives in the URL: "/dashboard" for real, "/demo" in demo
// mode. Every link inside the dashboard is built from this, so the demo stays
// inside /demo.
export async function dashBase(): Promise<"/dashboard" | "/demo"> {
  return (await isDemo()) ? "/demo" : "/dashboard";
}
