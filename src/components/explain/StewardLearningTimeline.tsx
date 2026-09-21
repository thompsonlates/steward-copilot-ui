import { useState } from "react";
import { InfoPill } from "./ExplainPrimitives";

type LearningTimelineItem = {
  explanation_id: string;
  ai_decision: string;
  recommended_action: string;
  steward_decision: string;
  steward_override_flag: string;
  override_reason: string;
  steward_user: string;
  feedback_at: string;
};

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

export function StewardLearningTimeline(props: {
  items?: LearningTimelineItem[];
}) {
  const [showAll, setShowAll] = useState(false);

  const items = Array.isArray(props.items) ? props.items : [];
  const visibleItems = showAll ? items : items.slice(0, 1);

  if (!items.length) {
    return (
      <div
        style={{
          border: "1px solid #e5e7eb",
          background: "#ffffff",
          borderRadius: 18,
          padding: 16,
        }}
      >
        <div
          style={{
            fontSize: 18,
            fontWeight: 800,
            color: "#1e3a5f",
            marginBottom: 8,
          }}
        >
          Steward Learning Timeline
        </div>
        <div style={{ fontSize: 13, opacity: 0.75 }}>
          No steward learning history yet.
        </div>
      </div>
    );
  }

  return (
    <div
      style={{
        border: "1px solid #dbeafe",
        background: "#fcfdff",
        borderRadius: 18,
        padding: 16,
        boxShadow: "0 6px 18px rgba(15, 23, 42, 0.04)",
      }}
    >
      <div
        style={{
          fontSize: 18,
          fontWeight: 800,
          color: "#1e3a5f",
          marginBottom: 12,
        }}
      >
        Steward Learning Timeline
      </div>

      <div style={{ display: "grid", gap: 12 }}>
        {visibleItems.map((item, idx) => {
          const override =
            (item.steward_override_flag ?? "").toUpperCase() === "Y";

          return (
            <div
              key={`${item.explanation_id}-${idx}`}
              style={{
                border: "1px solid #e5e7eb",
                borderRadius: 14,
                padding: 14,
                background: "#ffffff",
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  gap: 10,
                  flexWrap: "wrap",
                  marginBottom: 8,
                }}
              >
                <div style={{ fontSize: 13, fontWeight: 800, color: "#1e3a5f" }}>
                  {item.feedback_at
                    ? new Date(item.feedback_at).toLocaleString("en-US", {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                        hour: "numeric",
                        minute: "2-digit",
                      })
                    : "Unknown time"}
                </div>

                <div
                  style={{
                    fontSize: 12,
                    fontWeight: 700,
                    color: override ? "#92400e" : "#166534",
                    background: override ? "#fffbeb" : "#ecfdf5",
                    border: `1px solid ${override ? "#fde68a" : "#bbf7d0"}`,
                    borderRadius: 999,
                    padding: "4px 8px",
                  }}
                >
                  {override ? "Override" : "Accepted"}
                </div>
              </div>

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
                  gap: 10,
                }}
              >
                <InfoPill
                  label="AI Decision"
                  value={item.ai_decision}
                  color={toneColor(item.ai_decision)}
                />
                <InfoPill
                  label="AI Action"
                  value={item.recommended_action}
                  color={toneColor(item.recommended_action)}
                />
                <InfoPill
                  label="Steward Decision"
                  value={item.steward_decision}
                  color={toneColor(item.steward_decision)}
                />
                <InfoPill label="Steward User" value={item.steward_user} />
              </div>

              <div style={{ marginTop: 10, fontSize: 13, color: "#334155" }}>
                <b>Override Reason:</b>{" "}
                {item.override_reason || "No override reason provided"}
              </div>
            </div>
          );
        })}

        {items.length > 1 && (
          <button
            type="button"
            onClick={() => setShowAll((prev) => !prev)}
            style={{
              marginTop: 8,
              padding: "10px 14px",
              borderRadius: 999,
              border: "1px solid #cbd5e1",
              background: "#ffffff",
              color: "#1e3a5f",
              fontWeight: 800,
              cursor: "pointer",
              width: "fit-content",
            }}
          >
            {showAll ? "Show less" : `Show ${items.length - 1} more`}
          </button>
        )}
      </div>
    </div>
  );
}
