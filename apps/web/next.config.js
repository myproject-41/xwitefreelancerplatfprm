/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  async rewrites() {
    const backend = process.env.BACKEND_URL
    if (!backend) return []
    return [
      { source: '/api/:path*', destination: `${backend}/api/:path*` },
      { source: '/uploads/:path*', destination: `${backend}/uploads/:path*` },
    ]
  },
  images: {
    remotePatterns: [
      {
        protocol: 'http',
        hostname: 'localhost',
        port: '4000',
        pathname: '/uploads/**',
      },
      {
        protocol: 'https',
        hostname: '**',
        pathname: '/uploads/**',
      },
    ],
  },
}

module.exports = nextConfig