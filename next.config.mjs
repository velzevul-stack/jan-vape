/** @type {import('next').NextConfig} */
const nextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
  serverExternalPackages: ['typeorm', 'pg', 'pg-native', 'reflect-metadata'],
  experimental: {
    serverMinification: false,
  },
}

export default nextConfig
