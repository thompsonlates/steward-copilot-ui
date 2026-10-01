import React, {
  useEffect,
  useMemo,
  useState,
} from "react";

import type {
  GoogleSheetsProfileResponse,
} from "../api/types";

import UniversalProfileIntelligence
  from "../components/UniversalProfileIntelligence";

import {
  generateDqRemediation,
  getDqRemediationVersions,
  getEnterpriseConnections,
  previewGoogleSheet,
  runDqAiAnalysis,
  runGoogleSheetsProfile,
  startGoogleOAuthAuthorization,
  submitDqRemediationFeedback,
  testGoogleSheetsConnection,
} from "../api/client";

import type {
  DqAiAnalysisResponse,
  DqRemediationFeedbackResponse,
  DqRemediationGenerateResponse,
  DqRemediationArtifactPreference,
  DqRemediationVersion,
  EnterpriseConnection,
} from "../api/types";


import {
  DQ_DOMAIN_CONFIG,
  type DqDomain,
} from "../config/dqDomainConfig";

type GoogleSheetInfo = {
  sheet_id: number;
  sheet_type?: string | null;
  title: string;
  index: number;
  row_count?: number | null;
  column_count?: number | null;
};

type GoogleSheetsConnectionTestResponse = {
  success: boolean;
  organization_id?: string;
  connection_id?: string;
  spreadsheet_id: string;
  spreadsheet_title?: string | null;
  sheets: GoogleSheetInfo[];
};

type GoogleSheetsPreviewResponse = {
  headers: string[];
  rows: Record<string, unknown>[];
  row_count: number;
};


type MappingState = Record<string, string>;

// Execution readiness is intentionally limited to DQ rules with an explicit
// deterministic Google Sheets REGEX contract. DQ Intelligence performs the
// final backend validation and physical write-back.
const GOOGLE_SHEETS_EXECUTABLE_REGEX_RULE_IDS = new Set<string>([
  "PRODUCT_VARIANT_STANDARDIZATION",
  "FULL_NAME_STANDARDIZATION",
]);

const cardStyle: React.CSSProperties = {
  border: "1px solid #d8dde6",
  borderRadius: 16,
  background: "#ffffff",
  padding: 20,
};

const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "11px 12px",
  borderRadius: 10,
  border: "1px solid #cbd3df",
  fontSize: 14,
  boxSizing: "border-box",
  background: "#ffffff",
  color: "#172033",
};

const primaryButtonStyle: React.CSSProperties = {
  padding: "11px 16px",
  borderRadius: 10,
  border: "1px solid #111827",
  background: "#111827",
  color: "#ffffff",
  cursor: "pointer",
  fontWeight: 700,
};

const secondaryButtonStyle: React.CSSProperties = {
  padding: "11px 16px",
  borderRadius: 10,
  border: "1px solid #cbd3df",
  background: "#ffffff",
  color: "#111827",
  cursor: "pointer",
  fontWeight: 700,
};


function SectionTitle({
  title,
  description,
}: {
  title: string;
  description?: string;
}) {
  return (
    <div style={{ marginBottom: 14 }}>
      <div
        style={{
          fontSize: 17,
          fontWeight: 700,
          color: "#172033",
        }}
      >
        {title}
      </div>

      {description && (
        <div
          style={{
            marginTop: 4,
            fontSize: 13,
            color: "#667085",
            lineHeight: 1.5,
          }}
        >
          {description}
        </div>
      )}
    </div>
  );
}

function normalizeColumnName(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[\s-]+/g, "_");
}

function suggestTargetField(
  sourceColumn: string,
  domain: DqDomain,
): string {
  const normalizedSource =
    normalizeColumnName(sourceColumn);

  const domainConfig =
    DQ_DOMAIN_CONFIG[domain];

  for (const field of domainConfig.fields) {
    const candidateNames = [
      field.field,
      ...field.aliases,
    ].map(normalizeColumnName);

    if (candidateNames.includes(normalizedSource)) {
      return field.field;
    }
  }

  return "";
}

function buildSuggestedMapping(
  headers: string[],
  domain: DqDomain,
): MappingState {
  const mapping: MappingState = {};

  for (const header of headers) {
    mapping[header] =
      suggestTargetField(header, domain);
  }

  return mapping;
}

export default function GoogleSheetsConnectionPanel() {
  const [spreadsheetUrl, setSpreadsheetUrl] =
    useState("");

  const [connection, setConnection] =
    useState<GoogleSheetsConnectionTestResponse | null>(
      null,
    );
  
  const [selectedSheet, setSelectedSheet] =
    useState("");

  const [preview, setPreview] =
    useState<GoogleSheetsPreviewResponse | null>(
      null,
    );

  const [connectionId, setConnectionId] =
    useState<string | null>(null);

  const [googleConnection, setGoogleConnection] =
    useState<EnterpriseConnection | null>(null);

  const [isReconnectingGoogle, setIsReconnectingGoogle] =
    useState(false);

  const [
    googleConnectionLoading,
    setGoogleConnectionLoading,
  ] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function loadGoogleConnection(): Promise<void> {
      setGoogleConnectionLoading(true);

      try {
        const result =
          await getEnterpriseConnections(
            1,
            100,
          );

        if (cancelled) {
          return;
        }

        const googleConnection:
          EnterpriseConnection | undefined =
          result.items
            .filter((item) => {
              const vendor = (item.vendor || "")
                .trim()
                .toUpperCase();
              const authType = (item.authentication_type || "")
                .trim()
                .toUpperCase();
              const environment = (item.environment || "")
                .trim()
                .toUpperCase();

              return (
                item.is_active === true &&
                authType === "GOOGLE_OAUTH" &&
                (vendor === "BIGQUERY" ||
                  vendor === "GOOGLE_BIGQUERY") &&
                (environment === "DEV" ||
                  environment === "STG" ||
                  environment === "STAGING")
              );
            })
            .sort(
              (left, right) =>
                new Date(right.updated_at || right.created_at).getTime() -
                new Date(left.updated_at || left.created_at).getTime(),
            )[0];

        setGoogleConnection(googleConnection || null);

        if (!googleConnection) {
          setConnectionId(null);
          setGoogleConnection(null);

          setError(
            "No active DEV/STG Google OAuth BigQuery connection was found. Connect or activate a non-production Google connection in Enterprise Connections first.",
          );

          return;
        }

        setConnectionId(
          googleConnection.connection_id,
        );

        setGoogleConnection(
          googleConnection,
        );
      } catch (err) {
        if (cancelled) {
          return;
        }

        setGoogleConnection(null);
        setConnectionId(null);

        setError(
          err instanceof Error
            ? err.message
            : "Unable to load the Google OAuth connection.",
        );
      } finally {
        if (!cancelled) {
          setGoogleConnectionLoading(false);
        }
      }
    }

    void loadGoogleConnection();

    return () => {
      cancelled = true;
    };
  }, []);

  const [domain, setDomain] =
    useState<DqDomain>("PRODUCT");

  const [mapping, setMapping] =
    useState<MappingState>({});

  const [testing, setTesting] =
    useState(false);

  const [previewLoading, setPreviewLoading] =
    useState(false);

  const [profiling, setProfiling] =
    useState(false);

  const [error, setError] =
    useState<string | null>(null);

  const [successMessage, setSuccessMessage] =
    useState<string | null>(null);

  const googleProjectId = useMemo(() => {
    if (!googleConnection) {
      return null;
    }

    const connectionDetails =
      googleConnection.connection_details ?? {};

    const detailProjectId =
      typeof connectionDetails.project_id === "string"
        ? connectionDetails.project_id.trim()
        : "";

    if (detailProjectId) {
      return detailProjectId;
    }

    const workspaceProjectId =
      googleConnection.workspace_name?.trim();

    return workspaceProjectId || null;
  }, [googleConnection]);

  const [profileResult, setProfileResult] =
    useState<GoogleSheetsProfileResponse | null>(
      null,
    );

  const [aiAnalyzing, setAiAnalyzing] =
    useState(false);

  const [aiAnalysis, setAiAnalysis] =
    useState<DqAiAnalysisResponse | null>(
      null,
    );


  const [
    expandedRecommendationIds,
    setExpandedRecommendationIds,
  ] = useState<Set<string>>(
    new Set(),
  );


  const [
    remediationByRecommendationId,
    setRemediationByRecommendationId,
  ] = useState<
    Record<string, DqRemediationGenerateResponse>
  >({});

  const [
    remediationLoadingIds,
    setRemediationLoadingIds,
  ] = useState<Set<string>>(
    new Set(),
  );

  const [
    remediationFeedbackByRecommendationId,
    setRemediationFeedbackByRecommendationId,
  ] = useState<
    Record<string, DqRemediationFeedbackResponse>
  >({});

  const [
  remediationFeedbackLoadingIds,
  setRemediationFeedbackLoadingIds,
] = useState<Set<string>>(new Set());

  const [
    remediationVersionsByRecommendationId,
    setRemediationVersionsByRecommendationId,
  ] = useState<
    Record<string, DqRemediationVersion[]>
  >({});

  const [
    remediationVersionsLoadingIds,
    setRemediationVersionsLoadingIds,
  ] = useState<Set<string>>(
    new Set(),
  );

  const [
    expandedVersionHistoryIds,
    setExpandedVersionHistoryIds,
  ] = useState<Set<string>>(
    new Set(),
  );

  const domainConfig =
    DQ_DOMAIN_CONFIG[domain];

  const mappedTargets = useMemo(
    () =>
      Object.values(mapping).filter(
        (value): value is string => Boolean(value),
      ),
    [mapping],
  );

  const requiredTargetFields = useMemo(
    () =>
      domainConfig.fields
        .filter((field) => field.required)
        .map((field) => field.field),
    [domainConfig],
  );

  const missingRequiredFields = useMemo(
    () =>
      requiredTargetFields.filter(
        (fieldName) =>
          !mappedTargets.includes(fieldName),
      ),
    [mappedTargets, requiredTargetFields],
  );

  const duplicateMappedTargets = useMemo(() => {
    const counts = new Map<string, number>();

    for (const target of mappedTargets) {
      counts.set(
        target,
        (counts.get(target) ?? 0) + 1,
      );
    }

    return Array.from(counts.entries())
      .filter(([, count]) => count > 1)
      .map(([target]) => target);
  }, [mappedTargets]);

  const mappingsComplete =
    missingRequiredFields.length === 0 &&
    duplicateMappedTargets.length === 0;

  const requiredMappingLabels =
    domainConfig.fields
      .filter((field) => field.required)
      .map((field) => field.label);


  function resetRemediationState(): void {
  setRemediationByRecommendationId({});
  setRemediationLoadingIds(new Set());
  setRemediationFeedbackByRecommendationId({});
  setRemediationFeedbackLoadingIds(new Set());
  setRemediationVersionsByRecommendationId({});
  setRemediationVersionsLoadingIds(new Set());
  setExpandedVersionHistoryIds(new Set());
}

  function resetConnectionState(): void {
    setConnection(null);
    setSelectedSheet("");
    setPreview(null);
    setMapping({});
    setProfileResult(null);
    setAiAnalysis(null);
    setExpandedRecommendationIds(new Set());
    resetRemediationState();
    setSuccessMessage(null);
    setError(null);
  }

  function handleDomainChange(
    nextDomain: DqDomain,
  ): void {
    setDomain(nextDomain);
    setProfileResult(null);
    setAiAnalysis(null);
    setExpandedRecommendationIds(new Set());
    resetRemediationState();
    setSuccessMessage(null);
    setError(null);

    if (preview) {
      setMapping(
        buildSuggestedMapping(
          preview.headers,
          nextDomain,
        ),
      );
    } else {
      setMapping({});
    }
  }

  async function handleReconnectGoogle(): Promise<void> {
    if (!connectionId) {
      setError(
        "Google OAuth connection is not available.",
      );
      return;
    }

    if (!googleProjectId) {
      setError(
        "Google Cloud project ID is missing from the saved connection.",
      );
      return;
    }

    setIsReconnectingGoogle(true);
    setError(null);
    setSuccessMessage(null);

    try {
      const result =
        await startGoogleOAuthAuthorization(
          connectionId,
          googleProjectId,
          `${window.location.origin}/?page=profile-intelligence`,
        );

      if (!result.authorization_url) {
        throw new Error(
          "Google did not return an authorization URL.",
        );
      }

      window.location.assign(
        result.authorization_url,
      );
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to reconnect Google OAuth.",
      );
      setIsReconnectingGoogle(false);
    }
  }

  async function handleTestConnection(): Promise<void> {
    const trimmedUrl =
      spreadsheetUrl.trim();

    if (!trimmedUrl) {
      setError(
        "Enter a Google Sheets URL first.",
      );
      return;
    }

    if (!connectionId) {
      setError(
        "Google OAuth connection is not available.",
      );
      return;
    }

    setTesting(true);
    setError(null);
    setSuccessMessage(null);
    setProfileResult(null);
    setAiAnalysis(null);

    try {
      const response =
        await testGoogleSheetsConnection(
          connectionId,
          trimmedUrl,
        );

      const typedResponse =
        response as GoogleSheetsConnectionTestResponse;

      setConnection(typedResponse);

      const firstSheet =
        typedResponse.sheets?.[0]?.title ?? "";

      setSelectedSheet(firstSheet);

      setSuccessMessage(
        typedResponse.spreadsheet_title
          ? `Connected to ${typedResponse.spreadsheet_title}.`
          : "Google Sheet connection successful.",
      );
    } catch (err) {
      const message =
        err instanceof Error
          ? err.message
          : "";

      const normalizedMessage =
        message.toLowerCase();

      if (
        normalizedMessage.includes("failed to fetch") ||
        normalizedMessage.includes("access denied") ||
        normalizedMessage.includes("not accessible")
      ) {
        setError(
          "Google Sheet access failed. Reconnect the Google OAuth connection and confirm the signed-in Google account can view this spreadsheet.",
        );
      } else {
        setError(
          message ||
            "Unable to connect to Google Sheets.",
        );
      }
    } finally {
      setTesting(false);
    }
  }

  async function handlePreview(): Promise<void> {
    if (!selectedSheet) {
      setError(
        "Select a worksheet first.",
      );
      return;
    }

    if (!connectionId) {
      setError(
        "Google OAuth connection is not available.",
      );
      return;
    }

    setPreviewLoading(true);
    setError(null);
    setSuccessMessage(null);
    setProfileResult(null);
    setAiAnalysis(null);

    try {
      const response =
        await previewGoogleSheet(
          connectionId,
          spreadsheetUrl.trim(),
          selectedSheet,
          1,
          10,
        );

      const typedResponse =
        response as GoogleSheetsPreviewResponse;

      setPreview(typedResponse);

      setMapping(
        buildSuggestedMapping(
          typedResponse.headers,
          domain,
        ),
      );

      setSuccessMessage(
        `Preview loaded successfully. ${typedResponse.row_count} row${
          typedResponse.row_count === 1 ? "" : "s"
        } returned.`,
      );
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to preview Google Sheet.",
      );
    } finally {
      setPreviewLoading(false);
    }
  }

  function updateMapping(
    sourceColumn: string,
    targetField: string,
  ): void {
    setMapping((current) => ({
      ...current,
      [sourceColumn]: targetField,
    }));

    setProfileResult(null);
    setAiAnalysis(null);
    setExpandedRecommendationIds(new Set());
    resetRemediationState();
    setSuccessMessage(null);
    setError(null);
  }

  async function handleRunProfile(): Promise<void> {
    if (!preview) {
      setError(
        "Preview the worksheet before running the data quality profile.",
      );
      return;
    }

    if (!connectionId) {
      setError(
        "Google OAuth connection is not available.",
      );
      return;
    }

    if (missingRequiredFields.length > 0) {
      const missingLabels =
        domainConfig.fields
          .filter((field) =>
            missingRequiredFields.includes(
              field.field,
            ),
          )
          .map((field) => field.label);

      setError(
        `Map the required ${domain} field${
          missingLabels.length === 1 ? "" : "s"
        }: ${missingLabels.join(", ")}.`,
      );
      return;
    }

    if (duplicateMappedTargets.length > 0) {
      setError(
        `Each target field can only be mapped once. Duplicate mapping${
          duplicateMappedTargets.length === 1 ? "" : "s"
        }: ${duplicateMappedTargets.join(", ")}.`,
      );
      return;
    }

    const mappings = Object.entries(mapping)
      .filter(([, targetField]) =>
        Boolean(targetField),
      )
      .map(
        ([sourceColumn, targetField]) => ({
          source_column: sourceColumn,
          target_field: targetField,
        }),
      );

    setProfiling(true);
    setError(null);
    setSuccessMessage(null);
    setProfileResult(null);
    setAiAnalysis(null);

    try {
      const response =
        await runGoogleSheetsProfile({
          connection_id: connectionId,
          spreadsheet_url:
            spreadsheetUrl.trim(),
          sheet_name: selectedSheet,
          domain,
          header_row: 1,
          business_key_field:
            domainConfig.businessKeyField,
          column_mappings: mappings,
        });

      const typedResponse =
        response as GoogleSheetsProfileResponse;

      setProfileResult(typedResponse);

      setSuccessMessage(
        `${domain} data quality profile completed and persisted successfully.`,
      );
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to run the Google Sheets data quality profile.",
      );
    } finally {
      setProfiling(false);
    }
  }

  function toggleRecommendation(
    recommendationId: string,
  ): void {
    setExpandedRecommendationIds(
      (current) => {
        const next = new Set(current);

        if (next.has(recommendationId)) {
          next.delete(recommendationId);
        } else {
          next.add(recommendationId);
        }

        return next;
      },
    );
  }


  function clearAiAnalysis(): void {
    setAiAnalysis(null);
    setExpandedRecommendationIds(new Set());
    setSuccessMessage(null);
  }

  
  async function handleAnalyzeWithAi(): Promise<void> {
    if (!profileResult?.profile_run_id) {
      setError(
        "Run a Data Quality Profile before requesting AI analysis.",
      );
      return;
    }

    if (profileResult.total_findings === 0) {
      setError(
        "This profile has no DQ findings to analyze.",
      );
      return;
    }

    setAiAnalyzing(true);
    setError(null);
    setSuccessMessage(null);
    setAiAnalysis(null);
    resetRemediationState();

    try {
      const response =
        await runDqAiAnalysis(
          profileResult.profile_run_id,
        );

      setAiAnalysis(response);

      setSuccessMessage(
        `AI analysis completed. ${response.recommendation_count} recommendation${
          response.recommendation_count === 1 ? "" : "s"
        } generated and persisted.`,
      );
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to generate AI Data Quality recommendations.",
      );
    } finally {
      setAiAnalyzing(false);
    }
  }


  async function handleGenerateRemediation(
    recommendationId: string,
    artifactPreference: DqRemediationArtifactPreference = "AUTO",
  ): Promise<void> {
    if (!profileResult?.profile_run_id) {
      setError(
        "Run a Data Quality Profile before generating remediation.",
      );
      return;
    }

    setRemediationLoadingIds((current) => {
      const next = new Set(current);
      next.add(recommendationId);
      return next;
    });

    setError(null);
    setSuccessMessage(null);

    // A newly generated remediation version invalidates steward approval
    // associated with the previous version.
    setRemediationFeedbackByRecommendationId(
      (current) => {
        const next = { ...current };
        delete next[recommendationId];
        return next;
      },
    );

    try {
      const response =
        await generateDqRemediation(
          recommendationId,
          {
            profile_run_id:
              profileResult.profile_run_id,
            source_table: `GOOGLE_SHEETS:${selectedSheet}`,
            sql_dialect: "GENERIC",
            artifact_preference:
              artifactPreference,
          },
        );

      setRemediationByRecommendationId(
        (current) => ({
          ...current,
          [recommendationId]:
            response as DqRemediationGenerateResponse,
        }),
      );

      setExpandedRecommendationIds(
        (current) => {
          const next = new Set(current);
          next.add(recommendationId);
          return next;
        },
      );

      setRemediationVersionsByRecommendationId(
        (current) => {
          const next = { ...current };
          delete next[recommendationId];
          return next;
        },
      );

      setExpandedVersionHistoryIds(
        (current) => {
          const next = new Set(current);
          next.delete(recommendationId);
          return next;
        },
      );

      setSuccessMessage(
        artifactPreference === "SQL"
          ? `SQL remediation generated for recommendation ${recommendationId}.`
          : `Remediation generated for recommendation ${recommendationId}.`,
      );
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to generate DQ remediation.",
      );
    } finally {
      setRemediationLoadingIds(
        (current) => {
          const next = new Set(current);
          next.delete(recommendationId);
          return next;
        },
      );
    }
  }

  async function handleLoadRemediationVersions(
    recommendationId: string,
  ): Promise<void> {
    const alreadyExpanded =
      expandedVersionHistoryIds.has(
        recommendationId,
      );

    if (alreadyExpanded) {
      setExpandedVersionHistoryIds(
        (current) => {
          const next = new Set(current);
          next.delete(recommendationId);
          return next;
        },
      );
      return;
    }

    setRemediationVersionsLoadingIds(
      (current) => {
        const next = new Set(current);
        next.add(recommendationId);
        return next;
      },
    );

    setError(null);

    try {
      const response =
        await getDqRemediationVersions(
          recommendationId,
        );

      setRemediationVersionsByRecommendationId(
        (current) => ({
          ...current,
          [recommendationId]:
            response.versions,
        }),
      );

      setExpandedVersionHistoryIds(
        (current) => {
          const next = new Set(current);
          next.add(recommendationId);
          return next;
        },
      );
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to load remediation version history.",
      );
    } finally {
      setRemediationVersionsLoadingIds(
        (current) => {
          const next = new Set(current);
          next.delete(recommendationId);
          return next;
        },
      );
    }
  }

  async function handleRemediationFeedback(
    recommendationId: string,
    decision:
      | "APPROVE"
      | "REJECT"
      | "REQUEST_CHANGES",
  ): Promise<void> {
    const remediation =
      remediationByRecommendationId[
        recommendationId
      ];

    if (!remediation) {
      setError(
        "Generate a remediation artifact before submitting steward feedback.",
      );
      return;
    }

    if (
      decision === "APPROVE"
      && remediation.safety_status === "BLOCKED"
    ) {
      setError(
        "Blocked remediation cannot be approved.",
      );
      return;
    }

    setRemediationFeedbackLoadingIds((current) => {
      const next = new Set(current);
      next.add(recommendationId);
        return next;
  });

    setError(null);
    setSuccessMessage(null);

    try {
      const note =
        decision === "REQUEST_CHANGES"
          ? window.prompt(
              "Describe the requested remediation changes:",
            )
          : decision === "REJECT"
            ? window.prompt(
                "Optional rejection note:",
              )
            : null;

      if (
        decision === "REQUEST_CHANGES" &&
        !note?.trim()
      ) {
        return;
      }

      const feedbackResponse =
        await submitDqRemediationFeedback(
          recommendationId,
          {
            decision,
            reason_code:
              decision === "APPROVE"
                ? "STEWARD_APPROVED"
                : decision === "REJECT"
                  ? "STEWARD_REJECTED"
                  : "STEWARD_CHANGES_REQUESTED",
            note: note?.trim() || null,
          },
        );

      setRemediationFeedbackByRecommendationId(
        (current) => ({
          ...current,
          [recommendationId]:
            feedbackResponse,
        }),
      );

      setSuccessMessage(
        decision === "APPROVE"
          ? "Remediation approved by the data steward."
          : decision === "REJECT"
            ? "Remediation rejected by the data steward."
            : "Remediation changes requested.",
      );
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to submit remediation feedback.",
      );
    } finally {
      setRemediationFeedbackLoadingIds(
        (current) => {
          const next = new Set(current);
          next.delete(recommendationId);
          return next;
        },
      );
    }
  }


  return (
    <div
      style={{
        display: "grid",
        gap: 18,
      }}
    >
      <div style={cardStyle}>
        <div
          style={{
            display: "flex",
            alignItems: "flex-end",
            gap: 14,
          }}
        >
          <div style={{ flex: 1 }}>
            <div
              style={{
                marginBottom: 6,
                fontSize: 13,
                fontWeight: 600,
                color: "#344054",
              }}
            >
              Google Sheet URL
            </div>

            <input
              value={spreadsheetUrl}
              onChange={(event) => {
                setSpreadsheetUrl(
                  event.target.value,
                );
                resetConnectionState();
              }}
              placeholder="https://docs.google.com/spreadsheets/d/..."
              style={inputStyle}
            />
          </div>

          <button
            type="button"
            onClick={() => {
              void handleTestConnection();
            }}
            disabled={
              testing ||
              googleConnectionLoading ||
              !connectionId ||
              !spreadsheetUrl.trim()
            }
            style={{
              ...primaryButtonStyle,
              minWidth: 210,
              height: 52,
              flexShrink: 0,
              opacity:
                testing ||
                googleConnectionLoading ||
                !connectionId ||
                !spreadsheetUrl.trim()
                  ? 0.55
                  : 1,
              cursor:
                testing ||
                googleConnectionLoading ||
                !connectionId ||
                !spreadsheetUrl.trim()
                  ? "not-allowed"
                  : "pointer",
            }}
          >
            {testing
              ? "Testing..."
              : "Test Connection"}
          </button>
        </div>

        <div
          style={{
            marginTop: 14,
            padding: 14,
            borderRadius: 12,
            border: "1px solid #dbeafe",
            background: "#f8fbff",
          }}
        >
          <div
            style={{
              fontSize: 13,
              fontWeight: 700,
              color: "#1e3a5f",
            }}
          >
            Google OAuth Connection
          </div>

          <div
            style={{
              marginTop: 6,
              fontSize: 12,
              color: "#475569",
              lineHeight: 1.55,
            }}
          >
            {googleConnectionLoading
              ? "Loading your saved Google OAuth connection..."
              : connectionId
                ? "Saved Google OAuth connection found."
                : "No active Google OAuth BigQuery connection is available. Connect Google in Enterprise Connections first."}
          </div>

          {connectionId && !googleConnectionLoading && (
            <div
              style={{
                marginTop: 12,
                display: "flex",
                gap: 10,
                flexWrap: "wrap",
              }}
            >
              <button
                type="button"
                style={{
                  ...secondaryButtonStyle,
                  opacity: isReconnectingGoogle ? 0.6 : 1,
                  cursor: isReconnectingGoogle
                    ? "not-allowed"
                    : "pointer",
                }}
                disabled={isReconnectingGoogle}
                onClick={() => {
                  void handleReconnectGoogle();
                }}
              >
                {isReconnectingGoogle
                  ? "Reconnecting Google..."
                  : "Reconnect Google"}
              </button>
            </div>
          )}
        </div>

        {connection && (
          <div
            style={{
              marginTop: 16,
              display: "grid",
              gridTemplateColumns:
                "1fr 1fr",
              gap: 14,
            }}
          >
            <div>
              <div
                style={{
                  marginBottom: 6,
                  fontSize: 13,
                  fontWeight: 600,
                }}
              >
                Worksheet
              </div>

              <select
                value={selectedSheet}
                onChange={(event) => {
                  setSelectedSheet(
                    event.target.value,
                  );
                  setPreview(null);
                  setMapping({});
                  setProfileResult(null);
                  setAiAnalysis(null);
                  setSuccessMessage(null);
                  setError(null);
                }}
                style={inputStyle}
              >
                {connection.sheets.map(
                  (sheet) => (
                    <option
                      key={sheet.sheet_id}
                      value={sheet.title}
                    >
                      {sheet.title}
                    </option>
                  ),
                )}
              </select>
            </div>

            <div>
              <div
                style={{
                  marginBottom: 6,
                  fontSize: 13,
                  fontWeight: 600,
                }}
              >
                Domain
              </div>

              <select
                value={domain}
                onChange={(event) => {
                  handleDomainChange(
                    event.target.value as DqDomain,
                  );
                }}
                style={inputStyle}
              >
                {(
                  Object.keys(
                    DQ_DOMAIN_CONFIG,
                  ) as DqDomain[]
                ).map((domainName) => (
                  <option
                    key={domainName}
                    value={domainName}
                  >
                    {domainName}
                  </option>
                ))}
              </select>
            </div>

            <div
              style={{
                gridColumn: "1 / -1",
                padding: 14,
                borderRadius: 12,
                border: "1px solid #facc15",
                background: "#fffbeb",
                color: "#713f12",
                fontSize: 12,
                lineHeight: 1.6,
              }}
            >
              <div
                style={{
                  fontSize: 13,
                  fontWeight: 800,
                  color: "#854d0e",
                  marginBottom: 6,
                }}
              >
                Google Sheets Remediation Governance
              </div>

              <div>
                Profile Intelligence analyzes the worksheet, generates the remediation
                artifact, and records the steward decision. Physical source-system
                write-back is performed from DQ Intelligence after governed validation.
              </div>

              <div style={{ marginTop: 8 }}>
                Connected or formula-generated worksheets may be used for analysis. Any
                approved execution must target a <b>values-only physical worksheet</b>.
                For Connected Sheets, BigQuery extracts, ARRAYFORMULA, QUERY,
                IMPORTRANGE, or other generated ranges, create a new worksheet and use
                <b> Paste special → Values only</b> before execution.
              </div>

              <div style={{ marginTop: 8, color: "#92400e" }}>
                <b>Workflow:</b> Select the worksheet → Preview → Profile → Analyze with
                AI → Generate Fix → Steward Approve → READY FOR EXECUTION. Continue in
                DQ Intelligence to validate and execute the exact approved artifact
                version.
              </div>
            </div>

            <div
              style={{
                gridColumn: "1 / -1",
              }}
            >
              <button
                type="button"
                onClick={() => {
                  void handlePreview();
                }}
                disabled={previewLoading}
                style={{
                  ...secondaryButtonStyle,
                  opacity: previewLoading
                    ? 0.65
                    : 1,
                  cursor: previewLoading
                    ? "not-allowed"
                    : "pointer",
                }}
              >
                {previewLoading
                  ? "Loading Preview..."
                  : "Preview Data & Map Columns"}
              </button>
            </div>
          </div>
        )}
      </div>

      {error && (
        <div
          style={{
            border: "1px solid #f3b4b4",
            background: "#fff4f4",
            borderRadius: 12,
            padding: 14,
            color: "#a61b1b",
            fontSize: 13,
          }}
        >
          <strong>Error:</strong>{" "}
          {error}
        </div>
      )}

      {successMessage && (
        <div
          style={{
            border: "1px solid #b7dfc5",
            background: "#f3fbf6",
            borderRadius: 12,
            padding: 14,
            color: "#176b3a",
            fontSize: 13,
          }}
        >
          {successMessage}
        </div>
      )}

      {preview && (
        <>
          <div style={cardStyle}>
            <SectionTitle
              title={`${domain} Column Mapping`}
              description="Map Google Sheet columns to the canonical domain fields used by the Data Quality engine."
            />

            <div
              style={{
                marginBottom: 14,
                padding: "10px 12px",
                borderRadius: 10,
                background: "#f8fafc",
                border: "1px solid #e2e8f0",
                fontSize: 13,
                color: "#475569",
                width: "700px",
                maxWidth: "100%",
                boxSizing: "border-box",
              }}
            >
              <b>Required fields:</b>{" "}
              {requiredMappingLabels.length
                ? requiredMappingLabels.join(", ")
                : "None"}
            </div>

            <div
              style={{
                width: "fit-content",
                maxWidth: "100%",
              }}
            >
              <div
                style={{
                  display: "grid",
                  gap: 8,
                  width: 700,
                  maxWidth: "100%",
                }}
              >
                {preview.headers.map(
                  (header) => (
                    <div
                      key={header}
                      style={{
                        display: "grid",
                        gridTemplateColumns:
                          "260px 28px 360px",
                        gap: 8,
                        alignItems: "center",
                        padding: "8px 10px",
                        border:
                          "1px solid #e2e8f0",
                        borderRadius: 10,
                        background: "#ffffff",
                        width: "700px",
                        maxWidth: "100%",
                        boxSizing: "border-box",
                      }}
                    >
                      <div>
                        <div
                          style={{
                            fontSize: 11,
                            fontWeight: 800,
                            letterSpacing: 0.5,
                            textTransform:
                              "uppercase",
                            color: "#64748b",
                            marginBottom: 4,
                          }}
                        >
                          Google Sheet Column
                        </div>

                        <div
                          style={{
                            fontWeight: 700,
                            color: "#172033",
                          }}
                        >
                          {header}
                        </div>
                      </div>

                      <div
                        style={{
                          textAlign: "center",
                          fontSize: 18,
                          color: "#94a3b8",
                        }}
                      >
                        →
                      </div>

                      <select
                        value={
                          mapping[header] ?? ""
                        }
                        onChange={(event) =>
                          updateMapping(
                            header,
                            event.target.value,
                          )
                        }
                        style={inputStyle}
                      >
                        <option value="">
                          Do not map
                        </option>

                        {domainConfig.fields.map(
                          (field) => (
                            <option
                              key={field.field}
                              value={field.field}
                            >
                              {field.label}
                              {field.required
                                ? " *"
                                : ""}
                            </option>
                          ),
                        )}
                      </select>
                    </div>
                  ),
                )}
              </div>
            </div>

            {duplicateMappedTargets.length > 0 && (
              <div
                style={{
                  marginTop: 12,
                  padding: 12,
                  borderRadius: 10,
                  background: "#fff7ed",
                  border: "1px solid #fed7aa",
                  color: "#9a3412",
                  fontSize: 13,
                  maxWidth: 700,
                  boxSizing: "border-box",
                }}
              >
                Each target field can only be mapped once.
                Review:{" "}
                <strong>
                  {duplicateMappedTargets.join(
                    ", ",
                  )}
                </strong>
              </div>
            )}
          </div>

          <div style={cardStyle}>
            <SectionTitle
              title="Google Sheets Preview"
              description={`${selectedSheet} • ${preview.rows.length} preview rows • ${preview.headers.length} columns`}
            />

            <div
              style={{
                overflowX: "auto",
                border:
                  "1px solid #e2e8f0",
                borderRadius: 12,
              }}
            >
              <table
                style={{
                  width: "100%",
                  borderCollapse:
                    "collapse",
                  fontSize: 12,
                }}
              >
                <thead>
                  <tr>
                    {preview.headers.map(
                      (header) => (
                        <th
                          key={header}
                          style={{
                            padding:
                              "10px 16px",
                            textAlign:
                              "left",
                            fontSize: 12,
                            fontWeight: 700,
                            color:
                              "#475569",
                            background:
                              "#f8fafc",
                            borderBottom:
                              "1px solid #e2e8f0",
                            whiteSpace:
                              "nowrap",
                            position:
                              "sticky",
                            top: 0,
                            zIndex: 2,
                          }}
                        >
                          {header}
                        </th>
                      ),
                    )}
                  </tr>
                </thead>

                <tbody>
                  {preview.rows.map(
                    (row, rowIndex) => (
                      <tr
                        key={rowIndex}
                        style={{
                          background:
                            rowIndex % 2 === 0
                              ? "#ffffff"
                              : "#f8fafc",
                        }}
                      >
                        {preview.headers.map(
                          (header) => {
                            const value =
                              row[header];

                            const isNull =
                              value === null ||
                              value === undefined ||
                              value === "";

                            return (
                              <td
                                key={header}
                                style={{
                                  padding:
                                    "9px 16px",
                                  fontSize: 12,
                                  color:
                                    "#475569",
                                  borderBottom:
                                    "1px solid #eef2f7",
                                  whiteSpace:
                                    "nowrap",
                                  verticalAlign:
                                    "middle",
                                }}
                              >
                                {isNull ? (
                                  <span
                                    style={{
                                      display:
                                        "inline-block",
                                      padding:
                                        "2px 7px",
                                      borderRadius: 6,
                                      background:
                                        "#f1f5f9",
                                      color:
                                        "#94a3b8",
                                      fontSize: 11,
                                      fontWeight: 700,
                                      letterSpacing:
                                        0.2,
                                    }}
                                  >
                                    NULL
                                  </span>
                                ) : (
                                  String(value)
                                )}
                              </td>
                            );
                          },
                        )}
                      </tr>
                    ),
                  )}
                </tbody>
              </table>
            </div>

            <div
              style={{
                marginTop: 18,
                display: "flex",
                justifyContent:
                  "space-between",
                alignItems: "center",
                gap: 12,
                flexWrap: "wrap",
              }}
            >
              <div
                style={{
                  fontSize: 13,
                  color: "#667085",
                }}
              >
                Required mappings:{" "}
                <strong>
                  {requiredMappingLabels.join(
                    ", ",
                  )}
                </strong>

                {missingRequiredFields.length > 0 && (
                  <span
                    style={{
                      marginLeft: 8,
                      color: "#b42318",
                      fontWeight: 700,
                    }}
                  >
                    ({missingRequiredFields.length}{" "}
                    missing)
                  </span>
                )}
              </div>

              <button
                type="button"
                onClick={() => {
                  void handleRunProfile();
                }}
                disabled={
                  profiling ||
                  !mappingsComplete
                }
                style={{
                  ...primaryButtonStyle,
                  opacity:
                    profiling ||
                    !mappingsComplete
                      ? 0.55
                      : 1,
                  cursor:
                    profiling ||
                    !mappingsComplete
                      ? "not-allowed"
                      : "pointer",
                }}
              >
                {profiling
                  ? "Running Profile..."
                  : `Run ${domain} Data Quality Profile`}
              </button>
            </div>
          </div>
        </>
      )}

      {profileResult && (
        <div style={cardStyle}>
          <SectionTitle
            title="Data Quality Profile Results"
            description={`Profile Run: ${profileResult.profile_run_id}`}
          />

          <div
            style={{
              display: "grid",
              gridTemplateColumns:
                "repeat(6, minmax(150px, 1fr))",
              gap: 12,
            }}
          >
            {[
              {
                label: "Records",
                value:
                  profileResult.total_records,
                valueColor:
                  "#0f172a",
              },
              {
                label: "Average Score",
                value:
                  (profileResult.avg_record_score ?? 0).toFixed(2),
                valueColor:
                  "#0f172a",
              },
              {
                label:
                  "Records With Findings",
                value:
                  profileResult.records_with_findings,
                valueColor:
                  "#0f172a",
              },
              {
                label: "Total Findings",
                value:
                  profileResult.total_findings,
                valueColor:
                  "#0f172a",
              },
              {
                label:
                  "Duplicate Records",
                value:
                  profileResult.duplicate_record_count,
                valueColor:
                  profileResult
                    .duplicate_record_count > 0
                    ? "#b45309"
                    : "#0f172a",
              },
              {
                label:
                  "Below Threshold",
                value:
                  profileResult.records_below_threshold,
                valueColor:
                  profileResult
                    .records_below_threshold > 0
                    ? "#b45309"
                    : "#0f172a",
              },
            ].map((metric) => (
              <div
                key={metric.label}
                style={{
                  border:
                    "1px solid #e2e8f0",
                  borderRadius: 14,
                  padding: 14,
                  background:
                    "linear-gradient(180deg, #ffffff 0%, #f8fafc 100%)",
                }}
              >
                <div
                  style={{
                    fontSize: 11,
                    fontWeight: 800,
                    letterSpacing: 0.5,
                    textTransform:
                      "uppercase",
                    color: "#64748b",
                  }}
                >
                  {metric.label}
                </div>

                <div
                  style={{
                    marginTop: 6,
                    fontSize: 22,
                    fontWeight: 850,
                    color:
                      metric.valueColor,
                  }}
                >
                  {metric.value}
                </div>
              </div>
            ))}
          </div>

          <div
            style={{
              marginTop: 16,
              padding: 12,
              borderRadius: 12,
              border:
                "1px solid #e2e8f0",
              background: "#f8fafc",
              fontSize: 12,
              color: "#475569",
            }}
          >
            <b>Domain:</b>{" "}
            {domain}
            {" • "}
            <b>Source:</b>{" "}
            Google Sheets
            {" • "}
            <b>Worksheet:</b>{" "}
            {selectedSheet}
          </div>

        </div>
      )}

      {profileResult && (
        <UniversalProfileIntelligence
          enabled={profileResult.universal_rules_shadow_enabled}
          intelligence={profileResult.universal_rules_shadow}
        />
      )}

      {profileResult && (
        <div
          style={{
            marginTop: 16,
          }}
        >
          <button
            type="button"
            onClick={() => {
              void handleAnalyzeWithAi();
            }}
            disabled={
              aiAnalyzing ||
              profileResult.total_findings === 0
            }
            style={{
              ...primaryButtonStyle,
              opacity:
                aiAnalyzing ||
                profileResult.total_findings === 0
                  ? 0.6
                  : 1,
              cursor:
                aiAnalyzing ||
                profileResult.total_findings === 0
                  ? "not-allowed"
                  : "pointer",
            }}
          >
            {aiAnalyzing
              ? "Analyzing with AI..."
              : "Analyze with AI"}
          </button>
        </div>
      )}

      {aiAnalysis && (
        <div style={cardStyle}>
          <div
            style={{
              display: "flex",
              justifyContent:
                "space-between",
              alignItems:
                "flex-start",
              gap: 20,
              marginBottom: 18,
              maxWidth: 1050,
            }}
          >
            <SectionTitle
              title="AI Data Quality Analysis"
              description="AI recommendations generated from the persisted Google Sheets profile."
            />

            <button
              type="button"
              onClick={clearAiAnalysis}
              style={{
                ...secondaryButtonStyle,
                flexShrink: 0,
                whiteSpace: "nowrap",
              }}
            >
              Clear AI Analysis
            </button>
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns:
                "220px minmax(360px, 520px)",
              gap: 12,
              width: "fit-content",
              maxWidth: "100%",
            }}
          >
            <div
              style={{
                border:
                  "1px solid #e2e8f0",
                borderRadius: 14,
                padding: 14,
                background:
                  "linear-gradient(180deg, #ffffff 0%, #f8fafc 100%)",
              }}
            >
              <div
                style={{
                  fontSize: 11,
                  fontWeight: 800,
                  letterSpacing: 0.5,
                  textTransform:
                    "uppercase",
                  color: "#64748b",
                }}
              >
                Recommendations
              </div>

              <div
                style={{
                  marginTop: 6,
                  fontSize: 22,
                  fontWeight: 850,
                  color: "#0f172a",
                }}
              >
                {
                  aiAnalysis.recommendation_count
                }
              </div>
            </div>

            <div
              style={{
                border:
                  "1px solid #e2e8f0",
                borderRadius: 14,
                padding: 14,
                background:
                  "linear-gradient(180deg, #ffffff 0%, #f8fafc 100%)",
              }}
            >
              <div
                style={{
                  fontSize: 11,
                  fontWeight: 800,
                  letterSpacing: 0.5,
                  textTransform:
                    "uppercase",
                  color: "#64748b",
                }}
              >
                Profile Run
              </div>

              <div
                style={{
                  marginTop: 6,
                  fontSize: 22,
                  fontWeight: 850,
                  color: "#0f172a",
                  overflowWrap:
                    "anywhere",
                }}
              >
                {
                  profileResult
                    ?.profile_run_id
                  ?? "—"
                }
              </div>
            </div>
          </div>

          {aiAnalysis.overall_analysis && (
            <div
              style={{
                marginTop: 18,
                padding: 16,
                borderRadius: 12,
                border:
                  "1px solid #e2e8f0",
                background: "#f8fafc",
                maxWidth: 1050,
                boxSizing:
                  "border-box",
              }}
            >
              <div
                style={{
                  fontSize: 14,
                  fontWeight: 700,
                  color: "#172033",
                  marginBottom: 8,
                }}
              >
                Overall AI Assessment
              </div>

              <div
                style={{
                  fontSize: 13,
                  color: "#475569",
                  lineHeight: 1.6,
                }}
              >
                {
                  aiAnalysis
                    .overall_analysis
                    .dq_health_summary
                }
              </div>

              <div
                style={{
                  marginTop: 10,
                  fontSize: 13,
                  color: "#475569",
                }}
              >
                <b>Highest Priority:</b>{" "}
                {
                  aiAnalysis
                    .overall_analysis
                    .highest_priority_issue
                }
              </div>

              <div
                style={{
                  marginTop: 6,
                  fontSize: 13,
                  color: "#475569",
                }}
              >
                <b>Next Action:</b>{" "}
                {
                  aiAnalysis
                    .overall_analysis
                    .recommended_next_action
                }
              </div>
            </div>
          )}

          {aiAnalysis.recommendations
            ?.length > 0 && (
            <div
              style={{
                marginTop: 20,
                display: "grid",
                gap: 14,
              }}
            >
              {aiAnalysis.recommendations.map(
                (
                  recommendation,
                  index,
                ) => {
                  const recommendationId =
                    recommendation
                      .recommendation_id ??
                    String(index);

                  const isExpanded =
                    expandedRecommendationIds.has(
                      recommendationId,
                    );

                  const remediation =
                    remediationByRecommendationId[
                      recommendationId
                    ];

                  const remediationLoading =
                    remediationLoadingIds.has(
                      recommendationId,
                    );

                  const remediationFeedback =
                    remediationFeedbackByRecommendationId[
                      recommendationId
                    ];

                  const approvalStatus =
                    remediationFeedback?.approval_status
                      ?.trim()
                      .toUpperCase()
                    ?? "";

                  const remediationVersions =
                    remediationVersionsByRecommendationId[
                      recommendationId
                    ] ?? [];

                  const remediationVersionsLoading =
                    remediationVersionsLoadingIds.has(
                      recommendationId,
                    );

                  const versionHistoryExpanded =
                    expandedVersionHistoryIds.has(
                      recommendationId,
                    );

                  const changesRequested =
                    approvalStatus === "CHANGES_REQUESTED";

                  const remediationApproved =
                    approvalStatus === "APPROVED";

                  const remediationRejected =
                    approvalStatus === "REJECTED";

                  const normalizedRuleId = String(
                    recommendation.rule_id ?? "",
                  )
                    .trim()
                    .toUpperCase();

                  const remediationArtifactType = String(
                    remediation?.artifact_type ?? "",
                  )
                    .trim()
                    .toUpperCase();

                  const remediationSafetyStatus = String(
                    remediation?.safety_status ?? "",
                  )
                    .trim()
                    .toUpperCase();

                  const hasExecutableRegexPayload =
                    Boolean(
                      remediation?.remediation_regex?.trim(),
                    );

                  const hasSqlPayload =
                    Boolean(
                      remediation?.remediation_sql?.trim(),
                    );

                  const isGoogleSheetsExecutableRegexRule =
                    GOOGLE_SHEETS_EXECUTABLE_REGEX_RULE_IDS.has(
                      normalizedRuleId,
                    );

                  const readyForExecution =
                    remediationApproved &&
                    remediationArtifactType === "REGEX" &&
                    hasExecutableRegexPayload &&
                    isGoogleSheetsExecutableRegexRule &&
                    remediationSafetyStatus !== "BLOCKED";

                  const isApprovedNonExecutableRegex =
                    remediationApproved &&
                    remediationArtifactType === "REGEX" &&
                    !readyForExecution;

                  const feedbackSubmitted =
                    Boolean(remediationFeedback);

                  const feedbackLoading =
                  remediationFeedbackLoadingIds.has(
                    recommendationId,
                  );

                  return (
                    <div
                      key={recommendationId}
                      style={{
                        border:
                          "1px solid #e2e8f0",
                        borderRadius: 14,
                        padding: 16,
                        background:
                          "#ffffff",
                        width: "100%",
                        maxWidth:
                          isExpanded
                            ? 1050
                            : 760,
                        boxSizing:
                          "border-box",
                        transition:
                          "max-width 0.2s ease",
                      }}
                    >
                      <div
                        style={{
                          display: "flex",
                          justifyContent:
                            "space-between",
                          gap: 12,
                          alignItems:
                            "flex-start",
                          flexWrap: "wrap",
                        }}
                      >
                        <div>
                          <div
                            style={{
                              fontSize: 15,
                              fontWeight: 700,
                              color:
                                "#172033",
                            }}
                          >
                            {
                              recommendation
                                .recommendation_title
                            }
                          </div>

                          <div
                            style={{
                              marginTop: 4,
                              fontSize: 12,
                              color:
                                "#667085",
                            }}
                          >
                            Rule:{" "}
                            {
                              recommendation
                                .rule_id
                            }
                            {" • "}
                            Field:{" "}
                            {
                              recommendation
                                .field_name
                              ?? "N/A"
                            }
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
                            style={{
                              padding:
                                "4px 8px",
                              borderRadius:
                                999,
                              fontSize: 11,
                              fontWeight: 700,
                              background:
                                "#f1f5f9",
                              color:
                                "#334155",
                            }}
                          >
                            {
                              recommendation
                                .dimension
                            }
                          </span>

                          <span
                            style={{
                              padding:
                                "4px 8px",
                              borderRadius:
                                999,
                              fontSize: 11,
                              fontWeight: 700,
                              background:
                                "#f8fafc",
                              color:
                                "#475569",
                              border:
                                "1px solid #e2e8f0",
                            }}
                          >
                            {
                              recommendation
                                .severity
                            }
                          </span>
                        </div>
                      </div>

                      {isExpanded && (
                        <div
                          style={{
                            marginTop: 14,
                            display: "grid",
                            gap: 10,
                          }}
                        >
                          {recommendation.business_impact && (
                            <div>
                              <b>
                                Business Impact
                              </b>
                              <div
                                style={{
                                  marginTop: 3,
                                  color:
                                    "#475569",
                                  fontSize: 13,
                                  lineHeight: 1.5,
                                }}
                              >
                                {
                                  recommendation
                                    .business_impact
                                }
                              </div>
                            </div>
                          )}

                          {recommendation.recommended_remediation && (
                            <div>
                              <b>
                                Recommended Remediation
                              </b>
                              <div
                                style={{
                                  marginTop: 3,
                                  color:
                                    "#475569",
                                  fontSize: 13,
                                  lineHeight: 1.5,
                                }}
                              >
                                {
                                  recommendation
                                    .recommended_remediation
                                }
                              </div>
                            </div>
                          )}

                          {recommendation.suggested_sql && (
                            <div>
                              <b>
                                {recommendation.suggested_sql
                                  .trim()
                                  .toUpperCase()
                                  .startsWith("SELECT")
                                  ? "Diagnostic / Validation SQL"
                                  : "Suggested SQL"}
                              </b>
                              <pre
                                style={{
                                  marginTop: 6,
                                  marginBottom: 0,
                                  padding: 12,
                                  borderRadius: 10,
                                  background:
                                    "#0f172a",
                                  color:
                                    "#e2e8f0",
                                  overflowX:
                                    "auto",
                                  fontSize: 12,
                                  lineHeight: 1.6,
                                  whiteSpace:
                                    "pre-wrap",
                                  wordBreak:
                                    "break-word",
                                }}
                              >
                                {
                                  recommendation
                                    .suggested_sql
                                }
                              </pre>
                            </div>
                          )}

                          {recommendation.suggested_regex && (
                            <div>
                              <b>
                                Suggested Regex
                              </b>
                              <code
                                style={{
                                  display: "block",
                                  marginTop: 6,
                                  padding: 10,
                                  borderRadius: 8,
                                  background:
                                    "#f8fafc",
                                  border:
                                    "1px solid #e5e7eb",
                                  overflowX:
                                    "auto",
                                }}
                              >
                                {
                                  recommendation
                                    .suggested_regex
                                }
                              </code>
                            </div>
                          )}

                          {recommendation.reasoning_summary && (
                            <div>
                              <b>
                                Reasoning
                              </b>
                              <div
                                style={{
                                  marginTop: 3,
                                  color:
                                    "#475569",
                                  fontSize: 13,
                                  lineHeight: 1.5,
                                }}
                              >
                                {
                                  recommendation
                                    .reasoning_summary
                                }
                              </div>
                            </div>
                          )}
                        </div>
                      )}

                      <div
                        style={{
                          marginTop: 14,
                          paddingTop: 12,
                          borderTop:
                            "1px solid #eef2f7",
                          display: "flex",
                          gap: 18,
                          flexWrap: "wrap",
                          fontSize: 12,
                          color: "#475569",
                        }}
                      >
                        <span>
                          <b>
                            Automation:
                          </b>{" "}
                          {
                            recommendation
                              .automation_recommendation
                          }
                        </span>

                        <span>
                          <b>
                            Confidence:
                          </b>{" "}
                          {Math.round(
                            (
                              recommendation
                                .automation_confidence
                              ?? 0
                            ) * 100,
                          )}
                          %
                        </span>

                        <span>
                          <b>
                            Steward Approval:
                          </b>{" "}
                          {
                            recommendation
                              .steward_approval_required
                              ? "Required"
                              : "Not Required"
                          }
                        </span>
                      </div>

                      <div
                        style={{
                          marginTop: 14,
                          display: "flex",
                          gap: 10,
                          flexWrap: "wrap",
                        }}
                      >
                        <button
                          type="button"
                          onClick={() =>
                            toggleRecommendation(
                              recommendationId,
                            )
                          }
                          style={
                            secondaryButtonStyle
                          }
                        >
                          {isExpanded
                            ? "Hide Analysis"
                            : "View Analysis"}
                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            void handleGenerateRemediation(
                              recommendationId,
                              "REGEX",
                            );
                          }}
                          disabled={remediationLoading}
                          style={{
                            ...primaryButtonStyle,
                            opacity:
                              remediationLoading
                                ? 0.6
                                : 1,
                            cursor:
                              remediationLoading
                                ? "not-allowed"
                                : "pointer",
                          }}
                        >
                          {remediationLoading
                            ? changesRequested
                              ? "Regenerating with Steward Feedback..."
                              : "Generating Fix..."
                            : changesRequested
                              ? "Regenerate with Steward Feedback"
                              : remediation
                                ? "Regenerate Fix"
                                : "Generate Fix"}
                        </button>

                        
                      </div>

                      {remediation && (
                        <div
                          style={{
                            marginTop: 16,
                            padding: 16,
                            border:
                              "1px solid #dbe4ee",
                            borderRadius: 12,
                            background: "#f8fafc",
                            display: "grid",
                            gap: 12,
                          }}
                        >
                          {remediationApproved ? (
                            <div
                              style={{
                                padding: 14,
                                borderRadius: 12,
                                border:
                                  "1px solid #bbf7d0",
                                background: "#f0fdf4",
                                display: "grid",
                                gap: 8,
                              }}
                            >
                              <div
                                style={{
                                  display: "flex",
                                  justifyContent:
                                    "space-between",
                                  gap: 10,
                                  flexWrap: "wrap",
                                }}
                              >
                                <div
                                  style={{
                                    fontSize: 15,
                                    fontWeight: 800,
                                    color: "#166534",
                                  }}
                                >
                                  Remediation Approved ✓
                                </div>

                                <div
                                  style={{
                                    fontSize: 12,
                                    fontWeight: 800,
                                    color: "#166534",
                                  }}
                                >
                                  {remediation.version_number
                                    ? `Version ${remediation.version_number}`
                                    : "Approved Version"}
                                </div>
                              </div>

                              <div
                                style={{
                                  fontSize: 12,
                                  color: "#334155",
                                }}
                              >
                                <b>Final Decision:</b>{" "}
                                APPROVED
                              </div>

                              {isApprovedNonExecutableRegex && (
                                <div
                                  style={{
                                    marginTop: 6,
                                    padding: 12,
                                    borderRadius: 10,
                                    border: "1px solid #fde68a",
                                    background: "#fffbeb",
                                    color: "#92400e",
                                    fontSize: 12,
                                    lineHeight: 1.5,
                                  }}
                                >
                                  <b>Approved for Steward Governance - Manual Remediation Required</b>{" "}
                                  {isGoogleSheetsExecutableRegexRule
                                    ? "The generated artifact is missing the executable governed REGEX payload or is blocked by safety policy."
                                    : `Rule ${normalizedRuleId || "UNKNOWN"} does not have a deterministic Google Sheets execution contract. 
                                        No source data will be changed automatically. Review the affected values and provide an authoritative correction or mapping before governed execution.`}
                                </div>
                              )}

                              {readyForExecution && (
                                <div
                                  style={{
                                    marginTop: 6,
                                    padding: "12px 14px",
                                    borderRadius: 10,
                                    border: "1px solid #86efac",
                                    background: "#f0fdf4",
                                    color: "#166534",
                                    fontSize: 12,
                                    lineHeight: 1.55,
                                  }}
                                >
                                  <b>READY FOR EXECUTION ✓</b>

                                  <div style={{ marginTop: 6 }}>
                                    Steward approval is complete. This exact approved
                                    remediation version is available for governed execution
                                    in DQ Intelligence.
                                  </div>

                                  <div style={{ marginTop: 6 }}>
                                    DQ Intelligence will revalidate the approved artifact,
                                    Google connection, source worksheet, permissions,
                                    execution eligibility, and target-cell write safety
                                    before changing source data.
                                  </div>

                                  <div style={{ marginTop: 6 }}>
                                    The execution target must be a values-only physical
                                    worksheet, not Connected Sheets, a BigQuery extract, or
                                    a formula-generated range.
                                  </div>
                                </div>
                              )}

                            </div>
                          ) : (
                            <>
                              <div
                                style={{
                                  display: "flex",
                                  gap: 8,
                                  flexWrap: "wrap",
                                  alignItems: "center",
                                }}
                              >
                                <strong>
                                  Generated Remediation
                                  {remediation.version_number
                                    ? ` — Version ${remediation.version_number}`
                                    : ""}
                                </strong>

                                <span>
                                  {remediation.artifact_type}
                                </span>

                                <span>
                                  {remediation.safety_status}
                                </span>
                              </div>

                              {remediation.reasoning_summary && (
                                <div
                                  style={{
                                    fontSize: 13,
                                    color: "#475569",
                                    lineHeight: 1.55,
                                  }}
                                >
                                  <b>
                                    Why this remediation:
                                  </b>{" "}
                                  {
                                    remediation
                                      .reasoning_summary
                                  }
                                </div>
                              )}

                              {remediationArtifactType === "SQL" &&
                              hasSqlPayload && (
                                <div>
                                  <div
                                    style={{
                                      marginBottom: 6,
                                      fontSize: 12,
                                      fontWeight: 800,
                                    }}
                                  >
                                    Proposed SQL
                                  </div>

                                  <pre
                                    style={{
                                      margin: 0,
                                      padding: 12,
                                      borderRadius: 10,
                                      overflowX: "auto",
                                      background: "#111827",
                                      color: "#f8fafc",
                                      fontSize: 12,
                                      whiteSpace: "pre-wrap",
                                      wordBreak: "break-word",
                                    }}
                                  >
                                    {
                                      remediation
                                        .remediation_sql
                                    }
                                  </pre>
                                </div>
                              )}

                              {remediationArtifactType === "REGEX" &&
                              hasExecutableRegexPayload && (
                                <div>
                                  <div
                                    style={{
                                      marginBottom: 6,
                                      fontSize: 12,
                                      fontWeight: 800,
                                    }}
                                  >
                                    Proposed Regex
                                  </div>

                                  <code
                                    style={{
                                      display: "block",
                                      padding: 12,
                                      borderRadius: 10,
                                      background: "#ffffff",
                                      border:
                                        "1px solid #e2e8f0",
                                      fontSize: 12,
                                      overflowX: "auto",
                                    }}
                                  >
                                    {
                                      remediation
                                        .remediation_regex
                                    }
                                  </code>
                                </div>
                              )}

                              {remediationArtifactType
                                === "MANUAL_REVIEW" && (
                                <div
                                  style={{
                                    padding: 12,
                                    borderRadius: 10,
                                    background: "#fff7ed",
                                    border:
                                      "1px solid #fed7aa",
                                    color: "#9a3412",
                                    fontSize: 12,
                                  }}
                                >
                                  Steward review is required
                                  before a correction can be
                                  safely determined.
                                </div>
                              )}
                            </>
                          )}

                          <div
                            style={{
                              padding: 14,
                              border:
                                "1px solid #e2e8f0",
                              borderRadius: 12,
                              background: "#ffffff",
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
                                    fontSize: 13,
                                  }}
                                >
                                  Remediation Workflow
                                </div>

                                <div
                                  style={{
                                    marginTop: 6,
                                    display: "flex",
                                    gap: 8,
                                    flexWrap: "wrap",
                                    fontSize: 12,
                                    color: "#475569",
                                  }}
                                >
                                  <span
                                    style={{
                                      fontWeight: 700,
                                    }}
                                  >
                                    ✓ Generated
                                  </span>
                                  <span>→</span>

                                  <span
                                    style={{
                                      fontWeight:
                                        !remediationApproved
                                        && !remediationRejected
                                        && !changesRequested
                                          ? 800
                                          : 700,
                                    }}
                                  >
                                    {remediationApproved
                                    || remediationRejected
                                    || changesRequested
                                      ? "✓ Steward Review"
                                      : "Steward Review — Current"}
                                  </span>

                                  <span>→</span>

                                  <span
                                    style={{
                                      fontWeight:
                                        changesRequested
                                          ? 800
                                          : 600,
                                      color:
                                        changesRequested
                                          ? "#92400e"
                                          : "#64748b",
                                    }}
                                  >
                                    {changesRequested
                                      ? "Revise with Feedback — Current"
                                      : "Revise if Needed"}
                                  </span>

                                  <span>→</span>

                                  <span
                                    style={{
                                      fontWeight:
                                        remediationApproved
                                        || remediationRejected
                                          ? 800
                                          : 600,
                                      color:
                                        remediationApproved
                                          ? "#166534"
                                          : remediationRejected
                                            ? "#b91c1c"
                                            : "#64748b",
                                    }}
                                  >
                                    {remediationApproved
                                      ? "✓ Final Approval"
                                      : remediationRejected
                                        ? "Final Decision — Rejected"
                                        : "Final Decision"}
                                  </span>
                                </div>
                              </div>

                              <div
                                style={{
                                  fontSize: 11,
                                  fontWeight: 800,
                                  color:
                                    remediationApproved
                                      ? "#166534"
                                      : remediationRejected
                                        ? "#b91c1c"
                                        : changesRequested
                                          ? "#92400e"
                                          : "#475569",
                                }}
                              >
                                {remediationApproved
                                  ? "APPROVED"
                                  : remediationRejected
                                    ? "REJECTED"
                                    : changesRequested
                                      ? "CHANGES REQUESTED"
                                      : "PENDING REVIEW"}
                              </div>
                            </div>
                          </div>

                          <div>
                            <button
                              type="button"
                              onClick={() => {
                                void handleLoadRemediationVersions(
                                  recommendationId,
                                );
                              }}
                              disabled={
                                remediationVersionsLoading
                              }
                              style={
                                secondaryButtonStyle
                              }
                            >
                              {remediationVersionsLoading
                                ? "Loading History..."
                                : versionHistoryExpanded
                                  ? "Hide Version History"
                                  : "View Version History"}
                            </button>

                            {versionHistoryExpanded && (
                              <div
                                style={{
                                  marginTop: 12,
                                  display: "grid",
                                  gap: 10,
                                }}
                              >
                                {remediationVersions.length
                                  === 0 ? (
                                  <div
                                    style={{
                                      padding: 12,
                                      border:
                                        "1px solid #e2e8f0",
                                      borderRadius: 10,
                                      background: "#ffffff",
                                      fontSize: 12,
                                      color: "#64748b",
                                    }}
                                  >
                                    No remediation versions
                                    found.
                                  </div>
                                ) : (
                                  remediationVersions.map(
                                    (version, index) => (
                                      <div
                                        key={
                                          version
                                            .remediation_version_id
                                        }
                                        style={{
                                          padding: 12,
                                          border:
                                            "1px solid #e2e8f0",
                                          borderRadius: 10,
                                          background: "#ffffff",
                                        }}
                                      >
                                        <div
                                          style={{
                                            display: "flex",
                                            justifyContent:
                                              "space-between",
                                            gap: 10,
                                            flexWrap: "wrap",
                                          }}
                                        >
                                          <div
                                            style={{
                                              fontSize: 13,
                                              fontWeight: 800,
                                            }}
                                          >
                                            Version{" "}
                                            {
                                              version
                                                .version_number
                                            }

                                            {index === 0 && (
                                              <span
                                                style={{
                                                  marginLeft: 8,
                                                  padding:
                                                    "2px 7px",
                                                  borderRadius:
                                                    999,
                                                  border:
                                                    "1px solid #cbd5e1",
                                                  background:
                                                    "#f8fafc",
                                                  fontSize: 10,
                                                  fontWeight: 800,
                                                }}
                                              >
                                                CURRENT
                                              </span>
                                            )}
                                          </div>

                                          <div
                                            style={{
                                              fontSize: 11,
                                              color: "#64748b",
                                            }}
                                          >
                                            {new Date(
                                              version.generated_at,
                                            ).toLocaleString()}
                                          </div>
                                        </div>

                                        <div
                                          style={{
                                            marginTop: 8,
                                            fontSize: 12,
                                            color: "#475569",
                                            lineHeight: 1.5,
                                          }}
                                        >
                                          <div>
                                            <b>Artifact:</b>{" "}
                                            {
                                              version.artifact_type
                                              ?? "—"
                                            }
                                          </div>
                                          <div>
                                            <b>Safety:</b>{" "}
                                            {
                                              version.safety_status
                                              ?? "—"
                                            }
                                          </div>
                                          <div>
                                            <b>
                                              Generation Reason:
                                            </b>{" "}
                                            {version.generation_reason
                                              ? version.generation_reason
                                                  .replaceAll(
                                                    "_",
                                                    " ",
                                                  )
                                              : "—"}
                                          </div>
                                        </div>

                                        {version.remediation_sql && (
                                          <pre
                                            style={{
                                              marginTop: 10,
                                              marginBottom: 0,
                                              padding: 10,
                                              borderRadius: 8,
                                              background: "#111827",
                                              color: "#f8fafc",
                                              fontSize: 11,
                                              whiteSpace: "pre-wrap",
                                              overflowX: "auto",
                                            }}
                                          >
                                            {
                                              version
                                                .remediation_sql
                                            }
                                          </pre>
                                        )}

                                        {version.remediation_regex && (
                                          <code
                                            style={{
                                              display: "block",
                                              marginTop: 10,
                                              padding: 10,
                                              borderRadius: 8,
                                              background: "#f8fafc",
                                              border:
                                                "1px solid #e2e8f0",
                                              fontSize: 11,
                                              overflowX: "auto",
                                            }}
                                          >
                                            {
                                              version
                                                .remediation_regex
                                            }
                                          </code>
                                        )}

                                        {version.reasoning_summary && (
                                          <div
                                            style={{
                                              marginTop: 10,
                                              fontSize: 11,
                                              color: "#64748b",
                                              lineHeight: 1.5,
                                            }}
                                          >
                                            {
                                              version
                                                .reasoning_summary
                                            }
                                          </div>
                                        )}
                                      </div>
                                    ),
                                  )
                                )}
                              </div>
                            )}
                          </div>

                          {changesRequested && (
                            <div
                              style={{
                                padding: 12,
                                borderRadius: 10,
                                border:
                                  "1px solid #fbbf24",
                                background: "#fffbeb",
                                color: "#92400e",
                                fontSize: 13,
                                lineHeight: 1.5,
                              }}
                            >
                              <b>Changes Requested</b>
                              <div
                                style={{
                                  marginTop: 4,
                                }}
                              >
                                Your feedback has been saved.
                                Regenerate the remediation to
                                apply your steward instructions.
                              </div>
                            </div>
                          )}

                          {remediationFeedback
                          && !remediationApproved && (
                            <div
                              style={{
                                padding: 12,
                                borderRadius: 10,
                                border:
                                  "1px solid #dbe4ee",
                                background: "#ffffff",
                                fontSize: 12,
                                color: "#334155",
                                lineHeight: 1.5,
                              }}
                            >
                              <b>Steward Decision:</b>{" "}
                              {
                                remediationFeedback
                                  .approval_status
                              }
                              {" • "}
                              <b>By:</b>{" "}
                              {
                                remediationFeedback
                                  .steward_user
                              }
                              {remediationFeedback.note && (
                                <>
                                  {" • "}
                                  <b>Note:</b>{" "}
                                  {
                                    remediationFeedback
                                      .note
                                  }
                                </>
                              )}
                            </div>
                          )}

                          {!remediationApproved
                          && !remediationRejected && (
                            <div
                              style={{
                                display: "flex",
                                gap: 10,
                                flexWrap: "wrap",
                              }}
                            >
                              <button
                      type="button"
                      onClick={() => {
                        void handleRemediationFeedback(
                          recommendationId,
                          "APPROVE",
                        );
                      }}
                      disabled={
                        feedbackLoading ||
                        feedbackSubmitted ||
                        remediationSafetyStatus === "BLOCKED"
                      }
                      style={{
                        ...primaryButtonStyle,
                        background: feedbackLoading
                          ? "#9ca3af"
                          : "#111827",
                        opacity:
                          feedbackLoading
                            ? 0.75
                            : feedbackSubmitted ||
                                remediationSafetyStatus === "BLOCKED"
                              ? 0.5
                              : 1,
                        cursor:
                          feedbackLoading ||
                          feedbackSubmitted ||
                          remediationSafetyStatus === "BLOCKED"
                            ? "not-allowed"
                            : "pointer",
                      }}
                    >
                      {feedbackLoading
                        ? "Approving..."
                        : "Approve Remediation"}
                    </button>

                              <button
                                type="button"
                                onClick={() => {
                                  void handleRemediationFeedback(
                                    recommendationId,
                                    "REQUEST_CHANGES",
                                  );
                                }}
                                disabled={feedbackSubmitted}
                                style={{
                                  ...secondaryButtonStyle,
                                  opacity:
                                    feedbackSubmitted
                                      ? 0.5
                                      : 1,
                                  cursor:
                                    feedbackSubmitted
                                      ? "not-allowed"
                                      : "pointer",
                                }}
                              >
                                Request Changes
                              </button>

                              <button
                                type="button"
                                onClick={() => {
                                  void handleRemediationFeedback(
                                    recommendationId,
                                    "REJECT",
                                  );
                                }}
                                disabled={feedbackSubmitted}
                                style={{
                                  ...secondaryButtonStyle,
                                  opacity:
                                    feedbackSubmitted
                                      ? 0.5
                                      : 1,
                                  cursor:
                                    feedbackSubmitted
                                      ? "not-allowed"
                                      : "pointer",
                                }}
                              >
                                Reject
                              </button>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                },
              )}
            </div>
          )}
        </div>
      )}
    </div>
    )
  }
