import { parsePublishableKey } from "@clerk/shared/keys";

type Configuration = {
  development: boolean;
  publishableKey?: string;
  convexUrl?: string;
  sentryDsn?: string;
};

function httpsOrigin(value: string | undefined) {
  if (!value) return undefined;
  try {
    const url = new URL(value);
    return url.protocol === "https:" ? url.origin : undefined;
  } catch {
    return undefined;
  }
}

export function permitsPublicFrame(pathname: string) {
  return pathname === "/demo";
}

export function securityPolicy(config: Configuration, nonce?: string, publicFrame = false) {
  const frontend = parsePublishableKey(config.publishableKey)?.frontendApi;
  const clerk = frontend ? `https://${frontend}` : undefined;
  const convex = httpsOrigin(config.convexUrl);
  const sentry = httpsOrigin(config.sentryDsn);
  const protection = "https://*.protect.clerk.com";
  const scripts = nonce ? [`'nonce-${nonce}'`, "'strict-dynamic'"] : ["'unsafe-inline'"];
  const directives: Record<string, (string | undefined)[]> = {
    "default-src": ["'self'"],
    "script-src": ["'self'", ...scripts, config.development ? "'unsafe-eval'" : undefined, clerk, "https://challenges.cloudflare.com", protection],
    // Clerk injects CSS at runtime; the planner also uses inline position styles.
    "style-src": ["'self'", "'unsafe-inline'"],
    "connect-src": ["'self'", clerk, `${protection}:*`, convex, convex?.replace("https:", "wss:"), sentry, config.development ? "ws://localhost:*" : undefined, config.development ? "ws://127.0.0.1:*" : undefined],
    "img-src": ["'self'", "data:", "blob:", "https://img.clerk.com"],
    "font-src": ["'self'"],
    "worker-src": ["'self'", "blob:"],
    "frame-src": ["'self'", "https://challenges.cloudflare.com", protection],
    "object-src": ["'none'"],
    "base-uri": ["'self'"],
    "form-action": ["'self'"],
    "frame-ancestors": [publicFrame ? "'self'" : "'none'"],
  };
  if (!config.development) directives["upgrade-insecure-requests"] = [];
  return Object.entries(directives).map(([name, values]) => `${name}${values.length ? ` ${values.filter(Boolean).join(" ")}` : ""}`).join("; ");
}

export function policyConfiguration(): Configuration {
  return {
    development: process.env.NODE_ENV === "development",
    publishableKey: process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY,
    convexUrl: process.env.NEXT_PUBLIC_CONVEX_URL,
    sentryDsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  };
}
