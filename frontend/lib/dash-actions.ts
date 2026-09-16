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
  const { data, error } = await supabase.from("bookings").update({ status: "confirmed" }).eq("id", bookingId).select("id");
  if (error) {
    // Full PostgrestError (code/message/details/hint), not just the
    // generic "an error occurred" the client shows -- needed to tell an
    // actual RLS with-check violation apart from other failure modes.
    // Check server logs after reproducing to see this.
    console.error("[confirmBooking] update failed", { bookingId, error });
    throw error;
  }
  if (!data || data.length === 0) {
    // No Postgres error, but RLS's USING clause silently matched 0 rows --
    // e.g. this booking's business_id doesn't trace back to the caller's
    // own auth.uid() via businesses.owner_id. Distinct from the error case
    // above: the request "succeeded" as far as Postgres is concerned.
    console.error("[confirmBooking] update matched 0 rows (RLS likely filtered it)", { bookingId });
    throw new Error("Update matched no rows — check RLS policy / booking ownership.");
  }
  revalidatePath(path);
}

export async function cancelBooking(bookingId: string, path: string) {
  const supabase = await createClient();
  // Same RLS protection as confirmBooking -- restricted to the caller's
  // own business (supabase/migrations/004_rls_policy_sync.sql).
  const { data, error } = await supabase.from("bookings").update({ status: "cancelled" }).eq("id", bookingId).select("id");
  if (error) {
    console.error("[cancelBooking] update failed", { bookingId, error });
    throw error;
  }
  if (!data || data.length === 0) {
    console.error("[cancelBooking] update matched 0 rows (RLS likely filtered it)", { bookingId });
    throw new Error("Update matched no rows — check RLS policy / booking ownership.");
  }
  revalidatePath(path);
}

export async function deleteBooking(bookingId: string, path: string) {
  const supabase = await createClient();
  // A booking and the call it came from are deleted as a pair now -- look
  // up the linked call first (RLS: "owner can read own bookings") and
  // remove it before the booking itself, so if that fails we bail out
  // with both rows still intact rather than deleting the booking but
  // leaving its call behind.
  const { data: booking, error: fetchError } = await supabase
    .from("bookings").select("call_id").eq("id", bookingId).single();
  if (fetchError) {
    console.error("[deleteBooking] lookup failed", { bookingId, fetchError });
    throw fetchError;
  }
  if (booking.call_id) {
    // RLS: "owner can delete own calls" (supabase/migrations/007_delete_policies.sql).
    const { error: callError } = await supabase.from("calls").delete().eq("id", booking.call_id);
    if (callError) {
      console.error("[deleteBooking] linked call delete failed", { callId: booking.call_id, callError });
      throw callError;
    }
  }
  // RLS: "owner can delete own bookings" (supabase/migrations/007_delete_policies.sql).
  const { data, error } = await supabase.from("bookings").delete().eq("id", bookingId).select("id");
  if (error) {
    console.error("[deleteBooking] delete failed", { bookingId, error });
    throw error;
  }
  if (!data || data.length === 0) {
    console.error("[deleteBooking] delete matched 0 rows (RLS likely filtered it)", { bookingId });
    throw new Error("Delete matched no rows — check RLS policy / booking ownership.");
  }
  revalidatePath(path);
}

export async function deleteCall(callId: string, path: string) {
  const supabase = await createClient();
  // Mirror of deleteBooking: remove any booking made from this call first.
  // bookings.call_id is ON DELETE SET NULL, so deleting the call before its
  // bookings would detach them instead of removing them -- deleting them
  // here, by call_id, has to happen while the call still exists.
  // RLS: "owner can delete own bookings" (supabase/migrations/007_delete_policies.sql).
  const { error: bookingsError } = await supabase.from("bookings").delete().eq("call_id", callId);
  if (bookingsError) {
    console.error("[deleteCall] linked bookings delete failed", { callId, bookingsError });
    throw bookingsError;
  }
  // RLS: "owner can delete own calls" (supabase/migrations/007_delete_policies.sql).
  const { data, error } = await supabase.from("calls").delete().eq("id", callId).select("id");
  if (error) {
    console.error("[deleteCall] delete failed", { callId, error });
    throw error;
  }
  if (!data || data.length === 0) {
    console.error("[deleteCall] delete matched 0 rows (RLS likely filtered it)", { callId });
    throw new Error("Delete matched no rows — check RLS policy / call ownership.");
  }
  revalidatePath(path);
}
