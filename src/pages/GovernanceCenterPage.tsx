import { useEffect, useState } from "react";
const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL ??
  "http://127.0.0.1:8000";
;

type GovernancePolicyForm = {
  policy_name: string;
  policy_description: string;
  domain: string;
  policy_version: string;
  default_decision_mode: string;
  review_required_flag: boolean;
  allow_auto_merge_flag: boolean;
  active_flag: "Y" | "N";
  effective_from: string;
};

const initialForm: GovernancePolicyForm = {
  policy_name: "",
  policy_description: "",
  domain: "",
  policy_version: "1.0",
  default_decision_mode: "STEWARD_REVIEW",
  review_required_flag: true,
  allow_auto_merge_flag: false,
  active_flag: "Y",
  effective_from: new Date().toISOString().slice(0, 10),
};

type EnabledDomainsResponse = {
  enabled_domains: string[];
};

type GovernanceCenterPageProps = {
  organizationId: string | null;
  organizationName: string | null;
};

type GovernanceAIRecommendation = {
  headline?: string;
  summary?: string;
  priority?: string;
  recommended_actions?: string[];
  supporting_evidence?: string[];
  confidence?: number | null;
};

type GovernanceKPI = {
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

type GovernanceDatasetStatus = {
  organization_id?: string;
  dataset_name?: string;
  domain?: string;
  certification_readiness_score?: number | null;
  fair_overall_score?: number | null;
  failed_checks?: number;
  ai_recommendation?: GovernanceAIRecommendation | null;
};

type GovernanceOverview = {
  organization_id: string;
  kpis: GovernanceKPI;
  dataset_statuses: GovernanceDatasetStatus[];
  top_blockers: Array<{
    blocker_reason?: string;
    blocker_count?: number;
  }>;
  policy_activity: unknown[];
};

export default function GovernanceCenterPage({
  organizationId,
  organizationName,
}: GovernanceCenterPageProps) {
  const [form, setForm] =
    useState<GovernancePolicyForm>(initialForm);

  const [submitting, setSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] =
    useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [governanceOverview, setGovernanceOverview] =
    useState<GovernanceOverview | null>(null);
  const [governanceLoading, setGovernanceLoading] =
    useState(true);
  const [governanceError, setGovernanceError] =
    useState<string | null>(null);

  const isGovernanceEmptyState =
      governanceError
        ?.toLowerCase()
        .includes("no governance kpi data found") ?? false;
  const hasExistingPolicies =
    (governanceOverview?.kpis.active_policies ?? 0) > 0;

  const [enabledDomains, setEnabledDomains] =
    useState<string[]>([]);

  const latestAIRecommendation =
    governanceOverview?.dataset_statuses
      .map((row) => row.ai_recommendation)
      .find(
        (
          recommendation,
        ): recommendation is GovernanceAIRecommendation =>
          Boolean(recommendation),
      ) ?? null;

  async function loadEnabledDomains(): Promise<void> {
    try {
      const token = localStorage.getItem("token");

      const response = await fetch(
        `${API_BASE_URL}/v1/entitlements/domains`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      );

      if (!response.ok) {
        throw new Error(
          `Failed to load enabled domains: ${response.status}`,
        );
      }

    const data =
      (await response.json()) as EnabledDomainsResponse;

    const normalizedDomains = (
      data.enabled_domains ?? []
    )
      .map((domain) => domain.trim().toUpperCase())
      .filter(Boolean);

    setEnabledDomains(normalizedDomains);

    if (
      normalizedDomains.length > 0 &&
      !normalizedDomains.includes(
        form.domain.trim().toUpperCase(),
      )
    ) {
      setForm((current) => ({
        ...current,
        domain: normalizedDomains[0],
      }));
    }
  } catch (err) {
    console.error(
      "Failed to load domain entitlements:",
      err,
    );
  }
}

  async function loadGovernanceOverview(): Promise<void> {
    try {
      setGovernanceLoading(true);
      setGovernanceError(null);

      const token = localStorage.getItem("token");

      if (!token) {
        throw new Error(
          "Your session has expired. Please sign in again.",
        );
      }

      const response = await fetch(
        `${API_BASE_URL}/v1/metrics/governance-overview?days=30`,
        {
          method: "GET",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      );

      const body = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(
          typeof body?.detail === "string"
            ? body.detail
            : "Unable to load governance intelligence.",
        );
      }

      const overview = body as GovernanceOverview;

      /*
       * Defense in depth:
       * The API determines organization_id from the JWT.
       * React does not choose the tenant.
       */
      if (
        organizationId &&
        overview.organization_id !== organizationId
      ) {
        throw new Error(
          "Governance data does not match the authenticated workspace.",
        );
      }

      setGovernanceOverview(overview);
    } catch (loadError) {
      setGovernanceError(
        loadError instanceof Error
          ? loadError.message
          : "Unable to load governance intelligence.",
      );
    } finally {
      setGovernanceLoading(false);
    }
  }

  useEffect(() => {
      if (!organizationId) {
        setGovernanceLoading(false);
        return;
      }

    void loadGovernanceOverview();
    void loadEnabledDomains();
}, [organizationId]);

  function updateField<K extends keyof GovernancePolicyForm>(
    field: K,
    value: GovernancePolicyForm[K],
  ): void {
    setForm((current) => ({
      ...current,
      [field]: value,
    }));
  }

  async function submitPolicy(): Promise<void> {
    try {
      setSubmitting(true);
      setError(null);
      setSuccessMessage(null);

      if (!form.policy_name.trim()) {
        throw new Error("Policy name is required.");
      }

      const token = localStorage.getItem("token");

      if (!token) {
        throw new Error(
          "Your session has expired. Please sign in again.",
        );
      }

      const shouldPublish = form.active_flag === "Y";

      const response = await fetch(
        `${API_BASE_URL}/v1/policy/config/draft`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            domain: form.domain,
            policy_version: form.policy_version,

            // Let the backend generate these when possible.
            policy_id: crypto.randomUUID(),
            threshold_id: crypto.randomUUID(),

            policy_name: form.policy_name.trim(),
            policy_description:
              form.policy_description.trim(),

            default_decision_mode:
              form.default_decision_mode,

            review_required_flag:
              form.review_required_flag ? "Y" : "N",

            allow_auto_merge_flag:
              form.allow_auto_merge_flag ? "Y" : "N",

            // Drafts are always stored inactive. If the user
            // selected "Policy is active", publish immediately
            // after the draft save succeeds.
            active_flag: "N",

            // Starter-policy defaults.
            min_review_score: 0.7,
            min_approve_merge_score: 0.85,
            min_auto_merge_score: 0.92,
            max_auto_merge_override_rate: 0.05,
            max_review_override_rate: 0.15,
            high_risk_score_cutoff: 0.7,
            medium_risk_score_cutoff: 0.4,

            require_exact_dob_flag:
              form.domain === "PATIENT" ? "Y" : "N",
            require_email_or_address_flag: "Y",
            require_manual_review_on_conflict_flag: "Y",

            effective_from: form.effective_from
              ? `${form.effective_from}T00:00:00Z`
              : new Date().toISOString(),
            effective_to: null,
          }),
        },
      );

      const body = await response.json().catch(() => null);

      if (!response.ok) {
        const detail = body?.detail;

        if (Array.isArray(detail)) {
          const validationMessage = detail
            .map((item: unknown) => {
              if (
                typeof item === "object" &&
                item !== null &&
                "msg" in item
              ) {
                const validationItem = item as {
                  loc?: Array<string | number>;
                  msg?: string;
                };

                const location =
                  validationItem.loc?.slice(1).join(".") ??
                  "request";

                return `${location}: ${
                  validationItem.msg ?? "Invalid value"
                }`;
              }

              return String(item);
            })
            .join("\n");

          throw new Error(validationMessage);
        }

        throw new Error(
          typeof detail === "string"
            ? detail
            : "Unable to create the governance policy.",
        );
      }

      if (shouldPublish) {
        const publishResponse = await fetch(
          `${API_BASE_URL}/v1/policy/config/publish`,
          {
            method: "POST",
            headers: {
              Authorization: `Bearer ${token}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              domain: form.domain,
              policy_version: form.policy_version,
            }),
          },
        );

        const publishBody = await publishResponse
          .json()
          .catch(() => null);

        if (!publishResponse.ok) {
          throw new Error(
            typeof publishBody?.detail === "string"
              ? publishBody.detail
              : "Policy draft was saved, but publishing failed.",
          );
        }
      }

      setSuccessMessage(
        shouldPublish
          ? "Governance policy created and published successfully."
          : "Governance policy draft saved successfully.",
      );

      setForm(initialForm);
      await loadGovernanceOverview();
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : "Unable to create the governance policy.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div
      style={{
        minHeight: "100%",
        padding: "34px 28px 50px",
        background: "#f4f7fb",
      }}
    >
      <div
        style={{
          maxWidth: 1180,
          margin: "0 auto",
        }}
      >
        <section
          style={{
            padding: 34,
            borderRadius: 22,
            border: "1px solid #dbe4f0",
            background: "#ffffff",
            boxShadow:
              "0 12px 35px rgba(15, 23, 42, 0.06)",
          }}
        >
          <div
            style={{
              color: "#2563eb",
              fontSize: 13,
              fontWeight: 900,
              letterSpacing: "0.08em",
              textTransform: "uppercase",
            }}
          >
            AI Governance
          </div>

          <h1
            style={{
              margin: "8px 0 10px",
              color: "#173c72",
              fontSize: 36,
            }}
          >
            Governance Center
          </h1>

          <p
            style={{
              maxWidth: 820,
              margin: 0,
              color: "#64748b",
              fontSize: 16,
              lineHeight: 1.7,
            }}
          >
            Create and manage the policies that control
            entity resolution, automation, stewardship,
            and governance intelligence.
          </p>
        </section>

        <section
  style={{
    marginTop: 24,
    padding: 30,
    borderRadius: 22,
    border: "1px solid #dbe4f0",
    background: "#ffffff",
    boxShadow:
      "0 12px 35px rgba(15, 23, 42, 0.06)",
  }}
>
  <div
    style={{
      display: "flex",
      justifyContent: "space-between",
      alignItems: "flex-start",
      gap: 20,
      flexWrap: "wrap",
    }}
  >
    <div>
      <div
        style={{
          color: "#2563eb",
          fontSize: 12,
          fontWeight: 900,
          letterSpacing: "0.08em",
          textTransform: "uppercase",
        }}
      >
        Governance Intelligence
      </div>

      <h2
        style={{
          margin: "7px 0 5px",
          color: "#173c72",
          fontSize: 27,
        }}
      >
        Governance Command Center
      </h2>

      <div
        style={{
          color: "#64748b",
          fontSize: 14,
        }}
      >
        Current governance posture for the authenticated
        enterprise workspace.
      </div>
    </div>

    {organizationName && (
      <div
        title={organizationId ?? undefined}
        style={{
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
        🏢 {organizationName}
      </div>
    )}
  </div>

  {governanceLoading ? (
    <div
      style={{
        marginTop: 24,
        color: "#64748b",
        fontWeight: 700,
      }}
    >
      Loading governance intelligence...
    </div>
  ) : governanceError && !isGovernanceEmptyState ? (
    <div
      role="alert"
      style={{
        marginTop: 24,
        padding: "13px 15px",
        borderRadius: 11,
        border: "1px solid #fecaca",
        background: "#fef2f2",
        color: "#b91c1c",
        fontWeight: 700,
      }}
    >
      {governanceError}
    </div>
  ) : governanceOverview ? (
    <>
      <div
        style={{
          display: "grid",
          gridTemplateColumns:
            "repeat(auto-fit, minmax(155px, 1fr))",
          gap: 14,
          marginTop: 26,
        }}
      >
        <GovernanceMetricCard
          label="Active Policies"
          value={governanceOverview.kpis.active_policies}
        />

        <GovernanceMetricCard
          label="Governed Datasets"
          value={governanceOverview.kpis.total_datasets}
        />

        <GovernanceMetricCard
          label="Certified"
          value={
            governanceOverview.kpis.certified_datasets
          }
        />

        <GovernanceMetricCard
          label="Ready for Certification"
          value={
            governanceOverview.kpis.ready_for_certification
          }
        />

        <GovernanceMetricCard
          label="Open Issues"
          value={
            governanceOverview.kpis.open_governance_issues
          }
        />

        <GovernanceMetricCard
          label="Average FAIR Score"
          value={Number(
            governanceOverview.kpis.avg_fair_score ?? 0,
          ).toFixed(1)}
        />
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns:
            "repeat(auto-fit, minmax(260px, 1fr))",
          gap: 14,
          marginTop: 14,
        }}
      >
        <div
          style={{
            padding: 18,
            borderRadius: 16,
            border: "1px solid #bbf7d0",
            background: "#f0fdf4",
          }}
        >
          <div
            style={{
              color: "#64748b",
              fontSize: 11,
              fontWeight: 900,
              textTransform: "uppercase",
              letterSpacing: "0.06em",
            }}
          >
            Governance Health
          </div>

          <div
            style={{
              marginTop: 8,
              color: "#166534",
              fontSize: 22,
              fontWeight: 900,
            }}
          >
            {governanceOverview.kpis.open_governance_issues ===
              0 &&
            governanceOverview.kpis.active_policies > 0
              ? "HEALTHY"
              : governanceOverview.kpis.active_policies > 0
                ? "NEEDS ATTENTION"
                : "NOT CONFIGURED"}
          </div>
        </div>

        <div
          style={{
            padding: 18,
            borderRadius: 16,
            border: "1px solid #dbeafe",
            background: "#f8fbff",
          }}
        >
          <div
            style={{
              color: "#64748b",
              fontSize: 11,
              fontWeight: 900,
              textTransform: "uppercase",
              letterSpacing: "0.06em",
            }}
          >
            Policy Activity
          </div>

          <div
            style={{
              marginTop: 8,
              color: "#173c72",
              fontSize: 22,
              fontWeight: 900,
            }}
          >
            {governanceOverview.kpis.recent_policy_changes_30d}{" "}
              {governanceOverview.kpis.recent_policy_changes_30d === 1
                ? "change"
                : "changes"}
                        </div>

          <div
            style={{
              marginTop: 4,
              color: "#64748b",
              fontSize: 13,
            }}
          >
            during the last 30 days
          </div>
        </div>
      </div>

      <div
        style={{
          marginTop: 18,
          padding: 20,
          borderRadius: 18,
          border: "1px solid #ddd6fe",
          background:
            "linear-gradient(135deg, #faf5ff, #f8fbff)",
        }}
      >
        <div
          style={{
            color: "#7c3aed",
            fontSize: 11,
            fontWeight: 900,
            textTransform: "uppercase",
            letterSpacing: "0.07em",
          }}
        >
          ✦ AI Governance Recommendation
        </div>

        <div
          style={{
            marginTop: 8,
            color: "#173c72",
            fontSize: 19,
            fontWeight: 900,
          }}
        >
          {latestAIRecommendation?.headline ??
            "Continue governance monitoring"}
        </div>

        <div
          style={{
            marginTop: 7,
            color: "#64748b",
            fontSize: 14,
            lineHeight: 1.6,
          }}
        >
          {latestAIRecommendation?.summary ??
            "No material governance blocker is currently present in the available governance evidence."}
        </div>

        <div
          style={{
            display: "flex",
            gap: 10,
            flexWrap: "wrap",
            marginTop: 14,
          }}
        >
          <span
            style={{
              padding: "6px 10px",
              borderRadius: 999,
              background: "#ffffff",
              border: "1px solid #e2e8f0",
              color: "#475569",
              fontSize: 12,
              fontWeight: 800,
            }}
          >
            Priority:{" "}
            {latestAIRecommendation?.priority ?? "LOW"}
          </span>

          {latestAIRecommendation?.confidence != null && (
            <span
              style={{
                padding: "6px 10px",
                borderRadius: 999,
                background: "#ffffff",
                border: "1px solid #e2e8f0",
                color: "#475569",
                fontSize: 12,
                fontWeight: 800,
              }}
            >
              Confidence:{" "}
              {Math.round(
                latestAIRecommendation.confidence * 100,
              )}
              %
            </span>
          )}
        </div>

        {latestAIRecommendation?.recommended_actions?.[0] && (
          <div
            style={{
              marginTop: 14,
              color: "#173c72",
              fontSize: 13,
              fontWeight: 700,
            }}
          >
            Recommended action:{" "}
            {
              latestAIRecommendation
                .recommended_actions[0]
            }
          </div>
        )}
      </div>
    </>
  ) : null}
</section>

        <section
          style={{
            marginTop: 24,
            padding: 30,
            borderRadius: 22,
            border: "1px solid #dbe4f0",
            background: "#ffffff",
            boxShadow:
              "0 12px 35px rgba(15, 23, 42, 0.06)",
          }}
        >
          <h2
            style={{
              margin: "0 0 6px",
              color: "#173c72",
              fontSize: 25,
            }}
          >
            {hasExistingPolicies
            ? "Create another governance policy"
            : "Create your first governance policy"}
          </h2>

          <p
            style={{
              margin: "0 0 26px",
              color: "#64748b",
              lineHeight: 1.6,
            }}
          >
            Define how AI Data Steward Copilot should
            evaluate records and route decisions.
          </p>

          <div
            style={{
              display: "grid",
              gridTemplateColumns:
                "repeat(auto-fit, minmax(260px, 1fr))",
              gap: 18,
            }}
          >
            <FormField label="Policy Name">
              <input
                value={form.policy_name}
                onChange={(event) =>
                  updateField(
                    "policy_name",
                    event.target.value,
                  )
                }
                placeholder="Provider Match Governance Policy"
                style={inputStyle}
              />
            </FormField>

            <FormField label="Domain">
                  <select
                    value={form.domain}
                    onChange={(event) =>
                      updateField(
                        "domain",
                        event.target.value,
                      )
                    }
                    style={inputStyle}
                  >
                    {[
                      ["PROVIDER", "Provider"],
                      ["PATIENT", "Patient"],
                      ["PRODUCT", "Product"],
                      ["SUPPLIER", "Supplier"],
                      ["BANKING", "Banking"],
                      ["CUSTOMER", "Customer"],
                    ].map(([value, label]) => {
                      const enabled =
                        enabledDomains.includes(value);

                      return (
                        <option
                          key={value}
                          value={value}
                          disabled={!enabled}
                        >
                          {enabled
                            ? `${label} ✓ Enabled`
                            : `${label} 🔒 Not included`}
                        </option>
                      );
                    })}
  </select>
</FormField>

            <FormField label="Policy Version">
              <input
                value={form.policy_version}
                onChange={(event) =>
                  updateField(
                    "policy_version",
                    event.target.value,
                  )
                }
                placeholder="1.0"
                style={inputStyle}
              />
            </FormField>

            <FormField label="Effective From">
              <input
                type="date"
                value={form.effective_from}
                onChange={(event) =>
                  updateField(
                    "effective_from",
                    event.target.value,
                  )
                }
                style={inputStyle}
              />
            </FormField>
          </div>

          <FormField
            label="Policy Description"
            fullWidth
          >
            <textarea
              value={form.policy_description}
              onChange={(event) =>
                updateField(
                  "policy_description",
                  event.target.value,
                )
              }
              placeholder="Describe the governance intent, review requirements, and automation boundaries."
              rows={4}
              style={{
                ...inputStyle,
                resize: "vertical",
              }}
            />
          </FormField>

          <div
            style={{
              display: "grid",
              gridTemplateColumns:
                "repeat(auto-fit, minmax(280px, 1fr))",
              gap: 18,
              marginTop: 18,
            }}
          >
            <FormField label="Default Decision Mode">
              <select
                value={form.default_decision_mode}
                onChange={(event) =>
                  updateField(
                    "default_decision_mode",
                    event.target.value,
                  )
                }
                style={inputStyle}
              >
                <option value="STEWARD_REVIEW">
                  Steward Review
                </option>
                <option value="AUTO_MERGE">
                  Auto Merge
                </option>
                <option value="BLOCK_MERGE">
                  Block Merge
                </option>
              </select>
            </FormField>

            <div
              style={{
                display: "grid",
                gap: 12,
                alignContent: "end",
              }}
            >
              <CheckboxField
                label="Require steward review"
                checked={form.review_required_flag}
                onChange={(checked) =>
                  updateField(
                    "review_required_flag",
                    checked,
                  )
                }
              />

              <CheckboxField
                label="Allow auto merge"
                checked={form.allow_auto_merge_flag}
                onChange={(checked) =>
                  updateField(
                    "allow_auto_merge_flag",
                    checked,
                  )
                }
              />

              <CheckboxField
                label="Policy is active"
                checked={form.active_flag === "Y"}
                onChange={(checked) =>
                  updateField(
                    "active_flag",
                    checked ? "Y" : "N",
                  )
                }
              />
            </div>
          </div>

          {error && (
            <div
              role="alert"
              style={{
                marginTop: 22,
                padding: "13px 15px",
                borderRadius: 11,
                border: "1px solid #fecaca",
                background: "#fef2f2",
                color: "#b91c1c",
                fontWeight: 700,
              }}
            >
              {error}
            </div>
          )}

          {successMessage && (
            <div
              role="status"
              style={{
                marginTop: 22,
                padding: "13px 15px",
                borderRadius: 11,
                border: "1px solid #bbf7d0",
                background: "#f0fdf4",
                color: "#166534",
                fontWeight: 700,
              }}
            >
              ✓ {successMessage}
            </div>
          )}

          <button
            type="button"
            onClick={() => {
              void submitPolicy();
            }}
            disabled={submitting}
            style={{
              marginTop: 24,
              padding: "14px 22px",
              border: 0,
              borderRadius: 12,
              background:
                "linear-gradient(135deg, #2563eb, #1d4ed8)",
              color: "#ffffff",
              fontSize: 15,
              fontWeight: 900,
              cursor: submitting
                ? "not-allowed"
                : "pointer",
              opacity: submitting ? 0.65 : 1,
              boxShadow:
                "0 9px 22px rgba(37, 99, 235, 0.22)",
            }}
          >
            {submitting
              ? "Creating Policy..."
              : hasExistingPolicies
                ? "Create Another Governance Policy"
                : "Create Governance Policy"}
                      </button>
                    </section>
                  </div>
                </div>
  );
}

type GovernanceMetricCardProps = {
  label: string;
  value: string | number;
};

function GovernanceMetricCard({
  label,
  value,
}: GovernanceMetricCardProps) {
  return (
    <div
      style={{
        padding: 17,
        borderRadius: 15,
        border: "1px solid #e2e8f0",
        background: "#ffffff",
      }}
    >
      <div
        style={{
          color: "#64748b",
          fontSize: 10,
          fontWeight: 900,
          textTransform: "uppercase",
          letterSpacing: "0.05em",
        }}
      >
        {label}
      </div>

      <div
        style={{
          marginTop: 7,
          color: "#173c72",
          fontSize: 24,
          fontWeight: 900,
        }}
      >
        {value}
      </div>
    </div>
  );
}

type FormFieldProps = {
  label: string;
  children: React.ReactNode;
  fullWidth?: boolean;
};

function FormField({
  label,
  children,
  fullWidth = false,
}: FormFieldProps) {
  return (
    <label
      style={{
        display: "grid",
        gap: 8,
        marginTop: fullWidth ? 18 : 0,
      }}
    >
      <span
        style={{
          color: "#475569",
          fontSize: 13,
          fontWeight: 800,
        }}
      >
        {label}
      </span>

      {children}
    </label>
  );
}

type CheckboxFieldProps = {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
};

function CheckboxField({
  label,
  checked,
  onChange,
}: CheckboxFieldProps) {
  return (
    <label
      style={{
        display: "flex",
        alignItems: "center",
        gap: 10,
        color: "#173c72",
        fontWeight: 700,
        cursor: "pointer",
      }}
    >
      <input
        type="checkbox"
        checked={checked}
        onChange={(event) =>
          onChange(event.target.checked)
        }
      />

      {label}
    </label>
  );
}

const inputStyle = {
  width: "100%",
  boxSizing: "border-box",
  padding: "12px 13px",
  borderRadius: 10,
  border: "1px solid #cbd5e1",
  background: "#ffffff",
  color: "#173c72",
  fontSize: 14,
  outline: "none",
} as const;
