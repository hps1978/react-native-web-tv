---
title: Setup
date: Last Modified
permalink: /docs/setup/index.html
eleventyNavigation:
  key: Setup
  parent: Start
  order: 2
---

:::lead
How to integrate React Native Web for TV with common web development tools.
:::

This guide covers package aliasing, Babel optimization, types, and app shell requirements for web TV targets.

Use one of the two possible strategies consistently across your toolchain:

- direct package: `react-native-web-tv`
- npm alias package key: `react-native-web` mapped to `react-native-web-tv`

---

## Package aliasing

If your app imports from `react-native`, configure tooling so those imports resolve to the package key you installed.

- If you installed `react-native-web-tv` directly, alias to `react-native-web-tv`.
- If you installed via npm alias and kept `react-native-web` as the dependency key, alias to `react-native-web`.

### Bundler

Configure your module bundler to alias the package to `react-native`. For example, modify your [webpack](https://github.com/webpack/webpack) configuration as follows:

```js
// webpack.config.js
module.exports = {
  // ...the rest of your config

  resolve: {
    alias: {
      // Choose one based on your installation path:
      // 'react-native$': 'react-native-web-tv'
      'react-native$': 'react-native-web'
    }
  }
}
```

### Compiler

[Babel](https://babeljs.io/) supports module aliasing using [babel-plugin-module-resolver](https://www.npmjs.com/package/babel-plugin-module-resolver)

```js
{
  "plugins": [
    ["module-resolver", {
      "alias": {
        "^react-native$": "react-native-web"
      }
    }]
  ]
}
```

For direct installs, replace `react-native-web` with `react-native-web-tv`.

### Jest

[Jest](https://facebook.github.io/jest/) can be configured to understand the aliased module.

```js
{
  "moduleNameMapper": {
    "^react-native$": "react-native-web"
  }
}
```

For direct installs, map `^react-native$` to `react-native-web-tv`.

### Flow

[Flow](https://flow.org) can be configured to understand the aliased module.

```yml
[options]
# Alias the package name
module.name_mapper='^react-native$' -> 'react-native-web'
```

For direct installs, map to `react-native-web-tv`.

### Node.js

Node.js can alias `react-native` to your selected package key using [`module-alias`](https://www.npmjs.com/package/module-alias). This is useful if you want to pre-render the app (e.g., server-side rendering or build-time rendering).

```js
// Install the `module-alias` package as a dependency first
const moduleAlias = require("module-alias");
moduleAlias.addAliases({
  // Choose one based on your installation path:
  // "react-native": require.resolve("react-native-web-tv"),
  "react-native": require.resolve("react-native-web"),
});
moduleAlias();
```

---

## Package optimization

The project's Babel plugin (see [Installation]({{ '/docs/installation' | url }})) is recommended for build-time optimizations and to prune modules not used by your application.

```js
{
  "plugins": [
    ["react-native-web-tv", { "target": "react-native-web" }]
  ]
}
```

If you installed `react-native-web-tv` directly, set `target` to `react-native-web-tv`.

Optional setting:

- `commonjs: true` rewrites to CommonJS dist paths for older bundlers.

---

## Types

Flow can be configured to pull types from the package source fields.

```yml
[options]
# Point flow to the 'module' field by default
module.system.node.main_field=module
module.system.node.main_field=main
```

---

## Root element

Full-screen React Native apps with a root `<ScrollView>` may require the following styles inlined in the HTML document shell. ([Example](https://codesandbox.io/p/sandbox/rczgq3?file=/public/index.html:352-644).)

```css
/* These styles make the body full-height */
html, body { height: 100%; }
/* These styles disable body scrolling if you are using <ScrollView> */
body { overflow: hidden; }
/* These styles make the root element full-height */
#root { display:flex; height:100%; }
```
