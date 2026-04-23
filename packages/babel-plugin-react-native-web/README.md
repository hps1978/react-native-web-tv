# babel-plugin-react-native-web-tv

[![npm version][package-badge]][package-url] [![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg)](https://reactjs.org/docs/how-to-contribute.html#your-first-pull-request)

A Babel plugin that rewrites `react-native` imports to `react-native-web-tv`
or `react-native-web` dist entrypoints and can precompile static styles for the
TV fork.

In this TV fork the plugin also supports static style extraction and style prop
transpilation using a vendored RNW compiler. 

TV exports such as
`TVFocusGuideView`, `TVEventHandler`, and `useTVEventHandler` continue to work
when imported from `react-native`.

## Installation

```bash
npm install --save-dev babel-plugin-react-native-web-tv
```

## Usage

Basic import rewriting:

```json
{
  "plugins": [
    [
      "babel-plugin-react-native-web-tv",
      {
        "target": "react-native-web-tv"
      }
    ]
  ]
}
```

If you need CommonJS output paths:

```json
{
  "plugins": [
    [
      "babel-plugin-react-native-web-tv",
      {
        "target": "react-native-web-tv",
        "commonjs": true
      }
    ]
  ]
}
```

## Options

- `target`
  Which package imports are rewritten to. Default: `react-native-web-tv`.
  Set this to `react-native-web` if your app depends on `react-native-web`
  directly, including when `react-native-web` is an npm alias to this TV fork.
- `commonjs`
  When `true`, rewrite imports to CommonJS dist paths.
- `transpileStyles`
  Enables static style transpilation across both `StyleSheet.create(...)`
  replacement and JSX `style` prop transpilation.

## Static Style Runtime Requirements

Static style extraction relies on runtime support in `react-native-web-tv`.
Use it with an RNW TV package version that includes:

- `StyleSheet.createWithPrecompiled(...)`
- runtime handling for `__rnwMeta`
- support for precompiled inline style metadata payloads

The plugin will throw if its vendored static style compiler is unavailable.

## Static Style Configurations

### 1. Unified style transpilation (recommended)

This is the default static style mode. It enables both `StyleSheet.create(...)`
replacement and JSX `style` prop transpilation.

```json
{
  "plugins": [
    [
      "babel-plugin-react-native-web-tv",
      {
        "target": "react-native-web-tv",
        "transpileStyles": true
      }
    ]
  ]
}
```

Input:

```js
import { StyleSheet } from 'react-native-web-tv';

const styles = StyleSheet.create({
  root: { marginLeft: 12, color: 'red' }
});
```

Output shape:

```js
const styles = StyleSheet.createWithPrecompiled(
  {
    root: {
      marginLeft: 12,
      color: 'red',
      __rnwMeta: {
        segments: [
          {
            k: 0,
            sk: ['marginLeft', 'color'],
            cs: { ... },
            cr: [ ... ]
          }
        ]
      }
    }
  }
);
```

In production-style builds the plugin may emit a leaner object when only the
precompiled payload needs to be retained.

`transpileStyles` transforms statically analyzable inline style prop values for
JSX components:

- object literals
- arrays of object literals
- conditional branches with static object literals
- references to statically declared style objects

Dynamic expressions are preserved.

Input:

```js
import React from 'react';
import { View } from 'react-native-web-tv';

const variants = {
  focused: { padding: 12, backgroundColor: 'red' },
  idle: { padding: 8, backgroundColor: 'blue' }
};

export default function Example({ isFocused, externalStyle }) {
  return (
    <View
      style={[
        { marginTop: 8 },
        isFocused ? variants.focused : variants.idle,
        externalStyle
      ]}
    />
  );
}
```

The transformed output keeps runtime expressions such as `isFocused` and
`externalStyle`, while replacing static style objects with `__rnwMeta`
payloads.

## Important Notes

- This plugin warns when your configured `target` does not match the packages
  declared in your app dependencies.
- Internal dist paths are not stable public API; use the Babel plugin instead of
  writing those import paths by hand.
- Static style extraction only applies to statically analyzable values. Dynamic
  values remain runtime values.
- `transpileStyles` targets JSX `style` props on component-like
  elements.

## Styling Guidance (What To Avoid)

When `transpileStyles` is enabled, prefer style objects that are authored as
direct key/value pairs. This gives the plugin the best chance to precompile
styles and minimize runtime work.

Avoid spread-heavy style object definitions when you want precompile benefits,
for example:

```js
const styles = StyleSheet.create({
  headerContainer: {
    ...globalStyles.fullWidth,
    position: 'absolute',
    borderBottomWidth: 1
  }
});
```

Spread/computed object shapes are treated as runtime-only for safety. In these
cases the plugin intentionally skips precompilation for that object.

Prefer these alternatives:

- Use style arrays at usage sites:

```js
<View style={[globalStyles.fullWidth, styles.headerContainer]} />
```

- Or keep static keys explicit inside `StyleSheet.create(...)` when practical.

This keeps style behavior predictable and preserves static-style precompile
coverage where possible.

## Migration

- To migrate from `react-native-web` to `react-native-web-tv`, install
  `react-native-web-tv` and `babel-plugin-react-native-web-tv`, then set
  `target` to `react-native-web-tv`.
- If you keep `react-native-web` as an npm alias to the TV fork, for example
  `"react-native-web": "npm:react-native-web-tv@<version>"`, set `target` to
  `react-native-web` so the plugin rewrites imports to the aliased package name.


## Example

`react-native-web` and `react-native-web-tv` internal paths are not stable.
Always use the Babel plugin to optimize your build. What follows is an example
of the rewrite performed by the plugin.

Before:

```js
import { StyleSheet, View } from 'react-native';
```

After with `target: "react-native-web-tv"`:

```js
import StyleSheet from 'react-native-web-tv/dist/exports/StyleSheet';
import View from 'react-native-web-tv/dist/exports/View';
```

After with `target: "react-native-web"`:

```js
import StyleSheet from 'react-native-web/dist/exports/StyleSheet';
import View from 'react-native-web/dist/exports/View';
```

[package-badge]: https://img.shields.io/npm/v/babel-plugin-react-native-web-tv.svg?style=flat
[package-url]: https://www.npmjs.com/package/babel-plugin-react-native-web-tv
