/*
 * Replacement for findNodeHandle, since we need this for converting
 * components to tags when rendering nextFocus props
 * @flow
 */

// TODO: make this work for Fabric

import * as React from 'react';

// import { findNodeHandle } from '../findNodeHandle';

export type ComponentOrHandleType = ?React.ElementRef<React.ElementType>;

export type TagForComponentOrHandleType = (
  component: ComponentOrHandleType
) => ?HTMLElement;

const tagForComponentOrHandle: TagForComponentOrHandleType = (component) => {
  if (component === null || component === undefined) {
    return undefined;
  }

  // if (component.id) {
  //   return component.id;
  // }

  // return undefined;

  return ((component: any): ?HTMLElement);
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
