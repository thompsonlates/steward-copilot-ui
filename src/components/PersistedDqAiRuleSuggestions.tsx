import React, { useState } from "react";

import type {
  PersistedDqAiRuleSuggestion,
} from "../api/types";

import RecommendationFeedback
  from "./RecommendationFeedback";

type Props = {
  suggestions: PersistedDqAiRuleSuggestion[];
};

const cardStyle: React.CSSProperties = {
  border: "1px solid #e5e7eb",
  borderRadius: 14,
  padding: 16,
  background: "#ffffff",
};

function formatPercent(
  value?: number | null,
): string {
  if (value === null || value === undefined) {
    return "—";
  }

  const normalized =
    value <= 1 ? value * 100 : value;

  return `${normalized.toFixed(0)}%`;
}

export default function PersistedDqAiRuleSuggestions({
  suggestions,
}: Props) {
  const [expandedId, setExpandedId] =
    useState<string | null>(null);

  if (!suggestions.length) {
    return (
      <div style={cardStyle}>
        <div
          style={{
            fontSize: 17,
            fontWeight: 800,
            color: "#172033",
          }}
        >
          AI Rule Suggestions
        </div>

        <div
          style={{
            marginTop: 6,
            fontSize: 13,
            color: "#667085",
          }}
        >
          No AI-generated DQ rule suggestions are
          available for the selected period and domain.
        </div>
      </div>
    );
  }

  return (
    <section
      style={{
        display: "grid",
        gap: 14,
      }}
    >
      <div>
        <div
          style={{
            fontSize: 18,
            fontWeight: 800,
            color: "#172033",
          }}
        >
          AI Rule Suggestions
        </div>

        <div
          style={{
            marginTop: 4,
            fontSize: 13,
            color: "#667085",
          }}
        >
          AI-generated remediation and rule candidates
          from persisted Data Quality findings. Review
          before promoting any suggestion to an active
          governance rule.
        </div>
      </div>

      {suggestions.map((suggestion) => {
        const expanded =
          expandedId === suggestion.recommendation_id;

        return (
          <article
            key={suggestion.recommendation_id}
            style={cardStyle}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                gap: 16,
                alignItems: "flex-start",
                flexWrap: "wrap",
              }}
            >
              <div style={{ flex: "1 1 560px" }}>
                <div
                  style={{
                    fontSize: 16,
                    fontWeight: 800,
                    color: "#172033",
                  }}
                >
                  {suggestion.recommendation_title ||
                    suggestion.rule_id}
                </div>

                <div
                  style={{
                    marginTop: 5,
                    fontSize: 12,
                    color: "#667085",
                  }}
                >
                  {suggestion.domain}
                  {" • "}
                  {suggestion.rule_id}
                  {suggestion.dimension
                    ? ` • ${suggestion.dimension}`
                    : ""}
                  {suggestion.severity
                    ? ` • ${suggestion.severity}`
                    : ""}
                </div>
              </div>

              <div
                style={{
                  fontSize: 12,
                  fontWeight: 700,
                  color: "#475569",
                }}
              >
                {suggestion.affected_record_count ?? 0} affected
                {" • "}
                {formatPercent(
                  suggestion.affected_percent,
                )}
              </div>
            </div>

            {suggestion.recommendation_summary && (
              <div
                style={{
                  marginTop: 14,
                  fontSize: 13,
                  lineHeight: 1.6,
                  color: "#475569",
                }}
              >
                {suggestion.recommendation_summary}
              </div>
            )}

            <div
              style={{
                marginTop: 14,
                display: "grid",
                gridTemplateColumns:
                  "repeat(4, minmax(0, 1fr))",
                gap: 10,
              }}
            >
              <div>
                <div
                  style={{
                    fontSize: 11,
                    color: "#667085",
                  }}
                >
                  Rule Type
                </div>
                <strong>
                  {suggestion.suggested_rule_type ||
                    "REVIEW"}
                </strong>
              </div>

              <div>
                <div
                  style={{
                    fontSize: 11,
                    color: "#667085",
                  }}
                >
                  Threshold
                </div>
                <strong>
                  {suggestion.suggested_threshold ===
                  null ||
                  suggestion.suggested_threshold ===
                    undefined
                    ? "—"
                    : `${suggestion.suggested_threshold.toFixed(
                        1,
                      )}%`}
                </strong>
              </div>

              <div>
                <div
                  style={{
                    fontSize: 11,
                    color: "#667085",
                  }}
                >
                  Automation
                </div>
                <strong>
                  {suggestion.automation_recommendation ||
                    "REVIEW_REQUIRED"}
                </strong>
              </div>

              <div>
                <div
                  style={{
                    fontSize: 11,
                    color: "#667085",
                  }}
                >
                  Steward Approval
                </div>
                <strong>
                  {suggestion.steward_approval_required === true
                    ? "Required"
                    : suggestion.steward_approval_required === false
                      ? "Not Required"
                      : "—"}
                </strong>
              </div>
            </div>

            <div
              style={{
                marginTop: 14,
                display: "flex",
                gap: 10,
                flexWrap: "wrap",
                alignItems: "center",
              }}
            >
              <button
                type="button"
                onClick={() =>
                  setExpandedId(
                    expanded
                      ? null
                      : suggestion.recommendation_id,
                  )
                }
                style={{
                  padding: "9px 12px",
                  borderRadius: 9,
                  border: "1px solid #cbd3df",
                  background: "#ffffff",
                  color: "#172033",
                  cursor: "pointer",
                  fontWeight: 700,
                }}
              >
                {expanded
                  ? "Hide Implementation"
                  : "View Implementation"}
              </button>
              <div
                style={{
                  fontSize: 12,
                  color: "#667085",
                }}
              >
                AI confidence:{" "}
                <strong>
                  {formatPercent(
                    suggestion.automation_confidence ??
                      suggestion.confidence_score,
                  )}
                </strong>
              </div>
            </div>

            {expanded && (
              <div
                style={{
                  marginTop: 14,
                  display: "grid",
                  gap: 12,
                }}
              >
                {suggestion.suggested_action && (
                  <div>
                    <strong>Suggested action:</strong>{" "}
                    {suggestion.suggested_action}
                  </div>
                )}

                {suggestion.business_impact && (
                  <div>
                    <strong>Business impact:</strong>{" "}
                    {suggestion.business_impact}
                  </div>
                )}

                {suggestion.suggested_sql && (
                  <div>
                    <div
                      style={{
                        marginBottom: 6,
                        fontWeight: 700,
                      }}
                    >
                      Suggested SQL
                    </div>

                    <pre
                      style={{
                        margin: 0,
                        padding: 12,
                        borderRadius: 10,
                        background: "#0f172a",
                        color: "#e2e8f0",
                        overflowX: "auto",
                        whiteSpace: "pre-wrap",
                        wordBreak: "break-word",
                        fontSize: 12,
                      }}
                    >
                      {suggestion.suggested_sql}
                    </pre>
                  </div>
                )}

                {suggestion.suggested_regex && (
                  <div>
                    <div
                      style={{
                        marginBottom: 6,
                        fontWeight: 700,
                      }}
                    >
                      Suggested Regex
                    </div>

                    <code
                      style={{
                        display: "block",
                        padding: 10,
                        borderRadius: 8,
                        background: "#f8fafc",
                        border: "1px solid #e5e7eb",
                      }}
                    >
                      {suggestion.suggested_regex}
                    </code>
                  </div>
                )}

                {suggestion.reasoning_summary && (
                  <div
                    style={{
                      fontSize: 12,
                      color: "#64748b",
                      lineHeight: 1.55,
                    }}
                  >
                    {suggestion.reasoning_summary}
                  </div>
                )}
              </div>
            )}

              <RecommendationFeedback
                  recommendationId={
                    suggestion.recommendation_id
                  }
                  recommendationType="DQ"
                  profileRunId={
                    suggestion.profile_run_id
                  }
                  domain={suggestion.domain}
                  ruleId={suggestion.rule_id}
                  aiRecommendation={
                    suggestion.recommendation_title
                  }
                  aiConfidence={
                    suggestion.automation_confidence ??
                    suggestion.confidence_score
                  }
                  sourceComponent="PERSISTED_DQ_AI_RECOMMENDATION"
                />
          </article>
        );
      })}
    </section>
  );
}
