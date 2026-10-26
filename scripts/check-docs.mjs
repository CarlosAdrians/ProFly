import { readFile, readdir, stat } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(fileURLToPath(new URL('../', import.meta.url)));
const failures = [];
let localLinks = 0;

async function markdownFiles(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const target = path.join(directory, entry.name);
    if (entry.isDirectory()) files.push(...(await markdownFiles(target)));
    else if (entry.isFile() && entry.name.endsWith('.md')) files.push(target);
  }
  return files;
}

async function checkMarkdown(file) {
  const label = path.relative(root, file);
  const text = await readFile(file, 'utf8');
  let fence = null;
  const prose = [];
  for (const line of text.split(/\r?\n/u)) {
    const marker = /^ {0,3}(`{3,}|~{3,})(.*)$/u.exec(line);
    if (marker) {
      const symbol = marker[1][0];
      if (!fence) fence = { symbol, length: marker[1].length };
      else if (
        symbol === fence.symbol &&
        marker[1].length >= fence.length &&
        marker[2].trim() === ''
      ) fence = null;
      continue;
    }
    if (!fence) prose.push(line);
  }
  if (fence) failures.push(`${label}: bloco de codigo sem fechamento`);
  if (text.includes('\uFFFD')) failures.push(`${label}: caractere de substituicao de encoding`);

  for (const match of prose.join('\n').matchAll(/!?\[[^\]\n]*\]\(([^)\n]+)\)/gu)) {
    const raw = match[1].trim().replace(/^<|>$/gu, '');
    if (/^(?:https?:|mailto:|data:)/iu.test(raw) || raw.startsWith('#')) continue;
    let local;
    try {
      local = decodeURIComponent(raw.split('#')[0]);
    } catch {
      failures.push(`${label}: link com codificacao invalida: ${raw}`);
      continue;
    }
    const destination = path.resolve(path.dirname(file), local);
    const relative = path.relative(root, destination);
    if (relative === '..' || relative.startsWith(`..${path.sep}`) || path.isAbsolute(relative)) {
      failures.push(`${label}: link local fora do repositorio: ${raw}`);
      continue;
    }
    try {
      await stat(destination);
      localLinks += 1;
    } catch {
      failures.push(`${label}: link local inexistente: ${raw}`);
    }
  }
}

function uniqueIds(items, pattern, label) {
  const ids = new Set();
  for (const item of items) {
    if (!pattern.test(item.id ?? '')) failures.push(`${label}: ID invalido`);
    if (ids.has(item.id)) failures.push(`${label}: ID duplicado ${item.id}`);
    ids.add(item.id);
  }
  return ids;
}

async function main() {
  const files = [path.join(root, 'README.md'), path.join(root, 'AGENTS.md'), path.join(root, 'backend/README.md')];
  files.push(...(await markdownFiles(path.join(root, 'docs'))));
  for (const file of files) await checkMarkdown(file);

  const matrix = JSON.parse(await readFile(path.join(root, 'docs/specs/backend-cases.json'), 'utf8'));
  if (!Array.isArray(matrix.requirements) || !Array.isArray(matrix.cases)) {
    throw new Error('Matriz deve conter requirements e cases como arrays');
  }
  if (matrix.requirements.length === 0 || matrix.cases.length === 0 || matrix.status !== 'PLANNED') {
    throw new Error('Matriz deve ter requisitos e cenarios planejados, sem representar evidencia de runtime');
  }
  const requirements = uniqueIds(matrix.requirements, /^REQ-\d{2}$/u, 'Requisito');
  uniqueIds(matrix.cases, /^CASE-\d{3}$/u, 'Cenario');
  const layers = new Set(['unit', 'contract', 'authorization', 'integration', 'concurrency', 'adversarial']);
  const covered = new Set();
  const presentLayers = new Set();
  const specification = await readFile(path.join(root, 'docs/specs/BACKEND_V1.md'), 'utf8');
  for (const item of matrix.cases) {
    if (!layers.has(item.layer)) failures.push(`${item.id}: camada desconhecida`);
    presentLayers.add(item.layer);
    if (!Array.isArray(item.requirements) || item.requirements.length === 0) {
      failures.push(`${item.id}: requisito ausente`);
      continue;
    }
    for (const id of item.requirements) {
      if (!requirements.has(id)) failures.push(`${item.id}: referencia desconhecida ${id}`);
      covered.add(id);
    }
    if (typeof item.scenario !== 'string' || !item.scenario.trim()) failures.push(`${item.id}: cenario vazio`);
    if (typeof item.expected !== 'string' || !item.expected.trim()) failures.push(`${item.id}: resultado esperado vazio`);
    if (item.status !== 'PLANNED') {
      failures.push(`${item.id}: esta matriz planeja cenarios; evidencia de execucao deve ser registrada separadamente`);
    }
  }
  for (const requirement of requirements) {
    if (!covered.has(requirement)) failures.push(`${requirement}: nenhum cenario planejado`);
    if (!specification.includes(requirement)) failures.push(`${requirement}: nao encontrado na spec`);
  }
  for (const layer of layers) {
    if (!presentLayers.has(layer)) failures.push(`Nenhum cenario planejado na camada ${layer}`);
  }
  if (failures.length) {
    for (const failure of failures) process.stderr.write(`FAIL: ${failure}\n`);
    process.exitCode = 1;
    return;
  }
  process.stdout.write(`CHECK_DOCS_PASS: ${files.length} documentos, ${localLinks} links locais, ${requirements.size} requisitos e ${matrix.cases.length} cenarios planejados.\n`);
  process.stdout.write('BACKEND_RUNTIME: NOT_CHECKED. Este comando nao executa testes de back-end nem valida links externos.\n');
}

main().catch((error) => {
  process.stderr.write(`CHECK_DOCS_FAIL: ${error.message}\n`);
  process.exitCode = 1;
});
