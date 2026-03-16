import _objectSpread from "@babel/runtime/helpers/objectSpread2";
import _classPrivateFieldLooseBase from "@babel/runtime/helpers/classPrivateFieldLooseBase";
import _classPrivateFieldLooseKey from "@babel/runtime/helpers/classPrivateFieldLooseKey";
var _SpatialManager;
/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * 
 * @format
 */

import { setConfig as setLrudConfig, getNextFocus, getParentContainer, updateAncestorsAutoFocus, findDestinationOrAutofocus, getNextFocusInViewport } from '@bbc/tv-lrud-spatial';
import { addEventListener } from '../addEventListener';
import { setupNodeId } from '../../exports/TV/utils';
import { startObserving, stopObserving } from './mutationObserver';
import { scrollContainer, scrollToElement, setupAppInitiatedScrollHandler, isElementInWindowViewport, setupScrollHandler, scrollToEdge } from './scrollHandler';
var _instance = /*#__PURE__*/_classPrivateFieldLooseKey("_instance");
/**
 * SpatialManager
 * Manages spatial navigation for TV platforms using the @bbc/tv-lrud-spatial library.
 * Implements singleton pattern to ensure only one instance exists across the app.
 */
class SpatialManager {
  // _pendingFocusCount: number;

  /**
   * constructor
   * Initializes or returns the singleton instance of SpatialManager.
   * @returns {SpatialManager} The singleton instance
   */
  constructor() {
    if (_classPrivateFieldLooseBase(SpatialManager, _instance)[_instance]) {
      return _classPrivateFieldLooseBase(SpatialManager, _instance)[_instance];
    }
    this._isSpatialManagerReady = false;
    this._spatialNavigationContainer = null;
    this._currentFocus = {
      elem: null,
      parentContainer: null
    };
    this._keyHandlerControlOwner = null;
    this._keyHandlerControlCallback = null;
    // this._pendingFocusCount = 0;
    this._keydownThrottleMs = 0;
    this.keyDownListener = null;
    this.appInitiatedScrollCleanup = null;
    this._lastKeydownAt = 0;
    _classPrivateFieldLooseBase(SpatialManager, _instance)[_instance] = this;
  }

  /**
   * loadGlobalConfig
   * Loads spatial navigation configuration from window.appConfig if available.
   * @returns {SpatialNavigationConfigType | null} The global app configuration or null if not found
   */
  loadGlobalConfig() {
    // Check for window.appConfig
    if (typeof window !== 'undefined' && window.appConfig) {
      return window.appConfig;
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
      var globalConfig = this.loadGlobalConfig();
      var keyMap = null;
      var spatialScrollConfig = {};
      var focusMode = 'default';
      if (globalConfig) {
        var _globalConfig$focusCo;
        // Setup LRUD Keys if provided
        keyMap = globalConfig == null ? void 0 : globalConfig.keyMap;
        this._keydownThrottleMs = typeof (globalConfig == null ? void 0 : globalConfig.keydownThrottleMs) === 'number' ? Math.max(0, globalConfig.keydownThrottleMs) : 0;
        focusMode = (globalConfig == null || (_globalConfig$focusCo = globalConfig.focusConfig) == null ? void 0 : _globalConfig$focusCo.mode) === 'AlignLeft' ? 'AlignLeft' : 'default';
        spatialScrollConfig = _objectSpread({}, (globalConfig == null ? void 0 : globalConfig.scrollConfig) || {});
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
  handleCurrentFocusMutations(details) {
    var targetNode = details.targetNode;
    // Current focused element (or it's ancestor) is removed from the DOM, we need to find a new focus
    this._currentFocus = {
      elem: null,
      parentContainer: null
    };
    var nextFocus = getNextFocus(null,
    // No current focus since it's removed
    'ArrowDown',
    // No directional input, just find the next best focus
    targetNode);
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
  triggerFocus(nextFocus, keyCode) {
    if (nextFocus && nextFocus.elem) {
      var nextElem = nextFocus.elem;
      // let scrollPromise = null;
      var finalKeyCode = keyCode || 'ArrowDown'; // Default to ArrowDown if not provided

      // scrollPromise = scrollToElement(
      scrollToElement(nextFocus, this._currentFocus, finalKeyCode);
      var applyFocus = () => {
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
        var preventScroll = true;

        // if (this._pendingFocusCount > 0) {
        //   this._pendingFocusCount--;
        // }
        // if (this._pendingFocusCount === 0) {
        // We focus only on the last pending focus to avoid unnecessary intermediate focuses
        // during rapid navigation
        nextElem.focus({
          preventScroll
        });
        // }

        // Start observing mutations
        var parentContainer = getParentContainer(nextElem, true);
        if (parentContainer) {
          startObserving(parentContainer, nextElem, this.handleCurrentFocusMutations.bind(this));
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
  handlePageVisibilityChange(event) {
    if (event.type === 'focus') {
      var currentElem = this._currentFocus.elem;
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
    if (typeof document !== 'undefined' && typeof document.addEventListener === 'function') {
      window.addEventListener('focus', this.handlePageVisibilityChange.bind(this));
      // Not handling blur as react dom already blurs on leaving the page
    } else {
      console.warn('Document or addEventListener not available, cannot setup visibility change listener');
    }
  }

  /**
   * setupAppInitiatedScrollTracking
   * Detects when the application calls scroll APIs and reacquires focus if needed.
   * Ensures focused element remains in viewport after app-initiated scrolling.
   * @returns {void}
   */
  setupAppInitiatedScrollTracking() {
    var getCurrentFocus = () => this._currentFocus;
    var onScrollRefocus = _ref => {
      var currentFocus = _ref.currentFocus,
        scrollContainer = _ref.scrollContainer;
      if (!scrollContainer) {
        return;
      }

      // Use LRUD's new getNextFocusInViewport function to find first focusable
      // element in the scrollContainer that is visible in the window viewport.
      // This is a viewport-aware search that respects LRUD's focus logic
      // while ensuring returned element is actually visible.

      // Define viewport visibility check callback for LRUD
      var isInViewportCallback = elem => {
        return isElementInWindowViewport(elem);
      };

      // Call LRUD with viewport awareness
      var nextFocus = getNextFocusInViewport(scrollContainer, isInViewportCallback);
      if (nextFocus != null && nextFocus.elem) {
        // Reset the pending focus count to 1 to indicate we need to focus the nextFocus element after scroll
        // this._pendingFocusCount = 1;
        this.triggerFocus(nextFocus);
      }
    };

    // Setup scroll handler to detect app-initiated scrolls and trigger refocus if needed
    this.appInitiatedScrollCleanup = setupAppInitiatedScrollHandler(this._spatialNavigationContainer || window.document, getCurrentFocus, onScrollRefocus);
  }

  /**
   * setupSpatialNavigation
   * Initializes spatial navigation system for TV remote control input.
   * Sets up LRUD configuration, event listeners, scroll tracking, and visibility listeners.
   * Only runs once; subsequent calls are ignored.
   * @param {HTMLElement} [container] - Optional container element to set as spatial navigation root
   * @returns {void}
   */
  setupSpatialNavigation(container) {
    if (this._isSpatialManagerReady) {
      return;
    }
    this.setupConfigs();
    this.setupAppVisibilityListeners();
    this.setupAppInitiatedScrollTracking();
    this._spatialNavigationContainer = (container == null ? void 0 : container.ownerDocument) || window.document;

    // Listen to keydown events on the container or document
    this.keyDownListener = addEventListener(this._spatialNavigationContainer, 'keydown', event => {
      var keyCode = event.key || event.code;
      if (keyCode !== 'ArrowUp' && keyCode !== 'ArrowDown' && keyCode !== 'ArrowLeft' && keyCode !== 'ArrowRight') {
        return;
      }
      if (this._keydownThrottleMs > 0) {
        var now = Date.now();
        if (now - this._lastKeydownAt < this._keydownThrottleMs) {
          return;
        }
        this._lastKeydownAt = now;
      }
      if (this._keyHandlerControlOwner) {
        var _owner = this._keyHandlerControlOwner;
        var focusedElem = this._currentFocus.elem;
        if (_owner && focusedElem && (focusedElem === _owner || _owner.contains(focusedElem))) {
          if (this._keyHandlerControlCallback) {
            var wasHandled = this._keyHandlerControlCallback(keyCode) === true;
            if (wasHandled) {
              // this needs to be done by handler/owner
              // event.preventDefault();
              return;
            }
          }
        } else {
          // Assume control owner is no longer relevant
          this._keyHandlerControlOwner = null;
          this._keyHandlerControlCallback = null;
        }
      }
      if (!this._currentFocus.elem) {
        console.warn('No initial focus. Trying to set one...');
      }
      var nextFocus = getNextFocus(this._currentFocus.elem, keyCode, this._spatialNavigationContainer);
      if (nextFocus && nextFocus.elem) {
        event.preventDefault();
        this.triggerFocus(nextFocus, keyCode);
        return;
      }
      if (this._currentFocus.elem) {
        event.preventDefault();
        scrollToEdge(this._currentFocus.elem, keyCode);
        return;
      }
      // Let it default to browser behaviour
      return;
    }, {
      capture: true
    });
    this._isSpatialManagerReady = true;
  }
  takeKeyHandlerControl(owner, onDirectionalKey) {
    if (!owner) {
      return;
    }
    this._keyHandlerControlOwner = owner;
    this._keyHandlerControlCallback = typeof onDirectionalKey === 'function' ? onDirectionalKey : null;
  }
  leaveKeyHandlerControl(owner) {
    if (!owner) {
      return;
    }
    if (this._keyHandlerControlOwner !== owner) {
      return;
    }
    this._keyHandlerControlOwner = null;
    this._keyHandlerControlCallback = null;
  }

  /**
   * setFocus
   * Programmatically sets focus to a specific element or LRUD container.
   * If node is an LRUD container, finds and focuses the appropriate child element.
   * If node is a regular element, directly focuses it and updates spatial manager state.
   * @param {HTMLElement} node - The target element or container to focus
   * @returns {void}
   */
  setFocus(node) {
    if (node == null) {
      return;
    }
    if (node && node.className.includes('lrud-container')) {
      // We are here if requestTVFocus is called with container as node
      var nextFocus = findDestinationOrAutofocus(this._currentFocus.elem, 'ArrowDown', node, true);
      if (nextFocus.elem) {
        // this._pendingFocusCount = 1;
        this.triggerFocus(nextFocus);
      } else {
        console.warn('No focusable destination for requestTVFocus: ', node);
      }
    } else {
      if (node && node.focus) {
        var parentContainer = getParentContainer(node, false);
        // this._pendingFocusCount = 1;
        this.triggerFocus({
          elem: node,
          parentContainer
        });
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
  setDestinations(host, destinations) {
    // Get ids from destinations, and if id not set, generate a new one and set all of them into 'data-destinations' attribute in the host element
    if (destinations && Array.isArray(destinations)) {
      var destinationIDs = destinations.map(dest => {
        return dest ? setupNodeId(dest) : null;
      }).filter(id => id != null);
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
        var isAutoFocus = host.getAttribute('data-autofocus') === 'true';
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
      this._spatialNavigationContainer.removeEventListener('keydown', this.keyDownListener, {
        capture: true
      });
      this.keyDownListener = null;
    }
    if (this.appInitiatedScrollCleanup) {
      this.appInitiatedScrollCleanup();
      this.appInitiatedScrollCleanup = null;
    }
    if (typeof document !== 'undefined' && typeof document.removeEventListener === 'function') {
      window.removeEventListener('focus', this.handlePageVisibilityChange);
    }
    stopObserving();
    this._currentFocus = {
      elem: null,
      parentContainer: null
    };
    this._keyHandlerControlOwner = null;
    this._keyHandlerControlCallback = null;
    this._isSpatialManagerReady = false;
    this._spatialNavigationContainer = null;
  }
}
_SpatialManager = SpatialManager;
Object.defineProperty(SpatialManager, _instance, {
  writable: true,
  value: null
});
var spatialManager = new SpatialManager();
export var setupSpatialNavigation = spatialManager.setupSpatialNavigation.bind(spatialManager);
export var setFocus = spatialManager.setFocus.bind(spatialManager);
export var setDestinations = spatialManager.setDestinations.bind(spatialManager);
export var takeKeyHandlerControl = spatialManager.takeKeyHandlerControl.bind(spatialManager);
export var leaveKeyHandlerControl = spatialManager.leaveKeyHandlerControl.bind(spatialManager);
export var teardownSpatialNavigation = spatialManager.teardownSpatialNavigation.bind(spatialManager);
export { scrollContainer };