# AI Agent Instructions for react-native-web-tv

## Project Overview

This monorepo is a React Native for Web fork with TV-focused behavior and APIs.

Core publish target:
- `@hps1978/react-native-web-tv` from `packages/react-native-web`

Supporting workspaces:
- `packages/babel-plugin-react-native-web`
- `packages/react-native-web-docs`
- `packages/react-native-web-examples`
- `packages/benchmarks`
- `packages/dom-event-testing-library`

## Branch and Release Model

- `upstream-mirror`: clean upstream sync branch
- `tv-main`: active development branch for TV work
- `master`: release branch

Patch queue scripts are expected to use `upstream-mirror` and `tv-main`.
Release script is expected to run from `master`.

## High-Value Paths

- `packages/react-native-web/src/exports/` - RNW component/API exports
- `packages/react-native-web/src/exports/TV/` - TV-specific exports
- `packages/react-native-web/src/modules/SpatialManager/` - Spatial navigation manager
- `packages/babel-plugin-react-native-web/src/` - Babel transform implementation
- `packages/react-native-web-examples/pages/` - runnable examples
- `configs/` - shared Babel/Jest/ESLint/Flow config

## TV Features in This Fork

- `Platform.isTV` is currently forced `true` in this fork.
- TV exports include `TVFocusGuideView`, `TVEventHandler`, `TVEventControl`, `TVTextScrollView`, and `useTVEventHandler`.
- TV focus props include `tvFocusable`, `isTVSelectable`, `hasTVPreferredFocus`, `autoFocus`, `trapFocus*`, and `nextFocus*` props.
- Spatial navigation is implemented via `SpatialManager` with a forked `@bbc/tv-lrud-spatial` dependency source.

## Commands

From repo root:

```bash
npm install
npm run build
npm run test
```

Workspace-specific (prefer path-based `-w` selectors):

```bash
npm run dev -w packages/react-native-web
npm run dev -w packages/react-native-web-examples
npm run dev -w packages/react-native-web-docs
```

Patch workflow:

```bash
npm run patches:check
npm run patches:export
npm run patches:verify
npm run patches:replay -- --patch-dir patches/<series-folder>
```

## Quality Standards

- Flow-typed source (`// @flow` where required)
- ESLint + Prettier must pass
- Add/update tests for behavior changes, especially TV focus/navigation paths
- Keep changes scoped; avoid broad unrelated refactors

## Notes for Agents

- Do not reference planning files that are not present in this repo.
- Prefer concrete, existing file paths in guidance and code references.
- Keep docs and scripts aligned with branch model and package names.
