// src/components/record/RecordCompare.tsx
import React, { useMemo } from "react";
import type { DomainType, MemberRecord } from "../../api/types";


type FieldKey = keyof MemberRecord;

type CompareRecord = Partial<Record<FieldKey, string | null | undefined>>;

type Props = {
  recordA: CompareRecord;
  recordB: CompareRecord;
  titleA?: string;
  titleB?: string;
  fields?: FieldKey[];
  labels?: Partial<Record<FieldKey, string>>;
  domain: DomainType;
  authoritativeBands?: Partial<Record<FieldKey, MatchStatus>>;
};

type MatchStatus = "EXACT" | "SIMILAR" | "FUZZY" | "DIFFERENT" | "EMPTY";

const DOMAIN_FIELDS: Record<string, FieldKey[]> = {
  CUSTOMER: [
  "member_id",
  "full_name",
  "dob",
  "email",
  "phone_number",
  "address",
  "source_system",
],

PATIENT: [
  "patient_id",
  "patient_first_name",
  "patient_last_name",
  "patient_dob",
  "patient_email",
  "phone_number",
  "patient_address",
  "source_system",
],

  PROVIDER: [
  "provider_id",
  "npi",
  "phone_number",
  "specialty",
  "provider_first_name",
  "provider_last_name",
  "provider_email",
  "provider_address",
  "source_system",
],

  SUPPLIER: [
    "supplier_id",
    "tax_id",
    "supplier_name",
    "contact_email",
    "supplier_address",
    "source_system",
  ],  

    BANKING: [
    "account_id",
    "banking_customer_id",
    "sap_business_partner_id",
    "routing_number",
    "account_number_last4",
    "institution_name",
    "account_type",
    "currency",
    "account_status",
    "email",
    "phone_number",
    "source_system",
  ],

  PRODUCT: [
    "product_id",
    "product_name",
    "product_variant",
    "item_category",
    "gtin",
    "sku",
    "source_system",
  ],

  ORGANIZATION: [
  "organization_entity_id",
  "organization_code",
  "organization_name",
  "organization_type",
  "parent_organization_id",
  "organization_status",
  "source_system",
],
LOCATION: [
  "location_id",
  "site_id",
  "location_code",
  "location_name",
  "location_type",
  "location_address",
  "parent_location_id",
  "source_system",
],

};

const COMMON_NICKNAMES: Record<string, string[]> = {
  john: ["jon", "johnny", "jack"],
  jon: ["john", "johnny"],
  michael: ["mike", "mikey", "mick"],
  mike: ["michael"],
  matthew: ["matt", "mat"],
  matt: ["matthew"],
  william: ["bill", "billy", "will", "willy", "liam"],
  bill: ["william"],
  robert: ["rob", "bob", "bobby"],
  bob: ["robert"],
  james: ["jim", "jimmy"],
  jim: ["james"],
  joseph: ["joe", "joey"],
  joe: ["joseph"],
  thomas: ["tom", "tommy"],
  tom: ["thomas"],
  daniel: ["dan", "danny"],
  dan: ["daniel"],
  steven: ["steve", "stephen"],
  steve: ["steven", "stephen"],
  stephen: ["steven", "steve"],
};

function normalize(v: unknown): string {
  if (v === null || v === undefined) return "";
  return String(v).trim();
}


function prettyLabel(k: string): string {
  return k.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

function normalizeBasic(value: string): string {
  return value.trim().replace(/\s+/g, " ").toLowerCase();
}

function normalizeForAddress(value: string): string {
  return normalizeBasic(value)
    .replace(/[.,#]/g, "")
    .replace(/\bstreet\b/g, "st")
    .replace(/\bst\b/g, "st")
    .replace(/\broad\b/g, "rd")
    .replace(/\brd\b/g, "rd")
    .replace(/\bavenue\b/g, "ave")
    .replace(/\bave\b/g, "ave")
    .replace(/\bboulevard\b/g, "blvd")
    .replace(/\bblvd\b/g, "blvd")
    .replace(/\bdrive\b/g, "dr")
    .replace(/\bdr\b/g, "dr")
    .replace(/\blane\b/g, "ln")
    .replace(/\bln\b/g, "ln")
    .replace(/\bcourt\b/g, "ct")
    .replace(/\bct\b/g, "ct")
    .replace(/\bplace\b/g, "pl")
    .replace(/\bpl\b/g, "pl")
    .replace(/\bterrace\b/g, "ter")
    .replace(/\bter\b/g, "ter")
    .replace(/\bparkway\b/g, "pkwy")
    .replace(/\bpkwy\b/g, "pkwy")
    .replace(/\bhighway\b/g, "hwy")
    .replace(/\bhwy\b/g, "hwy")
    .replace(/\bapartment\b/g, "apt")
    .replace(/\bapt\b/g, "apt")
    .replace(/\bsuite\b/g, "ste")
    .replace(/\bste\b/g, "ste")
    .replace(/\s+/g, " ")
    .trim();
}

function normalizeForEmail(value: string): string {
  return normalizeBasic(value);
}

function normalizeForPhone(value: string): string {
  let digits = value.replace(/\D/g, "");

  if (digits.length === 11 && digits.startsWith("1")) {
    digits = digits.slice(1);
  }

  return digits;
}
function formatPhoneForDisplay(value?: string | null): string {
  const digits = normalizeForPhone(value ?? "");

  if (!digits) {
    return value ?? "";
  }

  if (digits.length === 10) {
    return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
  }

  return value ?? "";
}

function normalizeForSourceSystem(value: string): string {
  return normalizeBasic(value).replace(/[\s_-]+/g, "");
}

function normalizeValue(value?: string | null): string {
  return (value ?? "").trim().toLowerCase();
}

function isNicknameMatch(a?: string | null, b?: string | null): boolean {
  const aa = normalizeValue(a);
  const bb = normalizeValue(b);

  if (!aa || !bb) return false;

  return (
    (COMMON_NICKNAMES[aa] ?? []).includes(bb) ||
    (COMMON_NICKNAMES[bb] ?? []).includes(aa)
  );
}

function sequenceSimilarity(a?: string | null, b?: string | null): number {
  const aa = normalizeValue(a);
  const bb = normalizeValue(b);

  if (!aa || !bb) return 0;
  if (aa === bb) return 1;

  const longer = aa.length >= bb.length ? aa : bb;
  const shorter = aa.length >= bb.length ? bb : aa;

  let best = 0;

  for (let i = 0; i <= longer.length - shorter.length; i++) {
    let matches = 0;
    for (let j = 0; j < shorter.length; j++) {
      if (longer[i + j] === shorter[j]) matches++;
    }
    best = Math.max(best, matches / longer.length);
  }

  return best;
}

function tokenSimilarity(a?: string | null, b?: string | null): number {
  const aa = normalizeValue(a);
  const bb = normalizeValue(b);

  if (!aa || !bb) return 0;
  if (aa === bb) return 1;

  const aTokens = new Set(aa.split(/\s+/).filter(Boolean));
  const bTokens = new Set(bb.split(/\s+/).filter(Boolean));
  const overlap = [...aTokens].filter((x) => bTokens.has(x)).length;

  return overlap / Math.max(aTokens.size, bTokens.size, 1);
}



function stringSimilarity(a?: string | null, b?: string | null): number {
  const aa = normalizeValue(a);
  const bb = normalizeValue(b);

  if (!aa || !bb) return 0;
  if (aa === bb) return 1;

  if (isNicknameMatch(aa, bb)) {
    return 0.92;
  }

  const tokenScore = tokenSimilarity(aa, bb);
  const seqScore = sequenceSimilarity(aa, bb);

  const maxLen = Math.max(aa.length, bb.length);
  const minLen = Math.min(aa.length, bb.length);
  const lengthPenalty = minLen / Math.max(maxLen, 1);

  return Math.max(seqScore, tokenScore, lengthPenalty * seqScore);
}
function fullNameSimilarity(
  a?: string | null,
  b?: string | null,
): number {
  const left = normalizeValue(a);
  const right = normalizeValue(b);

  if (!left || !right) return 0;
  if (left === right) return 1;

  const leftTokens = left.split(/\s+/).filter(Boolean);
  const rightTokens = right.split(/\s+/).filter(Boolean);

  if (leftTokens.length !== rightTokens.length) {
    return stringSimilarity(left, right);
  }

  const tokenScores = leftTokens.map((leftToken, index) => {
    const rightToken = rightTokens[index];

    if (leftToken === rightToken) {
      return 1;
    }

    if (isNicknameMatch(leftToken, rightToken)) {
      return 0.95;
    }

    return stringSimilarity(leftToken, rightToken);
  });

  return (
    tokenScores.reduce((sum, score) => sum + score, 0) /
    tokenScores.length
  );
}
function normalizeProductText(value?: string | null): string {
  return String(value || "")
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\bfillet\b/g, "")
    .replace(/\bfillets\b/g, "")
    .replace(/\bportion\b/g, "")
    .replace(/\bportions\b/g, "")
    .replace(/\bcase\b/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function rootBeforeLastDash(value?: string | null): string {
  const normalized = normalizeValue(value);

  if (!normalized.includes("-")) {
    return normalized;
  }

  const parts = normalized.split("-");

  if (parts.length <= 1) {
    return normalized;
  }

  return parts.slice(0, -1).join("-");
}

function getProductTextBand(
  a?: string | null,
  b?: string | null
): "EXACT" | "SIMILAR" | "FUZZY" | "DIFFERENT" {
  const left = normalizeProductText(a);
  const right = normalizeProductText(b);

  if (!left || !right) return "DIFFERENT";

  if (left === right) {
    return normalizeValue(a) === normalizeValue(b) ? "EXACT" : "SIMILAR";
  }

  if (left.includes(right) || right.includes(left)) {
    return "SIMILAR";
  }

  const score = stringSimilarity(left, right);

  if (score >= 0.70) {
    return "SIMILAR";
  }

  if (score >= 0.55) {
    return "FUZZY";
  }

  return "DIFFERENT";
}

function getFieldStatus(field: FieldKey,
  a?: string | null,
  b?: string | null,
  domain?: DomainType
):MatchStatus {
  const aa = normalizeValue(a);
  const bb = normalizeValue(b);

  if (!aa && !bb) return "EMPTY";
  if (aa === bb) return "EXACT";

    // ORGANIZATION domain:
  // authoritative identifiers and controlled attributes must not use
  // generic fuzzy/string-similarity classification.
  if (domain === "ORGANIZATION") {
  const exactOnlyFields: FieldKey[] = [
    "organization_entity_id",
    "organization_code",
    "organization_type",
    "parent_organization_id",
    "organization_status",
  ];

  if (exactOnlyFields.includes(field)) {
    return "DIFFERENT";
  }

  if (field === "organization_name") {
    const similarity = stringSimilarity(aa, bb);

    if (similarity >= 0.70) {
      return "SIMILAR";
    }

    if (similarity >= 0.50) {
      return "FUZZY";
    }

    return "DIFFERENT";
  }

  if (field === "source_system") {
    return "DIFFERENT";
  }
}
  // LOCATION source-system values represent distinct originating systems.
  // Source trust is evaluated separately by the entity-resolution engine.
  if (
    domain === "LOCATION" &&
    field === "source_system"
  ) {
    return "DIFFERENT";
  }

  // ---------------------------------------------------------
  // BANKING deterministic / controlled comparison rules
  // ---------------------------------------------------------

  if (domain === "BANKING") {
    // Strong banking identifiers should never be fuzzy.
    // They either match exactly or they do not.
    if (
      field === "account_id" ||
      field === "banking_customer_id" ||
      field === "sap_business_partner_id" ||
      field === "routing_number" ||
      field === "account_number_last4"
    ) {
      return "DIFFERENT";
    }

    // Controlled banking attributes.
    // normalizeValue() already handles case + whitespace.
    if (
      field === "account_type" ||
      field === "currency" ||
      field === "account_status"
    ) {
      return "DIFFERENT";
    }

    // Institution names may legitimately vary slightly:
    // "Bank of America" vs "Bank of America NA"
    if (field === "institution_name") {
      const score = stringSimilarity(a, b);

      if (score >= 0.90) {
        return "SIMILAR";
      }

      if (score >= 0.75) {
        return "FUZZY";
      }

      return "DIFFERENT";
    }
  }

  if (
  domain === "CUSTOMER" &&
  field === "full_name"
) {
  const score = fullNameSimilarity(a, b);

  if (score >= 0.85) {
    return "SIMILAR";
  }

  if (score >= 0.70) {
    return "FUZZY";
  }

  return "DIFFERENT";
}

  if (field === "npi") {
    if (!aa && !bb) return "EMPTY";
    if (aa === bb) return "EXACT";
    return "DIFFERENT";
}

  if (field === "phone_number") {
  const phoneA = normalizeForPhone(a ?? "");
  const phoneB = normalizeForPhone(b ?? "");

  if (!phoneA && !phoneB) return "EMPTY";

  if (!phoneA || !phoneB) {
    return "EMPTY";
  }

  return phoneA === phoneB ? "EXACT" : "DIFFERENT";
}

if (domain === "PRODUCT") {
  if (field === "product_name" || field === "product_variant") {
    return getProductTextBand(a, b);
  }

  if (field === "product_id" || field === "gtin" || field === "sku") {
    const score = stringSimilarity(a, b);

    if (score >= 0.98) return "EXACT";
    if (score >= 0.75) return "SIMILAR";
    if (score >= 0.55) return "FUZZY";

    return "DIFFERENT";
  }

  if (field === "item_category") {
  if (!aa && !bb) return "EMPTY";
  if (aa === bb) return "EXACT";

  const score = stringSimilarity(a, b);

  if (score >= 0.90) return "SIMILAR";
  if (score >= 0.70) return "FUZZY";

  return "DIFFERENT";
}

 
  if (field === "source_system") {
  if (!aa && !bb) return "EMPTY";

  if (
    normalizeForSourceSystem(a ?? "") ===
    normalizeForSourceSystem(b ?? "")
  ) {
    return "EXACT";
  }

  if (domain === "PRODUCT") {
    return "FUZZY";
  }

  return "DIFFERENT";
}
}

if (domain === "PATIENT") {
  if (field === "patient_id") {
  if (aa === bb) return "EXACT";

  const baseA = aa.split("-")[0];
  const baseB = bb.split("-")[0];

  if (baseA && baseA === baseB) {
    return "SIMILAR";
  }

  const score = stringSimilarity(a, b);

  if (score >= 0.90) return "SIMILAR";
  if (score >= 0.75) return "FUZZY";

  return "DIFFERENT";
}

  if (field === "patient_first_name" || field === "patient_last_name") {
    if (isNicknameMatch(a, b)) return "SIMILAR";

    const score = stringSimilarity(a, b);
    if (score >= 0.90) return "SIMILAR";
    if (score >= 0.70) return "FUZZY";

    return "DIFFERENT";
  }

  if (field === "patient_dob") {
    return aa === bb ? "EXACT" : "DIFFERENT";
  }

  if (field === "patient_email") {
    const emailA = normalizeForEmail(a ?? "");
    const emailB = normalizeForEmail(b ?? "");

    if (emailA === emailB) return "EXACT";

    const domainA = emailA.split("@")[1] ?? "";
    const domainB = emailB.split("@")[1] ?? "";

    if (domainA && domainA === domainB) return "FUZZY";
    if (stringSimilarity(emailA, emailB) >= 0.75) return "SIMILAR";

    return "DIFFERENT";
  }

  if (field === "patient_address") {
    if (normalizeForAddress(a ?? "") === normalizeForAddress(b ?? "")) {
      return "EXACT";
    }

    if (stringSimilarity(a, b) >= 0.75) return "FUZZY";

    return "DIFFERENT";
  }

  if (field === "source_system") {
    return normalizeForSourceSystem(a ?? "") ===
      normalizeForSourceSystem(b ?? "")
      ? "EXACT"
      : "FUZZY";
  }
}

if (domain === "SUPPLIER") {
  if (field === "supplier_id") {
    if (aa === bb) return "EXACT";

    const score = stringSimilarity(a, b);

    if (score >= 0.90) return "SIMILAR";
    if (score >= 0.75) return "FUZZY";

    return "DIFFERENT";
  }

  if (field === "supplier_name") {
    const score = stringSimilarity(a, b);

    if (score >= 0.95) return "EXACT";
    if (score >= 0.80) return "SIMILAR";
    if (score >= 0.60) return "FUZZY";

    return "DIFFERENT";
  }

  if (field === "tax_id") {
    return aa === bb ? "EXACT" : "DIFFERENT";
  }

  if (field === "contact_email") {
    const emailA = normalizeForEmail(a ?? "");
    const emailB = normalizeForEmail(b ?? "");

    if (!emailA && !emailB) return "EMPTY";
    if (emailA === emailB) return "EXACT";

    const domainA = emailA.split("@")[1] ?? "";
    const domainB = emailB.split("@")[1] ?? "";

    if (domainA && domainA === domainB) {
      return "FUZZY";
    }

    if (stringSimilarity(emailA, emailB) >= 0.75) {
      return "SIMILAR";
    }

    return "DIFFERENT";
  }

  if (field === "supplier_address") {
    if (normalizeForAddress(a ?? "") === normalizeForAddress(b ?? "")) {
      return "EXACT";
    }

    if (stringSimilarity(a, b) >= 0.75) {
      return "FUZZY";
    }

    return "DIFFERENT";
  }

  if (field === "source_system") {
    if (!aa && !bb) return "EMPTY";

    if (
      normalizeForSourceSystem(a ?? "") ===
      normalizeForSourceSystem(b ?? "")
    ) {
      return "EXACT";
    }

    return "FUZZY";
  }
}

  if (domain === "PROVIDER") {
      if (field === "provider_id") {
      if (aa === bb) return "EXACT";

      const rootA = rootBeforeLastDash(a);
      const rootB = rootBeforeLastDash(b);

      if (rootA && rootA === rootB) {
        return "SIMILAR";
      }

      const score = stringSimilarity(a, b);

      if (score >= 0.85) return "SIMILAR";
      if (score >= 0.70) return "FUZZY";

      return "DIFFERENT";
    }

  if (field === "npi") {
    return aa === bb ? "EXACT" : "DIFFERENT";
  }

   if (field === "human_id") {
    return aa === bb ? "EXACT" : "DIFFERENT";
  }
  if (field === "specialty") {
    const score = stringSimilarity(a, b);
    if (score >= 0.95) return "EXACT";
    if (score >= 0.75) return "SIMILAR";
    if (score >= 0.55) return "FUZZY";
    return "DIFFERENT";
  }

  if (field === "provider_first_name" || field === "provider_last_name") {
    if (isNicknameMatch(a, b)) return "SIMILAR";

    const score = stringSimilarity(a, b);
    if (score >= 0.90) return "SIMILAR";
    if (score >= 0.70) return "FUZZY";
    return "DIFFERENT";
  }

 if (field === "provider_email") {
  const emailA = normalizeForEmail(a ?? "");
  const emailB = normalizeForEmail(b ?? "");

  if (emailA === emailB) {
    return "EXACT";
  }

  const domainA = emailA.split("@")[1] ?? "";
  const domainB = emailB.split("@")[1] ?? "";

  if (domainA && domainA === domainB) {
    return "FUZZY";
  }

  if (stringSimilarity(emailA, emailB) >= 0.82) {
    return "SIMILAR";
  }

  return "DIFFERENT";
}

    if (stringSimilarity(a, b) >= 0.82) {
      return "SIMILAR";
    }

    return "DIFFERENT";
  }

  if (field === "provider_address") {
    if (normalizeForAddress(a ?? "") === normalizeForAddress(b ?? "")) {
      return "FUZZY";
    }

    if (stringSimilarity(a, b) >= 0.75) {
      return "FUZZY";
    }

    return "DIFFERENT";
  }

  if (field === "source_system") {
    if (!aa && !bb) return "EMPTY";

    if (
      normalizeForSourceSystem(a ?? "") ===
      normalizeForSourceSystem(b ?? "")
    ) {
      return "EXACT";
    }

    return "FUZZY";
  }

if (field === "address") {
  if (normalizeForAddress(a ?? "") === normalizeForAddress(b ?? "")) {
    return "FUZZY";
  }

  if (stringSimilarity(a, b) >= 0.75) {
    return "FUZZY";
  }

  return "DIFFERENT";
}

if (field === "email") {
  if (normalizeForEmail(a ?? "") === normalizeForEmail(b ?? "")) {
    return "EXACT";
  }

  if (stringSimilarity(a, b) >= 0.82) {
    return "SIMILAR";
  }

  return "DIFFERENT";
}

if (field === "source_system") {
  if (domain === "PRODUCT") {
    return "FUZZY";
  }

  if (
    normalizeForSourceSystem(a ?? "") ===
    normalizeForSourceSystem(b ?? "")
  ) {
    return "FUZZY";
  }

  return "DIFFERENT";
}

if (field === "first_name" || field === "last_name") {
  if (isNicknameMatch(a, b)) {
    return "SIMILAR";
  }

  const score = stringSimilarity(a, b);

  if (score >= 0.90) {
    return "SIMILAR";
  }

  return "DIFFERENT";
}

const score = stringSimilarity(a, b);

if (score >= 0.82) {
  return "SIMILAR";
}

return "DIFFERENT";
}
function statusTone(status: MatchStatus): {
  labelBg: string;
  labelBorder: string;
  cellBg: string;
} {
  switch (status) {
    case "EXACT":
      return {
        labelBg: "#eefaf0",
        labelBorder: "#b7e2c0",
        cellBg: "#ffffff",
      };
    case "SIMILAR":
      return {
        labelBg: "#eff6ff",
        labelBorder: "#bfdbfe",
        cellBg: "#f8fbff",
      };
    case "FUZZY":
      return {
        labelBg: "#fff8e8",
        labelBorder: "#f1d38a",
        cellBg: "#fffaf0",
      };
    case "DIFFERENT":
      return {
        labelBg: "#fdeeee",
        labelBorder: "#efb5b5",
        cellBg: "#fff4f4",
      };
    case "EMPTY":
    default:
      return {
        labelBg: "#f5f5f5",
        labelBorder: "#dddddd",
        cellBg: "#ffffff",
      };
  }
}

export default function RecordCompare({
  recordA,
  recordB,
  titleA = "Record A",
  titleB = "Record B",
  fields,
  labels,
  domain,
  authoritativeBands,
}: Props) {

const compareFields =
  fields ?? DOMAIN_FIELDS[domain] ?? DOMAIN_FIELDS.CUSTOMER;

  const rows = useMemo(() => {
    return compareFields.map((key) => {
      const rawA = normalize(recordA[key]);

const rawB = normalize(recordB[key]);

const authoritativeStatus = authoritativeBands?.[key];

const status =
  authoritativeStatus ??
  getFieldStatus(
    key,
    rawA,
    rawB,
    domain,
  );

const a =
  key === "phone_number"
    ? formatPhoneForDisplay(rawA)
    : rawA;

const b =
  key === "phone_number"
    ? formatPhoneForDisplay(rawB)
    : rawB;

      return {
        key,
        a,
        b,
        status,
      };
    });
  }, [recordA, recordB, domain, compareFields, authoritativeBands]);

  const differentCount = rows.filter((r) => r.status === "DIFFERENT").length;
  const fuzzyCount = rows.filter((r) => r.status === "FUZZY").length;
  const similarCount = rows.filter((r) => r.status === "SIMILAR").length;

  return (
    <div style={{ border: "1px solid #ddd", borderRadius: 12, padding: 12 }}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          gap: 10,
          flexWrap: "wrap",
        }}
      >
        <div style={{ fontWeight: 700 }}>Record Compare</div>
        <div style={{ fontSize: 12, opacity: 0.75 }}>
          {differentCount} difference{differentCount === 1 ? "" : "s"}
          {similarCount > 0
            ? ` • ${similarCount} similar field${similarCount === 1 ? "" : "s"}`
            : ""}
          {fuzzyCount > 0
            ? ` • ${fuzzyCount} fuzzy match${fuzzyCount === 1 ? "" : "es"}`
            : ""}
        </div>
      </div>

      <div
        style={{
          marginTop: 10,
          display: "grid",
          gridTemplateColumns: "220px 120px 1fr 1fr",
          gap: 8,
          alignItems: "stretch",
        }}
      >
        <HeaderCell />
        <HeaderCell label="Status" />
        <HeaderCell label={titleA} />
        <HeaderCell label={titleB} />

        {rows.map((r) => (
          <React.Fragment key={String(r.key)}>
            <KeyCell label={labels?.[r.key] ?? prettyLabel(String(r.key))} />
            <StatusCell status={r.status} />
            <ValueCell value={r.a} status={r.status} />
            <ValueCell value={r.b} status={r.status} />
          </React.Fragment>
        ))}
      </div>

      <div style={{ marginTop: 10, fontSize: 12, opacity: 0.72 }}>
        EXACT means normalized values match. SIMILAR means values are close,
        such as John vs Jon. FUZZY means values differ visually but normalize to
        the same business meaning, such as Blvd vs Boulevard.
      </div>
    </div>
  );
}

function HeaderCell({ label }: { label?: string }) {
  return (
    <div
      style={{
        fontSize: 12,
        fontWeight: 700,
        padding: "8px 10px",
        border: "1px solid #eee",
        borderRadius: 10,
        background: "#fafafa",
      }}
    >
      {label ?? ""}
    </div>
  );
}

function KeyCell({ label }: { label: string }) {
  return (
    <div
      style={{
        fontSize: 12,
        padding: "10px 10px",
        border: "1px solid #eee",
        borderRadius: 10,
        background: "#fff",
        opacity: 0.85,
        fontWeight: 600,
      }}
    >
      {label}
    </div>
  );
}

function StatusCell({ status }: { status: MatchStatus }) {
  const tone = statusTone(status);

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        padding: "8px 10px",
        border: "1px solid #eee",
        borderRadius: 10,
        background: "#fff",
      }}
    >
      <span
        style={{
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          minWidth: 74,
          padding: "4px 8px",
          borderRadius: 999,
          fontSize: 11,
          fontWeight: 700,
          letterSpacing: 0.2,
          background: tone.labelBg,
          border: `1px solid ${tone.labelBorder}`,
        }}
      >
        {status}
      </span>
    </div>
  );
}

function ValueCell({ value, status }: { value: string; status: MatchStatus }) {
  const tone = statusTone(status);

  return (
    <div
      style={{
        padding: "10px 10px",
        border: "1px solid #eee",
        borderRadius: 10,
        background: tone.cellBg,
        whiteSpace: "pre-wrap",
        overflowWrap: "anywhere",
        fontSize: 13,
      }}
      title={value}
    >
      {value || <span style={{ opacity: 0.5 }}>(empty)</span>}
    </div>
  );
}