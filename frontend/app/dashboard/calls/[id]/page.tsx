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

  const urgencyLabel: Record<string, string> = { low: t.urgencyLow, normal: t.urgencyNormal, high: t.urgencyHigh };
  const intentLabel: Record<string, string> = {
    book_appointment: t.intentBookAppointment,
    callback: t.intentCallback,
    inquiry: t.intentInquiry,
    other: t.intentOther,
  };

  const card: React.CSSProperties = {
    background: "rgba(255,255,255,.032)", border: "1px solid var(--hair)", borderRadius: 18,
  };
  const field: React.CSSProperties = {
    padding: 14, borderRadius: 12, background: "rgba(255,255,255,.028)", border: "1px solid rgba(255,255,255,.04)",
  };
  const fieldLabel: React.CSSProperties = { fontSize: 10.5, textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--text-3)", marginBottom: 4 };

  return (
    <div style={{ padding: 40, maxWidth: 680 }}>
      <Link href="/dashboard/calls" style={{ display: "inline-flex", alignItems: "center", gap: 8, fontSize: 13, color: "var(--text-3)", textDecoration: "none", marginBottom: 22 }}>
        <IconArrowLeft width={14} height={14} /> {t.back}
      </Link>

      <div style={{ ...card, padding: 24, marginBottom: 18 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 20 }}>
          <span style={{
            width: 42, height: 42, borderRadius: "50%", flex: "none",
            display: "flex", alignItems: "center", justifyContent: "center",
            background: "rgba(55,226,155,.1)", border: "1px solid rgba(55,226,155,.22)", color: "var(--jade)",
          }}>
            <IconPhone width={17} height={17} />
          </span>
          <div style={{ minWidth: 0 }}>
            <h1 style={{ fontSize: 18, fontWeight: 600, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{call.caller_name || t.unknown}</h1>
            <p style={{ fontSize: 13, color: "var(--text-3)" }}>{call.caller_phone || t.noPhone}</p>
          </div>
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
          {call.intent && intentLabel[call.intent] && (
            <div style={field}>
              <p style={fieldLabel}>{t.detailIntent}</p>
              <p style={{ fontSize: 13.5, fontWeight: 500 }}>{intentLabel[call.intent]}</p>
            </div>
          )}
          {call.preferred_time && (
            <div style={{ ...field, background: "rgba(55,226,155,.07)", borderColor: "rgba(55,226,155,.18)" }}>
              <p style={{ ...fieldLabel, color: "var(--jade)" }}>{t.detailRequested}</p>
              <p style={{ fontSize: 13.5, fontWeight: 500, color: "var(--jade)" }}>{call.preferred_time}</p>
            </div>
          )}
          {call.urgency && call.urgency !== "normal" && (
            <div style={{ ...field, background: "rgba(255,193,120,.07)", borderColor: "rgba(255,193,120,.18)" }}>
              <p style={{ ...fieldLabel, color: "#FFC178" }}>{t.detailUrgency}</p>
              <p style={{ fontSize: 13.5, fontWeight: 500, color: "#FFC178" }}>{urgencyLabel[call.urgency] ?? call.urgency}</p>
            </div>
          )}
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
      </div>
    </div>
  );
}
