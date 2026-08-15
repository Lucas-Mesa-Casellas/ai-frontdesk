import { createClient } from "@/lib/supabase-server";
import { getLocale } from "@/lib/locale";
import { DASH_T } from "@/lib/dash-i18n";
import { redirect } from "next/navigation";

export default async function SettingsPage({
  searchParams,
}: { searchParams: Promise<{ updated?: string }> }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const locale = await getLocale();
  const t = DASH_T[locale];
  const { updated } = await searchParams;

  const { data: business } = await supabase
    .from("businesses").select("*").eq("owner_id", user!.id).single();

  async function updateSettings(formData: FormData) {
    "use server";
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    const { data, error } = await supabase
      .from("businesses")
      .update({
        notification_email: formData.get("notification_email"),
        phone_number: formData.get("phone_number"),
      })
      .eq("owner_id", user!.id)
      .select();
    if (error || !data || data.length === 0) {
      redirect("/dashboard/settings?updated=false");
    }
    redirect("/dashboard/settings?updated=true");
  }

  async function signOut() {
    "use server";
    const supabase = await createClient();
    await supabase.auth.signOut();
    redirect("/login");
  }

  const field: React.CSSProperties = {
    width: "100%", fontSize: 14, color: "var(--text)",
    background: "rgba(255,255,255,.028)", border: "1px solid var(--hair-2)",
    borderRadius: 11, padding: "11px 13px",
  };
  const label: React.CSSProperties = { display: "block", fontSize: 12, fontWeight: 500, color: "var(--text-3)", marginBottom: 7 };

  return (
    <div style={{ padding: "28px 32px", maxWidth: 920 }}>
      <div className="dash-in" style={{ marginBottom: 26 }}>
        <h1 style={{ fontSize: 24, fontWeight: 600, letterSpacing: "-0.02em", marginBottom: 4 }}>{t.setTitle}</h1>
        <p style={{ color: "var(--text-3)", fontSize: 13.5 }}>{t.setSub}</p>
      </div>

      <div className="settings-grid">
        <div className="dash-card dash-in d1" style={{ padding: 22 }}>
          <h2 style={{ fontSize: 13, fontWeight: 600, marginBottom: 16 }}>{t.setBizInfo}</h2>
          <form action={updateSettings} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <div>
              <label style={label}>{t.setBizName}</label>
              <input defaultValue={business?.name} disabled style={{ ...field, opacity: 0.5 }} />
            </div>
            <div>
              <label style={label}>{t.setEmail}</label>
              <input type="email" name="notification_email" defaultValue={business?.notification_email} style={field} />
            </div>
            <div>
              <label style={label}>{t.setPhone}</label>
              <input type="tel" name="phone_number" defaultValue={business?.phone_number} style={field} />
            </div>
            <button
              type="submit"
              style={{
                alignSelf: "flex-start", padding: "10px 22px", borderRadius: 11, border: "none",
                fontSize: 13.5, fontWeight: 600, color: "#04140D", cursor: "pointer",
                background: "linear-gradient(180deg,#5CEBAF,var(--jade-2))",
                boxShadow: "0 1px 0 rgba(255,255,255,.45) inset, 0 8px 22px -10px rgba(18,185,129,.6)",
                transition: "transform .24s var(--e-out), box-shadow .24s var(--e-out)",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = "translateY(-1.5px)";
                e.currentTarget.style.boxShadow = "0 1px 0 rgba(255,255,255,.45) inset, 0 14px 32px -12px rgba(18,185,129,.75)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = "none";
                e.currentTarget.style.boxShadow = "0 1px 0 rgba(255,255,255,.45) inset, 0 8px 22px -10px rgba(18,185,129,.6)";
              }}
            >
              {t.setSave}
            </button>
            {updated === "true" && <p style={{ fontSize: 13, color: "var(--jade)" }}>{t.setSaved}</p>}
            {updated === "false" && <p style={{ fontSize: 13, color: "#E5877B" }}>Save failed — nothing was updated. Check permissions.</p>}
          </form>
        </div>

        <div className="dash-card dash-in d2" style={{ padding: 22, borderColor: "rgba(179,38,30,.25)" }}>
          <h2 style={{ fontSize: 13, fontWeight: 600, marginBottom: 4 }}>{t.setDanger}</h2>
          <p style={{ fontSize: 12.5, color: "var(--text-3)", marginBottom: 14 }}>{t.setDangerSub}</p>
          <form action={signOut}>
            <button
              type="submit"
              style={{
                padding: "9px 18px", borderRadius: 11, fontSize: 13, color: "#E5877B",
                border: "1px solid rgba(239,68,68,.28)", background: "rgba(239,68,68,.06)", cursor: "pointer",
              }}
            >
              {t.setSignOut}
            </button>
          </form>
        </div>
      </div>

      <style>{`
        .settings-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; align-items: start; }
        @media (max-width: 800px) {
          .settings-grid { grid-template-columns: 1fr; }
        }
      `}</style>
    </div>
  );
}
