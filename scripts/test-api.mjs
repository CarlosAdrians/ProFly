import { spawn } from 'node:child_process';
import path from 'node:path';
const child = spawn(
  process.execPath,
  [path.resolve('node_modules/vitest/vitest.mjs'), 'run', '--maxWorkers=1'],
  { stdio: 'inherit', env: { ...process.env, PROFLY_RUN_INTEGRATION: '1' } },
);
child.on('exit', (code) => process.exit(code ?? 1));
child.on('error', () => process.exit(1));
