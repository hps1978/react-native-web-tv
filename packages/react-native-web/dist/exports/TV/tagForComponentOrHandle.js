/*
 * Replacement for findNodeHandle, since we need this for converting
 * components to tags when rendering nextFocus props
 * 
 */

// TODO: make this work for Fabric

import * as React from 'react';

// import { findNodeHandle } from '../findNodeHandle';

var tagForComponentOrHandle = component => {
  if (component === null || component === undefined) {
    return undefined;
  }

  // For web, we'll always expect a ref to a DOM element
  // we'll return the element tilself as it is after a check
  if (component instanceof HTMLElement) {
    return component;
  }
  return undefined;

  // return findNodeHandle(component, true); // suppress warning
  /*
  if (typeof component === 'number') {
    return component;
  }
  if (typeof component?._nativeTag === 'number') {
    return component?._nativeTag;
  }
  if (typeof component?.canonical?._nativeTag === 'number') {
    return component?.canonical?._nativeTag;
  }
  return undefined;
  */
};
export default tagForComponentOrHandle;