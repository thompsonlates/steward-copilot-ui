import type {
  MatchExplainResponse,
} from "../../api/types";

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

export type ExplainDecisionValue =
  | "APPROVE_MERGE"
  | "REVIEW"
  | "REJECT_MERGE";

const DEFAULT_STEWARD_DECISION: ExplainDecisionValue = "REVIEW";

export function safeJsonError(err: unknown): string {
  if (err instanceof Error) return err.message;
  try {
    return JSON.stringify(err);
  } catch {
    return String(err);
  }
}

export function clampNumber(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

export function toPercent(value?: number | null): number {
  if (typeof value !== "number" || Number.isNaN(value)) return 0;
  return clampNumber(Math.round(value * 100), 0, 100);
}

export function getDecisionConfidence(
  result?: MatchExplainResponse | null
): number {
  if (!result) return 0;

  if (typeof result.decision_confidence_score === "number") {
    return clampNumber(
      Math.round(result.decision_confidence_score),
      0,
      100
    );
  }

  return toPercent(result.confidence);
}

export function toSafeNumber(value?: number | null, fallback = 0): number {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

export function coerceOptionalNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim() !== "") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

export function getOverrideRateEstimate(
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

export function normalizeDecision(value?: string | null): ExplainDecisionValue {
  const v = (value ?? "").toUpperCase();

  if (v === "AUTO_MERGE") return "APPROVE_MERGE";
  if (v === "REVIEW_REQUIRED") return "REVIEW";
  if (v === "BLOCK_MERGE") return "REJECT_MERGE";

  if (v === "APPROVE_MERGE" || v === "REVIEW" || v === "REJECT_MERGE") {
    return v;
  }

  return DEFAULT_STEWARD_DECISION;
}

export function displayDecision(value?: string | null): string {
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

export function formatAutomationLabel(value?: string | null): string | undefined {
  if (!value) return undefined;
  return value.split("_").join(" ");
}

export function formatPolicyStatus(value?: string | null): string | undefined {
  if (!value) return undefined;
  return value.split("_").join(" ");
}

export function getCopilotRecommendation(action?: string | null): string | undefined {
  const v = (action ?? "").toUpperCase();

  switch (v) {
    case "AUTO_MERGE":
      return "Eligible for auto-merge. Policy, confidence, and risk posture support safe automation.";
    case "APPROVE_MERGE":
      return "Strong merge candidate. Evidence is supportive and approval posture is favorable.";
    case "REVIEW_REQUIRED":
    case "REVIEW":
      return "Hold merge and request steward validation due to mixed evidence or policy sensitivity.";
    case "BLOCK_MERGE":
    case "REJECT_MERGE":
      return "Do not merge. Policy risk or conflicting evidence makes automation unsafe.";
    default:
      return undefined;
  }
}

export function getEstimatedFalsePositiveRisk(result: MatchExplainResponse): number {
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

export function safeText(value: unknown): string {
  if (value === null || value === undefined) return "";

  if (
    typeof value === "string" ||
    typeof value === "number" ||
    typeof value === "boolean"
  ) {
    return String(value);
  }

  if (Array.isArray(value)) {
    return value.map(safeText).filter(Boolean).join(", ");
  }

  if (typeof value === "object") {
    const obj = value as Record<string, unknown>;

    return (
      safeText(obj.patient_id) ||
      safeText(obj.provider_id) ||
      safeText(obj.supplier_id) ||
      safeText(obj.product_id) ||
      safeText(obj.member_id) ||
      safeText(obj.patient_first_name) ||
      safeText(obj.provider_first_name) ||
      safeText(obj.supplier_name) ||
      safeText(obj.product_name) ||
      safeText(obj.first_name) ||
      JSON.stringify(obj)
    );
  }

  return "";
}

export function getAutomationReadinessFallback(
  compositeRiskScore?: number | null,
  confidence?: number | null,
  recommendedAction?: string | null
) {
  const risk = clampNumber(toSafeNumber(compositeRiskScore, 0), 0, 100);
  const conf = clampNumber(toPercent(confidence), 0, 100);
  const action = (recommendedAction ?? "").toUpperCase();

  let readiness = Math.round(conf * 0.6 + (100 - risk) * 0.4);

  if (action.includes("REVIEW")) readiness = Math.max(25, readiness - 10);
  if (action.includes("REJECT") || action.includes("BLOCK")) {
    readiness = Math.max(10, readiness - 20);
  }
  if (action.includes("APPROVE") || action.includes("AUTO")) {
    readiness = Math.min(100, readiness + 8);
  }

  let label = "Moderate Automation Potential";
  let tone = "#8a4b00";
  let track = "#fff4e5";
  let fill = "#f59e0b";

  if (readiness >= 75) {
    label = "High Automation Potential";
    tone = "#176b2c";
    track = "#e8f7ec";
    fill = "#16a34a";
  } else if (readiness >= 45) {
    label = "Ready for Review";
    tone = "#8a4b00";
    track = "#fff4e5";
    fill = "#f59e0b";
  } else {
    label = "Low Automation Readiness";
    tone = "#8a1c1c";
    track = "#fdeeee";
    fill = "#dc2626";
  }

  return { readiness, label, tone, track, fill };
}

export function toneColor(value?: string) {
  const v = (value || "").toUpperCase();

  if (v.includes("APPROVE") || v.includes("AUTO") || v.includes("LOW")) {
    return "#16a34a";
  }
  if (v.includes("REVIEW") || v.includes("MEDIUM") || v.includes("ELEVATED")) {
    return "#f59e0b";
  }
  if (v.includes("REJECT") || v.includes("BLOCK") || v.includes("HIGH")) {
    return "#ef4444";
  }

  return "#334155";
}

export function normalizeSignals(
  result?: MatchExplainResponse | null
): EntityResolutionSignal[] {
  if (!result) return [];

  const raw = (result as any).entity_resolution_signals;

  if (!Array.isArray(raw)) return [];

  return raw.map((signal: any, idx: number) => ({
    signal_name: signal.signal_name ?? `SIGNAL_${idx + 1}`,
    signal_score:
      typeof signal.signal_score === "number"
        ? signal.signal_score
        : 0,
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

export function displayRecommendedAction(action?: string) {
  switch (action) {
    case "REVIEW_REQUIRED":
      return "Steward Review Required";

    case "AUTO_MERGE":
      return "Automatic Merge";

    case "BLOCK_MERGE":
      return "Merge Blocked";

    case "NO_MATCH":
      return "No Match";

    default:
      return action ?? "Unknown";
  }
}
