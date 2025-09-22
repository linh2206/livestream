/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  swcMinify: true,
  output: 'standalone',
  env: {
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:9000',
    NEXT_PUBLIC_WS_URL: process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:9000',
    NEXT_PUBLIC_HLS_URL: process.env.NEXT_PUBLIC_HLS_URL || 'http://localhost:8080/hls',
    NEXT_PUBLIC_STREAM_NAME: process.env.NEXT_PUBLIC_STREAM_NAME || 'stream',
    NEXT_PUBLIC_RTMP_URL: process.env.NEXT_PUBLIC_RTMP_URL || 'rtmp://localhost:1935/live',
    NEXT_PUBLIC_FRONTEND_URL: process.env.NEXT_PUBLIC_FRONTEND_URL || 'http://localhost:3000',
  },
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: `${process.env.BACKEND_URL || 'http://api:9000'}/api/:path*`,
      },
    ];
  },
};

module.exports = nextConfig;