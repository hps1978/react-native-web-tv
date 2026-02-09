/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * 
 * @format
 */

// API capability detection (one-time check at module load)
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
function calculateScrollDirection(currentElem, nextElem) {
  if (!currentElem || !nextElem || !hasGetBoundingClientRect) {
    return null;
  }
  // TO DO: this needs more work as it doesn't handle all edge cases well 
  // (e.g. what if new component is diagnal to current?) 
  // try {
  //   const currentRect = currentElem.getBoundingClientRect();
  //   const nextRect = nextElem.getBoundingClientRect();

  //   const overlapX =
  //     Math.min(currentRect.right, nextRect.right) -
  //     Math.max(currentRect.left, nextRect.left);
  //   const overlapY =
  //     Math.min(currentRect.bottom, nextRect.bottom) -
  //     Math.max(currentRect.top, nextRect.top);

  //   // If rectangles overlap on one axis, prefer movement on the other axis.
  //   if (overlapX > 0 && overlapY <= 0) {
  //     return {
  //       isVertical: true,
  //       direction: nextRect.top >= currentRect.top ? 'down' : 'up',
  //       dominance: Infinity
  //     };
  //   }

  //   if (overlapY > 0 && overlapX <= 0) {
  //     return {
  //       isVertical: false,
  //       direction: nextRect.left >= currentRect.left ? 'right' : 'left',
  //       dominance: Infinity
  //     };
  //   }

  //   const currentCenterY = currentRect.top + currentRect.height / 2;
  //   const nextCenterY = nextRect.top + nextRect.height / 2;
  //   const currentCenterX = currentRect.left + currentRect.width / 2;
  //   const nextCenterX = nextRect.left + nextRect.width / 2;

  //   const deltaY = nextCenterY - currentCenterY;
  //   const deltaX = nextCenterX - currentCenterX;

  //   const absDeltaY = Math.abs(deltaY);
  //   const absDeltaX = Math.abs(deltaX);

  //   // Determine primary direction based on larger delta
  //   if (absDeltaY > absDeltaX) {
  //     return {
  //       isVertical: true,
  //       direction: deltaY > 0 ? 'down' : 'up',
  //       dominance: absDeltaX > 0 ? absDeltaY / absDeltaX : Infinity
  //     };
  //   } else if (absDeltaX > 0) {
  //     return {
  //       isVertical: false,
  //       direction: deltaX > 0 ? 'right' : 'left',
  //       dominance: absDeltaY > 0 ? absDeltaX / absDeltaY : Infinity
  //     };
  //   }
  // } catch (e) {
  //   // Fallback if getBoundingClientRect fails
  // }

  return null;
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
function resolveScrollOffsets(scrollable, isVertical) {
  var currentOffset = isVertical ? scrollable.scrollTop : scrollable.scrollLeft;
  var maxOffset = isVertical ? Math.max(0, scrollable.scrollHeight - scrollable.clientHeight) : Math.max(0, scrollable.scrollWidth - scrollable.clientWidth);
  return {
    currentOffset,
    maxOffset
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
function shouldScrollIntoView(isVertical, edgeThreshold, targetRect, visibleContainerRect) {
  if (isVertical) {
    var padding = edgeThreshold;
    if (targetRect.bottom > visibleContainerRect.bottom - padding) {
      var delta = targetRect.bottom - (visibleContainerRect.bottom - padding);
      return {
        needsScroll: true,
        scrollDelta: delta
      };
    }
    if (targetRect.top < visibleContainerRect.top + padding) {
      var _delta = visibleContainerRect.top + padding - targetRect.top;
      return {
        needsScroll: true,
        scrollDelta: -_delta
      };
    }
  } else {
    var _padding = edgeThreshold;
    if (targetRect.right > visibleContainerRect.right - _padding) {
      var _delta2 = targetRect.right - (visibleContainerRect.right - _padding);
      return {
        needsScroll: true,
        scrollDelta: _delta2
      };
    }
    if (targetRect.left < visibleContainerRect.left + _padding) {
      var _delta3 = visibleContainerRect.left + _padding - targetRect.left;
      return {
        needsScroll: true,
        scrollDelta: -_delta3
      };
    }
  }
  return {
    needsScroll: false,
    scrollDelta: 0
  };
}
function resolveDirection(currentElem, nextElem, keyCode) {
  var isVertical = false;
  var isHorizontal = false;
  if (currentElem) {
    var directionInfo = calculateScrollDirection(currentElem, nextElem);
    if (directionInfo) {
      isVertical = directionInfo.isVertical;
      isHorizontal = !directionInfo.isVertical;
    } else {
      isVertical = keyCode === 'ArrowUp' || keyCode === 'ArrowDown';
      isHorizontal = keyCode === 'ArrowLeft' || keyCode === 'ArrowRight';
    }
  } else {
    isVertical = keyCode === 'ArrowUp' || keyCode === 'ArrowDown';
    isHorizontal = keyCode === 'ArrowLeft' || keyCode === 'ArrowRight';
  }
  return {
    isVertical,
    isHorizontal
  };
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
 * If SpatialManager initiated the scroll, skips focus reacquisition.
 * If app initiated the scroll, reacquires focus if needed.
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
export function maybeScrollOnFocus(elem, keyCode, currentElem, scrollConfig, scrollState) {
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
      return;
    }
  }
  var _resolveDirection = resolveDirection(currentElem, elem, keyCode),
    isVertical = _resolveDirection.isVertical,
    isHorizontal = _resolveDirection.isHorizontal;
  if (DEBUG_SCROLL()) {
    console.log('[SpatialManager][scroll] direction', {
      isVertical,
      isHorizontal
    });
  }
  if (!isVertical && !isHorizontal) return;
  var direction = isVertical ? 'vertical' : 'horizontal';
  var _resolveScrollable = resolveScrollable(elem, direction),
    scrollable = _resolveScrollable.scrollable,
    isWindowScroll = _resolveScrollable.isWindowScroll;
  if (!scrollable) return;
  if (DEBUG_SCROLL()) {
    if (isWindowScroll) {
      var _document$documentEle;
      console.log('[SpatialManager][scroll] container', {
        isWindowScroll: true,
        scrollTop: window.scrollY,
        scrollHeight: (_document$documentEle = document.documentElement) == null ? void 0 : _document$documentEle.scrollHeight,
        clientHeight: window.innerHeight
      });
    } else {
      var style = hasGetComputedStyle ? window.getComputedStyle(scrollable) : null;
      console.log('[SpatialManager][scroll] container', {
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
  }
  var _resolveRects = resolveRects(scrollable, isWindowScroll, elem),
    targetRect = _resolveRects.targetRect,
    visibleContainerRect = _resolveRects.visibleContainerRect;
  var _resolveScrollOffsets = resolveScrollOffsets(scrollable, isVertical),
    currentOffset = _resolveScrollOffsets.currentOffset,
    maxOffset = _resolveScrollOffsets.maxOffset;
  var edgeThreshold = scrollConfig.edgeThresholdPx || 0;
  var _shouldScrollIntoView = shouldScrollIntoView(isVertical, edgeThreshold, targetRect, visibleContainerRect),
    needsScroll = _shouldScrollIntoView.needsScroll,
    scrollDelta = _shouldScrollIntoView.scrollDelta;
  if (DEBUG_SCROLL()) {
    console.log('[SpatialManager][scroll] decision', {
      needsScroll,
      scrollDelta,
      edgeThreshold,
      isWindowScroll,
      visibleContainerRect,
      targetRect
    });
  }
  if (!needsScroll) {
    return;
  }
  scrollState.lastScrollAt = now;

  // Mark that we're about to initiate a scroll (so the listener knows to skip reacquisition)
  markSpatialManagerScroll();
  // Defer scroll to next event loop to avoid blocking the keydown handler
  Promise.resolve().then(() => {
    var liveOffset = isVertical ? scrollable.scrollTop : scrollable.scrollLeft;
    var liveNextOffset = isWindowScroll ? Math.min(Math.max(liveOffset + scrollDelta, 0), maxOffset) : Math.max(liveOffset + scrollDelta, 0);
    var nextOffset = calculateNextOffset(currentOffset, scrollDelta, isWindowScroll, maxOffset);
    performScroll(scrollable, isVertical, scrollConfig, scrollState, nextOffset, liveNextOffset);
  });
}
export { DEFAULT_SPATIAL_SCROLL_CONFIG };