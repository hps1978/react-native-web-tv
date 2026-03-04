import _classPrivateFieldLooseBase from "@babel/runtime/helpers/classPrivateFieldLooseBase";
import _classPrivateFieldLooseKey from "@babel/runtime/helpers/classPrivateFieldLooseKey";
var _instance = /*#__PURE__*/_classPrivateFieldLooseKey("_instance");
var _hasMutationObserver = /*#__PURE__*/_classPrivateFieldLooseKey("hasMutationObserver");
/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * 
 * @format
 */

/**
 * MutationObserverManager
 * Singleton class that manages DOM mutation observation for focus tracking.
 * Helps SpatialManager in detecting when focused elements are removed from the DOM.
 */
class MutationObserverManager {
  /**
   * constructor
   * Initializes or returns the singleton instance of MutationObserverManager.
   * Performs API capability detection for MutationObserver support.
   * @returns {MutationObserverManager} The singleton instance
   */
  constructor() {
    if (_classPrivateFieldLooseBase(MutationObserverManager, _instance)[_instance]) {
      return _classPrivateFieldLooseBase(MutationObserverManager, _instance)[_instance];
    }
    this.mutationObserverInstance = null;
    _classPrivateFieldLooseBase(MutationObserverManager, _instance)[_instance] = this;
  }

  /**
   * startObserving
   * Begins observing a target node for child list mutations.
   * If the observed child node is removed, triggers callback with mutation details.
   * Automatically stops previous observation before starting a new one.
   * @param {HTMLElement} targetNode - The parent element to observe for mutations
   * @param {HTMLElement} childNode - The specific child element being tracked
   * @param {(details: MutationDetails) => void} callback - Called when childNode is removed
   * @returns {void}
   */
  startObserving(targetNode, childNode, callback) {
    if (!_classPrivateFieldLooseBase(MutationObserverManager, _hasMutationObserver)[_hasMutationObserver]) {
      console.warn('MutationObserver is not supported in this environment');
      return;
    }
    this.stopObserving();
    var handleMutationsForThisSession = mutations => {
      mutations.forEach(mutation => {
        if (mutation.type === 'childList') {
          mutation.removedNodes.forEach(node => {
            if (node instanceof HTMLElement && ((node == null ? void 0 : node.id) === childNode.id || node.contains(childNode))) {
              callback({
                removedNode: node,
                targetNode: targetNode,
                childNode: childNode
              });
              return;
            }
          });
        }
      });
    };
    this.mutationObserverInstance = new MutationObserver(handleMutationsForThisSession);
    this.mutationObserverInstance.observe(targetNode, {
      childList: true,
      subtree: true
    });
  }

  /**
   * stopObserving
   * Stops the active MutationObserver and disconnects it from the DOM.
   * Cleans up observation state for potential re-initialization.
   * @returns {void}
   */
  stopObserving() {
    if (this.mutationObserverInstance) {
      this.mutationObserverInstance.disconnect();
      this.mutationObserverInstance = null;
    }
  }
}

// Export static functions for compatibility
Object.defineProperty(MutationObserverManager, _instance, {
  writable: true,
  value: null
});
Object.defineProperty(MutationObserverManager, _hasMutationObserver, {
  writable: true,
  value: typeof MutationObserver !== 'undefined'
});
var mutationObserverManager = new MutationObserverManager();
export var startObserving = mutationObserverManager.startObserving.bind(mutationObserverManager);
export var stopObserving = mutationObserverManager.stopObserving.bind(mutationObserverManager);