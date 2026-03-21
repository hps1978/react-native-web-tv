# babel-plugin-react-native-web-tv

[![npm version][package-badge]][package-url] [![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg)](https://reactjs.org/docs/how-to-contribute.html#your-first-pull-request)

A Babel plugin that will alias `react-native` to `react-native-web-tv` or `react-native-web` and exclude
any modules not required by your app (keeping bundle size down).

In this TV fork, the plugin behavior is unchanged and works for TV exports as well
(for example `TVFocusGuideView`, `TVEventHandler`, and `useTVEventHandler`) when
they are imported from `react-native`.

## Installation


```
# For the TV fork:
npm install --save-dev babel-plugin-react-native-web-tv
```

## Usage

**.babelrc**

```
{
  "plugins": [
    ["react-native-web-tv", { "target": "react-native-web-tv", "commonjs": true }]
  ]
}
```

**Options:**

- `target`: Which package to rewrite imports to. Default: `react-native-web-tv`. If your app uses `react-native-web` (including via an npm alias to the TV fork), set `target` to `react-native-web`.
- `commonjs`: Set to `true` to rewrite to CommonJS modules (for older bundlers).

**Important:**


- Set the `target` option to control which package imports are rewritten to (`react-native-web-tv` or `react-native-web`).
- This plugin will warn if your configuration does not match your dependencies.

**Migration:**

- To migrate from `react-native-web` to `react-native-web-tv`, install `react-native-web-tv` and `babel-plugin-react-native-web-tv`, and update your `.babelrc` to set `target` to `react-native-web-tv`.
- If you want to continue using `react-native-web` as npm alias, example `"react-native-web": "npm:react-native-web-tv@<version>"`), set `target` to `react-native-web`. This will cause the plugin to rewrite imports to `react-native-web` paths, regardless of whether the package is the upstream or aliased TV fork.


## Example

NOTE: `react-native-web` (and `react-native-web-tv`) internal paths are _not stable_ and you must not rely
on them. Always use the Babel plugin to optimize your build. What follows is an
example of the rewrite performed by the plugin.

**Before**

```js
import { StyleSheet, View } from 'react-native';
```

**After with target set to react-native-web-tv**

```js
import StyleSheet from 'react-native-web-tv/dist/exports/StyleSheet';
import View from 'react-native-web-tv/dist/exports/View';
```

**After with target set to react-native-web**

```js
import StyleSheet from 'react-native-web/dist/exports/StyleSheet';
import View from 'react-native-web/dist/exports/View';
```

[package-badge]: https://img.shields.io/npm/v/babel-plugin-react-native-web-tv.svg?style=flat
[package-url]: https://www.npmjs.com/package/babel-plugin-react-native-web-tv
