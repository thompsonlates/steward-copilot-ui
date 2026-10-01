import type { DomainType, MatchExplainResponse } from "../../api/types";
import { Pill, SignalBar } from "./ExplainPrimitives";

type EntityResolutionSignal = {
  signal_name?: string | null;
  signal_score?: number | null;
  signal_weight?: number | null;
  weighted_score?: number | null;
  detail?: string | null;
  tone?: string | null;
  signal_band?: string | null;
  signal_rank?: number | null;
};

function formatSignalName(
  value?: string | null,
  domain?: string | null
): string {
  if (!value) return "Unknown Signal";

  const normalized = value.toUpperCase();
  const normalizedDomain = (domain || "CUSTOMER").toUpperCase();

  if (normalized === "NAME_SIMILARITY") {
    return "Name Similarity";
  }

  if (normalized === "ENTITY_ID_MATCH") {
    if (normalizedDomain === "PROVIDER") return "Provider ID Match";
    if (normalizedDomain === "SUPPLIER") return "Supplier ID Match";
    if (normalizedDomain === "PRODUCT") return "Product ID Match";
    if (normalizedDomain === "PATIENT") return "Patient ID Match";
    return "Member ID Match";
  }

  if (normalized === "NPI_MATCH") return "NPI Match";
  if (normalized === "PHONE_MATCH") return "Phone Match";
  if (normalized === "GTIN_MATCH") return "GTIN Match";
  if (normalized === "SKU_MATCH") return "SKU Match";

  if (normalized === "TAX_ID_MATCH" && normalizedDomain === "SUPPLIER") {
    return "Tax ID Match";
  }

  if (normalized === "DOB_MATCH") {
    if (normalizedDomain === "SUPPLIER") return "Tax ID Match";
    if (normalizedDomain === "PATIENT") return "Patient DOB Match";
    return "DOB Match";
  }

  if (normalized === "EMAIL_MATCH") {
    if (normalizedDomain === "SUPPLIER") {
      return "Supplier Contact Email Match";
    }
    if (normalizedDomain === "PROVIDER") return "Provider Email Match";
    return "Email Match";
  }

  if (normalized === "ADDRESS_MATCH") {
    if (normalizedDomain === "SUPPLIER") return "Supplier Address Match";
    if (normalizedDomain === "PROVIDER") return "Provider Address Match";
    return "Address Match";
  }

  if (normalizedDomain === "BANKING") {
    const bankingLabels: Record<string, string> = {
      ACCOUNT_ID_MATCH: "Account ID Match",
      BANKING_CUSTOMER_ID_MATCH: "Banking Customer ID Match",
      SAP_BUSINESS_PARTNER_ID_MATCH: "SAP Business Partner ID Match",
      ROUTING_NUMBER_MATCH: "Routing Number Match",
      ACCOUNT_NUMBER_LAST4_MATCH: "Account Number Last 4 Match",
      INSTITUTION_NAME_MATCH: "Institution Name Match",
      ACCOUNT_TYPE_MATCH: "Account Type Match",
      CURRENCY_MATCH: "Currency Match",
      ACCOUNT_STATUS_MATCH: "Account Status Match",
      EMAIL_MATCH: "Email Match",
      PHONE_MATCH: "Phone Match",
      SOURCE_TRUST: "Source Trust",
    };

    if (bankingLabels[normalized]) return bankingLabels[normalized];
  }

  return value
    .split("_")
    .join(" ")
    .toLowerCase()
    .replace(/\b\w/g, (character) => character.toUpperCase());
}

function normalizeSignals(
  result?: MatchExplainResponse | null
): EntityResolutionSignal[] {
  if (!result) return [];

  const raw = (result as any).entity_resolution_signals;
  if (!Array.isArray(raw)) return [];

  return raw.map((signal: any, index: number) => ({
    signal_name: signal.signal_name ?? `SIGNAL_${index + 1}`,
    signal_score:
      typeof signal.signal_score === "number" ? signal.signal_score : 0,
    signal_weight:
      typeof signal.signal_weight === "number"
        ? signal.signal_weight
        : undefined,
    weighted_score:
      typeof signal.weighted_score === "number"
        ? signal.weighted_score
        : undefined,
    detail: signal.detail,
    tone: signal.tone,
    signal_band: signal.signal_band,
    signal_rank: signal.signal_rank,
  }));
}

function DecisionSummaryRow(props: {
  decisionConfidenceScore?: number | null;
  automationStatus?: string | null;
  primarySignal?: string | null;
  domain: DomainType;
}) {
  const confidence = props.decisionConfidenceScore ?? 0;
  const automationStatus = props.automationStatus ?? "UNKNOWN";
  const primarySignal = props.primarySignal ?? "UNKNOWN";

  const confidenceTone =
    confidence >= 90
      ? { bg: "#e8f7ec", border: "#b7f5b7", color: "#176b2c" }
      : confidence >= 75
      ? { bg: "#eff6ff", border: "#bfdbfe", color: "#1d4ed8" }
      : confidence >= 50
      ? { bg: "#fff4e5", border: "#ffd199", color: "#8a4b00" }
      : { bg: "#fdeeee", border: "#efb5b5", color: "#8a1c1c" };

  return (
    <div
      style={{
        display: "flex",
        gap: 10,
        flexWrap: "wrap",
        marginBottom: 16,
      }}
    >
      <div
        style={{
          border: `1px solid ${confidenceTone.border}`,
          background: confidenceTone.bg,
          color: confidenceTone.color,
          borderRadius: 999,
          padding: "10px 14px",
          fontSize: 13,
          fontWeight: 700,
        }}
      >
        Decision Confidence {confidence}%
      </div>

      <div
        style={{
          border: "1px solid #dbeafe",
          background: "#f8fbff",
          color: "#1e3a5f",
          borderRadius: 999,
          padding: "10px 14px",
          fontSize: 13,
          fontWeight: 700,
        }}
      >
        Automation Status: {automationStatus.split("_").join(" ")}
      </div>

      <div
        style={{
          border: "1px solid #e5e7eb",
          background: "#fff",
          color: "#0f172a",
          borderRadius: 999,
          padding: "10px 14px",
          fontSize: 13,
          fontWeight: 700,
        }}
      >
        Primary Signal: {formatSignalName(primarySignal, props.domain)}
      </div>
    </div>
  );
}

function generateInsight({
  signals,
  decision,
}: {
  signals: { label: string; score: number }[];
  decision?: string | null;
}) {
  const safeScore = (score?: number | null) =>
    typeof score === "number" && Number.isFinite(score) ? score : 0;

  const strongSignals = signals
    .filter((signal) => safeScore(signal.score) >= 0.85)
    .map((signal) => signal.label);

  const weakSignals = signals
    .filter(
      (signal) =>
        safeScore(signal.score) > 0 && safeScore(signal.score) < 0.6
    )
    .map((signal) => signal.label);

  const missingSignals = signals
    .filter((signal) => safeScore(signal.score) === 0)
    .map((signal) => signal.label);

  const normalizedDecision = (decision ?? "").toUpperCase();
  const messages: string[] = [];

  if (strongSignals.length) {
    messages.push(`Supplier match driven by ${strongSignals.join(", ")}.`);
  }

  if (weakSignals.length) {
    messages.push(
      `Partial similarity observed in ${weakSignals.join(", ")}.`
    );
  }

  if (missingSignals.length) {
    messages.push(
      `Missing signals detected for ${missingSignals.join(", ")}.`
    );
  }

  if (
    normalizedDecision === "REVIEW_REQUIRED" ||
    normalizedDecision === "REVIEW"
  ) {
    messages.push("Manual review recommended due to conflicting signals.");
  }

  if (
    normalizedDecision === "AUTO_MERGE" ||
    normalizedDecision === "APPROVE_MERGE"
  ) {
    messages.push("Safe to merge based on strong multi-signal alignment.");
  }

  return messages.join(" ").trim();
}

export function SignalAttributionStrip(props: {
  result: MatchExplainResponse;
  recordA: Record<string, unknown>;
  recordB: Record<string, unknown>;
  domain: DomainType;
  automationStatus?: string | null;
}) {
  const { result } = props;
  const signals = normalizeSignals(result);

  const fallbackInsightText = generateInsight({
    signals: signals.map((signal) => ({
      label: formatSignalName(signal.signal_name, props.domain),
      score: signal.signal_score ?? 0,
    })),
    decision: result.recommended_action,
  });

  const insightText = result.ai_insight || fallbackInsightText;

  return (
    <div
      style={{
        border: "1px solid #e2e8f0",
        borderRadius: 18,
        background: "#ffffff",
        padding: 18,
        boxShadow: "0 6px 18px rgba(15, 23, 42, 0.04)",
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          gap: 12,
          alignItems: "center",
          flexWrap: "wrap",
          marginBottom: 14,
        }}
      >
        <div style={{ fontSize: 18, fontWeight: 800, color: "#1e3a5f" }}>
          AI Decision Signals
        </div>

        <div
          style={{
            fontSize: 12,
            fontWeight: 700,
            letterSpacing: 0.5,
            textTransform: "uppercase",
            color: "#64748b",
          }}
        >
          Signal Attribution Strip
        </div>
      </div>

      {insightText ? (
        <div
          style={{
            marginBottom: 16,
            padding: "12px 14px",
            borderRadius: 14,
            background: "#eff6ff",
            border: "1px solid #bfdbfe",
          }}
        >
          <div style={{ fontSize: 12, opacity: 0.7, marginBottom: 4 }}>
            AI Insight
          </div>

          <div
            style={{
              fontSize: 14,
              fontWeight: 600,
              color: "#1e3a5f",
              lineHeight: 1.5,
            }}
          >
            {insightText}
          </div>
        </div>
      ) : null}

      <div
        style={{
          marginBottom: 16,
          padding: "14px 16px",
          borderRadius: 14,
          background: "#f8fafc",
          border: "1px solid #e2e8f0",
        }}
      >
        <div style={{ fontSize: 12, opacity: 0.7, marginBottom: 6 }}>
          Decision Context
        </div>

        <div
          style={{
            fontSize: 14,
            fontWeight: 600,
            color: "#0f172a",
            lineHeight: 1.5,
          }}
        >
          {(result.recommended_action ?? "").includes("REVIEW")
            ? "This match contains mixed or incomplete signals. A steward should validate before merging."
            : (result.recommended_action ?? "").includes("REJECT") ||
              (result.recommended_action ?? "").includes("BLOCK")
            ? "Conflicting or high-risk signals detected. Merge should be prevented."
            : "Signals are strongly aligned across records. This is a strong candidate for merge."}
        </div>
      </div>

      <DecisionSummaryRow
        decisionConfidenceScore={result.decision_confidence_score}
        automationStatus={result.automation_policy_status}
        primarySignal={result.primary_signal}
        domain={props.domain}
      />

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
          gap: 18,
        }}
      >
        {signals.map((signal, index) => (
          <div
            key={`${signal.signal_name}_${index}`}
            style={{
              border: "1px solid #e5e7eb",
              borderRadius: 14,
              padding: 14,
              background: "#fff",
            }}
          >
            <SignalBar
              label={formatSignalName(signal.signal_name, props.domain)}
              score={signal.signal_score ?? 0}
              weight={
                typeof signal.signal_weight === "number"
                  ? signal.signal_weight
                  : undefined
              }
              contributionPct={
                typeof signal.weighted_score === "number"
                  ? Math.round(signal.weighted_score * 100)
                  : undefined
              }
              color={
                signal.tone === "positive"
                  ? "#16a34a"
                  : signal.tone === "warning"
                  ? "#f59e0b"
                  : signal.tone === "negative"
                  ? "#dc2626"
                  : "#2563eb"
              }
            />

            {signal.detail ? (
              <div
                style={{
                  marginTop: 8,
                  fontSize: 12,
                  lineHeight: 1.5,
                  color: "#475569",
                }}
              >
                {signal.detail}
              </div>
            ) : null}

            <div
              style={{
                display: "flex",
                gap: 8,
                flexWrap: "wrap",
                marginTop: 10,
              }}
            >
              {signal.signal_band ? (
                <Pill label="Band" value={signal.signal_band} />
              ) : null}

              {signal.signal_rank ? (
                <Pill label="Rank" value={signal.signal_rank} />
              ) : null}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
