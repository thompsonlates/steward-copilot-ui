import type { CSSProperties } from "react";
import type { MatchFeedbackRequest } from "../../api/types";
import { Field } from "./ExplainPrimitives";

type DecisionValue = "APPROVE_MERGE" | "REVIEW" | "REJECT_MERGE";

const DEFAULT_STEWARD_DECISION: DecisionValue = "REVIEW";

const DECISION_OPTIONS: DecisionValue[] = [
  "APPROVE_MERGE",
  "REVIEW",
  "REJECT_MERGE",
];

const inputStyle: CSSProperties = {
  width: "100%",
  padding: "10px 10px",
  borderRadius: 10,
  border: "1px solid #ccc",
  outline: "none",
  boxSizing: "border-box",
};

function normalizeDecision(value?: string | null): DecisionValue {
  const v = (value ?? "").toUpperCase();

  if (v === "AUTO_MERGE") return "APPROVE_MERGE";
  if (v === "REVIEW_REQUIRED") return "REVIEW";
  if (v === "BLOCK_MERGE") return "REJECT_MERGE";

  if (v === "APPROVE_MERGE" || v === "REVIEW" || v === "REJECT_MERGE") {
    return v;
  }

  return DEFAULT_STEWARD_DECISION;
}

export function StewardFeedbackPanel(props: {
  stewardUser: string;
  setStewardUser: (v: string) => void;
  stewardDecision: string;
  setStewardDecision: (v: DecisionValue) => void;
  overrideReason: string;
  setOverrideReason: (v: string) => void;
  overrideReasonCode: NonNullable<MatchFeedbackRequest["override_reason_code"]>;
  setOverrideReasonCode: (
    v: NonNullable<MatchFeedbackRequest["override_reason_code"]>
  ) => void;
  overrideReasonNote: string;
  setOverrideReasonNote: (v: string) => void;
  overrideReasonOptions: string[];
  isOverride: boolean;
  feedbackLoading: boolean;
  onSubmitFeedback: () => void;
  feedbackMsg?: string | null;
  explanationId?: string;
}) {
  return (
    <div
      style={{
        border: "1px solid #e5e7eb",
        background: "#ffffff",
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
        Steward Feedback
      </div>

      {props.feedbackMsg ? (
        <div
          style={{
            background: "#ecfdf5",
            border: "1px solid #bbf7d0",
            color: "#166534",
            padding: 10,
            borderRadius: 10,
            marginBottom: 12,
            fontSize: 13,
            whiteSpace: "pre-wrap",
          }}
        >
          {props.feedbackMsg}
        </div>
      ) : null}

      <div style={{ display: "grid", gap: 12 }}>
        <Field label="steward_user">
          <input
            value={props.stewardUser}
            onChange={(e) => props.setStewardUser(e.target.value)}
            style={inputStyle}
          />
        </Field>

        <Field label="steward_decision">
          <select
            value={props.stewardDecision}
            onChange={(e) =>
              props.setStewardDecision(normalizeDecision(e.target.value))
            }
            style={inputStyle}
          >
            {DECISION_OPTIONS.map((opt) => (
              <option key={opt} value={opt}>
                {opt}
              </option>
            ))}
          </select>
        </Field>

        <Field label="steward_notes (optional)">
          <textarea
            value={props.overrideReasonNote}
            onChange={(e) => props.setOverrideReasonNote(e.target.value)}
            rows={3}
            style={{ ...inputStyle, resize: "vertical" }}
            placeholder="Optional steward note..."
          />
        </Field>

        {props.isOverride ? (
          <>
            <Field label="steward_override_reason (optional)">
              <textarea
                value={props.overrideReason}
                onChange={(e) => props.setOverrideReason(e.target.value)}
                rows={4}
                style={{ ...inputStyle, resize: "vertical" }}
              />
            </Field>

            <Field label="override_reason_code">
              <select
                value={props.overrideReasonCode}
                onChange={(e) =>
                  props.setOverrideReasonCode(
                    e.target.value as NonNullable<
                      MatchFeedbackRequest["override_reason_code"]
                    >
                  )
                }
                style={inputStyle}
              >
                {props.overrideReasonOptions.map((opt) => (
                  <option key={opt} value={opt}>
                    {opt}
                  </option>
                ))}
              </select>
            </Field>
          </>
        ) : null}

        <button
          type="button"
          onClick={props.onSubmitFeedback}
          disabled={props.feedbackLoading}
          style={{
            width: "100%",
            padding: "12px 14px",
            borderRadius: 12,
            border: "1px solid #1f2937",
            background: props.feedbackLoading ? "#e5e7eb" : "#111827",
            color: props.feedbackLoading ? "#6b7280" : "#ffffff",
            cursor: props.feedbackLoading ? "not-allowed" : "pointer",
            fontWeight: 700,
            marginTop: 4,
          }}
        >
          {props.feedbackLoading ? "Saving..." : "Submit Steward Feedback"}
        </button>

        {props.explanationId ? (
          <div style={{ fontSize: 12, opacity: 0.7 }}>
            Explanation ID: <code>{props.explanationId}</code>
          </div>
        ) : null}
      </div>
    </div>
  );
}
