# SpatialManager Smooth Scrolling

This document explains how smooth scrolling is implemented for TV spatial navigation in React Native Web.

## Overview
When the user navigates with the arrow keys, the SpatialManager determines the next focusable element and ensures it is fully visible inside the nearest scrollable container (or the window if no scrollable ancestor exists). The scroll behavior is coordinated outside the React tree and is driven by DOM measurements.

## How scrolling is triggered
1. A keydown event is received (ArrowUp/ArrowDown/ArrowLeft/ArrowRight).
2. The next focusable element is computed by the LRUD engine.
3. `maybeScrollOnFocus()` runs before focusing the element.
4. The target element’s bounding rect is compared with the visible container rect.
5. If the element is outside the visible area (with padding), the scroll offset is updated to bring it fully into view.

## Scroll target selection
- **Primary**: The closest scrollable ancestor with the correct overflow and scrollable dimension.
- **Fallback**: The window, using a lightweight wrapper that maps `scrollTop`, `scrollLeft`, and `scrollTo()` to `window.scroll`.

## Visibility calculation
The algorithm uses viewport-relative rectangles to avoid mismatched coordinate systems:
- `targetRect` (element’s bounding box)
- `visibleContainerRect` (scroll container clamped to the viewport)

If the target is outside the safe zone (defined by `edgeThresholdPx`), the code computes a delta and applies it to the current scroll offset:
- **Vertical**: scroll down when `targetRect.bottom` exceeds the container’s bottom minus padding; scroll up when `targetRect.top` is above the container’s top plus padding.
- **Horizontal**: same logic with left/right edges.

## Animation
Smooth scrolling is controlled by these options:
- `smoothScrollEnabled`: uses native smooth behavior where supported.
- `scrollAnimationDurationMs`: optional manual animation duration (ms) for both directions.
- `scrollAnimationDurationMsVertical`: optional override for vertical only.
- `scrollAnimationDurationMsHorizontal`: optional override for horizontal only.

If a duration is provided, a `requestAnimationFrame` loop performs the scroll. Use with caution as this may have performance impacts.

## TV Platform Compatibility

The SpatialManager includes **one-time API capability detection at module load** and implements fallbacks for TV platforms with limited API support.

### Detected Capabilities
- **`hasPerformance`**: Checks if `performance.now()` is available
- **`hasRequestAnimationFrame`**: Checks if `requestAnimationFrame` is available
- **`hasGetComputedStyle`**: Checks if `window.getComputedStyle()` is available
- **`hasGetBoundingClientRect`**: Checks if `getBoundingClientRect()` is available

### Fallback Mechanisms

| API | Fallback | Impact |
|-----|----------|--------|
| `performance.now()` | `Date.now()` (milliseconds) | Animation timing less precise but functional |
| `requestAnimationFrame()` | `setTimeout(callback, 16ms)` | Simulates ~60fps; ensures animation works on all platforms |
| `getComputedStyle()` | Inline `style` attribute check | Scroll target detection uses only inline styles if computed styles unavailable |
| `getBoundingClientRect()` | `offsetTop/Left/Height/Width` | Less precise positioning but ensures visibility detection works |

### Helper Functions

- **`getCurrentTime()`**: Returns high-precision time if available, falls back to `Date.now()`
- **`scheduleAnimationFrame(callback)`**: Schedules next frame via `rAF` or `setTimeout`
- **`cancelScheduledFrame(frameId)`**: Cancels scheduled frame using appropriate API

### Compatibility Notes
- Animation always works, but less smoothly on platforms without `rAF`
- Scroll target detection is accurate on modern browsers, approximate on platforms without `getBoundingClientRect`
- The module degrades gracefully: core scrolling functionality is always available, even if some APIs are missing

## Configuration summary

Spatial navigation reads configuration from `window.appConfig` at runtime. The config object supports two top-level keys:

- `keyMap`: Optional LRUD key mapping overrides.
- `scrollConfig`: Scroll behavior settings (listed below).

`scrollConfig` fields:
- `edgeThresholdPx`: Padding around the container edge to keep focused items from hugging the boundary.
- `scrollThrottleMs`: Minimum time between scrolls to avoid rapid repeat scrolling.
- `smoothScrollEnabled`: Enables native smooth behavior when not using manual animation.
- `scrollAnimationDurationMs`: Global animation duration (ms).
- `scrollAnimationDurationMsVertical`: Vertical-only animation duration (ms).
- `scrollAnimationDurationMsHorizontal`: Horizontal-only animation duration (ms).

## Usage Patterns

### Pattern 1: Global Config

```html
<!-- Add before app bundle -->
<script>
  window.appConfig = {
    keyMap: {
        'ArrowLeft': 'left',
        'ArrowRight': 'right',
        'ArrowUp': 'up',
        'ArrowDown': 'down'
    },
    scrollConfig: {
      edgeThresholdPx: 50,
      scrollThrottleMs: 80,
      smoothScrollEnabled: true,
      scrollAnimationDurationMsVertical: 600,
      scrollAnimationDurationMsHorizontal: 200
    }
  };
</script>
<script src="app-bundle.js"></script>
```

### Priority Order
1. `window.appConfig` (if present)
2. Default config (fallback)

## Notes
- The scroll logic runs before `focus()` to avoid browser `scrollIntoView()` interference.
- Window fallback is used when no scrollable ancestor is found.
- The algorithm is symmetric for vertical and horizontal directions.
- API capability checks are performed once at module load, not on every scroll operation.
