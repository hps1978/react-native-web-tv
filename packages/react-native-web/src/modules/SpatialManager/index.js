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
import { getNextFocus } from '@bbc/tv-lrud-spatial';
import { addEventListener } from '../addEventListener';

let isSpatialManagerReady = false;
let spatialNavigationContainer: HTMLElement | null = null;
let focusedElement: HTMLElement | null = null;
let keyDownListener: ((event: any) => void) | null = null;

const ID_LIMIT = 100000; // big enough to wrap around!
let id = 0;
function setupId(node: HTMLElement) {
  let newId = null;
  if (node) {
    // Use a simple incremented number as id
    newId = `lrud-${id > ID_LIMIT ? 0 : ++id}`;
    node.id = newId;

    return newId;
  }

  return newId;
}

function setupSpatialNavigation(container?: HTMLElement) {
  if (isSpatialManagerReady) {
    return;
  }
  spatialNavigationContainer = container || window.document.body;

  // Listen to keydown events on the container or document
  keyDownListener = addEventListener(
    spatialNavigationContainer,
    'keydown',
    (event: any) => {
      console.log('[SpatialNavigation] keydown event: ', event);
      // Assume the focused element is the currently active element
      const currentFocus =
        focusedElement ||
        spatialNavigationContainer.ownerDocument.activeElement;
      if (!currentFocus /*|| !(focusedElement instanceof HTMLElement)*/) {
        console.warn('No focused element found during spatial navigation.');
        return;
      }
      const keyCode = event.key || event.code;
      if (
        keyCode !== 'ArrowUp' &&
        keyCode !== 'ArrowDown' &&
        keyCode !== 'ArrowLeft' &&
        keyCode !== 'ArrowRight'
      ) {
        return;
      }

      const nextFocus = getNextFocus(
        currentFocus,
        keyCode,
        container?.ownerDocument || window.document
      );
      console.log('[SpatialNavigation] Next focus element: ', nextFocus);
      if (nextFocus) {
        focusedElement = nextFocus;
        nextFocus.focus();
        event.preventDefault();
      }
    },
    { passive: false }
  );
  isSpatialManagerReady = true;
}

function setFocus(node: HTMLElement) {
  if (node && node.className.includes('lrud-container')) {
    // It's a container trigger spatial logic to find an focus
    // TODO: Add another function which triggers the spatial logic based on the container
    // and without the need to pass the keyCode
    const focusNode = getNextFocus(
      null, // use this as starting point
      'ArrowDown',
      node // this is the scope as well for now!
    );
    if (focusNode) {
      focusNode.focus();
      focusedElement = focusNode;
    }
  } else {
    if (node && node.focus) {
      node.focus();
    }
    focusedElement = node;
  }
}

function setDestinations(host: HTMLElement, destinations: HTMLElement[]) {
  // Get ids from destinations, and if id not set, generate a new one and set all of them into 'data-destinations' attribute in the host element
  if (destinations && Array.isArray(destinations)) {
    const destinationIDs = destinations
      .map((dest) => (dest && dest.id ? dest.id : setupId(dest)))
      .filter((id) => id != null);
    if (destinationIDs.length > 0) {
      host.setAttribute('data-destinations', destinationIDs.join(' '));
    } else {
      host.setAttribute('data-destinations', '');
    }
    console.log(
      'SpatialManager: setDestinations ',
      host.getAttribute('data-destinations')
    );
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
  spatialNavigationContainer = null;
  focusedElement = null;
  isSpatialManagerReady = false;
}

export {
  setupSpatialNavigation,
  setFocus,
  teardownSpatialNavigation,
  setDestinations
};
