/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow
 * @format
 */

// MutationObserver wrapper for detecting changes to DOM child elements.
// Used by SpatialManager to detect when focused elements or their parents are mutated.

export type MutationDetails = {
  removedNode: HTMLElement,
  targetNode: HTMLElement,
  childNode: HTMLElement
};

const hasMutationObserver = typeof MutationObserver !== 'undefined';
let mutationObserverInstance: MutationObserver | null = null;
let currentSessionId = 0;

function startObserving(
  targetNode: HTMLElement,
  childNode: HTMLElement,
  callback: (details: MutationDetails) => void
): void {
  if (!hasMutationObserver) {
    console.warn('MutationObserver is not supported in this environment');
    return;
  }

  stopObserving();

  // Increment session ID for this observing session
  const sessionId = ++currentSessionId;

  // Create a closure that captures THIS session's values AND sessionId
  const handleMutationsForThisSession = (mutations: MutationRecord[]) => {
    // Ignore if this is a stale session
    if (sessionId !== currentSessionId) return;

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

  mutationObserverInstance = new MutationObserver(
    handleMutationsForThisSession
  );
  mutationObserverInstance.observe(targetNode, {
    childList: true,
    subtree: true
  });
}

function stopObserving(): void {
  if (mutationObserverInstance) {
    mutationObserverInstance.disconnect();
    mutationObserverInstance = null;
  }
  // Invalidate current session so old queued mutations are ignored
  currentSessionId++;
}

export { startObserving, stopObserving };
