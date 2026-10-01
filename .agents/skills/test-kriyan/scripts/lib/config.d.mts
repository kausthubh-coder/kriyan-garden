export const root: string;
export const stateDirectory: string;
export function configuration(): NodeJS.ProcessEnv & { CLERK_SECRET_KEY: string; NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: string; NEXT_PUBLIC_CONVEX_URL: string };
