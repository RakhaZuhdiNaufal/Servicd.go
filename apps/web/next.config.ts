import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  transpilePackages: ['@servicego/shared', '@servicego/database']
};

export default nextConfig;
