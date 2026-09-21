import { createClient } from "@/lib/supabase-server";
import { getLocale } from "@/lib/locale";
import { DASH_T } from "@/lib/dash-i18n";
import { redirect } from "next/navigation";
import Card from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";
import Field from "@/components/ui/Field";
import Button from "@/components/ui/Button";
import PageHeader from "@/components/ui/PageHeader";
 
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

  return (
    <div className="ui-page ui-page--md">
      <PageHeader eyebrow={<Badge tone="jade" dot>{t.navSettings}</Badge>} title={t.setTitle} lede={t.setSub} />

      <div className="settings-grid">
        <Card as="section" className="dash-in d1 set-card">
          <h2 className="set-title">{t.setBizInfo}</h2>
          <form action={updateSettings} className="set-form">
            <Field label={t.setBizName} htmlFor="set-name">
              <input id="set-name" defaultValue={business?.name} disabled className="ui-input" />
            </Field>
            <Field label={t.setEmail} htmlFor="set-email">
              <input id="set-email" type="email" name="notification_email" defaultValue={business?.notification_email} className="ui-input" />
            </Field>
            <Field label={t.setPhone} htmlFor="set-phone">
              <input id="set-phone" type="tel" name="phone_number" defaultValue={business?.phone_number} className="ui-input" />
            </Field>
            <div className="set-actions">
              <Button type="submit" variant="primary">{t.setSave}</Button>
              {updated === "true" && <p className="set-msg set-ok" role="status">{t.setSaved}</p>}
              {updated === "false" && <p className="set-msg set-bad" role="alert">{t.setSaveFailed}</p>}
            </div>
          </form>
        </Card>

        <Card as="section" className="dash-in d2 set-card">
          <h2 className="set-title">{t.setDanger}</h2>
          <p className="set-sub">{t.setDangerSub}</p>
          <form action={signOut}>
            <Button type="submit" variant="danger">{t.setSignOut}</Button>
          </form>
        </Card>
      </div>

      <style>{`
        .settings-grid { display: grid; grid-template-columns: minmax(0, 1.5fr) minmax(280px, 1fr); gap: 16px; align-items: start; }
        .set-card { padding: 28px; }
        .set-card:hover { transform: none; }
        .set-title { font-size: 15px; font-weight: 600; letter-spacing: -.015em; margin-bottom: 20px; }
        .set-sub { font-size: 13px; line-height: 1.55; color: var(--text-3); margin: -10px 0 18px; }
        .set-form { display: flex; flex-direction: column; gap: 18px; }
        .set-actions { display: flex; align-items: center; gap: 16px; flex-wrap: wrap; padding-top: 6px; }
        .set-msg { font-size: 13px; }
        .set-ok { color: var(--jade); }
        .set-bad { color: #E5877B; }
        @media (max-width: 860px) {
          .settings-grid { grid-template-columns: minmax(0, 1fr); }
        }
        @media (max-width: 480px) {
          .set-card { padding: 20px; }
        }
      `}</style>
    </div>
  );
}
