---
title: React Native compatibility
date: Last Modified
permalink: /docs/react-native-compatibility/index.html
eleventyNavigation:
  key: React Native compatibility
  parent: Start
  order: 5
---

:::lead
This package builds React Native compatibility from React Native Web, then adds a TV compatibility layer inspired by React Native tvOS for browser-based TV platforms.
:::

**Best used with React Native >= 0.68**.

Visit the [React Native Directory](https://reactnative.directory/?web=true) to find React Native packages with known web support.

## How to read this page

- The **Components** and **APIs** tables below are the React Native compatibility baseline inherited from React Native Web.
- The **TV additions** section describes the additional React Native tvOS-style compatibility implemented on top, adapted for web TV runtimes.
- API shape compatibility with React Native tvOS does not always mean full behavior parity on browser-based TV platforms.

## TV additions

This package extends the React Native Web baseline with TV-oriented modules and focus behavior inspired by React Native tvOS, adapted for browser-based TV platforms.

| Area | Status | Notes |
| :--- | :----- | :---- |
| `TVFocusGuideView` | ✓ | Implemented for web TV focus containers, including destinations, autofocus, and trap-focus behavior in the spatial navigation layer. |
| `TVEventHandler` | ✓ | Implemented listener API for remote/hardware key events when key events are delivered by the target environment. |
| `useTVEventHandler` | ✓ | Implemented hook wrapper around `TVEventHandler`. |
| `TVTextScrollView` | ✓ | Implemented for remote-driven paging in content-heavy scroll layouts. |
| `TVEventControl` | (✓) | API shape is present for compatibility, but methods are currently stubs on web and log warnings. |
| TV focus props on core components | (✓) | Support is implemented for key props used by this package (for example `focusable`, `hasTVPreferredFocus`, `isTVSelectable`, `tvFocusable`), but parity is not complete across all components and scenarios. |
| `nextFocus*` style parity | ✘ | Not implemented yet in runtime behavior. Definitions currently exist at the type/API-shape level only. |

For detailed TV behavior and known limitations, see [TV Navigation]({{ '/docs/tv-navigation/' | url }}), [TVFocusGuideView]({{ '/docs/tv-focus-guide-view/' | url }}), [TVEventHandler]({{ '/docs/tv-event-handler/' | url }}), and [TVEventControl]({{ '/docs/tv-event-control/' | url }}).

## TV parity comparison

The table below compares:

- **This package** (`react-native-web-tv`) - [react-native-web-tv](https://github.com/hps1978/react-native-web-tv)
- **React Native TVOS** (native TV reference behavior) - [react-native-tvos](https://github.com/react-native-tvos/react-native-tvos)

| Area | `react-native-web-tv` | `react-native-tvos` |
| :--- | :--- | :--- |
| Core TV exports (`TVFocusGuideView`, `TVEventHandler`, `TVEventControl`, `TVTextScrollView`, `useTVEventHandler`) | Implemented for TV integration. | Present. |
| `Platform.isTV` behavior | Set to `true` for TV integration behavior. No intention of adding environment-based detection in future work. | True on TV runtimes. |
| `View` TV focus methods/props (`hasTVPreferredFocus`, `requestTVFocus`, container hints) | Implemented for web TV focus integration. | Implemented with native focus engines. |
| `Pressable` / `Touchable*` TV focusability (`focusable`, `isTVSelectable`) | Implemented for tab-index and LRUD focus integration. | Implemented with native TV focus and event semantics. |
| `TextInput` TV focus behavior (`hasTVPreferredFocus`, `isTVSelectable`, focusability) | Implemented for web TV focus integration. | Implemented with platform-native behavior and constraints. |
| `ScrollView` / `VirtualizedList` TV focus-flow support | Implemented, including TV focus-guide wrapping and trap-focus integration for list flows. | Implemented with native TV focus handling. |
| Directional `nextFocus*` props (`nextFocusUp/Down/Left/Right/Forward`) | Not implemented yet in runtime (types only). | Implemented and used in native TV component behavior. |
| `TVFocusGuideView` destinations/autoFocus/trapFocus | Implemented via LRUD container attributes and spatial manager integration. | Implemented via native UIFocusGuide/Android TV behavior. |
| `TVEventHandler` / `useTVEventHandler` | Implemented when remote key events are delivered to runtime. | Implemented. |
| `TVEventControl` | API shape is present; methods are currently stubs on web and log warnings. | Implemented with native toggles. |
| `BackHandler` TV back integration | Implemented conditionally via configured web TV key map (`window.appConfig.keyMap.Back`). | Implemented against native remote back/menu behavior. |



_Note: tests are in place for the current implementation. If you find a gap, please open an issue. Help improving the existing implementation is welcome._


## Components

| Name                     | Status | Notes |
| :----------------------- | :----- | :---- |
| ActivityIndicator        | ✓      |  |
| Button                   | ✓      |  |
| CheckBox                 | ✓      |  |
| FlatList                 | ✓      |  |
| Image                    | ✓      | Missing multiple sources ([#515](https://github.com/necolas/react-native-web/issues/515)) and HTTP headers ([#1019](https://github.com/necolas/react-native-web/issues/1019)). |
| ImageBackground          | ✓      |  |
| KeyboardAvoidingView     | (✓)    | Mock. No equivalent web APIs. |
| Modal                    | ✓      |  |
| Picker                   | ✓      |  |
| Pressable                | ✓      |  |
| RefreshControl           | ✘      | Not started ([#1027](https://github.com/necolas/react-native-web/issues/1027)). |
| SafeAreaView             | ✓      |  |
| ScrollView               | ✓      | Missing momentum scroll events ([#1021](https://github.com/necolas/react-native-web/issues/1021)). |
| SectionList              | ✓      |  |
| StatusBar                | (✓)    | Mock. No equivalent web APIs. |
| Switch                   | ✓      |  |
| Text                     | ✓      | No `onLongPress` ([#1011](https://github.com/necolas/react-native-web/issues/1011)). |
| TextInput                | ✓      | Missing rich text features ([#1023](https://github.com/necolas/react-native-web/issues/1023)), and auto-expanding behaviour ([#795](https://github.com/necolas/react-native-web/issues/795)). |
| Touchable                | ✓      | Includes additional support for mouse and keyboard interactions. |
| TouchableHighlight       | ✓      |  |
| TouchableNativeFeedback  | ✘      | Not started ([#1024](https://github.com/necolas/react-native-web/issues/1024)). |
| TouchableOpacity         | ✓      |  |
| TouchableWithoutFeedback | ✓      |  |
| View                     | ✓      |  |
| VirtualizedList          | ✓      |  |
| YellowBox                | (✓)    | Mock. No YellowBox functionality. |

## APIs

| Name                     | Status | Notes |
| :----------------------- | :----- | :---- |
| AccessibilityInfo        | (✓)    | Mock. No equivalent web APIs. |
| Alert                    | ✘      | Not started ([#1026](https://github.com/necolas/react-native-web/issues/1026)). |
| Animated                 | ✓      | Missing `useNativeDriver` support. |
| Appearance               | ✓      |  |
| AppRegistry              | ✓      | Includes additional support for server rendering with `getApplication`. |
| AppState                 | ✓      |  |
| BackHandler              | (✓)    | Browser-native parity is limited; in this package it can also handle TV-style back events when remote key events are available. |
| Clipboard                | ✓      |  |
| DeviceInfo               | (✓)    | Limited information. |
| Dimensions               | ✓      |  |
| Easing                   | ✓      |  |
| Geolocation              | ✓      |  |
| I18nManager              | (✓)    | Mock. See [localization](../localization/) for preferred approach. |
| InteractionManager       | (✓)    |  |
| Keyboard                 | (✓)    | Mock. |
| LayoutAnimation          | (✓)    | Missing translation to web animations. |
| Linking                  | ✓      |  |
| NativeEventEmitter       | ✓      |  |
| NativeMethodsMixin       | ✓      |  |
| NativeModules            | (✓)    | Mocked. Missing ability to load native modules. |
| PanResponder             | ✓      |  |
| PixelRatio               | ✓      |  |
| Platform                 | ✓      | In this package, `Platform.isTV` is currently forced `true` for TV behavior compatibility. |
| Settings                 | ✘      | No equivalent web APIs. |
| Share                    | ✓      | Only available over HTTPS. Read about the [Web Share API](https://wicg.github.io/web-share/). |
| StyleSheet               | ✓      |  |
| UIManager                | ✓      |  |
| Vibration                | ✓      |  |
| useColorScheme           | ✓      |  |
| useWindowDimensions      | ✓      |  |

---

## Compatibility guidance for TV apps

- Treat this page as baseline + package extension guidance, not a full parity guarantee with native TV platforms.
- Validate critical focus and remote-control behavior on each target TV runtime.
- Expect additional integration work when app flows depend on third-party libraries or native-only modules.
