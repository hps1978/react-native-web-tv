---
title: Vibration
date: Last Modified
permalink: /docs/vibration/index.html
eleventyNavigation:
  key: Vibration
  parent: APIs
---

{% import "fragments/macros.html" as macro with context %}

:::lead
Vibration is described as a pattern of on-off pulses, which may be of varying lengths.
:::

:::callout
**TV relevance:** Baseline React Native Web API, but typically not useful on smart TV browser runtimes. Most TV targets (including common Tizen/webOS browser environments) do not provide practical vibration support.
:::

The vibration pattern may consist of either a single integer, describing the number of milliseconds to vibrate, or an array of integers describing a pattern of vibrations and pauses. Vibration is controlled with a single method: `Vibration.vibrate()`.

```js
import { Vibration } from 'react-native';
```

---

## API

### Static methods

{% call macro.prop('cancel', '() => void') %}
Stop the vibration
{% endcall %}

{% call macro.prop('vibrate', '(number | Array<number>) => void') %}
Start the vibration pattern
{% endcall %}
