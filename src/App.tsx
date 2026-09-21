import { useEffect, useMemo, useRef, useState } from "react";
import type { CSSProperties } from "react";

import ExplainPage from "./pages/ExplainPage";
import DashboardPage from "./pages/DashboardPage";


import LoginPage from "./pages/LoginPage";
import EnterpriseConnectionsPage from "./pages/EnterpriseConnectionsPage";
import WelcomeOnboardingPage from "./pages/WelcomeOnboardingPage";
import {
  getOnboardingStatus,
  inviteOrganizationUser,
  refreshAuthContext,
} from "./api/client";
import TrialStatusBadge from "./components/TrialStatusBadge";
import SubscriptionSuccessPage from "./pages/SubscriptionSuccessPage";
import GovernanceCenterPage from "./pages/GovernanceCenterPage";

import type {
  OnboardingStatusResponse,
  ProductAccessErrorDetail,
} from "./api/types";


type UserInfo = {
  email?: string;
  name?: string;
  picture?: string;
  user_id?: string;
  customer_id?: string;
  organization_id?: string;
};

function HeaderMetrics() {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 8,
        padding: "6px 9px",
        border: "1px solid #e5e7eb",
        borderRadius: 12,
        background: "#fff",
        flexShrink: 0,
      }}
>
      <MetricPill
  label="AI Confidence"
  value="N/A"
  tone="#64748b"
/>

<span style={{ opacity: 0.5, margin: "0 6px" }}>
  |
</span>

      <MetricPill
        label="Overrides"
        value="0"
        tone="#64748b"
      />

      <span style={{ opacity: 0.5, margin: "0 6px" }}>
        |
      </span>

      <MetricPill
        label="Risk"
        value="N/A"
        tone="#64748b"
      />
</div>
  );
}

function MetricPill(props: {
  label: string;
  value: string;
  tone: string;
}) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 7,
        whiteSpace: "nowrap",
      }}
    >
      <span style={{ fontSize: 11, color: "#6b7280" }}>
        {props.label}
      </span>

      <span
        style={{
          fontSize: 11,
          fontWeight: 700,
          color: props.tone,
        }}
      >
        {props.value}
      </span>
    </div>
  );
}

function decodeJwtPayload(
  token: string,
): Record<string, unknown> | null {
  try {
    const parts = token.split(".");
    if (parts.length !== 3) {
      return null;
    }

    const base64Url = parts[1];
    const base64 = base64Url
      .replace(/-/g, "+")
      .replace(/_/g, "/")
      .padEnd(
        Math.ceil(base64Url.length / 4) * 4,
        "=",
      );

    return JSON.parse(
      atob(base64),
    ) as Record<string, unknown>;
  } catch {
    return null;
  }
}

function readUserFromToken(): UserInfo | null {
  const token = localStorage.getItem("token");

  if (!token) {
    return null;
  }

  const payload = decodeJwtPayload(token);

  if (!payload) {
    return null;
  }

  // Reject expired JWTs.
  if (
    typeof payload.exp === "number" &&
    payload.exp * 1000 <= Date.now()
  ) {
    return null;
  }

  return {
    email:
      typeof payload.email === "string"
        ? payload.email
        : undefined,
    name:
      typeof payload.name === "string"
        ? payload.name
        : undefined,
    picture:
      typeof payload.picture === "string"
        ? payload.picture
        : undefined,
    user_id:
      typeof payload.user_id === "string"
        ? payload.user_id
        : undefined,
    customer_id:
      typeof payload.customer_id === "string"
        ? payload.customer_id
        : undefined,
    organization_id:
      typeof payload.organization_id === "string"
        ? payload.organization_id
        : undefined,
  };
}


function readStoredProductAccessError():
  ProductAccessErrorDetail | null {
  const raw = sessionStorage.getItem(
    "product_access_error",
  );

  if (!raw) {
    return null;
  }

  try {
    const parsed = JSON.parse(raw) as
      Partial<ProductAccessErrorDetail>;

    if (
      typeof parsed.code !== "string" ||
      typeof parsed.message !== "string"
    ) {
      sessionStorage.removeItem(
        "product_access_error",
      );
      return null;
    }

    return {
      code: parsed.code,
      subscription_status:
        typeof parsed.subscription_status === "string"
          ? parsed.subscription_status
          : undefined,
      trial_expired:
        typeof parsed.trial_expired === "boolean"
          ? parsed.trial_expired
          : false,
      trial_ends_at:
        typeof parsed.trial_ends_at === "string"
          ? parsed.trial_ends_at
          : parsed.trial_ends_at === null
            ? null
            : undefined,
      message: parsed.message,
    };
  } catch {
    sessionStorage.removeItem(
      "product_access_error",
    );
    return null;
  }
}


export default function App() {
  const [tab, setTab] = useState<"explain" | "dashboard" | "connections" | "governance">("explain");
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const [user, setUser] = useState<UserInfo | null>(null);
  const [profileOpen, setProfileOpen] = useState(false);

  const [
    productAccessError,
    setProductAccessError,
  ] = useState<ProductAccessErrorDetail | null>(
    () => readStoredProductAccessError(),
  );

  const productAccessLocked =
    productAccessError !== null;
  
  const [onboardingStatus, setOnboardingStatus] =
    useState<OnboardingStatusResponse | null>(null);

  const [onboardingLoading, setOnboardingLoading] =
    useState(true);

  const [onboardingError, setOnboardingError] =
    useState<string | null>(null);

  const [showInviteUser, setShowInviteUser] =
    useState(false);

  const [showSupportEmail, setShowSupportEmail] =
    useState(false);

  const [inviteEmail, setInviteEmail] =
    useState("");

  const [inviteDisplayName, setInviteDisplayName] =
    useState("");

  const [inviteOrganizationRole, setInviteOrganizationRole] =
    useState("STEWARD");

  const [inviteBillingRole, setInviteBillingRole] =
    useState("MEMBER");

  const [inviteSubmitting, setInviteSubmitting] =
    useState(false);

  const [inviteError, setInviteError] =
    useState<string | null>(null);

  const [inviteSuccess, setInviteSuccess] =
    useState<string | null>(null);

  const organizationId =
    onboardingStatus?.organization_id ??
    user?.organization_id ??
    null;

  const organizationName =
    onboardingStatus?.organization_name ??
    null;

  const tokenOrganizationId =
    user?.organization_id ??
    null;

  const tenantMismatch = Boolean(
    tokenOrganizationId &&
      onboardingStatus?.organization_id &&
      tokenOrganizationId !== onboardingStatus.organization_id,
  );

  const [connectionSuccessMessage, setConnectionSuccessMessage] =
  useState<string | null>(null);

  const profileRef = useRef<HTMLDivElement | null>(null);
  const [showSubscriptionSuccess, setShowSubscriptionSuccess] =
  useState(false);

  async function loadOnboardingStatus(): Promise<void> {
    setOnboardingLoading(true);
    setOnboardingError(null);

    try {
      const status = await getOnboardingStatus();
      setOnboardingStatus(status);
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Unable to load customer onboarding status.";

      setOnboardingError(message);
    } finally {
      setOnboardingLoading(false);
    }
  }

    const inactivityTimerRef = 
      useRef<number | null>(null);

    const INACTIVITY_TIMEOUT_MS = 
      60 * 60 * 1000;

  useEffect(() => {
  const token = localStorage.getItem("token");
  const isLoginPath =
    window.location.pathname === "/login";

  const tokenUser =
    token ? readUserFromToken() : null;

  // No token or invalid/expired token.
  if (!token || !tokenUser) {
    localStorage.removeItem("token");

    if (!isLoginPath) {
      window.location.replace("/login");
      return;
    }

    setIsAuthenticated(false);
    setUser(null);
    return;
  }

  // Valid authenticated user should not remain
  // on the login page.
  if (isLoginPath) {
    window.location.replace("/");
    return;
  }

  setUser(tokenUser);
  setIsAuthenticated(true);
}, []);

  useEffect(() => {
    function handleProductAccessRequired(
      event: Event,
    ) {
      const customEvent =
        event as CustomEvent<ProductAccessErrorDetail>;

      const detail = customEvent.detail;

      if (!detail) {
        return;
      }

      setProductAccessError(detail);
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

  useEffect(() => {
  if (isAuthenticated !== true) {
    return;
  }

  const logoutForInactivity = () => {
    localStorage.removeItem("token");

    sessionStorage.setItem(
      "logout_reason",
      "inactive",
    );

    setUser(null);
    setIsAuthenticated(false);

    window.location.replace("/login");
  };

  const resetInactivityTimer = () => {
    if (inactivityTimerRef.current !== null) {
      window.clearTimeout(
        inactivityTimerRef.current,
      );
    }

    inactivityTimerRef.current =
      window.setTimeout(
        logoutForInactivity,
        INACTIVITY_TIMEOUT_MS,
      );
  };

  const activityEvents = [
    "mousedown",
    "keydown",
    "touchstart",
    "scroll",
  ] as const;

  activityEvents.forEach((eventName) => {
    window.addEventListener(
      eventName,
      resetInactivityTimer,
      { passive: true },
    );
  });

  resetInactivityTimer();

  return () => {
    if (inactivityTimerRef.current !== null) {
      window.clearTimeout(
        inactivityTimerRef.current,
      );

      inactivityTimerRef.current = null;
    }

    activityEvents.forEach((eventName) => {
      window.removeEventListener(
        eventName,
        resetInactivityTimer,
      );
    });
  };
}, [isAuthenticated]);

  useEffect(() => {
  const params = new URLSearchParams(
    window.location.search,
  );

  const page = params.get("page");

  if (page === "subscription-success") {
    setShowSubscriptionSuccess(true);
  }
}, []);

  useEffect(() => {
    const params = new URLSearchParams(
      window.location.search,
    );

    const page = params.get("page");
    const googleOAuth = params.get("google_oauth");
    const connectionId = params.get("connection_id");
    const vendor = params.get("vendor");
    
    console.log("GOOGLE OAUTH CALLBACK DEBUG", {
    href: window.location.href,
    page,
    googleOAuth,
    connectionId,
    vendor,
  });

    if (page === "connections") {
      setTab("connections");
    }

    if (
      googleOAuth === "success" &&
      vendor === "bigquery" &&
      connectionId
    ) {
      localStorage.setItem(
        "google_oauth_connection_id",
        connectionId,
      );

      setConnectionSuccessMessage(
        "Successfully connected to Google BigQuery. " +
          "Google authorization is active.",
      );

      params.delete("google_oauth");
      params.delete("connection_id");
      params.delete("vendor");
      params.delete("page");

      const remainingQuery = params.toString();

      window.history.replaceState(
        {},
        "",
        `${window.location.pathname}${
          remainingQuery
            ? `?${remainingQuery}`
            : ""
        }`,
      );
    }
  }, []);
  useEffect(() => {
    if (isAuthenticated !== true) {
      return;
    }

    void loadOnboardingStatus();
  }, [isAuthenticated]);

  useEffect(() => {
    if (!onboardingStatus) {
      return;
    }

    const subscriptionStatus = String(
      onboardingStatus.subscription_status ?? "",
    )
      .trim()
      .toUpperCase();

    const trialEndRaw =
      onboardingStatus.trial_end_date ?? null;

    const trialEndMs =
      trialEndRaw
        ? Date.parse(trialEndRaw)
        : Number.NaN;

    const trialHasExpired =
      (
        subscriptionStatus === "TRIAL" ||
        subscriptionStatus === "TRIALING"
      ) &&
      Number.isFinite(trialEndMs) &&
      trialEndMs <= Date.now();

    const inactivePaidStates = new Set([
      "PAST_DUE",
      "UNPAID",
      "CANCELED",
      "CANCELLED",
      "INCOMPLETE",
      "INCOMPLETE_EXPIRED",
      "EXPIRED",
    ]);

    if (subscriptionStatus === "ACTIVE") {
      sessionStorage.removeItem(
        "product_access_error",
      );
      setProductAccessError(null);
      return;
    }

    if (
      (
        subscriptionStatus === "TRIAL" ||
        subscriptionStatus === "TRIALING"
      ) &&
      !trialHasExpired
    ) {
      sessionStorage.removeItem(
        "product_access_error",
      );
      setProductAccessError(null);
      return;
    }

    if (trialHasExpired) {
      const detail: ProductAccessErrorDetail = {
        code: "TRIAL_EXPIRED",
        subscription_status:
          subscriptionStatus,
        trial_expired: true,
        trial_ends_at: trialEndRaw,
        message:
          "Your 14-day trial has expired. " +
          "Activate your subscription to continue " +
          "using AI Data Steward Copilot.",
      };

      sessionStorage.setItem(
        "product_access_error",
        JSON.stringify(detail),
      );

      setProductAccessError(detail);
      return;
    }

    if (inactivePaidStates.has(subscriptionStatus)) {
      const detail: ProductAccessErrorDetail = {
        code: "SUBSCRIPTION_INACTIVE",
        subscription_status:
          subscriptionStatus,
        trial_expired: false,
        message:
          "Your subscription is not active. " +
          "Please update billing to continue.",
      };

      sessionStorage.setItem(
        "product_access_error",
        JSON.stringify(detail),
      );

      setProductAccessError(detail);
    }
  }, [onboardingStatus]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (!profileRef.current) return;
      if (!profileRef.current.contains(event.target as Node)) {
        setProfileOpen(false);
      }
    }

    function handleEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setProfileOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleEscape);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleEscape);
    };
  }, []);

  const initials = useMemo(() => {
    const source = user?.name || user?.email || "";
    if (!source) return "U";

    const parts = source.trim().split(/\s+/);
    if (parts.length >= 2) {
      return `${parts[0][0] ?? ""}${parts[1][0] ?? ""}`.toUpperCase();
    }

    return source.slice(0, 2).toUpperCase();
  }, [user]);

  function handleLogout() {
    localStorage.removeItem("token");
    sessionStorage.removeItem(
      "product_access_error",
    );

    for (const key of Object.keys(localStorage)) {
      if (
        key.startsWith("adms_tenant_") ||
        key.startsWith("adms_workspace_")
      ) {
        localStorage.removeItem(key);
      }
    }

    setOnboardingStatus(null);
    setUser(null);
    window.location.href = "/login";
  }

  if (isAuthenticated === null) {
    return null;
  }

  if (!isAuthenticated) {
    return <LoginPage />;
  }

  if (onboardingLoading) {
  return (
    <div
      style={{
        minHeight: "100vh",
        display: "grid",
        placeItems: "center",
        background: "#f8fafc",
      }}
    >
      <div
        style={{
          padding: 28,
          borderRadius: 16,
          background: "#ffffff",
          border: "1px solid #dbe5f1",
          boxShadow:
            "0 18px 50px rgba(15, 23, 42, 0.10)",
          textAlign: "center",
        }}
      >
        <div
          style={{
            color: "#173c72",
            fontSize: 18,
            fontWeight: 800,
          }}
        >
          AI Data Steward Copilot®
        </div>

        <div
          style={{
            marginTop: 10,
            color: "#3b7354",
            fontSize: 14,
          }}
        >
          Hang tight — we’re verifying your credentials and license.
        </div>
      </div>
    </div>
  );
}

if (onboardingError) {
  return (
    <div
      style={{
        minHeight: "100vh",
        display: "grid",
        placeItems: "center",
        padding: 24,
        background: "#f8fafc",
      }}
    >
      <div
        role="alert"
        style={{
          width: "min(520px, 100%)",
          padding: 26,
          borderRadius: 16,
          background: "#ffffff",
          border: "1px solid #fecaca",
          boxShadow:
            "0 18px 50px rgba(15, 23, 42, 0.10)",
        }}
      >
        <div
          style={{
            color: "#991b1b",
            fontSize: 18,
            fontWeight: 800,
          }}
        >
          Unable to load your workspace
        </div>

        <div
          style={{
            marginTop: 10,
            color: "#7f1d1d",
            fontSize: 14,
            lineHeight: 1.6,
          }}
        >
          {onboardingError}
        </div>

        <button
          type="button"
          onClick={() => {
            void loadOnboardingStatus();
          }}
          style={{
            marginTop: 20,
            padding: "11px 18px",
            border: "none",
            borderRadius: 10,
            background: "#1d4ed8",
            color: "#ffffff",
            fontWeight: 800,
            cursor: "pointer",
          }}
        >
          Try Again
        </button>
      </div>
    </div>
  );
}

if (
  onboardingStatus?.onboarding_complete &&
  (!organizationId || tenantMismatch)
) {
  return (
    <div
      style={{
        minHeight: "100vh",
        display: "grid",
        placeItems: "center",
        padding: 24,
        background: "#f8fafc",
      }}
    >
      <div
        role="alert"
        style={{
          width: "min(560px, 100%)",
          padding: 28,
          borderRadius: 16,
          background: "#ffffff",
          border: "1px solid #fecaca",
          boxShadow:
            "0 18px 50px rgba(15, 23, 42, 0.10)",
        }}
      >
        <div
          style={{
            color: "#991b1b",
            fontSize: 18,
            fontWeight: 800,
          }}
        >
          Workspace security check failed
        </div>

        <div
          style={{
            marginTop: 10,
            color: "#7f1d1d",
            fontSize: 14,
            lineHeight: 1.6,
          }}
        >
          Your authenticated tenant context does not match the
          workspace returned by the API. Sign out and sign back in
          before continuing.
        </div>

        <button
          type="button"
          onClick={handleLogout}
          style={{
            marginTop: 20,
            padding: "11px 18px",
            border: "none",
            borderRadius: 10,
            background: "#b91c1c",
            color: "#ffffff",
            fontWeight: 800,
            cursor: "pointer",
          }}
        >
          Sign Out
        </button>
      </div>
    </div>
  );
}

if (showSubscriptionSuccess) {
  return (
    <SubscriptionSuccessPage
      onContinue={() => {
        setShowSubscriptionSuccess(false);
        setTab("connections");

        window.history.replaceState(
          {},
          document.title,
          window.location.pathname,
        );
      }}
    />
  );
}
if (!onboardingStatus?.onboarding_complete) {

  return (
    <div
      style={{
        position: "relative",
        minHeight: "100vh",
      }}
    >
      <button
        type="button"
        onClick={handleLogout}
        style={{
          position: "fixed",
          top: 18,
          right: 24,
          zIndex: 1000,
          padding: "10px 16px",
          borderRadius: 10,
          border: "1px solid #d1d5db",
          background: "#ffffff",
          color: "#173c72",
          fontSize: 13,
          fontWeight: 700,
          cursor: "pointer",
          boxShadow:
            "0 4px 12px rgba(15, 23, 42, 0.08)",
        }}
      >
        Sign Out
      </button>

        <WelcomeOnboardingPage
          onComplete={async () => {
            const refreshed =
              await refreshAuthContext();

            setUser({
              email: refreshed.user.email,
              name:
                refreshed.user.name ?? undefined,
              picture:
                refreshed.user.picture ?? undefined,
              user_id:
                refreshed.user.user_id ?? undefined,
              customer_id:
                refreshed.user.customer_id ??
                undefined,
              organization_id:
                refreshed.user.organization_id ??
                undefined,
            });

            await loadOnboardingStatus();

            setTab("connections");
  }}
/>
    </div>
  );
}

async function handleInviteUser() {
  const normalizedEmail = inviteEmail.trim();
  const normalizedDisplayName = inviteDisplayName.trim();

  if (!normalizedEmail) {
    setInviteError("Email address is required.");
    return;
  }

  try {
    setInviteSubmitting(true);
    setInviteError(null);
    setInviteSuccess(null);

    await inviteOrganizationUser({
      email: normalizedEmail,
      display_name: normalizedDisplayName,
      organization_role: inviteOrganizationRole,
      billing_role: inviteBillingRole,
    });

    setInviteSuccess(
      `Invitation sent to ${normalizedEmail}.`,
    );

    setInviteEmail("");
    setInviteDisplayName("");
    setInviteOrganizationRole("STEWARD");
    setInviteBillingRole("MEMBER");
  } catch (err) {
    setInviteError(
      err instanceof Error
        ? err.message
        : "Unable to invite user.",
    );
  } finally {
    setInviteSubmitting(false);
  }
}

return (
  <div
  style={{
    minHeight: "100vh",
    background: "#fff",
    width: "100%",
    maxWidth: "100vw",
    overflowX: "hidden",
  }}
>
  <header
    style={{
      borderBottom: "1px solid #eee",
      padding: "8px 16px",
      display: "grid",
      gridTemplateColumns: "1fr auto",
      gridTemplateRows: "auto auto",
      alignItems: "center",
      gap: "6px 16px",
      width: "100%",
      boxSizing: "border-box",
    }}
  >
    {/* ROW 1 LEFT: Brand + workspace */}
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 10,
        minWidth: 0,
      }}
    >
      <div
        style={{
          fontWeight: 800,
          fontSize: 18,
          color: "#173c72",
          whiteSpace: "nowrap",
          lineHeight: 1.1,
          flexShrink: 0,
        }}
      >
        AI Data Steward Copilot®
      </div>
    </div>

    {/* ROW 1 RIGHT: Subscription + user */}
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "flex-end",
        gap: 10,
        minWidth: 0,
      }}
    >
      <TrialStatusBadge />

      <div
        ref={profileRef}
        style={{
          position: "relative",
          display: "flex",
          alignItems: "center",
          paddingLeft: 12,
          borderLeft: "1px solid #e5e7eb",
          minWidth: 0,
        }}
      >
        <button
          type="button"
          onClick={() => setProfileOpen((v) => !v)}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            background: "#fff",
            border: "1px solid transparent",
            borderRadius: 12,
            padding: "6px 8px",
            cursor: "pointer",
            minWidth: 0,
          }}
        >
          {user?.picture ? (
            <img
              src={user.picture}
              alt={user?.name || user?.email || "User"}
              referrerPolicy="no-referrer"
              style={{
                width: 34,
                height: 34,
                borderRadius: "50%",
                objectFit: "cover",
                border: "1px solid #ddd",
                flexShrink: 0,
              }}
            />
          ) : (
            <div
              style={{
                width: 34,
                height: 34,
                borderRadius: "50%",
                background: "#eef2ff",
                color: "#7c3aed",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 12,
                fontWeight: 700,
                border: "1px solid #ddd6fe",
                flexShrink: 0,
              }}
            >
              {initials}
            </div>
          )}

          <div
            style={{
              lineHeight: 1.15,
              textAlign: "left",
              minWidth: 0,
            }}
          >
            {user?.name && (
              <div
                style={{
                  fontSize: 13,
                  fontWeight: 600,
                  whiteSpace: "nowrap",
                }}
              >
                {user.name}
              </div>
            )}

            <div
              style={{
                fontSize: 12,
                color: "#6b7280",
                maxWidth: 180,
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}
            >
              {user?.email || "Authenticated user"}
            </div>
          </div>

          <div
            style={{
              fontSize: 12,
              color: "#6b7280",
              transform: profileOpen
                ? "rotate(180deg)"
                : "rotate(0deg)",
              transition: "transform 0.15s ease",
              marginLeft: 2,
            }}
          >
            ▼
          </div>
        </button>

        {profileOpen && (
          <div
            style={{
              position: "absolute",
              top: "calc(100% + 10px)",
              right: 0,
              width: 260,
              background: "#fff",
              border: "1px solid #e5e7eb",
              borderRadius: 14,
              boxShadow:
                "0 12px 32px rgba(0,0,0,0.10)",
              padding: 14,
              zIndex: 1000,
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                paddingBottom: 12,
                borderBottom: "1px solid #f1f5f9",
              }}
            >
              {user?.picture ? (
                <img
                  src={user.picture}
                  alt={
                    user?.name ||
                    user?.email ||
                    "User"
                  }
                  referrerPolicy="no-referrer"
                  style={{
                    width: 40,
                    height: 40,
                    borderRadius: "50%",
                    objectFit: "cover",
                    border: "1px solid #ddd",
                  }}
                />
              ) : (
                <div
                  style={{
                    width: 40,
                    height: 40,
                    borderRadius: "50%",
                    background: "#eef2ff",
                    color: "#7c3aed",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: 13,
                    fontWeight: 700,
                    border: "1px solid #ddd6fe",
                  }}
                >
                  {initials}
                </div>
              )}

              <div style={{ minWidth: 0 }}>
                <div
                  style={{
                    fontSize: 14,
                    fontWeight: 700,
                    color: "#111827",
                  }}
                >
                  {user?.name || "Authenticated User"}
                </div>

                <div
                  style={{
                    fontSize: 12,
                    color: "#6b7280",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}
                >
                  {user?.email || "No email available"}
                </div>
              </div>
            </div>

            <div
              style={{
                paddingTop: 12,
                paddingBottom: 12,
                display: "grid",
                gap: 8,
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  fontSize: 12,
                  color: "#6b7280",
                }}
              >
                <span>Session</span>
                <span
                  style={{
                    color: "#16a34a",
                    fontWeight: 600,
                  }}
                >
                  Active
                </span>
              </div>

              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  fontSize: 12,
                  color: "#6b7280",
                }}
              >
                <span>Authentication</span>
                <span
                  style={{
                    color: "#111827",
                    fontWeight: 600,
                  }}
                >
                  Google
                </span>
              </div>

              {organizationName && (
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    gap: 12,
                    fontSize: 12,
                    color: "#6b7280",
                  }}
                >
                  <span>Workspace</span>

                  <span
                    title={organizationId ?? undefined}
                    style={{
                      color: "#111827",
                      fontWeight: 600,
                      maxWidth: 150,
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {organizationName}
                  </span>
                </div>
              )}
            </div>

            <button
              type="button"
              disabled={productAccessLocked}
              onClick={() => {
                if (productAccessLocked) {
                  return;
                }

                setShowInviteUser((current) => !current);
                setShowSupportEmail(false);
                setInviteError(null);
                setInviteSuccess(null);
              }}
              style={{
                width: "100%",
                padding: "10px 12px",
                borderRadius: 10,
                border: "1px solid #bfdbfe",
                background: "#eff6ff",
                color: "#173c72",
                cursor: productAccessLocked
                  ? "not-allowed"
                  : "pointer",
                opacity: productAccessLocked
                  ? 0.55
                  : 1,
                fontSize: 13,
                fontWeight: 700,
                marginBottom: 8,
              }}
            >
              {productAccessLocked
                ? "Invite User — Locked"
                : showInviteUser
                  ? "Close Invite"
                  : "Invite User"}
            </button>

            {showInviteUser && (
              <div
                style={{
                  display: "grid",
                  gap: 8,
                  marginBottom: 10,
                  padding: 10,
                  border: "1px solid #e5e7eb",
                  borderRadius: 10,
                  background: "#f8fafc",
                }}
              >
                <input
                  type="email"
                  value={inviteEmail}
                  onChange={(event) =>
                    setInviteEmail(event.target.value)
                  }
                  placeholder="Email address"
                  style={{
                    padding: "9px 10px",
                    borderRadius: 8,
                    border: "1px solid #d1d5db",
                    fontSize: 12,
                  }}
                />

                <input
                  value={inviteDisplayName}
                  onChange={(event) =>
                    setInviteDisplayName(event.target.value)
                  }
                  placeholder="Display name"
                  style={{
                    padding: "9px 10px",
                    borderRadius: 8,
                    border: "1px solid #d1d5db",
                    fontSize: 12,
                  }}
                />

                <select
                  value={inviteOrganizationRole}
                  onChange={(event) =>
                    setInviteOrganizationRole(
                      event.target.value,
                    )
                  }
                  style={{
                    padding: "9px 10px",
                    borderRadius: 8,
                    border: "1px solid #d1d5db",
                    fontSize: 12,
                  }}
                >
                  <option value="STEWARD">Steward</option>
                  <option value="ADMIN">Admin</option>
                  <option value="VIEWER">Viewer</option>
                </select>

                <select
                  value={inviteBillingRole}
                  onChange={(event) =>
                    setInviteBillingRole(
                      event.target.value,
                    )
                  }
                  style={{
                    padding: "9px 10px",
                    borderRadius: 8,
                    border: "1px solid #d1d5db",
                    fontSize: 12,
                  }}
                >
                  <option value="MEMBER">Member</option>
                  <option value="BILLING_ADMIN">Billing Admin</option>
                </select>

                <button
                  type="button"
                  disabled={
                    inviteSubmitting ||
                    !inviteEmail.trim()
                  }
                  onClick={() => {
                    void handleInviteUser();
                  }}
                  style={{
                    padding: "9px 10px",
                    borderRadius: 8,
                    border: "none",
                    background: inviteSubmitting
                      ? "#94a3b8"
                      : "#2563eb",
                    color: "#ffffff",
                    fontSize: 12,
                    fontWeight: 700,
                    cursor: inviteSubmitting
                      ? "default"
                      : "pointer",
                  }}
                >
                  {inviteSubmitting
                    ? "Sending..."
                    : "Send Invitation"}
                </button>

                {inviteSuccess && (
                  <div
                    style={{
                      color: "#166534",
                      fontSize: 12,
                    }}
                  >
                    {inviteSuccess}
                  </div>
                )}

                {inviteError && (
                  <div
                    role="alert"
                    style={{
                      color: "#b91c1c",
                      fontSize: 12,
                    }}
                  >
                    {inviteError}
                  </div>
                )}
              </div>
            )}

            <button
              type="button"
              onClick={() => {
              setShowSupportEmail((current) => !current);
              setShowInviteUser(false);
            }}
              style={{
                width: "100%",
                padding: "10px 12px",
                borderRadius: 10,
                border: "1px solid #bbf7d0",
                background: "#f0fdf4",
                color: "#166534",
                cursor: "pointer",
                fontSize: 13,
                fontWeight: 700,
                marginBottom: 8,
              }}
            >
              {showSupportEmail
                ? "Close Support"
                : "Support Email"}
            </button>

      {showSupportEmail && (
        <div
          style={{
            display: "grid",
            gap: 8,
            marginBottom: 10,
            padding: 10,
            border: "1px solid #dcfce7",
            borderRadius: 10,
            background: "#f8fafc",
          }}
        >
          <button
            type="button"
            onClick={() => {
              const subject =
                "AI Data Steward Copilot Support Request";

              const body = [
                "Hello ADMS Support,",
                "",
                "I need assistance with AI Data Steward Copilot.",
                "",
                `Workspace: ${organizationName || "N/A"}`,
                `User: ${user?.email || "N/A"}`,
                "",
                "Issue:",
                "",
                "",
                "Thank you,",
              ].join("\n");

              const gmailUrl =
                "https://mail.google.com/mail/?view=cm&fs=1" +
                `&to=${encodeURIComponent(
                  "support@admsdata.com",
                )}` +
                `&su=${encodeURIComponent(subject)}` +
                `&body=${encodeURIComponent(body)}`;

              window.open(
                gmailUrl,
                "_blank",
                "noopener,noreferrer",
              );
            }}
            style={{
              width: "100%",
              padding: "9px 10px",
              borderRadius: 8,
              border: "1px solid #bbf7d0",
              background: "#ffffff",
              color: "#166534",
              cursor: "pointer",
              fontSize: 12,
              fontWeight: 700,
            }}
          >
            Open Gmail
          </button>

          <button
            type="button"
            onClick={() => {
              const subject =
                "AI Data Steward Copilot Support Request";

              const body = [
                "Hello ADMS Support,",
                "",
                "I need assistance with AI Data Steward Copilot.",
                "",
                `Workspace: ${organizationName || "N/A"}`,
                `User: ${user?.email || "N/A"}`,
                "",
                "Issue:",
                "",
                "",
                "Thank you,",
              ].join("\n");

              window.location.href =
                `mailto:support@admsdata.com` +
                `?subject=${encodeURIComponent(subject)}` +
                `&body=${encodeURIComponent(body)}`;
            }}
            style={{
              width: "100%",
              padding: "9px 10px",
              borderRadius: 8,
              border: "1px solid #d1d5db",
              background: "#ffffff",
              color: "#173c72",
              cursor: "pointer",
              fontSize: 12,
              fontWeight: 700,
            }}
          >
            Open Default Email App
          </button>
        </div>
      )}

            <button
              onClick={handleLogout}
              style={{
                width: "100%",
                padding: "10px 12px",
                borderRadius: 10,
                border: "1px solid #e5e7eb",
                background: "#fff",
                cursor: "pointer",
                fontSize: 13,
                fontWeight: 600,
              }}
            >
              Sign Out
            </button>
          </div>
        )}
      </div>
    </div>

    {/* ROW 2 LEFT: Navigation */}
    <nav
      style={{
        display: "flex",
        alignItems: "center",
        gap: 8,
        flexWrap: "wrap",
        minWidth: 0,
      }}
    >
      <button
        onClick={() => setTab("explain")}
        style={tabBtn(tab === "explain")}
      >
        Explain
      </button>

      <button
        onClick={() => setTab("dashboard")}
        style={tabBtn(tab === "dashboard")}
      >
        Dashboard
      </button>

      <button
        onClick={() => setTab("governance")}
        style={tabBtn(tab === "governance")}
      >
        Governance
      </button>

      <button
        onClick={() => setTab("connections")}
        style={tabBtn(tab === "connections")}
      >
        Enterprise Connections
      </button>
    </nav>

    {/* ROW 2 RIGHT: AI operational metrics */}
    <div
      style={{
        display: "flex",
        justifyContent: "flex-end",
        alignItems: "center",
        minWidth: 0,
      }}
    >
      <HeaderMetrics />
    </div>
  </header>

  {productAccessError && (
    <div
      role="alert"
      style={{
        margin: "12px auto 0",
        width: "min(1360px, calc(100% - 32px))",
        boxSizing: "border-box",
        padding: "14px 16px",
        borderRadius: 12,
        border: "1px solid #f59e0b",
        background: "#fffbeb",
        display: "flex",
        alignItems: "flex-start",
        justifyContent: "space-between",
        gap: 16,
      }}
    >
      <div style={{ minWidth: 0 }}>
        <div
          style={{
            fontSize: 13,
            fontWeight: 800,
            color: "#92400e",
          }}
        >
          Read-only access
        </div>

        <div
          style={{
            marginTop: 4,
            fontSize: 13,
            lineHeight: 1.5,
            color: "#78350f",
          }}
        >
          {productAccessError.message}
          {" "}
          Your existing dashboards and history remain
          available, but new profiling, AI analysis,
          remediation, policy changes, connections, and
          other paid actions are locked.
        </div>
      </div>

      <div
        style={{
          flexShrink: 0,
          padding: "6px 10px",
          borderRadius: 999,
          background: "#fef3c7",
          color: "#92400e",
          fontSize: 11,
          fontWeight: 800,
          whiteSpace: "nowrap",
        }}
      >
        {productAccessError.code === "TRIAL_EXPIRED"
          ? "TRIAL EXPIRED"
          : "SUBSCRIPTION REQUIRED"}
      </div>
    </div>
  )}

  <main
      style={{
        maxWidth: tab === "connections" ? "none" : 1400,
        margin: "0 auto",
        padding:
          tab === "connections"
            ? 0
            : "4px 24px 40px",
      }}
    >

      {tab === "explain" && <ExplainPage 
            organizationId={organizationId}
            organizationName={organizationName}
/>}

      {tab === "dashboard" && (<DashboardPage
              onNavigate={(destination) => {
                setTab(destination);
              }}
            />
          )}

      {tab === "governance" && (
        <GovernanceCenterPage
              organizationId={organizationId}
              organizationName={organizationName}
            />)}

      {tab === "connections" && (<EnterpriseConnectionsPage
          successMessage={connectionSuccessMessage}
          onDismissSuccess={() => {
            setConnectionSuccessMessage(null);
          }}
        />
      )}
</main>
      </div>
);
}

function tabBtn(active: boolean): CSSProperties {
  return {
    padding: "10px 16px",
    borderRadius: 12,

    border: active
      ? "1px solid #2563eb"
      : "1px solid #dbe4f0",

    background: active
      ? "linear-gradient(135deg,#2563eb,#1d4ed8)"
      : "#ffffff",

    color: active
      ? "#ffffff"
      : "#173c72",

    fontWeight: 700,
    cursor: "pointer",
    whiteSpace: "nowrap",
    flexShrink: 0,

    transition: "all .25s ease",
    letterSpacing: active ? "0.2px" : "0px",

    boxShadow: active
      ? "0 0 0 2px rgba(34,197,94,.14), 0 8px 18px rgba(34,197,94,.22)"
      : "0 2px 6px rgba(15,23,42,.06)",

    transform: active
      ? "translateY(-1px)"
      : "translateY(0)",
  };
}
