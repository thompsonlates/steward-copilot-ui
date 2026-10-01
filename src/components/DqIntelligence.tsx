// src/components/intelligence/DqIntelligence.tsx
import React, { useEffect, useMemo, useState } from "react";

import { getBillingStatus } from "../api/billing";

import type {
  DqApprovedRecommendationResponse,
  DqDashboardRow,
  DqExecutionResponse,
  DqRuleSuggestionsResponse,
  EnterpriseConnection,
  MetricsOverviewResponse,
} from "../api/types";

import {
  executeDqRemediation,
  executeGoogleSheetsDqRemediation,
  executeOneDriveDqRemediation,
  executeSnowflakeRegexDqRemediation,
  getEnterpriseConnections,
  validateDqExecution,
  validateSnowflakeRegexDqExecution,
} from "../api/client";


function pct(v: number | null | undefined): string {
  if (v === null || v === undefined || Number.isNaN(v)) return "—";
  return `${(v * 100).toFixed(1)}%`;
}

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

function cardStyle(accent?: string): React.CSSProperties {
  return {
    border: "1px solid #e5e7eb",
    borderRadius: 18,
    padding: 16,
    background: "linear-gradient(180deg, #ffffff 0%, #fafafa 100%)",
    boxShadow: "0 10px 28px rgba(0,0,0,0.06)",
    borderTop: accent ? `4px solid ${accent}` : "1px solid #e5e7eb",
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

function ImpactStat(props: {
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div
      style={{
        border: "1px solid #eee",
        borderRadius: 12,
        padding: "12px 14px",
        background: "#fff",
      }}
    >
      <div
        style={{
          fontSize: 12,
          opacity: 0.7,
          marginBottom: 6,
        }}
      >
        {props.label}
      </div>

      <div
        style={{
          fontSize: 26,
          fontWeight: 700,
          letterSpacing: "-0.02em",
          color: "#111827",
        }}
      >
        {props.value}
      </div>
    </div>
  );
}


function barColor(label: string): string {
  const upper = label.toUpperCase();
  if (
    upper.includes("HIGH") ||
    upper.includes("SEVERE") ||
    upper.includes("CRITICAL") ||
    upper.includes("REJECT_MERGE") ||
    upper.includes("FALSE_POSITIVE")
  ) {
    return "#c23b3b";
  }
  if (
    upper.includes("MEDIUM") ||
    upper.includes("ELEVATED") ||
    upper.includes("REVIEW")
  ) {
    return "#c87a12";
  }
  if (
    upper.includes("LOW") ||
    upper.includes("APPROVE_MERGE") ||
    upper.includes("ACCEPTED")
  ) {
    return "#2f8f4e";
  }
  return "#111";
}

function DistCard(props: {
    title: string;
    total: number;
    items: Array<[
        string,
        number
    ]>;
}) {
    return (<div style={cardStyle()}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 8 }}>
        <div style={{ fontWeight: 700 }}>{props.title}</div>
        <div style={{ fontSize: 12, opacity: 0.7 }}>Total: {props.total}</div>
      </div>

      {props.items.length === 0 ? (<div style={{ marginTop: 10, fontSize: 13, opacity: 0.7 }}>No data.</div>) : (<div style={{ marginTop: 12, display: "grid", gap: 10 }}>
          {props.items.map(([k, v]) => (<BarRow key={k} label={k} value={v} total={props.total} color={barColor(k)}/>))}
        </div>)}
    </div>);
}
function BarRow(props: {
    label: string;
    value: number;
    total: number;
    color?: string;
}) {
    const frac = props.total > 0 ? props.value / props.total : 0;
    return (<div style={{ display: "grid", gap: 6 }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 10 }}>
        <div style={{ fontSize: 13 }}>{props.label}</div>
        <div style={{ fontSize: 12, opacity: 0.72 }}>
          {props.value} ({(frac * 100).toFixed(0)}%)
        </div>
      </div>

      <div style={{
            height: 10,
            background: "#f2f2f2",
            borderRadius: 999,
            overflow: "hidden",
        }}>
        <div style={{
            width: `${Math.max(0, Math.min(1, frac)) * 100}%`,
            height: "100%",
            background: props.color ?? "#111",
        }}/>
      </div>
    </div>);
}
function Sparkline({ data }: {
    data?: number[];
}) {
    if (!data || data.length <= 1)
        return null;
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
    return (<svg viewBox="0 0 100 100" preserveAspectRatio="none" style={{
            width: "100%",
            height: 30,
            marginTop: 8,
            opacity: 0.7,
        }}>
      <polyline fill="none" stroke="#3b82f6" strokeWidth="3" points={points}/>
    </svg>);
}
function scorePct(v: number | null | undefined): string {
    if (v === null || v === undefined || Number.isNaN(v))
        return "—";
    return `${v.toFixed(1)}`;
}
function scorePctWithUnit(v: number | null | undefined): string {
    if (v === null || v === undefined || Number.isNaN(v))
        return "—";
    return `${v.toFixed(1)}/100`;
}
function latestSparkline(rows: DqDashboardRow[] | undefined, field: keyof DqDashboardRow): number[] {
    if (!rows || rows.length === 0)
        return [];
    return [...rows]
        .sort((a, b) => String(a.metric_date).localeCompare(String(b.metric_date)))
        .slice(-8)
        .map((r) => {
        const value = r[field];
        return typeof value === "number" ? value : 0;
    });
}
function getDqHealthMeta(score: number | null | undefined) {
    if (score === null || score === undefined)
        return { label: "NO SIGNAL", color: "#6b7280" };
    if (score >= 90)
        return { label: "STRONG QUALITY", color: "#16a34a" };
    if (score >= 75)
        return { label: "STABLE QUALITY", color: "#d97706" };
    return { label: "QUALITY AT RISK", color: "#dc2626" };
}
function getDqRiskMeta(score: number | null | undefined) {
    if (score === null || score === undefined)
        return { label: "UNKNOWN", color: "#6b7280" };
    if (score <= 25)
        return { label: "LOW RISK", color: "#16a34a" };
    if (score <= 50)
        return { label: "MODERATE RISK", color: "#d97706" };
    return { label: "HIGH RISK", color: "#dc2626" };
}
function DqExecutiveSummaryCard(props: {
    title: string;
    value: string;
    subtitle: string;
    badgeLabel?: string;
    badgeColor?: string;
    accent?: string;
    children?: React.ReactNode;
}) {
    return (<div style={cardStyle(props.accent)}>
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
            fontSize: 30,
            fontWeight: 800,
            lineHeight: 1.1,
            color: "#243b53",
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
      </div>

      <div style={{ marginTop: 8, fontSize: 13, opacity: 0.75 }}>{props.subtitle}</div>

      {props.children}
    </div>);
}
function DqScoreCompositionCard({ row }: {
    row: DqDashboardRow | null;
}) {
    const items = [
        { label: "Completeness", value: row?.avg_completeness_score ?? null },
        { label: "Validity", value: row?.avg_validity_score ?? null },
        { label: "Standardization", value: row?.avg_standardization_score ?? null },
        { label: "Consistency", value: row?.avg_consistency_score ?? null },
        { label: "Uniqueness", value: row?.avg_uniqueness_score ?? null },
    ];
    return (<div style={cardStyle("#dbeafe")}>
      <div style={{ fontWeight: 700, marginBottom: 12 }}>DQ Score Composition</div>

      <div style={{ display: "grid", gap: 10 }}>
        {items.map((item) => (<div key={item.label}>
            <div style={{
                display: "flex",
                justifyContent: "space-between",
                gap: 10,
                marginBottom: 6,
            }}>
              <div style={{ fontSize: 13 }}>{item.label}</div>
              <div style={{ fontSize: 13, fontWeight: 700 }}>{scorePct(item.value)}</div>
            </div>

            <div style={{
                height: 10,
                background: "#eef2f7",
                borderRadius: 999,
                overflow: "hidden",
            }}>
              <div style={{
                width: `${Math.max(0, Math.min(100, item.value ?? 0))}%`,
                height: "100%",
                background: "#3b82f6",
            }}/>
            </div>
          </div>))}
      </div>
    </div>);
}
function DqIssuePostureCard({ row }: {
    row: DqDashboardRow | null;
}) {
    const total = row?.total_findings ?? 0;
    const items: Array<[
        string,
        number
    ]> = [
        ["Critical", row?.critical_findings ?? 0],
        ["High", row?.high_findings ?? 0],
        ["Medium", row?.medium_findings ?? 0],
        ["Low", row?.low_findings ?? 0],
    ];
    return <DistCard title="Issue Severity Posture" total={total} items={items}/>;
}
function DqRecommendationCard({ row }: {
    row: DqDashboardRow | null;
}) {
    return (<div style={cardStyle("#e0f2fe")}>
      <div style={{ fontWeight: 700, marginBottom: 12 }}>AI Recommendation Posture</div>

      <div style={{ display: "grid", gap: 10 }}>
        <InsightRow title="Recommendations Generated" value={num(row?.ai_recommendations_generated)}/>
        <InsightRow title="Accepted" value={num(row?.accepted_ai_recommendations)}/>
        <InsightRow title="Implemented" value={num(row?.implemented_ai_recommendations)}/>
        <InsightRow title="Avg AI Confidence" value={pct(row?.avg_ai_recommendation_confidence)}/>
        <InsightRow title="Implementation Rate" value={pct(row?.ai_recommendation_implementation_rate)}/>
      </div>
    </div>);
}
function DqOperationalPressureCard({ row }: {
    row: DqDashboardRow | null;
}) {
    return (<div style={cardStyle("#fef3c7")}>
      <div style={{ fontWeight: 700, marginBottom: 12 }}>Operational Pressure</div>

      <div style={{ display: "grid", gap: 10 }}>
        <InsightRow title="Records With Findings" value={num(row?.records_with_findings)}/>
        <InsightRow title="Impacted Record Rate" value={pct(row?.impacted_record_rate)}/>
        <InsightRow title="Records Below Threshold" value={num(row?.records_below_threshold)}/>
        <InsightRow title="Duplicate Rate" value={pct(row?.duplicate_rate)}/>
        <InsightRow title="Steward Actions Taken" value={num(row?.steward_actions_taken)}/>
      </div>
    </div>);
}
function DqRuleCoverageCard({ row }: {
    row: DqDashboardRow | null;
}) {
    return (<div style={cardStyle("#ede9fe")}>
      <div style={{ fontWeight: 700, marginBottom: 12 }}>Rule Coverage</div>

      <div style={{ display: "grid", gap: 10 }}>
        <InsightRow title="Configured Rules" value={num(row?.configured_rule_count)}/>
        <InsightRow title="Active Rules" value={num(row?.active_rule_count)}/>
        <InsightRow title="Rules Triggered" value={num(row?.rules_triggered)}/>
        <InsightRow title="Failed Rule Count" value={num(row?.failed_rule_count)}/>
        <InsightRow title="Avg Rule Weight" value={dec(row?.avg_rule_weight, 2)}/>
      </div>
    </div>);
}

function DqStewardImpactCard(props: {
    row: DqDashboardRow | null;
    stewardData: MetricsOverviewResponse | null;
}) {
    const row = props.row;
    const stewardData = props.stewardData;
    const impactedRecords = row?.records_with_findings ?? 0;
    const impactedRate = row?.impacted_record_rate ?? 0;
    const stewardActions = row?.steward_actions_taken ?? 0;
    const belowThreshold = row?.records_below_threshold ?? 0;
    const duplicateCount = row?.duplicate_record_count ?? 0;
    const totalFindings = row?.total_findings ?? 0;
    const reviewCount = stewardData?.total_reviewed ?? 0;
    const overrideRate = stewardData?.override_rate ?? 0;
    const falsePositives = stewardData?.false_positives ?? 0;
    const dqDrivenReviewPressure = reviewCount > 0 ? Math.min(100, Math.round((impactedRecords / reviewCount) * 100)) : 0;
    const dqDrivenStewardTouchRate = impactedRecords > 0 ? Math.min(100, Math.round((stewardActions / impactedRecords) * 100)) : 0;
    const primaryDriver = (() => {
        const candidates = [
            { label: "Duplicate records", value: duplicateCount },
            { label: "Records below threshold", value: belowThreshold },
            { label: "Open findings", value: row?.open_findings_count ?? 0 },
            { label: "Critical + high findings", value: (row?.critical_findings ?? 0) + (row?.high_findings ?? 0) },
        ].sort((a, b) => b.value - a.value);
        return candidates[0]?.label ?? "Data quality findings";
    })();
    const narrative = (() => {
        if (!row) {
            return "No DQ summary data is available yet to estimate operational impact.";
        }
        if (impactedRate >= 0.2) {
            return "A meaningful share of records are carrying data quality issues, creating direct steward workload and reducing automation confidence.";
        }
        if (duplicateCount > 0 && belowThreshold > 0) {
            return "Duplicate records and low-scoring records are contributing to steward intervention and slowing safe automation.";
        }
        if (belowThreshold > 0) {
            return "Low-scoring records are contributing to steward intervention and slowing safe automation.";
        }
        if ((row?.open_findings_count ?? 0) > 0) {
            return "Unresolved data quality findings are creating remediation pressure and reducing confidence in downstream automation.";
        }
        return "Current data quality issues are present but appear relatively contained operationally.";
    })();
    return (<div style={{
            ...cardStyle("#fde68a"),
            background: "linear-gradient(180deg, #ffffff 0%, #fffdf7 100%)",
        }}>
      <div style={{
            display: "flex",
            justifyContent: "space-between",
            gap: 12,
            alignItems: "center",
            marginBottom: 12,
            flexWrap: "wrap",
        }}>
        <div style={{ fontWeight: 800, fontSize: 18, color: "#1f2937" }}>
          Data Quality Impact on Steward Operations
        </div>

        <div style={{
            padding: "6px 10px",
            borderRadius: 999,
            fontSize: 11,
            fontWeight: 700,
            border: "1px solid #f3e8b5",
            background: "#fff7db",
            color: "#8a5a00",
            letterSpacing: 0.3,
        }}>
          Primary Driver: {primaryDriver}
        </div>
      </div>

      <div style={{
            fontSize: 14,
            lineHeight: 1.5,
            color: "#4b5563",
            marginBottom: 14,
            maxWidth: 920,
        }}>
        {narrative}
      </div>

      <div style={{
            display: "grid",
            gridTemplateColumns: "repeat(4, minmax(0, 1fr))",
            gap: 12,
        }}>
        <ImpactStat label="Records Impacted by DQ" value={impactedRecords.toLocaleString()}/>
        <ImpactStat label="Impacted Record Rate" value={`${(impactedRate * 100).toFixed(1)}%`}/>
        <ImpactStat label="DQ-Driven Review Pressure" value={`${dqDrivenReviewPressure}%`}/>
        <ImpactStat label="Steward Touch Rate" value={`${dqDrivenStewardTouchRate}%`}/>
      </div>

      <div style={{
            marginTop: 14,
            display: "grid",
            gridTemplateColumns: "1.2fr 1fr",
            gap: 14,
        }}>
        <div style={{
            border: "1px solid #eee",
            borderRadius: 14,
            padding: 14,
            background: "#fff",
        }}>
          <div style={{ fontSize: 12, opacity: 0.72, marginBottom: 10 }}>
            Operational Pressure Breakdown
          </div>

          <div style={{ display: "grid", gap: 10 }}>
            <InsightRow title="Total Findings" value={totalFindings.toLocaleString()}/>
            <InsightRow title="Records Below Threshold" value={belowThreshold.toLocaleString()}/>
            <InsightRow title="Duplicate Records" value={duplicateCount.toLocaleString()}/>
            <InsightRow title="Steward Actions Taken" value={stewardActions.toLocaleString()}/>
          </div>
        </div>

        <div style={{
            border: "1px solid #eee",
            borderRadius: 14,
            padding: 14,
            background: "#fff",
        }}>
          <div style={{ fontSize: 12, opacity: 0.72, marginBottom: 10 }}>
            Connection to Steward Intelligence
          </div>

          <div style={{ display: "grid", gap: 10 }}>
            <InsightRow title="Total Reviewed Matches" value={reviewCount.toLocaleString()}/>
            <InsightRow title="Override Rate" value={`${(overrideRate * 100).toFixed(1)}%`}/>
            <InsightRow title="False Positives" value={falsePositives.toLocaleString()}/>
            <InsightRow title="AI Recommendations Generated" value={(row?.ai_recommendations_generated ?? 0).toLocaleString()}/>
          </div>
        </div>
      </div>

      <div style={{
            marginTop: 14,
            padding: 12,
            borderRadius: 12,
            background: "#fffbeb",
            border: "1px solid #f3e8b5",
            fontSize: 13,
            lineHeight: 1.5,
            color: "#6b7280",
        }}>
        <b style={{ color: "#374151" }}>Why this matters:</b>{" "}
        poor-quality data increases steward intervention, raises review pressure,
        and reduces safe automation readiness. This is where your DQ layer
        directly reinforces the value of AI Data Steward Copilot.
      </div>
    </div>);
}
function SegmentedFunnelBar(props: {
    value: number;
    max: number;
    blocks?: number;
    filledColor?: string;
}) {
    const blocks = props.blocks ?? 18;
    const ratio = props.max > 0 ? props.value / props.max : 0;
    const filled = Math.max(0, Math.min(blocks, Math.round(ratio * blocks)));
    return (<div style={{
            display: "flex",
            gap: 6,
            alignItems: "center",
            flexWrap: "nowrap",
        }}>
      {Array.from({ length: blocks }).map((_, i) => (<div key={i} style={{
                width: 28,
                height: 52,
                borderRadius: 6,
                background: i < filled ? props.filledColor ?? "#4f8cff" : "#e5e7eb",
                boxShadow: i < filled ? "inset 0 1px 0 rgba(255,255,255,0.18)" : "none",
                transition: "all 0.18s ease",
                flex: "0 0 auto",
            }}/>))}
    </div>);
}
function DqDriversBlockingAutomationCard({ row }: {
    row: DqDashboardRow | null;
}) {
    const drivers = [
        {
            key: "duplicate",
            label: "Duplicate Records",
            value: row?.duplicate_record_count ?? 0,
            color: "#4f8cff",
        },
        {
            key: "threshold",
            label: "Records Below Threshold",
            value: row?.records_below_threshold ?? 0,
            color: "#6d9cff",
        },
        {
            key: "critical_high",
            label: "Critical + High Findings",
            value: (row?.critical_findings ?? 0) + (row?.high_findings ?? 0),
            color: "#8ab0ff",
        },
        {
            key: "open",
            label: "Open Findings",
            value: row?.open_findings_count ?? 0,
            color: "#a9c3ff",
        },
    ].sort((a, b) => b.value - a.value);
    const max = Math.max(...drivers.map((d) => d.value), 1);
    const recommendedActions = drivers
        .filter((d) => d.value > 0)
        .slice(0, 3)
        .map((driver) => {
        switch (driver.key) {
            case "duplicate":
                return "Prioritize duplicate record remediation to reduce unnecessary steward review.";
            case "threshold":
                return "Reduce the backlog of below-threshold records to improve automation readiness.";
            case "critical_high":
                return "Resolve critical and high-severity findings first to lower operational risk.";
            case "open":
                return "Work down open findings to remove friction from downstream AI-assisted workflows.";
            default:
                return `Investigate ${driver.label.toLowerCase()} as a blocker to safe automation.`;
        }
    });
    return (<div style={cardStyle("#dbeafe")}>
      <div style={{ fontWeight: 800, fontSize: 18, marginBottom: 8 }}>
        Top Data Quality Drivers Blocking Automation
      </div>

      <div style={{ fontSize: 14, opacity: 0.78, marginBottom: 16 }}>
        Highlights the most material data quality issues reducing safe automation readiness.
      </div>

      <div style={{ display: "grid", gap: 16 }}>
        {drivers.map((driver) => {
            const pctVal = max > 0 ? Math.round((driver.value / max) * 100) : 0;
            return (<div key={driver.label} style={{ display: "grid", gap: 8 }}>
              <div style={{
                    display: "flex",
                    justifyContent: "space-between",
                    gap: 10,
                    alignItems: "center",
                }}>
                <div style={{
                    fontSize: 13,
                    fontWeight: 700,
                    letterSpacing: 0.3,
                    textTransform: "uppercase",
                    color: "#1f2937",
                }}>
                  {driver.label}
                </div>

                <div style={{
                    fontSize: 14,
                    fontWeight: 800,
                    color: "#0f172a",
                    whiteSpace: "nowrap",
                }}>
                  {driver.value.toLocaleString()} ({pctVal}%)
                </div>
              </div>

              <div style={{
                    height: 14,
                    borderRadius: 999,
                    background: "#eef2f7",
                    overflow: "hidden",
                }}>
                <div style={{
                    width: `${pctVal}%`,
                    height: "100%",
                    background: driver.color,
                    borderRadius: 999,
                }}/>
              </div>
            </div>);
        })}
      </div>

      <div style={{
            marginTop: 16,
            padding: 12,
            borderRadius: 12,
            background: "#f8fbff",
            border: "1px solid #dbeafe",
            fontSize: 13,
            lineHeight: 1.5,
            color: "#6b7280",
        }}>
        <b style={{ color: "#374151" }}>Interpretation:</b> these are the most
        material data quality issues constraining low-friction steward handling
        and downstream AI-assisted automation.
      </div>

      <div style={{
            marginTop: 14,
            padding: 12,
            borderRadius: 12,
            background: "#fffdfa",
            border: "1px solid #f3e8b5",
        }}>
        <div style={{
            fontSize: 12,
            fontWeight: 800,
            letterSpacing: 0.5,
            textTransform: "uppercase",
            color: "#8a5a00",
            marginBottom: 8,
        }}>
          Recommended Actions
        </div>

        <div style={{ display: "grid", gap: 8 }}>
          {recommendedActions.length > 0 ? (recommendedActions.map((action, idx) => (<div key={idx} style={{
                padding: "10px 12px",
                borderRadius: 10,
                background: "#ffffff",
                border: "1px solid #f3e8b5",
                fontSize: 13,
                lineHeight: 1.45,
                color: "#4b5563",
            }}>
                <b style={{ color: "#8a5a00", marginRight: 6 }}>{idx + 1}.</b>
                {action}
              </div>))) : (<div style={{
                padding: "10px 12px",
                borderRadius: 10,
                background: "#ffffff",
                border: "1px solid #f3e8b5",
                fontSize: 13,
                lineHeight: 1.45,
                color: "#4b5563",
            }}>
              Current data quality blockers appear limited for the selected lookback window.
            </div>)}
        </div>
      </div>
    </div>);
}
function DqAutomationFunnelCard({ row }: {
    row: DqDashboardRow | null;
}) {
    const totalRecords = row?.total_records ?? 0;
    const dqImpacted = row?.records_with_findings ?? 0;
    const stewardReview = row?.steward_actions_taken ?? 0;
    const automationEligible = Math.max(0, totalRecords - dqImpacted - stewardReview);
    const stages = [
        { label: "TOTAL RECORDS", value: totalRecords, color: "#4f8cff" },
        { label: "RECORDS WITH DQ ISSUES", value: dqImpacted, color: "#6d9cff" },
        {
            label: "RECORDS REQUIRING STEWARD ACTION",
            value: stewardReview,
            color: "#8ab0ff",
        },
        {
            label: "SAFE FOR AI AUTOMATION",
            value: automationEligible,
            color: "#a9c3ff",
        },
    ];
    const max = Math.max(...stages.map((s) => s.value), 1);
    return (<div style={cardStyle("#c7d2fe")}>
      <div style={{ fontWeight: 800, fontSize: 18, marginBottom: 8 }}>
        Data Quality → Automation Readiness Funnel
      </div>

      <div style={{ fontSize: 14, opacity: 0.78, marginBottom: 16 }}>
        Visualizes how data quality issues reduce the volume of records safely eligible for automation.
      </div>

      <div style={{ display: "grid", gap: 22 }}>
        {stages.map((stage) => {
            const pctOfTotal = totalRecords > 0 ? Math.round((stage.value / totalRecords) * 100) : 0;
            return (<div key={stage.label} style={{ display: "grid", gap: 8 }}>
              <div style={{
                    fontSize: 13,
                    color: "#1f2937",
                    fontWeight: 800,
                    letterSpacing: 0.4,
                    textTransform: "uppercase",
                }}>
                {stage.label}
              </div>

              <div style={{
                    fontSize: 14,
                    fontWeight: 800,
                    color: "#0f172a",
                }}>
                {stage.value.toLocaleString()} ({pctOfTotal}%)
              </div>

              <SegmentedFunnelBar value={stage.value} max={max} blocks={18} filledColor={stage.color}/>
            </div>);
        })}
      </div>

      <div style={{
            marginTop: 14,
            padding: 12,
            borderRadius: 12,
            background: "#f8fbff",
            border: "1px solid #dbeafe",
            fontSize: 13,
            lineHeight: 1.5,
            color: "#6b7280",
        }}>
        <b style={{ color: "#374151" }}>Interpretation:</b> as data quality issues rise, fewer records remain safe for low-friction steward handling and downstream AI-assisted automation.
      </div>
    </div>);
}
function DeltaRow(props: {
    label: string;
    before: number | string;
    after: number | string;
    delta: number | string;
}) {
    return (<div style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            fontSize: 13,
            padding: "6px 0",
        }}>
      <div style={{ color: "#374151", fontWeight: 600 }}>{props.label}</div>

      <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
        <span style={{ opacity: 0.7 }}>{props.before}</span>
        <span style={{ fontWeight: 700 }}>→</span>
        <span style={{ fontWeight: 800 }}>{props.after}</span>
        <span style={{
            marginLeft: 6,
            fontWeight: 700,
            color: "#16a34a",
        }}>
          ({props.delta})
        </span>
      </div>
    </div>);
}
function calculateDqAutomationProjection(
    row: DqDashboardRow | null,
    stewardData: MetricsOverviewResponse | null,
) {
    const duplicateCount = row?.duplicate_record_count ?? 0;
    const belowThreshold = row?.records_below_threshold ?? 0;
    const openFindings = row?.open_findings_count ?? 0;
    const currentReadiness = Math.round(
        row?.automation_readiness_score ?? 0
    );
    const currentReviewed = stewardData?.total_reviewed ?? 0;

    const duplicateReductionPct = 25;
    const thresholdReductionPct = 20;
    const findingsReductionPct = 15;

    const duplicateReductionCount = Math.round(
        duplicateCount * (duplicateReductionPct / 100)
    );
    const thresholdReductionCount = Math.round(
        belowThreshold * (thresholdReductionPct / 100)
    );
    const findingsReductionCount = Math.round(
        openFindings * (findingsReductionPct / 100)
    );

    const modeledReviewOpportunity =
        duplicateReductionCount +
        Math.round(thresholdReductionCount * 0.5) +
        Math.round(findingsReductionCount * 0.4);

    const reviewsAvoided = Math.min(
        currentReviewed,
        Math.max(0, modeledReviewOpportunity)
    );

    const avgMinutesPerReview = 3;
    const currentReviewHours =
        (currentReviewed * avgMinutesPerReview) / 60;
    const projectedReviewed = Math.max(
        0,
        currentReviewed - reviewsAvoided
    );
    const projectedReviewHours =
        (projectedReviewed * avgMinutesPerReview) / 60;
    const hoursSaved = Math.max(
        0,
        currentReviewHours - projectedReviewHours
    );

    const readinessGain = Math.min(
        18,
        Math.round(
            duplicateReductionPct * 0.12 +
            thresholdReductionPct * 0.18 +
            findingsReductionPct * 0.1
        )
    );
    const projectedReadiness = Math.min(
        100,
        currentReadiness + readinessGain
    );

    const reviewReductionPct =
        currentReviewed > 0
            ? Math.min(
                100,
                Math.round(
                    (reviewsAvoided / currentReviewed) * 100
                )
            )
            : 0;

    return {
        duplicateReductionPct,
        thresholdReductionPct,
        findingsReductionPct,
        currentReadiness,
        projectedReadiness,
        readinessGain,
        currentReviewed,
        projectedReviewed,
        reviewsAvoided,
        currentReviewHours,
        projectedReviewHours,
        hoursSaved,
        reviewReductionPct,
    };
}

function DqWorkloadReductionSimulatorCard(props: {
    row: DqDashboardRow | null;
    stewardData: MetricsOverviewResponse | null;
}) {
    const projection = calculateDqAutomationProjection(
        props.row,
        props.stewardData,
    );

    const {
        duplicateReductionPct,
        thresholdReductionPct,
        findingsReductionPct,
        currentReadiness,
        projectedReadiness,
        readinessGain,
        currentReviewed,
        projectedReviewed,
        reviewsAvoided,
        currentReviewHours,
        projectedReviewHours,
        hoursSaved,
        reviewReductionPct,
    } = projection;
    return (<div style={{
            ...cardStyle("#dcfce7"),
            background: "linear-gradient(180deg, #ffffff 0%, #f8fff9 100%)",
        }}>
      <div style={{ fontWeight: 800, fontSize: 18, marginBottom: 8 }}>
        Steward Workload Reduction Simulator
      </div>

      <div style={{ fontSize: 14, opacity: 0.78, marginBottom: 16 }}>
        Simulates the operational upside of reducing key data quality blockers.
      </div>

      <div style={{
            display: "grid",
            gridTemplateColumns: "1.1fr 0.9fr",
            gap: 16,
        }}>
        <div style={{
            border: "1px solid #e5e7eb",
            borderRadius: 14,
            padding: 14,
            background: "#fff",
        }}>
          <div style={{
            fontSize: 12,
            fontWeight: 800,
            letterSpacing: 0.4,
            textTransform: "uppercase",
            color: "#166534",
            marginBottom: 10,
        }}>
            Improvement Scenario
          </div>

          <div style={{ display: "grid", gap: 10 }}>
            <InsightRow title="Reduce Duplicate Records" value={`${duplicateReductionPct}%`}/>
            <InsightRow title="Reduce Below-Threshold Records" value={`${thresholdReductionPct}%`}/>
            <InsightRow title="Reduce Open Findings" value={`${findingsReductionPct}%`}/>
          </div>
        </div>

        <div style={{
            border: "1px solid #bbf7d0",
            borderRadius: 14,
            padding: 14,
            background: "#f0fdf4",
        }}>
          <div style={{
            fontSize: 12,
            fontWeight: 800,
            letterSpacing: 0.4,
            textTransform: "uppercase",
            color: "#166534",
            marginBottom: 10,
        }}>
            Projected Impact
          </div>

          <div style={{
            marginTop: 12,
            borderTop: "1px solid #e5e7eb",
            paddingTop: 10,
            display: "grid",
            gap: 6,
        }}>
            <DeltaRow label="Automation Readiness" before={Math.round(currentReadiness)} after={projectedReadiness} delta={`+${readinessGain}`}/>

            <DeltaRow label="Steward Reviews" before={currentReviewed} after={projectedReviewed} delta={`-${reviewsAvoided}`}/>

            <DeltaRow label="Steward Hours" before={currentReviewHours.toFixed(1)} after={projectedReviewHours.toFixed(1)} delta={`-${hoursSaved.toFixed(1)}`}/>
          </div>

          <div style={{ display: "grid", gap: 10, marginTop: 12 }}>
            <InsightRow title="Reviews Avoided" value={reviewsAvoided.toLocaleString()}/>
            <InsightRow title="Hours Saved" value={`${hoursSaved.toFixed(1)} hrs`}/>
            <InsightRow title="Review Queue Reduction" value={`${reviewReductionPct}%`}/>
            <InsightRow title="Projected Readiness" value={`${projectedReadiness}/100`}/>
          </div>
        </div>
      </div>

      <div style={{
            marginTop: 14,
            padding: 12,
            borderRadius: 12,
            background: "#f0fdf4",
            border: "1px solid #bbf7d0",
            fontSize: 13,
            lineHeight: 1.5,
            color: "#4b5563",
        }}>
        <b style={{ color: "#166534" }}>Simulation summary:</b> modest improvement in duplicates, threshold quality, and open findings could avoid <b>{reviewsAvoided}</b> steward reviews, save about{" "}
        <b>{hoursSaved.toFixed(1)} hours</b>, and raise automation readiness from{" "}
        <b>{Math.round(currentReadiness)}</b> to <b>{projectedReadiness}</b>.
      </div>
    </div>);
}
function TrajectoryBar({ value, max = 100, blocks = 20, }: {
    value: number;
    max?: number;
    blocks?: number;
}) {
    const filled = Math.max(0, Math.min(blocks, Math.round((value / max) * blocks)));
    return (<div style={{ display: "flex", gap: 4, flexWrap: "nowrap" }}>
      {Array.from({ length: blocks }).map((_, i) => (<div key={i} style={{
                width: 16,
                height: 32,
                borderRadius: 4,
                background: i < filled ? "#4f8cff" : "#e5e7eb",
                boxShadow: i < filled ? "inset 0 1px 0 rgba(255,255,255,0.18)" : "none",
                transition: "all 0.18s ease",
                flex: "0 0 auto",
            }}/>))}
    </div>);
}
function AutomationReadinessTrajectoryCard(props: {
    currentReadiness: number;
    projectedReadiness: number;
}) {
    const { currentReadiness, projectedReadiness } = props;
    const steps = [
        currentReadiness,
        Math.round(currentReadiness + (projectedReadiness - currentReadiness) * 0.4),
        Math.round(currentReadiness + (projectedReadiness - currentReadiness) * 0.7),
        projectedReadiness,
    ];
    const labels = ["Current", "+30d", "+60d", "+90d"];
    return (<div style={cardStyle("#dbeafe")}>
      <div style={{ fontWeight: 800, fontSize: 18, marginBottom: 6 }}>
        Automation Readiness Trajectory
      </div>

      <div style={{ fontSize: 14, opacity: 0.75, marginBottom: 18 }}>
        Forecasts how automation readiness improves as high-impact data quality
        issues are remediated.
      </div>

      <div style={{ display: "grid", gap: 18, marginBottom: 14 }}>
        {steps.map((value, i) => (<div key={labels[i]} style={{ display: "grid", gap: 8 }}>
            <div style={{
                fontSize: 12,
                fontWeight: 800,
                letterSpacing: 0.4,
                textTransform: "uppercase",
                color: "#1f2937",
            }}>
              {labels[i]}
            </div>

            <div style={{
                fontSize: 14,
                fontWeight: 800,
                color: "#0f172a",
            }}>
              {value}%
            </div>

            <TrajectoryBar value={value}/>
          </div>))}
      </div>

      <div style={{
            padding: 12,
            borderRadius: 12,
            background: "#f8fbff",
            border: "1px solid #e5e7eb",
            fontSize: 13,
            lineHeight: 1.5,
            color: "#4b5563",
        }}>
        <b style={{ color: "#374151" }}>Projection insight:</b>{" "}
        if current data quality remediation continues, automation readiness
        could increase from <b>{currentReadiness}%</b> to{" "}
        <b>{projectedReadiness}%</b> within the next 90 days.
      </div>
    </div>);
}

function ProjectedAutomationUpliftCard(props: {
    row: DqDashboardRow | null;
    stewardData: MetricsOverviewResponse | null;
}) {
    const projection = calculateDqAutomationProjection(
        props.row,
        props.stewardData,
    );

    const {
        currentReadiness,
        projectedReadiness,
        readinessGain,
        reviewsAvoided,
        hoursSaved,
        reviewReductionPct: queueReduction,
    } = projection;
    const confidenceLabel = readinessGain >= 10 ? "High" : readinessGain >= 6 ? "Moderate" : "Early";
    const confidenceColor = readinessGain >= 10 ? "#16a34a" : readinessGain >= 6 ? "#d97706" : "#6b7280";
    return (<div style={{
            ...cardStyle("#dbeafe"),
            height: "100%",
            background: "linear-gradient(180deg, #ffffff 0%, #f8fbff 100%)",
        }}>
      <div style={{ fontWeight: 800, fontSize: 18, marginBottom: 8 }}>
        Projected Automation Uplift
      </div>

      <div style={{ fontSize: 14, opacity: 0.78, marginBottom: 16 }}>
        Summarizes the expected operational and automation upside over the next
        90 days if current remediation momentum continues.
      </div>

      <div style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: 12,
            marginBottom: 14,
        }}>
        <ImpactStat label="Readiness Gain" value={`+${readinessGain} pts`}/>
        <ImpactStat label="Projected Readiness" value={`${projectedReadiness}/100`}/>
        <ImpactStat label="Reviews Avoided" value={reviewsAvoided}/>
        <ImpactStat label="Hours Saved" value={`${hoursSaved.toFixed(1)} hrs`}/>
      </div>

      <div style={{ display: "grid", gap: 10 }}>
        <InsightRow title="Review Queue Reduction" value={`${queueReduction}%`}/>
        <InsightRow title="Confidence" value={confidenceLabel}/>
        <InsightRow title="Forecast Horizon" value="90 days"/>
      </div>

      <div style={{
            marginTop: 14,
            padding: 12,
            borderRadius: 12,
            background: "#ffffff",
            border: "1px solid #e5e7eb",
        }}>
        <div style={{
            fontSize: 12,
            fontWeight: 800,
            letterSpacing: 0.4,
            textTransform: "uppercase",
            color: "#1f2937",
            marginBottom: 8,
        }}>
          Outlook Signal
        </div>

        <div style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 8,
            padding: "8px 10px",
            borderRadius: 999,
            background: "#f8fafc",
            border: "1px solid #e5e7eb",
            fontSize: 12,
            fontWeight: 700,
            color: confidenceColor,
            marginBottom: 10,
        }}>
          <span style={{
            width: 8,
            height: 8,
            borderRadius: "50%",
            background: confidenceColor,
            display: "inline-block",
        }}/>
          {confidenceLabel} projected uplift
        </div>

        <div style={{
            fontSize: 13,
            lineHeight: 1.5,
            color: "#4b5563",
        }}>
          If current data quality remediation continues, AI Data Steward
          Copilot could help raise automation readiness from{" "}
          <b>{currentReadiness}</b> to <b>{projectedReadiness}</b>,
          while reducing operational friction and improving readiness
          for higher-value automated workflows.
        </div>
      </div>
    </div>);
}

function normalizeRuleConfidence(value: number | null | undefined): number {
    if (value === null || value === undefined || Number.isNaN(value))
        return 0;
    const percentage = value <= 1 ? value * 100 : value;
    return Math.max(0, Math.min(100, Math.round(percentage)));
}
function dqRuleTone(value?: string) {
    const normalized = String(value ?? "").toUpperCase();
    if (normalized === "CRITICAL") {
        return {
            color: "#991b1b",
            background: "#fee2e2",
            border: "#fecaca",
            accent: "#dc2626",
        };
    }
    if (normalized === "HIGH") {
        return {
            color: "#9a3412",
            background: "#ffedd5",
            border: "#fed7aa",
            accent: "#f97316",
        };
    }
    if (normalized === "MEDIUM") {
        return {
            color: "#92400e",
            background: "#fef3c7",
            border: "#fde68a",
            accent: "#f59e0b",
        };
    }
    return {
        color: "#166534",
        background: "#dcfce7",
        border: "#bbf7d0",
        accent: "#22c55e",
    };
}
function DqRuleConfidenceMeter({ confidence }: {
    confidence: number;
}) {
    const normalized = normalizeRuleConfidence(confidence);
    const activeSegments = Math.round((normalized / 100) * 14);
    return (<div style={{ minWidth: 230 }}>
      <div style={{
            fontSize: 11,
            fontWeight: 900,
            letterSpacing: 0.65,
            textTransform: "uppercase",
            color: "#475569",
            marginBottom: 9,
        }}>
        AI Rule Confidence
      </div>

      <div style={{
            display: "grid",
            gridTemplateColumns: "repeat(14, minmax(0, 1fr))",
            gap: 4,
        }}>
        {Array.from({ length: 14 }).map((_, index) => (<div key={index} style={{
                height: 27,
                borderRadius: 4,
                background: index < activeSegments
                    ? "linear-gradient(180deg, #2563eb 0%, #7c3aed 100%)"
                    : "#e2e8f0",
                boxShadow: index < activeSegments
                    ? "0 0 8px rgba(79,70,229,0.22)"
                    : "none",
            }}/>))}
      </div>

      <div style={{
            marginTop: 10,
            display: "flex",
            alignItems: "baseline",
            gap: 9,
        }}>
        <div style={{
            fontSize: 30,
            fontWeight: 900,
            color: "#1e293b",
        }}>
          {normalized}%
        </div>

        <div style={{
            fontSize: 11,
            fontWeight: 900,
            color: normalized >= 85 ? "#15803d" : "#b45309",
            letterSpacing: 0.5,
            textTransform: "uppercase",
        }}>
          {normalized >= 85 ? "High confidence" : "Moderate confidence"}
        </div>
      </div>
    </div>);
}
function AiDqRuleEngineeringAssistant(props: {
    response: DqRuleSuggestionsResponse | null;
}) {
    const [expandedRuleId, setExpandedRuleId] = useState<string | null>(null);
    const response = props.response;
    const suggestions = response?.ai_rule_suggestions;
    if (!suggestions)
        return null;

    if (!suggestions.suggested_rules?.length) {
  return (
    <div
      style={{
        ...cardStyle("#dbeafe"),
        marginTop: 22,
        background:
          "linear-gradient(180deg, #ffffff 0%, #f8fbff 100%)",
      }}
    >
      <div
        style={{
          fontSize: 16,
          fontWeight: 800,
          color: "#1e3a5f",
          marginBottom: 6,
        }}
      >
        AI Data Quality Recommendations
      </div>

      <div
        style={{
          fontSize: 13,
          color: "#64748b",
          lineHeight: 1.5,
        }}
      >
        No additional DQ rule recommendations were generated
        for the selected lookback period.
      </div>
    </div>
  );
}
    const priorityTone = dqRuleTone(suggestions.priority);
    const totalAutomationGain = suggestions.suggested_rules.reduce((total, rule) => total + (rule.estimated_automation_gain_points ?? 0), 0);
    return (<section style={{
            marginTop: 26,
            borderRadius: 22,
            overflow: "hidden",
            border: "1px solid #c7d2fe",
            borderLeft: "6px solid #2563eb",
            background: "linear-gradient(135deg, #ffffff 0%, #f8faff 52%, #f5f3ff 100%)",
            boxShadow: "0 22px 55px rgba(30,64,175,0.10), 0 4px 18px rgba(79,70,229,0.06)",
        }}>
      {/* Premium header */}
      <div style={{
            padding: "22px 24px",
            display: "grid",
            gridTemplateColumns: "minmax(0, 1fr) auto",
            gap: 24,
            alignItems: "start",
            borderBottom: "1px solid #e0e7ff",
        }}>
        <div style={{ display: "flex", gap: 16, minWidth: 0 }}>
          <div style={{
            width: 52,
            height: 52,
            borderRadius: 16,
            display: "grid",
            placeItems: "center",
            flexShrink: 0,
            color: "#ffffff",
            fontSize: 17,
            fontWeight: 900,
            background: "linear-gradient(145deg, #2563eb 0%, #4f46e5 52%, #7c3aed 100%)",
            boxShadow: "0 12px 24px rgba(79,70,229,0.25)",
        }}>
            DQ
          </div>

          <div style={{ minWidth: 0 }}>
            <div style={{
            fontSize: 12,
            fontWeight: 900,
            color: "#4f46e5",
            letterSpacing: 0.75,
            textTransform: "uppercase",
        }}>
              AI Data Quality Rule Engineering Assistant
            </div>

            <h2 style={{
            margin: "6px 0 7px",
            fontSize: 23,
            lineHeight: 1.2,
            color: "#172033",
        }}>
              {suggestions.headline}
            </h2>

            <div style={{
            maxWidth: 880,
            fontSize: 14,
            lineHeight: 1.65,
            color: "#526176",
        }}>
              {suggestions.summary}
            </div>
          </div>
        </div>

        <div style={{
            display: "flex",
            gap: 8,
            justifyContent: "flex-end",
            flexWrap: "wrap",
        }}>
          <span style={{
            padding: "7px 11px",
            borderRadius: 999,
            fontSize: 11,
            fontWeight: 900,
            color: priorityTone.color,
            background: priorityTone.background,
            border: `1px solid ${priorityTone.border}`,
        }}>
            {suggestions.priority} PRIORITY
          </span>

          <span style={{
            padding: "7px 11px",
            borderRadius: 999,
            fontSize: 11,
            fontWeight: 900,
            color: "#3730a3",
            background: "#eef2ff",
            border: "1px solid #c7d2fe",
        }}>
            {suggestions.rule_strategy}
          </span>
        </div>
      </div>

      {/* Executive intelligence strip */}
      <div style={{
            padding: "18px 24px",
            display: "grid",
            gridTemplateColumns: "minmax(0, 1fr) 260px",
            gap: 24,
            alignItems: "center",
            borderBottom: "1px solid #e0e7ff",
        }}>
        <div>
          <div style={{
            fontSize: 11,
            fontWeight: 900,
            letterSpacing: 0.6,
            textTransform: "uppercase",
            color: "#475569",
            marginBottom: 11,
        }}>
            AI Engineering Summary
          </div>

          <div style={{
            display: "grid",
            gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
            gap: 10,
        }}>
            <div style={dqRuleSummaryTileStyle}>
              <span style={dqRuleSummaryLabelStyle}>Rules Proposed</span>
              <strong style={dqRuleSummaryValueStyle}>
                {suggestions.suggested_rules.length}
              </strong>
            </div>

            <div style={dqRuleSummaryTileStyle}>
              <span style={dqRuleSummaryLabelStyle}>Automation Gain</span>
              <strong style={dqRuleSummaryValueStyle}>
                +{totalAutomationGain} pts
              </strong>
            </div>

            <div style={dqRuleSummaryTileStyle}>
              <span style={dqRuleSummaryLabelStyle}>Target Domain</span>
              <strong style={{ ...dqRuleSummaryValueStyle, fontSize: 16 }}>
                {response?.domain ?? "GENERAL"}
              </strong>
            </div>
          </div>
        </div>

        <DqRuleConfidenceMeter confidence={suggestions.confidence}/>
      </div>

      {/* Rule recommendation cards */}
      <div style={{ padding: 24 }}>
        <div style={{
            fontSize: 12,
            fontWeight: 900,
            letterSpacing: 0.7,
            textTransform: "uppercase",
            color: "#334155",
            marginBottom: 13,
        }}>
          Recommended Rule Sequence
        </div>

        <div style={{ display: "grid", gap: 14 }}>
          {suggestions.suggested_rules.map((rule, index) => {
            const tone = dqRuleTone(rule.severity);
            const expanded = expandedRuleId === rule.rule_id;
            const ruleConfidence = normalizeRuleConfidence(rule.confidence);
            return (<article key={rule.rule_id} style={{
                    borderRadius: 17,
                    border: "1px solid #dbe3f0",
                    background: "rgba(255,255,255,0.92)",
                    overflow: "hidden",
                    boxShadow: "0 8px 22px rgba(15,23,42,0.045)",
                }}>
                <div style={{
                    display: "grid",
                    gridTemplateColumns: "42px minmax(0, 1fr) auto",
                    gap: 14,
                    alignItems: "start",
                    padding: 17,
                }}>
                  <div style={{
                    width: 38,
                    height: 38,
                    borderRadius: 12,
                    display: "grid",
                    placeItems: "center",
                    fontWeight: 900,
                    color: "#4338ca",
                    background: "#eef2ff",
                    border: "1px solid #c7d2fe",
                }}>
                    {index + 1}
                  </div>

                  <div style={{ minWidth: 0 }}>
                    <div style={{
                    display: "flex",
                    gap: 7,
                    flexWrap: "wrap",
                    marginBottom: 7,
                }}>
                      <span style={{
                    padding: "4px 8px",
                    borderRadius: 999,
                    fontSize: 10,
                    fontWeight: 900,
                    color: tone.color,
                    background: tone.background,
                    border: `1px solid ${tone.border}`,
                }}>
                        {rule.severity}
                      </span>

                      <span style={dqNeutralBadgeStyle}>{rule.dimension}</span>
                      <span style={dqNeutralBadgeStyle}>{rule.rule_type}</span>
                      <span style={dqNeutralBadgeStyle}>
                        {rule.implementation_target}
                      </span>
                    </div>

                    <div style={{
                    fontSize: 17,
                    fontWeight: 900,
                    color: "#172033",
                }}>
                      {rule.rule_name}
                    </div>

                    <div style={{
                    marginTop: 6,
                    fontSize: 13,
                    color: "#526176",
                    lineHeight: 1.55,
                }}>
                      {rule.description}
                    </div>
                  </div>

                  <div style={{ textAlign: "right", minWidth: 115 }}>
                    <div style={{
                    fontSize: 11,
                    color: "#64748b",
                    fontWeight: 800,
                }}>
                      Confidence
                    </div>
                    <div style={{
                    marginTop: 2,
                    fontSize: 20,
                    color: "#4338ca",
                    fontWeight: 900,
                }}>
                      {ruleConfidence}%
                    </div>
                  </div>
                </div>

                <div style={{
                    padding: "0 17px 17px 73px",
                    display: "grid",
                    gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
                    gap: 10,
                }}>
                  <div style={dqRuleDetailTileStyle}>
                    <span style={dqRuleDetailLabelStyle}>Why AI suggested it</span>
                    <span style={dqRuleDetailTextStyle}>{rule.rationale}</span>
                  </div>

                  <div style={dqRuleDetailTileStyle}>
                    <span style={dqRuleDetailLabelStyle}>Business risk</span>
                    <span style={dqRuleDetailTextStyle}>
                      {rule.business_risk}
                    </span>
                  </div>

                  <div style={dqRuleDetailTileStyle}>
                    <span style={dqRuleDetailLabelStyle}>Expected impact</span>
                    <span style={dqRuleDetailTextStyle}>
                      {rule.expected_impact}
                    </span>
                  </div>
                </div>

                <div style={{
                    padding: "12px 17px",
                    display: "flex",
                    justifyContent: "space-between",
                    gap: 12,
                    alignItems: "center",
                    borderTop: "1px solid #eef2f7",
                    background: "#fbfcff",
                }}>
                  <div style={{
                    fontSize: 12,
                    color: "#475569",
                }}>
                    Estimated automation readiness gain:{" "}
                    <b style={{ color: "#166534" }}>
                      +{rule.estimated_automation_gain_points} points
                    </b>
                  </div>

                  <button type="button" onClick={() => setExpandedRuleId(expanded ? null : rule.rule_id)} style={{
                    padding: "7px 11px",
                    borderRadius: 999,
                    border: "1px solid #c7d2fe",
                    background: "#ffffff",
                    color: "#4338ca",
                    fontSize: 11,
                    fontWeight: 900,
                    cursor: "pointer",
                }}>
                    {expanded ? "Hide rule logic" : "View rule logic"}
                  </button>
                </div>

                {expanded && (<div style={{
                        padding: 17,
                        borderTop: "1px solid #e0e7ff",
                        background: "linear-gradient(180deg, #f8faff 0%, #ffffff 100%)",
                    }}>
                    <div style={{
                        fontSize: 11,
                        fontWeight: 900,
                        color: "#4338ca",
                        textTransform: "uppercase",
                        letterSpacing: 0.6,
                        marginBottom: 8,
                    }}>
                      Platform-neutral rule logic
                    </div>

                    <pre style={dqCodeBlockStyle}>{rule.rule_logic}</pre>

                    {rule.sql_example && (<>
                        <div style={{
                            marginTop: 14,
                            fontSize: 11,
                            fontWeight: 900,
                            color: "#4338ca",
                            textTransform: "uppercase",
                            letterSpacing: 0.6,
                            marginBottom: 8,
                        }}>
                          Illustrative SQL
                        </div>

                        <pre style={dqCodeBlockStyle}>
                          {rule.sql_example}
                        </pre>
                      </>)}
                  </div>)}
              </article>);
        })}
        </div>
      </div>

      <div style={{
            padding: "14px 24px",
            borderTop: "1px solid #e0e7ff",
            display: "flex",
            justifyContent: "space-between",
            gap: 14,
            flexWrap: "wrap",
            fontSize: 12,
            color: "#64748b",
        }}>
        <span>
          Generated by {response?.model_provider ?? "AI"} from current DQ,
          stewardship, rule-coverage, and automation signals.
        </span>

        <span>
          {response?.generated_at
            ? new Date(response.generated_at).toLocaleString()
            : ""}
        </span>
      </div>
    </section>);
}
const dqRuleSummaryTileStyle: React.CSSProperties = {
    padding: 12,
    borderRadius: 13,
    border: "1px solid #e0e7ff",
    background: "rgba(255,255,255,0.85)",
    display: "grid",
    gap: 5,
};
const dqRuleSummaryLabelStyle: React.CSSProperties = {
    fontSize: 11,
    color: "#64748b",
    fontWeight: 700,
};
const dqRuleSummaryValueStyle: React.CSSProperties = {
    fontSize: 21,
    color: "#172033",
    fontWeight: 900,
};
const dqNeutralBadgeStyle: React.CSSProperties = {
    padding: "4px 8px",
    borderRadius: 999,
    fontSize: 10,
    fontWeight: 900,
    color: "#475569",
    background: "#f8fafc",
    border: "1px solid #e2e8f0",
};
const dqRuleDetailTileStyle: React.CSSProperties = {
    padding: 12,
    borderRadius: 12,
    background: "#f8fafc",
    border: "1px solid #e2e8f0",
    display: "grid",
    gap: 5,
};
const dqRuleDetailLabelStyle: React.CSSProperties = {
    fontSize: 10,
    fontWeight: 900,
    color: "#64748b",
    letterSpacing: 0.45,
    textTransform: "uppercase",
};
const dqRuleDetailTextStyle: React.CSSProperties = {
    fontSize: 12,
    color: "#334155",
    lineHeight: 1.5,
};
const dqCodeBlockStyle: React.CSSProperties = {
    margin: 0,
    padding: 13,
    borderRadius: 12,
    overflowX: "auto",
    whiteSpace: "pre-wrap",
    overflowWrap: "anywhere",
    fontSize: 12,
    lineHeight: 1.55,
    color: "#e2e8f0",
    background: "#111827",
    border: "1px solid #273449",
};

function ApprovedRemediationArtifact({
  recommendation,
}: {
  recommendation: DqApprovedRecommendationResponse;
}) {
  const approved = recommendation;

  const artifactType = String(
    approved.remediation_artifact_type || "",
  )
    .trim()
    .toUpperCase();

  const sql = approved.remediation_sql?.trim() || "";
  const regex = approved.remediation_regex?.trim() || "";
  const reasoning =
    approved.remediation_reasoning_summary?.trim() ||
    approved.reasoning_summary?.trim() ||
    "";

  const versionNumber =
    approved.remediation_version_number ??
    approved.version_number ??
    null;

  const sqlDialect =
    approved.remediation_sql_dialect ||
    approved.sql_dialect ||
    null;

    const hasSqlArtifact =
    artifactType === "SQL" && Boolean(sql);

  const hasRegexArtifact =
    artifactType === "REGEX" && Boolean(regex);

  const isManualReview =
    artifactType === "MANUAL_REVIEW";

  const sourceType = String(
    approved.source_type || "",
  )
    .trim()
    .toUpperCase();

  const sourceLabel =
    sourceType === "ONEDRIVE" ||
    sourceType === "ONEDRIVE_EXCEL" ||
    sourceType === "MICROSOFT_ONEDRIVE"
      ? "ONEDRIVE EXCEL"
      : sourceType === "GOOGLE" ||
          sourceType === "GOOGLE_SHEETS" ||
          sourceType === "GOOGLESHEETS"
        ? "GOOGLE SHEETS"
        : sourceType || null;

  const artifactPlatformLabel =
    hasSqlArtifact
      ? sqlDialect
      : hasRegexArtifact
        ? sourceLabel
        : null;

  const hasArtifact =
    hasSqlArtifact ||
    hasRegexArtifact ||
    isManualReview;

  if (!hasArtifact) {
    return (
      <div
        style={{
          marginTop: 12,
          padding: 12,
          borderRadius: 12,
          border: "1px solid #e2e8f0",
          background: "#f8fafc",
          color: "#64748b",
          fontSize: 12,
          lineHeight: 1.5,
        }}
      >
        Approved remediation artifact details are not available
        in this queue response.
      </div>
    );
  }

  return (
    <div
      style={{
        marginTop: 14,
        padding: 14,
        borderRadius: 14,
        border: "1px solid #dbe7df",
        background: "#fbfffc",
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          gap: 12,
          alignItems: "center",
          flexWrap: "wrap",
          marginBottom: 10,
        }}
      >
        <div
          style={{
            fontSize: 13,
            fontWeight: 850,
            color: "#166534",
          }}
        >
          Approved Remediation Artifact
        </div>

        <div
          style={{
            display: "flex",
            gap: 8,
            flexWrap: "wrap",
            alignItems: "center",
          }}
        >
          {versionNumber !== null && (
            <span
              style={{
                padding: "4px 8px",
                borderRadius: 999,
                border: "1px solid #bbf7d0",
                background: "#f0fdf4",
                color: "#166534",
                fontSize: 10,
                fontWeight: 850,
              }}
            >
              VERSION {versionNumber}
            </span>
          )}

          {artifactPlatformLabel && (
            <span
              style={{
                padding: "4px 8px",
                borderRadius: 999,
                border: "1px solid #dbeafe",
                background: "#eff6ff",
                color: "#1d4ed8",
                fontSize: 10,
                fontWeight: 850,
              }}
            >
            {String(artifactPlatformLabel,).toUpperCase()}
            </span>
          )}
        </div>
      </div>

      {hasSqlArtifact && (
        <>
          <div
            style={{
              fontSize: 11,
              fontWeight: 850,
              color: "#475569",
              marginBottom: 6,
              textTransform: "uppercase",
              letterSpacing: 0.45,
            }}
          >
            Approved SQL
          </div>

          <pre
            style={{
              margin: 0,
              padding: 13,
              borderRadius: 12,
              overflowX: "auto",
              whiteSpace: "pre-wrap",
              overflowWrap: "anywhere",
              fontSize: 12,
              lineHeight: 1.55,
              color: "#e2e8f0",
              background: "#111827",
              border: "1px solid #273449",
            }}
          >
            {sql}
          </pre>
        </>
      )}

      {hasRegexArtifact && (
        <>
          <div
            style={{
              fontSize: 11,
              fontWeight: 850,
              color: "#475569",
              marginBottom: 6,
              textTransform: "uppercase",
              letterSpacing: 0.45,
            }}
          >
            Approved Regex
          </div>

          <code
            style={{
              display: "block",
              padding: 12,
              borderRadius: 12,
              border: "1px solid #dbeafe",
              background: "#f8fbff",
              color: "#172033",
              fontSize: 12,
              lineHeight: 1.5,
              overflowWrap: "anywhere",
            }}
          >
            {regex}
          </code>
        </>
      )}

      {isManualReview && (
        <div
          style={{
            padding: 12,
            borderRadius: 12,
            border: "1px solid #fde68a",
            background: "#fffbeb",
            color: "#92400e",
            fontSize: 12,
            lineHeight: 1.55,
          }}
        >
          <div
            style={{
              fontWeight: 850,
              marginBottom: reasoning ? 6 : 0,
            }}
          >
            Manual Review Required
          </div>

          {reasoning &&
            reasoning}
        </div>
      )}

      {(hasSqlArtifact || hasRegexArtifact) && reasoning && (
        <div
          style={{
            marginTop: 10,
            fontSize: 12,
            color: "#64748b",
            lineHeight: 1.5,
          }}
        >
          <b style={{ color: "#334155" }}>Why this fix:</b>{" "}
          {reasoning}
        </div>
      )}
    </div>
  );
}

type BillingExecutionEntitlements = {
  steward_intelligence_enabled: boolean;
  governed_sql_execution_enabled: boolean;
};

const EXECUTION_ENVIRONMENTS = new Set([
  "DEV",
  "DEVELOPMENT",
  "STG",
  "STAGE",
  "STAGING",
]);

const EXECUTION_VENDORS = new Set([
  "SNOWFLAKE",
  "DATABRICKS",
  "BIGQUERY",
  "GOOGLE",
  "GOOGLE_SHEETS",
  "ONEDRIVE",
  "MICROSOFT",
  "MICROSOFT_ONEDRIVE",
  "SHAREPOINT",
  "AZURE_SQL",
]);

const EXECUTION_CAPABILITIES = new Set([
  "EXECUTE_DQ_REMEDIATION",
  "EXECUTE_SQL",
  "WRITE_DATA",
]);

function normalizeExecutionEnvironment(value?: string | null): "DEV" | "STG" | null {
  const environment = String(value || "").trim().toUpperCase();

  if (environment === "DEV" || environment === "DEVELOPMENT") {
    return "DEV";
  }

  if (
    environment === "STG" ||
    environment === "STAGE" ||
    environment === "STAGING"
  ) {
    return "STG";
  }

  return null;
}

function isEligibleExecutionConnection(
  connection: EnterpriseConnection,
): boolean {
  const environment = String(connection.environment || "")
    .trim()
    .toUpperCase();

  const vendor = String(connection.vendor || "")
    .trim()
    .toUpperCase();

  const capabilities = new Set(
    (connection.connection_capabilities || [])
      .map((value) => String(value || "").trim().toUpperCase())
      .filter(Boolean),
  );

  const hasExecutionCapability = [...EXECUTION_CAPABILITIES].some(
    (capability) => capabilities.has(capability),
  );

  const isSqlVendor = new Set([
    "SNOWFLAKE",
    "DATABRICKS",
    "BIGQUERY",
    "AZURE_SQL",
  ]).has(vendor);

  return (
    connection.is_active === true &&
    String(connection.health_status || "").trim().toUpperCase() === "HEALTHY" &&
    EXECUTION_ENVIRONMENTS.has(environment) &&
    EXECUTION_VENDORS.has(vendor) &&
    (!isSqlVendor || hasExecutionCapability)
  );
}

function isConnectionCompatibleWithSource(
  connection: EnterpriseConnection,
  sourceType: string,
): boolean {
  const vendor = String(connection.vendor || "").trim().toUpperCase();

  if (sourceType === "GOOGLE_SHEETS") {
    return vendor === "GOOGLE" || vendor === "GOOGLE_SHEETS";
  }

  if (sourceType === "ONEDRIVE_EXCEL") {
    return new Set([
      "ONEDRIVE",
      "MICROSOFT",
      "MICROSOFT_ONEDRIVE",
      "SHAREPOINT",
    ]).has(vendor);
  }

  if (sourceType === "AZURE_SQL") {
    return vendor === "AZURE_SQL";
  }

  if (sourceType === "SNOWFLAKE") {
    return vendor === "SNOWFLAKE";
  }

  if (sourceType === "DATABRICKS") {
    return vendor === "DATABRICKS";
  }

  if (sourceType === "BIGQUERY") {
    return vendor === "BIGQUERY";
  }

  return false;
}

function shortArtifactHash(value?: string | null): string {
  const hash = String(value || "").trim();
  if (!hash) return "—";
  return hash.length > 20 ? `${hash.slice(0, 20)}…` : hash;
}

function GovernedExecutionPanel({
  recommendation,
  connections,
  connectionsLoading,
  connectionsError,
  governedSqlExecutionEnabled,
  governedRegexExecutionEnabled,
  billingEntitlementsLoading,
}: {
  recommendation: DqApprovedRecommendationResponse;
  connections: EnterpriseConnection[];
  connectionsLoading: boolean;
  connectionsError: string | null;
  governedSqlExecutionEnabled: boolean;
  governedRegexExecutionEnabled: boolean;
  billingEntitlementsLoading: boolean;
}) {
  const [selectedConnectionId, setSelectedConnectionId] = useState("");
  const [technicalApprover, setTechnicalApprover] = useState("");
  const [validationResult, setValidationResult] =
    useState<DqExecutionResponse | null>(null);
  const [executionResult, setExecutionResult] =
    useState<DqExecutionResponse | null>(null);
  const [validationLoading, setValidationLoading] = useState(false);
  const [executionLoading, setExecutionLoading] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  const sourceType = String(recommendation.source_type || "")
    .trim()
    .toUpperCase();

  const persistedConnectionId = String(
    recommendation.connection_id || "",
  ).trim();

  const compatibleConnections = useMemo(
    () =>
      connections.filter(
        (connection) =>
          isConnectionCompatibleWithSource(connection, sourceType) &&
          (!persistedConnectionId ||
            connection.connection_id === persistedConnectionId),
      ),
    [connections, persistedConnectionId, sourceType],
  );

  useEffect(() => {
    if (
      persistedConnectionId &&
      compatibleConnections.some(
        (connection) => connection.connection_id === persistedConnectionId,
      )
    ) {
      setSelectedConnectionId(persistedConnectionId);
      return;
    }

    if (
      selectedConnectionId &&
      compatibleConnections.some(
        (connection) => connection.connection_id === selectedConnectionId,
      )
    ) {
      return;
    }

    setSelectedConnectionId(compatibleConnections[0]?.connection_id || "");
  }, [
    compatibleConnections,
    persistedConnectionId,
    selectedConnectionId,
  ]);

  const selectedConnection =
    compatibleConnections.find(
      (connection) => connection.connection_id === selectedConnectionId,
    ) ?? null;

  const profileRunId = String(recommendation.profile_run_id || "").trim();

  const artifactType = String(
    recommendation.remediation_artifact_type || "",
  )
    .trim()
    .toUpperCase();

  const approvalStatus = String(
    recommendation.remediation_approval_status || "",
  )
    .trim()
    .toUpperCase();

  const safetyStatus = String(
    recommendation.remediation_safety_status || "",
  )
    .trim()
    .toUpperCase();

  const executionEnvironment = normalizeExecutionEnvironment(
    selectedConnection?.environment,
  );

  const isSqlArtifact = artifactType === "SQL";
  const isRegexArtifact = artifactType === "REGEX";
  const isGoogleSheetsRegex =
    isRegexArtifact && sourceType === "GOOGLE_SHEETS";
  const isOneDriveRegex =
    isRegexArtifact && sourceType === "ONEDRIVE_EXCEL";
  const isSnowflakeRegex =
    isRegexArtifact && sourceType === "SNOWFLAKE";

  const hasRegexTarget =
    Boolean(recommendation.connection_id?.trim()) &&
    (isGoogleSheetsRegex
      ? Boolean(recommendation.spreadsheet_id?.trim()) &&
        Boolean(recommendation.sheet_name?.trim())
        : isOneDriveRegex
        ? Boolean(recommendation.drive_id?.trim()) &&
          Boolean(recommendation.item_id?.trim()) &&
          Boolean(recommendation.sheet_name?.trim())
        : isSnowflakeRegex
          ? Boolean(profileRunId) && Boolean(persistedConnectionId)
          : false);

  const artifactExecutable =
    ((isSqlArtifact && Boolean(recommendation.remediation_sql?.trim())) ||
      (isRegexArtifact &&
        Boolean(recommendation.remediation_regex?.trim()) &&
        hasRegexTarget)) &&
    approvalStatus === "APPROVED" &&
    safetyStatus !== "BLOCKED";

  const invalidateValidation = () => {
    setValidationResult(null);
    setExecutionResult(null);
    setActionError(null);
  };

  const validateExecution = async () => {
    if (!profileRunId) {
      setActionError(
        "This approved recommendation is missing profile_run_id and cannot be validated for execution.",
      );
      return;
    }

    if (!selectedConnection) {
      setActionError("Select an eligible DEV or STG Enterprise Connection.");
      return;
    }

    const approver = technicalApprover.trim();
    if (!approver) {
      setActionError("Technical approver is required before validation.");
      return;
    }

    setValidationLoading(true);
    setActionError(null);
    setValidationResult(null);
    setExecutionResult(null);

    try {
      const validationPayload = {
        profile_run_id: profileRunId,
        connection_id: selectedConnection.connection_id,
        technical_approved_by: approver,
      };

      const result = isSnowflakeRegex
        ? await validateSnowflakeRegexDqExecution(
            recommendation.recommendation_id,
            validationPayload,
          )
        : await validateDqExecution(
            recommendation.recommendation_id,
            validationPayload,
          );

      setValidationResult(result);
    } catch (error) {
      setActionError(
        error instanceof Error
          ? error.message
          : "Unable to validate governed DQ execution.",
      );
    } finally {
      setValidationLoading(false);
    }
  };

  const executeRemediation = async () => {
    if (!selectedConnection || !executionEnvironment) {
      return;
    }

    if ((isSqlArtifact || isSnowflakeRegex) && !validationResult) return;

    if (!technicalApprover.trim()) {
      setActionError("Technical approver is required before execution.");
      return;
    }

    if (billingEntitlementsLoading) {
      setActionError(
        "Governed execution access is still being verified. Try again in a moment.",
      );
      return;
    }

    const executionEntitled = isSqlArtifact
      ? governedSqlExecutionEnabled
      : governedRegexExecutionEnabled;

    if (!executionEntitled) {
      setActionError(
        "Governed execution requires Steward Intelligence. The approved artifact remains available for review, but Copilot-managed execution is disabled.",
      );
      return;
    }

    const confirmed = window.confirm(
      `Execute the exact approved remediation artifact in ${String(selectedConnection.vendor).toUpperCase()} ${executionEnvironment}?\n\n` +
        "Production execution remains blocked. This action may update target data in the selected non-production connection.",
    );

    if (!confirmed) return;

    setExecutionLoading(true);
    setActionError(null);

    try {
      const basePayload = {
          profile_run_id: profileRunId,
          connection_id: selectedConnection.connection_id,
          technical_approved_by: technicalApprover.trim(),
          confirm_execution: true,
        } as const;

      const result = isGoogleSheetsRegex
        ? await executeGoogleSheetsDqRemediation(
            recommendation.recommendation_id,
            {
              ...basePayload,
              spreadsheet_id: String(recommendation.spreadsheet_id),
              sheet_name: String(recommendation.sheet_name),
              header_row: recommendation.header_row ?? 1,
            },
          )
        : isOneDriveRegex
          ? await executeOneDriveDqRemediation(
              recommendation.recommendation_id,
              {
                ...basePayload,
                drive_id: String(recommendation.drive_id),
                item_id: String(recommendation.item_id),
                sheet_name: String(recommendation.sheet_name),
                header_row: recommendation.header_row ?? 1,
              },
            )
          : isSnowflakeRegex
            ? await executeSnowflakeRegexDqRemediation(
                recommendation.recommendation_id,
                basePayload,
              )
          : await executeDqRemediation(
              recommendation.recommendation_id,
              basePayload,
            );

      setExecutionResult(result);
    } catch (error) {
      setActionError(
        error instanceof Error
          ? error.message
          : "Unable to execute governed DQ remediation.",
      );
    } finally {
      setExecutionLoading(false);
    }
  };

  const canValidate =
    (isSqlArtifact || isSnowflakeRegex) &&
    artifactExecutable &&
    Boolean(profileRunId) &&
    Boolean(selectedConnection) &&
    Boolean(technicalApprover.trim()) &&
    !validationLoading &&
    !executionLoading;

  const canExecute =
    (isSqlArtifact
      ? governedSqlExecutionEnabled
      : governedRegexExecutionEnabled) &&
    !billingEntitlementsLoading &&
    artifactExecutable &&
    (!(isSqlArtifact || isSnowflakeRegex) ||
      validationResult?.execution_status === "VALIDATED_NOT_EXECUTED") &&
    Boolean(selectedConnection) &&
    Boolean(executionEnvironment) &&
    Boolean(technicalApprover.trim()) &&
    !executionLoading &&
    executionResult?.execution_status !== "SUCCEEDED";

  return (
    <div
      style={{
        marginTop: 14,
        padding: 14,
        borderRadius: 14,
        border: "1px solid #bfdbfe",
        background:
          "linear-gradient(180deg, #f8fbff 0%, #ffffff 100%)",
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
              fontSize: 13,
              fontWeight: 850,
              color: "#1e3a8a",
            }}
          >
            Governed Execution
          </div>

          <div
            style={{
              marginTop: 4,
              fontSize: 12,
              color: "#64748b",
              lineHeight: 1.5,
            }}
          >
            AI proposes. Humans approve. Copilot executes safely in
            non-production. Production remains controlled.
          </div>
        </div>

        <span
          style={{
            padding: "5px 9px",
            borderRadius: 999,
            border: "1px solid #fecaca",
            background: "#fef2f2",
            color: "#b91c1c",
            fontSize: 10,
            fontWeight: 850,
          }}
        >
          PROD BLOCKED 🔒
        </span>
      </div>

      {!artifactExecutable && (
        <div
          style={{
            marginTop: 12,
            padding: 11,
            borderRadius: 10,
            border: "1px solid #fde68a",
            background: "#fffbeb",
            color: "#92400e",
            fontSize: 12,
            lineHeight: 1.5,
          }}
        >
          This queue item does not contain a complete executable approved
          artifact and source target. Generate and approve the remediation in
          Profile Intelligence before governed execution can continue.
        </div>
      )}

      <div
        style={{
          marginTop: 14,
          display: "grid",
          gridTemplateColumns: "minmax(0, 1.25fr) minmax(0, 1fr)",
          gap: 12,
          alignItems: "end",
        }}
      >
        <label style={{ display: "grid", gap: 6 }}>
          <span
            style={{
              fontSize: 11,
              fontWeight: 800,
              color: "#475569",
              textTransform: "uppercase",
              letterSpacing: 0.4,
            }}
          >
            Enterprise Connection
          </span>

          <select
            value={selectedConnectionId}
            disabled={
              connectionsLoading ||
              compatibleConnections.length === 0 ||
              Boolean(persistedConnectionId) ||
              validationLoading ||
              executionLoading
            }
            onChange={(event) => {
              setSelectedConnectionId(event.target.value);
              invalidateValidation();
            }}
            style={{
              width: "100%",
              minHeight: 40,
              borderRadius: 10,
              border: "1px solid #cbd5e1",
              background: "#ffffff",
              color: "#172033",
              padding: "8px 10px",
              fontSize: 13,
            }}
          >
            {compatibleConnections.length === 0 ? (
              <option value="">
                {connectionsLoading
                  ? "Loading eligible connections…"
                  : "No eligible DEV / STG connections"}
              </option>
            ) : (
              compatibleConnections.map((connection) => (
                <option
                  key={connection.connection_id}
                  value={connection.connection_id}
                >
                  {connection.connection_name} •{" "}
                  {String(connection.vendor).toUpperCase()} •{" "}
                  {normalizeExecutionEnvironment(connection.environment) ||
                    connection.environment}
                </option>
              ))
            )}
          </select>
        </label>

        <label style={{ display: "grid", gap: 6 }}>
          <span
            style={{
              fontSize: 11,
              fontWeight: 800,
              color: "#475569",
              textTransform: "uppercase",
              letterSpacing: 0.4,
            }}
          >
            Technical Approver
          </span>

          <input
            type="email"
            value={technicalApprover}
            disabled={validationLoading || executionLoading}
            onChange={(event) => {
              setTechnicalApprover(event.target.value);
              invalidateValidation();
            }}
            placeholder="approver@company.com"
            style={{
              width: "100%",
              boxSizing: "border-box",
              minHeight: 40,
              borderRadius: 10,
              border: "1px solid #cbd5e1",
              background: "#ffffff",
              color: "#172033",
              padding: "8px 10px",
              fontSize: 13,
            }}
          />
        </label>
      </div>

      {selectedConnection && (
        <div
          style={{
            marginTop: 8,
            display: "flex",
            gap: 8,
            flexWrap: "wrap",
            fontSize: 11,
            color: "#475569",
          }}
        >
          <span>
            Vendor: <b>{String(selectedConnection.vendor).toUpperCase()}</b>
          </span>
          <span>•</span>
          <span>
            Environment:{" "}
            <b>
              {executionEnvironment || selectedConnection.environment}
            </b>
          </span>
          <span>•</span>
          <span>
            Health: <b>{selectedConnection.health_status}</b>
          </span>
        </div>
      )}

      {connectionsError && (
        <div
          style={{
            marginTop: 10,
            color: "#b91c1c",
            fontSize: 12,
            lineHeight: 1.5,
          }}
        >
          {connectionsError}
        </div>
      )}

      {!profileRunId && (
        <div
          style={{
            marginTop: 10,
            color: "#b45309",
            fontSize: 12,
            lineHeight: 1.5,
          }}
        >
          Execution is unavailable because this approved recommendation does
          not include profile_run_id.
        </div>
      )}

      {!billingEntitlementsLoading &&
        !(isSqlArtifact
          ? governedSqlExecutionEnabled
          : governedRegexExecutionEnabled) && (
        <div
          style={{
            marginTop: 12,
            padding: 11,
            borderRadius: 10,
            border: "1px solid #dbe4ee",
            background: "#ffffff",
            color: "#475569",
            fontSize: 12,
            lineHeight: 1.5,
          }}
        >
          <b>Governed Automated Remediation — Steward Intelligence Required</b>
          <div style={{ marginTop: 4 }}>
            The approved artifact remains available for review and audit.
            Copilot-managed execution against an Enterprise Connection requires
            Steward Intelligence.
          </div>
        </div>
      )}

      <div
        style={{
          marginTop: 14,
          display: "flex",
          gap: 10,
          flexWrap: "wrap",
          alignItems: "center",
        }}
      >
        {(isSqlArtifact || isSnowflakeRegex) && (
          <button
            type="button"
            onClick={validateExecution}
            disabled={!canValidate}
            style={{
              border: "1px solid #2563eb",
              borderRadius: 10,
              padding: "9px 13px",
              background: canValidate ? "#2563eb" : "#e2e8f0",
              color: canValidate ? "#ffffff" : "#64748b",
              fontSize: 12,
              fontWeight: 850,
              cursor: canValidate ? "pointer" : "not-allowed",
            }}
          >
            {validationLoading
              ? "VALIDATING…"
              : executionEnvironment
                ? `VALIDATE IN ${executionEnvironment}`
                : "VALIDATE EXECUTION"}
          </button>
        )}

        {((isSqlArtifact &&
          validationResult?.execution_status === "VALIDATED_NOT_EXECUTED") ||
          isRegexArtifact) && (
          <button
            type="button"
            onClick={executeRemediation}
            disabled={!canExecute}
            style={{
              border: "1px solid #166534",
              borderRadius: 10,
              padding: "9px 13px",
              background: canExecute ? "#166534" : "#e2e8f0",
              color: canExecute ? "#ffffff" : "#64748b",
              fontSize: 12,
              fontWeight: 850,
              cursor: canExecute ? "pointer" : "not-allowed",
            }}
          >
            {executionLoading
              ? "EXECUTING…"
              : isSnowflakeRegex
                ? `RUN APPROVED REGEX IN ${executionEnvironment || "NON-PROD"}`
                : isRegexArtifact
                ? `PREFLIGHT & RUN IN ${executionEnvironment || "NON-PROD"}`
              : selectedConnection
                ? `RUN IN ${String(selectedConnection.vendor).toUpperCase()} ${executionEnvironment || "NON-PROD"}`
                : "RUN IN NON-PROD"}
          </button>
        )}
      </div>

      {actionError && (
        <div
          style={{
            marginTop: 12,
            padding: 11,
            borderRadius: 10,
            border: "1px solid #fecaca",
            background: "#fef2f2",
            color: "#b91c1c",
            fontSize: 12,
            lineHeight: 1.5,
          }}
        >
          {actionError}
        </div>
      )}

      {validationResult && (
        <div
          style={{
            marginTop: 12,
            padding: 12,
            borderRadius: 12,
            border: "1px solid #bbf7d0",
            background: "#f0fdf4",
          }}
        >
          <div
            style={{
              fontSize: 12,
              fontWeight: 850,
              color: "#166534",
            }}
          >
            Execution Validation Passed ✓
          </div>

          <div
            style={{
              marginTop: 8,
              display: "grid",
              gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
              gap: 8,
            }}
          >
            <InsightRow
              title="Execution Status"
              value={validationResult.execution_status}
            />
            <InsightRow
              title="Artifact Hash"
              value={shortArtifactHash(validationResult.artifact_hash)}
            />
            <InsightRow
              title="Vendor"
              value={validationResult.vendor}
            />
            <InsightRow
              title="Environment"
              value={validationResult.environment}
            />
          </div>

          <div
            style={{
              marginTop: 9,
              fontSize: 11,
              color: "#166534",
              lineHeight: 1.5,
            }}
          >
            {isSnowflakeRegex
              ? `No target data has been changed. Preflight found ${
                  validationResult.rows_affected ?? 0
                } row(s) eligible for the exact approved Snowflake REGEX operation.`
              : "No target SQL has been executed. Validation confirms the persisted approved artifact, tenant-bound connection, safety controls, and non-production environment."}
          </div>
        </div>
      )}

      {executionResult && (
        <div
          style={{
            marginTop: 12,
            padding: 12,
            borderRadius: 12,
            border:
              executionResult.execution_status === "SUCCEEDED"
                ? "1px solid #bbf7d0"
                : "1px solid #fecaca",
            background:
              executionResult.execution_status === "SUCCEEDED"
                ? "#f0fdf4"
                : "#fef2f2",
          }}
        >
          <div
            style={{
              fontSize: 12,
              fontWeight: 850,
              color:
                executionResult.execution_status === "SUCCEEDED"
                  ? "#166534"
                  : "#b91c1c",
            }}
          >
            {executionResult.execution_status === "SUCCEEDED"
              ? "Execution Succeeded ✓"
              : `Execution ${executionResult.execution_status}`}
          </div>

          <div
            style={{
              marginTop: 8,
              display: "grid",
              gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
              gap: 8,
            }}
          >
            <InsightRow
              title="Rows Affected"
              value={executionResult.rows_affected ?? "—"}
            />
            <InsightRow
              title="Vendor Status"
              value={executionResult.vendor_status || "—"}
            />
            <InsightRow
              title="Execution ID"
              value={executionResult.execution_id}
            />
            <InsightRow
              title="Statement / Job ID"
              value={executionResult.statement_id || "—"}
            />
          </div>

          <div
            style={{
              marginTop: 9,
              fontSize: 11,
              color: "#64748b",
              lineHeight: 1.5,
            }}
          >
            Executed: {formatDateTime(executionResult.executed_at)}
          </div>
        </div>
      )}
    </div>
  );
}

function ApprovedDqGovernanceQueue({
  recommendations,
}: {
  recommendations: DqApprovedRecommendationResponse[];
}) {
  const [connections, setConnections] = useState<EnterpriseConnection[]>([]);
  const [connectionsLoading, setConnectionsLoading] = useState(false);
  const [connectionsError, setConnectionsError] = useState<string | null>(null);

  const [billingEntitlements, setBillingEntitlements] =
    useState<BillingExecutionEntitlements>({
      steward_intelligence_enabled: false,
      governed_sql_execution_enabled: false,
    });

  const [billingEntitlementsLoading, setBillingEntitlementsLoading] =
    useState(true);

  useEffect(() => {
    let cancelled = false;

    async function loadBillingEntitlements(): Promise<void> {
      setBillingEntitlementsLoading(true);

      try {
        const payload = await getBillingStatus();

        if (!cancelled) {
          setBillingEntitlements({
            steward_intelligence_enabled:
              payload.steward_intelligence_enabled === true,
            governed_sql_execution_enabled:
              payload.governed_sql_execution_enabled === true,
          });
        }
      } catch {
        if (!cancelled) {
          setBillingEntitlements({
            steward_intelligence_enabled: false,
            governed_sql_execution_enabled: false,
          });
        }
      } finally {
        if (!cancelled) {
          setBillingEntitlementsLoading(false);
        }
      }
    }

    void loadBillingEntitlements();

    return () => {
      cancelled = true;
    };
  }, []);

  const governedSqlExecutionEnabled =
    billingEntitlements.steward_intelligence_enabled &&
    billingEntitlements.governed_sql_execution_enabled;

  // The API remains authoritative and enforces the dedicated governed REGEX
  // entitlement. Steward Intelligence is the UI-level feature gate.
  const governedRegexExecutionEnabled =
    billingEntitlements.steward_intelligence_enabled;

  useEffect(() => {
    let cancelled = false;

    if (recommendations.length === 0) {
      setConnections([]);
      setConnectionsError(null);
      return () => {
        cancelled = true;
      };
    }

    const loadConnections = async () => {
      setConnectionsLoading(true);
      setConnectionsError(null);

      try {
        const response = await getEnterpriseConnections(1, 100);

        if (cancelled) return;

        setConnections(
          (response.items || []).filter(isEligibleExecutionConnection),
        );
      } catch (error) {
        if (cancelled) return;

        setConnections([]);
        setConnectionsError(
          error instanceof Error
            ? error.message
            : "Unable to load eligible Enterprise Connections.",
        );
      } finally {
        if (!cancelled) {
          setConnectionsLoading(false);
        }
      }
    };

    void loadConnections();

    return () => {
      cancelled = true;
    };
  }, [recommendations.length]);

  return (
    <section
      style={{
        ...cardStyle("#bbf7d0"),
        marginTop: 22,
        background: "linear-gradient(180deg, #ffffff 0%, #f7fff9 100%)",
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
        <div>
          <div
            style={{
              fontSize: 18,
              fontWeight: 850,
              color: "#166534",
            }}
          >
            Active Governance Queue
          </div>

          <div
            style={{
              marginTop: 5,
              fontSize: 13,
              color: "#64748b",
              lineHeight: 1.5,
            }}
          >
            Remediation work promoted from Profile Intelligence after final
            steward approval.
          </div>
        </div>

        <div
          style={{
            padding: "6px 10px",
            borderRadius: 999,
            background: "#dcfce7",
            border: "1px solid #bbf7d0",
            color: "#166534",
            fontSize: 11,
            fontWeight: 850,
          }}
        >
          {recommendations.length} APPROVED
        </div>
      </div>

      {recommendations.length === 0 ? (
        <div
          style={{
            padding: 14,
            borderRadius: 12,
            border: "1px solid #e2e8f0",
            background: "#ffffff",
            color: "#64748b",
            fontSize: 13,
            lineHeight: 1.5,
          }}
        >
          No approved Profile Intelligence remediations are waiting in the
          governance queue.
        </div>
      ) : (
        <div style={{ display: "grid", gap: 12 }}>
          {recommendations.map((recommendation) => (
            <article
              key={recommendation.recommendation_id}
              style={{
                padding: 14,
                borderRadius: 14,
                border: "1px solid #dbe7df",
                background: "#ffffff",
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  gap: 12,
                  alignItems: "flex-start",
                  flexWrap: "wrap",
                }}
              >
                <div style={{ minWidth: 0 }}>
                  <div
                    style={{
                      fontSize: 15,
                      fontWeight: 800,
                      color: "#172033",
                    }}
                  >
                    {recommendation.recommendation_title ||
                      recommendation.rule_id ||
                      recommendation.recommendation_id}
                  </div>

                  <div
                    style={{
                      marginTop: 5,
                      fontSize: 12,
                      color: "#64748b",
                    }}
                  >
                    {[
                      recommendation.domain,
                      recommendation.rule_id,
                      recommendation.field_name,
                    ]
                      .filter(Boolean)
                      .join(" • ")}
                  </div>
                </div>

                <div
                  style={{
                    padding: "5px 9px",
                    borderRadius: 999,
                    background: "#dcfce7",
                    border: "1px solid #bbf7d0",
                    color: "#166534",
                    fontSize: 11,
                    fontWeight: 850,
                  }}
                >
                  {recommendation.remediation_approval_status || "APPROVED"}
                </div>
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
                  title="Artifact"
                  value={recommendation.remediation_artifact_type || "—"}
                />
                <InsightRow
                  title="Safety"
                  value={recommendation.remediation_safety_status || "—"}
                />
                <InsightRow
                  title="Severity"
                  value={recommendation.severity || "—"}
                />
              </div>

              <ApprovedRemediationArtifact
                recommendation={recommendation}
              />

              <GovernedExecutionPanel
                recommendation={recommendation}
                connections={connections}
                connectionsLoading={connectionsLoading}
                connectionsError={connectionsError}
                governedSqlExecutionEnabled={governedSqlExecutionEnabled}
                governedRegexExecutionEnabled={governedRegexExecutionEnabled}
                billingEntitlementsLoading={billingEntitlementsLoading}
              />

              <div
                style={{
                  marginTop: 10,
                  fontSize: 12,
                  color: "#64748b",
                  lineHeight: 1.5,
                }}
              >
                Approved by {recommendation.remediation_approved_by || "—"}
                {recommendation.remediation_approved_at
                  ? ` • ${formatDateTime(
                      String(recommendation.remediation_approved_at),
                    )}`
                  : ""}
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}

export type DqIntelligenceProps = {
  dqRows: DqDashboardRow[];
  stewardData: MetricsOverviewResponse | null;
  approvedDqRecommendations: DqApprovedRecommendationResponse[];
  dqRuleSuggestions: DqRuleSuggestionsResponse | null;
};

export default function DqIntelligence({
  dqRows,
  stewardData,
  approvedDqRecommendations,
  dqRuleSuggestions,
}: DqIntelligenceProps) {
  const latestDq = useMemo<DqDashboardRow | null>(() => {
    if (!dqRows.length) return null;

    return (
      [...dqRows].sort((a, b) =>
        String(b.metric_date).localeCompare(String(a.metric_date)),
      )[0] ?? null
    );
  }, [dqRows]);

  const dqHealthMeta = useMemo(
    () => getDqHealthMeta(latestDq?.dq_health_score),
    [latestDq],
  );

  const dqRiskMeta = useMemo(
    () => getDqRiskMeta(latestDq?.dq_risk_score),
    [latestDq],
  );

  const dqProjection = calculateDqAutomationProjection(
    latestDq,
    stewardData,
  );

  const trajectoryCurrentReadiness =
    dqProjection.currentReadiness;

  const trajectoryProjectedReadiness =
    dqProjection.projectedReadiness;

  return (
    <>
      <div
        style={{
          fontSize: 12,
          fontWeight: 700,
          letterSpacing: 0.6,
          textTransform: "uppercase",
          color: "#6b7280",
          marginTop: 18,
          marginBottom: 10,
          paddingLeft: 4,
        }}
      >
        Executive Summary
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(12, minmax(0, 1fr))",
          gap: 20,
          marginTop: 12,
        }}
      >
        <div style={{ gridColumn: "span 4" }}>
          <DqExecutiveSummaryCard
            title="DQ Health Score"
            value={scorePctWithUnit(latestDq?.dq_health_score)}
            subtitle="Composite quality posture across scoring, findings, and active controls"
            badgeLabel={dqHealthMeta.label}
            badgeColor={dqHealthMeta.color}
            accent="#dff5df"
          >
            <Sparkline
              data={latestSparkline(dqRows, "dq_health_score")}
            />
          </DqExecutiveSummaryCard>
        </div>

        <div style={{ gridColumn: "span 4" }}>
          <DqExecutiveSummaryCard
            title="DQ Risk Score"
            value={scorePctWithUnit(latestDq?.dq_risk_score)}
            subtitle="Estimated downstream business risk from current data quality posture"
            badgeLabel={dqRiskMeta.label}
            badgeColor={dqRiskMeta.color}
            accent="#fdeeee"
          >
            <Sparkline
              data={latestSparkline(dqRows, "dq_risk_score")}
            />
          </DqExecutiveSummaryCard>
        </div>

        <div style={{ gridColumn: "span 4" }}>
          <DqExecutiveSummaryCard
            title="Automation Readiness"
            value={scorePctWithUnit(
              latestDq?.automation_readiness_score,
            )}
            subtitle="How ready the current data landscape is for AI-assisted automation"
            badgeLabel={
              (latestDq?.automation_readiness_score ?? 0) >= 85
                ? "READY TO SCALE"
                : (latestDq?.automation_readiness_score ?? 0) >= 70
                  ? "PARTIALLY READY"
                  : "NEEDS HARDENING"
            }
            badgeColor={
              (latestDq?.automation_readiness_score ?? 0) >= 85
                ? "#16a34a"
                : (latestDq?.automation_readiness_score ?? 0) >= 70
                  ? "#d97706"
                  : "#dc2626"
            }
            accent="#bfd3ff"
          >
            <Sparkline
              data={latestSparkline(
                dqRows,
                "automation_readiness_score",
              )}
            />
          </DqExecutiveSummaryCard>
        </div>
      </div>

      <div style={{ marginTop: 18 }}>
        <DqStewardImpactCard
          row={latestDq}
          stewardData={stewardData}
        />
      </div>

      <div
        style={{
          marginTop: 18,
          display: "grid",
          gridTemplateColumns: "1.35fr 0.95fr",
          gap: 18,
          alignItems: "start",
        }}
      >
        <DqAutomationFunnelCard row={latestDq} />
        <DqDriversBlockingAutomationCard row={latestDq} />
      </div>

      <div style={{ marginTop: 18 }}>
        <DqWorkloadReductionSimulatorCard
          row={latestDq}
          stewardData={stewardData}
        />
      </div>

      <div
        style={{
          marginTop: 18,
          display: "grid",
          gridTemplateColumns: "1.2fr 0.8fr",
          gap: 18,
          alignItems: "start",
        }}
      >
        <AutomationReadinessTrajectoryCard
          currentReadiness={trajectoryCurrentReadiness}
          projectedReadiness={trajectoryProjectedReadiness}
        />

        <ProjectedAutomationUpliftCard
          row={latestDq}
          stewardData={stewardData}
        />
      </div>

      <div
        style={{
          fontSize: 12,
          fontWeight: 700,
          letterSpacing: 0.6,
          textTransform: "uppercase",
          color: "#6b7280",
          marginTop: 24,
          marginBottom: 10,
          paddingLeft: 4,
        }}
      >
        Detailed DQ Insights
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(12, minmax(0, 1fr))",
          gap: 20,
          marginTop: 12,
        }}
      >
        <div style={{ gridColumn: "span 4" }}>
          <DqScoreCompositionCard row={latestDq} />
        </div>

        <div style={{ gridColumn: "span 4" }}>
          <DqIssuePostureCard row={latestDq} />
        </div>

        <div style={{ gridColumn: "span 4" }}>
          <DqRecommendationCard row={latestDq} />
        </div>

        <div style={{ gridColumn: "span 6" }}>
          <DqOperationalPressureCard row={latestDq} />
        </div>

        <div style={{ gridColumn: "span 6" }}>
          <DqRuleCoverageCard row={latestDq} />
        </div>
      </div>

      <ApprovedDqGovernanceQueue
        recommendations={approvedDqRecommendations}
      />

      <div style={{ marginTop: 22 }}>
        {dqRuleSuggestions?.ai_rule_suggestions ? (
          <AiDqRuleEngineeringAssistant
            response={dqRuleSuggestions}
          />
        ) : (
          <div
            style={{
              ...cardStyle("#dbeafe"),
              background:
                "linear-gradient(180deg, #ffffff 0%, #f8fbff 100%)",
            }}
          >
            <div
              style={{
                fontSize: 16,
                fontWeight: 800,
                color: "#1e3a5f",
                marginBottom: 6,
              }}
            >
              AI Data Quality Recommendations
            </div>

            <div
              style={{
                fontSize: 13,
                color: "#64748b",
                lineHeight: 1.5,
              }}
            >
              Updating AI rule recommendations...
            </div>
          </div>
        )}
      </div>

      {!latestDq && (
        <div
          style={{
            ...cardStyle("#e5e7eb"),
            marginTop: 18,
            background:
              "linear-gradient(180deg, #ffffff 0%, #fbfbfb 100%)",
          }}
        >
          <div style={{ fontWeight: 700, marginBottom: 8 }}>
            No DQ summary data yet
          </div>
          <div
            style={{
              fontSize: 14,
              opacity: 0.78,
              maxWidth: 700,
            }}
          >
            The Data Quality Intelligence tab is wired correctly,
            but no rows were returned from the DQ dashboard dataset
            for the selected lookback window. Populate
            <b> DQ_DAILY_SUMMARY </b>
            to activate these cards.
          </div>
        </div>
      )}

      <div
        style={{
          marginTop: 16,
          fontSize: 12,
          opacity: 0.72,
        }}
      >
        Tip: This tab is designed for executive-quality data
        observability across scoring, findings, remediation, rule
        posture, and automation readiness.
      </div>
    </>
  );
}
