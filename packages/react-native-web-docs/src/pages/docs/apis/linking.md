---
title: Linking
date: Last Modified
permalink: /docs/linking/index.html
eleventyNavigation:
  key: Linking
  parent: APIs
---

{% import "fragments/macros.html" as macro with context %}

:::lead
Linking gives you a general interface for securely opening external URLs from JavaScript.
:::

:::callout
**TV relevance:** Baseline React Native Web API. Behavior depends on the TV browser/host platform policy (for example popup restrictions and supported URL schemes on Tizen/webOS).
:::


```js
import { Linking } from 'react-native';
```

---

## API

### Static methods

{% call macro.prop('canOpenURL', '(url?: string) => Promise<boolean>') %}
Returns a `Promise<boolean>`. On web this currently resolves `true` and should not be treated as a definitive capability check for TV browser environments.
{% endcall %}

{% call macro.prop('getInitialURL', '() => Promise<string>') %}
Returns a `Promise` that resolves to the page URL that initially loaded the app (`window.location.href`).
{% endcall %}

{% call macro.prop('openURL', '(url, target) => Promise<>') %}
Attempts to open `url` via `window.open(url, target, 'noopener')` (or `window.location` for `tel:` URLs). If `target` is omitted, `_blank` is used. Success and failure remain subject to browser and host-platform policy.
{% endcall %}

---

## Examples

{{ macro.codesandbox('linking') }}
