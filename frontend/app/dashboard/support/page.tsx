import { getAuthedBusiness } from "@/lib/dashboard-data";
import { getLocale } from "@/lib/locale";
import { DASH_T } from "@/lib/dash-i18n";
import SupportForm from "@/components/SupportForm";

export default async function SupportPage() {
  const { user } = await getAuthedBusiness();
  const locale = await getLocale();
  const t = DASH_T[locale];

  return (
    <div className="sup-wrap">
      <div className="dash-in" style={{ marginBottom: 22 }}>
        <h1 style={{ fontSize: 24, fontWeight: 600, letterSpacing: "-0.02em", marginBottom: 4 }}>{t.supTitle}</h1>
        <p style={{ color: "var(--text-3)", fontSize: 13.5 }}>{t.supSub}</p>
      </div>

      <div className="dash-in d1">
        <SupportForm
          labels={{
            msgLabel: t.supMsgLabel, msgPh: t.supMsgPh,
            attachLabel: t.supAttachLabel, attachBtn: t.supAttachBtn, attachHint: t.supAttachHint, remove: t.supRemove,
            send: t.supSend, sending: t.supSending, sent: t.supSent, sentNote: t.supSentNote, error: t.supError,
            errTooBig: t.supErrTooBig, errType: t.supErrType, errTooMany: t.supErrTooMany,
            replyNote: user?.email ? t.supReplyNote(user.email) : "",
          }}
        />
      </div>

      <style>{`
        .sup-wrap { padding: 28px 32px; max-width: 920px; }
        @media (max-width: 700px) {
          .sup-wrap { padding: 18px 16px; }
        }
      `}</style>
    </div>
  );
}
