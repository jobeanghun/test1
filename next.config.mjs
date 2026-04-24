/** @type {import('next').NextConfig} */
const nextConfig = {
  /* config options here */
  serverExternalPackages: ["pdf-parse"],
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  outputFileTracingIncludes: {
    '/api/**/*': ['./node_modules/pdf-parse/**/*'],
  },
  env: {
    NEXT_PUBLIC_KAKAO_JS_KEY: "1e7b231ea71cb4659b9a67440939fde9",
    NEXT_PUBLIC_SUPABASE_URL: "https://zuqsjrbacmwsrvryfsxo.supabase.co",
    NEXT_PUBLIC_SUPABASE_ANON_KEY: "sb_publishable_TZXrUf5QLKA-5J0gVb2lyw_HBowSBmK"
  }
};

export default nextConfig;
