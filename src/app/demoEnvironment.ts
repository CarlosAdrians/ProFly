/** The current adapters are browser-only demos, not institutional authentication. */
export function demoEnvironmentAllowed(hostname: string) {
  return ['localhost', '127.0.0.1', '[::1]', '::1'].includes(hostname);
}
