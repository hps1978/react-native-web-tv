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
- [`TVTextScrollView`]({{ '/docs/tv-text-scroll-view' | url }}) for predictable remote-driven paging in text-heavy or low-focusability layouts.
- [`TVEventHandler`]({{ '/docs/tv-event-handler' | url }}) and [`useTVEventHandler`]({{ '/docs/use-tv-event-handler' | url }}) for remote event handling.
- TV focus props on core components such as [`View`]({{ '/docs/view' | url }}), [`Pressable`]({{ '/docs/pressable' | url }}), and [`TextInput`]({{ '/docs/text-input' | url }}).

---

## Notes on compatibility

- `TVEventControl` methods are currently compatibility stubs on web and log warnings.
- Some TV type definitions exist for parity with React Native APIs, but not every prop is fully implemented end-to-end yet.

---

## Guide: Managing screens and headers with navigation libraries

If your app already uses a React-based navigation library such as [React Navigation](https://reactnavigation.org/docs/getting-started), continue using it for routing, stack management, and screen lifecycle.

The TV spatial layer in this project is additive. It helps directional focus move predictably across screen bodies and header areas, especially in web TV runtimes.

> This is still under development and is not a replacement for React-based navigation libraries.

### Screen and header conventions used by spatial navigation

The LRUD integration recognizes screen regions using DOM `id` conventions which can be set using `nativeID` prop:

- Screen root: `nativeID="lrud-screen-<screenName>"`
- Header region(s) for that screen: `nativeID="lrud-screen-<screenName>-<headerName>"`

When these IDs are present, directional navigation applies screen-aware scoping and stays within current screen / header context.

This lets apps model common TV patterns like top tabs, utility actions, and profile/search rows in headers while keeping body focus behavior stable.

### Migration tips for existing React Native tvOS apps

- Keep your existing navigator and screen definitions as-is.
- Add unique `nativeID` values for screen and header wrappers to opt into screen-aware scope.
- When using headers through the navigation libraries make sure to tag all of them with the convention mentioned above to scope them within a required screen.
- Ensure at least one clearly focusable element in every header and body region.

### Best practices

- Keep one unique screen root per route render.
- Keep header containers small and purpose-driven (tabs/actions), not full-page wrappers.
