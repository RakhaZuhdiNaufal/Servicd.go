import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  transpilePackages: ['@servicego/shared', '@servicego/database'],
  // Prisma tidak ikut di-bundle; kalau di-bundle, query engine (.dll.node) tidak ikut tersalin
  // dan semua query gagal dengan "could not locate the Query Engine".
  serverExternalPackages: ['@prisma/client', '.prisma/client']
};

export default nextConfig;
