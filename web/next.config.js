/** @type {import('next').NextConfig} */
const nextConfig = {
  async rewrites() {
    return [
      { source: '/api/tracks', destination: 'http://127.0.0.1:3001/tracks' },
      { source: '/api/favorites', destination: 'http://127.0.0.1:3001/users/:USER_ID/favorites' }, // ví dụ nếu bạn đang dùng route handler để proxy
      // TUYỆT ĐỐI không có { source: '/api/:path*', destination: 'http://127.0.0.1:3001/:path*' }
    ];
  },
};
module.exports = nextConfig;
