import { spawn } from 'node:child_process';
import { createHash } from 'node:crypto';
import { mkdir, readdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
const artifact = path.join(root, '.data/validation/last-run.json');
async function codeDigest() {
  const files = ['package.json', 'pnpm-lock.yaml'];
  async function visit(directory) {
    for (const entry of await readdir(path.join(root, directory), { withFileTypes: true })) {
      const relative = path.join(directory, entry.name);
      if (entry.isDirectory()) await visit(relative);
      else if (/\.(ts|mjs)$/.test(entry.name)) files.push(relative);
    }
  }
  for (const directory of ['src', 'test', 'scripts']) await visit(directory);
  const hash = createHash('sha256');
  for (const file of files.sort()) hash.update(file).update(await readFile(path.join(root, file)));
  return hash.digest('hex');
}
const report = {
  startedAt: new Date().toISOString(),
  state: 'RUNNING',
  environment: 'synthetic-local-tests',
  sourceDigest: await codeDigest(),
  gates: [],
};
await mkdir(path.dirname(artifact), { recursive: true });
const persist = () => writeFile(artifact, JSON.stringify(report, null, 2) + '\n');
await persist();
const tests = (await readdir(path.join(root, 'test')))
  .filter((file) => file.endsWith('.test.ts'))
  .sort();
const gates = [
  ['types', ['node_modules/typescript/bin/tsc', '-p', 'tsconfig.check.json']],
  ['lint', ['node_modules/eslint/bin/eslint.js', 'src', 'test', 'scripts']],
  ['build', ['node_modules/typescript/bin/tsc', '-p', 'tsconfig.json']],
  [
    'runtime',
    [
      '--import',
      'tsx',
      '--test',
      '--test-reporter=tap',
      '--test-concurrency=1',
      ...tests.map((file) => `test/${file}`),
    ],
  ],
  ['docs', ['../scripts/check-docs.mjs']],
];
for (const [name, args] of gates) {
  process.stdout.write(`\nVERIFY ${name}\n`);
  const began = Date.now();
  const result = await new Promise((resolve) => {
    let output = '';
    const child = spawn(process.execPath, args, {
      cwd: root,
      env: { ...process.env, NODE_ENV: 'test', PROFLY_RUN_INTEGRATION: '1' },
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    child.stdout.on('data', (chunk) => {
      output += chunk;
      process.stdout.write(chunk);
    });
    child.stderr.on('data', (chunk) => {
      process.stderr.write(chunk);
    });
    child.once('error', () => resolve({ code: 1, output }));
    child.once('close', (code) => resolve({ code: code ?? 1, output }));
  });
  const gate = { name, state: result.code === 0 ? 'PASS' : 'FAIL', durationMs: Date.now() - began };
  if (name === 'runtime') {
    const number = (label) =>
      Number(result.output.match(new RegExp(`^# ${label} (\\d+)$`, 'm'))?.[1] ?? NaN);
    gate.tests = {
      total: number('tests'),
      passed: number('pass'),
      failed: number('fail'),
      skipped: number('skipped'),
      todo: number('todo'),
    };
    if (
      !Number.isFinite(gate.tests.total) ||
      gate.tests.total === 0 ||
      gate.tests.passed !== gate.tests.total ||
      gate.tests.failed !== 0 ||
      gate.tests.skipped !== 0 ||
      gate.tests.todo !== 0
    )
      gate.state = 'FAIL';
  }
  report.gates.push(gate);
  await persist();
  if (gate.state === 'FAIL') break;
}
report.finishedAt = new Date().toISOString();
report.sourceUnchanged = report.sourceDigest === (await codeDigest());
report.state =
  report.sourceUnchanged &&
  report.gates.length === gates.length &&
  report.gates.every((gate) => gate.state === 'PASS')
    ? 'PASS'
    : 'FAIL';
await persist();
process.stdout.write(
  `\nBACKEND_ACCEPTANCE ${report.state}; artifact: .data/validation/last-run.json\n`,
);
if (report.state !== 'PASS') process.exitCode = 1;
