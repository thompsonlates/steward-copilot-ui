# ExplainPage domain split

Create this folder in the UI project:

src/config/domains/

Copy the nine domain files plus index.ts into that folder.

This first split moves domain-owned metadata out of ExplainPage.tsx:
- rule presets
- steward override reasons
- entity ID label
- field labels
- signal labels

It intentionally does not move React state, API calls, decision components, or page orchestration yet.

Recommended next step:
1. Import DOMAIN_CONFIG / DOMAIN_OPTIONS / getDomainConfig from src/config/domains.
2. Replace the duplicate DOMAIN_RULE_PRESETS and DOMAIN_OVERRIDE_REASON_OPTIONS constants in ExplainPage.tsx.
3. Replace getMemberIdLabel() and getDomainFieldLabels() with getDomainConfig(domain).
4. Make formatSignalName() consult domain signalLabels first, then preserve its current generic fallback.
5. Run npm run build before deleting old code.
