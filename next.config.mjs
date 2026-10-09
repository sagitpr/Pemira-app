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
            value: "default-src 'self'; script-src 'self' 'unsafe-eval' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' blob: data: https:; connect-src 'self' https://ckcaqprcakvuaisdhybx.supabase.co wss://ckcaqprcakvuaisdhybx.supabase.co https://*.supabase.co wss://*.supabase.co https: wss:; font-src 'self' data: https:;",
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
