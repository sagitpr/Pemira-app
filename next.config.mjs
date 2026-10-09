/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'Content-Security-Policy',
            value: "default-src 'self' 'unsafe-inline' 'unsafe-eval' * data: blob:; connect-src 'self' https://ckcaqprcakvuaisdhybx.supabase.co wss://ckcaqprcakvuaisdhybx.supabase.co; img-src 'self' blob: data: https:; font-src 'self' data: https:; style-src 'self' 'unsafe-inline' https:; script-src 'self' 'unsafe-inline' 'unsafe-eval' https:;"
              .replace(/\s{2,}/g, ' ')
              .trim(),
          },
        ],
      },
    ];
  },
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
