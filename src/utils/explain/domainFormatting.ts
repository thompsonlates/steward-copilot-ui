import type { DomainType } from "../../api/types";
import { getDomainConfig } from "../../config/domains";

/**
 * Resolve a domain-aware display label for an entity-resolution signal.
 *
 * Domain-owned labels live in src/config/domains/*.ts. This helper first
 * consults that registry, then preserves the generic legacy fallbacks used
 * by ExplainPage.
 */
export function formatSignalName(
  value?: string | null,
  domain?: string | null,
): string {
  if (!value) return "Unknown Signal";

  const normalized = value.toUpperCase();
  const normalizedDomain = (domain || "CUSTOMER").toUpperCase() as DomainType;

  try {
    const config = getDomainConfig(normalizedDomain);
    const configuredLabel = (
      config.signalLabels as Readonly<Record<string, string | undefined>>
    )[normalized];

    if (configuredLabel) {
      return configuredLabel;
    }
  } catch {
    // Preserve the old generic formatting behavior for an unexpected domain.
  }

  if (normalized === "NAME_SIMILARITY") {
    return "Name Similarity";
  }

  if (normalized === "ENTITY_ID_MATCH") {
    return "Member ID Match";
  }

  if (normalized === "NPI_MATCH") {
    return "NPI Match";
  }

  if (normalized === "PHONE_MATCH") {
    return "Phone Match";
  }

  if (normalized === "GTIN_MATCH") {
    return "GTIN Match";
  }

  if (normalized === "SKU_MATCH") {
    return "SKU Match";
  }

  if (normalized === "DOB_MATCH") {
    return "DOB Match";
  }

  if (normalized === "EMAIL_MATCH") {
    return "Email Match";
  }

  if (normalized === "ADDRESS_MATCH") {
    return "Address Match";
  }

  return value
    .split("_")
    .join(" ")
    .toLowerCase()
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

/**
 * Preserve the existing Product-specific reasoning-timeline wording.
 * This is presentation-only and does not change matching behavior.
 */
export function productTimelineLabel(
  text?: string | null,
  domain?: string,
): string {
  const value = text || "";

  if ((domain || "").toUpperCase() !== "PRODUCT") {
    return value;
  }

  return value
    .replaceAll("Name Similarity", "Product Name Similarity")
    .replaceAll("name pairs", "product name / description pairs")
    .replaceAll("Dob Match", "Effective / Lot Date Match")
    .replaceAll("DOB", "effective date / lot date")
    .replaceAll("Email Match", "GTIN Match")
    .replaceAll("Email values", "GTIN values")
    .replaceAll("Address Similarity", "Product Attribute Similarity")
    .replaceAll("Addresses", "Product attributes")
    .replaceAll("addresses", "product attributes")
    .replaceAll("Address Evidence", "Product Attribute Evidence")
    .replaceAll("Source Trust", "Source System Trust")
    .replaceAll("Policy Rules Applied", "Product Matching Rules Applied")
    .replaceAll("Triggered rules", "Product rules triggered");
}

/**
 * Preserve the existing Banking-specific reasoning-timeline wording.
 * This is presentation-only and does not change matching behavior.
 */
export function bankingTimelineText(
  text?: string | null,
  domain?: string,
): string {
  const value = text || "";

  if ((domain || "").toUpperCase() !== "BANKING") {
    return value;
  }

  return value
    .replaceAll("account_id_match", "Account ID Match")
    .replaceAll("banking_customer_id_match", "Banking Customer ID Match")
    .replaceAll(
      "sap_business_partner_id_match",
      "SAP Business Partner ID Match",
    )
    .replaceAll("routing_number_match", "Routing Number Match")
    .replaceAll(
      "account_number_last4_match",
      "Account Number Last 4 Match",
    )
    .replaceAll("institution_name_match", "Institution Name Match")
    .replaceAll("account_type_match", "Account Type Match")
    .replaceAll("currency_match", "Currency Match")
    .replaceAll("account_status_match", "Account Status Match")
    .replaceAll("email_match", "Email Match")
    .replaceAll("phone_number_match", "Phone Number Match")
    .replaceAll("phone_match", "Phone Number Match")
    .replaceAll("source_system_match", "Source System Match")
    .replaceAll("Policy Rules Applied", "Banking Match Rules Applied")
    .replaceAll("Triggered rules:", "Banking rules evaluated:");
}
