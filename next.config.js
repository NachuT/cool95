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
        destination: 'https://mayflask.vercel.app/api/:path*',
      },
    ];
  },
  webpack: (config) => {
    config.externals.push({
      'utf-8-validate': 'commonjs utf-8-validate',
      'bufferutil': 'commonjs bufferutil',
    });
    return config;
  },
  // Optimize for Vercel deployment
  swcMinify: true,
  reactStrictMode: true,
  poweredByHeader: false,
  compress: true,
}

module.exports = nextConfig 