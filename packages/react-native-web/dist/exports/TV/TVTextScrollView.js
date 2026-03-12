import _extends from "@babel/runtime/helpers/extends";
import _objectSpread from "@babel/runtime/helpers/objectSpread2";
/**
 * Copyright (c) Douglas Lowder.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 * 
 */

import tagForComponentOrHandle from './tagForComponentOrHandle';
import ScrollView from '../ScrollView';
import { scrollContainer, leaveKeyHandlerControl, takeKeyHandlerControl } from '../../modules/SpatialManager';
import * as React from 'react';
var _require = require('./TVFocusEventHandler'),
  tvFocusEventHandler = _require.tvFocusEventHandler;

/**
 * Convenience wrapper to create a scroll view that will scroll correctly
 * using swipe gestures on tvOS, even if the scroll view has no focusable
 * subviews.
 *
 * The main use case would be when a large scrolling block of text needs
 * to be presented to the user.
 *
 * Props:
 *
 */

class TVTextScrollView extends React.Component {
  constructor() {
    super(...arguments);
    this._setScrollViewRef = ref => {
      this._scrollViewRef = ref;
    };
    this._handleDirectionalKeyFromSpatial = keyCode => {
      var scrollableNode = this._keyControlOwner;
      if (!scrollableNode) {
        return false;
      }
      return scrollContainer(scrollableNode, keyCode, {
        horizontal: this.props.horizontal === true,
        pageSize: this.props.pageSize,
        scrollDurationMs: Math.max(0, (this.props.scrollDuration || 0) * 1000),
        snapToStart: this.props.snapToStart !== false,
        snapToEnd: this.props.snapToEnd !== false
      });
    };
    this._takeDirectionalKeyControl = () => {
      var owner = this._getScrollableNode();
      this._keyControlOwner = owner;
      takeKeyHandlerControl(owner, this._handleDirectionalKeyFromSpatial);
    };
    this._releaseDirectionalKeyControl = () => {
      leaveKeyHandlerControl(this._keyControlOwner);
      this._keyControlOwner = null;
    };
  }
  getScrollViewRef() {
    return this._scrollViewRef;
  }
  _getScrollableNode() {
    var scrollViewRef = this._scrollViewRef;
    if (scrollViewRef && typeof scrollViewRef.getScrollableNode === 'function') {
      return scrollViewRef.getScrollableNode();
    }
    return null;
  }
  componentDidMount() {
    var cmp = this; // eslint-disable-line consistent-this
    var myTag = tagForComponentOrHandle(this._scrollViewRef);
    tvFocusEventHandler == null || tvFocusEventHandler.register(myTag, function (evt) {
      if (myTag === evt.tag) {
        if (evt.eventType === 'focus') {
          cmp._takeDirectionalKeyControl();
          cmp.props.onFocus && cmp.props.onFocus(evt);
        } else if (evt.eventType === 'blur') {
          cmp._releaseDirectionalKeyControl();
          cmp.props.onBlur && cmp.props.onBlur(evt);
        }
      }
    });
  }
  componentWillUnmount() {
    this._releaseDirectionalKeyControl();
    var myTag = tagForComponentOrHandle(this._scrollViewRef);
    tvFocusEventHandler == null || tvFocusEventHandler.unregister(myTag);
  }
  render() {
    var props = _objectSpread(_objectSpread({}, this.props), {}, {
      tvParallaxProperties: {
        pressDuration: this.props.scrollDuration || 0.0
      },
      isTVSelectable: true,
      snapToInterval: this.props.pageSize || 0.0,
      removeClippedSubviews: false,
      automaticallyAdjustContentInsets: false
    });
    return /*#__PURE__*/React.createElement(ScrollView, _extends({}, props, {
      ref: this._setScrollViewRef
    }), this.props.children);
  }
}
export default TVTextScrollView;