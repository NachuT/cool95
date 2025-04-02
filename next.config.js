/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    domains: ['localhost', 'mayflask.vercel.app'],
    remotePatterns: [
      {
        protocol: 'http',
        hostname: 'localhost',
        port: '5001',
        pathname: '/api/images/**',
      },
      {
        protocol: 'https',
        hostname: 'mayflask.vercel.app',
        pathname: '/api/images/**',
      },
    ],
  },
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: `${process.env.NEXT_PUBLIC_API_URL || 'https://mayflask.vercel.app'}/:path*`,
      },
    ];
  },
};

module.exports = nextConfig; 