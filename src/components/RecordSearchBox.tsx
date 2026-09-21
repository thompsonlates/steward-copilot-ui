import { useState } from "react";
import { searchRecords } from "../api/client";
import type { RecordSearchResult } from "../api/types";

function getSearchPlaceholder(domain: string): string {
  switch (domain) {
    case "PROVIDER":
      return "Search provider by NPI, Provider ID, name, email, phone...";
    case "PRODUCT":
      return "Search product by GTIN, SKU, Product ID, name...";
    case "SUPPLIER":
      return "Search supplier by Tax ID, Supplier ID, name, email, phone...";
    case "PATIENT":
      return "Search patient by Patient ID, name, DOB, email...";
    default:
      return "Search customer by Member ID, name, DOB, email...";
  }
}

function getPhoneNumber(record: RecordSearchResult): string {
  return (
    record.phone_number ||
    record.record?.phone_number ||
    ""
  );
}

function getDisplayName(record: RecordSearchResult): string {
  const rec = record.record ?? {};

  const fullName = `${rec.first_name ?? ""} ${rec.last_name ?? ""}`.trim();

  return (
    record.display_name ||
    rec.product_name ||
    rec.supplier_name ||
    fullName ||
    record.mdm_id ||
    record.record_id ||
    "Selected Record"
  );
}

export default function RecordSearchBox(props: {
  domain: string;
  label: string;
  onSelect: (record: RecordSearchResult) => void;
}) {
  const [q, setQ] = useState("");
  const [results, setResults] = useState<RecordSearchResult[]>([]);
  const [isOpen, setIsOpen] = useState(false);

  async function handleSearch() {
    if (!q.trim()) {
      setResults([]);
      setIsOpen(false);
      return;
    }

    const response = await searchRecords(props.domain, q.trim());
    setResults(response.results ?? []);
    setIsOpen(true);
  }

  function handleSelect(record: RecordSearchResult) {
    setResults([]);
    setIsOpen(false);
    setQ(getDisplayName(record));

    props.onSelect(record);
  }

  return (
    <div style={{ marginBottom: 12 }}>
      <label
        style={{
          display: "block",
          marginBottom: 6,
          fontSize: 15,
          fontWeight: 600,
          color: "#526273",
        }}
      >
        {props.label}
      </label>

      <div style={{ display: "flex", gap: 8 }}>
        <input
          value={q}
          onChange={(e) => {
            setQ(e.target.value);

            if (!e.target.value.trim()) {
              setResults([]);
              setIsOpen(false);
            }
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter") handleSearch();

            if (e.key === "Escape") {
              setResults([]);
              setIsOpen(false);
            }
          }}
          placeholder={getSearchPlaceholder(props.domain)}
          style={{
            flex: 1,
            padding: 14,
            borderRadius: 12,
            border: "1px solid #d0d7de",
            fontSize: 16,
          }}
        />

        <button
          type="button"
          onClick={handleSearch}
          style={{
            width: 44,
            height: 44,
            borderRadius: 10,
            border: "1px solid #d0d7de",
            background: "#f8fafc",
            cursor: "pointer",
            fontSize: 18,
          }}
        >
          🔍
        </button>
      </div>

      {isOpen &&
          results.map((r) => {
            const phoneNumber = getPhoneNumber(r);

            return (
              <div
                key={r.record_id}
                onClick={() => handleSelect(r)}
                style={{
                  padding: 12,
                  border: "1px solid #ddd",
                  borderRadius: 8,
                  marginTop: 6,
                  cursor: "pointer",
                  background: "#fff",
                }}
      >
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <strong>{getDisplayName(r)}</strong>

                {r.golden_record_flag ? (
                  <span
                    style={{
                      background: "#FEF3C7",
                      color: "#92400E",
                      padding: "2px 8px",
                      borderRadius: 999,
                      fontSize: 12,
                      fontWeight: 600,
                    }}
                  >
                    ⭐ Golden Record
                  </span>
                ) : null}
              </div>

                {r.mdm_id ? (
                  <div style={{ fontSize: 12, color: "#6B7280", marginTop: 4 }}>
                    {r.mdm_id}
                  </div>
                ) : null}

                {props.domain === "PROVIDER" && phoneNumber ? (
                  <div style={{ fontSize: 13, color: "#4B5563", marginTop: 4 }}>
                    Phone: {phoneNumber}
                  </div>
                ) : null}

        <div style={{ color: "#4B5563", marginTop: 4 }}>
          {r.source_system ?? "Unknown Source"}
        </div>
      </div>
    );
  })}
    </div>
  );
}