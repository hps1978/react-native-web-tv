# React Native Web for TV monorepo

This repository is a customized React Native for Web fork that adds TV-first APIs and focus navigation for web-based TV platforms.

It is intended for TV browser runtimes, while keeping React Native for Web compatibility for shared app code.

It is derived from the [React Native Web](https://github.com/necolas/react-native-web) project. Thanks to the RNW project for the foundation this fork builds on while extending it with TV-specific behavior, APIs, and focus/navigation support.

## What's included in this fork

- TV spatial navigation via a forked `@bbc/tv-lrud-spatial` implementation from [hps1978/lrud-spatial-rnw](https://github.com/hps1978/lrud-spatial-rnw), integrated through `SpatialManager`.
- TV exports from `react-native-web`:
  - `TVFocusGuideView`
  - `TVEventHandler`
  - `TVEventControl`
  - `TVTextScrollView`
  - `useTVEventHandler`
  - `TVRemoteEvent` (type)
- TV focus and directional props available in core components (for example `View`, `Pressable`, `TextInput`):
  - `tvFocusable`, `isTVSelectable`
  - `hasTVPreferredFocus`, `autoFocus`
  - `trapFocusUp`, `trapFocusDown`, `trapFocusLeft`, `trapFocusRight`
  - `nextFocusUp`, `nextFocusDown`, `nextFocusLeft`, `nextFocusRight`, `nextFocusForward`: To be implemented.
  - `destinations` (for `TVFocusGuideView` and focus guide flows)
- TV-enabled list/focus integrations in `VirtualizedList` pathways.

Current implementation notes:

- `Platform.isTV` is forced to `true` for TV first support.
- `TVEventControl` API surface exists for compatibility; methods currently warn as not implemented on web.

## Monorepo structure

- `.github`: GitHub workflows and templates.
- `configs`: shared Babel/Jest/ESLint/Flow configuration.
- `packages`: workspace packages (`react-native-web`, docs, examples, plugin, etc.).
- `scripts`: repository scripts (release/build helpers).

## Quick start

From repository root:

```bash
npm install
npm run build
npm run test
```

To consume this fork while keeping the dependency key as `react-native-web`, install with npm alias:

```bash
npm install react-native-web@npm:@hps1978/react-native-web-tv@<version>
```

## Versioning convention

Published TV fork versions keep the upstream React Native Web version as the base and append a TV-specific semver suffix:

```text
<upstream-version>-tv.<tv-release>
```

Example:

```text
0.21.2-tv.0
```

Notes:

- `0.21.2` stays aligned with the upstream RNW version.
- `tv.0` is the initial fork-specific release for that upstream base.
- The suffix uses `-tv.<n>` rather than `_n` so published package versions remain semver-compatible with npm.

Useful workspace-specific commands:

```bash
# Core package
npm run dev -w packages/react-native-web

# Examples app
npm run dev -w packages/react-native-web-examples

# Docs site (Eleventy)
npm run dev -w packages/react-native-web-docs
npm run build -w packages/react-native-web-docs
```

## Upstream patch queue workflow

This fork uses a patch-queue model for upstream upgrades.

- Full guide: `UPSTREAM_PATCH_WORKFLOW.md`
- Preflight checks: `npm run patches:check`
- Export grouped TV patches: `npm run patches:export`
- Replay patches onto an integration branch: `npm run patches:replay -- --patch-dir patches/<series-folder>`

## TV spatial navigation configuration

Configure TV behavior before `AppRegistry.runApplication()` using `window.appConfig`.

```html
<script>
  window.appConfig = {
    keyMap: {
      // Optional custom key mappings for TV remotes.
      // Add Back/Menu keyCodes per platform as needed.
      Back: 461,
      Menu: 10009
    },
    keydownThrottleMs: 0,
    focusConfig: {
      // 'default' or 'AlignLeft'
      mode: 'default'
    },
    scrollConfig: {
      leftEdgePaddingPx: 10,
      topEdgePaddingPx: 15,
      scrollThrottleMs: 80, // currently not implemented
      smoothScrollEnabled: true,
      scrollAnimationDurationMsVertical: 0,
      scrollAnimationDurationMsHorizontal: 0
    }
  };
</script>
```

Supported fields:

- `keyMap`: map remote keys to navigation/back/menu behavior.
- `keydownThrottleMs`: minimum delay between keydown events.
- `focusConfig.mode`: focus-scroll behavior (`default` or `AlignLeft`).
- `scrollConfig.leftEdgePaddingPx`: left boundary padding while scrolling.
- `scrollConfig.topEdgePaddingPx`: top boundary padding while scrolling.
- `scrollConfig.scrollThrottleMs`: minimum delay between scroll operations (currently not implemented).
- `scrollConfig.smoothScrollEnabled`: enable/disable smooth scrolling where supported.
- `scrollConfig.scrollAnimationDurationMsVertical`: vertical scroll animation duration override.
- `scrollConfig.scrollAnimationDurationMsHorizontal`: horizontal scroll animation duration override.

## TVTextScrollView

`TVTextScrollView` is a TV-friendly wrapper for long-form scrollable content where there may be few or no focusable children.

It integrates with SpatialManager directional key handling and supports page-based scroll behavior:

- `scrollDuration` (seconds): animation duration for directional scroll.
- `pageSize` (px): distance moved per directional action. Defaults to half of visible size.
- `snapToStart`: when `true`, allows snapping to start edge on directional exit.
- `snapToEnd`: when `true`, allows snapping to end edge on directional exit.

## Try TV examples

Run the examples workspace:

```bash
npm run dev -w packages/react-native-web-examples
```

This fork keeps the broader React Native Web example surface and adds TV-specific routes on top of it.

Some inherited examples are still general RNW demos and are not yet adapted for LRUD or remote-focus behavior. The TV-focused routes, along with the examples already updated for focus handling, can be exercised directly in a browser for testing and debugging.

Open the local dev URL and try TV-focused routes such as:

- `/tv-event-handler`
- `/tv-focus-guide-view`
- `/tv-text-scrollview`
- `/flatlist-tv-scroll`

## Docs

- Documentation site: [https://hps1978.github.io/react-native-web-tv/](https://hps1978.github.io/react-native-web-tv/)
- Docs workspace source: `packages/react-native-web-docs`
- TV docs include:
  - TV navigation concepts
  - `TVFocusGuideView`
  - `TVEventHandler`
  - `TVEventControl`
  - `TVTextScrollView`
  - `useTVEventHandler`

## Contributing

Development happens in the open on GitHub and contributions are welcome.

### Code of conduct

This project expects all participants to adhere to Meta's OSS [Code of Conduct][code-of-conduct].

### Contributing guide

Read the [contributing guide][contributing-url] to learn how to propose and ship changes.

### Good first issues

Get started with [good first issues][good-first-issue-url].

[contributing-url]: https://github.com/hps1978/react-native-web-tv/blob/tv-main/.github/CONTRIBUTING.md
[good-first-issue-url]: https://github.com/hps1978/react-native-web-tv/labels/good%20first%20issue
[code-of-conduct]: https://opensource.fb.com/code-of-conduct/
