/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  async rewrites() {
    // Only proxy in production — dev hits localhost:4000 directly via axios baseURL
    if (process.env.NODE_ENV === 'development') return []
    const backend =
      process.env.BACKEND_URL || 'https://server-production-fb0e.up.railway.app'
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