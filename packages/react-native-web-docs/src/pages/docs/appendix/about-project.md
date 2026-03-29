---
title: About the project
date: Last Modified
permalink: /docs/about-project/index.html
description:
eleventyNavigation:
  key: About the project
  parent: Appendix
  order: 2
---

:::lead
{{ site.name }}'s origins, evolution, and development.
:::

This project builds on top of React Native Web.

React Native Web was started in 2015 by [Nicolas Gallagher](http://nicolasgallagher.com) during the development of [Twitter's Progressive Web App](https://blog.twitter.com/engineering/en_us/topics/open-source/2017/how-we-built-twitter-lite.html). Over time, it evolved into a mature compatibility layer between React DOM and React Native and is widely used in production web apps.

`react-native-web-tv` is a TV-focused fork that preserves the React Native Web baseline while adding browser-TV behavior and APIs, including remote-input integration, LRUD-based focus navigation, and TV-specific exports.

The goal of this fork is practical compatibility for web-based TV runtimes while keeping upstream alignment maintainable over time.

Please browse the [source code]({{ site.githubUrl }}) and consider contributing your experience, especially around TV runtime behavior, remote input, and focus/navigation edge cases.
