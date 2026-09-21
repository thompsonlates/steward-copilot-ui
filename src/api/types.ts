// src/api/types.ts

/**
 * Data-driven primitive aliases
 * --------------------------------
 * These intentionally use string instead of hard-coded literal unions
 * so the UI can accept values driven by API/config/Snowflake payloads.
 */

export type DomainType =
  | "CUSTOMER"
  | "SUPPLIER"
  | "PRODUCT"
  | "BANKING"
  | "OTHER"
  | "PATIENT"
  | "PROVIDER"
  | "LOCATION"
  | "ORGANIZATION";

export type DecisionType = string;
export type RiskFlag = string;
export type ImpactLevel = string;
export type OverrideReasonCode = string;
export type AddressValidationStatus = string;
export type PostalMatchLevel = string;
export type ToneType = string;
export type TimelineStage = string;
export type FeedbackStatus = string;

export type NullableString = string | null | undefined;
export type CountMap = Record<string, number>;

export type DqRemediationArtifactType =
  | "SQL"
  | "REGEX"
  | "MANUAL_REVIEW";

export type DqRemediationSafetyStatus =
  | "SAFE_DIAGNOSTIC"
  | "REVIEW_REQUIRED"
  | "BLOCKED";

export type DqRemediationApprovalStatus =
  | "PENDING"
  | "APPROVED"
  | "REJECTED"
  | "CHANGES_REQUESTED";

export type ProductAccessErrorCode =
  | "TRIAL_EXPIRED"
  | "SUBSCRIPTION_INACTIVE"
  | "SUBSCRIPTION_REQUIRED"
  | "TRIAL_CONFIGURATION_ERROR"
  | string;

export type ProductAccessErrorDetail = {
  code: ProductAccessErrorCode;
  subscription_status?: string;
  trial_expired?: boolean;
  trial_ends_at?: string | null;
  message: string;
};

export type ProductAccessState =
  | "ACTIVE"
  | "TRIALING"
  | "TRIAL"
  | "EXPIRED"
  | "PAST_DUE"
  | "UNPAID"
  | "CANCELED"
  | "CANCELLED"
  | "INCOMPLETE"
  | "INCOMPLETE_EXPIRED"
  | "NONE"
  | "UNKNOWN"
  | string;

export type NamedCount = {
  name: string;
  count: number;
};

export type MemberRecord = {
  member_id: string;

  // CUSTOMER preferred name field
  full_name?: string | null;

  // Retained for PATIENT and backward compatibility
  first_name?: string;
  last_name?: string;

  dob?: string;
  email?: string;
  phone_number?: string | null;
  address?: string;

  source_system?: string;
  source_id?: string;
  record_version?: string;
  record_hash?: string;

  // Allow API-driven additional attributes without breaking typing
  [key: string]: unknown;
};

export type LearningTimelineItem = {
  explanation_id: string;
  ai_decision: DecisionType;
  recommended_action: DecisionType;
  steward_decision: DecisionType;
  steward_override_flag: string;
  override_reason: string;
  steward_user: string;
  feedback_at: string;
};

export type MatchExplainRequest = {
  record_a: MemberRecord;
  record_b: MemberRecord;
  match_score: number;
  triggered_rules: string[];
  requested_by: string;

  domain?: DomainType;
  policy_version?: string;
  request_id?: string;
  context_id?: string;
};

export type RuleAnalysis = {
  rule: string;
  impact: ImpactLevel;
  reason: string;
};

export type AddressIntelligenceResult = {
  raw_address?: string;
  standardized_address?: string;

  address_line_1?: string;
  address_line_2?: string;
  city?: string;
  state?: string;
  postal_code?: string;
  country?: string;

  validation_status: AddressValidationStatus;
  deliverable_flag?: boolean | null;
  address_confidence: number;
  postal_match_level?: PostalMatchLevel | null;
  findings: string[];
};

export type SignalExplanation = {
  name: string;
  score: number;
  weight: number;
  weighted_score: number;
  detail: string;
  signal_band?: string;
  tone?: ToneType;
};

export type SignalContribution = {
  signal_name?: string;
  signal_key?: string;
  score: number;
  weight: number;
  contribution: number;
  contribution_pct: number;
};

export type SignalPacket = {
  signal_name?: string;
  name?: string;
  score?: number;
  signal_score?: number;
  weight?: number;
  signal_weight?: number;
  weighted_score?: number;
  detail?: string;
  signal_band?: string;
  match_level?: string;
  signal_type?: string;
};

export type TimelineEvent = {
  title: string;
  detail: string;
  tone: ToneType;
};

export type MatchEvidenceTimelineEvent = {
  step: number;
  stage: TimelineStage;
  title: string;
  detail: string;
  tone: ToneType;
  signal_name?: string | null;
  signal_score?: number | null;
  policy_rule?: string | null;
  impact?: ImpactLevel | null;
};

export interface DqRemediationGenerateResponse {
  organization_id: string;

  recommendation_id: string;
  profile_run_id?: string | null;

  domain: string;
  rule_id: string;
  field_name?: string | null;
  remediation_version_id?: string | null;
  version_number?: number | null;

  artifact_type: DqRemediationArtifactType;

  remediation_sql?: string | null;
  remediation_regex?: string | null;

  sql_dialect:
    | "BIGQUERY"
    | "SNOWFLAKE"
    | "DATABRICKS"
    | "GENERIC";

  safety_status: DqRemediationSafetyStatus;

  reasoning_summary?: string | null;

  steward_approval_required: boolean;
}

export type DqRemediationArtifactPreference =
  | "AUTO"
  | "SQL"
  | "REGEX";

export interface DqRemediationGenerateRequest {
  profile_run_id?: string | null;
  connection_id?: string | null;

  source_table?: string;

  sql_dialect?:
    | "BIGQUERY"
    | "SNOWFLAKE"
    | "DATABRICKS"
    | "GENERIC";

  artifact_preference?:
    DqRemediationArtifactPreference;
}

export interface DqRemediationFeedbackRequest {
  decision:
    | "APPROVE"
    | "REJECT"
    | "REQUEST_CHANGES";

  reason_code?: string | null;
  note?: string | null;
}

export interface DqRemediationFeedbackResponse {
  organization_id: string;

  feedback_event_id: string;
  recommendation_id: string;
  profile_run_id?: string | null;

  decision:
    | "APPROVE"
    | "REJECT"
    | "REQUEST_CHANGES";

  approval_status:
    | "APPROVED"
    | "REJECTED"
    | "CHANGES_REQUESTED";

  reason_code?: string | null;
  note?: string | null;

  steward_user: string;
  created_at: string;
}

export interface MatchExplainResponse {
  explanation_id: string;
  ai_decision: DecisionType;
  confidence: number;

  workflow_ticket_created?: boolean
  workflow_ticket_key?: string | null
  workflow_ticket_url?: string | null
  
  risk_flag: RiskFlag;
  explanation_summary: string;
  rule_analysis: RuleAnalysis[];
  recommended_action: DecisionType;
  final_recommended_action?: DecisionType;
  model_version: string;
  match_score?: number;

  signal_packets?: SignalPacket[];
  signal_contributions?: SignalContribution[] | null;
   

  composite_risk_score?: number;
  composite_risk_band?: string;
  primary_risk_driver?: string;

  risk_drivers?: string[];

  model_provider?: string;
  prompt_version?: string;
  feature_schema_version?: string;

  domain?: DomainType;
  policy_version?: string;
  policy_hash?: string;

  request_id?: string;
  trace_id?: string;
  audit_packet_id?: string;

  record_a_address_intelligence?: AddressIntelligenceResult;
  record_b_address_intelligence?: AddressIntelligenceResult;
  address_match_insight?: string;
  address_similarity_score?: number;
  triggered_rules?: string[];

  decision_confidence_score?: number;
  automation_tier?: string;
  automation_readiness_score?: number;
  automation_readiness_label?: string;
  automation_policy_status?: string;
  estimated_false_positive_risk?: number;
  
  primary_signal?: string;
  entity_resolution_signals?: SignalExplanation[];
  entity_resolution_summary?: string;
  match_evidence_timeline?: MatchEvidenceTimelineEvent[];
  ai_insight?: string | null;
  signal_weights?: Record<string, number> | null;
}

export type MatchFeedbackRequest = {
  explanation_id: string;
  steward_decision: DecisionType;

  steward_override_reason?: string | null;

  override_reason_code?: OverrideReasonCode | null;
  override_reason_note?: string | null;

  steward_user: string;

  domain?: DomainType;
  policy_version?: string;
  request_id?: string;
};

export type MatchFeedbackResponse = {
  decision_id: string;
  explanation_id: string;
  status: FeedbackStatus;
  override_flag: string;
  feedback_event_id?: string;
  feedback_at?: string;
  recommended_action?: DecisionType;
  audit_packet_id?: string;
  request_id?: string;
  submitted_at: string;
};

// Governance Intelligence Types

export type GovernanceKPI = {
  total_datasets: number;
  certified_datasets: number;
  ready_for_certification: number;
  in_progress_certifications: number;
  avg_fair_score: number;
  open_governance_issues: number;
  total_checks: number;
  passed_checks: number;
  failed_checks: number;
  check_pass_rate: number;
  active_policies: number;
  recent_policy_changes_30d: number;
};

export type GovernanceDatasetStatus = {
  dataset_id: string;
  dataset_name: string;
  domain?: NullableString;
  subdomain?: NullableString;
  data_owner?: NullableString;
  registry_steward_name?: NullableString;
  registry_pod_owner?: NullableString;
  certification_status?: NullableString;
  certification_tier?: NullableString;
  lifecycle_stage?: NullableString;
  pass_fail_status?: NullableString;
  certified_for_use?: boolean | null;
  lineage_complete?: boolean | null;
  provenance_complete?: boolean | null;
  ready_for_certification?: boolean | null;
  certification_blocker_reason?: NullableString;
  certification_readiness_band?: NullableString;
  certification_readiness_score?: number | null;
  dq_health_score?: number | null;
  dq_risk_score?: number | null;
  dq_score?: number | null;
  automation_readiness_score?: number | null;
  total_findings?: number | null;
  critical_findings?: number | null;
  high_findings?: number | null;
  medium_findings?: number | null;
  low_findings?: number | null;
  failed_rule_count?: number | null;
  failed_checks: number;
  fair_overall_score?: number | null;
  fair_maturity_band?: NullableString;
  approved_by?: NullableString;
  certification_steward_name?: NullableString;
  certification_pod_owner?: NullableString;
  event_timestamp?: NullableString;
  last_validated_at?: NullableString;
  certification_effective_at?: NullableString;
  certification_expires_at?: NullableString;
  recertification_due_at?: NullableString;
  ai_recommendation?: GovernanceRecommendation | null;
  

};

export type GovernanceBlocker = {
  blocker_reason: string;
  blocker_count: number;
};

export type GovernancePolicyActivity = {
  change_id?: NullableString;
  domain?: NullableString;
  policy_version?: NullableString;
  policy_name?: NullableString;
  change_type?: NullableString;
  changed_object?: NullableString;
  changed_by?: NullableString;
  changed_at?: NullableString;
  publish_status?: NullableString;
};

export type GovernanceOverviewResponse = {
  kpis: GovernanceKPI;
  dataset_statuses: GovernanceDatasetStatus[];
  top_blockers: GovernanceBlocker[];
  policy_activity: GovernancePolicyActivity[];
  ai_feedback_metrics: AiRecommendationFeedbackMetrics;
};

export type ScoreBucketBreakdown = {
  bucket: string;
  reviewed: number;
  false_positives: number;
  false_negatives: number;
  fp_rate: number | null;
  fn_rate: number | null;
};

export type MetricsOverviewResponse = {
  days: number;
  total_explanations: number;

  avg_ai_confidence: number | null;
  override_rate: number | null;
  avg_time_to_feedback_minutes: number | null;

  decisions: CountMap;
  risk_flags: CountMap;
  recommended_actions: CountMap;

  top_triggered_rules: NamedCount[];
  top_override_reasons: NamedCount[];

  total_reviewed: number;
  true_positives: number;
  true_negatives: number;
  false_positives: number;
  false_negatives: number;
  review_or_other: number;

  fp_rate: number | null;
  fn_rate: number | null;
  precision: number | null;
  recall: number | null;

  top_fp_rules: NamedCount[];
  top_fn_rules: NamedCount[];

  score_buckets: CountMap;
  fpfn_by_score_bucket: ScoreBucketBreakdown[];

  domain?: DomainType;
  policy_version?: string;
  generated_at?: string;
  request_id?: string;
  learning_timeline: LearningTimelineItem[];
};

/* =========================
   DQ Dashboard Types
   ========================= */

export type DqDashboardRow = {
  profile_run_id?: string | null;
  metric_date: string;
  domain: DomainType;

  total_records: number;
  avg_record_score: number | null;
  records_below_threshold: number;
  records_below_threshold_rate: number | null;

  dq_health_score: number | null;
  dq_risk_score: number | null;
  automation_readiness_score: number | null;

  avg_completeness_score: number | null;
  avg_validity_score: number | null;
  avg_standardization_score: number | null;
  avg_consistency_score: number | null;
  avg_uniqueness_score: number | null;

  total_findings: number;
  critical_findings: number;
  high_findings: number;
  medium_findings: number;
  low_findings: number;

  open_findings_count: number;
  accepted_findings_count: number;
  resolved_findings_count: number;
  waived_findings_count: number;
  records_with_findings: number;

  failed_rule_count: number;
  duplicate_record_count: number;

  scored_critical_issue_count: number;
  scored_high_issue_count: number;
  scored_medium_issue_count: number;
  scored_low_issue_count: number;
  scored_total_issue_count: number;

  records_flagged_by_ai: number;
  ai_recommendations_generated: number;
  open_ai_recommendations: number;
  accepted_ai_recommendations: number;
  rejected_ai_recommendations: number;
  implemented_ai_recommendations: number;
  high_priority_recommendations: number;
  medium_priority_recommendations: number;
  low_priority_recommendations: number;
  avg_ai_recommendation_confidence: number | null;
  ai_rules_flagged_count: number;

  steward_actions_taken: number;
  automated_fixes_applied: number;

  scored_record_count: number;
  min_record_score: number | null;
  max_record_score: number | null;
  very_low_score_count: number;
  low_score_count: number;
  medium_score_count: number;
  high_score_count: number;

  total_rules_executed: number;
  rules_triggered: number;
  configured_rule_count: number;
  active_rule_count: number;
  inactive_rule_count: number;
  configured_critical_rules: number;
  configured_high_rules: number;
  configured_medium_rules: number;
  configured_low_rules: number;

  validity_rule_count: number;
  completeness_rule_count: number;
  standardization_rule_count: number;
  uniqueness_rule_count: number;
  consistency_rule_count: number;
  avg_rule_weight: number | null;

  findings_per_record_rate: number | null;
  duplicate_rate: number | null;
  ai_flagged_record_rate: number | null;
  automated_fix_rate: number | null;
  steward_action_rate: number | null;
  findings_resolution_rate: number | null;
  ai_recommendation_acceptance_rate: number | null;
  ai_recommendation_implementation_rate: number | null;
  impacted_record_rate: number | null;

  summary_created_at?: string;
};

export interface GovernanceRecommendation {
  recommendation_id: string;

  headline: string;
  summary: string;
  priority: string;
  recommended_actions: string[];
  supporting_evidence: string[];
  confidence: number;
}

export interface GovernanceDataset {
  ai_recommendation?: GovernanceRecommendation | null;
}

export interface DqSuggestedRule {
  rule_id: string;
  rule_name: string;

  dimension:
    | "COMPLETENESS"
    | "VALIDITY"
    | "UNIQUENESS"
    | "CONSISTENCY"
    | "STANDARDIZATION"
    | "TIMELINESS"
    | "INTEGRITY"
    | "ACCURACY";

  severity:
    | "LOW"
    | "MEDIUM"
    | "HIGH"
    | "CRITICAL";

  rule_type: string;

  description: string;
  rationale: string;
  business_risk: string;

  rule_logic: string;
  sql_example?: string | null;

  implementation_target: string;
  expected_impact: string;

  estimated_automation_gain_points: number;

  supporting_evidence: string[];

  confidence: number;
}

export interface DqRuleSuggestions {
  headline: string;
  summary: string;

  priority:
    | "LOW"
    | "MEDIUM"
    | "HIGH"
    | "CRITICAL";

  rule_strategy:
    | "PREVENTIVE"
    | "REMEDIATION"
    | "MIXED";

  suggested_rules: DqSuggestedRule[];

  recommended_sequence: string[];

  supporting_evidence: string[];

  confidence: number;
}

export interface DqRuleSuggestionsResponse {
  days: number;

  domain: string;

  dataset_id?: string | null;
  dataset_name?: string | null;

  metric_date?: string | null;

  source: string;

  model_provider: string;

  used_llm: boolean;

  ai_rule_suggestions: DqRuleSuggestions;

  generated_at?: string | null;
}

export interface CsvPreviewResponse {
  organization_id: string;
  file_name: string;
  columns: string[];
  rows: Array<Record<string, string | null>>;
  total_preview_rows: number;
  delimiter: string;
  encoding: string;
}

export interface CsvProfileResponse 
     extends UniversalProfileIntelligenceFields {
  organization_id: string;
  profile_run_id: string;

  file_name: string;
  domain: string;

  record_count: number;
  total_records: number;

  avg_record_score: number | null;

  records_below_threshold: number;
  records_with_findings: number;
  total_findings: number;
  duplicate_record_count: number;

  source_type: "CSV";
  generated_at?: string | null;
}

export interface GoogleSheetsProfileResponse
  extends UniversalProfileIntelligenceFields {
  success: boolean;
  organization_id?: string;

  profile_run_id: string;
  domain?: string;

  total_records: number;
  avg_record_score: number | null;

  records_below_threshold: number;
  records_with_findings: number;
  total_findings: number;
  duplicate_record_count: number;

  spreadsheet_id?: string;
  spreadsheet_title?: string | null;
  sheet_name?: string | null;

  source_type?: string;
}

export interface OneDriveProfileResponse
  extends UniversalProfileIntelligenceFields {
  success: boolean;
  organization_id?: string;

  profile_run_id: string;
  domain?: string;

  total_records: number;
  avg_record_score: number | null;

  records_below_threshold: number;
  records_with_findings: number;
  total_findings: number;
  duplicate_record_count: number;

  drive_id: string;
  item_id: string;
  workbook_name?: string | null;
  sheet_name?: string | null;

  source_type?: string;
}


export interface UniversalSemanticType {
  semantic_type: string;
  confidence?: number | null;
  source?: string | null;
  reason?: string | null;
  requires_review?: boolean;
}

export interface UniversalProfileFinding {
  rule_id: string;
  rule_version?: string | null;
  logical_key?: string | null;
  rule_family?: string | null;
  evaluator?: string | null;
  severity?: string | null;

  field_name?: string | null;
  semantic_type?: string | null;

  source_row_id?: string | null;
  record_id?: string | null;

  finding_message?: string | null;
  observed_value?: unknown;
  proposed_value?: unknown;

  deterministic?: boolean;
  remediation_available?: boolean;
  remediation_type?: string | null;
}

export interface UniversalProfileRulesShadow {
  mode: string;
  authoritative: boolean;

  profile_run_id?: string | null;
  total_records: number;

  resolved_rule_count: number;
  executed_rule_count: number;
  total_findings: number;

  semantic_types: Record<
    string,
    UniversalSemanticType
  >;

  findings: UniversalProfileFinding[];
}

export interface UniversalProfileIntelligenceFields {
  universal_rules_shadow_enabled?: boolean;
  universal_rules_shadow?:
    | UniversalProfileRulesShadow
    | null;
}

export interface DqAiOverallAnalysis {
  dq_health_summary: string;
  highest_priority_issue: string;
  recommended_next_action: string;
  confidence: number;
}

export interface DqApprovedRecommendationResponse {
  recommendation_id: string;
  organization_id: string;

  profile_run_id?: string | null;
  domain?: string | null;
  rule_id?: string | null;
  field_name?: string | null;
  dimension?: string | null;
  severity?: string | null;

  recommendation_title?: string | null;
  recommendation_summary?: string | null;
  suggested_action?: string | null;
  suggested_rule_type?: string | null;
  suggested_sql?: string | null;
  suggested_regex?: string | null;

  automation_recommendation?: string | null;
  automation_confidence?: number | null;

  remediation_artifact_type?: string | null;
  remediation_safety_status?: string | null;
  remediation_approval_status?: string | null;

  // Exact persisted remediation artifact/version promoted into governance.
  remediation_sql?: string | null;
  remediation_regex?: string | null;
  remediation_reasoning_summary?: string | null;
  reasoning_summary?: string | null;
  remediation_sql_dialect?: string | null;
  sql_dialect?: string | null;
  remediation_version_id?: string | null;
  remediation_version_number?: number | null;
  version_number?: number | null;

  remediation_approved_by?: string | null;
  remediation_approved_at?: string | null;
  remediation_generated_at?: string | null;

  created_at?: string | null;
}

export type DqExecutionVendor =
  | "SNOWFLAKE"
  | "DATABRICKS"
  | "BIGQUERY"
  | "GOOGLE"
  | "MICROSOFT";

export type DqExecutionStatus =
  | "VALIDATED_NOT_EXECUTED"
  | "SUCCEEDED"
  | "FAILED";

export type DqExecutionSqlDialect =
  | "BIGQUERY"
  | "SNOWFLAKE"
  | "DATABRICKS"
  | "GENERIC";

export interface DqExecutionValidationRequest {
  profile_run_id: string;
  connection_id: string;
  technical_approved_by: string;
}

export interface DqExecutionRequest extends DqExecutionValidationRequest {
  confirm_execution: true;
}

export interface GoogleSheetsDqExecutionRequest
  extends DqExecutionValidationRequest {
  spreadsheet_id: string;
  sheet_name: string;
  header_row: number;
  confirm_execution: true;
}

export interface OneDriveDqExecutionRequest
  extends DqExecutionValidationRequest {
  drive_id: string;
  item_id: string;
  sheet_name: string;
  header_row: number;
  confirm_execution: true;
}

export interface DqExecutionResponse {
  organization_id: string;
  execution_id: string;
  recommendation_id: string;
  profile_run_id: string;
  remediation_version_id?: string | null;

  connection_id: string;
  vendor: DqExecutionVendor;
  environment: string;
  domain?: string | null;

  artifact_type: "SQL" | "REGEX";
  artifact_hash: string;
  approval_status: "APPROVED";
  safety_status: string;
  sql_dialect?: DqExecutionSqlDialect | null;

  requested_by: string;
  technical_approved_by: string;

  execution_status: DqExecutionStatus;
  vendor_status: string;

  execution_target?:| "SQL_DATABASE" | "GOOGLE_SHEETS" | "ONEDRIVE_EXCEL"| string | null;
  rule_id?: string | null;
  field_name?: string | null;

  spreadsheet_id?: string | null;
  sheet_name?: string | null;

  reprofile_required?: boolean | null;
  policy_verification_status?: string | null;

  rows_evaluated?: number | null;
  rows_matched?: number | null;
  rows_changed?: number | null;
  rows_skipped?: number | null;
  rows_affected?: number | null;
  statement_id?: string | null;

  started_at?: string | null;
  executed_at?: string | null;
  validated_at: string;

  error_message?: string | null;
}

export interface DqApprovedRecommendationListResponse {
  organization_id: string;
  count: number;
  recommendations: DqApprovedRecommendationResponse[];
}

export interface DqRemediationVersion {
  remediation_version_id: string;
  organization_id: string;
  recommendation_id: string;
  profile_run_id?: string | null;
  version_number: number;

  artifact_type?: string | null;
  remediation_sql?: string | null;
  remediation_regex?: string | null;
  sql_dialect?: string | null;

  safety_status?: string | null;
  reasoning_summary?: string | null;
  steward_approval_required?: boolean | null;
  generation_reason?: string | null;
  generated_from_feedback_event_id?: string | null;
  revision_guidance?: string | null;

  ai_provider?: string | null;
  ai_model?: string | null;
  generated_by?: string | null;

  generated_at: string;
  created_at: string;
}

export interface DqRemediationVersionListResponse {
  recommendation_id: string;
  versions: DqRemediationVersion[];
}

export interface DqFindingEvidenceSample {
  finding_id?: string;
  source_row_id?: string;
  record_id?: string;
  field_name?: string;
  rule_id?: string;
  dimension?: string;
  severity?: string;
  finding_message?: string;
  observed_value?: string | null;
  proposed_value?: string | null;
}

export interface DqAiRecommendation {
  recommendation_id: string;
  profile_run_id?: string;
  domain?: string;

  rule_id: string;
  field_name?: string | null;
  dimension: string;
  severity: string;

  finding_count?: number;
  affected_record_count?: number;
  affected_percent?: number;
  evidence_samples?: DqFindingEvidenceSample[];

  recommendation_title: string;
  business_impact: string;
  recommended_remediation: string;

  implementation_type:
    | "SQL"
    | "REGEX"
    | "RULE_CONFIG"
    | "ENRICHMENT"
    | "MANUAL_REVIEW"
    | string;

  suggested_sql?: string | null;
  suggested_regex?: string | null;
  suggested_threshold?: number | null;

  automation_recommendation:
    | "AUTO_FIX_CANDIDATE"
    | "ENRICH_IF_AUTHORITATIVE_SOURCE_AVAILABLE"
    | "STEWARD_REVIEW_REQUIRED"
    | "REVIEW_REQUIRED"
    | string;

  automation_confidence: number;
  steward_approval_required: boolean;

  reasoning_summary: string;
  status?: string;
}

export interface DqAiAnalysisResponse {
  success: boolean;
  profile_run_id: string;
  domain: string;
  recommendation_count: number;

  overall_analysis: {
    dq_health_summary: string;
    highest_priority_issue: string;
    recommended_next_action: string;
    confidence: number;
  };

  recommendations: DqAiRecommendation[];
}

export type ConnectionHealthStatus =
  | "NOT_TESTED"
  | "HEALTHY"
  | "UNHEALTHY"
  | "DEGRADED"
  | "UNKNOWN";

export type EnterpriseConnection = {
  connection_id: string;
  connection_name: string;
  vendor: string;
  product?: string | null;
  connection_type: string;
  environment: string;

  description?: string | null;
  api_endpoint?: string | null;
  workspace_name?: string | null;

  authentication_type: string;
  connection_capabilities: string[];

  connection_details?: Record<string, unknown> | null;
  network_config?: Record<string, unknown> | null;
  health_check_config?: Record<string, unknown> | null;
  tags?: string[];

  health_status: ConnectionHealthStatus;
  is_active: boolean;

  created_by?: string | null;
  created_at: string;
  updated_at: string;
};

export type OnboardingStatusResponse = {
  user_exists: boolean;
  organization_exists: boolean;
  subscription_exists: boolean;
  onboarding_complete: boolean;
  current_step: string;

  organization_id?: string | null;
  organization_name?: string | null;
  user_role?: string | null;

  subscription_plan?: string | null;
  subscription_status?: string | null;
  trial_end_date?: string | null;
};

export type OrganizationOnboardingRequest = {
  organization_name: string;
  company_domain?: string | null;
  industry?: string | null;
  company_size?: string | null;
  country?: string | null;
  timezone: string;
  enabled_domains: string[];
};

export type OrganizationOnboardingResponse = {
  organization_id: string;
  organization_name: string;

  user_id: string;
  email: string;
  role: string;

  subscription_id: string;
  subscription_plan: string;
  subscription_status: string;

  trial_start_date: string;
  trial_end_date?: string | null;

  max_users?: number | null;
  max_connections?: number | null;
  max_monthly_explanations?: number | null;

  onboarding_complete: boolean;
  current_step: string;
};

export type EnterpriseConnectionListResponse = {
  items: EnterpriseConnection[];
  page: number;
  page_size: number;
  total: number;
  total_pages: number;
};

export type ConnectionCredentialInput = {
  authentication_type: string;

  token?: string | null;
  access_token?: string | null;

  username?: string | null;
  password?: string | null;
  api_key?: string | null;

  client_id?: string | null;
  client_secret?: string | null;
  token_url?: string | null;
  scope?: string | null;
  scopes?: string[];

  service_account_json?: Record<string, unknown> | null;

  private_key?: string | null;
  private_key_passphrase?: string | null;

  additional_properties?: Record<string, unknown>;
};

export type EnterpriseConnectionCreateRequest = {
  connection_name: string;
  vendor: string;
  product?: string;

  connection_type: string;
  environment: string;

  description?: string | null;
  api_endpoint?: string | null;
  workspace_name?: string | null;

  connection_capabilities: string[];
  credentials: ConnectionCredentialInput;

  connection_details?: Record<string, unknown>;
  network_config?: {
    timeout_seconds: number;
    retry_attempts: number;
    verify_ssl: boolean;
  };
  health_check_config?: {
    enabled: boolean;
    query?: string | null;
    endpoint?: string | null;
    method?: "GET" | "POST" | "HEAD";
  };

  tags?: string[];
};

export type PersistedDqAiRuleSuggestion = {
  organization_id: string;
  created_at: string;
  profile_run_id?: string | null;
  recommendation_id: string;
  domain: string;
  rule_id: string;
  field_name?: string | null;
  dimension?: string | null;
  severity?: string | null;
  recommendation_title?: string | null;
  recommendation_summary?: string | null;
  suggested_rule_type?: string | null;
  suggested_sql?: string | null;
  suggested_regex?: string | null;
  suggested_threshold?: number | null;
  automation_recommendation?: string | null;
  automation_confidence?: number | null;
  steward_approval_required?: boolean | null;
  affected_record_count: number;
  affected_percent: number;
  suggested_action?: string | null;
  business_impact?: string | null;
  reasoning_summary?: string | null;
  confidence_score?: number | null;
};

export type AiRecommendationFeedbackMetrics = {
  total_feedback: number;

  approved_count: number;
  rejected_count: number;
  modified_count: number;
  deferred_count: number;

  acceptance_rate: number | null;
  override_rate: number | null;
  defer_rate: number | null;

  avg_ai_confidence: number | null;
  avg_approved_ai_confidence: number | null;
  avg_override_ai_confidence: number | null;

  dq_feedback_count: number;
  governance_feedback_count: number;

  latest_feedback_at: string | null;
};

export type DqDashboardResponse = {
  days: number;
  domain?: DomainType;
  rows: DqDashboardRow[];
  latest: DqDashboardRow | null;
  ai_rule_suggestions?: PersistedDqAiRuleSuggestion[];
  generated_at?: string;
};

export interface SearchRecordPayload {
  member_id?: string | null;
  patient_id?: string | null;
  provider_id?: string | null;
  supplier_id?: string | null;
  product_id?: string | null;
  human_id?: string | null;

  supplier_name?: string | null;
  supplier_name_line_1?: string | null;
  supplier_name_line_2?: string | null;
  contact_email?: string | null;
  supplier_address?: string | null;

  npi?: string | null;
  tax_id?: string | null;
  gtin?: string | null;
  sku?: string | null;
  item_category?: string;

  product_name?: string | null;
  product_variant?: string | null;
  phone_number?: string | null;

  full_name?: string | null;

  first_name?: string | null;
  last_name?: string | null;
  email?: string | null;
  address?: string | null;
  dob?: string | null;
  specialty?: string | null;
  source_system?: string | null;
   // Banking
  account_id?: string | null;
  banking_customer_id?: string | null;
  sap_business_partner_id?: string | null;
  routing_number?: string | null;
  account_number_last4?: string | null;
  institution_name?: string | null;
  account_type?: string | null;
  currency?: string | null;
  account_status?: string | null;
  
}

export type GovernanceDqPolicyComplianceStatus =
  | "MET"
  | "AT_RISK"
  | "NOT_MET"
  | "NOT_EVALUATED";

export interface GovernanceDqPolicyRuleResult {
  dq_rule_id: string;
  authoritative: boolean;
  required: boolean;
  severity?: string | null;

  compliance_status: GovernanceDqPolicyComplianceStatus;

  required_compliance_rate?: number | null;
  measured_compliance_rate?: number | null;

  execution_status?: string | null;

  evaluated_record_count: number;
  passed_record_count: number;
  failed_record_count: number;
  skipped_record_count: number;

  governed_rule_description?: string | null;
  diagnostic_rule_ids: string[];

  compliance_evidence_id?: string | null;

  remediation_approval_status?: string | null;
  remediation_recommendation_id?: string | null;
  remediation_version_id?: string | null;

  // Governed remediation rollup
  remediation_status?:
    | "AUTHORITATIVE_APPROVED"
    | "ALL_DIAGNOSTICS_APPROVED"
    | "PARTIALLY_APPROVED"
    | "PENDING_REVIEW"
    | "NOT_STARTED"
    | null;

  authoritative_remediation_approval_status?: string | null;
  authoritative_remediation_recommendation_id?: string | null;
  authoritative_remediation_version_id?: string | null;

  diagnostic_rule_count: number;
  diagnostic_recommendation_rule_count: number;
  approved_diagnostic_rule_count: number;

  approved_diagnostic_rule_ids: string[];

  diagnostic_remediation_states: Array<Record<string, unknown>>;

  reason?: string | null;
}

export interface GovernanceDqPolicyComplianceResponse {
  organization_id: string;

  policy_id?: string | null;
  policy_version?: string | null;

  domain: string;
  profile_run_id: string;

  policy_compliance_status: GovernanceDqPolicyComplianceStatus;

  mapped_rule_count: number;
  required_rule_count: number;
  met_rule_count: number;
  at_risk_rule_count: number;
  not_met_rule_count: number;
  not_evaluated_rule_count: number;

  evaluated_at?: string | null;

  rule_results: GovernanceDqPolicyRuleResult[];
}

export interface RecordSearchResult {
  record_id: string;
  mdm_id?: string | null;
  domain: string;
  display_name?: string | null;
  full_name?: string | null;
  source_system?: string | null;
  golden_record_flag?: boolean | null;
  phone_number?: string | null;
  record?: SearchRecordPayload | null;
  account_id?: string | null;
  banking_customer_id?: string | null;
  sap_business_partner_id?: string | null;
  routing_number?: string | null;
  account_number_last4?: string | null;
  institution_name?: string | null;
  account_type?: string | null;
  currency?: string | null;
  account_status?: string | null;
  email?: string | null;
}

export interface RecordSearchResponse {
  results: RecordSearchResult[];
}