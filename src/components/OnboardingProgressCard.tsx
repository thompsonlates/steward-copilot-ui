import { useEffect, useState } from "react";

import {
  getOnboardingProgress,
  type OnboardingProgress,
  type OnboardingProgressStep,
} from "../api/onboardingProgress";

import WorkspaceHealthCard from "./WorkspaceHealthCard";

type AppTab =
  | "explain"
  | "dashboard"
  | "connections"
  | "governance";

type OnboardingProgressCardProps = {
  onNavigate: (tab: AppTab) => void;
};

type ProductAccessErrorDetail = {
  code?: string;
};

function readTrialExpiredState(): boolean {
  const raw = sessionStorage.getItem("product_access_error");

  if (!raw) {
    return false;
  }

  try {
    const parsed = JSON.parse(raw) as ProductAccessErrorDetail;

    return (
      String(parsed.code ?? "")
        .trim()
        .toUpperCase() === "TRIAL_EXPIRED"
    );
  } catch {
    return false;
  }
}

export default function OnboardingProgressCard({
  onNavigate,
}: OnboardingProgressCardProps) {
  const [progress, setProgress] =
    useState<OnboardingProgress | null>(null);

  const [loading, setLoading] = useState(true);

  const [error, setError] =
    useState<string | null>(null);

  const [trialExpired, setTrialExpired] =
    useState<boolean>(() => readTrialExpiredState());

  useEffect(() => {
    let cancelled = false;

    async function load(): Promise<void> {
      try {
        setLoading(true);
        setError(null);

        const result = await getOnboardingProgress();

        if (!cancelled) {
          setProgress(result);
        }
      } catch (loadError) {
        if (!cancelled) {
          setError(
            loadError instanceof Error
              ? loadError.message
              : "Unable to load onboarding progress.",
          );
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void load();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    function handleProductAccessRequired(
      event: Event,
    ): void {
      const customEvent =
        event as CustomEvent<ProductAccessErrorDetail>;

      const code = String(
        customEvent.detail?.code ?? "",
      )
        .trim()
        .toUpperCase();

      if (code === "TRIAL_EXPIRED") {
        setTrialExpired(true);
      }
    }

    window.addEventListener(
      "product-access-required",
      handleProductAccessRequired,
    );

    return () => {
      window.removeEventListener(
        "product-access-required",
        handleProductAccessRequired,
      );
    };
  }, []);

  if (loading) {
    return (
      <div style={cardStyle}>
        Loading your onboarding journey...
      </div>
    );
  }

  if (error || !progress) {
    return null;
  }

  if (progress.onboarding_complete) {
    return <WorkspaceHealthCard />;
  }

  const nextStep = progress.steps.find(
    (step) => !step.completed,
  );

  return (
    <section style={cardStyle}>
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
            Getting Started
          </div>

          <h2
            style={{
              margin: "8px 0 6px",
              color: "#173c72",
              fontSize: 25,
            }}
          >
            Complete your Professional workspace
          </h2>

          <div
            style={{
              color: "#64748b",
              lineHeight: 1.6,
            }}
          >
            {progress.completed_steps} of{" "}
            {progress.total_steps} setup steps completed
          </div>
        </div>

        <div
          style={{
            color: "#173c72",
            fontSize: 25,
            fontWeight: 900,
          }}
        >
          {progress.progress_percentage}%
        </div>
      </div>

      {trialExpired && (
        <div
          role="status"
          style={{
            marginTop: 18,
            padding: "13px 15px",
            borderRadius: 12,
            border: "1px solid #fecaca",
            background: "#fef2f2",
            color: "#991b1b",
            fontSize: 13,
            fontWeight: 800,
            lineHeight: 1.5,
          }}
        >
          Trial completed — Activate Subscription to resume
          product functionality.
        </div>
      )}

      <div
        style={{
          height: 12,
          marginTop: 22,
          overflow: "hidden",
          borderRadius: 999,
          background: "#e2e8f0",
        }}
      >
        <div
          style={{
            width: `${progress.progress_percentage}%`,
            height: "100%",
            borderRadius: 999,
            background:
              "linear-gradient(90deg, #2563eb, #22c55e)",
            transition: "width 500ms ease",
            boxShadow:
              "0 0 12px rgba(34, 197, 94, 0.25)",
          }}
        />
      </div>

      <div
        style={{
          display: "grid",
          gap: 12,
          marginTop: 24,
        }}
      >
        {progress.steps.map((step) => (
          <ProgressStep
            key={step.step_id}
            step={step}
            onNavigate={onNavigate}
            trialExpired={trialExpired}
          />
        ))}
      </div>

      {nextStep?.destination && !trialExpired && (
        <button
          type="button"
          onClick={() => {
            onNavigate(nextStep.destination as AppTab);
          }}
          style={{
            marginTop: 24,
            padding: "13px 20px",
            border: 0,
            borderRadius: 12,
            background:
              "linear-gradient(135deg, #2563eb, #1d4ed8)",
            color: "#ffffff",
            fontSize: 15,
            fontWeight: 900,
            cursor: "pointer",
            boxShadow:
              "0 9px 22px rgba(37, 99, 235, 0.22)",
          }}
        >
          Continue setup →
        </button>
      )}
    </section>
  );
}

type ProgressStepProps = {
  step: OnboardingProgressStep;
  onNavigate: (tab: AppTab) => void;
  trialExpired: boolean;
};

function ProgressStep({
  step,
  onNavigate,
  trialExpired,
}: ProgressStepProps) {
  const isTrialStep =
    step.title
      .trim()
      .toLowerCase()
      .includes("trial workspace");

  const displayTitle =
    trialExpired && isTrialStep
      ? "Trial completed"
      : step.title;

  const displayDescription =
    trialExpired && isTrialStep
      ? "Activate Subscription to resume product functionality."
      : step.description;

  const clickable =
    !trialExpired &&
    !step.completed &&
    step.destination !== null;

  const completedVisual =
    step.completed && !(trialExpired && isTrialStep);

  return (
    <button
      type="button"
      disabled={!clickable}
      onClick={() => {
        if (clickable && step.destination) {
          onNavigate(step.destination);
        }
      }}
      style={{
        width: "100%",
        display: "flex",
        alignItems: "center",
        gap: 14,
        padding: 15,
        borderRadius: 13,
        border:
          trialExpired && isTrialStep
            ? "1px solid #fecaca"
            : completedVisual
              ? "1px solid #bbf7d0"
              : "1px solid #dbe4f0",
        background:
          trialExpired && isTrialStep
            ? "#fef2f2"
            : completedVisual
              ? "#f0fdf4"
              : "#ffffff",
        textAlign: "left",
        cursor: clickable ? "pointer" : "default",
        opacity: completedVisual ? 0.82 : 1,
      }}
    >
      <div
        style={{
          width: 30,
          height: 30,
          flex: "0 0 auto",
          display: "grid",
          placeItems: "center",
          borderRadius: "50%",
          background:
            trialExpired && isTrialStep
              ? "#fee2e2"
              : completedVisual
                ? "#dcfce7"
                : "#eff6ff",
          color:
            trialExpired && isTrialStep
              ? "#b91c1c"
              : completedVisual
                ? "#15803d"
                : "#2563eb",
          fontWeight: 900,
        }}
      >
        {trialExpired && isTrialStep
          ? "!"
          : completedVisual
            ? "✓"
            : "○"}
      </div>

      <div style={{ flex: 1 }}>
        <div
          style={{
            color:
              trialExpired && isTrialStep
                ? "#991b1b"
                : "#173c72",
            fontWeight: 850,
          }}
        >
          {displayTitle}
        </div>

        <div
          style={{
            marginTop: 4,
            color:
              trialExpired && isTrialStep
                ? "#b91c1c"
                : "#64748b",
            fontSize: 13,
            lineHeight: 1.5,
          }}
        >
          {displayDescription}
        </div>
      </div>

      {clickable && (
        <div
          style={{
            color: "#2563eb",
            fontWeight: 900,
          }}
        >
          →
        </div>
      )}
    </button>
  );
}

const cardStyle = {
  padding: 25,
  borderRadius: 20,
  border: "1px solid #dbe4f0",
  background: "#ffffff",
  boxShadow: "0 12px 35px rgba(15, 23, 42, 0.08)",
} as const;
