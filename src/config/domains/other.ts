export const otherDomainConfig = {
  domain: "OTHER" as const,
  memberIdLabel: "Entity ID",
  rulePresets: [
    "NAME_SIMILAR",
    "ADDRESS_MATCH",
    "EMAIL_MATCH",
    "ENTITY_ID_EXACT",
  ],
  overrideReasons: [
    "NAME_COLLISION",
    "ADDRESS_MISMATCH",
    "IDENTIFIER_MISMATCH",
    "INSUFFICIENT_EVIDENCE",
    "POLICY_EXCEPTION",
    "OTHER",
  ],
  fieldLabels: {
    first: "name_line_1",
    last: "name_line_2",
    dob: "date / reference",
    email: "email / identifier",
    address: "address / descriptor",
  },
  signalLabels: {
    ENTITY_ID_MATCH: "Entity ID Match",
    NAME_SIMILARITY: "Name Similarity",
    EMAIL_MATCH: "Email Match",
    ADDRESS_MATCH: "Address Match",
  },
} as const;
