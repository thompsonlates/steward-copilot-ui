import { useState } from "react";

import {
  createOrganizationOnboarding,
} from "../api/client";

import type {
  OrganizationOnboardingRequest,
  OrganizationOnboardingResponse,
} from "../api/types";

type OnboardingStep =
  | "WELCOME"
  | "ORGANIZATION"
  | "SUCCESS";

type WelcomeOnboardingPageProps = {
  onComplete: (
    result: OrganizationOnboardingResponse,
  ) => void;
};

const industries = [
  "Healthcare",
  "Financial Services",
  "Retail",
  "Manufacturing",
  "Technology",
  "Government",
  "Insurance",
  "Education",
  "Other",
];

const companySizes = [
  "1-10",
  "11-50",
  "51-200",
  "201-500",
  "501-1,000",
  "1,001-5,000",
  "5,001+",
];

const inputStyle: React.CSSProperties = {
  width: "100%",
  height: 48,
  padding: "0 14px",
  borderRadius: 10,
  border: "1px solid #cbd5e1",
  background: "#ffffff",
  color: "#172033",
  fontSize: 15,
  boxSizing: "border-box",
  outline: "none",
};

const labelStyle: React.CSSProperties = {
  display: "block",
  marginBottom: 7,
  color: "#475569",
  fontSize: 13,
  fontWeight: 800,
};

const primaryButtonStyle: React.CSSProperties = {
  border: "none",
  borderRadius: 11,
  padding: "14px 22px",
  background: "#1d4ed8",
  color: "#ffffff",
  fontSize: 15,
  fontWeight: 850,
  cursor: "pointer",
};

const secondaryButtonStyle: React.CSSProperties = {
  border: "1px solid #cbd5e1",
  borderRadius: 11,
  padding: "13px 20px",
  background: "#ffffff",
  color: "#334155",
  fontSize: 15,
  fontWeight: 800,
  cursor: "pointer",
};

function WelcomeOnboardingPage({
  onComplete,
}: WelcomeOnboardingPageProps) {
  const [step, setStep] =
    useState<OnboardingStep>("WELCOME");

  const [formValues, setFormValues] =
    useState<OrganizationOnboardingRequest>({
      organization_name: "",
      company_domain: "",
      industry: "",
      company_size: "",
      country: "United States",
      timezone: "America/New_York",
      enabled_domains: [],
    });

  const [result, setResult] =
    useState<OrganizationOnboardingResponse | null>(
      null,
    );

  const [submitting, setSubmitting] =
    useState(false);

  const [error, setError] =
    useState<string | null>(null);


  const formComplete =
  Boolean(formValues.organization_name?.trim()) &&
  Boolean(formValues.industry?.trim()) &&
  Boolean(formValues.company_size?.trim()) &&
  Boolean(formValues.country?.trim()) &&
  Boolean(formValues.timezone?.trim()) &&
  formValues.enabled_domains.length === 1;

  function updateField(
    field: keyof OrganizationOnboardingRequest,
    value: string,
  ): void {
    setFormValues((current) => ({
      ...current,
      [field]: value,
    }));
  }

  async function submitOrganization(): Promise<void> {
    if (!formComplete || submitting) {
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const created =
        await createOrganizationOnboarding({
          organization_name:
            formValues.organization_name.trim(),

          company_domain:
            formValues.company_domain?.trim() ||
            null,

          industry:
            formValues.industry?.trim() ||
            null,

          enabled_domains: formValues.enabled_domains,

          company_size:
            formValues.company_size?.trim() ||
            null,

          

          country:
            formValues.country?.trim() ||
            null,

          timezone:
            formValues.timezone?.trim() ||
            "America/New_York",
        });

      setResult(created);
      setStep("SUCCESS");
    } catch (caughtError) {
      const message =
        caughtError instanceof Error
          ? caughtError.message
          : "Unable to create your organization workspace.";

      setError(message);
    } finally {
      setSubmitting(false);
    }
  }

  function continueToConnections(): void {
    if (!result) {
      return;
    }

    onComplete(result);
  }

  return (
    <div
      style={{
        minHeight: "100vh",
        background:
          "linear-gradient(135deg, #f8fbff 0%, #eef4ff 48%, #f8fafc 100%)",
        padding: 28,
        display: "grid",
        placeItems: "center",
      }}
    >
      <div
        style={{
          width: "min(980px, 100%)",
          background: "#ffffff",
          border: "1px solid #dbe5f1",
          borderRadius: 24,
          boxShadow:
            "0 24px 70px rgba(15, 23, 42, 0.14)",
          overflow: "hidden",
        }}
      >
        <header
          style={{
            padding: "25px 30px",
            borderBottom: "1px solid #e2e8f0",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            gap: 20,
          }}
        >
          <div>
            <div
              style={{
                color: "#173c72",
                fontSize: 21,
                fontWeight: 900,
              }}
            >
              AI Data Steward Copilot®
            </div>

            <div
              style={{
                marginTop: 4,
                color: "#64748b",
                fontSize: 13,
              }}
            >
              Enterprise Customer Onboarding
            </div>
          </div>

          <div
            style={{
              padding: "7px 12px",
              borderRadius: 999,
              background: "#ecfdf3",
              border: "1px solid #abefc6",
              color: "#067647",
              fontSize: 12,
              fontWeight: 850,
            }}
          >
            14-Day Enterprise Trial
          </div>
        </header>

        {step === "WELCOME" && (
          <main
            style={{
              padding: "56px 52px",
              textAlign: "center",
            }}
          >
            <div
              style={{
                width: 72,
                height: 72,
                margin: "0 auto 22px",
                borderRadius: 20,
                display: "grid",
                placeItems: "center",
                background: "#eff6ff",
                border: "1px solid #bfdbfe",
                fontSize: 34,
              }}
            >
              🎉
            </div>

            <h1
              style={{
                margin: 0,
                color: "#173c72",
                fontSize: 38,
                lineHeight: 1.18,
              }}
            >
              Welcome to AI Data Steward Copilot
            </h1>

            <p
              style={{
                maxWidth: 720,
                margin: "20px auto 0",
                color: "#64748b",
                fontSize: 17,
                lineHeight: 1.75,
              }}
            >
              Turn enterprise matching, data quality,
              and governance decisions into explainable,
              steward-ready intelligence.
            </p>

            <div
              style={{
                marginTop: 38,
                display: "grid",
                gridTemplateColumns:
                  "repeat(auto-fit, minmax(210px, 1fr))",
                gap: 18,
                textAlign: "left",
              }}
            >
              {[
                {
                  title: "Explain Match Decisions",
                  description:
                    "Understand why records matched, failed, or require steward review.",
                },
                {
                  title: "Connect Enterprise Data",
                  description:
                    "Securely onboard Databricks, Snowflake, and Google BigQuery.",
                },
                {
                  title: "Govern Steward Actions",
                  description:
                    "Capture decisions, overrides, risk, and governed audit history.",
                },
              ].map((item) => (
                <div
                  key={item.title}
                  style={{
                    padding: 22,
                    borderRadius: 16,
                    background: "#f8fafc",
                    border: "1px solid #dbe5f1",
                  }}
                >
                  <div
                    style={{
                      color: "#173c72",
                      fontSize: 16,
                      fontWeight: 850,
                    }}
                  >
                    {item.title}
                  </div>

                  <div
                    style={{
                      marginTop: 9,
                      color: "#64748b",
                      fontSize: 14,
                      lineHeight: 1.6,
                    }}
                  >
                    {item.description}
                  </div>
                </div>
              ))}
            </div>

            <button
              type="button"
              style={{
                ...primaryButtonStyle,
                marginTop: 36,
                padding: "15px 28px",
              }}
              onClick={() =>
                setStep("ORGANIZATION")
              }
            >
              Start My Enterprise Trial
            </button>

            <div
              style={{
                marginTop: 14,
                color: "#64748b",
                fontSize: 12,
              }}
            >
              No credit card required.
            </div>
          </main>
        )}

        {step === "ORGANIZATION" && (
          <main
            style={{
              padding: "38px 42px",
            }}
          >
            <div
              style={{
                marginBottom: 28,
              }}
            >
              <div
                style={{
                  color: "#2563eb",
                  fontSize: 13,
                  fontWeight: 850,
                }}
              >
                STEP 1 OF 2
              </div>

              <h1
                style={{
                  margin: "8px 0 0",
                  color: "#173c72",
                  fontSize: 30,
                }}
              >
                Create your organization workspace
              </h1>

              <p
                style={{
                  margin: "11px 0 0",
                  color: "#64748b",
                  fontSize: 15,
                  lineHeight: 1.65,
                }}
              >
                This workspace securely separates your
                users, connections, subscription, and
                governed AI activity from other customers.
              </p>
            </div>

            <div
              style={{
                display: "grid",
                gridTemplateColumns:
                  "repeat(auto-fit, minmax(280px, 1fr))",
                gap: 20,
              }}
            >
              <div>
                <label style={labelStyle}>
                  Organization Name *
                </label>

                <input
                  style={inputStyle}
                  value={
                    formValues.organization_name
                  }
                  placeholder="Advanced Data Management Solutions"
                  onChange={(event) =>
                    updateField(
                      "organization_name",
                      event.target.value,
                    )
                  }
                />
              </div>

              <div>
                <label style={labelStyle}>
                  Company Domain
                </label>

                <input
                  style={inputStyle}
                  value={
                    formValues.company_domain ?? ""
                  }
                  placeholder="admsdata.com"
                  onChange={(event) =>
                    updateField(
                      "company_domain",
                      event.target.value,
                    )
                  }
                />
              </div>

              <div>
                <label style={labelStyle}>
                  Industry *
                </label>

                <select
                  style={inputStyle}
                  value={
                    formValues.industry ?? ""
                  }
                  onChange={(event) =>
                    updateField(
                      "industry",
                      event.target.value,
                    )
                  }
                >
                  <option value="">
                    Select an industry
                  </option>

                  {industries.map((industry) => (
                    <option
                      key={industry}
                      value={industry}
                    >
                      {industry}
                    </option>
                  ))}
                </select>
              </div>
                    <div>
                <label
                  style={{
                    display: "block",
                    marginBottom: 8,
                    fontSize: 14,
                    fontWeight: 700,
                    color: "#374151",
                  }}
                >
                  Data Domain *
                </label>

                <select
                        style={inputStyle}
                        value={formValues.enabled_domains[0] ?? ""}
                        onChange={(event) => {
                          const value = event.target.value;

                          setFormValues((current) => ({
                            ...current,
                            enabled_domains: value ? [value] : [],
                          }));
                        }}
                      >
                        <option value="">Select a data domain</option>
                        <option value="CUSTOMER">Customer</option>
                        <option value="SUPPLIER">Supplier</option>
                        <option value="PRODUCT">Product</option>
                        <option value="PROVIDER">Provider</option>
                        <option value="PATIENT">Patient</option>
                        <option value="OTHER">Other</option>
              </select>
</div>
              <div>
                <label style={labelStyle}>
                  Company Size *
                </label>

                <select
                  style={inputStyle}
                  value={
                    formValues.company_size ?? ""
                  }
                  onChange={(event) =>
                    updateField(
                      "company_size",
                      event.target.value,
                    )
                  }
                >
                  <option value="">
                    Select company size
                  </option>

                  {companySizes.map((size) => (
                    <option
                      key={size}
                      value={size}
                    >
                      {size} employees
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label style={labelStyle}>
                  Country *
                </label>

                <input
                  style={inputStyle}
                  value={
                    formValues.country ?? ""
                  }
                  placeholder="United States"
                  onChange={(event) =>
                    updateField(
                      "country",
                      event.target.value,
                    )
                  }
                />
              </div>

              <div>
                <label style={labelStyle}>
                  Time Zone *
                </label>

                <select
                  style={inputStyle}
                  value={formValues.timezone}
                  onChange={(event) =>
                    updateField(
                      "timezone",
                      event.target.value,
                    )
                  }
                >
                  <option value="America/New_York">
                    Eastern Time
                  </option>
                  <option value="America/Chicago">
                    Central Time
                  </option>
                  <option value="America/Denver">
                    Mountain Time
                  </option>
                  <option value="America/Los_Angeles">
                    Pacific Time
                  </option>
                  <option value="UTC">
                    UTC
                  </option>
                </select>
              </div>
            </div>

            {error && (
              <div
                role="alert"
                style={{
                  marginTop: 22,
                  padding: 14,
                  borderRadius: 11,
                  background: "#fef2f2",
                  border: "1px solid #fecaca",
                  color: "#991b1b",
                  fontWeight: 700,
                }}
              >
                {error}
              </div>
            )}

            <div
              style={{
                marginTop: 30,
                display: "flex",
                justifyContent: "space-between",
                gap: 14,
              }}
            >
              <button
                type="button"
                style={secondaryButtonStyle}
                onClick={() =>
                  setStep("WELCOME")
                }
              >
                Back
              </button>

              <button
                type="button"
                disabled={
                  !formComplete || submitting
                }
                style={{
                  ...primaryButtonStyle,
                  opacity:
                    formComplete && !submitting
                      ? 1
                      : 0.5,
                  cursor:
                    formComplete && !submitting
                      ? "pointer"
                      : submitting
                        ? "wait"
                        : "not-allowed",
                }}
                onClick={() => {
                  void submitOrganization();
                }}
              >
                {submitting
                  ? "Creating Workspace..."
                  : "Create Organization"}
              </button>
            </div>
          </main>
        )}

        {step === "SUCCESS" && result && (
          <main
            style={{
              padding: "52px 42px",
              textAlign: "center",
            }}
          >
            <div
              style={{
                width: 78,
                height: 78,
                margin: "0 auto 20px",
                borderRadius: "50%",
                display: "grid",
                placeItems: "center",
                background: "#ecfdf3",
                border: "1px solid #abefc6",
                color: "#067647",
                fontSize: 34,
                fontWeight: 900,
              }}
            >
              ✓
            </div>

            <h1
              style={{
                margin: 0,
                color: "#173c72",
                fontSize: 32,
              }}
            >
              Your workspace is ready
            </h1>

            <p
              style={{
                maxWidth: 620,
                margin: "14px auto 0",
                color: "#64748b",
                fontSize: 16,
                lineHeight: 1.7,
              }}
            >
              Your organization, owner account, and
              enterprise trial have been created
              successfully.
            </p>

            <div
              style={{
                maxWidth: 680,
                margin: "30px auto 0",
                padding: 24,
                borderRadius: 16,
                background: "#f8fafc",
                border: "1px solid #dbe5f1",
                textAlign: "left",
                display: "grid",
                gridTemplateColumns:
                  "repeat(auto-fit, minmax(220px, 1fr))",
                gap: 20,
              }}
            >
              <SummaryItem
                label="Organization"
                value={result.organization_name}
              />

              <SummaryItem
                label="Your Role"
                value={result.role}
              />

              <SummaryItem
                label="Plan"
                value={result.subscription_plan}
              />

              <SummaryItem
                label="Trial Status"
                value={result.subscription_status}
              />

              <SummaryItem
                label="Connections Included"
                value={String(
                  result.max_connections ?? 0,
                )}
              />

              <SummaryItem
                label="Monthly Explanations"
                value={String(
                  result.max_monthly_explanations ??
                    0,
                )}
              />

              <SummaryItem
                label="Trial Ends"
                value={
                  result.trial_end_date
                    ? new Date(
                        result.trial_end_date,
                      ).toLocaleDateString()
                    : "Not available"
                }
              />
            </div>

            <div
              style={{
                marginTop: 30,
                padding: 16,
                borderRadius: 13,
                background: "#eff6ff",
                border: "1px solid #bfdbfe",
                color: "#1e40af",
                fontSize: 14,
                lineHeight: 1.6,
              }}
            >
              Next, connect Databricks, Snowflake, Google BigQuery, 
              and many other enterprise data platforms to begin governed AI processing.
            </div>

            <button
              type="button"
              style={{
                ...primaryButtonStyle,
                marginTop: 28,
                padding: "15px 28px",
              }}
              onClick={continueToConnections}
            >
              Connect My First Data Source
            </button>
          </main>
        )}
      </div>
    </div>
  );
}

type SummaryItemProps = {
  label: string;
  value: string;
};

function SummaryItem({
  label,
  value,
}: SummaryItemProps) {
  return (
    <div>
      <div
        style={{
          color: "#64748b",
          fontSize: 12,
          fontWeight: 800,
          textTransform: "uppercase",
        }}
      >
        {label}
      </div>

      <div
        style={{
          marginTop: 6,
          color: "#173c72",
          fontSize: 15,
          fontWeight: 850,
        }}
      >
        {value}
      </div>
    </div>
  );
}

export default WelcomeOnboardingPage;