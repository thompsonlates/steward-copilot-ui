import { useState } from "react";

import CsvUploadPanel from "../components/CsvUploadPanel";
import GoogleSheetsConnectionPanel from "./GoogleSheetsConnectionPanel";
import OneDriveConnectionSheetPanel from "./OneDriveConnectionSheetPanel";
import DatabricksProfilePanel from "./DatabricksProfilePanel";
import BigQueryProfilePanel from "./BigQueryPanel";
import SnowflakePanel from "./SnowflakePanel";
import AzurePanel from "./AzurePanel";

type ProfileSource =
  | "CSV"
  | "GOOGLE_SHEETS"
  | "ONEDRIVE"
  | "DATABRICKS"
  | "BIGQUERY"
  | "SNOWFLAKE"
  | "AZURE_SQL";

export default function ProfileIntelligencePage() {
  const [
    source,
    setSource,
  ] = useState<ProfileSource>(
    "CSV",
  );

  return (
    <div
      style={{
        width: "100%",
        display: "grid",
        gap: 20,
      }}
    >
      <div
        style={{
          marginBottom: 24,
        }}
      >
        <h1
          style={{
            margin: 0,
            fontSize: 28,
            fontWeight: 800,
            color: "#172033",
          }}
        >
          Profile Intelligence
        </h1>

        <p
          style={{
            marginTop: 8,
            color: "#64748b",
            fontSize: 14,
          }}
        >
          Profile enterprise data, identify quality risks,
          and generate AI-assisted remediation recommendations.
        </p>
      </div>

      <div
        style={{
          display: "flex",
          gap: 12,
          marginBottom: 24,
          flexWrap: "wrap",
        }}
      >
        <button
          type="button"
          onClick={() =>
            setSource("CSV")
          }
          style={{
            padding: "10px 16px",
            borderRadius: 999,
            border:
              "1px solid #cbd5e1",
            background:
              source === "CSV"
                ? "#111827"
                : "#ffffff",
            color:
              source === "CSV"
                ? "#ffffff"
                : "#111827",
            fontWeight: 700,
            cursor: "pointer",
          }}
        >
          CSV Profiling
        </button>

        <button
          type="button"
          onClick={() =>
            setSource(
              "GOOGLE_SHEETS",
            )
          }
          style={{
            padding: "10px 16px",
            borderRadius: 999,
            border:
              "1px solid #cbd5e1",
            background:
              source === "GOOGLE_SHEETS"
                ? "#111827"
                : "#ffffff",
            color:
              source === "GOOGLE_SHEETS"
                ? "#ffffff"
                : "#111827",
            fontWeight: 700,
            cursor: "pointer",
          }}
        >
          Google Sheets
        </button>

        <button
          type="button"
          onClick={() =>
            setSource(
              "ONEDRIVE",
            )
          }
          style={{
            padding: "10px 16px",
            borderRadius: 999,
            border:
              "1px solid #cbd5e1",
            background:
              source === "ONEDRIVE"
                ? "#111827"
                : "#ffffff",
            color:
              source === "ONEDRIVE"
                ? "#ffffff"
                : "#111827",
            fontWeight: 700,
            cursor: "pointer",
          }}
        >
          OneDrive / Excel
        </button>

        <button
          type="button"
          onClick={() =>
            setSource(
              "DATABRICKS",
            )
          }
          style={{
            padding: "10px 16px",
            borderRadius: 999,
            border:
              "1px solid #cbd5e1",
            background:
              source === "DATABRICKS"
                ? "#111827"
                : "#ffffff",
            color:
              source === "DATABRICKS"
                ? "#ffffff"
                : "#111827",
            fontWeight: 700,
            cursor: "pointer",
          }}
        >
          Databricks
        </button>

        <button
        type="button"
        onClick={() =>
          setSource(
            "BIGQUERY",
          )
        }
        style={{
          padding: "10px 16px",
          borderRadius: 999,
          border:
            "1px solid #cbd5e1",
          background:
            source === "BIGQUERY"
              ? "#111827"
              : "#ffffff",
          color:
            source === "BIGQUERY"
              ? "#ffffff"
              : "#111827",
          fontWeight: 700,
          cursor: "pointer",
        }}
      >
        BigQuery
      </button>

          <button
            type="button"
            onClick={() =>
              setSource("SNOWFLAKE")
            }
            style={{
              padding: "10px 16px",
              borderRadius: 999,
              border: "1px solid #cbd5e1",
              background:
                source === "SNOWFLAKE"
                  ? "#111827"
                  : "#ffffff",
              color:
                source === "SNOWFLAKE"
                  ? "#ffffff"
                  : "#111827",
              fontWeight: 700,
              cursor: "pointer",
            }}
    >
      Snowflake
    </button>

    <button
        type="button"
        onClick={() =>
          setSource("AZURE_SQL")
        }
        style={{
          padding: "10px 16px",
          borderRadius: 999,
          border: "1px solid #cbd5e1",
          background:
            source === "AZURE_SQL"
              ? "#111827"
              : "#ffffff",
          color:
            source === "AZURE_SQL"
              ? "#ffffff"
              : "#111827",
          fontWeight: 700,
          cursor: "pointer",
        }}
      >
        Azure SQL
      </button>
      </div>

      {source === "CSV" && (
        <CsvUploadPanel />
      )}

      {source === "GOOGLE_SHEETS" && (
        <GoogleSheetsConnectionPanel />
      )}

      {source === "ONEDRIVE" && (
        <OneDriveConnectionSheetPanel />
      )}

      {source === "DATABRICKS" && (
        <DatabricksProfilePanel />
      )}
      
      {source === "BIGQUERY" && (
        <BigQueryProfilePanel />
      )}

      {source === "SNOWFLAKE" && (
        <SnowflakePanel />
      )}

      {source === "AZURE_SQL" && (
        <AzurePanel />
      )}


    </div>
  );
}