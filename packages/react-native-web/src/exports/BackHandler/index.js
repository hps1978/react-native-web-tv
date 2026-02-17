/**
 * Copyright (c) Nicolas Gallagher.
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow
 */

// On Web this basically uses ios stub implementation.
// But for Web TV platforms we will allow App to configure the key through window.appConfig.keyMap
// with keyMap.Back set to the keycode of the key they want to use as back button for specific TV platform.

import TVEventHandler from '../TV/TVEventHandler';
import Platform from '../Platform';

type BackPressEventName = 'backPress' | 'hardwareBackPress';
type BackPressHandler = () => ?boolean;

function emptyFunction(): void {}

type TBackHandler = {
  exitApp(): void,
  addEventListener(
    eventName: BackPressEventName,
    handler: BackPressHandler
  ): { remove: () => void, ... }
};

let BackHandler: TBackHandler = {
  exitApp: emptyFunction,
  addEventListener: function (
    _eventName: BackPressEventName,
    _handler: BackPressHandler
  ): { remove: () => void, ... } {
    console.warn(
      'BackHandler is only supported if window.appConfig.keyMap.Back is configured for Web TV platforms.'
    );
    return {
      remove: emptyFunction
    };
  }
};

if (
  Platform.isTV &&
  typeof window !== 'undefined' &&
  window?.appConfig?.keyMap?.['Back']
) {
  const _backPressSubscriptions = new Set<() => ?boolean>();

  TVEventHandler.addListener(function (evt) {
    if (evt && evt.eventType === 'menu') {
      let invokeDefault = true;
      const subscriptions = Array.from(
        _backPressSubscriptions.values()
      ).reverse();

      for (let i = 0; i < subscriptions.length; ++i) {
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

    addEventListener: function (
      _eventName: BackPressEventName,
      _handler: () => ?boolean
    ): { remove: () => void, ... } {
      _backPressSubscriptions.add(_handler);
      return {
        remove: () => BackHandler.removeEventListener(_eventName, _handler)
      };
    },

    removeEventListener: function (
      _eventName: BackPressEventName,
      _handler: () => ?boolean
    ) {
      _backPressSubscriptions.delete(_handler);
    }
  };
}

export default BackHandler;
