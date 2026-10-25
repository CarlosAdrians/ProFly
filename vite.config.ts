/// <reference types="vitest/config" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { readFileSync } from 'node:fs';
const tlsPath = process.env.PROFLY_TLS_PFX;
const tlsPassword = process.env.PROFLY_TLS_PFX_PASSWORD;
if (Boolean(tlsPath) !== Boolean(tlsPassword))
  throw new Error('HTTPS local exige certificado e senha no ambiente do servidor.');
const https =
  tlsPath && tlsPassword
    ? { pfx: readFileSync(tlsPath), passphrase: tlsPassword, minVersion: 'TLSv1.2' as const }
    : undefined;
const privateHeaders = {
  'X-Content-Type-Options': 'nosniff',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
  'X-Frame-Options': 'DENY',
  'Cross-Origin-Opener-Policy': 'same-origin',
  'Cross-Origin-Resource-Policy': 'same-origin',
};

export default defineConfig({
  plugins: [react()],
  server: {
    host: '127.0.0.1',
    port: 5174,
    strictPort: true,
    https,
    cors: false,
    allowedHosts: ['localhost', '127.0.0.1'],
    headers: { ...privateHeaders, 'Cache-Control': 'no-store' },
    fs: {
      deny: [
        '**/.git/**',
        '**/.env',
        '**/.env.*',
        '**/*.{crt,cer,pem,key,pfx,p12}',
        '**/.vscode/**',
      ],
    },
    proxy: {
      '/api': {
        target: process.env.PROFLY_API_TARGET ?? 'http://127.0.0.1:3333',
        changeOrigin: false,
      },
    },
  },
  preview: {
    host: '127.0.0.1',
    https,
    headers: {
      ...privateHeaders,
      'Content-Security-Policy':
        "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; font-src 'self'; connect-src 'self' https://brasilapi.com.br; object-src 'none'; base-uri 'self'; form-action 'self'; frame-ancestors 'none'",
      'X-Content-Type-Options': 'nosniff',
      'Referrer-Policy': 'strict-origin-when-cross-origin',
      'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
      'X-Frame-Options': 'DENY',
    },
  },
  css: {
    modules: {
      localsConvention: 'camelCaseOnly',
    },
  },
  test: {
    include:
      process.env.PROFLY_RUN_INTEGRATION === '1'
        ? ['src/institutional/connected.api.test.tsx']
        : ['src/**/*.test.{ts,tsx}'],
    exclude: process.env.PROFLY_RUN_INTEGRATION === '1' ? [] : ['src/**/*.api.test.tsx'],
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test/setup.ts'],
    css: { modules: { classNameStrategy: 'non-scoped' } },
  },
});
