// DemoTermsGate.tsx
import React, { useEffect, useMemo, useState } from "react";

type DemoTermsGateProps = {
  productName?: string;
  companyName?: string;
  jurisdiction?: string; // e.g., "New York"
  versionDate?: string; // e.g., "2026-02-17"
  storageKey?: string;  // e.g., "demo_terms_v1_accepted"
  requireScrollToEnd?: boolean;
  onAccepted?: () => void;
  children: React.ReactNode;
};

export default function DemoTermsGate({
  productName = "[Product Name]",
  companyName = "[Your Company Name]",
  jurisdiction = "[State / Country]",
  versionDate = "[Date]",
  storageKey = "demo_terms_v1_accepted",
  requireScrollToEnd = true,
  onAccepted,
  children,
}: DemoTermsGateProps) {
  const [accepted, setAccepted] = useState(false);
  const [checked, setChecked] = useState(false);
  const [scrolledToEnd, setScrolledToEnd] = useState(!requireScrollToEnd);

  useEffect(() => {
    const already = localStorage.getItem(storageKey) === "true";
    if (already) setAccepted(true);
  }, [storageKey]);

  const canContinue = useMemo(() => {
    return checked && scrolledToEnd;
  }, [checked, scrolledToEnd]);

  const handleAccept = () => {
    if (!canContinue) return;
    localStorage.setItem(storageKey, "true");
    setAccepted(true);
    onAccepted?.();
  };

  if (accepted) return <>{children}</>;

  return (
    <div style={styles.page}>
      <div style={styles.card}>
        <div style={styles.header}>
          <div>
            <h1 style={styles.title}>Demo / Evaluation Terms</h1>
            <div style={styles.meta}>
              <span><b>Product:</b> {productName}</span>
              <span style={styles.dot}>•</span>
              <span><b>Company:</b> {companyName}</span>
              <span style={styles.dot}>•</span>
              <span><b>Last Updated:</b> {versionDate}</span>
            </div>
          </div>
        </div>

        <div
          style={styles.termsBox}
          onScroll={(e) => {
            if (!requireScrollToEnd) return;
            const el = e.currentTarget;
            const atEnd = el.scrollTop + el.clientHeight >= el.scrollHeight - 4;
            if (atEnd) setScrolledToEnd(true);
          }}
        >
          <p><b>Acceptance.</b> By accessing or using this demo environment (the “Demo”), you agree to these Demo / Evaluation Terms.</p>

          <p><b>Purpose.</b> The Demo is provided solely for evaluation, testing, and feedback purposes. No ownership or commercial rights are granted.</p>

          <p><b>Confidential &amp; Proprietary.</b> The Demo contains non-public features, workflows, designs, and trade secrets of {companyName}.</p>

          <p><b>You agree not to:</b></p>
          <ul>
            <li>Copy, reproduce, publish, or distribute any portion of the Demo</li>
            <li>Reverse engineer, decompile, or attempt to extract underlying logic, prompts, models, or code</li>
            <li>Replicate features, workflows, or designs for competitive purposes</li>
            <li>Share credentials, access links, screenshots, or recordings without written permission</li>
            <li>Benchmark or analyze the Demo for public disclosure</li>
            <li>Bypass security or access controls</li>
          </ul>

          <p><b>IP Ownership.</b> All rights, title, and interest in the Demo and related materials remain exclusively with {companyName}.</p>

          <p><b>Feedback.</b> Any feedback you provide may be used by {companyName} without restriction or compensation.</p>

          <p><b>No Warranties.</b> The Demo is provided “as-is” and may change or be discontinued at any time.</p>

          <p><b>Termination.</b> Access may be revoked at any time.</p>

          <p><b>Governing Law.</b> These terms are governed by the laws of {jurisdiction}.</p>

          {requireScrollToEnd && (
            <p style={styles.scrollHint}>
              {scrolledToEnd ? "✓ You’ve reached the end." : "Scroll to the bottom to enable acceptance."}
            </p>
          )}
        </div>

        <label style={styles.checkboxRow}>
          <input
            type="checkbox"
            checked={checked}
            onChange={(e) => setChecked(e.target.checked)}
          />
          <span style={{ marginLeft: 10 }}>
            I have read and agree to the Demo / Evaluation Terms.
          </span>
        </label>

        <div style={styles.actions}>
          <button
            onClick={handleAccept}
            disabled={!canContinue}
            style={{
              ...styles.button,
              ...(canContinue ? styles.buttonPrimary : styles.buttonDisabled),
            }}
          >
            I Agree &amp; Continue
          </button>

          <button
            onClick={() => window.location.assign("about:blank")}
            style={{ ...styles.button, ...styles.buttonSecondary }}
          >
            Decline
          </button>
        </div>

        <div style={styles.footer}>
          Tip: set <code>storageKey</code> to include a version (e.g., <code>demo_terms_v2_accepted</code>) so new terms re-prompt.
        </div>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  page: {
    minHeight: "100vh",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: 20,
    background: "#0b1220",
    color: "#e8eefc",
    fontFamily: "system-ui, -apple-system, Segoe UI, Roboto, Arial, sans-serif",
  },
  card: {
    width: "min(880px, 100%)",
    background: "#111a2e",
    border: "1px solid rgba(255,255,255,0.08)",
    borderRadius: 16,
    padding: 20,
    boxShadow: "0 12px 30px rgba(0,0,0,0.35)",
  },
  header: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  title: { margin: 0, fontSize: 22, letterSpacing: 0.2 },
  meta: { marginTop: 6, fontSize: 13, opacity: 0.85, display: "flex", flexWrap: "wrap", gap: 8 },
  dot: { opacity: 0.6 },
  termsBox: {
    height: 360,
    overflow: "auto",
    padding: 16,
    background: "rgba(255,255,255,0.04)",
    border: "1px solid rgba(255,255,255,0.08)",
    borderRadius: 12,
    lineHeight: 1.45,
  },
  scrollHint: { marginTop: 14, opacity: 0.8, fontSize: 13 },
  checkboxRow: {
    display: "flex",
    alignItems: "center",
    marginTop: 14,
    userSelect: "none",
  },
  actions: { display: "flex", gap: 10, marginTop: 14, flexWrap: "wrap" },
  button: {
    padding: "10px 14px",
    borderRadius: 10,
    border: "1px solid rgba(255,255,255,0.14)",
    cursor: "pointer",
    fontWeight: 600,
  },
  buttonPrimary: { background: "#3b82f6", color: "white" },
  buttonDisabled: { background: "rgba(255,255,255,0.08)", color: "rgba(255,255,255,0.5)", cursor: "not-allowed" },
  buttonSecondary: { background: "transparent", color: "#e8eefc" },
  footer: { marginTop: 12, fontSize: 12, opacity: 0.8 },
};
