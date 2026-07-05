import react from '@vitejs/plugin-react';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { defineConfig, type Plugin } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

const packageJson = JSON.parse(readFileSync(resolve(process.cwd(), 'package.json'), 'utf8')) as {
  version: string;
};

const CSP =
  "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; font-src 'self'; connect-src 'self'; object-src 'none'; base-uri 'self'; form-action 'self'";

// Dev only: @vitejs/plugin-react injects an inline react-refresh preamble,
// which a strict script-src 'self' would block (blank page). Production
// keeps the strict policy — built HTML contains no inline scripts.
const DEV_CSP = CSP.replace("script-src 'self'", "script-src 'self' 'unsafe-inline'");

// Inject the strict CSP meta tag into the built index.html so the policy
// holds when dist/ is served from any static host without header support.
function cspMeta(): Plugin {
  return {
    name: 'fieldlog:csp-meta',
    apply: 'build',
    transformIndexHtml(html) {
      return {
        html,
        tags: [
          {
            tag: 'meta',
            attrs: { 'http-equiv': 'Content-Security-Policy', content: CSP },
            injectTo: 'head-prepend',
          },
        ],
      };
    },
  };
}

export default defineConfig({
  define: {
    __APP_VERSION__: JSON.stringify(packageJson.version),
  },
  plugins: [
    react(),
    cspMeta(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg'],
      manifest: {
        name: 'FieldLog',
        short_name: 'FieldLog',
        description: 'Offline amateur radio field logger',
        theme_color: '#1a1a2e',
        background_color: '#1a1a2e',
        display: 'standalone',
        start_url: '/',
        icons: [
          {
            src: 'pwa-192.png',
            sizes: '192x192',
            type: 'image/png',
          },
          {
            src: 'pwa-512.png',
            sizes: '512x512',
            type: 'image/png',
          },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,ico,woff2}'],
        navigateFallback: 'index.html',
      },
    }),
  ],
  server: {
    headers: {
      'Content-Security-Policy': DEV_CSP,
    },
  },
  preview: {
    headers: {
      'Content-Security-Policy': CSP,
    },
  },
});
