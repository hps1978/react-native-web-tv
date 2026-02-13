/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow strict
 * @format
 */

type SpatialScrollConfig = {
  edgeThresholdPx?: number,
  scrollThrottleMs?: number,
  smoothScrollEnabled?: boolean,
  scrollAnimationDurationMs?: number,
  scrollAnimationDurationMsVertical?: number,
  scrollAnimationDurationMsHorizontal?: number
};

type ScrollState = {
  lastScrollAt: number,
  scrollAnimationFrame: number | null
};

// API capability detection (one-time check at module load).
// TV platforms may lack modern APIs, so we detect and fall back gracefully.
// This avoids repeated try-catch blocks on every scroll operation.
const hasPerformance =
  typeof performance !== 'undefined' && typeof performance.now === 'function';
const hasRequestAnimationFrame = typeof requestAnimationFrame === 'function';
const hasGetComputedStyle =
  typeof window !== 'undefined' &&
  typeof window.getComputedStyle === 'function';
const hasGetBoundingClientRect =
  typeof Element !== 'undefined' &&
  Element.prototype.getBoundingClientRect !== undefined;
const hasScrollEndEvent = false;
//   typeof window !== 'undefined' &&
//   'onscrollend' in window;

const DEBUG_SCROLL = () =>
  typeof window !== 'undefined' && window.__RNW_TV_SCROLL_DEBUG === true;

const DEFAULT_SPATIAL_SCROLL_CONFIG: SpatialScrollConfig = {
  edgeThresholdPx: 128,
  scrollThrottleMs: 80,
  smoothScrollEnabled: true,
  scrollAnimationDurationMs: 0,
  scrollAnimationDurationMsVertical: 0,
  scrollAnimationDurationMsHorizontal: 0
};

function getCurrentTime(): number {
  return hasPerformance ? performance.now() : Date.now();
}

function scheduleAnimationFrame(callback: () => void): number {
  if (hasRequestAnimationFrame) {
    return requestAnimationFrame(callback);
  }
  // Fallback: simulate 60fps with setTimeout (16ms per frame)
  return (setTimeout(callback, 16): any);
}

function cancelScheduledFrame(frameId: number): void {
  if (hasRequestAnimationFrame) {
    cancelAnimationFrame(frameId);
  } else {
    clearTimeout(frameId);
  }
}

function animateScrollTo(
  scrollable: any,
  isVertical: boolean,
  nextOffset: number,
  durationMs: number,
  scrollState: ScrollState
) {
  const startOffset = isVertical ? scrollable.scrollTop : scrollable.scrollLeft;
  const delta = nextOffset - startOffset;

  if (delta === 0 || durationMs <= 0) return;

  if (scrollState.scrollAnimationFrame != null) {
    cancelScheduledFrame(scrollState.scrollAnimationFrame);
    scrollState.scrollAnimationFrame = null;
  }

  const startTime = getCurrentTime();
  const step = (now: number) => {
    const elapsed = hasPerformance ? now - startTime : Date.now() - startTime;
    const t = Math.min(1, elapsed / durationMs);
    const value = startOffset + delta * t;

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
      scrollState.scrollAnimationFrame = scheduleAnimationFrame(() =>
        step(hasPerformance ? performance.now() : Date.now())
      );
    } else {
      scrollState.scrollAnimationFrame = null;
    }
  };

  scrollState.scrollAnimationFrame = scheduleAnimationFrame(() =>
    step(hasPerformance ? performance.now() : Date.now())
  );
}

function getScrollDurationMs(
  scrollConfig: SpatialScrollConfig,
  isVertical: boolean
): number {
  const directionDurationMs = isVertical
    ? scrollConfig.scrollAnimationDurationMsVertical
    : scrollConfig.scrollAnimationDurationMsHorizontal;
  return directionDurationMs != null
    ? directionDurationMs
    : scrollConfig.scrollAnimationDurationMs || 0;
}

function getScrollPosition(
  scrollable: any,
  isVertical: boolean,
  isWindowScroll: boolean
): number {
  if (isWindowScroll) {
    return isVertical ? window.scrollY : window.scrollX;
  }
  return isVertical ? scrollable.scrollTop : scrollable.scrollLeft;
}

// Calculate if and how much to scroll to keep an element visible within its container.
// Uses edge threshold (edgeThresholdPx) to maintain padding from container boundaries.
// Returns: { needsScroll: boolean, scrollDelta: number (in pixels) }
function getAxisScrollDelta(
  targetRect: any,
  visibleContainerRect: any,
  axis: 'vertical' | 'horizontal'
): { needsScroll: boolean, scrollDelta: number } {
  if (axis === 'vertical') {
    const targetHeight = targetRect.bottom - targetRect.top;
    const visibleHeight =
      visibleContainerRect.bottom - visibleContainerRect.top;

    if (targetHeight > visibleHeight) {
      const delta = targetRect.top - visibleContainerRect.top;
      return { needsScroll: delta !== 0, scrollDelta: delta };
    }

    if (targetRect.top < visibleContainerRect.top) {
      const delta = targetRect.top - visibleContainerRect.top;
      return { needsScroll: true, scrollDelta: delta };
    }

    if (targetRect.bottom > visibleContainerRect.bottom) {
      const delta = targetRect.bottom - visibleContainerRect.bottom;
      return { needsScroll: true, scrollDelta: delta };
    }

    return { needsScroll: false, scrollDelta: 0 };
  }

  const targetWidth = targetRect.right - targetRect.left;
  const visibleWidth = visibleContainerRect.right - visibleContainerRect.left;

  if (targetWidth > visibleWidth) {
    const delta = targetRect.left - visibleContainerRect.left;
    return { needsScroll: delta !== 0, scrollDelta: delta };
  }

  if (targetRect.left < visibleContainerRect.left) {
    const delta = targetRect.left - visibleContainerRect.left;
    return { needsScroll: true, scrollDelta: delta };
  }

  if (targetRect.right > visibleContainerRect.right) {
    const delta = targetRect.right - visibleContainerRect.right;
    return { needsScroll: true, scrollDelta: delta };
  }

  return { needsScroll: false, scrollDelta: 0 };
}

function waitForScrollSettle(
  scrollable: any,
  isVertical: boolean,
  isWindowScroll: boolean
): Promise<void> {
  const maxWaitMs = 500;
  let lastPos = getScrollPosition(scrollable, isVertical, isWindowScroll);
  let stableFrames = 0;
  const start = getCurrentTime();

  return new Promise((resolve) => {
    const step = () => {
      const currentPos = getScrollPosition(
        scrollable,
        isVertical,
        isWindowScroll
      );
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

function logScrollContainer(
  label: string,
  scrollableInfo: { scrollable: any, isWindowScroll: boolean },
  elem: HTMLElement
): void {
  const { scrollable, isWindowScroll } = scrollableInfo;
  if (isWindowScroll) {
    console.log('[SpatialManager][scroll] container ' + label, {
      isWindowScroll: true,
      scrollTop: window.scrollY,
      scrollHeight: document.documentElement?.scrollHeight,
      clientHeight: window.innerHeight
    });
    return;
  }

  const style = hasGetComputedStyle
    ? window.getComputedStyle(scrollable)
    : null;
  console.log('[SpatialManager][scroll] container ' + label, {
    isWindowScroll: false,
    sameAsTarget: scrollable === elem,
    tagName: scrollable.tagName,
    id: scrollable.id,
    className: scrollable.className,
    overflowY: style?.overflowY,
    overflowX: style?.overflowX,
    scrollTop: scrollable.scrollTop,
    scrollHeight: scrollable.scrollHeight,
    clientHeight: scrollable.clientHeight
  });
}

function scrollAxis(params: {
  scrollable: any,
  isWindowScroll: boolean,
  isVertical: boolean,
  scrollDelta: number,
  scrollConfig: SpatialScrollConfig,
  scrollState: ScrollState
}): Promise<void> {
  const { scrollable, isWindowScroll, isVertical, scrollDelta } = params;
  if (scrollDelta === 0) {
    return Promise.resolve();
  }

  const currentOffset = getScrollPosition(
    scrollable,
    isVertical,
    isWindowScroll
  );
  const maxOffset = isVertical
    ? Math.max(0, scrollable.scrollHeight - scrollable.clientHeight)
    : Math.max(0, scrollable.scrollWidth - scrollable.clientWidth);

  const liveOffset = currentOffset;
  const liveNextOffset = isWindowScroll
    ? Math.min(Math.max(liveOffset + scrollDelta, 0), maxOffset)
    : Math.max(liveOffset + scrollDelta, 0);

  const nextOffset = calculateNextOffset(
    currentOffset,
    scrollDelta,
    isWindowScroll,
    maxOffset
  );

  performScroll(
    scrollable,
    isVertical,
    params.scrollConfig,
    params.scrollState,
    nextOffset,
    liveNextOffset
  );

  const durationMs = getScrollDurationMs(params.scrollConfig, isVertical);
  if (durationMs > 0) {
    return new Promise((resolve) => {
      setTimeout(resolve, durationMs);
    });
  }

  return waitForScrollSettle(scrollable, isVertical, isWindowScroll);
}

function findScrollableAncestor(
  elem: HTMLElement | null,
  direction: 'vertical' | 'horizontal'
): HTMLElement | null {
  let current = elem ? elem.parentElement : null;
  while (current) {
    let overflowY = '';
    let overflowX = '';

    if (hasGetComputedStyle) {
      const style = window.getComputedStyle(current);
      overflowY = style.overflowY;
      overflowX = style.overflowX;
    } else {
      // Fallback: check inline styles only
      overflowY = current.style.overflowY || '';
      overflowX = current.style.overflowX || '';
    }

    const canScrollY =
      (overflowY === 'auto' ||
        overflowY === 'scroll' ||
        overflowY === 'overlay') &&
      current.scrollHeight > current.clientHeight;
    const canScrollX =
      (overflowX === 'auto' ||
        overflowX === 'scroll' ||
        overflowX === 'overlay') &&
      current.scrollWidth > current.clientWidth;

    if (
      (direction === 'vertical' && canScrollY) ||
      (direction === 'horizontal' && canScrollX)
    ) {
      return current;
    }

    if (current === document.body || current === document.documentElement) {
      break;
    }

    current = current.parentElement;
  }
  return null;
}

function resolveScrollable(
  elem: HTMLElement,
  direction: 'vertical' | 'horizontal'
) {
  let scrollable = findScrollableAncestor(elem, direction);
  const isWindowScroll = !scrollable;

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
      scrollTo: (options: any) => {
        const scrollParam = {
          top: options.y !== undefined ? options.y : window.scrollY,
          left: options.x !== undefined ? options.x : window.scrollX,
          behavior: options.animated ? 'smooth' : 'auto'
        };
        window.scroll
          ? window.scroll(scrollParam)
          : window.scrollTo(scrollParam);
      }
    };
  }

  return { scrollable, isWindowScroll };
}

// Resolve element and container rectangles, clamping to viewport for accuracy.
// Important: bounding rects are viewport-relative, not document-relative.
// This avoids coordinate system mismatches when scrolling.
function resolveRects(
  scrollable: any,
  isWindowScroll: boolean,
  elem: HTMLElement
) {
  let containerRect;
  let targetRect;

  if (hasGetBoundingClientRect) {
    containerRect = scrollable.getBoundingClientRect();
    targetRect = elem.getBoundingClientRect();
  } else {
    // Fallback: use offset dimensions (less precise, but better than nothing)
    containerRect = {
      top: (scrollable: any).offsetTop || 0,
      left: (scrollable: any).offsetLeft || 0,
      bottom:
        ((scrollable: any).offsetTop || 0) +
        ((scrollable: any).offsetHeight || 0),
      right:
        ((scrollable: any).offsetLeft || 0) +
        ((scrollable: any).offsetWidth || 0)
    };
    targetRect = {
      top: elem.offsetTop || 0,
      left: elem.offsetLeft || 0,
      bottom: (elem.offsetTop || 0) + (elem.offsetHeight || 0),
      right: (elem.offsetLeft || 0) + (elem.offsetWidth || 0)
    };
  }

  const viewportRect = {
    top: 0,
    bottom: window.innerHeight,
    left: 0,
    right: window.innerWidth
  };

  // Clamp container rect to viewport bounds so we don't scroll outside the visible area.
  // This is critical for accurate visibility detection when container is partially off-screen.
  const visibleContainerRect = isWindowScroll
    ? viewportRect
    : {
        top: Math.max(containerRect.top, viewportRect.top),
        bottom: Math.min(containerRect.bottom, viewportRect.bottom),
        left: Math.max(containerRect.left, viewportRect.left),
        right: Math.min(containerRect.right, viewportRect.right)
      };

  return { containerRect, targetRect, visibleContainerRect, viewportRect };
}

function performScroll(
  scrollable: any,
  isVertical: boolean,
  scrollConfig: SpatialScrollConfig,
  scrollState: ScrollState,
  nextOffset: number,
  liveNextOffset: number
) {
  const directionDurationMs = isVertical
    ? scrollConfig.scrollAnimationDurationMsVertical
    : scrollConfig.scrollAnimationDurationMsHorizontal;
  const durationMs =
    directionDurationMs != null
      ? directionDurationMs
      : scrollConfig.scrollAnimationDurationMs || 0;

  if (durationMs > 0) {
    animateScrollTo(
      scrollable,
      isVertical,
      liveNextOffset,
      durationMs,
      scrollState
    );
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

function calculateNextOffset(
  currentOffset: number,
  scrollDelta: number,
  isWindowScroll: boolean,
  maxOffset: number
): number {
  if (isWindowScroll) {
    return Math.min(currentOffset + scrollDelta, maxOffset);
  }

  return currentOffset + scrollDelta;
}

type ReAcquireFocusOptions = {
  getCurrentFocus: () => {
    elem: HTMLElement | null,
    parentHasAutofocus: boolean
  },
  onScrollRefocus: (params: {
    currentFocus: { elem: HTMLElement | null, parentHasAutofocus: boolean },
    scrollContainer: HTMLElement | null
  }) => void
};

// Flag to track if the current scroll was initiated by SpatialManager
// Checked in the scrollend event to determine if focus reacquisition is needed
let isSpatialManagerInitiatedScroll: boolean = false;

// Debounce timer for fallback scroll handler (when scrollend not available)
let reacquireFocusTimeout: number | null = null;

/**
 * Mark that a scroll is being initiated by SpatialManager (for focus).
 * The flag will be checked in the scrollend event handler.
 */
function markSpatialManagerScroll(): void {
  isSpatialManagerInitiatedScroll = true;
}

/**
 * Unmark SpatialManager-initiated scroll (called after scrollend event processes it).
 */
function unmarkSpatialManagerScroll(): void {
  isSpatialManagerInitiatedScroll = false;
}

export function createScrollState(): ScrollState {
  return {
    lastScrollAt: 0,
    scrollAnimationFrame: null
  };
}

/**
 * Check if an element is visible within its scrollable container's viewport.
 * Used to determine if current focus is still in view after a scroll.
 */
export function isElementVisible(
  elem: HTMLElement,
  scrollContainer?: HTMLElement
): boolean {
  if (!elem || !hasGetBoundingClientRect) {
    return true; // Assume visible if we can't measure
  }

  try {
    const elemRect = elem.getBoundingClientRect();

    if (scrollContainer) {
      const containerRect = scrollContainer.getBoundingClientRect();
      return (
        elemRect.top < containerRect.bottom &&
        elemRect.bottom > containerRect.top &&
        elemRect.left < containerRect.right &&
        elemRect.right > containerRect.left
      );
    }

    // Default: check against viewport
    const viewportHeight =
      window.innerHeight || document.documentElement.clientHeight;
    const viewportWidth =
      window.innerWidth || document.documentElement.clientWidth;

    return (
      elemRect.top < viewportHeight &&
      elemRect.bottom > 0 &&
      elemRect.left < viewportWidth &&
      elemRect.right > 0
    );
  } catch (e) {
    return true; // Safe fallback
  }
}

/**
 * Reacquire focus after app-initiated scroll.
 * If current focus is no longer visible, find the best candidate within the scrolled container.
 * This is called after the scroll settles (debounced).
 */
export function reacquireFocusAfterScroll(
  currentFocusElem: HTMLElement | null,
  scrollContainer: HTMLElement | null,
  options: ReAcquireFocusOptions
): void {
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
export function setupAppInitiatedScrollHandler(
  container: HTMLElement | Document,
  options: ReAcquireFocusOptions
) {
  const handleScrollEnd = (e: any) => {
    // If SpatialManager initiated this scroll, it already handled focus
    if (isSpatialManagerInitiatedScroll) {
      unmarkSpatialManagerScroll();
      return;
    }

    const currentFocus = options.getCurrentFocus();
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

    if (isElementVisible(currentFocus.elem, scrollContainer || undefined)) {
      return;
    }

    // App-initiated scroll - focused element is now out of view
    options.onScrollRefocus({ currentFocus, scrollContainer });
  };

  const handleScrollFallback = (e) => {
    // Debounce: only process after scroll has settled (100ms idle)
    if (reacquireFocusTimeout != null) {
      clearTimeout(reacquireFocusTimeout);
    }

    reacquireFocusTimeout = (setTimeout(() => {
      handleScrollEnd(e);
      reacquireFocusTimeout = null;
    }, 100): any);
  };

  if (typeof window !== 'undefined') {
    if (hasScrollEndEvent) {
      // Modern approach: use scrollend event
      window.addEventListener('scrollend', handleScrollEnd, { passive: true });
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
function scrollToAlignLeft(
  elem: HTMLElement | null,
  keyCode: string,
  currentElem: HTMLElement | null,
  scrollConfig: SpatialScrollConfig,
  scrollState: ScrollState
) {
  if (!elem || typeof window === 'undefined') return;

  if (DEBUG_SCROLL()) {
    try {
      const curRect = currentElem?.getBoundingClientRect?.();
      const nextRect = elem.getBoundingClientRect();
      console.log('[SpatialManager][scroll] AlignLeft input', {
        keyCode,
        currentId: currentElem?.id,
        nextId: elem.id,
        curRect,
        nextRect
      });
    } catch (e) {
      console.log('[SpatialManager][scroll] AlignLeft input', {
        keyCode,
        currentId: currentElem?.id,
        nextId: elem.id,
        error: String(e)
      });
    }
  }

  const now = Date.now();
  if (scrollConfig.scrollThrottleMs != null) {
    if (now - scrollState.lastScrollAt < scrollConfig.scrollThrottleMs) {
      return null;
    }
  }

  const verticalScroll = resolveScrollable(elem, 'vertical');
  const horizontalScroll = resolveScrollable(elem, 'horizontal');

  const computeAlignLeftDeltas = () => {
    const verticalRects = resolveRects(
      verticalScroll.scrollable,
      verticalScroll.isWindowScroll,
      elem
    );
    const horizontalRects = resolveRects(
      horizontalScroll.scrollable,
      horizontalScroll.isWindowScroll,
      elem
    );

    const currentRect = currentElem?.getBoundingClientRect?.();
    let horizontalDelta = 0;
    let needsHorizontalScroll = false;

    if (keyCode === 'ArrowRight' && currentRect) {
      // On right navigation: try to align target's left edge to current focus X position.
      // This keeps focus visually fixed while content scrolls underneath.
      const desiredDelta = horizontalRects.targetRect.left - currentRect.left;
      const scrollable = horizontalScroll.scrollable;
      const currentScroll = getScrollPosition(
        scrollable,
        false,
        horizontalScroll.isWindowScroll
      );
      const maxScroll = Math.max(
        0,
        scrollable.scrollWidth - scrollable.clientWidth
      );

      // Critical boundary check: can we achieve alignment without exceeding max scroll?
      // This prevents breaking alignment at content boundaries (e.g., last item in list).
      const canAchieveAlignment = currentScroll + desiredDelta <= maxScroll;

      if (canAchieveAlignment) {
        // Enough space: apply alignment scroll
        horizontalDelta = desiredDelta;
        needsHorizontalScroll = desiredDelta !== 0;
      } else {
        // Not enough space: gracefully fall back to default visibility.
        // This prevents forcing a scroll that would break existing focus alignment.
        const horizontal = getAxisScrollDelta(
          horizontalRects.targetRect,
          horizontalRects.visibleContainerRect,
          'horizontal'
        );
        horizontalDelta = horizontal.scrollDelta;
        needsHorizontalScroll = horizontal.needsScroll;
      }
    } else {
      const horizontal = getAxisScrollDelta(
        horizontalRects.targetRect,
        horizontalRects.visibleContainerRect,
        'horizontal'
      );
      horizontalDelta = horizontal.scrollDelta;
      needsHorizontalScroll = horizontal.needsScroll;
    }

    // Vertical: use default behavior (keep visible with edge threshold)
    const vertical = getAxisScrollDelta(
      verticalRects.targetRect,
      verticalRects.visibleContainerRect,
      'vertical'
    );

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

  const initial = computeAlignLeftDeltas();

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

  const runAxis = (
    axis: 'vertical' | 'horizontal',
    delta: number
  ): Promise<void> => {
    if (delta === 0) {
      return Promise.resolve();
    }

    const scrollInfo = axis === 'vertical' ? verticalScroll : horizontalScroll;
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
      const after = computeAlignLeftDeltas();
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
export function maybeScrollOnFocus(
  elem: HTMLElement | null,
  keyCode: string,
  currentElem: HTMLElement | null,
  scrollConfig: SpatialScrollConfig,
  scrollState: ScrollState,
  focusMode?: 'AlignLeft' | 'default'
) {
  if (focusMode === 'AlignLeft') {
    return scrollToAlignLeft(
      elem,
      keyCode,
      currentElem,
      scrollConfig,
      scrollState
    );
  }

  // Default behavior
  if (!elem || typeof window === 'undefined') return;

  if (DEBUG_SCROLL()) {
    try {
      const curRect = currentElem?.getBoundingClientRect?.();
      const nextRect = elem.getBoundingClientRect();
      console.log('[SpatialManager][scroll] input', {
        keyCode,
        currentId: currentElem?.id,
        nextId: elem.id,
        curRect,
        nextRect
      });
    } catch (e) {
      console.log('[SpatialManager][scroll] input', {
        keyCode,
        currentId: currentElem?.id,
        nextId: elem.id,
        error: String(e)
      });
    }
  }

  const now = Date.now();
  if (scrollConfig.scrollThrottleMs != null) {
    if (now - scrollState.lastScrollAt < scrollConfig.scrollThrottleMs) {
      return null;
    }
  }

  const verticalScroll = resolveScrollable(elem, 'vertical');
  const horizontalScroll = resolveScrollable(elem, 'horizontal');

  const computeDeltas = () => {
    const verticalRects = resolveRects(
      verticalScroll.scrollable,
      verticalScroll.isWindowScroll,
      elem
    );
    const horizontalRects = resolveRects(
      horizontalScroll.scrollable,
      horizontalScroll.isWindowScroll,
      elem
    );

    const vertical = getAxisScrollDelta(
      verticalRects.targetRect,
      verticalRects.visibleContainerRect,
      'vertical'
    );
    const horizontal = getAxisScrollDelta(
      horizontalRects.targetRect,
      horizontalRects.visibleContainerRect,
      'horizontal'
    );

    return { vertical, horizontal, verticalRects, horizontalRects };
  };

  if (DEBUG_SCROLL()) {
    logScrollContainer('vertical', verticalScroll, elem);
    logScrollContainer('horizontal', horizontalScroll, elem);
  }

  const initial = computeDeltas();

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

  const runAxis = (
    axis: 'vertical' | 'horizontal',
    deltaInfo: { needsScroll: boolean, scrollDelta: number }
  ) => {
    if (!deltaInfo.needsScroll) {
      return Promise.resolve();
    }

    const scrollInfo = axis === 'vertical' ? verticalScroll : horizontalScroll;
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
    const primaryAxis =
      Math.abs(initial.vertical.scrollDelta) >=
      Math.abs(initial.horizontal.scrollDelta)
        ? 'vertical'
        : 'horizontal';
    const secondaryAxis =
      primaryAxis === 'vertical' ? 'horizontal' : 'vertical';

    const primaryInfo =
      primaryAxis === 'vertical' ? initial.vertical : initial.horizontal;

    return runAxis(primaryAxis, primaryInfo).then(() => {
      const after = computeDeltas();
      const secondaryInfo =
        secondaryAxis === 'vertical' ? after.vertical : after.horizontal;
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

export type { SpatialScrollConfig, ReAcquireFocusOptions };
export { DEFAULT_SPATIAL_SCROLL_CONFIG };
