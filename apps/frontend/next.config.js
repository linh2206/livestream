/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: false,
  swcMinify: true,
  experimental: {
    appDir: true,
  },
  env: {
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:9000/api/v1',
    NEXT_PUBLIC_WS_URL: process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:9000',
    NEXT_PUBLIC_HLS_URL: process.env.NEXT_PUBLIC_HLS_URL || 'http://localhost:8080/hls',
    NEXT_PUBLIC_RTMP_URL: process.env.NEXT_PUBLIC_RTMP_URL || 'rtmp://localhost:1935',
  },
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:9000/api/v1'}/:path*`,
      },
    ];
  },
};

module.exports = nextConfig;
