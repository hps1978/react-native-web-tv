import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { chromium } from 'playwright';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const packageDir = path.resolve(__dirname, '..');
const distIndexPath = path.join(packageDir, 'dist', 'index.html');

const DEFAULT_BENCHMARKS = [
  'Mount deep tree',
  'Mount wide tree',
  'Update dynamic styles'
];

const ATTRIBUTION_MATRIX_BENCHMARKS = [
  'Update host styles',
  'Update host DOM props',
  'Update host accessibility props',
  'Update host props',
  'Update view styles',
  'Update view props'
];

const KEY_PROFILE_LABELS = [
  'View.render',
  'View.pickProps',
  'createElement.total',
  'createElement.createDOMProps',
  'createElement.React.createElement',
  'createElement.localeProvider',
  'createDOMProps.total',
  'createDOMProps.accessibilityProps',
  'createDOMProps.dataSetProps',
  'createDOMProps.focusProps',
  'createDOMProps.StyleSheet',
  'createDOMProps.styleProps',
  'createDOMProps.propsToAriaRole',
  'createDOMProps.tvProps',
  'createDOMProps.otherProps',
  'StyleSheet.customStyleq',
  'StyleSheet.customStyleq.cacheHit',
  'StyleSheet.customStyleq.preprocess',
  'StyleSheet.localizeStyle',
  'StyleSheet.inline',
  'StyleSheet.resolve'
];

function round(value) {
  return Number(value || 0).toFixed(2);
}

function average(values) {
  if (!Array.isArray(values) || values.length === 0) {
    return 0;
  }
  return values.reduce((sum, value) => sum + Number(value || 0), 0) / values.length;
}

function median(values) {
  if (!Array.isArray(values) || values.length === 0) {
    return 0;
  }
  const sorted = values.map((value) => Number(value || 0)).sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  if (sorted.length % 2 === 0) {
    return (sorted[middle - 1] + sorted[middle]) / 2;
  }
  return sorted[middle];
}

function mergeProfileRuns(runs) {
  const aggregated = new Map();

  runs.forEach((run) => {
    const entries = Array.isArray(run.benchmarkProfile) ? run.benchmarkProfile : [];
    entries.forEach((entry) => {
      const label = entry.label;
      if (!label) {
        return;
      }

      if (!aggregated.has(label)) {
        aggregated.set(label, {
          label,
          calls: 0,
          totalTime: 0,
          maxTime: 0
        });
      }

      const aggregate = aggregated.get(label);
      aggregate.calls += Number(entry.calls || 0);
      aggregate.totalTime += Number(entry.totalTime || 0);
      aggregate.maxTime = Math.max(aggregate.maxTime, Number(entry.maxTime || 0));
    });
  });

  return Array.from(aggregated.values())
    .map((entry) => ({
      ...entry,
      avgTime: entry.calls > 0 ? entry.totalTime / entry.calls : 0
    }))
    .sort((a, b) => b.totalTime - a.totalTime);
}

function totalScriptingBudget(runs) {
  return runs.reduce(
    (sum, run) => sum + Number(run.meanScripting || 0) * Number(run.sampleCount || 0),
    0
  );
}

function selectProfileEntries(profileSummary, limit = 8) {
  const selected = [];
  const used = new Set();

  profileSummary.slice(0, limit).forEach((entry) => {
    selected.push(entry);
    used.add(entry.label);
  });

  KEY_PROFILE_LABELS.forEach((label) => {
    if (used.has(label)) {
      return;
    }
    const entry = profileSummary.find((item) => item.label === label);
    if (entry) {
      selected.push(entry);
      used.add(label);
    }
  });

  return selected;
}

function groupResults(results) {
  const grouped = new Map();

  results.forEach((result) => {
    const key = `${result.benchmarkName}:::${result.libraryName}:::${result.libraryVersion || ''}`;
    if (!grouped.has(key)) {
      grouped.set(key, {
        benchmarkName: result.benchmarkName,
        benchmarkMetadata: result.benchmarkMetadata || null,
        libraryName: result.libraryName,
        libraryVersion: result.libraryVersion || '',
        runs: []
      });
    }
    grouped.get(key).runs.push(result);
  });

  return Array.from(grouped.values()).map((group) => {
    const meanValues = group.runs.map((run) => run.mean);
    const scriptingValues = group.runs.map((run) => run.meanScripting);
    const layoutValues = group.runs.map((run) => run.meanLayout);
    const stdDevValues = group.runs.map((run) => run.stdDev);
    const scriptingBudget = totalScriptingBudget(group.runs);
    const profileSummary = mergeProfileRuns(group.runs).map((entry) => ({
      ...entry,
      scriptingShare: percentage(entry.totalTime, scriptingBudget)
    }));

    return {
      ...group,
      profileSummary,
      summary: {
        layoutPercentage: percentage(average(layoutValues), average(meanValues)),
        runCount: group.runs.length,
        meanAverage: average(meanValues),
        meanMedian: median(meanValues),
        meanMin: Math.min(...meanValues),
        meanMax: Math.max(...meanValues),
        scriptingPercentage: percentage(average(scriptingValues), average(meanValues)),
        scriptingAverage: average(scriptingValues),
        scriptingBudget,
        layoutAverage: average(layoutValues),
        stdDevAverage: average(stdDevValues)
      }
    };
  });
}

function formatMetadata(metadata) {
  if (!metadata) {
    return null;
  }

  const parts = [];
  if (metadata.layer) parts.push(`layer ${metadata.layer}`);
  if (metadata.intent) parts.push(`intent ${metadata.intent}`);
  if (metadata.primitive) parts.push(`primitive ${metadata.primitive}`);
  if (metadata.nodeCount) parts.push(`nodes ${metadata.nodeCount}`);
  if (metadata.changedPropCountPerNode != null) {
    parts.push(`props/node ${metadata.changedPropCountPerNode}`);
  }
  if (metadata.changedStyleCountPerNode != null) {
    parts.push(`styles/node ${metadata.changedStyleCountPerNode}`);
  }

  return parts.join(' | ');
}

function normalizedMean(mean, metadata) {
  if (!metadata || !metadata.nodeCount) {
    return null;
  }

  return (Number(mean || 0) / metadata.nodeCount) * 100;
}

function percentage(part, whole) {
  const wholeNumber = Number(whole || 0);
  if (wholeNumber <= 0) {
    return 0;
  }
  return (Number(part || 0) / wholeNumber) * 100;
}

function parseArgs(argv) {
  const args = {
    libraryName: 'react-native-web',
    cpuThrottleRate: 1,
    repeat: 1,
    benchmarkNames: DEFAULT_BENCHMARKS,
    outFile: path.join(packageDir, 'dist', 'benchmark-results.json'),
    markdownFile: path.join(packageDir, 'dist', 'benchmark-results.md')
  };

  argv.forEach((arg) => {
    if (arg === '--matrix') {
      args.benchmarkNames = ATTRIBUTION_MATRIX_BENCHMARKS.slice();
      return;
    }
    if (arg.startsWith('--library=')) {
      args.libraryName = arg.slice('--library='.length);
      return;
    }
    if (arg.startsWith('--repeat=')) {
      const parsed = Number(arg.slice('--repeat='.length));
      if (Number.isFinite(parsed) && parsed > 0) {
        args.repeat = Math.floor(parsed);
      }
      return;
    }
    if (arg.startsWith('--cpu-throttle=')) {
      const parsed = Number(arg.slice('--cpu-throttle='.length));
      if (Number.isFinite(parsed) && parsed >= 1) {
        args.cpuThrottleRate = parsed;
      }
      return;
    }
    if (arg.startsWith('--benchmarks=')) {
      const value = arg.slice('--benchmarks='.length);
      const names = value
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean);
      if (names.length > 0) {
        args.benchmarkNames = names;
      }
      return;
    }
    if (arg.startsWith('--out=')) {
      const value = arg.slice('--out='.length).trim();
      if (value) {
        args.outFile = path.isAbsolute(value)
          ? value
          : path.resolve(packageDir, value);
      }
      return;
    }
    if (arg.startsWith('--markdown=')) {
      const value = arg.slice('--markdown='.length).trim();
      if (value) {
        args.markdownFile = path.isAbsolute(value)
          ? value
          : path.resolve(packageDir, value);
      }
    }
  });

  return args;
}

function toNameMap(groupedResults) {
  const map = new Map();
  groupedResults.forEach((group) => {
    if (!map.has(group.benchmarkName)) {
      map.set(group.benchmarkName, group);
    }
  });
  return map;
}

function createAttributionMatrix(nameMap) {
  const hasAll = ATTRIBUTION_MATRIX_BENCHMARKS.every((name) => nameMap.has(name));
  if (!hasAll) {
    return null;
  }

  const baseline = nameMap.get('Update host styles');
  const baselineMean = baseline?.summary?.meanAverage || 0;

  const rows = ATTRIBUTION_MATRIX_BENCHMARKS.map((name) => {
    const group = nameMap.get(name);
    const mean = group.summary.meanAverage;
    const scripting = group.summary.scriptingAverage;
    const layout = group.summary.layoutAverage;
    const normalized = normalizedMean(mean, group.benchmarkMetadata);
    const ratioToHostStyles = baselineMean > 0 ? mean / baselineMean : 0;

    return {
      jsPercentage: percentage(scripting, mean),
      layoutPercentage: percentage(layout, mean),
      name,
      mean,
      scripting,
      layout,
      normalized,
      ratioToHostStyles
    };
  });

  return {
    baselineName: 'Update host styles',
    rows
  };
}

function createMarkdownReport(output, groupedResults) {
  const lines = [];
  const nameMap = toNameMap(groupedResults);
  const matrix = createAttributionMatrix(nameMap);

  lines.push('# Benchmark Results');
  lines.push('');
  lines.push(`Generated: ${output.generatedAt}`);
  lines.push(`Browser: ${output.environment.browser} (${output.environment.mode})`);
  lines.push(`Library: ${output.config.libraryName}`);
  lines.push(`Repeats: ${output.config.repeat}`);
  lines.push('');
  lines.push('## Aggregate Summary');
  lines.push('');
  lines.push('| Benchmark | Runs | Mean Avg (ms) | Mean Median (ms) | Mean Min (ms) | Mean Max (ms) | Scripting Avg (ms) | JS Share | Layout Avg (ms) | Layout Share | StdDev Avg (ms) | Mean per 100 nodes (ms) |');
  lines.push('| :--- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |');

  groupedResults.forEach((group) => {
    const normalized = normalizedMean(
      group.summary.meanAverage,
      group.benchmarkMetadata
    );
    lines.push(
      `| ${group.benchmarkName} | ${group.summary.runCount} | ${round(group.summary.meanAverage)} | ${round(group.summary.meanMedian)} | ${round(group.summary.meanMin)} | ${round(group.summary.meanMax)} | ${round(group.summary.scriptingAverage)} | ${round(group.summary.scriptingPercentage)}% | ${round(group.summary.layoutAverage)} | ${round(group.summary.layoutPercentage)}% | ${round(group.summary.stdDevAverage)} | ${normalized == null ? '-' : round(normalized)} |`
    );
  });

  lines.push('');

  if (matrix) {
    lines.push('## Attribution Matrix');
    lines.push('');
    lines.push(`Baseline: ${matrix.baselineName}`);
    lines.push('');
    lines.push('| Benchmark | Mean (ms) | Scripting (ms) | JS Share | Layout (ms) | Layout Share | Mean per 100 nodes (ms) | Relative to host styles |');
    lines.push('| :--- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |');
    matrix.rows.forEach((row) => {
      lines.push(
        `| ${row.name} | ${round(row.mean)} | ${round(row.scripting)} | ${round(row.jsPercentage)}% | ${round(row.layout)} | ${round(row.layoutPercentage)}% | ${row.normalized == null ? '-' : round(row.normalized)} | ${round(row.ratioToHostStyles)}x |`
      );
    });
    lines.push('');
  }

  lines.push('');
  lines.push('## Per Run');
  lines.push('');

  groupedResults.forEach((group) => {
    lines.push(`### ${group.benchmarkName}`);
    lines.push('');
    if (group.benchmarkMetadata?.description) {
      lines.push(group.benchmarkMetadata.description);
      lines.push('');
    }
    const metadataText = formatMetadata(group.benchmarkMetadata);
    if (metadataText) {
      lines.push(`Metadata: ${metadataText}`);
      lines.push('');
    }
    if (group.profileSummary.length > 0) {
      const selectedProfileEntries = selectProfileEntries(group.profileSummary);
      lines.push('Internal hotspots (aggregate across runs; shares are relative to total scripting time and do not sum to 100% because timers overlap):');
      lines.push('');
      lines.push(`Total scripting budget: ${round(group.summary.scriptingBudget)} ms`);
      lines.push('');
      lines.push('| Label | Total (ms) | Share of Scripting | Avg/Call (ms) | Calls | Max (ms) |');
      lines.push('| :--- | ---: | ---: | ---: | ---: | ---: |');
      selectedProfileEntries.forEach((entry) => {
        lines.push(
          `| ${entry.label} | ${round(entry.totalTime)} | ${round(entry.scriptingShare)}% | ${round(entry.avgTime)} | ${entry.calls} | ${round(entry.maxTime)} |`
        );
      });
      lines.push('');
    }
    lines.push('| Run | Mean (ms) | StdDev (ms) | Scripting (ms) | JS Share | Layout (ms) | Layout Share | Samples |');
    lines.push('| ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |');
    group.runs.forEach((run) => {
      lines.push(
        `| ${run.run || 1} | ${round(run.mean)} | ${round(run.stdDev)} | ${round(run.meanScripting)} | ${round(percentage(run.meanScripting, run.mean))}% | ${round(run.meanLayout)} | ${round(percentage(run.meanLayout, run.mean))}% | ${run.sampleCount || 0} |`
      );
    });
    lines.push('');
  });

  return `${lines.join('\n')}\n`;
}

function printResults(results, groupedResults) {
  const nameMap = toNameMap(groupedResults);
  const matrix = createAttributionMatrix(nameMap);

  console.log('Benchmark results');
  console.log('=================');
  console.log('');

  groupedResults.forEach((group) => {
    const metadataText = formatMetadata(group.benchmarkMetadata);
    const normalized = normalizedMean(
      group.summary.meanAverage,
      group.benchmarkMetadata
    );

    console.log(group.benchmarkName);
    if (group.benchmarkMetadata?.description) {
      console.log(`  ${group.benchmarkMetadata.description}`);
    }
    if (metadataText) {
      console.log(`  ${metadataText}`);
    }
    console.log(`  runs: ${group.summary.runCount}`);
    console.log(
      `  mean avg/median/min/max: ${round(group.summary.meanAverage)} / ${round(group.summary.meanMedian)} / ${round(group.summary.meanMin)} / ${round(group.summary.meanMax)} ms`
    );
    console.log(
      `  scripting avg: ${round(group.summary.scriptingAverage)} ms (${round(group.summary.scriptingPercentage)}%) | layout avg: ${round(group.summary.layoutAverage)} ms (${round(group.summary.layoutPercentage)}%) | stddev avg: ${round(group.summary.stdDevAverage)} ms`
    );
    if (normalized != null) {
      console.log(`  normalized mean: ${round(normalized)} ms per 100 nodes`);
    }
    if (group.profileSummary.length > 0) {
      const selectedProfileEntries = selectProfileEntries(group.profileSummary, 5);
      console.log(
        `  internal hotspots (share of scripting budget ${round(group.summary.scriptingBudget)} ms; percentages overlap):`
      );
      selectedProfileEntries.forEach((entry) => {
        console.log(
          `    ${entry.label}: total ${round(entry.totalTime)} ms | scripting share ${round(entry.scriptingShare)}% | avg/call ${round(entry.avgTime)} ms | calls ${entry.calls} | max ${round(entry.maxTime)} ms`
        );
      });
    }
    group.runs.forEach((run) => {
      console.log(
        `    run ${run.run || 1}: mean ${round(run.mean)} ms, stddev ${round(run.stdDev)} ms, scripting ${round(run.meanScripting)} ms (${round(percentage(run.meanScripting, run.mean))}%), layout ${round(run.meanLayout)} ms (${round(percentage(run.meanLayout, run.mean))}%), samples ${run.sampleCount || 0}`
      );
    });
    console.log('');
  });

  console.log('Flat table');
  console.log('----------');
  const headers = ['Benchmark', 'Run', 'Mean', 'StdDev', 'Scripting', 'Layout', 'Samples'];
  console.log(headers.join('\t'));
  results.forEach((r) => {
    console.log(
      [
        r.benchmarkName,
        String(r.run || 1),
        round(r.mean),
        round(r.stdDev),
        round(r.meanScripting),
        round(r.meanLayout),
        String(r.sampleCount || 0)
      ].join('\t')
    );
  });

  if (matrix) {
    console.log('');
    console.log('Attribution matrix');
    console.log('------------------');
    console.log(`Baseline: ${matrix.baselineName}`);
    console.log('Benchmark\tMean\tScripting\tJSShare\tLayout\tLayoutShare\tPer100Nodes\tRelativeToHostStyles');
    matrix.rows.forEach((row) => {
      console.log(
        [
          row.name,
          `${round(row.mean)} ms`,
          `${round(row.scripting)} ms`,
          `${round(row.jsPercentage)}%`,
          `${round(row.layout)} ms`,
          `${round(row.layoutPercentage)}%`,
          row.normalized == null ? '-' : `${round(row.normalized)} ms`,
          `${round(row.ratioToHostStyles)}x`
        ].join('\t')
      );
    });
  }
}

async function run() {
  const args = parseArgs(process.argv.slice(2));

  if (!fs.existsSync(distIndexPath)) {
    throw new Error(
      `Missing build artifact: ${distIndexPath}. Run \"npm run build\" in packages/benchmarks first.`
    );
  }

  const expectedCount = args.benchmarkNames.length * args.repeat;
  const automationConfig = {
    enabled: true,
    libraryName: args.libraryName,
    cpuThrottleRate: args.cpuThrottleRate,
    profile: true,
    repeat: args.repeat,
    benchmarkNames: args.benchmarkNames
  };

  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  try {
    if (args.cpuThrottleRate > 1) {
      const session = await page.context().newCDPSession(page);
      await session.send('Emulation.setCPUThrottlingRate', {
        rate: args.cpuThrottleRate
      });
    }

    await page.addInitScript((cfg) => {
      window.__BENCHMARK_AUTOMATION__ = cfg;
      window.__RNW_BENCHMARK_PROFILING__ = cfg.profile === true;
    }, automationConfig);

    await page.goto(pathToFileURL(distIndexPath).toString(), {
      waitUntil: 'load'
    });

    const timeoutMs = Math.max(30000, expectedCount * 25000);
    await page.waitForFunction(
      (count) =>
        Array.isArray(window.__BENCHMARK_RESULTS__) &&
        window.__BENCHMARK_RESULTS__.length >= count,
      expectedCount,
      { timeout: timeoutMs }
    );

    const results = await page.evaluate(() => window.__BENCHMARK_RESULTS__);

    if (!Array.isArray(results) || results.length === 0) {
      throw new Error('Benchmark completed without results.');
    }

    const output = {
      generatedAt: new Date().toISOString(),
      environment: {
        browser: 'chromium',
        mode: 'headless',
        cpuThrottleRate: args.cpuThrottleRate
      },
      config: automationConfig,
      results
    };

    const groupedResults = groupResults(results);
    const markdownReport = createMarkdownReport(output, groupedResults);

    fs.mkdirSync(path.dirname(args.outFile), { recursive: true });
    fs.writeFileSync(args.outFile, `${JSON.stringify(output, null, 2)}\n`);
    fs.writeFileSync(args.markdownFile, markdownReport);

    printResults(results, groupedResults);
    console.log(`\nSaved JSON report: ${args.outFile}`);
    console.log(`Saved Markdown report: ${args.markdownFile}`);
  } finally {
    await browser.close();
  }
}

run().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
