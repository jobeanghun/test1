/** @type {import('next').NextConfig} */
const nextConfig = {
  /* config options here */
  serverExternalPackages: ["pdf-parse", "officeparser", "file-type"],
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  outputFileTracingIncludes: {
    '/api/**/*': [
      './node_modules/pdf-parse/**/*', 
      './node_modules/officeparser/**/*',
      './node_modules/file-type/**/*'
    ],
  },
};

export default nextConfig;
