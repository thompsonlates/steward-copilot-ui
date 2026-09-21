import type { ReactNode } from "react";

function clampNumber(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function safeText(value: unknown): string {
  if (value === null || value === undefined) return "";

  if (
    typeof value === "string" ||
    typeof value === "number" ||
    typeof value === "boolean"
  ) {
    return String(value);
  }

  if (Array.isArray(value)) {
    return value.map(safeText).filter(Boolean).join(", ");
  }

  if (typeof value === "object") {
    const obj = value as Record<string, unknown>;

    return (
      safeText(obj.patient_id) ||
      safeText(obj.provider_id) ||
      safeText(obj.supplier_id) ||
      safeText(obj.product_id) ||
      safeText(obj.member_id) ||
      safeText(obj.patient_first_name) ||
      safeText(obj.provider_first_name) ||
      safeText(obj.supplier_name) ||
      safeText(obj.product_name) ||
      safeText(obj.first_name) ||
      JSON.stringify(obj)
    );
  }

  return "";
}

export function ConfidenceBlocks({
  value,
  riskFlag,
}: {
  value: number;
  riskFlag?: string | null;
}) {
  const blocks = 12;
  const safeValue = clampNumber(value, 0, 100);
  const filled = Math.round((safeValue / 100) * blocks);

  const fillColor =
    (riskFlag ?? "").toUpperCase() === "LOW"
      ? "#16a34a"
      : (riskFlag ?? "").toUpperCase() === "MEDIUM"
      ? "#f59e0b"
      : "#dc2626";

  return (
    <div style={{ display: "flex", gap: 4, alignItems: "center" }}>
      <div style={{ display: "flex", gap: 4 }}>
        {Array.from({ length: blocks }).map((_, i) => (
          <div
            key={i}
            style={{
              width: 14,
              height: 24,
              borderRadius: 4,
              background: i < filled ? fillColor : "#e5e7eb",
            }}
          />
        ))}
      </div>
      <div style={{ fontSize: 14, fontWeight: 800, color: "#1e3a5f" }}>
        {safeValue}%
      </div>
    </div>
  );
}

export function SignalBar(props: {
  label: string;
  score: number;
  weight?: number;
  color?: string;
  contributionPct?: number;
}) {
  const pct = Math.max(0, Math.min(100, Math.round(props.score * 100)));

  const weightPct =
    props.weight !== undefined
      ? Math.max(0, Math.min(100, Math.round(props.weight * 100)))
      : null;

  // ✅ KEY FIX: use contribution if available, otherwise fallback to score
  const displayPct =
    props.contributionPct !== undefined ? props.contributionPct : pct;

  return (
    <div style={{ display: "grid", gap: 4, marginBottom: 12 }}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          gap: 8,
          fontSize: 12,
          alignItems: "center",
        }}
      >
        <div
          style={{
            display: "flex",
            gap: 8,
            alignItems: "center",
            flexWrap: "wrap",
          }}
        >
          <span style={{ color: "#475569", fontWeight: 700 }}>
            {props.label}
          </span>

          {weightPct !== null ? (
            <span
              style={{
                fontSize: 11,
                fontWeight: 700,
                color: "#1e3a5f",
                background: "#eff6ff",
                border: "1px solid #bfdbfe",
                padding: "2px 8px",
                borderRadius: 999,
              }}
            >
              Weight {weightPct}%
            </span>
          ) : null}

          {props.contributionPct !== undefined ? (
            <span
              style={{
                fontSize: 11,
                fontWeight: 700,
                color: "#166534",
                background: "#ecfdf5",
                border: "1px solid #bbf7d0",
                padding: "2px 8px",
                borderRadius: 999,
              }}
            >
              Contribution {props.contributionPct}%
            </span>
          ) : null}
        </div>

        {/* ✅ Show contribution if available, otherwise score */}
        <span style={{ color: "#0f172a", fontWeight: 700 }}>
          {displayPct}%
        </span>
      </div>

      <div
        style={{
          height: 8,
          borderRadius: 999,
          background: "#e5e7eb",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            width: `${displayPct}%`, // ✅ KEY FIX HERE
            height: "100%",
            borderRadius: 999,
            background: props.color ?? "#2563eb",
            transition: "width 0.5s ease",
          }}
        />
      </div>
    </div>
  );
}

export function SummaryCard(props: {
  label: string;
  value?: string | number | null;
  tone?: "neutral" | "positive" | "warning" | "danger";
}) {
  if (props.value === undefined || props.value === null || props.value === "") {
    return null;
  }

  let bg = "#ffffff";
  let border = "#e5e7eb";
  let color = "#0f172a";

  if (props.tone === "positive") {
    bg = "#ecfdf5";
    border = "#bbf7d0";
    color = "#166534";
  } else if (props.tone === "warning") {
    bg = "#fffbeb";
    border = "#fde68a";
    color = "#92400e";
  } else if (props.tone === "danger") {
    bg = "#fef2f2";
    border = "#fecaca";
    color = "#991b1b";
  }

  return (
    <div
      style={{
        border: `1px solid ${border}`,
        background: bg,
        borderRadius: 16,
        padding: 14,
        minHeight: 112,
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
      }}
    >
      <div
        style={{
          fontSize: 12,
          textTransform: "uppercase",
          letterSpacing: 0.4,
          opacity: 0.7,
          marginBottom: 6,
        }}
      >
        {props.label}
      </div>
      <div
        style={{
          fontSize: 18,
          fontWeight: 800,
          color,
          lineHeight: 1.15,
          wordBreak: "break-word",
        }}
      >
        {props.value}
      </div>
    </div>
  );
}

export function InfoPill(props: {
  label: string;
  value?: string | number | null;
  color?: string;
}) {
  if (props.value === null || props.value === undefined || props.value === "") {
    return null;
  }

  return (
    <div
      style={{
        border: "1px solid #e5e7eb",
        borderRadius: 999,
        padding: "8px 12px",
        background: "#fff",
        display: "inline-flex",
        alignItems: "center",
        gap: 8,
      }}
    >
      <span style={{ fontSize: 12, opacity: 0.65 }}>{props.label}</span>
      <span
        style={{
          fontSize: 13,
          fontWeight: 700,
          color: props.color ?? "#0f172a",
        }}
      >
        {props.value}
      </span>
    </div>
  );
}

export function Field(props: { label: string; children: ReactNode }) {
  return (
    <label style={{ display: "grid", gap: 6 }}>
      <span style={{ fontSize: 12, opacity: 0.8 }}>{props.label}</span>
      {props.children}
    </label>
  );
}

type PillProps = {
  label: string;
  value?: string | number | null;
};

export function Pill({ label, value }: PillProps) {
  if (value === undefined || value === null || value === "") return null;

  const displayValue = safeText(value);
  const pillText = `${label}: ${displayValue}`;
  const upper = pillText.toUpperCase();

  let background = "#fafafa";
  let border = "#ddd";
  let color = "#222";

  if (
    upper.includes("REJECT_MERGE") ||
    upper.includes("BLOCK_MERGE") ||
    upper.includes("HIGH") ||
    upper.includes("SEVERE")
  ) {
    background = "#fdeeee";
    border = "#efb5b5";
    color = "#8a1c1c";
  } else if (
    upper.includes("REVIEW") ||
    upper.includes("REVIEW_REQUIRED") ||
    upper.includes("MEDIUM") ||
    upper.includes("ELEVATED")
  ) {
    background = "#fff4e5";
    border = "#ffd199";
    color = "#8a4b00";
  } else if (
    upper.includes("APPROVE_MERGE") ||
    upper.includes("AUTO_MERGE") ||
    upper.includes("LOW")
  ) {
    background = "#dff5df";
    border = "#b7f5b7";
    color = "#176b2c";
  }

  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        padding: "6px 10px",
        borderRadius: 999,
        border: `1px solid ${border}`,
        background,
        color,
        fontSize: 12,
        fontWeight: 600,
      }}
    >
      <strong style={{ marginRight: 4 }}>{label}:</strong> {displayValue}
    </span>
  );
}

