import type { MatchExplainResponse } from "../../api/types";

function clampNumber(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function displayRecommendedAction(action?: string) {
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

export function AILearningPanel(props: {
  result: MatchExplainResponse;
  recommendedAction?: string;
  aiDecision?: string;
  confidence?: number | null;
  riskFlag?: string;
  matchScore?: number | null;
  triggeredRules?: string[];
  overrideRate?: number | null;
}) {
  const confidencePct =
    props.confidence !== null && props.confidence !== undefined
      ? clampNumber(Math.round(props.confidence), 0, 100)
      : null;

  const overridePct =
    props.overrideRate !== null && props.overrideRate !== undefined
      ? clampNumber(Math.round(props.overrideRate * 100), 0, 100)
      : null;

  const topRule = props.triggeredRules?.[0] ?? "Policy path";
  const action = (props.recommendedAction ?? "").toUpperCase();
  const risk = (props.riskFlag ?? "").toUpperCase();

  let learningSignal = "Stable steward behavior observed.";
  let operationalGuidance =
    "Current policy behavior appears consistent with steward expectations.";
  let trendTone = "#0f172a";
  let badgeBg = "#eef4ff";
  let badgeBorder = "#bfd3ff";

  if (action.includes("REVIEW")) {
    learningSignal = "Similar cases frequently require human review.";
    operationalGuidance =
      "This decision pattern suggests mixed attribute evidence. Keep steward validation in the loop.";
    trendTone = "#8a4b00";
    badgeBg = "#fff4e5";
    badgeBorder = "#ffd199";
  }

  if (risk.includes("HIGH")) {
    learningSignal = "This policy path shows elevated steward attention.";
    operationalGuidance =
      "High-risk policy outcomes should remain review-driven until override behavior stabilizes.";
    trendTone = "#8a1c1c";
    badgeBg = "#fdeeee";
    badgeBorder = "#efb5b5";
  }

  if (
    action.includes("APPROVE") &&
    confidencePct !== null &&
    confidencePct >= 90
  ) {
    learningSignal =
      "Strong alignment between AI recommendation and likely steward acceptance.";
    operationalGuidance =
      "This pattern may be a candidate for higher automation over time if override rates remain low.";
    trendTone = "#176b2c";
    badgeBg = "#dff5df";
    badgeBorder = "#b7f5b7";
  }

  const policySensitivity =
    props.matchScore !== null &&
    props.matchScore !== undefined &&
    props.matchScore >= 0.9 &&
    risk.includes("HIGH")
      ? "High score, but policy risk is suppressing automation."
      : "Policy and match evidence are generally aligned.";

  return (
    <div
      style={{
        border: "1px solid #e2e8f0",
        borderRadius: 18,
        background: "#fcfdff",
        padding: 18,
        boxShadow: "0 6px 18px rgba(15, 23, 42, 0.04)",
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          gap: 12,
          flexWrap: "wrap",
          marginBottom: 14,
        }}
      >
        <div style={{ fontSize: 18, fontWeight: 800, color: "#1e3a5f" }}>
          AI Governance Insights
        </div>

        {props.result.workflow_ticket_created && (
          <div
            style={{
              border: "1px solid #c7d7fe",
              borderRadius: 16,
              padding: 20,
              background: "#f8fbff",
              marginBottom: 24,
            }}
          >
            <div
              style={{
                fontSize: 14,
                fontWeight: 700,
                color: "#1d4ed8",
                marginBottom: 12,
                letterSpacing: 0.5,
              }}
            >
              GOVERNANCE WORKFLOW INITIATED
            </div>

            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 12,
                flexWrap: "wrap",
              }}
            >
              <div
                style={{
                  padding: "8px 14px",
                  borderRadius: 999,
                  background: "#e0ecff",
                  color: "#1e40af",
                  fontWeight: 700,
                }}
              >
                Jira Ticket: {props.result.workflow_ticket_key}
              </div>

              <a
                href={props.result.workflow_ticket_url ?? "#"}
                target="_blank"
                rel="noreferrer"
                style={{
                  color: "#2563eb",
                  fontWeight: 700,
                  textDecoration: "none",
                }}
              >
                Open Governance Workflow →
              </a>
            </div>

            <div
              style={{
                marginTop: 14,
                color: "#475569",
                lineHeight: 1.5,
              }}
            >
              Automation Readiness:{" "}
              <b>{props.result.automation_readiness_score}%</b>. Governance
              workflow created because the recommended action is{" "}
              <b>
                {displayRecommendedAction(
                  props.result.final_recommended_action ??
                    props.result.recommended_action
                )}
              </b>
              {props.result.primary_risk_driver ? (
                <>
                  {" "}
                  and the primary governance driver is{" "}
                  <b>{props.result.primary_risk_driver}</b>.
                </>
              ) : (
                <> based on enterprise governance policy.</>
              )}
            </div>
          </div>
        )}

        <div
          style={{
            fontSize: 12,
            fontWeight: 700,
            letterSpacing: 0.5,
            textTransform: "uppercase",
            color: "#64748b",
          }}
        >
          Steward Feedback Signal
        </div>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
          gap: 12,
        }}
      >
        <div
          style={{
            border: "1px solid #e5e7eb",
            borderRadius: 14,
            padding: 14,
            background: "#fff",
          }}
        >
          <div
            style={{
              fontSize: 12,
              opacity: 0.75,
              marginBottom: 6,
              display: "flex",
              alignItems: "center",
              gap: 6,
            }}
          >
            <span style={{ fontSize: 14 }}>📊</span>
            Override Tendency
          </div>
          <div style={{ fontSize: 14, fontWeight: 700, color: trendTone }}>
            {overridePct !== null
              ? `${overridePct}% of similar decisions overridden`
              : "Override trend building from steward feedback"}
          </div>
          <div style={{ marginTop: 8, fontSize: 13, opacity: 0.85 }}>
            Steward behavior helps tune where automation should stop and review
            should begin.
          </div>
        </div>

        <div
          style={{
            border: `1px solid ${badgeBorder}`,
            borderRadius: 14,
            padding: 14,
            background: badgeBg,
          }}
        >
          <div
            style={{
              fontSize: 12,
              opacity: 0.75,
              marginBottom: 6,
              display: "flex",
              alignItems: "center",
              gap: 6,
            }}
          >
            <span style={{ fontSize: 14 }}>⚠️</span>
            Policy Sensitivity
          </div>
          <div style={{ fontSize: 14, fontWeight: 700, color: trendTone }}>
            {topRule}
          </div>
          <div style={{ marginTop: 8, fontSize: 13, opacity: 0.9 }}>
            {policySensitivity}
          </div>
        </div>

        <div
          style={{
            border: "1px solid #e5e7eb",
            borderRadius: 14,
            padding: 14,
            background: "#fff",
          }}
        >
          <div
            style={{
              fontSize: 12,
              opacity: 0.75,
              marginBottom: 6,
              display: "flex",
              alignItems: "center",
              gap: 6,
            }}
          >
            <span style={{ fontSize: 14 }}>🧠</span>
            Learning Signal
          </div>
          <div style={{ fontSize: 14, fontWeight: 700, color: "#0f172a" }}>
            {learningSignal}
          </div>
          <div style={{ marginTop: 8, fontSize: 13, opacity: 0.85 }}>
            {operationalGuidance}
          </div>
        </div>
      </div>
    </div>
  );
}
