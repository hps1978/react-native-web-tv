/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow strict
 * @format
 */

// This module supports SpatialNavigation for TV platforms on web using
// the @bbc/tv-lrud-spatial library. Currently, SpatialNavigation working
// completely outside the React tree, i.e, it uses DOM APIs to manage
// focus and navigation.

// Currently, it only supports arrow ISO keyboard navigation.
import {
  setConfig,
  getNextFocus,
  getFocusableParentContainer,
  getParentContainer,
  updateAncestorsAutoFocus,
  findDestinationOrAutofocus
} from '@bbc/tv-lrud-spatial';
import {
  startObserving,
  stopObserving,
  type MutationDetails
} from './mutationObserver';
import { addEventListener } from '../addEventListener';
import { setupNodeId } from '../../exports/TV/utils';

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

type SpatialScrollConfig = {
  edgeThresholdPx?: number,
  scrollThrottleMs?: number,
  smoothScrollEnabled?: boolean,
  scrollAnimationDurationMs?: number,
  scrollAnimationDurationMsVertical?: number,
  scrollAnimationDurationMsHorizontal?: number
};

type SpatialNavigationConfig = {
  keyMap?: { [key: string]: string },
  scrollConfig?: SpatialScrollConfig
};

const DEFAULT_SPATIAL_SCROLL_CONFIG: SpatialScrollConfig = {
  edgeThresholdPx: 128,
  scrollThrottleMs: 80,
  smoothScrollEnabled: true,
  scrollAnimationDurationMs: 0,
  scrollAnimationDurationMsVertical: 0,
  scrollAnimationDurationMsHorizontal: 0
};

let isSpatialManagerReady = false;
let spatialNavigationContainer: HTMLElement | null = null;
let currentFocus: { elem: HTMLElement | null, parentHasAutofocus: boolean } = {
  elem: null,
  parentHasAutofocus: false
};
let keyDownListener: ((event: any) => void) | null = null;
let spatialScrollConfig: SpatialScrollConfig = {
  ...DEFAULT_SPATIAL_SCROLL_CONFIG
};
let lastScrollAt: number = 0;
let scrollAnimationFrame: number | null = null;

function loadGlobalConfig(): SpatialNavigationConfig | null {
  // Check for window.appConfig.spatialNav (cross-platform pattern)
  if (typeof window !== 'undefined' && window.appConfig && window.appConfig) {
    return (window.appConfig: any);
  }
  return null;
}

// This callback wil get triggered when LRUD fails to find a valid destination from the provided data-destinations
// atrtribute. LRUD will use it's fallback. autofocus or default focus logic. This contianer will no longer be
// focusable if there is no autofocus either.
function noValidDestinationCallback(candidateContainer, hasAutoFocus) {
  if (candidateContainer && !hasAutoFocus) {
    candidateContainer.tabIndex = -1;
  }
}

// Setup configuration for Spatial Navigation
// User provided through global configs or defaults
function setSpatialNavigationConfig() {
  // Auto-initialize from global config on first arrow key press if not already initialized
  if (!isSpatialManagerReady) {
    let keyMap = null;
    const globalConfig: SpatialNavigationConfig | null = loadGlobalConfig();
    if (globalConfig) {
      // Setup LRUD Keys if provided
      keyMap = globalConfig?.keyMap;

      spatialScrollConfig = {
        ...DEFAULT_SPATIAL_SCROLL_CONFIG,
        ...(globalConfig?.scrollConfig || {})
      };
    }
    setConfig({
      keyMap: keyMap,
      noValidDestinationCallback
    });
  }
}

function animateScrollTo(
  scrollable: any,
  isVertical: boolean,
  nextOffset: number,
  durationMs: number
) {
  const startOffset = isVertical ? scrollable.scrollTop : scrollable.scrollLeft;
  const delta = nextOffset - startOffset;

  if (delta === 0 || durationMs <= 0) return;

  if (scrollAnimationFrame != null) {
    cancelScheduledFrame(scrollAnimationFrame);
    scrollAnimationFrame = null;
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
      scrollAnimationFrame = scheduleAnimationFrame(() =>
        step(hasPerformance ? performance.now() : Date.now())
      );
    } else {
      scrollAnimationFrame = null;
    }
  };

  scrollAnimationFrame = scheduleAnimationFrame(() =>
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

function maybeScrollOnFocus(
  elem: HTMLElement | null,
  keyCode: string,
  currentElem: HTMLElement | null
) {
  if (!elem || typeof window === 'undefined') return;

  const now = Date.now();
  if (spatialScrollConfig.scrollThrottleMs != null) {
    if (now - lastScrollAt < spatialScrollConfig.scrollThrottleMs) {
      return;
    }
  }

  // Calculate actual direction from element positions if we have a current focus
  // Otherwise fall back to keyCode direction
  let isVertical = false;
  let isHorizontal = false;

  if (currentElem) {
    const directionInfo = calculateScrollDirection(currentElem, elem);
    if (directionInfo) {
      isVertical = directionInfo.isVertical;
      isHorizontal = !directionInfo.isVertical;
    } else {
      // Fallback to keyCode if geometry calculation fails
      isVertical = keyCode === 'ArrowUp' || keyCode === 'ArrowDown';
      isHorizontal = keyCode === 'ArrowLeft' || keyCode === 'ArrowRight';
    }
  } else {
    // For first focus, determine direction from keyCode
    isVertical = keyCode === 'ArrowUp' || keyCode === 'ArrowDown';
    isHorizontal = keyCode === 'ArrowLeft' || keyCode === 'ArrowRight';
  }

  if (!isVertical && !isHorizontal) return;

  const direction = isVertical ? 'vertical' : 'horizontal';
  let scrollable = findScrollableAncestor(elem, direction);

  // If no scrollable ancestor found, use window for scrolling
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

  if (!scrollable) return;

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

  const edgeThreshold = spatialScrollConfig.edgeThresholdPx || 0;

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

  const currentOffset = isVertical
    ? scrollable.scrollTop
    : scrollable.scrollLeft;
  const maxOffset = isVertical
    ? Math.max(0, scrollable.scrollHeight - scrollable.clientHeight)
    : Math.max(0, scrollable.scrollWidth - scrollable.clientWidth);

  // Calculate the exact scroll offset needed to bring the focused element fully into view
  let nextOffset = currentOffset;
  let scrollDelta = 0;
  let needsScroll = false;

  if (isVertical) {
    const padding = edgeThreshold; // Use edge threshold as padding

    // Element is below viewport - scroll down to show it
    if (targetRect.bottom > visibleContainerRect.bottom - padding) {
      const delta = targetRect.bottom - (visibleContainerRect.bottom - padding);
      // KEY FIX: For virtualized containers (maxOffset === 0), allow the offset to be calculated
      // The virtualization will load more content as we scroll
      scrollDelta = delta;
      nextOffset = isWindowScroll
        ? Math.min(currentOffset + delta, maxOffset)
        : currentOffset + delta;
      needsScroll = true;
    }
    // Element is above viewport - scroll up to show it
    else if (targetRect.top < visibleContainerRect.top + padding) {
      const delta = visibleContainerRect.top + padding - targetRect.top;
      scrollDelta = -delta;
      nextOffset = Math.max(currentOffset - delta, 0);
      needsScroll = true;
    }
  } else {
    const padding = edgeThreshold;

    // Element is to the right of viewport
    if (targetRect.right > visibleContainerRect.right - padding) {
      const delta = targetRect.right - (visibleContainerRect.right - padding);
      scrollDelta = delta;
      nextOffset = isWindowScroll
        ? Math.min(currentOffset + delta, maxOffset)
        : currentOffset + delta;
      needsScroll = true;
    }
    // Element is to the left of viewport
    else if (targetRect.left < visibleContainerRect.left + padding) {
      const delta = visibleContainerRect.left + padding - targetRect.left;
      scrollDelta = -delta;
      nextOffset = Math.max(currentOffset - delta, 0);
      needsScroll = true;
    }
  }

  if (!needsScroll) {
    return;
  }

  lastScrollAt = now;

  // Defer scroll to next event loop to avoid blocking the keydown handler
  Promise.resolve().then(() => {
    const liveOffset = isVertical
      ? scrollable.scrollTop
      : scrollable.scrollLeft;
    const liveNextOffset = isWindowScroll
      ? Math.min(Math.max(liveOffset + scrollDelta, 0), maxOffset)
      : Math.max(liveOffset + scrollDelta, 0);
    const directionDurationMs = isVertical
      ? spatialScrollConfig.scrollAnimationDurationMsVertical
      : spatialScrollConfig.scrollAnimationDurationMsHorizontal;
    const durationMs =
      directionDurationMs != null
        ? directionDurationMs
        : spatialScrollConfig.scrollAnimationDurationMs || 0;
    if (durationMs > 0) {
      animateScrollTo(scrollable, isVertical, liveNextOffset, durationMs);
      return;
    }

    const finalOffset = nextOffset;

    if (typeof scrollable.scrollTo === 'function') {
      if (isVertical) {
        scrollable.scrollTo({
          y: finalOffset,
          animated: spatialScrollConfig.smoothScrollEnabled !== false
        });
      } else {
        scrollable.scrollTo({
          x: finalOffset,
          animated: spatialScrollConfig.smoothScrollEnabled !== false
        });
      }
    } else if (isVertical) {
      scrollable.scrollTop = finalOffset;
    } else {
      scrollable.scrollLeft = finalOffset;
    }
  });
}

function handleCurrentFocusMutations(details: MutationDetails): void {
  const { targetNode } = details;
  // Current focused element (or it's ancestor) is removed from the DOM, we need to find a new focus
  currentFocus = { elem: null, parentHasAutofocus: false };
  const nextFocus = getNextFocus(
    null, // No current focus since it's removed
    'ArrowDown', // No directional input, just find the next best focus
    targetNode
  );
  triggerFocus(nextFocus);
}

function triggerFocus(
  nextFocus: {
    elem: HTMLElement | null,
    parentHasAutofocus: boolean
  },
  keyCode?: string
): boolean {
  if (nextFocus && nextFocus.elem) {
    let preventScroll = false;
    // Stop observing mutations on current focus
    stopObserving();

    // Only handle scroll for subsequent navigations, not first focus
    if (keyCode && currentFocus.elem) {
      maybeScrollOnFocus(nextFocus.elem, keyCode, currentFocus.elem);
      preventScroll = true;
    }

    currentFocus.elem = nextFocus.elem;
    currentFocus.parentHasAutofocus = nextFocus.parentHasAutofocus;

    // set id first
    setupNodeId(nextFocus.elem);
    updateAncestorsAutoFocus(nextFocus.elem, spatialNavigationContainer);

    // Focus the element with/without scrolling
    nextFocus.elem.focus({ preventScroll });

    // Start observing mutations
    const parentContainer = getParentContainer(nextFocus.elem);
    if (parentContainer) {
      startObserving(
        parentContainer,
        nextFocus.elem,
        handleCurrentFocusMutations
      );
    }

    return true;
  }
  return false;
}

function handlePageVisibilityChange(event: any) {
  if (event.type === 'focus') {
    if (currentFocus.elem) {
      setTimeout(() => {
        currentFocus.elem.focus();
      }, 200); // Workaround: Delay as react DOM tries to restore focus and then blurs it!!!
    }
  }
}

function setupPageVisibilityListeners() {
  if (
    typeof document !== 'undefined' &&
    typeof document.addEventListener === 'function'
  ) {
    window.addEventListener('focus', handlePageVisibilityChange);
    // Not handling blur as react dom already blurs on leaving the page
  } else {
    console.warn(
      'Document or addEventListener not available, cannot setup visibility change listener'
    );
  }
}

function setupSpatialNavigation(container?: HTMLElement) {
  if (isSpatialManagerReady) {
    return;
  }

  setSpatialNavigationConfig();
  setupPageVisibilityListeners();

  spatialNavigationContainer = container?.ownerDocument || window.document;

  // Listen to keydown events on the container or document
  keyDownListener = addEventListener(
    spatialNavigationContainer,
    'keydown',
    (event: any) => {
      const keyCode = event.key || event.code;

      if (
        keyCode !== 'ArrowUp' &&
        keyCode !== 'ArrowDown' &&
        keyCode !== 'ArrowLeft' &&
        keyCode !== 'ArrowRight'
      ) {
        return;
      }

      if (!currentFocus) {
        console.warn('No initial focus. Trying to set one...');
      }

      const nextFocus = getNextFocus(
        currentFocus.elem,
        keyCode,
        container?.ownerDocument || window.document
      );
      if (triggerFocus(nextFocus, keyCode) === true) {
        event.preventDefault();
      }
    },
    { capture: true }
  );
  isSpatialManagerReady = true;
}

function setFocus(node: HTMLElement) {
  if (node && node.className.includes('lrud-container')) {
    // We are here if requestTVFocus is called with container as node
    const nextFocus = findDestinationOrAutofocus(
      currentFocus.elem,
      'ArrowDown',
      node,
      true
    );
    if (nextFocus.elem) {
      triggerFocus(nextFocus);
    } else {
      console.warn('No focusable destination for requestTVFocus: ', node);
    }
  } else {
    if (node && node.focus) {
      const parentHasAutofocus =
        getFocusableParentContainer(node)?.getAttribute('data-autofocus') ===
          'true' || false;
      triggerFocus({ elem: node, parentHasAutofocus });
    }
  }
}

// WARNING: This is a very specific API to set destinations for TVFocusGuideView and is not meant for general use.
// It may have unexpected results if used outside of the context of TVFocusGuideView.
function setDestinations(host: HTMLElement, destinations: HTMLElement[]) {
  // Get ids from destinations, and if id not set, generate a new one and set all of them into 'data-destinations' attribute in the host element
  if (destinations && Array.isArray(destinations)) {
    const destinationIDs = destinations
      .map((dest) => {
        if (dest && !(dest instanceof HTMLElement)) {
          console.error(
            'Error: Argument appears to not be a ReactComponent',
            dest
          );
          return null;
        }
        return dest ? setupNodeId(dest) : null;
      })
      .filter((id) => id != null);
    if (destinationIDs.length > 0) {
      host.setAttribute('data-destinations', destinationIDs.join(' '));
      // Side effect: If this container has not been set with tabindex 0, do it now
      // to make it a focusable container to work properly for LRUD navigation
      if (!host.tabIndex || host.tabIndex === -1) {
        host.tabIndex = 0;
      }
    } else {
      host.setAttribute('data-destinations', '');
      // Side effect: If there are no destinations and auto-focus is false, we can make this
      // container non-focusable by setting tabindex to -1
      const isAutoFocus = host.getAttribute('data-autofocus') === 'true';
      if (!isAutoFocus) {
        host.tabIndex = -1;
      }
    }
  }
}

function teardownSpatialNavigation() {
  if (!isSpatialManagerReady) {
    return;
  }
  if (keyDownListener) {
    keyDownListener.remove();
    keyDownListener = null;
  }
  spatialNavigationContainer = null;
  currentFocus = null;
  isSpatialManagerReady = false;
}

export {
  setupSpatialNavigation,
  setFocus,
  teardownSpatialNavigation,
  setDestinations
};
