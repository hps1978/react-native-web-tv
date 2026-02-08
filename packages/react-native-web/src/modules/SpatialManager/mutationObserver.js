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
const GLOBAL_OBSERVER_KEY = '__rnwSpatialManagerObserver';

type GlobalObserverState = {
  mutationObserverInstance: MutationObserver | null
};

const moduleLocalObserverState: GlobalObserverState = {
  mutationObserverInstance: null
};

function getObserverState(): GlobalObserverState {
  if (typeof window === 'undefined') {
    return moduleLocalObserverState;
  }

  const existing = (window: any)[GLOBAL_OBSERVER_KEY];
  if (existing) {
    return existing;
  }

  const created = {
    mutationObserverInstance: null
  };
  (window: any)[GLOBAL_OBSERVER_KEY] = created;
  return created;
}

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

  const observerState = getObserverState();

  // Create a closure that captures THIS session's values
  const handleMutationsForThisSession = (mutations: MutationRecord[]) => {
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

  observerState.mutationObserverInstance = new MutationObserver(
    handleMutationsForThisSession
  );
  observerState.mutationObserverInstance.observe(targetNode, {
    childList: true,
    subtree: true
  });
}

function stopObserving(): void {
  const observerState = getObserverState();
  if (observerState.mutationObserverInstance) {
    observerState.mutationObserverInstance.disconnect();
    observerState.mutationObserverInstance = null;
  }
}

export { startObserving, stopObserving };
