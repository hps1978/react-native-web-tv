/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * 
 * @format
 */

// MutationObserver wrapper for detecting changes to DOM child elements.
// Used by SpatialManager to detect when focused elements or their parents are mutated.

var hasMutationObserver = typeof MutationObserver !== 'undefined';
var GLOBAL_OBSERVER_KEY = '__rnwSpatialManagerObserver';
var moduleLocalObserverState = {
  mutationObserverInstance: null
};
function getObserverState() {
  if (typeof window === 'undefined') {
    return moduleLocalObserverState;
  }
  var existing = window[GLOBAL_OBSERVER_KEY];
  if (existing) {
    return existing;
  }
  var created = {
    mutationObserverInstance: null
  };
  window[GLOBAL_OBSERVER_KEY] = created;
  return created;
}
function startObserving(targetNode, childNode, callback) {
  if (!hasMutationObserver) {
    console.warn('MutationObserver is not supported in this environment');
    return;
  }
  stopObserving();
  var observerState = getObserverState();

  // Create a closure that captures THIS session's values
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
  observerState.mutationObserverInstance = new MutationObserver(handleMutationsForThisSession);
  observerState.mutationObserverInstance.observe(targetNode, {
    childList: true,
    subtree: true
  });
}
function stopObserving() {
  var observerState = getObserverState();
  if (observerState.mutationObserverInstance) {
    observerState.mutationObserverInstance.disconnect();
    observerState.mutationObserverInstance = null;
  }
}
export { startObserving, stopObserving };