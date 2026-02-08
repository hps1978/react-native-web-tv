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
var mutationObserverInstance = null;
var currentSessionId = 0;
function startObserving(targetNode, childNode, callback) {
  if (!hasMutationObserver) {
    console.warn('MutationObserver is not supported in this environment');
    return;
  }
  stopObserving();

  // Increment session ID for this observing session
  var sessionId = ++currentSessionId;

  // Create a closure that captures THIS session's values AND sessionId
  var handleMutationsForThisSession = mutations => {
    // Ignore if this is a stale session
    if (sessionId !== currentSessionId) return;
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
  mutationObserverInstance = new MutationObserver(handleMutationsForThisSession);
  mutationObserverInstance.observe(targetNode, {
    childList: true,
    subtree: true
  });
}
function stopObserving() {
  if (mutationObserverInstance) {
    mutationObserverInstance.disconnect();
    mutationObserverInstance = null;
  }
  // Invalidate current session so old queued mutations are ignored
  currentSessionId++;
}
export { startObserving, stopObserving };