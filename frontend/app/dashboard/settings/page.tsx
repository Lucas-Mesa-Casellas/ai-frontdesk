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
    await supabase
      .from("businesses")
      .update({
        notification_email: formData.get("notification_email"),
        phone_number: formData.get("phone_number"),
      })
      .eq("owner_id", user!.id);
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
    <div style={{ padding: 40, maxWidth: 920 }}>
      <div style={{ marginBottom: 26 }}>
        <h1 style={{ fontSize: 24, fontWeight: 600, letterSpacing: "-0.02em", marginBottom: 4 }}>{t.setTitle}</h1>
        <p style={{ color: "var(--text-3)", fontSize: 13.5 }}>{t.setSub}</p>
      </div>

      <div className="settings-grid">
        <div style={{ background: "rgba(255,255,255,.032)", border: "1px solid var(--hair)", borderRadius: 18, padding: 22 }}>
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
              }}
            >
              {t.setSave}
            </button>
            {updated === "true" && <p style={{ fontSize: 13, color: "var(--jade)" }}>{t.setSaved}</p>}
          </form>
        </div>

        <div style={{ background: "rgba(255,255,255,.032)", border: "1px solid var(--hair)", borderRadius: 18, padding: 22 }}>
          <h2 style={{ fontSize: 13, fontWeight: 600, marginBottom: 4 }}>{t.setDanger}</h2>
          <p style={{ fontSize: 12.5, color: "var(--text-3)", marginBottom: 14 }}>{t.setDangerSub}</p>
          <form action={signOut}>
            <button
              type="submit"
              style={{
                padding: "9px 18px", borderRadius: 11, fontSize: 13, color: "var(--text-2)",
                border: "1px solid var(--hair-2)", background: "transparent", cursor: "pointer",
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
