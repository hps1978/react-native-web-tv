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
import { setConfig, getNextFocus, getParentContainer, updateAncestorsAutoFocus } from '@bbc/tv-lrud-spatial';
import { addEventListener } from '../addEventListener';
import { setupNodeId } from '../../exports/TV/utils';
var isSpatialManagerReady = false;
var spatialNavigationContainer = null;
var currentFocus = {
  elem: null,
  parentHasAutofocus: false
};
var keyDownListener = null;
function triggerFocus(nextFocus) {
  if (nextFocus && nextFocus.elem) {
    currentFocus = nextFocus;
    // set id first
    setupNodeId(nextFocus.elem);
    updateAncestorsAutoFocus(nextFocus.elem, spatialNavigationContainer);
    nextFocus.elem.focus();
    return true;
  }
  return false;
}
function setupSpatialNavigation(container) {
  var _container$ownerDocum;
  if (isSpatialManagerReady) {
    return;
  }

  // Configure LRUD
  setConfig({
    // keyMap: TODO: Setup Keymap based on different TV platforms (get this as a config)
  });
  spatialNavigationContainer = (container == null || (_container$ownerDocum = container.ownerDocument) == null ? void 0 : _container$ownerDocum.activeElement) || window.document.body;

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
    var nextFocus = getNextFocus(currentFocus.elem, keyCode, (container == null ? void 0 : container.ownerDocument) || window.document);
    console.log('[SpatialNavigation] Next focus element: ', nextFocus);
    if (triggerFocus(nextFocus) === true) {
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
    var nextFocus = getNextFocus(null,
    // use this as starting point
    'ArrowDown', node // this is the scope as well for now!
    );
    triggerFocus(nextFocus);
  } else {
    if (node && node.focus) {
      var _getParentContainer;
      var parentHasAutofocus = ((_getParentContainer = getParentContainer(node)) == null ? void 0 : _getParentContainer.getAttribute('data-autofocus')) === 'true';
      triggerFocus({
        elem: node,
        parentHasAutofocus
      });
    }
  }
}
function setDestinations(host, destinations) {
  // Get ids from destinations, and if id not set, generate a new one and set all of them into 'data-destinations' attribute in the host element
  if (destinations && Array.isArray(destinations)) {
    var destinationIDs = destinations.map(dest => dest ? setupNodeId(dest) : null).filter(id => id != null);
    if (destinationIDs.length > 0) {
      host.setAttribute('data-destinations', destinationIDs.join(' '));
      // Side effect: If this container has not been set with lrud-container class, do it now
      // to allow collapsable/expandable containers to work properly for LRUD navigation
      // if (!host.className?.includes('lrud-container')) {
      //   host.className += ' lrud-container';
      // }
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