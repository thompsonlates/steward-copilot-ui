import type {
  UniversalProfileRuleOpportunity,
  UniversalProfileRulesShadow,
} from "../api/types";

type Props = {
  enabled?: boolean;
  intelligence?: UniversalProfileRulesShadow | null;
  onReviewCandidateRule?: (
    opportunity: UniversalProfileRuleOpportunity,
  ) => void;
  reviewingCandidateField?: string | null;
};

function formatLabel(value?: string | null): string {
  if (!value) return "Unknown";

  return value
    .replaceAll("_", " ")
    .toLowerCase()
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function formatConfidence(
  value?: number | null,
): string | null {
  if (
    value === null ||
    value === undefined ||
    Number.isNaN(value)
  ) {
    return null;
  }

  const percent =
    value <= 1
      ? Math.round(value * 100)
      : Math.round(value);

  return `${percent}%`;
}
function formatEvidenceValue(
  value: unknown,
): string {
  if (value === null || value === undefined) {
    return "—";
  }

  if (typeof value === "string") {
    return value;
  }

  if (
    typeof value === "number" ||
    typeof value === "boolean"
  ) {
    return String(value);
  }

  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
}

export default function UniversalProfileIntelligence({
  enabled = false,
  intelligence,
  onReviewCandidateRule,
  reviewingCandidateField = null,
}: Props) {
  console.log("[UniversalProfileIntelligence DEBUG]", {
    enabled,
    hasIntelligence: Boolean(intelligence),
    intelligence,
  });

  if (!enabled || !intelligence) {
    return null;
  }

  const semanticEntries = Object.entries(
    intelligence.semantic_types ?? {},
  );

  const findings = intelligence.findings ?? [];
  const candidateOpportunities =  intelligence.candidate_opportunities ?? [];

  // Aggregate row-level findings so large profiles do not render hundreds
  // of duplicate evidence cards for the same governed rule + field.
  const findingGroups = Array.from(
    findings.reduce((groups, finding) => {
      const fieldName = finding.field_name ?? "__DATASET__";
      const semanticType = finding.semantic_type ?? null;
      const key = [
        finding.rule_id,
        fieldName,
        semanticType ?? "",
        finding.severity ?? "",
      ].join("::");

      const existing = groups.get(key);

      if (existing) {
        existing.count += 1;
        return groups;
      }

      groups.set(key, {
        key,
        ruleId: finding.rule_id,
        fieldName,
        semanticType,
        severity: finding.severity ?? null,
        findingMessage: finding.finding_message ?? null,
        count: 1,
      });

      return groups;
    }, new Map<string, {
      key: string;
      ruleId: string;
      fieldName: string;
      semanticType: string | null;
      severity: string | null;
      findingMessage: string | null;
      count: number;
    }>()).values(),
  ).sort((a, b) => b.count - a.count || a.ruleId.localeCompare(b.ruleId));

  const isShadow =
    intelligence.authoritative === false ||
    intelligence.mode?.toUpperCase() === "SHADOW";

  return (
    <div
      style={{
        marginTop: 18,
        border: "1px solid #dbeafe",
        borderRadius: 16,
        background: "#ffffff",
        overflow: "hidden",
      }}
    >
      {/* Header */}
      <div
        style={{
          padding: "18px 20px",
          borderBottom: "1px solid #e2e8f0",
          background:
            "linear-gradient(135deg, #eff6ff 0%, #f8fafc 100%)",
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-start",
            gap: 16,
            flexWrap: "wrap",
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
              Universal Profile Intelligence
            </div>

            <div
              style={{
                marginTop: 5,
                fontSize: 13,
                lineHeight: 1.5,
                color: "#64748b",
              }}
            >
              Semantic classification and deterministic
              evaluation against active governed standards.
            </div>
          </div>

          {isShadow && (
            <div
              style={{
                padding: "6px 10px",
                borderRadius: 999,
                border: "1px solid #f59e0b",
                background: "#fffbeb",
                color: "#92400e",
                fontSize: 11,
                fontWeight: 800,
              }}
            >
              SHADOW · NON-AUTHORITATIVE
            </div>
          )}
        </div>
      </div>

      <div
        style={{
          padding: 20,
          display: "grid",
          gap: 20,
        }}
      >
        {/* Semantic Intelligence */}
        <section>
          <div
            style={{
              marginBottom: 10,
              fontSize: 12,
              fontWeight: 800,
              color: "#475569",
              letterSpacing: "0.06em",
            }}
          >
            SEMANTIC INTELLIGENCE
          </div>

          {semanticEntries.length === 0 ? (
            <div
              style={{
                padding: 14,
                borderRadius: 10,
                background: "#f8fafc",
                color: "#64748b",
                fontSize: 13,
              }}
            >
              No governed semantic classifications were
              resolved for this profile.
            </div>
          ) : (
            <div
              style={{
                display: "grid",
                gap: 8,
              }}
            >
              {semanticEntries.map(
                ([fieldName, semantic]) => {
                  const confidence =
                    formatConfidence(
                      semantic.confidence,
                    );

                  return (
                    <div
                      key={fieldName}
                      style={{
                        display: "grid",
                        gridTemplateColumns:
                          "minmax(140px, 1fr) minmax(150px, 1fr) auto",
                        gap: 12,
                        alignItems: "center",
                        padding: "10px 12px",
                        border:
                          "1px solid #e2e8f0",
                        borderRadius: 10,
                        background: "#ffffff",
                      }}
                    >
                      <div
                        style={{
                          fontSize: 13,
                          fontWeight: 700,
                          color: "#334155",
                          overflowWrap:
                            "anywhere",
                        }}
                      >
                        {fieldName}
                      </div>

                      <div>
                        <span
                          style={{
                            display:
                              "inline-block",
                            padding:
                              "4px 8px",
                            borderRadius: 999,
                            background:
                              "#eef2ff",
                            color: "#3730a3",
                            fontSize: 11,
                            fontWeight: 800,
                          }}
                        >
                          {semantic.semantic_type}
                        </span>
                      </div>

                      <div
                        style={{
                          textAlign: "right",
                          fontSize: 12,
                          color:
                            semantic.requires_review
                              ? "#b45309"
                              : "#64748b",
                          fontWeight:
                            semantic.requires_review
                              ? 700
                              : 600,
                        }}
                      >
                        {semantic.requires_review
                          ? "Review"
                          : confidence ??
                            "Governed"}
                      </div>
                    </div>
                  );
                },
              )}
            </div>
          )}
        </section>

        {/* Governed Standards */}
        <section>
          <div
            style={{
              marginBottom: 10,
              fontSize: 12,
              fontWeight: 800,
              color: "#475569",
              letterSpacing: "0.06em",
            }}
          >
            GOVERNED STANDARDS
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns:
                "repeat(auto-fit, minmax(160px, 1fr))",
              gap: 10,
            }}
          >
            <MetricCard
              label="Rules Resolved"
              value={
                intelligence.resolved_rule_count
              }
            />

            <MetricCard
              label="Rules Executed"
              value={
                intelligence.executed_rule_count
              }
            />

            <MetricCard
              label="Governed Findings"
              value={
                intelligence.total_findings
              }
            />

            <MetricCard
              label="Records Evaluated"
              value={intelligence.total_records}
            />
          </div>
        </section>

        {/* Rule Evidence */}
        <section>
          <div
            style={{
              marginBottom: 10,
              fontSize: 12,
              fontWeight: 800,
              color: "#475569",
              letterSpacing: "0.06em",
            }}
          >
            UNIVERSAL RULE EVIDENCE
          </div>

          {findings.length === 0 ? (
            <div
              style={{
                padding: 14,
                border:
                  "1px solid #bbf7d0",
                borderRadius: 10,
                background: "#f0fdf4",
              }}
            >
              <div
                style={{
                  fontSize: 13,
                  fontWeight: 800,
                  color: "#166534",
                }}
              >
                No governed violations detected
              </div>

              <div
                style={{
                  marginTop: 4,
                  fontSize: 12,
                  lineHeight: 1.5,
                  color: "#15803d",
                }}
              >
                {
                  intelligence.executed_rule_count
                }{" "}
                active governed standard
                {intelligence.executed_rule_count ===
                1
                  ? ""
                  : "s"}{" "}
                evaluated without producing a
                Universal Profile finding.
              </div>
            </div>
          ) : (
            <div
              style={{
                display: "grid",
                gap: 10,
              }}
            >
              {findingGroups.map((group) => {
                const affectedPercent =
                  intelligence.total_records > 0
                    ? (
                        (group.count /
                          intelligence.total_records) *
                        100
                      ).toFixed(2)
                    : null;

                const semantic =
                  group.fieldName !== "__DATASET__"
                    ? intelligence.semantic_types?.[
                        group.fieldName
                      ]
                    : undefined;

                return (
                  <div
                    key={group.key}
                    style={{
                      padding: 14,
                      border: "1px solid #fed7aa",
                      borderRadius: 10,
                      background: "#fff7ed",
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        gap: 12,
                        flexWrap: "wrap",
                      }}
                    >
                      <div
                        style={{
                          fontSize: 13,
                          fontWeight: 800,
                          color: "#9a3412",
                        }}
                      >
                        {group.ruleId}
                      </div>

                      <div
                        style={{
                          display: "flex",
                          gap: 8,
                          alignItems: "center",
                          flexWrap: "wrap",
                        }}
                      >
                        <span
                          style={{
                            padding: "3px 7px",
                            borderRadius: 999,
                            background: "#ffedd5",
                            color: "#9a3412",
                            fontSize: 11,
                            fontWeight: 800,
                          }}
                        >
                          {group.count} affected
                        </span>

                        {group.severity && (
                          <span
                            style={{
                              fontSize: 11,
                              fontWeight: 800,
                              color: "#9a3412",
                            }}
                          >
                            {group.severity}
                          </span>
                        )}
                      </div>
                    </div>

                    <div
                      style={{
                        marginTop: 6,
                        fontSize: 12,
                        color: "#7c2d12",
                        lineHeight: 1.5,
                      }}
                    >
                      {group.fieldName !== "__DATASET__" && (
                        <>
                          Field: <strong>{group.fieldName}</strong>
                        </>
                      )}

                      {group.semanticType && (
                        <>
                          {group.fieldName !== "__DATASET__"
                            ? " · "
                            : ""}
                          Semantic Type:{" "}
                          <strong>
                            {formatLabel(group.semanticType)}
                          </strong>
                        </>
                      )}

                      {affectedPercent && (
                        <>
                          {group.fieldName !== "__DATASET__" ||
                          group.semanticType
                            ? " · "
                            : ""}
                          {affectedPercent}% of evaluated records
                        </>
                      )}
                    </div>

                    {group.findingMessage && (
                      <div
                        style={{
                          marginTop: 6,
                          fontSize: 12,
                          color: "#475569",
                        }}
                      >
                        {group.findingMessage}
                      </div>
                    )}

                    {semantic?.requires_review && (
                      <div
                        style={{
                          marginTop: 8,
                          display: "inline-block",
                          padding: "4px 8px",
                          borderRadius: 999,
                          background: "#fffbeb",
                          border: "1px solid #fcd34d",
                          color: "#92400e",
                          fontSize: 11,
                          fontWeight: 800,
                        }}
                      >
                        Semantic classification requires review
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </section>
        {/* Pattern Discovery */}
{candidateOpportunities.length > 0 && (
  <section>
    <div
      style={{
        marginBottom: 10,
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        gap: 12,
        flexWrap: "wrap",
      }}
    >
      <div
        style={{
          fontSize: 12,
          fontWeight: 800,
          color: "#475569",
          letterSpacing: "0.06em",
        }}
      >
        PATTERN DISCOVERY
      </div>

      <div
        style={{
          padding: "4px 8px",
          borderRadius: 999,
          background: "#fffbeb",
          border: "1px solid #fcd34d",
          color: "#92400e",
          fontSize: 10,
          fontWeight: 800,
        }}
      >
        STEWARD REVIEW REQUIRED
      </div>
    </div>

    <div
      style={{
        marginBottom: 12,
        fontSize: 12,
        lineHeight: 1.5,
        color: "#64748b",
      }}
    >
      Repeating deterministic patterns that may justify
      a profile-specific governed rule.
    </div>

    <div
      style={{
        display: "grid",
        gap: 14,
      }}
    >
      {candidateOpportunities.map(
        (opportunity, opportunityIndex) => {
          const confidence =
            formatConfidence(
              opportunity.confidence,
            );

          return (
            <div
              key={[
                opportunity.field_name,
                opportunity.pattern_summary,
                opportunity.suggested_action,
                opportunityIndex,
              ].join("::")}
              style={{
                padding: 16,
                border: "1px solid #c7d2fe",
                borderRadius: 12,
                background: "#f8faff",
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent:
                    "space-between",
                  gap: 12,
                  flexWrap: "wrap",
                }}
              >
                <div>
                  <div
                    style={{
                      fontSize: 14,
                      fontWeight: 800,
                      color: "#312e81",
                    }}
                  >
                    {formatLabel(
                      opportunity.pattern_summary,
                    )}
                  </div>

                  <div
                    style={{
                      marginTop: 4,
                      fontSize: 12,
                      color: "#475569",
                    }}
                  >
                    Field:{" "}
                    <strong>
                      {opportunity.field_name}
                    </strong>
                  </div>
                </div>

                <div
                  style={{
                    display: "flex",
                    gap: 8,
                    alignItems: "center",
                    flexWrap: "wrap",
                  }}
                >
                  <span
                    style={{
                      padding: "4px 8px",
                      borderRadius: 999,
                      background: "#eef2ff",
                      color: "#3730a3",
                      fontSize: 11,
                      fontWeight: 800,
                    }}
                  >
                    {
                      opportunity.affected_record_count
                    }{" "}
                    repeating-pattern records
                  </span>

                  {confidence && (
                    <span
                      style={{
                        fontSize: 11,
                        fontWeight: 800,
                        color: "#475569",
                      }}
                    >
                      {confidence} confidence
                    </span>
                  )}
                </div>
              </div>

              <div
                style={{
                  marginTop: 12,
                  overflowX: "auto",
                  border:
                    "1px solid #e2e8f0",
                  borderRadius: 10,
                  background: "#ffffff",
                }}
              >
                <div
                  style={{
                    minWidth: 620,
                  }}
                >
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns:
                        "minmax(220px, 1fr) minmax(220px, 1fr) 90px",
                      gap: 12,
                      padding: "9px 12px",
                      background: "#f8fafc",
                      borderBottom:
                        "1px solid #e2e8f0",
                      fontSize: 10,
                      fontWeight: 800,
                      color: "#64748b",
                      letterSpacing:
                        "0.04em",
                    }}
                  >
                    <div>
                      CURRENT BAD VALUE
                    </div>

                    <div>
                      PROPOSED FIX
                    </div>

                    <div
                      style={{
                        textAlign: "right",
                      }}
                    >
                      RECORDS
                    </div>
                  </div>

                  {opportunity.evidence_examples.map(
                    (evidence, evidenceIndex) => (
                      <div
                        key={evidenceIndex}
                        style={{
                          display: "grid",
                          gridTemplateColumns:
                            "minmax(220px, 1fr) minmax(220px, 1fr) 90px",
                          gap: 12,
                          padding: "10px 12px",
                          borderBottom:
                            evidenceIndex <
                            opportunity
                              .evidence_examples
                              .length -
                              1
                              ? "1px solid #f1f5f9"
                              : undefined,
                          alignItems: "center",
                        }}
                      >
                        <div
                          style={{
                            fontFamily:
                              "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace",
                            fontSize: 12,
                            color: "#9a3412",
                            overflowWrap:
                              "anywhere",
                              whiteSpace: "pre-wrap",
                          }}
                        >
                          {formatEvidenceValue(
                            evidence.current_value,
                          )}
                        </div>

                        <div
                          style={{
                            fontFamily:
                              "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace",
                            fontSize: 12,
                            color: "#166534",
                            overflowWrap:
                              "anywhere",
                              whiteSpace: "pre-wrap",
                          }}
                        >
                          {formatEvidenceValue(
                            evidence.proposed_value,
                          )}
                        </div>

                        <div
                          style={{
                            textAlign: "right",
                            fontSize: 12,
                            fontWeight: 800,
                            color: "#334155",
                          }}
                        >
                          {
                            evidence.affected_record_count
                          }
                        </div>
                      </div>
                    ),
                  )}
                </div>
              </div>

              <div
                style={{
                  marginTop: 10,
                  fontSize: 12,
                  lineHeight: 1.5,
                  color: "#475569",
                }}
              >
                {opportunity.explanation}
              </div>

              <div
                style={{
                  marginTop: 12,
                  display: "flex",
                  justifyContent: "flex-end",
                }}
              >
                <button
                  type="button"
                  onClick={() => onReviewCandidateRule?.(opportunity)}
                  disabled={
                    !onReviewCandidateRule ||
                    reviewingCandidateField === opportunity.field_name
                  }
                  title={
                    !onReviewCandidateRule
                      ? "Candidate review is not available for this source."
                      : "Create a governed candidate for steward review."
                  }
                  style={{
                    padding: "8px 12px",
                    borderRadius: 8,
                    border: "1px solid #cbd5e1",
                    background:
                      reviewingCandidateField === opportunity.field_name
                        ? "#f8fafc"
                        : "#ffffff",
                    color:
                      reviewingCandidateField === opportunity.field_name
                        ? "#64748b"
                        : "#0f172a",
                    fontSize: 12,
                    fontWeight: 800,
                    cursor:
                      !onReviewCandidateRule ||
                      reviewingCandidateField === opportunity.field_name
                        ? "not-allowed"
                        : "pointer",
                  }}
                >
                  {reviewingCandidateField === opportunity.field_name
                    ? "Creating Candidate..."
                    : "Review Candidate Rule"}
                </button>
              </div>
            </div>
          );
        },
      )}
    </div>
  </section>
)}

        {isShadow && (
          <div
            style={{
              padding: "11px 13px",
              borderRadius: 10,
              background: "#f8fafc",
              border: "1px solid #e2e8f0",
              fontSize: 11,
              lineHeight: 1.5,
              color: "#64748b",
            }}
          >
            Shadow evaluation is diagnostic only.
            Universal findings are not currently
            included in authoritative Data Quality
            scoring or policy compliance.
          </div>
        )}
      </div>
    </div>
  );
}

function MetricCard({
  label,
  value,
}: {
  label: string;
  value: number;
}) {
  return (
    <div
      style={{
        padding: 14,
        border: "1px solid #e2e8f0",
        borderRadius: 12,
        background: "#f8fafc",
      }}
    >
      <div
        style={{
          fontSize: 11,
          fontWeight: 700,
          color: "#64748b",
        }}
      >
        {label}
      </div>

      <div
        style={{
          marginTop: 5,
          fontSize: 24,
          fontWeight: 800,
          color: "#172033",
        }}
      >
        {value ?? 0}
      </div>
    </div>
  );
}