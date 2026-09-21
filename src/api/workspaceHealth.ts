const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL ??
  "http://127.0.0.1:8000";

export type WorkspaceHealthStatus =
  | "EXCELLENT"
  | "GOOD"
  | "NEEDS_ATTENTION"
  | "CRITICAL";

export type GovernanceHealth =
  | "HEALTHY"
  | "NEEDS_ATTENTION"
  | "NOT_CONFIGURED";

export type WorkspaceHealth = {
  organization_id: string;
  organization_name: string;

  configured_governance_policies: number;
  ai_explanations_today: number;

  plan_code: string;
  subscription_active: boolean;

  active_platforms: number;
  total_connection_records: number;

  total_ai_explanations: number;
  average_automation_readiness: number | null;

  active_governance_policies: number;
  governance_health: GovernanceHealth;

  overall_health_score: number;
  overall_health: WorkspaceHealthStatus;
};

export async function getWorkspaceHealth(): Promise<WorkspaceHealth> {
  const token = localStorage.getItem("token");

  if (!token) {
    throw new Error(
      "Your session has expired. Please sign in again.",
    );
  }

  const response = await fetch(
    `${API_BASE_URL}/v1/workspace-health`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    },
  );

  const body = await response.json().catch(() => null);

  if (!response.ok) {
    throw new Error(
      body?.detail ??
        "Unable to load workspace health.",
    );
  }

  return body as WorkspaceHealth;
}
