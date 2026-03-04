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

/**
 * getCurrentTime
 * Returns current timestamp using high-resolution performance API if available.
 * Falls back to Date.now() for environments lacking performance.now().
 * @returns {number} Current time in milliseconds
 */
export function getCurrentTime() {
  return _hasPerformance ? performance.now() : Date.now();
}

/**
 * scheduleAnimationFrame
 * Schedules a callback for the next animation frame.
 * Uses requestAnimationFrame if available, falls back to 30fps setTimeout simulation.
 * @param {() => void} callback - Function to execute on next animation frame
 * @returns {number} Animation frame ID for cancellation with cancelScheduledFrame()
 */
export function scheduleAnimationFrame(callback) {
  if (_hasRequestAnimationFrame) {
    return requestAnimationFrame(callback);
  }
  // Fallback: simulate 30fps with setTimeout (33ms per frame)
  // TODO: Consider making this adaptive based on actual frame rate or using a more sophisticated polyfill if needed
  return setTimeout(callback, 33);
}
export var cancelScheduledFrame = _hasRequestAnimationFrame ? cancelAnimationFrame : clearTimeout;

/**
 * findScrollableAncestor
 * Traverses DOM ancestors to find a scrollable parent element in specified direction.
 * Checks computed overflow styles and scroll capacity before returning.
 * Falls back to window scrollable if no ancestor can scroll in the direction.
 * @param {HTMLElement | null} elem - Starting element for ancestor traversal
 * @param {'vertical' | 'horizontal'} direction - Direction to check scrollability
 * @returns {HTMLElement | null} Scrollable ancestor or window scrollable; null if not found
 */
export function findScrollableAncestor(elem, direction) {
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

/**
 * isElementInWindowViewport
 * Checks if an element intersects with the window viewport.
 * Only verifies window viewport visibility, not parent container visibility.
 * Assumes element CSS is already visible (display, visibility, opacity handled elsewhere).
 * @param {HTMLElement} elem - The element to check
 * @returns {boolean} True if element intersects window viewport, false otherwise
 */
export function isElementInWindowViewport(elem) {
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
/**
 * getElementVisibilityRatio
 * Calculates the percentage of an element visible within the window viewport.
 * Returns a ratio from 0 (not visible) to 1 (fully visible).
 * @param {HTMLElement} elem - The element to measure
 * @returns {number} Visibility ratio: 0 = completely out of view, 1 = fully in view
 */
export function getElementVisibilityRatio(elem) {
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
/**
 * inferScrollDirection
 * Determines primary scroll axis capability of a container.
 * Used to provide directional hints to maybeScrollOnFocus for optimal behavior.
 * @param {HTMLElement | null} scrollContainer - The container being evaluated
 * @returns {'ArrowDown' | 'ArrowRight'} Direction hint based on scroll capability
 */
export function inferScrollDirection(scrollContainer) {
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
 * getBoundingRectangles
 * Resolves element and container viewport-relative bounding rectangles.
 * Falls back to offset dimensions if getBoundingClientRect unavailable.
 * @param {any} scrollableH - Horizontal scrollable container
 * @param {boolean} isWindowScrollH - If true, scrollableH is the window
 * @param {any} scrollableV - Vertical scrollable container
 * @param {boolean} isWindowScrollV - If true, scrollableV is the window
 * @param {HTMLElement} elem - The target element to measure
 * @returns {Object} Object with horizontalRects, verticalRects, and targetRect
 */
export function getBoundingRectangles(scrollableH, isWindowScrollH, scrollableV, isWindowScrollV, elem) {
  var containerRectH, containerRectV;
  var targetRect;
  if (_hasGetBoundingClientRect) {
    containerRectH = scrollableH.getBoundingClientRect();
    containerRectV = scrollableV.getBoundingClientRect();
    targetRect = elem.getBoundingClientRect();
  } else {
    // Fallback: use offset dimensions
    containerRectH = {
      top: scrollableH.offsetTop || 0,
      left: scrollableH.offsetLeft || 0,
      bottom: (scrollableH.offsetTop || 0) + (scrollableH.offsetHeight || 0),
      right: (scrollableH.offsetLeft || 0) + (scrollableH.offsetWidth || 0)
    };
    containerRectV = {
      top: scrollableV.offsetTop || 0,
      left: scrollableV.offsetLeft || 0,
      bottom: (scrollableV.offsetTop || 0) + (scrollableV.offsetHeight || 0),
      right: (scrollableV.offsetLeft || 0) + (scrollableV.offsetWidth || 0)
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
  // const visibleContainerRect = isWindowScrollH
  //   ? _viewportRect
  //   : {
  //       top: Math.max(containerRect.top, _viewportRect.top),
  //       bottom: Math.min(containerRect.bottom, _viewportRect.bottom),
  //       left: Math.max(containerRect.left, _viewportRect.left),
  //       right: Math.min(containerRect.right, _viewportRect.right)
  //     };

  // return { containerRect, targetRect, visibleContainerRect };
  return {
    horizontalRects: {
      containerRect: containerRectH,
      visibleContainerRect: containerRectH
    },
    verticalRects: {
      containerRect: containerRectV,
      visibleContainerRect: containerRectV
    },
    targetRect
  };
}

/**
 * getAxisScrollDelta
 * Calculates scroll distance needed to keep an element visible within container.
 * Respects edge padding to maintain spacing from container boundaries.
 * Handles cases where element is larger than visible container.
 * @param {any} targetRect - Bounding rectangle of target element
 * @param {any} visibleContainerRect - Bounding rectangle of visible container
 * @param {'vertical' | 'horizontal'} axis - Axis to calculate scroll for
 * @param {number} topEdgePaddingPx - Padding from top edge (vertical axis)
 * @param {number} leftEdgePaddingPx - Padding from left edge (horizontal axis)
 * @returns {Object} Object with needsScroll (boolean) and scrollDelta (pixels to scroll)
 */
export function getAxisScrollDelta(targetRect, visibleContainerRect, axis, topEdgePaddingPx, leftEdgePaddingPx) {
  var isVertical = axis === 'vertical';
  var targetSize, visibleSize;
  if (isVertical) {
    targetSize = targetRect.bottom - targetRect.top;
    visibleSize = visibleContainerRect.bottom - visibleContainerRect.top;
  } else {
    targetSize = targetRect.right - targetRect.left;
    visibleSize = visibleContainerRect.right - visibleContainerRect.left;
  }
  if (targetSize > visibleSize) {
    var delta = isVertical ? targetRect.top - visibleContainerRect.top - topEdgePaddingPx : targetRect.left - visibleContainerRect.left - leftEdgePaddingPx;
    return {
      needsScroll: delta !== 0,
      scrollDelta: delta
    };
  }
  if (isVertical) {
    if (targetRect.top < visibleContainerRect.top) {
      return {
        needsScroll: true,
        scrollDelta: targetRect.top - visibleContainerRect.top - topEdgePaddingPx
      };
    }
    if (targetRect.bottom > visibleContainerRect.bottom) {
      return {
        needsScroll: true,
        scrollDelta: targetRect.bottom - visibleContainerRect.bottom
      };
    }
  } else {
    if (targetRect.left < visibleContainerRect.left) {
      return {
        needsScroll: true,
        scrollDelta: targetRect.left - visibleContainerRect.left - leftEdgePaddingPx
      };
    }
    if (targetRect.right > visibleContainerRect.right) {
      return {
        needsScroll: true,
        scrollDelta: targetRect.right - visibleContainerRect.right + leftEdgePaddingPx
      };
    }
  }
  return {
    needsScroll: false,
    scrollDelta: 0
  };
}