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

// import NativeTVNavigationEventEmitter from '../../../src/private/specs_DEPRECATED/modules/NativeTVNavigationEventEmitter';

// TODO: Implement NativeTVNavigationEventEmitter for web TV
var NativeTVNavigationEventEmitter = null;
////////////////

import NativeEventEmitter from '../NativeEventEmitter';
import Platform from '../Platform';
var __nativeTVNavigationEventEmitter = null;
var TVEventHandler = {
  addListener: callback => {
    if (Platform.OS === 'ios' && !NativeTVNavigationEventEmitter) {
      return {
        remove: () => {}
      };
    }
    if (!__nativeTVNavigationEventEmitter) {
      __nativeTVNavigationEventEmitter = new NativeEventEmitter(NativeTVNavigationEventEmitter);
    }
    var subscription = __nativeTVNavigationEventEmitter.addListener(
    // $FlowFixMe[prop-missing]
    'onHWKeyEvent', data => {
      if (callback) {
        callback(data);
      }
    });
    return subscription;
  }
};
export default TVEventHandler;