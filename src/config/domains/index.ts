import type { DomainType } from "../../api/types";
import { customerDomainConfig } from "./customer";
import { supplierDomainConfig } from "./supplier";
import { productDomainConfig } from "./product";
import { patientDomainConfig } from "./patient";
import { providerDomainConfig } from "./provider";
import { bankingDomainConfig } from "./banking";
import { locationDomainConfig } from "./location";
import { organizationDomainConfig } from "./organization";
import { otherDomainConfig } from "./other";

export const DOMAIN_CONFIG = {
  CUSTOMER: customerDomainConfig,
  SUPPLIER: supplierDomainConfig,
  PRODUCT: productDomainConfig,
  PATIENT: patientDomainConfig,
  PROVIDER: providerDomainConfig,
  BANKING: bankingDomainConfig,
  LOCATION: locationDomainConfig,
  ORGANIZATION: organizationDomainConfig,
  OTHER: otherDomainConfig,
} satisfies Record<DomainType, {
  domain: DomainType;
  memberIdLabel: string;
  rulePresets: readonly string[];
  overrideReasons: readonly string[];
  fieldLabels: Readonly<Record<string, string>>;
  signalLabels: Readonly<Record<string, string>>;
}>;

export const DOMAIN_OPTIONS = Object.keys(DOMAIN_CONFIG) as DomainType[];

export function getDomainConfig(domain: DomainType) {
  return DOMAIN_CONFIG[domain];
}

export function getDomainSignalLabel(
  domain: DomainType,
  signalName?: string | null,
): string | undefined {
  if (!signalName) return undefined;
  const key = signalName.toUpperCase();
  return DOMAIN_CONFIG[domain].signalLabels[key as keyof typeof DOMAIN_CONFIG[typeof domain]["signalLabels"]];
}
