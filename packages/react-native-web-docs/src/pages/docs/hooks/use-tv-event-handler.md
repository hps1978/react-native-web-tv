---
title: useTVEventHandler
date: Last Modified
permalink: /docs/use-tv-event-handler/index.html
eleventyNavigation:
  key: useTVEventHandler
  parent: Hooks
---

{% import "fragments/macros.html" as macro with context %}

:::lead
React Hook for subscribing to TV remote events.
:::

`useTVEventHandler` provides a declarative wrapper around `TVEventHandler.addListener`. The subscription is created on mount and removed automatically on unmount.

```js
import { useTVEventHandler } from 'react-native';

function Screen() {
  useTVEventHandler((event) => {
    if (event.eventType === 'left') {
      // handle left navigation intent
    }
  });

  return null;
}
```

---

## API

### Arguments

{% call macro.prop('handler', '(event: TVRemoteEvent) => void') %}
Callback that receives each TV remote event emitted by the runtime.
{% endcall %}

### Returns

This hook does not return a value.

---

## Related APIs

- [`TVEventHandler`]({{ '/docs/tv-event-handler' | url }})
