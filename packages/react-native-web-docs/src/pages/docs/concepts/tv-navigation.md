---
title: TV Navigation
date: Last Modified
permalink: /docs/tv-navigation/index.html
eleventyNavigation:
  key: TV Navigation
  parent: Concepts
---

{% import "fragments/macros.html" as macro with context %}

:::lead
TV-first focus and remote navigation for web-based TV platforms.
:::

This fork extends React Native for Web with APIs inspired by React Native tvOS, targeting web TV environments such as Samsung and LG browser runtimes.

## Scope

- React Native tvOS targets native Apple TV and Android/Google TV runtimes.
- This fork targets browser-based TV runtimes where navigation is driven by remote key events and spatial focus.
- The goal is API-level familiarity where possible, with web-specific implementation details.

---

## Primary building blocks

- [`TVFocusGuideView`]({{ '/docs/tv-focus-guide-view' | url }}) for focus groups, traps, and destination routing.
- [`TVEventHandler`]({{ '/docs/tv-event-handler' | url }}) and [`useTVEventHandler`]({{ '/docs/use-tv-event-handler' | url }}) for remote event handling.
- TV focus props on core components such as [`View`]({{ '/docs/view' | url }}), [`Pressable`]({{ '/docs/pressable' | url }}), and [`TextInput`]({{ '/docs/text-input' | url }}).

---

## Notes on compatibility

- `TVEventControl` methods are currently compatibility stubs on web and log warnings.
- Some TV type definitions exist for parity with React Native APIs, but not every prop is fully implemented end-to-end yet.
