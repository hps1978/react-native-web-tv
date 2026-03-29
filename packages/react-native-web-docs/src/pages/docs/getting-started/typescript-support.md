---
title: TypeScript support
date: Last Modified
permalink: /docs/typescript-support/index.html
eleventyNavigation:
  key: TypeScript support
  parent: Start
  order: 6
---

:::lead
How to add TypeScript support to your project.
:::

This package ships Flow types in its distribution. TypeScript support for the base API surface is provided via `@types/react-native-web` from [DefinitelyTyped](https://github.com/DefinitelyTyped/DefinitelyTyped/tree/master/types/react-native-web), which covers the React Native Web baseline this package inherits. TV-specific exports do not yet have published TypeScript declarations — this is a known gap.

---

## Base API types

Install the DefinitelyTyped declarations for the baseline API surface:

```shell
npm install --save-dev @types/react-native-web
```

This covers all components and APIs inherited from React Native Web, including `View`, `Pressable`, `ScrollView`, `StyleSheet`, `Platform`, and others. It does **not** cover TV-specific exports added by this package.

---

## TV-specific types

TV exports (`TVFocusGuideView`, `TVEventHandler`, `useTVEventHandler`, `TVEventControl`, `TVTextScrollView`) do not yet have TypeScript declaration files. If you need typed access to TV-specific APIs, you can declare minimal inline types from the Flow source definitions.

The core TV event type:

```ts
type TVRemoteEvent = {
  eventType: string;
  eventKeyAction?: string;
  tag?: number;
  target?: number;
  body?: any;
};
```

TV focus prop extensions for `View` and touchable components:

```ts
type TVViewProps = {
  focusable?: boolean;
  hasTVPreferredFocus?: boolean;
  isTVSelectable?: boolean;   // deprecated, use focusable
  tvFocusable?: boolean;
};
```

For pragmatic integration without custom declarations, `any` is acceptable while this gap exists:

`TVFocusGuideView` props:

```ts
import type { ViewProps } from 'react-native';

type TVFocusGuideViewProps = ViewProps & {
  /** The views that should receive focus when navigating out of this container. */
  destinations?: React.RefObject<any>[];
  /** Whether the focus guide is active. Defaults to true. */
  enabled?: boolean;
  autoFocus?: boolean;
  trapFocusUp?: boolean;
  trapFocusDown?: boolean;
  trapFocusLeft?: boolean;
  trapFocusRight?: boolean;
  focusable?: boolean;
  /** @deprecated No longer necessary. */
  safePadding?: 'vertical' | 'horizontal' | 'both' | null;
};
```

`TVTextScrollView` props:

```ts
import type { ScrollViewProps } from 'react-native';

type TVTextScrollViewProps = ScrollViewProps & {
  /** Duration of the scroll animation on remote swipe (seconds). Default: 0.3 */
  scrollDuration?: number;
  /** Distance to scroll on remote swipe. Default: half the visible size. */
  pageSize?: number;
  /** Scroll to start when focus moves past the beginning. Default: true */
  snapToStart?: boolean;
  /** Scroll to end when focus moves past the end. Default: true */
  snapToEnd?: boolean;
};
```

`TVEventHandler` and `useTVEventHandler`:

```ts
type TVRemoteEvent = {
  eventType: string;
  eventKeyAction?: string;
  tag?: number;
  target?: number;
  body?: any;
};

// TVEventHandler object API
type TVEventHandler = {
  addListener: (callback: (event: TVRemoteEvent) => void) => { remove(): void };
};

// hook equivalent
declare function useTVEventHandler(
  handler: (event: TVRemoteEvent) => void
): void;
```

`TVEventControl` (currently stubs on web — types reflect the API shape only):

```ts
type TVEventControl = {
  enableTVMenuKey(): void;
  disableTVMenuKey(): void;
  enableTVPanGesture(): void;
  disableTVPanGesture(): void;
  enableGestureHandlersCancelTouches(): void;
  disableGestureHandlersCancelTouches(): void;
};
```

```ts
import { useTVEventHandler } from 'react-native-web-tv';

useTVEventHandler((event: any) => {
  if (event.eventType === 'select') { /* ... */ }
});
```

---

## Using it in React Native projects

### Alias install path

If your project uses the `react-native-web` alias (npm alias or webpack `resolve.alias`), TypeScript module resolution also needs to be redirected. Add a `paths` entry alongside the `types` declaration in `tsconfig.json`:

```json
{
  "compilerOptions": {
    "types": ["react-native-web"],
    "paths": {
      "react-native-web": ["node_modules/react-native-web-tv"]
    }
  }
}
```

This makes TypeScript resolve `react-native-web` imports against the installed `react-native-web-tv` package, while still using the `@types/react-native-web` declarations for the shared API surface.

### Direct install path

If importing directly from `react-native-web-tv`, add `react-native-web` to the `types` array to augment `react-native` types with web-aware props:

```json
{
  "compilerOptions": {
    "types": ["react-native-web"]
  }
}
```

```ts
import { AppRegistry } from 'react-native-web-tv';
import { TVFocusGuideView } from 'react-native-web-tv';
```

With this setup, RN components imported from `react-native` are augmented with web-only style properties and RNW props:

```tsx
import { View, ViewStyle } from 'react-native';

const style: ViewStyle = {
  position: 'fixed',    // RNW augments styles with web-only values
  marginBlock: 'auto',  // web CSS properties are also available
};

<View
  href="https://hps1978.github.io/react-native-web-tv/docs/"
  style={style}
/>
```

---

## Contributing TypeScript declarations

Proper TypeScript declaration files for TV-specific exports are a known gap in the current implementation. If you would like to improve TypeScript coverage, opening an issue or pull request on the [react-native-web-tv repository](https://github.com/hps1978/react-native-web-tv) is welcome.
