// src/pages/ExplainPage.tsx

import React, { useEffect, useMemo, useState, useRef } from "react";
import { StewardFeedbackPanel } from "../components/explain/StewardFeedbackPanel";
import { StewardLearningTimeline } from "../components/explain/StewardLearningTimeline";
import { DecisionCopilotPanel } from "../components/explain/DecisionCopilotPanel";
import { AILearningPanel } from "../components/explain/AILearningPanel";
import { SignalAttributionStrip } from "../components/explain/SignalAttributionStrip";

import { AddressIntelligencePanel } from "../components/explain/AddressIntelligencePanel";

import {
  ConfidenceBlocks,
  Field,
  Pill,
} from "../components/explain/ExplainPrimitives";

import { RecordCard } from "../components/explain/RecordCard";
import { matchExplain, matchFeedback } from "../api/client";
import RecordCompare from "../components/record/RecordCompare";
import type {
  DomainType,
  MatchExplainRequest,
  MatchExplainResponse,
  MatchFeedbackRequest,
  MatchFeedbackResponse,
} from "../api/types";
import RecordSearchBox from "../components/RecordSearchBox";

import { AIDecisionSummary } from "../components/explain/AIDecisionSummary";
import { AIReasoningTimeline } from "../components/explain/AIReasoningTimeline";



type DecisionValue = "APPROVE_MERGE" | "REVIEW" | "REJECT_MERGE";

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



const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "10px 10px",
  borderRadius: 10,
  border: "1px solid #ccc",
  outline: "none",
  boxSizing: "border-box",
};

const defaultRequestedBy = "steward_ui";
const defaultStewardUser = "steward_ui";
const defaultDomain: DomainType = "CUSTOMER";
const DEFAULT_STEWARD_DECISION: DecisionValue = "REVIEW";

const DOMAIN_OPTIONS: DomainType[] = [
  "CUSTOMER",
  "SUPPLIER",
  "PRODUCT",
  "BANKING",
  "PATIENT",
  "PROVIDER",
  "LOCATION",
  "ORGANIZATION",
];

const DOMAIN_RULE_PRESETS: Record<DomainType, string[]> = {
  CUSTOMER: [
    "MEMBER_ID_EXACT",
    "FULL_NAME_SIMILAR",
    "DOB_EXACT",
    "EMAIL_MATCH",
    "PHONE_MATCH",
    "ADDRESS_MATCH",
],

  SUPPLIER: [
    "SUPPLIER_NAME_SIMILAR",
    "ADDRESS_MATCH",
    "PHONE_MATCH",
    "CONTACT_EMAIL_MATCH",
    "SUPPLIER_ID_EXACT",
  ],

  PRODUCT: [
    "GTIN_MATCH",
    "SKU_MATCH",
    "PRODUCT_NAME_SIMILAR",
    "DESCRIPTION_SIMILAR",
    "UOM_MATCH",
  ],

  OTHER: [
    "NAME_SIMILAR",
    "ADDRESS_MATCH",
    "EMAIL_MATCH",
    "ENTITY_ID_EXACT",
  ],
  BANKING: [
  "account_id_match",
  "banking_customer_id_match",
  "sap_business_partner_id_match",
  "routing_number_match",
  "account_number_last4_match",
  "institution_name_match",
  "account_type_match",
  "currency_match",
  "account_status_match",
  "email_match",
  "phone_number_match",
  "source_system_match",
],

  PATIENT: [
  "PATIENT_ID_MATCH",
  "DOB_MATCH",
  "HUMAN_ID_MATCH",
  "NAME_SIMILARITY",
  "EMAIL_MATCH",
  "ADDRESS_SIMILARITY",
  "SOURCE_TRUST",
],

PROVIDER: [
  "PROVIDER_ID_MATCH",
  "NAME_SIMILAR",
  "ADDRESS_MATCH",
  "EMAIL_MATCH",
  "NPI_MATCH",
  "PHONE_MATCH",
  "SPECIALTY_SIMILAR",
  "SOURCE_TRUST_MATCH",
],

LOCATION: [
  "LOCATION_ID_MATCH",
  "SITE_ID_MATCH",
  "LOCATION_CODE_MATCH",
  "LOCATION_NAME_SIMILARITY",
  "ADDRESS_SIMILARITY",
  "PARENT_LOCATION_ID_MATCH",
  "ORGANIZATION_ENTITY_ID_MATCH",
  "SOURCE_TRUST",
],

ORGANIZATION: [
  "ORGANIZATION_ENTITY_ID_MATCH",
  "ORGANIZATION_CODE_MATCH",
  "ORGANIZATION_NAME_SIMILARITY",
  "ORGANIZATION_TYPE_MATCH",
  "PARENT_ORGANIZATION_ID_MATCH",
  "ORGANIZATION_STATUS_MATCH",
  "SOURCE_TRUST",
],

};


const DOMAIN_OVERRIDE_REASON_OPTIONS: Record<DomainType, string[]> = {
  CUSTOMER: [
    "FALSE_POSITIVE",
    "FALSE_NEGATIVE",
    "ADDRESS_MISMATCH",
    "DOB_MISMATCH",
    "EMAIL_MISMATCH",
    "NAME_COLLISION",
    "HOUSEHOLD_DIFFERENCE",
    "INSUFFICIENT_EVIDENCE",
    "POLICY_EXCEPTION",
    "OTHER",
  ],
  SUPPLIER: [
    "SUPPLIER_NAME_COLLISION",
    "TAX_ID_MISMATCH",
    "ADDRESS_MISMATCH",
    "CONTACT_MISMATCH",
    "DUPLICATE_SITE_CONFUSION",
    "INSUFFICIENT_EVIDENCE",
    "POLICY_EXCEPTION",
    "OTHER",
  ],
  PRODUCT: [
    "GTIN_MISMATCH",
    "SKU_MISMATCH",
    "BRAND_MISMATCH",
    "DESCRIPTION_CONFLICT",
    "UOM_MISMATCH",
    "PACK_SIZE_MISMATCH",
    "INSUFFICIENT_EVIDENCE",
    "POLICY_EXCEPTION",
    "OTHER",
  ],
  OTHER: [
    "NAME_COLLISION",
    "ADDRESS_MISMATCH",
    "IDENTIFIER_MISMATCH",
    "INSUFFICIENT_EVIDENCE",
    "POLICY_EXCEPTION",
    "OTHER",
  ],
  BANKING: [
  "Incorrect Account Match",
  "Incorrect Customer Identity",
  "Routing Number Conflict",
  "Account Status Conflict",
  "Institution Mismatch",
  "Insufficient Banking Evidence",
  "Other",
],
  PATIENT: [
    "PATIENT_ID_MISMATCH",
    "DOB_MISMATCH",
    "ADDRESS_MISMATCH",
    "EMAIL_MISMATCH",
    "HUMAN_ID_MISMATCH",
    "POTENTIAL_OVERLAY",
    "POTENTIAL_DUPLICATE_PATIENT",
    "INSUFFICIENT_EVIDENCE",
    "POLICY_EXCEPTION",
    "OTHER",
  ],

  PROVIDER: [
    "NPI_MISMATCH",
    "PHONE_MISMATCH",
    "SPECIALTY_CONFLICT",
    "ADDRESS_MISMATCH",
    "PROVIDER_NAME_COLLISION",
    "LICENSING_CONFLICT",
    "INSUFFICIENT_EVIDENCE",
    "POLICY_EXCEPTION",
    "OTHER",
  ],

  LOCATION: [
  "LOCATION_ID_MISMATCH",
  "SITE_ID_MISMATCH",
  "LOCATION_CODE_MISMATCH",
  "LOCATION_NAME_CONFLICT",
  "ADDRESS_MISMATCH",
  "PARENT_LOCATION_MISMATCH",
  "ORGANIZATION_MISMATCH",
  "INSUFFICIENT_EVIDENCE",
  "POLICY_EXCEPTION",
  "OTHER",
],

ORGANIZATION: [
  "ORGANIZATION_ID_MISMATCH",
  "ORGANIZATION_CODE_MISMATCH",
  "ORGANIZATION_NAME_CONFLICT",
  "ORGANIZATION_TYPE_CONFLICT",
  "PARENT_ORGANIZATION_MISMATCH",
  "ORGANIZATION_STATUS_CONFLICT",
  "INSUFFICIENT_EVIDENCE",
  "POLICY_EXCEPTION",
  "OTHER",
],

};

function safeJsonError(err: unknown): string {
  if (err instanceof Error) return err.message;
  try {
    return JSON.stringify(err);
  } catch {
    return String(err);
  }
}

function clampNumber(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function toPercent(value?: number | null): number {
  if (typeof value !== "number" || Number.isNaN(value)) return 0;
  return clampNumber(Math.round(value * 100), 0, 100);
}

function getDecisionConfidence(
  result?: MatchExplainResponse | null
): number {
  if (!result) return 0;

  if (typeof result.decision_confidence_score === "number") {
    return clampNumber(
      Math.round(result.decision_confidence_score),
      0,
      100
    );
  }

  return toPercent(result.confidence);
}

function toSafeNumber(value?: number | null, fallback = 0): number {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}


function rulesToText(domain: DomainType): string {
  return DOMAIN_RULE_PRESETS[domain]?.join(", ") ?? "";
}


function getOverrideReasonOptions(domain: DomainType): string[] {
  return (
    DOMAIN_OVERRIDE_REASON_OPTIONS[domain] ??
    DOMAIN_OVERRIDE_REASON_OPTIONS.OTHER
  );
}

function getMemberIdLabel(domain: DomainType): string {
  switch (domain) {
    case "CUSTOMER":
      return "Member ID";

    case "PATIENT":
      return "Patient ID";

    case "SUPPLIER":
      return "Supplier ID";

    case "PRODUCT":
      return "Product ID";

    case "PROVIDER":
      return "Provider ID";
    
    case "BANKING":
      return "Account ID";

    default:
      return "Record ID";
      
    case "OTHER":
      return "Entity ID";

    case "LOCATION":
      return "Location ID";

    case "ORGANIZATION":
      return "Organization ID";
  }

}


function coerceOptionalNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim() !== "") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

function getOverrideRateEstimate(
  result?: MatchExplainResponse | null
): number | null {
  if (!result) return null;


   const candidate = result as MatchExplainResponse & {
    override_rate_estimate?: unknown;
    policy_metrics?: { override_rate_estimate?: unknown } | null;
    steward_learning_signal?: { override_rate_estimate?: unknown } | null;
  };

  return (
    coerceOptionalNumber(candidate.override_rate_estimate) ??
    coerceOptionalNumber(candidate.policy_metrics?.override_rate_estimate) ??
    coerceOptionalNumber(
      candidate.steward_learning_signal?.override_rate_estimate
    )
  );
}

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

function displayDecision(value?: string | null): string {
  const v = (value ?? "").toUpperCase();

  switch (v) {
    case "AUTO_MERGE":
    case "APPROVE_MERGE":
    case "REVIEW":
    case "REVIEW_REQUIRED":
    case "REJECT_MERGE":
    case "BLOCK_MERGE":
      return v;
    default:
      return v || "UNKNOWN";
  }
}

function formatAutomationLabel(value?: string | null): string | undefined {
  if (!value) return undefined;
  return value.split("_").join(" ");
}

function formatPolicyStatus(value?: string | null): string | undefined {
  if (!value) return undefined;
  return value.split("_").join(" ");
}

function getCopilotRecommendation(action?: string | null): string | undefined {
  const v = (action ?? "").toUpperCase();

  switch (v) {
    case "AUTO_MERGE":
      return "Eligible for auto-merge. Policy, confidence, and risk posture support safe automation.";
    case "APPROVE_MERGE":
      return "Strong merge candidate. Evidence is supportive and approval posture is favorable.";
    case "REVIEW_REQUIRED":
    case "REVIEW":
      return "Hold merge and request steward validation due to mixed evidence or policy sensitivity.";
    case "BLOCK_MERGE":
    case "REJECT_MERGE":
      return "Do not merge. Policy risk or conflicting evidence makes automation unsafe.";
    default:
      return undefined;
  }
}

function getEstimatedFalsePositiveRisk(result: MatchExplainResponse): number {
  if (typeof result.estimated_false_positive_risk === "number") {
    return clampNumber(result.estimated_false_positive_risk, 0, 100);
  }

  const overrideRateEstimate = getOverrideRateEstimate(result);
  if (overrideRateEstimate !== null) {
    return clampNumber(Math.round(overrideRateEstimate * 100), 0, 100);
  }

  if (typeof result.composite_risk_score === "number") {
    return clampNumber(Math.round(result.composite_risk_score * 0.16), 0, 100);
  }

  return 0;
}

function getAutomationConfidenceDisplay(result: MatchExplainResponse): number {
  if (typeof result.automation_readiness_score === "number") {
    return clampNumber(result.automation_readiness_score, 0, 100);
  }

  if (typeof result.decision_confidence_score === "number") {
    return clampNumber(Math.round(result.decision_confidence_score), 0, 100);
  }

  if (typeof result.confidence === "number") {
    return toPercent(result.confidence);
  }

  if (typeof result.composite_risk_score === "number") {
    return clampNumber(
      Math.round((1 - result.composite_risk_score / 100) * 100 + 40),
      0,
      100
    );
  }

  return 0;
}

function getAutomationReadinessFallback(
  compositeRiskScore?: number | null,
  confidence?: number | null,
  recommendedAction?: string | null
) {
  const risk = clampNumber(toSafeNumber(compositeRiskScore, 0), 0, 100);
  const conf = clampNumber(toPercent(confidence), 0, 100);
  const action = (recommendedAction ?? "").toUpperCase();

  let readiness = Math.round(conf * 0.6 + (100 - risk) * 0.4);

  if (action.includes("REVIEW")) readiness = Math.max(25, readiness - 10);
  if (action.includes("REJECT") || action.includes("BLOCK")) {
    readiness = Math.max(10, readiness - 20);
  }
  if (action.includes("APPROVE") || action.includes("AUTO")) {
    readiness = Math.min(100, readiness + 8);
  }

  let label = "Moderate Automation Potential";
  let tone = "#8a4b00";
  let track = "#fff4e5";
  let fill = "#f59e0b";

  if (readiness >= 75) {
    label = "High Automation Potential";
    tone = "#176b2c";
    track = "#e8f7ec";
    fill = "#16a34a";
  } else if (readiness >= 45) {
    label = "Ready for Review";
    tone = "#8a4b00";
    track = "#fff4e5";
    fill = "#f59e0b";
  } else {
    label = "Low Automation Readiness";
    tone = "#8a1c1c";
    track = "#fdeeee";
    fill = "#dc2626";
  }

  return { readiness, label, tone, track, fill };
}

function getDomainFieldLabels(domain: DomainType) {
  switch (domain) {
      case "CUSTOMER":
        return {
        first: "Full Name",
        dob: "DOB (YYYY-MM-DD)",
        email: "Email",
        phoneNumber: "Phone Number",
        address: "Address",
  };

      case "SUPPLIER":
        return {
        first: "supplier_name_line_1",
        last: "supplier_name_line_2",
        dob: "tax_id",
        email: "contact_email",
        address: "supplier_address",
      };
      
      case "PRODUCT":
        return {
        first: "Product Name",
        email: "GTIN",
        last: "Product Variant / Pack Size",
        dob: "Item Category",
        address: "SKU",
      };

      case "PROVIDER":
        return {
          first: "provider_first_name",
          last: "provider_last_name",

          dob: "Specialty",

          email: "provider_email",
          address: "provider_address",

          providerId: "provider_id",
          phoneNumber: "phone_number",
          npi: "npi",
      };

      case "PATIENT":
          return {
            first: "First Name",
            last: "Last Name",
            dob: "DOB (YYYY-MM-DD)",
            email: "Email",
            phoneNumber: "Phone Number",
            humanId: "Human ID",
            address: "Address",
        };

      case "BANKING":
          return {
            first: "Banking Customer ID",
            last: "SAP Business Partner ID",
            dob: "Routing Number",
            email: "Email",
            phoneNumber: "Phone Number",
            address: "Institution Name",
            sourceSystem: "Source System",
          };

      case "OTHER":
        default:
          return {
            first: "name_line_1",
            last: "name_line_2",
            dob: "date / reference",
            email: "email / identifier",
            address: "address / descriptor",
          };

      case "LOCATION":
        return {
          first: "Location Name",
          last: "Location Type",
          dob: "Location Code / Site ID",
          email: "Organization Entity ID",
          address: "Location Address",
        };

      case "ORGANIZATION":
        return {
          first: "Organization Name",
          last: "Organization Type",
          dob: "Organization Code",
          email: "Parent Organization ID",
          address: "Organization Status",
        };
  }
}

function DecisionConfidenceMeter(props: {
  automationReadinessScore?: number | null;
  automationReadinessLabel?: string | null;
  automationPolicyStatus?: string | null;
  estimatedFalsePositiveRisk?: number | null;
  compositeRiskScore?: number | null;
  confidence?: number | null;
  recommendedAction?: string | null;
}) {
  const fallback = getAutomationReadinessFallback(
    props.compositeRiskScore,
    props.confidence,
    props.recommendedAction
  );


  const readiness =
    typeof props.automationReadinessScore === "number"
      ? clampNumber(props.automationReadinessScore, 0, 100)
      : fallback.readiness;

  const label =
    formatAutomationLabel(props.automationReadinessLabel) ?? fallback.label;

  const policyStatus = formatPolicyStatus(props.automationPolicyStatus);

  const fpRisk =
    typeof props.estimatedFalsePositiveRisk === "number"
      ? clampNumber(props.estimatedFalsePositiveRisk, 0, 100)
      : Math.round(
          clampNumber(toSafeNumber(props.compositeRiskScore, 0), 0, 100) * 0.16
        );

  let tone = fallback.tone;
  let track = fallback.track;
  let fill = fallback.fill;

  if (readiness >= 85) {
    tone = "#176b2c";
    track = "#e8f7ec";
    fill = "#16a34a";
  } else if (readiness >= 60) {
    tone = "#8a4b00";
    track = "#fff4e5";
    fill = "#f59e0b";
  } else {
    tone = "#8a1c1c";
    track = "#fdeeee";
    fill = "#dc2626";
  }

  return (
    <div
      style={{
        border: "1px solid #e5e7eb",
        borderRadius: 14,
        padding: 14,
        background: "#fff",
        minWidth: 260,
      }}
    >
      <div
        style={{
          fontSize: 12,
          opacity: 0.72,
          marginBottom: 8,
          display: "flex",
          alignItems: "center",
          gap: 6,
        }}
      >
        <span style={{ fontSize: 14 }}>⚙️</span>
        Automation Readiness
      </div>

      <div
        style={{
          display: "flex",
          alignItems: "baseline",
          justifyContent: "space-between",
          gap: 10,
          marginBottom: 8,
        }}
      >
        <div style={{ fontSize: 28, fontWeight: 800, color: tone }}>
          {readiness}%
        </div>
        <div
          style={{
            fontSize: 12,
            fontWeight: 700,
            color: tone,
            textAlign: "right",
          }}
        >
          {label}
        </div>
      </div>

      <div
        style={{
          height: 10,
          width: "100%",
          borderRadius: 999,
          background: track,
          overflow: "hidden",
          border: "1px solid #e5e7eb",
        }}
      >
        <div
          style={{
            width: `${readiness}%`,
            height: "100%",
            background: fill,
            transition: "width 0.8s cubic-bezier(.22,.61,.36,1)",
          }}
        />
      </div>

      {policyStatus ? (
        <div
          style={{
            marginTop: 10,
            fontSize: 12.5,
            fontWeight: 700,
            color: tone,
          }}
        >
          Policy Status: {policyStatus}
        </div>
      ) : null}

      <div style={{ marginTop: 8, fontSize: 12.5, opacity: 0.82 }}>
        Estimated False Positive Risk: {fpRisk}%
      </div>
    </div>
  );
}

function fetchAuthHeaders(): HeadersInit {
  const token = localStorage.getItem("token");
  return token ? { Authorization: `Bearer ${token}` } : {};
}

async function fetchMetricsOverview(days = 30): Promise<{
  learning_timeline?: LearningTimelineItem[];
}> {
  const res = await fetch(
    `${import.meta.env.VITE_API_BASE_URL}/v1/metrics/overview?days=${days}`,
    {
      headers: fetchAuthHeaders(),
    }
  );

  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || `HTTP ${res.status}`);
  }

  return res.json();
}

type ExplainPageProps = {
  organizationId: string | null;
  organizationName: string | null;
};

export default function ExplainPage({
  organizationId,
  organizationName,
}: ExplainPageProps) {
    
   

  const [domain, setDomain] = useState<DomainType>(defaultDomain);
  
  const [matchScore, setMatchScore] = useState<number>(0.92);
  const [requestedBy, setRequestedBy] = useState<string>(defaultRequestedBy);
  const [triggeredRulesText, setTriggeredRulesText] = useState<string>(
    rulesToText(defaultDomain)
  );
  

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = 
    useState<MatchExplainResponse | null>(null);

  const explainRequestInFlight = useRef(false);
  
  const engineConfidence = getDecisionConfidence(result);

  const compositeRiskScore = Number
    (result?.composite_risk_score ?? 0
    );

  const compositeRiskBand =
    result?.risk_flag?.toUpperCase() ??
    result?.composite_risk_band?.toUpperCase() ??
    (compositeRiskScore >= 70
      ? "HIGH"
      : compositeRiskScore >= 35
        ? "MEDIUM"
        : "LOW");
  
  const showHumanId =
        domain === "CUSTOMER" ||
        domain === "PATIENT";

  const [stewardDecision, setStewardDecision] =
    useState<DecisionValue>(DEFAULT_STEWARD_DECISION);
  const [overrideReason, setOverrideReason] = useState<string>("");
  const [overrideReasonCode, setOverrideReasonCode] =
    useState<NonNullable<MatchFeedbackRequest["override_reason_code"]>>("OTHER");
  const [overrideReasonNote, setOverrideReasonNote] = useState<string>("");
  const [stewardUser, setStewardUser] = useState<string>(defaultStewardUser);
  const [feedbackLoading, setFeedbackLoading] = useState(false);
  const [feedbackMsg, setFeedbackMsg] = useState<string | null>(null);
  const [learningTimeline, setLearningTimeline] = useState<
    LearningTimelineItem[]
  >([]);
  const [rulesDirty, setRulesDirty] = useState(false);

  const [a_member_id, setA_member_id] = useState("");
  const [a_first, setA_first] = useState("");
  const [a_last, setA_last] = useState("");
  const [a_phone, setAPhone] = useState("");
  const [a_dob, setA_dob] = useState("");
  const [a_email, setA_email] = useState("");
  const [a_address, setA_address] = useState("");
  const [a_source_system, setA_source_system] = useState("");
  const [a_npi, setA_npi] = useState("");
  const [a_human_id, setA_human_id] = useState("");
  const [a_account_type, setA_account_type] = useState("");
  const [a_account_number_last4, setA_account_number_last4] = useState("");
  const [a_currency, setA_currency] = useState("");
  const [a_account_status, setA_account_status] = useState("");

  // LOCATION domain state - Record A
  const [a_location_id, setA_location_id] = useState("");
  const [a_site_id, setA_site_id] = useState("");
  const [a_location_code, setA_location_code] = useState("");
  const [a_location_name, setA_location_name] = useState("");
  const [a_location_type, setA_location_type] = useState("");
  const [a_location_address, setA_location_address] = useState("");
  const [a_parent_location_id, setA_parent_location_id] = useState("");

  const [b_member_id, setB_member_id] = useState("");
  const [b_first, setB_first] = useState("");
  const [b_last, setB_last] = useState("");
  const [b_phone, setBPhone] = useState("");
  const [b_dob, setB_dob] = useState("");
  const [b_email, setB_email] = useState("");
  const [b_address, setB_address] = useState("");
  const [b_source_system, setB_source_system] = useState("");
  const [b_npi, setB_npi] = useState("");
  const [b_human_id, setB_human_id] = useState("");
  const [b_account_type, setB_account_type] = useState("");
  const [b_account_number_last4, setB_account_number_last4] = useState("");
  const [b_currency, setB_currency] = useState("");
  const [b_account_status, setB_account_status] = useState("");
  // LOCATION domain state - Record B
  const [b_location_id, setB_location_id] = useState("");
  const [b_site_id, setB_site_id] = useState("");
  const [b_location_code, setB_location_code] = useState("");
  const [b_location_name, setB_location_name] = useState("");
  const [b_location_type, setB_location_type] = useState("");
  const [b_location_address, setB_location_address] = useState("");
  const [b_parent_location_id, setB_parent_location_id] = useState("");

  useEffect(() => {
    if (!rulesDirty) {
      setTriggeredRulesText(rulesToText(domain));
    }
  }, [domain, rulesDirty]);

  const fieldLabels = useMemo(() => getDomainFieldLabels(domain), [domain]);
  const overrideReasonOptions = useMemo(
    () => getOverrideReasonOptions(domain),
    [domain]
  );

  const triggeredRules = useMemo(() => {
  const baseRules = triggeredRulesText
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);

  if (domain !== "PRODUCT") {
    return baseRules;
  }

  const dynamicRules = baseRules.filter(
    (rule) => rule !== "GTIN_MATCH"
  );

  const gtinA = a_email.trim().toLowerCase();
  const gtinB = b_email.trim().toLowerCase();

  if (gtinA && gtinB && gtinA === gtinB) {
    dynamicRules.push("GTIN_MATCH");
  }

  return dynamicRules;
}, [triggeredRulesText, domain, a_email, b_email]);


  const normalizedRecommendedAction = normalizeDecision(
    result?.final_recommended_action ?? result?.recommended_action
  );
  const isOverride = !!result && stewardDecision !== normalizedRecommendedAction;



  function applyDomainPreset(nextDomain: DomainType) {
    setDomain(nextDomain);
    setTriggeredRulesText(rulesToText(nextDomain));
    setRulesDirty(false);
    setStewardDecision(DEFAULT_STEWARD_DECISION);
    setOverrideReason("");
    setOverrideReasonCode("OTHER");
    setOverrideReasonNote("");
    setResult(null);
    setFeedbackMsg(null);
    setError(null);
    setLearningTimeline([]);
  }

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const urlDomain = params.get("domain");
    const urlRules = params.get("rules");

    if (urlDomain && DOMAIN_OPTIONS.includes(urlDomain as DomainType)) {
      applyDomainPreset(urlDomain as DomainType);
    }

    if (urlRules) {
      const decodedRules = urlRules
        .split(",")
        .map((r) => r.trim())
        .filter(Boolean)
        .join(", ");

      setTriggeredRulesText(decodedRules);
      setRulesDirty(true);
    }
  }, []);

  async function refreshLearningTimeline() {
    try {
      const metrics = await fetchMetricsOverview(30);
      setLearningTimeline(metrics.learning_timeline ?? []);
    } catch {
      // do not block UI on metrics refresh failure
    }
  }
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
   const onExplain = async (e: React.FormEvent) => {
  e.preventDefault();

  if (explainRequestInFlight.current) {
    console.warn(
      "Duplicate match explanation submit suppressed.",
    );
    return;
  }

  if (!organizationId) {
    setError(
      "Organization context is not ready. Please wait a moment and try again.",
    );
    return;
  }

  const token = localStorage.getItem("token");

  if (!token) {
    setError(
      "Authentication session is not ready. Please sign in again.",
    );
    return;
  }

  explainRequestInFlight.current = true;

    setError(null);
    setFeedbackMsg(null);
    setLoading(true);
    setResult(null);
    setOverrideReason("");
    setOverrideReasonCode("OTHER");
    setOverrideReasonNote("");
    console.log("submit wired");

    const effectiveTriggeredRules = triggeredRulesText
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean)
    .filter((rule) => {
    if (domain === "SUPPLIER" && rule === "TAX_ID_MATCH") {
      return Boolean(
        a_dob.trim() &&
        b_dob.trim() &&
        a_dob.trim() === b_dob.trim()
      );
    }

    return true;
  });


const payload: MatchExplainRequest = {
  record_a:
    domain === "PRODUCT"
      ? {
          member_id: "",
          product_id: a_member_id.trim() || undefined,
          product_name: a_first || undefined,
          product_variant: a_last || undefined,
          item_category: a_dob || undefined,
          gtin: a_email || undefined,
          sku: a_address || undefined,
          source_system: a_source_system.trim() || undefined,
        }
      : domain === "PROVIDER"
      ? {
          member_id: "",
          provider_id: a_member_id.trim() || undefined,
          provider_first_name: a_first || undefined,
          phone_number: a_phone.trim() || undefined,
          provider_last_name: a_last || undefined,
          npi: a_npi.trim() || undefined,
          provider_email: a_email || undefined,
          specialty: a_dob || undefined,
          provider_address: a_address || undefined,
          source_system: a_source_system.trim() || undefined,
        }
      : domain === "PATIENT"
      ? {
          member_id: "",
          patient_id: a_member_id.trim() || undefined,
          patient_first_name: a_first || undefined,
          patient_last_name: a_last || undefined,
          first_name: a_first || undefined,
          last_name: a_last || undefined,
          phone_number: a_phone.trim() || undefined,
          human_id: a_human_id.trim() || undefined,
          patient_dob: a_dob || undefined,
          dob: a_dob || undefined,
          patient_email: a_email || undefined,
          email: a_email || undefined,
          patient_address: a_address || undefined,
          address: a_address || undefined,
          source_system: a_source_system.trim() || undefined,
        }
     : domain === "SUPPLIER"
      ? {
          member_id: "",
          supplier_id: a_member_id.trim() || undefined,
          supplier_name: a_first.trim() || undefined,
          supplier_name_line_1: a_first.trim() || undefined,
          supplier_name_line_2: a_last.trim() || undefined,
          tax_id: a_dob || undefined,
          contact_email: a_email.trim() || undefined,
          supplier_address: a_address.trim() || undefined,
          source_system: a_source_system.trim() || undefined,
        }

      : domain === "BANKING"
      ? {
          member_id: "",
          account_id: a_member_id.trim() || undefined,
          banking_customer_id: a_first.trim() || undefined,
          sap_business_partner_id: a_last.trim() || undefined,
          routing_number: a_dob.trim() || undefined,
          account_number_last4:
          a_account_number_last4.trim() || undefined,
          institution_name: a_address.trim() || undefined,
          account_type: a_account_type.trim() || undefined,
          currency: a_currency.trim() || undefined,
          account_status: a_account_status.trim() || undefined,
          email: a_email.trim() || undefined,
          phone_number: a_phone.trim() || undefined,
          source_system: a_source_system.trim() || undefined,
        }

      : domain === "ORGANIZATION"
      ? {
          member_id: a_member_id.trim(),
          organization_entity_id: a_member_id.trim() || undefined,
          organization_code: a_dob.trim() || undefined,
          organization_name: a_first.trim() || undefined,
          organization_type: a_last.trim() || undefined,
          parent_organization_id: a_email.trim() || undefined,
          organization_status: a_address.trim() || undefined,
          source_system: a_source_system.trim() || undefined,
        }

            : domain === "LOCATION"
      ? {
          member_id: a_location_id.trim(),
          location_id: a_location_id.trim() || undefined,
          site_id: a_site_id.trim() || undefined,
          location_code: a_location_code.trim() || undefined,
          location_name: a_location_name.trim() || undefined,
          location_type: a_location_type.trim() || undefined,
          location_address: a_location_address.trim() || undefined,
          parent_location_id: a_parent_location_id.trim() || undefined,
          source_system: a_source_system.trim() || undefined,
        }
      : {
          member_id: a_member_id.trim(),
          full_name: a_first.trim() || undefined,
          phone_number: a_phone.trim() || undefined,
          dob: a_dob || undefined,
          email: a_email || undefined,
          address: a_address || undefined,
          source_system: a_source_system.trim() || undefined,
  },

  record_b:
     domain === "PRODUCT"
      ? {
          member_id: "",
          product_id: b_member_id.trim() || undefined,
          product_name: b_first || undefined,
          product_variant: b_last || undefined,
          item_category: b_dob || undefined,
          gtin: b_email || undefined,
          sku: b_address || undefined,
          source_system: b_source_system.trim() || undefined,
        }

    : domain === "PROVIDER"
      ? {
          member_id: "",
          provider_id: b_member_id.trim() || undefined,
          phone_number: b_phone.trim() || undefined,
          provider_first_name: b_first || undefined,
          provider_last_name: b_last || undefined,
          npi: b_npi.trim() || undefined,
          provider_email: b_email || undefined,
          specialty: b_dob || undefined,
          provider_address: b_address || undefined,
          source_system: b_source_system.trim() || undefined,
        }

    : domain === "PATIENT"
      ? {
          member_id: "",
          patient_id: b_member_id.trim() || undefined,
          patient_first_name: b_first || undefined,
          patient_last_name: b_last || undefined,
          first_name: b_first || undefined,
          last_name: b_last || undefined,
          phone_number: b_phone.trim() || undefined,
          human_id: b_human_id.trim() || undefined,
          patient_dob: b_dob || undefined,
          dob: b_dob || undefined,
          patient_email: b_email || undefined,
          email: b_email || undefined,
          patient_address: b_address || undefined,
          address: b_address || undefined,
          source_system: b_source_system.trim() || undefined,
  }

    : domain === "SUPPLIER"
      ? {
          member_id: "",
          supplier_id: b_member_id.trim() || undefined,
          supplier_name: b_first || undefined,
          supplier_name_line_1: b_first || undefined,
          supplier_name_line_2: b_last || undefined,
          tax_id: b_dob || undefined,
          contact_email: b_email || undefined,
          supplier_address: b_address || undefined,
          source_system: b_source_system.trim() || undefined,
        }

    : domain === "BANKING"
      ? {
          member_id: "",
          account_id: b_member_id.trim() || undefined,
          banking_customer_id: b_first.trim() || undefined,
          sap_business_partner_id: b_last.trim() || undefined,
          routing_number: b_dob.trim() || undefined,
          account_number_last4:
            b_account_number_last4.trim() || undefined,
          institution_name: b_address.trim() || undefined,
          account_type: b_account_type.trim() || undefined,
          currency: b_currency.trim() || undefined,
          account_status: b_account_status.trim() || undefined,
          email: b_email.trim() || undefined,
          phone_number: b_phone.trim() || undefined,
          source_system: b_source_system.trim() || undefined,
        }

    : domain === "ORGANIZATION"
    ? {
        member_id: b_member_id.trim(),
        organization_entity_id: b_member_id.trim() || undefined,
        organization_code: b_dob.trim() || undefined,
        organization_name: b_first.trim() || undefined,
        organization_type: b_last.trim() || undefined,
        parent_organization_id: b_email.trim() || undefined,
        organization_status: b_address.trim() || undefined,
        source_system: b_source_system.trim() || undefined,
      }

    : domain === "LOCATION"
    ? {
        member_id: b_location_id.trim(),
        location_id: b_location_id.trim() || undefined,
        site_id: b_site_id.trim() || undefined,
        location_code: b_location_code.trim() || undefined,
        location_name: b_location_name.trim() || undefined,
        location_type: b_location_type.trim() || undefined,
        location_address: b_location_address.trim() || undefined,
        parent_location_id: b_parent_location_id.trim() || undefined,
        source_system: b_source_system.trim() || undefined,
      }

      : {
          member_id: b_member_id.trim(),
          full_name: b_first.trim() || undefined,
          phone_number: b_phone.trim() || undefined,
          dob: b_dob || undefined,
          email: b_email || undefined,
          address: b_address || undefined,
          source_system: b_source_system.trim() || undefined,
      },

          domain,
          match_score: Number(matchScore),
          requested_by: requestedBy,
          triggered_rules: effectiveTriggeredRules,

    };
         

try {
  const res: MatchExplainResponse =
    await matchExplain(payload);

  const tenantScopedResponse =
    res as MatchExplainResponse & {
      organization_id?: string | null;
    };

  if (
    tenantScopedResponse.organization_id &&
    tenantScopedResponse.organization_id !== organizationId
  ) {
    throw new Error(
      "Security validation failed: the returned match explanation belongs to a different organization.",
    );
  }

  setResult(res);

  setTriggeredRulesText(
    (res.triggered_rules || []).join(", "),
  );

  setStewardDecision(
    normalizeDecision(
      res.final_recommended_action ??
        res.recommended_action,
    ),
  );

  await refreshLearningTimeline();
} catch (err) {
  setError(safeJsonError(err));
} finally {
  setLoading(false);
}
};

  async function onSubmitFeedback() {
    if (!result?.explanation_id) return;

    setError(null);
    setFeedbackMsg(null);
    setFeedbackLoading(true);

    const payload: MatchFeedbackRequest = {
      explanation_id: result.explanation_id,
      steward_decision:
      stewardDecision as MatchFeedbackRequest["steward_decision"],
      steward_override_reason: isOverride ? overrideReason.trim() || null : null,
      override_reason_code: isOverride ? overrideReasonCode : null,
      override_reason_note: overrideReasonNote.trim() || null,
      steward_user: stewardUser.trim() || defaultStewardUser,
      domain: result.domain ?? domain,
      policy_version: result.policy_version,
      request_id: result.request_id,
    };

    try {
      const res: MatchFeedbackResponse = await matchFeedback(payload);
      setFeedbackMsg(
        `Saved feedback. status=${res.status}, override_flag=${res.override_flag}, decision_id=${res.decision_id}`
      );
      await refreshLearningTimeline();
    } catch (err) {
      setError(safeJsonError(err));
    } finally {
      setFeedbackLoading(false);
    }
  }

function clearResult() {
  setDomain(defaultDomain);
  setRulesDirty(false);
  setTriggeredRulesText("");
  setMatchScore(0);
  setRequestedBy(defaultRequestedBy);

  // Clear Record A
  setA_member_id("");
  setA_npi("");
  setA_human_id("");
  setA_first("");
  setA_last("");
  setAPhone("");
  setA_dob("");
  setA_email("");
  setA_address("");
  setA_source_system("");
  setA_account_number_last4("");
  setA_account_type("");
  setA_currency("");
  setA_account_status("");
  // Clear LOCATION Record A
  setA_location_id("");
  setA_site_id("");
  setA_location_code("");
  setA_location_name("");
  setA_location_type("");
  setA_location_address("");
  setA_parent_location_id("");

  // Clear Record B
  setB_member_id("");
  setB_npi("");
  setB_human_id("");
  setB_first("");
  setB_last("");
  setB_dob("");
  setB_email("");
  setB_address("");
  setB_source_system("");
  setBPhone("");
  setB_account_number_last4("");
  setB_account_type("");
  setB_currency("");
  setB_account_status("");
  // Clear LOCATION Record B
  setB_location_id("");
  setB_site_id("");
  setB_location_code("");
  setB_location_name("");
  setB_location_type("");
  setB_location_address("");
  setB_parent_location_id("");

  // Clear Results
  setResult(null);
  setError(null);
  setFeedbackMsg(null);
  setLearningTimeline([]);

  // Reset Feedback
  setStewardDecision(DEFAULT_STEWARD_DECISION);
  setOverrideReason("");
  setOverrideReasonCode("OTHER");
  setOverrideReasonNote("");
  setStewardUser(defaultStewardUser);

  setLoading(false);
  setFeedbackLoading(false);
}

    console.log("MATCH SCORE:", result?.match_score);
    console.log("FULL RESULT:", result);

         if (!organizationId || !organizationName) {
    return (
      <div
        role="alert"
        style={{
          padding: 20,
          borderRadius: 14,
          border: "1px solid #fecaca",
          background: "#fef2f2",
          color: "#991b1b",
          fontWeight: 700,
        }}
      >
        Unable to determine the authenticated organization.
        Please sign out and sign back in.
      </div>
    );
  }


return (
    <div
      style={{
        maxWidth: "1280px",
        margin: "0 auto",
        padding: 24,
        display: "flex",
        flexDirection: "column",
        gap: 24,
      }}
    >
      <div>
        <div
          style={{
            display: "flex",
            justifyContent: "flex-start",
            alignItems: "center",
            gap: 32,
            flexWrap: "wrap",
          }}
        >
          <div
          style={{
            flex: "0 1 820px",
            minWidth: 0,
          }}
>
        <h1  style={{ marginBottom: 8 }}>
    Match Explain
  </h1>

  <p
    style={{
      margin: 0,
      opacity: 0.75,
      fontSize: 14,
      maxWidth: 820,
    }}
  >
    Compare two records to generate a domain-aware,
    explainable AI match decision with signal-level reasoning,
    weighted contributions, confidence scoring, and
    stewardship guidance.
  </p>
</div>

    <div
      title={`Organization ID: ${organizationId}`}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 8,
        padding: "9px 14px",
        borderRadius: 999,
        border: "1px solid #bfdbfe",
        background: "#eff6ff",
        color: "#173c72",
        fontSize: 13,
        fontWeight: 800,
        whiteSpace: "nowrap",
      }}
    >
      <span aria-hidden="true">🏢</span>

      <div>
        <div
          style={{
            fontSize: 10,
            lineHeight: 1,
            color: "#64748b",
            textTransform: "uppercase",
            letterSpacing: 0.6,
            marginBottom: 3,
          }}
        >
          Organization
        </div>

        <div>
          {organizationName}
        </div>
      </div>
    </div>
  </div>
</div>

      {error && (
        <div
          style={{
            background: "#ffe8e8",
            border: "1px solid #ffb3b3",
            padding: 12,
            borderRadius: 8,
            whiteSpace: "pre-wrap",
          }}
        >
          <b>Error</b>
          <div>{error}</div>
        </div>
      )}

      <form onSubmit={onExplain}>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: 16,
            alignItems: "start",
          }}
        >
   
          <RecordCard
            title="Record A"
            searchBox={
              <RecordSearchBox
                domain={domain}
                label={`Select Existing ${domain.charAt(0) + domain.slice(1).toLowerCase()} Record`}
               onSelect={(r) => {
  const rec = r.record ?? {};

    if (domain === "LOCATION") {
    setA_location_id(
      rec.location_id ??
      r.record_id ??
      ""
    );
    setA_site_id(rec.site_id ?? "");
    setA_location_code(rec.location_code ?? "");
    setA_location_name(rec.location_name ?? "");
    setA_location_type(rec.location_type ?? "");
    setA_location_address(rec.location_address ?? "");
    setA_parent_location_id(rec.parent_location_id ?? "");
    setA_source_system(
      rec.source_system ??
      r.source_system ??
      ""
    );
    return;
  }

    if (domain === "ORGANIZATION") {
    setA_member_id(
      rec.organization_entity_id ??
      r.record_id ??
      ""
    );
    setA_dob(
      rec.organization_code ??
      ""
    );
    setA_first(
      rec.organization_name ??
      ""
    );
    setA_last(
      rec.organization_type ??
      ""
    );
    setA_email(
      rec.parent_organization_id ??
      ""
    );
    setA_address(
      rec.organization_status ??
      ""
    );
    setA_source_system(
      rec.source_system ??
      r.source_system ??
      ""
    );
    return;
  }

  if (domain === "PRODUCT") {
    setA_member_id(rec.product_id ?? r.record_id ?? "");
    setA_first(rec.product_name ?? "");
    setA_last(rec.product_variant ?? "");
    setA_dob(rec.item_category ?? "");
    setA_email(rec.gtin ?? "");
    setA_address(rec.sku ?? "");
    setA_source_system(rec.source_system ?? r.source_system ?? "");
    return;
  }

  if (domain === "SUPPLIER") {
    setA_member_id(rec.supplier_id ?? rec.member_id ?? r.record_id ?? "");
    setA_first(rec.supplier_name ?? rec.supplier_name_line_1 ??
    ""
    );
    setA_last(rec.supplier_name_line_2 ?? "");
    setA_dob(rec.tax_id ?? "");
    setA_email(rec.contact_email ?? rec.email ?? "");
    setA_address(rec.supplier_address ?? rec.address ?? "");
    setA_source_system(rec.source_system ?? r.source_system ?? "");
    return;
}
        
  if (domain === "PROVIDER") {
    setA_member_id(rec.provider_id ?? rec.member_id ?? r.record_id ?? "");
    setA_npi(rec.npi ?? "");
    setAPhone(rec.phone_number ?? r.phone_number ?? "");
    setA_dob(rec.specialty ?? "");
    setA_first(rec.first_name ?? "");
    setA_last(rec.last_name ?? "");
    setA_email(rec.email ?? "");
    setA_address(rec.address ?? "");
    setA_source_system(rec.source_system ?? r.source_system ?? "");
    return;
  }
  if (domain === "BANKING") {
    setA_member_id(
      rec.account_id ??
      rec.member_id ??
      r.record_id ??
      ""
    );
    setA_first(rec.banking_customer_id ?? "" );
    setA_last( rec.sap_business_partner_id ?? "" );
    setA_dob(rec.routing_number ?? "");
    setA_account_number_last4(rec.account_number_last4 ?? ""
    );
    setA_address(rec.institution_name ?? ""
    );
    setA_account_type(rec.account_type ?? ""
    );
    setA_currency(rec.currency ?? ""
    );

    setA_account_status(rec.account_status ?? ""
    );

    setA_email(rec.email ?? ""
    );

    setAPhone(
      rec.phone_number ??
      r.phone_number ??
      ""
    );

    setA_source_system(
      rec.source_system ??
      r.source_system ??
      ""
    );

    return;
  }

  setA_member_id(
      rec.patient_id ??
      rec.supplier_id ??
      rec.member_id ??
      r.record_id ??
      ""
  );
  setA_first(
  domain === "CUSTOMER"
    ? rec.full_name ?? rec.first_name ?? r.full_name ?? ""
    : rec.first_name ?? ""
);

setA_last(
  domain === "CUSTOMER"
    ? ""
    : rec.last_name ?? ""
);

setAPhone(
  rec.phone_number ??
  r.phone_number ??
  ""
);

setA_dob(rec.dob ?? "");
setA_human_id(rec.human_id ?? "");
setA_email(rec.email ?? "");
setA_address(rec.address ?? "");
setA_source_system(
  rec.source_system ??
  r.source_system ??
  ""
);
}}
              />
            }
            entityId={a_member_id}
            setEntityId={setA_member_id}
            first={a_first}
            setFirst={setA_first}
            last={a_last}
            setLast={setA_last}
            dob={a_dob}
            setDob={setA_dob}
            email={a_email}
            setEmail={setA_email}
            address={a_address}
            setAddress={setA_address}
            sourceSystem={a_source_system}
            setSourceSystem={setA_source_system}
            entityIdLabel={getMemberIdLabel(domain)}
            npi={domain === "PROVIDER" ? a_npi : undefined}
            setNpi={domain === "PROVIDER" ? setA_npi : undefined}
            phoneNumber={
              domain === "CUSTOMER" ||
              domain === "PATIENT" ||
              domain === "PROVIDER" ||
              domain === "BANKING"
                ? a_phone
                : undefined
            }
            setPhoneNumber={
              domain === "CUSTOMER" ||
              domain === "PATIENT" ||
              domain === "PROVIDER" ||
              domain === "BANKING"
                ? setAPhone
                : undefined
            }
            bankingAccountNumberLast4={
              domain === "BANKING"
                ? a_account_number_last4
                : undefined
            }
            setBankingAccountNumberLast4={
              domain === "BANKING"
                ? setA_account_number_last4
                : undefined
            }

            bankingAccountType={
              domain === "BANKING"
                ? a_account_type
                : undefined
            }
            setBankingAccountType={
              domain === "BANKING"
                ? setA_account_type
                : undefined
            }

            bankingCurrency={
              domain === "BANKING"
                ? a_currency
                : undefined
            }
            setBankingCurrency={
              domain === "BANKING"
                ? setA_currency
                : undefined
            }

            bankingAccountStatus={
              domain === "BANKING"
                ? a_account_status
                : undefined
            }
            setBankingAccountStatus={
              domain === "BANKING"
                ? setA_account_status
                : undefined
            }
            locationId={domain === "LOCATION" ? a_location_id : undefined}
            setLocationId={domain === "LOCATION" ? setA_location_id : undefined}
            siteId={domain === "LOCATION" ? a_site_id : undefined}
            setSiteId={domain === "LOCATION" ? setA_site_id : undefined}
            locationCode={domain === "LOCATION" ? a_location_code : undefined}
            setLocationCode={domain === "LOCATION" ? setA_location_code : undefined}
            locationName={domain === "LOCATION" ? a_location_name : undefined}
            setLocationName={domain === "LOCATION" ? setA_location_name : undefined}
            locationType={domain === "LOCATION" ? a_location_type : undefined}
            setLocationType={domain === "LOCATION" ? setA_location_type : undefined}
            locationAddress={domain === "LOCATION" ? a_location_address : undefined}
            setLocationAddress={domain === "LOCATION" ? setA_location_address : undefined}
            parentLocationId={domain === "LOCATION" ? a_parent_location_id : undefined}
            setParentLocationId={domain === "LOCATION" ? setA_parent_location_id : undefined}
            
            humanId={showHumanId ? a_human_id : undefined}
            setHumanId={showHumanId ? setA_human_id : undefined}
            labels={fieldLabels}
          />
          

          <RecordCard
            title="Record B"
            searchBox={
              <RecordSearchBox
                domain={domain}
                label={`Select Existing ${domain.charAt(0) + domain.slice(1).toLowerCase()} Record`}
                onSelect={(r) => {
  const rec = r.record ?? {};
    
    if (domain === "LOCATION") {
    setB_location_id(
      rec.location_id ??
      r.record_id ??
      ""
    );
    setB_site_id(rec.site_id ?? "");
    setB_location_code(rec.location_code ?? "");
    setB_location_name(rec.location_name ?? "");
    setB_location_type(rec.location_type ?? "");
    setB_location_address(rec.location_address ?? "");
    setB_parent_location_id(rec.parent_location_id ?? "");
    setB_source_system(
      rec.source_system ??
      r.source_system ??
      ""
    );
    return;
  }

    if (domain === "ORGANIZATION") {
    setB_member_id(
      rec.organization_entity_id ??
      r.record_id ??
      ""
    );
    setB_dob(
      rec.organization_code ??
      ""
    );
    setB_first(
      rec.organization_name ??
      ""
    );
    setB_last(
      rec.organization_type ??
      ""
    );
    setB_email(
      rec.parent_organization_id ??
      ""
    );
    setB_address(
      rec.organization_status ??
      ""
    );
    setB_source_system(
      rec.source_system ??
      r.source_system ??
      ""
    );
    return;
  }

  if (domain === "PRODUCT") {
    setB_member_id(rec.product_id ?? r.record_id ?? "");
    setB_first(rec.product_name ?? "");
    setB_last(rec.product_variant ?? "");
    setB_dob(rec.item_category ?? "");
    setB_email(rec.gtin ?? "");
    setB_address(rec.sku ?? "");
    setB_source_system(rec.source_system ?? r.source_system ?? "");
    return;
  }

  if (domain === "SUPPLIER") {
    setB_member_id(rec.supplier_id ?? rec.member_id ?? r.record_id ?? "");
    setB_first(rec.supplier_name ?? rec.supplier_name_line_1 ??
  ""
);

    setB_last(rec.supplier_name_line_2 ?? "");
    setB_dob(rec.tax_id ?? "");
    setB_email(rec.contact_email ?? rec.email ?? "");
    setB_address(rec.supplier_address ?? rec.address ?? "");
    setB_source_system(rec.source_system ?? r.source_system ?? "");
    return;
  }

  if (domain === "PROVIDER") {
    setB_member_id(rec.provider_id ?? rec.member_id ?? r.record_id ?? "");
    setB_npi(rec.npi ?? "");
    setBPhone(rec.phone_number ?? r.phone_number ?? "");
    setB_dob(rec.specialty ?? "");
    setB_first(rec.first_name ?? "");
    setB_last(rec.last_name ?? "");
    setB_email(rec.email ?? "");
    setB_address(rec.address ?? "");
    setB_source_system(rec.source_system ?? r.source_system ?? "");
    return;
  }
  if (domain === "BANKING") {
    setB_member_id( rec.account_id ?? rec.member_id ?? r.record_id ?? "");
    setB_first(rec.banking_customer_id ?? "");
    setB_last(rec.sap_business_partner_id ?? "");
    setB_dob(rec.routing_number ?? "");
    setB_account_number_last4(rec.account_number_last4 ?? "");
    setB_address(rec.institution_name ?? "");
    setB_account_type(rec.account_type ?? "");
    setB_currency(rec.currency ?? "");
    setB_account_status(rec.account_status ?? "");
    setB_email(rec.email ?? ""
    );
    setBPhone(rec.phone_number ?? r.phone_number ?? "" );
    setB_source_system(
      rec.source_system ??
      r.source_system ??
      ""
    );

    return;
  }

  setB_member_id(
      rec.patient_id ??
      rec.supplier_id ??
      rec.member_id ??
      r.record_id ??
      ""
  );
  setB_first(
  domain === "CUSTOMER"
    ? rec.full_name ?? rec.first_name ?? r.full_name ?? ""
    : rec.first_name ?? ""
);

setB_last(
  domain === "CUSTOMER"
    ? ""
    : rec.last_name ?? ""
);

setBPhone(
  rec.phone_number ??
  r.phone_number ??
  ""
);

setB_dob(rec.dob ?? "");
setB_human_id(rec.human_id ?? "");
setB_email(rec.email ?? "");
setB_address(rec.address ?? "");
setB_source_system(
  rec.source_system ??
  r.source_system ??
  ""
);
}}
              />
            }
            entityId={b_member_id}
            setEntityId={setB_member_id}
            first={b_first}
            setFirst={setB_first}
            last={b_last}
            setLast={setB_last}
            dob={b_dob}
            setDob={setB_dob}
            email={b_email}
            setEmail={setB_email}
            address={b_address}
            setAddress={setB_address}
            sourceSystem={b_source_system}
            setSourceSystem={setB_source_system}
            entityIdLabel={getMemberIdLabel(domain)}
            npi={domain === "PROVIDER" ? b_npi : undefined}
            setNpi={domain === "PROVIDER" ? setB_npi : undefined}
            locationId={domain === "LOCATION" ? b_location_id : undefined}
            setLocationId={domain === "LOCATION" ? setB_location_id : undefined}
            siteId={domain === "LOCATION" ? b_site_id : undefined}
            setSiteId={domain === "LOCATION" ? setB_site_id : undefined}
            locationCode={domain === "LOCATION" ? b_location_code : undefined}
            setLocationCode={domain === "LOCATION" ? setB_location_code : undefined}
            locationName={domain === "LOCATION" ? b_location_name : undefined}
            setLocationName={domain === "LOCATION" ? setB_location_name : undefined}
            locationType={domain === "LOCATION" ? b_location_type : undefined}
            setLocationType={domain === "LOCATION" ? setB_location_type : undefined}
            locationAddress={domain === "LOCATION" ? b_location_address : undefined}
            setLocationAddress={domain === "LOCATION" ? setB_location_address : undefined}
            parentLocationId={domain === "LOCATION" ? b_parent_location_id : undefined}
            setParentLocationId={domain === "LOCATION" ? setB_parent_location_id : undefined}
            phoneNumber={
              domain === "CUSTOMER" ||
              domain === "PATIENT" ||
              domain === "PROVIDER"||
              domain === "BANKING"
                ? b_phone
                : undefined
            }
            setPhoneNumber={
              domain === "CUSTOMER" ||
              domain === "PATIENT" ||
              domain === "PROVIDER" ||
              domain === "BANKING"
                ? setBPhone
                : undefined
            }
            bankingAccountNumberLast4={
              domain === "BANKING"
                ? b_account_number_last4
                : undefined
            }
            setBankingAccountNumberLast4={
              domain === "BANKING"
                ? setB_account_number_last4
                : undefined
            }

            bankingAccountType={
              domain === "BANKING"
                ? b_account_type
                : undefined
            }
            setBankingAccountType={
              domain === "BANKING"
                ? setB_account_type
                : undefined
            }

            bankingCurrency={
              domain === "BANKING"
                ? b_currency
                : undefined
            }
            setBankingCurrency={
              domain === "BANKING"
                ? setB_currency
                : undefined
            }

            bankingAccountStatus={
              domain === "BANKING"
                ? b_account_status
                : undefined
            }
            setBankingAccountStatus={
              domain === "BANKING"
                ? setB_account_status
                : undefined
            }

            humanId={showHumanId ? b_human_id : undefined}
            setHumanId={showHumanId ? setB_human_id : undefined}
            labels={fieldLabels}
          />
        </div>

        <div
          style={{
            marginTop: 16,
            padding: 12,
            border: "1px solid #ddd",
            borderRadius: 10,
          }}
        >
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr 1fr 1fr",
              gap: 12,
            }}
          >
            <Field label="domain">
              <select
                value={domain}
                onChange={(e) => applyDomainPreset(e.target.value as DomainType)}
                style={inputStyle}
              >
                {DOMAIN_OPTIONS.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </Field>

            <Field label="Auto Match Threshold (0–1)">
              <input
                type="number"
                min={0}
                max={1}
                step={0.01}
                value={matchScore}
                onChange={(e) => {
                  const parsed = Number(e.target.value);
                  setMatchScore(Number.isFinite(parsed) ? parsed : 0);
                }}
                style={inputStyle}
              />
            </Field>

            <Field label="requested_by">
              <input
                value={requestedBy}
                onChange={(e) => setRequestedBy(e.target.value)}
                style={inputStyle}
              />
            </Field>

            <Field label="triggered_rules (comma-separated)">
              <input
                value={triggeredRulesText}
                onChange={(e) => {
                  setTriggeredRulesText(e.target.value);
                  setRulesDirty(true);
                }}
                style={inputStyle}
              />
            </Field>
          </div>

          <div
            style={{
              marginTop: 10,
              display: "flex",
              justifyContent: "space-between",
              gap: 10,
              flexWrap: "wrap",
            }}
          >
            <div style={{ display: "flex", gap: 10 }}>
              <button
                type="submit"
                disabled={loading}
                style={{
                  padding: "10px 14px",
                  borderRadius: 10,
                  border: "1px solid #333",
                  background: loading ? "#eee" : "#111",
                  color: loading ? "#666" : "#fff",
                  cursor: loading ? "not-allowed" : "pointer",
                }}
              >
                {loading ? "Generating..." : "Generate Explanation"}
              </button>

              <button
                type="button"
                onClick={clearResult}
                style={{
                  padding: "10px 14px",
                  borderRadius: 10,
                  border: "1px solid #aaa",
                  background: "#fff",
                  cursor: "pointer",
                }}
              >
                Clear
              </button>
            </div>

            <button
              type="button"
              onClick={() => {
                setTriggeredRulesText(rulesToText(domain));
                setRulesDirty(false);
                setStewardDecision(DEFAULT_STEWARD_DECISION);
                setOverrideReason("");
                setOverrideReasonCode("OTHER");
                setOverrideReasonNote("");
              }}
              style={{
                padding: "10px 14px",
                borderRadius: 10,
                border: "1px solid #aaa",
                background: "#fff",
                cursor: "pointer",
              }}
            >
              Reset Domain Preset
            </button>
          </div>

         <div
            style={{
              marginTop: 14,
              padding: "10px 12px",
              borderRadius: 8,
              background: "#f8fafc",
              border: "1px solid #e2e8f0",
              fontSize: 12,
              lineHeight: 1.5,
              color: "#475569",
            }}
          >
            <strong style={{ color: "#173c72" }}>
              Self-Service Record Capture:
            </strong>{" "}
            Records entered manually are securely saved to your organization's
            record index after the explanation is generated. They will then be
            available in <strong>Search Existing Record</strong> for future
            comparisons.
          </div>
        </div>
      </form>

      {result && (
        <>
          <AIDecisionSummary result={result} />

          <div
            style={{
              border: "1px solid #e5e7eb",
              borderRadius: 18,
              background: "#ffffff",
              padding: 16,
            }}
          >
            {/* Entity Similarity Card */}

          <div
            style={{
              background: "#ffffff",
              border: "1px solid #e2e8f0",
              borderRadius: 20,
              padding: 20,
              marginBottom: 20,
            }}
          >
          <div
            style={{
              fontSize: 13,
              fontWeight: 600,
              color: "#64748b",
              marginBottom: 8,
              textTransform: "uppercase",
              letterSpacing: 0.5,
            }}
          >
            Entity Similarity
            </div>

            <div
              style={{
                fontSize: 40,
                fontWeight: 900,
                color: "#2563eb",
                lineHeight: 1,
              }}
            >
              {Math.round((result.match_score ?? 0) * 100)}%
            </div>

            <div
              style={{
                marginTop: 10,
                fontSize: 14,
                color: "#64748b",
              }}
            >
                Deterministic + probabilistic match score
              </div>
            </div>

            {/* Existing Confidence Snapshot */}

            <div
              style={{
                fontSize: 18,
                fontWeight: 800,
                color: "#1e3a5f",
                marginBottom: 10,
              }}
            >
              Automation Confidence
            </div>

          <ConfidenceBlocks
              value={engineConfidence}
              riskFlag={result.risk_flag}
            />
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "minmax(0, 2fr) minmax(320px, 1fr)",
              gap: 24,
              alignItems: "start",
            }}
          >
            <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
              <AIReasoningTimeline
                events={result.match_evidence_timeline}
                result={result}
                domain={domain}
              />

              <DecisionCopilotPanel
                aiDecision={displayDecision(result.ai_decision)}
                recommendedAction={displayDecision(
                  result.final_recommended_action ?? result.recommended_action
                )}
                confidence={engineConfidence}
                riskFlag={result.risk_flag}
                primaryReason={result.explanation_summary}
                copilotRecommendation={getCopilotRecommendation(
                  result.final_recommended_action ?? result.recommended_action
                )}
              />
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
              <StewardFeedbackPanel
                stewardUser={stewardUser}
                setStewardUser={setStewardUser}
                stewardDecision={stewardDecision}
                setStewardDecision={setStewardDecision}
                overrideReason={overrideReason}
                setOverrideReason={setOverrideReason}
                overrideReasonCode={overrideReasonCode}
                setOverrideReasonCode={setOverrideReasonCode}
                overrideReasonNote={overrideReasonNote}
                setOverrideReasonNote={setOverrideReasonNote}
                overrideReasonOptions={overrideReasonOptions}
                isOverride={isOverride}
                feedbackLoading={feedbackLoading}
                onSubmitFeedback={onSubmitFeedback}
                feedbackMsg={feedbackMsg}
                explanationId={result.explanation_id}
              />
            </div>
          </div>

<StewardLearningTimeline items={learningTimeline} />

          <AILearningPanel
            result={result}
            aiDecision={result.ai_decision}
            recommendedAction={displayDecision(
              result.final_recommended_action ?? result.recommended_action
            )}
            confidence={engineConfidence}
            riskFlag={result.risk_flag}
            matchScore={Number(result.match_score ?? 0)}
            triggeredRules={triggeredRules}
            overrideRate={getOverrideRateEstimate(result)}
          />
<RecordCompare
  authoritativeBands={
  domain === "ORGANIZATION"
    ? {
        organization_name: (() => {
          const signal = (
            (result as any)?.entity_resolution_signals ?? []
          ).find(
            (item: any) =>
              String(item?.signal_name ?? "").toLowerCase() ===
              "organization_name_similarity"
          );

          const band = String(
            signal?.signal_band ?? ""
          ).toUpperCase();

          return ["EXACT", "SIMILAR", "FUZZY", "DIFFERENT"].includes(band)
            ? (band as "EXACT" | "SIMILAR" | "FUZZY" | "DIFFERENT")
            : undefined;
        })(),
      }
    : domain === "LOCATION"
    ? (() => {
        const signals =
          (result as any)?.entity_resolution_signals ?? [];

        const getBand = (signalName: string) => {
          const signal = signals.find(
            (item: any) =>
              String(item?.signal_name ?? "").toLowerCase() ===
              signalName.toLowerCase()
          );

          const band = String(
            signal?.signal_band ?? ""
          ).toUpperCase();

          return ["EXACT", "SIMILAR", "FUZZY", "DIFFERENT"].includes(band)
            ? (band as "EXACT" | "SIMILAR" | "FUZZY" | "DIFFERENT")
            : undefined;
        };

        return {
          location_id: getBand("location_id_match"),
          site_id: getBand("site_id_match"),
          location_code: getBand("location_code_match"),
          location_name: getBand("location_name_similarity"),
          location_address: getBand("address_similarity"),
          parent_location_id: getBand("parent_location_id_match"),
        };
      })()
    : undefined
}
  recordA={
    domain === "PRODUCT"
      ? {
          product_id: a_member_id,
          product_name: a_first,
          product_variant: a_last,
          item_category: a_dob,
          gtin: a_email,
          sku: a_address,
          source_system: a_source_system,
        }
      : domain === "PROVIDER"
      ? {
          provider_id: a_member_id,
          npi: a_npi,
          specialty: a_dob,
          phone_number: a_phone,
          provider_first_name: a_first,
          provider_last_name: a_last,
          provider_email: a_email,
          provider_address: a_address,
          source_system: a_source_system,
        }
      : domain === "PATIENT"
      ? {
          patient_id: a_member_id,
          patient_first_name: a_first,
          patient_last_name: a_last,
          patient_dob: a_dob,
          patient_email: a_email,
          phone_number: a_phone,
          patient_address: a_address,
          source_system: a_source_system,
        }
      : domain === "SUPPLIER"
      ? {
          supplier_id: a_member_id,
          supplier_name: a_first,
          supplier_name_line_1: a_first,
          supplier_name_line_2: a_last,
          tax_id: a_dob,
          contact_email: a_email,
          supplier_address: a_address,
          address: a_address,
          source_system: a_source_system,
        }

      : domain === "LOCATION"
      ? {
          location_id: a_location_id,
          site_id: a_site_id,
          location_code: a_location_code,
          location_name: a_location_name,
          location_type: a_location_type,
          location_address: a_location_address,
          parent_location_id: a_parent_location_id,
          source_system: a_source_system,
        }
      : domain === "ORGANIZATION"
      ? {
          organization_entity_id: a_member_id,
          organization_code: a_dob,
          organization_name: a_first,
          organization_type: a_last,
          parent_organization_id: a_email,
          organization_status: a_address,
          source_system: a_source_system,
        }
      
      : domain === "BANKING"
      ? {
          account_id: a_member_id,
          banking_customer_id: a_first,
          sap_business_partner_id: a_last,
          routing_number: a_dob,
          account_number_last4: a_account_number_last4,
          institution_name: a_address,
          account_type: a_account_type,
          currency: a_currency,
          account_status: a_account_status,
          email: a_email,
          phone_number: a_phone,
          source_system: a_source_system,
        }
      : {
          member_id: a_member_id,
          full_name: a_first,
          dob: a_dob,
          email: a_email,
          address: a_address,
          phone_number: a_phone,
          source_system: a_source_system,
        }
  }

  recordB={
    domain === "PRODUCT"
      ? {
          product_id: b_member_id,
          product_name: b_first,
          product_variant: b_last,
          item_category: b_dob,
          gtin: b_email,
          sku: b_address,
          source_system: b_source_system,
        }
      : domain === "PROVIDER"
      ? {
          provider_id: b_member_id,
          npi: b_npi,
          phone_number: b_phone,
          specialty: b_dob,
          provider_first_name: b_first,
          provider_last_name: b_last,
          provider_email: b_email,
          provider_address: b_address,
          source_system: b_source_system,
        }
      : domain === "PATIENT"
      ? {
          patient_id: b_member_id,
          patient_first_name: b_first,
          patient_last_name: b_last,
          patient_dob: b_dob,
          patient_email: b_email,
          phone_number: b_phone,
          patient_address: b_address,
          source_system: b_source_system,
        }
      : domain === "SUPPLIER"
      ? {
          supplier_id: b_member_id,
          supplier_name: b_first,
          supplier_name_line_1: b_first,
          supplier_name_line_2: b_last,
          tax_id: b_dob,
          contact_email: b_email,
          supplier_address: b_address,
          address: b_address,
          source_system: b_source_system,
        }

      : domain === "LOCATION"
      ? {
          location_id: b_location_id,
          site_id: b_site_id,
          location_code: b_location_code,
          location_name: b_location_name,
          location_type: b_location_type,
          location_address: b_location_address,
          parent_location_id: b_parent_location_id,
          source_system: b_source_system,
        }
      : domain === "ORGANIZATION"
      ? {
          organization_entity_id: b_member_id,
          organization_code: b_dob,
          organization_name: b_first,
          organization_type: b_last,
          parent_organization_id: b_email,
          organization_status: b_address,
          source_system: b_source_system,
        }
        
      : domain === "BANKING"
      ? {
          account_id: b_member_id,
          banking_customer_id: b_first,
          sap_business_partner_id: b_last,
          routing_number: b_dob,
          account_number_last4: b_account_number_last4,
          institution_name: b_address,
          account_type: b_account_type,
          currency: b_currency,
          account_status: b_account_status,
          email: b_email,
          phone_number: b_phone,
          source_system: b_source_system,
        }
      : {
          member_id: b_member_id,
          full_name: b_first,
          dob: b_dob,
          email: b_email,
          address: b_address,
          phone_number: b_phone,
          source_system: b_source_system,
        }
  }

  labels={{
    member_id: getMemberIdLabel(domain),

    provider_id: "Provider ID",
    npi: "NPI",
    specialty: "Specialty",
    provider_first_name: "Provider First Name",
    provider_last_name: "Provider Last Name",
    provider_email: "Provider Email",
    provider_address: "Provider Address",

    supplier_id: "Supplier ID",
    supplier_name: "Supplier Name",
    tax_id: "Tax ID",
    contact_email: "Supplier Contact Email",
    supplier_address: "Supplier Address",

    patient_id: "Patient ID",
    patient_first_name: "Patient First Name",
    patient_last_name: "Patient Last Name",
    patient_dob: "Patient DOB",
    patient_email: "Patient Email",
    patient_address: "Patient Address",

    product_id: "Product ID",
    product_name: "Product Name",
    product_variant: "Product Variant / Pack",
    effective_lot_date: "Effective Date / Lot Date",
    gtin: "GTIN",
    sku: "SKU",

    // Banking
    account_id: "Account ID",
    banking_customer_id: "Banking Customer ID",
    sap_business_partner_id: "SAP Business Partner ID",
    routing_number: "Routing Number",
    account_number_last4: "Account Number Last 4",
    institution_name: "Institution Name",
    account_type: "Account Type",
    currency: "Currency",
    account_status: "Account Status",

    first_name: fieldLabels.first,
    last_name: fieldLabels.last,
    dob: fieldLabels.dob,
    email: fieldLabels.email,
    phone_number: "Phone Number",
    address: fieldLabels.address,
    source_system: "Source System",
  }}

  domain={domain}
/>

  {domain !== "PRODUCT" &&
  domain !== "BANKING" &&
  domain !== "ORGANIZATION" &&
  result && (
  <AddressIntelligencePanel
    recordA={result.record_a_address_intelligence}
    recordB={result.record_b_address_intelligence}
    insight={result.address_match_insight}
    similarityScore={result.address_similarity_score}
    domain={domain}
  />
)}

<SignalAttributionStrip
  result={result}
  recordA={
    domain === "PRODUCT"
      ? {
          product_id: a_member_id,
          product_name: a_first,
          product_variant: a_last,
          effective_lot_date: a_dob,
          gtin: a_email,
          sku: a_address,
          source_system: a_source_system,
        }
      : domain === "PROVIDER"
      ? {
          provider_id: a_member_id,
          npi: a_npi,
          specialty: a_dob,
          provider_first_name: a_first,
          provider_last_name: a_last,
          provider_email: a_email,
          provider_address: a_address,
          source_system: a_source_system,
        }
      : domain === "PATIENT"
      ? {
          patient_id: a_member_id,
          patient_first_name: a_first,
          patient_last_name: a_last,
          patient_dob: a_dob,
          patient_email: a_email,
          phone_number: a_phone,
          patient_address: a_address,
          source_system: a_source_system,
        }
      : domain === "SUPPLIER"
      ? {
          supplier_id: a_member_id,
          supplier_name: a_first,
          supplier_name_line_1: a_first,
          supplier_name_line_2: a_last,
          tax_id: a_dob,
          contact_email: a_email,
          supplier_address: a_address,
          address: a_address,
          source_system: a_source_system,
        }

      : domain === "LOCATION"
      ? {
          member_id: a_location_id.trim(),
          location_id: a_location_id.trim(),
          site_id: a_site_id.trim(),
          location_code: a_location_code.trim(),
          location_name: a_location_name.trim(),
          location_type: a_location_type.trim(),
          location_address: a_location_address.trim(),
          address: a_location_address.trim(),
          parent_location_id: a_parent_location_id.trim(),
          source_system: a_source_system.trim(),
        }

      : domain === "ORGANIZATION"
      ? {
          organization_entity_id: a_member_id,
          organization_code: a_dob,
          organization_name: a_first,
          organization_type: a_last,
          parent_organization_id: a_email,
          organization_status: a_address,
          source_system: a_source_system,
        }
      : domain === "BANKING"
      ? {
          account_id: a_member_id,
          banking_customer_id: a_first,
          sap_business_partner_id: a_last,
          routing_number: a_dob,
          account_number_last4: a_account_number_last4,
          institution_name: a_address,
          account_type: a_account_type,
          currency: a_currency,
          account_status: a_account_status,
          email: a_email,
          phone_number: a_phone,
          source_system: a_source_system,
        }
      : {
          member_id: a_member_id,
          full_name: a_first,
          phone_number: a_phone,
          dob: a_dob,
          email: a_email,
          address: a_address,
          source_system: a_source_system,
        }
  }

  recordB={
    domain === "PRODUCT"
      ? {
          product_id: b_member_id,
          product_name: b_first,
          product_variant: b_last,
          effective_lot_date: b_dob,
          gtin: b_email,
          sku: b_address,
          source_system: b_source_system,
        }

      : domain === "PROVIDER"
      ? {
          provider_id: b_member_id,
          npi: b_npi,
          specialty: b_dob,
          provider_first_name: b_first,
          provider_last_name: b_last,
          provider_email: b_email,
          provider_address: b_address,
          source_system: b_source_system,
        }

      : domain === "PATIENT"
      ? {
          patient_id: b_member_id,
          patient_first_name: b_first,
          patient_last_name: b_last,
          patient_dob: b_dob,
          patient_email: b_email,
          phone_number: b_phone,
          patient_address: b_address,
          source_system: b_source_system,
        }

      : domain === "SUPPLIER"
      ? {
          supplier_id: b_member_id,
          supplier_name: b_first,
          supplier_name_line_1: b_first,
          supplier_name_line_2: b_last,
          tax_id: b_dob,
          contact_email: b_email,
          supplier_address: b_address,
          address: b_address,
          source_system: b_source_system,
        }

      : domain === "LOCATION"
      ? {
          member_id: b_location_id.trim(),
          location_id: b_location_id.trim(),
          site_id: b_site_id.trim(),
          location_code: b_location_code.trim(),
          location_name: b_location_name.trim(),
          location_type: b_location_type.trim(),
          location_address: b_location_address.trim(),
          address: b_location_address.trim(),
          parent_location_id: b_parent_location_id.trim(),
          source_system: b_source_system.trim(),
        }

      : domain === "ORGANIZATION"
      ? {
          organization_entity_id: b_member_id,
          organization_code: b_dob,
          organization_name: b_first,
          organization_type: b_last,
          parent_organization_id: b_email,
          organization_status: b_address,
          source_system: b_source_system,
        }

      : domain === "BANKING"
      ? {
          account_id: b_member_id,
          banking_customer_id: b_first,
          sap_business_partner_id: b_last,
          routing_number: b_dob,
          account_number_last4: b_account_number_last4,
          institution_name: b_address,
          account_type: b_account_type,
          currency: b_currency,
          account_status: b_account_status,
          email: b_email,
          phone_number: b_phone,
          source_system: b_source_system,
        }
      : {
          member_id: b_member_id,
          full_name: b_first,
          phone_number: b_phone,
          dob: b_dob,
          email: b_email,
          address: b_address,
          source_system: b_source_system,
        }
  }
  domain={domain}
/>

          <div
            style={{
              border: "1px solid #ddd",
              borderRadius: 12,
              padding: 14,
            }}
          >
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
              <Pill label="Decision" value={result.ai_decision} />
              <Pill label="Confidence" value={`${engineConfidence}%`} />
              <Pill label="Risk" value={result.risk_flag} />
              <Pill
                label="Action"
                value={displayDecision(
                  result.final_recommended_action ?? result.recommended_action
                )}
              />
              <Pill
                label="Automation Readiness"
                value={
                  typeof result.automation_readiness_score === "number"
                    ? `${result.automation_readiness_score}%`
                    : undefined
                }
              />
              <Pill
                label="Policy Status"
                value={formatPolicyStatus(result.automation_policy_status)}
              />
              <Pill
                label="FP Risk"
                value={`${getEstimatedFalsePositiveRisk(result)}%`}
              />
              <Pill label="Risk Driver" value={result.primary_risk_driver} />
              <Pill label="Model" value={result.model_version} />
              <Pill label="Domain" value={result.domain ?? domain} />
              <Pill label="Policy" value={result.policy_version} />
            </div>

            {typeof result.composite_risk_score === "number" && (
              <div
                style={{
                  marginTop: 18,
                  display: "grid",
                  gridTemplateColumns:
                    "minmax(320px, 420px) minmax(240px, 280px)",
                  gap: 16,
                  alignItems: "start",
                }}
              >
                <div>
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      fontSize: 11,
                      fontWeight: 600,
                      marginBottom: 6,
                      opacity: 0.7,
                      letterSpacing: 0.5,
                    }}
                  >
                    <span>LOW</span>
                    <span>MEDIUM</span>
                    <span>HIGH</span>
                  </div>

                  <div
                    style={{
                      position: "relative",
                      height: 18,
                      borderRadius: 999,
                      overflow: "hidden",
                      border: "1px solid #ddd",
                      background:
                        "linear-gradient(to right, #dff5df 0%, #dff5df 33%, #fff4e5 33%, #fff4e5 66%, #fdeeee 66%, #fdeeee 100%)",
                    }}
                  >
                    <div
                      style={{
                        position: "absolute",
                        left: `${clampNumber(
                          result.composite_risk_score,
                          0,
                          100
                        )}%`,
                        top: -6,
                        transform: "translateX(-50%)",
                        width: 0,
                        height: 0,
                        borderLeft: "7px solid transparent",
                        borderRight: "7px solid transparent",
                        borderTop: "10px solid #222",
                        opacity: 0.9,
                      }}
                    />
                  </div>

                  <div
                    style={{
                      marginTop: 8,
                      fontSize: 13,
                      fontWeight: 600,
                      color:
                          compositeRiskBand === "HIGH"
                            ? "#8a1c1c"
                            : compositeRiskBand === "MEDIUM"
                              ? "#8a4b00"
                              : "#176b2c",
                                            
                  }}
                  >
                    Composite Risk: {compositeRiskScore}/100 {compositeRiskBand}
                  </div>

                  <div
                    style={{
                      marginTop: 6,
                      fontSize: 12.5,
                      opacity: 0.85,
                      display: "flex",
                      gap: 10,
                      flexWrap: "wrap",
                    }}
                  >
                    <span>
                      <b>Automation Readiness:</b>{" "}
                      {typeof result.automation_readiness_score === "number"
                        ? `${result.automation_readiness_score}%`
                        : `${getAutomationConfidenceDisplay(result)}%`}
                    </span>

                    <span style={{ opacity: 0.6 }}>•</span>

                    <span>
                      <b>Estimated False Positive Risk:</b>{" "}
                      {getEstimatedFalsePositiveRisk(result)}%
                    </span>
                  </div>
                </div>

                <DecisionConfidenceMeter
                  automationReadinessScore={result.automation_readiness_score}
                  automationReadinessLabel={result.automation_readiness_label}
                  automationPolicyStatus={result.automation_policy_status}
                  estimatedFalsePositiveRisk={
                    result.estimated_false_positive_risk
                  }
                  compositeRiskScore={result.composite_risk_score}
                  confidence={engineConfidence}
                  recommendedAction={
                    result.final_recommended_action ?? result.recommended_action
                  }
                />
              </div>
            )}

            <p style={{ marginTop: 10, whiteSpace: "pre-wrap" }}>
              <b>Summary:</b> {result.explanation_summary}
            </p>

            <div>
              <b>Evidence analysis</b>
              <div style={{ marginTop: 8, display: "grid", gap: 8 }}>
                {result.rule_analysis?.map((r, idx) => (
                  <div
                    key={`${r.rule}-${idx}`}
                    style={{
                      border: "1px solid #eee",
                      borderRadius: 10,
                      padding: 10,
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        gap: 8,
                      }}
                    >
                      <div style={{ fontWeight: 600 }}>{r.rule}</div>
                      <div style={{ opacity: 0.8 }}>{r.impact}</div>
                    </div>
                    <div style={{ marginTop: 6, opacity: 0.9 }}>{r.reason}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
