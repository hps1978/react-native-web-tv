---
title: Introduction to React Native Web for TV
date: Last Modified
permalink: /docs/index.html
eleventyNavigation:
  key: Introduction
  parent: Start
  order: 0
---

{% import "fragments/macros.html" as macro with context %}

:::lead
React Native Web for TV extends React Native Web with TV-first focus navigation, remote input handling, and TV-specific APIs for browser-based TV platforms.
:::

This project is a TV-focused fork and builds on top of multiple foundations:

- **React Native Web (RNW)** provides the core web renderer, component model, styling system, accessibility behavior, and React DOM integration.
- **React Native TV patterns (react-native-tvos / RN TV)** inspire and inform the TV API surface and example parity.
- **TV specific work in this repo** adds web-targeted TV behavior such as LRUD spatial navigation integration and TV-focused exports.

If you are new to the base technology, please start with the upstream React Native Web documentation:

- [React Native Web docs](https://necolas.github.io/react-native-web/docs/)

This documentation is for the TV-specific behavior and APIs added by this fork.

## Modern React

{{ site.name }} is made with modern React APIs including function components and hooks. It builds upon React DOM, making it straight-forward for React DOM apps to incrementally adopt the framework (as was done by Twitter and Flipkart.) The project aims to provide broad compatibility with React alternatives, but will continue to evolve with React as APIs like Concurrent Mode and Server Components are introduced.

## Modern Web

{{ site.name }} makes direct use of native DOM APIs to implement specific features. As the Web platform improves, so does {{ site.name }}. Although certain APIs in the project have remained unchanged since inception, the implementations have become smaller and faster by migrating to new DOM APIs as they became broadly available in browsers.

## Components

{{ site.name }} provides all the core components you'd expect from React Native. You will mostly work with `View`, `Image`, `Text`, `TextInput`, and `ScrollView`. The core components include props for working with interactions, including the advanced gesture [responder system]({{ '/docs/interactions' | url }}). Each component's documentation contains live and editable examples to try out. 

On top of the RNW baseline, this fork adds TV APIs such as `TVFocusGuideView`, `TVEventHandler`, `TVEventControl`, `TVTextScrollView`, and `useTVEventHandler`, along with TV focus props and spatial navigation behavior for remote-style navigation on the web.

## Styles

{{ site.name }} components use JavaScript to author styles which are converted to native CSS. The design of this styling system avoids *all* the [problems with CSS at scale](https://speakerdeck.com/vjeux/react-css-in-js) and produces highly optimized CSS without the need to learn a domain-specific styling language and without the need for specialized tooling that parses markup to remove unused styles.

## Reliable and tested

{{ site.name }} is thoroughly unit and production tested. Significant changes are first published as canary releases to limit regressions and gather feedback from partners. Pull requests record changes to the compressed file size of each module in the library.
This fork continues to run the existing React Native Web test coverage and extends it with additional tests for spatial navigation behavior and TV-specific components/APIs.
