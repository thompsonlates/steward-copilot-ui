// src/api/client.ts



import type {

  MatchExplainRequest,

  MatchExplainResponse,

  MatchFeedbackRequest,

  MatchFeedbackResponse,

  MetricsOverviewResponse,

  DqDashboardResponse,

  GovernanceOverviewResponse,

  RecordSearchResponse,

  DqRuleSuggestionsResponse,

  DqRemediationGenerateResponse,

  ProductAccessErrorDetail,

  GovernanceDqPolicyComplianceResponse,

  AzureSqlTablesResponse,

  AzureSqlPreviewResponse,

  AzureSqlProfileResponse,
  ProfileRuleRejectResponse,
  ProfileRuleApproveResponse,
  ProfileRuleRejectRequest,
  ProfileRuleAnalyzeRequest,
  ProfileRuleCandidateResponse,
  ProfileRulePreviewResponse,

} from "./types";



import type {

  CsvPreviewResponse,

  CsvProfileResponse,

  GoogleSheetsProfileResponse,

  OneDriveProfileResponse,

  DatabricksPreviewResponse,

  DatabricksProfileResponse,

  BigQueryPreviewResponse,

  BigQueryProfileResponse,

  SnowflakePreviewResponse,

  SnowflakeProfileResponse,

} from "./types";



import type {

  DqApprovedRecommendationListResponse,

  DqExecutionRequest,

  DqExecutionResponse,

  DqExecutionValidationRequest,

  GoogleSheetsDqExecutionRequest,

  DqRemediationGenerateRequest,

  OneDriveDqExecutionRequest,



} from "./types";



import type {

  DqAiAnalysisResponse,

  DqRemediationVersionListResponse,

} from "./types";



import type { DqDomain } from "../config/dqDomainConfig";



import type {

  EnterpriseConnection,

  EnterpriseConnectionCreateRequest,

  EnterpriseConnectionListResponse,

} from "./types";



import type {

  DqRemediationFeedbackRequest,

  DqRemediationFeedbackResponse,

} from "./types";





import type {

  OnboardingStatusResponse,

  OrganizationOnboardingRequest,

  OrganizationOnboardingResponse,

} from "./types";



export type AuthContextUser = {

  email: string;

  name?: string | null;

  picture?: string | null;

  google_sub: string;

  email_verified: boolean;

  organization_id?: string | null;

  customer_id?: string | null;

  user_id?: string | null;

};



export type AuthContextResponse = {

  access_token: string;

  token_type: string;

  expires_in: number;

  user: AuthContextUser;

};





const BASE_URL = import.meta.env.VITE_API_BASE_URL?.replace(/\/$/, "") || "";



function makeRequestId(): string {

  if (

    typeof crypto !== "undefined" &&

    typeof crypto.randomUUID === "function"

  ) {

    return crypto.randomUUID();

  }



  return `req\_${Date.now()}\_${Math.random().toString(36).slice(2, 10)}`;

}



function buildHeaders(extraHeaders?: HeadersInit): HeadersInit {

  const token = localStorage.getItem("token");



  return {

    "Content-Type": "application/json",

    ...(token ? { Authorization: `Bearer ${token}` } : {}),

    ...(extraHeaders ?? {}),

  };

}



export type ConnectionTestResponse = {

  connection_id: string;

  vendor: string;

  health_status: string;

  success: boolean;

  message: string;

  tested_at: string;

  response_time_ms: number;

};



export type OrganizationUserInviteRequest = {

  email: string;

  display_name: string;

  organization_role: string;

  billing_role: string;

};



export type OrganizationUserInviteResponse = {

  message?: string;

  email?: string;

  user_id?: string;

  organization_id?: string;

};



function clearAuthenticatedSession(

  reason: "expired" | "inactive" = "expired",

): void {

  localStorage.removeItem("token");



  sessionStorage.setItem(

    "logout_reason",

    reason,

  );

}



function handleUnauthorized(

  response: Response,

): void {

  if (response.status === 401) {

    clearAuthenticatedSession("expired");



    window.location.replace("/login");



    throw new Error(

      "Your session has expired. Please sign in again.",

    );

  }

}



export class ProductAccessError extends Error {

  readonly status = 402;

  readonly code: string;

  readonly subscriptionStatus?: string;

  readonly trialExpired: boolean;

  readonly trialEndsAt?: string | null;



  constructor(

    detail: ProductAccessErrorDetail,

  ) {

    super(

      detail.message ||

        "An active subscription or trial is required.",

    );



    this.name = "ProductAccessError";

    this.code = detail.code;

    this.subscriptionStatus =

      detail.subscription_status;

    this.trialExpired =

      Boolean(detail.trial_expired);

    this.trialEndsAt =

      detail.trial_ends_at;

  }

}



async function handleProductAccessRequired(

  response: Response,

): Promise<void> {

  if (response.status !== 402) {

    return;

  }



  const fallback: ProductAccessErrorDetail = {

    code: "SUBSCRIPTION_REQUIRED",

    subscription_status: "UNKNOWN",

    trial_expired: false,

    message:

      "An active subscription or trial is required " +

      "to continue using AI Data Steward Copilot.",

  };



  let detail = fallback;



  try {

    const body = (await response

      .clone()

      .json()) as {

      detail?: unknown;

    };



    if (

      body.detail &&

      typeof body.detail === "object"

    ) {

      const raw = body.detail as Record<

        string,

        unknown

      >;



      detail = {

        code:

          typeof raw.code === "string"

            ? raw.code

            : fallback.code,

        subscription_status:

          typeof raw.subscription_status === "string"

            ? raw.subscription_status

            : fallback.subscription_status,

        trial_expired:

          typeof raw.trial_expired === "boolean"

            ? raw.trial_expired

            : fallback.trial_expired,

        trial_ends_at:

          typeof raw.trial_ends_at === "string"

            ? raw.trial_ends_at

            : raw.trial_ends_at === null

              ? null

              : undefined,

        message:

          typeof raw.message === "string"

            ? raw.message

            : fallback.message,

      };

    } else if (

      typeof body.detail === "string"

    ) {

      detail = {

        ...fallback,

        message: body.detail,

      };

    }

  } catch {

    // Preserve the safe fallback detail.

  }



  sessionStorage.setItem(

    "product_access_error",

    JSON.stringify(detail),

  );



  window.dispatchEvent(

    new CustomEvent<ProductAccessErrorDetail>(

      "product-access-required",

      {

        detail,

      },

    ),

  );



  throw new ProductAccessError(detail);

}



function requireToken(): string {

  const token = localStorage.getItem("token");



  if (!token) {

    window.location.href = "/login";

    throw new Error("Authentication required.");

  }



  return token;

}



export async function getGovernancePolicyCompliance(params: {

  profileRunId: string;

  domain: string;

  policyId?: string;

  policyVersion?: string;

}): Promise<GovernanceDqPolicyComplianceResponse> {

  const query = new URLSearchParams();



  query.set("profile_run_id", params.profileRunId);

  query.set("domain", params.domain);



  if (params.policyId) {

    query.set("policy_id", params.policyId);

  }



  if (params.policyVersion) {

    query.set("policy_version", params.policyVersion);

  }



  return api<GovernanceDqPolicyComplianceResponse>(

    `/v1/governance/policy-compliance?${query.toString()}`,

  );

}



export async function previewDatabricks(

  payload: {

    connection_id: string;

    preview_limit?: number;

  },

): Promise<DatabricksPreviewResponse> {

  return api<DatabricksPreviewResponse>(

    "/v1/connections/databricks/preview",

    {

      method: "POST",

      body: JSON.stringify(payload),

    },

  );

}



export async function runDatabricksProfile(

  payload: {

    connection_id: string;

    domain: DqDomain;

    business_key_field: string;

    column_mappings: Array<{

      source_column: string;

      target_field: string;

    }>;

    row_limit?: number;

  },

): Promise<DatabricksProfileResponse> {

  return api<DatabricksProfileResponse>(

    "/v1/dq/profile/databricks",

    {

      method: "POST",

      body: JSON.stringify(payload),

    },

  );

}



export async function runGoogleSheetsProfile(

  payload: {

    connection_id: string;
    profile_id?: string;
    profile_name?: string;

    spreadsheet_url: string;

    sheet_name: string;

    domain: DqDomain;

    header_row: number;

    business_key_field: string;

    column_mappings: Array<{

    source_column: string;

    target_field: string;

    }>;

  },

): Promise<GoogleSheetsProfileResponse> {

  return api<GoogleSheetsProfileResponse>(

    "/v1/dq/profile/google-sheets",

    {

      method: "POST",
      body: JSON.stringify(payload),

    },

  );

}

export async function analyzeProfileRule(
  request: ProfileRuleAnalyzeRequest,
): Promise<ProfileRuleCandidateResponse> {
  return api<ProfileRuleCandidateResponse>(
    "/v1/dq/profile-rules/analyze",
    {
      method: "POST",
      body: JSON.stringify(request),
    },
  );
}

export async function createDiscoveryProfileRuleCandidate(
  request: {
    profile_id: string;
    profile_run_id: string;
    field_name: string;
    pattern_summary: string;
    rule_type: string;
    operator: "CONTAINS" | "EQUALS" | "REGEX" | "IN";
    comparison_value: unknown;
    remediation_action:
      | "STANDARDIZE_VALUE"
      | "REPLACE_VALUE"
      | "DELETE_VALUE"
      | "FLAG_FOR_REVIEW";
    replacement_value?: unknown | null;
    confidence: number;
    explanation: string;
  },
): Promise<ProfileRuleCandidateResponse> {
  return api<ProfileRuleCandidateResponse>(
    "/v1/dq/profile-rules/discovery-candidates",
    {
      method: "POST",
      body: JSON.stringify(request),
    },
  );
}

export async function previewProfileRule(
  candidateId: string,
): Promise<ProfileRulePreviewResponse> {
  return api<ProfileRulePreviewResponse>(
    `/v1/dq/profile-rules/${encodeURIComponent(candidateId)}/preview`,
    {
      method: "POST",
    },
  );
}

export async function approveProfileRule(
  candidateId: string,
): Promise<ProfileRuleApproveResponse> {
  return api<ProfileRuleApproveResponse>(
    `/v1/dq/profile-rules/${encodeURIComponent(candidateId)}/approve`,
    {
      method: "POST",
      body: JSON.stringify({
        approved: true,
      }),
    },
  );
}

export async function rejectProfileRule(
  candidateId: string,
  request: ProfileRuleRejectRequest,
): Promise<ProfileRuleRejectResponse> {
  return api<ProfileRuleRejectResponse>(
    `/v1/dq/profile-rules/${encodeURIComponent(candidateId)}/reject`,
    {
      method: "POST",
      body: JSON.stringify(request),
    },
  );
}



export async function previewCsv(

  file: File,

  previewRows = 25,

): Promise<CsvPreviewResponse> {

  const token = requireToken();



  const formData = new FormData();



  formData.append("file", file);

  formData.append(

    "preview_rows",

    String(previewRows),

  );



  const response = await fetch(

    `${BASE_URL}/v1/connections/csv/preview`,

    {

      method: "POST",

      headers: {

        Authorization: `Bearer ${token}`,

      },

      body: formData,

    },

  );



  handleUnauthorized(response);



  if (!response.ok) {

    const text = await response.text();



    throw new Error(

      text ||

        `CSV preview failed with HTTP ${response.status}`,

    );

  }



  return response.json();

}



export async function runCsvProfile(

  payload: {

    file: File;

    domain: DqDomain;

    business_key_field: string;



    column_mappings: Array<{

      source_column: string;

      target_field: string;

    }>;



    minimum_record_score?: number;

  },

): Promise<CsvProfileResponse> {

  const token = requireToken();



  const formData = new FormData();



  formData.append(

    "file",

    payload.file,

  );



  formData.append(

    "domain",

    payload.domain,

  );



  formData.append(

    "business_key_field",

    payload.business_key_field,

  );



  formData.append(

    "column_mappings",

    JSON.stringify(

      payload.column_mappings,

    ),

  );



  formData.append(

    "minimum_record_score",

    String(

      payload.minimum_record_score ?? 80,

    ),

  );



  const response = await fetch(

    `${BASE_URL}/v1/dq/profile/csv`,

    {

      method: "POST",

      headers: {

        Authorization: `Bearer ${token}`,

      },

      body: formData,

    },

  );



  handleUnauthorized(response);



  await handleProductAccessRequired(response);



  if (!response.ok) {

    const text = await response.text();



    throw new Error(

      text ||

        `CSV profiling failed with HTTP ${response.status}`,

    );

  }



  return response.json();

}



export type DqFindingEvidenceSample = {

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

};



export type DqAiRecommendation = {

  organization_id?: string;

  profile_run_id: string;

  recommendation_id: string;

  domain: string;

  rule_id: string;

  field_name?: string | null;

  dimension: string;

  severity: string;



  finding_count: number;

  affected_record_count: number;

  affected_percent: number;

  evidence_samples?: DqFindingEvidenceSample[];



  recommendation_title: string;

  business_impact: string;

  recommended_remediation: string;



  implementation_type:

    | "SQL"

    | "REGEX"

    | "RULE_CONFIG"

    | "ENRICHMENT"

    | "MANUAL_REVIEW";



  suggested_sql?: string | null;

  suggested_regex?: string | null;

  suggested_threshold: number;



  automation_recommendation:

    | "AUTO_FIX_CANDIDATE"

    | "ENRICH_IF_AUTHORITATIVE_SOURCE_AVAILABLE"

    | "STEWARD_REVIEW_REQUIRED"

    | "REVIEW_REQUIRED";



  automation_confidence: number;

  steward_approval_required: boolean;

  reasoning_summary: string;

  status?: string;

};





export async function runDqAiAnalysis(

  profileRunId: string,

): Promise<DqAiAnalysisResponse> {

  return api<DqAiAnalysisResponse>(

    `/v1/dq/profiles/${encodeURIComponent(

      profileRunId,

    )}/ai-analysis`,

    {

      method: "POST",

    },

  );

}



export type AiRecommendationFeedbackRequest = {

  recommendation_id: string;

  recommendation_type: "DQ" | "GOVERNANCE";



  profile_run_id?: string | null;

  domain?: string | null;

  rule_id?: string | null;



  ai_recommendation?: string | null;

  ai_confidence?: number | null;



  steward_decision:

    | "APPROVE"

    | "REJECT"

    | "MODIFY"

    | "DEFER";



  steward_comment?: string | null;

  override_reason?: string | null;



  source_component?: string | null;

};



export async function getDqRemediationVersions(

  recommendationId: string,

): Promise<DqRemediationVersionListResponse> {

  return api<DqRemediationVersionListResponse>(

    `/v1/dq/recommendations/${encodeURIComponent(

      recommendationId,

    )}/remediation-versions`,

  );

}



export async function submitAiRecommendationFeedback(

  payload: AiRecommendationFeedbackRequest,

) {

  return api<{

    success: boolean;

    feedback_id: string;

    recommendation_status: string;

    submitted_at: string;

  }>("/v1/ai-recommendations/feedback", {

    method: "POST",

    body: JSON.stringify(payload),

  });

}



export async function generateDqRemediation(

  recommendationId: string,

  payload: DqRemediationGenerateRequest = {},

): Promise<DqRemediationGenerateResponse> {

  return api<DqRemediationGenerateResponse>(

    `/v1/dq/recommendations/${encodeURIComponent(

      recommendationId,

    )}/generate-sql`,

    {

      method: "POST",

      body: JSON.stringify({

        recommendation_id:

          recommendationId,

        ...payload,

      }),

    },

  );

}





export async function submitDqRemediationFeedback(

  recommendationId: string,

  payload: DqRemediationFeedbackRequest,

): Promise<DqRemediationFeedbackResponse> {

  return api<DqRemediationFeedbackResponse>(

    `/v1/dq/recommendations/${encodeURIComponent(

      recommendationId,

    )}/remediation-feedback`,

    {

      method: "POST",

      body: JSON.stringify(payload),

    },

  );

}



export async function createOrganizationOnboarding(

  payload: OrganizationOnboardingRequest,

): Promise<OrganizationOnboardingResponse> {

  const token = requireToken();



  const response = await fetch(

    `${BASE_URL}/v1/onboarding/organization`,

    {

      method: "POST",

      headers: {

        Accept: "application/json",

        "Content-Type": "application/json",

        Authorization: `Bearer ${token}`,

      },

      body: JSON.stringify(payload),

    },

  );



  handleUnauthorized(response);



  if (!response.ok) {

    const body = (await response

      .json()

      .catch(() => null)) as {

      detail?: string;

    } | null;



    throw new Error(

      body?.detail ??

        "Unable to create the organization workspace.",

    );

  }



  return (await response.json()) as

    OrganizationOnboardingResponse;

}



export async function getOnboardingStatus():

  Promise<OnboardingStatusResponse> {

  const token = requireToken();



  const response = await fetch(

    `${BASE_URL}/v1/onboarding/status`,

    {

      method: "GET",

      headers: {

        Accept: "application/json",

        Authorization: `Bearer ${token}`,

      },

    },

  );



  handleUnauthorized(response);



  if (!response.ok) {

    let message =

      `Unable to load onboarding status (${response.status}).`;



    try {

      const body = (await response.json()) as {

        detail?: string;

      };



      if (body.detail) {

        message = body.detail;

      }

    } catch {

      // Preserve the fallback message.

    }



    throw new Error(message);

  }



  return (await response.json()) as

    OnboardingStatusResponse;

}



export async function startGoogleOAuthAuthorization(

  connectionId: string,

  projectId: string,

  returnUrl: string,

) {

  return api<{

    authorization_url: string;

    connection_id: string;

  }>("/v1/oauth/google/start", {

    method: "POST",

    body: JSON.stringify({

      connection_id: connectionId,

      project_id: projectId,

      return_url: returnUrl,

    }),

  });

}





export async function testGoogleSheetsConnection(

  connectionId: string,

  spreadsheetUrl: string,

) {

  return api<{

    success: boolean;

    organization_id: string;

    spreadsheet_id: string;

    spreadsheet_title?: string | null;

    sheets: Array<{

    sheet_id: number;

    sheet_type?: string | null;

    title: string;

    index: number;

    row_count?: number | null;

    column_count?: number | null;

}>;

  }>("/v1/connections/google-sheets/test", {

    method: "POST",

    body: JSON.stringify({

      connection_id: connectionId,

      spreadsheet_url: spreadsheetUrl,

    }),

  });

}



export async function previewGoogleSheet(

  connectionId: string,

  spreadsheetUrl: string,

  sheetName: string,

  headerRow: number,

  previewLimit: number,

) {

  return api<{

    headers: string[];

    rows: Array<Record<string, unknown>>;

    row_count: number;

  }>("/v1/connections/google-sheets/preview", {

    method: "POST",

    body: JSON.stringify({

      connection_id: connectionId,

      spreadsheet_url: spreadsheetUrl,

      sheet_name: sheetName,

      header_row: headerRow,

      preview_limit: previewLimit,

    }),

  });

}





export async function startMicrosoftOAuthAuthorization(

  connectionId: string,

  returnUrl: string,

) {

  return api<{

    authorization_url: string;

    connection_id: string;

  }>("/v1/oauth/microsoft/start", {

    method: "POST",

    body: JSON.stringify({

      connection_id: connectionId,

      return_url: returnUrl,

    }),

  });

}



export async function testOneDriveConnection(

  connectionId: string,

  workbookUrl: string,

) {

  return api<{

    success: boolean;

    drive_id: string;

    item_id: string;

    workbook_name: string;

    sheets: Array<{

      sheet_id: string;

      title: string;

      index: number;

      visibility?: string | null;

      sheet_type?: string | null;

    }>;

  }>("/v1/connections/onedrive/test", {

    method: "POST",

    body: JSON.stringify({

      connection_id: connectionId,

      workbook_url: workbookUrl,

    }),

  });

}



export async function previewOneDriveWorkbook(

  connectionId: string,

  workbookUrl: string,

  sheetName: string,

  headerRow: number,

  previewLimit: number,

) {

  return api<{

    success: boolean;

    drive_id: string;

    item_id: string;

    workbook_name: string;

    sheet_name: string;

    headers: string[];

    rows: Array<Record<string, unknown>>;

    row_count: number;

  }>("/v1/connections/onedrive/preview", {

    method: "POST",

    body: JSON.stringify({

      connection_id: connectionId,

      workbook_url: workbookUrl,

      sheet_name: sheetName,

      header_row: headerRow,

      preview_limit: previewLimit,

    }),

  });

}



export async function runOneDriveProfile(

  payload: {

    connection_id: string;

    workbook_url: string;

    sheet_name: string;

    domain: DqDomain;

    header_row: number;

    business_key_field: string;

    column_mappings: Array<{

      source_column: string;

      target_field: string;

    }>;

  },

): Promise<OneDriveProfileResponse> {

  return api<OneDriveProfileResponse>(

    "/v1/dq/profile/onedrive",

    {

      method: "POST",

      body: JSON.stringify(payload),

    },

  );

}



export async function refreshAuthContext(): Promise<AuthContextResponse> {

  const token = localStorage.getItem("token");



  const response = await fetch(

    `${BASE_URL}/auth/refresh-context`,

    {

      method: "POST",

      headers: {

        Accept: "application/json",

        Authorization: `Bearer ${token}`,

      },

    },

  );

  handleUnauthorized(response);



  if (!response.ok) {

    let message =

      `Unable to refresh authenticated tenant context (${response.status}).`;



    try {

      const body = (await response.json()) as {

        detail?: string;

      };



      if (body.detail) {

        message = body.detail;

      }

    } catch {

      // Preserve fallback message.

    }



    throw new Error(message);

  }



  const result =

    (await response.json()) as AuthContextResponse;



  if (!result.access_token) {

    throw new Error(

      "Tenant context refresh did not return an access token.",

    );

  }



  if (!result.user?.organization_id) {

    throw new Error(

      "Tenant context refresh did not return organization_id.",

    );

  }



  if (!result.user?.customer_id) {

    throw new Error(

      "Tenant context refresh did not return customer_id.",

    );

  }



  localStorage.setItem(

    "token",

    result.access_token,

  );



  return result;

}

export async function updateEnterpriseConnectionCapabilities(
  connectionId: string,
  connectionCapabilities: string[],
): Promise<EnterpriseConnection> {
  const token = requireToken();

  const response = await fetch(
    `${BASE_URL}/v1/connections/${connectionId}/capabilities`,
    {
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        connection_capabilities: connectionCapabilities,
      }),
    },
  );

  if (!response.ok) {
    const errorBody = await response.text();

    throw new Error(
      errorBody ||
        `Unable to update Enterprise Connection capabilities (${response.status}).`,
    );
  }

  return (await response.json()) as EnterpriseConnection;
}


export async function testEnterpriseConnection(

  connectionId: string,

): Promise<ConnectionTestResponse> {

  const token = requireToken();



  const response = await fetch(

    `${BASE_URL}/v1/connections/${connectionId}/test`,

    {

      method: "POST",

      headers: {

        Accept: "application/json",

        Authorization: `Bearer ${token}`,

      },

    },

  );

  handleUnauthorized(response);



  await handleProductAccessRequired(response);



  if (!response.ok) {

    let message = `Unable to test enterprise connection (${response.status}).`;



    try {

      const errorBody = (await response.json()) as {

        detail?: string;

      };



      if (errorBody.detail) {

        message = errorBody.detail;

      }

    } catch {

      // Keep fallback message.

    }



    throw new Error(message);

  }



  return (await response.json()) as ConnectionTestResponse;

}



export async function deleteEnterpriseConnection(

  connectionId: string,

): Promise<void> {

  await api<void>(

    `/v1/connections/${encodeURIComponent(connectionId)}`,

    {

      method: "DELETE",

    },

  );

}



export async function getEnterpriseConnections(

  page = 1,

  pageSize = 100,

): Promise<EnterpriseConnectionListResponse> {

  const token = requireToken();



  const query = new URLSearchParams({

    page: String(page),

    page_size: String(pageSize),

  });



  const response = await fetch(

    `${BASE_URL}/v1/connections?${query.toString()}`,

    {

      method: "GET",

      headers: {

        Accept: "application/json",

        Authorization: `Bearer ${token}`,

      },

    },

  );

  handleUnauthorized(response);



  if (!response.ok) {

    let message = `Unable to load enterprise connections (${response.status}).`;



    try {

      const errorBody = (await response.json()) as {

        detail?: string;

      };



      if (errorBody.detail) {

        message = errorBody.detail;

      }

    } catch {

      // Keep the fallback message when the response is not JSON.

    }



    throw new Error(message);

  }



  return (await response.json()) as EnterpriseConnectionListResponse;

}



export async function createEnterpriseConnection(

  payload: EnterpriseConnectionCreateRequest,

): Promise<EnterpriseConnection> {

  const token = requireToken();



  const response = await fetch(

    `${BASE_URL}/v1/connections`,

    {

      method: "POST",

      headers: {

        Accept: "application/json",

        "Content-Type": "application/json",

        Authorization: `Bearer ${token}`,

      },

      body: JSON.stringify(payload),

    },

  );



  handleUnauthorized(response);



  await handleProductAccessRequired(response);



  if (!response.ok) {

    let message = `Unable to create enterprise connection (${response.status}).`;



    try {

      const errorBody = (await response.json()) as {

        detail?: string;

      };



      if (errorBody.detail) {

        message = errorBody.detail;

      }

    } catch {

      // Keep the fallback message.

    }



    throw new Error(message);

  }



  return (await response.json()) as EnterpriseConnection;

}



export async function inviteOrganizationUser(

  payload: OrganizationUserInviteRequest,

): Promise<OrganizationUserInviteResponse> {

  const token = requireToken();



  const response = await fetch(

    `${BASE_URL}/v1/organization/users/invite`,

    {

      method: "POST",

      headers: {

        Accept: "application/json",

        "Content-Type": "application/json",

        Authorization: `Bearer ${token}`,

      },

      body: JSON.stringify(payload),

    },

  );



  handleUnauthorized(response);



  await handleProductAccessRequired(response);



  if (!response.ok) {

    const body = (await response

      .json()

      .catch(() => null)) as {

      detail?: string;

    } | null;



    throw new Error(

      body?.detail ??

        "Unable to invite organization user.",

    );

  }



  return response.json();

}





export async function api<T>(

  path: string,

  init?: RequestInit,

): Promise<T> {

  const response = await fetch(

    `${BASE_URL}${path}`,

    {

      ...init,

      headers: buildHeaders(init?.headers),

    },

  );



  handleUnauthorized(response);



  await handleProductAccessRequired(response);



  if (!response.ok) {

    let message = `HTTP ${response.status}`;



    try {

      const body = (await response.json()) as {

        detail?: unknown;

      };



      if (typeof body.detail === "string") {

        message = body.detail;

      } else if (body.detail) {

        message = JSON.stringify(body.detail);

      }

    } catch {

      // Keep the HTTP fallback message.

    }



    throw new Error(message);

  }



  return (await response.json()) as T;

}



export async function getGovernanceOverview(

  days = 30,

): Promise<GovernanceOverviewResponse> {

  return api<GovernanceOverviewResponse>(

    `/v1/metrics/governance-overview?days=${days}`,

  );

}



export async function matchExplain(

  payload: MatchExplainRequest,

): Promise<MatchExplainResponse> {

  const body: MatchExplainRequest = {

    ...payload,

    request_id: payload.request_id ?? makeRequestId(),

  };



  return api<MatchExplainResponse>("/v1/match/explain?provider=claude", {

    method: "POST",

    body: JSON.stringify(body),

  });

}



export async function matchFeedback(

  payload: MatchFeedbackRequest,

): Promise<MatchFeedbackResponse> {

  return api<MatchFeedbackResponse>("/v1/match/feedback", {

    method: "POST",

    body: JSON.stringify(payload),

  });

}



export async function getMetricsOverview(

  days = 30,

): Promise<MetricsOverviewResponse> {

  return api<MetricsOverviewResponse>(

    `/v1/metrics/overview?days=${days}`,

  );

}



export async function getApprovedDqRecommendations(

  profileRunId: string,

  limit = 100,

): Promise<DqApprovedRecommendationListResponse> {

  const params = new URLSearchParams({

    profile_run_id: profileRunId,

    limit: String(limit),

  });



  return api<DqApprovedRecommendationListResponse>(

    `/v1/dq/recommendations/approved?${params.toString()}`,

  );

}





export async function validateDqExecution(

  recommendationId: string,

  payload: DqExecutionValidationRequest,

): Promise<DqExecutionResponse> {

  return api<DqExecutionResponse>(

    `/v1/dq/recommendations/${encodeURIComponent(

      recommendationId,

    )}/validate-execution`,

    {

      method: "POST",

      body: JSON.stringify(payload),

    },

  );

}



export async function executeDqRemediation(

  recommendationId: string,

  payload: DqExecutionRequest,

): Promise<DqExecutionResponse> {

  return api<DqExecutionResponse>(

    `/v1/dq/recommendations/${encodeURIComponent(

      recommendationId,

    )}/execute`,

    {

      method: "POST",

      body: JSON.stringify(payload),

    },

  );

}

export async function validateSnowflakeRegexDqExecution(
  recommendationId: string,
  payload: DqExecutionValidationRequest,
): Promise<DqExecutionResponse> {
  return api<DqExecutionResponse>(
    `/v1/dq/recommendations/${encodeURIComponent(
      recommendationId,
    )}/validate-snowflake-regex`,
    {
      method: "POST",
      body: JSON.stringify(payload),
    },
  );
}

export async function executeSnowflakeRegexDqRemediation(
  recommendationId: string,
  payload: DqExecutionRequest,
): Promise<DqExecutionResponse> {
  return api<DqExecutionResponse>(
    `/v1/dq/recommendations/${encodeURIComponent(
      recommendationId,
    )}/execute-snowflake-regex`,
    {
      method: "POST",
      body: JSON.stringify(payload),
    },
  );
}





export async function executeGoogleSheetsDqRemediation(

  recommendationId: string,

  payload: GoogleSheetsDqExecutionRequest,

): Promise<DqExecutionResponse> {

  return api<DqExecutionResponse>(

    `/v1/dq/recommendations/${encodeURIComponent(

      recommendationId,

    )}/execute-google-sheets`,

    {

      method: "POST",

      body: JSON.stringify(payload),

    },

  );

}



export async function executeOneDriveDqRemediation(

  recommendationId: string,

  payload: OneDriveDqExecutionRequest,

): Promise<DqExecutionResponse> {

  return api<DqExecutionResponse>(

    `/v1/dq/recommendations/${encodeURIComponent(

      recommendationId,

    )}/execute-onedrive`,

    {

      method: "POST",

      body: JSON.stringify(payload),

    },

  );

}



export async function getDqDashboardOverview(

  days = 30,

  domain?: string,

): Promise<DqDashboardResponse> {

  const params = new URLSearchParams();



  params.set("days", String(days));



  if (domain) {

    params.set("domain", domain);

  }



  return api<DqDashboardResponse>(

    `/v1/metrics/dq-overview?${params.toString()}`,

  );

}



export async function getDqRuleSuggestions(

  days = 30,

  domain?: string,

  useLlm = false,

): Promise<DqRuleSuggestionsResponse> {

  const params = new URLSearchParams({

    days: String(days),

    use_llm: String(useLlm),

  });



  if (domain) {

    params.set("domain", domain);

  }



  return api<DqRuleSuggestionsResponse>(

    `/v1/metrics/dq-rule-suggestions?${params.toString()}`,

  );

}

export async function searchRecords(

  domain: string,

  q: string,

): Promise<RecordSearchResponse> {

  const params = new URLSearchParams({

    domain,

    q,

  });



  return api<RecordSearchResponse>(

    `/v1/records/search?${params.toString()}`,

  );

}



export async function previewSnowflake(

  payload: {

    connection_id: string;

    preview_limit?: number;

    table_name?: string | null;

  },

): Promise<SnowflakePreviewResponse> {

  return api<SnowflakePreviewResponse>(

    "/v1/connections/snowflake/preview",

    {

      method: "POST",

      body: JSON.stringify(payload),

    },

  );

}



export async function runSnowflakeProfile(

  payload: {

    connection_id: string;

    domain: DqDomain;

    business_key_field: string;

    column_mappings: Array<{

      source_column: string;

      target_field: string;

    }>;

    row_limit?: number;

    table_name?: string | null;

  },

): Promise<SnowflakeProfileResponse> {

  return api<SnowflakeProfileResponse>(

    "/v1/dq/profile/snowflake",

    {

      method: "POST",

      body: JSON.stringify(payload),

    },

  );

}

export async function listAzureSqlTables(
  payload: {
    connection_id: string;
    schema_name?: string | null;
  },
): Promise<AzureSqlTablesResponse> {
  return api<AzureSqlTablesResponse>(
    "/v1/connections/azure-sql/tables",
    {
      method: "POST",
      body: JSON.stringify(payload),
    },
  );
}


export async function previewAzureSql(
  payload: {
    connection_id: string;
    schema_name: string;
    table_name: string;
    preview_limit?: number;
  },
): Promise<AzureSqlPreviewResponse> {
  return api<AzureSqlPreviewResponse>(
    "/v1/connections/azure-sql/preview",
    {
      method: "POST",
      body: JSON.stringify(payload),
    },
  );
}


export async function runAzureSqlProfile(
  payload: {
    connection_id: string;
    schema_name: string;
    table_name: string;
    domain: DqDomain;
    business_key_field: string;
    column_mappings: Array<{
      source_column: string;
      target_field: string;
    }>;
    row_limit?: number;
  },
): Promise<AzureSqlProfileResponse> {
  return api<AzureSqlProfileResponse>(
    "/v1/dq/profile/azure-sql",
    {
      method: "POST",
      body: JSON.stringify(payload),
    },
  );
}



export async function previewBigQuery(

  payload: {

    connection_id: string;

    preview_limit?: number;

  },

): Promise<BigQueryPreviewResponse> {

  return api<BigQueryPreviewResponse>(

    "/v1/connections/bigquery/preview",

    {

      method: "POST",

      body: JSON.stringify(payload),

    },

  );

}



export async function runBigQueryProfile(

  payload: {

    connection_id: string;

    domain: DqDomain;

    business_key_field: string;

    column_mappings: Array<{

      source_column: string;

      target_field: string;

    }>;

    row_limit?: number;

  },

): Promise<BigQueryProfileResponse> {

  return api<BigQueryProfileResponse>(

    "/v1/dq/profile/bigquery",

    {

      method: "POST",

      body: JSON.stringify(payload),

    },

  );

}
