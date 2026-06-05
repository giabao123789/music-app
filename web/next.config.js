/** @type {import('next').NextConfig} */
const backendUrl = (
  process.env.BACKEND_URL ||
  process.env.NEXT_PUBLIC_API_URL ||
  'http://127.0.0.1:3001'
).replace(/\/+$/, '');

const nextConfig = {
  async rewrites() {
    return [
      { source: '/api/tracks', destination: `${backendUrl}/tracks` },
      {
        source: '/api/favorites',
        destination: `${backendUrl}/users/:USER_ID/favorites`,
      },
    ];
  },
};
module.exports = nextConfig;
