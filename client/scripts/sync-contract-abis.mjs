import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const CLIENT_ROOT = path.resolve(__dirname, '..');
const REPO_ROOT = path.resolve(CLIENT_ROOT, '..');
const ASSETS_DIR = path.join(REPO_ROOT, 'assets');
const ABI_OUTPUT_DIR = path.join(CLIENT_ROOT, 'config', 'abis');
const ABI_INDEX_FILE = path.join(CLIENT_ROOT, 'config', 'contractAbis.ts');

const ABI_TARGETS = [
  {
    constName: 'DQPROJECT_ABI',
    sourceFile: 'DQMCore.txt',
    outputFile: 'dqmCore.ts',
    importName: 'dqProjectAbi',
  },
  {
    constName: 'DQADMIN_ABI',
    sourceFile: 'DQMAdmin.txt',
    outputFile: 'dqmAdmin.ts',
    importName: 'dqAdminAbi',
  },
  {
    constName: 'DQSTAKE_ABI',
    sourceFile: 'DQMiningStakeCore.txt',
    outputFile: 'dqMiningStakeCore.ts',
    importName: 'dqStakeAbi',
  },
  {
    constName: 'DQSTAKEMINE_ABI',
    sourceFile: 'DQMiningStakeMine.txt',
    outputFile: 'dqMiningStakeMine.ts',
    importName: 'dqStakeMineAbi',
  },
  {
    constName: 'DQSTAKEVAULT_ABI',
    sourceFile: 'DQMiningStakeVault.txt',
    outputFile: 'dqMiningStakeVault.ts',
    importName: 'dqStakeVaultAbi',
  },
  {
    constName: 'DQTOKEN_ABI',
    sourceFile: 'DQT.txt',
    outputFile: 'dqt.ts',
    importName: 'dqTokenAbi',
  },
  {
    constName: 'DQCARD_ABI',
    sourceFile: 'DQC.txt',
    outputFile: 'dqc.ts',
    importName: 'dqCardAbi',
  },
];

function extractJsonArray(raw, fileName) {
  const start = raw.indexOf('[');
  if (start === -1) {
    throw new Error(`ABI array not found: ${fileName}`);
  }

  let depth = 0;
  let inString = false;
  let isEscaped = false;

  for (let index = start; index < raw.length; index++) {
    const char = raw[index];

    if (inString) {
      if (isEscaped) {
        isEscaped = false;
        continue;
      }

      if (char === '\\') {
        isEscaped = true;
        continue;
      }

      if (char === '"') {
        inString = false;
      }

      continue;
    }

    if (char === '"') {
      inString = true;
      continue;
    }

    if (char === '[') {
      depth++;
      continue;
    }

    if (char === ']') {
      depth--;
      if (depth === 0) {
        return raw.slice(start, index + 1);
      }
    }
  }

  throw new Error(`ABI array not terminated: ${fileName}`);
}

function loadAbiFromAsset(fileName) {
  const filePath = path.join(ASSETS_DIR, fileName);
  const raw = fs.readFileSync(filePath, 'utf8');
  const parsed = JSON.parse(extractJsonArray(raw, fileName));

  if (!Array.isArray(parsed)) {
    throw new Error(`Invalid ABI payload: ${fileName}`);
  }

  return parsed;
}

function writeAbiModule(target, abi) {
  const content = [
    `// Auto-generated from assets/${target.sourceFile}`,
    `const abi = ${JSON.stringify(abi, null, 2)};`,
    '',
    'export default abi;',
    '',
  ].join('\n');

  fs.writeFileSync(path.join(ABI_OUTPUT_DIR, target.outputFile), content, 'utf8');
}

function writeAbiIndex(targets) {
  const importLines = targets.map(
    (target) => `import ${target.importName} from './abis/${target.outputFile.replace(/\.ts$/, '')}';`
  );

  const exportLines = [
    '/**',
    ' * Auto-generated ABI exports from assets/*.txt.',
    ' * Run: pnpm -C client run sync:abis',
    ' */',
    ...targets.map((target) => `export const ${target.constName} = ${target.importName};`),
    '',
  ];

  fs.writeFileSync(ABI_INDEX_FILE, [...importLines, '', ...exportLines].join('\n'), 'utf8');
}

function main() {
  fs.mkdirSync(ABI_OUTPUT_DIR, { recursive: true });

  for (const target of ABI_TARGETS) {
    const abi = loadAbiFromAsset(target.sourceFile);
    writeAbiModule(target, abi);
  }

  writeAbiIndex(ABI_TARGETS);

  console.log(`Synced ${ABI_TARGETS.length} ABI files into client/config/abis`);
}

main();
