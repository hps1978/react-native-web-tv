---
title: TVEventControl
date: Last Modified
permalink: /docs/tv-event-control/index.html
eleventyNavigation:
  key: TVEventControl
  parent: APIs
---

{% import "fragments/macros.html" as macro with context %}

:::lead
Runtime toggles for OS-level TV remote integration points.
:::

:::callout
**TV relevance:** TV-specific compatibility API. Methods currently exist for API-shape parity and log web not-implemented warnings.
:::

`TVEventControl` mirrors the React Native TV API shape. In this web TV fork these methods are currently present for compatibility and warn that they are not implemented on web.

```js
import { TVEventControl } from 'react-native';

TVEventControl.enableTVMenuKey();
```

---

## API

### Static methods

{% call macro.prop('enableTVMenuKey', '() => void') %}
Compatibility stub. Logs a warning on web.
{% endcall %}

{% call macro.prop('disableTVMenuKey', '() => void') %}
Compatibility stub. Logs a warning on web.
{% endcall %}

{% call macro.prop('enableTVPanGesture', '() => void') %}
Compatibility stub. Logs a warning on web.
{% endcall %}

{% call macro.prop('disableTVPanGesture', '() => void') %}
Compatibility stub. Logs a warning on web.
{% endcall %}

{% call macro.prop('enableGestureHandlersCancelTouches', '() => void') %}
Compatibility stub. Logs a warning on web.
{% endcall %}

{% call macro.prop('disableGestureHandlersCancelTouches', '() => void') %}
Compatibility stub. Logs a warning on web.
{% endcall %}
