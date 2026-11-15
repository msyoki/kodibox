import path from 'node:path';
import { fileURLToPath } from 'node:url';
import type { NextConfig } from 'next';

// Pin the monorepo root so a stray lockfile higher up (e.g. in the home folder)
// can't make Turbopack resolve packages from the wrong directory.
const monorepoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');

// Anti-framing headers are skipped in local development only, so the app can be
// previewed in an IDE browser (VS Code Simple Browser renders pages in an iframe).
// Production builds always send them.
const isDev = process.env.NODE_ENV === 'development';
const frameHeaders = isDev
  ? []
  : [
      { key: 'Content-Security-Policy', value: "frame-ancestors 'none'" },
      { key: 'X-Frame-Options', value: 'DENY' },
    ];

const securityHeaders = [
  { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  ...frameHeaders,
  {
    key: 'Permissions-Policy',
    value: 'camera=(), microphone=(), geolocation=(), payment=(), usb=()',
  },
];

const nextConfig: NextConfig = {
  poweredByHeader: false,
  reactStrictMode: true,
  turbopack: { root: monorepoRoot },
  transpilePackages: ['@kodibox/core', '@kodibox/config', '@kodibox/ui', '@kodibox/demo'],
  async headers() {
    return [{ source: '/:path*', headers: securityHeaders }];
  },
};

export default nextConfig;
