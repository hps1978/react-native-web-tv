# Development monorepo

This is the development monorepo for "React Native for Web" and related projects.

## Structure

* `.github`
  * Contains workflows used by GitHub Actions.
  * Contains issue templates.
* `configs`
  * Contains configuration files used by the monorepo tooling (compiling, linting, testing, etc.)
* `packages`
  * [react-native-web](https://github.com/necolas/react-native-web/blob/master/packages/react-native-web)
  * Contains the individual packages managed in the monorepo.
* `scripts`
  * Contains Node.js scripts for miscellaneous tasks.

## Web TV fork additions

This fork adds Web TV-focused APIs and spatial navigation on top of React Native for Web.

Key additions:
* TV spatial navigation via [@bbc/tv-lrud-spatial-rnw](https://github.com/hps1978/lrud-spatial-rnw) which is inspired by and a heavy re-write of `@bbc/tv-lrud-spatial` to address React Native Web components on TV. It's wired into React Native Web through SpatialManager (another new module).
* TV exports from `react-native-web`: `TVEventHandler`, `TVEventControl`, `TVFocusGuideView`, `TVTextScrollView`, `useTVEventHandler`, and `TVRemoteEvent`.
* TV focus props on `View`/pressables: `tvFocusable`, `isTVSelectable`, `trapFocusUp/Down/Left/Right`, `destinations`, `autoFocus`.
* RecyclerListView adapter for `VirtualizedList`/`FlatList` (via `recyclerlistview`) to improve large-list performance on TV. NOTE: Disabled at the moment to fix some issues.
* `Platform.isTV` is currently forced to `true` in this fork (TV detection is TODO).

## Spatial navigation configuration

TV apps can configure spatial navigation before `AppRegistry.runApplication()` by setting `window.appConfig`.

```html
<script>
  window.appConfig = {
    keyMap: {
      // Optional: map device-specific keys to ArrowUp/Down/Left/Right
      // Example: 'Up': 'ArrowUp'
    },
    keydownThrottleMs: 0,
    focusConfig: {
      mode: 'default'  // 'default' or 'AlignLeft'
    },
    scrollConfig: {
      edgeThresholdPx: 100,
      scrollThrottleMs: 80,
      smoothScrollEnabled: true,
      scrollAnimationDurationMs: 0,
      scrollAnimationDurationMsVertical: 0,
      scrollAnimationDurationMsHorizontal: 0
    }
  };
</script>
```

Supported config fields:
* `keyMap`: optional key mapping for LRUD input. NOTE: this needs to be tested for custom keys. The defaults already work for basic key types without setting this config.
* `keydownThrottleMs`: minimum time between keydown events (ms). Use to reduce rapid repeats from held keys.
* `focusConfig.mode`: focus scrolling behavior mode ('default' or 'AlignLeft'). AlignLeft keeps left moves default, and aligns right moves to the current focus X position when scrolling.
* `scrollConfig.edgeThresholdPx`: padding from container edges before scrolling.
* `scrollConfig.scrollThrottleMs`: minimum time between scrolls.
* `scrollConfig.smoothScrollEnabled`: enables smooth scroll where supported.
* `scrollConfig.scrollAnimationDurationMs`: fallback duration if axis-specific values are unset.
* `scrollConfig.scrollAnimationDurationMsVertical`: vertical animation duration override.
* `scrollConfig.scrollAnimationDurationMsHorizontal`: horizontal animation duration override.

## Try the TV examples

- `npm install`
- `npm run dev -w react-native-web-examples`
- Open the dev server URL (typically `http://localhost:3000`) and visit `/view-tv`, `/tv-event-handler`, `/tv-focus-guide-view`, `/flatlist-tv-scroll`, `/rlv-flatlist-tv-scroll`, `/app-registry-tv`.

## Tasks

* `build`
  * Use `npm run build` to run the build script in every package.
  * Use `npm run build -w <package-name>` to run the build script for a specific package.
* `dev`
  * Use `npm run dev` to run the dev script in every package.
  * Use `npm run dev -w <package-name>` to run the dev script for a specific package.
* `test`
  * Use `npm run test` to run tests for every package.

More details can be found in the contributing guide below.

## Contributing

Development happens in the open on GitHub and we are grateful for contributions including bugfixes, improvements, and ideas.

### Code of conduct

This project expects all participants to adhere to Meta's OSS [Code of Conduct][code-of-conduct]. Please read the full text so that you can understand what actions will and will not be tolerated.

### Contributing guide

Read the [contributing guide][contributing-url] to learn about the development process, how to propose bugfixes and improvements, and how to build and test your changes to React Native for Web.

### Good first issues

To help you get you familiar with the contribution process, there is a list of [good first issues][good-first-issue-url] that contain bugs which have a relatively limited scope. This is a great place to get started.

[contributing-url]: https://github.com/necolas/react-native-web/blob/master/.github/CONTRIBUTING.md
[good-first-issue-url]: https://github.com/necolas/react-native-web/labels/good%20first%20issue
[code-of-conduct]: https://opensource.fb.com/code-of-conduct/
