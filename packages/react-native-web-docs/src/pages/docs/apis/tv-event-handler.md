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

---

## 🚀 Out-of-the-box Remote Event Support for Web-based TV


**Built-in LRUD spatial navigation and remote event support for web-based TV platforms (e.g., Samsung Tizen TV, LG webOS TV, and other browser-based TV environments).**

> **ℹ️ Note:** This package provides built-in spatial navigation logic (LRUD) and remote event handling, but your app must ensure that platform-specific remote keys (such as arrow, OK, Back, Menu) are registered and delivered to the browser. On some TV platforms, this requires a one-time setup in your app or hosting environment. Once keys are registered, no extra libraries are needed for spatial navigation or remote event handling.

The event pipeline is integrated and enabled by default once remote key events reach the browser.

For configuration and advanced usage, see the [TV Navigation documentation]({{ '/docs/tv-navigation/' | url }}).

---
:::

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
