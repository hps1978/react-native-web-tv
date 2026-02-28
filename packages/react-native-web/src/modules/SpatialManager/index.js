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
  setConfig as setLrudConfig,
  getNextFocus,
  getFocusableParentContainer,
  getParentContainer,
  updateAncestorsAutoFocus,
  findDestinationOrAutofocus,
  getNextFocusInViewport
} from '@bbc/tv-lrud-spatial';
import {
  startObserving,
  stopObserving,
  type MutationDetails
} from './mutationObserver';
import {
  type SpatialScrollConfigType,
  type getCurrentFocusType,
  type onScrollRefocusType,
  maybeScrollOnFocus,
  setupAppInitiatedScrollHandler,
  isElementInWindowViewport,
  setupScrollHandler
} from './scrollHandler';
import { addEventListener } from '../addEventListener';
import { setupNodeId } from '../../exports/TV/utils';

type SpatialNavigationConfigType = {
  keyMap?: { [key: string]: string },
  scrollConfig?: SpatialScrollConfigType,
  keydownThrottleMs?: number,
  focusConfig?: {
    mode?: 'AlignLeft' | 'default'
  }
};

type FocusState = {
  elem: HTMLElement | null,
  parentHasAutofocus: boolean
};

let _isSpatialManagerReady = false;
let _spatialNavigationContainer: HTMLElement | null = null;
let _currentFocus: FocusState = {
  elem: null,
  parentHasAutofocus: false
};

let _pendingFocusCount = 0;

let _keydownThrottleMs = 0;
let keyDownListener: ((event: any) => void) | null = null;
let keyUpListener: ((event: any) => void) | null = null;
let appInitiatedScrollCleanup: (() => void) | null = null;
let _lastKeydownAt = 0;
const DEBUG_SCROLL =
  typeof window !== 'undefined' && window.__RNW_TV_SCROLL_DEBUG === true;
// const _hasAnimationFrame =
//   typeof window !== 'undefined' &&
//   typeof window.requestAnimationFrame === 'function';

function loadGlobalConfig(): SpatialNavigationConfigType | null {
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

// Setup configuration for Spatial Navigation, LRUD, and scrollHandler
// global configs (App provided) or defaults
function setupConfigs() {
  // Auto-initialize from global config on first arrow key press if not already initialized
  if (!_isSpatialManagerReady) {
    const globalConfig: SpatialNavigationConfigType | null = loadGlobalConfig();
    let keyMap = null;
    let spatialScrollConfig: SpatialScrollConfigType = {};
    let focusMode: 'AlignLeft' | 'default' = 'default';

    if (globalConfig) {
      // Setup LRUD Keys if provided
      keyMap = globalConfig?.keyMap;

      _keydownThrottleMs =
        typeof globalConfig?.keydownThrottleMs === 'number'
          ? Math.max(0, globalConfig.keydownThrottleMs)
          : 0;

      focusMode =
        globalConfig?.focusConfig?.mode === 'AlignLeft'
          ? 'AlignLeft'
          : 'default';

      spatialScrollConfig = {
        ...(globalConfig?.scrollConfig || {})
      };
    }

    setLrudConfig({
      keyMap: keyMap,
      noValidDestinationCallback
    });

    setupScrollHandler({
      scrollConfig: spatialScrollConfig,
      focusMode
    });
  }
}

// Handles refocussing when current focused element (or it's ancestor) is removed from the DOM.
function handleCurrentFocusMutations(details: MutationDetails): void {
  const { targetNode } = details;
  // Current focused element (or it's ancestor) is removed from the DOM, we need to find a new focus
  _currentFocus = { elem: null, parentHasAutofocus: false };

  const nextFocus = getNextFocus(
    null, // No current focus since it's removed
    'ArrowDown', // No directional input, just find the next best focus
    targetNode
  );
  _pendingFocusCount = 1;
  triggerFocus(nextFocus);
}

function triggerFocus(nextFocus: FocusState, keyCode?: string): boolean {
  if (nextFocus && nextFocus.elem) {
    if (DEBUG_SCROLL) {
      console.log('[SpatialManager][focus] move', {
        keyCode,
        fromId: _currentFocus?.elem?.id,
        toId: nextFocus.elem.id,
        parentHasAutofocus: nextFocus.parentHasAutofocus,
        pendingFocusCount: _pendingFocusCount
      });
    }

    // let scrollPromise = null;

    // scrollPromise = maybeScrollOnFocus(
    maybeScrollOnFocus(nextFocus.elem, _currentFocus.elem, keyCode);

    const applyFocus = () => {
      if (!nextFocus.elem) {
        return;
      }

      // Stop observing mutations on current focus
      stopObserving();

      _currentFocus.elem = nextFocus.elem;
      _currentFocus.parentHasAutofocus = nextFocus.parentHasAutofocus;
      // set id first
      setupNodeId(nextFocus.elem);
      console.log('>>>> Updated current focus to: ', _currentFocus.elem.id);
      updateAncestorsAutoFocus(nextFocus.elem, _spatialNavigationContainer);

      // const preventScroll = scrollPromise != null;
      const preventScroll = true;

      if (_pendingFocusCount > 0) {
        _pendingFocusCount--;
      }
      if (_pendingFocusCount === 0) {
        // We focus only on the last pending focus to avoid unnecessary intermediate focuses
        // during rapid navigation
        nextFocus.elem.focus({ preventScroll });
      }

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
      // if (_hasAnimationFrame) {
      //   window.requestAnimationFrame(applyFocus);
      // } else {
      //   applyFocus();
      // }
      applyFocus();
    };

    scheduleFocus();

    return true;
  }
  return false;
}

function handlePageVisibilityChange(event: any) {
  if (event.type === 'focus') {
    if (_currentFocus.elem) {
      setTimeout(() => {
        _currentFocus.elem.focus();
      }, 200); // Workaround: Delay as react DOM tries to restore focus and then blurs it!!!
    }
  }
}

function setupAppVisibilityListeners() {
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

// Handler to detect when app calls scroll APIs and reacquire focus if needed
function setupAppInitiatedScrollTracking() {
  const getCurrentFocus: getCurrentFocusType = () => _currentFocus;

  const onScrollRefocus: onScrollRefocusType = ({
    currentFocus,
    scrollContainer
  }) => {
    if (!scrollContainer) {
      return;
    }

    // Use LRUD's new getNextFocusInViewport function to find first focusable
    // element in the scrollContainer that is visible in the window viewport.
    // This is a viewport-aware search that respects LRUD's focus logic
    // while ensuring returned element is actually visible.

    // Define viewport visibility check callback for LRUD
    const isInViewportCallback = (elem: HTMLElement): boolean => {
      return isElementInWindowViewport(elem);
    };

    // Call LRUD with viewport awareness
    const nextFocus = getNextFocusInViewport(
      scrollContainer,
      isInViewportCallback
    );

    if (nextFocus?.elem) {
      if (DEBUG_SCROLL) {
        console.log('[SpatialManager][focus] App scroll reacquisition', {
          scrollContainerId: scrollContainer.id,
          nextFocusId: nextFocus.elem.id,
          parentHasAutofocus: nextFocus.parentHasAutofocus
        });
      }
      // Reset the pending focus count to 1 to indicate we need to focus the nextFocus element after scroll
      _pendingFocusCount = 1;
      triggerFocus(nextFocus, null);
    }
  };

  // Setup scroll handler to detect app-initiated scrolls and trigger refocus if needed
  appInitiatedScrollCleanup = setupAppInitiatedScrollHandler(
    _spatialNavigationContainer || window.document,
    getCurrentFocus,
    onScrollRefocus
  );
}

function setupSpatialNavigation(container?: HTMLElement) {
  if (_isSpatialManagerReady) {
    return;
  }

  setupConfigs();

  setupAppVisibilityListeners();

  setupAppInitiatedScrollTracking();

  _spatialNavigationContainer = container?.ownerDocument || window.document;

  // Listen to keydown events on the container or document
  keyDownListener = addEventListener(
    _spatialNavigationContainer,
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

      if (_keydownThrottleMs > 0) {
        const now = Date.now();
        if (now - _lastKeydownAt < _keydownThrottleMs) {
          return;
        }
        _lastKeydownAt = now;
      }

      if (!_currentFocus.elem) {
        console.warn('No initial focus. Trying to set one...');
      }
      console.log('>>>> Keypress');
      const nextFocus = getNextFocus(
        _currentFocus.elem,
        keyCode,
        container?.ownerDocument || window.document
      );
      console.log('>>>> nextFocus: ', nextFocus.elem);
      if (nextFocus && nextFocus.elem) {
        // Increment pending focus count to indicate focus is required for this navigation action
        _pendingFocusCount += 1;
      }

      triggerFocus(nextFocus, keyCode);
    },
    { capture: true }
  );

  _isSpatialManagerReady = true;
}

function setFocus(node: HTMLElement) {
  if (node && node.className.includes('lrud-container')) {
    // We are here if requestTVFocus is called with container as node
    const nextFocus = findDestinationOrAutofocus(
      _currentFocus.elem,
      'ArrowDown',
      node,
      true
    );
    if (nextFocus.elem) {
      _pendingFocusCount = 1;
      triggerFocus(nextFocus);
    } else {
      console.warn('No focusable destination for requestTVFocus: ', node);
    }
  } else {
    if (node && node.focus) {
      const parentHasAutofocus =
        getFocusableParentContainer(node)?.getAttribute('data-autofocus') ===
          'true' || false;
      _pendingFocusCount = 1;
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
  if (!_isSpatialManagerReady) {
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
  _spatialNavigationContainer = null;
  _currentFocus = { elem: null, parentHasAutofocus: false };
  _isSpatialManagerReady = false;
}

export {
  setupSpatialNavigation,
  setFocus,
  teardownSpatialNavigation,
  setDestinations
};
