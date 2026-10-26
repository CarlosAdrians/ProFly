import { demoEnvironmentAllowed } from './demoEnvironment';
it('limita a demonstracao a hosts locais exatos, sem aceitar dominios parecidos', () => {
  for (const host of ['localhost', '127.0.0.1', '[::1]', '::1'])
    expect(demoEnvironmentAllowed(host)).toBe(true);
  for (const host of ['localhost.example.org', 'example.org', '192.168.0.10', '0.0.0.0', ''])
    expect(demoEnvironmentAllowed(host)).toBe(false);
});
