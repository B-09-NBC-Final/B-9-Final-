/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'raw.githubusercontent.com',
        pathname: '/**'
      },
      {
        protocol: 'https',
        hostname: 'pdgwrjxbqywcmuxwjqos.supabase.co',
        pathname: '/**'
      },
      {
        protocol: 'https',
        hostname: 'search.pstatic.net',
        pathname: '/**'
      } // 이후에 삭제
    ]
  },
  env: {
    SUPABASE_URL: process.env.SUPABASE_URL,
    SUPABASE_KEY: process.env.SUPABASE_KEY
  }
};

export default nextConfig;
