# React Native Web for TV

[![npm version][package-badge]][package-url] [![Build Status][ci-badge]][ci-url] [![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg)](https://reactjs.org/docs/how-to-contribute.html#your-first-pull-request)

"React Native Web for TV" makes it possible to run [React Native][react-native-url] components and APIs on the web based TVs using React Native Web with spatial navigation enabled by default.

It is derived from [React Native Web](https://github.com/necolas/react-native-web), and this fork remains intentionally close to that project while extending it for browser-based TV platforms. Thanks to the RNW project for the foundation this fork builds on 🙏.

---

## 🚀 Out-of-the-box Spatial Navigation for Web-based TV


**Built-in LRUD spatial navigation and remote focus for web-based TV platforms (e.g., Samsung Tizen TV, LG webOS TV, and other browser-based TV environments).**

> **ℹ️ Note:** This package provides built-in spatial navigation logic (LRUD) and remote focus, but your app must ensure that platform-specific remote keys (such as arrow, OK, Back, Menu) are registered and delivered to the browser. On some TV platforms, this requires a one-time setup in your app or hosting environment. Once keys are registered, no extra libraries are needed for spatial navigation.

The spatial navigation layer is integrated and enabled by default once remote key events reach the browser.

### Configurability

Spatial navigation and remote key handling can be customized for your app or platform. See the [Spatial navigation configuration](#spatial-navigation-configuration) section below for details and examples.

For advanced use cases, you can:
- Remap remote keys for different TV platforms
- Adjust focus and scroll behavior

See the [TV Navigation documentation](https://hps1978.github.io/react-native-web-tv/docs/tv-navigation/) for more platform-specific tips, best practices, and migration notes.

---

## Documentation

The documentation site is hosted at [https://hps1978.github.io/react-native-web-tv/](https://hps1978.github.io/react-native-web-tv/). Documentation source lives in `packages/react-native-web-docs` and can also be built locally from the monorepo.

## Installation

Install the published package directly in a new project with:

```bash
npm install react-native-web-tv
```

If you want to replace an existing `react-native-web` dependency while keeping current import paths unchanged, use an npm alias:

```bash
npm install react-native-web@npm:react-native-web-tv@<version>
```

## Versioning

This fork keeps the upstream React Native Web version as the base and appends a TV-specific semver suffix:

```text
<upstream-version>-tv.<tv-release>
```

For example, `0.21.2-tv.0` is the initial TV fork release built on upstream `0.21.2`.

## Examples in this fork

The examples app source lives in `packages/react-native-web-examples` and can be run locally from the monorepo.

This fork keeps the broader React Native Web example surface and adds TV-specific examples on top of it.

Some inherited examples are still general RNW demos and are not yet adapted for LRUD or remote-focus behavior. The TV-focused routes, along with the examples already updated for focus handling, can be exercised directly in a browser for testing and debugging.

Useful TV-oriented examples include:

* `/tv-event-handler`
* `/tv-focus-guide-view`
* `/tv-text-scrollview`
* `/tv-flatlist`

## Web TV support in this fork

This fork adds Web TV spatial navigation and TV-specific APIs.

Highlights:
* TV spatial navigation via a forked `@hps1978/tv-lrud-spatial` implementation from [hps1978/lrud-spatial-rnw](https://github.com/hps1978/lrud-spatial-rnw). It's wired into React Native Web through SpatialManager.
* New TV exports: `TVEventHandler`, `TVEventControl`, `TVFocusGuideView`, `TVTextScrollView`, `useTVEventHandler`, and `TVRemoteEvent`.
* TV focus props include `tvFocusable`, `isTVSelectable`, `hasTVPreferredFocus`, `autoFocus`, `trapFocusUp/Down/Left/Right`, `destinations`, and directional focus routing (`nextFocusUp/Down/Left/Right/Forward`).
* RecyclerListView adapter for `VirtualizedList`/`FlatList` (via `recyclerlistview`) to improve large-list performance on TV. NOTE: Disabled at the moment to fix some issues.
* `Platform.isTV` is currently forced to `true` in this fork (TV detection is TODO).
* `TVEventControl` methods currently exist as compatibility stubs on web and emit warnings.

## Spatial navigation configuration

TV apps can configure spatial navigation before `AppRegistry.runApplication()` by setting `window.appConfig`.

```html
<script>
  window.appConfig = {
    keyMap: {
      // Optional: map device-specific keys to ArrowUp/Down/Left/Right
      // Map Back/Menu keyCodes per TV platform as needed
      Back: 461,
      Menu: 10009
    },
    keydownThrottleMs: 0,
    focusConfig: {
      mode: 'default' // 'default' or 'AlignLeft'
    },
    scrollConfig: {
      leftEdgePaddingPx: 10,
      topEdgePaddingPx: 15,
      scrollThrottleMs: 80, // Not implemented
      smoothScrollEnabled: true,
      scrollAnimationDurationMsVertical: 0,
      scrollAnimationDurationMsHorizontal: 0
    }
  };
</script>
```

Supported config fields:
* `keyMap`: optional key mapping for LRUD input and TV-specific Back/Menu key support.
* `keydownThrottleMs`: minimum time between keydown events (ms).
* `focusConfig.mode`: focus-scroll mode (`default` or `AlignLeft`).
* `scrollConfig.leftEdgePaddingPx`: padding from scroll container left edge.
* `scrollConfig.topEdgePaddingPx`: padding from scroll container top edge.
* `scrollConfig.scrollThrottleMs`: minimum time between scrolls. NOTE: not implemented.
* `scrollConfig.smoothScrollEnabled`: enables smooth scroll where supported.
* `scrollConfig.scrollAnimationDurationMsVertical`: vertical animation duration override.
* `scrollConfig.scrollAnimationDurationMsHorizontal`: horizontal animation duration override.

## TVTextScrollView

`TVTextScrollView` is intended for text-heavy or static layouts that need predictable directional scrolling on TV, including cases with few or no focusable descendants.

It works with SpatialManager key handling and supports page-style behavior through props:
* `scrollDuration` (seconds): directional scroll animation duration.
* `pageSize` (px): per-action scroll distance; defaults to half the viewport size.
* `snapToStart`: when enabled, allows snapping to the start edge.
* `snapToEnd`: when enabled, allows snapping to the end edge.

## Contributing

Development happens in the open on GitHub and we are grateful for contributions including bugfixes, improvements, and ideas. Read below to learn how you can take part in improving React Native Web for TV.

### Code of conduct

This project expects all participants to adhere to Meta's OSS [Code of Conduct][code-of-conduct]. Please read the full text so that you can understand what actions will and will not be tolerated.

### Contributing guide

Read the [contributing guide][contributing-url] to learn about the development process, how to propose bugfixes and improvements, and how to build and test your changes to React Native Web for TV.

### Good first issues

To help you get you familiar with the contribution process, there is a list of [good first issues][good-first-issue-url] that contain bugs which have a relatively limited scope. This is a great place to get started.

## License

React Native Web for TV is [MIT licensed](./LICENSE). By contributing to React Native Web for TV, you agree that your contributions will be licensed under its MIT license.

This fork also depends on Apache-2.0 licensed TV navigation code via `@hps1978/tv-lrud-spatial`.
See [THIRD_PARTY_NOTICES.md](./THIRD_PARTY_NOTICES.md) and [APACHE-2.0.txt](./APACHE-2.0.txt) for redistribution details.

[package-badge]: https://img.shields.io/npm/v/react-native-web-tv.svg?style=flat
[package-url]: https://www.npmjs.com/package/react-native-web-tv
[ci-badge]: https://github.com/hps1978/react-native-web-tv/workflows/tests/badge.svg
[ci-url]: https://github.com/hps1978/react-native-web-tv/actions
[react-native-url]: https://reactnative.dev/
[contributing-url]: https://github.com/hps1978/react-native-web-tv/blob/tv-main/.github/CONTRIBUTING.md
[good-first-issue-url]: https://github.com/hps1978/react-native-web-tv/labels/good%20first%20issue
[code-of-conduct]: https://opensource.fb.com/code-of-conduct/
