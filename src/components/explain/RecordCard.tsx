import type { CSSProperties, ReactNode } from "react";
import { Field } from "./ExplainPrimitives";

const inputStyle: CSSProperties = {
  width: "100%",
  padding: "10px 10px",
  borderRadius: 10,
  border: "1px solid #ccc",
  outline: "none",
  boxSizing: "border-box",
};

type RecordCardProps = {
  title: string;
  entityId: string;
  setEntityId: (v: string) => void;
  first: string;
  setFirst: (v: string) => void;
  last: string;
  setLast: (v: string) => void;
  dob: string;
  setDob: (v: string) => void;
  email: string;
  setEmail: (v: string) => void;
  address: string;
  setAddress: (v: string) => void;
  sourceSystem: string;
  setSourceSystem: (v: string) => void;
  entityIdLabel?: string;
  labels?: Record<string, string | undefined>;
  npi?: string;
  setNpi?: (v: string) => void;
  phoneNumber?: string;
  setPhoneNumber?: (value: string) => void;
  bankingAccountNumberLast4?: string;
  setBankingAccountNumberLast4?: (v: string) => void;
  bankingAccountType?: string;
  setBankingAccountType?: (v: string) => void;
  bankingCurrency?: string;
  setBankingCurrency?: (v: string) => void;
  bankingAccountStatus?: string;
  setBankingAccountStatus?: (v: string) => void;
  humanId?: string;
  setHumanId?: (v: string) => void;

  // LOCATION domain fields
  locationId?: string;
  setLocationId?: (v: string) => void;
  siteId?: string;
  setSiteId?: (v: string) => void;
  locationCode?: string;
  setLocationCode?: (v: string) => void;
  locationName?: string;
  setLocationName?: (v: string) => void;
  locationType?: string;
  setLocationType?: (v: string) => void;
  locationAddress?: string;
  setLocationAddress?: (v: string) => void;
  parentLocationId?: string;
  setParentLocationId?: (v: string) => void;

  searchBox?: ReactNode;
};

export function RecordCard(props: RecordCardProps) {
  const locationMode =
    props.locationId !== undefined &&
    props.setLocationId !== undefined;

  return (
    <div style={{ border: "1px solid #ddd", borderRadius: 12, padding: 12 }}>
      <h3 style={{ marginTop: 0 }}>{props.title}</h3>

      {props.searchBox}

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: 12,
        }}
      >
        {locationMode ? (
          <>
            <Field label="Location ID">
              <input
                value={props.locationId ?? ""}
                onChange={(e) => props.setLocationId?.(e.target.value)}
                style={inputStyle}
                required
              />
            </Field>

            <Field label="Site ID">
              <input
                value={props.siteId ?? ""}
                onChange={(e) => props.setSiteId?.(e.target.value)}
                style={inputStyle}
              />
            </Field>

            <Field label="Location Code">
              <input
                value={props.locationCode ?? ""}
                onChange={(e) => props.setLocationCode?.(e.target.value)}
                style={inputStyle}
              />
            </Field>

            <Field label="Location Name">
              <input
                value={props.locationName ?? ""}
                onChange={(e) => props.setLocationName?.(e.target.value)}
                style={inputStyle}
              />
            </Field>

            <Field label="Location Type">
              <input
                value={props.locationType ?? ""}
                onChange={(e) => props.setLocationType?.(e.target.value)}
                style={inputStyle}
              />
            </Field>

            <Field label="Location Address">
              <input
                value={props.locationAddress ?? ""}
                onChange={(e) => props.setLocationAddress?.(e.target.value)}
                style={inputStyle}
              />
            </Field>

            <Field label="Parent Location ID">
              <input
                value={props.parentLocationId ?? ""}
                onChange={(e) => props.setParentLocationId?.(e.target.value)}
                style={inputStyle}
              />
            </Field>

            <Field label={props.labels?.sourceSystem ?? "source_system"}>
              <input
                value={props.sourceSystem}
                onChange={(e) => props.setSourceSystem(e.target.value)}
                style={inputStyle}
                placeholder="CRM, ERP, MDM, PLM, LEGACY..."
              />
            </Field>
          </>
        ) : (
          <>
            <Field label={props.entityIdLabel ?? "Entity ID"}>
              <input
                value={props.entityId}
                onChange={(e) => props.setEntityId(e.target.value)}
                style={inputStyle}
                required
              />
            </Field>

            {props.npi !== undefined && props.setNpi && (
              <Field label="NPI">
                <input
                  value={props.npi}
                  onChange={(e) => props.setNpi?.(e.target.value)}
                  style={inputStyle}
                />
              </Field>
            )}

            <Field label={props.labels?.dob ?? "dob"}>
              <input
                value={props.dob}
                onChange={(e) => props.setDob(e.target.value)}
                style={inputStyle}
              />
            </Field>

            <Field label={props.labels?.first ?? "first_name"}>
              <input
                value={props.first}
                onChange={(e) => props.setFirst(e.target.value)}
                style={inputStyle}
              />
            </Field>

            {props.labels?.last !== undefined && (
              <Field label={props.labels.last}>
                <input
                  value={props.last}
                  onChange={(e) => props.setLast(e.target.value)}
                  style={inputStyle}
                />
              </Field>
            )}

            {props.humanId !== undefined && props.setHumanId && (
              <Field label={props.labels?.humanId ?? "Human ID"}>
                <input
                  value={props.humanId}
                  onChange={(e) => props.setHumanId?.(e.target.value)}
                  style={inputStyle}
                />
              </Field>
            )}

            {props.phoneNumber !== undefined && props.setPhoneNumber && (
              <Field label={props.labels?.phoneNumber ?? "Phone Number"}>
                <input
                  value={props.phoneNumber}
                  onChange={(e) => props.setPhoneNumber?.(e.target.value)}
                  style={inputStyle}
                  type="tel"
                  placeholder="(555) 555-1212"
                />
              </Field>
            )}

            {props.bankingAccountNumberLast4 !== undefined &&
              props.setBankingAccountNumberLast4 && (
                <Field label="Account Number Last 4">
                  <input
                    value={props.bankingAccountNumberLast4}
                    onChange={(e) =>
                      props.setBankingAccountNumberLast4?.(e.target.value)
                    }
                    style={inputStyle}
                    maxLength={4}
                    placeholder="4821"
                  />
                </Field>
              )}

            {props.bankingAccountType !== undefined &&
              props.setBankingAccountType && (
                <Field label="Account Type">
                  <input
                    value={props.bankingAccountType}
                    onChange={(e) =>
                      props.setBankingAccountType?.(e.target.value)
                    }
                    style={inputStyle}
                    placeholder="CHECKING, SAVINGS..."
                  />
                </Field>
              )}

            {props.bankingCurrency !== undefined &&
              props.setBankingCurrency && (
                <Field label="Currency">
                  <input
                    value={props.bankingCurrency}
                    onChange={(e) =>
                      props.setBankingCurrency?.(e.target.value)
                    }
                    style={inputStyle}
                    placeholder="USD"
                  />
                </Field>
              )}

            {props.bankingAccountStatus !== undefined &&
              props.setBankingAccountStatus && (
                <Field label="Account Status">
                  <input
                    value={props.bankingAccountStatus}
                    onChange={(e) =>
                      props.setBankingAccountStatus?.(e.target.value)
                    }
                    style={inputStyle}
                    placeholder="ACTIVE, CLOSED..."
                  />
                </Field>
              )}

            <Field label={props.labels?.email ?? "email"}>
              <input
                value={props.email}
                onChange={(e) => props.setEmail(e.target.value)}
                style={inputStyle}
              />
            </Field>

            <Field label={props.labels?.address ?? "address"}>
              <input
                value={props.address}
                onChange={(e) => props.setAddress(e.target.value)}
                style={inputStyle}
              />
            </Field>

            <Field label={props.labels?.sourceSystem ?? "source_system"}>
              <input
                value={props.sourceSystem}
                onChange={(e) => props.setSourceSystem(e.target.value)}
                style={inputStyle}
                placeholder="CRM, ERP, MDM, PLM, LEGACY..."
              />
            </Field>
          </>
        )}
      </div>
    </div>
  );
}