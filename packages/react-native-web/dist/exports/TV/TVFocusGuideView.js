import _extends from "@babel/runtime/helpers/extends";
/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * 
 * @format
 */

import Platform from '../Platform';
import useMergeRefs from '../../modules/useMergeRefs';
import View from '../View';
// import {Commands} from '../View/ViewNativeComponent';
import { setDestinations as setNavDestinations } from '../../modules/SpatialManager';
// import tagForComponentOrHandle from './tagForComponentOrHandle';

import StyleSheet from '../StyleSheet';
import * as React from 'react';
var TVFocusGuideView = /*#__PURE__*/React.forwardRef((props, ref) => {
  var _props$enabled = props.enabled,
    enabled = _props$enabled === void 0 ? true : _props$enabled,
    destinationsProp = props.destinations,
    autoFocus = props.autoFocus,
    focusable = props.focusable;
  var focusGuideRef = React.useRef(null);
  var setDestinations = React.useCallback(destinations => {
    if (Platform.isTV) {
      // const dests: number[] = (destinations || [])
      //   .map((destination: any) => tagForComponentOrHandle(destination))
      //   .filter(Boolean);

      if (focusGuideRef.current != null) {
        setNavDestinations(focusGuideRef.current, destinations);
        // Commands.setDestinations(focusGuideRef.current, dests);
      } else {
        console.warn('[TVFocusGuideView]: Cannot set destinations as focusGuideView ref unavailable for: ', destinations);
      }
    }
  }, []);
  var setLocalRef = React.useCallback(instance => {
    // $FlowExpectedError[incompatible-type]
    focusGuideRef.current = instance;
    if (instance != null) {
      // $FlowFixMe[prop-missing]
      // $FlowFixMe[unsafe-object-assign]
      Object.assign(instance, {
        setDestinations
      });
    }
  }, [setDestinations]);
  var mergedRef = useMergeRefs(setLocalRef, ref);
  React.useEffect(() => {
    if (focusable === false) {
      setDestinations([]);
    } else if (destinationsProp !== null && destinationsProp !== undefined) {
      setDestinations(destinationsProp); // $FlowFixMe[incompatible-call]
    }
  }, [setDestinations, destinationsProp, focusable]);
  var enabledStyle = {
    display: enabled ? 'flex' : 'none'
  };
  var style = [styles.container, props.style, enabledStyle];

  // If there are no destinations and the autoFocus is false the the default value of focusable should be false
  // It is then properly handled by the native code
  var tvOSSelectable = destinationsProp || autoFocus ? focusable !== false : false;
  var isTVFocusable = destinationsProp ? true : autoFocus === true;
  return (
    /*#__PURE__*/
    // $FlowFixMe[prop-missing]
    React.createElement(View, _extends({}, props, {
      autoFocus: focusable === false ? true : autoFocus // Why focusable is requried in this?!!
      ,
      collapsable: false
      // tvOS only prop
      ,
      isTVSelectable: tvOSSelectable,
      ref: mergedRef,
      style: style,
      tvFocusable: isTVFocusable
    }))
  );
});
var styles = StyleSheet.create({
  container: {
    minWidth: 1,
    minHeight: 1
  }
});
export default TVFocusGuideView;