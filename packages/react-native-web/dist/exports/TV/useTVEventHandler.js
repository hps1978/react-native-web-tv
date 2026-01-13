import TVEventHandler from './TVEventHandler';
import * as React from 'react';
var useTVEventHandler = handleEvent => {
  React.useEffect(() => {
    var subscription = TVEventHandler.addListener(function (evt) {
      handleEvent(evt);
    });
    return () => {
      subscription.remove();
    };
  }, [handleEvent]);
};
export default useTVEventHandler;