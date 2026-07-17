import path from "node:path";
import { fileURLToPath } from "node:url";
import type { NextConfig } from "next";

const projectRoot = path.dirname(fileURLToPath(import.meta.url));

const securityHeaders = [
  {
    key: "X-Content-Type-Options",
    value: "nosniff",
  },
  {
    key: "Referrer-Policy",
    value: "strict-origin-when-cross-origin",
  },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=()",
  },
];

const privateFrameHeaders = [
  {
    key: "X-Frame-Options",
    value: "DENY",
  },
  {
    key: "Content-Security-Policy",
    value: "frame-ancestors 'none'",
  },
];

const publicFormFrameHeaders = [
  {
    key: "Content-Security-Policy",
    value: "frame-ancestors *",
  },
];

const nextConfig: NextConfig = {
  allowedDevOrigins: ["localhost", "127.0.0.1"],
  devIndicators: false,
  output: "standalone",
  turbopack: {
    root: projectRoot,
  },
  webpack(config) {
    if (process.env.LEADS_DESK_DISABLE_WEBPACK_CACHE === "true") {
      config.cache = false;
    }
    return config;
  },
  async redirects() {
    return [
      {
        source: "/admin",
        destination: "/dashboard",
        permanent: false,
      },
      {
        source: "/admin/signin",
        destination: "/login",
        permanent: false,
      },
      {
        source: "/admin/leads",
        destination: "/leads",
        permanent: false,
      },
      {
        source: "/admin/leads/trash",
        destination: "/leads/trash",
        permanent: false,
      },
      {
        source: "/admin/leads/:id",
        destination: "/leads/:id",
        permanent: false,
      },
      {
        source: "/admin/tasks",
        destination: "/tasks",
        permanent: false,
      },
      {
        source: "/admin/team",
        destination: "/team",
        permanent: false,
      },
      {
        source: "/admin/reports",
        destination: "/reports",
        permanent: false,
      },
      {
        source: "/admin/notifications",
        destination: "/notifications",
        permanent: false,
      },
      {
        source: "/admin/forms",
        destination: "/forms",
        permanent: false,
      },
      {
        source: "/admin/intake",
        destination: "/intake",
        permanent: false,
      },
      {
        source: "/admin/profile",
        destination: "/profile",
        permanent: false,
      },
      {
        source: "/admin/settings",
        destination: "/settings",
        permanent: false,
      },
      {
        source: "/admin/settings/:path*",
        destination: "/settings/:path*",
        permanent: false,
      },
      {
        source: "/admin/integrations",
        destination: "/integrations",
        permanent: false,
      },
      {
        source: "/admin/integrations/:path*",
        destination: "/integrations/:path*",
        permanent: false,
      },
      {
        source: "/delete-my-data",
        destination: "/",
        permanent: false,
      },
    ];
  },
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: securityHeaders,
      },
      {
        source: "/((?!forms/|embed/forms/).*)",
        headers: privateFrameHeaders,
      },
      {
        source: "/forms/:path*",
        headers: publicFormFrameHeaders,
      },
      {
        source: "/embed/forms/:path*",
        headers: publicFormFrameHeaders,
      },
    ];
  },
};

export default nextConfig;
