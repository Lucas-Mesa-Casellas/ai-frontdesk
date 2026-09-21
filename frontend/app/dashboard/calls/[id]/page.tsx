import { getAuthedBusiness } from "@/lib/dashboard-data";
import { getLocale } from "@/lib/locale";
import { DASH_T } from "@/lib/dash-i18n";
import { notFound } from "next/navigation";
import Link from "next/link";
import { IconArrowLeft, IconPhone } from "@/components/icons";
import { BUSINESS_TZ } from "@/lib/tz";
import { resolveTranslatable } from "@/lib/translate-helpers";
import TranslatedField from "@/components/TranslatedField";
import TranscriptPanel from "@/components/TranscriptPanel";
import DeleteButton from "@/components/DeleteButton";
import { deleteCall } from "@/lib/dash-actions";
import Card from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";
import TranscriptView from "@/components/ui/TranscriptView";

export default async function CallDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { supabase, business } = await getAuthedBusiness();
  const locale = await getLocale();
  const t = DASH_T[locale];

  const { data: call } = await supabase
    .from("calls").select("*").eq("id", id).single();
  if (!call) notFound();

  const businessLanguage = business?.language ?? "es";
  const summaryResolved = resolveTranslatable(call.summary, call.translations, "summary", locale, businessLanguage);
  const needsTranscriptTranslation = locale !== businessLanguage;
  const cachedTranscript: string | null = call.translations?.[locale]?.transcript ?? null;

  const intentLabel: Record<string, string> = {
    book_appointment: t.intentBookAppointment,
    callback: t.intentCallback,
    inquiry: t.intentInquiry,
    other: t.intentOther,
  };
  // green/amber/red traffic-light order, matching how the calendar already
  // colors urgency elsewhere -- low is calm/fine, high is a real emergency.
  const URGENCY: Record<string, { tone: "jade" | "warning" | "danger"; label: string }> = {
    low: { tone: "jade", label: t.urgencyLow },
    normal: { tone: "warning", label: t.urgencyNormal },
    high: { tone: "danger", label: t.urgencyHigh },
  };
  // urgency can be null (extraction failed, or it was never assessed) --
  // shown as its own neutral state rather than assumed to always be set.
  const urgency = call.urgency ? URGENCY[call.urgency] : null;

  const when = new Date(call.created_at);
  const initial = (call.caller_name || "").trim().charAt(0).toUpperCase();

  return (
    <div className="ui-page cd-page">
      <Link href="/dashboard/calls" className="cd-back dash-in">
        <IconArrowLeft width={14} height={14} /> {t.back}
      </Link>

      <div className="cd-layout">
        <div className="cd-main">
          {/* who called, when, and how it was classified */}
          <Card as="section" className="dash-in d1 cd-card cd-identity">
            <span className="cd-avatar" aria-hidden="true">{initial || <IconPhone width={20} height={20} />}</span>
            <div className="cd-who">
              <h1 className="cd-name">{call.caller_name || t.unknown}</h1>
              <p className="cd-phone">{call.caller_phone || t.noPhone}</p>
              <p className="cd-when">
                {when.toLocaleDateString(locale, { weekday: "long", day: "numeric", month: "long", timeZone: BUSINESS_TZ })}
                {" · "}
                {when.toLocaleTimeString(locale, { hour: "2-digit", minute: "2-digit", timeZone: BUSINESS_TZ })}
              </p>
            </div>
            <div className="cd-badges">
              {call.intent && intentLabel[call.intent] && <Badge>{intentLabel[call.intent]}</Badge>}
              <Badge tone={urgency ? urgency.tone : "neutral"}>{t.detailUrgency}: {urgency ? urgency.label : t.urgencyUnknown}</Badge>
            </div>
          </Card>

          {summaryResolved.text && (
            <Card as="section" className="dash-in d2 cd-card">
              <div className="cd-head"><h2 className="cd-title">{t.detailSummary}</h2></div>
              <p className="cd-summary">
                {summaryResolved.needsFetch ? (
                  <TranslatedField callId={call.id} locale={locale} field="summary" initialText={summaryResolved.text} />
                ) : (
                  summaryResolved.text
                )}
              </p>
            </Card>
          )}

          {call.transcript && (
            <Card as="section" className="dash-in d3 cd-card">
              {needsTranscriptTranslation ? (
                <TranscriptPanel
                  callId={call.id}
                  locale={locale}
                  originalTranscript={call.transcript}
                  cachedTranslation={cachedTranscript}
                  titleLabel={t.detailTranscript}
                  translateLabel={t.transcriptTranslateBtn}
                  translatingLabel={t.transcriptTranslating}
                  showOriginalLabel={t.transcriptShowOriginal}
                  showTranslatedLabel={t.transcriptShowTranslated}
                  errorLabel={t.transcriptTranslateError}
                />
              ) : (
                <div>
                  <div className="cd-head"><h2 className="cd-title">{t.detailTranscript}</h2></div>
                  <div className="cd-body cd-scroll">
                    <TranscriptView text={call.transcript} />
                  </div>
                </div>
              )}
            </Card>
          )}
        </div>

        {/* the facts of the call, and the one destructive action, kept quiet */}
        <aside className="cd-side">
          <Card as="section" className="dash-in d2 cd-card">
            <dl className="cd-facts">
              <div>
                <dt>{t.detailDate}</dt>
                <dd>{when.toLocaleDateString(locale, { weekday: "long", day: "numeric", month: "long", timeZone: BUSINESS_TZ })}</dd>
              </div>
              <div>
                <dt>{t.detailTime}</dt>
                <dd>{when.toLocaleTimeString(locale, { hour: "2-digit", minute: "2-digit", timeZone: BUSINESS_TZ })}</dd>
              </div>
              {call.intent && intentLabel[call.intent] && (
                <div>
                  <dt>{t.detailIntent}</dt>
                  <dd>{intentLabel[call.intent]}</dd>
                </div>
              )}
              {(call.preferred_time_iso || call.preferred_time) && (
                <div className="cd-fact-accent">
                  <dt>{t.detailRequested}</dt>
                  <dd>
                    {call.preferred_time_iso
                      ? (() => {
                          const parts = new Intl.DateTimeFormat("en-GB", {
                            day: "2-digit", month: "2-digit", year: "numeric",
                            hour: "2-digit", minute: "2-digit", hour12: false,
                            timeZone: BUSINESS_TZ,
                          }).formatToParts(new Date(call.preferred_time_iso));
                          const get = (t: string) => parts.find((p) => p.type === t)?.value;
                          return `${get("day")}/${get("month")}/${get("year")} - ${get("hour")}:${get("minute")}`;
                        })()
                      : call.preferred_time}
                  </dd>
                </div>
              )}
              {/* Always shown, not just when urgency isn't "normal" -- a
                  missing assessment gets its own neutral state instead of the
                  row disappearing entirely. */}
              <div>
                <dt>{t.detailUrgency}</dt>
                <dd><Badge tone={urgency ? urgency.tone : "neutral"}>{urgency ? urgency.label : t.urgencyUnknown}</Badge></dd>
              </div>
            </dl>

            <div className="cd-danger">
              <DeleteButton
                action={deleteCall.bind(null, call.id, "/dashboard/calls")}
                label={t.detailDelete}
                confirmMessage={t.detailDeleteConfirm}
                errorLabel={t.detailDeleteError}
                redirectTo="/dashboard/calls"
                className="ui-btn ui-btn--danger ui-btn--sm"
              />
            </div>
          </Card>
        </aside>
      </div>

      <style>{`
        .cd-page { max-width: 1180px; }
        .cd-back {
          display: inline-flex; align-items: center; gap: 8px; margin-bottom: 20px;
          font-size: 13px; color: var(--text-3); text-decoration: none; transition: color .2s var(--e-out);
        }
        .cd-back:hover { color: var(--text); }

        /* two columns: the call record (identity, summary, transcript) and its facts */
        .cd-layout { display: grid; grid-template-columns: minmax(0, 1.7fr) minmax(280px, 1fr); gap: 16px; align-items: start; }
        .cd-main { display: flex; flex-direction: column; gap: 16px; min-width: 0; }
        .cd-side { position: sticky; top: 20px; }
        .cd-card { padding: 24px; }
        .cd-card:hover { transform: none; }

        .cd-identity { display: flex; align-items: center; gap: 18px; flex-wrap: wrap; }
        .cd-avatar {
          width: 56px; height: 56px; border-radius: 50%; flex: none; display: grid; place-items: center;
          font-size: 20px; font-weight: 600; color: var(--jade);
          background: rgba(55,226,155,.09); border: 1px solid rgba(55,226,155,.26);
          box-shadow: 0 14px 30px -16px rgba(18,185,129,.7);
        }
        .cd-who { flex: 1; min-width: 0; }
        .cd-name { font-size: 24px; font-weight: 600; letter-spacing: -.025em; line-height: 1.15; margin: 0 0 4px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
        .cd-phone { font-size: 13.5px; color: var(--text-2); font-variant-numeric: tabular-nums; }
        .cd-when { font-size: 12.5px; color: var(--text-3); margin-top: 3px; }
        .cd-badges { display: flex; flex-wrap: wrap; gap: 8px; }

        /* shared block header + body (TranscriptPanel uses these too) */
        .cd-head { display: flex; align-items: center; justify-content: space-between; gap: 12px; flex-wrap: wrap; margin-bottom: 14px; }
        .cd-title { font-size: 13px; font-weight: 600; letter-spacing: .02em; color: var(--text-2); }
        .cd-summary { font-size: 16px; line-height: 1.65; color: var(--text); letter-spacing: -.005em; }
        .cd-body { padding: 16px; border-radius: 14px; background: rgba(255,255,255,.022); border: 1px solid var(--border); }
        .cd-scroll { max-height: 460px; overflow-y: auto; }
        .cd-error { font-size: 12.5px; color: #E5877B; margin-bottom: 10px; }

        .cd-facts { display: flex; flex-direction: column; }
        .cd-facts > div { display: flex; justify-content: space-between; align-items: baseline; gap: 16px; padding: 12px 0; border-bottom: 1px solid var(--border); }
        .cd-facts > div:first-child { padding-top: 0; }
        .cd-facts dt { font-size: 12.5px; color: var(--text-3); flex: none; }
        .cd-facts dd { font-size: 13.5px; font-weight: 500; text-align: right; min-width: 0; }
        .cd-fact-accent dt, .cd-fact-accent dd { color: var(--jade); }
        .cd-danger { padding-top: 18px; }

        @media (max-width: 1000px) {
          .cd-layout { grid-template-columns: minmax(0, 1fr); }
          .cd-side { position: static; }
        }
        @media (max-width: 560px) {
          .cd-card { padding: 18px; }
          .cd-name { font-size: 21px; }
        }
      `}</style>
    </div>
  );
}
