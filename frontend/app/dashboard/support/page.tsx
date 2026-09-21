import { getLocale } from "@/lib/locale";
import { DASH_T } from "@/lib/dash-i18n";
import SupportForm from "@/components/SupportForm";
import Badge from "@/components/ui/Badge";
import PageHeader from "@/components/ui/PageHeader";

export default async function SupportPage() {
  const locale = await getLocale();
  const t = DASH_T[locale];

  return (
    <div className="ui-page ui-page--sm">
      <PageHeader eyebrow={<Badge tone="jade" dot>{t.navSupport}</Badge>} title={t.supTitle} lede={t.supSub} />

      <div className="dash-in d1">
        <SupportForm
          labels={{
            msgLabel: t.supMsgLabel, msgPh: t.supMsgPh,
            attachLabel: t.supAttachLabel, attachBtn: t.supAttachBtn, attachHint: t.supAttachHint, remove: t.supRemove,
            send: t.supSend, sending: t.supSending, sent: t.supSent, sentNote: t.supSentNote, error: t.supError,
            errTooBig: t.supErrTooBig, errType: t.supErrType, errTooMany: t.supErrTooMany,
          }}
        />
      </div>
    </div>
  );
}
