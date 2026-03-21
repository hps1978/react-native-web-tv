/**
 * Copyright (c) 2026 Harpreet Singh.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow strict
 * @format
 */

// API capability detection (one-time check at module load).
// TV platforms may lack modern APIs, so we detect and fall back gracefully.
// This avoids repeated try-catch blocks on every scroll operation.
export type ElemData = {
  elem: HTMLElement | null,
  parentContainer: HTMLElement | null
};

export type ScrollableAncestorInfo = {
  scrollable: any,
  isWindowScroll: boolean
};

const _hasPerformance =
  typeof performance !== 'undefined' && typeof performance.now === 'function';
const _hasRequestAnimationFrame = typeof requestAnimationFrame === 'function';
const _hasGetComputedStyle =
  typeof window !== 'undefined' &&
  typeof window.getComputedStyle === 'function';
const _hasGetBoundingClientRect =
  typeof Element !== 'undefined' &&
  Element.prototype.getBoundingClientRect !== undefined;

const _windowScrollable =
  typeof window !== 'undefined'
    ? {
        get scrollTop() {
          return window.scrollY;
        },
        get scrollLeft() {
          return window.scrollX;
        },
        clientHeight: window.innerHeight,
        clientWidth: window.innerWidth,
        scrollHeight:
          (document.documentElement && document.documentElement.scrollHeight) ||
          (document.body && document.body.scrollHeight) ||
          0,
        scrollWidth:
          (document.documentElement && document.documentElement.scrollWidth) ||
          (document.body && document.body.scrollWidth) ||
          0,
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
      }
    : null;

/**
 * getCurrentTime
 * Returns current timestamp using high-resolution performance API if available.
 * Falls back to Date.now() for environments lacking performance.now().
 * @returns {number} Current time in milliseconds
 */
export function getCurrentTime(): number {
  return _hasPerformance ? performance.now() : Date.now();
}

/**
 * scheduleAnimationFrame
 * Schedules a callback for the next animation frame.
 * Uses requestAnimationFrame if available, falls back to 30fps setTimeout simulation.
 * @param {() => void} callback - Function to execute on next animation frame
 * @returns {any} Animation frame ID for cancellation with cancelScheduledFrame()
 */
export function scheduleAnimationFrame(callback: () => void): any {
  if (_hasRequestAnimationFrame) {
    return (requestAnimationFrame(callback): any);
  }
  // Fallback: simulate 30fps with setTimeout (33ms per frame)
  // TODO: Consider making this adaptive based on actual frame rate or using a more sophisticated polyfill if needed
  return (setTimeout(callback, 33): any);
}

export function cancelScheduledFrame(frameId: any): void {
  if (_hasRequestAnimationFrame) {
    cancelAnimationFrame((frameId: any));
    return;
  }
  clearTimeout((frameId: any));
}

/**
 * findScrollableAncestor
 * Traverses DOM ancestors to find a scrollable parent element in specified direction.
 * Checks computed overflow styles and scroll capacity before returning.
 * Falls back to window scrollable if no ancestor can scroll in the direction.
 * @param {HTMLElement | null} elem - Starting element for ancestor traversal
 * @param {'vertical' | 'horizontal'} direction - Direction to check scrollability
 * @returns {ScrollableAncestorInfo} Scrollable ancestor info (falls back to window scrollable)
 */
export function findScrollableAncestor(
  elem: HTMLElement | null,
  direction: 'vertical' | 'horizontal'
): ScrollableAncestorInfo {
  let current: HTMLElement | null = elem
    ? ((elem.parentElement: any): HTMLElement | null)
    : null;
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
      return { scrollable: current, isWindowScroll: false };
    }

    if (current === document.body || current === document.documentElement) {
      break;
    }

    current = ((current.parentElement: any): HTMLElement | null);
  }
  // Return window scrollable as fallback if no scrollable ancestor found
  return { scrollable: _windowScrollable, isWindowScroll: true };
}

/**
 * isElementInWindowViewport
 * Checks if an element intersects with the window viewport.
 * Only verifies window viewport visibility, not parent container visibility.
 * Assumes element CSS is already visible (display, visibility, opacity handled elsewhere).
 * @param {HTMLElement} elem - The element to check
 * @returns {boolean} True if element intersects window viewport, false otherwise
 */
export function isElementInWindowViewport(elem: HTMLElement): boolean {
  if (!elem || !_hasGetBoundingClientRect) {
    return true; // Assume visible if we can't measure
  }

  try {
    const elemRect = elem.getBoundingClientRect();
    const docEl = document.documentElement;
    const viewportHeight =
      window.innerHeight || (docEl ? docEl.clientHeight : 0);
    const viewportWidth = window.innerWidth || (docEl ? docEl.clientWidth : 0);

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
/**
 * getElementVisibilityRatio
 * Calculates the percentage of an element visible within the window viewport.
 * Returns a ratio from 0 (not visible) to 1 (fully visible).
 * @param {HTMLElement} elem - The element to measure
 * @returns {number} Visibility ratio: 0 = completely out of view, 1 = fully in view
 */
export function getElementVisibilityRatio(elem: HTMLElement): number {
  if (!elem || !_hasGetBoundingClientRect) {
    return 1; // Assume fully visible if we can't measure
  }

  try {
    const elemRect = elem.getBoundingClientRect();
    const docEl = document.documentElement;
    const viewportHeight =
      window.innerHeight || (docEl ? docEl.clientHeight : 0);
    const viewportWidth = window.innerWidth || (docEl ? docEl.clientWidth : 0);

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
 * Used to provide directional hint to scrollToElement.
 *
 * @param {HTMLElement} scrollContainer The container that scrolled
 * @return {'ArrowDown' | 'ArrowRight'} Direction hint
 */
/**
 * inferScrollDirection
 * Determines primary scroll axis capability of a container.
 * Used to provide directional hints to scrollToElement for optimal behavior.
 * @param {HTMLElement | null} scrollContainer - The container being evaluated
 * @returns {'ArrowDown' | 'ArrowRight'} Direction hint based on scroll capability
 */
export function inferScrollDirection(
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
 * getBoundingRectangles
 * Resolves element and container viewport-relative bounding rectangles.
 * Sets up target as parent container if it's within a scrollable to allow scrolling
 * to bring a parent container into visibilty instead of the element itself.
 * Falls back to offset dimensions if getBoundingClientRect unavailable.
 * @param {any} scrollableH - Horizontal scrollable container
 * @param {boolean} isWindowScrollH - If true, scrollableH is the window
 * @param {any} scrollableV - Vertical scrollable container
 * @param {boolean} isWindowScrollV - If true, scrollableV is the window
 * @param {HTMLElement} elem - The target element to measure
 * @returns {Object} Object with horizontalRects, verticalRects, targetHRect, targetVRect
 */
export function getBoundingRectangles(
  scrollableH: any,
  isWindowScrollH: boolean,
  scrollableV: any,
  isWindowScrollV: boolean,
  elemData: ElemData
): any {
  const { elem, parentContainer } = elemData;
  let containerRectH, containerRectV;
  let targetHRect, targetVRect;

  if (!elem) {
    const emptyRect = { top: 0, left: 0, bottom: 0, right: 0 };
    return {
      horizontalRects: {
        containerRect: emptyRect,
        visibleContainerRect: emptyRect
      },
      verticalRects: {
        containerRect: emptyRect,
        visibleContainerRect: emptyRect
      },
      targetHRect: emptyRect,
      targetVRect: emptyRect
    };
  }

  // Check if parent container of the next element is within the scrollable area of either axis.
  const isParentInVScroll =
    !!parentContainer &&
    (isWindowScrollV || scrollableV.contains(parentContainer));
  const isParentInHScroll =
    !!parentContainer &&
    (isWindowScrollH || scrollableH.contains(parentContainer));

  const canUseParentRectForAxis = (
    parentRect: any,
    containerRect: any,
    axis: 'vertical' | 'horizontal'
  ): boolean => {
    if (!parentRect || !containerRect) {
      return false;
    }

    const parentSize =
      axis === 'vertical'
        ? parentRect.bottom - parentRect.top
        : parentRect.right - parentRect.left;
    const containerSize =
      axis === 'vertical'
        ? containerRect.bottom - containerRect.top
        : containerRect.right - containerRect.left;

    return parentSize <= containerSize;
  };

  if (_hasGetBoundingClientRect) {
    const targetElemRect = elem.getBoundingClientRect();
    const parentContainerRect = parentContainer
      ? parentContainer.getBoundingClientRect()
      : null;

    containerRectH = scrollableH.getBoundingClientRect();
    containerRectV = scrollableV.getBoundingClientRect();
    targetHRect =
      isParentInHScroll &&
      canUseParentRectForAxis(parentContainerRect, containerRectH, 'horizontal')
        ? parentContainerRect
        : targetElemRect;
    targetVRect =
      isParentInVScroll &&
      canUseParentRectForAxis(parentContainerRect, containerRectV, 'vertical')
        ? parentContainerRect
        : targetElemRect;
  } else {
    // Fallback: use offset dimensions
    containerRectH = {
      top: (scrollableH: any).offsetTop || 0,
      left: (scrollableH: any).offsetLeft || 0,
      bottom:
        ((scrollableH: any).offsetTop || 0) +
        ((scrollableH: any).offsetHeight || 0),
      right:
        ((scrollableH: any).offsetLeft || 0) +
        ((scrollableH: any).offsetWidth || 0)
    };
    containerRectV = {
      top: (scrollableV: any).offsetTop || 0,
      left: (scrollableV: any).offsetLeft || 0,
      bottom:
        ((scrollableV: any).offsetTop || 0) +
        ((scrollableV: any).offsetHeight || 0),
      right:
        ((scrollableV: any).offsetLeft || 0) +
        ((scrollableV: any).offsetWidth || 0)
    };
    const targetElemRect = {
      top: elem.offsetTop || 0,
      left: elem.offsetLeft || 0,
      bottom: (elem.offsetTop || 0) + (elem.offsetHeight || 0),
      right: (elem.offsetLeft || 0) + (elem.offsetWidth || 0)
    };
    let parentContainerRect = null;
    if ((isParentInVScroll || isParentInHScroll) && parentContainer) {
      parentContainerRect = {
        top: parentContainer.offsetTop || 0,
        left: parentContainer.offsetLeft || 0,
        bottom:
          (parentContainer.offsetTop || 0) +
          (parentContainer.offsetHeight || 0),
        right:
          (parentContainer.offsetLeft || 0) + (parentContainer.offsetWidth || 0)
      };
    }
    targetHRect =
      isParentInHScroll &&
      canUseParentRectForAxis(parentContainerRect, containerRectH, 'horizontal')
        ? parentContainerRect
        : targetElemRect;
    targetVRect =
      isParentInVScroll &&
      canUseParentRectForAxis(parentContainerRect, containerRectV, 'vertical')
        ? parentContainerRect
        : targetElemRect;
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
    targetHRect,
    targetVRect
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
export function getAxisScrollDelta(
  targetRect: any,
  visibleContainerRect: any,
  axis: 'vertical' | 'horizontal',
  topEdgePaddingPx: number,
  leftEdgePaddingPx: number
): { needsScroll: boolean, scrollDelta: number } {
  const isVertical = axis === 'vertical';
  let targetSize, visibleSize;

  if (isVertical) {
    targetSize = targetRect.bottom - targetRect.top;
    visibleSize = visibleContainerRect.bottom - visibleContainerRect.top;
  } else {
    targetSize = targetRect.right - targetRect.left;
    visibleSize = visibleContainerRect.right - visibleContainerRect.left;
  }

  if (targetSize > visibleSize) {
    const delta = isVertical
      ? targetRect.top - visibleContainerRect.top - topEdgePaddingPx
      : targetRect.left - visibleContainerRect.left - leftEdgePaddingPx;
    return { needsScroll: delta !== 0, scrollDelta: delta };
  }

  if (isVertical) {
    if (targetRect.top < visibleContainerRect.top) {
      return {
        needsScroll: true,
        scrollDelta:
          targetRect.top - visibleContainerRect.top - topEdgePaddingPx
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
        scrollDelta:
          targetRect.left - visibleContainerRect.left - leftEdgePaddingPx
      };
    }
    if (targetRect.right > visibleContainerRect.right) {
      return {
        needsScroll: true,
        scrollDelta:
          targetRect.right - visibleContainerRect.right + leftEdgePaddingPx
      };
    }
  }

  return { needsScroll: false, scrollDelta: 0 };
}
