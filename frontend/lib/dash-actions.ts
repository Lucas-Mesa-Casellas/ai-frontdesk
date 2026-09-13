"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase-server";

export async function setDashLocale(formData: FormData) {
  const locale = String(formData.get("locale") ?? "en");
  const store = await cookies();
  store.set("lmc_locale", locale, {
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
    sameSite: "lax",
  });
  const path = String(formData.get("path") ?? "/dashboard");
  revalidatePath(path);
}

export async function confirmBooking(bookingId: string, path: string) {
  const supabase = await createClient();
  // RLS restricts this to bookings belonging to the caller's own
  // business (policy "owner can confirm own bookings", see
  // supabase/migrations/004_rls_policy_sync.sql) — a stranger with the ID
  // can't confirm someone else's booking even if they guessed it.
  const { error } = await supabase.from("bookings").update({ status: "confirmed" }).eq("id", bookingId);
  if (error) throw error;
  revalidatePath(path);
}

export async function cancelBooking(bookingId: string, path: string) {
  const supabase = await createClient();
  // Same RLS protection as confirmBooking -- restricted to the caller's
  // own business (supabase/migrations/004_rls_policy_sync.sql).
  const { error } = await supabase.from("bookings").update({ status: "cancelled" }).eq("id", bookingId);
  if (error) throw error;
  revalidatePath(path);
}
