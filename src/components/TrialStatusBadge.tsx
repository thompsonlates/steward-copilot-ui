import { useEffect, useState } from "react";

import {
  createCheckoutSession,
  createCustomerPortalSession,
  getBillingStatus,
  type BillingStatus,
} from "../api/billing";

const pulseAnimation = `
@keyframes professionalPulse {
  0%,
  70%,
  100% {
    transform: scale(1);
    box-shadow: 0 2px 8px rgba(15, 23, 42, 0.06);
  }

  82% {
    transform: scale(1.035);
    box-shadow:
      0 0 0 3px rgba(34, 197, 94, 0.10),
      0 0 14px rgba(34, 197, 94, 0.35);
  }

  90% {
    transform: scale(1);
    box-shadow: 0 2px 8px rgba(15, 23, 42, 0.06);
  }
}
`;

type PlanCode =
  | "PROFESSIONAL"
  | "PROFESSIONAL_PLUS"
  | "STEWARD_OPERATIONS"
  | "GOVERNANCE_INTELLIGENCE"
  | "ENTERPRISE_GOVERNANCE_PLATFORM";

type EnterprisePlan = {
  planCode: Exclude<PlanCode, "PROFESSIONAL">;
  planName: string;
  price: string;
  seatLabel: string;
  domainLabel: string;
  description: string;
  features: string[];
  buttonLabel: string;
  selfService: boolean;
  highlighted?: boolean;
};

const enterprisePlans: EnterprisePlan[] = [
  {
    planCode: "PROFESSIONAL_PLUS",
    planName: "Professional Plus",
    price: "$1,999/month",
    seatLabel: "Up to 3 seats",
    domainLabel: "Up to 3 domains",
    description:
      "For small data and governance teams ready to expand beyond a single domain.",
    features: [
      "Up to 3 governed domains",
      "AI match explainability",
      "Data quality intelligence",
      "Steward feedback and learning",
      "Enterprise data connections",
    ],
    buttonLabel: "Upgrade with Stripe",
    selfService: true,
  },
  {
    planCode: "STEWARD_OPERATIONS",
    planName: "Steward Operations Edition",
    price: "$45,000/year",
    seatLabel: "Up to 10 seats",
    domainLabel: "Up to 3 domains",
    description:
      "For organizations scaling enterprise stewardship operations.",
    features: [
      "Enterprise stewardship workflows",
      "AI match explainability",
      "Data quality intelligence",
      "Steward feedback and learning",
      "Enterprise data connections",
    ],
    buttonLabel: "Upgrade with Stripe",
    selfService: true,
  },
  {
    planCode: "GOVERNANCE_INTELLIGENCE",
    planName: "Governance Intelligence Edition",
    price: "$75,000/year",
    seatLabel: "Up to 20 seats",
    domainLabel: "All 6 current domains",
    description:
      "For governance and MDM teams requiring policy, risk, and executive intelligence.",
    features: [
      "Everything in Steward Operations",
      "Governance intelligence",
      "Policy management",
      "Risk scoring and recommendations",
      "Executive governance dashboards",
    ],
    buttonLabel: "Upgrade with Stripe",
    selfService: true,
    highlighted: true,
  },
  {
    planCode: "ENTERPRISE_GOVERNANCE_PLATFORM",
    planName: "Enterprise Governance Platform",
    price: "$120,000+/year",
    seatLabel: "30+ / negotiated",
    domainLabel: "All domains",
    description:
      "The complete enterprise AI governance and stewardship platform.",
    features: [
      "Everything in Governance Intelligence",
      "Enterprise security and SSO",
      "Multi-domain deployment",
      "Custom integrations",
      "Dedicated enterprise support",
    ],
    buttonLabel: "Talk to Sales",
    selfService: false,
  },
];

function formatDate(value: string | null): string {
  if (!value) {
    return "Not available";
  }

  const parsedDate = new Date(value);

  if (Number.isNaN(parsedDate.getTime())) {
    return "Not available";
  }

  return new Intl.DateTimeFormat("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  }).format(parsedDate);
}

function formatPlanCode(planCode: string): string {
  return planCode
    .replaceAll("_", " ")
    .toLowerCase()
    .replace(/\b\w/g, (character) => character.toUpperCase());
}

function getPlanPrice(
  planCode: string | null | undefined,
): string {
  switch (planCode) {
    case "PROFESSIONAL":
      return "$999";

    case "PROFESSIONAL_PLUS":
      return "$1,999";

    case "STEWARD_OPERATIONS":
      return "$45,000";

    case "GOVERNANCE_INTELLIGENCE":
      return "$75,000";

    case "ENTERPRISE_GOVERNANCE_PLATFORM":
      return "$120,000+";

    default:
      return "—";
  }
}

function openSalesEmail(planName: string): void {
  const subject = encodeURIComponent(
    `AI Data Steward Copilot - ${planName}`,
  );

  const body = encodeURIComponent(
    [
      `I am interested in learning more about the ${planName}.`,
      "",
      "Please contact me to discuss enterprise pricing, implementation, and next steps.",
    ].join("\n"),
  );

  window.location.href =
    `mailto:support@admsdata.com?subject=${subject}&body=${body}`;
}

export default function TrialStatusBadge() {
  const [billing, setBilling] =
    useState<BillingStatus | null>(null);

  const [modalOpen, setModalOpen] = useState(false);

  const [checkoutLoading, setCheckoutLoading] =
    useState(false);

  const [portalLoading, setPortalLoading] =
    useState(false);

  const [error, setError] =
    useState<string | null>(null);

  useEffect(() => {
    async function load(): Promise<void> {
      try {
        const status = await getBillingStatus();
        setBilling(status);
      } catch (loadError) {
        console.error(
          "Unable to load billing status.",
          loadError,
        );
      }
    }

    void load();
  }, []);

  async function beginCheckout(
    planCode: PlanCode,
  ): Promise<void> {
    try {
      setCheckoutLoading(true);
      setError(null);

      const checkoutUrl =
        await createCheckoutSession(planCode);

      window.location.assign(checkoutUrl);
    } catch (checkoutError) {
      setError(
        checkoutError instanceof Error
          ? checkoutError.message
          : "Unable to start checkout.",
      );

      setCheckoutLoading(false);
  }
}

  async function openBillingPortal(): Promise<void> {
    try {
      setPortalLoading(true);
      setError(null);

      const portalUrl =
        await createCustomerPortalSession();

      window.location.assign(portalUrl);
    } catch (portalError) {
      setError(
        portalError instanceof Error
          ? portalError.message
          : "Unable to open billing management.",
      );

      setPortalLoading(false);
    }
  }

  if (!billing) {
    return null;
  }

  const normalizedSubscriptionStatus = String(
    billing.subscription_status ?? "",
  )
    .trim()
    .toUpperCase();

  const isTrial =
    normalizedSubscriptionStatus === "TRIAL" ||
    normalizedSubscriptionStatus === "TRIALING";

  const isTrialExpired =
    (
      isTrial &&
      billing.days_remaining <= 0
    ) ||
    normalizedSubscriptionStatus === "EXPIRED";

  const isProfessionalActive =
    normalizedSubscriptionStatus === "ACTIVE" &&
    billing.plan_code === "PROFESSIONAL" &&
    billing.is_paid;

  const isActive =
    normalizedSubscriptionStatus === "ACTIVE";

  const trialEndingSoon =
    isTrial &&
    !isTrialExpired &&
    billing.days_remaining <= 3;

  const requiresBillingAttention =
    isTrialExpired ||
    (
      !isTrial &&
      !isProfessionalActive &&
      !isActive
    );

  const badgeBackground = isActive
    ? "#ecfdf5"
    : isTrialExpired
      ? "#fef2f2"
      : trialEndingSoon
        ? "#fff7ed"
        : requiresBillingAttention
          ? "#fef2f2"
          : "#fef3c7";

  const badgeColor = isActive
    ? "#166534"
    : isTrialExpired
      ? "#b91c1c"
      : trialEndingSoon
        ? "#c2410c"
        : requiresBillingAttention
          ? "#b91c1c"
          : "#92400e";

  const badgeBorder = isActive
    ? "1px solid #86efac"
    : isTrialExpired
      ? "1px solid #fecaca"
      : trialEndingSoon
        ? "1px solid #fed7aa"
        : requiresBillingAttention
          ? "1px solid #fecaca"
          : "1px solid #f5d98a";

  const badgeLabel = isTrialExpired
    ? "🔴 Trial Expired • Activate"
    : isTrial
      ? `🟡 Trial • ${billing.days_remaining} days left`
      : isActive
        ? `🟢 ${billing.plan_name || formatPlanCode(billing.plan_code)}`
        : "🔴 Billing Attention Required";

  return (
    <>
      <style>{pulseAnimation}</style>

      <button
        type="button"
        onClick={() => {
          setError(null);
          setModalOpen(true);
        }}
        style={{
          padding: "10px 18px",
          borderRadius: 999,
          border: badgeBorder,
          background: badgeBackground,
          color: badgeColor,
          fontWeight: 800,
          fontSize: 14,
          whiteSpace: "nowrap",
          cursor: "pointer",
          boxShadow:
            "0 2px 8px rgba(15, 23, 42, 0.06)",
          animation: isActive
            ? "professionalPulse 4s ease-in-out infinite"
            : undefined,
        }}
      >
        {badgeLabel}
      </button>

      {modalOpen && (
        <div
          role="presentation"
          onClick={() => setModalOpen(false)}
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 4000,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 24,
            background: "rgba(15, 23, 42, 0.52)",
            overflowY: "auto",
          }}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="billing-modal-title"
            onClick={(event) =>
              event.stopPropagation()
            }
            style={{
              width: "100%",
              maxWidth: isProfessionalActive
                ? 1120
                : 560,
              maxHeight: "90vh",
              overflowY: "auto",
              padding: 30,
              borderRadius: 22,
              border: "1px solid #dbe4f0",
              background: "#ffffff",
              boxShadow:
                "0 28px 80px rgba(15, 23, 42, 0.28)",
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "flex-start",
                gap: 20,
              }}
            >
              <div>
                <h2
                  id="billing-modal-title"
                  style={{
                    margin: 0,
                    color: "#173c72",
                    fontSize: 27,
                  }}
                >
                  {isTrialExpired
                    ? "Your Trial Has Ended"
                    : isTrial
                      ? "Enterprise Trial"
                      : isProfessionalActive
                        ? "Professional Plan"
                        : billing.plan_name ||
                          "Subscription Status"}
                </h2>

                <div
                  style={{
                    marginTop: 7,
                    color: "#64748b",
                    fontWeight: 700,
                  }}
                >
                  {isTrialExpired
                    ? "Read-only access is active until you subscribe."
                    : isTrial
                      ? `${billing.days_remaining} days remaining`
                      : isProfessionalActive
                        ? "Current active subscription"
                        : billing.access_reason}
                </div>
              </div>

              <button
                type="button"
                onClick={() => setModalOpen(false)}
                aria-label="Close billing window"
                style={{
                  border: 0,
                  background: "transparent",
                  color: "#64748b",
                  fontSize: 26,
                  cursor: "pointer",
                }}
              >
                ×
              </button>
            </div>

            {isTrial && (
              <>
                {isTrialExpired && (
                  <div
                    role="alert"
                    style={{
                      marginTop: 24,
                      padding: "14px 16px",
                      borderRadius: 12,
                      border: "1px solid #fecaca",
                      background: "#fef2f2",
                      color: "#991b1b",
                      fontWeight: 700,
                      lineHeight: 1.55,
                    }}
                  >
                    Your 14-day trial has expired.
                    Existing dashboards and history remain
                    available in read-only mode. Activate a
                    subscription to resume profiling, AI
                    analysis, remediation, policy changes,
                    connections, and other paid actions.
                  </div>
                )}

                <div
                  style={{
                    marginTop: 24,
                    padding: 20,
                    borderRadius: 14,
                    border: "1px solid #dbeafe",
                    background: "#f8fbff",
                    color: "#173c72",
                    lineHeight: 2,
                    fontWeight: 700,
                  }}
                >
                  <div>✓ AI match explanations</div>
                  <div>
                    ✓ Enterprise data connections
                  </div>
                  <div>
                    ✓ Data quality intelligence
                  </div>
                  <div>
                    ✓ Governance intelligence
                  </div>
                  <div>
                    ✓ Steward feedback and learning
                  </div>
                </div>

                <div
                  style={{
                    marginTop: 25,
                    color: "#173c72",
                  }}
                >
                  <div
                    style={{
                      color: "#64748b",
                      fontSize: 13,
                      fontWeight: 800,
                      textTransform: "uppercase",
                    }}
                  >
                    PROFESSIONAL Monthly
                  </div>

                  <div
                    style={{
                      marginTop: 5,
                      fontSize: 35,
                      fontWeight: 900,
                    }}
                  >
                    {getPlanPrice("PROFESSIONAL")}
                    <span
                      style={{
                        fontSize: 17,
                        color: "#64748b",
                      }}
                    >
                      /month
                    </span>
                  </div>
                </div>

                {error && (
                  <ErrorMessage message={error} />
                )}

                <button
                  type="button"
                  onClick={() => {
                    void beginCheckout("PROFESSIONAL");
                  }}
                  disabled={checkoutLoading}
                  style={{
                    width: "100%",
                    marginTop: 25,
                    padding: "15px 18px",
                    border: 0,
                    borderRadius: 12,
                    background:
                      "linear-gradient(135deg, #2563eb, #1d4ed8)",
                    color: "#ffffff",
                    fontSize: 16,
                    fontWeight: 800,
                    cursor: checkoutLoading
                      ? "not-allowed"
                      : "pointer",
                    opacity: checkoutLoading
                      ? 0.65
                      : 1,
                    boxShadow:
                      "0 8px 22px rgba(37, 99, 235, 0.24)",
                  }}
                >
                  {checkoutLoading
                    ? "Opening secure checkout..."
                    : isTrialExpired
                      ? "Activate Professional with Stripe"
                      : "Upgrade with Stripe"}
                </button>

                <div
                  style={{
                    marginTop: 13,
                    textAlign: "center",
                    color: "#64748b",
                    fontSize: 12,
                  }}
                >
                  Secure checkout powered by Stripe
                </div>
              </>
            )}

            {isProfessionalActive && (
              <>
                <div
                  style={{
                    marginTop: 24,
                    padding: 22,
                    borderRadius: 16,
                    border: "1px solid #bbf7d0",
                    background: "#f0fdf4",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      justifyContent:
                        "space-between",
                      alignItems: "flex-start",
                      gap: 18,
                      flexWrap: "wrap",
                    }}
                  >
                    <div>
                      <div
                        style={{
                          color: "#166534",
                          fontSize: 13,
                          fontWeight: 900,
                          textTransform: "uppercase",
                          letterSpacing: 0.7,
                        }}
                      >
                        Current Plan
                      </div>

                      <div
                        style={{
                          marginTop: 7,
                          color: "#14532d",
                          fontSize: 25,
                          fontWeight: 900,
                        }}
                      >
                        {billing.plan_name ||
                          "Professional Monthly"}
                      </div>

                      <div
                        style={{
                          marginTop: 5,
                          color: "#166534",
                          fontSize: 32,
                          fontWeight: 900,
                        }}
                      >
                        $999
                        <span
                          style={{
                            fontSize: 16,
                            fontWeight: 700,
                          }}
                        >
                          /month
                        </span>
                      </div>
                    </div>

                    <div
                      style={{
                        padding: "7px 12px",
                        borderRadius: 999,
                        background: "#dcfce7",
                        color: "#166534",
                        fontWeight: 900,
                        fontSize: 13,
                      }}
                    >
                      ● ACTIVE
                    </div>
                  </div>

                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns:
                        "repeat(auto-fit, minmax(190px, 1fr))",
                      gap: 12,
                      marginTop: 20,
                    }}
                  >
                    <SubscriptionDetail
                      label={
                        billing.cancel_at_period_end
                          ? "Access Until"
                          : "Next Renewal"
                      }
                      value={formatDate(
                        billing.current_period_ends_at,
                      )}
                    />

                    <SubscriptionDetail
                      label="Payment Status"
                      value={billing.payment_status}
                    />

                    <SubscriptionDetail
                      label="Billing Interval"
                      value={
                        billing.billing_interval ||
                        "Monthly"
                      }
                    />
                  </div>

                  {billing.cancel_at_period_end && (
                    <div
                      style={{
                        marginTop: 16,
                        padding: "12px 14px",
                        borderRadius: 10,
                        border:
                          "1px solid #fde68a",
                        background: "#fffbeb",
                        color: "#92400e",
                        fontWeight: 700,
                      }}
                    >
                      Your subscription is scheduled
                      to end after the current billing
                      period.
                    </div>
                  )}

                  {error && (
                    <ErrorMessage message={error} />
                  )}

                  <button
                    type="button"
                    onClick={() => {
                      void openBillingPortal();
                    }}
                    disabled={portalLoading}
                    style={{
                      width: "100%",
                      marginTop: 20,
                      padding: "14px 18px",
                      borderRadius: 12,
                      border:
                        "1px solid #86efac",
                      background: "#ffffff",
                      color: "#166534",
                      fontSize: 15,
                      fontWeight: 900,
                      cursor: portalLoading
                        ? "not-allowed"
                        : "pointer",
                      opacity: portalLoading
                        ? 0.65
                        : 1,
                    }}
                  >
                    {portalLoading
                      ? "Opening billing management..."
                      : "Manage Billing"}
                  </button>
                </div>

                <div
                  style={{
                    marginTop: 32,
                  }}
                >
                  <div
                    style={{
                      color: "#173c72",
                      fontSize: 23,
                      fontWeight: 900,
                    }}
                  >
                    Upgrade to an Enterprise Edition
                  </div>

                  <div
                    style={{
                      marginTop: 7,
                      color: "#64748b",
                      lineHeight: 1.6,
                    }}
                  >
                    Expand beyond self-service with
                    enterprise governance, stewardship,
                    security, integrations, and support.
                  </div>

                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns:
                        "repeat(auto-fit, minmax(250px, 1fr))",
                      gap: 18,
                      marginTop: 22,
                    }}
                  >
                   {enterprisePlans.map((plan) => (
                    <EnterprisePlanCard
                      key={plan.planCode}
                      plan={plan}
                      onCheckout={(planCode) => {
                        if (isActive) {
                          void openBillingPortal();
                          return;
                        }

                        void beginCheckout(planCode);
    }}
  />
))}
                  </div>
                </div>
              </>
            )}

            {!isTrial &&
              !isProfessionalActive && (
                <>
                  <div
                    style={{
                      marginTop: 24,
                      padding: 20,
                      borderRadius: 14,
                      border:
                        "1px solid #fecaca",
                      background: "#fef2f2",
                      color: "#991b1b",
                    }}
                  >
                    <div
                      style={{
                        fontSize: 17,
                        fontWeight: 900,
                      }}
                    >
                      Billing attention required
                    </div>

                    <div
                      style={{
                        marginTop: 8,
                        lineHeight: 1.6,
                        fontWeight: 600,
                      }}
                    >
                      {billing.access_reason}
                    </div>
                  </div>

                  {error && (
                    <ErrorMessage message={error} />
                  )}

                  {billing.stripe_customer_id ? (
                    <button
                      type="button"
                      onClick={() => {
                        void openBillingPortal();
                      }}
                      disabled={portalLoading}
                      style={{
                        width: "100%",
                        marginTop: 22,
                        padding: "15px 18px",
                        border: 0,
                        borderRadius: 12,
                        background:
                          "linear-gradient(135deg, #2563eb, #1d4ed8)",
                        color: "#ffffff",
                        fontSize: 16,
                        fontWeight: 800,
                        cursor: portalLoading
                          ? "not-allowed"
                          : "pointer",
                        opacity: portalLoading
                          ? 0.65
                          : 1,
                      }}
                    >
                      {portalLoading
                        ? "Opening billing management..."
                        : "Manage Billing"}
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => {
                        void beginCheckout("PROFESSIONAL");
                      }}
                      disabled={checkoutLoading}
                      style={{
                        width: "100%",
                        marginTop: 22,
                        padding: "15px 18px",
                        border: 0,
                        borderRadius: 12,
                        background:
                          "linear-gradient(135deg, #2563eb, #1d4ed8)",
                        color: "#ffffff",
                        fontSize: 16,
                        fontWeight: 800,
                        cursor: checkoutLoading
                          ? "not-allowed"
                          : "pointer",
                        opacity: checkoutLoading
                          ? 0.65
                          : 1,
                      }}
                    >
                      {checkoutLoading
                        ? "Opening secure checkout..."
                        : "Subscribe to Professional"}
                    </button>
                  )}
                </>
              )}
          </div>
        </div>
      )}
    </>
  );
}

function ErrorMessage({
  message,
}: {
  message: string;
}) {
  return (
    <div
      role="alert"
      style={{
        marginTop: 18,
        padding: "12px 14px",
        borderRadius: 10,
        border: "1px solid #fecaca",
        background: "#fef2f2",
        color: "#b91c1c",
        fontWeight: 700,
      }}
    >
      {message}
    </div>
  );
}

function SubscriptionDetail({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div
      style={{
        padding: 13,
        borderRadius: 10,
        border: "1px solid #bbf7d0",
        background: "#ffffff",
      }}
    >
      <div
        style={{
          color: "#64748b",
          fontSize: 11,
          fontWeight: 900,
          textTransform: "uppercase",
          letterSpacing: 0.5,
        }}
      >
        {label}
      </div>

      <div
        style={{
          marginTop: 5,
          color: "#14532d",
          fontWeight: 800,
        }}
      >
        {value}
      </div>
    </div>
  );
}

function EnterprisePlanCard({
  plan,
  onCheckout,
}: {
  plan: EnterprisePlan;
  onCheckout: (planCode: EnterprisePlan["planCode"]) => void;
}) {
  return (
    <div
      style={{
        position: "relative",
        display: "flex",
        flexDirection: "column",
        padding: 21,
        borderRadius: 16,
        border: plan.highlighted
          ? "2px solid #2563eb"
          : "1px solid #dbe4f0",
        background: plan.highlighted
          ? "#f8fbff"
          : "#ffffff",
        boxShadow: plan.highlighted
          ? "0 12px 30px rgba(37, 99, 235, 0.12)"
          : "0 8px 22px rgba(15, 23, 42, 0.06)",
      }}
    >
      {plan.highlighted && (
        <div
          style={{
            position: "absolute",
            top: -12,
            left: 18,
            padding: "5px 10px",
            borderRadius: 999,
            background: "#2563eb",
            color: "#ffffff",
            fontSize: 11,
            fontWeight: 900,
            textTransform: "uppercase",
          }}
        >
          Recommended
        </div>
      )}

      <div
        style={{
          color: "#173c72",
          fontSize: 18,
          fontWeight: 900,
          lineHeight: 1.3,
        }}
      >
        {plan.planName}
      </div>

      <div
        style={{
          marginTop: 10,
          color: "#0f172a",
          fontSize: 24,
          fontWeight: 900,
        }}
      >
        {plan.price}
      </div>
      <div
        style={{
          marginTop: 7,
          color: "#2563eb",
          fontSize: 13,
          fontWeight: 900,
        }}
>
  {plan.seatLabel}
</div>

      <div
        style={{
          marginTop: 10,
          color: "#64748b",
          lineHeight: 1.55,
          fontSize: 13,
        }}
      >
        {plan.description}
      </div>

      <div
        style={{
          marginTop: 17,
          display: "grid",
          gap: 8,
          color: "#334155",
          fontSize: 13,
          fontWeight: 650,
        }}
      >
        {plan.features.map((feature) => (
          <div key={feature}>
            <span
              style={{
                color: "#16a34a",
                fontWeight: 900,
              }}
            >
              ✓
            </span>{" "}
            {feature}
          </div>
        ))}
      </div>

      <button
        type="button"
        onClick={() => {
          if (plan.selfService) {
          onCheckout(plan.planCode);
        } else {
          openSalesEmail(plan.planName);
        }
        }}
        style={{
          width: "100%",
          marginTop: "auto",
          padding: "12px 14px",
          borderRadius: 10,
          border: plan.highlighted
            ? 0
            : "1px solid #bfdbfe",
          background: plan.highlighted
            ? "#2563eb"
            : "#eff6ff",
          color: plan.highlighted
            ? "#ffffff"
            : "#1d4ed8",
          fontSize: 14,
          fontWeight: 900,
          cursor: "pointer",
        }}
      >
        {plan.buttonLabel}
      </button>
    </div>
  );
}