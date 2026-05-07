export type OperationalIdentity = {
  name: string;
  organizationName?: string | null;
};

export function getOperationalDisplayName(identity: OperationalIdentity) {
  return identity.organizationName?.trim() || identity.name;
}
