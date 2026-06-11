import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
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
    NEXT_PUBLIC_APPLE_CONFIGURED:
      process.env.APPLE_ID && process.env.APPLE_TEAM_ID &&
      process.env.APPLE_ID !== 'dummy-apple-id' &&
      process.env.APPLE_ID !== 'your-apple-service-id'
        ? 'true' : 'false',
  },
};

export default nextConfig;
