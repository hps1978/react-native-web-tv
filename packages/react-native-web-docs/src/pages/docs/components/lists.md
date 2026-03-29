---
title: Lists
date: Last Modified
permalink: /docs/lists/index.html
eleventyNavigation:
  key: Lists
  parent: Components
---

{% import "fragments/macros.html" as macro with context %}

:::lead
Basic support for FlatList, SectionList, and VirtualizedList.
:::

These components are the same JavaScript implementations as those found in React Native. Please refer to the React Native documentation below:

* [FlatList](https://reactnative.dev/docs/flatlist)
* [SectionList](https://reactnative.dev/docs/sectionlist)
* [VirtualizedList](https://reactnative.dev/docs/virtualizedlist)

:::callout
**Performance note.** The baseline React Native list components are not fully optimized for the web, especially for large datasets on web-based TV platforms.

This package already includes active work toward integrating [RecyclerListView](https://github.com/Flipkart/recyclerlistview) through an internal `VirtualizedList` / `FlatList` adapter so higher-performance list rendering can be used through the React Native list surface instead of requiring a separate top-level list component.

At the moment, the adapter runtime path is commented out in the current implementation, so it is not yet available to use or experiment with through the shipped list components.

The integration work is still under development and reflects the direction of this package: improving large-list performance directly within the built-in list APIs for web TV use cases.

Until that integration is fully stabilized and documented as production-ready, external RecyclerListView usage may still be appropriate for some apps.
:::

---

## Examples

{{ macro.codesandbox('lists') }}
