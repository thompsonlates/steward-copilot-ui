import type { MatchExplainResponse } from "../../api/types";
import { SummaryCard } from "./ExplainPrimitives";

function clampNumber(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function toPercent(value?: number | null): number {
  if (typeof value !== "number" || Number.isNaN(value)) return 0;
  return clampNumber(Math.round(value * 100), 0, 100);
}

function getDecisionConfidence(result?: MatchExplainResponse | null): number {
  if (!result) return 0;

  if (typeof result.decision_confidence_score === "number") {
    return clampNumber(Math.round(result.decision_confidence_score), 0, 100);
  }

  return toPercent(result.confidence);
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

function coerceOptionalNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim() !== "") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

function getOverrideRateEstimate(
  result?: MatchExplainResponse | null
): number | null {
  if (!result) return null;

  const candidate = result as MatchExplainResponse & {
    override_rate_estimate?: unknown;
    policy_metrics?: { override_rate_estimate?: unknown } | null;
    steward_learning_signal?: { override_rate_estimate?: unknown } | null;
  };

  return (
    coerceOptionalNumber(candidate.override_rate_estimate) ??
    coerceOptionalNumber(candidate.policy_metrics?.override_rate_estimate) ??
    coerceOptionalNumber(
      candidate.steward_learning_signal?.override_rate_estimate
    )
  );
}

function getEstimatedFalsePositiveRisk(result: MatchExplainResponse): number {
  if (typeof result.estimated_false_positive_risk === "number") {
    return clampNumber(result.estimated_false_positive_risk, 0, 100);
  }

  const overrideRateEstimate = getOverrideRateEstimate(result);
  if (overrideRateEstimate !== null) {
    return clampNumber(Math.round(overrideRateEstimate * 100), 0, 100);
  }

  if (typeof result.composite_risk_score === "number") {
    return clampNumber(Math.round(result.composite_risk_score * 0.16), 0, 100);
  }

  return 0;
}

function getRiskDriverCardTone(riskFlag?: string): {
  border: string;
  background: string;
  titleColor: string;
} {
  const risk = (riskFlag ?? "").toUpperCase();

  if (risk === "HIGH" || risk === "CRITICAL" || risk === "SEVERE") {
    return {
      border: "#fecaca",
      background: "#fef2f2",
      titleColor: "#991b1b",
    };
  }

  if (risk === "MEDIUM" || risk === "MODERATE" || risk === "ELEVATED") {
    return {
      border: "#fde68a",
      background: "#fffbeb",
      titleColor: "#92400e",
    };
  }

  return {
    border: "#bbf7d0",
    background: "#f0fdf4",
    titleColor: "#166534",
  };
}

function formatRiskDriver(driver: string): {
  label: string;
  color: string;
  background: string;
  severity: "critical" | "supporting";
} {
  const normalized = driver.toLowerCase().replace(/_/g, " ").trim();

  const criticalLabels: Record<string, string> = {
    "member id": "Member ID Conflict",
    "patient id": "Patient ID Conflict",
    "provider id": "Provider ID Conflict",
    "supplier id": "Supplier ID Conflict",
    "product id": "Product ID Conflict",
    npi: "NPI Conflict",
    gtin: "GTIN Conflict",
    "tax id": "Tax ID Conflict",
    dob: "DOB Conflict",
  };

  const supportingLabels: Record<string, string> = {
    name: "Name Conflict",
    first_name: "First Name Conflict",
    "first name": "First Name Conflict",
    last_name: "Last Name Conflict",
    "last name": "Last Name Conflict",
    "product variant": "Product Variant / Pack Size Conflict",
    product_variant: "Product Variant / Pack Size Conflict",
    "item category": "Item Category Conflict",
    item_category: "Item Category Conflict",
    "product name": "Product Name Conflict",
    product_name: "Product Name Conflict",
    sku: "SKU Conflict",
    email: "Email Conflict",
    address: "Address Conflict",
    specialty: "Specialty Conflict",
    "source system": "Source System Conflict",
    source_system: "Source System Conflict",
  };

  if (criticalLabels[normalized]) {
    return {
      label: criticalLabels[normalized],
      severity: "critical",
      color: "#991b1b",
      background: "#fee2e2",
    };
  }

  if (supportingLabels[normalized]) {
    return {
      label: supportingLabels[normalized],
      severity: "supporting",
      color: "#92400e",
      background: "#fef3c7",
    };
  }

  return {
    label: `${normalized.replace(/\b\w/g, (c) => c.toUpperCase())} Conflict`,
    severity: "supporting",
    color: "#92400e",
    background: "#fef3c7",
  };
}

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
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

function getDecisionTone(
  value?: string | null
): "positive" | "warning" | "danger" | "neutral" {
  const v = (value ?? "").toUpperCase();

  if (v.includes("AUTO") || v.includes("APPROVE")) return "positive";
  if (v.includes("REVIEW")) return "warning";
  if (v.includes("BLOCK") || v.includes("REJECT")) return "danger";
  return "neutral";
}

function getRiskTone(
  value?: string | null
): "positive" | "warning" | "danger" | "neutral" {
  const v = (value ?? "").toUpperCase();

  if (v === "LOW") return "positive";
  if (v === "MEDIUM" || v === "ELEVATED" || v === "MODERATE") {
    return "warning";
  }
  if (v === "HIGH" || v === "SEVERE" || v === "CRITICAL") return "danger";
  return "neutral";
}

export function AIDecisionSummary(props: { result: MatchExplainResponse }) {
  const { result } = props;
  const riskDriverTone = getRiskDriverCardTone(result.risk_flag);
  const engineConfidence = getDecisionConfidence(result);

  return (
    <div
      style={{
        border: "1px solid #dbeafe",
        background: "linear-gradient(180deg, #ffffff 0%, #f8fbff 100%)",
        borderRadius: 22,
        padding: 18,
        boxShadow: "0 10px 26px rgba(15, 23, 42, 0.05)",
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
        <div style={{ fontSize: 22, fontWeight: 900, color: "#1e3a5f" }}>
          AI Decision Summary
        </div>

        <div
          style={{
            fontSize: 12,
            fontWeight: 700,
            textTransform: "uppercase",
            letterSpacing: 0.5,
            color: "#64748b",
          }}
        >
          Governance Decision Snapshot
        </div>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))",
          gap: 12,
        }}
      >
        <SummaryCard
          label="Decision"
          value={displayDecision(result.ai_decision).split("_").join(" ")}
          tone={getDecisionTone(result.ai_decision)}
        />
        <SummaryCard label="Confidence" value={`${engineConfidence}%`} />
        <SummaryCard
          label="Risk"
          value={result.risk_flag}
          tone={getRiskTone(result.risk_flag)}
        />
        <SummaryCard
          label="Final Action"
          value={displayDecision(
            result.final_recommended_action ?? result.recommended_action
          )
            .split("_")
            .join(" ")}
          tone={getDecisionTone(
            result.final_recommended_action ?? result.recommended_action
          )}
        />
        <SummaryCard
          label="Automation Readiness"
          value={
            typeof result.automation_readiness_score === "number"
              ? `${result.automation_readiness_score}%`
              : "—"
          }
          tone={
            typeof result.automation_readiness_score === "number"
              ? result.automation_readiness_score >= 85
                ? "positive"
                : result.automation_readiness_score >= 60
                ? "warning"
                : "danger"
              : "neutral"
          }
        />
        <SummaryCard
          label="Policy Status"
          value={formatPolicyStatus(result.automation_policy_status) ?? "—"}
          tone={getDecisionTone(result.automation_policy_status)}
        />
        <SummaryCard
          label="False Positive Risk"
          value={`${getEstimatedFalsePositiveRisk(result)}%`}
          tone={
            getEstimatedFalsePositiveRisk(result) >= 60
              ? "danger"
              : getEstimatedFalsePositiveRisk(result) >= 30
              ? "warning"
              : "positive"
          }
        />
        <SummaryCard
          label="Primary Signal"
          value={
            result.primary_signal
              ? formatSignalName(result.primary_signal, (result as any).domain)
              : "—"
          }
        />
      </div>

      {result.risk_flag && (
        <div
          style={{
            marginTop: 20,
            padding: 22,
            borderRadius: 18,
            border: `1px solid ${riskDriverTone.border}`,
            background: riskDriverTone.background,
          }}
        >
          <div
            style={{
              fontSize: 15,
              fontWeight: 600,
              letterSpacing: "0.04em",
              textTransform: "uppercase",
              color: "#111827",
              marginBottom: 16,
            }}
          >
            AI DECISION FACTORS
          </div>

          <div
            style={{
              fontSize: 14,
              fontWeight: 400,
              color: "#64748b",
              lineHeight: 1.6,
              marginBottom: 20,
            }}
          >
            The following deterministic and probabilistic signals contributed
            most to the enterprise risk score and recommended governance action.
          </div>

          <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
            {result.risk_drivers && result.risk_drivers.length > 0 ? (
              result.risk_drivers.map((driver) => {
                const formatted = formatRiskDriver(driver);

                return (
                  <div
                    key={driver}
                    style={{
                      padding: "8px 14px",
                      borderRadius: 999,
                      background: formatted.background,
                      color: formatted.color,
                      fontWeight: 700,
                    }}
                  >
                    ● {formatted.label}
                  </div>
                );
              })
            ) : (
              <div
                style={{
                  padding: "8px 14px",
                  borderRadius: 999,
                  background: "#dcfce7",
                  color: "#166534",
                  fontWeight: 700,
                }}
              >
                ✓ No significant risk signals were detected. The evaluated
                identifiers and supporting attributes are consistent across
                both records.
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
