# Benchmarks

This package benchmarks rendering/style performance scenarios and does not
currently include dedicated TV spatial-navigation benchmarks.

## Why benchmarks is not a workspace package

The benchmarks package is intentionally kept out of the root npm workspaces.

This is done to keep release packages clean and predictable:

- `react-native-web-tv` and `babel-plugin-react-native-web-tv` must remain
	releasable without benchmark-only instrumentation in source.
- Benchmark runs need to apply internal profiling changes temporarily, without
	polluting workspace package source files.
- Workspace linking/hoisting can blur package boundaries during installs. A
	separate benchmark install makes the benchmark dependency graph explicit and
	stable.

In this setup, benchmark dependencies are installed from local file paths into
`packages/benchmarks/node_modules` as real directories (non-symlink installs),
then benchmark-only patches are applied there.

## Why benchmark patches are generated

Measurement instrumentation in RNW internals (for example `createDOMProps`,
`createElement`, `View`, and `StyleSheet`) is required for analysis but is not
part of release-ready runtime code.

Patch files are used so we can:

- keep benchmark instrumentation versioned and reviewable;
- reapply the same measurement layer after fresh installs;
- isolate benchmark-only changes to benchmark-local `node_modules`;
- update patches deliberately when RNW internals change across releases.

This keeps normal release flow and benchmark diagnostics decoupled: release
packages stay clean, while benchmarks can still run with deep internal metrics.

## Benchmark patch workflow

Benchmarks can run with optional measurement patches applied to the installed
`react-native-web-tv` and `babel-plugin-react-native-web-tv` copies inside this
package's `node_modules`.

Create/update patch files after editing installed package files:

```bash
npm run patch:create:rnw
npm run patch:create:plugin
```

These commands generate patches by comparing:

- clean source package folders (`../react-native-web`, `../babel-plugin-react-native-web`)
- installed benchmark copies in `node_modules`

Apply saved patch files before a benchmark run:

```bash
npm run patch:apply
```

`npm install` in this package runs `postinstall`, which automatically executes
`patch:apply` and reapplies any saved patch files.

Patch files are stored in `packages/benchmarks/patches/`.

Run benchmark package checks:

```bash
npm run verify
```

## Automated runs (headless)

You can run the benchmark suite and produce a machine-readable report:

```bash
cd packages/benchmarks
npm run benchmark:run
```

Run multiple repeats for a baseline pass:

```bash
cd packages/benchmarks
npm run benchmark:run:repeat5
```

Run the Layer 1 attribution matrix (host/view style/props/accessibility):

```bash
cd packages/benchmarks
npm run benchmark:run:matrix
```

Save the current benchmark outputs as a named baseline snapshot:

```bash
cd packages/benchmarks
npm run benchmark:baseline:save -- --name=layer1-matrix-2026-03-30
```

Custom options:

```bash
cd packages/benchmarks
npm run benchmark:run -- --repeat=3 --library=react-native-web --benchmarks="Mount deep tree,Mount wide tree,Update dynamic styles" --out=dist/benchmark-results.json
```

The command prints a tabular summary to stdout and writes JSON output to
`packages/benchmarks/dist/benchmark-results.json` by default.

It also writes a human-readable markdown report to
`packages/benchmarks/dist/benchmark-results.md` by default.

Baseline snapshots are stored under `packages/benchmarks/baselines/<name>/`
and include:

- `benchmark-results.json`
- `benchmark-results.md`
- `summary.json`
- `baseline-meta.json`

Each automated run also enables internal RNW profiling and includes aggregate
hotspot tables for the measured internals such as `View`, `createElement`,
`createDOMProps`, and `StyleSheet`.

When matrix benchmarks are present in a run, the markdown report includes an
"Attribution Matrix" section with side-by-side comparison and relative factors.

You can override the markdown output path:

```bash
cd packages/benchmarks
npm run benchmark:run -- --markdown=dist/my-report.md
```

To work on the benchmarks locally from monorepo root:

```
npm run dev -w packages/react-native-web
npm run build -w benchmarks
open ./packages/benchmarks/dist/index.html
```

Automated benchmark runs rebuild `packages/react-native-web` first so benchmark
results reflect current RNW source changes.

## Notes

These benchmarks are approximations of extreme cases that libraries may
encounter. Their purpose is to provide an early-warning signal for performance
regressions. Each test report includes the mean and standard deviation of the
timings, and approximations of the time spent in scripting (S) and layout (L).

The components used in the render benchmarks are simple enough to be
implemented by multiple UI or style libraries. The benchmark implementations
and the features of the style libraries are _only approximately equivalent in
functionality_.

No benchmark will run for more than 20 seconds.

### Mount deep/wide tree

These cases look at the performance of mounting and rendering large trees of
elements that use static styles.

### Update dynamic styles

This case looks at the performance of repeated style updates to a large mounted
tree. Some libraries choose to inject new styles for each "dynamic style",
whereas others choose to use inline styles. Libraries without built-in support
for dynamic styles (i.e., they rely on user-authored inline styles) are not
included.

## Example results

### MacBook Pro (2011)

MacBook Pro (13-inch, Early 2011); 2.3 GHz Intel Core i5; 8 GB 1333 MHz DDR3 RAM. Google Chrome 72.

Typical render timings: mean ± standard deviations.

| Implementation                        | Mount deep tree (ms) | Mount wide tree (ms) | Dynamic update (ms) |
| :--- | ---: | ---: | ---: |
| `css-modules`                         |     `23.41` `±03.06` |     `35.38` `±06.41` |                   - |
| `react-native-web@0.11.0`             |     `28.37` `±04.39` |     `41.50` `±05.75` |    `23.13` `±03.51` |
| `inline-styles`                       |     `66.19` `±06.31` |    `104.22` `±10.22` |    `09.96` `±02.76` |

### Moto G4

Moto G4 (Android 7); Octa-core (4x1.5 GHz & 4x1.2 Ghz); 2 GB RAM. Google Chrome 72.

Typical render timings: mean ± standard deviations.

| Implementation                        | Mount deep tree (ms) | Mount wide tree (ms) | Dynamic update (ms) |
| :--- | ---: | ---: | ---: |
| `css-modules`                         |     `71.33` `±09.68` |    `101.36` `±12.36` |                   - |
| `react-native-web@0.11.0`             |     `83.65` `±12.40` |    `123.59` `±14.40` |    `75.41` `±07.74` |
| `inline-styles`                       |    `188.35` `±17.69` |    `282.35` `±22.48` |    `28.10` `±06.87` |
