/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow strict
 * @format
 */

type SpatialScrollConfigType = {
  edgeThresholdPx?: number,
  scrollThrottleMs?: number, // not used for now
  smoothScrollEnabled?: boolean,
  scrollAnimationDurationMsVertical?: number,
  scrollAnimationDurationMsHorizontal?: number
};

type ScrollStateType = {
  lastScrollAt: number,
  scrollAnimationFrame: number | null
};

type getCurrentFocusType = () => {
  elem: HTMLElement | null,
  parentHasAutofocus: boolean
};

type onScrollRefocusType = (params: {
  currentFocus: { elem: HTMLElement | null, parentHasAutofocus: boolean },
  scrollContainer: HTMLElement | null
}) => void;

// API capability detection (one-time check at module load).
// TV platforms may lack modern APIs, so we detect and fall back gracefully.
// This avoids repeated try-catch blocks on every scroll operation.
const _hasPerformance =
  typeof performance !== 'undefined' && typeof performance.now === 'function';
const _hasRequestAnimationFrame = typeof requestAnimationFrame === 'function';
const _hasGetComputedStyle =
  typeof window !== 'undefined' &&
  typeof window.getComputedStyle === 'function';
const _hasGetBoundingClientRect =
  typeof Element !== 'undefined' &&
  Element.prototype.getBoundingClientRect !== undefined;
const _hasScrollEndEvent = false;
//   typeof window !== 'undefined' &&
//   'onscrollend' in window;

const DEBUG_SCROLL = () =>
  typeof window !== 'undefined' && window.__RNW_TV_SCROLL_DEBUG === true;

const DEFAULT_SPATIAL_SCROLL_CONFIG: SpatialScrollConfigType = {
  edgeThresholdPx: 0, // only used on the left edge and in horizontal scrolling
  scrollThrottleMs: 80, // not used for now
  smoothScrollEnabled: true,
  scrollAnimationDurationMs: 0,
  scrollAnimationDurationMsVertical: 0,
  scrollAnimationDurationMsHorizontal: 0
};

let _isConfigured = false;
let _scrollConfig: SpatialScrollConfigType = DEFAULT_SPATIAL_SCROLL_CONFIG;
let _focusMode: 'AlignLeft' | 'default' = 'default';
const _scrollState: ScrollStateType = {
  lastScrollAt: 0, // Timestamp of last scroll initiation (for throttling, if enabled)
  scrollAnimationFrame: null
};

function getCurrentTime(): number {
  return _hasPerformance ? performance.now() : Date.now();
}

function scheduleAnimationFrame(callback: () => void): number {
  if (_hasRequestAnimationFrame) {
    return requestAnimationFrame(callback);
  }
  // Fallback: simulate 30fps with setTimeout (33ms per frame)
  // TODO: Consider making this adaptive based on actual frame rate or using a more sophisticated polyfill if needed
  return (setTimeout(callback, 33): any);
}

const cancelScheduledFrame = _hasRequestAnimationFrame
  ? cancelAnimationFrame
  : clearTimeout;

function animateScrollTo(
  scrollable: any,
  isVertical: boolean,
  nextOffset: number,
  durationMs: number
) {
  const startOffset = isVertical ? scrollable.scrollTop : scrollable.scrollLeft;
  const delta = nextOffset - startOffset;

  if (delta === 0 || durationMs <= 0) return;

  if (_scrollState.scrollAnimationFrame != null) {
    cancelScheduledFrame(_scrollState.scrollAnimationFrame);
    _scrollState.scrollAnimationFrame = null;
  }

  const startTime = getCurrentTime();
  const step = (now: number) => {
    const elapsed = _hasPerformance ? now - startTime : Date.now() - startTime;
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
      _scrollState.scrollAnimationFrame = scheduleAnimationFrame(() =>
        step(_hasPerformance ? performance.now() : Date.now())
      );
    } else {
      _scrollState.scrollAnimationFrame = null;
    }
  };

  _scrollState.scrollAnimationFrame = scheduleAnimationFrame(() =>
    step(_hasPerformance ? performance.now() : Date.now())
  );
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
    const delta =
      targetRect.left -
      visibleContainerRect.left -
      _scrollConfig.edgeThresholdPx;
    return { needsScroll: delta !== 0, scrollDelta: delta };
  }

  if (targetRect.left < visibleContainerRect.left) {
    const delta =
      targetRect.left -
      visibleContainerRect.left -
      _scrollConfig.edgeThresholdPx;
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

  const style = _hasGetComputedStyle
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
  scrollDelta: number
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

  performScroll(scrollable, isVertical, nextOffset, liveNextOffset);

  const durationMs = isVertical
    ? _scrollConfig.scrollAnimationDurationMsVertical
    : _scrollConfig.scrollAnimationDurationMsHorizontal;

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

    if (_hasGetComputedStyle) {
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

  if (_hasGetBoundingClientRect) {
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
  nextOffset: number,
  liveNextOffset: number
) {
  const durationMs = isVertical
    ? _scrollConfig.scrollAnimationDurationMsVertical
    : _scrollConfig.scrollAnimationDurationMsHorizontal;

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

function setupScrollHandler(config?: {
  scrollConfig?: SpatialScrollConfigType,
  focusMode?: 'AlignLeft' | 'default',
  scrollState?: ScrollState
}): void {
  if (_isConfigured) {
    return;
  }

  if (config?.scrollConfig) {
    _scrollConfig = {
      ..._scrollConfig,
      ...config.scrollConfig
    };
  }

  _focusMode = config?.focusMode || _focusMode;

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
function isElementInWindowViewport(elem: HTMLElement): boolean {
  if (!elem || !_hasGetBoundingClientRect) {
    return true; // Assume visible if we can't measure
  }

  try {
    const elemRect = elem.getBoundingClientRect();
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
 * Check if an element is fully visible in the window viewport.
 * Returns visibility percentage (0-1).
 *
 * @param {HTMLElement} elem The element to check
 * @return {number} Visibility ratio: 0 = not visible, 1 = fully visible
 */
function getElementVisibilityRatio(elem: HTMLElement): number {
  if (!elem || !_hasGetBoundingClientRect) {
    return 1; // Assume fully visible if we can't measure
  }

  try {
    const elemRect = elem.getBoundingClientRect();
    const viewportHeight =
      window.innerHeight || document.documentElement.clientHeight;
    const viewportWidth =
      window.innerWidth || document.documentElement.clientWidth;

    // Calculate clipped rectangle intersecting with viewport
    const clippedTop = Math.max(0, elemRect.top);
    const clippedBottom = Math.min(viewportHeight, elemRect.bottom);
    const clippedLeft = Math.max(0, elemRect.left);
    const clippedRight = Math.min(viewportWidth, elemRect.right);

    // Calculate visible area
    const visibleHeight = Math.max(0, clippedBottom - clippedTop);
    const visibleWidth = Math.max(0, clippedRight - clippedLeft);
    const visibleArea = visibleHeight * visibleWidth;

    // Calculate total element area
    const totalHeight = elemRect.height;
    const totalWidth = elemRect.width;
    const totalArea = totalHeight * totalWidth;

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
function inferScrollDirection(
  scrollContainer: HTMLElement | null
): 'ArrowDown' | 'ArrowRight' {
  if (!scrollContainer) {
    return 'ArrowDown';
  }

  const isWindowScroll =
    scrollContainer === window ||
    scrollContainer === document ||
    scrollContainer === document.documentElement;

  if (isWindowScroll) {
    return 'ArrowDown';
  }

  // Check if container can scroll vertically
  const canScrollVertical = (() => {
    if (_hasGetComputedStyle) {
      const style = window.getComputedStyle(scrollContainer);
      return (
        (style.overflowY === 'auto' ||
          style.overflowY === 'scroll' ||
          style.overflowY === 'overlay') &&
        scrollContainer.scrollHeight > scrollContainer.clientHeight
      );
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
function setupAppInitiatedScrollHandler(
  container: HTMLElement | Document,
  getCurrentFocus: getCurrentFocusType,
  onScrollRefocus: onScrollRefocusType
): () => void {
  const handleScrollEnd = (e: any) => {
    // If SpatialManager initiated this scroll, it already handled focus
    if (isSpatialManagerInitiatedScroll) {
      unmarkSpatialManagerScroll();
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
      if (DEBUG_SCROLL) {
        console.log(
          '[SpatialManager][scroll] currentFocus partially visible, scrolling back into view',
          {
            elementId: currentFocus.elem.id,
            visibilityRatio: Math.round(visibilityRatio * 100) + '%'
          }
        );
      }

      // Infer scroll direction from scrollContainer
      const scrollDirection = inferScrollDirection(scrollContainer);

      // Call maybeScrollOnFocus to bring currentFocus fully into view
      // This maintains focus continuity while respecting app-initiated scroll
      maybeScrollOnFocus(
        currentFocus.elem,
        currentFocus.elem, // TODO: Handle this better: navigationFrom is currentFocus itself
        scrollDirection
      );
      return;
    }

    // Case 3: currentFocus is completely out of viewport (0% visible)
    // REACQUIRE focus by finding first focusable in scrollContainer
    if (DEBUG_SCROLL) {
      console.log(
        '[SpatialManager][scroll] currentFocus out of viewport, reacquiring focus',
        {
          elementId: currentFocus.elem.id,
          scrollContainerId: scrollContainer?.id
        }
      );
    }

    // App-initiated scroll - focused element is completely out of view
    // Need to find a new focus in the scrolled container
    onScrollRefocus({ currentFocus, scrollContainer });
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
    if (_hasScrollEndEvent) {
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
function scrollToAlignLeft(
  elem: HTMLElement | null,
  keyCode: string,
  currentElem: HTMLElement | null
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
    // TODO: We loose the reference point for Align left as soon as the scrolling moves into the end part on the right.
    if (keyCode === 'ArrowRight' && currentRect) {
      // On right navigation: align target's left edge to current focus X position.
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

      // Critical boundary check: can we achieve alignment without exceeding scroll bounds?
      // This prevents breaking alignment at content boundaries (e.g., last item).
      const nextScroll = currentScroll + desiredDelta;
      const canAchieveAlignment = nextScroll >= 0 && nextScroll <= maxScroll;

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
      // On left navigation (or otherwise): use default behavior (keep visible with edge threshold).
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

  // _scrollState.lastScrollAt = now;

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
      scrollDelta: delta
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
function maybeScrollOnFocus(
  nextElem: HTMLElement | null,
  currentElem: HTMLElement | null,
  keyCode: string
) {
  if (!nextElem || typeof window === 'undefined') return null;

  if (_focusMode === 'AlignLeft') {
    return scrollToAlignLeft(nextElem, keyCode, currentElem);
  }

  if (DEBUG_SCROLL()) {
    try {
      const curRect = currentElem?.getBoundingClientRect?.();
      const nextRect = nextElem.getBoundingClientRect();
      console.log('[SpatialManager][scroll] input', {
        keyCode,
        currentId: currentElem?.id,
        nextId: nextElem.id,
        curRect,
        nextRect
      });
    } catch (e) {
      console.log('[SpatialManager][scroll] input', {
        keyCode,
        currentId: currentElem?.id,
        nextId: nextElem.id,
        error: String(e)
      });
    }
  }

  const verticalScroll = resolveScrollable(nextElem, 'vertical');
  const horizontalScroll = resolveScrollable(nextElem, 'horizontal');

  const computeDeltas = () => {
    const verticalRects = resolveRects(
      verticalScroll.scrollable,
      verticalScroll.isWindowScroll,
      nextElem
    );
    const horizontalRects = resolveRects(
      horizontalScroll.scrollable,
      horizontalScroll.isWindowScroll,
      nextElem
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
    logScrollContainer('vertical', verticalScroll, nextElem);
    logScrollContainer('horizontal', horizontalScroll, nextElem);
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

  // _scrollState.lastScrollAt = now;

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
      scrollDelta: deltaInfo.scrollDelta
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

export type {
  SpatialScrollConfigType,
  getCurrentFocusType,
  onScrollRefocusType
};
export {
  setupScrollHandler,
  setupAppInitiatedScrollHandler,
  isElementInWindowViewport,
  maybeScrollOnFocus
};
