import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async headers() {
    if (process.env.VERCEL_ENV === 'preview') {
      return [
        {
          source: '/showtela',
          headers: [
            { key: 'Cache-Control', value: 'no-store, max-age=0' },
          ],
        },
        {
          source: '/_next/:path*',
          headers: [
            { key: 'Cache-Control', value: 'no-store, max-age=0' },
          ],
        },
      ]
    }
    return []
  },
};

export default nextConfig;
