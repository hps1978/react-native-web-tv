import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const packageDir = path.resolve(__dirname, '..');

const INPUT_JSON = path.join(packageDir, 'dist', 'benchmark-results.json');
const INPUT_MD = path.join(packageDir, 'dist', 'benchmark-results.md');
const BASELINES_DIR = path.join(packageDir, 'baselines');

function parseArgs(argv) {
  const args = {
    name: null
  };

  argv.forEach((arg) => {
    if (arg.startsWith('--name=')) {
      args.name = arg.slice('--name='.length).trim();
    }
  });

  return args;
}

function safeName(value) {
  const raw = String(value || '').trim();
  if (!raw) {
    return null;
  }
  return raw
    .replace(/[^a-zA-Z0-9._-]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);
}

function defaultBaselineName(report) {
  const generated = report?.generatedAt || new Date().toISOString();
  const stamp = generated
    .replace(/[:]/g, '-')
    .replace(/[.]/g, '-')
    .replace('T', '_')
    .replace('Z', '');
  return `baseline_${stamp}`;
}

function average(values) {
  if (!Array.isArray(values) || values.length === 0) {
    return 0;
  }
  return values.reduce((sum, value) => sum + Number(value || 0), 0) / values.length;
}

function summarize(report) {
  const grouped = new Map();
  const results = Array.isArray(report.results) ? report.results : [];

  results.forEach((result) => {
    const key = `${result.benchmarkName}:::${result.libraryName}`;
    if (!grouped.has(key)) {
      grouped.set(key, {
        benchmarkName: result.benchmarkName,
        libraryName: result.libraryName,
        libraryVersion: result.libraryVersion || '',
        means: [],
        scripting: [],
        layout: [],
        stdDev: []
      });
    }
    const group = grouped.get(key);
    group.means.push(Number(result.mean || 0));
    group.scripting.push(Number(result.meanScripting || 0));
    group.layout.push(Number(result.meanLayout || 0));
    group.stdDev.push(Number(result.stdDev || 0));
  });

  return Array.from(grouped.values())
    .map((group) => {
      const mean = average(group.means);
      const scripting = average(group.scripting);
      const layout = average(group.layout);
      return {
        benchmarkName: group.benchmarkName,
        libraryName: group.libraryName,
        libraryVersion: group.libraryVersion,
        mean,
        meanLayout: layout,
        meanScripting: scripting,
        jsShare: mean > 0 ? (scripting / mean) * 100 : 0,
        layoutShare: mean > 0 ? (layout / mean) * 100 : 0,
        stdDev: average(group.stdDev)
      };
    })
    .sort((a, b) => a.benchmarkName.localeCompare(b.benchmarkName));
}

function run() {
  const args = parseArgs(process.argv.slice(2));

  if (!fs.existsSync(INPUT_JSON) || !fs.existsSync(INPUT_MD)) {
    throw new Error(
      'Missing benchmark outputs. Run "npm run benchmark:run" (or matrix mode) first.'
    );
  }

  const report = JSON.parse(fs.readFileSync(INPUT_JSON, 'utf8'));
  const name = safeName(args.name) || defaultBaselineName(report);
  const targetDir = path.join(BASELINES_DIR, name);

  if (fs.existsSync(targetDir)) {
    throw new Error(`Baseline already exists: ${targetDir}`);
  }

  fs.mkdirSync(targetDir, { recursive: true });

  const outputJson = path.join(targetDir, 'benchmark-results.json');
  const outputMd = path.join(targetDir, 'benchmark-results.md');
  const outputSummary = path.join(targetDir, 'summary.json');
  const outputMeta = path.join(targetDir, 'baseline-meta.json');

  fs.copyFileSync(INPUT_JSON, outputJson);
  fs.copyFileSync(INPUT_MD, outputMd);

  const summary = {
    baseline: name,
    generatedAt: report.generatedAt || null,
    savedAt: new Date().toISOString(),
    config: report.config || null,
    environment: report.environment || null,
    benchmarks: summarize(report)
  };
  fs.writeFileSync(outputSummary, `${JSON.stringify(summary, null, 2)}\n`);

  const meta = {
    baseline: name,
    savedAt: summary.savedAt,
    sourceFiles: {
      json: path.relative(packageDir, INPUT_JSON),
      markdown: path.relative(packageDir, INPUT_MD)
    }
  };
  fs.writeFileSync(outputMeta, `${JSON.stringify(meta, null, 2)}\n`);

  console.log(`Saved baseline: ${name}`);
  console.log(`Location: ${targetDir}`);
  console.log(`Files:`);
  console.log(`  - ${outputJson}`);
  console.log(`  - ${outputMd}`);
  console.log(`  - ${outputSummary}`);
  console.log(`  - ${outputMeta}`);
}

run();
