import { useEffect, useState } from "react";

import {
  confirmCheckoutSession,
  getBillingStatus,
} from "../api/billing";

type SubscriptionSuccessPageProps = {
  onContinue: () => void;
};

type VerificationState =
  | "VERIFYING"
  | "SUCCESS"
  | "PENDING"
  | "ERROR";



export default function SubscriptionSuccessPage({
  onContinue,
}: SubscriptionSuccessPageProps) {
  const [verificationState, setVerificationState] =
    useState<VerificationState>("VERIFYING");

  const [planName, setPlanName] = useState(
  "AI Data Steward Copilot",
);

  const [message, setMessage] = useState(
    "Secure payment received. Activating your account...",
  );

  function getPlanDisplayName(
    planCode: string | null | undefined,
      ): string {
        switch (planCode) {
          case "PROFESSIONAL":
            return "Professional";

          case "PROFESSIONAL_PLUS":
            return "Professional Plus";

          case "STEWARD_OPERATIONS":
            return "Steward Operations Edition";

          case "GOVERNANCE_INTELLIGENCE":
            return "Governance Intelligence Edition";

          case "ENTERPRISE_GOVERNANCE_PLATFORM":
            return "Enterprise Governance Platform";

          default:
            return "AI Data Steward Copilot";
        }
      }

  useEffect(() => {
    let cancelled = false;

    async function verifySubscription(): Promise<void> {
      try {
        const params = new URLSearchParams(
          window.location.search,
        );

        const sessionId = params.get("session_id");

        if (!sessionId) {
          throw new Error(
            "Stripe Checkout session ID is missing.",
          );
        }

        setVerificationState("VERIFYING");
        setMessage(
          "Secure payment received. Activating your account...",
        );

        await confirmCheckoutSession(sessionId);

        if (cancelled) {
          return;
        }

        const updatedBillingStatus =
          await getBillingStatus();

        setPlanName(
          getPlanDisplayName(
            updatedBillingStatus.plan_code,
          ),
        );

        if (cancelled) {
          return;
        }

        if (
          updatedBillingStatus.subscription_status ===
          "ACTIVE"
        ) {
          setVerificationState("SUCCESS");
          setMessage(
              `Your ${getPlanDisplayName(
                updatedBillingStatus.plan_code,
              )} subscription is active and your account is ready.`,
            );

          return;
        }

        setVerificationState("PENDING");
        setMessage(
          "Payment was received. Your subscription is still being activated.",
        );
      } catch (error) {
        if (cancelled) {
          return;
        }

        setVerificationState("ERROR");
        setMessage(
          error instanceof Error
            ? error.message
            : "Unable to verify your subscription.",
        );
      }
    }

    void verifySubscription();

    return () => {
      cancelled = true;
    };
  }, []);

  const isVerifying =
    verificationState === "VERIFYING";

  const isSuccess =
    verificationState === "SUCCESS";

  const isPending =
    verificationState === "PENDING";

  const isError =
    verificationState === "ERROR";

  const pageTitle = isSuccess
  ? `Welcome to your ${planName} Account!`
  : isPending
    ? "Your subscription is processing"
    : isError
      ? "We could not verify your subscription"
      : "Activating your subscription";

  return (
    <div
      style={{
        minHeight: "calc(100vh - 90px)",
        padding: "54px 24px",
        background: "#f4f7fb",
      }}
    >
      <style>
        {`
          @keyframes subscriptionSpin {
            from {
              transform: rotate(0deg);
            }

            to {
              transform: rotate(360deg);
            }
          }
        `}
      </style>

      <div
        style={{
          width: "100%",
          maxWidth: 880,
          margin: "0 auto",
          padding: 42,
          borderRadius: 24,
          border: "1px solid #dbe4f0",
          background: "#ffffff",
          boxShadow:
            "0 22px 70px rgba(15, 23, 42, 0.10)",
        }}
      >
        <div
          style={{
            width: 64,
            height: 64,
            display: "grid",
            placeItems: "center",
            borderRadius: "50%",
            background: isError
              ? "#fef2f2"
              : "#ecfdf3",
            color: isError
              ? "#b91c1c"
              : "#15803d",
          }}
        >
          {isVerifying ? (
            <div
              aria-label="Activating your AI Data Steward Copilot subscription"
              style={{
                width: 30,
                height: 30,
                borderRadius: "50%",
                border:
                  "4px solid rgba(21, 128, 61, 0.18)",
                borderTopColor: "#15803d",
                animation:
                  "subscriptionSpin 0.85s linear infinite",
              }}
            />
          ) : (
            <span
              style={{
                fontSize: 34,
                fontWeight: 900,
              }}
            >
              {isError ? "!" : "✓"}
            </span>
          )}
        </div>

        <h1
          style={{
            margin: "24px 0 8px",
            color: "#173c72",
            fontSize: 38,
          }}
        >
          {pageTitle}
        </h1>

        <p
          style={{
            margin: 0,
            color: "#64748b",
            fontSize: 17,
            lineHeight: 1.7,
          }}
        >
          {message}
        </p>

        <div
          style={{
            display: "grid",
            gridTemplateColumns:
              "repeat(auto-fit, minmax(220px, 1fr))",
            gap: 16,
            marginTop: 32,
          }}
        >
          <SuccessFeature
            title="AI Match Explanations"
            description={
              "Generate explainable, domain-aware match decisions."
            }
          />

          <SuccessFeature
            title="Enterprise Connections"
            description={
              "Connect governed cloud and data platforms."
            }
          />

          <SuccessFeature
            title="Governance Intelligence"
            description={
              "Use AI-driven governance, risk, and stewardship insights."
            }
          />
        </div>

        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            gap: 12,
            marginTop: 34,
            paddingTop: 26,
            borderTop: "1px solid #e2e8f0",
          }}
        >
          <button
            type="button"
            onClick={onContinue}
            disabled={isVerifying}
            style={{
              padding: "14px 22px",
              border: 0,
              borderRadius: 12,
              background:
                "linear-gradient(135deg, #2563eb, #1d4ed8)",
              color: "#ffffff",
              fontWeight: 800,
              fontSize: 16,
              cursor: isVerifying
                ? "not-allowed"
                : "pointer",
              opacity: isVerifying ? 0.65 : 1,
              boxShadow:
                "0 8px 22px rgba(37, 99, 235, 0.20)",
            }}
          >
            Connect Your First Data Source
          </button>

          {(isPending || isError) && (
            <button
              type="button"
              onClick={() => {
                window.location.reload();
              }}
              style={{
                padding: "14px 22px",
                borderRadius: 12,
                border: "1px solid #cbd5e1",
                background: "#ffffff",
                color: "#173c72",
                fontWeight: 800,
                cursor: "pointer",
              }}
            >
              Check Activation Again
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

type SuccessFeatureProps = {
  title: string;
  description: string;
};

function SuccessFeature({
  title,
  description,
}: SuccessFeatureProps) {
  return (
    <div
      style={{
        padding: 20,
        borderRadius: 14,
        border: "1px solid #dbeafe",
        background: "#f8fbff",
      }}
    >
      <div
        style={{
          color: "#173c72",
          fontWeight: 800,
          fontSize: 16,
        }}
      >
        ✓ {title}
      </div>

      <div
        style={{
          marginTop: 8,
          color: "#64748b",
          lineHeight: 1.6,
          fontSize: 14,
        }}
      >
        {description}
      </div>
    </div>
  );
}