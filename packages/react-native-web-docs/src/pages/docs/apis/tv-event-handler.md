---
title: TVEventHandler
date: Last Modified
permalink: /docs/tv-event-handler/index.html
eleventyNavigation:
  key: TVEventHandler
  parent: APIs
---

{% import "fragments/macros.html" as macro with context %}

:::lead
Subscribe to remote control key events on TV platforms.
:::

:::callout
**TV relevance:** TV-specific API. Primary low-level event subscription surface for TV remote input.
:::

---

## Remote Events On Web TV

`react-native-web-tv` includes built-in TV focus navigation (LRUD) and remote input handling for browser-based TV environments.

`TVEventHandler` is the low-level event stream for custom handling (for example global shortcuts or app-specific Back/Menu behavior).

> **ℹ️ Note:** Your app or host platform must register remote keys (arrow, OK/Enter, Back, Menu) so those key events reach the browser. Once key delivery is configured, no additional remote-event library is required.

For configuration and advanced usage, see the [TV Navigation documentation]({{ '/docs/tv-navigation/' | url }}).

---

`TVEventHandler` exposes a low-level listener API for hardware remote events.

```js
import { TVEventHandler } from 'react-native';

const subscription = TVEventHandler.addListener((event) => {
  console.log(event.eventType);
});

// Later
subscription.remove();
```

---

## API

### Static methods

{% call macro.prop('addListener', '(callback: (event: TVRemoteEvent) => void) => EventSubscription') %}
Registers a TV remote event listener and returns an `EventSubscription` with a `remove()` method.
{% endcall %}

### TVRemoteEvent

{% call macro.prop('eventType', 'string') %}
Event name emitted by the remote input pipeline (for example directional press events).
{% endcall %}

{% call macro.prop('eventKeyAction', '?string') %}
Optional action value attached to the event payload.
{% endcall %}

{% call macro.prop('tag', '?number') %}
Optional node tag associated with the current focus target.
{% endcall %}

{% call macro.prop('target', '?number') %}
Optional native target id associated with the event.
{% endcall %}

{% call macro.prop('body', '?any') %}
Optional platform-specific payload.
{% endcall %}

---

## Related APIs

- [`useTVEventHandler`]({{ '/docs/use-tv-event-handler' | url }})
- [`TVEventControl`]({{ '/docs/tv-event-control' | url }})
