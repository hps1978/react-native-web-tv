---
title: TVFocusGuideView
date: Last Modified
permalink: /docs/tv-focus-guide-view/index.html
eleventyNavigation:
  key: TVFocusGuideView
  parent: Components
---

{% import "fragments/macros.html" as macro with context %}

:::lead
A focus container used to shape directional navigation behavior on TV platforms.
:::

`TVFocusGuideView` is useful when moving from touch-centric layouts to remote-driven layouts where focus order must be explicit.

```jsx
import { TVFocusGuideView } from 'react-native';

<TVFocusGuideView autoFocus trapFocusLeft trapFocusRight>
  {children}
</TVFocusGuideView>;
```

---

## API

### Props

{% call macro.prop('...ViewProps') %}
All [View]({{ '/docs/view' | url }}) props are supported.
{% endcall %}

{% call macro.prop('enabled', '?boolean = true') %}
Controls visibility (`display: flex` when `true`, `display: none` when `false`).
{% endcall %}

{% call macro.prop('destinations', '?Array<ComponentOrHandle>') %}
Ordered list of focus destinations used by the spatial manager.
{% endcall %}

{% call macro.prop('autoFocus', '?boolean') %}
Enables autofocus behavior for this container.
{% endcall %}

{% call macro.prop('focusable', '?boolean') %}
When set to `false`, the container and its subtree are treated as not focusable.
{% endcall %}

{% call macro.prop('trapFocusUp', '?boolean') %}
Blocks exiting this container upward during directional navigation.
{% endcall %}

{% call macro.prop('trapFocusDown', '?boolean') %}
Blocks exiting this container downward during directional navigation.
{% endcall %}

{% call macro.prop('trapFocusLeft', '?boolean') %}
Blocks exiting this container to the left during directional navigation.
{% endcall %}

{% call macro.prop('trapFocusRight', '?boolean') %}
Blocks exiting this container to the right during directional navigation.
{% endcall %}

{% call macro.prop('safePadding', "?'vertical' | 'horizontal' | 'both' | null") %}
Deprecated compatibility prop.
{% endcall %}

### Instance methods

{% call macro.prop('setDestinations', '(destinations: Array<ComponentOrHandle>) => void') %}
Imperatively updates the destination targets used by this focus guide.
{% endcall %}

---

## Examples

{{ macro.codesandbox('tv-focus-guide-view') }}
