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
  getParentContainer,
  updateAncestorsAutoFocus
} from '@bbc/tv-lrud-spatial';
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

function setSpatialNavigationConfig(config: SpatialScrollConfig) {
  spatialScrollConfig = {
    ...DEFAULT_SPATIAL_SCROLL_CONFIG,
    ...(config || {})
  };
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

function maybeScrollOnFocus(elem: HTMLElement | null, keyCode: string) {
  if (!elem || typeof window === 'undefined') return;

  const now = Date.now();
  if (spatialScrollConfig.scrollThrottleMs != null) {
    if (now - lastScrollAt < spatialScrollConfig.scrollThrottleMs) {
      return;
    }
  }

  const isVertical = keyCode === 'ArrowUp' || keyCode === 'ArrowDown';
  const isHorizontal = keyCode === 'ArrowLeft' || keyCode === 'ArrowRight';
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

  // Clamp container bounds to actual viewport to handle containers extending beyond viewport edges
  const visibleContainerRect = {
    top: Math.max(containerRect.top, 0),
    bottom: Math.min(containerRect.bottom, window.innerHeight),
    left: Math.max(containerRect.left, 0),
    right: Math.min(containerRect.right, window.innerWidth)
  };

  const currentOffset = isVertical
    ? scrollable.scrollTop
    : scrollable.scrollLeft;
  const maxOffset = isVertical
    ? Math.max(0, scrollable.scrollHeight - scrollable.clientHeight)
    : Math.max(0, scrollable.scrollWidth - scrollable.clientWidth);

  // Calculate the exact scroll offset needed to bring the focused element fully into view
  let nextOffset = currentOffset;
  let needsScroll = false;

  if (isVertical) {
    const padding = edgeThreshold; // Use edge threshold as padding

    // Element is below viewport - scroll down to show it
    if (targetRect.bottom > visibleContainerRect.bottom - padding) {
      const delta = targetRect.bottom - (visibleContainerRect.bottom - padding);
      nextOffset = Math.min(currentOffset + delta, maxOffset);
      needsScroll = true;
    }
    // Element is above viewport - scroll up to show it
    else if (targetRect.top < visibleContainerRect.top + padding) {
      const delta = visibleContainerRect.top + padding - targetRect.top;
      nextOffset = Math.max(currentOffset - delta, 0);
      needsScroll = true;
    }
  } else {
    const padding = edgeThreshold;

    // Element is to the right of viewport
    if (targetRect.right > visibleContainerRect.right - padding) {
      const delta = targetRect.right - (visibleContainerRect.right - padding);
      nextOffset = Math.min(currentOffset + delta, maxOffset);
      needsScroll = true;
    }
    // Element is to the left of viewport
    else if (targetRect.left < visibleContainerRect.left + padding) {
      const delta = visibleContainerRect.left + padding - targetRect.left;
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
    const directionDurationMs = isVertical
      ? spatialScrollConfig.scrollAnimationDurationMsVertical
      : spatialScrollConfig.scrollAnimationDurationMsHorizontal;
    const durationMs =
      directionDurationMs != null
        ? directionDurationMs
        : spatialScrollConfig.scrollAnimationDurationMs || 0;
    if (durationMs > 0) {
      animateScrollTo(scrollable, isVertical, nextOffset, durationMs);
      return;
    }

    if (typeof scrollable.scrollTo === 'function') {
      if (isVertical) {
        scrollable.scrollTo({
          y: nextOffset,
          animated: spatialScrollConfig.smoothScrollEnabled !== false
        });
      } else {
        scrollable.scrollTo({
          x: nextOffset,
          animated: spatialScrollConfig.smoothScrollEnabled !== false
        });
      }
    } else if (isVertical) {
      scrollable.scrollTop = nextOffset;
    } else {
      scrollable.scrollLeft = nextOffset;
    }
  });
}

function triggerFocus(
  nextFocus: {
    elem: HTMLElement | null,
    parentHasAutofocus: boolean
  },
  keyCode?: string
): boolean {
  if (nextFocus && nextFocus.elem) {
    currentFocus = nextFocus;
    // set id first
    setupNodeId(nextFocus.elem);
    updateAncestorsAutoFocus(nextFocus.elem, spatialNavigationContainer);
    if (keyCode) {
      maybeScrollOnFocus(nextFocus.elem, keyCode);
    }
    nextFocus.elem.focus();
    return true;
  }
  return false;
}

function setupSpatialNavigation(
  container?: HTMLElement,
  config?: SpatialScrollConfig
) {
  if (isSpatialManagerReady) {
    return;
  }

  setSpatialNavigationConfig(config);

  // Configure LRUD
  setConfig({
    // keyMap: TODO: Setup Keymap based on different TV platforms (get this as a config)
  });

  spatialNavigationContainer = container?.ownerDocument || window.document;

  // Listen to keydown events on the container or document
  keyDownListener = addEventListener(
    spatialNavigationContainer,
    'keydown',
    (event: any) => {
      console.log('[SpatialNavigation] keydown event: ', event);
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
      console.log('[SpatialNavigation] Next focus element: ', nextFocus);
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
    // It's a container trigger spatial logic to find an focus
    // TODO: Add another function which triggers the spatial logic based on the container
    // and without the need to pass the keyCode
    const nextFocus = getNextFocus(
      null, // use this as starting point
      'ArrowDown',
      node // this is the scope as well for now!
    );
    triggerFocus(nextFocus);
  } else {
    if (node && node.focus) {
      const parentHasAutofocus =
        getParentContainer(node)?.getAttribute('data-autofocus') === 'true' ||
        false;
      triggerFocus({ elem: node, parentHasAutofocus });
    }
  }
}

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
      // Side effect: If this container has not been set with lrud-container class, do it now
      // to allow collapsable/expandable containers to work properly for LRUD navigation
      if (!host.className?.includes('lrud-container')) {
        if (host.className?.length > 0) {
          host.className += ' lrud-container';
        } else {
          host.className = 'lrud-container';
        }
      }
    } else {
      host.setAttribute('data-destinations', '');
      // Side effect: If there are no destinations and auto-focus is false, we can remove the lrud-container class
      const isContainer = host.className?.includes('lrud-container');
      const isAutoFocus = host.getAttribute('data-autofocus') === 'true';
      if (isContainer && !isAutoFocus) {
        if (host.className?.length > 14) {
          host.className = host.className.replace(' lrud-container', '');
        } else {
          host.className = host.className.replace('lrud-container', '');
        }
      }
    }
    console.log(
      'SpatialManager: setDestinations ',
      host.getAttribute('data-destinations')
    );
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
