import React, {
  useEffect,
  useMemo,
  useState,
} from "react";

import type {
  DatabricksPreviewResponse,
  DatabricksProfileResult,
  DqAiAnalysisResponse,
  DqRemediationFeedbackResponse,
  DqRemediationGenerateResponse,
  EnterpriseConnection,
} from "../api/types";

import {
  generateDqRemediation,
  getEnterpriseConnections,
  submitDqRemediationFeedback,
  previewDatabricks,
  runDatabricksProfile,
  runDqAiAnalysis,
} from "../api/client";

import {
  DQ_DOMAIN_CONFIG,
  type DqDomain,
} from "../config/dqDomainConfig";

import UniversalProfileIntelligence
  from "../components/UniversalProfileIntelligence";

type MappingState = Record<string, string>;

const DOMAIN_OPTIONS = Object.keys(DQ_DOMAIN_CONFIG) as DqDomain[];

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

const secondaryButtonStyle: React.CSSProperties = {
  padding: "10px 14px",
  borderRadius: 10,
  border: "1px solid #cbd5e1",
  background: "#ffffff",
  color: "#334155",
  cursor: "pointer",
  fontWeight: 700,
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

function normalizeColumnName(
  value: string,
): string {
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

    if (
      candidateNames.includes(
        normalizedSource,
      )
    ) {
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

export default function DatabricksProfilePanel() {
  const [connections, setConnections] =
    useState<EnterpriseConnection[]>([]);

  const [
    selectedConnectionId,
    setSelectedConnectionId,
  ] = useState("");

  const [connectionsLoading, setConnectionsLoading] =
    useState(true);

  const [previewLoading, setPreviewLoading] =
    useState(false);

  const [profiling, setProfiling] =
    useState(false);

  const [domain, setDomain] =
    useState<DqDomain>("PRODUCT");

  const [preview, setPreview] =
    useState<DatabricksPreviewResponse | null>(
      null,
    );

  const [mapping, setMapping] =
    useState<MappingState>({});

    const [profileResult, setProfileResult] =
  useState<DatabricksProfileResult | null>(null);

  const [aiAnalyzing, setAiAnalyzing] = useState(false);

  const [aiAnalysis, setAiAnalysis] =
    useState<DqAiAnalysisResponse | null>(null);

  const [
    remediationByRecommendationId,
    setRemediationByRecommendationId,
  ] = useState<Record<string, DqRemediationGenerateResponse>>({});

  const [
    remediationLoadingIds,
    setRemediationLoadingIds,
  ] = useState<Set<string>>(new Set());

  const [
    remediationFeedbackByRecommendationId,
    setRemediationFeedbackByRecommendationId,
  ] = useState<Record<string, DqRemediationFeedbackResponse>>({});

  const [
    remediationFeedbackLoadingIds,
    setRemediationFeedbackLoadingIds,
  ] = useState<Set<string>>(new Set());

  const [expandedRecommendationIds, setExpandedRecommendationIds] =
    useState<Set<string>>(new Set());

  const [error, setError] =
    useState<string | null>(null);

  const [successMessage, setSuccessMessage] =
    useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function loadConnections(): Promise<void> {
      setConnectionsLoading(true);

      try {
        const result =
          await getEnterpriseConnections(
            1,
            100,
          );

        if (cancelled) return;

        const databricksConnections =
          result.items
            .filter((item) => {
              const vendor = (
                item.vendor || ""
              )
                .trim()
                .toUpperCase();

              const environment = (
                item.environment || ""
              )
                .trim()
                .toUpperCase();

              return (
                item.is_active === true &&
                vendor === "DATABRICKS" &&
                (
                  environment === "DEV" ||
                  environment === "STG" ||
                  environment === "STAGING"
                )
              );
            })
            .sort(
              (left, right) =>
                new Date(
                  right.updated_at ||
                    right.created_at,
                ).getTime() -
                new Date(
                  left.updated_at ||
                    left.created_at,
                ).getTime(),
            );

        setConnections(
          databricksConnections,
        );

        if (
          databricksConnections.length > 0
        ) {
          setSelectedConnectionId(
            databricksConnections[0]
              .connection_id,
          );
        } else {
          setError(
            "No active DEV/STG Databricks Enterprise Connection was found.",
          );
        }
      } catch (err) {
        if (cancelled) return;

        setError(
          err instanceof Error
            ? err.message
            : "Unable to load Databricks Enterprise Connections.",
        );
      } finally {
        if (!cancelled) {
          setConnectionsLoading(false);
        }
      }
    }

    void loadConnections();

    return () => {
      cancelled = true;
    };
  }, []);

  const selectedConnection =
    useMemo(
      () =>
        connections.find(
          (connection) =>
            connection.connection_id ===
            selectedConnectionId,
        ) ?? null,
      [
        connections,
        selectedConnectionId,
      ],
    );

  const domainConfig =
    DQ_DOMAIN_CONFIG[domain];

  const mappedTargets =
    useMemo(
      () =>
        Object.values(mapping).filter(
          (value): value is string =>
            Boolean(value),
        ),
      [mapping],
    );

  const requiredTargetFields =
    useMemo(
      () =>
        domainConfig.fields
          .filter(
            (field) => field.required,
          )
          .map(
            (field) => field.field,
          ),
      [domainConfig],
    );

  const missingRequiredFields =
    useMemo(
      () =>
        requiredTargetFields.filter(
          (fieldName) =>
            !mappedTargets.includes(
              fieldName,
            ),
        ),
      [
        mappedTargets,
        requiredTargetFields,
      ],
    );

  const duplicateMappedTargets =
    useMemo(() => {
      const counts =
        new Map<string, number>();

      for (const target of mappedTargets) {
        counts.set(
          target,
          (counts.get(target) ?? 0) + 1,
        );
      }

      return Array.from(
        counts.entries(),
      )
        .filter(
          ([, count]) => count > 1,
        )
        .map(([target]) => target);
    }, [mappedTargets]);

  function resetProfileState(): void {
    setPreview(null);
    setMapping({});
    setProfileResult(null);
    setAiAnalysis(null);
    setExpandedRecommendationIds(new Set());
    setRemediationByRecommendationId({});
    setRemediationLoadingIds(new Set());
    setRemediationFeedbackByRecommendationId({});
    setRemediationFeedbackLoadingIds(new Set());
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
    setRemediationByRecommendationId({});
    setRemediationLoadingIds(new Set());
    setRemediationFeedbackByRecommendationId({});
    setRemediationFeedbackLoadingIds(new Set());
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

  async function handlePreview(): Promise<void> {
    if (!selectedConnectionId) {
      setError(
        "Select a Databricks Enterprise Connection.",
      );
      return;
    }

    setPreviewLoading(true);
    setError(null);
    setSuccessMessage(null);
    setProfileResult(null);
    setAiAnalysis(null);
    setExpandedRecommendationIds(new Set());

    console.log("[Databricks Preview] selected connection:", selectedConnection);
    console.log(
      "[Databricks Preview] connection_id:",
      selectedConnection?.connection_id
    );
    console.log(
      "[Databricks Preview] warehouse_id:",
      selectedConnection?.connection_details?.warehouse_id
    );

    try {
      const response =
        await previewDatabricks({
          connection_id:
            selectedConnectionId,
          preview_limit: 25,
        });

      setPreview(response);

      setMapping(
        buildSuggestedMapping(
          response.headers,
          domain,
        ),
      );

      setSuccessMessage(
        `Preview loaded from ${response.source_table}.`,
      );
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to preview the governed Databricks table.",
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
    setSuccessMessage(null);
    setError(null);
  }

  async function handleRunProfile(): Promise<void> {
    if (!preview) {
      setError(
        "Preview the Databricks table before running the data quality profile.",
      );
      return;
    }

    if (!selectedConnectionId) {
      setError(
        "Select a Databricks Enterprise Connection.",
      );
      return;
    }

    if (
      missingRequiredFields.length > 0
    ) {
      const labels =
        domainConfig.fields
          .filter((field) =>
            missingRequiredFields.includes(
              field.field,
            ),
          )
          .map((field) => field.label);

      setError(
        `Map the required ${domain} field${
          labels.length === 1 ? "" : "s"
        }: ${labels.join(", ")}.`,
      );

      return;
    }

    if (
      duplicateMappedTargets.length > 0
    ) {
      setError(
        `Each target field can only be mapped once. Duplicate mapping${
          duplicateMappedTargets.length === 1
            ? ""
            : "s"
        }: ${duplicateMappedTargets.join(
          ", ",
        )}.`,
      );

      return;
    }

    const mappings =
      Object.entries(mapping)
        .filter(
          ([, targetField]) =>
            Boolean(targetField),
        )
        .map(
          ([
            sourceColumn,
            targetField,
          ]) => ({
            source_column:
              sourceColumn,
            target_field:
              targetField,
          }),
        );

    setProfiling(true);
    setError(null);
    setSuccessMessage(null);
    setProfileResult(null);
    setAiAnalysis(null);
    setExpandedRecommendationIds(new Set());
    setRemediationByRecommendationId({});
    setRemediationLoadingIds(new Set());
    setRemediationFeedbackByRecommendationId({});
    setRemediationFeedbackLoadingIds(new Set());

    try {
      const response =
        await runDatabricksProfile({
          connection_id:
            selectedConnectionId,
          domain,
          business_key_field:
            domainConfig.businessKeyField,
          column_mappings: mappings,
          row_limit: 100_000,
        });

      setProfileResult(response.profile);

      setSuccessMessage(
        `${domain} Databricks data quality profile completed and persisted successfully.`,
      );

      console.log(
        "[DATABRICKS PROFILE RESPONSE]",
        response,
      );
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to run the Databricks data quality profile.",
      );
    } finally {
      setProfiling(false);
    }
  }

  async function handleAnalyzeWithAi(): Promise<void> {
    if (!profileResult?.profile_run_id) {
      setError("Run a Data Quality Profile before requesting AI analysis.");
      return;
    }
    if (profileResult.total_findings === 0) {
      setError("This profile has no DQ findings to analyze.");
      return;
    }
    setAiAnalyzing(true);
    setError(null);
    setSuccessMessage(null);
    setAiAnalysis(null);
    setExpandedRecommendationIds(new Set());
    setRemediationByRecommendationId({});
    setRemediationLoadingIds(new Set());
    setRemediationFeedbackByRecommendationId({});
    setRemediationFeedbackLoadingIds(new Set());

    try {
      const response = await runDqAiAnalysis(profileResult.profile_run_id);
      setAiAnalysis(response);
      setSuccessMessage(
        `AI analysis completed. ${response.recommendation_count} recommendation${response.recommendation_count === 1 ? "" : "s"} generated and persisted.`,
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to generate AI Data Quality recommendations.");
    } finally {
      setAiAnalyzing(false);
    }
  }

  async function handleGenerateDatabricksSql(
    recommendationId: string,
  ): Promise<void> {
    if (!profileResult?.profile_run_id) {
      setError(
        "Run a Data Quality Profile before generating Databricks SQL.",
      );
      return;
    }

    if (!selectedConnectionId) {
      setError(
        "Select a Databricks Enterprise Connection before generating remediation.",
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

    setRemediationFeedbackByRecommendationId((current) => {
      const next = { ...current };
      delete next[recommendationId];
      return next;
    });

    try {
      const response = await generateDqRemediation(
        recommendationId,
        {
          profile_run_id: profileResult.profile_run_id,
          connection_id: selectedConnectionId,
          artifact_preference: "SQL",
        },
      );

      setRemediationByRecommendationId((current) => ({
        ...current,
        [recommendationId]: response,
      }));

      setExpandedRecommendationIds((current) => {
        const next = new Set(current);
        next.add(recommendationId);
        return next;
      });

      setSuccessMessage(
        `Databricks SQL remediation generated for recommendation ${recommendationId}.`,
      );
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to generate Databricks SQL remediation.",
      );
    } finally {
      setRemediationLoadingIds((current) => {
        const next = new Set(current);
        next.delete(recommendationId);
        return next;
      });
    }
  }

  async function handleRemediationFeedback(
    recommendationId: string,
    decision: "APPROVE" | "REJECT" | "REQUEST_CHANGES",
  ): Promise<void> {
    const remediation =
      remediationByRecommendationId[recommendationId];

    if (!remediation) {
      setError(
        "Generate a Databricks SQL remediation before steward review.",
      );
      return;
    }

    if (
      decision === "APPROVE"
      && String(remediation.safety_status).toUpperCase() === "BLOCKED"
    ) {
      setError("Blocked remediation cannot be approved.");
      return;
    }

    const note =
      decision === "REQUEST_CHANGES"
        ? window.prompt(
            "Describe the requested Databricks remediation changes:",
          )
        : decision === "REJECT"
          ? window.prompt("Optional rejection note:")
          : null;

    if (
      decision === "REQUEST_CHANGES"
      && !note?.trim()
    ) {
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
      const response = await submitDqRemediationFeedback(
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

      setRemediationFeedbackByRecommendationId((current) => ({
        ...current,
        [recommendationId]: response,
      }));

      setSuccessMessage(
        decision === "APPROVE"
          ? "Databricks remediation approved by the data steward."
          : decision === "REJECT"
            ? "Databricks remediation rejected by the data steward."
            : "Databricks remediation changes requested.",
      );
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to submit steward remediation decision.",
      );
    } finally {
      setRemediationFeedbackLoadingIds((current) => {
        const next = new Set(current);
        next.delete(recommendationId);
        return next;
      });
    }
  }

  function clearAiAnalysis(): void {
    setAiAnalysis(null);
    setExpandedRecommendationIds(new Set());
    setSuccessMessage(null);
    setError(null);
  }

  function toggleRecommendation(recommendationId: string): void {
    setExpandedRecommendationIds((current) => {
      const next = new Set(current);
      next.has(recommendationId) ? next.delete(recommendationId) : next.add(recommendationId);
      return next;
    });
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
            fontSize: 17,
            fontWeight: 700,
            color: "#172033",
            marginBottom: 6,
          }}
        >
          Databricks Enterprise Connection
        </div>

        <div
          style={{
            fontSize: 13,
            color: "#667085",
            marginBottom: 16,
          }}
        >
          Profile a governed Databricks
          DEV/STG Delta table using an
          approved Enterprise Connection.
        </div>

        <select
          value={selectedConnectionId}
          disabled={connectionsLoading}
          onChange={(event) => {
            setSelectedConnectionId(
              event.target.value,
            );
            resetProfileState();
          }}
          style={inputStyle}
        >
          {connections.length === 0 && (
            <option value="">
              No Databricks connections
            </option>
          )}

          {connections.map(
            (connection) => (
              <option
                key={
                  connection.connection_id
                }
                value={
                  connection.connection_id
                }
              >
                {connection.connection_name}
                {" • "}
                {connection.environment}
              </option>
            ),
          )}
        </select>

        {selectedConnection && (
          <div
            style={{
              marginTop: 12,
              fontSize: 13,
              color: "#475467",
            }}
          >
            Vendor:{" "}
            <strong>
              {selectedConnection.vendor}
            </strong>
            {" • "}
            Environment:{" "}
            <strong>
              {
                selectedConnection.environment
              }
            </strong>
          </div>
        )}

        <div
          style={{
            marginTop: 16,
          }}
        >
          <button
            type="button"
            onClick={() => {
              void handlePreview();
            }}
            disabled={
              previewLoading ||
              !selectedConnectionId
            }
            style={{
              ...primaryButtonStyle,
              opacity:
                previewLoading ||
                !selectedConnectionId
                  ? 0.55
                  : 1,
            }}
          >
            {previewLoading
              ? "Loading Preview..."
              : "Preview Governed Table"}
          </button>
        </div>
      </div>

      {preview && (
        <>
          <div style={cardStyle}>
            <div
              style={{
                fontSize: 17,
                fontWeight: 700,
                color: "#172033",
                marginBottom: 6,
              }}
            >
              Databricks Source
            </div>

            <div
              style={{
                fontSize: 13,
                color: "#667085",
              }}
            >
              {preview.source_table}
            </div>
          </div>

          <div style={cardStyle}>
            <div
              style={{
                fontSize: 17,
                fontWeight: 700,
                color: "#172033",
                marginBottom: 14,
              }}
            >
              Domain & Column Mapping
            </div>

            <div
              style={{
                marginTop: 16,
                width: "100%",
                maxWidth: 360,
              }}
            >
              <label
                style={{
                  display: "block",
                  marginBottom: 6,
                  fontSize: 13,
                  fontWeight: 700,
                  color: "#344054",
                }}
              >
                Data Domain
              </label>

              <select
                value={domain}
                onChange={(event) =>
                  handleDomainChange(event.target.value as DqDomain)
                }
                style={inputStyle}
              >
                {DOMAIN_OPTIONS.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </div>

            <div
              style={{
                display: "grid",
                gap: 10,
              }}
            >
              {preview.headers.map(
                (header) => (
                  <div
                    key={header}
                    style={{
                      marginTop: 18,
                      display: "grid",
                      gridTemplateColumns: "220px minmax(280px, 520px)",
                      gap: "10px 20px",
                      alignItems: "center",
                    }}
                  >
                    <div
                      style={{
                        fontSize: 13,
                        fontWeight: 600,
                        color: "#344054",
                      }}
                    >
                      {header}
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
                        Do not profile
                      </option>

                      {domainConfig.fields.map(
                        (field) => (
                          <option
                            key={
                              field.field
                            }
                            value={
                              field.field
                            }
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

            <div
              style={{
                marginTop: 18,
              }}
            >
              <button
                type="button"
                onClick={() => {
                  void handleRunProfile();
                }}
                disabled={profiling}
                style={{
                  ...primaryButtonStyle,
                  opacity: profiling
                    ? 0.55
                    : 1,
                }}
              >
                {profiling
                  ? "Profiling..."
                  : "Run Databricks Profile"}
              </button>
            </div>
          </div>
        </>
      )}

      {error && (
        <div
          style={{
            ...cardStyle,
            borderColor: "#fca5a5",
            color: "#991b1b",
          }}
        >
          {error}
        </div>
      )}

      {successMessage && (
        <div
          style={{
            ...cardStyle,
            borderColor: "#86efac",
            color: "#166534",
          }}
        >
          {successMessage}
        </div>
      )}

      {profileResult && (
        <div style={cardStyle}>
          <div style={{ fontSize: 17, fontWeight: 700, color: "#172033", marginBottom: 6 }}>
            Data Quality Profile Results
          </div>
          <div style={{ fontSize: 13, color: "#667085", marginBottom: 16 }}>
            Profile Run: {profileResult.profile_run_id}
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(6, minmax(150px, 1fr))", gap: 12 }}>
            {[
              { label: "Records", value: profileResult.total_records, valueColor: "#0f172a" },
              { label: "Average Score", value: (profileResult.avg_record_score ?? 0).toFixed(2), valueColor: "#0f172a" },
              { label: "Records With Findings", value: profileResult.records_with_findings, valueColor: "#0f172a" },
              { label: "Total Findings", value: profileResult.total_findings, valueColor: "#0f172a" },
              { label: "Duplicate Records", value: profileResult.duplicate_record_count, valueColor: profileResult.duplicate_record_count > 0 ? "#b45309" : "#0f172a" },
              { label: "Below Threshold", value: profileResult.records_below_threshold, valueColor: profileResult.records_below_threshold > 0 ? "#b45309" : "#0f172a" },
            ].map((metric) => (
              <div key={metric.label} style={{ border: "1px solid #e2e8f0", borderRadius: 14, padding: 14, background: "linear-gradient(180deg, #ffffff 0%, #f8fafc 100%)" }}>
                <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: 0.5, textTransform: "uppercase", color: "#64748b" }}>
                  {metric.label}
                </div>
                <div style={{ marginTop: 6, fontSize: 22, fontWeight: 850, color: metric.valueColor }}>
                  {metric.value}
                </div>
              </div>
            ))}
          </div>

          <div style={{ marginTop: 16, padding: 12, borderRadius: 12, border: "1px solid #e2e8f0", background: "#f8fafc", fontSize: 12, color: "#475569" }}>
            <b>Domain:</b> {domain}{" • "}<b>Source:</b> Databricks{" • "}<b>Table:</b> {preview?.source_table ?? "—"}
          </div>
        </div>
      )}

      {profileResult && (
        <UniversalProfileIntelligence
          enabled={profileResult.universal_rules_shadow_enabled === true}
          intelligence={profileResult.universal_rules_shadow}
        />
      )}

      {profileResult && (
        <div style={{ marginTop: 16 }}>
          <button
            type="button"
            onClick={() => { void handleAnalyzeWithAi(); }}
            disabled={aiAnalyzing || profileResult.total_findings === 0}
            style={{
              ...primaryButtonStyle,
              width: "fit-content",
              opacity: aiAnalyzing || profileResult.total_findings === 0 ? 0.6 : 1,
              cursor: aiAnalyzing || profileResult.total_findings === 0 ? "not-allowed" : "pointer",
            }}
          >
            {aiAnalyzing ? "Analyzing with AI..." : "Analyze with AI"}
          </button>
        </div>
      )}

      {aiAnalysis && (
        <div style={cardStyle}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 20, marginBottom: 18, maxWidth: 1050 }}>
            <div>
              <div style={{ fontSize: 17, fontWeight: 700, color: "#172033" }}>AI Data Quality Analysis</div>
              <div style={{ marginTop: 5, fontSize: 13, color: "#667085" }}>
                AI recommendations generated from the persisted Databricks profile.
              </div>
            </div>
            <button type="button" onClick={clearAiAnalysis} style={{ ...secondaryButtonStyle, flexShrink: 0, whiteSpace: "nowrap" }}>
              Clear AI Analysis
            </button>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "220px minmax(360px, 520px)", gap: 12, width: "fit-content", maxWidth: "100%" }}>
            <div style={{ border: "1px solid #e2e8f0", borderRadius: 14, padding: 14, background: "linear-gradient(180deg, #ffffff 0%, #f8fafc 100%)" }}>
              <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: 0.5, textTransform: "uppercase", color: "#64748b" }}>Recommendations</div>
              <div style={{ marginTop: 6, fontSize: 22, fontWeight: 850, color: "#0f172a" }}>{aiAnalysis.recommendation_count}</div>
            </div>
            <div style={{ border: "1px solid #e2e8f0", borderRadius: 14, padding: 14, background: "linear-gradient(180deg, #ffffff 0%, #f8fafc 100%)" }}>
              <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: 0.5, textTransform: "uppercase", color: "#64748b" }}>Profile Run</div>
              <div style={{ marginTop: 6, fontSize: 18, fontWeight: 850, color: "#0f172a", overflowWrap: "anywhere" }}>{profileResult?.profile_run_id ?? "—"}</div>
            </div>
          </div>

          {aiAnalysis.overall_analysis && (
            <div style={{ marginTop: 18, padding: 16, borderRadius: 12, border: "1px solid #e2e8f0", background: "#f8fafc", maxWidth: 1050 }}>
              <div style={{ fontSize: 14, fontWeight: 700, color: "#172033", marginBottom: 8 }}>Overall AI Assessment</div>
              <div style={{ fontSize: 13, color: "#475569", lineHeight: 1.6 }}>{aiAnalysis.overall_analysis.dq_health_summary}</div>
              <div style={{ marginTop: 10, fontSize: 13, color: "#475569" }}><b>Highest Priority:</b>{" "}{aiAnalysis.overall_analysis.highest_priority_issue}</div>
              <div style={{ marginTop: 6, fontSize: 13, color: "#475569" }}><b>Next Action:</b>{" "}{aiAnalysis.overall_analysis.recommended_next_action}</div>
            </div>
          )}

          {aiAnalysis.recommendations?.length > 0 && (
            <div style={{ marginTop: 20, display: "grid", gap: 14 }}>
              {aiAnalysis.recommendations.map((recommendation, index) => {
                const recommendationId = recommendation.recommendation_id ?? String(index);
                const isExpanded = expandedRecommendationIds.has(recommendationId);
                const remediation =
                  remediationByRecommendationId[recommendationId];
                const remediationLoading =
                  remediationLoadingIds.has(recommendationId);
                const remediationFeedback =
                  remediationFeedbackByRecommendationId[
                    recommendationId
                  ];
                const feedbackLoading =
                  remediationFeedbackLoadingIds.has(
                    recommendationId,
                  );
                const approvalStatus = String(
                  remediationFeedback?.approval_status || "",
                )
                  .trim()
                  .toUpperCase();
                const remediationApproved =
                  approvalStatus === "APPROVED";
                const remediationRejected =
                  approvalStatus === "REJECTED";
                const changesRequested =
                  approvalStatus === "CHANGES_REQUESTED"
                  || approvalStatus === "REQUEST_CHANGES";

                return (
                  <div key={recommendationId} style={{ border: "1px solid #e2e8f0", borderRadius: 14, padding: 16, background: "#ffffff", width: "100%", maxWidth: isExpanded ? 1050 : 760, boxSizing: "border-box" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "flex-start", flexWrap: "wrap" }}>
                      <div>
                        <div style={{ fontSize: 15, fontWeight: 700, color: "#172033" }}>{recommendation.recommendation_title}</div>
                        <div style={{ marginTop: 4, fontSize: 12, color: "#667085" }}>
                          Rule: {recommendation.rule_id}{" • "}Field: {recommendation.field_name ?? "N/A"}
                        </div>
                      </div>
                      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                        <span style={{ padding: "4px 8px", borderRadius: 999, fontSize: 11, fontWeight: 700, background: "#f1f5f9", color: "#334155" }}>{recommendation.dimension}</span>
                        <span style={{ padding: "4px 8px", borderRadius: 999, fontSize: 11, fontWeight: 700, background: "#f8fafc", color: "#475569", border: "1px solid #e2e8f0" }}>{recommendation.severity}</span>
                      </div>
                    </div>

                    {isExpanded && (
                      <div style={{ marginTop: 14, display: "grid", gap: 10 }}>
                        {recommendation.business_impact && <div><b>Business Impact</b><div style={{ marginTop: 3, color: "#475569", fontSize: 13, lineHeight: 1.5 }}>{recommendation.business_impact}</div></div>}
                        {recommendation.recommended_remediation && <div><b>Recommended Remediation</b><div style={{ marginTop: 3, color: "#475569", fontSize: 13, lineHeight: 1.5 }}>{recommendation.recommended_remediation}</div></div>}
                        {recommendation.suggested_sql && <div><b>Suggested SQL</b><pre style={{ marginTop: 6, marginBottom: 0, padding: 12, borderRadius: 10, background: "#0f172a", color: "#e2e8f0", overflowX: "auto", fontSize: 12, lineHeight: 1.6, whiteSpace: "pre-wrap", wordBreak: "break-word" }}>{recommendation.suggested_sql}</pre></div>}
                        {recommendation.suggested_regex && <div><b>Suggested Regex</b><code style={{ display: "block", marginTop: 6, padding: 10, borderRadius: 8, background: "#f8fafc", border: "1px solid #e5e7eb", overflowX: "auto" }}>{recommendation.suggested_regex}</code></div>}
                        {recommendation.reasoning_summary && <div><b>Reasoning</b><div style={{ marginTop: 3, color: "#475569", fontSize: 13, lineHeight: 1.5 }}>{recommendation.reasoning_summary}</div></div>}
                      </div>
                    )}

                    <div style={{ marginTop: 14, paddingTop: 12, borderTop: "1px solid #eef2f7", display: "flex", gap: 18, flexWrap: "wrap", fontSize: 12, color: "#475569" }}>
                      <span><b>Automation:</b>{" "}{recommendation.automation_recommendation}</span>
                      <span><b>Confidence:</b>{" "}{Math.round((recommendation.automation_confidence ?? 0) * 100)}%</span>
                      <span><b>Steward Approval:</b>{" "}{recommendation.steward_approval_required ? "Required" : "Not Required"}</span>
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
                          toggleRecommendation(recommendationId)
                        }
                        style={secondaryButtonStyle}
                      >
                        {isExpanded ? "Hide Analysis" : "View Analysis"}
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          void handleGenerateDatabricksSql(
                            recommendationId,
                          );
                        }}
                        disabled={remediationLoading}
                        style={{
                          ...primaryButtonStyle,
                          opacity: remediationLoading ? 0.6 : 1,
                          cursor: remediationLoading
                            ? "not-allowed"
                            : "pointer",
                        }}
                      >
                        {remediationLoading
                          ? "Generating Databricks SQL..."
                          : remediation
                            ? "Regenerate Databricks SQL"
                            : "Generate Databricks SQL"}
                      </button>
                    </div>

                    {remediation && (
                      <div
                        style={{
                          marginTop: 16,
                          padding: 16,
                          border: "1px solid #dbe4ee",
                          borderRadius: 12,
                          background: "#f8fafc",
                          display: "grid",
                          gap: 12,
                        }}
                      >
                        <div
                          style={{
                            display: "flex",
                            gap: 8,
                            flexWrap: "wrap",
                            alignItems: "center",
                          }}
                        >
                          <strong>
                            Generated Databricks Remediation
                            {remediation.version_number
                              ? ` — Version ${remediation.version_number}`
                              : ""}
                          </strong>

                          <span>{remediation.artifact_type}</span>
                          <span>{remediation.sql_dialect}</span>
                          <span>{remediation.safety_status}</span>
                        </div>

                        {remediation.reasoning_summary && (
                          <div
                            style={{
                              fontSize: 13,
                              color: "#475569",
                              lineHeight: 1.55,
                            }}
                          >
                            <b>Why this remediation:</b>{" "}
                            {remediation.reasoning_summary}
                          </div>
                        )}

                        {remediation.remediation_sql ? (
                          <div>
                            <div
                              style={{
                                marginBottom: 6,
                                fontSize: 12,
                                fontWeight: 800,
                              }}
                            >
                              Proposed Databricks SQL
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
                                lineHeight: 1.6,
                                whiteSpace: "pre-wrap",
                                wordBreak: "break-word",
                              }}
                            >
                              {remediation.remediation_sql}
                            </pre>
                          </div>
                        ) : (
                          <div
                            style={{
                              padding: 12,
                              borderRadius: 10,
                              background: "#fff7ed",
                              border: "1px solid #fed7aa",
                              color: "#9a3412",
                              fontSize: 12,
                            }}
                          >
                            No executable SQL artifact was generated.
                            Steward review is required before remediation
                            can continue.
                          </div>
                        )}

                        <div
                          style={{
                            fontSize: 12,
                            color: "#64748b",
                          }}
                        >
                          <b>Remediation Version ID:</b>{" "}
                          {remediation.remediation_version_id}
                          {" • "}
                          <b>Steward Approval:</b>{" "}
                          {remediation.steward_approval_required
                            ? "Required"
                            : "Not Required"}
                        </div>

                        <div
                          style={{
                            padding: 14,
                            border: "1px solid #e2e8f0",
                            borderRadius: 12,
                            background: "#ffffff",
                            display: "grid",
                            gap: 12,
                          }}
                        >
                          <div
                            style={{
                              display: "flex",
                              justifyContent: "space-between",
                              gap: 12,
                              flexWrap: "wrap",
                              alignItems: "center",
                            }}
                          >
                            <div>
                              <div
                                style={{
                                  fontSize: 13,
                                  fontWeight: 800,
                                  color: "#172033",
                                }}
                              >
                                Steward Review
                              </div>
                              <div
                                style={{
                                  marginTop: 4,
                                  fontSize: 12,
                                  color: "#64748b",
                                }}
                              >
                                Approve the exact persisted SQL artifact
                                before validation or Databricks writeback.
                              </div>
                            </div>

                            <strong
                              style={{
                                fontSize: 12,
                                color: remediationApproved
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
                                    : "PENDING"}
                            </strong>
                          </div>

                          {!remediationApproved
                            && !remediationRejected
                            && !changesRequested && (
                            <div
                              style={{
                                display: "flex",
                                gap: 8,
                                flexWrap: "wrap",
                              }}
                            >
                              <button
                                type="button"
                                disabled={
                                  feedbackLoading
                                  || remediation.safety_status === "BLOCKED"
                                }
                                onClick={() => {
                                  void handleRemediationFeedback(
                                    recommendationId,
                                    "APPROVE",
                                  );
                                }}
                                style={{
                                  ...primaryButtonStyle,
                                  opacity:
                                    feedbackLoading
                                    || remediation.safety_status === "BLOCKED"
                                      ? 0.55
                                      : 1,
                                }}
                              >
                                {feedbackLoading
                                  ? "Submitting..."
                                  : "Approve Remediation"}
                              </button>

                              <button
                                type="button"
                                disabled={feedbackLoading}
                                onClick={() => {
                                  void handleRemediationFeedback(
                                    recommendationId,
                                    "REQUEST_CHANGES",
                                  );
                                }}
                                style={secondaryButtonStyle}
                              >
                                Request Changes
                              </button>

                              <button
                                type="button"
                                disabled={feedbackLoading}
                                onClick={() => {
                                  void handleRemediationFeedback(
                                    recommendationId,
                                    "REJECT",
                                  );
                                }}
                                style={secondaryButtonStyle}
                              >
                                Reject
                              </button>
                            </div>
                          )}

                          {changesRequested && (
                            <div
                              style={{
                                padding: 12,
                                borderRadius: 10,
                                border: "1px solid #fde68a",
                                background: "#fffbeb",
                                color: "#92400e",
                                fontSize: 12,
                                lineHeight: 1.5,
                              }}
                            >
                              Steward changes were requested. Use
                              <b> Regenerate Databricks SQL</b> above to
                              create a new persisted version using the
                              steward feedback.
                            </div>
                          )}

                          {remediationRejected && (
                            <div
                              style={{
                                padding: 12,
                                borderRadius: 10,
                                border: "1px solid #fecaca",
                                background: "#fef2f2",
                                color: "#991b1b",
                                fontSize: 12,
                              }}
                            >
                              This remediation was rejected and cannot
                              proceed to Databricks execution.
                            </div>
                          )}

                          {remediationApproved && (
                            <div
                              style={{
                                padding: 12,
                                borderRadius: 10,
                                border: "1px solid #bbf7d0",
                                background: "#f0fdf4",
                                color: "#166534",
                                fontSize: 12,
                                lineHeight: 1.5,
                              }}
                            >
                              <b>Steward Approved ✓</b>
                              <div style={{ marginTop: 4 }}>
                                The persisted SQL artifact has completed
                                Profile Intelligence review and is eligible
                                for the DQ Intelligence Active Governance Queue.
                              </div>
                            </div>
                          )}
                        </div>

                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

