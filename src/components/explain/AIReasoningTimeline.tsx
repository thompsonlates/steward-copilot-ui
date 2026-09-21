import type { DomainType, MatchExplainResponse } from "../../api/types";

function clampNumber(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function toPercent(value?: number | null): number {
  if (typeof value !== "number" || Number.isNaN(value)) return 0;
  return clampNumber(Math.round(value * 100), 0, 100);
}

function displayDecision(value?: string | null): string {
  const v = (value ?? "").toUpperCase();

  switch (v) {
    case "AUTO_MERGE":
    case "APPROVE_MERGE":
    case "REVIEW":
    case "REVIEW_REQUIRED":
    case "REJECT_MERGE":
    case "BLOCK_MERGE":
      return v;
    default:
      return v || "UNKNOWN";
  }
}

function formatPolicyStatus(value?: string | null): string | undefined {
  if (!value) return undefined;
  return value.split("_").join(" ");
}

const productTimelineLabel = (
  text?: string | null,
  domain?: string
): string => {
  const value = text || "";

  if ((domain || "").toUpperCase() !== "PRODUCT") return value;

  return value
    .replaceAll("Name Similarity", "Product Name Similarity")
    .replaceAll("name pairs", "product name / description pairs")
    .replaceAll("Dob Match", "Effective / Lot Date Match")
    .replaceAll("DOB", "effective date / lot date")
    .replaceAll("Email Match", "GTIN Match")
    .replaceAll("Email values", "GTIN values")
    .replaceAll("Address Similarity", "Product Attribute Similarity")
    .replaceAll("Addresses", "Product attributes")
    .replaceAll("addresses", "product attributes")
    .replaceAll("Address Evidence", "Product Attribute Evidence")
    .replaceAll("Source Trust", "Source System Trust")
    .replaceAll("Policy Rules Applied", "Product Matching Rules Applied")
    .replaceAll("Triggered rules", "Product rules triggered");
};

const bankingTimelineText = (
  text?: string | null,
  domain?: string
): string => {
  const value = text || "";

  if ((domain || "").toUpperCase() !== "BANKING") return value;

  return value
    .replaceAll("account_id_match", "Account ID Match")
    .replaceAll("banking_customer_id_match", "Banking Customer ID Match")
    .replaceAll(
      "sap_business_partner_id_match",
      "SAP Business Partner ID Match"
    )
    .replaceAll("routing_number_match", "Routing Number Match")
    .replaceAll("account_number_last4_match", "Account Number Last 4 Match")
    .replaceAll("institution_name_match", "Institution Name Match")
    .replaceAll("account_type_match", "Account Type Match")
    .replaceAll("currency_match", "Currency Match")
    .replaceAll("account_status_match", "Account Status Match")
    .replaceAll("email_match", "Email Match")
    .replaceAll("phone_number_match", "Phone Number Match")
    .replaceAll("phone_match", "Phone Number Match")
    .replaceAll("source_system_match", "Source System Match")
    .replaceAll("Policy Rules Applied", "Banking Match Rules Applied")
    .replaceAll("Triggered rules:", "Banking rules evaluated:");
};

function getTimelineLabel(label: string, domain: string) {
  const normalized = label.toLowerCase();

  if (domain === "SUPPLIER") {
    if (normalized.includes("tax")) return "Tax ID Match Evaluated";
    if (normalized.includes("email")) {
      return "Supplier Contact Email Evaluated";
    }
    if (normalized.includes("name")) {
      return "Supplier Name Similarity Evaluated";
    }
    if (normalized.includes("address")) {
      return "Supplier Address Similarity Evaluated";
    }
    if (normalized.includes("phone")) {
      return "Supplier Contact Phone Evaluated";
    }
  }

  if (domain === "PRODUCT") {
    if (normalized.includes("product_id")) {
      return "Product ID Match Evaluated";
    }
    if (normalized.includes("gtin")) return "GTIN Match Evaluated";
    if (normalized.includes("lot")) {
      return "Effective Lot Date Evaluated";
    }
    if (normalized.includes("attribute")) {
      return "Product Attribute Similarity Evaluated";
    }
    if (normalized.includes("name")) {
      return "Product Name Similarity Evaluated";
    }
  }

  if (domain === "PATIENT") {
    if (normalized.includes("patient_id")) {
      return "Patient ID Match Evaluated";
    }
    if (normalized.includes("human_id")) {
      return "Immutable Human ID Match Evaluated";
    }
    if (normalized.includes("dob")) return "Patient DOB Match Evaluated";
    if (normalized.includes("name")) {
      return "Patient Name Similarity Evaluated";
    }
    if (normalized.includes("email")) return "Patient Email Match Evaluated";
    if (normalized.includes("address")) {
      return "Patient Address Similarity Evaluated";
    }
  }

  if (domain === "PROVIDER") {
    if (normalized.includes("provider_id")) {
      return "Provider ID Match Evaluated";
    }
    if (normalized.includes("npi")) return "NPI Match Evaluated";
    if (normalized.includes("specialty")) {
      return "Provider Specialty Evaluated";
    }
    if (normalized.includes("email")) {
      return "Provider Email Match Evaluated";
    }
    if (normalized.includes("phone_match")) {
      return "Provider Phone Number Match Evaluated";
    }
    if (normalized.includes("name")) {
      return "Provider Name Similarity Evaluated";
    }
    if (normalized.includes("address")) {
      return "Provider Address Similarity Evaluated";
    }
  }

  if (domain === "BANKING") {
    if (normalized.includes("account id")) return "Account ID Match Evaluated";
    if (normalized.includes("banking customer")) {
      return "Banking Customer ID Match Evaluated";
    }
    if (normalized.includes("sap business partner")) {
      return "SAP Business Partner ID Match Evaluated";
    }
    if (normalized.includes("routing")) {
      return "Routing Number Match Evaluated";
    }
    if (normalized.includes("last 4")) {
      return "Account Number Last 4 Evaluated";
    }
    if (normalized.includes("institution")) {
      return "Institution Name Evaluated";
    }
    if (normalized.includes("account type")) return "Account Type Evaluated";
    if (normalized.includes("currency")) return "Currency Evaluated";
    if (normalized.includes("account status")) return "Account Status Evaluated";
    if (normalized.includes("email")) return "Banking Email Evaluated";
    if (normalized.includes("phone")) {
      return "Banking Phone Number Evaluated";
    }
    if (normalized.includes("source trust")) {
      return "Source System Trust Evaluated";
    }
    if (normalized.includes("policy rules")) {
      return "Banking Match Rules Applied";
    }
  }

  return label;
}

function buildFallbackTimeline(result: MatchExplainResponse) {
  const events: Array<{
    title: string;
    detail: string;
    tone: "positive" | "neutral" | "warning";
  }> = [];

  const confidencePct =
    typeof result.decision_confidence_score === "number"
      ? Math.round(result.decision_confidence_score)
      : toPercent(result.confidence);

  const addressPct =
    typeof result.address_similarity_score === "number"
      ? Math.round(result.address_similarity_score * 100)
      : null;

  if (typeof result.decision_confidence_score === "number") {
    events.push({
      title: "Decision Confidence Calculated",
      detail: `The entity resolution engine calculated a decision confidence score of ${result.decision_confidence_score}/100 based on weighted match signals.`,
      tone:
        result.decision_confidence_score >= 85
          ? "positive"
          : result.decision_confidence_score >= 60
          ? "neutral"
          : "warning",
    });
  } else {
    events.push({
      title: "AI Confidence Evaluated",
      detail: `The model returned an overall confidence of ${confidencePct}% for this decision.`,
      tone:
        confidencePct >= 85
          ? "positive"
          : confidencePct >= 60
          ? "neutral"
          : "warning",
    });
  }

  if (result.primary_signal) {
    events.push({
      title: "Primary Signal Identified",
      detail: `The strongest signal influencing this decision was ${result.primary_signal
        .split("_")
        .join(" ")
        .toLowerCase()}.`,
      tone: "neutral",
    });
  }

  if (addressPct !== null) {
    events.push({
      title: "Address Evidence Reviewed",
      detail: result.address_match_insight
        ? `${result.address_match_insight} Address similarity was scored at ${addressPct}%.`
        : `Address similarity was scored at ${addressPct}% and factored into the final decision.`,
      tone:
        addressPct >= 85 ? "positive" : addressPct >= 60 ? "neutral" : "warning",
    });
  }

  if (result.risk_flag || typeof result.composite_risk_score === "number") {
    events.push({
      title: "Risk Evaluation Applied",
      detail:
        typeof result.composite_risk_score === "number"
          ? `Composite risk was evaluated at ${result.composite_risk_score}/100 with a risk flag of ${result.risk_flag ?? "UNKNOWN"}.`
          : `Risk was evaluated as ${result.risk_flag ?? "UNKNOWN"} before assigning the recommended action.`,
      tone:
        (result.risk_flag ?? "").toUpperCase() === "LOW"
          ? "positive"
          : (result.risk_flag ?? "").toUpperCase() === "MEDIUM"
          ? "neutral"
          : "warning",
    });
  }

  if (
    result.final_recommended_action ||
    result.recommended_action ||
    result.automation_policy_status
  ) {
    events.push({
      title: "Automation Readiness Evaluated",
      detail:
        typeof result.automation_readiness_score === "number"
          ? `Automation readiness was scored at ${result.automation_readiness_score}/100${
              result.automation_policy_status
                ? ` with status ${formatPolicyStatus(
                    result.automation_policy_status
                  )}`
                : ""
            }.`
          : "Automation readiness was evaluated using policy, confidence, and risk signals.",
      tone:
        typeof result.automation_readiness_score === "number"
          ? result.automation_readiness_score >= 85
            ? "positive"
            : result.automation_readiness_score >= 60
            ? "neutral"
            : "warning"
          : "neutral",
    });

    events.push({
      title: "Recommended Action Produced",
      detail: `The explainability engine recommended ${displayDecision(
        result.final_recommended_action ?? result.recommended_action
      )
        .split("_")
        .join(" ")
        .toLowerCase()} based on the combined evidence and policy-aware scoring.`,
      tone:
        displayDecision(
          result.final_recommended_action ?? result.recommended_action
        ) === "AUTO_MERGE" ||
        displayDecision(
          result.final_recommended_action ?? result.recommended_action
        ) === "APPROVE_MERGE"
          ? "positive"
          : displayDecision(
              result.final_recommended_action ?? result.recommended_action
            ).includes("REVIEW")
          ? "neutral"
          : "warning",
    });
  }

  return events;
}

function MatchEvidenceTimeline(props: {
  events?: MatchExplainResponse["match_evidence_timeline"];
  result?: MatchExplainResponse;
  domain: DomainType;
}) {
  const backendEvents = Array.isArray(props.events) ? props.events : [];
  const fallbackEvents = props.result ? buildFallbackTimeline(props.result) : [];
  const baseEvents = backendEvents.length ? backendEvents : fallbackEvents;

  const events =
    props.domain === "BANKING"
      ? baseEvents.filter((event) => {
          const title = String(event.title || "").toLowerCase();
          return !title.includes("address evidence");
        })
      : baseEvents;

  if (!events.length) return null;

  const toneStyles = {
    positive: {
      dot: "#16a34a",
      cardBg: "#f6fdf8",
      cardBorder: "#ccebd5",
      title: "#176b2c",
    },
    neutral: {
      dot: "#2563eb",
      cardBg: "#f8fbff",
      cardBorder: "#cfe0ff",
      title: "#1d4ed8",
    },
    warning: {
      dot: "#d97706",
      cardBg: "#fffaf2",
      cardBorder: "#f4d7a1",
      title: "#8a4b00",
    },
  } as const;

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
      <div style={{ display: "grid", gap: 12 }}>
        {events.map((event, idx) => {
          const normalizedTone =
            event.tone === "positive" ||
            event.tone === "neutral" ||
            event.tone === "warning"
              ? event.tone
              : "neutral";

          const tone = toneStyles[normalizedTone];

          return (
            <div
              key={`${event.title}-${idx}`}
              style={{
                display: "grid",
                gridTemplateColumns: "20px 1fr",
                gap: 12,
                alignItems: "start",
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "center",
                  position: "relative",
                  minHeight: 48,
                }}
              >
                <div
                  style={{
                    width: 10,
                    height: 10,
                    borderRadius: 999,
                    background: tone.dot,
                    marginTop: 6,
                    zIndex: 2,
                  }}
                />
                {idx < events.length - 1 ? (
                  <div
                    style={{
                      position: "absolute",
                      top: 18,
                      width: 2,
                      bottom: -16,
                      background: "#dbe2ea",
                    }}
                  />
                ) : null}
              </div>

              <div
                style={{
                  border: `1px solid ${tone.cardBorder}`,
                  background: tone.cardBg,
                  borderRadius: 14,
                  padding: "12px 14px",
                }}
              >
                <div
                  style={{
                    fontSize: 14,
                    fontWeight: 800,
                    color: tone.title,
                    marginBottom: 4,
                  }}
                >
                  {getTimelineLabel(
                    bankingTimelineText(
                      productTimelineLabel(event.title, props.domain),
                      props.domain
                    ),
                    props.domain
                  )}
                </div>
                <div
                  style={{
                    fontSize: 13,
                    lineHeight: 1.45,
                    color: "#334155",
                  }}
                >
                  {bankingTimelineText(
                    (event.detail ?? "")
                      .replaceAll(
                        "DOB",
                        props.domain === "SUPPLIER" ? "Tax ID" : "DOB"
                      )
                      .replaceAll(
                        "dob",
                        props.domain === "SUPPLIER" ? "tax id" : "dob"
                      )
                      .replaceAll(
                        "Email",
                        props.domain === "SUPPLIER"
                          ? "Supplier Contact Email"
                          : "Email"
                      )
                      .replaceAll(
                        "Address",
                        props.domain === "SUPPLIER"
                          ? "Supplier Address"
                          : "Address"
                      )
                      .replaceAll(
                        "Member ID",
                        props.domain === "SUPPLIER"
                          ? "Supplier ID"
                          : "Member ID"
                      ),
                    props.domain
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function AIReasoningTimeline(props: {
  events?: MatchExplainResponse["match_evidence_timeline"];
  result?: MatchExplainResponse;
  domain: DomainType;
}) {
  return (
    <div>
      <div
        style={{
          fontSize: 18,
          fontWeight: 800,
          color: "#1e3a5f",
          marginBottom: 10,
        }}
      >
        AI Reasoning Timeline
      </div>
      <MatchEvidenceTimeline
        events={props.events}
        result={props.result}
        domain={props.domain}
      />
    </div>
  );
}
