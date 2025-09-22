/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  swcMinify: true,
  output: 'standalone',
  // Environment variables are automatically loaded from .env files
  // No need to manually define them here
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:9000'}/:path*`,
      },
    ];
  },
};

module.exports = nextConfig;