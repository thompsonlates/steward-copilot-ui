// src/components/intelligence/GovernanceIntelligence.tsx

import React, { useMemo, useState } from "react";

import type {
  GovernanceDatasetStatus,
  GovernanceDqPolicyComplianceResponse,
  GovernanceOverviewResponse,
  GovernanceRecommendation,
} from "../api/types";

import RecommendationFeedback from "./RecommendationFeedback";
import { getGovernancePolicyCompliance } from "../api/client";

function num(v: number | null | undefined): string {
  if (v === null || v === undefined || Number.isNaN(v)) return "—";
  const isInt = Math.abs(v - Math.round(v)) < 1e-9;
  return isInt ? String(Math.round(v)) : v.toFixed(2);
}

function dec(v: number | null | undefined, digits = 2): string {
  if (v === null || v === undefined || Number.isNaN(v)) return "—";
  return v.toFixed(digits);
}

function formatDateTime(value?: string | null): string {
  if (!value) return "—";
  try {
    return new Date(value).toLocaleString();
  } catch {
    return value;
  }
}

function readinessPillStyle(
  ready?: boolean | null,
): React.CSSProperties {
  return {
    display: "inline-block",
    padding: "5px 10px",
    borderRadius: 999,
    fontSize: 12,
    fontWeight: 700,
    background: ready ? "#dcfce7" : "#fee2e2",
    color: ready ? "#166534" : "#991b1b",
    border: ready
      ? "1px solid #bbf7d0"
      : "1px solid #fecaca",
  };
}

function statusPillStyle(
  value?: string | null,
): React.CSSProperties {
  const v = (value || "").toUpperCase();

  let background = "#f3f4f6";
  let color = "#374151";
  let border = "#e5e7eb";

  if (v.includes("CERTIFIED") || v.includes("PASS")) {
    background = "#dcfce7";
    color = "#166534";
    border = "#bbf7d0";
  } else if (
    v.includes("PENDING") ||
    v.includes("IN_PROGRESS") ||
    v.includes("REVIEW")
  ) {
    background = "#fef3c7";
    color = "#92400e";
    border = "#fde68a";
  } else if (
    v.includes("FAIL") ||
    v.includes("BLOCK")
  ) {
    background = "#fee2e2";
    color = "#991b1b";
    border = "#fecaca";
  }

  return {
    display: "inline-block",
    padding: "5px 10px",
    borderRadius: 999,
    fontSize: 12,
    fontWeight: 700,
    background,
    color,
    border: `1px solid ${border}`,
  };
}

function cardStyle(accent?: string): React.CSSProperties {
  return {
    border: "1px solid #e5e7eb",
    borderRadius: 18,
    padding: 16,
    background:
      "linear-gradient(180deg, #ffffff 0%, #fafafa 100%)",
    boxShadow: "0 10px 28px rgba(0,0,0,0.06)",
    borderTop: accent
      ? `4px solid ${accent}`
      : "1px solid #e5e7eb",
    transition: "all 0.15s ease",
  };
}

function InsightRow({
  title,
  value,
}: {
  title: string;
  value: string | number;
}) {
  return (
    <div
      style={{
        minWidth: 0,
        padding: 12,
        borderRadius: 12,
        background: "#f8fafc",
        border: "1px solid #e5e7eb",
      }}
    >
      <div
        style={{
          fontSize: 12,
          color: "#64748b",
          marginBottom: 6,
          lineHeight: 1.3,
        }}
      >
        {title}
      </div>

      <div
        title={String(value)}
        style={{
          fontSize: 14,
          fontWeight: 700,
          color: "#1f2937",
          whiteSpace: "nowrap",
          overflow: "hidden",
          textOverflow: "ellipsis",
          minWidth: 0,
        }}
      >
        {value}
      </div>
    </div>
  );
}


function TrendBadge({
  value,
}: {
  value?: number | null;
}) {
  if (value === null || value === undefined) return null;

  let arrow = "→";
  let color = "#6b7280";

  if (value > 0) {
    arrow = "↑";
    color = "#16a34a";
  } else if (value < 0) {
    arrow = "↓";
    color = "#dc2626";
  }

  return (
    <span
      style={{
        fontSize: 14,
        fontWeight: 600,
        color,
        marginLeft: 8,
      }}
    >
      {arrow}
    </span>
  );
}

function Sparkline({
  data,
}: {
  data?: number[];
}) {
  if (!data || data.length <= 1) return null;

  const max = Math.max(...data);
  const min = Math.min(...data);
  const range = max - min || 1;

  const points = data
    .map((v, i) => {
      const x = (i / (data.length - 1)) * 100;
      const y = 100 - ((v - min) / range) * 100;
      return `${x},${y}`;
    })
    .join(" ");

  return (
    <svg
      viewBox="0 0 100 100"
      preserveAspectRatio="none"
      style={{
        width: "100%",
        height: 30,
        marginTop: 8,
        opacity: 0.7,
      }}
    >
      <polyline
        fill="none"
        stroke="#3b82f6"
        strokeWidth="3"
        points={points}
      />
    </svg>
  );
}

function HeroKpiCard(props: {
    title: string;
    value: string;
    subtitle?: string;
    children?: React.ReactNode;
    valueColor?: string;
    badgeLabel?: string;
    badgeColor?: string;
    trendValue?: number | null;
    trendLabel?: string;
}) {
    return (<div style={{
            ...cardStyle("#111"),
            background: "linear-gradient(180deg, #ffffff 0%, #fafafa 100%)",
            boxShadow: "0 6px 18px rgba(0,0,0,0.06)",
            minHeight: 108,
        }}>
      <div style={{
            fontSize: 12,
            opacity: 0.72,
            textTransform: "uppercase",
            letterSpacing: 0.5,
        }}>
        {props.title}
      </div>

      <div style={{
            marginTop: 8,
            display: "flex",
            alignItems: "center",
            gap: 12,
            flexWrap: "wrap",
        }}>
        <div style={{
            fontSize: 34,
            fontWeight: 800,
            lineHeight: 1.1,
            color: props.valueColor ?? "#243b53",
        }}>
          {props.value}
        </div>

        {props.badgeLabel && (<div style={{
                padding: "6px 10px",
                borderRadius: 999,
                fontSize: 11,
                fontWeight: 700,
                border: "1px solid #e5e7eb",
                background: "#f8fafc",
                color: props.badgeColor ?? "#1f2937",
                letterSpacing: 0.4,
            }}>
            {props.badgeLabel}
          </div>)}

        {props.trendValue !== null && props.trendValue !== undefined && (<div style={{
                fontSize: 12,
                fontWeight: 700,
                display: "flex",
                alignItems: "center",
                gap: 4,
                color: props.trendValue >= 0 ? "#16a34a" : "#dc2626",
            }}>
            <span>{props.trendValue >= 0 ? "↑" : "↓"}</span>
            <span>
              {props.trendValue >= 0 ? "+" : ""}
              {props.trendValue}
            </span>
            {props.trendLabel && (<span style={{ color: "#6b7280", fontWeight: 500 }}>{props.trendLabel}</span>)}
          </div>)}
      </div>

      {props.subtitle && <div style={{ marginTop: 8, fontSize: 13, opacity: 0.75 }}>{props.subtitle}</div>}

      {props.children}
    </div>);
}
function KpiCard(props: {
    title: string;
    value: string;
    subtitle?: string;
    accent?: string;
    trend?: number | null;
    deltaValue?: string;
    deltaLabel?: string;
    sparkline?: number[];
}) {
    return (<div style={cardStyle(props.accent)}>
      <div style={{ fontSize: 12, opacity: 0.72 }}>{props.title}</div>

      <div style={{
            marginTop: 6,
            fontSize: 24,
            fontWeight: 700,
            display: "flex",
            alignItems: "center",
            gap: 6,
        }}>
        {props.value}
        <TrendBadge value={props.trend}/>
      </div>

      {props.deltaValue && (<div style={{
                fontSize: 12,
                marginTop: 4,
                opacity: 0.75,
            }}>
          {props.deltaValue} {props.deltaLabel}
        </div>)}

      {props.sparkline && <Sparkline data={props.sparkline}/>}

      {props.subtitle && <div style={{ marginTop: 6, fontSize: 14, opacity: 0.72 }}>{props.subtitle}</div>}
    </div>);
}
function getGovernancePriorityMeta(priority?: string | null) {
    const normalized = (priority || "MEDIUM").trim().toUpperCase();
    if (normalized === "CRITICAL") {
        return {
            label: "CRITICAL",
            color: "#991b1b",
            background: "#fee2e2",
            border: "#fecaca",
            accent: "#dc2626",
        };
    }
    if (normalized === "HIGH") {
        return {
            label: "HIGH",
            color: "#9a3412",
            background: "#ffedd5",
            border: "#fed7aa",
            accent: "#f97316",
        };
    }
    if (normalized === "LOW") {
        return {
            label: "LOW",
            color: "#166534",
            background: "#dcfce7",
            border: "#bbf7d0",
            accent: "#22c55e",
        };
    }
    return {
        label: normalized || "MEDIUM",
        color: "#92400e",
        background: "#fef3c7",
        border: "#fde68a",
        accent: "#f59e0b",
    };
}
function normalizeGovernanceConfidence(value?: number | null): number | null {
    if (value === null || value === undefined || Number.isNaN(value))
        return null;
    const percentage = value <= 1 ? value * 100 : value;
    return Math.max(0, Math.min(100, Math.round(percentage)));
}
function AiConfidenceMeter({ confidence }: {
    confidence: number;
}) {
    const active = Math.round((confidence / 100) * 16);
    return (<div style={{
            marginTop: 18,
            display: "flex",
            justifyContent: "flex-end",
        }}>
      <div style={{ width: 300 }}>
        <div style={{
            fontSize: 11,
            fontWeight: 800,
            color: "#64748b",
            marginBottom: 10,
            textTransform: "uppercase",
            letterSpacing: 0.6,
        }}>
          AI Confidence
        </div>

        <div style={{
            display: "grid",
            gridTemplateColumns: "repeat(16, 1fr)",
            gap: 3,
            marginBottom: 10,
        }}>
          {Array.from({ length: 16 }).map((_, i) => (<div key={i} style={{
                height: 22,
                borderRadius: 3,
                background: i < active
                    ? "linear-gradient(180deg,#7c3aed,#4f46e5)"
                    : "#e5e7eb",
            }}/>))}
        </div>

        <div style={{ fontSize: 28, fontWeight: 900, color: "#312e81" }}>
          {confidence}%
        </div>

        <div style={{
            fontSize: 12,
            fontWeight: 700,
            color: "#16a34a",
            letterSpacing: 0.5,
        }}>
          LOW GOVERNANCE RISK
        </div>
      </div>
    </div>);
}

function GovernanceAiRecommendationCard(props: {
    recommendation?: GovernanceRecommendation | null;
    datasetName: string;
    dataset?: GovernanceDatasetStatus;
}) {
    const [expanded, setExpanded] = useState(false);
    const recommendation = props.recommendation;
    const dataset = props.dataset;
    const analyzedSignals = [
        dataset?.certification_status ? "Certification Status" : null,
        dataset?.fair_overall_score != null ? "FAIR Score" : null,
        dataset?.failed_checks != null ? "Certification Checks" : null,
        dataset?.certification_blocker_reason ? "Governance Blockers" : null,
        dataset?.dq_score != null ? "DQ Score" : null,
        dataset?.lineage_complete != null ? "Lineage" : null,
        dataset?.provenance_complete != null ? "Provenance" : null,
        dataset?.lifecycle_stage ? "Lifecycle Stage" : null,
    ].filter((signal): signal is string => Boolean(signal));
    if (!recommendation) {
        return (<div style={{
                marginTop: 12,
                padding: 14,
                borderRadius: 14,
                border: "1px dashed #cbd5e1",
                background: "linear-gradient(180deg, #ffffff 0%, #f8fafc 100%)",
            }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{
                width: 34,
                height: 34,
                borderRadius: 10,
                display: "grid",
                placeItems: "center",
                background: "linear-gradient(135deg, #7c3aed 0%, #4f46e5 100%)",
                color: "#ffffff",
                fontWeight: 900,
                fontSize: 16,
            }}>
            AI
          </div>
          <div>
            <div style={{ fontSize: 13, fontWeight: 800, color: "#334155" }}>
              AI Governance Recommendation
            </div>
            <div style={{ fontSize: 12, color: "#64748b", marginTop: 3 }}>
              No recommendation was returned for this dataset.
            </div>
          </div>
        </div>

      </div>);
    }
    const priority = getGovernancePriorityMeta(recommendation.priority);
    const confidence = normalizeGovernanceConfidence(recommendation.confidence);
    const actions = recommendation.recommended_actions ?? [];
    const evidence = recommendation.supporting_evidence ?? [];
    return (<div style={{
            marginTop: 14,
            borderRadius: 16,
            border: "1px solid #ddd6fe",
            borderLeft: `5px solid ${priority.accent}`,
            background: "linear-gradient(135deg, #ffffff 0%, #faf8ff 56%, #f5f3ff 100%)",
            boxShadow: "0 10px 24px rgba(76, 29, 149, 0.08)",
            overflow: "hidden",
        }}>
      <div style={{ padding: 16 }}>
        <div style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-start",
            gap: 14,
            flexWrap: "wrap",
        }}>
          <div style={{ display: "flex", gap: 12, minWidth: 0, flex: "1 1 480px" }}>
            <div aria-hidden="true" style={{
            width: 42,
            height: 42,
            flex: "0 0 42px",
            borderRadius: 13,
            display: "grid",
            placeItems: "center",
            background: "linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)",
            color: "#ffffff",
            fontWeight: 900,
            fontSize: 15,
            boxShadow: "0 8px 18px rgba(79, 70, 229, 0.24)",
        }}>
              AI
            </div>

            <div style={{ minWidth: 0 }}>
              <div style={{
            fontSize: 11,
            fontWeight: 900,
            letterSpacing: 0.7,
            textTransform: "uppercase",
            color: "#6d28d9",
            marginBottom: 5,
        }}>
                AI Governance Recommendation
              </div>
              <div style={{ fontSize: 18, fontWeight: 850, color: "#172033", lineHeight: 1.3 }}>
                {recommendation.headline || `Governance guidance for ${props.datasetName}`}
              </div>
            </div>
          </div>

          <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
            <span style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
            padding: "6px 10px",
            borderRadius: 999,
            background: priority.background,
            border: `1px solid ${priority.border}`,
            color: priority.color,
            fontSize: 11,
            fontWeight: 900,
            letterSpacing: 0.45,
        }}>
              <span style={{
            width: 7,
            height: 7,
            borderRadius: "50%",
            background: priority.accent,
            display: "inline-block",
        }}/>
              {priority.label} PRIORITY
            </span>

            {confidence !== null && (<span style={{
                padding: "6px 10px",
                borderRadius: 999,
                background: "linear-gradient(135deg, #ffffff 0%, #f8f5ff 55%, #eef6ff 100%)",
                borderTop: "4px solid #7c3aed",
                boxShadow: "0 10px 30px rgba(79,70,229,0.08), 0 2px 10px rgba(59,130,246,0.05)",
                border: "1px solid #ddd6fe",
                color: "#5b21b6",
                fontSize: 11,
                fontWeight: 900,
            }}>
                {confidence}% confidence
              </span>)}
          </div>
        </div>

        <div style={{
            marginTop: 13,
            fontSize: 14,
            lineHeight: 1.6,
            color: "#475569",
            maxWidth: 980,
          }}>
                  {recommendation.summary || "No executive summary was returned."}
                  </div>
        {/* Executive Summary + AI Confidence */}
    <div style={{
            marginTop: 18,
            display: "grid",
            gridTemplateColumns: "minmax(0, 1fr) 300px",
            gap: 22,
            alignItems: "center",
            padding: "16px 18px",
            borderRadius: 16,
            border: "1px solid #ddd6fe",
            background: "linear-gradient(135deg, rgba(255,255,255,0.92) 0%, rgba(248,245,255,0.96) 100%)",
        }}>
  {/* Left side: Executive Summary */}
  <div>
    <div style={{
            fontSize: 12,
            fontWeight: 900,
            letterSpacing: 0.7,
            textTransform: "uppercase",
            color: "#5b21b6",
            marginBottom: 12,
        }}>
      Executive Summary
    </div>

    <div style={{
            display: "flex",
            gap: 8,
            flexWrap: "wrap",
            marginBottom: 12,
        }}>
      {analyzedSignals.map((item) => (<span key={item} style={{
                padding: "5px 10px",
                borderRadius: 999,
                background: "#f5f3ff",
                border: "1px solid #ddd6fe",
                color: "#5b21b6",
                fontSize: 12,
                fontWeight: 700,
            }}>
          {item}
        </span>))}
    </div>

    <div style={{
            fontSize: 13,
            color: "#4b5563",
            lineHeight: 1.7,
        }}>
      AI evaluated governance maturity, certification posture, FAIR
      assessment, policy activity, and data quality signals before producing
      this recommendation.

      <div style={{ marginTop: 10 }}>
        <b>Overall recommendation:</b> {recommendation.headline}
      </div>
    </div>
  </div>

  {/* Right side: AI Confidence */}
  <div style={{
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            minWidth: 0,
        }}>
      {confidence !== null && (<AiConfidenceMeter confidence={confidence}/>)}
  </div>
    </div>

    {/* Recommended Actions / Evidence */}
    <div style={{
            marginTop: 15,
            display: "grid",
            gridTemplateColumns: expanded ? "1.15fr 0.85fr" : "1fr",
            gap: 14,
        }}>
  <div style={{
            padding: 13,
            borderRadius: 13,
            background: "rgba(255,255,255,0.86)",
            border: "1px solid #e9e5ff",
        }}>
    <div style={{
            fontSize: 11,
            fontWeight: 900,
            letterSpacing: 0.55,
            textTransform: "uppercase",
            color: "#5b21b6",
            marginBottom: 9,
        }}>
      Recommended Actions
    </div>

            {actions.length ? (<div style={{ display: "grid", gap: 8 }}>
                {actions.map((action, index) => (<div key={`${action}-${index}`} style={{
                    display: "grid",
                    gridTemplateColumns: "24px minmax(0, 1fr)",
                    gap: 9,
                    alignItems: "start",
                    fontSize: 13,
                    lineHeight: 1.5,
                    color: "#374151",
                }}>
                    <span style={{
                    width: 22,
                    height: 22,
                    borderRadius: 7,
                    display: "grid",
                    placeItems: "center",
                    background: "#ede9fe",
                    color: "#6d28d9",
                    fontSize: 11,
                    fontWeight: 900,
                }}>
                      {index + 1}
                    </span>
                    <span>{action}</span>
                  </div>))}
              </div>) : (<div style={{ fontSize: 13, color: "#64748b" }}>
                No recommended actions were returned.
              </div>)}
          </div>

          {expanded && (<div style={{
                padding: 13,
                borderRadius: 13,
                background: "rgba(255,255,255,0.86)",
                border: "1px solid #e9e5ff",
            }}>
              <div style={{
                fontSize: 11,
                fontWeight: 900,
                letterSpacing: 0.55,
                textTransform: "uppercase",
                color: "#5b21b6",
                marginBottom: 9,
            }}>
                Supporting Evidence
              </div>

              {evidence.length ? (<div style={{ display: "grid", gap: 8 }}>
                  {evidence.map((item, index) => (<div key={`${item}-${index}`} style={{
                        display: "flex",
                        gap: 8,
                        alignItems: "flex-start",
                        fontSize: 13,
                        lineHeight: 1.5,
                        color: "#475569",
                    }}>
                      <span style={{ color: "#7c3aed", fontWeight: 900 }}>•</span>
                      <span>{item}</span>
                    </div>))}
                </div>) : (<div style={{ fontSize: 13, color: "#64748b" }}>
                  No supporting evidence was returned.
                </div>)}
            </div>)}
        </div>
      </div>

      <div
          style={{
            padding: 12,
            marginTop: 12,
            background: "#fff7ed",
            border: "1px solid #fdba74",
            fontWeight: 800,
          }}
        >
          GOVERNANCE FEEDBACK
        </div>
            <RecommendationFeedback
                recommendationId={recommendation.recommendation_id}
                recommendationType="GOVERNANCE"
                profileRunId={null}
                domain={dataset?.domain ?? null}
                ruleId={null}
                aiRecommendation={recommendation.headline}
                aiConfidence={recommendation.confidence}
                sourceComponent="GOVERNANCE_AI_RECOMMENDATION"
              />

      <div style={{
            padding: "10px 16px",
            borderTop: "1px solid #e9e5ff",
            background: "rgba(245,243,255,0.7)",
            display: "flex",
            justifyContent: "space-between",
            gap: 12,
            alignItems: "center",
            flexWrap: "wrap",
        }}>
        <div style={{ fontSize: 11, color: "#64748b" }}>
          Generated from current governance posture, certification checks, and FAIR signals.
        </div>
        <button type="button" onClick={() => setExpanded((value) => !value)} style={{
            border: "1px solid #c4b5fd",
            background: "#ffffff",
            color: "#5b21b6",
            borderRadius: 999,
            padding: "7px 11px",
            fontSize: 11,
            fontWeight: 850,
            cursor: "pointer",
        }}>
          {expanded ? "Hide evidence" : "View evidence"}
        </button>
      </div>
    </div>);
}


function complianceTone(
  status?: GovernanceDqPolicyComplianceResponse["policy_compliance_status"],
) {
  switch (status) {
    case "MET":
      return {
        label: "MET",
        color: "#166534",
        background: "#dcfce7",
        border: "#bbf7d0",
        accent: "#22c55e",
      };
    case "AT_RISK":
      return {
        label: "AT RISK",
        color: "#92400e",
        background: "#fef3c7",
        border: "#fde68a",
        accent: "#f59e0b",
      };
    case "NOT_MET":
      return {
        label: "NOT MET",
        color: "#991b1b",
        background: "#fee2e2",
        border: "#fecaca",
        accent: "#dc2626",
      };
    default:
      return {
        label: "NOT EVALUATED",
        color: "#475569",
        background: "#f1f5f9",
        border: "#cbd5e1",
        accent: "#64748b",
      };
  }
}

function GovernanceDqPolicyComplianceCard(props: {
  compliance: GovernanceDqPolicyComplianceResponse | null;
  loading: boolean;
  error: string | null;
}) {
  const { compliance, loading, error } = props;

  if (loading) {
    return (
      <div style={cardStyle("#dbeafe")}>
        <div style={{ fontWeight: 800, fontSize: 18, color: "#1e3a5f" }}>
          DQ Policy Compliance
        </div>
        <div style={{ marginTop: 8, fontSize: 13, color: "#64748b" }}>
          Evaluating governed DQ controls...
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div style={cardStyle("#fecaca")}>
        <div style={{ fontWeight: 800, fontSize: 18, color: "#991b1b" }}>
          DQ Policy Compliance
        </div>
        <div style={{ marginTop: 8, fontSize: 13, color: "#7f1d1d" }}>
          {error}
        </div>
      </div>
    );
  }

  if (!compliance) {
    return (
      <div style={cardStyle("#e5e7eb")}>
        <div style={{ fontWeight: 800, fontSize: 18, color: "#334155" }}>
          DQ Policy Compliance
        </div>
        <div style={{ marginTop: 8, fontSize: 13, color: "#64748b" }}>
          No current profile evidence is available for policy verification.
        </div>
      </div>
    );
  }

  const tone = complianceTone(compliance.policy_compliance_status);
  const requiredRule =
    compliance.rule_results.find((rule) => rule.required) ??
    compliance.rule_results[0] ??
    null;

  const requiredRate = requiredRule?.required_compliance_rate ?? null;
  const measuredRate = requiredRule?.measured_compliance_rate ?? null;
  const gap =
    requiredRate !== null && measuredRate !== null
      ? measuredRate - requiredRate
      : null;

  const remediationStatus =
    requiredRule?.remediation_status ?? "NOT_STARTED";

  const diagnosticRuleCount =
    requiredRule?.diagnostic_rule_count ??
    requiredRule?.diagnostic_rule_ids?.length ??
    0;

  const approvedDiagnosticRuleCount =
    requiredRule?.approved_diagnostic_rule_count ?? 0;

  const approvedDiagnosticRuleIds =
    requiredRule?.approved_diagnostic_rule_ids ?? [];

  const diagnosticRemediationStates =
    requiredRule?.diagnostic_remediation_states ?? [];

  const remediationState =
    compliance.policy_compliance_status === "MET"
      ? "Policy verified against current profile evidence."
      : remediationStatus === "AUTHORITATIVE_APPROVED"
        ? "Authoritative remediation approved — execute the approved change and re-profile before policy compliance is verified."
        : remediationStatus === "ALL_DIAGNOSTICS_APPROVED"
          ? "All supporting diagnostic remediation paths are approved — execute the approved changes and re-profile to verify the authoritative policy control."
          : remediationStatus === "PARTIALLY_APPROVED"
            ? `Remediation partially approved — ${approvedDiagnosticRuleCount} of ${diagnosticRuleCount} supporting diagnostic controls are approved. Complete the remaining reviews, execute approved changes, and re-profile.`
            : remediationStatus === "PENDING_REVIEW"
              ? "Remediation artifacts are available but still require steward review before execution and re-profile."
              : "Policy not met — no approved remediation path is currently recorded for this governed control.";

  const remediationTone =
    remediationStatus === "AUTHORITATIVE_APPROVED" ||
    remediationStatus === "ALL_DIAGNOSTICS_APPROVED"
      ? {
          label: remediationStatus === "AUTHORITATIVE_APPROVED"
            ? "AUTHORITATIVE APPROVED"
            : "ALL DIAGNOSTICS APPROVED",
          background: "#dcfce7",
          border: "#bbf7d0",
          color: "#166534",
        }
      : remediationStatus === "PARTIALLY_APPROVED"
        ? {
            label: "PARTIALLY APPROVED",
            background: "#fef3c7",
            border: "#fde68a",
            color: "#92400e",
          }
        : remediationStatus === "PENDING_REVIEW"
          ? {
              label: "PENDING REVIEW",
              background: "#fff7ed",
              border: "#fed7aa",
              color: "#9a3412",
            }
          : {
              label: "NOT STARTED",
              background: "#f1f5f9",
              border: "#cbd5e1",
              color: "#475569",
            };

  return (
    <div
      style={{
        ...cardStyle(tone.accent),
        background: "linear-gradient(180deg, #ffffff 0%, #fbfdff 100%)",
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          gap: 16,
          flexWrap: "wrap",
          marginBottom: 16,
        }}
      >
        <div>
          <div
            style={{
              fontSize: 12,
              fontWeight: 900,
              letterSpacing: 0.7,
              textTransform: "uppercase",
              color: "#475569",
            }}
          >
            DQ Policy Compliance
          </div>

          <div
            style={{
              marginTop: 5,
              fontSize: 20,
              fontWeight: 900,
              color: "#0f172a",
            }}
          >
            {compliance.policy_id || "Governed Policy"}
            {compliance.policy_version ? ` · ${compliance.policy_version}` : ""}
          </div>

          <div style={{ marginTop: 4, fontSize: 13, color: "#64748b" }}>
            {compliance.domain} · Profile Run {compliance.profile_run_id}
          </div>
        </div>

        <span
          style={{
            padding: "7px 12px",
            borderRadius: 999,
            background: tone.background,
            color: tone.color,
            border: `1px solid ${tone.border}`,
            fontSize: 12,
            fontWeight: 900,
            letterSpacing: 0.4,
          }}
        >
          {tone.label}
        </span>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
          gap: 12,
        }}
      >
        <KpiCard
          title="Required Compliance"
          value={requiredRate != null ? `${(requiredRate * 100).toFixed(2)}%` : "—"}
          subtitle="Policy threshold"
          accent="#dbeafe"
        />
        <KpiCard
          title="Measured Compliance"
          value={measuredRate != null ? `${(measuredRate * 100).toFixed(2)}%` : "—"}
          subtitle="Deterministic profile evidence"
          accent={tone.accent}
        />
        <KpiCard
          title="Compliance Gap"
          value={gap != null ? `${gap >= 0 ? "+" : ""}${(gap * 100).toFixed(2)} pts` : "—"}
          subtitle="Measured minus required"
          accent="#e2e8f0"
        />
      </div>

      {requiredRule && (
        <div
          style={{
            marginTop: 16,
            padding: 16,
            borderRadius: 14,
            border: "1px solid #e5e7eb",
            background: "#ffffff",
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              gap: 12,
              alignItems: "center",
              flexWrap: "wrap",
            }}
          >
            <div>
              <div
                style={{
                  fontSize: 11,
                  fontWeight: 900,
                  letterSpacing: 0.6,
                  textTransform: "uppercase",
                  color: "#64748b",
                }}
              >
                Authoritative DQ Control
              </div>
              <div
                style={{
                  marginTop: 4,
                  fontSize: 16,
                  fontWeight: 850,
                  color: "#1f2937",
                }}
              >
                {requiredRule.dq_rule_id}
              </div>
            </div>

            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              {requiredRule.authoritative && (
                <span style={{
                  padding: "6px 10px",
                  borderRadius: 999,
                  background: "#eff6ff",
                  border: "1px solid #bfdbfe",
                  color: "#1d4ed8",
                  fontSize: 11,
                  fontWeight: 800,
                }}>
                  AUTHORITATIVE
                </span>
              )}
              {requiredRule.required && (
                <span style={{
                  padding: "6px 10px",
                  borderRadius: 999,
                  background: "#f8fafc",
                  border: "1px solid #cbd5e1",
                  color: "#334155",
                  fontSize: 11,
                  fontWeight: 800,
                }}>
                  REQUIRED
                </span>
              )}
              {requiredRule.severity && (
                <span style={{
                  padding: "6px 10px",
                  borderRadius: 999,
                  background: "#fff7ed",
                  border: "1px solid #fed7aa",
                  color: "#9a3412",
                  fontSize: 11,
                  fontWeight: 800,
                }}>
                  {requiredRule.severity}
                </span>
              )}
            </div>
          </div>

          {requiredRule.governed_rule_description && (
            <div style={{ marginTop: 10, fontSize: 13, color: "#475569", lineHeight: 1.6 }}>
              {requiredRule.governed_rule_description}
            </div>
          )}

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(4, minmax(0, 1fr))",
              gap: 12,
              marginTop: 14,
            }}
          >
            <InsightRow title="Evaluated" value={requiredRule.evaluated_record_count.toLocaleString()} />
            <InsightRow title="Compliant" value={requiredRule.passed_record_count.toLocaleString()} />
            <InsightRow title="Noncompliant" value={requiredRule.failed_record_count.toLocaleString()} />
            <InsightRow title="Skipped / Not Applicable" value={requiredRule.skipped_record_count.toLocaleString()} />
          </div>

          {!!requiredRule.diagnostic_rule_ids?.length && (
            <div style={{ marginTop: 14 }}>
              <div style={{
                fontSize: 11,
                fontWeight: 900,
                letterSpacing: 0.55,
                textTransform: "uppercase",
                color: "#64748b",
                marginBottom: 8,
              }}>
                Supporting Diagnostics
              </div>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                {requiredRule.diagnostic_rule_ids.map((ruleId) => (
                  <span
                    key={ruleId}
                    style={{
                      padding: "6px 10px",
                      borderRadius: 999,
                      background: "#f8fafc",
                      border: "1px solid #e2e8f0",
                      color: "#475569",
                      fontSize: 11,
                      fontWeight: 700,
                    }}
                  >
                    {ruleId}
                  </span>
                ))}
              </div>
            </div>
          )}

          <div
            style={{
              marginTop: 16,
              padding: 14,
              borderRadius: 14,
              border: `1px solid ${remediationTone.border}`,
              background: "linear-gradient(180deg, #ffffff 0%, #fbfdff 100%)",
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                gap: 12,
                alignItems: "center",
                flexWrap: "wrap",
              }}
            >
              <div>
                <div
                  style={{
                    fontSize: 11,
                    fontWeight: 900,
                    letterSpacing: 0.55,
                    textTransform: "uppercase",
                    color: "#64748b",
                  }}
                >
                  Remediation Lifecycle
                </div>
                <div
                  style={{
                    marginTop: 4,
                    fontSize: 14,
                    fontWeight: 800,
                    color: "#1f2937",
                  }}
                >
                  Governed remediation progress for this policy control
                </div>
              </div>

              <span
                style={{
                  padding: "6px 10px",
                  borderRadius: 999,
                  background: remediationTone.background,
                  border: `1px solid ${remediationTone.border}`,
                  color: remediationTone.color,
                  fontSize: 11,
                  fontWeight: 900,
                  letterSpacing: 0.35,
                }}
              >
                {remediationTone.label}
              </span>
            </div>

            <div
              style={{
                marginTop: 12,
                display: "grid",
                gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
                gap: 10,
              }}
            >
              <InsightRow
                title="Supporting Diagnostics"
                value={diagnosticRuleCount.toLocaleString()}
              />
              <InsightRow
                title="Approved Diagnostics"
                value={`${approvedDiagnosticRuleCount} of ${diagnosticRuleCount}`}
              />
              <InsightRow
                title="Policy Verification"
                value={
                  compliance.policy_compliance_status === "MET"
                    ? "VERIFIED"
                    : "RE-PROFILE REQUIRED"
                }
              />
            </div>

            {!!approvedDiagnosticRuleIds.length && (
              <div style={{ marginTop: 12 }}>
                <div
                  style={{
                    fontSize: 11,
                    fontWeight: 900,
                    letterSpacing: 0.5,
                    textTransform: "uppercase",
                    color: "#64748b",
                    marginBottom: 7,
                  }}
                >
                  Approved Diagnostic Remediation
                </div>

                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                  {approvedDiagnosticRuleIds.map((ruleId) => (
                    <span
                      key={`approved-${ruleId}`}
                      style={{
                        padding: "6px 10px",
                        borderRadius: 999,
                        background: "#dcfce7",
                        border: "1px solid #bbf7d0",
                        color: "#166534",
                        fontSize: 11,
                        fontWeight: 800,
                      }}
                    >
                      ✓ {ruleId}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {!!diagnosticRemediationStates.length && (
              <div style={{ marginTop: 12 }}>
                <div
                  style={{
                    fontSize: 11,
                    fontWeight: 900,
                    letterSpacing: 0.5,
                    textTransform: "uppercase",
                    color: "#64748b",
                    marginBottom: 7,
                  }}
                >
                  Diagnostic Remediation Status
                </div>

                <div style={{ display: "grid", gap: 7 }}>
                  {diagnosticRemediationStates.map((item, index) => {
                    const ruleId = String(
                      item.dq_rule_id ?? `Diagnostic ${index + 1}`,
                    );
                    const approvalStatus = String(
                      item.remediation_approval_status ?? "NOT STARTED",
                    ).toUpperCase();
                    const isApproved = approvalStatus === "APPROVED";

                    return (
                      <div
                        key={`${ruleId}-${index}`}
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          gap: 10,
                          alignItems: "center",
                          padding: "8px 10px",
                          borderRadius: 10,
                          background: "#f8fafc",
                          border: "1px solid #e2e8f0",
                        }}
                      >
                        <span
                          style={{
                            fontSize: 12,
                            fontWeight: 700,
                            color: "#334155",
                            overflowWrap: "anywhere",
                          }}
                        >
                          {ruleId}
                        </span>

                        <span
                          style={{
                            flex: "0 0 auto",
                            padding: "4px 8px",
                            borderRadius: 999,
                            background: isApproved ? "#dcfce7" : "#f1f5f9",
                            border: isApproved
                              ? "1px solid #bbf7d0"
                              : "1px solid #cbd5e1",
                            color: isApproved ? "#166534" : "#475569",
                            fontSize: 10,
                            fontWeight: 900,
                          }}
                        >
                          {approvalStatus}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      <div
        style={{
          marginTop: 14,
          display: "grid",
          gridTemplateColumns: "1.2fr 0.8fr",
          gap: 12,
        }}
      >
        <div
          style={{
            padding: 13,
            borderRadius: 12,
            background: tone.background,
            border: `1px solid ${tone.border}`,
            fontSize: 13,
            color: tone.color,
            lineHeight: 1.5,
            fontWeight: 700,
          }}
        >
          <div
            style={{
              fontSize: 10,
              fontWeight: 900,
              letterSpacing: 0.55,
              textTransform: "uppercase",
              marginBottom: 5,
              opacity: 0.8,
            }}
          >
            Remediation Status
          </div>
          {remediationState}
        </div>

        <div
          style={{
            padding: 13,
            borderRadius: 12,
            background: "#f8fafc",
            border: "1px solid #e2e8f0",
            fontSize: 12,
            color: "#475569",
            lineHeight: 1.5,
          }}
        >
          <div>
            <b>Policy Evidence:</b> {requiredRule?.compliance_evidence_id || "—"}
          </div>
          <div style={{ marginTop: 4 }}>
            <b>Evaluated:</b> {formatDateTime(compliance.evaluated_at)}
          </div>
        </div>
      </div>
    </div>
  );
}

export type GovernanceIntelligenceProps = {
  governance: GovernanceOverviewResponse | null;
  policyProfileRunId?: string | null;
  policyDomain?: string | null;
  policyId?: string | null;
  policyVersion?: string | null;
};

export default function GovernanceIntelligence({
  governance,
  policyProfileRunId,
  policyDomain,
  policyId,
  policyVersion,
}: GovernanceIntelligenceProps) {
  const [showAllPolicyActivity, setShowAllPolicyActivity] =
    useState(false);

  const visiblePolicyActivity = useMemo(
    () =>
      showAllPolicyActivity
        ? governance?.policy_activity ?? []
        : (governance?.policy_activity ?? []).slice(0, 3),
    [governance, showAllPolicyActivity],
  );

  const [policyCompliance, setPolicyCompliance] =
    useState<GovernanceDqPolicyComplianceResponse | null>(null);
  const [policyComplianceLoading, setPolicyComplianceLoading] =
    useState(false);
  const [policyComplianceError, setPolicyComplianceError] =
    useState<string | null>(null);

  React.useEffect(() => {
    let cancelled = false;

    async function loadPolicyCompliance() {
      if (!policyProfileRunId || !policyDomain) {
        setPolicyCompliance(null);
        setPolicyComplianceError(null);
        return;
      }

      setPolicyComplianceLoading(true);
      setPolicyComplianceError(null);

      try {
        const result = await getGovernancePolicyCompliance({
          profileRunId: policyProfileRunId,
          domain: policyDomain,
          policyId: policyId || undefined,
          policyVersion: policyVersion || undefined,
        });

        if (!cancelled) {
          setPolicyCompliance(result);
        }
      } catch (err) {
        if (!cancelled) {
          setPolicyCompliance(null);
          setPolicyComplianceError(
            err instanceof Error
              ? err.message
              : "Unable to load DQ policy compliance.",
          );
        }
      } finally {
        if (!cancelled) {
          setPolicyComplianceLoading(false);
        }
      }
    }

    void loadPolicyCompliance();

    return () => {
      cancelled = true;
    };
  }, [policyProfileRunId, policyDomain, policyId, policyVersion]);

  return (
    <div style={{ display: "grid", gap: 18 }}>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(4, minmax(0, 1fr))",
          gap: 14,
        }}
      >
        <HeroKpiCard
          title="Governed Datasets"
          value={num(governance?.kpis.total_datasets)}
          subtitle="Datasets currently tracked in governance scope"
        />
        <HeroKpiCard
          title="Certified Datasets"
          value={num(governance?.kpis.certified_datasets)}
          subtitle="Datasets currently certified for governed use"
          valueColor="#166534"
        />
        <HeroKpiCard
          title="Ready for Certification"
          value={num(
            governance?.kpis.ready_for_certification,
          )}
          subtitle="Datasets operationally ready for certification"
          valueColor="#1d4ed8"
        />
        <HeroKpiCard
          title="Average FAIR Score"
          value={dec(governance?.kpis.avg_fair_score, 1)}
          subtitle="Average FAIR posture across governed assets"
          valueColor="#7c3aed"
        />
      </div>

      <GovernanceDqPolicyComplianceCard
        compliance={policyCompliance}
        loading={policyComplianceLoading}
        error={policyComplianceError}
      />


      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(4, minmax(0, 1fr))",
          gap: 14,
        }}
      >
        <KpiCard
          title="Open Governance Issues"
          value={num(
            governance?.kpis.open_governance_issues,
          )}
          subtitle="Datasets with unresolved governance blockers"
          accent="#f59e0b"
        />
        <KpiCard
          title="Certification Checks"
          value={num(governance?.kpis.total_checks)}
          subtitle={`Pass rate: ${dec(
            governance?.kpis.check_pass_rate,
            1,
          )}%`}
          accent="#0f172a"
        />
        <KpiCard
          title="Active Policies"
          value={num(governance?.kpis.active_policies)}
          subtitle="Policies currently active in governance controls"
          accent="#2563eb"
        />
        <KpiCard
          title="Recent Policy Changes"
          value={num(
            governance?.kpis.recent_policy_changes_30d,
          )}
          subtitle="Changes logged in the last 30 days"
          accent="#7c3aed"
        />
      </div>

      <div
        style={{
          ...cardStyle("#dbeafe"),
          marginTop: 4,
          background:
            "linear-gradient(180deg, #ffffff 0%, #f8fbff 100%)",
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-start",
            gap: 16,
            flexWrap: "wrap",
            marginBottom: 16,
          }}
        >
          <div>
            <div
              style={{
                fontSize: 18,
                fontWeight: 850,
                color: "#1e3a5f",
              }}
            >
              AI Steward Trust & Oversight
            </div>

            <div
              style={{
                marginTop: 5,
                fontSize: 13,
                color: "#64748b",
                lineHeight: 1.5,
              }}
            >
              Human review outcomes for AI-generated data
              quality and governance recommendations.
            </div>
          </div>

          <div
            style={{
              padding: "6px 10px",
              borderRadius: 999,
              background: "#eff6ff",
              border: "1px solid #bfdbfe",
              color: "#1d4ed8",
              fontSize: 11,
              fontWeight: 800,
            }}
          >
            HUMAN-IN-THE-LOOP
          </div>
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns:
              "repeat(4, minmax(0, 1fr))",
            gap: 12,
          }}
        >
          <KpiCard
            title="Recommendations Reviewed"
            value={num(
              governance?.ai_feedback_metrics
                ?.total_feedback,
            )}
            subtitle="AI recommendations with steward decisions"
            accent="#dbeafe"
          />
          <KpiCard
            title="AI Acceptance Rate"
            value={
              governance?.ai_feedback_metrics
                ?.acceptance_rate != null
                ? `${(
                    governance.ai_feedback_metrics
                      .acceptance_rate * 100
                  ).toFixed(1)}%`
                : "—"
            }
            subtitle="Recommendations approved by stewards"
            accent="#dcfce7"
          />
          <KpiCard
            title="AI Override Rate"
            value={
              governance?.ai_feedback_metrics
                ?.override_rate != null
                ? `${(
                    governance.ai_feedback_metrics
                      .override_rate * 100
                  ).toFixed(1)}%`
                : "—"
            }
            subtitle="Recommendations rejected or modified"
            accent="#fee2e2"
          />
          <KpiCard
            title="Deferred Reviews"
            value={num(
              governance?.ai_feedback_metrics
                ?.deferred_count,
            )}
            subtitle="Recommendations awaiting later action"
            accent="#fef3c7"
          />
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns:
              "repeat(4, minmax(0, 1fr))",
            gap: 12,
            marginTop: 12,
          }}
        >
          <KpiCard
            title="Approved"
            value={num(
              governance?.ai_feedback_metrics
                ?.approved_count,
            )}
            subtitle="Accepted AI recommendations"
            accent="#dcfce7"
          />
          <KpiCard
            title="Rejected"
            value={num(
              governance?.ai_feedback_metrics
                ?.rejected_count,
            )}
            subtitle="Rejected AI recommendations"
            accent="#fee2e2"
          />
          <KpiCard
            title="Modified"
            value={num(
              governance?.ai_feedback_metrics
                ?.modified_count,
            )}
            subtitle="Recommendations changed by stewards"
            accent="#e0e7ff"
          />
          <KpiCard
            title="DQ Feedback"
            value={num(
              governance?.ai_feedback_metrics
                ?.dq_feedback_count,
            )}
            subtitle="Reviewed DQ AI recommendations"
            accent="#ede9fe"
          />
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns:
              "repeat(3, minmax(0, 1fr))",
            gap: 12,
            marginTop: 12,
          }}
        >
          <KpiCard
            title="Avg AI Confidence"
            value={
              governance?.ai_feedback_metrics
                ?.avg_ai_confidence != null
                ? `${(
                    governance.ai_feedback_metrics
                      .avg_ai_confidence * 100
                  ).toFixed(1)}%`
                : "—"
            }
            subtitle="Average confidence across reviewed recommendations"
            accent="#e0f2fe"
          />
          <KpiCard
            title="Confidence — Approved"
            value={
              governance?.ai_feedback_metrics
                ?.avg_approved_ai_confidence != null
                ? `${(
                    governance.ai_feedback_metrics
                      .avg_approved_ai_confidence * 100
                  ).toFixed(1)}%`
                : "—"
            }
            subtitle="Average AI confidence on steward-approved recommendations"
            accent="#dcfce7"
          />
          <KpiCard
            title="Confidence — Overridden"
            value={
              governance?.ai_feedback_metrics
                ?.avg_override_ai_confidence != null
                ? `${(
                    governance.ai_feedback_metrics
                      .avg_override_ai_confidence * 100
                  ).toFixed(1)}%`
                : "—"
            }
            subtitle="Average confidence on rejected or modified recommendations"
            accent="#fee2e2"
          />
        </div>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1.45fr 0.75fr 0.95fr",
          gap: 16,
          alignItems: "start",
        }}
      >
        <div style={cardStyle("#dbeafe")}>
          <div
            style={{
              fontWeight: 800,
              fontSize: 18,
              marginBottom: 8,
            }}
          >
            Dataset Certification Readiness
          </div>

          <div
            style={{
              fontSize: 14,
              opacity: 0.76,
              marginBottom: 14,
            }}
          >
            Operational view of dataset certification posture,
            FAIR alignment, and blockers.
          </div>

          {!governance?.dataset_statuses?.length ? (
            <div style={{ fontSize: 13, opacity: 0.7 }}>
              No governance dataset detail available.
            </div>
          ) : (
            <div style={{ display: "grid", gap: 10 }}>
              {governance.dataset_statuses
                .slice(0, 12)
                .map((row: GovernanceDatasetStatus) => (
                  <div
                    key={row.dataset_id}
                    style={{
                      border: "1px solid #e5e7eb",
                      borderRadius: 14,
                      padding: 14,
                      background: "#fff",
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        justifyContent:
                          "space-between",
                        gap: 12,
                        alignItems: "center",
                        flexWrap: "wrap",
                      }}
                    >
                      <div>
                        <div
                          style={{
                            fontWeight: 800,
                            fontSize: 15,
                          }}
                        >
                          {row.dataset_name}
                        </div>

                        <div
                          style={{
                            fontSize: 12,
                            opacity: 0.72,
                            marginTop: 4,
                          }}
                        >
                          {row.domain || "—"}
                          {row.subdomain
                            ? ` • ${row.subdomain}`
                            : ""}
                        </div>
                      </div>

                      <div
                        style={{
                          display: "flex",
                          gap: 8,
                          flexWrap: "wrap",
                        }}
                      >
                        <span
                          style={statusPillStyle(
                            row.certification_status,
                          )}
                        >
                          {row.certification_status ||
                            "Unknown"}
                        </span>

                        <span
                          style={readinessPillStyle(
                            row.ready_for_certification,
                          )}
                        >
                          {row.ready_for_certification
                            ? "READY"
                            : "NOT READY"}
                        </span>
                      </div>
                    </div>

                    <div
                      style={{
                        display: "grid",
                        gridTemplateColumns:
                          "repeat(4, minmax(0, 1fr))",
                        gap: 12,
                        marginTop: 14,
                      }}
                    >
                      <InsightRow
                        title="Data Owner"
                        value={row.data_owner || "—"}
                      />
                      <InsightRow
                        title="Lifecycle Stage"
                        value={
                          row.lifecycle_stage || "—"
                        }
                      />
                      <InsightRow
                        title="FAIR Score"
                        value={
                          row.fair_overall_score != null
                            ? dec(
                                row.fair_overall_score,
                                1,
                              )
                            : "—"
                        }
                      />
                      <InsightRow
                        title="Failed Checks"
                        value={num(row.failed_checks)}
                      />
                    </div>

                    <div
                      style={{
                        marginTop: 12,
                        padding: 12,
                        borderRadius: 12,
                        background: "#f8fafc",
                        border:
                          "1px solid #e5e7eb",
                        fontSize: 13,
                        color: "#4b5563",
                      }}
                    >
                      <b style={{ color: "#374151" }}>
                        Blocker:
                      </b>{" "}
                      {row.certification_blocker_reason ||
                        "No active blocker recorded"}
                    </div>
                  </div>
                ))}
            </div>
          )}
        </div>

        <div style={cardStyle("#fee2e2")}>
          <div
            style={{
              fontWeight: 800,
              fontSize: 18,
              marginBottom: 8,
            }}
          >
            Top Governance Blockers
          </div>

          {!governance?.top_blockers?.length ? (
            <div style={{ fontSize: 13, opacity: 0.7 }}>
              No blocker trends available.
            </div>
          ) : (
            <div style={{ display: "grid", gap: 10 }}>
              {governance.top_blockers.map((blocker) => (
                <div
                  key={blocker.blocker_reason}
                  style={{
                    border: "1px solid #fecaca",
                    borderRadius: 12,
                    padding: 12,
                    background: "#fff",
                  }}
                >
                  <div
                    style={{
                      fontSize: 13,
                      fontWeight: 700,
                      color: "#7f1d1d",
                    }}
                  >
                    {blocker.blocker_reason}
                  </div>

                  <div
                    style={{
                      fontSize: 12,
                      opacity: 0.75,
                      marginTop: 4,
                    }}
                  >
                    Count: {blocker.blocker_count}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div style={cardStyle("#ede9fe")}>
          <div
            style={{
              fontWeight: 800,
              fontSize: 18,
              marginBottom: 8,
            }}
          >
            Recent Policy Activity
          </div>

          {!governance?.policy_activity?.length ? (
            <div style={{ fontSize: 13, opacity: 0.7 }}>
              No recent policy activity found.
            </div>
          ) : (
            <>
              <div style={{ display: "grid", gap: 10 }}>
                {visiblePolicyActivity.map(
                  (item, idx) => (
                    <div
                      key={`${item.change_id ??
                        item.policy_name ??
                        "policy"}-${idx}`}
                      style={{
                        border:
                          "1px solid #ddd6fe",
                        borderRadius: 12,
                        padding: 12,
                        background: "#fff",
                      }}
                    >
                      <div
                        style={{
                          fontSize: 13,
                          fontWeight: 800,
                        }}
                      >
                        {item.policy_name ||
                          item.changed_object ||
                          "Policy Update"}
                      </div>

                      <div
                        style={{
                          fontSize: 12,
                          opacity: 0.75,
                          marginTop: 4,
                        }}
                      >
                        {item.domain || "—"} •{" "}
                        {item.change_type || "Change"} •{" "}
                        {item.publish_status ||
                          "Status unknown"}
                      </div>

                      <div
                        style={{
                          fontSize: 12,
                          opacity: 0.72,
                          marginTop: 6,
                        }}
                      >
                        By {item.changed_by || "Unknown"} •{" "}
                        {formatDateTime(item.changed_at)}
                      </div>
                    </div>
                  ),
                )}
              </div>

              {(governance.policy_activity.length ?? 0) >
                3 && (
                <div
                  style={{
                    display: "flex",
                    justifyContent: "center",
                    marginTop: 12,
                  }}
                >
                  <button
                    type="button"
                    onClick={() =>
                      setShowAllPolicyActivity(
                        (currentValue) =>
                          !currentValue,
                      )
                    }
                    style={{
                      padding: "8px 18px",
                      borderRadius: 8,
                      border:
                        "1px solid #c4b5fd",
                      background: "#f5f3ff",
                      color: "#5b21b6",
                      cursor: "pointer",
                      fontWeight: 600,
                      fontSize: 13,
                    }}
                  >
                    {showAllPolicyActivity
                      ? "Less ▲"
                      : "More ▼"}
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      <div style={{ marginTop: 18 }}>
        {governance?.dataset_statuses?.some(
          (row: GovernanceDatasetStatus) =>
            row.ai_recommendation != null,
        ) ? (
          <div style={{ display: "grid", gap: 16 }}>
            {governance.dataset_statuses
              .filter(
                (row: GovernanceDatasetStatus) =>
                  row.ai_recommendation != null,
              )
              .map((row: GovernanceDatasetStatus) => (
                <GovernanceAiRecommendationCard
                  key={`ai-recommendation-${row.dataset_id}`}
                  recommendation={row.ai_recommendation}
                  datasetName={row.dataset_name}
                  dataset={row}
                />
              ))}
          </div>
        ) : (
          <div
            style={{
              ...cardStyle("#ddd6fe"),
              background:
                "linear-gradient(180deg, #ffffff 0%, #faf8ff 100%)",
            }}
          >
            <div
              style={{
                fontSize: 16,
                fontWeight: 800,
                color: "#5b21b6",
                marginBottom: 6,
              }}
            >
              AI Governance Recommendations
            </div>

            <div
              style={{
                fontSize: 13,
                color: "#64748b",
                lineHeight: 1.5,
              }}
            >
              No AI governance recommendations were generated
              for the selected lookback period.
            </div>
          </div>
        )}
      </div>
    </div>
  );
}