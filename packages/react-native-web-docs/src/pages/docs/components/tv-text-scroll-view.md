---
title: TVTextScrollView
date: Last Modified
permalink: /docs/tv-text-scroll-view/index.html
eleventyNavigation:
  key: TVTextScrollView
  parent: Components
---

{% import "fragments/macros.html" as macro with context %}

:::lead
A TV-oriented scroll container for long-form content where directional keys should page through content predictably.
:::

`TVTextScrollView` is useful for content-heavy surfaces with limited focusable children, where TV remotes should still provide consistent up/down (or left/right) paging behavior.

```jsx
import { TVTextScrollView } from 'react-native';

<TVTextScrollView
  scrollDuration={0.3}
  pageSize={320}
  snapToStart
  snapToEnd
>
  {children}
</TVTextScrollView>;
```

---

## API

### Props

{% call macro.prop('...ScrollViewProps') %}
All [ScrollView]({{ '/docs/scroll-view' | url }}) props are supported.
{% endcall %}

{% call macro.prop('scrollDuration', '?number = 0.3') %}
Duration of each directional scroll animation, in seconds.
{% endcall %}

{% call macro.prop('pageSize', '?number') %}
Distance scrolled per directional action, in pixels. When not provided, defaults to approximately half of the visible viewport in the active axis.
{% endcall %}

{% call macro.prop('snapToStart', '?boolean = true') %}
Allows snapping to the start edge when directional movement exits past the beginning of content.
{% endcall %}

{% call macro.prop('snapToEnd', '?boolean = true') %}
Allows snapping to the end edge when directional movement exits past the end of content.
{% endcall %}

{% call macro.prop('onFocus', '?(event: Event) => void') %}
Called when the scroll view receives TV focus.
{% endcall %}

{% call macro.prop('onBlur', '?(event: Event) => void') %}
Called when the scroll view loses TV focus.
{% endcall %}

### Notes

- Designed for TV directional input behavior.
- Works with SpatialManager key routing in this fork.
- Supports vertical and horizontal usage through `horizontal` from ScrollView props.
