import { useEffect, useState } from "react";
import loginBackground from "../assets/LoginBackground.png";
import {
  PublicClientApplication,
} from "@azure/msal-browser";

declare global {
  interface Window {
    google?: any;
  }
}

const microsoftAuth = new PublicClientApplication({
  auth: {
    clientId: import.meta.env.VITE_MICROSOFT_CLIENT_ID,
    authority:
      "https://login.microsoftonline.com/organizations",
    redirectUri:
      window.location.origin + "/auth-redirect.html",
  },
});

export default function LoginPage() {
  const [error, setError] = useState<string | null>(null);
  const [loggingIn, setLoggingIn] = useState(false);

  useEffect(() => {
    let tries = 0;

    function initGoogle() {
      if (!window.google?.accounts?.id) {
        tries += 1;

        if (tries < 30) {
          setTimeout(initGoogle, 300);
          return;
        }

        setError("Google Sign-In failed to load.");
        return;
      }

      const target = document.getElementById(
        "googleLoginDiv",
      );

      if (!target) {
        return;
      }

      target.innerHTML = "";

      window.google.accounts.id.initialize({
        client_id: import.meta.env.VITE_GOOGLE_CLIENT_ID,
        callback: handleCredentialResponse,
      });

      window.google.accounts.id.renderButton(target, {
        theme: "outline",
        size: "large",
        width: 320,
        text: "signin_with",
        shape: "rectangular",
      });
    }

    initGoogle();
  }, []);

  async function handleMicrosoftLogin() {
    try {
      setError(null);

      await microsoftAuth.initialize();

      const result = await microsoftAuth.loginPopup({
        scopes: ["openid", "profile", "email"],
        redirectUri:
          window.location.origin +
          "/auth-redirect.html",
        overrideInteractionInProgress: true,
      });


      if (!result.idToken) {
        setError(
          "Microsoft did not return a valid credential.",
        );
        return;
      }

      setLoggingIn(true);

      
      const res = await fetch(
        `${import.meta.env.VITE_API_BASE_URL}/auth/microsoft`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            credential: result.idToken,
          }),
        },
      );

      const text = await res.text();

      if (!res.ok) {
        throw new Error(
          text || `HTTP ${res.status}`,
        );
      }

      const data = JSON.parse(text);

      localStorage.setItem(
        "token",
        data.access_token,
      );

      window.location.href = "/";
    } catch (err) {
      setLoggingIn(false);
      console.error(
        "Microsoft login failed:",
        err,
      );
      setError("Microsoft login failed.");
    }
  }

  async function handleCredentialResponse(
    response: any,
  ) {
    try {
      setError(null);

      if (!response?.credential) {
        setError(
          "Google did not return a valid credential.",
        );
        return;
      }

      setLoggingIn(true);

      const res = await fetch(
        `${import.meta.env.VITE_API_BASE_URL}/auth/google`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            credential: response.credential,
          }),
        },
      );

      const text = await res.text();

      console.log(
        "Backend response:",
        text,
      );

      if (!res.ok) {
        throw new Error(
          text || `HTTP ${res.status}`,
        );
      }

      const data = JSON.parse(text);

      localStorage.setItem(
        "token",
        data.access_token,
      );

      window.location.replace("/");
    } catch (err) {
      setLoggingIn(false);
      console.error(err);
      setError("Google login failed.");
    }
  }

  if (loggingIn) {
  return (
    <div
      style={{
        minHeight: "100vh",
        width: "100vw",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        backgroundImage: `url(${loginBackground})`,
        backgroundSize: "cover",
        backgroundPosition: "center",
        backgroundRepeat: "no-repeat",
      }}
    >
      <style>
        {`
          @keyframes hourglassPulse {
            0%, 100% {
              transform: scale(1);
              opacity: 0.8;
            }
            50% {
              transform: scale(1.12);
              opacity: 1;
            }
          }
        `}
      </style>

      <div
        style={{
          textAlign: "center",
          color: "#5379b6",
        }}
      >
        <div
          style={{
            fontSize: 42,
            marginBottom: 12,
            animation: "hourglassPulse 1.4s ease-in-out infinite",
          }}
        >
          ⏳
        </div>

        <div
          style={{
            fontSize: 28,
            fontWeight: 800,
            marginBottom: 12,
          }}
        >
          Verifying your credentials
        </div>

        <div
          style={{
            fontSize: 16,
            color: "#e2e8f0", 
            fontWeight: 500,
          }}
        >
          Hang tight - we’re verifying your credentials, provisioned access and license.
        </div>
      </div>
    </div>
  );
}

  return (
    <div
      style={{
        minHeight: "100vh",
        width: "100vw",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        backgroundImage: `url(${loginBackground})`,
        backgroundSize: "cover",
        backgroundPosition: "center",
        backgroundRepeat: "no-repeat",
                padding: 24,
              }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: 440,
          background: "#ffffff",
          borderRadius: 20,
          border: "1px solid #e5e7eb",
          padding: "40px 36px",
          boxShadow:"0 30px 80px rgba(15, 23, 42, 0.22), 0 8px 24px rgba(15, 23, 42, 0.12)",
          textAlign: "center",
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "center",
            marginBottom: 16,
          }}
        >
          <img
            src="/copilot-logo.png"
            alt="AI Data Steward Copilot logo"
            style={{
              height: 56,
              width: "auto",
              display: "block",
            }}
          />
        </div>

        <h1
          style={{
            fontSize: 28,
            fontWeight: 600,
            marginBottom: 10,
          }}
        >
          AI Data Steward Copilot
        </h1>

        <p
          style={{
            color: "#6b7280",
            marginBottom: 28,
          }}
        >
          Sign in to continue
        </p>

       {/* Authentication buttons */}
<div
  style={{
    width: 320,
    margin: "0 auto",
  }}
>
  {/* Google */}
  <div
    id="googleLoginDiv"
    style={{
      width: 320,
      minHeight: 44,
      display: "flex",
      justifyContent: "center",
    }}
  />

  {/* Microsoft */}
  <button
    type="button"
    onClick={handleMicrosoftLogin}
    style={{
      width: "100%",
      height: 44,
      marginTop: 0,

      background: "#ffffff",
      border: "1px solid #8c8c8c",
      borderRadius: 4,

      fontFamily: "Roboto, Arial, sans-serif",
      fontSize: 14,
      fontWeight: 500,
      color: "#3c4043",

      cursor: "pointer",

      position: "relative",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",

      padding: 0,
      boxSizing: "border-box",
    }}
  >
    {/* Microsoft logo */}
    <span
      style={{
        position: "absolute",

        // Matches Google's visual icon inset
        left: 17,

        top: "50%",
        transform: "translateY(-50%)",

        display: "grid",
        gridTemplateColumns: "8px 8px",
        gridTemplateRows: "8px 8px",
        gap: 2,

        width: 18,
        height: 18,
      }}
    >
      <span
        style={{
          width: 8,
          height: 8,
          background: "#f25022",
        }}
      />
      <span
        style={{
          width: 8,
          height: 8,
          background: "#7fba00",
        }}
      />
      <span
        style={{
          width: 8,
          height: 8,
          background: "#00a4ef",
        }}
      />
      <span
        style={{
          width: 8,
          height: 8,
          background: "#ffb900",
        }}
      />
    </span>

    {/* Keep text mathematically centered */}
    <span
      style={{
        width: "100%",
        textAlign: "center",
        pointerEvents: "none",
      }}
    >
      Sign in with Microsoft
    </span>
  </button>
</div>

        <div
          style={{
            marginTop: 18,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 8,
            fontSize: 12,
            color: "#94a3b8",
            letterSpacing: 0.2,
          }}
        >
          <span
            style={{
              width: 8,
              height: 8,
              borderRadius: "50%",
              background: "#16a34a",
              display: "inline-block",
              boxShadow:
                "0 0 0 4px rgba(22,163,74,0.08)",
              flexShrink: 0,
    }}
  />
            <span>
              Secure enterprise authentication
            </span>
</div>

        {error && (
          <div
            style={{
              marginTop: 20,
              color: "#b91c1c",
              fontSize: 14,
            }}
          >
            {error}
          </div>
        )}
      </div>
    </div>
  );
}
