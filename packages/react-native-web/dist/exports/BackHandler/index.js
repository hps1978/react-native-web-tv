var _window;
/**
 * Copyright (c) Nicolas Gallagher.
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * 
 */

// On Web this basically uses ios stub implementation.
// But for Web TV platforms we will allow App to configure the key through window.appConfig.keyMap
// with keyMap.Back set to the keycode of the key they want to use as back button for specific TV platform.

import TVEventHandler from '../TV/TVEventHandler';
import Platform from '../Platform';
function emptyFunction() {}
var BackHandler = {
  exitApp: emptyFunction,
  addEventListener: function addEventListener(_eventName, _handler) {
    console.warn('BackHandler is only supported if window.appConfig.keyMap.Back is configured for Web TV platforms.');
    return {
      remove: emptyFunction
    };
  }
};
if (Platform.isTV && typeof window !== 'undefined' && (_window = window) != null && (_window = _window.appConfig) != null && (_window = _window.keyMap) != null && _window['Back']) {
  var _backPressSubscriptions = new Set();
  TVEventHandler.addListener(function (evt) {
    if (evt && evt.eventType === 'menu') {
      var invokeDefault = true;
      var subscriptions = Array.from(_backPressSubscriptions.values()).reverse();
      for (var i = 0; i < subscriptions.length; ++i) {
        if (subscriptions[i]()) {
          invokeDefault = false;
          break;
        }
      }
      if (invokeDefault) {
        BackHandler.exitApp();
      }
    }
  });
  BackHandler = {
    exitApp: emptyFunction,
    addEventListener: function addEventListener(_eventName, _handler) {
      _backPressSubscriptions.add(_handler);
      return {
        remove: () => BackHandler.removeEventListener(_eventName, _handler)
      };
    },
    removeEventListener: function removeEventListener(_eventName, _handler) {
      _backPressSubscriptions.delete(_handler);
    }
  };
}
export default BackHandler;