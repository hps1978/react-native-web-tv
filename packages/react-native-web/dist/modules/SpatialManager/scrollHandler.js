import _objectSpread from "@babel/runtime/helpers/objectSpread2";
import _classPrivateFieldLooseBase from "@babel/runtime/helpers/classPrivateFieldLooseBase";
import _classPrivateFieldLooseKey from "@babel/runtime/helpers/classPrivateFieldLooseKey";
/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * 
 * @format
 */
import { getCurrentTime, scheduleAnimationFrame, cancelScheduledFrame, findScrollableAncestor, isElementInWindowViewport, getElementVisibilityRatio, inferScrollDirection, getBoundingRectangles, getAxisScrollDelta, ElemData } from './utils';
var DEFAULT_SPATIAL_SCROLL_CONFIG = {
  leftEdgePaddingPx: 0,
  // only used on the left edge and in horizontal scrolling
  topEdgePaddingPx: 0,
  // only used on the top edge and in vertical up scrolling
  scrollThrottleMs: 80,
  // not used for now
  smoothScrollEnabled: false,
  scrollAnimationDurationMs: 0,
  scrollAnimationDurationMsVertical: 0,
  scrollAnimationDurationMsHorizontal: 0
};

// Singleton class to manage scroll operations
var _instance = /*#__PURE__*/_classPrivateFieldLooseKey("_instance");
class ScrollHandler {
  /**
   * constructor
   * Initializes or returns the singleton instance of ScrollHandler.
   * Sets up default scroll configuration and internal state tracking.
   * @returns {ScrollHandler} The singleton instance
   */
  constructor() {
    if (_classPrivateFieldLooseBase(ScrollHandler, _instance)[_instance]) {
      return _classPrivateFieldLooseBase(ScrollHandler, _instance)[_instance];
    }
    this._isConfigured = false;
    this._scrollConfig = DEFAULT_SPATIAL_SCROLL_CONFIG;
    this._focusMode = 'default';
    this._scrollState = {
      scrollAnimationFrame: null
    };
    this._hasScrollEndEvent = false; // we can use onscrollend, but it's baseline 2025 so very low chance of support on TVs yet.
    this._isSpatialManagerInitiatedScroll = false;
    // TODO: Check this
    this._reacquireFocusTimeout = null;
    _classPrivateFieldLooseBase(ScrollHandler, _instance)[_instance] = this;
  }

  /**
   * setupScrollHandler
   * Configures scroll behavior and animation settings for spatial navigation.
   * Only initializes once; subsequent calls are ignored.
   * @param {Object} [config] - Configuration object
   * @param {SpatialScrollConfigType} [config.scrollConfig] - Scroll animation and padding settings
   * @param {'AlignLeft' | 'default'} [config.focusMode] - Focus alignment mode for scrolling
   * @param {ScrollStateType} [config.scrollState] - Internal scroll state tracking
   * @returns {void}
   */
  setupScrollHandler(config) {
    if (this._isConfigured) {
      return;
    }
    if (config != null && config.scrollConfig) {
      this._scrollConfig = _objectSpread(_objectSpread({}, this._scrollConfig), config.scrollConfig);
    }
    this._focusMode = (config == null ? void 0 : config.focusMode) || this._focusMode;
    this._isConfigured = true;
  }

  /**
   * animateScrollTo
   * Smoothly animates scroll position from current to next offset using easing.
   * Cancels any pending animation and schedules new animation frames.
   * @param {any} scrollable - The scrollable element or window
   * @param {boolean} isVertical - If true, animates vertical scroll; if false, horizontal
   * @param {number} nextOffset - Target scroll position in pixels
   * @param {number} durationMs - Animation duration in milliseconds
   * @returns {void}
   */
  animateScrollTo(scrollable, isVertical, nextOffset, durationMs) {
    var startOffset = isVertical ? scrollable.scrollTop : scrollable.scrollLeft;
    var delta = nextOffset - startOffset;
    if (delta === 0 || durationMs <= 0) return;
    if (this._scrollState.scrollAnimationFrame != null) {
      cancelScheduledFrame(this._scrollState.scrollAnimationFrame);
      this._scrollState.scrollAnimationFrame = null;
    }
    var startTime = getCurrentTime();
    var easingFunction = t => t * (2 - t); // Example: easeOutQuad

    var step = now => {
      var elapsed = now - startTime;
      var t = Math.min(1, elapsed / durationMs);
      var easedT = easingFunction(t);
      var value = startOffset + delta * easedT;
      if (typeof scrollable.scrollTo === 'function') {
        scrollable.scrollTo({
          [isVertical ? 'y' : 'x']: value,
          animated: false
        });
      } else if (isVertical) {
        scrollable.scrollTop = value;
      } else {
        scrollable.scrollLeft = value;
      }
      if (t < 1) {
        this._scrollState.scrollAnimationFrame = scheduleAnimationFrame(() => step(getCurrentTime()));
      } else {
        this._scrollState.scrollAnimationFrame = null;
      }
    };
    this._scrollState.scrollAnimationFrame = scheduleAnimationFrame(() => step(getCurrentTime()));
  }

  /**
   * performScroll
   * Executes scroll operation with optional animation.
   * Chooses between animated scroll (using easing) and immediate scroll.
   * @param {any} scrollable - The scrollable element or window
   * @param {boolean} isVertical - If true, scrolls vertically; if false, horizontally
   * @param {number} nextOffset - Target scroll position in pixels
   * @param {number} liveNextOffset - Live offset for animation target
   * @param {boolean} [animate=false] - If true, uses smooth animation; if false, immediate
   * @returns {void}
   */
  performScroll(scrollable, isVertical, nextOffset, liveNextOffset, animate) {
    if (animate === void 0) {
      animate = false;
    }
    var durationMs = isVertical ? this._scrollConfig.scrollAnimationDurationMsVertical : this._scrollConfig.scrollAnimationDurationMsHorizontal;
    if (animate && durationMs > 0) {
      this.animateScrollTo(scrollable, isVertical, liveNextOffset, durationMs);
      return;
    }
    if (typeof scrollable.scrollTo === 'function') {
      if (isVertical) {
        scrollable.scrollTo({
          y: nextOffset,
          animated: this._scrollConfig.smoothScrollEnabled !== false
        });
      } else {
        scrollable.scrollTo({
          x: nextOffset,
          animated: this._scrollConfig.smoothScrollEnabled !== false
        });
      }
    } else if (isVertical) {
      scrollable.scrollTop = nextOffset;
    } else {
      scrollable.scrollLeft = nextOffset;
    }
  }

  /**
   * scrollAxis
   * Scrolls a single axis (vertical or horizontal) by the specified delta amount.
   * Clamps scroll position within valid bounds (0 to max scrollable distance).
   * @param {any} scrollable - The scrollable element or window
   * @param {boolean} isWindowScroll - If true, scrolls the window; if false, the element
   * @param {boolean} isVertical - If true, scrolls vertically; if false, horizontally
   * @param {number} scrollDelta - Distance to scroll in pixels (positive = down/right)
   * @param {boolean} [animate=false] - If true, uses smooth animation
   * @returns {void}
   */
  scrollAxis(scrollable, isWindowScroll, isVertical, scrollDelta, animate) {
    if (animate === void 0) {
      animate = false;
    }
    if (scrollDelta === 0) {
      return;
    }
    var currentOffset = isVertical ? scrollable.scrollTop : scrollable.scrollLeft;
    var maxOffset = isVertical ? Math.max(0, scrollable.scrollHeight - scrollable.clientHeight) : Math.max(0, scrollable.scrollWidth - scrollable.clientWidth);
    var liveOffset = currentOffset;
    var liveNextOffset = isWindowScroll ? Math.min(Math.max(liveOffset + scrollDelta, 0), maxOffset) : Math.max(liveOffset + scrollDelta, 0);
    var nextOffset = isWindowScroll ? Math.min(currentOffset + scrollDelta, maxOffset) : currentOffset + scrollDelta;
    this.performScroll(scrollable, isVertical, nextOffset, liveNextOffset, animate);
  }

  /**
   * scrollToAlignLeft
   * Implements 'AlignLeft' focus mode: aligns element to focus X position on right navigation.
   * Other directions use default visibility behavior to avoid boundary breaking.
   * Falls back to default behavior at content boundaries when alignment space is insufficient.
   * @param {ElemData} elemData - The target element data to align
   * @param {string} keyCode - Navigation key code (e.g., 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight')
   * @param {ElemData | null} currentElemData - The currently focused element data
   * @param {Object} verticalScroll - Vertical scrollable container info {scrollable, isWindowScroll}
   * @param {Object} horizontalScroll - Horizontal scrollable container info {scrollable, isWindowScroll}
   * @returns {null}
   */
  scrollToAlignLeft(elemData, keyCode, currentElemData, verticalScroll, horizontalScroll) {
    var elem = elemData.elem;
    if (!elem || typeof window === 'undefined') return;
    var computeAlignLeftDeltas = () => {
      var _getBoundingRectangle = getBoundingRectangles(horizontalScroll.scrollable, horizontalScroll.isWindowScroll, verticalScroll.scrollable, verticalScroll.isWindowScroll, elemData),
        verticalRects = _getBoundingRectangle.verticalRects,
        horizontalRects = _getBoundingRectangle.horizontalRects,
        targetHRect = _getBoundingRectangle.targetHRect,
        targetVRect = _getBoundingRectangle.targetVRect;

      // Vertical nav computation
      if (keyCode === 'ArrowUp' || keyCode === 'ArrowDown') {
        // Make sure the target is fully visible
        var vertical = getAxisScrollDelta(targetVRect, verticalRects.visibleContainerRect, 'vertical', this._scrollConfig.topEdgePaddingPx, this._scrollConfig.leftEdgePaddingPx);

        // We may still need horizontal scroll to maintain target within the visible area
        var horizontal = getAxisScrollDelta(targetHRect, horizontalRects.visibleContainerRect, 'horizontal', this._scrollConfig.topEdgePaddingPx, this._scrollConfig.leftEdgePaddingPx);
        return {
          horizontalDelta: horizontal.scrollDelta,
          verticalDelta: vertical.scrollDelta,
          verticalRects,
          horizontalRects,
          needsHorizontalScroll: horizontal.needsScroll,
          needsVerticalScroll: vertical.needsScroll
        };
      }
      if (keyCode === 'ArrowRight') {
        // On right navigation:
        // - try to align target's left edge to scrollables X position (+ leftEdgePaddingPx).
        // - if not enough scrollable space
        //    - either there is no scroll required, OR
        //    - there is scroll required to bring the target into the visible area
        var horizontalDelta = 0;
        var needsHorizontalScroll = false;
        var desiredDelta = targetHRect.left - horizontalRects.visibleContainerRect.left - this._scrollConfig.leftEdgePaddingPx;
        var scrollable = horizontalScroll.scrollable;
        var currentScrollPosition = scrollable.scrollLeft;
        var maxScroll = Math.max(0, scrollable.scrollWidth - scrollable.clientWidth);
        var nextDesiredScroll = currentScrollPosition + desiredDelta;
        var canAchieveAlignment = nextDesiredScroll >= 0 && nextDesiredScroll <= maxScroll;
        if (canAchieveAlignment) {
          // Enough space: apply alignment scroll
          horizontalDelta = desiredDelta;
          needsHorizontalScroll = desiredDelta !== 0;
        } else {
          // Not enough space: get defaults which bring the target into the visible area.
          var _horizontal = getAxisScrollDelta(targetHRect, horizontalRects.visibleContainerRect, 'horizontal', this._scrollConfig.topEdgePaddingPx, this._scrollConfig.leftEdgePaddingPx);
          horizontalDelta = _horizontal.scrollDelta;
          needsHorizontalScroll = _horizontal.needsScroll;
        }

        // We may still need vertical scroll to maintain target within the visible area
        var _vertical = getAxisScrollDelta(targetVRect, verticalRects.visibleContainerRect, 'vertical', this._scrollConfig.topEdgePaddingPx, this._scrollConfig.leftEdgePaddingPx);
        return {
          horizontalDelta,
          verticalDelta: _vertical.scrollDelta,
          verticalRects,
          horizontalRects,
          needsHorizontalScroll,
          needsVerticalScroll: _vertical.needsScroll
        };
      } else {
        // On left navigation:
        // - default to keeping the target fully visible (including leftEdgePaddingPx)
        var _horizontal2 = getAxisScrollDelta(targetHRect, horizontalRects.visibleContainerRect, 'horizontal', this._scrollConfig.topEdgePaddingPx, this._scrollConfig.leftEdgePaddingPx);

        // We may still need vertical scroll to maintain target within the visible area
        var _vertical2 = getAxisScrollDelta(targetVRect, verticalRects.visibleContainerRect, 'vertical', this._scrollConfig.topEdgePaddingPx, this._scrollConfig.leftEdgePaddingPx);
        return {
          horizontalDelta: _horizontal2.scrollDelta,
          verticalDelta: _vertical2.scrollDelta,
          verticalRects,
          horizontalRects,
          needsHorizontalScroll: _horizontal2.needsScroll,
          needsVerticalScroll: _vertical2.needsScroll
        };
      }
    };
    var delta = computeAlignLeftDeltas();
    if (!delta.needsHorizontalScroll && !delta.needsVerticalScroll) {
      return null;
    }
    this._isSpatialManagerInitiatedScroll = true;
    var runAxis = (axis, delta, animate) => {
      if (delta === 0) {
        return;
      }
      var scrollInfo = axis === 'vertical' ? verticalScroll : horizontalScroll;
      this.scrollAxis(scrollInfo.scrollable, scrollInfo.isWindowScroll, axis === 'vertical', delta, animate);
    };
    if (delta.needsHorizontalScroll && delta.needsVerticalScroll) {
      // Both axes need scrolling: prioritize horizontal (AlignLeft alignment) first.

      // if (verticalScroll.scrollable === horizontalScroll.scrollable) {
      //   // Same scrollable: run once only as the scrollTo
      //   runAxis('horizontal', delta.horizontalDelta);
      //   return null;
      // }
      runAxis('horizontal', delta.horizontalDelta, false);
      runAxis('vertical', delta.verticalDelta, true);
      return null;
    }
    if (delta.needsHorizontalScroll) {
      runAxis('horizontal', delta.horizontalDelta, true);
      return null;
    }
    runAxis('vertical', delta.verticalDelta, true);
    return null;
  }

  /**
   * maybeScrollOnFocus
   * Main scroll-on-focus entry point dispatching to AlignLeft or default behavior.
   * Ensures focused element is visible in viewport by scrolling container as needed.
   * Handles both single and multi-axis scrolling with proper sequencing.
   * @param {ElemData} nextElemData - The element about to receive focus
   * @param {ElemData | null} currentElemData - The currently focused element
   * @param {string} keyCode - Navigation key code that triggered focus change
   * @returns {null}
   */
  maybeScrollOnFocus(nextElemData, currentElemData, keyCode) {
    var elem = nextElemData.elem;
    if (!elem || typeof window === 'undefined') return null;
    var verticalScroll = findScrollableAncestor(elem, 'vertical');
    var horizontalScroll = findScrollableAncestor(elem, 'horizontal');
    if (this._focusMode === 'AlignLeft') {
      return this.scrollToAlignLeft(nextElemData, keyCode, currentElemData, verticalScroll, horizontalScroll);
    }
    var computeDeltas = () => {
      var _getBoundingRectangle2 = getBoundingRectangles(horizontalScroll.scrollable, horizontalScroll.isWindowScroll, verticalScroll.scrollable, verticalScroll.isWindowScroll, nextElemData),
        verticalRects = _getBoundingRectangle2.verticalRects,
        horizontalRects = _getBoundingRectangle2.horizontalRects,
        targetHRect = _getBoundingRectangle2.targetHRect,
        targetVRect = _getBoundingRectangle2.targetVRect;
      var vertical = getAxisScrollDelta(targetVRect, verticalRects.visibleContainerRect, 'vertical', this._scrollConfig.topEdgePaddingPx, this._scrollConfig.leftEdgePaddingPx);
      var horizontal = getAxisScrollDelta(targetHRect, horizontalRects.visibleContainerRect, 'horizontal', this._scrollConfig.topEdgePaddingPx, this._scrollConfig.leftEdgePaddingPx);
      return {
        vertical,
        horizontal,
        verticalRects,
        horizontalRects
      };
    };
    var delta = computeDeltas();
    if (!delta.vertical.needsScroll && !delta.horizontal.needsScroll) {
      return null;
    }

    // Mark that we're about to initiate a scroll (so the listener knows to skip reacquisition)
    this._isSpatialManagerInitiatedScroll = true;
    var runAxis = (axis, deltaInfo, animate) => {
      if (!deltaInfo.needsScroll) {
        return;
      }
      var scrollInfo = axis === 'vertical' ? verticalScroll : horizontalScroll;
      this.scrollAxis(scrollInfo.scrollable, scrollInfo.isWindowScroll, axis === 'vertical', deltaInfo.scrollDelta, animate);
    };
    if (delta.vertical.needsScroll && delta.horizontal.needsScroll) {
      // Both axes need scrolling: scroll the larger delta first (better UX).
      // After primary axis settles, recompute secondary to handle post-scroll state changes.
      // Sequential approach prevents conflicting operations.
      var primaryAxis = Math.abs(delta.vertical.scrollDelta) >= Math.abs(delta.horizontal.scrollDelta) ? 'vertical' : 'horizontal';
      var secondaryAxis = primaryAxis === 'vertical' ? 'horizontal' : 'vertical';
      var primaryInfo = primaryAxis === 'vertical' ? delta.vertical : delta.horizontal;
      runAxis(primaryAxis, primaryInfo, true);
      var secondaryInfo = secondaryAxis === 'vertical' ? delta.vertical : delta.horizontal;
      runAxis(secondaryAxis, secondaryInfo, false);
      return null;
    }
    if (delta.vertical.needsScroll) {
      runAxis('vertical', delta.vertical, true);
      return null;
    }
    runAxis('horizontal', delta.horizontal, true);
    return null;
  }

  /**
   * setupAppInitiatedScrollHandler
   * Detects app-initiated scrolls and reacquires focus if element leaves viewport.
   * Uses debounced scroll listener only.
   * Distinguishes between SpatialManager-initiated and app-initiated scrolls.
   * @param {HTMLElement | Document} container - The container element or document to observe
   * @param {getCurrentFocusType} getCurrentFocus - Callback retrieving current focus state
   * @param {onScrollRefocusType} onScrollRefocus - Callback for app-initiated scroll refocus
   * @returns {() => void} Cleanup function to remove event listeners and cancel timeouts
   */
  setupAppInitiatedScrollHandler(container, getCurrentFocus, onScrollRefocus) {
    var handleScrollEnd = e => {
      // If SpatialManager initiated this scroll, it already handled focus
      if (this._isSpatialManagerInitiatedScroll) {
        this._isSpatialManagerInitiatedScroll = false;
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
        // Infer scroll direction from scrollContainer
        var scrollDirection = inferScrollDirection(scrollContainer);

        // Call maybeScrollOnFocus to bring currentFocus fully into view
        // This maintains focus continuity while respecting app-initiated scroll
        this.maybeScrollOnFocus(currentFocus.elem, currentFocus.elem,
        // TODO: Handle this better: navigationFrom is currentFocus itself
        scrollDirection);
        return;
      }

      // Case 3: currentFocus is completely out of viewport (0% visible)
      // REACQUIRE focus by finding first focusable in scrollContainer

      // App-initiated scroll - focused element is completely out of view
      // Need to find a new focus in the scrolled container
      onScrollRefocus({
        currentFocus,
        scrollContainer
      });
    };
    var handleScrollFallback = e => {
      // Debounce: only process after scroll has settled (100ms idle)
      if (this._reacquireFocusTimeout != null) {
        clearTimeout(this._reacquireFocusTimeout);
      }
      this._reacquireFocusTimeout = setTimeout(() => {
        handleScrollEnd(e);
        this._reacquireFocusTimeout = null;
      }, 100);
    };
    if (typeof window !== 'undefined') {
      if (this._hasScrollEndEvent) {
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
        if (this._hasScrollEndEvent) {
          window.removeEventListener('scrollend', handleScrollEnd);
        } else {
          window.removeEventListener('scroll', handleScrollFallback, {
            capture: true
          });
        }
      }
      if (this._reacquireFocusTimeout != null) {
        clearTimeout(this._reacquireFocusTimeout);
        this._reacquireFocusTimeout = null;
      }
    };
  }

  /**
   * scrollToEdge
   * Scrolled to the edge of an elements scrollable, if available
   * @param {HTMLElement | null} elem Referece element
   * @param {string} keyCode Key code to derive direction from
   * @return {null}
   */
  scrollToEdge(elem, keyCode) {
    if (!elem) {
      return null;
    }
    var isVertical = keyCode === 'ArrowUp' || keyCode === 'ArrowDown';
    var scrollInfo = findScrollableAncestor(elem, isVertical ? 'vertical' : 'horizontal');
    if (!scrollInfo || !scrollInfo.scrollable) {
      return null;
    }
    var scrollable = scrollInfo.scrollable,
      isWindowScroll = scrollInfo.isWindowScroll;
    var currentOffset = isVertical ? scrollable.scrollTop : scrollable.scrollLeft;
    var maxOffset = isVertical ? Math.max(0, scrollable.scrollHeight - scrollable.clientHeight) : Math.max(0, scrollable.scrollWidth - scrollable.clientWidth);
    var targetOffset = keyCode === 'ArrowUp' || keyCode === 'ArrowLeft' ? 0 : maxOffset;
    var delta = targetOffset - currentOffset;
    if (delta === 0) {
      return null;
    }
    this.scrollAxis(scrollable, isWindowScroll, isVertical, delta, true);
    return null;
  }
}
Object.defineProperty(ScrollHandler, _instance, {
  writable: true,
  value: null
});
var scrollHandler = new ScrollHandler();
export var setupScrollHandler = scrollHandler.setupScrollHandler.bind(scrollHandler);
export var setupAppInitiatedScrollHandler = scrollHandler.setupAppInitiatedScrollHandler.bind(scrollHandler);
export { isElementInWindowViewport };
export var scrollToEdge = scrollHandler.scrollToEdge.bind(scrollHandler);
export var maybeScrollOnFocus = scrollHandler.maybeScrollOnFocus.bind(scrollHandler);