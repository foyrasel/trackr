import type { NextConfig } from "next";

const securityHeaders = [
  { key: 'X-DNS-Prefetch-Control', value: 'on' },
  { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' },
  { key: 'X-XSS-Protection', value: '1; mode=block' },
  { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'Referrer-Policy', value: 'origin-when-cross-origin' },
  { key: 'Permissions-Policy', value: 'camera=(), microphone=(self), geolocation=(self)' },
  {
    key: 'Content-Security-Policy',
    value: "default-src 'self'; script-src 'self' 'unsafe-eval' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' blob: data: https://lh3.googleusercontent.com https://avatars.githubusercontent.com; font-src 'self' https://fonts.gstatic.com; connect-src 'self' https://*.googleapis.com https://*.google.com https://graph.facebook.com; frame-src 'none'; object-src 'none';"
  },
];

const nextConfig: NextConfig = {
  reactStrictMode: false,
  env: {
    NEXT_PUBLIC_GOOGLE_CONFIGURED:
      process.env.GOOGLE_ID && process.env.GOOGLE_SECRET &&
      process.env.GOOGLE_ID !== 'dummy-google-id' &&
      process.env.GOOGLE_ID !== 'your-google-client-id'
        ? 'true' : 'false',
    NEXT_PUBLIC_FACEBOOK_CONFIGURED:
      process.env.FACEBOOK_ID && process.env.FACEBOOK_SECRET &&
      process.env.FACEBOOK_ID !== 'dummy-facebook-id' &&
      process.env.FACEBOOK_ID !== 'your-facebook-app-id'
        ? 'true' : 'false',
  },
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: securityHeaders,
      },
    ];
  },
};

export default nextConfig;
