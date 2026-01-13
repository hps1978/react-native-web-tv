/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 * 
 */

'use strict';

import Platform from '../Platform';
import { default as TVEventHandler } from './TVEventHandler';
class TVFocusEventHandler {
  constructor() {
    this.__subscription = null;
    this.__callbackMap = new Map();
    this.__subscription = TVEventHandler.addListener(data => {
      var callback = this.__callbackMap.get(data.tag);
      if (callback) {
        callback(data);
      }
    });
  }
  register(componentTag, callback) {
    this.__callbackMap.set(componentTag, callback);
  }
  unregister(componentTag) {
    this.__callbackMap.delete(componentTag);
  }
}
export var tvFocusEventHandler = Platform.isTV ? new TVFocusEventHandler() : null;