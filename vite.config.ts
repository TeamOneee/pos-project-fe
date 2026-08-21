import { defineConfig, loadEnv, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';
import { fileURLToPath, URL } from 'node:url';

/**
 * The Content-Security-Policy, as a `<meta>` on the built document, so it holds
 * on Netlify, on nginx and under `vite preview` alike. `frame-ancestors`, which
 * a meta cannot express, is a real header in netlify.toml and
 * docker/security-headers.conf.
 *
 * Build only: the dev server needs the inline preamble @vitejs/plugin-react
 * injects, which `script-src 'self'` would block.
 *
 * `style-src 'unsafe-inline'` is required — Radix and recharts set inline style
 * attributes, and the receipt carries an inline `<style>`. `script-src 'self'`
 * holds only while vite-plugin-pwa emits registration as an external file. See
 * docs/security.md.
 */
function contentSecurityPolicy(apiUrl: string | undefined): Plugin {
  let origin = '';
  try {
    if (apiUrl) origin = new URL(apiUrl).origin;
  } catch {
    // A connect-src of just 'self' is the safe way to be wrong.
  }

  const policy = [
    "default-src 'self'",
    "script-src 'self'",
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data:",
    "font-src 'self' data:",
    `connect-src 'self'${origin && origin !== 'null' ? ` ${origin}` : ''}`,
    "worker-src 'self'",
    "frame-src 'self'",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
  ].join('; ');

  // Text rather than a tag descriptor: Vite entity-encodes attribute values,
  // and `&#39;self&#39;` is a policy nobody will read.
  const meta = `<meta http-equiv="Content-Security-Policy" content="${policy}" />`;

  return {
    name: 'pos-csp-meta',
    apply: 'build',
    transformIndexHtml: {
      order: 'post',
      // After <head>, so it governs every script that follows.
      handler: (html) =>
        html.replace(
          '<head>',
          `<head>
    ${meta}`
        ),
    },
  };
}

export default defineConfig(({ mode }) => {
  // loadEnv reads .env files only; the Docker build passes VITE_API_URL as a
  // real environment variable.
  const env = loadEnv(mode, process.cwd());
  const apiUrl = process.env.VITE_API_URL ?? env.VITE_API_URL;

  return {
    plugins: [
      react(),
      contentSecurityPolicy(apiUrl),
      VitePWA({
        registerType: 'autoUpdate',
        includeAssets: ['favicon.ico', 'apple-touch-icon.png', 'mask-icon.svg'],
        manifest: {
          name: 'POS Kasir App',
          short_name: 'POS',
          description: 'Aplikasi POS Kasir',
          theme_color: '#ffffff',
          background_color: '#ffffff',
          display: 'standalone',
          icons: [
            {
              src: 'pwa-192x192.png',
              sizes: '192x192',
              type: 'image/png',
            },
            {
              src: 'pwa-512x512.png',
              sizes: '512x512',
              type: 'image/png',
              purpose: 'any maskable',
            },
          ],
        },
      }),
    ],
    resolve: {
      alias: {
        '@': fileURLToPath(new URL('./src', import.meta.url)),
      },
    },
    server: {
      host: true,
      port: 5173,
    },
    build: {
      outDir: 'dist',
    },
  };
});
