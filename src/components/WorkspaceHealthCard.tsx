import { useEffect, useState } from "react";

import {
  getWorkspaceHealth,
  type WorkspaceHealth,
} from "../api/workspaceHealth";


export default function WorkspaceHealthCard() {
  const [health, setHealth] =
    useState<WorkspaceHealth | null>(null);

  const [loading, setLoading] = useState(true);

  const [error, setError] =
    useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load(): Promise<void> {
      try {
        setLoading(true);
        setError(null);

        const result = await getWorkspaceHealth();

        if (!cancelled) {
          setHealth(result);
        }
      } catch (loadError) {
        if (!cancelled) {
          setError(
            loadError instanceof Error
              ? loadError.message
              : "Unable to load workspace health.",
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

  if (loading) {
    return (
      <div style={cardStyle}>
        Loading workspace health...
      </div>
    );
  }

  if (error) {
    return (
      <div
        style={{
          ...cardStyle,
          border: "1px solid #fecaca",
          background: "#fef2f2",
          color: "#b91c1c",
        }}
      >
        Workspace health error: {error}
      </div>
    );
  }

  if (!health) {
    return null;
  }

  const readiness =
    health.average_automation_readiness;

  const overallLabel = health.overall_health
    .replaceAll("_", " ")
    .toLowerCase()
    .replace(/\b\w/g, (character) =>
      character.toUpperCase(),
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
              fontSize: 13,
              fontWeight: 900,
              letterSpacing: "0.08em",
              textTransform: "uppercase",
            }}
          >
            Enterprise Workspace
          </div>

          <h2
            style={{
              margin: "8px 0 6px",
              color: "#173c72",
              fontSize: 31,
            }}
          >
            Workspace Health
          </h2>

          <div
            style={{
              color: "#64748b",
              fontSize: 15,
            }}
          >
            {health.organization_name}
          </div>
        </div>

        <div
          style={{
            minWidth: 190,
            padding: "15px 18px",
            borderRadius: 16,
            border: "1px solid #bbf7d0",
            background: "#f0fdf4",
            textAlign: "center",
          }}
        >
          <div
            style={{
              color: "#64748b",
              fontSize: 12,
              fontWeight: 800,
              textTransform: "uppercase",
            }}
          >
            Overall Health
          </div>

          <div
            style={{
              marginTop: 4,
              color: "#15803d",
              fontSize: 22,
              fontWeight: 900,
            }}
          >
            {overallLabel}
          </div>

          <div
            style={{
              marginTop: 3,
              color: "#166534",
              fontWeight: 800,
            }}
          >
            {health.overall_health_score}%
          </div>
        </div>
      </div>

      <div
        style={{
          height: 12,
          marginTop: 28,
          overflow: "hidden",
          borderRadius: 999,
          background: "#e2e8f0",
        }}
      >
        <div
          style={{
            width: `${health.overall_health_score}%`,
            height: "100%",
            borderRadius: 999,
            background:
              "linear-gradient(90deg, #2563eb, #22c55e)",
            transition: "width 700ms ease",
          }}
        />
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns:
            "repeat(auto-fit, minmax(210px, 1fr))",
          gap: 14,
          marginTop: 26,
        }}
      >
        <HealthMetric
          title="Professional Plan"
          value={
            health.subscription_active
              ? health.plan_code
              : "Inactive"
          }
          healthy={health.subscription_active}
        />

        <HealthMetric
          title="Active Connections"
          value={String(health.active_platforms)}
          healthy={health.active_platforms > 0}
        />

        <HealthMetric
          title="AI Decisions Today"
          value={health.ai_explanations_today.toLocaleString()}
          healthy={health.total_ai_explanations > 0}
        />

        <HealthMetric
          title="Automation Readiness"
          value={
            readiness === null
              ? "Not available"
              : `${Math.round(readiness)}%`
          }
          healthy={
            readiness !== null &&
            readiness >= 70
          }
        />
        <HealthMetric
          title="Governance Health"
          value={health.governance_health.replaceAll(
            "_",
            " ",
          )}
          healthy={
            health.governance_health === "HEALTHY"
          }

        />

        <HealthMetric
              title="Active Governance Policies"
              value={String(
                health.configured_governance_policies,
              )}
              healthy={
                health.configured_governance_policies > 0
              }
              />
      </div>  
    </section>
  );
}


type HealthMetricProps = {
  title: string;
  value: string;
  healthy: boolean;
};


function HealthMetric({
  title,
  value,
  healthy,
}: HealthMetricProps) {
  return (
    <div
      style={{
        minHeight: 105,
        padding: 18,
        borderRadius: 15,
        border: healthy
          ? "1px solid #bbf7d0"
          : "1px solid #e2e8f0",
        background: healthy
          ? "#f7fff9"
          : "#f8fafc",
      }}
    >
      <div
        style={{
          color: "#64748b",
          fontSize: 12,
          fontWeight: 800,
          textTransform: "uppercase",
        }}
      >
        {title}
      </div>

      <div
        style={{
          marginTop: 12,
          color: "#173c72",
          fontSize: 22,
          fontWeight: 900,
        }}
      >
        <span
          style={{
            marginRight: 8,
            color: healthy ? "#16a34a" : "#94a3b8",
          }}
        >
          {healthy ? "✓" : "○"}
        </span>

        {value}
      </div>
    </div>
  );
}


const cardStyle = {
  width: "100%",
  boxSizing: "border-box",
  padding: 30,
  borderRadius: 22,
  border: "1px solid #dbe4f0",
  background: "#ffffff",
  boxShadow:
    "0 14px 42px rgba(15, 23, 42, 0.07)",
} as const;