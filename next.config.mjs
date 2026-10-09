/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  async rewrites() {
    return [
      {
        source: '/candidate/image/logo-pemira.png',
        destination: '/candidates/image/Image-logo-Pemira.png',
      },
      {
        source: '/candidates/image/logo-pemira.png',
        destination: '/candidates/image/Image-logo-Pemira.png',
      },
      {
        source: '/logo.png',
        destination: '/candidates/image/Image-logo-Pemira.png',
      },
    ];
  },
};

export default nextConfig;
