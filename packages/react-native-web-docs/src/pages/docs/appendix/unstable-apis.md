---
title: Unstable APIs
date: Last Modified
permalink: /docs/unstable-apis/index.html
description:
eleventyNavigation:
  key: Unstable APIs
  parent: Appendix
  order: 1
---

:::lead
The following APIs are unstable and subject to breaking changes. Use at your own risk.
:::

## Use with existing React DOM components

This package exports a web-specific API called `unstable_createElement`, which can be used to wrap React DOM components so they can accept React Native-style props (for example accessibility and style props).

Import from the package key your app resolves for web:

- `react-native` (when aliased to this package)
- `react-native-web-tv` (direct install)
- `react-native-web` (npm alias strategy)

In the example below, `Video` will now accept common React Native props such as `accessibilityLabel`, `accessible`, `style`, and even the Responder event props.

```js
import { unstable_createElement } from 'react-native';
const Video = (props) => unstable_createElement('video', props);
```

This also works with composite components from existing app code.

```js
import { unstable_createElement, useLocaleContext } from 'react-native';
import { StyleSheet } from 'react-native';

function LegacyButton(props) {
  return <button {...props} />;
}

const CustomButton = (props) => {
  const { direction } = useLocaleContext();
  return unstable_createElement(LegacyButton, {
    ...props,
    style: [styles.button, props.style],
    writingDirection: direction
  });
};

const styles = StyleSheet.create({
  button: {
    padding: 20
  }
});
```

Remember that React Native styles are not the same as React DOM styles, and care needs to be taken not to pass React DOM styles into your React Native wrapped components.

## Use as a library framework

The React Native (for Web) building blocks can be used to create higher-level components and abstractions. In the example below, a `styled` function provides a simple API inspired by styled-components.

```jsx
import { unstable_createElement, View } from 'react-native';
import { StyleSheet } from 'react-native';

/**
 * styled API
 */
const styled = (Component, styler) => {
  const isDOMComponent = typeof Component === 'string';

  return function Styled(props) {
    const style = typeof styler === 'function' ? styler(props) : styler;
    const nextProps = {
      ...props,
      style: [style, props.style]
    };

    return isDOMComponent
      ? unstable_createElement(Component, nextProps)
      : <Component {...nextProps} />;
  };
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    backgroundColor: '#2196F3',
    flex: 1,
    justifyContent: 'center'
  }
});

const StyledView = styled(View, styles.container);
```

Because this API is unstable, prefer wrapping usage in a small local abstraction that you can update in one place if behavior changes.
