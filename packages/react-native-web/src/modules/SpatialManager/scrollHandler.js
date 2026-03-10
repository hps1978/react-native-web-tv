/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow strict
 * @format
 */
import {
  getCurrentTime,
  scheduleAnimationFrame,
  cancelScheduledFrame,
  findScrollableAncestor,
  isElementInWindowViewport,
  getElementVisibilityRatio,
  inferScrollDirection,
  getBoundingRectangles,
  getAxisScrollDelta
} from './utils';
import type { ElemData, ScrollableAncestorInfo } from './utils';

type SpatialScrollConfigType = {
  leftEdgePaddingPx?: number,
  topEdgePaddingPx?: number,
  scrollThrottleMs?: number, // not used for now
  smoothScrollEnabled?: boolean,
  scrollAnimationDurationMsVertical?: number,
  scrollAnimationDurationMsHorizontal?: number
};

type ResolvedSpatialScrollConfigType = {
  leftEdgePaddingPx: number,
  topEdgePaddingPx: number,
  scrollThrottleMs: number,
  smoothScrollEnabled: boolean,
  scrollAnimationDurationMsVertical: number,
  scrollAnimationDurationMsHorizontal: number
};

type ScrollStateType = {
  scrollAnimationFrame: number | null
};

type getCurrentFocusType = () => {
  elem: HTMLElement | null,
  parentContainer: HTMLElement | null
};

type onScrollRefocusType = (params: {
  currentFocus: ElemData,
  scrollContainer: HTMLElement | null
}) => void;

const DEFAULT_SPATIAL_SCROLL_CONFIG: ResolvedSpatialScrollConfigType = {
  leftEdgePaddingPx: 0, // only used on the left edge and in horizontal scrolling
  topEdgePaddingPx: 0, // only used on the top edge and in vertical up scrolling
  scrollThrottleMs: 80, // not used for now
  smoothScrollEnabled: false,
  scrollAnimationDurationMsVertical: 0,
  scrollAnimationDurationMsHorizontal: 0
};

// Singleton class to manage scroll operations
class ScrollHandler {
  static #_instance: ScrollHandler | null = null;
  _isConfigured: boolean;
  _scrollConfig: ResolvedSpatialScrollConfigType;
  _focusMode: 'AlignLeft' | 'default';
  _scrollState: ScrollStateType;
  _isSpatialManagerInitiatedScroll: boolean;
  _reacquireFocusTimeout: TimeoutID | null;
  _hasScrollEndEvent: boolean;

  /**
   * constructor
   * Initializes or returns the singleton instance of ScrollHandler.
   * Sets up default scroll configuration and internal state tracking.
   * @returns {ScrollHandler} The singleton instance
   */
  constructor() {
    if (ScrollHandler.#_instance) {
      return ScrollHandler.#_instance;
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

    ScrollHandler.#_instance = this;
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
  setupScrollHandler(config?: {
    scrollConfig?: SpatialScrollConfigType,
    focusMode?: 'AlignLeft' | 'default',
    scrollState?: ScrollStateType
  }): void {
    if (this._isConfigured) {
      return;
    }

    if (config?.scrollConfig) {
      this._scrollConfig = {
        ...this._scrollConfig,
        ...config.scrollConfig
      };
    }

    this._focusMode = config?.focusMode || this._focusMode;

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
  animateScrollTo(
    scrollable: any,
    isVertical: boolean,
    nextOffset: number,
    durationMs: number
  ) {
    const startOffset = isVertical
      ? scrollable.scrollTop
      : scrollable.scrollLeft;
    const delta = nextOffset - startOffset;

    if (delta === 0 || durationMs <= 0) return;

    if (this._scrollState.scrollAnimationFrame != null) {
      cancelScheduledFrame(this._scrollState.scrollAnimationFrame);
      this._scrollState.scrollAnimationFrame = null;
    }

    const startTime = getCurrentTime();
    const easingFunction = (t) => t * (2 - t); // Example: easeOutQuad

    const step = (now) => {
      const elapsed = now - startTime;
      const t = Math.min(1, elapsed / durationMs);
      const easedT = easingFunction(t);
      const value = startOffset + delta * easedT;

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
        this._scrollState.scrollAnimationFrame = scheduleAnimationFrame(() =>
          step(getCurrentTime())
        );
      } else {
        this._scrollState.scrollAnimationFrame = null;
      }
    };

    this._scrollState.scrollAnimationFrame = scheduleAnimationFrame(() =>
      step(getCurrentTime())
    );
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
  performScroll(
    scrollable: any,
    isVertical: boolean,
    nextOffset: number,
    liveNextOffset: number,
    animate: boolean = false
  ) {
    const durationMs = isVertical
      ? this._scrollConfig.scrollAnimationDurationMsVertical
      : this._scrollConfig.scrollAnimationDurationMsHorizontal;

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
  scrollAxis(
    scrollable: any,
    isWindowScroll: boolean,
    isVertical: boolean,
    scrollDelta: number,
    animate: boolean = false
  ): void {
    if (scrollDelta === 0) {
      return;
    }

    const currentOffset = isVertical
      ? scrollable.scrollTop
      : scrollable.scrollLeft;

    const maxOffset = isVertical
      ? Math.max(0, scrollable.scrollHeight - scrollable.clientHeight)
      : Math.max(0, scrollable.scrollWidth - scrollable.clientWidth);

    const liveOffset = currentOffset;
    const liveNextOffset = isWindowScroll
      ? Math.min(Math.max(liveOffset + scrollDelta, 0), maxOffset)
      : Math.max(liveOffset + scrollDelta, 0);

    const nextOffset = isWindowScroll
      ? Math.min(currentOffset + scrollDelta, maxOffset)
      : currentOffset + scrollDelta;

    this.performScroll(
      scrollable,
      isVertical,
      nextOffset,
      liveNextOffset,
      animate
    );
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
  scrollToAlignLeft(
    elemData: ElemData,
    keyCode: string,
    currentElemData: ElemData | null,
    verticalScroll: ScrollableAncestorInfo,
    horizontalScroll: ScrollableAncestorInfo
  ) {
    const { elem } = elemData;
    if (!elem || typeof window === 'undefined') return;

    const computeAlignLeftDeltas = () => {
      const { verticalRects, horizontalRects, targetHRect, targetVRect } =
        getBoundingRectangles(
          horizontalScroll.scrollable,
          horizontalScroll.isWindowScroll,
          verticalScroll.scrollable,
          verticalScroll.isWindowScroll,
          elemData
        );

      // Vertical nav computation
      if (keyCode === 'ArrowUp' || keyCode === 'ArrowDown') {
        // Make sure the target is fully visible
        const vertical = getAxisScrollDelta(
          targetVRect,
          verticalRects.visibleContainerRect,
          'vertical',
          this._scrollConfig.topEdgePaddingPx,
          this._scrollConfig.leftEdgePaddingPx
        );

        // We may still need horizontal scroll to maintain target within the visible area
        const horizontal = getAxisScrollDelta(
          targetHRect,
          horizontalRects.visibleContainerRect,
          'horizontal',
          this._scrollConfig.topEdgePaddingPx,
          this._scrollConfig.leftEdgePaddingPx
        );

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
        let horizontalDelta = 0;
        let needsHorizontalScroll = false;
        const desiredDelta =
          targetHRect.left -
          horizontalRects.visibleContainerRect.left -
          this._scrollConfig.leftEdgePaddingPx;
        const scrollable = horizontalScroll.scrollable;
        const currentScrollPosition = scrollable.scrollLeft;
        const maxScroll = Math.max(
          0,
          scrollable.scrollWidth - scrollable.clientWidth
        );
        const nextDesiredScroll = currentScrollPosition + desiredDelta;
        const canAchieveAlignment =
          nextDesiredScroll >= 0 && nextDesiredScroll <= maxScroll;

        if (canAchieveAlignment) {
          // Enough space: apply alignment scroll
          horizontalDelta = desiredDelta;
          needsHorizontalScroll = desiredDelta !== 0;
        } else {
          // Not enough space: get defaults which bring the target into the visible area.
          const horizontal = getAxisScrollDelta(
            targetHRect,
            horizontalRects.visibleContainerRect,
            'horizontal',
            this._scrollConfig.topEdgePaddingPx,
            this._scrollConfig.leftEdgePaddingPx
          );
          horizontalDelta = horizontal.scrollDelta;
          needsHorizontalScroll = horizontal.needsScroll;
        }

        // We may still need vertical scroll to maintain target within the visible area
        const vertical = getAxisScrollDelta(
          targetVRect,
          verticalRects.visibleContainerRect,
          'vertical',
          this._scrollConfig.topEdgePaddingPx,
          this._scrollConfig.leftEdgePaddingPx
        );

        return {
          horizontalDelta,
          verticalDelta: vertical.scrollDelta,
          verticalRects,
          horizontalRects,
          needsHorizontalScroll,
          needsVerticalScroll: vertical.needsScroll
        };
      } else {
        // On left navigation:
        // - default to keeping the target fully visible (including leftEdgePaddingPx)
        const horizontal = getAxisScrollDelta(
          targetHRect,
          horizontalRects.visibleContainerRect,
          'horizontal',
          this._scrollConfig.topEdgePaddingPx,
          this._scrollConfig.leftEdgePaddingPx
        );

        // We may still need vertical scroll to maintain target within the visible area
        const vertical = getAxisScrollDelta(
          targetVRect,
          verticalRects.visibleContainerRect,
          'vertical',
          this._scrollConfig.topEdgePaddingPx,
          this._scrollConfig.leftEdgePaddingPx
        );

        return {
          horizontalDelta: horizontal.scrollDelta,
          verticalDelta: vertical.scrollDelta,
          verticalRects,
          horizontalRects,
          needsHorizontalScroll: horizontal.needsScroll,
          needsVerticalScroll: vertical.needsScroll
        };
      }
    };

    const delta = computeAlignLeftDeltas();

    if (!delta.needsHorizontalScroll && !delta.needsVerticalScroll) {
      return null;
    }

    this._isSpatialManagerInitiatedScroll = true;

    const runAxis = (
      axis: 'vertical' | 'horizontal',
      delta: number,
      animate: boolean
    ): void => {
      if (delta === 0) {
        return;
      }

      const scrollInfo =
        axis === 'vertical' ? verticalScroll : horizontalScroll;
      this.scrollAxis(
        scrollInfo.scrollable,
        scrollInfo.isWindowScroll,
        axis === 'vertical',
        delta,
        animate
      );
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
  maybeScrollOnFocus(
    nextElemData: ElemData,
    currentElemData: ElemData | null,
    keyCode: string
  ) {
    const { elem } = nextElemData;

    if (!elem || typeof window === 'undefined') return null;

    const verticalScroll = findScrollableAncestor(elem, 'vertical');
    const horizontalScroll = findScrollableAncestor(elem, 'horizontal');

    if (this._focusMode === 'AlignLeft') {
      return this.scrollToAlignLeft(
        nextElemData,
        keyCode,
        currentElemData,
        verticalScroll,
        horizontalScroll
      );
    }

    const computeDeltas = () => {
      const { verticalRects, horizontalRects, targetHRect, targetVRect } =
        getBoundingRectangles(
          horizontalScroll.scrollable,
          horizontalScroll.isWindowScroll,
          verticalScroll.scrollable,
          verticalScroll.isWindowScroll,
          nextElemData
        );

      const vertical = getAxisScrollDelta(
        targetVRect,
        verticalRects.visibleContainerRect,
        'vertical',
        this._scrollConfig.topEdgePaddingPx,
        this._scrollConfig.leftEdgePaddingPx
      );
      const horizontal = getAxisScrollDelta(
        targetHRect,
        horizontalRects.visibleContainerRect,
        'horizontal',
        this._scrollConfig.topEdgePaddingPx,
        this._scrollConfig.leftEdgePaddingPx
      );

      return { vertical, horizontal, verticalRects, horizontalRects };
    };

    const delta = computeDeltas();

    if (!delta.vertical.needsScroll && !delta.horizontal.needsScroll) {
      return null;
    }

    // Mark that we're about to initiate a scroll (so the listener knows to skip reacquisition)
    this._isSpatialManagerInitiatedScroll = true;

    const runAxis = (
      axis: 'vertical' | 'horizontal',
      deltaInfo: { needsScroll: boolean, scrollDelta: number },
      animate: boolean
    ): void => {
      if (!deltaInfo.needsScroll) {
        return;
      }

      const scrollInfo =
        axis === 'vertical' ? verticalScroll : horizontalScroll;
      this.scrollAxis(
        scrollInfo.scrollable,
        scrollInfo.isWindowScroll,
        axis === 'vertical',
        deltaInfo.scrollDelta,
        animate
      );
    };

    if (delta.vertical.needsScroll && delta.horizontal.needsScroll) {
      // Both axes need scrolling: scroll the larger delta first (better UX).
      // After primary axis settles, recompute secondary to handle post-scroll state changes.
      // Sequential approach prevents conflicting operations.
      const primaryAxis =
        Math.abs(delta.vertical.scrollDelta) >=
        Math.abs(delta.horizontal.scrollDelta)
          ? 'vertical'
          : 'horizontal';
      const secondaryAxis =
        primaryAxis === 'vertical' ? 'horizontal' : 'vertical';

      const primaryInfo =
        primaryAxis === 'vertical' ? delta.vertical : delta.horizontal;

      runAxis(primaryAxis, primaryInfo, true);
      const secondaryInfo =
        secondaryAxis === 'vertical' ? delta.vertical : delta.horizontal;
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
  setupAppInitiatedScrollHandler(
    container: HTMLElement | Document,
    getCurrentFocus: getCurrentFocusType,
    onScrollRefocus: onScrollRefocusType
  ): () => void {
    const handleScrollEnd = (e: any) => {
      // If SpatialManager initiated this scroll, it already handled focus
      if (this._isSpatialManagerInitiatedScroll) {
        this._isSpatialManagerInitiatedScroll = false;
        return;
      }

      const currentFocus = getCurrentFocus();
      if (!currentFocus || !currentFocus.elem) {
        return;
      }

      const target = e?.target;
      const scrollContainer =
        target &&
        target !== window &&
        target !== document &&
        target !== document.documentElement
          ? (target: any)
          : null;

      // Case 1: currentFocus is fully in window viewport - do nothing
      if (isElementInWindowViewport(currentFocus.elem)) {
        return;
      }

      // Case 2 & 3: currentFocus is partially or completely out of viewport
      // Check visibility ratio to decide: preserve focus or reacquire
      const visibilityRatio = getElementVisibilityRatio(currentFocus.elem);

      if (visibilityRatio > 0) {
        // Case 2: currentFocus is partially visible (e.g., 10% in viewport)
        // PRESERVE focus continuity by scrolling it fully back into view
        // Infer scroll direction from scrollContainer
        const scrollDirection = inferScrollDirection(scrollContainer);

        // Call maybeScrollOnFocus to bring currentFocus fully into view
        // This maintains focus continuity while respecting app-initiated scroll
        this.maybeScrollOnFocus(
          currentFocus,
          currentFocus, // TODO: Handle this better: navigationFrom is currentFocus itself
          scrollDirection
        );
        return;
      }

      // Case 3: currentFocus is completely out of viewport (0% visible)
      // REACQUIRE focus by finding first focusable in scrollContainer

      // App-initiated scroll - focused element is completely out of view
      // Need to find a new focus in the scrolled container
      onScrollRefocus({ currentFocus, scrollContainer });
    };

    const handleScrollFallback = (e) => {
      // Debounce: only process after scroll has settled (100ms idle)
      if (this._reacquireFocusTimeout != null) {
        clearTimeout(this._reacquireFocusTimeout);
      }

      this._reacquireFocusTimeout = (setTimeout(() => {
        handleScrollEnd(e);
        this._reacquireFocusTimeout = null;
      }, 100): any);
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
  scrollToEdge(elem: HTMLElement | null, keyCode: string) {
    if (!elem) {
      return null;
    }

    const isVertical = keyCode === 'ArrowUp' || keyCode === 'ArrowDown';
    const scrollInfo = findScrollableAncestor(
      elem,
      isVertical ? 'vertical' : 'horizontal'
    );

    if (!scrollInfo || !scrollInfo.scrollable) {
      return null;
    }

    const { scrollable, isWindowScroll } = scrollInfo;
    const currentOffset = isVertical
      ? scrollable.scrollTop
      : scrollable.scrollLeft;
    const maxOffset = isVertical
      ? Math.max(0, scrollable.scrollHeight - scrollable.clientHeight)
      : Math.max(0, scrollable.scrollWidth - scrollable.clientWidth);

    const targetOffset =
      keyCode === 'ArrowUp' || keyCode === 'ArrowLeft' ? 0 : maxOffset;

    const delta = targetOffset - currentOffset;
    if (delta === 0) {
      return null;
    }

    this.scrollAxis(scrollable, isWindowScroll, isVertical, delta, true);
    return null;
  }
}

export type {
  SpatialScrollConfigType,
  getCurrentFocusType,
  onScrollRefocusType,
  ElemData
};

const scrollHandler = new ScrollHandler();
export const setupScrollHandler: (config?: {
  scrollConfig?: SpatialScrollConfigType,
  focusMode?: 'AlignLeft' | 'default',
  scrollState?: ScrollStateType
}) => void = (config) => scrollHandler.setupScrollHandler(config);
export const setupAppInitiatedScrollHandler: (
  container: HTMLElement | Document,
  getCurrentFocus: getCurrentFocusType,
  onScrollRefocus: onScrollRefocusType
) => () => void = (container, getCurrentFocus, onScrollRefocus) =>
  scrollHandler.setupAppInitiatedScrollHandler(
    container,
    getCurrentFocus,
    onScrollRefocus
  );
export { isElementInWindowViewport };
export const scrollToEdge: (
  elem: HTMLElement | null,
  keyCode: string
) => null = (elem, keyCode) => scrollHandler.scrollToEdge(elem, keyCode);
export const maybeScrollOnFocus: (
  nextElemData: ElemData,
  currentElemData: ElemData | null,
  keyCode: string
) => null = (nextElemData, currentElemData, keyCode) =>
  scrollHandler.maybeScrollOnFocus(nextElemData, currentElemData, keyCode);
