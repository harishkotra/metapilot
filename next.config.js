/** @type {import('next').NextConfig} */
const nextConfig = {
  typescript: {
    // Enable strict type checking
    ignoreBuildErrors: false,
  },
  env: {
    // Environment variables for blockchain and AI integration
    NEXT_PUBLIC_SUPPORTED_CHAIN_IDS: process.env.NEXT_PUBLIC_SUPPORTED_CHAIN_IDS || '11155111', // Sepolia by default
    GAIA_LLM_ENDPOINT: process.env.GAIA_LLM_ENDPOINT,
    ENVIO_GRAPHQL_ENDPOINT: process.env.ENVIO_GRAPHQL_ENDPOINT,
  },
  webpack: (config, { isServer }) => {
    // Handle node modules that need polyfills
    config.resolve.fallback = {
      ...config.resolve.fallback,
      fs: false,
      net: false,
      tls: false,
    };

    // Handle Envio HyperSync client native binaries
    if (!isServer) {
      // Exclude native modules from client-side bundle
      config.externals = config.externals || [];
      config.externals.push('@envio-dev/hypersync-client');
      
      // Add rule to ignore .node files with inline loader
      config.module.rules.push({
        test: /\.node$/,
        use: {
          loader: 'file-loader',
          options: {
            emitFile: false,
          },
        },
      });
    }

    return config;
  },
  // Experimental features for better native module support
  experimental: {
    serverComponentsExternalPackages: ['@envio-dev/hypersync-client'],
  },
};

module.exports = nextConfig;