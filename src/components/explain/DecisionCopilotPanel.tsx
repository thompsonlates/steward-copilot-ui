import { InfoPill } from "./ExplainPrimitives";

function clampNumber(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function toneColor(value?: string) {
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

export function DecisionCopilotPanel(props: {
  aiDecision?: string;
  recommendedAction?: string;
  confidence?: number | null;
  riskFlag?: string;
  primaryReason?: string;
  copilotRecommendation?: string;
}) {
  return (
    <div
      style={{
        border: "1px solid #dbeafe",
        borderRadius: 20,
        background: "linear-gradient(180deg, #ffffff 0%, #f8fafc 100%)",
        padding: 18,
        boxShadow: "0 8px 22px rgba(0,0,0,0.05)",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 12,
          flexWrap: "wrap",
          marginBottom: 12,
        }}
      >
        <div style={{ fontSize: 18, fontWeight: 800, color: "#1e3a5f" }}>
          Enterprise Decision Center Copilot
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
          Recommended Next Step
        </div>
      </div>

      <div
        style={{
          display: "flex",
          gap: 10,
          flexWrap: "wrap",
          marginBottom: 14,
        }}
      >
        <InfoPill
          label="AI Decision"
          value={props.aiDecision}
          color={toneColor(props.aiDecision)}
        />
        <InfoPill
          label="Action"
          value={props.recommendedAction}
          color={toneColor(props.recommendedAction)}
        />
        <InfoPill
          label="Confidence"
          value={
            props.confidence !== null && props.confidence !== undefined
              ? `${clampNumber(Math.round(props.confidence), 0, 100)}%`
              : null
          }
        />
        <InfoPill
          label="Risk"
          value={props.riskFlag}
          color={toneColor(props.riskFlag)}
        />
      </div>

      {props.primaryReason ? (
        <div
          style={{
            marginBottom: 10,
            padding: "12px 14px",
            borderRadius: 14,
            background: "#ffffff",
            border: "1px solid #e5e7eb",
          }}
        >
          <div style={{ fontSize: 12, opacity: 0.65, marginBottom: 4 }}>
            Decision Drivers
          </div>
          <div style={{ fontSize: 14, fontWeight: 600, color: "#0f172a" }}>
            {props.primaryReason}
          </div>
        </div>
      ) : null}

      {props.copilotRecommendation ? (
        <div
          style={{
            padding: "12px 14px",
            borderRadius: 14,
            background: "#eff6ff",
            border: "1px solid #bfdbfe",
          }}
        >
          <div style={{ fontSize: 12, opacity: 0.7, marginBottom: 4 }}>
            Governance Recommendation
          </div>
          <div style={{ fontSize: 14, fontWeight: 600, color: "#1e3a5f" }}>
            {props.copilotRecommendation}
          </div>
        </div>
      ) : null}
    </div>
  );
}
