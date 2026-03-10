# React Native Web for TV monorepo

This repository is a customized React Native for Web fork that adds TV-first APIs and focus navigation for web-based TV platforms.

It is intended for TV browser runtimes, while keeping React Native for Web compatibility for shared app code.

## What's included in this fork

- TV spatial navigation via [@bbc/tv-lrud-spatial-rnw](https://github.com/hps1978/lrud-spatial-rnw), integrated through `SpatialManager`.
- TV exports from `react-native-web`:
  - `TVFocusGuideView`
  - `TVEventHandler`
  - `TVEventControl`
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

Useful workspace-specific commands:

```bash
# Core package
npm run dev -w react-native-web

# Examples app
npm run dev -w react-native-web-examples

# Docs site (Eleventy)
npm run dev -w react-native-web-docs
npm run build -w react-native-web-docs
```

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

## Try TV examples

Run the examples workspace:

```bash
npm run dev -w react-native-web-examples
```

Then open the local dev URL and try TV-focused routes such as:

- `/tv-event-handler`
- `/tv-focus-guide-view`
- `/flatlist-tv-scroll`
- `/rlv-flatlist-tv-scroll`

## Docs

- Docs workspace source: `packages/react-native-web-docs`
- TV docs include:
  - TV navigation concepts
  - `TVFocusGuideView`
  - `TVEventHandler`
  - `TVEventControl`
  - `useTVEventHandler`

## Contributing

Development happens in the open on GitHub and contributions are welcome.

### Code of conduct

This project expects all participants to adhere to Meta's OSS [Code of Conduct][code-of-conduct].

### Contributing guide

Read the [contributing guide][contributing-url] to learn how to propose and ship changes.

### Good first issues

Get started with [good first issues][good-first-issue-url].

[contributing-url]: https://github.com/necolas/react-native-web/blob/master/.github/CONTRIBUTING.md
[good-first-issue-url]: https://github.com/necolas/react-native-web/labels/good%20first%20issue
[code-of-conduct]: https://opensource.fb.com/code-of-conduct/
