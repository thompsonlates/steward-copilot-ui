import React, { useState } from "react";

import {
  submitAiRecommendationFeedback,
} from "../api/client";


type StewardDecision =
  | "APPROVE"
  | "REJECT"
  | "MODIFY"
  | "DEFER";


type Props = {
  recommendationId: string;
  recommendationType: "DQ" | "GOVERNANCE";

  profileRunId?: string | null;
  domain?: string | null;
  ruleId?: string | null;

  aiRecommendation?: string | null;
  aiConfidence?: number | null;

  sourceComponent: string;

  onSubmitted?: () => void;
};


const decisionOptions: Array<{
  value: StewardDecision;
  label: string;
}> = [
  {
    value: "APPROVE",
    label: "Approve",
  },
  {
    value: "REJECT",
    label: "Reject",
  },
  {
    value: "MODIFY",
    label: "Modify",
  },
  {
    value: "DEFER",
    label: "Defer",
  },
];


const inputStyle: React.CSSProperties = {
  width: "100%",
  boxSizing: "border-box",
  border: "1px solid #d8dde6",
  borderRadius: 10,
  padding: "10px 12px",
  fontSize: 13,
  color: "#172033",
  background: "#ffffff",
};


export default function RecommendationFeedback({
  recommendationId,
  recommendationType,
  profileRunId,
  domain,
  ruleId,
  aiRecommendation,
  aiConfidence,
  sourceComponent,
  onSubmitted,
}: Props) {
  const [
    stewardDecision,
    setStewardDecision,
  ] = useState<StewardDecision | "">("");

  const [
    stewardComment,
    setStewardComment,
  ] = useState("");

  const [
    overrideReason,
    setOverrideReason,
  ] = useState("");

  const [
    submitting,
    setSubmitting,
  ] = useState(false);

  const [
    submitted,
    setSubmitted,
  ] = useState(false);

  const [
    error,
    setError,
  ] = useState<string | null>(null);

  const [
    successMessage,
    setSuccessMessage,
  ] = useState<string | null>(null);


  const requiresOverrideReason =
    stewardDecision === "REJECT" ||
    stewardDecision === "MODIFY";


  async function handleSubmit(): Promise<void> {
    if (!stewardDecision) {
      setError(
        "Select a steward decision first.",
      );
      return;
    }

    if (
      requiresOverrideReason &&
      !overrideReason.trim()
    ) {
      setError(
        "Provide an override reason for Reject or Modify.",
      );
      return;
    }

    setSubmitting(true);
    setError(null);
    setSuccessMessage(null);

    try {
      const response =
        await submitAiRecommendationFeedback({
          recommendation_id:
            recommendationId,

          recommendation_type:
            recommendationType,

          profile_run_id:
            profileRunId ?? null,

          domain:
            domain ?? null,

          rule_id:
            ruleId ?? null,

          ai_recommendation:
            aiRecommendation ?? null,

          ai_confidence:
            aiConfidence ?? null,

          steward_decision:
            stewardDecision,

          steward_comment:
            stewardComment.trim() || null,

          override_reason:
            overrideReason.trim() || null,

          source_component:
            sourceComponent,
        });

      setSubmitted(true);

      setSuccessMessage(
        `Feedback submitted successfully. Status: ${
          response.recommendation_status
        }.`,
      );

      onSubmitted?.();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to submit recommendation feedback.",
      );
    } finally {
      setSubmitting(false);
    }
  }


  return (
    <div
      style={{
        marginTop: 16,
        padding: 16,
        borderRadius: 12,
        border: "1px solid #dbeafe",
        background: "#f8fbff",
      }}
    >
      <div
        style={{
          fontSize: 14,
          fontWeight: 800,
          color: "#1e3a5f",
        }}
      >
        Steward Decision
      </div>

      <div
        style={{
          marginTop: 4,
          fontSize: 12,
          color: "#667085",
          lineHeight: 1.5,
        }}
      >
        Review the AI recommendation and record
        the governance decision.
      </div>

      <div
        style={{
          marginTop: 6,
          marginBottom: 14,
          fontSize: 11,
          color: "#64748b",
        }}
      >
        Recommendation ID:{" "}
        <span
          style={{
            fontFamily: "monospace",
            fontWeight: 700,
            color: "#475569",
          }}
        >
          {recommendationId}
  </span>
</div>

      <div
        style={{
          marginTop: 14,
          display: "flex",
          gap: 8,
          flexWrap: "wrap",
        }}
      >
        {decisionOptions.map((option) => {
          const selected =
            stewardDecision === option.value;

          return (
            <button
              key={option.value}
              type="button"
              disabled={submitted}
              onClick={() => {
                setStewardDecision(
                  option.value,
                );

                setError(null);

                if (
                  option.value !== "REJECT" &&
                  option.value !== "MODIFY"
                ) {
                  setOverrideReason("");
                }
              }}
              style={{
                padding: "8px 13px",
                borderRadius: 999,
                border: selected
                  ? "1px solid #1d4ed8"
                  : "1px solid #cbd5e1",
                background: selected
                  ? "#eff6ff"
                  : "#ffffff",
                color: selected
                  ? "#1d4ed8"
                  : "#334155",
                fontSize: 12,
                fontWeight: 700,
                cursor: submitted
                  ? "not-allowed"
                  : "pointer",
                opacity: submitted
                  ? 0.65
                  : 1,
              }}
            >
              {option.label}
            </button>
          );
        })}
      </div>

      {requiresOverrideReason && (
        <div
          style={{
            marginTop: 14,
          }}
        >
          <div
            style={{
              marginBottom: 6,
              fontSize: 12,
              fontWeight: 700,
              color: "#344054",
            }}
          >
            Override Reason
          </div>

          <select
            value={overrideReason}
            disabled={submitted}
            onChange={(event) => {
              setOverrideReason(
                event.target.value,
              );
              setError(null);
            }}
            style={inputStyle}
          >
            <option value="">
              Select a reason...
            </option>

            <option value="BUSINESS_CONTEXT">
              Business Context
            </option>

            <option value="AUTHORITATIVE_SOURCE">
              Authoritative Source Conflict
            </option>

            <option value="RULE_TOO_AGGRESSIVE">
              Rule Too Aggressive
            </option>

            <option value="RULE_TOO_PERMISSIVE">
              Rule Too Permissive
            </option>

            <option value="DATA_EXCEPTION">
              Valid Data Exception
            </option>

            <option value="IMPLEMENTATION_RISK">
              Implementation Risk
            </option>

            <option value="OTHER">
              Other
            </option>
          </select>
        </div>
      )}

      <div
        style={{
          marginTop: 14,
        }}
      >
        <div
          style={{
            marginBottom: 6,
            fontSize: 12,
            fontWeight: 700,
            color: "#344054",
          }}
        >
          Steward Comment
        </div>

        <textarea
          value={stewardComment}
          disabled={submitted}
          onChange={(event) => {
            setStewardComment(
              event.target.value,
            );
          }}
          placeholder={
            "Add optional context, requested changes, or implementation notes..."
          }
          rows={3}
          style={{
            ...inputStyle,
            resize: "vertical",
            fontFamily: "inherit",
          }}
        />
      </div>

      {error && (
        <div
          style={{
            marginTop: 12,
            padding: 10,
            borderRadius: 8,
            background: "#fff1f2",
            border: "1px solid #fecdd3",
            color: "#be123c",
            fontSize: 12,
          }}
        >
          {error}
        </div>
      )}

      {successMessage && (
        <div
          style={{
            marginTop: 12,
            padding: 10,
            borderRadius: 8,
            background: "#f0fdf4",
            border: "1px solid #bbf7d0",
            color: "#166534",
            fontSize: 12,
          }}
        >
          {successMessage}
        </div>
      )}

      <div
        style={{
          marginTop: 14,
          display: "flex",
          justifyContent: "flex-end",
        }}
      >
        <button
          type="button"
          disabled={
            submitting ||
            submitted ||
            !stewardDecision
          }
          onClick={() => {
            void handleSubmit();
          }}
          style={{
            padding: "10px 16px",
            borderRadius: 10,
            border: "none",
            background: "#0f172a",
            color: "#ffffff",
            fontSize: 13,
            fontWeight: 800,
            cursor:
              submitting ||
              submitted ||
              !stewardDecision
                ? "not-allowed"
                : "pointer",
            opacity:
              submitting ||
              submitted ||
              !stewardDecision
                ? 0.55
                : 1,
          }}
        >
          {submitted
            ? "Feedback Submitted"
            : submitting
              ? "Submitting..."
              : "Submit Feedback"}
        </button>
      </div>
    </div>
  );
}