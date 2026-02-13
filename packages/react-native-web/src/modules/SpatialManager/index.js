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
import {
  DEFAULT_SPATIAL_SCROLL_CONFIG,
  type SpatialScrollConfig,
  type ReAcquireFocusOptions,
  createScrollState,
  maybeScrollOnFocus,
  setupAppInitiatedScrollHandler
} from './scrollHandler';
import { addEventListener } from '../addEventListener';
import { setupNodeId } from '../../exports/TV/utils';

type SpatialNavigationConfig = {
  keyMap?: { [key: string]: string },
  scrollConfig?: SpatialScrollConfig,
  keydownThrottleMs?: number,
  focusMode?: 'LeftTop' | 'default'
};

type FocusState = {
  elem: HTMLElement | null,
  parentHasAutofocus: boolean
};

let isSpatialManagerReady = false;
let spatialNavigationContainer: HTMLElement | null = null;
let currentFocus: FocusState = {
  elem: null,
  parentHasAutofocus: false
};
let pendingFocus: FocusState | null = null;
let navigationSequence = 0;
let keydownThrottleMs = 0;
let focusMode: 'LeftTop' | 'default' = 'default';
let keyDownListener: ((event: any) => void) | null = null;
let keyUpListener: ((event: any) => void) | null = null;
let appInitiatedScrollCleanup: (() => void) | null = null;
let spatialScrollConfig: SpatialScrollConfig = {
  ...DEFAULT_SPATIAL_SCROLL_CONFIG
};
let lastKeydownAt = 0;
const scrollState = createScrollState();
const DEBUG_SCROLL =
  typeof window !== 'undefined' && window.__RNW_TV_SCROLL_DEBUG === true;
const hasAnimationFrame =
  typeof window !== 'undefined' &&
  typeof window.requestAnimationFrame === 'function';

function loadGlobalConfig(): SpatialNavigationConfig | null {
  // Check for window.appConfig.spatialNav (cross-platform pattern)
  if (typeof window !== 'undefined' && window.appConfig) {
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

      if (typeof globalConfig?.keydownThrottleMs === 'number') {
        keydownThrottleMs = Math.max(0, globalConfig.keydownThrottleMs);
      }
      if (globalConfig?.focusMode === 'LeftTop') {
        focusMode = 'LeftTop';
      }
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

function handleCurrentFocusMutations(details: MutationDetails): void {
  const { targetNode } = details;
  // Current focused element (or it's ancestor) is removed from the DOM, we need to find a new focus
  currentFocus = { elem: null, parentHasAutofocus: false };
  pendingFocus = null;
  const nextFocus = getNextFocus(
    null, // No current focus since it's removed
    'ArrowDown', // No directional input, just find the next best focus
    targetNode
  );
  triggerFocus(nextFocus);
}

function triggerFocus(
  nextFocus: FocusState,
  keyCode?: string,
  options?: {
    sequence?: number,
    navigationFrom?: HTMLElement | null,
    focusMode?: 'LeftTop' | 'default'
  }
): boolean {
  if (nextFocus && nextFocus.elem) {
    if (DEBUG_SCROLL) {
      console.log('[SpatialManager][focus] move', {
        keyCode,
        fromId: currentFocus?.elem?.id,
        toId: nextFocus.elem.id,
        parentHasAutofocus: nextFocus.parentHasAutofocus,
        sequence: options?.sequence
      });
    }

    let scrollPromise = null;
    const navigationFrom =
      options?.navigationFrom != null
        ? options.navigationFrom
        : currentFocus.elem;
    const mode = options?.focusMode || focusMode;
    // Only handle scroll for subsequent navigations, not first focus
    if (keyCode && navigationFrom) {
      scrollPromise = maybeScrollOnFocus(
        nextFocus.elem,
        keyCode,
        navigationFrom,
        spatialScrollConfig,
        scrollState,
        mode
      );
    }

    const applyFocus = () => {
      if (!nextFocus.elem) {
        return;
      }

      if (
        options?.sequence != null &&
        options.sequence !== navigationSequence
      ) {
        return;
      }

      // Stop observing mutations on current focus
      stopObserving();

      currentFocus.elem = nextFocus.elem;
      currentFocus.parentHasAutofocus = nextFocus.parentHasAutofocus;
      pendingFocus = null;

      // set id first
      setupNodeId(nextFocus.elem);
      updateAncestorsAutoFocus(nextFocus.elem, spatialNavigationContainer);

      const preventScroll = scrollPromise != null;
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
    };

    const scheduleFocus = () => {
      if (hasAnimationFrame) {
        window.requestAnimationFrame(applyFocus);
      } else {
        applyFocus();
      }
    };

    if (scrollPromise && typeof scrollPromise.then === 'function') {
      scrollPromise.then(applyFocus);
    } else {
      scheduleFocus();
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

function setupAppInitiatedScrollTracking() {
  // Setup handler to detect when app calls scroll APIs and reacquire focus if needed
  const scrollOptions: ReAcquireFocusOptions = {
    getCurrentFocus: () => currentFocus,
    onScrollRefocus: ({ currentFocus: focusState, scrollContainer }) => {
      const container = getParentContainer(scrollContainer);
      if (container && container.tabIndex === 0) {
        // We found a focusable container
        const nextFocus = findDestinationOrAutofocus(
          null,
          'ArrowDown',
          container,
          true
        );
        triggerFocus(nextFocus, null);
        return;
      } else {
        const nextFocus = getNextFocus(
          null, // dont't provide current focus since we want to find the best candidate in the container subtree if possible
          'ArrowDown', // No directional input, just find the next best focus
          container
        );
        triggerFocus(nextFocus);
      }

      const nextFocus = getNextFocus(focusState.elem, 'ArrowDown', container);
      triggerFocus(nextFocus, null);
    }
  };

  appInitiatedScrollCleanup = setupAppInitiatedScrollHandler(
    spatialNavigationContainer || window.document,
    scrollOptions
  );
}

function setupSpatialNavigation(container?: HTMLElement) {
  if (isSpatialManagerReady) {
    return;
  }

  setSpatialNavigationConfig();
  setupPageVisibilityListeners();
  setupAppInitiatedScrollTracking();

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

      event.preventDefault();

      if (keydownThrottleMs > 0) {
        const now = Date.now();
        if (now - lastKeydownAt < keydownThrottleMs) {
          return;
        }
        lastKeydownAt = now;
      }

      if (!currentFocus.elem) {
        console.warn('No initial focus. Trying to set one...');
      }

      const sequence = navigationSequence + 1;
      navigationSequence = sequence;
      const navigationFrom = pendingFocus?.elem || currentFocus.elem;

      const nextFocus = getNextFocus(
        navigationFrom,
        keyCode,
        container?.ownerDocument || window.document
      );
      if (nextFocus && nextFocus.elem) {
        pendingFocus = nextFocus;
      }
      if (
        triggerFocus(nextFocus, keyCode, {
          sequence,
          navigationFrom,
          focusMode
        }) === true
      ) {
      }
    },
    { capture: true }
  );

  keyUpListener = addEventListener(
    spatialNavigationContainer,
    'keyup',
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

      if (!pendingFocus || !pendingFocus.elem) {
        return;
      }

      if (
        triggerFocus(pendingFocus, undefined, {
          sequence: navigationSequence,
          navigationFrom: currentFocus.elem
        }) === true
      ) {
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
  if (keyUpListener) {
    keyUpListener.remove();
    keyUpListener = null;
  }
  if (appInitiatedScrollCleanup) {
    appInitiatedScrollCleanup();
    appInitiatedScrollCleanup = null;
  }
  spatialNavigationContainer = null;
  currentFocus = { elem: null, parentHasAutofocus: false };
  pendingFocus = null;
  navigationSequence = 0;
  isSpatialManagerReady = false;
}

export {
  setupSpatialNavigation,
  setFocus,
  teardownSpatialNavigation,
  setDestinations
};
