/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Allow server-side env vars to reach API routes
  serverExternalPackages: ['@metamask/smart-accounts-kit'],
  webpack: (config) => {
    // viem / abitype use top-level await
    config.experiments = { ...config.experiments, topLevelAwait: true }
    return config
  },
}

module.exports = nextConfig