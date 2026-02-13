/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * 
 * @format
 */

// API capability detection (one-time check at module load).
// TV platforms may lack modern APIs, so we detect and fall back gracefully.
// This avoids repeated try-catch blocks on every scroll operation.
var hasPerformance = typeof performance !== 'undefined' && typeof performance.now === 'function';
var hasRequestAnimationFrame = typeof requestAnimationFrame === 'function';
var hasGetComputedStyle = typeof window !== 'undefined' && typeof window.getComputedStyle === 'function';
var hasGetBoundingClientRect = typeof Element !== 'undefined' && Element.prototype.getBoundingClientRect !== undefined;
var hasScrollEndEvent = false;
//   typeof window !== 'undefined' &&
//   'onscrollend' in window;

var DEBUG_SCROLL = () => typeof window !== 'undefined' && window.__RNW_TV_SCROLL_DEBUG === true;
var DEFAULT_SPATIAL_SCROLL_CONFIG = {
  edgeThresholdPx: 128,
  scrollThrottleMs: 80,
  smoothScrollEnabled: true,
  scrollAnimationDurationMs: 0,
  scrollAnimationDurationMsVertical: 0,
  scrollAnimationDurationMsHorizontal: 0
};
function getCurrentTime() {
  return hasPerformance ? performance.now() : Date.now();
}
function scheduleAnimationFrame(callback) {
  if (hasRequestAnimationFrame) {
    return requestAnimationFrame(callback);
  }
  // Fallback: simulate 60fps with setTimeout (16ms per frame)
  return setTimeout(callback, 16);
}
function cancelScheduledFrame(frameId) {
  if (hasRequestAnimationFrame) {
    cancelAnimationFrame(frameId);
  } else {
    clearTimeout(frameId);
  }
}
function animateScrollTo(scrollable, isVertical, nextOffset, durationMs, scrollState) {
  var startOffset = isVertical ? scrollable.scrollTop : scrollable.scrollLeft;
  var delta = nextOffset - startOffset;
  if (delta === 0 || durationMs <= 0) return;
  if (scrollState.scrollAnimationFrame != null) {
    cancelScheduledFrame(scrollState.scrollAnimationFrame);
    scrollState.scrollAnimationFrame = null;
  }
  var startTime = getCurrentTime();
  var step = now => {
    var elapsed = hasPerformance ? now - startTime : Date.now() - startTime;
    var t = Math.min(1, elapsed / durationMs);
    var value = startOffset + delta * t;
    if (typeof scrollable.scrollTo === 'function') {
      if (isVertical) {
        scrollable.scrollTo({
          y: value,
          animated: false
        });
      } else {
        scrollable.scrollTo({
          x: value,
          animated: false
        });
      }
    } else if (isVertical) {
      scrollable.scrollTop = value;
    } else {
      scrollable.scrollLeft = value;
    }
    if (t < 1) {
      scrollState.scrollAnimationFrame = scheduleAnimationFrame(() => step(hasPerformance ? performance.now() : Date.now()));
    } else {
      scrollState.scrollAnimationFrame = null;
    }
  };
  scrollState.scrollAnimationFrame = scheduleAnimationFrame(() => step(hasPerformance ? performance.now() : Date.now()));
}
function getScrollDurationMs(scrollConfig, isVertical) {
  var directionDurationMs = isVertical ? scrollConfig.scrollAnimationDurationMsVertical : scrollConfig.scrollAnimationDurationMsHorizontal;
  return directionDurationMs != null ? directionDurationMs : scrollConfig.scrollAnimationDurationMs || 0;
}
function getScrollPosition(scrollable, isVertical, isWindowScroll) {
  if (isWindowScroll) {
    return isVertical ? window.scrollY : window.scrollX;
  }
  return isVertical ? scrollable.scrollTop : scrollable.scrollLeft;
}

// Calculate if and how much to scroll to keep an element visible within its container.
// Uses edge threshold (edgeThresholdPx) to maintain padding from container boundaries.
// Returns: { needsScroll: boolean, scrollDelta: number (in pixels) }
function getAxisScrollDelta(targetRect, visibleContainerRect, axis) {
  if (axis === 'vertical') {
    var targetHeight = targetRect.bottom - targetRect.top;
    var visibleHeight = visibleContainerRect.bottom - visibleContainerRect.top;
    if (targetHeight > visibleHeight) {
      var delta = targetRect.top - visibleContainerRect.top;
      return {
        needsScroll: delta !== 0,
        scrollDelta: delta
      };
    }
    if (targetRect.top < visibleContainerRect.top) {
      var _delta = targetRect.top - visibleContainerRect.top;
      return {
        needsScroll: true,
        scrollDelta: _delta
      };
    }
    if (targetRect.bottom > visibleContainerRect.bottom) {
      var _delta2 = targetRect.bottom - visibleContainerRect.bottom;
      return {
        needsScroll: true,
        scrollDelta: _delta2
      };
    }
    return {
      needsScroll: false,
      scrollDelta: 0
    };
  }
  var targetWidth = targetRect.right - targetRect.left;
  var visibleWidth = visibleContainerRect.right - visibleContainerRect.left;
  if (targetWidth > visibleWidth) {
    var _delta3 = targetRect.left - visibleContainerRect.left;
    return {
      needsScroll: _delta3 !== 0,
      scrollDelta: _delta3
    };
  }
  if (targetRect.left < visibleContainerRect.left) {
    var _delta4 = targetRect.left - visibleContainerRect.left;
    return {
      needsScroll: true,
      scrollDelta: _delta4
    };
  }
  if (targetRect.right > visibleContainerRect.right) {
    var _delta5 = targetRect.right - visibleContainerRect.right;
    return {
      needsScroll: true,
      scrollDelta: _delta5
    };
  }
  return {
    needsScroll: false,
    scrollDelta: 0
  };
}
function waitForScrollSettle(scrollable, isVertical, isWindowScroll) {
  var maxWaitMs = 500;
  var lastPos = getScrollPosition(scrollable, isVertical, isWindowScroll);
  var stableFrames = 0;
  var start = getCurrentTime();
  return new Promise(resolve => {
    var step = () => {
      var currentPos = getScrollPosition(scrollable, isVertical, isWindowScroll);
      if (Math.abs(currentPos - lastPos) < 0.5) {
        stableFrames += 1;
      } else {
        stableFrames = 0;
      }
      lastPos = currentPos;
      if (stableFrames >= 2 || getCurrentTime() - start > maxWaitMs) {
        resolve();
        return;
      }
      scheduleAnimationFrame(step);
    };
    scheduleAnimationFrame(step);
  });
}
function logScrollContainer(label, scrollableInfo, elem) {
  var scrollable = scrollableInfo.scrollable,
    isWindowScroll = scrollableInfo.isWindowScroll;
  if (isWindowScroll) {
    var _document$documentEle;
    console.log('[SpatialManager][scroll] container ' + label, {
      isWindowScroll: true,
      scrollTop: window.scrollY,
      scrollHeight: (_document$documentEle = document.documentElement) == null ? void 0 : _document$documentEle.scrollHeight,
      clientHeight: window.innerHeight
    });
    return;
  }
  var style = hasGetComputedStyle ? window.getComputedStyle(scrollable) : null;
  console.log('[SpatialManager][scroll] container ' + label, {
    isWindowScroll: false,
    sameAsTarget: scrollable === elem,
    tagName: scrollable.tagName,
    id: scrollable.id,
    className: scrollable.className,
    overflowY: style == null ? void 0 : style.overflowY,
    overflowX: style == null ? void 0 : style.overflowX,
    scrollTop: scrollable.scrollTop,
    scrollHeight: scrollable.scrollHeight,
    clientHeight: scrollable.clientHeight
  });
}
function scrollAxis(params) {
  var scrollable = params.scrollable,
    isWindowScroll = params.isWindowScroll,
    isVertical = params.isVertical,
    scrollDelta = params.scrollDelta;
  if (scrollDelta === 0) {
    return Promise.resolve();
  }
  var currentOffset = getScrollPosition(scrollable, isVertical, isWindowScroll);
  var maxOffset = isVertical ? Math.max(0, scrollable.scrollHeight - scrollable.clientHeight) : Math.max(0, scrollable.scrollWidth - scrollable.clientWidth);
  var liveOffset = currentOffset;
  var liveNextOffset = isWindowScroll ? Math.min(Math.max(liveOffset + scrollDelta, 0), maxOffset) : Math.max(liveOffset + scrollDelta, 0);
  var nextOffset = calculateNextOffset(currentOffset, scrollDelta, isWindowScroll, maxOffset);
  performScroll(scrollable, isVertical, params.scrollConfig, params.scrollState, nextOffset, liveNextOffset);
  var durationMs = getScrollDurationMs(params.scrollConfig, isVertical);
  if (durationMs > 0) {
    return new Promise(resolve => {
      setTimeout(resolve, durationMs);
    });
  }
  return waitForScrollSettle(scrollable, isVertical, isWindowScroll);
}
function findScrollableAncestor(elem, direction) {
  var current = elem ? elem.parentElement : null;
  while (current) {
    var overflowY = '';
    var overflowX = '';
    if (hasGetComputedStyle) {
      var style = window.getComputedStyle(current);
      overflowY = style.overflowY;
      overflowX = style.overflowX;
    } else {
      // Fallback: check inline styles only
      overflowY = current.style.overflowY || '';
      overflowX = current.style.overflowX || '';
    }
    var canScrollY = (overflowY === 'auto' || overflowY === 'scroll' || overflowY === 'overlay') && current.scrollHeight > current.clientHeight;
    var canScrollX = (overflowX === 'auto' || overflowX === 'scroll' || overflowX === 'overlay') && current.scrollWidth > current.clientWidth;
    if (direction === 'vertical' && canScrollY || direction === 'horizontal' && canScrollX) {
      return current;
    }
    if (current === document.body || current === document.documentElement) {
      break;
    }
    current = current.parentElement;
  }
  return null;
}
function resolveScrollable(elem, direction) {
  var scrollable = findScrollableAncestor(elem, direction);
  var isWindowScroll = !scrollable;
  if (isWindowScroll) {
    scrollable = {
      scrollTop: window.scrollY,
      scrollLeft: window.scrollX,
      clientHeight: window.innerHeight,
      clientWidth: window.innerWidth,
      scrollHeight: document.documentElement.scrollHeight,
      scrollWidth: document.documentElement.scrollWidth,
      getBoundingClientRect: () => ({
        top: 0,
        left: 0,
        bottom: window.innerHeight,
        right: window.innerWidth
      }),
      scrollTo: options => {
        var scrollParam = {
          top: options.y !== undefined ? options.y : window.scrollY,
          left: options.x !== undefined ? options.x : window.scrollX,
          behavior: options.animated ? 'smooth' : 'auto'
        };
        window.scroll ? window.scroll(scrollParam) : window.scrollTo(scrollParam);
      }
    };
  }
  return {
    scrollable,
    isWindowScroll
  };
}

// Resolve element and container rectangles, clamping to viewport for accuracy.
// Important: bounding rects are viewport-relative, not document-relative.
// This avoids coordinate system mismatches when scrolling.
function resolveRects(scrollable, isWindowScroll, elem) {
  var containerRect;
  var targetRect;
  if (hasGetBoundingClientRect) {
    containerRect = scrollable.getBoundingClientRect();
    targetRect = elem.getBoundingClientRect();
  } else {
    // Fallback: use offset dimensions (less precise, but better than nothing)
    containerRect = {
      top: scrollable.offsetTop || 0,
      left: scrollable.offsetLeft || 0,
      bottom: (scrollable.offsetTop || 0) + (scrollable.offsetHeight || 0),
      right: (scrollable.offsetLeft || 0) + (scrollable.offsetWidth || 0)
    };
    targetRect = {
      top: elem.offsetTop || 0,
      left: elem.offsetLeft || 0,
      bottom: (elem.offsetTop || 0) + (elem.offsetHeight || 0),
      right: (elem.offsetLeft || 0) + (elem.offsetWidth || 0)
    };
  }
  var viewportRect = {
    top: 0,
    bottom: window.innerHeight,
    left: 0,
    right: window.innerWidth
  };

  // Clamp container rect to viewport bounds so we don't scroll outside the visible area.
  // This is critical for accurate visibility detection when container is partially off-screen.
  var visibleContainerRect = isWindowScroll ? viewportRect : {
    top: Math.max(containerRect.top, viewportRect.top),
    bottom: Math.min(containerRect.bottom, viewportRect.bottom),
    left: Math.max(containerRect.left, viewportRect.left),
    right: Math.min(containerRect.right, viewportRect.right)
  };
  return {
    containerRect,
    targetRect,
    visibleContainerRect,
    viewportRect
  };
}
function performScroll(scrollable, isVertical, scrollConfig, scrollState, nextOffset, liveNextOffset) {
  var directionDurationMs = isVertical ? scrollConfig.scrollAnimationDurationMsVertical : scrollConfig.scrollAnimationDurationMsHorizontal;
  var durationMs = directionDurationMs != null ? directionDurationMs : scrollConfig.scrollAnimationDurationMs || 0;
  if (durationMs > 0) {
    animateScrollTo(scrollable, isVertical, liveNextOffset, durationMs, scrollState);
    return;
  }
  if (typeof scrollable.scrollTo === 'function') {
    if (isVertical) {
      scrollable.scrollTo({
        y: nextOffset,
        animated: scrollConfig.smoothScrollEnabled !== false
      });
    } else {
      scrollable.scrollTo({
        x: nextOffset,
        animated: scrollConfig.smoothScrollEnabled !== false
      });
    }
  } else if (isVertical) {
    scrollable.scrollTop = nextOffset;
  } else {
    scrollable.scrollLeft = nextOffset;
  }
}
function calculateNextOffset(currentOffset, scrollDelta, isWindowScroll, maxOffset) {
  if (isWindowScroll) {
    return Math.min(currentOffset + scrollDelta, maxOffset);
  }
  return currentOffset + scrollDelta;
}
// Flag to track if the current scroll was initiated by SpatialManager
// Checked in the scrollend event to determine if focus reacquisition is needed
var isSpatialManagerInitiatedScroll = false;

// Debounce timer for fallback scroll handler (when scrollend not available)
var reacquireFocusTimeout = null;

/**
 * Mark that a scroll is being initiated by SpatialManager (for focus).
 * The flag will be checked in the scrollend event handler.
 */
function markSpatialManagerScroll() {
  isSpatialManagerInitiatedScroll = true;
}

/**
 * Unmark SpatialManager-initiated scroll (called after scrollend event processes it).
 */
function unmarkSpatialManagerScroll() {
  isSpatialManagerInitiatedScroll = false;
}
export function createScrollState() {
  return {
    lastScrollAt: 0,
    scrollAnimationFrame: null
  };
}

/**
 * Check if an element is visible within its scrollable container's viewport.
 * Used to determine if current focus is still in view after a scroll.
 */
export function isElementVisible(elem, scrollContainer) {
  if (!elem || !hasGetBoundingClientRect) {
    return true; // Assume visible if we can't measure
  }
  try {
    var elemRect = elem.getBoundingClientRect();
    if (scrollContainer) {
      var containerRect = scrollContainer.getBoundingClientRect();
      return elemRect.top < containerRect.bottom && elemRect.bottom > containerRect.top && elemRect.left < containerRect.right && elemRect.right > containerRect.left;
    }

    // Default: check against viewport
    var viewportHeight = window.innerHeight || document.documentElement.clientHeight;
    var viewportWidth = window.innerWidth || document.documentElement.clientWidth;
    return elemRect.top < viewportHeight && elemRect.bottom > 0 && elemRect.left < viewportWidth && elemRect.right > 0;
  } catch (e) {
    return true; // Safe fallback
  }
}

/**
 * Reacquire focus after app-initiated scroll.
 * If current focus is no longer visible, find the best candidate within the scrolled container.
 * This is called after the scroll settles (debounced).
 */
export function reacquireFocusAfterScroll(currentFocusElem, scrollContainer, options) {
  if (!currentFocusElem) {
    return;
  }

  // If current focus is still visible, no need to refocus
  if (isElementVisible(currentFocusElem, scrollContainer || undefined)) {
    return;
  }

  // Current focus is out of view. We'll let LRUD logic pick the next focus
  // by using 'ArrowDown' as a neutral direction signal (not a real navigation)
  // The spatial algorithm will find the best visible candidate.
  // For now, we defer this to SpatialManager via the callback
  // (actual LRUD call will happen there with proper context)
}

/**
 * Setup global scroll listener to handle app-initiated scrolls.
 * Uses scrollend event when available (modern browsers), falls back to debounced scroll listener.
 *
 * Key pattern:
 * - SpatialManager marks its scrolls via isSpatialManagerInitiatedScroll
 * - Scroll event fires (either scrollend or debounced scroll)
 * - If SpatialManager initiated: skip reacquisition (we already have focus control)
 * - If app initiated: check if current focus is out of view and reacquire if needed
 *
 * This allows SpatialManager scrolls to be clean while gracefully handling app scrolls.
 */
export function setupAppInitiatedScrollHandler(container, options) {
  var handleScrollEnd = e => {
    // If SpatialManager initiated this scroll, it already handled focus
    if (isSpatialManagerInitiatedScroll) {
      unmarkSpatialManagerScroll();
      return;
    }
    var currentFocus = options.getCurrentFocus();
    if (!currentFocus || !currentFocus.elem) {
      return;
    }
    var target = e == null ? void 0 : e.target;
    var scrollContainer = target && target !== window && target !== document && target !== document.documentElement ? target : null;
    if (isElementVisible(currentFocus.elem, scrollContainer || undefined)) {
      return;
    }

    // App-initiated scroll - focused element is now out of view
    options.onScrollRefocus({
      currentFocus,
      scrollContainer
    });
  };
  var handleScrollFallback = e => {
    // Debounce: only process after scroll has settled (100ms idle)
    if (reacquireFocusTimeout != null) {
      clearTimeout(reacquireFocusTimeout);
    }
    reacquireFocusTimeout = setTimeout(() => {
      handleScrollEnd(e);
      reacquireFocusTimeout = null;
    }, 100);
  };
  if (typeof window !== 'undefined') {
    if (hasScrollEndEvent) {
      // Modern approach: use scrollend event
      window.addEventListener('scrollend', handleScrollEnd, {
        passive: true
      });
    } else {
      // Fallback: debounced scroll listener
      window.addEventListener('scroll', handleScrollFallback, {
        passive: true,
        capture: true
      });
    }
  }

  // Return cleanup function
  return () => {
    if (typeof window !== 'undefined') {
      if (hasScrollEndEvent) {
        window.removeEventListener('scrollend', handleScrollEnd);
      } else {
        window.removeEventListener('scroll', handleScrollFallback, {
          capture: true
        });
      }
    }
    if (reacquireFocusTimeout != null) {
      clearTimeout(reacquireFocusTimeout);
      reacquireFocusTimeout = null;
    }
  };
}

/**
 * Scroll to align target element for AlignLeft mode.
 *
 * Behavior:
 * - ArrowRight: Align target's left edge to current focus X position (if scrollable space allows)
 * - ArrowLeft, ArrowUp, ArrowDown: Use default visibility behavior (keep in view)
 * - Vertical: Always uses default behavior regardless of direction
 *
 * Key insight: AlignLeft creates a fixed X position where focus appears to stay while
 * content scrolls left/right. But at content boundaries, we fall back to default behavior
 * to avoid breaking visual alignment of the original focus element.
 */
function scrollToAlignLeft(elem, keyCode, currentElem, scrollConfig, scrollState) {
  if (!elem || typeof window === 'undefined') return;
  if (DEBUG_SCROLL()) {
    try {
      var curRect = currentElem == null || currentElem.getBoundingClientRect == null ? void 0 : currentElem.getBoundingClientRect();
      var nextRect = elem.getBoundingClientRect();
      console.log('[SpatialManager][scroll] AlignLeft input', {
        keyCode,
        currentId: currentElem == null ? void 0 : currentElem.id,
        nextId: elem.id,
        curRect,
        nextRect
      });
    } catch (e) {
      console.log('[SpatialManager][scroll] AlignLeft input', {
        keyCode,
        currentId: currentElem == null ? void 0 : currentElem.id,
        nextId: elem.id,
        error: String(e)
      });
    }
  }
  var now = Date.now();
  if (scrollConfig.scrollThrottleMs != null) {
    if (now - scrollState.lastScrollAt < scrollConfig.scrollThrottleMs) {
      return null;
    }
  }
  var verticalScroll = resolveScrollable(elem, 'vertical');
  var horizontalScroll = resolveScrollable(elem, 'horizontal');
  var computeAlignLeftDeltas = () => {
    var verticalRects = resolveRects(verticalScroll.scrollable, verticalScroll.isWindowScroll, elem);
    var horizontalRects = resolveRects(horizontalScroll.scrollable, horizontalScroll.isWindowScroll, elem);
    var currentRect = currentElem == null || currentElem.getBoundingClientRect == null ? void 0 : currentElem.getBoundingClientRect();
    var horizontalDelta = 0;
    var needsHorizontalScroll = false;
    if (keyCode === 'ArrowRight' && currentRect) {
      // On right navigation: try to align target's left edge to current focus X position.
      // This keeps focus visually fixed while content scrolls underneath.
      var desiredDelta = horizontalRects.targetRect.left - currentRect.left;
      var scrollable = horizontalScroll.scrollable;
      var currentScroll = getScrollPosition(scrollable, false, horizontalScroll.isWindowScroll);
      var maxScroll = Math.max(0, scrollable.scrollWidth - scrollable.clientWidth);

      // Critical boundary check: can we achieve alignment without exceeding max scroll?
      // This prevents breaking alignment at content boundaries (e.g., last item in list).
      var canAchieveAlignment = currentScroll + desiredDelta <= maxScroll;
      if (canAchieveAlignment) {
        // Enough space: apply alignment scroll
        horizontalDelta = desiredDelta;
        needsHorizontalScroll = desiredDelta !== 0;
      } else {
        // Not enough space: gracefully fall back to default visibility.
        // This prevents forcing a scroll that would break existing focus alignment.
        var horizontal = getAxisScrollDelta(horizontalRects.targetRect, horizontalRects.visibleContainerRect, 'horizontal');
        horizontalDelta = horizontal.scrollDelta;
        needsHorizontalScroll = horizontal.needsScroll;
      }
    } else {
      var _horizontal = getAxisScrollDelta(horizontalRects.targetRect, horizontalRects.visibleContainerRect, 'horizontal');
      horizontalDelta = _horizontal.scrollDelta;
      needsHorizontalScroll = _horizontal.needsScroll;
    }

    // Vertical: use default behavior (keep visible with edge threshold)
    var vertical = getAxisScrollDelta(verticalRects.targetRect, verticalRects.visibleContainerRect, 'vertical');
    return {
      horizontalDelta,
      verticalDelta: vertical.scrollDelta,
      verticalRects,
      horizontalRects,
      needsHorizontalScroll,
      needsVerticalScroll: vertical.needsScroll
    };
  };
  if (DEBUG_SCROLL()) {
    logScrollContainer('vertical', verticalScroll, elem);
    logScrollContainer('horizontal', horizontalScroll, elem);
  }
  var initial = computeAlignLeftDeltas();
  if (DEBUG_SCROLL()) {
    console.log('[SpatialManager][scroll] AlignLeft deltas', {
      horizontalDelta: initial.horizontalDelta,
      verticalDelta: initial.verticalDelta,
      needsHorizontalScroll: initial.needsHorizontalScroll,
      needsVerticalScroll: initial.needsVerticalScroll
    });
  }
  if (!initial.needsHorizontalScroll && !initial.needsVerticalScroll) {
    return null;
  }
  scrollState.lastScrollAt = now;
  markSpatialManagerScroll();
  var runAxis = (axis, delta) => {
    if (delta === 0) {
      return Promise.resolve();
    }
    var scrollInfo = axis === 'vertical' ? verticalScroll : horizontalScroll;
    return scrollAxis({
      scrollable: scrollInfo.scrollable,
      isWindowScroll: scrollInfo.isWindowScroll,
      isVertical: axis === 'vertical',
      scrollDelta: delta,
      scrollConfig,
      scrollState
    });
  };
  if (initial.needsHorizontalScroll && initial.needsVerticalScroll) {
    // Both axes need scrolling: prioritize horizontal (AlignLeft alignment) first.
    // After horizontal scroll settles, recompute deltas to see if vertical is still needed.
    // Sequential approach prevents conflicting scroll operations.
    return runAxis('horizontal', initial.horizontalDelta).then(() => {
      var after = computeAlignLeftDeltas();
      if (!after.needsVerticalScroll) {
        return;
      }
      return runAxis('vertical', after.verticalDelta);
    });
  }
  if (initial.needsHorizontalScroll) {
    return runAxis('horizontal', initial.horizontalDelta);
  }
  return runAxis('vertical', initial.verticalDelta);
}

// Main entry point for scroll-on-focus logic.
// Dispatches to AlignLeft or default behavior based on focusMode.
// - AlignLeft: right aligns to current focus X, other directions use default
// - default: always use standard visibility behavior
export function maybeScrollOnFocus(elem, keyCode, currentElem, scrollConfig, scrollState, focusMode) {
  if (focusMode === 'AlignLeft') {
    return scrollToAlignLeft(elem, keyCode, currentElem, scrollConfig, scrollState);
  }

  // Default behavior
  if (!elem || typeof window === 'undefined') return;
  if (DEBUG_SCROLL()) {
    try {
      var curRect = currentElem == null || currentElem.getBoundingClientRect == null ? void 0 : currentElem.getBoundingClientRect();
      var nextRect = elem.getBoundingClientRect();
      console.log('[SpatialManager][scroll] input', {
        keyCode,
        currentId: currentElem == null ? void 0 : currentElem.id,
        nextId: elem.id,
        curRect,
        nextRect
      });
    } catch (e) {
      console.log('[SpatialManager][scroll] input', {
        keyCode,
        currentId: currentElem == null ? void 0 : currentElem.id,
        nextId: elem.id,
        error: String(e)
      });
    }
  }
  var now = Date.now();
  if (scrollConfig.scrollThrottleMs != null) {
    if (now - scrollState.lastScrollAt < scrollConfig.scrollThrottleMs) {
      return null;
    }
  }
  var verticalScroll = resolveScrollable(elem, 'vertical');
  var horizontalScroll = resolveScrollable(elem, 'horizontal');
  var computeDeltas = () => {
    var verticalRects = resolveRects(verticalScroll.scrollable, verticalScroll.isWindowScroll, elem);
    var horizontalRects = resolveRects(horizontalScroll.scrollable, horizontalScroll.isWindowScroll, elem);
    var vertical = getAxisScrollDelta(verticalRects.targetRect, verticalRects.visibleContainerRect, 'vertical');
    var horizontal = getAxisScrollDelta(horizontalRects.targetRect, horizontalRects.visibleContainerRect, 'horizontal');
    return {
      vertical,
      horizontal,
      verticalRects,
      horizontalRects
    };
  };
  if (DEBUG_SCROLL()) {
    logScrollContainer('vertical', verticalScroll, elem);
    logScrollContainer('horizontal', horizontalScroll, elem);
  }
  var initial = computeDeltas();
  if (DEBUG_SCROLL()) {
    console.log('[SpatialManager][scroll] deltas', {
      vertical: initial.vertical,
      horizontal: initial.horizontal
    });
  }
  if (!initial.vertical.needsScroll && !initial.horizontal.needsScroll) {
    return null;
  }
  scrollState.lastScrollAt = now;

  // Mark that we're about to initiate a scroll (so the listener knows to skip reacquisition)
  markSpatialManagerScroll();
  var runAxis = (axis, deltaInfo) => {
    if (!deltaInfo.needsScroll) {
      return Promise.resolve();
    }
    var scrollInfo = axis === 'vertical' ? verticalScroll : horizontalScroll;
    return scrollAxis({
      scrollable: scrollInfo.scrollable,
      isWindowScroll: scrollInfo.isWindowScroll,
      isVertical: axis === 'vertical',
      scrollDelta: deltaInfo.scrollDelta,
      scrollConfig,
      scrollState
    });
  };
  if (initial.vertical.needsScroll && initial.horizontal.needsScroll) {
    // Both axes need scrolling: scroll the larger delta first (better UX).
    // After primary axis settles, recompute secondary to handle post-scroll state changes.
    // Sequential approach prevents conflicting operations.
    var primaryAxis = Math.abs(initial.vertical.scrollDelta) >= Math.abs(initial.horizontal.scrollDelta) ? 'vertical' : 'horizontal';
    var secondaryAxis = primaryAxis === 'vertical' ? 'horizontal' : 'vertical';
    var primaryInfo = primaryAxis === 'vertical' ? initial.vertical : initial.horizontal;
    return runAxis(primaryAxis, primaryInfo).then(() => {
      var after = computeDeltas();
      var secondaryInfo = secondaryAxis === 'vertical' ? after.vertical : after.horizontal;
      if (!secondaryInfo.needsScroll) {
        return;
      }
      return runAxis(secondaryAxis, secondaryInfo);
    });
  }
  if (initial.vertical.needsScroll) {
    return runAxis('vertical', initial.vertical);
  }
  return runAxis('horizontal', initial.horizontal);
}
export { DEFAULT_SPATIAL_SCROLL_CONFIG };