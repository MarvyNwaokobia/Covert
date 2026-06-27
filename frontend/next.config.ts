import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  // Turbopack is default in Next.js 16 — empty config satisfies the check
  turbopack: {},

  // Webpack config applies to production builds only
  webpack: (config) => {
    // fhevmjs uses WASM — enable async WebAssembly for prod
    config.experiments = {
      ...config.experiments,
      asyncWebAssembly: true,
      layers: true,
    }
    return config
  },
}

export default nextConfig
