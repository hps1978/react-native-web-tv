/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * 
 * @format
 */

// This module supports SpatialNavigation for TV platforms on web using
// the @bbc/tv-lrud-spatial library. Currently, SpatialNavigation working
// completely outside the React tree, i.e, it uses DOM APIs to manage
// focus and navigation.

// Currently, it only supports arrow ISO keyboard navigation.
import { setConfig, getNextFocus } from '@bbc/tv-lrud-spatial';
import { addEventListener } from '../addEventListener';
var isSpatialManagerReady = false;
var spatialNavigationContainer = null;
var currentFocus = null;
var keyDownListener = null;
var ID_LIMIT = 100000; // big enough to wrap around!
var id = 0;
function setupId(node) {
  var newId = null;
  if (node) {
    // Use a simple incremented number as id
    newId = "lrud-" + (id > ID_LIMIT ? 0 : ++id);
    node.id = newId;
    return newId;
  }
  return newId;
}
function setupSpatialNavigation(container) {
  if (isSpatialManagerReady) {
    return;
  }

  // Configure LRUD
  setConfig({
    // keyMap: TODO: Setup Keymap based on different TV platforms (get this as a config)
    createMissingId: setupId
  });
  spatialNavigationContainer = container.ownerDocument.activeElement || window.document.body;

  // Listen to keydown events on the container or document
  keyDownListener = addEventListener(spatialNavigationContainer, 'keydown', event => {
    console.log('[SpatialNavigation] keydown event: ', event);
    var keyCode = event.key || event.code;
    if (keyCode !== 'ArrowUp' && keyCode !== 'ArrowDown' && keyCode !== 'ArrowLeft' && keyCode !== 'ArrowRight') {
      return;
    }
    if (!currentFocus) {
      console.warn('No initial focus. Trying to set one...');
    }
    var nextFocus = getNextFocus(currentFocus, keyCode, (container == null ? void 0 : container.ownerDocument) || window.document);
    console.log('[SpatialNavigation] Next focus element: ', nextFocus);
    if (nextFocus) {
      currentFocus = nextFocus;
      nextFocus.focus();
      event.preventDefault();
    }
  }, {
    passive: false
  });
  isSpatialManagerReady = true;
}
function setFocus(node) {
  if (node && node.className.includes('lrud-container')) {
    // It's a container trigger spatial logic to find an focus
    // TODO: Add another function which triggers the spatial logic based on the container
    // and without the need to pass the keyCode
    var focusNode = getNextFocus(null,
    // use this as starting point
    'ArrowDown', node // this is the scope as well for now!
    );
    if (focusNode) {
      focusNode.focus();
      currentFocus = focusNode;
    }
  } else {
    if (node && node.focus) {
      node.focus();
    }
    currentFocus = node;
  }
}
function setDestinations(host, destinations) {
  // Get ids from destinations, and if id not set, generate a new one and set all of them into 'data-destinations' attribute in the host element
  if (destinations && Array.isArray(destinations)) {
    var destinationIDs = destinations.map(dest => dest && dest.id ? dest.id : setupId(dest)).filter(id => id != null);
    if (destinationIDs.length > 0) {
      host.setAttribute('data-destinations', destinationIDs.join(' '));
    } else {
      host.setAttribute('data-destinations', '');
    }
    console.log('SpatialManager: setDestinations ', host.getAttribute('data-destinations'));
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
  currentFocus = null;
  isSpatialManagerReady = false;
}
export { setupSpatialNavigation, setFocus, teardownSpatialNavigation, setDestinations };