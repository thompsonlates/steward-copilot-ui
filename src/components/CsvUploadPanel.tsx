import React, {
  useMemo,
  useState,
} from "react";

import UniversalProfileIntelligence
  from "../components/UniversalProfileIntelligence";

import {
  previewCsv,
  runCsvProfile,
  runDqAiAnalysis,
  generateDqRemediation,
  submitDqRemediationFeedback,
  getDqRemediationVersions,
} from "../api/client";

import type {
  CsvPreviewResponse,
  CsvProfileResponse,
  DqAiAnalysisResponse,
  DqRemediationGenerateResponse,
  DqRemediationFeedbackResponse,
  DqRemediationVersion,
} from "../api/types";


import {
  DQ_DOMAIN_CONFIG,
  type DqDomain,
} from "../config/dqDomainConfig";

type MappingState = Record<
  string,
  string
>;


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


const primaryButtonStyle:
  React.CSSProperties = {
    padding: "11px 16px",
    borderRadius: 10,
    border: "1px solid #111827",
    background: "#111827",
    color: "#ffffff",
    cursor: "pointer",
    fontWeight: 700,
  };


const secondaryButtonStyle:
  React.CSSProperties = {
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
    <div
      style={{
        marginBottom: 14,
      }}
    >
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
    normalizeColumnName(
      sourceColumn,
    );

  const domainConfig =
    DQ_DOMAIN_CONFIG[domain];

  for (
    const field
    of domainConfig.fields
  ) {
    const candidateNames = [
      field.field,
      ...field.aliases,
    ].map(
      normalizeColumnName,
    );

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
  columns: string[],
  domain: DqDomain,
): MappingState {
  const mapping:
    MappingState = {};

  for (const column of columns) {
    mapping[column] =
      suggestTargetField(
        column,
        domain,
      );
  }

  return mapping;
}


function formatScore(
  value: number | null | undefined,
): string {
  if (
    value === null
    || value === undefined
  ) {
    return "—";
  }

  return value.toFixed(2);
}


function MetricCard({
  label,
  value,
  helper,
}: {
  label: string;
  value: string | number;
  helper?: string;
}) {
  return (
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
        {label}
      </div>

      <div
        style={{
          marginTop: 6,
          fontSize: 22,
          fontWeight: 850,
          color: "#172033",
        }}
      >
        {value}
      </div>

      {helper && (
        <div
          style={{
            marginTop: 4,
            fontSize: 11,
            color: "#94a3b8",
          }}
        >
          {helper}
        </div>
      )}
    </div>
  );
}


export default function CsvUploadPanel() {
  const [
    file,
    setFile,
  ] = useState<File | null>(
    null,
  );

  const [
    preview,
    setPreview,
  ] = useState<
    CsvPreviewResponse | null
  >(null);

  const [
    domain,
    setDomain,
  ] = useState<DqDomain>(
    "CUSTOMER",
  );

  const [
    expandedRecommendationIds,
    setExpandedRecommendationIds,
  ] = useState<Set<string>>(
    new Set(),
);

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

  const [
    mapping,
    setMapping,
  ] = useState<MappingState>(
    {},
  );

  const [
    previewLoading,
    setPreviewLoading,
  ] = useState(false);

  const [
    profiling,
    setProfiling,
  ] = useState(false);

  const [
    aiAnalyzing,
    setAiAnalyzing,
  ] = useState(false);

  const [
    profileResult,
    setProfileResult,
  ] = useState<
    CsvProfileResponse | null
  >(null);

  const [
    remediationByRecommendationId,
    setRemediationByRecommendationId,
  ] = useState<
    Record<
      string,
      DqRemediationGenerateResponse
    >
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
    Record<
      string,
      DqRemediationFeedbackResponse
    >
  >({});

  const [
    aiAnalysis,
    setAiAnalysis,
  ] = useState<
    DqAiAnalysisResponse | null
  >(null);

  const [
    error,
    setError,
  ] = useState<string | null>(
    null,
  );

  const [
    successMessage,
    setSuccessMessage,
  ] = useState<
    string | null
  >(null);


  const domainConfig =
    DQ_DOMAIN_CONFIG[domain];


  const mappedTargets =
    useMemo(
      () =>
        Object
          .values(mapping)
          .filter(
            (
              value,
            ): value is string =>
              Boolean(value),
          ),
      [mapping],
    );


  const requiredTargetFields =
    useMemo(
      () =>
        domainConfig.fields
          .filter(
            (field) =>
              field.required,
          )
          .map(
            (field) =>
              field.field,
          ),
      [domainConfig],
    );


  const missingRequiredFields =
    useMemo(
      () =>
        requiredTargetFields
          .filter(
            (fieldName) =>
              !mappedTargets
                .includes(
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
        new Map<
          string,
          number
        >();

      for (
        const target
        of mappedTargets
      ) {
        counts.set(
          target,
          (
            counts.get(
              target,
            )
            ?? 0
          ) + 1,
        );
      }

      return Array.from(
        counts.entries(),
      )
        .filter(
          (
            [, count],
          ) =>
            count > 1,
        )
        .map(
          ([target]) =>
            target,
        );
    }, [mappedTargets]);


  const mappingsComplete =
    missingRequiredFields.length
      === 0
    &&
    duplicateMappedTargets.length
      === 0;


  const requiredMappingLabels =
    domainConfig.fields
      .filter(
        (field) =>
          field.required,
      )
      .map(
        (field) =>
          field.label,
      );


  function resetResults(): void {
    setProfileResult(null);
    setAiAnalysis(null);
    setRemediationByRecommendationId({});
    setRemediationLoadingIds(new Set());
    setRemediationFeedbackByRecommendationId({});
    setExpandedRecommendationIds(new Set());
    setError(null);
    setSuccessMessage(null);
  }

  function toggleRecommendation(
  recommendationId: string,
): void {
  setExpandedRecommendationIds(
    (current) => {
      const next = new Set(
        current,
      );

      if (
        next.has(
          recommendationId,
        )
      ) {
        next.delete(
          recommendationId,
        );
      } else {
        next.add(
          recommendationId,
        );
      }

      return next;
    },
  );
}


  function handleFileChange(
    event:
      React.ChangeEvent<
        HTMLInputElement
      >,
  ): void {
    const selectedFile =
      event.target.files?.[0]
      ?? null;

    setFile(selectedFile);

    setPreview(null);
    setMapping({});
    resetResults();
  }


  function handleDomainChange(
    nextDomain: DqDomain,
  ): void {
    setDomain(nextDomain);
    resetResults();

    if (preview) {
      setMapping(
        buildSuggestedMapping(
          preview.columns,
          nextDomain,
        ),
      );
    } else {
      setMapping({});
    }
  }


  function updateMapping(
    sourceColumn: string,
    targetField: string,
  ): void {
    setMapping(
      (current) => ({
        ...current,
        [sourceColumn]:
          targetField,
      }),
    );

    resetResults();
  }


  async function handlePreview():
    Promise<void> {
    if (!file) {
      setError(
        "Select a CSV file first.",
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
        await previewCsv(
          file,
          25,
        );

      setPreview(
        response,
      );

      setMapping(
        buildSuggestedMapping(
          response.columns,
          domain,
        ),
      );

      setSuccessMessage(
        `CSV preview loaded successfully. ${response.total_preview_rows} row${
          response.total_preview_rows
            === 1
            ? ""
            : "s"
        } returned.`,
      );
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : (
            "Unable to preview "
            + "CSV file."
          ),
      );
    } finally {
      setPreviewLoading(false);
    }
  }


  async function handleRunProfile():
    Promise<void> {
    if (!file) {
      setError(
        "Select a CSV file first.",
      );
      return;
    }

    if (!preview) {
      setError(
        "Preview the CSV file "
        + "before running the "
        + "data quality profile.",
      );
      return;
    }

    if (
      missingRequiredFields
        .length > 0
    ) {
      const missingLabels =
        domainConfig.fields
          .filter(
            (field) =>
              missingRequiredFields
                .includes(
                  field.field,
                ),
          )
          .map(
            (field) =>
              field.label,
          );

      setError(
        `Map the required ${domain} field${
          missingLabels.length
            === 1
            ? ""
            : "s"
        }: ${
          missingLabels.join(
            ", ",
          )
        }.`,
      );

      return;
    }

    if (
      duplicateMappedTargets
        .length > 0
    ) {
      setError(
        "Each target field can "
        + "only be mapped once. "
        + "Duplicate mapping"
        + `${
          duplicateMappedTargets
            .length === 1
            ? ""
            : "s"
        }: ${
          duplicateMappedTargets
            .join(", ")
        }.`,
      );

      return;
    }

    const columnMappings =
      Object.entries(mapping)
        .filter(
          (
            [, targetField],
          ) =>
            Boolean(
              targetField,
            ),
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

    try {
      const response =
        await runCsvProfile({
          file,
          domain,
          business_key_field:
            domainConfig
              .businessKeyField,
          column_mappings:
            columnMappings,
          minimum_record_score:
            80,
        });

      setProfileResult(
        response,
      );

      setSuccessMessage(
        `${domain} CSV data quality profile completed and persisted successfully.`,
      );
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : (
            "Unable to run "
            + "CSV data quality "
            + "profile."
          ),
      );
    } finally {
      setProfiling(false);
    }
  }

  {profileResult && (
  <UniversalProfileIntelligence
    enabled={
      profileResult.universal_rules_shadow_enabled
    }
    intelligence={
      profileResult.universal_rules_shadow
    }
  />
)}

  async function handleAnalyzeWithAi():
    Promise<void> {
    if (
      !profileResult
        ?.profile_run_id
    ) {
      setError(
        "Run a Data Quality "
        + "Profile before "
        + "requesting AI analysis.",
      );
      return;
    }

    if (
      profileResult
        .total_findings
      === 0
    ) {
      setError(
        "This profile has no "
        + "DQ findings to analyze.",
      );
      return;
    }

    setAiAnalyzing(true);
    setError(null);
    setSuccessMessage(null);
    setAiAnalysis(null);
    setRemediationByRecommendationId({});
    setRemediationLoadingIds(new Set());
    setRemediationFeedbackByRecommendationId({});

    try {
      const response =
        await runDqAiAnalysis(
          profileResult
            .profile_run_id,
        );

      setAiAnalysis(
        response,
      );

      setSuccessMessage(
        `AI analysis completed. ${response.recommendation_count} recommendation${
          response
            .recommendation_count
          === 1
            ? ""
            : "s"
        } generated and persisted.`,
      );
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : (
            "Unable to generate "
            + "AI Data Quality "
            + "recommendations."
          ),
      );
    } finally {
      setAiAnalyzing(false);
    }
  }

  async function handleGenerateRemediation(
    recommendationId: string,
    artifactPreference: "AUTO" | "SQL" = "AUTO",
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

    setRemediationFeedbackByRecommendationId(
      (current) => {
        const next = { ...current };
        delete next[recommendationId];
        return next;
      },
    );

    try {
      const response =
        (await generateDqRemediation(
          recommendationId,
          {
            profile_run_id:
              profileResult.profile_run_id,
            source_table: "source_table",
            sql_dialect: "GENERIC",
            artifact_preference:
              artifactPreference,
          },
        )) as DqRemediationGenerateResponse;

      setRemediationByRecommendationId(
        (current) => ({
          ...current,
          [recommendationId]: response,
        }),
      );

      setExpandedRecommendationIds(
        (current) => {
        const next = new Set(current);
        next.add(recommendationId);
        return next;
        },
      );
      setRemediationVersionsByRecommendationId((current) => {
        const next = { ...current };
        delete next[recommendationId];
        return next;
        });

        setExpandedVersionHistoryIds((current) => {
          const next = new Set(current);
          next.delete(recommendationId);
          return next;
        });


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
        decision === "REQUEST_CHANGES"
        && !note?.trim()
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
          [recommendationId]: feedbackResponse,
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
    }
  }

 
  return (
    <div
      style={{
        display: "grid",
        gap: 18,
      }}
    >

      {/* -------------------------------- */}
      {/* Upload                           */}
      {/* -------------------------------- */}

      <div style={cardStyle}>
        <SectionTitle
          title="CSV Data Quality"
          description={
            "Upload a CSV, select a domain, map source columns, "
            + "and run tenant-isolated Data Quality profiling."
          }
        />

        <div
          style={{
            display: "grid",
            gridTemplateColumns:
              "minmax(0, 1fr) 220px auto",
            gap: 12,
            alignItems: "end",
          }}
        >
          <div>
            <div
              style={{
                marginBottom: 6,
                fontSize: 13,
                fontWeight: 600,
                color: "#344054",
              }}
            >
              CSV File
            </div>

            <input
              type="file"
              accept=".csv,text/csv"
              onChange={
                handleFileChange
              }
              style={inputStyle}
            />
          </div>

          <div>
            <div
              style={{
                marginBottom: 6,
                fontSize: 13,
                fontWeight: 600,
                color: "#344054",
              }}
            >
              Domain
            </div>

            <select
              value={domain}
              onChange={(
                event,
              ) =>
                handleDomainChange(
                  event.target.value as DqDomain,
              )
              }
              style={inputStyle}
            >
              {(
                Object.keys(
                  DQ_DOMAIN_CONFIG,
                ) as DqDomain[]
              ).map(
                (item) => (
                  <option
                    key={item}
                    value={item}
                  >
                    {item}
                  </option>
                ),
              )}
            </select>
          </div>

          <button
            type="button"
            onClick={() => {
              void handlePreview();
            }}
            disabled={
              previewLoading
              || !file
            }
            style={{
              ...primaryButtonStyle,
              opacity:
                previewLoading
                || !file
                  ? 0.6
                  : 1,
              cursor:
                previewLoading
                || !file
                  ? "not-allowed"
                  : "pointer",
            }}
          >
            {previewLoading
              ? "Loading..."
              : "Preview CSV"}
          </button>
        </div>

        {file && (
          <div
            style={{
              marginTop: 12,
              padding: "10px 12px",
              borderRadius: 10,
              background: "#f8fafc",
              border:
                "1px solid #e2e8f0",
              fontSize: 12,
              color: "#475569",
            }}
          >
            <b>Selected:</b>{" "}
            {file.name}
            {" • "}
            {(
              file.size
              / 1024
            ).toFixed(1)}
            {" KB"}
          </div>
        )}
      </div>


      {/* -------------------------------- */}
      {/* Messages                         */}
      {/* -------------------------------- */}

      {error && (
        <div
          style={{
            border:
              "1px solid #fecaca",
            background:
              "#fef2f2",
            color: "#b91c1c",
            padding: 12,
            borderRadius: 12,
            fontSize: 13,
          }}
        >
          {error}
        </div>
      )}

      {successMessage && (
        <div
          style={{
            border:
              "1px solid #bbf7d0",
            background:
              "#f0fdf4",
            color: "#166534",
            padding: 12,
            borderRadius: 12,
            fontSize: 13,
          }}
        >
          {successMessage}
        </div>
      )}


      {/* -------------------------------- */}
      {/* Preview                          */}
      {/* -------------------------------- */}

      {preview && (
        <div style={cardStyle}>
          <SectionTitle
            title="CSV Preview"
            description={
              `${preview.file_name} • `
              + `${preview.total_preview_rows} preview rows • `
              + `${preview.columns.length} columns`
            }
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
                  {preview.columns.map(
                    (column) => (
                      <th
                        key={column}
                        style={{
                          padding:
                            "10px 12px",
                          textAlign:
                            "left",
                          background:
                            "#f8fafc",
                          color:
                            "#475569",
                          borderBottom:
                            "1px solid #e2e8f0",
                          whiteSpace:
                            "nowrap",
                        }}
                      >
                        {column}
                      </th>
                    ),
                  )}
                </tr>
              </thead>

              <tbody>
                {preview.rows.map(
                  (
                    row,
                    rowIndex,
                  ) => (
                    <tr
                      key={
                        `csv-row-${rowIndex}`
                      }
                    >
                      {preview.columns.map(
                        (
                          column,
                        ) => (
                          <td
                            key={
                              `${rowIndex}-${column}`
                            }
                            style={{
                              padding:
                                "9px 12px",
                              borderBottom:
                                "1px solid #f1f5f9",
                              color:
                                "#334155",
                              whiteSpace:
                                "nowrap",
                            }}
                          >
                            {row[
                              column
                            ] ?? (
                              <span
                                style={{
                                  color:
                                    "#94a3b8",
                                }}
                              >
                                NULL
                              </span>
                            )}
                          </td>
                        ),
                      )}
                    </tr>
                  ),
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}


      {/* -------------------------------- */}
      {/* Mapping                          */}
      {/* -------------------------------- */}

      {preview && (
        <div style={cardStyle}>
          <SectionTitle
            title={`${domain} Column Mapping`}
            description={
              "Map CSV columns to the canonical domain fields "
              + "used by the Data Quality engine."
            }
          />

          <div
            style={{
              marginBottom: 14,
              padding: 12,
              borderRadius: 12,
              background: "#f8fafc",
              border:
                "1px solid #e2e8f0",
              fontSize: 12,
              color: "#475569",
            }}
          >
            <b>
              Required fields:
            </b>{" "}
            {requiredMappingLabels
              .length
              ? requiredMappingLabels
                  .join(", ")
              : "None"}
          </div>

          <div
            style={{
              display: "grid",
              gap: 10,
            }}
          >
            {preview.columns.map(
              (sourceColumn) => (
                <div
                  key={sourceColumn}
                  style={{
                    display:
                      "grid",
                    gridTemplateColumns:
                      "minmax(180px, 1fr) 40px minmax(220px, 1fr)",
                    gap: 12,
                    alignItems:
                      "center",
                    padding:
                      "10px 12px",
                    border:
                      "1px solid #e2e8f0",
                    borderRadius: 12,
                    background:
                      "#ffffff",
                  }}
                >
                  <div>
                    <div
                      style={{
                        fontSize: 11,
                        fontWeight:
                          800,
                        color:
                          "#64748b",
                        textTransform:
                          "uppercase",
                        letterSpacing:
                          0.4,
                      }}
                    >
                      CSV Column
                    </div>

                    <div
                      style={{
                        marginTop: 3,
                        fontSize: 13,
                        fontWeight:
                          700,
                        color:
                          "#172033",
                      }}
                    >
                      {sourceColumn}
                    </div>
                  </div>

                  <div
                    style={{
                      textAlign:
                        "center",
                      color:
                        "#94a3b8",
                      fontWeight:
                        900,
                    }}
                  >
                    →
                  </div>

                  <select
                    value={
                      mapping[
                        sourceColumn
                      ]
                      ?? ""
                    }
                    onChange={(
                      event,
                    ) =>
                      updateMapping(
                        sourceColumn,
                        event.target
                          .value,
                      )
                    }
                    style={inputStyle}
                  >
                    <option value="">
                      Do not map
                    </option>

                    {domainConfig.fields
                      .map(
                        (field) => (
                          <option
                            key={
                              field.field
                            }
                            value={
                              field.field
                            }
                          >
                            {
                              field.label
                            }
                            {
                              field.required
                                ? " *"
                                : ""
                            }
                          </option>
                        ),
                      )}
                  </select>
                </div>
              ),
            )}
          </div>

          {missingRequiredFields
            .length > 0 && (
            <div
              style={{
                marginTop: 12,
                fontSize: 12,
                color: "#b45309",
              }}
            >
              Missing required mappings:{" "}
              {missingRequiredFields
                .join(", ")}
            </div>
          )}

          {duplicateMappedTargets
            .length > 0 && (
            <div
              style={{
                marginTop: 12,
                fontSize: 12,
                color: "#b91c1c",
              }}
            >
              Duplicate target mappings:{" "}
              {duplicateMappedTargets
                .join(", ")}
            </div>
          )}

          <div
            style={{
              marginTop: 16,
              display: "flex",
              gap: 10,
              flexWrap: "wrap",
            }}
          >
            <button
              type="button"
              onClick={() => {
                void handleRunProfile();
              }}
              disabled={
                profiling
                || !mappingsComplete
              }
              style={{
                ...primaryButtonStyle,
                opacity:
                  profiling
                  || !mappingsComplete
                    ? 0.6
                    : 1,
                cursor:
                  profiling
                  || !mappingsComplete
                    ? "not-allowed"
                    : "pointer",
              }}
            >
              {profiling
                ? "Profiling..."
                : "Run Data Quality Profile"}
            </button>

            <button
              type="button"
              onClick={() => {
                setMapping(
                  buildSuggestedMapping(
                    preview.columns,
                    domain,
                  ),
                );
                resetResults();
              }}
              style={
                secondaryButtonStyle
              }
            >
              Reset Suggested Mapping
            </button>
          </div>
        </div>
      )}


      {/* -------------------------------- */}
      {/* Profile Results                  */}
      {/* -------------------------------- */}

      {profileResult && (
        <div style={cardStyle}>
          <SectionTitle
            title="Data Quality Profile Results"
            description={
              `Profile Run: ${profileResult.profile_run_id}`
            }
          />

          <div
            style={{
              display: "grid",
              gridTemplateColumns:
                "repeat(auto-fit, minmax(160px, 1fr))",
              gap: 12,
            }}
          >
            <MetricCard
              label="Records"
              value={
                profileResult
                  .total_records
              }
            />

            <MetricCard
              label="Average Score"
              value={
                formatScore(
                  profileResult
                    .avg_record_score,
                )
              }
            />

            <MetricCard
              label="Records With Findings"
              value={
                profileResult
                  .records_with_findings
              }
            />

            <MetricCard
              label="Total Findings"
              value={
                profileResult
                  .total_findings
              }
            />

            <MetricCard
              label="Duplicate Records"
              value={
                profileResult
                  .duplicate_record_count
              }
            />

            <MetricCard
              label="Below Threshold"
              value={
                profileResult
                  .records_below_threshold
              }
            />
          </div>

          <div
            style={{
              marginTop: 16,
              padding: 12,
              borderRadius: 12,
              border:
                "1px solid #e2e8f0",
              background:
                "#f8fafc",
              fontSize: 12,
              color: "#475569",
            }}
          >
            <b>Domain:</b>{" "}
            {profileResult.domain}
            {" • "}

            <b>Source:</b>{" "}
            {
              profileResult
                .source_type
            }
            {" • "}

            <b>File:</b>{" "}
            {
              profileResult
                .file_name
            }
          </div>

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
                aiAnalyzing
                ||
                profileResult
                  .total_findings
                === 0
              }
              style={{
                ...primaryButtonStyle,
                opacity:
                  aiAnalyzing
                  ||
                  profileResult
                    .total_findings
                  === 0
                    ? 0.6
                    : 1,
                cursor:
                  aiAnalyzing
                  ||
                  profileResult
                    .total_findings
                  === 0
                    ? "not-allowed"
                    : "pointer",
              }}
            >
              {aiAnalyzing
                ? "Analyzing with AI..."
                : "Analyze with AI"}
            </button>
          </div>
        </div>
      )}

      {/* -------------------------------- */}
      {/* AI Result                        */}
      {/* -------------------------------- */}

      {aiAnalysis && (
        <div style={cardStyle}>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "flex-start",
              gap: 20,
              marginBottom: 18,
              maxWidth: 1050,
            }}
          >
            <SectionTitle
              title="AI Data Quality Analysis"
              description={
                "AI recommendations generated from the persisted CSV profile."
              }
            />

            <button
              type="button"
              onClick={() => {
                setAiAnalysis(null);
                setSuccessMessage(null);
                setExpandedRecommendationIds(new Set());
                setRemediationByRecommendationId({});
                setRemediationLoadingIds(new Set());
                setRemediationFeedbackByRecommendationId({});
              }}
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
              gridTemplateColumns: "220px minmax(360px, 520px)",
              gap: 12,
              width: "fit-content",
              maxWidth: "100%",
            }}
            >
            <MetricCard
              label="Recommendations"
              value={
                aiAnalysis
                  .recommendation_count
              }
            />

            <MetricCard
              label="Profile Run"
              value={
                profileResult
                  ?.profile_run_id
                ?? "—"
              }
            />
          </div>

          {aiAnalysis.overall_analysis && (
            <div
              style={{
                marginTop: 18,
                padding: 16,
                borderRadius: 12,
                border: "1px solid #e2e8f0",
                background: "#f8fafc",
                maxWidth: 1050,
                boxSizing: "border-box",
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
              {aiAnalysis
                .recommendations
                .map(
                  (
                    recommendation,
                    index,
                  ) => {
                    const recommendationId =
                      recommendation.recommendation_id ??
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

                    const feedbackSubmitted =
                      Boolean(remediationFeedback);

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

                    const remediationWorkflowStatus =
                      changesRequested
                        ? "CHANGES_REQUESTED"
                        : remediationApproved
                          ? "APPROVED"
                          : remediationRejected
                            ? "REJECTED"
                            : "PENDING_REVIEW";

                  return (
                    <div
                      key={
                        recommendation
                          .recommendation_id
                        ?? index
                      }
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
                          style={secondaryButtonStyle}
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
                              "AUTO",
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

                        <button
                          type="button"
                          onClick={() => {
                            void handleGenerateRemediation(
                              recommendationId,
                              "SQL",
                            );
                          }}
                          disabled={remediationLoading}
                          style={{
                            ...secondaryButtonStyle,
                            border:
                              "1px solid #2563eb",
                            color: "#1d4ed8",
                            background: "#eff6ff",
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
                            ? "Generating..."
                            : changesRequested
                              ? "Regenerate as SQL"
                              : "Generate SQL Remediation"}
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
                          {!remediationApproved && (
                            <div
                              style={{
                                display: "flex",
                                gap: 8,
                                flexWrap: "wrap",
                                alignItems: "center",
                              }}
                            >
                              <strong>
                                <b>
                                  Generated Remediation
                                  {remediation.version_number
                                    ? ` — Version ${remediation.version_number}`
                                    : ""}
                                </b>
                              </strong>

                              <span>
                                {remediation.artifact_type}
                              </span>

                              <span>
                                {remediation.safety_status}
                              </span>
                            </div>
                          )}

                          {remediationApproved && (
                            <div
                              style={{
                                padding: 14,
                                borderRadius: 12,
                                border: "1px solid #bbf7d0",
                                background: "#f0fdf4",
                                display: "grid",
                                gap: 8,
                              }}
                            >
                              <div
                                style={{
                                  display: "flex",
                                  alignItems: "center",
                                  justifyContent: "space-between",
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
                                <b>Final Decision:</b> APPROVED
                              </div>
                            </div>
                          )}

                          {!remediationApproved && remediation.reasoning_summary && (
                            <div
                              style={{
                                fontSize: 13,
                                color: "#475569",
                                lineHeight: 1.55,
                              }}
                            >
                              <b>Why this remediation:</b>{" "}
                              {
                                remediation
                                  .reasoning_summary
                              }
                            </div>
                          )}

                          {!remediationApproved && remediation.remediation_sql && (
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

                          {!remediationApproved && remediation.remediation_regex && (
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

                          <div
                            style={{
                            padding: 16,
                            border: "1px solid #e2e8f0",
                            borderRadius: 14,
                            background: "#f8fafc",
                            minWidth: 280,
                          }}
                          >

                            <button
                              type="button"
                              onClick={() => {
                                void handleLoadRemediationVersions(
                                  recommendationId,
                                );
                              }}
                              disabled={remediationVersionsLoading}
                              style={secondaryButtonStyle}
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
            marginTop: 14,
            display: "grid",
            gap: 12,
          }}
        >
          {remediationVersions.length === 0 ? (
            <div
              style={{
                padding: 12,
                border: "1px solid #e2e8f0",
                borderRadius: 10,
                background: "#f8fafc",
                fontSize: 13,
                color: "#64748b",
              }}
            >
              No remediation versions found.
            </div>
          ) : (
            remediationVersions.map((version, index) => (
              <div
                key={version.remediation_version_id}
                style={{
                  padding: 14,
                  border: "1px solid #e2e8f0",
                  borderRadius: 12,
                  background: "#ffffff",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    gap: 12,
                    flexWrap: "wrap",
                    marginBottom: 10,
                  }}
                >
                  <div
                    style={{
                      fontWeight: 800,
                      fontSize: 14,
                    }}
                  >
                    Version {version.version_number}

                  {index === 0 && (
                    <span
                      style={{
                        marginLeft: 8,
                        padding: "3px 8px",
                        borderRadius: 999,
                        fontSize: 11,
                        fontWeight: 800,
                        border: "1px solid #cbd5e1",
                        background: "#f8fafc",
                      }}
                    >
                      CURRENT
                    </span>
                  )}
                  </div>

                  <div
                    style={{
                      fontSize: 12,
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
                    fontSize: 12,
                    lineHeight: 1.6,
                    color: "#334155",
                  }}
                >
                  <div>
                    <b>Artifact:</b>{" "}
                    {version.artifact_type ?? "—"}
                  </div>

                  <div>
                    <b>Safety:</b>{" "}
                    {version.safety_status ?? "—"}
                  </div>

                  <div>
                    <b>Provider:</b>{" "}
                    {version.ai_provider ?? "—"}
                  </div>

                  <div>
                      <b>Generation Reason:</b>{" "}
                      {version.generation_reason
                        ? version.generation_reason
                            .replaceAll("_", " ")
                        : "—"}
                    </div>

                    {version.generated_from_feedback_event_id && (
                      <div>
                        <b>Feedback Event:</b>{" "}
                        {version.generated_from_feedback_event_id}
                      </div>
                    )}
                  </div>

                  {version.revision_guidance && (
                  <div
                    style={{
                      marginTop: 10,
                      padding: 10,
                      borderRadius: 8,
                      background: "#fffbeb",
                      border: "1px solid #fde68a",
                      fontSize: 12,
                      color: "#92400e",
                    }}
            >
              <b>Steward Revision Guidance:</b>

              <div style={{ marginTop: 4 }}>
                {version.revision_guidance}
              </div>
            </div>
          )}

          {version.remediation_sql && (
            <div style={{ marginTop: 10 }}>
              <div
                style={{
                  fontSize: 12,
                  fontWeight: 800,
                  marginBottom: 6,
                }}
              >
                SQL
              </div>

              <code
                style={{
                  display: "block",
                  padding: 12,
                  borderRadius: 10,
                  background: "#0f172a",
                  color: "#f8fafc",
                  fontSize: 12,
                  overflowX: "auto",
                  whiteSpace: "pre-wrap",
                }}
              >
                {version.remediation_sql}
              </code>
            </div>
          )}

          {version.remediation_regex && (
            <div style={{ marginTop: 10 }}>
              <div
                style={{
                  fontSize: 12,
                  fontWeight: 800,
                  marginBottom: 6,
                }}
              >
                Regex
              </div>

              <code
                style={{
                  display: "block",
                  padding: 10,
                  borderRadius: 8,
                  background: "#f8fafc",
                  border: "1px solid #e2e8f0",
                  fontSize: 12,
                  overflowX: "auto",
                }}
              >
                {version.remediation_regex}
              </code>
            </div>
          )}

          {version.reasoning_summary && (
            <div
              style={{
                marginTop: 10,
                fontSize: 12,
                lineHeight: 1.6,
                color: "#475569",
              }}
            >
              <b>Reasoning:</b>{" "}
              {version.reasoning_summary}
            </div>
          )}
        </div>
            ))
          )}
        </div>
      )}
                          {!remediationApproved && (
                            <div
                              style={{
                                marginTop: 14,
                                padding: 12,
                                border: "1px solid #dbe4ee",
                                borderRadius: 12,
                                background: "#ffffff",
                              }}
                            >
                              <div
                                style={{
                                  display: "flex",
                                  alignItems: "center",
                                  justifyContent: "space-between",
                                  gap: 10,
                                  flexWrap: "wrap",
                                }}
                              >
                                <div
                                  style={{
                                    fontSize: 13,
                                    fontWeight: 800,
                                    color: "#0f172a",
                                  }}
                                >
                                  Remediation Workflow
                              </div>

                              <div
                                style={{
                                  fontSize: 11,
                                  fontWeight: 800,
                                  color:
                                    remediationWorkflowStatus === "APPROVED"
                                      ? "#166534"
                                      : remediationWorkflowStatus === "REJECTED"
                                        ? "#b91c1c"
                                        : remediationWorkflowStatus === "CHANGES_REQUESTED"
                                          ? "#92400e"
                                          : "#475569",
                                }}
                              >
                                {remediationWorkflowStatus.replaceAll("_", " ")}
                              </div>
                            </div>

                            <div
                              style={{
                                marginTop: 10,
                                display: "flex",
                                alignItems: "center",
                                gap: 8,
                                flexWrap: "wrap",
                                fontSize: 12,
                                color: "#475569",
                              }}
                            >
                              <span style={{ fontWeight: 700 }}>✓ Generated</span>
                              <span>→</span>

                              <span
                                style={{
                                  fontWeight:
                                    remediationWorkflowStatus === "PENDING_REVIEW"
                                      ? 800
                                      : 700,
                                }}
                              >
                                {remediationWorkflowStatus === "PENDING_REVIEW"
                                  ? "Steward Review — Current"
                                  : "✓ Steward Review"}
                              </span>

                              <span>→</span>

                              <span
                                style={{
                                  fontWeight:
                                    remediationWorkflowStatus === "CHANGES_REQUESTED"
                                      ? 800
                                      : 600,
                                  color:
                                    remediationWorkflowStatus === "CHANGES_REQUESTED"
                                      ? "#92400e"
                                      : "#64748b",
                                }}
                              >
                                {remediationWorkflowStatus === "CHANGES_REQUESTED"
                                  ? "Revise with Feedback — Current"
                                  : "Revise if Needed"}
                              </span>

                              <span>→</span>

                              <span
                                style={{
                                  fontWeight:
                                    remediationWorkflowStatus === "APPROVED"
                                    || remediationWorkflowStatus === "REJECTED"
                                      ? 800
                                      : 600,
                                  color:
                                    remediationWorkflowStatus === "APPROVED"
                                      ? "#166534"
                                      : remediationWorkflowStatus === "REJECTED"
                                        ? "#b91c1c"
                                        : "#64748b",
                                }}
                              >
                                {remediationWorkflowStatus === "APPROVED"
                                  ? "✓ Final Approval"
                                  : remediationWorkflowStatus === "REJECTED"
                                    ? "Final Decision — Rejected"
                                    : "Final Decision"}
                              </span>
                            </div>
                          </div>
                          )}
                        </div>

                          {!remediationApproved && remediation.artifact_type
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

                          {!remediationApproved && remediationFeedback && (
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
                              {remediationFeedback.approval_status}
                              {" • "}
                              <b>By:</b>{" "}
                              {remediationFeedback.steward_user}
                              {remediationFeedback.note && (
                                <>
                                  {" • "}
                                  <b>Note:</b>{" "}
                                  {remediationFeedback.note}
                                </>
                              )}
                            </div>
                          )}
                          {changesRequested && (
                            <div
                              style={{
                                padding: 12,
                                borderRadius: 10,
                                border: "1px solid #fbbf24",
                                background: "#fffbeb",
                                color: "#92400e",
                                fontSize: 13,
                                lineHeight: 1.5,
                              }}
                            >
                              <b>Changes Requested</b>
                              <div style={{ marginTop: 4 }}>
                                Your feedback has been saved.
                                Regenerate the remediation to apply
                                your steward instructions.
                              </div>
                            </div>
                          )}

                          {!remediationApproved && !remediationRejected && (
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
                                feedbackSubmitted
                                || remediation.safety_status
                                  === "BLOCKED"
                              }
                              style={{
                                ...primaryButtonStyle,
                                opacity:
                                  feedbackSubmitted
                                  || remediation.safety_status
                                    === "BLOCKED"
                                    ? 0.5
                                    : 1,
                                cursor:
                                  feedbackSubmitted
                                  || remediation.safety_status
                                    === "BLOCKED"
                                    ? "not-allowed"
                                    : "pointer",
                              }}
                            >
                              Approve Remediation
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
                                opacity: feedbackSubmitted ? 0.5 : 1,
                                cursor: feedbackSubmitted
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
                                opacity: feedbackSubmitted ? 0.5 : 1,
                                cursor: feedbackSubmitted
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
  );
}
