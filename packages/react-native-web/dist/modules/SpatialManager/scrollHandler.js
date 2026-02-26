import _objectSpread from "@babel/runtime/helpers/objectSpread2";
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
var _hasPerformance = typeof performance !== 'undefined' && typeof performance.now === 'function';
var _hasRequestAnimationFrame = typeof requestAnimationFrame === 'function';
var _hasGetComputedStyle = typeof window !== 'undefined' && typeof window.getComputedStyle === 'function';
var _hasGetBoundingClientRect = typeof Element !== 'undefined' && Element.prototype.getBoundingClientRect !== undefined;
var _hasScrollEndEvent = false;
//   typeof window !== 'undefined' &&
//   'onscrollend' in window;

var DEBUG_SCROLL = () => typeof window !== 'undefined' && window.__RNW_TV_SCROLL_DEBUG === true;
var DEFAULT_SPATIAL_SCROLL_CONFIG = {
  edgeThresholdPx: 0,
  // only used on the left edge and in horizontal scrolling
  scrollThrottleMs: 80,
  // not used for now
  smoothScrollEnabled: false,
  scrollAnimationDurationMs: 0,
  scrollAnimationDurationMsVertical: 0,
  scrollAnimationDurationMsHorizontal: 0
};
var _isConfigured = false;
var _scrollConfig = DEFAULT_SPATIAL_SCROLL_CONFIG;
var _focusMode = 'default';
var _scrollState = {
  lastScrollAt: 0,
  // Timestamp of last scroll initiation (for throttling, if enabled)
  scrollAnimationFrame: null
};
function getCurrentTime() {
  return _hasPerformance ? performance.now() : Date.now();
}
function scheduleAnimationFrame(callback) {
  if (_hasRequestAnimationFrame) {
    return requestAnimationFrame(callback);
  }
  // Fallback: simulate 30fps with setTimeout (33ms per frame)
  // TODO: Consider making this adaptive based on actual frame rate or using a more sophisticated polyfill if needed
  return setTimeout(callback, 33);
}
var cancelScheduledFrame = _hasRequestAnimationFrame ? cancelAnimationFrame : clearTimeout;
var _windowScrollable = typeof window !== 'undefined' ? {
  get scrollTop() {
    return window.scrollY;
  },
  get scrollLeft() {
    return window.scrollX;
  },
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
} : null;
var _viewportRect = typeof window !== 'undefined' ? {
  top: 0,
  bottom: window.innerHeight,
  left: 0,
  right: window.innerWidth
} : null;
function animateScrollTo(scrollable, isVertical, nextOffset, durationMs) {
  var startOffset = isVertical ? scrollable.scrollTop : scrollable.scrollLeft;
  var delta = nextOffset - startOffset;
  if (delta === 0 || durationMs <= 0) return;
  if (_scrollState.scrollAnimationFrame != null) {
    cancelScheduledFrame(_scrollState.scrollAnimationFrame);
    _scrollState.scrollAnimationFrame = null;
  }
  var startTime = getCurrentTime();
  var step = now => {
    var elapsed = _hasPerformance ? now - startTime : Date.now() - startTime;
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
      _scrollState.scrollAnimationFrame = scheduleAnimationFrame(() => step(_hasPerformance ? performance.now() : Date.now()));
    } else {
      _scrollState.scrollAnimationFrame = null;
    }
  };
  _scrollState.scrollAnimationFrame = scheduleAnimationFrame(() => step(_hasPerformance ? performance.now() : Date.now()));
}

// function getScrollPosition(
//   scrollable: any,
//   isVertical: boolean,
//   isWindowScroll: boolean
// ): number {
//   if (isWindowScroll) {
//     return isVertical ? window.scrollY : window.scrollX;
//   }
//   return isVertical ? scrollable.scrollTop : scrollable.scrollLeft;
// }

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
    var _delta3 = targetRect.left - visibleContainerRect.left - _scrollConfig.edgeThresholdPx;
    return {
      needsScroll: _delta3 !== 0,
      scrollDelta: _delta3
    };
  }
  if (targetRect.left < visibleContainerRect.left) {
    var _delta4 = targetRect.left - visibleContainerRect.left - _scrollConfig.edgeThresholdPx;
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
  var style = _hasGetComputedStyle ? window.getComputedStyle(scrollable) : null;
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
function scrollAxis(scrollable, isWindowScroll, isVertical, scrollDelta) {
  if (scrollDelta === 0) {
    return;
  }

  // const currentOffset = getScrollPosition(
  //   scrollable,
  //   isVertical,
  //   isWindowScroll
  // );
  var currentOffset = isVertical ? scrollable.scrollTop : scrollable.scrollLeft;
  var maxOffset = isVertical ? Math.max(0, scrollable.scrollHeight - scrollable.clientHeight) : Math.max(0, scrollable.scrollWidth - scrollable.clientWidth);
  var liveOffset = currentOffset;
  var liveNextOffset = isWindowScroll ? Math.min(Math.max(liveOffset + scrollDelta, 0), maxOffset) : Math.max(liveOffset + scrollDelta, 0);
  var nextOffset = calculateNextOffset(currentOffset, scrollDelta, isWindowScroll, maxOffset);
  performScroll(scrollable, isVertical, nextOffset, liveNextOffset);
}
function findScrollableAncestor(elem, direction) {
  var current = elem ? elem.parentElement : null;
  while (current) {
    var overflowY = '';
    var overflowX = '';
    if (_hasGetComputedStyle) {
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
      return {
        scrollable: current,
        isWindowScroll: false
      };
    }
    if (current === document.body || current === document.documentElement) {
      break;
    }
    current = current.parentElement;
  }
  // Return window scrollable as fallback if no scrollable ancestor found
  return {
    scrollable: _windowScrollable,
    isWindowScroll: true
  };
}

// Resolve element and container rectangles, clamping to viewport for accuracy.
// Important: bounding rects are viewport-relative, not document-relative.
// This avoids coordinate system mismatches when scrolling.
function resolveRects(scrollable, isWindowScroll, elem) {
  var containerRect;
  var targetRect;
  if (_hasGetBoundingClientRect) {
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

  // Clamp container rect to viewport bounds so we don't scroll outside the visible area.
  // This is critical for accurate visibility detection when container is partially off-screen.
  var visibleContainerRect = isWindowScroll ? _viewportRect : {
    top: Math.max(containerRect.top, _viewportRect.top),
    bottom: Math.min(containerRect.bottom, _viewportRect.bottom),
    left: Math.max(containerRect.left, _viewportRect.left),
    right: Math.min(containerRect.right, _viewportRect.right)
  };
  return {
    containerRect,
    targetRect,
    visibleContainerRect
  };
}
function performScroll(scrollable, isVertical, nextOffset, liveNextOffset) {
  var durationMs = isVertical ? _scrollConfig.scrollAnimationDurationMsVertical : _scrollConfig.scrollAnimationDurationMsHorizontal;
  if (durationMs > 0) {
    animateScrollTo(scrollable, isVertical, liveNextOffset, durationMs);
    return;
  }
  if (typeof scrollable.scrollTo === 'function') {
    if (isVertical) {
      scrollable.scrollTo({
        y: nextOffset,
        animated: _scrollConfig.smoothScrollEnabled !== false
      });
    } else {
      scrollable.scrollTo({
        x: nextOffset,
        animated: _scrollConfig.smoothScrollEnabled !== false
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
function setupScrollHandler(config) {
  if (_isConfigured) {
    return;
  }
  if (config != null && config.scrollConfig) {
    _scrollConfig = _objectSpread(_objectSpread({}, _scrollConfig), config.scrollConfig);
  }
  _focusMode = (config == null ? void 0 : config.focusMode) || _focusMode;
  _isConfigured = true;
}

/**
 * Check if an element is visible within the window viewport.
 * Only checks window viewport, not parent containers.
 * Assumes element passed here is already CSS-visible (display, visibility, opacity).
 *
 * @param {HTMLElement} elem The element to check
 * @return {boolean} True if element intersects window viewport
 */
function isElementInWindowViewport(elem) {
  if (!elem || !_hasGetBoundingClientRect) {
    return true; // Assume visible if we can't measure
  }
  try {
    var elemRect = elem.getBoundingClientRect();
    var viewportHeight = window.innerHeight || document.documentElement.clientHeight;
    var viewportWidth = window.innerWidth || document.documentElement.clientWidth;
    return elemRect.top < viewportHeight && elemRect.bottom > 0 && elemRect.left < viewportWidth && elemRect.right > 0;
  } catch (e) {
    return true; // Safe fallback
  }
}

/**
 * Check if an element is fully visible in the window viewport.
 * Returns visibility percentage (0-1).
 *
 * @param {HTMLElement} elem The element to check
 * @return {number} Visibility ratio: 0 = not visible, 1 = fully visible
 */
function getElementVisibilityRatio(elem) {
  if (!elem || !_hasGetBoundingClientRect) {
    return 1; // Assume fully visible if we can't measure
  }
  try {
    var elemRect = elem.getBoundingClientRect();
    var viewportHeight = window.innerHeight || document.documentElement.clientHeight;
    var viewportWidth = window.innerWidth || document.documentElement.clientWidth;

    // Calculate clipped rectangle intersecting with viewport
    var clippedTop = Math.max(0, elemRect.top);
    var clippedBottom = Math.min(viewportHeight, elemRect.bottom);
    var clippedLeft = Math.max(0, elemRect.left);
    var clippedRight = Math.min(viewportWidth, elemRect.right);

    // Calculate visible area
    var visibleHeight = Math.max(0, clippedBottom - clippedTop);
    var visibleWidth = Math.max(0, clippedRight - clippedLeft);
    var visibleArea = visibleHeight * visibleWidth;

    // Calculate total element area
    var totalHeight = elemRect.height;
    var totalWidth = elemRect.width;
    var totalArea = totalHeight * totalWidth;
    if (totalArea === 0) {
      return 0;
    }
    return Math.min(1, visibleArea / totalArea);
  } catch (e) {
    return 1; // Safe fallback
  }
}

/**
 * Infer scroll direction from scrollContainer's scroll capability.
 * Used to provide directional hint to maybeScrollOnFocus.
 *
 * @param {HTMLElement} scrollContainer The container that scrolled
 * @return {'ArrowDown' | 'ArrowRight'} Direction hint
 */
function inferScrollDirection(scrollContainer) {
  if (!scrollContainer) {
    return 'ArrowDown';
  }
  var isWindowScroll = scrollContainer === window || scrollContainer === document || scrollContainer === document.documentElement;
  if (isWindowScroll) {
    return 'ArrowDown';
  }

  // Check if container can scroll vertically
  var canScrollVertical = (() => {
    if (_hasGetComputedStyle) {
      var style = window.getComputedStyle(scrollContainer);
      return (style.overflowY === 'auto' || style.overflowY === 'scroll' || style.overflowY === 'overlay') && scrollContainer.scrollHeight > scrollContainer.clientHeight;
    }
    return scrollContainer.scrollHeight > scrollContainer.clientHeight;
  })();

  // Prefer vertical direction if possible
  return canScrollVertical ? 'ArrowDown' : 'ArrowRight';
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
function setupAppInitiatedScrollHandler(container, getCurrentFocus, onScrollRefocus) {
  var handleScrollEnd = e => {
    // If SpatialManager initiated this scroll, it already handled focus
    if (isSpatialManagerInitiatedScroll) {
      unmarkSpatialManagerScroll();
      return;
    }
    var currentFocus = getCurrentFocus();
    if (!currentFocus || !currentFocus.elem) {
      return;
    }
    var target = e == null ? void 0 : e.target;
    var scrollContainer = target && target !== window && target !== document && target !== document.documentElement ? target : null;

    // Case 1: currentFocus is fully in window viewport - do nothing
    if (isElementInWindowViewport(currentFocus.elem)) {
      return;
    }

    // Case 2 & 3: currentFocus is partially or completely out of viewport
    // Check visibility ratio to decide: preserve focus or reacquire
    var visibilityRatio = getElementVisibilityRatio(currentFocus.elem);
    if (visibilityRatio > 0) {
      // Case 2: currentFocus is partially visible (e.g., 10% in viewport)
      // PRESERVE focus continuity by scrolling it fully back into view
      if (DEBUG_SCROLL) {
        console.log('[SpatialManager][scroll] currentFocus partially visible, scrolling back into view', {
          elementId: currentFocus.elem.id,
          visibilityRatio: Math.round(visibilityRatio * 100) + '%'
        });
      }

      // Infer scroll direction from scrollContainer
      var scrollDirection = inferScrollDirection(scrollContainer);

      // Call maybeScrollOnFocus to bring currentFocus fully into view
      // This maintains focus continuity while respecting app-initiated scroll
      maybeScrollOnFocus(currentFocus.elem, currentFocus.elem,
      // TODO: Handle this better: navigationFrom is currentFocus itself
      scrollDirection);
      return;
    }

    // Case 3: currentFocus is completely out of viewport (0% visible)
    // REACQUIRE focus by finding first focusable in scrollContainer
    if (DEBUG_SCROLL) {
      console.log('[SpatialManager][scroll] currentFocus out of viewport, reacquiring focus', {
        elementId: currentFocus.elem.id,
        scrollContainerId: scrollContainer == null ? void 0 : scrollContainer.id
      });
    }

    // App-initiated scroll - focused element is completely out of view
    // Need to find a new focus in the scrolled container
    onScrollRefocus({
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
    if (_hasScrollEndEvent) {
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
      if (_hasScrollEndEvent) {
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
 * - ArrowRight: Align target's left edge to current focus X position
 *   (only if scrollable space allows)
 * - ArrowLeft, ArrowUp/ArrowDown: Use default visibility behavior (keep in view)
 * - Vertical: Always uses default behavior regardless of direction
 *
 * Key insight: AlignLeft creates a fixed X position where focus appears to stay while
 * content scrolls left/right. But at content boundaries, we fall back to default behavior
 * to avoid breaking visual alignment of the original focus element.
 */
function scrollToAlignLeft(elem, keyCode, currentElem, verticalScroll, horizontalScroll) {
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
  var computeAlignLeftDeltas = () => {
    var verticalRects = resolveRects(verticalScroll.scrollable, verticalScroll.isWindowScroll, elem);
    var horizontalRects = resolveRects(horizontalScroll.scrollable, horizontalScroll.isWindowScroll, elem);
    var currentRect = currentElem == null || currentElem.getBoundingClientRect == null ? void 0 : currentElem.getBoundingClientRect();
    var horizontalDelta = 0;
    var needsHorizontalScroll = false;
    // TODO: We loose the reference point for Align left as soon as the scrolling moves into the end part on the right.
    if (keyCode === 'ArrowRight' && currentRect) {
      // On right navigation: align target's left edge to current focus X position.
      // This keeps focus visually fixed while content scrolls underneath.
      var desiredDelta = horizontalRects.targetRect.left - currentRect.left;
      var scrollable = horizontalScroll.scrollable;
      // const currentScroll = getScrollPosition(
      //   scrollable,
      //   false,
      //   horizontalScroll.isWindowScroll
      // );
      var currentScroll = scrollable.scrollLeft;
      var maxScroll = Math.max(0, scrollable.scrollWidth - scrollable.clientWidth);

      // Critical boundary check: can we achieve alignment without exceeding scroll bounds?
      // This prevents breaking alignment at content boundaries (e.g., last item).
      var nextScroll = currentScroll + desiredDelta;
      var canAchieveAlignment = nextScroll >= 0 && nextScroll <= maxScroll;
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
      // On left navigation (or otherwise): use default behavior (keep visible with edge threshold).
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
  var delta = computeAlignLeftDeltas();
  if (DEBUG_SCROLL()) {
    console.log('[SpatialManager][scroll] AlignLeft deltas', {
      horizontalDelta: delta.horizontalDelta,
      verticalDelta: delta.verticalDelta,
      needsHorizontalScroll: delta.needsHorizontalScroll,
      needsVerticalScroll: delta.needsVerticalScroll
    });
  }
  if (!delta.needsHorizontalScroll && !delta.needsVerticalScroll) {
    return null;
  }

  // _scrollState.lastScrollAt = now;

  markSpatialManagerScroll();
  var runAxis = (axis, delta) => {
    if (delta === 0) {
      return;
    }
    var scrollInfo = axis === 'vertical' ? verticalScroll : horizontalScroll;
    scrollAxis(scrollInfo.scrollable, scrollInfo.isWindowScroll, axis === 'vertical', delta);
  };
  if (delta.needsHorizontalScroll && delta.needsVerticalScroll) {
    // Both axes need scrolling: prioritize horizontal (AlignLeft alignment) first.
    // After horizontal scroll settles, recompute deltas to see if vertical is still needed.
    // Sequential approach prevents conflicting scroll operations.
    runAxis('horizontal', delta.horizontalDelta);
    var after = computeAlignLeftDeltas();
    if (!after.needsVerticalScroll) {
      return null;
    }
    runAxis('vertical', after.verticalDelta);
    return null;
  }
  if (delta.needsHorizontalScroll) {
    runAxis('horizontal', delta.horizontalDelta);
    return null;
  }
  runAxis('vertical', delta.verticalDelta);
  return null;
}

// Main entry point for scroll-on-focus logic.
// Dispatches to AlignLeft or default behavior based on focusMode.
// - AlignLeft: right aligns to current focus X, other directions use default
// - default: always use standard visibility behavior
function maybeScrollOnFocus(nextElem, currentElem, keyCode) {
  if (!nextElem || typeof window === 'undefined') return null;
  var verticalScroll = findScrollableAncestor(nextElem, 'vertical');
  var horizontalScroll = findScrollableAncestor(nextElem, 'horizontal');
  if (_focusMode === 'AlignLeft') {
    return scrollToAlignLeft(nextElem, keyCode, currentElem, verticalScroll, horizontalScroll);
  }
  if (DEBUG_SCROLL()) {
    try {
      var curRect = currentElem == null || currentElem.getBoundingClientRect == null ? void 0 : currentElem.getBoundingClientRect();
      var nextRect = nextElem.getBoundingClientRect();
      console.log('[SpatialManager][scroll] input', {
        keyCode,
        currentId: currentElem == null ? void 0 : currentElem.id,
        nextId: nextElem.id,
        curRect,
        nextRect
      });
    } catch (e) {
      console.log('[SpatialManager][scroll] input', {
        keyCode,
        currentId: currentElem == null ? void 0 : currentElem.id,
        nextId: nextElem.id,
        error: String(e)
      });
    }
  }
  var computeDeltas = () => {
    var verticalRects = resolveRects(verticalScroll.scrollable, verticalScroll.isWindowScroll, nextElem);
    var horizontalRects = resolveRects(horizontalScroll.scrollable, horizontalScroll.isWindowScroll, nextElem);
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
    logScrollContainer('vertical', verticalScroll, nextElem);
    logScrollContainer('horizontal', horizontalScroll, nextElem);
  }
  var delta = computeDeltas();
  if (DEBUG_SCROLL()) {
    console.log('[SpatialManager][scroll] deltas', {
      vertical: delta.vertical,
      horizontal: delta.horizontal
    });
  }
  if (!delta.vertical.needsScroll && !delta.horizontal.needsScroll) {
    return null;
  }

  // _scrollState.lastScrollAt = now;

  // Mark that we're about to initiate a scroll (so the listener knows to skip reacquisition)
  markSpatialManagerScroll();
  var runAxis = (axis, deltaInfo) => {
    if (!deltaInfo.needsScroll) {
      return;
    }
    var scrollInfo = axis === 'vertical' ? verticalScroll : horizontalScroll;
    scrollAxis(scrollInfo.scrollable, scrollInfo.isWindowScroll, axis === 'vertical', deltaInfo.scrollDelta);
  };
  if (delta.vertical.needsScroll && delta.horizontal.needsScroll) {
    // Both axes need scrolling: scroll the larger delta first (better UX).
    // After primary axis settles, recompute secondary to handle post-scroll state changes.
    // Sequential approach prevents conflicting operations.
    var primaryAxis = Math.abs(delta.vertical.scrollDelta) >= Math.abs(delta.horizontal.scrollDelta) ? 'vertical' : 'horizontal';
    var secondaryAxis = primaryAxis === 'vertical' ? 'horizontal' : 'vertical';
    var primaryInfo = primaryAxis === 'vertical' ? delta.vertical : delta.horizontal;
    runAxis(primaryAxis, primaryInfo);
    // const after = computeDeltas();
    var secondaryInfo =
    // secondaryAxis === 'vertical' ? after.vertical : after.horizontal;
    secondaryAxis === 'vertical' ? delta.vertical : delta.horizontal;
    // if (!secondaryInfo.needsScroll) {
    //   return null;
    // }
    runAxis(secondaryAxis, secondaryInfo);
    return null;
  }
  if (delta.vertical.needsScroll) {
    runAxis('vertical', delta.vertical);
    return null;
  }
  runAxis('horizontal', delta.horizontal);
  return null;
}
export { setupScrollHandler, setupAppInitiatedScrollHandler, isElementInWindowViewport, maybeScrollOnFocus };