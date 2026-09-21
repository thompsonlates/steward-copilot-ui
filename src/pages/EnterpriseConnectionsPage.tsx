// src/pages/EnterpriseConnectionsPage.tsx

import type { CSSProperties } from "react";
import databricksLogo from "../assets/databrickslogo.png";
import snowflakeLogo from "../assets/snowflakelogo.png";
import reltioLogo from "../assets/reltiologo.jpg";
import bigqueryLogo from "../assets/googlebigquery.png";
import mongodbLogo from "../assets/mongodb.png";
import azureSqlLogo from "../assets/azuresql.png";
import informaticaLogo from "../assets/idmclogo.png";
import collibraLogo from "../assets/collibralogo.jpg";


import { useEffect, useState } from "react";



import {
  createEnterpriseConnection,
  getEnterpriseConnections,
  testEnterpriseConnection,
  type ConnectionTestResponse,
} from "../api/client";

import type {
  EnterpriseConnection,
  EnterpriseConnectionCreateRequest,
} from "../api/types";

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL ??
  "http://127.0.0.1:8000";


type ConnectorId =
  | "databricks"
  | "snowflake"
  | "bigquery"
  | "mongodb"
  | "azure_sql"
  | "informatica"
  | "collibra"
  | "reltio";

type WizardStep = 1 | 2 | 3 | 4;

const ENTERPRISE_ENVIRONMENTS = [
  { value: "DEV", label: "Development (DEV)" },
  { value: "STG", label: "Staging (STG)" },
  { value: "TEST", label: "Test / QA" },
  { value: "PRODUCTION", label: "Production" },
] as const;

const GOVERNED_EXECUTION_CONNECTORS = new Set<ConnectorId>([
  "databricks",
  "snowflake",
  "bigquery",
]);

type ConnectorField = {
  key: string;
  label: string;
  placeholder: string;
  required?: boolean;
  helperText?: string;
};

type AuthenticationOption = {
  id: string;
  title: string;
  description: string;
  badge: string;
};

type ConnectorDefinition = IntegrationDefinition & {
  id: ConnectorId;
  previewAvailable: boolean;
  configurationFields: ConnectorField[];
  authenticationOptions: AuthenticationOption[];
  logoSize: number;
  };

type IntegrationStatus =
  | "AVAILABLE"
  | "CONNECTED"
  | "COMING_SOON";

type IntegrationDefinition = {
  id: string;
  name: string;
  category: string;
  description: string;
  status: IntegrationStatus;
  logo: string;
};


const inputStyle: CSSProperties = {
  width: "100%",
  height: 46,
  borderRadius: 10,
  border: "1px solid #cbd5e1",
  padding: "0 14px",
  fontSize: 15,
  color: "#172033",
  background: "#ffffff",
  boxSizing: "border-box",
  outline: "none",
};

const labelStyle: CSSProperties = {
  display: "block",
  fontSize: 13,
  fontWeight: 700,
  color: "#475569",
  marginBottom: 7,
};

const primaryButtonStyle: CSSProperties = {
  border: "none",
  borderRadius: 10,
  padding: "12px 20px",
  background: "#1d4ed8",
  color: "#ffffff",
  fontWeight: 800,
  fontSize: 14,
  cursor: "pointer",
};

const secondaryButtonStyle: CSSProperties = {
  border: "1px solid #cbd5e1",
  borderRadius: 10,
  padding: "11px 18px",
  background: "#ffffff",
  color: "#334155",
  fontWeight: 750,
  fontSize: 14,
  cursor: "pointer",
};

const INTEGRATIONS: ConnectorDefinition[] = [
  {
    id: "databricks",
    name: "Databricks",
    logo: databricksLogo,
    logoSize: 36,
    category: "Lakehouse & AI",
    description:
      "Connect Databricks workspaces, Unity Catalog, schemas, and Delta tables.",
    status: "AVAILABLE",

    previewAvailable: true,
    configurationFields: [
      {
        key: "connection_name",
        label: "Connection Name",
        placeholder: "Baptist Health Databricks",
        required: true,
      },
      {
        key: "workspace_url",
        label: "Workspace URL",
        placeholder: "company.cloud.databricks.com",
        required: true,
      },
      {
        key: "workspace_id",
        label: "Workspace ID",
        placeholder: "Optional workspace ID",
      },
      {
        key: "catalog",
        label: "Catalog",
        placeholder: "main",
        required: true,
      },
      {
        key: "schema",
        label: "Schema",
        placeholder: "default",
        required: true,
      },
      {
        key: "target_table",
        label: "Target Delta Table",
        placeholder: "ai_steward_results",
        required: true,
      },
    ],
    authenticationOptions: [
      {
        id: "u2m",
        title: "Sign in with Databricks / Corporate IdP",
        description:
          "Interactive delegated-user authentication through the customer's browser.",
        badge: "U2M",
      },
      {
        id: "m2m",
        title: "Service Principal OAuth",
        description:
          "Application authentication for scheduled and unattended workloads.",
        badge: "M2M",
      },
    ],
  },
  {
    id: "snowflake",
    name: "Snowflake",
    logo: snowflakeLogo,
    logoSize: 42,
    category: "Cloud Data Platform",
    description:
      "Connect Snowflake accounts, warehouses, databases, schemas, and Native App environments.",
    status: "AVAILABLE",
    previewAvailable: true,
    configurationFields: [
      {
        key: "connection_name",
        label: "Connection Name",
        placeholder: "Enterprise Snowflake Production",
        required: true,
      },
      {
        key: "organization",
        label: "Organization",
        placeholder: "ACME",
        required: true,
      },
      {
        key: "account_identifier",
        label: "Account Identifier",
        placeholder: "abc12345.us-east-1",
        required: true,
      },
      {
        key: "warehouse",
        label: "Warehouse",
        placeholder: "COMPUTE_WH",
        required: true,
      },
      {
        key: "database",
        label: "Database",
        placeholder: "MASTER_DATA",
        required: true,
      },
      {
        key: "schema",
        label: "Schema",
        placeholder: "PUBLIC",
        required: true,
      },
      {
        key: "role",
        label: "Role",
        placeholder: "AI_DATA_STEWARD",
      },
    ],
    authenticationOptions: [
      {
        id: "oauth",
        title: "Sign in with Snowflake",
        description:
          "Authenticate interactively using Snowflake OAuth or the corporate identity provider.",
        badge: "OAuth",
      },
      {
        id: "key_pair",
        title: "Key-Pair Authentication",
        description:
          "Use a service user and securely managed private key for automated processing.",
        badge: "M2M",
      },
    ],
  },
  {
    id: "bigquery",
    name: "Google BigQuery",
    logo: bigqueryLogo,
    logoSize: 42,
    category: "Cloud Data Warehouse",
    description:
      "Connect Google Cloud projects, datasets, tables, and governed service-account integrations.",
    status: "AVAILABLE",
    previewAvailable: true,
    configurationFields: [
      {
        key: "connection_name",
        label: "Connection Name",
        placeholder: "Enterprise BigQuery",
        required: true,
      },
      {
        key: "project_id",
        label: "Google Cloud Project ID",
        placeholder: "customer-project-123",
        required: true,
      },
      {
        key: "dataset",
        label: "Dataset",
        placeholder: "mdm_governance",
        required: true,
      },
      {
        key: "target_table",
        label: "Target Table",
        placeholder: "ai_steward_results",
      },
      {
        key: "location",
        label: "Location",
        placeholder: "US",
      },
    ],
    authenticationOptions: [
      {
        id: "google_oauth",
        title: "Sign in with Google Cloud",
        description:
          "Delegated authorization using the customer's Google identity.",
        badge: "U2M",
      },
      {
        id: "service_account",
        title: "Service Account",
        description:
          "Automated workload authentication with credentials stored securely.",
        badge: "M2M",
      },
    ],
  },
  {
    id: "mongodb",
    name: "MongoDB",
    logo: mongodbLogo,
    logoSize: 42,
    category: "Document Database",
    description:
      "Connect MongoDB databases and collections for governed metadata discovery, profiling, and read-based stewardship workflows.",
    status: "AVAILABLE",
    previewAvailable: true,
    configurationFields: [
      {
        key: "connection_name",
        label: "Connection Name",
        placeholder: "Enterprise MongoDB",
        required: true,
      },
      {
        key: "database",
        label: "Database",
        placeholder: "master_data",
        required: true,
      },
    ],
    authenticationOptions: [
      {
        id: "connection_string",
        title: "MongoDB Connection String",
        description:
          "Authenticate with a MongoDB or MongoDB Atlas connection URI stored securely in Google Secret Manager.",
        badge: "URI",
      },
    ],
  },
  {
    id: "azure_sql",
    name: "Microsoft Azure SQL",
    logo: azureSqlLogo,
    logoSize: 42,
    category: "Cloud Relational Database",
    description:
      "Connect Microsoft Azure SQL databases for governed metadata discovery, profiling, and read-based stewardship workflows.",
    status: "AVAILABLE",
    previewAvailable: true,
    configurationFields: [
      {
        key: "connection_name",
        label: "Connection Name",
        placeholder: "Enterprise Azure SQL",
        required: true,
      },
      {
        key: "server",
        label: "Azure SQL Server",
        placeholder: "company.database.windows.net",
        required: true,
      },
      {
        key: "database",
        label: "Database",
        placeholder: "master_data",
        required: true,
      },
      {
        key: "port",
        label: "Port",
        placeholder: "1433",
        helperText: "Defaults to 1433 when left blank.",
      },
    ],
    authenticationOptions: [
      {
        id: "username_password",
        title: "SQL Username & Password",
        description:
          "Authenticate using an Azure SQL login with credentials stored securely in Google Secret Manager.",
        badge: "SQL",
      },
    ],
  },
  {
    id: "informatica",
    name: "Informatica",
    logo: informaticaLogo,
    logoSize: 40,
    category: "MDM & Data Management",
    description:
      "Connect Informatica IDMC, MDM, data quality, metadata, and stewardship workflows.",
    status: "COMING_SOON",
    previewAvailable: true,
    configurationFields: [
      {
        key: "connection_name",
        label: "Connection Name",
        placeholder: "Enterprise Informatica IDMC",
        required: true,
      },
      {
        key: "pod_url",
        label: "IDMC Pod URL",
        placeholder: "https://dm-us.informaticacloud.com",
        required: true,
      },
      {
        key: "organization_id",
        label: "Organization ID",
        placeholder: "Customer organization ID",
      },
      {
        key: "environment",
        label: "Environment",
        placeholder: "Production",
      },
    ],
    authenticationOptions: [
      {
        id: "oauth",
        title: "Informatica OAuth",
        description:
          "Authorize access using the customer's Informatica identity.",
        badge: "OAuth",
      },
      {
        id: "service_account",
        title: "Service Account",
        description:
          "Use an Informatica service identity for unattended processing.",
        badge: "M2M",
      },
    ],
  },
  {
    id: "collibra",
    name: "Collibra",
    logo: collibraLogo,
    logoSize: 40,
    category: "Data Governance",
    description:
      "Connect governance assets, policies, workflows, issues, and stewardship processes.",
    status: "COMING_SOON",
    previewAvailable: true,
    configurationFields: [
      {
        key: "connection_name",
        label: "Connection Name",
        placeholder: "Enterprise Collibra",
        required: true,
      },
      {
        key: "instance_url",
        label: "Collibra Instance URL",
        placeholder: "https://customer.collibra.com",
        required: true,
      },
      {
        key: "community_id",
        label: "Community ID",
        placeholder: "Optional community UUID",
      },
      {
        key: "domain_id",
        label: "Domain ID",
        placeholder: "Optional domain UUID",
      },
    ],
    authenticationOptions: [
      {
        id: "oauth",
        title: "Collibra OAuth",
        description:
          "Authorize delegated access to Collibra governance resources.",
        badge: "OAuth",
      },
      {
        id: "service_account",
        title: "Service Account",
        description:
          "Use an integration identity for workflow automation.",
        badge: "M2M",
      },
    ],
  },
  {
    id: "reltio",
    name: "Reltio",
    logo: reltioLogo,
    logoSize: 36,
    category: "Cloud MDM",
    description:
      "Connect Reltio tenants, entities, match rules, survivorship logic, and operational MDM data.",
    status: "COMING_SOON",
    previewAvailable: true,
    configurationFields: [
      {
        key: "connection_name",
        label: "Connection Name",
        placeholder: "Enterprise Reltio",
        required: true,
      },
      {
        key: "tenant_id",
        label: "Tenant ID",
        placeholder: "Customer tenant ID",
        required: true,
      },
      {
        key: "environment_url",
        label: "Environment URL",
        placeholder: "https://customer.reltio.com",
        required: true,
      },
      {
        key: "entity_type",
        label: "Entity Type",
        placeholder: "configuration/entityTypes/Provider",
      },
    ],
    authenticationOptions: [
      {
        id: "oauth",
        title: "Reltio OAuth",
        description:
          "Authorize access using the customer's Reltio identity.",
        badge: "OAuth",
      },
      {
        id: "client_credentials",
        title: "Client Credentials",
        description:
          "Use a Reltio client identity for automated workloads.",
        badge: "M2M",
      },
    ],
  },
];

  function getCredentialFields(
    connectorId: ConnectorId,
    authenticationMethod: string,
  ): ConnectorField[] {
    if (connectorId === "databricks") {
      if (authenticationMethod === "m2m") {
        return [
          {
            key: "client_id",
            label: "Databricks Client ID",
            placeholder: "Enter service-principal client ID",
            required: true,
          },
          {
            key: "client_secret",
            label: "Databricks Client Secret",
            placeholder: "Enter service-principal client secret",
            required: true,
          },
        ];
      }

      return [];
    }

    if (connectorId === "snowflake") {
      if (authenticationMethod === "oauth") {
        return [
          {
            key: "client_id",
            label: "Snowflake OAuth Client ID",
            placeholder: "Enter Snowflake OAuth client ID",
            required: true,
          },
          {
            key: "client_secret",
            label: "Snowflake OAuth Client Secret",
            placeholder: "Enter Snowflake OAuth client secret",
            required: true,
          },
          {
            key: "token_url",
            label: "OAuth Token URL",
            placeholder:
              "https://account.snowflakecomputing.com/oauth/token-request",
            required: true,
          },
          {
            key: "scope",
            label: "OAuth Scope",
            placeholder: "session:role-any",
            required: true,
          },
        ];
      }

      if (authenticationMethod === "key_pair") {
        return [
          {
            key: "username",
            label: "Snowflake Username",
            placeholder: "AI_STEWARD_SERVICE_USER",
            required: true,
          },
          {
            key: "private_key",
            label: "Private Key",
            placeholder: "Paste PEM private key",
            required: true,
          },
          {
            key: "private_key_passphrase",
            label: "Private-Key Passphrase",
            placeholder: "Optional encrypted-key passphrase",
          },
        ];
      }
    }

    if (connectorId === "bigquery") {
      if (authenticationMethod === "service_account") {
        return [
          {
            key: "service_account_json",
            label: "Google Service Account JSON",
            placeholder: "Paste the complete service-account JSON",
            required: true,
          },
        ];
      }

      if (authenticationMethod === "google_oauth") {
        return [];
      }
    }

    if (connectorId === "mongodb") {
      if (authenticationMethod === "connection_string") {
        return [
          {
            key: "connection_uri",
            label: "MongoDB Connection URI",
            placeholder: "mongodb+srv://username:password@cluster.example.net/",
            required: true,
            helperText:
              "Stored securely in Google Secret Manager and never persisted in the connection registry.",
          },
        ];
      }
    }

    if (connectorId === "azure_sql") {
      if (authenticationMethod === "username_password") {
        return [
          {
            key: "username",
            label: "Azure SQL Username",
            placeholder: "ai_steward_user",
            required: true,
          },
          {
            key: "password",
            label: "Azure SQL Password",
            placeholder: "Enter Azure SQL password",
            required: true,
          },
        ];
      }
    }

    return [];
  }

type ConnectionWizardProps = {
  connector: ConnectorDefinition;
  onClose: () => void;
  onActivated: (connectorId: ConnectorId) => void;
};

function ConnectionWizard({
  connector,
  onClose,
  onActivated,
}: ConnectionWizardProps) {
  const [step, setStep] = useState<WizardStep>(1);
  const [values, setValues] = useState<Record<string, string>>({});
  const [authenticationMethod, setAuthenticationMethod] =
    useState(connector.authenticationOptions[0]?.id ?? "");
  const [testStatus, setTestStatus] = useState<
    "IDLE" | "TESTING" | "SUCCESS" | "ERROR"
  >("IDLE");
  const [isStartingGoogleOAuth, setIsStartingGoogleOAuth] =
  useState(false);
  const isPreview = connector.status === "COMING_SOON";
  
  const credentialFields = getCredentialFields(
  connector.id,
  authenticationMethod,
);

  const isBigQueryU2M =
  connector.id === "bigquery" &&
  authenticationMethod === "google_oauth";

  const credentialFieldsComplete = credentialFields
    .filter((field) => field.required)
    .every((field) => values[field.key]?.trim());
 

  const selectedEnvironment =
    values.environment?.trim().toUpperCase() || "";

  const isGovernedExecutionEnvironment =
    selectedEnvironment === "DEV" ||
    selectedEnvironment === "STG";

  const supportsGovernedExecution =
    GOVERNED_EXECUTION_CONNECTORS.has(connector.id);

  const governedExecutionEnabled =
    values.allow_dq_execution === "true";

  const configureComplete =
    Boolean(selectedEnvironment) &&
    connector.configurationFields
      .filter(
        (field) =>
          field.key !== "environment" &&
          field.required,
      )
      .every((field) => values[field.key]?.trim());

  const [createdConnectionId, setCreatedConnectionId] =
    useState<string | null>(null);

  const [testResult, setTestResult] =
    useState<ConnectionTestResponse | null>(null);

  const [workflowError, setWorkflowError] =
    useState<string | null>(null);
  
  function completeActivation(): void 
    {onActivated(connector.id);
    setStep(4);}

  function updateValue(key: string, value: string) {
    setValues((current) => ({
      ...current,
      [key]: value,
    }));
  }

  function updateCredentialValue(
      key: string,
      value: string,
    ): void {
      setValues((current) => ({
        ...current,
        [key]: value,
      }));
    }

  async function testConnection(): Promise<void> {
    if (!createdConnectionId) {
      setWorkflowError("Create the connection before testing it.");
      return;
    }

    setTestStatus("TESTING");
    setWorkflowError(null);

    try {
      const result = await testEnterpriseConnection(
        createdConnectionId,
      );
      console.log("Connection test result:", result);

      setTestResult(result);
      setTestStatus(result.success ? "SUCCESS" : "ERROR");
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Unable to test enterprise connection.";

      setWorkflowError(message);
      setTestStatus("ERROR");
    }
  }

  function submitPreviewRequest() {
    /*
     * Replace with:
     *
     * POST /v1/integrations/preview-requests
     *
     * Email yourself only a notification:
     * "A new Snowflake preview request was submitted."
     *
     * Do not include credentials or secrets in the email.
     */

    setStep(4);
  }

async function startGoogleCloudOAuth(): Promise<void> {
  console.log("startGoogleCloudOAuth started");

  setIsStartingGoogleOAuth(true);
  setWorkflowError(null);
  
  const token = localStorage.getItem("token");

  console.log("Token present:", Boolean(token));

  if (!token) {
    setWorkflowError(
      "Your application session has expired. Please sign in again.",
    );
    setIsStartingGoogleOAuth(false);
    return;
}

  const projectId = values.project_id?.trim();

  console.log("Project ID:", projectId);

  if (!projectId) {
  setWorkflowError(
    "Enter the Google Cloud project ID before authorizing Google Cloud.",
  );
  setIsStartingGoogleOAuth(false);
  return;
}

  try {
    let connectionId = createdConnectionId;

    console.log("Existing connection ID:", connectionId);

    if (!connectionId) {
      const payload = buildConnectionPayload();

      console.log(
        "Creating pending OAuth connection:",
        payload,
      );

      const created =
        await createEnterpriseConnection(payload);

      console.log("Pending connection created:", created);

      connectionId = created.connection_id;
      setCreatedConnectionId(connectionId);
    }

    console.log(
      "Calling Google OAuth start endpoint:",
      connectionId,
    );

    const oauthPayload = {
      connection_id: connectionId,
      project_id: projectId,
      return_url: `${window.location.origin}/?page=connections`,
    };

    console.log("GOOGLE OAUTH START PAYLOAD", oauthPayload);
    console.log("GOOGLE OAUTH START URL", `${API_BASE_URL}/v1/oauth/google/start`);
    console.log("GOOGLE OAUTH CONNECTION ID", connectionId);
    console.log("GOOGLE OAUTH PROJECT ID", projectId);
    console.log("GOOGLE OAUTH RETURN URL", oauthPayload.return_url);

    const response = await fetch(
      `${API_BASE_URL}/v1/oauth/google/start`,
      {
        method: "POST",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(oauthPayload),
      },
    );

    const responseText = await response.text();

    console.log(
      "GOOGLE OAUTH START RESPONSE",
      response.status,
      responseText,
    );

    let body: any = null;

    if (responseText) {
      try {
        body = JSON.parse(responseText);
      } catch {
        body = null;
      }
    }

    if (!response.ok || !body?.authorization_url) {
      throw new Error(
        typeof body?.detail === "string"
          ? body.detail
          : body?.detail
            ? JSON.stringify(body.detail)
            : responseText ||
              "Unable to start Google Cloud authorization.",
      );
    }

    console.log(
      "Redirecting to:",
      body.authorization_url,
    );

    window.location.assign(body.authorization_url);
  } catch (error) {
    console.error("Google OAuth launch failed:", error);

    setWorkflowError(
      error instanceof Error
        ? error.message
        : "Unable to start Google Cloud authorization.",
    );
     setIsStartingGoogleOAuth(false);
  }
}

  function buildConnectionPayload():
  EnterpriseConnectionCreateRequest {
  let serviceAccountJson:
    | Record<string, unknown>
    | null = null;

  if (
    connector.id === "bigquery" &&
    authenticationMethod === "service_account"
  ) {
    try {
      serviceAccountJson = JSON.parse(
        values.service_account_json ?? "",
      ) as Record<string, unknown>;
    } catch {
      throw new Error(
        "The Google service-account JSON is not valid JSON.",
      );
    }
  }

  const authenticationType =
    connector.id === "bigquery"
      ? authenticationMethod === "service_account"
        ? "SERVICE_ACCOUNT"
        : "GOOGLE_OAUTH"
      : connector.id === "snowflake" &&
          authenticationMethod === "key_pair"
        ? "KEY_PAIR"
        : connector.id === "mongodb"
          ? "CONNECTION_STRING"
          : connector.id === "azure_sql"
            ? "USERNAME_PASSWORD"
            : "OAUTH_CLIENT_CREDENTIALS";

  const environment =
    values.environment?.trim().toUpperCase();

  if (
    !environment ||
    !["DEV", "STG", "TEST", "PRODUCTION"].includes(environment)
  ) {
    throw new Error(
      "Select an Enterprise Connection environment before continuing.",
    );
  }

  const connectionCapabilities = [
    "READ_DATA",
    "READ_METADATA",
    "TEST_CONNECTION",
  ];

  if (
    governedExecutionEnabled &&
    supportsGovernedExecution &&
    (environment === "DEV" || environment === "STG")
  ) {
    connectionCapabilities.push("EXECUTE_DQ_REMEDIATION");
  }

  return {
    connection_name:
      values.connection_name?.trim() ||
      `${connector.name} Connection`,

    vendor: connector.id.toUpperCase(),
    product: "AI Data Steward Copilot",

    connection_type:
      connector.id === "databricks"
        ? "LAKEHOUSE"
        : connector.id === "snowflake"
          ? "DATA_WAREHOUSE"
          : connector.id === "mongodb"
            ? "DOCUMENT_DATABASE"
            : connector.id === "azure_sql"
              ? "RELATIONAL_DATABASE"
              : "CLOUD_DATA_WAREHOUSE",

    environment,

    description: connector.description,

    api_endpoint:
      values.workspace_url?.trim() ||
      values.environment_url?.trim() ||
      values.instance_url?.trim() ||
      values.pod_url?.trim() ||
      null,

    workspace_name:
      values.workspace_id?.trim() ||
      values.warehouse?.trim() ||
      values.project_id?.trim() ||
      ((connector.id === "mongodb" || connector.id === "azure_sql")
        ? values.database?.trim()
        : null) ||
      null,

    connection_capabilities: connectionCapabilities,

    credentials: {
      authentication_type: authenticationType,

      client_id: values.client_id?.trim() || null,
      client_secret:
        values.client_secret?.trim() || null,
      token_url: values.token_url?.trim() || null,
      scope: values.scope?.trim() || null,

      username: values.username?.trim() || null,
      password: values.password || null,
      private_key: values.private_key || null,
      private_key_passphrase:
        values.private_key_passphrase || null,

      service_account_json:
        authenticationType === "SERVICE_ACCOUNT"
          ? serviceAccountJson
          : null,

      additional_properties:
        connector.id === "mongodb"
          ? {
              connection_uri: values.connection_uri?.trim() || null,
            }
          : {},
    },

    connection_details: {
      account:
        values.account_identifier?.trim() || null,
      organization:
        values.organization?.trim() || null,
      database: values.database?.trim() || null,
      schema: values.schema?.trim() || null,
      warehouse: values.warehouse?.trim() || null,
      role: values.role?.trim() || null,
      catalog: values.catalog?.trim() || null,
      project_id:
        values.project_id?.trim() || null,
      dataset: values.dataset?.trim() || null,
      server: values.server?.trim() || null,
      port: values.port?.trim()
        ? Number(values.port.trim())
        : connector.id === "azure_sql"
          ? 1433
          : null,
    },

    network_config: {
      timeout_seconds: 60,
      retry_attempts: 3,
      verify_ssl: true,
    },

    health_check_config: {
      enabled: true,
      method: "GET",
    },

    tags: [
      connector.name,
      "Enterprise",
      "AI Data Steward Copilot",
    ],
  };
}

  async function createConnection(): Promise<void> {
      if (createdConnectionId) {
          setStep(3);
          return;
    }
    setWorkflowError(null);
    setTestStatus("IDLE");
    setTestResult(null);

  try {
    const payload = buildConnectionPayload();

    const created = await createEnterpriseConnection(payload);

    setCreatedConnectionId(created.connection_id);
    setWorkflowError(null);
    setStep(3);
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Unable to create enterprise connection.";

    setWorkflowError(message);
    setTestStatus("ERROR");
  }
}

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 2000,
        background: "rgba(15, 23, 42, 0.58)",
        padding: 24,
        display: "grid",
        placeItems: "center",
        overflowY: "auto",
      }}
    >
      <div
        style={{
          width: "min(860px, 100%)",
          maxHeight: "94vh",
          overflowY: "auto",
          background: "#ffffff",
          borderRadius: 20,
          boxShadow: "0 28px 80px rgba(15, 23, 42, 0.3)",
        }}
      >
        <div
          style={{
            padding: "24px 28px",
            borderBottom: "1px solid #e2e8f0",
            display: "flex",
            justifyContent: "space-between",
            gap: 20,
          }}
        >
          <div style={{ display: "flex", gap: 14 }}>
            <div
              style={{
                width: 48,
                height: 48,
                borderRadius: 13,
                display: "grid",
                placeItems: "center",
                background: "#eff6ff",
                border: "1px solid #bfdbfe",
                color: "#1d4ed8",
                fontWeight: 900,
              }}
          >
              <img
                  src={connector.logo}
                  alt={`${connector.name} logo`}
                  style={{
                    width: connector.logoSize,
                    height: connector.logoSize,
                    objectFit: "contain",
                    display: "block",
                  }}
                />
            </div>

            <div>
              <h2
                style={{
                  margin: 0,
                  color: "#173c72",
                  fontSize: 23,
                }}
              >
                {connector.name} Connection
              </h2>

              <div
                style={{
                  marginTop: 5,
                  color: "#64748b",
                  fontSize: 13,
                }}
              >
                {isPreview
                  ? "Enterprise Preview"
                  : `Step ${step} of 4`}
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            style={{
              border: "none",
              background: "transparent",
              color: "#64748b",
              fontSize: 26,
              cursor: "pointer",
            }}
          >
            ×
          </button>
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(4, 1fr)",
            gap: 8,
            padding: "18px 28px 0",
          }}
        >
       {[
              { step: 1, label: "Configure" },
              { step: 2, label: "Authenticate" },
              { step: 3, label: "Validate" },
              { step: 4, label: "Activate" },
            ].map((item, index) => {
              const itemStep = (index + 1) as WizardStep;

              return (
                <div key={item.label}>
                  <div
                    style={{
                      height: 5,
                      borderRadius: 999,
                      background:
                        itemStep <= step ? "#2563eb" : "#e2e8f0",
                    }}
                  />

                  <div
                  style={{
                    display: "flex",
                    justifyContent: "center",
                    gap: 6,
                    alignItems: "center",
                    fontWeight: 700,
                    fontSize: 14,
                  }}
                >
                  <span
                    style={{
                      width: 22,
                      height: 22,
                      borderRadius: "50%",
                      background: itemStep <= step ? "#2563eb" : "#e5e7eb",
                      color: itemStep <= step ? "#fff" : "#64748b",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: 12,
                      fontWeight: 800,
                    }}
                  >
                    {itemStep < step ? "✓" : item.step}
                  </span>

                  <span>{item.label}</span>
                </div>
                </div>
              );
            }
          )}
        </div>

        <div style={{ padding: 28 }}>
          {step === 1 && (
            <div>
              <h3 style={{ margin: "0 0 7px", color: "#334155" }}>
                1. Configure
              </h3>

              <p
                style={{
                  margin: "0 0 22px",
                  color: "#64748b",
                  fontSize: 14,
                  lineHeight: 1.6,
                }}
              >
                Enter non-secret information identifying the customer's{" "}
                {connector.name} environment.
              </p>

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns:
                    "repeat(auto-fit, minmax(260px, 1fr))",
                  gap: 18,
                }}
              >
                <div>
                  <label style={labelStyle}>
                    Environment *
                  </label>

                  <select
                    style={inputStyle}
                    value={values.environment ?? ""}
                    onChange={(event) => {
                      const environment = event.target.value;

                      setValues((current) => ({
                        ...current,
                        environment,
                        allow_dq_execution:
                          environment === "DEV" ||
                          environment === "STG"
                            ? current.allow_dq_execution ?? "false"
                            : "false",
                      }));
                    }}
                  >
                    <option value="">
                      Select environment
                    </option>

                    {ENTERPRISE_ENVIRONMENTS.map((environment) => (
                      <option
                        key={environment.value}
                        value={environment.value}
                      >
                        {environment.label}
                      </option>
                    ))}
                  </select>

                  <div
                    style={{
                      marginTop: 6,
                      color: "#64748b",
                      fontSize: 12,
                      lineHeight: 1.45,
                    }}
                  >
                    Environment classification controls which governed
                    operations are permitted. Production remediation
                    execution is always blocked.
                  </div>
                </div>

                {connector.configurationFields
                  .filter((field) => field.key !== "environment")
                  .map((field) => (
                    <div key={field.key}>
                      <label style={labelStyle}>
                        {field.label}
                        {field.required ? " *" : ""}
                      </label>

                      <input
                        style={inputStyle}
                        value={values[field.key] ?? ""}
                        placeholder={field.placeholder}
                        onChange={(event) =>
                          updateValue(field.key, event.target.value)
                        }
                      />

                      {field.helperText && (
                        <div
                          style={{
                            marginTop: 6,
                            color: "#64748b",
                            fontSize: 12,
                          }}
                        >
                          {field.helperText}
                        </div>
                      )}
                    </div>
                  ))}

                {supportsGovernedExecution &&
                  isGovernedExecutionEnvironment && (
                    <div
                      style={{
                        gridColumn: "1 / -1",
                        padding: 14,
                        borderRadius: 12,
                        border: "1px solid #bfdbfe",
                        background: "#f8fbff",
                      }}
                    >
                      <label
                        style={{
                          display: "flex",
                          alignItems: "flex-start",
                          gap: 10,
                          cursor: "pointer",
                        }}
                      >
                        <input
                          type="checkbox"
                          checked={governedExecutionEnabled}
                          onChange={(event) =>
                            updateValue(
                              "allow_dq_execution",
                              event.target.checked
                                ? "true"
                                : "false",
                            )
                          }
                          style={{
                            width: 18,
                            height: 18,
                            marginTop: 2,
                          }}
                        />

                        <span>
                          <span
                            style={{
                              display: "block",
                              fontSize: 13,
                              fontWeight: 800,
                              color: "#1e3a8a",
                            }}
                          >
                            Allow governed DQ remediation execution
                          </span>

                          <span
                            style={{
                              display: "block",
                              marginTop: 4,
                              color: "#64748b",
                              fontSize: 12,
                              lineHeight: 1.5,
                            }}
                          >
                            Adds EXECUTE_DQ_REMEDIATION to this DEV/STG
                            connection. Steward approval, technical approval,
                            SQL safety validation, and backend environment
                            controls still apply.
                          </span>
                        </span>
                      </label>
                    </div>
                  )}
              </div>

              <div
                style={{
                  marginTop: 20,
                  padding: 15,
                  borderRadius: 12,
                  background: "#eff6ff",
                  border: "1px solid #bfdbfe",
                  color: "#1e40af",
                  fontSize: 13,
                  lineHeight: 1.55,
                }}
              >
                Security Notice

Only non-secret metadata is entered during setup.

OAuth credentials and refresh tokens are securely stored using Google Secret Manager and are never emailed or displayed.
              </div>
            </div>
          )}

          {step === 2 && (
            <div>
              <h3 style={{ margin: "0 0 7px", color: "#334155" }}>
                2. Authenticate
              </h3>

              <p
                style={{
                  margin: "0 0 22px",
                  color: "#64748b",
                  fontSize: 14,
                  lineHeight: 1.6,
                }}
              >
                Select the enterprise authentication method for this
                connection.
              </p>

              <div style={{ display: "grid", gap: 14 }}>
                {connector.authenticationOptions.map((option) => {
                  const selected =
                    authenticationMethod === option.id;

                  return (
                    <button
                      key={option.id}
                      type="button"
                      onClick={() =>
                        setAuthenticationMethod(option.id)
                      }
                      style={{
                        textAlign: "left",
                        padding: 20,
                        borderRadius: 14,
                        background: selected
                          ? "#eff6ff"
                          : "#ffffff",
                        border: selected
                          ? "2px solid #2563eb"
                          : "1px solid #cbd5e1",
                        cursor: "pointer",
                      }}
                    >
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          gap: 18,
                        }}
                      >
                        <div>
                          <div
                            style={{
                              color: "#173c72",
                              fontWeight: 800,
                              fontSize: 16,
                            }}
                          >
                            {option.title}
                          </div>

                          <div
                            style={{
                              marginTop: 7,
                              color: "#64748b",
                              fontSize: 13,
                              lineHeight: 1.55,
                            }}
                          >
                            {option.description}
                          </div>
                        </div>

                        <span
                          style={{
                            color: "#2563eb",
                            fontWeight: 900,
                          }}
                        >
                          {option.badge}
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>
              
              {credentialFields.length > 0 && (
  <div
    style={{
      marginTop: 22,
      padding: 20,
      borderRadius: 14,
      border: "1px solid #dbe5f1",
      background: "#f8fafc",
    }}
  >
    <div
      style={{
        marginBottom: 16,
        color: "#173c72",
        fontSize: 15,
        fontWeight: 800,
      }}
    >
      Secure Authentication Details
    </div>

    <div
      style={{
        display: "grid",
        gridTemplateColumns:
          "repeat(auto-fit, minmax(260px, 1fr))",
        gap: 18,
      }}
    >
      {credentialFields.map((field) => {
        const isSecretField = [
          "client_secret",
          "private_key_passphrase",
          "password",
          "connection_uri",
        ].includes(field.key);

        const isLargeTextField = [
          "private_key",
          "service_account_json",
        ].includes(field.key);

        return (
          <div
            key={field.key}
            style={{
              gridColumn: isLargeTextField
                ? "1 / -1"
                : undefined,
            }}
          >
            <label style={labelStyle}>
              {field.label}
              {field.required ? " *" : ""}
            </label>

            {isLargeTextField ? (
              <textarea
                value={values[field.key] ?? ""}
                placeholder={field.placeholder}
                onChange={(event) =>
                  updateCredentialValue(
                    field.key,
                    event.target.value,
                  )
                }
                autoComplete="off"
                spellCheck={false}
                style={{
                  width: "100%",
                  minHeight:
                    field.key === "private_key"
                      ? 180
                      : 220,
                  borderRadius: 10,
                  border: "1px solid #cbd5e1",
                  padding: 14,
                  fontSize: 13,
                  lineHeight: 1.5,
                  color: "#172033",
                  background: "#ffffff",
                  boxSizing: "border-box",
                  outline: "none",
                  resize: "vertical",
                  fontFamily:
                    "ui-monospace, SFMono-Regular, Menlo, monospace",
                }}
              />
            ) : (
              <input
                type={isSecretField ? "password" : "text"}
                value={values[field.key] ?? ""}
                placeholder={field.placeholder}
                onChange={(event) =>
                  updateCredentialValue(
                    field.key,
                    event.target.value,
                  )
                }
                autoComplete="new-password"
                style={inputStyle}
              />
            )}

            {field.helperText && (
              <div
                style={{
                  marginTop: 6,
                  color: "#64748b",
                  fontSize: 12,
                }}
              >
                {field.helperText}
              </div>
            )}
          </div>
        );
      })}
    </div>
  </div>
)}


            <div
                style={{
                  marginTop: 20,
                  padding: 15,
                  borderRadius: 12,
                  background: "#fffbeb",
                  border: "1px solid #fde68a",
                  color: "#854d0e",
                  fontSize: 13,
                  lineHeight: 1.55,
                }}
              >
                Security Notice
                <br />
                Only non-secret metadata is entered during setup.
                <br />
                OAuth credentials and refresh tokens are securely stored using Google Secret Manager and are never emailed or displayed.
              </div>
            

           {isBigQueryU2M && (
        
        <div
          style={{
            gridColumn: "1 / -1",
            marginTop: 8,
            padding: 20,
            borderRadius: 14,
            border: "1px solid #bfdbfe",
            background: "#eff6ff",
          }}
        >
          <div
            style={{
              color: "#173c72",
              fontSize: 16,
              fontWeight: 800,
            }}
          >
            Authorize Google BigQuery
          </div>

          <p
            style={{
              color: "#475569",
              lineHeight: 1.6,
            }}
          >
            Authorize AI Data Steward Copilot to access your BigQuery
            project using your Google account.
          </p>

          <button
              type="button"
              style={{
                ...primaryButtonStyle,
                opacity: isStartingGoogleOAuth ? 0.6 : 1,
                cursor: isStartingGoogleOAuth ? "not-allowed" : "pointer",
              }}
              disabled={isStartingGoogleOAuth}
              onClick={() => {
                void startGoogleCloudOAuth();
              }}
            >
              {isStartingGoogleOAuth
                ? "Connecting to Google Cloud..."
                : "Connect Google Cloud"}
            </button>
        </div>
      )}
          
        </div>
      )}


          {step === 3 && (
            <div>
              <h3 style={{ margin: "0 0 7px", color: "#334155" }}>
                3. Validate
              </h3>

              <p
                style={{
                  margin: "0 0 22px",
                  color: "#64748b",
                  fontSize: 14,
                  lineHeight: 1.6,
                }}
              >
                Validate authentication, connectivity, and access to the
                requested resources.
              </p>

              {isPreview ? (
                <div
                  style={{
                    padding: 22,
                    borderRadius: 14,
                    background: "#f8fafc",
                    border: "1px solid #cbd5e1",
                  }}
                >
                  <div
                    style={{
                      color: "#173c72",
                      fontWeight: 800,
                      fontSize: 17,
                    }}
                  >
                    {connector.name} Enterprise Preview
                  </div>

                  <p
                    style={{
                      color: "#64748b",
                      lineHeight: 1.65,
                      marginBottom: 0,
                    }}
                  >
                    This connector is currently in development. Submit the
                    configuration request to join the preview program. No
                    credentials will be emailed.
                  </p>
                </div>
              ) : (
                <>
                  <button
                    type="button"
                    style={{
                      ...primaryButtonStyle,
                      opacity:
                        testStatus === "TESTING" ||
                        testStatus === "SUCCESS"
                          ? 0.65
                          : 1,
                      cursor:
                        testStatus === "TESTING" ||
                        testStatus === "SUCCESS"
                          ? "not-allowed"
                          : "pointer",
                    }}
                    disabled={
                      testStatus === "TESTING" ||
                      testStatus === "SUCCESS"
                    }
                    onClick={testConnection}
                  >
                    {testStatus === "TESTING"
                      ? "Testing Connection..."
                      : "Test Connection"}
                  </button>
                    {testResult && (
                <div
                  style={{
                    marginTop: 18,
                    padding: 16,
                    display: "grid",
                    gap: 10,
                    borderRadius: 12,
                    background: testResult.success
                      ? "#ecfdf3"
                      : "#fef2f2",
                    border: testResult.success
                      ? "1px solid #abefc6"
                      : "1px solid #fecaca",
                    color: testResult.success
                      ? "#166534"
                      : "#991b1b",
                  }}
                >
                  <div>
                    <strong>Status:</strong> {testResult.health_status}
                  </div>

                  <div>
                    <strong>Message:</strong> {testResult.message}
                  </div>

                  <div>
                    <strong>Response Time:</strong>{" "}
                    {testResult.response_time_ms} ms
                  </div>

                  <div>
                    <strong>Tested At:</strong>{" "}
                    {new Date(testResult.tested_at).toLocaleString()}
                  </div>
                </div>
              )}       

          {workflowError && (
            <div
              style={{
                marginTop: 18,
                padding: 14,
                borderRadius: 10,
                background: "#fef2f2",
                border: "1px solid #fecaca",
                color: "#991b1b",
                fontWeight: 600,
              }}
            >
              {workflowError}
            </div>
          )}
                  
                </>
              )}
            </div>
          )}

          {step === 4 && (
            <div
              style={{
                textAlign: "center",
                padding: "28px 12px",
              }}
            >
              <div
                style={{
                  width: 64,
                  height: 64,
                  margin: "0 auto 16px",
                  borderRadius: "50%",
                  display: "grid",
                  placeItems: "center",
                  background: "#ecfdf3",
                  border: "1px solid #abefc6",
                  color: "#067647",
                  fontWeight: 900,
                  fontSize: 26,
                }}
              >
                ✓
              </div>

              <h3
                style={{
                  color: "#173c72",
                  fontSize: 22,
                  marginBottom: 10,
                }}
              >
                {isPreview
                  ? "Preview Request Submitted"
                  : "Connection Activated"}
              </h3>

              <p
                style={{
                  color: "#64748b",
                  lineHeight: 1.65,
                  maxWidth: 560,
                  margin: "0 auto",
                }}
              >
                {isPreview
                  ? `Your ${connector.name} enterprise preview request has been recorded. ADMS can notify the integration team without including credentials or secrets.`
                  : `${connector.name} is connected and ready for governed processing.`}
              </p>
            </div>
          )}
        </div>

        <div
          style={{
            padding: "20px 28px",
            borderTop: "1px solid #e2e8f0",
            display: "flex",
            justifyContent: "space-between",
            gap: 12,
          }}
        >
          {step < 4 ? (
            <>
              <button
                type="button"
                style={secondaryButtonStyle}
                onClick={() => {
                  if (step === 1) {
                    onClose();
                  } else {
                    setStep((current) =>
                      Math.max(1, current - 1) as WizardStep
                    );
                  }
                }}
              >
                {step === 1 ? "Cancel" : "Back"}
              </button>

              {step === 1 && (
                <button
                  type="button"
                  style={{
                    ...primaryButtonStyle,
                    opacity: configureComplete ? 1 : 0.5,
                  }}
                  disabled={!configureComplete}
                  onClick={() => setStep(2)}
                >
                  Continue
                </button>
              )}

              {step === 2 && (
                <button
                  type="button"
                  style={{
                    ...primaryButtonStyle,
                    opacity:
                      credentialFieldsComplete ||
                      credentialFields.length === 0
                        ? 1
                        : 0.5,
                  }}
                  disabled={
                    credentialFields.length > 0 &&
                    !credentialFieldsComplete
                  }
                  onClick={() => {
                      if (
                        connector.id === "bigquery" &&
                        authenticationMethod === "google_oauth"
                      ) {
                        void startGoogleCloudOAuth();
                        return;
                      }

                      if (isPreview) {
                        setStep(3);
                        return;
                      }

                      void createConnection();
                    }}
                >
                  Continue
                </button>
              )}

              {step === 3 && (
                <button
                  type="button"
                  style={{
                      ...primaryButtonStyle,
                      opacity:
                        isPreview || testStatus === "SUCCESS"
                          ? 1
                          : 0.5,
                      cursor:
                        isPreview || testStatus === "SUCCESS"
                          ? "pointer"
                          : "not-allowed",
                    }}
                  disabled={
                    !isPreview && testStatus !== "SUCCESS"
                  }
                  onClick={
                    isPreview
                      ? submitPreviewRequest
                      : completeActivation
                  }
                >
                  {isPreview
                    ? "Request Early Access"
                    : "Activate Connection"}
                </button>
              )}
            </>
          ) : (
            <div
              style={{
                width: "100%",
                display: "flex",
                justifyContent: "flex-end",
              }}
            >
              <button
                type="button"
                style={primaryButtonStyle}
                onClick={onClose}
              >
                Done
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

type CustomConnectionRequestModalProps = {
  onClose: () => void;
};

function CustomConnectionRequestModal({
  onClose,
}: CustomConnectionRequestModalProps) {
  const [vendorName, setVendorName] = useState("");
  const [connectionType, setConnectionType] =
    useState("DATABASE");
  const [environment, setEnvironment] =
    useState("PRODUCTION");
  const [authPreference, setAuthPreference] =
    useState("SERVICE_ACCOUNT");

  const [readDataRequired, setReadDataRequired] =
    useState(true);
  const [metadataRequired, setMetadataRequired] =
    useState(true);

  const [useCase, setUseCase] = useState("");

  const [submitting, setSubmitting] =
    useState(false);
  const [submitted, setSubmitted] =
    useState(false);
  const [error, setError] =
    useState<string | null>(null);

  async function submitRequest(): Promise<void> {
    if (!vendorName.trim()) {
      setError("Enter a platform or vendor name.");
      return;
    }

    const token = localStorage.getItem("token");

    if (!token) {
      setError(
        "Your session has expired. Please sign in again.",
      );
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const response = await fetch(
        `${API_BASE_URL}/v1/connections/custom-request`,
        {
          method: "POST",
          headers: {
            Accept: "application/json",
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            vendor_name: vendorName.trim(),
            connection_type: connectionType,
            environment,
            auth_preference: authPreference,
            read_data_required: readDataRequired,
            metadata_required: metadataRequired,
            use_case: useCase.trim() || null,
          }),
        },
      );

      const text = await response.text();

      if (!response.ok) {
        throw new Error(
          text ||
            "Unable to submit custom connection request.",
        );
      }

      setSubmitted(true);
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Unable to submit custom connection request.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div
      role="presentation"
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 2100,
        display: "grid",
        placeItems: "center",
        padding: 24,
        background: "rgba(15, 23, 42, 0.58)",
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        onClick={(event) => event.stopPropagation()}
        style={{
          width: "min(680px, 100%)",
          maxHeight: "92vh",
          overflowY: "auto",
          background: "#ffffff",
          borderRadius: 20,
          padding: 28,
          boxShadow:
            "0 28px 80px rgba(15, 23, 42, 0.28)",
        }}
      >
        {submitted ? (
          <div
            style={{
              textAlign: "center",
              padding: "30px 12px",
            }}
          >
            <div
              style={{
                width: 64,
                height: 64,
                margin: "0 auto 18px",
                borderRadius: "50%",
                display: "grid",
                placeItems: "center",
                background: "#ecfdf3",
                color: "#067647",
                fontSize: 28,
                fontWeight: 900,
              }}
            >
              ✓
            </div>

            <h2 style={{ color: "#173c72" }}>
              Connection request received
            </h2>

            <p
              style={{
                color: "#64748b",
                lineHeight: 1.65,
              }}
            >
              Our team will review your requirements
              and contact you about configuration.
            </p>

            <button
              type="button"
              style={primaryButtonStyle}
              onClick={onClose}
            >
              Done
            </button>
          </div>
        ) : (
          <>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                marginBottom: 24,
              }}
            >
              <div>
                <div
                  style={{
                    color: "#2563eb",
                    fontSize: 12,
                    fontWeight: 850,
                  }}
                >
                  CUSTOM INTEGRATION
                </div>

                <h2
                  style={{
                    margin: "5px 0 0",
                    color: "#173c72",
                  }}
                >
                  Request New Connection
                </h2>
              </div>

              <button
                type="button"
                onClick={onClose}
                style={{
                  border: 0,
                  background: "transparent",
                  cursor: "pointer",
                  fontSize: 26,
                  color: "#64748b",
                }}
              >
                ×
              </button>
            </div>

            <div
              style={{
                display: "grid",
                gridTemplateColumns:
                  "repeat(auto-fit, minmax(250px, 1fr))",
                gap: 18,
              }}
            >
              <div>
                <label style={labelStyle}>
                  Platform / Vendor *
                </label>
                <input
                  style={inputStyle}
                  value={vendorName}
                  placeholder="Microsoft SQL Server"
                  onChange={(event) =>
                    setVendorName(event.target.value)
                  }
                />
              </div>

              <div>
                <label style={labelStyle}>
                  Connection Type
                </label>
                <select
                  style={inputStyle}
                  value={connectionType}
                  onChange={(event) =>
                    setConnectionType(event.target.value)
                  }
                >
                  <option value="DATABASE">Database</option>
                  <option value="DATA_WAREHOUSE">
                    Data Warehouse
                  </option>
                  <option value="API">API</option>
                  <option value="MDM">MDM</option>
                  <option value="GOVERNANCE">
                    Governance
                  </option>
                  <option value="OTHER">Other</option>
                </select>
              </div>

              <div>
                <label style={labelStyle}>
                  Environment
                </label>
                <select
                  style={inputStyle}
                  value={environment}
                  onChange={(event) =>
                    setEnvironment(event.target.value)
                  }
                >
                  <option value="PRODUCTION">
                    Production
                  </option>
                  <option value="TEST">Test</option>
                  <option value="DEVELOPMENT">
                    Development
                  </option>
                </select>
              </div>

              <div>
                <label style={labelStyle}>
                  Authentication Preference
                </label>
                <select
                  style={inputStyle}
                  value={authPreference}
                  onChange={(event) =>
                    setAuthPreference(event.target.value)
                  }
                >
                  <option value="SERVICE_ACCOUNT">
                    Service Account
                  </option>
                  <option value="OAUTH">OAuth</option>
                  <option value="USERNAME_PASSWORD">
                    Username / Password
                  </option>
                  <option value="API_KEY">
                    API Key
                  </option>
                  <option value="OTHER">Other</option>
                </select>
              </div>
            </div>

            <div
              style={{
                display: "flex",
                gap: 24,
                marginTop: 22,
              }}
            >
              <label>
                <input
                  type="checkbox"
                  checked={readDataRequired}
                  onChange={(event) =>
                    setReadDataRequired(
                      event.target.checked,
                    )
                  }
                />{" "}
                Read Data Required
              </label>

              <label>
                <input
                  type="checkbox"
                  checked={metadataRequired}
                  onChange={(event) =>
                    setMetadataRequired(
                      event.target.checked,
                    )
                  }
                />{" "}
                Metadata Required
              </label>
            </div>

            <div style={{ marginTop: 22 }}>
              <label style={labelStyle}>
                Use Case / Notes
              </label>

              <textarea
                value={useCase}
                onChange={(event) =>
                  setUseCase(event.target.value)
                }
                placeholder="Describe what you want AI Data Steward Copilot to access and why..."
                style={{
                  width: "100%",
                  minHeight: 130,
                  borderRadius: 10,
                  border: "1px solid #cbd5e1",
                  padding: 14,
                  boxSizing: "border-box",
                  fontSize: 14,
                  resize: "vertical",
                }}
              />
            </div>

            <div
              style={{
                marginTop: 18,
                padding: 14,
                borderRadius: 10,
                background: "#eff6ff",
                border: "1px solid #bfdbfe",
                color: "#1e40af",
                fontSize: 13,
                lineHeight: 1.6,
              }}
            >
              Do not enter passwords, tokens, API keys,
              private keys, or other credentials. Secure
              authentication details will be configured
              separately.
            </div>

            {error && (
              <div
                style={{
                  marginTop: 16,
                  color: "#b91c1c",
                }}
              >
                {error}
              </div>
            )}

            <div
              style={{
                marginTop: 24,
                display: "flex",
                justifyContent: "flex-end",
                gap: 12,
              }}
            >
              <button
                type="button"
                style={secondaryButtonStyle}
                onClick={onClose}
              >
                Cancel
              </button>

              <button
                type="button"
                style={{
                  ...primaryButtonStyle,
                  opacity: submitting ? 0.6 : 1,
                }}
                disabled={submitting}
                onClick={() => void submitRequest()}
              >
                {submitting
                  ? "Submitting..."
                  : "Submit Request"}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

interface EnterpriseConnectionsPageProps {
  successMessage?: string | null;
  onDismissSuccess?: () => void;
}

function EnterpriseConnectionsPage({
  successMessage,
  onDismissSuccess,
}: EnterpriseConnectionsPageProps) {
  const [selectedIntegration, setSelectedIntegration] =
    useState<ConnectorDefinition | null>(null);
  const [managedConnection, setManagedConnection] =
    useState<EnterpriseConnection | null>(null);
  const [integrations, setIntegrations] =
    useState<ConnectorDefinition[]>(INTEGRATIONS);
  const [managedTestStatus, setManagedTestStatus] = useState<
    "IDLE" | "TESTING" | "SUCCESS" | "ERROR"
  >("IDLE");
  const [managedTestMessage, setManagedTestMessage] =
    useState<string | null>(null);
  const [wizardOpen, setWizardOpen] = useState(false);
  const [connectionTotal, setConnectionTotal] = useState(0);
  const [connections, setConnections] =
    useState<EnterpriseConnection[]>([]);
  const [connectionsLoading, setConnectionsLoading] = useState(true);
  const [connectionsError, setConnectionsError] =
    useState<string | null>(null);
  const [customConnectionOpen, setCustomConnectionOpen] =
  useState(false);

  const activeConnectionTotal =
    connections.filter(isConnectionHealthy).length;

  useEffect(() => {
    void loadConnections();
  }, []);

  async function loadConnections(): Promise<void> {
    setConnectionsLoading(true);
    setConnectionsError(null);

    try {
      const response = await getEnterpriseConnections(1, 100);
      setConnections(response.items);
      setConnectionTotal(response.total);
    } catch (error) {
      setConnectionsError(
        error instanceof Error
          ? error.message
          : "Unable to load enterprise connections.",
      );
    } finally {
      setConnectionsLoading(false);
    }
  }

  async function testManagedConnection(): Promise<void> {
    if (!managedConnection) {
      return;
    }

    setManagedTestStatus("TESTING");
    setManagedTestMessage(null);

    try {
      const result = await testEnterpriseConnection(
        managedConnection.connection_id,
      );

      setManagedTestStatus(result.success ? "SUCCESS" : "ERROR");
      setManagedTestMessage(
        result.message ||
          (result.success
            ? "Connection test completed successfully."
            : "The connection test did not succeed."),
      );

      await loadConnections();

    if (result.success && managedConnection) {
        setManagedConnection({
          ...managedConnection,
          health_status:
            result.health_status as EnterpriseConnection["health_status"],
          updated_at: result.tested_at,
        });
      }
    } catch (error) {
      setManagedTestStatus("ERROR");
      setManagedTestMessage(
        error instanceof Error
          ? error.message
          : "Unable to test the connection.",
      );
    }
  }

  function closeManagedConnection(): void {
    setManagedConnection(null);
    setManagedTestStatus("IDLE");
    setManagedTestMessage(null);
  }

  async function disconnectManagedConnection(): Promise<void> {
    if (!managedConnection) {
      return;
    }

    const confirmed = window.confirm(
      `Disconnect "${managedConnection.connection_name}"?`,
    );

    if (!confirmed) {
      return;
    }

    setManagedTestStatus("ERROR");
    setManagedTestMessage(
      "Disconnect is not yet connected to a backend delete endpoint.",
    );
  }

  function formatActiveLiveCount(count: number): string {
    return `${count} active connection${count === 1 ? "" : "s"}`;
  }

  function normalizeConnectionVendor(vendor: string): string {
    const normalized = vendor.trim().toUpperCase();

    if (normalized === "GOOGLE_BIGQUERY") {
      return "BIGQUERY";
    }

    return normalized;
  }

  function isConnectionHealthy(
  connection: EnterpriseConnection,
): boolean {
    const healthStatus = String(
      connection.health_status ?? "",
    ).toUpperCase();

    return (
      connection.is_active === true &&
      ["HEALTHY", "CONNECTED", "SUCCESS", "ACTIVE"].includes(
        healthStatus,
      )
    );
  }

  function openConnector(integration: ConnectorDefinition): void {
    setSelectedIntegration(integration);
    setWizardOpen(true);
  }

  function closeConnector(): void {
    setWizardOpen(false);
    setSelectedIntegration(null);
  }

  function handleConnectionActivated(connectorId: ConnectorId): void {
    setIntegrations((current) =>
      current.map((integration) =>
        integration.id === connectorId
          ? {
              ...integration,
              status: "CONNECTED",
            }
          : integration,
      ),
    );

    void loadConnections();
  }

  function getLiveConnectionCount(
  connectorId: ConnectorId,
): number {
  const vendorMap: Partial<Record<ConnectorId, string>> = {
    databricks: "DATABRICKS",
    snowflake: "SNOWFLAKE",
    bigquery: "BIGQUERY",
    mongodb: "MONGODB",
    azure_sql: "AZURE_SQL",
  };

  const expectedVendor = vendorMap[connectorId];

  if (!expectedVendor) {
    return 0;
  }

  return connections.filter((connection) => {
    const vendorMatches =
      normalizeConnectionVendor(connection.vendor) ===
      expectedVendor;

    return vendorMatches && isConnectionHealthy(connection);
  }).length;
}

  function getActiveConnection(
    connectorId: ConnectorId,
  ): EnterpriseConnection | null {
    const vendorMap: Partial<Record<ConnectorId, string>> = {
      databricks: "DATABRICKS",
      snowflake: "SNOWFLAKE",
      bigquery: "BIGQUERY",
      mongodb: "MONGODB",
      azure_sql: "AZURE_SQL",
    };

    const expectedVendor = vendorMap[connectorId];

    if (!expectedVendor) {
      return null;
    }

    const matchingConnections = connections
      .filter((connection) => {
        const vendorMatches =
          normalizeConnectionVendor(connection.vendor) === expectedVendor;
        return (
          vendorMatches &&
          isConnectionHealthy(connection)
);
      })
      .sort((a, b) => {
        const aTime = new Date(
          a.updated_at ?? a.created_at,
        ).getTime();
        const bTime = new Date(
          b.updated_at ?? b.created_at,
        ).getTime();

        return bTime - aTime;
      });

    return matchingConnections[0] ?? null;
  }

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#f6f8fc",
        padding: 32,
      }}
    >
      <div
        style={{
          maxWidth: 1440,
          margin: "0 auto",
        }}
      >
        <section
          style={{
            background:
              "linear-gradient(135deg, #ffffff 0%, #f3f7ff 100%)",
            border: "1px solid #d9e2f0",
            borderRadius: 20,
            padding: 30,
            marginBottom: 24,
          }}
        >
          <div
            style={{
              color: "#2563eb",
              fontSize: 13,
              fontWeight: 800,
              marginBottom: 8,
            }}
          >
            SETTINGS / INTEGRATIONS
          </div>

          <h1
            style={{
              margin: 0,
              color: "#173c72",
              fontSize: 31,
            }}
          >
            Enterprise Connections
          </h1>

          <div
            style={{
              marginTop: 14,
              color: "#173c72",
              fontSize: 22,
              fontWeight: 800,
            }}
          >
            {activeConnectionTotal} Connected Enterprise Platforms
          </div>

          <div
            style={{
              marginTop: 8,
              color: "#64748b",
              fontSize: 13,
              fontWeight: 700,
            }}
          >
            {connectionTotal} total connection records
          </div>

          <p
            style={{
              color: "#64748b",
              fontSize: 15,
              lineHeight: 1.7,
              maxWidth: 900,
              marginBottom: 0,
            }}
          >
            Securely connect AI Data Steward Copilot to enterprise data
            platforms, MDM systems, governance tools, cloud warehouses, and
            lakehouse environments.
          </p>
        </section>

        {connectionsLoading && (
          <div
            style={{
              marginBottom: 20,
              padding: 14,
              borderRadius: 12,
              background: "#eff6ff",
              color: "#1d4ed8",
              border: "1px solid #bfdbfe",
              fontWeight: 700,
            }}
          >
            Loading enterprise connections...
          </div>
        )}

        {connectionsError && (
          <div
            style={{
              marginBottom: 20,
              padding: 14,
              borderRadius: 12,
              background: "#fef2f2",
              color: "#b91c1c",
              border: "1px solid #fecaca",
              fontWeight: 700,
            }}
          >
            {connectionsError}
          </div>
        )}

        {successMessage && (
          <div
            style={{
              marginBottom: 20,
              padding: 16,
              borderRadius: 12,
              background: "#ecfdf3",
              border: "1px solid #abefc6",
              color: "#166534",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <div>
              <div style={{ fontWeight: 700 }}>
                ✓ Google BigQuery Connected
              </div>
              <div>{successMessage}</div>
            </div>

            <button
              type="button"
              onClick={onDismissSuccess}
              style={{
                border: 0,
                background: "transparent",
                cursor: "pointer",
                fontSize: 20,
                color: "#166534",
              }}
            >
              ×
            </button>
          </div>
        )}

        <section
          style={{
            display: "grid",
            gridTemplateColumns:
              "repeat(auto-fit, minmax(310px, 1fr))",
            gap: 20,
          }}
        >
          {integrations.map((integration) => {
            const activeConnection = getActiveConnection(integration.id);
            const liveCount = getLiveConnectionCount(integration.id);
            const isConnected = activeConnection !== null;
            const available =
              integration.status === "AVAILABLE" || isConnected;

            return (
              <article
                key={integration.id}
                style={{
                  background: "#ffffff",
                  border: "1px solid #d9e2f0",
                  borderRadius: 18,
                  padding: 24,
                  boxShadow: "0 8px 24px rgba(31, 58, 95, 0.06)",
                  opacity: available ? 1 : 0.76,
                }}
              >
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    gap: 16,
                    marginBottom: 18,
                  }}
                >
                  <div
                    style={{
                      width: 50,
                      height: 50,
                      borderRadius: 14,
                      display: "grid",
                      placeItems: "center",
                      background: "#eff6ff",
                      border: "1px solid #bfdbfe",
                    }}
                  >
                    <img
                      src={integration.logo}
                      alt={`${integration.name} logo`}
                      style={{
                        width: integration.logoSize,
                        height: integration.logoSize,
                        objectFit: "contain",
                        display: "block",
                      }}
                    />
                  </div>

                  <span
                    style={{
                      alignSelf: "flex-start",
                      borderRadius: 999,
                      padding: "6px 10px",
                      fontSize: 11,
                      fontWeight: 850,
                      color: available ? "#067647" : "#64748b",
                      background: available ? "#ecfdf3" : "#f1f5f9",
                      border: available
                        ? "1px solid #abefc6"
                        : "1px solid #cbd5e1",
                    }}
                  >
                    {isConnected
                      ? formatActiveLiveCount(liveCount)
                      : integration.status === "AVAILABLE"
                        ? "AVAILABLE"
                        : "0 Active Connections"}
                  </span>
                </div>

                <div
                  style={{
                    color: "#64748b",
                    fontSize: 12,
                    fontWeight: 800,
                    textTransform: "uppercase",
                    marginBottom: 7,
                  }}
                >
                  {integration.category}
                </div>

                <h2
                  style={{
                    color: "#173c72",
                    fontSize: 20,
                    margin: "0 0 10px",
                  }}
                >
                  {integration.name}
                </h2>

                <p
                  style={{
                    color: "#64748b",
                    fontSize: 14,
                    lineHeight: 1.65,
                    minHeight: 92,
                  }}
                >
                  {integration.description}
                </p>

                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    color: "#475569",
                    fontSize: 13,
                    fontWeight: 700,
                    marginBottom: 15,
                  }}
                >
                  {liveCount > 0 && (
                    <span
                      style={{
                        width: 8,
                        height: 8,
                        borderRadius: "50%",
                        background: "#22c55e",
                        boxShadow: "0 0 6px rgba(34, 197, 94, 0.45)",
                        display: "inline-block",
                      }}
                    />
                  )}
                  {formatActiveLiveCount(liveCount)}
                </div>

                <button
                  type="button"
                  onClick={() => {
                    if (activeConnection) {
                      setManagedConnection(activeConnection);
                      setManagedTestStatus("IDLE");
                      setManagedTestMessage(null);
                      return;
                    }

                    openConnector(integration);
                  }}
                  style={{
                    width: "100%",
                    borderRadius: 10,
                    padding: "12px 16px",
                    border: isConnected
                      ? "none"
                      : integration.status === "AVAILABLE"
                        ? "none"
                        : "1px solid #cbd5e1",
                    background: isConnected
                      ? "#22c55e"
                      : integration.status === "AVAILABLE"
                        ? "#1d4ed8"
                        : "#f8fafc",
                    color: isConnected
                      ? "#ffffff"
                      : integration.status === "AVAILABLE"
                        ? "#ffffff"
                        : "#475569",
                    fontWeight: 800,
                    cursor: "pointer",
                  }}
                >
                  {isConnected
                    ? "Manage Connection"
                    : integration.status === "AVAILABLE"
                      ? "Connect"
                      : "Request Early Access"}
                </button>
              </article>
                      );
          })}

          {/* Custom Connection Request */}
          <article
            style={{
              background:
                "linear-gradient(145deg, #ffffff 0%, #f5f9ff 100%)",
              border: "1px dashed #93c5fd",
              borderRadius: 18,
              padding: 24,
              boxShadow:
                "0 8px 24px rgba(31, 58, 95, 0.06)",
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                gap: 16,
                marginBottom: 18,
              }}
            >
              <div
                style={{
                  width: 50,
                  height: 50,
                  borderRadius: 14,
                  display: "grid",
                  placeItems: "center",
                  background: "#eff6ff",
                  border: "1px solid #bfdbfe",
                  color: "#2563eb",
                  fontSize: 27,
                  fontWeight: 500,
                }}
              >
                +
              </div>

              <span
                style={{
                  alignSelf: "flex-start",
                  borderRadius: 999,
                  padding: "6px 10px",
                  fontSize: 11,
                  fontWeight: 850,
                  color: "#1d4ed8",
                  background: "#eff6ff",
                  border: "1px solid #bfdbfe",
                }}
              >
                AVAILABLE
              </span>
            </div>

            <div
              style={{
                color: "#64748b",
                fontSize: 12,
                fontWeight: 800,
                textTransform: "uppercase",
                marginBottom: 7,
              }}
            >
              CUSTOM INTEGRATION
            </div>

            <h2
              style={{
                color: "#173c72",
                fontSize: 20,
                margin: "0 0 10px",
              }}
            >
              Custom Connection
            </h2>

            <p
              style={{
                color: "#64748b",
                fontSize: 14,
                lineHeight: 1.65,
                minHeight: 92,
              }}
            >
              Don't see your data platform? Request a secure
              connection to your database, warehouse, API, or
              enterprise platform.
            </p>

            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                color: "#475569",
                fontSize: 13,
                fontWeight: 700,
                marginBottom: 15,
              }}
            >
              Database • Warehouse • API • MDM • Other
            </div>

            <button
              type="button"
              onClick={() =>
                setCustomConnectionOpen(true)
              }
              style={{
                width: "100%",
                borderRadius: 10,
                padding: "12px 16px",
                border: "none",
                background: "#1d4ed8",
                color: "#ffffff",
                fontWeight: 800,
                cursor: "pointer",
              }}
            >
              Request New Connection
            </button>
          </article>
        </section>

      </div>

      {wizardOpen && selectedIntegration && (
        <ConnectionWizard
          connector={selectedIntegration}
          onClose={closeConnector}
          onActivated={handleConnectionActivated}
        />
      )}
      {customConnectionOpen && (
          <CustomConnectionRequestModal
            onClose={() => setCustomConnectionOpen(false)}
  />
)}
      {managedConnection && (
        <div
          role="presentation"
          onClick={closeManagedConnection}
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 1200,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 24,
            background: "rgba(15, 23, 42, 0.48)",
          }}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="managed-connection-title"
            onClick={(event) => event.stopPropagation()}
            style={{
              width: "100%",
              maxWidth: 680,
              maxHeight: "90vh",
              overflowY: "auto",
              padding: 28,
              borderRadius: 20,
              border: "1px solid #dbe4f0",
              background: "#ffffff",
              boxShadow: "0 24px 70px rgba(15, 23, 42, 0.22)",
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "flex-start",
                gap: 16,
                marginBottom: 24,
              }}
            >
              <div>
                <h2
                  id="managed-connection-title"
                  style={{
                    margin: 0,
                    color: "#173c72",
                    fontSize: 25,
                  }}
                >
                  {normalizeConnectionVendor(managedConnection.vendor) ===
                  "BIGQUERY"
                    ? "Google BigQuery"
                    : managedConnection.vendor}
                </h2>

                <div
                  style={{
                    marginTop: 6,
                    color: "#64748b",
                  }}
                >
                  Enterprise connection details
                </div>
              </div>

              <button
                type="button"
                onClick={closeManagedConnection}
                aria-label="Close connection details"
                style={{
                  border: 0,
                  background: "transparent",
                  cursor: "pointer",
                  color: "#64748b",
                  fontSize: 26,
                }}
              >
                ×
              </button>
            </div>

            <div
              style={{
                display: "grid",
                gridTemplateColumns:
                  "repeat(auto-fit, minmax(220px, 1fr))",
                gap: 16,
              }}
            >
              <ConnectionDetail
                label="Connection Name"
                value={managedConnection.connection_name}
              />
              <ConnectionDetail
                label="Vendor"
                value={managedConnection.vendor}
              />
              <ConnectionDetail
                label="Project / Workspace"
                value={managedConnection.workspace_name}
              />
              <ConnectionDetail
                label="Environment"
                value={managedConnection.environment}
              />
              <ConnectionDetail
                label="Authentication"
                value={managedConnection.authentication_type}
              />
              <ConnectionDetail
                label="Connected Account"
                value={managedConnection.created_by}
              />
              <ConnectionDetail
                label="Status"
                value={managedConnection.health_status}
                healthy={isConnectionHealthy(managedConnection)}
              />
              <ConnectionDetail
                label="Last Updated"
                value={formatConnectionDate(managedConnection.updated_at)}
              />
            </div>

            {managedTestMessage && (
              <div
                role="status"
                style={{
                  marginTop: 20,
                  padding: "13px 15px",
                  borderRadius: 10,
                  border:
                    managedTestStatus === "SUCCESS"
                      ? "1px solid #86efac"
                      : "1px solid #fecaca",
                  background:
                    managedTestStatus === "SUCCESS"
                      ? "#ecfdf3"
                      : "#fef2f2",
                  color:
                    managedTestStatus === "SUCCESS"
                      ? "#166534"
                      : "#b91c1c",
                  fontWeight: 700,
                }}
              >
                {managedTestMessage}
              </div>
            )}

            <div
              style={{
                display: "flex",
                flexWrap: "wrap",
                justifyContent: "flex-end",
                gap: 12,
                marginTop: 26,
                paddingTop: 20,
                borderTop: "1px solid #e2e8f0",
              }}
            >
              <button
                type="button"
                onClick={() => {
                  void testManagedConnection();
                }}
                disabled={managedTestStatus === "TESTING"}
                style={{
                  ...primaryButtonStyle,
                  opacity: managedTestStatus === "TESTING" ? 0.65 : 1,
                  cursor:
                    managedTestStatus === "TESTING"
                      ? "not-allowed"
                      : "pointer",
                }}
              >
                {managedTestStatus === "TESTING"
                  ? "Testing Connection..."
                  : managedTestStatus === "SUCCESS"
                    ? "Connection Healthy"
                    : "Test Connection"}
              </button>

              <button
                type="button"
                onClick={() => {
                  void disconnectManagedConnection();
                }}
                disabled={managedTestStatus === "TESTING"}
                style={{
                  padding: "12px 18px",
                  borderRadius: 10,
                  border: "1px solid #fecaca",
                  background: "#ffffff",
                  color: "#b91c1c",
                  cursor:
                    managedTestStatus === "TESTING"
                      ? "not-allowed"
                      : "pointer",
                  fontWeight: 800,
                  opacity: managedTestStatus === "TESTING" ? 0.65 : 1,
                }}
              >
                Disconnect
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

type ConnectionDetailProps = {
  label: string;
  value: string | null | undefined;
  healthy?: boolean;
};

function ConnectionDetail({
  label,
  value,
  healthy = false,
}: ConnectionDetailProps) {
  return (
    <div
      style={{
        padding: 16,
        borderRadius: 12,
        border: "1px solid #e2e8f0",
        background: "#f8fafc",
      }}
    >
      <div
        style={{
          marginBottom: 7,
          color: "#64748b",
          fontSize: 12,
          fontWeight: 800,
          textTransform: "uppercase",
        }}
      >
        {label}
      </div>

      <div
        style={{
          color: healthy ? "#15803d" : "#173c72",
          fontWeight: 700,
          wordBreak: "break-word",
        }}
      >
        {healthy ? "● " : ""}
        {value || "Not available"}
      </div>
    </div>
  );
}

function formatConnectionDate(
  value: string | null | undefined,
): string {
  if (!value) {
    return "Not available";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleString();
}

export default EnterpriseConnectionsPage;