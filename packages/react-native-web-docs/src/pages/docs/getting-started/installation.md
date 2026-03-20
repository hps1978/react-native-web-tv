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

---

## 🚀 Out-of-the-box Spatial Navigation for Web-based TV


**Built-in LRUD spatial navigation and remote focus for web-based TV platforms (e.g., Samsung Tizen TV, LG webOS TV, and other browser-based TV environments).**

> **ℹ️ Note:** This package provides built-in spatial navigation logic (LRUD) and remote focus, but your app must ensure that platform-specific remote keys (such as arrow, OK, Back, Menu) are registered and delivered to the browser. On some TV platforms, this requires a one-time setup in your app or hosting environment. Once keys are registered, no extra libraries are needed for spatial navigation.

The spatial navigation layer is integrated and enabled by default once remote key events reach the browser.

For configuration and advanced usage, see the [TV Navigation documentation]({{ '/docs/tv-navigation/' | url }}).

---

React Native for Web can be used for multi-platform and web-only applications. It can be incrementally adopted by existing React Web apps and integrated with existing React Native apps. Preact is also supported.

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
npm install --save-dev babel-plugin-react-native-web
```

---

## Quickstart

### Expo

[Expo](https://expo.dev) is a framework and a platform for universal React applications. [Expo for Web](https://docs.expo.dev/workflow/web/) uses React Native for Web, provides dozens of additional cross-platform APIs, includes web build optimizations, and is compatible with the broader React Native ecosystem. See the Expo docs for more information.

### Create React App

[Create React App](https://github.com/facebook/create-react-app) is a basic way to setup a simple, web-only React app with built-in support for aliasing `react-native-web` to `react-native`. However, it's generally recommended that you use Expo.

```shell
npx create-react-app my-app
cd my-app
npm install react-native-web@npm:{{ site.packageName }}@{{ site.packageVersion }}
npm start
```
