export const SCOPES = ["tasks:read", "tasks:write", "spaces:read", "spaces:write", "goals:read", "goals:write"] as const;
export type Scope = typeof SCOPES[number];
