export type DqDomain =
  | "PRODUCT"
  | "CUSTOMER"
  | "SUPPLIER"
  | "PROVIDER"
  | "PATIENT"
  | "BANKING"
  | "LOCATION"
  | "ORGANIZATION";

export type DqDomainField = {
  field: string;
  label: string;
  required: boolean;
  uniquenessKey?: boolean;
  aliases: string[];
};

export type DqDomainConfig = {
  domain: DqDomain;
  businessKeyField: string;
  fields: DqDomainField[];
};

export const DQ_DOMAIN_CONFIG: Record<
  DqDomain,
  DqDomainConfig
> = {
  PRODUCT: {
    domain: "PRODUCT",
    businessKeyField: "product_id",
    fields: [
      {
        field: "product_id",
        label: "Product ID",
        required: false,
        uniquenessKey: true,
        aliases: [
          "product_id",
          "item_id",
          "item_code",
          "product_code",
        ],
      },
      {
        field: "product_name",
        label: "Product Name",
        required: false,
        aliases: [
          "product_name",
          "item_name",
          "item_description",
          "description",
          "product_description",
        ],
      },
      {
        field: "item_category",
        label: "Item Category",
        required: false,
        aliases: [
          "item_category",
          "category",
          "product_category",
          "item_class",
        ],
      },
      {
        field: "product_variant",
        label: "Product Variant",
        required: false,
        aliases: [
          "product_variant",
          "variant",
          "item_variant",
        ],
      },
      {
        field: "sku",
        label: "SKU",
        required: false,
        aliases: ["sku", "item_sku"],
      },
      {
        field: "gtin",
        label: "GTIN / UPC",
        required: false,
        aliases: [
          "gtin",
          "upc",
          "barcode",
        ],
      },
      {
        field: "effective_lot_date",
        label: "Effective Lot Date",
        required: false,
        aliases: [
          "effective_lot_date",
          "lot_date",
          "effective_date",
        ],
      },
      {
        field: "source_system",
        label: "Source System",
        required: false,
        aliases: [
          "source_system",
          "source",
          "system",
        ],
      },
    ],
  },

  CUSTOMER: {
  domain: "CUSTOMER",
  businessKeyField: "member_id",
  fields: [
    {
      field: "member_id",
      label: "Member ID",
      required: false,
      uniquenessKey: true,
      aliases: [
        "member_id",
        "customer_id",
        "cust_id",
        "person_id",
      ],
    },
    {
      field: "full_name",
      label: "Full Name",
      required: true,
      aliases: [
        "full_name",
        "fullname",
        "name",
        "customer_name",
        "member_name",
      ],
    },
    {
      field: "dob",
      label: "Date of Birth",
      required: false,
      aliases: [
        "dob",
        "date_of_birth",
        "birth_date",
      ],
    },
    {
      field: "email",
      label: "Email",
      required: false,
      aliases: [
        "email",
        "email_address",
      ],
    },
    {
      field: "phone_number",
      label: "Phone Number",
      required: false,
      aliases: [
        "phone_number",
        "phone",
        "phone_no",
        "telephone",
        "mobile",
        "mobile_phone",
        "cell",
        "cell_phone",
      ],
    },
    {
      field: "address",
      label: "Address",
      required: false,
      aliases: [
        "address",
        "street_address",
      ],
    },
    {
      field: "source_system",
      label: "Source System",
      required: false,
      aliases: [
        "source_system",
        "source",
      ],
    },
  ],
},

  SUPPLIER: {
    domain: "SUPPLIER",
    businessKeyField: "supplier_id",
    fields: [
      {
        field: "supplier_id",
        label: "Supplier ID",
        required: true,
        uniquenessKey: true,
        aliases: [
          "supplier_id",
          "vendor_id",
          "supplier_code",
          "vendor_code",
        ],
      },
      {
        field: "supplier_name",
        label: "Supplier Name",
        required: true,
        aliases: [
          "supplier_name",
          "vendor_name",
          "company_name",
        ],
      },
      {
        field: "tax_id",
        label: "Tax ID",
        required: false,
        aliases: [
          "tax_id",
          "tin",
          "ein",
        ],
      },
      {
        field: "email",
        label: "Email",
        required: false,
        aliases: [
          "email",
          "contact_email",
        ],
      },
      {
        field: "address",
        label: "Address",
        required: false,
        aliases: [
          "address",
          "supplier_address",
        ],
      },
      {
        field: "source_system",
        label: "Source System",
        required: false,
        aliases: [
          "source_system",
          "source",
        ],
      },
    ],
  },

  PROVIDER: {
    domain: "PROVIDER",
    businessKeyField: "provider_id",
    fields: [
      {
        field: "provider_id",
        label: "Provider ID",
        required: true,
        uniquenessKey: true,
        aliases: [
          "provider_id",
          "practitioner_id",
        ],
      },
      {
        field: "npi",
        label: "NPI",
        required: false,
        aliases: [
          "npi",
          "national_provider_identifier",
        ],
      },
      {
        field: "first_name",
        label: "First Name",
        required: true,
        aliases: [
          "first_name",
          "provider_first_name",
        ],
      },
      {
        field: "last_name",
        label: "Last Name",
        required: true,
        aliases: [
          "last_name",
          "provider_last_name",
        ],
      },
      {
        field: "specialty",
        label: "Specialty",
        required: false,
        aliases: [
          "specialty",
          "provider_specialty",
        ],
      },
      {
        field: "email",
        label: "Email",
        required: false,
        aliases: [
          "email",
          "provider_email",
        ],
      },
      {
        field: "address",
        label: "Practice Address",
        required: false,
        aliases: [
          "address",
          "practice_address",
        ],
      },
      {
        field: "source_system",
        label: "Source System",
        required: false,
        aliases: [
          "source_system",
          "source",
        ],
      },
    ],
  },

  PATIENT: {
    domain: "PATIENT",
    businessKeyField: "patient_id",
    fields: [
      {
        field: "patient_id",
        label: "Patient ID",
        required: true,
        uniquenessKey: true,
        aliases: [
          "patient_id",
          "mrn",
          "medical_record_number",
        ],
      },
      {
        field: "first_name",
        label: "First Name",
        required: true,
        aliases: [
          "first_name",
          "firstname",
        ],
      },
      {
        field: "last_name",
        label: "Last Name",
        required: true,
        aliases: [
          "last_name",
          "lastname",
        ],
      },
      {
        field: "dob",
        label: "Date of Birth",
        required: false,
        aliases: [
          "dob",
          "date_of_birth",
        ],
      },
      {
        field: "email",
        label: "Email",
        required: false,
        aliases: [
          "email",
          "email_address",
        ],
      },
      {
        field: "address",
        label: "Address",
        required: false,
        aliases: [
          "address",
          "home_address",
        ],
      },
      {
        field: "source_system",
        label: "Source System",
        required: false,
        aliases: [
          "source_system",
          "source",
        ],
      },
    ],
  },

  BANKING: {
  domain: "BANKING",
  businessKeyField: "account_id",
  fields: [
    {
      field: "account_id",
      label: "Account ID",
      required: true,
      uniquenessKey: true,
      aliases: [
        "account_id",
        "accountid",
        "bank_account_id",
      ],
    },
    {
      field: "banking_customer_id",
      label: "Banking Customer ID",
      required: false,
      aliases: [
        "banking_customer_id",
        "customer_id",
        "bank_customer_id",
        "client_id",
      ],
    },
    {
      field: "sap_business_partner_id",
      label: "SAP Business Partner ID",
      required: false,
      aliases: [
        "sap_business_partner_id",
        "business_partner_id",
        "sap_bp_id",
        "bp_id",
      ],
    },
    {
      field: "routing_number",
      label: "Routing Number",
      required: false,
      aliases: [
        "routing_number",
        "aba_routing_number",
        "aba_number",
        "routing_no",
      ],
    },
    {
      field: "account_number_last4",
      label: "Account Number Last 4",
      required: false,
      aliases: [
        "account_number_last4",
        "account_last4",
        "last4",
        "account_last_4",
      ],
    },
    {
      field: "institution_name",
      label: "Institution Name",
      required: false,
      aliases: [
        "institution_name",
        "bank_name",
        "financial_institution",
        "institution",
      ],
    },
    {
      field: "account_type",
      label: "Account Type",
      required: false,
      aliases: [
        "account_type",
        "bank_account_type",
        "type",
      ],
    },
    {
      field: "currency",
      label: "Currency",
      required: false,
      aliases: [
        "currency",
        "currency_code",
        "iso_currency",
      ],
    },
    {
      field: "account_status",
      label: "Account Status",
      required: false,
      aliases: [
        "account_status",
        "status",
        "bank_account_status",
      ],
    },
    {
      field: "email",
      label: "Email",
      required: false,
      aliases: [
        "email",
        "email_address",
        "customer_email",
      ],
    },
    {
      field: "phone_number",
      label: "Phone Number",
      required: false,
      aliases: [
        "phone_number",
        "phone",
        "telephone",
        "mobile_phone",
      ],
    },
    {
      field: "source_system",
      label: "Source System",
      required: false,
      aliases: [
        "source_system",
        "source",
        "system",
      ],
    },
  ],
}, 

  LOCATION: {
    domain: "LOCATION",
    businessKeyField: "location_id",
    fields: [
      {
        field: "location_id",
        label: "Location ID",
        required: false,
        uniquenessKey: true,
        aliases: [
          "location_id",
          "locationid",
          "location_key",
        ],
      },
      {
        field: "site_id",
        label: "Site ID",
        required: false,
        aliases: [
          "site_id",
          "siteid",
          "site_code",
        ],
      },
      {
        field: "location_code",
        label: "Location Code",
        required: false,
        aliases: [
          "location_code",
          "location_cd",
          "facility_code",
        ],
      },
      {
        field: "location_name",
        label: "Location Name",
        required: false,
        aliases: [
          "location_name",
          "site_name",
          "facility_name",
          "location",
        ],
      },
      {
        field: "location_type",
        label: "Location Type",
        required: false,
        aliases: [
          "location_type",
          "site_type",
          "facility_type",
        ],
      },
      {
        field: "location_address",
        label: "Location Address",
        required: false,
        aliases: [
          "location_address",
          "site_address",
          "facility_address",
          "address",
          "street_address",
        ],
      },
      {
        field: "parent_location_id",
        label: "Parent Location ID",
        required: false,
        aliases: [
          "parent_location_id",
          "parent_site_id",
          "parent_facility_id",
        ],
      },
      {
        field: "organization_entity_id",
        label: "Organization Entity ID",
        required: false,
        aliases: [
          "organization_entity_id",
          "org_entity_id",
          "organization_code",
        ],
      },
      {
        field: "location_status",
        label: "Location Status",
        required: false,
        aliases: [
          "location_status",
          "site_status",
          "facility_status",
          "status",
        ],
      },
      {
        field: "source_system",
        label: "Source System",
        required: false,
        aliases: [
          "source_system",
          "source",
          "system",
        ],
      },
    ],
  },

  ORGANIZATION: {
    domain: "ORGANIZATION",
    businessKeyField: "organization_entity_id",
    fields: [
      {
        field: "organization_entity_id",
        label: "Organization Entity ID",
        required: false,
        uniquenessKey: true,
        aliases: [
          "organization_entity_id",
          "org_entity_id",
          "organization_id",
        ],
      },
      {
        field: "organization_code",
        label: "Organization Code",
        required: false,
        aliases: [
          "organization_code",
          "org_code",
          "organization_cd",
        ],
      },
      {
        field: "organization_name",
        label: "Organization Name",
        required: false,
        aliases: [
          "organization_name",
          "org_name",
          "company_name",
          "business_name",
        ],
      },
      {
        field: "organization_type",
        label: "Organization Type",
        required: false,
        aliases: [
          "organization_type",
          "org_type",
          "organization_class",
        ],
      },
      {
        field: "parent_organization_id",
        label: "Parent Organization ID",
        required: false,
        aliases: [
          "parent_organization_id",
          "parent_org_id",
          "parent_organization",
        ],
      },
      {
        field: "organization_status",
        label: "Organization Status",
        required: false,
        aliases: [
          "organization_status",
          "org_status",
          "status",
        ],
      },
      {
        field: "source_system",
        label: "Source System",
        required: false,
        aliases: [
          "source_system",
          "source",
          "system",
        ],
      },
    ],
  }}
