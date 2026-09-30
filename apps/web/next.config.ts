import type { NextConfig } from "next";
import { policyConfiguration, securityPolicy } from "./src/lib/security-policy";

const securityHeaders = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Content-Security-Policy", value: securityPolicy(policyConfiguration()) },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
];

const nextConfig: NextConfig = {
  devIndicators: false,
  headers() {
    return [
      { source: "/:path*", headers: securityHeaders },
      ...["/", "/demo/:path*", "/docs/:path*", "/privacy/:path*", "/terms/:path*"].map((source) => ({
        source,
        headers: [
          { key: "X-Frame-Options", value: "SAMEORIGIN" },
          { key: "Content-Security-Policy", value: securityPolicy(policyConfiguration(), undefined, true) },
        ],
      })),
    ];
  },
};

export default nextConfig;
