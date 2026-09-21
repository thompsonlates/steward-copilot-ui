export type OnboardingProgressStep = {
  step_id: string;
  title: string;
  description: string;
  completed: boolean;
  destination: "explain" | "dashboard" | "connections" | "governance" | null;
};

export type OnboardingProgress = {
  organization_id: string;
  completed_steps: number;
  total_steps: number;
  progress_percentage: number;
  onboarding_complete: boolean;
  steps: OnboardingProgressStep[];
};

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL ??
  "http://127.0.0.1:8000";

function getToken(): string {
  const token = localStorage.getItem("token");

  if (!token) {
    throw new Error("Your application session has expired.");
  }

  return token;
}

export async function getOnboardingProgress(): Promise<OnboardingProgress> {
  const response = await fetch(
    `${API_BASE_URL}/v1/onboarding-progress`,
    {
      headers: {
        Authorization: `Bearer ${getToken()}`,
      },
    },
  );

  const body = await response.json().catch(() => null);

  if (!response.ok) {
    throw new Error(
      body?.detail ??
        "Unable to load onboarding progress.",
    );
  }

  return body as OnboardingProgress;
}