import createNextIntlPlugin from "next-intl/plugin";

const isDev = process.env.NODE_ENV === "development";

// Content-Security-Policy. Locks the document down to same-origin by default and
// restricts where scripts, styles, connections, etc. may come from — a strong
// defence-in-depth layer against XSS and data exfiltration.
//
// 'unsafe-inline' is required for scripts/styles because the app renders an
// inline anti-flash theme script and Next.js injects inline bootstrap/runtime
// scripts; the remaining directives still meaningfully constrain an attacker
// (no arbitrary connect/exfil targets, no <base>/<object>, forms scoped to
// self). A nonce-based policy is the stricter future step.
// In development we additionally allow 'unsafe-eval' and ws: for React Fast
// Refresh / HMR, which would otherwise be blocked.
const csp = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ""}`,
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob:",
  "font-src 'self'",
  `connect-src 'self' https://*.supabase.co wss://*.supabase.co${isDev ? " ws://localhost:* http://localhost:*" : ""}`,
  "manifest-src 'self'",
  "worker-src 'self' blob:",
  "frame-ancestors 'none'",
  "base-uri 'none'",
  "form-action 'self'",
  "object-src 'none'",
].join("; ");

// Security headers applied to every response. These mitigate common web
// vulnerabilities (clickjacking, MIME sniffing, referrer leakage, protocol
// downgrade, XSS) without breaking the app's inline theme script or Supabase calls.
const securityHeaders = [
  // Force HTTPS for two years, including subdomains (ignored on http://localhost).
  {
    key: "Strict-Transport-Security",
    value: "max-age=63072000; includeSubDomains; preload",
  },
  // Disallow the site from being embedded in frames (clickjacking protection).
  { key: "X-Frame-Options", value: "SAMEORIGIN" },
  // Block MIME-type sniffing.
  { key: "X-Content-Type-Options", value: "nosniff" },
  // Only send the origin as referrer to other sites.
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  // Deny powerful browser features the app doesn't use.
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(), interest-cohort=()",
  },
  // Restrict resource origins and framing (XSS / clickjacking defence in depth).
  { key: "Content-Security-Policy", value: csp },
];

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  async headers() {
    return [
      {
        source: "/:path*",
        headers: securityHeaders,
      },
    ];
  },
};

const withNextIntl = createNextIntlPlugin("./i18n/request.ts");

export default withNextIntl(nextConfig);
