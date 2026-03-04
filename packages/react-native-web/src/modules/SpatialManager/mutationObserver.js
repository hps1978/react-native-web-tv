/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow
 * @format
 */

export type MutationDetails = {
  removedNode: HTMLElement,
  targetNode: HTMLElement,
  childNode: HTMLElement
};

/**
 * MutationObserverManager
 * Singleton class that manages DOM mutation observation for focus tracking.
 * Helps SpatialManager in detecting when focused elements are removed from the DOM.
 */
class MutationObserverManager {
  static #_instance = null;
  static #hasMutationObserver = typeof MutationObserver !== 'undefined';

  /**
   * constructor
   * Initializes or returns the singleton instance of MutationObserverManager.
   * Performs API capability detection for MutationObserver support.
   * @returns {MutationObserverManager} The singleton instance
   */
  constructor() {
    if (MutationObserverManager.#_instance) {
      return MutationObserverManager.#_instance;
    }

    this.mutationObserverInstance = null;

    MutationObserverManager.#_instance = this;
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
  startObserving(
    targetNode,
    childNode,
    callback: (details: MutationDetails) => void
  ) {
    if (!MutationObserverManager.#hasMutationObserver) {
      console.warn('MutationObserver is not supported in this environment');
      return;
    }

    this.stopObserving();

    const handleMutationsForThisSession = (mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.type === 'childList') {
          mutation.removedNodes.forEach((node) => {
            if (
              node instanceof HTMLElement &&
              (node?.id === childNode.id || node.contains(childNode))
            ) {
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

    this.mutationObserverInstance = new MutationObserver(
      handleMutationsForThisSession
    );
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
const mutationObserverManager = new MutationObserverManager();
export const startObserving = mutationObserverManager.startObserving.bind(
  mutationObserverManager
);
export const stopObserving = mutationObserverManager.stopObserving.bind(
  mutationObserverManager
);
