/** @type {import('next').NextConfig} */
const nextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
  serverExternalPackages: ['typeorm', 'pg', 'pg-native', 'reflect-metadata'],
}

export default nextConfig
