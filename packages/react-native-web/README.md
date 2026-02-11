# React Native for Web

[![npm version][package-badge]][package-url] [![Build Status][ci-badge]][ci-url] [![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg)](https://reactjs.org/docs/how-to-contribute.html#your-first-pull-request)

"React Native for Web" makes it possible to run [React Native][react-native-url] components and APIs on the web using React DOM.

## Documentation

The [documentation site](https://necolas.github.io/react-native-web/) ([source](https://github.com/necolas/react-native-web/blob/master/packages/react-native-web-docs)) covers installation, guides, and APIs.

## Example

The [examples app](https://p9t5cp.sse.codesandbox.io/) ([source](https://github.com/necolas/react-native-web/blob/master/packages/react-native-web-examples)) demonstrates many available features. Fork the [codesandbox](https://codesandbox.io/s/github/necolas/react-native-web/tree/master/packages/react-native-web-examples) to make changes and see the results.

You'll notice that there is no reference to `react-dom` in components. The `App` component that is shown below is defined using the APIs and Components of React Native, but it can also be rendered on the web using React Native for Web.

```js
// Example component
import React from 'react';
import { AppRegistry, StyleSheet, Text, View } from 'react-native';

class App extends React.Component {
  render() {
    return (
      <View style={styles.box}>
        <Text style={styles.text}>Hello, world!</Text>
      </View>
    );
  }
}

const styles = StyleSheet.create({
  box: { padding: 10 },
  text: { fontWeight: 'bold' }
});

AppRegistry.registerComponent('App', () => App);
AppRegistry.runApplication('App', { rootTag: document.getElementById('react-root') });
```

## Web TV support in this fork

This fork adds Web TV spatial navigation and TV-specific APIs.

Highlights:
* TV spatial navigation via [@bbc/tv-lrud-spatial-rnw](https://github.com/hps1978/lrud-spatial-rnw) which is inspired by and a heavy re-write of `@bbc/tv-lrud-spatial` to address React Native Web components on TV. It's wired into React Native Web through SpatialManager (another new module).
* New TV exports: `TVEventHandler`, `TVEventControl`, `TVFocusGuideView`, `TVTextScrollView`, `useTVEventHandler`, and `TVRemoteEvent`.
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
* `scrollConfig.edgeThresholdPx`: padding from container edges before scrolling.
* `scrollConfig.scrollThrottleMs`: minimum time between scrolls.
* `scrollConfig.smoothScrollEnabled`: enables smooth scroll where supported.
* `scrollConfig.scrollAnimationDurationMs`: fallback duration if axis-specific values are unset.
* `scrollConfig.scrollAnimationDurationMsVertical`: vertical animation duration override.
* `scrollConfig.scrollAnimationDurationMsHorizontal`: horizontal animation duration override.
## Contributing

Development happens in the open on GitHub and we are grateful for contributions including bugfixes, improvements, and ideas. Read below to learn how you can take part in improving React Native for Web.

### Code of conduct

This project expects all participants to adhere to Meta's OSS [Code of Conduct][code-of-conduct]. Please read the full text so that you can understand what actions will and will not be tolerated.

### Contributing guide

Read the [contributing guide][contributing-url] to learn about the development process, how to propose bugfixes and improvements, and how to build and test your changes to React Native for Web.

### Good first issues

To help you get you familiar with the contribution process, there is a list of [good first issues][good-first-issue-url] that contain bugs which have a relatively limited scope. This is a great place to get started.

## License

React Native for Web is [MIT licensed](./LICENSE). By contributing to React Native for Web, you agree that your contributions will be licensed under its MIT license.

[package-badge]: https://img.shields.io/npm/v/react-native-web.svg?style=flat
[package-url]: https://www.npmjs.com/package/react-native-web
[ci-badge]: https://github.com/necolas/react-native-web/workflows/tests/badge.svg
[ci-url]: https://github.com/necolas/react-native-web/actions
[react-native-url]: https://reactnative.dev/
[contributing-url]: https://github.com/necolas/react-native-web/blob/master/.github/CONTRIBUTING.md
[good-first-issue-url]: https://github.com/necolas/react-native-web/labels/good%20first%20issue
[code-of-conduct]: https://opensource.fb.com/code-of-conduct/
