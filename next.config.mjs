/** @type {import('next').NextConfig} */
const nextConfig = {
  /* config options here */
  serverExternalPackages: [
    "pdf-parse", 
    "officeparser", 
    "file-type", 
    "strtok3", 
    "token-types", 
    "peek-readable", 
    "ieee754"
  ],
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
      './node_modules/file-type/**/*',
      './node_modules/strtok3/**/*',
      './node_modules/token-types/**/*',
      './node_modules/peek-readable/**/*',
      './node_modules/ieee754/**/*'
    ],
  },
};

export default nextConfig;
