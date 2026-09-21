export type SubscriptionStatus =
  | "TRIALING"
  | "ACTIVE"
  | "PAST_DUE"
  | "UNPAID"
  | "PAUSED"
  | "CANCELED"
  | "EXPIRED";

export type BillingStatus = {
  customer_id: string;
  organization_id: string;
  organization_name: string;

  subscription_record_id: string;
  subscription_status: SubscriptionStatus;

  plan_code: string;
  plan_name: string;

  billing_interval: string | null;
  currency: string;
  unit_amount_cents: number | null;

  trial_started_at: string | null;
  trial_ends_at: string | null;

  subscription_started_at: string | null;
  current_period_started_at: string | null;
  current_period_ends_at: string | null;

  cancel_at_period_end: boolean;
  canceled_at: string | null;

  days_remaining: number;
  hours_remaining: number;
  trial_expired: boolean;

  has_product_access: boolean;
  access_reason: string;

  payment_status: string;
  is_paid: boolean;

  stripe_customer_id: string | null;
  stripe_subscription_id: string | null;
  stripe_price_id: string | null;

  seat_limit: number | null;
  connection_limit: number | null;
  monthly_explanation_limit: number | null;
  monthly_dq_analysis_limit: number | null;

  steward_intelligence_enabled: boolean;
  governed_regex_execution_enabled: boolean;
  governed_sql_execution_enabled: boolean;
  policy_auto_execution_enabled: boolean;

  is_current: boolean;
};


type CheckoutConfirmationResponse = {
  success: boolean;
  subscription_status: string;
  payment_status: string;
  message: string;
};

type CheckoutSessionResponse = {
  checkout_url: string;
};

type CustomerPortalSessionResponse = {
  url: string;
};

type ApiErrorResponse = {
  detail?: string;
};

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL ??
  "http://127.0.0.1:8000";

function getToken(): string {
  const token = localStorage.getItem("token");

  if (!token) {
    throw new Error(
      "Your application session has expired.",
    );
  }

  return token;
}

function getAuthorizationHeaders(): HeadersInit {
  return {
    Authorization: `Bearer ${getToken()}`,
  };
}

function getJsonAuthorizationHeaders(): HeadersInit {
  return {
    ...getAuthorizationHeaders(),
    "Content-Type": "application/json",
  };
}

async function readResponseBody(
  response: Response,
): Promise<unknown> {
  return response.json().catch(() => null);
}

function getApiErrorMessage(
  body: unknown,
  fallbackMessage: string,
): string {
  if (
    body &&
    typeof body === "object" &&
    "detail" in body &&
    typeof (body as ApiErrorResponse).detail === "string"
  ) {
    return (
      (body as ApiErrorResponse).detail ??
      fallbackMessage
    );
  }

  return fallbackMessage;
}

export async function getBillingStatus(): Promise<BillingStatus> {
  const response = await fetch(
    `${API_BASE_URL}/v1/billing/status`,
    {
      method: "GET",
      headers: getAuthorizationHeaders(),
    },
  );

  const body = await readResponseBody(response);

  if (!response.ok) {
    throw new Error(
      getApiErrorMessage(
        body,
        "Unable to load billing status.",
      ),
    );
  }

  return body as BillingStatus;
}

export async function createCheckoutSession(
  planCode: string,
): Promise<string> {
  const response = await fetch(
    `${API_BASE_URL}/v1/billing/checkout-session`,
    {
      method: "POST",
      headers: getJsonAuthorizationHeaders(),
      body: JSON.stringify({
        plan_code: planCode,
      }),
    },
  );

  const body = await readResponseBody(response);

  if (!response.ok) {
    throw new Error(
      getApiErrorMessage(
        body,
        "Unable to start Stripe Checkout.",
      ),
    );
  }

  if (
    !body ||
    typeof body !== "object" ||
    !("checkout_url" in body) ||
    typeof (body as CheckoutSessionResponse)
      .checkout_url !== "string"
  ) {
    throw new Error(
      "Stripe Checkout did not return a checkout URL.",
    );
  }

  return (body as CheckoutSessionResponse).checkout_url;
}

export async function confirmCheckoutSession(
  sessionId: string,
): Promise<CheckoutConfirmationResponse> {
  const normalizedSessionId = sessionId.trim();

  if (!normalizedSessionId) {
    throw new Error(
      "Stripe Checkout session ID is required.",
    );
  }

  const response = await fetch(
    `${API_BASE_URL}/v1/billing/confirm-checkout/${encodeURIComponent(
      normalizedSessionId,
    )}`,
    {
      method: "POST",
      headers: getJsonAuthorizationHeaders(),
    },
  );

  const body = await readResponseBody(response);

  if (!response.ok) {
    throw new Error(
      getApiErrorMessage(
        body,
        "Unable to activate your subscription.",
      ),
    );
  }

  return body as CheckoutConfirmationResponse;
}

export async function createCustomerPortalSession(): Promise<string> {
  const response = await fetch(
    `${API_BASE_URL}/v1/billing/customer-portal`,
    {
      method: "POST",
      headers: getJsonAuthorizationHeaders(),
    },
  );

  const body = await readResponseBody(response);

  if (!response.ok) {
    throw new Error(
      getApiErrorMessage(
        body,
        "Unable to open billing management.",
      ),
    );
  }

  if (
    !body ||
    typeof body !== "object" ||
    !("url" in body) ||
    typeof (body as CustomerPortalSessionResponse).url !==
      "string"
  ) {
    throw new Error(
      "Stripe Customer Portal URL was not returned.",
    );
  }

  return (body as CustomerPortalSessionResponse).url;}