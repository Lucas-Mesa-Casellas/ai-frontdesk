import { cache } from "react";
import { createClient } from "@/lib/supabase-server";

/**
 * Both the dashboard layout and every dashboard page were independently
 * calling supabase.auth.getUser() (a real network round-trip to Supabase's
 * Auth server, not a local cookie read) AND independently re-fetching the
 * business row — on every single navigation. None of it was cached or
 * parallelized, so one dashboard page load meant 6-8 sequential network
 * round-trips before a single pixel could render.
 *
 * React's cache() memoizes a function's result per request: no matter how
 * many places call getAuthedBusiness() during the same render pass (layout,
 * then the page inside it), the actual Supabase calls only fire once. This
 * is the standard Next.js App Router pattern for exactly this problem.
 */
export const getAuthedBusiness = cache(async () => {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return { supabase, user: null, business: null };
  }

  const { data: business } = await supabase
    .from("businesses")
    .select("*")
    .eq("owner_id", user.id)
    .single();

  return { supabase, user, business };
});
