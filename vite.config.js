import { defineConfig } from 'vite'
import { createHtmlPlugin } from 'vite-plugin-html'
import path from 'path'
import { fileURLToPath } from 'url'
import { viteArticlePlugin } from './scripts/vite-article-plugin.js'
import { viteI18nPlugin } from './scripts/vite-i18n-plugin.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  base: '/', 
  
  // Plugins
  plugins: [
    viteArticlePlugin(),
    viteI18nPlugin(),
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
      input: {
        main: path.resolve(__dirname, 'index.html'),
        articles: path.resolve(__dirname, 'articles.css')
      },
      output: {
        // Keep assets organized in their folders
        assetFileNames: (assetInfo) => {
          const info = assetInfo.name.split('.')
          const ext = info[info.length - 1]
          
          if (/ttf|otf|woff|woff2/.test(ext)) {
            return `fonts/[name].[ext]`
          }
          
          if (/png|jpe?g|svg|gif|tiff|bmp|ico|webp/.test(ext)) {
            return `img/[name].[ext]`
          }
          
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
    open: false,
    host: true
  },
  
  // Preview server (for testing builds)
  preview: {
    port: 4173,
    open: false
  },
  
  // Handle static assets
  publicDir: 'public',
  
  // CSS configuration
  css: {
    modules: false,    
    postcss: {}
  },
  
  // Asset optimization
  assetsInclude: ['**/*.ttf', '**/*.woff', '**/*.woff2'],
  
  // Define global constants if needed
  define: {
    __APP_VERSION__: JSON.stringify(process.env.npm_package_version)
  }
})