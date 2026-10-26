// Server-only TLS configuration. Never import the certificate into a trust store.
if (!process.env.PROFLY_TLS_PFX || !process.env.PROFLY_TLS_PFX_PASSWORD) {
  throw new Error('Configure o certificado e a senha privados em .env.https.local.');
}
const { createServer } = await import('vite');
const server = await createServer({
  server: { host: '127.0.0.1', port: 5176, strictPort: true },
});
await server.listen();
server.printUrls();
