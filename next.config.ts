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
};

export default nextConfig;
