/*
 * @flow
 */

import type { TVRemoteEvent } from './types';

import { type EventSubscription } from '../../vendor/react-native/vendor/emitter/EventEmitter';
import TVEventHandler from './TVEventHandler';
import * as React from 'react';

const useTVEventHandler = (handleEvent: (evt: TVRemoteEvent) => void) => {
  React.useEffect(() => {
    const subscription: EventSubscription = TVEventHandler.addListener(
      function (evt) {
        handleEvent(evt);
      }
    );
    return () => {
      subscription.remove();
    };
  }, [handleEvent]);
};

export default useTVEventHandler;
