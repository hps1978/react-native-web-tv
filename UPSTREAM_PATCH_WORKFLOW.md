# Upstream Sync and Patch Queue Workflow

This repository follows a patch-queue model for keeping TV changes maintainable while tracking upstream `react-native-web`.

## Branch model

- `upstream-mirror`: clean branch that mirrors upstream tags/commits only.
- `tv-main`: branch where TV-specific work is developed and released.

## Versioning convention

Releases from this fork use the upstream React Native Web version as the base and append a TV-specific suffix:

```text
<upstream-version>-tv.<tv-release>
```

Example:

```text
0.21.2-tv.1
```

This keeps fork releases clearly tied to the upstream base while staying semver-compatible for npm publishing.

## One-time setup

```bash
# In this repo root

git remote add upstream https://github.com/necolas/react-native-web.git
git fetch upstream --tags
```

## Preflight checks

Run preflight before export/replay to validate remotes, branches, refs, and patch paths.

```bash
# Basic environment checks (upstream, tv-main, upstream-mirror)
npm run patches:check

# Validate a specific export range
npm run patches:check -- --base <upstream-tag-or-commit> --head tv-main

# Validate a patch folder before replay
npm run patches:check -- --patch-dir patches/<series-folder>
```

## Export patch series from TV branch

Use this whenever you want a portable series of your TV commits relative to an upstream point.

```bash
npm run patches:export
```

This creates patch files under `patches/<base>-to-<head>/` with 12 mutually exclusive patches:
- `01-new-files.patch` — all new files (tests excluded)
- `02–07` — existing changes per package (tests excluded)
- `08` — root config and CI
- `09` — root docs
- `10` — lockfiles
- `11` — new test files only
- `12` — modified test files only

## Upgrade to a newer upstream tag

1. Move `upstream-mirror` to the new upstream tag.
2. Create a fresh integration branch from `upstream-mirror`.
3. Replay your patch series.
4. Resolve conflicts once; continue replay.
5. Run tests and build.
6. Replace old TV branch when ready.

Suggested commands:

```bash
# 1) Sync upstream refs
git fetch upstream --tags

# 2) Prepare upstream mirror
git checkout -B upstream-mirror <new-upstream-tag>

# Optional: verify upstream-mirror pointer
git show -s --format='%h %ad %s' --date=short upstream-mirror

# 3) Create integration branch
git checkout -b integration/<new-upstream-tag>

# 4) Export fresh patches from tv-main (creates patches/<base>-to-<head>/)
npm run patches:export

# 5) Replay prior patch series
npm run patches:replay -- --patch-dir patches/<base>-to-<head>

# If conflicts happen:
# - Resolve files
# - git add <resolved-files>
# - git am --continue
# To abort replay:
# - git am --abort

# 6) Validate
npm test
npm run build
```

## Conflict handling rules

- Keep commits focused and atomic in TV branch so replay is easier.
- Resolve each conflict once during `git am`; avoid ad-hoc manual cherry-picking.
- After successful integration, export a new patch series against the new upstream base.

## Notes

- `patches:replay` requires a clean working tree.
- `patches:replay` uses `git am --3way` by default for better conflict recovery.
- `patches:check -- --require-clean` enforces a clean working tree preflight when needed.
- Keep patch directories in source control if you want reproducible upgrades.
