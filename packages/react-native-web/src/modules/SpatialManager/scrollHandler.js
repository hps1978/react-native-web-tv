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

// API capability detection (one-time check at module load)
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

function calculateScrollDirection(
  currentElem: HTMLElement,
  nextElem: HTMLElement
): { isVertical: boolean, direction: string, dominance: number } | null {
  if (!currentElem || !nextElem || !hasGetBoundingClientRect) {
    return null;
  }

  try {
    const currentRect = currentElem.getBoundingClientRect();
    const nextRect = nextElem.getBoundingClientRect();

    const currentCenterY = currentRect.top + currentRect.height / 2;
    const nextCenterY = nextRect.top + nextRect.height / 2;
    const currentCenterX = currentRect.left + currentRect.width / 2;
    const nextCenterX = nextRect.left + nextRect.width / 2;

    const deltaY = nextCenterY - currentCenterY;
    const deltaX = nextCenterX - currentCenterX;

    const absDeltaY = Math.abs(deltaY);
    const absDeltaX = Math.abs(deltaX);

    // Determine primary direction based on larger delta
    if (absDeltaY > absDeltaX) {
      return {
        isVertical: true,
        direction: deltaY > 0 ? 'down' : 'up',
        dominance: absDeltaX > 0 ? absDeltaY / absDeltaX : Infinity
      };
    } else if (absDeltaX > 0) {
      return {
        isVertical: false,
        direction: deltaX > 0 ? 'right' : 'left',
        dominance: absDeltaY > 0 ? absDeltaX / absDeltaY : Infinity
      };
    }
  } catch (e) {
    // Fallback if getBoundingClientRect fails
  }

  return null;
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

function resolveScrollOffsets(
  scrollable: any,
  isVertical: boolean
): { currentOffset: number, maxOffset: number } {
  const currentOffset = isVertical
    ? scrollable.scrollTop
    : scrollable.scrollLeft;
  const maxOffset = isVertical
    ? Math.max(0, scrollable.scrollHeight - scrollable.clientHeight)
    : Math.max(0, scrollable.scrollWidth - scrollable.clientWidth);

  return { currentOffset, maxOffset };
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

function shouldScrollIntoView(
  isVertical: boolean,
  edgeThreshold: number,
  targetRect: any,
  visibleContainerRect: any
): { needsScroll: boolean, scrollDelta: number } {
  if (isVertical) {
    const padding = edgeThreshold;

    if (targetRect.bottom > visibleContainerRect.bottom - padding) {
      const delta = targetRect.bottom - (visibleContainerRect.bottom - padding);
      return { needsScroll: true, scrollDelta: delta };
    }

    if (targetRect.top < visibleContainerRect.top + padding) {
      const delta = visibleContainerRect.top + padding - targetRect.top;
      return { needsScroll: true, scrollDelta: -delta };
    }
  } else {
    const padding = edgeThreshold;

    if (targetRect.right > visibleContainerRect.right - padding) {
      const delta = targetRect.right - (visibleContainerRect.right - padding);
      return { needsScroll: true, scrollDelta: delta };
    }

    if (targetRect.left < visibleContainerRect.left + padding) {
      const delta = visibleContainerRect.left + padding - targetRect.left;
      return { needsScroll: true, scrollDelta: -delta };
    }
  }

  return { needsScroll: false, scrollDelta: 0 };
}

function resolveDirection(
  currentElem: HTMLElement | null,
  nextElem: HTMLElement,
  keyCode: string
): { isVertical: boolean, isHorizontal: boolean } {
  let isVertical = false;
  let isHorizontal = false;

  if (currentElem) {
    const directionInfo = calculateScrollDirection(currentElem, nextElem);
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

  return { isVertical, isHorizontal };
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
 * If SpatialManager initiated the scroll, skips focus reacquisition.
 * If app initiated the scroll, reacquires focus if needed.
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

export function maybeScrollOnFocus(
  elem: HTMLElement | null,
  keyCode: string,
  currentElem: HTMLElement | null,
  scrollConfig: SpatialScrollConfig,
  scrollState: ScrollState
) {
  if (!elem || typeof window === 'undefined') return;

  const now = Date.now();
  if (scrollConfig.scrollThrottleMs != null) {
    if (now - scrollState.lastScrollAt < scrollConfig.scrollThrottleMs) {
      return;
    }
  }

  const { isVertical, isHorizontal } = resolveDirection(
    currentElem,
    elem,
    keyCode
  );

  if (!isVertical && !isHorizontal) return;

  const direction = isVertical ? 'vertical' : 'horizontal';
  const { scrollable, isWindowScroll } = resolveScrollable(elem, direction);

  if (!scrollable) return;

  const { targetRect, visibleContainerRect } = resolveRects(
    scrollable,
    isWindowScroll,
    elem
  );

  const { currentOffset, maxOffset } = resolveScrollOffsets(
    scrollable,
    isVertical
  );

  const edgeThreshold = scrollConfig.edgeThresholdPx || 0;
  const { needsScroll, scrollDelta } = shouldScrollIntoView(
    isVertical,
    edgeThreshold,
    targetRect,
    visibleContainerRect
  );

  if (!needsScroll) {
    return;
  }

  scrollState.lastScrollAt = now;

  // Mark that we're about to initiate a scroll (so the listener knows to skip reacquisition)
  markSpatialManagerScroll();
  // Defer scroll to next event loop to avoid blocking the keydown handler
  Promise.resolve().then(() => {
    const liveOffset = isVertical
      ? scrollable.scrollTop
      : scrollable.scrollLeft;
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
      scrollConfig,
      scrollState,
      nextOffset,
      liveNextOffset
    );
  });
}

export type { SpatialScrollConfig, ReAcquireFocusOptions };
export { DEFAULT_SPATIAL_SCROLL_CONFIG };
