import type { DomainType, MatchExplainResponse } from "../../api/types";
import { InfoPill } from "./ExplainPrimitives";

export function AddressIntelligencePanel(props: {
  recordA?: MatchExplainResponse["record_a_address_intelligence"];
  recordB?: MatchExplainResponse["record_b_address_intelligence"];
  insight?: string;
  similarityScore?: number | null;
  domain: DomainType;
}) {
  const { recordA, recordB, insight, similarityScore } = props;
  const isProduct = props.domain === "PRODUCT";

  const mapFindings = (findings?: string[]) => {
    if (!findings?.length) return [];

    if (isProduct) {
      return Array.from(
        new Set(
          findings.map((finding) => {
            const lower = finding.toLowerCase();

            if (lower.includes("formatting")) {
              return "Attribute format standardized";
            }

            if (lower.includes("structure")) {
              return "Attribute structure may impact matching";
            }

            if (lower.includes("state") || lower.includes("postal")) {
              return "Identifier or attribute component missing";
            }

            return "Attribute inconsistency detected";
          })
        )
      );
    }

    return findings;
  };

  const intelligenceLabels = {
    panelTitle: isProduct
      ? "Product Attribute Intelligence"
      : "Address Intelligence",
    insightTitle: isProduct
      ? "Product Attribute Match Insight"
      : "Address Match Insight",
    recordATitle: isProduct
      ? "Record A Product Attribute"
      : "Record A Address",
    recordBTitle: isProduct
      ? "Record B Product Attribute"
      : "Record B Address",
    rawLabel: isProduct ? "Raw Product Attribute" : "Raw Address",
    standardizedLabel: isProduct
      ? "Standardized Product Attribute"
      : "Standardized Address",
    similarityLabel: isProduct ? "Attribute Similarity" : "Similarity",
    confidenceLabel: isProduct ? "Attribute Confidence" : "Confidence",
    postalLabel: isProduct ? "Identifier Match" : "Postal Match",
    deliverableLabel: isProduct ? "Usable Attribute" : "Deliverable",
    findingsLabel: isProduct ? "Attribute Findings" : "Findings",
  };

  const displayInsight = isProduct
    ? "Product attributes share partial similarity but contain differences that may require review."
    : insight;

  const similarity =
    typeof similarityScore === "number" ? similarityScore : 0;

  const attributeQuality = (() => {
    if (similarity >= 0.9) {
      return { label: "HIGH QUALITY", color: "#16a34a", bg: "#dcfce7" };
    }
    if (similarity >= 0.75) {
      return { label: "STRONG MATCH", color: "#2563eb", bg: "#dbeafe" };
    }
    if (similarity >= 0.6) {
      return { label: "PARTIAL MATCH", color: "#d97706", bg: "#fef3c7" };
    }
    return { label: "LOW QUALITY", color: "#dc2626", bg: "#fee2e2" };
  })();

  if (!recordA && !recordB && !insight) return null;

  function statusTone(status?: string) {
    const normalizedStatus = (status ?? "").toUpperCase();

    if (normalizedStatus === "VALID") {
      return { bg: "#e8f7ec", border: "#b7f5b7", color: "#176b2c" };
    }

    if (normalizedStatus === "PARTIAL") {
      return { bg: "#fff4e5", border: "#ffd199", color: "#8a4b00" };
    }

    if (normalizedStatus === "INVALID" || normalizedStatus === "MISSING") {
      return { bg: "#fdeeee", border: "#efb5b5", color: "#8a1c1c" };
    }

    return { bg: "#f8fafc", border: "#dbe2ea", color: "#334155" };
  }

  function AddressCard(cardProps: {
    title: string;
    data?: MatchExplainResponse["record_a_address_intelligence"];
    similarityScore?: number | null;
  }) {
    const data = cardProps.data;
    const tone = statusTone(data?.validation_status);

    return (
      <div
        style={{
          border: "1px solid #e5e7eb",
          borderRadius: 16,
          padding: 14,
          background: "#fff",
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            gap: 10,
            alignItems: "center",
            marginBottom: 10,
            flexWrap: "wrap",
          }}
        >
          <div style={{ fontSize: 16, fontWeight: 800, color: "#1e3a5f" }}>
            {cardProps.title}
          </div>

          {data?.validation_status ? (
            <span
              style={{
                display: "inline-flex",
                alignItems: "center",
                padding: "6px 10px",
                borderRadius: 999,
                border: `1px solid ${tone.border}`,
                background: tone.bg,
                color: tone.color,
                fontSize: 12,
                fontWeight: 700,
              }}
            >
              {isProduct ? attributeQuality.label : data.validation_status}
            </span>
          ) : null}
        </div>

        <div style={{ display: "grid", gap: 10 }}>
          <div>
            <div style={{ fontSize: 12, opacity: 0.7, marginBottom: 4 }}>
              {intelligenceLabels.rawLabel}
            </div>
            <div
              style={{
                fontSize: 14,
                border: "1px solid #eee",
                borderRadius: 10,
                padding: "10px 12px",
                background: "#fafafa",
              }}
            >
              {data?.raw_address || "—"}
            </div>
          </div>

          <div>
            <div style={{ fontSize: 12, opacity: 0.7, marginBottom: 4 }}>
              {intelligenceLabels.standardizedLabel}
            </div>
            <div
              style={{
                fontSize: 14,
                border: "1px solid #eee",
                borderRadius: 10,
                padding: "10px 12px",
                background: "#f8fbff",
              }}
            >
              {data?.standardized_address || "—"}
            </div>
          </div>

          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <InfoPill
              label="Similarity"
              value={
                typeof cardProps.similarityScore === "number"
                  ? `${Math.round(cardProps.similarityScore * 100)}%`
                  : null
              }
            />
            <InfoPill
              label="Confidence"
              value={
                typeof data?.address_confidence === "number"
                  ? `${Math.round(data.address_confidence * 100)}%`
                  : null
              }
            />
            <InfoPill
              label={intelligenceLabels.postalLabel}
              value={data?.postal_match_level}
            />
            <InfoPill
              label={intelligenceLabels.deliverableLabel}
              value={
                data?.deliverable_flag === true
                  ? "Yes"
                  : data?.deliverable_flag === false
                  ? "No"
                  : "Unknown"
              }
            />
            <InfoPill label="State" value={data?.state} />
            <InfoPill label="Postal Code" value={data?.postal_code} />
          </div>

          <div>
            <div style={{ fontSize: 12, opacity: 0.7, marginBottom: 6 }}>
              {intelligenceLabels.findingsLabel}
            </div>
            <div style={{ display: "grid", gap: 6 }}>
              {data?.findings?.length ? (
                mapFindings(data.findings).map((item, index) => (
                  <div
                    key={`${cardProps.title}-finding-${index}`}
                    style={{
                      border: "1px solid #eee",
                      borderRadius: 10,
                      padding: "8px 10px",
                      background: "#fafafa",
                      fontSize: 13,
                    }}
                  >
                    {item}
                  </div>
                ))
              ) : (
                <div
                  style={{
                    border: "1px solid #eee",
                    borderRadius: 10,
                    padding: "8px 10px",
                    background: "#fafafa",
                    fontSize: 13,
                    opacity: 0.7,
                  }}
                >
                  No address findings returned.
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      style={{
        border: "1px solid #dbeafe",
        borderRadius: 20,
        background: "#f8fafc",
        padding: 18,
        boxShadow: "0 8px 22px rgba(0,0,0,0.05)",
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          gap: 12,
          alignItems: "center",
          flexWrap: "wrap",
          marginBottom: 14,
        }}
      >
        <div style={{ fontSize: 18, fontWeight: 800, color: "#1e3a5f" }}>
          {intelligenceLabels.panelTitle}
        </div>

        <div
          style={{
            fontSize: 12,
            fontWeight: 700,
            letterSpacing: 0.5,
            textTransform: "uppercase",
            color: "#64748b",
          }}
        >
          {isProduct
            ? "ATTRIBUTE QUALITY + STANDARDIZATION"
            : "POSTAL VALIDATION + STANDARDIZATION"}
        </div>
      </div>

      {insight ? (
        <div
          style={{
            marginBottom: 14,
            padding: "12px 14px",
            borderRadius: 14,
            background: "#eff6ff",
            border: "1px solid #bfdbfe",
          }}
        >
          <div style={{ fontSize: 12, opacity: 0.7, marginBottom: 4 }}>
            {intelligenceLabels.insightTitle}
          </div>

          <div style={{ fontSize: 14, fontWeight: 700 }}>{displayInsight}</div>
        </div>
      ) : null}

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
          gap: 14,
        }}
      >
        <AddressCard
          title={intelligenceLabels.recordATitle}
          data={recordA}
          similarityScore={similarityScore}
        />
        <AddressCard
          title={intelligenceLabels.recordBTitle}
          data={recordB}
          similarityScore={similarityScore}
        />
      </div>
    </div>
  );
}
