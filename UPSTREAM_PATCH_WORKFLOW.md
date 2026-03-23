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
0.21.2-tv.0
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

# Validate a patch archive before replay (with checksum)
npm run patches:check -- --patch-archive patches/<series-folder>.tar.gz --checksum patches/<series-folder>.tar.gz.sha256
```


## Export patch series from TV branch

Use this whenever you want a portable series of your TV commits relative to an upstream point.

```bash
npm run patches:export
```

This creates:
- Patch files under `patches/<base>-to-<head>/` (12 mutually exclusive patches)
- A compressed archive: `patches/<base>-to-<head>.tar.gz`
- A SHA256 checksum: `patches/<base>-to-<head>.tar.gz.sha256`

Details of patch files:

- `01-new-files.patch` — all new files (tests and patch workflow scripts excluded)
- `02–07` — existing changes per package (tests excluded)
- `08` — root config and CI
- `09` — root docs
- `10` — lockfiles
- `11` — new test files only
- `12` — modified test files only

**Patch workflow scripts (`scripts/tvPatchQueueReplay.js`, `scripts/tvPatchQueueCheck.js`, `scripts/patchChecksum.js`) are intentionally excluded from the patch set.** These must be copied manually into the target branch for patch replay, as including them in the patch set causes conflicts if already present.

The export script validates patch coverage:
- For new files, the patch count must match the git diff count, except for the number of intentionally excluded patch workflow scripts (the script will fail if the difference does not match the number of exclusions).


## Upgrade to a newer upstream tag

---

### Example: Step-by-step patch replay workflow

Suppose you want to upgrade to upstream tag `v0.21.2` and replay your TV patches. Here is an exact sequence of commands:

```bash
# 1. Fetch latest upstream tags
git fetch upstream --tags

# 2. Move upstream-mirror to the new upstream tag (force update)
git checkout -B upstream-mirror v0.21.2

# 3. Create a new integration branch from upstream-mirror
git checkout -b integration/v0.21.2

# 4. Export a fresh patch series from tv-main (if not already done)
git checkout tv-main
npm run patches:export

# 5. Switch back to your integration branch
git checkout integration/v0.21.2

# 6. Replay the patch series (from archive is recommended)
npm run patches:replay -- --patch-archive patches/<base>-to-<head>.tar.gz --checksum patches/<base>-to-<head>.tar.gz.sha256

#    (Replace <base> and <head> with the actual short SHAs shown in the patches folder)

# 7. If you hit conflicts:
#    - Resolve the conflicted files manually
#    - git add <resolved-files>
#    - Re-run the replay command to continue applying remaining patches
#    - To abort and reset: git reset --hard && git clean -fd

# 8. When all patches apply cleanly, run tests and build
npm test
npm run build

# 9. When satisfied, you can fast-forward or force-update tv-main if this is the new base
#    (optional, depending on your workflow)
```

---

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

# 5) Replay prior patch series (choose one):
#   From directory:
npm run patches:replay -- --patch-dir patches/<base>-to-<head>
#   From archive (recommended):
npm run patches:replay -- --patch-archive patches/<base>-to-<head>.tar.gz --checksum patches/<base>-to-<head>.tar.gz.sha256

# Patch replay now uses `git apply` (not `git am`). If conflicts happen:
# - Resolve files manually
# - git add <resolved-files>
# - Continue replay (re-run the replay script to apply remaining patches)
# To abort replay:
# - git reset --hard && git clean -fd

# 6) Validate
npm test
npm run build
```

## Conflict handling rules

- Keep commits focused and atomic in TV branch so replay is easier.
- Resolve each conflict once during patch replay; avoid ad-hoc manual cherry-picking.
- After successful integration, export a new patch series against the new upstream base.

## Notes

- `patches:export` now creates a compressed archive (`.tar.gz`) and checksum for each patch series.
- `patches:replay`, `patches:verify`, and `patches:check` accept either a patch directory or a patch archive (`--patch-archive ...tar.gz --checksum ...sha256`).
- `patches:replay` requires a clean working tree.
- `patches:replay` uses `git apply` for patch replay (no longer `git am`).
- `patches:check -- --require-clean` enforces a clean working tree preflight when needed.
- Patch archives are much smaller and avoid GitHub LFS warnings.

## Manual Patch Replay Test (Validation)

To validate that your patch series can be replayed cleanly, follow these exact steps:

### 1. Preparation
- Ensure your working tree is clean (no uncommitted changes).
- Identify the patch archive and checksum you want to test (e.g., patches/a9de220b-to-<tv-main-sha>.tar.gz).

### 2. Create Clean Test Branches
```sh
# Create a test branch from upstream-mirror (patch base)
git checkout upstream-mirror
git pull
git checkout -b patch-replay-upstream-test

# Create a test branch from tv-main (patch head, for comparison)
git checkout tv-main
git pull
git checkout -b patch-replay-tv-main-test
```

### 3. Copy Required Scripts and Patch Archive
From the root of your repo, copy the following into the patch-replay-upstream-test branch:
- scripts/tvPatchQueueReplay.js
- scripts/tvPatchQueueCheck.js
- scripts/patchChecksum.js
- patches/<patch-archive>.tar.gz
- patches/<patch-archive>.tar.gz.sha256

Example:
```sh
git checkout patch-replay-upstream-test
cp scripts/tvPatchQueueReplay.js scripts/tvPatchQueueCheck.js scripts/patchChecksum.js patches/a9de220b-to-<tv-main-sha>.tar.gz patches/a9de220b-to-<tv-main-sha>.tar.gz.sha256 .
git add tvPatchQueueReplay.js tvPatchQueueCheck.js patchChecksum.js a9de220b-to-<tv-main-sha>.tar.gz a9de220b-to-<tv-main-sha>.tar.gz.sha256
git commit -m "Add patch replay scripts and patch archive for test"
```

### 4. Run Patch Replay
```sh
node tvPatchQueueReplay.js --patch-archive a9de220b-to-<tv-main-sha>.tar.gz --checksum a9de220b-to-<tv-main-sha>.tar.gz.sha256
```
- The script should apply all patches cleanly.
- If there are errors, resolve them and re-run as needed.

### 5. Validate Patch Replay
- Compare the replayed branch to the tv-main test branch:
```sh
git checkout patch-replay-tv-main-test
git pull
git checkout patch-replay-upstream-test
git diff patch-replay-tv-main-test
```
- There should be no differences (or only expected, intentional ones).

### 6. Cleanup
```sh
git checkout tv-main
git branch -D patch-replay-upstream-test
git branch -D patch-replay-tv-main-test
```

**Notes:**
- Always run these steps from the repo root.
- Do not create extra subdirectories for the scripts or patch archive.
- Commit the scripts and patch archive before running the replay script to ensure a clean working tree.
