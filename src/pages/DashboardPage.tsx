// src/pages/DashboardPage.tsx
import React, { useMemo, useState } from "react";
import {
  getApprovedDqRecommendations,
  getDqDashboardOverview,
  getDqRuleSuggestions,
  getMetricsOverview,
} from "../api/client";
import { getGovernanceOverview } from "../api/client";

import type {
  DqApprovedRecommendationResponse,
  DqDashboardRow,
  DqRuleSuggestionsResponse,
  GovernanceOverviewResponse,
  MetricsOverviewResponse,
} from "../api/types";

import OnboardingProgressCard from "../components/OnboardingProgressCard";

import ProfileIntelligencePage from "./ProfileIntelligencePage";

import DqIntelligence from "../components/DqIntelligence";
import GovernanceIntelligence from "../components/GovernanceIntelligence";

type DashboardTab = "STEWARD" | "DQ" | "GOVERNANCE" | "PROFILE";
function safeErr(err: unknown): string {
    if (err instanceof Error)
        return err.message;
    try {
        return JSON.stringify(err);
    }
    catch {
        return String(err);
    }
}
function pct(v: number | null | undefined): string {
    if (v === null || v === undefined || Number.isNaN(v))
        return "—";
    return `${(v * 100).toFixed(1)}%`;
}
function num(v: number | null | undefined): string {
    if (v === null || v === undefined || Number.isNaN(v))
        return "—";
    const isInt = Math.abs(v - Math.round(v)) < 1e-9;
    return isInt ? String(Math.round(v)) : v.toFixed(2);
}
function num3(v: number | null | undefined): string {
    if (v === null || v === undefined || Number.isNaN(v))
        return "—";
    return v.toFixed(3);
}
function dec(v: number | null | undefined, digits = 2): string {
    if (v === null || v === undefined || Number.isNaN(v))
        return "—";
    return v.toFixed(digits);
}
function dictTotal(d: Record<string, number> | undefined): number {
    if (!d)
        return 0;
    return Object.values(d).reduce((a, b) => a + (b || 0), 0);
}
function sortedPairs(d: Record<string, number> | undefined) {
    const entries = Object.entries(d || {});
    entries.sort((a, b) => (b[1] || 0) - (a[1] || 0));
    return entries;
}
const SCORE_BUCKET_ORDER = [
    "0.00–0.79",
    "0.80–0.89",
    "0.90–0.94",
    "0.95–0.97",
    "0.98–1.00",
];
function sortedBucketPairs(d: Record<string, number> | undefined) {
    const entries = Object.entries(d || {});
    entries.sort((a, b) => {
        const ia = SCORE_BUCKET_ORDER.indexOf(a[0]);
        const ib = SCORE_BUCKET_ORDER.indexOf(b[0]);
        if (ia !== -1 && ib !== -1)
            return ia - ib;
        if (ia !== -1)
            return -1;
        if (ib !== -1)
            return 1;
        return (b[1] || 0) - (a[1] || 0);
    });
    return entries;
}
function barColor(label: string): string {
    const upper = label.toUpperCase();
    if (upper.includes("HIGH") ||
        upper.includes("SEVERE") ||
        upper.includes("CRITICAL") ||
        upper.includes("REJECT_MERGE") ||
        upper.includes("FALSE_POSITIVE")) {
        return "#c23b3b";
    }
    if (upper.includes("MEDIUM") || upper.includes("ELEVATED") || upper.includes("REVIEW")) {
        return "#c87a12";
    }
    if (upper.includes("LOW") || upper.includes("APPROVE_MERGE") || upper.includes("ACCEPTED")) {
        return "#2f8f4e";
    }
    return "#111";
}
const yesNo = (value?: boolean | null): string => {
    void yesNo;
    if (value === null || value === undefined)
        return "—";
    return value ? "Yes" : "No";
};

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
function detectPolicyDrift(data: MetricsOverviewResponse) {
    const drift: {
        rule: string;
        message: string;
    }[] = [];
    const overrideRate = data.override_rate ?? 0;
    if (overrideRate > 0.35) {
        drift.push({
            rule: "Global Override Trend",
            message: "High steward override rate detected. Review match thresholds.",
        });
    }
    if (data.top_fp_rules?.length) {
        drift.push({
            rule: data.top_fp_rules[0].name,
            message: "False positive pattern detected.",
        });
    }
    if (data.top_fn_rules?.length) {
        drift.push({
            rule: data.top_fn_rules[0].name,
            message: "False negative pattern detected.",
        });
    }
    return drift.slice(0, 3);
}
function WhyTrustChangedCard(props: {
    precision?: number | null;
    overrideRate?: number | null;
    fpRate?: number | null;
    fnRate?: number | null;
    topOverrideReason?: string | null;
    topFpRule?: string | null;
    topFnRule?: string | null;
}) {
    const precisionPct = props.precision !== null && props.precision !== undefined
        ? `${(props.precision * 100).toFixed(1)}%`
        : "—";
    const overridePct = props.overrideRate !== null && props.overrideRate !== undefined
        ? `${(props.overrideRate * 100).toFixed(1)}%`
        : "—";
    let positiveDriver = `Precision improved to ${precisionPct}.`;
    let negativeDriver = `Override rate remains elevated at ${overridePct}.`;
    let recommendedAction = "Monitor steward feedback patterns for further drift.";
    if (props.topFpRule) {
        negativeDriver = `False-positive pressure is concentrated around ${props.topFpRule}.`;
        recommendedAction = `Tighten matching or policy thresholds around ${props.topFpRule}.`;
    }
    else if (props.topFnRule) {
        negativeDriver = `False-negative pressure is concentrated around ${props.topFnRule}.`;
        recommendedAction = `Improve sensitivity or review routing around ${props.topFnRule}.`;
    }
    else if (props.topOverrideReason) {
        const reason = props.topOverrideReason.toLowerCase() === "other" ? `"Other"` : props.topOverrideReason;
        if (props.topOverrideReason.toLowerCase() === "other") {
            negativeDriver =
                'Override feedback is frequently categorized as "Other," limiting root-cause clarity.';
            recommendedAction =
                "Refine steward feedback categories so override trends can better inform policy tuning.";
        }
        else {
            negativeDriver = `Steward overrides are most often associated with ${reason}.`;
            recommendedAction = `Review policy logic and steward workflow associated with ${reason}.`;
        }
    }
    return (<div style={{
            ...cardStyle("#dbeafe"),
            background: "linear-gradient(180deg, #ffffff 0%, #f8fbff 100%)",
        }}>
      <div style={{
            fontWeight: 800,
            fontSize: 18,
            color: "#1e3a5f",
            marginBottom: 12,
        }}>
        Why Trust Changed
      </div>

      <div style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr 1.2fr",
            gap: 12,
        }}>
        <div style={{
            border: "1px solid #e5e7eb",
            borderRadius: 14,
            padding: 14,
            background: "#fff",
        }}>
          <div style={{ fontSize: 12, opacity: 0.7, marginBottom: 6 }}>Positive Driver</div>
          <div style={{ fontSize: 14, fontWeight: 700, color: "#176b2c" }}>{positiveDriver}</div>
        </div>

        <div style={{
            border: "1px solid #e5e7eb",
            borderRadius: 14,
            padding: 14,
            background: "#fff",
        }}>
          <div style={{ fontSize: 12, opacity: 0.7, marginBottom: 6 }}>Negative Driver</div>
          <div style={{ fontSize: 14, fontWeight: 700, color: "#8a1c1c" }}>{negativeDriver}</div>
        </div>

        <div style={{
            border: "1px solid #bfdbfe",
            borderRadius: 14,
            padding: 14,
            background: "#eff6ff",
        }}>
          <div style={{ fontSize: 12, opacity: 0.7, marginBottom: 6 }}>Recommended Action</div>
          <div style={{ fontSize: 14, fontWeight: 700, color: "#1e3a5f" }}>
            {recommendedAction}
          </div>
        </div>
      </div>
    </div>);
}
function LearningInsightsCard(props: {
    overrideRate: number | null | undefined;
    topFpRules: Array<{
        name: string;
        count: number;
    }>;
    topFnRules: Array<{
        name: string;
        count: number;
    }>;
    topOverrideReasons: Array<{
        name: string;
        count: number;
    }>;
}) {
    const topFp = props.topFpRules?.[0];
    const topFn = props.topFnRules?.[0];
    const topReason = props.topOverrideReasons?.[0];
    function getRecommendation() {
        if (topFp) {
            return `Consider tightening policy or match thresholds around ${topFp.name}.`;
        }
        if (topFn) {
            return `Consider lowering review friction or improving sensitivity around ${topFn.name}.`;
        }
        if (topReason) {
            return `Review steward feedback patterns related to ${topReason.name}.`;
        }
        return "Not enough feedback yet to suggest a policy adjustment.";
    }
    return (<div style={cardStyle("#bfd3ff")}>
      <div style={{ fontWeight: 700, marginBottom: 10 }}>AI Learning Insights</div>

      <div style={{ display: "grid", gap: 10 }}>
        <InsightRow title="Override Rate" value={props.overrideRate !== null && props.overrideRate !== undefined
            ? `${(props.overrideRate * 100).toFixed(1)}%`
            : "—"}/>

        <InsightRow title="Top False-Positive Rule" value={topFp ? `${topFp.name} (${topFp.count})` : "None observed"}/>

        <InsightRow title="Top False-Negative Rule" value={topFn ? `${topFn.name} (${topFn.count})` : "None observed"}/>

        <InsightRow title="Most Common Override Reason" value={topReason ? `${topReason.name} (${topReason.count})` : "No override reasons yet"}/>

        <div style={{
            marginTop: 4,
            padding: 10,
            borderRadius: 12,
            background: "#fafafa",
            border: "1px solid #eee",
        }}>
          <div style={{ fontSize: 12, opacity: 0.75, marginBottom: 4 }}>AI Policy Recommendation</div>
          <div style={{ fontSize: 13, fontWeight: 600 }}>{getRecommendation()}</div>
        </div>
      </div>
    </div>);
}
function PolicyDriftCard({ data }: {
    data: MetricsOverviewResponse;
}) {
    const drift = detectPolicyDrift(data);
    return (<div style={cardStyle("#ffe9cc")}>
      <div style={{ fontWeight: 700, marginBottom: 10 }}>AI Policy Drift Detector</div>

      {drift.length === 0 ? (<div style={{ fontSize: 13, opacity: 0.7 }}>No policy drift signals detected.</div>) : (<div style={{ display: "grid", gap: 8 }}>
          {drift.map((d, i) => (<div key={i} style={{
                    border: "1px solid #eee",
                    borderRadius: 10,
                    padding: "10px",
                    background: "#fff",
                }}>
              <div style={{ fontWeight: 600 }}>{d.rule}</div>
              <div style={{ fontSize: 13, opacity: 0.8 }}>{d.message}</div>
            </div>))}
        </div>)}
    </div>);
}
function formatTimelineDate(ts: string) {
    try {
        return new Date(ts).toLocaleString(undefined, {
            month: "short",
            day: "numeric",
            hour: "numeric",
            minute: "2-digit",
        });
    }
    catch {
        return ts;
    }
}
function LearningTimelineCard(props: {
    items: Array<{
        explanation_id: string;
        ai_decision: string;
        recommended_action: string;
        steward_decision: string;
        steward_override_flag: string;
        override_reason: string;
        steward_user: string;
        feedback_at: string;
    }>;
}) {
    return (<div style={cardStyle("#dff5df")}>
      <div style={{ fontWeight: 700, marginBottom: 10 }}>
        AI Learning Timeline - (Recent Steward Decisions)
      </div>

      {props.items.length === 0 ? (<div style={{ fontSize: 13, opacity: 0.7 }}>No recent steward learning events.</div>) : (<div style={{ display: "grid", gap: 8 }}>
          {props.items.map((it, idx) => (<div key={`${it.explanation_id}-${idx}`} style={{
                    border: "1px solid #eee",
                    borderRadius: 12,
                    padding: "10px 10px",
                    background: "#fafafa",
                }}>
              <div style={{ fontSize: 12, opacity: 0.75 }}>
                {it.steward_user} • {formatTimelineDate(it.feedback_at)}
              </div>
              <div style={{ marginTop: 4, fontSize: 13, fontWeight: 600 }}>
                AI: {it.ai_decision} → Steward: {it.steward_decision}
              </div>
              <div style={{ marginTop: 4, fontSize: 12, opacity: 0.85 }}>
                Reason: {it.override_reason} {it.steward_override_flag === "Y" ? "• Override" : "• Accepted"}
              </div>
            </div>))}
        </div>)}
    </div>);
}
function InsightRow({ title, value, }: {
    title: string;
    value: string | number;
}) {
    return (<div style={{
            minWidth: 0,
            padding: 12,
            borderRadius: 12,
            background: "#f8fafc",
            border: "1px solid #e5e7eb",
        }}>
      <div style={{
            fontSize: 12,
            color: "#64748b",
            marginBottom: 6,
            lineHeight: 1.3,
        }}>
        {title}
      </div>

      <div title={String(value)} style={{
            fontSize: 14,
            fontWeight: 700,
            color: "#1f2937",
            whiteSpace: "nowrap",
            overflow: "hidden",
            textOverflow: "ellipsis",
            minWidth: 0,
        }}>
        {value}
      </div>
    </div>);
}
function TrendBadge({ value }: {
    value?: number | null;
}) {
    if (value === null || value === undefined)
        return null;
    let arrow = "→";
    let color = "#6b7280";
    if (value > 0) {
        arrow = "↑";
        color = "#16a34a";
    }
    else if (value < 0) {
        arrow = "↓";
        color = "#dc2626";
    }
    return (<span style={{
            fontSize: 14,
            fontWeight: 600,
            color,
            marginLeft: 8,
        }}>
      {arrow}
    </span>);
}
function AiSystemStatus() {
    return (<div style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            marginTop: 8,
            marginBottom: 6,
            fontSize: 13,
            fontWeight: 600,
        }}>
      <span style={{ opacity: 0.7 }}>AI System Status</span>

      <span style={{
            display: "flex",
            alignItems: "center",
            gap: 6,
            color: "#16a34a",
            fontWeight: 700,
        }}>
        <span style={{
            width: 8,
            height: 8,
            borderRadius: "50%",
            background: "#16a34a",
            display: "inline-block",
        }}/>
        Healthy
      </span>
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

function calcAiTrustScore(data: MetricsOverviewResponse | null): number | null {
    if (!data)
        return null;
    const precision = data.precision ?? 0;
    const overrideRate = data.override_rate ?? 0;
    const fpRate = data.fp_rate ?? 0;
    const fnRate = data.fn_rate ?? 0;
    const score = precision * 50 + (1 - overrideRate) * 25 + (1 - fpRate) * 15 + (1 - fnRate) * 10;
    return Math.max(0, Math.min(100, Math.round(score)));
}
function StewardImpactCard(props: {
    autoMergeCount?: number;
    stewardReviewCount?: number;
    avgReviewMinutes?: number;
}) {
    const auto = props.autoMergeCount ?? 0;
    const minutes = props.avgReviewMinutes ?? 3;
    const avoidedReviews = auto;
    const hoursSaved = ((avoidedReviews * minutes) / 60).toFixed(1);
    const costPerHour = 75;
    const estimatedSavings = Math.round(Number(hoursSaved) * costPerHour);
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
        Steward Workload Reduction
      </div>

      <div style={{
            fontSize: 34,
            fontWeight: 800,
            marginTop: 8,
            lineHeight: 1.1,
            color: "#243b53",
        }}>
        {hoursSaved} hrs
      </div>

      <div style={{
            fontSize: 13,
            opacity: 0.72,
            marginTop: 6,
        }}>
        Estimated impact from AI-assisted match automation
      </div>

      <div style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: 12,
            marginTop: 14,
        }}>
        <ImpactStat label="Reviews Avoided" value={avoidedReviews}/>
        <ImpactStat label="Estimated Savings" value={`$${estimatedSavings.toLocaleString()}`}/>
      </div>
    </div>);
}
function ImpactStat(props: {
    label: string;
    value: React.ReactNode;
}) {
    return (<div style={{
            border: "1px solid #eee",
            borderRadius: 12,
            padding: "12px 14px",
            background: "#fff",
        }}>
      <div style={{
            fontSize: 12,
            opacity: 0.7,
            marginBottom: 6,
        }}>
        {props.label}
      </div>

      <div style={{
            fontSize: 26,
            fontWeight: 700,
            letterSpacing: "-0.02em",
            color: "#111827",
        }}>
        {props.value}
      </div>
    </div>);
}
function getTrustLabel(score: number) {
    if (score >= 90)
        return { label: "ELITE TRUST", color: "#16a34a" };
    if (score >= 75)
        return { label: "HIGH TRUST", color: "#f59e0b" };
    if (score >= 60)
        return { label: "MODERATE TRUST", color: "#f59e0b" };
    return { label: "NEEDS ATTENTION", color: "#dc2626" };
}
function getTrustScoreColor(score: number | null | undefined): string {
    if (score === null || score === undefined)
        return "#1f2937";
    if (score >= 90)
        return "#16a34a";
    if (score >= 75)
        return "#f59e0b";
    return "#ef4444";
}
function TrustScoreBar({ score }: {
    score: number | null;
}) {
    if (score === null)
        return null;
    const blocks = 14;
    const filled = Math.round((score / 100) * blocks);
    const fillColor = score >= 90 ? "#16a34a" : score >= 75 ? "#f59e0b" : "#ef4444";
    return (<div style={{
            marginTop: 12,
            display: "flex",
            alignItems: "center",
            gap: 8,
        }}>
      <div style={{ display: "flex", gap: 3 }}>
        {Array.from({ length: blocks }).map((_, i) => (<div key={i} style={{
                width: 11,
                height: 18,
                borderRadius: 2,
                background: i < filled ? fillColor : "#e5e7eb",
            }}/>))}
      </div>

      <div style={{
            fontSize: 13,
            fontWeight: 700,
            color: fillColor,
            minWidth: 52,
        }}>
        {score}%
      </div>
    </div>);
}
function TabButton(props: {
    active: boolean;
    label: string;
    onClick: () => void;
}) {
    return (<button type="button" onClick={props.onClick} style={{
            padding: "10px 16px",
            borderRadius: 999,
            border: props.active ? "1px solid #111827" : "1px solid #d1d5db",
            background: props.active ? "#111827" : "#ffffff",
            color: props.active ? "#ffffff" : "#111827",
            fontSize: 13,
            fontWeight: 700,
            cursor: "pointer",
            boxShadow: props.active ? "0 8px 18px rgba(17,24,39,0.16)" : "none",
            transition: "all 0.15s ease",
        }}>
      {props.label}
    </button>);
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
function TopList(props: {
    title: string;
    items: Array<{
        name: string;
        count: number;
    }>;
    emptyText: string;
    onItemClick?: (name: string) => void;
}) {
    return (<div style={cardStyle()}>
      <div style={{ fontWeight: 700 }}>{props.title}</div>

      {props.items.length === 0 ? (<div style={{ marginTop: 10, fontSize: 13, opacity: 0.7 }}>{props.emptyText}</div>) : (<div style={{ marginTop: 12, display: "grid", gap: 8 }}>
          {props.items.map((it) => {
                const clickable = !!props.onItemClick;
                return (<button key={it.name} type="button" onClick={() => props.onItemClick?.(it.name)} style={{
                        display: "flex",
                        justifyContent: "space-between",
                        gap: 10,
                        border: "1px solid #eee",
                        borderRadius: 12,
                        padding: "10px 10px",
                        background: "#fafafa",
                        cursor: clickable ? "pointer" : "default",
                        textAlign: "left",
                    }}>
                <div style={{
                        fontSize: 13,
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                    }}>
                  {it.name}
                </div>
                <div style={{ fontSize: 12, opacity: 0.82, fontWeight: 600 }}>{it.count}</div>
              </button>);
            })}
        </div>)}
    </div>);
}
function BucketQualityCard(props: {
    title: string;
    rows: Array<{
        bucket: string;
        reviewed: number;
        false_positives: number;
        false_negatives: number;
        fp_rate: number | null;
        fn_rate: number | null;
    }>;
}) {
    const rows = [...(props.rows || [])].sort((a, b) => {
        const ia = SCORE_BUCKET_ORDER.indexOf(a.bucket);
        const ib = SCORE_BUCKET_ORDER.indexOf(b.bucket);
        if (ia !== -1 && ib !== -1)
            return ia - ib;
        if (ia !== -1)
            return -1;
        if (ib !== -1)
            return 1;
        return a.bucket.localeCompare(b.bucket);
    });
    return (<div style={cardStyle()}>
      <div style={{ fontWeight: 700 }}>{props.title}</div>

      {rows.length === 0 ? (<div style={{ marginTop: 10, fontSize: 13, opacity: 0.7 }}>No reviewed data in this window.</div>) : (<div style={{ marginTop: 12 }}>
          <div style={{
                display: "grid",
                gridTemplateColumns: "1.2fr 0.8fr 0.8fr 0.8fr 0.8fr 0.8fr",
                gap: 8,
                fontSize: 12,
                opacity: 0.82,
                padding: "0 2px 8px 2px",
            }}>
            <div><b>Bucket</b></div>
            <div style={{ textAlign: "right" }}><b>Reviewed</b></div>
            <div style={{ textAlign: "right" }}><b>FP</b></div>
            <div style={{ textAlign: "right" }}><b>FN</b></div>
            <div style={{ textAlign: "right" }}><b>FP%</b></div>
            <div style={{ textAlign: "right" }}><b>FN%</b></div>
          </div>

          <div style={{ display: "grid", gap: 8 }}>
            {rows.map((r) => (<div key={r.bucket} style={{
                    display: "grid",
                    gridTemplateColumns: "1.2fr 0.8fr 0.8fr 0.8fr 0.8fr 0.8fr",
                    gap: 8,
                    alignItems: "center",
                    border: "1px solid #eee",
                    borderRadius: 12,
                    padding: "10px 10px",
                    background: "#fafafa",
                }}>
                <div style={{ fontSize: 13 }}>{r.bucket}</div>
                <div style={{ textAlign: "right", fontSize: 13 }}>{r.reviewed}</div>
                <div style={{ textAlign: "right", fontSize: 13 }}>{r.false_positives}</div>
                <div style={{ textAlign: "right", fontSize: 13 }}>{r.false_negatives}</div>
                <div style={{ textAlign: "right", fontSize: 13, opacity: 0.85 }}>{pct(r.fp_rate)}</div>
                <div style={{ textAlign: "right", fontSize: 13, opacity: 0.85 }}>{pct(r.fn_rate)}</div>
              </div>))}
          </div>

          <div style={{ marginTop: 10, fontSize: 12, opacity: 0.72 }}>
            Tip: If FP rises at high score ranges, tighten policy or upstream match logic. If FN rises in mid-score ranges, revisit thresholds and review workflows.
          </div>
        </div>)}
    </div>);
}
const inputStyle: React.CSSProperties = {
    width: "100%",
    padding: "10px 10px",
    borderRadius: 10,
    border: "1px solid #ccc",
    outline: "none",
};

type DashboardPageProps = {
  onNavigate: (
    destination:
      | "explain"
      | "dashboard"
      | "connections"
      | "governance"
  ) => void;
}
export default function DashboardPage({
    onNavigate,
    }: DashboardPageProps) {
        const [days, setDays] = useState(30);
        const [loading, setLoading] = useState(false);
        const [err, setErr] = useState<string | null>(null);
        const isGovernanceEmptyState = err?.toLowerCase().includes(
                "no governance kpi data found"
            ) ?? false;
        const [data, setData] = useState<MetricsOverviewResponse | null>(null);
        const [
          approvedDqRecommendations,
          setApprovedDqRecommendations,
        ] = useState<DqApprovedRecommendationResponse[]>([]);
        const [dqRows, setDqRows] = useState<DqDashboardRow[]>([]);
        const [policyProfileRunId, setPolicyProfileRunId] = useState<string | null>(null);
        const [policyDomain, setPolicyDomain] = useState<string | null>(null);
        const [activeTab, setActiveTab] = useState<DashboardTab>("STEWARD");
        const [governance, setGovernance] = useState<GovernanceOverviewResponse | null>(null);
        const [dqRuleSuggestions, setDqRuleSuggestions] = 
              useState<DqRuleSuggestionsResponse | null>(null);
              
      async function load() {
      setLoading(true);
      setErr(null); 

      try {
        // Load core dashboard data first.
        // DQ Rule Suggestions should NOT block dashboard refresh.
        const [
            metricsRes,
            dqRes,
            governanceRes,
          ] = await Promise.all([
            getMetricsOverview(days),
            getDqDashboardOverview(days),
            getGovernanceOverview(days),
          ]);

          setData(metricsRes);

          setDqRows(
            dqRes?.rows ?? [],
          );

          const latestProfileRunId =
            dqRes?.latest?.profile_run_id ?? null;
          const latestProfileDomain =
            dqRes?.latest?.domain ?? null;

          setPolicyProfileRunId(latestProfileRunId);
          setPolicyDomain(latestProfileDomain);

          setGovernance(governanceRes);

            if (latestProfileRunId) {
        const approvedDqRes =
                await getApprovedDqRecommendations(
                  latestProfileRunId,
                );

              setApprovedDqRecommendations(
                approvedDqRes?.recommendations ?? [],
              );
            } else {
              setApprovedDqRecommendations([]);
            }

          } catch (e) {
            setErr(safeErr(e));
            setData(null);
            setDqRows([]);
            setApprovedDqRecommendations([]);
            setPolicyProfileRunId(null);
            setPolicyDomain(null);
            setGovernance(null);
          } finally {
            setLoading(false);
          }

      // Load expensive AI DQ suggestions independently.
      // This no longer blocks the dashboard.
      try {
        const dqRuleSuggestionsRes =
          await getDqRuleSuggestions(
            days,
            undefined,
            true,
          );

        setDqRuleSuggestions(
          dqRuleSuggestionsRes,
        );
      } catch (e) {
        console.error(
          "Failed to load DQ rule suggestions:",
          e,
        );
      }
    }


    function goToExplain(domain: string | undefined, ruleName: string) {
        const safeDomain = domain || "CUSTOMER";
        const params = new URLSearchParams({
            domain: safeDomain,
            rules: ruleName,
        });
        window.location.href = `/explain?${params.toString()}`;
    }
    const decisions = useMemo(() => sortedPairs(data?.decisions), [data]);
    const risks = useMemo(() => sortedPairs(data?.risk_flags), [data]);
    const actions = useMemo(() => sortedPairs(data?.recommended_actions), [data]);
    const decisionsTotal = useMemo(() => dictTotal(data?.decisions), [data]);
    const risksTotal = useMemo(() => dictTotal(data?.risk_flags), [data]);
    const actionsTotal = useMemo(() => dictTotal(data?.recommended_actions), [data]);
    const scoreBuckets = useMemo(() => sortedBucketPairs(data?.score_buckets), [data]);
    const scoreBucketsTotal = useMemo(() => dictTotal(data?.score_buckets), [data]);
    const topFpRules = data?.top_fp_rules ?? [];
    const topFnRules = data?.top_fn_rules ?? [];
    const aiTrustScore = useMemo(() => calcAiTrustScore(data), [data]);
    const trustMeta = useMemo(() => {
        if (aiTrustScore === null)
            return null;
        return getTrustLabel(aiTrustScore);
    }, [aiTrustScore]);
    const executiveKpis = useMemo(() => {
        return {
            totalExplanations: num(data?.total_explanations),
            overrideRate: pct(data?.override_rate),
            precision: pct(data?.precision),
            avgConfidence: dec(data?.avg_ai_confidence, 2),
        };
    }, [data]);

    return (<div style={{
            maxWidth: 1280,
            margin: "0 auto",
            padding: "32px 28px 24px 28px",
        }}>
      <div style={{
            display: "flex",
            justifyContent: "space-between",
            gap: 14,
            alignItems: "flex-end",
            flexWrap: "wrap",
        }}>
        <div style={{
            marginBottom: 20,
            paddingTop: 4,
        }}>
          <h1 style={{ marginBottom: 6 }}>Steward Ops Dashboard</h1>

          <div style={{ opacity: 0.8, maxWidth: 760 }}>
            Operational visibility into AI match decisions, steward feedback, quality signals,
            and data quality posture for the last <b>{days}</b> day{days === 1 ? "" : "s"}.
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "end", gap: 10 }}>
          <label style={{ display: "grid", gap: 6 }}>
            <span style={{ fontSize: 12, opacity: 0.8 }}>Lookback days</span>
            <select value={days} onChange={(e) => setDays(Number(e.target.value))} style={inputStyle}>
              <option value={1}>1</option>
              <option value={3}>3</option>
              <option value={7}>7</option>
              <option value={14}>14</option>
              <option value={30}>30</option>
              <option value={90}>90</option>
            </select>
          </label>

          <button onClick={load} disabled={loading} style={{
            padding: "10px 14px",
            borderRadius: 10,
            border: "1px solid #333",
            background: loading ? "#eee" : "#111",
            color: loading ? "#666" : "#fff",
            cursor: loading ? "not-allowed" : "pointer",
            height: 42,
            marginTop: 18,
        }}>
            {loading ? "Refreshing..." : "Refresh"}
          </button>
        </div>
      </div>

        <div
  style={{
    marginTop: 22,
    marginBottom: 22,
  }}
>
  <OnboardingProgressCard
    onNavigate={onNavigate}
  />
</div>

{/* Intelligence tabs */}
<div
  style={{
    display: "flex",
    gap: 10,
    marginBottom: 18,
    marginTop: 4,
    paddingTop: 10,
    borderTop: "1px solid #e5e7eb",
  }}
>

</div>

      <div style={{
            display: "flex",
            gap: 10,
            marginBottom: 18,
            marginTop: 4,
            paddingTop: 10,
            borderTop: "1px solid #e5e7eb",
        }}>
        <TabButton active={activeTab === "STEWARD"} label="Steward Intelligence" onClick={() => setActiveTab("STEWARD")}/>
        <TabButton active={activeTab === "PROFILE"} label="Profile Intelligence"onClick={() => setActiveTab("PROFILE")}/>
        <TabButton active={activeTab === "DQ"} label="Data Quality Intelligence" onClick={() => setActiveTab("DQ")}/>
        <TabButton active={activeTab === "GOVERNANCE"} label="Governance Intelligence" onClick={() => setActiveTab("GOVERNANCE")}/>
      </div>
      {activeTab === "PROFILE" && (
        <ProfileIntelligencePage />
      )}
        {err && (
  <div
    style={{
      background: isGovernanceEmptyState
        ? "#eff6ff"
        : "#ffe8e8",
      border: isGovernanceEmptyState
        ? "1px solid #bfdbfe"
        : "1px solid #ffb3b3",
      padding: 12,
      borderRadius: 10,
      marginTop: 14,
      whiteSpace: "pre-wrap",
    }}
  >
    <b>
      {isGovernanceEmptyState
        ? "No governance policies yet"
        : "Error"}
    </b>

    <div>
      {isGovernanceEmptyState
        ? (
          "Create your first governance policy " +
          "to begin tracking governance KPIs " +
          "and stewardship activity."
        )
        : err}
    </div>
  </div>
)}
      
    {activeTab === "GOVERNANCE" && (
        <GovernanceIntelligence
          governance={governance}
          policyProfileRunId={policyProfileRunId}
          policyDomain={policyDomain}
        />
      )}

      <AiSystemStatus />

      {activeTab === "STEWARD" && (<>
          <div style={{
                fontSize: 12,
                fontWeight: 700,
                letterSpacing: 0.6,
                textTransform: "uppercase",
                color: "#6b7280",
                marginTop: 18,
                marginBottom: 10,
                paddingLeft: 4,
            }}>
            Executive Summary
          </div>

          <div style={{
                display: "grid",
                gridTemplateColumns: "repeat(12, minmax(0, 1fr))",
                gap: 20,
                marginTop: 16,
            }}>
            <div style={{ gridColumn: "span 6" }}>
              <HeroKpiCard title="AI Trust Score" value={aiTrustScore !== null ? `${aiTrustScore}/100` : "—"} valueColor={getTrustScoreColor(aiTrustScore)} badgeLabel={trustMeta?.label} badgeColor={trustMeta?.color} trendValue={4} trendLabel="this week" subtitle="Composite trust score based on precision, overrides, FP, and FN">
                <TrustScoreBar score={aiTrustScore}/>
              </HeroKpiCard>
            </div>

            <div style={{ gridColumn: "span 6" }}>
              <StewardImpactCard autoMergeCount={data?.recommended_actions?.APPROVE_MERGE ?? 0} stewardReviewCount={data?.recommended_actions?.REVIEW ?? 0} avgReviewMinutes={3}/>
            </div>

            <div style={{ gridColumn: "span 12" }}>
              <WhyTrustChangedCard precision={data?.precision} overrideRate={data?.override_rate} fpRate={data?.fp_rate} fnRate={data?.fn_rate} topOverrideReason={data?.top_override_reasons?.[0]?.name ?? null} topFpRule={data?.top_fp_rules?.[0]?.name ?? null} topFnRule={data?.top_fn_rules?.[0]?.name ?? null}/>
            </div>

            <div style={{ gridColumn: "span 3" }}>
              <HeroKpiCard title="Total Explanations" value={loading ? "…" : executiveKpis.totalExplanations} subtitle={`Observed over the last ${days} day${days === 1 ? "" : "s"}`}/>
            </div>

            <div style={{ gridColumn: "span 3" }}>
              <KpiCard title="Override Rate" value={loading ? "…" : executiveKpis.overrideRate} subtitle="Trust signal from steward feedback" accent="#ffd199" trend={-1} deltaValue="-2.1%" deltaLabel="vs last 7 days" sparkline={[0.74, 0.72, 0.71, 0.7, 0.69, 0.688]}/>
            </div>

            <div style={{ gridColumn: "span 3" }}>
              <KpiCard title="Precision" value={loading ? "…" : executiveKpis.precision} subtitle="Reviewed match decision accuracy" accent="#dff5df" trend={1} sparkline={[0.95, 0.96, 0.97, 0.98, 0.99, 1.0]}/>
            </div>

            <div style={{ gridColumn: "span 3" }}>
              <KpiCard title="AI Decision Confidence" value={loading ? "…" : executiveKpis.avgConfidence} subtitle="Average model confidence score" accent="#bfd3ff" trend={1} sparkline={[0.71, 0.73, 0.74, 0.76, 0.78, 0.79]}/>
            </div>
          </div>

          <div style={{
                marginTop: 12,
                display: "grid",
                gridTemplateColumns: "repeat(4, minmax(0, 1fr))",
                gap: 12,
            }}>
            <KpiCard title="Total Reviewed" value={data ? String(data.total_reviewed) : "—"} subtitle="Explanations with steward feedback" accent="#eef4ff"/>
            <KpiCard title="False Positives" value={data ? String(data.false_positives) : "—"} subtitle="AI matched, steward rejected" accent="#fdeeee"/>
            <KpiCard title="False Negatives" value={data ? String(data.false_negatives) : "—"} subtitle="AI rejected, steward matched" accent="#fff4e5"/>
            <KpiCard title="Review / Other" value={data ? String(data.review_or_other) : "—"} subtitle="Any review outcomes" accent="#f5f5f5"/>
          </div>

          <div style={{
                marginTop: 12,
                display: "grid",
                gridTemplateColumns: "repeat(4, minmax(0, 1fr))",
                gap: 12,
            }}>
            <KpiCard title="Avg Time to Feedback" value={data?.avg_time_to_feedback_minutes !== null &&
                data?.avg_time_to_feedback_minutes !== undefined
                ? `${num(data.avg_time_to_feedback_minutes)} min`
                : "—"} subtitle="Feedback latency" accent="#dff5df"/>
            <KpiCard title="Recall" value={num3(data?.recall)} subtitle="TP / (TP + FN)" accent="#dff5df"/>
            <KpiCard title="FP Rate" value={pct(data?.fp_rate)} subtitle="FP / reviewed" accent="#fdeeee"/>
            <KpiCard title="FN Rate" value={pct(data?.fn_rate)} subtitle="FN / reviewed" accent="#fff4e5"/>
          </div>

          <div style={{
                marginTop: 16,
                display: "grid",
                gridTemplateColumns: "1fr",
                gap: 12,
            }}>
            <LearningInsightsCard overrideRate={data?.override_rate} topFpRules={data?.top_fp_rules ?? []} topFnRules={data?.top_fn_rules ?? []} topOverrideReasons={data?.top_override_reasons ?? []}/>
          </div>

          <div style={{ marginTop: 16 }}>{data && <PolicyDriftCard data={data}/>}</div>

          <div style={{
                marginTop: 16,
                display: "grid",
                gridTemplateColumns: "1fr",
                gap: 12,
            }}>
            <LearningTimelineCard items={data?.learning_timeline ?? []}/>
          </div>

          <div style={{
                marginTop: 16,
                display: "grid",
                gridTemplateColumns: "1fr 1fr 1fr",
                gap: 12,
            }}>
            <DistCard title="AI Decisions" total={decisionsTotal} items={decisions}/>
            <DistCard title="Risk Flags" total={risksTotal} items={risks}/>
            <DistCard title="Recommended Actions" total={actionsTotal} items={actions}/>
          </div>

          <div style={{
                marginTop: 16,
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: 12,
            }}>
            <DistCard title="Match Score Buckets" total={scoreBucketsTotal} items={scoreBuckets}/>
            <BucketQualityCard title="FP/FN by Score Bucket" rows={data?.fpfn_by_score_bucket ?? []}/>
          </div>

          <div style={{
                marginTop: 16,
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: 12,
            }}>
            <TopList title="Top Triggered Rules" items={(data?.top_triggered_rules ?? []).map((x) => ({
                name: x.name,
                count: x.count,
            }))} emptyText="No rules found in this window." onItemClick={(name) => goToExplain(data?.domain, name)}/>
            <TopList title="Top Override Reasons" items={(data?.top_override_reasons ?? []).map((x) => ({
                name: x.name,
                count: x.count,
            }))} emptyText="No override reasons captured yet."/>
          </div>

          <div style={{
                marginTop: 16,
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: 12,
            }}>
            <TopList title="Top False-Positive Rules" items={topFpRules.map((x) => ({ name: x.name, count: x.count }))} emptyText="No false positives in this window."/>
            <TopList title="Top False-Negative Rules" items={topFnRules.map((x) => ({ name: x.name, count: x.count }))} emptyText="No false negatives in this window."/>
          </div>

          <div style={{ marginTop: 16, fontSize: 12, opacity: 0.72 }}>
            Tip: Use this view for operational visibility. Use Looker for historical trending and executive reporting.
          </div>
        </>)}

      {activeTab === "DQ" && (
        <DqIntelligence
          dqRows={dqRows}
          stewardData={data}
          approvedDqRecommendations={approvedDqRecommendations}
          dqRuleSuggestions={dqRuleSuggestions}
        />
      )}
    </div>
  );
}