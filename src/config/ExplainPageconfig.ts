import type {
  DomainType,
  MatchFeedbackRequest,
  MemberRecord,
} from "../api/types";

export type DecisionValue = "APPROVE_MERGE" | "REVIEW" | "REJECT_MERGE";

export const DEFAULT_REQUESTED_BY = "steward_ui";
export const DEFAULT_STEWARD_USER = "steward_user";
export const DEFAULT_DOMAIN: DomainType = "CUSTOMER";
export const DEFAULT_MATCH_SCORE = 0.92;

export const DOMAIN_OPTIONS: DomainType[] = [
  "CUSTOMER",
  "SUPPLIER",
  "PRODUCT",
  "OTHER",
  "BANKING",
  "PATIENT",
  "PROVIDER",
  "LOCATION",
  "ORGANIZATION",
];

export const DECISION_OPTIONS: DecisionValue[] = [
  "APPROVE_MERGE",
  "REVIEW",
  "REJECT_MERGE",
];

export const DEFAULT_OVERRIDE_REASON_CODE: NonNullable<
  MatchFeedbackRequest["override_reason_code"]
> = "OTHER";

export const DOMAIN_RULE_PRESETS: Record<DomainType, string[]> = {
  CUSTOMER: [
    "MEMBER_ID_EXACT",
    "DOB_EXACT",
    "LASTNAME_EXACT",
    "FIRSTNAME_SIMILAR",
    "EMAIL_MATCH",
    "ADDRESS_MATCH",
  ],

  SUPPLIER: [
    "SUPPLIER_ID_EXACT",
    "SUPPLIER_NAME_SIMILAR",
    "TAX_ID_MATCH",
    "ADDRESS_MATCH",
    "PHONE_MATCH",
    "CONTACT_EMAIL_MATCH",
  ],

  PRODUCT: [
    "PRODUCT_ID_EXACT",
    "GTIN_MATCH",
    "SKU_MATCH",
    "BRAND_MATCH",
    "DESCRIPTION_SIMILAR",
    "UOM_MATCH",
  ],

  OTHER: [
    "ENTITY_ID_EXACT",
    "NAME_SIMILAR",
    "ADDRESS_MATCH",
    "EMAIL_MATCH",
  ],

  BANKING: [
    "account_id_match",
    "banking_customer_id_match",
    "sap_business_partner_id_match",
    "routing_number_match",
    "account_number_last4_match",
    "institution_name_match",
    "account_type_match",
    "currency_match",
    "account_status_match",
    "email_match",
    "phone_number_match",
    "source_system_match",
],

  PATIENT: [
    "PATIENT_ID_EXACT",
    "DOB_EXACT",
    "LASTNAME_EXACT",
    "FIRSTNAME_SIMILAR",
    "EMAIL_MATCH",
    "ADDRESS_MATCH",
  ],

  PROVIDER: [
    "NPI_EXACT",
    "PROVIDER_NAME_SIMILAR",
    "SPECIALTY_MATCH",
    "ADDRESS_MATCH",
    "EMAIL_MATCH",
  ],
  LOCATION: [
    "LOCATION_ID_MATCH",
    "SITE_ID_MATCH",
    "LOCATION_CODE_MATCH",
    "LOCATION_NAME_SIMILARITY",
    "ADDRESS_SIMILARITY",
    "PARENT_LOCATION_ID_MATCH",
    "ORGANIZATION_ENTITY_ID_MATCH",
    "SOURCE_TRUST",
  ],
  ORGANIZATION: [
    "ORGANIZATION_ENTITY_ID_MATCH",
    "ORGANIZATION_CODE_MATCH",
    "ORGANIZATION_NAME_SIMILARITY",
    "ORGANIZATION_TYPE_MATCH",
    "PARENT_ORGANIZATION_ID_MATCH",
    "ORGANIZATION_STATUS_MATCH",
    "SOURCE_TRUST",
  ],
};

export const DOMAIN_SAMPLE_RECORDS: Record<
  DomainType,
  { a: MemberRecord; b: MemberRecord }
> = {
  CUSTOMER: {
    a: {
      member_id: "MBR_1001",
      first_name: "John",
      last_name: "Smith",
      dob: "1985-06-12",
      email: "john.smith@email.com",
      address: "123 Main St, Atlanta, GA",
      source_system: "CRM",
    },
    b: {
      member_id: "MBR_2002",
      first_name: "Jon",
      last_name: "Smith",
      dob: "1985-06-12",
      email: "jon.smith@email.com",
      address: "123 Main Street, Atlanta, GA",
      source_system: "ERP",
    },
  },
  SUPPLIER: {
    a: {
      member_id: "SUP_1001",
      first_name: "Acme",
      last_name: "Seafood LLC",
      email: "ap@acmeseafood.com",
      address: "450 Harbor Blvd, Savannah, GA",
      source_system: "SUPPLIER_PORTAL",
    },
    b: {
      member_id: "SUP_2098",
      first_name: "ACME",
      last_name: "Seafoods",
      email: "accounts@acmeseafood.com",
      address: "450 Harbor Boulevard, Savannah, GA",
      source_system: "ERP",
    },
  },
  PRODUCT: {
    a: {
      member_id: "PRD_1001",
      first_name: "Red Snapper",
      last_name: "Fillet 10LB",
      email: "gtin:00012345678905",
      address: "SKU:RS-10LB-FILLET",
      source_system: "PLM",
    },
    b: {
      member_id: "PRD_2044",
      first_name: "Red Snapper",
      last_name: "Fillets 10 lb",
      email: "gtin:00012345678905",
      address: "SKU:RS10LBFIL",
      source_system: "ERP",
    },
  },
  OTHER: {
    a: {
      member_id: "ENT_1001",
      first_name: "Northwind",
      last_name: "Trading",
      email: "info@northwind.com",
      address: "77 Broad St, New York, NY",
      source_system: "CRM",
    },
    b: {
      member_id: "ENT_2012",
      first_name: "North Wind",
      last_name: "Trading Co",
      email: "contact@northwind.com",
      address: "77 Broad Street, New York, NY",
      source_system: "LEGACY",
    },
  },
  BANKING: {
    a: {
      member_id: "ACCT10001",
      account_id: "ACCT10001",
      banking_customer_id: "CUST10001",
      sap_business_partner_id: "SAPBP10001",
      routing_number: "021000021",
      account_number_last4: "4821",
      institution_name: "First National Bank",
      account_type: "CHECKING",
      currency: "USD",
      account_status: "ACTIVE",
      email: "matt@example.com",
      phone_number: "602-810-9031",
      source_system: "CORE_BANKING",
    },
    b: {
      member_id: "ACCT10001",
      account_id: "ACCT10001",
      banking_customer_id: "CUST10001",
      sap_business_partner_id: "SAPBP10001",
      routing_number: "021000021",
      account_number_last4: "4821",
      institution_name: "First National Bank",
      account_type: "CHECKING",
      currency: "USD",
      account_status: "ACTIVE",
      email: "matt@example.com",
      phone_number: "602-810-9031",
      source_system: "SAP",
  },
},
  PATIENT: {
    a: {
      member_id: "PAT_1001",
      first_name: "Sarah",
      last_name: "Johnson",
      dob: "1980-03-11",
      email: "sarah.johnson@email.com",
      address: "22 Peachtree St, Atlanta, GA",
      source_system: "EHR",
    },

    b: {
      member_id: "PAT_1001",
      first_name: "Sara",
      last_name: "Johnson",
      dob: "1980-03-11",
      email: "sjohnson@email.com",
      address: "22 Peachtree Street, Atlanta, GA",
      source_system: "CRM",
    },
  },

  PROVIDER: {
    a: {
      member_id: "NPI_1001",
      first_name: "Michael",
      last_name: "Roberts MD",
      dob: "1975-01-15",
      email: "mroberts@hospital.org",
      address: "100 Medical Plaza, Atlanta, GA",
      source_system: "PROVIDER_MASTER",
    },

    b: {
      member_id: "NPI_1001",
      first_name: "Mike",
      last_name: "Roberts",
      dob: "1975-01-15",
      email: "michael.roberts@hospital.org",
      address: "100 Medical Plaza Suite A, Atlanta, GA",
      source_system: "LEGACY",
    },
  },
    LOCATION: {
    a: {
      member_id: "LOC_1001",
      first_name: "Baptist Medical Center Downtown",
      last_name: "HOSPITAL",
      dob: "BMC-DT",
      email: "ORG_1001",
      address: "800 Prudential Dr, Jacksonville, FL",
      source_system: "EPIC",
    },

    b: {
      member_id: "LOC_2001",
      first_name: "Baptist Medical Center - Downtown",
      last_name: "HOSPITAL",
      dob: "BMC-DT",
      email: "ORG_1001",
      address: "800 Prudential Drive, Jacksonville, FL",
      source_system: "FACILITY_MASTER",
    },
  },

  ORGANIZATION: {
    a: {
      member_id: "ORG_1001",
      first_name: "Baptist Health",
      last_name: "HEALTH_SYSTEM",
      dob: "BHSF",
      email: "PARENT_ORG_001",
      address: "ACTIVE",
      source_system: "ENTERPRISE_MASTER",
    },

    b: {
      member_id: "ORG_2001",
      first_name: "Baptist Health System",
      last_name: "HEALTH_SYSTEM",
      dob: "BHSF",
      email: "PARENT_ORG_001",
      address: "ACTIVE",
      source_system: "ERP",
    },
  },

};

export const DOMAIN_OVERRIDE_REASON_OPTIONS: Record<DomainType, string[]> = {
  CUSTOMER: [
    "FALSE_POSITIVE",
    "FALSE_NEGATIVE",
    "ADDRESS_MISMATCH",
    "DOB_MISMATCH",
    "EMAIL_MISMATCH",
    "NAME_COLLISION",
    "HOUSEHOLD_DIFFERENCE",
    "INSUFFICIENT_EVIDENCE",
    "POLICY_EXCEPTION",
    "OTHER",
  ],
  SUPPLIER: [
    "SUPPLIER_NAME_COLLISION",
    "TAX_ID_MISMATCH",
    "ADDRESS_MISMATCH",
    "CONTACT_MISMATCH",
    "DUPLICATE_SITE_CONFUSION",
    "INSUFFICIENT_EVIDENCE",
    "POLICY_EXCEPTION",
    "OTHER",
  ],
  PRODUCT: [
    "GTIN_MISMATCH",
    "SKU_MISMATCH",
    "BRAND_MISMATCH",
    "DESCRIPTION_CONFLICT",
    "UOM_MISMATCH",
    "PACK_SIZE_MISMATCH",
    "INSUFFICIENT_EVIDENCE",
    "POLICY_EXCEPTION",
    "OTHER",
  ],
  OTHER: [
    "NAME_COLLISION",
    "ADDRESS_MISMATCH",
    "IDENTIFIER_MISMATCH",
    "INSUFFICIENT_EVIDENCE",
    "POLICY_EXCEPTION",
    "OTHER",
  ],
  BANKING: [
  "Incorrect Account Match",
  "Incorrect Customer Identity",
  "Routing Number Conflict",
  "Account Status Conflict",
  "Institution Mismatch",
  "Insufficient Banking Evidence",
  "Other",
],
  PATIENT: [
    "PATIENT_ID_MISMATCH",
    "DOB_MISMATCH",
    "ADDRESS_MISMATCH",
    "POTENTIAL_OVERLAY",
    "POTENTIAL_DUPLICATE_PATIENT",
    "INSUFFICIENT_EVIDENCE",
    "POLICY_EXCEPTION",
    "OTHER",
  ],

  PROVIDER: [
    "NPI_MISMATCH",
    "SPECIALTY_CONFLICT",
    "ADDRESS_MISMATCH",
    "PROVIDER_NAME_COLLISION",
    "LICENSING_CONFLICT",
    "INSUFFICIENT_EVIDENCE",
    "POLICY_EXCEPTION",
    "OTHER",
  ],
    LOCATION: [
    "LOCATION_ID_MISMATCH",
    "SITE_ID_MISMATCH",
    "LOCATION_CODE_MISMATCH",
    "LOCATION_NAME_COLLISION",
    "ADDRESS_MISMATCH",
    "PARENT_LOCATION_MISMATCH",
    "ORGANIZATION_RELATIONSHIP_CONFLICT",
    "INSUFFICIENT_EVIDENCE",
    "POLICY_EXCEPTION",
    "OTHER",
  ],

  ORGANIZATION: [
    "ORGANIZATION_ID_MISMATCH",
    "ORGANIZATION_CODE_MISMATCH",
    "ORGANIZATION_NAME_COLLISION",
    "ORGANIZATION_TYPE_CONFLICT",
    "PARENT_ORGANIZATION_MISMATCH",
    "ORGANIZATION_STATUS_CONFLICT",
    "INSUFFICIENT_EVIDENCE",
    "POLICY_EXCEPTION",
    "OTHER",
  ],

};

export function rulesToText(domain: DomainType): string {
  return DOMAIN_RULE_PRESETS[domain].join(", ");
}

export function getSampleRecords(domain: DomainType) {
  return DOMAIN_SAMPLE_RECORDS[domain];
}

export function getOverrideReasonOptions(domain: DomainType): string[] {
  return DOMAIN_OVERRIDE_REASON_OPTIONS[domain];
}

export function getDomainFieldLabels(domain: DomainType) {
  switch (domain) {
    case "CUSTOMER":
      return {
        first: "first_name",
        last: "last_name",
        dob: "dob (YYYY-MM-DD)",
        email: "email",
        address: "address",
      };

    case "SUPPLIER":
      return {
        first: "supplier_name_line_1",
        last: "supplier_name_line_2",
        dob: "tax_id / registration_date",
        email: "contact_email",
        address: "supplier_address",
      };

    case "PRODUCT":
      return {
        first: "product_name",
        last: "product_variant / pack",
        dob: "effective_date / lot_date",
        email: "gtin / product_identifier",
        address: "sku / description",
      };

    case "PATIENT":
      return {
        first: "patient_first_name",
        last: "patient_last_name",
        dob: "date_of_birth",
        email: "patient_email",
        address: "patient_address",
      };

    case "PROVIDER":
      return {
        first: "provider_first_name",
        last: "provider_last_name",
        dob: "provider_dob",
        email: "provider_email",
        address: "practice_address",
      };

    case "OTHER":
    default:
      return {
        first: "name_line_1",
        last: "name_line_2",
        dob: "date / reference",
        email: "email / identifier",
        address: "address / descriptor",
      };

    case "LOCATION":
      return {
        first: "location_name",
        last: "location_type",
        dob: "location_code / site_id",
        email: "organization_id",
        address: "location_address",
      };

    case "ORGANIZATION":
      return {
        first: "organization_name",
        last: "organization_type",
        dob: "organization_code",
        email: "parent_organization_id",
        address: "organization_status",
      };
  }
}

export function getDomainMemberIdLabel(domain: DomainType): string {
  switch (domain) {
    case "SUPPLIER":
      return "Supplier ID";

    case "PRODUCT":
      return "Product ID";

    case "PATIENT":
      return "Patient ID";

    case "PROVIDER":
      return "Provider ID";

    default:
      return "Member ID";

    case "LOCATION":
      return "Location ID";

    case "ORGANIZATION":
      return "Organization ID";
  }
}