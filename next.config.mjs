import createNextIntlPlugin from "next-intl/plugin";

// Security headers applied to every response. These mitigate common web
// vulnerabilities (clickjacking, MIME sniffing, referrer leakage, protocol
// downgrade) without breaking the app's inline theme script or Supabase calls.
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
  // Modern equivalent of X-Frame-Options; blocks all framing.
  { key: "Content-Security-Policy", value: "frame-ancestors 'none'" },
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
