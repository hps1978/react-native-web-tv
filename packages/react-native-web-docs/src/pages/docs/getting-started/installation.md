---
title: Installation
date: Last Modified
permalink: /docs/installation/index.html
eleventyNavigation:
  key: Installation
  parent: Start
  order: 1
---

:::lead
An overview of how to install and use {{ site.name }}.
:::

React Native Web for TV is built on top of React Native Web and can be used for multi-platform and web-only applications targeting browser-based TV environments. It can be incrementally adopted by existing React Web apps and integrated with existing React Native apps. React-compatible runtimes may work, but React is the primary supported target.

TV spatial navigation is built in, but your app must ensure remote key events reach the browser runtime. For configuration, platform notes, and focus behavior details, see the [TV Navigation documentation]({{ '/docs/tv-navigation/' | url }}).


Use the published package name directly in a new project:

```shell
npm install react-dom {{ site.packageName }}
```

If you are replacing an existing `react-native-web` dependency and want to keep current import paths unchanged, install this fork using an npm alias:

```shell
npm install react-dom react-native-web@npm:{{ site.packageName }}@{{ site.packageVersion }}
```

That keeps `react-native-web` as the dependency key in your app while resolving it to `{{ site.packageName }}` from npm.

Fork release versions follow this convention:

```text
<upstream-version>-tv.<tv-release>
```

Example: `0.21.2-tv.0` means the initial TV fork release built from upstream `0.21.2`.

The Babel plugin is recommended for build-time optimizations.

```shell
npm install --save-dev babel-plugin-react-native-web-tv
```

The plugin supports both installation paths shown above. It rewrites imports from `react-native` to the package target you configure, so the `target` option should match the dependency name that exists in your app.

If you installed the package directly as `react-native-web-tv`, configure Babel like this:

```json
{
  "plugins": [
    ["react-native-web-tv", { "target": "react-native-web-tv" }]
  ]
}
```

If you installed this fork through an npm alias such as `react-native-web@npm:react-native-web-tv@...`, keep the Babel target set to `react-native-web`:

```json
{
  "plugins": [
    ["react-native-web-tv", { "target": "react-native-web" }]
  ]
}
```

This keeps your application imports unchanged while allowing the plugin to rewrite to the correct package path for optimized bundle output.

The plugin also accepts `commonjs: true` if you need CommonJS output for older bundlers.

---

## Quickstart

This project supports two common starting points:

- building a web-first application specifically for browser-based TV platforms;
- adapting an existing React Native TV or `react-native-tvos` codebase to add a web TV target.

### New web-based TV project

If you are starting a new project specifically for web-based TVs, a lightweight web setup can be a good way to validate package installation, Babel configuration, and focus behavior early.

For TV-specific configuration details (focus behavior, remote key handling, and platform tuning), use the [TV Navigation documentation]({{ '/docs/tv-navigation/' | url }}).

### Create React App

[Create React App](https://github.com/facebook/create-react-app) is a basic way to set up a simple web project for experimentation. It can be useful as a minimal validation environment for package installation and browser-based TV behavior.

```shell
npx create-react-app my-app
cd my-app
npm install react-native-web@npm:{{ site.packageName }}@{{ site.packageVersion }}
npm start
```

### Existing React Native TV (react-native-tvos) app

Use this general flow:

1. Install this fork using either the direct package name or the `react-native-web` npm alias shown above.
2. Configure the Babel plugin `target` to match the package name your app resolves at runtime.
3. Configure your bundler and compiler so `react-native` resolves correctly for the web target.
4. Add a web entry point and any required `.web.js` platform-specific files.
5. Confirm that TV remote keys are registered and delivered to the browser environment.

This is intentionally a high-level flow. Real-world React Native TV apps are often more complex, especially when they depend on third-party libraries or native implementations that require additional web compatibility work.

The rest of the setup is application-specific and depends on your bundler, Babel configuration, dependency graph, and how much of your native TV app is shared with the web target.

For the underlying setup details, continue with:

- [Setup]({{ '/docs/setup/' | url }}) for aliasing, Babel, Jest, Flow, and root element configuration.
- [Multi-platform setup]({{ '/docs/multi-platform/' | url }}) for bundling an existing React Native app for the web.
- [TV Navigation documentation]({{ '/docs/tv-navigation/' | url }}) for remote focus behavior and spatial navigation details.


