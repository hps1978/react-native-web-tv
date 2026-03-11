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
  setConfig as setLrudConfig,
  getNextFocus,
  getParentContainer,
  updateAncestorsAutoFocus,
  findDestinationOrAutofocus,
  getNextFocusInViewport
} from '@bbc/tv-lrud-spatial';
import { addEventListener } from '../addEventListener';
import { setupNodeId } from '../../exports/TV/utils';
import type { ElemData } from './utils';
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
  setupScrollHandler,
  scrollToEdge
} from './scrollHandler';

type SpatialNavigationConfigType = {
  keyMap?: { [key: string]: string },
  scrollConfig?: SpatialScrollConfigType,
  keydownThrottleMs?: number,
  focusConfig?: {
    mode?: 'AlignLeft' | 'default'
  }
};

/**
 * SpatialManager
 * Manages spatial navigation for TV platforms using the @bbc/tv-lrud-spatial library.
 * Implements singleton pattern to ensure only one instance exists across the app.
 */
class SpatialManager {
  static #_instance: SpatialManager | null = null;
  _isSpatialManagerReady: boolean;
  _spatialNavigationContainer: Document | HTMLElement | null;
  _currentFocus: ElemData;
  // _pendingFocusCount: number;
  _keydownThrottleMs: number;
  keyDownListener: ((event: any) => void) | null;
  appInitiatedScrollCleanup: (() => void) | null;
  _lastKeydownAt: number;

  /**
   * constructor
   * Initializes or returns the singleton instance of SpatialManager.
   * @returns {SpatialManager} The singleton instance
   */
  constructor() {
    if (SpatialManager.#_instance) {
      return SpatialManager.#_instance;
    }
    this._isSpatialManagerReady = false;
    this._spatialNavigationContainer = null;
    this._currentFocus = {
      elem: null,
      parentContainer: null
    };
    // this._pendingFocusCount = 0;
    this._keydownThrottleMs = 0;
    this.keyDownListener = null;
    this.appInitiatedScrollCleanup = null;
    this._lastKeydownAt = 0;

    SpatialManager.#_instance = this;
  }

  /**
   * loadGlobalConfig
   * Loads spatial navigation configuration from window.appConfig if available.
   * @returns {SpatialNavigationConfigType | null} The global app configuration or null if not found
   */
  loadGlobalConfig(): SpatialNavigationConfigType | null {
    // Check for window.appConfig
    if (typeof window !== 'undefined' && window.appConfig) {
      return (window.appConfig: any);
    }
    return null;
  }

  /**
   * noValidDestinationCallback
   * Callback invoked when LRUD fails to find a valid destination from data-destinations attribute.
   * LRUD will use fallback autofocus or default focus logic. Container becomes non-focusable
   * if there is no autofocus and no valid destination.
   * @param {HTMLElement} candidateContainer - The container being evaluated for focus
   * @param {boolean} hasAutoFocus - Whether the container has autofocus enabled
   * @returns {void}
   */
  noValidDestinationCallback(candidateContainer, hasAutoFocus) {
    if (candidateContainer && !hasAutoFocus) {
      candidateContainer.tabIndex = -1;
    }
  }

  /**
   * setupConfigs
   * Sets up configuration for Spatial Navigation, LRUD library, and scroll handler.
   * Loads settings from global app config or uses defaults. Only initializes once.
   * @returns {void}
   */
  setupConfigs() {
    // Auto-initialize from global config on first arrow key press if not already initialized
    if (!this._isSpatialManagerReady) {
      const globalConfig: SpatialNavigationConfigType | null =
        this.loadGlobalConfig();
      let keyMap = null;
      let spatialScrollConfig: SpatialScrollConfigType = {};
      let focusMode: 'AlignLeft' | 'default' = 'default';

      if (globalConfig) {
        // Setup LRUD Keys if provided
        keyMap = globalConfig?.keyMap;

        this._keydownThrottleMs =
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
        noValidDestinationCallback: this.noValidDestinationCallback
      });

      setupScrollHandler({
        scrollConfig: spatialScrollConfig,
        focusMode
      });
    }
  }

  /**
   * handleCurrentFocusMutations
   * Handles refocusing when the currently focused element or its ancestor is removed from the DOM.
   * Finds and triggers focus to the next available focusable element.
   * @param {MutationDetails} details - Object containing the removed target node and other mutation info
   * @returns {void}
   */
  handleCurrentFocusMutations(details: MutationDetails): void {
    const { targetNode } = details;
    // Current focused element (or it's ancestor) is removed from the DOM, we need to find a new focus
    this._currentFocus = { elem: null, parentContainer: null };

    const nextFocus = getNextFocus(
      null, // No current focus since it's removed
      'ArrowDown', // No directional input, just find the next best focus
      targetNode
    );
    // this._pendingFocusCount = 1;
    this.triggerFocus(nextFocus);
  }

  /**
   * triggerFocus
   * Applies focus to the specified element after handling scroll positioning.
   * Updates spatial manager state and sets up mutation observation on the new focus target.
   * @param {ElemData} nextFocus - Object containing elem (target element) and it's LRUD parentContainer
   * @param {string} [keyCode] - Optional key code that triggered the focus change (e.g., 'ArrowUp')
   * @returns {boolean} True if focus was successfully applied, false if nextFocus or elem is invalid
   */
  triggerFocus(nextFocus: ElemData, keyCode?: string): boolean {
    if (nextFocus && nextFocus.elem) {
      const nextElem = nextFocus.elem;
      // let scrollPromise = null;
      const finalKeyCode = keyCode || 'ArrowDown'; // Default to ArrowDown if not provided

      // scrollPromise = maybeScrollOnFocus(
      maybeScrollOnFocus(nextFocus, this._currentFocus, finalKeyCode);

      const applyFocus = () => {
        if (!nextFocus.elem) {
          return;
        }

        // Stop observing mutations on current focus
        stopObserving();

        this._currentFocus.elem = nextElem;
        this._currentFocus.parentContainer = nextFocus.parentContainer;
        // set id first
        setupNodeId(nextElem);
        updateAncestorsAutoFocus(nextElem, this._spatialNavigationContainer);

        // const preventScroll = scrollPromise != null;
        const preventScroll = true;

        // if (this._pendingFocusCount > 0) {
        //   this._pendingFocusCount--;
        // }
        // if (this._pendingFocusCount === 0) {
        // We focus only on the last pending focus to avoid unnecessary intermediate focuses
        // during rapid navigation
        nextElem.focus({ preventScroll });
        // }

        // Start observing mutations
        const parentContainer = getParentContainer(nextElem, true);
        if (parentContainer) {
          startObserving(
            parentContainer,
            nextElem,
            this.handleCurrentFocusMutations.bind(this)
          );
        }
      };

      applyFocus();

      return true;
    }
    return false;
  }

  /**
   * handlePageVisibilityChange
   * Handles page focus/visibility changes by restoring focus to the previously focused element.
   * Includes a delay to work around React DOM focus restoration issues.
   * @param {any} event - The visibility change event object
   * @returns {void}
   */
  handlePageVisibilityChange(event: any) {
    if (event.type === 'focus') {
      const currentElem = this._currentFocus.elem;
      if (currentElem) {
        setTimeout(() => {
          currentElem.focus();
        }, 200); // Workaround: Delay as react DOM tries to restore focus and then blurs it!!!
      }
    }
  }

  /**
   * setupAppVisibilityListeners
   * Registers listeners for page visibility changes (focus/blur events).
   * Ensures focus is maintained when the page regains visibility.
   * @returns {void}
   */
  setupAppVisibilityListeners() {
    if (
      typeof document !== 'undefined' &&
      typeof document.addEventListener === 'function'
    ) {
      window.addEventListener(
        'focus',
        this.handlePageVisibilityChange.bind(this)
      );
      // Not handling blur as react dom already blurs on leaving the page
    } else {
      console.warn(
        'Document or addEventListener not available, cannot setup visibility change listener'
      );
    }
  }

  /**
   * setupAppInitiatedScrollTracking
   * Detects when the application calls scroll APIs and reacquires focus if needed.
   * Ensures focused element remains in viewport after app-initiated scrolling.
   * @returns {void}
   */
  setupAppInitiatedScrollTracking() {
    const getCurrentFocus: getCurrentFocusType = () => this._currentFocus;

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
        // Reset the pending focus count to 1 to indicate we need to focus the nextFocus element after scroll
        // this._pendingFocusCount = 1;
        this.triggerFocus(nextFocus);
      }
    };

    // Setup scroll handler to detect app-initiated scrolls and trigger refocus if needed
    this.appInitiatedScrollCleanup = setupAppInitiatedScrollHandler(
      this._spatialNavigationContainer || window.document,
      getCurrentFocus,
      onScrollRefocus
    );
  }

  /**
   * setupSpatialNavigation
   * Initializes spatial navigation system for TV remote control input.
   * Sets up LRUD configuration, event listeners, scroll tracking, and visibility listeners.
   * Only runs once; subsequent calls are ignored.
   * @param {HTMLElement} [container] - Optional container element to set as spatial navigation root
   * @returns {void}
   */
  setupSpatialNavigation(container?: HTMLElement) {
    if (this._isSpatialManagerReady) {
      return;
    }

    this.setupConfigs();

    this.setupAppVisibilityListeners();

    this.setupAppInitiatedScrollTracking();

    this._spatialNavigationContainer =
      container?.ownerDocument || window.document;

    // Listen to keydown events on the container or document
    this.keyDownListener = addEventListener(
      this._spatialNavigationContainer,
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

        if (this._keydownThrottleMs > 0) {
          const now = Date.now();
          if (now - this._lastKeydownAt < this._keydownThrottleMs) {
            return;
          }
          this._lastKeydownAt = now;
        }

        if (!this._currentFocus.elem) {
          console.warn('No initial focus. Trying to set one...');
        }

        event.preventDefault();

        const nextFocus = getNextFocus(
          this._currentFocus.elem,
          keyCode,
          container?.ownerDocument || window.document
        );

        if (nextFocus && nextFocus.elem) {
          // Increment pending focus count to indicate focus is required for this navigation action
          // this._pendingFocusCount += 1;
          this.triggerFocus(nextFocus, keyCode);
        } else {
          // We may not be at the edge of the scroll
          scrollToEdge(this._currentFocus.elem, keyCode);
        }
      },
      { capture: true }
    );
    this._isSpatialManagerReady = true;
  }

  /**
   * setFocus
   * Programmatically sets focus to a specific element or LRUD container.
   * If node is an LRUD container, finds and focuses the appropriate child element.
   * If node is a regular element, directly focuses it and updates spatial manager state.
   * @param {HTMLElement} node - The target element or container to focus
   * @returns {void}
   */
  setFocus(node: ?HTMLElement) {
    if (node == null) {
      return;
    }

    if (node && node.className.includes('lrud-container')) {
      // We are here if requestTVFocus is called with container as node
      const nextFocus = findDestinationOrAutofocus(
        this._currentFocus.elem,
        'ArrowDown',
        node,
        true
      );
      if (nextFocus.elem) {
        // this._pendingFocusCount = 1;
        this.triggerFocus(nextFocus);
      } else {
        console.warn('No focusable destination for requestTVFocus: ', node);
      }
    } else {
      if (node && node.focus) {
        const parentContainer = getParentContainer(node, false);
        // this._pendingFocusCount = 1;
        this.triggerFocus({ elem: node, parentContainer });
      }
    }
  }

  /**
   * setDestinations
   * Internal API to set focus destinations for TVFocusGuideView containers.
   * WARNING: This is very specific to TVFocusGuideView and should not be used elsewhere.
   * Generates IDs for destination elements and stores them in the data-destinations attribute.
   * @param {HTMLElement} host - The TVFocusGuideView container element
   * @param {HTMLElement[]} destinations - Array of target elements that can receive focus
   * @returns {void}
   */
  setDestinations(host: HTMLElement, destinations: ?Array<?HTMLElement>) {
    // Get ids from destinations, and if id not set, generate a new one and set all of them into 'data-destinations' attribute in the host element
    if (destinations && Array.isArray(destinations)) {
      const destinationIDs = destinations
        .map((dest) => {
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

  /**
   * teardownSpatialNavigation
   * Cleans up spatial navigation system by removing all event listeners and observers.
   * Resets internal state and prepares for potential re-initialization.
   * @returns {void}
   */
  teardownSpatialNavigation() {
    if (this.keyDownListener && this._spatialNavigationContainer) {
      this._spatialNavigationContainer.removeEventListener(
        'keydown',
        this.keyDownListener,
        { capture: true }
      );
      this.keyDownListener = null;
    }
    if (this.appInitiatedScrollCleanup) {
      this.appInitiatedScrollCleanup();
      this.appInitiatedScrollCleanup = null;
    }
    if (
      typeof document !== 'undefined' &&
      typeof document.removeEventListener === 'function'
    ) {
      window.removeEventListener('focus', this.handlePageVisibilityChange);
    }
    stopObserving();
    this._currentFocus = { elem: null, parentContainer: null };
    this._isSpatialManagerReady = false;
    this._spatialNavigationContainer = null;
  }
}

const spatialManager = new SpatialManager();
export const setupSpatialNavigation: (container?: HTMLElement) => void =
  spatialManager.setupSpatialNavigation.bind(spatialManager);
export const setFocus: (node: ?HTMLElement) => void =
  spatialManager.setFocus.bind(spatialManager);
export const setDestinations: (
  host: HTMLElement,
  destinations: ?Array<?HTMLElement>
) => void = spatialManager.setDestinations.bind(spatialManager);
export const teardownSpatialNavigation: () => void =
  spatialManager.teardownSpatialNavigation.bind(spatialManager);
