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
  const URGENCY_STYLE: Record<string, { color: string; bg: string; border: string; label: string }> = {
    low: { color: "var(--jade)", bg: "rgba(55,226,155,.07)", border: "rgba(55,226,155,.18)", label: t.urgencyLow },
    normal: { color: "#FFC178", bg: "rgba(255,193,120,.07)", border: "rgba(255,193,120,.18)", label: t.urgencyNormal },
    high: { color: "#FF6B6B", bg: "rgba(255,107,107,.07)", border: "rgba(255,107,107,.18)", label: t.urgencyHigh },
  };
  // urgency can be null (extraction failed, or it was never assessed) --
  // shown as its own neutral state rather than assumed to always be set.
  const urgencyStyle = call.urgency ? URGENCY_STYLE[call.urgency] : null;

  const card: React.CSSProperties = {
    background: "rgba(255,255,255,.032)", border: "1px solid var(--hair)", borderRadius: 18,
  };
  const field: React.CSSProperties = {
    padding: 14, borderRadius: 12, background: "rgba(255,255,255,.028)", border: "1px solid rgba(255,255,255,.04)",
  };
  const fieldLabel: React.CSSProperties = { fontSize: 10.5, textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--text-3)", marginBottom: 4 };

  return (
    <div style={{ padding: 40, maxWidth: 680 }}>
      <Link href="/dashboard/calls" className="link-quiet" style={{ display: "inline-flex", alignItems: "center", gap: 8, fontSize: 13, marginBottom: 22 }}>
        <IconArrowLeft width={14} height={14} /> {t.back}
      </Link>

      <div style={{ ...card, padding: 24, marginBottom: 18 }}>
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12, marginBottom: 20 }}>
          <div style={{ display: "flex", alignItems: "flex-start", gap: 12, minWidth: 0 }}>
            <span style={{
              width: 42, height: 42, borderRadius: "50%", flex: "none", marginTop: 2,
              display: "flex", alignItems: "center", justifyContent: "center",
              background: "rgba(55,226,155,.1)", border: "1px solid rgba(55,226,155,.22)", color: "var(--jade)",
            }}>
              <IconPhone width={17} height={17} />
            </span>
            <div style={{ minWidth: 0 }}>
              {/* marginBottom overrides a leaked global h1{margin-bottom:16px
                  (or 22px)} rule in globals.css meant for the marketing
                  page's hero title -- an unscoped element selector, so it
                  was reaching every h1 in the app, including this one. */}
              <h1 style={{ fontSize: 18, fontWeight: 600, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", marginBottom: 2 }}>{call.caller_name || t.unknown}</h1>
              <p style={{ fontSize: 13, color: "var(--text-3)" }}>{call.caller_phone || t.noPhone}</p>
            </div>
          </div>
          {/* Sits at the same height as the name/number block instead of
              buried among the Date/Time fields below -- the type of call is
              as much identifying info as the caller's name is. */}
          {call.intent && intentLabel[call.intent] && (
            <span style={{
              flex: "none", fontSize: 12, fontWeight: 600, padding: "6px 12px", borderRadius: 20,
              background: "rgba(255,255,255,.05)", border: "1px solid var(--hair)", color: "var(--text-2)",
            }}>
              {intentLabel[call.intent]}
            </span>
          )}
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 20 }}>
          <div style={field}>
            <p style={fieldLabel}>{t.detailDate}</p>
            <p style={{ fontSize: 13.5, fontWeight: 500 }}>
              {new Date(call.created_at).toLocaleDateString(locale, { weekday: "long", day: "numeric", month: "long", timeZone: BUSINESS_TZ })}
            </p>
          </div>
          <div style={field}>
            <p style={fieldLabel}>{t.detailTime}</p>
            <p style={{ fontSize: 13.5, fontWeight: 500 }}>
              {new Date(call.created_at).toLocaleTimeString(locale, { hour: "2-digit", minute: "2-digit", timeZone: BUSINESS_TZ })}
            </p>
          </div>
          {(call.preferred_time_iso || call.preferred_time) && (
            <div style={{ ...field, background: "rgba(55,226,155,.07)", borderColor: "rgba(55,226,155,.18)" }}>
              <p style={{ ...fieldLabel, color: "var(--jade)" }}>{t.detailRequested}</p>
              <p style={{ fontSize: 13.5, fontWeight: 500, color: "var(--jade)" }}>
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
              </p>
            </div>
          )}
          {/* Always shown now, not just when urgency isn't "normal" -- a
              missing assessment (urgencyStyle null) gets its own neutral
              state instead of the box disappearing entirely. */}
          <div style={urgencyStyle ? { ...field, background: urgencyStyle.bg, borderColor: urgencyStyle.border } : field}>
            <p style={{ ...fieldLabel, color: urgencyStyle?.color }}>{t.detailUrgency}</p>
            <p style={{ fontSize: 13.5, fontWeight: 500, color: urgencyStyle?.color }}>
              {urgencyStyle ? urgencyStyle.label : t.urgencyUnknown}
            </p>
          </div>
        </div>

        {summaryResolved.text && (
          <div style={{ marginBottom: 18 }}>
            <h2 style={{ fontSize: 13, fontWeight: 600, marginBottom: 8 }}>{t.detailSummary}</h2>
            <p style={{ ...field, fontSize: 13.5, color: "var(--text-2)", lineHeight: 1.6 }}>
              {summaryResolved.needsFetch ? (
                <TranslatedField callId={call.id} locale={locale} field="summary" initialText={summaryResolved.text} />
              ) : (
                summaryResolved.text
              )}
            </p>
          </div>
        )}

        {call.transcript && (
          needsTranscriptTranslation ? (
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
              <h2 style={{ fontSize: 13, fontWeight: 600, marginBottom: 8 }}>{t.detailTranscript}</h2>
              <div style={{ ...field, fontSize: 13.5, color: "var(--text-2)", lineHeight: 1.6, maxHeight: 340, overflowY: "auto" }}>
                {call.transcript.split("\n").map((line: string, i: number) => (
                  <p key={i} style={{ marginBottom: 8 }}>{line}</p>
                ))}
              </div>
            </div>
          )
        )}

        <div style={{ marginTop: 24, paddingTop: 18, borderTop: "1px solid var(--hair)" }}>
          <DeleteButton
            action={deleteCall.bind(null, call.id, "/dashboard/calls")}
            label={t.detailDelete}
            confirmMessage={t.detailDeleteConfirm}
            errorLabel={t.detailDeleteError}
            redirectTo="/dashboard/calls"
            className="btn-danger"
            style={{
              padding: "9px 18px", borderRadius: 11, fontSize: 13, color: "#E5877B",
              border: "1px solid rgba(239,68,68,.28)", background: "rgba(239,68,68,.06)", cursor: "pointer",
            }}
          />
        </div>
      </div>
    </div>
  );
}
