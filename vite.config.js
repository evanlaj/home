import { defineConfig } from 'vite'
import { createHtmlPlugin } from 'vite-plugin-html'

export default defineConfig({
  base: '/', 
  
  // Plugins
  plugins: [
    createHtmlPlugin({
      minify: {
        collapseWhitespace: true,
        keepClosingSlash: true,
        removeComments: true,
        removeRedundantAttributes: true,
        removeScriptTypeAttributes: true,
        removeStyleLinkTypeAttributes: true,
        useShortDoctype: true,
        minifyCSS: true,
        minifyJS: true
      }
    })
  ],
  
  // Build configuration
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    
    // Minification settings
    minify: 'esbuild',
    cssMinify: 'esbuild',
    
    // Asset handling
    assetsDir: 'assets',
    
    // Rollup options for advanced bundling
    rollupOptions: {
      output: {
        // Keep assets organized in their folders
        assetFileNames: (assetInfo) => {
          const info = assetInfo.name.split('.')
          const ext = info[info.length - 1]
          
          // Keep fonts in fonts folder
          if (/ttf|otf|woff|woff2/.test(ext)) {
            return `fonts/[name].[ext]`
          }
          
          // Keep images in img folder  
          if (/png|jpe?g|svg|gif|tiff|bmp|ico|webp/.test(ext)) {
            return `img/[name].[ext]`
          }
          
          // Everything else goes to assets with hash
          return `assets/[name]-[hash].[ext]`
        },
        
        // Keep your main CSS file name clean
        chunkFileNames: 'assets/[name]-[hash].js',
        entryFileNames: 'assets/[name]-[hash].js'
      }
    },
    
    // Source maps for debugging (disable in production)
    sourcemap: false,
    
    // Target modern browsers
    target: 'esnext'
  },
  
  // Development server options
  server: {
    port: 3000,
    open: true, // Auto-open browser
    host: true  // Allow access from network
  },
  
  // Preview server (for testing builds)
  preview: {
    port: 4173,
    open: true
  },
  
  // Handle static assets
  publicDir: 'public',
  
  // CSS configuration
  css: {
    // Enable CSS modules if needed (you probably don't need this)
    modules: false,
    
    // PostCSS config (add if you want autoprefixer, etc.)
    postcss: {}
  },
  
  // Asset optimization
  assetsInclude: ['**/*.ttf', '**/*.woff', '**/*.woff2'],
  
  // Define global constants if needed
  define: {
    __APP_VERSION__: JSON.stringify(process.env.npm_package_version)
  }
})